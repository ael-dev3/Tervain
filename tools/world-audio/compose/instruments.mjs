/**
 * Tervain's crafted instruments, each built from how the real one makes its sound rather than from recordings:
 *
 * - plucked strings (lute, harp): a string model where a pluck circulates in a tuned delay line;
 * - bowed strings (fiddle, viols, drones): a harmonic series moving through the resonances of a wooden body;
 * - a wooden flute: a few harmonics carried on breath noise that follows the note;
 * - wordless voices: a glottal series shaped by vowel formants, sung by small ensembles;
 * - frame and war drums: the modes of a struck membrane;
 * - bells, wind chimes and a singing bowl: struck modes in their real ratios, with the beating of split partials;
 * - the small lives of the world: cricket chirps, spring bubbles and a heartbeat.
 *
 * Every function is deterministic for its seed.
 */
import { Biquad, OnePole, SR, cents, db, fadeEdges, gaussian, rng, samples, sine } from './dsp.mjs';

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ plucked strings */

/**
 * One plucked string (after Karplus-Strong and Jaffe-Smith). One period of noise, shaped by how hard and where the
 * string was plucked, circulates in a delay line tuned by an allpass for the fractional part. The loop filter is a
 * one-pole lowpass solved per note so that every harmonic loses energy at a rate in time, not per trip round the loop,
 * as real gut does: highs fade quickly on bass strings too. `t60` is the fundamental's decay time; `bright` moves the
 * frequency above which damping takes over.
 */
export function string(freq, seconds, { t60 = 2, bright = 0.5, position = 0.13, vel = 0.8, seed = 1, damp = null, warmth = 0 } = {}) {
  const random = rng(seed);
  const n = Math.ceil(seconds * SR);
  const out = new Float32Array(n);
  const P = SR / freq;
  // Damping model: T60(f) = t60 / (1 + (f / corner)^2). Match the loop's loss at a reference frequency.
  const corner = 700 + 3400 * Math.min(1, Math.max(0, bright));
  const fr = Math.min(SR / 5, Math.max(4 * freq, 2500));
  const lossAt = (f) => 10 ** ((-3 * P * (1 + (f / corner) ** 2)) / (t60 * SR));
  const want = lossAt(fr) / lossAt(freq);
  const c = Math.cos((TAU * fr) / SR);
  // (1-p)^2 = want^2 (1 - 2pc + p^2)  ->  (1 - w2) p^2 - 2(1 - w2 c) p + (1 - w2) = 0
  const w2 = want * want;
  const qa = 1 - w2, qb = -2 * (1 - w2 * c);
  const p = qa > 1e-9 ? Math.min(0.9, Math.max(0, (-qb - Math.sqrt(Math.max(0, qb * qb - 4 * qa * qa))) / (2 * qa))) : 0;
  const w0 = (TAU * freq) / SR;
  const phaseDelay = Math.atan2(p * Math.sin(w0), 1 - p * Math.cos(w0)) / w0;
  const H0 = (1 - p) / Math.sqrt(1 - 2 * p * Math.cos(w0) + p * p);
  const g = Math.min(0.999995, lossAt(freq) / H0);
  const D = P - phaseDelay;
  const N = Math.max(2, Math.floor(D - 0.2));
  const frac = D - N;
  const C = (1 - frac) / (1 + frac);
  // The pluck: one period of noise, darker for a soft touch, combed at the plucking point.
  const ex = new Float32Array(N);
  const a = Math.exp((-TAU * (400 + (5200 - 3600 * warmth) * vel * vel)) / SR);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp = a * lp + (1 - a) * (random() * 2 - 1);
    ex[i] = lp;
  }
  const line = new Float32Array(N);
  const k = Math.max(1, Math.round(position * N));
  let mean = 0;
  for (let i = 0; i < N; i++) {
    line[i] = ex[i] - (i >= k ? ex[i - k] : 0);
    mean += line[i];
  }
  mean /= N;
  let e = 0;
  for (let i = 0; i < N; i++) {
    line[i] -= mean;
    e += line[i] * line[i];
  }
  const norm = (0.3 * vel) / Math.sqrt(e / N || 1);
  for (let i = 0; i < N; i++) line[i] *= norm;
  let idx = 0, state = 0, x1 = 0, y1 = 0;
  for (let i = 0; i < n; i++) {
    const y = line[idx];
    out[i] = y;
    state = (1 - p) * y + p * state;
    const f = g * state;
    const ap = C * f + x1 - C * y1;
    x1 = f;
    y1 = ap;
    line[idx] = ap;
    if (++idx === N) idx = 0;
  }
  if (warmth > 0) {
    // Gut and soft fingers: the brightness of the pluck closes quickly, leaving a round tone.
    const smooth = new OnePole(1000);
    const from = 1800 + 4200 * vel, to = Math.max(700, 2.6 * freq);
    for (let i = 0; i < n; i++) {
      if ((i & 63) === 0) smooth.a = Math.exp((-TAU * (to + (from - to) * Math.exp(-i / (0.18 * SR)))) / SR);
      out[i] = out[i] * (1 - warmth) + smooth.process(out[i]) * warmth;
    }
  }
  if (damp !== null && damp < seconds) {
    // A finger stops the string: a quick, not instant, decay.
    const s0 = Math.round(damp * SR);
    for (let i = s0; i < n; i++) out[i] *= Math.exp(-(i - s0) / (0.06 * SR));
  }
  return fadeEdges(out, 0.0004, 0.01);
}

