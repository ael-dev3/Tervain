import {describe, expect, it} from 'vitest';
import {walkVisibilityChanges} from '../../tools/walk-popin-metric.mjs';
const W = 20, H = 20;
const image = (rgb: number[]) => Uint8Array.from({length: W * H * 3}, (_, i) => rgb[i % 3]!);
function patch(source: Uint8Array, rgb: number[], x = 8, y = 8) {
  const out = source.slice();
  for (let j = y; j < y + 4; j++) for (let i = x; i < x + 4; i++) out.set(rgb, (j * W + i) * 3);
  return out;
}
describe('same-camera visibility changes', () => {
  it('detects dark foliage arriving against a bright background as well as its removal', () => {
    const before = image([200, 210, 220]), after = patch(before, [35, 55, 20]);
    for (const [a, b] of [[before, after], [after, before]] as const) {
      const r = walkVisibilityChanges(a, b, W, H);
      expect(r.central.changedPixels).toBe(16);
      expect(r.central.events).toEqual([{pixels: 16, box: [6, 6, 4, 4]}]);
    }
  });
  it('does not miss colour changes with almost equal luminance', () => {
    // Both colours have luminance about 54, but the changed channels are conspicuous.
    const before = image([255, 0, 0]), after = patch(before, [0, 76, 0]);
    expect(walkVisibilityChanges(before, after, W, H).central.events).toHaveLength(1);
  });
  it('keeps natural edge entrances out of the central metric but retains the whole-frame evidence', () => {
    const before = image([200, 210, 220]), after = patch(before, [35, 55, 20], 0, 0);
    const r = walkVisibilityChanges(before, after, W, H);
    expect(r.central.events).toHaveLength(0);
    expect(r.wholeFrame.events).toHaveLength(1);
  });
  it('keeps identical frames and sub-threshold changes clear', () => {
    const before = image([100, 100, 100]);
    expect(walkVisibilityChanges(before, before, W, H).central.changedPixels).toBe(0);
    expect(walkVisibilityChanges(before, patch(before, [110, 110, 110]), W, H).central.changedPixels).toBe(0);
  });
  it('rejects invalid frame/crop contracts', () => {
    expect(() => walkVisibilityChanges(image([0,0,0]), new Uint8Array(2), W, H)).toThrow();
    expect(() => walkVisibilityChanges(image([0,0,0]), image([0,0,0]), W, H, {border: .5})).toThrow();
  });
});
