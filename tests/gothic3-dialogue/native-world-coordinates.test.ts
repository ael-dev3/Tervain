import { describe, expect, it } from 'vitest';
import { browserHeroPositionToNativeCm, GOTHIC3_HERO_EYE_HEIGHT_METRES } from '../../src/gothic3/native-world-coordinates';

describe('browser Hero to original world coordinates', () => {
  it('adds the legacy scene origin, converts metres to centimetres and reflects Z', () => {
    expect(browserHeroPositionToNativeCm([10, 3, -4], [920, 52, 120])).toEqual([
      Math.fround(93000), Math.fround((55 - GOTHIC3_HERO_EYE_HEIGHT_METRES) * 100), Math.fround(-11600),
    ]);
  });

  it('rejects non-finite input before the original spatial query', () => {
    expect(() => browserHeroPositionToNativeCm([Number.NaN, 0, 0], [0, 0, 0])).toThrow(/Finite/);
  });
});
