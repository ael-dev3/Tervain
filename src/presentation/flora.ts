import * as THREE from 'three';
import type { BuildContext, FrameContext, SceneModule } from './context';
import { SPECIES, buildTreeVariant, type TreeVariant } from './treeGen';
import { leafMaterial, woodMaterial, disposeTreeMaterials } from './treeMaterials';
import { disposeTreeTextures } from './treeTextures';
import { createFloraPopulation, selectFloraPopulation, registerFloraColliders, FLORA_VARIANTS, FLORA_FADE_START, FLORA_MAX_DISTANCE, floraLodWeights, type FloraTree } from './floraPopulation';
import { buildForestFloor } from './forestFloor';
import { buildFallingLeaves } from './fallingLeaves';
import { createPineForest, isPineSpecies, type PineTemplates } from './solitaryPine';
import { groundedTreeY, treeWoodCollisionRadius } from './treeGrounding';
import { PlantedCrownIndex } from './plantedCrowns';
import { attachInstanceDistanceVisibility, smoothDistanceFade, type InstanceDistanceVisibility } from './distanceVisibility';
import type { PhysicalWoodGeometry } from '../world/physicsGeometry';

/**
 * Trees and shrubs. An empty strand gives way to a layered old-growth woodland: flared oak roots under tall pine/fir columns,
 * a lower birch stratum and native fern/moss floor. The trail remains open under the interlocking crowns. Every
 * tree is one of a few seeded variants per species. High retains the complete source instances at every distance;
 * other presets retain three levels with opaque complementary fades. Culling uses the actual source crown envelope
 * and follows camera turns on the same frame.
 */

interface Batch {
  variant: TreeVariant;
  meshes: { wood: THREE.InstancedMesh | null; leaf: THREE.InstancedMesh | null }[];
  visibility: { wood: InstanceDistanceVisibility | null; leaf: InstanceDistanceVisibility | null }[];
  bounds: THREE.Sphere;
  trees: FloraTree[];
}