/** The lute's bowl and rose: a warm low air resonance, a lively middle, a soft top. Applied once to the whole lute part. */
export const LUTE_BODY = [
  ['highpass', 70, 0.7, 0], ['peak', 112, 2.5, 4], ['peak', 225, 3.5, 3], ['peak', 395, 3, 2],
  ['peak', 820, 1.8, -2.5], ['peak', 1300, 2.5, 2], ['peak', 2700, 1.4, 1.5], ['lowpass', 6200, 0.6, 0],
];

/**
 * A lute course. Like a Renaissance lute, the low courses pair a string with its octave (the shimmer of a lute bass),
 * the middle courses two unisons a breath apart, the top a single string.
 */
export function luteNote(freq, seconds, { vel = 0.7, seed = 1, damp = null, bright = 0.42 } = {}) {
  const random = rng(seed);
  const t60 = Math.min(3.4, Math.max(0.9, 2.5 * (147 / freq) ** 0.55));
  const warmth = 0.85;
  const main = string(freq, seconds, { t60, bright, position: 0.1 + 0.04 * random(), vel, seed: seed * 7 + 1, damp, warmth });
  if (freq < 190) {
    const oct = string(freq * 2 * cents(1.2), seconds, { t60: t60 * 0.7, bright: bright + 0.12, position: 0.17, vel: vel * 0.6, seed: seed * 7 + 2, damp, warmth });
    for (let i = 0; i < main.length; i++) main[i] += 0.42 * oct[i];
  } else if (freq < 520) {
    const uni = string(freq * cents(random() < 0.5 ? -1.7 : 1.7), seconds, { t60: t60 * 0.94, bright, position: 0.12, vel: vel * 0.9, seed: seed * 7 + 3, damp, warmth });
    for (let i = 0; i < main.length; i++) main[i] += 0.8 * uni[i];
  }
  // The flesh of the finger on the string: a breath of noise at the very start.
  const touch = Math.round(0.004 * SR);
  const hp = new Biquad('highpass', 1800, 0.7);
  for (let i = 0; i < touch && i < main.length; i++) main[i] += hp.process((random() * 2 - 1) * 0.02 * vel * (1 - i / touch));
  return main;
}

/** The harp's soundboard: broad and resonant. */
export const HARP_BODY = [['highpass', 45, 0.7, 0], ['peak', 175, 1.4, 3], ['peak', 420, 1.8, 2], ['peak', 1150, 1.5, 1.5], ['lowpass', 7500, 0.6, 0]];

/** A harp string: plucked nearer its middle than a lute, brighter, and ringing much longer. */
export function harpNote(freq, seconds, { vel = 0.6, seed = 1, damp = null } = {}) {
  const random = rng(seed);
  const t60 = Math.min(7, Math.max(1.4, 6 * (65 / freq) ** 0.42));
  return string(freq, seconds, { t60, bright: 0.58, position: 0.25 + 0.1 * random(), vel, seed: seed * 5 + 1, damp, warmth: 0.55 });
}

