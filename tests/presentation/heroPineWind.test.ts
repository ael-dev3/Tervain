import * as THREE from 'three';
import { expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createGltfLoader } from '../../src/presentation/assets/gltfLoader';
import { createHeroPineForest, HERO_PINE_FILES, type HeroPineTemplates } from '../../src/presentation/heroPine';
import { pineBinary } from './pineFixture';

async function template(file: string): Promise<GLTF> {
  const { bytes, json, length } = pineBinary(file);
  // Preserve delivered geometry, attributes and extras; image pixels are tested in the browser.
  json.materials = json.materials.map((m: { alphaMode?: string; alphaCutoff?: number }) => ({
    alphaMode: m.alphaMode, alphaCutoff: m.alphaCutoff,
  }));
  delete json.images; delete json.textures; delete json.samplers;
  const text = Buffer.from(JSON.stringify(json)), padded = Math.ceil(text.length / 4) * 4;
  const binary = bytes.subarray(20 + length), decoded = Buffer.alloc(20 + padded + binary.length);
  decoded.writeUInt32LE(0x46546c67, 0); decoded.writeUInt32LE(2, 4); decoded.writeUInt32LE(decoded.length, 8);
  decoded.writeUInt32LE(padded, 12); decoded.writeUInt32LE(0x4e4f534a, 16); decoded.fill(0x20, 20, 20 + padded);
  text.copy(decoded, 20); binary.copy(decoded, 20 + padded);
  return createGltfLoader().parseAsync(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength) as ArrayBuffer, '');
}

it('keeps every authored pine branch anchor in the scaled vertex space at all LODs', async () => {
  const templates = await Promise.all(HERO_PINE_FILES.map(template)) as unknown as HeroPineTemplates;
  const forest = createHeroPineForest(templates);
  try {
    for (let seed = 0; seed < 4; seed++) {
      const tree = forest.variant(seed);
      for (let lod = 0; lod < 3; lod++) for (const part of ['wood', 'leaf'] as const) {
        const source = templates[lod]!.scene.getObjectByName(`v${seed}-${part}`) as THREE.Mesh<THREE.BufferGeometry>;
        const geometry = tree.lods[lod]![part]!;
        const height = (templates[0].scene.getObjectByName(`v${seed}-wood`)!.userData.height as number);
        const scale = tree.height / height;
        expect(Math.abs(scale - 1)).toBeGreaterThan(0.1); // A unit-scale fixture would miss the defect.
        const anchor = geometry.getAttribute('_pivot'), authored = source.geometry.getAttribute('_pivot');
        const position = geometry.getAttribute('position'), original = source.geometry.getAttribute('position');
        expect(anchor).not.toBe(authored);
        for (let i = 0; i < anchor.count; i++) for (let axis = 0; axis < 3; axis++) {
          expect(anchor.getComponent(i, axis)).toBeCloseTo(authored.getComponent(i, axis) * scale, 4);
          expect(position.getComponent(i, axis)).toBeCloseTo(original.getComponent(i, axis) * scale, 4);
        }
        expect(Array.from(geometry.getAttribute('_wind').array)).toEqual(Array.from(source.geometry.getAttribute('_wind').array));
        expect(Array.from(geometry.index!.array)).toEqual(Array.from(source.geometry.index!.array));
      }
    }
  } finally { forest.dispose(); }
});
