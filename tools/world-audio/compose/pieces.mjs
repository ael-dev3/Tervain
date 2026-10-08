/**
 * Tervain's crafted music and sounds, composed and arranged in code.
 *
 * Everything grows from one theme in D Dorian: a rising fifth, the Dorian sixth (B natural) that gives the vale its
 * hope, a climb to the high D, and a modal cadence from C. The four moods arrange it differently:
 * - Rillford: lute and fiddle, then harp variations.
 * - The deepwood: a wooden flute over a bowed drone.
 * - Night: a harp alone in the darker Aeolian mode.
 * - The spring: a viol chorale with voices, ending on a D major chord.
 * The fights, the stings and the discovery motif of each region quote the theme. The town bell is cast on D. The inn's
 * evening tunes are lute solos, one of them the theme itself. Each render is deterministic; the seeds are part of the
 * composition.
 */
import { SR, addAt, body, convolve, gaussian, hzOf, midi, mtof, place, rng, roomIR, samples } from './dsp.mjs';
import * as I from './instruments.mjs';
import { Tempo, arch, parse, rootOf, tonesOf } from './notation.mjs';

/* ------------------------------------------------------------------ spaces and mixing */

const SPACES = {
  room: { seconds: 2.4, t60: [1.7, 1.4, 0.8], predelay: 0.014, early: [[0.011, 0.5], [0.017, 0.4], [0.023, 0.35], [0.031, 0.3], [0.042, 0.22]] },
  forest: { seconds: 3.4, t60: [2.6, 2.0, 1.0], predelay: 0.028, early: [[0.035, 0.25], [0.061, 0.2], [0.093, 0.16], [0.131, 0.12]] },
  night: { seconds: 4, t60: [3.2, 2.5, 1.2], predelay: 0.03, early: [[0.03, 0.2], [0.05, 0.16], [0.08, 0.12]] },
  hall: { seconds: 5.5, t60: [4.4, 3.5, 1.7], predelay: 0.038, early: [[0.021, 0.4], [0.034, 0.36], [0.049, 0.3], [0.067, 0.26], [0.088, 0.2]] },
  inn: { seconds: 1.5, t60: [0.9, 0.7, 0.4], predelay: 0.008, early: [[0.006, 0.5], [0.011, 0.45], [0.016, 0.35], [0.024, 0.3]] },
};

/** A stereo mix with one shared room: parts are panned in, and each sends a share of itself to the room. */
class Mix {
  constructor(seconds, space, { wet = 0.25, seed = 1 } = {}) {
    this.n = Math.ceil(seconds * SR);
    this.L = new Float32Array(this.n);
    this.R = new Float32Array(this.n);
    this.send = new Float32Array(this.n);
    this.space = space;
    this.wet = wet;
    this.seed = seed;
  }

  add(buf, at = 0, { gain = 1, pan = 0, send = 0.25 } = {}) {
    place(this.L, this.R, buf, at, gain, pan);
    if (send) addAt(this.send, buf, at, gain * send);
    return this;
  }

  finish() {
    if (this.space) {
      const [il, ir] = roomIR({ ...SPACES[this.space], seed: this.seed });
      const wl = convolve(this.send, il);
      const wr = convolve(this.send, ir);
      for (let i = 0; i < this.n; i++) {
        this.L[i] += wl[i] * this.wet;
        this.R[i] += wr[i] * this.wet;
      }
    }
    return [this.L, this.R];
  }
}

/** Parsed notes placed in time on a tempo, with a player's small unevenness and the shape of each phrase. */
function timed(parsed, tempo, { random = null, humanize = 0.006, vel = 0.7, phrase = 12, depth = 0.15 } = {}) {
  return parsed.notes.map((n) => {
    const start = tempo.at(n.beat);
    const end = tempo.at(n.beat + n.beats);
    const shape = phrase ? arch(n.beat, Math.floor(n.beat / phrase) * phrase, phrase, depth) : 1;
    return {
      t: start + (random ? gaussian(random) * humanize : 0),
      dur: Math.max(0.04, (end - start) * (n.short ? 0.55 : 1)),
      freq: mtof(n.midi),
      midi: n.midi,
      beat: n.beat,
      beats: n.beats,
      vel: vel * shape * (n.accent ? 1.15 : 1) * (random ? 0.95 + 0.1 * random() : 1),
      slur: n.slur,
    };
  });
}

/** Sustained lines are rendered as phrases: notes separated by a rest begin a new phrase. */
function phrases(notes, gap = 0.05) {
  const out = [];
  let cur = [];
  for (const n of notes) {
    const prev = cur.at(-1);
    if (prev && n.t - (prev.t + prev.dur) > gap) {
      out.push(cur);
      cur = [];
    }
    cur.push(n);
  }
  if (cur.length) out.push(cur);
  return out;
}

function bowed(mix, notes, opts, { gain = 1, pan = 0, send = 0.25 } = {}) {
  for (const p of phrases(notes)) {
    const { buf, t0 } = I.bowedLine(p, { ...opts, seed: (opts.seed ?? 1) * 31 + Math.round(p[0].t * 10) });
    mix.add(buf, t0, { gain, pan, send });
  }
}

function blown(mix, notes, opts, { gain = 1, pan = 0, send = 0.3 } = {}) {
  for (const p of phrases(notes, 0.08)) {
    const { buf, t0 } = I.fluteLine(p, { ...opts, seed: (opts.seed ?? 1) * 37 + Math.round(p[0].t * 10) });
    mix.add(buf, t0, { gain, pan, send });
  }
}

function sung(mix, notes, opts, { gain = 1, pan = 0, send = 0.4 } = {}) {
  for (const p of phrases(notes)) {
    const { buf, t0 } = I.voiceLine(p, { ...opts, seed: (opts.seed ?? 1) * 41 + Math.round(p[0].t * 10) });
    mix.add(buf, t0, { gain, pan, send });
  }
}

