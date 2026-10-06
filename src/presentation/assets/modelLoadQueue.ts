/** Keep embedded-image decoding bounded across the hero, residents and scenery.
 * A slot covers the complete download and parse, rather than only HTTP headers.
 * Per-loader promise caches still own deduplication and retry policy. */
export const MODEL_LOAD_CONCURRENCY = 4;
let active = 0;
const waiting: (() => void)[] = [];

export function withModelLoadSlot<T>(load: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      active++;
      // Start synchronously so the first request retains the existing loader API.
      let request: Promise<T>;
      try { request = load(); } catch (error) { request = Promise.reject(error); }
      request.then(resolve, reject).finally(() => {
        active--;
        waiting.shift()?.();
      });
    };
    if (active < MODEL_LOAD_CONCURRENCY) start(); else waiting.push(start);
  });
}

export type ModelLoadProgress = (loaded: number, total: number) => void;
interface ModelProgress { complete: boolean; listeners: Set<ModelLoadProgress> }
const observed = new WeakMap<Promise<unknown>, ModelProgress>();

/** Counts completed decoding; sharing an in-flight template also shares progress. */
export function observeModelLoad<T>(request: Promise<T>, progress?: ModelLoadProgress): Promise<T> {
  let status = observed.get(request);
  if (!status) {
    status = { complete: false, listeners: new Set() };
    observed.set(request, status);
    const current = status;
    // Failure never emits completion; fulfilled templates retain their actual
    // count so a later rebuild does not briefly display a fictitious zero.
    void request.then(() => {
      current.complete = true;
      for (const listener of current.listeners) listener(1, 1);
    }, () => {}).finally(() => current.listeners.clear()).catch(() => {});
  }
  if (progress) {
    progress(status.complete ? 1 : 0, 1);
    if (!status.complete) status.listeners.add(progress);
  }
  return request;
}
