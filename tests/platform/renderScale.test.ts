import { describe, expect, it } from 'vitest';
import { RenderScale, renderScaleFloor, presetPixelRatio } from '../../src/platform/renderScale';

const feed = (r: RenderScale, ms: number, n: number) => { let changes = 0; for (let i = 0; i < n; i++) if (r.sample(ms)) changes++; return changes; };

describe('dynamic resolution (A113)', () => {
  it('holds full resolution while 60 Hz frames are met', () => {
    const r = new RenderScale();
    expect(feed(r, 16.7, 2000)).toBe(0);
    expect(r.scale).toBe(1);
  });

  it('steps down while frames are missed, settles between steps, and stops at the floor', () => {
    const r = new RenderScale(0.5);
    expect(feed(r, 33.3, 90)).toBe(1);
    expect(r.scale).toBeCloseTo(0.85);
    expect(feed(r, 33.3, 179)).toBe(0); // settling, then a fresh window to judge
    expect(feed(r, 33.3, 2000)).toBeGreaterThan(0);
    expect(r.scale).toBe(0.5);
  });

  it('ignores stalls that are not drawing cost, and climbs back once frames are steady', () => {
    const r = new RenderScale(0.5);
    expect(feed(r, 2000, 500)).toBe(0);
    feed(r, 33.3, 90);
    expect(r.scale).toBeLessThan(1);
    feed(r, 16.7, 2 * (90 + 600));
    expect(r.scale).toBe(1);
  });

  it('never draws a Retina screen below one pixel per point, nor a 1× screen below 0.75', () => {
    expect(renderScaleFloor(2) * 2).toBe(1);
    expect(renderScaleFloor(1)).toBe(0.75);
    expect(renderScaleFloor(1.5) * 1.5).toBe(0.75);
  });
});

it('caps high-density fill cost without supersampling ordinary screens', () => {
  for (const ratio of [1, 1.25, 1.5, 2, 3]) {
    expect(presetPixelRatio('low', ratio)).toBe(Math.min(ratio, 1));
    expect(presetPixelRatio('medium', ratio)).toBe(Math.min(ratio, 1.5));
    expect(presetPixelRatio('high', ratio)).toBe(Math.min(ratio, 1.5));
  }
});
