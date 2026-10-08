#!/usr/bin/env node
/**
 * The presentable teaser's sound, mixed to picture:
 * - the narration (tools/teaser/voice.mjs) at its places, with the rest of the mix stepping back while it speaks;
 * - a score composed for the cut with Tervain's own composer and theme (tools/world-audio/compose), on the teaser's
 *   beat: the theme at the golden hour, a triumph that deflates on "failed", an easy lute groove under the new
 *   features, a build that stops dead, and a harpsichord minuet for the thornback in its formal wear;
 * - every sound the game made while the film was shot (logged per frame by film.mjs), played from the game's own
 *   banks and placed by its distance and direction from the camera;
 * - each place's ambience bed;
 * - the record scratch, made from the minuet itself.
 *
 *   node tools/teaser/score.mjs [--stems]      after film.mjs; writes teaser-sound.wav (48 kHz float) to the output
 *                                              folder, and with --stems the music, effects and beds apart
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Biquad, SR, convolve, db, fadeEdges, hzOf, midi, mtof, panGains, rng, roomIR } from '../world-audio/compose/dsp.mjs';
import { writeWav } from '../world-audio/compose/index.mjs';
import * as I from '../world-audio/compose/instruments.mjs';
import { Tempo, parse, rootOf, tonesOf } from '../world-audio/compose/notation.mjs';
import { Mix, SPACES, THEME, blown, bowed, plucked, roll, sung, timed } from '../world-audio/compose/pieces.mjs';
import { OUT } from './film.mjs';
import { BEAT, FPS, GLINT, LENGTH, SCREENSHOTS, SHOTS, VOICE, shot } from './timeline.mjs';
import { VOICE_DIR } from './voice.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SECONDS = LENGTH + 2.5;
const N = Math.ceil(SECONDS * SR);
/** Seconds at a beat of the teaser. */
const at = (beat) => beat * BEAT;
const tempo = new Tempo(60 / BEAT);
const triplets = new Tempo((3 * 60) / BEAT);

/** Notes written in a meter, starting at a beat of the teaser. */
function line(text, meter, start, opts = {}, clock = tempo) {
  return timed(parse(text, meter, { transpose: opts.transpose ?? 0 }), clock, { phrase: 0, ...opts }).map((n) => ({ ...n, t: n.t + at(start) }));
}
const hold = (name, fromBeat, toBeat, vel) => ({ t: at(fromBeat), dur: at(toBeat) - at(fromBeat), freq: hzOf(name), vel, slur: false });

/** When the picture's events happen, read from the film's logs. */
function moment(id, test) {
  const s = shot(id);
  const log = JSON.parse(fs.readFileSync(path.join(OUT, `shot-${id}.json`), 'utf8')).log;
  const r = log.find(test);
  if (!r) throw new Error(`no such moment in ${id}`);
  return s.start + r.frame / FPS;
}
/** The thornback's blow lands on the hero (the freeze holds four frames later). */
const HURT = moment('payoff', (r) => r.player.state === 'hurt');
const CUT = shot('freeze').start;
/** The triumph stops dead on the narrator's "failed" (read from the take's word timings); "successfully" lands in the quiet. */
const MISSION = VOICE.find((v) => v.line === 'mission');
const DEFLATE = MISSION.words.find((w) => /^failed/i.test(w.text)).end + 0.03;
const SUCCESS = MISSION.words.at(-1).end;
/** The jump cut to the dressed thornback, and the glint of its monocle. */
const REVEAL = shot('reveal').start;
const SHINE = REVEAL + GLINT;
const BEATS = Object.fromEntries(SHOTS.map((s) => [s.id, s.beat]));

/* ------------------------------------------------------------------ the instruments the composer lacks */

/** A trailer braam: detuned saws on the notes, through a lowpass that blares open and slowly closes, with drive. */
function braam(seconds, names, { open = 2600, closed = 380, seed = 1, drive = 1.8, decay = 0.5 } = {}) {
  const n = Math.ceil(seconds * SR);
  const out = new Float32Array(n);
  const random = rng(seed);
  const blep = (t, dt) => {
    if (t < dt) { t /= dt; return t + t - t * t - 1; }
    if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
    return 0;
  };
  for (const name of names) {
    for (const cents of [-8, 0, 7]) {
      const dt = (hzOf(name) * 2 ** (cents / 1200)) / SR;
      let p = random();
      for (let i = 0; i < n; i++) {
        out[i] += (2 * p - 1 - blep(p, dt)) / (names.length * 1.7);
        p += dt;
        if (p >= 1) p -= 1;
      }
    }
  }
  const lp = new Biquad('lowpass', closed, 1.2), lp2 = new Biquad('lowpass', closed * 1.5, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (i % 32 === 0) {
      const f = closed + (open - closed) * Math.min(1, t / 0.09) * Math.exp(-Math.max(0, t - 0.09) / 0.7);
      lp.set('lowpass', f, 1.2);
      lp2.set('lowpass', f * 1.5, 0.7);
    }
    const env = Math.min(1, t / 0.025) * Math.exp(-t / (seconds * decay));
    out[i] = Math.tanh(drive * lp2.process(lp.process(out[i]))) * env;
  }
  return fadeEdges(out, 0.002, 0.25);
}

/** A rising riser: noise through a band that climbs, swelling to its end. */
function riser(seconds, { from = 300, to = 5000, seed = 1 } = {}) {
  const n = Math.ceil(seconds * SR);
  const out = new Float32Array(n);
  const random = rng(seed);
  const bp = new Biquad('bandpass', from, 2.2);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    if (i % 32 === 0) bp.set('bandpass', from * (to / from) ** (u * u), 2.2);
    out[i] = bp.process(random() * 2 - 1) * u ** 2.2 * 1.6;
  }
  return out;
}

