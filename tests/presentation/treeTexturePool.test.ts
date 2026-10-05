import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { deduplicateTreeTextures } from '../../src/presentation/treeTexturePool';

vi.stubGlobal('crypto', webcrypto);
afterEach(() => vi.restoreAllMocks());
function file(payload: number[], malformed = false, external = false): ArrayBuffer {
  const json = { asset: { version: '2.0' }, textures: [{ source: 0 }], images: [{ bufferView: 0, mimeType: 'image/png', ...(external ? { uri: 'https://example.test/tree.png' } : {}) }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: malformed ? payload.length + 16 : payload.length }] };
  const encoded = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = Math.ceil(encoded.length / 4) * 4, binaryLength = Math.ceil(payload.length / 4) * 4;
  const buffer = new ArrayBuffer(28 + jsonLength + binaryLength), view = new DataView(buffer), bytes = new Uint8Array(buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, jsonLength, true); view.setUint32(16, 0x4e4f534a, true); bytes.fill(32, 20, 20 + jsonLength); bytes.set(encoded, 20);
  view.setUint32(20 + jsonLength, binaryLength, true); view.setUint32(24 + jsonLength, 0x004e4942, true); bytes.set(payload, 28 + jsonLength);
  return buffer;
}
function model(textures: THREE.Texture[], associations = true): { gltf: GLTF; material: THREE.MeshStandardMaterial } {
  const scene = new THREE.Group(), material = new THREE.MeshStandardMaterial({ map: textures[0], normalMap: textures[1] });
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
  const parser = { associations: new Map(textures.map(texture => [texture, { textures: 0 }])) };
  if (!associations) parser.associations.clear();
  return { gltf: { scene, scenes: [scene], animations: [], cameras: [], asset: { version: '2.0' }, userData: {}, parser } as unknown as GLTF, material };
}
const texture = (image = { width: 2, height: 2, close: vi.fn() }) => new THREE.Texture(image as unknown as HTMLImageElement);
const closeOf = (value: THREE.Texture) => (value.image as unknown as { close: ReturnType<typeof vi.fn> }).close;

describe('embedded tree LOD texture residency', () => {
  it('shares identical content across independent GLBs, closes retired bitmaps once, and leaves canonical source GPU resources intact', async () => {
    const first = texture(), duplicate = texture(), third = texture(), source = model([first]), second = model([duplicate]), last = model([third]);
    const disposeFirst = vi.spyOn(first, 'dispose'), disposeDuplicate = vi.spyOn(duplicate, 'dispose');
    await deduplicateTreeTextures(source.gltf, file([1, 14, 28]));
    await deduplicateTreeTextures(second.gltf, file([1, 14, 28]));
    await deduplicateTreeTextures(last.gltf, file([1, 14, 28]));
    await deduplicateTreeTextures(second.gltf, file([1, 14, 28]));
    expect(second.material.map).toBe(first); expect(last.material.map).toBe(first);
    expect(disposeFirst).not.toHaveBeenCalled(); expect(disposeDuplicate).toHaveBeenCalledTimes(1);
    expect(closeOf(duplicate)).toHaveBeenCalledTimes(1); expect(closeOf(third)).toHaveBeenCalledTimes(1); expect(closeOf(first)).not.toHaveBeenCalled();
    const owned = first.clone(); owned.dispose(); expect(disposeFirst).not.toHaveBeenCalled(); expect(owned.image).toBe(first.image);
  });

  it('does not alias different color spaces, samplers, channels or effective UV transforms', async () => {
    const variants = [texture(), texture(), texture(), texture(), texture()];
    variants[1]!.colorSpace = THREE.SRGBColorSpace; variants[2]!.wrapS = THREE.RepeatWrapping;
    variants[3]!.channel = 1; variants[4]!.offset.x = 0.25;
    for (const value of variants) { const entry = model([value]); await deduplicateTreeTextures(entry.gltf, file([2, 15, 29])); expect(entry.material.map).toBe(value); expect(closeOf(value)).not.toHaveBeenCalled(); }
  });

  it('retains a bitmap still used by another material map despite replacing one view of it', async () => {
    const first = texture(); await deduplicateTreeTextures(model([first]).gltf, file([3, 16, 30]));
    const image = { width: 2, height: 2, close: vi.fn() }, duplicate = texture(image), otherView = texture(image);
    otherView.colorSpace = THREE.SRGBColorSpace;
    const entry = model([duplicate, otherView]); await deduplicateTreeTextures(entry.gltf, file([3, 16, 30]));
    expect(entry.material.map).toBe(first); expect(entry.material.normalMap).toBe(otherView); expect(image.close).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent successful decodes and avoids double-closing one image shared by two retired maps', async () => {
    const canonical = texture(); await deduplicateTreeTextures(model([canonical]).gltf, file([4, 17, 31]));
    const image = { width: 2, height: 2, close: vi.fn() }, a = texture(image), b = texture(image);
    const one = model([a, b]), two = model([texture()]);
    await Promise.all([deduplicateTreeTextures(one.gltf, file([4, 17, 31])), deduplicateTreeTextures(two.gltf, file([4, 17, 31]))]);
    expect(one.material.map).toBe(canonical); expect(one.material.normalMap).toBe(canonical); expect(two.material.map).toBe(canonical);
    expect(image.close).toHaveBeenCalledTimes(1);
  });

  it('rejects external/malformed/unassociated image data before adopting or mutating any map', async () => {
    const bad = texture(), entry = model([bad]), dispose = vi.spyOn(bad, 'dispose');
    await expect(deduplicateTreeTextures(entry.gltf, file([5, 18, 32], true))).rejects.toThrow(/exceeds/);
    expect(entry.material.map).toBe(bad); expect(dispose).not.toHaveBeenCalled(); expect(closeOf(bad)).not.toHaveBeenCalled();
    const missing = model([texture()], false);
    await expect(deduplicateTreeTextures(missing.gltf, file([6, 19, 33]))).rejects.toThrow(/association/);
    const remote = model([texture()]);
    await expect(deduplicateTreeTextures(remote.gltf, file([7, 20, 34], false, true))).rejects.toThrow(/embedded/);
    const invalid = texture(); invalid.repeat.x = Number.NaN;
    await expect(deduplicateTreeTextures(model([invalid]).gltf, file([8, 21, 35]))).rejects.toThrow(/UV transforms/);
    const valid = texture(), next = model([valid]); await deduplicateTreeTextures(next.gltf, file([5, 18, 32])); expect(next.material.map).toBe(valid);
  });
});