/** Plucked notes on one instrument, summed into a stem and coloured by the instrument's body. */
function plucked(seconds, kind, notes, { ring = 2.4, damping = null } = {}) {
  const stem = samples(seconds);
  notes.forEach((n, i) => {
    const len = ring + 0.1;
    const damp = damping ? Math.min(len - 0.05, damping(n)) : null;
    const note = kind === 'harp' ? I.harpNote(n.freq, len, { vel: n.vel, seed: i + 1, damp }) : I.luteNote(n.freq, len, { vel: n.vel, seed: i + 1, damp });
    addAt(stem, note, n.t);
  });
  return body(stem, kind === 'harp' ? I.HARP_BODY : I.LUTE_BODY);
}

/** A broken chord on a plucked instrument across one bar of three beats: bass, then the chord rising and falling. */
function arpeggio(chord, bar, tempo, random, { low = 'D2', level = 0.5, beats = 3 } = {}) {
  const bass = rootOf(chord, midi(low));
  const up = tonesOf(chord, bass + 7, 3);
  const pattern = beats === 3 ? [bass, up[0], up[1], up[2], up[1], up[0]] : [bass, up[0], up[1], up[2], up[1], up[2], up[1], up[0]];
  return pattern.map((m, k) => ({
    t: tempo.at(bar * beats + k * 0.5) + gaussian(random) * 0.005,
    freq: mtof(m),
    vel: level * (k === 0 ? 1.15 : k === 3 ? 0.97 : 0.84) * (0.93 + 0.14 * random()),
  }));
}

/** A rolled chord (a harp's spread): low to high, a few hundredths of a second apart. */
function roll(midis, t, vel, spread = 0.04) {
  return midis.map((m, k) => ({ t: t + k * spread, freq: mtof(m), vel: vel * (k === 0 ? 1.1 : 0.9) }));
}

/** Render three identical passes and keep the middle one plus a crossfade's worth: a loop that joins without a seam. */
function threePass(passSeconds, space, wet, seed, draw) {
  const mix = new Mix(passSeconds * 3 + 1, space, { wet, seed });
  for (let pass = 0; pass < 3; pass++) draw(mix, pass * passSeconds);
  const [L, R] = mix.finish();
  const a = Math.round(passSeconds * SR), b = Math.round((passSeconds * 2 + LOOP_XFADE) * SR);
  return [L.slice(a, b), R.slice(a, b)];
}
export const LOOP_XFADE = 0.5;

/* ------------------------------------------------------------------ the theme */

