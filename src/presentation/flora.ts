import { createMeshyForest, type MeshyTreeTemplates } from './meshyTrees';
import * as THREE from 'three';
import type { BuildContext, FrameContext, SceneModule } from './context';
import { SPECIES, buildTreeVariant, type TreeVariant, type Species } from './treeGen';
import { leafMaterial, woodMaterial, disposeTreeMaterials } from './treeMaterials';
import { disposeTreeTextures } from './treeTextures';
import { createFloraPopulation, selectFloraPopulation, registerFloraColliders, FLORA_VARIANTS, FLORA_FADE_START, FLORA_MAX_DISTANCE, floraLodWeightsFor, type FloraTree } from './floraPopulation';
import { buildForestFloor } from './forestFloor';
import { buildFallingLeaves } from './fallingLeaves';
import { createPineForest, isPineSpecies, type PineTemplates } from './solitaryPine';
import { groundedTreeY, treeWoodCollisionRadius } from './treeGrounding';
import { PlantedCrownIndex } from './plantedCrowns';
import { attachInstanceDistanceVisibility, smoothDistanceFade, type InstanceDistanceVisibility } from './distanceVisibility';
import type { PhysicalWoodGeometry } from '../world/physicsGeometry';
import { FOLIAGE_RESPONSE, type FoliageResponse } from './foliage/foliageWind';
import { crownOf, installFoliage, installFoliageShadow, type InstalledFoliage } from './foliage/foliageMaterial';
import { shadowDepthMaterial, shadowGeometry } from './foliage/shadowCasters';
import { createLeafBurst } from './foliage/leafBurst';

/**
 * Trees and shrubs. An empty strand gives way to a layered old-growth woodland: flared oak roots under tall pine/fir columns,
 * a lower birch stratum and native fern/moss floor. The trail remains open under the interlocking crowns. Every
 * tree is one of a few seeded variants per species. High retains the complete source instances at every distance;
 * other presets retain three levels with opaque complementary fades (low shrubs fade to their lighter models on every
 * preset). Culling uses the actual source crown envelope and follows camera turns on the same frame.
 *
 * Every tree answers the realm's wind and is lit as foliage (foliage/), and shadows come from separate shadow-only
 * casters: only trees inside the sun's shadow volume, with lighter source models away from the camera, so the colour
 * pass never draws a tree the camera cannot see.
 */

/**
 * Which source LOD casts a tree's shadow: the full model near the camera, where its shadow is seen up close, and the
 * lighter source LODs beyond (the same baked leaf cards, so the same shapes in the shadow map). The Pine's far LOD is
 * four crossed planes, so its shadows stop at the middle model.
 */
export const FLORA_SHADOW_LOD = { full: 25, middle: 70 } as const;
export function floraShadowLod(distance: number, pine: boolean): 0 | 1 | 2 {
  if (distance < FLORA_SHADOW_LOD.full) return 0;
  if (distance < FLORA_SHADOW_LOD.middle || pine) return 1;
  return 2;
}

/** How a tree answers the wind, from its kind and its own height. */
export function foliageResponse(variant: Pick<TreeVariant, 'species' | 'height'>): FoliageResponse {
  const kind = variant.species === 'pine' || variant.species === 'fir' || variant.species === 'shorepine' ? 'conifer'
    : variant.species === 'palm' ? 'palm' : variant.species === 'shrub' ? 'shrub' : variant.species === 'dead' ? 'dead' : 'broadleaf';
  return { ...FOLIAGE_RESPONSE[kind], height: Math.max(0.6, variant.height) };
}

interface Batch {
  variant: TreeVariant;
  meshes: { wood: THREE.InstancedMesh | null; leaf: THREE.InstancedMesh | null }[];
  /** Shadow-only copies per LOD (drawn only into the sun's shadow map), when this preset casts shadows. */
  casters: { wood: THREE.InstancedMesh | null; leaf: THREE.InstancedMesh | null }[];
  visibility: { wood: InstanceDistanceVisibility | null; leaf: InstanceDistanceVisibility | null }[];
  bounds: THREE.Sphere;
  trees: FloraTree[];
}

