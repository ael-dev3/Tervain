import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  MENU_ACCENT_COUNT,
  MENU_BAND_COUNT,
  MENU_BEAT,
  MENU_FIRST_BEAT,
  forEachMenuAccent,
  menuBarLevel,
  menuBeatTime,
  menuPhraseTime,
  sampleMenuRhythm,
} from '../../src/presentation/menu/menuScoreRhythm';
import {
  MENU_SCORE_ACCENTS_BASE64,
  MENU_SCORE_BANDS_BASE64,
  MENU_SCORE_BARS_BASE64,
  MENU_SCORE_RHYTHM_INFO,
} from '../../src/presentation/menu/menuScoreRhythmData';
import { MENU_SCORE_FEATURE_INFO } from '../../src/presentation/menu/menuScoreFeatures';

const bytes = (b64: string) => Buffer.from(b64, 'base64');

describe('measured rhythm of the menu score', () => {
  it('records the approved source, a constant grid that fits the tracked beats, and an intact payload', () => {
    const info = MENU_SCORE_RHYTHM_INFO;
    expect(info.sourceSha256).toBe(MENU_SCORE_FEATURE_INFO.sourceSha256);
    expect(info.runtimeSha256).toBe(MENU_SCORE_FEATURE_INFO.runtimeSha256);
    expect(info.duration).toBe(MENU_SCORE_FEATURE_INFO.duration);
    expect(info.beat.bpm).toBeGreaterThan(105);
    expect(info.beat.bpm).toBeLessThan(109);
    expect(MENU_BEAT).toBeCloseTo(60 / info.beat.bpm, 4);
    expect(MENU_FIRST_BEAT).toBeGreaterThanOrEqual(0);
    expect(MENU_FIRST_BEAT).toBeLessThan(MENU_BEAT);
    // The tracked beats sit close to one isochronous grid, and the grid sits on onsets far better than chance.
    expect(info.beat.trackedRmsResidualSeconds).toBeLessThan(0.02);
    expect(info.beat.gridAlignment).toBeGreaterThan(3 * info.beat.randomGridAlignment);
    const payload = Buffer.concat([bytes(MENU_SCORE_BANDS_BASE64), bytes(MENU_SCORE_ACCENTS_BASE64), bytes(MENU_SCORE_BARS_BASE64)]);
    expect(createHash('sha256').update(payload).digest('hex')).toBe(info.payloadSha256);
    expect(bytes(MENU_SCORE_BANDS_BASE64).length).toBe(info.bands.frames * MENU_BAND_COUNT);
    expect(MENU_ACCENT_COUNT).toBe(info.accents.count);
    expect(info.bands.frames).toBe(MENU_SCORE_FEATURE_INFO.frames);
  });

  it('counts beats, bars and phrases linearly from source time without random sampling', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('rhythm must not sample random'); });
    try {
      for (const beat of [0, 1, 53, 100.5, 300]) {
        const s = sampleMenuRhythm(menuBeatTime(beat));
        expect(s.beat).toBeCloseTo(beat, 9);
        expect(s.beatPhase).toBeGreaterThanOrEqual(0);
        expect(s.beatPhase).toBeLessThan(1);
        expect(s.bar).toBeCloseTo((beat - MENU_SCORE_RHYTHM_INFO.beat.downbeatBeat) / 4, 9);
      }
      // Phrase n starts exactly where the phrase counter reaches n.
      for (const p of [1, 2, 5, 10]) expect(sampleMenuRhythm(menuPhraseTime(p) + 1e-6).phrase).toBeCloseTo(p, 4);
      // The 30-second entrance falls in the phrase before the one at 33.9 s, and the grid has a beat within 0.1 s of it.
      const at30 = sampleMenuRhythm(30);
      expect(at30.phrase).toBeGreaterThan(0);
      expect(at30.phrase).toBeLessThan(1);
      expect(Math.min(at30.beatPhase, 1 - at30.beatPhase) * MENU_BEAT).toBeLessThan(0.1);
      const a = sampleMenuRhythm(77.7);
      const b = sampleMenuRhythm(77.7);
      expect(a).toEqual(b);
    } finally { random.mockRestore(); }
  });

  it('keeps bands, accents and bar levels in range and clamps malformed times', () => {
    for (const time of [Number.NaN, -5, 0, 12.34, 29.9, 30, 108.2, 214.2, 1e6]) {
      const s = sampleMenuRhythm(time);
      for (const v of s.bands) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(s.accent).toBeGreaterThanOrEqual(0);
      expect(s.accent).toBeLessThan(5);
      expect(s.barLevel).toBeGreaterThanOrEqual(0);
      expect(s.barLevel).toBeLessThanOrEqual(1);
    }
    expect(menuBarLevel(-1)).toBe(0);
    expect(menuBarLevel(10_000)).toBe(0);
    // The dance has music to answer: the bands move, and the sub band is not the presence band.
    let changes = 0;
    let previous = sampleMenuRhythm(40).bands.slice();
    for (let t = 40.05; t < 60; t += 0.05) {
      const now = sampleMenuRhythm(t).bands;
      if (Math.abs(now[1]! - previous[1]!) > 0.02) changes++;
      previous = now.slice();
    }
    expect(changes).toBeGreaterThan(50);
  });

  it('delivers each accent exactly once across adjacent half-open windows, and accents decay after a hit', () => {
    const seen: number[] = [];
    for (let t = 0; t < 215; t += 1 / 60) forEachMenuAccent(t, t + 1 / 60, (time) => seen.push(time));
    expect(seen.length).toBe(MENU_ACCENT_COUNT);
    expect(seen.every((time, i) => i === 0 || time > seen[i - 1]!)).toBe(true);
    // Right after a strong accent the accent level is high; across a quiet gap after an accent, it has decayed.
    let strong = -1;
    forEachMenuAccent(40, 70, (time, s) => { if (strong < 0 && s > 0.9) strong = time; });
    expect(strong).toBeGreaterThan(0);
    expect(sampleMenuRhythm(strong + 0.01).accent).toBeGreaterThan(0.8);
    const list: [number, number][] = [];
    forEachMenuAccent(0, 215, (time, s) => list.push([time, s]));
    const gap = list.findIndex(([time, s], i) => s > 0.4 && i + 1 < list.length && list[i + 1]![0] - time > 1.2);
    expect(gap).toBeGreaterThanOrEqual(0);
    const [quiet] = list[gap]!;
    expect(sampleMenuRhythm(quiet + 0.02).accent).toBeGreaterThan(5 * sampleMenuRhythm(quiet + 1.1).accent);
    forEachMenuAccent(10, 10, () => { throw new Error('an empty window delivers nothing'); });
  });
});
