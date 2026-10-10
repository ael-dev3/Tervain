import * as THREE from 'three';
import type { ResidentJoint, ResidentRigData } from './residentRig';

/**
 * Fingers for the residents' own rigs (A72). Meshy's rigs end at the wrists, but most of the models have their fingers
 * modelled apart (a measured thumb and finger protrusions, see the plan's `tips`). Each hand gets two chains of three
 * joints of our own under its Hand joint, a thumb and the four fingers as one group, placed from the hand's own surface
 * at load; the hand's share of each vertex beyond the knuckles is handed to them along the chain with a smooth falloff.
 * Nothing is added to the mesh: the triangles stay as they are, only the skin weights of the hand change.
 *
 * A hand whose fingers cannot be told apart (no thumb stands out of it) or that the caller names closed (a sleeve over
 * it, a fist) keeps its joints but gives them no vertices, so it never bends what is not a finger.
 */
export const FINGER_SIDES = ['Left', 'Right'] as const;
export type FingerSide = (typeof FINGER_SIDES)[number];
export const FINGER_CHAINS = ['Thumb', 'Fingers'] as const;
export type FingerChain = (typeof FINGER_CHAINS)[number];
export type FingerJoint = `${FingerSide}Hand${FingerChain}${1 | 2 | 3}`;
/** The finger joints in the order they follow the rig's own joints in the skeleton. */
export const FINGER_JOINTS: readonly FingerJoint[] = FINGER_SIDES.flatMap(side => FINGER_CHAINS.flatMap(chain =>
  ([1, 2, 3] as const).map(k => `${side}Hand${chain}${k}` as FingerJoint)));

/** How far each joint of a chain turns at a full curl (radians), knuckle first. */
export const FINGER_BEND: Readonly<Record<FingerChain, readonly [number, number, number]>> = {
  Fingers: [1.35, 1.5, 0.95],
  Thumb: [0.5, 0.65, 0.75],
};
/** A curl: 0 is the hand as modelled, 1 a closed fist. */
export interface HandCurl { fingers: number; thumb: number }
export const RELAXED_CURL: Readonly<HandCurl> = { fingers: 0.12, thumb: 0.08 };
/** The hand as modelled: open, as a palm laid on a counter or under a ledger lies. */
export const OPEN_CURL: Readonly<HandCurl> = { fingers: 0, thumb: 0 };
/**
 * How fast a hand eases to a new curl (per second). A knuckle turns 1.5 radians from open to a fist, so no finger joint
 * turns faster than about 6 radians a second, no faster than the clips turn the arms.
 */
export const CURL_RATE = 4;
/** A closed fist, to fight bare-handed. */
export const FIST_CURL: Readonly<HandCurl> = { fingers: 1, thumb: 0.85 };

type Vec3 = [number, number, number];
export interface FingerChainPlan {
  /** The chain's three joints in the model's bind space, knuckle first, and the chain's end. */
  joints: [Vec3, Vec3, Vec3];
  tip: Vec3;
  /** The bend axis in the model's bind space: turning about it closes the chain towards the palm. */
  axis: Vec3;
  /** Vertices that follow the chain at all. */
  vertices: number;
}
export interface FingerHandPlan {
  side: FingerSide;
  hand: ResidentJoint;
  /** Whether the hand's vertices were handed to its chains. */
  active: boolean;
  /** Finger-like protrusions of the hand's surface standing at least `TIP_PROMINENCE` above where they join it. */
  tips: number;
  /** Vertices the hand joint carries mostly (the chains count those given to them). */
  handVertices: number;
  /**
   * The way the palm faces (model space), and what told it: how far the thumb stands out to that side, how far the
   * fingers already bend to it, and the body's middle line.
   */
  palm: Vec3;
  votes: { thumb: number; bend: number; inward: number };
  /** How far the fingers reach from the hand joint, and where they leave the palm (metres along the hand). */
  reach: number;
  knuckle: number;
  fingers: FingerChainPlan;
  thumb: FingerChainPlan;
}
export interface ResidentFingerPlan {
  hands: Record<FingerSide, FingerHandPlan>;
  /** Four joints and four weights (summing to 1) per vertex, the rig's own with the hands' shares moved to the chains. */
  joints: Uint16Array;
  weights: Float32Array;
}

const HAND_INDEX: Record<FingerSide, number> = { Left: 11, Right: 15 };
/** A protrusion counts as a finger when it stands this far (metres) above where it joins the rest of the hand. */
export const TIP_PROMINENCE = 0.01;
/** Ways out from the hand a thumb is looked for. */
const THUMB_DIRECTIONS = 12;
/** A thumb stands at least this far (metres) aside of the longest finger's tip. */
const THUMB_ASIDE = 0.025;
/** A thumb leaves the palm within this share of the hand's reach from the wrist. */
const THUMB_ROOT = 0.5;
/** The blend across the knuckle line (metres), and the least across any joint. */
const KNUCKLE_BAND = 0.012;
/** The blend across each joint along a chain, as a share of the chain's length. */
const JOINT_BAND = 0.12;
/** How far (metres) the shares spread over the surface. */
const SPREAD = 0.008;
/** Vertices this close (metres) are one point of the surface (seams in the UVs split them). */
const WELD = 1e-4;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const reject = (a: Vec3, from: Vec3): Vec3 => norm(sub(a, scale(from, dot(a, from))));
const smoothstep = (v: number) => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t); };

/** Weights along a chain of joints at `stops` (distances along it): what stays before the first, and each joint's share. */
function chainShares(u: number, stops: readonly number[], band: number): number[] {
  const step = (at: number) => smoothstep((u - (at - band)) / (2 * band));
  const beyond = stops.map(step);
  return [1 - beyond[0]!, ...beyond.map((b, k) => b - (beyond[k + 1] ?? 0))];
}

