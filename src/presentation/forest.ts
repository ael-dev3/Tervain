import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ORCHARD, VALLEY, WORLD } from '../world/layout';
import { clamp, fbm, mulberry32, smoothstep } from '../world/noise';
import { roadWeight } from '../world/terrain';
import { PAL, paint, transform } from './kit';
import type { BuildContext, SceneModule } from './context';
import { makeSwayMaterial, streamDistance, withSway } from './vegetation';
import type { AssetNeed } from './assets/library';

/** Assets this module wants loaded before the world is built. */
export const NEEDS: AssetNeed[] = [];

function trunk(rt: number, rb: number, h: number, seg: number, color: number) {
  return paint(new THREE.CylinderGeometry(rt, rb, h, seg), color, 1.2);
}

/** A tapered branch from a to b, painted as bark. */
function branch(ax: number, ay: number, az: number, bx: number, by: number, bz: number, r0: number, r1: number, color: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  const g = new THREE.CylinderGeometry(r1, r0, len, 5);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  const m = new THREE.Matrix4().compose(new THREE.Vector3(ax, ay, az), q, new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(m);
  return paint(g, color, 1.2);
}

function blob(x: number, y: number, z: number, r: number, color: number, sy = 0.82) {
  const g = paint(new THREE.IcosahedronGeometry(r, 1), color, 1.6);
  return transform(g, x, y, z, 0, 0, 0, 1, sy, 1);
}

/** Lightly shaded canopy colour set for a family. */
interface TreeSpec {
  geo: THREE.BufferGeometry;
  colliderR: number;
  cast: boolean;
}

function buildAlder(mature: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const H = mature ? 4.6 : 3.0;
  const r0 = mature ? 0.32 : 0.18;
  parts.push(transform(trunk(r0 * 0.45, r0, H, 6, PAL.bark), 0, H / 2, 0));
  const nb = mature ? 5 : 3;
  const rng = mulberry32(mature ? 11 : 12);
  const greens = [PAL.leafA, PAL.leafB, PAL.leafC];
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rng() * 0.6;
    const y0 = H * (0.55 + rng() * 0.3);
    const len = (mature ? 1.9 : 1.2) * (0.8 + rng() * 0.4);
    const bx = Math.cos(a) * len;
    const bz = Math.sin(a) * len;
    const by = y0 + len * 0.7;
    parts.push(branch(0, y0, 0, bx, by, bz, r0 * 0.28, r0 * 0.1, PAL.bark));
    parts.push(blob(bx * 1.1, by + 0.35, bz * 1.1, (mature ? 1.55 : 1.05) * (0.85 + rng() * 0.3), greens[i % 3]!));
  }
  parts.push(branch(0, H * 0.8, 0, 0, H + 0.9, 0, r0 * 0.25, r0 * 0.08, PAL.bark));
  parts.push(blob(0, H + (mature ? 1.5 : 1.0), 0, mature ? 2.0 : 1.3, PAL.leafB));
  parts.push(blob(0.4, H + (mature ? 0.4 : 0.2), 0.3, mature ? 1.5 : 1.0, PAL.leafC));
  const g = mergeGeometries(parts, false)!;
  return withSway(g, (y, x, z) => (y < H * 0.7 ? 0.015 * y : 0.25 + 0.75 * clamp((y - H * 0.7) / (H * 0.9), 0, 1)) * (1 + 0.15 * Math.hypot(x, z)));
}

function buildOak(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const H = 3.0;
  parts.push(transform(trunk(0.22, 0.52, H, 7, PAL.barkPale), 0, H / 2, 0));
  const rng = mulberry32(31);
  const greens = [PAL.leafOak, PAL.leafA, PAL.leafC, PAL.leafB];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng() * 0.5;
    const len = 2.5 * (0.8 + rng() * 0.5);
    const y0 = H * (0.7 + rng() * 0.25);
    const bx = Math.cos(a) * len;
    const bz = Math.sin(a) * len;
    const by = y0 + len * 0.55;
    parts.push(branch(0, y0, 0, bx, by, bz, 0.2, 0.08, PAL.barkPale));
    parts.push(blob(bx * 1.08, by + 0.4, bz * 1.08, 2.0 * (0.9 + rng() * 0.3), greens[i % 4]!, 0.75));
  }
  parts.push(branch(0, H * 0.85, 0, 0, H + 1.6, 0, 0.16, 0.07, PAL.barkPale));
  parts.push(blob(0, H + 2.1, 0, 2.6, PAL.leafOak, 0.78));
  parts.push(blob(0.6, H + 0.9, -0.4, 2.0, PAL.leafC, 0.8));
  const g = mergeGeometries(parts, false)!;
  return withSway(g, (y) => (y < H ? 0.01 * y : 0.2 + 0.7 * clamp((y - H) / 4, 0, 1)));
}

