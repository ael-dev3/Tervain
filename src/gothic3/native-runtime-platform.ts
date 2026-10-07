/** Selected single-executor platform for source-owned runtime admins. It owns
 * byte storage, region ordering, CS capabilities and callback lifetimes. It
 * does not report observations of the host's Windows allocator, zSpy or files. */
import rulesText from '../../assets/gothic3/runtime-admin/runtime-rules.json?raw';
import sceneRulesText from '../../assets/gothic3/scene-startup/runtime-rules.json?raw';
import navigationRulesText from '../../assets/gothic3/browser-navigation-owner/runtime-rules.json?raw';
import npcEntityManifestText from '../../assets/gothic3/npc-entity/manifest.json?raw';
import type { NativeValue } from './dialogue';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativeSceneStartupHeapExtension } from './native-memory-admin';
import type { NativeMemoryBacking, NativeMemoryPlatform, NativeMemoryRegion, NativeMemoryRulesExtension } from './native-memory-admin';
import { NativeMessageAdminModule } from './native-message-admin';
import type { NativeMessageDiagnosticPlatform } from './native-message-admin';
import { NativeErrorAdminModule } from './native-error-admin';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeByteGeometryHost, NativeBytePointer, NativePointerGeometry } from './native-pointer-geometry';
import { NativeGameCrtOwner } from './native-game-crt';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { nativeGameImageReceipt } from './native-game-crt-profile';
import { NativeSharedModuleImage } from './native-shared-module-image';
import { retainNativeWin32ProcessInputSelection } from './native-win32-process-inputs';
import type { NativeWin32ProcessInputSelection, RetainedWin32ProcessInputSelection, RetainedProcessInputOutcome,
  NativeWin32ProcessInputEndpoints, NativeWideCharToMultiByteArguments } from './native-win32-process-inputs';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype) as object;
/** The new access authority admits physical views, not matching properties or
 * shadowed helper functions. Intrinsic getters also reject proxy/fake brands. */
function requirePhysicalNativeViews(fields: NativeHeapObjectViews): void {
  if (Object.getPrototypeOf(fields) !== NativeHeapObjectViews.prototype ||
      ['backing', 'bytes', 'knownMask', 'view', 'pointerIdentity', 'pointerBegin'].some(key =>
        !Object.prototype.hasOwnProperty.call(Object.getOwnPropertyDescriptor(fields, key) ?? {}, 'value')) ||
      Object.getOwnPropertyNames(NativeHeapObjectViews.prototype).some(key => Object.prototype.hasOwnProperty.call(fields, key))) {
    throw new Error('Actual physical native view bindings and unchanged helper methods required');
  }
  for (const bytes of [fields.bytes, fields.knownMask]) {
    if (Object.getPrototypeOf(bytes) !== Uint8Array.prototype ||
        Object.getOwnPropertyNames(typedArrayPrototype).some(key => Object.prototype.hasOwnProperty.call(bytes, key))) {
      throw new Error('Actual native Uint8Array storage and unchanged byte methods required');
    }
    for (const key of ['buffer', 'byteOffset', 'byteLength', 'length']) {
      Object.getOwnPropertyDescriptor(typedArrayPrototype, key)!.get!.call(bytes);
    }
  }
  if (Object.getPrototypeOf(fields.view) !== DataView.prototype ||
      Object.getOwnPropertyNames(DataView.prototype).some(key => Object.prototype.hasOwnProperty.call(fields.view, key))) {
    throw new Error('Actual native DataView and unchanged physical byte methods required');
  }
  for (const key of ['buffer', 'byteOffset', 'byteLength']) {
    Object.getOwnPropertyDescriptor(DataView.prototype, key)!.get!.call(fields.view);
  }
}
// Constructor admission is the authority. Object.create or a structurally
// similar caller object cannot establish a canonical module image.
const retainedRuntimePlatforms = new WeakSet<NativeRuntimePlatform>();
const npcEntityManifest = JSON.parse(npcEntityManifestText) as { matrixDestructor?: {
  module: string; inputSha256: string; address: string; instructionBytesHex: string; instructionBytesSha256: string;
} };
const matrixDestructor = npcEntityManifest.matrixDestructor;
function admittedMatrixDestructor(address: string): boolean {
  return address === '100e2910' && matrixDestructor?.module === 'SharedBase' &&
    matrixDestructor.inputSha256 === '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' &&
    matrixDestructor.address === address && matrixDestructor.instructionBytesHex === 'c3' &&
    matrixDestructor.instructionBytesSha256 === 'ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e';
}
interface Section {
  readonly address: string; readonly owner: object; readonly identity: object;
  readonly spinCount: number | null; depth: number; deleted: boolean;
}
interface ShutdownEntry {
  readonly address: string; readonly owner: object; readonly execute: () => NativeValue<void>;
}
interface BackingEntry {
  readonly backing: NativeMemoryBacking; readonly kind: 'virtual' | 'crt-new' | 'crt-malloc' | 'win32-heap' | 'module-image' | 'win32-process-buffer'; readonly ordinal: number;
  nativeGeometry?: Readonly<{ alignment: 'virtual-page' | 'win32-heap-eight';
    bytes: Uint8Array; masks: Uint8Array; capacity: number } | { alignment: 'module-image';
    bytes: Uint8Array; masks: Uint8Array; capacity: number } | { alignment: 'process-buffer-four';
    bytes: Uint8Array; masks: Uint8Array; capacity: number }>;
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
export interface NativeCrtThreadDestructor { readonly address: '3067e143' | '20468043'; invoke(value: object | null): NativeValue<void>; }
export interface NativeCrtLocalAllocProcedure { readonly kind: 'alloc'; readonly name: 'FlsAlloc' | 'TlsAlloc' | 'TlsAllocFallback3067df49' | 'TlsAllocFallback20467e49'; invoke(callback: NativeCrtThreadDestructor): NativeValue<number>; }
export interface NativeCrtLocalGetProcedure { readonly kind: 'get'; readonly name: 'FlsGetValue' | 'TlsGetValue'; invoke(index: number): NativeValue<object | null>; }
export interface NativeCrtLocalSetProcedure { readonly kind: 'set'; readonly name: 'FlsSetValue' | 'TlsSetValue'; invoke(index: number, value: object | null): NativeValue<boolean>; }
export interface NativeCrtLocalFreeProcedure { readonly kind: 'free'; readonly name: 'FlsFree' | 'TlsFree'; invoke(index: number): NativeValue<boolean>; }
export type NativeCrtLocalProcedure = NativeCrtLocalAllocProcedure | NativeCrtLocalGetProcedure | NativeCrtLocalSetProcedure | NativeCrtLocalFreeProcedure;
export type NativeCrtPlatformProcedure = NativeCrtPointerProcedure | NativeCrtSectionProcedure | NativeCrtLocalProcedure;
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
  readonly fiberLocalStorage?: boolean;
  readonly processHeap?: boolean;
  readonly osVersion?: { readonly platform: number; readonly major: number; readonly minor: number; readonly build: number } | null;
  readonly processInputs?: NativeWin32ProcessInputSelection;
  readonly entropy?: {
    systemTimeAsFileTime?(): NativeValue<{ low: number; high: number }>;
    currentProcessId?(): NativeValue<number>;
    currentThreadId?(): NativeValue<number>;
    tickCount?(): NativeValue<number>;
    performanceCounter?(): NativeValue<{ success: boolean; low?: number; high?: number }>;
  };
}
type RetainedCrtServices = Omit<NativeEngineCrtPlatformServices, 'tlsValues' | 'processInputs'> & {
  readonly processInputs?: RetainedWin32ProcessInputSelection;
};
/** Retain configuration values and exact function identities. TLS values are
 * opaque capabilities, so copy their entries without cloning those identities.
 * Neither freezing a caller Map nor retaining its nested version object owns
 * the selected platform's configuration. */