/* ------------------------------------------------------------------ bowed strings */

export const VIOLIN = {
  peaks: [[280, 8, 7], [460, 6, 7], [550, 5, 7], [1080, 3, 3], [2450, 6, 1.6], [3500, 2.5, 2.5]],
  tiltFrom: 3200, tilt: -10, highpass: 190,
};
export const VIOLA = {
  peaks: [[205, 7, 6], [330, 6, 7], [400, 5, 7], [780, 3, 3], [1750, 5.5, 1.6], [2600, 2.5, 2.5]],
  tiltFrom: 2400, tilt: -9, highpass: 125,
};
export const VIOL = {
  peaks: [[118, 6, 5], [212, 7, 6], [292, 5, 6], [560, 3, 3], [1150, 5, 1.6], [1900, 2, 2]],
  tiltFrom: 1700, tilt: -9, highpass: 62,
};

function bodyTable(b) {
  const step = 4;
  const table = new Float32Array(Math.ceil(12000 / step) + 2);
  for (let i = 1; i < table.length; i++) {
    const f = i * step;
    let g = 0;
    for (const [fc, gain, q] of b.peaks) {
      const x = q * (f / fc - fc / f);
      g += gain / (1 + x * x);
    }
    if (f > b.tiltFrom) g += b.tilt * Math.log2(f / b.tiltFrom);
    if (f < b.highpass) g -= 24 * Math.log2(b.highpass / f);
    if (f > 8500) g -= 30 * Math.log2(f / 8500);
    table[i] = db(g);
  }
  return { table, step, at: (f) => table[Math.min(table.length - 1, Math.max(1, Math.round(f / step)))] };
}
const bodies = new Map();
const bodyOf = (b) => {
  let t = bodies.get(b);
  if (!t) bodies.set(b, (t = bodyTable(b)));
  return t;
};

/**
 * Control signals shared by the sustained instruments: per-sample pitch (with glides on slurs and a small scoop on a
 * fresh start), the nominal pitch, and a smoothed amplitude that dips at a re-articulation and releases after a rest.
 */
function phrase(notes, { attack, release, glide, scoop, rearticulate = 0.55 }) {
  const t0 = notes[0].t;
  const last = notes.at(-1);
  const n = Math.ceil((last.t + last.dur + release * 1.6 + 0.05 - t0) * SR);
  const freq = new Float32Array(n), nominal = new Float32Array(n), target = new Float32Array(n), since = new Float32Array(n);
  const fresh = new Uint8Array(n);
  for (let j = 0; j < notes.length; j++) {
    const note = notes[j];
    const prev = notes[j - 1];
    const s0 = Math.round((note.t - t0) * SR);
    const s1 = Math.min(n, Math.round((note.t + note.dur - t0) * SR));
    const joined = prev && Math.abs(prev.t + prev.dur - note.t) < 0.03;
    for (let i = s0; i < s1; i++) {
      const tn = (i - s0) / SR;
      let f = note.freq;
      if (note.slur && joined && tn < glide) {
        const u = tn / glide;
        const w = u * u * (3 - 2 * u);
        f = prev.freq * (1 - w) + note.freq * w;
      } else if (!note.slur) f = note.freq * cents(-scoop * Math.exp(-tn / 0.035));
      freq[i] = f;
      nominal[i] = note.freq;
      // A fresh bow or breath on a joined note dips briefly; otherwise the level follows the note.
      const dip = joined && !note.slur && tn < 0.03 ? rearticulate : 1;
      target[i] = note.vel * dip;
      since[i] = tn;
      fresh[i] = note.slur ? 0 : 1;
    }
    // Hold the pitch through the release so the tail does not slide.
    if (!notes[j + 1] || Math.abs(notes[j + 1].t - (note.t + note.dur)) > 0.03) {
      for (let i = s1; i < Math.min(n, s1 + Math.round(release * 1.6 * SR)); i++) {
        if (freq[i] === 0) { freq[i] = note.freq; nominal[i] = note.freq; since[i] = 9; }
      }
    }
  }
  for (let i = 1; i < n; i++) if (freq[i] === 0) { freq[i] = freq[i - 1]; nominal[i] = nominal[i - 1]; }
  const amp = new Float32Array(n);
  const up = Math.exp(-1 / (Math.max(0.005, attack / 3) * SR));
  const down = Math.exp(-1 / (Math.max(0.005, release / 3) * SR));
  const dipDown = Math.exp(-1 / (0.012 * SR));
  let a = 0;
  for (let i = 0; i < n; i++) {
    const tg = target[i];
    const k = tg > a ? up : tg > 0 ? dipDown : down;
    a = k * a + (1 - k) * tg;
    amp[i] = a;
  }
  return { n, freq, nominal, amp, since, fresh, t0 };
}

