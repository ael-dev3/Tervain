import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';
import { campfire } from '../props';
import { rockShapes } from '../scatter';
import { TINT, jitterTone, sack, woodpile, type Rnd } from '../structures';
import { Region } from '../regions';
import { buildCloakedFigure, type CloakedFigure } from './menuFigure';
import { MENU_BANNER, MENU_FIRE, MENU_STONES, MENU_TREE, browZ, menuHeight, trackDistance } from './menuLayout';
import { restHeight } from './menuLand';
import { slabGeometry } from './menuStones';

/**
 * The camp and its people. A warden of the order keeps the night's vigil by the fire, hood up, his sword driven into the
 * mud beside him the way the order's wardens rest a blade (a working proposal, not recorded doctrine). A handcart with a
 * split wheel stands in the ruts; a waystone with an iron offering bowl marks the track; the hermit's door is set
 * between the ancient tree's roots with a lantern burning beside it; pilgrims' rags hang from a low bough. Standing
 * stones older than all of it stand on the rise. Static pieces are merged per material through the playable kit.
 */

const iron = TINT.iron;

function stoneAt(R: Region, rnd: Rnd, x: number, z: number, w: number, h: number, d: number, yaw: number, lean: number, sink = 0.35) {
  const shapes = rockShapes();
  const g = shapes.big[Math.floor(rnd() * shapes.big.length)]!;
  const y = restHeight(x, z, Math.max(w, d) * 0.5) - sink;
  const ctx = R.ctx;
  ctx.push(x, y + h * 0.5, z, yaw, lean, (rnd() - 0.5) * 0.08);
  ctx.matrix.scale(new THREE.Vector3(w, h, d));
  R.rock.addGeometry(g, null, 0.85 + rnd() * 0.2, 0.06, Math.max(w, h, d) * 0.9);
  ctx.pop();
}

/** A sword driven point-first into the ground: blade, straight cross-guard, leather grip, a round pommel. */
function plantedSword(R: Region, x: number, y: number, z: number, yaw: number, lean: number) {
  const ctx = R.ctx;
  ctx.push(x, y, z, yaw, lean, 0.05);
  // Blade (the lower 20 cm are in the ground): a flattened, tapering box with a fuller shadow.
  R.metal.box(0.052, 0.72, 0.012, 0, -0.18, 0, 0x8a8984, { jit: 0.04 });
  R.metal.box(0.04, 0.2, 0.01, 0, 0.54, 0, 0x8f8e88, { jit: 0.04 });
  R.vc.box(0.012, 0.66, 0.014, 0, -0.14, 0, 0x2a2826, { jit: 0.02 });
  // Guard, grip and pommel.
  R.metal.box(0.3, 0.035, 0.035, 0, 0.74, 0, 0x6f6458, { jit: 0.05 });
  R.vc.cyl(0.022, 0.024, 0.2, 7, 0, 0.775, 0, 0x2b2119, { jit: 0.05 });
  R.metal.blob(0.036, 0.036, 0.026, 0, 1.0, 0, 0x6f6458, { seg: 7, rings: 4, lump: 0.05, smooth: true });
  ctx.pop();
}

/** The hermit's door between two roots: rough posts, a crooked lintel, a plank door with iron straps, a stone step. */
function hermitDoor(R: Region, rnd: Rnd, at: THREE.Vector3, facing: number) {
  const ctx = R.ctx;
  ctx.push(at.x, at.y, at.z, facing);
  const wood = jitterTone(TINT.woodDark, rnd, 0.1);
  R.timber.box(0.2, 2.25, 0.22, -0.66, -0.15, 0.06, wood, { grain: 'y', rz: 0.04, jit: 0.1 });
  R.timber.box(0.2, 2.15, 0.22, 0.68, -0.15, 0.04, wood, { grain: 'y', rz: -0.05, jit: 0.1 });
  R.timber.box(1.75, 0.22, 0.26, 0.02, 1.98, 0.06, wood, { grain: 'x', rz: 0.045, jit: 0.1 });
  for (let i = 0; i < 5; i++) {
    R.planks.box(0.24, 1.92 + (rnd() - 0.5) * 0.05, 0.06, -0.48 + i * 0.245, -0.02, -0.03 + (rnd() - 0.5) * 0.015, jitterTone(TINT.wood, rnd, 0.16), { grain: 'y', jit: 0.12 });
  }
  for (const y of [0.32, 1.45]) R.metal.box(1.02, 0.07, 0.02, 0, y, 0.015, iron, { jit: 0.06 });
  R.metal.box(0.05, 0.05, 0.05, 0.36, 0.9, 0.03, iron);
  R.stone.box(1.6, 0.18, 0.7, 0, -0.2, 0.42, jitterTone(TINT.stoneDark, rnd, 0.12), { jit: 0.1, ry: 0.05 });
  // A lantern on an iron arm beside the door; the glass is lit.
  R.metal.box(0.04, 0.04, 0.5, 1.02, 1.72, 0.25, iron);
  R.metal.box(0.22, 0.035, 0.22, 1.02, 1.38, 0.48, iron);
  R.glow.box(0.18, 0.26, 0.18, 1.02, 1.12, 0.48, 0xffffff, { jit: 0 });
  R.metal.box(0.24, 0.03, 0.24, 1.02, 1.1, 0.48, iron);
  // A small window above, shutter hanging open, candlelight inside.
  R.glow.box(0.18, 0.24, 0.04, -0.2, 2.7, -0.05, 0x9a8a80, { jit: 0 });
  R.timber.box(0.34, 0.06, 0.12, -0.2, 2.58, 0.04, wood);
  R.planks.box(0.3, 0.38, 0.04, -0.47, 2.62, 0.12, jitterTone(TINT.wood, rnd, 0.14), { ry: -0.9, rz: 0.12 });
  ctx.pop();
}

