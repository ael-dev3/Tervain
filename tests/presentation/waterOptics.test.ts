import { describe, expect, it } from 'vitest';
import { makeWaterOpticsUniforms, waterAbsorptionCoefficients } from '../../src/presentation/waterOptics';

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
