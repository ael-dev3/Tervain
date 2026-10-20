import {changeComponents} from '../../../tools/foliage-motion-metric.mjs';

/** Appearance candidates at one fixed camera pose, not semantic object IDs. */
export function walkVisibilityChanges(before, after, width, height, {border = .1, threshold = 20, minPixels = 16} = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || before.length !== width * height * 3 || after.length !== before.length || !Number.isFinite(border) || border < 0 || border >= .5) throw new Error('Invalid visibility comparison');
  const crop = {left: Math.floor(width * border), top: Math.floor(height * border), width: Math.floor(width * (1 - 2 * border)), height: Math.floor(height * (1 - 2 * border))};
  if (crop.width < 1 || crop.height < 1) throw new Error('Empty visibility crop');
  const cut = pixels => {
    const out = new Uint8Array(crop.width * crop.height * 3);
    for (let y = 0; y < crop.height; y++) out.set(pixels.subarray(((y + crop.top) * width + crop.left) * 3, ((y + crop.top) * width + crop.left + crop.width) * 3), y * crop.width * 3);
    return out;
  };
  const b = cut(before), a = cut(after), positive = new Uint8Array(a.length);
  for (let k = 0; k < a.length; k += 3) {
    const delta = .2126 * (a[k] - b[k]) + .7152 * (a[k + 1] - b[k + 1]) + .0722 * (a[k + 2] - b[k + 2]);
    if (delta >= threshold) positive.fill(255, k, k + 3);
  }
  return {crop, central: changeComponents(new Uint8Array(positive.length), positive, crop.width, crop.height, {threshold, minPixels}), wholeFrame: changeComponents(before, after, width, height, {threshold, minPixels})};
}
