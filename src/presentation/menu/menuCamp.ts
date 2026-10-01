import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';
import { campfire } from '../props';
import { rockShapes } from '../scatter';
import { TINT, jitterTone, sack, type Rnd } from '../structures';
import { Region, type MatKey } from '../regions';
import { Ctx } from '../buildKit';
import { buildCloakedFigure, type CloakedFigure } from './menuFigure';
import { MENU_BANNER, MENU_FIRE, MENU_STONES, browZ, menuHeight, trackDistance, type Keep } from './menuLayout';
import { puddleSpots, restHeight } from './menuLand';
import { slabGeometry } from './menuStones';

/**
 * The camp and its people. A warden of the order keeps the night's vigil by the fire, hood up, his sword driven into the
 * mud beside him the way the order's wardens rest a blade (a working proposal, not recorded doctrine). A waystone with an
 * iron offering bowl marks the track; the hermit's door is set into the ancient tree between two of its roots, with a
 * lantern burning beside it and a pilgrim's staff propped against the post. Standing stones older than all of it stand on
 * the rise. Static pieces are merged per material through the playable kit.
 *
 * Nothing is set down through anything else: every placed piece claims a patch of ground (`keep`), and the scattered
 * stones, litter and grass stay out of the patches already claimed.
 */

const iron = TINT.iron;

class Claims {
  readonly keep: Keep[] = [];
  add(x: number, z: number, r: number) {
    this.keep.push({ x, z, r });
  }
  /** A line of patches from a to b, close enough to cover it. */
  line(ax: number, az: number, bx: number, bz: number, r: number) {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / Math.max(0.1, r)));
    for (let i = 0; i <= n; i++) this.add(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n, r);
  }
  clear(x: number, z: number, r: number) {
    return this.keep.every((k) => (x - k.x) ** 2 + (z - k.z) ** 2 > (k.r + r) ** 2);
  }
}

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

/** A stack of split logs on two bearers, kept out of the mud. */
function woodpile(R: Region, rnd: Rnd, x: number, z: number, yaw: number) {
  R.ctx.push(x, restHeight(x, z, 0.7), z, yaw);
  for (const bz of [-0.2, 0.2]) R.bark.rod(-0.72, 0.05, bz, 0.72, 0.05, bz + (rnd() - 0.5) * 0.04, 0.05, 5, 0x5a4a3a, { jit: 0.1 });
  for (let r = 0; r < 3; r++) {
    const n = 6 - r;
    for (let i = 0; i < n; i++) {
      const lx = -0.55 + r * 0.11 + i * 0.22 + (rnd() - 0.5) * 0.02;
      const ly = 0.19 + r * 0.17;
      R.bark.rod(lx, ly, -0.32, lx + (rnd() - 0.5) * 0.03, ly + (rnd() - 0.5) * 0.02, 0.32, 0.085 + rnd() * 0.015, 6, jitterTone(0x8c7a64, rnd, 0.14), { jit: 0.1 });
    }
  }
  R.ctx.pop();
}

/** Door-local sizes: the opening, and the posts that frame it. The tree cuts its flat face to fit (see menuScene). */
export const HERMIT_DOOR = { width: 0.86, height: 1.72, post: 0.15, faceHalfWidth: 0.6, faceTop: 1.95, hingeZ: 0.085 };

/**
 * The hermit's door, set into the flat face adzed into the tree: rough posts and a crooked lintel sunk into the bark, a
 * plank door with iron straps and a barred grille, lamplight through the grille and the gaps between the planks, a stone
 * step, a lantern on an iron bracket and a pilgrim's staff propped against the post.
 *
 * Door-local frame: x across the face (to the right, seen from outside), y up from the ground, z out of the face; the face
 * itself is z = 0. Returns the world positions of the lantern and the grille.
 */
