import { assetUrl } from './assets';

export interface ResourceReceipt {
  bytes: number;
  sha256: string;
  contentEncoding?: 'gzip';
  encoding?: 'gzip';
  uncompressedBytes?: number;
  uncompressedSha256?: string;
}

export interface NativeResourceReadOptions {
  /** Explicit budget for a larger, hash-pinned native resource. The decoder
   * still stops at the exact receipt length and verifies its decoded SHA256. */
  maximumDecodedBytes?: number;
}

async function verify(bytes: ArrayBuffer, length: number, sha256: string, label: string): Promise<void> {
  if (bytes.byteLength !== length) throw new Error('Resource size differs: ' + label);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== sha256) throw new Error('Resource hash differs: ' + label);
}

async function boundedBody(response: Response, limit: number, label: string): Promise<ArrayBuffer> {
  if (!response.body) throw new Error('Resource response has no body: ' + label);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      length += item.value.byteLength;
      if (length > limit) { await reader.cancel(); throw new Error('Resource exceeds its bounded receipt: ' + label); }
      chunks.push(item.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes.buffer;
}

/** Native resources are verified before use and, for gzip, after decoding. */
export async function readNativeBytes(path: string, receipt: ResourceReceipt, signal?: AbortSignal,
    options: NativeResourceReadOptions = {}): Promise<ArrayBuffer> {
  if (!Number.isSafeInteger(receipt.bytes) || receipt.bytes < 0 || !/^[a-f0-9]{64}$/.test(receipt.sha256)) {
    throw new Error('Invalid resource receipt: ' + path);
  }
  const maximumDecodedBytes = options.maximumDecodedBytes ?? 4 * 1024 * 1024;
  if (!Number.isSafeInteger(maximumDecodedBytes) || maximumDecodedBytes < 1 ||
      maximumDecodedBytes > 64 * 1024 * 1024) {
    throw new Error('Invalid native resource decode budget: ' + path);
  }
  const compressed = receipt.contentEncoding === 'gzip' || receipt.encoding === 'gzip';
  if (compressed && (receipt.uncompressedBytes === undefined ||
      !Number.isSafeInteger(receipt.uncompressedBytes) || receipt.uncompressedBytes < 0 ||
      receipt.uncompressedBytes > maximumDecodedBytes || !/^[a-f0-9]{64}$/.test(receipt.uncompressedSha256 ?? ''))) {
    throw new Error('Invalid bounded decoded receipt: ' + path);
  }
  const response = await fetch(assetUrl(path), { signal });
  if (!response.ok) throw new Error(path + ' HTTP ' + response.status);
  const httpGzip = compressed && /\bgzip\b/i.test(response.headers.get('Content-Encoding') ?? '');
  let bytes = await boundedBody(response, httpGzip ? Math.max(receipt.bytes, receipt.uncompressedBytes!) : receipt.bytes, path);
  if (httpGzip && (bytes.byteLength !== receipt.bytes || new Uint8Array(bytes)[0] !== 0x1f || new Uint8Array(bytes)[1] !== 0x8b)) {
    // Fetch removes HTTP Content-Encoding transparently (including Vite's
    // .json.gz middleware). Wire bytes are unavailable on this route; the
    // decoded receipt still verifies the exact original JSON before use.
    await verify(bytes, receipt.uncompressedBytes!, receipt.uncompressedSha256!, path + ' (HTTP decoded)');
    return bytes;
  }
  await verify(bytes, receipt.bytes, receipt.sha256, path);
  if (compressed) {
    if (receipt.uncompressedBytes === undefined || !receipt.uncompressedSha256) throw new Error('Decoded resource receipt is missing: ' + path);
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const item = await reader.read();
        if (item.done) break;
        length += item.value.byteLength;
        if (length > receipt.uncompressedBytes) { await reader.cancel(); throw new Error('Decoded resource exceeds its receipt: ' + path); }
        chunks.push(item.value);
      }
    } finally { reader.releaseLock(); }
    const joined = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
    bytes = joined.buffer;
    await verify(bytes, receipt.uncompressedBytes, receipt.uncompressedSha256, path + ' (decoded)');
  }
  return bytes;
}

/** Lazy native-data chunks are verified before and after decompression. */
export async function readNativeResource<T>(path: string, receipt: ResourceReceipt,
    options: NativeResourceReadOptions = {}): Promise<T> {
  return JSON.parse(new TextDecoder().decode(await readNativeBytes(path, receipt, undefined, options))) as T;
}