const THEME = {
  A: 'D4:1 A4:2 | B4:1~ A4:1 G4:1 | F4:1 E4:1 D4:1 | E4:3 |',
  A2: 'D4:1 A4:2 | C5:1~ B4:1 A4:1 | G4:1 F4:1 E4:1 | D4:3 |',
  B: 'F4:1 A4:1 C5:1 | D5:2 C5:1 | B4:1~ A4:1 G4:1 | A4:3 |',
  A3: 'D4:1 A4:2 | B4:1~ A4:1 G4:1 | F4:1 E4:1 C4:1 | D4:3 |',
};
export const THEME_LINE = THEME.A + THEME.A2 + THEME.B + THEME.A3;
const HARMONY = ['Dm', 'G', 'Dm', 'C', 'Dm', 'Am', 'C', 'Dm', 'F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'Dm'];

/** The theme ornamented, as a player would vary it the second time round. */
const VARIATION =
  'D4:0.5 E4:0.5 F4:0.5 G4:0.5 A4:1 | B4:0.5 C5:0.5 B4:0.5 A4:0.5 G4:1 | F4:0.5 G4:0.5 E4:1 D4:1 | E4:2 r:1 |' +
  'D4:0.5 F4:0.5 A4:2 | C5:0.5 D5:0.5 B4:1 A4:1 | G4:0.5 A4:0.5 F4:1 E4:1 | D4:3 |' +
  'F4:1 A4:0.5 B4:0.5 C5:1 | D5:1.5 E5:0.5 C5:1 | B4:0.5 C5:0.5 A4:1 G4:1 | A4:3 |' +
  'D4:1 A4:1.5 G4:0.5 | B4:0.5 C5:0.5 A4:1 G4:1 | F4:1 E4:1 C4:1 | D4:3 |';

/** In the dark the sixth falls: the same tune in D Aeolian, B flat for B. */
const THEME_AEOLIAN =
  'D4:1 A4:2 | Bb4:1~ A4:1 G4:1 | F4:1 E4:1 D4:1 | E4:3 |' +
  'D4:1 A4:2 | C5:1~ Bb4:1 A4:1 | G4:1 F4:1 E4:1 | D4:3 |' +
  'F4:1 A4:1 C5:1 | D5:2 C5:1 | Bb4:1~ A4:1 G4:1 | A4:3 |' +
  'D4:1 A4:2 | Bb4:1~ A4:1 G4:1 | F4:1 E4:1 C4:1 | D4:3 |';
const HARMONY_AEOLIAN = ['Dm', 'Gm', 'Dm', 'C', 'Dm', 'F', 'C', 'Dm', 'F', 'Bb', 'Gm', 'Am', 'Dm', 'Gm', 'C', 'Dm'];

/* ------------------------------------------------------------------ the four moods */

/** Rillford at work: lute and fiddle play the theme, then the harp varies it over a fiddle counter-line. */
export function themeVale() {
  const random = rng(101);
  const bars = 36;
  const tempo = new Tempo(80, { rit: [{ from: 33 * 3, to: 36 * 3, factor: 0.7 }] });
  const seconds = tempo.at(bars * 3) + 6;
  const mix = new Mix(seconds, 'room', { wet: 0.3, seed: 11 });
  const harmony = ['Dm', 'Dm', ...HARMONY, ...HARMONY, 'Dm', 'Dm'];
  const lute = [];
  harmony.forEach((chord, bar) => {
    if (bar >= 34) {
      if (bar === 34) lute.push({ t: tempo.at(bar * 3), freq: hzOf('D2'), vel: 0.55 });
      return;
    }
    const level = bar < 2 ? 0.52 : bar < 18 ? 0.46 : 0.4;
    lute.push(...arpeggio(chord, bar, tempo, random, { level }));
  });
  mix.add(plucked(seconds, 'lute', lute), 0, { pan: -0.46, send: 0.2, gain: 1.15 });
  // Pass one: the fiddle sings the theme.
  const theme = timed(parse(THEME_LINE, 3, { from: 6 }), tempo, { random, vel: 0.62 });
  bowed(mix, theme, { body: I.VIOLIN, seed: 3, brightness: 0.45 }, { pan: 0.43, send: 0.28, gain: 0.95 });
  // Pass two: the harp plays the variation; the fiddle holds a counter-line beneath it.
  const variation = timed(parse(VARIATION, 3, { from: 54 }), tempo, { random, vel: 0.55 });
  mix.add(plucked(seconds, 'harp', variation, { ring: 2.4, damping: (n) => n.dur * 1.6 + 0.1 }), 0, { pan: 0.19, send: 0.32, gain: 1.1 });
  const counter = timed(parse('A3:3 | B3:3 | A3:3 | G3:3 | A3:3 | C4:3 | C4:3 | A3:3 | C4:3 | B3:3 | B3:3 | C4:3 | A3:3 | B3:3 | G3:3 | A3:3 |', 3, { from: 54 }), tempo, { random, vel: 0.42 });
  bowed(mix, counter, { body: I.VIOLIN, seed: 5, brightness: 0.3, vibDepth: 0.0026 }, { pan: 0.5, send: 0.3, gain: 0.85 });
  // The bass viol walks the roots throughout, then the coda: a long high D over the open chord.
  const bassLine = `${harmony.slice(2, 34).map((c) => `${noteName(rootOf(c, midi('D2')))}:3`).join(' | ')} | D2:3~ | D2:3 |`;
  const bass = timed(parse(bassLine, 3, { from: 6 }), tempo, { random, vel: 0.4, phrase: 0 });
  bowed(mix, bass, { body: I.VIOL, seed: 7, brightness: 0.3, vibDepth: 0.0012 }, { pan: -0.08, send: 0.22, gain: 0.9 });
  const coda = timed(parse('D5:6 |', 6, { from: 34 * 3 }), tempo, { vel: 0.55, phrase: 0 });
  bowed(mix, coda, { body: I.VIOLIN, seed: 9, release: 1.2 }, { pan: 0.43, send: 0.35, gain: 0.85 });
  mix.add(plucked(seconds, 'harp', roll([midi('D3'), midi('A3'), midi('D4'), midi('F4'), midi('A4')], tempo.at(34 * 3), 0.5), { ring: 5 }), 0, { pan: 0.19, send: 0.35 });
  return mix.finish();
}

/** The deepwood: a wooden flute walks the theme over a bowed drone, with the harp dropping notes between phrases. */
export function themeWild() {
  const random = rng(202);
  const bars = 24;
  const tempo = new Tempo(62, { rit: [{ from: 20 * 3, to: 24 * 3, factor: 0.8 }] });
  const seconds = tempo.at(bars * 3) + 7;
  const mix = new Mix(seconds, 'forest', { wet: 0.34, seed: 22 });
  const drone = (name, from, to, vel, seed, bowBars = 8) => {
    const notes = [];
    for (let b = from; b < to; b += bowBars) {
      const e = Math.min(to, b + bowBars);
      notes.push({ t: tempo.at(b * 3), dur: tempo.at(e * 3) - tempo.at(b * 3), freq: hzOf(name), vel, slur: false });
    }
    bowed(mix, notes, { body: I.VIOL, seed, brightness: 0.25, vibDepth: 0.0006, attack: 1.2, release: 3 }, { pan: seed % 2 ? -0.35 : 0.35, send: 0.3 });
  };
  drone('D2', 0, 23, 0.42, 1);
  drone('A2', 0, 23, 0.3, 2, 6);
  drone('D3', 8, 23, 0.2, 3);
  const flute = [];
  const line = (text, fromBar, transpose) => flute.push(...timed(parse(text, 3, { from: fromBar * 3, transpose }), tempo, { random, vel: 0.62, humanize: 0.012 }));
  line(THEME.A, 2, 12);
  line(THEME.A2, 8, 12);
  line(THEME.B, 14, 0);
  line('D4:1 A4:2 | B4:1~ A4:1 G4:1 | F4:1 E4:1 C4:1 | D4:3~ | D4:3 |', 18, 12);
  // A breath of ornament: a quick upper-note cut before the first long note of each high phrase.
  const graced = [];
  for (const n of flute) {
    if (n.beats === 2 && n.midi >= midi('A5')) {
      graced.push({ ...n, dur: 0.07, freq: mtof(n.midi + 2), slur: false });
      graced.push({ ...n, t: n.t + 0.07, dur: n.dur - 0.07, slur: true });
    } else graced.push(n);
  }
  blown(mix, graced, { seed: 4, breath: 0.6 }, { pan: 0.16, send: 0.38, gain: 1 });
  const drops = [['A4', 1, 0], ['E5', 6, 0], ['A4', 6, 2], ['D5', 7, 1], ['F4', 12, 0], ['C5', 12, 2], ['D5', 13, 1], ['A4', 22, 0], ['D4', 22, 0], ['D5', 22, 2]];
  const harp = drops.map(([n, bar, beat]) => ({ t: tempo.at(bar * 3 + beat), freq: hzOf(n), vel: 0.42 + 0.1 * random() }));
  mix.add(plucked(seconds, 'harp', harp, { ring: 5 }), 0, { pan: -0.23, send: 0.45, gain: 0.95 });
  return mix.finish();
}

/** Night: a harp alone, in Aeolian, rubato; a low viol warms the second half. */
export function themeNight() {
  const random = rng(303);
  const tempo = new Tempo(56, { rubato: 0.045, random, rit: [{ from: 14 * 3, to: 18 * 3, factor: 0.75 }] });
  const seconds = tempo.at(18 * 3) + 8;
  const mix = new Mix(seconds, 'night', { wet: 0.4, seed: 33 });
  const notes = timed(parse(THEME_AEOLIAN, 3), tempo, { random, vel: 0.5, humanize: 0.01 });
  HARMONY_AEOLIAN.forEach((chord, bar) => {
    const root = rootOf(chord, midi('D2'));
    notes.push(...roll([root, ...tonesOf(chord, root + 7, 2)], tempo.at(bar * 3) - 0.03, 0.4, 0.05));
    if (bar % 2 === 1) notes.push({ t: tempo.at(bar * 3 + 2), freq: mtof(root + 7), vel: 0.28 });
  });
  notes.push(...roll([midi('D2'), midi('A2'), midi('D3'), midi('F3')], tempo.at(16 * 3), 0.42, 0.07));
  notes.push({ t: tempo.at(16 * 3 + 2), freq: hzOf('A4'), vel: 0.3 }, { t: tempo.at(17 * 3), freq: hzOf('D5'), vel: 0.34 });
  mix.add(plucked(seconds, 'harp', notes, { ring: 5.5, damping: (n) => (n.dur ? n.dur * 2 + 0.25 : 5.4) }), 0, { pan: 0.0, send: 0.42, gain: 1.2 });
  const pad = [{ t: tempo.at(8 * 3), dur: tempo.at(18 * 3) - tempo.at(8 * 3), freq: hzOf('D2'), vel: 0.26, slur: false }];
  bowed(mix, pad, { body: I.VIOL, seed: 6, brightness: 0.15, vibDepth: 0.0005, attack: 3, release: 4 }, { pan: -0.16, send: 0.35, gain: 0.8 });
  const pad2 = [{ t: tempo.at(12 * 3), dur: tempo.at(18 * 3) - tempo.at(12 * 3), freq: hzOf('A2'), vel: 0.18, slur: false }];
  bowed(mix, pad2, { body: I.VIOL, seed: 8, brightness: 0.15, vibDepth: 0.0005, attack: 3, release: 4 }, { pan: 0.23, send: 0.35, gain: 0.8 });
  return mix.finish().map((c) => body(c, [['highshelf', 2600, 0.7, -4]]));
}

/** The spring: a viol chorale on the theme; voices join, and the last chord turns to D major. */
export function themeSacred() {
  const random = rng(404);
  const tempo = new Tempo(46, { rit: [{ from: 13 * 3, to: 16 * 3, factor: 0.8 }] });
  const end = 15 * 3 + 9;
  const seconds = tempo.at(end) + 9;
  const mix = new Mix(seconds, 'hall', { wet: 0.42, seed: 44 });
  const S = THEME.A + THEME.A2 + THEME.B + 'D4:1 A4:2 | B4:1~ A4:1 G4:1 | F4:1 E4:1 C4:1 | D4:9 |';
  const A = 'A3:1 F4:2 | D4:3 | A3:3 | C4:3 | A3:1 F4:2 | E4:3 | C4:3 | A3:3 | C4:3 | G4:3 | E4:3 | E4:3 | A3:1 F4:2 | D4:3 | G3:3 | A3:9 |';
  const T = 'F3:3 | B3:3 | F3:3 | G3:3 | F3:3 | A3:3 | G3:3 | F3:3 | A3:3 | B3:3 | G3:3 | C4:3 | F3:3 | B3:3 | E3:3 | F#3:9 |';
  const B = 'D3:3 | G2:3 | D3:3 | C3:3 | D3:3 | A2:3 | C3:3 | D3:3 | F2:3 | G2:3 | E2:3 | A2:3 | D3:3 | G2:3 | C3:3 | D2:9 |';
  const lastBar = (s) => s.replace(/:9 \|$/, ':3 | r:3 | r:3 |');
  const part = (text) => timed(parse(lastBar(text), 3), tempo, { random, vel: 0.55, humanize: 0.008 }).map((n) => (n.beats === 3 && n.beat === 45 ? { ...n, dur: tempo.at(end) - tempo.at(45) } : n));
  const viol = { release: 1.2, attack: 0.18, vibDepth: 0.0022 };
  bowed(mix, part(S), { ...viol, body: I.VIOLIN, seed: 1, brightness: 0.35 }, { pan: 0.39, send: 0.42, gain: 0.95 });
  bowed(mix, part(A), { ...viol, body: I.VIOLA, seed: 2, brightness: 0.3 }, { pan: -0.31, send: 0.42, gain: 0.8 });
  bowed(mix, part(T), { ...viol, body: I.VIOLA, seed: 3, brightness: 0.28 }, { pan: 0.16, send: 0.42, gain: 0.8 });
  bowed(mix, part(B), { ...viol, body: I.VIOL, seed: 4, brightness: 0.25 }, { pan: -0.12, send: 0.4, gain: 0.85 });
  // Voices join from the fifth bar, doubling the inner parts; sopranos take the melody for the last phrase.
  const from = (notes, bar) => notes.filter((n) => n.beat >= bar * 3);
  sung(mix, from(part(A), 4), { vowel: 'o', female: true, seed: 5 }, { pan: -0.46, gain: 0.55 });
  sung(mix, from(part(T), 4), { vowel: 'o', seed: 6 }, { pan: 0.46, gain: 0.55 });
  sung(mix, from(part(B), 8), { vowel: 'u', seed: 7 }, { pan: 0.0, gain: 0.42 });
  sung(mix, from(part(S), 12), { vowel: 'a', female: true, seed: 8, vibDepth: 0.006 }, { pan: 0.08, gain: 0.4 });
  const bowl = (bar, vel, swell = 0) => mix.add(I.singingBowl(hzOf('D4'), { seconds: 10, vel, seed: bar + 1, swell }), tempo.at(bar * 3), { pan: 0.0, send: 0.5, gain: 0.8 });
  bowl(0, 0.8);
  bowl(8, 0.6);
  bowl(15, 0.75, 1.5);
  return mix.finish();
}

/* ------------------------------------------------------------------ danger and battle */

/** Something watches: a held low drone, a creeping semitone below, a heartbeat drum, a high trembling cluster. */
export function dangerLoop() {
  const tempo = new Tempo(72);
  const pass = tempo.at(24);
  return threePass(pass, 'night', 0.3, 55, (mix, at) => {
    const random = rng(505);
    const t = (beat) => at + tempo.at(beat);
    const drone = [0, 8, 16].map((b) => ({ t: t(b), dur: tempo.at(8), freq: hzOf('D2'), vel: 0.42, slur: false }));
    bowed(mix, drone, { body: I.VIOL, seed: 1, brightness: 0.3, vibDepth: 0.0006, attack: 0.6, release: 0.6 }, { pan: -0.16, send: 0.3 });
    const ost = timed(parse('D3:2~ Eb3:2 | D3:2~ C3:2 | D3:2~ Eb3:2 | D3:2~ C3:2 | D3:2~ Eb3:2 | D3:2~ C3:2 |', 4), tempo, { random, vel: 0.5, phrase: 0 })
      .map((n) => ({ ...n, t: n.t + at }));
    bowed(mix, ost, { body: I.VIOL, seed: 2, brightness: 0.35, vibDepth: 0.0015 }, { pan: 0.23, send: 0.3, gain: 0.9 });
    for (let bar = 0; bar < 6; bar++) {
      mix.add(I.drumHit({ f0: 68, vel: 0.55, mute: 0.5, decay: 0.45, strike: 0.2, seed: bar * 2 + 1 }), t(bar * 4), { pan: -0.23, send: 0.25 });
      mix.add(I.drumHit({ f0: 68, vel: 0.33, mute: 0.6, decay: 0.4, strike: 0.25, seed: bar * 2 + 2 }), t(bar * 4 + 0.42), { pan: -0.23, send: 0.25 });
    }
    mix.add(I.drumHit({ f0: 50, vel: 0.62, decay: 0.95, strike: 0.1, slap: 0.15, seed: 99 }), t(0), { pan: 0.0, send: 0.35 });
    for (const [name, pan, seed] of [['A4', 0.35, 3], ['Bb4', -0.35, 4]]) {
      const cluster = [0.12, 0.22, 0.32, 0.42].map((vel, k) => ({ t: t(8 + k * 4), dur: tempo.at(4), freq: hzOf(name), vel, slur: k > 0 }));
      bowed(mix, cluster, { body: I.VIOLIN, seed, brightness: 1, tremolo: 0.85, vibDepth: 0.002, release: 0.4 }, { pan, send: 0.35, gain: 0.7 });
    }
  });
}

/** Steel at the ford: a 6/8 drive of frame drums and war drum, a falling string ostinato, the theme hurried into a fight. */
export function battleLoop() {
  const tempo = new Tempo(98 * 3);
  const pass = tempo.at(16 * 6);
  return threePass(pass, 'room', 0.2, 66, (mix, at) => {
    const random = rng(606);
    const t = (eighth) => at + tempo.at(eighth);
    const pattern = [0.9, 0.35, 0.45, 0.75, 0.35, 0.5];
    for (let bar = 0; bar < 16; bar++) {
      pattern.forEach((vel, k) => {
        const soft = vel < 0.6;
        mix.add(I.drumHit({ f0: 92, vel: vel * (0.92 + 0.12 * random()), mute: soft ? 0.6 : 0.2, decay: 0.35, strike: soft ? 0.7 : 0.3, seed: bar * 6 + k + 1 }), t(bar * 6 + k), { pan: -0.46, send: 0.18 });
      });
      if (bar >= 8) {
        for (const k of [1, 2, 4, 5]) mix.add(I.drumHit({ f0: 140, vel: 0.3 + 0.1 * random(), mute: 0.5, decay: 0.25, strike: 0.8, seed: 500 + bar * 6 + k }), t(bar * 6 + k), { pan: 0.54, send: 0.18 });
      }
      if (bar % 2 === 0) mix.add(I.drumHit({ f0: 52, vel: 0.85, decay: 0.8, strike: 0.1, slap: 0.2, seed: 900 + bar }), t(bar * 6), { pan: 0.0, send: 0.25 });
    }
    mix.add(I.drumHit({ f0: 52, vel: 0.8, decay: 0.8, strike: 0.1, slap: 0.2, seed: 990 }), t(15 * 6 + 3), { pan: 0.0, send: 0.25 });
    const cycle = 'D3:1! D3:1. A2:1. D3:1! D3:1. A2:1. | C3:1! C3:1. G2:1. C3:1! C3:1. G2:1. | Bb2:1! Bb2:1. F2:1. Bb2:1! Bb2:1. F2:1. | A2:1! A2:1. E2:1. A2:1! A2:1. C#3:1. |';
    const ost = timed(parse(cycle.repeat(4), 6), tempo, { random, vel: 0.55, phrase: 0, humanize: 0.004 }).map((n) => ({ ...n, t: n.t + at }));
    bowed(mix, ost, { body: I.VIOL, seed: 1, brightness: 0.6, attack: 0.02, release: 0.08, vibDepth: 0 }, { pan: -0.16, send: 0.15, gain: 1 });
    const upper = timed(parse(cycle.repeat(2), 6, { from: 48, transpose: 12 }), tempo, { random, vel: 0.42, phrase: 0, humanize: 0.004 }).map((n) => ({ ...n, t: n.t + at }));
    bowed(mix, upper, { body: I.VIOLA, seed: 2, brightness: 0.6, attack: 0.02, release: 0.08, vibDepth: 0 }, { pan: 0.31, send: 0.15, gain: 0.75 });
    const tune = 'D5:3 A5:3 | Bb5:2 A5:1 G5:2 F5:1 | E5:2 D5:1 C#5:3 | D5:6 | F5:3 E5:3 | D5:2 C5:1 Bb4:2 A4:1 | G4:2 A4:1 Bb4:2 C#5:1 | D5:6 |';
    const melody = timed(parse(tune, 6, { from: 24 }), tempo, { random, vel: 0.66, phrase: 24, depth: 0.12 }).map((n) => ({ ...n, t: n.t + at }));
    bowed(mix, melody, { body: I.VIOLIN, seed: 3, brightness: 0.75, vibDepth: 0.004, attack: 0.04 }, { pan: 0.46, send: 0.22, gain: 0.9 });
    for (const [name, pan, seed] of [['D5', 0.3, 4], ['A5', -0.25, 5]]) {
      const swell = [0.25, 0.35, 0.45, 0.55].map((vel, k) => ({ t: t(72 + k * 6), dur: tempo.at(6), freq: hzOf(name), vel, slur: k > 0 }));
      bowed(mix, swell, { body: I.VIOLIN, seed, brightness: 0.9, tremolo: 0.9, tremoloRate: 13, vibDepth: 0.002, release: 0.15 }, { pan, send: 0.2, gain: 0.7 });
    }
  });
}

/* ------------------------------------------------------------------ stings */

/** A fight won: a drum roll, then the theme's rising fifth climbs to a held high D over D major. */
export function stingVictory() {
  const mix = new Mix(7, 'room', { wet: 0.3, seed: 71 });
  for (let k = 0; k < 12; k++) {
    const at = 0.9 * (1 - (1 - k / 12) ** 1.6);
    mix.add(I.drumHit({ f0: 92, vel: 0.3 + 0.5 * (k / 11), mute: 0.4, decay: 0.3, strike: 0.6, seed: k + 1 }), at, { pan: -0.31, send: 0.2 });
  }
  mix.add(I.drumHit({ f0: 52, vel: 0.85, decay: 0.9, strike: 0.1, slap: 0.2, seed: 50 }), 0.95, { send: 0.3 });
  const up = [['D4', 0.95, 0.3], ['A4', 1.25, 0.3], ['D5', 1.55, 3.2]].map(([n, t, d], k) => ({ t, dur: d, freq: hzOf(n), vel: 0.7, slur: k > 0 }));
  bowed(mix, up, { body: I.VIOLIN, seed: 1, brightness: 0.6, release: 1 }, { pan: 0.39, send: 0.3 });
  const low = [['D3', 0.95, 0.3], ['A3', 1.25, 0.3], ['D3', 1.55, 3.2]].map(([n, t, d], k) => ({ t, dur: d, freq: hzOf(n), vel: 0.55, slur: k > 0 }));
  bowed(mix, low, { body: I.VIOL, seed: 2, brightness: 0.4, release: 1 }, { pan: -0.31, send: 0.3 });
  mix.add(plucked(7, 'lute', roll([midi('D2'), midi('A2'), midi('D3'), midi('F#3'), midi('A3'), midi('D4')], 1.55, 0.6, 0.018)), 0, { pan: -0.46, send: 0.2 });
  mix.add(plucked(7, 'harp', roll([midi('D3'), midi('A3'), midi('D4'), midi('F#4'), midi('A4'), midi('D5')], 1.6, 0.5, 0.045), { ring: 5 }), 0, { pan: 0.23, send: 0.35 });
  return mix.finish();
}

/** A fall: one soft blow of the war drum, and the theme's descent slowed over a dark drone. */
export function stingFall() {
  const tempo = new Tempo(50);
  const mix = new Mix(tempo.at(6) + 6, 'night', { wet: 0.4, seed: 72 });
  mix.add(I.drumHit({ f0: 48, vel: 0.65, decay: 1.1, strike: 0.1, slap: 0.1, seed: 1 }), 0, { send: 0.35 });
  const line = timed(parse('A3:1 F3:1 E3:1 | D3:3 |', 3), tempo, { vel: 0.55, phrase: 0 });
  bowed(mix, line, { body: I.VIOL, seed: 1, brightness: 0.3, release: 2 }, { pan: 0.16, send: 0.4 });
  bowed(mix, [{ t: 0, dur: tempo.at(6), freq: hzOf('D2'), vel: 0.3, slur: false }], { body: I.VIOL, seed: 2, brightness: 0.15, attack: 0.8, release: 3, vibDepth: 0.0005 }, { pan: -0.16, send: 0.35 });
  mix.add(plucked(tempo.at(6) + 6, 'harp', roll([midi('D2'), midi('A2'), midi('F3')], tempo.at(3), 0.4, 0.08), { ring: 6 }), 0, { send: 0.45 });
  return mix.finish();
}

/** A step of the story: the theme's cadence on the lute, settling on D. */
export function stingQuest() {
  const tempo = new Tempo(76);
  const mix = new Mix(tempo.at(6) + 4.5, 'room', { wet: 0.3, seed: 73 });
  const notes = timed(parse('F4:1 E4:1 C4:1 | D4:3 |', 3), tempo, { vel: 0.6, phrase: 0 });
  notes.push({ t: 0, freq: hzOf('C3'), vel: 0.5 }, { t: tempo.at(3), freq: hzOf('D2'), vel: 0.55 }, { t: tempo.at(3) + 0.02, freq: hzOf('A2'), vel: 0.4 });
  mix.add(plucked(tempo.at(6) + 4.5, 'lute', notes, { ring: 3.5 }), 0, { pan: -0.23, send: 0.25, gain: 1.2 });
  mix.add(plucked(tempo.at(6) + 4.5, 'harp', roll([midi('D3'), midi('A3'), midi('D4'), midi('F4')], tempo.at(3) + 0.05, 0.38), { ring: 4 }), 0, { pan: 0.31, send: 0.35 });
  bowed(mix, [{ t: tempo.at(3), dur: tempo.at(3), freq: hzOf('A3'), vel: 0.3, slur: false }], { body: I.VIOLA, seed: 1, brightness: 0.3, attack: 0.4, release: 1.4 }, { pan: 0.46, send: 0.35 });
  return mix.finish();
}

/** Each region's first sight: the theme's opening in that region's voice. */
export function placeMotif(region) {
  const tempo = new Tempo(70);
  const len = tempo.at(9) + 4.5;
  if (region === 'coast') {
    const mix = new Mix(len, 'forest', { wet: 0.38, seed: 81 });
    const run = ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'A5'].map((n, k) => ({ t: k * 0.055, freq: hzOf(n), vel: 0.3 + 0.02 * k }));
    mix.add(plucked(len, 'harp', run, { ring: 4 }), 0, { pan: -0.31, send: 0.45 });
    blown(mix, timed(parse('D5:1 A5:2 | B5:1~ A5:2 | r:3 |', 3, { from: 0 }), tempo, { vel: 0.6, phrase: 0 }).map((n) => ({ ...n, t: n.t + 0.7 })), { seed: 1 }, { pan: 0.23 });
    bowed(mix, [{ t: 0.3, dur: len - 3, freq: hzOf('D3'), vel: 0.28, slur: false }], { body: I.VIOL, seed: 2, brightness: 0.2, attack: 1, release: 2.5, vibDepth: 0.0005 }, { pan: -0.16 });
    return mix.finish();
  }
  if (region === 'wood') {
    const mix = new Mix(len, 'forest', { wet: 0.4, seed: 82 });
    blown(mix, timed(parse('D4:1 A4:1 G4:1 | F4:1 E4:2 | r:3 |', 3), tempo, { vel: 0.66, phrase: 0, humanize: 0.01 }), { seed: 3, breath: 0.75 }, { pan: 0.16 });
    bowed(mix, [{ t: 0, dur: len - 3, freq: hzOf('D2'), vel: 0.3, slur: false }], { body: I.VIOL, seed: 4, brightness: 0.2, attack: 0.8, release: 2.5, vibDepth: 0.0005 }, { pan: -0.16 });
    mix.add(plucked(len, 'harp', [{ t: tempo.at(3), freq: hzOf('D3'), vel: 0.4 }, { t: tempo.at(5), freq: hzOf('A3'), vel: 0.3 }], { ring: 4 }), 0, { pan: -0.31, send: 0.45 });
    return mix.finish();
  }
  if (region === 'vale') {
    const mix = new Mix(len, 'room', { wet: 0.3, seed: 83 });
    const lute = [...arpeggio('Dm', 0, tempo, rng(9), { level: 0.45 }), ...arpeggio('G', 1, tempo, rng(10), { level: 0.42 }), { t: tempo.at(6), freq: hzOf('A2'), vel: 0.45 }];
    mix.add(plucked(len, 'lute', lute), 0, { pan: -0.39, send: 0.22, gain: 1.15 });
    bowed(mix, timed(parse('D4:1 A4:2 | B4:1~ A4:1 G4:1 | A4:3 |', 3), tempo, { vel: 0.6, phrase: 0 }), { body: I.VIOLIN, seed: 5, release: 1 }, { pan: 0.39, send: 0.3 });
    return mix.finish();
  }
  if (region === 'stone') {
    const mix = new Mix(len, 'night', { wet: 0.32, seed: 84 });
    bowed(mix, timed(parse('D3:1 A3:1 Bb3:1 | A3:3 | r:3 |', 3), tempo, { vel: 0.6, phrase: 0 }), { body: I.VIOL, seed: 6, brightness: 0.45, release: 1.5 }, { pan: 0.16, send: 0.3 });
    for (const [beat, vel] of [[0, 0.6], [3, 0.5]]) mix.add(I.drumHit({ f0: 70, vel, mute: 0.3, decay: 0.5, strike: 0.2, seed: beat + 1 }), tempo.at(beat), { pan: -0.31, send: 0.3 });
    mix.add(I.drumHit({ f0: 50, vel: 0.6, decay: 1, strike: 0.1, slap: 0.15, seed: 9 }), tempo.at(6), { send: 0.35 });
    return mix.finish();
  }
  if (region === 'sacred') {
    const mix = new Mix(len + 2, 'hall', { wet: 0.45, seed: 85 });
    const hold = (name, t, d, vel) => ({ t, dur: d, freq: hzOf(name), vel, slur: false });
    sung(mix, [hold('D3', 0, 5.5, 0.5)], { vowel: 'a', seed: 1 }, { pan: -0.31 });
    sung(mix, [hold('A3', 0.15, 5.4, 0.45)], { vowel: 'a', seed: 2 }, { pan: 0.31 });
    sung(mix, [hold('A4', 0.3, 5.2, 0.42)], { vowel: 'a', female: true, seed: 3 }, { pan: 0.08 });
    sung(mix, [hold('F#4', 2.4, 3.1, 0.4)], { vowel: 'a', female: true, seed: 4 }, { pan: -0.16 });
    mix.add(I.singingBowl(hzOf('D4'), { seconds: 8, vel: 0.7, seed: 5 }), 2.4, { send: 0.5, gain: 0.8 });
    return mix.finish();
  }
  // The lighthouse: high harp notes like light on water, and a long soft flute A.
  const mix = new Mix(len, 'forest', { wet: 0.42, seed: 86 });
  const notes = ['A5', 'D6', 'E6', 'A6', 'E6', 'D6'].map((n, k) => ({ t: k * 0.32, freq: hzOf(n), vel: 0.32 }));
  mix.add(plucked(len, 'harp', notes, { ring: 4 }), 0, { pan: 0.31, send: 0.5 });
  blown(mix, [{ t: 0.6, dur: 3.2, freq: hzOf('A5'), vel: 0.45, slur: false }], { seed: 7, breath: 0.7 }, { pan: -0.16 });
  return mix.finish();
}

