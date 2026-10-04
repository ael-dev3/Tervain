import { BinaryReader, latin1 } from './binary';

/**
 * Gothic 3's data archives ("G3V0" packs: `Name.pak`, then patches `Name.p00`, `Name.p01`, …) read straight from the
 * player's own installation. Nothing is copied anywhere: entries are read on demand with `slice` (a picked folder) or a
 * ranged request (the development server), and inflated in the browser.
 *
 * Layout, as observed in the installed files:
 * - a 48-byte header: version (u32), "G3V0", revision, encryption, compression, a reserved word, the table offset (u64)
 *   twice, and the archive's length less four (u64);
 * - entry data from offset 48;
 * - the table: a directory tree. A directory is three FILETIMEs, a size (u64), attributes (u32), its name, the number of
 *   subdirectories and those directories, then the number of files and those files. A file is three FILETIMEs, a size
 *   (u64), attributes (u32), offset, packed size and unpacked size (u64 each), encryption and compression (u32 each),
 *   its path in the archive and the path it was built from. A name is a u32 length and characters, with a terminating
 *   zero when it is not empty. Compression 0 is stored, 2 is zlib.
 */

/** Random-access bytes: a picked file, or a file the development server serves with ranges. */
export interface ByteSource {
  readonly name: string;
  readonly size: number;
  read(offset: number, length: number): Promise<Uint8Array>;
}

export class BlobSource implements ByteSource {
  readonly name: string;
  readonly size: number;
  private readonly blob: Blob;

  constructor(blob: Blob, name: string) {
    this.blob = blob;
    this.name = name;
    this.size = blob.size;
  }

  async read(offset: number, length: number): Promise<Uint8Array> {
    return new Uint8Array(await this.blob.slice(offset, offset + length).arrayBuffer());
  }
}

/** A file served with HTTP range requests (the development server's /__g3data/ route). */
export class HttpSource implements ByteSource {
  readonly name: string;
  readonly size: number;
  private readonly url: string;

  constructor(url: string, name: string, size: number) {
    this.url = url;
    this.name = name;
    this.size = size;
  }

  async read(offset: number, length: number): Promise<Uint8Array> {
    if (length === 0) return new Uint8Array(0);
    const res = await fetch(this.url, { headers: { Range: `bytes=${offset}-${offset + length - 1}` } });
    if (!res.ok) throw new Error(`${this.name}: ${res.status} reading ${length} bytes at ${offset}`);
    return new Uint8Array(await res.arrayBuffer());
  }
}

/** In-memory bytes (tests). */
export class MemorySource implements ByteSource {
  readonly name: string;
  readonly size: number;
  private readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array, name: string) {
    this.bytes = bytes;
    this.name = name;
    this.size = bytes.length;
  }

  async read(offset: number, length: number): Promise<Uint8Array> {
    return this.bytes.slice(offset, offset + length);
  }
}

export interface PackEntry {
  /** Path inside the archive with forward slashes, as stored (case kept). */
  path: string;
  offset: number;
  packed: number;
  unpacked: number;
  compression: number;
  encryption: number;
  source: ByteSource;
}

export const PACK_HEADER_SIZE = 48;

/** Read a pack's table of contents. */
export async function readPackIndex(source: ByteSource): Promise<PackEntry[]> {
  if (source.size < PACK_HEADER_SIZE) throw new Error(`${source.name}: too small for a Gothic 3 archive`);
  const head = new BinaryReader(await source.read(0, PACK_HEADER_SIZE));
  head.skip(4);
  if (latin1(head.bytesView(4)) !== 'G3V0') throw new Error(`${source.name}: not a Gothic 3 archive (no G3V0 header)`);
  head.pos = 0x18;
  const tableAt = head.u64();
  if (tableAt < PACK_HEADER_SIZE || tableAt > source.size) throw new Error(`${source.name}: table offset ${tableAt} is outside the file`);
  const table = new BinaryReader(await source.read(tableAt, source.size - tableAt));
  const entries: PackEntry[] = [];
  const name = (): string => {
    const n = table.u32();
    if (n === 0) return '';
    const s = latin1(table.bytesView(n));
    table.skip(1);
    return s;
  };
  const directory = (depth: number): void => {
    if (depth > 64) throw new Error(`${source.name}: directory tree too deep`);
    table.skip(24 + 8 + 4);
    name();
    const subdirectories = table.u32();
    for (let i = 0; i < subdirectories; i++) directory(depth + 1);
    const files = table.u32();
    for (let i = 0; i < files; i++) {
      table.skip(24 + 8 + 4);
      const offset = table.u64();
      const packed = table.u64();
      const unpacked = table.u64();
      const encryption = table.u32();
      const compression = table.u32();
      const path = name().replace(/\\/g, '/');
      name();
      entries.push({ path, offset, packed, unpacked, encryption, compression, source });
    }
  };
  directory(0);
  return entries;
}

