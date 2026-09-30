import * as THREE from 'three';
import type { BuildContext, FrameContext, SceneModule } from './context';
import { SPECIES, buildTreeVariant, type TreeVariant } from './treeGen';
import { leafMaterial, woodMaterial, disposeTreeMaterials } from './treeMaterials';
import { disposeTreeTextures } from './treeTextures';
import { createFloraPopulation, selectFloraPopulation, registerFloraColliders, FLORA_VARIANTS, FLORA_MAX_DISTANCE, floraLod, type FloraTree } from './floraPopulation';
import { buildForestFloor } from './forestFloor';

/**
 * Trees and shrubs. An empty strand gives way to a layered old-growth woodland: flared oak roots under tall pine/fir columns,
 * a lower birch stratum and native fern/moss floor. The trail remains open under the interlocking crowns. Every
 * tree is one of a few seeded variants per species, drawn as instances at one of three levels of detail chosen by distance
 * and culled by hand each few frames, so the canonical trunks remain present across graphics presets while decorative scrub can be thinned.
 */

interface Batch {
  variant: TreeVariant;
  meshes: { wood: THREE.InstancedMesh | null; leaf: THREE.InstancedMesh | null }[];
  trees: FloraTree[];
}

export function buildFlora(ctx: BuildContext): SceneModule & { counts: { trees: number; triangles: number } } {
  const { terrain, colliders, quality, sway, excl } = ctx;
  const group = new THREE.Group();
  group.name = 'flora';
  const population = createFloraPopulation(terrain, excl);
  registerFloraColliders(population, colliders);
  const { trees, obstacles } = selectFloraPopulation(population, quality);
  const forestFloor = buildForestFloor(terrain, excl, quality);
  group.add(forestFloor.group);

  /* Developer aid: `?lineup=x,z` plants one of every species in rows near a point, and `?lod=0|1|2` forces a level of detail. */
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const lineup = q.get('lineup')?.split(',').map(Number);
  const forceLod = q.has('lod') ? Number(q.get('lod')) : -1;
  if (lineup && lineup.length === 2) {
    SPECIES.forEach((sp, i) => {
      for (let v = 0; v < FLORA_VARIANTS; v++) {
        const x = lineup[0]! + i * 11;
        const z = lineup[1]! + v * 15;
        const y = terrain.heightAt(x, z) - 0.06;
        trees.push({ sp, v, x, y, z, s: 1, yaw: 0.3 * v, tint: 1, radius: 0, collisionId: null, decorationRank: 0 });
      }
    });
  }

  /* ---- Build the meshes ---- */
  const batches: Batch[] = [];
  const bySpecVariant = new Map<string, Batch>();
  for (const t of trees) {
    const key = `${t.sp}:${t.v}`;
    let b = bySpecVariant.get(key);
    if (!b) {
      b = { variant: buildTreeVariant(t.sp, t.v + 1), meshes: [], trees: [] };
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
      const wood = lod.wood ? new THREE.InstancedMesh(lod.wood, woodMaterial(v.bark, sway), b.trees.length) : null;
      const leafTex = l === 2 ? v.crownTexture : v.leafTexture;
      const leaf = lod.leaf ? new THREE.InstancedMesh(lod.leaf, leafMaterial(leafTex, sway), b.trees.length) : null;
      for (const m of [wood, leaf]) {
        if (!m) continue;
        m.count = 0;
        m.frustumCulled = false;
        // The middle preset renders LOD1 close to the player; that canopy must cast shadows too.
        m.castShadow = quality !== 'low' && l < 2;
        m.receiveShadow = true;
        // Give every instance a colour slot now so the buffer exists when we start writing matrices.
        m.setColorAt(0, white.setRGB(1, 1, 1));
        group.add(m);
      }
      b.meshes.push({ wood, leaf });
    }
    triangles += v.lods[0].tris * b.trees.length;
  }

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
  let sinceUpdate = 1;
  const lastCam = new THREE.Vector3(1e9, 0, 0);
  let visible = 0;
  let drawTris = 0;
  let disposed = false;

  const refresh = (cam: THREE.Camera) => {
    pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    const cx = cam.position.x;
    const cz = cam.position.z;
    visible = 0;
    drawTris = 0;
    for (const b of batches) {
      const counts = [0, 0, 0];
      const v = b.variant;
      const reach = Math.max(v.height, v.crownRadius * 2);
      for (const t of b.trees) {
        const dx = t.x - cx;
        const dz = t.z - cz;
        const d = Math.hypot(dx, dz);
        if (d > FLORA_MAX_DISTANCE) continue;
        const r = reach * t.s;
        sphere.center.set(t.x, t.y + v.height * t.s * 0.5, t.z);
        sphere.radius = r * 0.75;
        // Keep everything inside the shadow range even when off-screen: shadows of unseen trees fall into view.
        if (d > 30 && !frustum.intersectsSphere(sphere)) continue;
        const l = forceLod >= 0 ? Math.min(2, Math.floor(forceLod)) : floraLod(quality, d);
        const m = b.meshes[l]!;
        const i = counts[l]!++;
        quat.setFromAxisAngle(up, t.yaw);
        pos.set(t.x, t.y, t.z);
        scl.set(t.s, t.s, t.s);
        mtx.compose(pos, quat, scl);
        col.setRGB(t.tint, t.tint * (0.97 + (t.yaw % 0.05)), t.tint * 0.95);
        if (m.wood) {
          m.wood.setMatrixAt(i, mtx);
          m.wood.setColorAt(i, col);
        }
        if (m.leaf) {
          m.leaf.setMatrixAt(i, mtx);
          m.leaf.setColorAt(i, col);
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
        drawTris += v.lods[l]!.tris * counts[l]!;
      }
    }
  };

  return {
    group,
    counts: { trees: trees.length, triangles: Math.round(triangles) },
    update(dt: number, f: FrameContext) {
      if (disposed) return;
      forestFloor.update(dt, f);
      sinceUpdate += dt;
      const cam = f.camera;
      const moved = Math.hypot(cam.position.x - lastCam.x, cam.position.z - lastCam.z);
      // Rotation matters as much as position: turning the camera reveals new trees.
      if (sinceUpdate < 0.12 && moved < 1.5) return;
      sinceUpdate = 0;
      lastCam.copy(cam.position);
      cam.updateMatrixWorld();
      refresh(cam);
    },
    stats: () => ({ trees: trees.length, treeObstacles: obstacles.length, treesDrawn: visible, treeTris: Math.round(drawTris), ...forestFloor.stats?.() }),
    dispose() {
      if (disposed) return;
      disposed = true;
      forestFloor.dispose?.();
      for (const batch of batches) {
        for (const mesh of batch.meshes) {
          mesh.wood?.dispose();
          mesh.leaf?.dispose();
        }
        for (const lod of batch.variant.lods) {
          lod.wood?.dispose();
          lod.leaf?.dispose();
        }
      }
      disposeTreeMaterials();
      disposeTreeTextures();
      // The module owns these cached resources; fallback scene cleanup handles everything else.
      group.clear();
    },
  };
}

export { SPECIES };