export interface MenuCamp {
  group: THREE.Group;
  warden: CloakedFigure;
  /** World positions of warm light sources besides the fire (the door lantern, the hermit's window). */
  lanterns: THREE.Vector3[];
  update(time: number, dt: number, amp: number): void;
  dispose(): void;
}

/**
 * Build everything static in the camp into `R`, and the living warden as his own rig. `doorAt` and `doorFacing` place the
 * hermit's door on the tree's actual bark (the caller ray-casts the trunk).
 */
export function buildMenuCamp(R: Region, doorAt: THREE.Vector3, doorFacing: number): MenuCamp {
  const rnd = mulberry32(51);
  const group = new THREE.Group();
  group.name = 'Menu_Camp';
  const fx = MENU_FIRE.x;
  const fz = MENU_FIRE.z;
  campfire(R, rnd, fx, restHeight(fx, fz, 0.6) + 0.03, fz);
  // Cooking tripod over the fire and a blackened pot on a chain.
  const fy = menuHeight(fx, fz);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.3;
    R.bark.rod(fx + Math.cos(a) * 0.95, fy - 0.05, fz + Math.sin(a) * 0.95, fx, fy + 1.55, fz, 0.035, 5, jitterTone(0x9a8a78, rnd, 0.14), { jit: 0.1 });
  }
  R.vc.tube([[fx, fy + 1.55, fz], [fx + 0.01, fy + 1.2, fz], [fx, fy + 0.95, fz]], 0.01, 4, 0x2a2622);
  R.metal.lathe([0.02, 0, 0.19, 0.03, 0.23, 0.14, 0.2, 0.26, 0.16, 0.3, 0.17, 0.32], 10, fx, fy + 0.62, fz, 0x2a2724, { jit: 0.05 });
  // The warden's seat: a split log, and his gear.
  // He sits across the fire from the camera, so the flames light his hands and the front of his hood.
  const seat = { x: fx + 0.35, z: fz - 1.45 };
  const sy = restHeight(seat.x, seat.z, 0.6);
  R.bark.rod(seat.x - 0.85, sy + 0.2, seat.z - 0.12, seat.x + 0.8, sy + 0.22, seat.z + 0.04, 0.21, 9, jitterTone(0xc4b6a4, rnd, 0.12), { jit: 0.1 });
  sack(R, rnd, seat.x - 0.8, restHeight(seat.x - 0.8, seat.z - 0.3, 0.3), seat.z - 0.3, 0.9);
  // Bedroll: a rolled blanket strapped with leather.
  R.cloth.rod(fx + 1.4, sy + 0.14, fz - 2.2, fx + 2.2, sy + 0.14, fz - 1.7, 0.17, 10, jitterTone(0x6a4e40, rnd, 0.12), { jit: 0.08 });
  plantedSword(R, seat.x + 0.75, menuHeight(seat.x + 0.75, seat.z + 0.1), seat.z + 0.1, 0.3, -0.08);
  // A pilgrim's staff leaning on the woodpile, and the woodpile itself.
  woodpile(R, rnd, fx + 1.8, fz + 1.7, -0.7, 1.4, 3);
  R.bark.rod(fx + 1.2, menuHeight(fx + 1.2, fz + 2.2), fz + 2.2, fx + 1.75, menuHeight(fx + 1.2, fz + 2.2) + 1.75, fz + 1.75, 0.03, 5, jitterTone(0xb8a890, rnd, 0.12));
  const cx = -2.2;
  const cz = 3.1;
  // A Templar waystone by the track: a squared, weathered post with an iron offering bowl and stubs of candle.
  const wx = 2.3;
  const wz = -4.2;
  const wy = restHeight(wx, wz, 0.4);
  R.stone.box(0.42, 1.25, 0.36, wx, wy - 0.25, wz, jitterTone(TINT.stone, rnd, 0.14), { ry: 0.3, rz: 0.05, jit: 0.14, sub: 0.3 });
  R.metal.lathe([0.05, 0, 0.2, 0.05, 0.24, 0.12, 0.23, 0.14], 10, wx, wy + 1.0, wz, 0x4a4540, { jit: 0.05 });
  for (let k = 0; k < 3; k++) R.vc.cyl(0.018, 0.02, 0.06 + rnd() * 0.07, 6, wx + (rnd() - 0.5) * 0.18, wy + 1.1, wz + (rnd() - 0.5) * 0.18, 0xd8ccb0, { jit: 0.05 });
  // Field stones along the verges and round the roots; a few big ones at the brow.
  for (let i = 0; i < 70; i++) {
    const x = (rnd() - 0.5) * 50;
    const z = 12 - rnd() * 48;
    if (z < browZ(x) + 1) continue;
    const { d } = trackDistance(x, z);
    if (d < 1.4 || Math.hypot(x - fx, z - fz) < 3 || Math.hypot(x - cx, z - cz) < 1.6) continue;
    const s = 0.12 + Math.pow(rnd(), 3) * 0.7;
    stoneAt(R, rnd, x, z, s * (0.9 + rnd() * 0.4), s * 0.6, s, rnd() * 6, (rnd() - 0.5) * 0.3, s * 0.25);
  }
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 3.2 + rnd() * 3;
    const s = 0.25 + rnd() * 0.45;
    stoneAt(R, rnd, MENU_TREE.x + Math.cos(a) * r, MENU_TREE.z + Math.sin(a) * r, s * 1.3, s * 0.7, s, rnd() * 6, 0.1, s * 0.3);
  }
  // Litter trodden into the mud: broken twigs and straw round the camp and along the track.
  for (let i = 0; i < 110; i++) {
    const nearCamp = i < 55;
    const x = nearCamp ? fx + (rnd() - 0.5) * 7.5 : (rnd() - 0.5) * 14;
    const z = nearCamp ? fz + (rnd() - 0.5) * 7.5 : 8 - rnd() * 24;
    if (Math.hypot(x - fx, z - fz) < 1 || (!nearCamp && trackDistance(x, z).d > 2.6)) continue;
    const y = menuHeight(x, z) + 0.012;
    const a = rnd() * Math.PI;
    const l = 0.12 + rnd() * 0.45;
    const straw = rnd() < 0.45;
    R.bark.rod(x, y, z, x + Math.cos(a) * l, y + (rnd() - 0.5) * 0.03, z + Math.sin(a) * l, straw ? 0.005 : 0.01 + rnd() * 0.012, 3, straw ? 0xc8b080 : 0x6a5a48, { jit: 0.12, caps: false });
  }
  // The standing stones: an uneven arc of split slabs on the rise, one fallen, one leaning, and a dolmen past them.
  const sx = MENU_STONES.x;
  const sz = MENU_STONES.z;
  const slab = (x: number, z: number, w: number, h: number, d: number, yaw: number, leanX: number, leanZ: number, seed: number, sink = 0.2) => {
    const g = slabGeometry({ w, h, d, seed });
    R.ctx.push(x, restHeight(x, z, Math.max(w, d) * 0.5) - sink, z, yaw, leanX, leanZ);
    R.rock.addGeometry(g, null, 0.9 + rnd() * 0.15, 0.05, 1);
    R.ctx.pop();
    g.dispose();
  };
  const arc: [number, number, number, number, number, number][] = [
    // angle, width, height, depth, lean x, lean z
    [-0.95, 1.1, 3.1, 0.55, 0.02, 0.05],
    [-0.55, 0.9, 3.9, 0.6, -0.03, 0.0],
    [-0.15, 1.3, 2.6, 0.7, 0.0, -0.06],
    [0.3, 0.8, 4.3, 0.55, 0.04, 0.16],
    [0.95, 1.0, 3.2, 0.6, -0.02, 0.03],
  ];
  for (let k = 0; k < arc.length; k++) {
    const [a, w, hh, d, lx, lz] = arc[k]!;
    slab(sx + Math.sin(a) * 7.5, sz + Math.cos(a) * 4.5, w, hh, d, a + (rnd() - 0.5) * 0.3, lx, lz, 300 + k);
  }
  // The fallen one lies across the arc's gap.
  slab(sx + Math.sin(0.62) * 7.3, sz + Math.cos(0.62) * 4.3 + 0.6, 1.05, 3.4, 0.62, 1.0, Math.PI / 2 - 0.08, 0.1, 309, -0.25);
  const dx = sx + 9.5;
  const dz = sz - 3;
  slab(dx - 1.15, dz, 0.9, 2.0, 0.55, 0.2, 0.03, 0.02, 320);
  slab(dx + 1.1, dz + 0.2, 0.85, 1.9, 0.5, -0.1, -0.03, -0.02, 321);
  const cap = slabGeometry({ w: 3.4, h: 0.6, d: 1.8, seed: 322 });
  R.ctx.push(dx, restHeight(dx, dz, 1) + 1.55, dz + 0.1, 0.15, 0.05, 0.07);
  R.rock.addGeometry(cap, null, 0.88, 0.05, 1);
  R.ctx.pop();
  cap.dispose();
  // The banner's cairn and guy-rope pegs are built by the banner's hardware callback (see buildBannerHardware).

  hermitDoor(R, rnd, doorAt, doorFacing);
  const lanterns = [
    new THREE.Vector3(1.02, 1.12, 0.48).applyAxisAngle(new THREE.Vector3(0, 1, 0), doorFacing).add(doorAt),
    new THREE.Vector3(-0.2, 2.72, 0.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), doorFacing).add(doorAt),
  ];

  // The warden: undyed dark wool, hood up, hands to the fire, sitting on the split log.
  const warden = buildCloakedFigure(90417);
  warden.group.position.set(seat.x, sy, seat.z);
  warden.group.rotation.y = Math.atan2(fx - seat.x, fz - seat.z) + 0.15;
  warden.group.name = 'Menu_Warden';
  group.add(warden.group);

  return {
    group,
    warden,
    lanterns,
    update(time: number, _dt: number, amp: number) {
      warden.update(time, amp);
    },
    dispose() {
      warden.dispose();
    },
  };
}

