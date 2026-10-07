/** The bounded original Game caller/argv source unit. Every reached instruction
 * is lowered from its admitted original receipt into the same physical graph
 * that actually returned from ioInit. Windows/NLS imports require fixed private
 * source grants; alternate unowned calls retain their reached frontier. */
import type { NativeValue } from './dialogue';
import { NativeCrtBootstrap } from './native-crt-bootstrap';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { NativeGameCrtIoInit } from './native-game-crt-ioinit';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeX86ThreadStack } from './native-x86-thread-stack';
import type { NativeX86Word32, NativeX86Register, NativeX86Condition } from './native-x86-thread-stack';
import type { NativeHeapObjectViews } from './native-heap-views';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
import type { NativeArgvCallSite, NativeWin32ArgvNlsSelection } from './native-win32-argv-nls';
import { admitGameArgvSource, gameArgvInstruction, gameArgvImageReceipt } from './native-game-crt-argv-source';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function fact<T>(value: NativeValue<T>): T { if (!value.known) throw new Error(value.reason); return value.value; }
function reason(error: unknown): string {
  try { return error instanceof Error ? error.message : String(error); }
  catch { return 'Original Game argv source escaped without an owned reason'; }
}
type Width = 1 | 2 | 4;
type Lane = 'low8' | 'high8' | 'low16';
type Phase = 'cold' | 'claiming' | 'invoking' | 'blocked';
interface Construction { phase: 'constructing' | 'returned' | 'blocked'; owner: NativeGameCrtArgv | null; boundary: string | null; }
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
export type NativeGameCrtArgvNextBoundary = Readonly<{ pc: string; operation: string; target: string }> |
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
  ['204677e4', '204677e4-204679bc'], ['2047677c', '2047677c-20476834'],
  ['204765e4', '204765e4-2047677b'], ['2047012d', '2047012d-2047013f'],
  ['2046ff6f', '2046ff6f-2046ffbf'], ['20464c66', '20464c66-20464ce7'],
  ['2046bcff', '2046bcff-2046bd1c'], ['2046bb65', '2046bb65-2046bcc5;2046bcd1-2046bcfe'],
  ['2046b832', '2046b832-2046b8c9'], ['2046b8d6', '2046b8d6-2046b94f'],
  ['2046b950', '2046b950-2046bb28'], ['2046b6a8', '2046b6a8-2046b831'],
  ['2046802b', '2046802b-20468042'], ['20467fb4', '20467fb4-2046802a'],
  ['2046838e', '2046838e-204683cd'], ['20467ba7', '20467ba7-20467c69'],
  ['20468570', '20468570-204685b4'], ['204685b5', '204685b5-204685c8'],
  ['2047f6df', '2047f6df-2047f71e'], ['2047f527', '2047f527-2047f6de'],
  ['2046d263', '2046d263-2046d2a5'], ['2046cec1', '2046cec1-2046d262'],
  ['20467e6d', '20467e6d-20467e9e'], ['2046bcc6', '2046bcc6-2046bcce'],
  ['2046b8cd', '2046b8cd-2046b8d5'], ['204737ac', '204737ac-204737dc'],
  ['204736bc', '204736bc-204736d0'], ['20463e50', '20463e50-20463ec9'],
  ['20484f00', '20484f00-20484f15'], ['20464ea0', '20464ea0-20464eca'],
  ['2046ce8c', '2046ce8c-2046cea6'], ['20467ad4', '20467ad4-20467ae2'],
] as const);
const ranges = new Map<string, readonly (readonly [number, number])[]>(bodies.map(([entry, text]) =>
  [entry, Object.freeze(text.split(';').map(range => Object.freeze(range.split('-').map(x => Number.parseInt(x, 16)) as [number, number]))) ]));
