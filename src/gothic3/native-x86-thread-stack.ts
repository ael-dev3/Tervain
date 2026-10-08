/** Retained virtual x86 stack/register/FS state. Numerical addresses stay
 * unknown; private relative-address and expression capabilities own relations. */
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import { NativeSharedCrtOwner } from './native-shared-crt';
import { sharedCommandLineInstruction } from './native-shared-command-line-instructions';
import { sharedInitializerInstruction } from './native-shared-initializer-instructions';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { nativeGameImageReceipt } from './native-game-crt-profile';
import { NativeGameCrtIoInit } from './native-game-crt-ioinit';
import { NativeGameCrtArgv } from './native-game-crt-argv';
import { NativeGameCrtSetEnvp } from './native-game-crt-setenvp';
import type { NativeSetEnvpCallSite, NativeSetEnvpCallGrant, NativeSetEnvpResult } from './native-win32-setenvp';
import type { NativeArgvCallSite, NativeArgvImportKind, NativeArgvNlsCallGrant, NativeArgvNlsArguments, NativeArgvArgument } from './native-win32-argv-nls';
import type { NativeX86ThreadStackSelection } from './native-x86-thread-stack-profile';
import type { NativeStartupInfoCallGrant } from './native-win32-startup-io';
import type { NativeWin32HeapCapability } from './native-runtime-platform';
import type { NativeBytePointer } from './native-pointer-geometry';
import type { NativeStandardIoCallSite, NativeStandardIoCallKind, NativeStandardIoCallGrant,
  NativeStandardIoCapabilityKind } from './native-win32-standard-io';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
// Retain the actual intrinsic brand getters once. Every physical check still
// reads current view storage through them; later prototype rebinding cannot
// substitute caller functions for the native DataView brand proof.
const dataViewBuffer = Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer')!.get!;
const dataViewByteOffset = Object.getOwnPropertyDescriptor(DataView.prototype, 'byteOffset')!.get!;
const dataViewByteLength = Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength')!.get!;
const token = Object.freeze({});
export type NativeX86Register = 'EAX' | 'EBX' | 'ECX' | 'EDX' | 'ESI' | 'EDI' | 'EBP' | 'ESP';
const registers: readonly NativeX86Register[] = ['EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP'];
export interface NativeX86Word32 { readonly identity: object; }
export interface NativeHeapAllocCallGrant { readonly identity: object; }
export type NativeX86Condition = 'z' | 'nz' | 'be' | 'a' | 'c' | 'nc' | 'l' | 'ge' | 'le' | 'g';
export type NativeX86Lane = 'low8' | 'high8' | 'low16';
type Width = 1 | 2 | 4;
interface Allocation { readonly physical?: NativeHeapObjectViews; readonly originalPointer?: NativeBytePointer; readonly fields: NativeHeapObjectViews; readonly heap: NativeWin32HeapCapability; readonly crt: NativeModuleCrtOwner; readonly ptd?: true; }
type WordRecord = Readonly<{ value: number; mask: number; provenance?:
  Readonly<{ kind: 'stack'; offset: number }> |
  Readonly<{ kind: 'shared-local'; fields:NativeHeapObjectViews; offset?:number }> |
  Readonly<{ kind: 'module'; label: string; fields: NativeHeapObjectViews; offset: number }> |
  Readonly<{ kind: 'process'; pointer: NativeBytePointer }> |
  Readonly<{ kind: 'heap'; heap: NativeWin32HeapCapability }> |
  Readonly<{ kind: 'allocation'; allocation: Allocation; offset: number; pointer: NativeBytePointer }> |
  Readonly<{ kind: 'platform'; object: object; category: NativeStandardIoCapabilityKind | NativeArgvImportKind | 'GetModuleHandleA' | 'GetProcAddress' | 'IsProcessorFeaturePresent' | 'InitializerTlsGetValue' | 'InitializerPtdGetter' | 'InitializerEncodePointer' | 'InitializerDecodePointer' | 'InitializerHeapSize' | 'InitializerInitializeSection' | 'InitializerEncodedCode' }> |
  Readonly<{ kind: 'source'; type: 'code' | 'image'; address: string; fields?: NativeHeapObjectViews }> |
  Readonly<{ kind: 'xor'; left: NativeX86Word32; right: NativeX86Word32 }> |
  Readonly<{ kind: 'neg'; word: NativeX86Word32 }> }>;
interface Slot { readonly word: NativeX86Word32; readonly bytes: readonly number[]; readonly masks: readonly number[]; }
interface Binding { readonly crt: NativeModuleCrtOwner; readonly owner: NativeGameCrtIoInit; readonly controller: object; }
interface SetEnvpBinding { readonly crt: NativeModuleCrtOwner; readonly owner: NativeGameCrtSetEnvp; readonly controller: object; }
export interface NativeSetEnvpArguments {
  readonly site: NativeSetEnvpCallSite; readonly crt: NativeModuleCrtOwner; readonly heap: NativeWin32HeapCapability;
  readonly callerSite: string;
  readonly flags: 0 | 8; readonly bytes?: number; readonly backing?: NativeMemoryBacking;
}
interface SetEnvpCall {
  readonly stack: NativeX86ThreadStack; readonly controller: object; readonly args: NativeSetEnvpArguments;
  readonly words: readonly NativeX86Word32[]; readonly position: number; readonly frame: number;
  readonly fs: NativeX86Word32; readonly returnWord: NativeX86Word32; readonly frames: readonly string[];
  phase: 'pending' | 'returned';
}
interface ArgvBinding { readonly crt: NativeModuleCrtOwner; readonly owner: NativeGameCrtArgv; readonly controller: object; }
interface ArgvCall { readonly stack: NativeX86ThreadStack; readonly controller: object; readonly args: NativeArgvNlsArguments;
  readonly position: number; readonly fs: NativeX86Word32; readonly returnWord: NativeX86Word32;
  readonly words: readonly NativeX86Word32[]; readonly argumentBytes: number; readonly frames: readonly string[]; phase: 'pending' | 'returned'; }
interface PhysicalProof { readonly backing: NativeMemoryBacking; readonly identity: object; readonly rootBytes: Uint8Array;
  readonly rootMasks: Uint8Array; readonly bytes: Uint8Array; readonly masks: Uint8Array; readonly view: DataView; readonly length: number; }
interface StartupCall {
  readonly stack: NativeX86ThreadStack; readonly controller: object; readonly fields: NativeHeapObjectViews;
  readonly offset: number; readonly argument: NativeX86Word32; readonly position: number;
  readonly returnWord: NativeX86Word32; phase: 'pending' | 'returned';
}
interface HeapCall {
  readonly stack: NativeX86ThreadStack; readonly controller: object; readonly crt: NativeModuleCrtOwner;
  readonly heap: NativeWin32HeapCapability; readonly heapWord: NativeX86Word32;
  readonly flagsWord: NativeX86Word32; readonly bytesWord: NativeX86Word32;
  readonly bytes: number; readonly position: number; readonly frame: number; readonly returnWord: NativeX86Word32;
  phase: 'pending' | 'returned';
}
export interface NativeStandardIoArguments {
  readonly site: NativeStandardIoCallSite; readonly kind: NativeStandardIoCallKind; readonly crt: NativeModuleCrtOwner;
  readonly scalar?: number; readonly object?: object | null; readonly procedure?: object;
  readonly section?: NativeBytePointer; readonly sectionFields?: NativeHeapObjectViews;
}
interface StandardCall {
  readonly stack: NativeX86ThreadStack; readonly controller: object; readonly args: NativeStandardIoArguments;
  readonly position: number; readonly frame: number; readonly fs: NativeX86Word32;
  readonly argumentWords: readonly NativeX86Word32[]; readonly returnWord: NativeX86Word32;
  readonly argumentBytes: 4 | 8; phase: 'pending' | 'returned';
}
const standardSites: Readonly<Record<NativeStandardIoCallSite, Readonly<{ kind: NativeStandardIoCallKind; returnAddress: string; argumentBytes: 4 | 8; position: number }>>> = Object.freeze({
  '204744b4': Object.freeze({ kind: 'GetStdHandle', returnAddress: '204744ba', argumentBytes: 4, position: -0x7c }),
  '204744c6': Object.freeze({ kind: 'GetFileType', returnAddress: '204744cc', argumentBytes: 4, position: -0x7c }),
  '20467de8': Object.freeze({ kind: 'TlsGetValue', returnAddress: '20467dea', argumentBytes: 4, position: -0x48 }),
  '20467dff': Object.freeze({ kind: 'TlsGetValue', returnAddress: '20467e01', argumentBytes: 4, position: -0x4c }),
  '20467e01': Object.freeze({ kind: 'FlsGetValue', returnAddress: '20467e03', argumentBytes: 4, position: -0x48 }),
  '20467e3d': Object.freeze({ kind: 'DecodePointer', returnAddress: '20467e3f', argumentBytes: 4, position: -0x48 }),
  '20474246': Object.freeze({ kind: 'InitializeCriticalSectionAndSpinCount', returnAddress: '20474248', argumentBytes: 8, position: -0x40 }),
  '2047451e': Object.freeze({ kind: 'SetHandleCount', returnAddress: '20474524', argumentBytes: 4, position: -0x7c }),
});
const graphs = new WeakMap<NativeRuntimePlatform, NativeX86ThreadStack>();
const retirements = new WeakMap<NativeX86ThreadStack, () => void>();
const startupCalls = new WeakMap<NativeStartupInfoCallGrant, StartupCall>();
const heapCalls = new WeakMap<NativeHeapAllocCallGrant, HeapCall>();
const standardCalls = new WeakMap<NativeStandardIoCallGrant, StandardCall>();
const argvCalls = new WeakMap<NativeArgvNlsCallGrant, ArgvCall>();
const setEnvpCalls = new WeakMap<NativeSetEnvpCallGrant, SetEnvpCall>();
const argvSites: Readonly<Record<NativeArgvCallSite, readonly [NativeArgvImportKind, number, string, NativeX86Register?]>> = Object.freeze({
  '204767a6': ['GetModuleFileNameA', 3, '204767ac'],
  '2046bbdb': ['InterlockedDecrement', 1, '2046bbe1'], '2046bc00': ['InterlockedIncrement', 1, '2046bc02', 'EDI'],
  '2046bc92': ['InterlockedDecrement', 1, '2046bc98'], '2046bcb6': ['InterlockedIncrement', 1, '2046bcb8', 'EDI'],
  '2046b920': ['GetACP', 0, '2046b926'], '2046b9c1': ['IsValidCodePage', 1, '2046b9c7'],
  '2046b9d4': ['GetCPInfo', 2, '2046b9da'], '2046b6cc': ['GetCPInfo', 2, '2046b6d2'],
  '20467fb6': ['GetLastError', 0, '20467fbc'], '20467fc9': ['FlsGetValue', 1, '20467fcb', 'EAX'],
  '20468020': ['SetLastError', 1, '20468026'], '20467c1f': ['HeapAlloc', 3, '20467c21', 'EBX'],
  '2047f554': ['GetStringTypeW', 4, '2047f55a'], '2047f5cb': ['MultiByteToWideChar', 6, '2047f5cd', 'ESI'],
  '2047f635': ['MultiByteToWideChar', 6, '2047f637', 'ESI'], '2047f643': ['GetStringTypeW', 4, '2047f649'],
  '2046cef1': ['LCMapStringW', 6, '2046cef7'], '2046cf8f': ['MultiByteToWideChar', 6, '2046cf91', 'ESI'],
  '2046cffb': ['MultiByteToWideChar', 6, '2046cffd', 'ESI'], '2046d017': ['LCMapStringW', 6, '2046d019', 'ESI'],
  '2046d0b4': ['LCMapStringW', 6, '2046d0ba'], '2046d0d7': ['WideCharToMultiByte', 8, '2046d0dd'],
  '20467e74': ['TlsGetValue', 1, '20467e7a'], '204737d4': ['EnterCriticalSection', 1, '204737da'],
  '204736c9': ['LeaveCriticalSection', 1, '204736cf'],
});
const constructionToken = token;
function physical(bytes: number): NativeHeapObjectViews {
  const backing: NativeMemoryBacking = { identity: Object.freeze({}), bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes), freed: false };
  Object.defineProperties(backing, { identity: { writable: false, configurable: false }, bytes: { writable: false, configurable: false },
    knownMask: { writable: false, configurable: false }, freed: { writable: true, configurable: false } });
  const fields = new NativeHeapObjectViews(backing);
  Object.freeze(fields.view); Object.preventExtensions(fields.bytes); Object.preventExtensions(fields.knownMask); Object.freeze(fields);
  return fields;
}
function reason(error: unknown): string {
  try { return error instanceof Error ? error.message : String(error); } catch { return 'Virtual x86 state escaped without an owned reason'; }
}

