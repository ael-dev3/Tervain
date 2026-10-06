import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { loadAnimalTemplates } from '../../src/presentation/animals';
import { ANIMALS, type AnimalDefinition } from '../../src/presentation/animals/catalog';
import { animalFixture } from './animalFixture';

function bytes() {
  const buffer = new ArrayBuffer(12), view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, 12, true); return buffer;
}
const definition = (id: string): AnimalDefinition => ({ ...ANIMALS.find(animal => animal.species === 'dog')!, id, file: `${id}.glb` });
beforeEach(() => vi.stubGlobal('document', { baseURI: 'https://example.test/Tervain/' }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('required animal model loading', () => {
  it.each([
    ['http', () => new Response('', { status: 404 }), /HTTP 404/],
    ['html', () => new Response('<html>wrong</html>', { headers: { 'content-type': 'text/html' } }), /page instead/],
    ['short', () => new Response(new ArrayBuffer(8)), /incomplete/],
    ['header', () => new Response(new ArrayBuffer(12)), /complete GLB/],
  ] as const)('rejects %s downloads before parsing, then permits retry and caches accepted source art', async (name, failure, error) => {
    const fetcher = vi.fn(async () => failure()); vi.stubGlobal('fetch', fetcher);
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockImplementation(async () => animalFixture()), animal = definition(`animal-load-${name}`);
    await expect(loadAnimalTemplates(undefined, [animal])).rejects.toThrow(error); expect(parse).not.toHaveBeenCalled();
    fetcher.mockImplementation(async () => new Response(bytes()));
    const accepted = await loadAnimalTemplates(undefined, [animal]); expect(accepted.get(animal.id)).toBeTruthy();
    const cached = await loadAnimalTemplates(undefined, [animal]); expect(cached.get(animal.id)).toBe(accepted.get(animal.id));
    expect(fetcher).toHaveBeenCalledTimes(2); expect(parse).toHaveBeenCalledTimes(1);
  });

  it('releases rejected decoded art and stops queued downloads/progress after a required skin fails', async () => {
    const waiting: (() => void)[] = [], requested: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: URL) => {
      requested.push(url.pathname);
      if (url.pathname.includes('missing-call')) return Promise.resolve(new Response(bytes()));
      return new Promise<Response>(resolve => waiting.push(() => resolve(new Response(bytes()))));
    }));
    const rejected = animalFixture(); rejected.animations = rejected.animations.filter(clip => clip.name !== 'Call');
    const mesh = rejected.scene.children.find(object => 'geometry' in object)! as import('three').Mesh, dispose = vi.spyOn(mesh.geometry, 'dispose');
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockResolvedValueOnce(rejected).mockImplementation(async () => animalFixture());
    const progress = vi.fn(), animals = ['missing-call', 'inflight-one', 'inflight-two', 'must-not-start'].map(name => definition(`animal-${name}`));
    await expect(loadAnimalTemplates(progress, animals)).rejects.toThrow(/Call/);
    expect(dispose).toHaveBeenCalledTimes(1); expect(waiting).toHaveLength(2); waiting.forEach(resolve => resolve());
    await loadAnimalTemplates(undefined, animals.slice(1, 3));
    expect(requested).toHaveLength(3); expect(progress).not.toHaveBeenCalled(); expect(parse).toHaveBeenCalledTimes(3);
  });

  it('rejects undecoded embedded pixels, disposes them once, and permits the same required animal to retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes())));
    const source = animalFixture(), image = { width: 0, height: 2, close: vi.fn() }, texture = new THREE.Texture(image as unknown as HTMLImageElement);
    const material = (source.scene.children.find(object => 'geometry' in object)! as THREE.Mesh).material as THREE.MeshStandardMaterial; material.map = texture;
    const dispose = vi.spyOn(texture, 'dispose'), parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockResolvedValueOnce(source).mockImplementation(async () => animalFixture());
    const animal = definition('animal-undecoded-pixels');
    await expect(loadAnimalTemplates(undefined, [animal])).rejects.toThrow(/could not be decoded/);
    expect(dispose).toHaveBeenCalledTimes(1); expect(image.close).toHaveBeenCalledTimes(1);
    expect((await loadAnimalTemplates(undefined, [animal])).get(animal.id)).toBeTruthy(); expect(parse).toHaveBeenCalledTimes(2);
  });
});
