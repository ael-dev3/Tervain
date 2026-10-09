import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * A GLTFLoader for the models under public/models. Their geometry is EXT_meshopt_compression (lossless, written by
 * tools/optimise-models.mjs), so every loader needs the meshopt decoder that three ships.
 */
export function createGltfLoader(): GLTFLoader {
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}