function buildOrchard(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const H = 1.7;
  parts.push(transform(trunk(0.09, 0.2, H, 6, PAL.bark), 0, H / 2, 0));
  const rng = mulberry32(51);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    parts.push(branch(0, H * 0.7, 0, Math.cos(a) * 1.1, H + 0.7, Math.sin(a) * 1.1, 0.08, 0.04, PAL.bark));
    parts.push(blob(Math.cos(a) * 1.1, H + 0.95, Math.sin(a) * 1.1, 1.0, i % 2 ? PAL.leafOrchard : PAL.leafB));
  }
  parts.push(blob(0, H + 1.3, 0, 1.4, PAL.leafOrchard));
  // Fruit sits on the canopy surface so it is attached to the leaves, not floating.
  for (let i = 0; i < 12; i++) {
    const a = rng() * Math.PI * 2;
    const e = 0.2 + rng() * 1.1;
    const R = 1.42;
    const fx = Math.cos(a) * Math.sin(e) * R;
    const fz = Math.sin(a) * Math.sin(e) * R;
    const fy = H + 1.3 + Math.cos(e) * R * 0.8 - 0.1;
    const f = paint(new THREE.IcosahedronGeometry(0.11, 0), i % 3 === 0 ? PAL.fruitY : PAL.fruit, 0.5);
    parts.push(transform(f, fx, fy, fz));
  }
  const g = mergeGeometries(parts, false)!;
  return withSway(g, (y) => (y < H ? 0.01 * y : 0.2 + 0.5 * clamp((y - H) / 2, 0, 1)));
}

function buildDamaged(): THREE.BufferGeometry {
  // A flood-damaged alder: leaning, snapped, with bare limbs and a few surviving leaves near the base.
  const parts: THREE.BufferGeometry[] = [];
  parts.push(transform(trunk(0.2, 0.36, 3.6, 6, PAL.barkPale), 0, 1.8, 0, 0, 0.0, 0.18));
  parts.push(branch(0.3, 2.8, 0, 1.6, 3.6, 0.5, 0.1, 0.03, PAL.barkPale));
  parts.push(branch(0.2, 2.2, 0, -1.4, 3.0, -0.4, 0.09, 0.03, PAL.barkPale));
  parts.push(branch(0.6, 3.4, 0, 0.9, 4.6, -0.3, 0.08, 0.02, PAL.barkPale));
  parts.push(blob(-1.4, 3.1, -0.4, 0.55, PAL.leafC));
  const jag = paint(new THREE.ConeGeometry(0.2, 0.7, 5), PAL.barkPale, 1);
  parts.push(transform(jag, 0.62, 3.75, 0, 0, 0, 0.18));
  const g = mergeGeometries(parts, false)!;
  return withSway(g, (y) => (y > 3 ? 0.15 : 0.0));
}

function buildPine(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(transform(trunk(0.16, 0.3, 3.2, 5, PAL.bark), 0, 1.6, 0));
  const layers: [number, number, number][] = [
    [2.0, 3.0, 2.6],
    [1.6, 2.7, 4.4],
    [1.15, 2.4, 6.0],
    [0.7, 2.0, 7.4],
  ];
  layers.forEach(([r, h, y], i) => parts.push(transform(paint(new THREE.ConeGeometry(r, h, 6), i % 2 ? 0x3f6a42 : 0x386040, 1.6), 0, y + h / 2 - 0.6, 0)));
  const g = mergeGeometries(parts, false)!;
  return withSway(g, (y) => (y > 3 ? 0.08 + 0.05 * (y - 3) : 0));
}


