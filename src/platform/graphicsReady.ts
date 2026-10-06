import { checkCancelled, yieldToBrowser } from './cooperative';

export interface GraphicsReadyOptions {
  yieldNow?: () => Promise<void>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Await GPU completion of the first rendered view without blocking the browser.
 * Call after rendering: shader compilation alone does not complete uploads/draws.
 * Hosts without a WebGL context still give the prepared view one browser paint. */
export async function waitForGraphicsReady(context?: WebGL2RenderingContext | null, options: GraphicsReadyOptions = {}): Promise<void> {
  const yieldNow = options.yieldNow ?? yieldToBrowser;
  checkCancelled(options.signal);
  if (!context) {
    await yieldNow();
    checkCancelled(options.signal);
    return;
  }
  if (context.isContextLost()) throw new Error('The graphics context was lost while preparing the view.');
  const sync = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) throw new Error('The graphics completion check could not start.');
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(0, options.timeoutMs!) : 60_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let aborted: (() => void) | undefined;
  const interrupted = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Preparing graphics timed out. Please retry.')), timeoutMs);
    if (options.signal) {
      aborted = () => reject(options.signal!.reason ?? new DOMException('Loading was cancelled.', 'AbortError'));
      options.signal.addEventListener('abort', aborted, { once: true });
    }
  });
  try {
    context.flush();
    for (;;) {
      checkCancelled(options.signal);
      if (context.isContextLost()) throw new Error('The graphics context was lost while preparing the view.');
      const status = context.clientWaitSync(sync, 0, 0);
      if (status === context.ALREADY_SIGNALED || status === context.CONDITION_SATISFIED) return;
      if (status === context.WAIT_FAILED || status !== context.TIMEOUT_EXPIRED) {
        throw new Error('The graphics completion check failed. Please retry.');
      }
      // The timeout also interrupts a suspended animation-frame yield when a
      // tab becomes hidden; no fixed delay is added after the GPU finishes.
      await Promise.race([yieldNow(), interrupted]);
    }
  } finally {
    clearTimeout(timer);
    if (aborted) options.signal?.removeEventListener('abort', aborted);
    context.deleteSync(sync);
  }
}
