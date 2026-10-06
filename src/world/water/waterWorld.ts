import { SEA_LEVEL } from '../layout';
import type { Terrain } from '../terrain';
import { BATHY, buildBathymetry, openPhase, sampleBathymetry, type Bathymetry } from './bathymetry';
import { buildChannels, DRY_FLOW, nearestSample, solveChannel, type Channel, type ChannelId, type ChannelSample } from './channels';
import { SPRING_BASIN, SPRING_RILL, SPRING_SOURCE } from './spring';
import { breaking, crestWobble, seaOffset, SWELL, SWELL_DIR, SWELL_OMEGA, swashRise, type WaveOffset } from './waves';

/**
 * Every body of water in the realm behind one question: is there water here, how high does it stand, how deep is it,
 * and which way is it moving? The sea (waves, surf and swash), the main stream, the mill and quarry races, the spring's
 * fall and its pool. Used alike by the water meshes, floating objects, the swimmer and the water sounds, so what you
 * see, what floats and what you hear agree.
 */

export type WaterBody = 'sea' | ChannelId | 'rill' | 'pool';

export interface WaterSample {
  body: WaterBody;
  /** Water surface and ground height here (m), and the depth between them. */
  surface: number;
  bed: number;
  depth: number;
  /** Water velocity (m/s, world axes). */
  flowX: number;
  flowZ: number;
  /** 0 smooth .. 1 white water (surf, rapids, the fall). */
  rough: number;
}

export interface WaterFlows {
  spring: number;
  main: number;
  village: number;
  quarry: number;
}

/** How quickly the managed channels answer the quest's flow (per second, exponential). */
const FLOW_EASE = 0.6;
/** A re-solve of the channels waits until a flow has changed by this much (they move slowly). */
const RESOLVE_STEP = 0.004;
/** The pool's mesh and its water reach no further than this from its centre. */
export const POOL_REACH = SPRING_BASIN.r + 0.35;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** A coarse grid of which channel segments pass near each 8 m cell, so a sample need not test every metre of water. */
class SegmentIndex {
  private cells = new Map<number, { channel: Channel; i: number }[]>();
  constructor(channels: Channel[], reach: (c: Channel) => number) {
    for (const channel of channels) {
      const r = reach(channel);
      for (let i = 0; i < channel.samples.length - 1; i++) {
        const a = channel.samples[i]!, b = channel.samples[i + 1]!;
        const x0 = Math.floor((Math.min(a.x, b.x) - r) / 8), x1 = Math.floor((Math.max(a.x, b.x) + r) / 8);
        const z0 = Math.floor((Math.min(a.z, b.z) - r) / 8), z1 = Math.floor((Math.max(a.z, b.z) + r) / 8);
        for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
          const key = cx * 4096 + cz;
          let list = this.cells.get(key);
          if (!list) this.cells.set(key, (list = []));
          if (!list.some((e) => e.channel === channel && e.i === i)) list.push({ channel, i });
        }
      }
    }
  }
  near(x: number, z: number) { return this.cells.get(Math.floor(x / 8) * 4096 + Math.floor(z / 8)) ?? []; }
}

export class WaterWorld {
  readonly bathymetry: Bathymetry;
  readonly channels: Channel[];
  readonly rill: Channel;
  /** Eased quest flows, 0..1. */
  readonly flows: WaterFlows = { spring: 0.3, main: 0.3, village: 0.1, quarry: 0.3 };
  /** Seconds on the water's own clock: waves, surf and drift. Stops for Reduced Motion; the quest flow never does. */
  time = 0;
  /** Changes whenever channel surfaces are re-solved, so meshes know to refresh. */
  revision = 0;
  private solvedFlows: WaterFlows = { spring: Number.NaN, main: Number.NaN, village: Number.NaN, quarry: Number.NaN };
  private index: SegmentIndex;
  private sourceIndex: number;
  private branchIndex: number;
  private readonly offset: WaveOffset = { x: 0, y: 0, z: 0 };

  constructor(private readonly terrain: Pick<Terrain, 'heightAt' | 'carveAt'>) {
    this.bathymetry = buildBathymetry(terrain);
    this.channels = buildChannels(terrain);
    // The spring's short fall into its pool: a course of its own, cut by the water rather than by the terrain.
    this.rill = buildChannels(terrain, [{ id: 'rill', halfWidth: 0.75, depth: 0.22, points: SPRING_RILL }])[0]!;
    const main = this.channel('main');
    // The main stream's course begins in the old hollow; its water begins where the spring rises, on the hill's shoulder.
    this.sourceIndex = nearestSample(main, SPRING_SOURCE.x, SPRING_SOURCE.z).index;
    const village = this.channel('village');
    this.branchIndex = nearestSample(main, village.samples[0]!.x, village.samples[0]!.z).index;
    this.index = new SegmentIndex([...this.channels, this.rill], (c) => c.halfWidth * 1.7);
    this.solve();
  }

  channel(id: ChannelId): Channel {
    return this.channels.find((c) => c.id === id)!;
  }

