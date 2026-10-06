import { SEA_LEVEL } from '../layout';

/**
 * The sea's waves, as plain functions of position and time, shared by the water shaders (generated from these same
 * constants), floating objects, swimming and the surf sounds. Two parts:
 *
 *  - one long-crested swell, whose phase is solved over the real sea bed (bathymetry.ts). It bends toward the shore,
 *    shortens and steepens as the water shallows, breaks where it grows too tall for its depth, and runs up the beach;
 *  - a handful of short wind waves (Gerstner), which ride on the swell in open water and die away in the shallows.
 *
 * Nothing here draws anything; the presentation turns the same numbers into GLSL.
 */

export const GRAVITY = 9.81;

/** The dominant swell arriving from the open sea in the west. */
export const SWELL = {
  /** Seconds between crests. */
  period: 7.4,
  /** Deep-water height, crest to trough (m). A sheltered coast: modest, never a storm. */
  height: 0.5,
  /** Direction of travel (onshore, a little north of east). */
  angle: 0.16,
  /** A breaking wave can be at most this fraction of the water depth (spilling breakers on a gentle beach). */
  breaker: 0.72,
  /** Swash run-up above still water, as a fraction of the breaker height. */
  runup: 0.62,
  /** Waves per set, and how much a set's biggest waves exceed its smallest. */
  groupWaves: 7,
  groupDepth: 0.3,
  /** Shallowest depth used for the wave number (m); the swash sheet is shallower still. */
  minDepth: 0.06,
} as const;

export const SWELL_OMEGA = (2 * Math.PI) / SWELL.period;
export const SWELL_K0 = (SWELL_OMEGA * SWELL_OMEGA) / GRAVITY;
export const SWELL_DIR = { x: Math.cos(SWELL.angle), z: Math.sin(SWELL.angle) } as const;

/**
 * Short wind waves: travel angle (radians from +x), wavelength (m), amplitude (m), choppiness share (the sum stays
 * below one so crests sharpen without folding over), phase offset. A long-period sea from the west-southwest, spread
 * either side of the swell so no two trains line up into a visible grid.
 */
export const WIND_WAVES = [
  { angle: 0.42, length: 23, amp: 0.075, chop: 0.17, phase: 0.0 },
  { angle: -0.31, length: 15.5, amp: 0.05, chop: 0.15, phase: 1.7 },
  { angle: 0.86, length: 10.4, amp: 0.033, chop: 0.13, phase: 4.1 },
  { angle: -0.74, length: 7.1, amp: 0.022, chop: 0.12, phase: 2.6 },
  { angle: 0.12, length: 4.9, amp: 0.014, chop: 0.1, phase: 5.3 },
  { angle: 1.21, length: 3.3, amp: 0.009, chop: 0.08, phase: 0.9 },
] as const;

/** The tallest the sea surface can stand above still water anywhere, for bounds (swell at breaking, wind, swash). */
export const SEA_MAX_RISE = SWELL.height * 0.75 + WIND_WAVES.reduce((sum, w) => sum + w.amp, 0) + 0.4;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Wave number for angular frequency `omega` in water `depth` metres deep: the linear dispersion relation
 * omega^2 = g k tanh(k h), by Fenton and McKee's explicit approximation (within about 1.5 % everywhere).
 */
export function waveNumber(omega: number, depth: number): number {
  const h = Math.max(depth, 1e-4);
  const deep = (omega * omega) / GRAVITY;
  const x = Math.pow(omega * Math.sqrt(h / GRAVITY), 1.5);
  if (x > 12) return deep;
  return deep * Math.pow(1 / Math.tanh(x), 2 / 3);
}

/** Speed at which a swell's energy travels in `depth` (m/s). */
export function groupVelocity(omega: number, depth: number): number {
  const k = waveNumber(omega, depth);
  const kh = k * Math.max(depth, 1e-4);
  const ratio = kh > 20 ? 0 : (2 * kh) / Math.sinh(2 * kh);
  return (omega / k) * 0.5 * (1 + ratio);
}

/**
 * Swell height (crest to trough, m) at `depth`, for a deep-water height `h0` already reduced by shelter: shoaling
 * by conservation of energy flux, then capped by breaking. Zero on dry ground.
 */