/** The standard's pole: a crooked unbarked trunk in a cairn, a crossbar with iron fittings, two guy ropes to pegs. */
export function buildBannerHardware(R: Region, rnd: Rnd) {
  return (_group: THREE.Group, poleTop: THREE.Vector3, barY: number) => {
    const bx = MENU_BANNER.x;
    const bz = MENU_BANNER.z;
    const by = restHeight(bx, bz, 0.8);
    const wood = jitterTone(0xb0a08c, rnd, 0.1);
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push([bx + Math.sin(t * 2.3) * 0.08 + t * 0.06, by - 0.4 + t * (poleTop.y + 0.4), bz + Math.sin(t * 3.1 + 1) * 0.05]);
    }
    R.bark.tube(pts, (t) => 0.1 - t * 0.035, 7, wood);
    R.metal.cyl(0.0, 0.05, 0.35, 5, bx + 0.06, by + poleTop.y, bz, iron);
    R.timber.rod(bx - 0.05, by + barY, bz + 0.1, bx + 1.72, by + barY - 0.03, bz + 0.1, 0.045, 6, jitterTone(TINT.woodDark, rnd, 0.1));
    R.metal.box(0.14, 0.14, 0.14, bx + 0.02, by + barY - 0.07, bz + 0.1, iron);
    R.vc.tube([[bx + 0.05, by + barY + 0.9, bz + 0.05], [bx + 0.9, by + barY + 0.2, bz + 0.1], [bx + 1.7, by + barY, bz + 0.1]], 0.012, 4, TINT.rope);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const s = 0.28 + rnd() * 0.2;
      const x = bx + Math.cos(a) * 0.55;
      const z = bz + Math.sin(a) * 0.55;
      const shapes = rockShapes();
      R.ctx.push(x, restHeight(x, z, 0.3) + s * 0.25, z, rnd() * 6, (rnd() - 0.5) * 0.3, 0);
      R.ctx.matrix.scale(new THREE.Vector3(s, s * 0.8, s));
      R.rock.addGeometry(shapes.small[i % shapes.small.length]!, null, 0.9 + rnd() * 0.1, 0.05, s);
      R.ctx.pop();
    }
    for (const [px, pz] of [[bx - 3.2, bz + 2.6], [bx + 2.4, bz - 3.4]] as const) {
      const py = menuHeight(px, pz);
      R.timber.box(0.06, 0.4, 0.06, px, py - 0.2, pz, jitterTone(TINT.woodDark, rnd, 0.1), { rz: 0.3 });
      R.vc.tube([[px, py + 0.15, pz], [(px + bx) / 2, (py + by + poleTop.y * 0.7) / 2 - 0.25, (pz + bz) / 2], [bx, by + poleTop.y * 0.72, bz]], 0.012, 4, TINT.rope);
    }
    // The banner cloth itself is positioned relative to the pole foot by the scene.
  };
}