/* ------------------------------------------------------------------ the inn's evening tunes */

/** A lute solo: melody on the upper courses, bass on the beat, the occasional chord tone between. */
function luteSolo(melody, harmony, beatsPerBar, tempo, { random, bassBeats = [0], inner = true, level = 0.6 }) {
  const parsed = parse(melody, beatsPerBar);
  // The fingers carry the tune; the thumb's bass sits beneath it, as on a real lute.
  const notes = timed(parsed, tempo, { random, vel: level * 1.15, humanize: 0.008, phrase: beatsPerBar * 4, depth: 0.12 });
  harmony.forEach((chord, bar) => {
    if (!chord) return;
    const root = rootOf(chord, midi('D2'));
    for (const b of bassBeats) notes.push({ t: tempo.at(bar * beatsPerBar + b) + gaussian(random) * 0.006, freq: mtof(b === 0 ? root : root + 7), vel: level * (b === 0 ? 0.55 : 0.42) });
    if (inner && bar % 2 === 1) notes.push({ t: tempo.at(bar * beatsPerBar + beatsPerBar / 2), freq: mtof(tonesOf(chord, root + 12, 1)[0]), vel: level * 0.32 });
  });
  const seconds = tempo.at(parsed.beats) + 4;
  return { seconds, notes };
}

