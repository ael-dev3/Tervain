#!/usr/bin/env node
/**
 * The teaser's sound, mixed to picture:
 * - a score composed for the cut with Tervain's own composer and theme (tools/world-audio/compose), on the teaser's
 *   beat;
 * - every sound the game made while the film was shot (logged per frame by film.mjs), played from the game's own
 *   banks and placed by its distance and direction from the camera;
 * - each place's ambience bed;
 * - the record scratch, made from the score itself.
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
import { HARMONY, Mix, SPACES, THEME, blown, bowed, plucked, roll, sung, timed } from '../world-audio/compose/pieces.mjs';
import { OUT } from './film.mjs';
import { BEAT, FPS, LENGTH, SHOTS, shot } from './timeline.mjs';

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
const LANDS = moment('barrel', (r) => r.cues.some((c) => c.clip === 'wood.impact'));
const HURT = moment('combat', (r) => r.player.state === 'hurt');
const CUT = shot('freeze').start;

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

/* ------------------------------------------------------------------ the score */

function score() {
  const hall = new Mix(SECONDS, 'hall', { wet: 0.3, seed: 501 });
  const forest = new Mix(SECONDS, 'forest', { wet: 0.3, seed: 502 });
  const build = new Mix(SECONDS, 'hall', { wet: 0.28, seed: 503 });
  const fight = new Mix(SECONDS, 'room', { wet: 0.22, seed: 504 });
  const night = new Mix(SECONDS, 'night', { wet: 0.4, seed: 505 });
  const random = rng(77);

  // In a world… — a war drum, a bell and a braam on D, low strings and voices holding the dark.
  hall.add(I.drumHit({ f0: 36, vel: 1, decay: 1.8, strike: 0.05, slap: 0.4, seed: 1 }), 0, { gain: 1.5, send: 0.3 });
  hall.add(I.drumHit({ f0: 55, vel: 0.9, decay: 1.1, strike: 0.15, slap: 0.3, seed: 2 }), 0.004, { gain: 0.9, pan: -0.1, send: 0.3 });
  hall.add(I.churchBell(hzOf('D3'), { seconds: 7, vel: 0.9, seed: 3 }), 0, { gain: 0.32, pan: 0.15, send: 0.45 });
  hall.add(braam(4.2, ['D1', 'D2', 'A2', 'D3'], { seed: 4 }), 0, { gain: 0.42, send: 0.25 });
  bowed(hall, [hold('D2', 0, 9.5, 0.6)], { body: I.VIOL, seed: 5, attack: 0.03, release: 1.4, brightness: 0.55, vibDepth: 0.0008 }, { pan: -0.2, send: 0.3, gain: 0.9 });
  bowed(hall, [hold('A2', 0, 7.5, 0.48)], { body: I.VIOL, seed: 6, attack: 0.03, release: 1.4, brightness: 0.5, vibDepth: 0.0008 }, { pan: 0.2, send: 0.3, gain: 0.85 });
  sung(hall, [hold('D3', 0.1, 7.2, 0.5)], { vowel: 'o', seed: 7 }, { pan: -0.35, gain: 0.6 });
  sung(hall, [hold('A3', 0.2, 7.2, 0.46)], { vowel: 'o', seed: 8 }, { pan: 0.35, gain: 0.6 });
  sung(hall, [hold('F4', 2, 7.4, 0.4)], { vowel: 'a', female: true, seed: 9 }, { pan: 0.1, gain: 0.45 });
  bowed(hall, [hold('A5', 1.5, 7.6, 0.2)], { body: I.VIOLIN, seed: 10, tremolo: 0.8, brightness: 0.7, attack: 1.2, release: 0.8 }, { pan: 0.4, send: 0.4, gain: 0.5 });
  hall.add(plucked(SECONDS, 'harp', sweep('D4', 15, at(8) - 0.66)), 0, { pan: -0.25, send: 0.45, gain: 0.95 });

  // One man wakes… — the theme, a waltz: the wooden flute over the harp, in D Dorian.
  const harpNotes = [];
  const lute = [];
  const chords = [...HARMONY.slice(0, 8), 'F'];
  chords.forEach((chord, k) => {
    const start = 8 + 3 * k;
    const bass = rootOf(chord, midi('D2'));
    const up = tonesOf(chord, bass + 7, 3);
    [bass, up[0], up[1], up[2], up[1], up[0]].forEach((m, j) => {
      const note = { t: at(start + j * 0.5) + (random() - 0.5) * 0.01, freq: mtof(m), vel: 0.42 * (j === 0 ? 1.15 : 0.85) * (0.93 + 0.14 * random()) };
      // In the village the lute takes the broken chords; the harp keeps only the bass.
      if (start >= 26) {
        lute.push({ ...note, vel: note.vel * 1.1 });
        if (j === 0) harpNotes.push({ ...note, vel: note.vel * 0.7 });
      } else harpNotes.push(note);
    });
  });
  forest.add(plucked(SECONDS, 'harp', harpNotes, { ring: 3 }), 0, { pan: -0.3, send: 0.35, gain: 1.05 });
  forest.add(plucked(SECONDS, 'lute', lute, { ring: 2.2 }), 0, { pan: -0.42, send: 0.22, gain: 1.15 });
  const melody = line(THEME.A + THEME.A2, 3, 8, { transpose: 12, random, vel: 0.62, humanize: 0.008 });
  blown(forest, melody, { seed: 11, breath: 0.55 }, { pan: 0.18, send: 0.36, gain: 0.95 });
  // The village's fiddle joins an octave below for the cadence, and leads up into the next line.
  const fiddle = line('G4:1 F4:1 E4:1 | D4:3 | F4:1 A4:1 C5:1 |', 3, 26, { random, vel: 0.58, humanize: 0.006 });
  bowed(forest, fiddle, { body: I.VIOLIN, seed: 12, brightness: 0.5 }, { pan: 0.42, send: 0.3, gain: 0.9 });
  blown(forest, line('F5:1 A5:1 C6:1 |', 3, 32, { random, vel: 0.6 }), { seed: 13, breath: 0.5 }, { pan: 0.18, send: 0.36, gain: 0.8 });
  bowed(forest, [hold('D3', 17, 26, 0.24), hold('A2', 26, 32, 0.24)], { body: I.VIOLA, seed: 14, brightness: 0.25, attack: 1, release: 1, vibDepth: 0.001 }, { pan: -0.1, send: 0.35, gain: 0.8 });

  // Next-generation physics — the drums gather, the strings climb… and stop dead when the barrel lands.
  build.add(braam(3, ['D1', 'D2', 'A2'], { seed: 15, open: 1800, decay: 0.6 }), at(35), { gain: 0.3, send: 0.25 });
  for (let b = 35; b < 39; b++) build.add(I.drumHit({ f0: 50, vel: 0.6 + 0.08 * (b - 35), decay: 0.9, strike: 0.1, slap: 0.25, seed: 20 + b }), at(b), { gain: 1.1, send: 0.3 });
  for (let k = 0; k < 8; k++) build.add(I.drumHit({ f0: 92, vel: 0.35 + 0.05 * k, mute: 0.35, decay: 0.3, strike: 0.5, seed: 60 + k }), at(37 + k * 0.25), { pan: -0.35, send: 0.2 });
  for (let k = 0; k < 10; k++) build.add(I.drumHit({ f0: 88 + k, vel: 0.5 + 0.045 * k, mute: 0.3, decay: 0.3, strike: 0.45, seed: 80 + k }), at(39) + k * 0.07, { pan: 0.3, send: 0.2 });
  bowed(build, ['D5', 'E5', 'F5', 'G5', 'A5'].map((n, k) => ({ ...hold(n, 35 + k, 36 + k, 0.32 + 0.06 * k), slur: k > 0 })), { body: I.VIOLIN, seed: 16, tremolo: 0.9, tremoloRate: 13, brightness: 0.8, attack: 0.05, release: 0.1 }, { pan: 0.35, send: 0.3, gain: 0.8 });
  bowed(build, ['D4', 'E4', 'F4', 'G4', 'A4'].map((n, k) => ({ ...hold(n, 35 + k, 36 + k, 0.3 + 0.06 * k), slur: k > 0 })), { body: I.VIOLA, seed: 17, tremolo: 0.9, tremoloRate: 12, brightness: 0.7, attack: 0.05, release: 0.1 }, { pan: -0.35, send: 0.3, gain: 0.75 });
  bowed(build, [hold('D2', 35, 40, 0.55)], { body: I.VIOL, seed: 18, attack: 0.05, release: 0.1, brightness: 0.6 }, { send: 0.25 });
  sung(build, [hold('D4', 35, 40, 0.4)], { vowel: 'a', seed: 19 }, { pan: -0.3, gain: 0.5 });
  sung(build, [hold('F4', 37, 40, 0.42)], { vowel: 'a', female: true, seed: 20 }, { pan: 0.05, gain: 0.45 });
  sung(build, [hold('A4', 36, 40, 0.42)], { vowel: 'a', female: true, seed: 21 }, { pan: 0.3, gain: 0.5 });
  build.add(riser(LANDS - at(35), { seed: 22 }), at(35), { gain: 0.16, send: 0.2 });

  // Brutal, tactical combat — the fight music of the ford in twelve-eight: drums, a falling bass, the theme hurried.
  const pattern = [0.9, 0.35, 0.45, 0.75, 0.35, 0.5];
  for (let k = 0; k < 27; k++) {
    const vel = pattern[k % 6] * (0.9 + 0.12 * random()) * (k >= 21 ? 1.12 : 1);
    fight.add(I.drumHit({ f0: 92, vel, mute: vel < 0.6 ? 0.6 : 0.2, decay: 0.35, strike: vel < 0.6 ? 0.7 : 0.3, seed: 100 + k }), at(43) + triplets.at(k), { pan: -0.4, send: 0.18 });
    if (k >= 12 && k % 3 !== 0) fight.add(I.drumHit({ f0: 140, vel: 0.28 + 0.1 * random(), mute: 0.5, decay: 0.25, strike: 0.8, seed: 200 + k }), at(43) + triplets.at(k), { pan: 0.5, send: 0.18 });
  }
  for (let b = 43; b < 52; b += 2) fight.add(I.drumHit({ f0: 50, vel: 0.9, decay: 0.8, strike: 0.1, slap: 0.2, seed: 300 + b }), at(b), { send: 0.25, gain: 1.1 });
  fight.add(braam(2.2, ['D1', 'D2', 'A2'], { seed: 23, open: 2200, decay: 0.4 }), at(43), { gain: 0.3, send: 0.2 });
  const cycle = 'D3:1! D3:1. A2:1. D3:1! D3:1. A2:1. | C3:1! C3:1. G2:1. C3:1! C3:1. G2:1. | Bb2:1! Bb2:1. F2:1. Bb2:1! Bb2:1. F2:1. | A2:1! A2:1. E2:1. A2:1! A2:1. C#3:1. |';
  const bass = [...line(cycle, 6, 43, { random, vel: 0.58, humanize: 0.004 }, triplets), ...line('D3:1! D3:1. A2:1. |', 3, 51, { random, vel: 0.62 }, triplets)];
  bowed(fight, bass, { body: I.VIOL, seed: 24, brightness: 0.6, attack: 0.02, release: 0.08, vibDepth: 0 }, { pan: -0.15, send: 0.15 });
  const tune = line('D5:3 A5:3 | Bb5:2 A5:1 G5:2 F5:1 | E5:2 D5:1 C#5:3 | D5:3 A5:3 |', 6, 43, { random, vel: 0.66 }, triplets);
  bowed(fight, tune, { body: I.VIOLIN, seed: 25, brightness: 0.75, vibDepth: 0.004, attack: 0.04 }, { pan: 0.42, send: 0.22, gain: 0.95 });
  bowed(fight, line('D4:3 A4:3 | Bb4:2 A4:1 G4:2 F4:1 | E4:2 D4:1 C#4:3 | D4:3 A4:3 |', 6, 43, { random, vel: 0.5 }, triplets), { body: I.VIOLA, seed: 26, brightness: 0.6, attack: 0.04 }, { pan: -0.3, send: 0.22, gain: 0.7 });

  // An unforgettable score — after the silence, the harp alone, the theme in the dark mode, over a low viol.
  const harpNight = line('D4:1 A4:2 | Bb4:1~ A4:1 G4:1 | F4:1 E4:1 D4:1 |', 3, 56, { random, vel: 0.5, humanize: 0.01 });
  ['Dm', 'Gm', 'Dm'].forEach((chord, k) => {
    const root = rootOf(chord, midi('D2'));
    harpNight.push(...roll([root, ...tonesOf(chord, root + 7, 2)], at(56 + 3 * k) - 0.03, 0.36, 0.05));
  });
  harpNight.push(...sweep('D4', 12, at(65) - 0.55, 0.3, 0.042));
  night.add(plucked(SECONDS, 'harp', harpNight, { ring: 4.5, damping: (n) => (n.dur ? n.dur * 2 + 0.25 : 4.4) }), 0, { pan: 0.05, send: 0.42, gain: 1.25 });
  bowed(night, [hold('D2', 56, 65.5, 0.26)], { body: I.VIOL, seed: 27, brightness: 0.15, attack: 1.2, release: 1.2, vibDepth: 0.0005 }, { pan: -0.16, send: 0.35, gain: 0.85 });
  bowed(night, [hold('A2', 59, 65.5, 0.18)], { body: I.VIOL, seed: 28, brightness: 0.15, attack: 1.5, release: 1.2, vibDepth: 0.0005 }, { pan: 0.2, send: 0.35, gain: 0.8 });

  // A breathtaking main menu — four-four on the menu score's own beat (the spirits bounce to it): Dm, B flat, C…
  for (let b = 65; b < 73; b++) {
    if (b % 2 === 1) hall.add(I.drumHit({ f0: 48, vel: 0.85, decay: 0.9, strike: 0.1, slap: 0.25, seed: 400 + b }), at(b), { send: 0.3, gain: 1.05 });
    for (let e = 0; e < 2; e++) hall.add(I.drumHit({ f0: 94, vel: (0.3 + 0.04 * (b - 65)) * (e ? 0.7 : 1), mute: 0.4, decay: 0.3, strike: 0.55, seed: 450 + b * 2 + e }), at(b + e * 0.5), { pan: -0.4, send: 0.2 });
  }
  for (let k = 0; k < 8; k++) hall.add(I.drumHit({ f0: 96, vel: 0.45 + 0.06 * k, mute: 0.35, decay: 0.28, strike: 0.5, seed: 480 + k }), at(72 + k * 0.125), { pan: 0.35, send: 0.2 });
  const groveBass = [hold('D2', 65, 69, 0.5), hold('Bb1', 69, 71, 0.52), hold('C2', 71, 73, 0.56)];
  bowed(hall, groveBass.map((n, k) => ({ ...n, slur: k > 0 })), { body: I.VIOL, seed: 29, brightness: 0.5, attack: 0.05, release: 0.3 }, { send: 0.28 });
  const groveTune = line('D5:2 A5:2 | Bb5:2 C6:2 |', 4, 65, { random, vel: 0.6 });
  bowed(hall, groveTune, { body: I.VIOLIN, seed: 30, brightness: 0.65, vibDepth: 0.004 }, { pan: 0.35, send: 0.3, gain: 0.9 });
  bowed(hall, line('A4:2 F5:2 | F5:2 G5:2 |', 4, 65, { random, vel: 0.5 }), { body: I.VIOLA, seed: 31, brightness: 0.5, tremolo: 0.7, tremoloRate: 12 }, { pan: -0.3, send: 0.3, gain: 0.7 });
  sung(hall, [hold('D4', 65, 69, 0.42), hold('D4', 69, 71, 0.44), hold('E4', 71, 73, 0.46)], { vowel: 'a', seed: 32 }, { pan: -0.25, gain: 0.5 });
  sung(hall, [hold('A4', 65, 69, 0.4), hold('F4', 69, 71, 0.42), hold('G4', 71, 73, 0.46)], { vowel: 'a', female: true, seed: 33 }, { pan: 0.25, gain: 0.5 });

  // …and the title lands in D major, the way the spring's chorale ends: drums, bells, the full chord, held.
  hall.add(I.drumHit({ f0: 36, vel: 1, decay: 1.9, strike: 0.05, slap: 0.4, seed: 34 }), at(73), { gain: 1.4, send: 0.32 });
  hall.add(I.drumHit({ f0: 55, vel: 0.9, decay: 1.2, strike: 0.15, slap: 0.3, seed: 35 }), at(73) + 0.004, { gain: 0.9, send: 0.3 });
  hall.add(I.churchBell(hzOf('D4'), { seconds: 8, vel: 0.9, seed: 36 }), at(73), { gain: 0.45, pan: -0.1, send: 0.45 });
  hall.add(I.churchBell(hzOf('D3'), { seconds: 8, vel: 0.8, seed: 37 }), at(73), { gain: 0.28, pan: 0.15, send: 0.45 });
  hall.add(braam(4, ['D1', 'D2', 'A2', 'F#3'], { seed: 38, open: 2000, decay: 0.45 }), at(73), { gain: 0.3, send: 0.25 });
  const finale = (name, vel, body, seed, pan, gain) => bowed(hall, [hold(name, 73, 82, vel)], { body, seed, brightness: 0.45, attack: 0.04, release: 2.4, vibDepth: 0.003 }, { pan, send: 0.36, gain });
  finale('D2', 0.55, I.VIOL, 39, -0.1, 0.9);
  finale('A3', 0.45, I.VIOLA, 40, -0.3, 0.75);
  finale('F#4', 0.45, I.VIOLA, 41, 0.3, 0.7);
  finale('D6', 0.5, I.VIOLIN, 42, 0.38, 0.75);
  finale('A5', 0.45, I.VIOLIN, 43, -0.38, 0.65);
  for (const [name, female, seed, pan] of [['D3', false, 44, -0.4], ['A3', false, 45, 0.4], ['F#4', true, 46, -0.15], ['A4', true, 47, 0.15], ['D5', true, 48, 0]]) {
    sung(hall, [hold(name, 73, 81.5, 0.42)], { vowel: 'a', female, seed, vibDepth: 0.005 }, { pan, gain: 0.42 });
  }
  hall.add(plucked(SECONDS, 'harp', roll([midi('D2'), midi('A2'), midi('D3'), midi('F#3'), midi('A3'), midi('D4'), midi('F#4'), midi('A4'), midi('D5')], at(73), 0.5, 0.035), { ring: 6 }), 0, { pan: 0.25, send: 0.4 });
  // The release date: a chime; the credit: the harp, last.
  hall.add(I.chime(hzOf('A5'), { seconds: 4, vel: 0.7, seed: 49 }), shot('title').start + 3.0, { pan: 0.3, send: 0.5, gain: 0.55 });
  hall.add(plucked(SECONDS, 'harp', roll([midi('D4'), midi('A4'), midi('D5'), midi('F#5')], shot('title').start + 4.3, 0.28, 0.06), { ring: 5 }), 0, { pan: -0.2, send: 0.5, gain: 0.9 });

  const out = [hall, forest, night].map((m) => m.finish());
  const [bl, br] = build.finish();
  // The barrel lands: everything stops, reverb and all.
  gate([bl, br], LANDS + 0.005, 0.006);
  const [fl, fr] = fight.finish();
  return { parts: [...out, [bl, br]], fight: [fl, fr] };
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
 * A teaser's mix is not the game's: the action comes forward (feet, blows, the barrel) and the daytime crickets step
 * back. Linear gains on top of the game's own.
 */
const TRIM = {
  cricket: 0.45, 'step.dirt': 2.2, 'step.gravel': 2.2, 'step.grass': 2.2, 'step.sand': 2.2, 'step.run': 2,
  'wood.impact': 1.6, 'wood.lift': 1.3, swing: 1.4, 'swing.heavy': 1.4, 'hit.flesh': 1.7, 'voice.hurt': 1.4,
  'beast.growl': 1.4, 'beast.attack': 1.3, 'beast.hurt': 1.4,
};
/** The player's own cries, as the game plays them now. */
const HERO_VOICE = { 'voice.hurt': 'hero.hurt', 'voice.death': 'hero.death', 'voice.breath': 'hero.breath' };
/** Sounds just before a cut are kept (a growl that leads into its shot); earlier ones belong to the setup. */
const LEAD_IN = 0.15;
/**
 * The coast had no gull call while it was filmed; these come from the game's own bank, far off: [shot, seconds into
 * it, clip, take, gain, pan].
 */
const ADDED = [
  ['lighthouse', 1.1, 'gull', 0, 0.16, -0.5],
  ['lighthouse', 3.3, 'gull', 2, 0.12, 0.45],
  ['beach', 2.6, 'gull', 1, 0.14, 0.35],
];

function effects() {
  const L = new Float32Array(N), R = new Float32Array(N), send = new Float32Array(N);
  const random = rng(31);
  for (const s of SHOTS) {
    if (s.scene !== 'world') continue;
    const sl = new Float32Array(N), sr = new Float32Array(N), ss = new Float32Array(N);
    const { log } = JSON.parse(fs.readFileSync(path.join(OUT, `shot-${s.id}.json`), 'utf8'));
    for (const r of log) {
      for (const c of r.cues) {
        if (!c.played) continue;
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
  // The freeze is the world stopped: not even the fight's echo carries into it.
  silence([L, R], CUT, shot('night').start, 0.03);
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
  lighthouse: [['sea', -27], ['cliff_wind', -31]],
  beach: [['sea', -20.5]],
  trail: [['forest_day', -27]],
  rillford: [['village_day', -28], ['meadow_day', -38]],
  barrel: [['forest_day', -29]],
  combat: [['cut', -31]],
  freeze: [['cliff_wind', -40]],
  night: [['village_night', -31], ['forest_night', -35]],
  grove: [['cliff_wind', -36], ['fire', -34]],
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

/* ------------------------------------------------------------------ mix and master */

const { parts, fight } = score();
const [fl, fr] = fight;
// The scratch is cut from the fight music at the freeze; the fight stops there.
const [sl, sr] = scratch(fl, fr, CUT);
gate([fl, fr], CUT, 0.004);
const music = [new Float32Array(N), new Float32Array(N)];
for (const [l, r] of [...parts, [fl, fr]]) {
  for (let i = 0; i < N; i++) {
    music[0][i] += l[i] ?? 0;
    music[1][i] += r[i] ?? 0;
  }
}
const fx = effects();
const bed = beds();
// The freeze: the scratch, then the awkward quiet, and a cricket.
const extra = [new Float32Array(N), new Float32Array(N)];
const o = Math.round(CUT * SR);
for (let i = 0; i < sl.length; i++) {
  extra[0][o + i] += sl[i] * 1.1;
  extra[1][o + i] += sr[i] * 1.1;
}
for (const [dt, seed, pan] of [[1.15, 1, 0.4], [1.62, 2, 0.4]]) {
  const chirp = I.cricketChirp({ carrier: 4600, pulses: 4, seed });
  const [gl, gr] = panGains(pan);
  const c0 = Math.round((CUT + dt) * SR);
  for (let i = 0; i < chirp.length; i++) {
    extra[0][c0 + i] += chirp[i] * 0.25 * gl;
    extra[1][c0 + i] += chirp[i] * 0.25 * gr;
  }
}

const LEVEL = { music: 1, effects: 1.5, beds: 1, extra: 1 };
const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  L[i] = music[0][i] * LEVEL.music + fx[0][i] * LEVEL.effects + bed[0][i] * LEVEL.beds + extra[0][i] * LEVEL.extra;
  R[i] = music[1][i] * LEVEL.music + fx[1][i] * LEVEL.effects + bed[1][i] * LEVEL.beds + extra[1][i] * LEVEL.extra;
}
// The picture ends at LENGTH: the last chord fades out by then.
const endFade = Math.round(1.8 * SR), end = Math.round(LENGTH * SR);
for (let i = 0; i < N; i++) {
  const w = i >= end ? 0 : i > end - endFade ? 0.5 + 0.5 * Math.cos((Math.PI * (i - (end - endFade))) / endFade) : 1;
  L[i] *= w;
  R[i] *= w;
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
const out = [master.L, master.R];
writeWav(path.join(OUT, 'teaser-sound.wav'), out);
console.log(`master: ${master.lufs.toFixed(1)} LUFS, true peak ${master.tp.toFixed(1)} dBTP`);
if (process.argv.includes('--stems')) {
  writeWav(path.join(OUT, 'stem-music.wav'), music.map((c) => c.subarray(0, end).map((v) => v * g)));
  writeWav(path.join(OUT, 'stem-effects.wav'), fx.map((c) => c.subarray(0, end).map((v) => v * g * LEVEL.effects)));
  writeWav(path.join(OUT, 'stem-beds.wav'), bed.map((c) => c.subarray(0, end).map((v) => v * g)));
}
console.log(`teaser-sound.wav: ${(end / SR).toFixed(2)} s; barrel lands ${LANDS.toFixed(3)} s, hero hurt ${HURT.toFixed(3)} s, freeze ${CUT.toFixed(3)} s`);
