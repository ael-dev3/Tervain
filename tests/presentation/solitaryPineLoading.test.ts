import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
const parser = vi.hoisted(() => vi.fn());
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({ GLTFLoader: class { parseAsync = parser; } }));
const fetchMock = vi.fn<typeof fetch>();
function response() {
  const data = new ArrayBuffer(12), header = new DataView(data);
  header.setUint32(0, 0x46546c67, true); header.setUint32(4, 2, true); header.setUint32(8, 12, true);
  return new Response(data, { headers: { 'content-type': 'model/gltf-binary' } });
}
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubGlobal('document', { baseURI: 'https://ael-dev3.github.io/Tervain/index.html' });
  vi.stubGlobal('fetch', fetchMock);
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshStandardMaterial({ alphaTest: 0.42, side: THREE.DoubleSide })));
  parser.mockResolvedValue({ scene }); fetchMock.mockImplementation(async () => response());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('required woodland loading', () => {
  it('shares concurrent loads and retains all three parsed CPU templates for quality rebuilds', async () => {
    const { loadSolitaryPine } = await import('../../src/presentation/solitaryPine');
    const [first, second] = await Promise.all([loadSolitaryPine(), loadSolitaryPine()]);
    expect(await loadSolitaryPine()).toEqual(first);
    expect(first).toEqual(second); expect(fetchMock).toHaveBeenCalledTimes(3); expect(parser).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.every(([url]) => String(url).includes('/models/flora/'))).toBe(true);
  });

  it('retries an HTTP failure while retaining successfully loaded levels', async () => {
    fetchMock.mockResolvedValueOnce(new Response('missing', { status: 404 }));
    const { loadSolitaryPine } = await import('../../src/presentation/solitaryPine');
    await expect(loadSolitaryPine()).rejects.toThrow('HTTP 404');
    await expect(loadSolitaryPine()).resolves.toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('rejects HTML, incomplete binary data and a model with no masked canopy before building a world', async () => {
    const { loadSolitaryPine } = await import('../../src/presentation/solitaryPine');
    fetchMock.mockResolvedValueOnce(new Response('<html>not a model</html>', { headers: { 'content-type': 'text/html' } }));
    await expect(loadSolitaryPine()).rejects.toThrow('page instead');
    fetchMock.mockResolvedValueOnce(new Response(new ArrayBuffer(6)));
    await expect(loadSolitaryPine()).rejects.toThrow('incomplete');
    const empty = new THREE.Group(); empty.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
    parser.mockResolvedValueOnce({ scene: empty });
    await expect(loadSolitaryPine()).rejects.toThrow('no masked foliage');
    await expect(loadSolitaryPine()).resolves.toHaveLength(3);
  });

  it('aborts a stalled request and allows Retry to fetch the missing level', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options!.signal!.addEventListener('abort', () => reject(new Error('forest download timed out')));
    }));
    const { loadSolitaryPine } = await import('../../src/presentation/solitaryPine');
    const stalled = loadSolitaryPine(); const rejection = expect(stalled).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(60_000); await rejection;
    await expect(loadSolitaryPine()).resolves.toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