function hermitDoor(R: Region, rnd: Rnd, at: THREE.Vector3, facing: number, claims: Claims, mats: { get(key: MatKey): THREE.Material }) {
  const ctx = R.ctx;
  ctx.push(at.x, at.y, at.z, facing);
  const { width: W, height: H, post: P } = HERMIT_DOOR;
  const wood = jitterTone(TINT.woodDark, rnd, 0.1);
  // Posts and lintel, their backs sunk in the bark.
  R.timber.box(P, H + 0.33, 0.2, -(W / 2 + P / 2), -0.15, -0.02, wood, { grain: 'y', rz: 0.015, jit: 0.1 });
  R.timber.box(P, H + 0.3, 0.2, W / 2 + P / 2, -0.15, -0.02, wood, { grain: 'y', rz: -0.02, jit: 0.1 });
  R.timber.box(W + 2 * P + 0.14, 0.2, 0.24, 0.02, H, -0.03, wood, { grain: 'x', rz: 0.025, jit: 0.1 });
  // The leaf is a separate native rig: its hinge remains exactly on the left post as the wood swings outward.
  const leaf = new Region('Menu_Tree_Door_Leaf', new Ctx());
  // The pin sits just in front of the post. This offset preserves the closed pose and keeps the leaf out of the timber
  // when it swings, rather than rotating its thickness through the solid post.
  const hingeZ = HERMIT_DOOR.hingeZ;
  leaf.ctx.push(W / 2, 0, -hingeZ);
  // Lamplight and grille move with the leaf, rather than leaving an illuminated window floating in the aperture.
  leaf.glow.box(W, H, 0.004, 0, 0.02, 0.008, 0x3a3a3a, { jit: 0 });
  const gy0 = 1.12;
  const gy1 = 1.38;
  leaf.glow.box(0.42, gy1 - gy0, 0.004, 0, gy0, 0.012, 0xffffff, { jit: 0 });
  // Four planks with finger-wide gaps; the middle two are cut round the grille.
  const pw = 0.2;
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * (W / 4);
    const tone = jitterTone(TINT.wood, rnd, 0.16);
    const top = H - 0.01 - rnd() * 0.03;
    if (i === 1 || i === 2) {
      leaf.planks.box(pw, gy0 - 0.02, 0.05, x, 0.02, 0.045, tone, { grain: 'y', jit: 0.12 });
      leaf.planks.box(pw, top - gy1, 0.05, x, gy1, 0.045, tone, { grain: 'y', jit: 0.12 });
    } else {
      leaf.planks.box(pw, top - 0.02, 0.05, x, 0.02, 0.045, tone, { grain: 'y', jit: 0.12 });
    }
  }
  for (const bx of [-0.1, 0, 0.1]) leaf.metal.rod(bx, gy0 - 0.01, 0.05, bx, gy1 + 0.01, 0.05, 0.011, 4, iron);
  leaf.metal.rod(-0.21, (gy0 + gy1) / 2, 0.055, 0.21, (gy0 + gy1) / 2, 0.055, 0.01, 4, iron);
  for (const y of [0.3, 1.5]) leaf.metal.box(W - 0.02, 0.06, 0.012, 0, y, 0.076, iron, { jit: 0.06 });
  leaf.metal.box(0.05, 0.06, 0.03, 0.3, 0.9, 0.085, iron);
  leaf.ctx.pop();
  const root = new THREE.Group();
  root.name = 'Menu_Tree_Door';
  root.position.copy(at);
  root.rotation.y = facing;
  const hinge = new THREE.Group();
  hinge.name = 'Menu_Tree_Door_Hinge';
  hinge.position.set(-W / 2, 0, hingeZ);
  const leafGroup = leaf.toGroup(mats, { shadows: true });
  hinge.add(leafGroup);
  root.add(hinge);
  // Behind the doorway the tree is hollow (menuHollow): no timber lining, the carved wood itself.
  // A worn step stone.
  R.stone.box(W + 0.36, 0.14, 0.46, 0, -0.1, 0.27, jitterTone(TINT.stoneDark, rnd, 0.12), { jit: 0.1, ry: 0.03 });
  // A lantern on an iron bracket from the right post; the glass is lit.
  const lx = W / 2 + P + 0.02;
  const lz = 0.36;
  R.metal.rod(W / 2 + P / 2, 1.62, 0.07, lx, 1.64, lz, 0.014, 4, iron);
  R.metal.rod(W / 2 + P / 2, 1.42, 0.075, lx - 0.02, 1.62, lz - 0.06, 0.01, 4, iron);
  R.metal.rod(lx, 1.64, lz, lx, 1.55, lz, 0.008, 3, iron);
  R.metal.cyl(0.0, 0.085, 0.07, 6, lx, 1.48, lz, iron);
  R.glow.cyl(0.058, 0.058, 0.16, 6, lx, 1.32, lz, 0xffffff, { jit: 0 });
  R.metal.cyl(0.075, 0.075, 0.025, 6, lx, 1.3, lz, iron);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    R.metal.rod(lx + Math.cos(a) * 0.066, 1.31, lz + Math.sin(a) * 0.066, lx + Math.cos(a) * 0.066, 1.48, lz + Math.sin(a) * 0.066, 0.007, 3, iron);
  }
  // The staff leans on the left post: its head rests on the post's face, its foot on the ground in front.
  const foot = ctx.toWorld(-0.68, 0, 0.9);
  const fy = menuHeight(foot.x, foot.z) - at.y - 0.03;
  const headX = -(W / 2 + P / 2);
  const headY = 1.5;
  const headZ = 0.08 + 0.028;
  R.bark.rod(-0.68, fy, 0.9, headX, headY, headZ, 0.026, 6, jitterTone(0x8a7a62, rnd, 0.1), { jit: 0.08 });
  R.vc.rod(-0.68 + (headX + 0.68) * 0.7, fy + (headY - fy) * 0.7, 0.9 + (headZ - 0.9) * 0.7, -0.68 + (headX + 0.68) * 0.8, fy + (headY - fy) * 0.8, 0.9 + (headZ - 0.9) * 0.8, 0.03, 6, 0x2b2119, { jit: 0.05 });
  const lights = [ctx.toWorld(lx, 1.4, lz), ctx.toWorld(0, (gy0 + gy1) / 2, 0.4)];
  // The ground in front of the door is taken: the step, the staff's foot.
  const front = ctx.toWorld(0, 0, 0.45);
  claims.add(front.x, front.z, 0.85);
  claims.add(foot.x, foot.z, 0.2);
  ctx.pop();
  return { group: root, hinge, lights, dispose() {
    leafGroup.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
  } };
}

