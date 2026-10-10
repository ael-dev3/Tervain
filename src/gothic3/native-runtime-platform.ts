import type {NativeGuidTextPlatform} from './native-guid-text';
import { NativeSharedCrtOwner } from './native-shared-crt';
import { NativeEngineCrtEnvironment } from './native-engine-crt-environment';
import { NativeWin32FileSystem, retainNativeWin32FileSystemSelection } from './native-win32-file-system';
import type { NativeWin32FileSystemSelection, NativeWin32CreateFileResult } from './native-win32-file-system';
/** Selected single-executor platform for source-owned runtime admins. It owns
 * byte storage, region ordering, CS capabilities and callback lifetimes. It
 * does not report observations of the host's Windows allocator, zSpy or files. */
import { admittedPropertySingletonCallback } from './native-property-singleton';
import rulesText from '../../assets/gothic3/runtime-admin/runtime-rules.json?raw';
import sceneRulesText from '../../assets/gothic3/scene-startup/runtime-rules.json?raw';
import navigationRulesText from '../../assets/gothic3/browser-navigation-owner/runtime-rules.json?raw';
import npcEntityManifestText from '../../assets/gothic3/npc-entity/manifest.json?raw';
import type { NativeValue } from './dialogue';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativeSceneStartupHeapExtension, nativePropertyHeapExtension, nativeClassNameHeapExtension } from './native-memory-admin';
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
import { retainNativeX86ThreadStackSelection } from './native-x86-thread-stack-profile';
import type { NativeX86ThreadStackSelection } from './native-x86-thread-stack-profile';
import { NativeX86ThreadStack, retireNativeX86ThreadStackForPlatform } from './native-x86-thread-stack';
import type { NativeHeapAllocCallGrant } from './native-x86-thread-stack';
import { retainNativeWin32StartupIoSelection } from './native-win32-startup-io';
import type { NativeWin32StartupIoSelection, RetainedWin32StartupIoSelection,
  NativeWin32StartupIoEndpoints, NativeStartupInfoCallGrant } from './native-win32-startup-io';
import { retainNativeWin32StandardIoSelection } from './native-win32-standard-io';
import type { NativeWin32StandardIoSelection, RetainedWin32StandardIoSelection, NativeWin32StandardIoEndpoints,
  NativeStandardIoCallGrant, NativeStandardIoResult, NativeStandardIoCapabilityKind, NativeWin32HandleCapability } from './native-win32-standard-io';
