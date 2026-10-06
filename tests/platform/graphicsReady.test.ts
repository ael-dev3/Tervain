import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForGraphicsReady } from '../../src/platform/graphicsReady';

function gpu(statuses = [0x911a]) {
  const sync = {} as WebGLSync;
  const context = {
    SYNC_GPU_COMMANDS_COMPLETE: 0x9117, ALREADY_SIGNALED: 0x911a,
    TIMEOUT_EXPIRED: 0x911b, CONDITION_SATISFIED: 0x911c, WAIT_FAILED: 0x911d,
    fenceSync: vi.fn(() => sync), flush: vi.fn(), deleteSync: vi.fn(), isContextLost: vi.fn(() => false),
    clientWaitSync: vi.fn(() => statuses.shift() ?? 0x911b),
  };
  return { context: context as unknown as WebGL2RenderingContext, methods: context, sync };
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('first rendered view graphics completion', () => {
  it('keeps entry pending through unfinished GPU work and waits without a blocking client timeout', async () => {
    const { context, methods, sync } = gpu([0x911b, 0x911c]);
    let painted!: () => void;
    const yieldNow = vi.fn(() => new Promise<void>(resolve => { painted = resolve; }));
    let entered = false;
    const ready = waitForGraphicsReady(context, { yieldNow }).then(() => { entered = true; });
    expect(methods.fenceSync).toHaveBeenCalledWith(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
    expect(methods.flush).toHaveBeenCalledOnce();
    expect(methods.clientWaitSync).toHaveBeenCalledWith(sync, 0, 0);
    expect(entered).toBe(false); expect(methods.deleteSync).not.toHaveBeenCalled();
    painted(); await ready;
    expect(entered).toBe(true); expect(yieldNow).toHaveBeenCalledOnce();
    expect(methods.clientWaitSync).toHaveBeenCalledTimes(2);
    expect(methods.flush).toHaveBeenCalledOnce(); expect(methods.deleteSync).toHaveBeenCalledExactlyOnceWith(sync);
  });

  it('accepts an already completed frame immediately without a minimum loading delay', async () => {
    vi.useFakeTimers();
    const { context, methods, sync } = gpu(), yieldNow = vi.fn(async () => {});
    await waitForGraphicsReady(context, { yieldNow });
    expect(yieldNow).not.toHaveBeenCalled(); expect(methods.deleteSync).toHaveBeenCalledExactlyOnceWith(sync);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects a missing fence rather than activating a view whose graphics could not be checked', async () => {
    const { context, methods } = gpu(); methods.fenceSync.mockReturnValue(null as unknown as WebGLSync);
    await expect(waitForGraphicsReady(context)).rejects.toThrow('could not start');
    expect(methods.flush).not.toHaveBeenCalled(); expect(methods.deleteSync).not.toHaveBeenCalled();
  });

  it('rejects a failed wait and releases its sync exactly once', async () => {
    const { context, methods, sync } = gpu([0x911d]);
    await expect(waitForGraphicsReady(context)).rejects.toThrow('completion check failed');
    expect(methods.deleteSync).toHaveBeenCalledExactlyOnceWith(sync);
  });

  it('rejects context loss before allocating, or after a browser paint, and releases an allocated sync', async () => {
    const initial = gpu(); initial.methods.isContextLost.mockReturnValue(true);
    await expect(waitForGraphicsReady(initial.context)).rejects.toThrow('context was lost');
    expect(initial.methods.fenceSync).not.toHaveBeenCalled();
    const later = gpu([0x911b]);
    await expect(waitForGraphicsReady(later.context, { yieldNow: async () => {
      later.methods.isContextLost.mockReturnValue(true);
    } })).rejects.toThrow('context was lost');
    expect(later.methods.deleteSync).toHaveBeenCalledExactlyOnceWith(later.sync);
  });

  it('times out even when a hidden tab suspends its browser-paint promise', async () => {
    vi.useFakeTimers();
    const { context, methods, sync } = gpu([0x911b]);
    const ready = waitForGraphicsReady(context, { yieldNow: () => new Promise(() => {}) });
    const rejected = expect(ready).rejects.toThrow('graphics timed out');
    await vi.advanceTimersByTimeAsync(59_999); expect(methods.deleteSync).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); await rejected;
    expect(methods.deleteSync).toHaveBeenCalledExactlyOnceWith(sync); expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a pending graphics stage and removes its abort listener and timer', async () => {
    vi.useFakeTimers();
    const { context, methods, sync } = gpu([0x911b]), controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const ready = waitForGraphicsReady(context, { signal: controller.signal, yieldNow: () => new Promise(() => {}) });
    const rejected = expect(ready).rejects.toThrow('journey cancelled');
    controller.abort(new Error('journey cancelled')); await rejected;
    expect(methods.deleteSync).toHaveBeenCalledExactlyOnceWith(sync);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function)); expect(vi.getTimerCount()).toBe(0);
  });

  it('uses one browser paint for context-free hosts and never treats a pre-cancelled stage as ready', async () => {
    const yieldNow = vi.fn(async () => {});
    await waitForGraphicsReady(undefined, { yieldNow }); expect(yieldNow).toHaveBeenCalledOnce();
    const { context, methods } = gpu(), controller = new AbortController(); controller.abort(new Error('cancelled before entry'));
    await expect(waitForGraphicsReady(context, { signal: controller.signal })).rejects.toThrow('cancelled before entry');
    expect(methods.fenceSync).not.toHaveBeenCalled();
  });
});
