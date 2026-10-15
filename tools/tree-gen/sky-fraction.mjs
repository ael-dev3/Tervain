#!/usr/bin/env node
/** Fraction of sky pixels in a crop of each image: node tools/tree-gen/sky-fraction.mjs a.png b.png [--crop x0,y0,x1,y1 as fractions]. Sky: bright and not green-dominant. */
import sharp from 'sharp';
const args = process.argv.slice(2), ci = args.indexOf('--crop'), crop = (ci >= 0 ? args.splice(ci, 2)[1] : '0,0,1,0.6').split(',').map(Number);
for (const file of args) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const x0 = Math.floor(crop[0] * info.width), x1 = Math.floor(crop[2] * info.width), y0 = Math.floor(crop[1] * info.height), y1 = Math.floor(crop[3] * info.height);
  let sky = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const o = (y * info.width + x) * 3, r = data[o], g = data[o + 1], b = data[o + 2], l = 0.3 * r + 0.59 * g + 0.11 * b;
    n++; if (l > 140 && g <= Math.max(r, b) + 3) sky++;
  }
  console.log(file.split(/[\/]/).pop(), (sky / n).toFixed(4));
}
