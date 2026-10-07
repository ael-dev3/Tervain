import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';
import type { GrassWind } from '../grass/wind';

/**
 * Leaves knocked loose when something strikes a tree (an arrow in the trunk). A small pool: each leaf falls from the
 * crown fluttering, is carried downwind by the gusts the grass shows (the wind's CPU mirror), settles on the ground and
 * fades. Reduced Motion holds them where they are and releases no more.
 */

export const LEAF_BURST_POOL = 48;
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

interface Leaf {
  alive: boolean;
  x: number; y: number; z: number;
  vx: number; vz: number;
  fall: number;
  spin: number;
  phase: number;
  age: number;
  landed: number;
  size: number;
}

export interface LeafBurst {
  readonly mesh: THREE.InstancedMesh;
  /** Release `count` leaves from a crown centred at (x, y, z) with the given radius. */
  release(x: number, y: number, z: number, radius: number, count: number): number;
  /** Apply the current motion preference before a release, independently of wind strength. */
  setReducedMotion(reducedMotion: boolean): void;
  update(dt: number, reducedMotion: boolean): void;
  readonly active: number;
  dispose(): void;
}

function leafGeometry(): THREE.BufferGeometry {
  // A small leaf folded along its midrib: two triangles each side of the vein.
  const p = [0, 0, -0.5, 0.22, 0.05, -0.05, 0, 0, 0.5, -0.22, 0.05, -0.05, 0, -0.03, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setIndex([0, 1, 4, 4, 1, 2, 0, 4, 3, 4, 2, 3]);
  g.computeVertexNormals();
  return g;
}

export function createLeafBurst(terrain: { heightAt(x: number, z: number): number }, wind: GrassWind | null, seed = 7177, initialReducedMotion = false): LeafBurst {
  const rng = mulberry32(seed);
  const leaves: Leaf[] = Array.from({ length: LEAF_BURST_POOL }, () => ({ alive: false, x: 0, y: 0, z: 0, vx: 0, vz: 0, fall: 0, spin: 0, phase: 0, age: 0, landed: 0, size: 1 }));
  const geometry = leafGeometry();
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geometry, material, LEAF_BURST_POOL);
  mesh.name = 'struck-tree-leaves';
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.castShadow = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const colour = new THREE.Color();
  for (let i = 0; i < LEAF_BURST_POOL; i++) mesh.setColorAt(i, colour.setRGB(0.42 + rng() * 0.2, 0.5 + rng() * 0.15, 0.22 + rng() * 0.1));
  const matrix = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
  let active = 0;
  let disposed = false;
  let reducedMotion = initialReducedMotion;
  return {
    mesh,
    get active() { return active; },
    setReducedMotion(enabled) {
      if (!disposed) reducedMotion = enabled;
    },
    release(x, y, z, radius, count) {
      if (disposed || reducedMotion || ![x, y, z, radius, count].every(Number.isFinite)) return 0;
      let released = 0;
      for (const leaf of leaves) {
        if (released >= count) break;
        if (leaf.alive) continue;
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * radius;
        leaf.alive = true;
        leaf.x = x + Math.cos(a) * r; leaf.z = z + Math.sin(a) * r; leaf.y = y + (rng() - 0.3) * radius * 0.6;
        leaf.vx = Math.cos(a) * 0.25; leaf.vz = Math.sin(a) * 0.25;
        leaf.fall = 0.45 + rng() * 0.35;
        leaf.spin = (rng() - 0.5) * 3;
        leaf.phase = rng() * Math.PI * 2;
        leaf.age = 0;
        leaf.landed = 0;
        leaf.size = 0.12 + rng() * 0.06;
        released++;
      }
      return released;
    },
    update(dt, enabled) {
      if (disposed) return;
      reducedMotion = enabled;
      const step = reducedMotion || !Number.isFinite(dt) ? 0 : Math.min(Math.max(dt, 0), 0.1);
      const dir = wind?.direction ?? [1, 0];
      let n = 0;
      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i]!;
        if (!leaf.alive) { mesh.setMatrixAt(i, ZERO); continue; }
        if (step > 0) {
          leaf.age += step;
          if (leaf.landed <= 0) {
            // Carried by the gust at the leaf, slowing toward the air's own speed; fluttering as it falls.
            const push = wind ? wind.pushAt(leaf.x, leaf.z) : 0.3;
            const k = 1 - Math.exp(-step * 1.5);
            leaf.vx += (dir[0] * push * 2.2 - leaf.vx) * k;
            leaf.vz += (dir[1] * push * 2.2 - leaf.vz) * k;
            leaf.x += (leaf.vx + Math.sin(leaf.age * 2.3 + leaf.phase) * 0.35) * step;
            leaf.z += (leaf.vz + Math.cos(leaf.age * 1.9 + leaf.phase) * 0.3) * step;
            leaf.y -= leaf.fall * (0.75 + 0.5 * Math.sin(leaf.age * 3.1 + leaf.phase) ** 2) * step;
            const ground = terrain.heightAt(leaf.x, leaf.z) + 0.03;
            if (leaf.y <= ground) { leaf.y = ground; leaf.landed = step; }
          } else leaf.landed += step;
          if (leaf.landed > 4) leaf.alive = false;
        }
        if (!leaf.alive) { mesh.setMatrixAt(i, ZERO); continue; }
        n++;
        const settled = Math.min(1, leaf.landed / 0.4);
        euler.set((0.6 + Math.sin(leaf.age * 2.0 + leaf.phase) * 0.6) * (1 - settled), leaf.phase + leaf.age * leaf.spin * (1 - settled), Math.sin(leaf.age * 1.4 + leaf.phase) * 0.5 * (1 - settled));
        quat.setFromEuler(euler);
        pos.set(leaf.x, leaf.y, leaf.z);
        // Fades away over the last second on the ground.
        scl.setScalar(leaf.size * (leaf.landed > 3 ? Math.max(0.01, 4 - leaf.landed) : 1));
        matrix.compose(pos, quat, scl);
        mesh.setMatrixAt(i, matrix);
      }
      active = n;
      mesh.count = n > 0 ? LEAF_BURST_POOL : 0;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mesh.dispose();
      geometry.dispose();
      material.dispose();
      mesh.removeFromParent();
    },
  };
}