/** A slow wandering in pitch (a player is never perfectly steady), in cents. */
function drift(n, random, cent = 2.5, rate = 0.7) {
  const out = new Float32Array(n);
  const lp = new OnePole(rate);
  const lp2 = new OnePole(rate);
  for (let i = 0; i < n; i++) out[i] = lp2.process(lp.process(gaussian(random))) * cent * 9;
  return out;
}

/**
 * A bowed line (fiddle, viol, drone): Helmholtz motion as a 1/k harmonic series whose partials pass through the body's
 * resonances, so vibrato makes each harmonic swell and fade as it sweeps a peak, which is much of a real string's life.
 * Notes are { t, dur, freq, vel, slur }. Returns { buf, t0 } with the line starting at t0 seconds.
 */
export function bowedLine(notes, {
  body = VIOLIN, seed = 1, vibRate = 5.4, vibDepth = 0.0032, vibDelay = 0.22, attack = 0.08, release = 0.22,
  brightness = 0.5, tremolo = 0, tremoloRate = 11, detune = 0, noise = 0.012, maxHarmonics = 44,
} = {}) {
  const random = rng(seed);
  const c = phrase(notes, { attack, release, glide: 0.05, scoop: 12 });
  const wander = drift(c.n, random, 2.2);
  const B = bodyOf(body);
  const out = new Float32Array(c.n);
  const bowNoise = new Biquad('bandpass', 2300, 0.8);
  let phase = random(), vib = random(), rate = vibRate * (0.95 + 0.1 * random());
  const block = 32;
  const amps = new Float32Array(maxHarmonics + 1), prevAmps = new Float32Array(maxHarmonics + 1);
  const tilt = 1 + 0.45 * (1 - brightness);
  const inst = new Float32Array(c.n);
  for (let i = 0; i < c.n; i++) {
    const depth = vibDepth * Math.min(1, Math.max(0, (c.since[i] - vibDelay) / 0.35));
    rate += (vibRate - rate) * 0.0001 + (random() - 0.5) * 0.0004;
    vib += rate / SR;
    inst[i] = c.freq[i] * (1 + depth * sine(vib)) * cents(detune + wander[i]);
  }
  let lastK = 0;
  for (let s = 0; s < c.n; s += block) {
    const f0 = inst[s];
    const nom = c.nominal[s];
    const K = Math.min(maxHarmonics, Math.floor(9500 / Math.max(30, f0)));
    // Harmonic levels at the moving pitch, normalized at the nominal pitch: loudness stays steady while vibrato
    // sweeps each harmonic across the body's peaks. The top of the series fades out rather than switching off.
    let norm = 0;
    for (let k = 1; k <= maxHarmonics; k++) {
      if (k > K) {
        amps[k] = 0;
        continue;
      }
      const base = 1 / k ** tilt;
      const top = Math.min(1, Math.max(0, (9500 - k * f0) / 2000));
      amps[k] = base * B.at(k * f0) * top;
      const ref = base * B.at(k * nom);
      norm += ref * ref;
    }
    norm = 0.25 / Math.sqrt(norm / 2 || 1);
    const KK = Math.max(K, lastK);
    lastK = K;
    const end = Math.min(c.n, s + block);
    for (let i = s; i < end; i++) {
      const u = (i - s + 1) / block;
      const f = inst[i];
      phase += f / SR;
      if (phase > 1e6) phase -= Math.floor(phase);
      let v = 0;
      for (let k = 1; k <= KK; k++) v += (prevAmps[k] + (amps[k] * norm - prevAmps[k]) * u) * sine(k * phase);
      let a = c.amp[i];
      if (tremolo) a *= 1 - tremolo * 0.5 * (1 + sine((i / SR) * tremoloRate));
      out[i] = (v + bowNoise.process(random() * 2 - 1) * noise * (1 + tremolo)) * a;
    }
    for (let k = 1; k <= maxHarmonics; k++) prevAmps[k] = amps[k] * norm;
  }
  return { buf: fadeEdges(out, 0.002, 0.03), t0: c.t0 };
}