export class NativeX86ThreadStack {
  readonly #platform: NativeRuntimePlatform;
  readonly #selection: Readonly<NativeX86ThreadStackSelection>;
  readonly #stack: NativeHeapObjectViews;
  // EFLAGS at 44 is owned only with an explicit virtual CPU selection.
  // Arithmetic flags at 36 and the Runtime DF remain synchronized with it.
  readonly #bank = physical(48);
  readonly #xmm = physical(128);
  #processorSimdFrame:{oldFs:NativeX86Word32;oldEbp:NativeX86Word32;oldEbx:NativeX86Word32;oldEsi:NativeX86Word32;oldEdi:NativeX86Word32;scope:NativeX86Word32;returned:boolean}|null=null;
  readonly #initializerSehFrames=new Map<string,{scope:NativeX86Word32;oldFs:NativeX86Word32;oldEbp:NativeX86Word32;oldEbx:NativeX86Word32;oldEsi:NativeX86Word32;oldEdi:NativeX86Word32;entered:boolean;returned:boolean}>();
  readonly #words = new WeakMap<NativeX86Word32, WordRecord>();
  readonly #slots = new Map<NativeHeapObjectViews, Map<number, Slot>>();
  readonly #images = new Map<string, NativeX86Word32>();
  readonly #imageReads = new Map<NativeHeapObjectViews, Map<number, Slot>>();
  readonly #storage = new WeakMap<NativeHeapObjectViews, PhysicalProof>();
  readonly #startupViews = new Map<number, NativeHeapObjectViews>();
  readonly #nativePointers = new WeakMap<object, NativeX86Word32>();
  readonly #objects = new WeakMap<object, NativeX86Word32>();
  readonly #sectionViews = new Map<NativeMemoryBacking, Map<number, NativeHeapObjectViews>>();
  readonly #standardIoRows: { site: NativeStandardIoCallSite; callPushed: boolean; called: boolean; returned: boolean; sectionRegistered: boolean }[] = [];
  #standardGrant: NativeStandardIoCallGrant | null = null;
  #initial: Readonly<{ esp: NativeX86Word32; ebp: NativeX86Word32; ebx: NativeX86Word32; esi: NativeX86Word32; edi: NativeX86Word32; fs: NativeX86Word32 }> | null = null;
  readonly #calls: { site: string; returnWord: NativeX86Word32; position: number; returned: boolean }[] = [];
  #startupGrant: NativeStartupInfoCallGrant | null = null;
  #startupInfoCallPushed = false;
  #startupInfoWriterCalled = false;
  #startupInfoWriterReturned = false;
  #heapGrant: NativeHeapAllocCallGrant | null = null;
  #heapAllocCallPushed = false;
  #heapAllocCalled = false;
  #heapAllocReturned = false;
  #heapAllocBlockAllocated = false;
  #binding: Binding | null = null;
  #argvBinding: ArgvBinding | null = null;
  #setEnvpBinding: SetEnvpBinding | null = null;
  #setEnvpTransferred = false;
  #setEnvpReturned = false;
  #setEnvpGrant: NativeSetEnvpCallGrant | null = null;
  readonly #setEnvpRows: { site: NativeSetEnvpCallSite; callerSite: string; callPushed: boolean; called: boolean; returned: boolean; allocated: boolean; released: boolean }[] = [];
  readonly #allocationRecords = new WeakMap<NativeMemoryBacking, Allocation>();
  #transferred = false;
  #argvGrant: NativeArgvNlsCallGrant | null = null;
  #argvReturned = false;
  readonly #argvRows: { site: NativeArgvCallSite; callPushed: boolean; called: boolean; returned: boolean }[] = [];
  readonly #moduleWords = new Map<string, NativeX86Word32>();
  readonly #modulePointers = new Map<string, NativeBytePointer>();
  #sharedFrame:{controller:object;ebp:number;probe:NativeHeapObjectViews;temporary:NativeHeapObjectViews|null;importCall:{call:NativeArgvNlsCallGrant;argumentBytes:number;kind:'probe'|'query'|'fill'|'types'}|null;requestedBytes:number|null;allocatedBytes:number|null;probedPages:number[]}|null=null;
  #mappingFrames:{controller:object;ebp:number;input:NativeHeapObjectViews|null;output:NativeHeapObjectViews|null;importCall:{call:NativeArgvNlsCallGrant;bytes:number;stage:string}|null;allocations:{site:string;requested:number;allocated:number;offset:number}[];returned:boolean}[]=[];
  #sharedEnvironmentFrame:{controller:object;entryEsp:number;operations:number;returned:boolean;result:number|null;strlenCalls:number;callocCalls:number;freeCalls:number;initializersPending:boolean}|null=null;
  #sharedInitializerFrame:{controller:object;entryEsp:number;operations:number;ownershipReturned:number|null;conversionInstalled:boolean;oldFs:NativeX86Word32;fsRestored:boolean;moduleCalls:number;procedureCalls:number;featureCalls:number;divisionQueryResult:number|null;initializerResult:number|null}|null=null;
  #sharedArgvFrame:{controller:object;ebp:number;multibytePending:boolean;moduleCall:NativeArgvNlsCallGrant|null;moduleReturned:boolean;argumentCount:NativeHeapObjectViews;byteCount:NativeHeapObjectViews;parsePending:boolean;parserStarted?:boolean;parserReturned?:boolean;parserOperations?:number;leadCalls?:number;queryCounts?:Readonly<{count:number;bytes:number}>;allocationPending?:boolean;mallocLowerPending?:boolean;allocationReturned?:boolean;fillPending?:boolean;fillStarted?:boolean;fillReturned?:boolean;fillCounts?:Readonly<{count:number;bytes:number}>;fillOperations?:number;fillLeadCalls?:number;returned?:boolean;result?:number;environmentPending?:boolean}|null=null;
  #setMultibyteFrame:{controller:object;ebp:number;oldFs:NativeX86Word32;pendingInstallation:boolean;returned:boolean;counterCursor:number;counter:{call:object;role:'oldPtd'|'candidatePtd'|'oldGlobal'|'candidateGlobal'}|null;global:boolean;lockPending:boolean;locked:boolean;publication:boolean;unlockPending:boolean;scopeAtReturn?:NativeX86Word32;cookieAtReturn?:NativeX86Word32}|null=null;
  #configurationFrame:{controller:object;ebp:number;info:NativeHeapObjectViews;candidate:NativeX86Word32;codePage:number|null;memsetPending:boolean;pending:{call:NativeArgvNlsCallGrant;bytes:number;info:boolean}|null;returned:boolean}|null=null;
  #caseFrame:{controller:object;ebp:number;originalEbp:number;info:NativeHeapObjectViews;input:NativeHeapObjectViews;types:NativeHeapObjectViews;lower:NativeHeapObjectViews;upper:NativeHeapObjectViews;cpCall:NativeArgvNlsCallGrant|null;deferredBytes:number;tableIndex:number;wrapper:{stage:'classification'|'lower'|'upper';ebp:number;locale:NativeHeapObjectViews;localeReturned:boolean}|null;returned:boolean}|null=null;
  #phase: 'cold' | 'running' | 'returned' | 'blocked' | 'retired' = 'cold';
  #boundary: string | null = null;
  #executing = false;
  #currentPc: NativeX86Word32 | null = null;
  readonly #trace: string[] = [];
  private constructor(platform: NativeRuntimePlatform, selection: Readonly<NativeX86ThreadStackSelection>, admitted: object) {
    if (admitted !== constructionToken || new.target !== NativeX86ThreadStack) throw new Error('Private actual x86 thread-stack construction required');
    this.#platform = platform; this.#selection = selection; this.#stack = physical(selection.reservationBytes);
    for (const fields of [this.#stack, this.#bank, this.#xmm]) this.#storage.set(fields, Object.freeze({
      backing: fields.backing as NativeMemoryBacking, identity: fields.backing.identity,
      rootBytes: fields.backing.bytes, rootMasks: fields.backing.knownMask, bytes: fields.bytes,
      masks: fields.knownMask, view: fields.view, length: fields.bytes.length,
    }));
    for (const name of registers) this.#store(this.#bank, registers.indexOf(name) * 4,
      name === 'ESP' ? this.#stackWord(selection.reservationBytes) : this.#mint(0, 0));
    this.#store(this.#bank, 32, this.#mint(0, 0));
    this.#store(this.#bank, 36, this.#mint(0, 0));
    this.#store(this.#bank, 40, this.#mint(0, 0));
    this.#store(this.#bank, 44, this.#mint(selection.cpu?.initialEflags ?? 0, selection.cpu ? 0xffffffff : 0));
    for(let offset=0;offset<128;offset+=4)this.#store(this.#xmm,offset,this.#mint(0,0));
    retirements.set(this, () => {
      this.#phase = 'retired'; this.#boundary ??= 'Actual logical-thread stack lifetime ended';
      this.#stack.backing.freed = true; this.#bank.backing.freed = true; this.#xmm.backing.freed = true;
    }); Object.freeze(this);
  }
  static forPlatform(platform: NativeRuntimePlatform): NativeValue<NativeX86ThreadStack> {
    const selected = NativeRuntimePlatform.threadStackSelectionForPlatform(platform); if (!selected.known) return selected;
    const retained = graphs.get(platform);
    if (retained) return retained.#selection === selected.value && retained.#phase !== 'blocked' && retained.#phase !== 'retired'
      ? known(retained) : unknown(retained.#boundary ?? 'Retained x86 graph cannot be replaced or restarted');
    try { const graph = new NativeX86ThreadStack(platform, selected.value, constructionToken); graphs.set(platform, graph); return known(graph); }
    catch (error) { return unknown(reason(error)); }
  }
  /** Direct translated SharedBase helper ABI on the actual cold logical-thread
   * graph. This does not establish the preceding DLL/CRT caller stack. */
  static beginSharedStringTypeFrame(platform:NativeRuntimePlatform,controller:object):NativeValue<{stack:NativeX86ThreadStack;probe:NativeHeapObjectViews}> {
    const input=NativeSharedCrtOwner.sharedStackArgumentsForPlatform(platform,controller);if(!input.known)return input;
    const found=NativeX86ThreadStack.forPlatform(platform);if(!found.known)return found;const stack=found.value;
    const nested=stack.#caseFrame?.wrapper?.stage==='classification'&&stack.#caseFrame.wrapper.localeReturned&&stack.#caseFrame.wrapper.locale===input.value.locale&&stack.#phase==='running';
    if(input.value.stage!=='enter'||stack.#phase!=='cold'&&!nested||stack.#binding||stack.#sharedFrame)return unknown('One cold or source-nested SharedBase helper frame required');
    try{
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);stack.#phase='running';
      const value=(n:number)=>stack.#mint(n,0xffffffff),pointer=(fields:NativeHeapObjectViews)=>fields.backing===stack.#stack.backing?stack.#stackWord(fields.bytes.byteOffset-stack.#stack.bytes.byteOffset):stack.#mint(0,0,{kind:'shared-local',fields});
      // Original seven-argument call at100c7068, in right-to-left push order.
      for(const word of [value(0),value(0),value(input.value.codePage),pointer(input.value.types),value(256),pointer(input.value.input),value(1)])stack.#push(word);
      stack.#store(stack.#bank,stack.#reg('ECX'),pointer(input.value.locale));
      stack.#call('100c7068','100c706d');stack.#push(stack.#load(stack.#bank,stack.#reg('EBP')));
      const ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('EBP'),stack.#stackWord(ebp));
      stack.#push(stack.#load(stack.#bank,stack.#reg('ECX')));stack.#push(stack.#load(stack.#bank,stack.#reg('ECX')));
      const cookie=value(input.value.cookie),frame=stack.#stackWord(ebp),a=stack.#record(cookie),b=stack.#record(frame);
      stack.#store(stack.#stack,ebp-4,stack.#mint(a.value^b.value,a.mask&b.mask,{kind:'xor',left:cookie,right:frame}));
      for(const name of ['EBX','ESI','EDI'] as const)stack.#push(stack.#load(stack.#bank,stack.#reg(name)));
      stack.#store(stack.#bank,stack.#reg('EBX'),value(0));stack.#store(stack.#bank,stack.#reg('EDI'),pointer(input.value.locale));
      const probe=new NativeHeapObjectViews(stack.#stack.backing,ebp-8,4);
      stack.#sharedFrame={controller,ebp,probe,temporary:null,importCall:null,requestedBytes:null,allocatedBytes:null,probedPages:[]};
      stack.#trace.push('SharedBase direct helper frame100c6e87');return known({stack,probe});
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static #sharedProof(stack:NativeX86ThreadStack,controller:object):void {
    const proof=NativeSharedCrtOwner.sharedStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)throw new Error(proof.reason);
    if(graphs.get(stack.#platform)!==stack||stack.#sharedFrame?.controller!==controller||stack.#phase!=='running'||stack.#binding)throw new Error('Actual active SharedBase helper graph required');
    const selected=NativeRuntimePlatform.threadStackSelectionForPlatform(stack.#platform);if(!selected.known||selected.value!==stack.#selection)throw new Error('Actual live selected SharedBase thread stack required');
    stack.#physical(stack.#stack);stack.#physical(stack.#bank);
  }
  static beginSharedStringTypeImport(stack:NativeX86ThreadStack,controller:object,call:NativeArgvNlsCallGrant):NativeValue<void> {
    try{
      NativeX86ThreadStack.#sharedProof(stack,controller);const admitted=NativeSharedCrtOwner.nlsArgumentsForPlatform(stack.#platform,call);if(!admitted.known)return admitted;
      const input=admitted.value,frame=stack.#sharedFrame!;if(frame.importCall)throw new Error('One pending SharedBase stack import required');
      const value=(n:number)=>stack.#mint(n,0xffffffff),pointer=(fields:NativeHeapObjectViews)=>fields.backing===stack.#stack.backing?stack.#stackWord(fields.bytes.byteOffset-stack.#stack.bytes.byteOffset):stack.#mint(0,0,{kind:'shared-local',fields});
      if(input.kind==='GetStringTypeW'){
        if(!input.input||!input.fields)throw new Error('Actual source classification arguments required');
        const probe=input.fields===frame.probe&&input.count===1;
        if(!probe&&(input.input!==frame.temporary||input.count!==256))throw new Error('Actual source classification wide temporary required');
        if(probe)stack.#store(stack.#bank,stack.#reg('ESI'),value(1));
        const source=probe?pointer(input.input):stack.#load(stack.#bank,stack.#reg('EBX'));
        if(!probe&&stack.#address(source)!==input.input.bytes.byteOffset-stack.#stack.bytes.byteOffset)throw new Error('Actual EBX conversion buffer required');
        for(const word of [probe?stack.#stackWord(frame.ebp-8):pointer(input.fields),value(input.count),source,value(1)])stack.#push(word);
        stack.#call(probe?'100c6eb4':'100c6fa3',probe?'100c6eba':'100c6fa9');frame.importCall={call,argumentBytes:16,kind:probe?'probe':'types'};
      }else if(input.kind==='MultiByteToWideChar'){
        if(input.count!==256||input.flags!==1||!input.input||!input.procedure)throw new Error('Actual source classification conversion query required');
        stack.#store(stack.#bank,stack.#reg('ESI'),stack.#objectWord(input.procedure));
        const fill=input.fields!==null;
        if(fill&&input.fields!==frame.temporary)throw new Error('Actual source stack conversion destination required');
        const destination=fill?stack.#load(stack.#bank,stack.#reg('EBX')):value(0);
        if(fill&&stack.#address(destination)!==input.fields!.bytes.byteOffset-stack.#stack.bytes.byteOffset)throw new Error('Actual EBX conversion destination required');
        for(const word of [value(fill?256:0),destination,value(256),pointer(input.input),value(1),value(input.scalar)])stack.#push(word);
        stack.#call(fill?'100c6f95':'100c6f2b',fill?'100c6f97':'100c6f2d');frame.importCall={call,argumentBytes:24,kind:fill?'fill':'query'};
      }else throw new Error('Original SharedBase classification import site required');
      return known(undefined);
    }catch(error){return unknown(reason(error));}
  }
  static finishSharedStringTypeImport(stack:NativeX86ThreadStack,controller:object,call:NativeArgvNlsCallGrant,value:number):NativeValue<void> {
    try{
      NativeX86ThreadStack.#sharedProof(stack,controller);const normal=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform(stack.#platform,call);if(!normal.known)return normal;
      if(normal.value.kind!=='scalar'||normal.value.value!==value||stack.#sharedFrame!.importCall?.call!==call)throw new Error('Actual normal SharedBase stack import return required');
      const pending=stack.#sharedFrame!.importCall!;
      if(pending.kind==='probe')stack.#invalidateRange(stack.#stack,stack.#sharedFrame!.ebp-8,4);
      if(pending.kind==='fill'){const fields=stack.#sharedFrame!.temporary!;stack.#invalidateRange(stack.#stack,fields.bytes.byteOffset-stack.#stack.bytes.byteOffset,512);}
      stack.#ret(pending.argumentBytes);stack.#sharedFrame!.importCall=null;
      stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(value,0xffffffff));
      for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);
      if(pending.kind==='query')stack.#store(stack.#bank,stack.#reg('EDI'),stack.#mint(value,0xffffffff));
      if(pending.kind==='fill')stack.#logicalFlags(value,0xffffffff,4);
      if(pending.kind==='types')stack.#store(stack.#stack,stack.#sharedFrame!.ebp-8,stack.#mint(value,0xffffffff));
      return known(undefined);
    }catch(error){return unknown(reason(error));}
  }
  static clearSharedStringTypeProbe(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#sharedProof(stack,controller);if(stack.#sharedFrame!.importCall)throw new Error('Probe clear requires completed import');stack.#store(stack.#stack,stack.#sharedFrame!.ebp-8,stack.#mint(0,0xffffffff));return known(undefined);}catch(error){return unknown(reason(error));}
  }
  static allocateSharedStringTypeTemporary(stack:NativeX86ThreadStack,controller:object):NativeValue<NativeHeapObjectViews>{
    try{NativeX86ThreadStack.#sharedProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const admitted=NativeSharedCrtOwner.sharedStackArgumentsForPlatform(stack.#platform,controller);if(!admitted.known)return admitted;
      const frame=stack.#sharedFrame!,count=admitted.value.count;
      if(admitted.value.stage!=='allocate'||frame.importCall||frame.temporary||count!==256)throw new Error('Actual fresh source-sized SharedBase temporary allocation required');
      const bytes=count*2+8,caller=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));frame.requestedBytes=bytes;
      stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(bytes,0xffffffff));stack.#call('100c6f4c','100c6f51');
      //100ce300 saves ECX, derives caller ESP via LEA ESP+8, then aligns.
      stack.#push(stack.#load(stack.#bank,stack.#reg('ECX')));
      if(stack.#selection.pageAlignment!=='virtual-page-4096')throw new Error('Actual preselected stack low-bit geometry required for alloca16');
      const padding=(caller-bytes)&15,allocated=bytes+padding;frame.allocatedBytes=allocated;
      const popEcx=()=>{const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ECX'),stack.#load(stack.#stack,at));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));};
      popEcx();const entry=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));
      //Tail jump100ce311 ->100a8430; target includes the relocated return word.
      stack.#push(stack.#load(stack.#bank,stack.#reg('ECX')));const target=entry-allocated;
      if(target<0)throw new Error('Unowned SharedBase stack reservation/page fault');
      stack.#store(stack.#bank,stack.#reg('ECX'),stack.#stackWord(target));
      let page=Math.floor((entry-4)/4096)*4096;
      while(target<page){page-=4096;if(page<0)throw new Error('Unowned SharedBase stack page probe');NativeHeapObjectViews.prototype.maskedWord.call(stack.#stack,page);frame.probedPages.push(page);stack.#trace.push('100a8457.TEST page '+page);}
      popEcx();const returned=stack.#load(stack.#stack,entry);stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(target));stack.#store(stack.#stack,target,returned);stack.#ret();
      const start=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));if(start%16!==0||start+bytes>caller)throw new Error('Actual aligned source alloca16 return required');
      stack.#store(stack.#bank,stack.#reg('EAX'),stack.#stackWord(start));stack.#store(stack.#stack,start,stack.#mint(0xcccc,0xffffffff));
      const data=stack.#stackWord(start+8);stack.#store(stack.#bank,stack.#reg('EAX'),data);stack.#store(stack.#bank,stack.#reg('EBX'),data);const bits=stack.#record(data);stack.#logicalFlags(bits.value,bits.mask,4);
      frame.temporary=new NativeHeapObjectViews(stack.#stack.backing,start+8,count*2);stack.#trace.push('100ce300.alloca16.return ->100c6f51');stack.#trace.push('100c6f57.stackHeadercccc');
      return known(frame.temporary);
    }catch(error){stack.#boundary??=reason(error);stack.#phase='blocked';return unknown(stack.#boundary);}
  }
  static clearSharedStringTypeTemporary(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#sharedProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{
      const frame=stack.#sharedFrame!,fields=frame.temporary;
      if(!fields||frame.importCall||fields.bytes.length!==512)throw new Error('Actual allocated SharedBase wide temporary required');
      const start=fields.bytes.byteOffset-stack.#stack.bytes.byteOffset;
      if(start%4!==0||fields.backing!==stack.#stack.backing)throw new Error('Actual DWORD-aligned SharedBase stack destination required');
      const pointer=stack.#stackWord(start),value=(n:number)=>stack.#mint(n,0xffffffff);
      for(const word of [value(512),value(0),pointer])stack.#push(word);
      stack.#call('100c6f80','100c6f85');
      stack.#store(stack.#bank,stack.#reg('EDX'),value(512));stack.#store(stack.#bank,stack.#reg('ECX'),pointer);stack.#store(stack.#bank,stack.#reg('EAX'),value(0));
      const sse=NativeSharedCrtOwner.sharedMemsetSelectionForPlatform(stack.#platform,controller);if(!sse.known)throw new Error(sse.reason);
      if(sse.value!==0)throw new Error('Unowned SharedBase SSE wide memset');
      stack.#push(stack.#load(stack.#bank,stack.#reg('EDI')));
      stack.#store(stack.#bank,stack.#reg('EDI'),pointer);
      const df=NativeRuntimePlatform.readNativeDirectionFlag(stack.#platform);if(!df.known)throw new Error(df.reason);if(df.value!==0)throw new Error('Unowned SharedBase reverse wide memset');
      stack.#store(stack.#bank,stack.#reg('ECX'),value(128));stack.#store(stack.#bank,stack.#reg('EDX'),value(0));
      for(let offset=0;offset<512;offset+=4){stack.#store(stack.#stack,start+offset,value(0));stack.#trace.push('100a79df.REP_STOSD');}
      stack.#store(stack.#bank,stack.#reg('ECX'),value(0));stack.#store(stack.#bank,stack.#reg('EDI'),stack.#stackWord(start+512));stack.#logicalFlags(0,0xffffffff,4);
      stack.#store(stack.#bank,stack.#reg('EAX'),pointer);
      const saved=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('EDI'),stack.#load(stack.#stack,saved));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(saved+4));
      stack.#ret();const caller=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(caller+12));stack.#flags(0,1);
      stack.#trace.push('100c6f85.memset.cdeclCleanup');return known(undefined);
    }catch(error){stack.#boundary??=reason(error);stack.#phase='blocked';return unknown(stack.#boundary);}
  }
  static returnSharedStringTypeFrame(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    try{NativeX86ThreadStack.#sharedProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{
      const frame=stack.#sharedFrame!,fields=frame.temporary;if(!fields||frame.importCall)throw new Error('Actual completed SharedBase classification required');
      const start=fields.bytes.byteOffset-stack.#stack.bytes.byteOffset;
      stack.#push(stack.#load(stack.#bank,stack.#reg('EBX')));stack.#call('100c6fad','100c6fb2');
      const header=stack.#stackWord(start-8);stack.#store(stack.#bank,stack.#reg('EAX'),header);
      if(stack.#numeric(stack.#load(stack.#stack,start-8),4)!==0xcccc)throw new Error('Unowned SharedBase temporary heap cleanup');
      // Original __freea leaves a stack allocation in place; only dddd calls free.
      stack.#ret();stack.#trace.push('100b4d0f.stackMarker.noHeapFree');
      const result=stack.#load(stack.#stack,frame.ebp-8);stack.#store(stack.#bank,stack.#reg('EAX'),result);
      const pop=(name:'ECX'|'EDI'|'ESI'|'EBX'|'EBP')=>{const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg(name),stack.#load(stack.#stack,at));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));};
      pop('ECX');stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(frame.ebp-20));for(const name of ['EDI','ESI','EBX'] as const)pop(name);
      const encoded=stack.#record(stack.#load(stack.#stack,frame.ebp-4)),relation=encoded.provenance;
      if(relation?.kind!=='xor'||stack.#record(relation.right).provenance?.kind!=='stack'||stack.#address(relation.right)!==frame.ebp||stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')))!==frame.ebp)throw new Error('Actual intact cookie/EBP relationship required');
      stack.#store(stack.#bank,stack.#reg('ECX'),relation.left);stack.#call('100c7038','100c703d');
      const admitted=NativeSharedCrtOwner.sharedStackArgumentsForPlatform(stack.#platform,controller);if(!admitted.known)throw new Error(admitted.reason);
      const cookie=stack.#numeric(relation.left,4);if(cookie!==admitted.value.cookie)throw new Error('Unowned SharedBase security-cookie failure report at 100c13b8');
      stack.#arithmeticFlags(cookie,cookie,0,4,true);stack.#ret();
      stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(frame.ebp));pop('EBP');stack.#ret();
      const caller=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(caller+28));stack.#flags(0,1);
      stack.#phase='returned';stack.#trace.push('100c706d.classification.return');return known(stack.#numeric(result,4));
    }catch(error){stack.#boundary??=reason(error);stack.#phase='blocked';return unknown(stack.#boundary);}
  }
  static #mappingProof(stack:NativeX86ThreadStack,controller:object){
    const admitted=NativeSharedCrtOwner.mappingStackArgumentsForPlatform(stack.#platform,controller);if(!admitted.known)throw new Error(admitted.reason);
    const frame=stack.#mappingFrames.at(-1);if(graphs.get(stack.#platform)!==stack||frame?.controller!==controller||frame.returned||stack.#phase!=='running'||stack.#binding)throw new Error('Actual active SharedBase mapping graph required');
    const selected=NativeRuntimePlatform.threadStackSelectionForPlatform(stack.#platform);if(!selected.known||selected.value!==stack.#selection)throw new Error('Actual live mapping stack required');stack.#physical(stack.#stack);stack.#physical(stack.#bank);return {input:admitted.value,frame};
  }
  static beginSharedMappingFrame(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    const admitted=NativeSharedCrtOwner.mappingStackArgumentsForPlatform(stack.#platform,controller);if(!admitted.known)return admitted;
    const nested=stack.#caseFrame?.wrapper&&stack.#caseFrame.wrapper.stage!=='classification'&&stack.#caseFrame.wrapper.localeReturned&&stack.#caseFrame.wrapper.locale===admitted.value.locale&&stack.#phase==='running';
    if(graphs.get(stack.#platform)!==stack||stack.#phase!=='returned'&&!nested||stack.#binding||admitted.value.stage!=='enter'||stack.#mappingFrames.at(-1)?.returned===false)return unknown('Actual returned or source-nested graph required for mapping');
    try{
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);const input=admitted.value,value=(n:number)=>stack.#mint(n,0xffffffff),pointer=(fields:NativeHeapObjectViews)=>fields.backing===stack.#stack.backing?stack.#stackWord(fields.bytes.byteOffset-stack.#stack.bytes.byteOffset):stack.#mint(0,0,{kind:'shared-local',fields});
      for(const word of [value(0),value(input.codePage),value(256),pointer(input.output),value(256),pointer(input.input),value(input.flags),value(input.localeId)])stack.#push(word);
      stack.#store(stack.#bank,stack.#reg('ECX'),pointer(input.locale));stack.#call('100b5112','100b5117');stack.#push(stack.#load(stack.#bank,stack.#reg('EBP')));
      const ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('EBP'),stack.#stackWord(ebp));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(ebp-20));
      const cookie=value(input.cookie),frameWord=stack.#stackWord(ebp),a=stack.#record(cookie),b=stack.#record(frameWord);stack.#store(stack.#stack,ebp-4,stack.#mint(a.value^b.value,a.mask&b.mask,{kind:'xor',left:cookie,right:frameWord}));
      for(const name of ['EBX','ESI','EDI'] as const)stack.#push(stack.#load(stack.#bank,stack.#reg(name)));
      stack.#store(stack.#bank,stack.#reg('EBX'),value(0));stack.#store(stack.#bank,stack.#reg('ESI'),pointer(input.locale));
      stack.#mappingFrames.push({controller,ebp,input:null,output:null,importCall:null,allocations:[],returned:false});stack.#phase='running';stack.#trace.push('100b4d44.mappingFrame');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static beginSharedMappingImport(stack:NativeX86ThreadStack,controller:object,call:NativeArgvNlsCallGrant):NativeValue<void>{
    try{
      const {input:state,frame}=NativeX86ThreadStack.#mappingProof(stack,controller),admitted=NativeSharedCrtOwner.nlsArgumentsForPlatform(stack.#platform,call);if(!admitted.known)return admitted;if(frame.importCall)throw new Error('One pending mapping import required');
      const input=admitted.value,value=(n:number)=>stack.#mint(n,0xffffffff),pointer=(fields:NativeHeapObjectViews)=>fields.backing===stack.#stack.backing?stack.#stackWord(fields.bytes.byteOffset-stack.#stack.bytes.byteOffset):stack.#mint(0,0,{kind:'shared-local',fields});
      let site:string,returned:string,words:NativeX86Word32[];
      if(state.stage==='probe'){site='100b4d74';returned='100b4d7a';stack.#store(stack.#bank,stack.#reg('EDI'),value(1));words=[value(0),value(0),value(1),pointer(input.input!),value(0x100),value(0)];}
      else if(state.stage==='convertQuery'||state.stage==='convertFill'){
        const fill=state.stage==='convertFill';site=fill?'100b4e7e':'100b4e12';returned=fill?'100b4e80':'100b4e14';if(!input.procedure)throw new Error('Actual mapping conversion procedure required');stack.#store(stack.#bank,stack.#reg('ESI'),stack.#objectWord(input.procedure));
        words=[value(fill?256:0),fill?pointer(input.fields!):value(0),value(256),pointer(input.input!),value(1),value(input.scalar)];
      }else if(state.stage==='mapQuery'||state.stage==='mapFill'){
        const fill=state.stage==='mapFill';site=fill?'100b4f37':'100b4e9a';returned=fill?'100b4f3d':'100b4e9c';if(!input.procedure)throw new Error('Actual mapping procedure required');if(!fill)stack.#store(stack.#bank,stack.#reg('ESI'),stack.#objectWord(input.procedure));
        words=[value(fill?256:0),fill?pointer(input.fields!):value(0),value(256),pointer(input.input!),value(input.flags),value(input.scalar)];
      }else if(state.stage==='narrow'){site='100b4f5a';returned='100b4f60';words=[value(0),value(0),value(256),pointer(input.fields!),value(256),pointer(input.input!),value(0),value(input.scalar)];}
      else throw new Error('Original mapping import site required');
      for(const word of words)stack.#push(word);stack.#call(site,returned);frame.importCall={call,bytes:words.length*4,stage:state.stage};return known(undefined);
    }catch(error){return unknown(reason(error));}
  }
  static finishSharedMappingImport(stack:NativeX86ThreadStack,controller:object,call:NativeArgvNlsCallGrant,result:number):NativeValue<void>{
    try{
      const {frame}=NativeX86ThreadStack.#mappingProof(stack,controller),pending=frame.importCall,normal=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform(stack.#platform,call);
      if(!normal.known)return normal;if(!pending||pending.call!==call||normal.value.kind!=='scalar'||normal.value.value!==result)throw new Error('Actual mapping normal return required');
      const changed=pending.stage==='convertFill'?frame.input:pending.stage==='mapFill'?frame.output:null;if(changed)stack.#invalidateRange(stack.#stack,changed.bytes.byteOffset-stack.#stack.bytes.byteOffset,changed.bytes.length);
      stack.#ret(pending.bytes);frame.importCall=null;const value=stack.#mint(result,0xffffffff);stack.#store(stack.#bank,stack.#reg('EAX'),value);for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);
      if(pending.stage==='convertQuery')stack.#store(stack.#bank,stack.#reg('EDI'),value);
      if(pending.stage==='mapQuery'){stack.#store(stack.#bank,stack.#reg('ECX'),value);stack.#store(stack.#stack,frame.ebp-8,value);}
      if(pending.stage==='narrow')stack.#store(stack.#stack,frame.ebp-8,value);
      return known(undefined);
    }catch(error){return unknown(reason(error));}
  }
  static allocateSharedMappingTemporary(stack:NativeX86ThreadStack,controller:object):NativeValue<NativeHeapObjectViews>{
    try{NativeX86ThreadStack.#mappingProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{
      const {input,frame}=NativeX86ThreadStack.#mappingProof(stack,controller),first=input.stage==='inputAllocate';if(!first&&input.stage!=='outputAllocate'||frame.importCall||input.count!==256||(first?frame.input!==null:frame.output!==null))throw new Error('Actual fresh mapping allocation stage required');
      const site=first?'100b4e37':'100b4ef5',returned=first?'100b4e3c':'100b4efa',requested=520,caller=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));
      stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(requested,0xffffffff));stack.#call(site,returned);stack.#push(stack.#load(stack.#bank,stack.#reg('ECX')));if(stack.#selection.pageAlignment!=='virtual-page-4096')throw new Error('Actual selected mapping stack alignment required');
      const allocated=requested+((caller-requested)&15),popEcx=()=>{const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ECX'),stack.#load(stack.#stack,at));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));};
      popEcx();const entry=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#push(stack.#load(stack.#bank,stack.#reg('ECX')));const target=entry-allocated;if(target<0)throw new Error('Unowned mapping stack reservation/page fault');stack.#store(stack.#bank,stack.#reg('ECX'),stack.#stackWord(target));
      let page=Math.floor((entry-4)/4096)*4096;while(target<page){page-=4096;if(page<0)throw new Error('Unowned mapping page probe');NativeHeapObjectViews.prototype.maskedWord.call(stack.#stack,page);stack.#trace.push('100a8457.mappingPage.'+page);}
      popEcx();const returnWord=stack.#load(stack.#stack,entry);stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(target));stack.#store(stack.#stack,target,returnWord);stack.#ret();const start=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));if(start%16!==0||start+requested>caller)throw new Error('Actual aligned mapping allocation required');
      stack.#store(stack.#stack,start,stack.#mint(0xcccc,0xffffffff));const fields=new NativeHeapObjectViews(stack.#stack.backing,start+8,512);frame.allocations.push({site,requested,allocated,offset:start+8});
      const pointer=stack.#stackWord(start+8);if(first){frame.input=fields;stack.#store(stack.#bank,stack.#reg('EAX'),pointer);stack.#store(stack.#stack,frame.ebp-12,pointer);}else{frame.output=fields;stack.#store(stack.#bank,stack.#reg('ESI'),pointer);}stack.#flags(0,1);return known(fields);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static returnSharedMappingFrame(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    try{NativeX86ThreadStack.#mappingProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{
      const {input,frame}=NativeX86ThreadStack.#mappingProof(stack,controller);if(input.stage!=='return'||!frame.input||!frame.output||frame.importCall)throw new Error('Actual completed mapping return required');
      const pop=(name:'ECX'|'EDI'|'ESI'|'EBX'|'EBP')=>{const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg(name),stack.#load(stack.#stack,at));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));};
      for(const [fields,site,returned] of [[frame.output,'100b4f64','100b4f69'],[frame.input,'100b4f6d','100b4f72']] as const){const start=fields.bytes.byteOffset-stack.#stack.bytes.byteOffset;stack.#push(stack.#stackWord(start));stack.#call(site,returned);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#stackWord(start-8));if(stack.#numeric(stack.#load(stack.#stack,start-8),4)!==0xcccc)throw new Error('Unowned mapping heap cleanup');stack.#ret();if(site==='100b4f6d')stack.#store(stack.#bank,stack.#reg('EAX'),stack.#load(stack.#stack,frame.ebp-8));pop('ECX');stack.#trace.push('100b4d0f.mappingStack.noHeapFree');}
      const result=stack.#load(stack.#bank,stack.#reg('EAX'));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(frame.ebp-32));for(const name of ['EDI','ESI','EBX'] as const)pop(name);
      const cookie=stack.#record(stack.#load(stack.#stack,frame.ebp-4)).provenance;if(cookie?.kind!=='xor'||stack.#address(cookie.right)!==frame.ebp||stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')))!==frame.ebp)throw new Error('Actual mapping cookie relation required');stack.#store(stack.#bank,stack.#reg('ECX'),cookie.left);stack.#call('100b50df','100b50e4');const value=stack.#numeric(cookie.left,4);if(value!==input.cookie)throw new Error('Unowned mapping security-cookie failure report');stack.#arithmeticFlags(value,value,0,4,true);stack.#ret();
      stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(frame.ebp));pop('EBP');stack.#ret();const caller=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(caller+32));stack.#flags(0,1);frame.returned=true;stack.#phase='returned';stack.#trace.push('100b5117.mappingReturn');return known(stack.#numeric(result,4));
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static #sharedArgvProof(stack:NativeX86ThreadStack,controller:object){
    const admitted=NativeSharedCrtOwner.argvStackArgumentsForPlatform(stack.#platform,controller);if(!admitted.known)throw new Error(admitted.reason);if(graphs.get(stack.#platform)!==stack||stack.#sharedArgvFrame?.controller!==controller||stack.#binding||!['running','returned'].includes(stack.#phase))throw new Error('Actual SharedBase setargv frame required');const selected=NativeRuntimePlatform.threadStackSelectionForPlatform(stack.#platform);if(!selected.known||selected.value!==stack.#selection)throw new Error('Actual live setargv stack required');stack.#physical(stack.#stack);stack.#physical(stack.#bank);return {input:admitted.value,frame:stack.#sharedArgvFrame};
  }
  static beginSharedArgvFrame(platform:NativeRuntimePlatform,controller:object):NativeValue<NativeX86ThreadStack>{
    const admitted=NativeSharedCrtOwner.argvStackArgumentsForPlatform(platform,controller);if(!admitted.known)return admitted;const found=NativeX86ThreadStack.forPlatform(platform);if(!found.known)return found;const stack=found.value;if(admitted.value.stage!=='enter'||stack.#phase!=='cold'||stack.#binding||stack.#sharedArgvFrame)return unknown('Actual cold setargv entry required');
    try{stack.#physical(stack.#stack);stack.#physical(stack.#bank);stack.#phase='running';stack.#call('100adb46','100adb4b');stack.#push(stack.#load(stack.#bank,stack.#reg('EBP')));const ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('EBP'),stack.#stackWord(ebp));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(ebp-12));stack.#push(stack.#load(stack.#bank,stack.#reg('EBX')));stack.#store(stack.#bank,stack.#reg('EBX'),stack.#mint(0,0xffffffff));stack.#arithmeticFlags(admitted.value.initialized,0,admitted.value.initialized,4,true);for(const name of ['ESI','EDI'] as const)stack.#push(stack.#load(stack.#bank,stack.#reg(name)));const pending=admitted.value.initialized===0;stack.#sharedArgvFrame={controller,ebp,multibytePending:pending,moduleCall:null,moduleReturned:false,argumentCount:new NativeHeapObjectViews(stack.#stack.backing,ebp-8,4),byteCount:new NativeHeapObjectViews(stack.#stack.backing,ebp-12,4),parsePending:false};if(pending)stack.#call('100c0bba','100c0bbf');stack.#trace.push('100c0ba7.setargvFrame');return known(stack);}catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedArgvMultibyte(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#sharedArgvProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#sharedArgvProof(stack,controller);if(input.stage!=='module'||input.initialized!==1||frame.moduleCall||frame.moduleReturned)throw new Error('Actual setargv multibyte initialization required');if(frame.multibytePending){if(!stack.#setMultibyteFrame?.returned||stack.#phase!=='returned')throw new Error('Actual returned multibyte child required');stack.#ret();frame.multibytePending=false;}if(stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')))!==frame.ebp||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.ebp-24)throw new Error('Actual restored setargv parent required');stack.#phase='running';return known(undefined);}catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static beginSharedArgvModuleName(stack:NativeX86ThreadStack,controller:object,call:NativeArgvNlsCallGrant):NativeValue<void>{
    try{const {input,frame}=NativeX86ThreadStack.#sharedArgvProof(stack,controller),nls=NativeSharedCrtOwner.nlsArgumentsForPlatform(stack.#platform,call);if(!nls.known)return nls;if(input.stage!=='module'||frame.multibytePending||frame.moduleCall||frame.moduleReturned||nls.value.kind!=='GetModuleFileNameA'||nls.value.fields!==input.module)throw new Error('Actual source setargv filename import required');stack.#push(stack.#mint(260,0xffffffff));const module=stack.#mint(0,0,{kind:'shared-local',fields:input.module});stack.#store(stack.#bank,stack.#reg('ESI'),module);stack.#push(module);stack.#push(stack.#load(stack.#bank,stack.#reg('EBX')));stack.#call('100c0bd1','100c0bd7');frame.moduleCall=call;return known(undefined);}catch(error){return unknown(reason(error));}
  }
  static finishSharedArgvModuleName(stack:NativeX86ThreadStack,controller:object,call:NativeArgvNlsCallGrant,result:number):NativeValue<void>{
    try{const {frame}=NativeX86ThreadStack.#sharedArgvProof(stack,controller),normal=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform(stack.#platform,call);if(!normal.known)return normal;if(frame.moduleCall!==call||normal.value.kind!=='scalar'||normal.value.value!==result)throw new Error('Actual SharedBase filename normal return required');stack.#ret(12);frame.moduleCall=null;frame.moduleReturned=true;stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(result,0xffffffff));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);return known(undefined);}catch(error){return unknown(reason(error));}
  }
  static beginSharedArgvParseQuery(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#sharedArgvProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#sharedArgvProof(stack,controller);if(input.stage!=='parse'||!input.input||!frame.moduleReturned||frame.parsePending||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.ebp-24)throw new Error('Actual source setargv parse input required');const pointer=input.input.fields===input.module?stack.#mint(0,0,{kind:'shared-local',fields:input.module}):stack.#mint(0,0,{kind:'process',pointer:input.input});stack.#store(stack.#stack,frame.ebp-4,pointer);stack.#store(stack.#bank,stack.#reg('EDX'),pointer);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#stackWord(frame.ebp-8));stack.#push(stack.#stackWord(frame.ebp-8));stack.#push(stack.#mint(0,0xffffffff));stack.#push(stack.#mint(0,0xffffffff));stack.#store(stack.#bank,stack.#reg('EDI'),stack.#stackWord(frame.ebp-12));stack.#call('100c0bfc','100c0c01');frame.parsePending=true;stack.#trace.push('100c0bfc.setargvParseQuery');return known(undefined);}catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static runSharedArgvParseQuery(stack:NativeX86ThreadStack,controller:object,initializeLocale:(fields:NativeHeapObjectViews)=>void):NativeValue<void>{return NativeX86ThreadStack.#runSharedCrtInstructions(stack,controller,initializeLocale,'query');}
  static runSharedArgvParseFill(stack:NativeX86ThreadStack,controller:object,initializeLocale:(fields:NativeHeapObjectViews)=>void):NativeValue<void>{return NativeX86ThreadStack.#runSharedCrtInstructions(stack,controller,initializeLocale,'fill');}
  static #runSharedCrtInstructions(stack:NativeX86ThreadStack,controller:object,initializeLocale:(fields:NativeHeapObjectViews)=>void,pass:'query'|'fill'|'environment',environmentHooks?:Readonly<{calloc:(site:string,count:number,size:number)=>NativeHeapObjectViews|null;free:(pointer:NativeBytePointer)=>void}>):NativeValue<void>{
    try{NativeX86ThreadStack.#sharedArgvProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{
      const {input,frame}=NativeX86ThreadStack.#sharedArgvProof(stack,controller);
      const query=pass==='query',environment=pass==='environment';
      if(environment){
        if(input.stage!=='environment'||!frame.environmentPending||stack.#sharedEnvironmentFrame||!environmentHooks)throw new Error('Actual pending SharedBase setenvp required');
        stack.#sharedEnvironmentFrame={controller,entryEsp:stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),operations:0,returned:false,result:null,strlenCalls:0,callocCalls:0,freeCalls:0,initializersPending:false};
      }else{
        if(!input.input||(query?(input.stage!=='parse'||!frame.parsePending||frame.parserStarted):(input.stage!=='fill'||!frame.fillPending||frame.fillStarted||!input.allocation)))throw new Error('Actual pending SharedBase parser '+pass+' required');
        if(query){frame.parserStarted=true;frame.parserOperations=0;frame.leadCalls=0;}else{frame.fillStarted=true;frame.fillOperations=0;frame.fillLeadCalls=0;}
      }
      const entryEsp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));
      if(query&&(stack.#numeric(stack.#load(stack.#stack,entryEsp+4),4)!==0||stack.#numeric(stack.#load(stack.#stack,entryEsp+8),4)!==0))throw new Error('Actual NULL-vector counting pass required');
      type Operand={kind:'register';name:NativeX86Register;byte:boolean}|{kind:'immediate';value:number}|{kind:'memory';expression:string;width:Width};
      const lanes:Readonly<Record<string,NativeX86Register>>={AL:'EAX',BL:'EBX',CL:'ECX',DL:'EDX'};
      const number=(text:string)=>{if(!/^-?0x[0-9a-f]+$/.test(text))throw new Error('Unowned SharedBase parser literal '+text);return (text.startsWith('-')?-parseInt(text.slice(3),16):parseInt(text.slice(2),16))>>>0;};
      const operand=(text:string):Operand=>{
        if(registers.includes(text as NativeX86Register))return {kind:'register',name:text as NativeX86Register,byte:false};
        if(lanes[text])return {kind:'register',name:lanes[text]!,byte:true};
        if(/^-?0x[0-9a-f]+$/.test(text))return {kind:'immediate',value:number(text)};
        const match=/^(?:(byte|word|dword) ptr )?\[(.+)\]$/.exec(text);if(!match)throw new Error('Unowned SharedBase parser operand '+text);
        return {kind:'memory',expression:match[2]!,width:match[1]==='byte'?1:match[1]==='word'?2:4};
      };
      const width=(item:Operand):Width=>item.kind==='register'&&item.byte?1:item.kind==='memory'?item.width:4;
      const address=(expression:string):NativeX86Word32=>{
        if(environment){const image=({'102f8588':input.mbInitialized,'102f6490':input.envPointer,'102f644c':input.envVector,'102f8570':input.envInitialized} as Readonly<Record<string,NativeHeapObjectViews>>)[expression.replace(/^0x/,'')];if(image)return stack.#mint(0,0,{kind:'shared-local',fields:image});}

        let base:NativeX86Word32|null=null,offset=0;
        for(const term of expression.split(' + ')){
          const match=/^(E(?:AX|BX|CX|DX|SI|DI|BP|SP))(?:\*0x([1248]))?$/.exec(term);
          if(match){const word=stack.#load(stack.#bank,stack.#reg(match[1] as NativeX86Register)),scale=match[2]?parseInt(match[2],16):1;
            if(stack.#record(word).provenance){if(base||scale!==1)throw new Error('Actual single parser pointer base required');base=word;}
            else offset+=(stack.#numeric(word,4)|0)*scale;
          }else offset+=number(term)|0;
        }
        return base?stack.#offsetWord(base,offset):stack.#mint(offset,0xffffffff);
      };
      const read=(item:Operand):NativeX86Word32=>{
        if(item.kind==='immediate')return stack.#mint(item.value,0xffffffff);
        if(item.kind==='register'){const word=stack.#load(stack.#bank,stack.#reg(item.name));if(!item.byte)return word;const value=stack.#record(word);return stack.#mint(value.value&255,value.mask&255);}
        const memory=stack.#memory(address(item.expression),item.width);
        if(item.width===4){
          // LocaleUpdate publishes actual typed aliases, never numerical DLL addresses.
          try{const pointer=NativeHeapObjectViews.prototype.pointer.call(memory.fields,memory.offset).get();if(pointer instanceof NativeHeapObjectViews){stack.#sharedLocalPhysical(pointer);return stack.#mint(0,0,{kind:'shared-local',fields:pointer});}if(pointer&&'fields' in pointer&&pointer.fields instanceof NativeHeapObjectViews&&'offset' in pointer&&typeof pointer.offset==='number'){stack.#sharedLocalPhysical(pointer.fields);return stack.#offsetWord(stack.#mint(0,0,{kind:'shared-local',fields:pointer.fields}),pointer.offset);}}
          catch(error){const message=reason(error);if(message!=='Non-NULL numerical native pointer has no owned browser capability'&&!message.startsWith('Native field contains unowned backing bits'))throw error;}
          return stack.#load(memory.fields,memory.offset);
        }
        const value=NativeHeapObjectViews.prototype.maskedWord.call(memory.fields,memory.offset,item.width);return stack.#mint(value.value,value.knownMask);
      };
      const write=(item:Operand,word:NativeX86Word32):void=>{
        if(item.kind==='immediate')throw new Error('Unowned immediate parser destination');
        if(item.kind==='register'){
          if(!item.byte){stack.#store(stack.#bank,stack.#reg(item.name),word);return;}
          const old=stack.#record(stack.#load(stack.#bank,stack.#reg(item.name))),value=stack.#record(word);
          stack.#store(stack.#bank,stack.#reg(item.name),stack.#mint((old.value&0xffffff00)|(value.value&255),(old.mask&0xffffff00)|(value.mask&255)));return;
        }
        stack.#writeMemory(address(item.expression),word,item.width);
      };
      const pop=(item:Operand)=>{const esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));write(item,stack.#load(stack.#stack,esp));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(esp+4));};
      const zero=(word:NativeX86Word32,w:Width)=>stack.#record(word).provenance?false:stack.#numeric(word,w)===0;
      let pc=environment?'100c092a':'100c0a0f';
      while(true){
        // Every iteration consumes a bounded original instruction. No textual split parser.
        const row=sharedCommandLineInstruction(pc),[opcode,...rest]=row.instruction.split(' '),text=rest.join(' '),args=text?text.split(',').map(operand):[];
        const next=(parseInt(pc,16)+row.bytes.length/2).toString(16).padStart(8,'0');
        if(environment)stack.#sharedEnvironmentFrame!.operations++;else if(query)frame.parserOperations!++;else frame.fillOperations!++;stack.#trace.push(pc+'.sharedParser.'+pass+'.'+opcode);
        if(opcode==='MOV')write(args[0]!,read(args[1]!));
        else if(opcode==='MOVZX'||opcode==='MOVSX'){const w=width(args[1]!),value=stack.#numeric(read(args[1]!),w),shift=32-w*8;write(args[0]!,stack.#mint(opcode==='MOVSX'?(value<<shift)>>shift:value,0xffffffff));}
        else if(opcode==='LEA'){const arg=args[1]!;if(arg.kind!=='memory')throw new Error('Actual parser LEA address required');write(args[0]!,address(arg.expression));}
        else if(opcode==='PUSH')stack.#push(read(args[0]!));
        else if(opcode==='POP')pop(args[0]!);
        else if(opcode==='LEAVE'){stack.#store(stack.#bank,stack.#reg('ESP'),stack.#load(stack.#bank,stack.#reg('EBP')));pop({kind:'register',name:'EBP',byte:false});}
        else if(opcode==='INC'||opcode==='DEC'||opcode==='ADD'||opcode==='SUB'){
          const old=read(args[0]!),delta=opcode==='INC'?1:opcode==='DEC'?-1:stack.#numeric(read(args[1]!),4)*(opcode==='SUB'?-1:1),w=width(args[0]!),record=stack.#record(old),flags=stack.#record(stack.#load(stack.#bank,36));
          if(record.provenance){write(args[0]!,stack.#offsetWord(old,delta));stack.#flags(0,0);}
          else {const a=stack.#numeric(old,w),b=Math.abs(delta),result=(a+delta)&stack.#maximum(w);write(args[0]!,stack.#mint(result,stack.#maximum(w)));stack.#arithmeticFlags(a,b,result,w,delta<0);}
          if(opcode==='INC'||opcode==='DEC'){const updated=stack.#record(stack.#load(stack.#bank,36));stack.#flags((updated.value&~1)|(flags.value&1),(updated.mask&~1)|(flags.mask&1));}
        }else if(opcode==='XOR'||opcode==='AND'||opcode==='OR'){
          const w=width(args[0]!),left=read(args[0]!),right=read(args[1]!),same=args[0]!.kind==='register'&&args[1]!.kind==='register'&&JSON.stringify(args[0])===JSON.stringify(args[1]),b=opcode==='XOR'&&same?0:stack.#numeric(right,w);
          const a=(opcode==='XOR'&&same)||(opcode==='AND'&&b===0)||(opcode==='OR'&&b===stack.#maximum(w))?0:stack.#numeric(left,w),value=opcode==='XOR'&&same?0:opcode==='XOR'?a^b:opcode==='AND'?a&b:a|b;write(args[0]!,stack.#mint(value,stack.#maximum(w)));stack.#logicalFlags(value,stack.#maximum(w),w);
        }else if(opcode==='CMP'||opcode==='TEST'){
          const w=width(args[0]!),left=read(args[0]!),right=read(args[1]!),lp=stack.#record(left).provenance,rp=stack.#record(right).provenance;
          if(lp||rp){if(opcode==='TEST'&&args[0]!.kind==='register'&&JSON.stringify(args[0])===JSON.stringify(args[1]))stack.#flags(0,0x40);
            else if(opcode==='CMP'&&lp&&zero(right,w))stack.#flags(0,0x40);else throw new Error('Unowned parser pointer comparison');}
          else {const a=stack.#numeric(left,w),b=stack.#numeric(right,w);if(opcode==='CMP')stack.#arithmeticFlags(a,b,(a-b)&stack.#maximum(w),w,true);else stack.#logicalFlags(a&b,stack.#maximum(w),w);}
        }else if(opcode==='SETZ'){const flags=stack.#record(stack.#load(stack.#bank,36));if(!(flags.mask&0x40))throw new Error('Actual parser ZF required');write(args[0]!,stack.#mint(flags.value&0x40?1:0,255));}
        else if(opcode==='SHR'){const a=stack.#numeric(read(args[0]!),4),shift=stack.#numeric(read(args[1]!),4),value=a>>>shift;write(args[0]!,stack.#mint(value,0xffffffff));stack.#logicalFlags(value,0xffffffff,4);const flags=stack.#record(stack.#load(stack.#bank,36));stack.#flags((flags.value&~0x801)|((a>>>(shift-1))&1)|(shift===1&&a&0x80000000?0x800:0),(flags.mask&~0x800)|(shift===1?0x800:0));}
        else if(opcode==='JA'){const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x41)!==0x41)throw new Error('Actual SharedBase unsigned branch flags required');if(!(flags.value&0x41)){pc=number(text).toString(16).padStart(8,'0');continue;}}
        else if(opcode==='JMP'||opcode==='JZ'||opcode==='JNZ'){
          const flags=stack.#record(stack.#load(stack.#bank,36));if(opcode!=='JMP'&&!(flags.mask&0x40))throw new Error('Actual parser branch flag required');if(opcode==='JMP'||(!!(flags.value&0x40)===(opcode==='JZ'))){pc=number(text).toString(16).padStart(8,'0');continue;}
        }else if(opcode==='CALL'){
          const target=number(text).toString(16).padStart(8,'0');stack.#call(pc,next);
          if(environment&&(target==='100b2a80'||target==='100aef10'||target==='100aa9a4')){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));
            if(target==='100b2a80'){
              let pointer=stack.#load(stack.#stack,cursor+4),length=0;
              while(true){const memory=stack.#memory(pointer,1);if(NativeHeapObjectViews.prototype.readUnsigned.call(memory.fields,memory.offset,1)===0)break;pointer=stack.#offsetWord(pointer,1);length++;}
              stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(length,0xffffffff));stack.#sharedEnvironmentFrame!.strlenCalls++;
            }else if(target==='100aef10'){
              const count=stack.#numeric(stack.#load(stack.#stack,cursor+4),4),size=stack.#numeric(stack.#load(stack.#stack,cursor+8),4),allocation=environmentHooks!.calloc(pc,count,size);
              if(allocation)stack.#sharedLocalPhysical(allocation);stack.#store(stack.#bank,stack.#reg('EAX'),allocation?stack.#mint(0,0,{kind:'shared-local',fields:allocation}):stack.#mint(0,0xffffffff));stack.#sharedEnvironmentFrame!.callocCalls++;
            }else{
              const pointer=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(pointer?.kind!=='shared-local')throw new Error('Actual retained SharedBase free pointer required');environmentHooks!.free(Object.freeze({fields:pointer.fields,offset:pointer.offset??0}));stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(0,0));stack.#sharedEnvironmentFrame!.freeCalls++;
            }
            for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret();
          }else if(target==='100a74b6'){
            if(pc!=='100d1e15')throw new Error('Actual parser LocaleUpdate constructor call required');
            const localWord=stack.#load(stack.#bank,stack.#reg('ECX')),offset=stack.#address(localWord);
            const local=new NativeHeapObjectViews(stack.#stack.backing,offset,16);stack.#invalidateRange(stack.#stack,offset,16);
            initializeLocale(local);stack.#sharedLocalPhysical(local);stack.#store(stack.#bank,stack.#reg('EAX'),localWord);
            for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(4);
          }else {if(target!=='100d1fc7'&&target!=='100d1e09'&&!(environment&&target==='100c0e29'))throw new Error('Unowned SharedBase parser child '+target);if(target==='100d1fc7'){if(query)frame.leadCalls!++;else frame.fillLeadCalls!++;}pc=target;continue;}
        }else if(opcode==='RET'){
          const continuation=stack.#ret(),record=stack.#record(continuation);if(record.provenance?.kind!=='source')throw new Error('Actual parser return continuation required');pc=record.provenance.address;
          if(pc===(environment?'100adb54':query?'100c0c01':'100c0c42'))break;continue;
        }else throw new Error('Unowned SharedBase parser opcode '+opcode);
        pc=next;
      }
      if(environment){const env=stack.#sharedEnvironmentFrame!,result=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4)|0;if(result!==0&&result!==-1)throw new Error('Actual setenvp result 0/-1 required');if(stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==env.entryEsp+4)throw new Error('Actual setenvp saved-register return required');env.returned=true;env.result=result;frame.environmentPending=false;stack.#phase='returned';return known(undefined);}
      if(stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')))!==frame.ebp||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.ebp-36)throw new Error('Actual returned SharedBase parser caller frame required');
      if(!query){frame.fillReturned=true;frame.fillPending=false;frame.fillCounts=Object.freeze({count:frame.argumentCount.readUnsigned(0),bytes:frame.byteCount.readUnsigned(0)});return known(undefined);}
      frame.parserReturned=true;frame.parsePending=false;frame.queryCounts=Object.freeze({count:frame.argumentCount.readUnsigned(0),bytes:frame.byteCount.readUnsigned(0)});
      // Original caller consumes counts and rejects overflow before malloc.
      const count=frame.argumentCount.readUnsigned(0),bytes=frame.byteCount.readUnsigned(0);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(count,0xffffffff));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(frame.ebp-24));
      stack.#arithmeticFlags(count,0x3fffffff,(count-0x3fffffff)>>>0,4,true);if(count>=0x3fffffff)throw new Error('Unowned SharedBase argc overflow return');
      stack.#store(stack.#bank,stack.#reg('ECX'),stack.#mint(bytes,0xffffffff));stack.#arithmeticFlags(bytes,0xffffffff,(bytes-0xffffffff)>>>0,4,true);if(bytes===0xffffffff)throw new Error('Unowned SharedBase byte-count overflow return');
      const vectorBytes=(count*4)>>>0,total=(vectorBytes+bytes)>>>0;stack.#store(stack.#bank,stack.#reg('EDI'),stack.#mint(vectorBytes,0xffffffff));stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(total,0xffffffff));stack.#arithmeticFlags(total,bytes,(total-bytes)>>>0,4,true);if(total<bytes)throw new Error('Unowned SharedBase argv allocation overflow return');
      stack.#push(stack.#load(stack.#bank,stack.#reg('EAX')));stack.#call('100c0c23','100c0c28');frame.allocationPending=true;stack.#trace.push('100c0c23.argvAllocationPending');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static runSharedEnvironment(stack:NativeX86ThreadStack,controller:object,hooks:Readonly<{calloc:(site:string,count:number,size:number)=>NativeHeapObjectViews|null;free:(pointer:NativeBytePointer)=>void}>):NativeValue<number>{
    const executed=NativeX86ThreadStack.#runSharedCrtInstructions(stack,controller,()=>{throw new Error('Unowned setenvp locale constructor');},'environment',hooks);if(!executed.known)return executed;return known(stack.#sharedEnvironmentFrame!.result!);
  }
  static beginSharedEnvironmentInitializers(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#sharedArgvProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input}=NativeX86ThreadStack.#sharedArgvProof(stack,controller),env=stack.#sharedEnvironmentFrame;if(input.stage!=='environment'||!env?.returned||env.result!==0||env.initializersPending||stack.#phase!=='returned')throw new Error('Actual successful setenvp caller continuation required');stack.#logicalFlags(0,0xffffffff,4);stack.#push(stack.#mint(0,0xffffffff));stack.#call('100adb5a','100adb5f');env.initializersPending=true;stack.#phase='running';return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  /** Original cinit, image ownership and floating-point conversion installation.
   * Calls without owned lower effects remain pending on this same graph. */
  static runSharedInitializers(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    const proof=NativeSharedCrtOwner.initializerStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      NativeX86ThreadStack.#sharedArgvProof(stack,controller);
      if(!stack.#sharedEnvironmentFrame?.initializersPending||stack.#sharedInitializerFrame||stack.#phase!=='running')throw new Error('Actual pending cinit source frame required');
      const images=proof.value.images;
      stack.#sharedInitializerFrame={controller,entryEsp:stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),operations:0,ownershipReturned:null,conversionInstalled:false,oldFs:stack.#load(stack.#bank,32),fsRestored:false,moduleCalls:0,procedureCalls:0,featureCalls:0,divisionQueryResult:null,initializerResult:null};
      const frame=stack.#sharedInitializerFrame;
      type Operand={kind:'register';slot:number}|{kind:'immediate';value:number}|{kind:'memory';expression:string;width:Width};
      const number=(text:string)=>{if(!/^-?0x[0-9a-f]+$/.test(text))throw new Error('Unowned initializer literal '+text);return (text.startsWith('-')?-parseInt(text.slice(3),16):parseInt(text.slice(2),16))>>>0;};
      const pointer=(fields:NativeHeapObjectViews)=>stack.#mint(0,0,{kind:'shared-local',fields});
      const image=(value:number):NativeX86Word32|null=>{if(value===0x100e5358&&images['100e5000'])return stack.#offsetWord(pointer(images['100e5000']),856);if(value===0x10141a10&&images['10141790'])return stack.#offsetWord(pointer(images['10141790']),640);if(value===0x100e5678&&images['100e545c'])return stack.#offsetWord(pointer(images['100e545c']),540);for(const [base,fields] of Object.entries(images)){const offset=value-parseInt(base,16);if(offset>=0&&offset<fields.bytes.length)return stack.#offsetWord(pointer(fields),offset);}return null;};
      const operand=(text:string):Operand=>{
        if(registers.includes(text as NativeX86Register))return {kind:'register',slot:stack.#reg(text as NativeX86Register)};
        if(text==='CL'||text==='AL')return {kind:'register',slot:stack.#reg(text==='CL'?'ECX':'EAX')};
        if(text==='FS:[0x0]'||text==='dword ptr FS:[0x0]')return {kind:'register',slot:32};
        if(/^-?0x[0-9a-f]+$/.test(text))return {kind:'immediate',value:number(text)};
        const match=/^(?:(byte|word|dword) ptr )?\[(.+)\]$/.exec(text);if(!match)throw new Error('Unowned initializer operand '+text);
        return {kind:'memory',expression:match[2]!,width:match[1]==='word'?2:match[1]==='byte'?1:4};
      };
      const address=(expression:string):NativeX86Word32=>{
        if(expression==='0x10140d6c')return pointer(proof.value.cookie);
        let base:NativeX86Word32|null=null,offset=0;
        for(const term of expression.split(' + ')){
          const match=/^(E(?:AX|BX|CX|DX|SI|DI|BP|SP))(?:\*0x([1248]))?$/.exec(term);
          const word=match?stack.#load(stack.#bank,stack.#reg(match[1] as NativeX86Register)):(image(number(term))??stack.#mint(number(term),0xffffffff));
          const scale=match?.[2]?parseInt(match[2],16):1;
          if(stack.#record(word).provenance){if(base||scale!==1)throw new Error('Actual initializer pointer base required');base=word;}else offset+=(stack.#numeric(word,4)|0)*scale;
        }
        return base?stack.#offsetWord(base,offset):stack.#mint(offset,0xffffffff);
      };
      const read=(item:Operand):NativeX86Word32=>{
        if(item.kind==='register')return stack.#load(stack.#bank,item.slot);
        if(item.kind==='immediate')return image(item.value)??stack.#mint(item.value,0xffffffff);
        const memory=stack.#memory(address(item.expression),item.width);
        if(item.width===4&&memory.offset===0&&(memory.fields===images['102f9768']||memory.fields===images['102f9648']||memory.fields===images['102f97b8'])){
          const module=memory.fields===images['102f9768'],tls=memory.fields===images['102f97b8'],expected=tls?proof.value.imports.tlsGetValue:module?proof.value.imports.getModuleHandleA:proof.value.imports.getProcAddress;
          if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==expected)throw new Error('Actual retained SharedBase initializer import slot required');
          return stack.#mint(0,0,{kind:'platform',object:expected,category:tls?'InitializerTlsGetValue':module?'GetModuleHandleA':'GetProcAddress'});
        }
        if(item.width===4&&((memory.offset===0x1f8&&item.expression==='EAX + 0x1f8'&&(stack.#record(stack.#currentPc!).provenance as {address:string}).address==='100ae2a7')||(memory.offset===0x1fc&&item.expression==='EAX + 0x1fc'&&(stack.#record(stack.#currentPc!).provenance as {address:string}).address==='100ae31e'))){
          const procedure=proof.value.imports.getCodec(memory.fields,memory.offset===0x1f8?'EncodePointer':'DecodePointer');
          return procedure?stack.#mint(0,0,{kind:'platform',object:procedure,category:memory.offset===0x1f8?'InitializerEncodePointer':'InitializerDecodePointer'}):stack.#mint(0,0xffffffff);
        }
        if(item.width===4&&memory.fields===images['102f95f4']&&memory.offset===0){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==proof.value.imports.initializeSectionProcedure)throw new Error('Actual initializer InitializeCriticalSection import slot required');return stack.#mint(0,0,{kind:'platform',object:proof.value.imports.initializeSectionProcedure,category:'InitializerInitializeSection'});}
        if(item.width===4&&memory.fields===images['102f9678']&&memory.offset===0){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==proof.value.imports.heapSizeProcedure)throw new Error('Actual initializer HeapSize import slot required');return stack.#mint(0,0,{kind:'platform',object:proof.value.imports.heapSizeProcedure,category:'InitializerHeapSize'});}
        if(item.width===4&&memory.fields===images['102f6ac8']&&memory.offset===0){const heap=NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get();if(!heap)throw new Error('Actual SharedBase HeapSize heap required');return stack.#mint(0,0,{kind:'heap',heap:heap as NativeWin32HeapCapability});}
        const current=stack.#currentPc?stack.#record(stack.#currentPc).provenance:null;
        if(item.width===4&&current?.kind==='source'&&current.address==='100bef8c'&&memory.fields===images['102f70c0']&&memory.offset===0)return pointer(proof.value.imports.descriptorBlock());
        if(item.width===4&&current?.kind==='source'&&current.address==='100bef93'){
          const handle=proof.value.imports.descriptorHandle(memory.fields,memory.offset);return typeof handle==='number'?stack.#mint(handle,0xffffffff):stack.#mint(0,0,{kind:'platform',object:handle,category:'handle'});
        }
        if(item.width===4)return stack.#load(memory.fields,memory.offset);
        const word=NativeHeapObjectViews.prototype.maskedWord.call(memory.fields,memory.offset,item.width);return stack.#mint(word.value,word.knownMask);
      };
      const write=(item:Operand,word:NativeX86Word32)=>{
        if(item.kind==='immediate')throw new Error('Unowned initializer immediate destination');
        if(item.kind==='register')stack.#store(stack.#bank,item.slot,word);else stack.#writeMemory(address(item.expression),word,item.width);
      };
      const pop=(item:Operand)=>{const esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));write(item,stack.#load(stack.#stack,esp));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(esp+4));};
      const relativeImageAddress=(word:NativeX86Word32):number=>{
        const provenance=stack.#record(word).provenance;
        if(provenance?.kind!=='shared-local')throw new Error('Actual initializer image relation required');
        const entry=Object.entries(images).find(([,fields])=>fields===provenance.fields);
        if(!entry)throw new Error('Actual same-SharedBase source image relation required');
        return (parseInt(entry[0],16)+(provenance.offset??0))>>>0;
      };
      const relativePair=(left:NativeX86Word32,right:NativeX86Word32):readonly [number,number]|null=>{
        const a=stack.#record(left).provenance,b=stack.#record(right).provenance;return a?.kind==='shared-local'&&b?.kind==='shared-local'&&a.fields===b.fields?[a.offset??0,b.offset??0]:null;
      };
      const pointerFlags=(a:number,b:number)=>{const result=(a-b)>>>0;if(a===b)stack.#arithmeticFlags(0,0,0,4,true);else stack.#flags((a<b?1:0)|(stack.#parity(result&255)?4:0)|(result&0x80000000?0x80:0),0xc5);};
      const object=(word:NativeX86Word32):object=>{const value=stack.#record(word).provenance;if(value?.kind!=='platform')throw new Error('Actual initializer module/procedure capability required');return value.object;};
      const string=(word:NativeX86Word32):string=>{let text='';for(let offset=0;;offset++){const memory=stack.#memory(stack.#offsetWord(word,offset),1),byte=NativeHeapObjectViews.prototype.readUnsigned.call(memory.fields,memory.offset,1);if(byte===0)return text;text+=String.fromCharCode(byte);}};
      let pc='100aa632';
      while(true){
        const row=sharedInitializerInstruction(pc),[opcode,...rest]=row.instruction.replace(/^\w+/,opcode=>opcode.toUpperCase()).replace(/\b(?:eax|ebx|ecx|edx|esi|edi|ebp|esp)\b/g,register=>register.toUpperCase()).split(' '),text=rest.join(' ');
        frame.operations++;stack.#trace.push(pc+'.sharedInitializer.'+opcode);stack.#currentPc=stack.#source('code',pc);
        if(opcode==='PUSHFD'||opcode==='POPFD'){
          if(opcode==='PUSHFD')stack.#pushFlags();else stack.#popFlags();
          pc=(parseInt(pc,16)+row.bytes.length/2).toString(16).padStart(8,'0');continue;
        }
        if(opcode==='CPUID'){
          const cpu=stack.#selection.cpu;if(!cpu||!cpu.idBitWritable)throw new Error('Actual retained CPUID-capable virtual CPU required');
          const leaf=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4),tuple=leaf===0?cpu.cpuidLeaf0:leaf===1?cpu.cpuidLeaf1:undefined;
          if(!tuple)throw new Error('Explicit virtual CPUID leaf '+leaf+' required');
          for(const [index,name] of (['EAX','EBX','ECX','EDX'] as const).entries())stack.#store(stack.#bank,stack.#reg(name),stack.#mint(tuple[index]!,0xffffffff));
          pc=(parseInt(pc,16)+row.bytes.length/2).toString(16).padStart(8,'0');continue;
        }
        if(opcode==='MOVAPD'){
          if(text!=='XMM0,XMM1'||stack.#selection.cpu?.sse2Execution!=='normal')throw new Error('Original SIMD exception dispatch or explicit normal SSE2 execution required');
          stack.#physical(stack.#xmm);for(let offset=0;offset<16;offset+=4)stack.#store(stack.#xmm,offset,stack.#load(stack.#xmm,16+offset));
          pc=(parseInt(pc,16)+row.bytes.length/2).toString(16).padStart(8,'0');continue;
        }
        if(opcode==='FNCLEX'){
          // Intel FNCLEX clears B, ES, SF and exception bits 0..5; other
          // status bits retain their values and knowledge. It does not wait.
          const status=stack.#record(stack.#load(stack.#bank,40));
          stack.#store(stack.#bank,40,stack.#mint(status.value&~0x80ff,status.mask|0x80ff));
          pc=(parseInt(pc,16)+row.bytes.length/2).toString(16).padStart(8,'0');continue;
        }
        if(opcode==='FLD')throw new Error('Unowned SharedBase initializer opcode '+opcode);
        const args=text?text.split(',').map(operand):[],next=(parseInt(pc,16)+row.bytes.length/2).toString(16).padStart(8,'0');
        if(opcode==='MOV')write(args[0]!,read(args[1]!));
        else if(opcode==='MOVZX'){const source=args[1]!,width=source.kind==='memory'?source.width:4;write(args[0]!,stack.#mint(stack.#numeric(read(source),width),0xffffffff));}
        else if(opcode==='LEA'){const source=args[1]!;if(source.kind!=='memory')throw new Error('Actual initializer LEA required');write(args[0]!,address(source.expression));}
        else if(opcode==='PUSH')stack.#push(read(args[0]!));
        else if(opcode==='POP')pop(args[0]!);
        else if(opcode==='ADD'||opcode==='SUB'){
          const left=read(args[0]!),right=read(args[1]!),a=stack.#record(left),b=stack.#record(right);
          if(opcode==='SUB'&&left===right){write(args[0]!,stack.#mint(0,0xffffffff));stack.#arithmeticFlags(0,0,0,4,true);
          }else if(opcode==='SUB'&&a.provenance?.kind==='xor'&&a.provenance.left===right&&stack.#record(a.provenance.right).mask===0xffffffff&&stack.#record(a.provenance.right).value===0x200000&&(b.mask&0x200000)){
            const result=b.value&0x200000?0xffe00000:0x200000;write(args[0]!,stack.#mint(result,0xffffffff));
            // The original words differ only at ID. Low-byte parity/AF are
            // known; sign/carry follow that bit. Both operands have the
            // same sign, so signed subtraction cannot overflow.
            stack.#flags((b.value&0x200000?0x81:0)|4,0x8d5);
          }else if(a.provenance&&b.provenance&&opcode==='SUB'&&relativePair(left,right)){const [a,b]=relativePair(left,right)!;write(args[0]!,stack.#mint(a-b,0xffffffff));pointerFlags(a,b);
          }else if(a.provenance&&b.provenance&&opcode==='SUB'){
            const av=relativeImageAddress(left),bv=relativeImageAddress(right),result=(av-bv)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#arithmeticFlags(av,bv,result,4,true);
          }else if(a.provenance||b.provenance){
            if(b.provenance&&opcode==='SUB')throw new Error('Unowned initializer scalar-pointer subtraction');
            const delta=stack.#numeric(a.provenance?right:left,4)|0;write(args[0]!,stack.#offsetWord(a.provenance?left:right,delta*(opcode==='SUB'?-1:1)));stack.#flags(0,0);
          }else {const av=stack.#numeric(left,4),bv=stack.#numeric(right,4),result=(opcode==='SUB'?av-bv:av+bv)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#arithmeticFlags(av,bv,result,4,opcode==='SUB');}
        }else if(opcode==='XOR'||opcode==='AND'){
          const left=read(args[0]!),right=read(args[1]!),a=stack.#record(left),b=stack.#record(right),same=args[0]!.kind==='register'&&args[1]!.kind==='register'&&args[0]!.slot===args[1]!.slot;
          const value=opcode==='XOR'&&same?0:opcode==='XOR'?a.value^b.value:a.value&b.value;
          const mask=opcode==='XOR'&&same?0xffffffff:a.mask&b.mask;
          write(args[0]!,opcode==='XOR'&&!same&&mask!==0xffffffff?stack.#mint(value,mask,{kind:'xor',left,right}):stack.#mint(value,mask));stack.#logicalFlags(value,mask,4);
        }else if(opcode==='LEAVE'){stack.#store(stack.#bank,stack.#reg('ESP'),stack.#load(stack.#bank,stack.#reg('EBP')));pop({kind:'register',slot:stack.#reg('EBP')});}
        else if(opcode==='NEG'){const value=stack.#numeric(read(args[0]!),4),result=(-value)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#arithmeticFlags(0,value,result,4,true);}
        else if(opcode==='SBB'){if(text!=='EAX,EAX')throw new Error('Unowned initializer SBB form');const old=stack.#numeric(read(args[0]!),4),flags=stack.#record(stack.#load(stack.#bank,36));if(!(flags.mask&1))throw new Error('Actual initializer SBB carry required');const carry=flags.value&1,result=(-carry)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#arithmeticFlags(old,old,result,4,true,carry);}
        else if(opcode==='DEC'){const value=stack.#numeric(read(args[0]!),4),flags=stack.#record(stack.#load(stack.#bank,36)),result=(value-1)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#arithmeticFlags(value,1,result,4,true);const updated=stack.#record(stack.#load(stack.#bank,36));stack.#flags((updated.value&~1)|(flags.value&1),(updated.mask&~1)|(flags.mask&1));}
        else if(opcode==='INC'){const old=read(args[0]!),value=stack.#numeric(old,4),flags=stack.#record(stack.#load(stack.#bank,36)),result=(value+1)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#arithmeticFlags(value,1,result,4,false);const updated=stack.#record(stack.#load(stack.#bank,36));stack.#flags((updated.value&~1)|(flags.value&1),(updated.mask&~1)|(flags.mask&1));}
        else if(opcode==='NOT'){write(args[0]!,stack.#mint(~stack.#numeric(read(args[0]!),4),0xffffffff));}
        else if(opcode==='IMUL'){
          const left=stack.#numeric(read(args[1]!),4)|0,right=stack.#numeric(read(args[2]!),4)|0,result=BigInt(left)*BigInt(right),low=Number(BigInt.asUintN(32,result)),fits=result===BigInt.asIntN(32,result);write(args[0]!,stack.#mint(low,0xffffffff));stack.#flags(fits?0:0x801,0x801);
        }
        else if(opcode==='SAR'){
          const value=stack.#numeric(read(args[0]!),4),shift=stack.#numeric(read(args[1]!),4)&31;if(shift){const result=(value>>shift)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#logicalFlags(result,0xffffffff,4);const flags=stack.#record(stack.#load(stack.#bank,36));stack.#flags((flags.value&~0x801)|((value>>>(shift-1))&1),(flags.mask&~0x800)|(shift===1?0x800:0));}
        }
        else if(opcode==='SHR'){const value=stack.#numeric(read(args[0]!),4),shift=stack.#numeric(read(args[1]!),4);write(args[0]!,stack.#mint(value>>>shift,0xffffffff));stack.#logicalFlags(value>>>shift,0xffffffff,4);const flags=stack.#record(stack.#load(stack.#bank,36));stack.#flags((flags.value&~0x801)|((value>>>(shift-1))&1),(flags.mask&~0x800));}
        else if(opcode==='CMP'||opcode==='TEST'){
          const left=read(args[0]!),right=read(args[1]!),a=stack.#record(left),b=stack.#record(right),width=args[0]!.kind==='memory'?args[0]!.width:4;
          if(a.provenance||b.provenance){
            if(opcode==='TEST'&&args[0]!.kind==='register'&&args[1]!.kind==='register'&&args[0]!.slot===args[1]!.slot)stack.#flags(0,0x40);
            else if(opcode==='CMP'&&a.provenance?.kind==='platform'&&a.provenance.category==='handle'&&!b.provenance&&[0,0xffffffff,0xfffffffe].includes(stack.#numeric(right,width))){const proof=NativeRuntimePlatform.standardIoCapabilityForPlatform(stack.#platform,a.provenance.object);if(!proof.known||proof.value!=='handle')throw new Error('Canonical descriptor HANDLE comparison required');stack.#flags(0,0x40);}
            else if(opcode==='CMP'&&a.provenance&&!b.provenance&&stack.#numeric(right,width)===0)stack.#flags(0,0x41);
            else if(opcode==='CMP'&&relativePair(left,right)){if(a.provenance?.kind==='shared-local'&&Object.values(images).includes(a.provenance.fields)){const av=relativeImageAddress(left),bv=relativeImageAddress(right);stack.#arithmeticFlags(av,bv,(av-bv)>>>0,4,true);}else {const [av,bv]=relativePair(left,right)!;pointerFlags(av,bv);}}
            else {const av=relativeImageAddress(left),bv=relativeImageAddress(right);stack.#arithmeticFlags(av,bv,(av-bv)>>>0,4,true);}
          }else {const av=stack.#numeric(left,width),bv=stack.#numeric(right,width);if(opcode==='CMP')stack.#arithmeticFlags(av,bv,(av-bv)&stack.#maximum(width),width,true);else stack.#logicalFlags(av&bv,stack.#maximum(width),width);}
        }else if(opcode==='SETZ'||opcode==='SETNZ'){
          if(!['CL','AL'].includes(text))throw new Error('Unowned initializer byte destination');const register=text==='CL'?'ECX':'EAX',flags=stack.#record(stack.#load(stack.#bank,36)),old=stack.#record(stack.#load(stack.#bank,stack.#reg(register)));if(!(flags.mask&0x40))throw new Error('Actual initializer ZF required');const set=(!!(flags.value&0x40))===(opcode==='SETZ');stack.#store(stack.#bank,stack.#reg(register),stack.#mint((old.value&0xffffff00)|(set?1:0),(old.mask&0xffffff00)|255));
        }else if(['JMP','JZ','JNZ','JC','JNC','JBE','JL','JGE'].includes(opcode!)){
          const flags=stack.#record(stack.#load(stack.#bank,36)),mask=opcode==='JL'||opcode==='JGE'?0x880:opcode==='JC'||opcode==='JNC'?1:opcode==='JBE'?0x41:0x40;
          if(opcode!=='JMP'&&(flags.mask&mask)!==mask)throw new Error('Actual initializer branch flags required');
          const taken=opcode==='JMP'||opcode==='JZ'&&!!(flags.value&0x40)||opcode==='JNZ'&&!(flags.value&0x40)||opcode==='JC'&&!!(flags.value&1)||opcode==='JNC'&&!(flags.value&1)||opcode==='JBE'&&!!(flags.value&0x41)||opcode==='JL'&&(!!(flags.value&0x80)!==!!(flags.value&0x800))||opcode==='JGE'&&(!!(flags.value&0x80)===!!(flags.value&0x800));
          if(taken){pc=number(text).toString(16).padStart(8,'0');continue;}
        }else if(opcode==='CALL'){
          const callee=read(args[0]!),capability=stack.#record(callee).provenance;stack.#call(pc,next);
          if(capability?.kind==='platform'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));let result:NativeX86Word32,bytes:number;
            if(pc==='100b4490'&&capability.object===proof.value.imports.getModuleHandleA){
              frame.moduleCalls++;const module=proof.value.imports.getModule(string(stack.#load(stack.#stack,cursor+4)));result=module?stack.#mint(0,0,{kind:'platform',object:module,category:'GetModuleHandleA'}):stack.#mint(0,0xffffffff);bytes=4;
            }else if(pc==='100b44a0'&&capability.object===proof.value.imports.getProcAddress){
              frame.procedureCalls++;const procedure=proof.value.imports.getProcedure(object(stack.#load(stack.#stack,cursor+4)),string(stack.#load(stack.#stack,cursor+8)));result=procedure?stack.#mint(0,0,{kind:'platform',object:procedure,category:'IsProcessorFeaturePresent'}):stack.#mint(0,0xffffffff);bytes=8;
            }else if(pc==='100b44ac'&&capability.category==='IsProcessorFeaturePresent'){
              frame.featureCalls++;const value=proof.value.imports.queryFeature(capability.object,stack.#numeric(stack.#load(stack.#stack,cursor+4),4));result=stack.#mint(value,0xffffffff);bytes=4;
            }else if((pc==='100ae288'||pc==='100ae29f'||pc==='100ae2ff'||pc==='100ae316')&&capability.object===proof.value.imports.tlsGetValue){
              const procedure=proof.value.imports.getTls(stack.#numeric(stack.#load(stack.#stack,cursor+4),4));result=procedure?stack.#mint(0,0,{kind:'platform',object:procedure,category:'InitializerPtdGetter'}):stack.#mint(0,0xffffffff);bytes=4;
            }else if((pc==='100ae2a1'||pc==='100ae318')&&capability.category==='InitializerPtdGetter'){
              const record=proof.value.imports.getPtd(capability.object,stack.#numeric(stack.#load(stack.#stack,cursor+4),4));result=record?pointer(record):stack.#mint(0,0xffffffff);bytes=4;
            }else if(pc==='100ae2dd'&&capability.category==='InitializerEncodePointer'){
              const argument=stack.#load(stack.#stack,cursor+4),pointerArgument=stack.#record(argument).provenance;const encoded=pointerArgument?.kind==='shared-local'?proof.value.imports.encodeAllocation(capability.object,pointerArgument.fields,pointerArgument.offset??0):proof.value.imports.encodeCode(capability.object,stack.#numeric(argument,4));result=encoded?stack.#mint(0,0,{kind:'platform',object:encoded,category:'InitializerEncodedCode'}):stack.#mint(0,0xffffffff);bytes=4;
            }else if(pc==='100ae354'&&capability.category==='InitializerDecodePointer'){
              const argument=stack.#load(stack.#stack,cursor+4),encoded=stack.#record(argument).provenance;if(encoded?.kind!=='platform'||encoded.category!=='InitializerEncodedCode')throw new Error('Actual initializer encoded argument required');const decoded=proof.value.imports.decodePointer(capability.object,encoded.object);result=typeof decoded==='number'?stack.#mint(decoded,0xffffffff):stack.#offsetWord(pointer(decoded.fields),decoded.offset);bytes=4;
            }else if(pc==='100e1455'&&capability.object===proof.value.imports.initializeSectionProcedure){const section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(section?.kind!=='shared-local')throw new Error('Actual original static section pointer required');proof.value.imports.initializeSection(section.fields,section.offset??0);result=stack.#mint(0,0);bytes=4;
            }else if(pc==='100b1158'&&capability.object===proof.value.imports.heapSizeProcedure){
              const heap=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,allocation=stack.#record(stack.#load(stack.#stack,cursor+12)).provenance;if(heap?.kind!=='heap'||allocation?.kind!=='shared-local')throw new Error('Actual original HeapSize pointer arguments required');result=stack.#mint(proof.value.imports.heapSize(heap.heap,stack.#numeric(stack.#load(stack.#stack,cursor+8),4),allocation.fields,allocation.offset??0),0xffffffff);bytes=12;
            }else throw new Error('Actual original SharedBase initializer import call required');
            stack.#store(stack.#bank,stack.#reg('EAX'),result);for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(bytes);pc=next;continue;
          }
          if(pc==='100aa455'||pc==='100aa45e'){
            const target=stack.#numeric(callee,4);if(target!==(pc==='100aa455'?0x100bb892:0x100bb7a2))throw new Error('Original exit-table lock lower target required');const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));proof.value.imports.exitLock(stack.#numeric(stack.#load(stack.#stack,cursor+4),4),pc==='100aa455');for(const name of ['EAX','ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret();pc=next;continue;
          }
          if(pc==='100aef1e'){
            if(stack.#numeric(callee,4)!==0x100c0e96)throw new Error('Original initializer calloc lower target required');
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),allocation=proof.value.imports.calloc(stack.#numeric(stack.#load(stack.#stack,cursor+4),4),stack.#numeric(stack.#load(stack.#stack,cursor+8),4),stack.#numeric(stack.#load(stack.#stack,cursor+12),4),stack.#calls.at(-2)!.site);
            stack.#store(stack.#bank,stack.#reg('EAX'),allocation?pointer(allocation):stack.#mint(0,0xffffffff));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret();pc=next;continue;
          }
          const target=stack.#numeric(callee,4).toString(16).padStart(8,'0');
          if((pc==='100a729b'||pc==='100b10dd')&&target==='100aeb68'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),scope=stack.#load(stack.#stack,cursor+4),record=stack.#record(scope).provenance,onexit=pc==='100a729b',fields=images[onexit?'100f8630':'100f8ba0'],raw=onexit?'feffffff00000000d4ffffff00000000feffffff00000000ca720a10':'feffffff00000000d0ffffff00000000feffffff0000000068110b10';
            if(record?.kind!=='shared-local'||record.fields!==fields||(record.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==(onexit?12:16)||stack.#initializerSehFrames.get(pc)?.returned===false)throw new Error('Actual original initializer SEH scope and reservation required');for(let offset=0;offset<28;offset++)if(NativeHeapObjectViews.prototype.readUnsigned.call(fields!,offset,1)!==parseInt(raw.slice(offset*2,offset*2+2),16))throw new Error('Original live initializer SEH scope required');
            stack.#initializerSehFrames.set(pc,{scope,oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false});
          }
          if(pc==='100ce04c'&&target==='100aeb68'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),scope=stack.#load(stack.#stack,cursor+4),scopeRecord=stack.#record(scope).provenance,scopeFields=images['100f8ec0'];
            if((stack.#processorSimdFrame&&!stack.#processorSimdFrame.returned)||scopeRecord?.kind!=='shared-local'||scopeRecord.fields!==scopeFields||(scopeRecord.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==12)throw new Error('Actual processor SIMD scope and local reservation required');
            const raw='feffffff00000000d4ffffff00000000feffffff62e00c107ee00c10';for(let offset=0;offset<28;offset++)if(NativeHeapObjectViews.prototype.readUnsigned.call(scopeFields!,offset,1)!==parseInt(raw.slice(offset*2,offset*2+2),16))throw new Error('Original live processor SIMD scope bytes required');
            stack.#processorSimdFrame={oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),scope,returned:false};
          }
          if(!((pc==='100ce0e2'&&target==='100ce045')||(pc==='100ce04c'&&target==='100aeb68')||(pc==='100ce08f'&&target==='100aebad')||((pc==='100a729b'||pc==='100b10dd')&&target==='100aeb68')||((pc==='100a72c4'||pc==='100b1162')&&target==='100aebad'))&&!['100ae900','100ae880','100ae8b0','100a78fe','100a788e','100b4407','100b448b','100ae27b','100aa47d','100a7265','100aef10','100b1854','100b4b6b','100ce095','100bef05','100ce0f5','100a72d0','100a7294','100a71ac','100ae2f2','100b10d6','100aa453','100aa45c','100a72ca','100e1660','100e1440','100e1450'].includes(target))throw new Error('Unowned SharedBase initializer child at '+pc+' -> '+target+' (cinit 100aa632)');
          pc=target;continue;
        }else if(opcode==='RET'){
          const continuation=stack.#record(stack.#ret()).provenance;if(continuation?.kind!=='source')throw new Error('Actual initializer return required');
          if(['100a72a0','100b10e2','100a72c9','100b1167'].includes(continuation.address)){
            const enter=continuation.address==='100a72a0'||continuation.address==='100b10e2',site=continuation.address.startsWith('100a72')?'100a729b':'100b10dd',frame=stack.#initializerSehFrames.get(site);if(!frame)throw new Error('Actual initializer SEH frame required');
            if(enter){const ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('EBP'))),encoded=stack.#record(stack.#load(stack.#stack,ebp-8)).provenance;if(encoded?.kind!=='xor'||encoded.left!==frame.scope||stack.#address(stack.#load(stack.#bank,32))!==ebp-16||stack.#load(stack.#stack,ebp-16)!==frame.oldFs)throw new Error('Original initializer SEH prologue relations required');frame.entered=true;}
            else {if(!frame.entered||stack.#load(stack.#bank,32)!==frame.oldFs||stack.#load(stack.#bank,stack.#reg('EBP'))!==frame.oldEbp||stack.#load(stack.#bank,stack.#reg('EBX'))!==frame.oldEbx||stack.#load(stack.#bank,stack.#reg('ESI'))!==frame.oldEsi||stack.#load(stack.#bank,stack.#reg('EDI'))!==frame.oldEdi)throw new Error('Original initializer SEH restoration required');frame.returned=true;}
          }
          if(continuation.address==='100ce051'){
            const simd=stack.#processorSimdFrame,ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('EBP'))),encoded=stack.#record(stack.#load(stack.#stack,ebp-8)).provenance;
            if(!simd||encoded?.kind!=='xor'||encoded.left!==simd.scope||stack.#address(stack.#load(stack.#bank,32))!==ebp-16||stack.#load(stack.#stack,ebp-16)!==simd.oldFs)throw new Error('Actual original processor SIMD EH4 frame relation required');
          }
          if(continuation.address==='100ce094'){
            const simd=stack.#processorSimdFrame;
            if(!simd||stack.#load(stack.#bank,32)!==simd.oldFs||stack.#load(stack.#bank,stack.#reg('EBP'))!==simd.oldEbp||stack.#load(stack.#bank,stack.#reg('EBX'))!==simd.oldEbx||stack.#load(stack.#bank,stack.#reg('ESI'))!==simd.oldEsi||stack.#load(stack.#bank,stack.#reg('EDI'))!==simd.oldEdi)throw new Error('Original SIMD frame FS and saved-register restoration required');simd.returned=true;
          }
          if(continuation.address==='100aa645'){frame.ownershipReturned=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4);frame.fsRestored=stack.#load(stack.#bank,32)===frame.oldFs;if(!frame.fsRestored)throw new Error('Actual image ownership FS restoration required');}
          if(continuation.address==='100a7903')frame.conversionInstalled=true;
          if(continuation.address==='100a7908')frame.divisionQueryResult=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4);
          if(continuation.address==='100adb5f'){frame.initializerResult=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4);stack.#currentPc=stack.#source('code','100adb5f');throw new Error('Unowned SharedBase attach continuation after initializer result '+frame.initializerResult);}
          pc=continuation.address;continue;
        }else throw new Error('Unowned SharedBase initializer opcode '+opcode);
        pc=next;
      }
    }catch(error){const current=stack.#currentPc?stack.#record(stack.#currentPc).provenance:null;stack.#phase='blocked';stack.#boundary??=reason(error)+(current?.kind==='source'?' at '+current.address:'');return unknown(stack.#boundary);}
  }
  static beginSharedArgvAllocation(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    try{NativeX86ThreadStack.#sharedArgvProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#sharedArgvProof(stack,controller);if(input.stage!=='allocate'||!frame.parserReturned||!frame.allocationPending||frame.mallocLowerPending||frame.allocationReturned||!frame.queryCounts)throw new Error('Actual pending SharedBase argv allocation required');
      const esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),bytes=stack.#numeric(stack.#load(stack.#stack,esp+4),4);if(esp!==frame.ebp-32||bytes!==frame.queryCounts.count*4+frame.queryCounts.bytes)throw new Error('Actual original argv allocation size required');
      stack.#push(stack.#load(stack.#bank,stack.#reg('ESI')));stack.#push(stack.#load(stack.#bank,stack.#reg('EDI')));stack.#store(stack.#bank,stack.#reg('ESI'),stack.#mint(0,0xffffffff));stack.#logicalFlags(0,0xffffffff,4);stack.#push(stack.#load(stack.#stack,esp+4));stack.#call('100aeed8','100aeedd');frame.mallocLowerPending=true;stack.#trace.push('100aaaf6.argvMallocTranslatedLower');return known(bytes);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedArgvAllocation(stack:NativeX86ThreadStack,controller:object):NativeValue<boolean>{
    try{NativeX86ThreadStack.#sharedArgvProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#sharedArgvProof(stack,controller);if(input.stage!=='allocate'||!frame.allocationPending||!frame.mallocLowerPending||frame.allocationReturned)throw new Error('Actual original argv malloc return required');
      const pop=(name:NativeX86Register)=>{const esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg(name),stack.#load(stack.#stack,esp));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(esp+4));};
      const result=input.allocation?(stack.#sharedLocalPhysical(input.allocation),stack.#mint(0,0,{kind:'shared-local',fields:input.allocation})):stack.#mint(0,0xffffffff);
      stack.#store(stack.#bank,stack.#reg('EAX'),result);stack.#ret();frame.mallocLowerPending=false;stack.#store(stack.#bank,stack.#reg('EDI'),result);stack.#flags(input.allocation?0:0x40,0x841);pop('ECX');
      if(!input.allocation){stack.#arithmeticFlags(input.retryDelay,0,input.retryDelay,4,true);if(input.retryDelay>0){stack.#push(stack.#load(stack.#bank,stack.#reg('ESI')));stack.#call('100aeeed','100aeef3');throw new Error('Unowned SharedBase malloc Sleep retry at 100aeeed');}}
      stack.#store(stack.#bank,stack.#reg('EAX'),stack.#load(stack.#bank,stack.#reg('EDI')));pop('EDI');pop('ESI');stack.#ret();
      stack.#store(stack.#bank,stack.#reg('ESI'),result);stack.#flags(input.allocation?0:0x40,0x40);pop('ECX');frame.allocationPending=false;frame.allocationReturned=true;stack.#trace.push('100c0c28.argvMallocReturned');return known(input.allocation!==null);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static beginSharedArgvParseFill(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#sharedArgvProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#sharedArgvProof(stack,controller);if(input.stage!=='fill'||!input.allocation||!frame.allocationReturned||frame.fillPending||frame.fillStarted||!frame.queryCounts||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.ebp-24)throw new Error('Actual source argv filling entry required');
      stack.#store(stack.#bank,stack.#reg('EDX'),stack.#load(stack.#stack,frame.ebp-4));stack.#store(stack.#bank,stack.#reg('EAX'),stack.#stackWord(frame.ebp-8));stack.#push(stack.#load(stack.#bank,stack.#reg('EAX')));
      const allocation=stack.#load(stack.#bank,stack.#reg('ESI')),record=stack.#record(allocation).provenance;if(record?.kind!=='shared-local'||record.fields!==input.allocation||(record.offset??0)!==0)throw new Error('Actual retained argv allocation capability required');
      stack.#store(stack.#bank,stack.#reg('EDI'),stack.#offsetWord(allocation,frame.queryCounts.count*4));stack.#flags(0,0);stack.#push(stack.#load(stack.#bank,stack.#reg('EDI')));stack.#push(allocation);stack.#store(stack.#bank,stack.#reg('EDI'),stack.#stackWord(frame.ebp-12));stack.#call('100c0c3d','100c0c42');frame.fillPending=true;stack.#trace.push('100c0c3d.argvFillPending');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static returnSharedArgvFrame(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    try{NativeX86ThreadStack.#sharedArgvProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#sharedArgvProof(stack,controller);if(input.stage!=='return'||!frame.allocationReturned||frame.returned||frame.fillPending)throw new Error('Actual source setargv return required');
      let result:number;
      if(input.allocation){if(!frame.fillReturned||!frame.queryCounts||frame.argumentCount.readUnsigned(0)!==frame.queryCounts.count||frame.byteCount.readUnsigned(0)!==frame.queryCounts.bytes)throw new Error('Actual matching argv count/fill outputs required');
        const count=frame.argumentCount.readUnsigned(0);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(count,0xffffffff));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(frame.ebp-24));stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(count-1,0xffffffff));stack.#arithmeticFlags(count,1,count-1,4,true);
        input.argc.writeUnsigned(0,count-1);input.argv.pointer<NativeBytePointer>(0).set(Object.freeze({fields:input.allocation,offset:0}));stack.#trace.push('100c0c49.publishArgc');stack.#trace.push('100c0c4e.publishArgv');result=0;stack.#logicalFlags(0,0xffffffff,4);
      }else{if(frame.fillStarted)throw new Error('NULL argv allocation cannot have filling effects');result=-1;stack.#logicalFlags(0xffffffff,0xffffffff,4);}
      stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(result,0xffffffff));
      const pop=(name:NativeX86Register)=>{const esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg(name),stack.#load(stack.#stack,esp));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(esp+4));};
      if(stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.ebp-24)throw new Error('Actual setargv saved-register stack required');for(const name of ['EDI','ESI','EBX'] as const)pop(name);stack.#store(stack.#bank,stack.#reg('ESP'),stack.#load(stack.#bank,stack.#reg('EBP')));pop('EBP');stack.#ret();frame.returned=true;frame.result=result;stack.#phase='returned';stack.#trace.push('100c0c5f.setargvReturned');return known(result);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static beginSharedArgvEnvironment(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#sharedArgvProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#sharedArgvProof(stack,controller);if(input.stage!=='return'||input.result!==0||!frame.returned||frame.result!==0||frame.environmentPending||stack.#phase!=='returned')throw new Error('Actual successful setargv caller continuation required');stack.#logicalFlags(0,0xffffffff,4);stack.#call('100adb4f','100adb54');frame.environmentPending=true;stack.#phase='running';return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static #setMultibyteProof(stack:NativeX86ThreadStack,controller:object){
    const admitted=NativeSharedCrtOwner.setMultibyteStackArgumentsForPlatform(stack.#platform,controller);if(!admitted.known)throw new Error(admitted.reason);if(graphs.get(stack.#platform)!==stack||stack.#setMultibyteFrame?.controller!==controller||stack.#setMultibyteFrame.returned||stack.#binding||!['running','returned'].includes(stack.#phase))throw new Error('Actual active SharedBase setmbcp frame required');const selected=NativeRuntimePlatform.threadStackSelectionForPlatform(stack.#platform);if(!selected.known||selected.value!==stack.#selection)throw new Error('Actual live setmbcp stack required');stack.#physical(stack.#stack);stack.#physical(stack.#bank);return {input:admitted.value,frame:stack.#setMultibyteFrame};
  }
  static beginSharedSetMultibyteFrame(platform:NativeRuntimePlatform,controller:object):NativeValue<NativeX86ThreadStack>{
    const admitted=NativeSharedCrtOwner.setMultibyteStackArgumentsForPlatform(platform,controller);if(!admitted.known)return admitted;const found=NativeX86ThreadStack.forPlatform(platform);if(!found.known)return found;const stack=found.value,nested=stack.#sharedArgvFrame?.multibytePending&&stack.#phase==='running';if(admitted.value.stage!=='enter'||(!nested&&stack.#phase!=='cold')||stack.#binding||stack.#setMultibyteFrame||stack.#configurationFrame)return unknown('Actual source setmbcp entry required');if(nested){const proof=NativeSharedCrtOwner.argvStackArgumentsForPlatform(platform,stack.#sharedArgvFrame!.controller);if(!proof.known)return proof;if(proof.value.stage!=='multibyte')return unknown('Actual setargv multibyte caller required');}
    try{stack.#physical(stack.#stack);stack.#physical(stack.#bank);stack.#phase='running';const input=admitted.value;stack.#push(stack.#mint(-3,0xffffffff));stack.#call('100b185f','100b1864');stack.#push(stack.#mint(20,0xffffffff));stack.#push(stack.#mint(0,0,{kind:'source',type:'image',address:'100f8be0',fields:input.scope}));stack.#call('100b16c1','100b16c6');stack.#push(stack.#source('code','100aec00'));const oldFs=stack.#load(stack.#bank,32);stack.#push(oldFs);const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),size=stack.#numeric(stack.#load(stack.#stack,cursor+16),4);stack.#store(stack.#stack,cursor+16,stack.#load(stack.#bank,stack.#reg('EBP')));const ebp=cursor+16;stack.#store(stack.#bank,stack.#reg('EBP'),stack.#stackWord(ebp));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(cursor-size));for(const name of ['EBX','ESI','EDI'] as const)stack.#push(stack.#load(stack.#bank,stack.#reg(name)));
      const cookie=stack.#mint(input.cookie,0xffffffff),scope=stack.#load(stack.#stack,ebp-4),a=stack.#record(scope),b=stack.#record(cookie);const encoded=stack.#mint(a.value^b.value,a.mask&b.mask,{kind:'xor',left:scope,right:cookie});stack.#store(stack.#stack,ebp-4,encoded);const base=stack.#stackWord(ebp),c=stack.#record(base);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(b.value^c.value,b.mask&c.mask,{kind:'xor',left:cookie,right:base}));stack.#push(stack.#load(stack.#bank,stack.#reg('EAX')));stack.#store(stack.#stack,ebp-24,stack.#load(stack.#bank,stack.#reg('ESP')));stack.#push(stack.#load(stack.#stack,ebp-8));stack.#store(stack.#stack,ebp-4,stack.#mint(-2,0xffffffff));stack.#store(stack.#stack,ebp-8,encoded);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#stackWord(ebp-16));stack.#store(stack.#bank,32,stack.#stackWord(ebp-16));stack.#ret();stack.#setMultibyteFrame={controller,ebp,oldFs,pendingInstallation:false,returned:false,counterCursor:0,counter:null,global:false,lockPending:false,locked:false,publication:false,unlockPending:false};stack.#store(stack.#stack,ebp-32,stack.#mint(-1,0xffffffff));stack.#call('100b16ca','100b16cf');stack.#trace.push('100aeb68.setmbcpSehProlog');return known(stack);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedSetMultibytePtd(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#setMultibyteProof(stack,controller);if(input.stage!=='ptd'||!input.ptd)throw new Error('Actual setmbcp PTD return required');const ptd=stack.#mint(0,0,{kind:'shared-local',fields:input.ptd});stack.#ret();stack.#store(stack.#bank,stack.#reg('EAX'),ptd);stack.#store(stack.#bank,stack.#reg('EDI'),ptd);stack.#store(stack.#stack,frame.ebp-36,ptd);for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#call('100b16d4','100b16d9');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedSetMultibyteWarmup(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input}=NativeX86ThreadStack.#setMultibyteProof(stack,controller);if(input.stage!=='multibyte'||!input.ptd||!input.old||input.ptd.pointer<NativeHeapObjectViews>(104).get()!==input.old)throw new Error('Actual setmbcp multibyte warmup required');stack.#ret();stack.#store(stack.#bank,stack.#reg('EBX'),stack.#mint(0,0,{kind:'shared-local',fields:input.old}));stack.#store(stack.#bank,stack.#reg('ESI'),stack.#mint(-3,0xffffffff));for(const name of ['EAX','ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#call('100b16df','100b16e4');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedSetMultibyteCodePage(stack:NativeX86ThreadStack,controller:object,codePage:number):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#setMultibyteProof(stack,controller);if(input.stage!=='codepage'||!input.old||codePage!==1252||codePage===input.old.readUnsigned(4))throw new Error('Actual selected changed setmbcp code page required');stack.#ret();stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(codePage,0xffffffff));stack.#store(stack.#stack,frame.ebp+8,stack.#mint(codePage,0xffffffff));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#arithmeticFlags(codePage,input.old.readUnsigned(4),(codePage-input.old.readUnsigned(4))>>>0,4,true);stack.#push(stack.#mint(544,0xffffffff));stack.#call('100b16f5','100b16fa');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedSetMultibyteAllocation(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input}=NativeX86ThreadStack.#setMultibyteProof(stack,controller);if(input.stage!=='allocate'||!input.candidate||input.candidate.bytes.length!==544)throw new Error('Actual successful setmbcp allocation required');const candidate=stack.#mint(0,0,{kind:'shared-local',fields:input.candidate});stack.#ret();const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ECX'),stack.#load(stack.#stack,at));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));stack.#store(stack.#bank,stack.#reg('EAX'),candidate);stack.#store(stack.#bank,stack.#reg('EBX'),candidate);stack.#flags(0,0);return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static prepareSharedSetMultibyteConfiguration(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#setMultibyteProof(stack,controller);if(input.stage!=='configuration'||!input.candidate||!input.old||input.candidate.readUnsigned(0)!==0||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.ebp-52)throw new Error('Actual source setmbcp candidate copy required');for(let at=4;at<544;at+=4)if(input.candidate.readUnsigned(at)!==input.old.readUnsigned(at))throw new Error('Actual full setmbcp candidate copy required');stack.#store(stack.#bank,stack.#reg('ECX'),stack.#mint(0,0xffffffff));stack.#store(stack.#bank,stack.#reg('ESI'),stack.#mint(0,0,{kind:'shared-local',fields:input.old,offset:544}));stack.#store(stack.#bank,stack.#reg('EDI'),stack.#mint(0,0,{kind:'shared-local',fields:input.candidate,offset:544}));stack.#logicalFlags(0,0xffffffff,4);stack.#trace.push('100b170f.setmbcpCandidateCopy');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static beginSharedSetMultibyteInstallation(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#setMultibyteProof(stack,controller);if(input.stage!=='installation'||frame.pendingInstallation||!stack.#configurationFrame?.returned||!input.ptd||!input.old||input.ptd.pointer<NativeHeapObjectViews>(104).get()!==input.old||stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')))!==frame.ebp||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.ebp-60||stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4)!==0)throw new Error('Actual returned setmbcp configuration required');for(let i=0;i<2;i++){const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ECX'),stack.#load(stack.#stack,at));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));}stack.#store(stack.#stack,frame.ebp-32,stack.#load(stack.#bank,stack.#reg('EAX')));stack.#logicalFlags(0,0xffffffff,4);stack.#store(stack.#bank,stack.#reg('ESI'),stack.#load(stack.#stack,frame.ebp-36));stack.#push(stack.#mint(0,0,{kind:'shared-local',fields:input.old}));stack.#call('100b1730','100b1736');frame.pendingInstallation=true;stack.#phase='running';stack.#trace.push('100b171d.setmbcpConfigurationReturn');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static bindSharedSetMultibyteCounter(stack:NativeX86ThreadStack,controller:object,call:object):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#setMultibyteProof(stack,controller),admitted=NativeSharedCrtOwner.interlockedArgumentsForPlatform(stack.#platform,call);if(!admitted.known)return admitted;const counter=admitted.value,roles=['oldPtd','candidatePtd','oldGlobal','candidateGlobal'] as const;if(input.stage!=='installation'||frame.counter||roles[frame.counterCursor]!==counter.role||!input.candidate||!input.ptd)throw new Error('Actual source setmbcp counter sequence required');const old=counter.role==='oldPtd'||counter.role==='oldGlobal';if(counter.delta!==(old?-1:1)||counter.record!==(old?input.old:input.candidate))throw new Error('Actual selected setmbcp counter operand required');
      if(counter.role==='oldPtd'){if(!frame.pendingInstallation)throw new Error('Actual pending PTD decrement required');}
      else{if(counter.role==='oldGlobal'&&(!frame.locked||!frame.publication))throw new Error('Actual locked global publication required');if(counter.role==='candidateGlobal'&&input.global!==input.candidate)throw new Error('Actual published candidate pointer required');if(counter.role==='candidatePtd')stack.#store(stack.#bank,stack.#reg('EDI'),stack.#mint(0,0));stack.#push(stack.#mint(0,0,{kind:'shared-local',fields:counter.record}));const site=counter.role==='candidatePtd'?'100b1755':counter.role==='oldGlobal'?'100b17e7':'100b180b',returned=counter.role==='candidatePtd'?'100b1757':counter.role==='oldGlobal'?'100b17ed':'100b180d';stack.#call(site,returned);}
      frame.counter={call,role:counter.role};return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedSetMultibyteCounter(stack:NativeX86ThreadStack,controller:object,call:object,result:Readonly<{value:number;before:number;after:number}>):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#setMultibyteProof(stack,controller),actual=NativeRuntimePlatform.canonicalSharedInterlockedReturn(stack.#platform,call),admitted=NativeSharedCrtOwner.interlockedArgumentsForPlatform(stack.#platform,call);if(!actual.known)return actual;if(!admitted.known)return admitted;if(actual.value!==result||frame.counter?.call!==call||result.after!==((result.before+admitted.value.delta)>>>0)||admitted.value.fields.readUnsigned(0)!==result.after)throw new Error('Actual setmbcp interlocked normal return required');const role=frame.counter.role;stack.#ret(4);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(result.after,0xffffffff));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));frame.counter=null;frame.counterCursor++;
      if(role==='oldPtd'||role==='oldGlobal'){stack.#logicalFlags(result.after,0xffffffff,4);if(result.value===0&&admitted.value.record!==input.initial)throw new Error('Unowned SharedBase dynamic old multibyte free');if(role==='oldPtd'){input.ptd!.pointer<NativeHeapObjectViews>(104).set(input.candidate!);frame.pendingInstallation=false;stack.#trace.push('100b174b.installPtdMultibyte');}}
      else if(role==='candidatePtd'){const own=input.ptd!.readUnsigned(0x70,1)&2;stack.#logicalFlags(own,0xff,1);frame.global=own===0&&(input.mask&1)===0;if(own===0)stack.#logicalFlags(input.mask&1,0xff,1);if(frame.global){stack.#push(stack.#mint(13,0xffffffff));stack.#call('100b1770','100b1775');frame.lockPending=true;}}
      else{stack.#store(stack.#stack,frame.ebp-4,stack.#mint(-2,0xffffffff));stack.#call('100b1814','100b1819');stack.#push(stack.#mint(13,0xffffffff));stack.#call('100b181d','100b1822');frame.unlockPending=true;}
      stack.#trace.push('setmbcp.counterReturn.'+role);return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedSetMultibyteLock(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {frame}=NativeX86ThreadStack.#setMultibyteProof(stack,controller);if(!frame.lockPending||frame.locked)throw new Error('Actual pending setmbcp lock required');stack.#ret();const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ECX'),stack.#load(stack.#stack,at));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));stack.#store(stack.#stack,frame.ebp-4,stack.#mint(0,0xffffffff));frame.lockPending=false;frame.locked=true;return known(undefined);}catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedSetMultibytePublication(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#setMultibyteProof(stack,controller);if(!frame.locked||frame.counterCursor!==2||frame.publication||!input.candidate)throw new Error('Actual locked setmbcp candidate publication required');for(const [at,from] of [[12,4],[16,8],[20,12]] as const){const value=input.candidate.readUnsigned(from);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(value,0xffffffff));NativeHeapObjectViews.prototype.writeUnsigned.call(input.published,at,value);}
      for(const [target,count,width,source] of [[input.published,5,2,16],[input.types,257,1,28],[input.cases,256,1,285]] as const){stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(0,0xffffffff));for(let index=0;index<count;index++){stack.#store(stack.#stack,frame.ebp-28,stack.#mint(index,0xffffffff));stack.#arithmeticFlags(index,count,(index-count)>>>0,4,true);const value=input.candidate.readUnsigned(source+index*width,width),old=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))),mask=width===2?0xffff:0xff;stack.#store(stack.#bank,stack.#reg('ECX'),stack.#mint((old.value&~mask)|value,old.mask|mask));NativeHeapObjectViews.prototype.writeUnsigned.call(target,index*width,value,width);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(index+1,0xffffffff));stack.#trace.push('setmbcp.publish.'+width+'.'+count+'.'+index);}stack.#store(stack.#stack,frame.ebp-28,stack.#mint(count,0xffffffff));stack.#arithmeticFlags(count,count,0,4,true);}
      frame.publication=true;return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedSetMultibyteUnlock(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {frame}=NativeX86ThreadStack.#setMultibyteProof(stack,controller);if(!frame.locked||!frame.unlockPending||frame.counterCursor!==4)throw new Error('Actual pending setmbcp unlock required');stack.#ret();const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ECX'),stack.#load(stack.#stack,at));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));stack.#ret();frame.locked=false;frame.unlockPending=false;return known(undefined);}catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static returnSharedSetMultibyteFrame(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#setMultibyteProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#setMultibyteProof(stack,controller);if(input.stage!=='return'||frame.pendingInstallation||frame.counter||frame.locked||frame.lockPending||frame.unlockPending||frame.counterCursor!==(frame.global?4:2)||stack.#address(stack.#load(stack.#bank,32))!==frame.ebp-16||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.ebp-52)throw new Error('Actual completed setmbcp normal path required');frame.scopeAtReturn=stack.#load(stack.#stack,frame.ebp-8);frame.cookieAtReturn=stack.#load(stack.#stack,frame.ebp-52);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#load(stack.#stack,frame.ebp-32));stack.#call('100b184e','100b1853');const pop=()=>{const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),word=stack.#load(stack.#stack,at);stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));return word;};const oldFs=stack.#load(stack.#stack,frame.ebp-16);if(oldFs!==frame.oldFs)throw new Error('Actual retained incoming FS record required');stack.#store(stack.#bank,stack.#reg('ECX'),oldFs);stack.#store(stack.#bank,32,oldFs);const returned=pop();stack.#store(stack.#bank,stack.#reg('ECX'),returned);pop();for(const name of ['EDI','ESI','EBX'] as const)stack.#store(stack.#bank,stack.#reg(name),pop());stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(frame.ebp));stack.#store(stack.#bank,stack.#reg('EBP'),pop());stack.#push(returned);stack.#ret();stack.#ret();stack.#store(stack.#bank,stack.#reg('ECX'),pop());stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(0,0xffffffff));stack.#logicalFlags(0,0xffffffff,4);frame.returned=true;stack.#phase='returned';stack.#trace.push('100b1853.setmbcpNormalReturn');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static #configurationProof(stack:NativeX86ThreadStack,controller:object){
    const admitted=NativeSharedCrtOwner.configurationStackArgumentsForPlatform(stack.#platform,controller);if(!admitted.known)throw new Error(admitted.reason);
    if(graphs.get(stack.#platform)!==stack||stack.#configurationFrame?.controller!==controller||stack.#configurationFrame.returned||stack.#binding||!['running','returned'].includes(stack.#phase))throw new Error('Actual active SharedBase configuration frame required');
    const selected=NativeRuntimePlatform.threadStackSelectionForPlatform(stack.#platform);if(!selected.known||selected.value!==stack.#selection)throw new Error('Actual live configuration stack required');stack.#physical(stack.#stack);stack.#physical(stack.#bank);return {input:admitted.value,frame:stack.#configurationFrame};
  }
  static beginSharedConfigurationFrame(platform:NativeRuntimePlatform,controller:object):NativeValue<{stack:NativeX86ThreadStack;info:NativeHeapObjectViews}>{
    const admitted=NativeSharedCrtOwner.configurationStackArgumentsForPlatform(platform,controller);if(!admitted.known)return admitted;const found=NativeX86ThreadStack.forPlatform(platform);if(!found.known)return found;const stack=found.value;
    const nested=stack.#setMultibyteFrame&&stack.#phase==='running';
    if(admitted.value.stage!=='enter'||(!nested&&stack.#phase!=='cold')||stack.#binding||stack.#configurationFrame||stack.#caseFrame)return unknown('Actual source configuration entry required');
    if(nested){const proof=NativeSharedCrtOwner.setMultibyteStackArgumentsForPlatform(platform,stack.#setMultibyteFrame!.controller);if(!proof.known)return proof;if(proof.value.stage!=='configuration'||proof.value.candidate!==admitted.value.fields)return unknown('Actual setmbcp configuration caller required');}
    try{
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);stack.#phase='running';const input=admitted.value,candidate=stack.#mint(0,0,{kind:'shared-local',fields:input.fields});stack.#push(candidate);stack.#push(stack.#mint(input.input,0xffffffff));stack.#call('100b1718','100b171d');stack.#push(stack.#load(stack.#bank,stack.#reg('EBP')));
      const ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('EBP'),stack.#stackWord(ebp));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(ebp-32));const cookie=stack.#mint(input.cookie,0xffffffff),base=stack.#stackWord(ebp),a=stack.#record(cookie),b=stack.#record(base);stack.#store(stack.#stack,ebp-4,stack.#mint(a.value^b.value,a.mask&b.mask,{kind:'xor',left:cookie,right:base}));
      stack.#push(stack.#load(stack.#bank,stack.#reg('EBX')));stack.#store(stack.#bank,stack.#reg('EBX'),candidate);stack.#push(stack.#load(stack.#bank,stack.#reg('ESI')));stack.#store(stack.#bank,stack.#reg('ESI'),stack.#load(stack.#stack,ebp+8));stack.#push(stack.#load(stack.#bank,stack.#reg('EDI')));
      const info=new NativeHeapObjectViews(stack.#stack.backing,ebp-24,20);stack.#configurationFrame={controller,ebp,info,candidate,codePage:null,memsetPending:false,pending:null,returned:false};stack.#call('100b14be','100b14c3');stack.#trace.push('100b14a5.configurationFrame');return known({stack,info});
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedConfigurationCodePage(stack:NativeX86ThreadStack,controller:object,codePage:number):NativeValue<void>{
    try{NativeX86ThreadStack.#configurationProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#configurationProof(stack,controller);if(input.stage!=='body'||frame.codePage!==null||codePage!==input.input)throw new Error('Actual selected configuration code page required');
      // The lower getSystemCP body is translated by its retained CRT owner.
      stack.#ret();frame.codePage=codePage;stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(codePage,0xffffffff));stack.#store(stack.#bank,stack.#reg('EDI'),stack.#mint(codePage,0xffffffff));stack.#store(stack.#bank,stack.#reg('ESI'),stack.#mint(0,0xffffffff));stack.#store(stack.#stack,frame.ebp+8,stack.#mint(codePage,0xffffffff));stack.#store(stack.#stack,frame.ebp-28,stack.#mint(0,0xffffffff));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static compareSharedConfigurationCodePage(stack:NativeX86ThreadStack,controller:object,offset:number):NativeValue<void>{
    try{NativeX86ThreadStack.#configurationProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#configurationProof(stack,controller);if(input.stage!=='body'||frame.pending||frame.memsetPending||frame.codePage===null||offset<0||offset>=240||offset%48!==0||stack.#numeric(stack.#load(stack.#stack,frame.ebp-28),4)!==offset/48)throw new Error('Actual source configuration table iteration required');const entry=input.table.readUnsigned(offset);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(offset,0xffffffff));stack.#arithmeticFlags(entry,frame.codePage,(entry-frame.codePage)>>>0,4,true);if(entry===frame.codePage)return known(undefined);stack.#store(stack.#stack,frame.ebp-28,stack.#mint(offset/48+1,0xffffffff));stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(offset+48,0xffffffff));stack.#arithmeticFlags(offset+48,240,(offset+48-240)>>>0,4,true);stack.#trace.push('100b14e1.configurationTableCompare.'+offset);return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static beginSharedConfigurationImport(stack:NativeX86ThreadStack,controller:object,call:NativeArgvNlsCallGrant):NativeValue<void>{
    try{const {input,frame}=NativeX86ThreadStack.#configurationProof(stack,controller),nls=NativeSharedCrtOwner.nlsArgumentsForPlatform(stack.#platform,call);if(!nls.known)return nls;const info=nls.value.kind==='GetCPInfo';if(input.stage!=='body'||frame.pending||frame.codePage===null||!['IsValidCodePage','GetCPInfo'].includes(nls.value.kind)||nls.value.scalar!==(info?frame.codePage:frame.codePage&0xffff)||(info&&nls.value.fields!==frame.info))throw new Error('Actual configuration NLS import required');
      if(info)stack.#push(stack.#stackWord(frame.ebp-24));stack.#push(stack.#mint(nls.value.scalar,0xffffffff));stack.#call(info?'100b1529':'100b1516',info?'100b152f':'100b151c');frame.pending={call,bytes:info?8:4,info};return known(undefined);
    }catch(error){return unknown(reason(error));}
  }
  static finishSharedConfigurationImport(stack:NativeX86ThreadStack,controller:object,call:NativeArgvNlsCallGrant,result:number):NativeValue<void>{
    try{const {frame}=NativeX86ThreadStack.#configurationProof(stack,controller),normal=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform(stack.#platform,call);if(!normal.known)return normal;if(frame.pending?.call!==call||normal.value.kind!=='scalar'||normal.value.value!==result)throw new Error('Actual configuration NLS normal return required');const pending=frame.pending;if(pending.info)stack.#invalidateRange(stack.#stack,frame.ebp-24,20);stack.#ret(pending.bytes);frame.pending=null;stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(result,0xffffffff));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#logicalFlags(result,0xffffffff,4);return known(undefined);
    }catch(error){return unknown(reason(error));}
  }
  static beginSharedConfigurationMemset(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#configurationProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#configurationProof(stack,controller);if(input.stage!=='body'||frame.pending||frame.memsetPending||frame.codePage!==1252||frame.info.readUnsigned(0)!==1||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.ebp-44)throw new Error('Actual single-byte configuration memset required');stack.#push(stack.#mint(257,0xffffffff));stack.#push(stack.#load(stack.#bank,stack.#reg('ESI')));const pointer=stack.#mint(0,0,{kind:'shared-local',fields:input.fields,offset:28});stack.#store(stack.#bank,stack.#reg('EAX'),pointer);stack.#push(pointer);stack.#call('100b1541','100b1546');frame.memsetPending=true;return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedConfigurationMemset(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#configurationProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#configurationProof(stack,controller);if(input.stage!=='body'||!frame.memsetPending)throw new Error('Actual pending configuration memset required');for(let index=0;index<257;index++)if(input.fields.readUnsigned(28+index,1)!==0)throw new Error('Actual configuration memset output required');stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(0,0,{kind:'shared-local',fields:input.fields,offset:28}));stack.#ret();const caller=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(caller+12));stack.#store(stack.#bank,stack.#reg('EDX'),stack.#mint(1,0xffffffff));stack.#store(stack.#bank,stack.#reg('ECX'),stack.#mint(0,0));stack.#arithmeticFlags(1,1,0,4,true);frame.memsetPending=false;stack.#trace.push('100b1549.configurationMemsetReturn');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static prepareSharedConfigurationCase(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#configurationProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#configurationProof(stack,controller);if(input.stage!=='case'||frame.pending||frame.memsetPending||frame.codePage!==1252||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.ebp-44||input.fields.readUnsigned(4)!==1252||input.fields.readUnsigned(8)!==0||frame.info.readUnsigned(0)!==1)throw new Error('Actual completed single-byte configuration body required');
      // The retained owner translates memset and the source STOSD stores.
      stack.#store(stack.#bank,stack.#reg('EBX'),frame.candidate);stack.#store(stack.#bank,stack.#reg('ESI'),frame.candidate);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(0,0xffffffff));stack.#store(stack.#bank,stack.#reg('ECX'),stack.#mint(0,0));stack.#store(stack.#bank,stack.#reg('EDX'),stack.#mint(1,0xffffffff));stack.#store(stack.#bank,stack.#reg('EDI'),stack.#mint(0,0,{kind:'shared-local',fields:input.fields,offset:28}));stack.#logicalFlags(0,0xffffffff,4);stack.#trace.push('100b1612.configurationCaseEntry');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static returnSharedConfigurationFrame(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#configurationProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{const {input,frame}=NativeX86ThreadStack.#configurationProof(stack,controller);if(input.stage!=='return'||frame.pending||!stack.#caseFrame?.returned||stack.#phase!=='returned'||stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')))!==frame.ebp||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.ebp-44||stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4)!==0)throw new Error('Actual returned configuration case body required');
      const relation=stack.#record(stack.#load(stack.#stack,frame.ebp-4)).provenance;if(relation?.kind!=='xor'||stack.#address(relation.right)!==frame.ebp)throw new Error('Actual configuration cookie relation required');const pop=(name:'EDI'|'ESI'|'EBX'|'EBP')=>{const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg(name),stack.#load(stack.#stack,at));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));};pop('EDI');pop('ESI');stack.#store(stack.#bank,stack.#reg('ECX'),relation.left);pop('EBX');stack.#call('100b1677','100b167c');const cookie=stack.#numeric(relation.left,4);if(cookie!==input.cookie)throw new Error('Unowned configuration cookie failure report');stack.#arithmeticFlags(cookie,cookie,0,4,true);stack.#ret();stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(frame.ebp));pop('EBP');stack.#ret();frame.returned=true;stack.#trace.push('100b167d.configurationReturn');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static #caseProof(stack:NativeX86ThreadStack,controller:object){
    const admitted=NativeSharedCrtOwner.caseStackArgumentsForPlatform(stack.#platform,controller);if(!admitted.known)throw new Error(admitted.reason);
    if(graphs.get(stack.#platform)!==stack||stack.#caseFrame?.controller!==controller||stack.#caseFrame.returned||!['running','returned'].includes(stack.#phase)||stack.#binding)throw new Error('Actual active enclosing SharedBase case frame required');
    const selected=NativeRuntimePlatform.threadStackSelectionForPlatform(stack.#platform);if(!selected.known||selected.value!==stack.#selection)throw new Error('Actual live case stack required');stack.#physical(stack.#stack);stack.#physical(stack.#bank);return {input:admitted.value,frame:stack.#caseFrame};
  }
  static beginSharedCaseFrame(platform:NativeRuntimePlatform,controller:object):NativeValue<{stack:NativeX86ThreadStack;info:NativeHeapObjectViews;input:NativeHeapObjectViews;types:NativeHeapObjectViews;lower:NativeHeapObjectViews;upper:NativeHeapObjectViews}>{
    const admitted=NativeSharedCrtOwner.caseStackArgumentsForPlatform(platform,controller);if(!admitted.known)return admitted;const found=NativeX86ThreadStack.forPlatform(platform);if(!found.known)return found;const stack=found.value;
    const nested=stack.#configurationFrame&&!stack.#configurationFrame.returned&&stack.#phase==='running';
    if(admitted.value.stage!=='enter'||(!nested&&stack.#phase!=='cold')||stack.#binding||stack.#caseFrame)return unknown('Actual source case-entry graph required');
    if(nested){const proof=NativeSharedCrtOwner.configurationStackArgumentsForPlatform(platform,stack.#configurationFrame!.controller);if(!proof.known)return proof;if(proof.value.stage!=='case'||proof.value.fields!==admitted.value.fields)return unknown('Actual configuration case caller required');}
    try{
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);stack.#phase='running';const candidate=stack.#mint(0,0,{kind:'shared-local',fields:admitted.value.fields});stack.#store(stack.#bank,stack.#reg('EBX'),candidate);stack.#store(stack.#bank,stack.#reg('ESI'),candidate);
      stack.#call('100b1614','100b1619');stack.#push(stack.#load(stack.#bank,stack.#reg('EBP')));const originalEbp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),ebp=originalEbp-0x49c;
      stack.#store(stack.#bank,stack.#reg('EBP'),stack.#stackWord(ebp));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(originalEbp-0x51c));
      const cookie=stack.#mint(admitted.value.cookie,0xffffffff),base=stack.#stackWord(ebp),a=stack.#record(cookie),b=stack.#record(base);stack.#store(stack.#stack,ebp+0x498,stack.#mint(a.value^b.value,a.mask&b.mask,{kind:'xor',left:cookie,right:base}));
      for(const name of ['EBX','EDI'] as const)stack.#push(stack.#load(stack.#bank,stack.#reg(name)));
      const alias=(offset:number,size:number)=>new NativeHeapObjectViews(stack.#stack.backing,ebp+offset,size),info=alias(-0x7c,20),input=alias(0x398,256),types=alias(-0x68,512),upper=alias(0x198,256),lower=alias(0x298,256);
      stack.#caseFrame={controller,ebp,originalEbp,info,input,types,lower,upper,cpCall:null,deferredBytes:0,tableIndex:0,wrapper:null,returned:false};stack.#trace.push('100b11fd.enclosingCaseFrame');return known({stack,info,input,types,lower,upper});
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static beginSharedCaseCpInfo(stack:NativeX86ThreadStack,controller:object,call:NativeArgvNlsCallGrant):NativeValue<void>{
    try{const {input,frame}=NativeX86ThreadStack.#caseProof(stack,controller),nls=NativeSharedCrtOwner.nlsArgumentsForPlatform(stack.#platform,call);if(!nls.known)return nls;if(input.stage!=='enter'||frame.cpCall||nls.value.kind!=='GetCPInfo'||nls.value.fields!==frame.info)throw new Error('Actual case CPInfo import required');stack.#push(stack.#stackWord(frame.ebp-0x7c));stack.#push(stack.#mint(nls.value.scalar,0xffffffff));stack.#call('100b1221','100b1227');frame.cpCall=call;return known(undefined);}catch(error){return unknown(reason(error));}
  }
  static finishSharedCaseCpInfo(stack:NativeX86ThreadStack,controller:object,call:NativeArgvNlsCallGrant,result:number):NativeValue<void>{
    try{const {frame}=NativeX86ThreadStack.#caseProof(stack,controller),normal=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform(stack.#platform,call);if(!normal.known)return normal;if(frame.cpCall!==call||normal.value.kind!=='scalar'||normal.value.value!==result)throw new Error('Actual case CPInfo return required');stack.#invalidateRange(stack.#stack,frame.ebp-0x7c,20);stack.#ret(8);frame.cpCall=null;stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(result,0xffffffff));stack.#store(stack.#bank,stack.#reg('EDI'),stack.#mint(256,0xffffffff));stack.#logicalFlags(result,0xffffffff,4);return known(undefined);}catch(error){return unknown(reason(error));}
  }
  static beginSharedCaseWrapper(stack:NativeX86ThreadStack,controller:object):NativeValue<NativeHeapObjectViews>{
    try{NativeX86ThreadStack.#caseProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{
      const {input,frame}=NativeX86ThreadStack.#caseProof(stack,controller),stage=input.stage,item=input.state;if(!item||!['classification','lower','upper'].includes(stage)||frame.wrapper||frame.cpCall||stack.#phase!=='running')throw new Error('Actual source case-wrapper stage required');
      const value=(n:number)=>stack.#mint(n,0xffffffff),pointer=(fields:NativeHeapObjectViews)=>stack.#stackWord(fields.bytes.byteOffset-stack.#stack.bytes.byteOffset),classification=stage==='classification';
      const words=classification?[value(0),value(input.fields.readUnsigned(12)),value(input.fields.readUnsigned(4)),pointer(item.types),value(256),pointer(item.input),value(1),value(0)]:[value(0),value(input.fields.readUnsigned(4)),value(256),pointer(stage==='lower'?item.lower:item.upper),value(256),pointer(item.input),value(stage==='lower'?0x100:0x200),value(input.fields.readUnsigned(12)),value(0)];
      for(const word of words)stack.#push(word);frame.deferredBytes+=words.length*4;stack.#call(classification?'100b1293':stage==='lower'?'100b12b3':'100b12d8',classification?'100b1298':stage==='lower'?'100b12b8':'100b12dd');stack.#push(stack.#load(stack.#bank,stack.#reg('EBP')));
      const ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('EBP'),stack.#stackWord(ebp));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(ebp-16));const locale=new NativeHeapObjectViews(stack.#stack.backing,ebp-16,16);
      frame.wrapper={stage:stage as 'classification'|'lower'|'upper',ebp,locale,localeReturned:false};stack.#push(value(0));stack.#store(stack.#bank,stack.#reg('ECX'),stack.#stackWord(ebp-16));stack.#call(classification?'100c704b':'100b50f2',classification?'100c7050':'100b50f7');stack.#push(stack.#load(stack.#bank,stack.#reg('ESI')));stack.#store(stack.#bank,stack.#reg('ESI'),stack.#stackWord(ebp-16));return known(locale);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedCaseLocale(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{const {frame}=NativeX86ThreadStack.#caseProof(stack,controller),wrapper=frame.wrapper;if(!wrapper||wrapper.localeReturned)throw new Error('Actual pending wrapper locale constructor required');stack.#invalidateRange(stack.#stack,wrapper.ebp-16,16);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#stackWord(wrapper.ebp-16));const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ESI'),stack.#load(stack.#stack,at));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));stack.#ret(4);for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);wrapper.localeReturned=true;return known(undefined);}catch(error){return unknown(reason(error));}
  }
  static finishSharedCaseWrapper(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#caseProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{
      const {frame}=NativeX86ThreadStack.#caseProof(stack,controller),wrapper=frame.wrapper;if(!wrapper||!wrapper.localeReturned||stack.#phase!=='returned'||stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')))!==wrapper.ebp||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==wrapper.ebp-16)throw new Error('Actual returned source stat helper required');
      stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(wrapper.ebp));const parent=stack.#load(stack.#stack,wrapper.ebp);stack.#store(stack.#bank,stack.#reg('EBP'),parent);stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(wrapper.ebp+4));stack.#ret();
      if(wrapper.stage!=='classification'){const expected=wrapper.stage==='lower'?68:36;if(frame.deferredBytes!==expected)throw new Error('Actual source deferred argument cleanup required');const caller=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(caller+expected));frame.deferredBytes=0;stack.#trace.push(wrapper.stage==='lower'?'100b12b8.ADD ESP68':'100b12dd.ADD ESP36');stack.#flags(0,1);}
      if(wrapper.stage==='classification'){stack.#store(stack.#bank,stack.#reg('EBX'),stack.#mint(0,0xffffffff));stack.#logicalFlags(0,0xffffffff,4);}
      frame.wrapper=null;stack.#phase='running';return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static returnSharedCaseFrame(stack:NativeX86ThreadStack,controller:object):NativeValue<void>{
    try{NativeX86ThreadStack.#caseProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{
      const {input,frame}=NativeX86ThreadStack.#caseProof(stack,controller);if(input.stage!=='return'||frame.tableIndex!==256||frame.wrapper||frame.cpCall||frame.deferredBytes||stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')))!==frame.ebp||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.originalEbp-0x524)throw new Error('Actual completed enclosing case body required');
      const relation=stack.#record(stack.#load(stack.#stack,frame.ebp+0x498)).provenance;if(relation?.kind!=='xor'||stack.#address(relation.right)!==frame.ebp)throw new Error('Actual enclosing case cookie relation required');stack.#store(stack.#bank,stack.#reg('ECX'),relation.left);
      const pop=(name:'EDI'|'EBX'|'EBP')=>{const at=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg(name),stack.#load(stack.#stack,at));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(at+4));};pop('EDI');pop('EBX');stack.#call('100b137a','100b137f');const cookie=stack.#numeric(relation.left,4);if(cookie!==input.cookie)throw new Error('Unowned enclosing case cookie failure report');stack.#arithmeticFlags(cookie,cookie,0,4,true);stack.#ret();
      stack.#store(stack.#bank,stack.#reg('EBP'),stack.#stackWord(frame.originalEbp));stack.#flags(0,1);stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(frame.originalEbp));pop('EBP');stack.#ret();frame.returned=true;stack.#trace.push('100b1386.enclosingCaseReturn');
      // The original caller jumps from100b1619 to XOR EAX,EAX at100b14d5.
      stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(0,0xffffffff));stack.#logicalFlags(0,0xffffffff,4);stack.#trace.push('100b14d5.configurationZeroResult');stack.#phase='returned';return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static writeSharedCaseTableEntry(stack:NativeX86ThreadStack,controller:object,index:number):NativeValue<void>{
    try{NativeX86ThreadStack.#caseProof(stack,controller);}catch(error){return unknown(reason(error));}
    try{
      const {input,frame}=NativeX86ThreadStack.#caseProof(stack,controller),candidate=stack.#record(stack.#load(stack.#bank,stack.#reg('ESI'))).provenance;
      if(input.stage!=='tables'||index!==frame.tableIndex||index<0||index>=256||frame.wrapper||frame.deferredBytes||candidate?.kind!=='shared-local'||candidate.fields!==input.fields||stack.#numeric(stack.#load(stack.#bank,stack.#reg('EBX')),4)!==0||stack.#numeric(stack.#load(stack.#bank,stack.#reg('EDI')),4)!==256)throw new Error('Actual source case-table loop state required');
      const type=NativeHeapObjectViews.prototype.readUnsigned.call(frame.types,index*2,2),at=0x1d+index;let ecx=type;
      stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(index,0xffffffff));
      if(type&1){const mapped=NativeHeapObjectViews.prototype.readUnsigned.call(frame.lower,index,1);NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,at,NativeHeapObjectViews.prototype.readUnsigned.call(input.fields,at,1)|0x10,1);NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,0x11d+index,mapped,1);ecx=(type&0xffffff00)|mapped;}
      else if(type&2){const mapped=NativeHeapObjectViews.prototype.readUnsigned.call(frame.upper,index,1);NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,at,NativeHeapObjectViews.prototype.readUnsigned.call(input.fields,at,1)|0x20,1);NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,0x11d+index,mapped,1);ecx=(type&0xffffff00)|mapped;}
      else NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,0x11d+index,0,1);
      stack.#store(stack.#bank,stack.#reg('ECX'),stack.#mint(ecx,0xffffffff));stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(index+1,0xffffffff));stack.#arithmeticFlags(index+1,256,(index+1-256)>>>0,4,true);frame.tableIndex++;stack.#trace.push('100b12e2.sourceCaseTableByte');return known(undefined);
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static bindForIoOwner(stack: NativeX86ThreadStack, crt: NativeModuleCrtOwner, owner: NativeGameCrtIoInit,
    controller: object): NativeValue<void> {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || !stack || graphs.get(crt.host.platform as NativeRuntimePlatform) !== stack) return unknown('Actual selected same-platform x86 graph required');
    const proof = NativeGameCrtIoInit.canonicalControllerForCrt(owner, crt, controller, 'bind'); if (!proof.known) return proof;
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game' || crt.host.platform !== stack.#platform || stack.#phase !== 'cold') {
      return unknown('Actual cold same-Game x86 controller binding required');
    }
    const selected = NativeRuntimePlatform.threadStackSelectionForPlatform(stack.#platform);
    if (!selected.known || selected.value !== stack.#selection) return unknown('Actual live selected x86 thread state required');
    if (stack.#binding) return stack.#binding.owner === owner && stack.#binding.crt === crt && stack.#binding.controller === controller
      ? known(undefined) : unknown('Retained x86 controller cannot rebind');
    stack.#binding = Object.freeze({ crt, owner, controller }); return known(undefined);
  }
  static transferReturnedIoForArgv(stack: NativeX86ThreadStack, crt: NativeModuleCrtOwner,
    io: NativeGameCrtIoInit, ioController: object, argv: NativeGameCrtArgv, controller: object): NativeValue<void> {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || graphs.get(crt.host.platform as NativeRuntimePlatform) !== stack) return unknown('Actual returned same-platform IO graph required');
    try {
      const proof = NativeGameCrtIoInit.canonicalReturnedGraphForArgv(io, crt, ioController, argv, controller);
      if (!proof.known || proof.value !== stack) throw new Error(proof.known ? 'Actual original IO graph required' : proof.reason);
      const claim = NativeGameCrtArgv.canonicalControllerForCrt(argv, crt, controller, 'bind'); if (!claim.known) throw new Error(claim.reason);
      if (stack.#transferred || stack.#phase !== 'returned' || stack.#executing || stack.#argvBinding ||
          stack.#binding?.owner !== io || stack.#binding.controller !== ioController || stack.#binding.crt !== crt) throw new Error('One returned IO graph transfer required');
      stack.#transferred = true;
      const initial = stack.#initial, incoming = stack.#calls.find(c => c.site === '204678ce');
      if (!initial || !incoming?.returned || stack.#currentPc !== incoming.returnWord ||
          stack.#address(stack.#load(stack.#bank, stack.#reg('ESP'))) !== stack.#address(initial.esp) ||
          stack.#calls.some(c => !c.returned) || stack.#selection.pageAlignment !== 'virtual-page-4096') throw new Error('Actual original return and preselected page-aligned graph required');
      stack.#physical(stack.#stack); stack.#physical(stack.#bank);
      const selection = NativeRuntimePlatform.argvNlsSelectionForPlatform(stack.#platform); if (!selection.known) throw new Error(selection.reason);
      stack.#argvBinding = Object.freeze({ crt, owner: argv, controller }); stack.#phase = 'running'; return known(undefined);
    } catch (error) { stack.#transferred = true; stack.#phase = 'blocked'; stack.#boundary ??= reason(error); return unknown(stack.#boundary); }
  }
  /** The original argv owner must establish a planned live frontier before
   * ordinary unknown suspension. A graph already blocked at109 cannot transfer. */
  static transferArgvFrontierForSetEnvp(stack: NativeX86ThreadStack, crt: NativeModuleCrtOwner,
    argv: NativeGameCrtArgv, argvController: object, owner: NativeGameCrtSetEnvp, controller: object): NativeValue<void> {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || graphs.get(crt.host.platform as NativeRuntimePlatform) !== stack) return unknown('Actual current same-platform argv graph required');
    try {
      if (stack.#setEnvpTransferred || stack.#setEnvpBinding || stack.#phase !== 'running' || stack.#executing || !stack.#argvReturned ||
          stack.#argvBinding?.owner !== argv || stack.#argvBinding.controller !== argvController || stack.#argvBinding.crt !== crt) throw new Error('One live planned argv frontier transfer required');
      stack.#setEnvpTransferred = true;
      const original = NativeGameCrtArgv.canonicalFrontierGraphForSetEnvp(argv, crt, argvController, owner, controller);
      if (!original.known || original.value !== stack) throw new Error(original.known ? 'Same original argv storage required' : original.reason);
      const bind = NativeGameCrtSetEnvp.canonicalControllerForCrt(owner, crt, controller, 'bind'); if (!bind.known) throw new Error(bind.reason);
      const selected = NativeRuntimePlatform.setEnvpSelectionForPlatform(stack.#platform); if (!selected.known) throw new Error(selected.reason);
      const initial = stack.#initial, call = stack.#calls.find(entry => entry.site === '204678de');
      stack.#physical(stack.#stack); stack.#physical(stack.#bank);
      if (!initial || !call?.returned || stack.#currentPc !== call.returnWord || stack.#calls.some(entry => !entry.returned) ||
          // The startup grant remains retained to prevent replay after its
          // actual RET4. Only its private pending call blocks this transfer.
          (stack.#startupGrant && startupCalls.get(stack.#startupGrant)?.phase !== 'returned') ||
          stack.#heapGrant || stack.#standardGrant || stack.#argvGrant ||
          stack.#numeric(stack.#load(stack.#bank, stack.#reg('EAX')), 4) !== 0 ||
          stack.#address(stack.#load(stack.#bank, stack.#reg('ESP'))) !== stack.#address(initial.esp) ||
          stack.#load(stack.#bank, stack.#reg('EBP')) !== initial.ebp || stack.#load(stack.#bank, stack.#reg('EBX')) !== initial.ebx ||
          stack.#load(stack.#bank, stack.#reg('ESI')) !== initial.esi || stack.#load(stack.#bank, stack.#reg('EDI')) !== initial.edi ||
          stack.#load(stack.#bank, 32) !== initial.fs) throw new Error('Actual checked argv0 return and restored current frame required');
      stack.#setEnvpBinding = Object.freeze({ crt, owner, controller }); return known(undefined);
    } catch (error) { stack.#setEnvpTransferred = true; stack.#phase = 'blocked'; stack.#boundary ??= reason(error); return unknown(stack.#boundary); }
  }
  static setEnvpArgumentsForPlatform(platform: NativeRuntimePlatform, grant: NativeSetEnvpCallGrant): NativeValue<NativeSetEnvpArguments> {
    const active = NativeRuntimePlatform.canonicalSetEnvpInvocationForPlatform(platform, grant); if (!active.known) return active;
    const call = setEnvpCalls.get(grant);
    if (!call || graphs.get(platform) !== call.stack) return unknown('Actual private same-platform environment import required');
    try { call.stack.#setEnvpProof(grant, call); return known(call.args); } catch (error) { return unknown(reason(error)); }
  }
  static canonicalStartupInfoCallForPlatform(platform: NativeRuntimePlatform,
    grant: NativeStartupInfoCallGrant): NativeValue<void> {
    const invocation = NativeRuntimePlatform.canonicalStartupInfoInvocationForPlatform(platform, grant);
    if (!invocation.known) return invocation;
    const call = startupCalls.get(grant);
    if (!call || graphs.get(platform) !== call.stack) return unknown('Actual same-platform privately minted startup call required');
    try { call.stack.#startupProof(grant, call); return known(undefined); }
    catch (error) { return unknown(reason(error)); }
  }
  static heapAllocArgumentsForPlatform(platform: NativeRuntimePlatform, grant: NativeHeapAllocCallGrant): NativeValue<Readonly<{
    crt: NativeModuleCrtOwner; heap: NativeWin32HeapCapability; flags: 8; bytes: number;
  }>> {
    const active = NativeRuntimePlatform.canonicalHeapAllocInvocationForPlatform(platform, grant); if (!active.known) return active;
    const call = heapCalls.get(grant);
    if (!call || graphs.get(platform) !== call.stack) return unknown('Actual private same-platform HeapAlloc call required');
    try { call.stack.#heapProof(grant, call); return known(Object.freeze({ crt: call.crt, heap: call.heap, flags: 8, bytes: call.bytes })); }
    catch (error) { return unknown(reason(error)); }
  }
  static standardIoArgumentsForPlatform(platform: NativeRuntimePlatform,
    grant: NativeStandardIoCallGrant): NativeValue<NativeStandardIoArguments> {
    const active = NativeRuntimePlatform.canonicalStandardIoInvocationForPlatform(platform, grant); if (!active.known) return active;
    const call = standardCalls.get(grant);
    if (!call || graphs.get(platform) !== call.stack) return unknown('Actual private same-platform standard-I/O call required');
    try { call.stack.#standardProof(grant, call); return known(call.args); }
    catch (error) { return unknown(reason(error)); }
  }
  static invalidateStandardIoSectionForCall(platform: NativeRuntimePlatform, grant: NativeStandardIoCallGrant): NativeValue<void> {
    const args = NativeX86ThreadStack.standardIoArgumentsForPlatform(platform, grant); if (!args.known) return args;
    if (args.value.kind !== 'InitializeCriticalSectionAndSpinCount' || !args.value.section) return unknown('Actual pending section call required');
    const call = standardCalls.get(grant)!, pointer = args.value.section;
    try {
      for (let offset = 0; offset < 24; offset += 4) {
        call.stack.#standardProof(grant, call);
        call.stack.#invalidateRange(pointer.fields, pointer.offset + offset, 4);
        const word = NativeHeapObjectViews.prototype.maskedWord.call(pointer.fields, pointer.offset + offset);
        word.knownMask = 0;
      }
      call.stack.#standardProof(grant, call); return known(undefined);
    } catch (error) { return unknown(reason(error)); }
  }
  /** Only the Runtime's exact currently executing endpoint may write the
   * privately resolved frame. This never exposes its alias or controller. */
  static writeStartupInfoForCall(platform: NativeRuntimePlatform, grant: NativeStartupInfoCallGrant,
    offset: number, width: 1 | 2 | 4, value: number, mask: number): NativeValue<void> {
    const admitted = NativeX86ThreadStack.canonicalStartupInfoCallForPlatform(platform, grant); if (!admitted.known) return admitted;
    const call = startupCalls.get(grant)!;
    try {
      const maximum = width === 4 ? 0xffffffff : width === 2 ? 0xffff : 0xff;
      if (![1, 2, 4].includes(width) || !Number.isSafeInteger(offset) || offset < 0 || offset + width > 68 ||
          !Number.isInteger(value) || value < 0 || value > maximum || !Number.isInteger(mask) || mask < 0 || mask > maximum) {
        throw new Error('Actual bounded STARTUPINFOA byte/word/dword masked store required');
      }
      if (offset < 0x38 && offset + width > 0x34 &&
          (offset !== 0x34 || width !== 4 || value !== 0 || mask !== 0xffffffff)) {
        throw new Error('STARTUPINFOA non-NULL reserved pointer has no owned block capability');
      }
      const stack = call.stack, position = call.offset + offset;
      stack.#physical(stack.#stack); stack.#physical(stack.#bank);
      const slots = stack.#slots.get(stack.#stack);
      if (slots) for (const begin of slots.keys()) if (begin < position + width && begin + 4 > position) slots.delete(begin);
      const current = NativeHeapObjectViews.prototype.maskedWord.call(stack.#stack, position, width);
      current.value = value; current.knownMask = mask;
      stack.#startupProof(grant, call); return known(undefined);
    } catch (error) { return unknown(reason(error)); }
  }
  #startupProof(grant: NativeStartupInfoCallGrant, call: StartupCall): void {
    this.#check(call.controller);
    const binding = this.#binding!, actual = NativeGameCrtIoInit.canonicalStartupInfoCallForCrt(binding.owner, binding.crt, call.controller);
    if (!actual.known) throw new Error(actual.reason);
    const top = this.#calls.at(-1), argument = this.#load(this.#stack, call.position + 4);
    if (!this.#executing || this.#startupGrant !== grant || call.phase !== 'pending' || call.stack !== this ||
        call.fields !== actual.value || this.#startupViews.get(call.offset) !== call.fields ||
        call.position !== call.offset - 0x18 ||
        this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== call.position ||
        this.#address(this.#load(this.#bank, this.#reg('EBP'))) - 0x64 !== call.offset ||
        argument !== call.argument || this.#address(argument) !== call.offset ||
        !top || top.returned || top.site !== '20474314' || top.position !== call.position || top.returnWord !== call.returnWord ||
        this.#load(this.#stack, call.position) !== call.returnWord ||
        call.fields.backing !== this.#stack.backing || call.fields.bytes.buffer !== this.#stack.bytes.buffer ||
        call.fields.bytes.byteOffset !== this.#stack.bytes.byteOffset + call.offset || call.fields.bytes.length !== 68 ||
        call.fields.knownMask.buffer !== this.#stack.knownMask.buffer ||
        call.fields.knownMask.byteOffset !== this.#stack.knownMask.byteOffset + call.offset || call.fields.knownMask.length !== 68) {
      throw new Error('Actual pending GetStartupInfoA call/current argument/private frame alias required');
    }
  }
  #heapProof(grant: NativeHeapAllocCallGrant, call: HeapCall): void {
    this.#check(call.controller);
    const binding = this.#binding!, site = NativeGameCrtIoInit.canonicalHeapAllocCallForCrt(binding.owner, binding.crt, call.controller);
    if (!site.known) throw new Error(site.reason);
    const top = this.#calls.at(-1), currentHeap = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(call.crt, this.#platform);
    if (!currentHeap.known) throw new Error(currentHeap.reason);
    if (!this.#executing || this.#heapGrant !== grant || call.stack !== this || call.phase !== 'pending' || binding.crt !== call.crt ||
        currentHeap.value !== call.heap || this.#address(this.#load(this.#bank, this.#reg('EBP'))) !== call.frame ||
        this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== call.position || call.position !== call.frame - 0x3c ||
        this.#load(this.#stack, call.position + 4) !== call.heapWord || this.#load(this.#stack, call.position + 8) !== call.flagsWord ||
        this.#load(this.#stack, call.position + 12) !== call.bytesWord || this.#numeric(call.flagsWord, 4) !== 8 ||
        this.#numeric(call.bytesWord, 4) !== call.bytes || this.#numeric(this.#load(this.#bank, this.#reg('ESI')), 4) !== call.bytes ||
        !top || top.returned || top.site !== '20477ce8' || top.position !== call.position || top.returnWord !== call.returnWord ||
        this.#load(this.#stack, call.position) !== call.returnWord) throw new Error('Actual nested HeapAlloc frame/current arguments/pending return required');
    const incoming = [...this.#calls].reverse().find(entry => !entry.returned && entry.site === '204683dc');
    const outer = [...this.#calls].reverse().find(entry => !entry.returned && entry.site === '20474327');
    if (!incoming || !outer || incoming.position !== call.frame + 4 || outer.position !== call.frame + 0x1c ||
        this.#load(this.#stack, call.frame + 4) !== incoming.returnWord ||
        this.#load(this.#stack, outer.position) !== outer.returnWord ||
        this.#record(call.heapWord).provenance?.kind !== 'heap' ||
        (this.#record(call.heapWord).provenance as { heap: NativeWin32HeapCapability }).heap !== call.heap ||
        this.#address(this.#load(this.#bank, 32)) !== call.frame - 0x10) {
      throw new Error('Actual nested calloc call and FS registration required');
    }
  }
  #gameScalar(label: string, offset = 0): number {
    const crt = this.#binding!.crt, image = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
    if (!image.known) throw new Error(image.reason);
    const access = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, offset, 4);
    if (!access.known) throw new Error(access.reason);
    return NativeHeapObjectViews.prototype.readUnsigned.call(image.value, offset);
  }
  #platformObject(word: NativeX86Word32, category?: NativeStandardIoCapabilityKind): object {
    const p = this.#liveWord(word).provenance;
    if (p?.kind !== 'platform' || (category !== undefined && p.category !== category)) throw new Error('Actual matching private Runtime procedure/handle word required');
    return p.object;
  }
  #objectWord(value: object): NativeX86Word32 {
    const old = this.#objects.get(value); if (old) { this.#liveWord(old); return old; }
    if (value instanceof NativeHeapObjectViews) {
      const crt = this.#binding!.crt, ptd = NativeModuleCrtOwner.canonicalGamePtdForPlatform(crt, this.#platform, value);
      if (!ptd.known) throw new Error(ptd.reason);
      const heap = NativeModuleCrtOwner.canonicalGameHeapForAllocation(crt, this.#platform, Object.freeze({ fields: ptd.value, offset: 0 }));
      if (!heap.known) throw new Error(heap.reason);
      const word = this.#allocationWord(Object.freeze({ fields: ptd.value, heap: heap.value, crt, ptd: true }), 0);
      this.#objects.set(value, word); return word;
    }
    const legacy = NativeRuntimePlatform.standardIoCapabilityForPlatform(this.#platform, value);
    const kind = legacy.known ? legacy : NativeRuntimePlatform.argvCapabilityForPlatform(this.#platform, value); if (!kind.known) throw new Error(kind.reason);
    const word = this.#mint(0, 0, { kind: 'platform', object: value, category: kind.value }); this.#objects.set(value, word); return word;
  }
  #moduleWord(label: string, offset: number): NativeX86Word32 {
    const crt = this.#binding!.crt, image = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
    if (!image.known) throw new Error(image.reason);
    const access = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, offset, 0);
    if (!access.known) throw new Error(access.reason);
    const key = label + ':' + offset, old = this.#moduleWords.get(key);
    if (old) { const p = this.#record(old).provenance; if (p?.kind !== 'module' || p.fields !== image.value) throw new Error('Actual retained module alias changed'); return old; }
    const word = this.#mint((Number.parseInt(nativeGameImageReceipt(label).address, 16) + offset) & 3, 3, { kind: 'module', label, fields: image.value, offset }); this.#moduleWords.set(key, word); return word;
  }
  #modulePointer(p: Extract<NonNullable<WordRecord['provenance']>, { kind: 'module' }>): NativeBytePointer {
    const key = p.label + ':' + p.offset; let pointer = this.#modulePointers.get(key);
    if (!pointer) { pointer = Object.freeze({ fields: p.fields, offset: p.offset }); this.#modulePointers.set(key, pointer); this.#nativePointers.set(pointer, this.#moduleWord(p.label, p.offset)); }
    return pointer;
  }
  #processWord(pointer: NativeBytePointer): NativeX86Word32 {
    const proof = NativeRuntimePlatform.canonicalProcessInputSpanForPlatform(this.#platform, pointer, 0); if (!proof.known) throw new Error(proof.reason);
    const old = this.#nativePointers.get(pointer); if (old) return old;
    const word = this.#mint(pointer.offset & 3, 3, { kind: 'process', pointer }); this.#nativePointers.set(pointer, word); return word;
  }
  #pointerWord(pointer: object): NativeX86Word32 {
    const old = this.#nativePointers.get(pointer); if (old) { this.#liveWord(old); return old; }
    if (this.#setEnvpBinding && pointer && 'fields' in pointer && 'offset' in pointer) {
      const original = NativeModuleCrtOwner.canonicalEnvironmentAllocationForPlatform(this.#binding!.crt, this.#platform, pointer as NativeBytePointer);
      if (original.known) {
        const allocation = this.#allocationFromBacking(original.value.logical.backing as NativeMemoryBacking, original.value.heap, original.value.pointer);
        const word = this.#allocationWord(allocation, 0); this.#nativePointers.set(pointer, word); return word;
      }
    }
    const heap = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(this.#binding!.crt, this.#platform);
    if (heap.known && heap.value === pointer) return this.#mint(0, 0, { kind: 'heap', heap: heap.value });
    const labels = ['mbcObject', 'mbcRefCounter', 'defaultLocale', 'currentLocale', 'moduleName', 'globalMbcType', 'globalMbcCase', 'globalMbcFields', 'CPtable', 'crtStaticSections'];
    for (const label of labels) {
      const image = NativeModuleCrtOwner.canonicalImageForOwner(this.#binding!.crt, label);
      if (image.known && image.value === pointer) return this.#moduleWord(label, 0);
      if (image.known && pointer instanceof NativeHeapObjectViews && pointer.bytes.buffer === image.value.bytes.buffer &&
          pointer.knownMask.buffer === image.value.knownMask.buffer) {
        const offset = pointer.bytes.byteOffset - image.value.bytes.byteOffset;
        if (offset >= 0 && offset + pointer.bytes.length <= image.value.bytes.length &&
            pointer.knownMask.byteOffset - image.value.knownMask.byteOffset === offset) return this.#moduleWord(label, offset);
      }
    }
    if (pointer && 'fields' in pointer && 'offset' in pointer) {
      const candidate = pointer as NativeBytePointer;
      const process = NativeRuntimePlatform.canonicalProcessInputSpanForPlatform(this.#platform, candidate, 0);
      if (process.known) return this.#processWord(candidate);
    }
    return this.#objectWord(pointer);
  }
  #currentMemoryWord(fields: NativeHeapObjectViews, offset: number): NativeX86Word32 {
    if (fields === this.#stack) return this.#load(fields, offset);
    try { const pointer = NativeHeapObjectViews.prototype.pointer.call(fields, offset).get(); return pointer === null ? this.#mint(0, 0xffffffff) : this.#pointerWord(pointer); }
    catch (error) {
      const message = reason(error);
      if (message !== 'Non-NULL numerical native pointer has no owned browser capability' && !message.startsWith('Native field contains unowned backing bits')) throw error;
      const current = NativeHeapObjectViews.prototype.maskedWord.call(fields, offset);
      if (current.knownMask === 0xffffffff) {
        // Only the two captured original pointer cells establish this loader
        // relation. An arbitrary scalar numerically matching a source VA does
        // not acquire a pointer capability. Later stores use actual sidecars.
        for (const [cell,label] of [['currentMbcPointer','mbcObject'],['currentLocale','defaultLocale']] as const) {
          const origin=NativeModuleCrtOwner.canonicalImageForOwner(this.#binding!.crt,cell);
          if(origin.known&&origin.value===fields&&offset===0&&current.value===Number.parseInt(nativeGameImageReceipt(label).address,16))return this.#moduleWord(label,0);
        }
      }
      let cells=this.#imageReads.get(fields);if(!cells){cells=new Map();this.#imageReads.set(fields,cells);}
      const old=cells.get(offset);
      if(old&&old.bytes.every((byte,index)=>byte===fields.bytes[offset+index])&&old.masks.every((mask,index)=>mask===fields.knownMask[offset+index]))return old.word;
      const word=this.#mint(current.value,current.knownMask);cells.set(offset,Object.freeze({word,
        bytes:Object.freeze(Array.from(fields.bytes.subarray(offset,offset+4))),masks:Object.freeze(Array.from(fields.knownMask.subarray(offset,offset+4)))}));return word;
    }
  }
  static argvArgumentsForPlatform(platform: NativeRuntimePlatform, grant: NativeArgvNlsCallGrant): NativeValue<NativeArgvNlsArguments> {
    const active = NativeRuntimePlatform.canonicalArgvNlsInvocationForPlatform(platform, grant); if (!active.known) return active;
    const call = argvCalls.get(grant); if (!call || graphs.get(platform) !== call.stack) return unknown('Actual private same-platform argv call required');
    try { call.stack.#argvProof(grant, call); return known(call.args); } catch (error) { return unknown(reason(error)); }
  }
  static readArgvMemoryForCall(platform: NativeRuntimePlatform, grant: NativeArgvNlsCallGrant,
    index: number, relative: number, width: Width): NativeValue<number> {
    const args = NativeX86ThreadStack.argvArgumentsForPlatform(platform, grant); if (!args.known) return args;
    try {
      const call = argvCalls.get(grant)!, address = call.words[index];
      if (!address || args.value.arguments[index]?.kind !== 'memory' || !Number.isSafeInteger(relative) || relative < 0) throw new Error('Actual retained import memory argument and nonnegative offset required');
      const provenance = call.stack.#liveWord(address).provenance;
      if (provenance?.kind === 'allocation' && provenance.offset + relative + width > provenance.allocation.fields.bytes.length) throw new Error('Argv import read exceeds requested logical allocation span');
      const memory = call.stack.#memory(call.stack.#offsetWord(address, relative), width);
      return known(NativeHeapObjectViews.prototype.readUnsigned.call(memory.fields, memory.offset, width));
    } catch (error) { return unknown(reason(error)); }
  }
  static writeArgvMemoryForCall(platform: NativeRuntimePlatform, grant: NativeArgvNlsCallGrant,
    index: number, relative: number, width: Width, value: number): NativeValue<void> {
    const args = NativeX86ThreadStack.argvArgumentsForPlatform(platform, grant); if (!args.known) return args;
    try {
      const call = argvCalls.get(grant)!, address = call.words[index];
      if (!address || args.value.arguments[index]?.kind !== 'memory' || !Number.isSafeInteger(relative) || relative < 0) throw new Error('Actual retained import output alias required');
      const maximum = call.stack.#maximum(width);
      if (!Number.isInteger(value) || value < 0 || value > maximum) throw new Error('Actual width-bounded import scalar store required');
      const provenance = call.stack.#liveWord(address).provenance;
      if (provenance?.kind === 'allocation' && provenance.offset + relative + width > provenance.allocation.fields.bytes.length) throw new Error('Argv import writer exceeds requested logical allocation span');
      call.stack.#writeMemory(call.stack.#offsetWord(address, relative), call.stack.#mint(value, maximum), width);
      call.stack.#argvProof(grant, call); return known(undefined);
    } catch (error) { return unknown(reason(error)); }
  }
  #argvProof(grant: NativeArgvNlsCallGrant, call: ArgvCall): void {
    this.#check(call.controller);
    const binding = this.#argvBinding;
    if (!binding || this.#argvGrant !== grant || argvCalls.get(grant) !== call || call.phase !== 'pending' || !this.#executing) throw new Error('Actual executing pending argv import required');
    const current = NativeGameCrtArgv.canonicalArgvImportCallForCrt(binding.owner, binding.crt, call.controller, call.args.site);
    if (!current.known) throw new Error(current.reason);
    const chain = NativeGameCrtArgv.canonicalSourceFrameChainForCrt(binding.owner, binding.crt, call.controller);
    if (!chain.known || chain.value.length !== call.frames.length || chain.value.some((frame,index) => frame.entry + ':' + frame.site + ':' + frame.returnPc !== call.frames[index])) throw new Error('Actual current original argv source-frame chain changed');
    const top = [...this.#calls].reverse().find(entry => !entry.returned), spec = argvSites[call.args.site];
    if (!top || top.site !== call.args.site || top.position !== call.position || top.returnWord !== call.returnWord ||
        this.#load(this.#stack, call.position) !== call.returnWord || this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== call.position ||
        this.#load(this.#bank, 32) !== call.fs || call.args.kind !== spec[0] || call.argumentBytes !== spec[1] * 4) throw new Error('Actual pending import CALL, current ESP/FS and return word required');
    const physicalFrames=this.#calls.filter(entry=>!entry.returned&&entry!==top);
    if(physicalFrames.length!==chain.value.length||physicalFrames.some((entry,index)=>{
      const frame=chain.value[index]!,source=this.#record(entry.returnWord).provenance;
      return entry.site!==frame.site||source?.kind!=='source'||source.type!=='code'||source.address!==frame.returnPc||this.#load(this.#stack,entry.position)!==entry.returnWord;
    }))throw new Error('Actual retained outer source CALL/return slots must match the private argv frame chain');
    for (let index=0; index<call.words.length; index++) {
      if (this.#load(this.#stack, call.position + 4 + index * 4) !== call.words[index]) throw new Error('Current import argument word changed');
      this.#liveWord(call.words[index]!);
    }
    if (spec[3]) {
      const p = this.#liveWord(this.#load(this.#bank, this.#reg(spec[3]))).provenance;
      if (p?.kind !== 'platform' || p.object !== call.args.procedure || p.category !== (call.args.kind === 'FlsGetValue' ? 'fls-get' : call.args.kind)) throw new Error('Actual current indirect argv procedure required');
    }
    if (call.args.kind === 'HeapAlloc') {
      const heap = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(binding.crt, this.#platform);
      const p = this.#record(call.words[0]!).provenance;
      if (!heap.known || p?.kind !== 'heap' || heap.value !== p.heap || this.#numeric(call.words[1]!,4) !== 0 ||
          this.#gameScalar('crtHeapMode') !== 1 || this.#numeric(this.#load(this.#bank, this.#reg('EBP')),4) !== this.#numeric(call.words[2]!,4) ||
          chain.value.at(-1)?.entry !== '20467ba7') throw new Error('Actual malloc EBP scalar/current heap/mode1/flags0 source chain required');
    }
  }
  #setEnvpProof(grant: NativeSetEnvpCallGrant, call: SetEnvpCall): void {
    this.#check(call.controller);
    const binding = this.#setEnvpBinding;
    if (!binding || this.#setEnvpGrant !== grant || setEnvpCalls.get(grant) !== call || call.phase !== 'pending' || !this.#executing) throw new Error('Actual executing environment import required');
    const current = NativeGameCrtSetEnvp.canonicalSetEnvpImportCallForCrt(binding.owner, binding.crt, call.controller, call.args.site);
    if (!current.known) throw new Error(current.reason);
    const chain = NativeGameCrtSetEnvp.canonicalSourceFrameChainForCrt(binding.owner, binding.crt, call.controller);
    if (!chain.known || chain.value.length !== call.frames.length || chain.value.some((frame, index) =>
        frame.entry + ':' + frame.site + ':' + frame.returnPc !== call.frames[index])) throw new Error('Current environment source-frame chain changed');
    const top = this.#calls.filter(entry => !entry.returned).at(-1);
    if (!top || top.site !== call.args.site || top.position !== call.position || top.returnWord !== call.returnWord ||
        this.#load(this.#stack, call.position) !== call.returnWord || this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== call.position ||
        this.#address(this.#load(this.#bank, this.#reg('EBP'))) !== call.frame || call.position !== call.frame - 0x3c ||
        this.#load(this.#bank, 32) !== call.fs || this.#address(call.fs) !== call.frame - 0x10) throw new Error('Actual environment import frame/ESP/FS/pending return required');
    const physical = this.#calls.filter(entry => !entry.returned && entry !== top);
    if (physical.length !== chain.value.length || physical.some((entry, index) => {
      const frame = chain.value[index]!, source = this.#record(entry.returnWord).provenance;
      return entry.site !== frame.site || source?.kind !== 'source' || source.type !== 'code' || source.address !== frame.returnPc ||
        this.#load(this.#stack, entry.position) !== entry.returnWord;
    })) throw new Error('Current physical CALL/return slots must match environment source frames');
    const heap = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(binding.crt, this.#platform), hp = this.#liveWord(call.words[0]!).provenance;
    if (!heap.known || heap.value !== call.args.heap || hp?.kind !== 'heap' || hp.heap !== call.args.heap || this.#gameScalar('crtHeapMode') !== 1) throw new Error('Actual current environment Game heap/mode1 required');
    for (let index = 0; index < 3; index++) if (this.#load(this.#stack, call.position + 4 + index * 4) !== call.words[index]) throw new Error('Current environment import argument changed');
    if (this.#numeric(call.words[1]!, 4) !== call.args.flags) throw new Error('Current source HeapAlloc/HeapFree flags required');
    if (call.args.site === '20477ce8') {
      if (call.args.flags !== 8 || chain.value.at(-1)?.entry !== '20477c2a' || this.#numeric(call.words[2]!, 4) !== call.args.bytes ||
          this.#numeric(this.#load(this.#bank, this.#reg('ESI')), 4) !== call.args.bytes) throw new Error('Actual nested calloc scalar size and source frame required');
      const incoming = physical.at(-1), outer = physical.at(-2);
      if (!incoming || incoming.site !== '204683dc' || incoming.position !== call.frame + 4 || !outer ||
          !['2047653f', '2047656d'].includes(outer.site) || outer.site !== call.args.callerSite || outer.position !== call.frame + 0x1c) throw new Error('Actual environment calloc wrapper/caller slots required');
    } else {
      const p = this.#record(call.words[2]!).provenance;
      if (call.args.flags !== 0 || chain.value.at(-1)?.entry !== '20467c6a' || p?.kind !== 'allocation' || p.offset !== 0 ||
          p.allocation.fields.backing !== call.args.backing || this.#load(this.#bank, this.#reg('ESI')) !== call.words[2]) throw new Error('Actual source HeapFree base allocation and ESI required');
      const retired = NativeRuntimePlatform.canonicalSetEnvpReleasedAllocationForCall(this.#platform, grant, binding.crt, call.args.heap, call.args.backing!);
      if (!retired.known) this.#allocationLive(p.allocation, 0, 0);
      // A successful release is proved through its retained receipt. Generic
      // live pointer proofs correctly reject it; no access is performed here.
      const incoming = physical.at(-1);
      if (!incoming || !['204765a5', '204765ca'].includes(incoming.site) || incoming.site !== call.args.callerSite || incoming.position !== call.frame + 4) throw new Error('Actual environment native free caller slot required');
    }
  }
  #standardProof(grant: NativeStandardIoCallGrant, call: StandardCall): void {
    this.#check(call.controller);
    const binding = this.#binding!, site = NativeGameCrtIoInit.canonicalStandardIoCallForCrt(binding.owner, binding.crt, call.controller, call.args.site);
    if (!site.known) throw new Error(site.reason);
    const spec = standardSites[call.args.site], top = this.#calls.at(-1);
    if (!this.#executing || this.#standardGrant !== grant || call.phase !== 'pending' || call.stack !== this || call.args.crt !== binding.crt ||
        this.#address(this.#load(this.#bank, this.#reg('EBP'))) !== call.frame ||
        this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== call.position || call.position !== call.frame + spec.position ||
        this.#load(this.#bank, 32) !== call.fs || this.#address(call.fs) !== call.frame - 0x10 ||
        !top || top.returned || top.site !== call.args.site || top.position !== call.position || top.returnWord !== call.returnWord ||
        this.#load(this.#stack, call.position) !== call.returnWord ||
        call.argumentWords.some((word, index) => this.#load(this.#stack, call.position + 4 + index * 4) !== word)) {
      throw new Error('Actual pending standard-I/O call/current frame/FS/arguments/return required');
    }
    for (const word of call.argumentWords) this.#liveWord(word);
    const incoming = [...this.#calls].reverse().find(entry => !entry.returned && entry.site === '204678ce');
    if (!incoming || this.#load(this.#stack, incoming.position) !== incoming.returnWord) throw new Error('Actual original outer IO call required');
    const nested = !['204744b4', '204744c6', '2047451e'].includes(call.args.site);
    if (nested) {
      const helper = [...this.#calls].reverse().find(entry => !entry.returned && entry.site === '204744f4');
      const parent = this.#load(this.#stack, call.frame), outer = this.#address(parent);
      if (!helper || helper.position !== call.frame + 4 || this.#load(this.#stack, helper.position) !== helper.returnWord ||
          outer + 4 !== incoming.position || this.#address(this.#load(this.#stack, call.frame - 0x10)) !== outer - 0x10) {
        throw new Error('Actual nested section caller and outer FS registration required');
      }
      if (call.args.site !== '20474246') {
        const wrapper = [...this.#calls].reverse().find(entry => !entry.returned && entry.site === '204741de');
        if (!wrapper || wrapper.position !== call.frame - 0x3c || this.#load(this.#stack, wrapper.position) !== wrapper.returnWord) {
          throw new Error('Actual pending cached DecodePointer source wrapper required');
        }
      }
    } else if (incoming.position !== call.frame + 4) throw new Error('Actual outer IO frame required');
    switch (call.args.kind) {
      case 'TlsGetValue':
        if (this.#numeric(call.argumentWords[0]!, 4) !== this.#gameScalar('crtTlsIndexes', 4) ||
            this.#platformObject(this.#load(this.#bank, this.#reg('ESI')), 'tls-get') !== call.args.procedure) throw new Error('Current TLS getter/index changed');
        break;
      case 'FlsGetValue':
        if (this.#numeric(call.argumentWords[0]!, 4) !== this.#gameScalar('crtTlsIndexes', 0) ||
            this.#platformObject(this.#load(this.#bank, this.#reg('EAX')), 'fls-get') !== call.args.procedure) throw new Error('Current FLS getter/PTD index changed');
        break;
      case 'DecodePointer':
        if (this.#platformObject(call.argumentWords[0]!, 'encoded') !== call.args.object ||
            this.#platformObject(this.#load(this.#bank, this.#reg('EAX')), 'decode') !== call.args.procedure) throw new Error('Current DecodePointer procedure/argument changed');
        break;
      case 'InitializeCriticalSectionAndSpinCount': {
        const address = this.#liveWord(call.argumentWords[0]!).provenance, record = this.#liveWord(this.#load(this.#bank, this.#reg('ESI'))).provenance;
        // ESI holds the selected procedure inside the helper; the original
        // record pointer is source-saved at the section frame's -0x2c.
        const saved = this.#liveWord(this.#load(this.#stack, call.frame - 0x2c)).provenance;
        if (record?.kind !== 'platform' || record.category !== 'section' || address?.kind !== 'allocation' || saved?.kind !== 'allocation' ||
            address.allocation !== saved.allocation || address.offset !== saved.offset + 12 || this.#numeric(call.argumentWords[1]!, 4) !== 4000 ||
            address.pointer !== call.args.section || this.#platformObject(this.#load(this.#bank, this.#reg('ESI')), 'section') !== call.args.procedure) {
          throw new Error('Current section procedure/record+0xc alias/spin arguments required');
        }
        this.#allocationLive(address.allocation, address.offset, 24); break;
      }
      case 'GetFileType': if (this.#platformObject(call.argumentWords[0]!, 'handle') !== call.args.object) throw new Error('Current GetFileType handle changed'); break;
      case 'GetStdHandle':
        if (![0xfffffff6, 0xfffffff5, 0xfffffff4].includes(this.#numeric(call.argumentWords[0]!, 4))) throw new Error('Actual standard ID argument required'); break;
      case 'SetHandleCount': if (this.#numeric(call.argumentWords[0]!, 4) !== this.#gameScalar('ioHandleCount')) throw new Error('Current handle-count argument changed'); break;
    }
  }
  #controllerProof(controller: object, mode: 'invoke' | 'retain' = 'invoke'): void {
    const binding = this.#binding;
    if (!binding || (this.#setEnvpBinding ? this.#setEnvpBinding.controller : this.#argvBinding ? this.#argvBinding.controller : binding.controller) !== controller || graphs.get(this.#platform) !== this) throw new Error('Actual private bound x86 controller required');
    const env = this.#setEnvpBinding;
    const argv = this.#argvBinding;
    const proof = env ? NativeGameCrtSetEnvp.canonicalControllerForCrt(env.owner, env.crt, controller, mode) : argv ? NativeGameCrtArgv.canonicalControllerForCrt(argv.owner, argv.crt, controller, mode)
      : NativeGameCrtIoInit.canonicalControllerForCrt(binding.owner, binding.crt, controller, mode);
    if (!proof.known) throw new Error(proof.reason);
    if (mode === 'retain') return;
    const selection = NativeRuntimePlatform.threadStackSelectionForPlatform(this.#platform);
    if (!selection.known || selection.value !== this.#selection) throw new Error('Actual active same-logical-thread x86 lifetime required');
  }
  #check(controller: object): void {
    this.#controllerProof(controller);
    if (this.#phase !== 'running') throw new Error(this.#boundary ?? 'Retained x86 graph is not executing');
    this.#physical(this.#stack); this.#physical(this.#bank);
  }
  #sharedLocalPhysical(fields:NativeHeapObjectViews):void{
    const proof=NativeSharedCrtOwner.argvLocalStorageForPlatform(this.#platform,this.#sharedArgvFrame?.controller??token,fields);if(!proof.known)throw new Error(proof.reason);
    if(dataViewBuffer.call(fields.view)!==fields.bytes.buffer||dataViewByteOffset.call(fields.view)!==fields.bytes.byteOffset||dataViewByteLength.call(fields.view)!==fields.bytes.length)throw new Error('Actual SharedBase argv physical view required');
  }
  #physical(fields: NativeHeapObjectViews): void {
    const proof = this.#storage.get(fields);
    try {
      if (!proof || fields.backing !== proof.backing || proof.backing.freed || proof.backing.identity !== proof.identity ||
          proof.backing.bytes !== proof.rootBytes || proof.backing.knownMask !== proof.rootMasks || fields.bytes !== proof.bytes ||
          fields.knownMask !== proof.masks || fields.view !== proof.view || fields.bytes.length !== proof.length ||
          fields.knownMask.length !== proof.length || proof.rootBytes.length !== proof.length || proof.rootMasks.length !== proof.length ||
          fields.bytes.buffer !== proof.rootBytes.buffer || fields.bytes.byteOffset !== proof.rootBytes.byteOffset ||
          fields.knownMask.buffer !== proof.rootMasks.buffer || fields.knownMask.byteOffset !== proof.rootMasks.byteOffset ||
          dataViewBuffer.call(fields.view) !== fields.bytes.buffer ||
          dataViewByteOffset.call(fields.view) !== fields.bytes.byteOffset ||
          dataViewByteLength.call(fields.view) !== proof.length) {
        throw new Error('Actual live retained x86 physical stack/register storage required');
      }
    } catch (error) { this.#phase = 'blocked'; this.#boundary ??= reason(error); throw error; }
  }
  #run<T>(controller: object, body: () => T): NativeValue<T> {
    try { this.#check(controller); } catch (error) { return unknown(reason(error)); }
    try {
      if (this.#executing) { this.#phase = 'blocked'; throw new Error('Reentry into retained x86 operation cannot replay'); }
      this.#executing = true;
      try { const value = body(); this.#check(controller); return known(value); }
      finally { this.#executing = false; }
    } catch (error) { this.#boundary ??= reason(error); this.#phase = 'blocked'; return unknown(this.#boundary); }
  }
  #stackWord(offset: number): NativeX86Word32 {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > this.#selection.reservationBytes) throw new Error('Actual contained nonwrapping virtual stack address required');
    const aligned = this.#selection.pageAlignment === 'virtual-page-4096';
    return this.#mint(aligned ? offset & 0xfff : 0, aligned ? 0xfff : 0, { kind: 'stack', offset });
  }
  #mint(value: number, mask: number, provenance?: WordRecord['provenance']): NativeX86Word32 {
    const word = Object.freeze({ identity: Object.freeze({}) });
    this.#words.set(word, Object.freeze({ value: value >>> 0, mask: mask >>> 0, provenance: provenance && Object.freeze(provenance) })); return word;
  }
  #record(word: NativeX86Word32): WordRecord {
    const record = this.#words.get(word); if (!record) throw new Error('Actual same-graph retained x86 word required'); return record;
  }
  #maximum(width: Width): number {
    if (![1, 2, 4].includes(width)) throw new Error('Actual x86 BYTE/WORD/DWORD width required');
    return width === 4 ? 0xffffffff : width === 2 ? 0xffff : 0xff;
  }
  #numeric(word: NativeX86Word32, width: Width): number {
    const record = this.#record(word), maximum = this.#maximum(width);
    if (((record.mask & maximum) >>> 0) !== maximum) throw new Error('Current known x86 operand bits required');
    return (record.value & maximum) >>> 0;
  }
  #allocationFromBacking(backing: NativeMemoryBacking, heap: NativeWin32HeapCapability,
    originalPointer?: NativeBytePointer): Allocation {
    const selected = NativeRuntimePlatform.setEnvpSelectionForPlatform(this.#platform);
    if (!selected.known) {
      const fields = new NativeHeapObjectViews(backing); Object.freeze(fields.view); Object.freeze(fields);
      return Object.freeze({ fields, heap, crt: this.#binding!.crt });
    }
    const aliases = NativeRuntimePlatform.canonicalGameHeapAllocationViewsForPlatform(this.#platform, this.#binding!.crt, backing);
    if (!aliases.known) throw new Error(aliases.reason);
    const old = this.#allocationRecords.get(backing);
    if (old) {
      if (old.fields !== aliases.value.logical || old.physical !== aliases.value.physical || old.heap !== heap ||
          (originalPointer && old.originalPointer !== originalPointer)) throw new Error('Retained Game logical/physical allocation aliases changed');
      this.#allocationLive(old, 0, 0); return old;
    }
    if (originalPointer && (originalPointer.fields !== aliases.value.logical || originalPointer.offset !== 0)) throw new Error('Exact existing logical base allocation pointer required');
    const allocation = Object.freeze({ fields: aliases.value.logical, physical: aliases.value.physical,
      heap, crt: this.#binding!.crt, originalPointer }); this.#allocationRecords.set(backing, allocation); return allocation;
  }
  #allocationLive(allocation: Allocation, offset: number, bytes: number): void {
    if (allocation.crt !== this.#binding!.crt || !Number.isSafeInteger(offset) || offset < 0 || offset + bytes > (allocation.physical ?? allocation.fields).bytes.length) {
      throw new Error('Actual contained same-Game allocation relation required');
    }
    const heap = NativeModuleCrtOwner.canonicalGameHeapForAllocation(allocation.crt, this.#platform,
      Object.freeze({ fields: allocation.physical ?? allocation.fields, offset }));
    if (!heap.known || heap.value !== allocation.heap) throw new Error(heap.known ? 'Current Game allocation heap changed' : heap.reason);
    const access = NativeRuntimePlatform.canonicalGameHeapDestination(this.#platform, allocation.crt,
      Object.freeze({ fields: allocation.physical ?? allocation.fields, offset }), bytes);
    if (!access.known) throw new Error(access.reason);
    if (allocation.ptd) {
      const ptd = NativeModuleCrtOwner.canonicalGamePtdForPlatform(allocation.crt, this.#platform, allocation.fields);
      if (!ptd.known || ptd.value !== allocation.fields) throw new Error(ptd.known ? 'Retained PTD identity changed' : ptd.reason);
    }
  }
  #allocationWord(allocation: Allocation, offset: number): NativeX86Word32 {
    this.#allocationLive(allocation, offset, 0);
    const pointer = offset === 0 && allocation.originalPointer ? allocation.originalPointer : Object.freeze({ fields: allocation.physical ?? allocation.fields, offset });
    const word = this.#mint(offset & 7, 7, { kind: 'allocation', allocation, offset, pointer }); this.#nativePointers.set(pointer, word); return word;
  }
  #memory(address: NativeX86Word32, width: Width): { fields: NativeHeapObjectViews; offset: number } {
    const provenance = this.#record(address).provenance;
    if(provenance?.kind==='shared-local'){
      this.#sharedLocalPhysical(provenance.fields);const offset=provenance.offset??0;
      if(offset<0||offset+width>provenance.fields.bytes.length)throw new Error('Current contained SharedBase local access required');return {fields:provenance.fields,offset};
    }
    if (provenance?.kind === 'stack') {
      this.#physical(this.#stack);
      if (provenance.offset < 0 || provenance.offset + width > this.#stack.bytes.length) throw new Error('Current contained stack access required');
      return { fields: this.#stack, offset: provenance.offset };
    }
    if (provenance?.kind === 'allocation') {
      this.#allocationLive(provenance.allocation, provenance.offset, width);
      return { fields: provenance.allocation.physical ?? provenance.allocation.fields, offset: provenance.offset };
    }
    if (provenance?.kind === 'module') {
      const access = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, this.#binding!.crt, provenance.label, provenance.offset, width);
      if (!access.known) throw new Error(access.reason); return { fields: provenance.fields, offset: provenance.offset };
    }
    if (provenance?.kind === 'process') {
      const access = NativeRuntimePlatform.canonicalProcessInputSpanForPlatform(this.#platform, provenance.pointer, width);
      if (!access.known) throw new Error(access.reason); return { fields: provenance.pointer.fields, offset: provenance.pointer.offset };
    }
    throw new Error('Actual owned stack/allocation/module/process address required for memory access');
  }
  #invalidateRange(fields: NativeHeapObjectViews, offset: number, bytes: number): void {
    const begin = fields.bytes.byteOffset + offset, end = begin + bytes;
    for (const maps of [this.#slots, this.#imageReads]) for (const [alias, cells] of maps) {
      if (alias.bytes.buffer !== fields.bytes.buffer) continue;
      for (const position of cells.keys()) {
        const cell = alias.bytes.byteOffset + position;
        if (cell < end && cell + 4 > begin) cells.delete(position);
      }
    }
  }
  #liveWord(word: NativeX86Word32): WordRecord {
    const record = this.#record(word), p = record.provenance;
    if (p?.kind === 'allocation') this.#allocationLive(p.allocation, p.offset, 0);
    if (p?.kind === 'module') this.#moduleWord(p.label, p.offset);
    if (p?.kind === 'process') this.#processWord(p.pointer);
    if (p?.kind === 'neg') this.#liveWord(p.word);
    if (p?.kind === 'xor' && this.#setEnvpBinding) { this.#liveWord(p.left); this.#liveWord(p.right); }
    if (p?.kind === 'heap') {
      const heap = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(this.#binding!.crt, this.#platform);
      if (!heap.known || heap.value !== p.heap) throw new Error(heap.known ? 'Current heap word differs from its actual Game heap' : heap.reason);
    }
    if (p?.kind === 'platform' && p.category==='InitializerEncodedCode') {
      if(!this.#sharedInitializerFrame)throw new Error('Actual pending initializer encoded pointer required');
      const proof=NativeSharedCrtOwner.initializerStackArgumentsForPlatform(this.#platform,this.#sharedInitializerFrame.controller);if(!proof.known)throw new Error(proof.reason);
      proof.value.imports.validateEncodedCode(p.object);return record;
    }
    if (p?.kind === 'platform') {
      const legacy = NativeRuntimePlatform.standardIoCapabilityForPlatform(this.#platform, p.object);
      const kind = legacy.known ? legacy : NativeRuntimePlatform.argvCapabilityForPlatform(this.#platform, p.object);
      if (!kind.known || kind.value !== p.category) throw new Error(kind.known ? 'Retained Runtime capability category changed' : kind.reason);
    }
    return record;
  }
  #flags(value: number, mask: number): void {
    this.#store(this.#bank, 36, this.#mint(value & 0x8d5, mask & 0x8d5));
    if (this.#selection.cpu) {
      const flags = this.#record(this.#load(this.#bank, 44));
      this.#store(this.#bank, 44, this.#mint((flags.value & ~0x8d5) | (value & 0x8d5), (flags.mask & ~0x8d5) | (mask & 0x8d5)));
    }
  }
  #pushFlags(): void {
    if (!this.#selection.cpu) throw new Error('PUSHFD requires an explicit retained virtual CPU selection');
    const df = NativeRuntimePlatform.readNativeDirectionFlag(this.#platform); if (!df.known) throw new Error(df.reason);
    const word = this.#load(this.#bank, 44), flags = this.#record(word);
    if (!(flags.mask & 0x400) || ((flags.value >>> 10) & 1) !== df.value) throw new Error('Actual retained EFLAGS/Runtime DF agreement required');
    if ((flags.mask & 0x30000) !== 0x30000 || (flags.value & 0x30000)) throw new Error('Owned protected-mode PUSHFD image required');
    this.#push(word);
  }
  #popFlags(): void {
    const cpu = this.#selection.cpu; if (!cpu) throw new Error('POPFD requires an explicit retained virtual CPU selection');
    const esp = this.#address(this.#load(this.#bank, this.#reg('ESP'))), word = this.#load(this.#stack, esp), source = this.#record(word), old = this.#record(this.#load(this.#bank, 44));
    const writable = cpu.idBitWritable ? 0x244dd5 : 0x044dd5;
    if ((source.mask & 0x500) !== 0x500 || (source.value & 0x100)) throw new Error('Owned POPFD DF and unsupported single-step trap boundary');
    const value = ((old.value & ~writable) | (source.value & writable)) >>> 0, mask = ((old.mask & ~writable) | (source.mask & writable)) >>> 0;
    const df = NativeRuntimePlatform.writeNativeDirectionFlag(this.#platform, ((value >>> 10) & 1) as 0 | 1); if (!df.known) throw new Error(df.reason);
    // Preserve the exact word identity when privilege-protected bits agree.
    // This retains correlation through the original ID toggle/subtraction.
    const previous = source.provenance?.kind === 'xor' && !cpu.idBitWritable && this.#record(source.provenance.right).value === 0x200000 && this.#record(source.provenance.right).mask === 0xffffffff ? source.provenance.left : null;
    const restored = previous ? this.#record(previous) : null;
    this.#store(this.#bank, 44, value === source.value && mask === source.mask ? word : restored && value === restored.value && mask === restored.mask ? previous! : this.#mint(value, mask));
    this.#store(this.#bank, 36, this.#mint(value & 0x8d5, mask & 0x8d5));
    this.#store(this.#bank, this.#reg('ESP'), this.#stackWord(esp + 4));
  }
  #logicalFlags(value: number, mask: number, width: Width): void {
    const maximum = this.#maximum(width), sign = width === 4 ? 0x80000000 : width === 2 ? 0x8000 : 0x80;
    const bits = value & maximum, knownBits = mask & maximum;
    let flags = 0, known = 0x801;
    if (((knownBits & bits) >>> 0) !== 0) known |= 0x40;
    else if ((knownBits >>> 0) === maximum) { known |= 0x40; flags |= 0x40; }
    if ((knownBits & sign) !== 0) { known |= 0x80; if ((bits & sign) !== 0) flags |= 0x80; }
    if ((knownBits & 255) === 255) { known |= 4; if (this.#parity(bits & 255)) flags |= 4; }
    this.#flags(flags, known);
  }
  #parity(byte: number): boolean { let bits = 0; for (let i = 0; i < 8; i++) bits += (byte >>> i) & 1; return bits % 2 === 0; }
  #arithmeticFlags(a: number, b: number, result: number, width: Width, subtract: boolean, carry = 0): void {
    const maximum = this.#maximum(width), sign = width === 4 ? 0x80000000 : width === 2 ? 0x8000 : 0x80;
    const cf = subtract ? BigInt(a) < BigInt(b) + BigInt(carry) : BigInt(a) + BigInt(b) + BigInt(carry) > BigInt(maximum);
    const of = subtract ? ((a ^ b) & (a ^ result) & sign) !== 0 : ((~(a ^ b)) & (a ^ result) & sign) !== 0;
    this.#flags((cf ? 1 : 0) | (this.#parity(result & 255) ? 4 : 0) | (((a ^ b ^ result) & 16) ? 16 : 0) |
      (result === 0 ? 0x40 : 0) | ((result & sign) ? 0x80 : 0) | (of ? 0x800 : 0), 0x8d5);
  }
  /** Bit/carry possibilities are propagated from current masks. Unknown
   * padding never acquires invented values. Flags stop execution only when
   * a later source instruction consumes a flag whose possibilities differ. */
  #maskedAdd(a: WordRecord, b: WordRecord, width: Width): NativeX86Word32 {
    const maximum = this.#maximum(width), bits = width * 8;
    let value = 0, mask = 0, carries = new Set<number>([0]);
    let auxiliary: number | undefined, overflow: number | undefined;
    for (let bit = 0; bit < bits; bit++) {
      const av = a.mask >>> bit & 1 ? [a.value >>> bit & 1] : [0, 1];
      const bv = b.mask >>> bit & 1 ? [b.value >>> bit & 1] : [0, 1];
      const result = new Set<number>(), next = new Set<number>(), overflows = new Set<number>();
      for (const x of av) for (const y of bv) for (const carry of carries) {
        const sum = x + y + carry, carryOut = sum >>> 1;
        result.add(sum & 1); next.add(carryOut);
        if (bit === bits - 1) overflows.add(carry ^ carryOut);
      }
      if (result.size === 1) { mask |= 1 << bit; if (result.has(1)) value |= 1 << bit; }
      if (bit === 3 && next.size === 1) auxiliary = next.has(1) ? 1 : 0;
      if (bit === bits - 1 && overflows.size === 1) overflow = overflows.has(1) ? 1 : 0;
      carries = next;
    }
    value = (value & maximum) >>> 0; mask = (mask & maximum) >>> 0;
    this.#logicalFlags(value, mask, width);
    const logical = this.#record(this.#load(this.#bank, 36));
    let flags = logical.value & ~0x811, known = logical.mask & ~0x811;
    if (carries.size === 1) { known |= 1; if (carries.has(1)) flags |= 1; }
    if (auxiliary !== undefined) { known |= 16; if (auxiliary) flags |= 16; }
    if (overflow !== undefined) { known |= 0x800; if (overflow) flags |= 0x800; }
    this.#flags(flags, known); return this.#mint(value, mask);
  }
  #offsetWord(word: NativeX86Word32, displacement: number): NativeX86Word32 {
    const p = this.#liveWord(word).provenance;
    if (!Number.isSafeInteger(displacement)) throw new Error('Exact signed owned pointer displacement required');
    if(p?.kind==='shared-local'){this.#sharedLocalPhysical(p.fields);const offset=(p.offset??0)+displacement;if(offset<0||offset>p.fields.bytes.length)throw new Error('SharedBase local pointer exceeds storage');return this.#mint(0,0,{kind:'shared-local',fields:p.fields,offset});}
    if (p?.kind === 'allocation') return this.#allocationWord(p.allocation, p.offset + displacement);
    if (p?.kind === 'module') return this.#moduleWord(p.label, p.offset + displacement);
    if (p?.kind === 'process') return this.#processWord(Object.freeze({ fields: p.pointer.fields, offset: p.pointer.offset + displacement }));
    if (p?.kind !== 'stack') throw new Error('Actual owned stack/allocation/module pointer arithmetic required');
    const offset = p.offset + displacement;
    if (offset < 0 || offset > this.#stack.bytes.length) throw new Error('Opaque relative stack address exceeds reservation');
    return this.#stackWord(offset);
  }
  gameImageAddress(controller: object, label: string, offset = 0): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#moduleWord(label, offset)); }
  effectiveAddress(controller: object, terms: readonly { word: NativeX86Word32; scale?: number; negative?: boolean }[], displacement: number): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    if (!Number.isSafeInteger(displacement)) throw new Error('Actual source displacement required');
    let pointer: NativeX86Word32 | null = null, scalar = displacement;
    for (const term of terms) {
      const p = this.#liveWord(term.word).provenance, scale = term.scale ?? 1;
      if (![1, 2, 4, 8].includes(scale)) throw new Error('Actual x86 source scale required');
      if (p && ['stack', 'allocation', 'module', 'process'].includes(p.kind)) {
        if (pointer || scale !== 1 || term.negative) throw new Error('One contained opaque base pointer required by LEA'); pointer = term.word;
      } else scalar += (this.#numeric(term.word, 4) | 0) * scale * (term.negative ? -1 : 1);
    }
    return pointer ? this.#offsetWord(pointer, scalar) : this.#mint(scalar >>> 0, 0xffffffff);
  }); }
  registerLane(controller: object, register: NativeX86Register, lane: NativeX86Lane): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const word = this.#record(this.#load(this.#bank, this.#reg(register))), shift = lane === 'high8' ? 8 : 0, maximum = lane === 'low16' ? 0xffff : 255;
    if (!['low8', 'high8', 'low16'].includes(lane)) throw new Error('Actual x86 register lane required');
    return this.#mint((word.value >>> shift) & maximum, (word.mask >>> shift) & maximum);
  }); }
  setRegisterLane(controller: object, register: NativeX86Register, lane: NativeX86Lane, word: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => {
    const old = this.#record(this.#load(this.#bank, this.#reg(register))), incoming = this.#record(word), shift = lane === 'high8' ? 8 : 0, maximum = lane === 'low16' ? 0xffff : 255;
    if (!['low8', 'high8', 'low16'].includes(lane)) throw new Error('Actual x86 register lane required');
    const mask = maximum << shift;
    this.#store(this.#bank, this.#reg(register), this.#mint((old.value & ~mask) | ((incoming.value & maximum) << shift), (old.mask & ~mask) | ((incoming.mask & maximum) << shift)));
  }); }
  scalarLane(controller: object, word: NativeX86Word32, width: 1 | 2, signed = false): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const r = this.#record(word), maximum = this.#maximum(width), sign = width === 1 ? 0x80 : 0x8000;
    const bits = r.value & maximum, masks = r.mask & maximum;
    return this.#mint(signed && (bits & sign) ? bits | ~maximum : bits, masks | (signed ? masks & sign ? ~maximum : 0 : ~maximum));
  }); }
  bitwiseNot(controller: object, word: NativeX86Word32, width: Width = 4): NativeValue<NativeX86Word32> { return this.#run(controller, () => { const r = this.#setEnvpBinding ? this.#liveWord(word) : this.#record(word), m = this.#maximum(width); return this.#mint(~r.value & m, r.mask & m); }); }
  setCondition(controller: object, condition: NativeX86Condition): NativeValue<NativeX86Word32> {
    const value = NativeX86ThreadStack.prototype.condition.call(this, controller, condition); if (!value.known) return value;
    return this.#run(controller, () => this.#mint(value.value ? 1 : 0, 255));
  }
  shift(controller: object, word: NativeX86Word32, count: number, direction: 'left' | 'logicalRight' | 'arithmeticRight', width: Width = 4): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const maximum = this.#maximum(width), bits = width * 8, n = count & 31;
    if (!Number.isInteger(count) || !['left', 'logicalRight', 'arithmeticRight'].includes(direction)) throw new Error('Actual source shift count/direction required');
    if (!n) return word;
    const value = this.#numeric(word, width), sign = 2 ** (bits - 1), signed = value & sign ? value - 2 ** bits : value;
    const result = ((direction === 'left' ? value * 2 ** n : direction === 'logicalRight' ? Math.floor(value / 2 ** n) : Math.floor(signed / 2 ** n)) & maximum) >>> 0;
    const cf = n <= bits ? direction === 'left' ? (value >>> (bits - n)) & 1 : (value >>> (n - 1)) & 1 : 0;
    this.#logicalFlags(result, maximum, width); const f = this.#record(this.#load(this.#bank, 36));
    const of = direction === 'left' ? !!(result & sign) !== !!cf : direction === 'logicalRight' ? !!(value & sign) : false;
    this.#flags((f.value & ~0x801) | cf | (n === 1 && of ? 0x800 : 0), (f.mask & ~0x801) | (n <= bits ? 1 : 0) | (n === 1 ? 0x800 : 0)); return this.#mint(result, maximum);
  }); }
  leave(controller: object): NativeValue<void> { return this.#run(controller, () => {
    const ebp = this.#load(this.#bank, this.#reg('EBP')), offset = this.#address(ebp), saved = this.#load(this.#stack, offset);
    this.#store(this.#bank, this.#reg('ESP'), this.#stackWord(offset + 4)); this.#store(this.#bank, this.#reg('EBP'), saved);
  }); }
  exchangeRegisters(controller: object, left: NativeX86Register, right: NativeX86Register): NativeValue<void> { return this.#run(controller, () => {
    const a = this.#load(this.#bank, this.#reg(left)), b = this.#load(this.#bank, this.#reg(right)); this.#store(this.#bank, this.#reg(left), b); this.#store(this.#bank, this.#reg(right), a);
  }); }
  #store(fields: NativeHeapObjectViews, offset: number, word: NativeX86Word32): void {
    const record = this.#record(word);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + 4 > fields.bytes.length) throw new Error('Owned physical x86 DWORD store outside reservation');
    let slots = this.#slots.get(fields); if (!slots) { slots = new Map(); this.#slots.set(fields, slots); }
    for (const position of slots.keys()) if (position < offset + 4 && position + 4 > offset) slots.delete(position);
    const physicalWord = NativeHeapObjectViews.prototype.maskedWord.call(fields, offset);
    physicalWord.value = record.value; physicalWord.knownMask = record.mask;
    slots.set(offset, Object.freeze({ word, bytes: Object.freeze(Array.from(fields.bytes.subarray(offset, offset + 4))),
      masks: Object.freeze(Array.from(fields.knownMask.subarray(offset, offset + 4))) }));
  }
  #load(fields: NativeHeapObjectViews, offset: number): NativeX86Word32 {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + 4 > fields.bytes.length) throw new Error('Owned physical x86 DWORD load outside reservation');
    const slot = this.#slots.get(fields)?.get(offset);
    if (slot) {
      if (slot.bytes.some((byte, index) => byte !== fields.bytes[offset + index]) || slot.masks.some((mask, index) => mask !== fields.knownMask[offset + index])) {
        this.#slots.get(fields)!.delete(offset); throw new Error('Retained x86 expression slot changed outside its actual store');
      }
      return slot.word;
    }
    const word = NativeHeapObjectViews.prototype.maskedWord.call(fields, offset); return this.#mint(word.value, word.knownMask);
  }
  #reg(name: NativeX86Register): number {
    const index = registers.indexOf(name); if (index < 0) throw new Error('Actual admitted x86 register required'); return index * 4;
  }
  #address(word: NativeX86Word32): number {
    const record = this.#record(word); if (record.provenance?.kind !== 'stack') throw new Error('Actual opaque relative stack address required');
    return record.provenance.offset;
  }
  #push(word: NativeX86Word32): void {
    const esp = this.#load(this.#bank, this.#reg('ESP')), offset = this.#address(esp) - 4;
    this.#store(this.#stack, offset, word); this.#store(this.#bank, this.#reg('ESP'), this.#stackWord(offset));
  }
  #source(type: 'code' | 'image', address: string): NativeX86Word32 {
    if ((type !== 'code' && type !== 'image') || !/^[0-9a-f]{8}$/.test(address)) throw new Error('Admitted source-address metadata required');
    if (type === 'image') { const image = this.#images.get(address); if (!image) throw new Error('Actual registered same-Game source image required'); return image; }
    return this.#mint(0, 0, { kind: 'source', type, address });
  }
  #call(site: string, returnAddress: string): void {
    const returnWord = this.#source('code', returnAddress); this.#push(returnWord);
    this.#calls.push({ site, returnWord, position: this.#address(this.#load(this.#bank, this.#reg('ESP'))), returned: false });
    this.#trace.push('CALL ' + site + ' return ' + returnAddress);
  }
  #ret(argumentBytes = 0): NativeX86Word32 {
    if (!Number.isSafeInteger(argumentBytes) || argumentBytes < 0 || argumentBytes % 4 !== 0) throw new Error('Actual source RET argument cleanup required');
    const esp = this.#address(this.#load(this.#bank, this.#reg('ESP'))), word = this.#load(this.#stack, esp);
    const call = [...this.#calls].reverse().find(entry => !entry.returned);
    if (!call || call.returnWord !== word) throw new Error('Actual owned source CALL/RET continuation required');
    this.#store(this.#bank, this.#reg('ESP'), this.#stackWord(esp + 4 + argumentBytes));
    call.returned = true; this.#currentPc = word; return word;
  }
  beginIoCall(controller: object): NativeValue<void> {
    try { this.#controllerProof(controller); } catch (error) { return unknown(reason(error)); }
    try {
      if (this.#phase !== 'cold') throw new Error(this.#boundary ?? 'Actual ioInit CALL cannot restart');
      this.#phase = 'running'; return this.#run(controller, () => {
        this.#initial = Object.freeze({ esp: this.#load(this.#bank, this.#reg('ESP')), ebp: this.#load(this.#bank, this.#reg('EBP')),
          ebx: this.#load(this.#bank, this.#reg('EBX')), esi: this.#load(this.#bank, this.#reg('ESI')), edi: this.#load(this.#bank, this.#reg('EDI')), fs: this.#load(this.#bank, 32) });
        this.#call('204678ce', '204678d3');
      });
    } catch (error) { this.#boundary ??= reason(error); this.#phase = 'blocked'; return unknown(this.#boundary); }
  }
  register(controller: object, name: NativeX86Register): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#load(this.#bank, this.#reg(name))); }
  setRegister(controller: object, name: NativeX86Register, word: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => this.#store(this.#bank, this.#reg(name), word)); }
  immediate(controller: object, value: number): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Actual source uint32 immediate required'); return this.#mint(value, 0xffffffff);
  }); }
  readGameImageWord(controller: object, label: string, offset: number): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const crt = this.#binding!.crt, selected = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
    if (!selected.known) throw new Error(selected.reason);
    const proof = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, offset, 4);
    if (!proof.known) throw new Error(proof.reason);
    const fields = selected.value;
    let cells = this.#imageReads.get(fields); if (!cells) { cells = new Map(); this.#imageReads.set(fields, cells); }
    const old = cells.get(offset);
    if (old && old.bytes.every((byte, index) => byte === fields.bytes[offset + index]) &&
        old.masks.every((mask, index) => mask === fields.knownMask[offset + index])) return old.word;
    const current = NativeHeapObjectViews.prototype.maskedWord.call(fields, offset), word = this.#mint(current.value, current.knownMask);
    cells.set(offset, Object.freeze({ word, bytes: Object.freeze(Array.from(fields.bytes.subarray(offset, offset + 4))),
      masks: Object.freeze(Array.from(fields.knownMask.subarray(offset, offset + 4))) })); return word;
  }); }
  sourceAddress(controller: object, type: 'code' | 'image', address: string): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#source(type, address)); }
  registerSourceImage(controller: object, address: string, fields: NativeHeapObjectViews): NativeValue<void> { return this.#run(controller, () => {
    const label = address === '206e8e90' ? 'ioInitEH4Scope' : address === '206e8f98' ? 'callocEH4Scope' : address === '206e8e70' ? 'sectionInitExceptionTable' : address === '206e8cb8' ? 'setMbcEH4Scope' : address === '206e8c98' ? 'updateMbcEH4Scope' : address === '206e8b70' ? 'freeEH4Scope' : null;
    if (!label) throw new Error('Only exact admitted Game EH4 scope views are owned');
    const crt = this.#binding!.crt, selected = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
    if (!selected.known || selected.value !== fields) throw new Error('Actual same-Game canonical scope image required');
    const receipt = nativeGameImageReceipt(label);
    if (receipt.address !== address || receipt.bytes !== 28) throw new Error('Exact admitted EH4 scope receipt required');
    const proof = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, 0, 28);
    if (!proof.known) throw new Error(proof.reason);
    const old = this.#images.get(address);
    if (old && this.#record(old).provenance?.kind === 'source' && (this.#record(old).provenance as { fields?: NativeHeapObjectViews }).fields !== fields) throw new Error('Retained source-image capability cannot replace its canonical view');
    if (!old) this.#images.set(address, this.#mint(0, 0, { kind: 'source', type: 'image', address, fields }));
  }); }
  readGameImagePointer(controller: object, label: string, offset = 0): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const crt = this.#binding!.crt, image = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
    if (!image.known) throw new Error(image.reason);
    const access = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, offset, 4);
    if (!access.known) throw new Error(access.reason);
    const pointer = NativeHeapObjectViews.prototype.pointer.call(image.value, offset).get();
    if (pointer === null) return this.#mint(0, 0xffffffff);
    if (label === 'crtHeapHandle' && offset === 0) {
      const heap = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(crt, this.#platform);
      if (!heap.known || heap.value !== pointer) throw new Error(heap.known ? 'Actual current Game heap image pointer required' : heap.reason);
      return this.#mint(0, 0, { kind: 'heap', heap: heap.value });
    }
    if (label === 'crtSectionInitializer' && offset === 0) return this.#objectWord(pointer);
    const word = this.#nativePointers.get(pointer) ?? (label === 'environmentBlock' && this.#setEnvpBinding ? this.#pointerWord(pointer) : undefined);
    if (!word || this.#liveWord(word).provenance?.kind !== 'allocation') throw new Error('Current image pointer lacks an actual returned allocation capability');
    return word;
  }); }
  storeGameImageWord(controller: object, label: string, offset: number, word: NativeX86Word32, width: Width = 4): NativeValue<void> { return this.#run(controller, () => {
    const maximum = this.#maximum(width), crt = this.#binding!.crt, image = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
    if (!image.known) throw new Error(image.reason);
    const access = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, offset, width);
    if (!access.known) throw new Error(access.reason);
    this.#invalidateRange(image.value, offset, width); const record = this.#record(word), field = NativeHeapObjectViews.prototype.maskedWord.call(image.value, offset, width);
    field.value = (record.value & maximum) >>> 0; field.knownMask = (record.mask & maximum) >>> 0;
  }); }
  storeGameImagePointer(controller: object, label: string, offset: number, word: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => {
    const crt = this.#binding!.crt, image = NativeModuleCrtOwner.canonicalImageForOwner(crt, label), record = this.#liveWord(word);
    if (!image.known) throw new Error(image.reason);
    const access = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, offset, 4);
    if (!access.known) throw new Error(access.reason);
    const p = record.provenance;
    if (p?.kind !== 'allocation' && p?.kind !== 'module' && p?.kind !== 'process' && !(record.mask === 0xffffffff && record.value === 0)) throw new Error('Actual allocation or known NULL required for canonical image pointer store');
    this.#invalidateRange(image.value, offset, 4);
    NativeHeapObjectViews.prototype.pointer.call(image.value, offset).set(p?.kind === 'allocation' || p?.kind === 'process' ? p.pointer : p?.kind === 'module' ? this.#modulePointer(p) : null);
  }); }
  requireSourceAddress(controller: object, word: NativeX86Word32, type: 'code' | 'image', address: string): NativeValue<void> { return this.#run(controller, () => {
    const record = this.#record(word); if (record.provenance?.kind !== 'source' || record.provenance.type !== type || record.provenance.address !== address) throw new Error('Actual expected source continuation capability required');
  }); }
  add(controller: object, word: NativeX86Word32, displacement: number): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    return this.#offsetWord(word, displacement);
  }); }
  subtract(controller: object, left: NativeX86Word32, right: NativeX86Word32): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const operand = this.#record(right); if (operand.mask !== 0xffffffff) throw new Error('Current known source stack subtraction operand required');
    const offset = this.#address(left) - operand.value;
    if (offset < 0 || offset > this.#stack.bytes.length) throw new Error('Current stack subtraction exceeds owned reservation');
    this.#flags(0, 0);
    return this.#stackWord(offset);
  }); }
  xor(controller: object, left: NativeX86Word32, right: NativeX86Word32, width: Width = 4): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const a = this.#setEnvpBinding ? this.#liveWord(left) : this.#record(left), b = this.#setEnvpBinding ? this.#liveWord(right) : this.#record(right);
    if (width !== 4) { const maximum = this.#maximum(width), value = (a.value ^ b.value) & maximum, mask = left === right ? maximum : (a.mask & b.mask & maximum); this.#logicalFlags(value, mask, width); return this.#mint(value, mask); }
    if (left === right) { this.#logicalFlags(0, 0xffffffff, 4); return this.#mint(0, 0xffffffff); }
    const same = (x: NativeX86Word32, y: NativeX86Word32) => x === y || (this.#record(x).mask === 0xffffffff && this.#record(y).mask === 0xffffffff && this.#record(x).value === this.#record(y).value);
    if (a.provenance?.kind === 'xor' && same(a.provenance.right, right)) { const r = this.#record(a.provenance.left); this.#logicalFlags(r.value, r.mask, 4); return a.provenance.left; }
    if (b.provenance?.kind === 'xor' && same(b.provenance.right, left)) { const r = this.#record(b.provenance.left); this.#logicalFlags(r.value, r.mask, 4); return b.provenance.left; }
    this.#logicalFlags(a.value ^ b.value, a.mask & b.mask, 4);
    return this.#mint(a.value ^ b.value, a.mask & b.mask, { kind: 'xor', left, right });
  }); }
  compare(controller: object, left: NativeX86Word32, right: NativeX86Word32, width: Width = 4): NativeValue<void> { return this.#run(controller, () => {
    const a = this.#liveWord(left), b = this.#liveWord(right), maximum = this.#maximum(width), p = a.provenance, q = b.provenance;
    if(left===right){this.#arithmeticFlags(0,0,0,width,true);return;}
    if (width === 4 && p?.kind === 'allocation' && q?.kind === 'allocation' && p.allocation === q.allocation) {
      this.#flags((p.offset < q.offset ? 1 : 0) | (p.offset === q.offset ? 0x40 : 0), 0x41); return;
    }
    if (width === 4 && p?.kind === 'stack' && q?.kind === 'stack') {
      this.#flags((p.offset < q.offset ? 1 : 0) | (p.offset === q.offset ? 0x40 : 0), 0x41); return;
    }
    const pointer = (r: WordRecord) => r.provenance && ['allocation', 'heap', 'module', 'process', 'stack'].includes(r.provenance.kind);
    const zero = (r: WordRecord) => r.mask === 0xffffffff && r.value === 0;
    if (width === 4 && pointer(a) && zero(b)) { this.#flags(0, 0x41); return; }
    if (width === 4 && zero(a) && pointer(b)) { this.#flags(1, 0x41); return; }
    // Opaque capabilities establish equality relations, never invented
    // numerical address ordering or sign bits. A minted valid handle is
    // distinct from NULL and the two native invalid-handle sentinels.
    if (width === 4 && p?.kind === 'module' && q?.kind === 'module' && p.fields.bytes.buffer === q.fields.bytes.buffer) { const ap = p.fields.bytes.byteOffset + p.offset, bp = q.fields.bytes.byteOffset + q.offset; this.#flags((ap < bp ? 1 : 0) | (ap === bp ? 0x40 : 0), 0x41); return; }
    if (width === 4 && p?.kind === 'platform' && q?.kind === 'platform') {
      this.#flags(p.object === q.object ? 0x40 : 0, 0x40); return;
    }
    const excluded = (cap: WordRecord, scalar: WordRecord) => cap.provenance?.kind === 'platform' &&
      scalar.mask === 0xffffffff && (scalar.value === 0 ||
        (cap.provenance.category === 'handle' && (scalar.value === 0xffffffff || scalar.value === 0xfffffffe)));
    if (width === 4 && (excluded(a, b) || excluded(b, a))) { this.#flags(0, 0x40); return; }
    if (((a.mask & maximum) >>> 0) !== maximum || ((b.mask & maximum) >>> 0) !== maximum) {
      const unequal = ((a.value ^ b.value) & a.mask & b.mask & maximum) !== 0;
      this.#flags(0, unequal ? 0x40 : 0); return;
    }
    const av = (a.value & maximum) >>> 0, bv = (b.value & maximum) >>> 0;
    this.#arithmeticFlags(av, bv, ((av - bv) & maximum) >>> 0, width, true);
  }); }
  test(controller: object, left: NativeX86Word32, right: NativeX86Word32, width: Width = 4): NativeValue<void> { return this.#run(controller, () => {
    const a = this.#liveWord(left), b = this.#liveWord(right);
    if (width === 4 && left === right && (a.provenance && ['allocation','heap','platform','module','process','stack'].includes(a.provenance.kind))) { this.#flags(0, 0x841); return; }
    const mask = (a.mask & b.mask) | ((~a.value) & a.mask) | ((~b.value) & b.mask);
    this.#logicalFlags(a.value & b.value, mask, width);
  }); }
  condition(controller: object, condition: NativeX86Condition): NativeValue<boolean> { return this.#run(controller, () => {
    const flags = this.#record(this.#load(this.#bank, 36)), required = condition === 'be' || condition === 'a' ? 0x41 : condition === 'c' || condition === 'nc' ? 1 : condition === 'l' || condition === 'ge' ? 0x880 : condition === 'le' || condition === 'g' ? 0x8c0 : 0x40;
    if (!['z', 'nz', 'be', 'a', 'c', 'nc', 'l', 'ge', 'le', 'g'].includes(condition) || (flags.mask & required) !== required) throw new Error('Current known consumed x86 branch flags required');
    const z = (flags.value & 0x40) !== 0, c = (flags.value & 1) !== 0;
    return condition === 'z' ? z : condition === 'nz' ? !z : condition === 'be' ? c || z : condition === 'a' ? !c && !z : condition === 'l' ? !!(flags.value & 0x80) !== !!(flags.value & 0x800) : condition === 'ge' ? !!(flags.value & 0x80) === !!(flags.value & 0x800) : condition === 'le' ? z || !!(flags.value & 0x80) !== !!(flags.value & 0x800) : condition === 'g' ? !z && !!(flags.value & 0x80) === !!(flags.value & 0x800) : condition === 'nc' ? !c : c;
  }); }
  alu(controller: object, op: 'add' | 'sub' | 'sbb' | 'imul' | 'or' | 'and', left: NativeX86Word32, right: NativeX86Word32,
    width: Width = 4): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const a = this.#liveWord(left), b = this.#liveWord(right), maximum = this.#maximum(width);
    if (op === 'or' || op === 'and') {
      if (width === 4 && op === 'and' && b.mask === 0xffffffff && a.provenance?.kind === 'stack') {
        if (b.value === 0xfffff000) { const result = this.#stackWord(a.provenance.offset & ~0xfff), r = this.#record(result); this.#logicalFlags(r.value, r.mask, 4); return result; }
        if (b.value === 0xffffffff) { this.#logicalFlags(a.value, a.mask, 4); return left; }
      }
      const value = op === 'or' ? a.value | b.value : a.value & b.value;
      const mask = op === 'or' ? (a.mask & b.mask) | (a.value & a.mask) | (b.value & b.mask)
        : (a.mask & b.mask) | ((~a.value) & a.mask) | ((~b.value) & b.mask);
      this.#logicalFlags(value, mask, width); return this.#mint(value & maximum, mask & maximum);
    }
    if (width === 4 && op === 'sub' && a.provenance?.kind === 'allocation' && b.provenance?.kind === 'allocation') {
      const p = a.provenance, q = b.provenance;
      if (p.allocation !== q.allocation) throw new Error('Actual same retained allocation required for pointer difference');
      const difference = p.offset - q.offset, value = difference >>> 0;
      // The retained nonwrapping same-root interval proves offset difference
      // and unsigned ordering. Opaque base sign does not prove x86 OF/AF.
      this.#flags((difference < 0 ? 1 : 0) | (value === 0 ? 0x40 : 0) | (value & 0x80000000 ? 0x80 : 0) |
        (this.#parity(value & 255) ? 4 : 0), 0xc5); return this.#mint(value, 0xffffffff);
    }
    if (width === 4 && (op === 'add' || op === 'sub')) {
      const pointer = ['allocation', 'stack', 'module', 'process'].includes(a.provenance?.kind ?? '');
      const reverse = op === 'add' && ['allocation', 'stack', 'module', 'process'].includes(b.provenance?.kind ?? '');
      if (pointer || reverse) {
        const amount = this.#numeric(pointer ? right : left, 4);
        const result = this.#offsetWord(pointer ? left : right, op === 'sub' ? -(amount | 0) : amount | 0);
        this.#flags(amount > 0x7fffffff ? 1 : 0, a.provenance?.kind === 'stack' || b.provenance?.kind === 'stack' ? 1 : 0); return result;
      }
    }
    if (op === 'sub' && left === right) { this.#arithmeticFlags(0, 0, 0, width, true); return this.#mint(0, maximum); }
    if (op === 'sbb' && left === right) { const f = this.#record(this.#load(this.#bank, 36)); if (!(f.mask & 1)) throw new Error('Current CF required'); const carry = f.value & 1, v = (-carry & maximum) >>> 0; this.#arithmeticFlags(0, 0, v, width, true, carry); return this.#mint(v, maximum); }
    if (op === 'add' && (((a.mask & maximum) >>> 0) !== maximum || ((b.mask & maximum) >>> 0) !== maximum)) {
      return this.#maskedAdd(a, b, width);
    }
    const av = this.#numeric(left, width), bv = this.#numeric(right, width);
    if (op === 'imul') {
      if (width !== 4) throw new Error('Selected source IMUL requires DWORD operands');
      const product = BigInt(av | 0) * BigInt(bv | 0), low = Number(BigInt.asUintN(32, product));
      const overflow = product !== BigInt.asIntN(32, product); this.#flags(overflow ? 0x801 : 0, 0x801); return this.#mint(low, 0xffffffff);
    }
    let carry = 0;
    if (op === 'sbb') { const flags = this.#record(this.#load(this.#bank, 36)); if (!(flags.mask & 1)) throw new Error('Current known CF required by SBB'); carry = flags.value & 1; }
    if (!['add', 'sub', 'sbb'].includes(op)) throw new Error('Actual selected x86 ALU operation required');
    const subtract = op !== 'add', value = ((subtract ? av - bv - carry : av + bv) & maximum) >>> 0;
    this.#arithmeticFlags(av, bv, value, width, subtract, carry); return this.#mint(value, maximum);
  }); }
  increment(controller: object, word: NativeX86Word32, width: Width = 4): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const pointer = this.#liveWord(word).provenance;
    if (width === 4 && pointer && ['stack','allocation','module','process'].includes(pointer.kind)) {
      const before = this.#record(this.#load(this.#bank, 36)), result = this.#offsetWord(word, 1);
      this.#flags(before.value & 1, (before.mask & 1) | 0x40); return result;
    }
    const maximum = this.#maximum(width), before = this.#record(this.#load(this.#bank, 36)), value = this.#numeric(word, width), result = ((value + 1) & maximum) >>> 0;
    this.#arithmeticFlags(value, 1, result, width, false);
    const after = this.#record(this.#load(this.#bank, 36)); this.#flags((after.value & ~1) | (before.value & 1), (after.mask & ~1) | (before.mask & 1));
    return this.#mint(result, maximum);
  }); }
  decrement(controller: object, word: NativeX86Word32, width: Width = 4): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const pointer = this.#liveWord(word).provenance;
    if (width === 4 && pointer && ['stack','allocation','module','process'].includes(pointer.kind)) {
      const before = this.#record(this.#load(this.#bank, 36)), result = this.#offsetWord(word, -1);
      this.#flags(before.value & 1, (before.mask & 1) | 0x40); return result;
    }
    const maximum = this.#maximum(width), before = this.#record(this.#load(this.#bank, 36)), value = this.#numeric(word, width), result = ((value - 1) & maximum) >>> 0;
    this.#arithmeticFlags(value, 1, result, width, true);
    const after = this.#record(this.#load(this.#bank, 36)); this.#flags((after.value & ~1) | (before.value & 1), (after.mask & ~1) | (before.mask & 1));
    return this.#mint(result, maximum);
  }); }
  negate(controller: object, word: NativeX86Word32, width: Width = 4): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const maximum = this.#maximum(width), r = this.#liveWord(word);
    if (width === 4 && r.provenance && ['stack', 'allocation', 'module', 'process'].includes(r.provenance.kind)) { this.#flags(1, 0x41); return this.#mint(-r.value, r.mask, { kind: 'neg', word }); }
    const value = this.#numeric(word, width), result = (-value & maximum) >>> 0;
    this.#arithmeticFlags(0, value, result, width, true); return this.#mint(result, maximum);
  }); }
  divideUnsigned(controller: object, divisor: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => {
    const d = this.#numeric(divisor, 4), high = this.#numeric(this.#load(this.#bank, this.#reg('EDX')), 4), low = this.#numeric(this.#load(this.#bank, this.#reg('EAX')), 4);
    if (d === 0) throw new Error('Actual DIV zero divisor requires an unowned native exception');
    const numerator = (BigInt(high) << 32n) | BigInt(low), quotient = numerator / BigInt(d);
    if (quotient > 0xffffffffn) throw new Error('Actual DIV quotient overflow requires an unowned native exception');
    this.#store(this.#bank, this.#reg('EAX'), this.#mint(Number(quotient), 0xffffffff));
    this.#store(this.#bank, this.#reg('EDX'), this.#mint(Number(numerator % BigInt(d)), 0xffffffff)); this.#flags(0, 0);
  }); }
  loadWidth(controller: object, address: NativeX86Word32, width: Width): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    this.#maximum(width); const memory = this.#memory(address, width);
    if (width === 4) return this.#currentMemoryWord(memory.fields, memory.offset);
    const word = NativeHeapObjectViews.prototype.maskedWord.call(memory.fields, memory.offset, width); return this.#mint(word.value, word.knownMask);
  }); }
  storeWidth(controller: object, address: NativeX86Word32, word: NativeX86Word32, width: Width): NativeValue<void> { return this.#run(controller, () => {
    this.#writeMemory(address, word, width);
  }); }
  #writeMemory(address: NativeX86Word32, word: NativeX86Word32, width: Width): void {
    const maximum = this.#maximum(width), memory = this.#memory(address, width), record = this.#record(word);
    if (width === 4 && memory.fields === this.#stack) { this.#store(memory.fields, memory.offset, word); return; }
    const p = this.#liveWord(word).provenance;
    if (width === 4 && (p?.kind === 'platform' || p?.kind === 'allocation' || p?.kind === 'module' || p?.kind === 'process' || p?.kind === 'shared-local')) {
      this.#invalidateRange(memory.fields, memory.offset, 4); this.#store(memory.fields, memory.offset, word);
      NativeHeapObjectViews.prototype.pointer.call(memory.fields, memory.offset).set(p.kind === 'platform' ? p.object : p.kind === 'module' ? this.#modulePointer(p) : p.kind==='shared-local'?Object.freeze({fields:p.fields,offset:p.offset??0}):p.pointer); return;
    }
    this.#invalidateRange(memory.fields, memory.offset, width);
    const field = NativeHeapObjectViews.prototype.maskedWord.call(memory.fields, memory.offset, width);
    field.value = (record.value & maximum) >>> 0; field.knownMask = (record.mask & maximum) >>> 0;
  }
  #stringDword(move: boolean): void {
    const direction = NativeRuntimePlatform.readNativeDirectionFlag(this.#platform); if (!direction.known) throw new Error(direction.reason);
    const destination = this.#load(this.#bank, this.#reg('EDI'));
    const source = move ? this.#load(this.#bank, this.#reg('ESI')) : this.#load(this.#bank, this.#reg('EAX'));
    const memory = move ? this.#memory(source, 4) : null;
    const word = memory ? this.#currentMemoryWord(memory.fields, memory.offset) : source;
    this.#writeMemory(destination, word, 4);
    this.#store(this.#bank, this.#reg('EDI'), this.#offsetWord(destination, direction.value ? -4 : 4));
    if (move) this.#store(this.#bank, this.#reg('ESI'), this.#offsetWord(source, direction.value ? -4 : 4));
  }
  storeDwordString(controller: object): NativeValue<void> { return this.#run(controller, () => this.#stringDword(false)); }
  repeatMoveDwords(controller: object): NativeValue<void> { return this.#run(controller, () => {
    while (this.#numeric(this.#load(this.#bank, this.#reg('ECX')),4) !== 0) {
      this.#check(controller); this.#stringDword(true);
      this.#store(this.#bank, this.#reg('ECX'), this.#mint(this.#numeric(this.#load(this.#bank, this.#reg('ECX')),4)-1,0xffffffff));
    }
  }); }
  repeatStoreDwords(controller: object): NativeValue<void> { return this.#run(controller, () => {
    while (this.#numeric(this.#load(this.#bank, this.#reg('ECX')),4) !== 0) {
      this.#check(controller); this.#stringDword(false);
      this.#store(this.#bank, this.#reg('ECX'), this.#mint(this.#numeric(this.#load(this.#bank, this.#reg('ECX')),4)-1,0xffffffff));
    }
  }); }
  loadPointer(controller: object, address: NativeX86Word32): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const memory = this.#memory(address, 4); return this.#currentMemoryWord(memory.fields, memory.offset);
  }); }
  runtimeProcedure(controller: object, name: 'TlsGetValue' | 'HeapAlloc' | 'InterlockedIncrement' | 'MultiByteToWideChar' | 'LCMapStringW'): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const procedure = name === 'TlsGetValue' ? NativeRuntimePlatform.standardIoTlsProcedureForPlatform(this.#platform)
      : NativeRuntimePlatform.argvProcedureForPlatform(this.#platform, name);
    if (!procedure.known) throw new Error(procedure.reason); return this.#objectWord(procedure.value);
  }); }
  load(controller: object, address: NativeX86Word32): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#load(this.#stack, this.#address(address))); }
  store(controller: object, address: NativeX86Word32, word: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => this.#store(this.#stack, this.#address(address), word)); }
  push(controller: object, word: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => this.#push(word)); }
  pop(controller: object, name: NativeX86Register): NativeValue<void> { return this.#run(controller, () => {
    const esp = this.#address(this.#load(this.#bank, this.#reg('ESP'))), word = this.#load(this.#stack, esp);
    this.#store(this.#bank, this.#reg(name), word);
    if (name !== 'ESP') this.#store(this.#bank, this.#reg('ESP'), this.#stackWord(esp + 4));
  }); }
  call(controller: object, site: string, returnAddress: string): NativeValue<void> { return this.#run(controller, () => this.#call(site, returnAddress)); }
  ret(controller: object, argumentBytes = 0): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#ret(argumentBytes)); }
  /** Fixed original import site; the caller cannot supply a grant, source PC,
   * argument view, endpoint implementation or a completed return snapshot. */
  invokeStartupInfoA(controller: object): NativeValue<void> { return this.#run(controller, () => {
    const endpoints = this.#platform.startupIoEndpoints;
    if (!endpoints) throw new Error('GetStartupInfoA20474314 requires an actual selected Runtime writer');
    const endpointProof = NativeRuntimePlatform.canonicalStartupIoEndpointsForPlatform(this.#platform, endpoints);
    if (!endpointProof.known) throw new Error(endpointProof.reason);
    const binding = this.#binding!, actual = NativeGameCrtIoInit.canonicalStartupInfoCallForCrt(binding.owner, binding.crt, controller);
    if (!actual.known) throw new Error(actual.reason);
    if (this.#startupGrant) throw new Error('Retained startup import cannot replay');
    const argumentPosition = this.#address(this.#load(this.#bank, this.#reg('ESP'))), argument = this.#load(this.#stack, argumentPosition);
    const ebp = this.#address(this.#load(this.#bank, this.#reg('EBP'))), offset = ebp - 0x64, fields = this.#startupViews.get(offset);
    if (!fields || fields !== actual.value || this.#address(argument) !== offset || argumentPosition !== ebp - 0x78) throw new Error('Current startup argument must resolve to its exact private68-byte frame alias');
    this.#call('20474314', '2047431a'); this.#startupInfoCallPushed = true;
    const top = this.#calls.at(-1)!, grant = Object.freeze({ identity: Object.freeze({}) });
    const call: StartupCall = { stack: this, controller, fields, offset, argument,
      position: top.position, returnWord: top.returnWord, phase: 'pending' };
    this.#startupGrant = grant; startupCalls.set(grant, call); this.#startupInfoWriterCalled = true;
    const result = endpoints.getStartupInfoA(grant); if (!result.known) throw new Error(result.reason);
    const returned = NativeRuntimePlatform.canonicalStartupInfoNormalReturnForPlatform(this.#platform, grant);
    if (!returned.known) throw new Error(returned.reason);
    this.#startupProof(grant, call);
    // Explicit virtual ABI, not observed Windows registers: the void import
    // supplies no known volatile bits. Callee-saved registers/FS stay retained.
    for (const name of ['EAX', 'ECX', 'EDX'] as const) this.#store(this.#bank, this.#reg(name), this.#mint(0, 0));
    this.#flags(0, 0);
    const continuation = this.#load(this.#stack, call.position), record = this.#record(continuation);
    if (record.provenance?.kind !== 'source' || record.provenance.type !== 'code' || record.provenance.address !== '2047431a') throw new Error('Actual startup stdcall continuation required');
    if (this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== call.position ||
        call.position + 4 !== argumentPosition || this.#load(this.#stack, argumentPosition) !== argument ||
        call.position + 8 > this.#stack.bytes.length) throw new Error('Actual startup stdcall argument cleanup required');
    // The declared RET4 consumes the return and argument in one owned ESP
    // transition. Unknown outcomes never reach this normal-return operation.
    this.#store(this.#bank, this.#reg('ESP'), this.#stackWord(call.position + 8));
    top.returned = true; this.#currentPc = continuation;
    call.phase = 'returned'; this.#startupInfoWriterReturned = true;
  }); }
  invokeHeapAlloc(controller: object): NativeValue<void> { return this.#run(controller, () => {
    const binding = this.#binding!, site = NativeGameCrtIoInit.canonicalHeapAllocCallForCrt(binding.owner, binding.crt, controller);
    if (!site.known) throw new Error(site.reason);
    const endpoint = this.#platform.heapAllocEndpoint;
    if (!endpoint) throw new Error('Actual selected HeapAlloc endpoint is absent at20477ce8');
    const endpointProof = NativeRuntimePlatform.canonicalHeapAllocEndpointForPlatform(this.#platform, endpoint);
    if (!endpointProof.known) throw new Error(endpointProof.reason);
    const frame = this.#address(this.#load(this.#bank, this.#reg('EBP'))), argument = this.#address(this.#load(this.#bank, this.#reg('ESP')));
    if (argument !== frame - 0x38) throw new Error('Actual nested HeapAlloc argument geometry required');
    const heapWord = this.#load(this.#stack, argument), flagsWord = this.#load(this.#stack, argument + 4), bytesWord = this.#load(this.#stack, argument + 8);
    const p = this.#liveWord(heapWord).provenance, bytes = this.#numeric(bytesWord, 4);
    if (p?.kind !== 'heap' || this.#numeric(flagsWord, 4) !== 8) throw new Error('Actual current HeapAlloc handle/zeroing flags required');
    this.#call('20477ce8', '20477cee'); this.#heapAllocCallPushed = true;
    const top = this.#calls.at(-1)!, grant: NativeHeapAllocCallGrant = Object.freeze({ identity: Object.freeze({}) });
    const call: HeapCall = { stack: this, controller, crt: binding.crt, heap: p.heap, heapWord, flagsWord, bytesWord, bytes,
      frame, position: top.position, returnWord: top.returnWord, phase: 'pending' };
    heapCalls.set(grant, call); this.#heapGrant = grant; this.#heapProof(grant, call);
    this.#heapAllocCalled = true;
    let result: NativeValue<NativeMemoryBacking | null>;
    try { result = endpoint(grant); }
    finally {
      const effect = NativeRuntimePlatform.heapAllocEffectForPlatform(this.#platform, grant);
      if (effect.known && effect.value !== null) this.#heapAllocBlockAllocated = true;
    }
    if (!result.known) throw new Error(result.reason);
    const normal = NativeRuntimePlatform.canonicalHeapAllocNormalReturnForPlatform(this.#platform, grant);
    if (!normal.known || normal.value !== result.value) throw new Error(normal.known ? 'Actual normal HeapAlloc result identity changed' : normal.reason);
    this.#heapProof(grant, call);
    let word: NativeX86Word32;
    if (result.value === null) word = this.#mint(0, 0xffffffff);
    else {
      const allocation = this.#allocationFromBacking(result.value, call.heap), fields = allocation.fields;
      this.#allocationLive(allocation, 0, bytes);
      if (fields.bytes.length !== bytes || fields.bytes.some(byte => byte !== 0) || fields.knownMask.some(mask => mask !== 255)) {
        throw new Error('Actual exact zeroed HeapAlloc result/masks required');
      }
      word = this.#allocationWord(allocation, 0);
    }
    this.#store(this.#bank, this.#reg('EAX'), word);
    for (const name of ['ECX', 'EDX'] as const) this.#store(this.#bank, this.#reg(name), this.#mint(0, 0));
    this.#flags(0, 0); this.#heapProof(grant, call);
    // One normal stdcall12 return transition. No unknown outcome consumes any
    // argument/return or unwinds the nested/outer FS registrations.
    this.#store(this.#bank, this.#reg('ESP'), this.#stackWord(call.position + 16));
    top.returned = true; call.phase = 'returned'; this.#currentPc = call.returnWord; this.#heapAllocReturned = true; this.#heapGrant = null;
  }); }
  #sectionView(pointer: NativeBytePointer): NativeHeapObjectViews {
    const fields = pointer.fields, backing = fields.backing as NativeMemoryBacking;
    const begin = fields.bytes.byteOffset - backing.bytes.byteOffset + pointer.offset;
    let positions = this.#sectionViews.get(backing);
    if (!positions) { positions = new Map(); this.#sectionViews.set(backing, positions); }
    const old = positions.get(begin); if (old) return old;
    const alias = new NativeHeapObjectViews(backing, begin, 24);
    Object.freeze(alias.view); Object.preventExtensions(alias.bytes); Object.preventExtensions(alias.knownMask); Object.freeze(alias);
    positions.set(begin, alias); return alias;
  }
  #invokeStandard(controller: object, site: NativeStandardIoCallSite): NativeValue<void> { return this.#run(controller, () => {
    const binding = this.#binding!, spec = standardSites[site];
    const source = NativeGameCrtIoInit.canonicalStandardIoCallForCrt(binding.owner, binding.crt, controller, site);
    if (!source.known) throw new Error(source.reason);
    const endpoints = this.#platform.standardIoEndpoints;
    if (!endpoints) throw new Error('Actual selected standard-I/O endpoint is absent at' + site);
    const endpointProof = NativeRuntimePlatform.canonicalStandardIoEndpointsForPlatform(this.#platform, endpoints);
    if (!endpointProof.known) throw new Error(endpointProof.reason);
    if (this.#standardGrant) throw new Error('An interrupted standard-I/O call cannot replay');
    const frame = this.#address(this.#load(this.#bank, this.#reg('EBP')));
    const argumentPosition = this.#address(this.#load(this.#bank, this.#reg('ESP')));
    if (argumentPosition !== frame + spec.position + 4) throw new Error('Actual standard-I/O argument geometry required');
    const argumentWords = Object.freeze(Array.from({ length: spec.argumentBytes / 4 }, (_, index) => this.#load(this.#stack, argumentPosition + index * 4)));
    let scalar: number | undefined, object: object | undefined, procedure: object | undefined;
    let section: NativeBytePointer | undefined, sectionFields: NativeHeapObjectViews | undefined;
    switch (spec.kind) {
      case 'GetStdHandle': case 'SetHandleCount': scalar = this.#numeric(argumentWords[0]!, 4); break;
      case 'GetFileType': object = this.#platformObject(argumentWords[0]!, 'handle'); break;
      case 'TlsGetValue': scalar = this.#numeric(argumentWords[0]!, 4); procedure = this.#platformObject(this.#load(this.#bank, this.#reg('ESI')), 'tls-get'); break;
      case 'FlsGetValue': scalar = this.#numeric(argumentWords[0]!, 4); procedure = this.#platformObject(this.#load(this.#bank, this.#reg('EAX')), 'fls-get'); break;
      case 'DecodePointer': object = this.#platformObject(argumentWords[0]!, 'encoded'); procedure = this.#platformObject(this.#load(this.#bank, this.#reg('EAX')), 'decode'); break;
      case 'InitializeCriticalSectionAndSpinCount': {
        const p = this.#liveWord(argumentWords[0]!).provenance;
        if (p?.kind !== 'allocation') throw new Error('Actual contained Game section pointer required');
        this.#allocationLive(p.allocation, p.offset, 24);
        section = p.pointer; sectionFields = this.#sectionView(section);
        scalar = this.#numeric(argumentWords[1]!, 4); procedure = this.#platformObject(this.#load(this.#bank, this.#reg('ESI')), 'section'); break;
      }
    }
    const args: NativeStandardIoArguments = Object.freeze({ site, kind: spec.kind, crt: binding.crt, scalar, object, procedure, section, sectionFields });
    const row = { site, callPushed: false, called: false, returned: false, sectionRegistered: false };
    this.#standardIoRows.push(row);
    // Capacity failure happens at this real CALL, retaining the existing
    // argument stores without manufacturing a pending return or enlarging it.
    this.#call(site, spec.returnAddress); row.callPushed = true;
    const top = this.#calls.at(-1)!, grant: NativeStandardIoCallGrant = Object.freeze({ identity: Object.freeze({}) });
    const call: StandardCall = { stack: this, controller, args, position: top.position, frame,
      fs: this.#load(this.#bank, 32), argumentWords, returnWord: top.returnWord, argumentBytes: spec.argumentBytes, phase: 'pending' };
    standardCalls.set(grant, call); this.#standardGrant = grant; this.#standardProof(grant, call);
    row.called = true;
    let result: NativeValue<object | number | null>;
    try { result = endpoints.invoke(grant); }
    finally {
      const effect = NativeRuntimePlatform.standardIoEffectForPlatform(this.#platform, grant);
      if (effect.known && effect.value.sectionRegistered) row.sectionRegistered = true;
    }
    if (!result.known) throw new Error(result.reason);
    const normal = NativeRuntimePlatform.canonicalStandardIoNormalReturnForPlatform(this.#platform, grant);
    if (!normal.known || normal.value !== result.value) throw new Error(normal.known ? 'Actual standard-I/O result identity changed' : normal.reason);
    this.#standardProof(grant, call);
    const word = result.value === null ? this.#mint(0, 0xffffffff)
      : typeof result.value === 'number' ? this.#mint(result.value, 0xffffffff) : this.#objectWord(result.value);
    // ABI register clobbers follow the actual normal result proof. The
    // pending procedure in EAX is consumed before replacing that register.
    this.#store(this.#bank, this.#reg('EAX'), word);
    for (const name of ['ECX', 'EDX'] as const) this.#store(this.#bank, this.#reg(name), this.#mint(0, 0));
    this.#flags(0, 0);
    const continuation = this.#load(this.#stack, call.position), continuationRecord = this.#record(continuation);
    if (continuation !== call.returnWord || continuationRecord.provenance?.kind !== 'source' ||
        continuationRecord.provenance.type !== 'code' || continuationRecord.provenance.address !== spec.returnAddress ||
        this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== call.position ||
        call.argumentWords.some((argument, index) => this.#load(this.#stack, call.position + 4 + index * 4) !== argument) ||
        this.#load(this.#bank, 32) !== call.fs || call.position + 4 + call.argumentBytes > this.#stack.bytes.length) {
      throw new Error('Actual standard-I/O pending return and normal stdcall cleanup required');
    }
    // Single normal RET4/RET8. Unknown outcomes retain all current stack
    // arguments, nested FS registrations and lower effects.
    this.#store(this.#bank, this.#reg('ESP'), this.#stackWord(call.position + 4 + call.argumentBytes));
    top.returned = true; call.phase = 'returned'; this.#currentPc = continuation; row.returned = true; this.#standardGrant = null;
  }); }
  invokeGetStdHandle(controller: object): NativeValue<void> { return this.#invokeStandard(controller, '204744b4'); }
  invokeArgvImport(controller: object, site: NativeArgvCallSite): NativeValue<void> { return this.#run(controller, () => {
    const binding = this.#argvBinding, spec = argvSites[site];
    if (!binding || !spec || this.#argvGrant) throw new Error('Actual fresh same-controller argv import site required');
    const source = NativeGameCrtArgv.canonicalArgvImportCallForCrt(binding.owner, binding.crt, controller, site); if (!source.known) throw new Error(source.reason);
    const endpoints = this.#platform.argvNlsEndpoints;
    if (!endpoints) throw new Error('Selected argv/NLS endpoint absent at' + site);
    const endpoint = NativeRuntimePlatform.canonicalArgvNlsEndpointsForPlatform(this.#platform, endpoints); if (!endpoint.known) throw new Error(endpoint.reason);
    const position = this.#address(this.#load(this.#bank, this.#reg('ESP'))), words = Object.freeze(Array.from({length: spec[1]},(_,index)=>this.#load(this.#stack,position+index*4)));
    const args: NativeArgvArgument[] = words.map(word => {
      const p = this.#liveWord(word).provenance;
      if (p?.kind === 'heap') return Object.freeze({kind:'object' as const,value:p.heap});
      if (p?.kind === 'platform') return Object.freeze({kind:'object' as const,value:p.object});
      if (p && ['stack','allocation','module','process'].includes(p.kind)) { const memory=this.#memory(word,1); return Object.freeze({kind:'memory' as const,...memory}); }
      return Object.freeze({kind:'scalar' as const,value:this.#numeric(word,4)});
    });
    let procedure: object | undefined;
    if (spec[3]) { const p=this.#liveWord(this.#load(this.#bank,this.#reg(spec[3]))).provenance; if(p?.kind!=='platform')throw new Error('Actual indirect import capability required'); procedure=p.object; }
    const chain = NativeGameCrtArgv.canonicalSourceFrameChainForCrt(binding.owner,binding.crt,controller); if(!chain.known)throw new Error(chain.reason);
    const row={site,callPushed:false,called:false,returned:false};this.#argvRows.push(row);
    this.#call(site,spec[2]);row.callPushed=true;
    const top=this.#calls.at(-1)!, grant=Object.freeze({identity:Object.freeze({})});
    const call: ArgvCall={stack:this,controller,args:Object.freeze({crt:binding.crt,site,kind:spec[0],arguments:Object.freeze(args),procedure}),
      position:top.position,fs:this.#load(this.#bank,32),returnWord:top.returnWord,words,argumentBytes:spec[1]*4,
      frames:Object.freeze(chain.value.map(frame=>frame.entry+':'+frame.site+':'+frame.returnPc)),phase:'pending'};
    argvCalls.set(grant,call);this.#argvGrant=grant;this.#argvProof(grant,call);row.called=true;
    const result=endpoints.invoke(grant);if(!result.known)throw new Error(result.reason);
    const normal=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform(this.#platform,grant);
    if(!normal.known||normal.value!==result.value)throw new Error(normal.known?'Actual argv normal result identity changed':normal.reason);
    this.#argvProof(grant,call);
    let word:NativeX86Word32;
    if(result.value.kind==='scalar')word=this.#mint(result.value.value,0xffffffff);
    else if(result.value.kind==='void')word=this.#mint(0,0);
    else if(result.value.value===null)word=this.#mint(0,0xffffffff);
    else if(spec[0]==='HeapAlloc') {
      const backing=result.value.value as NativeMemoryBacking;
      const heap=NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(binding.crt,this.#platform);if(!heap.known)throw new Error(heap.reason);
      const allocation=this.#allocationFromBacking(backing,heap.value),fields=allocation.fields;this.#allocationLive(allocation,0,this.#numeric(words[2]!,4));
      if(fields.bytes.length!==this.#numeric(words[2]!,4))throw new Error('Actual exact malloc backing size required');
      word=this.#allocationWord(allocation,0);
    } else word=this.#pointerWord(result.value.value);
    this.#store(this.#bank,this.#reg('EAX'),word);
    for(const name of ['ECX','EDX'] as const)this.#store(this.#bank,this.#reg(name),this.#mint(0,0));
    this.#flags(0,0);this.#ret(call.argumentBytes);call.phase='returned';row.returned=true;this.#argvGrant=null;
  }); }
  invokeSetEnvpImport(controller: object, site: NativeSetEnvpCallSite): NativeValue<void> { return this.#run(controller, () => {
    const binding = this.#setEnvpBinding;
    if (!binding || (site !== '20477ce8' && site !== '20467cd2')) throw new Error('Exact bound environment source import required');
    const gate = NativeGameCrtSetEnvp.canonicalSetEnvpImportCallForCrt(binding.owner, binding.crt, controller, site); if (!gate.known) throw new Error(gate.reason);
    const endpoints = this.#platform.setEnvpEndpoints;
    if (!endpoints) throw new Error('Explicit fresh environment endpoint is absent');
    const proof = NativeRuntimePlatform.canonicalSetEnvpEndpointsForPlatform(this.#platform, endpoints); if (!proof.known) throw new Error(proof.reason);
    const frame = this.#address(this.#load(this.#bank, this.#reg('EBP'))), position = this.#address(this.#load(this.#bank, this.#reg('ESP')));
    if (position !== frame - 0x38) throw new Error('Actual environment import argument geometry required');
    const words = Object.freeze([0, 4, 8].map(offset => this.#load(this.#stack, position + offset))), hp = this.#liveWord(words[0]!).provenance;
    if (hp?.kind !== 'heap') throw new Error('Actual current Game heap capability required');
    const flags = this.#numeric(words[1]!, 4), p = site === '20467cd2' ? this.#liveWord(words[2]!).provenance : undefined;
    if (flags !== (site === '20477ce8' ? 8 : 0) || (site === '20467cd2' && (p?.kind !== 'allocation' || p.offset !== 0))) throw new Error('Actual current environment source allocation/free arguments required');
    const chain = NativeGameCrtSetEnvp.canonicalSourceFrameChainForCrt(binding.owner, binding.crt, controller); if (!chain.known) throw new Error(chain.reason);
    const callerSite = (site === '20477ce8' ? chain.value.at(-2) : chain.value.at(-1))?.site;
    if (!callerSite) throw new Error('Actual retained environment native caller required');
    const args: NativeSetEnvpArguments = Object.freeze({ site, callerSite, crt: binding.crt, heap: hp.heap, flags: flags as 0 | 8,
      bytes: site === '20477ce8' ? this.#numeric(words[2]!, 4) : undefined,
      backing: p?.kind === 'allocation' ? p.allocation.fields.backing as NativeMemoryBacking : undefined });
    const row = { site, callerSite, callPushed: false, called: false, returned: false, allocated: false, released: false }; this.#setEnvpRows.push(row);
    this.#call(site, site === '20477ce8' ? '20477cee' : '20467cd8'); row.callPushed = true;
    const top = this.#calls.at(-1)!, grant: NativeSetEnvpCallGrant = Object.freeze({ identity: Object.freeze({}) });
    const call: SetEnvpCall = { stack: this, controller, args, words, position: top.position, frame,
      fs: this.#load(this.#bank, 32), returnWord: top.returnWord,
      frames: Object.freeze(chain.value.map(entry => entry.entry + ':' + entry.site + ':' + entry.returnPc)), phase: 'pending' };
    setEnvpCalls.set(grant, call); this.#setEnvpGrant = grant; this.#setEnvpProof(grant, call); row.called = true;
    let result: NativeValue<NativeSetEnvpResult>;
    try { result = endpoints.invoke(grant); }
    finally { const effect = NativeRuntimePlatform.setEnvpEffectsForPlatform(this.#platform, grant);
      if (effect.known) { row.allocated = effect.value.allocated; row.released = effect.value.released; } }
    if (!result.known) throw new Error(result.reason);
    const normal = NativeRuntimePlatform.canonicalSetEnvpNormalReturnForPlatform(this.#platform, grant);
    if (!normal.known || normal.value !== result.value) throw new Error(normal.known ? 'Actual normal environment import result changed' : normal.reason);
    this.#setEnvpProof(grant, call);
    let word: NativeX86Word32;
    if (site === '20467cd2') {
      if (typeof result.value !== 'boolean') throw new Error('Actual HeapFree BOOL result required');
      word = this.#mint(result.value ? 1 : 0, 0xffffffff);
    } else if (result.value === null) word = this.#mint(0, 0xffffffff);
    else {
      if (typeof result.value !== 'object') throw new Error('Actual HeapAlloc backing result required');
      const allocation = this.#allocationFromBacking(result.value, args.heap);
      if (allocation.fields.bytes.length !== args.bytes || allocation.fields.bytes.some(byte => byte !== 0) ||
          allocation.fields.knownMask.some(mask => mask !== 255)) throw new Error('Actual requested zeroed calloc span required');
      this.#allocationLive(allocation, 0, args.bytes!); word = this.#allocationWord(allocation, 0);
    }
    this.#store(this.#bank, this.#reg('EAX'), word);
    for (const register of ['ECX', 'EDX'] as const) this.#store(this.#bank, this.#reg(register), this.#mint(0, 0));
    this.#flags(0, 0); this.#setEnvpProof(grant, call);
    this.#ret(12); call.phase = 'returned'; row.returned = true; this.#setEnvpGrant = null;
  }); }
  setEnvpReturnResult(controller: object): NativeValue<0 | -1> { return this.#run(controller, () => {
    const binding = this.#setEnvpBinding;
    if (!binding || this.#setEnvpReturned) throw new Error('Actual once-only environment callee return required');
    const proof = NativeGameCrtSetEnvp.canonicalSetEnvpReturnForCrt(binding.owner, binding.crt, controller); if (!proof.known) throw new Error(proof.reason);
    const call = this.#calls.find(entry => entry.site === '204678e7'), initial = this.#initial;
    if (!initial || !call?.returned || this.#currentPc !== call.returnWord || this.#record(call.returnWord).provenance?.kind !== 'source' ||
        (this.#record(call.returnWord).provenance as { address: string }).address !== '204678ec' || this.#calls.some(entry => !entry.returned) ||
        this.#setEnvpGrant || this.#argvGrant || this.#standardGrant || this.#heapGrant ||
        (this.#startupGrant && startupCalls.get(this.#startupGrant)?.phase !== 'returned') ||
        this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== this.#address(initial.esp) ||
        this.#load(this.#bank, this.#reg('EBP')) !== initial.ebp || this.#load(this.#bank, this.#reg('EBX')) !== initial.ebx ||
        this.#load(this.#bank, this.#reg('ESI')) !== initial.esi || this.#load(this.#bank, this.#reg('EDI')) !== initial.edi ||
        this.#load(this.#bank, 32) !== initial.fs) throw new Error('Actual environment return/current continuation/restored registers and FS required');
    const value = this.#numeric(this.#load(this.#bank, this.#reg('EAX')), 4);
    if (value !== 0 && value !== 0xffffffff) throw new Error('Actual environment result0/-1 required');
    this.#setEnvpReturned = true; return (value | 0) as 0 | -1;
  }); }
  invokeGetFileType(controller: object): NativeValue<void> { return this.#invokeStandard(controller, '204744c6'); }
  invokeTlsGetValue(controller: object, site: '20467de8' | '20467dff'): NativeValue<void> {
    if (site !== '20467de8' && site !== '20467dff') return unknown('Exact original TLS call site required');
    return this.#invokeStandard(controller, site);
  }
  invokeFlsGetValue(controller: object): NativeValue<void> { return this.#invokeStandard(controller, '20467e01'); }
  invokeDecodePointer(controller: object): NativeValue<void> { return this.#invokeStandard(controller, '20467e3d'); }
  invokeSectionInitializer(controller: object): NativeValue<void> { return this.#invokeStandard(controller, '20474246'); }
  invokeSetHandleCount(controller: object): NativeValue<void> { return this.#invokeStandard(controller, '2047451e'); }
  /** Retire frame execution only after the actual incoming CALL has returned
   * and restored its saved state. Copied snapshots cannot grant this result. */
  ioReturnResult(controller: object): NativeValue<number> {
    const result = this.#run(controller, () => {
      const binding = this.#binding!, permit = NativeGameCrtIoInit.canonicalIoReturnForCrt(binding.owner, binding.crt, controller);
      if (!permit.known) throw new Error(permit.reason);
      const original = this.#calls.find(call => call.site === '204678ce'), initial = this.#initial;
      if (!initial || !original || !original.returned || this.#currentPc !== original.returnWord ||
          this.#record(original.returnWord).provenance?.kind !== 'source' ||
          (this.#record(original.returnWord).provenance as { address: string }).address !== '204678d3' ||
          this.#calls.some(call => !call.returned) || this.#standardGrant !== null || this.#heapGrant !== null ||
          this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== this.#address(initial.esp) ||
          this.#load(this.#bank, this.#reg('EBP')) !== initial.ebp || this.#load(this.#bank, this.#reg('EBX')) !== initial.ebx ||
          this.#load(this.#bank, this.#reg('ESI')) !== initial.esi || this.#load(this.#bank, this.#reg('EDI')) !== initial.edi ||
          this.#load(this.#bank, 32) !== initial.fs) throw new Error('Actual original IO return/current continuation/restored frame and FS required');
      const value = this.#numeric(this.#load(this.#bank, this.#reg('EAX')), 4);
      if (value !== 0 && value !== 0xffffffff) throw new Error('Actual selected source IO return scalar required');
      return value | 0;
    });
    if (result.known) this.#phase = 'returned';
    return result;
  }
  readFs0(controller: object): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#load(this.#bank, 32)); }
  argvReturnResult(controller: object): NativeValue<number> { return this.#run(controller, () => {
    const binding=this.#argvBinding;if(!binding||this.#argvReturned)throw new Error('Actual once-only argv callee return required');
    const proof=NativeGameCrtArgv.canonicalArgvReturnForCrt(binding.owner,binding.crt,controller);if(!proof.known)throw new Error(proof.reason);
    const call=this.#calls.find(entry=>entry.site==='204678de'),initial=this.#initial;
    if(!initial||!call||!call.returned||this.#currentPc!==call.returnWord||this.#record(call.returnWord).provenance?.kind!=='source'||
      (this.#record(call.returnWord).provenance as {address:string}).address!=='204678e3'||this.#calls.some(entry=>!entry.returned)||this.#argvGrant||
      this.#address(this.#load(this.#bank,this.#reg('ESP')))!==this.#address(initial.esp)||
      this.#load(this.#bank,this.#reg('EBP'))!==initial.ebp||this.#load(this.#bank,this.#reg('EBX'))!==initial.ebx||
      this.#load(this.#bank,this.#reg('ESI'))!==initial.esi||this.#load(this.#bank,this.#reg('EDI'))!==initial.edi||this.#load(this.#bank,32)!==initial.fs) {
      throw new Error('Actual original argv return/restored frame and FS required');
    }
    const value=this.#numeric(this.#load(this.#bank,this.#reg('EAX')),4);if(value!==0&&value!==0xffffffff)throw new Error('Actual selected argv result0/-1 required');
    this.#argvReturned=true;return value|0;
  }); }
  writeFs0(controller: object, word: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => this.#store(this.#bank, 32, word)); }
  startupInfoView(controller: object, ebp: NativeX86Word32): NativeValue<NativeHeapObjectViews> { return this.#run(controller, () => {
    const offset = this.#address(ebp) - 0x64;
    if (offset < 0 || offset + 68 > this.#stack.bytes.length) throw new Error('Actual frame STARTUPINFOA alias outside stack reservation');
    const retained = this.#startupViews.get(offset); if (retained) return retained;
    const fields = new NativeHeapObjectViews(this.#stack.backing, offset, 68);
    Object.freeze(fields.view); Object.preventExtensions(fields.bytes); Object.preventExtensions(fields.knownMask); Object.freeze(fields);
    this.#startupViews.set(offset, fields); return fields;
  }); }
  suspendUnknown(controller: object, boundary: string): NativeValue<void> {
    try {
      this.#controllerProof(controller, 'retain'); this.#boundary ??= boundary;
      if (this.#phase !== 'retired') this.#phase = 'blocked'; return known(undefined);
    }
    catch (error) { return unknown(reason(error)); }
  }
  snapshot() {
    const describe = (word: NativeX86Word32): object => {
      const record = this.#words.get(word)!;
      const provenance = record.provenance;
      return Object.freeze({ value: record.value, knownMask: record.mask, provenance: provenance?.kind === 'source'
        ? Object.freeze({ kind: provenance.kind, type: provenance.type, address: provenance.address })
        : provenance?.kind === 'stack' ? Object.freeze({ kind: provenance.kind, offset: provenance.offset })
          : provenance?.kind === 'heap' ? Object.freeze({ kind: provenance.kind })
            : provenance?.kind === 'allocation' ? Object.freeze({ kind: provenance.kind, offset: provenance.offset,
              capacity: (provenance.allocation.physical ?? provenance.allocation.fields).bytes.length,
              ...(provenance.allocation.physical ? { requestedBytes: provenance.allocation.fields.bytes.length } : {}) })
              : provenance?.kind === 'shared-local' ? Object.freeze({kind:provenance.kind,offset:provenance.offset??0,capacity:provenance.fields.bytes.length})
              : provenance?.kind === 'platform' ? Object.freeze({ kind: provenance.kind, category: provenance.category })
          : provenance?.kind === 'xor' ? Object.freeze({ kind: provenance.kind, left: describe(provenance.left), right: describe(provenance.right) }) : null });
    };
    const cell = (offset: number) => {
      const slot = this.#slots.get(this.#bank)?.get(offset);
      return !slot || slot.bytes.some((byte, index) => byte !== this.#bank.bytes[offset + index]) ||
        slot.masks.some((mask, index) => mask !== this.#bank.knownMask[offset + index])
        ? Object.freeze({ changed: true }) : Object.freeze({ changed: false, word: describe(slot.word) });
    };
    const cells = Object.fromEntries(registers.map(name => [name, cell(this.#reg(name))]));
    const copy = (bytes: Uint8Array) => { try { return Object.freeze(Array.from(bytes)); } catch { return null; } };
    return Object.freeze({initializerSehFrames:Object.freeze([...this.#initializerSehFrames].map(([site,frame])=>Object.freeze({site,entered:frame.entered,returned:frame.returned}))),processorSimdFrame:this.#processorSimdFrame?Object.freeze({returned:this.#processorSimdFrame.returned}):null,sharedInitializerFrame:this.#sharedInitializerFrame?Object.freeze({entryEsp:this.#sharedInitializerFrame.entryEsp,operations:this.#sharedInitializerFrame.operations,ownershipReturned:this.#sharedInitializerFrame.ownershipReturned,conversionInstalled:this.#sharedInitializerFrame.conversionInstalled,fsRestored:this.#sharedInitializerFrame.fsRestored,moduleCalls:this.#sharedInitializerFrame.moduleCalls,procedureCalls:this.#sharedInitializerFrame.procedureCalls,featureCalls:this.#sharedInitializerFrame.featureCalls,divisionQueryResult:this.#sharedInitializerFrame.divisionQueryResult,initializerResult:this.#sharedInitializerFrame.initializerResult}):null,sharedEnvironmentFrame:this.#sharedEnvironmentFrame?Object.freeze({entryEsp:this.#sharedEnvironmentFrame.entryEsp,operations:this.#sharedEnvironmentFrame.operations,returned:this.#sharedEnvironmentFrame.returned,result:this.#sharedEnvironmentFrame.result,strlenCalls:this.#sharedEnvironmentFrame.strlenCalls,callocCalls:this.#sharedEnvironmentFrame.callocCalls,freeCalls:this.#sharedEnvironmentFrame.freeCalls,initializersPending:this.#sharedEnvironmentFrame.initializersPending}):null,sharedArgvFrame:this.#sharedArgvFrame?Object.freeze({ebp:this.#sharedArgvFrame.ebp,multibytePending:this.#sharedArgvFrame.multibytePending,moduleReturned:this.#sharedArgvFrame.moduleReturned,argumentCount:this.#sharedArgvFrame.argumentCount,byteCount:this.#sharedArgvFrame.byteCount,parsePending:this.#sharedArgvFrame.parsePending,parserStarted:this.#sharedArgvFrame.parserStarted??false,parserReturned:this.#sharedArgvFrame.parserReturned??false,parserOperations:this.#sharedArgvFrame.parserOperations??0,leadCalls:this.#sharedArgvFrame.leadCalls??0,queryCounts:this.#sharedArgvFrame.queryCounts??null,fillCounts:this.#sharedArgvFrame.fillCounts??null,allocationReturned:this.#sharedArgvFrame.allocationReturned??false,fillPending:this.#sharedArgvFrame.fillPending??false,fillReturned:this.#sharedArgvFrame.fillReturned??false,fillOperations:this.#sharedArgvFrame.fillOperations??0,fillLeadCalls:this.#sharedArgvFrame.fillLeadCalls??0,returned:this.#sharedArgvFrame.returned??false,result:this.#sharedArgvFrame.result??null,environmentPending:this.#sharedArgvFrame.environmentPending??false}):null,setMultibyteFrame:this.#setMultibyteFrame?Object.freeze({ebp:this.#setMultibyteFrame.ebp,pendingInstallation:this.#setMultibyteFrame.pendingInstallation,returned:this.#setMultibyteFrame.returned,global:this.#setMultibyteFrame.global,counterCursor:this.#setMultibyteFrame.counterCursor,scope:describe(this.#load(this.#stack,this.#setMultibyteFrame.ebp-8)),cookie:describe(this.#load(this.#stack,this.#setMultibyteFrame.ebp-52)),scopeAtReturn:this.#setMultibyteFrame.scopeAtReturn?describe(this.#setMultibyteFrame.scopeAtReturn):null,cookieAtReturn:this.#setMultibyteFrame.cookieAtReturn?describe(this.#setMultibyteFrame.cookieAtReturn):null,oldFs:describe(this.#setMultibyteFrame.oldFs)}):null,configurationFrame:this.#configurationFrame?Object.freeze({ebp:this.#configurationFrame.ebp,info:this.#configurationFrame.info,codePage:this.#configurationFrame.codePage,returned:this.#configurationFrame.returned}):null,caseFrame:this.#caseFrame?Object.freeze({ebp:this.#caseFrame.ebp,originalEbp:this.#caseFrame.originalEbp,info:this.#caseFrame.info,input:this.#caseFrame.input,types:this.#caseFrame.types,lower:this.#caseFrame.lower,upper:this.#caseFrame.upper,deferredBytes:this.#caseFrame.deferredBytes,tableIndex:this.#caseFrame.tableIndex,returned:this.#caseFrame.returned}):null,mappingFrames:Object.freeze(this.#mappingFrames.map(frame=>Object.freeze({ebp:frame.ebp,input:frame.input,output:frame.output,returned:frame.returned,allocations:Object.freeze(frame.allocations.map(row=>Object.freeze({...row})))}))),...(this.#sharedFrame?{sharedFrame:Object.freeze({ebp:this.#sharedFrame.ebp,requestedBytes:this.#sharedFrame.requestedBytes,allocatedBytes:this.#sharedFrame.allocatedBytes,probedPages:Object.freeze([...this.#sharedFrame.probedPages]),temporary:this.#sharedFrame.temporary})}:{}), phase: this.#phase, boundary: this.#boundary, thread: this.#selection.threadCapability,
      stack: Object.freeze({ bytes: copy(this.#stack.bytes), knownMask: copy(this.#stack.knownMask), freed: this.#stack.backing.freed }),
      registers: Object.freeze(cells), fs0: cell(32), arithmeticFlags: cell(36), x87Status: cell(40), eflags: cell(44), xmm: Object.freeze({bytes:Object.freeze(Array.from(this.#xmm.bytes)),knownMask:Object.freeze(Array.from(this.#xmm.knownMask))}), currentPc: this.#currentPc ? describe(this.#currentPc) : null,
      calls: Object.freeze(this.#calls.map(call => Object.freeze({ site: call.site, returnWord: describe(call.returnWord), position: call.position, returned: call.returned }))), trace: Object.freeze(this.#trace.slice()),
      startupInfoCallPushed: this.#startupInfoCallPushed, startupInfoWriterCalled: this.#startupInfoWriterCalled,
      startupInfoWriterReturned: this.#startupInfoWriterReturned,
      heapAllocCallPushed: this.#heapAllocCallPushed, heapAllocCalled: this.#heapAllocCalled,
      heapAllocReturned: this.#heapAllocReturned, heapAllocBlockAllocated: this.#heapAllocBlockAllocated,
      standardIoCalls: Object.freeze(this.#standardIoRows.map(row => Object.freeze({ ...row }))),
      argvCalls: Object.freeze(this.#argvRows.map(row => Object.freeze({ ...row }))),
      returnedIoTransferred: this.#transferred, argvReturned: this.#argvReturned,
      setEnvpTransferred: this.#setEnvpTransferred, setEnvpReturned: this.#setEnvpReturned,
      setEnvpCalls: Object.freeze(this.#setEnvpRows.map(row => Object.freeze({ ...row }))),
      numericalRuntimeAddressesProvided: false, nativeSehDispatchExecuted: false });
  }
}

/** Runtime's private terminal transition is required; this cannot retire a
 * live selected thread or replace its retained controller. No bytes reset. */
export function retireNativeX86ThreadStackForPlatform(platform: NativeRuntimePlatform,
  selection: Readonly<NativeX86ThreadStackSelection>): void {
  if (!NativeRuntimePlatform.threadStackLifetimeHasEnded(platform, selection)) return;
  const graph = graphs.get(platform); if (graph) retirements.get(graph)!();
}
