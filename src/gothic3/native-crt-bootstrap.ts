/** Selected ordinary Engine DLL attach prefix. Original PE receipts own cold
 * globals; explicit platform calls own process outputs. Completing this prefix
 * does not complete DLL initialization or activate the browser NPC reader. */
import sourceText from '../../assets/gothic3/crt-bootstrap/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeEngineCrtOwner } from './native-engine-crt-locks';
import type { NativeEngineCrtPlatform } from './native-engine-crt-locks';
import { NativeCrtThreadStartup } from './native-crt-thread-startup';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import type { NativeWin32HeapCapability } from './native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
interface Receipt { module: string; address: string; bytes: number; raw: string; knownMask: string; }
interface SourceRules {
  schema: string; inputs: { Engine: string };
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
  coldGlobals: Record<string, Receipt>; constBytes: Record<string, Receipt>;
}
const source = JSON.parse(sourceText) as SourceRules;
const methodAddresses = {
  entry: '3067744b', securityInitCookie: '3068e9a5', dllMainCrtStartup: '30677355',
  crtAttach: '3067717c', initPointers: '3067d37b', encodedNull: '3067ded2',
  initNewHandler: '30682468', initSectionInitializer: '3069646a', initInvalidParameter: '30674c1a',
  initCrtReportHook: '3067ea79', initUnhandledException: '3069635c', initWinSignalPointers: '30695e68',
  initDebugReportNoop: '3068aadb', initEhHooks: '3068a932', preCInit: '3068e95d',
  exitPointerTarget: '3067d34c', terminatePointerTarget: '3068a8af',
} as const;
const methodHashes = {
  entry: '7ec9fce3005714965ffcee8db677493d5cd80ba76b77cd8607d6acd308968aa3',
  securityInitCookie: 'd16dc744a2f8e8c4ac820df33f2dfa9cd33fb0f975ed6a72e9ca00c544598362',
  dllMainCrtStartup: '059d5e2649932845d1602fbe799ffdfc6ae568551e1c14ca6261fc553014d739',
  crtAttach: '4ddaee6398011cae104f54fbdcdf8b081cc99fbf679b7891e58889edaca167ee',
  initPointers: '75b36e8d134a09652140704af9bc2bf3b7ab1c69d186ab15760e157e336bf36d',
  encodedNull: 'e58382981c7a36ba3f1066c370748dcc87e583c54e41f0a440673250d39cc7f3',
  initNewHandler: 'b2f1895bb3edc93338cd821c707563667418939c86c2a8dd33babfe858eea149',
  initSectionInitializer: 'da0319dbb69e9b87daf24144706d6b77118f83b80fd6511177758a26836b97ac',
  initInvalidParameter: 'f66630a394c7275fdf7f47284cc0bbd8f62f4e5116709a198f8d65d263c389f9',
  initCrtReportHook: 'c56ccd31e521fce5d21b817d0855d4fd34f9164f37931bcd31e9cb4b3a68ae72',
  initUnhandledException: 'ba0717c3a6445f4201e64ad5ef137d7b492c5bdc4094cd4ea121fad39cddd06c',
  initWinSignalPointers: '11ade662c208101fec51dec292225a2e71c5e6a0ba04175cd51c1e40155e768a',
  initDebugReportNoop: 'ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e',
  initEhHooks: '85ddef0f837752b989ffc5f0b571b2d47cf2a17678167f3853b4ba19e4da13c3',
  preCInit: '9494273de080a1ae1f5febcd211f7aa369cf7b67fb210565082775dc567468c6',
  exitPointerTarget: '56833d9b869d4a324b0aadced821b799bcf7f4b4cbc7324de29c74e4a8660b00',
  terminatePointerTarget: 'a6abaeaf8044e2844109750670956af176dbca658c1f6412fc107e6de09ff385',
} satisfies Record<keyof typeof methodAddresses, string>;
function admitSource(): void {
  if (source.schema !== 'gothic3-crt-bootstrap-rules-v1' ||
      source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
      Object.entries(methodAddresses).some(([label, address]) => source.methods[label]?.entry !== address ||
        source.methods[label]?.body !== address || source.methods[label]?.bodyInstructionBytesSha256 !==
          methodHashes[label as keyof typeof methodAddresses])) {
    throw new Error('Selected Engine CRT bootstrap source receipt differs');
  }
}
function originalStorage(table: 'coldGlobals' | 'constBytes', label: string, address: string, bytes: number,
  expected: string): NativeHeapObjectViews {
  const receipt = source[table][label];
  if (!receipt || receipt.module !== 'Engine' || receipt.address !== address || receipt.bytes !== bytes ||
      receipt.raw !== expected || receipt.knownMask !== 'ff'.repeat(bytes)) {
    throw new Error('Selected Engine CRT bootstrap original storage differs: ' + label);
  }
  return new NativeHeapObjectViews({ identity: Object.freeze({}), bytes: Uint8Array.from(expected.match(/../g)!,
    byte => Number.parseInt(byte, 16)), knownMask: new Uint8Array(bytes).fill(255), freed: false });
}
function stackFrame(bytes: number): NativeHeapObjectViews {
  return new NativeHeapObjectViews({ identity: Object.freeze({}), bytes: new Uint8Array(bytes),
    knownMask: new Uint8Array(bytes), freed: false });
}
interface NativeSourceProcedure {
  readonly identity: object; readonly owner: object; readonly address: string;
  invoke(): NativeValue<void>;
}
interface PhysicalBootstrap {
  securityCookie: NativeHeapObjectViews; securityCookieComplement: NativeHeapObjectViews;
  attachCount: NativeHeapObjectViews; attachCallback: NativeHeapObjectViews; preCInitializerTable: NativeHeapObjectViews;
}
const physicalByCrt = new WeakMap<NativeEngineCrtOwner, PhysicalBootstrap>();
const bootstrapByCrt = new WeakMap<NativeEngineCrtOwner, NativeCrtBootstrap>();
function physicalFor(crt: NativeEngineCrtOwner): PhysicalBootstrap {
  let physical = physicalByCrt.get(crt);
  if (!physical) {
    physical = Object.freeze({
      securityCookie: originalStorage('coldGlobals', 'securityCookie', '30ad43ec', 4, '4ee640bb'),
      securityCookieComplement: originalStorage('coldGlobals', 'securityCookieComplement', '30ad43f0', 4, 'b119bf44'),
      attachCount: originalStorage('coldGlobals', 'attachCount', '30af70d0', 4, '00000000'),
      attachCallback: originalStorage('constBytes', 'attachCallback', '30892dc0', 4, '00000000'),
      preCInitializerTable: originalStorage('constBytes', 'preCInitializerTable', '3094c89c', 256, '00'.repeat(256)),
    });
    physicalByCrt.set(crt, physical);
  }
  return physical;
}
export interface NativeCrtBootstrapPlatform extends NativeEngineCrtPlatform {
  getProcessHeap?(): NativeValue<NativeWin32HeapCapability | null>;
  getVersionExA?(fields: NativeHeapObjectViews): NativeValue<boolean>;
  getSystemTimeAsFileTime?(fields: NativeHeapObjectViews): NativeValue<void>;
  getCurrentProcessId?(): NativeValue<number>;
  getCurrentThreadId?(): NativeValue<number>;
  getTickCount?(): NativeValue<number>;
  queryPerformanceCounter?(fields: NativeHeapObjectViews): NativeValue<boolean>;
}
type Phase = 'cold' | 'running' | 'returned' | 'blocked';
/** The same CRT owner supplies canonical OS fields, heap, TLS indexes and
 * pointer initialization slots. Runtime callbacks receive retained views. */
