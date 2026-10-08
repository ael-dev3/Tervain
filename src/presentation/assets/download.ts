import { MODEL_FILES } from './modelFiles';

/**
 * Downloads for the world's models and surfaces (A68).
 *
 * - A slow connection is not a failed one. A download is abandoned only when no data has arrived for
 *   `DOWNLOAD_POLICY.stallMs`, however long the whole file takes. Before this, every file had a fixed 60 s, which a
 *   7–10 MB model on a slow or throttled connection could overrun, failing the whole journey.
 * - A dropped connection, a server error or rate limiting is retried a few times, after a short pause, before the
 *   loading screen's Retry is needed.
 * - Hosted models are addressed by the build's commit, so every deploy gives every model a new address and the
 *   browser's HTTP cache cannot help across deploys. A file whose SHA-256 is known (from its manifest, or from the
 *   generated table in modelFiles.ts) is also kept in the browser's Cache Storage under that hash and taken from there
 *   while it is unchanged, whatever its address. Bytes from the cache are hashed again before use.
 */
export interface DownloadOptions {
  /** How the file is named in errors, e.g. "Resident fisher". */
  label: string;
  /** Size and SHA-256 the file must have: a mismatch is an error. */
  bytes?: number;
  sha256?: string;
  /** The model's path under public/models, which looks up its size and hash for caching (never an error). */
  model?: string;
  /** What the file holds, for the error when a server sends a web page instead. */
  holds?: string;
}

export const DOWNLOAD_POLICY = {
  /** Abandon a download after this long without any data, milliseconds. */
  stallMs: 45_000,
  /** Tries per file for failures that may pass (network errors, stalls, HTTP 408, 425, 429 and 5xx). */
  attempts: 3,
  /** Pauses before the second and third tries, milliseconds. */
  backoffMs: [1_200, 4_000] as number[],
};

export class DownloadError extends Error {
  constructor(message: string, readonly transient: boolean) {
    super(message);
    this.name = 'DownloadError';
  }
}

const CACHE_NAME = 'tervain-content-v1';
let cacheRequest: Promise<Cache | null> | null = null;
/** Every hash asked for in this session: what the cache keeps when it is pruned. */
const used = new Set<string>();

/** Whether this browser offers Cache Storage at all (not in tests, nor in some private windows). */
const cacheAvailable = () => typeof caches !== 'undefined' && typeof document !== 'undefined';

function contentCache(): Promise<Cache | null> {
  if (!cacheAvailable()) return Promise.resolve(null);
  cacheRequest ??= caches.open(CACHE_NAME).catch(() => null);
  return cacheRequest;
}

const cacheKey = (sha256: string) => new URL(`tervain-content/${sha256}`, document.baseURI).href;

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** One attempt: the response's body, read as it arrives, abandoned only if it stalls. */
async function fetchOnce(url: URL | string, options: DownloadOptions): Promise<ArrayBuffer> {
  const controller = new AbortController();
  let stalled = false, timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { stalled = true; controller.abort(); }, DOWNLOAD_POLICY.stallMs);
  };
  arm();
  try {
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      throw new DownloadError(stalled ? `${options.label} download stalled.` : `${options.label} could not load (${error instanceof Error ? error.message : 'network error'}).`, true);
    }
    arm();
    if (!response.ok) {
      const status = response.status;
      throw new DownloadError(`${options.label} could not load (HTTP ${status}).`, status === 408 || status === 425 || status === 429 || status >= 500);
    }
    if (response.headers.get('content-type')?.includes('text/html')) {
      throw new DownloadError(`${options.label} returned a page instead of ${options.holds ?? 'model data'}.`, false);
    }
    const reader = response.body && typeof response.body.getReader === 'function' ? response.body.getReader() : null;
    if (!reader) return await response.arrayBuffer();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.byteLength;
        arm();
      }
    } catch {
      throw new DownloadError(stalled ? `${options.label} download stalled.` : `${options.label} download was interrupted.`, true);
    }
    const out = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) { out.set(chunk, at); at += chunk.byteLength; }
    return out.buffer;
  } finally {
    clearTimeout(timer);
  }
}

/** Download a file, from the content cache when it holds the same bytes, retrying failures that may pass. */
export async function downloadAsset(url: URL | string, options: DownloadOptions): Promise<ArrayBuffer> {
  const known = options.model ? MODEL_FILES[options.model] : undefined;
  const sha256 = options.sha256 ?? known?.[0], bytes = options.bytes ?? known?.[1];
  // Without Cache Storage the request starts at once, as a plain fetch would.
  const cache = sha256 && cacheAvailable() ? await contentCache() : null;
  if (sha256) used.add(sha256);
  if (cache && sha256) {
    try {
      const hit = await cache.match(cacheKey(sha256));
      if (hit) {
        const data = await hit.arrayBuffer();
        if ((bytes === undefined || data.byteLength === bytes) && await sha256Hex(data) === sha256) return data;
        await cache.delete(cacheKey(sha256));
      }
    } catch { /* An unreadable cache only costs the download. */ }
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const data = await fetchOnce(url, options);
      if (options.bytes !== undefined && data.byteLength !== options.bytes) throw new DownloadError(`${options.label} download is incomplete.`, true);
      if (options.sha256 || cache) {
        const digest = sha256 ? await sha256Hex(data) : '';
        if (options.sha256 && digest !== options.sha256) throw new DownloadError(`${options.label} failed its integrity check.`, true);
        // Only bytes that are exactly the known file go into the cache (a table entry never rejects a download).
        if (cache && sha256 && digest === sha256) {
          void cache.put(cacheKey(sha256), new Response(data, { headers: { 'content-type': 'application/octet-stream' } })).catch(() => {});
        }
      }
      return data;
    } catch (error) {
      const transient = error instanceof DownloadError ? error.transient : true;
      if (!transient || attempt >= DOWNLOAD_POLICY.attempts) throw error;
      const pause = DOWNLOAD_POLICY.backoffMs[attempt - 1] ?? DOWNLOAD_POLICY.backoffMs.at(-1) ?? 0;
      if (pause > 0) await wait(pause);
    }
  }
}

/**
 * Forget cached files this session did not ask for (models replaced since an earlier visit). Call once the world has
 * loaded, when every file it needs has been asked for.
 */
export async function pruneContentCache(): Promise<number> {
  const cache = await contentCache();
  if (!cache || !used.size) return 0;
  let removed = 0;
  try {
    for (const request of await cache.keys()) {
      const hash = request.url.split('/').pop() ?? '';
      if (!used.has(hash)) removed += (await cache.delete(request)) ? 1 : 0;
    }
  } catch { /* Pruning is housekeeping only. */ }
  return removed;
}
