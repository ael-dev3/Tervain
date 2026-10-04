import * as THREE from 'three';
import type { Colliders, VerticalBounds } from '../world/colliders';
import { ARRIVAL_SIGN, FOREST_RUIN, FOREST_WAYMARKERS } from '../world/layout';
import { mulberry32 } from '../world/noise';
import type { Terrain } from '../world/terrain';
import { Ctx } from './buildKit';
import { makeTexPair } from './buildingTextures';
import type { Quality } from './context';
import { Region } from './regions';
import { jitterTone, type Rnd } from './structures';

export interface ForestLandmarkHandles {
  group: THREE.Group;
  stats: { markers: number; ruins: number; signs: number; triangles: number; meshes: number };
  dispose(): void;
}

/** Measure the authored world vertices, including slopes and leaning pieces, without generating another mesh. */
function physicalBounds(region: Region): () => VerticalBounds {
  const starts = new Map([...region.batches].map(([key, batch]) => [key, batch.p.n]));
  return () => {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [key, batch] of region.batches) {
      for (let i = (starts.get(key) ?? 0) + 1; i < batch.p.n; i += 3) {
        minY = Math.min(minY, batch.p.a[i]!);
        maxY = Math.max(maxY, batch.p.a[i]!);
      }
    }
    return { minY, maxY };
  };
}

