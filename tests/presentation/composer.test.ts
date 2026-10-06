import { describe, expect, it } from 'vitest';
import { WORLD_AUDIO } from '../../src/presentation/sound/worldAudioManifest';

/**
 * The crafted half of the world sound is composed and synthesized by plain JavaScript under tools/world-audio/compose.
 * These checks hold its instruments to their physics and its notation to its meter. The modules are loaded by URL,
 * so the test needs no types for them.
 */
type Module = Record<string, (...args: never[]) => unknown> & Record<string, unknown>;
const load = (name: string) => import(/* @vite-ignore */ new URL(`../../tools/world-audio/compose/${name}`, import.meta.url).href) as Promise<Module>;
const SR = 48000;

/** Fundamental by autocorrelation with parabolic refinement, over a stretch of a buffer. */
function pitch(buf: Float32Array, from: number, to: number, fmin = 60, fmax = 1500) {
  const x = buf.subarray(Math.round(from * SR), Math.round(to * SR));
  const n = x.length;
  const lo = Math.floor(SR / fmax), hi = Math.ceil(SR / fmin);
  let best = 0, bestLag = lo;
  const ac = new Float64Array(hi + 2);
  for (let lag = lo - 1; lag <= hi + 1; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += x[i]! * x[i + lag]!;
    ac[lag] = s / (n - lag);
    if (lag >= lo && lag <= hi && ac[lag]! > best) {
      best = ac[lag]!;
      bestLag = lag;
    }
  }
  // Prefer the shortest lag with nearly the best correlation (avoid octave errors).
  for (let lag = lo; lag < bestLag; lag++) {
    if (ac[lag]! > 0.92 * best && ac[lag]! >= ac[lag - 1]! && ac[lag]! >= ac[lag + 1]!) {
      bestLag = lag;
      break;
    }
  }
  const a = ac[bestLag - 1]!, b = ac[bestLag]!, c = ac[bestLag + 1]!;
  const shift = (0.5 * (a - c)) / (a - 2 * b + c || 1);
  return SR / (bestLag + shift);
}
const centsOff = (f: number, want: number) => 1200 * Math.log2(f / want);

/** Strongest spectral peak near a frequency (Hz), by a direct DFT scan at 0.05 Hz steps. */
function peakNear(buf: Float32Array, from: number, to: number, f0: number, span = 4) {
  const x = buf.subarray(Math.round(from * SR), Math.round(to * SR));
  let bestF = f0, bestM = 0;
  for (let f = f0 - span; f <= f0 + span; f += 0.05) {
    let re = 0, im = 0;
    const w = (2 * Math.PI * f) / SR;
    for (let i = 0; i < x.length; i += 2) {
      const h = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / x.length);
      re += x[i]! * h * Math.cos(w * i);
      im -= x[i]! * h * Math.sin(w * i);
    }
    const m = Math.hypot(re, im);
    if (m > bestM) {
      bestM = m;
      bestF = f;
    }
  }
  return bestF;
}

