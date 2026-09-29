import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SPRING_POOL, WORLD } from '../world/layout';
import { clamp, fbm, mulberry32, smoothstep } from '../world/noise';
import { roadWeight } from '../world/terrain';
import { PAL, paint, transform } from './kit';
import type { BuildContext, SceneModule } from './context';
import { makeSwayMaterial, streamDistance, withSway } from './vegetation';
import type { AssetNeed } from './assets/library';

/** Assets this module wants loaded before the world is built. */
export const NEEDS: AssetNeed[] = [];

function buildGrassTuft(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const rng = mulberry32(3);
  const cBase = new THREE.Color(0x56763a);
  const cTip = new THREE.Color(0xa6c264);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI + rng() * 0.6;
    const h = 0.42 + rng() * 0.45;
    const w = 0.07 + rng() * 0.04;
    const ox = (rng() - 0.5) * 0.22;
    const oz = (rng() - 0.5) * 0.22;
    const g = new THREE.BufferGeometry();
    const lean = (rng() - 0.5) * 0.2;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, lean, h, 0.02], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute([cBase.r, cBase.g, cBase.b, cBase.r, cBase.g, cBase.b, cTip.r, cTip.g, cTip.b], 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute([0, 0, 1], 1));
    g.rotateY(a);
    g.translate(ox, 0, oz);
    parts.push(g);
  }
  return mergeGeometries(parts, false)!;
}

function buildReedTuft(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const rng = mulberry32(8);
  const cBase = new THREE.Color(0x4c6a30);
  const cTip = new THREE.Color(PAL.reed);
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI;
    const h = 1.5 + rng() * 1.0;
    const w = 0.06;
    const g = new THREE.BufferGeometry();
    const lean = (rng() - 0.5) * 0.5;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, lean, h, 0.02], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute([cBase.r, cBase.g, cBase.b, cBase.r, cBase.g, cBase.b, cTip.r, cTip.g, cTip.b], 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute([0, 0, 1.1], 1));
    g.rotateY(a);
    g.translate((rng() - 0.5) * 0.35, 0, (rng() - 0.5) * 0.35);
    parts.push(g);
    if (i % 2 === 0) {
      // Cattail head attached to the stem tip.
      const head = paint(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 5), 0x5a4030, 0.5);
      transform(head, lean, h - 0.15, 0.02);
      withSway(head, () => 1.1);
      head.rotateY(a);
      head.translate((rng() - 0.5) * 0.02, 0, 0);
      parts.push(head);
    }
  }
  return mergeGeometries(parts, false)!;
}

/** Everything that keeps foliage out of places the player must use. */

