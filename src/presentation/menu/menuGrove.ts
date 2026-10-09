import type { TreeCapsules, TreeTrunkShape } from './menuTree';
import {
  MENU_BAND_COUNT,
  MENU_BEAT,
  MENU_FIRST_BEAT,
  createMenuRhythmSample,
  forEachMenuAccent,
  menuBeatTime,
  menuPhraseTime,
  sampleMenuRhythm,
  type MenuRhythmSample,
} from './menuScoreRhythm';

/**
 * The hermitage awakening as physics (A30, reworked for 0.0.7 under A32): at 30 s of the score the door unlatches and
 * swings open on its hinge, and the spirits inside come out one by one on the beat and dance round the ancient tree to
 * the music — tiered rings, a climbing helix, a maypole weave, fireflies along the boughs and in the crown — then file back in before the
 * door thumps shut and the song loops.
 *
 * Everything is a deterministic function of the score's source time. The simulation integrates fixed 1/60 s steps on an
 * absolute grid that starts at the cue, from one fixed initial state, so a seek, a pause, a quality rebuild or a
 * different frame rate all arrive at exactly the same pose; snapshots every two seconds keep a backwards seek short.
 * Coordinates are the tree's own (its root at the origin, its yaw undone): the renderer parents everything to the tree.
 *
 * Each spirit is pulled toward its place in the dance by a damped spring, pushed outward by the score's measured
 * accents, stirred by a flutter that grows with the treble, kept apart from the spirits before it in the line, and kept
 * out of the bark, boughs, roots, hanging lanterns, ground and the swinging door leaf by soft avoidance and, when that is
 * not enough, by collision with a little restitution. Inside the trunk they stay within the carved hollow.
 */

export const GROVE_CUE = 30;
export const GROVE_STEP = 1 / 60;
/** Spirits simulated on every preset; Medium and Low draw the first 28 and 16, which dance exactly as they do on High. */
export const GROVE_MAX_SPIRITS = 40;
/** Perches lean this far round from the view toward the open side of the frame (the tree stands near its left edge). */
const PERCH_TURN = -1.0;
/** Crown perches stop here (tree-local metres): higher, the fireflies would leave the top of the frame. */
const PERCH_TOP = 8.6;
/** The hinge's open stop (radians outward from the closed door). */
export const GROVE_DOOR_OPEN = 1.34;
/** Spirit radius for contact (metres): the bright core plus a little of its glow. */
export const GROVE_SPIRIT_RADIUS = 0.16;
/** Trail samples kept per spirit, every other step (30 Hz). */
export const GROVE_TRAIL = 20;
const SNAPSHOT_STEPS = 120;
const TAU = Math.PI * 2;
const GOLDEN = 2.399963229728653;

/** The first spirit leaves the hollow on this beat (32.75 s, once the door rests open), the rest every half beat. */
const RELEASE_BEAT = 58;
/** They begin to come home on this beat (204.4 s) and pass through the door a sixteenth apart from 205.5 s. */
const RETURN_BEAT = 364;
const ENTRY_BEAT = 366;
/** The door is pushed shut after the last spirit is in (211.7 s). */
const CLOSE_BEAT = 377;
/** When the spirits begin to come home (204.4 s). */
export const GROVE_HOMECOMING = menuBeatTime(RETURN_BEAT);

type Vec3 = [number, number, number];

export interface GroveWorld {
  /** The bole's shape (tree-local), from buildAncientTree. */
  trunk: TreeTrunkShape;
  /** Limbs, boughs and roots (tree-local), from buildAncientTree. */
  capsules: TreeCapsules;
  /** Leafy twig ends (tree-local), from buildAncientTree. */
  leafSites: readonly Vec3[];
  /** Ground height under a tree-local point, tree-local metres. */
  ground(x: number, z: number): number;
  /** The door's flat face (tree-local): its foot centre and outward normal. */
  door: { origin: Vec3; normal: Vec3 };
  /** Aperture size, hinge pin offset in front of the face, and the carved hollow behind it (door frame). */
  aperture: { width: number; height: number; hingeZ: number };
  hollow: { tunnelDepth: number; halfWidth: number; height: number; depth: number };
  /** Hanging lanterns (tree-local centres) to keep clear of. */
  lanterns: readonly Vec3[];
  /** Points along the two low boughs (tree-local) and their radii, where fireflies may flit among the rags. */
  boughs?: readonly { p: Vec3; r: number }[];
}

export const GroveFormation = { Helix: 0, Rings: 1, Maypole: 2, Fireflies: 3 } as const;
export type GroveFormation = (typeof GroveFormation)[keyof typeof GroveFormation];

/** Phrase-by-phrase choreography (phrase 1 starts at 33.9 s). The opening release climbs; the rest alternates. */
const PHRASE_FORMATIONS: readonly GroveFormation[] = [
  GroveFormation.Helix, // phrase 0 (before the cue; unused)
  GroveFormation.Helix, // 33.9 s
  GroveFormation.Rings, // 51.8 s
  GroveFormation.Maypole, // 69.8 s
  GroveFormation.Rings, // 87.7 s
  GroveFormation.Fireflies, // 105.7 s
  GroveFormation.Helix, // 123.6 s
  GroveFormation.Maypole, // 141.5 s
  GroveFormation.Rings, // 159.5 s
  GroveFormation.Maypole, // 177.4 s
  GroveFormation.Helix, // 195.4 s
];

export function groveFormationAt(phrase: number): GroveFormation {
  const p = Math.floor(phrase);
  return PHRASE_FORMATIONS[Math.max(0, Math.min(PHRASE_FORMATIONS.length - 1, p))]!;
}

