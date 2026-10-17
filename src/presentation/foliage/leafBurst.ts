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
  grounded: boolean;
  size: number;
  ground: number;
  supportSettled: number;
  supportScale: number;
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
  const leaves: Leaf[] = Array.from({ length: LEAF_BURST_POOL }, () => ({ alive: false, x: 0, y: 0, z: 0, vx: 0, vz: 0, fall: 0, spin: 0, phase: 0, age: 0, landed: 0, grounded: false, size: 1, ground: 0, supportSettled: -1, supportScale: -1 }));
  const geometry = leafGeometry();
  const positions = geometry.getAttribute('position'), vertex = new THREE.Vector3();
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geometry, material, LEAF_BURST_POOL);
  mesh.name = 'struck-tree-leaves';
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.visible = false;
  mesh.castShadow = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const colour = new THREE.Color();
  for (let i = 0; i < LEAF_BURST_POOL; i++) mesh.setColorAt(i, colour.setRGB(0.42 + rng() * 0.2, 0.5 + rng() * 0.15, 0.22 + rng() * 0.1));
  const matrix = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
  let active = 0;
  let matricesInitialized = false;
  let pendingRelease = false;
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
        leaf.grounded = false;
        leaf.size = 0.12 + rng() * 0.06;
        leaf.supportSettled = -1;
        leaf.supportScale = -1;
        released++;
      }
      if (released > 0) pendingRelease = true;
      return released;
    },
    update(dt, enabled) {
      if (disposed) return;
      reducedMotion = enabled;
      if (active === 0 && !pendingRelease) return;
      const step = reducedMotion || !Number.isFinite(dt) ? 0 : Math.min(Math.max(dt, 0), 0.1);
      // No state advances at zero dt, but a newly queued release still needs its first pose.
      if (step === 0 && !pendingRelease) return;
      pendingRelease = false;
      const dir = wind?.direction ?? [1, 0];
      let n = 0, drawCount = 0;
      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i]!;
        if (!leaf.alive) {
          if (!matricesInitialized) mesh.setMatrixAt(i, ZERO);
          continue;
        }
        if (step > 0) {
          leaf.age += step;
          if (!leaf.grounded) {
            // Carried by the gust at the leaf, slowing toward the air's own speed; fluttering as it falls.
            const push = wind ? wind.pushAt(leaf.x, leaf.z) : 0.3;
            const k = 1 - Math.exp(-step * 1.5);
            leaf.vx += (dir[0] * push * 2.2 - leaf.vx) * k;
            leaf.vz += (dir[1] * push * 2.2 - leaf.vz) * k;
            leaf.x += (leaf.vx + Math.sin(leaf.age * 2.3 + leaf.phase) * 0.35) * step;
            leaf.z += (leaf.vz + Math.cos(leaf.age * 1.9 + leaf.phase) * 0.3) * step;
            leaf.y -= leaf.fall * (0.75 + 0.5 * Math.sin(leaf.age * 3.1 + leaf.phase) ** 2) * step;
            const ground = terrain.heightAt(leaf.x, leaf.z) + 0.03;
            leaf.ground = ground;
            if (leaf.y <= ground) { leaf.y = ground; leaf.grounded = true; leaf.landed = step; }
          } else leaf.landed += step;
          if (leaf.landed > 4) leaf.alive = false;
        }
        if (!leaf.alive) { mesh.setMatrixAt(i, ZERO); continue; }
        n++; drawCount = i + 1;
        const settled = Math.min(1, leaf.landed / 0.4);
        euler.set((0.6 + Math.sin(leaf.age * 2.0 + leaf.phase) * 0.6) * (1 - settled), leaf.phase + leaf.age * leaf.spin * (1 - settled), Math.sin(leaf.age * 1.4 + leaf.phase) * 0.5 * (1 - settled));
        quat.setFromEuler(euler);
        // Fades away over the last second on the ground.
        const size = leaf.size * (leaf.landed > 3 ? Math.max(0.01, 4 - leaf.landed) : 1);
        scl.setScalar(size);
        if ((!leaf.grounded && step > 0) || (leaf.grounded && (leaf.supportSettled !== settled || leaf.supportScale !== size))) {
          // The centre alone can be above soil while the folded/tilted leaf cuts through it.
          // Re-seat each changed contact pose; reuse the support while settled or motion is held.
          let support = leaf.ground;
          for (let v = 0; v < positions.count; v++) {
            vertex.fromBufferAttribute(positions, v).multiplyScalar(size).applyQuaternion(quat);
            support = Math.max(support, terrain.heightAt(leaf.x + vertex.x, leaf.z + vertex.z) - vertex.y + 0.012);
          }
          if (leaf.grounded || leaf.y <= support) {
            leaf.y = support;
            if (!leaf.grounded) { leaf.grounded = true; leaf.landed = 0; }
            leaf.supportSettled = settled;
            leaf.supportScale = size;
          }
        }
        pos.set(leaf.x, leaf.y, leaf.z);
        matrix.compose(pos, quat, scl);
        mesh.setMatrixAt(i, matrix);
      }
      matricesInitialized = true;
      active = n;
      mesh.count = drawCount;
      mesh.visible = n > 0;
      // Slots after the last living leaf collapse to zero and are never sampled by this draw.
      mesh.instanceMatrix.clearUpdateRanges();
      mesh.instanceMatrix.addUpdateRange(0, Math.max(1, drawCount) * 16);
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