/* ------------------------------------------------------------------ wooden flute */

/**
 * A wooden flute: a few harmonics carried on breath. The breath noise is filtered at the note and its octave, so it
 * sounds like air in a tube, with a puff of "chiff" at each tongued start and a gentle breath vibrato.
 */
export function fluteLine(notes, { seed = 1, breath = 0.5, vibRate = 4.8, brightness = 0.5, detune = 0 } = {}) {
  const random = rng(seed);
  const c = phrase(notes, { attack: 0.05, release: 0.1, glide: 0.035, scoop: 6, rearticulate: 0.45 });
  const wander = drift(c.n, random, 1.6);
  const out = new Float32Array(c.n);
  const HARM = [1, 0.3, 0.13, 0.06, 0.03, 0.015];
  const band1 = new Biquad('bandpass', 500, 14), band2 = new Biquad('bandpass', 1000, 14);
  const air = new Biquad('highpass', 1800, 0.7), airTop = new Biquad('lowpass', 5200, 0.7);
  const chiffBand = new Biquad('bandpass', 2000, 2.5);
  let phase = random(), vib = random();
  for (let i = 0; i < c.n; i++) {
    const tn = c.since[i];
    if (i % 64 === 0) {
      const f = c.freq[i];
      band1.set('bandpass', f, 14);
      band2.set('bandpass', f * 2, 14);
      chiffBand.set('bandpass', f * 2.8, 2.5);
    }
    const depth = Math.min(1, Math.max(0, (tn - 0.3) / 0.4));
    vib += vibRate / SR;
    const sv = sine(vib);
    const f = c.freq[i] * (1 + 0.0012 * depth * sv) * cents(detune + wander[i]);
    phase += f / SR;
    if (phase > 1e6) phase -= Math.floor(phase);
    const a = c.amp[i] * (1 + 0.06 * depth * sv);
    const lift = 0.7 + 0.6 * brightness * Math.min(1, a * 1.4);
    let v = 0;
    for (let k = 0; k < HARM.length; k++) v += HARM[k] * (k ? lift : 1) * sine((k + 1) * phase);
    const w = random() * 2 - 1;
    const breathy = (band1.process(w) * 0.9 + band2.process(w) * 0.5) * 0.085 * breath + airTop.process(air.process(w)) * 0.014 * breath;
    const chiff = c.fresh[i] && tn < 0.035 ? chiffBand.process(w) * 0.5 * (1 - tn / 0.035) : chiffBand.process(0);
    out[i] = (v * 0.3 + breathy + chiff * 0.15) * a;
  }
  return { buf: fadeEdges(out, 0.002, 0.03), t0: c.t0 };
}

/* ------------------------------------------------------------------ wordless voices */

/** Vowel formants as [frequency, bandwidth, gain dB] for an adult male voice; a female voice sits about 12 % higher. */
export const VOWELS = {
  u: [[320, 80, 0], [800, 100, -10], [2500, 140, -26], [3300, 200, -32]],
  o: [[450, 80, 0], [800, 90, -5], [2830, 150, -22], [3500, 200, -28]],
  a: [[730, 90, 0], [1090, 110, -5], [2440, 160, -18], [3400, 250, -24]],
};

/**
 * One sung line on a vowel: a glottal harmonic series shaped by the vowel's formants, so that vibrato moves each
 * harmonic across the formant peaks, with aspiration noise in the same formants and the small unsteadiness of a voice.
 */