const unit = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Math.hypot is several times slower than this in V8, and the simulation calls it for every spirit on every step. */
const len2 = (a: number, b: number) => Math.sqrt(a * a + b * b);
const len3 = (a: number, b: number, c: number) => Math.sqrt(a * a + b * b + c * c);
const smooth = (a: number, b: number, x: number) => {
  const t = unit((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** A deterministic hash in [0, 1). */
const hash = (a: number, b: number) => {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const BAND_ORDER = [1, 3, 5, 0, 2, 4] as const;
/** Band each spirit listens to: interleaved, so any prefix of the line hears the whole spectrum. */
export function groveSpiritBand(i: number): number {
  return BAND_ORDER[i % MENU_BAND_COUNT]!;
}
const RING_HEIGHT = [1.55, 3.35, 5.75] as const;
const RING_TURN = [1 / 24, -1 / 16, 1 / 20] as const;
const RING_HOP = [0.55, 0.42, 0.36] as const;
const RING_GAP = [1.0, 1.05, 1.5] as const;
/** Tier of the dance (0 roots, 1 bole, 2 crown) from the band: low notes dance low. */
const tierOf = (band: number) => (band < 2 ? 0 : band < 4 ? 1 : 2);

export interface GroveState {
  /** Interpolated spirit positions (tree-local), velocities and contact flashes at the last advanceTo time. */
  readonly position: Float64Array;
  readonly velocity: Float64Array;
  readonly bump: Float64Array;
  /** 0 inside the hollow, 1 well outside the bark; for light that must not shine through the wood. */
  readonly outside: Float64Array;
  /** Trail ring per spirit: GROVE_TRAIL samples × xyz, newest at `trailHead`. */
  readonly trail: Float64Array;
  readonly trailHead: number;
  /** Steps since the cue of the newest trail sample (for stable per-sample sparkle seeds). */
  readonly trailStep: number;
  /** Hinge angle (radians, outward). */
  readonly doorAngle: number;
  /** Song time of the pose, and whether the hollow is awake (after the cue). */
  readonly time: number;
  readonly awake: boolean;
  readonly rhythm: MenuRhythmSample;
}

export interface MenuGrove extends GroveState {
  readonly count: number;
  /** Simulate (or restore) to this absolute song time. Repeating a time changes nothing. */
  advanceTo(time: number): void;
  /** Door frame helpers for the renderer and tests. */
  doorToTree(x: number, y: number, z: number, out: Vec3): Vec3;
  treeToDoor(x: number, y: number, z: number, out: Vec3): Vec3;
  /** Signed clearance (metres) from a tree-local point to the nearest wood or ground; negative inside. */
  clearance(x: number, y: number, z: number): number;
  /** True when a tree-local point is within the doorway tunnel or the hollow. */
  inHollow(x: number, y: number, z: number): boolean;
  stats: { steps: number; restores: number };
  /** The leaves its spirits perch on, so a rebuild hands it over only for the same tree (A70). */
  readonly leafSites: readonly Vec3[];
}

interface Snapshot {
  step: number;
  pos: Float64Array;
  vel: Float64Array;
  bump: Float64Array;
  door: [number, number, number];
}

export function createMenuGrove(world: GroveWorld, count: number): MenuGrove {
  const n = Math.max(1, Math.min(GROVE_MAX_SPIRITS, Math.floor(count)));
  const shape = world.trunk;
  const rings = shape.rings;
  const segs = shape.segments;
  const ringY0 = shape.centres[1]!;
  const ringY1 = shape.centres[rings * 3 + 1]!;
  // The widest the bole reaches at each ring, for dances that must clear its buttresses.
  const ringMax = new Float64Array(rings + 1);
  for (let r = 0; r <= rings; r++) {
    let m = 0;
    for (let s = 0; s < segs; s++) m = Math.max(m, shape.radii[r * segs + s]!);
    ringMax[r] = m;
  }

  // ---- Ground, sampled once on a fine grid round the tree (the height field is costly to evaluate every step) -------
  const GROUND_SPAN = 13;
  const GROUND_CELL = 0.25;
  const groundN = Math.round((2 * GROUND_SPAN) / GROUND_CELL) + 1;
  const groundGrid = new Float32Array(groundN * groundN);
  for (let j = 0; j < groundN; j++) {
    for (let i = 0; i < groundN; i++) groundGrid[j * groundN + i] = world.ground(-GROUND_SPAN + i * GROUND_CELL, -GROUND_SPAN + j * GROUND_CELL);
  }
  const groundAt = (x: number, z: number) => {
    const fx = (x + GROUND_SPAN) / GROUND_CELL;
    const fz = (z + GROUND_SPAN) / GROUND_CELL;
    if (fx < 0 || fz < 0 || fx >= groundN - 1 || fz >= groundN - 1) return groundAt(x, z);
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fx - i;
    const v = fz - j;
    const a = groundGrid[j * groundN + i]!;
    const b = groundGrid[j * groundN + i + 1]!;
    const c = groundGrid[(j + 1) * groundN + i]!;
    const d = groundGrid[(j + 1) * groundN + i + 1]!;
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  // ---- Door frame -------------------------------------------------------------------------------------------------
  const o = world.door.origin;
  const nx = world.door.normal[0];
  const nz = world.door.normal[2];
  const tx = nz;
  const tz = -nx;
  const doorToTree = (x: number, y: number, z: number, out: Vec3): Vec3 => {
    out[0] = o[0] + tx * x + nx * z;
    out[1] = o[1] + y;
    out[2] = o[2] + tz * x + nz * z;
    return out;
  };
  const treeToDoor = (x: number, y: number, z: number, out: Vec3): Vec3 => {
    const dx = x - o[0];
    const dz = z - o[2];
    out[0] = dx * tx + dz * tz;
    out[1] = y - o[1];
    out[2] = dx * nx + dz * nz;
    return out;
  };
  const W = world.aperture.width;
  const H = world.aperture.height;
  const hollow = world.hollow;
  const R = GROVE_SPIRIT_RADIUS;
  /** The chamber as the spirits feel it: an ellipsoid just inside the carved walls. */
  const chamber = { cx: 0, cy: 1.02, cz: -(hollow.tunnelDepth + hollow.depth) / 2 - 0.05, rx: 0.6, ry: 0.92, rz: 0.55 };
  const inHollowDoor = (dx: number, dy: number, dz: number) =>
    dz < 0.12 && dz > -hollow.depth - 0.1 && dy > -0.2 && dy < hollow.height + 0.1 && Math.abs(dx) < (dz > -hollow.tunnelDepth ? W / 2 + 0.05 : hollow.halfWidth + 0.1);
  /** In front of the aperture, where the bark has been cut away: the face must not stop a spirit going in or out. */
  const inDoorway = (dx: number, dy: number, dz: number) => Math.abs(dx) < W / 2 + 0.02 && dy > -0.1 && dy < H + 0.05 && dz > -0.5 && dz < 0.75;
  const scratch: Vec3 = [0, 0, 0];
  const inHollow = (x: number, y: number, z: number) => {
    treeToDoor(x, y, z, scratch);
    return inHollowDoor(scratch[0], scratch[1], scratch[2]);
  };

  // ---- Trunk lookup -----------------------------------------------------------------------------------------------
  const trunkHit = { cx: 0, cz: 0, r: 0 };
  /** Bark radius and ring centre at a height and around a point; false above the fork or below the roots. */
  const trunkAt = (x: number, y: number, z: number): boolean => {
    if (y <= ringY0 || y >= ringY1) return false;
    const f = ((y - ringY0) / (ringY1 - ringY0)) * rings;
    const r0 = Math.min(rings - 1, Math.floor(f));
    const fr = f - r0;
    const c0 = r0 * 3;
    const c1 = (r0 + 1) * 3;
    const cx = shape.centres[c0]! + (shape.centres[c1]! - shape.centres[c0]!) * fr;
    const cz = shape.centres[c0 + 2]! + (shape.centres[c1 + 2]! - shape.centres[c0 + 2]!) * fr;
    let a = Math.atan2(z - cz, x - cx);
    if (a < 0) a += TAU;
    const sf = (a / TAU) * segs;
    const s0 = Math.floor(sf) % segs;
    const s1 = (s0 + 1) % segs;
    const fs = sf - Math.floor(sf);
    const ra = shape.radii[r0 * segs + s0]! + (shape.radii[r0 * segs + s1]! - shape.radii[r0 * segs + s0]!) * fs;
    const rb = shape.radii[(r0 + 1) * segs + s0]! + (shape.radii[(r0 + 1) * segs + s1]! - shape.radii[(r0 + 1) * segs + s0]!) * fs;
    trunkHit.cx = cx;
    trunkHit.cz = cz;
    trunkHit.r = ra + (rb - ra) * fr;
    return true;
  };
  /** The bole's axis and widest radius at a height, for laying out the dance. */
  const axis = { x: 0, z: 0, r: 0 };
  const axisAt = (y: number) => {
    const yy = Math.max(ringY0, Math.min(ringY1, y));
    const f = ((yy - ringY0) / (ringY1 - ringY0)) * rings;
    const r0 = Math.min(rings - 1, Math.floor(f));
    const fr = f - r0;
    axis.x = shape.centres[r0 * 3]! + (shape.centres[(r0 + 1) * 3]! - shape.centres[r0 * 3]!) * fr;
    axis.z = shape.centres[r0 * 3 + 2]! + (shape.centres[(r0 + 1) * 3 + 2]! - shape.centres[r0 * 3 + 2]!) * fr;
    axis.r = ringMax[r0]! + (ringMax[r0 + 1]! - ringMax[r0]!) * fr;
    if (y > ringY1) axis.r = Math.max(0.8, axis.r - (y - ringY1) * 0.4);
  };

  // ---- Capsules, with a coarse grid so each query looks at a handful -------------------------------------------------
  const caps = world.capsules;
  const capCount = Math.floor(caps.length / 8);
  const CELL = 1.5;
  // Avoidance reaches 0.45 m beyond a spirit's own radius; nothing further away needs listing.
  const MARGIN = 0.75;
  const cells = new Map<number, number[]>();
  const key = (i: number, j: number, k: number) => (i + 512) * 1048576 + (j + 512) * 1024 + (k + 512);
  for (let c = 0; c < capCount; c++) {
    const b = c * 8;
    const r = Math.max(caps[b + 6]!, caps[b + 7]!) + MARGIN;
    const lo = [Math.min(caps[b]!, caps[b + 3]!) - r, Math.min(caps[b + 1]!, caps[b + 4]!) - r, Math.min(caps[b + 2]!, caps[b + 5]!) - r];
    const hi = [Math.max(caps[b]!, caps[b + 3]!) + r, Math.max(caps[b + 1]!, caps[b + 4]!) + r, Math.max(caps[b + 2]!, caps[b + 5]!) + r];
    for (let i = Math.floor(lo[0]! / CELL); i <= Math.floor(hi[0]! / CELL); i++) {
      for (let j = Math.floor(lo[1]! / CELL); j <= Math.floor(hi[1]! / CELL); j++) {
        for (let k = Math.floor(lo[2]! / CELL); k <= Math.floor(hi[2]! / CELL); k++) {
          const id = key(i, j, k);
          const list = cells.get(id);
          if (list) list.push(c);
          else cells.set(id, [c]);
        }
      }
    }
  }
  const EMPTY: number[] = [];
  const capsulesNear = (x: number, y: number, z: number) => cells.get(key(Math.floor(x / CELL), Math.floor(y / CELL), Math.floor(z / CELL))) ?? EMPTY;
  /** Nearest surface point of capsule c to p: writes the outward normal into `nrm` and returns the signed distance. */
  const nrm: Vec3 = [0, 0, 0];
  const capsuleDistance = (c: number, x: number, y: number, z: number): number => {
    const b = c * 8;
    const ax = caps[b]!;
    const ay = caps[b + 1]!;
    const az = caps[b + 2]!;
    const ex = caps[b + 3]! - ax;
    const ey = caps[b + 4]! - ay;
    const ez = caps[b + 5]! - az;
    const l2 = ex * ex + ey * ey + ez * ez || 1e-9;
    const u = unit(((x - ax) * ex + (y - ay) * ey + (z - az) * ez) / l2);
    const qx = x - (ax + ex * u);
    const qy = y - (ay + ey * u);
    const qz = z - (az + ez * u);
    const d = len3(qx, qy, qz) || 1e-9;
    nrm[0] = qx / d;
    nrm[1] = qy / d;
    nrm[2] = qz / d;
    return d - (caps[b + 6]! + (caps[b + 7]! - caps[b + 6]!) * u);
  };

  // ---- Perches for the fireflies: the lower crown, and along the low boughs among the pilgrims' rags --------------------
  // Two sets, each chained to its own nearest neighbours: even spirits flit along the boughs, odd ones through the crown.
  // Both lean round from the view toward the open side of the frame (the tree stands near its left edge).
  const crownPerches: number[] = [];
  const boughPerches: number[] = [];
  {
    axisAt(ringY1);
    const top = { x: axis.x, z: axis.z };
    const view = Math.atan2(nz, nx) + 0.27 + PERCH_TURN;
    for (const s of world.leafSites) {
      if (s[1] < 5.6 || s[1] > PERCH_TOP) continue;
      // Sit just outside the leaves, a little out from the crown's middle; the far ends of the long limbs are out of reach.
      const dx = s[0] - top.x;
      const dz = s[2] - top.z;
      const d = len2(dx, dz) || 1;
      if (d > 7.2 || Math.cos(Math.atan2(dz, dx) - view) < 0.3) continue;
      if (crownPerches.length < 3 * 48) crownPerches.push(s[0] + (dx / d) * 0.55, s[1] - 0.25, s[2] + (dz / d) * 0.55);
    }
    axisAt(2);
    for (const b of world.boughs ?? []) {
      const dx = b.p[0] - axis.x;
      const dz = b.p[2] - axis.z;
      if (Math.cos(Math.atan2(dz, dx) - view) < 0) continue;
      for (const side of [-1, 1]) {
        const y = b.p[1] + side * (b.r + 0.5);
        if (y < groundAt(b.p[0], b.p[2]) + 1.1) continue;
        if (boughPerches.length < 3 * 48) boughPerches.push(b.p[0], y, b.p[2]);
      }
    }
    for (const list of [crownPerches, boughPerches]) {
      if (list.length === 0) for (let k = 0; k < 8; k++) list.push(top.x + Math.cos(k) * 4, list === crownPerches ? 7.5 : 2.6, top.z + Math.sin(k) * 4);
    }
  }
  const perches = [...boughPerches, ...crownPerches];
  const groupStart = [0, boughPerches.length / 3];
  const groupCount = [boughPerches.length / 3, crownPerches.length / 3];
  const perchCount = perches.length / 3;
  // Each perch's few nearest neighbours in its own set: a hop stays short and seldom crosses a limb.
  const NEIGHBOURS = 5;
  const neighbours = new Int32Array(perchCount * NEIGHBOURS);
  for (let g = 0; g < 2; g++) {
    for (let a = groupStart[g]!; a < groupStart[g]! + groupCount[g]!; a++) {
      const d: [number, number][] = [];
      for (let b = groupStart[g]!; b < groupStart[g]! + groupCount[g]!; b++) {
        if (b === a) continue;
        d.push([len3(perches[a * 3]! - perches[b * 3]!, perches[a * 3 + 1]! - perches[b * 3 + 1]!, perches[a * 3 + 2]! - perches[b * 3 + 2]!), b]);
      }
      d.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      for (let k = 0; k < NEIGHBOURS; k++) neighbours[a * NEIGHBOURS + k] = d[Math.min(k, d.length - 1)]?.[1] ?? a;
    }
  }
  /** The perch a firefly sits on after hop hops of the current phrase: a chain of short jumps from a seeded start. */
  const perchAfter = (i: number, phraseIndex: number, hop: number) => {
    const g = i % 2;
    let at = groupStart[g]! + Math.floor(hash(i, phraseIndex * 7.13) * groupCount[g]!);
    for (let k = 0; k < hop; k++) at = neighbours[at * NEIGHBOURS + Math.floor(hash(i * 3 + k, phraseIndex) * NEIGHBOURS)]!;
    return at;
  };

  // ---- Choreography ---------------------------------------------------------------------------------------------------
  // The side of the tree facing the camera, so the dance is laid out to be seen.
  const doorAz = Math.atan2(nz, nx);
  const front = doorAz + 0.27;
  const releaseTime = (i: number) => menuBeatTime(RELEASE_BEAT + i * 0.5);
  const entryTime = (i: number) => menuBeatTime(ENTRY_BEAT + i * 0.25);
  const returnStart = menuBeatTime(RETURN_BEAT);
  /** Inside the hollow before release and after return: a slow swirl round the chamber's middle. */
  const insideTarget = (i: number, t: number, out: Vec3): Vec3 => {
    const a = i * GOLDEN + t * (1.6 + (i % 3) * 0.25);
    const r = 0.18 + 0.2 * hash(i, 3);
    return doorToTree(chamber.cx + Math.cos(a) * r * 1.3, chamber.cy + Math.sin(t * 1.3 + i * 1.7) * 0.42, chamber.cz + Math.sin(a) * r, out);
  };
  const band = (i: number, rh: MenuRhythmSample) => rh.bands[groveSpiritBand(i)]!;
  /** Bounce: down on the beat, up between beats, scaled by the spirit's band. */
  const bounce = (phase: number) => 4 * phase * (1 - phase);
  const place = (cx: number, cz: number, angle: number, radius: number, y: number, out: Vec3) => {
    out[0] = cx + Math.cos(angle) * radius;
    out[1] = y;
    out[2] = cz + Math.sin(angle) * radius;
    return out;
  };
  const formationTarget = (f: GroveFormation, i: number, rh: MenuRhythmSample, out: Vec3): Vec3 => {
    const level = band(i, rh);
    const beats = rh.beat;
    const tier = tierOf(groveSpiritBand(i));
    const slot = i * GOLDEN;
    const breathe = 0.45 * rh.bands[0]! * Math.exp(-rh.barPhase * 6);
    switch (f) {
      case GroveFormation.Rings: {
        const y = RING_HEIGHT[tier]!;
        const turn = RING_TURN[tier]!;
        const hop = RING_HOP[tier]! * (0.35 + level) * bounce(tier === 1 ? (rh.beatPhase + 0.5) % 1 : rh.beatPhase);
        axisAt(y);
        const radius = axis.r + RING_GAP[tier]! + breathe + 0.35 * level;
        return place(axis.x, axis.z, slot + TAU * beats * turn, radius, y + hop, out);
      }
      case GroveFormation.Helix: {
        // Two strands wind up and down the bole like a barber's pole; a ping-pong keeps every spirit on its strand.
        const u0 = (i / GROVE_MAX_SPIRITS + beats / 48) % 2;
        const u = u0 < 1 ? u0 : 2 - u0;
        const y = 1.0 + u * 5.2 + 0.25 * level * bounce(rh.beatPhase);
        axisAt(y);
        const angle = front + (i % 2) * Math.PI + (y - 1) * (TAU / 3.4) + TAU * beats / 24;
        return place(axis.x, axis.z, angle, axis.r + 0.9 + 0.35 * level + breathe, y, out);
      }
      case GroveFormation.Maypole: {
        // Two circles of dancers go opposite ways, weaving in and out of each other round the bole.
        const dir = i % 2 ? -1 : 1;
        const angle = slot + dir * TAU * beats / 24;
        const y = 2.3 + 0.6 * Math.sin(angle * 2 + i) + 0.35 * (0.4 + level) * bounce(rh.beatPhase);
        axisAt(y);
        const weave = 0.75 * Math.sin(6 * angle) * dir;
        return place(axis.x, axis.z, angle, axis.r + 1.35 + weave + breathe, y, out);
      }
      case GroveFormation.Fireflies: {
        // Hop from perch to perch (along the boughs or through the crown) every two beats, with an arc on each jump.
        const phraseIndex = Math.floor(rh.phrase);
        const sinceStart = beats - (menuPhraseTime(phraseIndex) - MENU_FIRST_BEAT) / MENU_BEAT;
        const hops = sinceStart / 2 + hash(i, 11) * 0.5;
        const k = Math.floor(hops);
        const phase = hops - k;
        const a = perchAfter(i, phraseIndex, Math.max(0, k));
        const b = perchAfter(i, phraseIndex, Math.max(0, k + 1));
        const e = smooth(0, 0.45, phase);
        const lift = Math.sin(Math.PI * e) * 0.6 + 0.2 * level;
        out[0] = perches[a * 3]! + (perches[b * 3]! - perches[a * 3]!) * e;
        out[1] = perches[a * 3 + 1]! + (perches[b * 3 + 1]! - perches[a * 3 + 1]!) * e + lift;
        out[2] = perches[a * 3 + 2]! + (perches[b * 3 + 2]! - perches[a * 3 + 2]!) * e;
        return out;
      }
    }
  };
  const blendA: Vec3 = [0, 0, 0];
  const blendB: Vec3 = [0, 0, 0];
  const pathA: Vec3 = [0, 0, 0];
  const pathB: Vec3 = [0, 0, 0];
  const copy3 = (a: Vec3, out: Vec3) => {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
  };
  const lerp3 = (a: Vec3, b: Vec3, w: number, out: Vec3) => {
    out[0] = a[0] + (b[0] - a[0]) * w;
    out[1] = a[1] + (b[1] - a[1]) * w;
    out[2] = a[2] + (b[2] - a[2]) * w;
    return out;
  };
  /** Where spirit i dances at time t: its phrase's formation, blended from the previous one over the phrase's first bar. */
  const danceTarget = (i: number, t: number, rh: MenuRhythmSample, out: Vec3): Vec3 => {
    const phrase = Math.max(1, rh.phrase);
    const f = groveFormationAt(phrase);
    const start = menuPhraseTime(Math.floor(phrase));
    const w = smooth(0, 4 * MENU_BEAT, t - start);
    if (w >= 1 || Math.floor(phrase) <= 1) return formationTarget(f, i, rh, out);
    formationTarget(groveFormationAt(phrase - 1), i, rh, blendA);
    formationTarget(f, i, rh, blendB);
    return lerp3(blendA, blendB, w, out);
  };
  const target = (i: number, t: number, rh: MenuRhythmSample, out: Vec3): Vec3 => {
    const release = releaseTime(i);
    if (t < release) return insideTarget(i, t, out);
    if (t >= release + 2.6 && t < returnStart) return danceTarget(i, t, rh, out);
    const entry = entryTime(i);
    if (t >= entry + 0.7) return insideTarget(i, t, out);
    // Out through the doorway: chamber → threshold → a step in front, then into the dance.
    const out1 = smooth(release, release + 0.7, t);
    insideTarget(i, t, pathA);
    doorToTree(0.1, 1.0 + (i % 3) * 0.1, out1 * 1.6, pathB);
    lerp3(pathA, pathB, smooth(0, 0.35, t - release), pathA);
    if (t < returnStart) {
      const join = smooth(release + 0.5, release + 2.6, t);
      if (join <= 0) return copy3(pathA, out);
      danceTarget(i, t, rh, blendB);
      return lerp3(pathA, blendB, join, out);
    }
    // Home: from the dance into a wide spinning ring before the door (on the side away from the open leaf). Each spirit
    // keeps its place in the ring until its turn is near, spirals in to the doorstep, and goes in on its sixteenth.
    const tighten = 1 - smooth(0, 1.4, entry - t);
    const a = i * GOLDEN + (t - returnStart) * 1.5;
    const r = 0.55 + 1.3 * (1 - tighten);
    doorToTree(0.55 + Math.cos(a) * r * 0.85, 1.35 + Math.sin(a) * r * 0.6, 1.4 - 0.35 * tighten + 0.4 * Math.sin(a * 2 + i) * (1 - tighten), pathB);
    danceTarget(i, t, rh, blendB);
    lerp3(blendB, pathB, smooth(returnStart, returnStart + 2.2, t), blendA);
    if (t < entry - 0.3) return copy3(blendA, out);
    doorToTree(0.1, 1.0, 0.5, pathB);
    if (t < entry + 0.1) return lerp3(blendA, pathB, smooth(entry - 0.3, entry + 0.1, t), out);
    insideTarget(i, t, pathA);
    return lerp3(pathB, pathA, smooth(entry + 0.1, entry + 0.7, t), out);
  };

  // ---- State --------------------------------------------------------------------------------------------------------
  const pos = new Float64Array(n * 3);
  const vel = new Float64Array(n * 3);
  const prev = new Float64Array(n * 3);
  const bumps = new Float64Array(n);
  const prevBumps = new Float64Array(n);
  const tgt = new Float64Array(n * 3);
  const trail = new Float64Array(n * GROVE_TRAIL * 3);
  let trailHead = 0;
  let trailStep = 0;
  let step = -1; // -1: asleep (before the cue)
  let doorAngle = 0;
  let doorVel = 0;
  let doorLatched = 1;
  let prevDoor = 0;
  const snapshots: (Snapshot | undefined)[] = [];
  const rh = createMenuRhythmSample();
  const rhNext = createMenuRhythmSample();
  const v3: Vec3 = [0, 0, 0];
  const timeOf = (k: number) => GROVE_CUE + k * GROVE_STEP;

  const reset = () => {
    step = 0;
    sampleMenuRhythm(GROVE_CUE, rh);
    for (let i = 0; i < n; i++) {
      target(i, GROVE_CUE, rh, v3);
      pos.set(v3, i * 3);
      prev.set(v3, i * 3);
      tgt.set(v3, i * 3);
      vel[i * 3] = vel[i * 3 + 1] = vel[i * 3 + 2] = 0;
      bumps[i] = prevBumps[i] = 0;
      for (let k = 0; k < GROVE_TRAIL; k++) trail.set(v3, (i * GROVE_TRAIL + k) * 3);
    }
    trailHead = 0;
    trailStep = 0;
    // The latch gives and the spirits' press starts the heavy door's swing.
    doorAngle = prevDoor = 0;
    doorVel = 0.3;
    doorLatched = 0;
  };

  const save = () => {
    const index = step / SNAPSHOT_STEPS;
    if (!Number.isInteger(index) || snapshots[index]) return;
    snapshots[index] = { step, pos: pos.slice(), vel: vel.slice(), bump: bumps.slice(), door: [doorAngle, doorVel, doorLatched] };
  };
  const restore = (s: Snapshot) => {
    step = s.step;
    pos.set(s.pos);
    prev.set(s.pos);
    vel.set(s.vel);
    bumps.set(s.bump);
    prevBumps.set(s.bump);
    [doorAngle, doorVel, doorLatched] = s.door;
    prevDoor = doorAngle;
    const t = timeOf(step);
    sampleMenuRhythm(t, rh);
    for (let i = 0; i < n; i++) {
      target(i, t, rh, v3);
      tgt.set(v3, i * 3);
    }
    // The trail is rebuilt by simulating at least its length from here; mark it as a single point meanwhile.
    for (let i = 0; i < n; i++) for (let k = 0; k < GROVE_TRAIL; k++) trail.set(pos.subarray(i * 3, i * 3 + 3), (i * GROVE_TRAIL + k) * 3);
    trailHead = (step / 2) % GROVE_TRAIL;
    trailStep = step;
  };

  // ---- One fixed step -------------------------------------------------------------------------------------------------
  const dd: Vec3 = [0, 0, 0];
  const scratchGoal: Vec3 = [0, 0, 0];
  const advanceDoor = (t: number) => {
    prevDoor = doorAngle;
    if (doorLatched) return;
    // A heavy oak leaf: pushed open from within it swings out over a couple of seconds, knocks against its stop and rests
    // there; at the end it is drawn shut, lands against the frame with a small rebound and latches.
    const closing = t >= menuBeatTime(CLOSE_BEAT);
    const shut = 1 - smooth(menuBeatTime(CLOSE_BEAT), menuBeatTime(CLOSE_BEAT) + 0.5, t);
    const goal = (GROVE_DOOR_OPEN + 0.1) * shut - 0.08 * (1 - shut);
    const k = closing ? 7 : 1.05;
    const c = closing ? 2.2 : 0.85;
    doorVel += (k * (goal - doorAngle) - c * doorVel) * GROVE_STEP;
    doorAngle += doorVel * GROVE_STEP;
    if (doorAngle >= GROVE_DOOR_OPEN) {
      // Against the stop: a knock and a small rebound, then it rests there exactly.
      doorAngle = GROVE_DOOR_OPEN;
      doorVel = doorVel > 0.05 ? -0.3 * doorVel : Math.min(0, doorVel);
    }
    if (doorAngle <= 0 && closing) {
      doorAngle = 0;
      doorVel = doorVel < -0.12 ? -0.25 * doorVel : 0;
      if (doorVel === 0) doorLatched = 1;
    }
  };

  const K_DANCE = 30;
  const C_DANCE = 7.5;
  const K_PATH = 70;
  const C_PATH = 14;
  const V_MAX = 9;
  const A_MAX = 160;
  const stepOnce = () => {
    const t0 = timeOf(step);
    const t1 = timeOf(step + 1);
    sampleMenuRhythm(t1, rhNext);
    advanceDoor(t1);
    const treble = 0.5 * (rhNext.bands[4]! + rhNext.bands[5]!);
    // Accents that fall in this step push every spirit outward from the bole.
    let kick = 0;
    forEachMenuAccent(t0, t1, (_, s) => { kick += s; });
    for (let i = 0; i < n; i++) {
      const b = i * 3;
      prev[b] = pos[b]!;
      prev[b + 1] = pos[b + 1]!;
      prev[b + 2] = pos[b + 2]!;
      prevBumps[i] = bumps[i]!;
      target(i, t1, rhNext, v3);
      const tvx = (v3[0] - tgt[b]!) / GROVE_STEP;
      const tvy = (v3[1] - tgt[b + 1]!) / GROVE_STEP;
      const tvz = (v3[2] - tgt[b + 2]!) / GROVE_STEP;
      tgt[b] = v3[0];
      tgt[b + 1] = v3[1];
      tgt[b + 2] = v3[2];
      let x = pos[b]!;
      let y = pos[b + 1]!;
      let z = pos[b + 2]!;
      let vx = vel[b]!;
      let vy = vel[b + 1]!;
      let vz = vel[b + 2]!;
      treeToDoor(x, y, z, dd);
      const inside = inHollowDoor(dd[0], dd[1], dd[2]);
      const doorway = inDoorway(dd[0], dd[1], dd[2]);
      const pathing = t1 < releaseTime(i) + 1.2 || t1 > entryTime(i) - 0.6;
      const k = pathing ? K_PATH : K_DANCE;
      const c = pathing ? C_PATH : C_DANCE;
      let gx = v3[0];
      let gy = v3[1];
      let gz = v3[2];
      let fx = tvx;
      let fy = tvy;
      let fz = tvz;
      if (inside) {
        // Inside the hollow with somewhere to be outside it: the only way out is the doorway — to the tunnel's mouth,
        // then through it.
        treeToDoor(gx, gy, gz, scratchGoal);
        if (!inHollowDoor(scratchGoal[0], scratchGoal[1], scratchGoal[2])) {
          if (dd[2] < -hollow.tunnelDepth - 0.05) doorToTree(0, Math.max(0.45, Math.min(1.35, dd[1])), -hollow.tunnelDepth + 0.05, scratchGoal);
          else doorToTree(0.05, 1.0, 0.7, scratchGoal);
          gx = scratchGoal[0];
          gy = scratchGoal[1];
          gz = scratchGoal[2];
          fx = fy = fz = 0;
        }
      } else if (doorway) {
        // On the doorstep with somewhere else to be: step straight out from the face first, then find the way round.
        treeToDoor(gx, gy, gz, scratchGoal);
        if (!inHollowDoor(scratchGoal[0], scratchGoal[1], scratchGoal[2]) && scratchGoal[2] < 1.0) {
          doorToTree(dd[0] * 0.5, Math.max(0.6, Math.min(1.5, dd[1])), 1.05, scratchGoal);
          gx = scratchGoal[0];
          gy = scratchGoal[1];
          gz = scratchGoal[2];
          fx = fy = fz = 0;
        }
      } else if (y < ringY1 + 0.8) {
        // The way round: if the straight line to the goal runs through the bole, fly round it on the shorter side.
        axisAt(y);
        const wx = x - axis.x;
        const wz = z - axis.z;
        const ex = gx - axis.x;
        const ez = gz - axis.z;
        const sx = ex - wx;
        const sz = ez - wz;
        const s2 = sx * sx + sz * sz || 1e-9;
        const u = unit(-(wx * sx + wz * sz) / s2);
        const miss = len2(wx + sx * u, wz + sz * u);
        const reach = axis.r + 0.35;
        if (miss < reach && u > 0.02 && u < 0.98) {
          const aw = Math.atan2(wz, wx);
          let turn = Math.atan2(ez, ex) - aw;
          turn = Math.atan2(Math.sin(turn), Math.cos(turn));
          const rr = Math.max(len2(wx, wz), axis.r + 0.95);
          const step = Math.sign(turn || 1) * Math.min(Math.abs(turn), 0.75);
          gx = axis.x + Math.cos(aw + step) * rr;
          gz = axis.z + Math.sin(aw + step) * rr;
          gy = y + (gy - y) * 0.3;
          fx = fy = fz = 0;
        }
      }
      let ax = k * (gx - x) + c * (fx - vx);
      let ay = k * (gy - y) + c * (fy - vy);
      let az = k * (gz - z) + c * (fz - vz);
      if (!inside) {
        // Flutter: a slow, smooth stir that grows with the treble.
        const f = 3.5 + 9 * treble;
        ax += f * Math.sin(t1 * 2.3 + i * 1.91 + y * 0.8);
        ay += f * 0.6 * Math.sin(t1 * 1.7 + i * 2.73 + x * 0.6);
        az += f * Math.cos(t1 * 2.1 + i * 0.77 + z * 0.7);
        // One-way separation: a spirit gives way to those ahead of it in the line, so any prefix dances unchanged.
        for (let j = 0; j < i; j++) {
          const qx = x - pos[j * 3]!;
          const qy = y - pos[j * 3 + 1]!;
          const qz = z - pos[j * 3 + 2]!;
          const d2 = qx * qx + qy * qy + qz * qz;
          if (d2 < 0.36 && d2 > 1e-10) {
            const d = Math.sqrt(d2);
            const push = 55 * (0.6 - d) / d;
            ax += qx * push;
            ay += qy * push;
            az += qz * push;
          }
        }
        // Soft avoidance of the bark and limbs ahead of contact (not of the open doorway itself).
        if (!doorway && trunkAt(x, y, z)) {
          const qx = x - trunkHit.cx;
          const qz = z - trunkHit.cz;
          const d = len2(qx, qz) || 1e-9;
          const gap = d - trunkHit.r - R;
          if (gap < 0.6) {
            const push = 85 * (0.6 - gap);
            ax += (qx / d) * push;
            az += (qz / d) * push;
          }
        }
        for (const cap of capsulesNear(x, y, z)) {
          const gap = capsuleDistance(cap, x, y, z) - R;
          if (gap < 0.55) {
            const push = 95 * (0.55 - gap);
            ax += nrm[0] * push;
            ay += nrm[1] * push;
            az += nrm[2] * push;
          }
        }
        const g = groundAt(x, z) + 0.35;
        if (y < g + 0.4) ay += 50 * (g + 0.4 - y);
      }
      const am = len3(ax, ay, az);
      if (am > A_MAX) {
        ax *= A_MAX / am;
        ay *= A_MAX / am;
        az *= A_MAX / am;
      }
      vx += ax * GROVE_STEP;
      vy += ay * GROVE_STEP;
      vz += az * GROVE_STEP;
      if (kick > 0 && !inside && !pathing) {
        axisAt(y);
        const qx = x - axis.x;
        const qz = z - axis.z;
        const d = len2(qx, qz) || 1;
        const s = Math.min(1.6, kick) * (0.9 + 0.8 * band(i, rhNext));
        vx += (qx / d) * 1.1 * s;
        vy += 0.35 * s;
        vz += (qz / d) * 1.1 * s;
      }
      const vm = len3(vx, vy, vz);
      if (vm > V_MAX) {
        vx *= V_MAX / vm;
        vy *= V_MAX / vm;
        vz *= V_MAX / vm;
      }
      x += vx * GROVE_STEP;
      y += vy * GROVE_STEP;
      z += vz * GROVE_STEP;
      // ---- Contact: project out of whatever was entered and bounce off it a little. ----
      let hit = 0;
      const collide = (px: number, py: number, pz: number, depth: number) => {
        // Push out along (px, py, pz) by depth; reflect the inward velocity with restitution, keep most of the slide.
        x += px * depth;
        y += py * depth;
        z += pz * depth;
        const vn = vx * px + vy * py + vz * pz;
        if (vn < 0) {
          vx -= 1.35 * vn * px;
          vy -= 1.35 * vn * py;
          vz -= 1.35 * vn * pz;
          vx *= 0.92;
          vy *= 0.92;
          vz *= 0.92;
          hit = Math.max(hit, Math.min(1, -vn / 3));
        }
      };
      treeToDoor(x, y, z, dd);
      if (inHollowDoor(dd[0], dd[1], dd[2])) {
        // Within the doorway tunnel or the chamber: stay inside the carved wood.
        let lx = dd[0];
        let ly = dd[1];
        let lz = dd[2];
        if (lz > -hollow.tunnelDepth) {
          const hw = W / 2 - R;
          lx = Math.max(-hw, Math.min(hw, lx));
          ly = Math.max(R, Math.min(H - R, ly));
        } else {
          const ex = (lx - chamber.cx) / chamber.rx;
          const ey = (ly - chamber.cy) / chamber.ry;
          const ez = (lz - chamber.cz) / chamber.rz;
          const e = len3(ex, ey, ez);
          // The tunnel joins the chamber at its front: let spirits pass between them through the aperture's footprint.
          const throughTunnel = lz > chamber.cz && Math.abs(lx) < W / 2 - R && ly > R && ly < H - R;
          if (e > 1 && !throughTunnel) {
            lx = chamber.cx + (ex / e) * chamber.rx;
            ly = chamber.cy + (ey / e) * chamber.ry;
            lz = chamber.cz + (ez / e) * chamber.rz;
          }
        }
        if (lx !== dd[0] || ly !== dd[1] || lz !== dd[2]) {
          doorToTree(lx, ly, lz, v3);
          const px = v3[0] - x;
          const py = v3[1] - y;
          const pz = v3[2] - z;
          const d = len3(px, py, pz) || 1e-9;
          collide(px / d, py / d, pz / d, d);
        }
      } else {
        if (!inDoorway(dd[0], dd[1], dd[2]) && trunkAt(x, y, z)) {
          const qx = x - trunkHit.cx;
          const qz = z - trunkHit.cz;
          const d = len2(qx, qz) || 1e-9;
          const gap = d - trunkHit.r - R;
          if (gap < 0) collide(qx / d, 0, qz / d, -gap);
        }
        for (const cap of capsulesNear(x, y, z)) {
          const gap = capsuleDistance(cap, x, y, z) - R;
          if (gap < 0) collide(nrm[0], nrm[1], nrm[2], -gap);
        }
        for (const l of world.lanterns) {
          const qx = x - l[0];
          const qy = y - l[1];
          const qz = z - l[2];
          const d = len3(qx, qy, qz) || 1e-9;
          if (d < 0.24 + R) collide(qx / d, qy / d, qz / d, 0.24 + R - d);
        }
        // The door leaf: a vertical slab from the hinge pin, swung out by the hinge angle.
        if (doorAngle > 0.02) {
          treeToDoor(x, y, z, dd);
          if (dd[1] > -R && dd[1] < H + R) {
            const hx = -W / 2;
            const hz = world.aperture.hingeZ;
            const ux = Math.cos(doorAngle);
            const uz = Math.sin(doorAngle);
            const s = unit(((dd[0] - hx) * ux + (dd[2] - hz) * uz) / W) * W;
            const qx = dd[0] - (hx + ux * s);
            const qz = dd[2] - (hz + uz * s);
            const d = len2(qx, qz) || 1e-9;
            if (d < 0.05 + R) {
              doorToTree(dd[0] + (qx / d) * (0.05 + R - d), dd[1], dd[2] + (qz / d) * (0.05 + R - d), v3);
              const px = v3[0] - x;
              const pz = v3[2] - z;
              const l = len2(px, pz) || 1e-9;
              collide(px / l, 0, pz / l, l);
            }
          }
        }
        const g = groundAt(x, z) + R;
        if (y < g) collide(0, 1, 0, g - y);
      }
      pos[b] = x;
      pos[b + 1] = y;
      pos[b + 2] = z;
      vel[b] = vx;
      vel[b + 1] = vy;
      vel[b + 2] = vz;
      bumps[i] = Math.max(bumps[i]! * Math.exp(-GROVE_STEP / 0.3), hit);
    }
    step++;
    if (step % 2 === 0) {
      trailHead = (trailHead + 1) % GROVE_TRAIL;
      trailStep = step;
      for (let i = 0; i < n; i++) trail.set(pos.subarray(i * 3, i * 3 + 3), (i * GROVE_TRAIL + trailHead) * 3);
    }
    save();
    stats.steps++;
  };

  // ---- Public pose ----------------------------------------------------------------------------------------------------
  const position = new Float64Array(n * 3);
  const velocity = new Float64Array(n * 3);
  const bump = new Float64Array(n);
  const outside = new Float64Array(n);
  const stats = { steps: 0, restores: 0 };
  let poseTime = -1;
  let awake = false;
  let angle = 0;

  const grove: MenuGrove = {
    count: n,
    position,
    velocity,
    bump,
    outside,
    trail,
    get trailHead() { return trailHead; },
    get trailStep() { return trailStep; },
    get doorAngle() { return angle; },
    get time() { return poseTime; },
    get awake() { return awake; },
    rhythm: createMenuRhythmSample(),
    stats,
    leafSites: world.leafSites,
    doorToTree,
    treeToDoor,
    inHollow,
    clearance(x, y, z) {
      let best = y - groundAt(x, z);
      treeToDoor(x, y, z, dd);
      if (!inHollowDoor(dd[0], dd[1], dd[2]) && trunkAt(x, y, z)) best = Math.min(best, len2(x - trunkHit.cx, z - trunkHit.cz) - trunkHit.r);
      for (const cap of capsulesNear(x, y, z)) best = Math.min(best, capsuleDistance(cap, x, y, z));
      return best;
    },
    advanceTo(time: number) {
      const t = Number.isFinite(time) ? Math.max(0, time) : 0;
      if (t === poseTime) return;
      poseTime = t;
      sampleMenuRhythm(t, grove.rhythm);
      if (t < GROVE_CUE) {
        awake = false;
        step = -1;
        angle = 0;
        position.fill(0);
        velocity.fill(0);
        bump.fill(0);
        outside.fill(0);
        return;
      }
      awake = true;
      const goal = Math.ceil((t - GROVE_CUE) / GROVE_STEP - 1e-9);
      const trailSteps = GROVE_TRAIL * 2 + 2;
      if (step < 0 || goal < step) {
        // Backwards (or first): resume from the latest snapshot that leaves room to rebuild the trail.
        const want = Math.floor((goal - trailSteps) / SNAPSHOT_STEPS);
        let s: Snapshot | undefined;
        for (let k = Math.min(want, snapshots.length - 1); k >= 0 && !s; k--) s = snapshots[k];
        if (s) {
          restore(s);
          stats.restores++;
        } else {
          reset();
          save();
        }
      } else if (goal - step > trailSteps + SNAPSHOT_STEPS) {
        // Far ahead: jump to the furthest snapshot already known, if that helps.
        const want = Math.floor((goal - trailSteps) / SNAPSHOT_STEPS);
        for (let k = Math.min(want, snapshots.length - 1); k > step / SNAPSHOT_STEPS; k--) {
          const s = snapshots[k];
          if (s) {
            restore(s);
            stats.restores++;
            break;
          }
        }
      }
      while (step < goal) stepOnce();
      // Draw between the last two steps, so motion is smooth at any frame rate.
      const alpha = goal === 0 ? 1 : 1 - (timeOf(goal) - t) / GROVE_STEP;
      for (let i = 0; i < n * 3; i++) {
        position[i] = prev[i]! + (pos[i]! - prev[i]!) * alpha;
        velocity[i] = vel[i]!;
      }
      for (let i = 0; i < n; i++) {
        bump[i] = prevBumps[i]! + (bumps[i]! - prevBumps[i]!) * alpha;
        treeToDoor(position[i * 3]!, position[i * 3 + 1]!, position[i * 3 + 2]!, dd);
        outside[i] = inHollowDoor(dd[0], dd[1], dd[2]) ? unit((dd[2] + 0.1) / 0.22) : 1;
      }
      angle = prevDoor + (doorAngle - prevDoor) * alpha;
    },
  };
  return grove;
}
