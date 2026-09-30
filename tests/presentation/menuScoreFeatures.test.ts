import { describe, expect, it } from 'vitest';
import { MENU_SCORE_FEATURE_INFO, MENU_SCORE_MOTION_LENGTH, sampleMenuScore } from '../../src/presentation/menu/menuScoreFeatures';

describe('measured menu score visual controls', () => {
  it('identifies the approved full-length stereo score and compact offline analysis', () => {
    expect(MENU_SCORE_FEATURE_INFO.sourceSha256).toBe('6a2dc57c6e8c68bfa65ab6d1e5ff6cf782f670e28e5121f788c646034e1de8c1');
    expect(MENU_SCORE_FEATURE_INFO.runtimeSha256).toBe('46d8c5f6492490e8ed521459fde2c588af18f55dff11ab4fbd22e491259fbee8');
    expect(MENU_SCORE_FEATURE_INFO.analysis.channels).toBe(2);
    expect(MENU_SCORE_FEATURE_INFO.duration).toBe(214.2);
    expect((MENU_SCORE_FEATURE_INFO.frames - 1) / MENU_SCORE_FEATURE_INFO.rate).toBe(MENU_SCORE_FEATURE_INFO.duration);
    expect(MENU_SCORE_FEATURE_INFO.frames * 5).toBeLessThan(25000);
  });

  it('follows the real rise at thirty seconds rather than an invented timed beat', () => {
    const before = sampleMenuScore(29);
    const attack = sampleMenuScore(30);
    const after = sampleMenuScore(32);
    expect(attack.energy - before.energy).toBeGreaterThan(0.2);
    expect(attack.onset - before.onset).toBeGreaterThan(0.4);
    expect(attack.mid).toBeGreaterThan(attack.treble);
    expect(after.mid).toBeGreaterThan(0.9);
    expect(sampleMenuScore(214.2).energy).toBeLessThan(0.01);
  });

  it('returns finite bounded envelopes throughout the song, including the last frame and malformed times', () => {
    for (let frame = 0; frame < MENU_SCORE_FEATURE_INFO.frames; frame++) {
      const sample = sampleMenuScore(frame / MENU_SCORE_FEATURE_INFO.rate);
      for (const key of ['energy', 'bass', 'mid', 'treble', 'onset'] as const) {
        expect(sample[key]).toBeGreaterThanOrEqual(0);
        expect(sample[key]).toBeLessThanOrEqual(1);
        expect(Number.isFinite(sample[key])).toBe(true);
      }
      expect(Number.isFinite(sample.motion)).toBe(true);
    }
    for (const time of [-20, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(sampleMenuScore(time)).toEqual(sampleMenuScore(0));
    }
    expect(sampleMenuScore(100000)).toEqual(sampleMenuScore(MENU_SCORE_FEATURE_INFO.duration));
  });

  it('reconstructs identical calm motion after seeks and arbitrary frame order without integration state', () => {
    const at30 = sampleMenuScore(30);
    for (const time of [180, 0, 63, 30, 3, 200]) sampleMenuScore(time);
    expect(sampleMenuScore(30)).toEqual(at30);
    for (let second = 0; second < 214; second++) {
      const speed = sampleMenuScore(second + 1).motion - sampleMenuScore(second).motion;
      expect(speed).toBeGreaterThanOrEqual(0.55 - 0.0001);
      expect(speed).toBeLessThanOrEqual(1 + 0.0001);
    }
    expect(at30.motion).toBeGreaterThan(16.5);
    expect(at30.motion).toBeLessThan(30);
  });

  it('reuses a caller-owned sample for current time and trail lookbacks without sharing mutable output', () => {
    const current = sampleMenuScore(30);
    const previous = sampleMenuScore(29);
    expect(sampleMenuScore(32, current)).toBe(current);
    expect(current).toEqual(sampleMenuScore(32));
    expect(previous).toEqual(sampleMenuScore(29));
    expect(sampleMenuScore(29, current)).toBe(current);
    expect(current).toEqual(previous);
    expect(current).not.toBe(previous);
  });

  it('can wrap an orbit seamlessly at the native loop boundary using its measured motion length', () => {
    const first = sampleMenuScore(0).motion;
    const last = sampleMenuScore(MENU_SCORE_FEATURE_INFO.duration).motion;
    expect(first).toBe(0);
    expect(last).toBe(MENU_SCORE_MOTION_LENGTH);
    for (const turns of [1, 3, 7]) {
      const start = first / MENU_SCORE_MOTION_LENGTH * Math.PI * 2 * turns;
      const end = last / MENU_SCORE_MOTION_LENGTH * Math.PI * 2 * turns;
      expect(Math.sin(end)).toBeCloseTo(Math.sin(start), 10);
      expect(Math.cos(end)).toBeCloseTo(Math.cos(start), 10);
    }
  });

  it('has no envelope or motion steps when native currentTime crosses a feature-frame boundary', () => {
    for (const time of [0.05, 10.1, 30, 54.1, 60.9, 140, 214.15]) {
      const before = sampleMenuScore(time - 0.00001);
      const after = sampleMenuScore(time + 0.00001);
      for (const key of ['energy', 'bass', 'mid', 'treble', 'onset', 'motion'] as const) {
        expect(Math.abs(after[key] - before[key])).toBeLessThan(0.001);
      }
    }
  });
});
