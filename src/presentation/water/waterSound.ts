import { rockiness, sampleBathymetry } from '../../world/water/bathymetry';
import { crestWobble, SWELL_OMEGA } from '../../world/water/waves';
import type { WaterWorld } from '../../world/water/waterWorld';

/**
 * What the water sounds like from where the listener stands, read from the same model that draws it: the nearest
 * breaking surf on sand and the nearest surf on rock (with each crest's break, so the crash is heard as it is seen),
 * white inland water (the fall, a cascade, a race's drop), calm water lapping at an edge, and whether the ears are
 * under the surface. Splashes, strokes and steps arrive as events from whatever disturbed the water.
 */

export interface WaterSpot {
  x: number;
  z: number;
  /** Distance from the listener (m). */
  d: number;
}

export interface WaterBreak {
  x: number;
  z: number;
  /** A wave bursting on rock rather than breaking on sand. */
  rock: boolean;
  /** Breaking height (m). */
  size: number;
}

export type WaterEventKind = 'splash' | 'plop' | 'enter' | 'exit' | 'stroke' | 'wade' | 'dive' | 'surface' | 'fish';

export interface WaterEvent {
  kind: WaterEventKind;
  x: number;
  y: number;
  z: number;
  /** 0..1: how hard the water was met. */
  energy: number;
}

export interface WaterSoundState {
  surf: WaterSpot | null;
  rocks: WaterSpot | null;
  calm: WaterSpot | null;
  rapids: (WaterSpot & { rough: number }) | null;
  /** How far under the surface the listener's ears are (m); 0 above it. */
  under: number;
  /** Crests breaking near the listener since the last frame. */
  breaks: WaterBreak[];
  events: WaterEvent[];
}

const RADII = [1.5, 4, 7, 11, 16, 22, 30, 40, 52, 66] as const;
const DIRECTIONS = 20;
/** Seconds between full scans of the surroundings; crests are checked every frame at the spots found. */
const SCAN_EVERY = 0.35;

interface Tracked { spot: WaterSpot; crest: number; size: number }

export class WaterListener {
  private acc = Infinity;
  private surf: Tracked | null = null;
  private rocks: Tracked | null = null;
  private calm: WaterSpot | null = null;
  private rapids: (WaterSpot & { rough: number }) | null = null;

  /** Listen from (x, y, z); `events` are the disturbances since the last call (drained by the caller). */
  update(world: WaterWorld, x: number, y: number, z: number, dt: number, events: WaterEvent[]): WaterSoundState {
    this.acc += Number.isFinite(dt) && dt > 0 ? dt : 0;
    if (this.acc >= SCAN_EVERY) {
      this.acc = 0;
      this.scan(world, x, z);
    }
    const breaks: WaterBreak[] = [];
    for (const [tracked, rock] of [[this.surf, false], [this.rocks, true]] as const) {
      if (!tracked) continue;
      const crest = this.crestIndex(world, tracked.spot.x, tracked.spot.z);
      if (Number.isFinite(crest) && Number.isFinite(tracked.crest) && crest < tracked.crest) {
        breaks.push({ x: tracked.spot.x, z: tracked.spot.z, rock, size: tracked.size });
      }
      tracked.crest = crest;
    }
    const surface = world.surfaceAt(x, z);
    return {
      surf: this.surf ? { ...this.surf.spot } : null,
      rocks: this.rocks ? { ...this.rocks.spot } : null,
      calm: this.calm ? { ...this.calm } : null,
      rapids: this.rapids ? { ...this.rapids } : null,
      under: surface !== null && surface > y ? surface - y : 0,
      breaks,
      events,
    };
  }

  /** Which crest is passing (x, z): the count drops by one each time a crest arrives. */
  private crestIndex(world: WaterWorld, x: number, z: number): number {
    const phase = sampleBathymetry(world.bathymetry.phase, x, z, Number.NaN);
    return Math.floor((phase + crestWobble(x, z) - SWELL_OMEGA * world.time) / (Math.PI * 2));
  }

  private scan(world: WaterWorld, x: number, z: number) {
    let surf: { spot: WaterSpot; size: number; score: number } | null = null;
    let rocks: { spot: WaterSpot; size: number; score: number } | null = null;
    let calm: WaterSpot | null = null;
    let rapids: (WaterSpot & { rough: number; score: number }) | null = null;
    const consider = (px: number, pz: number, d: number) => {
      const s = world.sample(px, pz);
      if (!s) return;
      if (s.body === 'sea') {
        // The breaker line: shallow water whose swell is at its breaking limit, or the swash running up the sand.
        if (s.rough < 0.3 || s.depth > 3) return;
        const rock = rockiness(world.bathymetry, px, pz) > 0.45;
        const size = Math.max(0.1, sampleBathymetry(world.bathymetry.height, px, pz, 0.3));
        // Prefer near, and big over small (a bigger wave is heard from further).
        const score = d / (0.6 + size);
        const spot = { x: px, z: pz, d };
        if (rock) { if (!rocks || score < rocks.score) rocks = { spot, size, score }; }
        else if (!surf || score < surf.score) surf = { spot, size, score };
        return;
      }
      if (s.rough >= 0.45) {
        const score = d / s.rough;
        if (!rapids || score < rapids.score) rapids = { x: px, z: pz, d, rough: s.rough, score };
      } else if (s.rough < 0.25 && s.depth > 0.12 && (!calm || d < calm.d)) calm = { x: px, z: pz, d };
    };
    consider(x, z, 0);
    for (const r of RADII) for (let k = 0; k < DIRECTIONS; k++) {
      const a = (k / DIRECTIONS + (r % 2) * 0.025) * Math.PI * 2;
      consider(x + Math.sin(a) * r, z + Math.cos(a) * r, r);
    }
    this.surf = this.track(this.surf, surf, world);
    this.rocks = this.track(this.rocks, rocks, world);
    this.calm = calm;
    const r = rapids as (WaterSpot & { rough: number; score: number }) | null;
    this.rapids = r ? { x: r.x, z: r.z, d: r.d, rough: r.rough } : null;
  }

  private track(old: Tracked | null, found: { spot: WaterSpot; size: number } | null, world: WaterWorld): Tracked | null {
    if (!found) return null;
    // The same spot keeps counting its crests; a new one starts counting where it is, so a move never fires a crash.
    const same = old && Math.hypot(old.spot.x - found.spot.x, old.spot.z - found.spot.z) < 1e-6;
    return { spot: found.spot, crest: same ? old.crest : this.crestIndex(world, found.spot.x, found.spot.z), size: found.size };
  }
}