export function buildFlora(ctx: BuildContext, pineTemplates: PineTemplates, deferFloor = false): SceneModule & {
  counts: { trees: number; triangles: number }; physicalWood: readonly PhysicalWoodGeometry[]; initializeFloor(extraTrees?: readonly FloraTree[]): void;
} {
  const { terrain, colliders, quality, sway, excl } = ctx;
  const group = new THREE.Group();
  group.name = 'flora';
  const pine = createPineForest(pineTemplates);
  const variants = new Map<string, TreeVariant>();
  const variantFor = (tree: Pick<FloraTree, 'sp' | 'v'>): TreeVariant => {
    const key = `${tree.sp}:${tree.v}`;
    let variant = variants.get(key);
    if (!variant) {
      variant = isPineSpecies(tree.sp) ? pine.variant(tree.sp, tree.v + 1) : buildTreeVariant(tree.sp, tree.v + 1);
      variants.set(key, variant);
    }
    return variant;
  };
  const population = createFloraPopulation(terrain, excl, (tree, legacyFootprint) => isPineSpecies(tree.sp)
    ? pine.collisionRadius(tree.sp, tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y)
    : legacyFootprint > 0 ? treeWoodCollisionRadius(variantFor(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : legacyFootprint,
    (tree) => groundedTreeY(terrain, tree, variantFor(tree)));
  registerFloraColliders(population, colliders);
  // Static rigid-body contact uses the same complete wood as the visible source tree,
  // rather than treating its broad ground-plane navigation circle as an infinite cylinder.
  // Pack only once per variant; hundreds of instances share these source buffers.
  const woodBuffers = new Map<TreeVariant, Pick<PhysicalWoodGeometry, 'positions' | 'indices'>>();
  const physicalWood: PhysicalWoodGeometry[] = [];
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
    forestFloor = buildForestFloor(terrain, excl, quality, [...population, ...extraTrees], plantedCrowns);
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
  const solitaryPines = trees.filter((tree) => isPineSpecies(tree.sp)).length;
  const batches: Batch[] = [];
  const bySpecVariant = new Map<string, Batch>();
  for (const t of trees) {
    const key = `${t.sp}:${t.v}`;
    let b = bySpecVariant.get(key);
    if (!b) {
      const variant = variantFor(t);
      const box = new THREE.Box3();
      for (const lod of variant.lods) for (const geometry of [lod.wood, lod.leaf]) {
        if (!geometry) continue;
        geometry.computeBoundingBox();
        box.union(geometry.boundingBox!);
      }
      b = { variant, meshes: [], visibility: [], bounds: box.getBoundingSphere(new THREE.Sphere()), trees: [] };
      bySpecVariant.set(key, b);
      batches.push(b);
    }
    b.trees.push(t);
  }
  const white = new THREE.Color();
  let triangles = 0;
  for (const b of batches) {
    const v = b.variant;
    for (let l = 0; l < 3; l++) {
      const lod = v.lods[l]!;
      const pineMaterials = isPineSpecies(v.species) ? pine.materials[l]! : null;
      const wood = lod.wood ? new THREE.InstancedMesh(lod.wood, pineMaterials ? pineMaterials.wood! : woodMaterial(v.bark, sway), b.trees.length) : null;
      const leafTex = l === 2 ? v.crownTexture : v.leafTexture;
      const leaf = lod.leaf ? new THREE.InstancedMesh(lod.leaf, pineMaterials ? pineMaterials.leaf : leafMaterial(leafTex, sway), b.trees.length) : null;
      for (const m of [wood, leaf]) {
        if (!m) continue;
        m.count = 0;
        m.frustumCulled = false;
        m.name = `${isPineSpecies(v.species) ? 'solitary-pine' : v.species}:${l}:${m === wood ? 'wood' : 'foliage'}`;
        // The middle preset renders LOD1 close to the player; that canopy must cast shadows too.
        m.castShadow = quality !== 'low' && l < 2;
        m.receiveShadow = true;
        // Give every instance a colour slot now so the buffer exists when we start writing matrices.
        m.setColorAt(0, white.setRGB(1, 1, 1));
        group.add(m);
      }
      b.meshes.push({ wood, leaf });
      b.visibility.push({ wood: wood ? attachInstanceDistanceVisibility(wood) : null, leaf: leaf ? attachInstanceDistanceVisibility(leaf) : null });
    }
    triangles += v.lods[0].tris * b.trees.length;
  }

  // Detached leaves have their own motion; approved trunks, branches and canopy meshes remain static.
  const fallingLeaves = buildFallingLeaves(terrain, quality, trees, variantFor);
  group.add(fallingLeaves.group);

  /* ---- Per-frame selection ---- */
  const frustum = new THREE.Frustum();
  const pv = new THREE.Matrix4();
  const sphere = new THREE.Sphere();
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
  let disposed = false;

  const refresh = (cam: THREE.Camera, shadowFrustum: THREE.Frustum | null | undefined) => {
    pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    const cx = cam.position.x;
    const cz = cam.position.z;
    visible = 0;
    drawTris = 0;
    for (const b of batches) {
      const counts = [0, 0, 0];
      const v = b.variant;
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
        if (!frustum.intersectsSphere(sphere) && !shadowFrustum?.intersectsSphere(sphere)) continue;
        // The stand supplies a shared value group; turning a tree must not change its colour.
        col.setRGB(t.tint, t.tint * 0.99, t.tint * 0.95);
        const weights: number[] = forceLod >= 0 ? [0, 0, 0] : [...floraLodWeights(quality, d)];
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
      }
    }
  };

  return {
    group,
    physicalWood,
    counts: { trees: trees.length, triangles: Math.round(triangles) },
    update(dt: number, f: FrameContext) {
      if (disposed) return;
      forestFloor?.update(dt, f);
      fallingLeaves.update(dt, f);
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
    stats: () => ({ trees: trees.length, solitaryPines, treeObstacles: obstacles.length, treesDrawn: visible, treeTris: Math.round(drawTris), ...forestFloor?.stats?.(), ...fallingLeaves.stats?.() }),
    dispose() {
      if (disposed) return;
      disposed = true;
      forestFloor?.dispose?.();
      fallingLeaves.dispose?.();
      for (const batch of batches) {
        for (const visibility of batch.visibility) { visibility.wood?.dispose(); visibility.leaf?.dispose(); }
        for (const mesh of batch.meshes) {
          mesh.wood?.dispose();
          mesh.leaf?.dispose();
        }
      }
      // Grounding also examines rejected candidates; all procedural variants belong to this world.
      for (const variant of variants.values()) {
        for (const lod of isPineSpecies(variant.species) ? [] : variant.lods) {
          lod.wood?.dispose();
          lod.leaf?.dispose();
        }
      }
      pine.dispose();
      variants.clear();
      disposeTreeMaterials();
      disposeTreeTextures();
      // The module owns these cached resources; fallback scene cleanup handles everything else.
      group.clear();
    },
  };
}

export { SPECIES };