export class NativeCrtBootstrap {
  readonly physical: PhysicalBootstrap;
  readonly thread: NativeCrtThreadStartup;
  private boundary: string | null = null;
  private readonly trace: string[] = [];
  private cookiePhase: Phase = 'cold';
  private pointerPhase: Phase = 'cold';
  private attachPhase: Phase = 'cold';
  private entryPhase: Phase = 'cold';
  private attachResult: number | null = null;
  private entryResult: number | null = null;
  private entryArguments: { module: object | null; reason: 0 | 1 | 2 | 3; reserved: object | null } | null = null;
  private cookieFrame: NativeHeapObjectViews | null = null;
  private versionRecord: NativeHeapObjectViews | null = null;
  private readonly terminateTarget: NativeSourceProcedure;
  private readonly exitTarget: NativeSourceProcedure;
  static forCrt(crt: NativeEngineCrtOwner): NativeCrtBootstrap {
    let bootstrap = bootstrapByCrt.get(crt);
    if (!bootstrap) { bootstrap = new NativeCrtBootstrap(crt); bootstrapByCrt.set(crt, bootstrap); }
    return bootstrap;
  }
  private constructor(readonly crt: NativeEngineCrtOwner) {
    admitSource(); this.physical = physicalFor(crt);
    this.terminateTarget = Object.freeze({ identity: Object.freeze({}), owner: crt.identity, address: '3068a8af',
      invoke: () => unknown('Unowned source terminate3068a8af invocation') });
    this.exitTarget = Object.freeze({ identity: Object.freeze({}), owner: crt.identity, address: '3067d34c',
      invoke: () => unknown('Unowned source __exit3067d34c invocation') });
    this.thread = new NativeCrtThreadStartup({ crt, initPointers: () => this.initializePointers() });
  }
  private get platform(): NativeCrtBootstrapPlatform { return this.crt.host.platform; }
  private run<T>(name: string, execute: () => T): NativeValue<T> {
    if (this.boundary) return unknown(this.boundary);
    try { const value = execute(); return this.boundary ? unknown(this.boundary) : known(value); }
    catch (error) {
      this.boundary ??= name + ': ' + (error instanceof Error ? error.message : String(error));
      return unknown(this.boundary);
    }
  }
  private call<T>(name: string, execute: () => NativeValue<T>): T {
    const before = this.boundary;
    this.trace.push(name + '.attempt');
    const result = execute();
    if (this.boundary !== before) throw new Error(this.boundary!);
    if (!result.known) throw new Error(name + ': ' + result.reason);
    this.trace.push(name); return result.value;
  }
  private gate(name: string): never { this.trace.push(name + '.boundary'); throw new Error('Unowned ' + name); }
  private u32(value: number): number {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Actual uint32 Win32 output required');
    return value;
  }
  initializeSecurityCookie(): NativeValue<void> {
    return this.run('securityInitCookie3068e9a5', () => {
      if (this.cookiePhase === 'returned') return;
      if (this.cookiePhase !== 'cold') throw new Error('Suspended security cookie frame cannot replay');
      this.cookiePhase = 'running';
      const frame = this.cookieFrame = stackFrame(16);
      let cookie = this.physical.securityCookie.readUnsigned(0); this.trace.push('cookie.read3068e9ab');
      // EBP-8/EBP-4 FILETIME stores occur even for the existing-cookie branch.
      frame.writeUnsigned(8, 0); this.trace.push('cookie.FILETIME.low.zero');
      frame.writeUnsigned(12, 0); this.trace.push('cookie.FILETIME.high.zero');
      if (cookie === 0xbb40e64e || (cookie & 0xffff0000) === 0) {
        const fileTime = new NativeHeapObjectViews(frame.backing, 8, 8);
        this.call('GetSystemTimeAsFileTime', () => this.platform.getSystemTimeAsFileTime?.(fileTime) ??
          unknown('Actual owned FILETIME writer required'));
        cookie = fileTime.readUnsigned(4) ^ fileTime.readUnsigned(0);
        cookie ^= this.u32(this.call('GetCurrentProcessId', () => this.platform.getCurrentProcessId?.() ??
          unknown('Actual owned process ID call required')));
        cookie ^= this.u32(this.call('GetCurrentThreadId', () => this.platform.getCurrentThreadId?.() ??
          unknown('Actual owned thread ID call required')));
        cookie ^= this.u32(this.call('GetTickCount', () => this.platform.getTickCount?.() ??
          unknown('Actual owned tick count call required')));
        const counter = new NativeHeapObjectViews(frame.backing, 0, 8);
        // Original caller ignores BOOL and reads the two actual output DWORDs.
        this.call('QueryPerformanceCounter', () => this.platform.queryPerformanceCounter?.(counter) ??
          unknown('Actual owned performance counter writer required'));
        cookie = (cookie ^ counter.readUnsigned(4) ^ counter.readUnsigned(0)) >>> 0;
        if (cookie === 0xbb40e64e) cookie = 0xbb40e64f;
        else if ((cookie & 0xffff0000) === 0) cookie = (cookie | (cookie << 16)) >>> 0;
        this.physical.securityCookie.writeUnsigned(0, cookie); this.trace.push('cookie.store3068ea26');
      }
      this.physical.securityCookieComplement.writeUnsigned(0, (~cookie) >>> 0);
      this.trace.push('cookieComplement.store');
      frame.backing.freed = true; this.cookiePhase = 'returned'; this.trace.push('cookie.frame.expire');
    });
  }
  initializePointers(): NativeValue<void> {
    return this.run('initPointers3067d37b', () => {
      if (this.pointerPhase === 'returned') return;
      if (this.pointerPhase !== 'cold') throw new Error('Suspended pointer initialization cannot replay');
      this.pointerPhase = 'running';
      const encodedNull = this.call('encodedNull3067ded2', () => this.crt.encodePointer(null));
      const slots = this.crt.physical.pointerInitialization;
      const store = (label: string, fields: NativeHeapObjectViews, offset = 0) => {
        fields.pointer<object>(offset).set(encodedNull); this.trace.push(label);
      };
      store('initNewHandler30682468.store', slots.newHandler);
      store('initSectionInitializer3069646a.store', slots.sectionInitializer);
      store('initInvalidParameter30674c1a.store', slots.invalidParameter);
      store('initCrtReportHook3067ea79.store', slots.exceptionFilter);
      store('initUnhandledException3069635c.store', slots.mathError);
      for (let offset = 0; offset < 16; offset += 4) store('initWinSignalPointers30695e68.store' + offset, slots.winSignalPointers, offset);
      this.trace.push('initDebugReportNoop3068aadb');
      const terminate = this.call('initEhHooks3068a932.encodeTerminate', () => this.crt.encodePointer(this.terminateTarget));
      slots.terminateHandler.pointer<object>(0).set(terminate); this.trace.push('terminateHandler.store3068a93d');
      const exit = this.call('initPointers3067d37b.encodeExit', () => this.crt.encodePointer(this.exitTarget));
      slots.exitFunction.pointer<object>(0).set(exit); this.trace.push('exitFunction.store3067d3c0');
      this.pointerPhase = 'returned';
    });
  }
  private preCInitialize(): void {
    // The source advances by four through the actual 64-pointer table.
    for (let offset = 0; offset < 256; offset += 4) {
      const procedure = this.physical.preCInitializerTable.pointer<NativeSourceProcedure>(offset).get();
      this.trace.push('preCInit3068e95d.read' + offset);
      if (procedure) this.gate('preCInit3068e95d callback at3094c89c+' + offset);
    }
    this.trace.push('preCInit3068e95d.return');
  }
  private attach(): number {
    if (this.attachPhase === 'returned') return this.attachResult!;
    if (this.attachPhase !== 'cold') throw new Error('Suspended DLL attach cannot replay');
    this.attachPhase = 'running';
    const heap = this.call('GetProcessHeap', () => this.platform.getProcessHeap?.() ?? unknown('Actual process heap call required'));
    if (!heap) this.gate('HeapAlloc(NULL,0,148) platform call');
    const backing = this.call('HeapAlloc(processHeap,0,148)', () => this.platform.win32HeapAlloc(heap, 0, 148));
    if (backing === null) return this.finishAttach(0);
    if (backing.freed || backing.bytes.length !== 148 || backing.knownMask.length !== 148) throw new Error('Actual live OSVERSIONINFOA148B backing required');
    const fields = this.versionRecord = new NativeHeapObjectViews(backing);
    fields.writeUnsigned(0, 148); this.trace.push('OSVERSIONINFOA.size.store');
    const versionAvailable = this.call('GetVersionExA', () => this.platform.getVersionExA?.(fields) ??
      unknown('Actual owned GetVersionExA writer required'));
    if (!versionAvailable) { this.releaseVersion(backing); return this.finishAttach(0); }
    const osPlatform = fields.readUnsigned(16);
    let build = fields.readUnsigned(12) & 0x7fff;
    const major = fields.readUnsigned(4), minor = fields.readUnsigned(8);
    this.releaseVersion(backing);
    if (osPlatform !== 2) build |= 0x8000;
    const os = this.crt.physical.crtOsFields;
    // Actual original operand/store order, after the HeapFree call.
    os.writeUnsigned(0, osPlatform); this.trace.push('os.platform.store30677203');
    os.writeUnsigned(8, ((major << 8) + minor) >>> 0); this.trace.push('os.version.store30677214');
    os.writeUnsigned(12, major); this.trace.push('os.major.store3067721a');
    os.writeUnsigned(16, minor); this.trace.push('os.minor.store3067721f');
    os.writeUnsigned(4, build); this.trace.push('os.build.store30677225');
    if (this.call('heapInit3068442b', () => this.crt.initHeap(1)) === 0) return this.finishAttach(0);
    if (this.call('mtInit3067e2d9', () => this.thread.initialize()) === 0) {
      this.call('heapTerm30684485', () => this.crt.terminateHeap()); return this.finishAttach(0);
    }
    this.preCInitialize();
    this.gate('GetCommandLineA IAT30afc69c at30677251');
  }
  private releaseVersion(backing: NativeMemoryBacking): void {
    const heap = this.call('GetProcessHeap.free', () => this.platform.getProcessHeap?.() ?? unknown('Actual process heap call required'));
    if (!heap) this.gate('HeapFree(NULL,0,OSVERSIONINFOA) platform call');
    // Original caller ignores HeapFree BOOL, including a known false result.
    this.call('HeapFree(processHeap,0,OSVERSIONINFOA)', () => this.platform.win32HeapFree(heap, 0, backing));
  }
  private finishAttach(value: number): number {
    this.attachPhase = 'returned'; this.attachResult = value; this.trace.push('crtAttach.return' + value); return value;
  }
  processAttach(): NativeValue<number> {
    return this.run('crtAttach3067717c', () => this.attach());
  }
  entry(module: object | null, reason: 0 | 1 | 2 | 3, reserved: object | null): NativeValue<number> {
    if (![0, 1, 2, 3].includes(reason) || (module !== null && typeof module !== 'object') ||
        (reserved !== null && typeof reserved !== 'object')) return unknown('Actual DLL entry module/reason/reserved arguments required');
    if (this.entryArguments && (this.entryArguments.module !== module || this.entryArguments.reason !== reason ||
        this.entryArguments.reserved !== reserved)) return unknown('Different DLL entry invocation requires a separate owned frame');
    return this.run('entry3067744b', () => {
      if (this.entryPhase === 'returned') return this.entryResult!;
      if (this.entryPhase !== 'cold') throw new Error('Suspended DLL entry cannot replay');
      this.entryArguments = { module, reason, reserved };
      this.entryPhase = 'running'; this.trace.push('entry3067744b.reason' + reason);
      if (reason === 1) this.call('securityInitCookie3068e9a5', () => this.initializeSecurityCookie());
      this.trace.push('dllMainCrtStartup30677355');
      if (reason === 0 && this.physical.attachCount.readUnsigned(0) === 0) return this.finishEntry(0);
      if (reason === 1 || reason === 2) {
        if (this.physical.attachCallback.pointer<object>(0).get() !== null) this.gate('DllStartup attach callback30892dc0');
        this.trace.push('attachCallback.NULL');
        if (reason === 2) this.gate('crtAttach3067717c thread-attach branch306772e1');
        if (this.attach() === 0) return this.finishEntry(0);
      }
      this.gate('Engine DllMain thunk300350da / body305eacb0');
    });
  }
  private finishEntry(value: number): number {
    this.entryPhase = 'returned'; this.entryResult = value; this.trace.push('entry.return' + value); return value;
  }
  snapshot() {
    return Object.freeze({ boundary: this.boundary, trace: Object.freeze([...this.trace]),
      cookiePhase: this.cookiePhase, pointerPhase: this.pointerPhase, attachPhase: this.attachPhase, entryPhase: this.entryPhase,
      cookieFrame: this.cookieFrame, versionRecord: this.versionRecord, attachResult: this.attachResult,
      entryResult: this.entryResult, terminateTarget: this.terminateTarget, exitTarget: this.exitTarget });
  }
}
