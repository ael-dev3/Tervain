import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Ctx } from '../../src/presentation/buildKit';
import { CAMERA_CLEARANCE } from '../../src/presentation/cameraObstruction';
import { CameraRig } from '../../src/presentation/cameraRig';
import { well } from '../../src/presentation/props';
import { Region } from '../../src/presentation/regions';
import { Colliders, buildStaticColliders } from '../../src/world/colliders';
import { WELL, WELL_CONSTRUCTION as W } from '../../src/world/layout';
import { mulberry32 } from '../../src/world/noise';
import { Terrain } from '../../src/world/terrain';

const terrain = new Terrain(), base = terrain.heightAt(WELL.x, WELL.z);
const authored = buildStaticColliders(terrain);
const colliders = new Colliders();
for (const c of authored.all.filter((shape) => shape.id.startsWith('well'))) colliders.add({ ...c });

describe('finite well structure collision', () => {
  it('registers the real posts, beam and pitched hood without filling the open air above the ring', () => {
    const x = WELL.x, z = WELL.z;
    expect(colliders.blocked(x, z, 0.15, { minY: base + 1.25, maxY: base + 2.15 })).toBe(false);
    expect(colliders.blocked(x, z, 0.15, { minY: base + W.hoodBottom + 0.1, maxY: base + W.hoodBottom + 0.2 })).toBe(true);
    for (const side of [-1, 1]) {
      const px = x + side * W.postX * Math.cos(W.yaw), pz = z - side * W.postX * Math.sin(W.yaw);
      expect(colliders.blocked(px, pz, 0.05, { minY: base + 1.4, maxY: base + 1.5 })).toBe(true);
    }
    // The outer sloping hood is not a flat prism reaching the ridge at every point.
    const edgeX = x + 1.35 * Math.cos(W.yaw), edgeZ = z - 1.35 * Math.sin(W.yaw);
    expect(colliders.blocked(edgeX, edgeZ, 0.02, { minY: base + 3.1, maxY: base + 3.2 })).toBe(false);
    expect(colliders.all.filter((c) => c.id === 'well')).toHaveLength(1);
    expect(colliders.all.filter((c) => c.id === 'well' && c.maxY! > base + 1.15)).toHaveLength(0);
  });

  it('shortens the camera before the actual rendered hood and restores its boom when the hood no longer intersects', () => {
    const region = new Region('well-contact', new Ctx());
    well(region, mulberry32(7), WELL.x, base, WELL.z, W.yaw);
    const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
    const group = region.toGroup({ get: () => material }); group.updateMatrixWorld(true);
    const hood = group.getObjectByName('well-contact:thatch')!;
    const ground = { groundAt: () => base };
    const player = new THREE.Vector3(WELL.x, base, WELL.z + 5);
    const pivot = player.clone(); pivot.y += 1.55;
    const free = new CameraRig(); free.follow(1 / 60, player.x, player.y, player.z, ground, new Colliders(), true, 0);
    const vector = free.camera.position.clone().sub(pivot), direction = vector.clone().normalize();
    const first = new THREE.Raycaster(pivot, direction, 0, vector.length()).intersectObject(hood)[0];
    expect(first).toBeDefined();
    const camera = new CameraRig(); camera.follow(1 / 60, player.x, player.y, player.z, ground, colliders, true, 0);
    const distance = camera.camera.position.distanceTo(pivot);
    expect(distance).toBeLessThan(first!.distance - CAMERA_CLEARANCE * 0.5);
    expect(distance).toBeGreaterThan(1.5);
    const original = camera.camera.position.clone();
    camera.follow(1 / 60, player.x, player.y, player.z, ground, colliders, true, 0);
    expect(camera.camera.position.equals(original)).toBe(true);
    camera.lookAtYaw(Math.PI);
    camera.follow(1 / 60, player.x, player.y, player.z, ground, colliders, true, 0);
    expect(camera.camera.position.distanceTo(pivot)).toBeGreaterThan(distance);
    for (let i = 0; i < 180; i++) camera.follow(1 / 60, player.x, player.y, player.z, ground, colliders, true, 0);
    expect(camera.camera.position.distanceTo(pivot)).toBeGreaterThan(5.35);
    group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); material.dispose();
  });

  it('uses the authored yaw without shifting any later random prop appearance', () => {
    const legacy = mulberry32(18), shared = mulberry32(18);
    well(new Region('legacy', new Ctx()), legacy, 0, 0, 0);
    well(new Region('shared', new Ctx()), shared, 0, 0, 0, W.yaw);
    expect(shared()).toBe(legacy());
  });
});
