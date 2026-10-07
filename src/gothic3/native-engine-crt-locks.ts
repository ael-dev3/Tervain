/** Engine CRT heap/lock-table owner. OS initialization, TLS errno, CRT fatal
 * handling and the encoded section-procedure resolver remain explicit gates.
 * The selected platform supplies the lower Win32 heap/section capabilities. */
import sourceText from '../../assets/gothic3/crt-undname/runtime-rules.json?raw';
import bootstrapText from '../../assets/gothic3/crt-bootstrap/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import type { NativeByteGeometryHost, NativeBytePointer, NativePointerGeometry } from './native-pointer-geometry';
import { admitNativeGameCrtSource, nativeGameCrtSourceProfile, nativeGameImagePins, nativeGameImageReceipt } from './native-game-crt-profile';
import type { NativeCrtModule, NativeCrtSourceProfile, NativeCrtSourceRules } from './native-game-crt-profile';
import { NativeWin32PlatformException } from './native-runtime-platform';
import type { NativeWin32HeapCapability, NativeWin32ModuleCapability, NativeCrtPointerProcedure, NativeCrtSectionProcedure, NativeCrtLocalProcedure, NativeCrtLocalGetProcedure, NativeCrtPlatformProcedure } from './native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
type SourceRules = NativeCrtSourceRules;
const source = JSON.parse(sourceText) as SourceRules;
const bootstrap = JSON.parse(bootstrapText) as SourceRules;
function freezeSource(value: unknown): void {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeSource(child);
    Object.freeze(value);
  }
}
freezeSource(source); freezeSource(bootstrap);
const engineProfile: NativeCrtSourceProfile = Object.freeze({ module: 'Engine', heapRules: source, bootstrapRules: bootstrap });
const methods = [
  ['heapInit', '3068442b', '46963b42dec8462674df243412038b449670d890a22369ae04ec8c9211217874'],
  ['heapSelect', '306843d0', '0946c4bd9670236ac2df9bc668cdfe905a2a7073179bced80072102db9f78d28'],
  ['heapTerm', '30684485', '5b18923b3e441b45502faf133f19e97f35cacea6bd654a14badbec8bfd6aecc2'],
  ['mtInitLocks', '30683218', '1cdaf48a81312d07fe443eca7a892ad448742127f9d1df0910537e3a2f6cbe57'],
  ['mtDeleteLocks', '30683261', '2569e1ee37a4c1198a85c20b4bfce648e95eaca4ab189b250d012175efe10984'],
  ['ensureLock', '306832e3', '0e130bc2152380803edae432c1ef894d7af3c3b82176196886b2571dc03eae74'],
  ['lock', '306833a6', '2020039b015750301bc2e597541a75fda9f163418a739736c0dfea51e750d6af'],
  ['unlock', '306832b6', '70d391a2e681eeb39b0f697b84676b6f19a896a8042cded6460ffdb1e88bb991'],
  ['ensureLockCleanup', '3068339d', '7c8670c564d00524ac491f13c55e55718cd88f082aaecb91b1a141f2e86a4042'],
  ['mallocCrt', '3067c9c1', '218b48c8a7d7ffd66ee980752095781d585d42876e19390703212b485a1d1f5d'],
  ['malloc', '30672ec7', 'b6030f1e6c0b65a430ebe44a5c474049b7292d46da6aaf8b1dd140bbc053f460'],
  ['free', '30672f8a', 'cf6a1e174274659c18caf39d6967c74db1ea6c8673d729566f21742deeabb704'],
  ['errno', '306783df', '97c2bebf1410da27de8a8ccbbca41fdfd47eb2fe8af11020043dd2924f857b2a'],
  ['getOsPlatform', '3067d032', 'c0a5661f5a121ecac1172649ab60aac0e79efa53a3bef98a9aa5f943c1f1b72b'],
  ['getWinMajor', '3067d0e1', '87742b5be90bd048cff081517407d48f20ee3181646e84bfff5d1fc1a697b41d'],
  ['callNewHandler', '306824b9', 'b32706c9527621b76ea7286c2a05475b8fe8e965b3361c37c78d961c354edec3'],
  ['osErrorToErrno', '306783a4', 'c75a2ba5a838b198c46661beb7468236481ca0f9402d6ec61dfc7b0998e84964'],
  ['initCritSecAndSpinCount', '30696484', '4a714e1987fc077072616d5d2634f02d9b0f25c61e14b504806a2ee2f931535a'],
  ['initCritSecFallback', '30696474', '2464295b95055bdef73cfa1ee5a9de5d5334fc1661ca66dd16f8d5e6bf0316a4'],
  ['initCritSecExceptionFilter', '3069650a', 'aefc33fcb2b8ed0e3ae7c21dd80fd55872b836b2fb2e192c4241113ce71a300e'],
  ['initCritSecExceptionHandler', '30696521', '59209d3fd9a7a16229a58f4b57c0c48482f6f04b68443fd03eabe2085114d007'],
  ['encodePointer', '3067de64', '6fac69f9333be09739abf3d7730673ec9fe4bb4dc510d42bcbd44a61c859c95c'],
  ['decodePointer', '3067dedb', '32121e98addce6572f9958b04620d20ed7a560e44fd814ef58c6796ba369b466'],
  ['pointerEncodingAvailability', '3067ddf8', '5c4071a6d60eba5affa0848d09040be6060df552a43fcd257f96bc12db349005'],
] as const;
const staticIds = [0, 1, 3, 4, 6, 7, 8, 10, 12, 13, 14, 16, 17, 18] as const;
function admitSource(): void {
  if (source.schema !== 'gothic3-crt-undname-rules-v1' ||
      source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
      methods.some(([label, address, hash]) => source.methods[label]?.entry !== address ||
        source.methods[label]?.body !== address || source.methods[label]?.bodyInstructionBytesSha256 !== hash)) {
    throw new Error('Selected Engine CRT heap/lock source receipt differs');
  }
  const callocMethods = [
    ['callocCrt', '3067ca01', '76f1de0df4720ce729627f72ba5a0f28c354776887a7eeb49ebf8d8e22e26a00'],
    ['callocImpl', '30695a7f', '5055e24ade74c406a0b254137b79a293db9f5f0b8101f8306f739ffb0c68d16d'],
    ['callocCleanup', '30695b7b', '2e50f043ddd3d230ab493904073c8006fe8a8caa8669055cf23526a024f10dd4'],
  ] as const;
  if (bootstrap.schema !== 'gothic3-crt-bootstrap-rules-v1' || bootstrap.inputs.Engine !== source.inputs.Engine ||
      callocMethods.some(([label, address, hash]) => bootstrap.methods[label]?.entry !== address || bootstrap.methods[label]?.body !== address || bootstrap.methods[label]?.bodyInstructionBytesSha256 !== hash)) throw new Error('Selected Engine calloc source receipt differs');
}
function storage(label: string, address: string, bytes: number): NativeHeapObjectViews {
  const receipt = source.coldGlobals[label];
  const expected = new Uint8Array(bytes);
  if (label === 'crtLockTable') for (const id of staticIds) expected[id * 8 + 4] = 1;
  if (label === 'crtTlsIndexes') expected.fill(255);
  const raw = [...expected].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (!receipt || receipt.module !== 'Engine' || receipt.address !== address || receipt.bytes !== bytes ||
      receipt.raw !== raw || receipt.knownMask !== 'ff'.repeat(bytes) ||
      receipt.scope !== 'cold-original-image' || receipt.liveValueCaptured !== false) {
    throw new Error('Selected cold Engine CRT storage receipt differs: ' + label);
  }
  return new NativeHeapObjectViews({ identity: Object.freeze({}), bytes: expected,
    knownMask: new Uint8Array(bytes).fill(255), freed: false });
}
function literal(label: string, address: string, expected: string): string {
  const receipt = source.constBytes[label];
  const raw = [...expected].map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('') + '00';
  if (!receipt || receipt.address !== address || receipt.raw !== raw) throw new Error('Selected CRT source literal differs: ' + label);
  return expected;
}
function bootstrapStorage(label: string, address: string, bytes: number, raw = '00'.repeat(bytes)): NativeHeapObjectViews {
  const receipt = bootstrap.coldGlobals[label];
  if (bootstrap.schema !== 'gothic3-crt-bootstrap-rules-v1' || bootstrap.inputs.Engine !== source.inputs.Engine ||
      !receipt || receipt.module !== 'Engine' || receipt.address !== address || receipt.bytes !== bytes || receipt.raw !== raw ||
      receipt.knownMask !== 'ff'.repeat(bytes) || receipt.scope !== 'cold-original-image' || receipt.liveValueCaptured !== false) throw new Error('Selected CRT bootstrap storage differs: ' + label);
  return new NativeHeapObjectViews({ identity: Object.freeze({}), bytes: Uint8Array.from(raw.match(/../g)!, byte => parseInt(byte, 16)), knownMask: new Uint8Array(bytes).fill(255), freed: false });
}

