import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SheetJob, SheetResult } from '../../src/presentation/human/sheetJob';

const inline = vi.hoisted(() => vi.fn((job: { size: number }) => ({ token: `inline:${job.size}` })));
vi.mock('../../src/presentation/human/sheetJob', () => ({ runSheetJob: inline }));

class FakeWorker {
  static created: FakeWorker[] = [];
  static failConstructionAt = -1;
  onmessage: ((event: MessageEvent<{ id: number; result?: SheetResult; error?: string }>) => unknown) | null = null;
  onerror: ((event: ErrorEvent) => unknown) | null = null;
  onmessageerror: ((event: MessageEvent) => unknown) | null = null;
  terminate = vi.fn();
  throwOnPost = false;
  readonly messages: { id: number; job: SheetJob }[] = [];

  constructor() {
    if (FakeWorker.created.length === FakeWorker.failConstructionAt) throw new Error('Worker construction denied');
    FakeWorker.created.push(this);
  }
  postMessage(message: { id: number; job: SheetJob }) {
    if (this.throwOnPost) throw new Error('Worker transport failed');
    this.messages.push(message);
  }
  reply(id: number, result: SheetResult) { this.onmessage?.({ data: { id, result } } as MessageEvent); }
  fail() {
    const preventDefault = vi.fn();
    this.onerror?.({ message: 'Worker module failed to load', preventDefault } as unknown as ErrorEvent);
    return preventDefault;
  }
}

const job = (size: number) => ({ size }) as SheetJob;
const result = (token: string) => ({ token }) as unknown as SheetResult;

beforeEach(() => {
  vi.resetModules(); inline.mockClear();
  FakeWorker.created = []; FakeWorker.failConstructionAt = -1;
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('navigator', { hardwareConcurrency: 3 });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('sheet worker failures do not trap the loading screen', () => {
  it('falls back for all jobs owned by an asynchronously failed worker while keeping a healthy worker alive', async () => {
    const pool = await import('../../src/presentation/human/sheetPool');
    const first = pool.paintSheetJob(job(1));
    const second = pool.paintSheetJob(job(2));
    const third = pool.paintSheetJob(job(3));
    const [broken, healthy] = FakeWorker.created;
    let settled = false;
    const ready = pool.sheetsSettled().then(() => { settled = true; });
    expect(broken!.fail()).toHaveBeenCalledOnce();
    await expect(first).resolves.toEqual(result('inline:1'));
    await expect(third).resolves.toEqual(result('inline:3'));
    expect(settled).toBe(false);
    expect(broken!.terminate).toHaveBeenCalledOnce();
    expect(healthy!.terminate).not.toHaveBeenCalled();
    healthy!.reply(healthy!.messages[0]!.id, result('worker:2'));
    await expect(second).resolves.toEqual(result('worker:2'));
    await ready;
    expect(settled).toBe(true);
    expect(inline).toHaveBeenCalledTimes(2);
    const next = pool.paintSheetJob(job(4));
    expect(healthy!.messages).toHaveLength(2);
    healthy!.reply(healthy!.messages[1]!.id, result('worker:4'));
    await expect(next).resolves.toEqual(result('worker:4'));
  });

  it('recovers decoding failures and permanently switches to inline when the last worker fails', async () => {
    const pool = await import('../../src/presentation/human/sheetPool');
    const first = pool.paintSheetJob(job(1));
    const second = pool.paintSheetJob(job(2));
    FakeWorker.created[0]!.onmessageerror?.({} as MessageEvent);
    FakeWorker.created[1]!.fail();
    await expect(first).resolves.toEqual(result('inline:1'));
    await expect(second).resolves.toEqual(result('inline:2'));
    await pool.sheetsSettled();
    expect(pool.paintSheetJob(job(3))).toEqual(result('inline:3'));
    expect(FakeWorker.created).toHaveLength(2);
    for (const worker of FakeWorker.created) {
      expect(worker.terminate).toHaveBeenCalledOnce();
      expect(worker.onmessage).toBeNull();
      expect(worker.onerror).toBeNull();
      expect(worker.onmessageerror).toBeNull();
    }
  });

  it('terminates already constructed workers if constructing the remaining pool fails', async () => {
    FakeWorker.failConstructionAt = 1;
    const pool = await import('../../src/presentation/human/sheetPool');
    expect(pool.paintSheetJob(job(1))).toEqual(result('inline:1'));
    await pool.sheetsSettled();
    expect(FakeWorker.created).toHaveLength(1);
    expect(FakeWorker.created[0]!.terminate).toHaveBeenCalledOnce();
    expect(FakeWorker.created[0]!.onmessage).toBeNull();
    expect(pool.paintSheetJob(job(2))).toEqual(result('inline:2'));
    expect(FakeWorker.created).toHaveLength(1);
  });

  it('retires a worker whose postMessage fails and resolves its previously queued jobs too', async () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 2 });
    const pool = await import('../../src/presentation/human/sheetPool');
    const first = pool.paintSheetJob(job(1));
    FakeWorker.created[0]!.throwOnPost = true;
    const second = pool.paintSheetJob(job(2));
    await expect(first).resolves.toEqual(result('inline:1'));
    await expect(second).resolves.toEqual(result('inline:2'));
    await pool.sheetsSettled();
    expect(FakeWorker.created[0]!.terminate).toHaveBeenCalledOnce();
    expect(pool.paintSheetJob(job(3))).toEqual(result('inline:3'));
  });

  it('ignores a result from a different worker instead of applying it to the wrong person', async () => {
    const pool = await import('../../src/presentation/human/sheetPool');
    const first = pool.paintSheetJob(job(1));
    const [owner, other] = FakeWorker.created;
    const resolved = vi.fn();
    void Promise.resolve(first).then(resolved);
    other!.reply(owner!.messages[0]!.id, result('wrong-person'));
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    owner!.reply(owner!.messages[0]!.id, result('right-person'));
    await expect(first).resolves.toEqual(result('right-person'));
    await pool.sheetsSettled();
    expect(inline).not.toHaveBeenCalled();
  });
});