/** A harp's sweep up the D Dorian scale, the way a scene changes in a fairy tale. */
const sweep = (fromName, count, t, vel = 0.34, gap = 0.045) => {
  const scale = [0, 2, 3, 5, 7, 9, 10];
  const base = midi(fromName);
  return Array.from({ length: count }, (_, k) => ({ t: t + k * gap, freq: mtof(base + 12 * Math.floor(k / 7) + scale[k % 7]), vel: vel * (0.8 + 0.4 * (k / count)) }));
};

/**
 * A harpsichord: each note a bright string plucked close to its end by a quill, an eight-foot choir with a softer
 * four-foot an octave up, through a thin, nasal body.
 */
function harpsichord(seconds, notes) {
  const stem = new Float32Array(Math.ceil(seconds * SR));
  notes.forEach((n, i) => {
    const len = Math.min(2.6, (n.dur ?? 1.2) + 0.9);
    for (const [ratio, vel, position] of [[1, 1, 0.07], [2, 0.32, 0.05]]) {
      const freq = n.freq * ratio;
      const t60 = Math.max(0.5, 2.4 - Math.log2(freq / 110) * 0.45);
      const buf = I.string(freq, len, { t60, bright: 0.96, position, vel: n.vel * vel, seed: 7 + i * 3 + ratio, damp: n.dur ? n.dur + 0.12 : null });
      const o = Math.round(n.t * SR);
      for (let k = 0; k < buf.length && o + k < stem.length; k++) stem[o + k] += buf[k];
    }
  });
  for (const [type, f, q, gain] of [['highpass', 90, 0.7, 0], ['peak', 1250, 1.1, 4], ['peak', 3200, 1.3, 3], ['lowshelf', 220, 0.7, -3], ['lowpass', 9500, 0.7, 0]]) new Biquad(type, f, q, gain).run(stem);
  return stem;
}

/** A tape stop: the music slows to a halt over `seconds`, its pitch sinking with it. */
function tapeStop(L, R, from, seconds) {
  const a = Math.round(from * SR), n = Math.round(seconds * SR);
  const srcL = L.slice(a, a + n * 2), srcR = R.slice(a, a + n * 2);
  let pos = 0;
  for (let i = 0; i < n && a + i < L.length; i++) {
    const u = i / n, speed = (1 - u) ** 1.6;
    const k = Math.floor(pos), f = pos - k;
    const g = 1 - u ** 3;
    L[a + i] = ((srcL[k] ?? 0) * (1 - f) + (srcL[k + 1] ?? 0) * f) * g;
    R[a + i] = ((srcR[k] ?? 0) * (1 - f) + (srcR[k + 1] ?? 0) * f) * g;
    pos += speed;
  }
  for (let i = a + n; i < L.length; i++) { L[i] = 0; R[i] = 0; }
}

/** The comment card's pop: a quick falling bloop with a click at its front. */
function pop(seed = 1) {
  const n = Math.round(0.11 * SR), out = new Float32Array(n);
  const random = rng(seed);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = 520 + 900 * Math.exp(-t / 0.018);
    phase += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(phase) * Math.exp(-t / 0.035) * 0.9 + (i < 48 ? (random() * 2 - 1) * (1 - i / 48) * 0.5 : 0);
  }
  return fadeEdges(out, 0.0005, 0.01);
}

/** The monocle's glint: a small high bell and a shimmer above it. */
function ting() {
  const bell = I.chime(hzOf('E7'), { seconds: 1.6, vel: 0.9, seed: 5 });
  const n = Math.round(0.9 * SR), out = new Float32Array(Math.max(bell.length, n));
  for (let i = 0; i < bell.length; i++) out[i] += bell[i];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] += (Math.sin(2 * Math.PI * 5274 * t) * 0.35 + Math.sin(2 * Math.PI * 7902 * t) * 0.2) * Math.exp(-t / 0.18) * Math.min(1, t / 0.004);
  }
  return out;
}


/* ------------------------------------------------------------------ the score */