export interface NativeEngineCrtPlatform {
  registerCanonicalGameGuidLiteral?(owner: NativeGameCrtOwner): NativeValue<NativeBytePointer>;
  createWin32Heap(owner: object, options: 0 | 1, initialBytes: 4096, maximumBytes: 0): NativeValue<NativeWin32HeapCapability | null>;
  win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0 | 8, bytes: number): NativeValue<NativeMemoryBacking | null>;
  win32HeapSize(heap: NativeWin32HeapCapability | null, flags: 0, pointer: NativeBytePointer): NativeValue<number>;
  win32HeapFree(heap: NativeWin32HeapCapability, flags: 0, backing: NativeMemoryBacking): NativeValue<boolean>;
  win32HeapDestroy(heap: NativeWin32HeapCapability): NativeValue<boolean>;
  initializePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object, spinCount: 4000): NativeValue<boolean>;
  initializePhysicalCriticalSectionWithoutSpin?(fields: NativeHeapObjectViews, owner: object): NativeValue<void>;
  tlsGetValue?(index: number): NativeValue<object | null>;
  tlsAlloc?(): NativeValue<number>;
  tlsSetValue?(index: number, value: object | null): NativeValue<boolean>;
  tlsFree?(index: number): NativeValue<boolean>;
  readonly tlsProcedures?: Readonly<{ alloc: Extract<NativeCrtLocalProcedure, {kind:'alloc'}>; get: NativeCrtLocalGetProcedure; set: Extract<NativeCrtLocalProcedure, {kind:'set'}>; free: Extract<NativeCrtLocalProcedure, {kind:'free'}> }>;
  ownsLocalStorageProcedure?(procedure: NativeCrtLocalProcedure): boolean;
  interlockedCounter?(fields: NativeHeapObjectViews, delta: 1 | -1): NativeValue<number>;
  getCurrentThreadId?(): NativeValue<number>;
  getWin32LastError?(): NativeValue<number>;
  setWin32LastError?(error: number): NativeValue<void>;
  getWin32ModuleHandle?(name: 'KERNEL32.DLL' | 'kernel32.dll'): NativeValue<NativeWin32ModuleCapability | null>;
  getWin32Procedure?(module: NativeWin32ModuleCapability, name: 'EncodePointer' | 'DecodePointer' | 'InitializeCriticalSectionAndSpinCount' | 'FlsAlloc' | 'FlsGetValue' | 'FlsSetValue' | 'FlsFree'):
    NativeValue<NativeCrtPlatformProcedure | null>;
  enterPhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object): NativeValue<void>;
  leavePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object): NativeValue<void>;
  deletePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object): NativeValue<void>;
  resolveNativePointer?(pointer: NativeBytePointer): NativeValue<NativePointerGeometry>;
  proveNativeCopyDirection?(destination: NativeBytePointer, source: NativeBytePointer, bytes: number): NativeValue<'forward' | 'backward'>;
}
export interface NativeEngineCrtHost {
  readonly platform: NativeEngineCrtPlatform;
  /** Actual __errno accessor result. A semantic counter is not a native slot. */
  errnoSlot?(): NativeValue<NativeHeapObjectViews>;
  callNewHandler?(bytes: number): NativeValue<number>;
  sleep?(milliseconds: number): NativeValue<void>;
  getLastError?(): NativeValue<number>;
  mapOsError?(error: number): NativeValue<number>;
}
type InitPhase = 'cold' | 'initializing' | 'ready' | 'null' | 'blocked';
const engineConstructionToken = Object.freeze({});
const gameConstructionToken = Object.freeze({});
const gameOwners = new WeakMap<NativeEngineCrtPlatform, NativeGameCrtOwner>();
const hostCallbacks = ['errnoSlot', 'callNewHandler', 'sleep', 'getLastError', 'mapOsError'] as const;
const constructedCrtOwners = new WeakMap<NativeModuleCrtOwner, Readonly<{
  host: NativeEngineCrtHost; platform: NativeEngineCrtPlatform; identity: object;
  physical: NativeModuleCrtOwner['physical'];
}>>();

/** Algorithms shared only after each module's independent source admission.
 * A Game owner never constructs an Engine facade or copies its live state. */
