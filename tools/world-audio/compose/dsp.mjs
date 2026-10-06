/**
 * Signal-processing building blocks for Tervain's crafted sound: seeded noise, filters, a fast sine, an FFT for
 * convolution, synthetic rooms, and helpers for panning and mixing. Everything renders offline at 48 kHz in plain
 * JavaScript with no randomness outside the seeded generators, so a render is the same every time.
 */

export const SR = 48000;
const TAU = Math.PI * 2;

/** mulberry32: a small seeded generator. Every voice takes its own stream so changing one note never moves another. */
export function rng(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal sample (Box–Muller) from a uniform source. */
export function gaussian(random) {
  const u = Math.max(1e-12, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * random());
}

const STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'D4', 'F#3', 'Bb2' to a MIDI note number (C4 = 60). */
export function midi(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`not a note: ${name}`);
  return 12 * (Number(m[3]) + 1) + STEPS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
export const hzOf = (name) => mtof(midi(name));
export const cents = (c) => 2 ** (c / 1200);

export const samples = (seconds) => new Float32Array(Math.max(1, Math.ceil(seconds * SR)));
export const db = (d) => 10 ** (d / 20);

/* ------------------------------------------------------------------ a fast sine */

const TABLE = 4096;
const SINE = new Float64Array(TABLE + 1);
for (let i = 0; i <= TABLE; i++) SINE[i] = Math.sin((TAU * i) / TABLE);

/** sin(2π·phase) for a phase in cycles, from a table with linear interpolation (error near -130 dB). */
export function sine(phase) {
  const p = (phase - Math.floor(phase)) * TABLE;
  const i = p | 0;
  return SINE[i] + (SINE[i + 1] - SINE[i]) * (p - i);
}

/* ------------------------------------------------------------------ filters */

/** A biquad from the Audio EQ Cookbook (Robert Bristow-Johnson). */
export class Biquad {
  constructor(type, freq, q = Math.SQRT1_2, gainDb = 0) {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(type, freq, q, gainDb);
  }

  set(type, freq, q = Math.SQRT1_2, gainDb = 0) {
    const w = (TAU * Math.min(Math.max(freq, 5), SR * 0.49)) / SR;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    const A = 10 ** (gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (type) {
      case 'lowpass':
        b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
        break;
      case 'highpass':
        b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
        break;
      case 'bandpass':
        b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
        break;
      case 'peak':
        b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
        break;
      case 'lowshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) - (A - 1) * cos + s); b1 = 2 * A * ((A - 1) - (A + 1) * cos); b2 = A * ((A + 1) - (A - 1) * cos - s);
        a0 = (A + 1) + (A - 1) * cos + s; a1 = -2 * ((A - 1) + (A + 1) * cos); a2 = (A + 1) + (A - 1) * cos - s;
        break;
      }
      case 'highshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) + (A - 1) * cos + s); b1 = -2 * A * ((A - 1) + (A + 1) * cos); b2 = A * ((A + 1) + (A - 1) * cos - s);
        a0 = (A + 1) - (A - 1) * cos + s; a1 = 2 * ((A - 1) - (A + 1) * cos); a2 = (A + 1) - (A - 1) * cos - s;
        break;
      }
      default:
        throw new Error(`unknown filter ${type}`);
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }

  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }

  run(buf) {
    for (let i = 0; i < buf.length; i++) buf[i] = this.process(buf[i]);
    return buf;
  }
}

/** One-pole lowpass smoothing, for control signals and gentle tone. */
export class OnePole {
  constructor(cutoff) {
    this.a = Math.exp((-TAU * cutoff) / SR);
    this.y = 0;
  }

  process(x) {
    this.y = this.a * this.y + (1 - this.a) * x;
    return this.y;
  }
}

/** Remove any constant offset so a sound starts and ends at rest. */
export function dcBlock(buf, r = 0.9995) {
  let x1 = 0, y1 = 0;
  for (let i = 0; i < buf.length; i++) {
    const y = buf[i] - x1 + r * y1;
    x1 = buf[i];
    y1 = y;
    buf[i] = y;
  }
  return buf;
}

/* ------------------------------------------------------------------ FFT and convolution */

const plans = new Map();
function plan(n) {
  let p = plans.get(n);
  if (!p) {
    const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      cos[i] = Math.cos((TAU * i) / n);
      sin[i] = Math.sin((TAU * i) / n);
    }
    const bits = Math.round(Math.log2(n));
    const rev = new Uint32Array(n);
    for (let i = 0; i < n; i++) rev[i] = (rev[i >> 1] >> 1) | ((i & 1) << (bits - 1));
    p = { cos, sin, rev };
    plans.set(n, p);
  }
  return p;
}

