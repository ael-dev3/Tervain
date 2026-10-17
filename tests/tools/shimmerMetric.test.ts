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
  const image = texture(), sample = frameShimmer(image, image, image, w, h, { maxCost: -1 });
  expect(sample.validPixels).toBe(0); expect(sample.shimmerMean).toBeNull();
  expect(summarizeShimmer([sample]).usableFrames).toBe(0);
});
it('compares paired brightness errors on the same motion and alignment mask', () => {
  const image = texture(), previous = translate(image, -2), next = translate(image, 2);
  const bright = image.slice(); bright[25 * w + 25] = 250;
  const motionReference = { previous, current: image, next };
  const clean = frameShimmer(previous, image, next, w, h, { motionReference });
  const noisy = frameShimmer(previous, bright, next, w, h, { motionReference });
  expect(noisy.validPixels).toBe(clean.validPixels);
  expect(clean.sparklePixels).toBe(0);
  expect(noisy.sparklePixels).toBeGreaterThan(0);
  expect(() => frameShimmer(previous, image, next, w, h, {
    motionReference: { ...motionReference, next: new Uint8Array(1) },
  })).toThrow('Invalid motion reference');
});