export class NativeModuleCrtOwner {
  /** Constructor admission is private authority; an inherited prototype or
   * caller-shaped source/physical fields cannot supply an actual CRT owner. */
  static isConstructedOwner(owner: NativeModuleCrtOwner): boolean {
    const proof = constructedCrtOwners.get(owner);
    return !!proof && proof.host === owner.host && proof.platform === owner.host.platform &&
      proof.identity === owner.identity && proof.physical === owner.physical;
  }
  /** Resolve the original retained image through private authority. Public
   * instance accessors and caller-provided view maps cannot replace it. */
  static canonicalImageForOwner(owner: NativeModuleCrtOwner, label: string): NativeValue<NativeHeapObjectViews> {
    if (!NativeModuleCrtOwner.isConstructedOwner(owner)) return unknown('Actual constructed CRT owner required');
    try { return known(owner.#retainedImageStorage(label)); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  readonly module: NativeCrtModule;
  readonly sourceProfile: NativeCrtSourceProfile;
  readonly identity = Object.freeze({});
  readonly physical: Readonly<{
    heapHandle: NativeHeapObjectViews; heapSelector: NativeHeapObjectViews; lockTable: NativeHeapObjectViews;
    staticSections: NativeHeapObjectViews; crtOsFields: NativeHeapObjectViews; mallocWait: NativeHeapObjectViews;
    newMode: NativeHeapObjectViews; crtTypeInfoList: NativeHeapObjectViews; sectionInitializer: NativeHeapObjectViews;
    crtTlsIndexes: NativeHeapObjectViews; pointerInitialization: Readonly<{
      newHandler: NativeHeapObjectViews; sectionInitializer: NativeHeapObjectViews; invalidParameter: NativeHeapObjectViews;
      exceptionFilter: NativeHeapObjectViews; mathError: NativeHeapObjectViews; winSignalPointers: NativeHeapObjectViews;
      terminateHandler: NativeHeapObjectViews; exitFunction: NativeHeapObjectViews;
    }>;
  }>;
  readonly #imageViews = new Map<string, NativeHeapObjectViews>();
  readonly #imageProofs = new WeakMap<NativeHeapObjectViews, Readonly<{
    backing: NativeMemoryBacking; bytes: Uint8Array; masks: Uint8Array; view: DataView;
    rootBytes: Uint8Array; rootMasks: Uint8Array; begin: number; length: number;
  }>>();
  private heapPhase: InitPhase = 'cold';
  private locksPhase: InitPhase = 'cold';
  private locksTerminated = false;
  private heapTerminated = false;
  private boundary: string | null = null;
  private readonly failedOperations = new Set<string | object>();
  private readonly failedReleases = new WeakSet<NativeMemoryBacking>();
  private readonly heaps = new Set<NativeWin32HeapCapability>();
  private readonly allocations = new Set<NativeMemoryBacking>();
  private readonly dynamicSections = new Map<NativeHeapObjectViews, NativeMemoryBacking>();
  private readonly trace: string[] = [];
  private readonly fallbackSectionProcedure: NativeCrtSectionProcedure = Object.freeze({ identity: Object.freeze({}),
    owner: this.identity, name: 'InitializeCriticalSectionAndSpinCount',
    invoke: (fields: NativeHeapObjectViews, owner: object, spinCount: 4000): NativeValue<boolean> => {
      if (spinCount !== 4000 || owner !== this.identity) return unknown('Original selected CRT fallback section arguments required');
      this.call('InitializeCriticalSection fallback30696474', () => this.host.platform.initializePhysicalCriticalSectionWithoutSpin?.(fields, owner) ??
        unknown('Actual owned lower InitializeCriticalSection capability required'));
      return known(true);
    } });
  protected constructor(readonly host: NativeEngineCrtHost, module: NativeCrtModule, token: object) {
    const facade: Function = new.target;
    if ((module === 'Engine' && (token !== engineConstructionToken || facade !== NativeEngineCrtOwner)) ||
        (module === 'Game' && (token !== gameConstructionToken || facade !== NativeGameCrtOwner)) ||
        (module !== 'Engine' && module !== 'Game')) throw new Error('Actual admitted CRT module facade construction required');
    this.module = module;
    if (module === 'Engine') { admitSource(); this.sourceProfile = engineProfile; }
    else { admitNativeGameCrtSource(); this.sourceProfile = nativeGameCrtSourceProfile; this.#initializeGameImage(); }
    Object.defineProperties(this, {
      module: { value: this.module, writable: false, configurable: false },
      sourceProfile: { value: this.sourceProfile, writable: false, configurable: false },
    });
    const select = (label: string, address: string, bytes: number) => module === 'Engine' ? storage(label, address, bytes) : this.#retainedImageStorage(label);
    const selectBootstrap = (label: string, address: string, bytes: number, raw?: string) =>
      module === 'Engine' ? bootstrapStorage(label, address, bytes, raw) : this.#retainedImageStorage(label);
    const sectionInitializer = select('crtSectionInitializer', '30af7c50', 4);
    this.physical = Object.freeze({
      heapHandle: select('crtHeapHandle', '30af76f4', 4), heapSelector: select('crtHeapMode', '30af7e20', 4),
      lockTable: select('crtLockTable', '30ad4aa0', 288), staticSections: select('crtStaticSections', '30af75a0', 336),
      crtOsFields: select('crtOsFields', '30af70f8', 20), mallocWait: select('crtMallocRetry', '30af70f0', 4),
      newMode: select('newMode', '30af76f8', 4), crtTypeInfoList: select('crtTypeInfoList', '30af70ac', 8),
      sectionInitializer, crtTlsIndexes: select('crtTlsIndexes', '30ad4840', 8),
      pointerInitialization: Object.freeze({ newHandler: selectBootstrap('newHandler', '30af759c', 4), sectionInitializer,
        invalidParameter: selectBootstrap('invalidParameter', '30af70c8', 4), exceptionFilter: selectBootstrap('exceptionFilter', '30af7474', 4),
        mathError: selectBootstrap('mathError', '30af7c4c', 4), winSignalPointers: selectBootstrap('winSignalPointers', '30af7c38', 16),
        terminateHandler: selectBootstrap('terminateHandler', '30af7744', 4), exitFunction: selectBootstrap('exitHandler', '30ad4830', 4, '4cd36730'),
      }),
    });
    constructedCrtOwners.set(this, Object.freeze({ host, platform: host.platform,
      identity: this.identity, physical: this.physical }));
  }
  #initializeGameImage(): void {
    const ranges: { address: number; fields: NativeHeapObjectViews }[] = [];
    const labels = Object.keys(nativeGameImagePins).sort((a, b) => {
      const ra = nativeGameImageReceipt(a), rb = nativeGameImageReceipt(b);
      return parseInt(ra.address, 16) - parseInt(rb.address, 16) || rb.bytes - ra.bytes;
    });
    for (const label of labels) {
      const receipt = nativeGameImageReceipt(label), address = parseInt(receipt.address, 16);
      const raw = Uint8Array.from(receipt.raw.match(/../g)!, byte => parseInt(byte, 16));
      const previous = ranges.find(range => address >= range.address && address + receipt.bytes <= range.address + range.fields.bytes.length);
      let fields: NativeHeapObjectViews;
      if (previous) {
        const offset = address - previous.address;
        if (raw.some((byte, index) => byte !== previous.fields.bytes[offset + index])) throw new Error('Original Game CRT image aliases disagree: ' + label);
        fields = offset === 0 && receipt.bytes === previous.fields.bytes.length ? previous.fields : new NativeHeapObjectViews(previous.fields.backing, offset, receipt.bytes);
      } else {
        if (ranges.some(range => address < range.address + range.fields.bytes.length && address + receipt.bytes > range.address)) throw new Error('Partially overlapping Game CRT receipt is not admitted: ' + label);
        fields = new NativeHeapObjectViews({ identity: Object.freeze({}), bytes: raw, knownMask: new Uint8Array(receipt.bytes).fill(255), freed: false });
        ranges.push({ address, fields });
      }
      this.#imageViews.set(label, fields);
      if (!this.#imageProofs.has(fields)) this.#imageProofs.set(fields, Object.freeze({
        backing: fields.backing, bytes: fields.bytes, masks: fields.knownMask, view: fields.view,
        rootBytes: fields.backing.bytes, rootMasks: fields.backing.knownMask,
        begin: fields.bytes.byteOffset - fields.backing.bytes.byteOffset, length: fields.bytes.length,
      }));
    }
  }
  /** Canonical admitted Game module-image objects. Constructing views supplies
   * cold bytes, never a live section, heap or initialized CRT status. */
  imageStorage(label: string): NativeHeapObjectViews {
    return this.#retainedImageStorage(label);
  }
  /** Check retained identities and aliases without performing a native load. */
  #retainedImageStorage(label: string): NativeHeapObjectViews {
    if (this.module !== 'Game') throw new Error('Engine image aliases remain owned by their existing source services');
    nativeGameImageReceipt(label);
    const fields = this.#imageViews.get(label);
    if (!fields) throw new Error('Actual canonical Game CRT image view required: ' + label);
    const proof = this.#imageProofs.get(fields);
    if (!proof || fields.backing.freed || fields.backing !== proof.backing || fields.bytes !== proof.bytes ||
        fields.knownMask !== proof.masks || fields.view !== proof.view || fields.backing.bytes !== proof.rootBytes ||
        fields.backing.knownMask !== proof.rootMasks || fields.bytes.length !== proof.length ||
        fields.knownMask.length !== proof.length || fields.bytes.buffer !== proof.rootBytes.buffer ||
        fields.bytes.byteOffset !== proof.rootBytes.byteOffset + proof.begin ||
        fields.knownMask.buffer !== proof.rootMasks.buffer ||
        fields.knownMask.byteOffset !== proof.rootMasks.byteOffset + proof.begin ||
        fields.view.buffer !== fields.bytes.buffer || fields.view.byteOffset !== fields.bytes.byteOffset ||
        fields.view.byteLength !== proof.length) {
      throw new Error('Canonical Game image storage differs from its retained original view');
    }
    return fields;
  }
  byteGeometry(): NativeByteGeometryHost {
    return { resolveNativePointer: pointer => this.host.platform.resolveNativePointer?.(pointer) ?? unknown('Actual owned CRT pointer geometry capability required'),
      proveNativeCopyDirection: (destination, input, bytes) => this.host.platform.proveNativeCopyDirection?.(destination, input, bytes) ?? unknown('Actual owned CRT copy-direction capability required') };
  }
  private sourceName(name: string): string {
    if (this.module === 'Engine') return name;
    const labels = new Map<string, string>(methods.map(([label, address]) => [address, this.sourceProfile.heapRules.methods[label]!.entry]));
    for (const [address, label] of [['3067ca01', 'callocCrt'], ['30695a7f', 'callocImpl'], ['30695b7b', 'callocCleanup'], ['3067df52', 'tlsGetterDispatcher']] as const) labels.set(address, this.sourceProfile.heapRules.methods[label]!.entry);
    // Explicit unimplemented Game branches retain their actual source labels.
    for (const [engine, game] of [['30674d58', '2046a20a'], ['3067e8e6', '204699f0'], ['3068347a', '20476cd4'],
      ['30672e03', '20467ae3'], ['306834e6', '20476d40'], ['3067cf89', '204663b6'], ['30684491', '20476a2b']] as const) labels.set(engine, game);
    return name.replace(/[0-9a-f]{8}/g, address => labels.get(address) ?? address).replace(/Engine CRT/g, 'Game CRT');
  }
  private note(name: string): void { this.trace.push(this.sourceName(name)); }
  private literal(label: string, address: string, expected: string): string {
    if (this.module === 'Engine') return literal(label, address, expected);
    const receipt = nativeGameImageReceipt(label), raw = [...expected].map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('') + '00';
    if (receipt.raw !== raw) throw new Error('Original Game CRT literal differs: ' + label);
    return expected;
  }
  private run<T>(name: string, execute: () => T, cleanup = false, failureKey: string | object = name): NativeValue<T> {
    name = this.sourceName(name);
    if (this.boundary && (!cleanup || this.failedOperations.has(failureKey))) return unknown(this.boundary);
    try { return known(execute()); }
    catch (error) {
      const reason = name + ': ' + this.sourceName(error instanceof Error ? error.message : String(error));
      this.boundary ??= reason; this.failedOperations.add(failureKey); return unknown(reason);
    }
  }
  private call<T>(name: string, execute: () => NativeValue<T>, retain?: (value: T) => void): T {
    name = this.sourceName(name);
    const before = this.boundary;
    this.note(name + '.attempt');
    const result = execute();
    if (result.known) retain?.(result.value);
    if (this.boundary !== before) throw new Error(this.boundary!);
    if (!result.known) throw new Error(name + ': ' + result.reason);
    this.note(name); return result.value;
  }
  private gate(name: string): never { this.note(name + '.boundary'); throw new Error('Unowned ' + name); }
  private id(id: number): void {
    if (!Number.isInteger(id) || id < 0 || id >= 36) throw new Error('Original selected CRT lock id0..35 required');
  }
  private slot(id: number): NativeHeapObjectViews | null {
    this.id(id); return this.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).get();
  }
  private requireSection(id: number): NativeHeapObjectViews {
    const section = this.slot(id);
    if (!(section instanceof NativeHeapObjectViews) || section.bytes.length !== 24) throw new Error('Actual physical CRT section pointer required for lock' + id);
    return section;
  }
  private heap(): NativeWin32HeapCapability {
    const heap = this.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).get();
    if (!heap) this.gate('__FF_MSGBANNER3067e8e6 before CRT error30 / ExitProcess255');
    if (!this.heaps.has(heap) || heap.owner !== this.identity) throw new Error('Actual same-owner ' + this.module + ' CRT heap handle required');
    return heap;
  }
  private retainedHeap(operation: 'HeapFree' | 'HeapDestroy'): NativeWin32HeapCapability {
    const heap = this.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).get();
    if (!heap) this.gate(operation + '(NULL) platform call');
    if (!this.heaps.has(heap) || heap.owner !== this.identity) throw new Error('Actual same-owner ' + this.module + ' CRT heap handle required');
    return heap;
  }
  private errnoFields(): NativeHeapObjectViews {
    const fields = this.call('__errno306783df', () => this.host.errnoSlot?.() ?? unknown('Actual TLS errno accessor capability required'));
    if (!(fields instanceof NativeHeapObjectViews) || fields.bytes.length !== 4) throw new Error('Actual live canonical four-byte TLS errno slot required');
    const backing = fields.backing, canonical = 'region' in backing ? backing.region : backing;
    const position = ('region' in backing ? backing.offset : 0) + fields.bytes.byteOffset - backing.bytes.byteOffset;
    if (backing.freed || canonical.freed || position < 0 || position + 4 > canonical.bytes.length ||
        fields.bytes.buffer !== canonical.bytes.buffer || fields.bytes.byteOffset !== canonical.bytes.byteOffset + position ||
        fields.knownMask.buffer !== canonical.knownMask.buffer || fields.knownMask.byteOffset !== canonical.knownMask.byteOffset + position) {
      throw new Error('Actual live canonical four-byte TLS errno slot required');
    }
    return fields;
  }
  private errno(value: number): void {
    const fields = this.errnoFields();
    fields.writeUnsigned(0, value); this.note('errno.store' + value);
  }
  private selectHeap(): number {
    this.note('getOsPlatform3067d032');
    const platform = this.physical.crtOsFields.readUnsigned(0);
    if (platform === 0) {
      this.errno(22);
      this.gate('invalidParameter30674d58 after getOsPlatform failure');
    }
    this.note('getWinMajor3067d0e1');
    // The source accessor tests the SAME OS platform field before reading major.
    if (this.physical.crtOsFields.readUnsigned(0) === 0) {
      this.errno(22); this.gate('invalidParameter30674d58 after getWinMajor failure');
    }
    const major = this.physical.crtOsFields.readUnsigned(12);
    return platform === 2 && major >= 5 ? 1 : 3;
  }
  private osField(method: 'getOsPlatform3067d032' | 'getWinMajor3067d0e1', offset: 0 | 12): number {
    this.note(method);
    if (this.physical.crtOsFields.readUnsigned(0) === 0) {
      this.errno(22); this.gate('invalidParameter30674d58 after ' + method + ' failure');
    }
    return this.physical.crtOsFields.readUnsigned(offset);
  }
  private codec(value: object | null, direction: 'EncodePointer' | 'DecodePointer'): object | null {
    const method = direction === 'EncodePointer' ? 'encodePointer3067de64' : 'decodePointer3067dedb';
    this.note(method);
    const tlsIndex = this.physical.crtTlsIndexes.readUnsigned(4);
    const tls = this.call('TlsGetValue(' + tlsIndex + ')', () => this.host.platform.tlsGetValue?.(tlsIndex) ?? unknown('Actual owned CRT pointer-wrapper TLS capability required'));
    if (tls !== null && this.physical.crtTlsIndexes.readUnsigned(0) !== 0xffffffff) {
      const ptdIndex = this.physical.crtTlsIndexes.readUnsigned(0), dispatchIndex = this.physical.crtTlsIndexes.readUnsigned(4);
      const getter = this.call('TlsGetValue(' + dispatchIndex + ').dispatch', () => this.host.platform.tlsGetValue?.(dispatchIndex) ?? unknown('Actual owned CRT TLS dispatcher required')) as NativeCrtLocalGetProcedure | null;
      if (!getter || getter.kind !== 'get' || !this.host.platform.ownsLocalStorageProcedure?.(getter)) this.gate('CRT TLS pointer-wrapper dispatch before +0x' + (direction === 'EncodePointer' ? '1f8' : '1fc'));
      const ptd = this.call('tlsGetterDispatcher3067df52', () => getter.invoke(ptdIndex));
      if (ptd !== null) {
        if (!(ptd instanceof NativeHeapObjectViews) || ptd.bytes.length !== 532) throw new Error('Actual live532-byte PTD required by pointer codec');
        const backing = ptd.backing;
        if (!this.allocations.has(backing as NativeMemoryBacking) || backing.freed || ptd.bytes.buffer !== backing.bytes.buffer || ptd.bytes.byteOffset !== backing.bytes.byteOffset ||
            ptd.knownMask.buffer !== backing.knownMask.buffer || ptd.knownMask.byteOffset !== backing.knownMask.byteOffset || ptd.knownMask.length !== 532) throw new Error('Actual same-CRT canonical PTD allocation required by pointer codec');
        const procedure = ptd.pointer<NativeCrtPointerProcedure>(direction === 'EncodePointer' ? 0x1f8 : 0x1fc).get();
        if (procedure === null) return value;
        if (procedure.name !== direction) throw new Error('Actual matching retained PTD pointer procedure required');
        return this.call(direction, () => procedure.invoke(value));
      }
    }
    const moduleName = this.literal('pointerKernel32Module', '3089377c', 'KERNEL32.DLL') as 'KERNEL32.DLL';
    const module = this.call('GetModuleHandleA(' + moduleName + ')', () => this.host.platform.getWin32ModuleHandle?.(moduleName) ?? unknown('Actual owned CRT Win32 module lookup required'));
    if (module === null) return value;
    this.pointerAvailable();
    const label = direction === 'EncodePointer' ? 'encodePointerName' : 'decodePointerName';
    const address = direction === 'EncodePointer' ? '3089376c' : '3089378c';
    const name = this.literal(label, address, direction) as 'EncodePointer' | 'DecodePointer';
    const procedure = this.call('GetProcAddress(' + name + ')', () => this.host.platform.getWin32Procedure?.(module, name) ?? unknown('Actual owned CRT Win32 procedure lookup required'));
    if (procedure === null) return value;
    if (procedure.name !== direction) throw new Error('Actual matching owned CRT pointer procedure required');
    return this.call(direction, () => procedure.invoke(value));
  }
  private pointerAvailable(): boolean {
    this.note('pointerEncodingAvailability3067ddf8');
    const major = this.osField('getWinMajor3067d0e1', 12);
    if ((major | 0) < 6) this.gate('GetModuleHandleA(NULL) / physical process PE .mixcrt scan3067ddf8');
    return true;
  }
  pointerEncodingAvailable(): NativeValue<boolean> { return this.run('pointerEncodingAvailability3067ddf8', () => this.pointerAvailable()); }
  encodePointer(value: object | null): NativeValue<object | null> { return this.run('encodePointer3067de64', () => this.codec(value, 'EncodePointer')); }
  decodePointer(value: object | null): NativeValue<object | null> { return this.run('decodePointer3067dedb', () => this.codec(value, 'DecodePointer')); }
  private initializeSection(fields: NativeHeapObjectViews): boolean {
    const encoded = this.physical.sectionInitializer.pointer<object>(0).get();
    let selected = this.codec(encoded, 'DecodePointer');
    if (selected === null) {
      const platform = this.osField('getOsPlatform3067d032', 0);
      let procedure: NativeCrtSectionProcedure | null = null;
      if (platform !== 1) {
        const moduleName = this.literal('kernel32Module', '3089eb80', 'kernel32.dll') as 'kernel32.dll';
        const module = this.call('GetModuleHandleA(' + moduleName + ')', () => this.host.platform.getWin32ModuleHandle?.(moduleName) ?? unknown('Actual owned section initializer module lookup required'));
        if (module !== null) {
          const name = this.literal('initializeCriticalSectionAndSpinCountName', '3089eb58', 'InitializeCriticalSectionAndSpinCount') as 'InitializeCriticalSectionAndSpinCount';
          const resolved = this.call('GetProcAddress(' + name + ')', () => this.host.platform.getWin32Procedure?.(module, name) ?? unknown('Actual owned section initializer procedure lookup required'));
          if (resolved !== null) {
            if (resolved.name !== name) throw new Error('Actual matching owned section procedure required'); procedure = resolved;
          }
        }
      }
      selected = procedure ?? this.fallbackSectionProcedure;
      const cached = this.codec(selected, 'EncodePointer');
      this.physical.sectionInitializer.pointer<object>(0).set(cached); this.note('sectionInitializer.cache');
    }
    const procedure = selected as NativeCrtSectionProcedure;
    if (procedure.name !== 'InitializeCriticalSectionAndSpinCount' || typeof procedure.invoke !== 'function') {
      throw new Error('Decoded section initializer has no actual owned procedure capability');
    }
    return this.call('crtInitCritSecAndSpinCount30696484.call4000', () => {
      try { return procedure.invoke(fields, this.identity, 4000); }
      catch (error) {
        if (!(error instanceof NativeWin32PlatformException) || error.code !== 0xc0000017) throw error;
        this.note('initCritSecExceptionFilter3069650a(0xc0000017)');
        this.call('SetLastError(8)', () => this.host.platform.setWin32LastError?.(8) ?? unknown('Actual owned Win32 SetLastError capability required'));
        this.note('initCritSecExceptionHandler30696521.return0'); return known(false);
      }
    });
  }
  initHeap(argument = 1): NativeValue<number> {
    if (this.heapTerminated) return unknown(this.module + ' CRT heap lifetime has ended');
    if (this.heapPhase === 'ready') return known(1);
    if (this.heapPhase === 'null') return known(0);
    if (this.heapPhase === 'initializing') { this.boundary ??= 'Reentrant ' + this.module + ' CRT heap initialization'; return unknown(this.boundary); }
    return this.run('heapInit3068442b', () => {
      if (!Number.isInteger(argument) || argument < 0 || argument > 0xffffffff) throw new Error('Original uint32 heap-init argument required');
      if (this.heapTerminated) throw new Error(this.module + ' CRT heap lifetime has ended');
      this.heapPhase = 'initializing';
      const heap = this.call('HeapCreate', () => this.host.platform.createWin32Heap(this.identity, argument === 0 ? 1 : 0, 4096, 0),
        value => { if (value) this.heaps.add(value); });
      this.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).set(heap); this.note('heapHandle.publish');
      if (heap === null) { this.heapPhase = 'null'; return 0; }
      if (heap.owner !== this.identity) throw new Error('HeapCreate returned a different physical heap owner');
      const mode = this.selectHeap();
      this.physical.heapSelector.writeUnsigned(0, mode); this.note('heapSelector.store' + mode);
      if (mode === 3) this.gate('smallBlockHeapInit3068347a(1016)');
      this.heapPhase = 'ready'; return 1;
    });
  }
  initLocks(): NativeValue<number> {
    if (this.locksTerminated) return unknown(this.module + ' CRT lock-table lifetime has ended');
    if (this.locksPhase === 'ready') return known(1);
    if (this.locksPhase === 'null') return known(0);
    if (this.locksPhase === 'initializing') { this.boundary ??= 'Reentrant ' + this.module + ' CRT static-lock initialization'; return unknown(this.boundary); }
    return this.run('mtInitLocks30683218', () => {
      if (this.locksTerminated) throw new Error(this.module + ' CRT lock-table lifetime has ended');
      this.locksPhase = 'initializing'; let index = 0;
      for (let id = 0; id < 36; id++) if (this.physical.lockTable.readUnsigned(id * 8 + 4) === 1) {
        if (index >= 14) throw new Error('Source static-section storage exhausted');
        const fields = new NativeHeapObjectViews(this.physical.staticSections.backing, index++ * 24, 24);
        this.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).set(fields); this.note('lock' + id + '.static.publish');
        this.note('lock' + id + '.initialize4000'); const initialized = this.initializeSection(fields);
        if (!initialized) {
          this.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).set(null); this.note('lock' + id + '.static.clear');
          this.locksPhase = 'null'; return 0;
        }
      }
      this.locksPhase = 'ready'; return 1;
    });
  }
  private allocate(bytes: number): NativeMemoryBacking | null {
    if (!Number.isInteger(bytes) || bytes < 0 || bytes > 0xffffffff) throw new Error('Original uint32 CRT malloc request required');
    if (bytes > 0xffffffe0) {
      this.call('callNewHandler306824b9', () => this.host.callNewHandler?.(bytes) ?? unknown('Original new-handler capability required'));
      this.errno(12); return null;
    }
    for (;;) {
      const heap = this.heap(), selector = this.physical.heapSelector.readUnsigned(0);
      if (selector !== 1) this.gate(selector === 3 ? 'small-block malloc30672e03' : 'non-NT rounded CRT malloc profile');
      const backing = this.call('HeapAlloc(' + Math.max(1, bytes) + ')', () => this.host.platform.win32HeapAlloc(heap, 0, Math.max(1, bytes)),
        value => { if (value) this.allocations.add(value); });
      if (backing) {
        if (backing.freed || backing.bytes.length < Math.max(1, bytes) || backing.knownMask.length !== backing.bytes.length) {
          throw new Error('Actual retained HeapAlloc storage and masks required');
        }
        return backing;
      }
      if (this.physical.newMode.readUnsigned(0) === 0) {
        // Both accessor calls/stores exist in the original zero-new-mode path.
        this.errno(12); this.errno(12); return null;
      }
      const retry = this.call('callNewHandler306824b9', () => this.host.callNewHandler?.(bytes) ?? unknown('Original new-handler retry capability required'));
      if (retry === 0) { this.errno(12); return null; }
    }
  }
  malloc(bytes: number): NativeValue<NativeMemoryBacking | null> { return this.run('malloc30672ec7', () => this.allocate(bytes)); }
  mallocCrt(bytes: number): NativeValue<NativeMemoryBacking | null> {
    return this.run('mallocCrt3067c9c1', () => {
      let delay = 0;
      for (;;) {
        const backing = this.allocate(bytes); if (backing) return backing;
        if (this.physical.mallocWait.readUnsigned(0) === 0) return null;
        this.call('Sleep(' + delay + ')', () => this.host.sleep?.(delay) ?? unknown('Original CRT Sleep retry capability required'));
        delay = (delay + 1000) >>> 0;
        if (this.physical.mallocWait.readUnsigned(0) < delay) delay = 0xffffffff;
        if (delay === 0xffffffff) return null;
      }
    });
  }
  callocCrt(count: number, size: number): NativeValue<NativeMemoryBacking | null> {
    return this.run('callocCrt3067ca01', () => {
      for (const value of [count, size]) if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Original uint32 calloc operands required');
      if (count !== 0 && size > Math.floor(0xffffffe0 / count)) { this.errno(12); this.gate('invalidParameter30674d58 after calloc overflow'); }
      const bytes = Math.max(1, count * size); let delay = 0;
      for (;;) {
        let backing: NativeMemoryBacking | null;
        for (;;) {
          const selector = this.physical.heapSelector.readUnsigned(0);
          if (selector === 3) this.gate('callocImpl30695a7f small-block allocation under lock4');
          const heap = this.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).get();
          if (heap === null) this.gate('callocImpl30695a7f HeapAlloc(NULL,8) platform call');
          if (!this.heaps.has(heap) || heap.owner !== this.identity) throw new Error('Actual same-owner calloc HeapAlloc handle required');
          backing = this.call('HeapAlloc(' + bytes + ',8)', () => this.host.platform.win32HeapAlloc(heap, 8, bytes), value => { if (value) this.allocations.add(value); });
          if (backing || this.physical.newMode.readUnsigned(0) === 0) break;
          const retry = this.call('callNewHandler306824b9', () => this.host.callNewHandler?.(bytes) ?? unknown('Original calloc new-handler retry required'));
          if (retry === 0) break;
        }
        if (backing) {
          if (backing.freed || backing.bytes.length < bytes || backing.knownMask.length !== backing.bytes.length ||
              backing.bytes.subarray(0, bytes).some(value => value !== 0) || backing.knownMask.subarray(0, bytes).some(mask => mask !== 255)) throw new Error('Actual owned zeroed calloc HeapAlloc storage required');
          return backing;
        }
        if (this.physical.mallocWait.readUnsigned(0) === 0) return null;
        this.call('Sleep(' + delay + ')', () => this.host.sleep?.(delay) ?? unknown('Original calloc CRT Sleep retry required'));
        delay = (delay + 1000) >>> 0; if (this.physical.mallocWait.readUnsigned(0) < delay) delay = 0xffffffff; if (delay === 0xffffffff) return null;
      }
    });
  }
  private release(backing: NativeMemoryBacking | null): void {
    if (backing === null) return;
    if (this.failedReleases.has(backing)) throw new Error('Original unresolved CRT free prefix cannot be replayed');
    try { this.releaseActual(backing); }
    catch (error) { this.failedReleases.add(backing); throw error; }
  }
  private releaseActual(backing: NativeMemoryBacking): void {
    const mode = this.physical.heapSelector.readUnsigned(0);
    if (mode === 3) this.gate('small-block free306834e6 under lock4');
    const heap = this.retainedHeap('HeapFree');
    const freed = this.call('HeapFree', () => this.host.platform.win32HeapFree(heap, 0, backing));
    if (!freed) {
      // Source obtains errno BEFORE GetLastError and maps the OS result.
      const fields = this.errnoFields();
      const error = this.call('GetLastError', () => this.host.getLastError?.() ?? unknown('Actual Win32 last-error capability required'));
      const mapped = this.call('osErrorToErrno306783a4', () => this.host.mapOsError?.(error) ?? unknown('Original OS-error mapping capability required'));
      fields.writeUnsigned(0, mapped); this.note('errno.store' + mapped);
    }
  }
  free(backing: NativeMemoryBacking | null): NativeValue<void> { return this.run('free30672f8a', () => this.release(backing), true, backing ?? 'freeNULL'); }
  msize(pointer: NativeBytePointer | null): NativeValue<number> {
    if (this.module !== 'Game') return unknown('Game __msize source owner required');
    return this.run('msize204684cd', () => {
      if (pointer === null) { this.errno(22); this.gate('invalidParameter2046a20a(0,0,0,0,0) after msize(NULL)'); }
      if (this.physical.heapSelector.readUnsigned(0) === 3) {
        const locked = this.lock(4);
        if (!locked.known) throw new Error(locked.reason);
        this.gate('small-block size lookup20476d1c and msize cleanup20468567');
      }
      const heap = this.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).get();
      const size = this.call('HeapSize207d7bac(Game heap,0,pointer)',
        () => this.host.platform.win32HeapSize(heap, 0, pointer));
      if (!Number.isInteger(size) || size < 0 || size > 0xffffffff) throw new Error('Original 32-bit HeapSize result required');
      return size >>> 0;
    });
  }
  private ensure(id: number): number {
    this.id(id); this.heap();
    if (this.slot(id) !== null) return 1;
    const backing = this.call('mallocCrt3067c9c1(24)', () => this.mallocCrt(24));
    if (backing === null) { this.errno(12); return 0; }
    const fields = new NativeHeapObjectViews(backing, 0, 24);
    this.dynamicSections.set(fields, backing);
    this.enter(10);
    let result = 1;
    if (this.slot(id) === null) {
      this.note('lock' + id + '.initialize4000'); const initialized = this.initializeSection(fields);
      if (!initialized) {
        this.release(backing); this.errno(12); result = 0;
      } else {
        this.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).set(fields); this.note('lock' + id + '.dynamic.publish');
      }
    } else { this.note('lock' + id + '.race.free'); this.release(backing); }
    this.leave(10); return result;
  }
  ensureLock(id: number): NativeValue<number> {
    return this.run('ensureLock306832e3', () => {
      if (this.locksTerminated) throw new Error(this.module + ' CRT lock-table lifetime has ended');
      return this.ensure(id);
    });
  }
  private enter(id: number): void {
    this.id(id);
    if (this.slot(id) === null && this.ensure(id) === 0) this.gate('CRT lock fatal3067cf89(17)');
    const fields = this.requireSection(id);
    this.call('lock' + id + '.enter', () => this.host.platform.enterPhysicalCriticalSection(fields, this.identity));
  }
  private leave(id: number): void {
    const fields = this.requireSection(id);
    this.call('lock' + id + '.leave', () => this.host.platform.leavePhysicalCriticalSection(fields, this.identity));
  }
  lock(id: number): NativeValue<void> {
    return this.run('lock306833a6', () => {
      if (this.locksTerminated) throw new Error(this.module + ' CRT lock-table lifetime has ended'); this.enter(id);
    });
  }
  unlock(id: number): NativeValue<void> { return this.run('unlock306832b6', () => this.leave(id), true); }
  terminateLocks(): NativeValue<void> {
    if (this.locksTerminated) return known(undefined);
    return this.run('mtDeleteLocks30683261', () => {
      for (const dynamic of [true, false]) for (let id = 0; id < 36; id++) {
        const fields = this.slot(id);
        if (fields === null || (this.physical.lockTable.readUnsigned(id * 8 + 4) !== 1) !== dynamic) continue;
        this.call('lock' + id + '.delete', () => this.host.platform.deletePhysicalCriticalSection(fields, this.identity));
        if (dynamic) {
          const backing = [...this.dynamicSections].find(([owned]) => owned.backing === fields.backing &&
            owned.bytes.buffer === fields.bytes.buffer && owned.bytes.byteOffset === fields.bytes.byteOffset &&
            owned.knownMask.buffer === fields.knownMask.buffer && owned.knownMask.byteOffset === fields.knownMask.byteOffset)?.[1];
          if (!backing) throw new Error('Actual retained dynamic CRT section allocation required'); this.release(backing);
          this.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).set(null); this.note('lock' + id + '.dynamic.clear');
        }
        // The recovered post-free instruction clears dynamic slots only.
      }
      this.locksTerminated = true;
    }, true);
  }
  terminateHeap(): NativeValue<void> {
    if (this.heapTerminated) return known(undefined);
    return this.run('heapTerm30684485', () => {
      if (this.physical.heapSelector.readUnsigned(0) === 3) this.gate('small-block heap termination30684491');
      const heap = this.retainedHeap('HeapDestroy');
      this.call('HeapDestroy', () => this.host.platform.win32HeapDestroy(heap));
      this.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).set(null); this.note('heapHandle.clear');
      this.heapTerminated = true;
    }, true);
  }
  snapshot() {
    return Object.freeze({ heapPhase: this.boundary && this.heapPhase === 'initializing' ? 'blocked' : this.heapPhase,
      locksPhase: this.boundary && this.locksPhase === 'initializing' ? 'blocked' : this.locksPhase,
      boundary: this.boundary, locksTerminated: this.locksTerminated, heapTerminated: this.heapTerminated,
      physical: this.physical, heaps: Object.freeze([...this.heaps]), allocations: Object.freeze([...this.allocations]),
      dynamicSections: Object.freeze([...this.dynamicSections].map(([fields, backing]) => Object.freeze({ fields, backing }))),
      trace: Object.freeze(this.trace.slice()) });
  }
}

