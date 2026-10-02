import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Decode the delivered rig/geometry/curves in Node. Rendering/texture pixels require the browser visual gate. */
export async function loadHeroWithoutImages(): Promise<GLTF> {
  const bytes = readFileSync(new URL('../../public/models/hero/weathered-wanderer-hero-50k.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  // Texture decoding needs browser ImageBitmap. Remove only image/material references in this test copy,
  // preserving every authored vertex, joint, inverse bind and animation sample from the actual game binary.
  json.materials = (json.materials ?? []).map(() => ({ pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 0.8 } }));
  delete json.textures; delete json.images; delete json.samplers;
  json.extensionsUsed = (json.extensionsUsed ?? []).filter((name: string) => name !== 'EXT_texture_webp');
  json.extensionsRequired = (json.extensionsRequired ?? []).filter((name: string) => name !== 'EXT_texture_webp');
  const serialized = Buffer.from(JSON.stringify(json));
  const paddedLength = Math.ceil(serialized.length / 4) * 4;
  const binaryStart = 20 + jsonLength;
  const binary = bytes.subarray(binaryStart);
  const decoded = Buffer.alloc(20 + paddedLength + binary.length);
  decoded.writeUInt32LE(0x46546c67, 0); decoded.writeUInt32LE(2, 4); decoded.writeUInt32LE(decoded.length, 8);
  decoded.writeUInt32LE(paddedLength, 12); decoded.writeUInt32LE(0x4e4f534a, 16);
  decoded.fill(0x20, 20, 20 + paddedLength); serialized.copy(decoded, 20); binary.copy(decoded, 20 + paddedLength);
  return new GLTFLoader().parseAsync(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength) as ArrayBuffer, '');
}

export function meshes(root: THREE.Object3D): THREE.Mesh[] {
  const result: THREE.Mesh[] = [];
  root.traverse((object) => { if ((object as THREE.Mesh).isMesh) result.push(object as THREE.Mesh); });
  return result;
}