/** In-place iterative radix-2 FFT on separate real and imaginary arrays (length a power of two). */
export function fft(re, im, inverse = false) {
  const n = re.length;
  const { cos, sin, rev } = plan(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const c = cos[k * step];
        const s = inverse ? sin[k * step] : -sin[k * step];
        const a = start + k, b = a + half;
        const tr = re[b] * c - im[b] * s;
        const ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

/** Convolve x with an impulse response h by FFT overlap-add; the result keeps the full tail. */
export function convolve(x, h) {
  const L = h.length;
  let N = 1 << 15;
  while (N < 2 * L) N <<= 1;
  const B = N - L + 1;
  const Hr = new Float64Array(N), Hi = new Float64Array(N);
  Hr.set(h);
  fft(Hr, Hi);
  const out = new Float32Array(x.length + L - 1);
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let start = 0; start < x.length; start += B) {
    re.fill(0);
    im.fill(0);
    const end = Math.min(x.length, start + B);
    let any = false;
    for (let i = start; i < end; i++) {
      re[i - start] = x[i];
      if (x[i] !== 0) any = true;
    }
    if (!any) continue;
    fft(re, im);
    for (let i = 0; i < N; i++) {
      const r = re[i] * Hr[i] - im[i] * Hi[i];
      im[i] = re[i] * Hi[i] + im[i] * Hr[i];
      re[i] = r;
    }
    fft(re, im, true);
    const lim = Math.min(N, out.length - start);
    for (let i = 0; i < lim; i++) out[start + i] += re[i];
  }
  return out;
}

/* ------------------------------------------------------------------ rooms and bodies */

/**
 * A synthetic room: sparse early reflections, then decorrelated noise whose highs die faster than its lows. `t60` is
 * [low (<400 Hz), mid, high (>3.5 kHz)] in seconds. Returns a stereo pair normalized to unit energy per channel.
 */
export function roomIR({ seconds, t60, predelay = 0.012, early = [], seed = 1, fadeIn = 0.008 }) {
  const n = Math.round(seconds * SR);
  const [lo, mid, hi] = t60;
  const out = [];
  for (let c = 0; c < 2; c++) {
    const random = rng(seed * 31 + c * 977);
    const ir = new Float32Array(n);
    const low = new OnePole(400), high = new OnePole(3500);
    for (let i = 0; i < n; i++) {
      const w = gaussian(random);
      const l = low.process(w);
      const h = w - high.process(w);
      const m = w - l - h;
      const t = i / SR - predelay;
      if (t < 0) continue;
      const shape = Math.min(1, t / fadeIn);
      ir[i] = shape * (l * Math.exp((-6.908 * t) / lo) + m * Math.exp((-6.908 * t) / mid) + h * Math.exp((-6.908 * t) / hi));
    }
    for (const [k, [at, gain]] of early.entries()) {
      const i = Math.round((at + c * 0.0031 * (k % 2 ? 1 : -1) + predelay * 0.5) * SR);
      if (i >= 0 && i < n) ir[i] += (k % 2 ? -1 : 1) * gain * 3;
    }
    let e = 0;
    for (let i = 0; i < n; i++) e += ir[i] * ir[i];
    const g = 1 / Math.sqrt(e || 1);
    for (let i = 0; i < n; i++) ir[i] *= g;
    out.push(ir);
  }
  return out;
}

/**
 * An instrument body as a chain of resonant peaks and shelves: `[type, freq, q, gainDb]` per stage. A lute's bowl, a
 * harp's soundboard or a viol's box colours every note the same way, which is much of what makes them sound real.
 */
export function body(buf, stages) {
  for (const [type, f, q, g] of stages) new Biquad(type, f, q, g).run(buf);
  return buf;
}

/* ------------------------------------------------------------------ mixing */

/** Constant-power pan gains for a position from -1 (left) to +1 (right). */
export function panGains(p) {
  const a = ((Math.max(-1, Math.min(1, p)) + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
}

/** Add a mono sound into a stereo pair at a time in seconds, with gain and pan. */
export function place(L, R, src, at, gain = 1, pan = 0) {
  const o = Math.round(at * SR);
  const [gl, gr] = panGains(pan);
  const end = Math.min(src.length, L.length - o);
  for (let i = Math.max(0, -o); i < end; i++) {
    const v = src[i] * gain;
    L[o + i] += v * gl;
    R[o + i] += v * gr;
  }
}

/** Add one buffer into another at a time in seconds. */
export function addAt(dst, src, at = 0, gain = 1) {
  const o = Math.round(at * SR);
  const end = Math.min(src.length, dst.length - o);
  for (let i = Math.max(0, -o); i < end; i++) dst[o + i] += src[i] * gain;
  return dst;
}

export function scale(buf, gain) {
  for (let i = 0; i < buf.length; i++) buf[i] *= gain;
  return buf;
}

export function peakOf(...bufs) {
  let p = 0;
  for (const b of bufs) for (let i = 0; i < b.length; i++) p = Math.max(p, Math.abs(b[i]));
  return p;
}

/** A gentle tape-like saturation: nearly linear in the body of the mix, rounding only the loudest peaks. */
export function saturate(buf, ceiling = 0.9) {
  for (let i = 0; i < buf.length; i++) buf[i] = ceiling * Math.tanh(buf[i] / ceiling);
  return buf;
}

/** Raised-cosine fades at both ends (seconds). */
export function fadeEdges(buf, fadeIn = 0.005, fadeOut = 0.02) {
  const a = Math.min(buf.length, Math.round(fadeIn * SR));
  for (let i = 0; i < a; i++) buf[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / a);
  const b = Math.min(buf.length, Math.round(fadeOut * SR));
  for (let i = 0; i < b; i++) buf[buf.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / b);
  return buf;
}