/** Authored native stonework. No faction logo, imported art or animated tree transform is involved. */
export function forestLandmarkGeometry(terrain: Pick<Terrain, 'heightAt'>, colliders: Pick<Colliders, 'circle' | 'box'>): Region[] {
  const regions: Region[] = [];
  const ground = (x: number, z: number) => terrain.heightAt(x, z);
  const moss = (R: Region, rnd: Rnd, x: number, y: number, z: number, radius: number) => {
    R.vc.lathe([radius * 0.65, 0, radius, 0.018, radius * 0.74, 0.055, radius * 0.3, 0.08], 7, x, y, z, jitterTone(0x556344, rnd, 0.2), { flat: false, jit: 0.18, amp: 0.2 });
  };

  for (const [index, mark] of FOREST_WAYMARKERS.entries()) {
    const R = new Region(`deepwood-waymarker:${index}`, new Ctx());
    const rnd = mulberry32(8300 + index);
    const base = Math.min(...[-0.6, 0, 0.6].flatMap((dx) => [-0.6, 0, 0.6].map((dz) => ground(mark.x + dx, mark.z + dz)))) - 0.12;
    const bounds = physicalBounds(R);
    R.ctx.push(mark.x, base, mark.z, mark.yaw);
    // Broad buried plinth, tapering weathered shaft and chipped cap make one grounded piece.
    R.stone.box(1.08, 0.3, 0.92, 0, 0, 0, 0xb9b9a1, { jit: 0.1, sub: 0.45 });
    R.stone.lathe([0.42, 0.27, 0.38, 0.42, 0.32, 1.56, 0.28, 1.66], 7, 0, 0, 0, 0xc1c3ad, { jit: 0.1, flat: true, ry: Math.PI / 7 });
    R.stone.box(0.77, 0.17, 0.69, 0, 1.62, 0, 0xc4c3a9, { jit: 0.14, ry: 0.035 });
    // Shallow dark cuts read as worn trail-countermarks, rather than a new decorative emblem.
    for (let cut = 0; cut < 3; cut++) R.vc.box(0.29 - cut * 0.025, 0.033, 0.022, -0.045 + cut * 0.022, 0.78 + cut * 0.19, 0.343 - cut * 0.012, 0x555b47, { jit: 0, ry: 0.08 });
    R.vc.box(0.025, 0.62, 0.023, 0.095, 0.61, 0.334, 0x525747, { jit: 0, rz: 0.1 });
    moss(R, rnd, -0.25, 0.3, 0.24, 0.3);
    moss(R, rnd, 0.21, 0.29, -0.24, 0.26);
    R.ctx.pop();
    colliders.circle(`forest-waymarker:${index}`, mark.x, mark.z, 0.58, true, bounds());
    regions.push(R);
  }

  {
    const spec = FOREST_RUIN;
    const R = new Region('deepwood-roadside-ruin', new Ctx());
    const rnd = mulberry32(8388);
    R.ctx.push(spec.x, 0, spec.z, spec.yaw);
    /** One low broken wall; each footing follows actual terrain, with its collider on the same run. */
    const wall = (id: string, x0: number, z0: number, x1: number, z1: number, courses: number) => {
      const length = Math.hypot(x1 - x0, z1 - z0);
      const steps = Math.ceil(length / 0.85);
      const yaw = Math.atan2(x1 - x0, z1 - z0);
      const center = R.ctx.toWorld((x0 + x1) / 2, 0, (z0 + z1) / 2);
      const bounds = physicalBounds(R);
      for (let step = 0; step < steps; step++) {
        const t = (step + 0.5) / steps;
        const lx = x0 + (x1 - x0) * t;
        const lz = z0 + (z1 - z0) * t;
        const world = R.ctx.toWorld(lx, 0, lz);
        const y = ground(world.x, world.z) - 0.18;
        const rows = Math.max(1, courses - (rnd() < 0.3 ? 1 : 0));
        for (let course = 0; course < rows; course++) {
          const width = 0.55 + rnd() * 0.12;
          R.stone.box(width, 0.35 + rnd() * 0.08, length / steps * 0.98, lx + (rnd() - 0.5) * 0.065, y + course * 0.36, lz + (rnd() - 0.5) * 0.065, jitterTone(course === 0 ? 0x919d79 : 0xc0bda2, rnd, 0.12), { ry: yaw + (rnd() - 0.5) * 0.035, jit: 0.08 });
        }
        if (step % 2 === 0) moss(R, rnd, lx, y + rows * 0.36, lz, 0.24 + rnd() * 0.12);
      }
      colliders.box(`forest-ruin:${id}`, center.x, center.z, 0.32, length / 2, spec.yaw + yaw, true, bounds());
    };
    wall('east', spec.hx, -spec.hz, spec.hx, spec.hz, 4);
    wall('west', -spec.hx, -spec.hz, -spec.hx, spec.hz - 2.1, 3);
    wall('south-west', -spec.hx, spec.hz, -1.6, spec.hz, 3);
    wall('south-east', 1.6, spec.hz, spec.hx, spec.hz, 3);
    // The missing north wall and broad south doorway leave a genuinely open, explorable shelter.
    for (const [lx, lz] of [[-4.7, -4.2], [4.7, -4.1]] as const) {
      const p = R.ctx.toWorld(lx, 0, lz);
      const bounds = physicalBounds(R);
      R.stone.box(1.2, 0.48, 0.8, lx, ground(p.x, p.z) - 0.16, lz, 0xa7ad8d, { jit: 0.17, ry: 0.12 });
      colliders.box('forest-ruin:north-stump', p.x, p.z, 0.6, 0.4, spec.yaw + 0.12, true, bounds());
    }
    // A few buried foundation slabs suggest a former rest place without adding an occupied settlement.
    for (const [lx, lz] of [[-3, 1.2], [-1.2, 1.6], [0.7, 1.1], [2.7, 1.7], [-2.1, -0.8]] as const) {
      const p = R.ctx.toWorld(lx, 0, lz);
      const y = ground(p.x, p.z);
      R.stone.box(1.3 + rnd() * 0.3, 0.095, 0.84 + rnd() * 0.15, lx, y - 0.055, lz, jitterTone(0xa5a88c, rnd, 0.1), { jit: 0.16, ry: (rnd() - 0.5) * 0.13 });
      moss(R, rnd, lx + 0.4, y + 0.037, lz - 0.27, 0.22);
    }
    R.ctx.pop();
    regions.push(R);
  }

  {
    const sign = ARRIVAL_SIGN;
    const R = new Region('arrival-rillford-fingerpost', new Ctx());
    const y = ground(sign.x, sign.z);
    const left = -sign.boardWidth / 2;
    const tip = sign.boardWidth / 2;
    const end = tip - sign.boardWidth * 0.15;
    const bottom = sign.boardBottom;
    const top = bottom + sign.boardHeight;
    const middle = (bottom + top) / 2;
    const bounds = physicalBounds(R);
    R.ctx.push(sign.x, y, sign.z, sign.yaw);
    R.stone.box(0.65, 0.44, 0.65, 0, -0.3, 0, 0xaba58c, { jit: 0.15, ry: 0.12 });
    R.timber.box(0.16, top + 0.54, 0.16, 0, -0.3, 0, 0xbb9564, { grain: 'y', jit: 0.14 });
    R.timber.box(end - left, sign.boardHeight, 0.12, (left + end) / 2, bottom, 0, 0x967349, { grain: 'x', jit: 0.1, sub: 0.7 });
    // A real solid fingerboard points east; its two readable faces both describe the same world direction.
    const wood = 0x967349;
    R.timber.tri3(end, bottom, 0.06, tip, middle, 0.06, end, top, 0.06, wood);
    R.timber.tri3(end, top, -0.06, tip, middle, -0.06, end, bottom, -0.06, wood);
    R.timber.quad([end, top, 0.06, tip, middle, 0.06, tip, middle, -0.06, end, top, -0.06], wood);
    R.timber.quad([tip, middle, 0.06, end, bottom, 0.06, end, bottom, -0.06, tip, middle, -0.06], wood);
    R.timber.rod(-0.45, bottom - 0.06, -0.10, 0, bottom - 0.54, -0.10, 0.035, 5, 0xb89a67, { jit: 0.14 });
    R.timber.rod(0.45, bottom - 0.06, -0.10, 0, bottom - 0.54, -0.10, 0.035, 5, 0xb89a67, { jit: 0.14 });
    for (const z of [-0.076, 0.076]) for (const x of [-0.06, 0.06]) R.metal.box(0.035, 0.035, 0.015, x, bottom + sign.boardHeight * 0.5, z, 0x504d42, { jit: 0 });
    R.ctx.pop();
    colliders.circle('arrival-signpost', sign.x, sign.z, 0.32, true, bounds());
    regions.push(R);
  }
  return regions;
}

