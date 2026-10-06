import { cliffiness, coastX, shoreDistance } from '../../world/coast';
import { deepwoodCover } from '../../world/forest';
import { forestStandAt } from '../../world/forestStands';
import { ANCHORS, ARRIVAL_WRECK, BUILDINGS, FOREST_RUIN, FORD, INLAND_HAMLET, LIGHTHOUSE, PLACES, RITE_ALTAR, STREAMS, WAGON, type V2 } from '../../world/layout';
import { distToPolyline, roadWeight, type Terrain } from '../../world/terrain';
import type { ClipId } from './clips';
import type { SurfaceKind } from './foley';
import type { LoopId } from './worldAudioManifest';
import type { WaterSoundState } from '../water/waterSound';

/**
 * Where the listener is, and what the world sounds like there. Pure functions of position, time and world state:
 *
 * - beds: looping layers whose levels follow the place (sea, forest by day and night, meadow, village by day and
 *   night, cliff wind, a gully's uneasy quiet, an archive's room tone) and point sources placed in the world (the brook
 *   at its nearest bank, the mill wheel, the quarry, the spring, reeds by the ford, a fire); the water's own beds sit
 *   where the water model finds them (surf at the nearest breaker line, surf on rock, white water inland, calm water
 *   lapping at an edge), the open sea's far roar carries up to the heights, and below the surface there is only the
 *   muffled sea;
 * - emitters: single calls placed around the listener (gulls over the sea, songbirds and a woodpecker in the woods,
 *   crows over open ground and the ruin, an owl at night, frogs at the water, hens in the village, a horse
 *   at the wagon, creaking wood), with rates that follow the hour; the shrine's wind chime and the spring's bubbles
 *   come in small bursts;
 * - crickets whose chirp follows the air temperature (Dolbear's law), and the inn's music on summer evenings.
 *
 * Levels are relative; the runtime applies the Ambience volume and smooths every change.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ListenerState extends Vec3 {
  /** Inside a roofed room (the archive). */
  indoors: boolean;
}

export interface WorldSoundState {
  /** 0..24. */
  hour: number;
  /** 0 by day, 1 by night (the sky's own measure). */
  nightness: number;
  /** Water in each stream, 0 (dry) to 1. */
  flows: Record<'main' | 'village' | 'quarry', number>;
  millTurning: boolean;
  quarryWorking: boolean;
}

