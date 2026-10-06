import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Keep the delivered binary vertices/skin/curves; remove only image decode for a Node native-geometry test. */
export async function nativeAnimalAsset(id: string) {
  const bytes = readFileSync(new URL(`../../public/models/animals/${id}.glb`, import.meta.url)), jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  json.materials = (json.materials ?? []).map(() => ({ pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: .8 } }));
  delete json.images; delete json.textures; delete json.samplers;
  json.extensionsUsed = (json.extensionsUsed ?? []).filter((name: string) => name !== 'EXT_texture_webp');
  json.extensionsRequired = (json.extensionsRequired ?? []).filter((name: string) => name !== 'EXT_texture_webp');
  const serialized = Buffer.from(JSON.stringify(json)), paddedLength = Math.ceil(serialized.length / 4) * 4;
  const binary = bytes.subarray(20 + jsonLength), decoded = Buffer.alloc(20 + paddedLength + binary.length);
  decoded.writeUInt32LE(0x46546c67, 0); decoded.writeUInt32LE(2, 4); decoded.writeUInt32LE(decoded.length, 8);
  decoded.writeUInt32LE(paddedLength, 12); decoded.writeUInt32LE(0x4e4f534a, 16);
  decoded.fill(0x20, 20, 20 + paddedLength); serialized.copy(decoded, 20); binary.copy(decoded, 20 + paddedLength);
  return new GLTFLoader().parseAsync(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength) as ArrayBuffer, '');
}