export function voiceLine(notes, { vowel = 'o', female = false, seed = 1, vibRate = 5.2, vibDepth = 0.0055, breath = 0.35, detune = 0 } = {}) {
  const random = rng(seed);
  const shift = female ? 1.12 : 1;
  const formants = VOWELS[vowel].map(([f, bw, g]) => [f * shift, bw * shift, db(g)]);
  const envelope = (f) => {
    let e = 0.0015;
    for (const [F, bw, g] of formants) {
      const x = (f - F) / (bw / 2);
      e += g / (1 + x * x);
    }
    return e;
  };
  const c = phrase(notes, { attack: 0.2, release: 0.38, glide: 0.09, scoop: 18, rearticulate: 0.7 });
  const wander = drift(c.n, random, 4, 1.1);
  const out = new Float32Array(c.n);
  const bands = formants.slice(0, 3).map(([F, bw]) => new Biquad('bandpass', F, F / bw));
  let phase = random(), vib = random();
  const rate = vibRate * (0.93 + 0.14 * random());
  const amps = new Float32Array(64), prevAmps = new Float32Array(64);
  const inst = new Float32Array(c.n);
  for (let i = 0; i < c.n; i++) {
    const depth = vibDepth * Math.min(1, Math.max(0, (c.since[i] - 0.35) / 0.5));
    vib += rate / SR;
    inst[i] = c.freq[i] * (1 + depth * sine(vib)) * cents(detune + wander[i]);
  }
  let lastK = 0;
  for (let s = 0; s < c.n; s += 32) {
    const f0 = inst[s];
    const nom = c.nominal[s];
    const K = Math.min(60, Math.floor(5200 / Math.max(40, f0)));
    let norm = 0;
    for (let k = 1; k <= 60; k++) {
      if (k > K) {
        amps[k] = 0;
        continue;
      }
      const tilt = 1 / k ** 1.25;
      amps[k] = tilt * envelope(k * f0) * Math.min(1, Math.max(0, (5200 - k * f0) / 1200));
      const ref = tilt * envelope(k * nom);
      norm += ref * ref;
    }
    norm = 0.22 / Math.sqrt(norm / 2 || 1);
    const KK = Math.max(K, lastK);
    lastK = K;
    const end = Math.min(c.n, s + 32);
    for (let i = s; i < end; i++) {
      const u = (i - s + 1) / 32;
      phase += inst[i] / SR;
      if (phase > 1e6) phase -= Math.floor(phase);
      let v = 0;
      for (let k = 1; k <= KK; k++) v += (prevAmps[k] + (amps[k] * norm - prevAmps[k]) * u) * sine(k * phase);
      const w = random() * 2 - 1;
      let asp = 0;
      for (const b of bands) asp += b.process(w);
      out[i] = (v + asp * 0.03 * breath) * c.amp[i];
    }
    for (let k = 1; k <= 60; k++) prevAmps[k] = amps[k] * norm;
  }
  return { buf: fadeEdges(out, 0.002, 0.04), t0: c.t0 };
}

/* ------------------------------------------------------------------ drums */

const MEMBRANE = [1, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501, 3.6, 3.652, 4.06, 4.15];
const SYMMETRIC = new Set([0, 3, 8]);

/**
 * A struck frame drum or war drum: the inharmonic modes of a circular membrane, with the brief upward glide of a
 * skin under impact and the slap of hand or beater. `strike` moves the blow from the centre (0) to the edge (1).
 */
export function drumHit({ f0 = 95, vel = 0.8, decay = 0.4, strike = 0.35, mute = 0, slap = 0.35, seed = 1, seconds = null } = {}) {
  const random = rng(seed);
  const len = seconds ?? decay * 5.5 * (1 - 0.6 * mute) + 0.05;
  const out = samples(len);
  for (let m = 0; m < MEMBRANE.length; m++) {
    const amp = (SYMMETRIC.has(m) ? 1 - 0.6 * strike : 0.2 + 0.9 * strike) / (1 + m * 0.4);
    const tau = (decay * (1 - 0.7 * mute)) / MEMBRANE[m] ** 1.3;
    const f = f0 * MEMBRANE[m] * (1 + (random() - 0.5) * 0.008);
    const k = Math.exp(-1 / (tau * SR));
    let env = amp, phase = random();
    for (let i = 0; i < out.length && env > 1e-5; i++) {
      const glide = 1 + 0.09 * vel * Math.exp(-i / (0.018 * SR));
      phase += (f * glide) / SR;
      out[i] += env * sine(phase);
      env *= k;
    }
  }
  const hp = new Biquad('highpass', 900, 0.7);
  const lp = new Biquad('lowpass', 6000, 0.7);
  const slapLen = Math.round(0.03 * SR);
  for (let i = 0; i < slapLen && i < out.length; i++) out[i] += lp.process(hp.process(random() * 2 - 1)) * slap * Math.exp(-i / (0.006 * SR));
  for (let i = 0; i < out.length; i++) out[i] *= 0.32 * vel;
  return fadeEdges(out, 0.0012, 0.02);
}