function retainCrtServices(selected: NativeEngineCrtPlatformServices | undefined): {
  services: RetainedCrtServices | undefined; tls: readonly (readonly [number, object])[];
} {
  if (selected === undefined) return { services: undefined, tls: [] };
  const { tlsValues, kernel32Available, pointerCodec, sectionSpinProcedure,
    fiberLocalStorage, processHeap, osVersion, entropy, processInputs } = selected;
  if (typeof kernel32Available !== 'boolean' || (pointerCodec !== 'absent' && pointerCodec !== 'owned-bijection') ||
      [sectionSpinProcedure, fiberLocalStorage, processHeap].some(value => value !== undefined && typeof value !== 'boolean')) {
    throw new Error('Explicit selected CRT registry configuration required');
  }
  const version = osVersion === undefined || osVersion === null ? osVersion : Object.freeze({
    platform: osVersion.platform, major: osVersion.major, minor: osVersion.minor, build: osVersion.build });
  if (version && Object.values(version).some(value => !Number.isInteger(value) || value < 0 || value > 0xffffffff)) {
    throw new Error('Selected CRT virtual version fields must be uint32 values');
  }
  const callbacks = entropy === undefined ? undefined : Object.freeze({
    systemTimeAsFileTime: entropy.systemTimeAsFileTime, currentProcessId: entropy.currentProcessId,
    currentThreadId: entropy.currentThreadId, tickCount: entropy.tickCount, performanceCounter: entropy.performanceCounter });
  if (callbacks && Object.values(callbacks).some(value => value !== undefined && typeof value !== 'function')) {
    throw new Error('Actual selected CRT endpoint function identities required');
  }
  const tls: (readonly [number, object])[] = [];
  for (const [index, value] of tlsValues) {
    if (!Number.isInteger(index) || index < 0 || index > 0xffffffff || value === null ||
        (typeof value !== 'object' && typeof value !== 'function')) throw new Error('Selected initial TLS indices and retained capabilities required');
    tls.push(Object.freeze([index, value] as const));
  }
  return { services: Object.freeze({ kernel32Available, pointerCodec, sectionSpinProcedure,
    fiberLocalStorage, processHeap, osVersion: version, entropy: callbacks,
    processInputs: processInputs === undefined ? undefined : retainNativeWin32ProcessInputSelection(processInputs) }), tls: Object.freeze(tls) };
}
interface ProcessBuffer {
  readonly kind: 'command-line-a' | 'environment-a' | 'environment-w';
  readonly backing: NativeMemoryBacking; readonly pointer: NativeBytePointer;
  readonly bytes: Uint8Array; readonly masks: Uint8Array; readonly view: DataView;
  phase: 'live' | 'released' | 'expired';
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
const navigationSource = JSON.parse(navigationRulesText) as {
  schema: string; inputs: { Game: string };
  navigationNameInitializers: { tableSha256: string; tableWholeExecuted: boolean;
    initializers: readonly { name: string; destructor: string; literalAddress: string; literalRaw: string }[] };
  methods: Record<string, { module: string; entry: string; body: string; bodyInstructionBytesSha256: string }>;
};
function admittedNavigationNameDestructor(address: string): boolean {
  if (navigationSource.schema !== 'gothic3-browser-navigation-owner-rules-v1' ||
      navigationSource.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
      navigationSource.navigationNameInitializers.tableSha256 !== 'b03bdc863cc852e3b14ef05e1082cb8616ce78c63efe3d35e5e80e9dcea40185' ||
      navigationSource.navigationNameInitializers.tableWholeExecuted !== false) return false;
  const initializer = navigationSource.navigationNameInitializers.initializers.find(row => row.destructor === address);
  if (!initializer) return false;
  const method = navigationSource.methods['navigationNameDestructor' + initializer.name];
  return method?.module === 'Game' && method.entry === address && method.body === address &&
    /^[0-9a-f]{64}$/.test(method.bodyInstructionBytesSha256);
}
function admittedModuleAdminShutdown(address: string): boolean {
  if (address !== '30797fc0' || sceneSource.schema !== 'gothic3-scene-startup-rules-v1' ||
      sceneSource.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
      sceneSource.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') return false;
  const selected = [
    ['moduleShutdown', '30797fc0', '30797fc0', '6fc17cee6034097d35d92d10abe9343ab168c51dfb4b3274e889c2e555fac634'],
    ['moduleDestructor', '3001bb30', '30088e10', '56c6929f25b36fbbe9ee5d0fa1f3d1a23b3b0da1b4cee4015e5197e6c0211e73'],
    ['inputDispatcherDestroy', '300235bf', '30087c00', 'd14ddbf9c2f92e33783a4dbe815fbfa11ebc42f42eb29771f3b59192ec796fb8'],
    ['inputDispatcherDestructor', '300458fe', '30087d10', '04b80425f517c2c658b1e456fa07a6ff8d5753b37dee3e2e7dd072fa7f6d005c'],
  ] as const;
  return selected.every(([name, entry, body, hash]) => {
    const method = sceneSource.methods[name];
    return method?.module === 'Engine' && method.entry === entry && method.body === body &&
      method.bodyInstructionBytesSha256 === hash;
  });
}

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

export class NativeRuntimePlatform implements NativeMemoryPlatform, NativeByteGeometryHost {
  readonly diagnostics: NativeRuntimeDiagnostics;
  readonly #backing = new Map<object, BackingEntry>();
  readonly #releasedBackings = new WeakSet<NativeMemoryBacking>();
  readonly #processBuffers = new Map<NativeMemoryBacking, ProcessBuffer>();
  readonly #processBases = new WeakMap<NativeBytePointer, ProcessBuffer>();
  readonly #gameImageMappings = new WeakMap<NativeMemoryBacking, Readonly<{
    owner: NativeModuleCrtOwner; baseAddress: number; bytes: Uint8Array; masks: Uint8Array; capacity: number;
  }>>();
  #commandLinePointer: NativeBytePointer | undefined;
  #nativeDirectionFlag: 0 | 1 | undefined;
  readonly processInputEndpoints?: Readonly<NativeWin32ProcessInputEndpoints>;
  readonly #processInputEndpoints?: Readonly<NativeWin32ProcessInputEndpoints>;
  private readonly sections = new Map<string, Section>();
  private readonly sectionIdentities = new Map<object, Section>();
  readonly #physicalSections = new Map<object, Map<number, PhysicalSection>>();
  readonly #winHeaps = new Map<object, WinHeap>();
  readonly #crtServices: RetainedCrtServices | undefined;
  readonly #crtTlsValues = new Map<number, object>();
  readonly #tlsIndexes = new Set<number>();
  readonly #flsIndexes = new Map<number, { callback: NativeCrtThreadDestructor; value: object | null }>();
  #nextTlsIndex = 0;
  #nextFlsIndex = 0;
  readonly #localProcedures = new Set<NativeCrtLocalProcedure>();
  readonly tlsProcedures: Readonly<{ alloc: NativeCrtLocalAllocProcedure; get: NativeCrtLocalGetProcedure; set: NativeCrtLocalSetProcedure; free: NativeCrtLocalFreeProcedure }>;
  readonly #flsProcedures: typeof this.tlsProcedures;
  #processHeap: NativeWin32HeapCapability | null = null;
  readonly #kernel32: NativeWin32ModuleCapability;
  readonly #pointerEncode: NativeCrtPointerProcedure;
  readonly #pointerDecode: NativeCrtPointerProcedure;
  readonly #sectionProcedure: NativeCrtSectionProcedure;
  readonly #encodedPointers = new Map<object | null, object>();
  readonly #decodedPointers = new Map<object, object | null>();
  readonly #win32LastError = new NativeHeapObjectViews({ identity: Object.freeze({}), bytes: new Uint8Array(4),
    knownMask: new Uint8Array(4), freed: false });
  private readonly pending: ShutdownEntry[] = [];
  private readonly executed: ShutdownEntry[] = [];
  #shutdownPhase: 'active' | 'draining' | 'blocked' | 'disposed' = 'active';
  private boundary: string | null = null;
  private bytesOwned = 0;
  private nextOrdinal = 0;
  constructor(options: { diagnostics?: NativeRuntimeDiagnostics; maximumAllocationBytes?: number; maximumOwnedBytes?: number;
    engineCrtServices?: NativeEngineCrtPlatformServices } = {}) {
    this.diagnostics = options.diagnostics ?? new NativeRuntimeDiagnostics();
    Object.freeze(this.#win32LastError);
    this.maximumAllocationBytes = options.maximumAllocationBytes ?? 64 * 1024 * 1024;
    this.maximumOwnedBytes = options.maximumOwnedBytes ?? 256 * 1024 * 1024;
    const crt = retainCrtServices(options.engineCrtServices);
    this.#crtServices = crt.services;
    const process = crt.services?.processInputs;
    this.#nativeDirectionFlag = process?.initialDirectionFlag;
    this.#processInputEndpoints = process === undefined ? undefined : Object.freeze({
      getCommandLineA: () => this.#getCommandLineA(),
      getEnvironmentStringsW: () => this.#acquireProcessBuffer(process.environmentW, 'environment-w'),
      getEnvironmentStrings: () => this.#acquireProcessBuffer(process.environmentA, 'environment-a'),
      freeEnvironmentStringsW: (input: NativeBytePointer) => this.#releaseProcessBuffer(input, 'environment-w'),
      freeEnvironmentStringsA: (input: NativeBytePointer) => this.#releaseProcessBuffer(input, 'environment-a'),
      wideCharToMultiByte: (args: NativeWideCharToMultiByteArguments) => this.#wideCharToMultiByte(args),
    });
    this.processInputEndpoints = this.#processInputEndpoints;
    Object.defineProperty(this, 'processInputEndpoints', { value: this.#processInputEndpoints, writable: false, configurable: false });
    for (const [index, value] of crt.tls) { this.#crtTlsValues.set(index, value); this.#tlsIndexes.add(index); }
    const owner = Object.freeze({});
    this.#kernel32 = Object.freeze({ identity: Object.freeze({}), owner, name: 'KERNEL32.DLL' });
    this.#pointerEncode = Object.freeze({ identity: Object.freeze({}), owner, name: 'EncodePointer',
      invoke: (value: object | null): NativeValue<object | null> => {
        if (this.#crtServices?.pointerCodec !== 'owned-bijection') return unknown('Actual owned pointer-encoding procedure required');
        let encoded = this.#encodedPointers.get(value);
        if (!encoded) { encoded = Object.freeze({}); this.#encodedPointers.set(value, encoded); this.#decodedPointers.set(encoded, value); }
        return known(encoded);
      } });
    this.#pointerDecode = Object.freeze({ identity: Object.freeze({}), owner, name: 'DecodePointer',
      invoke: (value: object | null): NativeValue<object | null> => {
        if (this.#crtServices?.pointerCodec !== 'owned-bijection' || value === null || !this.#decodedPointers.has(value)) {
          return unknown('Actual previously encoded owned pointer capability required; cold numerical zero is not encoded NULL');
        }
        return known(this.#decodedPointers.get(value)!);
      } });
    this.#sectionProcedure = Object.freeze({ identity: Object.freeze({}), owner, name: 'InitializeCriticalSectionAndSpinCount',
      invoke: (fields: NativeHeapObjectViews, sectionOwner: object, spinCount: 4000) => this.initializePhysicalCriticalSection(fields, sectionOwner, spinCount) });
    this.tlsProcedures = Object.freeze({
      alloc: Object.freeze({ kind: 'alloc', name: 'TlsAlloc', invoke: (_callback: NativeCrtThreadDestructor) => this.tlsAlloc() }),
      get: Object.freeze({ kind: 'get', name: 'TlsGetValue', invoke: (index: number) => this.tlsGetValue(index) }),
      set: Object.freeze({ kind: 'set', name: 'TlsSetValue', invoke: (index: number, value: object | null) => this.tlsSetValue(index, value) }),
      free: Object.freeze({ kind: 'free', name: 'TlsFree', invoke: (index: number) => this.tlsFree(index) }),
    });
    Object.defineProperty(this, 'tlsProcedures', { value: this.tlsProcedures, writable: false, configurable: false });
    this.#flsProcedures = Object.freeze({
      alloc: Object.freeze({ kind: 'alloc', name: 'FlsAlloc', invoke: (callback: NativeCrtThreadDestructor) => this.flsAlloc(callback) }),
      get: Object.freeze({ kind: 'get', name: 'FlsGetValue', invoke: (index: number) => this.flsGetValue(index) }),
      set: Object.freeze({ kind: 'set', name: 'FlsSetValue', invoke: (index: number, value: object | null) => this.flsSetValue(index, value) }),
      free: Object.freeze({ kind: 'free', name: 'FlsFree', invoke: (index: number) => this.flsFree(index) }),
    });
    for (const procedure of [...Object.values(this.tlsProcedures), ...Object.values(this.#flsProcedures)]) this.#localProcedures.add(procedure);
    for (const limit of [this.maximumAllocationBytes, this.maximumOwnedBytes]) {
      if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('Selected platform allocation bounds must be positive integers');
    }
    if (source.schema !== 'gothic3-runtime-admin-rules-v1' ||
        source.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') {
      throw new Error('Selected runtime platform source receipt differs');
    }
    retainedRuntimePlatforms.add(this);
    NativeSharedModuleImage.establishForPlatform(this);
  }
  static isRetainedPlatform(platform: NativeRuntimePlatform): boolean { return retainedRuntimePlatforms.has(platform); }
  /** New selected startup graphs require the actual constructor-admitted
   * platform before shutdown begins. Existing Shared views separately remain
   * available during callback drain through their scoped lifetime API. */
  static requireActivePlatform(platform: NativeRuntimePlatform): NativeValue<void> {
    if (!retainedRuntimePlatforms.has(platform) || platform.#shutdownPhase !== 'active') {
      return unknown('Actual constructed active RuntimePlatform required for selected startup');
    }
    return known(undefined);
  }
  static canonicalProcessInputEndpointsForPlatform(platform: NativeRuntimePlatform,
    endpoints: NativeWin32ProcessInputEndpoints): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return endpoints && endpoints === platform.#processInputEndpoints && endpoints === platform.processInputEndpoints
      ? known(undefined) : unknown('Actual immutable same-platform process-input endpoints required');
  }
  static canonicalNativePointerAccessForPlatform(platform: NativeRuntimePlatform, pointer: NativeBytePointer,
    relativeOffset: number, bytes: number): NativeValue<void> {
    if (!retainedRuntimePlatforms.has(platform)) return unknown('Actual constructed RuntimePlatform required');
    return platform.#canonicalNativeAccess(pointer, relativeOffset, bytes);
  }
  /** Admit only the actual owner's retained Game image, retaining its root and
   * alias geometry before the selected access. This performs no native store. */
  static canonicalGameModuleImageAccessForPlatform(platform: NativeRuntimePlatform, owner: NativeModuleCrtOwner,
    label: string, relativeOffset: number, bytes: number): NativeValue<void> {
    if (!retainedRuntimePlatforms.has(platform) || !NativeModuleCrtOwner.isConstructedOwner(owner) ||
        owner.module !== 'Game' || owner.host.platform !== platform) return unknown('Actual same-platform Game image owner required');
    try {
      const live = platform.#readablePlatform(); if (!live.known) return live;
      const selected = NativeModuleCrtOwner.canonicalImageForOwner(owner, label); if (!selected.known) return selected;
      const fields = selected.value; requirePhysicalNativeViews(fields);
      const receipt = nativeGameImageReceipt(label), backing = fields.backing;
      if ('region' in backing) return unknown('Actual canonical Game module-image root required');
      const begin = fields.bytes.byteOffset - backing.bytes.byteOffset;
      const address = Number.parseInt(receipt.address, 16), baseAddress = address - begin;
      if (receipt.module !== 'Game' || receipt.bytes !== fields.bytes.length || !Number.isSafeInteger(begin) || begin < 0 ||
          !Number.isSafeInteger(baseAddress) || baseAddress < 0 || baseAddress + backing.bytes.length > 0x100000000 ||
          begin + fields.bytes.length > backing.bytes.length) return unknown('Exact source-derived Game image root and alias geometry required');
      const mapping = platform.#gameImageMappings.get(backing), previous = platform.#backing.get(backing.identity);
      if (mapping && (mapping.owner !== owner || mapping.baseAddress !== baseAddress || mapping.bytes !== backing.bytes ||
          mapping.masks !== backing.knownMask || mapping.capacity !== backing.bytes.length)) return unknown('Retained Game module-image root mapping differs');
      if (previous) {
        const proof = previous.nativeGeometry;
        if (previous.backing !== backing || previous.kind !== 'module-image' || proof?.alignment !== 'module-image' ||
            proof.bytes !== backing.bytes || proof.masks !== backing.knownMask || proof.capacity !== backing.bytes.length) {
          return unknown('Game module-image root conflicts with its actual platform registration');
        }
      } else {
        const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
        platform.#backing.set(backing.identity, { backing, kind: 'module-image', ordinal: ++platform.nextOrdinal,
          nativeGeometry: Object.freeze({ alignment: 'module-image', bytes: backing.bytes,
            masks: backing.knownMask, capacity: backing.bytes.length }) });
      }
      if (!mapping) platform.#gameImageMappings.set(backing, Object.freeze({ owner, baseAddress,
        bytes: backing.bytes, masks: backing.knownMask, capacity: backing.bytes.length }));
      return platform.#canonicalNativeAccess(Object.freeze({ fields, offset: 0 }), relativeOffset, bytes);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  static canonicalProcessInputSpanForPlatform(platform: NativeRuntimePlatform, pointer: NativeBytePointer,
    bytes: number): NativeValue<void> {
    try {
      const retained = Object.freeze({ fields: pointer.fields, offset: pointer.offset });
      const access = NativeRuntimePlatform.canonicalNativePointerAccessForPlatform(platform, retained, 0, bytes);
      if (!access.known) return access;
      const geometry = platform.#resolveNativePointer(retained); if (!geometry.known) return geometry;
      return platform.#processBuffers.has(geometry.value.canonicalBacking) ? known(undefined)
        : unknown('Actual same-platform retained OS process-input span required');
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  static readProcessInputUnsigned(platform: NativeRuntimePlatform, pointer: NativeBytePointer,
    relativeOffset: number, width: 1 | 2): NativeValue<number> {
    if (width !== 1 && width !== 2) return unknown('Actual process-input BYTE or UTF16 load required');
    try {
      const retained = Object.freeze({ fields: pointer.fields, offset: pointer.offset });
      const access = NativeRuntimePlatform.canonicalNativePointerAccessForPlatform(platform, retained, relativeOffset, width);
      if (!access.known) return access;
      const geometry = platform.#resolveNativePointer(retained); if (!geometry.known) return geometry;
      const buffer = platform.#processBuffers.get(geometry.value.canonicalBacking);
      if (!buffer || (width === 2 && (buffer.kind !== 'environment-w' || (geometry.value.offset + relativeOffset) % 2 !== 0))) {
        return unknown('Actual retained OS process-input encoding/geometry required');
      }
      return known(NativeHeapObjectViews.prototype.readUnsigned.call(retained.fields, retained.offset + relativeOffset, width));
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  static readNativeDirectionFlag(platform: NativeRuntimePlatform): NativeValue<0 | 1> {
    if (!retainedRuntimePlatforms.has(platform)) return unknown('Actual logical-thread RuntimePlatform required');
    const live = platform.#readablePlatform(); if (!live.known) return live;
    return platform.#nativeDirectionFlag === undefined ? unknown('Explicit logical-thread direction-flag ABI required') : known(platform.#nativeDirectionFlag);
  }
  static writeNativeDirectionFlag(platform: NativeRuntimePlatform, value: 0 | 1): NativeValue<void> {
    const previous = NativeRuntimePlatform.readNativeDirectionFlag(platform); if (!previous.known) return previous;
    if (value !== 0 && value !== 1) return unknown('Actual native STD/CLD direction bit required');
    platform.#nativeDirectionFlag = value; return known(undefined);
  }
  static canonicalGameHeapDestination(platform: NativeRuntimePlatform, owner: NativeGameCrtOwner,
    pointer: NativeBytePointer, bytes: number): NativeValue<void> {
    if (!retainedRuntimePlatforms.has(platform)) return unknown('Actual constructed RuntimePlatform required');
    try {
      const retained = Object.freeze({ fields: pointer.fields, offset: pointer.offset });
      const heap = NativeModuleCrtOwner.canonicalGameHeapForAllocation(owner, platform, retained);
      if (!heap.known) return heap;
      return platform.#canonicalGameHeapSpan(heap.value, retained, bytes);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  #readablePlatform(): NativeValue<void> {
    return retainedRuntimePlatforms.has(this) && (this.#shutdownPhase === 'active' || this.#shutdownPhase === 'draining')
      ? known(undefined) : unknown('Actual live RuntimePlatform byte lifetime required');
  }
  #canonicalNativeAccess(pointer: NativeBytePointer, relativeOffset: number, bytes: number): NativeValue<void> {
    try {
      const retained = Object.freeze({ fields: pointer.fields, offset: pointer.offset });
      const live = this.#readablePlatform(); if (!live.known) return live;
      requirePhysicalNativeViews(retained.fields);
      if (!Number.isSafeInteger(relativeOffset) || relativeOffset < 0 || !Number.isSafeInteger(bytes) || bytes < 0) {
        return unknown('Contained retained native byte access required');
      }
      const geometry = this.#resolveNativePointer(retained); if (!geometry.known) return geometry;
      const again = this.#readablePlatform(); if (!again.known) return again;
      const root = geometry.value.canonicalBacking, entry = this.#backing.get(root.identity);
      if ('region' in retained.fields.backing) return unknown('Pooled child-allocation lifetime requires its actual allocator owner');
      if (['identity', 'bytes', 'knownMask', 'freed'].some(key =>
        !Object.prototype.hasOwnProperty.call(Object.getOwnPropertyDescriptor(root, key) ?? {}, 'value')) ||
          Object.getOwnPropertyDescriptor(retained.fields, 'pointerIdentity')!.value !== root.identity ||
          Object.getOwnPropertyDescriptor(retained.fields, 'pointerBegin')!.value !== geometry.value.offset - retained.offset) {
        return unknown('Retained physical backing and pointer-slot bookkeeping required');
      }
      if (root.freed || this.#releasedBackings.has(root) || !entry ||
          retained.offset + relativeOffset + bytes > retained.fields.bytes.length ||
          geometry.value.offset + relativeOffset + bytes > geometry.value.allocationEnd) {
        return unknown('Actual live contained owned native byte span required');
      }
      const process = this.#processBuffers.get(root);
      if (entry.kind === 'win32-process-buffer' && (!process || process.phase !== 'live' ||
          process.bytes !== root.bytes || process.masks !== root.knownMask ||
          process.pointer.fields.view !== process.view || process.pointer.fields.bytes.buffer !== root.bytes.buffer ||
          process.pointer.fields.bytes.byteOffset !== root.bytes.byteOffset)) return unknown('Retained OS process-buffer lifetime/identity has ended');
      return known(undefined);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  #canonicalGameHeapSpan(heap: NativeWin32HeapCapability, pointer: NativeBytePointer, bytes: number): NativeValue<void> {
    const access = this.#canonicalNativeAccess(pointer, 0, bytes); if (!access.known) return access;
    const geometry = this.#resolveNativePointer(pointer); if (!geometry.known) return geometry;
    const retained = this.#winHeaps.get(heap.identity), backing = geometry.value.canonicalBacking;
    const entry = this.#backing.get(backing.identity);
    return retained?.capability === heap && !retained.destroyed && retained.allocations.has(backing) &&
      entry?.kind === 'win32-heap' && !this.#releasedBackings.has(backing)
      ? known(undefined) : unknown('Actual same Game CRT heap allocation destination required');
  }
  #processLastError(error: number | undefined): void {
    if (error !== undefined) NativeHeapObjectViews.prototype.writeUnsigned.call(this.#win32LastError, 0, error);
  }
  #acquireProcessBuffer(outcome: RetainedProcessInputOutcome | undefined,
    kind: ProcessBuffer['kind']): NativeValue<NativeBytePointer | null> {
    const active = NativeRuntimePlatform.requireActivePlatform(this); if (!active.known) return active;
    if (!outcome) return unknown('Explicit selected ' + kind + ' acquisition endpoint required');
    if (outcome.kind === 'null') { this.#processLastError(outcome.lastError); return known(null); }
    const allocated = this.#allocate(outcome.bytes.length, 'win32-process-buffer');
    if (!allocated.known) return allocated;
    if (!allocated.value) return unknown('Actual successful retained OS process-buffer allocation required');
    const backing = allocated.value;
    backing.bytes.set(outcome.bytes); backing.knownMask.set(outcome.knownMask);
    const fields = new NativeHeapObjectViews(backing); Object.freeze(fields);
    const pointer = Object.freeze({ fields, offset: 0 });
    const record: ProcessBuffer = { kind, backing, pointer, bytes: backing.bytes, masks: backing.knownMask,
      view: fields.view, phase: 'live' };
    this.#backing.get(backing.identity)!.nativeGeometry = Object.freeze({ alignment: 'process-buffer-four',
      bytes: backing.bytes, masks: backing.knownMask, capacity: backing.bytes.length });
    this.#processBuffers.set(backing, record); this.#processBases.set(pointer, record);
    this.#processLastError(outcome.lastError); return known(pointer);
  }
  #getCommandLineA(): NativeValue<NativeBytePointer | null> {
    const active = NativeRuntimePlatform.requireActivePlatform(this); if (!active.known) return active;
    const selection = this.#crtServices?.processInputs?.commandLineA;
    if (!selection) return unknown('Explicit selected GetCommandLineA endpoint required');
    if (this.#commandLinePointer) {
      const access = this.#canonicalNativeAccess(this.#commandLinePointer, 0, 0); if (!access.known) return access;
      this.#processLastError(selection.lastError); return known(this.#commandLinePointer);
    }
    const result = this.#acquireProcessBuffer(selection, 'command-line-a');
    if (result.known && result.value) this.#commandLinePointer = result.value;
    return result;
  }
  #releaseProcessBuffer(pointer: NativeBytePointer, kind: 'environment-a' | 'environment-w'): NativeValue<number> {
    const live = this.#readablePlatform(); if (!live.known) return live;
    const record = this.#processBases.get(pointer), selection = this.#crtServices?.processInputs;
    if (!record || record.kind !== kind || record.phase !== 'live' || !selection) {
      return unknown('Actual exact live A/W acquisition base pointer required for OS release');
    }
    const access = this.#canonicalNativeAccess(pointer, 0, 0); if (!access.known) return access;
    const policy = kind === 'environment-w' ? selection.releaseW : selection.releaseA;
    this.#processLastError(policy.lastError);
    if (policy.result !== 0) {
      record.phase = 'released'; this.#releasedBackings.add(record.backing); record.backing.freed = true;
      this.bytesOwned -= record.bytes.length;
    }
    return known(policy.result);
  }
  #wideCharToMultiByte(args: NativeWideCharToMultiByteArguments): NativeValue<number> {
    try {
      const { codePage, flags, input: suppliedInput, inputCharacters, output: suppliedOutput, outputBytes,
        defaultCharacter, usedDefaultCharacter } = args;
      const input = Object.freeze({ fields: suppliedInput.fields, offset: suppliedInput.offset });
      const output = suppliedOutput === null ? null : Object.freeze({ fields: suppliedOutput.fields, offset: suppliedOutput.offset });
      const live = this.#readablePlatform(); if (!live.known) return live;
      const selection = this.#crtServices?.processInputs;
      if (!selection || codePage !== 0 || flags !== 0 || defaultCharacter !== null || usedDefaultCharacter !== null ||
          !Number.isInteger(inputCharacters) || inputCharacters <= 0 || inputCharacters > 0x7fffffff ||
          !Number.isInteger(outputBytes) || outputBytes < 0 || outputBytes > 0x7fffffff) {
        return unknown('Selected ACP1252/flags0/explicit positive UTF16 count conversion contract required');
      }
      const span = NativeRuntimePlatform.canonicalProcessInputSpanForPlatform(this, input, inputCharacters * 2);
      if (!span.known) return span;
      const source = this.#resolveNativePointer(input); if (!source.known) return source;
      if (this.#processBuffers.get(source.value.canonicalBacking)?.kind !== 'environment-w' || source.value.offset % 2 !== 0) {
        return unknown('Actual same-platform retained UTF16 environment input required');
      }
      const query = output === null && outputBytes === 0;
      if (!query && (output === null || outputBytes === 0)) return unknown('Actual admitted query or retained conversion destination required');
      if (output) {
        const heap = NativeModuleCrtOwner.canonicalGameHeapForPlatform(this, output); if (!heap.known) return heap;
        const destination = this.#canonicalGameHeapSpan(heap.value, output, outputBytes); if (!destination.known) return destination;
      }
      const failure = query ? selection.conversionFailure.query : selection.conversionFailure.fill;
      if (failure) { this.#processLastError(failure.lastError); return known(failure.result); }
      for (let index = 0; index < inputCharacters; index++) {
        const unit = NativeRuntimePlatform.readProcessInputUnsigned(this, input, index * 2, 2); if (!unit.known) return unit;
        if (unit.value > 127) return unknown('Selected ACP conversion covers ASCII UTF16 units only');
        if (output) {
          if (index >= outputBytes) return unknown('Current explicit conversion input exceeds retained output count; failure writes remain unowned');
          const access = this.#canonicalNativeAccess(output, index, 1); if (!access.known) return access;
          NativeHeapObjectViews.prototype.writeUnsigned.call(output.fields, output.offset + index, unit.value, 1);
        }
      }
      return known(inputCharacters);
    } catch (error) { return unknown('Selected WideCharToMultiByte: ' + (error instanceof Error ? error.message : String(error))); }
  }
  private readonly maximumAllocationBytes: number;
  private readonly maximumOwnedBytes: number;
  private readonly originalModuleLiterals = new Map<string, NativeMemoryBacking>();
  private readonly canonicalGameGuidLiterals = new WeakMap<NativeGameCrtOwner, NativeBytePointer>();
  #allocate(bytes: number, kind: BackingEntry['kind']): NativeValue<NativeMemoryBacking | null> {
    if (this.#shutdownPhase === 'disposed' || this.#shutdownPhase === 'blocked') return unknown('Selected runtime platform is not active');
    if (!Number.isInteger(bytes) || bytes < 0 || bytes > 0xffffffff) return unknown('Original platform uint32 allocation size required');
    if (bytes > this.maximumAllocationBytes || bytes + this.bytesOwned > this.maximumOwnedBytes) {
      return unknown('Allocation exceeds the selected successful bounded platform profile');
    }
    try {
      const backing: NativeMemoryBacking = { identity: Object.freeze({}), bytes: new Uint8Array(bytes),
        knownMask: new Uint8Array(bytes).fill(kind === 'virtual' ? 255 : 0), freed: false };
      this.#backing.set(backing.identity, { backing, kind, ordinal: ++this.nextOrdinal }); this.bytesOwned += bytes;
      return known(backing);
    } catch (error) { return unknown('Selected platform allocation: ' + (error instanceof Error ? error.message : String(error))); }
  }
  virtualAlloc(bytes: number, type: 0x103000, protect: 4): NativeValue<NativeMemoryRegion | null> {
    if (type !== 0x103000 || protect !== 4) return unknown('Original VirtualAlloc flags differ from admitted pool profile');
    const result = this.#allocate(bytes, 'virtual');
    // Successful reservation/commit owns a page-aligned base. This record is
    // allocator provenance; an arbitrary byte buffer gets no such geometry.
    if (result.known && result.value) this.#backing.get(result.value.identity)!.nativeGeometry = Object.freeze({
      alignment: 'virtual-page', bytes: result.value.bytes, masks: result.value.knownMask, capacity: result.value.bytes.length });
    return result;
  }
  crtNew(bytes: number): NativeValue<NativeMemoryBacking | null> { return this.#allocate(bytes, 'crt-new'); }
  crtMalloc(bytes: number): NativeValue<NativeMemoryBacking | null> { return this.#allocate(bytes, 'crt-malloc'); }
  crtFree(backing: NativeMemoryBacking): NativeValue<void> {
    const entry = this.#backing.get(backing.identity);
    if (!entry || entry.backing !== backing || backing.freed || this.#releasedBackings.has(backing) ||
        (entry.kind !== 'crt-new' && entry.kind !== 'crt-malloc')) {
      return unknown('Actual live selected CRT backing required for free');
    }
    this.#releasedBackings.add(backing); backing.freed = true; this.bytesOwned -= backing.bytes.length; return known(undefined);
  }
  createWin32Heap(owner: object, options: 0 | 1, initialBytes: 4096, maximumBytes: 0): NativeValue<NativeWin32HeapCapability | null> {
    if (this.#shutdownPhase !== 'active' || !owner || typeof owner !== 'object' ||
        (options !== 0 && options !== 1) || initialBytes !== 4096 || maximumBytes !== 0) {
      return unknown('Actual active selected HeapCreate owner and original options required');
    }
    const capability = Object.freeze({ identity: Object.freeze({}), owner });
    this.#winHeaps.set(capability.identity, { capability, options, allocations: new Set(), destroyed: false });
    return known(capability);
  }
  win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0 | 8, bytes: number): NativeValue<NativeMemoryBacking | null> {
    const retained = this.#winHeaps.get(heap.identity);
    if (!retained || retained.capability !== heap || retained.destroyed || (flags !== 0 && flags !== 8)) {
      return unknown('Actual live selected HeapAlloc handle and flags required');
    }
    const allocated = this.#allocate(bytes, 'win32-heap');
    if (allocated.known && allocated.value) {
      retained.allocations.add(allocated.value);
      // The admitted x86 HeapAlloc contract returns an eight-byte-aligned
      // block. Its retained capacity stays exact; no padding is invented.
      this.#backing.get(allocated.value.identity)!.nativeGeometry = Object.freeze({ alignment: 'win32-heap-eight',
        bytes: allocated.value.bytes, masks: allocated.value.knownMask, capacity: allocated.value.bytes.length });
      if (flags === 8) { allocated.value.bytes.fill(0); allocated.value.knownMask.fill(255); }
    }
    return allocated;
  }
  /** One exact immutable Game.dll literal slice used by the selected browser
   * CString initializer profile. This is mapped image data, not a heap block. */
  registerOriginalGameCStringLiteral(address: string, raw: Uint8Array): NativeValue<NativeMemoryBacking> {
    if (this.#shutdownPhase !== 'active' || !/^[0-9a-f]{8}$/.test(address) ||
        navigationSource.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f') {
      return unknown('Selected active original Game.dll literal range required');
    }
    const receipt = navigationSource.navigationNameInitializers.initializers.find(row => row.literalAddress === address);
    const expected = receipt?.literalRaw.match(/../g)?.map(byte => Number.parseInt(byte, 16));
    if (!receipt || !expected || raw.length !== expected.length || raw.some((byte, index) => byte !== expected[index])) {
      return unknown('Game.dll literal bytes do not match the selected PE receipt');
    }
    const previous = this.originalModuleLiterals.get(address);
    if (previous) return previous.freed ? unknown('Selected original Game.dll literal lifetime has ended') : known(previous);
    const backing: NativeMemoryBacking = { identity: Object.freeze({}), bytes: raw.slice(),
      knownMask: new Uint8Array(raw.length).fill(255), freed: false };
    this.#backing.set(backing.identity, { backing, kind: 'module-image', ordinal: ++this.nextOrdinal,
      nativeGeometry: Object.freeze({ alignment: 'module-image', bytes: backing.bytes,
        masks: backing.knownMask, capacity: backing.bytes.length }) });
    this.originalModuleLiterals.set(address, backing);
    return known(backing);
  }
  /** Register the actual existing Game image range. The canonical CRT owner
   * and retained view proof prevent a second copied GUID literal backing. */
  registerCanonicalGameGuidLiteral(owner: NativeGameCrtOwner): NativeValue<NativeBytePointer> {
    if (this.#shutdownPhase === 'disposed' || this.#shutdownPhase === 'blocked') return unknown('Live platform module-image lifetime required');
    const selected = NativeGameCrtOwner.canonicalImageForPlatform(owner, this, 'scriptAdminPropertyIdLiteral');
    if (!selected.known) return selected;
    const receipt = nativeGameImageReceipt('scriptAdminPropertyIdLiteral');
    const fields = selected.value, backing = fields.backing;
    const raw = '7b34394130323442412d393730412d343161362d393933432d3435384133394446314236317d00';
    if (receipt.module !== 'Game' || receipt.address !== '2069c090' || receipt.bytes !== 39 ||
        receipt.raw !== raw || receipt.sha256 !== '6a71ad2a1b17bc82c460fc0a09d40e08852f854cd183700909780de17a799034' ||
        'region' in backing || backing.freed || backing.bytes.length !== 39 || backing.knownMask.length !== 39 ||
        fields.bytes.length !== 39 || fields.knownMask.length !== 39 ||
        fields.bytes.buffer !== backing.bytes.buffer || fields.bytes.byteOffset !== backing.bytes.byteOffset ||
        fields.knownMask.buffer !== backing.knownMask.buffer || fields.knownMask.byteOffset !== backing.knownMask.byteOffset ||
        fields.bytes.some((byte, index) => byte !== Number.parseInt(raw.slice(index * 2, index * 2 + 2), 16)) ||
        fields.knownMask.some(mask => mask !== 255)) {
      return unknown('Exact live canonical Game2069c090 image literal required');
    }
    const previous = this.canonicalGameGuidLiterals.get(owner);
    if (previous) {
      const entry = this.#backing.get(backing.identity), proof = entry?.nativeGeometry;
      if (previous.fields !== fields || previous.offset !== 0 || entry?.backing !== backing ||
          entry.kind !== 'module-image' || proof?.bytes !== backing.bytes ||
          proof.masks !== backing.knownMask || proof.capacity !== 39 || proof.alignment !== 'module-image') {
        return unknown('Retained canonical Game image mapping differs');
      }
      return known(previous);
    }
    if (this.#backing.has(backing.identity)) return unknown('Canonical Game image backing already has a conflicting platform owner');
    this.#backing.set(backing.identity, { backing, kind: 'module-image', ordinal: ++this.nextOrdinal,
      nativeGeometry: Object.freeze({ alignment: 'module-image', bytes: backing.bytes,
        masks: backing.knownMask, capacity: 39 }) });
    const pointer = Object.freeze({ fields, offset: 0 });
    this.canonicalGameGuidLiterals.set(owner, pointer);
    return known(pointer);
  }
  /** Shared image bytes remain usable while callbacks drain. A blocked drain
   * retains storage but cannot construct/publish further image views. */
  canonicalSharedModuleImageLifetime(): NativeValue<void> {
    if (!retainedRuntimePlatforms.has(this) || this.#shutdownPhase === 'disposed' || this.#shutdownPhase === 'blocked') {
      return unknown('Live actual platform SharedBase module-image lifetime required');
    }
    return known(undefined);
  }
  /** Register the registry's original retained backing before any view is
   * published. The private registry proof rejects caller-shaped cold storage. */
  registerCanonicalSharedModuleImage(image: NativeSharedModuleImage, fields: NativeHeapObjectViews): NativeValue<void> {
    const lifetime = this.canonicalSharedModuleImageLifetime(); if (!lifetime.known) return lifetime;
    const canonical = NativeSharedModuleImage.canonicalBackingForPlatform(image, this, fields);
    if (!canonical.known) return canonical;
    const backing = canonical.value;
    if (fields.bytes.length !== backing.bytes.length || fields.knownMask.length !== backing.knownMask.length ||
        fields.bytes.byteOffset !== backing.bytes.byteOffset || fields.knownMask.byteOffset !== backing.knownMask.byteOffset) {
      return unknown('Complete canonical SharedBase image fragment required for registration');
    }
    const previous = this.#backing.get(backing.identity);
    if (previous) {
      const proof = previous.nativeGeometry;
      if (previous.backing !== backing || previous.kind !== 'module-image' || proof?.alignment !== 'module-image' ||
          proof.bytes !== backing.bytes || proof.masks !== backing.knownMask || proof.capacity !== backing.bytes.length) {
        return unknown('Retained canonical SharedBase image geometry differs');
      }
      return known(undefined);
    }
    this.#backing.set(backing.identity, { backing, kind: 'module-image', ordinal: ++this.nextOrdinal,
      nativeGeometry: Object.freeze({ alignment: 'module-image', bytes: backing.bytes,
        masks: backing.knownMask, capacity: backing.bytes.length }) });
    return known(undefined);
  }
  /** The canonical Shared image registry is the authority in both CString
   * acquisition orders; no independent literal allocation is retained here. */
  sharedCStringLiteralPointer(label: 'emptyCStringText' | 'guidEmptyLiteral'): NativeValue<NativeBytePointer> {
    const image = NativeSharedModuleImage.forPlatform(this);
    return image.known ? image.value.cstringLiteralPointer(label) : image;
  }
  win32HeapSize(heap: NativeWin32HeapCapability | null, _flags: 0, pointer: NativeBytePointer): NativeValue<number> {
    if (heap === null) return unknown('Selected actual HeapSize call on the NULL CRT heap handle is unowned');
    const retained = this.#winHeaps.get(heap.identity);
    if (!retained || retained.capability !== heap || retained.destroyed) return unknown('Actual live selected HeapSize heap handle required');
    const geometry = this.resolveNativePointer(pointer);
    if (!geometry.known) return unknown('Selected HeapSize pointer has no retained native allocation geometry');
    const backing = geometry.value.canonicalBacking;
    const allocation = this.#backing.get(backing.identity);
    if (!allocation || allocation.backing !== backing || allocation.kind !== 'win32-heap' ||
        !retained.allocations.has(backing) || backing.freed || this.#releasedBackings.has(backing) || geometry.value.offset !== geometry.value.allocationBegin) {
      // HeapSize reports SIZE_T(-1) for a selected call that does not identify a
      // live base pointer owned by this exact heap.
      return known(0xffffffff);
    }
    const proof = allocation.nativeGeometry;
    if (!proof || proof.bytes !== backing.bytes || proof.masks !== backing.knownMask ||
        proof.capacity !== backing.bytes.length || proof.alignment !== 'win32-heap-eight') {
      return unknown('Actual retained HeapAlloc capacity proof required by HeapSize');
    }
    return known(proof.capacity);
  }
  resolveNativePointer(pointer: NativeBytePointer): NativeValue<NativePointerGeometry> { return this.#resolveNativePointer(pointer); }
  #resolveNativePointer(pointer: NativeBytePointer): NativeValue<NativePointerGeometry> {
    try {
      const { fields, offset: pointerOffset } = pointer;
      if (!(fields instanceof NativeHeapObjectViews) || !Number.isSafeInteger(pointerOffset)) throw new Error('Actual retained native byte pointer required');
      const backing = fields.backing;
      const canonical = 'region' in backing ? backing.region : backing;
      const entry = this.#backing.get(canonical.identity);
      if (!entry || entry.backing !== canonical || !entry.nativeGeometry) throw new Error('Native pointer has no retained allocator or mapped-image geometry');
      const proof = entry.nativeGeometry;
      if (canonical.bytes !== proof.bytes || canonical.knownMask !== proof.masks || canonical.bytes.length !== proof.capacity) {
        throw new Error('Native pointer canonical storage differs from its retained allocator proof');
      }
      const allocationBegin = 'region' in backing ? backing.offset : 0;
      const capacity = backing.bytes.length, begin = fields.bytes.byteOffset - backing.bytes.byteOffset;
      const allocationEnd = allocationBegin + capacity;
      if (!Number.isSafeInteger(allocationBegin) || allocationBegin < 0 ||
          ('region' in backing && (!Number.isSafeInteger(backing.capacity) || backing.capacity !== capacity)) ||
          canonical.bytes.length !== canonical.knownMask.length || backing.knownMask.length !== capacity ||
          allocationEnd > canonical.bytes.length || begin < 0 || begin + fields.bytes.length > capacity ||
          fields.bytes.length !== fields.knownMask.length || pointerOffset < 0 || pointerOffset > fields.bytes.length ||
          backing.bytes.buffer !== canonical.bytes.buffer || backing.bytes.byteOffset !== canonical.bytes.byteOffset + allocationBegin ||
          backing.knownMask.buffer !== canonical.knownMask.buffer || backing.knownMask.byteOffset !== canonical.knownMask.byteOffset + allocationBegin ||
          fields.bytes.buffer !== canonical.bytes.buffer || fields.bytes.byteOffset !== canonical.bytes.byteOffset + allocationBegin + begin ||
          fields.knownMask.buffer !== canonical.knownMask.buffer || fields.knownMask.byteOffset !== canonical.knownMask.byteOffset + allocationBegin + begin ||
          fields.view.buffer !== fields.bytes.buffer || fields.view.byteOffset !== fields.bytes.byteOffset ||
          fields.view.byteLength !== fields.bytes.length) {
        throw new Error('Native pointer canonical allocation/view aliases differ');
      }
      const offset = allocationBegin + begin + pointerOffset;
      const imageBase = this.#gameImageMappings.get(canonical)?.baseAddress ?? 0;
      return known(Object.freeze({ canonicalBacking: canonical, allocationIdentity: canonical.identity,
        offset, allocationBegin, allocationEnd, canonicalCapacity: canonical.bytes.length,
        modulo4: ((imageBase + offset) & 3) as 0 | 1 | 2 | 3 }));
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  proveNativeCopyDirection(destination: NativeBytePointer, input: NativeBytePointer, bytes: number): NativeValue<'forward' | 'backward'> {
    if (!Number.isInteger(bytes) || bytes < 0 || bytes > 0xffffffff) return unknown('Original memcpy uint32 size required');
    const source = this.resolveNativePointer(input); if (!source.known) return source;
    const target = this.resolveNativePointer(destination); if (!target.known) return target;
    if (source.value.canonicalBacking === target.value.canonicalBacking) {
      // Retained canonical region bounds prove this addition without assigning
      // an address. Individual access bounds/lifetimes remain at load/store.
      if (source.value.offset + bytes > source.value.canonicalCapacity) return unknown('Same-root memcpy pointer addition exceeds its retained canonical address span');
      return known(source.value.offset < target.value.offset && target.value.offset < source.value.offset + bytes ? 'backward' : 'forward');
    }
    if (source.value.offset + bytes > source.value.allocationEnd || target.value.offset + bytes > target.value.allocationEnd) {
      return unknown('Distinct-root memcpy spans lack owned native nonoverlap/ordering proof');
    }
    // Fresh successful allocations own distinct storage. No ordinal or guessed
    // address ordering is used to compare these disjoint byte intervals.
    return known('forward');
  }
  win32HeapFree(heap: NativeWin32HeapCapability, flags: 0, backing: NativeMemoryBacking): NativeValue<boolean> {
    const retained = this.#winHeaps.get(heap.identity), entry = this.#backing.get(backing.identity);
    if (!retained || retained.capability !== heap || retained.destroyed || flags !== 0 ||
        !retained.allocations.has(backing) || !entry || entry.backing !== backing || backing.freed || this.#releasedBackings.has(backing)) {
      return unknown('Actual live selected HeapFree handle and retained allocation required');
    }
    this.#releasedBackings.add(backing); backing.freed = true; this.bytesOwned -= backing.bytes.length; return known(true);
  }
  win32HeapDestroy(heap: NativeWin32HeapCapability): NativeValue<boolean> {
    const retained = this.#winHeaps.get(heap.identity);
    if (!retained || retained.capability !== heap || retained.destroyed || heap === this.#processHeap) return unknown('Actual live destroyable selected HeapDestroy handle required');
    for (const backing of retained.allocations) if (!this.#releasedBackings.has(backing)) {
      this.#releasedBackings.add(backing); backing.freed = true; this.bytesOwned -= backing.bytes.length;
    }
    retained.destroyed = true; return known(true);
  }
  tlsGetValue(index: number): NativeValue<object | null> {
    if (!this.#crtServices || !Number.isInteger(index) || index < 0 || index > 0xffffffff) return unknown('Actual owned CRT TLS registry and uint32 index required');
    // The explicitly selected lower TLS endpoint clears LastError on success.
    // An unallocated scalar index takes its owned invalid-index error branch.
    this.#win32LastError.writeUnsigned(0, this.#tlsIndexes.has(index) ? 0 : 87);
    return known(this.#crtTlsValues.get(index) ?? null);
  }
  tlsAlloc(): NativeValue<number> {
    if (!this.#crtServices) return unknown('Actual owned TLS allocation service required');
    while (this.#tlsIndexes.has(this.#nextTlsIndex)) this.#nextTlsIndex++;
    if (this.#nextTlsIndex >= 0xffffffff) return known(0xffffffff);
    const index = this.#nextTlsIndex++; this.#tlsIndexes.add(index); return known(index);
  }
  tlsSetValue(index: number, value: object | null): NativeValue<boolean> {
    if (!this.#crtServices) return unknown('Actual owned TLS publication service required');
    if (!this.#tlsIndexes.has(index)) return known(false);
    if (value === null) this.#crtTlsValues.delete(index); else this.#crtTlsValues.set(index, value); return known(true);
  }
  tlsFree(index: number): NativeValue<boolean> {
    if (!this.#crtServices) return unknown('Actual owned TLS free service required');
    if (!this.#tlsIndexes.delete(index)) return known(false); this.#crtTlsValues.delete(index); return known(true);
  }
  private flsAlloc(callback: NativeCrtThreadDestructor): NativeValue<number> {
    // Selected Engine/Game free-PTD callbacks are admitted by their module's
    // startup owner before publication. Retain the callback capability itself.
    if (!this.#crtServices?.fiberLocalStorage || !['3067e143', '20468043'].includes(callback.address)) return unknown('Actual selected FLS allocator/destructor required');
    if (this.#nextFlsIndex >= 0xffffffff) return known(0xffffffff);
    const index = this.#nextFlsIndex++; this.#flsIndexes.set(index, { callback, value: null }); return known(index);
  }
  private flsGetValue(index: number): NativeValue<object | null> { return this.#crtServices?.fiberLocalStorage ? known(this.#flsIndexes.get(index)?.value ?? null) : unknown('Actual selected FLS getter required'); }
  private flsSetValue(index: number, value: object | null): NativeValue<boolean> {
    if (!this.#crtServices?.fiberLocalStorage) return unknown('Actual selected FLS setter required');
    const entry = this.#flsIndexes.get(index); if (!entry) return known(false); entry.value = value; return known(true);
  }
  private flsFree(index: number): NativeValue<boolean> {
    if (!this.#crtServices?.fiberLocalStorage) return unknown('Actual selected FLS free required');
    const entry = this.#flsIndexes.get(index); if (!entry) return known(false);
    this.#flsIndexes.delete(index); const value = entry.value; entry.value = null;
    if (value !== null) { const destroyed = entry.callback.invoke(value); if (!destroyed.known) return destroyed; }
    return known(true);
  }
  ownsLocalStorageProcedure(procedure: NativeCrtLocalProcedure): boolean { return this.#localProcedures.has(procedure); }
  private canonicalFields(fields: NativeHeapObjectViews, size: number): void {
    const backing = fields.backing, canonical = 'region' in backing ? backing.region : backing;
    const position = ('region' in backing ? backing.offset : 0) + fields.bytes.byteOffset - backing.bytes.byteOffset;
    if (fields.bytes.length !== size || fields.knownMask.length !== size || backing.freed || canonical.freed || position < 0 || position + size > canonical.bytes.length ||
        fields.bytes.buffer !== canonical.bytes.buffer || fields.bytes.byteOffset !== canonical.bytes.byteOffset + position ||
        fields.knownMask.buffer !== canonical.knownMask.buffer || fields.knownMask.byteOffset !== canonical.knownMask.byteOffset + position) throw new Error('Actual canonical live platform output storage required');
  }
  interlockedCounter(fields: NativeHeapObjectViews, delta: 1 | -1): NativeValue<number> {
    if (!this.#crtServices) return unknown('Actual selected Interlocked counter service required');
    try { this.canonicalFields(fields, 4); const value = (fields.readUnsigned(0) + delta) >>> 0; fields.writeUnsigned(0, value); return known(value | 0); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  getProcessHeap(): NativeValue<NativeWin32HeapCapability> {
    if (!this.#crtServices?.processHeap) return unknown('Actual selected process heap service required');
    if (!this.#processHeap) { const capability = Object.freeze({ identity: Object.freeze({}), owner: this.#kernel32.owner }); this.#processHeap = capability; this.#winHeaps.set(capability.identity, { capability, options: 0, allocations: new Set(), destroyed: false }); }
    return known(this.#processHeap);
  }
  getVersionExA(fields: NativeHeapObjectViews): NativeValue<boolean> {
    if (this.#crtServices?.osVersion === undefined) return unknown('Actual selected GetVersionExA service required');
    try { this.canonicalFields(fields, 148); if (fields.readUnsigned(0) !== 148) return unknown('Original OSVERSIONINFOA size148 required'); const version = this.#crtServices.osVersion; if (!version) return known(false);
      fields.writeUnsigned(4, version.major); fields.writeUnsigned(8, version.minor); fields.writeUnsigned(12, version.build); fields.writeUnsigned(16, version.platform); return known(true); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  getSystemTimeAsFileTime(fields: NativeHeapObjectViews): NativeValue<void> {
    const result = this.#crtServices?.entropy?.systemTimeAsFileTime?.() ?? unknown('Actual selected system time service required'); if (!result.known) return result;
    try { this.canonicalFields(fields, 8); fields.writeUnsigned(0, result.value.low); fields.writeUnsigned(4, result.value.high); return known(undefined); } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  getCurrentProcessId(): NativeValue<number> { return this.#crtServices?.entropy?.currentProcessId?.() ?? unknown('Actual selected process ID service required'); }
  getCurrentThreadId(): NativeValue<number> { return this.#crtServices?.entropy?.currentThreadId?.() ?? unknown('Actual selected thread ID service required'); }
  getTickCount(): NativeValue<number> { return this.#crtServices?.entropy?.tickCount?.() ?? unknown('Actual selected tick count service required'); }
  queryPerformanceCounter(fields: NativeHeapObjectViews): NativeValue<boolean> {
    const result = this.#crtServices?.entropy?.performanceCounter?.() ?? unknown('Actual selected performance counter service required'); if (!result.known) return result;
    try { this.canonicalFields(fields, 8); if (result.value.low !== undefined) fields.writeUnsigned(0, result.value.low); if (result.value.high !== undefined) fields.writeUnsigned(4, result.value.high); return known(result.value.success); } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  setWin32LastError(error: number): NativeValue<void> {
    if (!this.#crtServices || !Number.isInteger(error) || error < 0 || error > 0xffffffff) return unknown('Actual owned Win32 last-error slot and uint32 error required');
    this.#win32LastError.writeUnsigned(0, error); return known(undefined);
  }
  getWin32LastError(): NativeValue<number> {
    if (!this.#crtServices) return unknown('Actual owned Win32 last-error slot required');
    try { return known(this.#win32LastError.readUnsigned(0)); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  getWin32ModuleHandle(name: 'KERNEL32.DLL' | 'kernel32.dll'): NativeValue<NativeWin32ModuleCapability | null> {
    if (!this.#crtServices || (name !== 'KERNEL32.DLL' && name !== 'kernel32.dll')) return unknown('Actual owned CRT Win32 module registry required');
    return known(this.#crtServices.kernel32Available ? this.#kernel32 : null);
  }
  getWin32Procedure(module: NativeWin32ModuleCapability, name: 'EncodePointer' | 'DecodePointer'): NativeValue<NativeCrtPointerProcedure | null>;
  getWin32Procedure(module: NativeWin32ModuleCapability, name: 'InitializeCriticalSectionAndSpinCount'): NativeValue<NativeCrtSectionProcedure | null>;
  getWin32Procedure(module: NativeWin32ModuleCapability, name: 'FlsAlloc' | 'FlsGetValue' | 'FlsSetValue' | 'FlsFree'): NativeValue<NativeCrtLocalProcedure | null>;
  getWin32Procedure(module: NativeWin32ModuleCapability, name: string): NativeValue<NativeCrtPlatformProcedure | null> {
    if (!this.#crtServices || module !== this.#kernel32 || !this.#crtServices.kernel32Available) return unknown('Actual owned CRT Win32 module capability required');
    if (name === 'EncodePointer') return known(this.#crtServices.pointerCodec === 'owned-bijection' ? this.#pointerEncode : null);
    if (name === 'DecodePointer') return known(this.#crtServices.pointerCodec === 'owned-bijection' ? this.#pointerDecode : null);
    if (name === 'InitializeCriticalSectionAndSpinCount') return known(this.#crtServices.sectionSpinProcedure === false ? null : this.#sectionProcedure);
    const key = ({ FlsAlloc: 'alloc', FlsGetValue: 'get', FlsSetValue: 'set', FlsFree: 'free' } as const)[name as 'FlsAlloc'];
    if (key) return known(this.#crtServices.fiberLocalStorage ? this.#flsProcedures[key] : null);
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
      if (this.#shutdownPhase !== 'active' || !owner || typeof owner !== 'object') {
        return unknown('Actual active physical section owner required');
      }
      const { canonicalBacking, position } = physicalPosition(fields);
      if ([...this.#physicalSections.values()].some(entries => [...entries.values()].some(section =>
        section.bytes.buffer === fields.bytes.buffer && fields.bytes.byteOffset < section.bytes.byteOffset + 24 &&
        fields.bytes.byteOffset + 24 > section.bytes.byteOffset))) {
        return unknown('Physical section byte range already belongs to its canonical registration');
      }
      let positions = this.#physicalSections.get(canonicalBacking.identity);
      if (!positions) { positions = new Map(); this.#physicalSections.set(canonicalBacking.identity, positions); }
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
    const section = this.#physicalSections.get(canonicalBacking.identity)?.get(position);
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
    const left = this.#backing.get(a.identity), right = this.#backing.get(b.identity);
    if (!left || !right || left.backing !== a || right.backing !== b || left.kind !== 'virtual' || right.kind !== 'virtual' || a.freed || b.freed) {
      return unknown('Actual live selected virtual regions required for ordering');
    }
    return known(left.ordinal === right.ordinal ? 0 : left.ordinal < right.ordinal ? -1 : 1);
  }
  initializeCriticalSection(address: '10189a18', owner: object, spinCount: 1000): NativeValue<number>;
  initializeCriticalSection(address: string, owner: object): NativeValue<object>;
  initializeCriticalSection(address: string, owner: object, spinCount?: 1000): NativeValue<number | object> {
    if (this.#shutdownPhase === 'disposed' || this.#shutdownPhase === 'blocked') return unknown('Selected CS platform is not active');
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
    if (this.#shutdownPhase !== 'active' || (!admittedShared && !admittedSceneName && !admittedModuleAdminShutdown(address) &&
        !admittedMatrixDestructor(address) && !admittedNavigationNameDestructor(address)) || typeof execute !== 'function') {
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
    if (this.#shutdownPhase === 'disposed') return known(undefined);
    if (this.#shutdownPhase === 'blocked') return unknown(this.boundary!);
    if (this.#shutdownPhase === 'draining') return unknown('Selected runtime shutdown is already executing');
    this.#shutdownPhase = 'draining';
    while (this.pending.length) {
      const entry = this.pending.pop()!;
      let result: NativeValue<void>;
      try { result = entry.execute(); } catch (error) { result = unknown(error instanceof Error ? error.message : String(error)); }
      this.executed.push(entry);
      if (!result.known) { this.#shutdownPhase = 'blocked'; this.boundary = `Shutdown ${entry.address}: ${result.reason}`; return unknown(this.boundary); }
    }
    for (const entry of this.#backing.values()) if (entry.kind === 'module-image') entry.backing.freed = true;
    for (const buffer of this.#processBuffers.values()) if (buffer.phase === 'live') {
      buffer.phase = 'expired'; this.#releasedBackings.add(buffer.backing); buffer.backing.freed = true;
      this.bytesOwned -= buffer.bytes.length;
    }
    this.#shutdownPhase = 'disposed'; return known(undefined);
  }
  snapshot() { return Object.freeze({ phase: this.#shutdownPhase, boundary: this.boundary, bytesOwned: this.bytesOwned,
    allocations: Object.freeze([...this.#backing.values()].map(entry => Object.freeze({ kind: entry.kind, ordinal: entry.ordinal, backing: entry.backing }))),
    sections: Object.freeze([...this.sections.values()].map(section => Object.freeze({ ...section }))),
    physicalSections: Object.freeze([...this.#physicalSections.values()].flatMap(positions => [...positions.values()].map(section => Object.freeze({ ...section })))),
    winHeaps: Object.freeze([...this.#winHeaps.values()].map(heap => Object.freeze({ capability: heap.capability, options: heap.options,
      destroyed: heap.destroyed, allocations: Object.freeze([...heap.allocations]) }))),
    win32LastError: this.#win32LastError,
    pending: Object.freeze(this.pending.slice()), executed: Object.freeze(this.executed.slice()) }); }
}

/** Standalone cold admin owner. Connecting this to an NPC requires every
 * earlier source allocation on that NPC path to use this same MemoryAdmin;
 * logical factory allocation receipts alone do not satisfy that prerequisite. */
export function createNativeRuntimeAdminOwner(platform = new NativeRuntimePlatform(),
  options: { readonly memoryExtensions?: readonly NativeMemoryRulesExtension[] } = {}) {
  const memory = new NativeMemoryAdmin(platform, { extensions: options.memoryExtensions ?? [] });
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

/** The Ardea NPC owner consumes the source-audited 24/32-byte MemoryAdmin pools
 * needed by Game.dll Navigation-name CStrings, alongside its 20/40-byte NPC
 * path pools. Other standalone admin owners remain cold/base-only. */
export function createBrowserNpcRuntimeAdminOwner(platform = new NativeRuntimePlatform()) {
  return createNativeRuntimeAdminOwner(platform, { memoryExtensions: [nativeNpcHeapExtension, nativeSceneStartupHeapExtension] });
}