/** Original painted lettering printed directly onto the native wooden fingerboard, readable from both sides. */
export function drawArrivalSignFace(ctx: CanvasRenderingContext2D, back = false): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f3e9bf';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(h * 0.43)}px Georgia, serif`;
  ctx.fillText(back ? `← ${ARRIVAL_SIGN.label}` : `${ARRIVAL_SIGN.label} →`, w / 2, h * 0.4, w * 0.94);
  ctx.font = `bold ${Math.round(h * 0.155)}px Georgia, serif`;
  ctx.fillStyle = '#ded0a2';
  ctx.fillText('INLAND ROAD', w / 2, h * 0.8, w * 0.78);
}

/** Compact, independently culled landmarks reuse original procedural masonry; no external asset dependency. */
export function buildForestLandmarks(terrain: Terrain, colliders: Colliders, quality: Quality): ForestLandmarkHandles {
  const pair = makeTexPair('stone', quality === 'low' ? 128 : 192, 8);
  const stone = new THREE.MeshStandardMaterial({ vertexColors: true, map: pair.map, normalMap: pair.normal, roughness: 0.98 });
  stone.normalScale.set(0.8, 0.8);
  const moss = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const woodPair = makeTexPair('timber', quality === 'low' ? 128 : 192, 8);
  const wood = new THREE.MeshStandardMaterial({ vertexColors: true, map: woodPair.map, normalMap: woodPair.normal, roughness: 0.94 });
  const metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0.25 });
  const group = new THREE.Group();
  group.name = 'deepwood-native-landmarks';
  const regions = forestLandmarkGeometry(terrain, colliders);
  for (const region of regions) group.add(region.toGroup({ get: (key) => key === 'stone' ? stone : key === 'timber' ? wood : key === 'metal' ? metal : moss }));
  const labels: THREE.MeshBasicMaterial[] = [];
  const labelMaps: THREE.CanvasTexture[] = [];
  for (const back of [false, true]) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    drawArrivalSignFace(canvas.getContext('2d')!, back);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(ARRIVAL_SIGN.boardWidth * 0.85 - 0.11, ARRIVAL_SIGN.boardHeight - 0.085), material);
    label.name = back ? 'rillford-sign-painted-back' : 'rillford-sign-painted-front';
    const c = Math.cos(ARRIVAL_SIGN.yaw);
    const s = Math.sin(ARRIVAL_SIGN.yaw);
    const face = back ? -0.065 : 0.065;
    const inset = ARRIVAL_SIGN.boardWidth * 0.075;
    label.position.set(ARRIVAL_SIGN.x - inset * c + face * s, terrain.heightAt(ARRIVAL_SIGN.x, ARRIVAL_SIGN.z) + ARRIVAL_SIGN.boardBottom + ARRIVAL_SIGN.boardHeight / 2, ARRIVAL_SIGN.z + inset * s + face * c);
    label.rotation.y = ARRIVAL_SIGN.yaw + (back ? Math.PI : 0);
    label.updateMatrix();
    label.matrixAutoUpdate = false;
    label.castShadow = false;
    group.add(label);
    labels.push(material);
    labelMaps.push(map);
  }
  const stats = { markers: FOREST_WAYMARKERS.length, ruins: 1, signs: 1, triangles: regions.reduce((sum, region) => sum + region.tris, 0) + 4, meshes: regions.reduce((sum, region) => sum + region.batches.size, 0) + 2 };
  group.userData.stats = stats;
  let disposed = false;
  return {
    group,
    stats,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      stone.dispose();
      moss.dispose();
      wood.dispose();
      metal.dispose();
      for (const material of labels) material.dispose();
      for (const map of labelMaps) map.dispose();
      pair.map.dispose();
      pair.normal.dispose();
      woodPair.map.dispose();
      woodPair.normal.dispose();
      group.clear();
    },
  };
}
