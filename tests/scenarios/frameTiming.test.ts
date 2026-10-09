import { describe, expect, it } from 'vitest';
import { FrameClock, cappedFrame } from '../../src/platform/frameTiming';

describe('visible frame timing', () => {
  it('ignores background RAF callbacks and returns without simulating hidden elapsed time', () => {
    const clock = new FrameClock();
    expect(clock.tick(1000)).toBeNull();
    expect(clock.tick(1016)).toEqual({ interval: 0.016, dt: 0.016, steps: 1 });
    clock.setHidden(true);
    for (const now of [2016, 3016, 120016]) expect(clock.tick(now)).toBeNull();
    clock.setHidden(false);
    expect(clock.tick(120032)).toBeNull();
    expect(clock.tick(120048)).toEqual({ interval: 0.016, dt: 0.016, steps: 1 });
  });

  it('drops hidden elapsed time even when the browser suspends all RAF callbacks', () => {
    const clock = new FrameClock();
    clock.tick(0);
    clock.tick(16);
    clock.setHidden(true);
    clock.setHidden(false);
    expect(clock.tick(600000)).toBeNull();
    expect(clock.tick(600020)?.dt).toBe(0.02);
  });

  it('retains the measured visible interval while bounding a slow simulation frame', () => {
    const clock = new FrameClock();
    clock.tick(0);
    // A stall advances the world by the catch-up bound only, in steps no longer than before (A70).
    expect(clock.tick(400)).toEqual({ interval: 0.4, dt: 0.15, steps: 3 });
  });

  it('keeps the world on its own time at ordinary low frame rates, each step no longer than 0.05 s (A70)', () => {
    for (const hz of [7, 10, 15, 24, 30, 60, 120, 144]) {
      const clock = new FrameClock();
      let simulated = 0, longest = 0;
      clock.tick(0);
      for (let frame = 1; frame <= hz * 4; frame++) {
        const step = clock.tick(frame * 1000 / hz)!;
        simulated += step.dt;
        longest = Math.max(longest, step.dt / step.steps);
      }
      expect(simulated, hz + ' Hz').toBeCloseTo(4, 6);
      expect(longest, hz + ' Hz').toBeLessThanOrEqual(0.05 + 1e-12);
    }
  });

  it('starts a new timing baseline after loading without simulating its elapsed time', () => {
    const clock = new FrameClock();
    clock.tick(1000);
    clock.tick(1016);
    clock.reset();
    expect(clock.tick(90000)).toBeNull();
    expect(clock.tick(90016)).toEqual({ interval: .016, dt: .016, steps: 1 });
    clock.setHidden(true);
    clock.reset();
    expect(clock.tick(100000)).toBeNull();
  });

  it('does not pass invalid or backwards time into actors and resets after an invalid timestamp', () => {
    const clock = new FrameClock();
    clock.tick(100);
    expect(clock.tick(90)).toBeNull();
    expect(clock.tick(Number.NaN)).toBeNull();
    expect(clock.tick(1000)).toBeNull();
    expect(clock.tick(1016)?.dt).toBe(0.016);
  });
});

describe('the 60-frame cap (A71)', () => {
  it.each([60, 120, 144, 240])('draws about 60 frames a second on a %i Hz display', (hz) => {
    let due = -Infinity, drawn = 0;
    for (let i = 0; i < hz * 10; i++) {
      const now = i * 1000 / hz + Math.sin(i * 1.7) * 0.4;
      const step = cappedFrame(now, due); due = step.due; if (step.draw) drawn++;
    }
    expect(drawn / 10).toBeGreaterThan(59);
    expect(drawn / 10).toBeLessThan(61);
  });

  it('restarts its schedule after a long stall instead of drawing a burst', () => {
    let { due } = cappedFrame(0, -Infinity);
    ({ due } = cappedFrame(500, due));
    expect(cappedFrame(505, due).draw).toBe(false);
  });
});