interface Surface {
  nodes: number[];
  /** Welded node of each vertex the hand carries at all (-1 otherwise). */
  node: Int32Array;
  point: (node: number) => Vec3;
  neighbours: number[][];
}

/** The hand's surface: its vertices welded at seams, and which touch which. */
function handSurface(position: ArrayLike<number>, index: ArrayLike<number>, carried: (vertex: number) => boolean, vertices: number): Surface {
  const node = new Int32Array(vertices).fill(-1);
  const keys = new Map<string, number>(), nodes: number[] = [];
  for (let v = 0; v < vertices; v++) {
    if (!carried(v)) continue;
    const key = `${Math.round(position[v * 3]! / WELD)},${Math.round(position[v * 3 + 1]! / WELD)},${Math.round(position[v * 3 + 2]! / WELD)}`;
    let n = keys.get(key);
    if (n === undefined) { n = nodes.length; keys.set(key, n); nodes.push(v); }
    node[v] = n;
  }
  const sets = nodes.map(() => new Set<number>());
  for (let t = 0; t + 2 < index.length; t += 3) {
    const a = node[index[t]!]!, b = node[index[t + 1]!]!, c = node[index[t + 2]!]!;
    if (a < 0 || b < 0 || c < 0) continue;
    sets[a]!.add(b).add(c); sets[b]!.add(a).add(c); sets[c]!.add(a).add(b);
  }
  for (let n = 0; n < sets.length; n++) sets[n]!.delete(n);
  return { nodes, node, point: n => [position[nodes[n]! * 3]!, position[nodes[n]! * 3 + 1]!, position[nodes[n]! * 3 + 2]!], neighbours: sets.map(s => [...s]) };
}

interface Peak { node: number; prominence: number; death: number }
/**
 * The surface's protrusions along `height` (0-dimensional persistence of its upper level sets): each peak, how far it
 * stands above the level where it joins a higher one, and that level. The highest of each piece never joins one: it
 * stands without limit, and its level is the highest at which anything joins it.
 */
function peaks(surface: Surface, height: Float64Array): Peak[] {
  const order = surface.nodes.map((_, n) => n).sort((a, b) => height[b]! - height[a]!);
  const parent = new Int32Array(surface.nodes.length).fill(-1), top = new Int32Array(surface.nodes.length);
  const find = (x: number) => { while (parent[x] !== x) { parent[x] = parent[parent[x]!]!; x = parent[x]!; } return x; };
  const out: Peak[] = [];
  for (const n of order) {
    parent[n] = n; top[n] = n;
    for (const m of surface.neighbours[n]!) {
      if (parent[m]! < 0) continue;
      const a = find(n), b = find(m);
      if (a === b) continue;
      const [high, low] = height[top[a]!]! >= height[top[b]!]! ? [a, b] : [b, a];
      if (top[low] !== n) out.push({ node: top[low]!, prominence: height[top[low]!]! - height[n]!, death: height[n]! });
      parent[low] = high;
    }
  }
  // The highest of a piece stands above the highest level at which anything joins it there.
  const saddle = new Map<number, number>();
  for (const p of out) { const r = find(p.node); saddle.set(r, Math.max(saddle.get(r) ?? -Infinity, p.death)); }
  for (const r of new Set(surface.nodes.map((_, n) => find(n)))) {
    const level = saddle.get(r) ?? -Infinity;
    out.push({ node: top[r]!, prominence: Infinity, death: level });
  }
  return out;
}

/** The connected part of the surface above `level` that holds `start`. */
function flood(surface: Surface, height: Float64Array, start: number, level: number): Set<number> {
  const seen = new Set<number>([start]), queue = [start];
  while (queue.length) {
    const n = queue.pop()!;
    for (const m of surface.neighbours[n]!) if (!seen.has(m) && height[m]! > level) { seen.add(m); queue.push(m); }
  }
  return seen;
}

/** Spread a membership a few steps over the surface, so a region's edge blends rather than steps. */
function soften(surface: Surface, value: Float64Array, steps: number): Float64Array {
  let current = value;
  for (let s = 0; s < steps; s++) {
    const next = new Float64Array(current.length);
    for (let n = 0; n < current.length; n++) {
      const around = surface.neighbours[n]!;
      let sum = current[n]!;
      for (const m of around) sum += current[m]!;
      next[n] = sum / (around.length + 1);
    }
    current = next;
  }
  return current;
}

const inactiveChain = (at: Vec3, along: Vec3, axis: Vec3): FingerChainPlan => ({
  joints: [at, add(at, scale(along, 0.03)), add(at, scale(along, 0.05))], tip: add(at, scale(along, 0.07)), axis, vertices: 0,
});

/**
 * Measure one model's hands and place its finger chains (shared by every actor of the model). `position` and `index` are
 * the prepared model's own (bind space, as the rig was made for).
 */
export function planResidentFingers(data: ResidentRigData, position: ArrayLike<number>, index: ArrayLike<number>, closed: readonly FingerSide[] = []): ResidentFingerPlan {
  const steps = planResidentFingersSteps(data, position, index, closed);
  for (;;) { const next = steps.next(); if (next.done) return next.value; }
}

