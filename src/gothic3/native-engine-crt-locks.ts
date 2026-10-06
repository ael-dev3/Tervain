/** Engine CRT heap/lock-table owner. OS initialization, TLS errno, CRT fatal
 * handling and the encoded section-procedure resolver remain explicit gates.
 * The selected platform supplies the lower Win32 heap/section capabilities. */
import sourceText from '../../assets/gothic3/crt-undname/runtime-rules.json?raw';
import bootstrapText from '../../assets/gothic3/crt-bootstrap/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import { NativeWin32PlatformException } from './native-runtime-platform';
import type { NativeWin32HeapCapability, NativeWin32ModuleCapability, NativeCrtPointerProcedure, NativeCrtSectionProcedure, NativeCrtLocalProcedure, NativeCrtLocalGetProcedure, NativeCrtPlatformProcedure } from './native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
interface SourceRules {
  schema: string; inputs: { Engine: string };
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
  coldGlobals: Record<string, { module: string; address: string; bytes: number; raw: string; knownMask: string;
    scope: string; liveValueCaptured: boolean }>;
  constBytes: Record<string, { address: string; raw: string }>;
}
const source = JSON.parse(sourceText) as SourceRules;
const bootstrap = JSON.parse(bootstrapText) as SourceRules;
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
  createWin32Heap(owner: object, options: 0 | 1, initialBytes: 4096, maximumBytes: 0): NativeValue<NativeWin32HeapCapability | null>;
  win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0 | 8, bytes: number): NativeValue<NativeMemoryBacking | null>;
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

