import {aiHelperAccessorCreatorInstruction,aiHelperAccessorCreatorConstructorInstruction,aiHelperAccessorQueryInstruction,aiHelperFactoryQueryInstruction,aiHelperWrapperQueryInstruction,aiHelperWrapperCloneInstruction,aiHelperComponentConstructorInstruction} from './native-game-ai-helper-accessor-creator-source';
import {aiHelperPropertyIdInstruction} from './native-game-ai-helper-property-id-source';
import {aiHelperAdminInitializerInstruction,aiHelperAdminWrapperInstruction,aiHelperAdminReplacementInstruction,aiHelperAdminAccessorInstruction} from './native-game-ai-helper-admin-source';
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
import { gameCinitInstruction, gameCinitImageReceipt } from './native-game-crt-cinit-source';
import { gameArgvInstruction } from './native-game-crt-argv-source';
import { nativeGameImageReceipt } from './native-game-crt-profile';
import { nativeGameLayerBaseMemoryForCrt } from './native-game-layer-base-class-name';
import { gameClassNameSpec, gameClassNameFamilySpecs, gameClassNameFamilyInstruction } from './native-game-class-name-family-source';
import { gameArenaRootInstruction, admitArenaWrapperConstructorImport, gameArenaWrapperImportTarget, arenaRegistrationToggleTarget } from './native-game-arena-root-source';
import { labelInitializerInstruction,labelWrapperInstruction,labelReplacementInstruction,labelAccessorInstruction } from './native-game-label-source';
import { freePointInitializerInstruction,freePointWrapperInstruction,freePointReplacementInstruction,freePointAccessorInstruction } from './native-game-freepoint-source';
import type { NativeGameCrtOwner } from './native-game-crt';

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
  ['204665f4', '204665f4-20466685'], ['204738b0', '204738b0-20473938;20473950-2047396a'],
  ['20473830', '20473830-20473858'], ['20473860', '20473860-204738a1'],
  ['20463917', '20463917-20463934'], ['204638a7', '204638a7-20463906'],
  ['204696f6', '204696f6-2046971e'],
  ['20469672', '20469672-20469690'],
  ['2046643f', '2046643f-2046645e'],
  ['20469f3a', '20469f3a-20469f4d'], ['2047e687', '2047e687-2047e693'],
  ['2047e627', '2047e627-2047e686'], ['2047e5d7', '2047e5d7-2047e5f3;2047e617-2047e626'],
  ['2046bcff', '2046bcff-2046bd1c'],
  ['2047470c', '2047470c-204747bc'],
  ...gameClassNameFamilySpecs.map(spec => [spec.initializer, spec.initializer + '-' + spec.instructions.at(-1)!.va] as const),
  ['204b1d70','204b1d70-204b1dba'],
  ['204b2130','204b2130-204b217a'],
  ['204b23d0','204b23d0-204b241a'],
  ['204b2660','204b2660-204b26aa'],
  ['204b26c0','204b26c0-204b270c'],
  ['204b2720','204b2720-204b2741'],
  ['100932e0','100932e0-10093330'],
  ['10090590','10090590-100905f0'],
  ['1008cdd0','1008cdd0-1008ce15'],
  ['100890d0','100890d0-100890d5'],
  ['20077bf0','20077bf0-20077c56'],
  ['30100fe0','30100fe0-30100ff9'],
  ['30103020','30103020-30103036'],
  ['1004a5a0','1004a5a0-1004a5c6'],
  ['1004a1c0','1004a1c0-1004a1c8'],
  ['20077040','20077040-2007710d'],
  ['20076630','20076630-2007679e'],
  ['200763f0','200763f0-200763f3'],
  ['20075040','20075040-2007510d'],
  ['20074640','20074640-2007479a'],
  ['20074400','20074400-20074403'],
  ['20073010','20073010-200730dd'],
  ['200725c0','200725c0-20072719'],
  ['20072380','20072380-20072383'],
  ['10089290','10089290-100892be'],
  ['200705b0','200705b0-2007067f'],
  ['2006f930','2006f930-2006faa3'],
  ['100891b0','100891b0-100891b9'],
  ['10090010','10090010-10090045'],
  ['2006d780','2006d780-2006d783'],
  ['1008d190','1008d190-1008d262'],
  ['10090110','10090110-10090113'],
  ['1008eb10','1008eb10-1008eb96'],
  ['1008dd70','1008dd70-1008ddec'],
  ['100a7980','100a7980-100a79fa'],
] as const);
const ranges = new Map<string, readonly (readonly [number, number])[]>(bodies.map(([entry, text]) =>
  [entry, Object.freeze(text.split(';').map(range => Object.freeze(range.split('-').map(x => Number.parseInt(x, 16)) as [number, number]))) ]));
