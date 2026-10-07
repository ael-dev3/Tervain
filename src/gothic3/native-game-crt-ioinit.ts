/** Actual incoming Game ioInit call, __SEH_prolog4 and selected STARTUPINFOA
 * import continuation. A normal declared writer advances to the real calloc
 * argument prefix; nested allocation, exceptions and final return remain unowned. */
import type { NativeValue } from './dialogue';
import { NativeCrtBootstrap } from './native-crt-bootstrap';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import type { NativeHeapObjectViews } from './native-heap-views';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeX86ThreadStack } from './native-x86-thread-stack';
import type { NativeX86Word32 } from './native-x86-thread-stack';
import { admitGameIoStartupSource, gameIoStartupInstruction, gameIoStartupImageReceipt } from './native-game-crt-io-source';
import { admitGameIoWriterSource, gameIoWriterStartupInstruction } from './native-game-crt-io-writer-source';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function fact<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function reason(error: unknown): string {
  try { return error instanceof Error ? error.message : String(error); }
  catch { return 'Game ioInit escaped without an owned error description'; }
}
type Phase = 'cold' | 'invoking' | 'blocked';
interface Construction {
  phase: 'constructing' | 'returned' | 'blocked'; owner: NativeGameCrtIoInit | null; boundary: string | null;
}
interface IoEffect {
  readonly pc: string; readonly operation: string;
}
export type NativeGameCrtIoInitNextBoundary =
  | Readonly<{ pc: '20474314'; iat: '207d7c1c'; operation: 'GetStartupInfoA' }>
  | Readonly<{ pc: '20474327'; target: '204683ce'; operation: 'calloc' }>;
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
      return entry.phase === 'returned' && (owner.#phase === 'invoking' || owner.#phase === 'blocked')
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
  }
  #guard(): void {
    this.#requireImages();
    if (this.#phase !== 'invoking' || !this.#bootstrap || !this.#permit) throw new Error(this.#boundary ?? 'Actual active ioInit invocation required');
    fact(NativeCrtBootstrap.canonicalIoCallForCrt(this.#bootstrap, this.#crt, this.#permit));
  }
  #step<T>(pc: string, operation: string, body: () => NativeValue<T>, writerSource = false): T {
    this.#pc = pc; this.#guard();
    if (writerSource) gameIoWriterStartupInstruction(pc); else gameIoStartupInstruction(pc);
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
      this.#suspend('Game ioInit20474327 calloc204683ce requires its actual nested source call, frame, allocation and return; count32 and size56 arguments and the published outer SEH frame remain retained');
      return unknown(this.#boundary!);
    } catch (error) { this.#suspend(reason(error)); return unknown(this.#boundary!); }
  }

  snapshot() {
    const nextBoundary: Readonly<NativeGameCrtIoInitNextBoundary> | null = this.#callocBoundaryReached
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
    const stack = NativeX86ThreadStack.prototype.snapshot.call(this.#stack);
    return Object.freeze({ module: 'Game' as const, entry: '204742ff', phase: this.#phase, pc: this.#pc,
      boundary: this.#boundary, nextBoundary, incomingCallCompleted: this.#incomingCallCompleted,
      prologReturned: this.#prologReturned, fsPublished: this.#fsPublished,
      startupInfo, suspension: this.#suspension,
      effects: Object.freeze([...this.#effects]),
      stack,
      callerReturn: '204678d3', callerReturnConsumed: false,
      callerSlotLifetime: 'retained-through-final-ioInit-RET2047453e' as const,
      getStartupInfoCallPushed: stack.startupInfoCallPushed,
      getStartupInfoCalled: stack.startupInfoWriterCalled, getStartupInfoReturned: stack.startupInfoWriterReturned,
      callocArgumentPrefixCompleted: this.#callocBoundaryReached,
      callocCalled: false, firstIoBlockAllocated: false, ioGlobalsPublished: false,
      exceptionDispatchExecuted: false, epilogExecuted: false,
      ioInitReturned: false, wholeCrtTraversalCompleted: false, moduleAttachCompleted: false });
  }
}
export type NativeGameCrtIoInitSnapshot = ReturnType<NativeGameCrtIoInit['snapshot']>;
