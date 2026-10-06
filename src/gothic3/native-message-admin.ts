/** SharedBase Message/Spy/Spie cold singleton ownership. Native callback array
 * records live in the retained MemoryAdmin allocations. Platform window, file,
 * critical-section and shutdown services are explicit capabilities. */
import rulesText from '../../assets/gothic3/runtime-admin/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import type { NativeMemoryAdmin, NativeMemoryAllocation } from './native-memory-admin';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
const INPUT = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214';
interface ColdGlobal { address: string; bytes: number; raw: string; knownMask: string; scope: string }
interface SourceRules {
  schema: string; inputs: { SharedBase: string };
  coldGlobals: Record<string, ColdGlobal>;
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
  shutdown: Record<string, { address: string; raw: string; sha256: string }>;
}
const source = JSON.parse(rulesText) as SourceRules;
function raw(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/.test(hex)) throw new Error('Exact source bytes required');
  return Uint8Array.from(hex.match(/../g)!, byte => parseInt(byte, 16));
}
function word(bytes: Uint8Array, mask: Uint8Array, at: number): number {
  if (at < 0 || at + 4 > bytes.length || !mask.subarray(at, at + 4).every(value => value === 255)) {
    throw new Error('Unknown native MessageAdmin word+' + at.toString(16));
  }
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(at, true);
}
function write(bytes: Uint8Array, mask: Uint8Array, at: number, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff || at < 0 || at + 4 > bytes.length) {
    throw new Error('Actual native uint32 storage required');
  }
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(at, value, true);
  mask.fill(255, at, at + 4);
}
function pointer(bytes: Uint8Array, mask: Uint8Array, at: number, value: object | null): void {
  if (value === null) write(bytes, mask, at, 0);
  else mask.fill(0, at, at + 4); // actual capability retained; native address encoding is unknown.
}

/** Source static storage, distinct from a captured running DLL instance. */
export class NativeMessageAdminStorage {
  readonly bytes: Uint8Array;
  readonly knownMask: Uint8Array;
  constructor(readonly address: string, label: string, size: number) {
    const receipt = source.coldGlobals[label];
    if (source.schema !== 'gothic3-runtime-admin-rules-v1' || source.inputs.SharedBase !== INPUT ||
        !receipt || receipt.address !== address || receipt.bytes !== size || receipt.scope !== 'cold-original-image' ||
        receipt.raw !== '00'.repeat(size) || receipt.knownMask !== 'ff'.repeat(size)) {
      throw new Error('Original MessageAdmin cold storage receipt differs: ' + label);
    }
    this.bytes = raw(receipt.raw); this.knownMask = raw(receipt.knownMask);
  }
  uint(at: number): number { return word(this.bytes, this.knownMask, at); }
  writeUint(at: number, value: number): void { write(this.bytes, this.knownMask, at, value); }
}

