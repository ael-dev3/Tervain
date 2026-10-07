/** Actual Game ioInit source calls, physical frames and normal return. Current
 * virtual handles and cached section procedures control the reached path;
 * native exception dispatch and the caller's remaining CRT work stay unowned. */
import type { NativeValue } from './dialogue';
import { NativeCrtBootstrap } from './native-crt-bootstrap';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import type { NativeHeapObjectViews } from './native-heap-views';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeX86ThreadStack } from './native-x86-thread-stack';
import type { NativeX86Word32 } from './native-x86-thread-stack';
import { admitGameIoStartupSource, gameIoStartupInstruction, gameIoStartupImageReceipt } from './native-game-crt-io-source';
import { admitGameIoWriterSource, gameIoWriterStartupInstruction } from './native-game-crt-io-writer-source';
import { admitGameIoAllocationSource, gameIoAllocationInstruction, gameIoAllocationImageReceipt } from './native-game-crt-io-allocation-source';
import { admitGameIoCompletionSource, gameIoCompletionInstruction, gameIoCompletionImageReceipt } from './native-game-crt-io-completion-source';
import type { NativeStandardIoCallSite } from './native-win32-standard-io';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function fact<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function reason(error: unknown): string {
  try { return error instanceof Error ? error.message : String(error); }
  catch { return 'Game ioInit escaped without an owned error description'; }
}
type Phase = 'cold' | 'invoking' | 'blocked' | 'returned';
interface Construction {
  phase: 'constructing' | 'returned' | 'blocked'; owner: NativeGameCrtIoInit | null; boundary: string | null;
}
interface IoEffect {
  readonly pc: string; readonly operation: string;
}
export type NativeGameCrtIoInitNextBoundary =
  | Readonly<{ pc: '20474314'; iat: '207d7c1c'; operation: 'GetStartupInfoA' }>
  | Readonly<{ pc: '20474327'; target: '204683ce'; operation: 'calloc' }>
  | Readonly<{ pc: '20477ce8'; iat: '207d7b84'; operation: 'HeapAlloc' }>
  | Readonly<{ pc: '204744b4'; iat: '207d7bbc'; operation: 'GetStdHandle' }>
  | Readonly<{ pc: '204744c6'; iat: '207d7c18'; operation: 'GetFileType' }>
  | Readonly<{ pc: '2047451e'; iat: '207d7c14'; operation: 'SetHandleCount' }>
  | Readonly<{ pc: '20467de8' | '20467dff'; target: 'ESI'; operation: 'TlsGetValue' }>
  | Readonly<{ pc: '20467e01'; target: 'EAX'; operation: 'FlsGetValue' }>
  | Readonly<{ pc: '20467e3d'; target: 'EAX'; operation: 'DecodePointer' }>
  | Readonly<{ pc: '20474246'; target: 'ESI'; operation: 'sectionInitializer' }>
  | Readonly<{ pc: '204678d3'; instruction: 'TEST EAX,EAX'; operation: 'callerTest' }>;
const standardIoBoundaries: Readonly<Record<NativeStandardIoCallSite, NativeGameCrtIoInitNextBoundary>> = Object.freeze({
  '204744b4': Object.freeze({ pc: '204744b4', iat: '207d7bbc', operation: 'GetStdHandle' }),
  '204744c6': Object.freeze({ pc: '204744c6', iat: '207d7c18', operation: 'GetFileType' }),
  '2047451e': Object.freeze({ pc: '2047451e', iat: '207d7c14', operation: 'SetHandleCount' }),
  '20467de8': Object.freeze({ pc: '20467de8', target: 'ESI', operation: 'TlsGetValue' }),
  '20467dff': Object.freeze({ pc: '20467dff', target: 'ESI', operation: 'TlsGetValue' }),
  '20467e01': Object.freeze({ pc: '20467e01', target: 'EAX', operation: 'FlsGetValue' }),
  '20467e3d': Object.freeze({ pc: '20467e3d', target: 'EAX', operation: 'DecodePointer' }),
  '20474246': Object.freeze({ pc: '20474246', target: 'ESI', operation: 'sectionInitializer' }),
});
const owners = new WeakMap<NativeModuleCrtOwner, Construction>();
const constructionToken = Object.freeze({});

/** One retained actual attach invocation. A suspended frame cannot be replayed
 * from its descriptive snapshot or from a new caller-supplied permit. */
export class NativeGameCrtIoInit {
  readonly #crt: NativeModuleCrtOwner;
  readonly #platform: NativeRuntimePlatform;
  readonly #controller = Object.freeze({});
  readonly #cookie: NativeHeapObjectViews;
  readonly #scope: NativeHeapObjectViews;
  readonly #stack: NativeX86ThreadStack;
  #phase: Phase = 'cold';
  #pc = '204678ce';
  #boundary: string | null = null;
  #bootstrap: NativeCrtBootstrap | null = null;
  #permit: object | null = null;
  #incomingCallCompleted = false;
  #prologReturned = false;
  #fsPublished = false;
  #startupInfo: NativeHeapObjectViews | null = null;
  #writerBoundaryReached = false;
  #callocBoundaryReached = false;
  #callocScope: NativeHeapObjectViews | null = null;
  #callocCalled = false;
  #callocImplActive = false;
  #nestedPrologReturned = false;
  #nestedEpilogReturned = false;
  #callocReturned = false;
  #heapAllocBoundaryReached = false;
  #ioBlockPublished = false;
  #ioCountPublished = false;
  #initializedRecordCount = 0;
  #standardInputArgumentPrepared = false;
  #standardHandleBoundaryReached = false;
  #completionSourceAdmitted = false;
  #standardLoopActive = false;
  #standardIoCallSite: NativeStandardIoCallSite | null = null;
  #sectionScope: NativeHeapObjectViews | null = null;
  #sectionActive = false;
  #sectionPrologReturned = false;
  #sectionEpilogActive = false;
  #sectionEpilogReturned = false;
  #decodeActive = false;
  #outerEpilogActive = false;
  #outerEpilogReturned = false;
  #callerReturnConsumed = false;
  #ioResult: 0 | -1 | null = null;
  #suspension: Readonly<NativeValue<void>> | null = null;
  readonly #effects: IoEffect[] = [];

