import * as THREE from 'three';
import { beforeAll, expect, it } from 'vitest';
import { Ctx } from '../src/presentation/buildKit';
import { Region } from '../src/presentation/regions';
import { fence } from '../src/presentation/props';
import { captureProjectileGeometry, buildFenceRun } from '../src/presentation/fenceContacts';
import { mulberry32 } from '../src/world/noise';
import { Colliders } from '../src/world/colliders';
import { initializePhysics, RealmPhysics } from '../src/world/physics';
import type { Terrain } from '../src/world/terrain';
const floor = { nx: 10, nz: 10, vertexX: (i: number) => i * 2 - 10, vertexZ: (i: number) => i * 2 - 10, vertexHeight: () => 0, heightAt: () => 0, groundAt: () => 0 } as unknown as Terrain;
beforeAll(initializePhysics);
it('uses the actual posts/rails for arrows, keeps movement solid and handles pre-step activation', () => {
  const r = new Region('fence', new Ctx()), c = new Colliders();
  buildFenceRun(r, mulberry32(6400), [[0, -2.2], [0, 2.2]], () => 0, c);
  const p = new RealmPhysics(floor, c, []), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), group = r.toGroup({ get: () => material }); group.updateMatrixWorld(true);
  try {
    const from = { x: -1, y: .6, z: 1.1 }, to = { x: 1, y: .6, z: 1.1 };
    expect(new THREE.Raycaster(new THREE.Vector3(-1,.6,1.1),new THREE.Vector3(1,0,0),0,2).intersectObject(group)).toHaveLength(0);
    expect(p.traceProjectile(from, to)).toBeNull(); expect(p.traceProjectile(to, from)).toBeNull();
    expect(c.move(-1,1.1,2,0,.4,undefined,{ minY: .03, maxY: 1.95 }).x).toBeLessThan(-.4);
    const wood = Array.from({ length: 16 }, (_, i) => .3 + i * .04).find(y => new THREE.Raycaster(new THREE.Vector3(-1,y,1.1),new THREE.Vector3(1,0,0),0,2).intersectObject(group).length > 0)!;
    expect(wood).toBeDefined();
    const a = { x: -1, y: wood, z: 1.1 }, b = { x: 1, y: wood, z: 1.1 };
    expect(p.traceProjectile(a,b)).not.toBeNull(); expect(p.traceProjectile(b,a)).not.toBeNull();
    c.setActive('fence',false); expect(p.traceProjectile(a,b)).toBeNull();
    c.setActive('fence',true); expect(p.traceProjectile(a,b)).not.toBeNull(); expect(p.traceProjectile(from,to)).toBeNull();
    let sensors = 0; p.world.colliders.forEach(collider => { if (collider.isSensor()) { sensors++; expect(collider.collisionGroups()).toBe(0); } }); expect(sensors).toBe(1);
  } finally { p.dispose(); group.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); }); material.dispose(); }
});
it('captures only appended triangles with rebased indices across existing material batches', () => {
  const r = new Region('fence', new Ctx());
  r.bark.box(1,1,1,99,0,99,0xffffff);r.timber.box(1,1,1,99,0,99,0xffffff);
  const capture = captureProjectileGeometry(r);
  fence(r,mulberry32(6400),[[0,-2.2],[0,2.2]],()=>0);
  const mesh = capture(); expect(mesh.positions.length).toBeGreaterThan(0);expect(mesh.indices.length).toBeGreaterThan(0);
  expect(Math.max(...mesh.positions)).toBeLessThan(4);
  for (const i of mesh.indices) expect(i).toBeLessThan(mesh.positions.length/3);
  const original = mesh.positions.slice();r.bark.box(1,1,1,50,0,50,0xffffff);expect(mesh.positions).toEqual(original);
});