describe('crafted instruments', () => {
  it('tunes plucked strings to the cent across the lute and the harp', async () => {
    const I = await load('instruments.mjs');
    const string = I.string as (f: number, s: number, o?: object) => Float32Array;
    for (const f of [73.42, 146.83, 220, 293.66, 440]) {
      const out = string(f, 1.4, { t60: 2, bright: 0.45, warmth: 0.8, seed: 3 });
      expect(Math.abs(centsOff(pitch(out, 0.3, 1.1), f)), `${f} Hz`).toBeLessThan(2);
    }
    const lute = (I.luteNote as (f: number, s: number, o?: object) => Float32Array)(174.61, 1.4, { seed: 5 });
    expect(Math.abs(centsOff(pitch(lute, 0.3, 1.1), 174.61))).toBeLessThan(3);
    const harp = (I.harpNote as (f: number, s: number, o?: object) => Float32Array)(392, 1.4, { seed: 6 });
    expect(Math.abs(centsOff(pitch(harp, 0.3, 1.1), 392))).toBeLessThan(2);
  });

  it("loses a string's highs in time as gut does, so bass notes darken quickly", async () => {
    const I = await load('instruments.mjs');
    const out = (I.string as (f: number, s: number, o?: object) => Float32Array)(73.42, 2, { t60: 3, bright: 0.45, seed: 2 });
    const energyAbove = (from: number, to: number) => {
      // A crude high band: the signal minus a 5-sample moving average.
      let e = 0;
      for (let i = Math.round(from * SR) + 4; i < Math.round(to * SR); i++) {
        const avg = (out[i]! + out[i - 1]! + out[i - 2]! + out[i - 3]! + out[i - 4]!) / 5;
        e += (out[i]! - avg) ** 2;
      }
      return e;
    };
    expect(energyAbove(1.2, 1.4) / energyAbove(0.02, 0.22)).toBeLessThan(0.02);
  });

  it('bows and blows in tune: vibrato centres on the written note', async () => {
    const I = await load('instruments.mjs');
    const note = [{ t: 0, dur: 2, freq: 440, vel: 0.7, slur: false }];
    const fiddle = (I.bowedLine as (n: object[], o: object) => { buf: Float32Array }).call(null, note, { body: I.VIOLIN, seed: 1 }).buf;
    expect(Math.abs(centsOff(pitch(fiddle, 0.6, 1.8), 440))).toBeLessThan(6);
    const flute = (I.fluteLine as (n: object[], o: object) => { buf: Float32Array }).call(null, [{ ...note[0], freq: 587.33 }], { seed: 2 }).buf;
    expect(Math.abs(centsOff(pitch(flute, 0.6, 1.8), 587.33))).toBeLessThan(4);
  });

  it('casts the town bell on D: its nominal on D4 and its hum two octaves down', async () => {
    const I = await load('instruments.mjs');
    const bell = (I.churchBell as (f: number, o: object) => Float32Array)(293.66, { seconds: 4, seed: 1 });
    expect(Math.abs(peakNear(bell, 0.2, 3.2, 293.66) - 293.66)).toBeLessThan(1.2);
    expect(Math.abs(peakNear(bell, 0.2, 3.2, 73.4, 2) - 73.4)).toBeLessThan(0.8);
    const chime = (I.chime as (f: number, o: object) => Float32Array)(587.33, { seconds: 2, seed: 1 });
    expect(Math.abs(peakNear(chime, 0.1, 1.6, 587.33) - 587.33)).toBeLessThan(0.8);
  });

  it('lets a drum and a bubble die away, and a cricket chirp in pulses', async () => {
    const I = await load('instruments.mjs');
    const rms = (b: Float32Array, a: number, z: number) => {
      let s = 0;
      for (let i = Math.round(a * b.length); i < Math.round(z * b.length); i++) s += b[i]! ** 2;
      return Math.sqrt(s / Math.max(1, Math.round((z - a) * b.length)));
    };
    const drum = (I.drumHit as (o: object) => Float32Array)({ f0: 92, vel: 0.8, seed: 1 });
    expect(rms(drum, 0.9, 1) / rms(drum, 0, 0.1)).toBeLessThan(0.02);
    const bubble = (I.bubble as (o: object) => Float32Array)({ radius: 0.003, seed: 1 });
    expect(bubble.length / SR).toBeLessThan(0.1);
    const chirp = (I.cricketChirp as (o: object) => Float32Array)({ pulses: 4, seed: 1 });
    let bursts = 0, on = false;
    for (let i = 0; i < chirp.length; i += 48) {
      let peakHere = 0;
      for (let k = i; k < Math.min(chirp.length, i + 48); k++) peakHere = Math.max(peakHere, Math.abs(chirp[k]!));
      if (!on && peakHere > 0.05) { bursts++; on = true; } else if (on && peakHere < 0.01) on = false;
    }
    expect(bursts).toBe(4);
  });
});

describe('written music', () => {
  it('refuses a miscounted bar and reads slurs, accents and rests', async () => {
    const N = await load('notation.mjs');
    const parse = N.parse as (t: string, b: number, o?: object) => { notes: { beat: number; beats: number; midi: number; slur: boolean; accent: boolean }[]; beats: number };
    expect(() => parse('D4:1 A4:1 |', 3)).toThrow(/2 beats, not 3/);
    expect(() => parse('D4:1 Q4:2 |', 3)).toThrow(/bad note/);
    const line = parse('D4:1 A4:2~ | G4:1! r:1 F4:1 |', 3);
    expect(line.beats).toBe(6);
    expect(line.notes.map((n) => [n.beat, n.midi, n.slur, n.accent])).toEqual([[0, 62, false, false], [1, 69, false, false], [3, 67, true, true], [5, 65, false, false]]);
  });

  it('slows into a ritardando and keeps time elsewhere', async () => {
    const N = await load('notation.mjs');
    const Tempo = N.Tempo as unknown as new (bpm: number, o?: object) => { at(beat: number): number };
    const t = new Tempo(60, { rit: [{ from: 8, to: 12, factor: 0.5 }] });
    expect(t.at(8)).toBeCloseTo(8, 6);
    expect(t.at(12) - t.at(8)).toBeGreaterThan(5);
    expect(t.at(13) - t.at(12)).toBeCloseTo(2, 3);
  });
});

describe('composed pieces', () => {
  it('render the same every time, and every composed manifest entry has its render', async () => {
    const C = await load('index.mjs');
    const composed = C.COMPOSED as unknown as { id: string; render: () => Float32Array[] }[];
    const ids = composed.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [id, e] of Object.entries(WORLD_AUDIO.music)) if (e.origin === 'composed') expect(ids, id).toContain(id);
    // The inn's lute tunes are composed; its two sung songs were generated (A53) and come from plan.json instead.
    const sung = new Set(['drought_bell', 'bread_and_water']);
    for (const id of Object.keys(WORLD_AUDIO.songs)) if (!sung.has(id)) expect(ids, id).toContain(id);
    const light = composed.find((c) => c.id === 'place_light')!;
    const [a, b] = [light.render(), light.render()];
    expect(a[0]!.length).toBe(b[0]!.length);
    expect(a[0]!.every((v, i) => v === b[0]![i])).toBe(true);
  });
});
