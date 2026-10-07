/** The bounded original Game caller/environment source unit. Every reached instruction
 * is lowered from its admitted original receipt into the same physical graph
 * that actually returned from argv. Heap imports require fixed private
 * source grants; alternate unowned calls retain their reached frontier. */
import type { NativeValue } from './dialogue';
import { NativeCrtBootstrap } from './native-crt-bootstrap';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { NativeGameCrtArgv } from './native-game-crt-argv';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeX86ThreadStack } from './native-x86-thread-stack';
import type { NativeX86Word32, NativeX86Register, NativeX86Condition } from './native-x86-thread-stack';
import type { NativeHeapObjectViews } from './native-heap-views';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
import type { NativeSetEnvpCallSite, NativeWin32SetEnvpSelection } from './native-win32-setenvp';
import { admitGameSetEnvpSource, gameSetEnvpInstruction, gameSetEnvpImageReceipt } from './native-game-crt-setenvp-source';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function fact<T>(value: NativeValue<T>): T { if (!value.known) throw new Error(value.reason); return value.value; }
function reason(error: unknown): string {
  try { return error instanceof Error ? error.message : String(error); }
  catch { return 'Original Game environment source escaped without an owned reason'; }
}
type Width = 1 | 2 | 4;
type Lane = 'low8' | 'high8' | 'low16';
type Phase = 'cold' | 'claiming' | 'invoking' | 'blocked';
interface Construction { phase: 'constructing' | 'returned' | 'blocked'; owner: NativeGameCrtSetEnvp | null; boundary: string | null; }
interface Frame { readonly entry: string; readonly site: string; readonly returnPc: string; readonly previousEntry: string; }
interface Effect { readonly pc: string; readonly operation: string; }
interface Image { readonly label: string; readonly address: number; readonly bytes: number; readonly fields: NativeHeapObjectViews; }
type Operand = Readonly<{ kind: 'register'; register: NativeX86Register; lane?: Lane }> |
  Readonly<{ kind: 'immediate'; value: number }> |
  Readonly<{ kind: 'memory'; expression: string; width?: Width; fs: boolean }>;
interface InstructionSyntax {
  readonly opcode: string; readonly next: string; readonly args: readonly Operand[]; readonly binary: boolean;
}
type AddressTermSyntax = Readonly<{ kind: 'register'; register: NativeX86Register; scale: number; negative: boolean }> |
  Readonly<{ kind: 'literal'; value: number; negative: boolean }>;
export type NativeGameCrtSetEnvpNextBoundary = Readonly<{ pc: string; operation: string; target: string }> |
  Readonly<{ pc: string; operation: string; iat: string }> |
  Readonly<{ pc: string; operation: string; instruction: string }>;

const owners = new WeakMap<NativeModuleCrtOwner, Construction>();
const constructionToken = Object.freeze({});
// Only immutable admitted syntax is shared. Current words, addresses, image
// aliases, flags and successful controller/physical proofs are never cached.
const instructionSyntaxCache = new WeakMap<NativeGameIoInstruction, InstructionSyntax>();
const addressSyntaxCache = new Map<string, readonly AddressTermSyntax[]>();
// These are the complete original body extents, not a general x86 entry API.
// The separate getter proves every actual row's original bytes and ASM line.
const bodies = Object.freeze([
  ['204677e4', '204677e4-204679bc'], ['204764ff', '204764ff-20476592;20476596-204765d9'],
  ['2046dbd0', '2046dbd0-2046dc5a'], ['20475b80', '20475b80-20475be4'],
  ['20467c6a', '20467c6a-20467cbf;20467cc9-20467cf7'], ['204683ce', '204683ce-20468415'],
  ['20477c2a', '20477c2a-20477d20;20477d2f-20477d47'],
  ['20468570', '20468570-204685b4'], ['204685b5', '204685b5-204685c8'],
] as const);
const ranges = new Map<string, readonly (readonly [number, number])[]>(bodies.map(([entry, text]) =>
  [entry, Object.freeze(text.split(';').map(range => Object.freeze(range.split('-').map(x => Number.parseInt(x, 16)) as [number, number]))) ]));
