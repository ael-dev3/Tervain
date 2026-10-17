import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Needle cards use the shared conifer atlas (public/textures/leaf/conifer-*.webp, see src/presentation/leafAtlas.ts):
 * 4 x 4 cells of 512 px, row 0 at the top; cells 8-11 are whole pine branchlets (base at the cell bottom, centred),
 * 13 a radial pine tuft, 15 the pine leader. Colour and data (R = alpha) files are merged into one RGBA image here.
 */
export const NEEDLE_ATLAS = { size: 2048, cells: 4, cellInset: 0.006 };
export const PINE_PAD_CELLS = [8, 9, 10, 11];
export const PINE_TUFT_CELL = 13;
export const PINE_LEADER_CELL = 15;

/** UV rectangle [u0, v0, u1, v1] of a cell; glTF v runs down the image, so v0 is the card's tip edge. */
export function needleCellUv(index) {
  const n = NEEDLE_ATLAS.cells, col = index % n, row = Math.floor(index / n), i = NEEDLE_ATLAS.cellInset;
  return [(col + i) / n, (row + i) / n, (col + 1 - i) / n, (row + 1 - i) / n];
}

export async function loadNeedleAtlas(root) {
  const dir = path.join(root, 'public/textures/leaf');
  const color = await sharp(fs.readFileSync(path.join(dir, 'conifer-color.webp'))).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const data = await sharp(fs.readFileSync(path.join(dir, 'conifer-data.webp'))).raw().toBuffer({ resolveWithObject: true });
  const S = color.info.width, n = S * S, rgba = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    rgba[i * 4] = color.data[i * color.info.channels]; rgba[i * 4 + 1] = color.data[i * color.info.channels + 1]; rgba[i * 4 + 2] = color.data[i * color.info.channels + 2];
    rgba[i * 4 + 3] = data.data[i * data.info.channels];
  }
  return { size: S, rgba };
}
