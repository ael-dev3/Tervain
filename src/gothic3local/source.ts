import { BlobSource, type ByteSource, HttpSource, pickArchives } from './archive';

/**
 * Where the player's Gothic 3 data comes from: a folder they pick (File System Access API, or a directory input), or,
 * under `npm run dev` with G3_DATA set, the development server. Nothing is uploaded: the page reads the picked files in
 * the browser.
 */

export interface DataSelection {
  sources: ByteSource[];
  label: string;
}

/** The archive files in a picked directory (its own files; the picker should be pointed at `Gothic 3/Data`). */
export function selectFromFiles(files: readonly File[]): DataSelection | { missing: string[] } {
  // A directory input gives every file under the folder; keep the archives directly in a `Data` folder, or the folder.
  const byName = new Map<string, File>();
  for (const f of files) {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    const parts = rel.split('/');
    const parent = parts.length >= 2 ? parts[parts.length - 2]!.toLowerCase() : '';
    if (parts.length > 2 && parent !== 'data') continue;
    byName.set(f.name, f);
  }
  const { wanted, missing } = pickArchives([...byName.keys()]);
  if (missing.length) return { missing };
  return { sources: wanted.map((n) => new BlobSource(byName.get(n)!, n)), label: `${wanted.length} archives from your folder` };
}

interface DirectoryHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterable<{ kind: string; name: string; getFile?: () => Promise<File>; getDirectoryHandle?: unknown }>;
  getDirectoryHandle(name: string): Promise<DirectoryHandle>;
  queryPermission?(o: { mode: 'read' }): Promise<string>;
  requestPermission?(o: { mode: 'read' }): Promise<string>;
}

export function canPickDirectory(): boolean {
  return typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';
}

/** Pick the folder with the File System Access API; accepts the game folder or its Data folder. */
export async function pickDirectory(): Promise<DirectoryHandle> {
  const picker = (window as unknown as { showDirectoryPicker: (o: object) => Promise<DirectoryHandle> }).showDirectoryPicker;
  return picker({ id: 'gothic3-data', mode: 'read' });
}

export async function selectFromDirectory(dir: DirectoryHandle): Promise<DataSelection | { missing: string[] }> {
  let data = dir;
  if (dir.name.toLowerCase() !== 'data') {
    try {
      data = await dir.getDirectoryHandle('Data');
    } catch {
      data = dir;
    }
  }
  const files: File[] = [];
  for await (const entry of data.values()) {
    if (entry.kind === 'file' && /\.(pak|p\d\d)$/i.test(entry.name) && entry.getFile) files.push(await entry.getFile());
  }
  const r = selectFromFiles(files);
  if ('sources' in r) r.label = `${r.sources.length} archives from “${dir.name}”`;
  return r;
}

/** The development server's data folder, if `npm run dev` was started with G3_DATA. */
export async function devSelection(): Promise<DataSelection | null> {
  try {
    const res = await fetch('/__g3data/');
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null;
    const list = (await res.json()) as { archives: { name: string; size: number }[] };
    const { wanted, missing } = pickArchives(list.archives.map((a) => a.name));
    if (missing.length) return null;
    return {
      sources: wanted.map((n) => new HttpSource(`/__g3data/${encodeURIComponent(n)}`, n, list.archives.find((a) => a.name === n)!.size)),
      label: 'the development data folder',
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ remembering a picked folder (this browser only) */

const DB = 'gothic3-local';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function rememberDirectory(dir: DirectoryHandle): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(dir, 'data');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Remembering is a convenience.
  }
}

export async function rememberedDirectory(): Promise<DirectoryHandle | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const req = db.transaction('handles').objectStore('handles').get('data');
      req.onsuccess = () => resolve((req.result as DirectoryHandle | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function ensureReadable(dir: DirectoryHandle): Promise<boolean> {
  if (!dir.queryPermission || !dir.requestPermission) return true;
  if ((await dir.queryPermission({ mode: 'read' })) === 'granted') return true;
  return (await dir.requestPermission({ mode: 'read' })) === 'granted';
}

export type { DirectoryHandle };