/** planResidentFingers a hand at a time (A80), for a resident built over several frames. */
export function* planResidentFingersSteps(data: ResidentRigData, position: ArrayLike<number>, index: ArrayLike<number>, closed: readonly FingerSide[] = []): Generator<void, ResidentFingerPlan, void> {
  const vertices = data.vertices;
  const joints = new Uint16Array(vertices * 4), weights = new Float32Array(vertices * 4);
  for (let i = 0; i < joints.length; i++) { joints[i] = data.joints[i]!; weights[i] = data.weights[i]! / 255; }
  const handWeight = (v: number, joint: number) => {
    let w = 0;
    for (let s = 0; s < 4; s++) if (data.joints[v * 4 + s] === joint) w += data.weights[v * 4 + s]!;
    return w / 255;
  };
  const hands = {} as Record<FingerSide, FingerHandPlan>;
  for (const [sideIndex, side] of FINGER_SIDES.entries()) {
    const joint = HAND_INDEX[side], bone = data.bones[joint]!;
    const wrist = bone.position as Vec3;
    const surface = handSurface(position, index, v => handWeight(v, joint) > 0.25, vertices);
    // A hand's plan is tens of milliseconds on a dense model: it is taken in a few steps (A80).
    yield;
    let handVertices = 0;
    for (let v = 0; v < vertices; v++) if (handWeight(v, joint) >= 0.6) handVertices++;
    const carried: number[] = [];
    for (let n = 0; n < surface.nodes.length; n++) if (handWeight(surface.nodes[n]!, joint) >= 0.6) carried.push(n);
    const centreOf = (list: number[]) => {
      let sum: Vec3 = [0, 0, 0];
      for (const n of list) sum = add(sum, surface.point(n));
      return scale(sum, 1 / Math.max(1, list.length));
    };
    const heights = (way: Vec3) => {
      const out = new Float64Array(surface.nodes.length);
      for (let n = 0; n < surface.nodes.length; n++) out[n] = dot(sub(surface.point(n), wrist), way);
      return out;
    };
    // The hand itself: of the separate pieces of surface the hand joint carries (a cuff, something held, an apron's
    // edge), the one with the most protrusions along the hand.
    const first = heights(norm(sub(centreOf(carried), wrist)));
    const tipsOf = (height: Float64Array) => peaks(surface, height).filter(p => p.prominence >= TIP_PROMINENCE);
    let shell = new Set<number>();
    {
      const pieces: Set<number>[] = [], seen = new Set<number>();
      for (const n of carried) if (!seen.has(n)) { const piece = flood(surface, first, n, -Infinity); piece.forEach(m => seen.add(m)); pieces.push(piece); }
      const found = tipsOf(first);
      const score = (piece: Set<number>) => found.filter(p => piece.has(p.node)).length * 1e6 + [...piece].filter(n => carried.includes(n)).length;
      for (const piece of pieces) if (!shell.size || score(piece) > score(shell)) shell = piece;
    }
    const mostly = carried.filter(n => shell.has(n));
    const along = norm(sub(centreOf(mostly), wrist));
    const t = heights(along);
    // Square to the hand: where a point lies across it, and how far out.
    const across = (n: number): Vec3 => { const d = sub(surface.point(n), wrist); return sub(d, scale(along, dot(d, along))); };
    const reachList = mostly.map(n => t[n]!).sort((a, b) => a - b);
    const reach = reachList[Math.floor(reachList.length * 0.995)] ?? 0;
    const found = tipsOf(t).filter(p => shell.has(p.node) && t[p.node]! > 0.3 * reach);
    yield;
    // The thumb: a protrusion along the hand or out from it, the furthest aside from the longest finger and the shorter.
    const longest = found.reduce<Peak | null>((best, p) => !best || t[p.node]! > t[best.node]! ? p : best, null);
    const aside = (p: Peak) => longest ? Math.hypot(...sub(across(p.node), across(longest.node))) : 0;
    const thumbScore = (p: Peak) => aside(p) + 0.5 * (t[longest!.node]! - t[p.node]!);
    type Candidate = { peak: Peak; height: Float64Array; level: number };
    const best = (list: Candidate[]) => list.reduce<Candidate | null>((top, c) => !top || thumbScore(c.peak) > thumbScore(top.peak) ? c : top, null);
    const regionOf = (c: Candidate) => flood(surface, c.height, c.peak.node, c.level);
    // Along the hand first: a thumb that stands short of the fingers, well aside of the longest.
    // (It leaves the palm short of where the fingers part.)
    const along1 = found.filter(p => p !== longest && t[p.node]! <= 0.8 * reach && p.death <= THUMB_ROOT * reach).map(peak => ({ peak, height: t, level: peak.death }));
    const candidates: Candidate[] = along1.filter(c => aside(c.peak) >= THUMB_ASIDE);
    if (longest && !candidates.length) {
      // Out from the hand: a thumb held square to the fingers stands out of the palm rather than along it. It leaves the
      // palm short of the knuckles and is a fair part of the hand, not a crease of it.
      const side1 = reject([0, 0, 1], along), side2 = cross(along, side1);
      for (let k = 0; k < THUMB_DIRECTIONS; k++) {
        const turn = (2 * Math.PI * k) / THUMB_DIRECTIONS;
        if (k) yield;
        const height = heights(norm(add(scale(side1, Math.cos(turn)), scale(side2, Math.sin(turn)))));
        for (const peak of tipsOf(height)) {
          if (!shell.has(peak.node) || peak.prominence < 1.5 * TIP_PROMINENCE || t[peak.node]! < 0.2 * reach || t[peak.node]! > 0.8 * reach) continue;
          const c = { peak, height, level: peak.death }, region = regionOf(c);
          if (region.size < 0.03 * mostly.length || region.size > 0.3 * mostly.length) continue;
          if (Math.min(...[...region].map(n => t[n]!)) > THUMB_ROOT * reach) continue;
          candidates.push(c);
        }
      }
    }
    const chosen = best(candidates);
    const thumbPeak = chosen?.peak ?? null;
    const thumbOk = !!chosen && aside(chosen.peak) >= THUMB_ASIDE;
    const thumbRegion = thumbOk ? regionOf(chosen!) : new Set<number>();
    let active = thumbOk && reach > 0.08 && thumbRegion.size < 0.45 * mostly.length;
    const webs = found.filter(p => p.node !== thumbPeak?.node && !thumbRegion.has(p.node) && Number.isFinite(p.death)).map(p => p.death);
    const knuckle = Math.min(0.7 * reach, Math.max(0.4 * reach, webs.length ? Math.min(...webs) - 0.01 : 0.55 * reach));
    // The fingers: what joins the finger tips beyond the knuckle line, the thumb apart.
    const fingerRegion = new Set<number>();
    for (const p of found) if (!thumbRegion.has(p.node)) flood(surface, t, p.node, knuckle - 2 * KNUCKLE_BAND).forEach(n => { if (!thumbRegion.has(n)) fingerRegion.add(n); });

    // The palm: square to the flat of the hand and fingers (their least spread across the hand), facing the side the
    // thumb stands out to and the fingers already bend towards; the body's middle line breaks a tie.
    const flat = mostly.filter(n => !thumbRegion.has(n));
    let mean: Vec3 = [0, 0, 0];
    for (const n of flat) mean = add(mean, across(n));
    mean = scale(mean, 1 / Math.max(1, flat.length));
    const spread = [[0, 0, 0], [0, 0, 0], [0, 0, 0]] as [Vec3, Vec3, Vec3];
    for (const n of flat) { const d = sub(across(n), mean); for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) { const row = spread[i]!; row[k] = row[k]! + d[i]! * d[k]!; } }
    let width = reject([0, 0, 1], along);
    for (let i = 0; i < 40; i++) width = reject([dot(spread[0], width), dot(spread[1], width), dot(spread[2], width)], along);
    let palm = norm(cross(along, width));
    const inward = reject([-Math.sign(wrist[0]) || 1, 0, 0], along);
    const region = (lo: number, hi: number) => {
      let sum: Vec3 = [0, 0, 0], count = 0;
      for (const n of flat) if (t[n]! >= lo && t[n]! <= hi) { sum = add(sum, across(n)); count++; }
      return count ? scale(sum, 1 / count) : null;
    };
    const tips = region(0.85 * reach, Infinity), knuckles = region(knuckle - 0.01, knuckle + 0.01);
    const votes = {
      thumb: thumbOk ? dot(sub(across(thumbPeak!.node), mean), palm) : 0,
      bend: tips && knuckles ? dot(sub(tips, knuckles), palm) : 0,
      inward: dot(inward, palm),
    };
    const sign = Math.sign(Math.sign(votes.thumb) * (Math.abs(votes.thumb) > 0.005 ? 1 : 0)
      + Math.sign(votes.bend) * (Math.abs(votes.bend) > 0.003 ? 1 : 0) + 0.5 * Math.sign(votes.inward)) || 1;
    palm = scale(palm, sign);
    if (closed.includes(side)) active = false;
    // Across the palm towards the thumb.
    let lateral = norm(cross(along, palm));
    if (thumbOk && dot(sub(across(thumbPeak!.node), mean), lateral) < 0) lateral = scale(lateral, -1);

    // The fingers' chain: from the knuckle line to the tips, along the way they run.
    let base: Vec3 = [0, 0, 0], baseCount = 0, tipPoint: Vec3 = [0, 0, 0], tipCount = 0;
    for (const n of flat) {
      if (Math.abs(t[n]! - knuckle) < 0.01) { base = add(base, surface.point(n)); baseCount++; }
      if (t[n]! > 0.85 * reach) { tipPoint = add(tipPoint, surface.point(n)); tipCount++; }
    }
    base = baseCount ? scale(base, 1 / baseCount) : add(wrist, scale(along, knuckle));
    tipPoint = tipCount ? scale(tipPoint, 1 / tipCount) : add(wrist, scale(along, reach));
    const fingerAlong = norm(sub(tipPoint, base));
    const fingerLength = Math.max(0.02, dot(sub(tipPoint, base), fingerAlong) + 0.01);
    const fingerStops = [0, 0.42 * fingerLength, 0.72 * fingerLength];
    const fingerPalm = reject(palm, fingerAlong);
    const fingers: FingerChainPlan = {
      joints: fingerStops.map(u => add(base, scale(fingerAlong, u))) as [Vec3, Vec3, Vec3],
      tip: add(base, scale(fingerAlong, fingerLength)), axis: norm(cross(fingerAlong, fingerPalm)), vertices: 0,
    };

    // The thumb's chain: from deep in the palm where it turns, out along the thumb to its tip.
    let thumb = inactiveChain(add(wrist, scale(along, 0.3 * reach)), norm(add(along, lateral)), norm(cross(along, palm)));
    if (thumbOk) {
      const tip = surface.point(thumbPeak!.node);
      let root: Vec3 = [0, 0, 0], rootCount = 0;
      for (const n of thumbRegion) if (chosen!.height[n]! < chosen!.level + 0.01) { root = add(root, surface.point(n)); rootCount++; }
      root = rootCount ? scale(root, 1 / rootCount) : centreOf([...thumbRegion]);
      const thumbAlong = norm(sub(tip, root)), length = Math.max(0.015, dot(sub(tip, root), thumbAlong));
      // It closes towards the palm and across it, towards the little finger.
      const towards = reject(norm(sub(scale(palm, 0.75), scale(lateral, 0.65))), thumbAlong);
      thumb = {
        joints: [add(root, scale(thumbAlong, -0.3 * length)), add(root, scale(thumbAlong, 0.35 * length)), add(root, scale(thumbAlong, 0.7 * length))],
        tip, axis: norm(cross(thumbAlong, towards)), vertices: 0,
      };
    }

    yield;
    if (active) {
      const thumbStart = new Float64Array(surface.nodes.length);
      for (const n of thumbRegion) thumbStart[n] = 1;
      const thumbShare = soften(surface, thumbStart, 2);
      const chainBase = 24 + sideIndex * 6;
      const thumbAxisAlong = norm(sub(thumb.tip, thumb.joints[0]));
      const thumbStops = thumb.joints.map(j => dot(sub(j, thumb.joints[0]), thumbAxisAlong));
      const thumbLength = dot(sub(thumb.tip, thumb.joints[0]), thumbAxisAlong);
      // Each point of the hand's surface: what stays with the hand, then each thumb and finger joint's share.
      const share = surface.nodes.map(() => new Float64Array(7));
      for (let n = 0; n < surface.nodes.length; n++) {
        const p = surface.point(n), out = share[n]!;
        const thumbPart = thumbShare[n]!;
        // Beyond the knuckles, and not the thumb: the fingers'.
        const fingerPart = fingerRegion.has(n) ? (1 - thumbPart) * smoothstep((t[n]! - (knuckle - KNUCKLE_BAND)) / (2 * KNUCKLE_BAND)) : 0;
        out[0] = 1 - thumbPart - fingerPart;
        if (fingerPart > 0) {
          const c = chainShares(dot(sub(p, fingers.joints[0]), fingerAlong), fingerStops, Math.max(KNUCKLE_BAND, JOINT_BAND * fingerLength));
          out[0] += fingerPart * c[0]!;
          for (let k = 0; k < 3; k++) out[4 + k] = fingerPart * c[k + 1]!;
        }
        if (thumbPart > 0) {
          const c = chainShares(dot(sub(p, thumb.joints[0]), thumbAxisAlong), thumbStops, Math.max(0.5 * KNUCKLE_BAND, JOINT_BAND * thumbLength));
          out[0] += thumbPart * c[0]!;
          for (let k = 0; k < 3; k++) out[1 + k] = thumbPart * c[k + 1]!;
        }
      }
      // Spread over the surface about a centimetre, so no edge of a coarse mesh steps from the hand to a finger.
      let edge = 0, edges = 0;
      for (let n = 0; n < surface.nodes.length; n++) for (const m of surface.neighbours[n]!) { edge += Math.hypot(...sub(surface.point(n), surface.point(m))); edges++; }
      const rings = Math.min(6, Math.max(1, Math.round(SPREAD / Math.max(1e-4, edge / Math.max(1, edges)))));
      for (let s = 0; s < 7; s++) {
        yield;
        const smooth = soften(surface, Float64Array.from(share, x => x[s]!), rings);
        for (let n = 0; n < share.length; n++) share[n]![s] = smooth[n]!;
      }
      for (let v = 0; v < vertices; v++) {
        const n = surface.node[v]!;
        if (n < 0) continue;
        const w = handWeight(v, joint), out = share[n]!;
        if (w <= 0 || out[0]! >= 1 - 1e-4) continue;
        const shares = new Map<number, number>();
        for (let slot = 0; slot < 4; slot++) {
          const j = data.joints[v * 4 + slot]!, ws = data.weights[v * 4 + slot]! / 255;
          if (ws > 0 && j !== joint) shares.set(j, (shares.get(j) ?? 0) + ws);
        }
        if (out[0]! > 0) shares.set(joint, w * out[0]!);
        for (let k = 0; k < 6; k++) if (out[1 + k]! > 0) shares.set(chainBase + k, w * out[1 + k]!);
        if (out[4]! + out[5]! + out[6]! > 1e-4) fingers.vertices++;
        if (out[1]! + out[2]! + out[3]! > 1e-4) thumb.vertices++;
        // Four influences at most: the strongest, renormalised.
        const best = [...shares].filter(([, x]) => x > 1e-5).sort((a, b) => b[1] - a[1]).slice(0, 4);
        const total = best.reduce((sum, [, x]) => sum + x, 0);
        for (let slot = 0; slot < 4; slot++) {
          joints[v * 4 + slot] = best[slot]?.[0] ?? 0;
          weights[v * 4 + slot] = best[slot] ? best[slot]![1] / total : 0;
        }
      }
    }
    hands[side] = {
      side, hand: `${side}Hand` as ResidentJoint, active, tips: found.length, handVertices, palm, reach, knuckle, votes,
      fingers, thumb,
    };
    yield;
  }
  return { hands, joints, weights };
}