  /** Where the main stream divides at the sluice: above it the spring's flow, below it the main flow. */
  get sluiceDistance(): number {
    const main = this.channel('main');
    let best = 0, bestD = Infinity;
    for (const sample of main.samples) {
      const d = Math.hypot(sample.x - 10, sample.z + 58);
      if (d < bestD) { bestD = d; best = sample.s; }
    }
    return best;
  }

  /** The spring pool's level for the current spring flow: a thin spring leaves its edges bare. */
  get poolLevel(): number {
    return SPRING_BASIN.level - 0.3 * (1 - clamp(this.flows.spring, 0, 1));
  }

  /** Ease toward the quest's flows; advance the water clock unless motion is reduced. */
  update(dt: number, targets: WaterFlows, reducedMotion = false) {
    const delta = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    const retain = Math.exp(-delta * FLOW_EASE);
    for (const key of Object.keys(this.flows) as (keyof WaterFlows)[]) {
      const target = Number.isFinite(targets[key]) ? clamp(targets[key], 0, 1) : this.flows[key];
      this.flows[key] = target + (this.flows[key] - target) * retain;
    }
    if (!reducedMotion) this.time += delta;
    const moved = (Object.keys(this.flows) as (keyof WaterFlows)[]).some((key) => !(Math.abs(this.flows[key] - this.solvedFlows[key]) < RESOLVE_STEP));
    if (moved) this.solve();
  }

  /** Re-solve every channel for the current flows. */
  solve() {
    const f = this.flows;
    const main = this.channel('main');
    const sluice = this.sluiceDistance;
    const sourceS = main.samples[this.sourceIndex]!.s;
    solveChannel(main, f.main, { flowAt: (s) => (s < sourceS - 0.5 ? 0 : s < sluice ? f.spring : f.main) });
    const branch = main.samples[this.branchIndex]!.surface;
    solveChannel(this.channel('village'), f.village, { headLevel: Number.isFinite(branch) ? branch : -Infinity });
    const quarry = this.channel('quarry');
    const junction = main.samples[nearestSample(main, quarry.samples[quarry.samples.length - 1]!.x, quarry.samples[quarry.samples.length - 1]!.z).index]!.surface;
    solveChannel(quarry, f.quarry, Number.isFinite(junction) ? { outletLevel: junction } : {});
    solveChannel(this.rill, f.spring, { outletLevel: this.poolLevel });
    this.solvedFlows = { ...f };
    this.revision++;
  }

  /** The sea's surface and motion at (x, z) at the water clock, or null where the sea does not reach. */
  sea(x: number, z: number, t = this.time): WaterSample | null {
    const b = this.bathymetry;
    const inside = x >= BATHY.minX && x <= BATHY.maxX && z >= BATHY.minZ && z <= BATHY.maxZ;
    if (!inside && x > BATHY.maxX) return null;
    // North and south of the grid the coast runs on as it leaves it.
    if (!inside && x >= BATHY.minX && sampleBathymetry(b.height, x, clamp(z, BATHY.minZ, BATHY.maxZ), -1) < 0) return null;
    const height = inside ? sampleBathymetry(b.height, x, z, -1) : SWELL.height;
    if (height < 0) return null;
    const bed = inside ? sampleBathymetry(b.bed, x, z, -30) : -30;
    const phase = inside ? sampleBathymetry(b.phase, x, z, openPhase(x, z)) : openPhase(x, z);
    const still = SEA_LEVEL - bed;
    // The swell travels down the phase gradient's direction: across the bed it turns to meet the shore.
    let dx = SWELL_DIR.x, dz = SWELL_DIR.z;
    if (inside && still > 0.15) {
      const px = sampleBathymetry(b.phase, x + 1, z, Number.NaN) - sampleBathymetry(b.phase, x - 1, z, Number.NaN);
      const pz = sampleBathymetry(b.phase, x, z + 1, Number.NaN) - sampleBathymetry(b.phase, x, z - 1, Number.NaN);
      const len = Math.hypot(px, pz);
      if (len > 1e-4 && Number.isFinite(len)) { dx = px / len; dz = pz / len; }
    }
    const steep = breaking(height, still);
    // One fixed-point step finds the surface point displaced over (x, z): Gerstner waves move water sideways.
    const o = seaOffset(x, z, t, phase, Math.max(0, still) > 0 ? height : 0, steep, dx, dz, still, this.offset);
    const o2 = seaOffset(x - o.x, z - o.z, t, phase, Math.max(0, still) > 0 ? height : 0, steep, dx, dz, still, this.offset);
    let surface = SEA_LEVEL + (still > 0 ? o2.y : 0);
    // Swash: broken water running up the beach and draining back.
    if (still < 0.2) {
      const shore = inside ? sampleBathymetry(b.shorePhase, x, z, Number.NaN) : Number.NaN;
      if (Number.isFinite(shore)) {
        const rise = swashRise(shore + crestWobble(x, z), height, t);
        if (bed < SEA_LEVEL + rise) surface = Math.max(surface, Math.min(SEA_LEVEL + rise, bed + 0.06));
      }
    }
    if (!(surface > bed + 0.004)) return null;
    // Water moves with the swell's orbit, and broken water drifts ashore.
    const theta = phase + crestWobble(x, z) - SWELL_OMEGA * t;
    const orbit = still > 0 ? SWELL_OMEGA * height * 0.5 * Math.cos(theta) * clamp(still / 2, 0.2, 1) : 0;
    const drift = 0.05 + 0.35 * steep;
    return {
      body: 'sea', surface, bed, depth: surface - bed,
      flowX: dx * (orbit + drift), flowZ: dz * (orbit + drift),
      rough: clamp(steep * 1.1 + (still < 0.2 ? 0.6 : 0), 0, 1),
    };
  }

