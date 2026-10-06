import { describe, expect, it } from 'vitest';
import { nativeAdjustedOwnerDistance } from '../../src/gothic3/dialogue';

const diegoSourceStart = [-36.93671875, -0.84583984375, -8.788759765625];
const ardea4Friends = [-38.703046875, -0.8606396484375, -9.5053564453125];
const diegoStoredScenePosition = [-34.596641, -0.424346, -19.418203];

describe('native owner-to-entity distance', () => {
  it('keeps the native NPC quarter-distance multiplier', () => {
    expect(nativeAdjustedOwnerDistance([0, 0, 0], [4, 0, 0], true))
      .toEqual({ known: true, value: 100 });
    expect(nativeAdjustedOwnerDistance([0, 0, 0], [4, 0, 0], false))
      .toEqual({ known: true, value: 400 });
  });

  it('places Diego inside the unchanged source proximity gate at his Start point', () => {
    const startDistance = nativeAdjustedOwnerDistance(diegoSourceStart, ardea4Friends, false);
    const storedDistance = nativeAdjustedOwnerDistance(diegoStoredScenePosition, ardea4Friends, false);
    expect(startDistance.known && startDistance.value).toBeLessThanOrEqual(500);
    expect(storedDistance.known && storedDistance.value).toBeGreaterThan(500);
  });

  it('keeps malformed native positions unknown', () => {
    expect(nativeAdjustedOwnerDistance([0, Number.NaN, 0], [1, 2, 3], false))
      .toEqual({ known: false, reason: 'Native distance position is malformed.' });
  });
});