const plans = new WeakMap<ResidentRigData, ResidentFingerPlan>();
/** One plan per rig (every actor of a model shares it); the `closed` hands are modelled closed or covered and keep their shape. */
export function residentFingerPlan(data: ResidentRigData, geometry: THREE.BufferGeometry, closed: readonly FingerSide[] = []): ResidentFingerPlan {
  const steps = residentFingerPlanSteps(data, geometry, closed);
  for (;;) { const next = steps.next(); if (next.done) return next.value; }
}

/** residentFingerPlan a hand at a time (A80). */
export function* residentFingerPlanSteps(data: ResidentRigData, geometry: THREE.BufferGeometry, closed: readonly FingerSide[] = []): Generator<void, ResidentFingerPlan, void> {
  let plan = plans.get(data);
  if (!plan) {
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const index = geometry.index?.array ?? Uint32Array.from({ length: position.count }, (_, i) => i);
    plan = yield* planResidentFingersSteps(data, position.array as ArrayLike<number>, index, closed);
    plans.set(data, plan);
  }
  return plan;
}

/** The bind placement of every finger joint (model space), in FINGER_JOINTS order, turned as its hand is. */
export function fingerBindJoints(plan: ResidentFingerPlan, data: ResidentRigData): { name: FingerJoint; parent: FingerJoint | ResidentJoint; position: Vec3; quaternion: [number, number, number, number] }[] {
  return FINGER_JOINTS.map(name => {
    const side = name.startsWith('Left') ? 'Left' : 'Right', chain = name.includes('Thumb') ? 'thumb' : 'fingers';
    const k = Number(name.at(-1)) - 1;
    const hand = data.bones[HAND_INDEX[side]]!;
    return {
      name, parent: k === 0 ? `${side}Hand` as ResidentJoint : name.replace(/\d$/, String(k)) as FingerJoint,
      position: plan.hands[side][chain].joints[k]!, quaternion: hand.quaternion,
    };
  });
}

