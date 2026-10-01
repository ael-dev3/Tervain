import * as THREE from 'three';
import { prepareSheetImage, sheetMisfit, type SheetFit } from './raster';
import { flipRows } from './sheetJob';

/**
 * Replacement sheets. An image at `src/assets/people/<id>.png` (or .jpg, .jpeg, .webp) replaces the painted sheet of the
 * person with that id: the player is `player`, residents their NPC id (`rillford_reeve`), the toll-jumpers `bandit_a` and
 * `bandit_b`, the hamlet's people `fisher`, `fireside` and `keeper`. Vite lists the folder when it builds, so a person
 * without a file costs nothing and no request ever fails. The image must use the person's sheet layout (export it with
 * `npm run people:sheets`; docs/art/people-retexture.md); a plain background colour round the figures is detected and
 * filled from the paint beside it, so a generated image that misses a silhouette by a few pixels still fits.
 */
const FILES = import.meta.glob('../../assets/people/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const byId = new Map<string, string>();
for (const [path, url] of Object.entries(FILES)) {
  const name = path.slice(path.lastIndexOf('/') + 1).replace(/\.(png|jpe?g|webp)$/i, '');
  byId.set(name, url);
}

/** For tools: replace the list of override files (id → URL). */
export function setOverrides(map: Record<string, string>) {
  byId.clear();
  for (const [k, v] of Object.entries(map)) byId.set(k, v);
}

export function overrideUrl(id: string): string | null {
  return byId.get(id) ?? null;
}

export function overrideIds(): string[] {
  return [...byId.keys()];
}

/** Decode an image into square sRGB pixels (image order), scaled to a square if it is not one. */
export async function decodeSheetImage(url: string): Promise<{ pixels: Uint8ClampedArray; size: number }> {
  const blob = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const size = Math.max(bmp.width, bmp.height);
  if (bmp.width !== bmp.height) console.warn(`people sheet ${url} is ${bmp.width}x${bmp.height}; sheets are square, so it is stretched to ${size}x${size}`);
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : Object.assign(document.createElement('canvas'), { width: size, height: size });
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  ctx.drawImage(bmp, 0, 0, size, size);
  bmp.close();
  return { pixels: ctx.getImageData(0, 0, size, size).data, size };
}

/** How a fit reads in a message: holes and stray paint as shares of the person (edge gaps are repaired and not shown). */
export function describeFit(fit: SheetFit): string {
  const pc = (n: number) => `${fit.covered ? ((100 * n) / fit.covered).toFixed(1) : '0.0'}%`;
  return `holes ${pc(fit.holes)}, stray paint ${pc(fit.spill)}`;
}

/** A replacement image as a sheet texture: its background gaps filled from the person's coverage mask. */
export function overrideTexture(pixels: Uint8ClampedArray, covered: Uint8Array, size: number, name: string): THREE.DataTexture {
  const rgba = new Uint8Array(pixels.buffer.slice(pixels.byteOffset, pixels.byteOffset + pixels.byteLength));
  const fit = prepareSheetImage(rgba, covered, size, size);
  if (sheetMisfit(fit)) {
    console.warn(`${name} may not fit this person's current shape (${describeFit(fit)}). Re-export the sheet with npm run people:sheets and check it with npm run people:check (docs/art/people-retexture.md).`);
  }
  const t = new THREE.DataTexture(flipRows(rgba, size, size), size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.name = name;
  t.needsUpdate = true;
  return t;
}
