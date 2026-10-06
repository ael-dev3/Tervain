import { describe, expect, it } from 'vitest';
import { applyNativeAddHitPoints } from '../../src/gothic3/combat';

describe('native AddHitPoints state transition', () => {
  it('adds a positive signed amount before SetHitPoints clamps to maximum', () => {
    expect(applyNativeAddHitPoints(100, 200, 40)).toMatchObject({
      status: 'resolved', value: { before: 100, requestedDelta: 40, wrappedValue: 140, after: 140 },
      evidence: ['Script_Game:10045e20', 'Script_Game:10045b20'],
    });
    expect(applyNativeAddHitPoints(190, 200, 40)).toMatchObject({
      status: 'resolved', value: { wrappedValue: 230, after: 200 },
    });
  });

  it('clamps negative results to zero', () => {
    expect(applyNativeAddHitPoints(10, 200, -25)).toMatchObject({
      status: 'resolved', value: { wrappedValue: -15, after: 0 },
    });
  });

  it('preserves signed32 wrap before the native clamp', () => {
    expect(applyNativeAddHitPoints(0x7fffffff - 2, 0x7fffffff, 10)).toMatchObject({
      status: 'resolved', value: { wrappedValue: -0x80000000 + 7, after: 0 },
    });
  });

  it('rejects invalid points and non-int32 operands without changing state', () => {
    const invalid: readonly (readonly [number, number, number])[] = [
      [201, 200, 1], [1, -1, 1], [1, 200, 1.5], [1, 200, 0x80000000],
    ];
    for (const args of invalid) {
      expect(applyNativeAddHitPoints(...args).status).toBe('unsupported');
    }
  });
});
