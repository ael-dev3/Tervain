// Builds the procedural leaf atlases into public/textures/leaf (B12). Usage: node tools/leaf-atlas/build.mjs [--preview dir]
// Output per atlas: <name>-color.webp (RGB, lossy, colour bled past the alpha edge) and <name>-data.webp (lossless;
// R = alpha, G = thickness, B = underside gain), plus manifest.json with sizes, hashes and the cell layout.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BROADLEAF_CELLS, drawBroadleafCell } from './broadleaf.mjs';
import { CONIFER_CELLS, drawConiferCell } from './conifer.mjs';
import { clamp, coverage } from './raster.mjs';
import { drawFirSheet, readGlbImage } from './firsheet.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sharp = createRequire(join(root, 'package.json'))('sharp');
const out = join(root, 'public', 'textures', 'leaf');
const previewAt = process.argv.indexOf('--preview');
const SIZE = 2048;
const broadleafTarget = [84.3, 108.7, 40.3]; // the earlier generated cluster atlas' alpha-weighted mean, so crowns keep their colour

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const srgb = (l) => 255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
/** The mean sRGB of the source sheets' needles times the material factors the game applied to them (meshyTrees CONIFER_LEAF_LIFT). */
const firTarget = [[45.6, 0.84, 2.3], [56.1, 0.9, 2.45], [29.7, 0.8, 2.2]].map(([m, f, l]) => srgb(lin(m) * f * l));
const pineTarget = [103.1, 112.8, 58.2];

function weightedMean(cells, ids) {
  const m = [0, 0, 0]; let w = 0;
  for (const i of ids) { const c = cells[i]; for (let j = 0; j < c.a.length; j++) { const a = c.a[j]; m[0] += c.r[j] * a; m[1] += c.g[j] * a; m[2] += c.b[j] * a; w += a; } }
  return m.map((v) => v / w);
}
/** Scale cells' colour so their alpha-weighted mean lands on `target` (a few passes: clamping bends it). */
function matchMean(cells, ids, target) {
  for (let pass = 0; pass < 4; pass++) {
    const m = weightedMean(cells, ids);
    const g = target.map((t, k) => t / m[k]);
    for (const i of ids) { const c = cells[i]; for (let j = 0; j < c.a.length; j++) { c.r[j] = clamp(c.r[j] * g[0], 0, 255); c.g[j] = clamp(c.g[j] * g[1], 0, 255); c.b[j] = clamp(c.b[j] * g[2], 0, 255); } }
  }
}

/** Pull each cell's mean luma toward `luma` (strength 0..1), so no cluster reads much paler or darker than the rest. */
function levelLuma(cells, luma, strength) {
  for (const c of cells) {
    let l = 0, w = 0;
    for (let j = 0; j < c.a.length; j++) { l += (0.3 * c.r[j] + 0.59 * c.g[j] + 0.11 * c.b[j]) * c.a[j]; w += c.a[j]; }
    const g = Math.pow(luma / (l / w), strength);
    for (let j = 0; j < c.a.length; j++) { c.r[j] = clamp(c.r[j] * g, 0, 255); c.g[j] = clamp(c.g[j] * g, 0, 255); c.b[j] = clamp(c.b[j] * g, 0, 255); }
  }
}

function assemble(cells, GRID = 4) {
  const CELL = SIZE / GRID;
  const color = Buffer.alloc(SIZE * SIZE * 3), data = Buffer.alloc(SIZE * SIZE * 3);
  cells.forEach((c, i) => {
    const cu = i % GRID, cv = Math.floor(i / GRID);
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      const j = y * CELL + x, o = ((cv * CELL + y) * SIZE + cu * CELL + x) * 3;
      color[o] = clamp(Math.round(c.r[j]), 0, 255); color[o + 1] = clamp(Math.round(c.g[j]), 0, 255); color[o + 2] = clamp(Math.round(c.b[j]), 0, 255);
      data[o] = Math.round(clamp(c.a[j], 0, 1) * 255); data[o + 1] = Math.round(clamp(c.thick[j], 0, 1) * 255); data[o + 2] = Math.round(clamp(c.under[j], 0, 1) * 255);
    }
  });
  return { color, data };
}

const files = {};
async function write(name, buffer, options, label) {
  const bytes = await sharp(buffer, { raw: { width: SIZE, height: SIZE, channels: 3 } }).webp(options).toBuffer();
  const file = `${name}.webp`;
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, file), bytes);
  files[label] = { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  console.log(file, bytes.length);
}

const layout = {};
async function atlas(name, specs, draw, seedBase, post, GRID = 4, made = null) {
  const cells = made ?? specs.map((spec, i) => draw(spec, seedBase + i * 7919, SIZE / GRID));
  post?.(cells);
  const { color, data } = assemble(cells, GRID);
  await write(`${name}-color`, color, { quality: 92, effort: 6, smartSubsample: false }, `${name}.color`);
  await write(`${name}-data`, data, { lossless: true, effort: 6 }, `${name}.data`);
  layout[name] = { size: SIZE, grid: GRID, cells: specs.map((s, i) => ({ index: i, col: i % GRID, row: Math.floor(i / GRID), ...s })), coverage: cells.map((c) => +coverage(c.a, 0.3).toFixed(3)) };
  if (previewAt > 0) {
    const dir = process.argv[previewAt + 1], flat = Buffer.alloc(SIZE * SIZE * 3);
    for (let i = 0; i < SIZE * SIZE; i++) { const a = data[i * 3] / 255; for (let k = 0; k < 3; k++) flat[i * 3 + k] = color[i * 3 + k] * a + 128 * (1 - a); }
    mkdirSync(dir, { recursive: true });
    await sharp(flat, { raw: { width: SIZE, height: SIZE, channels: 3 } }).png().toFile(join(dir, `${name}-preview.png`));
  }
}

await atlas('broadleaf', BROADLEAF_CELLS, drawBroadleafCell, 1000, (cells) => { levelLuma(cells, 90, 0.9); matchMean(cells, [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14], broadleafTarget); });
await atlas('conifer', CONIFER_CELLS, drawConiferCell, 5000, (cells) => {
  matchMean(cells, [0, 1, 2, 3, 4, 5, 6, 7, 12, 14], firTarget);
  matchMean(cells, [8, 9, 10, 11, 13, 15], pineTarget);
});
{
  const source = await sharp(readGlbImage(join(root, 'public/models/flora/meshy-012/fir-spire-near.glb'), /foliage/i)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cells = drawFirSheet({ data: source.data, width: source.info.width }, 8);
  await atlas('fir', cells.map((_, i) => ({ name: 'fir-source-cell-' + i })), null, 0, (all) => matchMean(all, all.map((_, i) => i), firTarget), 8, cells);
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ schema: 1, generator: 'tools/leaf-atlas/build.mjs', files, layout }, null, 1) + '\n');
console.log('manifest written');
