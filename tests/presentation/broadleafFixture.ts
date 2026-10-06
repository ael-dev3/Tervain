import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BROADLEAF_FILE } from '../../src/presentation/sourceBroadleaf';

export function broadleafBinary() {
  const bytes = readFileSync(new URL(`../../public/models/scenery/${BROADLEAF_FILE}`, import.meta.url));
  const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  return { bytes, json, length, binary: bytes.subarray(28 + length) };
}

/** Decode real geometry/extras/material semantics; native image/GPU review is separate. */
export async function broadleafTemplate() {
  const { bytes, json, length } = broadleafBinary();
  for (const material of json.materials) {
    material.pbrMetallicRoughness = { metallicFactor: 0, roughnessFactor: 0.92 };
    delete material.normalTexture;
  }
  delete json.textures; delete json.images; delete json.samplers;
  delete json.extensionsUsed; delete json.extensionsRequired;
  const text = Buffer.from(JSON.stringify(json)), padded = Math.ceil(text.length / 4) * 4;
  const bin = bytes.subarray(20 + length), decoded = Buffer.alloc(20 + padded + bin.length);
  decoded.writeUInt32LE(0x46546c67, 0); decoded.writeUInt32LE(2, 4); decoded.writeUInt32LE(decoded.length, 8);
  decoded.writeUInt32LE(padded, 12); decoded.writeUInt32LE(0x4e4f534a, 16); decoded.fill(0x20, 20, 20 + padded);
  text.copy(decoded, 20); bin.copy(decoded, 20 + padded);
  return new GLTFLoader().parseAsync(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength) as ArrayBuffer, '');
}