export class NativeEngineCrtOwner {
  readonly identity = Object.freeze({});
  readonly physical = (() => { const sectionInitializer = storage('crtSectionInitializer', '30af7c50', 4); return Object.freeze({
    heapHandle: storage('crtHeapHandle', '30af76f4', 4),
    heapSelector: storage('crtHeapMode', '30af7e20', 4),
    lockTable: storage('crtLockTable', '30ad4aa0', 288),
    staticSections: storage('crtStaticSections', '30af75a0', 336),
    crtOsFields: storage('crtOsFields', '30af70f8', 20),
    mallocWait: storage('crtMallocRetry', '30af70f0', 4),
    newMode: storage('newMode', '30af76f8', 4),
    crtTypeInfoList: storage('crtTypeInfoList', '30af70ac', 8),
    sectionInitializer,
    crtTlsIndexes: storage('crtTlsIndexes', '30ad4840', 8),
    pointerInitialization: Object.freeze({
      newHandler: bootstrapStorage('newHandler', '30af759c', 4),
      sectionInitializer,
      invalidParameter: bootstrapStorage('invalidParameter', '30af70c8', 4),
      exceptionFilter: bootstrapStorage('exceptionFilter', '30af7474', 4),
      mathError: bootstrapStorage('mathError', '30af7c4c', 4),
      winSignalPointers: bootstrapStorage('winSignalPointers', '30af7c38', 16),
      terminateHandler: bootstrapStorage('terminateHandler', '30af7744', 4),
      exitFunction: bootstrapStorage('exitHandler', '30ad4830', 4, '4cd36730'),
    }),
  }); })();
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
  constructor(readonly host: NativeEngineCrtHost) { admitSource(); }
  private run<T>(name: string, execute: () => T, cleanup = false, failureKey: string | object = name): NativeValue<T> {
    if (this.boundary && (!cleanup || this.failedOperations.has(failureKey))) return unknown(this.boundary);
    try { return known(execute()); }
    catch (error) {
      const reason = name + ': ' + (error instanceof Error ? error.message : String(error));
      this.boundary ??= reason; this.failedOperations.add(failureKey); return unknown(reason);
    }
  }
  private call<T>(name: string, execute: () => NativeValue<T>, retain?: (value: T) => void): T {
    const before = this.boundary;
    this.trace.push(name + '.attempt');
    const result = execute();
    if (result.known) retain?.(result.value);
    if (this.boundary !== before) throw new Error(this.boundary!);
    if (!result.known) throw new Error(name + ': ' + result.reason);
    this.trace.push(name); return result.value;
  }
  private gate(name: string): never { this.trace.push(name + '.boundary'); throw new Error('Unowned ' + name); }
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
    if (!this.heaps.has(heap) || heap.owner !== this.identity) throw new Error('Actual same-owner Engine CRT heap handle required');
    return heap;
  }
  private retainedHeap(operation: 'HeapFree' | 'HeapDestroy'): NativeWin32HeapCapability {
    const heap = this.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).get();
    if (!heap) this.gate(operation + '(NULL) platform call');
    if (!this.heaps.has(heap) || heap.owner !== this.identity) throw new Error('Actual same-owner Engine CRT heap handle required');
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
    fields.writeUnsigned(0, value); this.trace.push('errno.store' + value);
  }
  private selectHeap(): number {
    this.trace.push('getOsPlatform3067d032');
    const platform = this.physical.crtOsFields.readUnsigned(0);
    if (platform === 0) {
      this.errno(22);
      this.gate('invalidParameter30674d58 after getOsPlatform failure');
    }
    this.trace.push('getWinMajor3067d0e1');
    // The source accessor tests the SAME OS platform field before reading major.
    if (this.physical.crtOsFields.readUnsigned(0) === 0) {
      this.errno(22); this.gate('invalidParameter30674d58 after getWinMajor failure');
    }
    const major = this.physical.crtOsFields.readUnsigned(12);
    return platform === 2 && major >= 5 ? 1 : 3;
  }
  private osField(method: 'getOsPlatform3067d032' | 'getWinMajor3067d0e1', offset: 0 | 12): number {
    this.trace.push(method);
    if (this.physical.crtOsFields.readUnsigned(0) === 0) {
      this.errno(22); this.gate('invalidParameter30674d58 after ' + method + ' failure');
    }
    return this.physical.crtOsFields.readUnsigned(offset);
  }
  private codec(value: object | null, direction: 'EncodePointer' | 'DecodePointer'): object | null {
    const method = direction === 'EncodePointer' ? 'encodePointer3067de64' : 'decodePointer3067dedb';
    this.trace.push(method);
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
    const moduleName = literal('pointerKernel32Module', '3089377c', 'KERNEL32.DLL') as 'KERNEL32.DLL';
    const module = this.call('GetModuleHandleA(' + moduleName + ')', () => this.host.platform.getWin32ModuleHandle?.(moduleName) ?? unknown('Actual owned CRT Win32 module lookup required'));
    if (module === null) return value;
    this.pointerAvailable();
    const label = direction === 'EncodePointer' ? 'encodePointerName' : 'decodePointerName';
    const address = direction === 'EncodePointer' ? '3089376c' : '3089378c';
    const name = literal(label, address, direction) as 'EncodePointer' | 'DecodePointer';
    const procedure = this.call('GetProcAddress(' + name + ')', () => this.host.platform.getWin32Procedure?.(module, name) ?? unknown('Actual owned CRT Win32 procedure lookup required'));
    if (procedure === null) return value;
    if (procedure.name !== direction) throw new Error('Actual matching owned CRT pointer procedure required');
    return this.call(direction, () => procedure.invoke(value));
  }
  private pointerAvailable(): boolean {
    this.trace.push('pointerEncodingAvailability3067ddf8');
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
        const moduleName = literal('kernel32Module', '3089eb80', 'kernel32.dll') as 'kernel32.dll';
        const module = this.call('GetModuleHandleA(' + moduleName + ')', () => this.host.platform.getWin32ModuleHandle?.(moduleName) ?? unknown('Actual owned section initializer module lookup required'));
        if (module !== null) {
          const name = literal('initializeCriticalSectionAndSpinCountName', '3089eb58', 'InitializeCriticalSectionAndSpinCount') as 'InitializeCriticalSectionAndSpinCount';
          const resolved = this.call('GetProcAddress(' + name + ')', () => this.host.platform.getWin32Procedure?.(module, name) ?? unknown('Actual owned section initializer procedure lookup required'));
          if (resolved !== null) {
            if (resolved.name !== name) throw new Error('Actual matching owned section procedure required'); procedure = resolved;
          }
        }
      }
      selected = procedure ?? this.fallbackSectionProcedure;
      const cached = this.codec(selected, 'EncodePointer');
      this.physical.sectionInitializer.pointer<object>(0).set(cached); this.trace.push('sectionInitializer.cache');
    }
    const procedure = selected as NativeCrtSectionProcedure;
    if (procedure.name !== 'InitializeCriticalSectionAndSpinCount' || typeof procedure.invoke !== 'function') {
      throw new Error('Decoded section initializer has no actual owned procedure capability');
    }
    return this.call('crtInitCritSecAndSpinCount30696484.call4000', () => {
      try { return procedure.invoke(fields, this.identity, 4000); }
      catch (error) {
        if (!(error instanceof NativeWin32PlatformException) || error.code !== 0xc0000017) throw error;
        this.trace.push('initCritSecExceptionFilter3069650a(0xc0000017)');
        this.call('SetLastError(8)', () => this.host.platform.setWin32LastError?.(8) ?? unknown('Actual owned Win32 SetLastError capability required'));
        this.trace.push('initCritSecExceptionHandler30696521.return0'); return known(false);
      }
    });
  }
  initHeap(argument = 1): NativeValue<number> {
    if (this.heapTerminated) return unknown('Engine CRT heap lifetime has ended');
    if (this.heapPhase === 'ready') return known(1);
    if (this.heapPhase === 'null') return known(0);
    if (this.heapPhase === 'initializing') { this.boundary ??= 'Reentrant Engine CRT heap initialization'; return unknown(this.boundary); }
    return this.run('heapInit3068442b', () => {
      if (!Number.isInteger(argument) || argument < 0 || argument > 0xffffffff) throw new Error('Original uint32 heap-init argument required');
      if (this.heapTerminated) throw new Error('Engine CRT heap lifetime has ended');
      this.heapPhase = 'initializing';
      const heap = this.call('HeapCreate', () => this.host.platform.createWin32Heap(this.identity, argument === 0 ? 1 : 0, 4096, 0),
        value => { if (value) this.heaps.add(value); });
      this.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).set(heap); this.trace.push('heapHandle.publish');
      if (heap === null) { this.heapPhase = 'null'; return 0; }
      if (heap.owner !== this.identity) throw new Error('HeapCreate returned a different physical heap owner');
      const mode = this.selectHeap();
      this.physical.heapSelector.writeUnsigned(0, mode); this.trace.push('heapSelector.store' + mode);
      if (mode === 3) this.gate('smallBlockHeapInit3068347a(1016)');
      this.heapPhase = 'ready'; return 1;
    });
  }
  initLocks(): NativeValue<number> {
    if (this.locksTerminated) return unknown('Engine CRT lock-table lifetime has ended');
    if (this.locksPhase === 'ready') return known(1);
    if (this.locksPhase === 'null') return known(0);
    if (this.locksPhase === 'initializing') { this.boundary ??= 'Reentrant Engine CRT static-lock initialization'; return unknown(this.boundary); }
    return this.run('mtInitLocks30683218', () => {
      if (this.locksTerminated) throw new Error('Engine CRT lock-table lifetime has ended');
      this.locksPhase = 'initializing'; let index = 0;
      for (let id = 0; id < 36; id++) if (this.physical.lockTable.readUnsigned(id * 8 + 4) === 1) {
        if (index >= 14) throw new Error('Source static-section storage exhausted');
        const fields = new NativeHeapObjectViews(this.physical.staticSections.backing, index++ * 24, 24);
        this.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).set(fields); this.trace.push('lock' + id + '.static.publish');
        this.trace.push('lock' + id + '.initialize4000'); const initialized = this.initializeSection(fields);
        if (!initialized) {
          this.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).set(null); this.trace.push('lock' + id + '.static.clear');
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
      fields.writeUnsigned(0, mapped); this.trace.push('errno.store' + mapped);
    }
  }
  free(backing: NativeMemoryBacking | null): NativeValue<void> { return this.run('free30672f8a', () => this.release(backing), true, backing ?? 'freeNULL'); }
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
      this.trace.push('lock' + id + '.initialize4000'); const initialized = this.initializeSection(fields);
      if (!initialized) {
        this.release(backing); this.errno(12); result = 0;
      } else {
        this.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).set(fields); this.trace.push('lock' + id + '.dynamic.publish');
      }
    } else { this.trace.push('lock' + id + '.race.free'); this.release(backing); }
    this.leave(10); return result;
  }
  ensureLock(id: number): NativeValue<number> {
    return this.run('ensureLock306832e3', () => {
      if (this.locksTerminated) throw new Error('Engine CRT lock-table lifetime has ended');
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
      if (this.locksTerminated) throw new Error('Engine CRT lock-table lifetime has ended'); this.enter(id);
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
          this.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).set(null); this.trace.push('lock' + id + '.dynamic.clear');
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
      this.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).set(null); this.trace.push('heapHandle.clear');
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