const _axis = new THREE.Vector3();
/** Curls a resident's finger chains; each joint turns about its chain's bend axis. */
export class ResidentFingers {
  private readonly current: Record<FingerSide, HandCurl> = { Left: { ...OPEN_CURL }, Right: { ...OPEN_CURL } };
  private readonly axes: Record<FingerSide, Record<FingerChain, THREE.Vector3>>;
  constructor(readonly bones: Record<FingerJoint, THREE.Bone>, readonly plan: ResidentFingerPlan, data: ResidentRigData) {
    this.axes = {} as ResidentFingers['axes'];
    for (const side of FINGER_SIDES) {
      const hand = new THREE.Quaternion(...data.bones[HAND_INDEX[side]]!.quaternion).normalize().invert();
      this.axes[side] = {
        Thumb: new THREE.Vector3(...plan.hands[side].thumb.axis).applyQuaternion(hand).normalize(),
        Fingers: new THREE.Vector3(...plan.hands[side].fingers.axis).applyQuaternion(hand).normalize(),
      };
    }
    // As bound, the hands stand as modelled (open); the rig relaxes them once its skeleton is bound.
  }

  /** The curl a hand holds now. */
  curl(side: FingerSide): Readonly<HandCurl> { return this.current[side]; }

  /** Pose a hand at once. */
  set(side: FingerSide, curl: Readonly<HandCurl>): void {
    this.current[side] = { fingers: curl.fingers, thumb: curl.thumb };
    for (const chain of FINGER_CHAINS) {
      const amount = chain === 'Thumb' ? curl.thumb : curl.fingers;
      _axis.copy(this.axes[side][chain]);
      for (let k = 0; k < 3; k++) this.bones[`${side}Hand${chain}${(k + 1) as 1 | 2 | 3}`].quaternion.setFromAxisAngle(_axis, FINGER_BEND[chain][k]! * amount);
    }
  }