/** Grass, reeds and rocks. */
export function buildGroundcover(ctx: BuildContext): SceneModule & { setDensity(scale: number): void; counts: { grass: number; reeds: number; rocks: number; triangles: number } } {
  const { terrain, colliders, quality, sway: uniforms, excl } = ctx;
  const group = new THREE.Group();
  const grassMat = makeSwayMaterial(uniforms, { side: THREE.DoubleSide, flat: false });
  let triangles = 0;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  // Grass: instanced tufts on gentle open ground.
  const grassGeo = buildGrassTuft();
  const grassMax = quality === 'low' ? 9000 : quality === 'medium' ? 16000 : 26000;
  const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassMax);
  let gi = 0;
  const grng = mulberry32(77);
  const gstep = quality === 'low' ? 5.2 : quality === 'medium' ? 3.9 : 3.1;
  for (let gz = WORLD.minZ + 10; gz < WORLD.maxZ - 10 && gi < grassMax; gz += gstep) {
    for (let gx = WORLD.minX + 10; gx < WORLD.maxX - 10 && gi < grassMax; gx += gstep) {
      const x = gx + (grng() - 0.5) * gstep;
      const z = gz + (grng() - 0.5) * gstep;
      if (terrain.valleyRadius(x, z) > 0.94) continue;
      if (terrain.slopeAt(x, z) > 0.65) continue;
      if (roadWeight(x, z) > 0.2 || terrain.carveAt(x, z) > 0.08) continue;
      if (colliders.blocked(x, z, 0.3)) continue;
      const patch = fbm(x / 14, z / 14, 2, 9) * 0.5 + 0.5;
      if (grng() > 0.25 + patch * 0.75) continue;
      // A small cluster per accepted cell so meadows read as grass rather than scattered spikes.
      const cluster = 1 + Math.floor(patch * 3.2);
      for (let c = 0; c < cluster && gi < grassMax; c++) {
        const gx2 = x + (grng() - 0.5) * 2.2;
        const gz2 = z + (grng() - 0.5) * 2.2;
        if (roadWeight(gx2, gz2) > 0.2 || terrain.carveAt(gx2, gz2) > 0.08) continue;
        const sc = 0.55 + grng() * 0.6;
        q.setFromAxisAngle(up, grng() * 6.28);
        p.set(gx2, terrain.heightAt(gx2, gz2) - 0.02, gz2);
        s.set(sc, sc * (0.8 + grng() * 0.6), sc);
        m.compose(p, q, s);
        grassMesh.setMatrixAt(gi, m);
        const t = 0.85 + grng() * 0.3;
        grassMesh.setColorAt(gi, new THREE.Color(t, t * (0.94 + grng() * 0.12), t * 0.9));
        gi++;
      }
    }
  }
  grassMesh.count = gi;
  grassMesh.instanceMatrix.needsUpdate = true;
  if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
  grassMesh.frustumCulled = false;
  grassMesh.receiveShadow = false;
  group.add(grassMesh);
  triangles += (grassGeo.attributes.position!.count / 3) * gi;

  // Reeds along water margins and the wetland.
  const reedGeo = buildReedTuft();
  const reedMesh = new THREE.InstancedMesh(reedGeo, grassMat, 1600);
  let ri = 0;
  const rrng = mulberry32(19);
  for (let k = 0; k < 4000 && ri < 1600; k++) {
    const x = WORLD.minX + rrng() * (WORLD.maxX - WORLD.minX);
    const z = -120 + rrng() * 200;
    if (terrain.valleyRadius(x, z) > 0.9) continue;
    const wd = streamDistance(x, z);
    const nearPool = Math.hypot(x - SPRING_POOL.x, z - SPRING_POOL.z) < SPRING_POOL.r + 6;
    if (!nearPool && !(wd > 3.2 && wd < 6.8)) continue;
    if (terrain.carveAt(x, z) > 0.75) continue;
    if (roadWeight(x, z) > 0.05 || colliders.blocked(x, z, 0.2)) continue;
    if (nearPool && Math.hypot(x - SPRING_POOL.x, z - SPRING_POOL.z) < SPRING_POOL.r * 0.9) continue;
    q.setFromAxisAngle(up, rrng() * 6.28);
    p.set(x, terrain.heightAt(x, z) - 0.05, z);
    const sc = 0.8 + rrng() * 0.6;
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    reedMesh.setMatrixAt(ri++, m);
  }
  reedMesh.count = ri;
  reedMesh.instanceMatrix.needsUpdate = true;
  reedMesh.frustumCulled = false;
  group.add(reedMesh);

  // Rocks: scattered stones, larger ones block movement. A pair narrows the Cut path where the thornback lairs.
  const rockGeo = paint(new THREE.IcosahedronGeometry(1, 0), PAL.rockA, 2.4);
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  const rocks: { x: number; z: number; s: number; block: boolean }[] = [
    { x: 111.5, z: -63.5, s: 2.3, block: true },
    { x: 117.6, z: -56.6, s: 2.1, block: true },
    { x: 108, z: -60, s: 1.4, block: true },
  ];
  const krng = mulberry32(404);
  for (let k = 0; k < 900 && rocks.length < 320; k++) {
    const x = WORLD.minX + krng() * (WORLD.maxX - WORLD.minX);
    const z = WORLD.minZ + krng() * (WORLD.maxZ - WORLD.minZ);
    if (terrain.valleyRadius(x, z) > 0.96) continue;
    const slope = terrain.slopeAt(x, z);
    const wd = streamDistance(x, z);
    const rocky = smoothstep(0.25, 0.6, slope) + (wd < 8 ? 0.35 : 0) + smoothstep(0.55, 0.8, fbm(x / 30, z / 30, 2, 60) * 0.5 + 0.5) * 0.4;
    if (krng() > rocky * 0.5) continue;
    if (excl.blocked(x, z)) continue;
    const big = krng() < 0.14;
    rocks.push({ x, z, s: big ? 1.3 + krng() * 1.2 : 0.3 + krng() * 0.6, block: big });
  }
  const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
  rocks.forEach((r, i) => {
    const y = terrain.heightAt(r.x, r.z);
    q.setFromEuler(new THREE.Euler(krng() * 0.5, krng() * 6.28, krng() * 0.5));
    p.set(r.x, y + r.s * 0.25, r.z);
    s.set(r.s * (1 + krng() * 0.4), r.s * (0.65 + krng() * 0.3), r.s * (1 + krng() * 0.4));
    m.compose(p, q, s);
    rockMesh.setMatrixAt(i, m);
    const t = 0.85 + krng() * 0.3;
    rockMesh.setColorAt(i, new THREE.Color(t, t, t * 0.96));
    if (r.block) colliders.circle(`rock:${i}`, r.x, r.z, r.s * 0.9);
  });
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;
  rockMesh.frustumCulled = false;
  group.add(rockMesh);
  triangles += 20 * rocks.length;

  const setDensity = (scale: number) => {
    grassMesh.count = Math.floor(gi * clamp(scale, 0.2, 1));
  };

  return {
    group,
    setDensity,
    counts: { grass: gi, reeds: ri, rocks: rocks.length, triangles: Math.round(triangles) },
    update() {},
    stats: () => ({ grass: gi, reeds: ri, rocks: rocks.length, triangles: Math.round(triangles) }),
  };
}