  private constructor(crt: NativeModuleCrtOwner, token: object, entry: Construction) {
    if (token !== constructionToken || new.target !== NativeGameCrtIoInit || owners.get(crt) !== entry ||
        entry.phase !== 'constructing' || entry.owner !== null) throw new Error('Actual retained Game ioInit construction required');
    admitGameIoStartupSource();
    this.#crt = crt; this.#platform = crt.host.platform as NativeRuntimePlatform;
    this.#requireCrt();
    this.#cookie = fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, 'securityCookie'));
    this.#scope = fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, 'ioInitEH4Scope'));
    const receipt = gameIoStartupImageReceipt('ioInitEH4Scope');
    if (receipt.address !== '206e8e90' || receipt.bytes !== 28) throw new Error('Original Game ioInit scope differs');
    this.#stack = fact(NativeX86ThreadStack.forPlatform(this.#platform));
    entry.owner = this;
    fact(NativeX86ThreadStack.bindForIoOwner(this.#stack, crt, this, this.#controller));
    this.#requireImages(); Object.freeze(this);
  }

  static forCrt(crt: NativeModuleCrtOwner): NativeValue<NativeGameCrtIoInit> {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game') return unknown('Actual constructed Game CRT required for ioInit');
    const retained = owners.get(crt);
    if (retained) {
      if (retained.phase === 'constructing') { retained.phase = 'blocked'; retained.boundary = 'Reentrant Game ioInit construction cannot restart'; }
      if (retained.phase !== 'returned') return unknown(retained.boundary!);
      try { retained.owner!.#requireImages(); return known(retained.owner!); }
      catch (error) { return unknown(reason(error)); }
    }
    const entry: Construction = { phase: 'constructing', owner: null, boundary: null }; owners.set(crt, entry);
    try {
      const owner = new NativeGameCrtIoInit(crt, constructionToken, entry);
      if (entry.phase !== 'constructing' || entry.owner !== owner) throw new Error(entry.boundary ?? 'Game ioInit construction was interrupted');
      entry.phase = 'returned'; return known(owner);
    } catch (error) { entry.phase = 'blocked'; entry.boundary ??= reason(error); return unknown(entry.boundary); }
  }

  /** The stack provider checks this exact private controller on each operation.
   * Retention may describe an interrupted graph; it cannot execute an opcode. */
  static canonicalControllerForCrt(owner: NativeGameCrtIoInit, crt: NativeModuleCrtOwner,
    controller: object, mode: 'bind' | 'invoke' | 'retain'): NativeValue<void> {
    const entry = owners.get(crt);
    if (!owner || entry?.owner !== owner || controller !== owner.#controller || owner.#crt !== crt) {
      return unknown('Actual retained same-CRT ioInit controller required');
    }
    // Retain the already admitted graph even if a current execution/lifetime
    // proof failed. This original private identity permits no source operation.
    if (mode === 'retain') {
      return entry.phase === 'returned' && (owner.#phase === 'invoking' || owner.#phase === 'blocked' || owner.#phase === 'returned')
        ? known(undefined) : unknown('Actual reached ioInit prefix required for retention');
    }
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game') return unknown('Actual constructed Game CRT required');
    try {
      owner.#requireImages();
      if (mode === 'bind') {
        return entry.phase === 'constructing' && owner.#phase === 'cold' ? known(undefined)
          : unknown('Game ioInit controller can bind only during its actual construction');
      }
      if (entry.phase !== 'returned') return unknown('Game ioInit construction has not returned');
      if (mode !== 'invoke') return unknown('Actual ioInit controller operation mode required');
      owner.#guard(); return known(undefined);
    } catch (error) { return unknown(reason(error)); }
  }

  /** Only the exact active controller at the actual import source row can
   * obtain this retained frame alias. The graph checks current physical
   * storage and the current stack argument before each granted writer store. */
  static canonicalStartupInfoCallForCrt(owner: NativeGameCrtIoInit, crt: NativeModuleCrtOwner,
    controller: object): NativeValue<NativeHeapObjectViews> {
    const active = NativeGameCrtIoInit.canonicalControllerForCrt(owner, crt, controller, 'invoke');
    if (!active.known) return active;
    try {
      if (owner.#pc !== '20474314' || !owner.#writerBoundaryReached || !owner.#startupInfo ||
          owner.#startupInfo.bytes.length !== 68 || owner.#startupInfo.knownMask.length !== 68 ||
          owner.#startupInfo.backing.freed !== false) {
        return unknown('Actual reached Game GetStartupInfoA call and retained frame alias of 68 bytes required');
      }
      return known(owner.#startupInfo);
    } catch (error) { return unknown(reason(error)); }
  }

  /** The heap bridge independently proves its physical frame/arguments and
   * pending return. This private source cursor authorizes only that reached
   * import within this actual nested invocation and its original caller. */
  static canonicalHeapAllocCallForCrt(owner: NativeGameCrtIoInit, crt: NativeModuleCrtOwner,
    controller: object): NativeValue<void> {
    const active = NativeGameCrtIoInit.canonicalControllerForCrt(owner, crt, controller, 'invoke');
    if (!active.known) return active;
    return owner.#pc === '20477ce8' && owner.#callocCalled && owner.#callocImplActive &&
      owner.#nestedPrologReturned && !owner.#nestedEpilogReturned && !!owner.#callocScope
      ? known(undefined) : unknown('Actual reached HeapAlloc in the retained nested Game calloc frame required');
  }

  /** Each fixed import site belongs to the actual current outer, section or
   * decode source frame. The graph separately proves its current arguments,
   * procedure identity, pending return and normal endpoint result. */
  static canonicalStandardIoCallForCrt(owner: NativeGameCrtIoInit, crt: NativeModuleCrtOwner,
    controller: object, site: NativeStandardIoCallSite): NativeValue<void> {
    const active = NativeGameCrtIoInit.canonicalControllerForCrt(owner, crt, controller, 'invoke');
    if (!active.known) return active;
    if (owner.#pc !== site || owner.#standardIoCallSite !== site || !owner.#standardLoopActive ||
        owner.#outerEpilogActive || owner.#callerReturnConsumed) return unknown('Actual current standard-I/O source CALL required');
    if (site === '204744b4' || site === '204744c6' || site === '2047451e') {
      return !owner.#sectionActive && !owner.#decodeActive ? known(undefined)
        : unknown('Actual outer ioInit import frame required');
    }
    if (!owner.#sectionActive || !owner.#sectionPrologReturned || owner.#sectionEpilogActive || !owner.#sectionScope) {
      return unknown('Actual retained section source frame and current registration required');
    }
    if (site === '20474246') return !owner.#decodeActive ? known(undefined) : unknown('Section procedure cannot be called inside its decode wrapper');
    return owner.#decodeActive ? known(undefined) : unknown('Actual current physical DecodePointer wrapper required');
  }

  static canonicalIoReturnForCrt(owner: NativeGameCrtIoInit, crt: NativeModuleCrtOwner,
    controller: object): NativeValue<void> {
    const active = NativeGameCrtIoInit.canonicalControllerForCrt(owner, crt, controller, 'invoke');
    if (!active.known) return active;
    return owner.#pc === '2047453e' && owner.#outerEpilogReturned && owner.#callerReturnConsumed &&
      !owner.#sectionActive && !owner.#decodeActive && !owner.#callocImplActive
      ? known(undefined) : unknown('Actual final Game ioInit RET and restored outer frame required');
  }

  /** A caller may verify the one actually returned result while its original
   * private invocation permit remains active. This never executes or replays IO. */
  static canonicalReturnedIoForCrt(owner: NativeGameCrtIoInit, crt: NativeModuleCrtOwner,
    bootstrap: NativeCrtBootstrap, permit: object): NativeValue<number> {
    const entry = owners.get(crt);
    if (!owner || entry?.phase !== 'returned' || entry.owner !== owner || owner.#crt !== crt ||
        owner.#bootstrap !== bootstrap || owner.#permit !== permit || owner.#phase !== 'returned' ||
        owner.#pc !== '204678d3' || !owner.#callerReturnConsumed || !owner.#outerEpilogReturned || owner.#ioResult === null) {
      return unknown('Actual normal IO return from the original same-CRT invocation required');
    }
    const caller = NativeCrtBootstrap.canonicalIoCallForCrt(bootstrap, crt, permit);
    if (!caller.known) return caller;
    try { owner.#requireImages(); return known(owner.#ioResult); }
    catch (error) { return unknown(reason(error)); }
  }

  static enterForAttach(owner: NativeGameCrtIoInit, crt: NativeModuleCrtOwner,
    bootstrap: NativeCrtBootstrap, permit: object): NativeValue<number> {
    const entry = owners.get(crt);
    if (!owner || entry?.phase !== 'returned' || entry.owner !== owner || !NativeModuleCrtOwner.isConstructedOwner(crt) || owner.#crt !== crt) {
      return unknown('Actual retained same-CRT Game ioInit owner required');
    }
    const caller = NativeCrtBootstrap.canonicalIoCallForCrt(bootstrap, crt, permit);
    if (!caller.known) return caller;
    return owner.#enter(bootstrap, permit);
  }

  #requireCrt(): void {
    if (!NativeModuleCrtOwner.isConstructedOwner(this.#crt) || this.#crt.module !== 'Game' || this.#crt.host.platform !== this.#platform) {
      throw new Error('Actual same-platform Game CRT required for ioInit');
    }
    fact(NativeRuntimePlatform.requireActivePlatform(this.#platform));
  }
  #requireImages(): void {
    this.#requireCrt();
    if (fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, 'securityCookie')) !== this.#cookie || this.#cookie.bytes.length !== 4 ||
        fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, 'ioInitEH4Scope')) !== this.#scope || this.#scope.bytes.length !== 28) {
      throw new Error('Actual retained canonical Game ioInit image aliases required');
    }
    if (this.#callocScope && (fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, 'callocEH4Scope')) !== this.#callocScope ||
        this.#callocScope.bytes.length !== 28)) throw new Error('Actual retained canonical Game calloc scope required');
    if (this.#sectionScope && (fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, 'sectionInitExceptionTable')) !== this.#sectionScope ||
        this.#sectionScope.bytes.length !== 28)) throw new Error('Actual retained canonical Game section scope required');
  }
  #guard(): void {
    this.#requireImages();
    if (this.#phase !== 'invoking' || !this.#bootstrap || !this.#permit) throw new Error(this.#boundary ?? 'Actual active ioInit invocation required');
    fact(NativeCrtBootstrap.canonicalIoCallForCrt(this.#bootstrap, this.#crt, this.#permit));
  }
  #step<T>(pc: string, operation: string, body: () => NativeValue<T>, writerSource: boolean | 'allocation' | 'completion' = false): T {
    this.#pc = pc; this.#guard();
    if (writerSource === 'allocation') gameIoAllocationInstruction(pc);
    else if (writerSource === 'completion') gameIoCompletionInstruction(pc);
    else if (writerSource) gameIoWriterStartupInstruction(pc); else gameIoStartupInstruction(pc);
    const value = fact(body());
    this.#effects.push(Object.freeze({ pc, operation }));
    this.#guard(); return value;
  }
  #register(name: 'EAX' | 'EBX' | 'ECX' | 'EDX' | 'ESI' | 'EDI' | 'EBP' | 'ESP'): NativeX86Word32 {
    return fact(NativeX86ThreadStack.prototype.register.call(this.#stack, this.#controller, name));
  }
  #set(name: 'EAX' | 'EBX' | 'ECX' | 'EDX' | 'ESI' | 'EDI' | 'EBP' | 'ESP', word: NativeX86Word32): NativeValue<void> {
    return NativeX86ThreadStack.prototype.setRegister.call(this.#stack, this.#controller, name, word);
  }
  #immediate(value: number): NativeX86Word32 {
    return fact(NativeX86ThreadStack.prototype.immediate.call(this.#stack, this.#controller, value));
  }
  #relative(name: 'EBP' | 'ESP', offset: number): NativeX86Word32 {
    return fact(NativeX86ThreadStack.prototype.add.call(this.#stack, this.#controller, this.#register(name), offset));
  }
  #load(address: NativeX86Word32): NativeX86Word32 {
    return fact(NativeX86ThreadStack.prototype.load.call(this.#stack, this.#controller, address));
  }
  #store(address: NativeX86Word32, value: NativeX86Word32): NativeValue<void> {
    return NativeX86ThreadStack.prototype.store.call(this.#stack, this.#controller, address, value);
  }
  #push(value: NativeX86Word32): NativeValue<void> {
    return NativeX86ThreadStack.prototype.push.call(this.#stack, this.#controller, value);
  }
  #xor(left: NativeX86Word32, right: NativeX86Word32): NativeX86Word32 {
    return fact(NativeX86ThreadStack.prototype.xor.call(this.#stack, this.#controller, left, right));
  }
  #allocationStep<T>(pc: string, operation: string, body: () => NativeValue<T>): T {
    return this.#step(pc, operation, body, 'allocation');
  }
  #completionStep<T>(pc: string, operation: string, body: () => NativeValue<T>): T {
    if (!this.#completionSourceAdmitted) { admitGameIoCompletionSource(); this.#completionSourceAdmitted = true; }
    return this.#step(pc, operation, body, 'completion');
  }
  #add(word: NativeX86Word32, displacement: number): NativeX86Word32 {
    return fact(NativeX86ThreadStack.prototype.add.call(this.#stack, this.#controller, word, displacement));
  }
  #alu(operation: 'add' | 'sub' | 'sbb' | 'imul' | 'or' | 'and', left: NativeX86Word32,
    right: NativeX86Word32, width: 1 | 2 | 4 = 4): NativeX86Word32 {
    return fact(NativeX86ThreadStack.prototype.alu.call(this.#stack, this.#controller, operation, left, right, width));
  }
  #compare(left: NativeX86Word32, right: NativeX86Word32, width: 1 | 2 | 4 = 4): NativeValue<void> {
    return NativeX86ThreadStack.prototype.compare.call(this.#stack, this.#controller, left, right, width);
  }
  #test(left: NativeX86Word32, right: NativeX86Word32): NativeValue<void> {
    return NativeX86ThreadStack.prototype.test.call(this.#stack, this.#controller, left, right);
  }
  #branch(pc: string, condition: 'z' | 'nz' | 'be' | 'a' | 'c' | 'l', source: 'allocation' | 'completion' = 'allocation'): boolean {
    return this.#step(pc, 'J' + condition.toUpperCase(), () =>
      NativeX86ThreadStack.prototype.condition.call(this.#stack, this.#controller, condition), source);
  }
  #pop(register: 'EAX' | 'EBX' | 'ECX' | 'EDX' | 'ESI' | 'EDI' | 'EBP' | 'ESP'): NativeValue<void> {
    return NativeX86ThreadStack.prototype.pop.call(this.#stack, this.#controller, register);
  }
  #call(pc: string, returnPc: string): NativeValue<void> {
    return NativeX86ThreadStack.prototype.call.call(this.#stack, this.#controller, pc, returnPc);
  }
  #return(pc: string, target: string, source: 'allocation' | 'completion' = 'allocation'): void {
    const word = this.#step(pc, 'RET to ' + target, () => NativeX86ThreadStack.prototype.ret.call(this.#stack, this.#controller), source);
    fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack, this.#controller, word, 'code', target));
  }
  #imageWord(label: string, offset = 0): NativeX86Word32 {
    return fact(NativeX86ThreadStack.prototype.readGameImageWord.call(this.#stack, this.#controller, label, offset));
  }
  #imagePointer(label: string, offset = 0): NativeX86Word32 {
    return fact(NativeX86ThreadStack.prototype.readGameImagePointer.call(this.#stack, this.#controller, label, offset));
  }
  #loadWidth(address: NativeX86Word32, width: 1 | 2 | 4): NativeX86Word32 {
    return fact(NativeX86ThreadStack.prototype.loadWidth.call(this.#stack, this.#controller, address, width));
  }
  #storeWidth(address: NativeX86Word32, word: NativeX86Word32, width: 1 | 2 | 4): NativeValue<void> {
    return NativeX86ThreadStack.prototype.storeWidth.call(this.#stack, this.#controller, address, word, width);
  }
  #stopAt(pc: string, boundary: string, source: 'allocation' | 'completion' = 'allocation'): never {
    this.#pc = pc; this.#guard();
    if (source === 'completion') gameIoCompletionInstruction(pc); else gameIoAllocationInstruction(pc);
    throw new Error(boundary);
  }

  #nestedProlog(): void {
    this.#allocationStep('20468570', 'PUSH handlerAddress', () => this.#push(fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack, this.#controller, 'code', '20468600'))));
    this.#allocationStep('20468575', 'PUSH previousFS0', () => this.#push(fact(NativeX86ThreadStack.prototype.readFs0.call(this.#stack, this.#controller))));
    this.#allocationStep('2046857c', 'MOV EAX allocationSize', () => this.#set('EAX', this.#load(this.#relative('ESP', 0x10))));
    this.#allocationStep('20468580', 'MOV savedEBP', () => this.#store(this.#relative('ESP', 0x10), this.#register('EBP')));
    this.#allocationStep('20468584', 'LEA EBP', () => this.#set('EBP', this.#relative('ESP', 0x10)));
    this.#allocationStep('20468588', 'SUB ESP EAX', () => this.#set('ESP', this.#alu('sub', this.#register('ESP'), this.#register('EAX'))));
    this.#allocationStep('2046858a', 'PUSH savedEBX', () => this.#push(this.#register('EBX')));
    this.#allocationStep('2046858b', 'PUSH savedESI', () => this.#push(this.#register('ESI')));
    this.#allocationStep('2046858c', 'PUSH savedEDI', () => this.#push(this.#register('EDI')));
    this.#allocationStep('2046858d', 'MOV EAX currentSecurityCookie', () => this.#set('EAX', this.#imageWord('securityCookie')));
    this.#allocationStep('20468592', 'XOR encodedScopeCookie', () => {
      const address = this.#relative('EBP', -4);
      return this.#store(address, this.#xor(this.#load(address), this.#register('EAX')));
    });
    this.#allocationStep('20468595', 'XOR EAX EBP', () => this.#set('EAX', this.#xor(this.#register('EAX'), this.#register('EBP'))));
    this.#allocationStep('20468597', 'PUSH frameCookie', () => this.#push(this.#register('EAX')));
    this.#allocationStep('20468598', 'MOV savedESP', () => this.#store(this.#relative('EBP', -0x18), this.#register('ESP')));
    this.#allocationStep('2046859b', 'PUSH prologReturn', () => this.#push(this.#load(this.#relative('EBP', -8))));
    this.#allocationStep('2046859e', 'MOV EAX encodedScope', () => this.#set('EAX', this.#load(this.#relative('EBP', -4))));
    this.#allocationStep('204685a1', 'MOV tryLevel minus2', () => this.#store(this.#relative('EBP', -4), this.#immediate(0xfffffffe)));
    this.#allocationStep('204685a8', 'MOV encodedScope', () => this.#store(this.#relative('EBP', -8), this.#register('EAX')));
    this.#allocationStep('204685ab', 'LEA registrationAddress', () => this.#set('EAX', this.#relative('EBP', -0x10)));
    this.#allocationStep('204685ae', 'MOV FS0 nestedRegistration', () => NativeX86ThreadStack.prototype.writeFs0.call(this.#stack, this.#controller, this.#register('EAX')));
    this.#return('204685b4', '20477c36'); this.#nestedPrologReturned = true;
  }

  #nestedEpilog(): void {
    this.#allocationStep('204685b5', 'MOV ECX previousFS0', () => this.#set('ECX', this.#load(this.#relative('EBP', -0x10))));
    this.#allocationStep('204685b8', 'MOV FS0 previousRegistration', () => NativeX86ThreadStack.prototype.writeFs0.call(this.#stack, this.#controller, this.#register('ECX')));
    this.#allocationStep('204685bf', 'POP ECX epilogReturn', () => this.#pop('ECX'));
    this.#allocationStep('204685c0', 'POP EDI frameCookie', () => this.#pop('EDI'));
    this.#allocationStep('204685c1', 'POP EDI savedRegister', () => this.#pop('EDI'));
    this.#allocationStep('204685c2', 'POP ESI savedRegister', () => this.#pop('ESI'));
    this.#allocationStep('204685c3', 'POP EBX savedRegister', () => this.#pop('EBX'));
    this.#allocationStep('204685c4', 'MOV ESP EBP', () => this.#set('ESP', this.#register('EBP')));
    this.#allocationStep('204685c6', 'POP EBP savedOuterFrame', () => this.#pop('EBP'));
    this.#allocationStep('204685c7', 'PUSH ECX epilogReturn', () => this.#push(this.#register('ECX')));
    this.#return('204685c8', '20477d47'); this.#nestedEpilogReturned = true;
  }

  /** Execute the original wrapper and its nested normal allocator path. A
   * current flag or import result controls each branch; an unsupported branch
   * stops at its first unexecuted source row on the same physical stack. */
  #calloc(): void {
    admitGameIoAllocationSource();
    this.#allocationStep('20474327', 'CALL calloc wrapper204683ce', () => this.#call('20474327', '2047432c'));
    this.#callocCalled = true;
    this.#allocationStep('204683ce', 'PUSH savedESI', () => this.#push(this.#register('ESI')));
    this.#allocationStep('204683cf', 'PUSH savedEDI', () => this.#push(this.#register('EDI')));
    this.#allocationStep('204683d0', 'XOR ESI ESI', () => { const esi = this.#register('ESI'); return this.#set('ESI', this.#xor(esi, esi)); });
    this.#allocationStep('204683d2', 'PUSH nullErrnoOutput', () => this.#push(this.#immediate(0)));
    this.#allocationStep('204683d4', 'PUSH currentForwardedSize', () => this.#push(this.#load(this.#relative('ESP', 0x14))));
    this.#allocationStep('204683d8', 'PUSH currentForwardedCount', () => this.#push(this.#load(this.#relative('ESP', 0x14))));
    this.#allocationStep('204683dc', 'CALL calloc implementation20477c2a', () => this.#call('204683dc', '204683e1'));
    this.#callocImplActive = true;
    this.#allocationStep('20477c2a', 'PUSH nestedAllocationSize', () => this.#push(this.#immediate(0x0c)));
    this.#allocationStep('20477c2c', 'PUSH readonlyCallocScope', () => {
      const receipt = gameIoAllocationImageReceipt('callocEH4Scope');
      if (receipt.address !== '206e8f98' || receipt.bytes !== 28) throw new Error('Original Game calloc scope differs');
      this.#callocScope = fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, 'callocEH4Scope'));
      fact(NativeX86ThreadStack.prototype.registerSourceImage.call(this.#stack, this.#controller, receipt.address, this.#callocScope));
      return this.#push(fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack, this.#controller, 'image', receipt.address)));
    });
    this.#allocationStep('20477c31', 'CALL nestedSEHProlog4', () => this.#call('20477c31', '20477c36'));
    this.#nestedProlog();
    this.#allocationStep('20477c36', 'MOV ECX currentCount', () => this.#set('ECX', this.#load(this.#relative('EBP', 8))));
    this.#allocationStep('20477c39', 'XOR EDI EDI', () => { const edi = this.#register('EDI'); return this.#set('EDI', this.#xor(edi, edi)); });
    this.#allocationStep('20477c3b', 'CMP count zero', () => this.#compare(this.#register('ECX'), this.#register('EDI')));
    if (!this.#branch('20477c3d', 'be')) {
      this.#allocationStep('20477c3f', 'PUSH allocationLimit', () => this.#push(this.#immediate(0xffffffe0)));
      this.#allocationStep('20477c41', 'POP EAX allocationLimit', () => this.#pop('EAX'));
      this.#allocationStep('20477c42', 'XOR EDX EDX', () => { const edx = this.#register('EDX'); return this.#set('EDX', this.#xor(edx, edx)); });
      this.#allocationStep('20477c44', 'DIV currentCount', () => NativeX86ThreadStack.prototype.divideUnsigned.call(this.#stack, this.#controller, this.#register('ECX')));
      this.#allocationStep('20477c46', 'CMP quotient currentSize', () => this.#compare(this.#register('EAX'), this.#load(this.#relative('EBP', 0x0c))));
      this.#allocationStep('20477c49', 'SBB EAX EAX', () => { const eax = this.#register('EAX'); return this.#set('EAX', this.#alu('sbb', eax, eax)); });
      this.#allocationStep('20477c4b', 'INC EAX allocationCheck', () => this.#set('EAX', fact(NativeX86ThreadStack.prototype.increment.call(this.#stack, this.#controller, this.#register('EAX')))));
      if (!this.#branch('20477c4c', 'nz')) this.#stopAt('20477c4e', 'Game calloc overflow errno and invalid-parameter calls are not owned');
    }
    this.#allocationStep('20477c6d', 'IMUL count currentSize', () => this.#set('ECX', this.#alu('imul', this.#register('ECX'), this.#load(this.#relative('EBP', 0x0c)))));
    this.#allocationStep('20477c71', 'MOV ESI product', () => this.#set('ESI', this.#register('ECX')));
    this.#allocationStep('20477c73', 'MOV forwardedCount product', () => this.#store(this.#relative('EBP', 8), this.#register('ESI')));
    this.#allocationStep('20477c76', 'CMP product zero', () => this.#compare(this.#register('ESI'), this.#register('EDI')));
    if (!this.#branch('20477c78', 'nz')) {
      this.#allocationStep('20477c7a', 'XOR ESI ESI forEmptyAllocation', () => { const esi = this.#register('ESI'); return this.#set('ESI', this.#xor(esi, esi)); });
      this.#allocationStep('20477c7c', 'INC ESI minimumAllocation', () => this.#set('ESI', fact(NativeX86ThreadStack.prototype.increment.call(this.#stack, this.#controller, this.#register('ESI')))));
    }
    this.#allocationStep('20477c7d', 'XOR EBX EBX', () => { const ebx = this.#register('EBX'); return this.#set('EBX', this.#xor(ebx, ebx)); });
    this.#allocationStep('20477c7f', 'MOV savedAllocation zero', () => this.#store(this.#relative('EBP', -0x1c), this.#register('EBX')));
    this.#allocationStep('20477c82', 'CMP product allocationLimit', () => this.#compare(this.#register('ESI'), this.#immediate(0xffffffe0)));
    if (!this.#branch('20477c85', 'a')) {
      this.#allocationStep('20477c87', 'CMP currentHeapMode three', () => this.#compare(this.#imageWord('crtHeapMode'), this.#immediate(3)));
      if (!this.#branch('20477c8e', 'nz')) this.#stopAt('20477c90', 'Game calloc heap-mode3 aligned allocator and cleanup calls are not owned');
      this.#allocationStep('20477cdb', 'CMP allocation zero', () => this.#compare(this.#register('EBX'), this.#register('EDI')));
      if (!this.#branch('20477cdd', 'nz')) {
        this.#allocationStep('20477cdf', 'PUSH currentAllocationBytes', () => this.#push(this.#register('ESI')));
        this.#allocationStep('20477ce0', 'PUSH HEAP_ZERO_MEMORY', () => this.#push(this.#immediate(8)));
        this.#allocationStep('20477ce2', 'PUSH currentGameHeap', () => this.#push(this.#imagePointer('crtHeapHandle')));
        this.#pc = '20477ce8'; this.#guard(); gameIoAllocationInstruction(this.#pc); this.#heapAllocBoundaryReached = true;
        this.#allocationStep('20477ce8', 'CALL HeapAlloc IAT207d7b84', () => NativeX86ThreadStack.prototype.invokeHeapAlloc.call(this.#stack, this.#controller));
        this.#allocationStep('20477cee', 'MOV EBX actualHeapResult', () => this.#set('EBX', this.#register('EAX')));
      } else {
        // JNZ20477d40 bypasses the HeapAlloc and NULL-handling rows.
        this.#finishCalloc(); return;
      }
    }
    this.#allocationStep('20477cf0', 'CMP actualAllocation zero', () => this.#compare(this.#register('EBX'), this.#register('EDI')));
    if (!this.#branch('20477cf2', 'nz')) {
      this.#allocationStep('20477cf4', 'CMP currentNewMode zero', () => this.#compare(this.#imageWord('newMode'), this.#register('EDI')));
      if (!this.#branch('20477cfa', 'z')) this.#stopAt('20477cfc', 'Game calloc new-handler retry call is not owned');
      this.#allocationStep('20477d2f', 'CMP nullAllocation zero', () => this.#compare(this.#register('EBX'), this.#register('EDI')));
      if (!this.#branch('20477d31', 'nz')) {
        this.#allocationStep('20477d33', 'MOV EAX currentErrnoOutput', () => this.#set('EAX', this.#load(this.#relative('EBP', 0x10))));
        this.#allocationStep('20477d36', 'CMP errnoOutput zero', () => this.#compare(this.#register('EAX'), this.#register('EDI')));
        if (!this.#branch('20477d38', 'z')) this.#stopAt('20477d3a', 'Game calloc borrowed errno output store is not owned');
      }
    }
    this.#finishCalloc();
  }

  #finishCalloc(): void {
    this.#allocationStep('20477d40', 'MOV EAX allocationResult', () => this.#set('EAX', this.#register('EBX')));
    this.#allocationStep('20477d42', 'CALL nestedSEHEpilog4', () => this.#call('20477d42', '20477d47'));
    this.#nestedEpilog(); this.#return('20477d47', '204683e1'); this.#callocImplActive = false;
    this.#allocationStep('204683e1', 'MOV EDI callocResult', () => this.#set('EDI', this.#register('EAX')));
    this.#allocationStep('204683e3', 'ADD ESP forwardedArguments', () => this.#set('ESP', this.#alu('add', this.#register('ESP'), this.#immediate(0x0c))));
    this.#allocationStep('204683e6', 'TEST callocResult', () => this.#test(this.#register('EDI'), this.#register('EDI')));
    if (!this.#branch('204683e8', 'nz')) {
      this.#allocationStep('204683ea', 'CMP currentMallocRetry nullResult', () => this.#compare(this.#imageWord('crtMallocRetry'), this.#register('EAX')));
      if (!this.#branch('204683f0', 'be')) this.#stopAt('204683f2', 'Game calloc wrapper Sleep and allocation retry path are not owned');
    }
    this.#allocationStep('20468411', 'MOV EAX wrapperResult', () => this.#set('EAX', this.#register('EDI')));
    this.#allocationStep('20468413', 'POP EDI savedOuterRegister', () => this.#pop('EDI'));
    this.#allocationStep('20468414', 'POP ESI savedOuterCount', () => this.#pop('ESI'));
    this.#return('20468415', '2047432c'); this.#callocReturned = true;
  }

  #initializeFirstBlock(): boolean {
    this.#allocationStep('2047432c', 'POP ECX callerCount', () => this.#pop('ECX'));
    this.#allocationStep('2047432d', 'POP ECX callerSize', () => this.#pop('ECX'));
    this.#allocationStep('2047432e', 'CMP callocResult zero', () => this.#compare(this.#register('EAX'), this.#register('EDI')));
    if (this.#branch('20474330', 'z')) { this.#finishIo(true); return false; }
    this.#allocationStep('20474336', 'MOV currentIoBlock allocationPointer', () =>
      NativeX86ThreadStack.prototype.storeGameImagePointer.call(this.#stack, this.#controller, 'ioBlocks', 0, this.#register('EAX')));
    this.#ioBlockPublished = true;
    this.#allocationStep('2047433b', 'MOV ioHandleCount restoredCount', () =>
      NativeX86ThreadStack.prototype.storeGameImageWord.call(this.#stack, this.#controller, 'ioHandleCount', 0, this.#register('ESI')));
    this.#ioCountPublished = true;
    this.#allocationStep('20474341', 'LEA ECX firstBlockEnd', () => this.#set('ECX', this.#add(this.#register('EAX'), 0x700)));
    this.#allocationStep('20474347', 'JMP firstBlockLoopComparison', () => known(undefined));
    this.#allocationStep('20474372', 'CMP currentRecord blockEnd', () => this.#compare(this.#register('EAX'), this.#register('ECX')));
    let moreRecords = this.#branch('20474374', 'c');
    while (moreRecords) {
      this.#allocationStep('20474349', 'MOV recordFlags zero', () => this.#storeWidth(this.#add(this.#register('EAX'), 4), this.#immediate(0), 1));
      this.#allocationStep('2047434d', 'OR recordHandle minus1', () => {
        const address = this.#register('EAX');
        return this.#storeWidth(address, this.#alu('or', this.#loadWidth(address, 4), this.#immediate(0xffffffff)), 4);
      });
      this.#allocationStep('20474350', 'MOV recordTextMode LF', () => this.#storeWidth(this.#add(this.#register('EAX'), 5), this.#immediate(0x0a), 1));
      this.#allocationStep('20474354', 'MOV recordSectionState zero', () => this.#storeWidth(this.#add(this.#register('EAX'), 8), this.#register('EDI'), 4));
      this.#allocationStep('20474357', 'MOV recordLookaheadState zero', () => this.#storeWidth(this.#add(this.#register('EAX'), 0x24), this.#immediate(0), 1));
      this.#allocationStep('2047435b', 'MOV recordLookaheadByte LF', () => this.#storeWidth(this.#add(this.#register('EAX'), 0x25), this.#immediate(0x0a), 1));
      this.#allocationStep('2047435f', 'MOV recordLookaheadByte2 LF', () => this.#storeWidth(this.#add(this.#register('EAX'), 0x26), this.#immediate(0x0a), 1));
      this.#allocationStep('20474363', 'ADD EAX nextRecord', () => this.#set('EAX', this.#alu('add', this.#register('EAX'), this.#immediate(0x38))));
      // Re-read both the canonical bytes/mask and native pointer sidecar on
      // every source load. Equal opaque bytes do not prove the current root.
      this.#allocationStep('20474366', 'MOV ECX currentIoBlockPointer', () => this.#set('ECX', this.#imagePointer('ioBlocks')));
      this.#allocationStep('2047436c', 'ADD ECX currentBlockEnd', () => this.#set('ECX', this.#alu('add', this.#register('ECX'), this.#immediate(0x700))));
      this.#allocationStep('20474372', 'CMP currentRecord currentBlockEnd', () => this.#compare(this.#register('EAX'), this.#register('ECX')));
      moreRecords = this.#branch('20474374', 'c'); this.#initializedRecordCount++;
    }
    this.#allocationStep('20474376', 'CMP currentReservedBytes zero', () => this.#compare(this.#loadWidth(this.#relative('EBP', -0x32), 2), this.#register('EDI'), 2));
    if (!this.#branch('2047437a', 'z')) {
      this.#allocationStep('20474380', 'MOV EAX currentReservedPointer', () => this.#set('EAX', this.#load(this.#relative('EBP', -0x30))));
      this.#allocationStep('20474383', 'CMP reservedPointer zero', () => this.#compare(this.#register('EAX'), this.#register('EDI')));
      if (!this.#branch('20474385', 'z')) this.#stopAt('2047438b', 'Game ioInit inherited STARTUPINFO handle block is not owned');
    }
    this.#allocationStep('2047447d', 'XOR EBX firstStandardHandleIndex', () => { const ebx = this.#register('EBX'); return this.#set('EBX', this.#xor(ebx, ebx)); });
    this.#allocationStep('2047447f', 'MOV ESI standardHandleIndex', () => this.#set('ESI', this.#register('EBX')));
    this.#allocationStep('20474481', 'IMUL ESI recordStride', () => this.#set('ESI', this.#alu('imul', this.#register('ESI'), this.#immediate(0x38))));
    this.#allocationStep('20474484', 'ADD ESI currentIoBlockPointer', () => this.#set('ESI', this.#alu('add', this.#register('ESI'), this.#imagePointer('ioBlocks'))));
    this.#allocationStep('2047448a', 'MOV EAX currentStandardRecordHandle', () => this.#set('EAX', this.#loadWidth(this.#register('ESI'), 4)));
    this.#allocationStep('2047448c', 'CMP standardRecordHandle minus1', () => this.#compare(this.#register('EAX'), this.#immediate(0xffffffff)));
    if (!this.#branch('2047448f', 'z')) this.#stopAt('20474491', 'Game ioInit preexisting standard handle branch is not owned');
    this.#allocationStep('2047449c', 'MOV standardRecordFlags 0x81', () => this.#storeWidth(this.#add(this.#register('ESI'), 4), this.#immediate(0x81), 1));
    this.#allocationStep('204744a0', 'TEST standardHandleIndex', () => this.#test(this.#register('EBX'), this.#register('EBX')));
    if (this.#branch('204744a2', 'nz')) this.#stopAt('204744a9', 'Game ioInit later standard handle identifier arithmetic is not owned');
    this.#allocationStep('204744a4', 'PUSH STD_INPUT_HANDLE minus10', () => this.#push(this.#immediate(0xfffffff6)));
    this.#allocationStep('204744a6', 'POP EAX STD_INPUT_HANDLE', () => this.#pop('EAX'));
    this.#allocationStep('204744a7', 'JMP standardHandleArgument', () => known(undefined));
    this.#allocationStep('204744b3', 'PUSH actualSTD_INPUT_HANDLE', () => this.#push(this.#register('EAX')));
    this.#standardInputArgumentPrepared = true;
    this.#pc = '204744b4'; this.#guard(); gameIoAllocationInstruction(this.#pc); this.#standardHandleBoundaryReached = true;
    this.#standardLoopActive = true;
    return true;
  }

  #standardCall(site: NativeStandardIoCallSite, operation: string, body: () => NativeValue<void>): void {
    this.#pc = site; this.#standardIoCallSite = site;
    this.#completionStep(site, operation, body);
  }

  /** The current record, source flags and real import results decide each
   * iteration. Neither a selected profile nor a copied count chooses a branch. */
  #standardHandles(): void {
    while (true) {
      this.#standardCall('204744b4', 'CALL GetStdHandle IAT207d7bbc', () =>
        NativeX86ThreadStack.prototype.invokeGetStdHandle.call(this.#stack, this.#controller));
      this.#completionStep('204744ba', 'MOV EDI actualStandardHandle', () => this.#set('EDI', this.#register('EAX')));
      this.#completionStep('204744bc', 'CMP standardHandle minus1', () => this.#compare(this.#register('EDI'), this.#immediate(0xffffffff)));
      let unavailable = this.#branch('204744bf', 'z', 'completion');
      if (!unavailable) {
        this.#completionStep('204744c1', 'TEST actualStandardHandle', () => this.#test(this.#register('EDI'), this.#register('EDI')));
        unavailable = this.#branch('204744c3', 'z', 'completion');
      }
      if (!unavailable) {
        this.#completionStep('204744c5', 'PUSH actualStandardHandle', () => this.#push(this.#register('EDI')));
        this.#standardCall('204744c6', 'CALL GetFileType IAT207d7c18', () =>
          NativeX86ThreadStack.prototype.invokeGetFileType.call(this.#stack, this.#controller));
        this.#completionStep('204744cc', 'TEST actualFileType', () => this.#test(this.#register('EAX'), this.#register('EAX')));
        unavailable = this.#branch('204744ce', 'z', 'completion');
      }
      if (unavailable) {
        this.#completionStep('20474504', 'OR unavailableRecordFlag 0x40', () => {
          const address = this.#add(this.#register('ESI'), 4);
          return this.#storeWidth(address, this.#alu('or', this.#loadWidth(address, 1), this.#immediate(0x40), 1), 1);
        });
        this.#completionStep('20474508', 'MOV unavailableRecordHandle minus2', () => this.#storeWidth(this.#register('ESI'), this.#immediate(0xfffffffe), 4));
      } else {
        this.#completionStep('204744d0', 'MOV currentRecord actualHandleCapability', () => this.#storeWidth(this.#register('ESI'), this.#register('EDI'), 4));
        this.#completionStep('204744d2', 'AND fileType lowByte', () => this.#set('EAX', this.#alu('and', this.#register('EAX'), this.#immediate(0xff))));
        this.#completionStep('204744d7', 'CMP actualFileType character', () => this.#compare(this.#register('EAX'), this.#immediate(2)));
        if (!this.#branch('204744da', 'nz', 'completion')) {
          this.#completionStep('204744dc', 'OR characterRecordFlag 0x40', () => {
            const address = this.#add(this.#register('ESI'), 4);
            return this.#storeWidth(address, this.#alu('or', this.#loadWidth(address, 1), this.#immediate(0x40), 1), 1);
          });
          this.#completionStep('204744e0', 'JMP sectionArguments', () => known(undefined));
        } else {
          this.#completionStep('204744e2', 'CMP actualFileType pipe', () => this.#compare(this.#register('EAX'), this.#immediate(3)));
          if (!this.#branch('204744e5', 'nz', 'completion')) {
            this.#completionStep('204744e7', 'OR pipeRecordFlag 0x08', () => {
              const address = this.#add(this.#register('ESI'), 4);
              return this.#storeWidth(address, this.#alu('or', this.#loadWidth(address, 1), this.#immediate(8), 1), 1);
            });
          }
        }
        this.#completionStep('204744eb', 'PUSH sectionSpinCount 4000', () => this.#push(this.#immediate(4000)));
        this.#completionStep('204744f0', 'LEA currentRecordSection', () => this.#set('EAX', this.#add(this.#register('ESI'), 0x0c)));
        this.#completionStep('204744f3', 'PUSH currentRecordSection', () => this.#push(this.#register('EAX')));
        this.#completionStep('204744f4', 'CALL sectionHelper204741c7', () => this.#call('204744f4', '204744f9'));
        this.#sectionActive = true; this.#sectionPrologReturned = false; this.#sectionEpilogReturned = false;
        this.#section();
        this.#completionStep('204744f9', 'POP ECX sectionPointerArgument', () => this.#pop('ECX'));
        this.#completionStep('204744fa', 'POP ECX sectionSpinArgument', () => this.#pop('ECX'));
        this.#completionStep('204744fb', 'TEST actualSectionResult', () => this.#test(this.#register('EAX'), this.#register('EAX')));
        if (this.#branch('204744fd', 'z', 'completion')) { this.#finishIo(true); return; }
        this.#completionStep('204744ff', 'INC initializedRecordSectionCount', () => {
          const address = this.#add(this.#register('ESI'), 8);
          return this.#storeWidth(address, fact(NativeX86ThreadStack.prototype.increment.call(this.#stack, this.#controller, this.#loadWidth(address, 4))), 4);
        });
        this.#completionStep('20474502', 'JMP nextStandardRecord', () => known(undefined));
      }
      this.#completionStep('2047450e', 'INC standardRecordIndex', () => this.#set('EBX', fact(NativeX86ThreadStack.prototype.increment.call(this.#stack, this.#controller, this.#register('EBX')))));
      this.#completionStep('2047450f', 'CMP standardRecordIndex three', () => this.#compare(this.#register('EBX'), this.#immediate(3)));
      if (!this.#branch('20474512', 'l', 'completion')) break;
      this.#prepareNextStandardHandle();
    }
    this.#completionStep('20474518', 'PUSH currentIoHandleCount', () => this.#push(this.#imageWord('ioHandleCount')));
    this.#standardCall('2047451e', 'CALL SetHandleCount IAT207d7c14', () =>
      NativeX86ThreadStack.prototype.invokeSetHandleCount.call(this.#stack, this.#controller));
    this.#completionStep('20474524', 'XOR EAX normalIoResult', () => { const eax = this.#register('EAX'); return this.#set('EAX', this.#xor(eax, eax)); });
    this.#completionStep('20474526', 'JMP outerIoEpilog', () => known(undefined));
    this.#finishIo(false);
  }

  #prepareNextStandardHandle(): void {
    this.#completionStep('2047447f', 'MOV ESI currentStandardIndex', () => this.#set('ESI', this.#register('EBX')));
    this.#completionStep('20474481', 'IMUL ESI recordStride', () => this.#set('ESI', this.#alu('imul', this.#register('ESI'), this.#immediate(0x38))));
    this.#completionStep('20474484', 'ADD ESI currentIoBlockPointer', () => this.#set('ESI', this.#alu('add', this.#register('ESI'), this.#imagePointer('ioBlocks'))));
    this.#completionStep('2047448a', 'MOV EAX currentStandardRecordHandle', () => this.#set('EAX', this.#loadWidth(this.#register('ESI'), 4)));
    this.#completionStep('2047448c', 'CMP currentRecordHandle minus1', () => this.#compare(this.#register('EAX'), this.#immediate(0xffffffff)));
    if (!this.#branch('2047448f', 'z', 'completion')) this.#stopAt('20474491', 'Game ioInit preexisting later standard handle branch is not owned', 'completion');
    this.#completionStep('2047449c', 'MOV currentRecordFlags 0x81', () => this.#storeWidth(this.#add(this.#register('ESI'), 4), this.#immediate(0x81), 1));
    this.#completionStep('204744a0', 'TEST currentStandardIndex', () => this.#test(this.#register('EBX'), this.#register('EBX')));
    if (this.#branch('204744a2', 'nz', 'completion')) {
      this.#completionStep('204744a9', 'MOV EAX currentStandardIndex', () => this.#set('EAX', this.#register('EBX')));
      this.#completionStep('204744ab', 'DEC EAX standardIdentifier', () => this.#set('EAX', fact(NativeX86ThreadStack.prototype.decrement.call(this.#stack, this.#controller, this.#register('EAX')))));
      this.#completionStep('204744ac', 'NEG EAX standardIdentifier', () => this.#set('EAX', fact(NativeX86ThreadStack.prototype.negate.call(this.#stack, this.#controller, this.#register('EAX')))));
      this.#completionStep('204744ae', 'SBB EAX EAX fromCurrentCF', () => { const eax = this.#register('EAX'); return this.#set('EAX', this.#alu('sbb', eax, eax)); });
      this.#completionStep('204744b0', 'ADD EAX standardOutputBase minus11', () => this.#set('EAX', this.#alu('add', this.#register('EAX'), this.#immediate(0xfffffff5))));
    } else {
      this.#completionStep('204744a4', 'PUSH STD_INPUT_HANDLE minus10', () => this.#push(this.#immediate(0xfffffff6)));
      this.#completionStep('204744a6', 'POP EAX STD_INPUT_HANDLE', () => this.#pop('EAX'));
      this.#completionStep('204744a7', 'JMP standardHandleArgument', () => known(undefined));
    }
    this.#completionStep('204744b3', 'PUSH currentStandardIdentifier', () => this.#push(this.#register('EAX')));
  }

  #section(): void {
    this.#completionStep('204741c7', 'PUSH sectionLocalBytes', () => this.#push(this.#immediate(0x14)));
    this.#completionStep('204741c9', 'PUSH readonlySectionScope', () => {
      const receipt = gameIoCompletionImageReceipt('sectionInitExceptionTable');
      if (receipt.address !== '206e8e70' || receipt.bytes !== 28) throw new Error('Original Game section scope differs');
      this.#sectionScope = fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, 'sectionInitExceptionTable'));
      fact(NativeX86ThreadStack.prototype.registerSourceImage.call(this.#stack, this.#controller, receipt.address, this.#sectionScope));
      return this.#push(fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack, this.#controller, 'image', receipt.address)));
    });
    this.#completionStep('204741ce', 'CALL sectionSEHProlog4', () => this.#call('204741ce', '204741d3'));
    this.#sectionProlog(); this.#sectionPrologReturned = true;
    this.#completionStep('204741d3', 'XOR EDI sectionZero', () => { const edi = this.#register('EDI'); return this.#set('EDI', this.#xor(edi, edi)); });
    this.#completionStep('204741d5', 'MOV localPlatformField zero', () => this.#store(this.#relative('EBP', -0x1c), this.#register('EDI')));
    this.#completionStep('204741d8', 'PUSH currentEncodedSectionInitializer', () => this.#push(this.#imagePointer('crtSectionInitializer')));
    this.#completionStep('204741de', 'CALL physicalDecodePointer20467ddb', () => this.#call('204741de', '204741e3'));
    this.#decodeActive = true; this.#decodePointer(); this.#decodeActive = false;
    this.#completionStep('204741e3', 'POP ECX decodedCallerArgument', () => this.#pop('ECX'));
    this.#completionStep('204741e4', 'MOV ESI actualDecodedProcedure', () => this.#set('ESI', this.#register('EAX')));
    this.#completionStep('204741e6', 'CMP decodedProcedure zero', () => this.#compare(this.#register('ESI'), this.#register('EDI')));
    if (!this.#branch('204741e8', 'nz', 'completion')) this.#stopAt('204741ea', 'Game section initializer current cached-NULL resolver source calls are not owned', 'completion');
    this.#completionStep('2047423d', 'MOV sectionTryLevel zero', () => this.#store(this.#relative('EBP', -4), this.#register('EDI')));
    this.#completionStep('20474240', 'PUSH currentSectionSpinArgument', () => this.#push(this.#load(this.#relative('EBP', 0x0c))));
    this.#completionStep('20474243', 'PUSH currentSectionPointerArgument', () => this.#push(this.#load(this.#relative('EBP', 8))));
    this.#standardCall('20474246', 'CALL currentSectionProcedure ESI', () =>
      NativeX86ThreadStack.prototype.invokeSectionInitializer.call(this.#stack, this.#controller));
    this.#completionStep('20474248', 'MOV actualSectionBOOL', () => this.#store(this.#relative('EBP', -0x20), this.#register('EAX')));
    this.#completionStep('2047424b', 'JMP sectionNormalEpilog', () => known(undefined));
    this.#completionStep('2047427c', 'MOV sectionTryLevel minus2', () => this.#store(this.#relative('EBP', -4), this.#immediate(0xfffffffe)));
    this.#completionStep('20474283', 'MOV EAX retainedSectionBOOL', () => this.#set('EAX', this.#load(this.#relative('EBP', -0x20))));
    this.#completionStep('20474286', 'CALL sectionSEHEpilog4', () => this.#call('20474286', '2047428b'));
    this.#sectionEpilogActive = true; this.#completionEpilog('2047428b'); this.#sectionEpilogReturned = true;
    this.#return('2047428b', '204744f9', 'completion');
    this.#sectionEpilogActive = false; this.#sectionActive = false;
  }

  #sectionProlog(): void {
    this.#completionStep('20468570', 'PUSH sectionHandlerAddress', () => this.#push(fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack, this.#controller, 'code', '20468600'))));
    this.#completionStep('20468575', 'PUSH previousFS0', () => this.#push(fact(NativeX86ThreadStack.prototype.readFs0.call(this.#stack, this.#controller))));
    this.#completionStep('2046857c', 'MOV EAX sectionLocalBytes', () => this.#set('EAX', this.#load(this.#relative('ESP', 0x10))));
    this.#completionStep('20468580', 'MOV savedEBP', () => this.#store(this.#relative('ESP', 0x10), this.#register('EBP')));
    this.#completionStep('20468584', 'LEA EBP sectionFrame', () => this.#set('EBP', this.#relative('ESP', 0x10)));
    this.#completionStep('20468588', 'SUB ESP sectionLocalBytes', () => this.#set('ESP', this.#alu('sub', this.#register('ESP'), this.#register('EAX'))));
    this.#completionStep('2046858a', 'PUSH savedEBX', () => this.#push(this.#register('EBX')));
    this.#completionStep('2046858b', 'PUSH savedESI', () => this.#push(this.#register('ESI')));
    this.#completionStep('2046858c', 'PUSH savedEDI', () => this.#push(this.#register('EDI')));
    this.#completionStep('2046858d', 'MOV EAX currentSecurityCookie', () => this.#set('EAX', this.#imageWord('securityCookie')));
    this.#completionStep('20468592', 'XOR encodedSectionScopeCookie', () => {
      const address = this.#relative('EBP', -4);
      return this.#store(address, this.#xor(this.#load(address), this.#register('EAX')));
    });
    this.#completionStep('20468595', 'XOR EAX sectionEBP', () => this.#set('EAX', this.#xor(this.#register('EAX'), this.#register('EBP'))));
    this.#completionStep('20468597', 'PUSH sectionFrameCookie', () => this.#push(this.#register('EAX')));
    this.#completionStep('20468598', 'MOV sectionSavedESP', () => this.#store(this.#relative('EBP', -0x18), this.#register('ESP')));
    this.#completionStep('2046859b', 'PUSH sectionPrologReturn', () => this.#push(this.#load(this.#relative('EBP', -8))));
    this.#completionStep('2046859e', 'MOV EAX encodedSectionScope', () => this.#set('EAX', this.#load(this.#relative('EBP', -4))));
    this.#completionStep('204685a1', 'MOV sectionTryLevel minus2', () => this.#store(this.#relative('EBP', -4), this.#immediate(0xfffffffe)));
    this.#completionStep('204685a8', 'MOV encodedSectionScope', () => this.#store(this.#relative('EBP', -8), this.#register('EAX')));
    this.#completionStep('204685ab', 'LEA sectionRegistration', () => this.#set('EAX', this.#relative('EBP', -0x10)));
    this.#completionStep('204685ae', 'MOV FS0 actualSectionRegistration', () => NativeX86ThreadStack.prototype.writeFs0.call(this.#stack, this.#controller, this.#register('EAX')));
    this.#return('204685b4', '204741d3', 'completion');
  }

  #decodePointer(): void {
    this.#completionStep('20467ddb', 'PUSH decodeSavedESI', () => this.#push(this.#register('ESI')));
    this.#completionStep('20467ddc', 'PUSH currentGetterTLSIndex', () => this.#push(this.#imageWord('crtTlsIndexes', 4)));
    this.#completionStep('20467de2', 'MOV ESI actualTlsGetValueImport', () => this.#set('ESI', fact(NativeX86ThreadStack.prototype.runtimeProcedure.call(this.#stack, this.#controller, 'TlsGetValue'))));
    this.#standardCall('20467de8', 'CALL currentTlsGetValue ESI', () => NativeX86ThreadStack.prototype.invokeTlsGetValue.call(this.#stack, this.#controller, '20467de8'));
    this.#completionStep('20467dea', 'TEST actualGetterCacheResult', () => this.#test(this.#register('EAX'), this.#register('EAX')));
    if (this.#branch('20467dec', 'z', 'completion')) this.#stopAt('20467e0f', 'Game DecodePointer missing current TLS getter resolver path is not owned', 'completion');
    this.#completionStep('20467dee', 'MOV EAX currentPTDIndex', () => this.#set('EAX', this.#imageWord('crtTlsIndexes')));
    this.#completionStep('20467df3', 'CMP currentPTDIndex minus1', () => this.#compare(this.#register('EAX'), this.#immediate(0xffffffff)));
    if (this.#branch('20467df6', 'z', 'completion')) this.#stopAt('20467e0f', 'Game DecodePointer current invalid PTD-index resolver path is not owned', 'completion');
    this.#completionStep('20467df8', 'PUSH currentPTDIndex', () => this.#push(this.#register('EAX')));
    this.#completionStep('20467df9', 'PUSH currentGetterTLSIndex', () => this.#push(this.#imageWord('crtTlsIndexes', 4)));
    this.#standardCall('20467dff', 'CALL currentTlsGetValue ESI', () => NativeX86ThreadStack.prototype.invokeTlsGetValue.call(this.#stack, this.#controller, '20467dff'));
    this.#standardCall('20467e01', 'CALL actualCachedFlsGetValue EAX', () => NativeX86ThreadStack.prototype.invokeFlsGetValue.call(this.#stack, this.#controller));
    this.#completionStep('20467e03', 'TEST actualCurrentPTD', () => this.#test(this.#register('EAX'), this.#register('EAX')));
    if (this.#branch('20467e05', 'z', 'completion')) this.#stopAt('20467e0f', 'Game DecodePointer current NULL PTD resolver path is not owned', 'completion');
    this.#completionStep('20467e07', 'MOV EAX currentPTDDecodeProcedure', () => this.#set('EAX', fact(NativeX86ThreadStack.prototype.loadPointer.call(this.#stack, this.#controller, this.#add(this.#register('EAX'), 0x1fc)))));
    this.#completionStep('20467e0d', 'JMP currentDecodeProcedureTest', () => known(undefined));
    this.#completionStep('20467e35', 'TEST currentDecodeProcedure', () => this.#test(this.#register('EAX'), this.#register('EAX')));
    if (!this.#branch('20467e37', 'z', 'completion')) {
      this.#completionStep('20467e39', 'PUSH currentEncodedCallerArgument', () => this.#push(this.#load(this.#relative('ESP', 8))));
      this.#standardCall('20467e3d', 'CALL actualCurrentDecodePointer EAX', () => NativeX86ThreadStack.prototype.invokeDecodePointer.call(this.#stack, this.#controller));
      this.#completionStep('20467e3f', 'MOV decodedResult actualCallerArgument', () => this.#store(this.#relative('ESP', 8), this.#register('EAX')));
    }
    this.#completionStep('20467e43', 'MOV EAX actualCallerArgument', () => this.#set('EAX', this.#load(this.#relative('ESP', 8))));
    this.#completionStep('20467e47', 'POP ESI decodeSavedRegister', () => this.#pop('ESI'));
    this.#return('20467e48', '204741e3', 'completion');
  }

  #completionEpilog(returnPc: '2047428b' | '2047453e'): void {
    this.#completionStep('204685b5', 'MOV ECX previousFS0', () => this.#set('ECX', this.#load(this.#relative('EBP', -0x10))));
    this.#completionStep('204685b8', 'MOV FS0 previousRegistration', () => NativeX86ThreadStack.prototype.writeFs0.call(this.#stack, this.#controller, this.#register('ECX')));
    this.#completionStep('204685bf', 'POP ECX actualEpilogReturn', () => this.#pop('ECX'));
    this.#completionStep('204685c0', 'POP EDI frameCookie', () => this.#pop('EDI'));
    this.#completionStep('204685c1', 'POP EDI savedRegister', () => this.#pop('EDI'));
    this.#completionStep('204685c2', 'POP ESI savedRegister', () => this.#pop('ESI'));
    this.#completionStep('204685c3', 'POP EBX savedRegister', () => this.#pop('EBX'));
    this.#completionStep('204685c4', 'MOV ESP currentEBP', () => this.#set('ESP', this.#register('EBP')));
    this.#completionStep('204685c6', 'POP EBP savedFrame', () => this.#pop('EBP'));
    this.#completionStep('204685c7', 'PUSH ECX actualEpilogReturn', () => this.#push(this.#register('ECX')));
    this.#return('204685c8', returnPc, 'completion');
  }

  #finishIo(failed: boolean): void {
    if (failed) this.#completionStep('20474536', 'OR EAX failedIoResult minus1', () => this.#set('EAX', this.#alu('or', this.#register('EAX'), this.#immediate(0xffffffff))));
    this.#completionStep('20474539', 'CALL outerIoSEHEpilog4', () => this.#call('20474539', '2047453e'));
    this.#outerEpilogActive = true; this.#completionEpilog('2047453e'); this.#outerEpilogReturned = true;
    this.#return('2047453e', '204678d3', 'completion'); this.#callerReturnConsumed = true;
    const result = fact(NativeX86ThreadStack.prototype.ioReturnResult.call(this.#stack, this.#controller));
    if (result !== 0 && result !== -1) throw new Error('Actual source IO return must be zero or signed minus1');
    this.#ioResult = result; this.#standardLoopActive = false; this.#outerEpilogActive = false;
    this.#phase = 'returned'; this.#pc = '204678d3';
  }
  #suspend(boundary: string): void {
    // Retention uses its own original-controller proof even if the caller's
    // execution permit was invalidated. It never unwinds or stores an epilog.
    try {
      const retained = NativeX86ThreadStack.prototype.suspendUnknown.call(this.#stack, this.#controller, boundary);
      this.#suspension = Object.freeze(retained.known ? known(undefined) : unknown(retained.reason));
    } catch (error) { this.#suspension = Object.freeze(unknown(reason(error))); }
    this.#boundary ??= boundary; this.#phase = 'blocked';
  }

  #enter(bootstrap: NativeCrtBootstrap, permit: object): NativeValue<number> {
    if (this.#phase === 'returned') return unknown('The completed Game ioInit invocation cannot replay');
    if (this.#phase === 'blocked') return unknown(this.#boundary!);
    if (this.#phase === 'invoking') {
      this.#suspend('Reentrant Game ioInit interrupted its active source prefix'); return unknown(this.#boundary!);
    }
    this.#bootstrap = bootstrap; this.#permit = permit; this.#phase = 'invoking';
    try {
      admitGameIoStartupSource(); this.#guard();
      this.#step('204678ce', 'CALL ioInit204742ff', () => NativeX86ThreadStack.prototype.beginIoCall.call(this.#stack, this.#controller));
      this.#incomingCallCompleted = true;
      this.#step('204742ff', 'PUSH allocationSize', () => this.#push(this.#immediate(0x54)));
      this.#step('20474301', 'PUSH readonlyScope', () => {
        fact(NativeX86ThreadStack.prototype.registerSourceImage.call(this.#stack, this.#controller, '206e8e90', this.#scope));
        return this.#push(fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack, this.#controller, 'image', '206e8e90')));
      });
      this.#step('20474306', 'CALL sehProlog4', () => NativeX86ThreadStack.prototype.call.call(this.#stack, this.#controller, '20474306', '2047430b'));
      this.#step('20468570', 'PUSH handlerAddress', () => this.#push(fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack, this.#controller, 'code', '20468600'))));
      this.#step('20468575', 'PUSH previousFS0', () => this.#push(fact(NativeX86ThreadStack.prototype.readFs0.call(this.#stack, this.#controller))));
      this.#step('2046857c', 'MOV EAX allocationSize', () => this.#set('EAX', this.#load(this.#relative('ESP', 0x10))));
      this.#step('20468580', 'MOV savedEBP', () => this.#store(this.#relative('ESP', 0x10), this.#register('EBP')));
      this.#step('20468584', 'LEA EBP', () => this.#set('EBP', this.#relative('ESP', 0x10)));
      this.#step('20468588', 'SUB ESP EAX', () => this.#set('ESP', fact(NativeX86ThreadStack.prototype.subtract.call(this.#stack, this.#controller, this.#register('ESP'), this.#register('EAX')))));
      this.#step('2046858a', 'PUSH savedEBX', () => this.#push(this.#register('EBX')));
      this.#step('2046858b', 'PUSH savedESI', () => this.#push(this.#register('ESI')));
      this.#step('2046858c', 'PUSH savedEDI', () => this.#push(this.#register('EDI')));
      this.#step('2046858d', 'MOV EAX currentSecurityCookie', () => {
        return this.#set('EAX', fact(NativeX86ThreadStack.prototype.readGameImageWord.call(this.#stack, this.#controller, 'securityCookie', 0)));
      });
      this.#step('20468592', 'XOR scopeCookie', () => {
        const address = this.#relative('EBP', -4);
        return this.#store(address, this.#xor(this.#load(address), this.#register('EAX')));
      });
      this.#step('20468595', 'XOR EAX EBP', () => this.#set('EAX', this.#xor(this.#register('EAX'), this.#register('EBP'))));
      this.#step('20468597', 'PUSH frameCookie', () => this.#push(this.#register('EAX')));
      this.#step('20468598', 'MOV savedESP', () => this.#store(this.#relative('EBP', -0x18), this.#register('ESP')));
      this.#step('2046859b', 'PUSH prologReturn', () => this.#push(this.#load(this.#relative('EBP', -8))));
      this.#step('2046859e', 'MOV EAX encodedScope', () => this.#set('EAX', this.#load(this.#relative('EBP', -4))));
      this.#step('204685a1', 'MOV tryLevel minus2', () => this.#store(this.#relative('EBP', -4), this.#immediate(0xfffffffe)));
      this.#step('204685a8', 'MOV encodedScope', () => this.#store(this.#relative('EBP', -8), this.#register('EAX')));
      this.#step('204685ab', 'LEA registrationAddress', () => this.#set('EAX', this.#relative('EBP', -0x10)));
      this.#step('204685ae', 'MOV FS0 registration', () => NativeX86ThreadStack.prototype.writeFs0.call(this.#stack, this.#controller, this.#register('EAX')));
      this.#fsPublished = true;
      const returned = this.#step('204685b4', 'RET prolog', () => NativeX86ThreadStack.prototype.ret.call(this.#stack, this.#controller));
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack, this.#controller, returned, 'code', '2047430b'));
      this.#prologReturned = true;
      this.#step('2047430b', 'XOR EDI EDI', () => { const edi = this.#register('EDI'); return this.#set('EDI', this.#xor(edi, edi)); });
      this.#step('2047430d', 'MOV tryLevel zero', () => this.#store(this.#relative('EBP', -4), this.#register('EDI')));
      this.#step('20474310', 'LEA startupInfo', () => this.#set('EAX', this.#relative('EBP', -0x64)));
      this.#step('20474313', 'PUSH startupInfo', () => this.#push(this.#register('EAX')));
      this.#pc = '20474314'; this.#guard(); gameIoStartupInstruction(this.#pc);
      this.#startupInfo = fact(NativeX86ThreadStack.prototype.startupInfoView.call(this.#stack, this.#controller, this.#register('EBP')));
      this.#guard(); this.#writerBoundaryReached = true;
      // The retained platform decides whether it owns this import before it
      // pushes a return word. Only its normal void stdcall return permits the
      // next source row; snapshots of a pending call supply no such authority.
      admitGameIoWriterSource();
      this.#step('20474314', 'CALL GetStartupInfoA IAT207d7c1c', () =>
        NativeX86ThreadStack.prototype.invokeStartupInfoA.call(this.#stack, this.#controller), true);
      this.#step('2047431a', 'MOV tryLevel minus2 after writer return', () =>
        this.#store(this.#relative('EBP', -4), this.#immediate(0xfffffffe)), true);
      this.#step('20474321', 'PUSH calloc size56', () => this.#push(this.#immediate(0x38)), true);
      this.#step('20474323', 'PUSH calloc count32', () => this.#push(this.#immediate(0x20)), true);
      this.#step('20474325', 'POP ESI count32', () =>
        NativeX86ThreadStack.prototype.pop.call(this.#stack, this.#controller, 'ESI'), true);
      this.#step('20474326', 'PUSH ESI calloc count32', () => this.#push(this.#register('ESI')), true);
      this.#pc = '20474327'; this.#guard(); gameIoWriterStartupInstruction(this.#pc);
      this.#callocBoundaryReached = true;
      this.#calloc();
      if (this.#initializeFirstBlock()) this.#standardHandles();
      return NativeGameCrtIoInit.canonicalReturnedIoForCrt(this, this.#crt, bootstrap, permit);
    } catch (error) { this.#suspend(reason(error)); return unknown(this.#boundary!); }
  }

  snapshot() {
    const stack = NativeX86ThreadStack.prototype.snapshot.call(this.#stack);
    // These copied graph rows describe actual pushed/consumed return words,
    // including a post-operation guard failure. They never authorize a call,
    // retry, epilog or continuation on the retained graph.
    const callocCall = stack.calls.find(call => call.site === '20474327');
    const incomingCall = stack.calls.find(call => call.site === '204678ce');
    const outerEpilogCall = stack.calls.find(call => call.site === '20474539');
    const nextBoundary: Readonly<NativeGameCrtIoInitNextBoundary> | null = this.#phase === 'returned'
      ? Object.freeze({ pc: '204678d3', instruction: 'TEST EAX,EAX', operation: 'callerTest' })
      : this.#standardIoCallSite && this.#pc === this.#standardIoCallSite
        ? standardIoBoundaries[this.#standardIoCallSite]
      : this.#standardHandleBoundaryReached && this.#pc === '204744b4'
        ? Object.freeze({ pc: '204744b4', iat: '207d7bbc', operation: 'GetStdHandle' })
      : this.#heapAllocBoundaryReached && this.#pc === '20477ce8'
        ? Object.freeze({ pc: '20477ce8', iat: '207d7b84', operation: 'HeapAlloc' })
      : this.#callocBoundaryReached && this.#pc === '20474327' && !callocCall
      ? Object.freeze({ pc: '20474327', target: '204683ce', operation: 'calloc' })
      : this.#writerBoundaryReached && this.#pc === '20474314'
        ? Object.freeze({ pc: '20474314', iat: '207d7c1c', operation: 'GetStartupInfoA' }) : null;
    let startupInfo: Readonly<{ bytes: readonly number[] | null; knownMask: readonly number[] | null;
      length: number | null; freed: boolean | null }> | null = null;
    if (this.#startupInfo) {
      // Copy the retained physical arrays without executing a native field
      // read, minting a word, or exposing the private alias used by a writer.
      let bytes: readonly number[] | null = null, masks: readonly number[] | null = null;
      let length: number | null = null, freed: boolean | null = null;
      try {
        bytes = Object.freeze(Array.prototype.slice.call(this.#startupInfo.bytes) as number[]);
        masks = Object.freeze(Array.prototype.slice.call(this.#startupInfo.knownMask) as number[]);
        length = this.#startupInfo.bytes.length; freed = this.#startupInfo.backing.freed;
      } catch { /* A detached diagnostic view remains descriptive only. */ }
      startupInfo = Object.freeze({ bytes, knownMask: masks, length, freed });
    }
    return Object.freeze({ module: 'Game' as const, entry: '204742ff', phase: this.#phase, pc: this.#pc,
      boundary: this.#boundary, nextBoundary, incomingCallCompleted: this.#incomingCallCompleted,
      prologReturned: this.#prologReturned, fsPublished: this.#fsPublished,
      startupInfo, suspension: this.#suspension,
      effects: Object.freeze([...this.#effects]),
      stack,
      callerReturn: '204678d3', callerReturnConsumed: this.#callerReturnConsumed || incomingCall?.returned === true,
      callerSlotLifetime: this.#callerReturnConsumed || incomingCall?.returned === true
        ? 'consumed-by-original-ioInit-RET2047453e' as const : 'retained-through-final-ioInit-RET2047453e' as const,
      startupInfoFrameLifetime: incomingCall?.returned === true ? 'expired' as const : 'retained' as const,
      getStartupInfoCallPushed: stack.startupInfoCallPushed,
      getStartupInfoCalled: stack.startupInfoWriterCalled, getStartupInfoReturned: stack.startupInfoWriterReturned,
      callocArgumentPrefixCompleted: this.#callocBoundaryReached,
      callocCalled: this.#callocCalled || !!callocCall,
      callocReturned: this.#callocReturned || callocCall?.returned === true,
      callocImplActive: this.#callocImplActive, nestedPrologReturned: this.#nestedPrologReturned,
      nestedEpilogReturned: this.#nestedEpilogReturned,
      heapAllocCallPushed: stack.heapAllocCallPushed, heapAllocCalled: stack.heapAllocCalled,
      heapAllocReturned: stack.heapAllocReturned,
      firstIoBlockAllocated: stack.heapAllocBlockAllocated,
      ioBlockPublished: this.#ioBlockPublished, ioHandleCountPublished: this.#ioCountPublished,
      ioGlobalsPublished: this.#ioBlockPublished && this.#ioCountPublished,
      initializedRecordCount: this.#initializedRecordCount,
      standardInputArgumentPrepared: this.#standardInputArgumentPrepared,
      standardIoCalls: stack.standardIoCalls,
      getStdHandleReturnedCount: stack.standardIoCalls.filter(call => call.site === '204744b4' && call.returned).length,
      getFileTypeReturnedCount: stack.standardIoCalls.filter(call => call.site === '204744c6' && call.returned).length,
      sectionHelperReturnedCount: stack.calls.filter(call => call.site === '204744f4' && call.returned).length,
      initializedStandardRecordCount: this.#effects.filter(effect => effect.pc === '204744ff').length,
      setHandleCountReturned: stack.standardIoCalls.some(call => call.site === '2047451e' && call.returned),
      sectionActive: this.#sectionActive, sectionPrologReturned: this.#sectionPrologReturned,
      sectionEpilogReturned: this.#sectionEpilogReturned, decodeActive: this.#decodeActive,
      exceptionDispatchExecuted: false,
      outerEpilogEntered: !!outerEpilogCall, outerEpilogReturned: this.#outerEpilogReturned || outerEpilogCall?.returned === true,
      epilogExecuted: this.#outerEpilogReturned || outerEpilogCall?.returned === true,
      ioInitRetExecuted: incomingCall?.returned === true, ioResult: this.#ioResult,
      ioInitReturned: this.#phase === 'returned', wholeCrtTraversalCompleted: false, moduleAttachCompleted: false });
  }
}
export type NativeGameCrtIoInitSnapshot = ReturnType<NativeGameCrtIoInit['snapshot']>;
