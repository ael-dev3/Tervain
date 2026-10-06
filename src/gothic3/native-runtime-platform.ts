/** Selected single-executor platform for source-owned runtime admins. It owns
 * byte storage, region ordering, CS capabilities and callback lifetimes. It
 * does not report observations of the host's Windows allocator, zSpy or files. */
import rulesText from '../../assets/gothic3/runtime-admin/runtime-rules.json?raw';
import sceneRulesText from '../../assets/gothic3/scene-startup/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeMemoryAdmin } from './native-memory-admin';
import type { NativeMemoryBacking, NativeMemoryPlatform, NativeMemoryRegion } from './native-memory-admin';
import { NativeMessageAdminModule } from './native-message-admin';
import type { NativeMessageDiagnosticPlatform } from './native-message-admin';
import { NativeErrorAdminModule } from './native-error-admin';
import { NativeHeapObjectViews } from './native-heap-views';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
interface Section {
  readonly address: string; readonly owner: object; readonly identity: object;
  readonly spinCount: number | null; depth: number; deleted: boolean;
}
interface ShutdownEntry {
  readonly address: string; readonly owner: object; readonly execute: () => NativeValue<void>;
}
interface BackingEntry {
  readonly backing: NativeMemoryBacking; readonly kind: 'virtual' | 'crt-new' | 'crt-malloc' | 'win32-heap'; readonly ordinal: number;
}
/** A retained platform handle, with no invented numerical x86 address. */
export interface NativeWin32HeapCapability { readonly identity: object; readonly owner: object; }
export interface NativeWin32ModuleCapability { readonly identity: object; readonly owner: object; readonly name: 'KERNEL32.DLL'; }
export interface NativeCrtPointerProcedure {
  readonly identity: object; readonly owner: object; readonly name: 'EncodePointer' | 'DecodePointer';
  invoke(value: object | null): NativeValue<object | null>;
}
export interface NativeCrtSectionProcedure {
  readonly identity: object; readonly owner: object; readonly name: 'InitializeCriticalSectionAndSpinCount';
  invoke(fields: NativeHeapObjectViews, owner: object, spinCount: 4000): NativeValue<boolean>;
}
export class NativeWin32PlatformException extends Error {
  constructor(readonly code: number) { super('Owned Win32 exception0x' + code.toString(16)); }
}
/** Explicit selected registry, never a claim about the host Windows process.
 * An absent pointer export takes the original wrapper's identity branch. */
export interface NativeEngineCrtPlatformServices {
  readonly tlsValues: ReadonlyMap<number, object>;
  readonly kernel32Available: boolean;
  readonly pointerCodec: 'absent' | 'owned-bijection';
  readonly sectionSpinProcedure?: boolean;
}
interface WinHeap {
  readonly capability: NativeWin32HeapCapability;
  readonly options: 0 | 1;
  readonly allocations: Set<NativeMemoryBacking>;
  destroyed: boolean;
}
interface PhysicalSection {
  readonly fields: NativeHeapObjectViews; readonly owner: object; readonly identity: object;
  readonly canonicalBacking: NativeMemoryBacking; readonly position: number;
  readonly bytes: Uint8Array; readonly masks: Uint8Array;
  readonly spinCount: 4000 | null; depth: number; deleted: boolean;
}
function physicalPosition(fields: NativeHeapObjectViews) {
  const backing = fields.backing;
  const canonicalBacking = 'region' in backing ? backing.region : backing;
  const begin = fields.bytes.byteOffset - backing.bytes.byteOffset;
  const position = ('region' in backing ? backing.offset : 0) + begin;
  if (backing.freed || canonicalBacking.freed || fields.bytes.length !== 24 || begin < 0 ||
      begin + 24 > backing.bytes.length || fields.bytes.buffer !== canonicalBacking.bytes.buffer ||
      fields.bytes.byteOffset !== canonicalBacking.bytes.byteOffset + position ||
      fields.knownMask.buffer !== canonicalBacking.knownMask.buffer ||
      fields.knownMask.byteOffset !== canonicalBacking.knownMask.byteOffset + position ||
      fields.knownMask.length !== 24 || position < 0 || position % 4 !== 0 || position + 24 > canonicalBacking.bytes.length) {
    throw new Error('Actual canonical live 24-byte physical critical-section storage required');
  }
  return { canonicalBacking, position };
}
const source = JSON.parse(rulesText) as { schema: string; inputs: { SharedBase: string };
  shutdown: Record<string, { address: string; raw: string; sha256: string }> };