/** zlib (RFC 1950) inflation with the platform's own decompressor. */
export async function inflate(bytes: Uint8Array, expected?: number): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  const out = new Uint8Array(await new Response(stream).arrayBuffer());
  if (expected !== undefined && out.length !== expected) throw new Error(`inflated ${out.length} bytes, expected ${expected}`);
  return out;
}

export async function readEntry(e: PackEntry): Promise<Uint8Array> {
  if (e.encryption !== 0) throw new Error(`${e.path}: encrypted entries are not supported`);
  const raw = await e.source.read(e.offset, e.packed);
  if (e.compression === 0) return raw;
  if (e.compression === 2 || e.compression === 1) return inflate(raw, e.unpacked);
  throw new Error(`${e.path}: unknown compression ${e.compression}`);
}

/** The archive groups this viewer reads, by stem. */
export const ARCHIVE_GROUPS = ['_compiledImage', '_compiledMaterial', '_compiledMesh', 'Projects_compiled', 'Speedtrees', 'Lightmaps', 'Templates', '_compiledAnimation', 'Strings'] as const;

/** Order a group's files: the .pak first, then .p00, .p01, … (later ones override). */
export function groupOrder(names: readonly string[], stem: string): string[] {
  const lower = stem.toLowerCase();
  const mine = names.filter((n) => {
    const l = n.toLowerCase();
    return l.startsWith(lower + '.') && /\.(pak|p\d\d)$/.test(l);
  });
  const rank = (n: string) => (n.toLowerCase().endsWith('.pak') ? -1 : Number(n.slice(-2)));
  return mine.sort((a, b) => rank(a) - rank(b));
}

/**
 * Every entry of the installation's archives, by lower-case path, later patches overriding earlier archives; and an
 * index by lower-case file name, for resources referred to by name alone (images, meshes, materials, trees).
 */
export class GothicArchives {
  readonly byPath = new Map<string, PackEntry>();
  readonly byName = new Map<string, PackEntry>();
  readonly sources: ByteSource[] = [];

  add(entries: readonly PackEntry[]): void {
    for (const e of entries) {
      const lower = e.path.toLowerCase();
      this.byPath.set(lower, e);
      this.byName.set(lower.slice(lower.lastIndexOf('/') + 1), e);
    }
  }

  /** Index the given archive files (any order; the groups and their patches are ordered here). */
  static async open(sources: readonly ByteSource[], onProgress?: (done: number, total: number, name: string) => void): Promise<GothicArchives> {
    const a = new GothicArchives();
    const names = sources.map((s) => s.name);
    const ordered: ByteSource[] = [];
    for (const stem of ARCHIVE_GROUPS) for (const n of groupOrder(names, stem)) ordered.push(sources[names.indexOf(n)]!);
    let done = 0;
    for (const s of ordered) {
      onProgress?.(done, ordered.length, s.name);
      a.add(await readPackIndex(s));
      a.sources.push(s);
      done++;
    }
    onProgress?.(done, ordered.length, '');
    return a;
  }

  entry(path: string): PackEntry | undefined {
    return this.byPath.get(path.toLowerCase().replace(/\\/g, '/'));
  }

  /** A resource by its file name (any folder), e.g. `G3_Object_Bench_01.xcmsh`. */
  named(name: string): PackEntry | undefined {
    return this.byName.get(name.toLowerCase());
  }

  async read(path: string): Promise<Uint8Array> {
    const e = this.entry(path);
    if (!e) throw new Error(`not in the archives: ${path}`);
    return readEntry(e);
  }

  async readNamed(name: string): Promise<Uint8Array | null> {
    const e = this.named(name);
    return e ? readEntry(e) : null;
  }

  /** Paths matching a test, in archive order. */
  list(test: (lowerPath: string) => boolean): PackEntry[] {
    const out: PackEntry[] = [];
    for (const [k, e] of this.byPath) if (test(k)) out.push(e);
    return out;
  }
}

/** The archive files a Data folder must hold for this viewer. */
export const REQUIRED_ARCHIVES = ['_compiledImage.pak', '_compiledMaterial.pak', '_compiledMesh.pak', 'Projects_compiled.pak'] as const;

/** From a folder's file names, the ones this viewer reads, and which required ones are missing. */
export function pickArchives(names: readonly string[]): { wanted: string[]; missing: string[] } {
  const lower = names.map((n) => n.toLowerCase());
  const wanted = names.filter((n) => ARCHIVE_GROUPS.some((g) => groupOrder([n], g).length > 0));
  const missing = REQUIRED_ARCHIVES.filter((r) => !lower.includes(r.toLowerCase()));
  return { wanted, missing };
}