/** A standing stone, or one lying where it fell: the playable rock texture on a split slab. */
export interface SlabPlan {
  spec: { w: number; h: number; d: number; seed: number; below?: number; bottom?: boolean };
  matrix: THREE.Matrix4;
  /** Lying along the ground (its length runs along local y) rather than standing. */
  lying?: boolean;
}

const Y = new THREE.Vector3(0, 1, 0);

function standingSlab(x: number, z: number, w: number, h: number, d: number, yaw: number, leanX: number, leanZ: number, seed: number, sink = 0.2): SlabPlan {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, restHeight(x, z, Math.max(w, d) * 0.5) - sink, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(leanX, yaw, leanZ, 'YXZ')),
    new THREE.Vector3(1, 1, 1),
  );
  return { spec: { w, h, d, seed }, matrix: m };
}

/** A slab lying on the ground from a to b, following the slope, sunk a third of its thickness into the turf. */
function lyingSlab(ax: number, az: number, bx: number, bz: number, w: number, d: number, seed: number): SlabPlan {
  const a = new THREE.Vector3(ax, restHeight(ax, az, w * 0.4), az);
  const b = new THREE.Vector3(bx, restHeight(bx, bz, w * 0.4), bz);
  const along = b.clone().sub(a);
  const len = along.length();
  along.normalize();
  const across = new THREE.Vector3().crossVectors(along, Y).normalize();
  const up = new THREE.Vector3().crossVectors(across, along).normalize();
  const m = new THREE.Matrix4().makeBasis(across, along, up);
  m.setPosition(a.addScaledVector(up, d * 0.5 - d * 0.33));
  return { spec: { w, h: len, d, seed, below: 0, bottom: true }, matrix: m, lying: true };
}

/** Top of a slab's geometry above its own base, in its local frame. */
function slabTop(spec: SlabPlan['spec']) {
  const g = slabGeometry(spec);
  g.computeBoundingBox();
  const top = g.boundingBox!.max.y;
  g.dispose();
  return top;
}

/**
 * Where the standing stones, the fallen one and the dolmen go. Pure placement, so tests can check that none of them runs
 * into another and that the dolmen's cap rests on its uprights.
 */
