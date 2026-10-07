import * as THREE from 'three';
import { weldExact } from './weld';

/**
 * Weight repair for the residents' prepared skins, computed once per source model on load.
 *
 * Every prepared skin follows one documented zone field (tools/rebake-meshy-npc-surfaces.py, `rebuilt_skinrows`):
 * arm surface chosen in the source pose blends upper arm to forearm by height; everything else is weighted by height
 * alone, torso to head at the neck, hips to torso at the waist, and the two legs split along an 0.11 m band at x = 0.
 * Four parts of that field fight the poser:
 * - the waist branch starts at 0.90 m while the thigh's share was meant to fade out by 0.96 m, so a quarter of the
 *   thigh's weight vanishes across one row of triangles and a seated hip creases;
 * - the shoulder is a hard cut, every vertex all arm or all torso;
 * - capes, aprons and packs that hung within reach of the source arm were given to the arm and swing with it;
 * - skirts, hems, tabards and capes are split down the middle between the legs and tear when the legs part, and pack
 *   frames, pauldrons and collars above 1.42 m turn with the head.
 *
 * The repair re-derives the same field continuously, keeps each arm's own sleeve on the arm, gives garment surface to
 * the body it hangs from, lets cloth that joins the two legs share them by diffusing the left/right split along the
 * surface (separate trouser legs never touch below the crotch, so they keep their own leg), and blends the shoulder
 * seam along the surface. Positions, UVs, normals, joints and binds are untouched; four influences still sum to one.
 */
export const NPC_SKIN_REPAIR_PROFILE = 'resident-skin-field-v2';

/** Surface within this distance of a shoulder pivot may blend across the arm seam. */
export const SHOULDER_BLEND_RADIUS = 0.15;
/** Half-width of the shoulder blend, measured along the surface from the old seam. */
export const SHOULDER_BLEND_HALF_WIDTH = 0.06;
/**
 * Distance from the arm's bone axis beyond which arm-assigned surface is garment: `beside` where it lies to one side of
 * the arm (a cape or apron panel), `wrapped` where it goes all round (a bulky sleeve, cuff, bracer or pauldron, which
 * stays with the arm unless it is very far out). Measured over the seventeen prepared skins.
 */
export const ARM_REACH = {
  beside: { upper: 0.13, fore: 0.09, hand: 0.105 },
  wrapped: { upper: 0.18, fore: 0.14, hand: 0.13 },
} as const;
/** A detached arm-assigned piece at least this large (welded points) is a garment panel, not a stray fragment of hand. */
export const DETACHED_GARMENT_POINTS = 40;
/** Width of the hand-over from arm surface to garment beyond that reach. */
export const SLEEVE_RELEASE_WIDTH = 0.035;
/** Leg surface within this distance of a leg's bone axis is the leg (or its trouser) and keeps its own side. */
export const LEG_CORE_RADIUS = 0.095;
/** Jacobi passes of the left/right diffusion through cloth (about 12-20 cm of spread on these meshes). */
export const LEG_SIDE_PASSES = 90;
/** Surface points crossing the centre line between 0.2 and 0.6 m that mark cloth hanging across both legs. */
export const CLOTH_CROSSING_POINTS = 6;

export type RepairBone = 'hips' | 'torso' | 'head' | 'armL' | 'elbowL' | 'armR' | 'elbowR' | 'legL' | 'kneeL' | 'legR' | 'kneeR';

export interface SkinRepairJoints {
  /** Bind-pose pivots in the skinned mesh's space. */
  pivots: Record<RepairBone, THREE.Vector3>;
  palmL: THREE.Vector3;
  palmR: THREE.Vector3;
}

/** Leg cloth: shared by diffusion (default), or left to a garment's own measured fit (Mara and the fireside resident). */
export type LowerGarment = 'shared' | 'fitted';

export interface SkinRepairOptions {
  lowerGarment?: LowerGarment;
  /**
   * The source arm also took a garment panel that hung beside it (a cape, an apron's sides, a pack). Only models known
   * to carry one are searched: loose sleeves and cuffs elsewhere must stay on their arms.
   */
  armGarments?: boolean;
  /** Tighter one-sided reach for a model whose garment hangs close beside the hand or forearm. */
  armReach?: Partial<Record<'upper' | 'fore' | 'hand', number>>;
}