function innTune(build) {
  const { seconds, notes } = build();
  const mix = new Mix(seconds, 'inn', { wet: 0.22, seed: 91 });
  mix.add(plucked(seconds, 'lute', notes, { ring: 2.6, damping: (n) => (n.dur ? n.dur + 0.18 : 2.4) }), 0, { send: 0.3, gain: 1.2 });
  const [L, R] = mix.finish();
  const mono = new Float32Array(L.length);
  for (let i = 0; i < mono.length; i++) mono[i] = 0.5 * (L[i] + R[i]);
  return [mono];
}

/** The Wanderer's Air: the theme as a lute solo, then varied. */
export function wanderersAir() {
  const random = rng(111);
  const tempo = new Tempo(84, { rit: [{ from: 29 * 3, to: 32 * 3, factor: 0.75 }] });
  return innTune(() => luteSolo(THEME_LINE + VARIATION, [...HARMONY, ...HARMONY], 3, tempo, { random, bassBeats: [0, 2] }));
}

/** Hearthsmoke: a jig in G Mixolydian, played twice through. */
export function hearthsmoke() {
  const random = rng(222);
  const A = 'G4:2 B4:1 D5:2 B4:1 | C5:2 A4:1 F4:2 A4:1 | G4:2 B4:1 D5:1 E5:1 D5:1 | C5:2 A4:1 G4:3 |' +
    'G4:2 B4:1 D5:2 G5:1 | F5:2 D5:1 C5:2 A4:1 | B4:1 C5:1 D5:1 C5:2 A4:1 | G4:3 G4:2 D4:1 |';
  const B = 'D5:2 E5:1 F5:2 D5:1 | C5:2 A4:1 F4:2 A4:1 | D5:2 E5:1 F5:2 G5:1 | A5:3 F5:3 |' +
    'G5:2 F5:1 D5:2 C5:1 | B4:2 G4:1 A4:2 F4:1 | G4:1 A4:1 B4:1 C5:2 A4:1 | G4:6 |';
  const hA = ['G', 'F', 'G', 'C', 'G', 'F', 'C', 'G'];
  const hB = ['Dm', 'F', 'Dm', 'F', 'G', 'G', 'C', 'G'];
  const tempo = new Tempo(104 * 3, { rit: [{ from: 31 * 6, to: 32 * 6, factor: 0.8 }] });
  return innTune(() => luteSolo(A + A + B + B, [...hA, ...hA, ...hB, ...hB], 6, tempo, { random, bassBeats: [0, 3], inner: false, level: 0.62 }));
}