const callerRows = new Set(['204678e7', '204678ec', '204678ee', '204678f0']);
const imageSpecs = Object.freeze([
  ['envp', '207d0a4c', 4], ['environmentAllocated', '207d2b6c', 4],
  ['environmentBlock', '207d0a74', 4], ['mbcInitialized', '207d2b84', 4],
  ['crtHeapMode', '207d1658', 4], ['crtHeapHandle', '207d11b4', 4], ['securityCookie', '207b2314', 4],
  ['crtMallocRetry', '207d0a94', 4], ['newMode', '207d14e0', 4],
  ['callocEH4Scope', '206e8f98', 28], ['freeEH4Scope', '206e8b70', 28],
] as const);
const imports = new Set<NativeSetEnvpCallSite>(['20477ce8', '20467cd2']);
const lanes: Readonly<Record<string, Readonly<{ register: NativeX86Register; lane: Lane }>>> = Object.freeze({
  AL: { register: 'EAX', lane: 'low8' }, AH: { register: 'EAX', lane: 'high8' }, AX: { register: 'EAX', lane: 'low16' },
  BL: { register: 'EBX', lane: 'low8' }, BH: { register: 'EBX', lane: 'high8' }, BX: { register: 'EBX', lane: 'low16' },
  CL: { register: 'ECX', lane: 'low8' }, CH: { register: 'ECX', lane: 'high8' }, CX: { register: 'ECX', lane: 'low16' },
  DL: { register: 'EDX', lane: 'low8' }, DH: { register: 'EDX', lane: 'high8' }, DX: { register: 'EDX', lane: 'low16' },
  SI: { register: 'ESI', lane: 'low16' }, DI: { register: 'EDI', lane: 'low16' },
});
const conditions: Readonly<Record<string, NativeX86Condition>> = Object.freeze({
  JZ: 'z', JNZ: 'nz', JBE: 'be', JA: 'a', JC: 'c', JNC: 'nc', JL: 'l', JGE: 'ge', JLE: 'le', JG: 'g',
});
function hex(value: number): string { return (value >>> 0).toString(16).padStart(8, '0'); }
function integer(text: string): number {
  if (!/^-?0x[0-9a-f]+$/.test(text)) throw new Error('Original environment scalar operand syntax is not owned: ' + text);
  const value = text.startsWith('-') ? -Number.parseInt(text.slice(3), 16) : Number.parseInt(text.slice(2), 16);
  if (!Number.isSafeInteger(value) || value < -0x80000000 || value > 0xffffffff) throw new Error('Original environment scalar exceeds32 bits');
  return value >>> 0;
}
function operand(text: string): Operand {
  const value = text.trim();
  if (/^E(?:AX|BX|CX|DX|SI|DI|BP|SP)$/.test(value)) return { kind: 'register', register: value as NativeX86Register };
  if (lanes[value]) return { kind: 'register', ...lanes[value] };
  if (/^-?0x[0-9a-f]+$/.test(value)) return { kind: 'immediate', value: integer(value) };
  const memory = /^(?:(byte|word|dword) ptr )?(FS:)?\[(.+)\]$/.exec(value);
  if (!memory || !memory[3]) throw new Error('Original environment operand syntax is not owned: ' + value);
  return { kind: 'memory', expression: memory[3], fs: !!memory[2],
    width: memory[1] === 'byte' ? 1 : memory[1] === 'word' ? 2 : memory[1] === 'dword' ? 4 : undefined };
}
function instructionSyntax(point: NativeGameIoInstruction): InstructionSyntax {
  const retained = instructionSyntaxCache.get(point); if (retained) return retained;
  const [opcode, ...rest] = point.instruction.split(' '), text = rest.join(' ');
  if (!opcode) throw new Error('Original environment opcode is absent at' + point.va);
  const next = hex(Number.parseInt(point.va, 16) + point.bytes.length / 2);
  const stringOperation = opcode === 'MOVSD.REP' || opcode === 'STOSD.REP' || opcode === 'STOSD';
  if (stringOperation && text !== (opcode === 'MOVSD.REP' ? 'ES:EDI,ESI' : 'ES:EDI')) {
    throw new Error('Original string-operation operands differ');
  }
  // Preserve the original string-operation bypass and parse only this reached
  // row. Operand-presence and opcode-specific checks still run in #lower.
  const args = Object.freeze(stringOperation ? [] : text.split(',').filter(Boolean).map(value => Object.freeze(operand(value))));
  const parsed = Object.freeze({ opcode, next, args,
    binary: ['MOV', 'MOVZX', 'MOVSX', 'LEA', 'CMP', 'TEST', 'XOR', 'ADD', 'SUB', 'SBB', 'OR', 'AND', 'IMUL', 'SHL', 'SHR', 'XCHG'].includes(opcode) });
  instructionSyntaxCache.set(point, parsed); return parsed;
}
function width(value: Operand): Width {
  return value.kind === 'register' && value.lane ? value.lane === 'low16' ? 2 : 1 : value.kind === 'memory' ? value.width ?? 4 : 4;
}

