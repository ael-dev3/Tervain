import { expect, it } from 'vitest';
import { frameShimmer, summarizeShimmer } from '../../tools/shimmer-metric.mjs';
const w = 48, h = 48;
const texture = () => Uint8Array.from({ length: w * h }, (_, k) => 70 + (Math.imul(k + 7, 1103515245) >>> 16) % 40);
const translate = (image: Uint8Array, dx: number) => Uint8Array.from({ length: w * h }, (_, k) => image[Math.floor(k / w) * w + Math.max(0, Math.min(w - 1, k % w - dx))]!);
it('does not score static detail as shimmer', () => {
  const image = texture(), sample = frameShimmer(image, image, image, w, h);
  expect(sample.validShare).toBeGreaterThan(.5); expect(sample.shimmerMean).toBe(0); expect(sample.sparkleShare).toBe(0);
});
it('compensates ordinary texture translation instead of mistaking it for sparkle', () => {
  const image = texture(), sample = frameShimmer(translate(image, -2), image, translate(image, 2), w, h, { searchRadius: 4 });
  expect(sample.validShare).toBeGreaterThan(.5); expect(sample.shimmerMean).toBeLessThan(1); expect(sample.sparkleShare).toBe(0);
});
it('detects a localized single-frame brightness spike while rejecting uniform exposure changes', () => {
  const image = texture(), bright = image.slice(); bright[25 * w + 25] = 250;
  const spike = frameShimmer(image, bright, image, w, h);
  expect(spike.sparklePixels).toBeGreaterThan(0); expect(spike.shimmerMean).toBeGreaterThan(0);
  const exposed = Uint8Array.from(image, v => v + 20);
  expect(frameShimmer(image, exposed, image, w, h).sparkleShare).toBe(0);
});
it('reports unusable alignment rather than a perfect score', () => {
  const image = texture(), unrelated = Uint8Array.from(image, v => 255 - v), sample = frameShimmer(unrelated, image, unrelated, w, h, { maxCost: 0, searchRadius: 0 });
  expect(sample.validPixels).toBe(0); expect(sample.shimmerMean).toBeNull();
  expect(summarizeShimmer([sample]).usableFrames).toBe(0);
});

it('rejects uncalibrated unusable coverage and applies explicit quality ceilings', async () => {
  const { evaluateShimmer } = await import('../../tools/shimmer-metric.mjs');
  const good = { summary: { frames: 5, usableFrames: 5, shimmerMean: 2, shimmerFrameP95: 2, sparkleShare: .01, alignmentShare: .95, peaks: [] } };
  expect(evaluateShimmer(good).calibrated).toBe(false);
  expect(evaluateShimmer(good, { maxSparkle: .02, maxResidual: 3 }).pass).toBe(true);
  expect(evaluateShimmer(good, { maxSparkle: .005 }).failures).toContain('sparkle-limit');
  expect(evaluateShimmer({ summary: { ...good.summary, alignmentShare: .1 } }).pass).toBe(false);
  expect(evaluateShimmer({ summary: { ...good.summary, shimmerMean: null, sparkleShare: null, usableFrames: 0 } }).pass).toBe(false);
  expect(() => evaluateShimmer(good, { maxSparkle: NaN })).toThrow();
});