export function standingStones(): { slabs: SlabPlan[]; cap: SlabPlan; uprights: [SlabPlan, SlabPlan] } {
  const rnd = mulberry32(3301);
  const sx = MENU_STONES.x;
  const sz = MENU_STONES.z;
  const slabs: SlabPlan[] = [];
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
    slabs.push(standingSlab(sx + Math.sin(a) * 7.5, sz + Math.cos(a) * 4.5, w, hh, d, a + (rnd() - 0.5) * 0.3, lx, lz, 300 + k));
  }
  // The fallen one lies in the grass outside the arc's gap, where it toppled.
  slabs.push(lyingSlab(sx + 3.9, sz + 4.6, sx + 6.9, sz + 6.3, 1.0, 0.6, 309));
  // The dolmen past them: two uprights and a capstone resting on their highest points.
  const dx = sx + 9.5;
  const dz = sz - 3;
  const u1 = standingSlab(dx - 1.15, dz, 0.9, 2.0, 0.55, 0.2, 0.03, 0.02, 320);
  const u2 = standingSlab(dx + 1.1, dz + 0.2, 0.85, 1.9, 0.5, -0.1, -0.03, -0.02, 321);
  slabs.push(u1, u2);
  const t1 = new THREE.Vector3(dx - 1.15, 0, dz).setY(new THREE.Vector3().setFromMatrixPosition(u1.matrix).y + slabTop(u1.spec));
  const t2 = new THREE.Vector3(dx + 1.1, 0, dz + 0.2).setY(new THREE.Vector3().setFromMatrixPosition(u2.matrix).y + slabTop(u2.spec));
  const along = t2.clone().sub(t1).normalize();
  const across = new THREE.Vector3().crossVectors(along, Y).normalize();
  const up = new THREE.Vector3().crossVectors(across, along).normalize();
  // Cap-local x runs along the uprights' line, y up, z across; the underside sits 4 cm into the uprights' tops.
  const m = new THREE.Matrix4().makeBasis(along, up, across);
  m.setPosition(t1.clone().add(t2).multiplyScalar(0.5).addScaledVector(up, -0.04));
  const cap: SlabPlan = { spec: { w: 3.4, h: 0.6, d: 1.8, seed: 322, below: 0, bottom: true }, matrix: m };
  return { slabs, cap, uprights: [u1, u2] };
}

/**
 * Where the camp's things stand, as footprints (circles, or capsules from a to b): the fire ring, the warden on his log,
 * his gear, the woodpile and the waystone. The warden sits astride the log, so those two overlap on purpose; nothing else
 * may. Tests check the gaps.
 */
export function campLayout() {
  const fx = MENU_FIRE.x;
  const fz = MENU_FIRE.z;
  const seat = { x: fx + 0.35, z: fz - 1.45 };
  return {
    fire: { x: fx, z: fz, r: 0.82 },
    tripod: [0, 1, 2].map((k) => {
      const a = (k / 3) * Math.PI * 2 + 0.3;
      return { x: fx + Math.cos(a) * 0.95, z: fz + Math.sin(a) * 0.95, r: 0.05 };
    }),
    warden: { x: seat.x, z: seat.z, r: 0.58 },
    log: { ax: seat.x - 0.85, az: seat.z - 0.12, bx: seat.x + 0.8, bz: seat.z + 0.04, r: 0.23 },
    sack: { x: seat.x - 1.3, z: seat.z - 0.62, r: 0.32 },
    bed: { ax: fx + 1.4, az: fz - 2.2, bx: fx + 2.2, bz: fz - 1.7, r: 0.18 },
    sword: { x: seat.x + 1.2, z: seat.z + 0.28, r: 0.16 },
    woodpile: { x: fx + 1.95, z: fz + 1.55, r: 0.85 },
    waystone: { x: 2.3, z: -4.2, r: 0.35 },
  };
}

export interface MenuCamp {
  group: THREE.Group;
  warden: CloakedFigure;
  /** World positions of warm light sources besides the fire (the door lantern, the grille in the door). */
  lanterns: THREE.Vector3[];
  /** Ground claimed by everything placed here, for the grass. */
  keep: readonly Keep[];
  /** Swing the door leaf to this hinge angle (radians outward from shut). */
  setDoorAngle(angle: number): void;
  update(time: number, dt: number, amp: number): void;
  dispose(): void;
}

export interface CampTree {
  /** The trunk's foot, and a radius that covers it. */
  x: number;
  z: number;
  r: number;
  /** Surface roots in world space. */
  roots: { pts: THREE.Vector3[]; r0: number; r1: number }[];
}

