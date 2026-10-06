/**
 * Music written down as text and checked as it is read.
 *
 * A line is bars of notes: `D4:1 A4:2 | B4:1~ A4:1 G4:1 |`. Each note is a pitch (or `r` for a rest) and a length in
 * beats; `~` after the length slurs the note into the next one, `!` accents it, `.` plays it short. Every bar must add
 * up to the meter, so a miscounted bar stops the render instead of quietly drifting out of time.
 */
import { gaussian, midi, mtof } from './dsp.mjs';

export function parse(text, beatsPerBar, { from = 0, transpose = 0 } = {}) {
  const bars = text.split('|').map((b) => b.trim()).filter(Boolean);
  const notes = [];
  let beat = from;
  let slurNext = false;
  bars.forEach((bar, index) => {
    let sum = 0;
    for (const token of bar.split(/\s+/)) {
      const m = /^([A-G](?:#|b)?-?\d|r):(\d+(?:\.\d+)?)([~!.]*)$/.exec(token);
      if (!m) throw new Error(`bad note "${token}" in bar ${index + 1}: ${bar}`);
      const beats = Number(m[2]);
      if (m[1] === 'r') slurNext = false;
      else {
        notes.push({ beat, beats, midi: midi(m[1]) + transpose, slur: slurNext, accent: m[3].includes('!'), short: m[3].includes('.') });
        slurNext = m[3].includes('~');
      }
      beat += beats;
      sum += beats;
    }
    if (Math.abs(sum - beatsPerBar) > 1e-6) throw new Error(`bar ${index + 1} holds ${sum} beats, not ${beatsPerBar}: ${bar}`);
  });
  return { notes, beats: beat - from, bars: bars.length };
}

/**
 * Beats to seconds, with ritardandos ({ from, to, factor }: the tempo eases from 1 to `factor` across the span and
 * stays there) and an optional gentle rubato (a slow random sway of the tempo, for a solo player).
 */
export class Tempo {
  constructor(bpm, { rit = [], rubato = 0, random = null, maxBeats = 512 } = {}) {
    this.bpm = bpm;
    const step = 1 / 32;
    const n = Math.ceil(maxBeats / step) + 1;
    this.step = step;
    this.times = new Float64Array(n);
    let sway = 0, swayTarget = 0;
    for (let i = 1; i < n; i++) {
      const b = (i - 1) * step;
      let f = 1;
      for (const r of rit) {
        if (b >= r.to) f *= r.factor;
        else if (b > r.from) f *= 1 + (r.factor - 1) * ((b - r.from) / (r.to - r.from));
      }
      if (rubato && random) {
        if (i % 96 === 1) swayTarget = gaussian(random) * rubato;
        sway += (swayTarget - sway) * 0.02;
        f *= 1 + sway;
      }
      this.times[i] = this.times[i - 1] + (60 / (bpm * f)) * step;
    }
  }

  at(beat) {
    const x = beat / this.step;
    const i = Math.floor(x);
    if (i >= this.times.length - 1) return this.times.at(-1) + (beat - (this.times.length - 1) * this.step) * (60 / this.bpm);
    return this.times[i] + (this.times[i + 1] - this.times[i]) * (x - i);
  }
}

const PITCH = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export const CHORDS = {
  Dm: ['D', 'F', 'A'], D: ['D', 'F#', 'A'], G: ['G', 'B', 'D'], Gm: ['G', 'Bb', 'D'], G7: ['G', 'B', 'D', 'F'],
  C: ['C', 'E', 'G'], Am: ['A', 'C', 'E'], A: ['A', 'C#', 'E'], F: ['F', 'A', 'C'], Em: ['E', 'G', 'B'],
  Bb: ['Bb', 'D', 'F'], E: ['E', 'G#', 'B'], Dsus: ['D', 'G', 'A'],
};
const pc = (m) => ((m % 12) + 12) % 12;

/** The chord's root at or above a MIDI note. */
export function rootOf(chord, low) {
  const want = PITCH[CHORDS[chord][0]];
  let m = low;
  while (pc(m) !== want) m++;
  return m;
}

/** Chord tones from a MIDI note upward, as many as asked. */
export function tonesOf(chord, low, count) {
  const set = CHORDS[chord].map((n) => PITCH[n]);
  const out = [];
  for (let m = low; out.length < count; m++) if (set.includes(pc(m))) out.push(m);
  return out;
}

export const freqOf = (m) => mtof(m);

/** A swell across a phrase: softer at its edges, fuller in its middle. */
export const arch = (beat, start, length, depth = 0.22) => 1 - depth + 2 * depth * Math.sin(Math.PI * Math.min(1, Math.max(0, (beat - start) / length)));
