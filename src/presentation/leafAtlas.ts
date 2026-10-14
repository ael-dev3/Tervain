import * as THREE from 'three';
import { downloadAsset } from './assets/download';

/**
 * Procedural leaf atlases (B12), made offline by tools/leaf-atlas (no third-party art) into public/textures/leaf.
 *
 * Each atlas is 2048 x 2048, 4 x 4 cells of 512 px; cell i is column i % 4, row floor(i / 4), rows counted from the top
 * of the image (v = 0 is the top row, the glTF convention, texture.flipY = false). Two files per atlas: `*-color.webp`
 * (RGB, colour bled past the alpha edge) and `*-data.webp` (lossless: R = alpha, G = thickness, B = underside gain for
 * translucency). They are combined here into straight RGBA with coverage-preserving mips.
 *
 * BROADLEAF cells (a leafy twig each; stage = young / mid / mature, autumn = colour season):
 *   row 0 oak:     0 young, 1 mid, 2 mature, 3 autumn          row 2 orchard: 8 young, 9 mid, 10 mature, 11 autumn
 *   row 1 birch:   4 young, 5 mid, 6 mature, 7 autumn          row 3: 12 oak open, 13 birch weeping, 14 beech sprig, 15 mixed turning
 * CONIFER cells (individually drawn needles; a pad's base is on the left edge for rows 0-1, at the bottom for the rest):
 *   row 0: fir sprays 0-3        row 1: spruce sprigs 4-7        row 2: pine pads 8-11 (one whole branchlet each)
 *   row 3: 12 fir whorl, 13 pine tuft (radial), 14 fir leader, 15 pine leader (stem vertical)
 * FIR sheet (`fir-*.webp`): the fir model's own 8 x 8 sprig layout (256 px cells, same cell positions and silhouettes as the
 * source sheet its cards were cut from), redrawn needle by needle; no UV change is needed. The 4 x 4 CONIFER atlas serves
 * the pine's cards (remapped cell by cell) and is the one new generators should sample.
 * Other generators that sample these atlases should keep to this layout (the manifest lists it too).
 */
export const LEAF_ATLAS_GRID = 4;
export const LEAF_ATLAS_SIZE = 2048;
export const BROADLEAF_CELL_COUNT = 16;
export const CONIFER_PAD = { fir: [0, 1, 2, 3], spruce: [4, 5, 6, 7], pine: [8, 9, 10, 11], firWhorl: 12, pineTuft: 13, firLeader: 14, pineLeader: 15 } as const;

/** Share of the clusters of each broadleaf kind that come from each cell (autumn cells are rare accents). */
const BROADLEAF_WEIGHTS: Record<string, Record<number, number>> = {
  oak: { 0: 0.1, 1: 0.25, 2: 0.3, 3: 0.01, 12: 0.2, 14: 0.05, 15: 0.01 },
  birch: { 4: 0.12, 5: 0.27, 6: 0.25, 7: 0.01, 13: 0.22, 14: 0.08, 15: 0.01 },
  orchard: { 8: 0.12, 9: 0.3, 10: 0.28, 11: 0.01, 14: 0.1, 15: 0.02 },
};
export function broadleafCellWeights(species: string): number[] {
  const share = BROADLEAF_WEIGHTS[species];
  return Array.from({ length: BROADLEAF_CELL_COUNT }, (_, i) => share ? share[i] ?? 0 : [3, 7, 11, 15].includes(i) ? 0.03 : 1);
}

/** Whether the new atlases are used: `?leafatlas=1` turns them on, `?leafatlas=0` off, otherwise the shipped default. */
export const LEAF_ATLAS_DEFAULT = false;
export function leafAtlasWanted(): boolean {
  const query = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('leafatlas') : null;
  return query === '1' ? true : query === '0' ? false : LEAF_ATLAS_DEFAULT;
}

export interface AtlasLevel { width: number; height: number; data: Uint8Array }
export interface LeafAtlasData { broadleaf: AtlasLevel; conifer: AtlasLevel; fir: AtlasLevel }