function score() {
  const meadow = new Mix(SECONDS, 'forest', { wet: 0.32, seed: 501 });
  const triumph = new Mix(SECONDS, 'hall', { wet: 0.3, seed: 502 });
  const dread = new Mix(SECONDS, 'hall', { wet: 0.3, seed: 503 });
  const salon = new Mix(SECONDS, 'room', { wet: 0.2, seed: 504 });
  const coda = new Mix(SECONDS, 'room', { wet: 0.26, seed: 505 });
  const random = rng(77);

  // The golden hour and Lantern Point: the theme on the wooden flute over the harp's broken chords, in D Dorian; the
  // flute rests while the comment is read.
  const golden = BEATS.golden, proud = BEATS.proud;
  const harp = [];
  ['Dm', 'G', 'Dm', 'C', 'Dm', 'Am', 'C', 'Dm'].forEach((chord, k) => {
    const start = golden + 3 * k;
    const bass = rootOf(chord, midi('D2'));
    const up = tonesOf(chord, bass + 7, 3);
    [bass, up[0], up[1], up[2], up[1], up[0]].forEach((m, j) => {
      harp.push({ t: at(start + j * 0.5) + (random() - 0.5) * 0.01, freq: mtof(m), vel: 0.42 * (j === 0 ? 1.15 : 0.85) * (0.93 + 0.14 * random()) });
    });
  });
  harp.push(...sweep('D4', 9, Math.max(0, at(golden) - 0.02), 0.3, 0.04));
  meadow.add(plucked(SECONDS, 'harp', harp, { ring: 3 }), 0, { pan: -0.28, send: 0.35, gain: 1.05 });
  blown(meadow, line(THEME.A2, 3, golden, { transpose: 12, random, vel: 0.62, humanize: 0.008 }), { seed: 11, breath: 0.55 }, { pan: 0.18, send: 0.36, gain: 0.95 });
  bowed(meadow, [hold('D3', golden, proud, 0.22)], { body: I.VIOLA, seed: 14, brightness: 0.25, attack: 1, release: 0.6, vibDepth: 0.001 }, { pan: -0.1, send: 0.35, gain: 0.75 });

  // Mission failed successfully: a triumph in D major swells on the cut and deflates on "failed".
  triumph.add(I.drumHit({ f0: 36, vel: 1, decay: 1.6, strike: 0.05, slap: 0.4, seed: 21 }), at(proud), { gain: 1.4, send: 0.3 });
  triumph.add(I.drumHit({ f0: 55, vel: 0.9, decay: 1.0, strike: 0.15, slap: 0.3, seed: 22 }), at(proud) + 0.004, { gain: 0.9, send: 0.3 });
  triumph.add(braam(2.4, ['D1', 'D2', 'A2', 'F#3'], { seed: 23, open: 2400, decay: 0.6 }), at(proud), { gain: 0.32, send: 0.25 });
  triumph.add(I.churchBell(hzOf('D4'), { seconds: 4, vel: 0.85, seed: 24 }), at(proud), { gain: 0.35, pan: -0.1, send: 0.4 });
  for (const [name, female, seed, pan] of [['D3', false, 25, -0.4], ['A3', false, 26, 0.4], ['F#4', true, 27, -0.15], ['A4', true, 28, 0.15], ['D5', true, 29, 0]]) {
    sung(triumph, [hold(name, proud, proud + 4, 0.46)], { vowel: 'a', female, seed, vibDepth: 0.005 }, { pan, gain: 0.45 });
  }
  for (const [name, body, seed, pan] of [['D2', I.VIOL, 30, -0.1], ['A3', I.VIOLA, 31, -0.3], ['F#4', I.VIOLA, 32, 0.3], ['D6', I.VIOLIN, 33, 0.38], ['A5', I.VIOLIN, 34, -0.38]]) {
    bowed(triumph, [hold(name, proud, proud + 4, 0.5)], { body, seed, brightness: 0.55, attack: 0.05, release: 0.4, vibDepth: 0.003, tremolo: name >= 'A5' ? 0.6 : 0 }, { pan, send: 0.32, gain: 0.8 });
  }
  triumph.add(plucked(SECONDS, 'harp', roll([midi('D3'), midi('A3'), midi('D4'), midi('F#4'), midi('A4'), midi('D5')], at(proud), 0.5, 0.03), { ring: 4 }), 0, { pan: 0.25, send: 0.4 });

  // Since then: an easy lute groove in four, D major, under the narration from the grass to the bench.
  const montage = new Mix(SECONDS, 'room', { wet: 0.22, seed: 506 });
  const m0 = BEATS.grass, m1 = BEATS.lurk;
  const lute = [];
  ['D', 'A', 'Em', 'G', 'D'].forEach((chord, k) => {
    const root = rootOf(chord, midi('D3'));
    const third = chord.endsWith('m') ? 3 : 4;
    [0, 7, 12, 12 + third, 19, 12 + third, 12, 7].forEach((step, j) => {
      const b = m0 + 4 * k + j * 0.5;
      if (b < m1) lute.push({ t: at(b) + (random() - 0.5) * 0.008, freq: mtof(root + step), vel: 0.34 * (j === 0 ? 1.2 : j % 2 ? 0.8 : 0.95) * (0.92 + 0.16 * random()) });
    });
  });
  montage.add(plucked(SECONDS, 'lute', lute, { ring: 1.6 }), 0, { pan: 0.12, send: 0.25, gain: 1 });
  bowed(montage, ['D2', 'A1', 'E2', 'G1', 'D2'].map((n, k) => hold(n, m0 + 4 * k, Math.min(m1, m0 + 4 * k + 4), 0.3)).filter((n) => n.dur > 0),
    { body: I.VIOL, seed: 60, brightness: 0.3, attack: 0.3, release: 0.3, vibDepth: 0.001 }, { pan: -0.15, send: 0.3, gain: 0.6 });

  // The thornback as it was: a low drone, a slow drum that hurries, a rising hiss, and nothing on the cut.
  const lurk = BEATS.lurk, end = lurk + shot('lurk').beats;
  bowed(dread, [hold('D2', lurk, end, 0.4), hold('A1', lurk, end, 0.36)], { body: I.VIOL, seed: 40, brightness: 0.3, attack: 0.6, release: 0.05, vibDepth: 0.0005 }, { send: 0.3, gain: 0.9 });
  // A drum every two beats while the comment is read, hurrying through the last two beats into the cut.
  const drums = [];
  for (let b = lurk + 0.5; b < end - 2.5; b += 2) drums.push([b, 0.7 + 0.05 * Math.min(1, drums.length)]);
  drums.push([end - 2, 0.8], [end - 1, 0.85], [end - 0.5, 0.9], [end - 0.25, 0.95]);
  for (const [b, vel] of drums) {
    dread.add(I.drumHit({ f0: 48, vel, decay: 0.8, strike: 0.1, slap: 0.25, seed: 41 + Math.round(b * 4) }), at(b), { send: 0.28, gain: 1.15 });
  }
  dread.add(braam(2.2, ['D1', 'D2', 'Ab2'], { seed: 42, open: 1500, decay: 0.7 }), at(end - 2.5), { gain: 0.24, send: 0.25 });
  dread.add(riser(at(end) - at(end - 4), { seed: 43, from: 250, to: 6000 }), at(end - 4), { gain: 0.15, send: 0.2 });
  bowed(dread, ['D5', 'Eb5', 'E5', 'F5'].map((n, k) => ({ ...hold(n, end - 4 + k, end - 3 + k, 0.28 + 0.05 * k), slur: k > 0 })), { body: I.VIOLIN, seed: 44, tremolo: 0.9, tremoloRate: 13, brightness: 0.75, attack: 0.05, release: 0.05 }, { pan: 0.3, send: 0.3, gain: 0.7 });

  // The reveal: a minuet, as if it had always been playing in this salon of a forest. D major, three-four.
  const reveal = BEATS.reveal;
  const right = line('D5:1 A4:0.5 B4:0.5 C#5:0.5 D5:0.5 | E5:1 A4:1 A4:1 | F#5:1 G5:0.5 F#5:0.5 E5:0.5 D5:0.5 | C#5:1 E5:0.5 D5:0.5 C#5:0.5 B4:0.5 | A4:1 B4:0.5 C#5:0.5 D5:0.5 E5:0.5 |', 3, reveal, { random, vel: 0.62, humanize: 0.004 });
  const left = line('D3:1 F#3:1 A3:1 | C#3:1 A2:1 E3:1 | D3:1 A2:1 F#2:1 | A2:1 C#3:1 E3:1 | A2:1 G3:1 E3:1 |', 3, reveal, { random, vel: 0.5, humanize: 0.004 });
  salon.add(harpsichord(SECONDS, [...right, ...left]), 0, { pan: 0.05, send: 0.22, gain: 1.35 });
  bowed(salon, line('D3:3 | A2:3 | D3:3 | A2:3 | A2:3 |', 3, reveal, { random, vel: 0.36 }), { body: I.VIOL, seed: 50, brightness: 0.3, attack: 0.05, release: 0.2, vibDepth: 0.001 }, { pan: -0.25, send: 0.25, gain: 0.55 });

  // The title: a harp roll and a small bell as it appears, then the minuet's polite cadence under the last line.
  const title = BEATS.title;
  coda.add(plucked(SECONDS, 'harp', roll([midi('D2'), midi('A2'), midi('D3'), midi('F#3'), midi('A3'), midi('D4'), midi('F#4'), midi('A4')], at(title) + 0.02, 0.42, 0.035), { ring: 5 }), 0, { pan: -0.2, send: 0.4, gain: 0.9 });
  coda.add(I.chime(hzOf('A5'), { seconds: 3, vel: 0.6, seed: 61 }), at(title) + 0.05, { pan: 0.3, send: 0.5, gain: 0.4 });
  const cadence = line('G5:1 E5:0.5 C#5:0.5 A4:1 | D5:2 r:1 |', 3, title + 1, { random, vel: 0.55 });
  const cadenceBass = line('A2:1 C#3:1 E3:1 | D2:2 r:1 |', 3, title + 1, { random, vel: 0.45 });
  coda.add(harpsichord(SECONDS, [...cadence, ...cadenceBass]), 0, { pan: 0.05, send: 0.25, gain: 1.2 });

  // The meadow's theme stops where the strand's triumph starts; the groove where the thornback's build starts.
  const [gl, gr] = meadow.finish();
  gate([gl, gr], at(proud) - 0.004, 0.03);
  const [ul, ur] = montage.finish();
  gate([ul, ur], at(m1) - 0.004, 0.12);
  const parts = [[gl, gr], [ul, ur], coda.finish()];
  const [tl, tr] = triumph.finish();
  tapeStop(tl, tr, DEFLATE - 0.02, 0.42);
  const [dl, dr] = dread.finish();
  // The build stops dead on the jump cut, reverb and all.
  gate([dl, dr], REVEAL - 0.004, 0.004);
  const [ml, mr] = salon.finish();
  return { parts: [...parts, [tl, tr], [dl, dr]], minuet: [ml, mr] };
}

