import { readFileSync } from 'node:fs';
import { createGltfLoader } from '../../src/presentation/assets/gltfLoader';
import { ROCK_PILE_FILE } from '../../src/presentation/sourceRockPile';

export function rockPileBinary() {
  const bytes = readFileSync(new URL(`../../public/models/scenery/${ROCK_PILE_FILE}`, import.meta.url));
  const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  return { bytes, json, length, binary: bytes.subarray(28 + length) };
}

/** Decode every real runtime surface; embedded image/GPU acceptance belongs to native review. */
export async function rockPileTemplate() {
  const { bytes, json, length } = rockPileBinary();
  json.materials = [{ name: json.materials[0].name, doubleSided: true, pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 1 } }];
  delete json.textures; delete json.images; delete json.samplers;
  delete json.extensionsUsed; delete json.extensionsRequired;
  const text = Buffer.from(JSON.stringify(json)), padded = Math.ceil(text.length / 4) * 4;
  const bin = bytes.subarray(20 + length), decoded = Buffer.alloc(20 + padded + bin.length);
  decoded.writeUInt32LE(0x46546c67, 0); decoded.writeUInt32LE(2, 4); decoded.writeUInt32LE(decoded.length, 8);
  decoded.writeUInt32LE(padded, 12); decoded.writeUInt32LE(0x4e4f534a, 16); decoded.fill(0x20, 20, 20 + padded);
  text.copy(decoded, 20); bin.copy(decoded, 20 + padded);
  return createGltfLoader().parseAsync(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength) as ArrayBuffer, '');
}
