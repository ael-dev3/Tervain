/** Original shared ErrorAdmin storage and source-ordered startup. A cold image
 * is admitted separately from an actual running native singleton. This module
 * retains its CRT holders, MemoryAdmin history and MessageAdmin callback; a
 * partly executed bootstrap never supplies an invented nonpanic value. */
import rulesText from '../../assets/gothic3/runtime-admin/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import type { NativeMemoryAdmin, NativeMemoryAllocation, NativeMemoryBacking } from './native-memory-admin';
import type { NativeMessageAdminModule, NativeMessageCallback, NativeMessageCallbackArguments } from './native-message-admin';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
interface Rules {
  schema: string; inputs: { SharedBase: string };
  coldGlobals: Record<string, { address: string; bytes: number; raw: string; knownMask: string; scope: string }>;
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
  constStrings: Record<string, { address: string; raw: string; text: string }>;
  shutdown: Record<string, { address: string; raw: string; sha256: string }>;
}
const rules = JSON.parse(rulesText) as Rules;
function uint(bytes: Uint8Array, mask: Uint8Array, at: number): number {
  if (at < 0 || at + 4 > bytes.length || !mask.subarray(at, at + 4).every(value => value === 255)) {
    throw new Error('Unknown original ErrorAdmin DWORD+' + at.toString(16));
  }
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(at, true);
}
function write(bytes: Uint8Array, mask: Uint8Array, at: number, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff || at < 0 || at + 4 > bytes.length) {
    throw new Error('Original ErrorAdmin uint32 storage required');
  }
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(at, value, true);
  mask.fill(255, at, at + 4);
}
function byte(bytes: Uint8Array, mask: Uint8Array, at: number): number {
  if (at < 0 || at >= bytes.length || mask[at] !== 255) throw new Error('Unknown original ErrorAdmin byte');
  return bytes[at]!;
}
function writeByte(bytes: Uint8Array, mask: Uint8Array, at: number, value: number): void {
  bytes[at] = value; mask[at] = 255;
}
function pointer(backing: { bytes: Uint8Array; knownMask: Uint8Array }, at: number, value: object | null): void {
  if (value === null) write(backing.bytes, backing.knownMask, at, 0);
  else backing.knownMask.fill(0, at, at + 4); // Retain capability without inventing a native pointer DWORD.
}
/** Explicit ASCII C-string profile, including native termination at the first
 * NUL. Other encodings require a separately owned original byte string. */
function cString(text: string): string {
  const result = text.split('\0', 1)[0]!;
  if (!/^[\x01-\x7f]*$/.test(result)) throw new Error('Original ErrorAdmin non-ASCII C-string encoding is unowned');
  return result;
}

export class NativeErrorAdminStorage {
  readonly bytes: Uint8Array;
  readonly knownMask: Uint8Array;
  constructor(readonly address: string, label: string, size: number) {
    const source = rules.coldGlobals[label];
    if (rules.schema !== 'gothic3-runtime-admin-rules-v1' ||
        rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
        !source || source.address !== address || source.bytes !== size || source.scope !== 'cold-original-image' ||
        source.raw !== '00'.repeat(size) || source.knownMask !== 'ff'.repeat(size)) {
      throw new Error('Original ErrorAdmin cold storage receipt differs: ' + label);
    }
    this.bytes = new Uint8Array(size); this.knownMask = new Uint8Array(size).fill(255);
  }
  uint(at: number): number { return uint(this.bytes, this.knownMask, at); }
  writeUint(at: number, value: number): void { write(this.bytes, this.knownMask, at, value); }
}

export interface NativeErrorAdminHost {
  readonly memory: Pick<NativeMemoryAdmin, 'getInstance' | 'realloc' | 'free'>;
  crtNew(bytes: number): NativeValue<NativeMemoryBacking | null>;
  crtMalloc(bytes: number): NativeValue<NativeMemoryBacking | null>;
  crtFree(backing: NativeMemoryBacking): NativeValue<void>;
  initializeCriticalSection(address: string, owner: object): NativeValue<object>;
  deleteCriticalSection(section: object): NativeValue<void>;
  registerShutdown(address: string, owner: object, callback: () => NativeValue<void>): NativeValue<number>;
  messageAdmin(): NativeValue<Pick<NativeMessageAdminModule, 'registerCallback' | 'unregisterCallback'>>;
  /** Actual registered Error shutdown may consume Message's guard-first
   * partial array without presenting the blocked Message service as ready. */
  unregisterMessageCallbackForShutdown?(callback: NativeMessageCallback, owner: object): NativeValue<number>;
}
type Phase = 'cold' | 'constructing' | 'ready' | 'destroying' | 'blocked' | 'disposed';
interface Holder { readonly storage: NativeMemoryBacking; data: NativeMemoryAllocation | null }

