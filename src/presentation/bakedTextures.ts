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
/** The checked files so far, and whether they are every one the manifest lists. */
interface Downloads { files: ReadonlyMap<TexKey, Download>; complete: boolean }

let manifest: Promise<BakedManifest> | null = null;
/** Textures whose files arrived and checked out; kept, so a later pass fetches only what is still missing. */
const fetched = new Map<TexKey, Download>();
let pass: Promise<Downloads> | null = null;
/**
 * After the first pass, how many more may run for what is still missing (A70). Each world build may start one, so a
 * surface outage that has since cleared is recovered by changing the quality or starting a journey, not only by a
 * reload; the downloader's own retries still come first within each pass.
 */
const MORE_PASSES = 3;
let passes = 0;
const decoded = new Map<number, Promise<{ images: Map<TexKey, BakedImages>; complete: boolean }>>();
/** The size most recently asked for, which wins if two presets' loads finish out of order; the size and count installed. */
let wanted = 0, installed = 0, installedCount = 0;

function loadManifest(): Promise<BakedManifest> {
  manifest ??= fetchChecked('manifest.json').then((bytes) => {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as BakedManifest;
    if (parsed.schema !== 1 || typeof parsed.textures !== 'object' || !parsed.textures) throw new Error('The surface manifest is incompatible.');
    return parsed;
  }).catch((error) => { manifest = null; throw error; });
  return manifest;
}

/** Every baked texture the manifest lists, as checked JPEG data; a texture that fails is left out (and reported). */
function download(): Promise<Downloads> {
  if (pass) return pass;
  pass = (async () => {
    const listed = await loadManifest();
    if (isComplete(listed) || passes > MORE_PASSES) return { files: new Map(fetched), complete: isComplete(listed) };
    passes++;
    await Promise.all(TEX_KEYS.map(async (key) => {
      const entry = listed.textures[key];
      if (!entry || fetched.has(key)) return;
      try {
        if (!FILE.test(entry.albedo.file) || !FILE.test(entry.normal.file) || !(entry.size >= 64 && entry.size <= 4096)) throw new Error(`The surface manifest's ${key} entry is malformed.`);
        const [albedo, normal] = await Promise.all([
          fetchChecked(entry.albedo.file, entry.albedo.bytes, entry.albedo.sha256),
          fetchChecked(entry.normal.file, entry.normal.bytes, entry.normal.sha256),
        ]);
        fetched.set(key, { size: entry.size, albedo: new Blob([albedo], { type: 'image/jpeg' }), normal: new Blob([normal], { type: 'image/jpeg' }) });
      } catch (error) {
        console.warn(`[surfaces] ${key} keeps its generated texture:`, error);
      }
    }));
    return { files: new Map(fetched), complete: isComplete(listed) };
  })().finally(() => { pass = null; });
  return pass;
}

const isComplete = (listed: BakedManifest) => TEX_KEYS.every((key) => !listed.textures[key] || fetched.has(key));

/** Decode without colour management (the normal map is data), resizing in the decoder when the preset wants fewer texels. */
const decode = (blob: Blob, size: number, native: number): Promise<ImageBitmap> =>
  createImageBitmap(blob, size === native
    ? { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }
    : { colorSpaceConversion: 'none', premultiplyAlpha: 'none', resizeWidth: size, resizeHeight: size, resizeQuality: 'high' });

/** Every baked texture decoded at one size; a texture that fails to decode is left out (and reported). */
async function decodeAll(size: number): Promise<{ images: Map<TexKey, BakedImages>; complete: boolean }> {
  const found = await download().catch((error): Downloads => {
    console.warn('[surfaces] the baked surfaces could not load; the generated textures stay:', error);
    return { files: new Map(), complete: false };
  });
  const images = new Map<TexKey, BakedImages>();
  let complete = found.complete;
  await Promise.all([...found.files].map(async ([key, file]) => {
    try {
      const texels = Math.min(size, file.size);
      const [map, normal] = await Promise.all([decode(file.albedo, texels, file.size), decode(file.normal, texels, file.size)]);
      images.set(key, { map, normal });
    } catch (error) {
      complete = false;
      console.warn(`[surfaces] ${key} could not be decoded; it keeps its generated texture:`, error);
    }
  }));
  return { images, complete };
}

/**
 * Load, check, decode and install the baked surfaces for a preset. Resolves to how many textures that preset has (0 when
 * none could load, which is never an error). The files download once; each preset's decode is kept while it is the one
 * in use, and a call for another preset replaces it. Files that failed are fetched again by a later call, a bounded
 * number of times, keeping those already checked (A70).
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
  const { images, complete } = await request;
  // Not everything loaded: forget this attempt, so the next world build tries again for what is still missing.
  if (!complete && decoded.get(size) === request) decoded.delete(size);
  // A later attempt that recovered more of a preset installs again (A70).
  if (wanted === size && (installed !== size || images.size > installedCount) && images.size) {
    installBakedTextures(images, size, BAKED_TEXTURE_ANISOTROPY[quality]);
    installed = size;
    installedCount = images.size;
    for (const other of [...decoded.keys()]) if (other !== size) decoded.delete(other);
  }
  return images.size;
}
