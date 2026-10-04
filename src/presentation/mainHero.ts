import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const FILE = 'models/hero/weathered-wanderer-hero-50k.glb';
let pending: Promise<GLTF> | null = null;

/** Resolve from the built page, including the /Tervain/ Pages subdirectory. */
export function mainHeroUrl(base = import.meta.env.BASE_URL, page = document.baseURI) {
  return new URL(`${base}${FILE}`, page);
}

/** Load once; a failed request is released so the loading screen's Retry works. */
export function loadMainHero(): Promise<GLTF> {
  if (pending) return pending;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  pending = (async () => {
    const url = mainHeroUrl();
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`The Wanderer model could not load (HTTP ${response.status}).`);
    if (response.headers.get('content-type')?.includes('text/html')) throw new Error('The Wanderer model URL returned a page instead of model data.');
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 12) throw new Error('The Wanderer model download is incomplete.');
    const header = new DataView(buffer);
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== buffer.byteLength) {
      throw new Error('The Wanderer model download is not a complete GLB 2 file.');
    }
    return new GLTFLoader().parseAsync(buffer, new URL('.', url).href);
  })().catch((error: unknown) => {
    pending = null;
    throw error;
  }).finally(() => clearTimeout(timeout));
  return pending;
}