export interface NativeMessageCallbackArguments {
  readonly type: number;
  readonly message: string | null;
  readonly description: string | null;
  readonly userData: object | null;
  readonly sourceFile: string | null;
  readonly line: number;
  readonly priority: number;
}
export interface NativeMessageCallback {
  readonly address: string;
  invoke(arguments_: NativeMessageCallbackArguments): NativeValue<boolean>;
}
export interface NativeMessageCallbackRecord {
  readonly callback: NativeMessageCallback;
  readonly userData: object | null;
  readonly priority: number;
}
export interface NativeMessageDiagnosticPlatform {
  findWindow(className: null, title: '[zSpy]'): NativeValue<object | null>;
  fopen(path: 'zSpie.txt', mode: 'r'): NativeValue<object | null>;
  /** Exact source warning when any already registered callback has priority0. */
  messageBox?(textAddress: '100e7d70', caption: 'bCMessageAdmin::RegisterCallback', flags: 0x30): NativeValue<number>;
  registerWindowMessage?(name: 'WM_LOGCOMMAND'): NativeValue<number>;
  addAtom?(name: 'START' | 'SHOW'): NativeValue<number>;
  broadcast?(message: number, wparam: 0, atom: number): NativeValue<number>;
  deleteAtom?(atom: number): NativeValue<number>;
  createMutex?(): NativeValue<object | null>;
  fclose?(file: object): NativeValue<number>;
  wsaStartup?(version: 0x101): NativeValue<number>;
  socket?(family: 2, type: 2, protocol: 0): NativeValue<number>;
  connectLoopback?(socket: number, address: '127.0.0.1', port: 4711): NativeValue<number>;
  send?(socket: number, byte: 0 | 1, flags: 0): NativeValue<number>;
}
export interface NativeMessageAdminHost {
  readonly memory: Pick<NativeMemoryAdmin, 'getInstance' | 'newObject' | 'realloc' | 'free' | 'deleteObject'>;
  initializeCriticalSection(address: string, owner: object): NativeValue<object>;
  deleteCriticalSection(section: object): NativeValue<void>;
  registerShutdown(address: string, owner: object, callback: () => NativeValue<void>): NativeValue<number>;
  /** This calls the actual ErrorAdmin.GetInstance. Only its executing source
   * bootstrap may return the same in-progress Error singleton capability. */
  getErrorAdminForMessageBootstrap(): NativeValue<object>;
  readonly diagnostics: NativeMessageDiagnosticPlatform;
}
type Phase = 'cold' | 'constructing' | 'ready' | 'blocked';

/** One retained module shares all three static admins. Guard-first reentry is
 * allowed during their synchronous source construction, never after a blocked
 * prerequisite. The actual nonempty callbacks use these same live owners. */
export class NativeMessageAdminModule {
  readonly storage = new NativeMessageAdminStorage('10197d6c', 'messageAdmin', 32);
  readonly guard = new NativeMessageAdminStorage('10197d94', 'messageAdminGuard', 4);
  readonly spy = new NativeMessageAdminStorage('101ab11c', 'spyAdmin', 32);
  readonly spyGuard = new NativeMessageAdminStorage('101ab144', 'spyAdminGuard', 4);
  readonly spie = new NativeMessageAdminStorage('10197dc0', 'spieAdmin', 28);
  readonly spieGuard = new NativeMessageAdminStorage('10197de4', 'spieAdminGuard', 4);
  readonly spieEnabled = new NativeMessageAdminStorage('10197dbc', 'spieEnabled', 4);
  private phase: Phase = 'cold';
  private spyPhase: Phase = 'cold';
  private spiePhase: Phase = 'cold';
  private boundary: string | null = null;
  private spyBoundary: string | null = null;
  private spieBoundary: string | null = null;
  private section: object | null = null;
  private spySection: object | null = null;
  private spieSection: object | null = null;
  private holder: NativeMemoryAllocation | null = null;
  private backing: NativeMemoryAllocation | null = null;
  // Bindings give pointer capabilities to the actual records, whose scalar
  // words and ordering remain authoritative in MemoryAdmin's retained bytes.
  private readonly bindings = new Map<number, NativeMessageCallbackRecord>();
  // Registration identity survives a later array erase/free so the actual
  // Error destructor can execute source Unregister's NULL/no-match branch.
  private readonly errorShutdownCallbacks = new WeakMap<object, NativeMessageCallback>();
  private spyWindow: object | null = null;
  private spyMutex: object | null = null;
  private readonly trace: string[] = [];
  readonly spyCallback: NativeMessageCallback = Object.freeze({ address: '10008c06',
    invoke: (args: NativeMessageCallbackArguments) => this.invokeSpy(args) });
  readonly spieCallback: NativeMessageCallback = Object.freeze({ address: '10005722',
    invoke: (args: NativeMessageCallbackArguments) => this.invokeSpie(args) });

