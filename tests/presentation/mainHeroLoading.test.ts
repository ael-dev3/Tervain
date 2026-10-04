import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loaderMock = vi.hoisted(() => ({
  construct: vi.fn(),
  parseAsync: vi.fn<(buffer: ArrayBuffer, path: string) => Promise<GLTF>>(),
}));
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    constructor() { loaderMock.construct(); }
    parseAsync(buffer: ArrayBuffer, path: string) { return loaderMock.parseAsync(buffer, path); }
  },
}));

// An empty, valid GLB 2 document is enough to exercise transport validation.
// Parsing is mocked so these loading/retry tests do not need images or a GPU.
function glb() {
  const json = new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' } }));
  const jsonLength = Math.ceil(json.length / 4) * 4;
  const bytes = new ArrayBuffer(20 + jsonLength), header = new DataView(bytes);
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, bytes.byteLength, true);
  header.setUint32(12, jsonLength, true);
  header.setUint32(16, 0x4e4f534a, true);
  const body = new Uint8Array(bytes, 20);
  body.fill(0x20); body.set(json);
  return bytes;
}

function malformed(field: number, value: number) {
  const bytes = glb();
  new DataView(bytes).setUint32(field, value, true);
  return bytes;
}

const parsedHero = { scene: { name: 'approved-main-hero' }, animations: [] } as unknown as GLTF;
const fetchMock = vi.fn<typeof fetch>();
let subject: typeof import('../../src/presentation/mainHero');

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  fetchMock.mockReset();
  loaderMock.construct.mockReset();
  loaderMock.parseAsync.mockReset().mockResolvedValue(parsedHero);
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('document', { baseURI: 'https://ael-dev3.github.io/Tervain/index.html' });
  vi.stubEnv('BASE_URL', './');
  subject = await import('../../src/presentation/mainHero');
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('main hero transport and loading-screen retry', () => {
  it('resolves the relative production base inside the Pages repository subdirectory', () => {
    expect(subject.mainHeroUrl().href).toBe('https://ael-dev3.github.io/Tervain/models/hero/weathered-wanderer-hero-50k.glb');
    expect(subject.mainHeroUrl('/Tervain/', 'https://ael-dev3.github.io/Tervain/').href)
      .toBe('https://ael-dev3.github.io/Tervain/models/hero/weathered-wanderer-hero-50k.glb');
    expect(subject.mainHeroUrl('./', 'https://example.test/games/tervain/index.html').href)
      .toBe('https://example.test/games/tervain/models/hero/weathered-wanderer-hero-50k.glb');
    expect(subject.mainHeroUrl('/', 'http://localhost:5173/').href)
      .toBe('http://localhost:5173/models/hero/weathered-wanderer-hero-50k.glb');
  });

  it('shares concurrent requests and retains the parsed hero for later world rebuilds', async () => {
    let completeDownload!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise((resolve) => { completeDownload = resolve; }));
    const first = subject.loadMainHero(), second = subject.loadMainHero();
    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(loaderMock.construct).not.toHaveBeenCalled();
    const buffer = glb();
    completeDownload(new Response(buffer));
    await expect(first).resolves.toBe(parsedHero);
    expect(loaderMock.construct).toHaveBeenCalledOnce();
    expect(loaderMock.parseAsync).toHaveBeenCalledWith(buffer, 'https://ael-dev3.github.io/Tervain/models/hero/');
    expect(subject.loadMainHero()).toBe(first);
    await expect(subject.loadMainHero()).resolves.toBe(parsedHero);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(loaderMock.parseAsync).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { name: 'HTTP failure', response: () => new Response('unavailable', { status: 503 }), message: /HTTP 503/ },
    { name: 'HTML fallback page', response: () => new Response('<html>Pages 404</html>', { headers: { 'content-type': 'text/html; charset=utf-8' } }), message: /page instead of model data/ },
    { name: 'truncated header', response: () => new Response(new ArrayBuffer(8)), message: /download is incomplete/ },
    { name: 'wrong GLB magic', response: () => new Response(malformed(0, 0)), message: /not a complete GLB 2 file/ },
    { name: 'wrong GLB version', response: () => new Response(malformed(4, 1)), message: /not a complete GLB 2 file/ },
    { name: 'truncated GLB body', response: () => {
      const buffer = glb();
      return new Response(buffer.slice(0, buffer.byteLength - 4));
    }, message: /not a complete GLB 2 file/ },
  ])('rejects $name before parsing and permits a successful retry', async ({ response, message }) => {
    fetchMock.mockResolvedValueOnce(response()).mockResolvedValueOnce(new Response(glb()));
    const failed = subject.loadMainHero();
    expect(subject.loadMainHero()).toBe(failed);
    await expect(failed).rejects.toThrow(message);
    expect(loaderMock.parseAsync).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    const retry = subject.loadMainHero();
    expect(retry).not.toBe(failed);
    await expect(retry).resolves.toBe(parsedHero);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loaderMock.parseAsync).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases a failed network request instead of caching its rejection', async () => {
    const outage = new TypeError('network offline');
    fetchMock.mockRejectedValueOnce(outage).mockResolvedValueOnce(new Response(glb()));
    await expect(subject.loadMainHero()).rejects.toBe(outage);
    expect(loaderMock.construct).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    await expect(subject.loadMainHero()).resolves.toBe(parsedHero);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('releases a GLTF parser rejection and parses the newly downloaded retry', async () => {
    const malformedScene = new Error('invalid GLTF accessor');
    fetchMock.mockImplementation(async () => new Response(glb()));
    loaderMock.parseAsync.mockRejectedValueOnce(malformedScene).mockResolvedValueOnce(parsedHero);
    const failed = subject.loadMainHero();
    await expect(failed).rejects.toBe(malformedScene);
    expect(vi.getTimerCount()).toBe(0);
    const retry = subject.loadMainHero();
    expect(retry).not.toBe(failed);
    await expect(retry).resolves.toBe(parsedHero);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loaderMock.construct).toHaveBeenCalledTimes(2);
    expect(loaderMock.parseAsync).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts a stalled download after 60 seconds and lets Retry create a fresh request', async () => {
    let stalledSignal!: AbortSignal;
    fetchMock.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      stalledSignal = options!.signal!;
      stalledSignal.addEventListener('abort', () => reject(new DOMException('download timed out', 'AbortError')), { once: true });
    })).mockResolvedValueOnce(new Response(glb()));
    const stalled = subject.loadMainHero();
    const rejected = expect(stalled).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(59_999);
    expect(stalledSignal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(stalledSignal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    await expect(subject.loadMainHero()).resolves.toBe(parsedHero);
    const retrySignal = fetchMock.mock.calls[1]![1]!.signal;
    expect(retrySignal).not.toBe(stalledSignal);
    expect(retrySignal?.aborted).toBe(false);
  });
});
