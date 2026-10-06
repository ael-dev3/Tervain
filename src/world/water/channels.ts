import { distToPolyline, type Terrain } from '../terrain';
import { FORD, STREAMS, type V2 } from '../layout';

/**
 * The valley's running water as hydraulics rather than painted ribbons. Each channel is sampled every metre along its
 * course; at every sample the bed, the bank tops and the flow decide one level surface across the channel:
 *
 *  - water never runs uphill: walking downstream the surface only falls;
 *  - where the bed rises (the ford's gravel bar, a riffle) the water upstream backs up into a calm pool until it can
 *    spill over, and drops in a short rapid on the far side;
 *  - steep reaches carry fast, broken water; flat pools are slow and smooth;
 *  - a channel's end that climbs out of its valley stays dry: the water ends in a pond against the rising ground;
 *  - the quest's flow (0..1) sets how much water each channel carries: its depth over the bars and its speed.
 *
 * Renderer-free: the water meshes, floating objects, swimming and the river sounds all read these samples.
 */

export type ChannelId = 'main' | 'village' | 'quarry' | 'rill';

/** A course of running water: an authored stream, or the spring's short fall. */
export interface ChannelSpec {
  id: ChannelId;
  halfWidth: number;
  depth: number;
  points: readonly V2[];
}

export interface ChannelSample {
  x: number;
  z: number;
  /** Metres along the channel from its head. */
  s: number;
  /** Unit downstream direction. */
  tx: number;
  tz: number;
  /** Lowest ground across the channel's middle, and the lower of its two bank tops. */
  bed: number;
  bank: number;
  /** Normal flow depth over this bed at full flow (m). */
  level: number;
  /** Solved water surface for the current flow (m), or NaN where this sample is dry. */
  surface: number;
  /** Surface fall per metre, downstream (>= 0). */
  slope: number;
  /** Mean speed (m/s) and whiteness of the water (0 calm .. 1 white rapids). */
  speed: number;
  rough: number;
}

