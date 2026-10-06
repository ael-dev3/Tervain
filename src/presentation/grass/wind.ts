import * as THREE from 'three';

/**
 * The wind every blade of grass feels: a prevailing direction that veers a little, a steady push, and gust fronts carried
 * downwind across the land, with finer turbulence riding inside them. The gusts are a tileable noise field scrolled
 * with the wind, so a gust is seen as a band of bending, brightening grass that travels across a meadow, the way wind
 * actually crosses long grass.
 *
 * The same field is evaluated on the CPU (`gustAt`), so cloth, banners and sound can move with the gusts the grass shows.
 */

/** Texels across the gust field; one texture repeat spans GUST_SPAN metres of land. */
export const GUST_TEXELS = 128;
/** Metres one repeat of the gust field covers: gusts are a few tens of metres across. */
export const GUST_SPAN = 56;
/** Metres one repeat of the turbulence channel covers. */
export const TURBULENCE_SPAN = 9;

function periodicValueNoise(size: number, period: number, seed: number): Float32Array {
  // Lattice values on a period×period grid, smoothly interpolated: tiles seamlessly at the texture edge.
  const lattice = new Float32Array(period * period);
  let s = seed >>> 0;
  for (let i = 0; i < lattice.length; i++) {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    lattice[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const out = new Float32Array(size * size);
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = (x / size) * period, gy = (y / size) * period;
    const x0 = Math.floor(gx), y0 = Math.floor(gy), fx = fade(gx - x0), fy = fade(gy - y0);
    const at = (i: number, j: number) => lattice[((j % period + period) % period) * period + ((i % period + period) % period)]!;
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    out[y * size + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  return out;
}

function stretch(values: Float32Array): Float32Array {
  let lo = Infinity, hi = -Infinity;
  for (const v of values) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const span = Math.max(1e-6, hi - lo);
  return values.map((v) => (v - lo) / span);
}

let gustData: Uint8Array | null = null;

/** RG8 noise: R = broad gust fronts (three octaves), G = turbulence. Deterministic and tileable. */
export function gustField(): Uint8Array {
  if (gustData) return gustData;
  const n = GUST_TEXELS;
  const octave = (period: number, seed: number) => periodicValueNoise(n, period, seed);
  const g1 = octave(2, 9101), g2 = octave(4, 9102), g3 = octave(8, 9103);
  const t1 = octave(4, 9201), t2 = octave(8, 9202), t3 = octave(16, 9203);
  const gust = stretch(g1.map((v, i) => v * 0.58 + g2[i]! * 0.3 + g3[i]! * 0.12));
  const turb = stretch(t1.map((v, i) => v * 0.5 + t2[i]! * 0.32 + t3[i]! * 0.18));
  const data = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    data[i * 4] = Math.round(gust[i]! * 255);
    data[i * 4 + 1] = Math.round(turb[i]! * 255);
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 255;
  }
  gustData = data;
  return data;
}

function gustTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(gustField().slice(), GUST_TEXELS, GUST_TEXELS, THREE.RGBAFormat);
  texture.name = 'Tervain grass gust field';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export interface GrassWindOptions {
  /** Direction the wind blows toward, on the ground plane (x, z); normalised. */
  direction: [number, number];
  /** Steady bend in calm air between gusts, and how much a gust adds (radians of lean at the tip of a pliant blade). */
  steady: number;
  gust: number;
  /** How fast gust fronts and turbulence travel downwind (m/s). */
  speed: number;
  turbulenceSpeed?: number;
}

export interface GrassWindUniforms {
  uGrassTime: THREE.IUniform<number>;
  /** xy: direction blown toward; z: steady strength; w: gust strength. */
  uWindDir: THREE.IUniform<THREE.Vector4>;
  /** xy: gust field offset (m); zw: turbulence offset (m). */
  uGustScroll: THREE.IUniform<THREE.Vector4>;
  tGust: THREE.IUniform<THREE.Texture>;
}

export class GrassWind {
  readonly uniforms: GrassWindUniforms;
  private readonly base: number;
  private time = 0;
  private gustX = 0;
  private gustZ = 0;
  private turbX = 0;
  private turbZ = 0;
  private strength = 1;
  private disposed = false;

  constructor(private readonly options: GrassWindOptions) {
    const [x, z] = options.direction;
    this.base = Math.atan2(z, x);
    this.uniforms = {
      uGrassTime: { value: 0 },
      uWindDir: { value: new THREE.Vector4(Math.cos(this.base), Math.sin(this.base), options.steady, options.gust) },
      uGustScroll: { value: new THREE.Vector4() },
      tGust: { value: gustTexture() },
    };
  }

  /** The direction the wind blows toward now (unit, x z). */
  get direction(): [number, number] {
    const d = this.uniforms.uWindDir.value;
    return [d.x, d.y];
  }

  /**
   * Advance the wind. `strength` scales steady push and gusts together (a score swelling, a calmer hour); Reduced
   * Motion keeps only a faint, slow lean and stops the gusts travelling.
   */
  update(dt: number, opts: { strength?: number; reducedMotion?: boolean } = {}) {
    if (this.disposed) return;
    const step = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.1) : 0;
    const reduced = !!opts.reducedMotion;
    const target = Number.isFinite(opts.strength) ? Math.max(0, Math.min(2, opts.strength!)) : 1;
    // Strength changes ease in over a second or two: air has inertia.
    this.strength += (target - this.strength) * (1 - Math.exp(-step * 0.8));
    if (!reduced) this.time += step;
    const t = this.time;
    // The prevailing direction veers slowly a few degrees either way.
    const angle = this.base + 0.16 * Math.sin(t * 0.021) + 0.07 * Math.sin(t * 0.067 + 1.3);
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const w = this.uniforms.uWindDir.value;
    w.set(dx, dz, this.options.steady * this.strength * (reduced ? 0.35 : 1), reduced ? 0 : this.options.gust * this.strength);
    if (!reduced) {
      const speed = this.options.speed, turb = this.options.turbulenceSpeed ?? speed * 1.6;
      this.gustX += dx * speed * step; this.gustZ += dz * speed * step;
      this.turbX += dx * turb * step; this.turbZ += dz * turb * step;
      // Keep the offsets small (the field repeats), so float precision never degrades over a long session.
      const wrap = (v: number, span: number) => v - Math.floor(v / span) * span;
      this.gustX = wrap(this.gustX, GUST_SPAN); this.gustZ = wrap(this.gustZ, GUST_SPAN);
      this.turbX = wrap(this.turbX, TURBULENCE_SPAN); this.turbZ = wrap(this.turbZ, TURBULENCE_SPAN);
    }
    this.uniforms.uGustScroll.value.set(this.gustX, this.gustZ, this.turbX, this.turbZ);
    this.uniforms.uGrassTime.value = reduced ? this.uniforms.uGrassTime.value : t;
  }

  /** The broad gust field at (x, z) now, 0..1: the same value the grass shader reads. */
  gustAt(x: number, z: number): number {
    const data = gustField(), n = GUST_TEXELS;
    const u = ((x - this.gustX) / GUST_SPAN) * n - 0.5, v = ((z - this.gustZ) / GUST_SPAN) * n - 0.5;
    const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
    const at = (i: number, j: number) => data[(((j % n) + n) % n * n + (((i % n) + n) % n)) * 4]! / 255;
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  /** How hard the wind pushes at (x, z) now, 0 calm .. about 1 in a full gust: for cloth, banners and sound. */
  pushAt(x: number, z: number): number {
    const w = this.uniforms.uWindDir.value;
    const g = this.gustAt(x, z);
    const s = Math.min(1, Math.max(0, (g - 0.38) / 0.5));
    return w.z + w.w * s * s * (3 - 2 * s);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.uniforms.tGust.value.dispose();
  }
}
