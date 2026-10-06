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
  readonly backing: NativeMemoryBacking; readonly kind: 'virtual' | 'crt-new' | 'crt-malloc'; readonly ordinal: number;
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
  private readonly pending: ShutdownEntry[] = [];
  private readonly executed: ShutdownEntry[] = [];
  private shutdownPhase: 'active' | 'draining' | 'blocked' | 'disposed' = 'active';
  private boundary: string | null = null;
  private bytesOwned = 0;
  private nextOrdinal = 0;
  constructor(options: { diagnostics?: NativeRuntimeDiagnostics; maximumAllocationBytes?: number; maximumOwnedBytes?: number } = {}) {
    this.diagnostics = options.diagnostics ?? new NativeRuntimeDiagnostics();
    this.maximumAllocationBytes = options.maximumAllocationBytes ?? 64 * 1024 * 1024;
    this.maximumOwnedBytes = options.maximumOwnedBytes ?? 256 * 1024 * 1024;
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
    if (!entry || entry.backing !== backing || backing.freed || entry.kind === 'virtual') {
      return unknown('Actual live selected CRT backing required for free');
    }
    backing.freed = true; this.bytesOwned -= backing.bytes.length; return known(undefined);
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