const callerRows = new Set(['204678e7', '204678ec', '204678ee', '204678f0', '204678f2']);
const imageSpecs = Object.freeze([
  ['envp', '207d0a4c', 4], ['environmentAllocated', '207d2b6c', 4],
  ['environmentBlock', '207d0a74', 4], ['mbcInitialized', '207d2b84', 4],
  ['crtHeapMode', '207d1658', 4], ['crtHeapHandle', '207d11b4', 4], ['securityCookie', '207b2314', 4],
  ['crtMallocRetry', '207d0a94', 4], ['newMode', '207d14e0', 4],
  ['callocEH4Scope', '206e8f98', 28], ['freeEH4Scope', '206e8b70', 28],
  ['cinitMathCallback', '206b638c', 4], ['cinitPEHeaders', '20000000', 672],
  ['cinitNonwritableEH4Scope', '206e8db0', 28],
  ['cinitFloatPointerTable', '207b2330', 40], ['cinitDivideErratum', '207d0a24', 4],
  ['cinitSse2Available', '207d2b50', 4], ['cinitDivideModule', '206b6524', 9],
  ['cinitDivideExport', '206b6508', 28],
  ['cinitCInitializerTable', '20655514', 540],
  ['cinitSse2ConversionAvailable', '207d2b40', 4], ['cinitSse2ProbeEH4Scope', '206e9018', 28],
  ['cinitStdioCount', '207d29c0', 4], ['cinitStdioVector', '207d1664', 4],
  ['cinitStdioFiles', '207b2e50', 640],
  ['cinitCppInitializerTable', '2056c000', 955408],
  ['ioBlocks', '207d2a20', nativeGameImageReceipt('ioBlocks').bytes],
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
    binary: ['MOV', 'MOVZX', 'MOVSX', 'LEA', 'CMP', 'TEST', 'XOR', 'ADD', 'SUB', 'SBB', 'OR', 'AND', 'IMUL', 'SHL', 'SHR', 'SAR', 'XCHG'].includes(opcode) });
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
  #classImages: readonly Image[] = Object.freeze([]);
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
  #exitTableInitializerReturned = false;
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
      const receipt = label.startsWith('cinit') ? gameCinitImageReceipt(label)
        : label === 'ioBlocks' ? nativeGameImageReceipt(label) : gameSetEnvpImageReceipt(label),
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
  static canonicalStaticFiniRegistrationForCrt(owner: NativeGameCrtSetEnvp, crt: NativeModuleCrtOwner, controller: object): NativeValue<void> {
    const active = NativeGameCrtSetEnvp.canonicalControllerForCrt(owner, crt, controller, 'invoke'); if (!active.known) return active;
    return owner.#pc === '20466638' && owner.#currentEntry === '204665f4' &&
      owner.#requireSourcePoint(owner.#pc).instruction === 'CALL 0x204637ce'
      ? known(undefined) : unknown('Actual original static shutdown registration CALL required');
  }
  static canonicalLayerBaseGetterForCrt(owner: NativeGameCrtSetEnvp, crt: NativeModuleCrtOwner, controller: object,
    initializer: string = '204b11b0'): NativeValue<void> {
    const active = NativeGameCrtSetEnvp.canonicalControllerForCrt(owner, crt, controller, 'invoke'); if (!active.known) return active;
    const frame = owner.#frames.at(-1);
    const getter = gameClassNameSpec(initializer)?.getter ?? null;
    return getter !== null && owner.#pc === initializer && owner.#currentEntry === initializer &&
      frame?.entry === initializer && frame.site === '20466654' && frame.returnPc === '20466656' &&
      owner.#requireSourcePoint(owner.#pc).instruction === 'CALL 0x' + getter
      ? known(undefined) : unknown('Actual original C++ initializer class-name CALL required');
  }
  static canonicalSetEnvpReturnForCrt(owner: NativeGameCrtSetEnvp, crt: NativeModuleCrtOwner, controller: object): NativeValue<void> {
    const active = NativeGameCrtSetEnvp.canonicalControllerForCrt(owner, crt, controller, 'invoke'); if (!active.known) return active;
    const frame = owner.#frames.at(-1);
    return owner.#pc === '204765c3' && owner.#currentEntry === '204764ff' && owner.#envCalled && owner.#callerReturnConsumed &&
      frame?.site === '204678e7' && frame.returnPc === '204678ec' && owner.#frames.length === 1 && owner.#importSite === null
      ? known(undefined) : unknown('Actual original setenvp RET/current restored callee required');
  }
  static canonicalArenaVirtualReadForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object,site:string):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');
    if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    if(site==='100890d0'||site==='100890d2')return owner.#pc===site&&owner.#currentEntry==='100890d0'&&
      frame?.entry==='100890d0'&&frame.site==='100905e9'&&frame.returnPc==='100905ee'&&
      owner.#requireSourcePoint(site).instruction===(site==='100890d0'?'MOV EAX,dword ptr [ECX]':'MOV EDX,dword ptr [EAX + 0x38]')
      ?known(undefined):unknown('Actual original wrapper object-query virtual read required');
    if(site==='100905e0'||site==='100905e2')return owner.#pc===site&&owner.#currentEntry==='10090590'&&
      frame?.entry==='10090590'&&frame.site==='100932f6'&&frame.returnPc==='100932fb'&&
      owner.#requireSourcePoint(site).instruction===(site==='100905e0'?'MOV EDX,dword ptr [ECX]':'MOV EAX,dword ptr [EDX + 0xc]')
      ?known(undefined):unknown('Actual original accessor query virtual-table read required');
    if(site==='2007705c'||site==='2007705e')return owner.#pc===site&&owner.#currentEntry==='20077040'&&
      frame?.entry==='20077040'&&((frame.site==='204b269a'&&frame.returnPc==='204b269f')||(frame.site==='20077c33'&&frame.returnPc==='20077c38'))&&
      owner.#requireSourcePoint(site).instruction===(site==='2007705c'?'MOV EDX,dword ptr [ECX]':'MOV EAX,dword ptr [EDX + 0xc]')
      ?known(undefined):unknown('Actual original AI helper administrator virtual-table read required');
    if(site==='2007505c'||site==='2007505e')return owner.#pc===site&&owner.#currentEntry==='20075040'&&
      frame?.entry==='20075040'&&frame.site==='204b240a'&&frame.returnPc==='204b240f'&&
      owner.#requireSourcePoint(site).instruction===(site==='2007505c'?'MOV EDX,dword ptr [ECX]':'MOV EAX,dword ptr [EDX + 0xc]')
      ?known(undefined):unknown('Actual original Label virtual-table read required');
    if(site==='2007302c'||site==='2007302e')return owner.#pc===site&&owner.#currentEntry==='20073010'&&
      frame?.entry==='20073010'&&frame.site==='204b216a'&&frame.returnPc==='204b216f'&&
      owner.#requireSourcePoint(site).instruction===(site==='2007302c'?'MOV EDX,dword ptr [ECX]':'MOV EAX,dword ptr [EDX + 0xc]')
      ?known(undefined):unknown('Actual original FreePoint virtual-table read required');
    const instruction=site==='200705cc'?'MOV EDX,dword ptr [ECX]':site==='200705ce'?'MOV EAX,dword ptr [EDX + 0xc]':null;
    return instruction!==null && owner.#pc===site && owner.#currentEntry==='200705b0' &&
      frame?.entry==='200705b0' && frame.site==='204b1daa' && frame.returnPc==='204b1daf' &&
      owner.#requireSourcePoint(site).instruction===instruction
      ? known(undefined):unknown('Actual original Arena virtual-table read required');
  }
  static canonicalArenaPropertySingletonCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object,site:string):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');
    if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    const original=site==='100932ef' ? owner.#currentEntry==='100932e0'&&frame?.entry==='100932e0'&&frame.site==='204b2730'&&frame.returnPc==='204b2736'&&owner.#requireSourcePoint(site).instruction==='CALL 0x10004fd4'
      : site==='1008d1a3'
      ? owner.#currentEntry==='1008d190' && frame?.entry==='1008d190' &&
        ((frame.site==='200705d6'&&frame.returnPc==='200705dc')||(frame.site==='20073036'&&frame.returnPc==='2007303c')||(frame.site==='20075066'&&frame.returnPc==='2007506c')||(frame.site==='20077066'&&frame.returnPc==='2007706c'))&&
        owner.#requireSourcePoint(site).instruction==='CALL 0x10004fd4'
      : ['20076689','200766e1'].includes(site) ? owner.#currentEntry==='20076630'&&
        frame?.entry==='20076630'&&frame.site==='20077054'&&frame.returnPc==='20077059'&&
        owner.#requireSourcePoint(site).instruction==='CALL dword ptr [0x207d8868]'
      : ['20074699','200746dd'].includes(site) ? owner.#currentEntry==='20074640'&&
        frame?.entry==='20074640'&&frame.site==='20075054'&&frame.returnPc==='20075059'&&
        owner.#requireSourcePoint(site).instruction==='CALL dword ptr [0x207d8868]'
      : ['20072619','2007265c'].includes(site) ? owner.#currentEntry==='200725c0' &&
        frame?.entry==='200725c0' && frame.site==='20073024' && frame.returnPc==='20073029' &&
        owner.#requireSourcePoint(site).instruction==='CALL dword ptr [0x207d8868]'
      : ['2006f985','2006f9ec'].includes(site) && owner.#currentEntry==='2006f930' &&
        frame?.entry==='2006f930' && frame.site==='200705c4' && frame.returnPc==='200705c9' &&
        owner.#requireSourcePoint(site).instruction==='CALL dword ptr [0x207d8868]';
    return original && owner.#pc===site
      ? known(undefined):unknown('Actual original Arena property singleton import required');
  }
  static canonicalArenaTypeCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');
    if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='204b1d8f' && owner.#currentEntry==='204b1d70' &&
      frame?.entry==='204b1d70' && frame.site==='20466654' && frame.returnPc==='20466656' &&
      owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x2000d152'
      ? known(undefined):unknown('Actual original Arena type-singleton CALL required');
  }
  static canonicalLabelTypeCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='204b23ef'&&owner.#currentEntry==='204b23d0'&&frame?.entry==='204b23d0'&&
      frame.site==='20466654'&&frame.returnPc==='20466656'&&owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x20006b0e'
      ?known(undefined):unknown('Actual original Label type-singleton CALL required');
  }
  static canonicalAIHelperPropertyIdTextCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    if(owners.get(crt)?.owner!==owner||owner.#crt!==crt||owner.#controller!==controller||owner.#phase!=='invoking')
      return unknown('Actual retained Game startup controller required');
    const frame=owner.#frames.at(-1);
    return owner.#pc==='204b26cc'&&owner.#currentEntry==='204b26c0'&&frame?.entry==='204b26c0'&&
      frame.site==='20466654'&&frame.returnPc==='20466656'&&
      owner.#requireSourcePoint(owner.#pc).instruction==='CALL dword ptr [0x207d890c]'
      ?known(undefined):unknown('Actual original AI helper PropertyID CString CALL required');
  }
  static canonicalAIHelperPropertyIdGuidCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='204b26da'&&owner.#currentEntry==='204b26c0'&&frame?.entry==='204b26c0'&&
      frame.site==='20466654'&&frame.returnPc==='20466656'&&owner.#requireSourcePoint(owner.#pc).instruction==='CALL dword ptr [0x207d86b8]'
      ?known(undefined):unknown('Actual original AI helper PropertyID GUID CALL required');
  }
  static canonicalAIHelperPropertyIdConstructCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='204b26e6'&&owner.#currentEntry==='204b26c0'&&frame?.entry==='204b26c0'&&
      frame.site==='20466654'&&frame.returnPc==='20466656'&&owner.#requireSourcePoint(owner.#pc).instruction==='CALL dword ptr [0x207d86ac]'
      ?known(undefined):unknown('Actual original AI helper PropertyID constructor CALL required');
  }
  static canonicalAIHelperPropertyIdFinishCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object,site:'204b26f0'|'204b26f9'|'204b2704'):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1),instruction=site==='204b26f0'?'CALL dword ptr [0x207d86b0]':site==='204b26f9'?'CALL dword ptr [0x207d8834]':'CALL 0x204637ce';
    return owner.#pc===site&&owner.#currentEntry==='204b26c0'&&frame?.entry==='204b26c0'&&frame.site==='20466654'&&frame.returnPc==='20466656'&&
      owner.#requireSourcePoint(owner.#pc).instruction===instruction?known(undefined):unknown('Actual original PropertyID finish CALL required');
  }
  static canonicalAIHelperAccessorClassNameCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='204b2720'&&owner.#currentEntry==='204b2720'&&frame?.entry==='204b2720'&&frame.site==='20466654'&&frame.returnPc==='20466656'&&
      owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x200191f0'?known(undefined):unknown('Actual original AI helper accessor class-name CALL required');
  }
  static canonicalAIHelperAccessorEmptyCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object,site:'1009059a'|'100905a5'):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc===site&&owner.#currentEntry==='10090590'&&frame?.entry==='10090590'&&frame.site==='100932f6'&&frame.returnPc==='100932fb'&&
      owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x10002f5e'?known(undefined):unknown('Actual original accessor query CString check required');
  }
  static canonicalAIHelperAccessorTypeLookupCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='100905b7'&&owner.#currentEntry==='10090590'&&frame?.entry==='10090590'&&frame.site==='100932f6'&&frame.returnPc==='100932fb'&&
      owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x100019d8'?known(undefined):unknown('Actual original query type lookup required');
  }
  static canonicalAIHelperCloneAllocationCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object,site:string='20077bfb'):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    if(site==='200766a4')return owner.#pc===site&&owner.#currentEntry==='20076630'&&frame?.entry==='20076630'&&frame.site==='20077054'&&frame.returnPc==='20077059'&&owner.#requireSourcePoint(site).instruction==='CALL dword ptr [0x207d88f8]'
      ?known(undefined):unknown('Actual original AI helper component allocation CALL required');
    if(site!=='20077bfb')return unknown('Original AI helper allocation site required');
    return owner.#pc==='20077bfb'&&owner.#currentEntry==='20077bf0'&&frame?.entry==='20077bf0'&&frame.site==='100905e9'&&frame.returnPc==='100905ee'&&
      owner.#requireSourcePoint(owner.#pc).instruction==='CALL dword ptr [0x207d88f8]'?known(undefined):unknown('Actual original AI helper clone allocation CALL required');
  }
  static canonicalAIHelperAdminTypeCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    if(owner.#pc==='20077c1c')return owner.#currentEntry==='20077bf0'&&frame?.entry==='20077bf0'&&frame.site==='100905e9'&&frame.returnPc==='100905ee'&&owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x20016e32'
      ?known(undefined):unknown('Actual original clone AIHelperAdmin type getter required');
    return owner.#pc==='204b267f'&&owner.#currentEntry==='204b2660'&&frame?.entry==='204b2660'&&
      frame.site==='20466654'&&frame.returnPc==='20466656'&&owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x20016e32'
      ?known(undefined):unknown('Actual original AIHelperAdmin type-singleton CALL required');
  }
  static canonicalFreePointTypeCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');
    if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='204b214f' && owner.#currentEntry==='204b2130' &&
      frame?.entry==='204b2130' && frame.site==='20466654' && frame.returnPc==='20466656' &&
      owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x20035a08'
      ? known(undefined):unknown('Actual original FreePoint type-singleton CALL required');
  }
  static canonicalFreePointCleanupCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='204b2174'&&owner.#currentEntry==='204b2130'&&frame?.entry==='204b2130'&&
      frame.site==='20466654'&&frame.returnPc==='20466656'&&owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x204637ce'
      ?known(undefined):unknown('Actual original FreePoint wrapper cleanup registration required');
  }
  static canonicalLabelCleanupCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='204b2414'&&owner.#currentEntry==='204b23d0'&&frame?.entry==='204b23d0'&&
      frame.site==='20466654'&&frame.returnPc==='20466656'&&owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x204637ce'
      ?known(undefined):unknown('Actual original Label wrapper cleanup registration required');
  }
  static canonicalAIHelperAdminCleanupCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='204b26a4'&&owner.#currentEntry==='204b2660'&&frame?.entry==='204b2660'&&
      frame.site==='20466654'&&frame.returnPc==='20466656'&&owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x204637ce'
      ?known(undefined):unknown('Actual original AIHelperAdmin wrapper cleanup registration required');
  }
  static canonicalArenaMemoryGetterCallForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object,site='1008ddbb'):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');
    if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    const instruction=site==='1008ddbb'?'CALL 0x10002aae':site==='1008ddc2'?'CALL 0x10004133':null;
    return instruction!==null && owner.#pc===site && owner.#currentEntry==='1008dd70' &&
      frame?.entry==='1008dd70' && frame.site==='1008eb30' && frame.returnPc==='1008eb35' &&
      owner.#requireSourcePoint(owner.#pc).instruction===instruction
      ? known(undefined):unknown('Actual original Arena reserve MemoryAdmin getter required');
  }
  static canonicalArenaRootCleanupRegistrationForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');
    if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='204b1db4' && owner.#currentEntry==='204b1d70' &&
      frame?.entry==='204b1d70' && frame.site==='20466654' && frame.returnPc==='20466656' &&
      owner.#requireSourcePoint(owner.#pc).instruction==='CALL 0x204637ce'
      ? known(undefined):unknown('Actual original Arena root cleanup registration call required');
  }
  static canonicalArenaStatusInitializerForCrt(owner:NativeGameCrtSetEnvp,crt:NativeModuleCrtOwner,controller:object,entry:'204b1dd0'|'204b1e70'|'204b1eb0'='204b1dd0'):NativeValue<void> {
    const active=NativeGameCrtSetEnvp.canonicalControllerForCrt(owner,crt,controller,'invoke');
    if(!active.known)return active;
    const frame=owner.#frames.at(-1);
    return owner.#pc==='20466654' && frame?.entry===entry &&
      frame.site==='20466654' && frame.returnPc==='20466656' &&
      owner.#requireSourcePoint(owner.#pc).instruction==='CALL EAX'
      ? known(undefined):unknown('Actual original Arena Status initializer call required');
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
    for (const image of [...this.#images,...this.#classImages]) if (fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, image.label)) !== image.fields ||
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
    const point = ['30100fe0','30103020','1004a5a0','1004a1c0'].includes(this.#currentEntry)?aiHelperComponentConstructorInstruction(this.#currentEntry,pc)
      : this.#currentEntry==='1008cdd0' ? aiHelperFactoryQueryInstruction(pc)
      : this.#currentEntry==='100890d0' ? aiHelperWrapperQueryInstruction(pc)
      : this.#currentEntry==='20077bf0' ? aiHelperWrapperCloneInstruction(pc)
      : this.#currentEntry==='10090590' ? aiHelperAccessorQueryInstruction(pc)
      : this.#currentEntry==='100932e0' ? aiHelperAccessorCreatorConstructorInstruction(pc)
      : this.#currentEntry==='204b2720' ? aiHelperAccessorCreatorInstruction(pc)
      : this.#currentEntry==='204b26c0' ? aiHelperPropertyIdInstruction(pc)
      : this.#currentEntry==='200763f0' ? aiHelperAdminAccessorInstruction(pc)
      : this.#currentEntry==='20076630' ? aiHelperAdminReplacementInstruction(pc)
      : this.#currentEntry==='20077040' ? aiHelperAdminWrapperInstruction(pc)
      : this.#currentEntry==='204b2660' ? aiHelperAdminInitializerInstruction(pc)
      : this.#currentEntry==='20074400' ? labelAccessorInstruction(pc)
      : this.#currentEntry==='20074640' ? labelReplacementInstruction(pc)
      : this.#currentEntry==='20075040' ? labelWrapperInstruction(pc)
      : this.#currentEntry==='204b23d0' ? labelInitializerInstruction(pc)
      : this.#currentEntry==='204b2130' ? freePointInitializerInstruction(pc)
      : this.#currentEntry==='20073010' ? freePointWrapperInstruction(pc)
      : this.#currentEntry==='200725c0' ? freePointReplacementInstruction(pc)
      : this.#currentEntry==='20072380' ? freePointAccessorInstruction(pc)
      : ['204b1d70','10089290','200705b0','2006f930','100891b0','10090010','2006d780','1008d190','10090110','1008eb10','1008dd70','100a7980'].includes(this.#currentEntry) ? gameArenaRootInstruction(this.#currentEntry,pc)
      : gameClassNameSpec(this.#currentEntry) ? gameClassNameFamilyInstruction(this.#currentEntry,pc)
      : this.#currentEntry === '2046bcff' ? gameArgvInstruction(pc)
      : ['204665f4', '204738b0', '20473830', '20473860', '20463917', '204638a7',
      '204696f6', '20469672', '2046643f', '20469f3a', '2047e687', '2047e627', '2047e5d7', '2047470c'].includes(this.#currentEntry)
      ? gameCinitInstruction(pc) : gameSetEnvpInstruction(pc);
    if (point.va !== pc || !/^(?:[0-9a-f]{2})+$/.test(point.bytes)) throw new Error('Original environment row receipt differs at' + pc);
    return point;
  }
  #register(register: NativeX86Register): NativeX86Word32 { return fact(NativeX86ThreadStack.prototype.register.call(this.#stack, this.#controller, register)); }
  #immediate(value: number): NativeX86Word32 { return fact(NativeX86ThreadStack.prototype.immediate.call(this.#stack, this.#controller, value >>> 0)); }
  #imageAt(value: number): Image | undefined { return [...this.#images,...this.#classImages].find(image => value >= image.address && value < image.address + image.bytes); }
  #literal(value: number): NativeX86Word32 {
    if (value === 0x20655730) return fact(NativeX86ThreadStack.prototype.gameImageAddress.call(this.#stack, this.#controller, 'cinitCInitializerTable', 540));
    if (value === 0x207b30d0) return fact(NativeX86ThreadStack.prototype.gameImageAddress.call(this.#stack, this.#controller, 'cinitStdioFiles', 640));
    if (value === 0x20655410) return fact(NativeX86ThreadStack.prototype.gameImageAddress.call(this.#stack, this.#controller, 'cinitCppInitializerTable', 955408));
    const image = this.#imageAt(value);
    if (image && (image.label === 'callocEH4Scope' || image.label === 'freeEH4Scope' || image.label === 'cinitNonwritableEH4Scope' || image.label === 'cinitSse2ProbeEH4Scope') && value === image.address) {
      const address = hex(value);
      fact(NativeX86ThreadStack.prototype.registerSourceImage.call(this.#stack, this.#controller, address, image.fields));
      return fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack, this.#controller, 'image', address));
    }
    if (image) return fact(NativeX86ThreadStack.prototype.gameImageAddress.call(this.#stack, this.#controller, image.label, value - image.address));
    if (value === 0x20468600) return fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack, this.#controller, 'code', '20468600'));
    if (value === 0x20473801) return fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack, this.#controller, 'code', '20473801'));
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
    if(this.#currentEntry==='100890d0'&&bytes===4&&value.kind==='memory'&&!value.fs&&
      ((this.#pc==='100890d0'&&value.expression==='ECX')||(this.#pc==='100890d2'&&value.expression==='EAX + 0x38')))
      return fact(NativeX86ThreadStack.prototype.loadAIHelperWrapperQueryVirtualPointer.call(this.#stack,this.#controller,this.#pc,this.#address(value.expression)));
    if(this.#currentEntry==='10090590'&&bytes===4&&value.kind==='memory'&&!value.fs&&
      ((this.#pc==='100905e0'&&value.expression==='ECX')||(this.#pc==='100905e2'&&value.expression==='EDX + 0xc')))
      return fact(NativeX86ThreadStack.prototype.loadArenaVirtualPointer.call(this.#stack,this.#controller,this.#pc,this.#address(value.expression)));
    if(this.#currentEntry==='20077040'&&bytes===4&&value.kind==='memory'&&!value.fs&&
      ((this.#pc==='2007705c'&&value.expression==='ECX')||(this.#pc==='2007705e'&&value.expression==='EDX + 0xc')))
      return fact(NativeX86ThreadStack.prototype.loadArenaVirtualPointer.call(this.#stack,this.#controller,this.#pc,this.#address(value.expression)));
    if(this.#currentEntry==='20075040'&&bytes===4&&value.kind==='memory'&&!value.fs&&
      ((this.#pc==='2007505c'&&value.expression==='ECX')||(this.#pc==='2007505e'&&value.expression==='EDX + 0xc')))
      return fact(NativeX86ThreadStack.prototype.loadArenaVirtualPointer.call(this.#stack,this.#controller,this.#pc,this.#address(value.expression)));
    if(this.#currentEntry==='20073010'&&bytes===4&&value.kind==='memory'&&!value.fs&&
      ((this.#pc==='2007302c'&&value.expression==='ECX')||(this.#pc==='2007302e'&&value.expression==='EDX + 0xc')))
      return fact(NativeX86ThreadStack.prototype.loadArenaVirtualPointer.call(this.#stack,this.#controller,this.#pc,this.#address(value.expression)));
    if(bytes===4&&value.kind==='memory'&&!value.fs&&this.#currentEntry==='20076630'&&
      ((this.#pc==='2007666b'&&value.expression==='0x207d86e8')||(this.#pc==='2007667e'&&value.expression==='0x207d86ec'))){
      const target=value.expression==='0x207d86e8'?gameArenaWrapperImportTarget('207d86e8'):arenaRegistrationToggleTarget();
      return fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack,this.#controller,'code',target));
    }
    if(bytes===4&&value.kind==='memory'&&!value.fs&&this.#currentEntry==='20074640'&&
      ((this.#pc==='2007467b'&&value.expression==='0x207d86e8')||(this.#pc==='2007468e'&&value.expression==='0x207d86ec'))){
      const target=value.expression==='0x207d86e8'?gameArenaWrapperImportTarget('207d86e8'):arenaRegistrationToggleTarget();
      return fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack,this.#controller,'code',target));
    }
    if(bytes===4&&value.kind==='memory'&&!value.fs&&this.#currentEntry==='200725c0'&&
      ((this.#pc==='200725fb'&&value.expression==='0x207d86e8')||(this.#pc==='2007260e'&&value.expression==='0x207d86ec'))){
      const target=value.expression==='0x207d86e8'?gameArenaWrapperImportTarget('207d86e8'):arenaRegistrationToggleTarget();
      return fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack,this.#controller,'code',target));
    }
    if(this.#currentEntry==='200705b0' && bytes===4 && value.kind==='memory' && !value.fs &&
      ((this.#pc==='200705cc' && value.expression==='ECX') || (this.#pc==='200705ce' && value.expression==='EDX + 0xc')))
      return fact(NativeX86ThreadStack.prototype.loadArenaVirtualPointer.call(this.#stack,this.#controller,this.#pc,this.#address(value.expression)));
    if(bytes===4 && value.kind==='memory' && !value.fs && this.#currentEntry==='2006f930' &&
      ((this.#pc==='2006f957' && value.expression==='0x207d87c4') ||
       (this.#pc==='2006f96d' && value.expression==='0x207d86e8'))) {
      const target=gameArenaWrapperImportTarget(value.expression.slice(2));
      return fact(NativeX86ThreadStack.prototype.sourceAddress.call(this.#stack,this.#controller,'code',target));
    }
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
    const componentConstructors:Readonly<Record<string,readonly[string,string,string,string]>>={
      '200766b2':['20076630','CALL dword ptr [0x207d6ddc]','30100fe0','200766b8'],
      '30100fe3':['30100fe0','CALL 0x30035a5d','30103020','30100fe8'],
      '30103023':['30103020','CALL dword ptr [0x30afdc08]','1004a5a0','30103029'],
      '1004a5a3':['1004a5a0','CALL 0x10007c11','1004a1c0','1004a5a8'],
    };
    const componentConstructor=componentConstructors[point.va];
    if(componentConstructor) {
      const [caller,instruction,body,next]=componentConstructor;
      if(this.#currentEntry!==caller||point.instruction!==instruction||returnPc!==next)throw new Error('Original AI helper component constructor call chain required');
      aiHelperComponentConstructorInstruction(body,body);
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body;this.#nextBoundary=null;return body;
    }
    if(point.va==='20077bfb'||point.va==='200766a4') {
      const component=point.va==='200766a4';
      if(this.#currentEntry!==(component?'20076630':'20077bf0')||target.kind!=='memory'||target.expression!=='0x207d88f8'||target.fs||returnPc!==(component?'200766aa':'20077c01'))throw new Error('Original AI helper allocation import required');
      fact(NativeX86ThreadStack.prototype.callAIHelperCloneAllocation.call(this.#stack,this.#controller,point.va));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='204b1db4') {
      if(target.kind!=='immediate' || target.value!==0x204637ce)
        throw new Error('Original Arena root cleanup atexit target required');
      fact(NativeX86ThreadStack.prototype.registerArenaRootCleanup.call(this.#stack,this.#controller));
      this.#nextBoundary=null; return returnPc;
    }
    if(point.va==='200705de'||point.va==='2007303e'||point.va==='2007506e'||point.va==='2007706e') {
      if(this.#currentEntry!==(point.va==='200705de'?'200705b0':point.va==='2007506e'?'20075040':point.va==='2007706e'?'20077040':'20073010') || target.kind!=='memory' || target.expression!=='0x207d86e8' || target.fs)
        throw new Error('Original Arena post-registration IsRoot import required');
      const body=gameArenaWrapperImportTarget('207d86e8');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body; this.#nextBoundary=null; return body;
    }
    if(point.va==='1008dddb') {
      if(this.#currentEntry!=='1008dd70' || target.kind!=='immediate' || target.value!==0x100a7980)
        throw new Error('Original Arena array memset call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'100a7980',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='100a7980'; this.#nextBoundary=null; return '100a7980';
    }
    if(point.va==='1008ddc2') {
      if(this.#currentEntry!=='1008dd70' || target.kind!=='immediate' || target.value!==0x10004133)
        throw new Error('Original Arena reserve MemoryAdmin realloc call required');
      fact(NativeX86ThreadStack.prototype.callArenaMemoryAdminRealloc.call(this.#stack,this.#controller,returnPc));
      this.#nextBoundary=null; return returnPc;
    }
    if(point.va==='1008ddbb') {
      if(this.#currentEntry!=='1008dd70' || target.kind!=='immediate' || target.value!==0x10002aae)
        throw new Error('Original Arena reserve MemoryAdmin getter call required');
      fact(NativeX86ThreadStack.prototype.callArenaMemoryAdminGetter.call(this.#stack,this.#controller,returnPc));
      this.#nextBoundary=null; return returnPc;
    }
    if(point.va==='1008eb30') {
      if(this.#currentEntry!=='1008eb10' || target.kind!=='immediate' || target.value!==0x100035f8)
        throw new Error('Original Arena root array reserve call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'1008dd70',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='1008dd70'; this.#nextBoundary=null; return '1008dd70';
    }
    if(point.va==='1008d257') {
      if(this.#currentEntry!=='1008d190' || target.kind!=='immediate' || target.value!==0x10007d92)
        throw new Error('Original factory root-array insertion call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'1008eb10',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='1008eb10'; this.#nextBoundary=null; return '1008eb10';
    }
    if(point.va==='200705d6'||point.va==='20073036'||point.va==='20075066'||point.va==='20077066') {
      if(this.#currentEntry!==(point.va==='200705d6'?'200705b0':point.va==='20075066'?'20075040':point.va==='20077066'?'20077040':'20073010') || target.kind!=='memory' || target.expression!=='0x207d86e0' || target.fs)
        throw new Error('Original Arena RegisterPropertyObject call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'1008d190',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='1008d190'; this.#nextBoundary=null; return '1008d190';
    }
    if(['1008d1aa','1008d1b9'].includes(point.va)) {
      const [entry,body]=point.va==='1008d1aa'?['10001f23','10090110']:['100058a3','100891b0'];
      if(this.#currentEntry!=='1008d190' || target.kind!=='immediate' || hex(target.value)!==entry)
        throw new Error('Original factory registration helper call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body; this.#nextBoundary=null; return body;
    }
    if(point.va==='100905e9'||point.va==='1008cdde') {
      const factory=point.va==='100905e9',entry=factory?'10007ec8':'100058a3',body=factory?'1008cdd0':'100891b0';
      if(this.#currentEntry!==(factory?'10090590':'1008cdd0')||target.kind!=='immediate'||hex(target.value)!==entry)throw new Error('Original factory object query or root check required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body;this.#nextBoundary=null;return body;
    }
    if(point.va==='100905b7') {
      if(this.#currentEntry!=='10090590'||target.kind!=='immediate'||target.value!==0x100019d8||returnPc!=='100905bc')throw new Error('Original query type-node lookup required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'100019d8'});
      fact(NativeX86ThreadStack.prototype.callAIHelperAccessorTypeLookup.call(this.#stack,this.#controller));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='100932f6') {
      if(this.#currentEntry!=='100932e0'||target.kind!=='immediate'||target.value!==0x10007036||returnPc!=='100932fb')throw new Error('Original accessor QueryNewObject target required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'10090590',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='10090590';this.#nextBoundary=null;return '10090590';
    }
    if(point.va==='1009059a'||point.va==='100905a5') {
      if(this.#currentEntry!=='10090590'||target.kind!=='immediate'||target.value!==0x10002f5e)throw new Error('Original query CString emptiness target required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'10002f5e'});
      fact(NativeX86ThreadStack.prototype.callAIHelperAccessorStringEmpty.call(this.#stack,this.#controller,point.va));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='100932ef') {
      if(this.#currentEntry!=='100932e0'||target.kind!=='immediate'||target.value!==0x10004fd4||returnPc!=='100932f4')throw new Error('Original accessor singleton getter required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'10004fd4'});
      fact(NativeX86ThreadStack.prototype.callArenaPropertySingleton.call(this.#stack,this.#controller,point.va,returnPc));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='1008d1a3') {
      if(this.#currentEntry!=='1008d190' || target.kind!=='immediate' || target.value!==0x10004fd4)
        throw new Error('Original factory registration singleton getter required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'10004fd4'});
      fact(NativeX86ThreadStack.prototype.callArenaPropertySingleton.call(this.#stack,this.#controller,point.va,returnPc));
      this.#nextBoundary=null; return returnPc;
    }
    if(point.va==='200705d2') {
      if(this.#currentEntry!=='200705b0' || target.kind!=='register' || target.register!=='EAX' || target.lane)
        throw new Error('Original Arena factory virtual call required');
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(target),'code','2002adfb'));
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'2006d780',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='2006d780'; this.#nextBoundary=null; return '2006d780';
    }
    if(point.va==='20073032'){
      if(this.#currentEntry!=='20073010'||target.kind!=='register'||target.register!=='EAX'||target.lane)
        throw new Error('Original FreePoint factory accessor call required');
      freePointAccessorInstruction('20072380');
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(target),'code','20024672'));
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'20072380',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='20072380';this.#nextBoundary=null;return '20072380';
    }
    if(point.va==='20075062'){
      if(this.#currentEntry!=='20075040'||target.kind!=='register'||target.register!=='EAX'||target.lane)
        throw new Error('Original Label factory accessor call required');
      labelAccessorInstruction('20074400');
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(target),'code','20017e27'));
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'20074400',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='20074400';this.#nextBoundary=null;return '20074400';
    }
    if(point.va==='20077062'||point.va==='100905e5'){
      if(this.#currentEntry!==(point.va==='100905e5'?'10090590':'20077040')||target.kind!=='register'||target.register!=='EAX'||target.lane)
        throw new Error('Original AI helper administrator factory accessor call required');
      aiHelperAdminAccessorInstruction('200763f0');
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(target),'code','2000e59d'));
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'200763f0',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='200763f0';this.#nextBoundary=null;return '200763f0';
    }
    if(['2006f98d','2006f9f4'].includes(point.va)) {
      if(this.#currentEntry!=='2006f930' || target.kind!=='memory' || target.expression!=='0x207d86ec' || target.fs)
        throw new Error('Original Arena registration toggle call required');
      const body=arenaRegistrationToggleTarget();
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body; this.#nextBoundary=null; return body;
    }
    if(['2006f985','2006f9ec','20072619','2007265c','20074699','200746dd','20076689','200766e1'].includes(point.va)) {
      if(target.kind!=='memory' || target.expression!=='0x207d8868' || target.fs)
        throw new Error('Original Arena property singleton operand required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'import',target:'207d8868'});
      fact(NativeX86ThreadStack.prototype.callArenaPropertySingleton.call(this.#stack,this.#controller,point.va,returnPc));
      this.#nextBoundary=null; return returnPc;
    }
    if(point.va==='200705c4') {
      if(this.#currentEntry!=='200705b0' || target.kind!=='immediate' || target.value!==0x2002dc8b)
        throw new Error('Original Arena object replacement call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'2006f930',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='2006f930'; this.#nextBoundary=null; return '2006f930';
    }
    if(point.va==='20073024') {
      if(this.#currentEntry!=='20073010'||target.kind!=='immediate'||target.value!==0x2002a987||returnPc!=='20073029')
        throw new Error('Original FreePoint object replacement call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'200725c0',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='200725c0';this.#nextBoundary=null;return '200725c0';
    }
    if(['2007260a','20072627','20072653','20072668','200726ec'].includes(point.va)) {
      if(this.#currentEntry!=='200725c0'||target.kind!=='register'||target.register!=='EBX'||target.lane)
        throw new Error('Original FreePoint indirect IsRoot call required');
      const body=gameArenaWrapperImportTarget('207d86e8');
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(target),'code',body));
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body;this.#nextBoundary=null;return body;
    }
    if(['20072621','20072664'].includes(point.va)) {
      if(this.#currentEntry!=='200725c0'||target.kind!=='register'||target.register!=='EBP'||target.lane)
        throw new Error('Original FreePoint registration toggle call required');
      const body=arenaRegistrationToggleTarget();
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(target),'code',body));
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body;this.#nextBoundary=null;return body;
    }
    if(point.va==='20075054') {
      if(this.#currentEntry!=='20075040'||target.kind!=='immediate'||target.value!==0x20025e55||returnPc!=='20075059')
        throw new Error('Original Label object replacement call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'20074640',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='20074640';this.#nextBoundary=null;return '20074640';
    }
    if(['2007468a','200746a7','200746d4','200746e9','2007476d'].includes(point.va)) {
      if(this.#currentEntry!=='20074640'||target.kind!=='register'||target.register!=='EBX'||target.lane)
        throw new Error('Original Label indirect IsRoot call required');
      const body=gameArenaWrapperImportTarget('207d86e8');
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(target),'code',body));
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body;this.#nextBoundary=null;return body;
    }
    if(['200746a1','200746e5'].includes(point.va)) {
      if(this.#currentEntry!=='20074640'||target.kind!=='register'||target.register!=='EBP'||target.lane)
        throw new Error('Original Label registration toggle call required');
      const body=arenaRegistrationToggleTarget();
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(target),'code',body));
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body;this.#nextBoundary=null;return body;
    }
    if(point.va==='20077054') {
      if(this.#currentEntry!=='20077040'||target.kind!=='immediate'||target.value!==0x200319d0||returnPc!=='20077059')
        throw new Error('Original AI helper administrator object replacement call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'20076630',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='20076630';this.#nextBoundary=null;return '20076630';
    }
    if(['2007667a','20076697','200766d8','200766ed','20076771'].includes(point.va)) {
      if(this.#currentEntry!=='20076630'||target.kind!=='register'||target.register!=='EBP'||target.lane)
        throw new Error('Original AI helper administrator indirect IsRoot call required');
      const body=gameArenaWrapperImportTarget('207d86e8');
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(target),'code',body));
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body;this.#nextBoundary=null;return body;
    }
    if(['20076691','200766e9'].includes(point.va)) {
      if(this.#currentEntry!=='20076630'||target.kind!=='register'||target.register!=='EBX'||target.lane)
        throw new Error('Original AI helper administrator registration toggle call required');
      const body=arenaRegistrationToggleTarget();
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(target),'code',body));
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body;this.#nextBoundary=null;return body;
    }
    if(['2006f97c','2006f997','2006f9e3','2006f9fc'].includes(point.va)) {
      if(this.#currentEntry!=='2006f930' || target.kind!=='register' || target.register!=='EBP' || target.lane)
        throw new Error('Original Arena indirect IsRoot call required');
      const body=gameArenaWrapperImportTarget('207d86e8');
      fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(target),'code',body));
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:body,site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry=body; this.#nextBoundary=null; return body;
    }
    if(point.va==='204b2174'){
      if(target.kind!=='immediate'||target.value!==0x204637ce||returnPc!=='204b2179')throw new Error('Original FreePoint cleanup call target required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'204637ce'});
      fact(NativeX86ThreadStack.prototype.registerFreePointWrapperCleanup.call(this.#stack,this.#controller));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='204b2414'){
      if(target.kind!=='immediate'||target.value!==0x204637ce||returnPc!=='204b2419')throw new Error('Original Label cleanup call target required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'204637ce'});
      fact(NativeX86ThreadStack.prototype.registerLabelWrapperCleanup.call(this.#stack,this.#controller));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='204b26a4'){
      if(target.kind!=='immediate'||target.value!==0x204637ce||returnPc!=='204b26a9')throw new Error('Original AIHelperAdmin cleanup call target required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'204637ce'});
      fact(NativeX86ThreadStack.prototype.registerAIHelperAdminWrapperCleanup.call(this.#stack,this.#controller));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='204b269a'||point.va==='20077c33') {
      const clone=point.va==='20077c33';
      if(this.#currentEntry!==(clone?'20077bf0':'204b2660')||target.kind!=='immediate'||target.value!==0x20026a08||returnPc!==(clone?'20077c38':'204b269f'))
        throw new Error('Original AI helper administrator wrapper initialization call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'20077040',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='20077040';this.#nextBoundary=null;return '20077040';
    }
    if(point.va==='204b240a') {
      if(this.#currentEntry!=='204b23d0'||target.kind!=='immediate'||target.value!==0x200340e0||returnPc!=='204b240f')
        throw new Error('Original Label wrapper initialization call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'20075040',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='20075040';this.#nextBoundary=null;return '20075040';
    }
    if(point.va==='204b216a') {
      if(this.#currentEntry!=='204b2130'||target.kind!=='immediate'||target.value!==0x20008571||returnPc!=='204b216f')
        throw new Error('Original FreePoint wrapper initialization call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'20073010',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='20073010';this.#nextBoundary=null;return '20073010';
    }
    if(point.va==='204b1daa') {
      if(this.#currentEntry!=='204b1d70' || target.kind!=='immediate' || target.value!==0x200021d5 || returnPc!=='204b1daf')
        throw new Error('Original Arena wrapper initialization call required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'200705b0',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='200705b0'; this.#nextBoundary=null; return '200705b0';
    }
    if(point.va==='204b23ef') {
      if(target.kind!=='immediate'||target.value!==0x20006b0e||returnPc!=='204b23f4')throw new Error('Original Label type singleton call target required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'20006b0e'});
      fact(NativeX86ThreadStack.prototype.callGameLabelTypeSingleton.call(this.#stack,this.#controller));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='204b267f'||point.va==='20077c1c') {
      if(target.kind!=='immediate'||target.value!==0x20016e32||returnPc!==(point.va==='20077c1c'?'20077c21':'204b2684'))throw new Error('Original AIHelperAdmin type singleton call target required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'20016e32'});
      fact(NativeX86ThreadStack.prototype.callGameAIHelperAdminTypeSingleton.call(this.#stack,this.#controller,point.va));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='204b214f') {
      if(target.kind!=='immediate'||target.value!==0x20035a08||returnPc!=='204b2154')
        throw new Error('Original FreePoint type singleton call target required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'20035a08'});
      fact(NativeX86ThreadStack.prototype.callGameFreePointTypeSingleton.call(this.#stack,this.#controller));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='204b1d8f') {
      if(target.kind!=='immediate' || target.value!==0x2000d152 || returnPc!=='204b1d94')
        throw new Error('Original Arena type singleton call target required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'2000d152'});
      fact(NativeX86ThreadStack.prototype.callGameArenaTypeSingleton.call(this.#stack,this.#controller));
      this.#nextBoundary=null; return returnPc;
    }
    if(point.va==='204b1d75'||point.va==='204b2135'||point.va==='204b23d5'||point.va==='204b2665'||point.va==='20077c09') {
      if(this.#currentEntry!==(point.va==='20077c09'?'20077bf0':point.va==='204b1d75'?'204b1d70':point.va==='204b23d5'?'204b23d0':point.va==='204b2665'?'204b2660':'204b2130') || target.kind!=='memory' || target.expression!=='0x207d87b8' || target.fs)
        throw new Error('Original Arena wrapper constructor call required');
      admitArenaWrapperConstructorImport();
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'import',target:'207d87b8'});
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'10089290',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='10089290'; this.#nextBoundary=null; return '10089290';
    }
    if (point.va === '20466654') {
      const callback = fact(NativeX86ThreadStack.prototype.resolveGameCppInitializer.call(this.#stack, this.#controller));
      this.#nextBoundary = Object.freeze({ pc: point.va, operation: 'indirectSourceCall', target: callback });
      if((callback==='204b1dd0'||callback==='204b1e70'||callback==='204b1eb0') && nativeGameLayerBaseMemoryForCrt(this.#crt as NativeGameCrtOwner).known) {
        // This is the existing translated initializer owner; its lower
        // instructions are not interpreted on this startup stack.
        this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:callback});
        this.#frames.push(Object.freeze({entry:callback,site:point.va,returnPc,previousEntry:this.#currentEntry}));
        fact(NativeX86ThreadStack.prototype.callArenaStatusInitializer.call(this.#stack,this.#controller,callback));
        this.#frames.pop(); this.#nextBoundary=null; return returnPc;
      }
      if ((callback === '204b1d70'||callback==='204b2130'||callback==='204b23d0'||callback==='204b2660'||callback==='204b26c0'||callback==='204b2720') && nativeGameLayerBaseMemoryForCrt(this.#crt as NativeGameCrtOwner).known) {
        const labels=callback==='204b2720'?['aiHelperAccessorCreator','aiHelperPropertyId','aiHelperAdminClassNameAndCache']:callback==='204b26c0'?['aiHelperPropertyId','aiHelperPropertyIdGuidLiteral']:callback==='204b2660'?['aiHelperAdminWrapper','aiHelperAdminWrapperVtable','aiHelperAdminTypeVtable']:callback==='204b1d70'?['arenaRootWrapper','arenaRootVtable','arenaRootTypeVtable']:callback==='204b23d0'?['labelWrapper','labelWrapperVtable','labelTypeVtable']:['freePointWrapper','freePointWrapperVtable','freePointTypeVtable'];
        this.#classImages = Object.freeze(labels.map(label => {
          const receipt = nativeGameImageReceipt(label);
          const fields = fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt,label));
          if(fields.bytes.length!==receipt.bytes || fields.knownMask.length!==receipt.bytes)
            throw new Error('Original Arena root image geometry required');
          return Object.freeze({label,address:Number.parseInt(receipt.address,16),bytes:receipt.bytes,fields});
        }));
        fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
        this.#frames.push(Object.freeze({entry:callback,site:point.va,returnPc,previousEntry:this.#currentEntry}));
        this.#currentEntry=callback; this.#nextBoundary=null; return callback;
      }
      if (gameClassNameSpec(callback) && nativeGameLayerBaseMemoryForCrt(this.#crt as NativeGameCrtOwner).known) {
        const spec = gameClassNameSpec(callback)!;
        this.#classImages = Object.freeze([spec.labels.cache,spec.labels.result].map(label => {
          const receipt = nativeGameImageReceipt(label);
          const fields = fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt,label));
          if (fields.bytes.length !== receipt.bytes || fields.knownMask.length !== receipt.bytes)
            throw new Error('Original selected class-name image geometry required');
          return Object.freeze({label,address:Number.parseInt(receipt.address,16),bytes:receipt.bytes,fields});
        }));
        fact(NativeX86ThreadStack.prototype.call.call(this.#stack, this.#controller, point.va, returnPc));
        this.#frames.push(Object.freeze({ entry: callback, site: point.va, returnPc, previousEntry: this.#currentEntry }));
        this.#currentEntry = callback; this.#nextBoundary = null; return callback;
      }
      throw new Error('Original Game C++ initializer callback is not yet admitted at ' + callback);
    }
    if(point.va==='204b2730') {
      if(this.#currentEntry!=='204b2720'||target.kind!=='memory'||target.expression!=='0x207d86b4'||target.fs||returnPc!=='204b2736')throw new Error('Original accessor creator constructor import required');
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack,this.#controller,point.va,returnPc));
      this.#frames.push(Object.freeze({entry:'100932e0',site:point.va,returnPc,previousEntry:this.#currentEntry}));
      this.#currentEntry='100932e0';this.#nextBoundary=null;return '100932e0';
    }
    if(point.va==='204b2720') {
      if(this.#currentEntry!=='204b2720'||target.kind!=='immediate'||target.value!==0x200191f0||returnPc!=='204b2725')throw new Error('Original accessor class-name getter required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'200191f0'});
      fact(NativeX86ThreadStack.prototype.callAIHelperAccessorClassName.call(this.#stack,this.#controller));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='204b26f0'||point.va==='204b26f9'||point.va==='204b2704') {
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:point.instruction.slice(5)});
      fact(NativeX86ThreadStack.prototype.finishAIHelperPropertyIdInitializerCall.call(this.#stack,this.#controller,point.va));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='204b26e6') {
      if(this.#currentEntry!=='204b26c0'||target.kind!=='memory'||target.expression!=='0x207d86ac'||target.fs||returnPc!=='204b26ec')
        throw new Error('Original AI helper PropertyID constructor import required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'1000459d'});
      fact(NativeX86ThreadStack.prototype.callAIHelperPropertyIdConstructor.call(this.#stack,this.#controller));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='204b26da') {
      if(this.#currentEntry!=='204b26c0'||target.kind!=='memory'||target.expression!=='0x207d86b8'||target.fs||returnPc!=='204b26e0')
        throw new Error('Original AI helper PropertyID GUID import required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'10001528'});
      fact(NativeX86ThreadStack.prototype.callAIHelperPropertyIdGuidConstructor.call(this.#stack,this.#controller));
      this.#nextBoundary=null;return returnPc;
    }
    if(point.va==='204b26cc') {
      if(this.#currentEntry!=='204b26c0'||target.kind!=='memory'||target.expression!=='0x207d890c'||target.fs||returnPc!=='204b26d2')
        throw new Error('Original AI helper PropertyID CString import required');
      this.#nextBoundary=Object.freeze({pc:point.va,operation:'translatedCrtCall',target:'10003ba7'});
      fact(NativeX86ThreadStack.prototype.callAIHelperPropertyIdTextConstructor.call(this.#stack,this.#controller));
      this.#nextBoundary=null;return returnPc;
    }
    const classNameSpec = gameClassNameSpec(point.va);
    if (classNameSpec) {
      this.#nextBoundary = Object.freeze({ pc: point.va, operation: 'translatedCrtCall', target: classNameSpec.getter });
      fact(NativeX86ThreadStack.prototype.callGameLayerBaseClassName.call(this.#stack, this.#controller, point.va));
      this.#nextBoundary = null; return returnPc;
    }
    if (point.va === '20466638') {
      this.#nextBoundary = Object.freeze({ pc: point.va, operation: 'translatedCrtCall', target: '204637ce' });
      fact(NativeX86ThreadStack.prototype.registerGameStaticFini.call(this.#stack, this.#controller));
      this.#nextBoundary = null; return returnPc;
    }
    if (point.va === '20466452') {
      const callback = fact(NativeX86ThreadStack.prototype.resolveGameCinitErrorCallback.call(this.#stack, this.#controller));
      this.#nextBoundary = Object.freeze({ pc: point.va, operation: 'indirectSourceCall', target: callback });
      if (callback === '20463763') {
        fact(NativeX86ThreadStack.prototype.initializeGameCinitExitTable.call(this.#stack, this.#controller));
        this.#exitTableInitializerReturned = true;
        this.#nextBoundary = null; return returnPc;
      }
      if (!['20469f3a', '2046bcff', '2047470c', '2047e687'].includes(callback)) throw new Error('Original Game C initializer callback is not yet admitted at ' + callback);
      fact(NativeX86ThreadStack.prototype.call.call(this.#stack, this.#controller, point.va, returnPc));
      this.#frames.push(Object.freeze({ entry: callback, site: point.va, returnPc, previousEntry: this.#currentEntry }));
      this.#currentEntry = callback; this.#nextBoundary = null; return callback;
    }
    if (point.va === '2046967e') {
      this.#nextBoundary = Object.freeze({ pc: point.va, operation: 'translatedCrtCall', target: '20467d64' });
      fact(NativeX86ThreadStack.prototype.encodeGameCinitPointer.call(this.#stack, this.#controller));
      this.#nextBoundary = null; return returnPc;
    }
    if (['204696fb', '2046970b', '20469717'].includes(point.va)) {
      this.#nextBoundary = Object.freeze({ pc: point.va, operation: 'import', target: point.instruction.slice(5) });
      fact(NativeX86ThreadStack.prototype.invokeGameCinitImport.call(this.#stack, this.#controller, point.va));
      this.#nextBoundary = null; return returnPc;
    }
    if (point.va === '20466610') {
      if (target.kind !== 'memory' || target.expression !== '0x206b638c' || target.fs) throw new Error('Original Game math callback operand required');
      fact(NativeX86ThreadStack.prototype.callGameMathInitializer.call(this.#stack, this.#controller, this.#read(target)));
      this.#frames.push(Object.freeze({ entry: '20463917', site: point.va, returnPc, previousEntry: this.#currentEntry }));
      this.#currentEntry = '20463917'; return '20463917';
    }
    if (imports.has(point.va as NativeSetEnvpCallSite)) {
      this.#importSite = point.va as NativeSetEnvpCallSite;
      fact(NativeX86ThreadStack.prototype.invokeSetEnvpImport.call(this.#stack, this.#controller, this.#importSite));
      this.#importSite = null; return returnPc;
    }
    if (target.kind !== 'immediate' || !ranges.has(hex(target.value)) || hex(target.value) === '204677e4') {
      this.#nextBoundary = point.va === '20466610'
        ? Object.freeze({ pc: point.va, operation: 'indirectSourceCall', target: point.instruction.slice(5) })
        : target.kind === 'immediate' ? Object.freeze({ pc: point.va, operation: 'sourceCall', target: hex(target.value) })
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
    if (['PUSHFD', 'POPFD', 'CPUID', 'MOVAPD XMM0,XMM1'].includes(point.instruction)) {
      fact(NativeX86ThreadStack.prototype.executeGameCinitCpuInstruction.call(this.#stack, this.#controller, point.va));
      return hex(Number.parseInt(point.va, 16) + point.bytes.length / 2);
    }
    if (point.instruction === 'FNCLEX') {
      fact(NativeX86ThreadStack.prototype.clearX87Exceptions.call(this.#stack, this.#controller));
      return hex(Number.parseInt(point.va, 16) + point.bytes.length / 2);
    }
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
    if(point.va==='1008ce15'||point.va==='100890d5') {
      const factory=point.va==='1008ce15',frame=this.#frames.at(-1);
      if(this.#currentEntry!==(factory?'1008cdd0':'100890d0')||frame?.entry!==this.#currentEntry||frame.site!=='100905e9'||frame.returnPc!=='100905ee')throw new Error('Actual factory object-query tail frame required');
      if(factory) {
        if(destination.kind!=='immediate'||destination.value!==0x100056e6)throw new Error('Original wrapper-query tail target required');
        aiHelperWrapperQueryInstruction('100890d0');
      } else {
        if(destination.kind!=='register'||destination.register!=='EDX'||destination.lane)throw new Error('Original wrapper clone virtual tail target required');
        fact(NativeX86ThreadStack.prototype.requireSourceAddress.call(this.#stack,this.#controller,this.#read(destination),'code','20028efc'));
        aiHelperWrapperCloneInstruction('20077bf0');
      }
      const body=factory?'100890d0':'20077bf0';
      this.#frames[this.#frames.length-1]=Object.freeze({...frame,entry:body});this.#currentEntry=body;return body;
    }
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
    } else if (opcode === 'SHL' || opcode === 'SHR' || opcode === 'SAR') {
      if (source.kind !== 'immediate') throw new Error('Only original immediate shift counts are admitted');
      this.#write(destination, fact(NativeX86ThreadStack.prototype.shift.call(this.#stack, this.#controller,
        this.#read(destination), source.value, opcode === 'SHL' ? 'left' : opcode === 'SAR' ? 'arithmeticRight' : 'logicalRight', width(destination))));
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
      aiHelperAccessorQueryNode: NativeX86ThreadStack.prototype.aiHelperAccessorQueryNodeSnapshot.call(this.#stack),
      aiHelperCloneAllocation: NativeX86ThreadStack.prototype.aiHelperCloneAllocationSnapshot.call(this.#stack),
      aiHelperComponentAllocation: NativeX86ThreadStack.prototype.aiHelperComponentAllocationSnapshot.call(this.#stack),
      aiHelperPropertyIdText: NativeX86ThreadStack.prototype.aiHelperPropertyIdTextSnapshot.call(this.#stack),
      aiHelperPropertyIdGuid: NativeX86ThreadStack.prototype.aiHelperPropertyIdGuidSnapshot.call(this.#stack),
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
      cinitCalled: graph.calls.some(call => call.site === '204678f2'),
      mathProtectionCheckReturned: graph.calls.some(call => call.site === '20466602' && call.returned),
      mathInitializerReturned: graph.calls.some(call => call.site === '20466610' && call.returned),
      floatConversionInitializerReturned: graph.calls.some(call => call.site === '20463917' && call.returned),
      floatPointerInitializerReturned: graph.calls.some(call => call.site === '20466617' && call.returned),
      exitTableInitializerReturned: this.#exitTableInitializerReturned,
      conversionSse2InitializerReturned: this.#effects.some(effect => effect.pc === '20469f4d'),
      multibyteCInitializerReturned: this.#effects.some(effect => effect.pc === '2046bd1c'),
      stdioInitializerReturned: this.#effects.some(effect => effect.pc === '204747bc' || effect.pc === '2047475b'),
      stdioCount: this.#diagnosticScalar('cinitStdioCount'),
      floatingPointSse2InitializerReturned: this.#effects.some(effect => effect.pc === '2047e693'),
      callerTestsCompleted: this.#callerTestsCompleted, sourceOperationsCompleted: this.#effects.length,
      effects: Object.freeze(this.#effects.map(effect => Object.freeze({ ...effect }))),
      wholeCrtTraversalCompleted: false, moduleAttachCompleted: false, fullCampaignCompleted: false });
  }
}