/** Original public Engine facade. Its source profile, storage and trace strings
 * retain the earlier Engine behavior independently of Game admission. */
export class NativeEngineCrtOwner extends NativeModuleCrtOwner {
  constructor(host: NativeEngineCrtHost) { super(host, 'Engine', engineConstructionToken); }
}
/** One Game image/CRT owner for each selected lower platform. Callbacks are
 * retained once; later callers cannot replace an existing module's services. */
export class NativeGameCrtOwner extends NativeModuleCrtOwner {
  private constructor(host: NativeEngineCrtHost, token: object) {
    super(host, 'Game', token);
    Object.defineProperty(this, 'host', { value: host, writable: false, configurable: false });
  }
  /** The private registry, rather than caller-provided receipt objects, proves
   * that this is the selected platform's existing canonical Game owner. */
  static canonicalImageForPlatform(owner: NativeGameCrtOwner, platform: NativeEngineCrtPlatform,
    label: 'scriptAdminPropertyIdLiteral'): NativeValue<NativeHeapObjectViews> {
    if (!owner || gameOwners.get(platform) !== owner || owner.host.platform !== platform) {
      return unknown('Actual canonical Game CRT owner for this platform required');
    }
    return NativeModuleCrtOwner.canonicalImageForOwner(owner, label);
  }
  static forPlatform(host: NativeEngineCrtHost): NativeGameCrtOwner {
    const existing = gameOwners.get(host.platform);
    if (existing) {
      if (hostCallbacks.some(label => host[label] !== existing.host[label])) throw new Error('Conflicting services for the canonical Game CRT platform owner');
      return existing;
    }
    const retained: NativeEngineCrtHost = Object.freeze({ platform: host.platform,
      errnoSlot: host.errnoSlot, callNewHandler: host.callNewHandler, sleep: host.sleep,
      getLastError: host.getLastError, mapOsError: host.mapOsError });
    const owner = new NativeGameCrtOwner(retained, gameConstructionToken);
    gameOwners.set(host.platform, owner); return owner;
  }
}
export function createNativeGameCrtOwner(host: NativeEngineCrtHost): NativeGameCrtOwner { return NativeGameCrtOwner.forPlatform(host); }
export type NativeModuleCrtHost = NativeEngineCrtHost;
export type NativeModuleCrtPlatform = NativeEngineCrtPlatform;
export type { NativeCrtModule, NativeCrtSourceProfile, NativeCrtSourceRules } from './native-game-crt-profile';