  /** Inland water at (x, z): a channel, the spring's fall or its pool; null on dry ground. */
  inland(x: number, z: number): WaterSample | null {
    const bed = this.terrain.heightAt(x, z);
    const pr = Math.hypot(x - SPRING_BASIN.x, z - SPRING_BASIN.z);
    if (pr <= POOL_REACH && this.flows.spring >= DRY_FLOW * 0.5) {
      const level = this.poolLevel;
      if (level > bed + 0.004) {
        // A slow turn, stirred by the fall's inflow.
        const swirl = (0.05 * this.flows.spring) / Math.max(1, pr);
        return { body: 'pool', surface: level, bed, depth: level - bed, flowX: -(z - SPRING_BASIN.z) * swirl, flowZ: (x - SPRING_BASIN.x) * swirl, rough: 0 };
      }
    }
    let best: WaterSample | null = null, bestD = Infinity;
    for (const { channel, i } of this.index.near(x, z)) {
      const a = channel.samples[i]!, b = channel.samples[i + 1]!;
      const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
      const u = l2 > 0 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1) : 0;
      const d = Math.hypot(x - (a.x + dx * u), z - (a.z + dz * u));
      // The nearest wet reach decides: on a steep fall the water a few metres upstream stands far higher.
      if (d > channel.halfWidth * 1.7 || d >= bestD) continue;
      const level = lerpSurface(a, b, u), channelBed = a.bed + (b.bed - a.bed) * u;
      if (!(level > bed + 0.004)) continue;
      if (!spreads(this.terrain, a.x + dx * u, a.z + dz * u, x, z, level, channelBed, bed)) continue;
      // Nowhere across the stream stands deeper than over its middle: down a cross-slope the water runs as a film.
      const surface = Math.min(level, bed + (level - channelBed) + FILM);
      bestD = d;
      // Faster in mid-channel, slower against the banks.
      const across = clamp(1 - (d / (channel.halfWidth * 1.4)) ** 2, 0.15, 1);
      const speed = (a.speed + (b.speed - a.speed) * u) * across;
      best = {
        body: channel === this.rill ? 'rill' : channel.id, surface, bed, depth: surface - bed,
        flowX: a.tx * speed, flowZ: a.tz * speed, rough: a.rough + (b.rough - a.rough) * u,
      };
    }
    return best;
  }

  /** Any water at (x, z): inland water first (it can lie below sea level), then the sea. */
  sample(x: number, z: number): WaterSample | null {
    return this.inland(x, z) ?? this.sea(x, z);
  }

  /** The water surface at (x, z), or null where it is dry. */
  surfaceAt(x: number, z: number): number | null {
    return this.sample(x, z)?.surface ?? null;
  }
}

/**
 * Whether a channel's water standing at `surface` over its middle reaches out to (x, z): the ground on the way must stay
 * under the surface (a bank stops it), and the ground there may not fall away below the channel's own bed (a hillside
 * beside a stream is not part of it, however low).
 */
export function spreads(terrain: Pick<Terrain, 'heightAt'>, cx: number, cz: number, x: number, z: number, surface: number, channelBed: number, ground: number): boolean {
  if (ground < channelBed - SPREAD_BELOW_BED) return false;
  const d = Math.hypot(x - cx, z - cz);
  for (let k = 1, n = Math.ceil(d / 0.7); k < n; k++) {
    const f = k / n;
    const h = terrain.heightAt(cx + (x - cx) * f, cz + (z - cz) * f);
    if (h > surface + 0.01 || h < channelBed - SPREAD_BELOW_BED) return false;
  }
  return true;
}

/** How far below a channel's middle bed its water may still reach to the side (a scoured pool, a ford's dish). */
export const SPREAD_BELOW_BED = 0.35;
/** The least water over ground that a channel's edge or a film down a slope keeps (m). */
export const FILM = 0.02;

function lerpSurface(a: ChannelSample, b: ChannelSample, u: number): number {
  const sa = a.surface, sb = b.surface;
  if (Number.isFinite(sa) && Number.isFinite(sb)) return sa + (sb - sa) * u;
  if (Number.isFinite(sa) && u < 0.5) return sa;
  if (Number.isFinite(sb) && u >= 0.5) return sb;
  return Number.NaN;
}