/** Silence from a moment on, after a short fade. */
function gate(chans, from, fade) {
  const a = Math.round(from * SR), f = Math.max(1, Math.round(fade * SR));
  for (const c of chans) {
    for (let i = a; i < c.length; i++) c[i] *= i < a + f ? 0.5 + 0.5 * Math.cos((Math.PI * (i - a)) / f) : 0;
  }
}

/**
 * The record scratch, made from the music it interrupts: a hand drags the record back, forward and back, the
 * stylus hissing with the speed; then nothing.
 */
function scratch(L, R, cut) {
  const strokes = [[0.075, -0.16], [0.06, 0.11], [0.1, -0.13], [0.07, 0.035]];
  const total = strokes.reduce((s, [d]) => s + d, 0);
  const n = Math.round(total * SR);
  const outL = new Float32Array(n), outR = new Float32Array(n);
  const random = rng(91);
  const hiss = new Biquad('bandpass', 2600, 0.9), tone = new Biquad('lowpass', 4000, 0.7), tone2 = new Biquad('lowpass', 4000, 0.7);
  const read = (buf, x) => {
    const i = Math.floor(x), u = x - i;
    const a = buf[i - 1] ?? 0, b = buf[i] ?? 0, c = buf[i + 1] ?? 0, d = buf[i + 2] ?? 0;
    return b + 0.5 * u * (c - a + u * (2 * a - 5 * b + 4 * c - d + u * (3 * (b - c) + d - a)));
  };
  let pos = cut * SR, i = 0;
  for (const [dur, move] of strokes) {
    const m = Math.round(dur * SR);
    for (let k = 0; k < m && i < n; k++, i++) {
      // Each stroke speeds up and slows down like a hand: the speed is a raised sine over the stroke.
      const v = ((move / dur) * (1 - Math.cos((2 * Math.PI * k) / m))) / 1;
      pos += v;
      const speed = Math.abs(v);
      if (k % 32 === 0) {
        const f = 600 + 5200 * Math.min(1, speed / 2.5);
        tone.set('lowpass', f, 0.8);
        tone2.set('lowpass', f, 0.8);
      }
      const g = Math.min(1, speed * 1.4);
      const h = hiss.process(random() * 2 - 1) * 0.05 * Math.min(1, speed);
      outL[i] = tone.process(read(L, pos)) * g + h;
      outR[i] = tone2.process(read(R, pos)) * g + h;
    }
  }
  return [fadeEdges(outL, 0.002, 0.02), fadeEdges(outR, 0.002, 0.02)];
}