export interface BedTarget {
  gain: number;
  /** Point sources are placed in the world; beds without a position surround the listener. */
  at?: Vec3;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 1 inside `near`, 0 beyond `far`. */
const within = (d: number, near: number, far: number) => 1 - smooth(near, far, d);
const dist2 = (a: V2, x: number, z: number) => Math.hypot(a.x - x, a.z - z);

/** Daylight from the sky's nightness, so dusk and dawn cross-fade. */
export function dayness(w: WorldSoundState): number {
  return 1 - Math.min(1, Math.max(0, w.nightness));
}

/** Dawn chorus: strongest around six in the morning. */
export function dawn(hour: number): number {
  return Math.max(0, 1 - Math.abs(hour - 6.2) / 1.8);
}

export const MILL_WHEEL = { x: -14, z: -8 } as const;
export const QUARRY_WORK = { x: 92, z: -26 } as const;
const WETLAND = { x: -14, z: -90 } as const;
const STRAND_FIRE = ANCHORS.strand_fire ?? { x: -103, z: 16 };
const SHRINE_HALL = BUILDINGS.find((b) => b.kind === 'shrine') ?? { x: -28, z: -106 };
const RILLFORD = PLACES.rillford;
const THE_CUT = PLACES.the_cut;
const OVERLOOK_WAGON = ANCHORS.overlook_wagon ?? WAGON;

/** Proximity to the sea: 1 at the waterline, fading inland. */
export function seaProximity(x: number, z: number): number {
  return Math.exp(-Math.max(0, shoreDistance(x, z)) / 55);
}

export function forestCover(x: number, z: number): number {
  return Math.min(1, deepwoodCover(x, z) * 1.25);
}

export function villageCover(x: number, z: number): number {
  return Math.max(within(dist2(RILLFORD, x, z), 26, 70), 0.65 * within(dist2(INLAND_HAMLET, x, z), 16, 46));
}

/** Nearest point on any stream that carries water, with its flow. */
export function nearestStream(x: number, z: number, flows: WorldSoundState['flows']): { at: V2; d: number; flow: number } | null {
  let best: { at: V2; d: number; flow: number } | null = null;
  for (const s of STREAMS) {
    const flow = flows[s.id] ?? 0;
    if (flow <= 0.02) continue;
    const r = distToPolyline(x, z, s.points);
    const d = Math.max(0, r.d - s.halfWidth);
    if (best && d >= best.d) continue;
    const a = s.points[r.seg]!;
    const b = s.points[Math.min(r.seg + 1, s.points.length - 1)]!;
    best = { at: { x: a.x + (b.x - a.x) * r.t, z: a.z + (b.z - a.z) * r.t }, d, flow };
  }
  return best;
}

/** Wind in pine needles hisses higher than wind in oak leaves; open ground has the lowest, broadest wind. */
export function windTone(x: number, z: number): number {
  const cover = forestCover(x, z);
  if (cover < 0.15) return 300;
  const sp = forestStandAt(x, z).sp;
  const crown = sp === 'pine' || sp === 'fir' ? 900 : sp === 'birch' ? 650 : 480;
  return 300 + (crown - 300) * cover;
}

/** The open sea heard from far off or from high above it: a broad roar, never the near break. */
export function farSea(l: Vec3): number {
  const d = Math.max(0, shoreDistance(l.x, l.z));
  const high = smooth(6, 40, l.y) * within(d, 20, 160);
  return Math.min(1, Math.max(within(d, 120, 300) * smooth(25, 90, d), high));
}

export function bedTargets(l: ListenerState, w: WorldSoundState, water?: WaterSoundState | null): Record<LoopId, BedTarget> {
  const day = dayness(w);
  const night = 1 - day;
  const sea = seaProximity(l.x, l.z);
  const forest = forestCover(l.x, l.z);
  const village = villageCover(l.x, l.z);
  const height = Math.max(0, l.y - 2);
  const lighthouse = within(dist2(LIGHTHOUSE, l.x, l.z), 22, 75);
  const cliff = Math.max(lighthouse, cliffiness(l.z) * sea * smooth(4, 18, height));
  const cut = within(dist2(THE_CUT, l.x, l.z), 12, 48);
  // Open ground: neither wood nor village nor bare rock above the sea.
  const open = Math.max(0, 1 - forest) * (1 - village) * (1 - 0.75 * sea) * (1 - 0.6 * cut) * (1 - 0.7 * cliff);
  const out = (g: number) => (l.indoors ? 0.25 * g : g);
  const stream = nearestStream(l.x, l.z, w.flows);
  const ford = Math.max(within(dist2(FORD, l.x, l.z), 8, 48), within(dist2(WETLAND, l.x, l.z), 6, 40));
  const fordAt = dist2(FORD, l.x, l.z) < dist2(WETLAND, l.x, l.z) ? FORD : WETLAND;
  return {
    sea: { gain: out(0.9 * sea), at: { x: coastX(l.z) - 14, y: 0, z: l.z } },
    cliff_wind: { gain: out(0.8 * cliff) },
    forest_day: { gain: out(0.85 * forest * day) },
    forest_night: { gain: out(0.75 * night * Math.max(forest, 0.55 * open)) },
    meadow_day: { gain: out(0.65 * open * day) },
    village_day: { gain: out(0.75 * village * day) },
    village_night: { gain: out(0.7 * village * night) },
    cut: { gain: out(0.75 * cut) },
    interior: { gain: l.indoors ? 0.85 : 0 },
    hall_drone: { gain: 0.42 * within(dist2(SHRINE_HALL, l.x, l.z), 5, 20) * (0.55 + 0.45 * night) },
    brook: stream ? { gain: out(0.9 * stream.flow * within(stream.d, 2, 38)), at: { x: stream.at.x, y: 0, z: stream.at.z } } : { gain: 0 },
    marsh: { gain: out(0.75 * ford * (0.3 + 0.7 * night)), at: { x: fordAt.x, y: 0, z: fordAt.z } },
    mill: { gain: w.millTurning ? out(0.9 * within(dist2(MILL_WHEEL, l.x, l.z), 5, 60)) : 0, at: { x: MILL_WHEEL.x, y: 1.5, z: MILL_WHEEL.z } },
    quarry: { gain: w.quarryWorking ? out(0.85 * within(dist2(QUARRY_WORK, l.x, l.z), 14, 140)) : 0, at: { x: QUARRY_WORK.x, y: 2, z: QUARRY_WORK.z } },
    spring: { gain: out(0.8 * within(dist2(RITE_ALTAR, l.x, l.z), 3, 32)), at: { x: RITE_ALTAR.x, y: 0.5, z: RITE_ALTAR.z } },
    fire: { gain: out(0.85 * within(dist2(STRAND_FIRE, l.x, l.z), 2, 24)), at: { x: STRAND_FIRE.x, y: 0.4, z: STRAND_FIRE.z } },
    surf: water?.surf ? { gain: out(0.85 * within(water.surf.d, 4, 70)), at: { x: water.surf.x, y: 0, z: water.surf.z } } : { gain: 0 },
    surf_rocks: water?.rocks ? { gain: out(0.9 * within(water.rocks.d, 5, 80)), at: { x: water.rocks.x, y: 0, z: water.rocks.z } } : { gain: 0 },
    sea_far: { gain: out(0.6 * farSea(l)) },
    lap: water?.calm ? { gain: out(0.75 * within(water.calm.d, 1.5, 16)), at: { x: water.calm.x, y: 0, z: water.calm.z } } : { gain: 0 },
    rapids: water?.rapids ? { gain: out(0.9 * Math.min(1, water.rapids.rough * 1.2) * within(water.rapids.d, 2, 45)), at: { x: water.rapids.x, y: 0, z: water.rapids.z } } : { gain: 0 },
    underwater: { gain: water && water.under > 0.05 ? 0.9 : 0 },
  };
}

/* ------------------------------------------------------------------ emitters */

export interface EmitterEvent {
  rule: string;
  clip: ClipId;
  at: Vec3;
  gain: number;
  pitch: number;
  /** Seconds after this update (the later calls of a burst). */
  delay: number;
}

interface EmitterRule {
  id: string;
  clip: ClipId;
  /** Calls per second at full density are 1 / mean(every). */
  every: [number, number];
  density: (l: ListenerState, w: WorldSoundState) => number;
  place: (l: ListenerState, random: () => number) => Vec3;
  gain: number;
  pitch: number;
  /** Several calls in quick succession (a chime stirred by the wind, a spring giving up a few bubbles). */
  burst?: [number, number];
  gap?: [number, number];
}

/** A point on a ring around the listener, at a height. */
function around(l: Vec3, random: () => number, r0: number, r1: number, h0: number, h1: number): Vec3 {
  const a = random() * Math.PI * 2;
  const r = r0 + (r1 - r0) * random();
  return { x: l.x + Math.sin(a) * r, y: l.y + h0 + (h1 - h0) * random(), z: l.z + Math.cos(a) * r };
}

function nearestBuilding(l: Vec3, random: () => number, maxD: number): Vec3 | null {
  const near = BUILDINGS.filter((b) => Math.hypot(b.x - l.x, b.z - l.z) < maxD);
  if (!near.length) return null;
  const b = near[Math.floor(random() * near.length)]!;
  return { x: b.x + (random() - 0.5) * 8, y: 0.6, z: b.z + (random() - 0.5) * 8 };
}

const RULES: EmitterRule[] = [
  {
    id: 'gull', clip: 'gull', every: [5, 14], gain: 0.5, pitch: 0.06,
    // The gulls drawn over the strand fade out at dusk in the same way (wildlife.ts).
    density: (l, w) => (l.indoors ? 0 : seaProximity(l.x, l.z) * Math.max(0, 1 - 1.6 * w.nightness)),
    place: (l, r) => ({ x: coastX(l.z) - 15 - 45 * r(), y: 10 + 18 * r(), z: l.z + (r() - 0.5) * 80 }),
  },
  {
    id: 'songbird', clip: 'songbird', every: [6, 15], gain: 0.42, pitch: 0.05,
    density: (l, w) => (l.indoors ? 0 : forestCover(l.x, l.z) * dayness(w) * (0.7 + 0.8 * dawn(w.hour))),
    place: (l, r) => around(l, r, 12, 45, 4, 12),
  },
  {
    id: 'smallbird', clip: 'smallbird', every: [5, 12], gain: 0.38, pitch: 0.07,
    density: (l, w) => (l.indoors ? 0 : dayness(w) * Math.min(1, 0.6 * forestCover(l.x, l.z) + 0.45 * (1 - seaProximity(l.x, l.z)) + 0.3 * villageCover(l.x, l.z))),
    place: (l, r) => around(l, r, 8, 35, 1, 5),
  },
  {
    id: 'woodpecker', clip: 'woodpecker', every: [28, 70], gain: 0.4, pitch: 0.04,
    density: (l, w) => (l.indoors ? 0 : forestCover(l.x, l.z) * dayness(w)),
    place: (l, r) => around(l, r, 25, 60, 3, 9),
  },
  {
    id: 'crow', clip: 'crow', every: [18, 45], gain: 0.42, pitch: 0.05,
    density: (l, w) => (l.indoors ? 0 : dayness(w) * Math.min(1, 0.45 * (1 - forestCover(l.x, l.z)) * (1 - seaProximity(l.x, l.z)) + within(Math.hypot(FOREST_RUIN.x - l.x, FOREST_RUIN.z - l.z), 10, 50) + 0.5 * within(Math.hypot(THE_CUT.x - l.x, THE_CUT.z - l.z), 10, 50))),
    place: (l, r) => around(l, r, 25, 70, 6, 15),
  },
  {
    id: 'owl', clip: 'owl', every: [25, 60], gain: 0.4, pitch: 0.03,
    density: (l, w) => (l.indoors ? 0 : (1 - dayness(w)) * Math.max(forestCover(l.x, l.z), 0.3 * villageCover(l.x, l.z))),
    place: (l, r) => around(l, r, 30, 70, 6, 12),
  },
  {
    id: 'frog', clip: 'frog', every: [3, 9], gain: 0.38, pitch: 0.08,
    density: (l, w) => (l.indoors ? 0 : Math.max(within(Math.hypot(FORD.x - l.x, FORD.z - l.z), 8, 45), within(Math.hypot(WETLAND.x - l.x, WETLAND.z - l.z), 6, 38)) * (0.25 + 0.75 * (1 - dayness(w)))),
    place: (l, r) => {
      const at = Math.hypot(FORD.x - l.x, FORD.z - l.z) < Math.hypot(WETLAND.x - l.x, WETLAND.z - l.z) ? FORD : WETLAND;
      return { x: at.x + (r() - 0.5) * 16, y: 0.2, z: at.z + (r() - 0.5) * 16 };
    },
  },
  {
    id: 'chicken', clip: 'chicken', every: [20, 45], gain: 0.38, pitch: 0.06,
    density: (l, w) => (l.indoors ? 0 : within(Math.hypot(RILLFORD.x - l.x, RILLFORD.z - l.z), 24, 60) * dayness(w)),
    place: (l, r) => nearestBuilding(l, r, 45) ?? around(l, r, 10, 35, 0, 1),
  },
  {
    id: 'rooster', clip: 'rooster', every: [40, 90], gain: 0.45, pitch: 0.03,
    density: (l, w) => villageCover(l.x, l.z) * dawn(w.hour),
    place: (l, r) => nearestBuilding(l, r, 80) ?? around(l, r, 30, 70, 0, 2),
  },
  {
    id: 'horse', clip: 'horse', every: [25, 60], gain: 0.42, pitch: 0.04,
    density: (l) => Math.max(within(Math.hypot(WAGON.x - l.x, WAGON.z - l.z), 6, 32), within(Math.hypot(OVERLOOK_WAGON.x - l.x, OVERLOOK_WAGON.z - l.z), 6, 32)),
    place: (l, r) => {
      const at = Math.hypot(WAGON.x - l.x, WAGON.z - l.z) < Math.hypot(OVERLOOK_WAGON.x - l.x, OVERLOOK_WAGON.z - l.z) ? WAGON : OVERLOOK_WAGON;
      return { x: at.x + (r() - 0.5) * 3, y: 1.2, z: at.z + (r() - 0.5) * 3 };
    },
  },
  {
    // The shrine's wind chime, tuned to the theme's mode: a few notes whenever the air stirs.
    id: 'chime', clip: 'chime', every: [7, 18], gain: 0.34, pitch: 0, burst: [1, 4], gap: [0.14, 0.6],
    density: (l) => (l.indoors ? 0 : within(Math.hypot(SHRINE_HALL.x - l.x, SHRINE_HALL.z - l.z), 8, 38)),
    place: (_l, r) => ({ x: SHRINE_HALL.x + 4 + (r() - 0.5) * 0.6, y: 3.2, z: SHRINE_HALL.z + 5.2 }),
  },
  {
    // The spring breathes: small bubbles rise at the altar's pool.
    id: 'bubble', clip: 'bubble', every: [1.2, 3.5], gain: 0.3, pitch: 0.12, burst: [1, 3], gap: [0.04, 0.22],
    density: (l) => (l.indoors ? 0 : within(Math.hypot(RITE_ALTAR.x - l.x, RITE_ALTAR.z - l.z), 4, 16)),
    place: (_l, r) => ({ x: RITE_ALTAR.x + (r() - 0.5) * 2.5, y: 0.1, z: RITE_ALTAR.z + (r() - 0.5) * 2.5 }),
  },
  {
    id: 'creak', clip: 'creak', every: [14, 35], gain: 0.36, pitch: 0.08,
    density: (l) => Math.min(1, 0.6 * forestCover(l.x, l.z) + within(Math.hypot(ARRIVAL_WRECK.x - l.x, ARRIVAL_WRECK.z - l.z), 6, 40) * 1.4),
    place: (l, r) => (Math.hypot(ARRIVAL_WRECK.x - l.x, ARRIVAL_WRECK.z - l.z) < 40
      ? { x: ARRIVAL_WRECK.x + (r() - 0.5) * 6, y: 1, z: ARRIVAL_WRECK.z + (r() - 0.5) * 6 }
      : around(l, r, 8, 30, 2, 8)),
  },
];

export function emitterRuleIds(): string[] {
  return RULES.map((r) => r.id);
}

/**
 * Countdown per rule: density scales how fast the clock runs, so a call comes on average every `every` seconds at
 * full density and never where the density is zero. Deterministic for a given random source.
 */
export class EmitterScheduler {
  private readonly clocks = new Map<string, number>();
  constructor(private readonly random: () => number) {
    for (const rule of RULES) this.clocks.set(rule.id, this.span(rule) * this.random());
  }