/** Halve a level (colour weighted by alpha) and scale its alpha so the share of texels past `cutoff` stays `target`. */
export function halveKeepingCoverage(level: AtlasLevel, target: number, cutoff: number): AtlasLevel {
  const w = Math.max(1, level.width >> 1), h = Math.max(1, level.height >> 1), d = new Uint8Array(w * h * 4), s = level.data;
  const histogram = new Uint32Array(256);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0, sum = 0, r0 = 0, g0 = 0, b0 = 0;
    for (let k = 0; k < 4; k++) {
      const sx = Math.min(level.width - 1, x * 2 + (k & 1)), sy = Math.min(level.height - 1, y * 2 + (k >> 1)), i = (sy * level.width + sx) * 4;
      const al = s[i + 3]!;
      r += s[i]! * al; g += s[i + 1]! * al; b += s[i + 2]! * al; a += al; sum += al;
      r0 += s[i]!; g0 += s[i + 1]!; b0 += s[i + 2]!;
    }
    // Colour weighted by alpha (so an edge never darkens); a fully empty block keeps the plain mean of its bled colour.
    const o = (y * w + x) * 4, alpha = Math.round(sum / 4);
    if (a > 0) { d[o] = r / a; d[o + 1] = g / a; d[o + 2] = b / a; } else { d[o] = r0 / 4; d[o + 1] = g0 / 4; d[o + 2] = b0 / 4; }
    d[o + 3] = alpha;
    histogram[alpha]!++;
  }
  // The alpha level above which `target` of the texels lie becomes the cut-off.
  const wanted = target * w * h, limit = cutoff * 255;
  let above = 0, level255 = 255;
  for (; level255 > 0; level255--) { above += histogram[level255]!; if (above >= wanted) break; }
  const scale = Math.min(4, Math.max(0.5, level255 > 0 ? limit / level255 : 4));
  if (Math.abs(scale - 1) > 1e-3) for (let i = 3; i < d.length; i += 4) d[i] = Math.min(255, Math.round(d[i]! * scale));
  return { width: w, height: h, data: d };
}

/** Share of texels whose alpha clears `cutoff` (0..1). */
export function coverageAt(level: AtlasLevel, cutoff: number): number {
  const limit = cutoff * 255; let n = 0;
  for (let i = 3; i < level.data.length; i += 4) if (level.data[i]! > limit) n++;
  return n / (level.width * level.height);
}

export function coverageMips(top: AtlasLevel, cutoff: number): AtlasLevel[] {
  const target = coverageAt(top, cutoff), mips = [top];
  while (mips[mips.length - 1]!.width > 1) mips.push(halveKeepingCoverage(mips[mips.length - 1]!, target, cutoff));
  return mips;
}