  constructor(private readonly host: NativeMessageAdminHost) {
    for (const [label, entry, body, sha256] of [
      ['messageGetInstance', '100088b4', '10049760', '9e789d649b2c759724d59dd26db01b4bf14f888443a1610f8360983ce0b8fed0'],
      ['messageCreate', '10006b7c', '100495f0', '1ed9296be51f8d18d52ceca8d323ef83e125ca08a9b645a7c2fcb695a909c136'],
      ['messageDestroy', '1000247d', '100495d0', 'c929a0862c4373be88d58240c15e0e3b4a1fbc2b59260220a312d7b0819a8dd2'],
      ['messageRegister', '10007cac', '10049650', '4be20dc87cc964adfa7cfa563b44f9f1532a616c8356890527e487afd6777a69'],
      ['messageUnregister', '10001c21', '10049580', 'e45d31295928c36bd4124178cdaa82d5bf2f118d028f0ebf2d615f00cd34e5f2'],
      ['messageArrayGrow', '1000631b', '10049d80', '73b609166cecc4aa9a10a3745508a9310d974c86345588fad544207b8242771d'],
      ['messageArrayErase', '10004822', '10049ce0', '7ca1bec073a5c8ab5caff07d98e0ba8455bda4c73bad50f017f49d8b78d7b8df'],
      ['messageArrayDelete', '10002ba3', '10049f80', '4fd47018b98fedea8f93a9a6dd4bfa229e47d1907dead51d7a8fe2b7cc0e7aa7'],
      ['spyGetInstance', '10008b11', '1004b480', 'a84a8918b5ec4d8aae1a2256de9eb9c5ba93cc1c25e3ceea40c9b74232d5af21'],
      ['spyCreate', '100089e5', '1004b800', 'cdc312dbfd49131fc862e9157120f3737d3fa2a58c1f98b6a14798eefe21579d'],
      ['spieGetInstance', '10001334', '1004af90', '14ff0bab5aff875376d96e0721fb426399c1beb471520b74bd7569e14de69cf1'],
      ['spieCreate', '10008887', '1004b1b0', '4cad27aa8534302f1cdbf084690ab187c086e8b79f91f03f60240026d132c31d'],
      ['spyMessageCallback', '10008c06', '1004b4d0', 'bf793a2070bbadd380eaf64eaabf03dd332ced20540f85cad5637129980c4814'],
      ['spieMessageCallback', '10005722', '1004afe0', 'b4da50db1a7a9baeb832644ebf5cb46612d598c4c9e6bca1d342aa88682caef5'],
    ]) {
      const receipt = source.methods[label!];
      if (!receipt || receipt.entry !== entry || receipt.body !== body || receipt.bodyInstructionBytesSha256 !== sha256) {
        throw new Error('Original MessageAdmin method receipt differs: ' + label);
      }
    }
    for (const [address, sha256] of [
      ['100e27d0', '88ed5fb087bd170601c466677e5f3b263f917362c6180cbc939484fa7a7a1f30'],
      ['100e2890', 'b2ec8f56a01805cbb91147aa3eb3e1468a196560411aab5a13102fadb1101db3'],
      ['100e2830', 'e8014bf6d6c47b6520a73381055d04c36030f02b591fa543f189e34ae0b52d5f'],
    ]) {
      const receipt = source.shutdown[address!];
      if (!receipt || receipt.address !== address || receipt.sha256 !== sha256 || !receipt.raw.endsWith('c3')) {
        throw new Error('Nonempty admin shutdown receipt differs');
      }
    }
  }