/* ------------------------------------------------------------------ the game's own sounds */

const MANIFEST = (() => {
  const text = fs.readFileSync(path.join(ROOT, 'src/presentation/sound/worldAudioManifest.ts'), 'utf8');
  return JSON.parse(text.slice(text.indexOf('{', text.indexOf('export const WORLD_AUDIO')), text.lastIndexOf('} as const;') + 1));
})();

const decoded = new Map();
function decode(file, channels) {
  const key = `${file}:${channels}`;
  if (!decoded.has(key)) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(ROOT, 'public', MANIFEST.base, `${file}.ogg`), '-f', 'f32le', '-ac', String(channels), '-ar', String(SR), 'pipe:1'], { maxBuffer: 1 << 28 });
    if (r.status !== 0) throw new Error(`could not decode ${file}: ${r.stderr}`);
    const all = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
    const chans = Array.from({ length: channels }, (_, c) => {
      const out = new Float32Array(all.length / channels);
      for (let i = 0; i < out.length; i++) out[i] = all[i * channels + c];
      return out;
    });
    decoded.set(key, chans);
  }
  return decoded.get(key);
}

function clip(id, take, from, to) {
  for (const bank of Object.values(MANIFEST.banks)) {
    const variants = bank.clips[id];
    if (!variants) continue;
    const [offset, length] = variants[Math.min(variants.length - 1, Math.max(0, take ?? 0))];
    const a = Math.min(length, Math.max(0, from ?? 0)), b = Math.min(length, to ?? length);
    const [mono] = decode(bank.file, 1);
    return mono.slice(Math.round((offset + a) * SR), Math.round((offset + b) * SR));
  }
  throw new Error(`no clip ${id}`);
}

function resample(buf, rate) {
  if (Math.abs(rate - 1) < 1e-4) return buf;
  const out = new Float32Array(Math.floor(buf.length / rate));
  for (let i = 0; i < out.length; i++) {
    const x = i * rate, k = Math.floor(x), u = x - k;
    out[i] = (buf[k] ?? 0) * (1 - u) + (buf[k + 1] ?? 0) * u;
  }
  return out;
}

/** Bus levels as the game's default settings have them. */
const BUS = { effects: 0.8, ambience: 0.7, dialogue: 0.8 };
/**
 * A teaser's mix is not the game's: the action comes forward (feet, blows, the quill) and the daytime crickets step
 * back. Linear gains on top of the game's own.
 */
const TRIM = {
  cricket: 0.4, 'step.dirt': 2.0, 'step.gravel': 2.0, 'step.grass': 2.2, 'step.sand': 2.0, 'step.run': 2,
  swing: 1.5, 'swing.heavy': 1.5, 'hit.flesh': 1.8, 'voice.hurt': 1.5, 'hero.hurt': 1.5,
  'beast.growl': 1.5, 'beast.attack': 1.4, 'beast.hurt': 1.4, 'work.quill': 2.6,
};
/**
 * Sounds the world made that the cut leaves out: the town bell strikes twice early in every shot, over the first
 * caption and the cards, and the stonecutter's distant chisel taps against the dread and the minuet in the cut.
 */