export function swellHeight(depth: number, h0: number = SWELL.height): number {
  if (!(depth > 0) || !(h0 > 0)) return 0;
  const deepGroup = (0.5 * GRAVITY) / SWELL_OMEGA;
  const shoaled = h0 * Math.sqrt(deepGroup / groupVelocity(SWELL_OMEGA, Math.max(depth, SWELL.minDepth)));
  return Math.min(shoaled, SWELL.breaker * depth);
}

/** 0 for a gentle swell, rising to 1 as a wave reaches its breaking height; shapes crests and makes surf foam. */
export function breaking(height: number, depth: number): number {
  if (!(depth > 0)) return 1;
  return smoothstep(0.42, 0.98, height / (SWELL.breaker * depth));
}

/** Sets: every few waves arrive a little taller. The same envelope drives the shader, floating objects and surf. */
export function setFactor(phase: number, t: number): number {
  const n = SWELL.groupWaves;
  return 1 - SWELL.groupDepth * 0.5 + SWELL.groupDepth * 0.5 * Math.sin((phase - SWELL_OMEGA * t) / n + 0.7);
}

/** Small irregularities along a crest so it bends and breaks unevenly; added to the solved phase. */
export function crestWobble(x: number, z: number): number {
  return 0.9 * Math.sin(z * 0.027 + x * 0.004 + 1.3) + 0.45 * Math.sin(z * 0.081 - x * 0.013 + 4.2);
}

export interface WaveOffset {
  x: number;
  y: number;
  z: number;
}

/**
 * Where the sea moves a surface point: the swell (phase `phase` in radians, height `height`, travelling along the unit
 * vector `dirX, dirZ`, with `steep` 0..1 near breaking) plus wind waves damped by `depth`. Gerstner form: points
 * gather toward each crest, so crests sharpen and troughs flatten. `t` is the water clock in seconds.
 */
export function seaOffset(x: number, z: number, t: number, phase: number, height: number, steep: number,
  dirX: number, dirZ: number, depth: number, out: WaveOffset = { x: 0, y: 0, z: 0 }): WaveOffset {
  out.x = 0; out.y = 0; out.z = 0;
  if (height > 0) {
    const theta = phase + crestWobble(x, z) - SWELL_OMEGA * t;
    const a = height * 0.5 * setFactor(phase, t);
    const k = waveNumber(SWELL_OMEGA, Math.max(depth, SWELL.minDepth));
    // Near breaking the front face steepens: the crest leans shoreward ahead of its trough.
    const lean = 0.55 + 0.4 * steep;
    const sideways = (lean / k) * Math.min(1, a * k * 2.4);
    const c = Math.cos(theta), s = Math.sin(theta);
    out.y += a * (c + 0.18 * steep * (c * c - 0.5));
    out.x -= dirX * sideways * s;
    out.z -= dirZ * sideways * s;
  }
  const wind = smoothstep(0.25, 7, depth);
  if (wind > 0) {
    for (const w of WIND_WAVES) {
      const dx = Math.cos(w.angle), dz = Math.sin(w.angle);
      const k = (2 * Math.PI) / w.length;
      const omega = Math.sqrt(GRAVITY * k);
      const theta = k * (dx * x + dz * z) - omega * t + w.phase;
      const c = Math.cos(theta), s = Math.sin(theta);
      out.y += w.amp * wind * c;
      out.x -= dx * (w.chop / k) * wind * s;
      out.z -= dz * (w.chop / k) * wind * s;
    }
  }
  return out;
}

/**
 * Swash: how far above still water the last broken wave has run up the beach (m), for a point whose nearest
 * waterline has swell phase `shorePhase` and breaker height `breakerHeight`. A quick uprush, then a slower backwash
 * that drains away before the next wave arrives.
 */
export function swashRise(shorePhase: number, breakerHeight: number, t: number): number {
  if (!(breakerHeight > 0)) return 0;
  const cycle = (shorePhase - SWELL_OMEGA * t) / (2 * Math.PI);
  const f = cycle - Math.floor(cycle);
  // f = 0 when the bore reaches the waterline; uprush for the first 30 %, backwash for the next 55 %.
  const shape = f < 0.3 ? Math.sin((f / 0.3) * Math.PI * 0.5) : f < 0.85 ? Math.cos(((f - 0.3) / 0.55) * Math.PI * 0.5) : 0;
  return SWELL.runup * breakerHeight * setFactor(shorePhase, t) * Math.pow(Math.max(shape, 0), 1.3);
}

/** Still water: the sea level the swash and the tidal-free sea rest on. */
export const STILL_WATER = SEA_LEVEL;