export class NativeErrorAdminModule {
  readonly storage = new NativeErrorAdminStorage('10142a58', 'errorAdmin', 44);
  readonly guard = new NativeErrorAdminStorage('10142a8c', 'errorAdminGuard', 4);
  readonly popScratch = new NativeErrorAdminStorage('10144028', 'errorHistoryPopScratch', 250);
  readonly pushScratch = new NativeErrorAdminStorage('10143ef8', 'errorHistoryPushScratch', 250);
  private phase: Phase = 'cold';
  private boundary: string | null = null;
  private section: object | null = null;
  private messageBootstrapDepth = 0;
  private history: Holder | null = null;
  private callbacks: Holder | null = null;
  private callbacks2: Holder | null = null;
  private readonly trace: string[] = [];
  readonly callback: NativeMessageCallback = Object.freeze({ address: '10002df6',
    invoke: (args: NativeMessageCallbackArguments) => this.invokeCallback(args) });

  constructor(private readonly host: NativeErrorAdminHost) {
    for (const [label, entry, body, hash] of [
      ['errorGetInstance', '10006c1c', '10021960', '8d05f078501985b05ac39828d04d2e19bee5e312340f6286f1b3e3b1a3ed8ead'],
      ['errorCreate', '10001db1', '10022760', '8cd73bbf50ca3f2e7e3d2ad88c675acd8e3ce7d9c67f0a56249845e28371f1ad'],
      ['errorDestroy', '100032c4', '100226a0', '7c9c02fe1d2e0fde523c38c86e1f1cd675a7ef9bf27c890bce6e0142d291deec'],
      ['errorIsInPanicState', '100075ae', '100214d0', '0a104173cbfe9fab8559c3bb9a9edaaa96ae28f1c03545d36a31e51137b804ea'],
      ['errorMessageCallback', '10002df6', '10022590', '4096e3eb10be742a8aa99e4ac1ff0982a43d031cdaf89771fef4263ffa906243'],
      ['errorAddHistory', '1000102d', '100224f0', '4ac0963660ac8b8f9abf3c3a1dd06ddd4baef4c2adf44d02942623e52a1e1293'],
      ['errorHistoryPop', '10023050', '10023050', '1a9c1502c8db16ad31cf74c650d0a24605edc3991c6c13cc26053dbdd3926ce0'],
      ['errorHistoryPush', '100233e0', '100233e0', '38d5564d757993919162bca8a448e4c7d647d413f252ed9a55a0154e603e8f82'],
    ]) {
      const method = rules.methods[label!];
      if (!method || method.entry !== entry || method.body !== body || method.bodyInstructionBytesSha256 !== hash) {
        throw new Error('Original ErrorAdmin method receipt differs: ' + label);
      }
    }
    const shutdown = rules.shutdown['100e2770'];
    if (shutdown?.raw !== 'b9582a1410e84a0bf2ff68602a1410ff15f8952f10c3' ||
        shutdown.sha256 !== '08c6fa8d21325dcadf3d51e0789a5c6f3633dcc390463c12f6cc9f8a2314bfff') {
      throw new Error('Original ErrorAdmin nonempty shutdown differs');
    }
    for (const [address, text] of [['100e70d0', '%s, Desc:%s '], ['100e70e0', '%s '],
      ['100e70e4', "%s, Desc:%s, Z:#%d -> '%s'"], ['100e7104', "%s, Z:#%d -> '%s'"]]) {
      const source = rules.constStrings[address!];
      const expected = [...text!].map(value => value.charCodeAt(0).toString(16).padStart(2, '0')).join('') + '00';
      if (!source || source.address !== address || source.text !== text || source.raw !== expected) {
        throw new Error('Original ErrorAdmin format bytes differ: ' + address);
      }
    }
  }
  private block(reason: string): { known: false; reason: string } {
    this.phase = 'blocked'; this.boundary = reason; return unknown(reason);
  }
  private attempt<T>(body: () => NativeValue<T>): NativeValue<T> {
    try { return body(); } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  private message(): ReturnType<NativeErrorAdminHost['messageAdmin']> {
    this.messageBootstrapDepth++;
    try { return this.host.messageAdmin(); } finally { this.messageBootstrapDepth--; }
  }
  /** Only Message.Create's actual recursive GetInstance may observe the same
   * in-progress pointer. It does not read flags. No blocked bootstrap replays. */
  getInstanceForMessageBootstrap(): NativeValue<object> {
    if (this.phase === 'constructing' && this.messageBootstrapDepth > 0 && (this.guard.uint(0) & 1)) {
      this.trace.push('error.message.bootstrap.alias'); return known(this);
    }
    return this.getInstance();
  }
  getInstance(): NativeValue<NativeErrorAdminModule> {
    if (this.phase === 'blocked' || this.phase === 'disposed') return unknown(this.boundary ?? 'Original ErrorAdmin is disposed');
    if (this.phase === 'constructing' || this.phase === 'destroying') return unknown('Original ErrorAdmin construction/teardown has not completed');
    if (this.phase === 'ready') return known(this);
    const result = this.attempt(() => {
      this.guard.writeUint(0, this.guard.uint(0) | 1); this.phase = 'constructing'; this.trace.push('error.guard');
      const section = this.host.initializeCriticalSection('10142a60', this.storage);
      if (!section.known) return unknown('ErrorAdmin.InitializeCriticalSection: ' + section.reason);
      this.section = section.value; this.storage.knownMask.fill(0, 8, 32); this.invalidate();
      const created = this.create(); if (!created.known) return created;
      const registered = this.host.registerShutdown('100e2770', this, () => this.shutdown());
      if (!registered.known) return unknown('ErrorAdmin._atexit: ' + registered.reason);
      // Native GetInstance ignores the signed _atexit result. The platform
      // separately records an actual registration when its return is zero.
      this.trace.push('error.shutdown.register'); this.phase = 'ready'; return known(this);
    });
    return result.known ? result : this.block(result.reason);
  }
  private invalidate(): void {
    this.storage.writeUint(0, 0); writeByte(this.storage.bytes, this.storage.knownMask, 4, 0);
    writeByte(this.storage.bytes, this.storage.knownMask, 5, 0);
    for (const at of [32, 36, 40]) this.storage.writeUint(at, 0);
    this.history = null; this.callbacks = null; this.callbacks2 = null; this.trace.push('error.invalidate');
  }
  private newHolder(size: 12 | 20): NativeValue<Holder | null> {
    const storage = this.host.crtNew(size); if (!storage.known) return storage;
    if (storage.value === null) return known(null);
    if (storage.value.freed || storage.value.bytes.length < size || storage.value.knownMask.length !== storage.value.bytes.length) {
      return unknown('Actual live ErrorAdmin CRT holder backing required');
    }
    for (let at = 0; at < (size === 20 ? 16 : 12); at += 4) write(storage.value.bytes, storage.value.knownMask, at, 0);
    if (size === 20) writeByte(storage.value.bytes, storage.value.knownMask, 16, 0);
    return known({ storage: storage.value, data: null });
  }
  private create(): NativeValue<void> {
    const destroyed = this.destroy(); if (!destroyed.known) return destroyed;
    this.invalidate();
    const history = this.newHolder(20); if (!history.known) return unknown('ErrorAdmin history holder: ' + history.reason);
    if (history.value) {
      const admin = this.host.memory.getInstance(); if (!admin.known) return admin;
      const allocation = this.host.memory.realloc(null, 12500); if (!allocation.known) return allocation;
      history.value.data = allocation.value; pointer(history.value.storage, 0, allocation.value);
      if (byte(history.value.storage.bytes, history.value.storage.knownMask, 16) !== 0) {
        write(history.value.storage.bytes, history.value.storage.knownMask, 12,
          uint(history.value.storage.bytes, history.value.storage.knownMask, 4));
      }
      write(history.value.storage.bytes, history.value.storage.knownMask, 4, 50);
      writeByte(history.value.storage.bytes, history.value.storage.knownMask, 16, 0);
    }
    this.history = history.value; pointer(this.storage, 32, history.value?.storage ?? null); this.trace.push('error.history.create');
    const callbacks = this.newHolder(12); if (!callbacks.known) return callbacks;
    this.callbacks = callbacks.value; pointer(this.storage, 36, callbacks.value?.storage ?? null);
    const callbacks2 = this.newHolder(12); if (!callbacks2.known) return callbacks2;
    this.callbacks2 = callbacks2.value; pointer(this.storage, 40, callbacks2.value?.storage ?? null);
    const message = this.message(); if (!message.known) return message;
    const registered = message.value.registerCallback(this.callback, 1, this);
    if (!registered.known) return registered;
    this.trace.push('error.callback.register'); return known(undefined);
  }
  private destroyHolder(holder: Holder, size: 12 | 20): NativeValue<void> {
    if (holder.data) {
      const admin = this.host.memory.getInstance(); if (!admin.known) return admin;
      const freed = this.host.memory.free(holder.data); if (!freed.known) return freed;
      holder.data = null;
      for (let at = 0; at < (size === 20 ? 16 : 12); at += 4) write(holder.storage.bytes, holder.storage.knownMask, at, 0);
      if (size === 20) writeByte(holder.storage.bytes, holder.storage.knownMask, 16, 0);
    }
    return this.host.crtFree(holder.storage);
  }
  private destroy(shutdown = false): NativeValue<void> {
    for (const [holder, size] of [[this.history, 20], [this.callbacks, 12], [this.callbacks2, 12]] as const) {
      if (holder) { const destroyed = this.destroyHolder(holder, size); if (!destroyed.known) return destroyed; }
    }
    this.invalidate();
    // This happens even when every original holder pointer was NULL.
    let removed: NativeValue<number>;
    if (shutdown) {
      const cleanup = this.host.unregisterMessageCallbackForShutdown;
      if (!cleanup) return unknown('Actual Error shutdown Message callback cleanup capability required');
      removed = cleanup(this.callback, this);
    } else {
      const message = this.message(); if (!message.known) return message;
      removed = message.value.unregisterCallback(this.callback);
    }
    if (!removed.known) return removed;
    this.trace.push('error.callback.unregister'); return known(undefined);
  }
  isInPanicState(): NativeValue<boolean> {
    const owner = this.getInstance(); if (!owner.known) return owner;
    return this.attempt(() => known(byte(this.storage.bytes, this.storage.knownMask, 4) === 1 ||
      byte(this.storage.bytes, this.storage.knownMask, 5) === 1));
  }
  /** Actual ring writes/copies through retained MemoryAdmin storage. Unknown
   * allocation/encoding branches stop before pretending history was added. */
  addHistory(text: string | null): NativeValue<void> {
    return this.attempt(() => {
      if (this.phase !== 'ready') return unknown('Actual completed ErrorAdmin required for AddHistory');
      if (!this.history || text === null) return known(undefined);
      const holder = this.history.storage;
      if (holder.freed) return unknown('ErrorAdmin history holder is freed');
      if (byte(holder.bytes, holder.knownMask, 16) === 1) {
        const popped = this.popHistory(); if (!popped.known) return popped;
      }
      this.pushScratch.bytes.fill(0); this.pushScratch.knownMask.fill(255);
      const message = cString(text);
      for (let index = 0; index < Math.min(249, message.length); index++) this.pushScratch.bytes[index] = message.charCodeAt(index);
      if (byte(holder.bytes, holder.knownMask, 16) !== 0) return known(undefined); // original AL0 ignored by AddHistory.
      const oldWrite = uint(holder.bytes, holder.knownMask, 12);
      const capacity = uint(holder.bytes, holder.knownMask, 4), read = uint(holder.bytes, holder.knownMask, 8);
      if (!this.history.data || this.history.data.freed || oldWrite >= capacity || read >= capacity || capacity !== 50) {
        return unknown('Actual ErrorAdmin ring data and valid original indexes required');
      }
      const next = oldWrite + 1 === capacity ? 0 : oldWrite + 1;
      write(holder.bytes, holder.knownMask, 12, next);
      writeByte(holder.bytes, holder.knownMask, 16, next === read ? 1 : 0);
      this.history.data.bytes.set(this.pushScratch.bytes, oldWrite * 250);
      this.history.data.knownMask.set(this.pushScratch.knownMask, oldWrite * 250);
      this.trace.push('error.history.push'); return known(undefined);
    });
  }
  private popHistory(): NativeValue<void> {
    const holder = this.history!;
    const full = byte(holder.storage.bytes, holder.storage.knownMask, 16);
    const read = uint(holder.storage.bytes, holder.storage.knownMask, 8), writeIndex = uint(holder.storage.bytes, holder.storage.knownMask, 12);
    if (full === 0 && (holder.data === null || read === writeIndex)) return known(undefined);
    const capacity = uint(holder.storage.bytes, holder.storage.knownMask, 4);
    if (!holder.data || holder.data.freed || read >= capacity || capacity !== 50) return unknown('Actual ErrorAdmin ring pop backing required');
    this.popScratch.bytes.set(holder.data.bytes.subarray(read * 250, (read + 1) * 250));
    this.popScratch.knownMask.set(holder.data.knownMask.subarray(read * 250, (read + 1) * 250));
    write(holder.storage.bytes, holder.storage.knownMask, 8, read + 1 === capacity ? 0 : read + 1);
    writeByte(holder.storage.bytes, holder.storage.knownMask, 16, 0);
    this.trace.push('error.history.pop'); return known(undefined);
  }
  private invokeCallback(args: NativeMessageCallbackArguments): NativeValue<boolean> {
    return this.attempt(() => {
      if (args.userData === null) return known(false);
      const owner = this.getInstance(); if (!owner.known) return owner;
      if (args.userData !== owner.value || args.message === null) return known(false);
      const message = cString(args.message), description = args.description === null ? null : cString(args.description);
      const file = args.sourceFile === null ? null : cString(args.sourceFile);
      const size = message.length + (description?.length ?? 0) + (file?.length ?? 0) + 512;
      const allocation = this.host.crtMalloc(size); if (!allocation.known) return allocation;
      if (allocation.value === null) return unknown('Native ErrorAdmin sprintf into NULL is outside supported CRT allocation profile');
      const temporary = allocation.value;
      if (temporary.freed || temporary.bytes.length < size || temporary.knownMask.length !== temporary.bytes.length) {
        return unknown('Actual ErrorAdmin sprintf CRT backing required');
      }
      // Exact %d is a signed 32-bit argument, consumed only in file variants.
      if (file !== null && (!Number.isInteger(args.line) || args.line < -0x80000000 || args.line > 0xffffffff)) {
        return unknown('Original ErrorAdmin signed line argument required');
      }
      const line = args.line | 0;
      const formatted = file === null
        ? description === null ? message + ' ' : message + ', Desc:' + description + ' '
        : description === null ? `${message}, Z:#${line} -> '${file}'` : `${message}, Desc:${description}, Z:#${line} -> '${file}'`;
      if (formatted.length + 1 > temporary.bytes.length) return unknown('Original ErrorAdmin sprintf destination exceeds retained allocation');
      for (let at = 0; at < formatted.length; at++) writeByte(temporary.bytes, temporary.knownMask, at, formatted.charCodeAt(at));
      writeByte(temporary.bytes, temporary.knownMask, formatted.length, 0);
      const again = this.getInstance(); if (!again.known) return again;
      const history = this.addHistory(formatted); if (!history.known) return history;
      const freed = this.host.crtFree(temporary); if (!freed.known) return freed;
      this.trace.push('error.callback.history/free'); return known(true);
    });
  }
  shutdown(): NativeValue<void> {
    if (this.phase !== 'ready') return unknown(this.boundary ?? 'Actual ready ErrorAdmin required for shutdown');
    this.phase = 'destroying';
    const result = this.attempt(() => {
      const destroyed = this.destroy(true); if (!destroyed.known) return destroyed;
      if (!this.section) return unknown('Original ErrorAdmin initialized section required for shutdown');
      const deleted = this.host.deleteCriticalSection(this.section); if (!deleted.known) return deleted;
      this.section = null; this.phase = 'disposed'; this.trace.push('error.shutdown'); return known(undefined);
    });
    return result.known ? result : this.block(result.reason);
  }
  snapshot() {
    return Object.freeze({ phase: this.phase, boundary: this.boundary, history: this.history,
      callbacks: this.callbacks, callbacks2: this.callbacks2, section: this.section,
      trace: Object.freeze(this.trace.slice()) });
  }
}