const sceneSource = JSON.parse(sceneRulesText) as { schema: string; inputs: { Engine: string; SharedBase: string };
  methods: Record<string, { module: string; entry: string; body: string; bodyInstructionBytesSha256: string }> };

/** Scoped diagnostic services. Empty owned registries are a selected platform
 * profile, not an inferred absence of native host windows or disk files. */
export class NativeRuntimeDiagnostics implements NativeMessageDiagnosticPlatform {
  private readonly windows = new Map<string, object>();
  private readonly files = new Map<string, Uint8Array>();
  private readonly handles = new Map<object, { path: string; bytes: Uint8Array; closed: boolean }>();
  constructor(options: { windows?: ReadonlyMap<string, object>; files?: ReadonlyMap<string, Uint8Array> } = {}) {
    for (const [title, window] of options.windows ?? []) this.windows.set(title, window);
    for (const [path, bytes] of options.files ?? []) this.files.set(path, bytes.slice());
  }
  findWindow(className: null, title: '[zSpy]'): NativeValue<object | null> {
    if (className !== null || title !== '[zSpy]') return unknown('Selected diagnostic window query differs');
    return known(this.windows.get(title) ?? null);
  }
  fopen(path: 'zSpie.txt', mode: 'r'): NativeValue<object | null> {
    if (path !== 'zSpie.txt' || mode !== 'r') return unknown('Selected diagnostic file query differs');
    const bytes = this.files.get(path); if (!bytes) return known(null);
    const handle = Object.freeze({}); this.handles.set(handle, { path, bytes, closed: false }); return known(handle);
  }
  fclose(handle: object): NativeValue<number> {
    const file = this.handles.get(handle);
    if (!file || file.closed) return unknown('Actual live diagnostic file handle required');
    file.closed = true; return known(0);
  }
  snapshot() { return Object.freeze({ windows: Object.freeze([...this.windows.keys()]), files: Object.freeze([...this.files.keys()]),
    handles: Object.freeze([...this.handles.values()].map(file => Object.freeze({ path: file.path, closed: file.closed }))) }); }
}