export class NativeGameCrtSetEnvp {
  readonly #crt: NativeModuleCrtOwner;
  readonly #platform: NativeRuntimePlatform;
  readonly #selection: Readonly<NativeWin32SetEnvpSelection>;
  readonly #stack: NativeX86ThreadStack;
  readonly #controller = Object.freeze({});
  readonly #images: readonly Image[];
  readonly #effects: Effect[] = [];
  readonly #frames: Frame[] = [];
  #phase: Phase = 'cold';
  #bootstrap: NativeCrtBootstrap | null = null;
  #permit: object | null = null;
  #pc = '204678e7';
  #currentEntry = '204677e4';
  #attempt: NativeGameIoInstruction | null = null;
  #boundary: string | null = null;
  #nextBoundary: NativeGameCrtSetEnvpNextBoundary | null = null;
  #importSite: NativeSetEnvpCallSite | null = null;
  #physicalGraphTransferred = false;
  #envCalled = false;
  #callerReturnConsumed = false;
  #envResult: 0 | -1 | null = null;
  #countingPassReturned = false;
  #visibleCount = 0;
  #arrayCallReturned = false;
  #stringAllocationCallsReturned = 0;
  #stringCopiesCompleted = 0;
  #envpPublished = false;
  #inputFreeReturned = false;
  #environmentBlockCleared = false;
  #terminalNullWritten = false;
  #cinitArgumentPrepared = false;
  #callerTestsCompleted = 0;