/**
 * Build everything static in the camp into `R`, and the living warden as his own rig. `door` places the hermit's door on
 * the flat face the tree cut for it (world position of the face at the ground, and the yaw of its outward normal).
 */
export function buildMenuCamp(R: Region, door: { at: THREE.Vector3; facing: number }, tree: CampTree, mats: { get(key: MatKey): THREE.Material }): MenuCamp {
  const rnd = mulberry32(51);
  const claims = new Claims();
  const group = new THREE.Group();
  group.name = 'Menu_Camp';
  const fx = MENU_FIRE.x;
  const fz = MENU_FIRE.z;

  // The tree's foot and roots, and the puddles, are taken before anything is scattered.
  claims.add(tree.x, tree.z, tree.r);
  for (const root of tree.roots) {
    for (let i = 0; i < root.pts.length - 1; i++) {
      const a = root.pts[i]!;
      const b = root.pts[i + 1]!;
      const r = root.r0 + ((root.r1 - root.r0) * (i + 0.5)) / (root.pts.length - 1);
      claims.line(a.x, a.z, b.x, b.z, r + 0.05);
    }
  }
  for (const p of puddleSpots()) {
    // The whole puddle, rim included: a run of patches along its long axis.
    const long = Math.max(p.rx, p.rz) * 1.2;
    const short = Math.min(p.rx, p.rz) * 1.2;
    const [ux, uz] = p.rz >= p.rx ? [-Math.sin(p.yaw), Math.cos(p.yaw)] : [Math.cos(p.yaw), Math.sin(p.yaw)];
    const reach = long - short;
    claims.line(p.x - ux * reach, p.z - uz * reach, p.x + ux * reach, p.z + uz * reach, short);
  }

  const L = campLayout();
  campfire(R, rnd, fx, restHeight(fx, fz, 0.6) + 0.03, fz);
  claims.add(fx, fz, L.fire.r + 0.08);
  // Cooking tripod over the fire and a blackened pot on a chain.
  const fy = menuHeight(fx, fz);
  for (const foot of L.tripod) {
    R.bark.rod(foot.x, fy - 0.05, foot.z, fx, fy + 1.55, fz, 0.035, 5, jitterTone(0x9a8a78, rnd, 0.14), { jit: 0.1 });
    claims.add(foot.x, foot.z, 0.12);
  }
  R.vc.tube([[fx, fy + 1.55, fz], [fx + 0.01, fy + 1.2, fz], [fx, fy + 0.95, fz]], 0.01, 4, 0x2a2622);
  R.metal.lathe([0.02, 0, 0.19, 0.03, 0.23, 0.14, 0.2, 0.26, 0.16, 0.3, 0.17, 0.32], 10, fx, fy + 0.62, fz, 0x2a2724, { jit: 0.05 });
  // The warden's seat: a split log he sits astride under his cloak, and his gear set clear of him.
  // He sits across the fire from the camera, so the flames light his hands and the front of his hood.
  const seat = L.warden;
  const sy = restHeight(seat.x, seat.z, 0.6);
  const lg = L.log;
  R.bark.rod(lg.ax, sy + 0.2, lg.az, lg.bx, sy + 0.22, lg.bz, 0.21, 9, jitterTone(0xc4b6a4, rnd, 0.12), { jit: 0.1 });
  claims.line(lg.ax, lg.az, lg.bx, lg.bz, lg.r + 0.07);
  claims.add(seat.x, seat.z, seat.r + 0.12);
  sack(R, rnd, L.sack.x, restHeight(L.sack.x, L.sack.z, 0.3), L.sack.z, 0.9);
  claims.add(L.sack.x, L.sack.z, L.sack.r + 0.04);
  // Bedroll: a rolled blanket strapped with leather, behind him on the right.
  const bed = L.bed;
  const by = Math.min(restHeight(bed.ax, bed.az, 0.2), restHeight(bed.bx, bed.bz, 0.2));
  R.cloth.rod(bed.ax, by + 0.14, bed.az, bed.bx, by + 0.14, bed.bz, 0.17, 10, jitterTone(0x6a4e40, rnd, 0.12), { jit: 0.08 });
  for (const t of [0.25, 0.75]) {
    const x = bed.ax + (bed.bx - bed.ax) * t;
    const z = bed.az + (bed.bz - bed.az) * t;
    R.vc.cyl(0.178, 0.178, 0.05, 10, x, by + 0.14, z, 0x2b2119, { jit: 0.05, rx: Math.PI / 2, ry: Math.atan2(bed.bx - bed.ax, bed.bz - bed.az), caps: false });
  }
  claims.line(bed.ax, bed.az, bed.bx, bed.bz, bed.r + 0.07);
  // His sword stands in the mud off the end of the log, within reach.
  const sw = L.sword;
  plantedSword(R, sw.x, menuHeight(sw.x, sw.z), sw.z, 0.3, -0.08);
  claims.add(sw.x, sw.z, sw.r + 0.02);
  woodpile(R, rnd, L.woodpile.x, L.woodpile.z, -0.7);
  claims.add(L.woodpile.x, L.woodpile.z, L.woodpile.r + 0.05);

  // A Templar waystone by the track: a squared, weathered post with an iron offering bowl and stubs of candle.
  const wx = L.waystone.x;
  const wz = L.waystone.z;
  const wy = restHeight(wx, wz, 0.4);
  R.stone.box(0.42, 1.25, 0.36, wx, wy - 0.25, wz, jitterTone(TINT.stone, rnd, 0.14), { ry: 0.3, rz: 0.05, jit: 0.14, sub: 0.3 });
  R.metal.lathe([0.05, 0, 0.2, 0.05, 0.24, 0.12, 0.23, 0.14], 10, wx, wy + 1.0, wz, 0x4a4540, { jit: 0.05 });
  for (let k = 0; k < 3; k++) R.vc.cyl(0.018, 0.02, 0.06 + rnd() * 0.07, 6, wx + (rnd() - 0.5) * 0.18, wy + 1.04, wz + (rnd() - 0.5) * 0.18, 0xd8ccb0, { jit: 0.05 });
  claims.add(wx, wz, L.waystone.r + 0.1);

  // The standing stones, the fallen one and the dolmen.
  const stones = standingStones();
  for (const s of [...stones.slabs, stones.cap]) {
    const g = slabGeometry(s.spec);
    R.ctx.pushMatrix(s.matrix);
    R.rock.addGeometry(g, null, 0.9 + rnd() * 0.15, 0.05, 1);
    R.ctx.pop();
    g.dispose();
    if (s === stones.cap) continue;
    // Claim the slab's footprint: its corners at ground level, joined up, and its middle.
    const hw = s.spec.w / 2 + 0.15;
    const hd = s.spec.d / 2 + 0.15;
    const len = s.spec.h;
    const corners = s.lying
      ? [[-hw, 0, 0], [hw, 0, 0], [hw, len, 0], [-hw, len, 0]]
      : [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]];
    const w = corners.map(([x, y, z]) => new THREE.Vector3(x, y, z).applyMatrix4(s.matrix));
    for (let i = 0; i < 4; i++) claims.line(w[i]!.x, w[i]!.z, w[(i + 1) % 4]!.x, w[(i + 1) % 4]!.z, 0.25);
    if (s.lying) claims.line((w[0]!.x + w[1]!.x) / 2, (w[0]!.z + w[1]!.z) / 2, (w[2]!.x + w[3]!.x) / 2, (w[2]!.z + w[3]!.z) / 2, hw);
    else {
      const c = w.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(0.25);
      claims.add(c.x, c.z, Math.min(hw, hd));
    }
  }

  // The banner's cairn and guy-rope pegs are built by the banner's hardware callback; their ground is claimed here.
  claims.add(MENU_BANNER.x, MENU_BANNER.z, 0.95);
  for (const [px, pz] of BANNER_PEGS) claims.add(MENU_BANNER.x + px, MENU_BANNER.z + pz, 0.25);

  const doorway = hermitDoor(R, rnd, door.at, door.facing, claims, mats);
  const lanterns = doorway.lights;
  group.add(doorway.group);

  // Field stones along the verges and round the roots, on free ground only.
  for (let i = 0; i < 70; i++) {
    const x = (rnd() - 0.5) * 50;
    const z = 12 - rnd() * 48;
    const s = 0.12 + Math.pow(rnd(), 3) * 0.7;
    const w = s * (0.9 + rnd() * 0.4);
    const yaw = rnd() * 6;
    const lean = (rnd() - 0.5) * 0.3;
    if (z < browZ(x) + 1) continue;
    if (trackDistance(x, z).d < 1.4 || !claims.clear(x, z, Math.max(w, s) * 0.6)) continue;
    stoneAt(R, rnd, x, z, w, s * 0.6, s, yaw, lean, s * 0.25);
    claims.add(x, z, Math.max(w, s) * 0.55);
  }
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2;
    const r = tree.r + 0.8 + rnd() * 3;
    const s = 0.25 + rnd() * 0.45;
    const x = tree.x + Math.cos(a) * r;
    const z = tree.z + Math.sin(a) * r;
    const yaw = rnd() * 6;
    if (!claims.clear(x, z, s * 0.7)) continue;
    stoneAt(R, rnd, x, z, s * 1.3, s * 0.7, s, yaw, 0.1, s * 0.3);
    claims.add(x, z, s * 0.7);
  }
  // Litter trodden into the mud: broken twigs and straw round the camp and along the track, never through anything.
  for (let i = 0; i < 110; i++) {
    const nearCamp = i < 55;
    const x = nearCamp ? fx + (rnd() - 0.5) * 7.5 : (rnd() - 0.5) * 14;
    const z = nearCamp ? fz + (rnd() - 0.5) * 7.5 : 8 - rnd() * 24;
    const a = rnd() * Math.PI;
    const l = 0.12 + rnd() * 0.45;
    const straw = rnd() < 0.45;
    const dy = (rnd() - 0.5) * 0.03;
    const r = straw ? 0.005 : 0.01 + rnd() * 0.012;
    const ex = x + Math.cos(a) * l;
    const ez = z + Math.sin(a) * l;
    if (!nearCamp && trackDistance(x, z).d > 2.6) continue;
    if (!claims.clear(x, z, 0.02) || !claims.clear(ex, ez, 0.02) || !claims.clear((x + ex) / 2, (z + ez) / 2, 0.02)) continue;
    const y = menuHeight(x, z) + 0.012;
    R.bark.rod(x, y, z, ex, menuHeight(ex, ez) + 0.012 + dy, ez, r, 3, straw ? 0xc8b080 : 0x6a5a48, { jit: 0.12, caps: false });
  }

  // The warden: undyed dark wool, hood up, hands to the fire, sitting on the split log.
  const warden = buildCloakedFigure(90417);
  warden.group.position.set(seat.x, sy, seat.z);
  warden.group.rotation.y = Math.atan2(fx - seat.x, fz - seat.z) + 0.15;
  warden.group.name = 'Menu_Warden';
  group.add(warden.group);
  let disposed = false;

  return {
    group,
    warden,
    lanterns,
    keep: claims.keep,
    setDoorAngle(angle: number) {
      if (disposed) return;
      const a = Number.isFinite(angle) ? THREE.MathUtils.clamp(angle, 0, Math.PI / 2) : 0;
      doorway.hinge.rotation.y = -a;
      doorway.group.updateMatrixWorld(true);
      lanterns[1]!.set(HERMIT_DOOR.width / 2, 1.25, 0.315).applyMatrix4(doorway.hinge.matrixWorld);
    },
    update(time: number, _dt: number, amp: number) {
      if (disposed) return;
      warden.update(time, amp);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      warden.dispose();
      doorway.dispose();
    },
  };
}

/** Guy-rope pegs, relative to the standard's foot. */
const BANNER_PEGS: readonly (readonly [number, number])[] = [
  [-3.2, 2.6],
  [2.4, -3.4],
];

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
    R.metal.box(0.14, 0.14, 0.14, bx + 0.02, by + barY - 0.07, bz + 0.1, 0x2a2622);
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
    for (const [ox, oz] of BANNER_PEGS) {
      const px = bx + ox;
      const pz = bz + oz;
      const py = menuHeight(px, pz);
      R.timber.box(0.06, 0.4, 0.06, px, py - 0.2, pz, jitterTone(TINT.woodDark, rnd, 0.1), { rz: 0.3 });
      R.vc.tube([[px, py + 0.15, pz], [(px + bx) / 2, (py + by + poleTop.y * 0.7) / 2 - 0.25, (pz + bz) / 2], [bx, by + poleTop.y * 0.72, bz]], 0.012, 4, TINT.rope);
    }
    // The banner cloth itself is positioned relative to the pole foot by the scene.
  };
}