  /** Ease a hand towards a curl (`rate` per second). */
  ease(side: FingerSide, target: Readonly<HandCurl>, dt: number, rate = CURL_RATE): void {
    const k = -Math.expm1(-Math.max(0, dt) * rate), c = this.current[side];
    this.set(side, { fingers: c.fingers + (target.fingers - c.fingers) * k, thumb: c.thumb + (target.thumb - c.thumb) * k });
  }
}

/** Each finger joint's turn at a curl (bind space, the hand at rest), keyed by its index in the skeleton. */
function chainTransforms(plan: ResidentFingerPlan, side: FingerSide, curl: Readonly<HandCurl>): Map<number, THREE.Matrix4> {
  const base = 24 + FINGER_SIDES.indexOf(side) * 6;
  const transforms = new Map<number, THREE.Matrix4>();
  for (const chain of FINGER_CHAINS) {
    const p = plan.hands[side][chain === 'Thumb' ? 'thumb' : 'fingers'], amount = chain === 'Thumb' ? curl.thumb : curl.fingers;
    let world = new THREE.Matrix4();
    for (let k = 0; k < 3; k++) {
      const at = new THREE.Vector3(...p.joints[k]!);
      const turn = new THREE.Matrix4().makeRotationAxis(_axis.set(...p.axis), FINGER_BEND[chain][k]! * amount);
      const about = new THREE.Matrix4().makeTranslation(at.x, at.y, at.z).multiply(turn).multiply(new THREE.Matrix4().makeTranslation(-at.x, -at.y, -at.z));
      world = world.clone().multiply(about);
      transforms.set(base + (chain === 'Thumb' ? 0 : 3) + k, world);
    }
  }
  return transforms;
}

/**
 * Where a hand's vertices lie at a curl, in the model's bind space with the hand at rest (linear blending, as the rig's
 * skin does without its dual-quaternion pass): for the grip measurements and the tests.
 */
export function curledVertices(plan: ResidentFingerPlan, position: ArrayLike<number>, side: FingerSide, curl: Readonly<HandCurl>, only?: Iterable<number>): Map<number, THREE.Vector3> {
  const transforms = chainTransforms(plan, side, curl);
  const out = new Map<number, THREE.Vector3>(), v = new THREE.Vector3(), sum = new THREE.Vector3();
  const list = only ?? Array.from({ length: position.length / 3 }, (_, i) => i);
  for (const i of list) {
    v.set(position[i * 3]!, position[i * 3 + 1]!, position[i * 3 + 2]!);
    sum.set(0, 0, 0);
    for (let s = 0; s < 4; s++) {
      const w = plan.weights[i * 4 + s]!;
      if (w <= 0) continue;
      const m = transforms.get(plan.joints[i * 4 + s]!);
      sum.addScaledVector(m ? v.clone().applyMatrix4(m) : v, w);
    }
    out.set(i, sum.clone());
  }
  return out;
}

