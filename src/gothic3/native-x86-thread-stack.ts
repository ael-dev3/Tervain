import {NativeCrtThreadStartup} from './native-crt-thread-startup';
import {NativeEngineArgvImages} from './native-engine-argv-images';
import {engineArgvInstruction,engineArgvGetACPImport,engineArgvMbcImport} from './native-engine-argv-source';
import {NativePropertyTypeTable} from './native-property-type-table';
import {createNativeEngineModuleOwner} from './native-engine-module-owner';
import {createBrowserEngineCrtStartup} from './browser-engine-crt-startup';
import {NativeCrtBootstrap} from './native-crt-bootstrap';
import {NativeEngineIoImages} from './native-engine-io-images';
import {engineIoInstruction} from './native-engine-io-source';
import {NativeGameAIHelperAdminClassName} from './native-game-ai-helper-admin-class-name';
import scriptAdminSource from '../../assets/gothic3/script-admin-startup/runtime-rules.json';
import {constructNativePropertyIdFromGuid} from './native-property-id-guid';
import {NativeSharedGuidNull} from './native-shared-guid-null';
import {NativeGuidText} from './native-guid-text';
import {NativeHeapCString} from './native-heap-cstring';
import {NativeGameAIHelperAdminType} from './native-game-ai-helper-admin-type';
import {NativeGameLabelType} from './native-game-label-type';
import {gameStrlenDwordCandidate} from './native-game-strlen-predicate';
import {nativeMaskedBitfieldAssignment} from './native-masked-bitfield';
/** Retained virtual x86 stack/register/FS state. Numerical addresses stay
 * unknown; private relative-address and expression capabilities own relations. */
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import type { NativeMemoryAllocation } from './native-memory-admin';
import { NativeMemoryAdmin } from './native-memory-admin';
import { NativeSharedCrtOwner } from './native-shared-crt';
import { sharedCommandLineInstruction } from './native-shared-command-line-instructions';
import {sharedDllEntryInstruction} from './native-shared-dll-entry-instructions';
import { sharedInitializerInstruction } from './native-shared-initializer-instructions';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { NativeGameExitTable } from './native-game-crt-exit-table';
import { NativeGameArenaType } from './native-game-arena-type';
import { NativeGameFreePointType } from './native-game-freepoint-type';
import { NativeGameArenaStatusProperty } from './native-game-arena-status-property';
import {NativeGameArenaEnum} from './native-game-arena-enum';
import { NativePropertySingleton } from './native-property-singleton';
import { NativeSharedModuleImage } from './native-shared-module-image';
import { admitArenaPropertySingletonImport } from './native-game-arena-root-source';
import { nativeGameLayerBaseMemoryForCrt } from './native-game-layer-base-class-name';
import { getGameClassName } from './native-game-class-name-family';
import { gameClassNameSpec } from './native-game-class-name-family-source';
import type { NativeGameCrtOwner } from './native-game-crt';
import { nativeGameImageReceipt } from './native-game-crt-profile';
import { gameCinitInstruction } from './native-game-crt-cinit-source';
import type { NativeWin32ModuleCapability, NativeCrtProcessorFeatureProcedure } from './native-runtime-platform';
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
  Readonly<{ kind: 'arena-memory-admin'; owner:NativeMemoryAdmin }> |
  Readonly<{ kind: 'stack'; offset: number }> |
  Readonly<{ kind: 'shared-local'; fields:NativeHeapObjectViews; offset?:number }> |
  Readonly<{ kind: 'module'; label: string; fields: NativeHeapObjectViews; offset: number }> |
  Readonly<{ kind: 'process'; pointer: NativeBytePointer }> |
  Readonly<{kind:'engine-locale';crt:NativeModuleCrtOwner;fields:NativeHeapObjectViews}> |
  Readonly<{kind:'engine-mbc';crt:NativeModuleCrtOwner;fields:NativeHeapObjectViews;offset?:number}> |
  Readonly<{kind:'engine-ptd';crt:NativeModuleCrtOwner;fields:NativeHeapObjectViews}> |
  Readonly<{kind:'engine-allocation';crt:NativeModuleCrtOwner;fields:NativeHeapObjectViews;offset:number}> |
  Readonly<{ kind: 'heap'; heap: NativeWin32HeapCapability }> |
  Readonly<{ kind: 'allocation'; allocation: Allocation; offset: number; pointer: NativeBytePointer }> |
  Readonly<{ kind: 'platform'; object: object; category: NativeStandardIoCapabilityKind | NativeArgvImportKind | 'GetModuleHandleA' | 'GetProcAddress' | 'IsProcessorFeaturePresent' | 'InitializerTlsGetValue' | 'InitializerPtdGetter' | 'InitializerEncodePointer' | 'InitializerDecodePointer' | 'InitializerPoolHeapAlloc' | 'InitializerCrtHeapFree' | 'InitializerPoolVirtualAlloc' | 'InitializerHeapSize' | 'InitializerInitializeSection' | 'InitializerMemorySectionInitialize' | 'InitializerMemorySectionEnter' | 'InitializerMemorySectionLeave' | 'InitializerSectionCache' | 'InitializerCreateFileA' | 'InitializerGetLastError' | 'InitializerSetLastError' | 'InitializerGetFileType' | 'InitializerCloseHandle' | 'InitializerFileHandle' | 'InitializerEncodedCode' | 'DllLstrcpyA' | 'DllVersionModule' | 'SpyFindWindowA' | 'DiagnosticWindow' | 'GameCinitModule' | 'GameCinitFeature' | 'GameCinitEncoded' }> |
  Readonly<{ kind: 'source'; type: 'code' | 'image'; address: string; fields?: NativeHeapObjectViews }> |
  Readonly<{ kind: 'xor'; left: NativeX86Word32; right: NativeX86Word32 }> |
  Readonly<{ kind: 'neg'; word: NativeX86Word32 }> |
  Readonly<{ kind: 'difference'; left:NativeX86Word32;right:NativeX86Word32 }> }>;
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
interface EngineArgvFrame {readonly bootstrap:NativeCrtBootstrap;readonly crt:NativeModuleCrtOwner;readonly permit:object;readonly images:NativeEngineArgvImages;readonly entryEsp:number;phase:'running'|'blocked';pc:string;boundary:string|null;operations:number;ebp:number|null;multibyteEbp:number|null;multibyteFsPublished:boolean;multibytePrologReturned:boolean;multibytePtd:NativeHeapObjectViews|null;multibyteGetterReturned:boolean;localeEbp:number|null;localePtd:NativeHeapObjectViews|null;localeMbc:NativeHeapObjectViews|null;localePrologReturned:boolean;localeGetterReturned:boolean;localeFsRestored:boolean;localeLockHeld:boolean;localeReturned:boolean;codepageEbp:number|null;codepageLocaleRecord:NativeHeapObjectViews|null;codepagePtd:NativeHeapObjectViews|null;codepageLocale:NativeHeapObjectViews|null;codepageCtorReturned:boolean;codepageAcpReturned:boolean;codepageReturned:boolean;codepageResult:number|null;multibyteAllocation:NativeHeapObjectViews|null;multibyteMallocReturned:boolean;multibyteCopyReturned:boolean;mbcInitEbp:number|null;mbcInitCodepageReturned:boolean;mbcValidCodepageReturned:boolean;mbcInfo:NativeHeapObjectViews|null;mbcInfoReturned:boolean;mbcMemsetReturned:boolean;mbcSingleByteInitialized:boolean;}
interface EngineIoFrame {
 readonly bootstrap:NativeCrtBootstrap;readonly crt:NativeModuleCrtOwner;readonly permit:object;
 readonly images:NativeEngineIoImages;readonly scope:NativeHeapObjectViews;
 phase:'running'|'blocked'|'returned';pc:string;boundary:string|null;operations:number;
 entryEsp:number;ebp:number|null;prologReturned:boolean;fsPublished:boolean;
 startupInfo:NativeHeapObjectViews|null;allocation:NativeHeapObjectViews|null;callocReturned:boolean;fileType:number|null;section:NativeHeapObjectViews|null;sectionResult:boolean|null;setHandleCountResult:number|null;fsRestored:boolean;
}
interface HeapCall {
  readonly stack: NativeX86ThreadStack; readonly controller: object; readonly crt: NativeModuleCrtOwner;
  readonly heap: NativeWin32HeapCapability; readonly heapWord: NativeX86Word32;
  readonly flagsWord: NativeX86Word32; readonly bytesWord: NativeX86Word32;
  readonly bytes: number; readonly position: number; readonly frame: number; readonly returnWord: NativeX86Word32;
  phase: 'pending' | 'returned';
}
export interface NativeStandardIoArguments {
  readonly site: NativeStandardIoCallSite | '306888a1' | '306888b3' | '3068890b'; readonly kind: NativeStandardIoCallKind; readonly crt: NativeModuleCrtOwner;
  readonly scalar?: number; readonly object?: object | null; readonly procedure?: object;
  readonly section?: NativeBytePointer; readonly sectionFields?: NativeHeapObjectViews;
}
interface StandardCall {
  readonly stack: NativeX86ThreadStack; readonly controller: object; readonly args: NativeStandardIoArguments & {readonly site:NativeStandardIoCallSite};
  readonly position: number; readonly frame: number; readonly fs: NativeX86Word32;
  readonly argumentWords: readonly NativeX86Word32[]; readonly returnWord: NativeX86Word32;
  readonly argumentBytes: 4 | 8; phase: 'pending' | 'returned';
}
const engineStandardCalls=new WeakMap<NativeStandardIoCallGrant,{stack:NativeX86ThreadStack;frame:EngineIoFrame;args:NativeStandardIoArguments;position:number;argument:NativeX86Word32;returnWord:NativeX86Word32;phase:'pending'|'returned'}>();
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
const engineStartupCalls=new WeakMap<NativeStartupInfoCallGrant,{stack:NativeX86ThreadStack;frame:EngineIoFrame;offset:number;argument:NativeX86Word32;position:number;returnWord:NativeX86Word32;phase:'pending'|'returned'}>();
const engineArgvNlsCalls=new WeakMap<NativeArgvNlsCallGrant,{stack:NativeX86ThreadStack;frame:EngineArgvFrame;kind:'GetACP'|'IsValidCodePage'|'GetCPInfo';position:number;returnWord:NativeX86Word32;phase:'pending'|'returned'}>();
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
  #engineArgvFrame:EngineArgvFrame|null=null;
  #engineArgvExecuting=false;
  static enterEngineArgvForBootstrap(stack:NativeX86ThreadStack,bootstrap:NativeCrtBootstrap,crt:NativeModuleCrtOwner,permit:object):NativeValue<void>{
    const reached=NativeCrtBootstrap.canonicalEngineArgvCallForCrt(bootstrap,crt,permit);if(!reached.known)return reached;
    try{
      const io=stack.#engineIoFrame,images=bootstrap.attachProgress().engineArgvImages;
      if(graphs.get(crt.host.platform as NativeRuntimePlatform)!==stack||stack.#engineArgvExecuting||stack.#engineArgvFrame||!io||io.crt!==crt||io.bootstrap!==bootstrap||io.phase!=='returned'||!images||stack.#engineIoExecuting)throw new Error('Actual unreplayed Engine argument frame after returned I/O required');
      if(stack.#phase==='running'){
        const binding=stack.#setEnvpBinding;if(!stack.#executing||!binding||stack.#calls.filter(call=>!call.returned).at(-1)?.site!=='200766c2')throw new Error('Actual pending Game module-administrator parent required');
        const parent=NativeGameCrtSetEnvp.canonicalAIHelperModuleAdminCallForCrt(binding.owner,binding.crt,binding.controller);if(!parent.known)throw new Error(parent.reason);
      }else if(stack.#phase!=='returned'||stack.#executing||stack.#binding)throw new Error('Actual returned Engine thread required');
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);
      const entryEsp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));
      if(entryEsp!==io.entryEsp||stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4)!==0)throw new Error('Actual Engine I/O return state required');
      const frame:EngineArgvFrame={bootstrap,crt,permit,images,entryEsp,phase:'running',pc:'30677276',boundary:null,operations:0,ebp:null,multibyteEbp:null,multibyteFsPublished:false,multibytePrologReturned:false,multibytePtd:null,multibyteGetterReturned:false,localeEbp:null,localePtd:null,localeMbc:null,localePrologReturned:false,localeGetterReturned:false,localeFsRestored:false,localeLockHeld:false,localeReturned:false,codepageEbp:null,codepageLocaleRecord:null,codepagePtd:null,codepageLocale:null,codepageCtorReturned:false,codepageAcpReturned:false,codepageReturned:false,codepageResult:null,multibyteAllocation:null,multibyteMallocReturned:false,multibyteCopyReturned:false,mbcInitEbp:null,mbcInitCodepageReturned:false,mbcValidCodepageReturned:false,mbcInfo:null,mbcInfoReturned:false,mbcMemsetReturned:false,mbcSingleByteInitialized:false};stack.#engineArgvFrame=frame;stack.#engineArgvExecuting=true;stack.#phase='running';
      const reg=(name:NativeX86Register)=>stack.#load(stack.#bank,stack.#reg(name)),set=(name:NativeX86Register,word:NativeX86Word32)=>stack.#store(stack.#bank,stack.#reg(name),word);
      const step=(pc:string,body:()=>void,entry='3068e76f')=>{stack.#engineArgvProof(frame);if(entry==='3067e500')engineIoInstruction(entry,pc);else engineArgvInstruction(entry,pc);frame.pc=pc;body();frame.operations++;stack.#trace.push(pc+'.EngineArgvSource');stack.#engineArgvProof(frame);};
      try{
        stack.#engineArgvProof(frame);stack.#call('30677276','3067727b');
        step('3068e76f',()=>stack.#push(reg('EBP')));
        step('3068e770',()=>{set('EBP',reg('ESP'));frame.ebp=stack.#address(reg('EBP'));});
        step('3068e772',()=>{set('ESP',stack.#stackWord(stack.#address(reg('ESP'))-12));stack.#flags(0,0);});
        step('3068e775',()=>stack.#push(reg('EBX')));
        step('3068e776',()=>{set('EBX',stack.#mint(0,0xffffffff));stack.#logicalFlags(0,0xffffffff,4);});
        let ready=0;
        step('3068e778',()=>{const image=NativeEngineArgvImages.imageForCrt(images,crt,'multibyteReady');if(!image.known)throw new Error(image.reason);ready=NativeHeapObjectViews.prototype.readUnsigned.call(image.value,0);stack.#arithmeticFlags(ready,0,ready,4,true);});
        step('3068e77e',()=>stack.#push(reg('ESI')));
        step('3068e77f',()=>stack.#push(reg('EDI')));
        let initialize=false;step('3068e780',()=>{const flags=stack.#record(stack.#load(stack.#bank,36));if(!(flags.mask&0x40))throw new Error('Actual Engine argument comparison ZF required');initialize=!!(flags.value&0x40);});
        if(initialize){
          step('3068e782',()=>stack.#call('3068e782','3068e787'));
          const wrapper=(pc:string,body:()=>void)=>step(pc,body,'30685007');
          wrapper('30685007',()=>{const image=NativeEngineArgvImages.imageForCrt(images,crt,'multibyteReady');if(!image.known)throw new Error(image.reason);const current=NativeHeapObjectViews.prototype.readUnsigned.call(image.value,0);stack.#arithmeticFlags(current,0,current,4,true);});
          let skip=false;wrapper('3068500e',()=>{const flags=stack.#record(stack.#load(stack.#bank,36));if(!(flags.mask&0x40))throw new Error('Actual Engine multibyte wrapper ZF required');skip=!(flags.value&0x40);});
          if(!skip){
            wrapper('30685010',()=>stack.#push(stack.#mint(0xfffffffd,0xffffffff)));
            wrapper('30685012',()=>stack.#call('30685012','30685017'));
            const nested=(pc:string,body:()=>void)=>step(pc,body,'30684e6d');
            const relative=(name:'ESP'|'EBP',offset:number)=>stack.#address(reg(name))+offset;
            const value=(number:number)=>stack.#mint(number>>>0,0xffffffff);
            const xor=(left:NativeX86Word32,right:NativeX86Word32)=>{const a=stack.#record(left),b=stack.#record(right);stack.#logicalFlags(a.value^b.value,a.mask&b.mask,4);return stack.#mint(a.value^b.value,a.mask&b.mask,{kind:'xor',left,right});};
            const scope=NativeEngineArgvImages.imageForCrt(images,crt,'multibyteSetupSehScope');if(!scope.known)throw new Error(scope.reason);
            nested('30684e6d',()=>stack.#push(value(0x14)));
            nested('30684e6f',()=>stack.#push(stack.#mint(0,0,{kind:'source',type:'image',address:'30956ba0',fields:scope.value})));
            nested('30684e74',()=>stack.#call('30684e74','30684e79'));
            const runProlog=(returned:string,record:{ebp:(value:number)=>void;fs:()=>void;returned:()=>void})=>{
            const prolog=(pc:string,body:()=>void)=>step(pc,body,'3067e500');
            prolog('3067e500',()=>stack.#push(stack.#source('code','3067e590')));
            prolog('3067e505',()=>stack.#push(stack.#load(stack.#bank,32)));
            prolog('3067e50c',()=>set('EAX',stack.#load(stack.#stack,relative('ESP',0x10))));
            prolog('3067e510',()=>stack.#store(stack.#stack,relative('ESP',0x10),reg('EBP')));
            prolog('3067e514',()=>{const ebp=relative('ESP',0x10);record.ebp(ebp);set('EBP',stack.#stackWord(ebp));});
            prolog('3067e518',()=>{const bytes=stack.#numeric(reg('EAX'),4);set('ESP',stack.#stackWord(relative('ESP',-bytes)));stack.#flags(0,0);});
            prolog('3067e51a',()=>stack.#push(reg('EBX')));
            prolog('3067e51b',()=>stack.#push(reg('ESI')));
            prolog('3067e51c',()=>stack.#push(reg('EDI')));
            prolog('3067e51d',()=>{const cookie=NativeCrtBootstrap.engineArgvCookieForCrt(bootstrap,crt,permit);if(!cookie.known)throw new Error(cookie.reason);set('EAX',value(NativeHeapObjectViews.prototype.readUnsigned.call(cookie.value,0)));});
            prolog('3067e522',()=>{const at=relative('EBP',-4);stack.#store(stack.#stack,at,xor(stack.#load(stack.#stack,at),reg('EAX')));});
            prolog('3067e525',()=>set('EAX',xor(reg('EAX'),reg('EBP'))));
            prolog('3067e527',()=>stack.#push(reg('EAX')));
            prolog('3067e528',()=>stack.#store(stack.#stack,relative('EBP',-0x18),reg('ESP')));
            prolog('3067e52b',()=>stack.#push(stack.#load(stack.#stack,relative('EBP',-8))));
            prolog('3067e52e',()=>set('EAX',stack.#load(stack.#stack,relative('EBP',-4))));
            prolog('3067e531',()=>stack.#store(stack.#stack,relative('EBP',-4),value(0xfffffffe)));
            prolog('3067e538',()=>stack.#store(stack.#stack,relative('EBP',-8),reg('EAX')));
            prolog('3067e53b',()=>set('EAX',stack.#stackWord(relative('EBP',-0x10))));
            prolog('3067e53e',()=>{stack.#store(stack.#bank,32,reg('EAX'));record.fs();});
            prolog('3067e544',()=>{const result=stack.#record(stack.#ret()).provenance;if(result?.kind!=='source'||result.type!=='code'||result.address!==returned)throw new Error('Actual Engine EH4 prolog return required');record.returned();});
            };
            runProlog('30684e79',{ebp:value=>{frame.multibyteEbp=value;},fs:()=>{frame.multibyteFsPublished=true;},returned:()=>{frame.multibytePrologReturned=true;}});
            nested('30684e79',()=>{stack.#store(stack.#stack,relative('EBP',-0x20),value(0xffffffff));stack.#logicalFlags(0xffffffff,0xffffffff,4);});
            nested('30684e7d',()=>stack.#call('30684e7d','30684e82'));
            const runGetter=(expectedReturn:string,record:{ptd:(value:NativeHeapObjectViews|null)=>void;returned:()=>void})=>{
            const getter=(pc:string,body:()=>void)=>step(pc,body,'3067e12b');
            getter('3067e12b',()=>stack.#push(reg('ESI')));
            getter('3067e12c',()=>{
              stack.#call('3067e12c','3067e131');
              const result=NativeCrtBootstrap.engineArgvPtdForCrt(bootstrap,crt,permit);if(!result.known)throw new Error(result.reason);
              record.ptd(result.value);
              const returned=stack.#record(stack.#ret()).provenance;if(returned?.kind!=='source'||returned.type!=='code'||returned.address!=='3067e131')throw new Error('Actual Engine PTD getter service return required');
              set('EAX',result.value?stack.#mint(0,0,{kind:'engine-ptd',crt,fields:result.value}):value(0));
              set('ECX',stack.#mint(0,0));set('EDX',stack.#mint(0,0));stack.#flags(0,0);
            });
            getter('3067e131',()=>set('ESI',reg('EAX')));
            getter('3067e133',()=>{const word=stack.#liveWord(reg('ESI'));if(word.provenance?.kind==='engine-ptd')stack.#flags(0,0x841);else stack.#logicalFlags(stack.#numeric(reg('ESI'),4),0xffffffff,4);});
            let present=false;getter('3067e135',()=>{const flags=stack.#record(stack.#load(stack.#bank,36));if(!(flags.mask&0x40))throw new Error('Actual Engine PTD getter TEST ZF required');present=!(flags.value&0x40);});
            if(!present){
              getter('3067e137',()=>stack.#push(value(0x10)));
              getter('3067e139',()=>stack.#call('3067e139','3067e13e'));
              frame.pc='3067cf89';throw new Error('Engine NULL PTD fatal error3067cf89 at3067e139');
            }
            getter('3067e13f',()=>set('EAX',reg('ESI')));
            getter('3067e141',()=>{const at=relative('ESP',0);set('ESI',stack.#load(stack.#stack,at));set('ESP',stack.#stackWord(at+4));});
            getter('3067e142',()=>{const returned=stack.#record(stack.#ret()).provenance;if(returned?.kind!=='source'||returned.type!=='code'||returned.address!==expectedReturn)throw new Error('Actual Engine PTD getter wrapper return required');record.returned();});
            };
            runGetter('30684e82',{ptd:value=>{frame.multibytePtd=value;},returned:()=>{frame.multibyteGetterReturned=true;}});
            nested('30684e82',()=>set('EDI',reg('EAX')));
            nested('30684e84',()=>stack.#store(stack.#stack,relative('EBP',-0x24),reg('EDI')));
            nested('30684e87',()=>stack.#call('30684e87','30684e8c'));
            const locale=(pc:string,body:()=>void)=>step(pc,body,'30684b3a');
            const ptd=(word:NativeX86Word32)=>{const p=stack.#liveWord(word).provenance;if(p?.kind!=='engine-ptd'||p.crt!==crt)throw new Error('Actual Engine locale PTD pointer required');return p.fields;};
            const mbcWord=(pointer:object|null)=>{if(pointer===null)return value(0);const owned=NativeCrtBootstrap.engineArgvMbcForCrt(bootstrap,crt,permit);if(!owned.known)throw new Error(owned.reason);if(pointer!==owned.value)throw new Error('Engine dynamic MBC object remains unsupported');frame.localeMbc=owned.value;return stack.#mint(0,0,{kind:'engine-mbc',crt,fields:owned.value});};
            const currentMbc=()=>{const image=NativeEngineArgvImages.imageForCrt(images,crt,'currentMultibytePointer');if(!image.known)throw new Error(image.reason);const address=NativeHeapObjectViews.prototype.readUnsigned.call(image.value,0);if(address===0)return value(0);if(address!==0x30ad4bd0)throw new Error('Engine changed current MBC image pointer remains unsupported');const owned=NativeCrtBootstrap.engineArgvMbcForCrt(bootstrap,crt,permit);if(!owned.known)throw new Error(owned.reason);return mbcWord(owned.value);};
            const mbcPointer=(word:NativeX86Word32)=>{const p=stack.#liveWord(word).provenance;if(p?.kind==='engine-mbc'&&p.crt===crt&&!(p.offset??0))return p.fields;if(stack.#numeric(word,4)===0)return null;throw new Error('Actual Engine MBC pointer or NULL required');};
            const branchZero=()=>{const flags=stack.#record(stack.#load(stack.#bank,36));if(!(flags.mask&0x40))throw new Error('Actual Engine locale comparison ZF required');return !!(flags.value&0x40);};
            const pop=(name:NativeX86Register)=>{const position=relative('ESP',0);set(name,stack.#load(stack.#stack,position));set('ESP',stack.#stackWord(position+4));};
            const lock=(operation:'lock'|'unlock',site:string,returned:string)=>{if(stack.#numeric(stack.#load(stack.#stack,relative('ESP',0)),4)!==13)throw new Error('Actual source Engine MBC lock 13 argument required');stack.#call(site,returned);const result=NativeCrtBootstrap.engineArgvLocaleLockForCrt(bootstrap,crt,permit,operation);if(!result.known)throw new Error(result.reason);frame.localeLockHeld=operation==='lock';const next=stack.#record(stack.#ret()).provenance;if(next?.kind!=='source'||next.type!=='code'||next.address!==returned)throw new Error('Actual Engine locale lock service return required');set('EAX',stack.#mint(0,0));set('ECX',stack.#mint(0,0));set('EDX',stack.#mint(0,0));stack.#flags(0,0);};
            locale('30684b3a',()=>stack.#push(value(12)));
            const localeScope=NativeEngineArgvImages.imageForCrt(images,crt,'multibyteLocaleSehScope');if(!localeScope.known)throw new Error(localeScope.reason);
            locale('30684b3c',()=>stack.#push(stack.#mint(0,0,{kind:'source',type:'image',address:'30956b80',fields:localeScope.value})));
            locale('30684b41',()=>stack.#call('30684b41','30684b46'));
            runProlog('30684b46',{ebp:value=>{frame.localeEbp=value;},fs:()=>{},returned:()=>{frame.localePrologReturned=true;}});
            locale('30684b46',()=>stack.#call('30684b46','30684b4b'));
            runGetter('30684b4b',{ptd:value=>{frame.localePtd=value;},returned:()=>{frame.localeGetterReturned=true;}});
            locale('30684b4b',()=>set('EDI',reg('EAX')));
            locale('30684b4d',()=>{const image=NativeEngineArgvImages.imageForCrt(images,crt,'multibyteLocaleFlags');if(!image.known)throw new Error(image.reason);set('EAX',value(NativeHeapObjectViews.prototype.readUnsigned.call(image.value,0)));});
            locale('30684b52',()=>{const flags=NativeHeapObjectViews.prototype.readUnsigned.call(ptd(reg('EDI')),0x70),result=flags&stack.#numeric(reg('EAX'),4);stack.#logicalFlags(result,0xffffffff,4);});
            let refresh=false;locale('30684b55',()=>{refresh=branchZero();});
            if(!refresh){locale('30684b57',()=>{const pointer=NativeHeapObjectViews.prototype.pointer.call(ptd(reg('EDI')),0x6c).get();stack.#flags(pointer===null?0x40:0,0x40);});locale('30684b5b',()=>{refresh=branchZero();});}
            if(refresh){
              locale('30684b74',()=>stack.#push(value(13)));
              locale('30684b76',()=>lock('lock','30684b76','30684b7b'));
              locale('30684b7b',()=>pop('ECX'));
              locale('30684b7c',()=>{stack.#store(stack.#stack,relative('EBP',-4),value(0));stack.#logicalFlags(0,0xffffffff,4);});
              locale('30684b80',()=>set('ESI',mbcWord(NativeHeapObjectViews.prototype.pointer.call(ptd(reg('EDI')),0x68).get())));
              locale('30684b83',()=>stack.#store(stack.#stack,relative('EBP',-0x1c),reg('ESI')));
              locale('30684b86',()=>{const current=currentMbc();stack.#flags(mbcPointer(reg('ESI'))===mbcPointer(current)?0x40:0,0x40);});
              let matches=false;locale('30684b8c',()=>{matches=branchZero();});
              if(!matches){frame.pc='30684b8e';engineArgvInstruction('30684b3a',frame.pc);throw new Error('Engine MBC pointer replacement at30684b8e');}
              locale('30684bc4',()=>stack.#store(stack.#stack,relative('EBP',-4),value(0xfffffffe)));
              locale('30684bcb',()=>stack.#call('30684bcb','30684bd0'));
              const unlock=(pc:string,body:()=>void)=>step(pc,body,'30684bd5');
              unlock('30684bd5',()=>stack.#push(value(13)));
              unlock('30684bd7',()=>lock('unlock','30684bd7','30684bdc'));
              unlock('30684bdc',()=>pop('ECX'));
              unlock('30684bdd',()=>{const returned=stack.#record(stack.#ret()).provenance;if(returned?.kind!=='source'||returned.type!=='code'||returned.address!=='30684bd0')throw new Error('Actual Engine MBC unlock wrapper return required');});
              locale('30684bd0',()=>{});
            }else locale('30684b5d',()=>set('ESI',mbcWord(NativeHeapObjectViews.prototype.pointer.call(ptd(reg('EDI')),0x68).get())));
            locale('30684b60',()=>{const pointer=mbcPointer(reg('ESI'));stack.#flags(pointer===null?0x40:0,0x841);});
            let presentMbc=false;locale('30684b62',()=>{presentMbc=!branchZero();});
            if(!presentMbc){locale('30684b64',()=>stack.#push(value(32)));locale('30684b66',()=>stack.#call('30684b66','30684b6b'));frame.pc='3067cf89';throw new Error('Engine NULL MBC fatal error3067cf89 at30684b66');}
            locale('30684b6c',()=>set('EAX',reg('ESI')));
            locale('30684b6e',()=>stack.#call('30684b6e','30684b73'));
            const epilog=(pc:string,body:()=>void)=>{stack.#engineArgvProof(frame);engineIoInstruction('3067e545',pc);frame.pc=pc;body();frame.operations++;stack.#trace.push(pc+'.EngineArgvSource');stack.#engineArgvProof(frame);};
            epilog('3067e545',()=>set('ECX',stack.#load(stack.#stack,relative('EBP',-0x10))));
            epilog('3067e548',()=>{stack.#store(stack.#bank,32,reg('ECX'));frame.localeFsRestored=true;});
            epilog('3067e54f',()=>pop('ECX'));epilog('3067e550',()=>pop('EDI'));epilog('3067e551',()=>pop('EDI'));epilog('3067e552',()=>pop('ESI'));epilog('3067e553',()=>pop('EBX'));
            epilog('3067e554',()=>set('ESP',reg('EBP')));epilog('3067e556',()=>pop('EBP'));epilog('3067e557',()=>stack.#push(reg('ECX')));
            epilog('3067e558',()=>{const returned=stack.#record(stack.#ret()).provenance;if(returned?.kind!=='source'||returned.type!=='code'||returned.address!=='30684b73')throw new Error('Actual Engine locale EH4 epilog return required');});
            locale('30684b73',()=>{const returned=stack.#record(stack.#ret()).provenance;if(returned?.kind!=='source'||returned.type!=='code'||returned.address!=='30684e8c'||relative('EBP',0)!==frame.multibyteEbp)throw new Error('Actual Engine locale caller and restored nested EBP required');frame.localeReturned=true;});
            nested('30684e8c',()=>set('EBX',mbcWord(NativeHeapObjectViews.prototype.pointer.call(ptd(reg('EDI')),0x68).get())));
            nested('30684e8f',()=>set('ESI',stack.#load(stack.#stack,relative('EBP',8))));
            nested('30684e92',()=>stack.#call('30684e92','30684e97'));
            const runCodepage=(returnAddress:string,parentEbp:number)=>{
              frame.codepageLocaleRecord=null;frame.codepageEbp=null;frame.codepageCtorReturned=false;frame.codepageReturned=false;
            const codepage=(pc:string,body:()=>void)=>step(pc,body,'30684bde');
            const localeWord=(pointer:object|null)=>{if(pointer===null)return value(0);const owned=NativeCrtBootstrap.engineArgvLocaleForCrt(bootstrap,crt,permit);if(!owned.known)throw new Error(owned.reason);if(pointer!==owned.value.original)throw new Error('Engine dynamic locale remains unsupported');frame.codepageLocale=owned.value.original;return stack.#mint(0,0,{kind:'engine-locale',crt,fields:owned.value.original});};
            const localePointer=(word:NativeX86Word32)=>{const p=stack.#liveWord(word).provenance;if(p?.kind==='engine-locale'&&p.crt===crt)return p.fields;if(stack.#numeric(word,4)===0)return null;throw new Error('Actual Engine locale pointer or NULL required');};
            const currentLocale=()=>{const owned=NativeCrtBootstrap.engineArgvLocaleForCrt(bootstrap,crt,permit);if(!owned.known)throw new Error(owned.reason);try{return localeWord(NativeHeapObjectViews.prototype.pointer.call(owned.value.current,0).get());}catch(error){if(NativeHeapObjectViews.prototype.readUnsigned.call(owned.value.current,0)===0x30ad5100)return localeWord(owned.value.original);throw error;}};
            const byteStore=(position:number,byte:number)=>{stack.#invalidateRange(stack.#stack,position,1);NativeHeapObjectViews.prototype.writeUnsigned.call(stack.#stack,position,byte,1);};
            codepage('30684bde',()=>stack.#push(reg('EBP')));
            codepage('30684bdf',()=>{set('EBP',reg('ESP'));frame.codepageEbp=relative('EBP',0);});
            codepage('30684be1',()=>{set('ESP',stack.#stackWord(relative('ESP',-16)));stack.#flags(0,0);});
            codepage('30684be4',()=>stack.#push(reg('EBX')));
            codepage('30684be5',()=>{set('EBX',value(0));stack.#logicalFlags(0,0xffffffff,4);});
            codepage('30684be7',()=>stack.#push(reg('EBX')));
            codepage('30684be8',()=>{const position=relative('EBP',-16);set('ECX',stack.#stackWord(position));frame.codepageLocaleRecord=new NativeHeapObjectViews(stack.#stack.backing,position,16);Object.freeze(frame.codepageLocaleRecord);});
            codepage('30684beb',()=>stack.#call('30684beb','30684bf0'));
            const ctor=(pc:string,body:()=>void)=>step(pc,body,'30673389');
            ctor('30673389',()=>set('EAX',stack.#load(stack.#stack,relative('ESP',4))));
            ctor('3067338d',()=>{const input=stack.#numeric(reg('EAX'),4);stack.#logicalFlags(input,0xffffffff,4);});
            ctor('3067338f',()=>stack.#push(reg('ESI')));
            ctor('30673390',()=>set('ESI',reg('ECX')));
            ctor('30673392',()=>byteStore(stack.#address(reg('ESI'))+12,0));
            let provided=false;ctor('30673396',()=>{provided=!branchZero();});
            if(provided){frame.pc='306733fb';engineArgvInstruction('30673389',frame.pc);throw new Error('Engine provided locale update at306733fb');}
            ctor('30673398',()=>stack.#call('30673398','3067339d'));
            runGetter('3067339d',{ptd:value=>{frame.codepagePtd=value;},returned:()=>{}});
            ctor('3067339d',()=>stack.#store(stack.#stack,stack.#address(reg('ESI'))+8,reg('EAX')));
            ctor('306733a0',()=>set('ECX',localeWord(NativeHeapObjectViews.prototype.pointer.call(ptd(reg('EAX')),0x6c).get())));
            ctor('306733a3',()=>stack.#store(stack.#stack,stack.#address(reg('ESI')),reg('ECX')));
            ctor('306733a5',()=>set('ECX',mbcWord(NativeHeapObjectViews.prototype.pointer.call(ptd(reg('EAX')),0x68).get())));
            ctor('306733a8',()=>stack.#store(stack.#stack,stack.#address(reg('ESI'))+4,reg('ECX')));
            ctor('306733ab',()=>set('ECX',stack.#load(stack.#stack,stack.#address(reg('ESI')))));
            ctor('306733ad',()=>stack.#flags(localePointer(reg('ECX'))===localePointer(currentLocale())?0x40:0,0x40));
            let localeMatches=false;ctor('306733b3',()=>{localeMatches=branchZero();});
            if(!localeMatches){frame.pc='306733b5';engineArgvInstruction('30673389',frame.pc);throw new Error('Engine locale update refresh at306733b5');}
            ctor('306733c7',()=>set('EAX',stack.#load(stack.#stack,stack.#address(reg('ESI'))+4)));
            ctor('306733ca',()=>stack.#flags(mbcPointer(reg('EAX'))===mbcPointer(currentMbc())?0x40:0,0x40));
            let mbcMatches=false;ctor('306733d0',()=>{mbcMatches=branchZero();});
            if(!mbcMatches){frame.pc='306733d2';engineArgvInstruction('30673389',frame.pc);throw new Error('Engine locale update MBC refresh at306733d2');}
            ctor('306733e8',()=>set('EAX',stack.#load(stack.#stack,stack.#address(reg('ESI'))+8)));
            ctor('306733eb',()=>{const flags=NativeHeapObjectViews.prototype.maskedWord.call(ptd(reg('EAX')),0x70,1);stack.#logicalFlags(flags.value&2,(flags.knownMask&2)|0xfd,1);});
            let owned=false;ctor('306733ef',()=>{owned=!branchZero();});
            if(!owned){
              ctor('306733f1',()=>{const fields=ptd(reg('EAX')),flags=NativeHeapObjectViews.prototype.maskedWord.call(fields,0x70);const result=flags.value|2,mask=flags.knownMask|2;stack.#store(fields,0x70,stack.#mint(result,mask));stack.#logicalFlags(result,mask,4);});
              ctor('306733f5',()=>byteStore(stack.#address(reg('ESI'))+12,1));
              ctor('306733f9',()=>{});
            }
            ctor('30673405',()=>set('EAX',reg('ESI')));
            ctor('30673407',()=>pop('ESI'));
            ctor('30673408',()=>{const returned=stack.#record(stack.#ret(4)).provenance;if(returned?.kind!=='source'||returned.type!=='code'||returned.address!=='30684bf0')throw new Error('Actual Engine locale-update constructor RET4 required');frame.codepageCtorReturned=true;});
            codepage('30684bf0',()=>{const input=stack.#numeric(reg('ESI'),4);stack.#arithmeticFlags(input,0xfffffffe,(input-0xfffffffe)>>>0,4,true);});
            const automatic=NativeEngineArgvImages.imageForCrt(images,crt,'codepageAutomatic');if(!automatic.known)throw new Error(automatic.reason);
            codepage('30684bf3',()=>NativeHeapObjectViews.prototype.writeUnsigned.call(automatic.value,0,stack.#numeric(reg('EBX'),4)));
            let acp=false;codepage('30684bf9',()=>{acp=!branchZero();});
            if(!acp){frame.pc='30684bfb';engineArgvInstruction('30684bde',frame.pc);throw new Error('Engine OEM code-page query at30684bfb');}
            codepage('30684c19',()=>{const input=stack.#numeric(reg('ESI'),4);stack.#arithmeticFlags(input,0xfffffffd,(input-0xfffffffd)>>>0,4,true);});
            codepage('30684c1c',()=>{acp=branchZero();});
            if(acp){
            codepage('30684c1e',()=>NativeHeapObjectViews.prototype.writeUnsigned.call(automatic.value,0,1));
            codepage('30684c28',()=>{
              stack.#call('30684c28','30684c2e');const top=stack.#calls.at(-1)!;
              const endpoints=stack.#platform.argvNlsEndpoints;if(!endpoints)throw new Error('Engine GetACP IAT30afc734 at30684c28');
              const endpoint=NativeRuntimePlatform.canonicalArgvNlsEndpointsForPlatform(stack.#platform,endpoints);if(!endpoint.known)throw new Error(endpoint.reason);
              const grant=Object.freeze({identity:Object.freeze({})}),call={stack,frame,kind:'GetACP' as const,position:top.position,returnWord:top.returnWord,phase:'pending' as 'pending'|'returned'};engineArgvNlsCalls.set(grant,call);
              const result=endpoints.invoke(grant);if(!result.known)throw new Error(result.reason);
              const normal=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform(stack.#platform,grant);if(!normal.known)throw new Error(normal.reason);if(normal.value!==result.value||result.value.kind!=='scalar')throw new Error('Actual Engine ACP normal result required');
              const returned=stack.#record(stack.#ret()).provenance;if(returned?.kind!=='source'||returned.type!=='code'||returned.address!=='30684c2e')throw new Error('Actual Engine GetACP RET0 required');call.phase='returned';
              set('EAX',value(result.value.value));set('ECX',stack.#mint(0,0));set('EDX',stack.#mint(0,0));stack.#flags(0,0);frame.codepageAcpReturned=true;
            });
            codepage('30684c2e',()=>{});
            codepage('30684c0b',()=>{const own=NativeHeapObjectViews.prototype.readUnsigned.call(stack.#stack,relative('EBP',-4),1),zero=stack.#numeric(reg('EBX'),1);stack.#arithmeticFlags(own,zero,(own-zero)&255,1,true);});
            let leaveOwned=false;codepage('30684c0e',()=>{leaveOwned=branchZero();});
            if(!leaveOwned){
              codepage('30684c10',()=>set('ECX',stack.#load(stack.#stack,relative('EBP',-8))));
              codepage('30684c13',()=>{const fields=ptd(reg('ECX')),flags=NativeHeapObjectViews.prototype.maskedWord.call(fields,0x70);const result=flags.value&0xfffffffd,mask=flags.knownMask|2;stack.#store(fields,0x70,stack.#mint(result,mask));stack.#logicalFlags(result,mask,4);});
              codepage('30684c17',()=>{});
            }
            }else{
              codepage('30684c30',()=>{const input=stack.#numeric(reg('ESI'),4);stack.#arithmeticFlags(input,0xfffffffc,(input-0xfffffffc)>>>0,4,true);});
              let borrowed=false;codepage('30684c33',()=>{borrowed=branchZero();});
              if(borrowed){frame.pc='30684c35';engineArgvInstruction('30684bde',frame.pc);throw new Error('Engine borrowed locale code-page at30684c35');}
              codepage('30684c47',()=>{const own=NativeHeapObjectViews.prototype.readUnsigned.call(stack.#stack,relative('EBP',-4),1),zero=stack.#numeric(reg('EBX'),1);stack.#arithmeticFlags(own,zero,(own-zero)&255,1,true);});
              let retained=false;codepage('30684c4a',()=>{retained=branchZero();});
              if(!retained){
                codepage('30684c4c',()=>set('EAX',stack.#load(stack.#stack,relative('EBP',-8))));
                codepage('30684c4f',()=>{const fields=ptd(reg('EAX')),flags=NativeHeapObjectViews.prototype.maskedWord.call(fields,0x70),result=flags.value&0xfffffffd,mask=flags.knownMask|2;stack.#store(fields,0x70,stack.#mint(result,mask));stack.#logicalFlags(result,mask,4);});
              }
              codepage('30684c53',()=>set('EAX',reg('ESI')));
            }
            codepage('30684c55',()=>pop('EBX'));
            codepage('30684c56',()=>{set('ESP',reg('EBP'));pop('EBP');});
            codepage('30684c57',()=>{const returned=stack.#record(stack.#ret()).provenance;if(returned?.kind!=='source'||returned.type!=='code'||returned.address!==returnAddress||relative('EBP',0)!==parentEbp)throw new Error('Actual Engine code-page helper return required');frame.codepageResult=stack.#numeric(reg('EAX'),4);frame.codepageReturned=true;});
            };
            runCodepage('30684e97',frame.multibyteEbp!);
            nested('30684e97',()=>stack.#store(stack.#stack,relative('EBP',8),reg('EAX')));
            nested('30684e9a',()=>{const fields=mbcPointer(reg('EBX'));if(!fields)throw new Error('Actual Engine current MBC for code-page comparison required');const input=stack.#numeric(reg('EAX'),4),current=NativeHeapObjectViews.prototype.readUnsigned.call(fields,4);stack.#arithmeticFlags(input,current,(input-current)>>>0,4,true);});
            let unchanged=false;nested('30684e9d',()=>{unchanged=branchZero();});
            if(unchanged){frame.pc='30684ffa';engineArgvInstruction('30684e6d',frame.pc);throw new Error('Engine matching MBC code-page return at30684ffa');}
            nested('30684ea3',()=>stack.#push(value(544)));
            nested('30684ea8',()=>stack.#call('30684ea8','30684ead'));
            const malloc=(pc:string,body:()=>void)=>step(pc,body,'3067c9c1');
            malloc('3067c9c1',()=>stack.#push(reg('ESI')));
            malloc('3067c9c2',()=>stack.#push(reg('EDI')));
            malloc('3067c9c3',()=>{set('ESI',value(0));stack.#logicalFlags(0,0xffffffff,4);});
            malloc('3067c9c5',()=>stack.#push(stack.#load(stack.#stack,relative('ESP',12))));
            malloc('3067c9c9',()=>{
              const position=relative('ESP',0),bytes=stack.#numeric(stack.#load(stack.#stack,position),4);if(bytes!==544)throw new Error('Actual Engine MBC malloc request544 required');
              stack.#call('3067c9c9','3067c9ce');engineArgvInstruction('30672ec7','30672ec7');
              // Bridge the already translated lower allocator against this
              // Engine CRT owner. Its body is captured, but not counted as
              // instruction execution on this retained source stack.
              const allocated=NativeModuleCrtOwner.prototype.malloc.call(crt,bytes);if(!allocated.known)throw new Error(allocated.reason);
              stack.#engineArgvProof(frame);
              if(allocated.value){const fields=new NativeHeapObjectViews(allocated.value);Object.freeze(fields);const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields,offset:0},544);if(!owned.known)throw new Error(owned.reason);frame.multibyteAllocation=fields;set('EAX',stack.#mint(0,0,{kind:'engine-allocation',crt,fields,offset:0}));}else set('EAX',value(0));
              set('ECX',stack.#mint(0,0));set('EDX',stack.#mint(0,0));stack.#flags(0,0);
              const returned=stack.#record(stack.#ret()).provenance;if(returned?.kind!=='source'||returned.address!=='3067c9ce'||relative('ESP',0)!==position)throw new Error('Actual Engine lower malloc cdecl return required');
            });
            malloc('3067c9ce',()=>set('EDI',reg('EAX')));
            malloc('3067c9d0',()=>{const allocated=stack.#liveWord(reg('EDI')).provenance;stack.#logicalFlags(allocated?.kind==='engine-allocation'?1:stack.#numeric(reg('EDI'),4),allocated?.kind==='engine-allocation'?1:0xffffffff,4);});
            malloc('3067c9d2',()=>pop('ECX'));
            let allocated=false;malloc('3067c9d3',()=>{allocated=!branchZero();});
            if(!allocated){
              malloc('3067c9d5',()=>{const wait=NativeHeapObjectViews.prototype.readUnsigned.call(crt.physical.mallocWait,0),result=stack.#numeric(reg('EAX'),4);stack.#arithmeticFlags(wait,result,(wait-result)>>>0,4,true);});
              let noWait=false;malloc('3067c9db',()=>{const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x41)!==0x41)throw new Error('Owned Engine malloc JBE flags required');noWait=!!(flags.value&0x41);});
              if(!noWait){frame.pc='3067c9dd';engineArgvInstruction('3067c9c1',frame.pc);throw new Error('Engine malloc wait Sleep at3067c9de');}
            }
            malloc('3067c9fc',()=>set('EAX',reg('EDI')));
            malloc('3067c9fe',()=>pop('EDI'));
            malloc('3067c9ff',()=>pop('ESI'));
            malloc('3067ca00',()=>{const returned=stack.#record(stack.#ret()).provenance;if(returned?.kind!=='source'||returned.address!=='30684ead')throw new Error('Actual Engine MBC malloc wrapper return required');frame.multibyteMallocReturned=true;});
            nested('30684ead',()=>pop('ECX'));
            nested('30684eae',()=>set('EBX',reg('EAX')));
            nested('30684eb0',()=>stack.#logicalFlags(frame.multibyteAllocation?1:stack.#numeric(reg('EBX'),4),frame.multibyteAllocation?1:0xffffffff,4));
            let nullMbc=false;nested('30684eb2',()=>{nullMbc=branchZero();});
            if(nullMbc){frame.pc='30684ffe';engineArgvInstruction('30684e6d',frame.pc);throw new Error('Engine NULL MBC allocation return at30684ffe');}
            nested('30684eb8',()=>set('ECX',value(136)));
            nested('30684ebd',()=>set('ESI',mbcWord(NativeHeapObjectViews.prototype.pointer.call(ptd(reg('EDI')),0x68).get())));
            nested('30684ec0',()=>set('EDI',reg('EBX')));
            nested('30684ec2',()=>{
              const direction=NativeRuntimePlatform.readNativeDirectionFlag(stack.#platform);if(!direction.known)throw new Error(direction.reason);if(direction.value!==0)throw new Error('Engine backward MBC copy requires preceding owned memory');
              const source=mbcPointer(reg('ESI')),destination=stack.#liveWord(reg('EDI')).provenance;if(!source||destination?.kind!=='engine-allocation'||destination.crt!==crt||destination.fields!==frame.multibyteAllocation||destination.offset!==0||stack.#numeric(reg('ECX'),4)!==136)throw new Error('Actual Engine MBC REP MOVSD spans required');
              for(let index=0;index<136;index++){stack.#engineArgvProof(frame);const offset=index*4,word=NativeHeapObjectViews.prototype.maskedWord.call(source,offset);stack.#invalidateRange(destination.fields,offset,4);stack.#store(destination.fields,offset,stack.#mint(word.value,word.knownMask));set('ESI',stack.#mint(0,0,{kind:'engine-mbc',crt,fields:source,offset:offset+4}));set('EDI',stack.#mint(0,0,{kind:'engine-allocation',crt,fields:destination.fields,offset:offset+4}));set('ECX',value(135-index));}
              frame.multibyteCopyReturned=true;
            });
            nested('30684ec4',()=>{const fields=frame.multibyteAllocation!;stack.#invalidateRange(fields,0,4);stack.#store(fields,0,value(0));stack.#logicalFlags(0,0xffffffff,4);});
            nested('30684ec7',()=>stack.#push(reg('EBX')));
            nested('30684ec8',()=>stack.#push(stack.#load(stack.#stack,relative('EBP',8))));
            nested('30684ecb',()=>stack.#call('30684ecb','30684ed0'));
            const initialize=(pc:string,body:()=>void)=>step(pc,body,'30684c58');
            initialize('30684c58',()=>stack.#push(reg('EBP')));
            initialize('30684c59',()=>{set('EBP',reg('ESP'));frame.mbcInitEbp=relative('EBP',0);});
            initialize('30684c5b',()=>{set('ESP',stack.#stackWord(relative('ESP',-32)));stack.#flags(0,0);});
            initialize('30684c5e',()=>{const cookie=NativeCrtBootstrap.engineArgvCookieForCrt(bootstrap,crt,permit);if(!cookie.known)throw new Error(cookie.reason);set('EAX',value(NativeHeapObjectViews.prototype.readUnsigned.call(cookie.value,0)));});
            initialize('30684c63',()=>set('EAX',xor(reg('EAX'),reg('EBP'))));
            initialize('30684c65',()=>stack.#store(stack.#stack,relative('EBP',-4),reg('EAX')));
            initialize('30684c68',()=>stack.#push(reg('EBX')));
            initialize('30684c69',()=>set('EBX',stack.#load(stack.#stack,relative('EBP',12))));
            initialize('30684c6c',()=>stack.#push(reg('ESI')));
            initialize('30684c6d',()=>set('ESI',stack.#load(stack.#stack,relative('EBP',8))));
            initialize('30684c70',()=>stack.#push(reg('EDI')));
            initialize('30684c71',()=>stack.#call('30684c71','30684c76'));
            runCodepage('30684c76',frame.mbcInitEbp!);frame.mbcInitCodepageReturned=true;
            initialize('30684c76',()=>set('EDI',reg('EAX')));
            initialize('30684c78',()=>{set('ESI',value(0));stack.#logicalFlags(0,0xffffffff,4);});
            initialize('30684c7a',()=>{const left=stack.#numeric(reg('EDI'),4),right=stack.#numeric(reg('ESI'),4);stack.#arithmeticFlags(left,right,(left-right)>>>0,4,true);});
            initialize('30684c7c',()=>stack.#store(stack.#stack,relative('EBP',8),reg('EDI')));
            let nonzero=false;initialize('30684c7f',()=>{nonzero=!branchZero();});
            if(!nonzero){frame.pc='30684c81';engineArgvInstruction('30684c58',frame.pc);throw new Error('Engine zero code-page initialization at30684c81');}
            initialize('30684c8f',()=>stack.#store(stack.#stack,relative('EBP',-28),reg('ESI')));
            initialize('30684c92',()=>{set('EAX',value(0));stack.#logicalFlags(0,0xffffffff,4);});
            const table=NativeEngineArgvImages.imageForCrt(images,crt,'multibyteCodepageTable');if(!table.known)throw new Error(table.reason);
            for(;;){
              initialize('30684c94',()=>{const offset=stack.#numeric(reg('EAX'),4);if(offset>=240||offset%48)throw new Error('Actual Engine code-page table record required');const left=NativeHeapObjectViews.prototype.readUnsigned.call(table.value,offset),right=stack.#numeric(reg('EDI'),4);stack.#arithmeticFlags(left,right,(left-right)>>>0,4,true);});
              let special=false;initialize('30684c9a',()=>{special=branchZero();});
              if(special){frame.pc='30684d31';engineArgvInstruction('30684c58',frame.pc);throw new Error('Engine special MBC code-page table branch at30684d31');}
              initialize('30684ca0',()=>{const offset=relative('EBP',-28),left=stack.#numeric(stack.#load(stack.#stack,offset),4),flags=stack.#record(stack.#load(stack.#bank,36));stack.#store(stack.#stack,offset,value(left+1));stack.#arithmeticFlags(left,1,(left+1)>>>0,4,false);const updated=stack.#record(stack.#load(stack.#bank,36));stack.#flags((updated.value&~1)|(flags.value&1),(updated.mask&~1)|(flags.mask&1));});
              initialize('30684ca3',()=>{const left=stack.#numeric(reg('EAX'),4),result=(left+48)>>>0;set('EAX',value(result));stack.#arithmeticFlags(left,48,result,4,false);});
              initialize('30684ca6',()=>{const left=stack.#numeric(reg('EAX'),4);stack.#arithmeticFlags(left,240,(left-240)>>>0,4,true);});
              let next=false;initialize('30684cab',()=>{const flags=stack.#record(stack.#load(stack.#bank,36));if(!(flags.mask&1))throw new Error('Owned Engine code-page table JC flag required');next=!!(flags.value&1);});if(!next)break;
            }
            initialize('30684cad',()=>{const left=stack.#numeric(reg('EDI'),4);stack.#arithmeticFlags(left,65000,(left-65000)>>>0,4,true);});
            let unsupported=false;initialize('30684cb3',()=>{unsupported=branchZero();});
            if(unsupported){frame.pc='30684e1f';engineArgvInstruction('30684c58',frame.pc);throw new Error('Engine rejected code-page65000 at30684e1f');}
            initialize('30684cb9',()=>{const left=stack.#numeric(reg('EDI'),4);stack.#arithmeticFlags(left,65001,(left-65001)>>>0,4,true);});
            initialize('30684cbf',()=>{unsupported=branchZero();});
            if(unsupported){frame.pc='30684e1f';engineArgvInstruction('30684c58',frame.pc);throw new Error('Engine rejected code-page65001 at30684e1f');}
            initialize('30684cc5',()=>set('EAX',value(stack.#numeric(reg('EDI'),2))));
            initialize('30684cc8',()=>stack.#push(reg('EAX')));
            const invokeMbcNls=(kind:'IsValidCodePage'|'GetCPInfo',site:string,returnAddress:string,argumentBytes:number)=>{
              stack.#call(site,returnAddress);const top=stack.#calls.at(-1)!;
              const endpoints=stack.#platform.argvNlsEndpoints;if(!endpoints)throw new Error(`Engine ${kind} import at${site}`);
              const endpoint=NativeRuntimePlatform.canonicalArgvNlsEndpointsForPlatform(stack.#platform,endpoints);if(!endpoint.known)throw new Error(endpoint.reason);
              const grant=Object.freeze({identity:Object.freeze({})}),call={stack,frame,kind,position:top.position,returnWord:top.returnWord,phase:'pending' as 'pending'|'returned'};engineArgvNlsCalls.set(grant,call);
              const result=endpoints.invoke(grant);if(!result.known)throw new Error(result.reason);
              const normal=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform(stack.#platform,grant);if(!normal.known)throw new Error(normal.reason);if(normal.value!==result.value||result.value.kind!=='scalar')throw new Error('Actual Engine MBC import normal result required');
              const returned=stack.#record(stack.#ret(argumentBytes)).provenance;if(returned?.kind!=='source'||returned.type!=='code'||returned.address!==returnAddress)throw new Error('Actual Engine MBC stdcall return required');call.phase='returned';set('EAX',value(result.value.value));set('ECX',stack.#mint(0,0));set('EDX',stack.#mint(0,0));stack.#flags(0,0);
            };
            initialize('30684cc9',()=>{invokeMbcNls('IsValidCodePage','30684cc9','30684ccf',4);frame.mbcValidCodepageReturned=true;});
            initialize('30684ccf',()=>{const input=stack.#numeric(reg('EAX'),4);stack.#logicalFlags(input,0xffffffff,4);});
            let valid=false;initialize('30684cd1',()=>{valid=!branchZero();});
            if(!valid){frame.pc='30684e1f';engineArgvInstruction('30684c58',frame.pc);throw new Error('Engine invalid MBC code-page at30684e1f');}
            initialize('30684cd7',()=>{const position=relative('EBP',-24);frame.mbcInfo=new NativeHeapObjectViews(stack.#stack.backing,position,20);Object.freeze(frame.mbcInfo);set('EAX',stack.#stackWord(position));});
            initialize('30684cda',()=>stack.#push(reg('EAX')));
            initialize('30684cdb',()=>stack.#push(reg('EDI')));
            initialize('30684cdc',()=>{invokeMbcNls('GetCPInfo','30684cdc','30684ce2',8);frame.mbcInfoReturned=true;});
            initialize('30684ce2',()=>{const input=stack.#numeric(reg('EAX'),4);stack.#logicalFlags(input,0xffffffff,4);});
            let info=false;initialize('30684ce4',()=>{info=!branchZero();});
            if(!info){frame.pc='30684e13';engineArgvInstruction('30684c58',frame.pc);throw new Error('Engine failed MBC CPInfo at30684e13');}
            initialize('30684cea',()=>stack.#push(value(257)));
            initialize('30684cef',()=>{const pointer=stack.#liveWord(reg('EBX')).provenance;if(pointer?.kind!=='engine-allocation'||pointer.crt!==crt||pointer.fields!==frame.multibyteAllocation||pointer.offset!==0)throw new Error('Actual Engine MBC classification allocation required');set('EAX',stack.#mint(0,0,{kind:'engine-allocation',crt,fields:pointer.fields,offset:28}));});
            initialize('30684cf2',()=>stack.#push(reg('ESI')));
            initialize('30684cf3',()=>stack.#push(reg('EAX')));
            initialize('30684cf4',()=>{
              const position=relative('ESP',0),destinationWord=stack.#load(stack.#stack,position),destination=stack.#liveWord(destinationWord).provenance,fill=stack.#numeric(stack.#load(stack.#stack,position+4),4),bytes=stack.#numeric(stack.#load(stack.#stack,position+8),4);
              if(destination?.kind!=='engine-allocation'||destination.crt!==crt||destination.fields!==frame.multibyteAllocation||destination.offset!==28||fill!==0||bytes!==257)throw new Error('Actual Engine MBC memset destination/zero/257 arguments required');
              stack.#call('30684cf4','30684cf9');engineArgvInstruction('30671690','30671690');
              // Translate the admitted memset's memory effect, not its CPU
              // dispatch/alignment instruction body. The exact caller and
              // same-owner destination remain on the retained source stack.
              for(let offset=destination.offset;offset<destination.offset+bytes;offset++){stack.#engineArgvProof(frame);const direction=NativeRuntimePlatform.readNativeDirectionFlag(stack.#platform);if(!direction.known)throw new Error(direction.reason);if(direction.value!==0)throw new Error('Engine memset forward direction required');const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields:destination.fields,offset},1);if(!owned.known)throw new Error(owned.reason);stack.#invalidateRange(destination.fields,offset,1);NativeHeapObjectViews.prototype.writeUnsigned.call(destination.fields,offset,0,1);}
              set('EAX',destinationWord);set('ECX',stack.#mint(0,0));set('EDX',stack.#mint(0,0));stack.#flags(0,0);
              const returned=stack.#record(stack.#ret()).provenance;if(returned?.kind!=='source'||returned.type!=='code'||returned.address!=='30684cf9'||relative('ESP',0)!==position)throw new Error('Actual Engine MBC memset cdecl return required');frame.mbcMemsetReturned=true;
            });
            initialize('30684cf9',()=>{set('EDX',value(0));stack.#logicalFlags(0,0xffffffff,4);});
            initialize('30684cfb',()=>{const left=stack.#numeric(reg('EDX'),4),flags=stack.#record(stack.#load(stack.#bank,36));set('EDX',value(left+1));stack.#arithmeticFlags(left,1,(left+1)>>>0,4,false);const updated=stack.#record(stack.#load(stack.#bank,36));stack.#flags((updated.value&~1)|(flags.value&1),(updated.mask&~1)|(flags.mask&1));});
            initialize('30684cfc',()=>{set('ESP',stack.#stackWord(relative('ESP',12)));stack.#flags(0,0);});
            initialize('30684cff',()=>{const left=stack.#numeric(stack.#load(stack.#stack,relative('EBP',-24)),4),right=stack.#numeric(reg('EDX'),4);stack.#arithmeticFlags(left,right,(left-right)>>>0,4,true);});
            const allocation=(word:NativeX86Word32)=>{const pointer=stack.#liveWord(word).provenance;if(pointer?.kind!=='engine-allocation'||pointer.crt!==crt||pointer.fields!==frame.multibyteAllocation||pointer.offset!==0)throw new Error('Actual Engine MBC allocation base required');return pointer.fields;};
            initialize('30684d02',()=>{const fields=allocation(reg('EBX'));stack.#invalidateRange(fields,4,4);stack.#store(fields,4,reg('EDI'));});
            initialize('30684d05',()=>{const fields=allocation(reg('EBX'));stack.#invalidateRange(fields,12,4);stack.#store(fields,12,reg('ESI'));});
            let singleByte=false;initialize('30684d08',()=>{const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x41)!==0x41)throw new Error('Owned Engine MBC JBE flags required');singleByte=!!(flags.value&0x41);});
            if(!singleByte){frame.pc='30684d0e';engineArgvInstruction('30684c58',frame.pc);throw new Error('Engine multibyte lead-byte initialization at30684d0e');}
            initialize('30684e06',()=>{const fields=allocation(reg('EBX'));stack.#invalidateRange(fields,8,4);stack.#store(fields,8,reg('ESI'));});
            initialize('30684e09',()=>{set('EAX',value(0));stack.#logicalFlags(0,0xffffffff,4);});
            initialize('30684e0b',()=>{const fields=allocation(reg('EBX'));set('EDI',stack.#mint(0,0,{kind:'engine-allocation',crt,fields,offset:16}));});
            const storeDword=()=>{const pointer=stack.#liveWord(reg('EDI')).provenance;if(pointer?.kind!=='engine-allocation'||pointer.crt!==crt||pointer.fields!==frame.multibyteAllocation)throw new Error('Actual Engine MBC STOSD destination required');const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields:pointer.fields,offset:pointer.offset},4);if(!owned.known)throw new Error(owned.reason);const direction=NativeRuntimePlatform.readNativeDirectionFlag(stack.#platform);if(!direction.known)throw new Error(direction.reason);stack.#invalidateRange(pointer.fields,pointer.offset,4);stack.#store(pointer.fields,pointer.offset,reg('EAX'));set('EDI',stack.#mint(0,0,{kind:'engine-allocation',crt,fields:pointer.fields,offset:pointer.offset+(direction.value?-4:4)}));};
            initialize('30684e0e',storeDword);
            initialize('30684e0f',storeDword);
            initialize('30684e10',()=>{storeDword();frame.mbcSingleByteInitialized=true;});
            initialize('30684e11',()=>{});
            initialize('30684dc5',()=>set('ESI',reg('EBX')));
            initialize('30684dc7',()=>stack.#call('30684dc7','30684dcc'));
            const caseStep=(pc:string,body:()=>void)=>step(pc,body,'306849b0');
            caseStep('306849b0',()=>stack.#push(reg('EBP')));
            caseStep('306849b1',()=>set('EBP',stack.#stackWord(relative('ESP',-1180))));
            caseStep('306849b8',()=>{set('ESP',stack.#stackWord(relative('ESP',-1308)));stack.#flags(0,0);});
            caseStep('306849be',()=>{const cookie=NativeCrtBootstrap.engineArgvCookieForCrt(bootstrap,crt,permit);if(!cookie.known)throw new Error(cookie.reason);set('EAX',value(NativeHeapObjectViews.prototype.readUnsigned.call(cookie.value,0)));});
            caseStep('306849c3',()=>set('EAX',xor(reg('EAX'),reg('EBP'))));
            caseStep('306849c5',()=>stack.#store(stack.#stack,relative('EBP',0x498),reg('EAX')));
            caseStep('306849cb',()=>stack.#push(reg('EBX')));
            caseStep('306849cc',()=>stack.#push(reg('EDI')));
            caseStep('306849cd',()=>set('EAX',stack.#stackWord(relative('EBP',-0x7c))));
            caseStep('306849d0',()=>stack.#push(reg('EAX')));
            caseStep('306849d1',()=>{const fields=allocation(reg('ESI'));stack.#push(stack.#load(fields,4));});
            frame.pc='306849d4';engineArgvInstruction('306849b0',frame.pc);throw new Error('Engine case-table GetCPInfo at306849d4');
          }
          wrapper('30685022',()=>{set('EAX',stack.#mint(0,0xffffffff));stack.#logicalFlags(0,0xffffffff,4);});
          wrapper('30685024',()=>{const next=stack.#record(stack.#ret()).provenance;if(next?.kind!=='source'||next.type!=='code'||next.address!=='3068e787')throw new Error('Actual Engine multibyte wrapper return required');});
        }
        frame.pc='3068e787';engineArgvInstruction('3068e76f',frame.pc);throw new Error('Engine argument filename preparation at3068e787');
      }catch(error){frame.boundary??=reason(error);frame.phase='blocked';if(!stack.#executing){stack.#boundary??=frame.boundary;stack.#phase='blocked';}return unknown(frame.boundary);}
      finally{stack.#engineArgvExecuting=false;}
    }catch(error){return unknown(reason(error));}
  }
  #engineArgvProof(frame:EngineArgvFrame):void{
    if(this.#engineArgvFrame!==frame||!this.#engineArgvExecuting||frame.phase!=='running'||this.#phase!=='running')throw new Error(frame.boundary??'Actual active Engine argument frame required');
    const reached=NativeCrtBootstrap.canonicalEngineArgvCallForCrt(frame.bootstrap,frame.crt,frame.permit);if(!reached.known)throw new Error(reached.reason);
    const selection=NativeRuntimePlatform.threadStackSelectionForPlatform(this.#platform);if(!selection.known||selection.value!==this.#selection)throw new Error('Actual selected Engine argument logical-thread lifetime required');
    for(const label of ['multibyteReady','moduleFilename','moduleFilenameSentinel','programNamePointer','argumentCount','argumentVector','multibyteSetupSehScope','multibyteLocaleSehScope','multibyteLocaleFlags','currentMultibytePointer','codepageAutomatic','multibyteCodepageTable'] as const){const image=NativeEngineArgvImages.imageForCrt(frame.images,frame.crt,label);if(!image.known)throw new Error(image.reason);}
    if(frame.multibytePtd){const ptd=NativeCrtThreadStartup.canonicalPtdForCrt(frame.crt,frame.multibytePtd);if(!ptd.known)throw new Error(ptd.reason);}
    if(frame.localePtd){const ptd=NativeCrtThreadStartup.canonicalPtdForCrt(frame.crt,frame.localePtd);if(!ptd.known)throw new Error(ptd.reason);}
    if(frame.localeMbc){const mbc=NativeCrtBootstrap.engineArgvMbcForCrt(frame.bootstrap,frame.crt,frame.permit);if(!mbc.known)throw new Error(mbc.reason);if(mbc.value!==frame.localeMbc)throw new Error('Actual retained Engine locale MBC required');}
    if(frame.codepagePtd){const ptd=NativeCrtThreadStartup.canonicalPtdForCrt(frame.crt,frame.codepagePtd);if(!ptd.known)throw new Error(ptd.reason);}
    if(frame.codepageLocale){const locale=NativeCrtBootstrap.engineArgvLocaleForCrt(frame.bootstrap,frame.crt,frame.permit);if(!locale.known)throw new Error(locale.reason);if(locale.value.original!==frame.codepageLocale)throw new Error('Actual retained Engine code-page locale required');}
    if(frame.multibyteAllocation){const allocation=NativeModuleCrtOwner.canonicalEngineHeapDestination(frame.crt,this.#platform,{fields:frame.multibyteAllocation,offset:0},544);if(!allocation.known)throw new Error(allocation.reason);}
    if(frame.mbcInfo){const fields=frame.mbcInfo;if(frame.mbcInitEbp===null||fields.backing!==this.#stack.backing||fields.bytes.buffer!==this.#stack.bytes.buffer||fields.bytes.byteOffset!==this.#stack.bytes.byteOffset+frame.mbcInitEbp-24||fields.bytes.length!==20||fields.knownMask.buffer!==this.#stack.knownMask.buffer||fields.knownMask.byteOffset!==this.#stack.knownMask.byteOffset+frame.mbcInitEbp-24||fields.knownMask.length!==20||dataViewBuffer.call(fields.view)!==fields.bytes.buffer||dataViewByteOffset.call(fields.view)!==fields.bytes.byteOffset||dataViewByteLength.call(fields.view)!==20)throw new Error('Actual retained Engine CPInfo alias required');}
    if(frame.codepageLocaleRecord){if(frame.codepageEbp===null||frame.codepageLocaleRecord.backing!==this.#stack.backing||frame.codepageLocaleRecord.bytes.byteOffset!==this.#stack.bytes.byteOffset+frame.codepageEbp-16||frame.codepageLocaleRecord.bytes.length!==16||frame.codepageLocaleRecord.bytes.buffer!==this.#stack.bytes.buffer||frame.codepageLocaleRecord.knownMask.buffer!==this.#stack.knownMask.buffer||frame.codepageLocaleRecord.knownMask.byteOffset!==this.#stack.knownMask.byteOffset+frame.codepageEbp-16||frame.codepageLocaleRecord.knownMask.length!==16||dataViewBuffer.call(frame.codepageLocaleRecord.view)!==frame.codepageLocaleRecord.bytes.buffer||dataViewByteOffset.call(frame.codepageLocaleRecord.view)!==frame.codepageLocaleRecord.bytes.byteOffset||dataViewByteLength.call(frame.codepageLocaleRecord.view)!==16)throw new Error('Actual Engine code-page stack record alias required');}
    this.#physical(this.#stack);this.#physical(this.#bank);
  }
  engineArgvFrameSnapshot(crt:NativeModuleCrtOwner){const frame=this.#engineArgvFrame;if(!frame||frame.crt!==crt)return null;return Object.freeze({module:'Engine' as const,phase:frame.phase,pc:frame.pc,boundary:frame.boundary,operations:frame.operations,entryEsp:frame.entryEsp,ebp:frame.ebp,multibyteEbp:frame.multibyteEbp,multibyteFsPublished:frame.multibyteFsPublished,multibytePrologReturned:frame.multibytePrologReturned,multibytePtd:frame.multibytePtd,multibyteGetterReturned:frame.multibyteGetterReturned,localeEbp:frame.localeEbp,localePtd:frame.localePtd,localeMbc:frame.localeMbc,localePrologReturned:frame.localePrologReturned,localeGetterReturned:frame.localeGetterReturned,localeFsRestored:frame.localeFsRestored,localeLockHeld:frame.localeLockHeld,localeReturned:frame.localeReturned,codepageEbp:frame.codepageEbp,codepageLocaleRecord:frame.codepageLocaleRecord,codepagePtd:frame.codepagePtd,codepageLocale:frame.codepageLocale,codepageCtorReturned:frame.codepageCtorReturned,codepageAcpReturned:frame.codepageAcpReturned,codepageReturned:frame.codepageReturned,codepageResult:frame.codepageResult,multibyteAllocation:frame.multibyteAllocation,multibyteMallocReturned:frame.multibyteMallocReturned,multibyteCopyReturned:frame.multibyteCopyReturned,mbcInitEbp:frame.mbcInitEbp,mbcInitCodepageReturned:frame.mbcInitCodepageReturned,mbcValidCodepageReturned:frame.mbcValidCodepageReturned,mbcInfo:frame.mbcInfo,mbcInfoReturned:frame.mbcInfoReturned,mbcMemsetReturned:frame.mbcMemsetReturned,mbcSingleByteInitialized:frame.mbcSingleByteInitialized,stack:this.#stack,bank:this.#bank});}
  static engineArgvNlsArgumentsForPlatform(platform:NativeRuntimePlatform,grant:NativeArgvNlsCallGrant):NativeValue<Readonly<{kind:'GetACP'|'IsValidCodePage'|'GetCPInfo';site:string;crt:NativeModuleCrtOwner;scalar:number|null;fields:NativeHeapObjectViews|null}>>{
    try{
      const call=engineArgvNlsCalls.get(grant);if(!call||call.phase!=='pending'||graphs.get(platform)!==call.stack||call.stack.#platform!==platform)throw new Error('Actual pending Engine NLS call required');
      const stack=call.stack,frame=call.frame;stack.#engineArgvProof(frame);
      const active=NativeRuntimePlatform.canonicalArgvNlsInvocationForPlatform(platform,grant);if(!active.known)throw new Error(active.reason);
      const site=call.kind==='GetACP'?'30684c28':call.kind==='IsValidCodePage'?'30684cc9':'30684cdc',entry=call.kind==='GetACP'?'30684bde':'30684c58';
      const receipt=call.kind==='GetACP'?engineArgvGetACPImport():engineArgvMbcImport(call.kind);
      if(receipt.module.toLowerCase()!=='kernel32.dll'||receipt.name!==call.kind||receipt.ordinal!==null||engineArgvInstruction(entry,site).instruction!==`CALL dword ptr [${receipt.iatVA}]`)throw new Error('Original Engine NLS import identity required');
      const top=stack.#calls.at(-1);if(frame.pc!==site||!frame.codepageCtorReturned||!top||top.returned||top.site!==site||top.position!==call.position||top.returnWord!==call.returnWord||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==call.position||stack.#load(stack.#stack,call.position)!==call.returnWord)throw new Error('Actual current Engine NLS call and return slot required');
      const scalar=call.kind==='GetACP'?null:stack.#numeric(stack.#load(stack.#stack,call.position+4),4);
      const fields=call.kind==='GetCPInfo'?frame.mbcInfo:null;
      if(call.kind!=='GetACP'&&!frame.mbcInitCodepageReturned)throw new Error('Actual Engine MBC code-page caller required');
      if(call.kind==='GetCPInfo'){
        const pointer=stack.#liveWord(stack.#load(stack.#stack,call.position+8)).provenance;
        if(!fields||frame.mbcInitEbp===null||pointer?.kind!=='stack'||pointer.offset!==frame.mbcInitEbp-24)throw new Error('Actual Engine GetCPInfo stack output required');
      }
      return known(Object.freeze({kind:call.kind,site,crt:frame.crt,scalar,fields}));
    }catch(error){return unknown(reason(error));}
  }

  static writeEngineArgvNlsMemoryForPlatform(platform:NativeRuntimePlatform,grant:NativeArgvNlsCallGrant,offset:number,value:number,width:1|4):NativeValue<void>{
    try{
      const input=NativeX86ThreadStack.engineArgvNlsArgumentsForPlatform(platform,grant);if(!input.known)return input;
      const call=engineArgvNlsCalls.get(grant)!;
      if(input.value.kind!=='GetCPInfo'||!input.value.fields||call.frame.mbcInitEbp===null||!((offset===0&&width===4)||(Number.isInteger(offset)&&offset>=4&&offset<18&&width===1)))throw new Error('Actual Engine CPInfo defined output field required');
      call.stack.#invalidateRange(call.stack.#stack,call.frame.mbcInitEbp-24+offset,width);
      NativeHeapObjectViews.prototype.writeUnsigned.call(input.value.fields,offset,value,width);
      call.stack.#engineArgvProof(call.frame);return known(undefined);
    }catch(error){return unknown(reason(error));}
  }
  #engineIoFrame:EngineIoFrame|null=null;
  #engineIoExecuting=false;
  /** Borrow the actual thread graph for a reached translated Engine CRT call.
   * This does not establish native DLL loader order or a complete CRT frame. */
  static enterEngineIoForBootstrap(stack:NativeX86ThreadStack,bootstrap:NativeCrtBootstrap,crt:NativeModuleCrtOwner,permit:object):NativeValue<void>{
    const call=NativeCrtBootstrap.canonicalEngineIoCallForCrt(bootstrap,crt,permit);if(!call.known)return call;
    try{
      if(graphs.get(crt.host.platform as NativeRuntimePlatform)!==stack||stack.#platform!==crt.host.platform)throw new Error('Actual same-thread Engine I/O graph required');
      if(stack.#engineIoExecuting)throw new Error('Reentrant Engine I/O frame cannot replay');
      if(stack.#engineIoFrame)throw new Error(stack.#engineIoFrame.boundary??'Retained Engine I/O frame cannot restart');
      if(stack.#phase==='running'){
        const binding=stack.#setEnvpBinding;
        if(!binding||!stack.#executing||stack.#calls.filter(call=>!call.returned).at(-1)?.site!=='200766c2')throw new Error('Actual pending Game module-administrator frame required for Engine bridge');
        const parent=NativeGameCrtSetEnvp.canonicalAIHelperModuleAdminCallForCrt(binding.owner,binding.crt,binding.controller);if(!parent.known)throw new Error(parent.reason);
      }else if(stack.#phase!=='cold'||stack.#binding||stack.#sharedArgvFrame||stack.#dllMemoryController)throw new Error('Actual cold Engine thread or reached Game bridge required');
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);
      const images=bootstrap.attachProgress().engineIoImages;if(!images)throw new Error('Actual retained Engine I/O images required');
      const scope=NativeEngineIoImages.imageForCrt(images,crt,'ioSehScope');if(!scope.known)throw new Error(scope.reason);
      const frame:EngineIoFrame={bootstrap,crt,permit,images,scope:scope.value,phase:'running',pc:'30677266',boundary:null,operations:0,entryEsp:stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),ebp:null,prologReturned:false,fsPublished:false,startupInfo:null,allocation:null,callocReturned:false,fileType:null,section:null,sectionResult:null,setHandleCountResult:null,fsRestored:false};
      stack.#engineIoFrame=frame;stack.#engineIoExecuting=true;stack.#phase='running';
      const register=(name:NativeX86Register)=>stack.#load(stack.#bank,stack.#reg(name));
      const set=(name:NativeX86Register,word:NativeX86Word32)=>stack.#store(stack.#bank,stack.#reg(name),word);
      const relative=(name:'ESP'|'EBP',offset:number)=>stack.#address(register(name))+offset;
      const value=(number:number)=>stack.#mint(number>>>0,0xffffffff);
      const xor=(left:NativeX86Word32,right:NativeX86Word32)=>{
        if(left===right){stack.#logicalFlags(0,0xffffffff,4);return value(0);}
        const a=stack.#record(left),b=stack.#record(right);stack.#logicalFlags(a.value^b.value,a.mask&b.mask,4);
        return stack.#mint(a.value^b.value,a.mask&b.mask,{kind:'xor',left,right});
      };
      const step=(entry:string,pc:string,body:()=>void)=>{
        stack.#engineIoProof(frame);engineIoInstruction(entry,pc);frame.pc=pc;body();frame.operations++;
        stack.#trace.push(pc+'.EngineIoSource');stack.#engineIoProof(frame);
      };
      try{
        // The TypeScript CRT caller bridge issues the actual source CALL. Its
        // return is distinct from the still-pending Game getter below it.
        stack.#engineIoProof(frame);stack.#call('30677266','3067726b');
        step('306886ec','306886ec',()=>stack.#push(value(0x54)));
        step('306886ec','306886ee',()=>stack.#push(stack.#mint(0,0,{kind:'source',type:'image',address:'30956c00',fields:frame.scope})));
        step('306886ec','306886f3',()=>stack.#call('306886f3','306886f8'));
        const prolog=(pc:string,body:()=>void)=>step('3067e500',pc,body);
        prolog('3067e500',()=>stack.#push(stack.#source('code','3067e590')));
        prolog('3067e505',()=>stack.#push(stack.#load(stack.#bank,32)));
        prolog('3067e50c',()=>set('EAX',stack.#load(stack.#stack,relative('ESP',0x10))));
        prolog('3067e510',()=>stack.#store(stack.#stack,relative('ESP',0x10),register('EBP')));
        prolog('3067e514',()=>{frame.ebp=relative('ESP',0x10);set('EBP',stack.#stackWord(frame.ebp));});
        prolog('3067e518',()=>{const bytes=stack.#numeric(register('EAX'),4);set('ESP',stack.#stackWord(relative('ESP',-bytes)));stack.#flags(0,0);});
        prolog('3067e51a',()=>stack.#push(register('EBX')));
        prolog('3067e51b',()=>stack.#push(register('ESI')));
        prolog('3067e51c',()=>stack.#push(register('EDI')));
        prolog('3067e51d',()=>{const cookie=NativeCrtBootstrap.engineIoCookieForCrt(bootstrap,crt,permit);if(!cookie.known)throw new Error(cookie.reason);set('EAX',value(NativeHeapObjectViews.prototype.readUnsigned.call(cookie.value,0)));});
        prolog('3067e522',()=>{const at=relative('EBP',-4);stack.#store(stack.#stack,at,xor(stack.#load(stack.#stack,at),register('EAX')));});
        prolog('3067e525',()=>set('EAX',xor(register('EAX'),register('EBP'))));
        prolog('3067e527',()=>stack.#push(register('EAX')));
        prolog('3067e528',()=>stack.#store(stack.#stack,relative('EBP',-0x18),register('ESP')));
        prolog('3067e52b',()=>stack.#push(stack.#load(stack.#stack,relative('EBP',-8))));
        prolog('3067e52e',()=>set('EAX',stack.#load(stack.#stack,relative('EBP',-4))));
        prolog('3067e531',()=>stack.#store(stack.#stack,relative('EBP',-4),value(0xfffffffe)));
        prolog('3067e538',()=>stack.#store(stack.#stack,relative('EBP',-8),register('EAX')));
        prolog('3067e53b',()=>set('EAX',stack.#stackWord(relative('EBP',-0x10))));
        prolog('3067e53e',()=>{stack.#store(stack.#bank,32,register('EAX'));frame.fsPublished=true;});
        prolog('3067e544',()=>{const result=stack.#record(stack.#ret()).provenance;if(result?.kind!=='source'||result.type!=='code'||result.address!=='306886f8')throw new Error('Actual Engine EH4 prolog return required');frame.prologReturned=true;});
        step('306886ec','306886f8',()=>set('EDI',xor(register('EDI'),register('EDI'))));
        step('306886ec','306886fa',()=>stack.#store(stack.#stack,relative('EBP',-4),register('EDI')));
        step('306886ec','306886fd',()=>{
          const offset=relative('EBP',-0x64);set('EAX',stack.#stackWord(offset));
          frame.startupInfo=new NativeHeapObjectViews(stack.#stack.backing,offset,68);Object.freeze(frame.startupInfo);
        });
        step('306886ec','30688700',()=>stack.#push(register('EAX')));
        step('306886ec','30688701',()=>{
          const endpoints=stack.#platform.startupIoEndpoints;if(!endpoints)throw new Error('Engine GetStartupInfoA IAT30afc748 at30688701');
          const endpointProof=NativeRuntimePlatform.canonicalStartupIoEndpointsForPlatform(stack.#platform,endpoints);if(!endpointProof.known)throw new Error(endpointProof.reason);
          const argumentPosition=relative('ESP',0),argument=stack.#load(stack.#stack,argumentPosition),offset=frame.ebp!-0x64;
          if(stack.#address(argument)!==offset)throw new Error('Actual Engine STARTUPINFOA argument required');
          stack.#call('30688701','30688707');const top=stack.#calls.at(-1)!;
          const grant=Object.freeze({identity:Object.freeze({})}),call={stack,frame,offset,argument,position:top.position,returnWord:top.returnWord,phase:'pending' as 'pending'|'returned'};
          engineStartupCalls.set(grant,call);
          const result=endpoints.getStartupInfoA(grant);if(!result.known)throw new Error(result.reason);
          const returned=NativeRuntimePlatform.canonicalStartupInfoNormalReturnForPlatform(stack.#platform,grant);if(!returned.known)throw new Error(returned.reason);
          stack.#engineStartupProof(call);
          for(const name of ['EAX','ECX','EDX'] as const)set(name,stack.#mint(0,0));stack.#flags(0,0);
          set('ESP',stack.#stackWord(call.position+8));top.returned=true;stack.#currentPc=call.returnWord;call.phase='returned';
        });
        step('306886ec','30688707',()=>stack.#store(stack.#stack,relative('EBP',-4),value(0xfffffffe)));
        step('306886ec','3068870e',()=>stack.#push(value(0x38)));
        step('306886ec','30688710',()=>stack.#push(value(0x20)));
        step('306886ec','30688712',()=>{const position=relative('ESP',0);set('ESI',stack.#load(stack.#stack,position));set('ESP',stack.#stackWord(position+4));});
        step('306886ec','30688713',()=>stack.#push(register('ESI')));
        step('306886ec','30688714',()=>{
          const argumentPosition=relative('ESP',0);
          const count=stack.#numeric(stack.#load(stack.#stack,argumentPosition),4),size=stack.#numeric(stack.#load(stack.#stack,argumentPosition+4),4);
          if(count!==32||size!==56)throw new Error('Actual Engine I/O calloc operands required');
          stack.#call('30688714','30688719');
          // Recovered CRT wrapper bridge; not an instruction interpreter for
          // its allocator body. It returns storage from the actual Engine heap.
          const allocated=crt.callocCrt(count,size);if(!allocated.known)throw new Error(allocated.reason);
          stack.#engineIoProof(frame);
          if(allocated.value){
            const fields=new NativeHeapObjectViews(allocated.value);Object.freeze(fields);
            const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields,offset:0},count*size);if(!owned.known)throw new Error(owned.reason);
            frame.allocation=fields;set('EAX',stack.#mint(0,0,{kind:'engine-allocation',crt,fields,offset:0}));
          }else set('EAX',value(0));
          for(const name of ['ECX','EDX'] as const)set(name,stack.#mint(0,0));stack.#flags(0,0);
          const continuation=stack.#record(stack.#ret()).provenance;
          if(continuation?.kind!=='source'||continuation.type!=='code'||continuation.address!=='30688719'||relative('ESP',0)!==argumentPosition)throw new Error('Actual Engine calloc cdecl return required');
          frame.callocReturned=true;
        });
        const popEcx=()=>{const position=relative('ESP',0);set('ECX',stack.#load(stack.#stack,position));set('ESP',stack.#stackWord(position+4));};
        step('306886ec','30688719',popEcx);
        step('306886ec','3068871a',popEcx);
        step('306886ec','3068871b',()=>{if(stack.#numeric(register('EDI'),4)!==0)throw new Error('Actual Engine null comparison required');stack.#liveWord(register('EAX'));stack.#flags(frame.allocation?0:0x40,0x40);});
        step('306886ec','3068871d',()=>{if(!frame.allocation)throw new Error('Engine I/O allocation failure branch at30688923');});
        step('306886ec','30688723',()=>{
          const table=NativeEngineIoImages.imageForCrt(frame.images,crt,'ioBlockPointers');if(!table.known)throw new Error(table.reason);
          const allocation=frame.allocation!;const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields:allocation,offset:0},1792);if(!owned.known)throw new Error(owned.reason);
          table.value.pointer(0).set(Object.freeze({fields:allocation,offset:0}));
        });
        step('306886ec','30688728',()=>{const count=NativeEngineIoImages.imageForCrt(frame.images,crt,'ioHandleCount');if(!count.known)throw new Error(count.reason);count.value.writeUnsigned(0,stack.#numeric(register('ESI'),4));});
        step('306886ec','3068872e',()=>{const fields=frame.allocation!;const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields,offset:1792},0);if(!owned.known)throw new Error(owned.reason);set('ECX',stack.#mint(0,0,{kind:'engine-allocation',crt,fields,offset:1792}));});
        step('306886ec','30688734',()=>{});
        const allocationPointer=(word:NativeX86Word32)=>{
          const p=stack.#liveWord(word).provenance;
          if(p?.kind!=='engine-allocation'||p.crt!==crt||p.fields!==frame.allocation)throw new Error('Actual same-Engine I/O block pointer required');
          return p;
        };
        const compare=()=>{
          const left=allocationPointer(register('EAX')),right=allocationPointer(register('ECX'));
          // Same allocation, bounded offsets: only CF and ZF are established.
          stack.#flags((left.offset<right.offset?1:0)|(left.offset===right.offset?0x40:0),0x41);
        };
        step('306886ec','3068875f',compare);
        let more=false;
        step('306886ec','30688761',()=>{more=allocationPointer(register('EAX')).offset<allocationPointer(register('ECX')).offset;});
        while(more){
          const store=(pc:string,offset:number,width:1|4,number:number)=>step('306886ec',pc,()=>{
            const p=allocationPointer(register('EAX')),position=p.offset+offset;
            const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields:p.fields,offset:position},width);if(!owned.known)throw new Error(owned.reason);
            NativeHeapObjectViews.prototype.writeUnsigned.call(p.fields,position,number,width);
          });
          store('30688736',4,1,0);
          step('306886ec','3068873a',()=>{const p=allocationPointer(register('EAX'));const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields:p.fields,offset:p.offset},4);if(!owned.known)throw new Error(owned.reason);NativeHeapObjectViews.prototype.writeUnsigned.call(p.fields,p.offset,0xffffffff);stack.#logicalFlags(0xffffffff,0xffffffff,4);});
          store('3068873d',5,1,10);
          store('30688741',8,4,stack.#numeric(register('EDI'),4));
          store('30688744',0x24,1,0);
          store('30688748',0x25,1,10);
          store('3068874c',0x26,1,10);
          step('306886ec','30688750',()=>{const p=allocationPointer(register('EAX'));const offset=p.offset+56;const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields:p.fields,offset},0);if(!owned.known)throw new Error(owned.reason);set('EAX',stack.#mint(0,0,{kind:'engine-allocation',crt,fields:p.fields,offset}));stack.#flags(0,0);});
          step('306886ec','30688753',()=>{
            const table=NativeEngineIoImages.imageForCrt(frame.images,crt,'ioBlockPointers');if(!table.known)throw new Error(table.reason);
            const pointer=table.value.pointer<NativeBytePointer>(0).get();if(!pointer||pointer.fields!==frame.allocation||pointer.offset!==0)throw new Error('Actual current Engine I/O table base required');
            const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,pointer,1792);if(!owned.known)throw new Error(owned.reason);
            set('ECX',stack.#mint(0,0,{kind:'engine-allocation',crt,fields:pointer.fields,offset:0}));
          });
          step('306886ec','30688759',()=>{const p=allocationPointer(register('ECX'));set('ECX',stack.#mint(0,0,{kind:'engine-allocation',crt,fields:p.fields,offset:p.offset+1792}));stack.#flags(0,0);});
          step('306886ec','3068875f',compare);
          step('306886ec','30688761',()=>{more=allocationPointer(register('EAX')).offset<allocationPointer(register('ECX')).offset;});
        }
        let inheritedBytes=0;
        step('306886ec','30688763',()=>{inheritedBytes=NativeHeapObjectViews.prototype.readUnsigned.call(stack.#stack,relative('EBP',-0x32),2);const di=stack.#numeric(register('EDI'),2);stack.#arithmeticFlags(inheritedBytes,di,inheritedBytes-di,2,true);});
        step('306886ec','30688767',()=>{if(inheritedBytes!==0)throw new Error('Engine inherited handle block at3068876d');});
        step('306886ec','3068886a',()=>set('EBX',xor(register('EBX'),register('EBX'))));
        let nextStandard=true;while(nextStandard){
        step('306886ec','3068886c',()=>set('ESI',register('EBX')));
        step('306886ec','3068886e',()=>{const index=stack.#numeric(register('ESI'),4);set('ESI',value(index*56));stack.#flags(0,0x801);});
        step('306886ec','30688871',()=>{
          const offset=stack.#numeric(register('ESI'),4),table=NativeEngineIoImages.imageForCrt(frame.images,crt,'ioBlockPointers');if(!table.known)throw new Error(table.reason);
          const pointer=table.value.pointer<NativeBytePointer>(0).get();if(!pointer||pointer.fields!==frame.allocation||pointer.offset!==0)throw new Error('Actual Engine standard-handle record base required');
          const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields:pointer.fields,offset},56);if(!owned.known)throw new Error(owned.reason);
          set('ESI',stack.#mint(0,0,{kind:'engine-allocation',crt,fields:pointer.fields,offset}));stack.#flags(0,0);
        });
        step('306886ec','30688877',()=>{const p=allocationPointer(register('ESI'));set('EAX',value(NativeHeapObjectViews.prototype.readUnsigned.call(p.fields,p.offset)));});
        step('306886ec','30688879',()=>{const handle=stack.#numeric(register('EAX'),4);stack.#arithmeticFlags(handle,0xffffffff,handle-0xffffffff,4,true);});
        step('306886ec','3068887c',()=>{if(stack.#numeric(register('EAX'),4)!==0xffffffff)throw new Error('Engine existing standard handle at3068887e');});
        step('306886ec','30688889',()=>{const p=allocationPointer(register('ESI'));NativeHeapObjectViews.prototype.writeUnsigned.call(p.fields,p.offset+4,0x81,1);});
        step('306886ec','3068888d',()=>stack.#logicalFlags(stack.#numeric(register('EBX'),4),0xffffffff,4));
        let first=false;step('306886ec','3068888f',()=>{first=stack.#numeric(register('EBX'),4)===0;});
        if(first){
          step('306886ec','30688891',()=>stack.#push(value(0xfffffff6)));
          step('306886ec','30688893',()=>{const position=relative('ESP',0);set('EAX',stack.#load(stack.#stack,position));set('ESP',stack.#stackWord(position+4));});
          step('306886ec','30688894',()=>{});
        }else{
          step('306886ec','30688896',()=>set('EAX',register('EBX')));
          step('306886ec','30688898',()=>{const number=stack.#numeric(register('EAX'),4),next=(number-1)>>>0,before=stack.#record(stack.#load(stack.#bank,36));set('EAX',value(next));stack.#arithmeticFlags(number,1,next,4,true);const after=stack.#record(stack.#load(stack.#bank,36));stack.#flags((after.value&~1)|(before.value&1),(after.mask&~1)|(before.mask&1));});
          step('306886ec','30688899',()=>{const number=stack.#numeric(register('EAX'),4),next=(-number)>>>0;set('EAX',value(next));stack.#arithmeticFlags(0,number,next,4,true);});
          step('306886ec','3068889b',()=>{const flags=stack.#record(stack.#load(stack.#bank,36));if(!(flags.mask&1))throw new Error('Actual Engine standard-ID carry required');const carry=flags.value&1;set('EAX',value(-carry));stack.#arithmeticFlags(0,0,-carry,4,true,carry);});
          step('306886ec','3068889d',()=>{const number=stack.#numeric(register('EAX'),4),next=(number+0xfffffff5)>>>0;set('EAX',value(next));stack.#arithmeticFlags(number,0xfffffff5,next,4,false);});
        }
        step('306886ec','306888a0',()=>stack.#push(register('EAX')));
        step('306886ec','306888a1',()=>{
          const endpoints=stack.#platform.standardIoEndpoints;if(!endpoints)throw new Error('Engine GetStdHandle IAT30afc718 at306888a1');
          const proof=NativeRuntimePlatform.canonicalStandardIoEndpointsForPlatform(stack.#platform,endpoints);if(!proof.known)throw new Error(proof.reason);
          const argument=stack.#load(stack.#stack,relative('ESP',0)),scalar=stack.#numeric(argument,4);
          if(scalar!==((-10-stack.#numeric(register('EBX'),4))>>>0))throw new Error('Actual Engine standard-handle ID required');
          stack.#call('306888a1','306888a7');const top=stack.#calls.at(-1)!,grant=Object.freeze({identity:Object.freeze({})});
          const call={stack,frame,args:Object.freeze({site:'306888a1' as const,kind:'GetStdHandle' as const,crt,scalar}),position:top.position,argument,returnWord:top.returnWord,phase:'pending' as 'pending'|'returned'};
          engineStandardCalls.set(grant,call);const result=endpoints.invoke(grant);if(!result.known)throw new Error(result.reason);
          const returned=NativeRuntimePlatform.canonicalStandardIoNormalReturnForPlatform(stack.#platform,grant);if(!returned.known||returned.value!==result.value)throw new Error(returned.known?'Actual Engine GetStdHandle result required':returned.reason);
          stack.#engineStandardProof(call);
          if(typeof result.value==='object'&&result.value!==null){const capability=NativeRuntimePlatform.standardIoCapabilityForPlatform(stack.#platform,result.value);if(!capability.known||capability.value!=='handle')throw new Error('Actual platform standard-handle capability required');set('EAX',stack.#mint(0,0,{kind:'platform',object:result.value,category:'handle'}));}
          else if(result.value===null||result.value===0xffffffff)set('EAX',value(result.value===null?0:0xffffffff));else throw new Error('Actual Engine standard-handle result required');
          for(const name of ['ECX','EDX'] as const)set(name,stack.#mint(0,0));stack.#flags(0,0);
          set('ESP',stack.#stackWord(call.position+8));top.returned=true;stack.#currentPc=call.returnWord;call.phase='returned';
        });
        const validHandle=()=>{const p=stack.#liveWord(register('EDI')).provenance;if(p?.kind!=='platform'||p.category!=='handle')return false;const proof=NativeRuntimePlatform.standardIoCapabilityForPlatform(stack.#platform,p.object);if(!proof.known||proof.value!=='handle')throw new Error('Actual current Engine standard handle required');return true;};
        step('306886ec','306888a7',()=>set('EDI',register('EAX')));
        step('306886ec','306888a9',()=>{if(validHandle())stack.#flags(0,0x40);else{const number=stack.#numeric(register('EDI'),4);stack.#arithmeticFlags(number,0xffffffff,number-0xffffffff,4,true);}});
        step('306886ec','306888ac',()=>{if(!validHandle()&&stack.#numeric(register('EDI'),4)===0xffffffff)throw new Error('Engine invalid standard handle branch at306888f1');});
        step('306886ec','306888ae',()=>{if(validHandle())stack.#flags(0,0x40);else stack.#logicalFlags(stack.#numeric(register('EDI'),4),0xffffffff,4);});
        step('306886ec','306888b0',()=>{if(!validHandle()&&stack.#numeric(register('EDI'),4)===0)throw new Error('Engine NULL standard handle branch at306888f1');});
        step('306886ec','306888b2',()=>stack.#push(register('EDI')));
        step('306886ec','306888b3',()=>{
          const endpoints=stack.#platform.standardIoEndpoints;if(!endpoints)throw new Error('Engine GetFileType IAT30afc744 at306888b3');
          const endpointProof=NativeRuntimePlatform.canonicalStandardIoEndpointsForPlatform(stack.#platform,endpoints);if(!endpointProof.known)throw new Error(endpointProof.reason);
          const argument=stack.#load(stack.#stack,relative('ESP',0)),p=stack.#liveWord(argument).provenance;
          if(p?.kind!=='platform'||p.category!=='handle')throw new Error('Actual Engine GetFileType handle argument required');
          const capability=NativeRuntimePlatform.standardIoCapabilityForPlatform(stack.#platform,p.object);if(!capability.known||capability.value!=='handle')throw new Error('Actual current GetFileType handle required');
          stack.#call('306888b3','306888b9');const top=stack.#calls.at(-1)!,grant=Object.freeze({identity:Object.freeze({})});
          const call={stack,frame,args:Object.freeze({site:'306888b3' as const,kind:'GetFileType' as const,crt,object:p.object}),position:top.position,argument,returnWord:top.returnWord,phase:'pending' as 'pending'|'returned'};
          engineStandardCalls.set(grant,call);const result=endpoints.invoke(grant);if(!result.known)throw new Error(result.reason);
          const returned=NativeRuntimePlatform.canonicalStandardIoNormalReturnForPlatform(stack.#platform,grant);if(!returned.known||returned.value!==result.value)throw new Error(returned.known?'Actual Engine GetFileType return required':returned.reason);
          stack.#engineStandardProof(call);
          if(typeof result.value!=='number'||!Number.isInteger(result.value)||result.value<0||result.value>0xffffffff)throw new Error('Actual GetFileType DWORD result required');
          frame.fileType=result.value;set('EAX',value(result.value));for(const name of ['ECX','EDX'] as const)set(name,stack.#mint(0,0));stack.#flags(0,0);
          set('ESP',stack.#stackWord(call.position+8));top.returned=true;stack.#currentPc=call.returnWord;call.phase='returned';
        });
        step('306886ec','306888b9',()=>stack.#logicalFlags(stack.#numeric(register('EAX'),4),0xffffffff,4));
        step('306886ec','306888bb',()=>{if(stack.#numeric(register('EAX'),4)===0)throw new Error('Engine zero file-type branch at306888f1');});
        step('306886ec','306888bd',()=>{const p=allocationPointer(register('ESI')),handle=stack.#liveWord(register('EDI')).provenance;if(handle?.kind!=='platform'||handle.category!=='handle')throw new Error('Actual Engine handle adoption required');const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields:p.fields,offset:p.offset},4);if(!owned.known)throw new Error(owned.reason);p.fields.pointer(p.offset).set(handle.object);});
        step('306886ec','306888bf',()=>{const masked=stack.#numeric(register('EAX'),4)&255;set('EAX',value(masked));stack.#logicalFlags(masked,0xffffffff,4);});
        step('306886ec','306888c4',()=>{const number=stack.#numeric(register('EAX'),4);stack.#arithmeticFlags(number,2,number-2,4,true);});
        let character=false;step('306886ec','306888c7',()=>{character=stack.#numeric(register('EAX'),4)===2;});
        const orRecordFlag=(pc:string,flag:number)=>step('306886ec',pc,()=>{const p=allocationPointer(register('ESI'));const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields:p.fields,offset:p.offset+4},1);if(!owned.known)throw new Error(owned.reason);const number=NativeHeapObjectViews.prototype.readUnsigned.call(p.fields,p.offset+4,1)|flag;NativeHeapObjectViews.prototype.writeUnsigned.call(p.fields,p.offset+4,number,1);stack.#logicalFlags(number,255,1);});
        if(character){orRecordFlag('306888c9',0x40);step('306886ec','306888cd',()=>{});}
        else{let pipe=false;step('306886ec','306888cf',()=>{const number=stack.#numeric(register('EAX'),4);stack.#arithmeticFlags(number,3,number-3,4,true);});step('306886ec','306888d2',()=>{pipe=stack.#numeric(register('EAX'),4)===3;});if(pipe)orRecordFlag('306888d4',8);}
        step('306886ec','306888d8',()=>stack.#push(value(4000)));
        step('306886ec','306888dd',()=>{const p=allocationPointer(register('ESI'));const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields:p.fields,offset:p.offset+12},24);if(!owned.known)throw new Error(owned.reason);set('EAX',stack.#mint(0,0,{kind:'engine-allocation',crt,fields:p.fields,offset:p.offset+12}));});
        step('306886ec','306888e0',()=>stack.#push(register('EAX')));
        step('306886ec','306888e1',()=>{
          const argumentPosition=relative('ESP',0),sectionPointer=allocationPointer(stack.#load(stack.#stack,argumentPosition));
          if(stack.#numeric(stack.#load(stack.#stack,argumentPosition+4),4)!==4000)throw new Error('Actual Engine section spin count4000 required');
          const section=new NativeHeapObjectViews(sectionPointer.fields.backing,sectionPointer.offset,24);Object.freeze(section);frame.section=section;
          stack.#call('306888e1','306888e6');const result=crt.initializeHeapCriticalSection(Object.freeze({fields:section,offset:0}));if(!result.known)throw new Error(result.reason);
          frame.sectionResult=result.value;stack.#engineIoProof(frame);const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,stack.#platform,{fields:section,offset:0},24);if(!owned.known)throw new Error(owned.reason);
          set('EAX',value(result.value?1:0));for(const name of ['ECX','EDX'] as const)set(name,stack.#mint(0,0));stack.#flags(0,0);
          const continuation=stack.#record(stack.#ret()).provenance;if(continuation?.kind!=='source'||continuation.type!=='code'||continuation.address!=='306888e6'||relative('ESP',0)!==argumentPosition)throw new Error('Actual Engine section cdecl return required');
        });
        step('306886ec','306888e6',popEcx);step('306886ec','306888e7',popEcx);
        step('306886ec','306888e8',()=>stack.#logicalFlags(stack.#numeric(register('EAX'),4),0xffffffff,4));
        step('306886ec','306888ea',()=>{if(stack.#numeric(register('EAX'),4)===0)throw new Error('Engine I/O section failure at30688923');});
        step('306886ec','306888ec',()=>{const p=allocationPointer(register('ESI'));const number=NativeHeapObjectViews.prototype.readUnsigned.call(p.fields,p.offset+8),next=(number+1)>>>0;NativeHeapObjectViews.prototype.writeUnsigned.call(p.fields,p.offset+8,next);const before=stack.#record(stack.#load(stack.#bank,36));stack.#arithmeticFlags(number,1,next,4,false);const after=stack.#record(stack.#load(stack.#bank,36));stack.#flags((after.value&~1)|(before.value&1),(after.mask&~1)|(before.mask&1));});
        step('306886ec','306888ef',()=>{});
        step('306886ec','306888fb',()=>{const number=stack.#numeric(register('EBX'),4),next=(number+1)>>>0;set('EBX',value(next));const before=stack.#record(stack.#load(stack.#bank,36));stack.#arithmeticFlags(number,1,next,4,false);const after=stack.#record(stack.#load(stack.#bank,36));stack.#flags((after.value&~1)|(before.value&1),(after.mask&~1)|(before.mask&1));});
        step('306886ec','306888fc',()=>{const number=stack.#numeric(register('EBX'),4);stack.#arithmeticFlags(number,3,number-3,4,true);});
        step('306886ec','306888ff',()=>{const index=stack.#numeric(register('EBX'),4);if(index>3)throw new Error('Actual bounded Engine standard-handle index required');nextStandard=index<3;});
        }
        step('306886ec','30688905',()=>{const count=NativeEngineIoImages.imageForCrt(frame.images,crt,'ioHandleCount');if(!count.known)throw new Error(count.reason);stack.#push(value(count.value.readUnsigned(0)));});
        step('306886ec','3068890b',()=>{
          const endpoints=stack.#platform.standardIoEndpoints;if(!endpoints)throw new Error('Engine SetHandleCount IAT30afc740 at3068890b');
          const endpointProof=NativeRuntimePlatform.canonicalStandardIoEndpointsForPlatform(stack.#platform,endpoints);if(!endpointProof.known)throw new Error(endpointProof.reason);
          const argument=stack.#load(stack.#stack,relative('ESP',0)),scalar=stack.#numeric(argument,4);if(scalar!==32)throw new Error('Actual Engine handle count32 required');
          stack.#call('3068890b','30688911');const top=stack.#calls.at(-1)!,grant=Object.freeze({identity:Object.freeze({})});
          const call={stack,frame,args:Object.freeze({site:'3068890b' as const,kind:'SetHandleCount' as const,crt,scalar}),position:top.position,argument,returnWord:top.returnWord,phase:'pending' as 'pending'|'returned'};
          engineStandardCalls.set(grant,call);const result=endpoints.invoke(grant);if(!result.known)throw new Error(result.reason);
          const returned=NativeRuntimePlatform.canonicalStandardIoNormalReturnForPlatform(stack.#platform,grant);if(!returned.known||returned.value!==result.value)throw new Error(returned.known?'Actual Engine SetHandleCount result required':returned.reason);
          stack.#engineStandardProof(call);if(typeof result.value!=='number'||!Number.isInteger(result.value)||result.value<0||result.value>0xffffffff)throw new Error('Actual SetHandleCount DWORD result required');
          frame.setHandleCountResult=result.value;set('EAX',value(result.value));for(const name of ['ECX','EDX'] as const)set(name,stack.#mint(0,0));stack.#flags(0,0);
          set('ESP',stack.#stackWord(call.position+8));top.returned=true;stack.#currentPc=call.returnWord;call.phase='returned';
        });
        step('306886ec','30688911',()=>set('EAX',xor(register('EAX'),register('EAX'))));
        step('306886ec','30688913',()=>{});
        step('306886ec','30688926',()=>stack.#call('30688926','3068892b'));
        const epilog=(pc:string,body:()=>void)=>step('3067e545',pc,body);
        const pop=(name:NativeX86Register)=>{const position=relative('ESP',0);set(name,stack.#load(stack.#stack,position));set('ESP',stack.#stackWord(position+4));};
        epilog('3067e545',()=>set('ECX',stack.#load(stack.#stack,relative('EBP',-0x10))));
        epilog('3067e548',()=>{stack.#store(stack.#bank,32,register('ECX'));frame.fsRestored=true;});
        epilog('3067e54f',()=>pop('ECX'));
        epilog('3067e550',()=>pop('EDI'));
        epilog('3067e551',()=>pop('EDI'));
        epilog('3067e552',()=>pop('ESI'));
        epilog('3067e553',()=>pop('EBX'));
        epilog('3067e554',()=>set('ESP',register('EBP')));
        epilog('3067e556',()=>pop('EBP'));
        epilog('3067e557',()=>stack.#push(register('ECX')));
        epilog('3067e558',()=>{const next=stack.#record(stack.#ret()).provenance;if(next?.kind!=='source'||next.type!=='code'||next.address!=='3068892b')throw new Error('Actual Engine EH4 epilog return required');});
        step('306886ec','3068892b',()=>{const next=stack.#record(stack.#ret()).provenance;if(next?.kind!=='source'||next.type!=='code'||next.address!=='3067726b'||relative('ESP',0)!==frame.entryEsp||stack.#numeric(register('EAX'),4)!==0)throw new Error('Actual Engine I/O caller return and zero result required');});
        frame.phase='returned';if(!stack.#executing)stack.#phase='returned';return known(undefined);
      }catch(error){frame.boundary??=reason(error);frame.phase='blocked';if(!stack.#executing){stack.#boundary??=frame.boundary;stack.#phase='blocked';}return unknown(frame.boundary);}
      finally{stack.#engineIoExecuting=false;}
    }catch(error){return unknown(reason(error));}
  }
  static returnedEngineIoForBootstrap(stack:NativeX86ThreadStack,bootstrap:NativeCrtBootstrap,crt:NativeModuleCrtOwner,permit:object):NativeValue<number>{
    const reached=NativeCrtBootstrap.canonicalEngineIoCallForCrt(bootstrap,crt,permit);if(!reached.known)return reached;
    try{
      const frame=stack.#engineIoFrame,caller=stack.#calls.findLast(call=>call.site==='30677266');
      if(graphs.get(crt.host.platform as NativeRuntimePlatform)!==stack||!frame||frame.bootstrap!==bootstrap||frame.crt!==crt||frame.permit!==permit||frame.phase!=='returned'||frame.pc!=='3068892b'||!frame.fsRestored||stack.#engineIoExecuting||!caller?.returned||stack.#currentPc!==caller.returnWord)throw new Error('Actual returned Engine I/O frame required');
      stack.#physical(stack.#bank);stack.#physical(stack.#stack);
      if(stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.entryEsp)throw new Error('Actual restored Engine I/O caller stack required');
      const result=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4);if(result!==0)throw new Error('Actual supported Engine I/O zero return required');
      const scope=NativeEngineIoImages.imageForCrt(frame.images,crt,'ioSehScope');if(!scope.known||scope.value!==frame.scope)throw new Error('Actual retained Engine I/O source required');
      return known(result);
    }catch(error){return unknown(reason(error));}
  }
  #engineStandardProof(call:NonNullable<ReturnType<typeof engineStandardCalls.get>>):void{
    this.#engineIoProof(call.frame);const top=this.#calls.at(-1);
    if(call.phase!=='pending'||call.frame.pc!==call.args.site||!top||top.returned||top.site!==call.args.site||top.position!==call.position||top.returnWord!==call.returnWord||
      this.#address(this.#load(this.#bank,this.#reg('ESP')))!==call.position||this.#load(this.#stack,call.position)!==call.returnWord||this.#load(this.#stack,call.position+4)!==call.argument||(call.args.kind!=='GetFileType'?this.#numeric(call.argument,4)!==call.args.scalar:this.#record(call.argument).provenance?.kind!=='platform'||(this.#record(call.argument).provenance as {object?:object}).object!==call.args.object))throw new Error('Actual pending Engine standard-I/O call required');
  }
  #engineStartupProof(call:NonNullable<ReturnType<typeof engineStartupCalls.get>>):void{
    this.#engineIoProof(call.frame);
    const top=this.#calls.at(-1);
    if(call.phase!=='pending'||call.frame.pc!=='30688701'||!top||top.returned||top.site!=='30688701'||top.position!==call.position||top.returnWord!==call.returnWord||
      this.#address(this.#load(this.#bank,this.#reg('ESP')))!==call.position||this.#load(this.#stack,call.position)!==call.returnWord||
      this.#load(this.#stack,call.position+4)!==call.argument||this.#address(call.argument)!==call.offset||
      call.frame.startupInfo?.backing!==this.#stack.backing||call.offset!==call.frame.ebp!-0x64)throw new Error('Actual pending Engine startup argument and return required');
  }
  #engineIoProof(frame:EngineIoFrame):void{
    if(this.#engineIoFrame!==frame||!this.#engineIoExecuting||frame.phase!=='running'||this.#phase!=='running')throw new Error(frame.boundary??'Actual active Engine I/O frame required');
    const call=NativeCrtBootstrap.canonicalEngineIoCallForCrt(frame.bootstrap,frame.crt,frame.permit);if(!call.known)throw new Error(call.reason);
    const selection=NativeRuntimePlatform.threadStackSelectionForPlatform(this.#platform);if(!selection.known||selection.value!==this.#selection)throw new Error('Actual selected Engine logical-thread lifetime required');
    const scope=NativeEngineIoImages.imageForCrt(frame.images,frame.crt,'ioSehScope');if(!scope.known||scope.value!==frame.scope)throw new Error(scope.known?'Actual retained Engine scope required':scope.reason);
    this.#physical(this.#stack);this.#physical(this.#bank);
  }
  engineIoFrameSnapshot(crt:NativeModuleCrtOwner){
    const frame=this.#engineIoFrame;if(!frame||frame.crt!==crt)return null;
    return Object.freeze({module:'Engine' as const,phase:frame.phase,pc:frame.pc,boundary:frame.boundary,operations:frame.operations,entryEsp:frame.entryEsp,ebp:frame.ebp,prologReturned:frame.prologReturned,fsPublished:frame.fsPublished,startupInfo:frame.startupInfo,allocation:frame.allocation,callocReturned:frame.callocReturned,fileType:frame.fileType,section:frame.section,sectionResult:frame.sectionResult,setHandleCountResult:frame.setHandleCountResult,fsRestored:frame.fsRestored,scope:frame.scope,stack:this.#stack,bank:this.#bank});
  }
  readonly #platform: NativeRuntimePlatform;
  readonly #selection: Readonly<NativeX86ThreadStackSelection>;
  readonly #stack: NativeHeapObjectViews;
  // EFLAGS at 44 is owned only with an explicit virtual CPU selection.
  // Arithmetic flags at 36 and the Runtime DF remain synchronized with it.
  readonly #bank = physical(48);
  readonly #xmm = physical(128);
  #processorSimdFrame:{oldFs:NativeX86Word32;oldEbp:NativeX86Word32;oldEbx:NativeX86Word32;oldEsi:NativeX86Word32;oldEdi:NativeX86Word32;scope:NativeX86Word32;returned:boolean}|null=null;
  #memoryMallocFrame:{oldFs:NativeX86Word32;oldEbp:NativeX86Word32;oldEbx:NativeX86Word32;oldEsi:NativeX86Word32;oldEdi:NativeX86Word32;entered:boolean;returned:boolean}|null=null;
  readonly #initializerSehFrames=new Map<string,{scope:NativeX86Word32;oldFs:NativeX86Word32;oldEbp:NativeX86Word32;oldEbx:NativeX86Word32;oldEsi:NativeX86Word32;oldEdi:NativeX86Word32;entered:boolean;returned:boolean;ebp?:number}>();
  readonly #words = new WeakMap<NativeX86Word32, WordRecord>();
  readonly #slots = new Map<NativeHeapObjectViews, Map<number, Slot>>();
  readonly #images = new Map<string, NativeX86Word32>();
  readonly #imageReads = new Map<NativeHeapObjectViews, Map<number, Slot>>();
  readonly #storage = new WeakMap<NativeHeapObjectViews, PhysicalProof>();
  readonly #startupViews = new Map<number, NativeHeapObjectViews>();
  readonly #nativePointers = new WeakMap<object, NativeX86Word32>();
  readonly #objects = new WeakMap<object, NativeX86Word32>();
  readonly #cinitCodePointers = new Map<number, object>();
  readonly #cinitEncodedPointers = new Set<object>();
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
  #aiHelperPropertyIdText: NativeHeapCString | null = null;
  #aiHelperAccessorName: NativeHeapCString | null = null;
  #aiHelperAccessorQueryNode: NativeHeapObjectViews | null = null;
  #aiHelperCloneAllocation: NativeMemoryAllocation | null = null;
  #aiHelperComponentAllocation: NativeMemoryAllocation | null = null;
  #aiHelperModuleOwner: ReturnType<typeof createNativeEngineModuleOwner<NativeHeapObjectViews>> | null = null;
  #aiHelperPropertyIdTextDestroyedSnapshot: ReturnType<NativeHeapCString["snapshot"]> | null = null;
  #aiHelperPropertyIdGuid: NativeGuidText | null = null;
  #aiHelperPropertyIdGuidConstructed: Readonly<{bytes:readonly number[];mask:readonly number[]}> | null = null;
  #aiHelperPropertyIdGuidLifetimeEnded=false;
  #aiHelperPropertyIdGuidPaddingBefore: Readonly<{bytes:readonly number[];mask:readonly number[]}> | null = null;
  #arenaPropertySingleton:NativePropertySingleton|null=null;
  readonly #arenaAllocations=new Map<NativeHeapObjectViews,{owner:NativeMemoryAdmin;allocation:NativeMemoryAllocation}>();
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
  #dllMemoryController:object|null=null;
  #sharedDllFileVersionFrame:Readonly<{pointer:NativeBytePointer;length:number;query:string}>|null=null;
  #sharedDllTranslationFrame:Readonly<{pointer:NativeBytePointer;length:number;query:string}>|null=null;
  #sharedDllOutputRegisters:{entryEsp:number;oldEbp:NativeX86Word32;oldEbx:NativeX86Word32;oldEsi:NativeX86Word32;oldEdi:NativeX86Word32;oldFs:NativeX86Word32}|null=null;
  #sharedDllFormatFrame:{entryEsp:number;ebp:number;stream:NativeHeapObjectViews;output:NativeHeapObjectViews;format:NativeHeapObjectViews;varargs:number}|null=null;
  #sharedDllLanguageFrame:{entryEsp:number;handle:NativeHeapObjectViews;infoFilled?:boolean;buffer?:Readonly<{fields:NativeHeapObjectViews;offset:number}>}|null=null;
  #sharedDllResourceFrame:{entryEsp:number;handle:NativeHeapObjectViews;infoFilled?:boolean;buffer?:Readonly<{fields:NativeHeapObjectViews;offset:number}>}|null=null;
  #sharedDllVersionFrame:{entryEsp:number;filename:NativeHeapObjectViews;source:NativeHeapObjectViews;copyPending:boolean}|null=null;
  #sharedDllInitializerFrame:{entryEsp:number;outputs:readonly NativeHeapObjectViews[];moduleName:NativeHeapObjectViews}|null=null;
  #sharedCrtCallerFrame:{controller:object;entryEsp:number;ebp:number;oldEbp:NativeX86Word32;oldEbx:NativeX86Word32;oldEsi:NativeX86Word32;oldEdi:NativeX86Word32;returned:boolean}|null=null;
  #sharedInitializerFrame:{controller:object;entryEsp:number;operations:number;ownershipReturned:number|null;conversionInstalled:boolean;oldFs:NativeX86Word32;fsRestored:boolean;moduleCalls:number;procedureCalls:number;featureCalls:number;divisionQueryResult:number|null;initializerResult:number|null}|null=null;
  #sharedArgvFrame:{controller:object;ebp:number;multibytePending:boolean;moduleCall:NativeArgvNlsCallGrant|null;moduleReturned:boolean;argumentCount:NativeHeapObjectViews;byteCount:NativeHeapObjectViews;parsePending:boolean;parserStarted?:boolean;parserReturned?:boolean;parserOperations?:number;leadCalls?:number;queryCounts?:Readonly<{count:number;bytes:number}>;allocationPending?:boolean;mallocLowerPending?:boolean;allocationReturned?:boolean;fillPending?:boolean;fillStarted?:boolean;fillReturned?:boolean;fillCounts?:Readonly<{count:number;bytes:number}>;fillOperations?:number;fillLeadCalls?:number;returned?:boolean;result?:number;environmentPending?:boolean}|null=null;
  #setMultibyteFrame:{controller:object;ebp:number;oldFs:NativeX86Word32;pendingInstallation:boolean;returned:boolean;counterCursor:number;counter:{call:object;role:'oldPtd'|'candidatePtd'|'oldGlobal'|'candidateGlobal'}|null;global:boolean;lockPending:boolean;locked:boolean;publication:boolean;unlockPending:boolean;scopeAtReturn?:NativeX86Word32;cookieAtReturn?:NativeX86Word32}|null=null;
  #configurationFrame:{controller:object;ebp:number;info:NativeHeapObjectViews;candidate:NativeX86Word32;codePage:number|null;memsetPending:boolean;pending:{call:NativeArgvNlsCallGrant;bytes:number;info:boolean}|null;returned:boolean}|null=null;
  #caseFrame:{controller:object;ebp:number;originalEbp:number;info:NativeHeapObjectViews;input:NativeHeapObjectViews;types:NativeHeapObjectViews;lower:NativeHeapObjectViews;upper:NativeHeapObjectViews;cpCall:NativeArgvNlsCallGrant|null;deferredBytes:number;tableIndex:number;wrapper:{stage:'classification'|'lower'|'upper';ebp:number;locale:NativeHeapObjectViews;localeReturned:boolean}|null;returned:boolean}|null=null;
  #phase: 'cold' | 'running' | 'returned' | 'blocked' | 'retired' = 'cold';
  #sharedToGameHandoff = false;
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
    try{stack.#physical(stack.#stack);stack.#physical(stack.#bank);stack.#phase='running';
      // Direct CRT helper ABI on this selected logical thread. Module/reserved
      // words remain opaque; this does not establish the preceding DLL frame.
      if(stack.#sharedCrtCallerFrame)throw new Error('One retained SharedBase CRT caller frame required');
      const entryEsp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),oldEbp=stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx=stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi=stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi=stack.#load(stack.#bank,stack.#reg('EDI'));
      stack.#push(oldEdi);stack.#push(stack.#mint(1,0xffffffff));stack.#push(oldEbx);stack.#call('100adc79','100adc7e');stack.#push(oldEbp);const crtEbp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('EBP'),stack.#stackWord(crtEbp));stack.#push(stack.#load(stack.#bank,stack.#reg('ECX')));for(const word of [oldEbx,oldEsi,oldEdi])stack.#push(word);
      stack.#sharedCrtCallerFrame={controller,entryEsp,ebp:crtEbp,oldEbp,oldEbx,oldEsi,oldEdi,returned:false};stack.#trace.push('100ada4c-100ada58.sharedCrtCallerFrame');
      stack.#call('100adb46','100adb4b');stack.#push(stack.#load(stack.#bank,stack.#reg('EBP')));const ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('EBP'),stack.#stackWord(ebp));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(ebp-12));stack.#push(stack.#load(stack.#bank,stack.#reg('EBX')));stack.#store(stack.#bank,stack.#reg('EBX'),stack.#mint(0,0xffffffff));stack.#arithmeticFlags(admitted.value.initialized,0,admitted.value.initialized,4,true);for(const name of ['ESI','EDI'] as const)stack.#push(stack.#load(stack.#bank,stack.#reg(name)));const pending=admitted.value.initialized===0;stack.#sharedArgvFrame={controller,ebp,multibytePending:pending,moduleCall:null,moduleReturned:false,argumentCount:new NativeHeapObjectViews(stack.#stack.backing,ebp-8,4),byteCount:new NativeHeapObjectViews(stack.#stack.backing,ebp-12,4),parsePending:false};if(pending)stack.#call('100c0bba','100c0bbf');stack.#trace.push('100c0ba7.setargvFrame');return known(stack);}catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
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
        text=text.trim();
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
  static runSharedDllEntryPrefix(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      if(graphs.get(stack.#platform)!==stack||!stack.#sharedCrtCallerFrame?.returned||stack.#phase!=='returned'||stack.#boundary)throw new Error('Actual returned CRT helper thread required');
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);const crt=stack.#sharedCrtCallerFrame;
      // Direct DLL entry ABI; the surrounding CRT wrapper has not executed.
      stack.#push(crt.oldEdi);stack.#push(stack.#mint(1,0xffffffff));stack.#push(crt.oldEbx);stack.#call('100adc8c','100adc91');stack.#phase='running';
      let pc='10008a76';
      for(let operation=0;operation<8;operation++){
        const row=sharedDllEntryInstruction(pc);stack.#currentPc=stack.#source('code',pc);stack.#trace.push(pc+'.'+row.instruction);
        if(pc==='10008a76'){if(row.instruction!=='JMP 0x100a1630')throw new Error('Original DLL entry thunk required');pc='100a1630';}
        else if(pc==='100a1630'){if(row.instruction!=='TEST byte ptr [0x102f48f0],0x1')throw new Error('Original DLL guard TEST required');const guard=NativeHeapObjectViews.prototype.readUnsigned.call(proof.value.guard,0,1);stack.#logicalFlags(guard&1,0xff,1);pc='100a1637';}
        else if(pc==='100a1637'){if(row.instruction!=='JNZ 0x100a164a')throw new Error('Original DLL guard branch required');const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x40)!==0x40)throw new Error('Known DLL guard zero flag required');pc=(flags.value&0x40)===0?'100a164a':'100a1639';}
        else if(pc==='100a1639'){if(row.instruction!=='OR dword ptr [0x102f48f0],0x1')throw new Error('Original DLL guard OR required');const value=(NativeHeapObjectViews.prototype.readUnsigned.call(proof.value.guard,0)|1)>>>0;NativeHeapObjectViews.prototype.writeUnsigned.call(proof.value.guard,0,value);stack.#logicalFlags(value,0xffffffff,4);pc='100a1640';}
        else if(pc==='100a1640'){if(row.instruction!=='MOV ECX,0x102f48ec')throw new Error('Original DLL initializer object required');stack.#store(stack.#bank,stack.#reg('ECX'),stack.#mint(0,0,{kind:'shared-local',fields:proof.value.object}));pc='100a1645';}
        else if(pc==='100a1645'){if(row.instruction!=='CALL 0x10006645')throw new Error('Original DLL initializer call required');stack.#call(pc,'100a164a');stack.#currentPc=stack.#source('code','10006645');throw new Error('Original SharedBase DLL initializer pending at 10006645');}
        else if(pc==='100a164a'){if(row.instruction!=='MOV EAX,0x1')throw new Error('Original DLL return scalar required');stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(1,0xffffffff));pc='100a164f';}
        else if(pc==='100a164f'){if(row.instruction!=='RET 0xc')throw new Error('Original DLL argument cleanup required');stack.#ret(12);stack.#phase='returned';stack.#currentPc=stack.#source('code','100adc91');return known(1);}
        else throw new Error('Unowned DLL entry prefix instruction '+pc);
      }
      throw new Error('DLL entry prefix instruction budget exceeded');
    }catch(error){stack.#phase='blocked';stack.#boundary??=reason(error);return unknown(stack.#boundary);}
  }
  static runSharedDllInitializerPrefix(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      if(graphs.get(stack.#platform)!==stack||stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase DLL initializer pending at 10006645'||stack.#sharedDllInitializerFrame)throw new Error('Actual retained pending DLL initializer required');
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);const entryEsp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);
      if(!call||call.site!=='100a1645'||call.returned||call.position!==entryEsp||stack.#load(stack.#stack,entryEsp)!==call.returnWord)throw new Error('Actual initializer source CALL word required');
      const object=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance;if(object?.kind!=='shared-local'||object.fields!==proof.value.object||(object.offset??0)!==0)throw new Error('Actual DLL initializer this pointer required');
      stack.#sharedDllInitializerFrame={entryEsp,outputs:Object.freeze([4,8,12,16].map(offset=>new NativeHeapObjectViews(stack.#stack.backing,entryEsp-offset,4))),moduleName:proof.value.moduleName};stack.#boundary=null;stack.#phase='running';let pc='10006645';
      for(let operation=0;operation<20;operation++){
        const row=sharedDllEntryInstruction(pc),text=row.instruction;stack.#currentPc=stack.#source('code',pc);stack.#trace.push(pc+'.'+text);const next=(parseInt(pc,16)+row.bytes.length/2).toString(16);
        if(pc==='10006645'&&text==='JMP 0x100a1590')pc='100a1590';
        else if(text==='SUB ESP,0x10'){const esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(esp-16));stack.#flags(0,0);pc=next;}
        else if(text==='XOR EAX,EAX'){stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(0,0xffffffff));stack.#logicalFlags(0,0xffffffff,4);pc=next;}
        else if(/^PUSH (ESI|EAX|ECX|EDX)$/.test(text)){stack.#push(stack.#load(stack.#bank,stack.#reg(text.slice(5) as NativeX86Register)));pc=next;}
        else if(/^MOV dword ptr \[ESP \+ 0x[0-9a-f]+\],EAX$/.test(text)){const offset=parseInt(text.match(/0x([0-9a-f]+)/)![1]!,16),esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#stack,esp+offset,stack.#load(stack.#bank,stack.#reg('EAX')));pc=next;}
        else if(/^LEA (EAX|ECX|EDX),\[ESP \+ 0x[0-9a-f]+\]$/.test(text)){const offset=parseInt(text.match(/0x([0-9a-f]+)/)![1]!,16),esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg(text.slice(4,7) as NativeX86Register),stack.#stackWord(esp+offset));pc=next;}
        else if(text==='MOV ESI,ECX'){stack.#store(stack.#bank,stack.#reg('ESI'),stack.#load(stack.#bank,stack.#reg('ECX')));pc=next;}
        else if(pc==='100a15bc'&&text==='PUSH 0x100ebb14'){stack.#push(stack.#mint(0,0,{kind:'shared-local',fields:proof.value.moduleName}));pc=next;}
        else if(pc==='100a15c1'&&text==='CALL 0x10008058'){
          stack.#call(pc,next);const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));
          for(let i=0;i<4;i++)if(stack.#address(stack.#load(stack.#stack,cursor+8+i*4))!==entryEsp-4-i*4)throw new Error('Original version output stack argument required');
          stack.#currentPc=stack.#source('code','10008058');throw new Error('Original SharedBase DLL version query pending at 10008058');
        }else throw new Error('Unowned DLL initializer prefix at '+pc);
      }throw new Error('DLL initializer prefix instruction budget exceeded');
    }catch(error){stack.#phase='blocked';stack.#boundary=reason(error);return unknown(stack.#boundary);}
  }
  static runSharedDllVersionQueryPrefix(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      if(graphs.get(stack.#platform)!==stack||stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase DLL version query pending at 10008058'||!stack.#sharedDllInitializerFrame||stack.#sharedDllVersionFrame||!proof.value.lstrcpy)throw new Error('Actual retained pending version query required');
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);const entryEsp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);
      if(!call||call.site!=='100a15c1'||call.returned||call.position!==entryEsp||stack.#load(stack.#stack,entryEsp)!==call.returnWord)throw new Error('Actual version query source CALL required');
      const literal=stack.#record(stack.#load(stack.#stack,entryEsp+4)).provenance;if(literal?.kind!=='shared-local'||literal.fields!==proof.value.moduleName||(literal.offset??0)!==0)throw new Error('Actual version filename argument required');
      stack.#sharedDllVersionFrame={entryEsp,filename:new NativeHeapObjectViews(stack.#stack.backing,entryEsp-260,260),source:proof.value.moduleName,copyPending:false};stack.#boundary=null;stack.#phase='running';let pc='10008058';
      for(let operation=0;operation<16;operation++){
        const row=sharedDllEntryInstruction(pc),text=row.instruction,next=(parseInt(pc,16)+row.bytes.length/2).toString(16);stack.#currentPc=stack.#source('code',pc);stack.#trace.push(pc+'.'+text);
        if(pc==='10008058'&&text==='JMP 0x1004c580')pc='1004c580';
        else if(pc==='1004c580'&&text==='SUB ESP,0x118'){const esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(esp-280));stack.#flags(0,0);pc=next;}
        else if(/^PUSH (EBX|EBP|ESI|EDI|EAX)$/.test(text)){stack.#push(stack.#load(stack.#bank,stack.#reg(text.slice(5) as NativeX86Register)));pc=next;}
        else if(pc==='1004c588'&&text==='MOV EBP,dword ptr [0x102f96b0]'){if(NativeHeapObjectViews.prototype.pointer.call(proof.value.lstrcpy.slot,0).get()!==proof.value.lstrcpy.procedure)throw new Error('Actual DLL lstrcpyA slot required');stack.#store(stack.#bank,stack.#reg('EBP'),stack.#mint(0,0,{kind:'platform',object:proof.value.lstrcpy.procedure,category:'DllLstrcpyA'}));pc=next;}
        else if(pc==='1004c590'&&text==='MOV EDI,dword ptr [ESP + 0x12c]'){const esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('EDI'),stack.#load(stack.#stack,esp+300));pc=next;}
        else if(pc==='1004c598'&&text==='LEA EAX,[ESP + 0x28]'){const esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('EAX'),stack.#stackWord(esp+40));pc=next;}
        else if(pc==='1004c59d'&&text==='MOV BL,0x1'){const before=stack.#record(stack.#load(stack.#bank,stack.#reg('EBX')));if(before.provenance)throw new Error('Scalar saved EBX lane required before MOV BL');stack.#store(stack.#bank,stack.#reg('EBX'),stack.#mint(((before.value&0xffffff00)|1)>>>0,((before.mask&0xffffff00)|255)>>>0));pc=next;}
        else if(pc==='1004c59f'&&text==='CALL EBP'){
          const procedure=stack.#record(stack.#load(stack.#bank,stack.#reg('EBP'))).provenance;if(procedure?.kind!=='platform'||procedure.object!==proof.value.lstrcpy.procedure||procedure.category!=='DllLstrcpyA')throw new Error('Actual retained filename-copy procedure required');
          stack.#call(pc,next);const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));if(stack.#address(stack.#load(stack.#stack,cursor+4))!==entryEsp-260)throw new Error('Original local filename destination required');
          stack.#sharedDllVersionFrame.copyPending=true;throw new Error('Original SharedBase lstrcpyA pending at 1004c59f');
        }else throw new Error('Unowned DLL version prefix at '+pc);
      }throw new Error('DLL version prefix instruction budget exceeded');
    }catch(error){stack.#phase='blocked';stack.#boundary=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedDllFilenameCopy(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      const frame=stack.#sharedDllVersionFrame;if(graphs.get(stack.#platform)!==stack||stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase lstrcpyA pending at 1004c59f'||!frame?.copyPending||!proof.value.lstrcpy)throw new Error('Actual pending DLL filename copy required');
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);
      if(!call||call.site!=='1004c59f'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord)throw new Error('Actual DLL filename-copy return word required');
      const destination=stack.#load(stack.#stack,cursor+4),source=stack.#record(stack.#load(stack.#stack,cursor+8)).provenance,procedure=stack.#record(stack.#load(stack.#bank,stack.#reg('EBP'))).provenance;
      if(stack.#address(destination)!==frame.entryEsp-260||source?.kind!=='shared-local'||source.fields!==proof.value.moduleName||(source.offset??0)!==0||procedure?.kind!=='platform'||procedure.object!==proof.value.lstrcpy.procedure||procedure.category!=='DllLstrcpyA')throw new Error('Actual filename-copy ABI and import capability required');
      stack.#boundary=null;stack.#phase='running';let terminated=false;
      for(let offset=0;offset<proof.value.moduleName.bytes.length;offset++){const value=NativeHeapObjectViews.prototype.readUnsigned.call(proof.value.moduleName,offset,1);stack.#writeMemory(stack.#offsetWord(destination,offset),stack.#mint(value,255),1);if(value===0){terminated=true;break;}}
      if(!terminated)throw new Error('Owned filename-copy terminator required');
      stack.#store(stack.#bank,stack.#reg('EAX'),destination);for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(8);frame.copyPending=false;stack.#trace.push('1004c59f.lstrcpyANormalReturn');
      const lea=sharedDllEntryInstruction('1004c5a1'),push=sharedDllEntryInstruction('1004c5a5');if(lea.instruction!=='LEA ECX,[ESP + 0x24]'||push.instruction!=='PUSH ECX')throw new Error('Original library filename argument setup required');
      const esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('ECX'),stack.#stackWord(esp+36));stack.#trace.push('1004c5a1.'+lea.instruction);stack.#push(stack.#load(stack.#bank,stack.#reg('ECX')));stack.#trace.push('1004c5a5.'+push.instruction);stack.#currentPc=stack.#source('code','1004c5a6');throw new Error('Original SharedBase LoadLibraryA binding pending at 1004c5a6');
    }catch(error){stack.#phase='blocked';stack.#boundary=reason(error);return unknown(stack.#boundary);}
  }
  static runSharedDllLanguagePrefix(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      const version=stack.#sharedDllVersionFrame,binding=proof.value.resourceSize;if(graphs.get(stack.#platform)!==stack||stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase version language query pending at 10002d42'||!stack.#sharedDllResourceFrame?.infoFilled||!version||!binding||stack.#sharedDllLanguageFrame)throw new Error('Actual pending version language caller required');stack.#physical(stack.#stack);stack.#physical(stack.#bank);
      const entryEsp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);if(!call||call.site!=='1004c525'||call.returned||call.position!==entryEsp||stack.#load(stack.#stack,entryEsp)!==call.returnWord||stack.#address(stack.#load(stack.#stack,entryEsp+4))!==version.entryEsp-260)throw new Error('Actual language return word and filename argument required');
      stack.#sharedDllLanguageFrame={entryEsp,handle:new NativeHeapObjectViews(stack.#stack.backing,entryEsp+4,4)};stack.#boundary=null;stack.#phase='running';let pc='10002d42';
      for(let operation=0;operation<30;operation++){
        const row=sharedDllEntryInstruction(pc),text=row.instruction,next=(parseInt(pc,16)+row.bytes.length/2).toString(16);stack.#currentPc=stack.#source('code',pc);stack.#trace.push(pc+'.'+text);
        if(text==='JMP 0x1004c2c0'){pc='1004c2c0';}
        else if(/^PUSH (ECX|EBP|ESI|EDI|EAX)$/.test(text)){stack.#push(stack.#load(stack.#bank,stack.#reg(text.slice(5) as NativeX86Register)));pc=next;}
        else if(text==='MOV EBP,dword ptr [ESP + 0xc]'){const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg('EBP'),stack.#load(stack.#stack,cursor+12));pc=next;}
        else if(text==='LEA EAX,[ESP + 0x14]'){stack.#store(stack.#bank,stack.#reg('EAX'),stack.#stackWord(stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))+20));pc=next;}
        else if(text==='MOV dword ptr [ESP + 0x14],0x0'){const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));if(cursor+20!==entryEsp-4)throw new Error('Actual language local zero store required');stack.#writeMemory(stack.#stackWord(cursor+20),stack.#mint(0,0xffffffff),4);pc=next;}
        else if(text==='XOR EDI,EDI'){stack.#store(stack.#bank,stack.#reg('EDI'),stack.#mint(0,0xffffffff));stack.#logicalFlags(0,0xffffffff,4);pc=next;}
        else if(pc==='1004c2d8'&&text==='CALL 0x100d55e2'){
          stack.#call(pc,next);const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),filename=stack.#load(stack.#stack,cursor+4),handle=stack.#load(stack.#stack,cursor+8);if(stack.#address(filename)!==version.entryEsp-260||stack.#address(handle)!==entryEsp+4)throw new Error('Actual nested version size stack ABI required');let name='',terminated=false;for(let i=0;i<260;i++){const value=NativeHeapObjectViews.prototype.readUnsigned.call(version.filename,i,1);if(value===0){terminated=true;break;}name+=String.fromCharCode(value);}if(!terminated)throw new Error('Owned language filename terminator required');const thunk=sharedDllEntryInstruction('100d55e2');if(thunk.instruction!=='JMP dword ptr [0x102f98f0]'||binding.slot.pointer(0).get()!==binding.procedure)throw new Error('Actual retained language size import required');stack.#trace.push('100d55e2.'+thunk.instruction);const outcome=binding.outcome(name,'1004c2d8');stack.#writeMemory(handle,stack.#mint(outcome.handle,0xffffffff),4);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(outcome.size,0xffffffff));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(8);pc=next;
        }else if(text==='MOV ESI,EAX'){stack.#store(stack.#bank,stack.#reg('ESI'),stack.#load(stack.#bank,stack.#reg('EAX')));pc=next;}
        else if(text==='TEST ESI,ESI'){stack.#logicalFlags(stack.#numeric(stack.#load(stack.#bank,stack.#reg('ESI')),4),0xffffffff,4);pc=next;}
        else if(text==='JZ 0x1004c401'){const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x40)!==0x40||(flags.value&0x40)!==0)throw new Error('Recorded nonzero language version size required');pc=next;}
        else if(text==='LEA ECX,[ESI + 0x1]'){stack.#store(stack.#bank,stack.#reg('ECX'),stack.#mint(stack.#numeric(stack.#load(stack.#bank,stack.#reg('ESI')),4)+1,0xffffffff));pc=next;}
        else if(pc==='1004c2eb'&&text==='CALL 0x10002aae'){stack.#call(pc,next);throw new Error('Original SharedBase language buffer MemoryAdmin pending at 10002aae');}
        else throw new Error('Unowned language prefix instruction at '+pc);
      }throw new Error('Language prefix instruction budget exceeded');
    }catch(error){stack.#phase='blocked';stack.#boundary=reason(error);return unknown(stack.#boundary);}
  }
  static runSharedDllLanguageFormatPrefix(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      const language=stack.#sharedDllLanguageFrame,images=proof.value.format;
      if(graphs.get(stack.#platform)!==stack||stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase translation query string pending at 1004c30e'||!language?.infoFilled||!language.buffer||!images||stack.#sharedDllFormatFrame)throw new Error('Actual pending language query formatting frame required');
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);stack.#dllMemoryController=controller;
      stack.#sharedLocalPhysical(language.buffer.fields);stack.#sharedLocalPhysical(images.output);stack.#sharedLocalPhysical(images.translation);
      const pending=stack.#calls.at(-1),entry=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));
      if(pending?.site!=='1004c301'||!pending.returned||entry!==language.entryEsp-16)throw new Error('Actual returned language info stack required');
      stack.#boundary=null;stack.#phase='running';let pc='1004c30e';
      for(let operation=0;operation<40;operation++){
        const row=sharedDllEntryInstruction(pc),text=row.instruction,next=(parseInt(pc,16)+row.bytes.length/2).toString(16);
        stack.#currentPc=stack.#source('code',pc);stack.#trace.push(pc+'.'+text);
        const esp=()=>stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),ebp=()=>stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')));
        if(pc==='1004c30e'&&text==='PUSH 0x100e81ec'){stack.#push(stack.#mint(0,0,{kind:'shared-local',fields:images.translation}));pc=next;}
        else if(pc==='1004c313'&&text==='PUSH 0x101ab190'){stack.#push(stack.#mint(0,0,{kind:'shared-local',fields:images.output}));pc=next;}
        else if(pc==='1004c318'&&text==='CALL 0x100aa234'){stack.#call(pc,next);pc='100aa234';}
        else if(/^PUSH (EBP|EBX|ESI|EAX)$/.test(text)){stack.#push(stack.#load(stack.#bank,stack.#reg(text.slice(5) as NativeX86Register)));pc=next;}
        else if(text==='MOV EBP,ESP'){
          const at=esp();stack.#store(stack.#bank,stack.#reg('EBP'),stack.#stackWord(at));
          const output=stack.#record(stack.#load(stack.#stack,at+8)).provenance,format=stack.#record(stack.#load(stack.#stack,at+12)).provenance;
          if(output?.kind!=='shared-local'||output.fields!==images.output||(output.offset??0)!==0||format?.kind!=='shared-local'||format.fields!==images.translation||(format.offset??0)!==0)throw new Error('Actual sprintf output and format arguments required');
          stack.#sharedDllFormatFrame={entryEsp:at+4,ebp:at,stream:new NativeHeapObjectViews(stack.#stack.backing,at-32,32),output:images.output,format:images.translation,varargs:at+16};pc=next;
        }else if(text==='SUB ESP,0x20'){stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(esp()-32));pc=next;}
        else if(text==='XOR EBX,EBX'){stack.#store(stack.#bank,stack.#reg('EBX'),stack.#mint(0,0xffffffff));stack.#logicalFlags(0,0xffffffff,4);pc=next;}
        else if(text==='CMP dword ptr [EBP + 0xc],EBX'||text==='CMP EAX,EBX'){
          const operand=text.startsWith('CMP EAX')?stack.#load(stack.#bank,stack.#reg('EAX')):stack.#load(stack.#stack,ebp()+12),pointer=stack.#record(operand).provenance;
          if(pointer?.kind!=='shared-local'||![images.output,images.translation].includes(pointer.fields)||stack.#numeric(stack.#load(stack.#bank,stack.#reg('EBX')),4)!==0)throw new Error('Actual nonnull sprintf argument comparison required');
          stack.#sharedLocalPhysical(pointer.fields);stack.#flags(0,0x40);pc=next;
        }else if(text==='JNZ 0x100aa25f'||text==='JZ 0x100aa242'){
          const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x40)!==0x40||(flags.value&0x40)!==0)throw new Error('Actual nonnull sprintf branch required');pc=text.startsWith('JNZ')?'100aa25f':next;
        }else if(text==='MOV EAX,dword ptr [EBP + 0x8]'){stack.#store(stack.#bank,stack.#reg('EAX'),stack.#load(stack.#stack,ebp()+8));pc=next;}
        else if(text==='MOV dword ptr [EBP + -0x18],EAX'||text==='MOV dword ptr [EBP + -0x20],EAX'){
          stack.#writeMemory(stack.#stackWord(ebp()-(text.includes('-0x18')?24:32)),stack.#load(stack.#bank,stack.#reg('EAX')),4);pc=next;
        }else if(text==='LEA EAX,[EBP + 0x10]'||text==='LEA EAX,[EBP + -0x20]'){stack.#store(stack.#bank,stack.#reg('EAX'),stack.#stackWord(ebp()+(text.includes('-0x20')?-32:16)));pc=next;}
        else if(text==='PUSH dword ptr [EBP + 0xc]'){stack.#push(stack.#load(stack.#stack,ebp()+12));pc=next;}
        else if(text==='MOV dword ptr [EBP + -0x1c],0x7fffffff'||text==='MOV dword ptr [EBP + -0x14],0x42'){
          const count=text.includes('-0x1c');stack.#writeMemory(stack.#stackWord(ebp()-(count?28:20)),stack.#mint(count?0x7fffffff:0x42,0xffffffff),4);pc=next;
        }else if(pc==='100aa287'&&text==='CALL 0x100b5355'){
          stack.#call(pc,next);const at=esp(),frame=stack.#sharedDllFormatFrame!;
          if(stack.#address(stack.#load(stack.#stack,at+4))!==frame.ebp-32||stack.#record(stack.#load(stack.#stack,at+8)).provenance?.kind!=='shared-local'||stack.#numeric(stack.#load(stack.#stack,at+12),4)!==0||stack.#address(stack.#load(stack.#stack,at+16))!==frame.varargs)throw new Error('Actual formatted output engine stack ABI required');
          stack.#currentPc=stack.#source('code','100b5355');throw new Error('Original SharedBase query output engine pending at 100b5355');
        }else throw new Error('Unowned language formatted-output prefix instruction at '+pc);
      }throw new Error('Language formatter prefix instruction budget exceeded');
    }catch(error){stack.#phase='blocked';stack.#boundary=reason(error);return unknown(stack.#boundary);}
    finally{stack.#dllMemoryController=null;}
  }
  static finishSharedDllTranslationQuery(stack:NativeX86ThreadStack,controller:object,kind:'translation'|'fileVersion'='translation'):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      const file=kind==='fileVersion',site=file?'1004c3a0':'1004c330',boundary=file?'Original SharedBase FileVersion resource query pending at 100d55d6':'Original SharedBase translation resource query pending at 100d55d6';
      const binding=proof.value.resourceQuery,language=stack.#sharedDllLanguageFrame,format=stack.#sharedDllFormatFrame,cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);
      if(graphs.get(stack.#platform)!==stack||stack.#phase!=='blocked'||stack.#boundary!==boundary||!binding||!language?.buffer||!language.infoFilled||!format||(file?stack.#sharedDllFileVersionFrame:stack.#sharedDllTranslationFrame)||call?.site!==site||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord)throw new Error('Actual pending translation resource import frame required');
      stack.#dllMemoryController=controller;const input=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,path=stack.#record(stack.#load(stack.#stack,cursor+8)).provenance,pointerOut=stack.#load(stack.#stack,cursor+12),lengthOut=stack.#load(stack.#stack,cursor+16);
      if(input?.kind!=='shared-local'||input.fields!==language.buffer.fields||(input.offset??0)!==language.buffer.offset||path?.kind!=='shared-local'||path.fields!==format.output||(path.offset??0)!==0||stack.#address(pointerOut)!==language.entryEsp-4||stack.#address(lengthOut)!==language.entryEsp+4)throw new Error('Actual translation query input and stack output pointers required');
      stack.#sharedLocalPhysical(input.fields);stack.#sharedLocalPhysical(path.fields);
      let query='',terminated=false;for(let i=0;i<256;i++){const byte=NativeHeapObjectViews.prototype.readUnsigned.call(path.fields,i,1);if(byte===0){terminated=true;break;}query+=String.fromCharCode(byte);}if(!terminated)throw new Error('Owned terminated translation query required');
      const thunk=sharedDllEntryInstruction('100d55d6');if(thunk.instruction!=='JMP dword ptr [0x102f98f4]'||binding.slot.pointer(0).get()!==binding.procedure)throw new Error('Actual retained VerQueryValueA import required');
      stack.#currentPc=stack.#source('code','100d55d6');stack.#trace.push('100d55d6.'+thunk.instruction);
      const before=file?Uint8Array.from({length:1740},(_,i)=>NativeHeapObjectViews.prototype.readUnsigned.call(input.fields,(input.offset??0)+i,1)):null;
      const result=binding.query({fields:input.fields,offset:input.offset??0},query,site);if(result.result!==1||result.pointer.fields!==input.fields||result.pointer.offset!==(input.offset??0)+(file?1200:864)||result.length!==(file?17:4))throw new Error('Recorded contained translation alias required');
      if(before){const base=stack.#load(stack.#stack,cursor+4);for(let i=0;i<1740;i++){const value=NativeHeapObjectViews.prototype.readUnsigned.call(input.fields,(input.offset??0)+i,1);if(value!==before[i])stack.#writeMemory(stack.#offsetWord(base,i),stack.#mint(value,255),1);}}
      stack.#writeMemory(pointerOut,stack.#mint(0,0,{kind:'shared-local',fields:result.pointer.fields,offset:result.pointer.offset}),4);stack.#writeMemory(lengthOut,stack.#mint(result.length,0xffffffff),4);
      const retained=Object.freeze({pointer:result.pointer,length:result.length,query});if(file)stack.#sharedDllFileVersionFrame=retained;else stack.#sharedDllTranslationFrame=retained;stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(result.result,0xffffffff));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(16);
      stack.#phase='blocked';stack.#boundary=file?'Original SharedBase FileVersion query returned at 1004c3a5':'Original SharedBase translation query returned at 1004c335';stack.#currentPc=stack.#source('code',file?'1004c3a5':'1004c335');return known(result.result);
    }catch(error){stack.#phase='blocked';stack.#boundary=reason(error);return unknown(stack.#boundary);}
    finally{stack.#dllMemoryController=null;}
  }
  static runSharedDllVersionInfo(stack:NativeX86ThreadStack,controller:object,kind:'version'|'language'='version'):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      const language=kind==='language',frame=language?stack.#sharedDllLanguageFrame:stack.#sharedDllResourceFrame,boundary=language?'Original SharedBase language buffer allocation ready at 1004c2f7':'Original SharedBase version buffer initialized allocation pending at 1004c4f6 at 1004c4f6',site=language?'1004c301':'1004c504',version=stack.#sharedDllVersionFrame,binding=proof.value.resourceInfo;if(graphs.get(stack.#platform)!==stack||stack.#phase!=='blocked'||stack.#boundary!==boundary||!frame?.buffer||frame.infoFilled||!version||!binding||!stack.#memoryMallocFrame?.returned)throw new Error('Actual retained version buffer and info import required');
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);const allocation=stack.#record(stack.#load(stack.#bank,stack.#reg('EAX'))).provenance;if(allocation?.kind!=='shared-local'||allocation.fields!==frame.buffer.fields||(allocation.offset??0)!==frame.buffer.offset||!stack.#calls.find(call=>call.site===(language?'1004c2f2':'1004c4f1'))?.returned)throw new Error('Actual original version malloc result required');
      stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';let pc=language?'1004c2f7':'1004c4f6';
      for(let operation=0;operation<20;operation++){
        const row=sharedDllEntryInstruction(pc),text=row.instruction,next=(parseInt(pc,16)+row.bytes.length/2).toString(16);stack.#currentPc=stack.#source('code',pc);stack.#trace.push(pc+'.'+text);
        if(text==='MOV ECX,dword ptr [ESP + 0xc]'||text==='MOV EDX,dword ptr [ESP + 0x14]'){const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,stack.#reg(text.startsWith('MOV ECX')?'ECX':'EDX'),stack.#load(stack.#stack,cursor+(text.startsWith('MOV ECX')?12:20)));pc=next;}
        else if(text==='MOV EBX,EAX'||text==='MOV EDI,EAX'){stack.#store(stack.#bank,stack.#reg(text.startsWith('MOV EBX')?'EBX':'EDI'),stack.#load(stack.#bank,stack.#reg('EAX')));pc=next;}
        else if(/^PUSH (EBX|EDI|ECX|ESI|EBP|EDX)$/.test(text)){stack.#push(stack.#load(stack.#bank,stack.#reg(text.slice(5) as NativeX86Register)));pc=next;}
        else if(text==='MOV dword ptr [ESP + 0x24],EBX'){const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#writeMemory(stack.#stackWord(cursor+36),stack.#load(stack.#bank,stack.#reg('EBX')),4);pc=next;}
        else if(pc===site&&text==='CALL 0x100d55dc'){
          stack.#call(pc,next);const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),filename=stack.#load(stack.#stack,cursor+4),handle=stack.#numeric(stack.#load(stack.#stack,cursor+8),4),size=stack.#numeric(stack.#load(stack.#stack,cursor+12),4),outputWord=stack.#load(stack.#stack,cursor+16),output=stack.#record(outputWord).provenance;
          if(stack.#address(filename)!==version.entryEsp-260||handle!==0||size!==1740||output?.kind!=='shared-local'||output.fields!==frame.buffer.fields||(output.offset??0)!==frame.buffer.offset)throw new Error('Actual version info import stack arguments required');
          const thunk=sharedDllEntryInstruction('100d55dc');if(thunk.instruction!=='JMP dword ptr [0x102f98ec]'||binding.slot.pointer(0).get()!==binding.procedure)throw new Error('Actual version info thunk capability required');stack.#currentPc=stack.#source('code','100d55dc');stack.#trace.push('100d55dc.'+thunk.instruction);let name='',terminated=false;for(let i=0;i<260;i++){const value=NativeHeapObjectViews.prototype.readUnsigned.call(version.filename,i,1);if(value===0){terminated=true;break;}name+=String.fromCharCode(value);}if(!terminated)throw new Error('Owned version info filename terminator required');
          const result=binding.initialize(name,handle,size,frame.buffer,site);if(result!==1)throw new Error('Recorded successful version info result required');for(let i=0;i<size;i++){const value=NativeHeapObjectViews.prototype.readUnsigned.call(frame.buffer.fields,frame.buffer.offset+i,1);stack.#writeMemory(stack.#offsetWord(outputWord,i),stack.#mint(value,255),1);}frame.infoFilled=true;stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(result,0xffffffff));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(16);pc=next;
        }else if(text==='TEST EAX,EAX'){stack.#logicalFlags(stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4),0xffffffff,4);pc=next;}
        else if(text==='JNZ 0x1004c523'){const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x40)!==0x40||(flags.value&0x40)!==0)throw new Error('Actual successful version info branch required');pc='1004c523';}
        else if(language&&text==='JZ 0x1004c401'){const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x40)!==0x40||(flags.value&0x40)!==0)throw new Error('Actual successful nested version info branch required');pc=next;}
        else if(language&&pc==='1004c30e'&&text==='PUSH 0x100e81ec'){throw new Error('Original SharedBase translation query string pending at 1004c30e');}
        else if(pc==='1004c525'&&text==='CALL 0x10002d42'){stack.#call(pc,next);throw new Error('Original SharedBase version language query pending at 10002d42');}
        else throw new Error('Unowned version info instruction at '+pc);
      }throw new Error('Version info instruction budget exceeded');
    }catch(error){stack.#phase='blocked';stack.#boundary=reason(error);return unknown(stack.#boundary);}
    finally{stack.#dllMemoryController=null;}
  }
  static runSharedDllMemoryAdmin(stack:NativeX86ThreadStack,controller:object,kind:'version'|'language'='version'):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      const language=kind==='language',boundary=language?'Original SharedBase language buffer MemoryAdmin pending at 10002aae':'Original SharedBase version buffer MemoryAdmin pending at 10002aae',site=language?'1004c2eb':'1004c4ea',returned=language?'1004c2f0':'1004c4ef',malloc=language?'1004c2f2':'1004c4f1';
      if(graphs.get(stack.#platform)!==stack||stack.#phase!=='blocked'||stack.#boundary!==boundary||!stack.#sharedDllResourceFrame||language&&!stack.#sharedDllLanguageFrame)throw new Error('Actual pending resource MemoryAdmin caller required');stack.#physical(stack.#stack);stack.#physical(stack.#bank);
      const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);if(!call||call.site!==site||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==(language?1741:1740))throw new Error('Actual version buffer size and singleton return word required');
      stack.#boundary=null;stack.#phase='running';let pc='10002aae';
      for(let operation=0;operation<12;operation++){
        const row=pc===returned||pc===malloc?sharedDllEntryInstruction(pc):sharedInitializerInstruction(pc),text=row.instruction.toUpperCase(),next=(parseInt(pc,16)+row.bytes.length/2).toString(16);stack.#currentPc=stack.#source('code',pc);stack.#trace.push(pc+'.dllMemoryAdmin.'+row.instruction);
        if(pc==='10002aae'&&text==='JMP 0X10020BF0'){pc='10020bf0';}
        else if(pc==='10020bf0'&&text==='MOV EAX,0X1'){stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(1,0xffffffff));pc=next;}
        else if(pc==='10020bf5'&&text==='TEST BYTE PTR [0X101427A4],AL'){const guard=NativeHeapObjectViews.prototype.readUnsigned.call(proof.value.memoryAdmin,12,1);stack.#logicalFlags(guard&1,255,1);pc=next;}
        else if(pc==='10020bfb'&&text==='JNZ 0X10020C34'){const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x40)!==0x40)throw new Error('Known MemoryAdmin guard required');if(flags.value&0x40)throw new Error('Original MemoryAdmin cold singleton continuation pending at 10020bfd');pc='10020c34';}
        else if(pc==='10020c34'&&text==='MOV EAX,0X101427A0'){stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(0,0,{kind:'shared-local',fields:proof.value.memoryAdmin,offset:8}));pc=next;}
        else if(pc==='10020c39'&&text==='RET'){const returned=stack.#record(stack.#ret()).provenance;if(returned?.kind!=='source'||returned.address!==(language?'1004c2f0':'1004c4ef'))throw new Error('Actual resource MemoryAdmin caller continuation required');pc=returned.address;}
        else if(pc===returned&&text==='MOV ECX,EAX'){stack.#store(stack.#bank,stack.#reg('ECX'),stack.#load(stack.#bank,stack.#reg('EAX')));pc=next;}
        else if(pc===malloc&&text==='CALL 0X10003CD8'){stack.#call(pc,next);throw new Error(language?'Original SharedBase language buffer Malloc pending at 10003cd8':'Original SharedBase version buffer Malloc pending at 10003cd8');}
        else throw new Error('Unowned version MemoryAdmin instruction at '+pc);
      }throw new Error('Version MemoryAdmin instruction budget exceeded');
    }catch(error){stack.#phase='blocked';stack.#boundary=reason(error);return unknown(stack.#boundary);}
  }
  static finishSharedDllResourceSize(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      const frame=stack.#sharedDllResourceFrame,version=stack.#sharedDllVersionFrame,binding=proof.value.resourceSize;
      if(graphs.get(stack.#platform)!==stack||stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase GetFileVersionInfoSizeA pending at 100d55e2'||!frame||!version||!binding)throw new Error('Actual pending version size frame required');stack.#physical(stack.#stack);stack.#physical(stack.#bank);
      const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);if(!call||call.site!=='1004c4d5'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord)throw new Error('Actual version size return word required');
      const filename=stack.#load(stack.#stack,cursor+4),handle=stack.#load(stack.#stack,cursor+8);if(stack.#address(filename)!==version.entryEsp-260||stack.#address(handle)!==frame.entryEsp-4)throw new Error('Actual version size stack arguments required');
      let name='',terminated=false;for(let i=0;i<260;i++){const value=NativeHeapObjectViews.prototype.readUnsigned.call(version.filename,i,1);if(value===0){terminated=true;break;}name+=String.fromCharCode(value);}if(!terminated)throw new Error('Owned version size filename terminator required');
      const thunk=sharedDllEntryInstruction('100d55e2');if(thunk.instruction!=='JMP dword ptr [0x102f98f0]'||binding.slot.pointer(0).get()!==binding.procedure)throw new Error('Actual version size thunk capability required');stack.#boundary=null;stack.#phase='running';stack.#currentPc=stack.#source('code','100d55e2');stack.#trace.push('100d55e2.'+thunk.instruction);
      const outcome=binding.outcome(name,'1004c4d5');stack.#writeMemory(handle,stack.#mint(outcome.handle,0xffffffff),4);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(outcome.size,0xffffffff));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(8);
      let pc='1004c4da';for(let operation=0;operation<8;operation++){
        const row=sharedDllEntryInstruction(pc),text=row.instruction,next=(parseInt(pc,16)+row.bytes.length/2).toString(16);stack.#currentPc=stack.#source('code',pc);stack.#trace.push(pc+'.'+text);
        if(text==='MOV EDI,EAX'){stack.#store(stack.#bank,stack.#reg('EDI'),stack.#load(stack.#bank,stack.#reg('EAX')));pc=next;}
        else if(text==='TEST EDI,EDI'){stack.#logicalFlags(stack.#numeric(stack.#load(stack.#bank,stack.#reg('EDI')),4),0xffffffff,4);pc=next;}
        else if(text==='JNZ 0x1004c4e8'){const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x40)!==0x40||(flags.value&0x40)!==0)throw new Error('Recorded nonzero version size required');pc='1004c4e8';}
        else if(text==='PUSH EBX'||text==='PUSH EDI'){stack.#push(stack.#load(stack.#bank,stack.#reg(text.slice(5) as NativeX86Register)));pc=next;}
        else if(pc==='1004c4ea'&&text==='CALL 0x10002aae'){stack.#call(pc,next);throw new Error('Original SharedBase version buffer MemoryAdmin pending at 10002aae');}
        else throw new Error('Unowned version size continuation at '+pc);
      }throw new Error('Version size continuation instruction budget exceeded');
    }catch(error){stack.#phase='blocked';stack.#boundary=reason(error);return unknown(stack.#boundary);}
  }
  static runSharedDllResourceFallbackPrefix(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      const frame=stack.#sharedDllVersionFrame,initializer=stack.#sharedDllInitializerFrame;
      if(graphs.get(stack.#platform)!==stack||stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase version resource fallback pending at 1004c62e'||!frame||frame.copyPending||!initializer||stack.#sharedDllResourceFrame||!proof.value.lstrcpy)throw new Error('Actual retained version-resource caller required');
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);
      for(const site of ['1004c5a6','1004c5b8','1004c624'])if(!stack.#calls.find(call=>call.site===site)?.returned)throw new Error('Actual returned module import frames required');
      const query=stack.#calls.find(call=>call.site==='100a15c1');if(!query||query.returned||stack.#load(stack.#stack,query.position)!==query.returnWord)throw new Error('Actual retained version-query return word required');
      stack.#boundary=null;stack.#phase='running';let pc='1004c62e';
      const register=(name:string)=>stack.#reg(name as NativeX86Register);
      for(let operation=0;operation<45;operation++){
        const row=sharedDllEntryInstruction(pc),text=row.instruction,next=(parseInt(pc,16)+row.bytes.length/2).toString(16);stack.#currentPc=stack.#source('code',pc);stack.#trace.push(pc+'.'+text);
        if(/^PUSH (EAX|ECX|EDX|EDI|ESI)$/.test(text)){stack.#push(stack.#load(stack.#bank,register(text.slice(5))));pc=next;}
        else if(/^LEA (EAX|ECX|EDX),\[ESP \+ 0x[0-9a-f]+\]$/.test(text)){const match=text.match(/^LEA (\w+),\[ESP \+ 0x([0-9a-f]+)\]$/)!;stack.#store(stack.#bank,register(match[1]!),stack.#stackWord(stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))+parseInt(match[2]!,16)));pc=next;}
        else if(/^MOV (EAX|ECX|EDX|ESI),dword ptr \[ESP \+ 0x[0-9a-f]+\]$/.test(text)){const match=text.match(/^MOV (\w+),dword ptr \[ESP \+ 0x([0-9a-f]+)\]$/)!;const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#store(stack.#bank,register(match[1]!),stack.#load(stack.#stack,cursor+parseInt(match[2]!,16)));pc=next;}
        else if(pc==='1004c634'&&text==='CALL EBP'){
          const cap=stack.#record(stack.#load(stack.#bank,stack.#reg('EBP'))).provenance;if(cap?.kind!=='platform'||cap.category!=='DllLstrcpyA'||cap.object!==proof.value.lstrcpy.procedure)throw new Error('Actual retained resource filename-copy import required');
          stack.#call(pc,next);const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),destination=stack.#load(stack.#stack,cursor+4),source=stack.#record(stack.#load(stack.#stack,cursor+8)).provenance;
          if(stack.#address(destination)!==frame.entryEsp-260||source?.kind!=='shared-local'||source.fields!==proof.value.moduleName||(source.offset??0)!==0)throw new Error('Actual resource filename-copy ABI required');
          let terminated=false;for(let i=0;i<proof.value.moduleName.bytes.length;i++){const value=NativeHeapObjectViews.prototype.readUnsigned.call(proof.value.moduleName,i,1);stack.#writeMemory(stack.#offsetWord(destination,i),stack.#mint(value,255),1);if(value===0){terminated=true;break;}}if(!terminated)throw new Error('Owned resource filename-copy terminator required');
          stack.#store(stack.#bank,stack.#reg('EAX'),destination);for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(8);pc=next;
        }else if(pc==='1004c65b'&&text==='CALL 0x10002883'){
          stack.#call(pc,next);const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));if(stack.#address(stack.#load(stack.#stack,cursor+4))!==frame.entryEsp-260)throw new Error('Actual fallback filename argument required');
          for(let i=0;i<4;i++){const pointer=stack.#record(stack.#load(stack.#stack,cursor+8+i*4)).provenance;if(pointer?.kind!=='stack'||pointer.offset!==initializer.entryEsp-4-i*4)throw new Error('Actual fallback version-output stack arguments required');}
          stack.#sharedDllResourceFrame={entryEsp:cursor,handle:new NativeHeapObjectViews(stack.#stack.backing,cursor-4,4)};pc='10002883';
        }else if(pc==='10002883'&&text==='JMP 0x1004c4c0'){pc='1004c4c0';}
        else if(pc==='1004c4cd'&&text==='MOV dword ptr [ESP + 0x10],0x0'){const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));if(cursor+16!==stack.#sharedDllResourceFrame!.entryEsp-4)throw new Error('Actual version-resource handle local required');stack.#writeMemory(stack.#stackWord(cursor+16),stack.#mint(0,0xffffffff),4);pc=next;}
        else if(pc==='1004c4d5'&&text==='CALL 0x100d55e2'){stack.#call(pc,next);throw new Error('Original SharedBase GetFileVersionInfoSizeA pending at 100d55e2');}
        else throw new Error('Unowned version-resource frame instruction at '+pc);
      }throw new Error('Version-resource frame instruction budget exceeded');
    }catch(error){stack.#phase='blocked';stack.#boundary=reason(error);return unknown(stack.#boundary);}
  }
  static runSharedDllModuleLookup(stack:NativeX86ThreadStack,controller:object):NativeValue<number>{
    const proof=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      const frame=stack.#sharedDllVersionFrame,hooks=proof.value.modules;if(graphs.get(stack.#platform)!==stack||stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase LoadLibraryA binding pending at 1004c5a6'||!frame||frame.copyPending||!hooks)throw new Error('Actual returned filename-copy and pending module import required');
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);stack.#boundary=null;stack.#phase='running';let pc='1004c5a6';
      const module=(word:NativeX86Word32):object=>{const p=stack.#record(word).provenance;if(p?.kind!=='platform'||p.category!=='DllVersionModule')throw new Error('Actual retained version module handle required');return p.object;};
      const string=(word:NativeX86Word32):string=>{const p=stack.#record(word).provenance;let fields:NativeHeapObjectViews,offset:number;if(p?.kind==='stack'){fields=stack.#stack;offset=p.offset;if(offset!==frame.entryEsp-260)throw new Error('Original library filename stack pointer required');}else if(p?.kind==='shared-local'&&p.fields===hooks.procedureName){fields=p.fields;offset=p.offset??0;}else throw new Error('Actual module import string required');let text='';for(let i=offset;i<fields.bytes.length;i++){const value=NativeHeapObjectViews.prototype.readUnsigned.call(fields,i,1);if(value===0)return text;text+=String.fromCharCode(value);}throw new Error('Owned module import string terminator required');};
      for(let operation=0;operation<30;operation++){
        const row=sharedDllEntryInstruction(pc),text=row.instruction,next=(parseInt(pc,16)+row.bytes.length/2).toString(16);stack.#currentPc=stack.#source('code',pc);stack.#trace.push(pc+'.'+text);
        if(/^CALL dword ptr \[0x(102f9640|102f9648|102f9644)\]$/.test(text)){
          const address=text.match(/0x([0-9a-f]+)/)![1]!,binding=hooks.imports[address];if(!binding||NativeHeapObjectViews.prototype.pointer.call(binding.slot,0).get()!==binding.procedure)throw new Error('Actual module import slot capability required');stack.#call(pc,next);const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));let result:NativeX86Word32,bytes:number;
          if(pc==='1004c5a6'&&address==='102f9640'){const handle=hooks.acquire(string(stack.#load(stack.#stack,cursor+4)));result=stack.#mint(0,0,{kind:'platform',object:handle,category:'DllVersionModule'});bytes=4;}
          else if(pc==='1004c5b8'&&address==='102f9648'){const value=hooks.lookup(module(stack.#load(stack.#stack,cursor+4)),string(stack.#load(stack.#stack,cursor+8)));if(value!==null)throw new Error('Captured absent version export required');result=stack.#mint(0,0xffffffff);bytes=8;}
          else if(pc==='1004c624'&&address==='102f9644'){result=stack.#mint(hooks.release(module(stack.#load(stack.#stack,cursor+4))),0xffffffff);bytes=4;}
          else throw new Error('Original module import call site required');
          stack.#store(stack.#bank,stack.#reg('EAX'),result);for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(bytes);pc=next;
        }else if(text==='MOV ESI,EAX'){stack.#store(stack.#bank,stack.#reg('ESI'),stack.#load(stack.#bank,stack.#reg('EAX')));pc=next;}
        else if(text==='TEST ESI,ESI'){module(stack.#load(stack.#bank,stack.#reg('ESI')));stack.#flags(0,0x40);pc=next;}
        else if(text==='TEST EAX,EAX'){const value=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4);stack.#logicalFlags(value,0xffffffff,4);pc=next;}
        else if(text==='PUSH 0x100e8210'){stack.#push(stack.#mint(0,0,{kind:'shared-local',fields:hooks.procedureName}));pc=next;}
        else if(text==='PUSH ESI'){stack.#push(stack.#load(stack.#bank,stack.#reg('ESI')));pc=next;}
        else if(text==='XOR BL,BL'){const before=stack.#record(stack.#load(stack.#bank,stack.#reg('EBX')));if(before.provenance)throw new Error('Actual scalar version-query BL required');stack.#store(stack.#bank,stack.#reg('EBX'),stack.#mint((before.value&0xffffff00)>>>0,((before.mask&0xffffff00)|255)>>>0));stack.#logicalFlags(0,255,1);pc=next;}
        else if(text==='TEST BL,BL'){const value=stack.#record(stack.#load(stack.#bank,stack.#reg('EBX')));if((value.mask&255)!==255)throw new Error('Known version-query BL required');stack.#logicalFlags(value.value&255,255,1);pc=next;}
        else if(/^J(Z|NZ) 0x[0-9a-f]+$/.test(text)){const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x40)!==0x40)throw new Error('Known module branch zero flag required');const zero=(flags.value&0x40)!==0,taken=text.startsWith('JZ ')?zero:!zero;pc=taken?text.match(/0x([0-9a-f]+)/)![1]!:next;}
        else if(pc==='1004c62e'){throw new Error('Original SharedBase version resource fallback pending at 1004c62e');}
        else throw new Error('Unowned version module instruction at '+pc);
      }throw new Error('Version module instruction budget exceeded');
    }catch(error){stack.#phase='blocked';stack.#boundary=reason(error);return unknown(stack.#boundary);}
  }
  static runSharedInitializers(stack:NativeX86ThreadStack,controller:object,mode:'cinit'|'dll-version-malloc'|'dll-language-malloc'|'dll-language-output'|'dll-language-translation'|'dll-language-translated-output'|'dll-language-version-copy'|'dll-language-free'|'dll-language-return'|'dll-version-token'|'dll-version-integer'|'dll-version-free'|'dll-separator-logging'|'dll-message-create'|'dll-message-holder'|'dll-message-error-get'|'dll-message-error-create'|'dll-message-error-buffer'|'dll-message-error-register'|'dll-message-error-terminate'|'dll-message-spy-get'|'dll-message-spy-create'|'dll-message-spy-terminate'|'dll-message-spie-startup'|'dll-spie-acquire-stream'|'dll-spie-shared-open'|'dll-spie-allocate-descriptor'|'dll-spie-init-descriptor-section'|'dll-spie-create-file'|'dll-spie-fclose'|'dll-spie-register'|'dll-spie-terminate'|'dll-message-terminate'|'dll-message-log'|'dll-error-log-callback'|'dll-error-log-allocation'|'dll-error-log-formatting'|'dll-error-log-insertion'|'dll-spy-log-callback'|'dll-version-log-tls'|'dll-version-log-formatting'='cinit'):NativeValue<number>{
    const proof=NativeSharedCrtOwner.initializerStackArgumentsForPlatform(stack.#platform,controller);if(!proof.known)return proof;
    try{
      const images=proof.value.images;
      let versionFormatCaller:{esp:number;ebp:NativeX86Word32;ebx:NativeX86Word32;esi:NativeX86Word32;edi:NativeX86Word32;fs:NativeX86Word32}|null=null;
      let spyLogCaller:{esp:number;ebp:NativeX86Word32;ebx:NativeX86Word32;esi:NativeX86Word32;edi:NativeX86Word32;fs:NativeX86Word32}|null=null;
      let errorLogAllocation:{size:number;esp:number;ebp:NativeX86Word32;ebx:NativeX86Word32;esi:NativeX86Word32;edi:NativeX86Word32;fs:NativeX86Word32;buffer?:NativeHeapObjectViews}|null=null;
      if(mode==='cinit'){
        NativeX86ThreadStack.#sharedArgvProof(stack,controller);
        if(!stack.#sharedEnvironmentFrame?.initializersPending||stack.#sharedInitializerFrame||stack.#phase!=='running')throw new Error('Actual pending cinit source frame required');
        stack.#sharedInitializerFrame={controller,entryEsp:stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),operations:0,ownershipReturned:null,conversionInstalled:false,oldFs:stack.#load(stack.#bank,32),fsRestored:false,moduleCalls:0,procedureCalls:0,featureCalls:0,divisionQueryResult:null,initializerResult:null};
      }else if(mode==='dll-spie-fclose'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),file=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase SpieAdmin fclose pending at 1004b208'||call?.site!=='1004b208'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||file?.kind!=='shared-local'||file.fields!==images['10141790']||file.offset!==96||file.fields.readUnsigned(108)!==1||file.fields.readUnsigned(112)!==3)throw new Error('Actual original fclose return frame and FILE required');
        stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-spie-create-file'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),parent=stack.#initializerSehFrames.get('100d1938'),target=stack.#record(stack.#load(stack.#bank,stack.#reg('EDI'))).provenance;
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase CreateFileA return pending at 100d1372'||call?.site!=='100d1372'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||!parent?.entered||stack.#address(stack.#load(stack.#bank,32))!==parent.ebp!-16||stack.#load(stack.#stack,parent.ebp!-16)!==parent.oldFs||target?.kind!=='platform'||target.object!==proof.value.imports.spieCreateFileProcedure)throw new Error('Actual original CreateFileA return frame required');
        stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-spie-init-descriptor-section'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),parent=stack.#initializerSehFrames.get('100d0d94'),section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,record=stack.#record(stack.#load(stack.#bank,stack.#reg('ESI'))).provenance;
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase descriptor section initialization pending at 100bbf27'||call?.site!=='100d0e1c'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||!parent?.entered||stack.#address(stack.#load(stack.#bank,32))!==parent.ebp!-16||stack.#load(stack.#stack,parent.ebp!-16)!==parent.oldFs||section?.kind!=='shared-local'||section.fields!==proof.value.imports.descriptorBlock()||record?.kind!=='shared-local'||record.fields!==section.fields||(record.offset??0)%56!==0||section.offset!==(record.offset??0)+12||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==4000)throw new Error('Actual original descriptor section initializer frame required');
        stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-spie-allocate-descriptor'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),parent=stack.#initializerSehFrames.get('100d1938');
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase CRT descriptor allocation pending at 100d0d8d'||call?.site!=='100d1329'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||!parent?.entered||stack.#address(stack.#load(stack.#bank,32))!==parent.ebp!-16||stack.#load(stack.#stack,parent.ebp!-16)!==parent.oldFs)throw new Error('Actual original descriptor allocation frame required');
        stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-spie-shared-open'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),parent=stack.#initializerSehFrames.get('100acbd6');
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase CRT shared file-open pending at 100d1a2d'||call?.site!=='100bfd3a'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||!parent?.entered||stack.#address(stack.#load(stack.#bank,32))!==parent.ebp!-16||stack.#load(stack.#stack,parent.ebp!-16)!==parent.oldFs)throw new Error('Actual original shared file-open frame required');
        stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-spie-acquire-stream'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase CRT stream acquisition pending at 100bfd6f'||call?.site!=='100acc23'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||!stack.#initializerSehFrames.get('100acbd6')?.entered||stack.#address(stack.#load(stack.#bank,32))!==stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')))-16||stack.#load(stack.#stack,stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')))-16)!==stack.#initializerSehFrames.get('100acbd6')!.oldFs)throw new Error('Actual original stream acquisition frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-spie-startup'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase SpieAdmin getter pending at 10001334'||call?.site!=='1004979e'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord)throw new Error('Actual original SpieAdmin getter frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-spie-terminate'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase SpieAdmin termination registration pending at 1004afc7'||call?.site!=='1004afc7'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==0x100e2830)throw new Error('Actual original shutdown registration frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-terminate'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase MessageAdmin termination registration pending at 100497a8'||call?.site!=='100497a8'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==0x100e27d0)throw new Error('Actual original shutdown registration frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-spy-terminate'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase SpyAdmin termination registration pending at 100a72d0'||call?.site!=='1004b4b9'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==0x100e2890)throw new Error('Actual original SpyAdmin termination frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-spy-create'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance;if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase SpyAdmin construction pending at 100089e5'||call?.site!=='1004b4af'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||receiver?.kind!=='shared-local'||receiver.fields!==images['101ab11c']||(receiver.offset??0)!==0)throw new Error('Actual original SpyAdmin constructor frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-spy-get'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase SpyAdmin getter pending at 10008b11'||call?.site!=='10049799'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord)throw new Error('Actual original SpyAdmin getter frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-error-terminate'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase ErrorAdmin termination registration pending at 100a72d0'||call?.site!=='100219ad'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==0x100e2770)throw new Error('Actual original ErrorAdmin termination registration frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-version-log-formatting'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),output=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase DLL version formatting pending at 10049871'||call?.site!=='10049871'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||output?.kind!=='shared-local'||(output.offset??0)!==0x108||output.fields.bytes.length!==0x6d4||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==0x100eba68)throw new Error('Actual original version formatter return frame, TLS output and format required');
        const tls=proof.value.imports.versionLogTls(),retained=stack.#record(stack.#load(stack.#bank,stack.#reg('ESI'))).provenance;
        if(output.fields!==tls.block||retained?.kind!=='shared-local'||retained.fields!==tls.block||(retained.offset??0)!==0x108)throw new Error('Actual same-thread version formatter TLS buffer required');
        stack.#dllMemoryController=controller;stack.#sharedLocalPhysical(output.fields);
        versionFormatCaller={esp:cursor,ebp:stack.#load(stack.#bank,stack.#reg('EBP')),ebx:stack.#load(stack.#bank,stack.#reg('EBX')),esi:stack.#load(stack.#bank,stack.#reg('ESI')),edi:stack.#load(stack.#bank,stack.#reg('EDI')),fs:stack.#load(stack.#bank,32)};
        stack.#sharedDllFormatFrame={entryEsp:cursor-20,ebp:cursor-24,stream:new NativeHeapObjectViews(stack.#stack.backing,cursor-56,32),output:output.fields,format:images['100eba68']!,varargs:stack.#address(stack.#load(stack.#stack,cursor+12))};stack.#sharedDllOutputRegisters=null;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-version-log-tls'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase DLL version log pending at 100a15ed'||call?.site!=='100a15ed'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord)throw new Error('Actual original version logger return frame required');
        stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-spy-log-callback'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),context=stack.#record(stack.#load(stack.#stack,cursor+16)).provenance;
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase SpyAdmin log callback pending at 100494db'||call?.site!=='100494db'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#bank,stack.#reg('ECX')),4)!==0x10008c06||context?.kind!=='shared-local'||context.fields!==images['101ab11c']||(context.offset??0)!==0)throw new Error('Actual original SpyAdmin callback return frame and context required');
        spyLogCaller={esp:cursor,ebp:stack.#load(stack.#bank,stack.#reg('EBP')),ebx:stack.#load(stack.#bank,stack.#reg('EBX')),esi:stack.#load(stack.#bank,stack.#reg('ESI')),edi:stack.#load(stack.#bank,stack.#reg('EDI')),fs:stack.#load(stack.#bank,32)};
        stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-error-log-insertion'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),output=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance;
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase ErrorAdmin log insertion pending at 10022680'||call?.site!=='10022680'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||output?.kind!=='shared-local'||output.fields!==stack.#sharedDllFormatFrame?.output||(output.offset??0)!==0||receiver?.kind!=='shared-local'||receiver.fields!==images['10142a58']||(receiver.offset??0)!==0)throw new Error('Actual original ErrorAdmin insertion return frame, receiver and buffer required');
        stack.#dllMemoryController=controller;stack.#sharedLocalPhysical(output.fields);stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-error-log-formatting'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),output=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,buffer=stack.#record(stack.#load(stack.#bank,stack.#reg('ESI'))).provenance;
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase ErrorAdmin log formatting pending at 10022632'||call?.site!=='10022632'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||output?.kind!=='shared-local'||buffer?.kind!=='shared-local'||output.fields!==buffer.fields||(output.offset??0)!==0||(buffer.offset??0)!==0||!images['100e7104']||!(()=>{const word=stack.#load(stack.#stack,cursor+8),format=stack.#record(word).provenance;return format?format.kind==='shared-local'&&format.fields===images['100e7104']&&(format.offset??0)===0:stack.#numeric(word,4)===0x100e7104;})())throw new Error('Actual original ErrorAdmin sprintf return frame and owned buffer required');
        stack.#dllMemoryController=controller;stack.#sharedLocalPhysical(output.fields);stack.#sharedDllFormatFrame={entryEsp:cursor,ebp:cursor-4,stream:new NativeHeapObjectViews(stack.#stack.backing,cursor-36,32),output:output.fields,format:images['100e7104'],varargs:cursor+12};stack.#sharedDllOutputRegisters=null;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-error-log-allocation'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),callback=stack.#calls.findLast(row=>row.site==='100494db');
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase ErrorAdmin log allocation pending at 10022613'||call?.site!=='10022613'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||!callback||callback.returned||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4))throw new Error('Actual original ErrorAdmin malloc return frame and request required');
        errorLogAllocation={size:stack.#numeric(stack.#load(stack.#stack,cursor+4),4),esp:cursor,ebp:stack.#load(stack.#bank,stack.#reg('EBP')),ebx:stack.#load(stack.#bank,stack.#reg('EBX')),esi:stack.#load(stack.#bank,stack.#reg('ESI')),edi:stack.#load(stack.#bank,stack.#reg('EDI')),fs:stack.#load(stack.#bank,32)};
        stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-error-log-callback'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),context=stack.#record(stack.#load(stack.#stack,cursor+16)).provenance;
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase ErrorAdmin log callback pending at 100494db'||call?.site!=='100494db'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#bank,stack.#reg('ECX')),4)!==0x10002df6||context?.kind!=='shared-local'||context.fields!==images['10142a58']||(context.offset??0)!==0)throw new Error('Actual original ErrorAdmin callback return frame and context required');
        stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-log'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance;
        if(stack.#phase!=='blocked'||!['Original SharedBase MessageAdmin initialization log pending at 1004980f','Original SharedBase version MessageAdmin log pending at 10049894'].includes(stack.#boundary??'')||call?.site!==(stack.#boundary==='Original SharedBase version MessageAdmin log pending at 10049894'?'10049894':'1004980f')||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||receiver?.kind!=='shared-local'||receiver.fields!==images['10197d6c']||(receiver.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==2||stack.#numeric(stack.#load(stack.#stack,cursor+12),4)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+20),4)!==472)throw new Error('Actual original logger submission frame required');
        if(call.site==='10049894'){
          const message=stack.#record(stack.#load(stack.#stack,cursor+8)).provenance,retained=stack.#record(stack.#load(stack.#bank,stack.#reg('ESI'))).provenance;
          if(message?.kind!=='shared-local'||retained?.kind!=='shared-local'||message.fields!==retained.fields||(message.offset??0)!==0x108||(retained.offset??0)!==0x108||message.fields.bytes.length!==0x6d4)throw new Error('Actual original version log TLS message required');
        }
        stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-spie-register'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance,context=stack.#record(stack.#load(stack.#stack,cursor+12)).provenance;if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase SpieAdmin callback registration pending at 1004b226'||call?.site!=='1004b226'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==0x10005722||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==1||receiver?.kind!=='shared-local'||receiver.fields!==images['10197d6c']||(receiver.offset??0)!==0||context?.kind!=='shared-local'||context.fields!==images['10197dc0']||(context.offset??0)!==0)throw new Error('Actual original SpieAdmin callback registration frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-error-register'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance,context=stack.#record(stack.#load(stack.#stack,cursor+12)).provenance;if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase ErrorAdmin callback registration pending at 10007cac'||call?.site!=='10022814'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==0x10002df6||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==1||receiver?.kind!=='shared-local'||receiver.fields!==images['10197d6c']||(receiver.offset??0)!==0||context?.kind!=='shared-local'||context.fields!==images['10142a58']||(context.offset??0)!==0)throw new Error('Actual original ErrorAdmin callback registration frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-error-buffer'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance;if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase ErrorAdmin buffer allocation pending at 10004133'||call?.site!=='100227a8'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==0x30d4||receiver?.kind!=='shared-local'||receiver.fields!==images['10142798']||receiver.offset!==8||!stack.#memoryMallocFrame?.returned)throw new Error('Actual original ErrorAdmin buffer Malloc frame required');stack.#dllMemoryController=controller;stack.#memoryMallocFrame={oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false};stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-error-create'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance;if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase ErrorAdmin construction pending at 10001db1'||call?.site!=='100219a3'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||receiver?.kind!=='shared-local'||receiver.fields!==images['10142a58']||(receiver.offset??0)!==0)throw new Error('Actual pending original ErrorAdmin constructor frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-error-get'){
        const current=stack.#currentPc?stack.#record(stack.#currentPc).provenance:null;if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase MessageAdmin ErrorAdmin initialization pending at 10006c1c'||current?.kind!=='source'||current.address!=='10006c1c')throw new Error('Actual pending original ErrorAdmin tail-call required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-holder'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase MessageAdmin holder allocation pending at 100010e1'||call?.site!=='10049612'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==12||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==0xe3)throw new Error('Actual original MessageAdmin holder allocation frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-message-create'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase MessageAdmin critical-section initialization pending at 10049775'||call?.site!=='10049775'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||section?.kind!=='shared-local'||section.fields!==images['10197d6c']||section.offset!==4)throw new Error('Actual pending MessageAdmin section import required');stack.#dllMemoryController=controller;proof.value.imports.initializeSection(section.fields,4);for(const name of ['EAX','ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(4);stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-separator-logging'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);
        if(stack.#phase!=='blocked'||!['Original SharedBase DLL separator logging pending at 1000840e','Original SharedBase final separator log pending at 100a15fc'].includes(stack.#boundary??'')||call?.site!==(stack.#boundary==='Original SharedBase final separator log pending at 100a15fc'?'100a15fc':'100a15cd')||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==1)throw new Error('Actual pending original DLL separator frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-version-integer'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase first version integer conversion pending at 100a7942'||call?.site!=='1004c43c'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord)throw new Error('Actual pending original version atoi frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-version-token'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase version tokenizer pending at 100acd00'||call?.site!=='1004c42a'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord)throw new Error('Actual pending original version strtok frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-language-return'){
        const language=stack.#sharedDllLanguageFrame,call=stack.#calls.findLast(row=>row.site==='1004c3f0');
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase language cleanup returned at 1004c3f5'||!language||call?.site!=='1004c3f0'||!call.returned||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==call.position+8)throw new Error('Actual returned language cleanup frame required');stack.#dllMemoryController=controller;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-language-free'||mode==='dll-version-free'){
        const outer=mode==='dll-version-free',language=outer?stack.#sharedDllResourceFrame:stack.#sharedDllLanguageFrame,call=stack.#calls.at(-1),cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));
        if(stack.#phase!=='blocked'||stack.#boundary!==(outer?'Original SharedBase outer version buffer Free pending at 10002112':'Original SharedBase language buffer Free pending at 10002112')||!language?.buffer||call?.site!==(outer?'1004c56c':'1004c3f0')||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord)throw new Error('Actual original pending MemoryAdmin Free frame required');
        const argument=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance;
        if(argument?.kind!=='shared-local'||argument.fields!==language.buffer.fields||(argument.offset??0)!==language.buffer.offset||receiver?.kind!=='shared-local'||receiver.fields!==images['10142798']||receiver.offset!==8)throw new Error('Actual live language buffer and Free receiver required');
        stack.#dllMemoryController=controller;stack.#sharedLocalPhysical(language.buffer.fields);stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-language-version-copy'){
        const language=stack.#sharedDllLanguageFrame,call=stack.#calls.at(-1);
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase FileVersion query returned at 1004c3a5'||!language?.buffer||!stack.#sharedDllFileVersionFrame||call?.site!=='1004c3a0'||!call.returned||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==language.entryEsp-16)throw new Error('Actual returned FileVersion query copy frame required');
        stack.#dllMemoryController=controller;stack.#sharedLocalPhysical(language.buffer.fields);stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-language-translated-output'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),output=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,format=stack.#record(stack.#load(stack.#stack,cursor+8)).provenance;
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase translated query formatter pending at 100aa234'||call?.site!=='1004c36a'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||!stack.#sharedDllTranslationFrame||output?.kind!=='shared-local'||output.fields!==images['101ab190']||(output.offset??0)!==0||format?.kind!=='shared-local'||format.fields!==images['100e81b4']||(format.offset??0)!==0)throw new Error('Actual pending translated sprintf frame required');
        stack.#dllMemoryController=controller;stack.#sharedLocalPhysical(stack.#sharedDllTranslationFrame.pointer.fields);stack.#sharedLocalPhysical(format.fields);stack.#sharedDllFormatFrame={entryEsp:cursor,ebp:cursor-4,stream:new NativeHeapObjectViews(stack.#stack.backing,cursor-36,32),output:output.fields,format:format.fields,varargs:cursor+12};stack.#sharedDllOutputRegisters=null;stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-language-translation'){
        const language=stack.#sharedDllLanguageFrame,call=stack.#calls.at(-1);
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase translation query returned at 1004c335'||!language?.buffer||!stack.#sharedDllTranslationFrame||call?.site!=='1004c330'||!call.returned||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==language.entryEsp-16)throw new Error('Actual returned translation query continuation required');
        stack.#dllMemoryController=controller;stack.#sharedLocalPhysical(language.buffer.fields);stack.#boundary=null;stack.#phase='running';
      }else if(mode==='dll-language-output'){
        const fmt=stack.#sharedDllFormatFrame,cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1);
        if(stack.#phase!=='blocked'||stack.#boundary!=='Original SharedBase query output engine pending at 100b5355'||!fmt||!stack.#sharedInitializerFrame||!call||call.site!=='100aa287'||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#address(stack.#load(stack.#stack,cursor+4))!==fmt.ebp-32)throw new Error('Actual pending query output engine frame required');
        const format=stack.#record(stack.#load(stack.#stack,cursor+8)).provenance;
        if(format?.kind!=='shared-local'||format.fields!==fmt.format||(format.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+12),4)!==0||stack.#address(stack.#load(stack.#stack,cursor+16))!==fmt.varargs||stack.#numeric(stack.#load(stack.#stack,fmt.ebp-28),4)!==0x7fffffff||stack.#numeric(stack.#load(stack.#stack,fmt.ebp-20),4)!==0x42)throw new Error('Actual initial output engine stream arguments required');
        for(const offset of [-32,-24]){const target=stack.#record(stack.#load(stack.#stack,fmt.ebp+offset)).provenance;if(target?.kind!=='shared-local'||target.fields!==fmt.output||(target.offset??0)!==0)throw new Error('Actual retained output stream base pointers required');}
        stack.#sharedDllOutputRegisters={entryEsp:cursor,oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),oldFs:stack.#load(stack.#bank,32)};
        stack.#dllMemoryController=controller;stack.#sharedLocalPhysical(stack.#sharedDllLanguageFrame!.buffer!.fields);stack.#boundary=null;stack.#phase='running';
      }else{
        const language=mode==='dll-language-malloc' ,allocation=language?stack.#sharedDllLanguageFrame:stack.#sharedDllResourceFrame,boundary=language?'Original SharedBase language buffer Malloc pending at 10003cd8':'Original SharedBase version buffer Malloc pending at 10003cd8';
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),call=stack.#calls.at(-1),receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance;
        if(stack.#phase!=='blocked'||stack.#boundary!==boundary||!stack.#sharedInitializerFrame||!stack.#sharedCrtCallerFrame?.returned||!allocation||allocation.buffer||!call||call.site!==(language?'1004c2f2':'1004c4f1')||call.returned||call.position!==cursor||stack.#load(stack.#stack,cursor)!==call.returnWord||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==(language?1741:1740)||receiver?.kind!=='shared-local'||receiver.fields!==images['10142798']||receiver.offset!==8||stack.#memoryMallocFrame&&!stack.#memoryMallocFrame.returned)throw new Error('Actual version buffer MemoryAdmin malloc frame required');
        stack.#dllMemoryController=controller;stack.#memoryMallocFrame={oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false};stack.#boundary=null;stack.#phase='running';
      }
      const frame=stack.#sharedInitializerFrame!;
      type Operand={kind:'static-tls-vector'}|{kind:'register';slot:number;byte?:boolean;word?:boolean;high?:boolean}|{kind:'immediate';value:number}|{kind:'memory';expression:string;width:Width};
      const number=(text:string)=>{if(!/^-?0x[0-9a-f]+$/.test(text))throw new Error('Unowned initializer literal '+text);return (text.startsWith('-')?-parseInt(text.slice(3),16):parseInt(text.slice(2),16))>>>0;};
      const pointer=(fields:NativeHeapObjectViews)=>stack.#mint(0,0,{kind:'shared-local',fields});
      const image=(value:number):NativeX86Word32|null=>{if((mode==='dll-language-output'||(mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting'))||mode==='dll-language-translation')for(const base of ['100e81b4','100ede50','100b5cc9','100f2e38','101ab190','100e81ec']){const fields=images[base],offset=value-parseInt(base,16);if(fields&&offset>=0&&offset<fields.bytes.length)return stack.#offsetWord(pointer(fields),offset);}if(value===0x100e5358&&images['100e5000'])return stack.#offsetWord(pointer(images['100e5000']),856);if(value===0x10141a10&&images['10141790'])return stack.#offsetWord(pointer(images['10141790']),640);if(value===0x100e5678&&images['100e545c'])return stack.#offsetWord(pointer(images['100e545c']),540);for(const [base,fields] of Object.entries(images)){const offset=value-parseInt(base,16);if(offset>=0&&offset<fields.bytes.length)return stack.#offsetWord(pointer(fields),offset);}return null;};
      const operand=(text:string):Operand=>{
        text=text.trim();
        if(registers.includes(text as NativeX86Register))return {kind:'register',slot:stack.#reg(text as NativeX86Register)};
        if(['AX','BX','CX','DX'].includes(text))return {kind:'register',slot:stack.#reg(({AX:'EAX',BX:'EBX',CX:'ECX',DX:'EDX'} as const)[text as 'AX'|'BX'|'CX'|'DX']),word:true};
        if(['AH','BH','CH','DH'].includes(text))return {kind:'register',slot:stack.#reg(({AH:'EAX',BH:'EBX',CH:'ECX',DH:'EDX'} as const)[text as 'AH'|'BH'|'CH'|'DH']),byte:true,high:true};
        if(['AL','BL','CL','DL'].includes(text))return {kind:'register',slot:stack.#reg(({AL:'EAX',BL:'EBX',CL:'ECX',DL:'EDX'} as const)[text as 'AL'|'BL'|'CL'|'DL']),byte:true};
        if(mode==='dll-version-log-tls'&&text==='dword ptr FS:[0x2c]')return {kind:'static-tls-vector'};
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
          if(stack.#record(word).provenance){
            if(scale!==1)throw new Error('Actual initializer pointer scale required');
            if(base){const left=stack.#liveWord(base).provenance,right=stack.#liveWord(word).provenance,difference=left?.kind==='difference'?left:right?.kind==='difference'?right:null,other=left?.kind==='difference'?word:base;
              if(mode!=='dll-language-version-copy'||!difference)throw new Error('Actual initializer pointer base required');const pair=relativePair(other,difference.right);if(!pair)throw new Error('Actual copy source pointer cancellation required');base=stack.#offsetWord(difference.left,pair[0]-pair[1]);
            }else base=word;
          }else offset+=(stack.#numeric(word,4)|0)*scale;
        }
        return base?stack.#offsetWord(base,offset):stack.#mint(offset,0xffffffff);
      };
      const strlenState:{current:{word:NativeX86Word32;sum?:NativeX86Word32;inverse?:NativeX86Word32;mixed?:NativeX86Word32}|null}={current:null};
      const constructedNodes=new Map<NativeHeapObjectViews,Map<number,NativeHeapObjectViews>>();
      const copyPhysicalWords=new Map<NativeX86Word32,{fields:NativeHeapObjectViews;offset:number;value:number;mask:number}>();
      const read=(item:Operand):NativeX86Word32=>{
        if(item.kind==='static-tls-vector'){
          if(stack.#record(stack.#currentPc!).provenance?.kind!=='source'||(stack.#record(stack.#currentPc!).provenance as {address:string}).address!=='10049850')throw new Error('Original version logger FS read required');
          const tls=proof.value.imports.versionLogTls();stack.#sharedLocalPhysical(tls.vector);return pointer(tls.vector);
        }
        if(mode==='dll-version-log-tls'&&item.kind==='memory'){
          const current=stack.#record(stack.#currentPc!).provenance;
          if(current?.kind==='source'&&current.address==='10049857'){
            if(item.expression!=='0x102f6480'||item.width!==4)throw new Error('Original version logger TLS index read required');
            return stack.#mint(proof.value.imports.versionLogTls().index.readUnsigned(0),0xffffffff);
          }
          if(current?.kind==='source'&&current.address==='1004985c'){
            const tls=proof.value.imports.versionLogTls(),vector=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance,index=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4);
            if(item.expression!=='ECX + EAX*0x4'||item.width!==4||vector?.kind!=='shared-local'||vector.fields!==tls.vector||(vector.offset??0)!==0||index!==tls.index.readUnsigned(0)||tls.vector.pointer<NativeHeapObjectViews>(index*4).get()!==tls.block)throw new Error('Actual original TLS vector/index/block required');
            stack.#sharedLocalPhysical(tls.block);return pointer(tls.block);
          }
        }

        if(item.kind==='register'){const word=stack.#load(stack.#bank,item.slot);if(!item.byte&&!item.word)return word;const value=stack.#record(word),mask=item.word?65535:255,shift=item.high?8:0;return stack.#mint((value.value>>>shift)&mask,(value.mask>>>shift)&mask);}
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
        for(const [slot,procedure,category] of [['102f966c',proof.value.imports.memorySectionInitializeProcedure,'InitializerMemorySectionInitialize'],['102f9604',proof.value.imports.memorySectionEnterProcedure,'InitializerMemorySectionEnter'],['102f9608',proof.value.imports.memorySectionLeaveProcedure,'InitializerMemorySectionLeave']] as const){if(item.width===4&&memory.fields===images[slot]&&memory.offset===0){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==procedure)throw new Error('Actual MemoryAdmin critical-section import slot required');return stack.#mint(0,0,{kind:'platform',object:procedure,category});}}
        if(item.width===4&&memory.fields===images['102f9674']&&memory.offset===0){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==proof.value.imports.crtHeapFreeProcedure)throw new Error('Actual CRT HeapFree import slot required');return stack.#mint(0,0,{kind:'platform',object:proof.value.imports.crtHeapFreeProcedure,category:'InitializerCrtHeapFree'});}
        if(item.width===4&&memory.fields===images['102f9684']&&memory.offset===0){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==proof.value.imports.crtHeapAllocProcedure)throw new Error('Actual pool HeapAlloc import slot required');return stack.#mint(0,0,{kind:'platform',object:proof.value.imports.crtHeapAllocProcedure,category:'InitializerPoolHeapAlloc'});}
        if(item.width===4&&memory.fields===images['102f9680']&&memory.offset===0){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==proof.value.imports.poolVirtualAllocProcedure)throw new Error('Actual pool VirtualAlloc import slot required');return stack.#mint(0,0,{kind:'platform',object:proof.value.imports.poolVirtualAllocProcedure,category:'InitializerPoolVirtualAlloc'});}
        if(mode==='dll-spie-init-descriptor-section'&&item.width===4&&memory.fields===images['102f6ac0']&&memory.offset===0){const value=proof.value.imports.sectionCachePointer();return value?stack.#mint(0,0,{kind:'platform',object:value,category:'InitializerSectionCache'}):stack.#mint(0,0xffffffff);}
        if(['dll-spie-init-descriptor-section','dll-spie-create-file'].includes(mode)&&item.width===4&&memory.fields===images['102f9660']&&memory.offset===0){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==proof.value.imports.spieCreateFileProcedure)throw new Error('Actual CreateFileA import slot identity required');return stack.#mint(0,0,{kind:'platform',object:proof.value.imports.spieCreateFileProcedure,category:'InitializerCreateFileA'});}
        if(mode==='dll-spie-create-file'&&item.width===4&&memory.offset===0){for(const [address,procedure,category] of [['102f9780',proof.value.imports.spieGetLastErrorProcedure,'InitializerGetLastError'],['102f977c',proof.value.imports.spieSetLastErrorProcedure,'InitializerSetLastError'],['102f96bc',proof.value.imports.spieGetFileTypeProcedure,'InitializerGetFileType']] as const)if(memory.fields===images[address]){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==procedure)throw new Error('Actual original CRT platform import slot required');return stack.#mint(0,0,{kind:'platform',object:procedure,category});}}
        if(mode==='dll-spie-fclose'&&item.width===4&&memory.fields===images['102f95e8']&&memory.offset===0){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==proof.value.imports.spieCloseHandleProcedure)throw new Error('Actual CloseHandle import slot required');return stack.#mint(0,0,{kind:'platform',object:proof.value.imports.spieCloseHandleProcedure,category:'InitializerCloseHandle'});}
        if(item.width===4&&memory.fields===images['102f98b4']&&memory.offset===0){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==proof.value.imports.spyFindWindowProcedure)throw new Error('Actual SpyAdmin FindWindowA slot required');return stack.#mint(0,0,{kind:'platform',object:proof.value.imports.spyFindWindowProcedure,category:'SpyFindWindowA'});}
        if(item.width===4&&memory.fields===images['102f95f4']&&memory.offset===0){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==proof.value.imports.initializeSectionProcedure)throw new Error('Actual initializer InitializeCriticalSection import slot required');return stack.#mint(0,0,{kind:'platform',object:proof.value.imports.initializeSectionProcedure,category:'InitializerInitializeSection'});}
        if(item.width===4&&memory.fields===images['102f9678']&&memory.offset===0){if(NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get()!==proof.value.imports.heapSizeProcedure)throw new Error('Actual initializer HeapSize import slot required');return stack.#mint(0,0,{kind:'platform',object:proof.value.imports.heapSizeProcedure,category:'InitializerHeapSize'});}
        if(item.width===4&&memory.fields===images['102f6ac8']&&memory.offset===0){const heap=NativeHeapObjectViews.prototype.pointer.call(memory.fields,0).get();if(!heap)throw new Error('Actual SharedBase HeapSize heap required');return stack.#mint(0,0,{kind:'heap',heap:heap as NativeWin32HeapCapability});}
        const current=stack.#currentPc?stack.#record(stack.#currentPc).provenance:null;
        if(item.width===4&&current?.kind==='source'&&(mode==='dll-spie-fclose'&&['100d0d7a','100d0ce7','100d0d42','100bf62f','100bf68e','100bf720','100bf736','100d0c94','100d0c02','100d0c37'].includes(current.address)||current.address==='100bef8c'||(mode==='dll-spie-allocate-descriptor'||mode==='dll-spie-init-descriptor-section'||mode==='dll-spie-create-file')&&['100d0dcd','100d0ddf','100d0e78','100d13c2','100d19e6','100d0d7a','100d0b82','100d0bb6','100d1465','100d1485','100d1600','100d1622','100d1657'].includes(current.address))&&memory.fields===images['102f70c0']&&memory.offset===0)return pointer(proof.value.imports.descriptorBlock());
        if(mode==='dll-version-log-formatting'&&item.width===4&&current?.kind==='source'&&current.address==='100a7eea'&&memory.fields===stack.#stack&&memory.offset===stack.#sharedDllFormatFrame!.entryEsp+8){if(stack.#numeric(stack.#load(memory.fields,memory.offset),4)!==0x100eba68)throw new Error('Actual original version format argument required');return pointer(images['100eba68']!);}
        if(mode==='dll-error-log-formatting'&&item.width===4&&current?.kind==='source'&&['100aa23d','100aa272'].includes(current.address)&&memory.fields===stack.#stack&&memory.offset===stack.#sharedDllFormatFrame!.entryEsp+8){const word=stack.#load(memory.fields,memory.offset),format=stack.#record(word).provenance;if(format){if(format.kind!=='shared-local'||format.fields!==images['100e7104']||(format.offset??0)!==0)throw new Error('Actual original ErrorAdmin format argument required');stack.#sharedLocalPhysical(format.fields);return word;}if(stack.#numeric(word,4)!==0x100e7104)throw new Error('Actual original ErrorAdmin format argument required');return pointer(images['100e7104']!);}
        if(mode==='dll-error-log-callback'&&item.width===4&&current?.kind==='source'&&current.address==='100225a9'){const call=stack.#calls.findLast(row=>row.site==='100494db'),word=stack.#load(memory.fields,memory.offset),record=stack.#record(word);if(!call||call.returned||memory.fields!==stack.#stack||memory.offset!==call.position+8)throw new Error('Actual original callback message slot required');if(record.provenance?.kind==='shared-local'){stack.#sharedLocalPhysical(record.provenance.fields);return word;}if(record.mask!==0xffffffff||record.value!==0x100ebab8||!images['100ebab8'])throw new Error('Actual original separator message argument required');return pointer(images['100ebab8']);}
        if(item.width===4&&current?.kind==='source'&&current.address==='100bef93'){
          const handle=proof.value.imports.descriptorHandle(memory.fields,memory.offset);return typeof handle==='number'?stack.#mint(handle,0xffffffff):stack.#mint(0,0,{kind:'platform',object:handle,category:'handle'});
        }
        if(item.width===4&&memory.fields===images['101414b8']&&[8,40,80,88,112,152].includes(memory.offset)){const fields=proof.value.imports.crtSection(memory.offset/8);return fields?pointer(fields):stack.#mint(0,0xffffffff);}
        if((mode==='dll-language-output'||(mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting')||mode==='dll-version-integer')&&item.width===4){
          const cached=stack.#load(memory.fields,memory.offset);if(stack.#record(cached).provenance)return cached;
          try{const alias=NativeHeapObjectViews.prototype.pointer.call(memory.fields,memory.offset).get();if(alias instanceof NativeHeapObjectViews){stack.#sharedLocalPhysical(alias);return pointer(alias);}}catch(error){const message=reason(error);if(message!=='Non-NULL numerical native pointer has no owned browser capability'&&!message.startsWith('Native field contains unowned backing bits'))throw error;}
          if(memory.fields===images['10141470']||memory.fields===images['10141468']||memory.fields===images['10141288']||memory.fields===images['10141390']&&memory.offset===0xc8){const raw=NativeHeapObjectViews.prototype.readUnsigned.call(memory.fields,memory.offset),mapped=image(raw);if(!mapped)throw new Error('Retained output locale source pointer required');return mapped;}
        }
        if(item.width===4){const word=stack.#load(memory.fields,memory.offset),record=stack.#record(word);copyPhysicalWords.set(word,{...memory,value:record.value,mask:record.mask});if(current?.kind==='source'&&(current.address==='100b2ab0'||mode==='dll-error-log-insertion'&&current.address==='100aa934'))strlenState.current={word};return word;}
        const word=NativeHeapObjectViews.prototype.maskedWord.call(memory.fields,memory.offset,item.width);return stack.#mint(word.value,word.knownMask);
      };
      const write=(item:Operand,word:NativeX86Word32)=>{
        if(item.kind==='immediate'||item.kind==='static-tls-vector')throw new Error('Unowned initializer immediate destination');
        if(item.kind==='register'){if(item.byte||item.word){const shift=item.high?8:0,laneMask=(item.word?65535:255)<<shift,old=stack.#record(stack.#load(stack.#bank,item.slot)),value=stack.#record(word);stack.#store(stack.#bank,item.slot,stack.#mint((old.value&~laneMask)|((value.value<<shift)&laneMask),(old.mask&~laneMask)|((value.mask<<shift)&laneMask)));}else stack.#store(stack.#bank,item.slot,word);}else {const target=address(item.expression);stack.#writeMemory(target,word,item.width);
          const current=(stack.#record(stack.#currentPc!).provenance as {address:string}).address;
          if(current==='100c224f'||current==='100c1dac'){
            const memory=stack.#memory(target,4),table=images[current==='100c224f'?'100f29bc':'100f299c']!,source=stack.#record(word).provenance;
            if(item.width!==4||source?.kind!=='shared-local'||source.fields!==table||(source.offset??0)!==0)throw new Error('Actual original node constructor vtable required');
            let nodes=constructedNodes.get(memory.fields);if(!nodes){nodes=new Map();constructedNodes.set(memory.fields,nodes);}nodes.set(memory.offset,table);
          }
          if(item.width===4){const memory=stack.#memory(target,4),physical=NativeHeapObjectViews.prototype.maskedWord.call(memory.fields,memory.offset);copyPhysicalWords.set(word,{...memory,value:physical.value,mask:physical.knownMask});}}
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
        const a=stack.#record(left).provenance,b=stack.#record(right).provenance;if(a?.kind==='stack'&&b?.kind==='stack')return [a.offset,b.offset];return a?.kind==='shared-local'&&b?.kind==='shared-local'&&a.fields.backing===b.fields.backing?[a.fields.bytes.byteOffset+(a.offset??0),b.fields.bytes.byteOffset+(b.offset??0)]:null;
      };
      const pointerFlags=(a:number,b:number)=>{const result=(a-b)>>>0;if(a===b)stack.#arithmeticFlags(0,0,0,4,true);else stack.#flags((a<b?1:0)|(stack.#parity(result&255)?4:0)|(result&0x80000000?0x80:0),0xc5);};
      const object=(word:NativeX86Word32):object=>{const value=stack.#record(word).provenance;if(value?.kind!=='platform')throw new Error('Actual initializer module/procedure capability required');return value.object;};
      const string=(word:NativeX86Word32):string=>{let text='';for(let offset=0;;offset++){const memory=stack.#memory(stack.#offsetWord(word,offset),1),byte=NativeHeapObjectViews.prototype.readUnsigned.call(memory.fields,memory.offset,1);if(byte===0)return text;text+=String.fromCharCode(byte);}};
      let tokenSaved=mode==='dll-version-token'?{esp:stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),ebp:stack.#load(stack.#bank,stack.#reg('EBP')),ebx:stack.#load(stack.#bank,stack.#reg('EBX')),esi:stack.#load(stack.#bank,stack.#reg('ESI')),edi:stack.#load(stack.#bank,stack.#reg('EDI'))}:null;
      const freeSaved=(mode==='dll-language-free'||mode==='dll-version-free')?{esp:stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),ebp:stack.#load(stack.#bank,stack.#reg('EBP')),ebx:stack.#load(stack.#bank,stack.#reg('EBX')),esi:stack.#load(stack.#bank,stack.#reg('ESI')),edi:stack.#load(stack.#bank,stack.#reg('EDI')),fs:stack.#load(stack.#bank,32)}:null;
      let bitfieldUpdate:{fields:NativeHeapObjectViews;offset:number;original:NativeX86Word32;selected?:NativeX86Word32;xor?:NativeX86Word32;masked?:NativeX86Word32}|null=null;
      const copyUpdates=[['100c1ca2','100c1ca4','100c1ca7',15,false],['100c1caf','100c1cb1','100c1cb4',16,false],['100c1cbc','100c1cbe','100c1cc1',32,false],['100c1cc9','100c1ccb','100c1cce',64,false],['100c1cd6','100c1cd8','100c1cde',128,false],['100c1ce6','100c1ce8','100c1cee',2048,false],['100c1b79','100c1b7d','100c1b80',15,false],['100c1b89','100c1b8b','100c1b8e',16,false],['100c1b96','100c1b98','100c1b9b',32,false],['100c1ba3','100c1ba5','100c1ba8',64,false],['100c1bb0','100c1bb2','100c1bb8',128,false],['100c1bc3','100c1bc6','100c1bcc',256,true],['100c1bd5','100c1bd7','100c1bdd',512,false],['100c1be5','100c1be7','100c1bed',1024,false],['100c1bf5','100c1bf7','100c1bfd',2048,false]] as const;
      let copyUpdate:{spec:typeof copyUpdates[number];fields:NativeHeapObjectViews;offset:number;original:NativeX86Word32;selected:NativeX86Word32;xor?:NativeX86Word32;masked?:NativeX86Word32}|null=null;
      let pc=mode==='dll-version-log-formatting'?'100a7f27':mode==='dll-version-log-tls'?'1000871f':mode==='dll-spy-log-callback'?'10008c06':mode==='dll-error-log-insertion'?'1000102d':mode==='dll-error-log-formatting'?'100aa234':mode==='dll-error-log-allocation'?'100aaaf6':mode==='dll-error-log-callback'?'10002df6':mode==='dll-message-log'?'10005560':['dll-spie-terminate','dll-message-terminate'].includes(mode)?'100a72d0':mode==='dll-spie-register'?'10007cac':mode==='dll-spie-fclose'?'100ac841':mode==='dll-spie-create-file'?'100d1374':mode==='dll-spie-init-descriptor-section'?'100bbf27':mode==='dll-spie-allocate-descriptor'?'100d0d8d':mode==='dll-spie-shared-open'?'100d1a2d':mode==='dll-spie-acquire-stream'?'100bfd6f':mode==='dll-message-spie-startup'?'10001334':mode==='dll-message-spy-terminate'?'100a72d0':mode==='dll-message-spy-create'?'100089e5':mode==='dll-message-spy-get'?'10008b11':mode==='dll-message-error-terminate'?'100a72d0':mode==='dll-message-error-register'?'10007cac':mode==='dll-message-error-buffer'?'10004133':mode==='dll-message-error-create'?'10001db1':mode==='dll-message-error-get'?'10049632':mode==='dll-message-holder'?'100010e1':mode==='dll-message-create'?'1004977b':mode==='dll-separator-logging'?'1000840e':mode==='dll-version-integer'?'100a7942':mode==='dll-version-token'?'100acd00':mode==='dll-language-return'?'1004c3f5':(mode==='dll-language-free'||mode==='dll-version-free')?'10002112':mode==='dll-language-version-copy'?'1004c3a5':mode==='dll-language-translated-output'?'100aa234':mode==='cinit'?'100aa632':mode==='dll-language-output'?'100b5355':mode==='dll-language-translation'?'1004c335':'10003cd8';
      if(mode==='dll-spie-create-file'){
        const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),filename=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,security=stack.#memory(stack.#load(stack.#stack,cursor+16),4),ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('EBP')));
        if(filename?.kind!=='shared-local'||filename.fields!==images['100e8088']||(filename.offset??0)!==0||security.fields!==stack.#stack||security.offset!==ebp-0x34)throw new Error('Actual original filename and SECURITY_ATTRIBUTES pointers required');
        const result=proof.value.imports.createFile({fields:filename.fields,offset:filename.offset??0},{access:stack.#numeric(stack.#load(stack.#stack,cursor+8),4),share:stack.#numeric(stack.#load(stack.#stack,cursor+12),4),security:{length:stack.#numeric(stack.#load(stack.#stack,security.offset),4),descriptor:stack.#numeric(stack.#load(stack.#stack,security.offset+4),4),inherit:stack.#numeric(stack.#load(stack.#stack,security.offset+8),4)},disposition:stack.#numeric(stack.#load(stack.#stack,cursor+20),4),attributes:stack.#numeric(stack.#load(stack.#stack,cursor+24),4),template:stack.#numeric(stack.#load(stack.#stack,cursor+28),4)});
        stack.#store(stack.#bank,stack.#reg('EAX'),typeof result==='number'?stack.#mint(result,0xffffffff):stack.#mint(0,0,{kind:'platform',object:result,category:'InitializerFileHandle'}));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(28);
      }
      let outputOperations=0;while(true){
        if((mode==='dll-language-output'||(mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting'))&&++outputOperations>100000)throw new Error('Original output engine instruction budget exceeded');
        const row=(mode==='dll-language-output'||(mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting'))||mode==='dll-language-translation'||mode==='dll-language-version-copy'||mode==='dll-language-free'||mode==='dll-language-return'||mode==='dll-version-token'||mode==='dll-version-integer'||mode==='dll-version-free'||mode==='dll-separator-logging'||mode==='dll-message-create'||mode==='dll-message-holder'||mode==='dll-message-error-get'||mode==='dll-message-error-create'||mode==='dll-message-error-buffer'||mode==='dll-message-error-register'||mode==='dll-message-error-terminate'||mode==='dll-message-spy-get'||mode==='dll-message-spy-create'||mode==='dll-message-spy-terminate'||mode==='dll-message-spie-startup'||mode==='dll-spie-acquire-stream'||mode==='dll-spie-shared-open'||mode==='dll-spie-allocate-descriptor'||mode==='dll-spie-init-descriptor-section'||mode==='dll-spie-create-file'||mode==='dll-spie-fclose'||mode==='dll-spie-register'||mode==='dll-spie-terminate'||mode==='dll-message-terminate'||mode==='dll-message-log'||mode==='dll-error-log-callback'||mode==='dll-error-log-allocation'||mode==='dll-error-log-insertion'||mode==='dll-spy-log-callback'||mode==='dll-version-log-tls'?(()=>{try{return sharedDllEntryInstruction(pc);}catch{return sharedInitializerInstruction(pc);}})():sharedInitializerInstruction(pc),[opcode,...rest]=row.instruction.replace(/^\w+/,opcode=>opcode.toUpperCase()).replace(/\b(?:eax|ebx|ecx|edx|esi|edi|ebp|esp)\b/g,register=>register.toUpperCase()).split(' '),text=rest.join(' ');
        frame.operations++;stack.#trace.push(pc+'.sharedInitializer.'+opcode);stack.#currentPc=stack.#source('code',pc);
        if(mode==='dll-message-holder'&&pc==='10049632'){stack.#currentPc=stack.#source('code','10006c1c');throw new Error('Original SharedBase MessageAdmin ErrorAdmin initialization pending');}
        if(pc==='100a7a14'){
          const destination=stack.#load(stack.#bank,stack.#reg('EDI')),input=stack.#load(stack.#bank,stack.#reg('ESI'));
          if(!relativePair(destination,input)){
            const dst=stack.#record(destination).provenance,src=stack.#record(input).provenance,bytes=stack.#numeric(stack.#load(stack.#bank,stack.#reg('ECX')),4),end=relativePair(stack.#load(stack.#bank,stack.#reg('EAX')),input);
            if(dst?.kind!=='shared-local'||src?.kind!=='shared-local'||!end||end[0]-end[1]!==bytes)throw new Error('Original memcpy source-end relation required');
            proof.value.imports.proveDisjointInitializerCopy({fields:dst.fields,offset:dst.offset??0},{fields:src.fields,offset:src.offset??0},bytes);
            // Both possible address orders of disjoint spans reach 100a7a20.
            // The skipped comparisons have no stores; its CMP overwrites flags.
            // Preserve uncertainty instead of inventing a numerical pointer order.
            stack.#flags(0,0);stack.#trace.push('100a7a14-100a7a20.disjointMemcpyControlJoin');pc='100a7a20';continue;
          }
        }
        if((mode==='dll-language-free'||mode==='dll-version-free')&&pc==='1003cb76'){
          const ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('EBP'))),scope=stack.#record(stack.#load(stack.#stack,ebp-8)).provenance;
          if(!freeSaved||scope?.kind!=='shared-local'||scope.fields!==images['100f82e8']||(scope.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,ebp-4),4)!==0xffffffff||stack.#numeric(stack.#load(stack.#stack,ebp-12),4)!==0x100a6f80||stack.#address(stack.#load(stack.#bank,32))!==ebp-16||stack.#load(stack.#stack,ebp-16)!==freeSaved.fs)throw new Error('Actual original MemoryAdmin Free SEH frame required');
        }
        if(pc==='1003d436'||pc==='1003d8bd'){const malloc=stack.#memoryMallocFrame,ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('EBP'))),scope=stack.#record(stack.#load(stack.#stack,ebp-8)).provenance;if(!malloc||malloc.entered||scope?.kind!=='shared-local'||scope.fields!==images[pc==='1003d8bd'?'100f8338':'100f8318']||(scope.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,ebp-4),4)!==0xffffffff||stack.#numeric(stack.#load(stack.#stack,ebp-12),4)!==0x100a6f80||stack.#address(stack.#load(stack.#bank,32))!==ebp-16||stack.#load(stack.#stack,ebp-16)!==malloc.oldFs)throw new Error('Actual original MemoryAdmin Malloc SEH frame required');malloc.entered=true;}
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
        if(opcode==='XORPS'){
          if(text!=='XMM0,XMM0'||stack.#selection.cpu?.sse2Execution!=='normal')throw new Error('Explicit normal SIMD execution required for original Root XORPS');stack.#physical(stack.#xmm);for(let offset=0;offset<16;offset+=4)stack.#store(stack.#xmm,offset,stack.#mint(0,0xffffffff));pc=(parseInt(pc,16)+row.bytes.length/2).toString(16).padStart(8,'0');continue;
        }
        if(opcode==='MOVSS'){
          const match=/^dword ptr \[(.+)\],XMM0$/.exec(text);if(!match||stack.#selection.cpu?.sse2Execution!=='normal')throw new Error('Original Root scalar XMM store and normal SIMD execution required');stack.#physical(stack.#xmm);stack.#writeMemory(address(match[1]!),stack.#load(stack.#xmm,0),4);pc=(parseInt(pc,16)+row.bytes.length/2).toString(16).padStart(8,'0');continue;
        }
        if(opcode==='FNCLEX'){
          // Intel FNCLEX clears B, ES, SF and exception bits 0..5; other
          // status bits retain their values and knowledge. It does not wait.
          const status=stack.#record(stack.#load(stack.#bank,40));
          stack.#store(stack.#bank,40,stack.#mint(status.value&~0x80ff,status.mask|0x80ff));
          pc=(parseInt(pc,16)+row.bytes.length/2).toString(16).padStart(8,'0');continue;
        }
        if(opcode==='FLD')throw new Error('Unowned SharedBase initializer opcode '+opcode);
        const args=text&&!['STOSD.REP','SCASD.REPE','MOVSD.REP','MOVSW'].includes(opcode!)?text.split(',').map(operand):[],next=(parseInt(pc,16)+row.bytes.length/2).toString(16).padStart(8,'0');
        if(opcode==='NOP'){if(row.bytes!=='90')throw new Error('Original single-byte NOP required');}
        else if(opcode==='MOV'){const destination=args[0]!,source=args[1]!,byteDestination=destination.kind==='register'&&destination.byte,byteSource=source.kind==='register'&&source.byte,word=read(source.kind==='memory'&&byteDestination?{...source,width:1}:source);if(pc==='100c1f40'){if(text!=='ECX,dword ptr [ESI + 0x4]'||source.kind!=='memory')throw new Error('Original replicator bitfield read required');const memory=stack.#memory(address(source.expression),4);bitfieldUpdate={...memory,original:word};}write(destination.kind==='memory'&&byteSource?{...destination,width:1}:destination,word);}
        else if(opcode==='MOVZX'){const source=args[1]!,width=source.kind==='memory'?source.width:source.kind==='register'&&source.byte?1:source.kind==='register'&&source.word?2:4;write(args[0]!,stack.#mint(stack.#numeric(read(source),width),0xffffffff));}
        else if(opcode==='MOVSX'){const source=args[1]!,width=source.kind==='memory'?source.width:source.kind==='register'&&source.byte?1:4;if(width!==1&&width!==2)throw new Error('Original signed narrow source required');const value=stack.#numeric(read(source),width),shift=32-width*8;write(args[0]!,stack.#mint((value<<shift)>>shift,0xffffffff));}
        else if(opcode==='LEA'){const source=args[1]!;if(source.kind!=='memory')throw new Error('Actual initializer LEA required');write(args[0]!,address(source.expression));}
        else if(opcode==='PUSH')stack.#push(read(args[0]!));
        else if(opcode==='POP'){if(pc==='100adc1e'&&(!stack.#sharedCrtCallerFrame||stack.#sharedCrtCallerFrame.controller!==controller||stack.#sharedCrtCallerFrame.returned))throw new Error('Actual preceding SharedBase CRT caller frame required before saved-register restoration');pop(args[0]!);}
        else if(opcode==='PUSHAD'){const esp=stack.#load(stack.#bank,stack.#reg('ESP'));for(const name of ['EAX','ECX','EDX','EBX','ESP','EBP','ESI','EDI'] as const)stack.#push(name==='ESP'?esp:stack.#load(stack.#bank,stack.#reg(name)));}
        else if(opcode==='POPAD'){for(const name of ['EDI','ESI','EBP','ESP','EBX','EDX','ECX','EAX'] as const){if(name==='ESP'){const esp=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));stack.#load(stack.#stack,esp);stack.#store(stack.#bank,stack.#reg('ESP'),stack.#stackWord(esp+4));}else pop({kind:'register',slot:stack.#reg(name)});}}
        else if(opcode==='CLD'){const df=NativeRuntimePlatform.writeNativeDirectionFlag(stack.#platform,0);if(!df.known)throw new Error(df.reason);const flags=stack.#record(stack.#load(stack.#bank,44));stack.#store(stack.#bank,44,stack.#mint(flags.value&~0x400,flags.mask|0x400));}
        else if(opcode==='SCASD.REPE'){
          if(text!=='ES:EDI')throw new Error('Original initializer REPE SCASD form required');let count=stack.#numeric(stack.#load(stack.#bank,stack.#reg('ECX')),4);
          while(count){const direction=NativeRuntimePlatform.readNativeDirectionFlag(stack.#platform);if(!direction.known)throw new Error(direction.reason);const destination=stack.#load(stack.#bank,stack.#reg('EDI')),memory=stack.#memory(destination,4),left=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4),right=stack.#numeric(stack.#load(memory.fields,memory.offset),4);stack.#arithmeticFlags(left,right,(left-right)>>>0,4,true);stack.#store(stack.#bank,stack.#reg('EDI'),stack.#offsetWord(destination,direction.value?-4:4));stack.#store(stack.#bank,stack.#reg('ECX'),stack.#mint(--count,0xffffffff));if(left!==right)break;}
        }
        else if(opcode==='BSF'){const value=stack.#numeric(read(args[1]!),4);if(value){write(args[0]!,stack.#mint(31-Math.clz32((value&-value)>>>0),0xffffffff));stack.#flags(0,0x40);}else{write(args[0]!,stack.#mint(0,0));stack.#flags(0x40,0x40);}}
        else if(opcode==='BTR.LOCK'||opcode==='BTS.LOCK'){const destination=args[0]!;if(destination.kind!=='memory')throw new Error('Original bitmap memory BTR required');const bit=stack.#numeric(read(args[1]!),4)|0,pointer=stack.#offsetWord(address(destination.expression),Math.floor(bit/32)*4),memory=stack.#memory(pointer,4),old=stack.#numeric(stack.#load(memory.fields,memory.offset),4),index=bit&31;stack.#writeMemory(pointer,stack.#mint(opcode==='BTS.LOCK'?old|(1<<index):old&~(1<<index),0xffffffff),4);stack.#flags((old>>>index)&1,1);}
        else if(opcode==='LEAVE'){stack.#store(stack.#bank,stack.#reg('ESP'),stack.#load(stack.#bank,stack.#reg('EBP')));pop({kind:'register',slot:stack.#reg('EBP')});}
        else if(opcode==='XCHG.LOCK'){const left=read(args[0]!),right=read(args[1]!);write(args[0]!,right);write(args[1]!,left);}
        else if(opcode==='ADD'||opcode==='SUB'){
          const left=read(args[0]!),right=read(args[1]!),a=stack.#record(left),b=stack.#record(right),width:Width=args[0]!.kind==='memory'?args[0]!.width:args[0]!.kind==='register'&&args[0]!.byte?1:args[0]!.kind==='register'&&args[0]!.word?2:4;
          if(pc==='100b2ab7'||mode==='dll-error-log-insertion'&&pc==='100aa936'){
            if(opcode!=='ADD'||text!=='EDX,EAX'||!strlenState.current||right!==strlenState.current.word||a.provenance||b.provenance||stack.#numeric(left,4)!==0x7efefeff)throw new Error('Actual original strlen addition relation required');const sum=stack.#maskedAdd(a,b,4);strlenState.current.sum=sum;write(args[0]!,sum);
          }else if(opcode==='SUB'&&left===right){write(args[0]!,stack.#mint(0,0xffffffff));stack.#arithmeticFlags(0,0,0,4,true);
          }else if(opcode==='SUB'&&a.provenance?.kind==='xor'&&a.provenance.left===right&&stack.#record(a.provenance.right).mask===0xffffffff&&stack.#record(a.provenance.right).value===0x200000&&(b.mask&0x200000)){
            const result=b.value&0x200000?0xffe00000:0x200000;write(args[0]!,stack.#mint(result,0xffffffff));
            // The original words differ only at ID. Low-byte parity/AF are
            // known; sign/carry follow that bit. Both operands have the
            // same sign, so signed subtraction cannot overflow.
            stack.#flags((b.value&0x200000?0x81:0)|4,0x8d5);
          }else if(mode==='dll-language-version-copy'&&pc==='1004c3bc'&&opcode==='SUB'){
            const frame=stack.#sharedDllFileVersionFrame!;if(a.provenance?.kind!=='shared-local'||a.provenance.fields!==images['101ab190']||(a.provenance.offset??0)!==0||b.provenance?.kind!=='shared-local'||b.provenance.fields!==frame.pointer.fields||(b.provenance.offset??0)!==frame.pointer.offset)throw new Error('Actual FileVersion copy pointer difference required');stack.#sharedLocalPhysical(a.provenance.fields);stack.#sharedLocalPhysical(b.provenance.fields);write(args[0]!,stack.#mint(0,0,{kind:'difference',left,right}));stack.#flags(0,0);
          }else if(a.provenance&&b.provenance&&opcode==='SUB'&&relativePair(left,right)){const [a,b]=relativePair(left,right)!;write(args[0]!,stack.#mint(a-b,0xffffffff));pointerFlags(a,b);
          }else if(a.provenance&&b.provenance&&opcode==='SUB'){
            const av=relativeImageAddress(left),bv=relativeImageAddress(right),result=(av-bv)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#arithmeticFlags(av,bv,result,4,true);
          }else if(a.provenance||b.provenance){
            if(b.provenance&&opcode==='SUB')throw new Error('Unowned initializer scalar-pointer subtraction');
            const delta=stack.#numeric(a.provenance?right:left,4)|0;write(args[0]!,stack.#offsetWord(a.provenance?left:right,delta*(opcode==='SUB'?-1:1)));stack.#flags(0,0);
          }else {const av=stack.#numeric(left,width),bv=stack.#numeric(right,width),result=((opcode==='SUB'?av-bv:av+bv)&stack.#maximum(width))>>>0;write(args[0]!,stack.#mint(result,stack.#maximum(width)));stack.#arithmeticFlags(av,bv,result,width,opcode==='SUB');}
        }else if(opcode==='OR'){const a=stack.#record(read(args[0]!)),b=stack.#record(read(args[1]!));const annihilated=(!a.provenance&&a.mask===0xffffffff&&a.value===0xffffffff)||(!b.provenance&&b.mask===0xffffffff&&b.value===0xffffffff);if((a.provenance||b.provenance)&&!annihilated)throw new Error('Actual initializer numerical OR operands required');const value=annihilated?0xffffffff:a.value|b.value,mask=annihilated?0xffffffff:(a.mask&b.mask)|(a.mask&a.value)|(b.mask&b.value);write(args[0]!,stack.#mint(value,mask));stack.#logicalFlags(value,mask,4);
        }else if(opcode==='XOR'||opcode==='AND'){
          const left=read(args[0]!),right=read(args[1]!),a=stack.#record(left),b=stack.#record(right),same=args[0]!.kind==='register'&&args[1]!.kind==='register'&&args[0]!.slot===args[1]!.slot;
          if((mode==='dll-version-token'||mode==='dll-version-integer')&&pc==='100acdb2'){
            if(opcode!=='AND'||text!=='EAX,EBX'||b.provenance?.kind!=='shared-local'||b.provenance.fields!==images['101ab190'])throw new Error('Actual original tokenizer token-pointer mask required');const mask=stack.#numeric(left,4);if(mask!==0&&mask!==0xffffffff)throw new Error('Original tokenizer empty/nonempty mask required');write(args[0]!,mask===0?stack.#mint(0,0xffffffff):right);stack.#flags(mask===0?0x40:0,0x41);pc=next;continue;
          }

          const value=opcode==='XOR'&&same?0:opcode==='XOR'?a.value^b.value:a.value&b.value;
          const mask=opcode==='XOR'&&same?0xffffffff:opcode==='AND'?(a.mask&b.mask)|((~a.value)&a.mask)|((~b.value)&b.mask):a.mask&b.mask;
          if(pc==='100c43b7'||(mode==='dll-version-token'||mode==='dll-version-integer')&&pc==='100acdb5'||(mode==='dll-language-output'||(mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting'))&&pc==='100b5cb9'){const relation=a.provenance;if(opcode!=='XOR'||text!=='ECX,EBP'||relation?.kind!=='xor'||relation.right!==right||stack.#record(right).provenance?.kind!=='stack')throw new Error('Actual saved identifier cookie and same EBP required');const cookie=stack.#record(relation.left);stack.#numeric(relation.left,4);write(args[0]!,relation.left);stack.#logicalFlags(cookie.value,cookie.mask,4);pc=next;continue;}
          const copyStart=copyUpdates.find(spec=>spec[0]===pc);
          if(copyStart){if(opcode!=='XOR'||copyUpdate)throw new Error('Original DName copy XOR start required');const original=copyStart[4]?left:right,selected=copyStart[4]?right:left,receiver=stack.#load(stack.#bank,stack.#reg('EAX')),memory=stack.#memory(stack.#offsetWord(receiver,4),4),physical=NativeHeapObjectViews.prototype.maskedWord.call(memory.fields,memory.offset),record=stack.#record(original),originalOperand=copyStart[4]?args[0]!:args[1]!;
            if(record.value!==physical.value||record.mask!==physical.knownMask)throw new Error('Original physical copy destination required');
            if(originalOperand.kind==='memory'){const readMemory=stack.#memory(address(originalOperand.expression),4);if(readMemory.fields!==memory.fields||readMemory.offset!==memory.offset)throw new Error('Same original copy memory read required');}else {const grant=copyPhysicalWords.get(original);if(!grant||grant.fields!==memory.fields||grant.offset!==memory.offset||grant.value!==record.value||grant.mask!==record.mask)throw new Error('Actual retained copy destination register required');}
            copyUpdate={spec:copyStart,...memory,original,selected};
          }
          if(copyUpdate?.spec[2]===pc){const proof=copyUpdate,masked=proof.spec[4]?right:(pc==='100c1b80'?right:left),originalOperand=proof.spec[4]?args[0]!:(pc==='100c1b80'?args[0]!:args[1]!),originalWord=proof.spec[4]?left:(pc==='100c1b80'?left:right),original=stack.#record(proof.original),physical=NativeHeapObjectViews.prototype.maskedWord.call(proof.fields,proof.offset);
            if(opcode!=='XOR'||masked!==proof.masked||physical.value!==original.value||physical.knownMask!==original.mask)throw new Error('Unchanged original DName copy bitfield required');
            if(originalOperand.kind==='memory'){const memory=stack.#memory(address(originalOperand.expression),4);if(memory.fields!==proof.fields||memory.offset!==proof.offset)throw new Error('Same final copy memory read required');}else if(originalWord!==proof.original)throw new Error('Same final copy register required');
            const selected=stack.#record(proof.selected),joined=nativeMaskedBitfieldAssignment({value:original.value,knownMask:original.mask},{value:selected.value,knownMask:selected.mask},proof.spec[3]);write(args[0]!,stack.#mint(joined.value,joined.knownMask));stack.#logicalFlags(joined.value,joined.knownMask,4);copyUpdate=null;pc=next;continue;
          }
          if(pc==='100c1f48'){
            const destination=args[0]!;if(!bitfieldUpdate?.selected||!bitfieldUpdate.masked||right!==bitfieldUpdate.masked||destination.kind!=='memory'||text!=='dword ptr [ESI + 0x4],ECX')throw new Error('Actual original masked bitfield expression required');const memory=stack.#memory(address(destination.expression),4),original=stack.#record(bitfieldUpdate.original),current=NativeHeapObjectViews.prototype.maskedWord.call(memory.fields,memory.offset);if(memory.fields!==bitfieldUpdate.fields||memory.offset!==bitfieldUpdate.offset||current.value!==original.value||current.knownMask!==original.mask)throw new Error('Unchanged original bitfield storage required');const selected=stack.#record(bitfieldUpdate.selected),joined=nativeMaskedBitfieldAssignment({value:original.value,knownMask:original.mask},{value:selected.value,knownMask:selected.mask},15);write(destination,stack.#mint(joined.value,joined.knownMask));stack.#logicalFlags(joined.value,joined.knownMask,4);bitfieldUpdate=null;pc=next;continue;
          }
          const result=opcode==='XOR'&&!same&&(mask>>>0)!==0xffffffff?stack.#mint(value,mask,{kind:'xor',left,right}):stack.#mint(value,mask);
          if(pc==='100b2ab9'||mode==='dll-error-log-insertion'&&pc==='100aa938'){if(opcode!=='XOR'||!strlenState.current||left!==strlenState.current.word||stack.#numeric(right,4)!==0xffffffff)throw new Error('Actual original strlen complement relation required');strlenState.current.inverse=result;}
          if(pc==='100b2abc'||mode==='dll-error-log-insertion'&&pc==='100aa93b'){if(opcode!=='XOR'||!strlenState.current||left!==strlenState.current.inverse||right!==strlenState.current.sum)throw new Error('Actual original strlen predicate operands required');strlenState.current.mixed=result;}
          if(copyUpdate?.spec[0]===pc)copyUpdate.xor=result;
          if(copyUpdate?.spec[1]===pc){if(opcode!=='AND'||left!==copyUpdate.xor||stack.#numeric(right,4)!==copyUpdate.spec[3])throw new Error('Actual original DName copy mask required');copyUpdate.masked=result;}
          if(pc==='100c1f43'){if(!bitfieldUpdate||left!==bitfieldUpdate.original||text!=='ECX,EAX')throw new Error('Original replicator XOR operands required');stack.#numeric(right,4);bitfieldUpdate.selected=right;bitfieldUpdate.xor=result;}
          if(pc==='100c1f45'){if(!bitfieldUpdate||left!==bitfieldUpdate.xor||text!=='ECX,0xf'||stack.#numeric(right,4)!==15)throw new Error('Original replicator low-bit mask required');bitfieldUpdate.masked=result;}
          write(args[0]!,result);stack.#logicalFlags(value,mask,4);
        }
        else if(opcode==='NEG'){
          const word=read(args[0]!),provenance=stack.#record(word).provenance;
          if(provenance?.kind==='shared-local'){const proof=NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform(stack.#platform,{fields:provenance.fields,offset:provenance.offset??0});if(!proof.known)throw new Error(proof.reason);write(args[0]!,stack.#mint((-proof.value)&3,3,{kind:'neg',word}));stack.#flags(1,0x41);}
          else {const value=stack.#numeric(word,4),result=(-value)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#arithmeticFlags(0,value,result,4,true);}
        }
        else if(opcode==='MOVSD.REP'){if(text!=='ES:EDI,ESI'||!['10023080','10023421'].includes(pc))throw new Error('Original ErrorAdmin REP MOVSD form required');let count=stack.#numeric(stack.#load(stack.#bank,stack.#reg('ECX')),4);while(count){stack.#stringDword(true);stack.#store(stack.#bank,stack.#reg('ECX'),stack.#mint(--count,0xffffffff));}}
        else if(opcode==='MOVSW'){
          if(text!=='ES:EDI,ESI'||!['10023082','10023423'].includes(pc))throw new Error('Original ErrorAdmin MOVSW form required');const direction=NativeRuntimePlatform.readNativeDirectionFlag(stack.#platform);if(!direction.known)throw new Error(direction.reason);
          const source=stack.#load(stack.#bank,stack.#reg('ESI')),destination=stack.#load(stack.#bank,stack.#reg('EDI')),memory=stack.#memory(source,2),word=NativeHeapObjectViews.prototype.maskedWord.call(memory.fields,memory.offset,2);
          stack.#writeMemory(destination,stack.#mint(word.value,word.knownMask),2);stack.#store(stack.#bank,stack.#reg('ESI'),stack.#offsetWord(source,direction.value?-2:2));stack.#store(stack.#bank,stack.#reg('EDI'),stack.#offsetWord(destination,direction.value?-2:2));
        }
        else if(opcode==='STOSD.REP'){if(text!=='ES:EDI')throw new Error('Original initializer REP STOSD form required');let count=stack.#numeric(stack.#load(stack.#bank,stack.#reg('ECX')),4);while(count){stack.#stringDword(false);stack.#store(stack.#bank,stack.#reg('ECX'),stack.#mint(--count,0xffffffff));}}

        else if(opcode==='CDQ'){const input=stack.#record(stack.#load(stack.#bank,stack.#reg('EAX'))),signKnown=(input.mask>>>31)&1;stack.#store(stack.#bank,stack.#reg('EDX'),stack.#mint(input.value&0x80000000?0xffffffff:0,signKnown?0xffffffff:0));}
        else if(opcode==='MUL'){const a=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4),b=stack.#numeric(read(args[0]!),4),product=BigInt(a)*BigInt(b),high=Number(product>>32n);stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(Number(product&0xffffffffn),0xffffffff));stack.#store(stack.#bank,stack.#reg('EDX'),stack.#mint(high,0xffffffff));stack.#flags(high?0x801:0,0x801);}
        else if(opcode==='DIV'){const divisor=stack.#numeric(read(args[0]!),4),dividend=(BigInt(stack.#numeric(stack.#load(stack.#bank,stack.#reg('EDX')),4))<<32n)|BigInt(stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4));if(divisor===0)throw new Error('Original x86 unsigned divide by zero');const quotient=dividend/BigInt(divisor);if(quotient>0xffffffffn)throw new Error('Original x86 unsigned quotient overflow');stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(Number(quotient),0xffffffff));stack.#store(stack.#bank,stack.#reg('EDX'),stack.#mint(Number(dividend%BigInt(divisor)),0xffffffff));stack.#flags(0,0);}
        else if(opcode==='RCR'){const shift=stack.#numeric(read(args[1]!),4)&31;if(shift){const old=stack.#record(stack.#load(stack.#bank,36));if(!(old.mask&1))throw new Error('Known RCR carry required');let bits=(BigInt(old.value&1)<<32n)|BigInt(stack.#numeric(read(args[0]!),4));for(let i=0;i<shift;i++)bits=(bits>>1n)|((bits&1n)<<32n);const value=Number(bits&0xffffffffn),carry=Number(bits>>32n);write(args[0]!,stack.#mint(value,0xffffffff));const overflow=((value>>>31)^((value>>>30)&1))<<11;stack.#flags((old.value&~0x801)|carry|(shift===1?overflow:0),(old.mask&~0x801)|1|(shift===1?0x800:0));}}
        else if(opcode==='SBB'||opcode==='ADC'){const old=stack.#numeric(read(args[0]!),4),right=stack.#numeric(read(args[1]!),4),flags=stack.#record(stack.#load(stack.#bank,36));if(!(flags.mask&1))throw new Error('Actual initializer arithmetic carry required');const carry=flags.value&1,subtract=opcode==='SBB',result=(subtract?old-right-carry:old+right+carry)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#arithmeticFlags(old,right,result,4,subtract,carry);}
        else if(opcode==='DEC'||opcode==='DEC.LOCK'){const old=read(args[0]!),record=stack.#record(old),flags=stack.#record(stack.#load(stack.#bank,36));if(record.provenance){write(args[0]!,stack.#offsetWord(old,-1));stack.#flags(flags.value&1,flags.mask&1);}else{const value=stack.#numeric(old,4),result=(value-1)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#arithmeticFlags(value,1,result,4,true);const updated=stack.#record(stack.#load(stack.#bank,36));stack.#flags((updated.value&~1)|(flags.value&1),(updated.mask&~1)|(flags.mask&1));}}
        else if(opcode==='INC'||opcode==='INC.LOCK'){const old=read(args[0]!),record=stack.#record(old),flags=stack.#record(stack.#load(stack.#bank,36));if(record.provenance){write(args[0]!,stack.#offsetWord(old,1));stack.#flags(flags.value&1,flags.mask&1);}else{const value=stack.#numeric(old,4),result=(value+1)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#arithmeticFlags(value,1,result,4,false);const updated=stack.#record(stack.#load(stack.#bank,36));stack.#flags((updated.value&~1)|(flags.value&1),(updated.mask&~1)|(flags.mask&1));}}
        else if(opcode==='NOT'){write(args[0]!,stack.#mint(~stack.#numeric(read(args[0]!),4),0xffffffff));}
        else if(opcode==='IMUL'){
          const left=stack.#numeric(read(args.length===2?args[0]!:args[1]!),4)|0,right=stack.#numeric(read(args.length===2?args[1]!:args[2]!),4)|0,result=BigInt(left)*BigInt(right),low=Number(BigInt.asUintN(32,result)),fits=result===BigInt.asIntN(32,result);write(args[0]!,stack.#mint(low,0xffffffff));stack.#flags(fits?0:0x801,0x801);
        }
        else if(opcode==='IDIV'){
          const divisor=stack.#numeric(read(args[0]!),4)|0,low=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4),high=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EDX')),4);if(divisor===0)throw new Error('Original signed divide-by-zero boundary');
          const dividend=BigInt.asIntN(64,(BigInt(high)<<32n)|BigInt(low)),quotient=dividend/BigInt(divisor),remainder=dividend%BigInt(divisor);if(quotient< -2147483648n||quotient>2147483647n)throw new Error('Original signed division overflow boundary');
          stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(Number(BigInt.asUintN(32,quotient)),0xffffffff));stack.#store(stack.#bank,stack.#reg('EDX'),stack.#mint(Number(BigInt.asUintN(32,remainder)),0xffffffff));stack.#flags(0,0);
        }
        else if(opcode==='SAR'){
          const value=stack.#numeric(read(args[0]!),4),shift=stack.#numeric(read(args[1]!),4)&31;if(shift){const result=(value>>shift)>>>0;write(args[0]!,stack.#mint(result,0xffffffff));stack.#logicalFlags(result,0xffffffff,4);const flags=stack.#record(stack.#load(stack.#bank,36));stack.#flags((flags.value&~0x801)|((value>>>(shift-1))&1),(flags.mask&~0x800)|(shift===1?0x800:0));}
        }
        else if(opcode==='SHL'){
          const destination=args[0]!,width:Width=destination.kind==='memory'?destination.width:destination.kind==='register'&&destination.byte?1:destination.kind==='register'&&destination.word?2:4,bits=width*8,widthMask=width===4?0xffffffff:(2**bits)-1,input=stack.#record(read(destination)),value=input.value&widthMask,count=args[1]!,shift=stack.#numeric(read(count),count.kind==='register'&&count.byte?1:4)&31;if(shift){const result=((value<<shift)&widthMask)>>>0,mask=(((input.mask<<shift)|((2**shift)-1))&widthMask)>>>0;write(destination,stack.#mint(result,mask));stack.#logicalFlags(result,mask,width);const flags=stack.#record(stack.#load(stack.#bank,36)),carry=shift<=bits?(value>>>(bits-shift))&1:0,carryKnown=shift<=bits?(input.mask>>>(bits-shift))&1:0,overflowKnown=shift===1&&carryKnown&&((mask>>>(bits-1))&1);stack.#flags((flags.value&~0x801)|carry|(shift===1?(((result>>>(bits-1))^carry)<<11):0),(flags.mask&~0x801)|carryKnown|(overflowKnown?0x800:0));}
        }
        else if(opcode==='SHR'){const value=stack.#numeric(read(args[0]!),4),shift=stack.#numeric(read(args[1]!),4);write(args[0]!,stack.#mint(value>>>shift,0xffffffff));stack.#logicalFlags(value>>>shift,0xffffffff,4);const flags=stack.#record(stack.#load(stack.#bank,36));stack.#flags((flags.value&~0x801)|((value>>>(shift-1))&1),(flags.mask&~0x800));}
        else if(opcode==='CMP'||opcode==='TEST'){
          const left=read(args[0]!),right=read(args[1]!),a=stack.#record(left),b=stack.#record(right),width=args[0]!.kind==='memory'?args[0]!.width:args[0]!.kind==='register'&&args[0]!.byte?1:args[0]!.kind==='register'&&args[0]!.word?2:4;
          if(pc==='100b2ac1'||mode==='dll-error-log-insertion'&&pc==='100aa942'){
            if(opcode!=='TEST'||text!=='EAX,0x81010100'||!strlenState.current||left!==strlenState.current.mixed||stack.#numeric(right,4)!==0x81010100)throw new Error('Actual original strlen candidate relation required');const original=stack.#record(strlenState.current.word),candidate=gameStrlenDwordCandidate(original.value,original.mask);if(!candidate.known)throw new Error('SharedBase original strlen candidate remains ambiguous');const value=a.value&b.value,mask=(a.mask&b.mask)|(~a.value&a.mask)|(~b.value&b.mask);stack.#logicalFlags(value,mask,4);const flags=stack.#record(stack.#load(stack.#bank,36));stack.#flags((flags.value&~0x40)|(candidate.value?0:0x40),flags.mask|0x40);
          }else if(a.provenance||b.provenance){
            if(opcode==='TEST'&&a.provenance?.kind==='shared-local'&&!b.provenance&&stack.#numeric(right,width)===3){const modulo=NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform(stack.#platform,{fields:a.provenance.fields,offset:a.provenance.offset??0});if(!modulo.known)throw new Error(modulo.reason);stack.#logicalFlags(modulo.value,0xffffffff,4);}
            else if(opcode==='TEST'&&args[0]!.kind==='register'&&args[1]!.kind==='register'&&args[0]!.slot===args[1]!.slot)stack.#flags(0,0x40);
            else if(opcode==='CMP'&&a.provenance?.kind==='platform'&&a.provenance.category==='DiagnosticWindow'&&!b.provenance&&stack.#numeric(right,width)===0){if(!NativeRuntimePlatform.ownsDiagnosticWindow(stack.#platform,a.provenance.object))throw new Error('Canonical diagnostic window comparison required');stack.#flags(0,0x40);}
            else if(opcode==='CMP'&&a.provenance?.kind==='platform'&&a.provenance.category==='InitializerFileHandle'&&!b.provenance&&[0,0xffffffff].includes(stack.#numeric(right,width))){if(!NativeRuntimePlatform.recognizesFileHandle(stack.#platform,a.provenance.object))throw new Error('Actual owned file HANDLE comparison required');stack.#flags(0,0x40);}
            else if(opcode==='CMP'&&a.provenance?.kind==='platform'&&a.provenance.category==='handle'&&!b.provenance&&[0,0xffffffff,0xfffffffe].includes(stack.#numeric(right,width))){const proof=NativeRuntimePlatform.standardIoCapabilityForPlatform(stack.#platform,a.provenance.object);if(!proof.known||proof.value!=='handle')throw new Error('Canonical descriptor HANDLE comparison required');stack.#flags(0,0x40);}
            else if(opcode==='CMP'&&a.provenance&&!b.provenance&&stack.#numeric(right,width)===0)stack.#flags(0,0x41);
            else if(opcode==='CMP'&&relativePair(left,right)){if(a.provenance?.kind==='shared-local'&&Object.values(images).includes(a.provenance.fields)){const av=relativeImageAddress(left),bv=relativeImageAddress(right);stack.#arithmeticFlags(av,bv,(av-bv)>>>0,4,true);}else {const [av,bv]=relativePair(left,right)!;pointerFlags(av,bv);}}
            else if(opcode==='CMP'&&['1003c67e','1003c71f','1003c72b'].includes(pc)&&a.provenance?.kind==='shared-local'&&b.provenance?.kind==='shared-local'){const order=proof.value.imports.comparePoolPointers({fields:a.provenance.fields,offset:a.provenance.offset??0},{fields:b.provenance.fields,offset:b.provenance.offset??0});stack.#flags(order<0?1:order===0?0x40:0,0x41);}
            else {const av=relativeImageAddress(left),bv=relativeImageAddress(right);stack.#arithmeticFlags(av,bv,(av-bv)>>>0,4,true);}
          }else {const av=stack.#numeric(left,width),bv=stack.#numeric(right,width);if(opcode==='CMP')stack.#arithmeticFlags(av,bv,(av-bv)&stack.#maximum(width),width,true);else stack.#logicalFlags(av&bv,stack.#maximum(width),width);}
        }else if(opcode==='SETL'){const flags=stack.#record(stack.#load(stack.#bank,36));if((flags.mask&0x880)!==0x880||args[0]?.kind!=='register'||!args[0].byte)throw new Error('Actual signed byte condition required');write(args[0],stack.#mint(!!(flags.value&0x80)!==!!(flags.value&0x800)?1:0,255));
        }else if(opcode==='SETZ'||opcode==='SETNZ'){
          if(mode==='dll-error-log-insertion'&&pc==='1002340b'){
            const flags=stack.#record(stack.#load(stack.#bank,36));if(opcode!=='SETZ'||text!=='DL'||args[0]?.kind!=='register'||!args[0].byte||!(flags.mask&0x40))throw new Error('Original ErrorAdmin full-byte SETZ required');write(args[0],stack.#mint(flags.value&0x40?1:0,255));pc=next;continue;
          }
          if(!['CL','AL'].includes(text))throw new Error('Unowned initializer byte destination');const register=text==='CL'?'ECX':'EAX',flags=stack.#record(stack.#load(stack.#bank,36)),old=stack.#record(stack.#load(stack.#bank,stack.#reg(register)));if(!(flags.mask&0x40))throw new Error('Actual initializer ZF required');const set=(!!(flags.value&0x40))===(opcode==='SETZ');stack.#store(stack.#bank,stack.#reg(register),stack.#mint((old.value&0xffffff00)|(set?1:0),(old.mask&0xffffff00)|255));
        }else if(['JMP','JZ','JNZ','JC','JNC','JBE','JA','JL','JGE','JG','JLE','JNS','JS'].includes(opcode!)){
          const flags=stack.#record(stack.#load(stack.#bank,36)),mask=opcode==='JNS'||opcode==='JS'?0x80:opcode==='JG'||opcode==='JLE'?0x8c0:opcode==='JL'||opcode==='JGE'?0x880:opcode==='JC'||opcode==='JNC'?1:opcode==='JBE'||opcode==='JA'?0x41:0x40;
          if(opcode!=='JMP'&&(flags.mask&mask)!==mask)throw new Error('Actual initializer branch flags required');
          const taken=opcode==='JMP'||opcode==='JS'&&!!(flags.value&0x80)||opcode==='JNS'&&!(flags.value&0x80)||opcode==='JZ'&&!!(flags.value&0x40)||opcode==='JNZ'&&!(flags.value&0x40)||opcode==='JC'&&!!(flags.value&1)||opcode==='JNC'&&!(flags.value&1)||opcode==='JBE'&&!!(flags.value&0x41)||opcode==='JA'&&!(flags.value&0x41)||opcode==='JL'&&(!!(flags.value&0x80)!==!!(flags.value&0x800))||opcode==='JGE'&&(!!(flags.value&0x80)===!!(flags.value&0x800))||opcode==='JG'&&!(flags.value&0x40)&&(!!(flags.value&0x80)===!!(flags.value&0x800))||opcode==='JLE'&&(!!(flags.value&0x40)||(!!(flags.value&0x80)!==!!(flags.value&0x800)));
          if(taken){pc=stack.#numeric(read(args[0]!),4).toString(16).padStart(8,'0');continue;}
        }else if(opcode==='CALL'){
          const callee=read(args[0]!),capability=stack.#record(callee).provenance;
          if(pc==='100c2000'||pc==='100c2093'||pc==='100c20ab'){
            const receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance;
            if(receiver?.kind!=='shared-local')throw new Error('Actual constructed demangler node receiver required');
            const offset=receiver.offset??0,table=constructedNodes.get(receiver.fields)?.get(offset),stored=NativeHeapObjectViews.prototype.pointer.call(receiver.fields,offset).get() as {fields:NativeHeapObjectViews;offset:number}|null;
            if(!table||stored?.fields!==table||stored.offset!==0||args[0]!.kind!=='memory')throw new Error('Actual retained node constructor vtable required');
            const actual=stack.#memory(address(args[0]!.expression),4),raw=table===images['100f299c']?'e3220c10f2220c1001230c10':'9c1d0c10a0220c10b2220c10';
            if(actual.fields!==table||actual.offset!==(pc==='100c20ab'?8:0))throw new Error('Actual original demangler vtable slot required');
            for(let index=0;index<12;index++)if(NativeHeapObjectViews.prototype.readUnsigned.call(table,index,1)!==parseInt(raw.slice(index*2,index*2+2),16))throw new Error('Original demangler vtable bytes required');
          }
          stack.#call(pc,next);
          if(mode==='dll-message-create'&&pc==='10049612'){
            if(stack.#numeric(callee,4)!==0x100010e1)throw new Error('Original MessageAdmin holder allocation target required');stack.#currentPc=stack.#source('code','100010e1');throw new Error('Original SharedBase MessageAdmin holder allocation pending');
          }

          if(mode==='dll-spie-init-descriptor-section'&&pc==='100d1372'){if(capability?.kind!=='platform'||capability.object!==proof.value.imports.spieCreateFileProcedure)throw new Error('Actual original CreateFileA target required');stack.#currentPc=stack.#source('code','100d1372');throw new Error('Original SharedBase CreateFileA return pending');}
          if(mode==='dll-version-log-formatting'&&pc==='10049894'){if(stack.#numeric(callee,4)!==0x10005560)throw new Error('Original version MessageAdmin submission required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase version MessageAdmin log pending');}
          if(mode==='dll-version-log-tls'&&pc==='10049871'){if(stack.#numeric(callee,4)!==0x100a7f27)throw new Error('Original version logger formatter target required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase DLL version formatting pending');}
          if(mode==='dll-spy-log-callback'&&pc==='100a15fc'){if(stack.#numeric(callee,4)!==0x1000840e)throw new Error('Original final separator logger target required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase final separator log pending');}
          if(mode==='dll-spy-log-callback'&&pc==='100a15ed'){if(stack.#numeric(callee,4)!==0x1000871f)throw new Error('Original DLL version logger target required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase DLL version log pending');}
          if(mode==='dll-error-log-insertion'&&pc==='100494db'){const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),context=stack.#record(stack.#load(stack.#stack,cursor+16)).provenance;if(stack.#numeric(callee,4)!==0x10008c06||context?.kind!=='shared-local'||context.fields!==images['101ab11c']||(context.offset??0)!==0)throw new Error('Actual stored SpyAdmin callback and context required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase SpyAdmin log callback pending');}
          if(mode==='dll-error-log-formatting'&&pc==='10022680'){if(stack.#numeric(callee,4)!==0x1000102d)throw new Error('Original ErrorAdmin log insertion target required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase ErrorAdmin log insertion pending');}
          if(mode==='dll-error-log-allocation'&&['10022632','10022649','1002265e','10022670'].includes(pc)){if(stack.#numeric(callee,4)!==0x100aa234)throw new Error('Original ErrorAdmin sprintf target required');const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),output=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(output?.kind!=='shared-local'||(output.offset??0)!==0||!errorLogAllocation?.buffer||output.fields!==errorLogAllocation.buffer)throw new Error('Actual owned ErrorAdmin formatting buffer required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase ErrorAdmin log formatting pending');}
          if(mode==='dll-error-log-callback'&&pc==='10022613'){if(stack.#numeric(callee,4)!==0x100aaaf6)throw new Error('Original ErrorAdmin temporary malloc target required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase ErrorAdmin log allocation pending');}
          if(mode==='dll-message-log'&&pc==='100494db'){const target=stack.#numeric(callee,4),cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),context=stack.#record(stack.#load(stack.#stack,cursor+16)).provenance;if(target!==0x10002df6||context?.kind!=='shared-local'||context.fields!==images['10142a58']||(context.offset??0)!==0)throw new Error('Actual stored ErrorAdmin log callback and context required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase ErrorAdmin log callback pending');}
          if((mode==='dll-message-terminate'||mode==='dll-separator-logging')&&pc==='1004980f'){if(stack.#numeric(callee,4)!==0x10005560)throw new Error('Original MessageAdmin initialization log target required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase MessageAdmin initialization log pending');}
          if(mode==='dll-spie-terminate'&&pc==='100497a8'){if(stack.#numeric(callee,4)!==0x100a72d0)throw new Error('Original MessageAdmin shutdown registration target required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase MessageAdmin termination registration pending');}
          if(mode==='dll-spie-register'&&pc==='1004b235'){if(stack.#numeric(callee,4)!==0x100d580a)throw new Error('Original SpieAdmin Winsock thunk target required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase SpieAdmin Winsock ordinal 115 pending');}
          if(mode==='dll-spie-fclose'&&pc==='1004b226'){if(stack.#numeric(callee,4)!==0x10007cac)throw new Error('Original SpieAdmin callback registration target required');stack.#currentPc=stack.#source('code',pc);throw new Error('Original SharedBase SpieAdmin callback registration pending');}
          if(mode==='dll-spie-create-file'&&['1004afc7','1004b208'].includes(pc)){const target=stack.#numeric(callee,4);if(target!==(pc==='1004afc7'?0x100a72d0:0x100ac841))throw new Error('Actual original SpieAdmin next operation required');stack.#currentPc=stack.#source('code',pc);throw new Error(pc==='1004afc7'?'Original SharedBase SpieAdmin termination registration pending':'Original SharedBase SpieAdmin fclose pending');}
          if(mode==='dll-spie-allocate-descriptor'&&pc==='100d0e1c'){if(stack.#numeric(callee,4)!==0x100bbf27)throw new Error('Original descriptor section initializer target required');stack.#currentPc=stack.#source('code','100bbf27');throw new Error('Original SharedBase descriptor section initialization pending');}
          if(mode==='dll-spie-shared-open'&&pc==='100d1329'){if(stack.#numeric(callee,4)!==0x100d0d8d)throw new Error('Original CRT descriptor allocation target required');stack.#currentPc=stack.#source('code','100d0d8d');throw new Error('Original SharedBase CRT descriptor allocation pending');}
          if(mode==='dll-spie-acquire-stream'&&pc==='100bfd3a'){if(stack.#numeric(callee,4)!==0x100d1a2d)throw new Error('Original CRT shared file-open target required');stack.#currentPc=stack.#source('code','100d1a2d');throw new Error('Original SharedBase CRT shared file-open pending');}
          if(mode==='dll-message-spie-startup'&&pc==='100acc23'){if(stack.#numeric(callee,4)!==0x100bfd6f)throw new Error('Original CRT stream acquisition target required');stack.#currentPc=stack.#source('code','100bfd6f');throw new Error('Original SharedBase CRT stream acquisition pending');}
          if(mode==='dll-message-spy-terminate'&&pc==='1004979e'){if(stack.#numeric(callee,4)!==0x10001334)throw new Error('Original MessageAdmin SpieAdmin getter target required');stack.#currentPc=stack.#source('code','10001334');throw new Error('Original SharedBase SpieAdmin getter pending');}
          if(mode==='dll-message-spy-create'&&pc==='1004b4b9'){if(stack.#numeric(callee,4)!==0x100a72d0)throw new Error('Original SpyAdmin termination target required');stack.#currentPc=stack.#source('code','100a72d0');throw new Error('Original SharedBase SpyAdmin termination registration pending');}
          if(mode==='dll-message-spy-get'&&pc==='1004b4af'){if(stack.#numeric(callee,4)!==0x100089e5)throw new Error('Original SpyAdmin Create target required');stack.#currentPc=stack.#source('code','100089e5');throw new Error('Original SharedBase SpyAdmin construction pending');}
          if(mode==='dll-message-error-terminate'&&pc==='10049799'){if(stack.#numeric(callee,4)!==0x10008b11)throw new Error('Original MessageAdmin SpyAdmin getter target required');stack.#currentPc=stack.#source('code','10008b11');throw new Error('Original SharedBase SpyAdmin getter pending');}
          if(mode==='dll-message-error-register'&&pc==='100219ad'){if(stack.#numeric(callee,4)!==0x100a72d0)throw new Error('Original ErrorAdmin termination registration target required');stack.#currentPc=stack.#source('code','100a72d0');throw new Error('Original SharedBase ErrorAdmin termination registration pending');}
          if(mode==='dll-message-error-buffer'&&pc==='10022814'){if(stack.#numeric(callee,4)!==0x10007cac)throw new Error('Original ErrorAdmin message callback registration target required');stack.#currentPc=stack.#source('code','10007cac');throw new Error('Original SharedBase ErrorAdmin callback registration pending');}
          if(mode==='dll-message-error-create'&&pc==='100227a8'){if(stack.#numeric(callee,4)!==0x10004133)throw new Error('Original ErrorAdmin buffer allocation target required');stack.#currentPc=stack.#source('code','10004133');throw new Error('Original SharedBase ErrorAdmin buffer allocation pending');}
          if(mode==='dll-message-error-get'&&pc==='100219a3'){if(stack.#numeric(callee,4)!==0x10001db1)throw new Error('Original ErrorAdmin Create target required');stack.#currentPc=stack.#source('code','10001db1');throw new Error('Original SharedBase ErrorAdmin construction pending');}
          if(mode==='dll-separator-logging'&&pc==='10049775'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;
            if(section?.kind!=='shared-local'||section.fields!==images['10197d6c']||section.offset!==4||stack.#record(callee).provenance?.kind!=='platform')throw new Error('Actual MessageAdmin critical-section import frame required');stack.#currentPc=stack.#source('code','10049775');throw new Error('Original SharedBase MessageAdmin critical-section initialization pending');
          }

          if(mode==='dll-version-free'&&pc==='100a15cd'){
            if(stack.#numeric(callee,4)!==0x1000840e)throw new Error('Original DLL separator logger target required');stack.#currentPc=stack.#source('code','1000840e');throw new Error('Original SharedBase DLL separator logging pending');
          }

          if(mode==='dll-version-integer'&&['1004c44e','1004c46d','1004c48c'].includes(pc)){
            if(stack.#numeric(callee,4)!==0x100acd00)throw new Error('Original subsequent version strtok call required');tokenSaved={esp:stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),ebp:stack.#load(stack.#bank,stack.#reg('EBP')),ebx:stack.#load(stack.#bank,stack.#reg('EBX')),esi:stack.#load(stack.#bank,stack.#reg('ESI')),edi:stack.#load(stack.#bank,stack.#reg('EDI'))};
          }
          if(mode==='dll-version-integer'&&pc==='1004c56c'){
            if(stack.#numeric(callee,4)!==0x10002112)throw new Error('Original outer version buffer Free target required');stack.#currentPc=stack.#source('code','10002112');throw new Error('Original SharedBase outer version buffer Free pending');
          }

          if(mode==='dll-version-token'&&pc==='1004c43c'){
            if(stack.#numeric(callee,4)!==0x100a7942)throw new Error('Original first version atoi call required');stack.#currentPc=stack.#source('code','100a7942');throw new Error('Original SharedBase first version integer conversion pending');
          }

          if(mode==='dll-language-return'&&pc==='1004c42a'){
            if(stack.#numeric(callee,4)!==0x100acd00)throw new Error('Original version strtok target required');const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),input=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,delimiter=stack.#record(stack.#load(stack.#stack,cursor+8)).provenance;if(input?.kind!=='shared-local'||input.fields!==images['101ab190']||(input.offset??0)!==0||delimiter?.kind!=='shared-local'||delimiter.fields!==images['100e820c']||(delimiter.offset??0)!==0)throw new Error('Actual returned version string and delimiter required');stack.#currentPc=stack.#source('code','100acd00');throw new Error('Original SharedBase version tokenizer pending');
          }

          if(mode==='dll-language-version-copy'&&pc==='1004c3f0'){
            if(stack.#numeric(callee,4)!==0x10002112)throw new Error('Original language cleanup Free target required');const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),argument=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance,buffer=stack.#sharedDllLanguageFrame!.buffer!;
            if(argument?.kind!=='shared-local'||argument.fields!==buffer.fields||(argument.offset??0)!==buffer.offset||receiver?.kind!=='shared-local'||receiver.fields!==images['10142798']||receiver.offset!==8)throw new Error('Actual nested buffer and MemoryAdmin Free receiver required');stack.#currentPc=stack.#source('code','10002112');throw new Error('Original SharedBase language buffer Free pending');
          }
          if((mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting')&&(pc==='100aa287'||mode==='dll-version-log-formatting'&&pc==='100a7eff')){
            if(stack.#numeric(callee,4)!==0x100b5355)throw new Error('Original translated output engine target required');const fmt=stack.#sharedDllFormatFrame!,cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));
            if(stack.#address(stack.#load(stack.#stack,cursor+4))!==fmt.ebp-32||stack.#address(stack.#load(stack.#stack,cursor+16))!==fmt.varargs||stack.#numeric(stack.#load(stack.#stack,fmt.ebp-28),4)!==0x7fffffff||stack.#numeric(stack.#load(stack.#stack,fmt.ebp-20),4)!==0x42)throw new Error('Actual translated output engine stream required');
            stack.#sharedDllOutputRegisters={entryEsp:cursor,oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),oldFs:stack.#load(stack.#bank,32)};
          }
          if((mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting')&&pc==='1004c3a0'){
            if(stack.#numeric(callee,4)!==0x100d55d6)throw new Error('Original FileVersion query target required');stack.#currentPc=stack.#source('code','100d55d6');throw new Error('Original SharedBase FileVersion resource query pending');
          }
          if(mode==='dll-language-translation'&&pc==='1004c36a'){
            if(stack.#numeric(callee,4)!==0x100aa234)throw new Error('Original translated query formatter target required');stack.#currentPc=stack.#source('code','100aa234');throw new Error('Original SharedBase translated query formatter pending');
          }
          if(((mode==='dll-version-token'||mode==='dll-version-integer')&&pc==='100acd1c')||((mode==='dll-language-output'||(mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting')||mode==='dll-version-integer')&&pc==='100a74c5')){
            if(stack.#numeric(callee,4)!==0x100ae542)throw new Error('Original output PTD getter required');
            const ptd=proof.value.formatPtd();stack.#sharedLocalPhysical(ptd);stack.#store(stack.#bank,stack.#reg('EAX'),pointer(ptd));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret();pc=next;continue;
          }
          if((mode==='dll-language-output'||(mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting'))&&pc==='1004c330'){
            if(stack.#numeric(callee,4)!==0x100d55d6)throw new Error('Original translation query target required');stack.#currentPc=stack.#source('code','100d55d6');throw new Error('Original SharedBase translation resource query pending');
          }
          if(capability?.kind==='platform'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));let result:NativeX86Word32,bytes:number;
            if((mode==='dll-message-log'||mode==='dll-spy-log-callback')&&['10049528','1004956b'].includes(pc)&&capability.object===(pc==='10049528'?proof.value.imports.memorySectionEnterProcedure:proof.value.imports.memorySectionLeaveProcedure)){const section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(section?.kind!=='shared-local')throw new Error('Actual MessageAdmin log section pointer required');proof.value.imports.messageSectionLock(section.fields,section.offset??0,pc==='10049528');result=stack.#mint(0,0);bytes=4;
            }else if(mode==='dll-spie-fclose'&&pc==='100bf665'&&capability.object===proof.value.imports.spieCloseHandleProcedure){const handle=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(handle?.kind!=='platform'||handle.category!=='InitializerFileHandle')throw new Error('Actual original closing file HANDLE required');result=stack.#mint(proof.value.imports.closeFileHandle(handle.object),0xffffffff);bytes=4;
            }else if(mode==='dll-spie-create-file'&&pc==='100d13ec'&&capability.object===proof.value.imports.spieGetFileTypeProcedure){const handle=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(handle?.kind!=='platform'||handle.category!=='InitializerFileHandle')throw new Error('Actual original opened file HANDLE required');result=stack.#mint(proof.value.imports.getFileType(handle.object),0xffffffff);bytes=4;
            }else if(mode==='dll-spie-create-file'&&['100d13d0','100ae4cd'].includes(pc)&&capability.object===proof.value.imports.spieGetLastErrorProcedure){result=stack.#mint(proof.value.imports.getLastError(),0xffffffff);bytes=0;
            }else if(mode==='dll-spie-create-file'&&pc==='100ae537'&&capability.object===proof.value.imports.spieSetLastErrorProcedure){proof.value.imports.setLastError(stack.#numeric(stack.#load(stack.#stack,cursor+4),4));result=stack.#mint(0,0);bytes=4;
            }else if(mode==='dll-spie-init-descriptor-section'&&pc==='100bbfa6'&&(capability.category==='section'||capability.category==='InitializerSectionCache')){
              const section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(section?.kind!=='shared-local')throw new Error('Actual descriptor section import pointer required');result=stack.#mint(proof.value.imports.initializeDescriptorSection(capability.object,section.fields,section.offset??0,stack.#numeric(stack.#load(stack.#stack,cursor+8),4)),0xffffffff);bytes=8;
            }else if(mode==='dll-spie-init-descriptor-section'&&pc==='100bbf1b'&&capability.object===proof.value.imports.initializeSectionProcedure){
              const section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(section?.kind!=='shared-local')throw new Error('Actual descriptor fallback section pointer required');proof.value.imports.initializeDescriptorSection(null,section.fields,section.offset??0,null);result=stack.#mint(0,0);bytes=4;
            }else if(['dll-spie-init-descriptor-section','dll-spie-create-file','dll-spie-fclose'].includes(mode)&&['100d0e42','100d0e4f','100d0d86','100d0d4e'].includes(pc)&&capability.object===(['100d0e42','100d0d4e'].includes(pc)?proof.value.imports.memorySectionEnterProcedure:proof.value.imports.memorySectionLeaveProcedure)){
              const section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(section?.kind!=='shared-local')throw new Error('Actual descriptor section lock pointer required');proof.value.imports.descriptorSectionLock(section.fields,section.offset??0,['100d0e42','100d0d4e'].includes(pc));result=stack.#mint(0,0);bytes=4;
            }else if(pc==='1004b83d'&&capability.object===proof.value.imports.spyFindWindowProcedure){const window=proof.value.imports.spyFindWindow(stack.#numeric(stack.#load(stack.#stack,cursor+4),4),string(stack.#load(stack.#stack,cursor+8)));result=window?stack.#mint(0,0,{kind:'platform',object:window,category:'DiagnosticWindow'}):stack.#mint(0,0xffffffff);bytes=8;
            }else if(pc==='100b4490'&&capability.object===proof.value.imports.getModuleHandleA){
              frame.moduleCalls++;const module=proof.value.imports.getModule(string(stack.#load(stack.#stack,cursor+4)));result=module?stack.#mint(0,0,{kind:'platform',object:module,category:'GetModuleHandleA'}):stack.#mint(0,0xffffffff);bytes=4;
            }else if(pc==='100b44a0'&&capability.object===proof.value.imports.getProcAddress){
              frame.procedureCalls++;const procedure=proof.value.imports.getProcedure(object(stack.#load(stack.#stack,cursor+4)),string(stack.#load(stack.#stack,cursor+8)));result=procedure?stack.#mint(0,0,{kind:'platform',object:procedure,category:'IsProcessorFeaturePresent'}):stack.#mint(0,0xffffffff);bytes=8;
            }else if(pc==='100b44ac'&&capability.category==='IsProcessorFeaturePresent'){
              frame.featureCalls++;const value=proof.value.imports.queryFeature(capability.object,stack.#numeric(stack.#load(stack.#stack,cursor+4),4));result=stack.#mint(value,0xffffffff);bytes=4;
            }else if((pc==='100ae288'||pc==='100ae29f'||pc==='100ae2ff'||pc==='100ae316'||mode==='dll-spie-create-file'&&pc==='100ae38b')&&capability.object===proof.value.imports.tlsGetValue){
              const procedure=proof.value.imports.getTls(stack.#numeric(stack.#load(stack.#stack,cursor+4),4));result=procedure?stack.#mint(0,0,{kind:'platform',object:procedure,category:'InitializerPtdGetter'}):stack.#mint(0,0xffffffff);bytes=4;
            }else if((pc==='100ae2a1'||pc==='100ae318'||mode==='dll-spie-create-file'&&pc==='100ae4e0')&&capability.category==='InitializerPtdGetter'){
              const record=proof.value.imports.getPtd(capability.object,stack.#numeric(stack.#load(stack.#stack,cursor+4),4));result=record?pointer(record):stack.#mint(0,0xffffffff);bytes=4;
            }else if(pc==='100ae2dd'&&capability.category==='InitializerEncodePointer'){
              const argument=stack.#load(stack.#stack,cursor+4),pointerArgument=stack.#record(argument).provenance;const encoded=pointerArgument?.kind==='shared-local'?proof.value.imports.encodeAllocation(capability.object,pointerArgument.fields,pointerArgument.offset??0):proof.value.imports.encodeCode(capability.object,stack.#numeric(argument,4));result=encoded?stack.#mint(0,0,{kind:'platform',object:encoded,category:'InitializerEncodedCode'}):stack.#mint(0,0xffffffff);bytes=4;
            }else if(pc==='100ae354'&&capability.category==='InitializerDecodePointer'){
              const argument=stack.#load(stack.#stack,cursor+4),encoded=stack.#record(argument).provenance;if(mode==='dll-spie-init-descriptor-section'&&encoded?.kind==='platform'&&encoded.category==='InitializerSectionCache'){const decoded=proof.value.imports.decodeSectionInitializer(capability.object,encoded.object);result=typeof decoded==='number'?stack.#mint(decoded,0xffffffff):stack.#mint(0,0,{kind:'platform',object:decoded,category:'section'});bytes=4;}else {if(encoded?.kind!=='platform'||encoded.category!=='InitializerEncodedCode')throw new Error('Actual initializer encoded argument required');const decoded=proof.value.imports.decodePointer(capability.object,encoded.object);result=typeof decoded==='number'?stack.#mint(decoded,0xffffffff):stack.#offsetWord(pointer(decoded.fields),decoded.offset);bytes=4;}
            }else if((pc==='1003d449'&&capability.object===proof.value.imports.memorySectionInitializeProcedure)||((['1003d8f3','1003d91e','1003d463','1003d48a','1003cba3','1003cbc5'].includes(pc))&&capability.object===(['1003d8f3','1003d463','1003cba3'].includes(pc)?proof.value.imports.memorySectionEnterProcedure:proof.value.imports.memorySectionLeaveProcedure))){const section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(section?.kind!=='shared-local')throw new Error('Actual MemoryAdmin heap section pointer required');if(pc==='1003d449'){result=stack.#mint(proof.value.imports.memorySectionInitialize(section.fields,section.offset??0,stack.#numeric(stack.#load(stack.#stack,cursor+8),4)),0xffffffff);bytes=8;}else {proof.value.imports.memorySectionLock(section.fields,section.offset??0,['1003d8f3','1003d463','1003cba3'].includes(pc));result=stack.#mint(0,0);bytes=4;}
            }else if((pc==='100bb8ba'&&capability.object===proof.value.imports.memorySectionEnterProcedure)||(pc==='100bb7af'&&capability.object===proof.value.imports.memorySectionLeaveProcedure)){const section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(section?.kind!=='shared-local')throw new Error('Actual CRT section pointer required');proof.value.imports.crtSectionLock(section.fields,section.offset??0,pc==='100bb8ba');result=stack.#mint(0,0);bytes=4;
            }else if(pc==='100aaa0c'&&capability.object===proof.value.imports.crtHeapFreeProcedure){
              const heap=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,allocation=stack.#record(stack.#load(stack.#stack,cursor+12)).provenance;
              if(heap?.kind!=='heap'||allocation?.kind!=='shared-local')throw new Error('Actual CRT HeapFree heap and allocation arguments required');result=stack.#mint(proof.value.imports.crtHeapFree(heap.heap,stack.#numeric(stack.#load(stack.#stack,cursor+8),4),allocation.fields,allocation.offset??0),0xffffffff);bytes=12;
            }else if(pc==='100aab6e'&&capability.object===proof.value.imports.crtHeapAllocProcedure){
              const heap=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(heap?.kind!=='heap')throw new Error('Actual pool descriptor CRT heap argument required');const fields=proof.value.imports.crtHeapAlloc(heap.heap,stack.#numeric(stack.#load(stack.#stack,cursor+8),4),stack.#numeric(stack.#load(stack.#stack,cursor+12),4));result=fields?pointer(fields):stack.#mint(0,0xffffffff);bytes=12;
            }else if((pc==='10048654'||pc==='1003d237'||pc==='10047ed4'||pc==='10047f74'||pc==='100480b4'||pc==='10049054')&&capability.object===proof.value.imports.poolVirtualAllocProcedure){
              const region=proof.value.imports.poolVirtualAlloc(stack.#numeric(stack.#load(stack.#stack,cursor+4),4),stack.#numeric(stack.#load(stack.#stack,cursor+8),4),stack.#numeric(stack.#load(stack.#stack,cursor+12),4),stack.#numeric(stack.#load(stack.#stack,cursor+16),4));result=region?pointer(region):stack.#mint(0,0xffffffff);bytes=16;
            }else if((pc==='100e1455'||mode==='dll-message-error-get'&&pc==='10021978'||mode==='dll-message-spy-get'&&pc==='1004b498'||mode==='dll-message-spie-startup'&&pc==='1004afa8')&&capability.object===proof.value.imports.initializeSectionProcedure){const section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(section?.kind!=='shared-local')throw new Error('Actual original static section pointer required');proof.value.imports.initializeSection(section.fields,section.offset??0);result=stack.#mint(0,0);bytes=4;
            }else if(pc==='100b1158'&&capability.object===proof.value.imports.heapSizeProcedure){
              const heap=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance,allocation=stack.#record(stack.#load(stack.#stack,cursor+12)).provenance;if(heap?.kind!=='heap'||allocation?.kind!=='shared-local')throw new Error('Actual original HeapSize pointer arguments required');result=stack.#mint(proof.value.imports.heapSize(heap.heap,stack.#numeric(stack.#load(stack.#stack,cursor+8),4),allocation.fields,allocation.offset??0),0xffffffff);bytes=12;
            }else throw new Error('Actual original SharedBase initializer import call required');
            stack.#store(stack.#bank,stack.#reg('EAX'),result);for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret(bytes);pc=next;continue;
          }
          if(pc==='100bb847'){
            if(stack.#numeric(callee,4)!==0x100bbf27)throw new Error('Original CRT section initializer target required');const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),section=stack.#record(stack.#load(stack.#stack,cursor+4)).provenance;if(section?.kind!=='shared-local')throw new Error('Actual original CRT section allocation required');const result=proof.value.imports.initializeCrtSection(section.fields,section.offset??0,stack.#numeric(stack.#load(stack.#stack,cursor+8),4));stack.#store(stack.#bank,stack.#reg('EAX'),stack.#mint(result,0xffffffff));for(const name of ['ECX','EDX'] as const)stack.#store(stack.#bank,stack.#reg(name),stack.#mint(0,0));stack.#flags(0,0);stack.#ret();pc=next;continue;
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
          if(mode==='dll-message-error-register'&&pc==='10049dd2'){const receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance,cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')));if(target!=='10004133'||!stack.#memoryMallocFrame?.returned||receiver?.kind!=='shared-local'||receiver.fields!==images['10142798']||receiver.offset!==8||stack.#numeric(stack.#load(stack.#stack,cursor+4),4)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==108)throw new Error('Actual original callback array allocation frame required');stack.#memoryMallocFrame={oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false};}
          if(mode==='dll-message-holder'&&pc==='10020c8a'){
            if(target!=='10007441'||stack.#memoryMallocFrame&&!stack.#memoryMallocFrame.returned)throw new Error('Original holder Malloc source frame required');stack.#memoryMallocFrame={oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false};
          }

          if((mode==='dll-language-free'||mode==='dll-version-free')&&pc==='1003cb0e'){
            if(target!=='10004061')throw new Error('Original 1792-byte pool Free callback required');
          }

          if(pc==='1001325e'&&target==='10003cd8'){const receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance,scope=images['100f8318']!,raw='ffffffffa5d40310afd40310';if(receiver?.kind!=='shared-local'||receiver.fields!==images['10142798']||receiver.offset!==8||stack.#memoryMallocFrame&&!stack.#memoryMallocFrame.returned)throw new Error('Actual original MemoryAdmin singleton Malloc receiver required');for(let offset=0;offset<12;offset++)if(NativeHeapObjectViews.prototype.readUnsigned.call(scope,offset,1)!==parseInt(raw.slice(offset*2,offset*2+2),16))throw new Error('Original live MemoryAdmin Malloc scope required');stack.#memoryMallocFrame={oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false};}
          if(mode==='dll-spie-init-descriptor-section'&&pc==='100bbf2e'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),scope=stack.#load(stack.#stack,cursor+4),record=stack.#record(scope).provenance,fields=images['100f8d18'],raw='feffffff00000000ccffffff00000000feffffffadbf0b10c4bf0b10';
            if(target!=='100aeb68'||record?.kind!=='shared-local'||record.fields!==fields||(record.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==20||stack.#initializerSehFrames.get(pc)?.returned===false)throw new Error('Actual original descriptor section EH4 frame required');
            for(let i=0;i<28;i++)if(NativeHeapObjectViews.prototype.readUnsigned.call(fields!,i,1)!==parseInt(raw.slice(i*2,i*2+2),16))throw new Error('Original descriptor section scope bytes required');
            stack.#initializerSehFrames.set(pc,{scope,oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false});
          }
          if(mode==='dll-spie-allocate-descriptor'&&pc==='100d0d94'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),scope=stack.#load(stack.#stack,cursor+4),record=stack.#record(scope).provenance,fields=images['100f8fc0'],raw='feffffff00000000c8ffffff00000000feffffff00000000230f0d10';
            if(target!=='100aeb68'||record?.kind!=='shared-local'||record.fields!==fields||(record.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==24||stack.#initializerSehFrames.get(pc)?.returned===false)throw new Error('Actual original descriptor allocation SEH frame required');
            for(let i=0;i<28;i++)if(NativeHeapObjectViews.prototype.readUnsigned.call(fields!,i,1)!==parseInt(raw.slice(i*2,i*2+2),16))throw new Error('Original descriptor scope bytes required');
            stack.#initializerSehFrames.set(pc,{scope,oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false});
          }
          if(mode==='dll-spie-fclose'&&['100ac848','100bf6b5','100d0cd2'].includes(pc)){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),scope=stack.#load(stack.#stack,cursor+4),record=stack.#record(scope).provenance,address=pc==='100ac848'?'100f86d0':pc==='100bf6b5'?'100f8d98':'100f8fa0',fields=images[address],raw=({"100f86d0": "feffffff00000000d4ffffff00000000feffffff00000000b2c80a10", "100f8d98": "feffffff00000000d0ffffff00000000feffffff0000000071f70b10", "100f8fa0": "feffffff00000000d4ffffff00000000feffffff000000005d0d0d10"} as Record<string,string>)[address];
            if(target!=='100aeb68'||record?.kind!=='shared-local'||record.fields!==fields||(record.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==(pc==='100bf6b5'?16:12)||stack.#initializerSehFrames.get(pc)?.returned===false)throw new Error('Actual original fclose SEH scope required');
            for(let i=0;i<28;i++)if(fields!.readUnsigned(i,1)!==parseInt(raw!.slice(i*2,i*2+2),16))throw new Error('Original fclose live scope bytes required');
            stack.#initializerSehFrames.set(pc,{scope,oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false});
          }
          if(mode==='dll-spie-shared-open'&&pc==='100d1938'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),scope=stack.#load(stack.#stack,cursor+4),record=stack.#record(scope).provenance,fields=images['100f9048'],raw='feffffff00000000ccffffff00000000feffffff00000000ca190d10';
            if(target!=='100aeb68'||record?.kind!=='shared-local'||record.fields!==fields||(record.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==20||stack.#initializerSehFrames.get(pc)?.returned===false)throw new Error('Actual original shared file-open SEH frame required');
            for(let i=0;i<28;i++)if(NativeHeapObjectViews.prototype.readUnsigned.call(fields!,i,1)!==parseInt(raw.slice(i*2,i*2+2),16))throw new Error('Original shared file-open scope bytes required');
            stack.#initializerSehFrames.set(pc,{scope,oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false});
          }
          if(mode==='dll-spie-acquire-stream'&&pc==='100bfd76'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),scope=stack.#load(stack.#stack,cursor+4),record=stack.#record(scope).provenance,fields=images['100f8e20'],raw='feffffff00000000d0ffffff00000000feffffff0000000093fe0b10';if(target!=='100aeb68'||record?.kind!=='shared-local'||record.fields!==fields||(record.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==16||stack.#initializerSehFrames.get(pc)?.returned===false)throw new Error('Actual original stream acquisition SEH frame required');for(let i=0;i<28;i++)if(NativeHeapObjectViews.prototype.readUnsigned.call(fields!,i,1)!==parseInt(raw.slice(i*2,i*2+2),16))throw new Error('Original stream scope bytes required');stack.#initializerSehFrames.set(pc,{scope,oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false});
          }
          if(mode==='dll-message-spie-startup'&&pc==='100acbd6'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),scope=stack.#load(stack.#stack,cursor+4),record=stack.#record(scope).provenance,fields=images['100f8730'],raw='feffffff00000000d4ffffff00000000feffffff0000000089cc0a10';if(target!=='100aeb68'||record?.kind!=='shared-local'||record.fields!==fields||(record.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==12||stack.#initializerSehFrames.get(pc)?.returned===false)throw new Error('Actual original fopen SEH frame required');for(let i=0;i<28;i++)if(NativeHeapObjectViews.prototype.readUnsigned.call(fields!,i,1)!==parseInt(raw.slice(i*2,i*2+2),16))throw new Error('Original fopen scope bytes required');stack.#initializerSehFrames.set(pc,{scope,oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false});
          }
          if((pc==='100a729b'||pc==='100b10dd'||pc==='100b0909'||pc==='100c614c'||pc==='100bb7d6'||pc==='100aa9ab')&&target==='100aeb68'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),scope=stack.#load(stack.#stack,cursor+4),record=stack.#record(scope).provenance,onexit=pc==='100a729b',typeInfo=pc==='100b0909',demangler=pc==='100c614c',lockInitializer=pc==='100bb7d6',free=pc==='100aa9ab',fields=images[free?'100f8670':lockInitializer?'100f8c98':demangler?'100f8e80':typeInfo?'100f8b20':onexit?'100f8630':'100f8ba0'],raw=free?'feffffff00000000d4ffffff00000000feffffff00000000faa90a10':lockInitializer?'feffffff00000000d4ffffff00000000feffffff0000000089b80b10':demangler?'feffffff000000005cffffff00000000feffffff00000000dc610c10':typeInfo?'feffffff00000000d4ffffff00000000feffffff00000000eb090b10':onexit?'feffffff00000000d4ffffff00000000feffffff00000000ca720a10':'feffffff00000000d0ffffff00000000feffffff0000000068110b10';
            if(record?.kind!=='shared-local'||record.fields!==fields||(record.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==(demangler?132:onexit||typeInfo||lockInitializer||free?12:16)||stack.#initializerSehFrames.get(pc)?.returned===false)throw new Error('Actual original initializer SEH scope and reservation required');for(let offset=0;offset<28;offset++)if(NativeHeapObjectViews.prototype.readUnsigned.call(fields!,offset,1)!==parseInt(raw.slice(offset*2,offset*2+2),16))throw new Error('Original live initializer SEH scope required');
            stack.#initializerSehFrames.set(pc,{scope,oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),entered:false,returned:false});
          }
          if(pc==='100ce04c'&&target==='100aeb68'){
            const cursor=stack.#address(stack.#load(stack.#bank,stack.#reg('ESP'))),scope=stack.#load(stack.#stack,cursor+4),scopeRecord=stack.#record(scope).provenance,scopeFields=images['100f8ec0'];
            if((stack.#processorSimdFrame&&!stack.#processorSimdFrame.returned)||scopeRecord?.kind!=='shared-local'||scopeRecord.fields!==scopeFields||(scopeRecord.offset??0)!==0||stack.#numeric(stack.#load(stack.#stack,cursor+8),4)!==12)throw new Error('Actual processor SIMD scope and local reservation required');
            const raw='feffffff00000000d4ffffff00000000feffffff62e00c107ee00c10';for(let offset=0;offset<28;offset++)if(NativeHeapObjectViews.prototype.readUnsigned.call(scopeFields!,offset,1)!==parseInt(raw.slice(offset*2,offset*2+2),16))throw new Error('Original live processor SIMD scope bytes required');
            stack.#processorSimdFrame={oldFs:stack.#load(stack.#bank,32),oldEbp:stack.#load(stack.#bank,stack.#reg('EBP')),oldEbx:stack.#load(stack.#bank,stack.#reg('EBX')),oldEsi:stack.#load(stack.#bank,stack.#reg('ESI')),oldEdi:stack.#load(stack.#bank,stack.#reg('EDI')),scope,returned:false};
          }
          if(target==='10005731'||target==='10006a19'||target==='1000605a'||target==='10004557'||target==='1000322e'){const receiver=stack.#record(stack.#load(stack.#bank,stack.#reg('ECX'))).provenance;if(receiver?.kind!=='shared-local')throw new Error('Actual original bitmap pool receiver required');proof.value.imports.validatePoolRegion(receiver.fields,receiver.offset??0,target==='10005731'?112:target==='10006a19'?12:target==='1000605a'?16:target==='10004557'?24:1792);}
          if(!(mode==='dll-version-log-formatting'&&['100a7eab','100088b4'].includes(target))&&!(mode==='dll-spy-log-callback'&&target==='10006ebf')&&!(mode==='dll-error-log-insertion'&&['10006947','10007784','100aa880'].includes(target))&&!((mode==='dll-error-log-callback'||mode==='dll-error-log-formatting')&&target==='10006c1c')&&!(mode==='dll-message-log'&&target==='10006ebf')&&!(mode==='dll-spie-register'&&['1000631b'].includes(target))&&!(mode==='dll-spie-fclose'&&["100088b4","100ac841", "100ac7cf", "100befd6", "100ac8b5", "100bf7a7", "100bf77b", "100bf3f1", "100bf6ae", "100bf61a", "100d0c5a", "100d0bd9", "100d0ccb", "100bf771", "100aeb68", "100aebad", "100d0d6b", "100bf040"].includes(target))&&!(mode==='dll-spie-init-descriptor-section'&&['100aeb68','100aebad','100ae2f2','100bbf17','100d0e60','100d0f23'].includes(target))&&!(mode==='dll-spie-allocate-descriptor'&&['100aeb68','100d0e60','100d0f23','100aebad'].includes(target))&&!(mode==='dll-spie-shared-open'&&['100d1931','100aeb68','100d1122','100d44db','100aa49d'].includes(target))&&!(mode==='dll-spie-acquire-stream'&&['100aeb68','100aebad','100bfe96','100bf012','100bfacf'].includes(target))&&!(mode==='dll-message-spie-startup'&&['10008887','100088b4','10001c21','100acc93','100acbcf','100aeb68'].includes(target))&&!(mode==='dll-message-spy-create'&&['100088b4','10001c21','10007cac','1000631b'].includes(target))&&!(mode==='dll-message-error-register'&&['1000631b','10004133','100052fe'].includes(target))&&!(mode==='dll-message-error-buffer'&&['100052fe','10007644','10007aa9','100088b4'].includes(target))&&!(mode==='dll-message-error-create'&&['100032c4','100088b4','10001c21'].includes(target))&&!((mode==='dll-message-create'||mode==='dll-message-holder')&&['10006b7c','100010e1','10007441'].includes(target))&&!(mode==='dll-separator-logging'&&target==='100088b4')&&!(mode==='dll-version-integer'&&['100b46df','100b44b4','100a74b6','100b2b0b','100a99b3','100acd00','100a7942'].includes(target))&&!(mode==='dll-language-return'&&target==='1000781a')&&!((mode==='dll-language-free'||mode==='dll-version-free')&&['10002e46','10005b37','10004061'].includes(target))&&!((mode==='dll-language-output'||(mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting'))&&['100a74b6','100a99b3','100b5289','100b5355','100cdfb0','100b52bc','100b52e0'].includes(target))&&!((pc==='100ce0e2'&&target==='100ce045')||(pc==='100ce04c'&&target==='100aeb68')||(pc==='100ce08f'&&target==='100aebad')||((pc==='100a729b'||pc==='100b10dd'||pc==='100b0909'||pc==='100c614c'||pc==='100bb7d6'||pc==='100aa9ab')&&target==='100aeb68')||((pc==='100a72c4'||pc==='100b1162'||pc==='100bb883'||pc==='100aaa2c'||pc==='100c61d6'||pc==='100b09e5')&&target==='100aebad'))&&!(mode==='dll-spie-create-file'&&['100aedf7','100aede4','100aed96','100aedd1','100ae4cb','100ae384','100aebad','100d19cf','100d0d6b','100d0b5c','100acc89','100bf040'].includes(target))&&!['10003102','10001951','10005731','100028f6','10004683','10006a19','10007be9','1000322e','1000717b','100ae900','100ae880','100ae8b0','100a78fe','100a788e','100b4407','100b448b','100ae27b','100aa47d','100a7265','100aef10','100b1854','100b4b6b','100ce095','100bef05','100ce0f5','100a72d0','100a7294','100a71ac','100ae2f2','100b10d6','100aa453','100aa45c','100a72ca','100e1660','100e1440','100e1450','100e1470','100e14b0','100e14c0','100e14d0','100e14e0','100e14f0','100e1500','100e1510','100e15d0','100e1600','100e1610','100e1630','100e1670','100e1680','1000779d','10005e5c','1000619f','100a7099','100b0902','100c6142','100bb7cf','100aeed0','100bb892','100bb7a2','100bb889','10004214','10002b3f','10004557','100088cd','10091550','100a7430','100a7300','100c0e29','100b09ee','100b2a80','100c14dd','100c61dc','100aa9a4','100c2048','100c2301','100c22b2','100c1feb','100c22e3','100c1d9c','100c27dd','100c21f4','100c1d3a','100c1da0','100c43c1','100c41d7','100c25e0','100c21ad','100c1f89','100b01c8','100c28e6','100c24e3','100c223b','100c1e13','100c44b4','100c6288','100c1c80','100c29ed','100c1b6a','100c1fa0','100c59ab','100c2589','100c51ce','100c674d','100c1ed2','100c660f','100c5e8f','100c2351','100c218f','100c1f28','100c1ac7','100c1dcf','10003ba7','10007d65','10002aae','10003cd8','10001028','10002d97','100061cc','100aabd2','100aaaf6','100a7980','100012e4','1000605a','100a7a00'].includes(target))throw new Error('Unowned SharedBase initializer child at '+pc+' -> '+target+' (cinit 100aa632)');
          pc=target;continue;
        }else if(opcode==='RET'){
          if(mode==='dll-message-error-buffer'&&pc==='1003d2e0'){const slot=stack.#record(stack.#load(stack.#bank,stack.#reg('EAX'))).provenance;if(slot?.kind!=='shared-local')throw new Error('Original variable-pool allocated pointer required');stack.#store(stack.#bank,stack.#reg('EAX'),pointer(proof.value.imports.retainVariablePoolSlot(slot.fields,slot.offset??0)));}
          if(pc==='1003e8a6'||pc==='1003e066'||pc==='1003e116'||pc==='1003e276'||pc==='1003f3a6'){const word=stack.#load(stack.#bank,stack.#reg('EAX')),slot=stack.#record(word).provenance;if(slot?.kind==='shared-local')stack.#store(stack.#bank,stack.#reg('EAX'),pointer(proof.value.imports.retainPoolSlot(slot.fields,slot.offset??0,pc==='1003e8a6'?112:pc==='1003e066'?12:pc==='1003e116'?16:pc==='1003e276'?24:1792)));else if(stack.#numeric(word,4)!==0)throw new Error('Original bitmap allocator return required');}
          if((mode==='dll-language-free'||mode==='dll-version-free')&&pc==='10045648')proof.value.imports.releasePoolSlot((mode==='dll-version-free'?stack.#sharedDllResourceFrame:stack.#sharedDllLanguageFrame)!.buffer!);
          const continuation=stack.#record(stack.#ret(args.length?stack.#numeric(read(args[0]!),4):0)).provenance;if(continuation?.kind!=='source')throw new Error('Actual initializer return required');
          if(mode==='dll-version-free'&&continuation.address==='100a15c6'){
            const entry=stack.#sharedDllVersionFrame!.entryEsp;
            if(pc!=='1004c66d'||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==entry+24||stack.#load(stack.#bank,stack.#reg('EBX'))!==stack.#load(stack.#stack,entry-0x11c)||stack.#load(stack.#bank,stack.#reg('EBP'))!==stack.#load(stack.#stack,entry-0x120)||stack.#load(stack.#bank,stack.#reg('ESI'))!==stack.#load(stack.#stack,entry-0x124)||stack.#load(stack.#bank,stack.#reg('EDI'))!==stack.#load(stack.#stack,entry-0x128)||stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4)!==1)throw new Error('Original DLL version query caller restoration and success required');
          }
          if(mode==='dll-version-free'&&continuation.address==='1004c660'){
            const entry=stack.#sharedDllResourceFrame!.entryEsp;
            if(pc!=='1004c578'||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==entry+24||stack.#load(stack.#bank,stack.#reg('EBP'))!==stack.#load(stack.#stack,entry-20)||stack.#load(stack.#bank,stack.#reg('EBX'))!==stack.#load(stack.#stack,entry-16)||stack.#load(stack.#bank,stack.#reg('EDI'))!==stack.#load(stack.#stack,entry-12)||stack.#load(stack.#bank,stack.#reg('ESI'))!==stack.#load(stack.#stack,entry-8)||stack.#numeric(stack.#mint(stack.#record(stack.#load(stack.#bank,stack.#reg('EAX'))).value&255,stack.#record(stack.#load(stack.#bank,stack.#reg('EAX'))).mask&255),1)!==1)throw new Error('Original version fallback frame restoration and success required');
          }
          if((mode==='dll-version-token'||mode==='dll-version-integer')&&['1004c42f','1004c453','1004c472','1004c491'].includes(continuation.address)){
            if(pc!=='100acdbe'||!tokenSaved||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==tokenSaved.esp+4||stack.#load(stack.#bank,stack.#reg('EBP'))!==tokenSaved.ebp||stack.#load(stack.#bank,stack.#reg('EBX'))!==tokenSaved.ebx||stack.#load(stack.#bank,stack.#reg('ESI'))!==tokenSaved.esi||stack.#load(stack.#bank,stack.#reg('EDI'))!==tokenSaved.edi)throw new Error('Original strtok saved-register and caller restoration required');
          }
          if(mode==='dll-language-return'&&continuation.address==='1004c52a'){
            const language=stack.#sharedDllLanguageFrame!,result=stack.#record(stack.#load(stack.#bank,stack.#reg('EAX'))).provenance;
            if(pc!=='1004c3fe'||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==language.entryEsp+8||result?.kind!=='shared-local'||result.fields!==images['101ab190']||(result.offset??0)!==0)throw new Error('Original language helper return and actual output required');
          }
          if((mode==='dll-language-free'&&continuation.address==='1004c3f5')||(mode==='dll-version-free'&&continuation.address==='1004c571')){
            if(pc!=='1003cbdb'||!freeSaved||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==freeSaved.esp+8||stack.#load(stack.#bank,stack.#reg('EBP'))!==freeSaved.ebp||stack.#load(stack.#bank,stack.#reg('EBX'))!==freeSaved.ebx||stack.#load(stack.#bank,stack.#reg('ESI'))!==freeSaved.esi||stack.#load(stack.#bank,stack.#reg('EDI'))!==freeSaved.edi||stack.#load(stack.#bank,32)!==freeSaved.fs)throw new Error('Original MemoryAdmin Free frame restoration required');stack.#currentPc=stack.#source('code',continuation.address);if(mode==='dll-language-free')throw new Error('Original SharedBase language cleanup returned');
          }
          if(mode==='dll-message-error-register'&&continuation.address==='10049dd7'||mode==='dll-message-error-buffer'&&continuation.address==='100227ad'||continuation.address==='10013263'||mode==='dll-message-holder'&&continuation.address==='10020c8f'||mode!=='cinit'&&continuation.address===(mode==='dll-language-malloc'?'1004c2f7':'1004c4f6')){const malloc=stack.#memoryMallocFrame;if(!malloc?.entered||stack.#load(stack.#bank,32)!==malloc.oldFs||stack.#load(stack.#bank,stack.#reg('EBP'))!==malloc.oldEbp||stack.#load(stack.#bank,stack.#reg('EBX'))!==malloc.oldEbx||stack.#load(stack.#bank,stack.#reg('ESI'))!==malloc.oldEsi||stack.#load(stack.#bank,stack.#reg('EDI'))!==malloc.oldEdi)throw new Error('Original MemoryAdmin Malloc frame restoration required');malloc.returned=true;}
          if(mode==='dll-spy-log-callback'&&continuation.address==='100494dd'){
            const saved=spyLogCaller,result=stack.#record(stack.#load(stack.#bank,stack.#reg('EAX')));
            if(!saved||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==saved.esp+32||stack.#load(stack.#bank,stack.#reg('EBP'))!==saved.ebp||stack.#load(stack.#bank,stack.#reg('EBX'))!==saved.ebx||stack.#load(stack.#bank,stack.#reg('ESI'))!==saved.esi||stack.#load(stack.#bank,stack.#reg('EDI'))!==saved.edi||stack.#load(stack.#bank,32)!==saved.fs||(result.mask&255)!==255)throw new Error('Original SpyAdmin callback caller restoration and AL result required');
          }
          if(mode==='dll-error-log-allocation'&&continuation.address==='10022618'){
            const allocation=stack.#record(stack.#load(stack.#bank,stack.#reg('EAX'))).provenance,saved=errorLogAllocation;
            if(!saved||allocation?.kind!=='shared-local'||(allocation.offset??0)!==0||allocation.fields.bytes.length!==saved.size||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==saved.esp+4||stack.#load(stack.#bank,stack.#reg('EBP'))!==saved.ebp||stack.#load(stack.#bank,stack.#reg('EBX'))!==saved.ebx||stack.#load(stack.#bank,stack.#reg('ESI'))!==saved.esi||stack.#load(stack.#bank,stack.#reg('EDI'))!==saved.edi||stack.#load(stack.#bank,32)!==saved.fs)throw new Error('Actual original ErrorAdmin malloc result and caller restoration required');saved.buffer=allocation.fields;
          }
          if(mode!=='cinit'&&continuation.address===(mode==='dll-language-malloc'?'1004c2f7':'1004c4f6')){
            const result=stack.#record(stack.#load(stack.#bank,stack.#reg('EAX'))).provenance;if(result?.kind!=='shared-local')throw new Error('Actual owned version buffer malloc result required');const offset=result.offset??0;if(result.fields.bytes.length-offset<(mode==='dll-language-malloc'?1741:1740))throw new Error('Actual version allocation extent required');const allocation=mode==='dll-language-malloc'?stack.#sharedDllLanguageFrame!:stack.#sharedDllResourceFrame!;allocation.buffer=Object.freeze({fields:result.fields,offset});stack.#currentPc=stack.#source('code',continuation.address);throw new Error(mode==='dll-language-malloc'?'Original SharedBase language buffer allocation ready':'Original SharedBase version buffer initialized allocation pending at 1004c4f6');
          }
          if(['100ac84d','100ac88f','100bf6ba','100bf770','100d0cd7','100d0d5c','100bbf33','100bbfeb','100d0f22','100d0d99','100d193d','100bfd7b','100bfe92','100acbdb','100a72a0','100b10e2','100b090e','100c6151','100bb7db','100bb888','100a72c9','100b1167','100aa9b0','100aaa31','100c61db','100b09ea'].includes(continuation.address)){
            const enter=['100ac84d','100bf6ba','100d0cd7'].includes(continuation.address)||continuation.address==='100bbf33'||continuation.address==='100d0d99'||continuation.address==='100d193d'||continuation.address==='100bfd7b'||continuation.address==='100acbdb'||continuation.address==='100a72a0'||continuation.address==='100b10e2'||continuation.address==='100b090e'||continuation.address==='100c6151'||continuation.address==='100bb7db'||continuation.address==='100aa9b0',site=['100ac84d','100ac88f'].includes(continuation.address)?'100ac848':['100bf6ba','100bf770'].includes(continuation.address)?'100bf6b5':['100d0cd7','100d0d5c'].includes(continuation.address)?'100d0cd2':['100bbf33','100bbfeb'].includes(continuation.address)?'100bbf2e':continuation.address==='100d0f22'?'100d0d94':continuation.address==='100d0d99'?'100d0d94':continuation.address==='100d193d'?'100d1938':continuation.address==='100bfd7b'||continuation.address==='100bfe92'?'100bfd76':continuation.address==='100acbdb'?'100acbd6':continuation.address==='100b09ea'?'100b0909':continuation.address==='100aa9b0'||continuation.address==='100aaa31'?'100aa9ab':continuation.address==='100c61db'?'100c614c':continuation.address==='100bb7db'||continuation.address==='100bb888'?'100bb7d6':continuation.address==='100c6151'?'100c614c':continuation.address==='100b090e'?'100b0909':continuation.address.startsWith('100a72')?'100a729b':'100b10dd',frame=stack.#initializerSehFrames.get(site);if(!frame)throw new Error('Actual initializer SEH frame required');
            if(enter){const ebp=stack.#address(stack.#load(stack.#bank,stack.#reg('EBP'))),encoded=stack.#record(stack.#load(stack.#stack,ebp-8)).provenance;if(encoded?.kind!=='xor'||encoded.left!==frame.scope||stack.#address(stack.#load(stack.#bank,32))!==ebp-16||stack.#load(stack.#stack,ebp-16)!==frame.oldFs)throw new Error('Original initializer SEH prologue relations required');frame.ebp=ebp;frame.entered=true;}
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
          if((mode==='dll-language-output'||(mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting'))&&(continuation.address==='100aa28c'||mode==='dll-version-log-formatting'&&continuation.address==='100a7f04')){
            const saved=stack.#sharedDllOutputRegisters!;
            if(pc!=='100b5cc8'||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==saved.entryEsp+4||stack.#load(stack.#bank,stack.#reg('EBP'))!==saved.oldEbp||stack.#load(stack.#bank,stack.#reg('EBX'))!==saved.oldEbx||stack.#load(stack.#bank,stack.#reg('ESI'))!==saved.oldEsi||stack.#load(stack.#bank,stack.#reg('EDI'))!==saved.oldEdi||stack.#load(stack.#bank,32)!==saved.oldFs)throw new Error('Original output engine saved-register and FS restoration required');
          }
          if((mode==='dll-language-output'||(mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting'))&&['1004c31d','1004c36f','10022637'].includes(continuation.address)){
            const fmt=stack.#sharedDllFormatFrame!;
            if(pc!=='100aa2ae'||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==fmt.entryEsp+4||stack.#load(stack.#bank,stack.#reg('EBP'))!==stack.#load(stack.#stack,fmt.ebp)||stack.#load(stack.#bank,stack.#reg('EBX'))!==stack.#load(stack.#stack,fmt.ebp-36)||stack.#load(stack.#bank,stack.#reg('ESI'))!==stack.#load(stack.#stack,fmt.ebp-40))throw new Error('Actual original sprintf caller restoration required');
          }
          if(mode==='dll-version-log-formatting'&&continuation.address==='10049876'){
            const saved=versionFormatCaller!;
            if(pc!=='100a7f3d'||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==saved.esp+4||stack.#load(stack.#bank,stack.#reg('EBP'))!==saved.ebp||stack.#load(stack.#bank,stack.#reg('EBX'))!==saved.ebx||stack.#load(stack.#bank,stack.#reg('ESI'))!==saved.esi||stack.#load(stack.#bank,stack.#reg('EDI'))!==saved.edi||stack.#load(stack.#bank,32)!==saved.fs)throw new Error('Original version formatter caller restoration required');
          }
          if(mode==='dll-spy-log-callback'&&continuation.address==='100adc91'){
            // This graph entered the direct DLL ABI; the surrounding CRT wrapper
            // has not executed. Stop at the actual DLL RET, before that wrapper.
            const call=stack.#calls.findLast(row=>row.site==='100adc8c'),crt=stack.#sharedCrtCallerFrame;
            if(pc!=='100a164f'||row.instruction!=='RET 0xc'||!call?.returned||!crt?.returned||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==call.position+16||stack.#load(stack.#bank,stack.#reg('EBP'))!==crt.oldEbp||stack.#load(stack.#bank,stack.#reg('EBX'))!==crt.oldEbx||stack.#load(stack.#bank,stack.#reg('ESI'))!==crt.oldEsi||stack.#load(stack.#bank,stack.#reg('EDI'))!==crt.oldEdi||stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4)!==1||!stack.#calls.findLast(row=>row.site==='100a1645')?.returned)throw new Error('Actual original direct DLL caller restoration required');
            stack.#phase='returned';stack.#boundary=null;stack.#currentPc=stack.#source('code','100adc91');return known(1);
          }
          if(continuation.address==='100adc7e'){
            const crt=stack.#sharedCrtCallerFrame;if(pc!=='100adc22'||!crt||crt.controller!==controller||crt.returned||frame.initializerResult!==0||stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==crt.entryEsp||stack.#load(stack.#bank,stack.#reg('EBP'))!==crt.oldEbp||stack.#load(stack.#bank,stack.#reg('EBX'))!==crt.oldEbx||stack.#load(stack.#bank,stack.#reg('ESI'))!==crt.oldEsi||stack.#load(stack.#bank,stack.#reg('EDI'))!==crt.oldEdi||stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4)!==1)throw new Error('Original SharedBase CRT caller restoration and return required');crt.returned=true;stack.#phase='returned';stack.#currentPc=stack.#source('code','100adc7e');return known(1);
          }
          if(continuation.address==='100adb5f'){frame.initializerResult=stack.#numeric(stack.#load(stack.#bank,stack.#reg('EAX')),4);stack.#currentPc=stack.#source('code','100adb5f');if(frame.initializerResult!==0)throw new Error('Unowned SharedBase attach continuation after initializer result '+frame.initializerResult);}
          pc=continuation.address;continue;
        }else throw new Error('Unowned SharedBase initializer opcode '+opcode);
        pc=next;
      }
    }catch(error){const current=stack.#currentPc?stack.#record(stack.#currentPc).provenance:null;stack.#phase='blocked';const failure=reason(error)+(current?.kind==='source'?' at '+current.address:'');if((mode==='dll-language-output'||(mode==='dll-language-translated-output'||mode==='dll-error-log-formatting'||mode==='dll-version-log-formatting'))||mode==='dll-language-translation'||mode==='dll-language-version-copy'||mode==='dll-language-free'||mode==='dll-language-return'||mode==='dll-version-token'||mode==='dll-version-integer'||mode==='dll-version-free'||mode==='dll-separator-logging'||mode==='dll-message-create'||mode==='dll-message-holder'||mode==='dll-message-error-get'||mode==='dll-message-error-create'||mode==='dll-message-error-buffer'||mode==='dll-message-error-register'||mode==='dll-message-error-terminate'||mode==='dll-message-spy-get'||mode==='dll-message-spy-create'||mode==='dll-message-spy-terminate'||mode==='dll-message-spie-startup'||mode==='dll-spie-acquire-stream'||mode==='dll-spie-shared-open'||mode==='dll-spie-allocate-descriptor'||mode==='dll-spie-init-descriptor-section'||mode==='dll-spie-create-file'||mode==='dll-spie-fclose'||mode==='dll-spie-register'||mode==='dll-spie-terminate'||mode==='dll-message-terminate'||mode==='dll-message-log'||mode==='dll-error-log-callback'||mode==='dll-error-log-allocation'||mode==='dll-error-log-insertion'||mode==='dll-spy-log-callback'||mode==='dll-version-log-tls')stack.#boundary=failure;else stack.#boundary??=failure;return unknown(stack.#boundary);}
    finally{stack.#dllMemoryController=null;}
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
    if(crt.module==='Game'&&crt.host.platform===stack.#platform&&stack.#phase==='returned'&&!stack.#binding&&!stack.#sharedToGameHandoff){
      const shared=NativeSharedCrtOwner.forPlatform(stack.#platform);
      const state=NativeSharedCrtOwner.prototype.snapshot.call(shared),frame=stack.#sharedCrtCallerFrame;
      const continuation=stack.#currentPc?stack.#record(stack.#currentPc).provenance:null;
      if(state.attachReturned!==1||!state.ptdInstalled||!state.ptdInitialized||!frame?.returned||
        !stack.#sharedInitializerFrame?.fsRestored||
        stack.#load(stack.#bank,32)!==stack.#sharedInitializerFrame.oldFs||
        continuation?.kind!=='source'||continuation.type!=='code'||continuation.address!=='100adc7e'||
        stack.#boundary||stack.#executing||stack.#calls.some(call=>!call.returned)||
        stack.#address(stack.#load(stack.#bank,stack.#reg('ESP')))!==frame.entryEsp||
        stack.#load(stack.#bank,stack.#reg('EBP'))!==frame.oldEbp||
        stack.#load(stack.#bank,stack.#reg('EBX'))!==frame.oldEbx||
        stack.#load(stack.#bank,stack.#reg('ESI'))!==frame.oldEsi||
        stack.#load(stack.#bank,stack.#reg('EDI'))!==frame.oldEdi)
        return unknown('Actual restored SharedBase CRT helper required for Game handoff');
      stack.#physical(stack.#stack);stack.#physical(stack.#bank);
      stack.#sharedToGameHandoff=true;
      stack.#trace.push('SharedBase.returnedHelper.GameIoHandoff');
    }
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game' || crt.host.platform !== stack.#platform ||
      (stack.#phase !== 'cold'&&!(stack.#phase==='returned'&&stack.#sharedToGameHandoff))) {
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
    const engine=engineStartupCalls.get(grant);
    if(engine){try{if(graphs.get(platform)!==engine.stack)throw new Error('Actual same-platform Engine startup call required');engine.stack.#engineStartupProof(engine);return known(undefined);}catch(error){return unknown(reason(error));}}
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
    const engine=engineStandardCalls.get(grant);if(engine){try{if(graphs.get(platform)!==engine.stack)throw new Error('Actual Engine standard-I/O graph required');engine.stack.#engineStandardProof(engine);return known(engine.args);}catch(error){return unknown(reason(error));}}
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
    const call = engineStartupCalls.get(grant)??startupCalls.get(grant)!;
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
      const engine=engineStartupCalls.get(grant);if(engine)stack.#engineStartupProof(engine);else stack.#startupProof(grant,call as StartupCall); return known(undefined);
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
    if(this.#aiHelperAccessorQueryNode&&this.#setEnvpBinding&&pointer===this.#aiHelperAccessorQueryNode.pointer(4).get()) {
      const crt=this.#setEnvpBinding.crt as NativeGameCrtOwner,memory=nativeGameLayerBaseMemoryForCrt(crt);if(!memory.known)throw new Error(memory.reason);
      const type=NativeGameAIHelperAdminType.forCrt(crt,memory.value),wrapper=type.snapshot().wrapper;
      if(!wrapper||pointer!==wrapper||wrapper.freed||wrapper.region.freed)throw new Error('Actual live registered AI helper type wrapper required');
      const fields=new NativeHeapObjectViews(wrapper,0,wrapper.capacity);
      this.#arenaAllocations.set(fields,{owner:memory.value,allocation:wrapper});this.#sharedLocalPhysical(fields);
      const word=this.#mint(wrapper.offset&3,3,{kind:'shared-local',fields});this.#nativePointers.set(pointer,word);return word;
    }

    if (this.#setEnvpBinding && pointer && 'fields' in pointer && 'offset' in pointer) {
      const original = NativeModuleCrtOwner.canonicalEnvironmentAllocationForPlatform(this.#binding!.crt, this.#platform, pointer as NativeBytePointer);
      if (original.known) {
        const allocation = this.#allocationFromBacking(original.value.logical.backing as NativeMemoryBacking, original.value.heap, original.value.pointer);
        const word = this.#allocationWord(allocation, 0); this.#nativePointers.set(pointer, word); return word;
      }
    }
    const heap = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(this.#binding!.crt, this.#platform);
    if (heap.known && heap.value === pointer) return this.#mint(0, 0, { kind: 'heap', heap: heap.value });
    const labels = ['aiHelperAdminTypeAndGuard','aiHelperAdminTypeVtable','mbcObject', 'mbcRefCounter', 'defaultLocale', 'currentLocale', 'moduleName', 'globalMbcType', 'globalMbcCase', 'globalMbcFields', 'CPtable', 'crtStaticSections'];
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
        // Only the selected original pointer cells establish this loader
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
          !['2047653f', '2047656d', '2047472e', '20474747'].includes(outer.site) || outer.site !== call.args.callerSite || outer.position !== call.frame + 0x1c) throw new Error('Actual environment calloc wrapper/caller slots required');
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
    const allocation=this.#arenaAllocations.get(fields);
    if(allocation && this.#setEnvpBinding) {
      const memory=nativeGameLayerBaseMemoryForCrt(this.#setEnvpBinding.crt as NativeGameCrtOwner);
      if(!memory.known || memory.value!==allocation.owner || !NativeMemoryAdmin.prototype.usesPlatform.call(allocation.owner,this.#platform) ||
        fields.backing!==allocation.allocation || fields.backing.freed || allocation.allocation.region.freed ||
        fields.bytes.buffer!==allocation.allocation.bytes.buffer || fields.bytes.byteOffset!==allocation.allocation.bytes.byteOffset ||
        fields.bytes.length!==allocation.allocation.capacity || fields.knownMask.buffer!==allocation.allocation.knownMask.buffer ||
        fields.knownMask.byteOffset!==allocation.allocation.knownMask.byteOffset || fields.knownMask.length!==fields.bytes.length ||
        dataViewBuffer.call(fields.view)!==fields.bytes.buffer || dataViewByteOffset.call(fields.view)!==fields.bytes.byteOffset ||
        dataViewByteLength.call(fields.view)!==fields.bytes.length)
        throw new Error('Actual retained Arena SharedBase allocation required');
      return;
    }
    if(this.#arenaPropertySingleton?.ranges.object===fields && this.#setEnvpBinding) {
      const memory=nativeGameLayerBaseMemoryForCrt(this.#setEnvpBinding.crt as NativeGameCrtOwner);
      if(!memory.known)throw new Error(memory.reason);
      const owner=NativePropertySingleton.forPlatform(this.#platform,memory.value);
      const image=NativeSharedModuleImage.forPlatform(this.#platform);
      if(!owner.known || owner.value!==this.#arenaPropertySingleton || !image.known)
        throw new Error('Actual same-platform Arena property singleton owner required');
      const ranges=image.value.propertySingletonRanges();
      if(!ranges.known || ranges.value!==owner.value.ranges || ranges.value.object!==fields || fields.backing.freed ||
        fields.knownMask.length!==fields.bytes.length || dataViewBuffer.call(fields.view)!==fields.bytes.buffer ||
        dataViewByteOffset.call(fields.view)!==fields.bytes.byteOffset || dataViewByteLength.call(fields.view)!==fields.bytes.length)
        throw new Error('Actual retained property singleton physical image required');
      return;
    }
    const proof=this.#dllMemoryController?NativeSharedCrtOwner.dllMallocLocalStorageForPlatform(this.#platform,this.#dllMemoryController,fields):NativeSharedCrtOwner.argvLocalStorageForPlatform(this.#platform,this.#sharedArgvFrame?.controller??token,fields);if(!proof.known)throw new Error(proof.reason);
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
    if (p?.kind === 'platform' && p.category === 'GameCinitEncoded') {
      const active = NativeRuntimePlatform.requireActivePlatform(this.#platform);
      if (!active.known || !this.#setEnvpBinding || !this.#cinitEncodedPointers.has(p.object)) throw new Error('Actual same-Game encoded initializer pointer required');
      this.#moduleWord('cinitFloatPointerTable', 0); return record;
    }
    if (p?.kind === 'platform' && p.category === 'GameCinitModule') {
      const proof = NativeRuntimePlatform.canonicalWin32ModuleForPlatform(this.#platform, p.object);
      if (!proof.known) throw new Error(proof.reason); return record;
    }
    if (p?.kind === 'platform' && p.category === 'GameCinitFeature') {
      const proof = NativeRuntimePlatform.canonicalProcessorFeatureProcedureForPlatform(this.#platform, p.object);
      if (!proof.known) throw new Error(proof.reason); return record;
    }
    if(p?.kind==='difference'){this.#liveWord(p.left);this.#liveWord(p.right);}
    if(p?.kind==='engine-locale'){const frame=this.#engineArgvFrame;if(!frame||!this.#engineArgvExecuting||frame.crt!==p.crt)throw new Error('Actual active Engine locale frame required');const owned=NativeCrtBootstrap.engineArgvLocaleForCrt(frame.bootstrap,p.crt,frame.permit);if(!owned.known)throw new Error(owned.reason);if(owned.value.original!==p.fields)throw new Error('Actual Engine locale image required');}
    if(p?.kind==='engine-mbc'){const frame=this.#engineArgvFrame;if(!frame||!this.#engineArgvExecuting||frame.crt!==p.crt)throw new Error('Actual active Engine MBC frame required');const owned=NativeCrtBootstrap.engineArgvMbcForCrt(frame.bootstrap,p.crt,frame.permit);if(!owned.known)throw new Error(owned.reason);if(owned.value!==p.fields||!Number.isSafeInteger(p.offset??0)||(p.offset??0)<0||(p.offset??0)>p.fields.bytes.length)throw new Error('Actual Engine MBC image and offset required');}
    if(p?.kind==='engine-ptd'){if(p.crt.module!=='Engine'||p.crt.host.platform!==this.#platform)throw new Error('Actual Engine PTD owner required');const owned=NativeCrtThreadStartup.canonicalPtdForCrt(p.crt,p.fields);if(!owned.known)throw new Error(owned.reason);}
    if(p?.kind==='engine-allocation'){const owned=NativeModuleCrtOwner.canonicalEngineHeapDestination(p.crt,this.#platform,{fields:p.fields,offset:p.offset},0);if(!owned.known)throw new Error(owned.reason);}
    if (p?.kind === 'allocation') this.#allocationLive(p.allocation, p.offset, 0);
    if (p?.kind === 'module') this.#moduleWord(p.label, p.offset);
    if (p?.kind === 'process') this.#processWord(p.pointer);
    if (p?.kind === 'neg') this.#liveWord(p.word);
    if (p?.kind === 'xor' && this.#setEnvpBinding) { this.#liveWord(p.left); this.#liveWord(p.right); }
    if (p?.kind === 'heap') {
      const heap = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(this.#binding!.crt, this.#platform);
      if (!heap.known || heap.value !== p.heap) throw new Error(heap.known ? 'Current heap word differs from its actual Game heap' : heap.reason);
    }
    if(p?.kind==='platform'&&p.category==='InitializerFileHandle'){if(!NativeRuntimePlatform.recognizesFileHandle(this.#platform,p.object))throw new Error('Actual same-platform file HANDLE identity required');return record;}
    if(p?.kind==='platform'&&['InitializerGetLastError','InitializerSetLastError','InitializerGetFileType'].includes(p.category)){
      if(!this.#sharedInitializerFrame)throw new Error('Actual retained CRT file import continuation required');const proof=NativeSharedCrtOwner.initializerStackArgumentsForPlatform(this.#platform,this.#dllMemoryController??this.#sharedInitializerFrame.controller);if(!proof.known)throw new Error(proof.reason);const expected=p.category==='InitializerGetLastError'?proof.value.imports.spieGetLastErrorProcedure:p.category==='InitializerSetLastError'?proof.value.imports.spieSetLastErrorProcedure:proof.value.imports.spieGetFileTypeProcedure;if(p.object!==expected)throw new Error('Actual original file import identity required');return record;
    }
    if(p?.kind==='platform'&&p.category==='DiagnosticWindow'){if(!NativeRuntimePlatform.ownsDiagnosticWindow(this.#platform,p.object))throw new Error('Actual owned diagnostic window required');return record;}
    if(p?.kind==='platform'&&(p.category==='InitializerSectionCache'||p.category==='InitializerCreateFileA')){
      if(!this.#sharedInitializerFrame)throw new Error('Actual retained initializer import continuation required');const proof=NativeSharedCrtOwner.initializerStackArgumentsForPlatform(this.#platform,this.#dllMemoryController??this.#sharedInitializerFrame.controller);if(!proof.known)throw new Error(proof.reason);
      if((p.category==='InitializerSectionCache'?proof.value.imports.sectionCachePointer():proof.value.imports.spieCreateFileProcedure)!==p.object)throw new Error('Actual descriptor initializer/import identity required');return record;
    }
    if (p?.kind === 'platform' && p.category==='InitializerEncodedCode') {
      if(!this.#sharedInitializerFrame)throw new Error('Actual pending initializer encoded pointer required');
      const proof=NativeSharedCrtOwner.initializerStackArgumentsForPlatform(this.#platform,this.#dllMemoryController??this.#sharedInitializerFrame.controller);if(!proof.known)throw new Error(proof.reason);
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
    if(p?.kind==='shared-local'){this.#sharedLocalPhysical(p.fields);const offset=(p.offset??0)+displacement;if(offset<0||offset>p.fields.bytes.length)throw new Error('SharedBase local pointer exceeds storage');const allocation=this.#arenaAllocations.get(p.fields);return this.#mint(allocation?(allocation.allocation.offset+offset)&3:0,allocation?3:0,{kind:'shared-local',fields:p.fields,offset});}
    if (p?.kind === 'allocation') return this.#allocationWord(p.allocation, p.offset + displacement);
    if (p?.kind === 'module') return this.#moduleWord(p.label, p.offset + displacement);
    if (p?.kind === 'process') return this.#processWord(Object.freeze({ fields: p.pointer.fields, offset: p.pointer.offset + displacement }));
    if (p?.kind !== 'stack') throw new Error('Actual owned stack/allocation/module pointer arithmetic required');
    const offset = p.offset + displacement;
    if (offset < 0 || offset > this.#stack.bytes.length) throw new Error('Opaque relative stack address exceeds reservation');
    return this.#stackWord(offset);
  }
  gameImageAddress(controller: object, label: string, offset = 0): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#moduleWord(label, offset)); }
  executeGameCinitCpuInstruction(controller: object, pc: string): NativeValue<void> { return this.#run(controller, () => {
    if (!this.#setEnvpBinding || this.#setEnvpBinding.controller !== controller ||
        !this.#calls.some(call => call.site === '20466452' && !call.returned)) throw new Error('Actual Game C initializer CPU frame required');
    const row = gameCinitInstruction(pc);
    if (['2047e63a', '2047e645'].includes(pc) && row.instruction === 'PUSHFD') { this.#pushFlags(); return; }
    if (['2047e644', '2047e64c'].includes(pc) && row.instruction === 'POPFD') { this.#popFlags(); return; }
    if (['2047e64f', '2047e662'].includes(pc) && row.instruction === 'CPUID') {
      const cpu = this.#selection.cpu;
      if (!cpu || !cpu.idBitWritable) throw new Error('Actual retained CPUID-capable virtual CPU required');
      const leaf = this.#numeric(this.#load(this.#bank, this.#reg('EAX')), 4);
      const tuple = leaf === 0 ? cpu.cpuidLeaf0 : leaf === 1 ? cpu.cpuidLeaf1 : undefined;
      if (!tuple) throw new Error('Explicit virtual CPUID leaf ' + leaf + ' required');
      for (const [index, name] of (['EAX', 'EBX', 'ECX', 'EDX'] as const).entries()) this.#store(this.#bank, this.#reg(name), this.#mint(tuple[index]!, 0xffffffff));
      return;
    }
    if (pc === '2047e5e7' && row.instruction === 'MOVAPD XMM0,XMM1') {
      if (this.#selection.cpu?.sse2Execution !== 'normal') throw new Error('Original SIMD exception dispatch or explicit normal SSE2 execution required');
      this.#physical(this.#xmm);
      for (let offset = 0; offset < 16; offset += 4) this.#store(this.#xmm, offset, this.#load(this.#xmm, 16 + offset));
      return;
    }
    throw new Error('Original Game C initializer CPU instruction required');
  }); }
  #gameCinitErrorCallback(controller: object): string {
    if (!this.#setEnvpBinding || this.#setEnvpBinding.controller !== controller ||
        this.#calls.filter(call => !call.returned).at(-1)?.site !== '20466626' ||
        gameCinitInstruction('20466452').instruction !== 'CALL ECX') throw new Error('Actual original Game C initializer walker required');
    const memory = this.#memory(this.#load(this.#bank, this.#reg('ESI')), 4);
    const table = NativeModuleCrtOwner.canonicalImageForOwner(this.#binding!.crt, 'cinitCInitializerTable');
    if (!table.known || memory.fields !== table.value || memory.offset < 0 || memory.offset >= 540 || memory.offset % 4) throw new Error('Actual C initializer table cursor required');
    const target = this.#load(this.#bank, this.#reg('ECX'));
    if (target !== this.#currentMemoryWord(memory.fields, memory.offset)) throw new Error('Actual current C initializer target word required');
    const expected = new Map([[65, 0x20463763], [66, 0x20469f3a], [67, 0x2046bcff], [68, 0x2047470c], [69, 0x2047e687]]).get(memory.offset / 4);
    const address = this.#numeric(target, 4);
    if (expected === undefined || address !== expected) throw new Error('Original current Game C initializer slot target required');
    return address.toString(16).padStart(8, '0');
  }
  resolveGameCinitErrorCallback(controller: object): NativeValue<string> { return this.#run(controller, () => this.#gameCinitErrorCallback(controller)); }
  resolveGameCppInitializer(controller: object): NativeValue<string> { return this.#run(controller, () => {
    if (!this.#setEnvpBinding || this.#setEnvpBinding.controller !== controller ||
        this.#calls.filter(call => !call.returned).at(-1)?.site !== '204678f2' ||
        gameCinitInstruction('20466654').instruction !== 'CALL EAX') throw new Error('Actual original Game C++ initializer caller required');
    const memory = this.#memory(this.#load(this.#bank, this.#reg('ESI')), 4);
    const table = NativeModuleCrtOwner.canonicalImageForOwner(this.#binding!.crt, 'cinitCppInitializerTable');
    if (!table.known || memory.fields !== table.value || memory.offset < 0 || memory.offset >= 955408 || memory.offset % 4)
      throw new Error('Actual original C++ initializer table cursor required');
    const target = this.#load(this.#bank, this.#reg('EAX'));
    if (target !== this.#currentMemoryWord(memory.fields, memory.offset)) throw new Error('Actual current C++ initializer target word required');
    const raw = nativeGameImageReceipt('cinitCppInitializerTable').raw;
    const expected = Number.parseInt(raw.slice(memory.offset * 2, memory.offset * 2 + 8).match(/../g)!.reverse().join(''), 16);
    const address = this.#numeric(target, 4);
    if (!expected || address !== expected) throw new Error('Original current Game C++ initializer slot target required');
    return address.toString(16).padStart(8, '0');
  }); }
  /** Preserve the actual initializer CALL/RET while translating its pinned getter. */
  callGameLayerBaseClassName(controller: object, initializer: string = '204b11b0'): NativeValue<void> { return this.#run(controller, () => {
    const binding = this.#setEnvpBinding;
    if (!binding || binding.controller !== controller) throw new Error('Actual retained Game startup controller required');
    const point = NativeGameCrtSetEnvp.canonicalLayerBaseGetterForCrt(binding.owner, binding.crt, controller, initializer);
    if (!point.known) throw new Error(point.reason);
    if (this.#calls.filter(call => !call.returned).at(-1)?.site !== '20466654')
      throw new Error('Actual pending C++ initializer frame required');
    const crt = binding.crt as NativeGameCrtOwner;
    const memory = nativeGameLayerBaseMemoryForCrt(crt);
    if (!memory.known) throw new Error(memory.reason);
    const spec = gameClassNameSpec(initializer);
    if (!spec) throw new Error('Original Game class-name initializer specification required');
    const label = spec.labels.cache;
    const returnPc = spec.instructions[1]!.va;
    this.#call(initializer, returnPc);
    const result = getGameClassName(crt,memory.value,spec);
    if (!result.known) throw new Error(result.reason);
    const image = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
    if (!image.known || image.value !== result.value.fields) throw new Error('Actual retained Game class-name static image required');
    this.#store(this.#bank, this.#reg('EAX'), this.#moduleWord(label, 0));
    const returned = this.#ret(0), source = this.#record(returned).provenance;
    if (source?.kind !== 'source' || source.type !== 'code' || source.address !== returnPc)
      throw new Error('Actual Game class-name getter return required');
  }); }
  /** Bridge the independently recovered 20463763 callback to its canonical Game
   * CRT owner. The walker executes original instructions; this callback uses
   * translated TypeScript with the original CALL/RET frame and result. */
  initializeGameCinitExitTable(controller: object): NativeValue<void> { return this.#run(controller, () => {
    if (this.#gameCinitErrorCallback(controller) !== '20463763') throw new Error('Original first C initializer required');
    const table = NativeGameExitTable.forCrt(this.#binding!.crt as NativeGameCrtOwner);
    this.#call('20466452', '20466454');
    const result = NativeGameExitTable.prototype.initialize.call(table);
    if (!result.known) throw new Error(result.reason);
    if (result.value !== 0 && result.value !== 24) throw new Error('Original exit-table initializer result required');
    this.#store(this.#bank, this.#reg('EAX'), this.#mint(result.value, 0xffffffff));
    const returned = this.#ret(0), source = this.#record(returned).provenance;
    if (source?.kind !== 'source' || source.type !== 'code' || source.address !== '20466454') throw new Error('Actual C initializer callback return required');
  }); }
  /** Translate the existing CRT registration owner; shutdown is not invoked. */
  callArenaStatusInitializer(controller:object,entry:'204b1dd0'|'204b1e70'|'204b1eb0'='204b1dd0'):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding || binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalArenaStatusInitializerForCrt(binding.owner,binding.crt,controller,entry);
    if(!point.known)throw new Error(point.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='204678f2')
      throw new Error('Actual pending Game cinit frame required');
    const cursor=this.#memory(this.#load(this.#bank,this.#reg('ESI')),4);
    const table=NativeModuleCrtOwner.canonicalImageForOwner(binding.crt,'cinitCppInitializerTable');
    if(!table.known || cursor.fields!==table.value || cursor.offset!==(entry==='204b1dd0'?0x370:entry==='204b1e70'?0x374:0x378) ||
      this.#numeric(this.#currentMemoryWord(cursor.fields,cursor.offset),4)!==Number.parseInt(entry,16) ||
      this.#load(this.#bank,this.#reg('EAX'))!==this.#currentMemoryWord(cursor.fields,cursor.offset))
      throw new Error('Actual Arena Status original initializer table slot required');
    const crt=binding.crt as NativeGameCrtOwner;
    const memory=nativeGameLayerBaseMemoryForCrt(crt); if(!memory.known)throw new Error(memory.reason);
    this.#call('20466654','20466656');
    const result=entry==='204b1dd0'
      ? NativeGameArenaStatusProperty.prototype.initialize.call(NativeGameArenaStatusProperty.forCrt(crt,memory.value))
      : entry==='204b1e70' ? NativeGameArenaEnum.prototype.initialize.call(NativeGameArenaEnum.forCrt(crt,memory.value))
      : NativeGameArenaEnum.prototype.initializeRunning.call(NativeGameArenaEnum.forCrt(crt,memory.value));
    if(!result.known)throw new Error('Translated Arena Status initializer pending: '+result.reason);
    const returned=this.#ret(0), source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='20466656')
      throw new Error('Actual Arena Status initializer return required');
  }); }
  registerArenaRootCleanup(controller:object):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding || binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalArenaRootCleanupRegistrationForCrt(binding.owner,binding.crt,controller);
    if(!point.known)throw new Error(point.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654')
      throw new Error('Actual pending Arena root initializer frame required');
    const cursor=this.#address(this.#load(this.#bank,this.#reg('ESP')));
    if(this.#numeric(this.#load(this.#stack,cursor),4)!==0x20549970)
      throw new Error('Actual pushed Arena root cleanup source address required');
    const table=NativeGameExitTable.forCrt(binding.crt as NativeGameCrtOwner);
    const callback=NativeGameExitTable.prototype.callbackForMethod.call(table,'arenaRootCleanup');
    if(!callback.known)throw new Error(callback.reason);
    this.#call('204b1db4','204b1db9');
    const result=NativeGameExitTable.prototype.atexit.call(table,callback.value); if(!result.known)throw new Error(result.reason);
    this.#store(this.#bank,this.#reg('EAX'),this.#mint(result.value>>>0,0xffffffff));
    const returned=this.#ret(0), source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='204b1db9')
      throw new Error('Actual Arena root cleanup registration return required');
  }); }
  registerFreePointWrapperCleanup(controller:object):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalFreePointCleanupCallForCrt(binding.owner,binding.crt,controller);if(!point.known)throw new Error(point.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654')throw new Error('Actual pending FreePoint initializer frame required');
    const cursor=this.#address(this.#load(this.#bank,this.#reg('ESP')));
    if(this.#numeric(this.#load(this.#stack,cursor),4)!==0x20549b80)throw new Error('Actual pushed FreePoint cleanup address required');
    const table=NativeGameExitTable.forCrt(binding.crt as NativeGameCrtOwner),callback=table.callbackForMethod('freePointWrapperCleanup');
    if(!callback.known)throw new Error(callback.reason);
    this.#call('204b2174','204b2179');
    const result=table.atexit(callback.value);if(!result.known)throw new Error(result.reason);
    this.#store(this.#bank,this.#reg('EAX'),this.#mint(result.value>>>0,0xffffffff));
    const returned=this.#ret(0),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='204b2179')throw new Error('Actual FreePoint cleanup registration return required');
  }); }
  registerLabelWrapperCleanup(controller:object):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalLabelCleanupCallForCrt(binding.owner,binding.crt,controller);if(!point.known)throw new Error(point.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654')throw new Error('Actual pending Label initializer frame required');
    const cursor=this.#address(this.#load(this.#bank,this.#reg('ESP')));
    if(this.#numeric(this.#load(this.#stack,cursor),4)!==0x20549c50)throw new Error('Actual pushed Label cleanup address required');
    const table=NativeGameExitTable.forCrt(binding.crt as NativeGameCrtOwner),callback=table.callbackForMethod('labelWrapperCleanup');
    if(!callback.known)throw new Error(callback.reason);
    this.#call('204b2414','204b2419');
    const result=table.atexit(callback.value);if(!result.known)throw new Error(result.reason);
    this.#store(this.#bank,this.#reg('EAX'),this.#mint(result.value>>>0,0xffffffff));
    const returned=this.#ret(0),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='204b2419')throw new Error('Actual Label cleanup registration return required');
  }); }
  registerAIHelperAdminWrapperCleanup(controller:object):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalAIHelperAdminCleanupCallForCrt(binding.owner,binding.crt,controller);if(!point.known)throw new Error(point.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654')throw new Error('Actual pending AIHelperAdmin initializer frame required');
    const cursor=this.#address(this.#load(this.#bank,this.#reg('ESP')));
    if(this.#numeric(this.#load(this.#stack,cursor),4)!==0x20549d60)throw new Error('Actual pushed AIHelperAdmin cleanup address required');
    const table=NativeGameExitTable.forCrt(binding.crt as NativeGameCrtOwner),callback=table.callbackForMethod('aiHelperAdminWrapperCleanup');
    if(!callback.known)throw new Error(callback.reason);
    this.#call('204b26a4','204b26a9');
    const result=table.atexit(callback.value);if(!result.known)throw new Error(result.reason);
    this.#store(this.#bank,this.#reg('EAX'),this.#mint(result.value>>>0,0xffffffff));
    const returned=this.#ret(0),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='204b26a9')throw new Error('Actual AIHelperAdmin cleanup registration return required');
  }); }
  registerGameStaticFini(controller: object): NativeValue<void> { return this.#run(controller, () => {
    const binding = this.#setEnvpBinding;
    if (!binding || binding.controller !== controller) throw new Error('Actual retained Game startup controller required');
    const point = NativeGameCrtSetEnvp.canonicalStaticFiniRegistrationForCrt(binding.owner, binding.crt, controller);
    if (!point.known) throw new Error(point.reason);
    const pending = this.#calls.filter(call => !call.returned).at(-1);
    if (pending?.site !== '204678f2' || !this.#calls.some(call => call.site === '20466626' && call.returned))
      throw new Error('Actual returned C walker and retained cinit caller required');
    const cursor = this.#address(this.#load(this.#bank, this.#reg('ESP')));
    const argument = this.#record(this.#load(this.#stack, cursor)).provenance;
    if (argument?.kind !== 'source' || argument.type !== 'code' || argument.address !== '20473801')
      throw new Error('Actual pushed static shutdown callback source word required');
    const table = NativeGameExitTable.forCrt(binding.crt as NativeGameCrtOwner);
    const callback = table.callbackForMethod('staticFiniWalker');
    if (!callback.known) throw new Error(callback.reason);
    this.#call('20466638', '2046663d');
    const result = table.atexit(callback.value);
    if (!result.known) throw new Error(result.reason);
    this.#store(this.#bank, this.#reg('EAX'), this.#mint(result.value >>> 0, 0xffffffff));
    const returned = this.#ret(0), source = this.#record(returned).provenance;
    if (source?.kind !== 'source' || source.type !== 'code' || source.address !== '2046663d')
      throw new Error('Actual original atexit return required');
  }); }
  loadAIHelperWrapperQueryVirtualPointer(controller:object,site:string,address:NativeX86Word32):NativeValue<NativeX86Word32> {return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const grant=NativeGameCrtSetEnvp.canonicalArenaVirtualReadForCrt(binding.owner,binding.crt,controller,site);if(!grant.known)throw new Error(grant.reason);
    const first=site==='100890d0',label=first?'aiHelperAdminWrapper':'aiHelperAdminWrapperVtable',offset=first?0:56;
    const memory=this.#memory(address,4),image=NativeModuleCrtOwner.canonicalImageForOwner(binding.crt,label);
    if(!image.known||memory.fields!==image.value||memory.offset!==offset)throw new Error('Actual original root wrapper virtual slot required');
    if(first) {
      const pointer=NativeHeapObjectViews.prototype.pointer.call(memory.fields,offset).get() as NativeBytePointer|null;
      const vtable=NativeModuleCrtOwner.canonicalImageForOwner(binding.crt,'aiHelperAdminWrapperVtable');
      if(!vtable.known||!pointer||pointer.fields!==vtable.value||pointer.offset!==0)throw new Error('Original AI helper wrapper vtable changed');
      return this.#moduleWord('aiHelperAdminWrapperVtable',0);
    }
    const value=NativeHeapObjectViews.prototype.readUnsigned.call(memory.fields,offset);
    if(value!==0x20028efc)throw new Error('Original AI helper wrapper clone slot changed');return this.#source('code','20028efc');
  }); }
  loadArenaVirtualPointer(controller:object,site:string,address:NativeX86Word32):NativeValue<NativeX86Word32> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding || binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalArenaVirtualReadForCrt(binding.owner,binding.crt,controller,site);
    if(!point.known)throw new Error(point.reason);
    const memory=this.#memory(address,4);
    const freePoint=site==='2007302c'||site==='2007302e';
    const labelType=site==='2007505c'||site==='2007505e';
    const aiHelperAdmin=site==='2007705c'||site==='2007705e'||site==='100905e0'||site==='100905e2';
    const first=site==='200705cc'||site==='2007302c'||site==='2007505c'||site==='2007705c'||site==='100905e0';
    const label=aiHelperAdmin?(first?'aiHelperAdminTypeAndGuard':'aiHelperAdminTypeVtable'):labelType?(first?'labelTypeAndGuard':'labelTypeVtable'):freePoint?(first?'freePointTypeAndGuard':'freePointTypeVtable'):first?'arenaTypeAndGuard':'arenaRootTypeVtable';
    const expected=NativeModuleCrtOwner.canonicalImageForOwner(binding.crt,label);
    const offset=first?0:12;
    if(!expected.known || memory.fields!==expected.value || memory.offset!==offset)
      throw new Error('Actual current Arena virtual-table pointer required');
    const value=NativeHeapObjectViews.prototype.readUnsigned.call(memory.fields,offset);
    if(first) {
      const vtable=aiHelperAdmin?'aiHelperAdminTypeVtable':labelType?'labelTypeVtable':freePoint?'freePointTypeVtable':'arenaRootTypeVtable';
      if(value!==Number.parseInt(nativeGameImageReceipt(vtable).address,16))
        throw new Error('Original Arena type vtable changed');
      return this.#moduleWord(vtable,0);
    }
    if(value!==(aiHelperAdmin?0x2000e59d:labelType?0x20017e27:freePoint?0x20024672:0x2002adfb))throw new Error('Original factory virtual slot changed');
    return this.#source('code',aiHelperAdmin?'2000e59d':labelType?'20017e27':freePoint?'20024672':'2002adfb');
  }); }
  callArenaMemoryAdminRealloc(controller:object,next:string):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding || binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalArenaMemoryGetterCallForCrt(binding.owner,binding.crt,controller,'1008ddc2');
    if(!point.known)throw new Error(point.reason);
    if(next!=='1008ddc7' || this.#calls.filter(call=>!call.returned).at(-1)?.site!=='1008eb30')
      throw new Error('Actual retained Arena reserve realloc return frame required');
    const memory=nativeGameLayerBaseMemoryForCrt(binding.crt as NativeGameCrtOwner); if(!memory.known)throw new Error(memory.reason);
    const receiver=this.#record(this.#load(this.#bank,this.#reg('ECX'))).provenance;
    if(receiver?.kind!=='arena-memory-admin' || receiver.owner!==memory.value)
      throw new Error('Actual retained Arena MemoryAdmin realloc receiver required');
    const cursor=this.#address(this.#load(this.#bank,this.#reg('ESP')));
    // The supported first insertion has the original NULL old-array argument.
    // Existing-buffer realloc needs its own retained allocation proof.
    if(this.#numeric(this.#load(this.#stack,cursor),4)!==0)
      throw new Error('Arena existing-buffer realloc ownership is not implemented');
    const bytes=this.#numeric(this.#load(this.#stack,cursor+4),4);
    this.#call('1008ddc2',next);
    const result=NativeMemoryAdmin.prototype.realloc.call(memory.value,null,bytes); if(!result.known)throw new Error(result.reason);
    let word=this.#mint(0,0xffffffff);
    if(result.value) {
      const fields=new NativeHeapObjectViews(result.value);
      this.#arenaAllocations.set(fields,{owner:memory.value,allocation:result.value});
      this.#sharedLocalPhysical(fields);
      // VirtualAlloc's base is aligned; this audited pool's actual offset
      // proves only the two alignment bits, never an absolute address.
      word=this.#mint(result.value.offset&3,3,{kind:'shared-local',fields});
    }
    this.#store(this.#bank,this.#reg('EAX'),word);
    const returned=this.#ret(8), source=this.#record(returned).provenance;
    if(source?.kind!=='source' || source.type!=='code' || source.address!==next)
      throw new Error('Actual Arena MemoryAdmin realloc return required');
  }); }
  callArenaMemoryAdminGetter(controller:object,next:string):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding || binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalArenaMemoryGetterCallForCrt(binding.owner,binding.crt,controller);
    if(!point.known)throw new Error(point.reason);
    if(next!=='1008ddc0' || this.#calls.filter(call=>!call.returned).at(-1)?.site!=='1008eb30')
      throw new Error('Actual retained Arena reserve return frame required');
    const memory=nativeGameLayerBaseMemoryForCrt(binding.crt as NativeGameCrtOwner); if(!memory.known)throw new Error(memory.reason);
    if(!NativeMemoryAdmin.prototype.usesPlatform.call(memory.value,this.#platform))throw new Error('Actual same-platform SharedBase MemoryAdmin required');
    this.#call('1008ddbb',next);
    const result=NativeMemoryAdmin.prototype.getInstance.call(memory.value); if(!result.known)throw new Error(result.reason);
    if(result.value!==memory.value)throw new Error('Actual retained SharedBase MemoryAdmin singleton required');
    this.#store(this.#bank,this.#reg('EAX'),this.#mint(0,0,{kind:'arena-memory-admin',owner:result.value}));
    const returned=this.#ret(0), source=this.#record(returned).provenance;
    if(source?.kind!=='source' || source.type!=='code' || source.address!==next)
      throw new Error('Actual Arena MemoryAdmin getter return required');
  }); }
  callArenaPropertySingleton(controller:object,site:string,next:string):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding || binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalArenaPropertySingletonCallForCrt(binding.owner,binding.crt,controller,site);
    if(!point.known)throw new Error(point.reason);
    const freePoint=site==='20072619'||site==='2007265c';
    const label=site==='20074699'||site==='200746dd';
    const aiHelperAdmin=site==='20076689'||site==='200766e1';
    const outerSite=this.#calls.filter(call=>!call.returned).at(-1)?.site;
    if(next!==(site==='100932ef'?'100932f4':site==='1008d1a3'?'1008d1a8':site==='2006f985'?'2006f98b':site==='20072619'?'2007261f':site==='2007265c'?'20072662':site==='20074699'?'2007469f':site==='200746dd'?'200746e3':site==='20076689'?'2007668f':site==='200766e1'?'200766e7':'2006f9f2') ||
      !(site==='100932ef'?outerSite==='204b2730':site==='1008d1a3'?['200705d6','20073036','20075066','20077066'].includes(outerSite??''):outerSite===(aiHelperAdmin?'20077054':label?'20075054':freePoint?'20073024':'200705c4')))
      throw new Error('Actual Arena replacement frame and singleton return required');
    admitArenaPropertySingletonImport();
    const memory=nativeGameLayerBaseMemoryForCrt(binding.crt as NativeGameCrtOwner); if(!memory.known)throw new Error(memory.reason);
    this.#call(site,next);
    const selected=NativePropertySingleton.forPlatform(this.#platform,memory.value); if(!selected.known)throw new Error(selected.reason);
    const result=NativePropertySingleton.prototype.get.call(selected.value); if(!result.known)throw new Error(result.reason);
    if(result.value!==selected.value.ranges.object)throw new Error('Actual original property singleton image required');
    if(this.#arenaPropertySingleton && this.#arenaPropertySingleton!==selected.value)
      throw new Error('Arena property singleton cannot change its retained owner');
    this.#arenaPropertySingleton=selected.value;
    this.#store(this.#bank,this.#reg('EAX'),this.#mint(0,0,{kind:'shared-local',fields:result.value}));
    const returned=this.#ret(0), source=this.#record(returned).provenance;
    if(source?.kind!=='source' || source.type!=='code' || source.address!==next)
      throw new Error('Actual property singleton import return required');
  }); }
  callGameArenaTypeSingleton(controller:object):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding || binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalArenaTypeCallForCrt(binding.owner,binding.crt,controller);
    if(!point.known)throw new Error(point.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654')
      throw new Error('Actual pending Arena initializer frame required');
    const crt=binding.crt as NativeGameCrtOwner;
    const memory=nativeGameLayerBaseMemoryForCrt(crt); if(!memory.known)throw new Error(memory.reason);
    this.#call('204b1d8f','204b1d94');
    const owner=NativeGameArenaType.forCrt(crt,memory.value);
    const result=NativeGameArenaType.prototype.get.call(owner); if(!result.known)throw new Error(result.reason);
    const storage=NativeModuleCrtOwner.canonicalImageForOwner(crt,'arenaTypeAndGuard');
    if(!storage.known || result.value.backing!==storage.value.backing ||
      result.value.bytes.byteOffset!==storage.value.bytes.byteOffset || result.value.bytes.length!==60)
      throw new Error('Actual retained original Arena type return required');
    this.#store(this.#bank,this.#reg('EAX'),this.#moduleWord('arenaTypeAndGuard',0));
    const returned=this.#ret(0), source=this.#record(returned).provenance;
    if(source?.kind!=='source' || source.type!=='code' || source.address!=='204b1d94')
      throw new Error('Actual Arena type singleton return required');
  }); }
  callGameLabelTypeSingleton(controller:object):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalLabelTypeCallForCrt(binding.owner,binding.crt,controller);if(!point.known)throw new Error(point.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654')throw new Error('Actual pending Label initializer frame required');
    const crt=binding.crt as NativeGameCrtOwner,memory=nativeGameLayerBaseMemoryForCrt(crt);if(!memory.known)throw new Error(memory.reason);
    this.#call('204b23ef','204b23f4');
    const result=NativeGameLabelType.prototype.get.call(NativeGameLabelType.forCrt(crt,memory.value));
    if(!result.known)throw new Error(result.reason);
    const storage=NativeModuleCrtOwner.canonicalImageForOwner(crt,'labelTypeAndGuard');
    if(!storage.known||result.value.backing!==storage.value.backing||result.value.bytes.byteOffset!==storage.value.bytes.byteOffset||result.value.bytes.length!==60)
      throw new Error('Actual retained Label type return required');
    this.#store(this.#bank,this.#reg('EAX'),this.#moduleWord('labelTypeAndGuard',0));
    const returned=this.#ret(0),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='204b23f4')throw new Error('Actual Label type getter return required');
  }); }
  callAIHelperCloneAllocation(controller:object,site:string='20077bfb'):NativeValue<void> {return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const grant=NativeGameCrtSetEnvp.canonicalAIHelperCloneAllocationCallForCrt(binding.owner,binding.crt,controller,site);if(!grant.known)throw new Error(grant.reason);
    const component=site==='200766a4',next=component?'200766aa':'20077c01';
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!==(component?'20077054':'100905e9'))throw new Error('Actual AI helper allocation frame required');
    admitAIHelperCloneAllocationImport();
    const cursor=this.#address(this.#load(this.#bank,this.#reg('ESP'))),bytes=this.#numeric(this.#load(this.#stack,cursor),4),tag=this.#numeric(this.#load(this.#stack,cursor+4),4);
    if(bytes!==(component?24:16)||tag!==(component?0xc4:0x190))throw new Error('Original AI helper allocation arguments required');
    const memory=nativeGameLayerBaseMemoryForCrt(binding.crt as NativeGameCrtOwner);if(!memory.known)throw new Error(memory.reason);
    this.#call(site,next);
    const result=NativeMemoryAdmin.prototype.newObject.call(memory.value,bytes,tag);if(!result.known)throw new Error(result.reason);
    let word=this.#mint(0,0xffffffff);
    if(result.value) {
      const fields=new NativeHeapObjectViews(result.value);
      if(component)this.#aiHelperComponentAllocation=result.value;else this.#aiHelperCloneAllocation=result.value;
      this.#arenaAllocations.set(fields,{owner:memory.value,allocation:result.value});this.#sharedLocalPhysical(fields);
      word=this.#mint(result.value.offset&3,3,{kind:'shared-local',fields});
    }
    this.#store(this.#bank,this.#reg('EAX'),word);
    const returned=this.#ret(8),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!==next)throw new Error('Actual tagged allocation callee cleanup and return required');
  }); }
  aiHelperAccessorQueryNodeSnapshot() {return this.#aiHelperAccessorQueryNode;}
  aiHelperCloneAllocationSnapshot() {return this.#aiHelperCloneAllocation;}
  aiHelperComponentAllocationSnapshot() {return this.#aiHelperComponentAllocation;}
  aiHelperModuleAdminSnapshot() {return this.#aiHelperModuleOwner?Object.freeze({module:this.#aiHelperModuleOwner.moduleAdmin.snapshot(),fields:this.#aiHelperModuleOwner.moduleAdmin.fields,guard:this.#aiHelperModuleOwner.moduleAdmin.guard}):null;}
  callAIHelperModuleAdminGetter(controller:object):NativeValue<void> {return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const grant=NativeGameCrtSetEnvp.canonicalAIHelperModuleAdminCallForCrt(binding.owner,binding.crt,controller);if(!grant.known)throw new Error(grant.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20077054'||!this.#aiHelperComponentAllocation)throw new Error('Actual component replacement frame required');
    const memory=nativeGameLayerBaseMemoryForCrt(binding.crt as NativeGameCrtOwner);if(!memory.known)throw new Error(memory.reason);
    if(!this.#aiHelperModuleOwner)this.#aiHelperModuleOwner=createNativeEngineModuleOwner<NativeHeapObjectViews>(memory.value,{
      componentFields:fields=>{
        const allocation=this.#arenaAllocations.get(fields);
        return allocation&&allocation.owner===memory.value&&!allocation.allocation.freed?known(fields):unknown('Actual retained Engine component fields required');
      },
      moduleClassNameEquals:()=>unknown('Original Engine module class-name comparison is not connected'),
      registerShutdown:()=>{
        const engine=createBrowserEngineCrtStartup(this.#platform);if(!engine.known)return engine;
        if(!engine.value.attachResult.known)return unknown('Engine shutdown registration requires its CRT attach: '+engine.value.attachResult.reason);
        return unknown('Original Engine onexit3067155a requires its Engine CRT exit-table owner');
      },
    });
    this.#call('200766c2','200766c8');
    const result=this.#aiHelperModuleOwner.moduleAdmin.getInstance();if(!result.known)throw new Error(result.reason);
    throw new Error('Original ModuleAdmin getter return capability is not connected');
  }); }
  callAIHelperAccessorTypeLookup(controller:object):NativeValue<void> {return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const grant=NativeGameCrtSetEnvp.canonicalAIHelperAccessorTypeLookupCallForCrt(binding.owner,binding.crt,controller);if(!grant.known)throw new Error(grant.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='100932f6'||!this.#aiHelperAccessorName||!this.#arenaPropertySingleton)
      throw new Error('Actual retained accessor query arguments required');
    const esp=this.#address(this.#load(this.#bank,this.#reg('ESP'))),receiver=this.#memory(this.#load(this.#bank,this.#reg('ECX')),4);
    const name=this.#memory(this.#load(this.#stack,esp),4),index=this.#memory(this.#load(this.#stack,esp+4),4);
    const table=NativePropertySingleton.prototype.table.call(this.#arenaPropertySingleton);if(!table.known)throw new Error(table.reason);
    if(receiver.fields.backing!==table.value.fields.backing||receiver.fields.bytes.byteOffset+receiver.offset!==table.value.fields.bytes.byteOffset||
      name.fields.backing!==this.#aiHelperAccessorName.slot.backing||name.fields.bytes.byteOffset+name.offset!==this.#aiHelperAccessorName.slot.bytes.byteOffset||
      index.fields!==this.#stack)throw new Error('Actual original table, name and stack index output required');
    const output=new NativeHeapObjectViews(this.#stack.backing,this.#stack.bytes.byteOffset-this.#stack.backing.bytes.byteOffset+index.offset,4);
    this.#call('100905b7','100905bc');
    const result=NativePropertyTypeTable.prototype.findNode.call(table.value,this.#aiHelperAccessorName,output);if(!result.known)throw new Error(result.reason);
    let word:NativeX86Word32;
    if(result.value) {
      const allocation=NativePropertyTypeTable.canonicalNodeAllocation(table.value,result.value);if(!allocation.known)throw new Error(allocation.reason);
      const memory=nativeGameLayerBaseMemoryForCrt(binding.crt as NativeGameCrtOwner);if(!memory.known)throw new Error(memory.reason);
      this.#arenaAllocations.set(result.value,{owner:memory.value,allocation:allocation.value});
      this.#sharedLocalPhysical(result.value);this.#aiHelperAccessorQueryNode=result.value;
      word=this.#mint(allocation.value.offset&3,3,{kind:'shared-local',fields:result.value});
    } else word=this.#mint(0,0xffffffff);
    this.#store(this.#bank,this.#reg('EAX'),word);
    const returned=this.#ret(8),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='100905bc')throw new Error('Actual query node lookup return required');
  }); }
  callAIHelperAccessorStringEmpty(controller:object,site:'1009059a'|'100905a5'):NativeValue<void> {return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const grant=NativeGameCrtSetEnvp.canonicalAIHelperAccessorEmptyCallForCrt(binding.owner,binding.crt,controller,site);if(!grant.known)throw new Error(grant.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='100932f6')throw new Error('Actual accessor object query frame required');
    const crt=binding.crt as NativeGameCrtOwner,memory=nativeGameLayerBaseMemoryForCrt(crt);if(!memory.known)throw new Error(memory.reason);
    const receiver=this.#memory(this.#load(this.#bank,this.#reg('ECX')),4);
    const name=this.#aiHelperAccessorName;if(!name||!name.usesMemoryAdmin(memory.value))throw new Error('Actual retained query class-name owner required');
    if(receiver.fields.backing!==name.slot.backing||receiver.fields.bytes.byteOffset+receiver.offset!==name.slot.bytes.byteOffset)
      throw new Error('Actual retained query class-name CString required');
    const next=site==='1009059a'?'1009059f':'100905aa';this.#call(site,next);
    const result=NativeHeapCString.prototype.isEmpty.call(name);if(!result.known)throw new Error(result.reason);
    // The caller consumes AL only; no unsupported upper EAX bits are inferred.
    this.#store(this.#bank,this.#reg('EAX'),this.#mint(result.value?1:0,0xff));
    const returned=this.#ret(0),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!==next)throw new Error('Actual query CString check return required');
  }); }
  callAIHelperAccessorClassName(controller:object):NativeValue<void> {return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const grant=NativeGameCrtSetEnvp.canonicalAIHelperAccessorClassNameCallForCrt(binding.owner,binding.crt,controller);if(!grant.known)throw new Error(grant.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654')throw new Error('Actual accessor initializer frame required');
    const crt=binding.crt as NativeGameCrtOwner,memory=nativeGameLayerBaseMemoryForCrt(crt);if(!memory.known)throw new Error(memory.reason);
    this.#call('204b2720','204b2725');
    const name=NativeGameAIHelperAdminClassName.prototype.get.call(NativeGameAIHelperAdminClassName.forCrt(crt,memory.value));if(!name.known)throw new Error(name.reason);
    if(this.#aiHelperAccessorName&&this.#aiHelperAccessorName!==name.value)throw new Error('Accessor class-name owner cannot change');
    this.#aiHelperAccessorName=name.value;
    const image=NativeModuleCrtOwner.canonicalImageForOwner(crt,'aiHelperAdminClassNameAndCache');
    if(!image.known||name.value.slot.backing!==image.value.backing||name.value.slot.bytes.byteOffset!==image.value.bytes.byteOffset||name.value.slot.bytes.length!==4)
      throw new Error('Actual retained AI helper class-name CString required');
    this.#store(this.#bank,this.#reg('EAX'),this.#moduleWord('aiHelperAdminClassNameAndCache',0));
    const returned=this.#ret(0),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='204b2725')throw new Error('Actual accessor class-name return required');
  }); }
  finishAIHelperPropertyIdInitializerCall(controller:object,site:'204b26f0'|'204b26f9'|'204b2704'):NativeValue<void> {return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const grant=NativeGameCrtSetEnvp.canonicalAIHelperPropertyIdFinishCallForCrt(binding.owner,binding.crt,controller,site);if(!grant.known)throw new Error(grant.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654'||!this.#aiHelperPropertyIdGuid||!this.#aiHelperPropertyIdText)
      throw new Error('Actual original PropertyID temporaries required');
    const returnPc=site==='204b26f0'?'204b26f6':site==='204b26f9'?'204b26ff':'204b2709';
    if(site==='204b26f0'||site==='204b26f9') {
      const receiver=this.#memory(this.#load(this.#bank,this.#reg('ECX')),4);
      const object=site==='204b26f0'?this.#aiHelperPropertyIdGuid.guid:this.#aiHelperPropertyIdText.slot;
      if(receiver.fields.backing!==object.backing||receiver.fields.bytes.byteOffset+receiver.offset!==object.bytes.byteOffset)
        throw new Error('Actual original temporary destructor receiver required');
      if(site==='204b26f0'&&(scriptAdminSource.methods.guidDtor.body!=='10012440'||
        scriptAdminSource.methods.guidDtor.bodyInstructionBytesSha256!=='ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e'))
        throw new Error('Original literal RET GUID destructor required');
      this.#call(site,returnPc);
      if(site==='204b26f0')this.#aiHelperPropertyIdGuidLifetimeEnded=true;
      if(site==='204b26f9') {const result=NativeHeapCString.prototype.destroy.call(this.#aiHelperPropertyIdText);if(!result.known)throw new Error(result.reason);this.#aiHelperPropertyIdTextDestroyedSnapshot=Object.freeze(this.#aiHelperPropertyIdText.snapshot());}
    } else {
      const esp=this.#address(this.#load(this.#bank,this.#reg('ESP')));
      if(this.#numeric(this.#load(this.#stack,esp),4)!==0x20549ce0)throw new Error('Actual pushed PropertyID cleanup required');
      const table=NativeGameExitTable.forCrt(binding.crt as NativeGameCrtOwner),callback=table.callbackForMethod('aiHelperPropertyIdCleanup');
      if(!callback.known)throw new Error(callback.reason);
      this.#call(site,returnPc);const result=table.atexit(callback.value);if(!result.known)throw new Error(result.reason);
      this.#store(this.#bank,this.#reg('EAX'),this.#mint(result.value>>>0,0xffffffff));
    }
    const returned=this.#ret(0),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!==returnPc)throw new Error('Actual original PropertyID finish return required');
  }); }
  callAIHelperPropertyIdConstructor(controller:object):NativeValue<void> {return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const grant=NativeGameCrtSetEnvp.canonicalAIHelperPropertyIdConstructCallForCrt(binding.owner,binding.crt,controller);if(!grant.known)throw new Error(grant.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654'||!this.#aiHelperPropertyIdGuid)throw new Error('Actual PropertyID initializer and GUID required');
    const receiver=this.#load(this.#bank,this.#reg('ECX')),esp=this.#address(this.#load(this.#bank,this.#reg('ESP')));
    const destination=this.#memory(receiver,4),argument=this.#memory(this.#load(this.#stack,esp),4);
    const image=NativeModuleCrtOwner.canonicalImageForOwner(binding.crt,'aiHelperPropertyId');
    const guid=this.#aiHelperPropertyIdGuid.guid;
    if(!image.known||destination.fields!==image.value||destination.offset!==0||argument.fields.backing!==guid.backing||
      argument.fields.bytes.byteOffset+argument.offset!==guid.bytes.byteOffset)throw new Error('Actual retained PropertyID destination and GUID argument required');
    this.#call('204b26e6','204b26ec');
    const result=constructNativePropertyIdFromGuid(image.value,guid,()=>{
      const shared=NativeSharedGuidNull.forPlatform(this.#platform);if(!shared.known)return shared;
      return NativeSharedGuidNull.canonicalPayloadForPlatform(shared.value,this.#platform);
    });if(!result.known)throw new Error(result.reason);
    this.#store(this.#bank,this.#reg('EAX'),receiver);
    const returned=this.#ret(4),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='204b26ec')throw new Error('Actual PropertyID constructor return required');
  }); }
  aiHelperPropertyIdGuidSnapshot() {const guid=this.#aiHelperPropertyIdGuid;return guid?Object.freeze({...guid.snapshot(),paddingBefore:this.#aiHelperPropertyIdGuidPaddingBefore,constructed:this.#aiHelperPropertyIdGuidConstructed,lifetimeEnded:this.#aiHelperPropertyIdGuidLifetimeEnded}):null;}
  callAIHelperPropertyIdGuidConstructor(controller:object):NativeValue<void> {return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const grant=NativeGameCrtSetEnvp.canonicalAIHelperPropertyIdGuidCallForCrt(binding.owner,binding.crt,controller);
    if(!grant.known)throw new Error(grant.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654')throw new Error('Actual pending PropertyID initializer frame required');
    if(!this.#aiHelperPropertyIdText||this.#aiHelperPropertyIdGuid)throw new Error('Actual once-only temporary GUID construction required');
    const crt=binding.crt as NativeGameCrtOwner,memory=nativeGameLayerBaseMemoryForCrt(crt);
    if(!memory.known)throw new Error(memory.reason);
    const platform=NativeRuntimePlatform.canonicalGuidTextPlatform(this.#platform);if(!platform.known)throw new Error(platform.reason);
    const receiver=this.#load(this.#bank,this.#reg('ECX')),esp=this.#address(this.#load(this.#bank,this.#reg('ESP')));
    const destination=this.#memory(receiver,4),argument=this.#memory(this.#load(this.#stack,esp),4);
    if(destination.fields!==this.#stack||destination.offset!==esp+8||argument.fields!==this.#stack||argument.offset!==esp+4)
      throw new Error('Actual GUID and CString stack arguments required');
    const guidFields=new NativeHeapObjectViews(this.#stack.backing,
      this.#stack.bytes.byteOffset-this.#stack.backing.bytes.byteOffset+destination.offset,20);
    this.#aiHelperPropertyIdGuidPaddingBefore=Object.freeze({bytes:Object.freeze([...guidFields.bytes.subarray(17,20)]),mask:Object.freeze([...guidFields.knownMask.subarray(17,20)])});
    this.#call('204b26da','204b26e0');
    const guid=new NativeGuidText(memory.value,guidFields,platform.value);this.#aiHelperPropertyIdGuid=guid;
    const result=NativeGuidText.prototype.setData.call(guid,this.#aiHelperPropertyIdText);
    if(!result.known)throw new Error(result.reason);
    this.#aiHelperPropertyIdGuidConstructed=Object.freeze({bytes:Object.freeze([...guidFields.bytes]),mask:Object.freeze([...guidFields.knownMask])});
    // Original bCGuid text constructor ignores SetData's BOOL and returns this.
    this.#store(this.#bank,this.#reg('EAX'),receiver);
    const returned=this.#ret(4),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='204b26e0')throw new Error('Actual GUID constructor return required');
  }); }
  aiHelperPropertyIdTextSnapshot() {return this.#aiHelperPropertyIdTextDestroyedSnapshot??this.#aiHelperPropertyIdText?.snapshot()??null;}
  callAIHelperPropertyIdTextConstructor(controller:object):NativeValue<void> {return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const grant=NativeGameCrtSetEnvp.canonicalAIHelperPropertyIdTextCallForCrt(binding.owner,binding.crt,controller);
    if(!grant.known)throw new Error(grant.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654')throw new Error('Actual pending PropertyID initializer frame required');
    if(this.#aiHelperPropertyIdText)throw new Error('Original temporary CString construction cannot be replayed');
    const crt=binding.crt as NativeGameCrtOwner,memory=nativeGameLayerBaseMemoryForCrt(crt);
    if(!memory.known)throw new Error(memory.reason);
    const receiver=this.#load(this.#bank,this.#reg('ECX'));
    const esp=this.#address(this.#load(this.#bank,this.#reg('ESP')));
    const destination=this.#memory(receiver,4);
    if(destination.fields!==this.#stack||destination.offset!==esp+4)throw new Error('Actual original CString stack receiver required');
    const input=this.#memory(this.#load(this.#stack,esp),1);
    const literal=NativeModuleCrtOwner.canonicalImageForOwner(crt,'aiHelperPropertyIdGuidLiteral');
    if(!literal.known||input.fields!==literal.value||input.offset!==0)throw new Error('Actual original GUID literal argument required');
    const slot=new NativeHeapObjectViews(destination.fields.backing,
      destination.fields.bytes.byteOffset-destination.fields.backing.bytes.byteOffset+destination.offset,4);
    this.#call('204b26cc','204b26d2');
    const text=NativeHeapCString.beginTextConstruction(memory.value,slot);
    this.#aiHelperPropertyIdText=text;
    const result=NativeHeapCString.prototype.constructText.call(text,Object.freeze(input));
    if(!result.known)throw new Error(result.reason);
    this.#store(this.#bank,this.#reg('EAX'),receiver);
    const returned=this.#ret(4),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='204b26d2')throw new Error('Actual original CString constructor return required');
  }); }
  callGameAIHelperAdminTypeSingleton(controller:object,site:string='204b267f'):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalAIHelperAdminTypeCallForCrt(binding.owner,binding.crt,controller);if(!point.known)throw new Error(point.reason);
    const clone=site==='20077c1c',next=clone?'20077c21':'204b2684';
    if((site!=='204b267f'&&!clone)||this.#calls.filter(call=>!call.returned).at(-1)?.site!==(clone?'100905e9':'20466654'))throw new Error('Actual pending AIHelperAdmin initializer or clone frame required');
    const crt=binding.crt as NativeGameCrtOwner,memory=nativeGameLayerBaseMemoryForCrt(crt);if(!memory.known)throw new Error(memory.reason);
    this.#call(site,next);
    const result=NativeGameAIHelperAdminType.prototype.get.call(NativeGameAIHelperAdminType.forCrt(crt,memory.value));
    if(!result.known)throw new Error(result.reason);
    const storage=NativeModuleCrtOwner.canonicalImageForOwner(crt,'aiHelperAdminTypeAndGuard');
    if(!storage.known||result.value.backing!==storage.value.backing||result.value.bytes.byteOffset!==storage.value.bytes.byteOffset||result.value.bytes.length!==60)
      throw new Error('Actual retained AIHelperAdmin type return required');
    this.#store(this.#bank,this.#reg('EAX'),this.#moduleWord('aiHelperAdminTypeAndGuard',0));
    const returned=this.#ret(0),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!==next)throw new Error('Actual AIHelperAdmin type getter return required');
  }); }
  callGameFreePointTypeSingleton(controller:object):NativeValue<void> { return this.#run(controller,()=>{
    const binding=this.#setEnvpBinding;
    if(!binding||binding.controller!==controller)throw new Error('Actual retained Game startup controller required');
    const point=NativeGameCrtSetEnvp.canonicalFreePointTypeCallForCrt(binding.owner,binding.crt,controller);
    if(!point.known)throw new Error(point.reason);
    if(this.#calls.filter(call=>!call.returned).at(-1)?.site!=='20466654')
      throw new Error('Actual pending FreePoint initializer frame required');
    const crt=binding.crt as NativeGameCrtOwner,memory=nativeGameLayerBaseMemoryForCrt(crt);
    if(!memory.known)throw new Error(memory.reason);
    this.#call('204b214f','204b2154');
    const result=NativeGameFreePointType.prototype.get.call(NativeGameFreePointType.forCrt(crt,memory.value));
    if(!result.known)throw new Error(result.reason);
    const storage=NativeModuleCrtOwner.canonicalImageForOwner(crt,'freePointTypeAndGuard');
    if(!storage.known||result.value.backing!==storage.value.backing||result.value.bytes.byteOffset!==storage.value.bytes.byteOffset||result.value.bytes.length!==60)
      throw new Error('Actual retained FreePoint type return required');
    this.#store(this.#bank,this.#reg('EAX'),this.#moduleWord('freePointTypeAndGuard',0));
    const returned=this.#ret(0),source=this.#record(returned).provenance;
    if(source?.kind!=='source'||source.type!=='code'||source.address!=='204b2154')
      throw new Error('Actual FreePoint type getter return required');
  }); }
  /** Execute the recovered Game CRT wrapper under its existing owner. The
   * source loop owns CALL/RET; wrapper instruction interpretation is not claimed. */
  encodeGameCinitPointer(controller: object): NativeValue<void> { return this.#run(controller, () => {
    if (!this.#setEnvpBinding || this.#setEnvpBinding.controller !== controller) throw new Error('Actual Game pointer initializer controller required');
    const pending = this.#calls.filter(call => !call.returned).at(-1);
    if (pending?.site !== '20466617' || gameCinitInstruction('2046967e').instruction !== 'CALL 0x20467d64') throw new Error('Actual original Game pointer initializer call required');
    const memory = this.#memory(this.#load(this.#bank, this.#reg('ESI')), 4);
    const fields = NativeModuleCrtOwner.canonicalImageForOwner(this.#binding!.crt, 'cinitFloatPointerTable');
    if (!fields.known || memory.fields !== fields.value || memory.offset % 4 !== 0 || memory.offset < 0 || memory.offset >= 40) throw new Error('Actual current conversion-table slot required');
    const cursor = this.#address(this.#load(this.#bank, this.#reg('ESP'))), argument = this.#load(this.#stack, cursor);
    if (argument !== this.#currentMemoryWord(memory.fields, memory.offset)) throw new Error('Actual conversion-table argument identity required');
    const address = this.#numeric(argument, 4);
    // These identities describe original code pointers; they grant no callable
    // browser function, memory span or host address.
    const conversionReturned = this.#calls.some(call => call.site === '20463917' && call.returned);
    const expected = conversionReturned ? [0x20469651, 0x20468cf6, 0x20468cb4, 0x20468ce8, 0x20468c5e,
      0x20469651, 0x204695cb, 0x20468c74, 0x20468bde, 0x20468b6d][memory.offset / 4] : 0x2047df3f;
    if (address !== expected) throw new Error('Original current Game conversion code pointer required');
    let pointer = this.#cinitCodePointers.get(address);
    if (!pointer) { pointer = Object.freeze({ owner: this.#binding!.crt.identity, originalCodeAddress: address }); this.#cinitCodePointers.set(address, pointer); }
    this.#call('2046967e', '20469683');
    const encoded = NativeModuleCrtOwner.prototype.encodePointer.call(this.#binding!.crt, pointer);
    if (!encoded.known) throw new Error(encoded.reason);
    let result: NativeX86Word32;
    if (encoded.value === null) result = this.#mint(0, 0xffffffff);
    else {
      this.#cinitEncodedPointers.add(encoded.value);
      result = this.#objects.get(encoded.value) ?? this.#mint(0, 0, { kind: 'platform', object: encoded.value, category: 'GameCinitEncoded' });
      this.#objects.set(encoded.value, result);
    }
    this.#store(this.#bank, this.#reg('EAX'), result);
    const returned = this.#ret(0), source = this.#record(returned).provenance;
    if (source?.kind !== 'source' || source.type !== 'code' || source.address !== '20469683') throw new Error('Actual Game pointer wrapper return required');
  }); }
  callGameMathInitializer(controller: object, target: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => {
    if (!this.#setEnvpBinding || this.#setEnvpBinding.controller !== controller) throw new Error('Actual Game startup controller required');
    const current = [...this.#calls].reverse().find(call => !call.returned);
    if (current?.site !== '204678f2') throw new Error('Actual pending Game cinit caller required');
    const fields = NativeModuleCrtOwner.canonicalImageForOwner(this.#binding!.crt, 'cinitMathCallback');
    if (!fields.known) throw new Error(fields.reason);
    this.#moduleWord('cinitMathCallback', 0);
    if (this.#currentMemoryWord(fields.value, 0) !== target || this.#numeric(target, 4) !== 0x20463917) throw new Error('Actual current original Game math callback target required');
    if (gameCinitInstruction('20466610').instruction !== 'CALL dword ptr [0x206b638c]') throw new Error('Original Game math CALL differs');
    this.#call('20466610', '20466616');
  }); }
  invokeGameCinitImport(controller: object, site: string): NativeValue<void> { return this.#run(controller, () => {
    if (!this.#setEnvpBinding || this.#setEnvpBinding.controller !== controller) throw new Error('Actual Game cinit import controller required');
    const point = gameCinitInstruction(site), next = (Number.parseInt(site, 16) + point.bytes.length / 2).toString(16).padStart(8, '0');
    const spec = site === '204696fb' ? ['CALL dword ptr [0x207d7b5c]', 4] as const
      : site === '2046970b' ? ['CALL dword ptr [0x207d7c94]', 8] as const
      : site === '20469717' ? ['CALL EAX', 4] as const : null;
    if (!spec || point.instruction !== spec[0]) throw new Error('Original Game cinit import source required');
    const incoming = [...this.#calls].reverse().find(call => !call.returned);
    if (incoming?.site !== '2046391c') throw new Error('Actual pending Game divide-dispatch call required');
    this.#call(site, next);
    const cursor = this.#address(this.#load(this.#bank, this.#reg('ESP')));
    const argument = (index: number) => this.#load(this.#stack, cursor + 4 + index * 4);
    const literal = (word: NativeX86Word32, label: string): string => {
      const memory = this.#memory(word, 1), fields = NativeModuleCrtOwner.canonicalImageForOwner(this.#binding!.crt, label);
      if (!fields.known || memory.fields !== fields.value || memory.offset !== 0) throw new Error('Actual original Game cinit name pointer required');
      let text = '';
      for (let index = 0; index < memory.fields.bytes.length; index++) {
        const byte = NativeHeapObjectViews.prototype.readUnsigned.call(memory.fields, index, 1);
        if (byte === 0) return text; text += String.fromCharCode(byte);
      }
      throw new Error('Actual terminated Game cinit name required');
    };
    let result: NativeX86Word32;
    if (site === '204696fb') {
      if (literal(argument(0), 'cinitDivideModule') !== 'KERNEL32') throw new Error('Original Game divide module name required');
      const observed = NativeRuntimePlatform.prototype.getWin32ModuleHandle.call(this.#platform, 'KERNEL32'); if (!observed.known) throw new Error(observed.reason);
      if (!observed.value) result = this.#mint(0, 0xffffffff);
      else {
        const proof = NativeRuntimePlatform.canonicalWin32ModuleForPlatform(this.#platform, observed.value);
        if (!proof.known) throw new Error(proof.reason);
        result = this.#mint(0, 0, { kind: 'platform', object: proof.value, category: 'GameCinitModule' });
      }
    } else if (site === '2046970b') {
      const module = this.#liveWord(argument(0)).provenance;
      if (module?.kind !== 'platform' || module.category !== 'GameCinitModule') throw new Error('Actual current Game module capability required');
      if (literal(argument(1), 'cinitDivideExport') !== 'IsProcessorFeaturePresent') throw new Error('Original Game feature export name required');
      const resolve = NativeRuntimePlatform.prototype.getWin32Procedure as
        (this: NativeRuntimePlatform, module: NativeWin32ModuleCapability, name: 'IsProcessorFeaturePresent') => NativeValue<NativeCrtProcessorFeatureProcedure | null>;
      const observed = resolve.call(this.#platform, module.object as NativeWin32ModuleCapability, 'IsProcessorFeaturePresent');
      if (!observed.known) throw new Error(observed.reason);
      if (!observed.value) result = this.#mint(0, 0xffffffff);
      else {
        const proof = NativeRuntimePlatform.canonicalProcessorFeatureProcedureForPlatform(this.#platform, observed.value);
        if (!proof.known) throw new Error(proof.reason);
        result = this.#mint(0, 0, { kind: 'platform', object: proof.value, category: 'GameCinitFeature' });
      }
    } else {
      const selected = this.#liveWord(this.#load(this.#bank, this.#reg('EAX'))).provenance;
      if (selected?.kind !== 'platform' || selected.category !== 'GameCinitFeature') throw new Error('Actual current Game feature procedure required');
      const procedure = NativeRuntimePlatform.canonicalProcessorFeatureProcedureForPlatform(this.#platform, selected.object);
      if (!procedure.known) throw new Error(procedure.reason);
      const value = procedure.value.invoke(this.#numeric(argument(0), 4));
      if (!value.known) throw new Error(value.reason);
      result = this.#mint(value.value, 0xffffffff);
    }
    this.#store(this.#bank, this.#reg('EAX'), result);
    const returned = this.#ret(spec[1]), provenance = this.#record(returned).provenance;
    if (provenance?.kind !== 'source' || provenance.type !== 'code' || provenance.address !== next) throw new Error('Actual Game cinit import return required');
  }); }
  clearX87Exceptions(controller: object): NativeValue<void> { return this.#run(controller, () => {
    const status = this.#record(this.#load(this.#bank, 40));
    this.#store(this.#bank, 40, this.#mint(status.value & ~0x80ff, status.mask | 0x80ff));
  }); }
  effectiveAddress(controller: object, terms: readonly { word: NativeX86Word32; scale?: number; negative?: boolean }[], displacement: number): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    if (!Number.isSafeInteger(displacement)) throw new Error('Actual source displacement required');
    let pointer: NativeX86Word32 | null = null, scalar = displacement;
    for (const term of terms) {
      const p = this.#liveWord(term.word).provenance, scale = term.scale ?? 1;
      if (![1, 2, 4, 8].includes(scale)) throw new Error('Actual x86 source scale required');
      if (p && ['stack', 'allocation', 'module', 'process', 'shared-local'].includes(p.kind)) {
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
      if (this.#phase !== 'cold'&&!(this.#phase==='returned'&&this.#sharedToGameHandoff&&!this.#initial)) throw new Error(this.#boundary ?? 'Actual ioInit CALL cannot restart');
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
    const label = address === '206e9018' ? 'cinitSse2ProbeEH4Scope' : address === '206e8db0' ? 'cinitNonwritableEH4Scope' : address === '206e8e90' ? 'ioInitEH4Scope' : address === '206e8f98' ? 'callocEH4Scope' : address === '206e8e70' ? 'sectionInitExceptionTable' : address === '206e8cb8' ? 'setMbcEH4Scope' : address === '206e8c98' ? 'updateMbcEH4Scope' : address === '206e8b70' ? 'freeEH4Scope' : null;
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
    if (width === 4 && p?.kind === 'module' && q?.kind === 'module') {
      const crt = this.#binding!.crt;
      for (const entry of [p, q]) {
        const fields = NativeModuleCrtOwner.canonicalImageForOwner(crt, entry.label);
        if (!fields.known || fields.value !== entry.fields) throw new Error('Actual same-Game canonical module comparison required');
        const access = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, entry.label, entry.offset, 0);
        if (!access.known) throw new Error(access.reason);
      }
      // These are admitted addresses in the retained virtual Game image,
      // independent of host buffer placement or opaque allocation addresses.
      const av = Number.parseInt(nativeGameImageReceipt(p.label).address, 16) + p.offset;
      const bv = Number.parseInt(nativeGameImageReceipt(q.label).address, 16) + q.offset;
      this.#arithmeticFlags(av, bv, (av - bv) >>> 0, 4, true); return;
    }
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
    if (width === 4 && left === right && (a.provenance && ['allocation','heap','platform','module','process','stack','shared-local'].includes(a.provenance.kind))) { this.#flags(0, 0x841); return; }
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
    if (width === 4 && op === 'sub' && a.provenance?.kind === 'module' && b.provenance?.kind === 'module') {
      const p = a.provenance, q = b.provenance;
      const crt = this.#binding!.crt;
      for (const entry of [p, q]) {
        const fields = NativeModuleCrtOwner.canonicalImageForOwner(crt, entry.label);
        if (!fields.known || fields.value !== entry.fields) throw new Error('Actual same-Game canonical module difference required');
        const proof = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, entry.label, entry.offset, 0);
        if (!proof.known) throw new Error(proof.reason);
      }
      // Both views belong to the same retained virtual Game image. Its original
      // relative addresses prove this difference without inventing a host address.
      const av = Number.parseInt(nativeGameImageReceipt(p.label).address, 16) + p.offset;
      const bv = Number.parseInt(nativeGameImageReceipt(q.label).address, 16) + q.offset;
      const value = (av - bv) >>> 0;
      this.#flags((av < bv ? 1 : 0) | (value === 0 ? 0x40 : 0) | (value & 0x80000000 ? 0x80 : 0) |
        (this.#parity(value & 255) ? 4 : 0), 0xc5);
      return this.#mint(value, 0xffffffff);
    }
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
    // A retained single-bit XOR relation cancels every unchanged unknown bit.
    // This proves the original EFLAGS ID-toggle difference without inventing
    // values for arithmetic flags left unknown by earlier platform imports.
    if (width === 4 && op === 'sub' && a.provenance?.kind === 'xor' && a.provenance.left === right) {
      const toggled = this.#liveWord(a.provenance.right), bit = toggled.value >>> 0;
      if (toggled.mask === 0xffffffff && bit !== 0 && (bit & (bit - 1)) === 0 && (b.mask & bit) !== 0) {
        const value = ((b.value & bit) ? -bit : bit) >>> 0;
        this.#arithmeticFlags(a.value, b.value, value, 4, true);
        return this.#mint(value, 0xffffffff);
      }
    }
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
    if (width === 4 && r.provenance && ['stack', 'allocation', 'module', 'process', 'shared-local'].includes(r.provenance.kind)) { this.#flags(1, 0x41); return this.#mint(-r.value, r.mask, { kind: 'neg', word }); }
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
    const p = this.#liveWord(word).provenance;
    // Preserve stack expression provenance, including unknown EH words.
    // Opaque local object pointers also carry their physical capability.
    if (width === 4 && memory.fields === this.#stack && p?.kind !== 'shared-local') { this.#store(memory.fields, memory.offset, word); return; }
    if (width === 4 && (p?.kind === 'platform' || p?.kind === 'allocation' || p?.kind === 'module' || p?.kind === 'process' || p?.kind === 'shared-local' || p?.kind === 'stack')) {
      this.#invalidateRange(memory.fields, memory.offset, 4); this.#store(memory.fields, memory.offset, word);
      const pointer=p.kind === 'platform' ? p.object : p.kind === 'module' ? this.#modulePointer(p) : p.kind==='shared-local'?Object.freeze({fields:p.fields,offset:p.offset??0}):p.kind==='stack'?Object.freeze({fields:this.#stack,offset:p.offset}):p.pointer;
      NativeHeapObjectViews.prototype.pointer.call(memory.fields, memory.offset).set(pointer);
      if(p.kind==='shared-local'||p.kind==='stack')this.#nativePointers.set(pointer,word);
      // The physical pointer capability store makes its numerical bits opaque.
      // Retain that owned store's expression with the same physical masks.
      if(record.mask!==0)this.#slots.get(memory.fields)!.set(memory.offset,Object.freeze({word:this.#mint(record.value,0,p),bytes:Object.freeze(Array.from(memory.fields.bytes.subarray(memory.offset,memory.offset+4))),masks:Object.freeze(Array.from(memory.fields.knownMask.subarray(memory.offset,memory.offset+4)))}));
      return;
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
    const word = memory ? this.#dllMemoryController ? this.#load(memory.fields,memory.offset) : this.#currentMemoryWord(memory.fields, memory.offset) : source;
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
    const args: NativeStandardIoArguments & {readonly site:NativeStandardIoCallSite} = Object.freeze({ site, kind: spec.kind, crt: binding.crt, scalar, object, procedure, section, sectionFields });
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
          : provenance?.kind === 'engine-locale' ? Object.freeze({kind:provenance.kind,module:provenance.crt.module,capacity:provenance.fields.bytes.length})
          : provenance?.kind === 'engine-mbc' ? Object.freeze({kind:provenance.kind,module:provenance.crt.module,capacity:provenance.fields.bytes.length})
          : provenance?.kind === 'engine-ptd' ? Object.freeze({kind:provenance.kind,module:provenance.crt.module,capacity:provenance.fields.bytes.length})
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
    return Object.freeze({sharedDllFileVersionFrame:this.#sharedDllFileVersionFrame,sharedDllTranslationFrame:this.#sharedDllTranslationFrame,sharedDllFormatFrame:this.#sharedDllFormatFrame?Object.freeze({...this.#sharedDllFormatFrame}):null,sharedDllLanguageFrame:this.#sharedDllLanguageFrame?Object.freeze({...this.#sharedDllLanguageFrame}):null,sharedDllResourceFrame:this.#sharedDllResourceFrame?Object.freeze({...this.#sharedDllResourceFrame}):null,sharedDllVersionFrame:this.#sharedDllVersionFrame?Object.freeze({...this.#sharedDllVersionFrame}):null,sharedDllInitializerFrame:this.#sharedDllInitializerFrame?Object.freeze({entryEsp:this.#sharedDllInitializerFrame.entryEsp,outputs:this.#sharedDllInitializerFrame.outputs,moduleName:this.#sharedDllInitializerFrame.moduleName}):null,memoryMallocFrame:this.#memoryMallocFrame?Object.freeze({entered:this.#memoryMallocFrame.entered,returned:this.#memoryMallocFrame.returned}):null,initializerSehFrames:Object.freeze([...this.#initializerSehFrames].map(([site,frame])=>Object.freeze({site,entered:frame.entered,returned:frame.returned}))),processorSimdFrame:this.#processorSimdFrame?Object.freeze({returned:this.#processorSimdFrame.returned}):null,sharedCrtCallerFrame:this.#sharedCrtCallerFrame?Object.freeze({entryEsp:this.#sharedCrtCallerFrame.entryEsp,ebp:this.#sharedCrtCallerFrame.ebp,returned:this.#sharedCrtCallerFrame.returned}):null,sharedInitializerFrame:this.#sharedInitializerFrame?Object.freeze({entryEsp:this.#sharedInitializerFrame.entryEsp,operations:this.#sharedInitializerFrame.operations,ownershipReturned:this.#sharedInitializerFrame.ownershipReturned,conversionInstalled:this.#sharedInitializerFrame.conversionInstalled,fsRestored:this.#sharedInitializerFrame.fsRestored,moduleCalls:this.#sharedInitializerFrame.moduleCalls,procedureCalls:this.#sharedInitializerFrame.procedureCalls,featureCalls:this.#sharedInitializerFrame.featureCalls,divisionQueryResult:this.#sharedInitializerFrame.divisionQueryResult,initializerResult:this.#sharedInitializerFrame.initializerResult}):null,sharedEnvironmentFrame:this.#sharedEnvironmentFrame?Object.freeze({entryEsp:this.#sharedEnvironmentFrame.entryEsp,operations:this.#sharedEnvironmentFrame.operations,returned:this.#sharedEnvironmentFrame.returned,result:this.#sharedEnvironmentFrame.result,strlenCalls:this.#sharedEnvironmentFrame.strlenCalls,callocCalls:this.#sharedEnvironmentFrame.callocCalls,freeCalls:this.#sharedEnvironmentFrame.freeCalls,initializersPending:this.#sharedEnvironmentFrame.initializersPending}):null,sharedArgvFrame:this.#sharedArgvFrame?Object.freeze({ebp:this.#sharedArgvFrame.ebp,multibytePending:this.#sharedArgvFrame.multibytePending,moduleReturned:this.#sharedArgvFrame.moduleReturned,argumentCount:this.#sharedArgvFrame.argumentCount,byteCount:this.#sharedArgvFrame.byteCount,parsePending:this.#sharedArgvFrame.parsePending,parserStarted:this.#sharedArgvFrame.parserStarted??false,parserReturned:this.#sharedArgvFrame.parserReturned??false,parserOperations:this.#sharedArgvFrame.parserOperations??0,leadCalls:this.#sharedArgvFrame.leadCalls??0,queryCounts:this.#sharedArgvFrame.queryCounts??null,fillCounts:this.#sharedArgvFrame.fillCounts??null,allocationReturned:this.#sharedArgvFrame.allocationReturned??false,fillPending:this.#sharedArgvFrame.fillPending??false,fillReturned:this.#sharedArgvFrame.fillReturned??false,fillOperations:this.#sharedArgvFrame.fillOperations??0,fillLeadCalls:this.#sharedArgvFrame.fillLeadCalls??0,returned:this.#sharedArgvFrame.returned??false,result:this.#sharedArgvFrame.result??null,environmentPending:this.#sharedArgvFrame.environmentPending??false}):null,setMultibyteFrame:this.#setMultibyteFrame?Object.freeze({ebp:this.#setMultibyteFrame.ebp,pendingInstallation:this.#setMultibyteFrame.pendingInstallation,returned:this.#setMultibyteFrame.returned,global:this.#setMultibyteFrame.global,counterCursor:this.#setMultibyteFrame.counterCursor,scope:describe(this.#load(this.#stack,this.#setMultibyteFrame.ebp-8)),cookie:describe(this.#load(this.#stack,this.#setMultibyteFrame.ebp-52)),scopeAtReturn:this.#setMultibyteFrame.scopeAtReturn?describe(this.#setMultibyteFrame.scopeAtReturn):null,cookieAtReturn:this.#setMultibyteFrame.cookieAtReturn?describe(this.#setMultibyteFrame.cookieAtReturn):null,oldFs:describe(this.#setMultibyteFrame.oldFs)}):null,configurationFrame:this.#configurationFrame?Object.freeze({ebp:this.#configurationFrame.ebp,info:this.#configurationFrame.info,codePage:this.#configurationFrame.codePage,returned:this.#configurationFrame.returned}):null,caseFrame:this.#caseFrame?Object.freeze({ebp:this.#caseFrame.ebp,originalEbp:this.#caseFrame.originalEbp,info:this.#caseFrame.info,input:this.#caseFrame.input,types:this.#caseFrame.types,lower:this.#caseFrame.lower,upper:this.#caseFrame.upper,deferredBytes:this.#caseFrame.deferredBytes,tableIndex:this.#caseFrame.tableIndex,returned:this.#caseFrame.returned}):null,mappingFrames:Object.freeze(this.#mappingFrames.map(frame=>Object.freeze({ebp:frame.ebp,input:frame.input,output:frame.output,returned:frame.returned,allocations:Object.freeze(frame.allocations.map(row=>Object.freeze({...row})))}))),...(this.#sharedFrame?{sharedFrame:Object.freeze({ebp:this.#sharedFrame.ebp,requestedBytes:this.#sharedFrame.requestedBytes,allocatedBytes:this.#sharedFrame.allocatedBytes,probedPages:Object.freeze([...this.#sharedFrame.probedPages]),temporary:this.#sharedFrame.temporary})}:{}), phase: this.#phase, boundary: this.#boundary, thread: this.#selection.threadCapability,
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
import {admitAIHelperCloneAllocationImport} from './native-game-ai-helper-accessor-creator-source';
