import * as THREE from 'three';
import { expect, it } from 'vitest';
import { Ctx } from '../../src/presentation/buildKit';
import { benchSet } from '../../src/presentation/props';
import { Region } from '../../src/presentation/regions';
import { mulberry32 } from '../../src/world/noise';
import { Terrain } from '../../src/world/terrain';

const material = new THREE.MeshBasicMaterial();
function bench(x: number, z: number, yaw: number, height: (x: number, z: number) => number, grounded: boolean) {
  const r = new Region('bench', new Ctx());
  benchSet(r, mulberry32(6600), x, height(x, z), z, yaw, grounded ? height : undefined);
  const g = r.toGroup({ get: () => material }); g.updateMatrixWorld(true); return g;
}
function dispose(g: THREE.Group) { g.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); }); }
it('grounds both feet of the actual sloping village bench without moving its seat', () => {
  const t = new Terrain(), height = (x: number, z: number) => t.heightAt(x, z), x = 44, z = 32.4, yaw = 1;
  const before = bench(x, z, yaw, height, false), after = bench(x, z, yaw, height, true);
  try {
    const foot = (g: THREE.Group, side: number) => {
      const px = x + side * .78 * Math.cos(yaw), pz = z - side * .78 * Math.sin(yaw), ground = height(px, pz);
      const hit = new THREE.Raycaster(new THREE.Vector3(px, ground - 2, pz), new THREE.Vector3(0, 1, 0)).intersectObject(g)[0]!;
      return hit.point.y - ground;
    };
    expect(foot(before, 1)).toBeGreaterThan(.17);
    expect(foot(after, 1)).toBeLessThan(0);
    expect(foot(after, -1)).toBeLessThan(0);
    const seat = (g: THREE.Group) => new THREE.Raycaster(new THREE.Vector3(x, height(x, z) + 2, z), new THREE.Vector3(0, -1, 0)).intersectObject(g)[0]!.point.y;
    expect(seat(after)).toBe(seat(before));
    expect((after.getObjectByName('bench:planks') as THREE.Mesh).geometry.getAttribute('position').array).toEqual((before.getObjectByName('bench:planks') as THREE.Mesh).geometry.getAttribute('position').array);
  } finally { dispose(before); dispose(after); }
});
it('preserves flat-ground and indoor geometry and reaches soil across rotated slopes', () => {
  const legacy = bench(0, 0, 0, () => 0, false), flat = bench(0, 0, 0, () => 0, true);
  try { for (const name of ['bench:planks', 'bench:timber']) {
    const a = legacy.getObjectByName(name) as THREE.Mesh, b = flat.getObjectByName(name) as THREE.Mesh;
    for (const key of Object.keys(a.geometry.attributes)) expect(b.geometry.getAttribute(key).array).toEqual(a.geometry.getAttribute(key).array);
  }} finally { dispose(legacy); dispose(flat); }
  for (const yaw of [0, .7, 1.5, 2.8]) for (const slope of [-.4, .2, .4]) {
    const height = (x: number, z: number) => x * slope + z * .15, g = bench(0, 0, yaw, height, true);
    try { for (const side of [-1, 1]) for (const dx of [-.05, 0, .05]) for (const dz of [-.17, 0, .17]) {
      const lx = side * .78 + dx, px = lx * Math.cos(yaw) + dz * Math.sin(yaw), pz = -lx * Math.sin(yaw) + dz * Math.cos(yaw), ground = height(px, pz);
      const hit = new THREE.Raycaster(new THREE.Vector3(px, ground - 2, pz), new THREE.Vector3(0, 1, 0)).intersectObject(g)[0];
      expect(hit).toBeDefined(); expect(hit!.point.y).toBeLessThanOrEqual(ground + 1e-6);
    }} finally { dispose(g); }
  }
});