const callerRows = new Set(['204678d3', '204678d5', '204678de', '204678e3', '204678e5']);
const imageSpecs = Object.freeze([
  ['argc', '207d0a40', 4], ['argv', '207d0a44', 4], ['programName', '207d0a5c', 4],
  ['moduleName', '207d10a8', 261], ['mbcInitialized', '207d2b84', 4], ['commandLinePointer', '207d2b60', 4],
  ['currentMbcPointer', '207b2a48', 4], ['currentLocale', '207b2c28', 4], ['mbcObject', '207b2620', 544],
  ['defaultLocale', '207b2b50', 216], ['globalLocaleStatus', '207b2b44', 4],
  ['globalMbcType', '207b2840', 257], ['globalMbcCase', '207b2948', 256],
  ['globalMbcFields', '207d0dc8', 24], ['systemCPFlag', '207d0dc4', 4], ['CPtable', '207b2a50', 240],
  ['stringTypeMode', '207d1540', 4], ['mapMode', '207d0e04', 4], ['sse2Flag207d2b50', '207d2b50', 4],
  ['crtHeapMode', '207d1658', 4], ['crtHeapHandle', '207d11b4', 4], ['securityCookie', '207b2314', 4],
  ['procedureSlots', '207d0a84', 16], ['crtTlsIndexes', '207b231c', 8], ['crtLockTable', '207b2c70', 288],
  ['crtStaticSections', '207d0f30', 336], ['crtMallocRetry', '207d0a94', 4], ['newMode', '207d14e0', 4],
  ['setMbcEH4Scope', '206e8cb8', 28], ['updateMbcEH4Scope', '206e8c98', 28], ['probeUTF16NUL', '206b92a8', 2],
] as const);
const imports = new Set<NativeArgvCallSite>([
  '204767a6', '2046bbdb', '2046bc00', '2046bc92', '2046bcb6', '2046b920', '2046b9c1', '2046b9d4',
  '2046b6cc', '20467fb6', '20467fc9', '20468020', '20467c1f', '2047f554', '2047f5cb', '2047f635',
  '2047f643', '2046cef1', '2046cf8f', '2046cffb', '2046d017', '2046d0b4', '2046d0d7', '20467e74',
  '204737d4', '204736c9',
]);
const procedureLoads = Object.freeze({
  '20467bb6': Object.freeze({ iat: '207d7b84', name: 'HeapAlloc' as const }),
  '2046bbfa': Object.freeze({ iat: '207d7b9c', name: 'InterlockedIncrement' as const }),
  '2047f5aa': Object.freeze({ iat: '207d7be8', name: 'MultiByteToWideChar' as const }),
  '2046cf6e': Object.freeze({ iat: '207d7be8', name: 'MultiByteToWideChar' as const }),
  '2046d005': Object.freeze({ iat: '207d7bec', name: 'LCMapStringW' as const }),
});
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
  if (!/^-?0x[0-9a-f]+$/.test(text)) throw new Error('Original argv scalar operand syntax is not owned: ' + text);
  const value = text.startsWith('-') ? -Number.parseInt(text.slice(3), 16) : Number.parseInt(text.slice(2), 16);
  if (!Number.isSafeInteger(value) || value < -0x80000000 || value > 0xffffffff) throw new Error('Original argv scalar exceeds32 bits');
  return value >>> 0;
}
function operand(text: string): Operand {
  const value = text.trim();
  if (/^E(?:AX|BX|CX|DX|SI|DI|BP|SP)$/.test(value)) return { kind: 'register', register: value as NativeX86Register };
  if (lanes[value]) return { kind: 'register', ...lanes[value] };
  if (/^-?0x[0-9a-f]+$/.test(value)) return { kind: 'immediate', value: integer(value) };
  const memory = /^(?:(byte|word|dword) ptr )?(FS:)?\[(.+)\]$/.exec(value);
  if (!memory || !memory[3]) throw new Error('Original argv operand syntax is not owned: ' + value);
  return { kind: 'memory', expression: memory[3], fs: !!memory[2],
    width: memory[1] === 'byte' ? 1 : memory[1] === 'word' ? 2 : memory[1] === 'dword' ? 4 : undefined };
}
function instructionSyntax(point: NativeGameIoInstruction): InstructionSyntax {
  const retained = instructionSyntaxCache.get(point); if (retained) return retained;
  const [opcode, ...rest] = point.instruction.split(' '), text = rest.join(' ');
  if (!opcode) throw new Error('Original argv opcode is absent at' + point.va);
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

export class NativeGameCrtArgv {
  readonly #crt: NativeModuleCrtOwner;
  readonly #platform: NativeRuntimePlatform;
  readonly #selection: Readonly<NativeWin32ArgvNlsSelection>;
  readonly #stack: NativeX86ThreadStack;
  readonly #controller = Object.freeze({});
  readonly #images: readonly Image[];
  readonly #effects: Effect[] = [];
  readonly #frames: Frame[] = [];
  #phase: Phase = 'cold';
  #bootstrap: NativeCrtBootstrap | null = null;
  #permit: object | null = null;
  #pc = '204678d3';
  #currentEntry = '204677e4';
  #attempt: NativeGameIoInstruction | null = null;
  #boundary: string | null = null;
  #nextBoundary: NativeGameCrtArgvNextBoundary | null = null;
  #importSite: NativeArgvCallSite | null = null;
  #physicalGraphTransferred = false;
  #argvCalled = false;
  #callerReturnConsumed = false;
  #argvResult: 0 | -1 | null = null;
  #countingPassReturned = false;
  #fillingPassReturned = false;
  #programNamePublished = false;
  #argvPublished = false;
  #mbcPublished = false;
  #callerTestsCompleted = 0;

  private constructor(crt: NativeModuleCrtOwner, selected: Readonly<NativeWin32ArgvNlsSelection>, token: object, entry: Construction) {
    if (token !== constructionToken || new.target !== NativeGameCrtArgv || owners.get(crt) !== entry || entry.owner || entry.phase !== 'constructing') {
      throw new Error('Actual private Game argv construction required');
    }
    admitGameArgvSource(); this.#crt = crt; this.#platform = crt.host.platform as NativeRuntimePlatform; this.#selection = selected;
    this.#requireCrt(); this.#stack = fact(NativeX86ThreadStack.forPlatform(this.#platform));
    this.#images = Object.freeze(imageSpecs.map(([label, address, bytes]) => {
      const receipt = gameArgvImageReceipt(label === 'sse2Flag207d2b50' ? 'sse2Flag' : label),
        fields = fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, label));
      if (receipt.address !== address || receipt.bytes !== bytes || fields.bytes.length !== bytes || fields.knownMask.length !== bytes) {
        throw new Error('Actual original argv image geometry differs: ' + label);
      }
      return Object.freeze({ label, address: Number.parseInt(address, 16), bytes, fields });
    }));
    entry.owner = this; this.#requireImages(); Object.freeze(this);
  }
  static forCrt(crt: NativeModuleCrtOwner): NativeValue<NativeGameCrtArgv> {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game') return unknown('Actual constructed Game CRT required for argv');
    const selected = NativeRuntimePlatform.argvNlsSelectionForPlatform(crt.host.platform as NativeRuntimePlatform);
    if (!selected.known) return selected;
    const retained = owners.get(crt);
    if (retained) {
      if (retained.phase === 'constructing') { retained.phase = 'blocked'; retained.boundary = 'Reentrant Game argv construction cannot restart'; }
      if (retained.phase !== 'returned') return unknown(retained.boundary!);
      try { retained.owner!.#requireImages(); return known(retained.owner!); } catch (error) { return unknown(reason(error)); }
    }
    const entry: Construction = { phase: 'constructing', owner: null, boundary: null }; owners.set(crt, entry);
    try {
      const owner = new NativeGameCrtArgv(crt, selected.value, constructionToken, entry);
      if (entry.phase !== 'constructing' || entry.owner !== owner) throw new Error(entry.boundary ?? 'Game argv construction interrupted');
      entry.phase = 'returned'; return known(owner);
    } catch (error) { entry.phase = 'blocked'; entry.boundary ??= reason(error); return unknown(entry.boundary); }
  }
  static canonicalControllerForCrt(owner: NativeGameCrtArgv, crt: NativeModuleCrtOwner, controller: object,
    mode: 'bind' | 'invoke' | 'retain'): NativeValue<void> {
    const entry = owners.get(crt);
    if (!owner || entry?.phase !== 'returned' || entry.owner !== owner || owner.#crt !== crt || controller !== owner.#controller) {
      return unknown('Actual retained same-CRT argv controller required');
    }
    if (mode === 'retain') return owner.#phase !== 'cold' ? known(undefined) : unknown('Actual reached argv claim required for retention');
    try {
      owner.#requireImages();
      if (!owner.#bootstrap || !owner.#permit) return unknown('Actual private bootstrap argv scope required');
      const caller = NativeCrtBootstrap.canonicalArgvCallForCrt(owner.#bootstrap, crt, owner.#permit); if (!caller.known) return caller;
      if (mode === 'bind') return owner.#phase === 'claiming' && !owner.#physicalGraphTransferred && owner.#pc === '204678d3'
        ? known(undefined) : unknown('Actual one-time returned-I/O argv claim required');
      return owner.#phase === 'invoking' && owner.#physicalGraphTransferred ? known(undefined)
        : unknown(owner.#boundary ?? 'Actual active argv source invocation required');
    } catch (error) { return unknown(reason(error)); }
  }
  static canonicalArgvImportCallForCrt(owner: NativeGameCrtArgv, crt: NativeModuleCrtOwner, controller: object,
    site: NativeArgvCallSite): NativeValue<void> {
    const active = NativeGameCrtArgv.canonicalControllerForCrt(owner, crt, controller, 'invoke'); if (!active.known) return active;
    try {
      if (owner.#pc !== site || owner.#importSite !== site || !imports.has(site) || !owner.#frames.length ||
          !gameArgvInstruction(site).instruction.startsWith('CALL ')) return unknown('Actual current original argv import source row required');
      owner.#requireSourcePoint(site); return known(undefined);
    } catch (error) { return unknown(reason(error)); }
  }
  static canonicalSourceFrameChainForCrt(owner: NativeGameCrtArgv, crt: NativeModuleCrtOwner, controller: object):
    NativeValue<readonly Readonly<{ entry: string; site: string; returnPc: string }>[]> {
    const active = NativeGameCrtArgv.canonicalControllerForCrt(owner, crt, controller, 'invoke'); if (!active.known) return active;
    try {
      owner.#requireSourcePoint(owner.#pc);
      return known(Object.freeze(owner.#frames.map(frame => Object.freeze({ entry: frame.entry, site: frame.site, returnPc: frame.returnPc }))));
    } catch (error) { return unknown(reason(error)); }
  }
  static canonicalArgvReturnForCrt(owner: NativeGameCrtArgv, crt: NativeModuleCrtOwner, controller: object): NativeValue<void> {
    const active = NativeGameCrtArgv.canonicalControllerForCrt(owner, crt, controller, 'invoke'); if (!active.known) return active;
    const frame = owner.#frames.at(-1);
    return owner.#pc === '20476834' && owner.#currentEntry === '2047677c' && owner.#argvCalled && owner.#callerReturnConsumed &&
      frame?.site === '204678de' && frame.returnPc === '204678e3' && owner.#frames.length === 1 && owner.#importSite === null
      ? known(undefined) : unknown('Actual original argv RET/current restored callee required');
  }
  static canonicalReturnedArgvForCrt(owner: NativeGameCrtArgv, crt: NativeModuleCrtOwner,
    bootstrap: NativeCrtBootstrap, permit: object): NativeValue<0 | -1> {
    const entry = owners.get(crt);
    if (!owner || entry?.phase !== 'returned' || entry.owner !== owner || owner.#crt !== crt || owner.#bootstrap !== bootstrap ||
        owner.#permit !== permit || !owner.#physicalGraphTransferred || !owner.#callerReturnConsumed || owner.#argvResult === null) {
      return unknown('Actual same original invocation argv normal return required');
    }
    const caller = NativeCrtBootstrap.canonicalArgvCallForCrt(bootstrap, crt, permit); if (!caller.known) return caller;
    try { owner.#requireImages(); return known(owner.#argvResult); } catch (error) { return unknown(reason(error)); }
  }
  static enterFromReturnedIoForAttach(owner: NativeGameCrtArgv, io: NativeGameCrtIoInit, crt: NativeModuleCrtOwner,
    bootstrap: NativeCrtBootstrap, ioPermit: object, argvPermit: object): NativeValue<void> {
    if (!owner || owners.get(crt)?.owner !== owner || owner.#crt !== crt) return unknown('Actual retained same-CRT argv owner required');
    if (owner.#phase !== 'cold') return unknown(owner.#boundary ?? 'Game argv invocation cannot replay');
    const caller = NativeCrtBootstrap.canonicalArgvCallForCrt(bootstrap, crt, argvPermit); if (!caller.known) return caller;
    const returned = NativeGameCrtIoInit.canonicalReturnedIoForCrt(io, crt, bootstrap, ioPermit); if (!returned.known) return returned;
    owner.#bootstrap = bootstrap; owner.#permit = argvPermit; owner.#phase = 'claiming';
    try {
      owner.#requireImages();
      const graph = fact(NativeGameCrtIoInit.transferReturnedGraphForArgv(io, crt, bootstrap, ioPermit, owner, owner.#controller));
      if (graph !== owner.#stack) throw new Error('Actual returned IO graph differs from retained argv graph');
      owner.#physicalGraphTransferred = true; owner.#phase = 'invoking'; owner.#run();
      return known(undefined);
    } catch (error) { return owner.#stop(reason(error)); }
  }
  #requireCrt(): void {
    if (!NativeModuleCrtOwner.isConstructedOwner(this.#crt) || this.#crt.module !== 'Game' || this.#crt.host.platform !== this.#platform) {
      throw new Error('Actual same-platform constructed Game CRT required for argv');
    }
    fact(NativeRuntimePlatform.requireActivePlatform(this.#platform));
    if (fact(NativeRuntimePlatform.argvNlsSelectionForPlatform(this.#platform)) !== this.#selection) throw new Error('Actual immutable fresh argv/NLS selection required');
  }
  #requireImages(): void {
    this.#requireCrt();
    for (const image of this.#images) if (fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, image.label)) !== image.fields ||
        image.fields.backing.freed !== false || image.fields.bytes.length !== image.bytes || image.fields.knownMask.length !== image.bytes) {
      throw new Error('Actual retained argv image alias/lifetime required: ' + image.label);
    }
  }
  #guard(): void {
    fact(NativeGameCrtArgv.canonicalControllerForCrt(this, this.#crt, this.#controller, 'invoke'));
  }
  #requireSourcePoint(pc: string): NativeGameIoInstruction {
    const extent = ranges.get(this.#currentEntry), address = Number.parseInt(pc, 16);
    if (!extent?.some(([first, last]) => address >= first && address <= last) ||
        this.#currentEntry === '204677e4' && !callerRows.has(pc)) throw new Error('Unowned Game argv source frontier at' + pc);
    const point = gameArgvInstruction(pc);
    if (point.va !== pc || !/^(?:[0-9a-f]{2})+$/.test(point.bytes)) throw new Error('Original argv row receipt differs at' + pc);
    return point;
  }
  #register(register: NativeX86Register): NativeX86Word32 { return fact(NativeX86ThreadStack.prototype.register.call(this.#stack, this.#controller, register)); }
  #immediate(value: number): NativeX86Word32 { return fact(NativeX86ThreadStack.prototype.immediate.call(this.#stack, this.#controller, value >>> 0)); }
  #imageAt(value: number): Image | undefined { return this.#images.find(image => value >= image.address && value < image.address + image.bytes); }
  #literal(value: number): NativeX86Word32 {
    const image = this.#imageAt(value);
    if (image && (image.label === 'setMbcEH4Scope' || image.label === 'updateMbcEH4Scope') && value === image.address) {
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
    const load = procedureLoads[this.#pc as keyof typeof procedureLoads];
    if (load && value.expression === '0x' + load.iat && bytes === 4) return fact(NativeX86ThreadStack.prototype.runtimeProcedure.call(this.#stack, this.#controller, load.name));
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
    if (imports.has(point.va as NativeArgvCallSite)) {
      this.#importSite = point.va as NativeArgvCallSite;
      fact(NativeX86ThreadStack.prototype.invokeArgvImport.call(this.#stack, this.#controller, this.#importSite));
      this.#importSite = null; return returnPc;
    }
    if (target.kind !== 'immediate' || !ranges.has(hex(target.value)) || hex(target.value) === '204677e4') {
      this.#nextBoundary = target.kind === 'immediate' ? Object.freeze({ pc: point.va, operation: 'sourceCall', target: hex(target.value) })
        : target.kind === 'memory' && /^0x[0-9a-f]{8}$/.test(target.expression)
          ? Object.freeze({ pc: point.va, operation: 'import', iat: target.expression.slice(2) })
          : Object.freeze({ pc: point.va, operation: 'import', target: point.instruction.slice(5) });
      throw new Error('Unowned original argv CALL at' + point.va + ': ' + point.instruction);
    }
    const entry = hex(target.value);
    fact(NativeX86ThreadStack.prototype.call.call(this.#stack, this.#controller, point.va, returnPc));
    this.#frames.push(Object.freeze({ entry, site: point.va, returnPc, previousEntry: this.#currentEntry }));
    this.#currentEntry = entry; if (point.va === '204678de') this.#argvCalled = true; return entry;
  }
  #return(point: NativeGameIoInstruction, argumentBytes: number): string {
    const frame = this.#frames.at(-1); if (!frame) throw new Error('Original argv RET has no actual owned source CALL');
    const word = fact(NativeX86ThreadStack.prototype.ret.call(this.#stack, this.#controller, argumentBytes));
    fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack, this.#controller, word, 'code', frame.returnPc));
    if (point.va === '20476834') {
      this.#callerReturnConsumed = true;
      const result = fact(NativeX86ThreadStack.prototype.argvReturnResult.call(this.#stack, this.#controller));
      if (result !== 0 && result !== -1) throw new Error('Original argv returned an unowned scalar'); this.#argvResult = result;
    }
    if (point.va === '2047677b' && frame.site === '204767d1') this.#countingPassReturned = true;
    if (point.va === '2047677b' && frame.site === '20476812') this.#fillingPassReturned = true;
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
      const value = args[index]; if (!value) throw new Error('Original argv operand is absent at' + point.va); return value;
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
      if (destination?.kind !== 'immediate') throw new Error('Original indirect argv JMP is not owned');
      const target = hex(destination.value);
      if (point.va === '20484f11' && target === '20464ea0') this.#currentEntry = target;
      return target;
    }
    const condition = conditions[opcode];
    if (condition) {
      if (destination?.kind !== 'immediate') throw new Error('Original argv branch target is not a source address');
      return fact(NativeX86ThreadStack.prototype.condition.call(this.#stack, this.#controller, condition)) ? hex(destination.value) : next;
    }
    if (opcode === 'MOV') this.#write(destination, this.#read(source, width(destination)));
    else if (opcode === 'MOVZX' || opcode === 'MOVSX') {
      const bytes = width(source); if (bytes === 4) throw new Error('Original extension operand width is not owned');
      this.#write(destination, fact(NativeX86ThreadStack.prototype.scalarLane.call(this.#stack, this.#controller, this.#read(source, bytes), bytes, opcode === 'MOVSX')));
    } else if (opcode === 'LEA') {
      if (source.kind !== 'memory' || source.fs) throw new Error('Original argv LEA address required'); this.#write(destination, this.#address(source.expression));
    } else if (opcode === 'PUSH') fact(NativeX86ThreadStack.prototype.push.call(this.#stack, this.#controller, this.#read(destination, 4)));
    else if (opcode === 'POP') {
      if (destination.kind !== 'register' || destination.lane) throw new Error('Original argv POP register required');
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
      if (destination.kind !== 'register' || destination.lane || source.kind !== 'register' || source.lane) throw new Error('Original argv XCHG registers required');
      fact(NativeX86ThreadStack.prototype.exchangeRegisters.call(this.#stack, this.#controller, destination.register, source.register));
    } else throw new Error('Original argv opcode is not owned at' + point.va + ': ' + opcode);
    return next;
  }
  #run(): void {
    while (true) {
      this.#guard();
      if (this.#currentEntry === '204677e4' && this.#pc === '204678e7') {
        gameArgvInstruction(this.#pc); this.#nextBoundary = Object.freeze({ pc: this.#pc, target: '204764ff', operation: '__setenvp' });
        throw new Error('Unowned original __setenvp CALL at204678e7 after argv returned' + this.#argvResult);
      }
      if (this.#currentEntry === '204677e4' && (this.#pc === '204678d7' || this.#pc === '20467907')) {
        gameArgvInstruction(this.#pc); this.#nextBoundary = Object.freeze({ pc: this.#pc,
          target: this.#pc === '204678d7' ? '20467eb8' : '2047453f', operation: this.#pc === '204678d7' ? '__mtterm' : '__ioterm' });
        throw new Error('Unowned original failure cleanup CALL at' + this.#pc);
      }
      const point = this.#requireSourcePoint(this.#pc); this.#attempt = point;
      const next = this.#lower(point);
      this.#effects.push(Object.freeze({ pc: point.va, operation: point.instruction }));
      if (point.va === '204678d3' || point.va === '204678e3') this.#callerTestsCompleted++;
      if (point.va === '204767b3') this.#programNamePublished = true;
      if (point.va === '20476823') this.#argvPublished = true;
      if (point.va === '2046bcaf') this.#mbcPublished = true;
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
    // These copied graph rows describe already pushed/consumed native words,
    // including effects retained after a post-operation guard failure. They
    // cannot grant a controller, handoff, return result or source continuation.
    const graph = NativeX86ThreadStack.prototype.snapshot.call(this.#stack);
    const argvCall = graph.calls.find(call => call.site === '204678de');
    const countingCall = graph.calls.find(call => call.site === '204767d1');
    const fillingCall = graph.calls.find(call => call.site === '20476812');
    return Object.freeze({ module: 'Game' as const, phase: this.#phase, currentPC: this.#pc, boundary: this.#boundary,
      nextBoundary: this.#nextBoundary, physicalGraphTransferred: this.#physicalGraphTransferred,
      argvCalled: this.#argvCalled || !!argvCall, argvRetExecuted: argvCall?.returned === true,
      argvReturned: this.#argvResult !== null, argvResult: this.#argvResult,
      countingPassReturned: this.#countingPassReturned || countingCall?.returned === true,
      fillingPassReturned: this.#fillingPassReturned || fillingCall?.returned === true,
      argc: this.#diagnosticScalar('argc'), argvPublished: this.#argvPublished, programNamePublished: this.#programNamePublished,
      mbcInitialized: this.#diagnosticScalar('mbcInitialized') === 1, mbcPublished: this.#mbcPublished,
      callerTestsCompleted: this.#callerTestsCompleted, sourceOperationsCompleted: this.#effects.length,
      effects: Object.freeze(this.#effects.map(effect => Object.freeze({ ...effect }))),
      wholeCrtTraversalCompleted: false, moduleAttachCompleted: false, fullCampaignCompleted: false });
  }
}
