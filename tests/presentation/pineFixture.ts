import { readFileSync } from 'node:fs';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PINE_FILES, type PineTemplates } from '../../src/presentation/solitaryPine';

export function pineBinary(file: string) {
  const bytes = readFileSync(new URL(`../../public/models/flora/${file}`, import.meta.url));
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  return { bytes, json, length };
}

async function withoutImages(file: string): Promise<GLTF> {
  const { bytes, json, length } = pineBinary(file);
  // Keep every delivered vertex/index/UV and the MASK/PBR material semantics; image pixels have a browser gate.
  json.materials = json.materials.map((material: { alphaMode?: string; alphaCutoff?: number; doubleSided?: boolean }) => ({
    alphaMode: material.alphaMode, alphaCutoff: material.alphaCutoff, doubleSided: material.doubleSided,
    pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 0.9 },
  }));
  delete json.textures; delete json.images; delete json.samplers;
  delete json.extensionsUsed; delete json.extensionsRequired;
  const serialized = Buffer.from(JSON.stringify(json)), padded = Math.ceil(serialized.length / 4) * 4;
  const bin = bytes.subarray(20 + length), decoded = Buffer.alloc(20 + padded + bin.length);
  decoded.writeUInt32LE(0x46546c67, 0); decoded.writeUInt32LE(2, 4); decoded.writeUInt32LE(decoded.length, 8);
  decoded.writeUInt32LE(padded, 12); decoded.writeUInt32LE(0x4e4f534a, 16);
  decoded.fill(0x20, 20, 20 + padded); serialized.copy(decoded, 20); bin.copy(decoded, 20 + padded);
  return new GLTFLoader().parseAsync(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength) as ArrayBuffer, '');
}

export async function pineTemplates(): Promise<PineTemplates> {
  return await Promise.all(PINE_FILES.map(withoutImages)) as unknown as PineTemplates;
}