const MUTE = {
  golden: ['bell.town'], vista: ['bell.town'], proud: ['bell.town'], grass: ['bell.town'], swim: ['bell.town'], bench: ['bell.town'],
  lurk: ['bell.town', 'work.chisel'], reveal: ['bell.town', 'work.chisel'], payoff: ['bell.town', 'work.chisel'],
};
/** The player's own cries, as the game plays them now. */
const HERO_VOICE = { 'voice.hurt': 'hero.hurt', 'voice.death': 'hero.death', 'voice.breath': 'hero.breath' };
/** Sounds just before a cut are kept (a growl that leads into its shot); earlier ones belong to the setup. */
const LEAD_IN = 0.15;
const ADDED = [];
function effects() {
  const L = new Float32Array(N), R = new Float32Array(N), send = new Float32Array(N);
  const random = rng(31);
  for (const s of SHOTS) {
    if (s.scene !== 'world') continue;
    const sl = new Float32Array(N), sr = new Float32Array(N), ss = new Float32Array(N);
    const { log } = JSON.parse(fs.readFileSync(path.join(OUT, `shot-${s.id}.json`), 'utf8'));
    for (const r of log) {
      for (const c of r.cues) {
        if (!c.played || MUTE[s.id]?.includes(c.clip)) continue;
        const t = s.start + r.frame / FPS + c.delay;
        if (t < s.start - LEAD_IN) continue;
        // The hero's own cries are now his designed voice (A53); the film logged the generic take's name.
        const name = !c.at && HERO_VOICE[c.clip] ? HERO_VOICE[c.clip] : c.clip;
        let buf = clip(name, c.variant, c.from, c.to);
        buf = resample(buf, c.rate * (1 + (random() * 2 - 1) * c.pitch));
        let gain = c.gain * c.scale * (0.92 + 0.16 * random()) * BUS[c.bus] * (TRIM[c.clip] ?? 1);
        let pan = 0, distance = 0;
        if (c.at) {
          const cam = r.camera;
          const dx = c.at.x - cam.x, dy = c.at.y - cam.y, dz = c.at.z - cam.z;
          distance = Math.hypot(dx, dy, dz);
          gain *= c.ref / (c.ref + Math.max(distance, c.ref) - c.ref);
          // Right of the camera is forward × up.
          const rx = -cam.fz, rz = cam.fx, rl = Math.hypot(rx, rz) || 1;
          pan = Math.max(-1, Math.min(1, (dx * rx + dz * rz) / (rl * Math.max(1e-3, distance))));
          if (distance > 12) buf = new Biquad('lowpass', Math.max(1400, 18000 * Math.exp(-(distance - 12) / 40)), 1).run(Float32Array.from(buf));
        }
        const [gl, gr] = panGains(pan);
        const o = Math.round(t * SR);
        const sendLevel = Math.min(1, c.reverb + (c.at ? Math.min(0.35, distance / 120) : 0));
        for (let i = 0; i < buf.length && o + i < N; i++) {
          if (o + i < 0) continue;
          const v = buf[i] * gain;
          sl[o + i] += v * gl;
          sr[o + i] += v * gr;
          ss[o + i] += v * sendLevel;
        }
      }
    }
    for (const [id, t, name, take, gain, pan] of ADDED) {
      if (id !== s.id) continue;
      const buf = new Biquad('lowpass', 5000, 0.7).run(clip(name, take));
      const [gl, gr] = panGains(pan);
      const o = Math.round((s.start + t) * SR);
      for (let i = 0; i < buf.length && o + i < N; i++) {
        sl[o + i] += buf[i] * gain * BUS.ambience * gl;
        sr[o + i] += buf[i] * gain * BUS.ambience * gr;
        ss[o + i] += buf[i] * gain * BUS.ambience * 0.3;
      }
    }
    // Each shot's sounds end with its picture, after a breath.
    const end = s.start + s.seconds;
    gate([sl, sr, ss], end, 0.06);
    for (let i = 0; i < N; i++) {
      L[i] += sl[i];
      R[i] += sr[i];
      send[i] += ss[i];
    }
  }
  const [il, ir] = roomIR({ ...SPACES.forest, seed: 601 });
  const wl = convolve(send, il), wr = convolve(send, ir);
  for (let i = 0; i < N; i++) {
    L[i] += wl[i] * 0.22;
    R[i] += wr[i] * 0.22;
  }
  // The freeze is the world stopped: not even the blow's echo carries into it.
  silence([L, R], CUT, shot('title').start, 0.03);
  return [L, R];
}

/** Silence over a span, with short fades at both ends. */
function silence(chans, from, to, fade) {
  const a = Math.round(from * SR), b = Math.round(to * SR), f = Math.max(1, Math.round(fade * SR));
  for (const c of chans) {
    for (let i = Math.max(0, a); i < Math.min(c.length, b); i++) {
      const out = Math.min(1, (i - a) / f), back = Math.min(1, (b - i) / f);
      c[i] *= 1 - Math.min(out, back);
    }
  }
}

/** The master's tone: no sub-sonic rumble, a little less boom, and presence for phone speakers. */
function eq(L, R) {
  for (const c of [L, R]) {
    for (const [type, f, q, gain] of [['highpass', 32, 0.7, 0], ['lowshelf', 75, 0.7, -3], ['peak', 3000, 0.8, 2.5], ['highshelf', 9000, 0.7, 2]]) new Biquad(type, f, q, gain).run(c);
  }
}


/* ------------------------------------------------------------------ the places' ambience */

/** Each shot's beds: a loop and its level (RMS, dBFS). */
const BEDS = {
  golden: [['meadow_day', -30], ['brook', -34]],
  vista: [['sea_far', -27], ['cliff_wind', -33]],
  proud: [['sea', -21], ['surf', -30]],
  grass: [['meadow_day', -28], ['forest_day', -36]],
  swim: [['lap', -24], ['sea', -28]],
  bench: [['brook', -25], ['village_day', -32]],
  lurk: [['cut', -32]],
  reveal: [['cut', -36]],
  payoff: [['cut', -33]],
  title: [['cliff_wind', -37], ['fire', -35]],
};
function beds() {
  const L = new Float32Array(N), R = new Float32Array(N);
  for (const s of SHOTS) {
    for (const [id, level] of BEDS[s.id] ?? []) {
      const [a, b] = decode(MANIFEST.loops[id].file, 2);
      let e = 0;
      for (let i = 0; i < a.length; i++) e += a[i] * a[i] + b[i] * b[i];
      const g = db(level) / Math.sqrt(e / (2 * a.length) || 1e-12);
      // A bed runs a little past both cuts, and fades across them.
      const from = Math.round(Math.max(0, s.start - 0.04) * SR), to = Math.min(N, Math.round((s.start + s.seconds + 0.04) * SR));
      const fade = Math.round(0.08 * SR);
      const offset = Math.round(s.start * 7919) % a.length;
      const bl = new Float32Array(to - from), br = new Float32Array(to - from);
      for (let i = from; i < to; i++) {
        const w = Math.min(1, (i - from) / fade, (to - i) / fade);
        const k = (offset + i - from) % a.length;
        bl[i - from] = a[k] * g * w;
        br[i - from] = b[k] * g * w;
      }
      // A bed is a background: no rumble under the score, and its odd loud knock (a hammer, a door) held to 12 dB
      // over its body.
      for (const c of [bl, br]) new Biquad('highpass', 90, 0.7).run(c);
      limit(bl, br, db(level + 12), { release: 0.12 });
      for (let i = from; i < to; i++) {
        L[i] += bl[i - from];
        R[i] += br[i - from];
      }
    }
  }
  return [L, R];
}

