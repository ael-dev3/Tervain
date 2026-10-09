import type { NativeValue } from './dialogue';

/** Copied virtual filesystem inputs. No host paths, callbacks or HANDLE values. */
export interface NativeWin32FileSystemSelection {
  readonly cwd: string;
  readonly directories: readonly string[];
  readonly files: readonly Readonly<{ path: string; bytes: readonly number[]; readable: boolean }>[];
}
export interface NativeWin32CreateFileArguments {
  readonly filename: string;
  readonly access: number;
  readonly share: number;
  readonly security: Readonly<{ length: number; descriptor: number; inherit: number }>;
  readonly disposition: number;
  readonly attributes: number;
  readonly template: number;
}
export interface NativeWin32FileHandle { readonly identity: object; readonly owner: object; }
export type NativeWin32CreateFileResult = Readonly<{ handle: NativeWin32FileHandle | 0xffffffff; lastError?: number }>;

function own(record: unknown, key: string): unknown {
  if (!record || typeof record !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(record))) {
    throw new Error('Filesystem declarations require plain own data records');
  }
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new Error('Filesystem accessor or missing declaration: ' + key);
  return descriptor.value;
}
function array(value: unknown): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).includes(Symbol.iterator)) {
    throw new Error('Filesystem declarations require ordinary data arrays');
  }
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new Error('Filesystem array accessor or hole');
    result.push(descriptor.value);
  }
  return result;
}
/** Selected ASCII DOS paths; device, UNC and drive-relative names remain unsupported. */
function path(value: unknown, cwd?: string): string {
  if (typeof value !== 'string' || !value || /[^\x20-\x7e]/.test(value)) throw new Error('Selected ASCII filesystem path required');
  let input = value.replaceAll('\\', '/');
  if (!/^[a-z]:\//i.test(input)) {
    if (!cwd || input.startsWith('/') || input.includes(':')) throw new Error('Explicit absolute DOS path or ordinary relative path required');
    input = cwd + '/' + input;
  }
  const drive = input.slice(0, 2).toLowerCase(), parts: string[] = [];
  for (const part of input.slice(3).split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') { parts.pop(); continue; }
    if (/[<>:"|?*]/.test(part) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) {
      throw new Error('Unsupported DOS device or special path component');
    }
    parts.push(part.toLowerCase());
  }
  return drive + '/' + parts.join('/');
}
function parent(value: string): string { const end = value.lastIndexOf('/'); return end <= 2 ? value.slice(0, 3) : value.slice(0, end); }

export function retainNativeWin32FileSystemSelection(selection: NativeWin32FileSystemSelection): NativeWin32FileSystemSelection {
  return Object.freeze({ cwd: own(selection, 'cwd') as string,
    directories: Object.freeze(array(own(selection, 'directories')) as string[]),
    files: Object.freeze(array(own(selection, 'files')).map(item => Object.freeze({ path: own(item, 'path') as string,
      bytes: Object.freeze(array(own(item, 'bytes')) as number[]), readable: own(item, 'readable') as boolean }))) });
}

/** Owned regular files for the selected synchronous GENERIC_READ / OPEN_EXISTING ABI.
 * Missing paths and denied reads follow lookup; they are not declared call returns.
 * Other API modes must be implemented before they can execute. */
export class NativeWin32FileSystem {
  readonly #owner: object;
  readonly #cwd: string;
  readonly #directories: ReadonlySet<string>;
  readonly #files: ReadonlyMap<string, Readonly<{ bytes: Uint8Array; readable: boolean }>>;
  readonly #handles = new Map<object, Readonly<{ handle: NativeWin32FileHandle; path: string; inherit: boolean }>>();
  readonly #knownHandles = new WeakSet<object>();
  #retiredHandleCount = 0;
  constructor(owner: object, selection: NativeWin32FileSystemSelection) {
    this.#owner = owner;
    this.#cwd = path(own(selection, 'cwd'));
    const directories = new Set(array(own(selection, 'directories')).map(value => path(value)));
    if (!directories.has(this.#cwd)) throw new Error('Declared working directory must exist');
    for (const directory of directories) {
      if (directory.length > 3 && !directories.has(parent(directory))) throw new Error('Declared parent directory must exist');
    }
    const files = new Map<string, Readonly<{ bytes: Uint8Array; readable: boolean }>>();
    for (const item of array(own(selection, 'files'))) {
      const filename = path(own(item, 'path'), this.#cwd), readable = own(item, 'readable');
      const bytes = array(own(item, 'bytes'));
      if (typeof readable !== 'boolean' || bytes.some(byte => typeof byte !== 'number' || !Number.isInteger(byte) || byte < 0 || byte > 255)) {
        throw new Error('Explicit file permissions and byte values required');
      }
      if (!directories.has(parent(filename)) || directories.has(filename) || files.has(filename)) throw new Error('Unique regular file with existing parent required');
      files.set(filename, Object.freeze({ bytes: new Uint8Array(bytes as number[]), readable }));
    }
    this.#directories = directories; this.#files = files;
  }
  open(input: NativeWin32CreateFileArguments): NativeValue<NativeWin32CreateFileResult> {
    if (input.access !== 0x80000000 || input.share !== 3 || input.disposition !== 3 || input.attributes !== 0x80 || input.template !== 0 ||
        input.security.length !== 12 || input.security.descriptor !== 0 || ![0, 1].includes(input.security.inherit)) {
      return { known: false, reason: 'Unsupported CreateFileA access, sharing, security or creation mode' };
    }
    let filename: string;
    try { filename = path(input.filename, this.#cwd); } catch (error) { return { known: false, reason: String(error) }; }
    const failure = (lastError: number): NativeValue<NativeWin32CreateFileResult> => ({ known: true, value: Object.freeze({ handle: 0xffffffff, lastError }) });
    if (!this.#directories.has(parent(filename))) return failure(3);
    if (this.#directories.has(filename)) return failure(5);
    const file = this.#files.get(filename);
    if (!file) return failure(2);
    if (!file.readable) return failure(5);
    const handle = Object.freeze({ identity: Object.freeze({}), owner: this.#owner });
    this.#handles.set(handle, Object.freeze({ handle, path: filename, inherit: input.security.inherit !== 0 }));
    this.#knownHandles.add(handle);
    return { known: true, value: Object.freeze({ handle }) };
  }
  owns(handle: object): boolean { return this.#handles.get(handle)?.handle === handle; }
  recognizes(handle: object): boolean { return this.#knownHandles.has(handle); }
  close(handle: object): NativeValue<number> {
    if (!this.owns(handle)) return { known: false, reason: 'Actual live regular-file handle required by CloseHandle' };
    this.#handles.delete(handle); this.#retiredHandleCount++;
    return { known: true, value: 1 };
  }
  fileType(handle: object): NativeValue<number> { return this.owns(handle) ? { known: true, value: 1 } : { known: false, reason: 'Actual live regular-file handle required' }; }
  snapshot() { return Object.freeze({ cwd: this.#cwd, retiredHandleCount: this.#retiredHandleCount, openHandles: Object.freeze([...this.#handles.values()].map(entry => Object.freeze({ handle: entry.handle, path: entry.path, inherit: entry.inherit, byteLength: this.#files.get(entry.path)!.bytes.length }))) }); }
}
