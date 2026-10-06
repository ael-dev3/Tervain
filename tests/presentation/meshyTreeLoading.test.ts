import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadMeshyTrees } from '../../src/presentation/meshyTrees';

type Failure = 'none' | 'albedo-null' | 'normal-null' | 'zero-pixels';
function model(failure: Failure = 'none') {
  const image = { width: failure === 'zero-pixels' ? 0 : 2, height: 2, close: vi.fn() };
  const texture = new THREE.Texture(image as unknown as HTMLImageElement);
  const scene = new THREE.Group(), geometries: THREE.BufferGeometry[] = [], materials: THREE.MeshStandardMaterial[] = [];
  for (const [i, name] of ['Wood', 'Foliage'].entries()) {
    const geometry = new THREE.BoxGeometry(1, 2, 1), material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
    if (failure === 'albedo-null' && i === 1) material.map = null;
    const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.position.y = i * 3; scene.add(mesh);
    geometries.push(geometry); materials.push(material);
  }
  const sourceMaterials = materials.map(() => ({ pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
    ...(failure === 'normal-null' ? { normalTexture: { index: 0 } } : {}) }));
  const associations = new Map<THREE.Object3D | THREE.Material | THREE.Texture, { textures?: number; materials?: number }>([[texture, { textures: 0 }]]);
  materials.forEach((material, i) => associations.set(material, { materials: i }));
  const gltf = { scene, scenes: [scene], animations: [], cameras: [], asset: { version: '2.0' }, userData: {},
    parser: { json: { materials: sourceMaterials }, associations } } as unknown as GLTF;
  return { gltf, texture, image, geometries, materials };
}
function bytes(seed: number): ArrayBuffer {
  const json = { asset: { version: '2.0' }, textures: [{ source: 0 }], images: [{ bufferView: 0, mimeType: 'image/png' }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 4 }] };
  const encoded = new TextEncoder().encode(JSON.stringify(json)), length = Math.ceil(encoded.length / 4) * 4;
  const buffer = new ArrayBuffer(length + 32), view = new DataView(buffer), data = new Uint8Array(buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, length, true); view.setUint32(16, 0x4e4f534a, true); data.fill(32, 20, 20 + length); data.set(encoded, 20);
  view.setUint32(20 + length, 4, true); view.setUint32(24 + length, 0x004e4942, true); data.set([seed, 111, 39, 82], 28 + length);
  return buffer;
}
const response = (seed: number) => new Response(bytes(seed), { headers: { 'content-type': 'model/gltf-binary' } });
beforeEach(() => { vi.stubGlobal('document', { baseURI: 'https://example.test/Tervain/' }); vi.stubGlobal('crypto', webcrypto); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('required tree download and rejected-parse lifecycle', () => {
  it.each([
    ['http', () => new Response('', { status: 404 }), /HTTP 404/],
    ['html', () => new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }), /page instead/],
    ['short', () => new Response(new ArrayBuffer(8)), /incomplete/],
    ['header', () => new Response(new ArrayBuffer(12)), /complete GLB/],
  ] as const)('rejects %s content before decoding and retries the same required tree successfully', async (name, badResponse, error) => {
    const fetcher = vi.fn(async () => badResponse()); vi.stubGlobal('fetch', fetcher);
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockImplementation(async () => model().gltf);
    const id = `loading-${name}-retry`;
    await expect(loadMeshyTrees([id])).rejects.toThrow(error); expect(parse).not.toHaveBeenCalled();
    fetcher.mockImplementation(async () => response(60 + ['http', 'html', 'short', 'header'].indexOf(name)));
    const result = await loadMeshyTrees([id]); expect(result.get(id)).toHaveLength(3); expect(parse).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenCalledTimes(6);
  });

  it.each(['albedo-null', 'normal-null', 'zero-pixels'] as const)('rejects %s texture decoding, releases each rejected GPU/image handle once, then permits a retry', async failure => {
    const fetcher = vi.fn(async () => response(80 + ['albedo-null', 'normal-null', 'zero-pixels'].indexOf(failure))); vi.stubGlobal('fetch', fetcher);
    const rejected: ReturnType<typeof model>[] = [];
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockImplementation(async () => {
      const next = model(failure); rejected.push(next);
      next.geometries.forEach(geometry => vi.spyOn(geometry, 'dispose')); next.materials.forEach(material => vi.spyOn(material, 'dispose')); vi.spyOn(next.texture, 'dispose');
      return next.gltf;
    });
    const id = `loading-${failure}-retry`;
    await expect(loadMeshyTrees([id])).rejects.toThrow(/could not be decoded/);
    expect(rejected).toHaveLength(3);
    for (const item of rejected) {
      item.geometries.forEach(geometry => expect(geometry.dispose).toHaveBeenCalledTimes(1));
      item.materials.forEach(material => expect(material.dispose).toHaveBeenCalledTimes(1));
      expect(item.texture.dispose).toHaveBeenCalledTimes(1); expect(item.image.close).toHaveBeenCalledTimes(1);
    }
    parse.mockImplementation(async () => model().gltf);
    const result = await loadMeshyTrees([id]); expect(result.get(id)).toHaveLength(3); expect(fetcher).toHaveBeenCalledTimes(6);
    expect(result.get(id)![0]!.scene.children).toHaveLength(2);
  });

  it('keeps successful templates cached instead of disposing or fetching them again', async () => {
    const fetcher = vi.fn(async () => response(94)); vi.stubGlobal('fetch', fetcher);
    const parsed: ReturnType<typeof model>[] = [];
    vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockImplementation(async () => {
      const next = model(); parsed.push(next); next.geometries.forEach(geometry => vi.spyOn(geometry, 'dispose')); return next.gltf;
    });
    const first = await loadMeshyTrees(['loading-accepted-cache']), next = await loadMeshyTrees(['loading-accepted-cache']);
    expect(next.get('loading-accepted-cache')).toEqual(first.get('loading-accepted-cache')); expect(fetcher).toHaveBeenCalledTimes(3);
    for (const item of parsed) item.geometries.forEach(geometry => expect(geometry.dispose).not.toHaveBeenCalled());
  });

  it('stops stale progress and new jobs after one failure while shared in-flight successful requests finish', async () => {
    const waiting: (() => void)[] = [], requested: string[] = [];
    vi.stubGlobal('fetch', vi.fn((input: URL) => {
      const path = input.pathname; requested.push(path);
      if (path.includes('loading-fail-fast')) return Promise.resolve(new Response('', { status: 404 }));
      return new Promise<Response>(resolve => waiting.push(() => resolve(response(path.includes('loading-inflight-b') ? 95 : 96))));
    }));
    vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockImplementation(async () => model().gltf);
    const progress = vi.fn();
    await expect(loadMeshyTrees(['loading-fail-fast', 'loading-inflight-b', 'loading-inflight-c', 'loading-must-not-start'], progress)).rejects.toThrow(/HTTP 404/);
    expect(waiting).toHaveLength(6); waiting.forEach(resolve => resolve());
    await loadMeshyTrees(['loading-inflight-b', 'loading-inflight-c']);
    expect(progress).not.toHaveBeenCalled(); expect(requested).toHaveLength(9);
    expect(requested.some(path => path.includes('loading-must-not-start'))).toBe(false);
  });
});
