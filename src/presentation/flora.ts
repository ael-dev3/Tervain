import * as THREE from 'three';
import { ORCHARD, WORLD } from '../world/layout';
import { cliffiness, shoreDistance } from '../world/coast';
import { clamp, fbm, mulberry32, smoothstep } from '../world/noise';
import { roadWeight, realmRadius } from '../world/terrain';
import type { BuildContext, FrameContext, SceneModule } from './context';
import { SPECIES, buildTreeVariant, type Species, type TreeVariant } from './treeGen';
import { leafMaterial, woodMaterial, disposeTreeMaterials } from './treeMaterials';
import { disposeTreeTextures } from './treeTextures';
import { streamDistance } from './vegetation';

/**
 * Trees and shrubs. The open heath around the strand is nearly empty: a lone wind-bent pine, a dead oak, a knot of scrub by a
 * boulder. Forests stand back on the higher ground north and south of the road, and pine and fir cover the mountain flanks. Every
 * tree is one of a few seeded variants per species, drawn as instances at one of three levels of detail chosen by distance
 * and culled by hand each few frames, so a thousand trees cost a few dozen draw calls.
 */

interface Tree {
  sp: Species;
  v: number;
  x: number;
  y: number;
  z: number;
  s: number;
  yaw: number;
  tint: number;
  radius: number;
}

const VARIANTS = 3;
/** Distance where each level of detail hands over, in metres. */
const LOD_FAR = [40, 128, 760];

interface Batch {
  variant: TreeVariant;
  meshes: { wood: THREE.InstancedMesh | null; leaf: THREE.InstancedMesh | null }[];
  trees: Tree[];
}