/* ------------------------------------------------------------------ struck metal and glass */

/**
 * Struck modes: each partial { f, amp, t60, beat } rings with its own decay; a partial with `beat` is a doublet, two
 * modes a few tenths of a hertz apart, which gives bells and bowls their slow pulse.
 */
export function modal(partials, { seconds, seed = 1, strike = null, swell = 0 } = {}) {
  const random = rng(seed);
  const out = samples(seconds);
  for (const p of partials) {
    const pairs = p.beat ? [[p.f - p.beat / 2, 0.55], [p.f + p.beat / 2, 0.45]] : [[p.f, 1]];
    for (const [f, share] of pairs) {
      if (f >= SR / 2.2) continue;
      const k = Math.exp(-6.908 / (p.t60 * (0.92 + 0.16 * random()) * SR));
      let env = p.amp * share, phase = random();
      for (let i = 0; i < out.length && env > 1e-6; i++) {
        phase += f / SR;
        out[i] += env * sine(phase);
        env *= k;
      }
    }
  }
  if (swell) {
    // A rubbed rim: the tone grows before it fades.
    for (let i = 0; i < out.length; i++) out[i] *= Math.min(1, i / (swell * SR)) ** 1.5;
  }
  if (strike) {
    const band = new Biquad('bandpass', strike.freq, strike.q ?? 1.2);
    const len = Math.round((strike.decay * 8) * SR);
    for (let i = 0; i < len && i < out.length; i++) out[i] += band.process(random() * 2 - 1) * strike.level * Math.exp(-i / (strike.decay * SR));
  }
  return fadeEdges(out, 0.0015, 0.05);
}

/**
 * A cast bronze bell tuned to its strike note (the nominal): hum an octave below the prime, the minor-third tierce
 * that makes bells sound wistful, quint, nominal and the upper partials, each split into a slowly beating pair.
 */
export function churchBell(nominal, { seconds = 9, vel = 1, seed = 1 } = {}) {
  const p = nominal / 2;
  const P = [
    [0.5, -7, 12, 0.3], [1.0, -9, 8, 0.55], [1.19, -4, 6.5, 0.8], [1.5, -15, 3.4, 1.1], [2.0, 0, 5, 0.9],
    [2.51, -10, 3, 1.6], [2.68, -18, 2.2, 1.9], [3.01, -15, 1.9, 2.3], [4.02, -21, 1.2, 3], [5.35, -27, 0.6, 0],
    [6.04, -29, 0.45, 0], [8.1, -33, 0.25, 0],
  ];
  const out = modal(P.map(([r, g, t60, beat]) => ({ f: r * p, amp: db(g), t60: t60 * (1 + 0.25 * (300 / nominal - 1)), beat })), {
    seconds, seed, strike: { freq: 3500, q: 0.9, level: db(-16), decay: 0.004 },
  });
  for (let i = 0; i < out.length; i++) out[i] *= 0.35 * vel;
  return out;
}

/** A small wind chime tube: the free-free bar's partials, a light tick, a long clear ring. */
export function chime(freq, { seconds = 5, vel = 1, seed = 1 } = {}) {
  const P = [[1, 0, 5.5, 0.35], [2.756, -7, 2.4, 0.9], [5.404, -14, 1.1, 1.4], [8.933, -24, 0.5, 0]];
  const out = modal(P.map(([r, g, t60, beat]) => ({ f: r * freq, amp: db(g), t60, beat })), {
    seconds, seed, strike: { freq: 5200, q: 1.4, level: db(-24), decay: 0.0015 },
  });
  for (let i = 0; i < out.length; i++) out[i] *= 0.3 * vel;
  return out;
}

