/** Selected ordinary Engine/Game DLL attach prefix. Original PE receipts own cold
 * globals; explicit platform calls own process outputs. Completing this prefix
 * does not complete DLL initialization or activate the browser NPC reader. */
import sourceText from '../../assets/gothic3/crt-bootstrap/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { admitGameCrtStartupSource, gameStartupInstructionPoints } from './native-game-crt-startup-source';
import type { NativeEngineCrtPlatform } from './native-engine-crt-locks';
import { NativeCrtThreadStartup } from './native-crt-thread-startup';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import type { NativeWin32HeapCapability } from './native-runtime-platform';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeGameCrtEnvironment } from './native-game-crt-environment';
import { NativeGameCrtIoInit } from './native-game-crt-ioinit';
import { NativeGameCrtArgv } from './native-game-crt-argv';
import { gameAttachContinuationInstructionPoints } from './native-game-crt-attach-source';
import type { NativeWin32ProcessInputEndpoints } from './native-win32-process-inputs';
import type { NativeBytePointer } from './native-pointer-geometry';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function failureReason(error: unknown): string {
  try {
    const value: unknown = error instanceof Error ? error.message : error;
    return typeof value === 'string' ? value : String(value);
  } catch { return 'Escaped bootstrap failure could not be described'; }
}
interface Receipt { module: string; address: string; bytes: number; raw: string; knownMask: string; }
interface SourceRules {
  schema: string; inputs: { Engine?: string; Game?: string };
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
  coldGlobals: Record<string, Receipt>; constBytes: Record<string, Receipt>;
}
const engineSource = JSON.parse(sourceText) as SourceRules;
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
function admitSource(crt: NativeModuleCrtOwner): SourceRules {
  const source = crt.module === 'Engine' ? engineSource : crt.sourceProfile.bootstrapRules as SourceRules;
  if (crt.module === 'Game') {
    admitGameCrtStartupSource(source, [...Object.keys(methodAddresses), 'heapInit', 'heapTerm', 'mtInit']);
    return source;
  }
  if (source.schema !== 'gothic3-crt-bootstrap-rules-v1' ||
      source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
      Object.entries(methodAddresses).some(([label, address]) => source.methods[label]?.entry !== address ||
        source.methods[label]?.body !== address || source.methods[label]?.bodyInstructionBytesSha256 !==
          methodHashes[label as keyof typeof methodAddresses])) {
    throw new Error('Selected Engine CRT bootstrap source receipt differs');
  }
  return source;
}
function originalStorage(table: 'coldGlobals' | 'constBytes', label: string, address: string, bytes: number,
  expected: string): NativeHeapObjectViews {
  const receipt = engineSource[table][label];
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
const physicalByCrt = new WeakMap<NativeModuleCrtOwner, PhysicalBootstrap>();
interface BootstrapConstruction {
  phase: 'constructing' | 'returned' | 'blocked';
  owner: NativeCrtBootstrap | null;
  boundary: string | null;
}
const bootstrapByCrt = new WeakMap<NativeModuleCrtOwner, BootstrapConstruction>();
const bootstrapConstructionToken = Object.freeze({});
function physicalFor(crt: NativeModuleCrtOwner): PhysicalBootstrap {
  let physical = physicalByCrt.get(crt);
  if (!physical) {
    const gameImage = (label: string): NativeHeapObjectViews => {
      const result = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
      if (!result.known) throw new Error(result.reason);
      return result.value;
    };
    physical = Object.freeze(crt.module === 'Game' ? {
      securityCookie: gameImage('securityCookie'),
      securityCookieComplement: gameImage('securityCookieComplement'),
      attachCount: gameImage('attachCount'), attachCallback: gameImage('attachCallback'),
      preCInitializerTable: gameImage('preCInitializerTable'),
    } : {
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
export type NativeCrtAttachOperationName = 'version.size.store' | 'GetVersionExA.return' |
  'version.platform.read' | 'version.build.read' | 'version.major.read' | 'version.minor.read' |
  'version.release.return' | 'os.platform.store' | 'os.version.store' | 'os.major.store' |
  'os.minor.store' | 'os.build.store' | 'heapInit.return' | 'mtInit.return' |
  'heapTerm.return' | 'preCInit.return' | 'GetCommandLineA.boundary' |
  'GetCommandLineA.return' | 'commandLinePointer.store' | 'environment.return' |
  'environmentBlock.store' | 'ioInit.boundary' | 'ioInit.enter' | 'ioInit.return' |
  'argv.enter' | 'argv.return' | 'argv.boundary' | 'crtAttach.return';
export interface NativeCrtAttachOperation {
  readonly operation: NativeCrtAttachOperationName;
  /** Load/store instruction, returned PC of a completed lower call, or reached
   * boundary. A descriptive attach-body return has no simulated PC. */
  readonly address: string | null;
  readonly value: number | boolean | null;
}
export interface NativeCrtAttachProgress {
  readonly module: 'Engine' | 'Game';
  readonly entry: string;
  readonly phase: Phase;
  /** Actual attach body result/boundary; null means its body has not returned
   * or interrupted. This is a description, never continuation authority. */
  readonly result: Readonly<NativeValue<number>> | null;
  readonly operations: readonly NativeCrtAttachOperation[];
  readonly versionRecord: Readonly<{ bytes: readonly number[]; knownMask: readonly number[];
    freed: boolean; retainedView: boolean }> | null;
  readonly versionAvailable: boolean | null;
  readonly heapResult: number | null;
  readonly mtResult: number | null;
  readonly preCReturned: boolean;
  readonly commandLineBoundary: Readonly<{ address: string; iat: string }> | null;
  /** Pointer results are described as NULL/non-NULL without inventing raw
   * numerical x86 addresses for the actual retained browser capabilities. */
  readonly commandLineReturned: boolean;
  readonly commandLineNonNull: boolean | null;
  readonly environmentReturned: boolean;
  readonly environmentNonNull: boolean | null;
  readonly environmentProgress: ReturnType<NativeGameCrtEnvironment['snapshot']> | null;
  readonly ioProgress: ReturnType<NativeGameCrtIoInit['snapshot']> | null;
  readonly ioResult: number | null;
  readonly argvProgress: ReturnType<NativeGameCrtArgv['snapshot']> | null;
  readonly argvResult: number | null;
  readonly nextBoundary: Readonly<{ name: 'ioInit'; address: string; target: string }> |
    Readonly<{ name: 'GetStartupInfoA' | 'HeapAlloc' | 'GetStdHandle' | 'GetFileType' | 'SetHandleCount'; address: string; iat: string }> |
    Readonly<{ name: 'calloc' | 'TlsGetValue' | 'FlsGetValue' | 'DecodePointer' | 'sectionInitializer'; address: string; target: string }> |
    Readonly<{ name: 'callerTest'; address: string; instruction: 'TEST EAX,EAX' }> |
    Readonly<{ name: string; address: string; instruction?: string; iat?: string; target?: string }> | null;
  readonly crtTraversalCompleted: false;
  readonly nativeModuleInstantiated: false;
}
interface StorageProof {
  readonly backing: NativeHeapObjectViews['backing'];
  readonly backingIdentity: object;
  readonly backingBytes: Uint8Array; readonly backingMasks: Uint8Array;
  readonly bytes: Uint8Array; readonly masks: Uint8Array; readonly view: DataView;
  readonly root: NativeMemoryBacking;
  readonly rootIdentity: object;
  readonly rootBytes: Uint8Array; readonly rootMasks: Uint8Array;
  readonly position: number; readonly length: number;
}
/** The same CRT owner supplies canonical OS fields, heap, TLS indexes and
 * pointer initialization slots. Runtime callbacks receive retained views. */
export class NativeCrtBootstrap {
  readonly #source: SourceRules;
  readonly #crt: NativeModuleCrtOwner;
  readonly physical: PhysicalBootstrap;
  readonly thread: NativeCrtThreadStartup;
  #boundary: string | null = null;
  readonly #trace: string[] = [];
  #cookiePhase: Phase = 'cold';
  #pointerPhase: Phase = 'cold';
  #attachPhase: Phase = 'cold';
  #entryPhase: Phase = 'cold';
  #attachResult: number | null = null;
  #entryResult: number | null = null;
  #entryArguments: { module: object | null; reason: 0 | 1 | 2 | 3; reserved: object | null } | null = null;
  #cookieFrame: NativeHeapObjectViews | null = null;
  #versionRecord: NativeHeapObjectViews | null = null;
  readonly #terminateTarget: NativeSourceProcedure;
  readonly #exitTarget: NativeSourceProcedure;
  readonly #active = new Set<string>();
  #lowerCall: string | null = null;
  readonly #storage = new WeakMap<NativeHeapObjectViews, StorageProof>();
  readonly #attachOperations: NativeCrtAttachOperation[] = [];
  #versionAvailable: boolean | null = null;
  #heapResult: number | null = null;
  #mtResult: number | null = null;
  #preCReturned = false;
  #commandLineBoundary: NativeCrtAttachProgress['commandLineBoundary'] = null;
  readonly #processInputs: NativeWin32ProcessInputEndpoints | null;
  readonly #environment: NativeValue<NativeGameCrtEnvironment> | null;
  readonly #io: NativeValue<NativeGameCrtIoInit> | null;
  readonly #argv: NativeValue<NativeGameCrtArgv> | null;
  readonly #argvSelected: boolean;
  readonly #ioCallPermit = Object.freeze({});
  readonly #argvCallPermit = Object.freeze({});
  #ioInvocationActive = false;
  #argvInvocationActive = false;
  #argvAttempted = false;
  #argvOutcome: NativeValue<void> | null = null;
  #argvResult: 0 | -1 | null = null;
  #ioResult: number | null = null;
  #commandLineReturned = false;
  #commandLineNonNull: boolean | null = null;
  #environmentReturned = false;
  #environmentNonNull: boolean | null = null;
  #nextBoundary: NativeCrtAttachProgress['nextBoundary'] = null;
  static forCrt(crt: NativeModuleCrtOwner): NativeCrtBootstrap {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt)) throw new Error('Actual constructed CRT owner required for bootstrap');
    const previous = bootstrapByCrt.get(crt);
    if (previous) {
      if (previous.phase === 'returned') return previous.owner!;
      previous.boundary ??= 'Reentrant CRT bootstrap construction cannot publish an incomplete owner';
      throw new Error(previous.boundary);
    }
    const retained: BootstrapConstruction = { phase: 'constructing', owner: null, boundary: null };
    bootstrapByCrt.set(crt, retained);
    try {
      const bootstrap = new NativeCrtBootstrap(crt, bootstrapConstructionToken);
      retained.owner = bootstrap;
      if (retained.boundary) throw new Error(retained.boundary);
      retained.phase = 'returned'; return bootstrap;
    } catch (error) {
      retained.phase = 'blocked';
      retained.boundary ??= failureReason(error);
      throw new Error(retained.boundary);
    }
  }
  /** Invoke the actual retained body without trusting replaceable instance
   * methods or descriptive snapshots. Platform lifetime is proved by callers. */
  static processAttachForCrt(bootstrap: NativeCrtBootstrap, crt: NativeModuleCrtOwner): NativeValue<number> {
    const retained = bootstrapByCrt.get(crt);
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || !bootstrap ||
        retained?.phase !== 'returned' || retained.owner !== bootstrap || bootstrap.#crt !== crt) {
      return unknown('Actual retained bootstrap and constructed same CRT owner required');
    }
    return bootstrap.#processAttach();
  }
  /** This private permit exists only around the reached original IO call.
   * Copied progress and an otherwise valid bootstrap cannot enter its frame. */
  static canonicalIoCallForCrt(bootstrap: NativeCrtBootstrap, crt: NativeModuleCrtOwner,
    permit: object): NativeValue<void> {
    const retained = bootstrapByCrt.get(crt);
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game' || !bootstrap ||
        retained?.phase !== 'returned' || retained.owner !== bootstrap || bootstrap.#crt !== crt ||
        bootstrap.#boundary !== null || bootstrap.#attachPhase !== 'running' ||
        !(bootstrap.#active.has(bootstrap.#name('crtAttach')) ||
          (bootstrap.#entryPhase === 'running' && bootstrap.#active.has(bootstrap.#name('entry')))) ||
        !bootstrap.#ioInvocationActive || permit !== bootstrap.#ioCallPermit ||
        bootstrap.#lowerCall !== 'ioInit204742ff at204678ce' ||
        bootstrap.#nextBoundary?.name !== 'ioInit' || bootstrap.#nextBoundary.address !== '204678ce' ||
        bootstrap.#nextBoundary.target !== '204742ff') {
      return unknown('Actual reached same-CRT Game attach I/O call permit required');
    }
    return known(undefined);
  }
  /** The reached caller and argv callee have a separate private scope. It is
   * entered while the original I/O callback still owns its real return, so a
   * copied result cannot acquire the returned physical register/stack bank. */
  static canonicalArgvCallForCrt(bootstrap: NativeCrtBootstrap, crt: NativeModuleCrtOwner,
    permit: object): NativeValue<void> {
    const retained = bootstrapByCrt.get(crt);
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game' || !bootstrap ||
        retained?.phase !== 'returned' || retained.owner !== bootstrap || bootstrap.#crt !== crt ||
        bootstrap.#boundary !== null || bootstrap.#attachPhase !== 'running' ||
        !(bootstrap.#active.has(bootstrap.#name('crtAttach')) ||
          (bootstrap.#entryPhase === 'running' && bootstrap.#active.has(bootstrap.#name('entry')))) ||
        !bootstrap.#ioInvocationActive || !bootstrap.#argvInvocationActive ||
        permit !== bootstrap.#argvCallPermit || bootstrap.#lowerCall !== 'ioInit204742ff at204678ce' ||
        !bootstrap.#argvAttempted || !bootstrap.#argv?.known) {
      return unknown('Actual reached same-CRT caller/argv invocation permit required');
    }
    return known(undefined);
  }
  private constructor(readonly crt: NativeModuleCrtOwner, token: object) {
    if (token !== bootstrapConstructionToken || new.target !== NativeCrtBootstrap ||
        !NativeModuleCrtOwner.isConstructedOwner(crt)) throw new Error('Private canonical CRT bootstrap construction required');
    this.#crt = crt;
    this.#source = admitSource(crt); this.physical = physicalFor(crt);
    for (const fields of Object.values(this.physical)) this.#pin(fields);
    this.#pin(crt.physical.crtOsFields);
    for (const fields of Object.values(crt.physical.pointerInitialization)) this.#pin(fields);
    this.#terminateTarget = Object.freeze({ identity: Object.freeze({}), owner: crt.identity, address: this.#address('terminatePointerTarget'),
      invoke: () => unknown('Unowned source terminate' + this.#address('terminatePointerTarget') + ' invocation') });
    this.#exitTarget = Object.freeze({ identity: Object.freeze({}), owner: crt.identity, address: this.#address('exitPointerTarget'),
      invoke: () => unknown('Unowned source __exit' + this.#address('exitPointerTarget') + ' invocation') });
    this.thread = new NativeCrtThreadStartup(Object.freeze({ crt, initPointers: () => this.#initializePointers(true) }));
    for (const [label, fields] of Object.entries(this.thread.physical)) {
      if (crt.module === 'Game') {
        const original = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
        if (!original.known) throw new Error(original.reason);
        const expected = original.value;
        // The thread owner creates a legitimate subview for MBC's counter;
        // all other Game fields are the exact canonical image view objects.
        const sameCounter = label === 'mbcRefCounter' && fields.backing === expected.backing &&
          fields.bytes.buffer === expected.bytes.buffer && fields.bytes.byteOffset === expected.bytes.byteOffset &&
          fields.bytes.length === expected.bytes.length && fields.knownMask.buffer === expected.knownMask.buffer &&
          fields.knownMask.byteOffset === expected.knownMask.byteOffset && fields.knownMask.length === expected.knownMask.length;
        if (fields !== expected && !sameCounter) throw new Error('Thread bootstrap dependency differs from canonical Game image: ' + label);
      }
      this.#pin(fields);
    }
    // Retain continuation owners before the selected attach's first execution.
    // Missing process services do not skip or prematurely run its native
    // prefix; their unknown result is consumed only at the reached call.
    this.#processInputs = crt.module === 'Game' ? crt.host.platform.processInputEndpoints ?? null : null;
    this.#environment = crt.module === 'Game' ? NativeGameCrtEnvironment.forCrt(crt) : null;
    this.#io = crt.module === 'Game' ? NativeGameCrtIoInit.forCrt(crt) : null;
    this.#argv = crt.module === 'Game' ? NativeGameCrtArgv.forCrt(crt) : null;
    this.#argvSelected = crt.module === 'Game' && NativeRuntimePlatform.argvNlsSelectionForPlatform(
      crt.host.platform as NativeRuntimePlatform).known;
    if (crt.module === 'Game') for (const label of ['commandLinePointer', 'environmentBlock']) {
      const fields = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
      if (!fields.known) throw new Error(fields.reason);
      this.#pin(fields.value);
    }
    // Retain dependency identities and prevent added method shadows while
    // preserving the thread owner's mutable destructor-callback hook. Native
    // cleanup rereads live TLS indices after this callback returns.
    Object.defineProperty(this.thread, 'freePtdCallback', {
      value: NativeCrtThreadStartup.prototype.freePtdCallback, writable: true, configurable: false,
    });
    for (const key of Reflect.ownKeys(this.thread)) if (key !== 'freePtdCallback') {
      Object.defineProperty(this.thread, key, { writable: false, configurable: false });
    }
    Object.seal(this.thread);
    Object.freeze(this);
  }
  #assertCrt(): void {
    if (!NativeModuleCrtOwner.isConstructedOwner(this.#crt) || this.crt !== this.#crt) {
      throw new Error('Bootstrap CRT dependencies differ from their retained construction');
    }
  }
  #pin(fields: NativeHeapObjectViews): void {
    if (this.#storage.has(fields)) return;
    const backing = fields.backing, root = 'region' in backing ? backing.region : backing;
    const position = ('region' in backing ? backing.offset : 0) + fields.bytes.byteOffset - backing.bytes.byteOffset;
    this.#storage.set(fields, Object.freeze({ backing, backingIdentity: backing.identity,
      backingBytes: backing.bytes, backingMasks: backing.knownMask,
      bytes: fields.bytes, masks: fields.knownMask, view: fields.view, root, rootIdentity: root.identity,
      rootBytes: root.bytes, rootMasks: root.knownMask, position, length: fields.bytes.length }));
    this.#checked(fields);
  }
  #sameStorage(fields: NativeHeapObjectViews, proof: StorageProof): boolean {
    const backing = fields.backing, root = 'region' in backing ? backing.region : backing;
    return backing === proof.backing && backing.identity === proof.backingIdentity &&
      backing.bytes === proof.backingBytes && backing.knownMask === proof.backingMasks && root === proof.root &&
      root.identity === proof.rootIdentity && root.bytes === proof.rootBytes && root.knownMask === proof.rootMasks &&
      fields.bytes === proof.bytes && fields.knownMask === proof.masks && fields.view === proof.view &&
      fields.bytes.length === proof.length && fields.knownMask.length === proof.length && proof.position >= 0 &&
      proof.position + proof.length <= root.bytes.length && root.knownMask.length === root.bytes.length &&
      proof.position === ('region' in backing ? backing.offset : 0) + fields.bytes.byteOffset - backing.bytes.byteOffset &&
      fields.bytes.buffer === root.bytes.buffer && fields.bytes.byteOffset === root.bytes.byteOffset + proof.position &&
      fields.knownMask.buffer === root.knownMask.buffer && fields.knownMask.byteOffset === root.knownMask.byteOffset + proof.position &&
      fields.view.buffer === fields.bytes.buffer && fields.view.byteOffset === fields.bytes.byteOffset &&
      fields.view.byteLength === proof.length;
  }
  #checked(fields: NativeHeapObjectViews): NativeHeapObjectViews {
    this.#assertCrt();
    const proof = this.#storage.get(fields);
    if (!proof || !this.#sameStorage(fields, proof) || proof.backing.freed || proof.root.freed) {
      throw new Error('Actual retained live bootstrap physical storage required');
    }
    return fields;
  }
  get #platform(): NativeCrtBootstrapPlatform { return this.#crt.host.platform; }
  #address(label: string): string { return this.#source.methods[label]!.entry; }
  #name(label: string): string { return label + this.#address(label); }
  #instruction(engine: string, label: keyof typeof gameStartupInstructionPoints): string {
    return this.#crt.module === 'Engine' ? engine : gameStartupInstructionPoints[label];
  }
  #point(engine: string, game: string): string { return this.#crt.module === 'Engine' ? engine : game; }
  #block(reason: string): void {
    this.#boundary ??= reason;
    if (this.#cookiePhase === 'running') this.#cookiePhase = 'blocked';
    if (this.#pointerPhase === 'running') this.#pointerPhase = 'blocked';
    if (this.#attachPhase === 'running') this.#attachPhase = 'blocked';
    if (this.#entryPhase === 'running') this.#entryPhase = 'blocked';
  }
  #run<T>(name: string, execute: () => T, nested = false): NativeValue<T> {
    if (this.#boundary) return unknown(this.#boundary);
    if (this.#active.has(name) || (!nested && this.#active.size !== 0)) {
      this.#block(name + ': Reentrant CRT bootstrap operation cannot replay its retained frame');
      return unknown(this.#boundary!);
    }
    this.#active.add(name);
    try {
      this.#assertCrt();
      const value = execute(); return this.#boundary ? unknown(this.#boundary) : known(value);
    }
    catch (error) {
      this.#block(name + ': ' + failureReason(error));
      return unknown(this.#boundary!);
    }
    finally { this.#active.delete(name); }
  }
  #call<T>(name: string, execute: () => NativeValue<T>): T {
    const before = this.#boundary;
    this.#trace.push(name + '.attempt');
    const previousCall = this.#lowerCall;
    this.#lowerCall = name;
    let result: NativeValue<T>;
    try { result = execute(); }
    finally { this.#lowerCall = previousCall; }
    if (this.#boundary !== before) throw new Error(this.#boundary!);
    this.#assertCrt();
    if (!result.known) throw new Error(name + ': ' + result.reason);
    this.#trace.push(name); return result.value;
  }
  #gate(name: string): never { this.#trace.push(name + '.boundary'); throw new Error('Unowned ' + name); }
  #u32(value: number): number {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Actual uint32 Win32 output required');
    return value;
  }
  #record(operation: NativeCrtAttachOperationName, value: number | boolean | null, address: string | null = null): void {
    if (this.#boundary) throw new Error(this.#boundary);
    this.#attachOperations.push(Object.freeze({ operation, address, value }));
  }
  initializeSecurityCookie(): NativeValue<void> {
    return this.#initializeSecurityCookie(false);
  }
  #initializeSecurityCookie(nested: boolean): NativeValue<void> {
    return this.#run(this.#name('securityInitCookie'), () => {
      if (this.#cookiePhase === 'returned') return;
      if (this.#cookiePhase !== 'cold') throw new Error('Suspended security cookie frame cannot replay');
      this.#cookiePhase = 'running';
      const frame = this.#cookieFrame = stackFrame(16);
      this.#pin(frame);
      let cookie = this.#checked(this.physical.securityCookie).readUnsigned(0); this.#trace.push('cookie.read' + this.#instruction('3068e9ab', 'cookieRead'));
      // EBP-8/EBP-4 FILETIME stores occur even for the existing-cookie branch.
      this.#checked(frame).writeUnsigned(8, 0); this.#trace.push('cookie.FILETIME.low.zero');
      this.#checked(frame).writeUnsigned(12, 0); this.#trace.push('cookie.FILETIME.high.zero');
      if (cookie === 0xbb40e64e || (cookie & 0xffff0000) === 0) {
        const fileTime = new NativeHeapObjectViews(frame.backing, 8, 8);
        this.#pin(fileTime);
        this.#call('GetSystemTimeAsFileTime', () => this.#platform.getSystemTimeAsFileTime?.(fileTime) ??
          unknown('Actual owned FILETIME writer required'));
        cookie = this.#checked(fileTime).readUnsigned(4) ^ this.#checked(fileTime).readUnsigned(0);
        cookie ^= this.#u32(this.#call('GetCurrentProcessId', () => this.#platform.getCurrentProcessId?.() ??
          unknown('Actual owned process ID call required')));
        cookie ^= this.#u32(this.#call('GetCurrentThreadId', () => this.#platform.getCurrentThreadId?.() ??
          unknown('Actual owned thread ID call required')));
        cookie ^= this.#u32(this.#call('GetTickCount', () => this.#platform.getTickCount?.() ??
          unknown('Actual owned tick count call required')));
        const counter = new NativeHeapObjectViews(frame.backing, 0, 8);
        this.#pin(counter);
        // Original caller ignores BOOL and reads the two actual output DWORDs.
        this.#call('QueryPerformanceCounter', () => this.#platform.queryPerformanceCounter?.(counter) ??
          unknown('Actual owned performance counter writer required'));
        cookie = (cookie ^ this.#checked(counter).readUnsigned(4) ^ this.#checked(counter).readUnsigned(0)) >>> 0;
        if (cookie === 0xbb40e64e) cookie = 0xbb40e64f;
        else if ((cookie & 0xffff0000) === 0) cookie = (cookie | (cookie << 16)) >>> 0;
        this.#checked(this.physical.securityCookie).writeUnsigned(0, cookie); this.#trace.push('cookie.store' + this.#instruction('3068ea26', 'cookieStore'));
      }
      this.#checked(this.physical.securityCookieComplement).writeUnsigned(0, (~cookie) >>> 0);
      this.#trace.push('cookieComplement.store');
      frame.backing.freed = true; this.#cookiePhase = 'returned'; this.#trace.push('cookie.frame.expire');
    }, nested);
  }
  initializePointers(): NativeValue<void> {
    return this.#initializePointers(false);
  }
  #initializePointers(nested: boolean): NativeValue<void> {
    if (nested && this.#active.size !== 0 &&
        (this.#attachPhase !== 'running' || this.#lowerCall !== this.#name('mtInit'))) {
      this.#block('Reentrant CRT pointer initialization outside the retained MT call is unowned');
      return unknown(this.#boundary!);
    }
    return this.#run(this.#name('initPointers'), () => {
      if (this.#pointerPhase === 'returned') return;
      if (this.#pointerPhase !== 'cold') throw new Error('Suspended pointer initialization cannot replay');
      this.#pointerPhase = 'running';
      const encodedNull = this.#call(this.#name('encodedNull'), () => NativeModuleCrtOwner.prototype.encodePointer.call(this.#crt, null));
      const slots = this.#crt.physical.pointerInitialization;
      const store = (label: string, fields: NativeHeapObjectViews, offset = 0) => {
        this.#checked(fields).pointer<object>(offset).set(encodedNull); this.#trace.push(label);
      };
      store(this.#name('initNewHandler') + '.store', slots.newHandler);
      store(this.#name('initSectionInitializer') + '.store', slots.sectionInitializer);
      store(this.#name('initInvalidParameter') + '.store', slots.invalidParameter);
      store(this.#name('initCrtReportHook') + '.store', slots.exceptionFilter);
      store(this.#name('initUnhandledException') + '.store', slots.mathError);
      for (let offset = 0; offset < 16; offset += 4) store(this.#name('initWinSignalPointers') + '.store' + offset, slots.winSignalPointers, offset);
      this.#trace.push(this.#name('initDebugReportNoop'));
      const terminate = this.#call(this.#name('initEhHooks') + '.encodeTerminate', () => NativeModuleCrtOwner.prototype.encodePointer.call(this.#crt, this.#terminateTarget));
      this.#checked(slots.terminateHandler).pointer<object>(0).set(terminate); this.#trace.push('terminateHandler.store' + this.#instruction('3068a93d', 'terminateStore'));
      const exit = this.#call(this.#name('initPointers') + '.encodeExit', () => NativeModuleCrtOwner.prototype.encodePointer.call(this.#crt, this.#exitTarget));
      this.#checked(slots.exitFunction).pointer<object>(0).set(exit); this.#trace.push('exitFunction.store' + this.#instruction('3067d3c0', 'exitStore'));
      this.#pointerPhase = 'returned';
    }, nested);
  }
  #preCInitialize(): void {
    // The source advances by four through the actual 64-pointer table.
    for (let offset = 0; offset < 256; offset += 4) {
      const procedure = this.#checked(this.physical.preCInitializerTable).pointer<NativeSourceProcedure>(offset).get();
      this.#trace.push(this.#name('preCInit') + '.read' + offset);
      if (procedure) this.#gate(this.#name('preCInit') + ' callback at' + this.#source.constBytes.preCInitializerTable!.address + '+' + offset);
    }
    this.#trace.push(this.#name('preCInit') + '.return');
  }
  #attach(): number {
    if (this.#attachPhase === 'returned') return this.#attachResult!;
    if (this.#attachPhase !== 'cold') throw new Error('Suspended DLL attach cannot replay');
    this.#attachPhase = 'running';
    const heap = this.#call('GetProcessHeap', () => this.#platform.getProcessHeap?.() ?? unknown('Actual process heap call required'));
    if (!heap) this.#gate('HeapAlloc(NULL,0,148) platform call');
    const backing = this.#call('HeapAlloc(processHeap,0,148)', () => this.#platform.win32HeapAlloc(heap, 0, 148));
    if (backing === null) return this.#finishAttach(0);
    if (backing.freed || backing.bytes.length !== 148 || backing.knownMask.length !== 148) throw new Error('Actual live OSVERSIONINFOA148B backing required');
    const fields = this.#versionRecord = new NativeHeapObjectViews(backing);
    this.#pin(fields);
    this.#checked(fields).writeUnsigned(0, 148); this.#trace.push('OSVERSIONINFOA.size.store');
    this.#record('version.size.store', 148, this.#point('306771b4', '2046781c'));
    const versionAvailable = this.#call('GetVersionExA', () => this.#platform.getVersionExA?.(fields) ??
      unknown('Actual owned GetVersionExA writer required'));
    this.#versionAvailable = versionAvailable;
    this.#record('GetVersionExA.return', versionAvailable, this.#point('306771bc', '20467824'));
    if (!versionAvailable) { this.#releaseVersion(backing); return this.#finishAttach(0); }
    const osPlatform = this.#checked(fields).readUnsigned(16);
    this.#record('version.platform.read', osPlatform, this.#point('306771ce', '20467836'));
    let build = this.#checked(fields).readUnsigned(12);
    this.#record('version.build.read', build, this.#point('306771d1', '20467839'));
    const major = this.#checked(fields).readUnsigned(4);
    this.#record('version.major.read', major, this.#point('306771d7', '2046783f'));
    const minor = this.#checked(fields).readUnsigned(8);
    this.#record('version.minor.read', minor, this.#point('306771dd', '20467845'));
    build &= 0x7fff;
    this.#releaseVersion(backing);
    if (osPlatform !== 2) build |= 0x8000;
    const os = this.#crt.physical.crtOsFields;
    // Actual original operand/store order, after the HeapFree call.
    this.#checked(os).writeUnsigned(0, osPlatform); this.#trace.push('os.platform.store' + this.#instruction('30677203', 'osPlatformStore'));
    this.#record('os.platform.store', osPlatform, this.#instruction('30677203', 'osPlatformStore'));
    const packedVersion = ((major << 8) + minor) >>> 0;
    this.#checked(os).writeUnsigned(8, packedVersion); this.#trace.push('os.version.store' + this.#instruction('30677214', 'osVersionStore'));
    this.#record('os.version.store', packedVersion, this.#instruction('30677214', 'osVersionStore'));
    this.#checked(os).writeUnsigned(12, major); this.#trace.push('os.major.store' + this.#instruction('3067721a', 'osMajorStore'));
    this.#record('os.major.store', major, this.#instruction('3067721a', 'osMajorStore'));
    this.#checked(os).writeUnsigned(16, minor); this.#trace.push('os.minor.store' + this.#instruction('3067721f', 'osMinorStore'));
    this.#record('os.minor.store', minor, this.#instruction('3067721f', 'osMinorStore'));
    this.#checked(os).writeUnsigned(4, build); this.#trace.push('os.build.store' + this.#instruction('30677225', 'osBuildStore'));
    this.#record('os.build.store', build, this.#instruction('30677225', 'osBuildStore'));
    const heapResult = this.#call(this.#name('heapInit'), () => NativeModuleCrtOwner.prototype.initHeap.call(this.#crt, 1));
    this.#heapResult = heapResult;
    this.#record('heapInit.return', heapResult, this.#point('30677230', '20467898'));
    if (heapResult === 0) return this.#finishAttach(0);
    const mtResult = this.#call(this.#name('mtInit'), () => NativeCrtThreadStartup.prototype.initialize.call(this.thread));
    this.#mtResult = mtResult;
    this.#record('mtInit.return', mtResult, this.#point('3067723e', '204678a6'));
    if (mtResult === 0) {
      this.#call(this.#name('heapTerm'), () => NativeModuleCrtOwner.prototype.terminateHeap.call(this.#crt));
      this.#record('heapTerm.return', null, this.#point('30677247', '204678af'));
      return this.#finishAttach(0);
    }
    this.#preCInitialize();
    this.#preCReturned = true;
    this.#record('preCInit.return', null, this.#point('30677251', '204678b9'));
    if (this.#crt.module === 'Engine' || !this.#processInputs) {
      this.#commandLineBoundary = Object.freeze({ address: this.#instruction('30677251', 'commandLineCall'),
        iat: this.#instruction('30afc69c', 'commandLineIat') });
      this.#record('GetCommandLineA.boundary', null, this.#commandLineBoundary.address);
      this.#gate('GetCommandLineA IAT' + this.#instruction('30afc69c', 'commandLineIat') + ' at' + this.#instruction('30677251', 'commandLineCall'));
    }
    const points = gameAttachContinuationInstructionPoints;
    const endpointProof = NativeRuntimePlatform.canonicalProcessInputEndpointsForPlatform(
      this.#crt.host.platform as NativeRuntimePlatform, this.#processInputs);
    this.#call('Game process input endpoint authority', () => endpointProof);
    const commandLine = this.#call('GetCommandLineA IAT' + points.commandLineIat + ' at' + points.commandLineCall,
      () => this.#processInputs!.getCommandLineA());
    this.#commandLineReturned = true; this.#commandLineNonNull = commandLine !== null;
    this.#record('GetCommandLineA.return', this.#commandLineNonNull, points.commandLineStore);
    this.#continuationPointerStore('commandLinePointer', commandLine);
    this.#record('commandLinePointer.store', this.#commandLineNonNull, points.commandLineStore);
    const environment = this.#call('crtGetEnvironmentStringsA' + points.environmentTarget + ' at' + points.environmentCall,
      () => this.#environment?.known
        ? NativeGameCrtEnvironment.captureForCrt(this.#environment.value, this.#crt)
        : unknown(this.#environment && !this.#environment.known ? this.#environment.reason : 'Actual retained Game environment owner required'));
    this.#environmentReturned = true; this.#environmentNonNull = environment !== null;
    this.#record('environment.return', this.#environmentNonNull, points.environmentStore);
    // Original caller stores EAX, including NULL, without a result test here.
    this.#continuationPointerStore('environmentBlock', environment);
    this.#record('environmentBlock.store', this.#environmentNonNull, points.environmentStore);
    this.#nextBoundary = Object.freeze({ name: 'ioInit', address: points.ioInitCall, target: points.ioInitTarget });
    this.#record('ioInit.boundary', null, points.ioInitCall);
    if (!this.#io?.known) this.#gate('ioInit' + points.ioInitTarget + ' at' + points.ioInitCall);
    const io = this.#io.value;
    this.#ioInvocationActive = true;
    try {
      const result = this.#call('ioInit' + points.ioInitTarget + ' at' + points.ioInitCall, () => {
        this.#record('ioInit.enter', null, points.ioInitCall);
        const returned = NativeGameCrtIoInit.enterForAttach(io, this.#crt, this, this.#ioCallPermit);
        if (!returned.known) return returned;
        const proof = NativeGameCrtIoInit.canonicalReturnedIoForCrt(io, this.#crt, this, this.#ioCallPermit);
        if (!proof.known) return proof;
        if (proof.value !== returned.value) return unknown('Actual ioInit result differs from its retained return');
        // Record the completed original call before the returned bank moves to
        // its caller. A later argv interruption does not undo the I/O return.
        this.#ioResult = proof.value;
        this.#record('ioInit.return', proof.value, '204678d3');
        if (this.#argv?.known) {
          const argv = this.#argv.value;
          this.#argvAttempted = true;
          this.#argvInvocationActive = true;
          try {
            this.#record('argv.enter', null, '204678d3');
            this.#argvOutcome = NativeGameCrtArgv.enterFromReturnedIoForAttach(
              argv, io, this.#crt, this, this.#ioCallPermit, this.#argvCallPermit);
            const actualReturn = NativeGameCrtArgv.canonicalReturnedArgvForCrt(
              argv, this.#crt, this, this.#argvCallPermit);
            if (actualReturn.known) {
              this.#argvResult = actualReturn.value;
              this.#record('argv.return', actualReturn.value, '204678e3');
            }
          } finally { this.#argvInvocationActive = false; }
        }
        return returned;
      });
      this.#ioResult = result;
    } finally {
      this.#ioInvocationActive = false;
      const reached = this.#argvAttempted && this.#argv?.known
        ? NativeGameCrtArgv.prototype.snapshot.call(this.#argv.value).nextBoundary
        : NativeGameCrtIoInit.prototype.snapshot.call(io).nextBoundary;
      this.#nextBoundary = !reached ? null : 'instruction' in reached
        ? Object.freeze({ name: reached.operation, address: reached.pc, instruction: reached.instruction })
        : 'iat' in reached
          ? Object.freeze({ name: reached.operation, address: reached.pc, iat: reached.iat })
          : Object.freeze({ name: reached.operation, address: reached.pc, target: reached.target });
    }
    if (this.#argvAttempted) {
      this.#record('argv.boundary', null, this.#nextBoundary?.address ?? null);
      this.#gate(this.#argvOutcome && !this.#argvOutcome.known ? this.#argvOutcome.reason
        : 'Unowned original Game continuation after caller/argv at' + (this.#nextBoundary?.address ?? 'unknown'));
    }
    if (this.#argvSelected && this.#argv && !this.#argv.known) {
      this.#gate('Game argv construction at204678d3: ' + this.#argv.reason);
    }
    this.#gate('caller TEST EAX,EAX at204678d3 after ioInit returned ' + this.#ioResult);
  }
  #continuationPointerStore(label: 'commandLinePointer' | 'environmentBlock', pointer: NativeBytePointer | null): void {
    const fields = NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, label);
    if (!fields.known) throw new Error(fields.reason);
    const physical = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(
      this.#crt.host.platform as NativeRuntimePlatform, this.#crt, label, 0, 4);
    if (!physical.known) throw new Error(physical.reason);
    NativeHeapObjectViews.prototype.pointer.call(this.#checked(fields.value), 0).set(pointer);
  }
  #releaseVersion(backing: NativeMemoryBacking): void {
    const heap = this.#call('GetProcessHeap.free', () => this.#platform.getProcessHeap?.() ?? unknown('Actual process heap call required'));
    if (!heap) this.#gate('HeapFree(NULL,0,OSVERSIONINFOA) platform call');
    // Original caller ignores HeapFree BOOL, including a known false result.
    const released = this.#call('HeapFree(processHeap,0,OSVERSIONINFOA)', () => this.#platform.win32HeapFree(heap, 0, backing));
    this.#record('version.release.return', released, this.#point(
      this.#versionAvailable ? '306771f2' : '306771cc', this.#versionAvailable ? '2046785a' : '20467834'));
  }
  #finishAttach(value: number): number {
    this.#record('crtAttach.return', value);
    this.#attachPhase = 'returned'; this.#attachResult = value; this.#trace.push('crtAttach.return' + value); return value;
  }
  processAttach(): NativeValue<number> {
    return NativeCrtBootstrap.processAttachForCrt(this, this.#crt);
  }
  #processAttach(): NativeValue<number> {
    return this.#run(this.#name('crtAttach'), () => this.#attach());
  }
  entry(module: object | null, reason: 0 | 1 | 2 | 3, reserved: object | null): NativeValue<number> {
    if (![0, 1, 2, 3].includes(reason) || (module !== null && typeof module !== 'object') ||
        (reserved !== null && typeof reserved !== 'object')) return unknown('Actual DLL entry module/reason/reserved arguments required');
    if (this.#entryArguments && (this.#entryArguments.module !== module || this.#entryArguments.reason !== reason ||
        this.#entryArguments.reserved !== reserved)) return unknown('Different DLL entry invocation requires a separate owned frame');
    return this.#run(this.#name('entry'), () => {
      if (this.#entryPhase === 'returned') return this.#entryResult!;
      if (this.#entryPhase !== 'cold') throw new Error('Suspended DLL entry cannot replay');
      this.#entryArguments = { module, reason, reserved };
      this.#entryPhase = 'running'; this.#trace.push(this.#name('entry') + '.reason' + reason);
      if (reason === 1) this.#call(this.#name('securityInitCookie'), () => this.#initializeSecurityCookie(true));
      this.#trace.push(this.#name('dllMainCrtStartup'));
      if (reason === 0 && this.#checked(this.physical.attachCount).readUnsigned(0) === 0) return this.#finishEntry(0);
      if (reason === 1 || reason === 2) {
        if (this.#checked(this.physical.attachCallback).pointer<object>(0).get() !== null) this.#gate('DllStartup attach callback' + this.#source.constBytes.attachCallback!.address);
        this.#trace.push('attachCallback.NULL');
        if (reason === 2) this.#gate(this.#name('crtAttach') + ' thread-attach branch' + this.#instruction('306772e1', 'threadAttachBranch'));
        if (this.#attach() === 0) return this.#finishEntry(0);
      }
      this.#gate(this.#crt.module + ' DllMain thunk' + this.#instruction('300350da', 'dllMainThunk') + ' / body' + this.#instruction('305eacb0', 'dllMainBody'));
    });
  }
  #finishEntry(value: number): number {
    this.#entryPhase = 'returned'; this.#entryResult = value; this.#trace.push('entry.return' + value); return value;
  }
  /** A copied description of the selected invocation and current retained
   * version bytes. It performs no native reads, calls or continuation. */
  attachProgress(): NativeCrtAttachProgress { return this.#attachProgress(); }
  #attachProgress(): NativeCrtAttachProgress {
    let versionRecord: NativeCrtAttachProgress['versionRecord'] = null;
    if (this.#versionRecord) {
      const proof = this.#storage.get(this.#versionRecord)!;
      let retainedView = false;
      try { retainedView = this.#sameStorage(this.#versionRecord, proof); }
      catch { /* A replaced/detached physical view remains descriptive only. */ }
      // Slice through Array's indexed access, so a detached diagnostic buffer
      // describes its remaining extent without invoking typed-array iteration.
      versionRecord = Object.freeze({ bytes: Object.freeze(Array.prototype.slice.call(proof.bytes) as number[]),
        knownMask: Object.freeze(Array.prototype.slice.call(proof.masks) as number[]),
        freed: proof.backing.freed || proof.root.freed, retainedView });
    }
    const result = this.#attachPhase === 'returned' ? Object.freeze(known(this.#attachResult!)) :
      this.#attachPhase === 'blocked' ? Object.freeze(unknown(this.#boundary!)) : null;
    return Object.freeze({ module: this.#crt.module, entry: this.#address('crtAttach'), phase: this.#attachPhase,
      result, operations: Object.freeze([...this.#attachOperations]), versionRecord,
      versionAvailable: this.#versionAvailable, heapResult: this.#heapResult, mtResult: this.#mtResult,
      preCReturned: this.#preCReturned, commandLineBoundary: this.#commandLineBoundary,
      commandLineReturned: this.#commandLineReturned, commandLineNonNull: this.#commandLineNonNull,
      environmentReturned: this.#environmentReturned, environmentNonNull: this.#environmentNonNull,
      environmentProgress: this.#environment?.known ? this.#environment.value.snapshot() : null,
      ioProgress: this.#io?.known ? NativeGameCrtIoInit.prototype.snapshot.call(this.#io.value) : null,
      ioResult: this.#ioResult,
      argvProgress: this.#argv?.known ? NativeGameCrtArgv.prototype.snapshot.call(this.#argv.value) : null,
      argvResult: this.#argvResult,
      nextBoundary: this.#nextBoundary,
      crtTraversalCompleted: false, nativeModuleInstantiated: false });
  }
  snapshot() {
    return Object.freeze({ boundary: this.#boundary, trace: Object.freeze([...this.#trace]),
      cookiePhase: this.#cookiePhase, pointerPhase: this.#pointerPhase, attachPhase: this.#attachPhase, entryPhase: this.#entryPhase,
      cookieFrame: this.#cookieFrame, versionRecord: this.#versionRecord, attachResult: this.#attachResult,
      entryResult: this.#entryResult, terminateTarget: this.#terminateTarget, exitTarget: this.#exitTarget,
      attachProgress: this.#attachProgress() });
  }
}