  getInstance(): NativeValue<NativeMessageAdminModule> {
    if (this.phase === 'blocked') return unknown(this.boundary!);
    if (this.guard.uint(0) & 1) return known(this);
    this.guard.writeUint(0, this.guard.uint(0) | 1); this.phase = 'constructing';
    this.trace.push('message.guard');
    const section = this.host.initializeCriticalSection('10197d70', this.storage);
    if (!section.known) return this.block('MessageAdmin.InitializeCriticalSection: ' + section.reason);
    this.section = section.value; this.storage.knownMask.fill(0, 4, 28);
    this.storage.writeUint(28, 1); this.setHolder(null);
    const created = this.create();
    if (!created.known) return this.block(created.reason);
    const spy = this.getSpy(); if (!spy.known) return this.block(spy.reason);
    const spie = this.getSpie(); if (!spie.known) return this.block(spie.reason);
    const registered = this.host.registerShutdown('100e27d0', this, () => this.shutdownMessage());
    if (!registered.known) return this.block('MessageAdmin._atexit: ' + registered.reason);
    // Source ignores the signed _atexit return; the owned service records any
    // successful entry before returning. No registration is fabricated here.
    this.trace.push('message.shutdown.register'); this.phase = 'ready'; return known(this);
  }
  private block(reason: string): { known: false; reason: string } {
    this.phase = 'blocked'; this.boundary = reason; return unknown(reason);
  }
  private setHolder(value: NativeMemoryAllocation | null): void {
    this.holder = value; pointer(this.storage.bytes, this.storage.knownMask, 0, value);
  }
  private create(): NativeValue<void> {
    if (this.holder) { const deleted = this.deleteArray(); if (!deleted.known) return deleted; }
    this.storage.writeUint(28, 1); this.setHolder(null);
    const allocated = this.host.memory.newObject(12, 0xe3);
    if (!allocated.known) return unknown('MessageAdmin.Create holder allocation: ' + allocated.reason);
    if (allocated.value) {
      for (const at of [0, 4, 8]) write(allocated.value.bytes, allocated.value.knownMask, at, 0);
    }
    this.setHolder(allocated.value);
    this.trace.push('message.holder.create');
    const error = this.host.getErrorAdminForMessageBootstrap();
    if (!error.known) return unknown('MessageAdmin.Create ErrorAdmin bootstrap: ' + error.reason);
    this.trace.push('message.error.bootstrap'); return known(undefined);
  }
  private count(): number { return this.holder ? word(this.holder.bytes, this.holder.knownMask, 4) : 0; }
  private capacity(): number { return this.holder ? word(this.holder.bytes, this.holder.knownMask, 8) : 0; }
  private record(index: number): NativeValue<NativeMessageCallbackRecord> {
    const binding = this.bindings.get(index);
    if (!this.backing || !binding || index < 0 || index >= this.count()) return unknown('Owned callback record is unavailable');
    const at = index * 12;
    if (word(this.backing.bytes, this.backing.knownMask, at) !== parseInt(binding.callback.address, 16)) {
      return unknown('Actual callback pointer differs from retained binding');
    }
    const priority = word(this.backing.bytes, this.backing.knownMask, at + 8);
    if (binding.userData === null && word(this.backing.bytes, this.backing.knownMask, at + 4) !== 0) {
      return unknown('Actual NULL callback userdata differs');
    }
    if (binding.userData !== null && this.backing.knownMask.subarray(at + 4, at + 8).some(value => value !== 0)) {
      return unknown('Callback userdata address encoding differs from retained capability');
    }
    return known(Object.freeze({ callback: binding.callback, userData: binding.userData, priority }));
  }
  registerCallback(callback: NativeMessageCallback, priority: number, userData: object | null): NativeValue<number> {
    if (this.phase === 'blocked') return unknown(this.boundary!);
    if (!/^[0-9a-f]{8}$/.test(callback.address) || !Number.isInteger(priority) || priority < 0 || priority > 0xffffffff) {
      return unknown('Exact native callback pointer and uint32 priority required');
    }
    if (!this.holder) return unknown('Source RegisterCallback dereferences a NULL callback holder');
    const count = this.count();
    for (let index = count - 1; index >= 0; index--) {
      const record = this.record(index); if (!record.known) return record;
      if (record.value.callback.address === callback.address) return known(0);
    }
    for (let index = 0; index < count; index++) {
      const record = this.record(index); if (!record.known) return record;
      if (record.value.priority === 0) {
        const warning = this.host.diagnostics.messageBox?.('100e7d70', 'bCMessageAdmin::RegisterCallback', 0x30);
        if (!warning) return unknown('Source callback-priority warning requires MessageBoxA');
        return warning.known ? known(0) : unknown('Source callback-priority warning: ' + warning.reason);
      }
    }
    const grown = this.grow(count + 1); if (!grown.known) return grown;
    write(this.holder.bytes, this.holder.knownMask, 4, count + 1);
    if (!this.backing) return unknown('Source callback append dereferences a NULL backing allocation');
    const at = count * 12;
    write(this.backing.bytes, this.backing.knownMask, at, parseInt(callback.address, 16));
    pointer(this.backing.bytes, this.backing.knownMask, at + 4, userData);
    write(this.backing.bytes, this.backing.knownMask, at + 8, priority);
    this.bindings.set(count, Object.freeze({ callback, userData, priority }));
    if (callback.address === '10002df6' && userData !== null) this.errorShutdownCallbacks.set(userData, callback);
    this.trace.push('callback.register.' + callback.address); return known(1);
  }
  private grow(required: number): NativeValue<void> {
    if (!this.holder) return unknown('Actual native callback holder required');
    const capacity = this.capacity(); if (capacity >= required) return known(undefined);
    const growth = Math.min(1024, Math.max(8, capacity >> 3));
    const nextCapacity = required + growth;
    const admin = this.host.memory.getInstance(); if (!admin.known) return admin;
    const allocated = this.host.memory.realloc(this.backing, nextCapacity * 12);
    if (!allocated.known) return unknown('MessageAdmin callback backing Realloc: ' + allocated.reason);
    this.backing = allocated.value;
    pointer(this.holder.bytes, this.holder.knownMask, 0, allocated.value);
    if (!allocated.value) return unknown('Source callback backing memset dereferences NULL Realloc result');
    const start = this.count() * 12, length = (nextCapacity - capacity) * 12;
    if (start + length > allocated.value.bytes.length) return unknown('Actual callback backing cannot cover source memset extent');
    allocated.value.bytes.fill(0, start, start + length); allocated.value.knownMask.fill(255, start, start + length);
    write(this.holder.bytes, this.holder.knownMask, 8, nextCapacity);
    this.trace.push('callback.grow.' + nextCapacity); return known(undefined);
  }
  unregisterCallback(callback: Pick<NativeMessageCallback, 'address'>): NativeValue<number> {
    if (this.phase === 'blocked') return unknown(this.boundary!);
    return this.eraseCallback(callback);
  }
  /** Scoped route for the actual registered ErrorAdmin destructor. It reads
   * Message.GetInstance's guard branch and erases the retained source record
   * even if a later Message startup dependency blocked. Public service calls
   * remain blocked. Callback/userdata identity must be the real registration. */
  unregisterForErrorShutdown(callback: NativeMessageCallback, owner: object): NativeValue<number> {
    if (callback.address !== '10002df6' || this.errorShutdownCallbacks.get(owner) !== callback || !(this.guard.uint(0) & 1)) {
      return unknown('Actual registered ErrorAdmin callback and owner required for shutdown');
    }
    for (let index = this.count() - 1; index >= 0; index--) {
      const record = this.record(index); if (!record.known) return record;
      if (record.value.callback.address === callback.address &&
          (record.value.callback !== callback || record.value.userData !== owner)) {
        return unknown('Retained ErrorAdmin shutdown callback owner differs');
      }
    }
    return this.eraseCallback(callback);
  }
  private eraseCallback(callback: Pick<NativeMessageCallback, 'address'>): NativeValue<number> {
    if (!this.holder) return known(0);
    for (let index = this.count() - 1; index >= 0; index--) {
      const record = this.record(index); if (!record.known) return record;
      if (record.value.callback.address !== callback.address) continue;
      const count = this.count();
      if (!this.backing) return unknown('Actual callback backing required for native erase');
      this.backing.bytes.copyWithin(index * 12, (index + 1) * 12, count * 12);
      this.backing.knownMask.copyWithin(index * 12, (index + 1) * 12, count * 12);
      for (let moved = index; moved < count - 1; moved++) {
        const binding = this.bindings.get(moved + 1); if (binding) this.bindings.set(moved, binding);
      }
      this.bindings.delete(count - 1);
      write(this.holder.bytes, this.holder.knownMask, 4, count - 1);
      this.trace.push('callback.unregister.' + callback.address); return known(1);
    }
    return known(0);
  }
  /** Direct inspection of the retained callback identity. This is not a port
   * of MessageAdmin.OnMessage's ordering/filter/priority dispatch routine. */
  invokeRegistered(address: string, args: Omit<NativeMessageCallbackArguments, 'userData' | 'priority'>): NativeValue<boolean> {
    if (this.phase === 'blocked') return unknown(this.boundary!);
    for (let index = this.count() - 1; index >= 0; index--) {
      const record = this.record(index); if (!record.known) return record;
      if (record.value.callback.address === address) return record.value.callback.invoke({ ...args,
        userData: record.value.userData, priority: record.value.priority });
    }
    return unknown('Callback is not registered on the actual MessageAdmin owner');
  }

