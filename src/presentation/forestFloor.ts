import * as THREE from 'three';
import { deepwoodCover } from '../world/forest';
import { WORLD } from '../world/layout';
import { mulberry32 } from '../world/noise';
import { realmRadius, type Terrain } from '../world/terrain';
import type { Exclusions } from './vegetation';
import type { Quality, SceneModule } from './context';
import { barkTextures } from './treeTextures';

export type ForestFloorKind = 'fern' | 'moss' | 'litter' | 'log' | 'fungi';
export interface ForestFloorPiece { kind: ForestFloorKind; x: number; y: number; z: number; nx: number; nz: number; yaw: number; scale: number; rank: number; variant: number }

/** Authored once, then graphics settings thin only nonblocking ankle-height detail. */
export function createForestFloorPopulation(terrain: Pick<Terrain, 'heightAt' | 'slopeAt' | 'carveAt'>, exclusions: Pick<Exclusions, 'blocked'>): ForestFloorPiece[] {
  const rnd = mulberry32(50419);
  const out: ForestFloorPiece[] = [];
  const put = (kind: ForestFloorKind, x: number, z: number, scale: number, variant: number) => {
    if (realmRadius(x, z) > 0.97 || terrain.heightAt(x, z) < 0.35 || terrain.carveAt(x, z) > 0.01 || terrain.slopeAt(x, z) > 0.62 || exclusions.blocked(x, z, kind === 'log' ? 2.6 : 0.45)) return;
    if (kind === 'log' && terrain.slopeAt(x, z) > 0.22) return;
    const rank = mulberry32(Math.imul(Math.round(x * 100), 71303) ^ Math.imul(Math.round(z * 100), 31231))();
    const nx = (terrain.heightAt(x - 0.4, z) - terrain.heightAt(x + 0.4, z)) / 0.8;
    const nz = (terrain.heightAt(x, z - 0.4) - terrain.heightAt(x, z + 0.4)) / 0.8;
    out.push({ kind, x, y: terrain.heightAt(x, z), z, nx, nz, yaw: rnd() * Math.PI * 2, scale, rank, variant });
  };
  // Clumps leave changing gaps rather than a uniform lawn; the forest and the playable trail share one habitat mask.
  const step = 4.8;
  for (let gz = WORLD.minZ + 5; gz < WORLD.maxZ - 5; gz += step) {
    for (let gx = WORLD.minX + 5; gx < WORLD.maxX - 5; gx += step) {
      const x = gx + (rnd() - 0.5) * step * 0.8;
      const z = gz + (rnd() - 0.5) * step * 0.8;
      const cover = deepwoodCover(x, z);
      if (cover < 0.1 || rnd() > cover * 0.76) continue;
      put('fern', x, z, 0.72 + rnd() * 0.65, Math.floor(rnd() * 3));
      if (rnd() < 0.28) put('moss', x + 0.8, z - 0.55, 0.6 + rnd() * 0.8, 0);
      if (rnd() < 0.4) put('litter', x - 1, z + 1, 0.85 + rnd() * 0.75, Math.floor(rnd() * 2));
      if (rnd() < 0.045) put('log', x + 1.4, z - 1.8, 0.65 + rnd() * 0.65, Math.floor(rnd() * 2));
      if (rnd() < 0.1) put('fungi', x - 0.55, z - 0.8, 0.7 + rnd() * 0.6, 0);
    }
  }
  return out;
}

export function selectForestFloorPopulation(population: readonly ForestFloorPiece[], quality: Quality): ForestFloorPiece[] {
  const keep = quality === 'low' ? 0.38 : quality === 'medium' ? 0.68 : 1;
  return population.filter((p) => p.rank < keep);
}