/** Salt and Rope: a slow air in A Aeolian. */
export function saltAndRope() {
  const random = rng(333);
  const tune =
    'A4:1.5 B4:0.5 C5:1 E5:1 | D5:1.5 C5:0.5 B4:1 G4:1 | A4:1 E4:1 A4:1 B4:1 | C5:3 r:1 |' +
    'E5:1.5 D5:0.5 C5:1 A4:1 | G4:1.5 A4:0.5 B4:1 G4:1 | E4:1 G4:1 A4:1 B4:0.5 G4:0.5 | A4:3 r:1 |' +
    'C5:1.5 D5:0.5 E5:1 G5:1 | E5:1.5 D5:0.5 C5:1 A4:1 | B4:1 C5:1 D5:1 B4:1 | E5:3 r:1 |' +
    'A5:1.5 G5:0.5 E5:1 C5:1 | D5:1.5 C5:0.5 B4:1 G4:1 | A4:1 C5:1 B4:1 G4:1 | A4:4 |';
  const harmony = ['Am', 'G', 'Am', 'C', 'Am', 'G', 'Em', 'Am', 'C', 'Am', 'G', 'Em', 'Am', 'G', 'Am', 'Am'];
  const tempo = new Tempo(66, { rubato: 0.03, random, rit: [{ from: 14 * 4, to: 16 * 4, factor: 0.7 }] });
  return innTune(() => luteSolo(tune, harmony, 4, tempo, { random, bassBeats: [0, 2], level: 0.58 }));
}

