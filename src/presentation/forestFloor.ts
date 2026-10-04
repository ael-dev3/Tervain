import * as THREE from 'three';
import { deepwoodCover, forestClearingCover, forestClearingDistance } from '../world/forest';
import { WORLD } from '../world/layout';
import { fbm, mulberry32, smoothstep } from '../world/noise';
import { realmRadius, type Terrain } from '../world/terrain';
import type { Exclusions } from './vegetation';
import type { Quality, SceneModule } from './context';
import { barkTextures } from './treeTextures';
import { createFloraPopulation, type FloraTree } from './floraPopulation';
import { streamDistance } from './vegetation';
import { attachInstanceDistanceVisibility, smoothDistanceFade, type InstanceDistanceVisibility } from './distanceVisibility';

export type ForestFloorKind = 'fern' | 'moss' | 'litter' | 'log' | 'fungi';
export interface ForestFloorPiece { id: string; kind: ForestFloorKind; x: number; y: number; z: number; nx: number; nz: number; yaw: number; scale: number; rank: number; variant: number; parentLogId?: string }

/** Authored once, then graphics settings thin only nonblocking ankle-height detail. */
export function createForestFloorPopulation(terrain: Pick<Terrain, 'heightAt' | 'slopeAt' | 'carveAt'>, exclusions: Pick<Exclusions, 'blocked'>, trees: readonly FloraTree[] = createFloraPopulation(terrain, exclusions)): ForestFloorPiece[] {
  let rnd = mulberry32(50419);
  const out: ForestFloorPiece[] = [];
  const trunks = trees.filter((t) => t.radius > 0);
  const hash = new Map<string, FloraTree[]>();
  for (const t of trunks) {
    const key = `${Math.floor(t.x / 16)}:${Math.floor(t.z / 16)}`;
    const bucket = hash.get(key) ?? []; bucket.push(t); hash.set(key, bucket);
  }
  const nearby = (x: number, z: number) => {
    const local: FloraTree[] = [];
    for (let i = Math.floor((x - 16) / 16); i <= Math.floor((x + 16) / 16); i++) {
      for (let j = Math.floor((z - 16) / 16); j <= Math.floor((z + 16) / 16); j++) local.push(...(hash.get(`${i}:${j}`) ?? []));
    }
    return local;
  };
  const canopyAt = (x: number, z: number, local: readonly FloraTree[]) => {
    let cover = 0;
    for (const t of local) {
      const reach = (t.sp === 'oak' ? 6.5 : t.sp === 'birch' ? 4 : 4.8) * t.s;
      cover += Math.exp(-((x - t.x) ** 2 + (z - t.z) ** 2) / (reach * reach));
    }
    return 1 - Math.exp(-cover);
  };
  const put = (kind: ForestFloorKind, x: number, z: number, scale: number, variant: number) => {
    if (realmRadius(x, z) > 0.97 || terrain.heightAt(x, z) < 0.35 || terrain.carveAt(x, z) > 0.01 || terrain.slopeAt(x, z) > 0.62 || exclusions.blocked(x, z, kind === 'log' ? 2.6 : 0.45)) return;
    if (kind === 'log' && terrain.slopeAt(x, z) > 0.22) return;
    if (forestClearingDistance(x, z) < (kind === 'log' ? scale * 1.7 : 0.4)) return;
    if (nearby(x, z).some((t) => Math.hypot(t.x - x, t.z - z) < t.radius + (kind === 'log' ? scale * 1.7 + 0.25 : 0.24))) return;
    const rank = mulberry32(Math.imul(Math.round(x * 100), 71303) ^ Math.imul(Math.round(z * 100), 31231))();
    const nx = (terrain.heightAt(x - 0.4, z) - terrain.heightAt(x + 0.4, z)) / 0.8;
    const nz = (terrain.heightAt(x, z - 0.4) - terrain.heightAt(x, z + 0.4)) / 0.8;
    const piece: ForestFloorPiece = { id: `floor:${kind}:${x.toFixed(4)}:${z.toFixed(4)}`, kind, x, y: terrain.heightAt(x, z), z, nx, nz, yaw: rnd() * Math.PI * 2, scale, rank, variant };
    out.push(piece);
    return piece;
  };
  // Clumps leave changing gaps rather than a uniform lawn; the forest and the playable trail share one habitat mask.
  const step = 4.8;
  for (let gz = WORLD.minZ + 5; gz < WORLD.maxZ - 5; gz += step) {
    for (let gx = WORLD.minX + 5; gx < WORLD.maxX - 5; gx += step) {
      // Independent cell streams keep unrelated floor positions fixed when a nearby exclusion changes.
      rnd = mulberry32(50419 ^ Math.imul(Math.round(gx * 10), 71303) ^ Math.imul(Math.round(gz * 10), 31231));
      const x = gx + (rnd() - 0.5) * step * 0.8;
      const z = gz + (rnd() - 0.5) * step * 0.8;
      const cover = deepwoodCover(x, z) * forestClearingCover(x, z);
      if (cover < 0.1) continue;
      const canopy = canopyAt(x, z, nearby(x, z));
      const wet = 1 - smoothstep(5, 32, streamDistance(x, z));
      const colony = smoothstep(-0.35, 0.45, fbm(x / 11, z / 11, 2, 50420));
      if (rnd() < cover * canopy * (0.35 + colony * 0.6 + wet * 0.3)) put('fern', x, z, 0.55 + rnd() * 0.7, Math.floor(rnd() * 3));
      if (rnd() < cover * canopy * (0.15 + wet * 0.3)) put('moss', x + 0.8, z - 0.55, 0.6 + rnd() * 0.8, 0);
      if (rnd() < cover * canopy * 0.65) put('litter', x - 1, z + 1, 0.85 + rnd() * 0.75, Math.floor(rnd() * 2));
      if (rnd() < cover * canopy * 0.05) {
        const log = put('log', x + 1.4, z - 1.8, 0.65 + rnd() * 0.65, Math.floor(rnd() * 2));
        if (log) {
          const fungusScale = 0.7 + rnd() * 0.6;
          // The log lies along local X. Leave room beside its radius and the whole three-cap cluster,
          // including their slope rotations, instead of placing mushrooms inside the timber's axis.
          const offset = 0.35 * log.scale + 0.36 * fungusScale + 0.04;
          const side = log.variant ? -1 : 1;
          const fungus = put('fungi', log.x + Math.sin(log.yaw) * offset * side, log.z + Math.cos(log.yaw) * offset * side, fungusScale, 0);
          if (fungus) { fungus.rank = log.rank; fungus.parentLogId = log.id; }
        }
      }
    }
  }
  return out;
}