class FloorGeometry {
  pos: number[] = [];
  color: number[] = [];
  idx: number[] = [];
  vertex(x: number, y: number, z: number, c: THREE.Color) {
    this.pos.push(x, y, z);
    this.color.push(c.r, c.g, c.b);
    return this.pos.length / 3 - 1;
  }
  tri(a: number, b: number, c: number) { this.idx.push(a, b, c); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.color, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

/** Broad, curved fronds with real tapered leaflets. Each leaflet shares a root on its parent's continuous midrib. */
export function buildForestFernGeometry(variant: number): THREE.BufferGeometry {
  const a = new FloorGeometry();
  const rnd = mulberry32(2101 + variant * 139);
  const fronds = 7;
  for (let f = 0; f < fronds; f++) {
    const az = f * Math.PI * 2 / fronds + (rnd() - 0.5) * 0.48;
    const length = 0.9 + rnd() * 0.55;
    const height = 0.5 + rnd() * 0.34;
    const direction = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    const side = new THREE.Vector3(-direction.z, 0, direction.x);
    const at = (t: number) => direction.clone().multiplyScalar(length * t).setY(0.07 + Math.sin(t * Math.PI * 0.8) * height);
    let last: [number, number] | null = null;
    const stem = new THREE.Color('#50673a');
    for (let s = 0; s <= 8; s++) {
      const p = at(s / 8);
      const w = 0.015 * (1 - s / 10);
      const left = p.clone().addScaledVector(side, -w);
      const right = p.clone().addScaledVector(side, w);
      const ring: [number, number] = [a.vertex(left.x, left.y, left.z, stem), a.vertex(right.x, right.y, right.z, stem)];
      if (last) { a.tri(last[0], last[1], ring[0]); a.tri(last[1], ring[1], ring[0]); }
      last = ring;
    }
    for (let l = 1; l <= 7; l++) {
      const t = l / 8;
      const root = at(t);
      const span = Math.sin(Math.PI * t) * (0.24 + rnd() * 0.1);
      for (const sign of [-1, 1]) {
        const tip = root.clone().addScaledVector(side, span * sign).addScaledVector(direction, span * 0.6);
        tip.y -= span * 0.18;
        const mid = root.clone().lerp(tip, 0.55);
        mid.y += 0.026;
        const shade = new THREE.Color().setHSL(0.245 + rnd() * 0.06, 0.3 + rnd() * 0.13, 0.25 + rnd() * 0.11, THREE.SRGBColorSpace);
        const base = a.vertex(root.x, root.y, root.z, shade);
        const left = mid.clone().addScaledVector(direction, -0.055 * Math.sin(Math.PI * t));
        const right = mid.clone().addScaledVector(direction, 0.055 * Math.sin(Math.PI * t));
        const li = a.vertex(left.x, left.y, left.z, shade.clone().multiplyScalar(0.87));
        const mi = a.vertex(mid.x, mid.y, mid.z, shade.clone().multiplyScalar(1.1));
        const ri = a.vertex(right.x, right.y, right.z, shade);
        const ti = a.vertex(tip.x, tip.y, tip.z, shade.clone().multiplyScalar(1.18));
        a.tri(base, li, mi); a.tri(base, mi, ri); a.tri(li, ti, mi); a.tri(mi, ti, ri);
      }
    }
  }
  return a.geometry();
}

export function buildForestLitterGeometry(variant: number): THREE.BufferGeometry {
  const a = new FloorGeometry();
  const rnd = mulberry32(5101 + variant * 103);
  for (let i = 0; i < 13; i++) {
    const az = rnd() * Math.PI * 2;
    const x = (rnd() - 0.5) * 1.4;
    const z = (rnd() - 0.5) * 1.4;
    const length = 0.09 + rnd() * 0.13;
    const wid = length * 0.48;
    const dx = Math.cos(az), dz = Math.sin(az);
    const c = new THREE.Color().setHSL(0.083 + rnd() * 0.07, 0.22 + rnd() * 0.17, 0.2 + rnd() * 0.14, THREE.SRGBColorSpace);
    const root = a.vertex(x, 0.024, z, c);
    const left = a.vertex(x + dx * length * 0.5 - dz * wid, 0.035, z + dz * length * 0.5 + dx * wid, c);
    const ridge = a.vertex(x + dx * length * 0.5, 0.052, z + dz * length * 0.5, c.clone().multiplyScalar(1.14));
    const right = a.vertex(x + dx * length * 0.5 + dz * wid, 0.035, z + dz * length * 0.5 - dx * wid, c);
    const tip = a.vertex(x + dx * length, 0.024, z + dz * length, c);
    a.tri(root, left, ridge); a.tri(root, ridge, right); a.tri(left, tip, ridge); a.tri(ridge, tip, right);
  }
  return a.geometry();
}

function colorGeometry(g: THREE.BufferGeometry, base: THREE.Color): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  const color: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const c = base.clone().multiplyScalar(0.82 + Math.max(0, y) * 0.55);
    color.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  return g;
}

function floorGeometry(kind: ForestFloorKind, variant: number) {
  if (kind === 'fern') return buildForestFernGeometry(variant);
  if (kind === 'litter') return buildForestLitterGeometry(variant);
  if (kind === 'moss') {
    const g = new THREE.IcosahedronGeometry(0.52, 1);
    g.scale(1.45, 0.38, 1);
    g.translate(0, 0.045, 0);
    return colorGeometry(g, new THREE.Color('#4e653d'));
  }
  if (kind === 'log') {
    const g = new THREE.CylinderGeometry(0.14, 0.22, variant ? 2.5 : 3.3, 7, 2, false);
    g.rotateZ(Math.PI / 2);
    g.translate(0, 0.12, 0);
    return colorGeometry(g, new THREE.Color('#e0d9bb'));
  }
  // A tight three-cap cluster on the damp forest floor, each with a full stem and underside.
  const a = new FloorGeometry();
  const capColor = new THREE.Color('#b49a70');
  const stemColor = new THREE.Color('#9a9079');
  for (let n = 0; n < 3; n++) {
    const x = (n - 1) * 0.16;
    const z = n === 1 ? 0.14 : -0.06;
    const h = 0.12 + n * 0.02;
    const apex = a.vertex(x, h + 0.055, z, capColor.clone().multiplyScalar(1.18));
    const underside = a.vertex(x, h - 0.018, z, stemColor);
    const rings: number[] = [];
    for (let k = 0; k < 7; k++) {
      const az = k * Math.PI * 2 / 7;
      rings.push(a.vertex(x + Math.cos(az) * 0.095, h, z + Math.sin(az) * 0.095, capColor));
    }
    for (let k = 0; k < 7; k++) { a.tri(apex, rings[k]!, rings[(k + 1) % 7]!); a.tri(underside, rings[(k + 1) % 7]!, rings[k]!); }
    const bottom: number[] = [], top: number[] = [];
    for (let k = 0; k < 5; k++) {
      const az = k * Math.PI * 2 / 5;
      bottom.push(a.vertex(x + Math.cos(az) * 0.02, -0.01, z + Math.sin(az) * 0.02, stemColor));
      top.push(a.vertex(x + Math.cos(az) * 0.015, h - 0.015, z + Math.sin(az) * 0.015, stemColor));
    }
    for (let k = 0; k < 5; k++) {
      const next = (k + 1) % 5;
      a.tri(bottom[k]!, bottom[next]!, top[k]!); a.tri(bottom[next]!, top[next]!, top[k]!);
    }
  }
  return a.geometry();
}

/** Native forest detail shares flora ownership and disposal. No collider is needed for these low, nonblocking pieces. */
export function buildForestFloor(terrain: Terrain, exclusions: Exclusions, quality: Quality): SceneModule {
  const population = createForestFloorPopulation(terrain, exclusions);
  const pieces = selectForestFloorPopulation(population, quality);
  const group = new THREE.Group();
  group.name = 'deepwood_forest_floor';
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1, metalness: 0 });
  // Bark textures are shared with the tree module and released by flora's texture owner after this module disposes.
  const bark = barkTextures('dead');
  const logMaterial = new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normal, vertexColors: true, roughness: 1, metalness: 0 });
  const batches = new Map<string, ForestFloorPiece[]>();
  for (const p of pieces) {
    const key = `${p.kind}:${p.variant}`;
    const batch = batches.get(key) ?? [];
    batch.push(p);
    batches.set(key, batch);
  }
  const owned: { geometry: THREE.BufferGeometry; mesh: THREE.InstancedMesh; pieces: ForestFloorPiece[] }[] = [];
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), normal = new THREE.Vector3(), yaw = new THREE.Quaternion(), col = new THREE.Color();
  for (const [key, batch] of batches) {
    const first = batch[0]!;
    const geometry = floorGeometry(first.kind, first.variant);
    const mesh = new THREE.InstancedMesh(geometry, first.kind === 'log' ? logMaterial : material, batch.length);
    mesh.name = `forest_floor_${key}`;
    mesh.receiveShadow = true;
    mesh.castShadow = quality === 'high' && first.kind === 'fern';
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.setColorAt(0, col.setScalar(1));
    owned.push({ geometry, mesh, pieces: batch });
    group.add(mesh);
  }
  let disposed = false, elapsed = 1, visible = 0;
  const lastCamera = new THREE.Vector3(1e9, 0, 0);
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), sphere = new THREE.Sphere();
  const limit = quality === 'low' ? 56 : quality === 'medium' ? 92 : 128;
  return {
    group,
    update(dt, f) {
      if (disposed) return;
      elapsed += dt;
      if (elapsed < 0.16 && f.camera.position.distanceTo(lastCamera) < 1.5) return;
      elapsed = 0;
      lastCamera.copy(f.camera.position);
      f.camera.updateMatrixWorld();
      pv.multiplyMatrices(f.camera.projectionMatrix, f.camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(pv);
      visible = 0;
      for (const b of owned) {
        let count = 0;
        for (const p of b.pieces) {
          if (Math.hypot(p.x - f.camera.position.x, p.z - f.camera.position.z) > limit) continue;
          sphere.center.set(p.x, p.y + 0.35, p.z);
          sphere.radius = p.kind === 'log' ? 2.5 * p.scale : 1.8 * p.scale;
          if (!frustum.intersectsSphere(sphere)) continue;
          position.set(p.x, p.y, p.z);
          normal.set(p.nx, 1, p.nz).normalize();
          rotation.setFromUnitVectors(up, normal).multiply(yaw.setFromAxisAngle(up, p.yaw));
          scale.setScalar(p.scale);
          matrix.compose(position, rotation, scale);
          b.mesh.setMatrixAt(count, matrix);
          b.mesh.setColorAt(count, col.setScalar(0.85 + p.rank * 0.23));
          count++;
        }
        b.mesh.count = count;
        b.mesh.instanceMatrix.needsUpdate = true;
        if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
        visible += count;
      }
    },
    stats: () => ({ forestFloorPieces: pieces.length, forestFloorDrawn: visible }),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { geometry, mesh } of owned) { mesh.dispose(); geometry.dispose(); }
      material.dispose();
      logMaterial.dispose();
      group.clear();
    },
  };
}
