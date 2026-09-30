import { describe, expect, it } from 'vitest';
import { FrameClock } from '../../src/platform/frameTiming';

describe('visible frame timing', () => {
  it('ignores background RAF callbacks and returns without simulating hidden elapsed time', () => {
    const clock = new FrameClock();
    expect(clock.tick(1000)).toBeNull();
    expect(clock.tick(1016)).toEqual({ interval: 0.016, dt: 0.016 });
    clock.setHidden(true);
    for (const now of [2016, 3016, 120016]) expect(clock.tick(now)).toBeNull();
    clock.setHidden(false);
    expect(clock.tick(120032)).toBeNull();
    expect(clock.tick(120048)).toEqual({ interval: 0.016, dt: 0.016 });
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
    expect(clock.tick(400)).toEqual({ interval: 0.4, dt: 0.05 });
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
