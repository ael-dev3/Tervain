import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeWaterOpticsUniforms, waterAbsorptionCoefficients, WATER_DEPTH_VALIDITY } from '../../src/presentation/waterOptics';

const transmit = (metres: number, clarity: number) => waterAbsorptionCoefficients(clarity).toArray().map(absorption => Math.exp(-absorption * metres));

describe('water absorption in metres', () => {
  it('preserves a clear bottom at the waterline and absorbs deep paths without making dark water opaque blue', () => {
    expect(transmit(0, 0.92)).toEqual([1, 1, 1]);
    const shallow = transmit(0.2, 0.92), deep = transmit(8, 0.92);
    expect(Math.min(...shallow)).toBeGreaterThan(0.89);
    expect(deep[0]).toBeLessThan(0.012);
    expect(deep[1]).toBeLessThan(0.18);
    expect(deep[2]).toBeLessThan(0.38);
    expect(deep[0]).toBeLessThan(deep[1]!);
    expect(deep[1]).toBeLessThan(deep[2]!);
  });

  it('obeys Beer-Lambert path composition and keeps shallower inland water cloudier than the open coast', () => {
    const one = transmit(1, 0.92), three = transmit(3, 0.92), four = transmit(4, 0.92);
    one.forEach((channel, i) => expect(channel * three[i]!).toBeCloseTo(four[i]!, 12));
    const pool = transmit(1, 0.42), stream = transmit(1, 0.64);
    pool.forEach((channel, i) => {
      expect(channel).toBeLessThan(stream[i]!);
      expect(stream[i]).toBeLessThan(one[i]!);
    });
  });

  it('binds a private finite absorption vector per water material and rejects poisoned settings', () => {
    const coast = makeWaterOpticsUniforms(0.92), stream = makeWaterOpticsUniforms(0.64);
    expect(coast.uWaterAbsorption.value).not.toBe(stream.uWaterAbsorption.value);
    expect(coast.uWaterAbsorption.value.equals(waterAbsorptionCoefficients(0.92))).toBe(true);
    expect(waterAbsorptionCoefficients(0).equals(waterAbsorptionCoefficients(0.2))).toBe(true);
    for (const clarity of [Number.NaN, Infinity, -Infinity]) expect(() => makeWaterOpticsUniforms(clarity)).toThrow(RangeError);
  });
});

// Analytic CPU calibration of the shader's shared metre thresholds, not GPU pixel validation.
// Projection/unprojection uses Three's camera matrices rather than duplicating waterViewDepth.
describe('captured water depth validity calibration', () => {
  const validity = (gap: number, refracted: boolean) => THREE.MathUtils.smoothstep(gap,
    refracted ? 0 : -WATER_DEPTH_VALIDITY.foregroundTolerance,
    refracted ? WATER_DEPTH_VALIDITY.refractionFade : 0);

  it('distinguishes a clear UInt depth from real near-far geometry without the former 583 m cutoff', () => {
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1400);
    for (const metres of [0.1, 1, 100, 580, 600, 1000, 1390]) {
      const ndc = new THREE.Vector3(0, 0, -metres).project(camera);
      const raw = ndc.z * 0.5 + 0.5;
      expect(raw).toBeLessThan(WATER_DEPTH_VALIDITY.clearDepth);
      expect(-ndc.clone().unproject(camera).z).toBeCloseTo(metres, 6);
      if (metres >= 600) expect(raw).toBeGreaterThan(0.9999);
    }
    expect(WATER_DEPTH_VALIDITY.clearDepth).toBe(1); // The attachment's actual clear value.
  });

  it('rejects shifted dry foreground and grows continuously behind the surface while keeping the contact bottom clear', () => {
    for (const gap of [-1, -0.03, -0.001, 0]) expect(validity(gap, true)).toBe(0);
    expect(validity(WATER_DEPTH_VALIDITY.refractionFade, true)).toBe(1);
    expect(validity(-WATER_DEPTH_VALIDITY.foregroundTolerance, false)).toBe(0);
    expect(validity(0, false)).toBe(1);
    for (const refracted of [false, true]) {
      let previous = 0;
      for (let i = -40; i <= 80; i++) {
        const weight = validity(i / 1000, refracted);
        expect(weight).toBeGreaterThanOrEqual(previous);
        expect(weight).toBeLessThanOrEqual(1);
        previous = weight;
      }
    }
  });

  it('blends physically absorbed candidates without a color jump at the former 2.5 cm rejection boundary', () => {
    const body = [0.02, 0.11, 0.16], absorption = waterAbsorptionCoefficients(0.92).toArray();
    const absorbed = (color: number[], gap: number) => color.map((channel, i) => {
      const transmission = Math.exp(-absorption[i]! * Math.max(0, gap) * Math.SQRT2);
      return channel * transmission + body[i]! * (1 - transmission);
    });
    const fallback = absorbed([0.28, 0.2, 0.12], 0.4);
    const blend = (gap: number) => absorbed([0.3, 0.35, 0.18], gap).map((channel, i) =>
      THREE.MathUtils.lerp(fallback[i]!, channel, validity(gap, true)));
    expect(blend(-0.001)).toEqual(fallback); // A shifted dry object contributes nothing.
    for (const gap of [0, 0.025, WATER_DEPTH_VALIDITY.refractionFade]) {
      const before = blend(gap - 0.0000001), after = blend(gap + 0.0000001);
      before.forEach((channel, i) => expect(Math.abs(channel - after[i]!)).toBeLessThan(0.00001));
    }
    expect(blend(0.06)).toEqual(absorbed([0.3, 0.35, 0.18], 0.06));
  });
});