/** A handle to close a hand on: a line in the model's bind space (with the hand at rest) and its radius. */
export interface Handle { origin: THREE.Vector3; direction: THREE.Vector3; radius: number }
/** A finger touches a handle within this distance of its surface (metres). */
export const GRIP_CONTACT = 0.004;

/** The vertices that close on a handle: those the fingers' last two joints mostly carry. */
export function fingertipVertices(plan: ResidentFingerPlan, side: FingerSide): number[] {
  const base = 24 + FINGER_SIDES.indexOf(side) * 6 + 3, out: number[] = [];
  for (let v = 0; v < plan.weights.length / 4; v++) {
    let w = 0;
    for (let s = 0; s < 4; s++) { const j = plan.joints[v * 4 + s]!; if (j === base + 1 || j === base + 2) w += plan.weights[v * 4 + s]!; }
    if (w >= 0.5) out.push(v);
  }
  return out;
}

/** The gap from the nearest of `points` to the handle's surface (negative inside it). */
export function handleGap(points: Iterable<THREE.Vector3>, handle: Handle): number {
  let best = Infinity;
  const d = new THREE.Vector3();
  for (const p of points) {
    d.subVectors(p, handle.origin);
    d.addScaledVector(handle.direction, -d.dot(handle.direction));
    best = Math.min(best, d.length() - handle.radius);
  }
  return best;
}

/**
 * How far a hand curls to close on a handle: the least curl at which its fingertips touch it, the thumb following.
 * A handle the fingers never reach is held in a fist; a hand without finger chains stays relaxed.
 */
export function gripCurl(plan: ResidentFingerPlan, position: ArrayLike<number>, side: FingerSide, handle: Handle): HandCurl {
  if (!plan.hands[side].active) return { ...RELAXED_CURL };
  const tips = fingertipVertices(plan, side);
  if (!tips.length) return { ...RELAXED_CURL };
  const at = (fingers: number) => handleGap(curledVertices(plan, position, side, { fingers, thumb: 0 }, tips).values(), handle);
  if (at(0) <= GRIP_CONTACT) return { fingers: 0, thumb: 0.3 };
  let low = 0, high = 1;
  if (at(1) > GRIP_CONTACT) {
    // Not reached on the way: close as far as the nearest pass.
    let best = 1, gap = Infinity;
    for (let c = 0.05; c <= 1.0001; c += 0.05) { const g = at(c); if (g < gap) { gap = g; best = c; } }
    return { fingers: best, thumb: Math.min(FIST_CURL.thumb, 0.3 + 0.6 * best) };
  }
  // The first contact on the way in (coarse steps, then halving).
  for (let c = 0.05; c <= 1.0001; c += 0.05) { if (at(c) <= GRIP_CONTACT) { high = c; break; } low = c; }
  for (let i = 0; i < 12; i++) { const mid = (low + high) / 2; if (at(mid) <= GRIP_CONTACT) high = mid; else low = mid; }
  return { fingers: high, thumb: Math.min(FIST_CURL.thumb, 0.3 + 0.6 * high) };
}

/** The vertices the hand carries mostly, its own and its fingers'. */
function handVerticesOf(plan: ResidentFingerPlan, side: FingerSide): number[] {
  const hand = HAND_INDEX[side], base = 24 + FINGER_SIDES.indexOf(side) * 6, out: number[] = [];
  for (let v = 0; v < plan.weights.length / 4; v++) {
    let w = 0;
    for (let s = 0; s < 4; s++) { const j = plan.joints[v * 4 + s]!; if (j === hand || (j >= base && j < base + 6)) w += plan.weights[v * 4 + s]!; }
    if (w >= 0.5) out.push(v);
  }
  return out;
}

/** A pen held to write (A75): the fingers close this far on it; the thumb as far as it takes to lie along it. */
export const PINCH_CURL: Readonly<HandCurl> = { fingers: 0.45, thumb: 0.45 };
/**
 * The pen lies just clear (metres) of the finger pads' skin, out of the palm and towards the thumb, its nib this far
 * beyond them, and this far out of the thumb's middle on its palm side.
 */
const PAD_DEPTH = 0.003, PAD_ASIDE = 0.002, NIB_REACH = 0.03, THUMB_SIDE = 0.012;

/** The least distance from `point` to the segment from `origin` along `direction` for `length`. */
function segmentGap(point: THREE.Vector3, origin: THREE.Vector3, direction: THREE.Vector3, length: number): number {
  const d = point.clone().sub(origin), t = Math.min(length, Math.max(0, d.dot(direction)));
  return d.addScaledVector(direction, -t).length();
}

/**
 * Where a pen lies in a writing hand (A75), in the model's bind space with the hand at rest: on the thumb side of the
 * curled fingers' pads with its nib a little beyond them, its shaft back along the inside of the thumb and out past the
 * web of the hand, and the thumb curled so its tip is nearest the shaft. The residents' fingers bend as one and their
 * thumbs cannot reach the pads, so this is a pen pressed by the fingers against the thumb. Null for a hand without
 * finger chains.
 */
