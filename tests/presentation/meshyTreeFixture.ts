import { readFileSync } from 'node:fs';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MESHY_TREE_IDS, MESHY_TREE_LODS, type MeshyTreeTemplates } from '../../src/presentation/meshyTrees';

export function meshyTreeBinary(file: string) {
  const bytes = readFileSync(new URL(`../../public/models/flora/meshy-012/${file}`, import.meta.url));
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  return { bytes, json, length };
}

/** Retain every delivered vertex/index/normal/UV/extras and source PBR factors.
 * Texture pixels and GPU appearance have their own actual-file/native acceptance gates. */
export async function meshyTreeTemplate(file: string): Promise<GLTF> {
  const { bytes, json, length } = meshyTreeBinary(file);
  for (const material of json.materials ?? []) {
    delete material.normalTexture; delete material.occlusionTexture; delete material.emissiveTexture;
    if (material.pbrMetallicRoughness) {
      delete material.pbrMetallicRoughness.baseColorTexture;
      delete material.pbrMetallicRoughness.metallicRoughnessTexture;
    }
  }
  delete json.textures; delete json.images; delete json.samplers;
  const text = Buffer.from(JSON.stringify(json)), padded = Math.ceil(text.length / 4) * 4;
  const binary = bytes.subarray(20 + length), decoded = Buffer.alloc(20 + padded + binary.length);
  decoded.writeUInt32LE(0x46546c67, 0); decoded.writeUInt32LE(2, 4); decoded.writeUInt32LE(decoded.length, 8);
  decoded.writeUInt32LE(padded, 12); decoded.writeUInt32LE(0x4e4f534a, 16); decoded.fill(0x20, 20, 20 + padded);
  text.copy(decoded, 20); binary.copy(decoded, 20 + padded);
  return new GLTFLoader().parseAsync(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength) as ArrayBuffer, '');
}

const cache = new Map<string, Promise<readonly [GLTF, GLTF, GLTF]>>();
/** Reuse immutable parsed templates within a test module; production worlds own only clones. */
export async function meshyTreeTemplates(ids: readonly string[] = MESHY_TREE_IDS): Promise<MeshyTreeTemplates> {
  const result = new Map<string, readonly [GLTF, GLTF, GLTF]>();
  for (const id of ids) {
    let pending = cache.get(id);
    if (!pending) {
      pending = Promise.all(MESHY_TREE_LODS.map(lod => meshyTreeTemplate(`${id}-${lod}.glb`)))
        .then(models => models as unknown as readonly [GLTF, GLTF, GLTF]);
      cache.set(id, pending);
    }
    result.set(id, await pending);
  }
  return result;
}
