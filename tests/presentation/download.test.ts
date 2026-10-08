import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Cache Storage as a browser keeps it: responses by request URL. */
class MemoryCache {
  readonly entries = new Map<string, ArrayBuffer>();
  async match(key: string) { const data = this.entries.get(key); return data ? new Response(data.slice(0)) : undefined; }
  async put(key: string, response: Response) { this.entries.set(key, await response.arrayBuffer()); }
  async delete(key: string | Request) { return this.entries.delete(typeof key === 'string' ? key : key.url); }
  async keys() { return [...this.entries.keys()].map((url) => new Request(url)); }
}

const hash = (data: ArrayBuffer) => createHash('sha256').update(new Uint8Array(data)).digest('hex');
const bytes = (...values: number[]) => new Uint8Array(values).buffer;

let subject: typeof import('../../src/presentation/assets/download');
let cache: MemoryCache;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(async () => {
  vi.resetModules();
  cache = new MemoryCache();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('document', { baseURI: 'https://example.test/Tervain/index.html' });
  vi.stubGlobal('caches', { open: async () => cache });
  subject = await import('../../src/presentation/assets/download');
  subject.DOWNLOAD_POLICY.backoffMs = [0, 0];
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('model downloads (A68)', () => {
  it('keeps a file with a known hash and serves it again from the cache, at any address', async () => {
    const data = bytes(1, 2, 3, 4), sha256 = hash(data);
    fetchMock.mockImplementation(async () => new Response(data.slice(0)));
    const first = await subject.downloadAsset('https://raw.example/commit-a/models/x.glb', { label: 'X', sha256, bytes: 4 });
    expect(new Uint8Array(first)).toEqual(new Uint8Array(data));
    await vi.waitFor(() => expect(cache.entries.size).toBe(1));
    // The next deploy moves the file to another address; the bytes are the same.
    const again = await subject.downloadAsset('https://raw.example/commit-b/models/x.glb', { label: 'X', sha256, bytes: 4 });
    expect(new Uint8Array(again)).toEqual(new Uint8Array(data));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('drops a cached copy that no longer matches its hash and downloads the file again', async () => {
    const data = bytes(5, 6, 7), sha256 = hash(data);
    cache.entries.set(new URL(`tervain-content/${sha256}`, 'https://example.test/Tervain/index.html').href, bytes(9, 9, 9));
    fetchMock.mockResolvedValue(new Response(data.slice(0)));
    expect(new Uint8Array(await subject.downloadAsset('https://raw.example/y.glb', { label: 'Y', sha256 }))).toEqual(new Uint8Array(data));
    expect(fetchMock).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect([...cache.entries.values()].map((value) => hash(value))).toEqual([sha256]));
  });

  it('never fails a download over a table entry that disagrees, and never caches it', async () => {
    const tabled = Object.entries((await import('../../src/presentation/assets/modelFiles')).MODEL_FILES)[0]!;
    fetchMock.mockResolvedValue(new Response(bytes(1, 1, 1)));
    await expect(subject.downloadAsset('https://raw.example/z.glb', { label: 'Z', model: tabled[0] })).resolves.toBeInstanceOf(ArrayBuffer);
    await Promise.resolve();
    expect(cache.entries.size).toBe(0);
  });

  it('fails a file whose manifest hash disagrees, after every try', async () => {
    fetchMock.mockImplementation(async () => new Response(bytes(1, 2)));
    await expect(subject.downloadAsset('https://raw.example/w.glb', { label: 'W', sha256: 'f'.repeat(64) })).rejects.toThrow(/W failed its integrity check/);
    expect(fetchMock).toHaveBeenCalledTimes(subject.DOWNLOAD_POLICY.attempts);
  });

  it('tries again after rate limiting or a server error, but not after a missing file or a web page', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 })).mockResolvedValueOnce(new Response('', { status: 502 })).mockResolvedValueOnce(new Response(bytes(3)));
    await expect(subject.downloadAsset('https://raw.example/a.glb', { label: 'A' })).resolves.toBeInstanceOf(ArrayBuffer);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    fetchMock.mockReset().mockResolvedValue(new Response('', { status: 404 }));
    await expect(subject.downloadAsset('https://raw.example/b.glb', { label: 'B' })).rejects.toThrow('B could not load (HTTP 404).');
    expect(fetchMock).toHaveBeenCalledOnce();
    fetchMock.mockReset().mockResolvedValue(new Response('<html>', { headers: { 'content-type': 'text/html' } }));
    await expect(subject.downloadAsset('https://raw.example/c.json', { label: 'C', holds: 'data' })).rejects.toThrow('C returned a page instead of data.');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('forgets cached files this session did not ask for', async () => {
    const kept = bytes(1), old = bytes(2);
    const key = (data: ArrayBuffer) => new URL(`tervain-content/${hash(data)}`, 'https://example.test/Tervain/index.html').href;
    cache.entries.set(key(old), old);
    fetchMock.mockResolvedValue(new Response(kept.slice(0)));
    await subject.downloadAsset('https://raw.example/k.glb', { label: 'K', sha256: hash(kept) });
    await vi.waitFor(() => expect(cache.entries.has(key(kept))).toBe(true));
    expect(await subject.pruneContentCache()).toBe(1);
    expect([...cache.entries.keys()]).toEqual([key(kept)]);
  });
});