const chains = new Map<string, AtlasLevel[]>();
/** A texture over an atlas, with coverage-preserving mips for the material's cut-off (mip data is shared between textures). */
export function leafAtlasTexture(atlas: AtlasLevel, key: string, cutoff: number, name: string): THREE.DataTexture {
  const chainKey = `${key}:${cutoff.toFixed(3)}`;
  let mips = chains.get(chainKey);
  if (!mips) { mips = coverageMips(atlas, cutoff); chains.set(chainKey, mips); }
  const texture = new THREE.DataTexture(mips[0]!.data, atlas.width, atlas.height, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.mipmaps = mips as unknown as THREE.DataTexture['mipmaps'];
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.name = name;
  texture.needsUpdate = true;
  return texture;
}

/** Remap one grid of source cells to atlas pads: `pick(col, row)` gives the destination pad and whether it is mirrored. */
function remapCells(geometry: THREE.BufferGeometry, grid: number, pick: (col: number, row: number) => number): number {
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
  if (!uv) return 0;
  const index = geometry.index, seen = new Uint8Array(uv.count), triangles = Math.floor((index?.count ?? uv.count) / 3);
  const at = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);
  let moved = 0;
  for (let t = 0; t < triangles; t++) {
    const a = at(t, 0), b = at(t, 1), c = at(t, 2);
    const col = Math.min(grid - 1, Math.max(0, Math.floor((uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3 * grid)));
    const row = Math.min(grid - 1, Math.max(0, Math.floor((uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3 * grid)));
    const code = pick(col, row), pad = code >> 1, flip = code & 1;
    for (const v of [a, b, c]) {
      if (seen[v]) continue;
      seen[v] = 1;
      let u = uv.getX(v) * grid - col; const w = uv.getY(v) * grid - row;
      if (flip) u = 1 - u;
      uv.setXY(v, ((pad % LEAF_ATLAS_GRID) + u) / LEAF_ATLAS_GRID, (Math.floor(pad / LEAF_ATLAS_GRID) + w) / LEAF_ATLAS_GRID);
      moved++;
    }
  }
  uv.needsUpdate = true;
  return moved;
}
/** The pine's 2 x 2 branchlet sheet onto the four pine pads. */
export const remapPineToAtlas = (geometry: THREE.BufferGeometry) => remapCells(geometry, 2, (col, row) => (CONIFER_PAD.pine[row * 2 + col]!) * 2);

/* ---- loading ---- */

interface Manifest { schema: 1; files: Record<string, { file: string; bytes: number; sha256: string }> }
let loaded: LeafAtlasData | null = null;
let loading: Promise<LeafAtlasData | null> | null = null;

const url = (file: string) => new URL(`${import.meta.env.BASE_URL}textures/leaf/${file}`, document.baseURI);
const fetchChecked = (file: string, bytes?: number, sha256?: string) => downloadAsset(url(file), { label: `Leaf atlas ${file}`, bytes, sha256, holds: 'image data' });

async function pixels(buffer: ArrayBuffer): Promise<Uint8ClampedArray> {
  const bitmap = await createImageBitmap(new Blob([buffer], { type: 'image/webp' }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' })!;
  context.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

/** Combine the colour and data images (both opaque, so read back exactly) into straight RGBA. */
export function combineAtlas(color: ArrayLike<number>, data: ArrayLike<number>, size: number): AtlasLevel {
  const out = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) { out[i * 4] = color[i * 4]!; out[i * 4 + 1] = color[i * 4 + 1]!; out[i * 4 + 2] = color[i * 4 + 2]!; out[i * 4 + 3] = data[i * 4]!; }
  return { width: size, height: size, data: out };
}

/** Download, check and decode both atlases once. Resolves to null (and warns) when they cannot load: the old art stays. */
export function loadLeafAtlas(): Promise<LeafAtlasData | null> {
  if (loaded) return Promise.resolve(loaded);
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return Promise.resolve(null);
  loading ??= (async () => {
    try {
      const manifest = JSON.parse(new TextDecoder().decode(await fetchChecked('manifest.json'))) as Manifest;
      if (manifest.schema !== 1) throw new Error('The leaf atlas manifest is incompatible.');
      const read = async (key: string) => { const f = manifest.files[key]; if (!f) throw new Error(`The leaf atlas manifest lacks ${key}.`); return pixels(await fetchChecked(f.file, f.bytes, f.sha256)); };
      const [bc, bd, cc, cd, fc, fd] = await Promise.all([read('broadleaf.color'), read('broadleaf.data'), read('conifer.color'), read('conifer.data'), read('fir.color'), read('fir.data')]);
      loaded = { broadleaf: combineAtlas(bc, bd, LEAF_ATLAS_SIZE), conifer: combineAtlas(cc, cd, LEAF_ATLAS_SIZE), fir: combineAtlas(fc, fd, LEAF_ATLAS_SIZE) };
      return loaded;
    } catch (error) {
      console.warn('[leaf atlas] the new leaf atlases could not load; the earlier leaf art stays:', error);
      loading = null;
      return null;
    }
  })();
  return loading;
}

/** The atlases once loaded and wanted; null otherwise (synchronous, for the tree builders). */
export const leafAtlasInUse = (): LeafAtlasData | null => (leafAtlasWanted() ? loaded : null);
/** Test hook. */
export function setLeafAtlasForTest(data: LeafAtlasData | null) { loaded = data; loading = null; chains.clear(); }
