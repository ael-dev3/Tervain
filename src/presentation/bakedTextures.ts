import { downloadAsset } from './assets/download';
import { installBakedTextures, TEX_KEYS, type BakedImages, type TexKey } from './buildingTextures';
import type { Quality } from './context';

/**
 * The buildings' baked surfaces (A67): weathered albedo and normal maps made offline by tools/textures/bake-buildings.py
 * into public/textures/buildings, checked against the manifest's sizes and hashes, decoded at the quality preset's
 * size and installed in place of the generated textures. They are an upgrade, not required art: whatever cannot load
 * keeps its generated texture and the game goes on.
 */
export interface BakedFile { file: string; bytes: number; sha256: string }
export interface BakedEntry { size: number; albedo: BakedFile; normal: BakedFile }
export interface BakedManifest { schema: 1; textures: Partial<Record<TexKey, BakedEntry>> }

/** Texels across each texture for each preset; textures baked smaller keep their own size. */
export const BAKED_TEXTURE_SIZE: Record<Quality, number> = { high: 1024, medium: 512, low: 256 };
/** Anisotropic samples for each preset (the renderer clamps to what the GPU offers): walls and roofs seen edge-on stay sharp. */
export const BAKED_TEXTURE_ANISOTROPY: Record<Quality, number> = { high: 16, medium: 8, low: 4 };

const FILE = /^[a-z]+-(albedo|normal)\.jpg$/;

const url = (file: string) => new URL(`${import.meta.env.BASE_URL}textures/buildings/${file}`, document.baseURI);

const fetchChecked = (file: string, bytes?: number, sha256?: string): Promise<ArrayBuffer> =>
  downloadAsset(url(file), { label: `Surface ${file}`, bytes, sha256, holds: 'image data' });

interface Download { size: number; albedo: Blob; normal: Blob }

let downloads: Promise<Map<TexKey, Download>> | null = null;
const decoded = new Map<number, Promise<Map<TexKey, BakedImages>>>();
/** The size most recently asked for, which wins if two presets' loads finish out of order, and the size installed. */
let wanted = 0, installed = 0;

/** Every baked texture the manifest lists, as checked JPEG data; a texture that fails is left out (and reported). */
function download(): Promise<Map<TexKey, Download>> {
  downloads ??= (async () => {
    const manifest = JSON.parse(new TextDecoder().decode(await fetchChecked('manifest.json'))) as BakedManifest;
    if (manifest.schema !== 1 || typeof manifest.textures !== 'object' || !manifest.textures) throw new Error('The surface manifest is incompatible.');
    const found = new Map<TexKey, Download>();
    await Promise.all(TEX_KEYS.map(async (key) => {
      const entry = manifest.textures[key];
      if (!entry) return;
      try {
        if (!FILE.test(entry.albedo.file) || !FILE.test(entry.normal.file) || !(entry.size >= 64 && entry.size <= 4096)) throw new Error(`The surface manifest's ${key} entry is malformed.`);
        const [albedo, normal] = await Promise.all([
          fetchChecked(entry.albedo.file, entry.albedo.bytes, entry.albedo.sha256),
          fetchChecked(entry.normal.file, entry.normal.bytes, entry.normal.sha256),
        ]);
        found.set(key, { size: entry.size, albedo: new Blob([albedo], { type: 'image/jpeg' }), normal: new Blob([normal], { type: 'image/jpeg' }) });
      } catch (error) {
        console.warn(`[surfaces] ${key} keeps its generated texture:`, error);
      }
    }));
    return found;
  })().catch((error) => { downloads = null; throw error; });
  return downloads;
}

/** Decode without colour management (the normal map is data), resizing in the decoder when the preset wants fewer texels. */
const decode = (blob: Blob, size: number, native: number): Promise<ImageBitmap> =>
  createImageBitmap(blob, size === native
    ? { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }
    : { colorSpaceConversion: 'none', premultiplyAlpha: 'none', resizeWidth: size, resizeHeight: size, resizeQuality: 'high' });

/** Every baked texture decoded at one size; a texture that fails to decode is left out (and reported). */
async function decodeAll(size: number): Promise<Map<TexKey, BakedImages>> {
  const found = await download().catch((error) => {
    console.warn('[surfaces] the baked surfaces could not load; the generated textures stay:', error);
    return new Map<TexKey, Download>();
  });
  const images = new Map<TexKey, BakedImages>();
  await Promise.all([...found].map(async ([key, file]) => {
    try {
      const texels = Math.min(size, file.size);
      const [map, normal] = await Promise.all([decode(file.albedo, texels, file.size), decode(file.normal, texels, file.size)]);
      images.set(key, { map, normal });
    } catch (error) {
      console.warn(`[surfaces] ${key} could not be decoded; it keeps its generated texture:`, error);
    }
  }));
  return images;
}

/**
 * Load, check, decode and install the baked surfaces for a preset. Resolves to how many textures that preset has (0 when
 * none could load, which is never an error). The files download once; each preset's decode is kept while it is the one
 * in use, and a call for another preset replaces it.
 */
export async function loadBakedTextures(quality: Quality): Promise<number> {
  // Without an image decoder (tests, very old browsers) the generated textures are all there is.
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return 0;
  const size = BAKED_TEXTURE_SIZE[quality];
  wanted = size;
  let request = decoded.get(size);
  if (!request) {
    request = decodeAll(size);
    decoded.set(size, request);
  }
  const images = await request;
  // Nothing loaded: forget this attempt, so the next world build tries again.
  if (!images.size && decoded.get(size) === request) decoded.delete(size);
  if (wanted === size && installed !== size && images.size) {
    installBakedTextures(images, size, BAKED_TEXTURE_ANISOTROPY[quality]);
    installed = size;
    for (const other of [...decoded.keys()]) if (other !== size) decoded.delete(other);
  }
  return images.size;
}
