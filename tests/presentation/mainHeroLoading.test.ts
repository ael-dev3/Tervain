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
    setMeshoptDecoder() { return this; }
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
let policy: typeof import('../../src/presentation/assets/download').DOWNLOAD_POLICY;

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
  // The reset module graph has its own download policy: keep its tries, without the pauses between them.
  const download = await import('../../src/presentation/assets/download');
  download.DOWNLOAD_POLICY.backoffMs = [0, 0];
  policy = download.DOWNLOAD_POLICY;
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
    expect(subject.mainHeroUrl().href).toBe('https://ael-dev3.github.io/Tervain/models/hero/weathered-wanderer-hero-sealed.glb');
    expect(subject.mainHeroUrl('/Tervain/', 'https://ael-dev3.github.io/Tervain/').href)
      .toBe('https://ael-dev3.github.io/Tervain/models/hero/weathered-wanderer-hero-sealed.glb');
    expect(subject.mainHeroUrl('./', 'https://example.test/games/tervain/index.html').href)
      .toBe('https://example.test/games/tervain/models/hero/weathered-wanderer-hero-sealed.glb');
    expect(subject.mainHeroUrl('/', 'http://localhost:5173/').href)
      .toBe('http://localhost:5173/models/hero/weathered-wanderer-hero-sealed.glb');
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

  it('reports decoding completion to concurrent loading screens and cached rebuilds without duplicating the model', async () => {
    let decode!: (asset: GLTF) => void;
    loaderMock.parseAsync.mockImplementationOnce(() => new Promise(resolve => { decode = resolve; }));
    fetchMock.mockResolvedValueOnce(new Response(glb()));
    const firstProgress = vi.fn(), laterProgress = vi.fn();
    const first = subject.loadMainHero(firstProgress);
    await vi.waitFor(() => expect(loaderMock.parseAsync).toHaveBeenCalledOnce());
    const later = subject.loadMainHero(laterProgress);
    expect(later).toBe(first);
    expect(firstProgress.mock.calls).toEqual([[0, 1]]);
    expect(laterProgress.mock.calls).toEqual([[0, 1]]);
    decode(parsedHero); await first;
    expect(firstProgress.mock.calls).toEqual([[0, 1], [1, 1]]);
    expect(laterProgress.mock.calls).toEqual([[0, 1], [1, 1]]);
    const cachedProgress = vi.fn();
    await subject.loadMainHero(cachedProgress);
    expect(cachedProgress.mock.calls).toEqual([[1, 1]]);
    expect(fetchMock).toHaveBeenCalledOnce(); expect(loaderMock.parseAsync).toHaveBeenCalledOnce();
  });

  it.each([
    { name: 'HTTP failure', response: () => new Response('missing', { status: 404 }), message: /HTTP 404/ },
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

  it.each([
    { name: 'server error', fail: () => fetchMock.mockResolvedValueOnce(new Response('unavailable', { status: 503 })) },
    { name: 'rate limit', fail: () => fetchMock.mockResolvedValueOnce(new Response('slow down', { status: 429 })) },
    { name: 'network outage', fail: () => fetchMock.mockRejectedValueOnce(new TypeError('network offline')) },
  ])('tries again after a passing $name within the same load', async ({ fail }) => {
    fail();
    fetchMock.mockResolvedValueOnce(new Response(glb()));
    await expect(subject.loadMainHero()).resolves.toBe(parsedHero);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loaderMock.parseAsync).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports a failure that lasts through every try, and releases it so Retry downloads afresh', async () => {
    fetchMock.mockRejectedValue(new TypeError('network offline'));
    await expect(subject.loadMainHero()).rejects.toThrow(/network offline/);
    expect(fetchMock).toHaveBeenCalledTimes(policy.attempts);
    expect(loaderMock.construct).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    fetchMock.mockReset().mockResolvedValueOnce(new Response(glb()));
    await expect(subject.loadMainHero()).resolves.toBe(parsedHero);
    expect(fetchMock).toHaveBeenCalledOnce();
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

  it('abandons a download once no data has come for the stall time, and tries again with a fresh request', async () => {
    let stalledSignal!: AbortSignal;
    fetchMock.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      stalledSignal = options!.signal!;
      stalledSignal.addEventListener('abort', () => reject(new DOMException('download timed out', 'AbortError')), { once: true });
    })).mockResolvedValueOnce(new Response(glb()));
    const loading = subject.loadMainHero();
    await vi.advanceTimersByTimeAsync(policy.stallMs - 1);
    expect(stalledSignal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(loading).resolves.toBe(parsedHero);
    expect(stalledSignal.aborted).toBe(true);
    const retrySignal = fetchMock.mock.calls[1]![1]!.signal;
    expect(retrySignal).not.toBe(stalledSignal);
    expect(retrySignal?.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a slow download going for as long as data keeps arriving', async () => {
    const body = new Uint8Array(glb());
    let push!: (chunk: Uint8Array | null) => void;
    const stream = new ReadableStream<Uint8Array>({ start(controller) { push = (chunk) => chunk ? controller.enqueue(chunk) : controller.close(); } });
    fetchMock.mockResolvedValueOnce(new Response(stream));
    const loading = subject.loadMainHero();
    // A byte every 40 s: well past the old fixed 60 s, but never a stall.
    for (let i = 0; i < body.length; i++) {
      await vi.advanceTimersByTimeAsync(policy.stallMs - 5_000);
      push(body.subarray(i, i + 1));
    }
    push(null);
    await expect(loading).resolves.toBe(parsedHero);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