  private constructor(crt: NativeModuleCrtOwner, selected: Readonly<NativeWin32SetEnvpSelection>, token: object, entry: Construction) {
    if (token !== constructionToken || new.target !== NativeGameCrtSetEnvp || owners.get(crt) !== entry || entry.owner || entry.phase !== 'constructing') {
      throw new Error('Actual private Game environment construction required');
    }
    admitGameSetEnvpSource(); this.#crt = crt; this.#platform = crt.host.platform as NativeRuntimePlatform; this.#selection = selected;
    this.#requireCrt(); this.#stack = fact(NativeX86ThreadStack.forPlatform(this.#platform));
    this.#images = Object.freeze(imageSpecs.map(([label, address, bytes]) => {
      const receipt = gameSetEnvpImageReceipt(label),
        fields = fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, label));
      if (receipt.address !== address || receipt.bytes !== bytes || fields.bytes.length !== bytes || fields.knownMask.length !== bytes) {
        throw new Error('Actual original environment image geometry differs: ' + label);
      }
      return Object.freeze({ label, address: Number.parseInt(address, 16), bytes, fields });
    }));
    entry.owner = this; this.#requireImages(); Object.freeze(this);
  }
  static forCrt(crt: NativeModuleCrtOwner): NativeValue<NativeGameCrtSetEnvp> {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game') return unknown('Actual constructed Game CRT required for environment');
    const selected = NativeRuntimePlatform.setEnvpSelectionForPlatform(crt.host.platform as NativeRuntimePlatform);
    if (!selected.known) return selected;
    const retained = owners.get(crt);
    if (retained) {
      if (retained.phase === 'constructing') { retained.phase = 'blocked'; retained.boundary = 'Reentrant Game environment construction cannot restart'; }
      if (retained.phase !== 'returned') return unknown(retained.boundary!);
      try { retained.owner!.#requireImages(); return known(retained.owner!); } catch (error) { return unknown(reason(error)); }
    }
    const entry: Construction = { phase: 'constructing', owner: null, boundary: null }; owners.set(crt, entry);
    try {
      const owner = new NativeGameCrtSetEnvp(crt, selected.value, constructionToken, entry);
      if (entry.phase !== 'constructing' || entry.owner !== owner) throw new Error(entry.boundary ?? 'Game environment construction interrupted');
      entry.phase = 'returned'; return known(owner);
    } catch (error) { entry.phase = 'blocked'; entry.boundary ??= reason(error); return unknown(entry.boundary); }
  }
  static canonicalControllerForCrt(owner: NativeGameCrtSetEnvp, crt: NativeModuleCrtOwner, controller: object,
    mode: 'bind' | 'invoke' | 'retain'): NativeValue<void> {
    const entry = owners.get(crt);
    if (!owner || entry?.phase !== 'returned' || entry.owner !== owner || owner.#crt !== crt || controller !== owner.#controller) {
      return unknown('Actual retained same-CRT environment controller required');
    }
    if (mode === 'retain') return owner.#phase !== 'cold' ? known(undefined) : unknown('Actual reached environment claim required for retention');
    try {
      owner.#requireImages();
      if (!owner.#bootstrap || !owner.#permit) return unknown('Actual private bootstrap environment scope required');
      const caller = NativeCrtBootstrap.canonicalSetEnvpCallForCrt(owner.#bootstrap, crt, owner.#permit); if (!caller.known) return caller;
      if (mode === 'bind') return owner.#phase === 'claiming' && !owner.#physicalGraphTransferred && owner.#pc === '204678e7'
        ? known(undefined) : unknown('Actual one-time reached argv frontier claim required');
      return owner.#phase === 'invoking' && owner.#physicalGraphTransferred ? known(undefined)
        : unknown(owner.#boundary ?? 'Actual active environment source invocation required');
    } catch (error) { return unknown(reason(error)); }
  }
  static canonicalSetEnvpImportCallForCrt(owner: NativeGameCrtSetEnvp, crt: NativeModuleCrtOwner, controller: object,
    site: NativeSetEnvpCallSite): NativeValue<void> {
    const active = NativeGameCrtSetEnvp.canonicalControllerForCrt(owner, crt, controller, 'invoke'); if (!active.known) return active;
    try {
      if (owner.#pc !== site || owner.#importSite !== site || !imports.has(site) || !owner.#frames.length ||
          !gameSetEnvpInstruction(site).instruction.startsWith('CALL ')) return unknown('Actual current original environment import source row required');
      owner.#requireSourcePoint(site); return known(undefined);
    } catch (error) { return unknown(reason(error)); }
  }
  static canonicalSourceFrameChainForCrt(owner: NativeGameCrtSetEnvp, crt: NativeModuleCrtOwner, controller: object):
    NativeValue<readonly Readonly<{ entry: string; site: string; returnPc: string }>[]> {
    const active = NativeGameCrtSetEnvp.canonicalControllerForCrt(owner, crt, controller, 'invoke'); if (!active.known) return active;
    try {
      owner.#requireSourcePoint(owner.#pc);
      return known(Object.freeze(owner.#frames.map(frame => Object.freeze({ entry: frame.entry, site: frame.site, returnPc: frame.returnPc }))));
    } catch (error) { return unknown(reason(error)); }
  }
  static canonicalSetEnvpReturnForCrt(owner: NativeGameCrtSetEnvp, crt: NativeModuleCrtOwner, controller: object): NativeValue<void> {
    const active = NativeGameCrtSetEnvp.canonicalControllerForCrt(owner, crt, controller, 'invoke'); if (!active.known) return active;
    const frame = owner.#frames.at(-1);
    return owner.#pc === '204765c3' && owner.#currentEntry === '204764ff' && owner.#envCalled && owner.#callerReturnConsumed &&
      frame?.site === '204678e7' && frame.returnPc === '204678ec' && owner.#frames.length === 1 && owner.#importSite === null
      ? known(undefined) : unknown('Actual original setenvp RET/current restored callee required');
  }
  static canonicalReturnedSetEnvpForCrt(owner: NativeGameCrtSetEnvp, crt: NativeModuleCrtOwner,
    bootstrap: NativeCrtBootstrap, permit: object): NativeValue<0 | -1> {
    const entry = owners.get(crt);
    if (!owner || entry?.phase !== 'returned' || entry.owner !== owner || owner.#crt !== crt || owner.#bootstrap !== bootstrap ||
        owner.#permit !== permit || !owner.#physicalGraphTransferred || !owner.#callerReturnConsumed || owner.#envResult === null) {
      return unknown('Actual same original invocation environment normal return required');
    }
    const caller = NativeCrtBootstrap.canonicalSetEnvpCallForCrt(bootstrap, crt, permit); if (!caller.known) return caller;
    try { owner.#requireImages(); return known(owner.#envResult); } catch (error) { return unknown(reason(error)); }
  }
  static enterFromArgvFrontierForAttach(owner: NativeGameCrtSetEnvp, argv: NativeGameCrtArgv, crt: NativeModuleCrtOwner,
    bootstrap: NativeCrtBootstrap, argvPermit: object, envPermit: object): NativeValue<void> {
    if (!owner || owners.get(crt)?.owner !== owner || owner.#crt !== crt) return unknown('Actual retained same-CRT environment owner required');
    if (owner.#phase !== 'cold') return unknown(owner.#boundary ?? 'Game environment invocation cannot replay');
    const caller = NativeCrtBootstrap.canonicalSetEnvpCallForCrt(bootstrap, crt, envPermit); if (!caller.known) return caller;
    const returned = NativeGameCrtArgv.canonicalReturnedArgvForCrt(argv, crt, bootstrap, argvPermit); if (!returned.known) return returned;
    if (returned.value !== 0) return unknown('Actual successful argv return required before environment call');
    owner.#bootstrap = bootstrap; owner.#permit = envPermit; owner.#phase = 'claiming';
    try {
      owner.#requireImages();
      const graph = fact(NativeGameCrtArgv.transferFrontierGraphForSetEnvp(argv, crt, bootstrap, argvPermit, owner, owner.#controller));
      if (graph !== owner.#stack) throw new Error('Actual argv frontier graph differs from retained environment graph');
      owner.#physicalGraphTransferred = true; owner.#phase = 'invoking'; owner.#run();
      return known(undefined);
    } catch (error) { return owner.#stop(reason(error)); }
  }
  #requireCrt(): void {
    if (!NativeModuleCrtOwner.isConstructedOwner(this.#crt) || this.#crt.module !== 'Game' || this.#crt.host.platform !== this.#platform) {
      throw new Error('Actual same-platform constructed Game CRT required for environment');
    }
    fact(NativeRuntimePlatform.requireActivePlatform(this.#platform));
    if (fact(NativeRuntimePlatform.setEnvpSelectionForPlatform(this.#platform)) !== this.#selection) throw new Error('Actual immutable fresh environment/heap selection required');
  }
  #requireImages(): void {
    this.#requireCrt();
    for (const image of this.#images) if (fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, image.label)) !== image.fields ||
        image.fields.backing.freed !== false || image.fields.bytes.length !== image.bytes || image.fields.knownMask.length !== image.bytes) {
      throw new Error('Actual retained environment image alias/lifetime required: ' + image.label);
    }
  }
  #guard(): void {
    fact(NativeGameCrtSetEnvp.canonicalControllerForCrt(this, this.#crt, this.#controller, 'invoke'));
  }
  #requireSourcePoint(pc: string): NativeGameIoInstruction {
    const extent = ranges.get(this.#currentEntry), address = Number.parseInt(pc, 16);
    if (!extent?.some(([first, last]) => address >= first && address <= last) ||
        this.#currentEntry === '204677e4' && !callerRows.has(pc)) throw new Error('Unowned Game environment source frontier at' + pc);
    const point = gameSetEnvpInstruction(pc);
    if (point.va !== pc || !/^(?:[0-9a-f]{2})+$/.test(point.bytes)) throw new Error('Original environment row receipt differs at' + pc);
    return point;
  }
  #register(register: NativeX86Register): NativeX86Word32 { return fact(NativeX86ThreadStack.prototype.register.call(this.#stack, this.#controller, register)); }
  #immediate(value: number): NativeX86Word32 { return fact(NativeX86ThreadStack.prototype.immediate.call(this.#stack, this.#controller, value >>> 0)); }
  #imageAt(value: number): Image | undefined { return this.#images.find(image => value >= image.address && value < image.address + image.bytes); }
  #literal(value: number): NativeX86Word32 {
    const image = this.#imageAt(value);
    if (image && (image.label === 'callocEH4Scope' || image.label === 'freeEH4Scope') && value === image.address) {
      const address = hex(value);
      fact(NativeX86ThreadStack.prototype.registerSourceImage.call(this.#stack, this.#controller, address, image.fields));
      return fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack, this.#controller, 'image', address));
    }
    if (image) return fact(NativeX86ThreadStack.prototype.gameImageAddress.call(this.#stack, this.#controller, image.label, value - image.address));
    if (value === 0x20468600) return fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack, this.#controller, 'code', '20468600'));
    return this.#immediate(value);
  }
  #address(expression: string): NativeX86Word32 {
    const terms: { word: NativeX86Word32; scale?: number; negative?: boolean }[] = []; let displacement = 0;
    const retained = addressSyntaxCache.get(expression);
    if (retained) {
      for (const term of retained) {
        if (term.kind === 'register') terms.push({ word: this.#register(term.register), scale: term.scale, negative: term.negative });
        else {
          const image = !term.negative && this.#imageAt(term.value);
          if (image) terms.push({ word: this.#literal(term.value) }); else displacement += (term.negative ? -1 : 1) * (term.value | 0);
        }
      }
    } else {
      // Build descriptors lazily while preserving the first visit's original
      // live-register/scale/literal check order. FS and procedure loads bypass
      // this method as before; no unreached memory expression is parsed.
      const text = expression.replace(/\s+/g, '').replace(/\+\-/g, '-');
      const tokens = text.match(/[+-]?(?:E(?:AX|BX|CX|DX|SI|DI|BP|SP)(?:\*0x[0-9a-f]+)?|0x[0-9a-f]+)/g);
      if (!tokens || tokens.join('') !== text) throw new Error('Original effective-address syntax is unowned: ' + expression);
      const parsed: AddressTermSyntax[] = [];
      for (const token of tokens) {
        const negative = token[0] === '-', unsigned = token.replace(/^[+-]/, ''), register = /^(E(?:AX|BX|CX|DX|SI|DI|BP|SP))(?:\*(0x[0-9a-f]+))?$/.exec(unsigned);
        if (register) {
          const name = register[1] as NativeX86Register, word = this.#register(name), scale = register[2] ? integer(register[2]) : 1;
          terms.push({ word, scale, negative }); parsed.push(Object.freeze({ kind: 'register', register: name, scale, negative }));
        } else {
          const value = integer(unsigned), image = !negative && this.#imageAt(value);
          if (image) terms.push({ word: this.#literal(value) }); else displacement += (negative ? -1 : 1) * (value | 0);
          parsed.push(Object.freeze({ kind: 'literal', value, negative }));
        }
      }
      addressSyntaxCache.set(expression, Object.freeze(parsed));
    }
    return fact(NativeX86ThreadStack.prototype.effectiveAddress.call(this.#stack, this.#controller, terms, displacement));
  }
  #read(value: Operand, bytes: Width = width(value)): NativeX86Word32 {
    if (value.kind === 'register') return value.lane
      ? fact(NativeX86ThreadStack.prototype.registerLane.call(this.#stack, this.#controller, value.register, value.lane)) : this.#register(value.register);
    if (value.kind === 'immediate') return this.#literal(value.value);
    if (value.fs) {
      if (value.expression !== '0x0' || bytes !== 4) throw new Error('Only original FS:[0] is admitted');
      return fact(NativeX86ThreadStack.prototype.readFs0.call(this.#stack, this.#controller));
    }
    const address = this.#address(value.expression);
    return bytes === 4 ? fact(NativeX86ThreadStack.prototype.loadPointer.call(this.#stack, this.#controller, address))
      : fact(NativeX86ThreadStack.prototype.loadWidth.call(this.#stack, this.#controller, address, bytes));
  }
  #write(destination: Operand, word: NativeX86Word32, bytes: Width = width(destination)): void {
    if (destination.kind === 'register') {
      fact(destination.lane ? NativeX86ThreadStack.prototype.setRegisterLane.call(this.#stack, this.#controller, destination.register, destination.lane, word)
        : NativeX86ThreadStack.prototype.setRegister.call(this.#stack, this.#controller, destination.register, word)); return;
    }
    if (destination.kind !== 'memory') throw new Error('Original source cannot write an immediate');
    if (destination.fs) {
      if (destination.expression !== '0x0' || bytes !== 4) throw new Error('Only original FS:[0] store is admitted');
      fact(NativeX86ThreadStack.prototype.writeFs0.call(this.#stack, this.#controller, word)); return;
    }
    fact(NativeX86ThreadStack.prototype.storeWidth.call(this.#stack, this.#controller, this.#address(destination.expression), word, bytes));
  }
  #call(point: NativeGameIoInstruction, target: Operand, returnPc: string): string {
    if (imports.has(point.va as NativeSetEnvpCallSite)) {
      this.#importSite = point.va as NativeSetEnvpCallSite;
      fact(NativeX86ThreadStack.prototype.invokeSetEnvpImport.call(this.#stack, this.#controller, this.#importSite));
      this.#importSite = null; return returnPc;
    }
    if (target.kind !== 'immediate' || !ranges.has(hex(target.value)) || hex(target.value) === '204677e4') {
      this.#nextBoundary = target.kind === 'immediate' ? Object.freeze({ pc: point.va, operation: 'sourceCall', target: hex(target.value) })
        : target.kind === 'memory' && /^0x[0-9a-f]{8}$/.test(target.expression)
          ? Object.freeze({ pc: point.va, operation: 'import', iat: target.expression.slice(2) })
          : Object.freeze({ pc: point.va, operation: 'import', target: point.instruction.slice(5) });
      throw new Error('Unowned original environment CALL at' + point.va + ': ' + point.instruction);
    }
    const entry = hex(target.value);
    fact(NativeX86ThreadStack.prototype.call.call(this.#stack, this.#controller, point.va, returnPc));
    this.#frames.push(Object.freeze({ entry, site: point.va, returnPc, previousEntry: this.#currentEntry }));
    this.#currentEntry = entry; if (point.va === '204678e7') this.#envCalled = true; return entry;
  }
  #return(point: NativeGameIoInstruction, argumentBytes: number): string {
    const frame = this.#frames.at(-1); if (!frame) throw new Error('Original environment RET has no actual owned source CALL');
    const word = fact(NativeX86ThreadStack.prototype.ret.call(this.#stack, this.#controller, argumentBytes));
    fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack, this.#controller, word, 'code', frame.returnPc));
    if (point.va === '204765c3') {
      this.#callerReturnConsumed = true;
      const result = fact(NativeX86ThreadStack.prototype.setEnvpReturnResult.call(this.#stack, this.#controller));
      if (result !== 0 && result !== -1) throw new Error('Original environment returned an unowned scalar'); this.#envResult = result;
    }
    if (point.va === '20468415' && frame.site === '2047653f') this.#arrayCallReturned = true;
    if (point.va === '20468415' && frame.site === '2047656d') this.#stringAllocationCallsReturned++;
    if (point.va === '20467cf7' && frame.site === '204765a5') this.#inputFreeReturned = true;
    this.#frames.pop(); this.#currentEntry = frame.previousEntry; return frame.returnPc;
  }
  #lower(point: NativeGameIoInstruction): string {
    const { opcode, next, args, binary } = instructionSyntax(point);
    if (opcode === 'MOVSD.REP' || opcode === 'STOSD.REP' || opcode === 'STOSD') {
      fact(opcode === 'MOVSD.REP' ? NativeX86ThreadStack.prototype.repeatMoveDwords.call(this.#stack, this.#controller)
        : opcode === 'STOSD.REP' ? NativeX86ThreadStack.prototype.repeatStoreDwords.call(this.#stack, this.#controller)
          : NativeX86ThreadStack.prototype.storeDwordString.call(this.#stack, this.#controller));
      return next;
    }
    const argument = (index: number): Operand => {
      const value = args[index]; if (!value) throw new Error('Original environment operand is absent at' + point.va); return value;
    };
    if (opcode === 'RET') {
      const cleanup = args[0];
      if (args.length > 1 || cleanup && cleanup.kind !== 'immediate') throw new Error('Original RET operand differs');
      return this.#return(point, cleanup?.kind === 'immediate' ? cleanup.value : 0);
    }
    if (opcode === 'LEAVE') {
      if (args.length) throw new Error('Original LEAVE operands differ');
      fact(NativeX86ThreadStack.prototype.leave.call(this.#stack, this.#controller)); return next;
    }
    const destination = argument(0);
    // The unary branches never consume source; binary branches establish its
    // presence before any physical operation or partial register store.
    const source = binary ? argument(1) : destination;
    if (opcode === 'CALL') return this.#call(point, destination, next);
    if (opcode === 'JMP') {
      if (destination?.kind !== 'immediate') throw new Error('Original indirect environment JMP is not owned');
      const target = hex(destination.value);
      return target;
    }
    const condition = conditions[opcode];
    if (condition) {
      if (destination?.kind !== 'immediate') throw new Error('Original environment branch target is not a source address');
      return fact(NativeX86ThreadStack.prototype.condition.call(this.#stack, this.#controller, condition)) ? hex(destination.value) : next;
    }
    if (opcode === 'MOV') this.#write(destination, this.#read(source, width(destination)));
    else if (opcode === 'MOVZX' || opcode === 'MOVSX') {
      const bytes = width(source); if (bytes === 4) throw new Error('Original extension operand width is not owned');
      this.#write(destination, fact(NativeX86ThreadStack.prototype.scalarLane.call(this.#stack, this.#controller, this.#read(source, bytes), bytes, opcode === 'MOVSX')));
    } else if (opcode === 'LEA') {
      if (source.kind !== 'memory' || source.fs) throw new Error('Original environment LEA address required'); this.#write(destination, this.#address(source.expression));
    } else if (opcode === 'PUSH') fact(NativeX86ThreadStack.prototype.push.call(this.#stack, this.#controller, this.#read(destination, 4)));
    else if (opcode === 'POP') {
      if (destination.kind !== 'register' || destination.lane) throw new Error('Original environment POP register required');
      fact(NativeX86ThreadStack.prototype.pop.call(this.#stack, this.#controller, destination.register));
    } else if (opcode === 'CMP' || opcode === 'TEST') {
      const bytes = width(destination) === 4 && source?.kind === 'register' && source.lane ? width(source) : width(destination);
      fact(opcode === 'CMP' ? NativeX86ThreadStack.prototype.compare.call(this.#stack, this.#controller, this.#read(destination, bytes), this.#read(source, bytes), bytes)
        : NativeX86ThreadStack.prototype.test.call(this.#stack, this.#controller, this.#read(destination, bytes), this.#read(source, bytes), bytes));
    } else if (opcode === 'SETZ' || opcode === 'SETNZ') this.#write(destination, fact(NativeX86ThreadStack.prototype.setCondition.call(this.#stack, this.#controller, opcode === 'SETZ' ? 'z' : 'nz')));
    else if (opcode === 'XOR') { const bytes = width(destination); this.#write(destination, fact(NativeX86ThreadStack.prototype.xor.call(this.#stack, this.#controller, this.#read(destination, bytes), this.#read(source, bytes), bytes))); }
    else if (opcode === 'INC' || opcode === 'DEC' || opcode === 'NEG' || opcode === 'NOT') {
      const bytes = width(destination), word = this.#read(destination, bytes);
      const result = opcode === 'INC' ? NativeX86ThreadStack.prototype.increment.call(this.#stack, this.#controller, word, bytes)
        : opcode === 'DEC' ? NativeX86ThreadStack.prototype.decrement.call(this.#stack, this.#controller, word, bytes)
          : opcode === 'NEG' ? NativeX86ThreadStack.prototype.negate.call(this.#stack, this.#controller, word, bytes)
            : NativeX86ThreadStack.prototype.bitwiseNot.call(this.#stack, this.#controller, word, bytes);
      this.#write(destination, fact(result));
    } else if (opcode === 'ADD' || opcode === 'SUB' || opcode === 'SBB' || opcode === 'OR' || opcode === 'AND' || opcode === 'IMUL') {
      const bytes = width(destination), left = opcode === 'IMUL' && args.length === 3 ? this.#read(source, bytes) : this.#read(destination, bytes);
      const right = this.#read(argument(opcode === 'IMUL' && args.length === 3 ? 2 : 1), bytes);
      this.#write(destination, fact(NativeX86ThreadStack.prototype.alu.call(this.#stack, this.#controller,
        opcode.toLowerCase() as 'add' | 'sub' | 'sbb' | 'or' | 'and' | 'imul', left, right, bytes)));
    } else if (opcode === 'SHL' || opcode === 'SHR') {
      if (source.kind !== 'immediate') throw new Error('Only original immediate shift counts are admitted');
      this.#write(destination, fact(NativeX86ThreadStack.prototype.shift.call(this.#stack, this.#controller,
        this.#read(destination), source.value, opcode === 'SHL' ? 'left' : 'logicalRight', width(destination))));
    } else if (opcode === 'DIV') fact(NativeX86ThreadStack.prototype.divideUnsigned.call(this.#stack, this.#controller, this.#read(destination)));
    else if (opcode === 'XCHG') {
      if (destination.kind !== 'register' || destination.lane || source.kind !== 'register' || source.lane) throw new Error('Original environment XCHG registers required');
      fact(NativeX86ThreadStack.prototype.exchangeRegisters.call(this.#stack, this.#controller, destination.register, source.register));
    } else throw new Error('Original environment opcode is not owned at' + point.va + ': ' + opcode);
    return next;
  }
  #run(): void {
    while (true) {
      this.#guard();
      if (this.#currentEntry === '204677e4' && this.#pc === '204678f2') {
        gameSetEnvpInstruction(this.#pc); this.#nextBoundary = Object.freeze({ pc: this.#pc, target: '204665f4', operation: '__cinit' });
        throw new Error('Unowned original __cinit CALL at204678f2 after environment returned' + this.#envResult);
      }
      if (this.#currentEntry === '204677e4' && this.#pc === '20467907') {
        gameSetEnvpInstruction(this.#pc); this.#nextBoundary = Object.freeze({ pc: this.#pc,
          target: '2047453f', operation: '__ioterm' });
        throw new Error('Unowned original failure cleanup CALL at' + this.#pc);
      }
      const point = this.#requireSourcePoint(this.#pc); this.#attempt = point;
      const next = this.#lower(point);
      this.#effects.push(Object.freeze({ pc: point.va, operation: point.instruction }));
      if (point.va === '204678ec') this.#callerTestsCompleted++;
      if (point.va === '204678f0') this.#cinitArgumentPrepared = true;
      if (point.va === '20476529') this.#visibleCount++;
      if (point.va === '20476539' && next === '2047653b') this.#countingPassReturned = true;
      if (point.va === '2047654a') this.#envpPublished = true;
      if (point.va === '20476587' && next === '20476596') this.#stringCopiesCompleted++;
      if (point.va === '204765aa') this.#environmentBlockCleared = true;
      if (point.va === '204765b0') this.#terminalNullWritten = true;
      this.#guard(); this.#pc = next; this.#attempt = null;
    }
  }
  #stop(description: string): NativeValue<void> {
    this.#boundary ??= description;
    if (!this.#nextBoundary) this.#nextBoundary = Object.freeze({ pc: this.#pc, operation: this.#importSite ? 'import' : 'sourceInstruction',
      instruction: this.#attempt?.instruction ?? 'Original source ownership at' + this.#pc });
    this.#phase = 'blocked';
    if (this.#physicalGraphTransferred) NativeX86ThreadStack.prototype.suspendUnknown.call(this.#stack, this.#controller, this.#boundary);
    return unknown(this.#boundary);
  }
  #diagnosticScalar(label: string): number | null {
    const fields = this.#images.find(image => image.label === label)?.fields;
    if (!fields || fields.backing.freed || fields.bytes.length !== 4 || !fields.knownMask.every(byte => byte === 255)) return null;
    return fields.view.getInt32(0, true);
  }
  snapshot() {
    // Descriptive copies only. Released import effects remain visible even if
    // a later proof failed; these rows cannot acquire execution or revive data.
    const graph = NativeX86ThreadStack.prototype.snapshot.call(this.#stack);
    const envCall = graph.calls.find(call => call.site === '204678e7');
    const imports = graph.setEnvpCalls;
    return Object.freeze({ module: 'Game' as const, phase: this.#phase, currentPC: this.#pc, boundary: this.#boundary,
      nextBoundary: this.#nextBoundary, physicalGraphTransferred: this.#physicalGraphTransferred,
      envCalled: this.#envCalled || !!envCall, envRetExecuted: envCall?.returned === true,
      envReturned: this.#envResult !== null, envResult: this.#envResult,
      countingPassReturned: this.#countingPassReturned, visibleCount: this.#countingPassReturned ? this.#visibleCount : null,
      arrayCallReturned: this.#arrayCallReturned, stringAllocationCallsReturned: this.#stringAllocationCallsReturned,
      stringCopiesCompleted: this.#stringCopiesCompleted, envpPublished: this.#envpPublished,
      inputFreeReturned: this.#inputFreeReturned,
      inputReleased: imports.some(row => row.site === '20467cd2' && row.callerSite === '204765a5' && row.released),
      environmentBlockCleared: this.#environmentBlockCleared, terminalNullWritten: this.#terminalNullWritten,
      environmentAllocated: this.#diagnosticScalar('environmentAllocated') === 1,
      mbcInitialized: this.#diagnosticScalar('mbcInitialized') === 1, cinitArgumentPrepared: this.#cinitArgumentPrepared,
      callerTestsCompleted: this.#callerTestsCompleted, sourceOperationsCompleted: this.#effects.length,
      effects: Object.freeze(this.#effects.map(effect => Object.freeze({ ...effect }))),
      wholeCrtTraversalCompleted: false, moduleAttachCompleted: false, fullCampaignCompleted: false });
  }
}
