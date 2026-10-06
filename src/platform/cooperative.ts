/** Construction work may run while the application keeps a loading screen visible. */
export interface CooperativeOptions {
  yieldNow?: () => Promise<void>;
  signal?: AbortSignal;
  /** Maximum work per turn, checked between complete rows/tiles. Zero is useful for deterministic hosts. */
  budgetMs?: number;
}

export function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Loading was cancelled.', 'AbortError');
}

/** An animation frame alone resumes before paint; its following task lets the browser paint first.
 * Hidden tabs use a task because their animation frames can stop altogether. There is no minimum load time. */
export function yieldToBrowser(): Promise<void> {
  return new Promise(resolve => {
    const nextTask = () => setTimeout(resolve, 0);
    if (typeof requestAnimationFrame === 'function' && (typeof document === 'undefined' || !document.hidden)) requestAnimationFrame(nextTask);
    else nextTask();
  });
}

/** Consume bounded construction batches. Closing the generator also runs its allocation cleanup on cancellation. */
export async function finishCooperatively<T, P>(steps: Generator<P, T>, options: CooperativeOptions & { onProgress?: (progress: P) => void } = {}): Promise<T> {
  const budget = Math.max(0, options.budgetMs ?? 8);
  let deadline = performance.now() + budget;
  try {
    for (;;) {
      checkCancelled(options.signal);
      const next = steps.next();
      if (next.done) return next.value;
      options.onProgress?.(next.value);
      if (performance.now() >= deadline) {
        await (options.yieldNow ?? yieldToBrowser)();
        deadline = performance.now() + budget;
      }
    }
  } finally {
    steps.return(undefined as T);
  }
}