  private getSpy(): NativeValue<NativeMessageAdminStorage> {
    if (this.spyPhase === 'blocked') return unknown(this.spyBoundary!);
    if (this.spyGuard.uint(0) & 1) return known(this.spy);
    this.spyGuard.writeUint(0, this.spyGuard.uint(0) | 1); this.spyPhase = 'constructing';
    const section = this.host.initializeCriticalSection('101ab11c', this.spy);
    if (!section.known) return this.blockSpy('Spy.InitializeCriticalSection: ' + section.reason);
    this.spySection = section.value; this.spy.knownMask.fill(0, 0, 24);
    this.spy.writeUint(28, 0); this.spy.writeUint(24, 0); this.spyMutex = null; this.spyWindow = null;
    const created = this.createSpy(); if (!created.known) return this.blockSpy(created.reason);
    const registered = this.host.registerShutdown('100e2890', this.spy, () => this.shutdownSpy());
    if (!registered.known) return this.blockSpy('Spy._atexit: ' + registered.reason);
    this.trace.push('spy.shutdown.register'); this.spyPhase = 'ready'; return known(this.spy);
  }
  private blockSpy(reason: string): { known: false; reason: string } {
    this.spyPhase = 'blocked'; this.spyBoundary = reason; return unknown(reason);
  }
  private createSpy(): NativeValue<void> {
    this.spy.writeUint(28, 0); this.spy.writeUint(24, 0); this.spyMutex = null; this.spyWindow = null;
    const message = this.getInstance(); if (!message.known) return message;
    const unregistered = this.unregisterCallback(this.spyCallback); if (!unregistered.known) return unregistered;
    this.spy.writeUint(28, 0); this.spy.writeUint(24, 0);
    const again = this.getInstance(); if (!again.known) return again;
    const registered = this.registerCallback(this.spyCallback, 1, this.spy); if (!registered.known) return registered;
    const window = this.host.diagnostics.findWindow(null, '[zSpy]');
    if (!window.known) return unknown('Spy.FindWindowA: ' + window.reason);
    this.spyWindow = window.value; pointer(this.spy.bytes, this.spy.knownMask, 24, window.value);
    this.trace.push('spy.findWindow');
    if (!window.value) return known(undefined);
    const messageId = this.host.diagnostics.registerWindowMessage?.('WM_LOGCOMMAND');
    if (!messageId) return unknown('Spy.RegisterWindowMessageA is unowned'); if (!messageId.known) return messageId;
    const start = this.broadcastAtom('START', messageId.value); if (!start.known) return start;
    const mutex = this.host.diagnostics.createMutex?.(); if (!mutex) return unknown('Spy.CreateMutexA is unowned'); if (!mutex.known) return mutex;
    this.spyMutex = mutex.value; pointer(this.spy.bytes, this.spy.knownMask, 28, mutex.value);
    return this.broadcastAtom('SHOW', messageId.value);
  }
  private broadcastAtom(name: 'START' | 'SHOW', message: number): NativeValue<void> {
    const atom = this.host.diagnostics.addAtom?.(name); if (!atom) return unknown('Spy.GlobalAddAtomA is unowned'); if (!atom.known) return atom;
    const broadcast = this.host.diagnostics.broadcast?.(message, 0, atom.value);
    if (!broadcast) return unknown('Spy.SendMessageA broadcast is unowned'); if (!broadcast.known) return broadcast;
    // Each nonzero result executes another actual platform deletion. Never
    // replace the source loop with an assumed success or a bounded no-op.
    for (;;) {
      const deleted = this.host.diagnostics.deleteAtom?.(atom.value);
      if (!deleted) return unknown('Spy.GlobalDeleteAtom is unowned'); if (!deleted.known) return deleted;
      if (deleted.value === 0) return known(undefined);
    }
  }
  private getSpie(): NativeValue<NativeMessageAdminStorage> {
    if (this.spiePhase === 'blocked') return unknown(this.spieBoundary!);
    if (this.spieGuard.uint(0) & 1) return known(this.spie);
    this.spieGuard.writeUint(0, this.spieGuard.uint(0) | 1); this.spiePhase = 'constructing';
    const section = this.host.initializeCriticalSection('10197dc0', this.spie);
    if (!section.known) return this.blockSpie('Spie.InitializeCriticalSection: ' + section.reason);
    this.spieSection = section.value; this.spie.knownMask.fill(0, 0, 24); this.spie.writeUint(24, 0xffffffff);
    const created = this.createSpie(); if (!created.known) return this.blockSpie(created.reason);
    const registered = this.host.registerShutdown('100e2830', this.spie, () => this.shutdownSpie());
    if (!registered.known) return this.blockSpie('Spie._atexit: ' + registered.reason);
    this.trace.push('spie.shutdown.register'); this.spiePhase = 'ready'; return known(this.spie);
  }
  private blockSpie(reason: string): { known: false; reason: string } {
    this.spiePhase = 'blocked'; this.spieBoundary = reason; return unknown(reason);
  }
  private createSpie(): NativeValue<void> {
    if (this.spie.uint(24) !== 0xffffffff) { const sent = this.send(1); if (!sent.known) return sent; }
    const message = this.getInstance(); if (!message.known) return message;
    const unregistered = this.unregisterCallback(this.spieCallback); if (!unregistered.known) return unregistered;
    this.spie.writeUint(24, 0xffffffff);
    const file = this.host.diagnostics.fopen('zSpie.txt', 'r'); if (!file.known) return unknown('Spie.fopen: ' + file.reason);
    this.trace.push('spie.fopen'); if (!file.value) return known(undefined);
    const closed = this.host.diagnostics.fclose?.(file.value); if (!closed) return unknown('Spie.fclose is unowned'); if (!closed.known) return closed;
    this.spieEnabled.bytes[0] = 1; this.spieEnabled.knownMask[0] = 255;
    const again = this.getInstance(); if (!again.known) return again;
    const registered = this.registerCallback(this.spieCallback, 1, this.spie); if (!registered.known) return registered;
    const startup = this.host.diagnostics.wsaStartup?.(0x101); if (!startup) return unknown('Spie.WSAStartup is unowned'); if (!startup.known) return startup;
    const socket = this.host.diagnostics.socket?.(2, 2, 0); if (!socket) return unknown('Spie.socket is unowned'); if (!socket.known) return socket;
    this.spie.writeUint(24, socket.value);
    if (socket.value !== 0xffffffff) {
      const connected = this.host.diagnostics.connectLoopback?.(socket.value, '127.0.0.1', 4711);
      if (!connected) return unknown('Spie.inet_addr/htons/connect platform chain is unowned'); if (!connected.known) return connected;
    }
    return this.send(0); // source still sends when socket returned INVALID_SOCKET.
  }
  private send(byte: 0 | 1): NativeValue<void> {
    const sent = this.host.diagnostics.send?.(this.spie.uint(24), byte, 0);
    if (!sent) return unknown('Spie.send is unowned'); return sent.known ? known(undefined) : sent;
  }
  private invokeSpy(args: NativeMessageCallbackArguments): NativeValue<boolean> {
    const spy = this.getSpy(); if (!spy.known) return spy;
    if (args.userData !== this.spy || args.message === null || this.spyWindow === null || this.spyMutex === null) return known(false);
    return unknown('Spy callback active bCString/line formatting, mutex and WM_COPYDATA path is unported');
  }
  private invokeSpie(args: NativeMessageCallbackArguments): NativeValue<boolean> {
    if (this.spieEnabled.knownMask[0] !== 255) return unknown('Spie enabled byte is unknown');
    if (this.spieEnabled.bytes[0] === 0) return known(true);
    const spie = this.getSpie(); if (!spie.known) return spie;
    if (args.message === null) return known(false);
    return unknown('Spie callback active bCString/packet formatting and socket send path is unported');
  }