export interface Channel {
  id: ChannelId;
  halfWidth: number;
  /** The flow this channel was last solved for. */
  flow: number;
  samples: ChannelSample[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Below this flow a channel is treated as dry; the managed channels can be shut off entirely. */
export const DRY_FLOW = 0.025;
/** Water stays this far below the lower bank top, so it never floods out of its cut. */
const FREEBOARD = 0.12;
/** The slowest a channel ever drifts (m/s): even a pool turns over. */
const POOL_DRIFT = 0.08;

/** Resample an authored course every `step` metres, gently rounding its corners. */
function resample(points: readonly V2[], step: number): V2[] {
  const raw: V2[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!, b = points[i + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / step));
    for (let k = 0; k < n; k++) raw.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
  }
  raw.push(points[points.length - 1]!);
  // Two passes of a [1 2 1] average keep the cut's centre line (the terrain carving follows the authored polyline)
  // within a few centimetres while removing the polyline's kinks.
  let out = raw;
  for (let pass = 0; pass < 2; pass++) {
    out = out.map((p, i) => {
      if (i === 0 || i === out.length - 1) return p;
      const a = out[i - 1]!, b = out[i + 1]!;
      return { x: (a.x + 2 * p.x + b.x) / 4, z: (a.z + 2 * p.z + b.z) / 4 };
    });
  }
  return out;
}

function nominalDepth(spec: ChannelSpec, x: number, z: number): number {
  if (spec.id !== 'main') return spec.depth;
  const fd = Math.hypot(x - FORD.x, z - FORD.z);
  return FORD.depth + (spec.depth - FORD.depth) * smoothstep(FORD.r * 0.45, FORD.r, fd);
}

/** The static course of each channel: centre line, bed and banks. Flow is applied by `solveChannel`. */
export function buildChannels(terrain: Pick<Terrain, 'heightAt' | 'carveAt'>, specs: readonly ChannelSpec[] = STREAMS): Channel[] {
  return specs.map((spec) => {
    const line = resample(spec.points, 1);
    let s = 0;
    const samples: ChannelSample[] = line.map((p, i) => {
      if (i > 0) s += Math.hypot(p.x - line[i - 1]!.x, p.z - line[i - 1]!.z);
      const a = line[Math.max(0, i - 1)]!, b = line[Math.min(line.length - 1, i + 1)]!;
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const tx = (b.x - a.x) / len, tz = (b.z - a.z) / len;
      // Bed: the lowest of the middle third (a level surface across must clear the deepest line, not the centre).
      const across = (d: number) => terrain.heightAt(p.x - tz * d, p.z + tx * d);
      const bed = Math.min(across(0), across(spec.halfWidth * 0.3), across(-spec.halfWidth * 0.3));
      const bank = Math.min(across(spec.halfWidth * 1.45), across(-spec.halfWidth * 1.45));
      const depth = nominalDepth(spec, p.x, p.z);
      // The established normal depth: a share of the cut, never more than most of what the cut can hold here.
      const level = clamp(Math.max(0.16, depth * 0.44), 0.035, Math.max(0.035, terrain.carveAt(p.x, p.z) * 0.7));
      return { x: p.x, z: p.z, s, tx, tz, bed, bank, level, surface: Number.NaN, slope: 0, speed: 0, rough: 0 };
    });
    return { id: spec.id, halfWidth: spec.halfWidth, flow: Number.NaN, samples };
  });
}

/** Normal flow depth at a given quest flow: a trickle still wets the bed; full flow fills the cut's working depth. */
export function flowDepth(level: number, flow: number): number {
  return level * (0.25 + 0.75 * clamp(flow, 0, 1));
}

/**
 * Solve one channel's surface for `flow`. `outletLevel` optionally fixes the water level where the channel ends in
 * another body (the quarry race backs up from the main stream); `headLevel` caps the head (a race fed from a sluice
 * cannot stand higher than the water that feeds it). `flowAt` lets one course carry two managed flows (the spring
 * reach above the sluice and the main stream below it).
 */
export function solveChannel(channel: Channel, flow: number, options: { outletLevel?: number; headLevel?: number; flowAt?: (s: number) => number } = {}): Channel {
  const samples = channel.samples, n = samples.length;
  const flowOf = (sample: ChannelSample) => clamp(options.flowAt ? options.flowAt(sample.s) : flow, 0, 1);
  channel.flow = flow;
  for (const sample of samples) { sample.surface = Number.NaN; sample.slope = 0; sample.speed = 0; sample.rough = 0; }
  if (n < 2) return channel;

  // The outlet: where the channel ends in another body, or else its lowest water in the lower part of its course
  // (beyond it the cut climbs out of the valley and the water rests in a pond against the rising ground).
  let outlet = n - 1;
  let outletSurface: number;
  if (options.outletLevel !== undefined) outletSurface = Math.max(options.outletLevel, samples[outlet]!.bed + flowDepth(samples[outlet]!.level, flowOf(samples[outlet]!)) * 0.5);
  else {
    let lowest = Infinity;
    for (let i = Math.floor(n * 0.4); i < n; i++) {
      const sample = samples[i]!, v = sample.bed + flowDepth(sample.level, flowOf(sample));
      if (v < lowest) { lowest = v; outlet = i; }
    }
    outletSurface = lowest;
  }
  if (flowOf(samples[outlet]!) < DRY_FLOW && options.flowAt === undefined) return channel;

  // Upstream of the outlet: the surface may only rise, and stays below the banks unless the water downstream already
  // stands higher (a low place in the bank, such as a race's intake, is where the stream spills; it cannot fall there).
  const surface = new Float64Array(n).fill(Number.NaN);
  surface[outlet] = outletSurface;
  for (let i = outlet - 1; i >= 0; i--) {
    const sample = samples[i]!;
    const f = flowOf(sample);
    if (f < DRY_FLOW) { surface[i] = Number.NaN; continue; }
    const normal = sample.bed + flowDepth(sample.level, f);
    const downstream = Number.isFinite(surface[i + 1]!) ? surface[i + 1]! : -Infinity;
    surface[i] = Math.max(Math.min(Math.max(normal, downstream), sample.bank - FREEBOARD), downstream);
    // A cut too shallow for even its normal depth still runs a thin sheet over its bed.
    surface[i] = Math.max(surface[i]!, sample.bed + 0.02);
  }
  if (options.headLevel !== undefined) {
    // Fed from another body: no higher than the feeding water; reaches that would need more stay dry.
    for (let i = 0; i <= outlet; i++) {
      if (!Number.isFinite(surface[i]!)) continue;
      const cap = i === 0 ? options.headLevel : Math.min(options.headLevel, Number.isFinite(surface[i - 1]!) ? surface[i - 1]! : options.headLevel);
      if (surface[i]! > cap) surface[i] = samples[i]!.bed < cap - 0.02 ? cap : Number.NaN;
    }
  }
  // Beyond the outlet the water rests level until the ground rises above it.
  for (let i = outlet + 1; i < n; i++) {
    const sample = samples[i]!, previous = surface[i - 1]!;
    surface[i] = Number.isFinite(previous) && sample.bed < previous - 0.02 ? previous : Number.NaN;
  }

  for (let i = 0; i < n; i++) {
    const sample = samples[i]!;
    sample.surface = surface[i]!;
    if (!Number.isFinite(sample.surface)) continue;
    const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2);
    const sa = Number.isFinite(surface[a]!) ? surface[a]! : sample.surface, sb = Number.isFinite(surface[b]!) ? surface[b]! : sample.surface;
    const slope = Math.max(0, (sa - sb) / Math.max(1e-3, samples[b]!.s - samples[a]!.s));
    sample.slope = slope;
    const f = flowOf(sample);
    const depth = Math.max(0.02, sample.surface - sample.bed);
    // Manning's formula for a wide rough channel (n = 0.04), then scaled by how much water the quest lets through.
    const manning = (Math.pow(depth * 0.8, 2 / 3) * Math.sqrt(slope)) / 0.04;
    sample.speed = Math.max(POOL_DRIFT, Math.min(4.5, manning)) * (0.3 + 0.7 * f);
    // White water: steep falls, and shallow fast water over stones.
    sample.rough = clamp(smoothstep(0.025, 0.16, slope) + smoothstep(1.1, 2.6, sample.speed) * 0.5 * smoothstep(0.5, 0.15, depth), 0, 1);
  }
  return channel;
}

/** Where a point lies against a channel: the nearest sample, distance across and how far along. */
export function nearestSample(channel: Channel, x: number, z: number): { index: number; across: number; t: number } {
  const samples = channel.samples;
  let bestD = Infinity, index = 0, t = 0, across = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i]!, b = samples[i + 1]!;
    const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
    const u = l2 > 0 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1) : 0;
    const qx = a.x + dx * u, qz = a.z + dz * u;
    const d = Math.hypot(x - qx, z - qz);
    if (d < bestD) {
      bestD = d; index = i; t = u;
      // Signed: positive to the right of the flow.
      across = (x - qx) * -a.tz + (z - qz) * a.tx >= 0 ? d : -d;
    }
  }
  return { index, across, t };
}

/** Distance from a point to a channel's authored course (cheap, for audio and bounds). */
export function channelDistance(id: Exclude<ChannelId, 'rill'>, x: number, z: number): number {
  const spec = STREAMS.find((s) => s.id === id)!;
  return distToPolyline(x, z, spec.points).d;
}