/* ------------------------------------------------------------------ crafted sounds of the world */

export const CRAFTED_SOUNDS = {
  /** The town bell, cast on D (the score's own key): two strikes for the drought bell. */
  'bell.town': () => [1, 2].map((seed) => I.churchBell(hzOf('D4'), { seconds: 7, seed, vel: seed === 1 ? 1 : 0.92 })),
  /** The all-clear: three smaller bells rung high to low, A, F sharp, D. */
  'bell.peal': () => ['A5', 'F#5', 'D5'].map((n, k) => I.churchBell(hzOf(n), { seconds: 4.2, seed: 10 + k })),
  /** The shrine's wind chime: five tubes on the notes of the theme's mode. */
  chime: () => ['D5', 'E5', 'G5', 'A5', 'C6'].map((n, k) => I.chime(hzOf(n), { seconds: 3, seed: 20 + k })),
  /** Field crickets, a few individuals. */
  cricket: () => [[4500, 4], [4650, 3], [4800, 4], [4400, 5], [4900, 3], [4700, 4]].map(([carrier, pulses], k) => I.cricketChirp({ carrier, pulses, seed: 30 + k })),
  /** Bubbles rising in the spring. */
  bubble: () => [0.0018, 0.0022, 0.0026, 0.003, 0.0034, 0.0038, 0.0042, 0.005].map((radius, k) => I.bubble({ radius, seed: 40 + k })),
  /** A heartbeat, heard from inside. */
  heart: () => [1, 2].map((seed) => I.heartbeat({ seed: 50 + seed })),
  /** The spring answering the rite: a struck bowl, a second bowl rising beneath it, water stirring. */
  'rite.bowl': () => {
    const out = samples(7);
    addAt(out, I.singingBowl(hzOf('D4'), { seconds: 7, vel: 0.9, seed: 61 }), 0);
    addAt(out, I.singingBowl(hzOf('A4'), { seconds: 6.4, vel: 0.65, seed: 62, swell: 1.6 }), 0.6, 0.8);
    const random = rng(63);
    for (let k = 0; k < 18; k++) addAt(out, I.bubble({ radius: 0.0018 + 0.003 * random(), seed: 64 + k, vel: 0.5 + 0.4 * random() }), 0.4 + 2.6 * random() ** 1.4, 0.7);
    return [out];
  },
};

/* ------------------------------------------------------------------ helpers */

function noteName(m) {
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return `${names[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

/** The arranging helpers and the theme itself, for cues built from the same material (tools/teaser/score.mjs). */
export { SPACES, Mix, timed, phrases, bowed, blown, sung, plucked, arpeggio, roll, THEME, HARMONY, VARIATION, THEME_AEOLIAN, HARMONY_AEOLIAN };