/** Procedural fallback forest (also used when the shared tree assets are unavailable). */
export function buildForest(ctx: BuildContext): SceneModule & { counts: { trees: number; triangles: number } } {
  const { terrain, colliders, quality, sway: uniforms, excl } = ctx;
  const group = new THREE.Group();
  const treeMat = makeSwayMaterial(uniforms);

  const species: Record<string, TreeSpec & { items: { x: number; y: number; z: number; s: number; r: number; tint: number }[] }> = {
    alder: { geo: buildAlder(true), colliderR: 0.42, cast: true, items: [] },
    alderYoung: { geo: buildAlder(false), colliderR: 0.25, cast: true, items: [] },
    oak: { geo: buildOak(), colliderR: 0.6, cast: true, items: [] },
    orchard: { geo: buildOrchard(), colliderR: 0.25, cast: true, items: [] },
    damaged: { geo: buildDamaged(), colliderR: 0.4, cast: true, items: [] },
    pine: { geo: buildPine(), colliderR: 0.4, cast: false, items: [] },
  };

  const rng = mulberry32(2026);
  const cell = quality === 'low' ? 9 : quality === 'medium' ? 7 : 6;
  let idCounter = 0;
  const place = (name: keyof typeof species, x: number, z: number, scale = 1, collide = true) => {
    const sp = species[name]!;
    const y = terrain.heightAt(x, z) - 0.05;
    sp.items.push({ x, y, z, s: scale, r: rng() * Math.PI * 2, tint: 0.88 + rng() * 0.26 });
    if (collide) colliders.circle(`tree:${idCounter++}`, x, z, sp.colliderR * scale);
  };

  // Valley woodland: dense along water and on hills, sparse on open meadow.
  for (let gz = WORLD.minZ + 8; gz < WORLD.maxZ - 8; gz += cell) {
    for (let gx = WORLD.minX + 8; gx < WORLD.maxX - 8; gx += cell) {
      const x = gx + (rng() - 0.5) * cell * 0.85;
      const z = gz + (rng() - 0.5) * cell * 0.85;
      const rr = terrain.valleyRadius(x, z);
      if (rr > 0.97) continue;
      const slope = terrain.slopeAt(x, z);
      if (slope > 0.75) continue;
      if (excl.blocked(x, z)) continue;
      const h = terrain.heightAt(x, z);
      const wd = streamDistance(x, z);
      const forestN = fbm(x / 38 + 10, z / 38 - 20, 3, 44) * 0.5 + 0.5;
      const wet = 1 - smoothstep(4, 30, wd);
      let density = smoothstep(0.5, 0.78, forestN) * 0.9 + wet * 0.35 + smoothstep(4, 12, h) * 0.35;
      // Keep the village meadows open and the fields readable.
      const vd = Math.hypot(x - 4, z - 8);
      density *= smoothstep(26, 58, vd);
      if (rng() > density) continue;
      const pick = rng();
      if (wd < 26 && pick < 0.62) place('alder', x, z, 0.85 + rng() * 0.4);
      else if (h > 3 && pick < 0.75) place('oak', x, z, 0.8 + rng() * 0.45);
      else place(pick < 0.55 ? 'alderYoung' : 'oak', x, z, pick < 0.55 ? 0.8 + rng() * 0.5 : 0.7 + rng() * 0.3);
      if (rng() < 0.12 && wd < 14 && h < 5) {
        // Understory near water: a cluster of young trees.
        place('alderYoung', x + 2 + rng() * 2, z + 1.5, 0.7 + rng() * 0.3);
      }
    }
  }

  // Orchard rows west of the village.
  for (let ox = ORCHARD.x; ox < ORCHARD.x + ORCHARD.w; ox += 5.4) {
    for (let oz = ORCHARD.z; oz < ORCHARD.z + ORCHARD.d; oz += 5.4) {
      if (excl.blocked(ox, oz) && roadWeight(ox, oz) > 0.04) continue;
      if (terrain.carveAt(ox, oz) > 0.02) continue;
      place('orchard', ox + (rng() - 0.5) * 0.5, oz + (rng() - 0.5) * 0.5, 0.9 + rng() * 0.25);
    }
  }

  // A flood-damaged tree beside the sluice and another at the spring channel: visible late-thaw damage.
  place('damaged', 16.5, -63, 1.1);
  place('damaged', -2, -78, 0.95);
  place('damaged', 70, -37, 1.0);

  // Far pines on the mountain flanks (no collision; the slope already stops movement).
  const pineStep = quality === 'low' ? 15 : quality === 'medium' ? 11 : 9;
  for (let gz = WORLD.minZ + 6; gz < WORLD.maxZ - 6; gz += pineStep) {
    for (let gx = WORLD.minX + 6; gx < WORLD.maxX - 6; gx += pineStep) {
      const x = gx + (rng() - 0.5) * pineStep;
      const z = gz + (rng() - 0.5) * pineStep;
      const rr = Math.hypot((x - VALLEY.cx) / VALLEY.rx, (z - VALLEY.cz) / VALLEY.rz);
      if (rr < 0.86) continue;
      if (terrain.slopeAt(x, z) > 1.3) continue;
      const h = terrain.heightAt(x, z);
      if (h > 95) continue;
      if (rng() < 0.28) continue;
      place('pine', x, z, 1.2 + rng() * 1.6, false);
    }
  }

  const trees = new THREE.Group();
  let triangles = 0;
  let treeCount = 0;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (const sp of Object.values(species)) {
    if (sp.items.length === 0) continue;
    const mesh = new THREE.InstancedMesh(sp.geo, treeMat, sp.items.length);
    sp.items.forEach((it, i) => {
      q.setFromAxisAngle(up, it.r);
      p.set(it.x, it.y, it.z);
      s.set(it.s, it.s * (0.94 + (it.tint - 0.88) * 0.3), it.s);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color(it.tint, it.tint * (0.97 + (i % 5) * 0.012), it.tint * 0.96));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = sp.cast;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    trees.add(mesh);
    treeCount += sp.items.length;
    triangles += (sp.geo.attributes.position!.count / 3) * sp.items.length;
  }
  group.add(trees);

  return {
    group,
    counts: { trees: treeCount, triangles: Math.round(triangles) },
    update() {},
    stats: () => ({ trees: treeCount, triangles: Math.round(triangles) }),
  };
}