export function buildFlora(ctx: BuildContext, pineTemplates: PineTemplates, deferFloor = false, meshyTemplates?: MeshyTreeTemplates): SceneModule & {
  counts: { trees: number; triangles: number }; physicalWood: readonly PhysicalWoodGeometry[]; initializeFloor(extraTrees?: readonly FloraTree[]): void;
  /** Meshes drawn only into the sun's shadow map; the world shows them for the shadow pass alone. */
  shadowCasters: THREE.Group;
  /** A nearby rooted tree for inspections; proximity does not prove a wood contact. */
  treeAt(x: number, z: number, reach?: number): { x: number; z: number; height: number; scale: number; leafy: boolean } | null;
  /**
   * Respond to the canonical tree ID from an actual finite wood contact at (x, y, z). A nearby point alone is not
   * a contact. Reduced Motion still reports the hit, while suppressing shakes and falling leaves.
   */
  strike(x: number, y: number, z: number, strength?: number, treeId?: string): boolean;
} {
  const { terrain, colliders, quality, sway, excl } = ctx;
  const group = new THREE.Group();
  group.name = 'flora';
  const pine = createPineForest(pineTemplates);
  const meshy = meshyTemplates ? createMeshyForest(meshyTemplates) : null;
  // Component authoring tools may intentionally omit the new catalog. The shipped world always supplies it.
  const usesPine = (sp: Species) => sp === 'pine' || !meshy && isPineSpecies(sp);
  const variants = new Map<string, TreeVariant>();
  const variantFor = (tree: Pick<FloraTree, 'sp' | 'v' | 'assetId'>): TreeVariant => {
    const key = `${tree.sp}:${tree.v}:${tree.assetId ?? ""}`;
    let variant = variants.get(key);
    if (!variant) {
      variant = usesPine(tree.sp) ? pine.variant(tree.sp as 'pine' | 'fir' | 'shorepine', tree.v + 1) : meshy ? meshy.variant(tree.sp as Exclude<Species, 'pine'>, tree.v, tree.assetId) : buildTreeVariant(tree.sp, tree.v + 1);
      variants.set(key, variant);
    }
    return variant;
  };
  const population = createFloraPopulation(terrain, excl, (tree, legacyFootprint) => usesPine(tree.sp)
    ? pine.collisionRadius(tree.sp as 'pine' | 'fir' | 'shorepine', tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y)
    : legacyFootprint > 0 ? treeWoodCollisionRadius(variantFor(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : legacyFootprint,
    (tree) => groundedTreeY(terrain, tree, variantFor(tree)), undefined,
    meshy ? (tree) => variantFor(tree).crownRadius * tree.s : undefined);
  registerFloraColliders(population, colliders);
  // Static rigid-body contact uses the same complete wood as the visible source tree,
  // rather than treating its broad ground-plane navigation circle as an infinite cylinder.
  // Pack only once per variant; hundreds of instances share these source buffers.
  const woodBuffers = new Map<TreeVariant, Pick<PhysicalWoodGeometry, 'positions' | 'indices'>>();
  const physicalWood: PhysicalWoodGeometry[] = [];
  const woodTrees = new Map<string, { tree: FloraTree; variant: TreeVariant }>();
  for (const tree of population) {
    if (!tree.collisionId || tree.radius <= 0) continue;
    const variant = variantFor(tree), wood = variant.lods[0].wood;
    if (!wood) throw new Error(`Canonical tree ${tree.collisionId} has no visible wood for contact.`);
    let buffers = woodBuffers.get(variant);
    if (!buffers) {
      const position = wood.getAttribute('position');
      let positions: Float32Array;
      if (position instanceof THREE.BufferAttribute && position.itemSize === 3 && position.array instanceof Float32Array) {
        positions = position.array;
      } else {
        positions = new Float32Array(position.count * 3);
        for (let i = 0; i < position.count; i++) positions.set([position.getX(i), position.getY(i), position.getZ(i)], i * 3);
      }
      const index = wood.index;
      const indices = index?.array instanceof Uint32Array ? index.array : new Uint32Array(index?.count ?? position.count);
      if (!(index?.array instanceof Uint32Array)) {
        for (let i = 0; i < indices.length; i++) indices[i] = index ? index.getX(i) : i;
      }
      buffers = { positions, indices };
      woodBuffers.set(variant, buffers);
    }
    physicalWood.push({ id: tree.collisionId, ...buffers, translation: { x: tree.x, y: tree.y, z: tree.z }, yaw: tree.yaw, scale: tree.s });
    woodTrees.set(tree.collisionId, { tree, variant });
  }
  const { trees, obstacles } = selectFloraPopulation(population, quality);
  const plantedCrowns = new PlantedCrownIndex();
  for (const tree of population) {
    if (!tree.collisionId) continue;
    const leaf = variantFor(tree).lods[0].leaf;
    if (leaf) plantedCrowns.add(tree.sp, tree, leaf);
  }
  ctx.plantedCrowns = plantedCrowns;
  let forestFloor: SceneModule | undefined;
  const initializeFloor = (extraTrees: readonly FloraTree[] = []) => {
    if (forestFloor) return;
    forestFloor = buildForestFloor(terrain, excl, quality, [...population, ...extraTrees], plantedCrowns, ctx.foliage);
    group.add(forestFloor.group);
  };
  if (!deferFloor) initializeFloor();

  /* Developer aid: `?lineup=x,z` plants one of every species in rows near a point, and `?lod=0|1|2` forces a level of detail. */
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const lineup = q.get('lineup')?.split(',').map(Number);
  const forceLod = q.has('lod') ? Number(q.get('lod')) : -1;
  if (lineup && lineup.length === 2) {
    SPECIES.forEach((sp, i) => {
      for (let v = 0; v < FLORA_VARIANTS; v++) {
        const x = lineup[0]! + i * 11;
        const z = lineup[1]! + v * 15;
        const tree = { sp, v, x, y: 0, z, s: 1, yaw: 0.3 * v, tint: 1, radius: 0, collisionId: null, decorationRank: 0 };
        tree.y = groundedTreeY(terrain, tree, variantFor(tree));
        trees.push(tree);
      }
    });
  }

  /* ---- Build the meshes ---- */
  const solitaryPines = trees.filter((tree) => usesPine(tree.sp)).length;
  const batches: Batch[] = [];
  const byVariant = new Map<TreeVariant, Batch>();
  for (const t of trees) {
    const variant = variantFor(t);
    let b = byVariant.get(variant);
    if (!b) {
      const box = new THREE.Box3();
      for (const lod of variant.lods) for (const geometry of [lod.wood, lod.leaf]) {
        if (!geometry) continue;
        geometry.computeBoundingBox();
        box.union(geometry.boundingBox!);
      }
      b = { variant, meshes: [], casters: [], visibility: [], bounds: box.getBoundingSphere(new THREE.Sphere()), trees: [] };
      byVariant.set(variant, b);
      batches.push(b);
    }
    b.trees.push(t);
  }
  const white = new THREE.Color();
  let triangles = 0;
  // Wind and the foliage look come from the world's shared field (absent only in standalone tools and fixtures).
  const foliage = ctx.foliage ?? null;
  let reducedMotion = ctx.settings.reducedMotion;
  const castsShadows = quality !== 'low';
  const shadowCasters = new THREE.Group();
  shadowCasters.name = 'flora-shadow-casters';
  shadowCasters.visible = false;
  group.add(shadowCasters);
  const casterMaterials: THREE.Material[] = [];
  const casterGeometries: THREE.BufferGeometry[] = [];
  const profileMaterials = new Set<THREE.Material>();
  for (const b of batches) {
    const v = b.variant;
    const response = foliageResponse(v);
    const crown = v.lods[0].leaf ? crownOf(v.lods[0].leaf) : undefined;
    // Pine LODs/seeded variants and procedural caches share source materials. Each profile needs its own
    // height/crown uniforms; maps stay with their existing owner. A profile can still share a near/mid palette.
    const palette = new Map<THREE.Material, THREE.Material>();
    const profileMaterial = (source: THREE.Material): THREE.Material => {
      const existing = palette.get(source);
      if (existing) return existing;
      const material = source.clone();
      // Material.clone() does not copy these hooks; preserve bark detail and other source patches explicitly.
      material.onBeforeCompile = source.onBeforeCompile;
      material.customProgramCacheKey = source.customProgramCacheKey;
      palette.set(source, material);
      profileMaterials.add(material);
      return material;
    };
    for (let l = 0; l < 3; l++) {
      const lod = v.lods[l]!;
      const importedMaterials = usesPine(v.species) ? pine.materials[l]! : meshy ? meshy.materialsFor(v)[l]! : null;
      const wood = lod.wood ? new THREE.InstancedMesh(lod.wood, profileMaterial(importedMaterials ? importedMaterials.wood! : woodMaterial(v.bark, sway)), b.trees.length) : null;
      const leafTex = l === 2 ? v.crownTexture : v.leafTexture;
      const leaf = lod.leaf ? new THREE.InstancedMesh(lod.leaf, profileMaterial(importedMaterials ? importedMaterials.leaf! : leafMaterial(leafTex, sway)), b.trees.length) : null;
      for (const m of [wood, leaf]) {
        if (!m) continue;
        m.count = 0;
        m.frustumCulled = false;
        m.name = `${usesPine(v.species) ? 'solitary-pine' : v.assetId ?? v.species}:${l}:${m === wood ? 'wood' : 'foliage'}`;
        // Shadows come from the separate shadow-only casters below: only trees in the sun's shadow volume, lighter
        // source LODs away from the camera.
        m.castShadow = false;
        m.receiveShadow = true;
        // Give every instance a colour slot now so the buffer exists when we start writing matrices.
        m.setColorAt(0, white.setRGB(1, 1, 1));
        group.add(m);
      }
      b.meshes.push({ wood, leaf });
      b.visibility.push({ wood: wood ? attachInstanceDistanceVisibility(wood) : null, leaf: leaf ? attachInstanceDistanceVisibility(leaf) : null });
      const installed: { wood: InstalledFoliage | null; leaf: InstalledFoliage | null } = { wood: null, leaf: null };
      if (foliage) {
        if (wood) installed.wood = installFoliage(wood.material as THREE.Material, { field: foliage, response, leaf: false, crown });
        if (leaf) installed.leaf = installFoliage(leaf.material as THREE.Material, { field: foliage, response, leaf: true, crown });
      }
      const caster = (mesh: THREE.InstancedMesh | null, part: 'wood' | 'leaf') => {
        if (!mesh || !castsShadows) return null;
        const geometry = shadowGeometry(mesh.geometry);
        // Three casts an alpha-to-coverage material's shadow at a fixed 0.5 cut-off; a copy without it casts at the
        // leaves' own (A69). The copy is never drawn in colour: the casters show only for the sun's shadow pass.
        const material = (mesh.material as THREE.Material).clone();
        material.alphaToCoverage = false;
        casterMaterials.push(material);
        const c = new THREE.InstancedMesh(geometry, material, b.trees.length);
        c.count = 0;
        c.visible = false;
        c.frustumCulled = false;
        c.castShadow = true;
        c.receiveShadow = false;
        c.name = `${mesh.name}:shadow`;
        const depth = shadowDepthMaterial(mesh.material as THREE.Material);
        if (foliage) installFoliageShadow(depth, { field: foliage, response, leaf: part === 'leaf' }, installed[part] ?? undefined);
        c.customDepthMaterial = depth;
        shadowCasters.add(c);
        casterMaterials.push(depth);
        casterGeometries.push(geometry);
        return c;
      };
      b.casters.push({ wood: caster(wood, 'wood'), leaf: caster(leaf, 'leaf') });
    }
    triangles += v.lods[0].tris * b.trees.length;
  }

  // Detached leaves drift downwind; leaves knocked loose by a strike join them.
  const windDirection = ctx.foliage?.wind.direction;
  const fallingLeaves = buildFallingLeaves(terrain, quality, trees, variantFor, windDirection ? Math.atan2(windDirection[1], windDirection[0]) : 0);
  group.add(fallingLeaves.group);
  const burst = ctx.foliage ? createLeafBurst(terrain, ctx.foliage.wind, undefined, reducedMotion) : null;
  if (burst) group.add(burst.mesh);

  /* ---- Per-frame selection ---- */
  const frustum = new THREE.Frustum();
  const pv = new THREE.Matrix4();
  const sphere = new THREE.Sphere();
  const strikePoint = new THREE.Vector3();
  const strikeBounds = new THREE.Box3();
  const mtx = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  const shadowPlaneNormalDelta = new THREE.Vector3();
  const lastCam = new THREE.Vector3(1e9, 0, 0);
  const lastRotation = new THREE.Quaternion();
  const lastProjection = new THREE.Matrix4();
  const lastShadowFrustum = new THREE.Frustum();
  let lastShadowPresent = false;
  let sinceRefresh = 1;
  let visible = 0;
  let drawTris = 0;
  let shadowTrees = 0;
  let shadowTris = 0;
  let disposed = false;

  const refresh = (cam: THREE.Camera, shadowFrustum: THREE.Frustum | null | undefined) => {
    pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    const cx = cam.position.x;
    const cz = cam.position.z;
    visible = 0;
    drawTris = 0;
    shadowTrees = 0;
    shadowTris = 0;
    for (const b of batches) {
      const counts = [0, 0, 0];
      const shadowCounts = [0, 0, 0];
      const v = b.variant;
      const pineShadows = usesPine(v.species);
      for (const t of b.trees) {
        const dx = t.x - cx;
        const dz = t.z - cz;
        const d = Math.hypot(dx, dz);
        const horizon = smoothDistanceFade(d, FLORA_FADE_START, FLORA_MAX_DISTANCE);
        if (horizon <= 0) continue;
        quat.setFromAxisAngle(up, t.yaw);
        pos.set(t.x, t.y, t.z);
        scl.set(t.s, t.s, t.s);
        mtx.compose(pos, quat, scl);
        sphere.copy(b.bounds).applyMatrix4(mtx);
        // Source-derived bounds include leaned crowns, all LOD cards and buried roots. A two-metre
        // guard preloads edge silhouettes. Retain off-screen casters only inside the actual
        // sun-shadow volume instead of paying for every tree in a large circle behind the player.
        sphere.radius += 2;
        const inView = frustum.intersectsSphere(sphere);
        const inShadow = b.casters.length > 0 && !!shadowFrustum?.intersectsSphere(sphere);
        if (!inView && !inShadow) continue;
        if (inShadow) {
          const sl = forceLod >= 0 ? Math.min(2, Math.floor(forceLod)) : floraShadowLod(d, pineShadows);
          const c = b.casters[sl]!;
          if (c.wood || c.leaf) {
            const i = shadowCounts[sl]!++;
            c.wood?.setMatrixAt(i, mtx);
            c.leaf?.setMatrixAt(i, mtx);
            shadowTrees++;
          }
        }
        // Off-screen trees inside the sun's volume are shadow-only; the colour pass draws what the camera sees.
        if (!inView) continue;
        // The stand supplies a shared value group; turning a tree must not change its colour.
        col.setRGB(t.tint, t.tint * 0.99, t.tint * 0.95);
        const weights: number[] = forceLod >= 0 ? [0, 0, 0] : [...floraLodWeightsFor(v.species, quality, d)];
        if (forceLod >= 0) weights[Math.min(2, Math.floor(forceLod))] = 1;
        let intervalStart = 0;
        for (let l = 0; l < 3; l++) {
          const intervalEnd = intervalStart + weights[l]! * horizon;
          if (intervalEnd > intervalStart) {
            const m = b.meshes[l]!, visibility = b.visibility[l]!;
            const i = counts[l]!++;
            for (const part of ['wood', 'leaf'] as const) {
              const mesh = m[part];
              if (!mesh) continue;
              mesh.setMatrixAt(i, mtx);
              mesh.setColorAt(i, col);
              visibility[part]!.coverage.setXY(i, intervalStart, intervalEnd);
            }
          }
          intervalStart = intervalEnd;
        }
        visible++;
      }
      for (let l = 0; l < 3; l++) {
        const m = b.meshes[l]!;
        for (const mesh of [m.wood, m.leaf]) {
          if (!mesh) continue;
          mesh.count = counts[l]!;
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
        for (const visibility of [b.visibility[l]!.wood, b.visibility[l]!.leaf]) if (visibility) visibility.coverage.needsUpdate = true;
        drawTris += v.lods[l]!.tris * counts[l]!;
        // Empty meshes leave the render lists entirely (no per-frame draw setup for an LOD nobody sees).
        for (const mesh of [m.wood, m.leaf]) if (mesh) mesh.visible = counts[l]! > 0;
        const c = b.casters[l];
        if (c) {
          for (const mesh of [c.wood, c.leaf]) {
            if (!mesh) continue;
            mesh.count = shadowCounts[l]!;
            mesh.visible = shadowCounts[l]! > 0;
            mesh.instanceMatrix.needsUpdate = true;
          }
          shadowTris += v.lods[l]!.tris * shadowCounts[l]!;
        }
      }
    }
  };

  return {
    group,
    physicalWood,
    counts: { trees: trees.length, triangles: Math.round(triangles) },
    update(dt: number, f: FrameContext) {
      if (disposed) return;
      reducedMotion = f.reducedMotion;
      burst?.setReducedMotion(reducedMotion);
      forestFloor?.update(dt, f);
      fallingLeaves.update(dt, f);
      burst?.update(dt, f.reducedMotion);
      sinceRefresh += dt;
      const cam = f.camera;
      const moved = cam.position.distanceTo(lastCam);
      // The population is static. An idle camera needs no instance-buffer uploads
      // or repeated culling. Moving/turning cameras refresh immediately, without a 120 ms visibility lag.
      const cameraChanged = moved >= 0.005 || Math.abs(cam.quaternion.dot(lastRotation)) <= 0.9999999 || !cam.projectionMatrix.equals(lastProjection);
      const shadowPresent = !!f.shadowFrustum;
      const shadowChanged = shadowPresent !== lastShadowPresent || (shadowPresent && !f.shadowFrustum!.planes.every((plane, i) => plane.equals(lastShadowFrustum.planes[i]!)));
      const shadowGuardExceeded = shadowPresent && lastShadowPresent && f.shadowFrustum!.planes.some((plane, i) => {
        const previous = lastShadowFrustum.planes[i]!;
        // Bound a plane's movement anywhere in the authored realm. Hour/focus jumps that exceed
        // the preload guard must refresh immediately, not wait for the ordinary slow sun tick.
        return Math.abs(plane.constant - previous.constant) + 600 * shadowPlaneNormalDelta.copy(plane.normal).sub(previous.normal).length() > 1;
      });
      // The two-metre bounds guard safely preloads moving shadow edges. Track the sun even
      // when the camera is idle, while limiting those shadow-only uploads to five per second.
      if (!cameraChanged && (!shadowChanged || (!shadowGuardExceeded && shadowPresent === lastShadowPresent && sinceRefresh < 0.2))) return;
      sinceRefresh = 0;
      lastCam.copy(cam.position);
      lastRotation.copy(cam.quaternion);
      lastProjection.copy(cam.projectionMatrix);
      lastShadowPresent = shadowPresent;
      if (f.shadowFrustum) lastShadowFrustum.copy(f.shadowFrustum);
      cam.updateMatrixWorld();
      refresh(cam, f.shadowFrustum);
    },
    initializeFloor,
    shadowCasters,
    strike(x, y, z, strength = 1, treeId) {
      const field = ctx.foliage;
      if (disposed || !field || !treeId || ![x, y, z, strength].every(Number.isFinite)) return false;
      const hit = woodTrees.get(treeId);
      if (!hit) return false;
      const { tree, variant } = hit;
      const wood = variant.lods[0].wood;
      if (!wood || !(tree.s > 0)) return false;
      // Collider ownership proves the contact. This source-space bound only rejects stale/misassociated points,
      // retaining the full wood envelope (including off-axis branches), with three centimetres of contact tolerance.
      const dx = x - tree.x, dz = z - tree.z, cos = Math.cos(tree.yaw), sin = Math.sin(tree.yaw);
      strikePoint.set((cos * dx - sin * dz) / tree.s, (y - tree.y) / tree.s, (sin * dx + cos * dz) / tree.s);
      if (!wood.boundingBox) wood.computeBoundingBox();
      strikeBounds.copy(wood.boundingBox!).expandByScalar(0.03 / tree.s);
      if (!strikeBounds.containsPoint(strikePoint)) return false;
      burst?.setReducedMotion(reducedMotion);
      if (reducedMotion) return true;
      const height = variant.height * tree.s;
      const amp = THREE.MathUtils.clamp(strength * 6 / Math.max(height, 1), 0.12, 1.2);
      const slots = field.shakes.value;
      let oldest = 0;
      for (let i = 1; i < slots.length; i++) if (slots[i]!.z < slots[oldest]!.z) oldest = i;
      slots[oldest]!.set(tree.x, tree.z, field.wind.uniforms.uGrassTime.value, amp);
      if (variant.lods[0].leaf && burst) burst.release(tree.x, tree.y + height * 0.62, tree.z, Math.max(0.5, height * 0.28), Math.round(3 + amp * 7));
      return true;
    },
    treeAt(x, z, reach = 0.6) {
      let best: { x: number; z: number; height: number; scale: number; leafy: boolean } | null = null;
      let bestD = Infinity;
      for (const b of batches) {
        const v = b.variant;
        for (const t of b.trees) {
          const d = Math.hypot(t.x - x, t.z - z);
          if (d >= bestD || d > Math.max(0.3, v.trunkRadius * t.s) + reach) continue;
          bestD = d;
          best = { x: t.x, z: t.z, height: v.height * t.s, scale: t.s, leafy: !!v.lods[0].leaf };
        }
      }
      return best;
    },
    stats: () => ({ trees: trees.length, solitaryPines, meshyTrees: meshy ? trees.length - solitaryPines : 0, treeObstacles: obstacles.length, treesDrawn: visible, treeTris: Math.round(drawTris),
      shadowTrees, shadowTris: Math.round(shadowTris), struckLeaves: burst?.active ?? 0, ...forestFloor?.stats?.(), ...fallingLeaves.stats?.() }),
    dispose() {
      if (disposed) return;
      disposed = true;
      forestFloor?.dispose?.();
      fallingLeaves.dispose?.();
      burst?.dispose();
      for (const batch of batches) {
        for (const visibility of batch.visibility) { visibility.wood?.dispose(); visibility.leaf?.dispose(); }
        for (const mesh of batch.meshes) {
          mesh.wood?.dispose();
          mesh.leaf?.dispose();
        }
        for (const mesh of batch.casters) {
          mesh.wood?.dispose();
          mesh.leaf?.dispose();
        }
      }
      for (const material of casterMaterials) material.dispose();
      for (const geometry of casterGeometries) geometry.dispose();
      for (const material of profileMaterials) material.dispose();
      profileMaterials.clear();
      woodTrees.clear();
      // Grounding also examines rejected candidates; all procedural variants belong to this world.
      for (const variant of variants.values()) {
        for (const lod of usesPine(variant.species) || meshy ? [] : variant.lods) {
          lod.wood?.dispose();
          lod.leaf?.dispose();
        }
      }
      pine.dispose();
      meshy?.dispose();
      variants.clear();
      disposeTreeMaterials();
      disposeTreeTextures();
      // The module owns these cached resources; fallback scene cleanup handles everything else.
      group.clear();
    },
  };
}

export { SPECIES };
