/** Retained virtual x86 stack/register/FS state. Numerical addresses stay
 * unknown; private relative-address and expression capabilities own relations. */
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
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
  Readonly<{ kind: 'module'; label: string; fields: NativeHeapObjectViews; offset: number }> |
  Readonly<{ kind: 'process'; pointer: NativeBytePointer }> |
  Readonly<{ kind: 'heap'; heap: NativeWin32HeapCapability }> |
  Readonly<{ kind: 'allocation'; allocation: Allocation; offset: number; pointer: NativeBytePointer }> |
  Readonly<{ kind: 'platform'; object: object; category: NativeStandardIoCapabilityKind | NativeArgvImportKind }> |
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
  // Only arithmetic flags are owned here. The separately retained Runtime DF
  // remains its declared logical-thread state; no full numerical EFLAGS seed.
  readonly #bank = physical(40);
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
  #phase: 'cold' | 'running' | 'returned' | 'blocked' | 'retired' = 'cold';
  #boundary: string | null = null;
  #executing = false;
  #currentPc: NativeX86Word32 | null = null;
  readonly #trace: string[] = [];
  private constructor(platform: NativeRuntimePlatform, selection: Readonly<NativeX86ThreadStackSelection>, admitted: object) {
    if (admitted !== constructionToken || new.target !== NativeX86ThreadStack) throw new Error('Private actual x86 thread-stack construction required');
    this.#platform = platform; this.#selection = selection; this.#stack = physical(selection.reservationBytes);
    for (const fields of [this.#stack, this.#bank]) this.#storage.set(fields, Object.freeze({
      backing: fields.backing as NativeMemoryBacking, identity: fields.backing.identity,
      rootBytes: fields.backing.bytes, rootMasks: fields.backing.knownMask, bytes: fields.bytes,
      masks: fields.knownMask, view: fields.view, length: fields.bytes.length,
    }));
    for (const name of registers) this.#store(this.#bank, registers.indexOf(name) * 4,
      name === 'ESP' ? this.#stackWord(selection.reservationBytes) : this.#mint(0, 0));
    this.#store(this.#bank, 32, this.#mint(0, 0));
    this.#store(this.#bank, 36, this.#mint(0, 0));
    retirements.set(this, () => {
      this.#phase = 'retired'; this.#boundary ??= 'Actual logical-thread stack lifetime ended';
      this.#stack.backing.freed = true; this.#bank.backing.freed = true;
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
    if (p?.kind === 'platform') {
      const legacy = NativeRuntimePlatform.standardIoCapabilityForPlatform(this.#platform, p.object);
      const kind = legacy.known ? legacy : NativeRuntimePlatform.argvCapabilityForPlatform(this.#platform, p.object);
      if (!kind.known || kind.value !== p.category) throw new Error(kind.known ? 'Retained Runtime capability category changed' : kind.reason);
    }
    return record;
  }
  #flags(value: number, mask: number): void { this.#store(this.#bank, 36, this.#mint(value & 0x8d5, mask & 0x8d5)); }
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
    if (width === 4 && (p?.kind === 'platform' || p?.kind === 'allocation' || p?.kind === 'module' || p?.kind === 'process')) {
      this.#invalidateRange(memory.fields, memory.offset, 4); this.#store(memory.fields, memory.offset, word);
      NativeHeapObjectViews.prototype.pointer.call(memory.fields, memory.offset).set(p.kind === 'platform' ? p.object : p.kind === 'module' ? this.#modulePointer(p) : p.pointer); return;
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
    return Object.freeze({ phase: this.#phase, boundary: this.#boundary, thread: this.#selection.threadCapability,
      stack: Object.freeze({ bytes: copy(this.#stack.bytes), knownMask: copy(this.#stack.knownMask), freed: this.#stack.backing.freed }),
      registers: Object.freeze(cells), fs0: cell(32), arithmeticFlags: cell(36), currentPc: this.#currentPc ? describe(this.#currentPc) : null,
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