  private deleteArray(): NativeValue<void> {
    if (!this.holder) return known(undefined);
    if (this.backing) {
      const admin = this.host.memory.getInstance(); if (!admin.known) return admin;
      const freed = this.host.memory.free(this.backing); if (!freed.known) return freed;
      this.backing = null; this.bindings.clear();
      for (const at of [0, 4, 8]) write(this.holder.bytes, this.holder.knownMask, at, 0);
    }
    const admin = this.host.memory.getInstance(); if (!admin.known) return admin;
    const deleted = this.host.memory.deleteObject(this.holder); if (!deleted.known) return deleted;
    this.setHolder(null); this.trace.push('message.array.delete'); return known(undefined);
  }
  /** Actual100e27d0: Delete array; pointer0/filter1; DeleteCriticalSection. */
  shutdownMessage(): NativeValue<void> {
    const deleted = this.deleteArray(); if (!deleted.known) return deleted;
    this.setHolder(null); this.storage.writeUint(28, 1);
    if (!this.section) return unknown('Message shutdown requires its initialized critical section');
    const section = this.host.deleteCriticalSection(this.section); if (!section.known) return section;
    this.section = null; this.trace.push('message.shutdown'); return known(undefined);
  }
  /** Actual100e2890 resets HWND/HANDLE, gets same Message singleton, unregisters
   * callback, then deletes Spy's section. Source has no CloseHandle here. */
  shutdownSpy(): NativeValue<void> {
    this.spyWindow = null; this.spyMutex = null; this.spy.writeUint(28, 0); this.spy.writeUint(24, 0);
    const message = this.messageForOwnedShutdown(); if (!message.known) return message;
    const unregistered = this.eraseCallback(this.spyCallback); if (!unregistered.known) return unregistered;
    if (!this.spySection) return unknown('Spy shutdown requires its initialized critical section');
    const section = this.host.deleteCriticalSection(this.spySection); if (!section.known) return section;
    this.spySection = null; this.trace.push('spy.shutdown'); return known(undefined);
  }
  /** Actual100e2830 sends final byte1 only for a valid socket, unregisters,
   * resets INVALID_SOCKET and deletes section; no closesocket/WSACleanup. */
  shutdownSpie(): NativeValue<void> {
    if (this.spie.uint(24) !== 0xffffffff) { const sent = this.send(1); if (!sent.known) return sent; }
    const message = this.messageForOwnedShutdown(); if (!message.known) return message;
    const unregistered = this.eraseCallback(this.spieCallback); if (!unregistered.known) return unregistered;
    this.spie.writeUint(24, 0xffffffff);
    if (!this.spieSection) return unknown('Spie shutdown requires its initialized critical section');
    const section = this.host.deleteCriticalSection(this.spieSection); if (!section.known) return section;
    this.spieSection = null; this.trace.push('spie.shutdown'); return known(undefined);
  }
  private messageForOwnedShutdown(): NativeValue<NativeMessageAdminModule> {
    // These actual registered source callbacks execute GetInstance's already
    // set guard branch and may unregister from a partly constructed array.
    // This narrow pointer alias does not expose a completed service to later
    // public/NPC callers after the unresolved startup prerequisite.
    return this.guard.uint(0) & 1 ? known(this) : this.getInstance();
  }
  snapshot() {
    const callbacks: NativeMessageCallbackRecord[] = [];
    for (let index = 0; index < this.count(); index++) { const value = this.record(index); if (value.known) callbacks.push(value.value); }
    return Object.freeze({ phase: this.phase, boundary: this.boundary, spyPhase: this.spyPhase,
      spiePhase: this.spiePhase, spyBoundary: this.spyBoundary, spieBoundary: this.spieBoundary,
      holder: this.holder, backing: this.backing, count: this.count(), capacity: this.capacity(),
      callbacks: Object.freeze(callbacks), trace: Object.freeze(this.trace.slice()) });
  }
}