export class NativeRuntimePlatform implements NativeMemoryPlatform {
  readonly diagnostics: NativeRuntimeDiagnostics;
  private readonly backing = new Map<object, BackingEntry>();
  private readonly sections = new Map<string, Section>();
  private readonly sectionIdentities = new Map<object, Section>();
  private readonly physicalSections = new Map<object, Map<number, PhysicalSection>>();
  private readonly winHeaps = new Map<object, WinHeap>();
  private readonly crtServices: NativeEngineCrtPlatformServices | undefined;
  private readonly crtTlsValues = new Map<number, object>();
  private readonly kernel32: NativeWin32ModuleCapability;
  private readonly pointerEncode: NativeCrtPointerProcedure;
  private readonly pointerDecode: NativeCrtPointerProcedure;
  private readonly sectionProcedure: NativeCrtSectionProcedure;
  private readonly encodedPointers = new Map<object | null, object>();
  private readonly decodedPointers = new Map<object, object | null>();
  private readonly win32LastError = new NativeHeapObjectViews({ identity: Object.freeze({}), bytes: new Uint8Array(4),
    knownMask: new Uint8Array(4), freed: false });
  private readonly pending: ShutdownEntry[] = [];
  private readonly executed: ShutdownEntry[] = [];
  private shutdownPhase: 'active' | 'draining' | 'blocked' | 'disposed' = 'active';
  private boundary: string | null = null;
  private bytesOwned = 0;
  private nextOrdinal = 0;
  constructor(options: { diagnostics?: NativeRuntimeDiagnostics; maximumAllocationBytes?: number; maximumOwnedBytes?: number;
    engineCrtServices?: NativeEngineCrtPlatformServices } = {}) {
    this.diagnostics = options.diagnostics ?? new NativeRuntimeDiagnostics();
    this.maximumAllocationBytes = options.maximumAllocationBytes ?? 64 * 1024 * 1024;
    this.maximumOwnedBytes = options.maximumOwnedBytes ?? 256 * 1024 * 1024;
    this.crtServices = options.engineCrtServices;
    for (const [index, value] of options.engineCrtServices?.tlsValues ?? []) this.crtTlsValues.set(index, value);
    const owner = Object.freeze({});
    this.kernel32 = Object.freeze({ identity: Object.freeze({}), owner, name: 'KERNEL32.DLL' });
    this.pointerEncode = Object.freeze({ identity: Object.freeze({}), owner, name: 'EncodePointer',
      invoke: (value: object | null): NativeValue<object | null> => {
        if (this.crtServices?.pointerCodec !== 'owned-bijection') return unknown('Actual owned pointer-encoding procedure required');
        let encoded = this.encodedPointers.get(value);
        if (!encoded) { encoded = Object.freeze({}); this.encodedPointers.set(value, encoded); this.decodedPointers.set(encoded, value); }
        return known(encoded);
      } });
    this.pointerDecode = Object.freeze({ identity: Object.freeze({}), owner, name: 'DecodePointer',
      invoke: (value: object | null): NativeValue<object | null> => {
        if (this.crtServices?.pointerCodec !== 'owned-bijection' || value === null || !this.decodedPointers.has(value)) {
          return unknown('Actual previously encoded owned pointer capability required; cold numerical zero is not encoded NULL');
        }
        return known(this.decodedPointers.get(value)!);
      } });
    this.sectionProcedure = Object.freeze({ identity: Object.freeze({}), owner, name: 'InitializeCriticalSectionAndSpinCount',
      invoke: (fields: NativeHeapObjectViews, sectionOwner: object, spinCount: 4000) => this.initializePhysicalCriticalSection(fields, sectionOwner, spinCount) });
    for (const limit of [this.maximumAllocationBytes, this.maximumOwnedBytes]) {
      if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('Selected platform allocation bounds must be positive integers');
    }
    if (source.schema !== 'gothic3-runtime-admin-rules-v1' ||
        source.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') {
      throw new Error('Selected runtime platform source receipt differs');
    }
  }
  private readonly maximumAllocationBytes: number;
  private readonly maximumOwnedBytes: number;
  private allocate(bytes: number, kind: BackingEntry['kind']): NativeValue<NativeMemoryBacking | null> {
    if (this.shutdownPhase === 'disposed' || this.shutdownPhase === 'blocked') return unknown('Selected runtime platform is not active');
    if (!Number.isInteger(bytes) || bytes < 0 || bytes > 0xffffffff) return unknown('Original platform uint32 allocation size required');
    if (bytes > this.maximumAllocationBytes || bytes + this.bytesOwned > this.maximumOwnedBytes) {
      return unknown('Allocation exceeds the selected successful bounded platform profile');
    }
    try {
      const backing: NativeMemoryBacking = { identity: Object.freeze({}), bytes: new Uint8Array(bytes),
        knownMask: new Uint8Array(bytes).fill(kind === 'virtual' ? 255 : 0), freed: false };
      this.backing.set(backing.identity, { backing, kind, ordinal: ++this.nextOrdinal }); this.bytesOwned += bytes;
      return known(backing);
    } catch (error) { return unknown('Selected platform allocation: ' + (error instanceof Error ? error.message : String(error))); }
  }
  virtualAlloc(bytes: number, type: 0x103000, protect: 4): NativeValue<NativeMemoryRegion | null> {
    if (type !== 0x103000 || protect !== 4) return unknown('Original VirtualAlloc flags differ from admitted pool profile');
    return this.allocate(bytes, 'virtual');
  }
  crtNew(bytes: number): NativeValue<NativeMemoryBacking | null> { return this.allocate(bytes, 'crt-new'); }
  crtMalloc(bytes: number): NativeValue<NativeMemoryBacking | null> { return this.allocate(bytes, 'crt-malloc'); }
  crtFree(backing: NativeMemoryBacking): NativeValue<void> {
    const entry = this.backing.get(backing.identity);
    if (!entry || entry.backing !== backing || backing.freed || entry.kind === 'virtual' || entry.kind === 'win32-heap') {
      return unknown('Actual live selected CRT backing required for free');
    }
    backing.freed = true; this.bytesOwned -= backing.bytes.length; return known(undefined);
  }
  createWin32Heap(owner: object, options: 0 | 1, initialBytes: 4096, maximumBytes: 0): NativeValue<NativeWin32HeapCapability | null> {
    if (this.shutdownPhase !== 'active' || !owner || typeof owner !== 'object' ||
        (options !== 0 && options !== 1) || initialBytes !== 4096 || maximumBytes !== 0) {
      return unknown('Actual active selected HeapCreate owner and original options required');
    }
    const capability = Object.freeze({ identity: Object.freeze({}), owner });
    this.winHeaps.set(capability.identity, { capability, options, allocations: new Set(), destroyed: false });
    return known(capability);
  }
  win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0, bytes: number): NativeValue<NativeMemoryBacking | null> {
    const retained = this.winHeaps.get(heap.identity);
    if (!retained || retained.capability !== heap || retained.destroyed || flags !== 0) {
      return unknown('Actual live selected HeapAlloc handle and flags required');
    }
    const allocated = this.allocate(bytes, 'win32-heap');
    if (allocated.known && allocated.value) retained.allocations.add(allocated.value);
    return allocated;
  }
  win32HeapFree(heap: NativeWin32HeapCapability, flags: 0, backing: NativeMemoryBacking): NativeValue<boolean> {
    const retained = this.winHeaps.get(heap.identity), entry = this.backing.get(backing.identity);
    if (!retained || retained.capability !== heap || retained.destroyed || flags !== 0 ||
        !retained.allocations.has(backing) || !entry || entry.backing !== backing || backing.freed) {
      return unknown('Actual live selected HeapFree handle and retained allocation required');
    }
    backing.freed = true; this.bytesOwned -= backing.bytes.length; return known(true);
  }
  win32HeapDestroy(heap: NativeWin32HeapCapability): NativeValue<boolean> {
    const retained = this.winHeaps.get(heap.identity);
    if (!retained || retained.capability !== heap || retained.destroyed) return unknown('Actual live selected HeapDestroy handle required');
    for (const backing of retained.allocations) if (!backing.freed) { backing.freed = true; this.bytesOwned -= backing.bytes.length; }
    retained.destroyed = true; return known(true);
  }
  tlsGetValue(index: number): NativeValue<object | null> {
    if (!this.crtServices || !Number.isInteger(index) || index < 0 || index > 0xffffffff) return unknown('Actual owned CRT TLS registry and uint32 index required');
    return known(this.crtTlsValues.get(index) ?? null);
  }
  setWin32LastError(error: number): NativeValue<void> {
    if (!this.crtServices || !Number.isInteger(error) || error < 0 || error > 0xffffffff) return unknown('Actual owned Win32 last-error slot and uint32 error required');
    this.win32LastError.writeUnsigned(0, error); return known(undefined);
  }
  getWin32LastError(): NativeValue<number> {
    if (!this.crtServices) return unknown('Actual owned Win32 last-error slot required');
    try { return known(this.win32LastError.readUnsigned(0)); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  getWin32ModuleHandle(name: 'KERNEL32.DLL' | 'kernel32.dll'): NativeValue<NativeWin32ModuleCapability | null> {
    if (!this.crtServices || (name !== 'KERNEL32.DLL' && name !== 'kernel32.dll')) return unknown('Actual owned CRT Win32 module registry required');
    return known(this.crtServices.kernel32Available ? this.kernel32 : null);
  }
  getWin32Procedure(module: NativeWin32ModuleCapability, name: 'EncodePointer' | 'DecodePointer'): NativeValue<NativeCrtPointerProcedure | null>;
  getWin32Procedure(module: NativeWin32ModuleCapability, name: 'InitializeCriticalSectionAndSpinCount'): NativeValue<NativeCrtSectionProcedure | null>;
  getWin32Procedure(module: NativeWin32ModuleCapability, name: string): NativeValue<NativeCrtPointerProcedure | NativeCrtSectionProcedure | null> {
    if (!this.crtServices || module !== this.kernel32 || !this.crtServices.kernel32Available) return unknown('Actual owned CRT Win32 module capability required');
    if (name === 'EncodePointer') return known(this.crtServices.pointerCodec === 'owned-bijection' ? this.pointerEncode : null);
    if (name === 'DecodePointer') return known(this.crtServices.pointerCodec === 'owned-bijection' ? this.pointerDecode : null);
    if (name === 'InitializeCriticalSectionAndSpinCount') return known(this.crtServices.sectionSpinProcedure === false ? null : this.sectionProcedure);
    return unknown('Admitted selected CRT Win32 procedure name required');
  }
  /** Lower Win32 endpoint. The CRT owner performs its source resolver/cache. */
  initializePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object, spinCount: 4000): NativeValue<boolean> {
    if (spinCount !== 4000) return unknown('Original physical section spin count4000 required');
    return this.initializePhysicalSection(fields, owner, spinCount);
  }
  initializePhysicalCriticalSectionWithoutSpin(fields: NativeHeapObjectViews, owner: object): NativeValue<void> {
    const result = this.initializePhysicalSection(fields, owner, null);
    return result.known ? known(undefined) : result;
  }
  private initializePhysicalSection(fields: NativeHeapObjectViews, owner: object, spinCount: 4000 | null): NativeValue<boolean> {
    try {
      if (this.shutdownPhase !== 'active' || !owner || typeof owner !== 'object') {
        return unknown('Actual active physical section owner required');
      }
      const { canonicalBacking, position } = physicalPosition(fields);
      if ([...this.physicalSections.values()].some(entries => [...entries.values()].some(section =>
        section.bytes.buffer === fields.bytes.buffer && fields.bytes.byteOffset < section.bytes.byteOffset + 24 &&
        fields.bytes.byteOffset + 24 > section.bytes.byteOffset))) {
        return unknown('Physical section byte range already belongs to its canonical registration');
      }
      let positions = this.physicalSections.get(canonicalBacking.identity);
      if (!positions) { positions = new Map(); this.physicalSections.set(canonicalBacking.identity, positions); }
      if ([...positions.values()].some(section => position < section.position + 24 && position + 24 > section.position)) {
        return unknown('Fresh nonoverlapping canonical physical critical-section storage required');
      }
      positions.set(position, { fields, owner, identity: Object.freeze({}), canonicalBacking, position,
        bytes: fields.bytes, masks: fields.knownMask, spinCount, depth: 0, deleted: false });
      // The lower procedure owns initialization, but its opaque Win32 stores
      // do not prove the original cold zero bytes survived the call.
      fields.knownMask.fill(0);
      return known(true);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  private physicalSection(fields: NativeHeapObjectViews, owner: object): PhysicalSection {
    const { canonicalBacking, position } = physicalPosition(fields);
    const section = this.physicalSections.get(canonicalBacking.identity)?.get(position);
    if (!section || section.owner !== owner || section.canonicalBacking !== canonicalBacking || section.deleted ||
        section.bytes.buffer !== fields.bytes.buffer || section.bytes.byteOffset !== fields.bytes.byteOffset ||
        section.masks.buffer !== fields.knownMask.buffer || section.masks.byteOffset !== fields.knownMask.byteOffset) {
      throw new Error('Actual live canonical initialized physical critical-section owner required');
    }
    return section;
  }
  enterPhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object): NativeValue<void> {
    try { this.physicalSection(fields, owner).depth++; return known(undefined); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  leavePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object): NativeValue<void> {
    try { const section = this.physicalSection(fields, owner); if (!section.depth) throw new Error('Actual entered physical critical section required');
      section.depth--; return known(undefined); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  deletePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object): NativeValue<void> {
    try { const section = this.physicalSection(fields, owner); if (section.depth) throw new Error('Actual idle physical critical section required');
      section.deleted = true; return known(undefined); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  /** Actual order of retained regions in this selected platform. No numerical
   * x86 pointer is assigned to a browser capability. */
  compareRegions(a: NativeMemoryRegion, b: NativeMemoryRegion): NativeValue<number> {
    const left = this.backing.get(a.identity), right = this.backing.get(b.identity);
    if (!left || !right || left.backing !== a || right.backing !== b || left.kind !== 'virtual' || right.kind !== 'virtual' || a.freed || b.freed) {
      return unknown('Actual live selected virtual regions required for ordering');
    }
    return known(left.ordinal === right.ordinal ? 0 : left.ordinal < right.ordinal ? -1 : 1);
  }
  initializeCriticalSection(address: '10189a18', owner: object, spinCount: 1000): NativeValue<number>;
  initializeCriticalSection(address: string, owner: object): NativeValue<object>;
  initializeCriticalSection(address: string, owner: object, spinCount?: 1000): NativeValue<number | object> {
    if (this.shutdownPhase === 'disposed' || this.shutdownPhase === 'blocked') return unknown('Selected CS platform is not active');
    if (!/^[0-9a-f]{8}$/.test(address) || this.sections.has(address) || (spinCount !== undefined && (address !== '10189a18' || spinCount !== 1000))) {
      return unknown('Actual fresh source critical-section registration required');
    }
    const section: Section = { address, owner, identity: Object.freeze({}), spinCount: spinCount ?? null, depth: 0, deleted: false };
    this.sections.set(address, section); this.sectionIdentities.set(section.identity, section);
    return spinCount === undefined ? known(section.identity) : known(1);
  }
  enterCriticalSection(address: '10189a18', owner: object): NativeValue<void> {
    const section = this.sections.get(address);
    if (!section || section.owner !== owner || section.deleted) return unknown('Actual live selected critical-section owner required');
    section.depth++; return known(undefined);
  }
  leaveCriticalSection(address: '10189a18', owner: object): NativeValue<void> {
    const section = this.sections.get(address);
    if (!section || section.owner !== owner || section.deleted || section.depth === 0) return unknown('Actual entered selected critical-section owner required');
    section.depth--; return known(undefined);
  }
  deleteCriticalSection(identity: object): NativeValue<void> {
    const section = this.sectionIdentities.get(identity);
    if (!section || section.deleted || section.depth !== 0) return unknown('Actual idle live selected critical-section capability required');
    section.deleted = true; return known(undefined);
  }
  registerShutdown(address: string, owner: object, execute: () => NativeValue<void>): NativeValue<number> {
    const admitted = source.shutdown[address];
    const method = sceneSource.methods.sceneClassNameDestructor;
    const admittedSceneName = address === '300184df' && sceneSource.schema === 'gothic3-scene-startup-rules-v1' &&
      sceneSource.inputs.Engine === 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' &&
      sceneSource.inputs.SharedBase === '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' &&
      method?.module === 'Engine' && method.entry === address && method.body === '30797c90' &&
      method.bodyInstructionBytesSha256 === 'b1a2e2bb4cbdd84ecc08a969c18b636ac5e27f20ba3f1a6cf054d183329b51bc';
    const admittedShared = admitted?.address === address && /^(?:[0-9a-f]{2})+$/.test(admitted.raw) && /^[0-9a-f]{64}$/.test(admitted.sha256);
    if (this.shutdownPhase !== 'active' || (!admittedShared && !admittedSceneName) || typeof execute !== 'function') {
      return unknown('Actual admitted active runtime shutdown registration required');
    }
    this.pending.push(Object.freeze({ address, owner, execute })); return known(0);
  }
  /** Non-NULL CString behavior is owned by the source MemoryAdmin adapter;
   * this platform has no second disconnected copy of its default string. */
  clearDefaultCString(_owner: object): NativeValue<void> {
    return unknown('Original MemoryAdmin default CString bytes must be consumed by its source owner');
  }
  dispose(): NativeValue<void> {
    if (this.shutdownPhase === 'disposed') return known(undefined);
    if (this.shutdownPhase === 'blocked') return unknown(this.boundary!);
    if (this.shutdownPhase === 'draining') return unknown('Selected runtime shutdown is already executing');
    this.shutdownPhase = 'draining';
    while (this.pending.length) {
      const entry = this.pending.pop()!;
      let result: NativeValue<void>;
      try { result = entry.execute(); } catch (error) { result = unknown(error instanceof Error ? error.message : String(error)); }
      this.executed.push(entry);
      if (!result.known) { this.shutdownPhase = 'blocked'; this.boundary = `Shutdown ${entry.address}: ${result.reason}`; return unknown(this.boundary); }
    }
    this.shutdownPhase = 'disposed'; return known(undefined);
  }
  snapshot() { return Object.freeze({ phase: this.shutdownPhase, boundary: this.boundary, bytesOwned: this.bytesOwned,
    allocations: Object.freeze([...this.backing.values()].map(entry => Object.freeze({ kind: entry.kind, ordinal: entry.ordinal, backing: entry.backing }))),
    sections: Object.freeze([...this.sections.values()].map(section => Object.freeze({ ...section }))),
    physicalSections: Object.freeze([...this.physicalSections.values()].flatMap(positions => [...positions.values()].map(section => Object.freeze({ ...section })))),
    winHeaps: Object.freeze([...this.winHeaps.values()].map(heap => Object.freeze({ capability: heap.capability, options: heap.options,
      destroyed: heap.destroyed, allocations: Object.freeze([...heap.allocations]) }))),
    win32LastError: this.win32LastError,
    pending: Object.freeze(this.pending.slice()), executed: Object.freeze(this.executed.slice()) }); }
}

/** Standalone cold admin owner. Connecting this to an NPC requires every
 * earlier source allocation on that NPC path to use this same MemoryAdmin;
 * logical factory allocation receipts alone do not satisfy that prerequisite. */
export function createNativeRuntimeAdminOwner(platform = new NativeRuntimePlatform()) {
  const memory = new NativeMemoryAdmin(platform);
  let error: NativeErrorAdminModule;
  const message = new NativeMessageAdminModule({ memory,
    initializeCriticalSection: (address, owner) => platform.initializeCriticalSection(address, owner),
    deleteCriticalSection: section => platform.deleteCriticalSection(section),
    registerShutdown: (address, owner, callback) => platform.registerShutdown(address, owner, callback),
    getErrorAdminForMessageBootstrap: () => error.getInstanceForMessageBootstrap(), diagnostics: platform.diagnostics });
  error = new NativeErrorAdminModule({ memory,
    crtNew: bytes => platform.crtNew(bytes), crtMalloc: bytes => platform.crtMalloc(bytes), crtFree: backing => platform.crtFree(backing),
    initializeCriticalSection: (address, owner) => platform.initializeCriticalSection(address, owner),
    deleteCriticalSection: section => platform.deleteCriticalSection(section),
    registerShutdown: (address, owner, callback) => platform.registerShutdown(address, owner, callback),
    messageAdmin: () => message.getInstance(),
    unregisterMessageCallbackForShutdown: (callback, owner) => message.unregisterForErrorShutdown(callback, owner) });
  return Object.freeze({ platform, memory, message, error, dispose: () => platform.dispose() });
}