export interface SkinRepairReport {
  profile: string;
  vertices: number;
  /** Welded surface points whose weights changed by more than 0.01. */
  changed: number;
  shoulderBlended: number;
  sleeveReleased: number;
  /** Points whose left/right leg split moved by more than 0.05 (cloth joining the legs). */
  legShared: number;
  headReleased: number;
  /** Largest change in any one joint's weight on any vertex. */
  largestChange: number;
}

export interface SkinRepairResult {
  index: Uint16Array;
  weight: Float32Array;
  report: SkinRepairReport;
  /** Per vertex, for review tools: how far each arm point was handed to the body, and how far its leg split moved. */
  inspection: { release: Float32Array; legShared: Float32Array };
}

const cache = new WeakMap<THREE.BufferGeometry, Map<string, SkinRepairResult>>();

const smooth = (a: number, b: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Minimal binary heap for Dijkstra over the welded surface. */
class Heap {
  private keys: number[] = [];
  private values: number[] = [];
  get size() { return this.keys.length; }
  push(key: number, value: number) {
    const keys = this.keys, values = this.values;
    let i = keys.length;
    keys.push(key); values.push(value);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (keys[parent]! <= key) break;
      keys[i] = keys[parent]!; values[i] = values[parent]!;
      i = parent;
    }
    keys[i] = key; values[i] = value;
  }
  pop(): [number, number] {
    const keys = this.keys, values = this.values;
    const topKey = keys[0]!, topValue = values[0]!;
    const lastKey = keys.pop()!, lastValue = values.pop()!;
    if (keys.length) {
      let i = 0;
      for (;;) {
        const left = i * 2 + 1, right = left + 1;
        let best = i, bestKey = lastKey;
        if (left < keys.length && keys[left]! < bestKey) { best = left; bestKey = keys[left]!; }
        if (right < keys.length && keys[right]! < bestKey) { best = right; bestKey = keys[right]!; }
        if (best === i) break;
        keys[i] = keys[best]!; values[i] = values[best]!;
        i = best;
      }
      keys[i] = lastKey; values[i] = lastValue;
    }
    return [topKey, topValue];
  }
}

interface Surface {
  /** Welded node of each vertex. */
  node: Int32Array;
  position: Float32Array;
  weights: Float32Array;
  offsets: Int32Array;
  neighbours: Int32Array;
  lengths: Float32Array;
  count: number;
}

function weld(geometry: THREE.BufferGeometry, joints: number): Surface {
  const position = geometry.getAttribute('position'), skinIndex = geometry.getAttribute('skinIndex'), skinWeight = geometry.getAttribute('skinWeight');
  const vertices = position.count;
  // Exact duplicates only (UV seams). Distinct surfaces that merely touch are never joined.
  const { node, first: firsts } = weldExact(position);
  const count = firsts.length;
  const nodePosition = new Float32Array(count * 3), weights = new Float32Array(count * joints);
  for (let id = 0; id < count; id++) {
    const vertex = firsts[id]!;
    nodePosition[id * 3] = position.getX(vertex); nodePosition[id * 3 + 1] = position.getY(vertex); nodePosition[id * 3 + 2] = position.getZ(vertex);
    for (let slot = 0; slot < 4; slot++) weights[id * joints + skinIndex.getComponent(vertex, slot)]! += skinWeight.getComponent(vertex, slot);
  }
  const index = geometry.index;
  const corners = index?.count ?? vertices;
  // Unique undirected edges between welded points, as numbers (low * count + high), then a compressed adjacency.
  const edges = new Set<number>();
  const edge = (a: number, b: number) => { if (a !== b) edges.add(a < b ? a * count + b : b * count + a); };
  for (let t = 0; t < corners; t += 3) {
    const a = node[index ? index.getX(t) : t]!, b = node[index ? index.getX(t + 1) : t + 1]!, c = node[index ? index.getX(t + 2) : t + 2]!;
    edge(a, b); edge(b, c); edge(c, a);
  }
  const degree = new Int32Array(count);
  for (const key of edges) { degree[Math.floor(key / count)]!++; degree[key % count]!++; }
  const offsets = new Int32Array(count + 1);
  for (let id = 0; id < count; id++) offsets[id + 1] = offsets[id]! + degree[id]!;
  const fill = offsets.slice(0, count);
  const neighbours = new Int32Array(offsets[count]!), lengths = new Float32Array(offsets[count]!);
  for (const key of edges) {
    const a = Math.floor(key / count), b = key % count;
    const length = Math.hypot(nodePosition[a * 3]! - nodePosition[b * 3]!, nodePosition[a * 3 + 1]! - nodePosition[b * 3 + 1]!, nodePosition[a * 3 + 2]! - nodePosition[b * 3 + 2]!);
    neighbours[fill[a]!] = b; lengths[fill[a]!++] = length;
    neighbours[fill[b]!] = a; lengths[fill[b]!++] = length;
  }
  return { node, position: nodePosition, weights, offsets, neighbours, lengths, count };
}