import { retainNativeWin32SetEnvpSelection } from './native-win32-setenvp';
import type { NativeWin32SetEnvpSelection, RetainedWin32SetEnvpSelection, NativeWin32SetEnvpEndpoints, NativeSetEnvpCallGrant, NativeSetEnvpResult } from './native-win32-setenvp';
import { retainNativeWin32ArgvNlsSelection } from './native-win32-argv-nls';
import type { NativeWin32ArgvNlsSelection, RetainedWin32ArgvNlsSelection, NativeWin32ArgvNlsEndpoints,
  NativeArgvNlsCallGrant, NativeArgvNlsResult, NativeArgvImportKind } from './native-win32-argv-nls';

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
  win32HeapRequest?: Readonly<{heap:NativeWin32HeapCapability;flags:0|8;bytes:number}>;
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
export interface NativeCrtThreadDestructor { readonly address: '3067e143' | '20468043' | '100ae55a'; invoke(value: object | null): NativeValue<void>; }
export interface NativeCrtLocalAllocProcedure { readonly kind: 'alloc'; readonly name: 'FlsAlloc' | 'TlsAlloc' | 'TlsAllocFallback3067df49' | 'TlsAllocFallback20467e49'; invoke(callback: NativeCrtThreadDestructor): NativeValue<number>; }
export interface NativeCrtLocalGetProcedure { readonly kind: 'get'; readonly name: 'FlsGetValue' | 'TlsGetValue'; invoke(index: number): NativeValue<object | null>; }
export interface NativeCrtLocalSetProcedure { readonly kind: 'set'; readonly name: 'FlsSetValue' | 'TlsSetValue'; invoke(index: number, value: object | null): NativeValue<boolean>; }
export interface NativeCrtLocalFreeProcedure { readonly kind: 'free'; readonly name: 'FlsFree' | 'TlsFree'; invoke(index: number): NativeValue<boolean>; }
export type NativeCrtLocalProcedure = NativeCrtLocalAllocProcedure | NativeCrtLocalGetProcedure | NativeCrtLocalSetProcedure | NativeCrtLocalFreeProcedure;
export interface NativeCrtProcessorFeatureProcedure {
  readonly identity:object;readonly owner:object;readonly name:'IsProcessorFeaturePresent';
  invoke(feature:number):NativeValue<number>;
}
export type NativeCrtPlatformProcedure = NativeCrtPointerProcedure | NativeCrtSectionProcedure | NativeCrtLocalProcedure | NativeCrtProcessorFeatureProcedure;
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
  readonly processorFeatureProcedure?:boolean;
  /** Declared virtual processor result, never a host CPU measurement. */
  readonly floatingPointPrecisionErratum?:boolean;
  readonly fiberLocalStorage?: boolean;
  readonly processHeap?: boolean;
  readonly osVersion?: { readonly platform: number; readonly major: number; readonly minor: number; readonly build: number } | null;
  readonly processInputs?: NativeWin32ProcessInputSelection;
  readonly threadStack?: NativeX86ThreadStackSelection;
  readonly startupIo?: NativeWin32StartupIoSelection;
  readonly standardIo?: NativeWin32StandardIoSelection;
  readonly fileSystem?: NativeWin32FileSystemSelection;
  readonly argvNls?: NativeWin32ArgvNlsSelection;
  readonly setEnvp?: NativeWin32SetEnvpSelection;
  readonly entropy?: {
    systemTimeAsFileTime?(): NativeValue<{ low: number; high: number }>;
    currentProcessId?(): NativeValue<number>;
    currentThreadId?(): NativeValue<number>;
    tickCount?(): NativeValue<number>;
    performanceCounter?(): NativeValue<{ success: boolean; low?: number; high?: number }>;
  };
}
type RetainedCrtServices = Omit<NativeEngineCrtPlatformServices, 'tlsValues' | 'processInputs' | 'startupIo' | 'standardIo' | 'argvNls' | 'setEnvp'> & {
  readonly processInputs?: RetainedWin32ProcessInputSelection;
  readonly startupIo?: Readonly<RetainedWin32StartupIoSelection>;
  readonly standardIo?: RetainedWin32StandardIoSelection;
  readonly argvNls?: RetainedWin32ArgvNlsSelection;
  readonly setEnvp?: RetainedWin32SetEnvpSelection;
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
    fiberLocalStorage, processHeap, osVersion, entropy, processInputs, threadStack, startupIo, standardIo, fileSystem, argvNls, setEnvp, processorFeatureProcedure, floatingPointPrecisionErratum } = selected;
  if (typeof kernel32Available !== 'boolean' || (pointerCodec !== 'absent' && pointerCodec !== 'owned-bijection') ||
      [sectionSpinProcedure, fiberLocalStorage, processHeap, processorFeatureProcedure, floatingPointPrecisionErratum].some(value => value !== undefined && typeof value !== 'boolean')) {
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
  return { services: Object.freeze({ kernel32Available, pointerCodec, sectionSpinProcedure, processorFeatureProcedure, floatingPointPrecisionErratum,
    fiberLocalStorage, processHeap, osVersion: version, entropy: callbacks,
    processInputs: processInputs === undefined ? undefined : retainNativeWin32ProcessInputSelection(processInputs),
    threadStack: threadStack === undefined ? undefined : retainNativeX86ThreadStackSelection(threadStack),
    startupIo: startupIo === undefined ? undefined : retainNativeWin32StartupIoSelection(startupIo),
    standardIo: standardIo === undefined ? undefined : retainNativeWin32StandardIoSelection(standardIo),
    fileSystem: fileSystem === undefined ? undefined : retainNativeWin32FileSystemSelection(fileSystem),
    argvNls: argvNls === undefined ? undefined : retainNativeWin32ArgvNlsSelection(argvNls),
    setEnvp: setEnvp === undefined ? undefined : retainNativeWin32SetEnvpSelection(setEnvp) }), tls: Object.freeze(tls) };
}
interface ProcessBuffer {
  readonly kind: 'command-line-a' | 'environment-a' | 'environment-w';
  readonly backing: NativeMemoryBacking; readonly pointer: NativeBytePointer;
  readonly bytes: Uint8Array; readonly masks: Uint8Array; readonly view: DataView;
  phase: 'live' | 'released' | 'expired';
}
interface HeapAllocationViews {
  readonly backing: NativeMemoryBacking; readonly heap: NativeWin32HeapCapability;
  readonly owner: NativeModuleCrtOwner; readonly requestedBytes: number; readonly physicalCapacity: number;
  readonly bytes: Uint8Array; readonly masks: Uint8Array;
  readonly logical: NativeHeapObjectViews; readonly physical: NativeHeapObjectViews;
  readonly logicalBytes: Uint8Array; readonly logicalMasks: Uint8Array; readonly logicalView: DataView;
  readonly physicalBytes: Uint8Array; readonly physicalMasks: Uint8Array; readonly physicalView: DataView;
}
interface SetEnvpRelease {
  readonly allocation: HeapAllocationViews; readonly crt: NativeModuleCrtOwner;
  readonly heap: NativeWin32HeapCapability; readonly backing: NativeMemoryBacking;
}
interface WinHeap {
  readonly capability: NativeWin32HeapCapability;
  readonly options: 0 | 1;
  readonly allocations: Set<NativeMemoryBacking>;
  readonly gameOwner?: NativeModuleCrtOwner;
  destroyed: boolean;
}
interface PhysicalSection {
  readonly fields: NativeHeapObjectViews; readonly owner: object; readonly identity: object;
  readonly canonicalBacking: NativeMemoryBacking; readonly position: number;
  readonly bytes: Uint8Array; readonly masks: Uint8Array;
  readonly spinCount: 4000 | 1000 | null; depth: number; deleted: boolean;
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
const diagnosticWindows = new WeakMap<NativeRuntimeDiagnostics, ReadonlyMap<string, object>>();
const platformDiagnostics = new WeakMap<NativeRuntimePlatform, NativeRuntimeDiagnostics>();
export class NativeRuntimeDiagnostics implements NativeMessageDiagnosticPlatform {
  private readonly windows = new Map<string, object>();
  private readonly files = new Map<string, Uint8Array>();
  private readonly handles = new Map<object, { path: string; bytes: Uint8Array; closed: boolean }>();
  constructor(options: { windows?: ReadonlyMap<string, object>; files?: ReadonlyMap<string, Uint8Array> } = {}) {
    for (const [title, window] of options.windows ?? []) this.windows.set(title, window);
    diagnosticWindows.set(this, new Map(this.windows));
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
  readonly #guidTextPlatform?: NativeGuidTextPlatform;
  static canonicalGuidTextPlatform(platform:NativeRuntimePlatform):NativeValue<NativeGuidTextPlatform> {
    return platform.#guidTextPlatform?known(platform.#guidTextPlatform):unknown('Selected GUID text platform absent');
  }
  static diagnosticWindowForPlatform(platform: NativeRuntimePlatform, className: null, title: string): NativeValue<object | null> {
    const diagnostics = platformDiagnostics.get(platform), windows = diagnostics && diagnosticWindows.get(diagnostics);
    if (!windows || platform.diagnostics !== diagnostics || className !== null || title !== '[zSpy]') return unknown('Canonical diagnostic window profile and original query required');
    return known(windows.get(title) ?? null);
  }
  static ownsDiagnosticWindow(platform: NativeRuntimePlatform, window: object): boolean {
    const result = this.diagnosticWindowForPlatform(platform, null, '[zSpy]');
    return result.known && result.value !== null && result.value === window;
  }
  readonly diagnostics: NativeRuntimeDiagnostics;
  readonly #backing = new Map<object, BackingEntry>();
  readonly #releasedBackings = new WeakSet<NativeMemoryBacking>();
  readonly #heapAllocationViews = new WeakMap<NativeMemoryBacking, HeapAllocationViews>();
  readonly setEnvpEndpoints?: Readonly<NativeWin32SetEnvpEndpoints>;
  readonly #setEnvpEndpoints?: Readonly<NativeWin32SetEnvpEndpoints>;
  #setEnvpActiveCall: NativeSetEnvpCallGrant | null = null;
  readonly #setEnvpConsumed = new WeakSet<NativeSetEnvpCallGrant>();
  readonly #setEnvpNormal = new WeakMap<NativeSetEnvpCallGrant, NativeSetEnvpResult>();
  readonly #setEnvpAllocations = new WeakMap<NativeSetEnvpCallGrant, NativeMemoryBacking | null>();
  readonly #setEnvpReleases = new WeakMap<NativeSetEnvpCallGrant, SetEnvpRelease>();
  readonly #processBuffers = new Map<NativeMemoryBacking, ProcessBuffer>();
  readonly #processBases = new WeakMap<NativeBytePointer, ProcessBuffer>();
  readonly #gameImageMappings = new WeakMap<NativeMemoryBacking, Readonly<{
    owner: NativeModuleCrtOwner; baseAddress: number; bytes: Uint8Array; masks: Uint8Array; capacity: number;
  }>>();
  #commandLinePointer: NativeBytePointer | undefined;
  #nativeDirectionFlag: 0 | 1 | undefined;
  readonly processInputEndpoints?: Readonly<NativeWin32ProcessInputEndpoints>;
  readonly #processInputEndpoints?: Readonly<NativeWin32ProcessInputEndpoints>;
  readonly startupIoEndpoints?: Readonly<NativeWin32StartupIoEndpoints>;
  readonly #startupIoEndpoints?: Readonly<NativeWin32StartupIoEndpoints>;
  #startupInfoActiveCall: NativeStartupInfoCallGrant | null = null;
  readonly #startupInfoNormalReturns = new WeakSet<NativeStartupInfoCallGrant>();
  readonly heapAllocEndpoint?: (call: NativeHeapAllocCallGrant) => NativeValue<NativeMemoryBacking | null>;
  readonly #heapAllocEndpoint?: (call: NativeHeapAllocCallGrant) => NativeValue<NativeMemoryBacking | null>;
  #heapAllocActiveCall: NativeHeapAllocCallGrant | null = null;
  readonly #heapAllocConsumed = new WeakSet<NativeHeapAllocCallGrant>();
  readonly #heapAllocEffects = new WeakMap<NativeHeapAllocCallGrant, NativeMemoryBacking | null>();
  readonly #heapAllocNormalReturns = new WeakMap<NativeHeapAllocCallGrant, NativeMemoryBacking | null>();
  readonly standardIoEndpoints?: Readonly<NativeWin32StandardIoEndpoints>;
  readonly #standardIoEndpoints?: Readonly<NativeWin32StandardIoEndpoints>;
  readonly argvNlsEndpoints?: Readonly<NativeWin32ArgvNlsEndpoints>;
  readonly #argvNlsEndpoints?: Readonly<NativeWin32ArgvNlsEndpoints>;
  #argvNlsActiveCall: NativeArgvNlsCallGrant | null = null;
  readonly #argvNlsConsumed = new WeakSet<NativeArgvNlsCallGrant>();
  readonly #argvNlsNormal = new WeakMap<NativeArgvNlsCallGrant, NativeArgvNlsResult>();
  readonly #argvHeapEffects = new WeakMap<NativeArgvNlsCallGrant, NativeMemoryBacking | null>();
  readonly #argvProcedures = new Map<NativeArgvImportKind, object>();
  #standardIoActiveCall: NativeStandardIoCallGrant | null = null;
  readonly #standardIoConsumed = new WeakSet<NativeStandardIoCallGrant>();
  readonly #standardIoNormalReturns = new WeakMap<NativeStandardIoCallGrant, NativeStandardIoResult>();
  readonly #standardIoEffects = new WeakMap<NativeStandardIoCallGrant, Readonly<{ sectionRegistered: boolean }>>();
  readonly #standardHandles = new Map<object, Readonly<{ capability: NativeWin32HandleCapability; slot: number }>>();
  readonly #fileSystem?: NativeWin32FileSystem;
  readonly #fileOpenConsumed = new WeakSet<object>();
  readonly #fileCloseConsumed = new WeakSet<object>();
  #requestedHandleCount: number | undefined;
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
  readonly #processorFeatureProcedure:NativeCrtProcessorFeatureProcedure;
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
    engineCrtServices?: NativeEngineCrtPlatformServices; guidTextPlatform?: NativeGuidTextPlatform } = {}) {
    const guid=options.guidTextPlatform;
    if(guid!==undefined) {
      if(typeof guid.multiByteToWideChar!=='function'||typeof guid.iidFromString!=='function')throw new Error('Actual GUID text platform callbacks required');
      const convert=guid.multiByteToWideChar.bind(guid),parse=guid.iidFromString.bind(guid);
      this.#guidTextPlatform=Object.freeze({multiByteToWideChar:convert,iidFromString:parse});
    }
    this.diagnostics = options.diagnostics ?? new NativeRuntimeDiagnostics();
    platformDiagnostics.set(this, this.diagnostics);
    Object.freeze(this.#win32LastError);
    this.maximumAllocationBytes = options.maximumAllocationBytes ?? 64 * 1024 * 1024;
    this.maximumOwnedBytes = options.maximumOwnedBytes ?? 256 * 1024 * 1024;
    const crt = retainCrtServices(options.engineCrtServices);
    this.#crtServices = crt.services;
    this.#fileSystem = crt.services?.fileSystem === undefined ? undefined : new NativeWin32FileSystem(this, crt.services.fileSystem);
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
    this.#startupIoEndpoints = crt.services?.startupIo?.startupInfoA === undefined ? undefined : Object.freeze({
      getStartupInfoA: (call: NativeStartupInfoCallGrant) => this.#getStartupInfoA(call),
    });
    this.startupIoEndpoints = this.#startupIoEndpoints;
    Object.defineProperty(this, 'startupIoEndpoints', { value: this.#startupIoEndpoints, writable: false, configurable: false });
    this.#heapAllocEndpoint = crt.services === undefined ? undefined : Object.freeze((call: NativeHeapAllocCallGrant) => this.#getHeapAllocForCall(call));
    this.heapAllocEndpoint = this.#heapAllocEndpoint;
    Object.defineProperty(this, 'heapAllocEndpoint', { value: this.#heapAllocEndpoint, writable: false, configurable: false });
    this.#standardIoEndpoints = crt.services?.standardIo === undefined ? undefined : Object.freeze({
      invoke: (call: NativeStandardIoCallGrant) => this.#getStandardIoForCall(call),
    });
    this.standardIoEndpoints = this.#standardIoEndpoints;
    Object.defineProperty(this, 'standardIoEndpoints', { value: this.#standardIoEndpoints, writable: false, configurable: false });
    this.#argvNlsEndpoints = crt.services?.argvNls === undefined ? undefined : Object.freeze({
      invoke: (call: NativeArgvNlsCallGrant) => this.#invokeArgvNls(call),
    });
    this.argvNlsEndpoints = this.#argvNlsEndpoints;
    Object.defineProperty(this, 'argvNlsEndpoints', { value: this.#argvNlsEndpoints, writable: false, configurable: false });
    if (this.#argvNlsEndpoints) for (const name of ['HeapAlloc', 'InterlockedIncrement', 'MultiByteToWideChar', 'LCMapStringW', 'GetModuleFileNameA'] as const) {
      this.#argvProcedures.set(name, Object.freeze({ identity: Object.freeze({}), name }));
    }
    this.#setEnvpEndpoints = crt.services?.setEnvp === undefined ? undefined : Object.freeze({
      invoke: (call: NativeSetEnvpCallGrant) => this.#invokeSetEnvp(call),
    });
    this.setEnvpEndpoints = this.#setEnvpEndpoints;
    Object.defineProperty(this, 'setEnvpEndpoints', { value: this.#setEnvpEndpoints, writable: false, configurable: false });
    for (const [index, value] of crt.tls) { this.#crtTlsValues.set(index, value); this.#tlsIndexes.add(index); }
    const owner = Object.freeze({});
    this.#kernel32 = Object.freeze({ identity: Object.freeze({}), owner, name: 'KERNEL32.DLL' });
    for (let slot = 0; slot < (crt.services?.standardIo?.standardHandles.length ?? 0); slot++) {
      if (crt.services!.standardIo!.standardHandles[slot]!.result !== 'valid') continue;
      const capability = Object.freeze({ identity: Object.freeze({}), owner });
      this.#standardHandles.set(capability, Object.freeze({ capability, slot }));
    }
    this.#processorFeatureProcedure=Object.freeze({identity:Object.freeze({}),owner,name:'IsProcessorFeaturePresent',invoke:(feature:number):NativeValue<number>=>{
      const active=NativeRuntimePlatform.requireActivePlatform(this);if(!active.known)return active;
      if(feature!==0)return unknown('Unowned virtual processor feature '+feature);
      const value=this.#crtServices?.floatingPointPrecisionErratum;
      return value===undefined?unknown('Explicit virtual floating-point precision erratum selection required'):known(value?1:0);
    }});
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
      // Preserve the established lower endpoint dispatch. The source-guarded
      // standard-I/O bridge separately calls the private core with its grant.
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
  static threadStackSelectionForPlatform(platform: NativeRuntimePlatform): NativeValue<Readonly<NativeX86ThreadStackSelection>> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    const selection = platform.#crtServices?.threadStack;
    return selection ? known(selection) : unknown('Explicit same-logical-thread opaque-relative x86 stack selection required');
  }
  static threadStackLifetimeHasEnded(platform: NativeRuntimePlatform, selection: Readonly<NativeX86ThreadStackSelection>): boolean {
    return retainedRuntimePlatforms.has(platform) && platform.#crtServices?.threadStack === selection &&
      (platform.#shutdownPhase === 'disposed' || platform.#shutdownPhase === 'blocked');
  }
  static startupIoSelectionForPlatform(platform: NativeRuntimePlatform): NativeValue<Readonly<RetainedWin32StartupIoSelection>> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    const selection = platform.#crtServices?.startupIo;
    return selection ? known(selection) : unknown('Explicit retained startup writer selection required');
  }
  static canonicalStartupIoEndpointsForPlatform(platform: NativeRuntimePlatform,
    endpoints: NativeWin32StartupIoEndpoints): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return endpoints && endpoints === platform.#startupIoEndpoints && endpoints === platform.startupIoEndpoints
      ? known(undefined) : unknown('Actual immutable same-platform startup writer endpoints required');
  }
  /** A grant by itself never permits a store: this exact private endpoint must
   * currently be executing it on the actual active platform. */
  static canonicalStartupInfoInvocationForPlatform(platform: NativeRuntimePlatform,
    call: NativeStartupInfoCallGrant): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#startupInfoActiveCall === call && platform.#startupIoEndpoints !== undefined
      ? known(undefined) : unknown('Actual current Runtime GetStartupInfoA invocation required');
  }
  static canonicalStartupInfoNormalReturnForPlatform(platform: NativeRuntimePlatform,
    call: NativeStartupInfoCallGrant): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#startupInfoNormalReturns.has(call) ? known(undefined)
      : unknown('Actual completed Runtime GetStartupInfoA normal writer required');
  }
  #getStartupInfoA(call: NativeStartupInfoCallGrant): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(this); if (!active.known) return active;
    const selection = this.#crtServices?.startupIo?.startupInfoA;
    if (!selection || !this.#startupIoEndpoints) return unknown('Actual selected GetStartupInfoA writer required');
    if (this.#startupInfoActiveCall) return unknown('Reentrant Runtime startup writer cannot enter another call');
    this.#startupInfoActiveCall = call;
    try {
      const shared=NativeSharedCrtOwner.canonicalStartupCallForPlatform(this,call);
      const admitted = NativeX86ThreadStack.canonicalStartupInfoCallForPlatform(this, call); if (!admitted.known&&!shared.known) return admitted;
      for (const write of selection.writes) {
        if(shared.known){
          const current=NativeSharedCrtOwner.canonicalStartupCallForPlatform(this,call);if(!current.known)return current;
          if(write.offset+write.width>68)return unknown('Contained SharedBase STARTUPINFOA write required');
          NativeHeapObjectViews.prototype.writeUnsigned.call(current.value,write.offset,write.value,write.width);
          for(let byte=0;byte<write.width;byte++)current.value.knownMask[write.offset+byte]=(write.knownMask>>>(byte*8))&255;
        }else{
          const stored = NativeX86ThreadStack.writeStartupInfoForCall(this, call, write.offset, write.width, write.value, write.knownMask);if (!stored.known) return stored;
        }
      }
      if (selection.lastError !== undefined) NativeHeapObjectViews.prototype.writeUnsigned.call(this.#win32LastError, 0, selection.lastError);
      if (selection.outcome === 'unknown') return unknown(selection.reason ?? 'Declared GetStartupInfoA unknown after retained writes');
      const completed = shared.known?NativeSharedCrtOwner.canonicalStartupCallForPlatform(this,call):NativeX86ThreadStack.canonicalStartupInfoCallForPlatform(this, call); if (!completed.known) return completed;
      this.#startupInfoNormalReturns.add(call); return known(undefined);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
    finally { this.#startupInfoActiveCall = null; }
  }
  /** New selected startup graphs require the actual constructor-admitted
   * platform before shutdown begins. Existing Shared views separately remain
   * available during callback drain through their scoped lifetime API. */
  static requireActivePlatform(platform: NativeRuntimePlatform): NativeValue<void> {
    if (!retainedRuntimePlatforms.has(platform) || platform.#shutdownPhase !== 'active') {
      return unknown('Actual constructed active RuntimePlatform required for selected startup');
    }
    return known(undefined);
  }
  static canonicalHeapAllocEndpointForPlatform(platform: NativeRuntimePlatform,
    endpoint: (call: NativeHeapAllocCallGrant) => NativeValue<NativeMemoryBacking | null>): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return endpoint && endpoint === platform.#heapAllocEndpoint && endpoint === platform.heapAllocEndpoint
      ? known(undefined) : unknown('Actual constructor-retained selected HeapAlloc endpoint required');
  }
  static canonicalHeapAllocInvocationForPlatform(platform: NativeRuntimePlatform, call: NativeHeapAllocCallGrant): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return !!call && platform.#heapAllocActiveCall !== null && platform.#heapAllocActiveCall === call && !!platform.#heapAllocEndpoint ? known(undefined)
      : unknown('Actual currently executing private HeapAlloc grant required');
  }
  static canonicalHeapAllocNormalReturnForPlatform(platform: NativeRuntimePlatform, call: NativeHeapAllocCallGrant): NativeValue<NativeMemoryBacking | null> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#heapAllocNormalReturns.has(call) ? known(platform.#heapAllocNormalReturns.get(call)!)
      : unknown('Actual normal HeapAlloc endpoint return required');
  }
  /** Diagnostic effect lookup does not authorize memory access or RET. */
  static heapAllocEffectForPlatform(platform: NativeRuntimePlatform, call: NativeHeapAllocCallGrant): NativeValue<NativeMemoryBacking | null> {
    return retainedRuntimePlatforms.has(platform) && platform.#heapAllocEffects.has(call) ? known(platform.#heapAllocEffects.get(call)!)
      : unknown('No actual retained HeapAlloc effect for this private call');
  }
  static canonicalWin32HeapForOwner(platform: NativeRuntimePlatform, heap: NativeWin32HeapCapability, owner: object): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    if (!heap || typeof heap !== 'object') return unknown('Actual Runtime heap capability required');
    const retained = platform.#winHeaps.get(heap.identity);
    return retained?.capability === heap && !retained.destroyed && heap.owner === owner ? known(undefined)
      : unknown('Actual live same-owner Runtime HeapCreate capability required');
  }
  static performHeapAllocForPhysicalCall(platform: NativeRuntimePlatform, call: NativeHeapAllocCallGrant,
    heap: NativeWin32HeapCapability, flags: 8, bytes: number): NativeValue<NativeMemoryBacking | null> {
    const active = NativeRuntimePlatform.canonicalHeapAllocInvocationForPlatform(platform, call); if (!active.known) return active;
    const args = NativeX86ThreadStack.heapAllocArgumentsForPlatform(platform, call); if (!args.known) return args;
    if (args.value.heap !== heap || args.value.flags !== flags || args.value.bytes !== bytes || platform.#heapAllocConsumed.has(call)) {
      return unknown('Actual current private HeapAlloc arguments and one allocation effect required');
    }
    const current = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(args.value.crt, platform);
    if (!current.known || current.value !== heap) return unknown(current.known ? 'Current Game heap differs from actual call arguments' : current.reason);
    platform.#heapAllocConsumed.add(call);
    const result = platform.#win32HeapAlloc(heap, flags, bytes);
    if (result.known) platform.#heapAllocEffects.set(call, result.value);
    return result;
  }
  #getHeapAllocForCall(call: NativeHeapAllocCallGrant): NativeValue<NativeMemoryBacking | null> {
    const active = NativeRuntimePlatform.requireActivePlatform(this); if (!active.known) return active;
    if (!this.#heapAllocEndpoint || this.#heapAllocActiveCall !== null) return unknown('Actual non-reentrant selected HeapAlloc endpoint required');
    this.#heapAllocActiveCall = call;
    try {
      const args = NativeX86ThreadStack.heapAllocArgumentsForPlatform(this, call); if (!args.known) return args;
      const result = NativeModuleCrtOwner.heapAllocForPhysicalCall(args.value.crt, this, call); if (!result.known) return result;
      const after = NativeX86ThreadStack.heapAllocArgumentsForPlatform(this, call); if (!after.known) return after;
      this.#heapAllocNormalReturns.set(call, result.value); return result;
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
    finally { this.#heapAllocActiveCall = null; }
  }
  /** Private fresh policy/endpoint identity. No old Runtime gains a service later. */
  static setEnvpSelectionForPlatform(platform: NativeRuntimePlatform): NativeValue<RetainedWin32SetEnvpSelection> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#crtServices?.setEnvp ? known(platform.#crtServices.setEnvp) : unknown('Explicit fresh environment heap ABI selection required');
  }
  static canonicalSetEnvpEndpointsForPlatform(platform: NativeRuntimePlatform, endpoints: NativeWin32SetEnvpEndpoints): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return endpoints && endpoints === platform.#setEnvpEndpoints && endpoints === platform.setEnvpEndpoints
      ? known(undefined) : unknown('Actual immutable Runtime environment endpoints required');
  }
  static canonicalSetEnvpInvocationForPlatform(platform: NativeRuntimePlatform, call: NativeSetEnvpCallGrant): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return !!call && platform.#setEnvpActiveCall === call && !!platform.#setEnvpEndpoints ? known(undefined)
      : unknown('Actual active private environment import invocation required');
  }
  static canonicalSetEnvpNormalReturnForPlatform(platform: NativeRuntimePlatform, call: NativeSetEnvpCallGrant): NativeValue<NativeSetEnvpResult> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#setEnvpNormal.has(call) ? known(platform.#setEnvpNormal.get(call)!) : unknown('Actual normal environment import return required');
  }
  /** Descriptive lower effects are never sufficient for a normal RET. */
  static setEnvpEffectsForPlatform(platform: NativeRuntimePlatform, call: NativeSetEnvpCallGrant): NativeValue<Readonly<{ allocated: boolean; released: boolean }>> {
    return retainedRuntimePlatforms.has(platform) && platform.#setEnvpConsumed.has(call)
      ? known(Object.freeze({ allocated: platform.#setEnvpAllocations.has(call) && platform.#setEnvpAllocations.get(call) !== null,
        released: platform.#setEnvpReleases.has(call) })) : unknown('No retained environment import effect');
  }
  #proveHeapAllocationViews(record: HeapAllocationViews, retired = false): void {
    const backing = record.backing, entry = this.#backing.get(backing.identity), proof = entry?.nativeGeometry;
    if (this.#heapAllocationViews.get(backing) !== record || !entry || entry.backing !== backing || entry.kind !== 'win32-heap' ||
        proof?.alignment !== 'win32-heap-eight' || proof.bytes !== record.bytes || proof.masks !== record.masks ||
        proof.capacity !== record.physicalCapacity || backing.bytes !== record.bytes || backing.knownMask !== record.masks ||
        backing.bytes.length !== record.physicalCapacity || backing.knownMask.length !== record.physicalCapacity ||
        record.requestedBytes < 0 || record.requestedBytes > record.physicalCapacity ||
        record.logical.bytes !== record.logicalBytes || record.logical.knownMask !== record.logicalMasks || record.logical.view !== record.logicalView ||
        record.physical.bytes !== record.physicalBytes || record.physical.knownMask !== record.physicalMasks || record.physical.view !== record.physicalView ||
        (retired ? !this.#releasedBackings.has(backing) : backing.freed || this.#releasedBackings.has(backing))) {
      throw new Error('Actual retained logical/physical Game allocation storage and lifetime required');
    }
    for (const [fields, length] of [[record.logical, record.requestedBytes], [record.physical, record.physicalCapacity]] as const) {
      requirePhysicalNativeViews(fields);
      if (fields.backing !== backing || fields.bytes.length !== length || fields.knownMask.length !== length ||
          fields.bytes.buffer !== record.bytes.buffer || fields.bytes.byteOffset !== record.bytes.byteOffset ||
          fields.knownMask.buffer !== record.masks.buffer || fields.knownMask.byteOffset !== record.masks.byteOffset ||
          fields.view.buffer !== fields.bytes.buffer || fields.view.byteOffset !== fields.bytes.byteOffset || fields.view.byteLength !== length ||
          Object.getOwnPropertyDescriptor(fields, 'pointerIdentity')!.value !== backing.identity ||
          Object.getOwnPropertyDescriptor(fields, 'pointerBegin')!.value !== 0) throw new Error('Current exact logical/physical allocation aliases differ');
    }
  }
  static canonicalGameHeapAllocationViewsForPlatform(platform: NativeRuntimePlatform, owner: NativeModuleCrtOwner,
    backing: NativeMemoryBacking): NativeValue<Readonly<{ logical: NativeHeapObjectViews; physical: NativeHeapObjectViews; requestedBytes: number; physicalCapacity: number }>> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    try {
      const record = platform.#heapAllocationViews.get(backing); if (!record || record.owner !== owner) return unknown('Actual fresh-policy Game allocation record required');
      platform.#proveHeapAllocationViews(record);
      const pointer = Object.freeze({ fields: record.physical, offset: 0 });
      const heap = NativeModuleCrtOwner.canonicalGameHeapForAllocation(owner, platform, pointer); if (!heap.known) return heap;
      if (heap.value !== record.heap) return unknown('Current allocation heap differs from retained capacity owner');
      const span = platform.#canonicalGameHeapSpan(heap.value, pointer, record.physicalCapacity); if (!span.known) return span;
      return known(Object.freeze({ logical: record.logical, physical: record.physical,
        requestedBytes: record.requestedBytes, physicalCapacity: record.physicalCapacity }));
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  /** Readonly structural retirement proof. It never permits a byte access. */
  static canonicalSetEnvpReleasedAllocationForCall(platform: NativeRuntimePlatform, call: NativeSetEnvpCallGrant,
    owner: NativeModuleCrtOwner, heap: NativeWin32HeapCapability, backing: NativeMemoryBacking): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    try {
      const receipt = platform.#setEnvpReleases.get(call);
      if (!receipt || receipt.crt !== owner || receipt.heap !== heap || receipt.backing !== backing) return unknown('Exact private source HeapFree release receipt required');
      platform.#proveHeapAllocationViews(receipt.allocation, true);
      const current = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(owner, platform);
      return current.known && current.value === heap ? known(undefined) : unknown(current.known ? 'Current release heap changed' : current.reason);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  static performSetEnvpAllocationForCall(platform: NativeRuntimePlatform, call: NativeSetEnvpCallGrant,
    owner: NativeModuleCrtOwner, heap: NativeWin32HeapCapability, bytes: number): NativeValue<NativeMemoryBacking | null> {
    const active = NativeRuntimePlatform.canonicalSetEnvpInvocationForPlatform(platform, call); if (!active.known) return active;
    const input = NativeX86ThreadStack.setEnvpArgumentsForPlatform(platform, call); if (!input.known) return input;
    if (input.value.site !== '20477ce8' || input.value.crt !== owner || input.value.heap !== heap || input.value.flags !== 8 ||
        input.value.bytes !== bytes || platform.#setEnvpConsumed.has(call)) return unknown('Actual current source calloc allocation grant required');
    platform.#setEnvpConsumed.add(call);
    const result = platform.#win32HeapAlloc(heap, 8, bytes);
    if (result.known) platform.#setEnvpAllocations.set(call, result.value);
    return result;
  }
  static performSetEnvpReleaseForCall(platform: NativeRuntimePlatform, call: NativeSetEnvpCallGrant,
    owner: NativeModuleCrtOwner, heap: NativeWin32HeapCapability, backing: NativeMemoryBacking): NativeValue<boolean> {
    const active = NativeRuntimePlatform.canonicalSetEnvpInvocationForPlatform(platform, call); if (!active.known) return active;
    const input = NativeX86ThreadStack.setEnvpArgumentsForPlatform(platform, call); if (!input.known) return input;
    if (input.value.site !== '20467cd2' || input.value.crt !== owner || input.value.heap !== heap || input.value.flags !== 0 ||
        input.value.backing !== backing || platform.#setEnvpConsumed.has(call)) return unknown('Actual current source HeapFree grant required');
    const allocation = platform.#heapAllocationViews.get(backing);
    if (!allocation || allocation.owner !== owner || allocation.heap !== heap) return unknown('Actual retained Game allocation release required');
    try { platform.#proveHeapAllocationViews(allocation); } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
    platform.#setEnvpConsumed.add(call);
    const policy = platform.#crtServices!.setEnvp!.heapFree;
    platform.#processLastError(policy.lastError);
    if (policy.outcome === 'unknown') return unknown('Declared virtual HeapFree outcome is unknown');
    if (policy.outcome === 'false') return known(false);
    const retained = platform.#winHeaps.get(heap.identity), entry = platform.#backing.get(backing.identity);
    if (!retained || retained.capability !== heap || retained.destroyed || !retained.allocations.has(backing) ||
        !entry || entry.backing !== backing || entry.kind !== 'win32-heap' || platform.#releasedBackings.has(backing) || backing.freed) {
      return unknown('Actual live same-heap source HeapFree allocation required');
    }
    // Keep the private lower effect before writing the exposed descriptive
    // marker. If that write is interrupted, release and pending CALL remain;
    // the normal-return map is still absent and no source cleanup occurs.
    platform.#releasedBackings.add(backing);
    platform.bytesOwned -= allocation.physicalCapacity;
    platform.#setEnvpReleases.set(call, Object.freeze({ allocation, crt: owner, heap, backing }));
    backing.freed = true;
    return known(true);
  }
  #invokeSetEnvp(call: NativeSetEnvpCallGrant): NativeValue<NativeSetEnvpResult> {
    const active = NativeRuntimePlatform.requireActivePlatform(this); if (!active.known) return active;
    if (!call || !this.#setEnvpEndpoints || this.#setEnvpActiveCall || this.#setEnvpConsumed.has(call)) return unknown('Fresh non-reentrant environment import required');
    this.#setEnvpActiveCall = call;
    try {
      const input = NativeX86ThreadStack.setEnvpArgumentsForPlatform(this, call); if (!input.known) return input;
      const result = input.value.site === '20477ce8'
        ? NativeModuleCrtOwner.heapAllocForSetEnvpCall(input.value.crt, this, call)
        : NativeModuleCrtOwner.heapFreeForSetEnvpCall(input.value.crt, this, call);
      if (!result.known) return result;
      // The graph's phase-specific proof accepts an exact retired release;
      // ordinary live access remains permanently rejected at this point.
      const after = NativeX86ThreadStack.setEnvpArgumentsForPlatform(this, call); if (!after.known) return after;
      this.#setEnvpNormal.set(call, result.value); return result;
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
    finally { this.#setEnvpActiveCall = null; }
  }
  static canonicalProcessInputEndpointsForPlatform(platform: NativeRuntimePlatform,
    endpoints: NativeWin32ProcessInputEndpoints): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return endpoints && endpoints === platform.#processInputEndpoints && endpoints === platform.processInputEndpoints
      ? known(undefined) : unknown('Actual immutable same-platform process-input endpoints required');
  }
  static standardIoSelectionForPlatform(platform: NativeRuntimePlatform): NativeValue<RetainedWin32StandardIoSelection> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#crtServices?.standardIo ? known(platform.#crtServices.standardIo) : unknown('Explicit retained standard-I/O selection required');
  }
  static createSharedFileForPlatform(platform: NativeRuntimePlatform, call: object): NativeValue<NativeWin32CreateFileResult> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    const proof = NativeSharedCrtOwner.fileOpenArgumentsForPlatform(platform, call); if (!proof.known) return proof;
    if (!platform.#fileSystem) return unknown('Explicit owned virtual filesystem required by CreateFileA');
    if (platform.#fileOpenConsumed.has(call)) return unknown('Actual fresh file-open invocation required');
    platform.#fileOpenConsumed.add(call);
    const result = NativeWin32FileSystem.prototype.open.call(platform.#fileSystem, proof.value);
    if (result.known) platform.#processLastError(result.value.lastError);
    return result;
  }
  static ownsFileHandle(platform: NativeRuntimePlatform, handle: object): boolean {
    return NativeRuntimePlatform.requireActivePlatform(platform).known && !!platform.#fileSystem && NativeWin32FileSystem.prototype.owns.call(platform.#fileSystem, handle);
  }
  static recognizesFileHandle(platform: NativeRuntimePlatform, handle: object): boolean {
    return NativeRuntimePlatform.requireActivePlatform(platform).known && !!platform.#fileSystem && NativeWin32FileSystem.prototype.recognizes.call(platform.#fileSystem, handle);
  }
  static closeSharedFileForPlatform(platform: NativeRuntimePlatform, call: object): NativeValue<number> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    const proof = NativeSharedCrtOwner.fileCloseArgumentsForPlatform(platform, call); if (!proof.known) return proof;
    if (!platform.#fileSystem || platform.#fileCloseConsumed.has(call)) return unknown('Actual fresh owned file-close invocation required');
    platform.#fileCloseConsumed.add(call);
    return NativeWin32FileSystem.prototype.close.call(platform.#fileSystem, proof.value);
  }
  static fileTypeForPlatform(platform: NativeRuntimePlatform, handle: object): NativeValue<number> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#fileSystem ? NativeWin32FileSystem.prototype.fileType.call(platform.#fileSystem, handle) : unknown('Explicit owned virtual filesystem required by GetFileType');
  }
  fileSystemSnapshot() { return this.#fileSystem ? NativeWin32FileSystem.prototype.snapshot.call(this.#fileSystem) : null; }
  static canonicalStandardIoEndpointsForPlatform(platform: NativeRuntimePlatform,
    endpoints: NativeWin32StandardIoEndpoints): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return endpoints && endpoints === platform.#standardIoEndpoints && endpoints === platform.standardIoEndpoints
      ? known(undefined) : unknown('Actual immutable same-platform standard-I/O endpoints required');
  }
  static canonicalStandardIoInvocationForPlatform(platform: NativeRuntimePlatform, call: NativeStandardIoCallGrant): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return !!call && platform.#standardIoActiveCall !== null && platform.#standardIoActiveCall === call && !!platform.#standardIoEndpoints
      ? known(undefined) : unknown('Actual current private standard-I/O invocation required');
  }
  static canonicalStandardIoNormalReturnForPlatform(platform: NativeRuntimePlatform,
    call: NativeStandardIoCallGrant): NativeValue<NativeStandardIoResult> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#standardIoNormalReturns.has(call) ? known(platform.#standardIoNormalReturns.get(call)!)
      : unknown('Actual normal standard-I/O endpoint result required');
  }
  static standardIoEffectForPlatform(platform: NativeRuntimePlatform,
    call: NativeStandardIoCallGrant): NativeValue<Readonly<{ sectionRegistered: boolean }>> {
    return retainedRuntimePlatforms.has(platform) && platform.#standardIoEffects.has(call) ? known(platform.#standardIoEffects.get(call)!)
      : unknown('No retained effect for this actual private call');
  }
  static standardIoCapabilityForPlatform(platform: NativeRuntimePlatform, value: object): NativeValue<NativeStandardIoCapabilityKind> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    if (platform.#standardHandles.get(value)?.capability === value) return known('handle');
    if (value === platform.tlsProcedures.get) return known('tls-get');
    if (value === platform.#flsProcedures.get) return known('fls-get');
    if (value === platform.#pointerDecode) return known('decode');
    if (value === platform.#sectionProcedure) return known('section');
    if (platform.#decodedPointers.has(value)) return known('encoded');
    return unknown('Actual private live Runtime handle/procedure/encoded capability required');
  }
  static standardIoTlsProcedureForPlatform(platform: NativeRuntimePlatform): NativeValue<object> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#crtServices ? known(platform.tlsProcedures.get) : unknown('Actual retained Runtime TLS getter required');
  }
  #getStandardIoForCall(call: NativeStandardIoCallGrant): NativeValue<NativeStandardIoResult> {
    const active = NativeRuntimePlatform.requireActivePlatform(this); if (!active.known) return active;
    if (!call || !this.#standardIoEndpoints || this.#standardIoActiveCall !== null || this.#standardIoConsumed.has(call)) {
      return unknown('Actual fresh non-reentrant standard-I/O call required');
    }
    this.#standardIoActiveCall = call;
    try {
      const shared=NativeSharedCrtOwner.standardIoArgumentsForPlatform(this,call);
      if(shared.known){
        this.#standardIoConsumed.add(call);const input=shared.value,selection=this.#crtServices!.standardIo!;let result:NativeStandardIoResult;
        if(input.kind==='GetStdHandle'){
          const slot=selection.standardHandles.findIndex(entry=>(entry.id>>>0)===input.scalar);if(slot<0)return unknown('Declared standard handle ID required');
          const entry=selection.standardHandles[slot]!;this.#processLastError(entry.getStdHandleLastError);
          if(entry.result==='unknown')return unknown('Declared standard-handle result is unknown');
          result=entry.result==='null'?null:entry.result==='invalid'?0xffffffff:[...this.#standardHandles.values()].find(record=>record.slot===slot)!.capability;
        }else if(input.kind==='GetFileType'){
          const record=input.object?this.#standardHandles.get(input.object):undefined;if(!record||record.capability!==input.object)return unknown('Actual same-platform HANDLE required');
          const entry=selection.standardHandles[record.slot]!;this.#processLastError(entry.fileTypeLastError);result=entry.fileType;
        }else{
          this.#requestedHandleCount=input.scalar;this.#processLastError(selection.setHandleCount.lastError);result=selection.setHandleCount.result;
        }
        const after=NativeSharedCrtOwner.standardIoArgumentsForPlatform(this,call);if(!after.known)return after;
        this.#standardIoNormalReturns.set(call,result);return known(result);
      }
      const args = NativeX86ThreadStack.standardIoArgumentsForPlatform(this, call); if (!args.known) return args;
      this.#standardIoConsumed.add(call);
      const input = args.value, selection = this.#crtServices!.standardIo!;
      let result: NativeValue<NativeStandardIoResult>;
      switch (input.kind) {
        case 'GetStdHandle': {
          const slot = selection.standardHandles.findIndex(entry => (entry.id >>> 0) === input.scalar);
          if (slot < 0) return unknown('Actual declared standard-handle ID required');
          const entry = selection.standardHandles[slot]!; this.#processLastError(entry.getStdHandleLastError);
          if (entry.result === 'unknown') return unknown('Declared standard-handle result is unknown');
          result = known(entry.result === 'null' ? null : entry.result === 'invalid' ? 0xffffffff
            : [...this.#standardHandles.values()].find(record => record.slot === slot)!.capability); break;
        }
        case 'GetFileType': {
          const record = input.object ? this.#standardHandles.get(input.object) : undefined;
          if (!record || record.capability !== input.object) return unknown('Actual live virtual handle required by GetFileType');
          const entry = selection.standardHandles[record.slot]!; this.#processLastError(entry.fileTypeLastError);
          result = known(entry.fileType); break;
        }
        case 'TlsGetValue':
          if (input.procedure !== this.tlsProcedures.get) return unknown('Actual indirect Runtime TlsGetValue procedure required');
          result = this.#tlsGetValue(input.scalar!); break;
        case 'FlsGetValue':
          if (input.procedure !== this.#flsProcedures.get) return unknown('Actual direct cached Runtime FlsGetValue procedure required');
          result = this.#flsGetValue(input.scalar!); break;
        case 'DecodePointer':
          if (input.procedure !== this.#pointerDecode || !input.object || !this.#decodedPointers.has(input.object)) {
            return unknown('Actual current DecodePointer procedure and encoded capability required');
          }
          result = known(this.#decodedPointers.get(input.object)!); break;
        case 'InitializeCriticalSectionAndSpinCount': {
          if (input.procedure !== this.#sectionProcedure || !input.section || !input.sectionFields || input.scalar !== 4000) {
            return unknown('Actual selected spin procedure/current section and spin4000 required');
          }
          const span = NativeRuntimePlatform.canonicalGameHeapDestination(this, input.crt, input.section, 24); if (!span.known) return span;
          const initialized = this.#initializePhysicalSection(input.sectionFields, input.crt.identity, 4000, false);
          if (!initialized.known) return initialized;
          this.#standardIoEffects.set(call, Object.freeze({ sectionRegistered: true }));
          const writes = NativeX86ThreadStack.invalidateStandardIoSectionForCall(this, call); if (!writes.known) return writes;
          result = known(1); break;
        }
        case 'SetHandleCount':
          this.#requestedHandleCount = input.scalar!; this.#processLastError(selection.setHandleCount.lastError);
          result = known(selection.setHandleCount.result); break;
        default: return unknown('Actual admitted standard-I/O import kind required');
      }
      if (!result.known) return result;
      const after = NativeX86ThreadStack.standardIoArgumentsForPlatform(this, call); if (!after.known) return after;
      this.#standardIoNormalReturns.set(call, result.value); return result;
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
    finally { this.#standardIoActiveCall = null; }
  }
  static argvNlsSelectionForPlatform(platform: NativeRuntimePlatform): NativeValue<RetainedWin32ArgvNlsSelection> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#crtServices?.argvNls ? known(platform.#crtServices.argvNls) : unknown('Explicit retained virtual argv/NLS selection required');
  }
  static canonicalArgvNlsEndpointsForPlatform(platform: NativeRuntimePlatform, endpoints: NativeWin32ArgvNlsEndpoints): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return endpoints && endpoints === platform.#argvNlsEndpoints && endpoints === platform.argvNlsEndpoints ? known(undefined)
      : unknown('Actual immutable Runtime argv/NLS endpoints required');
  }
  static argvProcedureForPlatform(platform: NativeRuntimePlatform, name: NativeArgvImportKind): NativeValue<object> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    const value = platform.#argvProcedures.get(name); return value ? known(value) : unknown('Actual declared argv import procedure required');
  }
  static argvCapabilityForPlatform(platform: NativeRuntimePlatform, value: object): NativeValue<NativeArgvImportKind> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    for (const [name, capability] of platform.#argvProcedures) if (capability === value) return known(name);
    return unknown('Actual Runtime argv procedure capability required');
  }
  static canonicalArgvNlsInvocationForPlatform(platform: NativeRuntimePlatform, call: NativeArgvNlsCallGrant): NativeValue<void> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#argvNlsActiveCall === call && !!platform.#argvNlsEndpoints ? known(undefined) : unknown('Actual active private argv import invocation required');
  }
  static canonicalArgvNlsNormalReturnForPlatform(platform: NativeRuntimePlatform, call: NativeArgvNlsCallGrant): NativeValue<NativeArgvNlsResult> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#argvNlsNormal.has(call) ? known(platform.#argvNlsNormal.get(call)!) : unknown('Actual normal argv import result required');
  }
  static performArgvHeapAllocForCall(platform: NativeRuntimePlatform, call: NativeArgvNlsCallGrant,
    heap: NativeWin32HeapCapability, bytes: number): NativeValue<NativeMemoryBacking | null> {
    const active = NativeRuntimePlatform.canonicalArgvNlsInvocationForPlatform(platform, call); if (!active.known) return active;
    const current = NativeX86ThreadStack.argvArgumentsForPlatform(platform, call); if (!current.known) return current;
    const args = current.value.arguments;
    if (current.value.kind !== 'HeapAlloc' || args[0]?.kind !== 'object' || args[0].value !== heap ||
        args[1]?.kind !== 'scalar' || args[1].value !== 0 || args[2]?.kind !== 'scalar' || args[2].value !== bytes || platform.#argvHeapEffects.has(call)) {
      return unknown('Actual current malloc HeapAlloc flags0 and one lower effect required');
    }
    const result = platform.#win32HeapAlloc(heap, 0, bytes);
    if (result.known) platform.#argvHeapEffects.set(call, result.value); return result;
  }
  #invokeArgvNls(call: NativeArgvNlsCallGrant): NativeValue<NativeArgvNlsResult> {
    const active = NativeRuntimePlatform.requireActivePlatform(this); if (!active.known) return active;
    if (!call || !this.#argvNlsEndpoints || this.#argvNlsActiveCall || this.#argvNlsConsumed.has(call)) return unknown('Fresh non-reentrant argv/NLS call required');
    this.#argvNlsActiveCall = call;
    try {
      const engine=NativeX86ThreadStack.engineArgvNlsArgumentsForPlatform(this,call);
      if(engine.known){
        this.#argvNlsConsumed.add(call);const selected=this.#crtServices!.argvNls!;
        const input=engine.value;let scalar:number;
        if(input.kind==='LCMapStringW'){
          if(input.scalar!==0||input.flags!==0x100||input.count!==1||!input.input||input.fields||NativeHeapObjectViews.prototype.readUnsigned.call(input.input,0,2)!==0)throw new Error('Actual Engine Unicode mapping probe required');scalar=1;
        }else if(input.kind==='MultiByteToWideChar'){
          if(!input.input||(input.site==='3067c64a'?input.count<1||input.count>256||input.fields!==null:input.count!==256)||![1,9].includes(input.flags)||input.procedure!==this.#argvProcedures.get('MultiByteToWideChar'))throw new Error('Actual Engine conversion query ABI required');requirePhysicalNativeViews(input.input);
          if(input.scalar!==selected.codePage)scalar=0;else{for(let index=0;index<input.count;index++){const byte=NativeHeapObjectViews.prototype.readUnsigned.call(input.input,index,1),code=selected.unicode[byte];if(!Number.isInteger(code))throw new Error('Engine conversion byte outside declared NLS repertoire');if(input.fields){requirePhysicalNativeViews(input.fields);const write=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform(this,call,index*2,code!,2);if(!write.known)throw new Error(write.reason);}}scalar=input.count;}
        }else if(input.kind==='GetStringTypeW'){
          if(input.scalar!==1||![1,256].includes(input.count)||!input.input||!input.fields)throw new Error('Actual Engine CT_CTYPE1 ABI required');requirePhysicalNativeViews(input.input);requirePhysicalNativeViews(input.fields);
          const reverse=new Map(selected.reverse);for(let index=0;index<input.count;index++){const code=NativeHeapObjectViews.prototype.readUnsigned.call(input.input,index*2,2),byte=reverse.get(code);if(byte===undefined)throw new Error('Engine classification outside declared NLS repertoire');const write=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform(this,call,index*2,selected.ctype1[byte]!,2);if(!write.known)throw new Error(write.reason);}scalar=1;
        }else if(input.kind==='GetACP')scalar=selected.codePage;
        else if(input.kind==='IsValidCodePage')scalar=input.scalar===selected.codePage?1:0;
        else if(input.scalar!==selected.codePage)scalar=0;
        else{const fields=input.fields;if(!fields)throw new Error('Actual Engine CPInfo output required');requirePhysicalNativeViews(fields);const write=(offset:number,value:number,width:1|4)=>{const result=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform(this,call,offset,value,width);if(!result.known)throw new Error(result.reason);};write(0,1,4);write(4,63,1);write(5,0,1);for(let offset=6;offset<18;offset++)write(offset,0,1);scalar=1;}
        const result: NativeArgvNlsResult=Object.freeze({kind:'scalar',value:scalar >>> 0});this.#processLastError(selected.lastError?.[input.kind]);
        const after=NativeX86ThreadStack.engineArgvNlsArgumentsForPlatform(this,call);if(!after.known)return after;
        this.#argvNlsNormal.set(call,result);return known(result);
      }
      const shared=NativeSharedCrtOwner.nlsArgumentsForPlatform(this,call);
      if(shared.known){
        this.#argvNlsConsumed.add(call);const input=shared.value,selection=this.#crtServices!.argvNls!;
        let value:number;
        if(input.kind==='GetModuleFileNameA'){
          if(input.scalar!==0||input.count!==260||!input.fields||input.procedure!==this.#argvProcedures.get('GetModuleFileNameA'))throw new Error('Actual SharedBase module filename arguments required');requirePhysicalNativeViews(input.fields);for(let index=0;index<selection.moduleName.length;index++)NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,index,selection.moduleName[index]!,1);NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,selection.moduleName.length,0,1);value=selection.moduleName.length;
        }else if(input.kind==='GetACP')value=selection.codePage;
        else if(input.kind==='IsValidCodePage')value=input.scalar===selection.codePage?1:0;
        else if(input.kind==='GetCPInfo'){
          if(input.scalar!==selection.codePage)value=0;
          else {
            const fields=input.fields;if(!fields)throw new Error('Actual SharedBase CPInfo output required');requirePhysicalNativeViews(fields);
            NativeHeapObjectViews.prototype.writeUnsigned.call(fields,0,1,4);
            NativeHeapObjectViews.prototype.writeUnsigned.call(fields,4,63,1);NativeHeapObjectViews.prototype.writeUnsigned.call(fields,5,0,1);
            for(let offset=6;offset<18;offset++)NativeHeapObjectViews.prototype.writeUnsigned.call(fields,offset,0,1);value=1;
          }
        }else if(input.kind==='GetStringTypeW'){
          if(input.scalar!==1||![1,256].includes(input.count)||!input.input||!input.fields)throw new Error('Actual SharedBase CT_CTYPE1 ABI required');
          requirePhysicalNativeViews(input.input);requirePhysicalNativeViews(input.fields);
          const reverse=new Map(selection.reverse);
          for(let index=0;index<input.count;index++){
            const code=NativeHeapObjectViews.prototype.readUnsigned.call(input.input,index*2,2),byte=reverse.get(code);
            if(byte===undefined)throw new Error('Classification code unit outside declared NLS repertoire');
            NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,index*2,selection.ctype1[byte]!,2);
          }value=1;
        }else if(input.kind==='LCMapStringW'){
          if(![0,0x409].includes(input.scalar)||![0x100,0x200].includes(input.flags)||!input.input||![1,256].includes(input.count)||input.procedure!==null&&input.procedure!==this.#argvProcedures.get('LCMapStringW'))throw new Error('Actual SharedBase declared case mapping ABI required');
          requirePhysicalNativeViews(input.input);if(input.fields)requirePhysicalNativeViews(input.fields);const reverse=new Map(selection.reverse),table=input.flags===0x100?selection.lower:selection.upper;
          for(let index=0;index<input.count;index++){const code=NativeHeapObjectViews.prototype.readUnsigned.call(input.input,index*2,2),byte=reverse.get(code);if(byte===undefined)throw new Error('Mapping code unit outside declared repertoire');if(input.fields)NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,index*2,table[byte]!,2);}value=input.count;
        }else if(input.kind==='WideCharToMultiByte'){
          if(input.scalar!==selection.codePage||input.flags!==0||!input.input||!input.fields||input.count!==256)throw new Error('Actual SharedBase narrowing ABI required');
          requirePhysicalNativeViews(input.input);requirePhysicalNativeViews(input.fields);const reverse=new Map(selection.reverse);
          for(let index=0;index<input.count;index++){const code=NativeHeapObjectViews.prototype.readUnsigned.call(input.input,index*2,2),byte=reverse.get(code);if(byte===undefined)throw new Error('Mapping result outside declared single-byte repertoire');NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,index,byte,1);}value=input.count;
        }else {
          if(input.kind!=='MultiByteToWideChar'||input.scalar!==selection.codePage||input.flags!==1||input.procedure!==this.#argvProcedures.get('MultiByteToWideChar')||!input.input||input.count!==256)throw new Error('Actual SharedBase conversion ABI required');
          requirePhysicalNativeViews(input.input);
          if(input.fields)requirePhysicalNativeViews(input.fields);
          for(let index=0;index<input.count;index++){const byte=NativeHeapObjectViews.prototype.readUnsigned.call(input.input,index,1),code=selection.unicode[byte];if(code===undefined)throw new Error('Byte outside declared NLS repertoire');if(input.fields)NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,index*2,code,2);}
          value=input.count;
        }
        const result:NativeArgvNlsResult=Object.freeze({kind:'scalar',value});
        this.#processLastError(selection.lastError?.[input.kind]);
        const after=NativeSharedCrtOwner.nlsArgumentsForPlatform(this,call);if(!after.known)return after;
        this.#argvNlsNormal.set(call,result);return known(result);
      }
      const admitted = NativeX86ThreadStack.argvArgumentsForPlatform(this, call); if (!admitted.known) return admitted;
      const input = admitted.value, selected = this.#crtServices!.argvNls!;
      this.#argvNlsConsumed.add(call);
      const scalar = (index: number): number => { const arg = input.arguments[index]; if (arg?.kind !== 'scalar') throw new Error('Current scalar argv import argument required'); return arg.value; };
      const memory = (index: number) => { const arg = input.arguments[index]; if (arg?.kind !== 'memory') throw new Error('Current owned argv import memory argument required'); return arg; };
      const read = (index: number, offset: number, width: 1 | 2 | 4): number => {
        const result = NativeX86ThreadStack.readArgvMemoryForCall(this, call, index, offset, width); if (!result.known) throw new Error(result.reason); return result.value;
      };
      const write = (index: number, offset: number, width: 1 | 2 | 4, value: number): void => {
        const result = NativeX86ThreadStack.writeArgvMemoryForCall(this, call, index, offset, width, value); if (!result.known) throw new Error(result.reason);
      };
      const signedCount = (index: number): number => { const value = scalar(index) | 0; if (value <= 0) throw new Error('This declared NLS ABI requires positive explicit source counts'); return value; };
      const scalarResult = (value: number): NativeArgvNlsResult => Object.freeze({ kind: 'scalar', value: value >>> 0 });
      const reverse = new Map(selected.reverse), byteFor = (value: number): number => { const byte = reverse.get(value); if (byte === undefined) throw new Error('UTF16 value is outside the declared closed CP1252 repertoire'); return byte; };
      let result: NativeArgvNlsResult;
      switch (input.kind) {
        case 'GetModuleFileNameA': {
          if (scalar(0) !== 0 || scalar(2) !== 260) throw new Error('Selected current-module NULL/count260 contract required');
          const dst = memory(1), image = NativeModuleCrtOwner.canonicalImageForOwner(input.crt, 'moduleName');
          if (!image.known || dst.fields !== image.value || dst.offset !== 0) throw new Error('Actual261-byte canonical module-name alias required');
          for (let index = 0; index < selected.moduleName.length; index++) write(1, index, 1, selected.moduleName[index]!);
          write(1, selected.moduleName.length, 1, 0); result = scalarResult(selected.moduleName.length); break;
        }
        case 'GetACP': result = scalarResult(selected.codePage); break;
        case 'IsValidCodePage': result = scalarResult(scalar(0) === selected.codePage ? 1 : 0); break;
        case 'GetCPInfo': {
          if (scalar(0) !== selected.codePage) { result = scalarResult(0); break; }
          write(1, 0, 4, 1); write(1, 4, 1, 63); write(1, 5, 1, 0);
          for (let index = 6; index < 18; index++) write(1, index, 1, 0);
          result = scalarResult(1); break;
        }
        case 'GetLastError': result = scalarResult(NativeHeapObjectViews.prototype.readUnsigned.call(this.#win32LastError, 0)); break;
        case 'SetLastError': NativeHeapObjectViews.prototype.writeUnsigned.call(this.#win32LastError, 0, scalar(0)); result = Object.freeze({ kind: 'void' }); break;
        case 'TlsGetValue': {
          if (scalar(0) !== this.#readGameScalar(input.crt, 'crtTlsIndexes', 4)) throw new Error('Actual current cached-getter TLS index required');
          const got = this.#tlsGetValue(scalar(0)); if (!got.known) return got; result = Object.freeze({ kind: 'object', value: got.value }); break;
        }
        case 'FlsGetValue': {
          if (input.procedure !== this.#flsProcedures.get || scalar(0) !== this.#readGameScalar(input.crt, 'crtTlsIndexes', 0)) throw new Error('Actual cached FLS capability/current PTD index required');
          const got = this.#flsGetValue(scalar(0)); if (!got.known) return got;
          if (got.value !== null) { const ptd = NativeModuleCrtOwner.canonicalGamePtdForPlatform(input.crt, this, got.value); if (!ptd.known) return ptd; }
          result = Object.freeze({ kind: 'object', value: got.value }); break;
        }
        case 'InterlockedIncrement': case 'InterlockedDecrement': {
          if (input.kind === 'InterlockedIncrement' && input.procedure !== this.#argvProcedures.get('InterlockedIncrement')) throw new Error('Actual current indirect InterlockedIncrement procedure required');
          const before = read(0, 0, 4), value = (before + (input.kind === 'InterlockedIncrement' ? 1 : -1)) >>> 0;
          write(0, 0, 4, value); result = scalarResult(value); break;
        }
        case 'HeapAlloc': {
          const got = NativeModuleCrtOwner.heapAllocForArgvCall(input.crt, this, call); if (!got.known) return got;
          result = Object.freeze({ kind: 'object', value: got.value }); break;
        }
        case 'EnterCriticalSection': case 'LeaveCriticalSection': {
          const pointer = memory(0), lock = NativeModuleCrtOwner.canonicalGameLock13ForPlatform(input.crt, this, pointer.fields, pointer.offset);
          if (!lock.known) return lock;
          const section = this.#physicalSection(lock.value, input.crt.identity);
          if (input.kind === 'EnterCriticalSection') section.depth++;
          else { if (!section.depth) throw new Error('Actual acquired lock13 required before leave'); section.depth--; }
          result = Object.freeze({ kind: 'void' }); break;
        }
        case 'MultiByteToWideChar': {
          if (input.procedure !== this.#argvProcedures.get('MultiByteToWideChar') || scalar(0) !== selected.codePage || ![1, 9].includes(scalar(1))) throw new Error('Declared CP1252 MB_PRECOMPOSED/optional error-check flags required');
          const count = signedCount(3), capacity = scalar(5), values: number[] = [];
          for (let index = 0; index < count; index++) values.push(selected.unicode[read(2, index, 1)]!);
          if (capacity === 0) { if (scalar(4) !== 0) throw new Error('Query destination must be NULL'); result = scalarResult(count); break; }
          if (capacity < count) { this.#processLastError(122); result = scalarResult(0); break; }
          for (let index = 0; index < count; index++) write(4, index * 2, 2, values[index]!);
          result = scalarResult(count); break;
        }
        case 'GetStringTypeW': {
          if (scalar(0) !== 1) throw new Error('Declared CT_CTYPE1 contract required'); const count = signedCount(2);
          for (let index = 0; index < count; index++) write(3, index * 2, 2, selected.ctype1[byteFor(read(1, index * 2, 2))]!);
          result = scalarResult(1); break;
        }
        case 'LCMapStringW': {
          if (input.procedure && input.procedure !== this.#argvProcedures.get('LCMapStringW')) throw new Error('Actual indirect LCMapStringW procedure required');
          if (![0, 0x409].includes(scalar(0)) || ![0x100, 0x200].includes(scalar(1))) throw new Error('Declared virtual default/English case mapping contract required');
          const count = signedCount(3), capacity = scalar(5), values: number[] = [], table = scalar(1) === 0x100 ? selected.lower : selected.upper;
          for (let index = 0; index < count; index++) values.push(table[byteFor(read(2, index * 2, 2))]!);
          if (capacity === 0) { if (scalar(4) !== 0) throw new Error('Query destination must be NULL'); result = scalarResult(count); break; }
          if (capacity < count) { this.#processLastError(122); result = scalarResult(0); break; }
          for (let index = 0; index < count; index++) write(4, index * 2, 2, values[index]!);
          result = scalarResult(count); break;
        }
        case 'WideCharToMultiByte': {
          if (scalar(0) !== selected.codePage || scalar(1) !== 0 || scalar(6) !== 0 || scalar(7) !== 0) throw new Error('Declared explicit CP1252 flags0/NULL default-char and usage contracts required');
          const count = signedCount(3), capacity = scalar(5), values: number[] = [];
          for (let index = 0; index < count; index++) values.push(byteFor(read(2, index * 2, 2)));
          if (capacity === 0) { if (scalar(4) !== 0) throw new Error('Query destination must be NULL'); result = scalarResult(count); break; }
          if (capacity < count) { this.#processLastError(122); result = scalarResult(0); break; }
          for (let index = 0; index < count; index++) write(4, index, 1, values[index]!); result = scalarResult(count); break;
        }
        default: return unknown('Original argv import is outside the declared virtual policy');
      }
      this.#processLastError(selected.lastError?.[input.kind]);
      const after = NativeX86ThreadStack.argvArgumentsForPlatform(this, call); if (!after.known) return after;
      this.#argvNlsNormal.set(call, result); return known(result);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
    finally { this.#argvNlsActiveCall = null; }
  }
  #readGameScalar(crt: NativeModuleCrtOwner, label: string, offset: number): number {
    const access = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this, crt, label, offset, 4); if (!access.known) throw new Error(access.reason);
    const image = NativeModuleCrtOwner.canonicalImageForOwner(crt, label); if (!image.known) throw new Error(image.reason);
    return NativeHeapObjectViews.prototype.readUnsigned.call(image.value, offset);
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
  static canonicalOwnedWin32HeapAllocationSpan(platform:NativeRuntimePlatform,heap:NativeWin32HeapCapability,owner:object,pointer:NativeBytePointer,bytes:number):NativeValue<void> {
    const live=NativeRuntimePlatform.canonicalWin32HeapForOwner(platform,heap,owner);if(!live.known)return live;
    const record=platform.#winHeaps.get(heap.identity);
    if(!record?.allocations.has(pointer.fields.backing))return unknown('Actual retained allocation in this Win32 heap required');
    return NativeRuntimePlatform.canonicalNativePointerAccessForPlatform(platform,pointer,0,bytes);
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
  static canonicalGameHeapDestination(platform: NativeRuntimePlatform, owner: NativeModuleCrtOwner,
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
        const shared=NativeSharedCrtOwner.canonicalEnvironmentDestinationForPlatform(this,output,outputBytes);
        const engine=NativeEngineCrtEnvironment.canonicalDestinationForPlatform(this,output,outputBytes);
        if(!shared.known&&!engine.known){
          const heap = NativeModuleCrtOwner.canonicalGameHeapForPlatform(this, output); if (!heap.known) return heap;
          const destination = this.#canonicalGameHeapSpan(heap.value, output, outputBytes); if (!destination.known) return destination;
        }
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
  static heapAllocForSharedInitializer(platform:NativeRuntimePlatform,heap:NativeWin32HeapCapability,owner:object,size:number):NativeValue<NativeMemoryBacking|null> {
    const active=NativeRuntimePlatform.canonicalWin32HeapForOwner(platform,heap,owner);if(!active.known)return active;
    if(!Number.isInteger(size)||size<1||size>0xffffffe0)return unknown('Original normalized CRT malloc HeapAlloc size required');
    const previous=new Set(Array.from(platform.#backing.values(),entry=>entry.backing));
    const result=platform.win32HeapAlloc(heap,0,size);if(!result.known||!result.value)return result;
    const fields=new NativeHeapObjectViews(result.value),span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(platform,heap,owner,{fields,offset:0},size);if(!span.known)return span;
    const request=platform.#backing.get(result.value.identity)?.win32HeapRequest;if(request?.heap!==heap||request.flags!==0||request.bytes!==size)return unknown('Actual CRT HeapAlloc flags and request receipt required');
    return previous.has(result.value)?unknown('Fresh descriptor from the current HeapAlloc invocation required'):result;
  }
  static virtualAllocForSharedInitializer(platform:NativeRuntimePlatform,size:number):NativeValue<NativeMemoryRegion|null> {
    const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;
    if(size!==0x700000&&size!==0x400000&&size!==0xc2000&&size!==0x102000&&size!==0xc0000&&size!==0x70000)return unknown('Original SharedBase pool virtual reservation size required');
    const previous=new Set(Array.from(platform.#backing.values(),entry=>entry.backing));
    const result=platform.virtualAlloc(size,0x103000,4);if(!result.known||!result.value)return result;
    const proof=NativeRuntimePlatform.canonicalVirtualRegionForPlatform(platform,result.value,size);if(!proof.known)return proof;
    return previous.has(result.value)?unknown('Fresh region from the current pool VirtualAlloc invocation required'):result;
  }
  static canonicalVirtualRegionForPlatform(platform:NativeRuntimePlatform,region:NativeMemoryRegion,size:number):NativeValue<void> {
    const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;
    const entry=region?platform.#backing.get(region.identity):undefined,geometry=entry?.nativeGeometry;
    return entry?.backing===region&&entry.kind==='virtual'&&!platform.#releasedBackings.has(region)&&!region.freed&&
      geometry?.alignment==='virtual-page'&&geometry.bytes===region.bytes&&geometry.masks===region.knownMask&&
      geometry.capacity===size&&region.bytes.length===size&&region.knownMask.length===size
      ?known(undefined):unknown('Actual live same-platform VirtualAlloc region required');
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
    const game = NativeModuleCrtOwner.canonicalGameHeapOwnerIdentityForPlatform(this, owner);
    this.#winHeaps.set(capability.identity, { capability, options, allocations: new Set(), destroyed: false,
      gameOwner: game.known ? game.value : undefined });
    return known(capability);
  }
  win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0 | 8, bytes: number): NativeValue<NativeMemoryBacking | null> {
    return this.#win32HeapAlloc(heap, flags, bytes);
  }
  #win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0 | 8, bytes: number): NativeValue<NativeMemoryBacking | null> {
    const retained = this.#winHeaps.get(heap.identity);
    if (!retained || retained.capability !== heap || retained.destroyed || (flags !== 0 && flags !== 8)) {
      return unknown('Actual live selected HeapAlloc handle and flags required');
    }
    if (!Number.isInteger(bytes) || bytes < 0 || bytes > 0xffffffff) return unknown('Original HeapAlloc uint32 request required');
    const rounded = !!this.#crtServices?.setEnvp && !!retained.gameOwner;
    const capacity = rounded ? Math.ceil(bytes / 8) * 8 : bytes;
    if (capacity > 0xffffffff) return unknown('Fresh virtual physical heap capacity exceeds uint32');
    const allocated = this.#allocate(capacity, 'win32-heap');
    if (allocated.known && allocated.value) {
      retained.allocations.add(allocated.value);
      this.#backing.get(allocated.value.identity)!.win32HeapRequest=Object.freeze({heap,flags,bytes});
      // Omitted policy retains exact capacity. A fresh selected Game heap
      // declares rounded physical capacity, independently of the logical request.
      // Padding is retained uninitialized with mask0, not host observations.
      this.#backing.get(allocated.value.identity)!.nativeGeometry = Object.freeze({ alignment: 'win32-heap-eight',
        bytes: allocated.value.bytes, masks: allocated.value.knownMask, capacity: allocated.value.bytes.length });
      if (flags === 8) { allocated.value.bytes.fill(0, 0, bytes); allocated.value.knownMask.fill(255, 0, bytes); }
      if (rounded) {
        const backing = allocated.value;
        for (const key of ['identity', 'bytes', 'knownMask'] as const) Object.defineProperty(backing, key, {
          value: backing[key], writable: false, configurable: false, enumerable: true });
        Object.defineProperty(backing, 'freed', { value: false, writable: true, configurable: false, enumerable: true });
        const logical = new NativeHeapObjectViews(backing, 0, bytes);
        const physical = bytes === capacity ? logical : new NativeHeapObjectViews(backing, 0, capacity);
        for (const fields of [logical, physical]) { Object.freeze(fields.view); Object.freeze(fields); }
        this.#heapAllocationViews.set(backing, Object.freeze({ backing, heap, owner: retained.gameOwner!,
          requestedBytes: bytes, physicalCapacity: capacity, bytes: backing.bytes, masks: backing.knownMask,
          logical, physical, logicalBytes: logical.bytes, logicalMasks: logical.knownMask, logicalView: logical.view,
          physicalBytes: physical.bytes, physicalMasks: physical.knownMask, physicalView: physical.view }));
      }
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
  static canonicalNativePointerModulo4ForPlatform(platform:NativeRuntimePlatform,pointer:NativeBytePointer):NativeValue<number> {
    const access=NativeRuntimePlatform.canonicalNativePointerAccessForPlatform(platform,pointer,0,0);if(!access.known)return access;
    const geometry=platform.#resolveNativePointer(pointer);return geometry.known?known(geometry.value.modulo4):geometry;
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
  /** Explicit virtual HeapReAlloc profile: relocate, preserve physical bytes
   * and opaque pointer sidecars, and retain unknown extension bytes. */
  win32HeapReAlloc(heap: NativeWin32HeapCapability, flags: 0, pointer: NativeBytePointer,
    bytes: number, profile: 'move-preserve-unknown-extension'): NativeValue<NativeMemoryBacking | null> {
    if (profile !== 'move-preserve-unknown-extension' || flags !== 0 ||
        !Number.isInteger(bytes) || bytes <= 0 || bytes > 0xffffffff)
      return unknown('Explicit virtual HeapReAlloc profile and positive uint32 request required');
    const retained = this.#winHeaps.get(heap.identity);
    const geometry = this.#resolveNativePointer(pointer);
    if (!retained || retained.capability !== heap || retained.destroyed || !geometry.known)
      return unknown('Actual live HeapReAlloc heap and retained pointer required');
    const old = geometry.value.canonicalBacking, entry = this.#backing.get(old.identity);
    if (!entry || entry.backing !== old || entry.kind !== 'win32-heap' ||
        !retained.allocations.has(old) || old.freed || this.#releasedBackings.has(old) ||
        geometry.value.offset !== 0 || geometry.value.allocationBegin !== 0)
      return unknown('HeapReAlloc requires this heapâ€™s live allocation base');
    const allocated = this.#win32HeapAlloc(heap, 0, bytes);
    if (!allocated.known || allocated.value === null) return allocated;
    const moved = allocated.value;
    new NativeHeapObjectViews(moved).copyAllocationBytesFrom(new NativeHeapObjectViews(old),
      Math.min(old.bytes.length, bytes));
    // Once allocation and copying succeed, the selected operation owns release;
    // an overridable public HeapFree method cannot intercept that transition.
    this.#releasedBackings.add(old); old.freed = true; this.bytesOwned -= old.bytes.length;
    return known(moved);
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
  tlsGetValue(index: number): NativeValue<object | null> { return this.#tlsGetValue(index); }
  #tlsGetValue(index: number): NativeValue<object | null> {
    if (!this.#crtServices || !Number.isInteger(index) || index < 0 || index > 0xffffffff) return unknown('Actual owned CRT TLS registry and uint32 index required');
    // The explicitly selected lower TLS endpoint clears LastError on success.
    // An unallocated scalar index takes its owned invalid-index error branch.
    NativeHeapObjectViews.prototype.writeUnsigned.call(this.#win32LastError, 0, this.#tlsIndexes.has(index) ? 0 : 87);
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
    // Retain the actual callback. SharedBase requires its canonical owner's
    // privately minted source-admitted destructor, not an address assertion.
    if (!this.#crtServices?.fiberLocalStorage || !(['3067e143', '20468043'].includes(callback.address) || (callback.address === '100ae55a' && NativeSharedCrtOwner.canonicalThreadDestructorForPlatform(this,callback)))) return unknown('Actual selected FLS allocator/destructor required');
    if (this.#nextFlsIndex >= 0xffffffff) return known(0xffffffff);
    const index = this.#nextFlsIndex++; this.#flsIndexes.set(index, { callback, value: null }); return known(index);
  }
  private flsGetValue(index: number): NativeValue<object | null> { return this.#flsGetValue(index); }
  #flsGetValue(index: number): NativeValue<object | null> { return this.#crtServices?.fiberLocalStorage ? known(this.#flsIndexes.get(index)?.value ?? null) : unknown('Actual selected FLS getter required'); }
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
  readonly #sharedCounterUsed=new WeakSet<object>();
  readonly #sharedCounterNormal=new WeakMap<object,Readonly<{value:number;before:number;after:number}>>();
  static invokeSharedInterlockedCounter(platform:NativeRuntimePlatform,call:object):NativeValue<Readonly<{value:number;before:number;after:number}>>{
    const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;const admitted=NativeSharedCrtOwner.interlockedArgumentsForPlatform(platform,call);if(!admitted.known)return admitted;if(!platform.#crtServices||platform.#sharedCounterUsed.has(call))return unknown('Actual unused selected SharedBase interlocked call required');
    try{platform.canonicalFields(admitted.value.fields,4);const before=NativeHeapObjectViews.prototype.readUnsigned.call(admitted.value.fields,0);if(before!==admitted.value.before)throw new Error('Actual retained SharedBase counter input required');platform.#sharedCounterUsed.add(call);const after=(before+admitted.value.delta)>>>0;NativeHeapObjectViews.prototype.writeUnsigned.call(admitted.value.fields,0,after);const result=Object.freeze({value:after|0,before,after});platform.#sharedCounterNormal.set(call,result);return known(result);}catch(error){return unknown(error instanceof Error?error.message:String(error));}
  }
  static canonicalSharedInterlockedReturn(platform:NativeRuntimePlatform,call:object):NativeValue<Readonly<{value:number;before:number;after:number}>>{
    const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;const admitted=NativeSharedCrtOwner.interlockedArgumentsForPlatform(platform,call);if(!admitted.known)return admitted;const result=platform.#sharedCounterNormal.get(call);return result?known(result):unknown('Actual SharedBase interlocked normal return required');
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
  getWin32ModuleHandle(name: 'KERNEL32.DLL' | 'kernel32.dll' | 'KERNEL32'): NativeValue<NativeWin32ModuleCapability | null> {
    if (!this.#crtServices || (name !== 'KERNEL32.DLL' && name !== 'kernel32.dll' && name !== 'KERNEL32')) return unknown('Actual owned CRT Win32 module registry required');
    return known(this.#crtServices.kernel32Available ? this.#kernel32 : null);
  }
  static canonicalWin32ModuleForPlatform(platform: NativeRuntimePlatform, module: object): NativeValue<NativeWin32ModuleCapability> {
    const active = NativeRuntimePlatform.requireActivePlatform(platform); if (!active.known) return active;
    return platform.#crtServices?.kernel32Available && module === platform.#kernel32
      ? known(platform.#kernel32) : unknown('Actual same-platform Win32 module required');
  }
  getWin32Procedure(module: NativeWin32ModuleCapability, name: 'EncodePointer' | 'DecodePointer'): NativeValue<NativeCrtPointerProcedure | null>;
  getWin32Procedure(module:NativeWin32ModuleCapability,name:'IsProcessorFeaturePresent'):NativeValue<NativeCrtProcessorFeatureProcedure|null>;
  getWin32Procedure(module: NativeWin32ModuleCapability, name: 'InitializeCriticalSectionAndSpinCount'): NativeValue<NativeCrtSectionProcedure | null>;
  getWin32Procedure(module: NativeWin32ModuleCapability, name: 'FlsAlloc' | 'FlsGetValue' | 'FlsSetValue' | 'FlsFree'): NativeValue<NativeCrtLocalProcedure | null>;
  getWin32Procedure(module: NativeWin32ModuleCapability, name: string): NativeValue<NativeCrtPlatformProcedure | null> {
    if (!this.#crtServices || module !== this.#kernel32 || !this.#crtServices.kernel32Available) return unknown('Actual owned CRT Win32 module capability required');
    if (name === 'EncodePointer') return known(this.#crtServices.pointerCodec === 'owned-bijection' ? this.#pointerEncode : null);
    if (name === 'DecodePointer') return known(this.#crtServices.pointerCodec === 'owned-bijection' ? this.#pointerDecode : null);
    if(name==='IsProcessorFeaturePresent'){const available=this.#crtServices.processorFeatureProcedure;return available===undefined?unknown('Explicit selected processor-feature export availability required'):known(available?this.#processorFeatureProcedure:null);}
    if (name === 'InitializeCriticalSectionAndSpinCount') return known(this.#crtServices.sectionSpinProcedure === false ? null : this.#sectionProcedure);
    const key = ({ FlsAlloc: 'alloc', FlsGetValue: 'get', FlsSetValue: 'set', FlsFree: 'free' } as const)[name as 'FlsAlloc'];
    if (key) return known(this.#crtServices.fiberLocalStorage ? this.#flsProcedures[key] : null);
    return unknown('Admitted selected CRT Win32 procedure name required');
  }
  static canonicalPointerCodecForPlatform(platform:NativeRuntimePlatform,procedure:object,name:'EncodePointer'|'DecodePointer'):NativeValue<NativeCrtPointerProcedure>{
    const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;
    const expected=name==='EncodePointer'?platform.#pointerEncode:platform.#pointerDecode;
    return platform.#crtServices?.pointerCodec==='owned-bijection'&&procedure===expected?known(expected):unknown('Actual same-platform pointer codec required');
  }
  static canonicalProcessorFeatureProcedureForPlatform(platform:NativeRuntimePlatform,procedure:object):NativeValue<NativeCrtProcessorFeatureProcedure>{
    const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;
    return platform.#crtServices?.processorFeatureProcedure===true&&procedure===platform.#processorFeatureProcedure?known(platform.#processorFeatureProcedure):unknown('Actual same-platform processor-feature procedure required');
  }
  /** Lower Win32 endpoint. The CRT owner performs its source resolver/cache. */
  initializePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object, spinCount: 4000): NativeValue<boolean> {
    if (spinCount !== 4000) return unknown('Original physical section spin count4000 required');
    return this.#initializePhysicalSection(fields, owner, spinCount);
  }
  initializePhysicalMemoryHeapCriticalSection(fields: NativeHeapObjectViews, owner: object, spinCount: 1000): NativeValue<boolean> {
    if(spinCount!==1000)return unknown('Original MemoryAdmin section spin count1000 required');
    return this.#initializePhysicalSection(fields,owner,spinCount);
  }
  initializePhysicalCriticalSectionWithoutSpin(fields: NativeHeapObjectViews, owner: object): NativeValue<void> {
    const result = this.#initializePhysicalSection(fields, owner, null);
    return result.known ? known(undefined) : result;
  }
  #initializePhysicalSection(fields: NativeHeapObjectViews, owner: object, spinCount: 4000 | 1000 | null, opaqueWrites = true): NativeValue<boolean> {
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
      if (opaqueWrites) Uint8Array.prototype.fill.call(fields.knownMask, 0);
      return known(true);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  #physicalSection(fields: NativeHeapObjectViews, owner: object): PhysicalSection {
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
    try { this.#physicalSection(fields, owner).depth++; return known(undefined); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  leavePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object): NativeValue<void> {
    try { const section = this.#physicalSection(fields, owner); if (!section.depth) throw new Error('Actual entered physical critical section required');
      section.depth--; return known(undefined); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  deletePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object): NativeValue<void> {
    try { const section = this.#physicalSection(fields, owner); if (section.depth) throw new Error('Actual idle physical critical section required');
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
        !admittedMatrixDestructor(address) && !admittedNavigationNameDestructor(address) && !admittedPropertySingletonCallback(address, this, owner, execute)) || typeof execute !== 'function') {
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
      if (!result.known) {
        this.#shutdownPhase = 'blocked'; this.boundary = `Shutdown ${entry.address}: ${result.reason}`;
        if (this.#crtServices?.threadStack) retireNativeX86ThreadStackForPlatform(this, this.#crtServices.threadStack);
        return unknown(this.boundary);
      }
    }
    for (const entry of this.#backing.values()) if (entry.kind === 'module-image') entry.backing.freed = true;
    for (const buffer of this.#processBuffers.values()) if (buffer.phase === 'live') {
      buffer.phase = 'expired'; this.#releasedBackings.add(buffer.backing); buffer.backing.freed = true;
      this.bytesOwned -= buffer.bytes.length;
    }
    this.#shutdownPhase = 'disposed';
    if (this.#crtServices?.threadStack) retireNativeX86ThreadStackForPlatform(this, this.#crtServices.threadStack);
    return known(undefined);
  }
  snapshot() { return Object.freeze({ phase: this.#shutdownPhase, boundary: this.boundary, bytesOwned: this.bytesOwned,
    allocations: Object.freeze([...this.#backing.values()].map(entry => Object.freeze({ kind: entry.kind, ordinal: entry.ordinal, backing: entry.backing }))),
    sections: Object.freeze([...this.sections.values()].map(section => Object.freeze({ ...section }))),
    physicalSections: Object.freeze([...this.#physicalSections.values()].flatMap(positions => [...positions.values()].map(section => Object.freeze({ ...section })))),
    virtualHandleCountRequested: this.#requestedHandleCount,
    winHeaps: Object.freeze([...this.#winHeaps.values()].map(heap => Object.freeze({ capability: heap.capability, options: heap.options,
      destroyed: heap.destroyed, allocations: Object.freeze([...heap.allocations]) }))),
    win32LastError: this.#win32LastError,
    pending: Object.freeze(this.pending.slice()), executed: Object.freeze(this.executed.slice()) }); }
}

/** Standalone cold admin owner. Connecting this to an NPC requires every
 * earlier source allocation on that NPC path to use this same MemoryAdmin;
 * logical factory allocation receipts alone do not satisfy that prerequisite. */
const runtimeAdminOwners = new WeakMap<NativeRuntimePlatform, {memory: NativeMemoryAdmin; message: NativeMessageAdminModule} | null>();

/** Lookup retains the actual factory-created module and does not initialize it.
 * Ambiguous module lifetimes on one platform cannot supply a canonical owner. */
export function nativeRuntimeMessageAdminForPlatform(platform: NativeRuntimePlatform): NativeValue<NativeMessageAdminModule> {
  const owner = runtimeAdminOwners.get(platform);
  if (!owner || !NativeMemoryAdmin.isForPlatform(owner.memory, platform))
    return unknown('Actual unique same-platform runtime MessageAdmin owner is unavailable');
  return known(owner.message);
}

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
  runtimeAdminOwners.set(platform, runtimeAdminOwners.has(platform) ? null : {memory, message});
  return Object.freeze({ platform, memory, message, error, dispose: () => platform.dispose() });
}

/** The Ardea NPC owner consumes the source-audited 24/32-byte MemoryAdmin pools
 * needed by Game.dll Navigation-name CStrings, alongside its 20/40-byte NPC
 * path pools and the 4-byte reflected type-registration wrappers. Other
 * standalone admin owners remain cold/base-only. */
export function createBrowserNpcRuntimeAdminOwner(platform = new NativeRuntimePlatform()) {
  return createNativeRuntimeAdminOwner(platform, { memoryExtensions: [nativeNpcHeapExtension, nativeSceneStartupHeapExtension, nativePropertyHeapExtension, nativeClassNameHeapExtension] });
}
