import {changeComponents} from './foliage-motion-metric.mjs';

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
  // Dark crowns arriving against sky, disappearing objects and hue changes all matter.
  // A positive-luminance mask would miss the first case and nearly isoluminant changes.
  return {crop, central: changeComponents(cut(before), cut(after), crop.width, crop.height, {threshold, minPixels}), wholeFrame: changeComponents(before, after, width, height, {threshold, minPixels})};
}