export function pinchHandle(plan: ResidentFingerPlan, position: ArrayLike<number>, side: FingerSide): { origin: THREE.Vector3; direction: THREE.Vector3; curl: HandCurl } | null {
  const hand = plan.hands[side];
  if (!hand.active) return null;
  const base = 24 + FINGER_SIDES.indexOf(side) * 6, v = (a: Vec3) => new THREE.Vector3(...a);
  const fingerEnd = chainTransforms(plan, side, PINCH_CURL).get(base + 5)!;
  const pad = v(hand.fingers.joints[2]).lerp(v(hand.fingers.tip), 0.5).applyMatrix4(fingerEnd);
  const palm = v(hand.palm), padPalm = palm.clone().transformDirection(fingerEnd);
  const along = v(hand.fingers.joints[1]).sub(v(hand.fingers.joints[0])).normalize();
  const aside = v(hand.thumb.joints[1]).sub(v(hand.fingers.joints[0]));
  aside.addScaledVector(along, -aside.dot(along)).addScaledVector(palm, -aside.dot(palm)).normalize();
  // The pen touches the fingers' skin where it faces the palm and the thumb most: from there, just clear of it.
  let contact = pad, most = -Infinity;
  for (const p of curledVertices(plan, position, side, PINCH_CURL, fingertipVertices(plan, side)).values()) {
    const score = p.dot(padPalm) + p.dot(aside);
    if (score > most) { most = score; contact = p; }
  }
  const touch = contact.clone().addScaledVector(padPalm, PAD_DEPTH).addScaledVector(aside, PAD_ASIDE);
  // Back along the inside of the thumb: over the middle of the thumb as it curls onto the pen, on its palm side.
  let best: { origin: THREE.Vector3; direction: THREE.Vector3; curl: HandCurl; gap: number } | null = null;
  for (let c = 0; c <= 0.95001; c += 0.05) {
    const turn = chainTransforms(plan, side, { fingers: PINCH_CURL.fingers, thumb: c });
    const rest = v(hand.thumb.joints[1]).lerp(v(hand.thumb.joints[2]), 0.5).applyMatrix4(turn.get(base)!)
      .addScaledVector(palm.clone().transformDirection(turn.get(base)!), THUMB_SIDE);
    // From the pads to the thumb, the nib standing out beyond the pads on the same line.
    const direction = rest.sub(touch).normalize(), origin = touch.clone().addScaledVector(direction, -NIB_REACH);
    // The thumb's tip presses on the shaft too: the curl that brings it nearest.
    const tip = v(hand.thumb.tip).applyMatrix4(turn.get(base + 2)!);
    const gap = segmentGap(tip, origin, direction, 0.15) + 0.002 * c;
    if (!best || gap < best.gap) best = { origin, direction, curl: { fingers: PINCH_CURL.fingers, thumb: c }, gap };
  }
  return { origin: best!.origin, direction: best!.direction, curl: best!.curl };
}

/** A handle that runs across the fingers is seated in the hand like this: the turn of the tool is kept. */
const ACROSS_FINGERS = 0.6;
/** It lies this far (metres) short of the knuckle line, along the fingers, clear of the palm by this much. */
const GRIP_SEAT = 0.012, GRIP_CLEAR = 0.001;

/**
 * Seat a handle in a hand (A72): a handle that runs across the fingers is moved, square to its own length, to lie just
 * short of the knuckles and just clear of the palm, where the curled fingers close on it; a handle that runs along the
 * fingers (a quill) is taken into the writing pinch and turned (`turn`, about its own origin). Returns how far it moved
 * (the model's bind space) and the grip on it.
 */
export function seatHandle(plan: ResidentFingerPlan, position: ArrayLike<number>, side: FingerSide, handle: Handle): { offset: THREE.Vector3; curl: HandCurl; handle: Handle; turn?: THREE.Quaternion } {
  const hand = plan.hands[side], offset = new THREE.Vector3();
  if (!hand.active) return { offset, curl: { ...RELAXED_CURL }, handle };
  const along = new THREE.Vector3(...hand.fingers.joints[1]).sub(new THREE.Vector3(...hand.fingers.joints[0])).normalize();
  // A pen along the fingers is taken into the writing pinch, turned to lie through the web of the hand (A75).
  const pinch = Math.abs(handle.direction.dot(along)) >= ACROSS_FINGERS ? pinchHandle(plan, position, side) : null;
  if (pinch) {
    return { offset: pinch.origin.clone().sub(handle.origin), curl: pinch.curl, turn: new THREE.Quaternion().setFromUnitVectors(handle.direction, pinch.direction),
      handle: { origin: pinch.origin, direction: pinch.direction, radius: handle.radius } };
  }
  if (Math.abs(handle.direction.dot(along)) < ACROSS_FINGERS) {
    const palm = new THREE.Vector3(...hand.palm);
    palm.addScaledVector(along, -palm.dot(along)).normalize();
    const target = new THREE.Vector3(...hand.fingers.joints[0]).addScaledVector(along, -GRIP_SEAT);
    // Square to the handle: from where it was to the knuckle line, then out of the palm until it clears the hand.
    const step = target.sub(handle.origin);
    step.addScaledVector(handle.direction, -step.dot(handle.direction));
    const vertices = handVerticesOf(plan, side), points: THREE.Vector3[] = [];
    const near = new THREE.Vector3(...hand.fingers.joints[0]);
    for (const v of vertices) {
      const p = new THREE.Vector3(position[v * 3]!, position[v * 3 + 1]!, position[v * 3 + 2]!);
      if (p.distanceTo(near) < hand.reach) points.push(p);
    }
    const out = palm.clone().addScaledVector(handle.direction, -palm.dot(handle.direction)).normalize();
    const moved: Handle = { origin: handle.origin.clone().add(step), direction: handle.direction, radius: handle.radius };
    for (let s = 0; s < 0.08 && handleGap(points, moved) < GRIP_CLEAR; s += 0.001) moved.origin.addScaledVector(out, 0.001);
    offset.subVectors(moved.origin, handle.origin);
    handle = moved;
  }
  return { offset, curl: gripCurl(plan, position, side, handle), handle };
}