/** Distance along the surface from a set of seeds, limited to `allowed` nodes; also which seed each node is nearest. */
function surfaceDistance(surface: Surface, seeds: number[], allowed: (id: number) => boolean, limit: number) {
  const distance = new Float32Array(surface.count).fill(Infinity);
  const source = new Int32Array(surface.count).fill(-1);
  const heap = new Heap();
  for (const seed of seeds) { distance[seed] = 0; source[seed] = seed; heap.push(0, seed); }
  while (heap.size) {
    const [d, id] = heap.pop();
    if (d > distance[id]!) continue;
    for (let k = surface.offsets[id]!; k < surface.offsets[id + 1]!; k++) {
      const other = surface.neighbours[k]!;
      if (!allowed(other)) continue;
      const next = d + surface.lengths[k]!;
      if (next < distance[other]! && next <= limit) {
        distance[other] = next; source[other] = source[id]!;
        // Compare queued keys at the same precision as the stored distance.
        heap.push(distance[other]!, other);
      }
    }
  }
  return { distance, source };
}

/** Closest point on a polyline: arc length, radial distance and which segment. */
function onPolyline(points: readonly THREE.Vector3[], x: number, y: number, z: number) {
  let best = { s: 0, r: Infinity, segment: 0 };
  let travelled = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!, b = points[i + 1]!;
    const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, length = Math.hypot(abx, aby, abz);
    const t = Math.min(1, Math.max(0, ((x - a.x) * abx + (y - a.y) * aby + (z - a.z) * abz) / Math.max(1e-12, length * length)));
    const r = Math.hypot(x - (a.x + abx * t), y - (a.y + aby * t), z - (a.z + abz * t));
    if (r < best.r) best = { s: travelled + t * length, r, segment: i };
    travelled += length;
  }
  return best;
}

/** Direction round a segment, in twelve sectors, for telling a sleeve that wraps the arm from cloth beside it. */
function sectorOf(a: THREE.Vector3, b: THREE.Vector3, x: number, y: number, z: number): number {
  const ax = b.x - a.x, ay = b.y - a.y, az = b.z - a.z, al = Math.hypot(ax, ay, az) || 1;
  const dx = ax / al, dy = ay / al, dz = az / al;
  // across = (0,0,1) × axis, falling back to (1,0,0) × axis for a limb pointing along z
  let cx = -dy, cy = dx, cz = 0;
  if (Math.hypot(cx, cy) < 1e-3) { cx = 0; cy = -dz; cz = dy; }
  const cl = Math.hypot(cx, cy, cz) || 1; cx /= cl; cy /= cl; cz /= cl;
  const ux = dy * cz - dz * cy, uy = dz * cx - dx * cz, uz = dx * cy - dy * cx;
  const ox = x - a.x, oy = y - a.y, oz = z - a.z;
  const angle = Math.atan2(ox * ux + oy * uy + oz * uz, ox * cx + oy * cy + oz * cz);
  return Math.min(11, Math.floor((angle + Math.PI) / (2 * Math.PI) * 12));
}

/**
 * The documented zone field for body surface, made continuous at the hip: the thigh's share fades out by 0.96 m as
 * intended rather than stopping at 0.90 m. `side` is the left leg's share of the legs' weight.
 */
function bodyField(out: Float32Array, J: Record<RepairBone, number>, y: number, side: number) {
  out.fill(0);
  if (y >= 1.42) {
    const head = smooth(1.43, 1.57, y);
    out[J.torso] = 1 - head; out[J.head] = head;
    return;
  }
  const torso = smooth(0.91, 1.16, y);
  const legs = (1 - smooth(0.78, 0.96, y)) * (1 - torso);
  const thigh = smooth(0.40, 0.59, y);
  out[J.torso] = torso;
  out[J.hips] = 1 - torso - legs;
  out[J.legL] = legs * side * thigh; out[J.kneeL] = legs * side * (1 - thigh);
  out[J.legR] = legs * (1 - side) * thigh; out[J.kneeR] = legs * (1 - side) * (1 - thigh);
}