/**
 * A look-ahead peak limiter: the gain each sample needs, held over the look-ahead and ramped in across it (so it is
 * already down when the peak arrives), then let back up slowly.
 */
function limit(L, R, ceiling, { lookahead = 0.005, release = 0.08 } = {}) {
  const n = L.length, la = Math.max(1, Math.round(lookahead * SR));
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // Between samples the wave can rise above both: estimate that from the neighbours.
    const p = Math.max(Math.abs(L[i]), Math.abs(R[i]), Math.abs(1.5 * (L[i] + (L[i + 1] ?? 0)) / 2 - 0.25 * ((L[i - 1] ?? 0) + (L[i + 2] ?? 0))),
      Math.abs(1.5 * (R[i] + (R[i + 1] ?? 0)) / 2 - 0.25 * ((R[i - 1] ?? 0) + (R[i + 2] ?? 0))));
    need[i] = p > ceiling ? ceiling / p : 1;
  }
  // The smallest gain needed over the coming look-ahead (a monotonic queue), then its running mean across the
  // look-ahead: a ramp that reaches each peak's gain by the time the peak is played.
  const ahead = new Float32Array(n);
  const q = new Int32Array(n);
  let head = 0, tail = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (tail > head && need[q[tail - 1]] >= need[i]) tail--;
    q[tail++] = i;
    while (q[head] > i + la) head++;
    ahead[i] = need[q[head]];
  }
  const rel = Math.exp(-1 / (release * SR));
  // The window starts full of unity gain.
  let sum = la, g = 1;
  for (let i = 0; i < n; i++) {
    sum += ahead[i] - (i >= la ? ahead[i - la] : 1);
    const target = sum / la;
    g = target < g ? target : target + (g - target) * rel;
    L[i] *= g;
    R[i] *= g;
  }
}

/** A gentle bus compressor (peak-sensing, soft knee), to hold a trailer's hits and its quiet in one frame. */
function compress(L, R, { threshold = -18, ratio = 2.2, knee = 8, attack = 0.012, release = 0.2 } = {}) {
  const aA = Math.exp(-1 / (attack * SR)), aR = Math.exp(-1 / (release * SR));
  let env = 0;
  for (let i = 0; i < L.length; i++) {
    const level = 20 * Math.log10(Math.max(Math.abs(L[i]), Math.abs(R[i])) + 1e-9);
    const over = level - threshold;
    const gr = over <= -knee / 2 ? 0 : over < knee / 2 ? ((1 / ratio - 1) * (over + knee / 2) ** 2) / (2 * knee) : (1 / ratio - 1) * over;
    env = gr < env ? aA * env + (1 - aA) * gr : aR * env + (1 - aR) * gr;
    const g = 10 ** (env / 20);
    L[i] *= g;
    R[i] *= g;
  }
}

/** Integrated loudness (EBU R128) and true peak of a stereo signal, measured by ffmpeg. */
function loudness(L, R) {
  const file = path.join(OUT, 'measure.wav');
  writeWav(file, [L, R]);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  fs.rmSync(file, { force: true });
  const j = JSON.parse(r.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/)[0]);
  return { lufs: Number(j.input_i), tp: Number(j.input_tp) };
}

/* ------------------------------------------------------------------ the narration */

/** The narrator's takes at their places in the teaser, mono in the middle, dry. */
function narration() {
  const out = new Float32Array(N);
  const takes = VOICE.map((v) => {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(VOICE_DIR, `${v.line}.mp3`), '-f', 'f32le', '-ac', '1', '-ar', String(SR), 'pipe:1'], { maxBuffer: 1 << 26 });
    if (r.status !== 0) throw new Error(`could not decode the ${v.line} take: ${r.stderr}`);
    const take = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
    new Biquad('highpass', 70, 0.7).run(take);
    return { v, take, lufs: loudness(take, take).lufs };
  });
  // The takes come back within a few dB of each other: bring each gently towards the middle one.
  const middle = takes.map((t) => t.lufs).sort((a, b) => a - b)[Math.floor(takes.length / 2)];
  for (const { v, take, lufs } of takes) {
    const level = db(Math.max(-2.5, Math.min(2.5, middle - lufs)));
    const o = Math.round(v.at * SR);
    for (let i = 0; i < take.length && o + i < N; i++) out[o + i] += take[i] * level;
  }
  return out;
}

/**
 * While the narrator speaks: 1 from just before each word to a little after it, so the gaps between words stay
 * under; closing in 80 ms and opening again over 400 ms.
 */
function speaking() {
  const on = new Uint8Array(N);
  for (const v of VOICE) {
    for (const w of v.words) {
      for (let i = Math.max(0, Math.round((w.start - 0.15) * SR)); i < Math.min(N, Math.round((w.end + 0.3) * SR)); i++) on[i] = 1;
    }
  }
  const out = new Float32Array(N), close = 1 / (0.08 * SR), open = 1 / (0.4 * SR);
  for (let i = 0, e = 0; i < N; i++) {
    e = on[i] ? Math.min(1, e + close) : Math.max(0, e - open);
    out[i] = e;
  }
  return out;
}

/* ------------------------------------------------------------------ mix and master */

