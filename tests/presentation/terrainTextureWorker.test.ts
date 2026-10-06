import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateTerrainTextureData, LAYERS, makeTerrainTextures } from '../../src/presentation/terrainTextures';

class WorkerFixture {
  static instances: WorkerFixture[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor(readonly url: URL, readonly options: WorkerOptions) { WorkerFixture.instances.push(this); }
  send(data: unknown) { this.onmessage?.({ data } as MessageEvent); }
}

beforeEach(() => { WorkerFixture.instances = []; });
afterEach(() => { vi.unstubAllGlobals(); });

describe('ground material worker ownership', () => {
  it('accepts the worker arrays without changing deterministic bytes or allocating scene objects in its request', async () => {
    const expected = await generateTerrainTextureData(16);
    vi.stubGlobal('Worker', WorkerFixture);
    const progress = vi.fn(), pending = makeTerrainTextures(16, async () => {}, { onProgress: progress });
    const worker = WorkerFixture.instances[0]!;
    expect(worker.options.type).toBe('module');
    expect(worker.url.pathname).toContain('/terrainTextureWorker.ts');
    expect(worker.postMessage).toHaveBeenCalledWith({ size: 16 });
    worker.send({ type: 'progress', completed: 8, total: 8, layer: 'path' });
    worker.send({ type: 'complete', ...expected });
    const textures = await pending;
    try {
      expect(textures.albedo.image.data).toEqual(expected.albedo);
      expect(textures.normal.image.data).toEqual(expected.normal);
      expect(textures.albedo.image.depth).toBe(LAYERS.length);
      expect(progress).toHaveBeenCalledWith(8, 8, 'path');
      expect(worker.terminate).toHaveBeenCalledOnce();
    } finally { textures.dispose(); }
  });

  it('terminates cancelled work and ignores already queued late progress/completion messages', async () => {
    vi.stubGlobal('Worker', WorkerFixture);
    const controller = new AbortController(), reason = new DOMException('Replaced quality request', 'AbortError');
    const progress = vi.fn(), pending = makeTerrainTextures(16, async () => {}, { signal: controller.signal, onProgress: progress });
    const worker = WorkerFixture.instances[0]!;
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    worker.send({ type: 'progress', completed: 1, total: 8, layer: 'grass' });
    worker.send({ type: 'complete', albedo: new Uint8Array(), normal: new Uint8Array() });
    expect(progress).not.toHaveBeenCalled(); expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('propagates worker generation failures to recovery without silently restarting expensive work', async () => {
    vi.stubGlobal('Worker', WorkerFixture);
    const fallbackYield = vi.fn(async () => {}), pending = makeTerrainTextures(16, fallbackYield);
    const worker = WorkerFixture.instances[0]!;
    worker.send({ type: 'error', message: 'Ground material allocation failed' });
    await expect(pending).rejects.toThrow('Ground material allocation failed');
    expect(fallbackYield).not.toHaveBeenCalled(); expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('uses the deterministic cooperative path when worker construction is unavailable', async () => {
    const expected = await generateTerrainTextureData(16);
    vi.stubGlobal('Worker', class { constructor() { throw new Error('Worker unavailable'); } });
    const yieldNow = vi.fn(async () => {}), progress = vi.fn();
    const textures = await makeTerrainTextures(16, yieldNow, { onProgress: progress });
    try {
      expect(textures.albedo.image.data).toEqual(expected.albedo);
      expect(textures.normal.image.data).toEqual(expected.normal);
      expect(yieldNow).toHaveBeenCalledTimes(8); expect(progress).toHaveBeenCalledTimes(8);
    } finally { textures.dispose(); }
  });

  it('falls back cooperatively if the worker module cannot start, retaining the exact generated pixels', async () => {
    const expected = await generateTerrainTextureData(16);
    vi.stubGlobal('Worker', WorkerFixture);
    const yieldNow = vi.fn(async () => {}), pending = makeTerrainTextures(16, yieldNow);
    const worker = WorkerFixture.instances[0]!, preventDefault = vi.fn();
    worker.onerror!({ message: 'Worker module blocked by host', preventDefault } as unknown as ErrorEvent);
    const textures = await pending;
    try {
      expect(worker.terminate).toHaveBeenCalledOnce(); expect(preventDefault).toHaveBeenCalledOnce();
      expect(yieldNow).toHaveBeenCalledTimes(8);
      expect(textures.albedo.image.data).toEqual(expected.albedo);
      expect(textures.normal.image.data).toEqual(expected.normal);
    } finally { textures.dispose(); }
  });
});