/** A bronze singing bowl: few partials, very long, with the wide slow beating a bowl is known for. */
export function singingBowl(freq, { seconds = 10, vel = 1, seed = 1, swell = 0 } = {}) {
  const P = [[1, 0, 13, 1.1], [2.72, -8, 7, 2.1], [5.12, -16, 3.5, 3.1], [8.0, -26, 1.6, 0]];
  const out = modal(P.map(([r, g, t60, beat]) => ({ f: r * freq, amp: db(g), t60, beat })), {
    seconds, seed, swell, strike: swell ? null : { freq: 900, q: 0.8, level: db(-22), decay: 0.006 },
  });
  for (let i = 0; i < out.length; i++) out[i] *= 0.3 * vel;
  return out;
}

/* ------------------------------------------------------------------ small lives */

/**
 * A field cricket's chirp: a few pulses of a pure tone near 4.7 kHz, each falling slightly in pitch, made by the file
 * and scraper of the wings.
 */
export function cricketChirp({ carrier = 4700, pulses = 4, pulse = 0.016, gap = 0.018, seed = 1 } = {}) {
  const random = rng(seed);
  const out = samples(pulses * (pulse + gap) + 0.02);
  let phase = random();
  for (let p = 0; p < pulses; p++) {
    const s0 = Math.round((0.004 + p * (pulse + gap)) * SR);
    const len = Math.round(pulse * (0.9 + 0.2 * random()) * SR);
    const level = (p === 0 ? 0.6 : 1) * (0.85 + 0.15 * random());
    for (let i = 0; i < len; i++) {
      const u = i / len;
      const f = carrier * (1.015 - 0.035 * u);
      phase += f / SR;
      const env = Math.sin(Math.PI * u) ** 1.5;
      out[s0 + i] += level * env * (sine(phase) + 0.08 * sine(phase * 2));
    }
  }
  for (let i = 0; i < out.length; i++) out[i] *= 0.3;
  return out;
}

/**
 * A rising bubble (after van den Doel): the Minnaert resonance of an air bubble of radius r, rising in pitch as it
 * nears the surface, gone in a few hundredths of a second.
 */
export function bubble({ radius = 0.003, seed = 1, vel = 1 } = {}) {
  const random = rng(seed);
  const f0 = 3.26 / radius;
  const d = 0.13 * f0 + 0.0072 * f0 ** 1.5;
  const len = Math.min(0.25, 7 / d);
  const out = samples(len + 0.01);
  let phase = random();
  const n = Math.round(len * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    phase += (f0 * (1 + 0.1 * d * t)) / SR;
    out[i] = Math.exp(-d * t) * sine(phase) * (1 - Math.exp(-i / (0.0008 * SR)));
  }
  for (let i = 0; i < out.length; i++) out[i] *= 0.35 * vel;
  return out;
}

/** A heartbeat as it sounds from inside: a heavy low "lub", a quicker "dub", felt more than heard. */
export function heartbeat({ seed = 1, vel = 1 } = {}) {
  const random = rng(seed);
  const out = samples(0.75);
  const thump = (at, f1, f2, tau, level) => {
    const s0 = Math.round(at * SR);
    let phase = 0;
    for (let i = 0; i < Math.round(tau * 7 * SR) && s0 + i < out.length; i++) {
      const t = i / SR;
      const f = f2 + (f1 - f2) * Math.exp(-t / 0.03);
      phase += f / SR;
      const env = (1 - Math.exp(-t / 0.006)) * Math.exp(-t / tau);
      out[s0 + i] += level * env * sine(phase);
    }
  };
  thump(0.01, 62, 41, 0.07, 1);
  thump(0.28 + 0.02 * random(), 78, 52, 0.05, 0.62);
  const lp = new Biquad('lowpass', 240, 0.7);
  for (let i = 0; i < out.length; i++) out[i] = lp.process(out[i]) * 0.9 * vel;
  return fadeEdges(out, 0.001, 0.05);
}