export function buildFlora(ctx: BuildContext): SceneModule & { counts: { trees: number; triangles: number } } {
  const { terrain, colliders, quality, sway, excl } = ctx;
  const group = new THREE.Group();
  group.name = 'flora';
  const rng = mulberry32(2026);
  const trees: Tree[] = [];
  let id = 0;

  const RADIUS: Record<Species, number> = { oak: 0.55, birch: 0.25, pine: 0.38, fir: 0.34, shorepine: 0.34, dead: 0.42, orchard: 0.28, shrub: 0 };
  const put = (sp: Species, x: number, z: number, scale = 1, collide = true) => {
    const y = terrain.heightAt(x, z) - 0.06;
    const r = RADIUS[sp] * scale;
    trees.push({ sp, v: Math.floor(rng() * VARIANTS), x, y, z, s: scale, yaw: rng() * Math.PI * 2, tint: 0.82 + rng() * 0.36, radius: r });
    if (collide && r > 0) colliders.circle(`tree:${id++}`, x, z, r);
  };

  const spacing = quality === 'low' ? 1.35 : quality === 'medium' ? 1.12 : 1;

  /** Why a spot is unsuitable for a tree: beach, water, rock, steep ground, paths, buildings. */
  const bad = (x: number, z: number, pad = 0.5) => {
    if (realmRadius(x, z) > 0.97) return true;
    const sd = shoreDistance(x, z);
    if (sd < 16) return true;
    if (terrain.slopeAt(x, z) > 0.62) return true;
    if (terrain.heightAt(x, z) < 0.3) return true;
    return excl.blocked(x, z, pad);
  };

  /* ---- Forests on the coastal plain: two belts back from the road, and the hill above the overlook ---- */
  const cell = 6.4 * spacing;
  for (let gz = WORLD.minZ + 8; gz < WORLD.maxZ - 8; gz += cell) {
    for (let gx = WORLD.minX + 8; gx < WORLD.maxX - 8; gx += cell) {
      const x = gx + (rng() - 0.5) * cell * 0.9;
      const z = gz + (rng() - 0.5) * cell * 0.9;
      if (bad(x, z, 0.9)) continue;
      const sd = shoreDistance(x, z);
      const h = terrain.heightAt(x, z);
      let density = 0;
      if (x < -120) {
        // Coastal plain: forest only well back from the shore and away from the road.
        const north = smoothstep(-34, -74, z);
        const south = smoothstep(104, 130, z);
        const patches = smoothstep(0.34, 0.62, fbm(x / 34 + 3, z / 34 - 8, 3, 51) * 0.5 + 0.5);
        density = Math.max(north, south) * (0.35 + 0.65 * patches) * smoothstep(34, 86, sd);
        // A wind-shaped stand of scrub pine on the rise below the overlook.
        density = Math.max(density, smoothstep(0.55, 0.8, fbm(x / 22 - 11, z / 22 + 6, 3, 57) * 0.5 + 0.5) * smoothstep(90, 130, sd) * 0.5);
      } else {
        const wd = streamDistance(x, z);
        const forestN = fbm(x / 38 + 10, z / 38 - 20, 3, 44) * 0.5 + 0.5;
        const wet = 1 - smoothstep(4, 30, wd);
        density = smoothstep(0.52, 0.8, forestN) * 0.9 + wet * 0.3 + smoothstep(4, 12, h) * 0.3;
        const vd = Math.hypot(x - 4, z - 8);
        density *= smoothstep(30, 62, vd);
      }
      if (rng() > density) continue;
      const damp = 1 - smoothstep(4, 30, streamDistance(x, z));
      const pick = rng();
      const conifers = h > 8 || x < -120;
      if (conifers && pick < 0.5) put(rng() < 0.55 ? 'pine' : 'fir', x, z, 0.8 + rng() * 0.45);
      else if (damp > 0.4 && pick < 0.75) put('birch', x, z, 0.85 + rng() * 0.4);
      else put(pick < 0.7 ? 'oak' : 'birch', x, z, 0.75 + rng() * 0.5);
      if (rng() < 0.16) put('shrub', x + 2 + rng() * 2.5, z + (rng() - 0.5) * 3, 0.9 + rng() * 0.6, false);
    }
  }

  /* ---- The open heath: rare, characterful lone trees, mostly leaning with the wind or dead ---- */
  {
    const c = 34 * spacing;
    for (let gz = -140; gz < 150; gz += c) {
      for (let gx = -300; gx < -100; gx += c) {
        if (rng() > 0.36) continue;
        const x = gx + rng() * c;
        const z = gz + rng() * c;
        if (bad(x, z, 2.5) || shoreDistance(x, z) < 26) continue;
        const pick = rng();
        const sp: Species = pick < 0.36 ? 'shorepine' : pick < 0.62 ? 'dead' : pick < 0.82 ? 'oak' : 'birch';
        const sc = sp === 'oak' ? 0.8 + rng() * 0.3 : 0.85 + rng() * 0.35;
        put(sp, x, z, sc);
        // Scrub gathers at the foot of a lone tree.
        const n = 2 + Math.floor(rng() * 4);
        for (let k = 0; k < n; k++) put('shrub', x + (rng() - 0.5) * 8, z + (rng() - 0.5) * 8, 0.8 + rng() * 0.7, false);
      }
    }
    // Scrub across the heath and on the dunes: gorse and heather, thin and patchy.
    const sc = 8.5 * spacing;
    for (let gz = -150; gz < 160; gz += sc) {
      for (let gx = -290; gx < -90; gx += sc) {
        const x = gx + rng() * sc;
        const z = gz + rng() * sc;
        const p = fbm(x / 16, z / 16, 3, 71) * 0.5 + 0.5;
        if (rng() > smoothstep(0.42, 0.72, p) * 0.7) continue;
        if (realmRadius(x, z) > 0.97 || shoreDistance(x, z) < 12 || terrain.slopeAt(x, z) > 0.7 || excl.blocked(x, z, 0.5)) continue;
        if (cliffiness(z) > 0.6 && shoreDistance(x, z) < 30) continue;
        put('shrub', x, z, 0.7 + rng() * 0.9, false);
      }
    }
  }

  /* ---- Orchard rows west of the village ---- */
  for (let ox = ORCHARD.x; ox < ORCHARD.x + ORCHARD.w; ox += 5.4) {
    for (let oz = ORCHARD.z; oz < ORCHARD.z + ORCHARD.d; oz += 5.4) {
      if (excl.blocked(ox, oz) && roadWeight(ox, oz) > 0.04) continue;
      if (terrain.carveAt(ox, oz) > 0.02) continue;
      put('orchard', ox + (rng() - 0.5) * 0.5, oz + (rng() - 0.5) * 0.5, 0.9 + rng() * 0.25);
    }
  }

  // Late-thaw damage: three dead trees where the flood struck.
  put('dead', 16.5, -63, 0.95);
  put('dead', -2, -78, 0.85);
  put('dead', 70, -37, 0.9);

  /* ---- Mountain flanks: pine and fir, no collision (the slope already stops movement) ---- */
  const pineStep = (quality === 'low' ? 15 : quality === 'medium' ? 12 : 10) * 1.1;
  for (let gz = WORLD.minZ + 6; gz < WORLD.maxZ - 6; gz += pineStep) {
    for (let gx = WORLD.minX + 6; gx < WORLD.maxX - 6; gx += pineStep) {
      const x = gx + (rng() - 0.5) * pineStep;
      const z = gz + (rng() - 0.5) * pineStep;
      const rr = realmRadius(x, z);
      if (rr < 0.86 || shoreDistance(x, z) < 30) continue;
      if (terrain.slopeAt(x, z) > 1.25) continue;
      if (terrain.heightAt(x, z) > 95) continue;
      if (rng() < 0.3) continue;
      put(rng() < 0.6 ? 'fir' : 'pine', x, z, 1.05 + rng() * 1.2, false);
    }
  }

  /* Developer aid: `?lineup=x,z` plants one of every species in rows near a point, and `?lod=0|1|2` forces a level of detail. */
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const lineup = q.get('lineup')?.split(',').map(Number);
  const forceLod = q.has('lod') ? Number(q.get('lod')) : -1;
  if (lineup && lineup.length === 2) {
    SPECIES.forEach((sp, i) => {
      for (let v = 0; v < VARIANTS; v++) {
        const x = lineup[0]! + i * 11;
        const z = lineup[1]! + v * 15;
        const y = terrain.heightAt(x, z) - 0.06;
        trees.push({ sp, v, x, y, z, s: 1, yaw: 0.3 * v, tint: 1, radius: 0 });
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
        m.castShadow = l < 2;
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
        if (d > LOD_FAR[2]!) continue;
        const r = reach * t.s;
        sphere.center.set(t.x, t.y + v.height * t.s * 0.5, t.z);
        sphere.radius = r * 0.75;
        // Keep everything inside the shadow range even when off-screen: shadows of unseen trees fall into view.
        if (d > 30 && !frustum.intersectsSphere(sphere)) continue;
        const l = forceLod >= 0 ? forceLod : d < LOD_FAR[0]! ? 0 : d < LOD_FAR[1]! ? 1 : 2;
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
    stats: () => ({ trees: trees.length, treesDrawn: visible, treeTris: Math.round(drawTris) }),
    dispose() {
      disposeTreeMaterials();
      disposeTreeTextures();
    },
  };
}

export { SPECIES };
void clamp;
