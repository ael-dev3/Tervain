import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { modelAssetUrl } from './assets/modelUrl';
import { observeModelLoad, withModelLoadSlot, type ModelLoadProgress } from './assets/modelLoadQueue';
import { downloadAsset } from './assets/download';

const FILE = 'hero/weathered-wanderer-animated-hero.glb';
let pending: Promise<GLTF> | null = null;

/** Resolve from the built page, including the /Tervain/ Pages subdirectory. */
export function mainHeroUrl(base = import.meta.env.BASE_URL, page = document.baseURI) {
  return modelAssetUrl(FILE, base, page);
}

/** Load once; a failed request is released so the loading screen's Retry works. */
export function loadMainHero(progress?: ModelLoadProgress): Promise<GLTF> {
  if (pending) return observeModelLoad(pending, progress);
  pending = withModelLoadSlot(async () => {
    const url = mainHeroUrl();
    const buffer = await downloadAsset(url, { label: 'The Wanderer model', model: FILE });
    if (buffer.byteLength < 12) throw new Error('The Wanderer model download is incomplete.');
    const header = new DataView(buffer);
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== buffer.byteLength) {
      throw new Error('The Wanderer model download is not a complete GLB 2 file.');
    }
    return await new GLTFLoader().parseAsync(buffer, new URL('.', url).href);
  }).catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return observeModelLoad(pending, progress);
}
