import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FrameClock, MotionInterpolation, SIM_CATCH_UP, SIM_MAX_STEPS, SIM_STEP, cappedFrame } from '../../src/platform/frameTiming';

const STEP = SIM_STEP;

describe('visible frame timing (fixed steps, A72)', () => {
  it('ignores background RAF callbacks and returns without simulating hidden elapsed time', () => {
    const clock = new FrameClock();
    expect(clock.tick(1000)).toBeNull();
    expect(clock.tick(1016)).toMatchObject({ interval: 0.016, steps: 1, dt: STEP });
    clock.setHidden(true);
    for (const now of [2016, 3016, 120016]) expect(clock.tick(now)).toBeNull();
    clock.setHidden(false);
    expect(clock.tick(120032)).toBeNull();
    expect(clock.tick(120048)).toMatchObject({ interval: 0.016, steps: 1 });
  });

  it('drops hidden elapsed time even when the browser suspends all RAF callbacks', () => {
    const clock = new FrameClock();
    clock.tick(0);
    clock.tick(16);
    clock.setHidden(true);
    clock.setHidden(false);
    expect(clock.tick(600000)).toBeNull();
    expect(clock.tick(600020)?.steps).toBe(1);
  });

  it('caps a stall at the catch-up bound and never replays it', () => {
    const clock = new FrameClock();
    clock.tick(0);
    const stall = clock.tick(400)!;
    expect(stall.interval).toBe(0.4);
    expect(stall.steps).toBe(SIM_MAX_STEPS);
    expect(stall.dt).toBeCloseTo(SIM_CATCH_UP, 9);
    expect(stall.alpha).toBeGreaterThanOrEqual(0); expect(stall.alpha).toBeLessThanOrEqual(1);
    // The next ordinary frame is ordinary again.
    expect(clock.tick(416.7)!.steps).toBeLessThanOrEqual(2);
  });

  it.each([[30, 2, 2], [60, 1, 1], [144, 0, 1]])('runs whole fixed steps at %i Hz (%i to %i a frame), alpha within 0..1', (hz, least, most) => {
    const clock = new FrameClock();
    let simulated = 0;
    clock.tick(0);
    clock.tick(1000 / hz);
    for (let frame = 2; frame <= hz * 4 + 1; frame++) {
      const f = clock.tick(frame * 1000 / hz)!;
      expect(f.steps).toBeGreaterThanOrEqual(least);
      expect(f.steps).toBeLessThanOrEqual(most);
      expect(f.dt).toBeCloseTo(f.steps * STEP, 12);
      expect(f.alpha).toBeGreaterThanOrEqual(0); expect(f.alpha).toBeLessThan(1);
      simulated += f.dt;
    }
    expect(simulated).toBeCloseTo(4, 1);
  });

  it('keeps the world on its own time down to about 7 frames a second', () => {
    for (const hz of [7, 10, 15, 24, 30, 60, 120, 144]) {
      const clock = new FrameClock();
      let simulated = 0;
      clock.tick(0);
      for (let frame = 1; frame <= hz * 4; frame++) simulated += clock.tick(frame * 1000 / hz)!.dt;
      expect(simulated, hz + ' Hz').toBeGreaterThan(4 - 2 * STEP);
      expect(simulated, hz + ' Hz').toBeLessThan(4 + 2 * STEP);
    }
  });

  it('starts a new timing baseline after loading without simulating its elapsed time', () => {
    const clock = new FrameClock();
    clock.tick(1000);
    clock.tick(1016);
    clock.reset();
    expect(clock.tick(90000)).toBeNull();
    // The first frame after a baseline always steps once, however short.
    expect(clock.tick(90004)).toMatchObject({ interval: .004, steps: 1 });
    clock.setHidden(true);
    clock.reset();
    expect(clock.tick(100000)).toBeNull();
  });

  it('counts the frames settling after loading one step at most, then catches up as before (A81)', () => {
    const clock = new FrameClock();
    clock.reset(2);
    expect(clock.tick(0)).toBeNull();
    // Slow first paints after the loading screen: one step each, not a stall's worth.
    expect(clock.tick(150)).toMatchObject({ steps: 1 });
    expect(clock.tick(250)).toMatchObject({ steps: 1 });
    // Settled: a slow frame is caught up again.
    expect(clock.tick(350)!.steps).toBeGreaterThan(4);
  });

  it('does not pass invalid or backwards time into actors and resets after an invalid timestamp', () => {
    const clock = new FrameClock();
    clock.tick(100);
    expect(clock.tick(90)).toBeNull();
    expect(clock.tick(Number.NaN)).toBeNull();
    expect(clock.tick(1000)).toBeNull();
    expect(clock.tick(1016)?.steps).toBe(1);
  });
});

describe('interpolated motion (A72)', () => {
  it('draws between the last two steps and restores the simulated transform', () => {
    const motion = new MotionInterpolation(), o = new THREE.Object3D();
    o.position.set(0, 0, 0); motion.capture(1, [o]);
    o.position.set(1, 0, 0); o.rotation.y = 1; motion.capture(2, [o]);
    motion.apply(0.25, 2);
    expect(o.position.x).toBeCloseTo(0.25);
    expect(o.rotation.y).toBeCloseTo(0.25);
    motion.restore();
    expect(o.position.x).toBe(1);
    expect(o.rotation.y).toBeCloseTo(1);
  });

  it('draws where they are: new objects, jumps, objects moved outside a step, and stale records', () => {
    const motion = new MotionInterpolation(), a = new THREE.Object3D(), b = new THREE.Object3D(), c = new THREE.Object3D();
    motion.capture(1, [a, b]);
    a.position.x = 50; b.position.x = 1; motion.capture(2, [a, b, c]);
    b.position.x = 9; // moved by an event between steps
    motion.apply(0.5, 2);
    expect(a.position.x).toBe(50); expect(b.position.x).toBe(9); expect(c.position.x).toBe(0);
    motion.restore();
    expect(b.position.x).toBe(9);
    b.position.x = 2; motion.capture(3, [b]);
    motion.apply(0.5, 4);
    expect(b.position.x).toBe(2);
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