const { parts, minuet } = score();
const [nl, nr] = minuet;
// The scratch is cut from the minuet at the freeze; the minuet stops there.
const [sl, sr] = scratch(nl, nr, CUT);
gate([nl, nr], CUT, 0.004);
const music = [new Float32Array(N), new Float32Array(N)];
for (const [l, r] of [...parts, [nl, nr]]) {
  for (let i = 0; i < N; i++) {
    music[0][i] += l[i] ?? 0;
    music[1][i] += r[i] ?? 0;
  }
}
const fx = effects();
const bed = beds();
const extra = [new Float32Array(N), new Float32Array(N)];
const put = (buf, t, gain, pan = 0) => {
  const [gl, gr] = panGains(pan), o = Math.round(t * SR);
  for (let i = 0; i < buf.length && o + i < N; i++) {
    extra[0][o + i] += buf[i] * gain * gl;
    extra[1][o + i] += buf[i] * gain * gr;
  }
};
// The screenshots pop into their corner; the monocle glints; the freeze scratches.
for (const c of SCREENSHOTS) put(pop(Math.round(c.from * 10)), c.from, 0.5, -0.35);
put(ting(), SHINE, 0.42, 0.25);
const o = Math.round(CUT * SR);
for (let i = 0; i < sl.length && o + i < N; i++) {
  extra[0][o + i] += sl[i] * 1.1;
  extra[1][o + i] += sr[i] * 1.1;
}
// After "successfully": the sea, and one cricket.
for (const [dt, seed, pan] of [[0.3, 1, 0.35], [0.7, 2, 0.35]]) put(I.cricketChirp({ carrier: 4600, pulses: 4, seed }), SUCCESS + dt, 0.22, pan);

const LEVEL = { music: 1, effects: 1.5, beds: 1, extra: 1, voice: 1.8 };
/** How far each part steps back while the narrator speaks (linear gain left under the voice). */
const UNDER = { music: db(-11), effects: db(-4), beds: db(-10) };
const voice = narration();
const talk = speaking();
const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const k = talk[i], under = (g) => 1 - (1 - g) * k;
  const m = LEVEL.music * under(UNDER.music), f = LEVEL.effects * under(UNDER.effects), b = LEVEL.beds * under(UNDER.beds);
  L[i] = music[0][i] * m + fx[0][i] * f + bed[0][i] * b + extra[0][i] * LEVEL.extra;
  R[i] = music[1][i] * m + fx[1][i] * f + bed[1][i] * b + extra[1][i] * LEVEL.extra;
}
// The freeze is the world stopped: nothing but the scratch carries into it (and the narrator, who is not in the world).
silence([L, R], CUT + scratchLength(), shot('title').start, 0.03);
const under = [L.slice(), R.slice()];
// The picture ends at LENGTH: the last chord fades out by then; the last line has finished before.
const endFade = Math.round(1.2 * SR), end = Math.round(LENGTH * SR);
for (let i = 0; i < N; i++) {
  const w = i >= end ? 0 : i > end - endFade ? 0.5 + 0.5 * Math.cos((Math.PI * (i - (end - endFade))) / endFade) : 1;
  L[i] = L[i] * w + voice[i] * LEVEL.voice;
  R[i] = R[i] * w + voice[i] * LEVEL.voice;
}
// Master for X: -14 LUFS integrated, true peak under -1 dBTP. Bring the mix to a working level, compress it gently,
// then raise it into the limiter until it measures -14.
const ml = L.slice(0, end), mr = R.slice(0, end);
fs.mkdirSync(OUT, { recursive: true });
const first = loudness(ml, mr);
const g = db(-20 - first.lufs);
for (let i = 0; i < end; i++) {
  ml[i] *= g;
  mr[i] *= g;
}
eq(ml, mr);
compress(ml, mr);
let master = null, push = -14 - loudness(ml, mr).lufs;
for (let pass = 0; pass < 4; pass++) {
  const ol = ml.map((v) => v * db(push)), or = mr.map((v) => v * db(push));
  limit(ol, or, db(-1.6));
  const m = loudness(ol, or);
  master = { L: ol, R: or, ...m };
  if (Math.abs(m.lufs + 14) < 0.15) break;
  push += -14 - m.lufs;
}
writeWav(path.join(OUT, 'teaser-sound.wav'), [master.L, master.R]);
console.log(`master: ${master.lufs.toFixed(1)} LUFS, true peak ${master.tp.toFixed(1)} dBTP`);
if (process.argv.includes('--stems')) {
  writeWav(path.join(OUT, 'stem-music.wav'), music.map((c) => c.subarray(0, end).map((v) => v * g)));
  writeWav(path.join(OUT, 'stem-effects.wav'), fx.map((c) => c.subarray(0, end).map((v) => v * g * LEVEL.effects)));
  writeWav(path.join(OUT, 'stem-beds.wav'), bed.map((c) => c.subarray(0, end).map((v) => v * g)));
  writeWav(path.join(OUT, 'stem-voice.wav'), [0, 1].map(() => voice.subarray(0, end).map((v) => v * g * LEVEL.voice)));
  // Everything but the voice, as it sits under it (ducked), for checking the balance.
  writeWav(path.join(OUT, 'stem-under.wav'), under.map((c) => c.subarray(0, end).map((v) => v * g)));
}
console.log(`teaser-sound.wav: ${(end / SR).toFixed(2)} s; ${VOICE.length} lines of narration; deflate ${DEFLATE.toFixed(3)} s, reveal ${REVEAL.toFixed(3)} s, glint ${SHINE.toFixed(3)} s, hero hurt ${HURT.toFixed(3)} s, freeze ${CUT.toFixed(3)} s`);

function scratchLength() {
  return 0.305;
}
