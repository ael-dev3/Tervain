import { runSheetJob, type SheetJob, type SheetResult } from './sheetJob';

/**
 * Paints people's sheets off the main thread. Painting a sheet takes a tenth of a second or more of plain arithmetic; a
 * few module workers share the cast while the loading screen is up, so the frame never waits on it. Without workers
 * (tests, Node tools, or a browser that refuses them) the same job runs inline.
 */
export const sheetPoolOptions = {
  /** Paint inline even where workers exist (tools that need the result at once). */
  inline: false,
};

interface Waiting {
  worker: Worker;
  resolve: (r: SheetResult) => void;
  reject: (e: Error) => void;
}

let workers: Worker[] | null | undefined;
let turn = 0;
let seq = 0;
const waiting = new Map<number, Waiting>();
const pending = new Set<Promise<unknown>>();

function stopWorker(worker: Worker) {
  worker.onmessage = worker.onerror = worker.onmessageerror = null;
  worker.terminate();
}

/** A module-load or transport failure affects every queued job on that worker, not just its last request. */
function failWorker(worker: Worker, error: Error) {
  if (workers) {
    workers = workers.filter((candidate) => candidate !== worker);
    if (workers.length === 0) workers = null;
  }
  stopWorker(worker);
  for (const [id, job] of waiting) {
    if (job.worker !== worker) continue;
    waiting.delete(id);
    job.reject(error);
  }
}

function pool(): Worker[] | null {
  if (workers !== undefined) return workers;
  if (typeof Worker === 'undefined' || typeof navigator === 'undefined') return (workers = null);
  const list: Worker[] = [];
  try {
    const n = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 4) - 1));
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL('./sheetWorker.ts', import.meta.url), { type: 'module', name: `sheet-painter-${i}` });
      w.onmessage = (e: MessageEvent<{ id: number; result?: SheetResult; error?: string }>) => {
        const job = waiting.get(e.data.id);
        if (!job || job.worker !== w) return;
        waiting.delete(e.data.id);
        if (e.data.result) job.resolve(e.data.result);
        else job.reject(new Error(e.data.error ?? 'sheet painter failed'));
      };
      w.onerror = (event) => {
        event.preventDefault();
        failWorker(w, new Error(event.message || 'sheet painter worker could not run'));
      };
      w.onmessageerror = () => failWorker(w, new Error('sheet painter result could not be decoded'));
      list.push(w);
    }
    workers = list;
  } catch {
    for (const worker of list) stopWorker(worker);
    workers = null;
  }
  return workers;
}

/**
 * Paint a sheet: inline (returning the result) when workers are unavailable or not wanted, otherwise on a worker
 * (returning a promise, which `sheetsSettled` also waits for). A worker that fails falls back to painting inline.
 */
export function paintSheetJob(job: SheetJob): SheetResult | Promise<SheetResult> {
  const ws = sheetPoolOptions.inline ? null : pool();
  if (!ws || ws.length === 0) return runSheetJob(job);
  const id = ++seq;
  const w = ws[turn++ % ws.length]!;
  const p = new Promise<SheetResult>((resolve, reject) => {
    waiting.set(id, { worker: w, resolve, reject });
    try {
      w.postMessage({ id, job });
    } catch (e) {
      failWorker(w, e instanceof Error ? e : new Error(String(e)));
    }
  }).catch((err: unknown) => {
    console.warn('sheet painter worker failed; painting inline', err);
    return runSheetJob(job);
  });
  track(p);
  return p;
}

/** Keep a promise in the set `sheetsSettled` waits on. */
export function track<T>(p: Promise<T>): Promise<T> {
  pending.add(p);
  const done = () => pending.delete(p);
  p.then(done, done);
  return p;
}

/** Resolves when every sheet requested so far is painted (or loaded) and applied. */
export async function sheetsSettled(): Promise<void> {
  while (pending.size) await Promise.allSettled([...pending]);
}