/** The prepared skin's own narrow split between the legs. */
const narrowSide = (x: number) => smooth(-0.055, 0.055, x);

/**
 * Compute repaired influences for a source skin. `jointNames` follows the skeleton's bone order; the result is cached
 * per source geometry so every actor of one model shares the work.
 */
export function computeNpcSkinRepair(source: THREE.BufferGeometry, jointNames: readonly string[], joints: SkinRepairJoints, options: SkinRepairOptions = {}): SkinRepairResult {
  const garment = options.lowerGarment ?? 'shared';
  const pivotKey = Object.values(joints.pivots).map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`).join(';');
  const variant = `${garment}|${options.armGarments ? 'arm-garments' : 'sleeves'}|${JSON.stringify(options.armReach ?? {})}|${pivotKey}`;
  const cachedVariants = cache.get(source);
  const cached = cachedVariants?.get(variant);
  if (cached) return cached;
  const JN = jointNames.length;
  const J = {} as Record<RepairBone, number>;
  for (const name of ['hips', 'torso', 'head', 'armL', 'elbowL', 'armR', 'elbowR', 'legL', 'kneeL', 'legR', 'kneeR'] as const) {
    const index = jointNames.indexOf(name);
    if (index < 0) throw new Error(`Resident skin repair needs a ${name} joint.`);
    J[name] = index;
  }
  const surface = weld(source, JN);
  const { count, weights, position } = surface;
  const { pivots } = joints;
  const sides = [
    { arm: J.armL, elbow: J.elbowL, shoulder: pivots.armL, elbowAt: pivots.elbowL, palm: joints.palmL },
    { arm: J.armR, elbow: J.elbowR, shoulder: pivots.armR, elbowAt: pivots.elbowR, palm: joints.palmR },
  ];
  const armShare = (id: number, side: number) => weights[id * JN + sides[side]!.arm]! + weights[id * JN + sides[side]!.elbow]!;
  const armOf = new Int8Array(count).fill(-1);
  for (let id = 0; id < count; id++) {
    if (armShare(id, 0) > 0.5) armOf[id] = 0; else if (armShare(id, 1) > 0.5) armOf[id] = 1;
  }

  // 1. Sleeve or garment. The source arm took everything within 0.165 m of its line in the source pose, which for arms
  // that already hung down included the cape, apron or pack panel beside them. The arm's own surface lies within a
  // few centimetres of its axis; outside that, surface that wraps the arm all round is a sleeve, cuff or pauldron and
  // stays, and surface that only lies to one side was given to the arm because it hung beside it.
  const release = new Float32Array(count);
  for (let side = 0; side < (options.armGarments ? 2 : 0); side++) {
    const { shoulder, elbowAt, palm } = sides[side]!;
    const tip = palm.clone().sub(elbowAt).setLength(palm.distanceTo(elbowAt) + 0.1).add(elbowAt);
    const line = [shoulder, elbowAt, tip];
    const upper = shoulder.distanceTo(elbowAt), palmS = upper + elbowAt.distanceTo(palm);
    const reachAt = (s: number, kind: 'beside' | 'wrapped') => {
      const r = kind === 'beside' ? { ...ARM_REACH.beside, ...options.armReach } : ARM_REACH.wrapped;
      const fore = r.upper + (r.fore - r.upper) * smooth(upper - 0.04, upper + 0.04, s);
      return fore + (r.hand - fore) * smooth(palmS - 0.12, palmS - 0.06, s);
    };
    const members: { id: number; slice: number; r: number; s: number }[] = [];
    const covered = new Map<number, Set<number>>();
    for (let id = 0; id < count; id++) {
      if (armOf[id] !== side) continue;
      const x = position[id * 3]!, y = position[id * 3 + 1]!, z = position[id * 3 + 2]!;
      const at = onPolyline(line, x, y, z);
      const slice = Math.floor(at.s / 0.03);
      members.push({ id, slice, r: at.r, s: at.s });
      if (at.r > reachAt(at.s, 'beside')) {
        let set = covered.get(slice);
        if (!set) { set = new Set(); covered.set(slice, set); }
        set.add(sectorOf(line[at.segment]!, line[at.segment + 1]!, x, y, z));
      }
    }
    // A garment piece that is not joined to the arm's surface at all (only touching it) is released whole: whatever
    // part of this side's arm-assigned surface cannot reach the shoulder along the surface is not the arm.
    const attached = new Uint8Array(count);
    const queue: number[] = [];
    for (const m of members) {
      const x = position[m.id * 3]!, y = position[m.id * 3 + 1]!, z = position[m.id * 3 + 2]!;
      if (Math.hypot(x - shoulder.x, y - shoulder.y, z - shoulder.z) < 0.15) { attached[m.id] = 1; queue.push(m.id); }
    }
    while (queue.length) {
      const id = queue.pop()!;
      for (let k = surface.offsets[id]!; k < surface.offsets[id + 1]!; k++) {
        const other = surface.neighbours[k]!;
        if (armOf[other] === side && !attached[other]) { attached[other] = 1; queue.push(other); }
      }
    }
    const detached = members.filter(m => !attached[m.id]).length;
    for (const m of members) {
      if (!attached[m.id] && detached >= DETACHED_GARMENT_POINTS) { release[m.id] = 1; continue; }
      // A sleeve or pauldron wraps the arm; a cape or apron beside it leaves the side towards the body open.
      const kind = (covered.get(m.slice)?.size ?? 0) >= 10 ? 'wrapped' : 'beside';
      const reach = reachAt(m.s, kind);
      // The deltoid and armpit belong to the shoulder blend, not to this release.
      const x = position[m.id * 3]!, y = position[m.id * 3 + 1]!, z = position[m.id * 3 + 2]!;
      const shoulderGap = Math.hypot(x - shoulder.x, y - shoulder.y, z - shoulder.z);
      release[m.id] = smooth(reach, reach + SLEEVE_RELEASE_WIDTH, m.r) * smooth(0.12, 0.17, shoulderGap);
    }
  }

  // 2. Re-derive every weight. Arms keep their own upper/forearm blend; body surface and released garment follow the
  // continuous zone field with the prepared narrow split between the legs.
  const result = new Float32Array(count * JN);
  const field = new Float32Array(JN);
  let sleeveReleased = 0, headReleased = 0;
  for (let id = 0; id < count; id++) {
    const at = id * JN;
    const x = position[id * 3]!, y = position[id * 3 + 1]!;
    bodyField(field, J, y, narrowSide(x));
    if (armOf[id]! < 0) {
      for (let j = 0; j < JN; j++) result[at + j] = field[j]!;
    } else {
      const amount = release[id]!;
      for (let j = 0; j < JN; j++) result[at + j] = weights[at + j]! * (1 - amount) + field[j]! * amount;
      if (amount > 0.01) sleeveReleased++;
    }
  }

  // 3. Cloth joining the legs shares them. Diffuse each point's left share along the surface: a skirt, apron, tabard
  // or cape bottom is one sheet across the centre and its sharp split spreads out; a trouser leg is a separate tube
  // below the crotch and keeps its own leg. Boots, the seat and Mara's fitted skirt are left as they are.
  const legShared = new Float32Array(count);
  // Trouser legs only meet at the crotch; a skirt, apron, tabard, long hem or cape crosses the centre line lower down.
  let crossing = 0;
  for (let id = 0; id < count; id++) {
    const x = position[id * 3]!, y = position[id * 3 + 1]!;
    if (armOf[id]! < 0 && Math.abs(x) < 0.03 && y > 0.2 && y < 0.6) crossing++;
  }
  if (garment === 'shared' && crossing >= CLOTH_CROSSING_POINTS) {
    const zone = new Float32Array(count);
    const side = new Float32Array(count);
    const pinned = new Uint8Array(count);
    const legsOf = (at: number) => result[at + J.legL]! + result[at + J.kneeL]! + result[at + J.legR]! + result[at + J.kneeR]!;
    const legLines = [pivots.legL, pivots.legR].map((hip, i) => {
      const knee = i === 0 ? pivots.kneeL : pivots.kneeR;
      return [hip, knee, knee.clone().setY(0.02)];
    });
    for (let id = 0; id < count; id++) {
      const x = position[id * 3]!, y = position[id * 3 + 1]!, z = position[id * 3 + 2]!, at = id * JN;
      const legs = legsOf(at);
      if (legs < 1e-4) continue;
      zone[id] = (1 - smooth(0.74, 0.8, y)) * smooth(0.14, 0.2, y);
      side[id] = (result[at + J.legL]! + result[at + J.kneeL]!) / legs;
      // The leg itself, or a trouser close round it, holds its side: meshes fused where the legs touch, or where an
      // apron lies on a thigh, must not leak one leg's weight into the other.
      if (Math.min(onPolyline(legLines[0]!, x, y, z).r, onPolyline(legLines[1]!, x, y, z).r) < LEG_CORE_RADIUS) pinned[id] = 1;
    }
    // Only free points in the zone move; precompute them and their in-zone neighbours once.
    const free: number[] = [], start: number[] = [0], around: number[] = [];
    for (let id = 0; id < count; id++) {
      if (zone[id]! <= 0 || pinned[id]) continue;
      free.push(id);
      for (let k = surface.offsets[id]!; k < surface.offsets[id + 1]!; k++) if (zone[surface.neighbours[k]!]! > 0) around.push(surface.neighbours[k]!);
      start.push(around.length);
    }
    let next = new Float32Array(side), current = new Float32Array(side);
    for (let pass = 0; pass < LEG_SIDE_PASSES; pass++) {
      for (let f = 0; f < free.length; f++) {
        const id = free[f]!;
        let sum = current[id]!;
        for (let k = start[f]!; k < start[f + 1]!; k++) sum += current[around[k]!]!;
        next[id] = sum / (1 + start[f + 1]! - start[f]!);
      }
      for (let f = 0; f < free.length; f++) { const id = free[f]!; current[id] = next[id]!; }
    }

    for (let id = 0; id < count; id++) {
      const amount = zone[id]!;
      if (amount <= 0) continue;
      const at = id * JN, y = position[id * 3 + 1]!;
      const shared = side[id]! + (current[id]! - side[id]!) * amount;
      legShared[id] = Math.abs(shared - side[id]!);
      const legs = legsOf(at);
      const thigh = smooth(0.40, 0.59, y);
      result[at + J.legL] = legs * shared * thigh; result[at + J.kneeL] = legs * shared * (1 - thigh);
      result[at + J.legR] = legs * (1 - shared) * thigh; result[at + J.kneeR] = legs * (1 - shared) * (1 - thigh);
    }
  }

  // 4. Pack frames, pauldrons and high collars above the neck line stay on the shoulders when the head turns.
  const headCentre = pivots.head.clone().add(new THREE.Vector3(0, 0.08, 0.02));
  for (let id = 0; id < count; id++) {
    const at = id * JN, head = result[at + J.head]!;
    if (head <= 0) continue;
    const away = smooth(0.17, 0.25, Math.hypot(position[id * 3]! - headCentre.x, position[id * 3 + 1]! - headCentre.y, position[id * 3 + 2]! - headCentre.z));
    if (away <= 0) continue;
    result[at + J.torso]! += head * away; result[at + J.head] = head * (1 - away);
    if (away > 0.01) headReleased++;
  }

  // 5. Shoulders: blend along the surface on both sides of the old seam.
  let shoulderBlended = 0;
  const base = new Float32Array(result);
  for (let side = 0; side < 2; side++) {
    const { shoulder } = sides[side]!;
    const isArm = (id: number) => armOf[id] === side && release[id]! < 0.5;
    const dist = (id: number) => Math.hypot(position[id * 3]! - shoulder.x, position[id * 3 + 1]! - shoulder.y, position[id * 3 + 2]! - shoulder.z);
    const armSeeds: number[] = [], bodySeeds: number[] = [];
    for (let id = 0; id < count; id++) {
      if (dist(id) >= SHOULDER_BLEND_RADIUS) continue;
      const mine = isArm(id);
      for (let k = surface.offsets[id]!; k < surface.offsets[id + 1]!; k++) {
        if (isArm(surface.neighbours[k]!) !== mine) { (mine ? armSeeds : bodySeeds).push(id); break; }
      }
    }
    if (!armSeeds.length || !bodySeeds.length) continue;
    const region = (id: number) => dist(id) < SHOULDER_BLEND_RADIUS * 1.6;
    const limit = SHOULDER_BLEND_HALF_WIDTH * 2;
    const fromArm = surfaceDistance(surface, armSeeds, region, limit);
    const fromBody = surfaceDistance(surface, bodySeeds, region, limit);
    for (let id = 0; id < count; id++) {
      const fade = 1 - smooth(SHOULDER_BLEND_RADIUS * 0.7, SHOULDER_BLEND_RADIUS, dist(id));
      if (fade <= 0) continue;
      const across = isArm(id) ? fromBody : fromArm;
      const d = across.distance[id]!;
      if (!Number.isFinite(d) || d >= SHOULDER_BLEND_HALF_WIDTH) continue;
      const other = across.source[id]!;
      if (other < 0) continue;
      const own = 1 - (0.5 - 0.5 * smooth(0, SHOULDER_BLEND_HALF_WIDTH, d)) * fade;
      for (let j = 0; j < JN; j++) result[id * JN + j] = base[id * JN + j]! * own + base[other * JN + j]! * (1 - own);
      shoulderBlended++;
    }
  }

  // Back to four influences per vertex, renormalised; duplicates of one welded node stay identical.
  const vertices = source.getAttribute('position').count;
  const index = new Uint16Array(vertices * 4), weight = new Float32Array(vertices * 4);
  let largestChange = 0, changed = 0, shared = 0;
  for (let id = 0; id < count; id++) {
    let change = 0;
    for (let j = 0; j < JN; j++) change = Math.max(change, Math.abs(result[id * JN + j]! - weights[id * JN + j]!));
    largestChange = Math.max(largestChange, change);
    if (change > 0.01) changed++;
    if (legShared[id]! > 0.05) shared++;
  }
  const nodeIndex = new Uint16Array(count * 4), nodeWeight = new Float32Array(count * 4);
  const top = new Int32Array(4), topWeight = new Float64Array(4);
  for (let id = 0; id < count; id++) {
    const at = id * JN;
    top.fill(0); topWeight.fill(-1);
    for (let j = 0; j < JN; j++) {
      const w = result[at + j]!;
      if (w <= topWeight[3]!) continue;
      let slot = 3;
      while (slot > 0 && w > topWeight[slot - 1]!) { top[slot] = top[slot - 1]!; topWeight[slot] = topWeight[slot - 1]!; slot--; }
      top[slot] = j; topWeight[slot] = w;
    }
    const total = Math.max(0, topWeight[0]!) + Math.max(0, topWeight[1]!) + Math.max(0, topWeight[2]!) + Math.max(0, topWeight[3]!) || 1;
    for (let slot = 0; slot < 4; slot++) {
      const w = Math.max(0, topWeight[slot]!) / total;
      nodeIndex[id * 4 + slot] = w > 0 ? top[slot]! : 0;
      nodeWeight[id * 4 + slot] = w;
    }
  }
  for (let vertex = 0; vertex < vertices; vertex++) {
    const at = surface.node[vertex]! * 4;
    for (let slot = 0; slot < 4; slot++) { index[vertex * 4 + slot] = nodeIndex[at + slot]!; weight[vertex * 4 + slot] = nodeWeight[at + slot]!; }
  }
  const inspection = { release: new Float32Array(vertices), legShared: new Float32Array(vertices) };
  for (let vertex = 0; vertex < vertices; vertex++) {
    inspection.release[vertex] = release[surface.node[vertex]!]!;
    inspection.legShared[vertex] = legShared[surface.node[vertex]!]!;
  }
  const repaired: SkinRepairResult = { index, weight, inspection, report: {
    profile: NPC_SKIN_REPAIR_PROFILE, vertices, changed, shoulderBlended, sleeveReleased, legShared: shared, headReleased,
    largestChange: +largestChange.toFixed(4),
  } };
  const variants = cachedVariants ?? new Map<string, SkinRepairResult>();
  variants.set(variant, repaired);
  cache.set(source, variants);
  return repaired;
}

const inspections = new WeakMap<THREE.BufferGeometry, SkinRepairResult['inspection']>();

/** Review tools: the release and leg-sharing behind a repaired actor geometry. */
export function npcSkinInspection(geometry: THREE.BufferGeometry): SkinRepairResult['inspection'] | null {
  return inspections.get(geometry) ?? null;
}

/** Write repaired influences into an actor's private geometry clone. */
export function applyNpcSkinRepair(geometry: THREE.BufferGeometry, repair: SkinRepairResult): void {
  inspections.set(geometry, repair.inspection);
  const skinIndex = geometry.getAttribute('skinIndex') as THREE.BufferAttribute;
  if (skinIndex.count * 4 !== repair.index.length) throw new Error('Resident skin repair does not match this geometry.');
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(repair.index, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(repair.weight, 4));
  geometry.userData.npcSkinRepair = repair.report;
}