  private span(rule: EmitterRule): number {
    return rule.every[0] + (rule.every[1] - rule.every[0]) * this.random();
  }

  update(dt: number, l: ListenerState, w: WorldSoundState): EmitterEvent[] {
    const out: EmitterEvent[] = [];
    for (const rule of RULES) {
      const density = Math.max(0, Math.min(1, rule.density(l, w)));
      if (density <= 0.001) continue;
      const t = (this.clocks.get(rule.id) ?? 0) - dt * density;
      if (t > 0) {
        this.clocks.set(rule.id, t);
        continue;
      }
      this.clocks.set(rule.id, this.span(rule));
      const count = rule.burst ? Math.round(rule.burst[0] + (rule.burst[1] - rule.burst[0]) * this.random()) : 1;
      let delay = 0;
      for (let k = 0; k < count; k++) {
        if (k && rule.gap) delay += rule.gap[0] + (rule.gap[1] - rule.gap[0]) * this.random();
        out.push({ rule: rule.id, clip: rule.clip, at: rule.place(l, this.random), gain: rule.gain * (0.75 + 0.25 * density) * (k ? 0.85 : 1), pitch: rule.pitch, delay });
      }
    }
    return out;
  }
}

/* ------------------------------------------------------------------ crickets and the inn */

/** Air temperature through the day in °C: warmest in mid-afternoon, coolest before dawn. */
export function temperatureAt(hour: number): number {
  return 14 + 6 * Math.cos((2 * Math.PI * (hour - 15)) / 24);
}

/**
 * Dolbear's law: crickets chirp faster when the air is warmer. For field crickets, chirps per minute are about
 * 7 T - 30 (T in °C); below about 9 °C they fall silent. Returns chirps per second.
 */
export function cricketRate(tempC: number): number {
  return tempC < 9 ? 0 : (7 * tempC - 30) / 60;
}

/** How many crickets sing here (0..1): open ground and village edges from dusk into the night, fewer under trees. */
export function cricketDensity(l: ListenerState, w: WorldSoundState): number {
  if (l.indoors || cricketRate(temperatureAt(w.hour)) <= 0) return 0;
  const dusk = Math.max(0, 1 - Math.abs(w.hour - 19.5) / 2.5);
  const time = Math.min(1, 0.12 + 0.88 * Math.max(1 - dayness(w), dusk));
  return time * (1 - 0.6 * forestCover(l.x, l.z)) * (1 - 0.85 * seaProximity(l.x, l.z));
}

export const INN = BUILDINGS.find((b) => b.kind === 'inn') ?? { x: -4, z: 30 };

/** The inn's music plays from dusk until late: 18:30 to 23:30, coming and going over half an hour. */
export function innEvening(hour: number): number {
  return Math.max(0, Math.min(smooth(18.5, 19, hour), 1 - smooth(23, 23.5, hour)));
}

/** The inn's music as heard by the listener: through its walls, fading with distance. */
export function innSong(l: ListenerState, w: WorldSoundState): { gain: number; at: Vec3 } {
  const d = Math.hypot(INN.x - l.x, INN.z - l.z);
  return { gain: innEvening(w.hour) * within(d, 7, 48) * (l.indoors ? 0.3 : 1), at: { x: INN.x, y: 1.6, z: INN.z } };
}

/* ------------------------------------------------------------------ ground under other feet */

/** The surface under a resident or an enemy: the player's rules without the physics and stair cases. */
export function groundSurface(terrain: Pick<Terrain, 'deckAt' | 'carveAt' | 'seaDepth' | 'slopeAt'>, x: number, z: number): SurfaceKind {
  if (terrain.deckAt(x, z)) return 'deck';
  if (terrain.carveAt(x, z) > 0.12 || terrain.seaDepth(x, z) > 0.12) return 'water';
  if (roadWeight(x, z) > 0.55) return 'road';
  if (terrain.slopeAt(x, z) > 0.5) return 'stone';
  if (shoreDistance(x, z) < 26 && cliffiness(z) < 0.5 && x < -200) return 'sand';
  return 'grass';
}