export function selectForestFloorPopulation(population: readonly ForestFloorPiece[], quality: Quality): ForestFloorPiece[] {
  const keep = quality === 'low' ? 0.38 : quality === 'medium' ? 0.68 : 1;
  const selected = population.filter((p) => p.rank < keep);
  const logs = new Set(selected.filter((p) => p.kind === 'log').map((p) => p.id));
  return selected.filter((p) => !p.parentLogId || logs.has(p.parentLogId));
}

/** Keep solid forest details at their authored size; reduce distant coverage gradually over a broad band. */
export const FOREST_FLOOR_DISTANCE: Readonly<Record<Quality, { start: number; end: number }>> = {
  high: { start: 112, end: 208 },
  medium: { start: 88, end: 168 },
  low: { start: 64, end: 128 },
};

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
export function buildForestFloor(terrain: Terrain, exclusions: Exclusions, quality: Quality, trees?: readonly FloraTree[]): SceneModule {
  const population = createForestFloorPopulation(terrain, exclusions, trees);
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
  const owned: { geometry: THREE.BufferGeometry; mesh: THREE.InstancedMesh; pieces: ForestFloorPiece[]; transforms: THREE.Matrix4[]; bounds: THREE.Sphere[]; visibility: InstanceDistanceVisibility }[] = [];
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
    const transforms: THREE.Matrix4[] = [], bounds: THREE.Sphere[] = [];
    for (const p of batch) {
      position.set(p.x, p.y, p.z);
      normal.set(p.nx, 1, p.nz).normalize();
      rotation.setFromUnitVectors(up, normal).multiply(yaw.setFromAxisAngle(up, p.yaw));
      scale.setScalar(p.scale);
      matrix.compose(position, rotation, scale);
      transforms.push(matrix.clone());
      if (!geometry.boundingSphere) geometry.computeBoundingSphere();
      const bound = geometry.boundingSphere!.clone().applyMatrix4(matrix);
      bound.radius += 2; // Retain detail just outside the view, so turning does not reveal a stale cull.
      bounds.push(bound);
    }
    owned.push({ geometry, mesh, pieces: batch, transforms, bounds, visibility: attachInstanceDistanceVisibility(mesh) });
    group.add(mesh);
  }
  let disposed = false, visible = 0, sinceRefresh = 1, lastShadowPresent = false;
  const lastCamera = new THREE.Vector3(1e9, 0, 0);
  const lastRotation = new THREE.Quaternion();
  const lastProjection = new THREE.Matrix4();
  const lastShadowFrustum = new THREE.Frustum(), shadowPlaneNormalDelta = new THREE.Vector3();
  const hasCasters = owned.some((b) => b.mesh.castShadow);
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), sphere = new THREE.Sphere();
  const fade = FOREST_FLOOR_DISTANCE[quality];
  return {
    group,
    update(dt, f) {
      if (disposed) return;
      sinceRefresh += dt;
      // Distance coverage and view-edge culling follow every moving frame. Stationary scenes keep their uploads.
      const cameraChanged = f.camera.position.distanceToSquared(lastCamera) >= 1e-12 || Math.abs(f.camera.quaternion.dot(lastRotation)) <= 0.9999999999 || !f.camera.projectionMatrix.equals(lastProjection);
      const shadowPresent = hasCasters && !!f.shadowFrustum;
      const shadowChanged = shadowPresent !== lastShadowPresent || (shadowPresent && !f.shadowFrustum!.planes.every((plane, i) => plane.equals(lastShadowFrustum.planes[i]!)));
      const shadowGuardExceeded = shadowPresent && lastShadowPresent && f.shadowFrustum!.planes.some((plane, i) => {
        const previous = lastShadowFrustum.planes[i]!;
        return Math.abs(plane.constant - previous.constant) + 600 * shadowPlaneNormalDelta.copy(plane.normal).sub(previous.normal).length() > 1;
      });
      // The same two-metre guard used by tree casters lets ordinary sun drift refresh at most five times
      // per second. Large hour/focus changes and shadow enable/disable changes are immediate.
      if (!cameraChanged && (!shadowChanged || (!shadowGuardExceeded && shadowPresent === lastShadowPresent && sinceRefresh < 0.2))) return;
      sinceRefresh = 0;
      lastCamera.copy(f.camera.position);
      lastRotation.copy(f.camera.quaternion);
      lastProjection.copy(f.camera.projectionMatrix);
      lastShadowPresent = shadowPresent;
      if (f.shadowFrustum) lastShadowFrustum.copy(f.shadowFrustum);
      f.camera.updateMatrixWorld();
      pv.multiplyMatrices(f.camera.projectionMatrix, f.camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(pv);
      visible = 0;
      for (const b of owned) {
        let count = 0;
        for (let i = 0; i < b.pieces.length; i++) {
          const p = b.pieces[i]!;
          const coverage = smoothDistanceFade(Math.hypot(p.x - f.camera.position.x, p.z - f.camera.position.z), fade.start, fade.end);
          if (coverage <= 0) continue;
          sphere.copy(b.bounds[i]!);
          if (!frustum.intersectsSphere(sphere) && !(b.mesh.castShadow && f.shadowFrustum?.intersectsSphere(sphere))) continue;
          b.mesh.setMatrixAt(count, b.transforms[i]!);
          b.mesh.setColorAt(count, col.setScalar(0.85 + p.rank * 0.23));
          b.visibility.coverage.setXY(count, 0, coverage);
          count++;
        }
        b.mesh.count = count;
        b.mesh.instanceMatrix.needsUpdate = true;
        if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
        b.visibility.coverage.needsUpdate = true;
        visible += count;
      }
    },
    stats: () => ({ forestFloorPieces: pieces.length, forestFloorDrawn: visible }),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { geometry, mesh, visibility } of owned) { visibility.dispose(); mesh.dispose(); geometry.dispose(); }
      material.dispose();
      logMaterial.dispose();
      group.clear();
    },
  };
}
