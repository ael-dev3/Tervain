import { nativeNpcHeapExtension } from '../../src/gothic3/native-memory-admin';
import {nativeArenaHeapExtension,nativeSceneStartupHeapExtension} from '../../src/gothic3/native-memory-admin';
import {NativeMemoryAdmin,type NativeMemoryAllocation} from '../../src/gothic3/native-memory-admin';
import {createNativeRuntimeAdminOwner} from '../../src/gothic3/native-runtime-platform';
import {nativeVirtualX86CpuSelection,type NativeX86CpuSelection} from '../../src/gothic3/native-x86-thread-stack-profile';
import type {NativeWin32ProcessInputSelection} from '../../src/gothic3/native-win32-process-inputs';
import type {NativeArgvNlsCallGrant,NativeWin32ArgvNlsSelection} from '../../src/gothic3/native-win32-argv-nls';
import {browserGameArgvNlsInputs} from '../../src/gothic3/browser-game-argv-nls-inputs';
import {NativeCrtThreadStartup} from '../../src/gothic3/native-crt-thread-startup';
import {describe,expect,it,vi} from 'vitest';
// Retained Engine startup now executes both case conversions; allow for CI load.
vi.setConfig({testTimeout:20_000});
import {NativeCrtBootstrap} from '../../src/gothic3/native-crt-bootstrap';
import {NativeEngineCrtEnvironment} from '../../src/gothic3/native-engine-crt-environment';
import {NativeEngineSetenvpImages} from '../../src/gothic3/native-engine-setenvp-images';
import {NativeEngineCinitImages} from '../../src/gothic3/native-engine-cinit-images';
import {NativeEngineArgvImages} from '../../src/gothic3/native-engine-argv-images';
import {NativeEngineIoImages} from '../../src/gothic3/native-engine-io-images';
import {NativeModuleCrtOwner,NativeEngineCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeX86ThreadStack} from '../../src/gothic3/native-x86-thread-stack';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import type {NativeStartupInfoWriterSelection} from '../../src/gothic3/native-win32-startup-io';
import type {NativeWin32StandardIoSelection} from '../../src/gothic3/native-win32-standard-io';
import {browserGameStandardIoInputs} from '../../src/gothic3/browser-game-standard-io-inputs';
import {browserGameProcessInputs} from '../../src/gothic3/browser-game-process-inputs';
function fixture(startupInfoA?:NativeStartupInfoWriterSelection,standardIo?:NativeWin32StandardIoSelection,argvNls?:NativeWin32ArgvNlsSelection,pageAlignment=true,processInputs:NativeWin32ProcessInputSelection=browserGameProcessInputs,features:{engineHeapLayout?:'rounded-eight';processorFeatureProcedure?:boolean;floatingPointPrecisionErratum?:boolean;cpu?:NativeX86CpuSelection|null}={processorFeatureProcedure:true,floatingPointPrecisionErratum:false}){
 const platform=new NativeRuntimePlatform({engineCrtServices:{...features,argvNls,standardIo,startupIo:startupInfoA?{startupInfoA}:undefined,tlsValues:new Map(),kernel32Available:true,pointerCodec:'absent',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},processInputs,
  entropy:{systemTimeAsFileTime:()=>({known:true,value:{low:0x12345678,high:1}}),currentProcessId:()=>({known:true,value:4}),currentThreadId:()=>({known:true,value:5}),tickCount:()=>({known:true,value:6}),performanceCounter:()=>({known:true,value:{success:true,low:7,high:8}})},
  threadStack:{cpu:features.cpu===null?undefined:features.cpu??nativeVirtualX86CpuSelection,threadCapability:{},reservationBytes:4096,addressModel:'opaque-relative',initialRegisters:'unknown',initialFs0:'unknown',pageAlignment:pageAlignment?'virtual-page-4096':undefined}}});
 let bootstrap:NativeCrtBootstrap;const crt=new NativeEngineCrtOwner({platform,errnoSlot:()=>bootstrap.thread.errnoSlot(),getLastError:()=>platform.getWin32LastError()});bootstrap=NativeCrtBootstrap.forCrt(crt);return {crt,platform,bootstrap};
}
function observeBeforeParser(bootstrap:NativeCrtBootstrap,observe:()=>void){
 const original=NativeCrtBootstrap.engineArgvCommandLineForCrt,spy=vi.spyOn(NativeCrtBootstrap,'engineArgvCommandLineForCrt').mockImplementation((...args)=>{if(args[0]===bootstrap)observe();return original(...args);});try{return bootstrap.processAttach();}finally{spy.mockRestore();}
}
function observeEngineArgvReturn(bootstrap:NativeCrtBootstrap,observe:()=>void,run=()=>bootstrap.processAttach()){
 const original=NativeX86ThreadStack.enterEngineSetenvpForBootstrap,spy=vi.spyOn(NativeX86ThreadStack,'enterEngineSetenvpForBootstrap').mockImplementation((...args)=>{if(args[1]===bootstrap)observe();return original(...args);});try{return run();}finally{spy.mockRestore();}
}
it('executes Engine EH4 on the actual selected thread and retains the pending startup-info argument',()=>{
 const {crt,bootstrap}=fixture(),result=bootstrap.processAttach();expect(result.known).toBe(false);
 if(result.known)throw new Error('Engine I/O writer is still pending');expect(result.reason).toContain('Engine GetStartupInfoA IAT30afc748 at30688701');
 const frame=bootstrap.attachProgress().engineIoProgress!;
 expect(frame).toMatchObject({module:'Engine',phase:'blocked',pc:'30688701',operations:28,entryEsp:4096,ebp:4088,prologReturned:true,fsPublished:true});
 expect(frame.startupInfo!.backing).toBe(frame.stack.backing);expect(frame.startupInfo!.bytes.length).toBe(68);
 expect(frame.startupInfo!.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.ebp!-0x64);
 expect([...frame.startupInfo!.knownMask]).toEqual(Array(68).fill(0));
 expect(frame.stack.readUnsigned(frame.ebp!-4)).toBe(0);expect(frame.bank.readUnsigned(20)).toBe(0);
 expect(frame.stack.maskedWord(frame.ebp!-8).knownMask).toBe(0);
 expect(frame.bank.maskedWord(32).knownMask).not.toBe(0xffffffff);
 expect(bootstrap.attachProgress().ioResult).toBe(null);expect(bootstrap.attachProgress().ioProgress).toBe(null);
 const trace=bootstrap.snapshot().trace;expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.snapshot().trace).toEqual(trace);
 expect(bootstrap.attachProgress().engineIoProgress!.operations).toBe(28);expect(crt.module).toBe('Engine');
});
it('rejects descriptive permits before creating or replaying a physical Engine frame',()=>{
 const {crt,platform,bootstrap}=fixture(),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(NativeX86ThreadStack.enterEngineIoForBootstrap(graph.value,bootstrap,crt,{}).known).toBe(false);expect(graph.value.engineIoFrameSnapshot(crt)).toBe(null);
 bootstrap.processAttach();const frame=bootstrap.attachProgress().engineIoProgress!;
 expect(NativeX86ThreadStack.enterEngineIoForBootstrap(graph.value,bootstrap,crt,Object.freeze({})).known).toBe(false);
 expect(graph.value.engineIoFrameSnapshot(crt)!.operations).toBe(frame.operations);
});
it('retains the pushed frame prefix when the current Engine cookie becomes unknown',()=>{
 const {bootstrap}=fixture(),original=NativeHeapObjectViews.prototype.readUnsigned;let injected=false;
 const read=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(this===bootstrap.physical.securityCookie&&!injected&&bootstrap.attachProgress().engineIoProgress?.pc==='3067e51d'){injected=true;this.knownMask[0]=0;}
  return original.call(this,offset,width);
 });
 const result=bootstrap.processAttach();read.mockRestore();expect(result.known).toBe(false);
 const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame).toMatchObject({phase:'blocked',pc:'3067e51d',operations:12,prologReturned:false,fsPublished:false,startupInfo:null});
 expect([...frame.bank.knownMask.subarray(32,36)]).toEqual([0,0,0,0]);
 expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.attachProgress().engineIoProgress!.operations).toBe(12);
});

it('returns from the Engine startup writer with actual stores and stdcall cleanup',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:0,width:4,value:68,knownMask:0xffffffff},{offset:45,width:1,value:0xa5,knownMask:0xff},{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'});
 const result=bootstrap.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Continuation unfinished');expect(result.reason).toContain('Engine GetStdHandle IAT30afc718 at306888a1');
 const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame.operations).toBe(445);expect(frame.callocReturned).toBe(true);expect(frame.allocation!.bytes.length).toBe(1792);for(let record=0;record<32;record++){const expected=Array(56).fill(0);expected.splice(0,4,255,255,255,255);expected[5]=expected[0x25]=expected[0x26]=10;if(record===0)expected[4]=0x81;expect([...frame.allocation!.bytes.subarray(record*56,(record+1)*56)]).toEqual(expected);}expect([...frame.allocation!.knownMask]).toEqual(Array(1792).fill(255));
 const images=bootstrap.attachProgress().engineIoImages!,table=NativeEngineIoImages.imageForCrt(images,crt,'ioBlockPointers'),count=NativeEngineIoImages.imageForCrt(images,crt,'ioHandleCount');if(!table.known||!count.known)throw new Error('Missing Engine images');expect(count.value.readUnsigned(0)).toBe(32);expect(table.value.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()).toMatchObject({fields:frame.allocation,offset:0});expect(frame.startupInfo!.readUnsigned(0)).toBe(68);expect(frame.startupInfo!.readUnsigned(45,1)).toBe(0xa5);
 for(const offset of [8,12])expect(frame.bank.maskedWord(offset).knownMask).toBe(0);
 const trace=bootstrap.snapshot().trace;expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.snapshot().trace).toEqual(trace);
});
it('retains Engine writer prefix on unknown outcome without normal-return cleanup',()=>{
 const {bootstrap}=fixture({writes:[{offset:0,width:4,value:68,knownMask:0xffffffff}],outcome:'unknown',reason:'Engine writer unavailable after prefix'});
 const result=bootstrap.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Unknown writer returned');expect(result.reason).toContain('Engine writer unavailable after prefix');
 const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame.pc).toBe('30688701');expect(frame.operations).toBe(28);expect(frame.startupInfo!.readUnsigned(0)).toBe(68);
 expect(bootstrap.processAttach()).toEqual(result);expect(frame.startupInfo!.readUnsigned(0)).toBe(68);
});

it('rejects a changed Engine stdcall return after retaining writer stores',()=>{
 const {bootstrap}=fixture({writes:[{offset:0,width:4,value:68,knownMask:0xffffffff}],outcome:'normal'});
 const original=NativeRuntimePlatform.canonicalStartupInfoNormalReturnForPlatform;
 const proof=vi.spyOn(NativeRuntimePlatform,'canonicalStartupInfoNormalReturnForPlatform').mockImplementation((platform,grant)=>{
  const result=original.call(NativeRuntimePlatform,platform,grant);
  const frame=bootstrap.attachProgress().engineIoProgress;
  if(frame?.pc==='30688701'){
   // Last source push holds the argument; the import return is directly below.
   frame.stack.knownMask[frame.ebp!-0x7c]=0xff;
  }
  return result;
 });
 let result;try{result=bootstrap.processAttach();}finally{proof.mockRestore();}
 expect(result.known).toBe(false);if(result.known)throw new Error('Changed return accepted');
 expect(result.reason).toContain('Retained x86 expression slot changed outside its actual store');
 const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame.pc).toBe('30688701');expect(frame.operations).toBe(28);expect(frame.startupInfo!.readUnsigned(0)).toBe(68);
 expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the first initialized Engine record when its published table pointer changes',()=>{
 const {bootstrap,crt}=fixture({writes:[],outcome:'normal'}),original=NativeHeapObjectViews.prototype.writeUnsigned;let injected=false;
 const write=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){
  original.call(this,offset,value,width);
  const frame=bootstrap.attachProgress().engineIoProgress;
  if(!injected&&frame?.allocation===this&&offset===5){
   injected=true;const table=NativeEngineIoImages.imageForCrt(bootstrap.attachProgress().engineIoImages!,crt,'ioBlockPointers');if(!table.known)throw new Error(table.reason);table.value.pointer(0).set(null);
  }
 });
 let result;try{result=bootstrap.processAttach();}finally{write.mockRestore();}
 expect(result.known).toBe(false);if(result.known)throw new Error('Changed table accepted');expect(result.reason).toContain('Actual current Engine I/O table base required');
 const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame.pc).toBe('30688753');expect(frame.operations).toBe(53);expect(frame.allocation!.readUnsigned(0)).toBe(0xffffffff);expect(frame.allocation!.readUnsigned(5,1)).toBe(10);expect(frame.allocation!.readUnsigned(0x26,1)).toBe(10);expect(frame.allocation!.readUnsigned(56)).toBe(0);
 expect(bootstrap.processAttach()).toEqual(result);expect(frame.allocation!.readUnsigned(56)).toBe(0);
});

it('does not skip an unknown or nonzero inherited-handle size',()=>{
 for(const [value,knownMask,pc,operations] of [[0,0,'30688763',429],[1,0xffff,'30688767',430]] as const){
  const {bootstrap}=fixture({writes:[{offset:50,width:2,value,knownMask}],outcome:'normal'}),result=bootstrap.processAttach();expect(result.known).toBe(false);
  const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame.pc).toBe(pc);expect(frame.operations).toBe(operations);expect(frame.allocation!.readUnsigned(4,1)).toBe(0);
  expect(bootstrap.processAttach()).toEqual(result);expect(frame.allocation!.readUnsigned(4,1)).toBe(0);
 }
});

it('retains actual Engine standard-handle outcomes without manufacturing a handle',()=>{
 for(const outcome of ['valid','null','invalid','unknown'] as const){
  const standardIo={...browserGameStandardIoInputs,standardHandles:browserGameStandardIoInputs.standardHandles.map((entry,index)=>index===0?{...entry,result:outcome}:entry)};
  const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},standardIo);
  const result=bootstrap.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Continuation unfinished');
  const frame=bootstrap.attachProgress().engineIoProgress!;
  if(outcome==='unknown'){expect(result.reason).toContain('Declared standard-handle result is unknown');expect(frame.pc).toBe('306888a1');expect(frame.operations).toBe(445);}
  else{expect(result.reason).toContain(outcome==='valid'?'Engine GetACP IAT30afc734 at30684c28':outcome==='null'?'Engine NULL standard handle branch at306888f1':'Engine invalid standard handle branch at306888f1');expect(frame.operations).toBe(outcome==='valid'?579:outcome==='null'?450:448);if(outcome==='valid'){expect(frame.fileType).toBe(2);expect(frame.sectionResult).toBe(true);expect(frame.section!.backing).toBe(frame.allocation!.backing);expect(frame.section!.bytes.length).toBe(24);expect(frame.section!.bytes.byteOffset-frame.allocation!.bytes.byteOffset).toBe(124);expect(frame.allocation!.readUnsigned(8)).toBe(1);}else expect(frame.bank.readUnsigned(0)).toBe(outcome==='null'?0:0xffffffff);}
  expect(bootstrap.processAttach()).toEqual(result);
 }
});

it('rejects an altered Engine standard-input return without completing stack cleanup',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs);
 const original=NativeRuntimePlatform.canonicalStandardIoNormalReturnForPlatform;
 const proof=vi.spyOn(NativeRuntimePlatform,'canonicalStandardIoNormalReturnForPlatform').mockImplementation((platform,grant)=>{
  const result=original.call(NativeRuntimePlatform,platform,grant),frame=bootstrap.attachProgress().engineIoProgress;
  if(frame?.pc==='306888a1')frame.stack.knownMask[frame.ebp!-0x7c]=0xff;
  return result;
 });
 let result;try{result=bootstrap.processAttach();}finally{proof.mockRestore();}
 expect(result.known).toBe(false);if(result.known)throw new Error('Changed standard-input return accepted');expect(result.reason).toContain('Retained x86 expression slot changed outside its actual store');
 const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame.pc).toBe('306888a1');expect(frame.operations).toBe(445);expect(frame.allocation!.readUnsigned(4,1)).toBe(0x81);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains declared Engine GetFileType DWORDs and last-error state',()=>{
 for(const fileType of [0,1,2,3,0xffffffff]){
  const standardIo={...browserGameStandardIoInputs,standardHandles:browserGameStandardIoInputs.standardHandles.map((entry,index)=>index===0?{...entry,fileType,fileTypeLastError:17}:entry)};
  const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},standardIo),result=bootstrap.processAttach();expect(result.known).toBe(false);
  const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame.pc).toBe(fileType===0?'306888bb':'3068892b');expect(frame.operations).toBe(fileType===0?454:fileType===3?580:579);expect(frame.fileType).toBe(fileType===0?0:2);expect(frame.allocation!.readUnsigned(4,1)).toBe(fileType===2?0xc1:fileType===3?0x89:0x81);if(fileType!==0){const adopted=frame.allocation!.pointer<object>(0).get();expect(adopted).not.toBe(null);expect(NativeRuntimePlatform.standardIoCapabilityForPlatform(platform,adopted!)).toEqual({known:true,value:'handle'});expect(frame.allocation!.maskedWord(0).knownMask).toBe(0);}expect(platform.getWin32LastError()).toEqual({known:true,value:fileType===0?17:0});expect(bootstrap.processAttach()).toEqual(result);
 }
});

it('does not increment the Engine record count after a false section result',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs);
 const section=vi.spyOn(NativeEngineCrtOwner.prototype,'initializeHeapCriticalSection').mockReturnValue({known:true,value:false});
 let result;try{result=bootstrap.processAttach();}finally{section.mockRestore();}
 expect(result.known).toBe(false);if(result.known)throw new Error('False section accepted');expect(result.reason).toContain('Engine I/O section failure at30688923');
 const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame.pc).toBe('306888ea');expect(frame.operations).toBe(468);expect(frame.sectionResult).toBe(false);expect(frame.allocation!.readUnsigned(8)).toBe(0);expect(bootstrap.processAttach()).toEqual(result);
});

it('adopts three distinct standard handles and increments each Engine record once',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs);
 const result=bootstrap.processAttach();expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineIoProgress!,handles:object[]=[];
 for(let record=0;record<3;record++){
  const offset=record*56,handle=frame.allocation!.pointer<object>(offset).get();expect(handle).not.toBe(null);handles.push(handle!);
  expect(NativeRuntimePlatform.standardIoCapabilityForPlatform(platform,handle!)).toEqual({known:true,value:'handle'});expect(frame.allocation!.readUnsigned(offset+4,1)).toBe(0xc1);expect(frame.allocation!.readUnsigned(offset+8)).toBe(1);
 }
 expect(new Set(handles).size).toBe(3);expect(frame.allocation!.readUnsigned(3*56)).toBe(0xffffffff);expect(frame.allocation!.readUnsigned(3*56+8)).toBe(0);expect(bootstrap.processAttach()).toEqual(result);
});

it('restores the Engine I/O frame and returns zero after declared SetHandleCount results',()=>{
 for(const countResult of [0,17,0xffffffff]){
  const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},{...browserGameStandardIoInputs,setHandleCount:{result:countResult}});
  const original=NativeX86ThreadStack.returnedEngineIoForBootstrap;let returnedMasks:number[]=[];let returnedEax:number|null=null;
  const proof=vi.spyOn(NativeX86ThreadStack,'returnedEngineIoForBootstrap').mockImplementation((stack,owner,actualCrt,permit)=>{const value=original.call(NativeX86ThreadStack,stack,owner,actualCrt,permit);if(value.known&&owner===bootstrap){returnedMasks=[...owner.attachProgress().engineIoProgress!.bank.knownMask];returnedEax=owner.attachProgress().engineIoProgress!.bank.readUnsigned(0);}return value;});
  let result;try{result=bootstrap.processAttach();}finally{proof.mockRestore();}expect(result.known).toBe(false);if(result.known)throw new Error('CRT caller continuation unfinished');expect(result.reason).toContain('Engine GetACP IAT30afc734 at30684c28');
  const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame.phase).toBe('returned');expect(frame.pc).toBe('3068892b');expect(frame.operations).toBe(579);expect(frame.fsRestored).toBe(true);expect(frame.setHandleCountResult).toBe(countResult);expect(returnedEax).toBe(0);
  for(const offset of [4,16,20,24,32])expect(returnedMasks.slice(offset,offset+4)).toEqual([0,0,0,0]);
  expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.attachProgress().engineIoProgress!.operations).toBe(579);
 }
});

it('retains the actual Engine I/O caller result without granting descriptive return proofs',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(NativeX86ThreadStack.returnedEngineIoForBootstrap(graph.value,bootstrap,crt,{}).known).toBe(false);expect(bootstrap.attachProgress().ioResult).toBe(null);
 const result=bootstrap.processAttach();expect(result.known).toBe(false);expect(bootstrap.attachProgress().ioResult).toBe(0);expect(bootstrap.attachProgress().nextBoundary).toMatchObject({address:'30677276',target:'3068e76f'});
 expect(NativeX86ThreadStack.returnedEngineIoForBootstrap(graph.value,bootstrap,crt,{}).known).toBe(false);expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.attachProgress().ioResult).toBe(0);
});

it('executes the Engine argument prefix on the retained thread and rejects replay permits',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(NativeX86ThreadStack.enterEngineArgvForBootstrap(graph.value,bootstrap,crt,{}).known).toBe(false);expect(graph.value.engineArgvFrameSnapshot(crt)).toBe(null);
 const result=bootstrap.processAttach();expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;
 expect(frame).toMatchObject({phase:'blocked',pc:'30684c28',operations:171,entryEsp:4096,ebp:4088});expect(frame.stack).toBe(bootstrap.attachProgress().engineIoProgress!.stack);expect(frame.bank.readUnsigned(4)).toBe(0);expect(frame.codepageLocaleRecord).not.toBe(null);
 expect(NativeX86ThreadStack.enterEngineArgvForBootstrap(graph.value,bootstrap,crt,{}).known).toBe(false);expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.attachProgress().engineArgvProgress!.operations).toBe(171);
});
it('uses the current Engine argument readiness bits rather than reseeding them',()=>{
 for(const [ready,mask,pc,operations] of [[1,255,'3068e799',14],[0,0,'3068e778',5]] as const){
  const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs);
  const image=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'multibyteReady');if(!image.known)throw new Error(image.reason);image.value.writeUnsigned(0,ready);image.value.knownMask[0]=mask;
  const result=bootstrap.processAttach();expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc,operations});expect(image.value.bytes[0]).toBe(ready);expect(image.value.knownMask[0]).toBe(mask);expect(bootstrap.processAttach()).toEqual(result);
 }
});

it('retains the pending Engine multibyte argument without prematurely marking it ready',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach();expect(result.known).toBe(false);
 const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame.pc).toBe('30684c28');expect(frame.operations).toBe(171);expect(frame.stack.readUnsigned(frame.entryEsp-40)).toBe(0xfffffffd);expect(frame.multibyteEbp).toBe(frame.entryEsp-48);expect(frame.multibyteFsPublished).toBe(true);expect(frame.multibytePrologReturned).toBe(true);expect(graph.value.snapshot().fs0).toMatchObject({changed:false,word:{provenance:{kind:'stack',offset:frame.multibyteEbp!-16}}});expect(frame.stack.readUnsigned(frame.multibyteEbp!-32)).toBe(0xffffffff);expect(frame.stack.maskedWord(frame.entryEsp-44).knownMask).toBe(0);
 const ready=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'multibyteReady');if(!ready.known)throw new Error(ready.reason);expect(ready.value.readUnsigned(0)).toBe(0);expect(bootstrap.processAttach()).toEqual(result);expect(ready.value.readUnsigned(0)).toBe(0);
});
it('rereads current readiness in the Engine initialization wrapper and preserves its real return',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),ready=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'multibyteReady');if(!ready.known)throw new Error(ready.reason);
 const original=NativeHeapObjectViews.prototype.readUnsigned;let reads=0;
 const read=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this===ready.value&&++reads===2)this.writeUnsigned(0,1);return original.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{read.mockRestore();}
 expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame.pc).toBe('3068e799');expect(frame.operations).toBe(19);expect(reads).toBe(2);expect(ready.value.readUnsigned(0)).toBe(1);expect(bootstrap.processAttach()).toEqual(result);
});

it('stops nested multibyte setup at an unknown actual Engine cookie',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs);
 expect(NativeCrtBootstrap.engineArgvCookieForCrt(bootstrap,crt,{}).known).toBe(false);
 const original=NativeCrtBootstrap.engineArgvCookieForCrt;
 const read=vi.spyOn(NativeCrtBootstrap,'engineArgvCookieForCrt').mockImplementation((owner,actualCrt,permit)=>{owner.physical.securityCookie.knownMask[0]=0;return original.call(NativeCrtBootstrap,owner,actualCrt,permit);});
 let result;try{result=bootstrap.processAttach();}finally{read.mockRestore();}
 expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({phase:'blocked',pc:'3067e51d',operations:26,multibyteFsPublished:false,multibytePrologReturned:false});
 expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.physical.securityCookie.knownMask[0]).toBe(0);
});

it('returns the actual Engine PTD through both pending getter calls',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(NativeCrtBootstrap.engineArgvPtdForCrt(bootstrap,crt,{}).known).toBe(false);
 const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;
 expect(frame).toMatchObject({pc:'30684c28',operations:171,multibyteGetterReturned:true});expect(frame.multibytePtd).not.toBe(null);
 expect(NativeCrtThreadStartup.canonicalPtdForCrt(crt,frame.multibytePtd!)).toEqual({known:true,value:frame.multibytePtd});
 expect(graph.value.snapshot().registers.EDI).toMatchObject({changed:false,word:{provenance:{kind:'engine-ptd',module:'Engine',capacity:532}}});
 const calls=graph.value.snapshot().calls;for(const site of ['30684e7d','3067e12c'])expect(calls.find(call=>call.site===site)?.returned).toBe(true);expect(calls.find(call=>call.site==='30684e87')?.returned).toBe(true);
 expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.attachProgress().engineArgvProgress!.multibytePtd).toBe(frame.multibytePtd);
});
it('rejects an unowned PTD returned from the reached Engine getter service',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),fake=new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(532),knownMask:new Uint8Array(532).fill(255),freed:false});
 const read=vi.spyOn(NativeCrtThreadStartup.prototype,'getPtdNoExit').mockReturnValue({known:true,value:fake});let result;try{result=bootstrap.processAttach();}finally{read.mockRestore();}
 expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc:'3067e12c',operations:41,multibyteGetterReturned:false,multibytePtd:null});expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the original fatal call when the reached Engine PTD service returns NULL',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const read=vi.spyOn(NativeCrtThreadStartup.prototype,'getPtdNoExit').mockReturnValue({known:true,value:null});let result;try{result=bootstrap.processAttach();}finally{read.mockRestore();}
 expect(result.known).toBe(false);if(result.known)throw new Error('Original fatal dependency must stop');expect(result.reason).toContain('Engine NULL PTD fatal error3067cf89 at3067e139');
 const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067cf89',operations:47,multibyteGetterReturned:false,multibytePtd:null});
 const call=graph.value.snapshot().calls.find(call=>call.site==='3067e139')!;expect(call.returned).toBe(false);expect(frame.stack.readUnsigned(call.position+4)).toBe(16);expect(bootstrap.processAttach()).toEqual(result);
});

it('returns the Engine locale helper with the retained MBC and restores the nested frame',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(NativeCrtBootstrap.engineArgvMbcForCrt(bootstrap,crt,{}).known).toBe(false);expect(NativeCrtBootstrap.engineArgvLocaleLockForCrt(bootstrap,crt,{},'lock').known).toBe(false);
 const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;
 expect(frame).toMatchObject({pc:'30684c28',operations:171,localePrologReturned:true,localeGetterReturned:true,localeReturned:true,localeFsRestored:true,localeLockHeld:false});
 expect(frame.localeMbc).toBe(bootstrap.thread.physical.mbcObject);expect(frame.localePtd).toBe(frame.multibytePtd);expect(frame.localeEbp).toBe(frame.multibyteEbp!-60);
 expect(graph.value.snapshot().fs0).toMatchObject({changed:false,word:{provenance:{kind:'stack',offset:frame.multibyteEbp!-16}}});
 expect(frame.bank.readUnsigned(16)).toBe(0xfffffffd);const calls=graph.value.snapshot().calls;for(const site of ['30684b41','30684b46','30684b76','30684bcb','30684bd7','30684b6e','30684e87'])expect(calls.find(call=>call.site===site)?.returned).toBe(true);
 expect(calls.find(call=>call.site==='30684e92')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains lock 13 at the original unsupported MBC replacement branch',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),image=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'currentMultibytePointer');if(!image.known)throw new Error(image.reason);image.value.writeUnsigned(0,0);
 const result=bootstrap.processAttach();expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc:'30684b8e',operations:96,localeLockHeld:true,localeReturned:false,localeFsRestored:false});expect(bootstrap.processAttach()).toEqual(result);expect(image.value.readUnsigned(0)).toBe(0);
});
it('reads the current Engine locale flags without repairing unknown bits',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),image=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'multibyteLocaleFlags');if(!image.known)throw new Error(image.reason);image.value.knownMask[0]=0;
 const result=bootstrap.processAttach();expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc:'30684b4d',operations:85,localeLockHeld:false,localeReturned:false});expect(bootstrap.processAttach()).toEqual(result);expect(image.value.knownMask[0]).toBe(0);
});
it('follows the current Engine locale fast path without entering lock 13',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const image=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'multibyteLocaleFlags');if(!image.known)throw new Error(image.reason);image.value.writeUnsigned(0,1);
 const result=bootstrap.processAttach();expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc:'30684c28',operations:159,localeReturned:true,localeFsRestored:true,localeLockHeld:false});expect(graph.value.snapshot().calls.some(call=>call.site==='30684b76')).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the actual locale caller when its lock service cannot return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const lock=vi.spyOn(NativeCrtBootstrap,'engineArgvLocaleLockForCrt').mockReturnValue({known:false,reason:'Reached Engine lock 13 endpoint unavailable'});let result;try{result=bootstrap.processAttach();}finally{lock.mockRestore();}
 expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc:'30684b76',operations:89,localeLockHeld:false,localeReturned:false,localeFsRestored:false});expect(graph.value.snapshot().calls.find(call=>call.site==='30684b76')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('returns Engine GetACP through its retained caller and clears temporary PTD ownership',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;let selectedArgument:number|null=null;const spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30684cc9')selectedArgument=frame.stack.readUnsigned(frame.entryEsp-40);return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}expect(result.known).toBe(false);if(result.known)throw new Error('Startup remains unfinished');
 expect(result.reason).toContain('Engine CRT initializer dependency at100a7338');
 const frame=bootstrap.attachProgress().engineArgvProgress!;
 expect(frame).toMatchObject({pc:'3067727b',operations:13819,codepageCtorReturned:true,codepageAcpReturned:true,codepageReturned:true,codepageResult:1252});
 expect(frame.codepagePtd!.readUnsigned(0x70)).toBe(1);expect(selectedArgument).toBe(1252);

 const automatic=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'codepageAutomatic');if(!automatic.known)throw new Error(automatic.reason);expect(automatic.value.readUnsigned(0)).toBe(0);
 expect(NativeX86ThreadStack.engineArgvNlsArgumentsForPlatform(platform,{identity:{}}).known).toBe(false);
 expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.attachProgress().engineArgvProgress!.operations).toBe(13819);
});

it('preserves an already owned Engine locale flag through the code-page helper',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const original=NativeCrtBootstrap.engineArgvPtdForCrt;let changed=false;
 const probe=vi.spyOn(NativeCrtBootstrap,'engineArgvPtdForCrt').mockImplementation((...args)=>{const result=original(...args);if(result.known&&result.value&&!changed&&bootstrap.attachProgress().engineArgvProgress?.codepageEbp!=null){result.value.writeUnsigned(0x70,3);changed=true;}return result;});
 let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(changed).toBe(true);expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;
 expect(frame).toMatchObject({pc:'3067727b',codepageReturned:true,codepageResult:1252});expect(frame.codepagePtd!.readUnsigned(0x70)).toBe(3);
});
it('retains the pending Engine GetACP call and temporary ownership when no NLS service is selected',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;
 expect(frame).toMatchObject({pc:'30684c28',operations:171,codepageCtorReturned:true,codepageAcpReturned:false,codepageReturned:false});expect(frame.codepagePtd!.readUnsigned(0x70)).toBe(3);
 expect(graph.value.snapshot().calls.find(call=>call.site==='30684c28')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('writes the Engine locale ownership byte without replacing retained padding',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const original=NativeHeapObjectViews.prototype.writeUnsigned;let observed=0;
 const probe=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){
  const frame=bootstrap.attachProgress().engineArgvProgress,selected=frame?.codepageEbp!=null&&this===frame.stack&&offset===frame.codepageEbp-4&&width===1;
  const bytes=selected?this.bytes.slice(offset+1,offset+4):null,masks=selected?this.knownMask.slice(offset+1,offset+4):null;
  original.call(this,offset,value,width);if(selected){observed++;expect(this.bytes.slice(offset+1,offset+4)).toEqual(bytes);expect(this.knownMask.slice(offset+1,offset+4)).toEqual(masks);}
 });try{bootstrap.processAttach();}finally{probe.mockRestore();}expect(observed).toBe(4);
});

it('copies the actual Engine MBC bytes and masks into its separately owned allocation',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const source=bootstrap.thread.physical.mbcObject;source.bytes[500]=0xa5;source.knownMask[500]=0x55;
 const originalBytes=source.bytes.slice(),originalMasks=source.knownMask.slice();const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const original=NativeCrtBootstrap.engineArgvCookieForCrt;let copiedBytes:Uint8Array|null=null,copiedMasks:Uint8Array|null=null;
 const probe=vi.spyOn(NativeCrtBootstrap,'engineArgvCookieForCrt').mockImplementation((...args)=>{const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30684c5e'&&frame.multibyteAllocation){copiedBytes=frame.multibyteAllocation.bytes.slice();copiedMasks=frame.multibyteAllocation.knownMask.slice();}return original(...args);});
 let ecxMask:number|null=null;let result;try{result=observeBeforeParser(bootstrap,()=>{ecxMask=bootstrap.attachProgress().engineArgvProgress!.bank.maskedWord(8).knownMask;});}finally{probe.mockRestore();}expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!,destination=frame.multibyteAllocation!;
 expect(frame).toMatchObject({pc:'3067727b',operations:13819,multibyteMallocReturned:true,multibyteCopyReturned:true});expect(destination.backing).not.toBe(source.backing);expect(destination.bytes.length).toBe(544);
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:destination,offset:0},544).known).toBe(true);
 expect(destination.readUnsigned(0)).toBe(2);expect(copiedBytes).not.toBe(null);expect(copiedMasks).not.toBe(null);expect(copiedBytes!.slice(4)).toEqual(originalBytes.slice(4));expect(copiedMasks!.slice(4)).toEqual(originalMasks.slice(4));expect(source.bytes.slice(4)).toEqual(originalBytes.slice(4));expect(source.knownMask.slice(4)).toEqual(originalMasks.slice(4));
 expect(ecxMask).toBe(0);expect(graph.value.snapshot().calls.find(call=>call.site==='3067c9c9')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(call=>call.site==='30684ea8')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(call=>call.site==='30684ecb')?.returned).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the original Engine NULL allocation branch without copying or initializing MBC',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);crt.physical.mallocWait.writeUnsigned(0,0);
 const original=platform.win32HeapAlloc.bind(platform),probe=vi.spyOn(platform,'win32HeapAlloc').mockImplementation((heap,flags,bytes)=>bytes===544?{known:true,value:null}:original(heap,flags,bytes));
 let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'30684ffe',operations:205,multibyteAllocation:null,multibyteMallocReturned:true,multibyteCopyReturned:false});expect(bootstrap.thread.errnoSlot()).toMatchObject({known:true});expect(bootstrap.processAttach()).toEqual(result);
});

it('retains a real Engine lower malloc call when its service cannot return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const original=NativeModuleCrtOwner.prototype.malloc,probe=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){return bytes===544?{known:false,reason:'Reached Engine lower malloc unavailable'}:original.call(this,bytes);});
 let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc:'3067c9c9',operations:190,multibyteMallocReturned:false,multibyteAllocation:null,multibyteCopyReturned:false});expect(graph.value.snapshot().calls.find(call=>call.site==='3067c9c9')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the owned Engine allocation when a backward MBC copy is unsupported',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 expect(NativeRuntimePlatform.writeNativeDirectionFlag(platform,1).known).toBe(true);const result=bootstrap.processAttach();expect(result.known).toBe(false);
 const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'30684ec2',operations:206,multibyteMallocReturned:true,multibyteCopyReturned:false});expect(frame.multibyteAllocation).not.toBe(null);
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:frame.multibyteAllocation!,offset:0},544).known).toBe(true);expect(frame.multibyteAllocation!.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('returns both original Engine MBC imports against the real stack arguments',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 let info:Uint8Array|null=null,count:number|null=null;const result=observeBeforeParser(bootstrap,()=>{const f=bootstrap.attachProgress().engineArgvProgress!;info=f.mbcInfo!.bytes.slice();count=f.stack.readUnsigned(f.mbcInitEbp!-28);});expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;
 expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcInitCodepageReturned:true,mbcValidCodepageReturned:true,mbcInfoReturned:true});expect([...info!.slice(0,4)]).toEqual([1,0,0,0]);expect(Array.from(info!.slice(4,18))).toEqual([63,...Array(13).fill(0)]);
 expect(count).toBe(5);expect(frame.codepagePtd!.readUnsigned(0x70)).toBe(1);
 const calls=graph.value.snapshot().calls;for(const site of ['30684c71','30684cc9','30684cdc'])expect(calls.find(call=>call.site===site)?.returned).toBe(true);expect(calls.find(call=>call.site==='30684cf4')?.returned).toBe(true);expect(calls.find(call=>call.site==='30684dc7')?.returned).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});
it('preserves the current Engine special-codepage branch rather than reseeding its table',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),table=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'multibyteCodepageTable');if(!table.known)throw new Error(table.reason);table.value.writeUnsigned(0,1252);
 const result=bootstrap.processAttach();expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc:'30684d31',mbcInitCodepageReturned:true,mbcValidCodepageReturned:false,mbcInfoReturned:false});expect(table.value.readUnsigned(0)).toBe(1252);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains real Engine CPInfo writes when a substituted normal result cannot authorize return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform,probe=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args);return bootstrap.attachProgress().engineArgvProgress?.pc==='30684cdc'?{known:true,value:Object.freeze({kind:'scalar',value:1})}:result;});
 let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'30684cdc',operations:330,mbcValidCodepageReturned:true,mbcInfoReturned:false});expect(frame.mbcInfo!.readUnsigned(0)).toBe(1);expect(graph.value.snapshot().calls.find(call=>call.site==='30684cdc')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});
it('preserves the current unknown Engine code-page table bits at their actual comparison',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),table=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'multibyteCodepageTable');if(!table.known)throw new Error(table.reason);table.value.knownMask[0]=0;
 const result=bootstrap.processAttach();expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc:'30684c94',mbcInitCodepageReturned:true,mbcValidCodepageReturned:false,mbcInfoReturned:false});expect(table.value.knownMask[0]).toBe(0);expect(bootstrap.processAttach()).toEqual(result);
});

it('writes Engine CPInfo fields while retaining the two ABI padding bytes',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const original=NativeHeapObjectViews.prototype.writeUnsigned;let bytes:Uint8Array|null=null,masks:Uint8Array|null=null;
 const probe=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this===bootstrap.attachProgress().engineArgvProgress?.mbcInfo&&offset===0&&width===4){bytes=this.bytes.slice(18,20);masks=this.knownMask.slice(18,20);}original.call(this,offset,value,width);});
 try{bootstrap.processAttach();}finally{probe.mockRestore();}expect(bytes).not.toBe(null);expect(masks).not.toBe(null);const fields=bootstrap.attachProgress().engineArgvProgress!.mbcInfo!;expect(fields.bytes.slice(18,20)).toEqual(bytes);expect(fields.knownMask.slice(18,20)).toEqual(masks);
});

it('initializes the Engine single-byte MBC fields and clears exactly the classification span',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const source=bootstrap.thread.physical.mbcObject;source.bytes[285]=0xa5;source.knownMask[285]=0x55;
 const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;let initialized:Uint8Array|null=null,masks:Uint8Array|null=null;const spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='306849d4'){initialized=frame.multibyteAllocation!.bytes.slice(16,286);masks=frame.multibyteAllocation!.knownMask.slice(16,286);}return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!,fields=frame.multibyteAllocation!;
 expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcMemsetReturned:true,mbcSingleByteInitialized:true});expect(fields.readUnsigned(0)).toBe(2);expect(fields.readUnsigned(4)).toBe(1252);expect(fields.readUnsigned(8)).toBe(0);expect(fields.readUnsigned(12)).toBe(0);expect(initialized).not.toBe(null);expect(Array.from(initialized!.slice(0,269))).toEqual(Array(269).fill(0));expect(Array.from(masks!.slice(0,269))).toEqual(Array(269).fill(255));expect(initialized![269]).toBe(0xa5);expect(masks![269]).toBe(0x55);expect(bootstrap.processAttach()).toEqual(result);
});
it('prepares the case-table frame and its actual code-page arguments on the retained Engine stack',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;let abi:number[]|null=null;const spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30691517'){const caller=graph.value.snapshot().calls.find(call=>call.site==='30684dc7')!,esp=caller.position-1352;abi=[0,4,12,20,24,28].map(offset=>frame.stack.readUnsigned(esp+offset));}return result;});let parentEbp:ReturnType<NativeX86ThreadStack['snapshot']>['registers']['EBP']|null=null,returnedEsp:ReturnType<NativeX86ThreadStack['snapshot']>['registers']['ESP']|null=null;let caseBytesAtReturn:Uint8Array|null=null,caseMasksAtReturn:Uint8Array|null=null;let result;try{result=observeEngineArgvReturn(bootstrap,()=>{returnedEsp=graph.value.snapshot().registers.ESP!;const observed=bootstrap.attachProgress().engineArgvProgress!,call=graph.value.snapshot().calls.find(c=>c.site==='30684dc7')!,caseAt=call.position-1184;caseBytesAtReturn=observed.stack.bytes.slice(caseAt+0x398,caseAt+0x498);caseMasksAtReturn=observed.stack.knownMask.slice(caseAt+0x398,caseAt+0x498);},()=>observeBeforeParser(bootstrap,()=>{parentEbp=graph.value.snapshot().registers.EBP!;}));}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,snapshot=graph.value.snapshot(),caller=snapshot.calls.find(call=>call.site==='30684dc7')!;
 const caseEbp=caller.position-1184;
 expect(frame).toMatchObject({pc:'3067727b',operations:13819});expect(caller.returned).toBe(true);expect(caller.returnWord).toMatchObject({provenance:{kind:'source',type:'code',address:'30684dcc'}});
 expect(parentEbp).toMatchObject({changed:false,word:{provenance:{kind:'stack',offset:frame.ebp!}}});expect(returnedEsp).toMatchObject({changed:false,word:{provenance:{kind:'stack',offset:frame.entryEsp}}});expect(snapshot.registers.ESP).toMatchObject({changed:false,word:{provenance:{kind:'stack',offset:frame.entryEsp-64}}});expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);
 expect(abi).toEqual([0,1,256,1252,0,0]);expect(frame.stack.maskedWord(caseEbp+1176).knownMask).not.toBe(0xffffffff);
 expect(snapshot.calls.find(call=>call.site==='306849d4')?.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='30684a46')?.returned).toBe(true);expect(frame.mbcCaseEbp).toBe(caseEbp);expect(frame.mbcCaseInfoReturned).toBe(true);expect(frame.mbcCaseInfo!.readUnsigned(0)).toBe(1);expect(frame.mbcCaseInfo!.backing).toBe(frame.stack.backing);expect(frame.mbcCaseInfo!.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(caseEbp-124);expect(caseBytesAtReturn).toEqual(Uint8Array.from({length:256},(_,index)=>index===0?32:index));expect(caseMasksAtReturn).toEqual(new Uint8Array(256).fill(255));expect(bootstrap.processAttach()).toEqual(result);
});
it('constructs a separate classification locale record and releases only its acquired ownership after the body returns',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 let ecxMask:number|null=null;const result=observeBeforeParser(bootstrap,()=>{ecxMask=bootstrap.attachProgress().engineArgvProgress!.bank.maskedWord(8).knownMask;}),frame=bootstrap.attachProgress().engineArgvProgress!,snapshot=graph.value.snapshot(),fields=frame.mbcClassifyLocaleRecord!,body=snapshot.calls.find(call=>call.site==='306916cb')!;
 expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcClassifyCtorReturned:true});expect(frame.mbcClassifyPtd).toBe(frame.multibytePtd);expect(frame.mbcClassifyPtd!.readUnsigned(0x70)).toBe(1);expect(fields).not.toBe(frame.codepageLocaleRecord);expect(fields.backing).toBe(frame.stack.backing);expect(fields.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcClassifyEbp!-16);
 expect(snapshot.calls.find(call=>call.site==='306916ae')?.returned).toBe(true);expect(body.returned).toBe(true);expect(body.returnWord).toMatchObject({provenance:{kind:'source',type:'code',address:'306916d0'}});expect(ecxMask).toBe(0);expect(bootstrap.processAttach()).toEqual(result);
});
it('returns the original Unicode classification probe into its separate Engine stack WORD',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;let observed:number|null=null,masks:number[]|null=null;const spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30691517'){observed=frame.mbcClassifyProbe!.readUnsigned(0,2);masks=[...frame.mbcClassifyProbe!.knownMask];}return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,fields=frame.mbcClassifyProbe!,selector=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'classificationApiSelector');if(!selector.known)throw new Error(selector.reason);
 expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcClassifyProbeReturned:true});expect(fields.backing).toBe(frame.stack.backing);expect(fields.bytes.length).toBe(2);expect(fields.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcClassifyBodyEbp!-8);expect(observed).toBe(browserGameArgvNlsInputs.ctype1[0]);expect(frame.mbcConversionQueryReturned).toBe(true);expect(masks).toEqual([255,255]);expect(selector.value.readUnsigned(0)).toBe(1);
 expect(graph.value.snapshot().calls.find(call=>call.site==='30691517')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(call=>call.site==='306916cb')?.returned).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});
it('preserves the two bytes following the probe WORD and rejects its replayed output grant',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform;let bytes:Uint8Array|null=null,masks:Uint8Array|null=null,captured:NativeArgvNlsCallGrant|undefined,afterBytes:Uint8Array|null=null,afterMasks:Uint8Array|null=null;const normalOriginal=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;
 const probe=vi.spyOn(NativeX86ThreadStack,'writeEngineArgvNlsMemoryForPlatform').mockImplementation((...args)=>{const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30691517'){const offset=frame.mbcClassifyBodyEbp!-6;bytes=frame.stack.bytes.slice(offset,offset+2);masks=frame.stack.knownMask.slice(offset,offset+2);captured=args[1];}return original(...args);});
 const normal=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=normalOriginal(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30691517'){const offset=frame.mbcClassifyBodyEbp!-6;afterBytes=frame.stack.bytes.slice(offset,offset+2);afterMasks=frame.stack.knownMask.slice(offset,offset+2);expect(frame.mbcClassifyProbe!.readUnsigned(0,2)).toBe(browserGameArgvNlsInputs.ctype1[0]);}return result;});try{bootstrap.processAttach();}finally{probe.mockRestore();normal.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(bytes).not.toBe(null);expect(afterBytes).toEqual(bytes);expect(afterMasks).toEqual(masks);const output=frame.mbcClassifyProbe!.bytes.slice();expect(original(platform,captured!,0,0,2).known).toBe(false);expect(frame.mbcClassifyProbe!.bytes).toEqual(output);
});
it('reads the current Engine classification selector without reseeding it',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),selector=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'classificationApiSelector');if(!selector.known)throw new Error(selector.reason);selector.value.writeUnsigned(0,2);
 const result=bootstrap.processAttach();expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc:'30691543',operations:1474,mbcClassifyProbeReturned:false});expect(selector.value.readUnsigned(0)).toBe(2);expect(bootstrap.processAttach()).toEqual(result);
});
it('returns the conversion size query from its actual indirect procedure and six arguments',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;let argumentsAtReturn:number[]|null=null,queryResult:number|null=null,inputAtReturn:Uint8Array|null=null,inputMasksAtReturn:Uint8Array|null=null;const probe=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3069158e'){inputAtReturn=frame.mbcConversionInput!.bytes.slice();inputMasksAtReturn=frame.mbcConversionInput!.knownMask.slice();queryResult=result.known&&result.value.kind==='scalar'?result.value.value:null;const position=graph.value.snapshot().calls.find(call=>call.site==='3069158e')!.position;argumentsAtReturn=[4,8,16,20,24].map(offset=>frame.stack.readUnsigned(position+offset));}return result;});let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,query=graph.value.snapshot().calls.find(call=>call.site==='3069158e')!,fields=frame.mbcConversionInput!;
 expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcConversionQueryReturned:true});expect(fields.backing).toBe(frame.stack.backing);expect(fields.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcCaseEbp!+0x398);expect(fields.bytes.length).toBe(256);expect(inputMasksAtReturn).toEqual(new Uint8Array(256).fill(255));expect(inputAtReturn).toEqual(Uint8Array.from({length:256},(_,index)=>index===0?32:index));
 expect(query.returned).toBe(true);expect(query.returnWord).toMatchObject({provenance:{kind:'source',type:'code',address:'30691590'}});expect(argumentsAtReturn).toEqual([1252,1,256,0,0]);expect(frame.mbcStackReturned).toBe(true);expect(frame.mbcStackMemsetReturned).toBe(true);expect(queryResult).toBe(256);expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(graph.value.snapshot().calls.find(call=>call.site==='306915af')?.returned).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the indirect conversion caller when a substitute normal-return object is supplied',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;
 const probe=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>bootstrap.attachProgress().engineArgvProgress?.pc==='3069158e'?{known:true,value:{kind:'scalar',value:256}}:original(...args));let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3069158e',operations:1500,mbcConversionQueryReturned:false,mbcClassifyProbeReturned:true});expect(graph.value.snapshot().calls.find(call=>call.site==='3069158e')?.returned).toBe(false);expect(frame.mbcConversionInput!.bytes).toEqual(Uint8Array.from({length:256},(_,index)=>index===0?32:index));expect(bootstrap.processAttach()).toEqual(result);
});
it('reserves the aligned Engine stack buffer, relocates its real return and clears only its wide span',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;let padding:Uint8Array|null=null,paddingMasks:Uint8Array|null=null,clearedBytes:Uint8Array|null=null,clearedMasks:Uint8Array|null=null,finishedBytes:Uint8Array|null=null,finishedMasks:Uint8Array|null=null;
 const probe=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='306915e3'&&frame.mbcStackBuffer&&this===frame.stack&&offset===frame.mbcStackEntryEsp!-frame.mbcStackBytes!+8){padding=frame.mbcStackBuffer.bytes.slice(4,8);paddingMasks=frame.mbcStackBuffer.knownMask.slice(4,8);}if(frame?.pc==='306915f8'&&this===frame.mbcWideOutput&&offset===0){clearedBytes=frame.mbcStackBuffer!.bytes.slice(8);clearedMasks=frame.mbcStackBuffer!.knownMask.slice(8);}original.call(this,offset,value,width);if(frame?.pc==='306915f8'&&this===frame.mbcWideOutput&&offset===510){finishedBytes=frame.mbcStackBuffer!.bytes.slice();finishedMasks=frame.mbcStackBuffer!.knownMask.slice();}});let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 const frame=bootstrap.attachProgress().engineArgvProgress!,buffer=frame.mbcStackBuffer!,base=frame.mbcStackEntryEsp!-frame.mbcStackBytes!,aligned=520+((frame.mbcStackEntryEsp!-520)&15);expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcStackReturned:true,mbcStackMemsetReturned:true});expect(frame.mbcStackBytes).toBe(aligned);expect(base%16).toBe(0);expect(buffer.backing).toBe(frame.stack.backing);expect(buffer.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(base);expect(buffer.bytes.length).toBe(520);expect(finishedBytes).not.toBe(null);expect(finishedBytes!.slice(0,4)).toEqual(Uint8Array.from([0xcc,0xcc,0,0]));expect(padding).not.toBe(null);expect(finishedBytes!.slice(4,8)).toEqual(padding);expect(finishedMasks!.slice(4,8)).toEqual(paddingMasks);expect(clearedBytes).toEqual(new Uint8Array(512));expect(clearedMasks).toEqual(new Uint8Array(512).fill(255));
 const call=graph.value.snapshot().calls.find(call=>call.site==='306915af')!;expect(call.returned).toBe(true);expect(call.returnWord).toMatchObject({provenance:{kind:'source',type:'code',address:'306915b4'}});expect(call.position).toBe(frame.mbcStackEntryEsp!-4);expect(graph.value.snapshot().trace).toContain('30674841.EngineArgvSource');expect(bootstrap.processAttach()).toEqual(result);
});
it('retains partial stack-buffer memset writes and its actual pending return on interruption',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;
 const probe=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='306915e3'&&this===frame.stack&&offset===frame.mbcStackEntryEsp!-frame.mbcStackBytes!+20)throw new Error('Interrupted Engine stack memset');original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 const frame=bootstrap.attachProgress().engineArgvProgress!;expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'306915e3',operations:1549,mbcStackReturned:true,mbcStackMemsetReturned:false});expect(frame.mbcStackBuffer!.bytes.slice(8,20)).toEqual(new Uint8Array(12));expect(frame.mbcStackBuffer!.knownMask.slice(8,20)).toEqual(new Uint8Array(12).fill(255));expect(graph.value.snapshot().calls.find(call=>call.site==='306915e3')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the alignment caller when virtual low address bits were not declared',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,false),result=bootstrap.processAttach();expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068de67',operations:1514,mbcStackReturned:false,mbcStackBuffer:null});expect(bootstrap.processAttach()).toEqual(result);
});
it('uses the returned case CPInfo lead byte and retains its unsupported range branch',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;
 const probe=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='306849d4')frame.mbcCaseInfo!.writeUnsigned(6,0x81,1);return result;});
 let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'30684a03',operations:1398,mbcCaseInfoReturned:true,mbcCaseInputReady:false});expect(frame.mbcCaseInfo!.readUnsigned(6,1)).toBe(0x81);expect(frame.bank.readUnsigned(0)).toBe(0x181);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the exact partial case input when a byte store is interrupted',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeHeapObjectViews.prototype.writeUnsigned;
 const probe=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='306849e9'&&this===frame.stack&&offset===frame.mbcCaseEbp!+0x398+17)throw new Error('Interrupted Engine case input');original.call(this,offset,value,width);});
 let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 const frame=bootstrap.attachProgress().engineArgvProgress!,input=frame.mbcCaseEbp!+0x398;expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'306849e9',operations:438,mbcCaseInfoReturned:true,mbcCaseInputReady:false});expect(frame.stack.bytes.slice(input,input+17)).toEqual(Uint8Array.from({length:17},(_,index)=>index));expect(frame.stack.knownMask.slice(input,input+17)).toEqual(new Uint8Array(17).fill(255));expect(frame.bank.readUnsigned(0)).toBe(17);expect(frame.multibyteAllocation!.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});
it('preserves the case CPInfo two padding bytes through its actual import',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform;let bytes:Uint8Array|null=null,masks:Uint8Array|null=null;
 const probe=vi.spyOn(NativeX86ThreadStack,'writeEngineArgvNlsMemoryForPlatform').mockImplementation((...args)=>{const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='306849d4'&&args[2]===0){bytes=frame.mbcCaseInfo!.bytes.slice(18,20);masks=frame.mbcCaseInfo!.knownMask.slice(18,20);}return original(...args);});
 try{bootstrap.processAttach();}finally{probe.mockRestore();}expect(bytes).not.toBe(null);const fields=bootstrap.attachProgress().engineArgvProgress!.mbcCaseInfo!;expect(fields.bytes.slice(18,20)).toEqual(bytes);expect(fields.knownMask.slice(18,20)).toEqual(masks);
});
it('retains case-table stack reservation when its same-Engine cookie cannot be read',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeCrtBootstrap.engineArgvCookieForCrt;
 const cookie=vi.spyOn(NativeCrtBootstrap,'engineArgvCookieForCrt').mockImplementation((...args)=>bootstrap.attachProgress().engineArgvProgress?.pc==='306849be'?{known:false,reason:'Case Engine cookie unavailable'}:original(...args));
 let result;try{result=bootstrap.processAttach();}finally{cookie.mockRestore();}
 expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc:'306849be',operations:357,mbcSingleByteInitialized:true});expect(bootstrap.attachProgress().engineArgvProgress!.multibyteAllocation!.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});
it('rejects fake and replayed Engine CPInfo write grants without changing its output',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 expect(NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform(platform,{identity:{}},0,9,4).known).toBe(false);
 const original=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform;let captured:NativeArgvNlsCallGrant|undefined;
 const probe=vi.spyOn(NativeX86ThreadStack,'writeEngineArgvNlsMemoryForPlatform').mockImplementation((...args)=>{captured=args[1];return original(...args);});try{bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(captured).toBeDefined();const fields=bootstrap.attachProgress().engineArgvProgress!.mbcInfo!,bytes=fields.bytes.slice(),masks=fields.knownMask.slice();expect(original(platform,captured!,0,9,4).known).toBe(false);expect(fields.bytes).toEqual(bytes);expect(fields.knownMask).toEqual(masks);
});
it('retains partial Engine memset writes and its pending caller on interruption',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const original=NativeHeapObjectViews.prototype.writeUnsigned;const probe=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this===bootstrap.attachProgress().engineArgvProgress?.multibyteAllocation&&width===1&&offset===40)throw new Error('Interrupted Engine classification memset');original.call(this,offset,value,width);});
 let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'30684cf4',operations:337,mbcMemsetReturned:false,mbcSingleByteInitialized:false});expect(Array.from(frame.multibyteAllocation!.knownMask.slice(28,40))).toEqual(Array(12).fill(255));expect(Array.from(frame.multibyteAllocation!.bytes.slice(28,40))).toEqual(Array(12).fill(0));expect(graph.value.snapshot().calls.find(call=>call.site==='30684cf4')?.returned).toBe(false);expect(frame.multibyteAllocation!.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the Engine double-byte branch from the current CPInfo value',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform,probe=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30684cdc')frame.mbcInfo!.writeUnsigned(0,2);return result;});
 let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'30684d0e',mbcMemsetReturned:true,mbcSingleByteInitialized:false});expect(frame.mbcInfo!.readUnsigned(0)).toBe(2);expect(frame.multibyteAllocation!.readUnsigned(4)).toBe(1252);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the Engine memset caller when the current logical-thread direction is unsupported',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform,probe=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args);if(bootstrap.attachProgress().engineArgvProgress?.pc==='30684cdc')expect(NativeRuntimePlatform.writeNativeDirectionFlag(platform,1).known).toBe(true);return result;});
 let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineArgvProgress).toMatchObject({pc:'30684cf4',operations:337,mbcMemsetReturned:false,mbcSingleByteInitialized:false});expect(bootstrap.processAttach()).toEqual(result);
});

it('converts and classifies every Engine case byte in its original stack aliases',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;let observed=false;
 const spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30691606'){const wide=frame.mbcWideOutput!,types=frame.mbcCaseTypes!;expect(wide.backing).toBe(frame.stack.backing);expect(types.backing).toBe(frame.stack.backing);expect(wide.bytes.length).toBe(512);expect(types.bytes.length).toBe(512);for(let index=0;index<256;index++){const byte=index===0?32:index;expect(wide.readUnsigned(index*2,2)).toBe(browserGameArgvNlsInputs.unicode[byte]);expect(types.readUnsigned(index*2,2)).toBe(browserGameArgvNlsInputs.ctype1[byte]);}expect([...wide.knownMask]).toEqual(Array(512).fill(255));expect([...types.knownMask]).toEqual(Array(512).fill(255));observed=true;}return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 const frame=bootstrap.attachProgress().engineArgvProgress!;expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3067727b',mbcConversionFillReturned:true,mbcCaseTypesReturned:true});expect(observed).toBe(true);for(const site of ['306915f8','30691606'])expect(graph.value.snapshot().calls.find(call=>call.site===site)?.returned).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains partial Unicode output and its pending native call on interruption',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='306915f8'&&this===frame.mbcWideOutput&&offset===12)throw new Error('Interrupted Engine Unicode output');original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 const frame=bootstrap.attachProgress().engineArgvProgress!;expect(result.known).toBe(false);expect(frame.mbcConversionFillReturned).toBe(false);for(let index=0;index<6;index++)expect(frame.mbcWideOutput!.readUnsigned(index*2,2)).toBe(browserGameArgvNlsInputs.unicode[index===0?32:index]);expect(frame.mbcWideOutput!.readUnsigned(12,2)).toBe(0);expect(graph.value.snapshot().calls.find(call=>call.site==='306915f8')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('returns stack-buffer cleanup and cookie validation without freeing the Engine allocation',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);bootstrap.processAttach();const frame=bootstrap.attachProgress().engineArgvProgress!,calls=graph.value.snapshot().calls;
 for(const site of ['30691610','3069169b','306916cb','30684a46'])expect(calls.find(call=>call.site===site)?.returned).toBe(true);expect(calls.some(call=>call.site==='30675d7a')).toBe(false);expect(frame.mbcMappingStackBuffer!.readUnsigned(0)).toBe(0xcccc);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:frame.multibyteAllocation!,offset:0},544).known).toBe(true);expect(frame.mbcClassifyPtd!.readUnsigned(0x70)).toBe(1);
});

it('releases classification ownership before constructing the separate mapping locale',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeHeapObjectViews.prototype.maskedWord;let before:number|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,...args){const result=original.apply(this,args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='306733eb'&&frame.mbcMappingEbp!==null&&this===frame.mbcMappingPtd&&args[0]===0x70&&before===null)before=result.value;return result;});try{bootstrap.processAttach();}finally{spy.mockRestore();}
 const frame=bootstrap.attachProgress().engineArgvProgress!;expect(before).toBe(1);expect(frame.mbcMappingCtorReturned).toBe(true);expect(frame.mbcMappingPtd).toBe(frame.mbcClassifyPtd);expect(frame.mbcMappingLocaleRecord).not.toBe(frame.mbcClassifyLocaleRecord);expect(frame.mbcMappingLocaleRecord!.readUnsigned(12,1)).toBe(1);expect(frame.mbcMappingPtd!.readUnsigned(0x70)).toBe(1);expect(frame.mbcMappingLocaleRecord!.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcMappingEbp!-16);
});

it('returns the Engine Unicode mapping probe through its actual six-argument call',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(result.known).toBe(false);if(result.known)throw new Error('Mapping scan remains unfinished');expect(result.reason).toContain('Engine CRT initializer dependency at100a7338');expect(frame).toMatchObject({pc:'3067727b',operations:13819});
 const selector=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'mappingApiSelector');if(!selector.known)throw new Error(selector.reason);expect(selector.value.readUnsigned(0)).toBe(1);const call=graph.value.snapshot().calls.find(call=>call.site==='3067c5ac')!;expect(call.returned).toBe(true);expect(call.returnWord).toMatchObject({provenance:{kind:'source',type:'code',address:'3067c5b2'}});expect(graph.value.snapshot().calls.find(call=>call.site==='3067c94a')?.returned).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});

it('uses the current Engine mapping selector without repeating a successful probe',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),selector=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'mappingApiSelector');if(!selector.known)throw new Error(selector.reason);selector.value.writeUnsigned(0,1);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3067727b',operations:13806});expect(graph.value.snapshot().calls.some(call=>call.site==='3067c5ac')).toBe(false);expect(selector.value.readUnsigned(0)).toBe(1);
});
it('bounds the Engine mapping scan at its first actual NUL input byte',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;
 const spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3067c5ac')frame.mbcConversionInput!.writeUnsigned(7,0,1);return result;});try{bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'30684aa4',operations:2869,mbcCaseReturned:false,mbcInitReturned:false});expect(frame.stack.readUnsigned(frame.mbcMappingEbp!-56+20)).toBe(8);expect(frame.mbcConversionInput!.readUnsigned(8,1)).toBe(8);
});

it('returns the Engine mapping size query from the original indirect procedure and stack arguments',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;let abi:number[]|null=null,grant:NativeArgvNlsCallGrant|undefined;
 const spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3067c64a'){grant=args[1];const call=graph.value.snapshot().calls.findLast(call=>call.site==='3067c64a')!;abi=[4,8,16,20,24].map(offset=>frame.stack.readUnsigned(call.position+offset));for(let index=0;index<256;index++)expect(frame.mbcConversionInput!.readUnsigned(index,1)).toBe(index===0?32:index);}return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(abi).toEqual([1252,1,256,0,0]);const frame=bootstrap.attachProgress().engineArgvProgress!,call=graph.value.snapshot().calls.find(call=>call.site==='3067c64a')!;expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(call.returned).toBe(true);expect(call.returnWord).toMatchObject({provenance:{kind:'source',type:'code',address:'3067c64c'}});expect(NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform(platform,grant!,0,99,2).known).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('reserves a separate aligned Engine mapping buffer through its own retained helper call',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.maskedWord;let padding:Uint8Array|null=null,masks:Uint8Array|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,...args){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3067c67a'&&this===frame.stack&&args[0]===frame.mbcMappingStackEntryEsp!-frame.mbcMappingStackBytes!){padding=frame.mbcMappingStackBuffer!.bytes.slice(4,8);masks=frame.mbcMappingStackBuffer!.knownMask.slice(4,8);}return original.apply(this,args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,buffer=frame.mbcMappingStackBuffer!,base=frame.mbcMappingStackEntryEsp!-frame.mbcMappingStackBytes!;expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcMappingStackReturned:true});expect(buffer).not.toBe(frame.mbcStackBuffer);expect(buffer.backing).toBe(frame.stack.backing);expect(buffer.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(base);expect(base%16).toBe(0);expect(buffer.bytes.length).toBe(520);expect(buffer.readUnsigned(0)).toBe(0xcccc);expect(padding).not.toBe(null);expect(buffer.bytes.slice(4,8)).toEqual(padding);expect(buffer.knownMask.slice(4,8)).toEqual(masks);
 const call=graph.value.snapshot().calls.filter(call=>call.site==='3067c66f').at(-1)!;expect(call.returned).toBe(true);expect(call.returnWord).toMatchObject({provenance:{kind:'source',type:'code',address:'3067c674'}});expect(call.position).toBe(frame.mbcMappingStackEntryEsp!-4);expect(bootstrap.processAttach()).toEqual(result);
});

it('fills every Engine mapping Unicode code unit and returns its actual mapping-size query',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);let ecxMask:number|null=null,count:number|null=null;observeBeforeParser(bootstrap,()=>{const f=bootstrap.attachProgress().engineArgvProgress!;ecxMask=f.bank.maskedWord(8).knownMask;count=f.stack.readUnsigned(f.mbcMappingEbp!-56-8);});const frame=bootstrap.attachProgress().engineArgvProgress!,wide=frame.mbcMappingWideOutput!;expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcMappingFillReturned:true,mbcMappingSizeReturned:true});expect(wide.backing).toBe(frame.stack.backing);expect(wide.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcMappingStackEntryEsp!-frame.mbcMappingStackBytes!+8);expect(wide.bytes.length).toBe(512);for(let index=0;index<256;index++)expect(wide.readUnsigned(index*2,2)).toBe(browserGameArgvNlsInputs.unicode[index===0?32:index]);expect([...wide.knownMask]).toEqual(Array(512).fill(255));expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(ecxMask).toBe(0);for(const site of ['3067c6b6','3067c6d2'])expect(graph.value.snapshot().calls.find(call=>call.site===site)?.returned).toBe(true);expect(count).toBe(256);
});
it('retains partial Engine mapping Unicode writes and its pending conversion return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;let untouched:Uint8Array|null=null,masks:Uint8Array|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3067c6b6'&&this===frame.mbcMappingWideOutput){if(offset===0){untouched=this.bytes.slice(12,14);masks=this.knownMask.slice(12,14);}if(offset===12)throw new Error('Interrupted Engine mapping Unicode output');}original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067c6b6',mbcMappingFillReturned:false,mbcMappingSizeReturned:false});for(let index=0;index<6;index++)expect(frame.mbcMappingWideOutput!.readUnsigned(index*2,2)).toBe(browserGameArgvNlsInputs.unicode[index===0?32:index]);expect(untouched).not.toBe(null);expect(frame.mbcMappingWideOutput!.bytes.slice(12,14)).toEqual(untouched);expect(frame.mbcMappingWideOutput!.knownMask.slice(12,14)).toEqual(masks);expect(graph.value.snapshot().calls.find(call=>call.site==='3067c6b6')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('maps every Engine character into a separate aligned upper-case Unicode buffer',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);bootstrap.processAttach();const frame=bootstrap.attachProgress().engineArgvProgress!,mapped=frame.mbcMappedOutput!,base=frame.mbcMappedStackEntryEsp!-frame.mbcMappedStackBytes!;expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcMappedFillReturned:true});expect(mapped).not.toBe(frame.mbcMappingWideOutput);expect(mapped.backing).toBe(frame.stack.backing);expect(base%16).toBe(0);expect(frame.mbcMappedStackBuffer!.readUnsigned(0)).toBe(0xcccc);expect(mapped.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(base+8);expect(mapped.bytes.byteOffset+mapped.bytes.length).toBeLessThanOrEqual(frame.mbcMappingWideOutput!.bytes.byteOffset);for(let index=0;index<256;index++)expect(mapped.readUnsigned(index*2,2)).toBe(browserGameArgvNlsInputs.upper[index===0?32:index]);expect(mapped.readUnsigned(65*2,2)).toBe(65);expect([...mapped.knownMask]).toEqual(Array(512).fill(255));expect(graph.value.snapshot().calls.find(call=>call.site==='3067c72d')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3067c732'}}});expect(graph.value.snapshot().calls.find(call=>call.site==='3067c76f')?.returned).toBe(true);
});
it('retains partial Engine lower-case Unicode writes and the actual pending mapping return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;let untouched:Uint8Array|null=null,masks:Uint8Array|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3067c76f'&&this===frame.mbcMappedOutput){if(offset===0){untouched=this.bytes.slice(12,14);masks=this.knownMask.slice(12,14);}if(offset===12)throw new Error('Interrupted Engine lower-case output');}original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067c76f',mbcMappedFillReturned:false});for(let index=0;index<6;index++)expect(frame.mbcMappedOutput!.readUnsigned(index*2,2)).toBe(browserGameArgvNlsInputs.lower[index===0?32:index]);expect(untouched).not.toBe(null);expect(frame.mbcMappedOutput!.bytes.slice(12,14)).toEqual(untouched);expect(frame.mbcMappedOutput!.knownMask.slice(12,14)).toEqual(masks);expect(graph.value.snapshot().calls.find(call=>call.site==='3067c76f')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});


it('narrows every mapped Engine character into its original lower-case byte destination',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);let bytesAtReturn:Uint8Array|null=null,masksAtReturn:Uint8Array|null=null;observeEngineArgvReturn(bootstrap,()=>{const output=bootstrap.attachProgress().engineArgvProgress!.mbcLowerCaseOutput!;bytesAtReturn=output.bytes.slice();masksAtReturn=output.knownMask.slice();});const frame=bootstrap.attachProgress().engineArgvProgress!,output=frame.mbcLowerCaseOutput!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcNarrowReturned:true});expect(output.backing).toBe(frame.stack.backing);expect(output.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcCaseEbp!+0x298);expect(output.bytes.length).toBe(256);for(let index=0;index<256;index++)expect(bytesAtReturn![index]).toBe(reverse.get(browserGameArgvNlsInputs.lower[index===0?32:index]!));expect(bytesAtReturn![65]).toBe(97);expect([...masksAtReturn!]).toEqual(Array(256).fill(255));expect(graph.value.snapshot().calls.find(call=>call.site==='3067c792')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3067c798'}}});
});
it('retains partial Engine byte narrowing and forbids replaying its pending return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;let untouched:Uint8Array|null=null,masks:Uint8Array|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3067c792'&&this===frame.mbcNarrowedOutput){if(offset===0){untouched=this.bytes.slice(6);masks=this.knownMask.slice(6);}if(offset===6)throw new Error('Interrupted Engine byte narrowing');}original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(frame).toMatchObject({pc:'3067c792',mbcNarrowReturned:false});for(let index=0;index<6;index++)expect(frame.mbcNarrowedOutput!.readUnsigned(index,1)).toBe(reverse.get(browserGameArgvNlsInputs.lower[index===0?32:index]!));expect(untouched).not.toBe(null);expect(frame.mbcNarrowedOutput!.bytes.slice(6)).toEqual(untouched);expect(frame.mbcNarrowedOutput!.knownMask.slice(6)).toEqual(masks);expect(graph.value.snapshot().calls.find(call=>call.site==='3067c792')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('returns both Engine mapping cleanup calls, checks its cookie and releases owned locale state',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!,calls=graph.value.snapshot().calls;expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcMappingReturned:true});for(const [site,address] of [['3067c79c','3067c7a1'],['3067c7a5','3067c7aa'],['3067c917','3067c91c'],['3067c94a','3067c94f'],['30684a66','30684a6b']])expect(calls.find(call=>call.site===site)).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address}}});expect(calls.some(call=>call.site==='30675d7a')).toBe(false);expect(frame.mbcMappingPtd!.readUnsigned(0x70)).toBe(1);expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(bootstrap.processAttach()).toEqual(result);
});

it('executes both original Engine mapping calls into separate lower and upper byte destinations',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);let lowerAtReturn:Uint8Array|null=null,upperAtReturn:Uint8Array|null=null,lowerMasksAtReturn:Uint8Array|null=null,upperMasksAtReturn:Uint8Array|null=null;const result=observeEngineArgvReturn(bootstrap,()=>{const live=bootstrap.attachProgress().engineArgvProgress!;lowerAtReturn=live.mbcLowerCaseOutput!.bytes.slice();upperAtReturn=live.mbcUpperCaseOutput!.bytes.slice();lowerMasksAtReturn=live.mbcLowerCaseOutput!.knownMask.slice();upperMasksAtReturn=live.mbcUpperCaseOutput!.knownMask.slice();}),frame=bootstrap.attachProgress().engineArgvProgress!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3067727b',mbcMappingPass:'upper',mbcMappingReturned:true,mbcNarrowReturned:true});expect(frame.mbcLowerCaseOutput).not.toBe(frame.mbcUpperCaseOutput);for(const [output,table,offset] of [[frame.mbcLowerCaseOutput!,browserGameArgvNlsInputs.lower,0x298],[frame.mbcUpperCaseOutput!,browserGameArgvNlsInputs.upper,0x198]] as const){expect(output.backing).toBe(frame.stack.backing);expect(output.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcCaseEbp!+offset);const bytes=output===frame.mbcLowerCaseOutput?lowerAtReturn!:upperAtReturn!,masks=output===frame.mbcLowerCaseOutput?lowerMasksAtReturn!:upperMasksAtReturn!;for(let index=0;index<256;index++)expect(bytes[index]).toBe(reverse.get(table[index===0?32:index]!));expect([...masks]).toEqual(Array(256).fill(255));}expect(lowerAtReturn![65]).toBe(97);expect(upperAtReturn![97]).toBe(65);for(const site of ['30684a66','30684a8b'])expect(graph.value.snapshot().calls.find(call=>call.site===site)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(call=>call.site==='3067c5ac')).toHaveLength(1);expect(frame.mbcMappingPtd!.readUnsigned(0x70)).toBe(1);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('retains the completed lower table when the original upper byte conversion is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;let untouched:Uint8Array|null=null,masks:Uint8Array|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.mbcMappingPass==='upper'&&frame.pc==='3067c792'&&this===frame.mbcNarrowedOutput){if(offset===0){untouched=this.bytes.slice(6);masks=this.knownMask.slice(6);}if(offset===6)throw new Error('Interrupted Engine upper narrowing');}original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(frame).toMatchObject({pc:'3067c792',mbcMappingPass:'upper',mbcMappingReturned:false,mbcNarrowReturned:false,mbcUpperCaseOutput:null});for(let index=0;index<256;index++)expect(frame.mbcLowerCaseOutput!.readUnsigned(index,1)).toBe(reverse.get(browserGameArgvNlsInputs.lower[index===0?32:index]!));for(let index=0;index<6;index++)expect(frame.mbcNarrowedOutput!.readUnsigned(index,1)).toBe(reverse.get(browserGameArgvNlsInputs.upper[index===0?32:index]!));expect(untouched).not.toBe(null);expect(frame.mbcNarrowedOutput!.bytes.slice(6)).toEqual(untouched);expect(frame.mbcNarrowedOutput!.knownMask.slice(6)).toEqual(masks);const calls=graph.value.snapshot().calls.filter(call=>call.site==='3067c792');expect(calls).toHaveLength(2);expect(calls[0]!.returned).toBe(true);expect(calls[1]!.returned).toBe(false);expect(frame.mbcMappingPtd!.readUnsigned(0x70)).toBe(3);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('publishes all original Engine character flags and case bytes then returns both retained callers',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);let tail:Uint8Array|null=null,masks:Uint8Array|null=null;const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform,spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.mbcMappingPass==='upper'&&frame.pc==='3067c792'){tail=frame.multibyteAllocation!.bytes.slice(541);masks=frame.multibyteAllocation!.knownMask.slice(541);}return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,record=frame.multibyteAllocation!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(frame).toMatchObject({pc:'3067727b',mbcCaseReturned:true,mbcInitReturned:true});for(let index=0;index<256;index++){const input=index===0?32:index,type=browserGameArgvNlsInputs.ctype1[input]!,flag=type&1?0x10:type&2?0x20:0,converted=type&1?reverse.get(browserGameArgvNlsInputs.lower[input]!):type&2?reverse.get(browserGameArgvNlsInputs.upper[input]!):0;expect(record.readUnsigned(29+index,1)).toBe(flag);expect(record.readUnsigned(285+index,1)).toBe(converted);}expect(record.readUnsigned(29+65,1)).toBe(0x10);expect(record.readUnsigned(285+65,1)).toBe(97);expect(record.readUnsigned(29+97,1)).toBe(0x20);expect(record.readUnsigned(285+97,1)).toBe(65);expect(tail).not.toBe(null);expect(record.bytes.slice(541)).toEqual(tail);expect(record.knownMask.slice(541)).toEqual(masks);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:record,offset:0},544).known).toBe(true);for(const [site,address] of [['30684b2d','30684b32'],['30684dc7','30684dcc'],['30684e2a','30684e2f'],['30684ecb','30684ed0']])expect(graph.value.snapshot().calls.find(call=>call.site===site)).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address}}});expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('retains partial Engine character-record writes without returning the case initializer',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;let untouched:Uint8Array|null=null,masks:Uint8Array|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(this===frame?.multibyteAllocation){if(frame.pc==='30684ac7'&&offset===285){untouched=this.bytes.slice(355);masks=this.knownMask.slice(355);}if(frame.pc==='30684abe'&&offset===355)throw new Error('Interrupted Engine character record publication');}original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,record=frame.multibyteAllocation!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(frame).toMatchObject({pc:'30684abe',mbcMappingReturned:true,mbcCaseReturned:false,mbcInitReturned:false});for(let index=0;index<70;index++){const input=index===0?32:index,type=browserGameArgvNlsInputs.ctype1[input]!,converted=type&1?reverse.get(browserGameArgvNlsInputs.lower[input]!):type&2?reverse.get(browserGameArgvNlsInputs.upper[input]!):0;expect(record.readUnsigned(285+index,1)).toBe(converted);}expect(record.readUnsigned(29+70,1)).toBe(0x10);expect(untouched).not.toBe(null);expect(record.bytes.slice(355)).toEqual(untouched);expect(record.knownMask.slice(355)).toEqual(masks);for(const site of ['30684dc7','30684ecb'])expect(graph.value.snapshot().calls.find(call=>call.site===site)?.returned).toBe(false);expect(record.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('releases the prior Engine MBC reference and installs the populated record through both imports',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const old=bootstrap.thread.physical.mbcObject,original=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform;let before:number|null=null;const spy=vi.spyOn(NativeX86ThreadStack,'writeEngineArgvNlsMemoryForPlatform').mockImplementation((...args)=>{if(bootstrap.attachProgress().engineArgvProgress?.pc==='30684ee3')before=old.readUnsigned(0);return original(...args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067727b',mbcPriorDecrementReturned:true,mbcInstalledInPtd:true,mbcReferenceIncrementReturned:true});expect(frame.mbcPriorReference).toBe(old);expect(before).not.toBe(null);expect(old.readUnsigned(0)).toBe((before!-2)>>>0);expect(old.backing.freed).toBe(false);expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(2);expect(frame.multibytePtd!.pointer(0x68).get()).toBe(frame.multibyteAllocation);for(const [site,address] of [['30684ee3','30684ee9'],['30684f08','30684f0a']])expect(graph.value.snapshot().calls.find(call=>call.site===site)).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address}}});expect(graph.value.snapshot().calls.some(call=>call.site==='30684ef8')).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('retains the installed Engine MBC pointer and pending increment if its reference write is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform;const spy=vi.spyOn(NativeX86ThreadStack,'writeEngineArgvNlsMemoryForPlatform').mockImplementation((...args)=>{if(bootstrap.attachProgress().engineArgvProgress?.pc==='30684f08')throw new Error('Interrupted Engine MBC increment');return original(...args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'30684f08',mbcPriorDecrementReturned:true,mbcInstalledInPtd:true,mbcReferenceIncrementReturned:false});expect(frame.multibytePtd!.pointer(0x68).get()).toBe(frame.multibyteAllocation);expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(0);expect(graph.value.snapshot().calls.find(call=>call.site==='30684ee3')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(call=>call.site==='30684f08')?.returned).toBe(false);expect(frame.multibyteAllocation!.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('publishes the Engine global MBC header under its actual lock before table copying',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);let tryLevel:number|null=null;const result=observeBeforeParser(bootstrap,()=>{const f=bootstrap.attachProgress().engineArgvProgress!;tryLevel=f.stack.readUnsigned(f.multibyteEbp!-4);}),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcGlobalLockHeld:false,mbcGlobalHeaderPublished:true,mbcInstalledInPtd:true});for(const [label,offset] of [['globalMbcCodepage',4],['globalMbcSingleByte',8],['globalMbcLocale',12]] as const){const image=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,label);if(!image.known)throw new Error(image.reason);expect(image.value.readUnsigned(0)).toBe(frame.multibyteAllocation!.readUnsigned(offset));}expect(graph.value.snapshot().calls.find(call=>call.site==='30684f23')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'30684f28'}}});for(const [label,offset,size] of [['globalMbcWideTypes',16,10],['globalMbcCharacterTypes',28,257],['globalMbcCaseBytes',285,256]] as const){const image=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,label);if(!image.known)throw new Error(image.reason);expect(image.value.bytes).toEqual(frame.multibyteAllocation!.bytes.slice(offset,offset+size));expect([...image.value.knownMask]).toEqual(Array(size).fill(255));}expect(tryLevel).toBe(0xfffffffe);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains partial Engine global case copying and the held publication lock',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),image=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'globalMbcCaseBytes');if(!image.known)throw new Error(image.reason);const tail=image.value.bytes.slice(70),masks=image.value.knownMask.slice(70),original=NativeHeapObjectViews.prototype.writeUnsigned,spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this===image.value&&offset===70)throw new Error('Interrupted Engine global case copy');original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'30684f8b',mbcGlobalLockHeld:true,mbcGlobalHeaderPublished:true});expect(image.value.bytes.slice(0,70)).toEqual(frame.multibyteAllocation!.bytes.slice(285,355));expect(image.value.bytes.slice(70)).toEqual(tail);expect(image.value.knownMask.slice(70)).toEqual(masks);expect(frame.multibytePtd!.pointer(0x68).get()).toBe(frame.multibyteAllocation);expect(bootstrap.processAttach()).toEqual(result);
});

it.each(['ptd','global'] as const)('honors the actual %s policy bit that skips Engine global publication',policy=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform,spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30684f08'){if(policy==='ptd')frame.multibytePtd!.writeUnsigned(0x70,frame.multibytePtd!.readUnsigned(0x70)|2);}return result;});if(policy==='global'){const flags=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'multibyteLocaleFlags');if(!flags.known)throw new Error(flags.reason);flags.value.writeUnsigned(0,(flags.value.readUnsigned(0)|1)>>>0);}let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067727b',mbcInstalledInPtd:true,mbcReferenceIncrementReturned:true,mbcGlobalLockHeld:false,mbcGlobalHeaderPublished:false});expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(1);expect(bootstrap.processAttach()).toEqual(result);
});

it('replaces the Engine global MBC reference, unlocks and returns the original multibyte wrapper',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!,images=bootstrap.attachProgress().engineArgvImages!,pointer=NativeEngineArgvImages.imageForCrt(images,crt,'currentMultibytePointer'),ready=NativeEngineArgvImages.imageForCrt(images,crt,'multibyteReady');if(!pointer.known||!ready.known)throw new Error('Missing global MBC images');expect(frame).toMatchObject({pc:'3067727b',operations:13819,mbcGlobalDecrementReturned:true,mbcGlobalInstalled:true,mbcGlobalIncrementReturned:true,mbcGlobalLockHeld:false,multibyteFsRestored:true,multibyteReturned:true,multibyteWrapperReturned:true});expect(pointer.value.pointer(0).get()).toBe(frame.multibyteAllocation);expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(2);expect(frame.mbcGlobalPriorReference!.readUnsigned(0)).toBe(0xffffffff);expect(frame.mbcGlobalPriorReference!.backing.freed).toBe(false);expect(ready.value.readUnsigned(0)).toBe(1);for(const [site,address] of [['30684f9a','30684fa0'],['30684fbe','30684fc0'],['30684fd0','30684fd5'],['30684fc7','30684fcc'],['30685001','30685006'],['30685012','30685017']])expect(graph.value.snapshot().calls.find(call=>call.site===site)).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address}}});expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the installed global Engine MBC when its second reference increment is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform,spy=vi.spyOn(NativeX86ThreadStack,'writeEngineArgvNlsMemoryForPlatform').mockImplementation((...args)=>{if(bootstrap.attachProgress().engineArgvProgress?.pc==='30684fbe')throw new Error('Interrupted global Engine MBC increment');return original(...args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,images=bootstrap.attachProgress().engineArgvImages!,pointer=NativeEngineArgvImages.imageForCrt(images,crt,'currentMultibytePointer'),ready=NativeEngineArgvImages.imageForCrt(images,crt,'multibyteReady');if(!pointer.known||!ready.known)throw new Error('Missing MBC images');expect(frame).toMatchObject({pc:'30684fbe',mbcGlobalDecrementReturned:true,mbcGlobalInstalled:true,mbcGlobalIncrementReturned:false,mbcGlobalLockHeld:true,multibyteReturned:false,multibyteWrapperReturned:false});expect(pointer.value.pointer(0).get()).toBe(frame.multibyteAllocation);expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(1);expect(ready.value.readUnsigned(0)).toBe(0);expect(graph.value.snapshot().calls.find(call=>call.site==='30684fbe')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the actual Engine global unlock call without returning multibyte setup on failure',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeCrtBootstrap.engineArgvLocaleLockForCrt,spy=vi.spyOn(NativeCrtBootstrap,'engineArgvLocaleLockForCrt').mockImplementation((...args)=>bootstrap.attachProgress().engineArgvProgress?.pc==='30684fd0'?{known:false,reason:'Unavailable Engine global unlock'}:original(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,ready=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'multibyteReady');if(!ready.known)throw new Error(ready.reason);expect(frame).toMatchObject({pc:'30684fd0',mbcGlobalInstalled:true,mbcGlobalIncrementReturned:true,mbcGlobalLockHeld:true,multibyteReturned:false,multibyteWrapperReturned:false});expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(2);expect(ready.value.readUnsigned(0)).toBe(0);expect(graph.value.snapshot().calls.find(call=>call.site==='30684fd0')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('returns the Engine module filename through the actual three-argument import and owned buffer',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const sentinel=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'moduleFilenameSentinel');if(!sentinel.known)throw new Error(sentinel.reason);sentinel.value.writeUnsigned(0,165,1);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067727b',operations:13819,moduleFilenameReturned:true,moduleFilenameResult:browserGameArgvNlsInputs.moduleName.length,multibyteWrapperReturned:true});expect([...frame.moduleFilename!.bytes.slice(0,browserGameArgvNlsInputs.moduleName.length)]).toEqual(browserGameArgvNlsInputs.moduleName);expect(frame.moduleFilename!.readUnsigned(browserGameArgvNlsInputs.moduleName.length,1)).toBe(0);expect(sentinel.value.readUnsigned(0,1)).toBe(0);expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(graph.value.snapshot().calls.find(call=>call.site==='3068e799')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3068e79f'}}});expect(bootstrap.processAttach()).toEqual(result);
});
it('retains partial Engine module filename output and the pending import without fabricated return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform,spy=vi.spyOn(NativeX86ThreadStack,'writeEngineArgvNlsMemoryForPlatform').mockImplementation((...args)=>{if(bootstrap.attachProgress().engineArgvProgress?.pc==='3068e799'&&args[2]===3)throw new Error('Interrupted Engine filename output');return original(...args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e799',moduleFilenameReturned:false,moduleFilenameResult:null,multibyteWrapperReturned:true});expect([...frame.moduleFilename!.bytes.slice(0,3)]).toEqual(browserGameArgvNlsInputs.moduleName.slice(0,3));expect(frame.moduleFilename!.readUnsigned(3,1)).toBe(0);expect(graph.value.snapshot().calls.find(call=>call.site==='3068e799')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('counts the retained Engine process command line and returns through the real parser caller',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);let returnedEsp:ReturnType<NativeX86ThreadStack['snapshot']>['registers']['ESP']|null=null;const result=observeEngineArgvReturn(bootstrap,()=>{returnedEsp=graph.value.snapshot().registers.ESP!;}),frame=bootstrap.attachProgress().engineArgvProgress!,call=graph.value.snapshot().calls.find(call=>call.site==='3068e7c4')!,name=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'programNamePointer');if(!name.known)throw new Error(name.reason);expect(frame).toMatchObject({pc:'3067727b',operations:13819,programNamePublished:true,argumentUsesFilename:false,parserCalled:true,parserReturned:true,parserOperations:1047,parserCounts:{count:2,bytes:12}});expect(frame.commandLinePointer).not.toBe(null);expect(name.value.pointer(0).get()).toMatchObject({fields:frame.moduleFilename,offset:0});expect(call).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3068e7c9'}}});expect(returnedEsp).toMatchObject({changed:false,word:{provenance:{kind:'stack',offset:frame.entryEsp}}});expect(graph.value.snapshot().registers.ESP).toMatchObject({changed:false,word:{provenance:{kind:'stack',offset:frame.entryEsp-64}}});expect(bootstrap.processAttach()).toEqual(result);
});
it.each(['null','empty'] as const)('counts the actual filename fallback for an Engine %s command line',kind=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,{...browserGameProcessInputs,commandLineA:kind==='null'?{kind:'null'}:{kind:'buffer',bytes:[0]}}),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067727b',argumentUsesFilename:true,programNamePublished:true,parserCalled:true,parserReturned:true,parserCounts:{count:2,bytes:browserGameArgvNlsInputs.moduleName.length+1}});expect(bootstrap.processAttach()).toEqual(result);
});
it('stops at the actual unknown Engine command line byte without guessing filename fallback',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,{...browserGameProcessInputs,commandLineA:{kind:'buffer',bytes:[65,0],knownMask:[0,255]}});const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e7ae',programNamePublished:true,argumentUsesFilename:false,argumentInput:null,parserCalled:false});expect(bootstrap.processAttach()).toEqual(result);
});

it.each([
 {bytes:[103,32,97,0],count:3,size:4,strings:[[103],[97]]},
 {bytes:[103,32,34,97,32,98,34,0],count:3,size:6,strings:[[103],[97,32,98]]},
 {bytes:[103,32,34,34,0],count:3,size:3,strings:[[103],[]]},
 {bytes:[103,32,97,92,34,98,0],count:3,size:6,strings:[[103],[97,34,98]]},
 {bytes:[103,32,34,97,34,34,98,34,0],count:3,size:6,strings:[[103],[97,34,98]]},
 {bytes:[103,9,97,32,98,0],count:4,size:6,strings:[[103],[97],[98]]},
 {bytes:[103,32,233,0],count:3,size:4,strings:[[103],[233]]},
])('counts Engine parser quote/backslash input $bytes through owned helper returns',input=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,{...browserGameProcessInputs,commandLineA:{kind:'buffer',bytes:input.bytes}}),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067727b',parserReturned:true,parserCounts:{count:input.count,bytes:input.size}});expect(frame.fillCounts).toEqual(frame.parserCounts);expect(frame.argvAllocationBytes).toBe(input.count*4+input.size);for(const [index,bytes] of input.strings.entries()){const pointer=frame.argvAllocation!.pointer<{fields:NativeHeapObjectViews;offset:number}>(index*4).get()!;expect(pointer.fields).toBe(frame.argvAllocation);expect([...pointer.fields.bytes.slice(pointer.offset,pointer.offset+bytes.length+1)]).toEqual([...bytes,0]);}expect(frame.argvAllocation!.pointer((input.count-1)*4).get()).toBe(null);expect(frame.parserLeadCalls).toBeGreaterThan(0);expect(frame.multibytePtd!.readUnsigned(0x70)&2).toBe(0);expect(graph.value.snapshot().calls.filter(call=>['3068e62a','3068e732'].includes(call.site)).every(call=>call.returned)).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains partial Engine parser counts when a later input byte is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,{...browserGameProcessInputs,commandLineA:{kind:'buffer',bytes:[103,32,97,0],knownMask:[255,255,0,255]}}),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e66d',parserReturned:false,parserCounts:null});expect(frame.stack.readUnsigned(frame.ebp!-8)).toBe(1);expect(frame.stack.readUnsigned(frame.ebp!-12)).toBe(2);expect(graph.value.snapshot().calls.find(call=>call.site==='3068e7c4')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the Engine parser classification caller and acquired PTD ownership when its MBC flag is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeCrtBootstrap.engineArgvPtdForCrt,spy=vi.spyOn(NativeCrtBootstrap,'engineArgvPtdForCrt').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.parserCalled&&frame.pc==='3067e12c')frame.multibyteAllocation!.knownMask[29+71]=0;return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068451e',parserReturned:false,parserCounts:null});expect(frame.multibytePtd!.readUnsigned(0x70)&2).toBe(2);expect(graph.value.snapshot().calls.filter(call=>call.site==='3068e62a').at(-1)?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('fills and publishes the actual Engine argc and argv with an owned vector, strings and NULL terminator',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);let beforeEnvironment:unknown;const result=observeEngineArgvReturn(bootstrap,()=>{beforeEnvironment=bootstrap.attachProgress().nextBoundary;}),frame=bootstrap.attachProgress().engineArgvProgress!,images=bootstrap.attachProgress().engineArgvImages!,count=NativeEngineArgvImages.imageForCrt(images,crt,'argumentCount'),vector=NativeEngineArgvImages.imageForCrt(images,crt,'argumentVector');if(!count.known||!vector.known)throw new Error('Missing argument globals');expect(frame).toMatchObject({phase:'returned',pc:'3067727b',operations:13819,argvAllocationBytes:20,fillCalled:true,fillReturned:true,fillCounts:{count:2,bytes:12},argumentCountPublished:true,argumentVectorPublished:true,result:0});expect(count.value.readUnsigned(0)).toBe(1);expect(vector.value.pointer(0).get()).toMatchObject({fields:frame.argvAllocation,offset:0});const entry=frame.argvAllocation!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;expect(entry).toMatchObject({fields:frame.argvAllocation,offset:8});expect([...entry.fields.bytes.slice(entry.offset)]).toEqual([...browserGameArgvNlsInputs.moduleName,0]);expect(frame.argvAllocation!.pointer(4).get()).toBe(null);expect(graph.value.snapshot().calls.find(call=>call.site==='3068e805')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3068e80a'}}});expect(graph.value.snapshot().calls.find(call=>call.site==='30677276')?.returned).toBe(true);expect(beforeEnvironment).toMatchObject({address:'3067727f',target:'3068e4f2'});expect(bootstrap.attachProgress().nextBoundary).toMatchObject({address:'3067728a',target:'3067d1c7'});expect(bootstrap.attachProgress().engineCinitProgress!.pc).toBe('100a7338');expect(bootstrap.processAttach()).toEqual(result);
});
it('preserves prior Engine argument globals and returns minus one when argv allocation returns NULL',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),count=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'argumentCount'),vector=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'argumentVector');if(!count.known||!vector.known)throw new Error('Missing argument globals');count.value.writeUnsigned(0,17);crt.physical.mallocWait.writeUnsigned(0,0);const original=platform.win32HeapAlloc.bind(platform),spy=vi.spyOn(platform,'win32HeapAlloc').mockImplementation((...args)=>args[2]===20?{known:true,value:null}:original(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({phase:'returned',pc:'3067727b',result:-1,argvAllocationBytes:20,argvAllocation:null,fillCalled:false,argumentCountPublished:false,argumentVectorPublished:false});expect(count.value.readUnsigned(0)).toBe(17);expect(vector.value.pointer(0).get()).toBe(null);expect(frame.bank.readUnsigned(0)).toBe(0xffffffff);expect(bootstrap.attachProgress().nextBoundary).toMatchObject({address:'3067729f',target:'3068892c'});expect(result.known).toBe(false);if(!result.known)expect(result.reason).toContain('Engine argument failure cleanup3068892c at3067729f');expect(bootstrap.processAttach()).toEqual(result);
});
it('retains partial Engine argv strings and the real filling parser call when a write is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.maskedWord;let tail:Uint8Array|null=null,masks:Uint8Array|null=null;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,...args){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.fillCalled&&frame.pc==='3068e61d'&&this===frame.argvAllocation&&args[0]===10){tail=this.bytes.slice(10);masks=this.knownMask.slice(10);throw new Error('Interrupted Engine argv character store');}return original.apply(this,args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,count=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'argumentCount');if(!count.known)throw new Error(count.reason);expect(frame).toMatchObject({pc:'3068e61d',parserReturned:true,fillCalled:true,fillReturned:false,fillCounts:null,argumentCountPublished:false,argumentVectorPublished:false,result:null});expect([...frame.argvAllocation!.bytes.slice(8,10)]).toEqual(browserGameArgvNlsInputs.moduleName.slice(0,2));expect(frame.argvAllocation!.bytes.slice(10)).toEqual(tail);expect(frame.argvAllocation!.knownMask.slice(10)).toEqual(masks);expect(frame.argvAllocation!.backing.freed).toBe(false);expect(frame.argvAllocation!.pointer(0).get()).toMatchObject({fields:frame.argvAllocation,offset:8});expect(graph.value.snapshot().calls.find(call=>call.site==='3068e805')?.returned).toBe(false);expect(count.value.readUnsigned(0)).toBe(0);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the actual Engine argv lower malloc call when its service cannot return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=platform.win32HeapAlloc.bind(platform),spy=vi.spyOn(platform,'win32HeapAlloc').mockImplementation((...args)=>args[2]===20?{known:false,reason:'Unavailable Engine argv heap'}:original(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067c9c9',argvAllocationBytes:20,argvAllocation:null,fillCalled:false,result:null});expect(graph.value.snapshot().calls.filter(call=>call.site==='3067c9c9').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.find(call=>call.site==='3068e7eb')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the stored Engine argc when argv pointer publication cannot complete',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeEngineArgvImages.imageForCrt,spy=vi.spyOn(NativeEngineArgvImages,'imageForCrt').mockImplementation((...args)=>bootstrap.attachProgress().engineArgvProgress?.pc==='3068e816'&&args[2]==='argumentVector'?{known:false,reason:'Interrupted Engine argv pointer publication'}:original(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,count=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'argumentCount'),vector=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'argumentVector');if(!count.known||!vector.known)throw new Error('Missing argument globals');expect(frame).toMatchObject({phase:'blocked',pc:'3068e816',fillReturned:true,argumentCountPublished:true,argumentVectorPublished:false,result:null});expect(count.value.readUnsigned(0)).toBe(1);expect(vector.value.pointer(0).get()).toBe(null);expect(frame.argvAllocation!.backing.freed).toBe(false);expect(graph.value.snapshot().calls.find(call=>call.site==='30677276')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it.each(['A=1\0B=two\0\0','=C:=C:/tmp\0A=1\0B=two\0\0','=C:=C:/tmp\0\0','\0\0'])('counts Engine environment entries and retains calloc arguments for %j',text=>{
 const bytes=Array.from(text,c=>c.charCodeAt(0)),inputs={...browserGameProcessInputs,environmentW:{kind:'buffer' as const,bytes:bytes.flatMap(byte=>[byte,0])},environmentA:{kind:'buffer' as const,bytes}}, {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,inputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const strings=text.split('\0').filter(Boolean),entries=strings.filter(s=>!s.startsWith('=')).length;let args:number[]|null=null;const original=NativeModuleCrtOwner.prototype.callocCrt,spy=vi.spyOn(NativeModuleCrtOwner.prototype,'callocCrt').mockImplementation(function(this:NativeModuleCrtOwner,count:number,size:number){if(this===crt&&size===4){const call=graph.value.snapshot().calls.find(c=>c.site==='3068e532')!,stack=bootstrap.attachProgress().engineSetenvpProgress!.stack;args=[stack.readUnsigned(call.position+4),stack.readUnsigned(call.position+8)];}return original.call(this,count,size);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 const frame=bootstrap.attachProgress().engineSetenvpProgress!,call=graph.value.snapshot().calls.find(c=>c.site==='3068e532')!,vector=NativeEngineSetenvpImages.imageForCrt(frame.images,crt,'environmentVector');if(!vector.known)throw new Error(vector.reason);
 expect(result.known).toBe(false);expect(frame).toMatchObject({phase:'returned',pc:'30677284',entries,strlenCalls:strings.length*2,vectorSlots:entries+1,vectorPublished:true,cursor:strings.length?text.length-1:0,result:0,inputReleased:true,inputCleared:true,readyPublished:true,filledEntries:entries});expect(frame.input).toBe(bootstrap.attachProgress().engineEnvironmentProgress!.output);expect(frame.input!.fields.backing.freed).toBe(true);expect(call.returned).toBe(true);expect(args).toEqual([entries+1,4]);expect(frame.vector!.bytes.length).toBe((entries+1)*4);expect([...frame.vector!.bytes]).toEqual(Array((entries+1)*4).fill(0));expect(vector.value.pointer(0).get()).toMatchObject({fields:frame.vector,offset:0});expect(graph.value.snapshot().calls.filter(c=>c.site==='3068e51e')).toHaveLength(strings.length);for(const [index,text] of strings.filter(s=>!s.startsWith('=')).entries()){const pointer=frame.vector!.pointer<{fields:NativeHeapObjectViews;offset:number}>(index*4).get()!;expect(pointer).toMatchObject({fields:frame.strings[index],offset:0});expect([...pointer.fields.bytes]).toEqual([...Array.from(text,c=>c.charCodeAt(0)),0]);}expect(frame.vector!.pointer(entries*4).get()).toBe(null);expect(bootstrap.attachProgress().engineEnvironmentStorage!.pointer(0).get()).toBe(null);const before=graph.value.snapshot().trace;expect(bootstrap.processAttach()).toEqual(result);expect(graph.value.snapshot().trace).toEqual(before);
});
it('returns minus one through the original Engine environment caller for a NULL retained block',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,{...browserGameProcessInputs,environmentW:{kind:'null'},environmentA:{kind:'null'}}),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineSetenvpProgress!;
 expect(frame).toMatchObject({phase:'returned',pc:'30677284',input:null,result:-1,entries:0,strlenCalls:0,vectorSlots:null});expect(graph.value.snapshot().calls.find(c=>c.site==='3067727f')?.returned).toBe(true);expect(graph.value.snapshot().calls.some(c=>c.site==='3068e532')).toBe(false);expect(bootstrap.attachProgress().nextBoundary).toMatchObject({address:'3067729f',target:'3068892c'});expect(bootstrap.processAttach()).toEqual(result);
});
it('retains an unknown Engine environment byte and its pending source caller without scanning fabricated data',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeCrtBootstrap.engineSetenvpInputForCrt;let changed=false;const spy=vi.spyOn(NativeCrtBootstrap,'engineSetenvpInputForCrt').mockImplementation((...args)=>{const result=original(...args);if(result.known&&!changed){changed=true;result.value.pointer!.fields.knownMask[0]=0;}return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineSetenvpProgress!;expect(frame).toMatchObject({phase:'blocked',pc:'3068e528',cursor:0,entries:0,strlenCalls:0,vectorSlots:null});expect(frame.input!.fields.knownMask[0]).toBe(0);expect(bootstrap.processAttach()).toEqual(result);
});

it('publishes NULL and returns minus one when Engine environment vector calloc fails',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);crt.physical.mallocWait.writeUnsigned(0,0);const original=platform.win32HeapAlloc.bind(platform),spy=vi.spyOn(platform,'win32HeapAlloc').mockImplementation((...args)=>args[2]===8?{known:true,value:null}:original(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineSetenvpProgress!,vector=NativeEngineSetenvpImages.imageForCrt(frame.images,crt,'environmentVector');if(!vector.known)throw new Error(vector.reason);expect(frame).toMatchObject({phase:'returned',pc:'30677284',result:-1,vector:null,vectorPublished:true,vectorSlots:2});expect(vector.value.pointer(0).get()).toBe(null);expect(frame.input!.fields.backing.freed).toBe(false);expect(graph.value.snapshot().calls.find(c=>c.site==='3068e532')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(c=>c.site==='3067727f')?.returned).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the pending Engine vector calloc when its heap service is unavailable',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=platform.win32HeapAlloc.bind(platform),spy=vi.spyOn(platform,'win32HeapAlloc').mockImplementation((...args)=>args[2]===8?{known:false,reason:'Engine vector allocation unavailable'}:original(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineSetenvpProgress!;expect(frame).toMatchObject({phase:'blocked',pc:'3068e532',vector:null,vectorPublished:false,vectorSlots:2});expect(graph.value.snapshot().calls.find(c=>c.site==='3068e532')?.returned).toBe(false);expect(frame.input!.fields.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});
it('preserves the allocated Engine vector before an unavailable global publication',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeEngineSetenvpImages.imageForCrt,spy=vi.spyOn(NativeEngineSetenvpImages,'imageForCrt').mockImplementation((...args)=>args[2]==='environmentVector'&&bootstrap.attachProgress().engineSetenvpProgress?.pc==='3068e53d'?{known:false,reason:'Engine vector global unavailable'}:original(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineSetenvpProgress!,vector=NativeEngineSetenvpImages.imageForCrt(frame.images,crt,'environmentVector');if(!vector.known)throw new Error(vector.reason);expect(frame).toMatchObject({phase:'blocked',pc:'3068e53d',vectorPublished:false});expect(frame.vector!.bytes.length).toBe(8);expect(frame.vector!.backing.freed).toBe(false);expect(vector.value.pointer(0).get()).toBe(null);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains separate Engine environment globals and rejects a foreign CRT owner',()=>{
 const a=fixture(),b=fixture(),owner=NativeEngineSetenvpImages.forCrt(a.crt);if(!owner.known)throw new Error(owner.reason);expect(NativeEngineSetenvpImages.forCrt(a.crt)).toMatchObject({known:true,value:owner.value});for(const label of ['environmentVector','environmentReady'] as const){const image=NativeEngineSetenvpImages.imageForCrt(owner.value,a.crt,label);if(!image.known)throw new Error(image.reason);expect(image.value.readUnsigned(0)).toBe(0);expect(image.value.bytes.length).toBe(4);expect(NativeEngineSetenvpImages.imageForCrt(owner.value,b.crt,label).known).toBe(false);}expect(a.bootstrap.attachProgress().engineEnvironmentStorage!.pointer(0).get()).toBe(null);
});

it('releases and clears the Engine vector on a failed per-string calloc without freeing the input',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);crt.physical.mallocWait.writeUnsigned(0,0);const original=platform.win32HeapAlloc.bind(platform),spy=vi.spyOn(platform,'win32HeapAlloc').mockImplementation((...args)=>args[1]===8&&args[2]===18?{known:true,value:null}:original(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineSetenvpProgress!,vector=NativeEngineSetenvpImages.imageForCrt(frame.images,crt,'environmentVector');if(!vector.known)throw new Error(vector.reason);expect(frame).toMatchObject({phase:'returned',pc:'30677284',result:-1,vectorReleased:true,vectorCleared:true,inputReleased:false,inputCleared:false,filledEntries:0});expect(frame.vector!.backing.freed).toBe(true);expect(frame.input!.fields.backing.freed).toBe(false);expect(vector.value.pointer(0).get()).toBe(null);expect(graph.value.snapshot().calls.find(c=>c.site==='3068e5bd')?.returned).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the Engine bounded-copy prefix when a later input byte becomes unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeEngineCrtEnvironment.canonicalDestinationForPlatform,spy=vi.spyOn(NativeEngineCrtEnvironment,'canonicalDestinationForPlatform').mockImplementation((...args)=>{if(bootstrap.attachProgress().engineSetenvpProgress?.pc==='3068a888'&&args[1].offset===2&&args[2]===1)args[1].fields.knownMask[2]=0;return original(...args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineSetenvpProgress!;expect(frame).toMatchObject({phase:'blocked',pc:'3068a888',filledEntries:0,inputReleased:false});expect([...frame.strings[0]!.bytes.slice(0,2)]).toEqual([71,79]);expect([...frame.strings[0]!.bytes.slice(2)]).toEqual(Array(16).fill(0));expect(frame.strings[0]!.backing.freed).toBe(false);expect(frame.input!.fields.backing.freed).toBe(false);expect(graph.value.snapshot().calls.find(c=>c.site==='3068e570')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains released input and completed entries when Engine readiness publication is unavailable',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeEngineSetenvpImages.imageForCrt,spy=vi.spyOn(NativeEngineSetenvpImages,'imageForCrt').mockImplementation((...args)=>args[2]==='environmentReady'&&bootstrap.attachProgress().engineSetenvpProgress?.pc==='3068e5a5'?{known:false,reason:'Engine environment ready store unavailable'}:original(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineSetenvpProgress!,ready=NativeEngineSetenvpImages.imageForCrt(frame.images,crt,'environmentReady');if(!ready.known)throw new Error(ready.reason);expect(frame).toMatchObject({phase:'blocked',pc:'3068e5a5',filledEntries:1,inputReleased:true,inputCleared:true,readyPublished:false,result:null});expect(frame.input!.fields.backing.freed).toBe(true);expect(frame.vector!.backing.freed).toBe(false);expect(frame.strings[0]!.backing.freed).toBe(false);expect(ready.value.readUnsigned(0)).toBe(0);expect(bootstrap.attachProgress().engineEnvironmentStorage!.pointer(0).get()).toBe(null);expect(bootstrap.processAttach()).toEqual(result);
});
it('enters the original Engine CRT initializer with argument zero and a pending owned return',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineCinitProgress!;
 expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'100a7338',operations:4234,sse2ControlResult:1,sse2Result:1,exitTableResult:0,streamCount:512,streamResult:0,floatConversionWritten:true});
 expect(frame.images.crt).toBe(crt);
 expect(frame.streamAllocation!.bytes.length).toBe(2048);expect(frame.streamPointers!.map(word=>word.provenance)).toEqual(Array.from({length:20},(_,i)=>expect.objectContaining({kind:'engine-image',crt,offset:i*32})));expect(frame.streamAllocation!.readUnsigned(80)).toBe(0);
 expect(graph.value.snapshot().calls.find(c=>c.site==='3067c3e9')).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='3067d025').filter(c=>c.returned)).toHaveLength(6);
 expect(frame.exitTableAllocation!.bytes.length).toBe(128);expect(frame.exitTableAllocation!.maskedWord(0).knownMask).toBe(0);expect(frame.exitTableAllocation!.maskedWord(4).knownMask).toBe(0);expect(frame.exitTableAllocation!.readUnsigned(8)).toBe(0);expect(frame.exitTableAllocation!.backing.freed).toBe(false);
 expect(graph.value.snapshot().calls.find(c=>c.site==='30671530')).toMatchObject({returned:true});expect(graph.value.snapshot().calls.find(c=>c.site==='30671538')).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='3067d025')[0]).toMatchObject({returned:true});
 expect(graph.value.snapshot().trace.filter(pc=>pc==='3067d01f.EngineCinitSource')).toHaveLength(200);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='3067d025').at(-1)).toMatchObject({returned:true,position:frame.entryEsp-28,returnWord:{provenance:{kind:'source',type:'code',address:'3067d027'}}});
 const encodedCalls=graph.value.snapshot().calls.filter(c=>c.site==='3067f599');expect(encodedCalls).toHaveLength(10);expect(encodedCalls.every(c=>c.returned)).toBe(true);
 expect(graph.value.snapshot().calls.find(c=>c.site==='3067d1f9')).toMatchObject({returned:true,position:frame.entryEsp-20,returnWord:{provenance:{kind:'source',type:'code',address:'3067d1fe'}}});
 expect(frame.bank.maskedWord(40).value&0x80ff).toBe(0);expect(frame.bank.maskedWord(40).knownMask&0x80ff).toBe(0x80ff);
 expect(graph.value.snapshot().calls.find(c=>c.site==='3067d1ea')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3067d1ef'}}});
 expect(frame.floatPointers!.map(word=>word.provenance)).toEqual(['3067f56c','3067ec11','3067ebcf','3067ec03','3067eb79','3067f56c','3067f4e6','3067eb8f','3067eaf9','3067ea88'].map(address=>({kind:'source',type:'code',address})));
 expect(graph.value.snapshot().calls.find(c=>c.site==='30671672')).toMatchObject({returned:true});
 expect(graph.value.snapshot().calls.find(c=>c.site==='30671677')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3067167c'}}});
 const fpCall=graph.value.snapshot().calls.find(c=>c.site==='3067d1e3')!;
 expect(fpCall).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3067d1e9'}}});expect(frame.precisionArgument).toBe(0);
 expect(graph.value.snapshot().calls.find(c=>c.site==='3067d1d5')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3067d1da'}}});
 const call=graph.value.snapshot().calls.find(c=>c.site==='3067728a')!;
 expect(call).toMatchObject({returned:false,position:frame.entryEsp-8,returnWord:{provenance:{kind:'source',type:'code',address:'3067728f'}}});
 expect(frame.stack.readUnsigned(call.position+4)).toBe(0);
 expect(graph.value.snapshot().trace).toContain('30677284.EngineSetenvpCallerTest');
 expect(graph.value.snapshot().trace).toContain('30677286.EngineSetenvpCallerJl');
 const before=graph.value.snapshot().trace;expect(bootstrap.processAttach()).toEqual(result);expect(graph.value.snapshot().trace).toEqual(before);
});
it.each([
 [{},'3067f626','3067f626'],
 [{processorFeatureProcedure:true},'3067f632','3067f632'],
] as const)('retains unavailable Engine divide platform data at its original call %j', (features,pc,site)=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,features),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const result=bootstrap.processAttach();expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineCinitProgress).toMatchObject({pc,floatConversionWritten:true,precisionArgument:null});expect(graph.value.snapshot().calls.find(c=>c.site===site)).toMatchObject({returned:false});
 const adjustment=bootstrap.attachProgress().engineCinitProgress!.images;expect(adjustment.crt).toBe(crt);expect(graph.value.snapshot().calls.some(c=>c.site==='3067d1ea')).toBe(false);
 const before=graph.value.snapshot().trace;expect(bootstrap.processAttach()).toEqual(result);expect(graph.value.snapshot().trace).toEqual(before);
});
it('follows the original Engine x87 fallback when the feature export is absent',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{processorFeatureProcedure:false}),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(bootstrap.processAttach().known).toBe(false);expect(bootstrap.attachProgress().engineCinitProgress).toMatchObject({pc:'3067f5d5',operations:35});expect(graph.value.snapshot().calls.find(c=>c.site==='3067f626')).toMatchObject({returned:true});expect(graph.value.snapshot().calls.some(c=>c.site==='3067f632')).toBe(false);
});
it('returns the original Engine exit-table allocation failure to the C initializer caller',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const allocate=platform.win32HeapAlloc.bind(platform),spy=vi.spyOn(platform,'win32HeapAlloc').mockImplementation((...args)=>args[1]===8&&args[2]===128?{known:true,value:null}:allocate(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result.known).toBe(false);expect(bootstrap.attachProgress().engineCinitProgress).toMatchObject({pc:'3067d258',exitTableAllocation:null,exitTableResult:24,operations:692});expect(graph.value.snapshot().calls.filter(c=>c.site==='3067d025')).toHaveLength(1);expect(graph.value.snapshot().calls.find(c=>c.site==='3067d1f9')).toMatchObject({returned:true});
 const before=graph.value.snapshot().trace;expect(bootstrap.processAttach()).toEqual(result);expect(graph.value.snapshot().trace).toEqual(before);
});
it.each([false,true])('preserves Engine stream calloc retry and failure (both fail=%s)',bothFail=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const allocate=platform.win32HeapAlloc.bind(platform),spy=vi.spyOn(platform,'win32HeapAlloc').mockImplementation((...args)=>args[1]===8&&(args[2]===2048||(bothFail&&args[2]===80))?{known:true,value:null}:allocate(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 const frame=bootstrap.attachProgress().engineCinitProgress!;expect(result.known).toBe(false);expect(frame).toMatchObject({pc:bothFail?'3067d258':'100a7338',streamCount:20,streamResult:bothFail?26:0});expect(frame.streamAllocation?.bytes.length??null).toBe(bothFail?null:80);expect(graph.value.snapshot().calls.find(c=>c.site==='3067c402')).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='3067d025')).toHaveLength(bothFail?2:6);
 const before=graph.value.snapshot().trace;expect(bootstrap.processAttach()).toEqual(result);expect(graph.value.snapshot().trace).toEqual(before);
});
it.each([
 ['missing CPU',null,'3069c505'],
 ['missing leaf zero',{...nativeVirtualX86CpuSelection,cpuidLeaf0:undefined},'3069c51a'],
 ['missing leaf one',{...nativeVirtualX86CpuSelection,cpuidLeaf1:undefined},'3069c52d'],
 ['unimplemented SIMD exception',{...nativeVirtualX86CpuSelection,sse2Execution:'illegal-instruction'},'3069c53f'],
] as const)('preserves the Engine SSE2 boundary for %s',(_label,cpu,pc)=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{processorFeatureProcedure:true,floatingPointPrecisionErratum:false,cpu}),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineCinitProgress!;expect(result.known).toBe(false);expect(frame).toMatchObject({pc,sse2Result:null});const ready=NativeEngineCinitImages.imageForCrt(frame.images,crt,'sse2Ready');if(!ready.known)throw new Error(ready.reason);expect(ready.value.readUnsigned(0)).toBe(0);expect(graph.value.snapshot().calls.find(c=>c.site==='3067f727')).toMatchObject({returned:false});const before=graph.value.snapshot().trace;expect(bootstrap.processAttach()).toEqual(result);expect(graph.value.snapshot().trace).toEqual(before);
});
it.each([
 ['unwritable ID bit',{...nativeVirtualX86CpuSelection,idBitWritable:false}],
 ['SSE2 bit absent',{...nativeVirtualX86CpuSelection,cpuidLeaf1:[0x600,0,0,0] as const}],
] as const)('returns the original zero Engine SSE2 result for %s',(_label,cpu)=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{processorFeatureProcedure:true,floatingPointPrecisionErratum:false,cpu}),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',sse2ControlResult:0,sse2Result:0});const ready=NativeEngineCinitImages.imageForCrt(frame.images,crt,'sse2Ready');if(!ready.known)throw new Error(ready.reason);expect(ready.value.readUnsigned(0)).toBe(0);expect(graph.value.snapshot().calls.find(c=>c.site==='3067f727')).toMatchObject({returned:true});expect(graph.value.snapshot().calls.some(c=>c.site==='3069c53f')).toBe(false);
});

it('retains the original multibyte setup call when its live ready flag is cleared',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeCrtBootstrap.engineCinitArgvImagesForCrt;
 const spy=vi.spyOn(NativeCrtBootstrap,'engineCinitArgvImagesForCrt').mockImplementation((owner,module,permit)=>{
  const result=original(owner,module,permit);if(result.known){const ready=NativeEngineArgvImages.imageForCrt(result.value,module,'multibyteReady');if(!ready.known)throw new Error(ready.reason);ready.value.writeUnsigned(0,0,4);}return result;
 });
 try{expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'30684e6d',sse2Result:1,streamResult:0});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30685012').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.filter(c=>c.site==='3067d025'&&c.returned)).toHaveLength(3);expect(frame.images.crt).toBe(crt);}finally{spy.mockRestore();}
});

it('reruns the original CPU helper for the separate SSE2 control initializer',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',sse2Result:1,sse2ControlResult:1});
 const control=NativeEngineCinitImages.imageForCrt(frame.images,crt,'sse2Control');if(!control.known)throw new Error(control.reason);expect(control.value.readUnsigned(0)).toBe(1);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='3069c552')).toMatchObject({returned:true});expect(graph.value.snapshot().trace.filter(pc=>pc==='3069c51a.EngineCinitSource')).toHaveLength(2);expect(graph.value.snapshot().trace.filter(pc=>pc==='3069c52d.EngineCinitSource')).toHaveLength(2);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069c53f')).toHaveLength(2);
});

it('retains all pending returns into original Engine shutdown registration',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);const result=bootstrap.processAttach();expect(result.known).toBe(false);
 const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,exitTableResult:0,onexitPrologReturned:true,onexitLockHeld:false});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 for(const site of ['30671187','3067159a'])expect(graph.value.snapshot().calls.filter(c=>c.site===site).at(-1)).toMatchObject({returned:true});
 expect(graph.value.snapshot().trace).toContain('30671182.EngineCinitSource');expect(graph.value.snapshot().trace).toContain('3067118c.EngineCinitSource');expect(bootstrap.processAttach()).toEqual(result);
});

it('preserves the original onexit frame before FS publication when cookie bytes are unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeCrtBootstrap.engineCinitCookieForCrt;
 const spy=vi.spyOn(NativeCrtBootstrap,'engineCinitCookieForCrt').mockImplementation((owner,module,permit)=>{const result=original(owner,module,permit);if(result.known)result.value.knownMask[0]=0;return result;});
 try{expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'3067e51d',onexitPrologReturned:false,onexitLockHeld:false});expect(frame.onexitEbp).toBe(frame.entryEsp-48);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30671561').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().trace).not.toContain('3067e53e.EngineCinitSource');}finally{spy.mockRestore();}
});

it('stores the actual shutdown callback in the retained exit table and advances its encoded cursor',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;
 expect(frame.pc).toBe('100a7338');expect(frame.exitTableFirst).toMatchObject({provenance:{kind:'source',type:'code',address:'30671144'}});expect(frame.exitTableSecond).toMatchObject({provenance:{kind:'source',type:'code',address:'3068e981'}});expect(frame.exitCursor).toMatchObject({provenance:{kind:'engine-allocation',crt,fields:frame.exitTableAllocation,offset:8}});expect(frame.onexitLockHeld).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='306714ac')).toMatchObject({returned:true});expect(graph.value.snapshot().calls.find(c=>c.site==='30671572')).toMatchObject({returned:true});
 const cursor=NativeEngineCinitImages.imageForCrt(frame.images,crt,'exitTableBegin');if(!cursor.known)throw new Error(cursor.reason);expect(cursor.value.maskedWord(0).knownMask).toBe(0);expect(frame.exitTableAllocation!.maskedWord(4).knownMask).toBe(0);expect(frame.exitTableAllocation!.readUnsigned(8)).toBe(0);expect(frame.typeNameArguments?.[1]).toMatchObject({provenance:{kind:'engine-image',offset:9}});expect(graph.value.snapshot().calls.find(c=>c.site==='3067d20b')).toMatchObject({returned:true});expect(graph.value.snapshot().trace).toContain('3067150b.EngineCinitSource');expect(graph.value.snapshot().trace).toContain('30671517.EngineCinitSource');
});

it('walks the owned C++ table to its actual first callback and preserves its pending return',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);const result=bootstrap.processAttach();expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234});
 const table=NativeEngineCinitImages.imageForCrt(frame.images,crt,'cppInitializers');if(!table.known)throw new Error(table.reason);expect(table.value.bytes.length).toBe(93705*4);expect(table.value.readUnsigned(0)).toBe(0);expect(table.value.readUnsigned(0x104)).toBe(0x307322b0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().trace.filter(pc=>pc==='3067d221.EngineCinitSource')).toHaveLength(66);expect(graph.value.snapshot().calls.find(c=>c.site==='3067d227')).toMatchObject({returned:false,position:frame.entryEsp-20});expect(frame.cppCursor?.provenance?.kind).toBe('engine-image');if(frame.cppCursor?.provenance?.kind!=='engine-image')throw new Error('Actual C++ image cursor required');expect(frame.cppCursor?.provenance.crt).toBe(crt);expect(frame.cppCursor?.provenance.fields).toBe(table.value);expect(frame.cppCursor?.provenance.offset).toBe(0x104);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains original property flags and pending type-name calls without fabricating a property object',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineCinitProgress!;
 expect(frame.pc).toBe('100a7338');const flags=NativeEngineCinitImages.imageForCrt(frame.images,crt,'visualAnimationFloatFlags'),storage=NativeEngineCinitImages.imageForCrt(frame.images,crt,'visualAnimationFloatStorage'),root=NativeEngineCinitImages.imageForCrt(frame.images,crt,'visualAnimationFloatRoot');if(!flags.known||!storage.known||!root.known)throw new Error('Actual property images required');expect(flags.value.readUnsigned(0)).toBe(3);expect(storage.value.readUnsigned(4)).toBe(root.value.readUnsigned(0));expect(storage.value.readUnsigned(0)).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['307322b0','30076673','306713b3'])expect(graph.value.snapshot().calls.find(c=>c.site===site)).toMatchObject({returned:site!=='307322b0'});expect(graph.value.snapshot().trace).toContain('3001c3c8.EngineCinitSource');expect(graph.value.snapshot().trace).not.toContain('307322b5.EngineCinitSource');expect(bootstrap.processAttach()).toEqual(result);
});

for(const knownMask of [0,3])it('uses only the original tested property flag bits with mask '+knownMask,()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeEngineCinitImages.imageForCrt;
 const spy=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((...args)=>{const result=original(...args);if(args[2]==='visualAnimationFloatFlags'&&result.known)result.value.knownMask[0]=knownMask;return result;});
 try{expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame.pc).toBe(knownMask===0?'30076647':'100a7338');const flags=original(frame.images,crt,'visualAnimationFloatFlags');if(!flags.known)throw new Error(flags.reason);expect(flags.value.maskedWord(0)).toMatchObject({value:knownMask===0?0:3,knownMask:(0xffffff00|knownMask)>>>0});}finally{spy.mockRestore();}
});

it('retains a separate type-name EH4 frame with its original owned scope',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',typeNamePrologReturned:true,onexitLockHeld:false});expect(frame.typeNameEbp).toBe(frame.entryEsp-48);
 const scope=NativeEngineCinitImages.imageForCrt(frame.images,crt,'propertyTypeNameSehScope');if(!scope.known)throw new Error(scope.reason);expect(scope.value.bytes.length).toBe(28);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='3067da9e')).toMatchObject({returned:true});expect(graph.value.snapshot().calls.find(c=>c.site==='306713b3')).toMatchObject({returned:true});
});

it('passes all six original undecoration arguments from the retained type-info record',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!,args=frame.typeNameArguments!;expect(args).toHaveLength(6);expect(args[0]).toMatchObject({value:0,mask:0xffffffff});expect(args[2]).toMatchObject({value:0,mask:0xffffffff});expect(args[3]).toMatchObject({provenance:{kind:'source',type:'code',address:'30672ec7'}});expect(args[4]).toMatchObject({provenance:{kind:'source',type:'code',address:'30672f8a'}});expect(args[5]).toMatchObject({value:0x2800,mask:0xffffffff});
 const p=args[1]?.provenance;expect(p?.kind).toBe('engine-image');if(p?.kind!=='engine-image')throw new Error('Original name image required');const info=NativeEngineCinitImages.imageForCrt(frame.images,crt,'visualAnimationFloatTypeInfo');if(!info.known)throw new Error(info.reason);expect(p.fields).toBe(info.value);expect(p.offset).toBe(9);expect(Array.from(info.value.bytes.slice(9))).toEqual([0x4d,0]);expect(info.value.maskedWord(4).knownMask).toBe(0);expect(frame.typeNameCacheTextWord).toMatchObject({provenance:{kind:'engine-allocation',fields:frame.typeNameCacheText,offset:0}});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='3067dac6')).toMatchObject({returned:true,position:frame.entryEsp-120});
});
it('stops at the actual type-name cache comparison when its bytes are unknown',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeEngineCinitImages.imageForCrt;
 const spy=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((...args)=>{const result=original(...args);if(args[2]==='visualAnimationFloatTypeInfo'&&result.known)result.value.knownMask[4]=0;return result;});try{expect(bootstrap.processAttach().known).toBe(false);expect(bootstrap.attachProgress().engineCinitProgress).toMatchObject({pc:'3067daa8',typeNameArguments:null,typeNamePrologReturned:true});}finally{spy.mockRestore();}
});

it('enters undecoration with its 132-byte local frame and original allocator before lock initialization',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);let lockArgument:number|null=null;const original=NativeCrtBootstrap.engineCinitUndecorationLockForCrt;const spy=vi.spyOn(NativeCrtBootstrap,'engineCinitUndecorationLockForCrt').mockImplementation((...args)=>{if(args[3]==='ensure'){const f=bootstrap.attachProgress().engineCinitProgress!;lockArgument=f.stack.readUnsigned(f.entryEsp-292);}return original(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',undecorationEbp:frame.entryEsp-124,undecorationPrologReturned:true});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='3069b275')).toMatchObject({returned:true});expect(graph.value.snapshot().calls.find(c=>c.site==='3069b289')).toMatchObject({returned:true,position:frame.entryEsp-296});expect(lockArgument).toBe(5);
});

for(const operation of ['ensure','lock'] as const)it('retains the undecoration call when lock service '+operation+' is unavailable',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeCrtBootstrap.engineCinitUndecorationLockForCrt;
 const spy=vi.spyOn(NativeCrtBootstrap,'engineCinitUndecorationLockForCrt').mockImplementation((owner,module,permit,selected)=>selected===operation?{known:false,reason:'Selected undecoration lock service unavailable'}:original(owner,module,permit,selected));
 try{const result=bootstrap.processAttach();expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:operation==='ensure'?'3069b289':'3069b295',undecorationPrologReturned:true,undecorationLockHeld:false});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site===(operation==='ensure'?'3069b289':'3069b295'))).toMatchObject({returned:false});expect(bootstrap.processAttach()).toEqual(result);}finally{spy.mockRestore();}
});

it('publishes the actual undecoration callback globals before the pending parser constructor',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);let kindAtCall:number|null=null;let releasedFields:number[]=[];const free=NativeModuleCrtOwner.prototype.free;const freeProbe=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30672f8a'&&releasedFields.length===0){const p=f.undecorationFieldWords![0]!.provenance;if(p?.kind!=='engine-allocation')throw new Error('Actual live parser fields required');releasedFields=[4088,4092,4096,4072,4076,4080,4060,4044].map(offset=>p.fields.readUnsigned(offset));}return free.call(this,backing);});const original=NativeEngineCinitImages.imageForCrt;const probe=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((...args)=>{if(args[2]==='undecorationFieldVtableEntry'){const f=bootstrap.attachProgress().engineCinitProgress!;kindAtCall=f.stack.readUnsigned(f.entryEsp-352);}return original(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{probe.mockRestore();freeProbe.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});const words=frame.undecorationGlobalWords!;expect(words[0]).toMatchObject({provenance:{kind:'source',type:'code',address:'30672ec7'}});expect(words[1]).toMatchObject({provenance:{kind:'source',type:'code',address:'30672f8a'}});expect(words[2]).toMatchObject({value:0,mask:0xffffffff});expect(words[3]).toMatchObject({value:0,mask:0xffffffff});expect(words[2]!.provenance).toEqual(words[3]!.provenance);expect(words[4]).toMatchObject({value:4008,mask:0xffffffff});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='3069b2d3')).toMatchObject({returned:true,position:frame.entryEsp-312});expect(frame.undecorationTextNodeWord).toMatchObject({provenance:{kind:'engine-allocation',offset:4020}});expect(graph.value.snapshot().calls.find(c=>c.site==='30697481')).toMatchObject({returned:true,position:frame.entryEsp-328,returnWord:{provenance:{kind:'source',type:'code',address:'30697486'}}});expect(frame.typeNameEbp).toBe(frame.entryEsp-48);expect(graph.value.snapshot().registers.EBP).toMatchObject({changed:false,word:{provenance:null}});expect(frame.undecorationLiteralArgument).toMatchObject({provenance:{kind:'engine-image',offset:0}});expect(graph.value.snapshot().calls.find(c=>c.site==='3069707d')).toMatchObject({returned:true,position:frame.entryEsp-360});expect(graph.value.snapshot().calls.find(c=>c.site==='30696c06')).toMatchObject({returned:true,position:frame.entryEsp-400,returnWord:{provenance:{kind:'source',type:'code',address:'30696c08'}}});expect(graph.value.snapshot().calls.find(c=>c.site==='30697089')).toMatchObject({returned:true,position:frame.entryEsp-356});expect(graph.value.snapshot().calls.find(c=>c.site==='306972ca')).toMatchObject({returned:true,position:frame.entryEsp-340});expect(kindAtCall).toBe(1);const p=frame.undecorationFieldWords![0]!.provenance;if(p?.kind!=='engine-allocation')throw new Error('Actual retained arena block record required');expect(releasedFields[0]).toBe(0);expect(releasedFields[1]).toBe(3);expect(releasedFields[2]).toBe(0);expect(releasedFields[3]).toBe(0);expect(releasedFields[4]).toBe(1);expect(releasedFields[5]).toBe(0);expect(frame.undecorationFieldWords).toMatchObject([{provenance:{kind:'engine-allocation',crt,fields:p.fields,offset:4084}},{provenance:{kind:'engine-allocation',crt,fields:p.fields,offset:4068}},{provenance:{kind:'engine-allocation',crt,fields:p.fields,offset:4052}},{provenance:{kind:'engine-allocation',crt,fields:p.fields,offset:4036}}]);expect(frame.stack.readUnsigned(frame.undecorationEbp!-148)).toBe(0xffffffff);expect(frame.stack.readUnsigned(frame.undecorationEbp!-88)).toBe(0xffffffff);expect(releasedFields[6]).toBe(3);expect(releasedFields[7]).toBe(1);expect(graph.value.snapshot().calls.find(c=>c.site==='3069748b')).toMatchObject({returned:true,position:frame.entryEsp-328});
});

for(const outcome of ['unavailable','null'] as const)it('retains the parser arena malloc '+outcome+' boundary without publishing a block',()=>{
 const original=NativeModuleCrtOwner.prototype.malloc;const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes:number){if(bytes===4104)return outcome==='null'?{known:true,value:null}:{known:false,reason:'Parser arena malloc unavailable'};return original.call(this,bytes);});
 try{const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);const result=bootstrap.processAttach();expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:outcome==='null'?'30696c3d':'30672ec7',operations:outcome==='null'?2864:2857,undecorationLockHeld:true});for(const word of frame.undecorationGlobalWords!.slice(2))expect(word).toMatchObject({value:0,mask:0xffffffff});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='30696c06')).toMatchObject({returned:outcome==='null'});expect(bootstrap.processAttach()).toEqual(result);}finally{spy.mockRestore();}
});

it('constructs all four parser fields from one retained arena block',()=>{
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc');try{const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});expect(spy.mock.calls.filter(args=>args[0]===4104)).toHaveLength(1);const words=frame.undecorationFieldWords!;expect(words).toHaveLength(4);const first=words[0]!.provenance;if(first?.kind!=='engine-allocation')throw new Error('Actual first parser node required');for(const [i,offset] of [4084,4068,4052,4036].entries())expect(words[i]).toMatchObject({provenance:{kind:'engine-allocation',crt,fields:first.fields,offset}});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(call=>call.site==='30697089')).toHaveLength(4);expect(graph.value.snapshot().calls.filter(call=>call.site==='30697089').every(call=>call.returned)).toBe(true);expect(graph.value.snapshot().calls.find(call=>call.site==='30697481')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(call=>call.site==='3069748b')?.returned).toBe(true);}finally{spy.mockRestore();}
});

it('configures the parser from the original caller arguments and returns its constructor',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});const words=frame.undecorationParserWords!;expect(words[0]).toMatchObject({provenance:{kind:'stack',offset:frame.undecorationEbp!-148}});expect(words[1]).toMatchObject({provenance:{kind:'stack',offset:frame.undecorationEbp!-88}});const typeInfo=NativeEngineCinitImages.imageForCrt(frame.images,crt,'visualAnimationFloatTypeInfo');if(!typeInfo.known)throw new Error(typeInfo.reason);expect(words[3]).toMatchObject({provenance:{kind:'engine-image',crt,fields:typeInfo.value,offset:10}});expect(words[4]).toMatchObject({provenance:{kind:'engine-image',crt,fields:typeInfo.value,offset:9}});expect(words[5]).toMatchObject({provenance:{kind:'engine-allocation',crt,fields:frame.undecorationOutput,offset:0}});expect(words[6]).toMatchObject({value:6,mask:0xffffffff});expect(words[8]).toMatchObject({value:0,mask:0xffffffff});expect(words[7]).toMatchObject({value:0x2800,mask:0xffffffff});const config=NativeEngineCinitImages.imageForCrt(frame.images,crt,'undecorationParserGlobals');if(!config.known)throw new Error(config.reason);expect(config.value.bytes.length).toBe(38);expect(config.value.readUnsigned(36,1)).toBe(0);expect(config.value.knownMask[36]).toBe(255);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='3069b2d3')).toMatchObject({returned:true});expect(graph.value.snapshot().calls.find(c=>c.site==='3069b2de')).toMatchObject({returned:true,position:frame.entryEsp-292,returnWord:{provenance:{kind:'source',type:'code',address:'3069b2e3'}}});
});

it('selects the original type-parser branch with physical destination arguments',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);let zeroArgument:number|null=null;const image=NativeEngineCinitImages.imageForCrt;const probe=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((...args)=>{if(args[2]==='undecorationTextVtableEntry'&&zeroArgument===null){const f=bootstrap.attachProgress().engineCinitProgress!;zeroArgument=f.stack.readUnsigned(f.entryEsp-384);}return image(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{probe.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const snapshot=graph.value.snapshot();expect(snapshot.calls.find(c=>c.site==='3069b03f')).toMatchObject({returned:true,position:frame.entryEsp-336,returnWord:{provenance:{kind:'source',type:'code',address:'3069b044'}}});expect(snapshot.calls.find(c=>c.site==='3069a31c')).toMatchObject({returned:true,position:frame.entryEsp-392,returnWord:{provenance:{kind:'source',type:'code',address:'3069a321'}}});expect(frame.undecorationPendingTypeArguments).toBeNull();expect(frame.undecorationCopiedTypeWords![0]!.provenance).toEqual(frame.undecorationTextNodeWord!.provenance);expect(frame.typeNameEbp).toBe(frame.entryEsp-48);expect(snapshot.registers.EBP).toMatchObject({changed:false,word:{provenance:null}});expect(frame.undecorationRestoredEsiWord!.provenance).toEqual(frame.cppCursor!.provenance);expect(zeroArgument).toBe(0);expect(frame.typeNameArguments![5]).toMatchObject({value:0x2800,mask:0xffffffff});expect(frame.undecorationParserWords![7]).toMatchObject({value:0x2800,mask:0xffffffff});
});
it('preserves the original name-byte comparison when its byte is unknown',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeEngineCinitImages.imageForCrt;const spy=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((...args)=>{const result=original(...args);if(args[2]==='visualAnimationFloatTypeInfo'&&result.known)result.value.knownMask[9]=0;return result;});try{expect(bootstrap.processAttach().known).toBe(false);expect(bootstrap.attachProgress().engineCinitProgress).toMatchObject({pc:'3069afda',operations:3155,undecorationLockHeld:true});}finally{spy.mockRestore();}
});

it('dispatches the actual M type code with its original temporary and output pointers',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const snapshot=graph.value.snapshot();expect(snapshot.calls.find(c=>c.site==='3069b882')).toMatchObject({returned:true});expect(snapshot.calls.find(c=>c.site==='3069b8a3')).toMatchObject({returned:true,position:frame.entryEsp-432});expect(snapshot.calls.find(c=>c.site==='3069b770')).toMatchObject({returned:true,position:frame.entryEsp-476,returnWord:{provenance:{kind:'source',type:'code',address:'3069b775'}}});expect(frame.undecorationPendingTypeArguments).toBeNull();const info=NativeEngineCinitImages.imageForCrt(frame.images,crt,'visualAnimationFloatTypeInfo');if(!info.known)throw new Error(info.reason);expect(frame.undecorationRestoredEsiWord!.provenance).toEqual(frame.cppCursor!.provenance);const cases=NativeEngineCinitImages.imageForCrt(frame.images,crt,'undecorationBasicTypeCaseMap');if(!cases.known)throw new Error(cases.reason);expect(cases.value.readUnsigned(10,1)).toBe(4);expect(frame.stack.readUnsigned(frame.entryEsp-404)).toBe(0);const flags=frame.stack.maskedWord(frame.entryEsp-400);expect(flags.value&0xfff).toBe(0);expect(flags.knownMask&0xfff).toBe(0xfff);expect(frame.undecorationParserWords![4]).toMatchObject({provenance:{kind:'engine-image',crt,fields:info.value,offset:9}});
});

it('resolves M through the original case tables and pushes the original float literal',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});const literal=NativeEngineCinitImages.imageForCrt(frame.images,crt,'undecorationFloatLiteral');if(!literal.known)throw new Error(literal.reason);expect(Buffer.from(literal.value.bytes).toString('hex')).toBe('666c6f617400');expect(frame.undecorationLiteralArgument).toMatchObject({provenance:{kind:'engine-image',crt,fields:literal.value,offset:0}});expect(frame.undecorationParserWords![3]).toMatchObject({provenance:{kind:'engine-image',offset:10}});expect(frame.undecorationParserWords![4]).toMatchObject({provenance:{kind:'engine-image',offset:9}});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='3069b5c8')).toMatchObject({returned:true,position:frame.entryEsp-536,returnWord:{provenance:{kind:'source',type:'code',address:'3069b5cd'}}});expect(frame.undecorationTextNodeWord).toMatchObject({provenance:{kind:'engine-allocation',offset:4020}});expect(graph.value.snapshot().trace.some(row=>row.includes('3069b3fa'))).toBe(true);
});

it('scans the original float literal and allocates its text node from the same arena',()=>{
 const malloc=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc');try{const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});expect(malloc.mock.calls.filter(args=>args[0]===4104)).toHaveLength(1);const block=frame.undecorationTextNodeWord!.provenance;if(block?.kind!=='engine-allocation')throw new Error('Actual retained arena required');expect(frame.undecorationTextNodeWord).toMatchObject({provenance:{kind:'engine-allocation',crt,fields:block.fields,offset:4020}});expect(frame.undecorationGlobalWords![4]).toMatchObject({value:4008,mask:0xffffffff});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const snapshot=graph.value.snapshot();expect(snapshot.calls.find(c=>c.site==='30697a2e')).toMatchObject({returned:true,position:frame.entryEsp-552});expect(snapshot.calls.find(c=>c.site==='3069765e')).toMatchObject({returned:true,position:frame.entryEsp-576});expect(snapshot.calls.find(c=>c.site==='3069766e')).toMatchObject({returned:true,position:frame.entryEsp-576,returnWord:{provenance:{kind:'source',type:'code',address:'30697673'}}});expect(frame.undecorationTextNodeWords![3]).toMatchObject({value:5,mask:0xffffffff});for(const pc of ['30697a23','30697a24','30697a28'])expect(snapshot.trace.filter(row=>row.includes(pc))).toHaveLength(5);const literal=NativeEngineCinitImages.imageForCrt(frame.images,crt,'undecorationFloatLiteral');if(!literal.known)throw new Error(literal.reason);expect(frame.undecorationLiteralArgument).toMatchObject({provenance:{kind:'engine-image',crt,fields:literal.value,offset:0}});}finally{malloc.mockRestore();}
});

it('copies exactly five original characters into the owned text node and returns the string path',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});const node=frame.undecorationTextNodeWord!.provenance;if(node?.kind!=='engine-allocation')throw new Error('Actual constructed text node required');expect(node).toMatchObject({crt,offset:4020});const words=frame.undecorationTextNodeWords!,vtable=NativeEngineCinitImages.imageForCrt(frame.images,crt,'undecorationTextVtableEntry');if(!vtable.known)throw new Error(vtable.reason);expect(words[0]).toMatchObject({provenance:{kind:'engine-image',crt,fields:vtable.value,offset:0}});expect(words[1]).toMatchObject({value:0,mask:0xffffffff});expect(words[2]).toMatchObject({provenance:{kind:'engine-allocation',crt,fields:node.fields,offset:4012}});expect(words[3]).toMatchObject({value:5,mask:0xffffffff});expect(Buffer.from(node.fields.bytes.slice(4012,4017)).toString('hex')).toBe('666c6f6174');expect([...node.fields.knownMask.slice(4012,4017)]).toEqual([255,255,255,255,255]);expect([...node.fields.knownMask.slice(4017,4020)]).toEqual([0,0,0]);expect(frame.undecorationGlobalWords![4]).toMatchObject({value:4008,mask:0xffffffff});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const snapshot=graph.value.snapshot();for(const site of ['3069739f','306973b2','3069766e','30697a2e','3069b5c8'])expect(snapshot.calls.find(c=>c.site===site)?.returned).toBe(true);for(const pc of ['30696f47','30696f4b','30696f51'])expect(snapshot.trace.filter(row=>row.includes(pc))).toHaveLength(10);expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:frame.entryEsp-64}}});
});


it('copies the original basic type value with owned node identity and preserved high flag bits',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 let originalFlags:{value:number;knownMask:number}|null=null;let inspecting=false;let watchedStack:NativeHeapObjectViews|null=null;let watchedOffset:number|null=null;const image=NativeEngineCinitImages.imageForCrt;const imageProbe=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((...args)=>{if(args[2]==='undecorationTextVtableEntry'&&!watchedStack){const f=bootstrap.attachProgress().engineCinitProgress!;watchedStack=f.stack;watchedOffset=f.entryEsp-300;}return image(...args);});const masked=NativeHeapObjectViews.prototype.maskedWord;const probe=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){const value=masked.call(this,offset,width);if(!inspecting&&!originalFlags&&this===watchedStack&&offset===watchedOffset){inspecting=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30696dcb'&&this===f.stack&&offset===f.entryEsp-300)originalFlags={value:value.value,knownMask:value.knownMask};}finally{inspecting=false;}}return value;});try{expect(bootstrap.processAttach().known).toBe(false);}finally{probe.mockRestore();imageProbe.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;
 expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});
 expect(frame.undecorationCopiedTypeWords![0]!.provenance).toEqual(frame.undecorationTextNodeWord!.provenance);
 const source=frame.stack.maskedWord(frame.entryEsp-488),copied=frame.undecorationCopiedTypeWords![1]!,destination={value:copied.value,knownMask:copied.mask};
 expect(destination.value&0xfff).toBe(source.value&0xfff);expect(destination.knownMask&0xfff).toBe(source.knownMask&0xfff);
 expect(originalFlags).not.toBeNull();const before=originalFlags! as {value:number;knownMask:number};expect(destination.value>>>12).toBe(before.value>>>12);expect(destination.knownMask>>>12).toBe(before.knownMask>>>12);expect(frame.undecorationCopiedTypeWords![1]!.mask).toBe(destination.knownMask);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const snapshot=graph.value.snapshot();
 expect(snapshot.calls.find(call=>call.site==='3069b676')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3069b67b'}}});
 expect(snapshot.calls.find(call=>call.site==='3069b54e')).toMatchObject({returned:true,position:frame.entryEsp-536,returnWord:{provenance:{kind:'source',type:'code',address:'3069b553'}}});
 expect(snapshot.calls.find(call=>call.site==='3069a330')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3069a335'}}});
 expect(snapshot.calls.find(call=>call.site==='3069b049')).toMatchObject({returned:true,position:frame.entryEsp-336,returnWord:{provenance:{kind:'source',type:'code',address:'3069b04e'}}});
 expect(frame.undecorationParserWords![7]).toMatchObject({value:0x2800,mask:0xffffffff});
 expect(frame.undecorationParserWords![5]).toMatchObject({provenance:{kind:'engine-allocation',fields:frame.undecorationOutput,offset:0}});
 expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:frame.entryEsp-64}}});
 for(const pc of ['30696ca9','30696cb9','30696cc6','30696cd3','30696ce3','30696ce8','30696cf5','30696d08','30696d18','30696d28','30696d2c'])expect(snapshot.trace.filter(row=>row.includes(pc))).toHaveLength(2);
});


it('calculates original text-node length and allocates an owned aligned name output',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;
 expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});expect(frame.undecorationOutput).not.toBeNull();
 const output=frame.undecorationOutput!,arena=frame.undecorationTextNodeWord!.provenance;if(arena?.kind!=='engine-allocation')throw new Error('Actual arena-backed text node required');
 expect(output).not.toBe(arena.fields);expect(output.bytes.length).toBe(8);expect([...output.knownMask]).toEqual([255,255,255,255,255,255,0,0]);expect(Buffer.from(output.bytes.slice(0,6)).toString('hex')).toBe('666c6f617400');
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:output,offset:0},8).known).toBe(false);
 expect(frame.undecorationParserWords![5]).toMatchObject({provenance:{kind:'engine-allocation',crt,fields:output,offset:0}});expect(frame.undecorationParserWords![6]).toMatchObject({value:6,mask:0xffffffff});
 expect(frame.undecorationOutputWriterArguments).toMatchObject([{provenance:{kind:'engine-allocation',crt,fields:output,offset:0}},{value:6,mask:0xffffffff}]);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const snapshot=graph.value.snapshot();
 expect(snapshot.calls.find(call=>call.site==='3069b081')).toMatchObject({returned:true});
 expect(snapshot.calls.find(call=>call.site==='30697129')).toMatchObject({returned:true,position:frame.entryEsp-344,returnWord:{provenance:{kind:'source',type:'code',address:'3069712b'}}});
 expect(snapshot.calls.find(call=>call.site==='3069b0a2')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3069b0a7'}}});
 expect(snapshot.calls.find(call=>call.site==='3069b0b4')).toMatchObject({returned:true,position:frame.entryEsp-336});
 expect(snapshot.calls.find(call=>call.site==='3069b0ce')).toMatchObject({returned:true,position:frame.entryEsp-340});
 expect(snapshot.trace.filter(row=>row.includes('30696ec5'))).toHaveLength(2);expect(snapshot.trace.filter(row=>row.includes('30697130'))).toHaveLength(2);
});

for(const outcome of ['unavailable','null'] as const)it('retains original name-output malloc '+outcome+' without a fabricated buffer',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),malloc=NativeModuleCrtOwner.prototype.malloc;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){if(bytes===8&&bootstrap.attachProgress().engineCinitProgress?.pc==='30672ec7')return outcome==='null'?{known:true,value:null}:{known:false,reason:'Name-output allocation unavailable'};return malloc.call(this,bytes);});
 try{expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:outcome==='null'?'3069b102':'30672ec7',operations:outcome==='null'?3779:3775,undecorationOutput:null,undecorationLockHeld:true});expect(frame.undecorationParserWords![5]).toMatchObject({value:0,mask:0xffffffff});expect(frame.undecorationParserWords![6]).toMatchObject({value:6,mask:0xffffffff});}finally{spy.mockRestore();}
});


it('rejects a stale arena allocation returned for the original name-output malloc',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),malloc=NativeModuleCrtOwner.prototype.malloc;let retained:ReturnType<NativeModuleCrtOwner['malloc']>|null=null;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){if(bytes===8&&bootstrap.attachProgress().engineCinitProgress?.pc==='30672ec7'&&retained)return retained;const value=malloc.call(this,bytes);if(bytes===4104)retained=value;return value;});
 try{const result=bootstrap.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Malformed name allocation must remain pending');expect(result.reason).toContain('Actual requested name-output allocation extent required');const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'30672ec7',operations:3775,undecorationOutput:null});expect(frame.undecorationParserWords![5]).toMatchObject({value:0,mask:0xffffffff});}finally{spy.mockRestore();}
});


it('retains partial original node output and its pending calls when a byte write is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),write=NativeHeapObjectViews.prototype.writeUnsigned;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30696f4b'&&f.undecorationOutput===this&&offset===2)throw new Error('Interrupted original node output');write.call(this,offset,value,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame.pc).toBe('30696f4b');expect(Buffer.from(frame.undecorationOutput!.bytes.slice(0,2)).toString('hex')).toBe('666c');expect([...frame.undecorationOutput!.knownMask]).toEqual([255,255,0,0,0,0,0,0]);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['3069b0ce','306971d4','30697402'])expect(graph.value.snapshot().calls.find(call=>call.site===site)?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains five copied characters without a fabricated terminator when the original NUL write is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),write=NativeHeapObjectViews.prototype.writeUnsigned;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='306971f6'&&f.undecorationOutput===this)throw new Error('Interrupted original name terminator');write.call(this,offset,value,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame.pc).toBe('306971f6');expect(Buffer.from(frame.undecorationOutput!.bytes.slice(0,5)).toString('hex')).toBe('666c6f6174');expect([...frame.undecorationOutput!.knownMask]).toEqual([255,255,255,255,255,0,0,0]);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(call=>call.site==='306971d4')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(call=>call.site==='3069b0ce')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});


it('returns the original name parser with its owned complete NUL-terminated output',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!,output=frame.undecorationOutput!;
 expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});expect(frame.typeNameLength).toBe(5);expect(Buffer.from(output.bytes.slice(0,6)).toString('hex')).toBe('666c6f617400');expect([...output.knownMask]).toEqual([255,255,255,255,255,255,0,0]);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:output,offset:0},8).known).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const snapshot=graph.value.snapshot();expect(snapshot.calls.find(call=>call.site==='3069b2de')).toMatchObject({returned:true,position:frame.entryEsp-292,returnWord:{provenance:{kind:'source',type:'code',address:'3069b2e3'}}});expect(snapshot.calls.find(call=>call.site==='3067dac6')?.returned).toBe(true);expect(frame.typeNameEbp).toBe(frame.entryEsp-48);expect(snapshot.registers.EBP).toMatchObject({changed:false,word:{provenance:null}});expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:frame.entryEsp-64}}});expect(snapshot.trace.filter(row=>row.includes('3069b0f3'))).toHaveLength(6);expect(snapshot.trace.filter(row=>row.includes('3069b0ef'))).toHaveLength(5);
});


it('releases the original parser arena while preserving the separately owned output',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!,output=frame.undecorationOutput!;
 expect(frame.pc).toBe('100a7338');expect(frame.undecorationLockHeld).toBe(false);const node=frame.undecorationTextNodeWord!.provenance;if(node?.kind!=='engine-allocation')throw new Error('Actual retained node required');expect(node.fields.backing.freed).toBe(true);expect(frame.undecorationTextNodeLive).toBe(false);expect(frame.undecorationTextNodeWords).toHaveLength(4);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:node.fields,offset:0},4104).known).toBe(false);expect(output.backing.freed).toBe(true);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:output,offset:0},8).known).toBe(false);expect(Buffer.from(output.bytes.slice(0,6)).toString('hex')).toBe('666c6f617400');expect([...output.knownMask]).toEqual([255,255,255,255,255,255,0,0]);expect(frame.undecorationGlobalWords![2]).toMatchObject({value:0,mask:0xffffffff});expect(frame.undecorationGlobalWords![3]).toMatchObject({value:0,mask:0xffffffff});expect(frame.undecorationGlobalWords![4]).toMatchObject({value:4008,mask:0xffffffff});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(call=>call.site==='3069b2eb')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(call=>call.site==='3069661c')?.returned).toBe(true);
});


it('retains the live arena and output when its actual CRT release is unavailable',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);const free=NativeModuleCrtOwner.prototype.free;const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){if(bootstrap.attachProgress().engineCinitProgress?.pc==='30672f8a')return {known:false,reason:'Interrupted original arena release'};return free.call(this,backing);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame.pc).toBe('30672f8a');expect(frame.undecorationTextNodeLive).toBe(true);expect(frame.undecorationLockHeld).toBe(true);expect(frame.undecorationOutput!.backing.freed).toBe(false);const node=frame.undecorationTextNodeWord!.provenance;if(node?.kind!=='engine-allocation')throw new Error('Actual original arena required');expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:node.fields,offset:0},4104).known).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});


it('returns original undecoration with its live output after releasing lock five',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!,output=frame.undecorationOutput!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false,undecorationTextNodeLive:false});expect(frame.typeNameLength).toBe(5);expect(output.backing.freed).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const snapshot=graph.value.snapshot();expect(snapshot.calls.find(call=>call.site==='3067dac6')?.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='3069b307')?.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='3069b2ff')?.returned).toBe(true);expect(frame.typeNameEbp).toBe(frame.entryEsp-48);expect(snapshot.registers.EBP).toMatchObject({changed:false,word:{provenance:null}});expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:frame.entryEsp-64}}});
});


it('preserves the pending original cleanup call when unlocking lock five is unavailable',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),unlock=NativeModuleCrtOwner.prototype.unlock;const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'unlock').mockImplementation(function(this:NativeModuleCrtOwner,id){if(id===5)return {known:false,reason:'Interrupted original undecoration unlock'};return unlock.call(this,id);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame.pc).toBe('3069b307');expect(frame.undecorationLockHeld).toBe(true);expect(frame.undecorationTextNodeLive).toBe(false);expect(frame.undecorationOutput!.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});


it('passes the actual returned output to the original type-name strlen caller',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!,output=frame.undecorationOutput!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});expect(frame.typeNameLength).toBe(5);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const snapshot=graph.value.snapshot();expect(snapshot.calls.find(c=>c.site==='3067dadd')).toMatchObject({returned:true,position:frame.entryEsp-100,returnWord:{provenance:{kind:'source',type:'code',address:'3067dae2'}}});expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:frame.entryEsp-64}}});expect(output.backing.freed).toBe(true);
});


it('executes the original aligned type-name scan with unknown padding and returns length five',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,undecorationLockHeld:false});expect(frame.typeNameLength).toBe(5);expect([...frame.undecorationOutput!.knownMask]).toEqual([255,255,255,255,255,255,0,0]);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const snapshot=graph.value.snapshot();expect(snapshot.calls.find(c=>c.site==='3067dadd')?.returned).toBe(true);expect(snapshot.trace.filter(row=>row.includes('30679b00'))).toHaveLength(2);expect(snapshot.trace.filter(row=>row.includes('30679b47'))).toHaveLength(1);
});


it.each([0,255])('keeps unknown scan padding unconstrained when its stored bits are %i',padding=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),alignment=NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform;const spy=vi.spyOn(NativeRuntimePlatform,'canonicalNativePointerModulo4ForPlatform').mockImplementation((...args)=>{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30679ad4'){f.undecorationOutput!.bytes[6]=padding;f.undecorationOutput!.bytes[7]=padding;}return alignment(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame.pc).toBe('100a7338');expect(frame.typeNameLength).toBe(5);expect([...frame.undecorationOutput!.knownMask.slice(6)]).toEqual([0,0]);
});

it('preserves the original ambiguous DWORD predicate when the terminator is unknown',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),alignment=NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform;const spy=vi.spyOn(NativeRuntimePlatform,'canonicalNativePointerModulo4ForPlatform').mockImplementation((...args)=>{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30679ad4')f.undecorationOutput!.knownMask[5]=0;return alignment(...args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame.pc).toBe('30679b11');expect(frame.undecorationOutput!.backing.freed).toBe(false);expect(frame.undecorationLockHeld).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});


it('locks the original type-name cache and allocates its owned node and text',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);let requestedTextWord:unknown=null;let initialTextMasks:number[]|null=null;let initialNodeMasks:number[]|null=null;const malloc=NativeModuleCrtOwner.prototype.malloc;const probe=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){const r=malloc.call(this,bytes);const f=bootstrap.attachProgress().engineCinitProgress;if(f?.typeNameLockHeld&&r.known&&r.value){if(bytes===6){initialTextMasks=[...r.value.knownMask];requestedTextWord=f.currentEsiWord;}else if(bytes===8)initialNodeMasks=[...r.value.knownMask];}return r;});let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}expect(result.known).toBe(false);if(!result.known)expect(result.reason).toContain('Engine CRT initializer dependency at100a7338');const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,typeNameLockHeld:false,undecorationLockHeld:false});for(const [fields,bytes] of [[frame.typeNameCacheNode!,8],[frame.typeNameCacheText!,6]] as const){expect(fields.bytes.length).toBe(bytes);expect([...fields.knownMask]).toEqual(fields===frame.typeNameCacheNode?[0,0,0,0,255,255,255,255]:Array(bytes).fill(255));expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields,offset:0},bytes).known).toBe(true);}expect(initialTextMasks).toEqual([0,0,0,0,0,0]);expect(initialNodeMasks).toEqual(Array(8).fill(0));expect(frame.typeNameCacheNode).not.toBe(frame.typeNameCacheText);expect(frame.typeNameCopyResult).toBe(0);expect(requestedTextWord).toMatchObject({value:6,mask:0xffffffff});const info=NativeEngineCinitImages.imageForCrt(frame.images,crt,'visualAnimationFloatTypeInfo');if(!info.known)throw new Error(info.reason);expect(info.value.maskedWord(4).knownMask).toBe(0);expect(frame.typeNameCacheTextWord).toMatchObject({provenance:{kind:'engine-allocation',fields:frame.typeNameCacheText,offset:0}});
});


it('preserves original type-name cache locking failure before publication',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),lock=NativeModuleCrtOwner.prototype.lock;const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'lock').mockImplementation(function(this:NativeModuleCrtOwner,id){return id===14?{known:false,reason:'Interrupted original cache lock'}:lock.call(this,id);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame.pc).toBe('3067dafb');expect(frame.typeNameLockHeld).toBe(false);expect(frame.typeNameCacheNode).toBeNull();expect(frame.typeNameCacheText).toBeNull();expect(frame.undecorationOutput!.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it.each(['node','text'] as const)('preserves a NULL %s allocation on the original type-name cache path',which=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),malloc=NativeModuleCrtOwner.prototype.malloc;const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){const f=bootstrap.attachProgress().engineCinitProgress;if(this===crt&&f?.typeNameLockHeld&&bytes===(which==='node'?8:6))return {known:true,value:null};return malloc.call(this,bytes);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame.pc).toBe(which==='node'?'3067db62':'3067db5b');expect(frame.typeNameLockHeld).toBe(true);expect(frame.typeNameCacheText).toBeNull();if(which==='node')expect(frame.typeNameCacheNode).toBeNull();else expect(frame.typeNameCacheNode!.backing.freed).toBe(false);expect(frame.undecorationOutput!.backing.freed).toBe(false);
});


it.each(['alias','extent'] as const)('rejects a substituted cache allocation with wrong %s authority',which=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),malloc=NativeModuleCrtOwner.prototype.malloc;const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){const f=bootstrap.attachProgress().engineCinitProgress;if(this===crt&&f?.typeNameLockHeld){if(which==='alias'&&bytes===8)return {known:true,value:f.undecorationOutput!.backing};if(which==='extent'&&bytes===6)return malloc.call(this,8);}return malloc.call(this,bytes);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame.pc).toBe('30672ec7');expect(frame.typeNameLockHeld).toBe(true);expect(frame.typeNameCacheText).toBeNull();if(which==='alias')expect(frame.typeNameCacheNode).toBeNull();else expect(frame.typeNameCacheNode!.backing.freed).toBe(false);expect(frame.undecorationOutput!.backing.freed).toBe(false);
});

it('copies the actual constructed type name into its published owned cache span',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!,text=frame.typeNameCacheText!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,typeNameLockHeld:false,typeNameLength:5});expect(text.bytes.length).toBe(6);expect(Buffer.from(text.bytes).toString('hex')).toBe('666c6f617400');expect([...text.knownMask]).toEqual([255,255,255,255,255,255]);expect(frame.typeNameCacheTextWord).toMatchObject({provenance:{kind:'engine-allocation',crt,fields:text,offset:0}});expect(frame.typeNameCopyResult).toBe(0);expect([...frame.typeNameCacheNode!.knownMask]).toEqual([0,0,0,0,255,255,255,255]);expect(frame.undecorationOutput!.backing.freed).toBe(true);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:text,offset:0},6).known).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const snapshot=graph.value.snapshot();expect(snapshot.calls.find(call=>call.site==='3067db2d')?.returned).toBe(true);expect(snapshot.trace.filter(row=>row==='3068a888.EngineCinitSource')).toHaveLength(6);expect(snapshot.trace.filter(row=>row==='3068a892.EngineCinitSource')).toHaveLength(5);
});

it('retains the original published cache prefix when its bounded copy is interrupted',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),write=NativeHeapObjectViews.prototype.writeUnsigned;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3068a88a'&&f.typeNameCacheText===this&&offset===2)throw new Error('Interrupted original bounded type-name copy');write.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!,text=frame.typeNameCacheText!;expect(frame.pc).toBe('3068a88a');expect([...text.knownMask]).toEqual([255,255,0,0,0,0]);expect(Buffer.from(text.bytes.slice(0,2)).toString('hex')).toBe('666c');expect(frame.typeNameLockHeld).toBe(true);expect(text.backing.freed).toBe(false);expect(frame.undecorationOutput!.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});


it('stops on an unknown source byte while retaining the actual published cache prefix',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),read=NativeHeapObjectViews.prototype.readUnsigned;const probe=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width=4){if(offset===2&&width===1&&this.bytes.length===8){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3068a888'&&f.undecorationOutput===this)this.knownMask[2]=0;}return read.call(this,offset,width);});let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame.pc).toBe('3068a888');expect([...frame.typeNameCacheText!.knownMask]).toEqual([255,255,0,0,0,0]);expect(frame.typeNameLockHeld).toBe(true);expect(frame.typeNameCacheText!.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});


it('links the actual owned cache node into the original type-name root',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;expect(frame).toMatchObject({pc:'100a7338',operations:4234,typeNameLockHeld:false});expect(frame.typeNameCacheNodeWords![0]).toMatchObject({provenance:{kind:'engine-allocation',crt,fields:frame.typeNameCacheText,offset:0}});expect(frame.typeNameCacheNodeWords![1]).toMatchObject({value:0,mask:0xffffffff});expect(frame.typeNameListRootWords![0]).toMatchObject({value:0,mask:0xffffffff});expect(frame.typeNameListRootWords![1]).toMatchObject({provenance:{kind:'engine-allocation',crt,fields:frame.typeNameCacheNode,offset:0}});expect(frame.undecorationOutput!.backing.freed).toBe(true);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:frame.typeNameCacheText!,offset:0},6).known).toBe(true);
});


describe('original type-name temporary output cleanup',()=>{
 it('releases the temporary output and lock while retaining the published cache',()=>{
  const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
  expect(bootstrap.processAttach().known).toBe(false);
  const frame=bootstrap.attachProgress().engineCinitProgress!;
  expect(frame).toMatchObject({pc:'100a7338',operations:4234,typeNameLockHeld:false,typeNameCopyResult:0});
  expect(frame.undecorationOutput!.backing.freed).toBe(true);
  expect(frame.typeNameCacheNode!.backing.freed).toBe(false);
  expect(frame.typeNameCacheText!.backing.freed).toBe(false);
  expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:frame.undecorationOutput!,offset:0},8).known).toBe(false);
  expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:frame.typeNameCacheText!,offset:0},6).known).toBe(true);
  expect(Buffer.from(frame.typeNameCacheText!.bytes).toString('hex')).toBe('666c6f617400');
  expect(frame.typeNameListRootWords![1]).toMatchObject({provenance:{kind:'engine-allocation',fields:frame.typeNameCacheNode,offset:0}});
  const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
  expect(graph.value.snapshot().calls.find(c=>c.site==='3067db65')?.returned).toBe(true);
  expect(graph.value.snapshot().calls.find(c=>c.site==='3067db85')?.returned).toBe(true);
 });
 it.each(['free','unlock'] as const)('retains the actual interrupted %s boundary',which=>{
  const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
  const free=NativeModuleCrtOwner.prototype.free,unlock=NativeModuleCrtOwner.prototype.unlock;
  const freeSpy=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){const f=bootstrap.attachProgress().engineCinitProgress;if(which==='free'&&f?.undecorationOutput?.backing===backing)return {known:false,reason:'Interrupted original type-name output free'};return free.call(this,backing);});
  const unlockSpy=vi.spyOn(NativeModuleCrtOwner.prototype,'unlock').mockImplementation(function(this:NativeModuleCrtOwner,id){if(which==='unlock'&&id===14)return {known:false,reason:'Interrupted original type-name cache unlock'};return unlock.call(this,id);});
  let result;try{result=bootstrap.processAttach();}finally{freeSpy.mockRestore();unlockSpy.mockRestore();}
  const frame=bootstrap.attachProgress().engineCinitProgress!;
  expect(frame.pc).toBe(which==='free'?'30672f8a':'3067db85');
  expect(frame.typeNameLockHeld).toBe(true);
  expect(frame.undecorationOutput!.backing.freed).toBe(which==='unlock');
  expect(frame.typeNameCacheText!.backing.freed).toBe(false);
  expect(bootstrap.processAttach()).toEqual(result);
 });
});


it('returns the actual cached type-name pointer through the original wrapper',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 expect(bootstrap.processAttach().known).toBe(false);const frame=bootstrap.attachProgress().engineCinitProgress!;
 expect(frame).toMatchObject({pc:'100a7338',operations:4234,typeNameLockHeld:false});
 expect(frame.typeNameUnMangleArguments![1]).toMatchObject({provenance:{kind:'engine-allocation',crt,fields:frame.typeNameCacheText,offset:0}});
 expect(frame.undecorationOutput!.backing.freed).toBe(true);expect(frame.typeNameCacheText!.backing.freed).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 for(const site of ['3067db7a','306713b3','30076673'])expect(graph.value.snapshot().calls.find(c=>c.site===site)?.returned).toBe(true);
});


it('passes the live Engine cache and actual property storage to SharedBase UnMangle',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 expect(bootstrap.processAttach().known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;
 expect(f).toMatchObject({pc:'100a7338',operations:4234,typeNameLockHeld:false});
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'visualAnimationFloatStorage');if(!storage.known)throw new Error(storage.reason);
 expect(f.typeNameUnMangleArguments![0]).toMatchObject({provenance:{kind:'engine-image',crt,fields:storage.value,offset:0}});
 expect(f.typeNameUnMangleArguments![1]).toMatchObject({provenance:{kind:'engine-allocation',crt,fields:f.typeNameCacheText,offset:0}});
 expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.typeNameCacheText!.backing.freed).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.find(c=>c.site==='3007667e')?.returned).toBe(false);
});


it('dispatches original SharedBase UnMangle space search to its character-search tail',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 expect(bootstrap.processAttach().known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;
 expect(f).toMatchObject({pc:'100a7338',operations:4234,typeNameLockHeld:false});
 expect(f.currentEaxWord).toMatchObject({value:0,mask:0xffffffff});
 expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.typeNameCacheText!.backing.freed).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.find(c=>c.site==='1009155b')?.returned).toBe(false);
 expect(graph.value.snapshot().trace.filter(r=>r.endsWith('.SharedBaseUnMangleSource'))).toHaveLength(51);
});


it('executes the first original character-search DWORD and retains the unsupported tail span',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const result=bootstrap.processAttach();expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;
 expect(f).toMatchObject({pc:'100a7338',operations:4234,typeNameLockHeld:false});
 expect(f.currentEaxWord).toMatchObject({value:0,mask:0xffffffff});
 expect(f.typeNameCacheText!.bytes.length).toBe(6);expect(f.typeNameCacheText!.backing.freed).toBe(false);
 expect([...f.typeNameCacheText!.knownMask]).toEqual(Array(6).fill(255));
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().trace.filter(r=>r==='100a7338.SharedBaseUnMangleSource')).toHaveLength(1);
 expect(graph.value.snapshot().calls.find(c=>c.site==='1009155b')?.returned).toBe(false);
 expect(bootstrap.processAttach()).toEqual(result);
});


it('retains the six-byte cache request over selected Engine physical capacity',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 expect(bootstrap.processAttach().known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;
 expect(f.pc).toBe('10002aae');expect(f.typeNameCacheText!.bytes.length).toBe(6);
 const proof=NativeRuntimePlatform.canonicalEngineHeapAllocationViewsForPlatform(platform,crt,f.typeNameCacheText!.backing);if(!proof.known)throw new Error(proof.reason);
 expect(proof.value.logical).toBe(f.typeNameCacheText);expect(proof.value.requestedBytes).toBe(6);expect(proof.value.physicalCapacity).toBe(8);
 expect([...proof.value.physical.knownMask]).toEqual([255,255,255,255,255,255,0,0]);
 expect(f.typeNameCacheTextWord).toMatchObject({provenance:{kind:'engine-allocation',fields:proof.value.logical,offset:0}});
});


it.each([0,255])('returns the original space search with unknown physical padding bits %s',padding=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 const read=NativeHeapObjectViews.prototype.maskedWord;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===8&&offset===4&&width===4&&this.bytes[0]===0x66&&this.bytes[4]===0x74){this.bytes[6]=padding;this.bytes[7]=padding;}return read.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f).toMatchObject({pc:'10002aae',operations:4298,typeNameLockHeld:false});
 const aliases=NativeRuntimePlatform.canonicalEngineHeapAllocationViewsForPlatform(platform,crt,f.typeNameCacheText!.backing);if(!aliases.known)throw new Error(aliases.reason);
 expect([...aliases.value.physical.knownMask]).toEqual([255,255,255,255,255,255,0,0]);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.find(c=>c.site==='1009155b')?.returned).toBe(true);
 expect(graph.value.snapshot().calls.find(c=>c.site==='10091583')?.returned).toBe(false);
});


it('scans the original live cache in CString construction and passes length five to allocation',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 expect(bootstrap.processAttach().known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f).toMatchObject({pc:'10002aae',operations:4298,typeNameLockHeld:false});
 expect(f.currentEaxWord).toMatchObject({value:14,mask:0xffffffff});expect(f.typeNameCacheText!.backing.freed).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().trace.filter(r=>r==='10013610.SharedBaseUnMangleSource')).toHaveLength(6);
 expect(graph.value.snapshot().calls.find(c=>c.site==='10013623')?.returned).toBe(false);
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'visualAnimationFloatStorage');if(!storage.known)throw new Error(storage.reason);expect(storage.value.maskedWord(0).value).toBe(0);
});


it('binds the original CString allocation call to the retained MemoryAdmin',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 const owner=createNativeRuntimeAdminOwner(platform);let arenaObservation:{bytes:Uint8Array;masks:Uint8Array}|null=null;const free=NativeModuleCrtOwner.prototype.free;const release=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){if(backing?.bytes.length===4104&&bootstrap.attachProgress().engineCinitProgress!.operations>=7695)arenaObservation={bytes:backing.bytes.slice(),masks:backing.knownMask.slice()};return free.call(this,backing);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{release.mockRestore();}const observed=()=>{if(!arenaObservation)throw new Error('Actual pre-release arena observations required');return arenaObservation;};const observedMasked=(offset:number,width=4)=>{const o=observed(),v=new DataView(o.bytes.buffer,o.bytes.byteOffset,o.bytes.length);let knownMask=0;for(let i=0;i<width;i++)knownMask|=o.masks[offset+i]!<<(8*i);return {value:width===1?v.getUint8(offset):width===2?v.getUint16(offset,true):v.getUint32(offset,true),knownMask:knownMask>>>0};};const observedUnsigned=(offset:number,width=4)=>{const w=observedMasked(offset,width),mask=width===4?0xffffffff:2**(width*8)-1;if(w.knownMask!==mask)throw new Error('Unknown pre-release arena observation');return w.value;};const f=bootstrap.attachProgress().engineCinitProgress!;
 expect({pc:f.pc,operations:f.operations}).toEqual({pc:'10003cd8',operations:8136});expect(f.exitTableThird?.provenance).toMatchObject({kind:'source',type:'code',address:'30011a40'});expect(f.onexitLockHeld).toBe(false);expect(f.typeNameMemoryAdmin).toBe(owner.memory);
 const pointer=f.visualAnimationFloatRootWord?.provenance;if(pointer?.kind!=='engine-image')throw new Error('Expected published property destination');expect(pointer.offset).toBe(0);expect(f.cppCursor?.provenance).toMatchObject({kind:'engine-image',offset:0x108});expect(f.typeNameCStringCopyReturned).toBe(true);expect([...f.typeNameCString!.bytes.subarray(8,14)]).toEqual([102,108,111,97,116,0]);expect(f.typeNameCString!.backing).toMatchObject({requestedBytes:14,capacity:16,freed:false});expect(f.typeNameCString!.readUnsigned(0)).toBe(5);expect(f.typeNameCString!.readUnsigned(4,2)).toBe(1);expect(f.typeNameCString!.readUnsigned(13,1)).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.find(c=>c.site==='10013257')?.returned).toBe(true);
 expect(graph.value.snapshot().calls.find(c=>c.site==='1001325e')?.returned).toBe(true);
 expect(platform.snapshot().pending.filter(c=>c.address==='100e2710')).toHaveLength(1);
 const secondFlags=NativeEngineCinitImages.imageForCrt(f.images,crt,'visualAnimationSecondFlags');if(!secondFlags.known)throw new Error(secondFlags.reason);expect(secondFlags.value.readUnsigned(0)).toBe(3);expect(graph.value.snapshot().calls.find(c=>c.site==='30076593')?.returned).toBe(true);
 const info=NativeEngineCinitImages.imageForCrt(f.images,crt,'visualAnimationSecondTypeInfo');if(!info.known)throw new Error(info.reason);const argument=f.typeNameArguments![1]!.provenance;if(argument?.kind!=='engine-image')throw new Error('Actual bCString name pointer required');expect(argument.fields).toBe(info.value);expect(argument.offset).toBe(9);expect(f.typeNameArguments![3]!.provenance).toMatchObject({kind:'source',type:'code',address:'30672ec7'});expect(f.typeNameArguments![4]!.provenance).toMatchObject({kind:'source',type:'code',address:'30672f8a'});expect(f.typeNameArguments![5]!.value).toBe(0x2800);
 const arenaCall=graph.value.snapshot().calls.filter(c=>c.site==='3069707d').at(-1);if(!arenaCall)throw new Error('Actual arena call required');expect(arenaCall.returned).toBe(true);const flags=f.stack.maskedWord(f.undecorationEbp!-100);expect(flags.value&15).toBe(3);expect(flags.knownMask&15).toBe(15);expect(f.undecorationLockHeld).toBe(false);const allocatorCall=graph.value.snapshot().calls.filter(c=>c.site==='30696c06').at(-1);if(!allocatorCall)throw new Error('Actual allocator callback required');expect(allocatorCall.returned).toBe(true);const node=f.undecorationFieldWords![0]!.provenance;if(node?.kind!=='engine-allocation')throw new Error('Actual retained field node required');expect(node.offset).toBe(4084);expect(observedUnsigned(node.offset+4)).toBe(0);expect(observedUnsigned(node.offset+8)).toBe(3);expect(observedUnsigned(node.offset+12)).toBe(0);expect(node.fields.backing.freed).toBe(true);expect(()=>node.fields.readUnsigned(node.offset+8)).toThrow('freed');for(const [index,offset,kind] of [[0,4084,3],[1,4068,1],[2,4052,3],[3,4036,1]]){const current=f.undecorationFieldWords![index!]!.provenance;if(current?.kind!=='engine-allocation')throw new Error('Actual parser field node required');expect(current.fields).toBe(node.fields);expect(current.offset).toBe(offset);expect(observedUnsigned(current.offset+8)).toBe(kind);}expect(f.undecorationGlobalWords![4]!.value).toBe(3952);const config=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!config.known)throw new Error(config.reason);const call=graph.value.snapshot().calls.filter(c=>c.site==='3069b8fe').at(-1);if(!call)throw new Error('Original decorated-type caller required');expect(call.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697b1e').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697b25').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697b32').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069acda').at(-1)?.returned).toBe(true);expect(f.currentEaxWord.provenance).toMatchObject({kind:'arena-memory-admin',owner:f.typeNameMemoryAdmin});expect(f.typeNameLockHeld).toBe(false);expect(f.currentEsiWord).toMatchObject({value:8,mask:0xffffffff});expect(graph.value.snapshot().calls.filter(c=>c.site==='1009155b').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='10091571').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='10013257').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='1001325e').at(-1)?.returned).toBe(false);expect(f.typeNameCacheNode!.bytes).toHaveLength(8);expect(f.typeNameCacheText!.bytes).toHaveLength(15);expect([...f.typeNameCacheText!.knownMask]).toEqual(Array(15).fill(255));expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('class bCString\0');expect(f.typeNameCopyResult).toBe(0);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db2d').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db65').at(-1)?.returned).toBe(true);expect(f.typeNameLength).toBe(14);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067dadd').at(-1)?.returned).toBe(true);const cleanupCall=graph.value.snapshot().calls.filter(c=>c.site==='3069661c').at(-1);if(!cleanupCall)throw new Error('Actual arena free caller required');expect(cleanupCall).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3069661f'}}});expect(f.stack.maskedWord(cleanupCall.position+4).knownMask).toBe(0);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b528').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b8a3').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069a31c').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b03f').at(-1)?.returned).toBe(true);const cachePointer=f.undecorationParserWords![1]!.provenance;if(cachePointer?.kind!=='stack')throw new Error('Actual retained stack cache required');expect(graph.value.snapshot().calls.filter(c=>c.site==='306972e2').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306970ce').at(-1)?.returned).toBe(true);expect(observedUnsigned(4024)).toBe(0);expect(observedMasked(4020).knownMask).toBe(0);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069765e').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069739f').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306973b2').at(-1)?.returned).toBe(true);expect([...observed().bytes.subarray(4012,4018)]).toEqual([99,108,97,115,115,32]);expect([...observed().masks.subarray(4012,4018)]).toEqual([255,255,255,255,255,255]);expect(observedUnsigned(4032)).toBe(6);expect(graph.value.snapshot().calls.filter(c=>c.site==='30699683').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069969a').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306996a3').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069950f').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306996b0').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069794e').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306996bc').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697910').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069792c').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069793f').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697357').at(-1)?.returned).toBe(true);expect(observedMasked(3968).knownMask).toBe(0);expect(observedMasked(3956).knownMask).toBe(0);expect(observedMasked(3960).knownMask&0xfff).toBe(0xfff);expect(graph.value.snapshot().calls.filter(c=>c.site==='30699505').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306994e3').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306994a4').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069778c').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306994ad').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306994c9').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306972f3').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697302').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306994d5').at(-1)?.returned).toBe(true);expect(f.undecorationCopiedTypeWords![0]!.provenance).toMatchObject({kind:'engine-allocation',fields:node.fields,offset:3964});expect(f.undecorationCopiedTypeWords![1]!.mask&15).toBe(15);expect(f.undecorationCopiedTypeWords![1]!.value&15).toBe(0);expect(f.undecorationParserWords![6]).toMatchObject({value:15,mask:0xffffffff});expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0a2').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0b4').at(-1)?.returned).toBe(true);expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.undecorationOutput!.bytes).toHaveLength(16);expect([...f.undecorationOutput!.bytes.subarray(0,14)]).toEqual([99,108,97,115,115,32,98,67,83,116,114,105,110,103]);expect([...f.undecorationOutput!.knownMask]).toEqual([...Array(15).fill(255),0]);expect(()=>f.undecorationOutput!.readUnsigned(14,1)).toThrow();expect(f.undecorationOutput!.bytes[14]).toBe(0);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce').at(-1)?.returned).toBe(true);expect(f.undecorationOutputWriterArguments![0]!.provenance).toMatchObject({kind:'engine-allocation',fields:f.undecorationOutput,offset:0});expect(f.undecorationOutputWriterArguments![1]).toMatchObject({value:15,mask:0xffffffff});expect(f.stack.readUnsigned(cachePointer.offset)).toBe(0);expect(f.stack.maskedWord(cachePointer.offset+4).knownMask).toBe(0);expect(observedMasked(3980).knownMask).toBe(0);expect(observedMasked(3984).knownMask&15).toBe(15);const cursorWord=f.undecorationParserWords![3]!.provenance;expect(cursorWord).toMatchObject({kind:'engine-image',offset:22});expect(info.value.readUnsigned(20,1)).toBe(64);expect([...observed().bytes.subarray(3988,3996)]).toEqual([98,67,83,116,114,105,110,103]);expect([...observed().masks.subarray(3988,3996)]).toEqual(Array(8).fill(255));expect(observedUnsigned(4008)).toBe(8);expect(info.value.readUnsigned(11,1)).toBe(86);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b770').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b532').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b53a').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b90a').at(-1)?.returned).toBe(true);
});

it('retains the delimited-name caller when an original identifier character is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const read=NativeHeapObjectViews.prototype.readUnsigned;let reads=0;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes[8]===46&&this.bytes[9]===63&&offset===15&&width===1&&++reads===3)this.knownMask[15]=0;return read.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30697736');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameCStringCopyReturned).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='306994a4').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069778c').at(-1)).toBeUndefined();
});

it('retains an unknown original decorated-type qualifier without inventing a byte',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const read=NativeHeapObjectViews.prototype.readUnsigned;let qualifierReads=0;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes[8]===46&&this.bytes[9]===63&&offset===10&&width===1&&++qualifierReads===2)this.knownMask[10]=0;return read.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3069aadf');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameCStringCopyReturned).toBe(true);expect(f.cppCursor?.provenance).toMatchObject({kind:'engine-image',offset:0x108});
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b8fe').at(-1)?.returned).toBe(false);
});

it.each(['missing','ambiguous'] as const)('retains the real MemoryAdmin caller with an %s owner',mode=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 if(mode==='ambiguous'){createNativeRuntimeAdminOwner(platform);createNativeRuntimeAdminOwner(platform);}
 const result=bootstrap.processAttach();expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;
 expect(f).toMatchObject({pc:'10002aae',operations:4298,typeNameMemoryAdmin:null});expect(f.currentEaxWord).toMatchObject({value:14,mask:0xffffffff});
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.find(c=>c.site==='10013257')?.returned).toBe(false);
 expect(graph.value.snapshot().calls.some(c=>c.site==='1001325e')).toBe(false);
 expect(platform.snapshot().pending.filter(c=>c.address==='100e2710')).toHaveLength(0);
 expect(bootstrap.processAttach()).toEqual(result);
});

it('retains MemoryAdmin getter failure before allocation and forbids replay',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const original=platform.registerShutdown.bind(platform);let calls=0;
 const spy=vi.spyOn(platform,'registerShutdown').mockImplementation((...args)=>{if(args[0]==='100e2710'){calls++;return {known:false,reason:'memory shutdown unavailable'};}return original(...args);});
 let result:ReturnType<typeof bootstrap.processAttach>;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result!.known).toBe(false);if(result!.known)throw new Error('Unfinished allocation returned');expect(result!.reason).toContain('memory shutdown unavailable');
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f).toMatchObject({pc:'10002aae',operations:4298,typeNameMemoryAdmin:null});
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='10013257')?.returned).toBe(false);
 expect(bootstrap.processAttach()).toEqual(result!);expect(calls).toBe(1);
});

it('retains the original allocation call on a NULL MemoryAdmin result',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const spy=vi.spyOn(NativeMemoryAdmin.prototype,'malloc').mockReturnValue({known:true,value:null});let result:ReturnType<typeof bootstrap.processAttach>;
 try{result=bootstrap.processAttach();expect(spy).toHaveBeenCalledWith(14);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect({pc:f.pc,operations:f.operations,cstring:f.typeNameCString}).toEqual({pc:'10003cd8',operations:4300,cstring:null});
 expect(result!.known).toBe(false);if(result!.known)throw new Error('NULL allocation returned');expect(result!.reason).toContain('NULL allocation dereference');expect(bootstrap.processAttach()).toEqual(result!);
});

it('retains the published CString header if its original terminator store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const write=NativeHeapObjectViews.prototype.writeUnsigned;let attempts=0;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this.bytes.length===16&&offset===13&&width===1){attempts++;throw new Error('CString terminator interrupted');}return write.call(this,offset,value,width);});
 let result:ReturnType<typeof bootstrap.processAttach>;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect({pc:f.pc,operations:f.operations}).toEqual({pc:'10013271',operations:4305});expect(f.typeNameCString!.readUnsigned(0)).toBe(5);expect(f.typeNameCString!.readUnsigned(4,2)).toBe(1);
 expect(result!.known).toBe(false);if(result!.known)throw new Error('Interrupted terminator returned');expect(result!.reason).toContain('CString terminator interrupted');expect(bootstrap.processAttach()).toEqual(result!);expect(attempts).toBe(1);
});

it('retains the first copied CString DWORD when the final character store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const masked=NativeHeapObjectViews.prototype.maskedWord;let attempts=0;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===16&&offset===12&&width===1){attempts++;throw new Error('CString final copy interrupted');}return masked.call(this,offset,width);});
 let result:ReturnType<typeof bootstrap.processAttach>;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect({pc:f.pc,operations:f.operations,returned:f.typeNameCStringCopyReturned}).toEqual({pc:'100a7a00',operations:4313,returned:false});
 expect([...f.typeNameCString!.bytes.subarray(8,14)]).toEqual([102,108,111,97,0,0]);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='1001362d')?.returned).toBe(false);
 expect(result!.known).toBe(false);if(result!.known)throw new Error('Interrupted copy returned');expect(result!.reason).toContain('CString final copy interrupted');expect(bootstrap.processAttach()).toEqual(result!);expect(attempts).toBe(1);
});

it('copies an unknown final source byte without claiming known CString text',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const masked=NativeHeapObjectViews.prototype.maskedWord;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===6&&offset===4&&width===1)this.knownMask[4]=0;return masked.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect({pc:f.pc,operations:f.operations,returned:f.typeNameCStringCopyReturned}).toEqual({pc:'10003cd8',operations:8136,returned:true});
 expect([...f.typeNameCString!.knownMask.subarray(8,14)]).toEqual([255,255,255,255,0,255]);expect(()=>f.typeNameCString!.readUnsigned(12,1)).toThrow('unowned backing bits');
});

it('retains the completed CString when property shutdown lock acquisition fails',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const lock=NativeCrtBootstrap.engineCinitExitLockForCrt;let locks=0;
 const spy=vi.spyOn(NativeCrtBootstrap,'engineCinitExitLockForCrt').mockImplementation((...args)=>{if(args[3]==='lock'&&++locks===3)return {known:false,reason:'property shutdown lock unavailable'};return lock(...args);});
 let result:ReturnType<typeof bootstrap.processAttach>;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067cfea');expect(f.typeNameCStringCopyReturned).toBe(true);expect(f.onexitLockHeld).toBe(false);expect(f.exitTableThird?.value).toBe(0);
 expect([...f.typeNameCString!.bytes.subarray(8,14)]).toEqual([102,108,111,97,116,0]);
 expect(result!.known).toBe(false);if(result!.known)throw new Error('Interrupted registration returned');expect(result!.reason).toContain('property shutdown lock unavailable');expect(bootstrap.processAttach()).toEqual(result!);expect(locks).toBe(3);
});

it('retains the first completed initializer when the second property guard is unknown',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const images=NativeEngineCinitImages.forCrt(crt);if(!images.known)throw new Error(images.reason);const flags=NativeEngineCinitImages.imageForCrt(images.value,crt,'visualAnimationSecondFlags');if(!flags.known)throw new Error(flags.reason);flags.value.knownMask[0]=0;
 const result=bootstrap.processAttach(),f=bootstrap.attachProgress().engineCinitProgress!;expect({pc:f.pc,operations:f.operations}).toEqual({pc:'30076567',operations:4448});expect(f.typeNameCStringCopyReturned).toBe(true);expect(f.exitTableThird?.provenance).toMatchObject({kind:'source',type:'code',address:'30011a40'});expect(flags.value.knownMask[0]).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='307322b0')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(c=>c.site==='307322c0')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the second type-name frame at an unknown bCString cache comparison',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const images=NativeEngineCinitImages.forCrt(crt);if(!images.known)throw new Error(images.reason);const info=NativeEngineCinitImages.imageForCrt(images.value,crt,'visualAnimationSecondTypeInfo');if(!info.known)throw new Error(info.reason);info.value.knownMask[4]=0;
 const result=bootstrap.processAttach(),f=bootstrap.attachProgress().engineCinitProgress!;expect({pc:f.pc,operations:f.operations}).toEqual({pc:'3067daa8',operations:4489});expect(f.typeNamePrologReturned).toBe(true);expect(f.typeNameCStringCopyReturned).toBe(true);expect(info.value.knownMask[4]).toBe(0);
 expect(f.exitTableThird?.provenance).toMatchObject({kind:'source',type:'code',address:'30011a40'});expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the second decoder EH4 frame when its existing lock cannot be acquired',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const lock=NativeCrtBootstrap.engineCinitUndecorationLockForCrt;let locks=0;
 const spy=vi.spyOn(NativeCrtBootstrap,'engineCinitUndecorationLockForCrt').mockImplementation((...args)=>{if(args[3]==='lock'&&++locks===2)return {known:false,reason:'second undecoration lock unavailable'};return lock(...args);});
 let result:ReturnType<typeof bootstrap.processAttach>;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect({pc:f.pc,operations:f.operations,held:f.undecorationLockHeld}).toEqual({pc:'3069b295',operations:4533,held:false});expect(f.undecorationPrologReturned).toBe(true);expect(f.typeNameCStringCopyReturned).toBe(true);expect(f.exitTableThird?.provenance).toMatchObject({kind:'source',type:'code',address:'30011a40'});
 expect(result!.known).toBe(false);if(result!.known)throw new Error('Unfinished decoder returned');expect(result!.reason).toContain('second undecoration lock unavailable');expect(bootstrap.processAttach()).toEqual(result!);expect(locks).toBe(2);
});


it('retains the original name-cache caller when its allocated value copy is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const masked=NativeHeapObjectViews.prototype.maskedWord;let attempts=0;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===4104&&offset===3984&&(width===undefined||width===4)){attempts++;throw new Error('Original cache-value copy interrupted');}return masked.call(this,offset,width);});
 let result:ReturnType<typeof bootstrap.processAttach>;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result!.known).toBe(false);if(result!.known)throw new Error('Interrupted cache copy returned');expect(result!.reason).toContain('Original cache-value copy interrupted');expect(attempts).toBe(1);
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30696ca2');expect(f.undecorationLockHeld).toBe(true);expect(f.undecorationGlobalWords![4]!.value).toBe(3976);
 const reference=f.undecorationParserWords![1]!.provenance;if(reference?.kind!=='stack')throw new Error('Actual stack name-reference cache required');expect(f.stack.readUnsigned(reference.offset)).toBe(0xffffffff);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697302').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='306994c9').at(-1)?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result!);
});


it('retains both real list allocations when its constructor store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const masked=NativeHeapObjectViews.prototype.maskedWord;let attempts=0;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===4104&&offset===3968&&(width===undefined||width===4)){attempts++;throw new Error('Original list constructor store interrupted');}return masked.call(this,offset,width);});
 let result:ReturnType<typeof bootstrap.processAttach>;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result!.known).toBe(false);if(result!.known)throw new Error('Interrupted list constructor returned');expect(result!.reason).toContain('Original list constructor store interrupted');expect(attempts).toBe(1);
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30696ecf');expect(f.undecorationLockHeld).toBe(true);expect(f.undecorationGlobalWords![4]!.value).toBe(3952);const list=f.currentEaxWord.provenance;if(list?.kind!=='engine-allocation')throw new Error('Actual retained list node required');expect(list.offset).toBe(3964);expect(list.fields.backing.freed).toBe(false);expect(list.fields.maskedWord(3968).knownMask).toBe(0);expect(list.fields.maskedWord(3960).knownMask&0xfff).toBe(0xfff);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697357').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069793f').at(-1)?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result!);
});


it('retains the published class list when its name-link store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const masked=NativeHeapObjectViews.prototype.maskedWord;let attempts=0;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===4104&&offset===3968&&(width===undefined||width===4)&&this.knownMask[3968]===255){attempts++;throw new Error('Original name-link store interrupted');}return masked.call(this,offset,width);});
 let result:ReturnType<typeof bootstrap.processAttach>;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result!.known).toBe(false);if(result!.known)throw new Error('Interrupted list append returned');expect(result!.reason).toContain('Original name-link store interrupted');expect(attempts).toBe(1);
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30696e86');expect(f.undecorationLockHeld).toBe(true);expect(f.undecorationGlobalWords![4]!.value).toBe(3952);const list=f.currentEaxWord.provenance;if(list?.kind!=='engine-allocation')throw new Error('Actual published class list required');expect(list.offset).toBe(3964);expect(list.fields.readUnsigned(3968)).toBe(0);expect(list.fields.backing.freed).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069793f').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069794e').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='306996b0').at(-1)?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result!);
});


it('retains the original virtual caller when the class prefix length changes outside its store',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const image=NativeEngineCinitImages.imageForCrt;
 const spy=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((...args)=>{const f=args[2]==='undecorationTextVtableEntry'?bootstrap.attachProgress().engineCinitProgress:null;if(f&&f.operations>7085){const p=f.undecorationFieldWords![0]!.provenance;if(p?.kind==='engine-allocation')p.fields.knownMask.fill(0,4032,4036);}return image(...args);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30696ec5');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameCStringCopyReturned).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697129').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0a2').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0b4'&&!c.returned)).toHaveLength(0);
});


it('retains the original class prefix copy when a live source byte is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const read=NativeHeapObjectViews.prototype.readUnsigned;let hits=0;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===4104&&offset===4015&&width===1&&++hits===2)this.knownMask[4015]=0;return read.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30696f47');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameCStringCopyReturned).toBe(true);expect([...f.undecorationOutput!.bytes.subarray(0,3)]).toEqual([99,108,97]);expect([...f.undecorationOutput!.knownMask]).toEqual([...Array(3).fill(255),...Array(13).fill(0)]);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697402').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='306971d4').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce').at(-1)?.returned).toBe(false);
});


it.each(['repeated','unknown'] as const)('retains original class-name space handling for %s output',kind=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const write=NativeHeapObjectViews.prototype.writeUnsigned;let changed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){write.call(this,offset,value,width);if(!changed&&this.bytes.length===16&&offset===14&&width===1&&value===0&&this.bytes[5]===32&&this.bytes[6]===98){changed=true;if(kind==='repeated'){this.bytes.set([99,108,97,115,115,32,32,98,67,83,116,114,105,110,103,0]);this.knownMask.fill(255);}else this.knownMask[6]=0;}});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe(kind==='repeated'?'10003cd8':'3069b0e8');expect(f.undecorationLockHeld).toBe(kind==='unknown');const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce').at(-1)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b2de').at(-1)?.returned).toBe(kind==='repeated');if(kind==='repeated'){expect(f.operations).toBe(8139);expect(Buffer.from(f.undecorationOutput!.bytes.subarray(0,15)).toString()).toBe('class bCString\0');}else expect(f.undecorationOutput!.knownMask[6]).toBe(0);
});


it('retains the original second arena free call when its release fails',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const free=NativeModuleCrtOwner.prototype.free;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){if(backing?.bytes.length===4104&&bootstrap.attachProgress().engineCinitProgress!.operations>=7695)throw new Error('Interrupted original second arena release');return free.call(this,backing);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672f8a');expect(f.undecorationLockHeld).toBe(true);expect(f.undecorationOutput!.backing.freed).toBe(false);expect([...f.undecorationOutput!.knownMask]).toEqual([...Array(15).fill(255),0]);const arena=f.undecorationFieldWords![0]!.provenance;if(arena?.kind!=='engine-allocation')throw new Error('Actual retained second arena required');expect(arena.fields.backing.freed).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069661c').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b2eb').at(-1)?.returned).toBe(false);
});


it.each([0,255,'unknown','fourth'] as const)('retains the original class-name DWORD scan with %s padding evidence',kind=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const alignment=NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform;let changed=false;
 const spy=vi.spyOn(NativeRuntimePlatform,'canonicalNativePointerModulo4ForPlatform').mockImplementation((...args)=>{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30679ad4'&&f.undecorationOutput?.bytes.length===16){changed=true;if(kind==='unknown')f.undecorationOutput.knownMask[14]=0;else if(kind==='fourth'){f.undecorationOutput.bytes[14]=88;f.undecorationOutput.bytes[15]=0;f.undecorationOutput.knownMask[15]=255;}else f.undecorationOutput.bytes[15]=kind;}return alignment(...args);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe(kind==='unknown'?'30679b11':'10003cd8');expect(f.undecorationOutput!.knownMask[15]).toBe(kind==='fourth'?255:0);expect(f.undecorationOutput!.backing.freed).toBe(kind!=='unknown');expect(f.undecorationLockHeld).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067dadd').at(-1)?.returned).toBe(kind!=='unknown');if(kind!=='unknown')expect(f.typeNameLength).toBe(kind==='fourth'?15:14);
});


it('retains the original second type-name cache allocation when malloc fails',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const malloc=NativeModuleCrtOwner.prototype.malloc;let interrupted=false;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){if(bytes===8&&bootstrap.attachProgress().engineCinitProgress!.operations>7774){interrupted=true;throw new Error('Interrupted original second type-name cache allocation');}return malloc.call(this,bytes);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672ec7');expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationLockHeld).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(false);const arena=f.undecorationFieldWords![0]!.provenance;if(arena?.kind!=='engine-allocation')throw new Error('Actual released second arena required');expect(arena.fields.backing.freed).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db0b').at(-1)?.returned).toBe(false);
});


it('retains original partial type-name cache text when its source byte is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===16&&offset===8&&width===1){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3068a888'&&f.undecorationOutput===this){this.knownMask[8]=0;changed=true;}}return read.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3068a888');expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameCopyResult).toBeNull();expect([...f.typeNameCacheText!.bytes.subarray(0,8)]).toEqual([99,108,97,115,115,32,98,67]);expect([...f.typeNameCacheText!.knownMask]).toEqual([...Array(8).fill(255),...Array(7).fill(0)]);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db2d').at(-1)?.returned).toBe(false);
});

it('retains the original second temporary-output free call when release fails',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const free=NativeModuleCrtOwner.prototype.free;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){if(backing?.bytes.length===16&&bootstrap.attachProgress().engineCinitProgress?.operations===7959)throw new Error('Interrupted original temporary output release');return free.call(this,backing);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672f8a');expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationLockHeld).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('class bCString\0');expect(f.typeNameCopyResult).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db65').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076593').at(-1)?.returned).toBe(false);
});

it('retains the original second class-name search when a cache DWORD byte is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform);const masked=NativeHeapObjectViews.prototype.maskedWord;let changed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&this.bytes.length===15&&this.bytes[0]===99&&this.bytes[5]===32&&offset===4){changed=true;this.knownMask[6]=0;}return masked.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(changed).toBe(true);expect(f.pc).toBe('100a7343');expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.typeNameCacheText!.knownMask[6]).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='1009155b').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='10091571').at(-1)).toBeUndefined();
});

it('completes the original matrix property through the shared class continuation',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 let completed:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;
 const image=NativeEngineCinitImages.imageForCrt;
 const capture=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((...args)=>{
  if(args[2]==='vectorPropertyFlags'&&!completed){const p=bootstrap.attachProgress().engineCinitProgress;if(p?.pc==='3003f1a7')completed=p;}
  return image(...args);
 });
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{capture.mockRestore();}
 const f=completed as ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress'];if(!f)throw new Error('Actual completed matrix snapshot required');
 expect(f.pc).toBe('3003f1a7');expect(f.typeNameSeventhCStringCopyReturned).toBe(true);
 const text=f.typeNameSeventhCString!;expect(text.backing).toMatchObject({requestedBytes:17,capacity:20,freed:false});expect(text.readUnsigned(0)).toBe(8);expect(text.readUnsigned(4,2)).toBe(1);expect(Buffer.from(text.bytes.subarray(8,17)).toString()).toBe('bCMatrix\0');expect([...text.knownMask.subarray(8,17)]).toEqual(Array(9).fill(255));
 expect(Buffer.from(f.typeNameSixthCString!.bytes.subarray(8)).toString()).toBe('bCObsoleteClass\0');expect(f.typeNameSixthCString!.backing.freed).toBe(false);expect(text).not.toBe(f.typeNameSecondCString);
 expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.onexitLockHeld).toBe(false);expect(f.exitTableNinth!.provenance).toMatchObject({kind:'source',type:'code',address:'3000be1f'});expect(f.exitCursor!.provenance).toMatchObject({offset:36});expect(f.cppCursor!.provenance).toMatchObject({offset:0x120});
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'matrixPropertyStorage');if(!storage.known)throw new Error(storage.reason);const root=f.matrixPropertyRootWord!.provenance;if(root?.kind!=='engine-image')throw new Error('Actual matrix root required');expect(root.fields).toBe(storage.value);expect(root.offset).toBe(0);
 const flags=NativeEngineCinitImages.imageForCrt(f.images,crt,'matrixPropertyFlags');if(!flags.known)throw new Error(flags.reason);expect(flags.value.readUnsigned(0)).toBe(3);expect(storage.value.readUnsigned(4)).toBe(0);
 expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.undecorationOutput!.bytes.length).toBe(16);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('class bCMatrix\0');
 for(const retained of [f.typeNameCString,f.typeNameSecondCString,f.typeNameThirdCString,f.typeNameFourthCString,f.typeNameFifthCString,f.typeNameSixthCString,text])expect(retained!.backing.freed).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30732310','30076853','3007685e','30076869'])expect(graph.value.snapshot().calls.find(c=>c.site===site)).toMatchObject({returned:true});
});

it('completes the original obsolete-class property through the shared class continuation',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 let completed:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;const image=NativeEngineCinitImages.imageForCrt;const capture=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((...args)=>{if(args[2]==='matrixPropertyFlags'&&!completed){const p=bootstrap.attachProgress().engineCinitProgress;if(p?.pc==='30015fbe')completed=p;}return image(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{capture.mockRestore();}const f=completed as ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress'];if(!f)throw new Error('Actual completed obsolete-class snapshot required');
 expect(f.pc).toBe('30015fbe');expect(f.typeNameSixthCStringCopyReturned).toBe(true);
 const text=f.typeNameSixthCString!;expect(text.backing).toMatchObject({requestedBytes:24,capacity:24,freed:false});expect(text.readUnsigned(0)).toBe(15);expect(text.readUnsigned(4,2)).toBe(1);expect(Buffer.from(text.bytes.subarray(8)).toString()).toBe('bCObsoleteClass\0');expect([...text.knownMask]).toEqual(Array(24).fill(255));
 expect(Buffer.from(f.typeNameFifthCString!.bytes.subarray(8)).toString()).toBe('bCObjectRefBase\0');expect(f.typeNameFifthCString!.backing.freed).toBe(false);expect(text).not.toBe(f.typeNameFifthCString);
 expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.onexitLockHeld).toBe(false);expect(f.exitTableEighth!.provenance).toMatchObject({kind:'source',type:'code',address:'30018c5a'});expect(f.exitCursor!.provenance).toMatchObject({offset:32});expect(f.cppCursor!.provenance).toMatchObject({offset:0x11c});
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'obsoleteClassStorage');if(!storage.known)throw new Error(storage.reason);const root=f.obsoleteClassRootWord!.provenance;if(root?.kind!=='engine-image')throw new Error('Actual obsolete-class root required');expect(root.fields).toBe(storage.value);expect(root.offset).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30732300','300767e3','300767ee','300767f9'])expect(graph.value.snapshot().calls.find(c=>c.site===site)).toMatchObject({returned:true});
});

it.each(['ensure','lock'] as const)('keeps the obsolete-class undecoration %s call pending when unavailable',operation=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const original=NativeCrtBootstrap.engineCinitUndecorationLockForCrt;let interrupted=false;
 const spy=vi.spyOn(NativeCrtBootstrap,'engineCinitUndecorationLockForCrt').mockImplementation((...args)=>{
  if(args[0]===bootstrap&&args[1]===crt&&args[3]===operation&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>18329){interrupted=true;return {known:false,reason:'Interrupted obsolete-class undecoration lock'};}
  return original(...args);
 });
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe(operation==='ensure'?'3069b289':'3069b295');expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameFifthCStringCopyReturned).toBe(true);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='3067dac6').at(-1)?.returned).toBe(false);
 expect(graph.value.snapshot().calls.filter(c=>c.site===(operation==='ensure'?'3069b289':'3069b295')).at(-1)?.returned).toBe(false);
});

it('keeps the obsolete-class type-name call pending when its cache word is unknown',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const images=NativeEngineCinitImages.forCrt(crt);if(!images.known)throw new Error(images.reason);
 const info=NativeEngineCinitImages.imageForCrt(images.value,crt,'obsoleteClassTypeInfo');if(!info.known)throw new Error(info.reason);
 info.value.knownMask[4]=0;
 expect(bootstrap.processAttach().known).toBe(false);
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067daa8');expect(info.value.knownMask[4]).toBe(0);
 expect(f.typeNameFifthCStringCopyReturned).toBe(true);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.find(c=>c.site==='300767e3')).toMatchObject({returned:false});
 expect(graph.value.snapshot().calls.filter(c=>c.site==='306713b3').at(-1)?.returned).toBe(false);
});

it.each([1,2])('keeps the obsolete-class initializer pending when guard bit %s is unknown',bit=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const images=NativeEngineCinitImages.forCrt(crt);if(!images.known)throw new Error(images.reason);
 const flags=NativeEngineCinitImages.imageForCrt(images.value,crt,'obsoleteClassFlags');if(!flags.known)throw new Error(flags.reason);
 flags.value.knownMask[0]=255^bit;
 expect(bootstrap.processAttach().known).toBe(false);
 const f=bootstrap.attachProgress().engineCinitProgress!;
 expect(f.pc).toBe(bit===1?'300767b7':'300767cf');
 expect(flags.value.knownMask[0]).toBe(255^bit);
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'obsoleteClassRoot');if(!root.known)throw new Error(root.reason);
 expect(root.value.readUnsigned(0)).toBe(0);
 expect(f.typeNameFifthCStringCopyReturned).toBe(true);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.find(c=>c.site==='30732300')).toMatchObject({returned:false});
 expect(graph.value.snapshot().calls.some(c=>c.site==='300767e3')).toBe(false);
});

it('captures five completed property CStrings before the next initializer',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 const owner=createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});let referenceCompleted:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;let referenceSnapshot:ReturnType<NativeX86ThreadStack['snapshot']>|null=null;let capturedArena:NativeHeapObjectViews|null=null;let capturedCameraArena:NativeHeapObjectViews|null=null;let capturedRefBytes:Uint8Array|null=null,capturedRefMasks:Uint8Array|null=null;let capturedRefInputFields:NativeHeapObjectViews|null=null,capturedRefInputOffset:number|null=null;const originalImage=NativeEngineCinitImages.imageForCrt;const capture=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((...args)=>{if(args[2]==='obsoleteClassFlags'&&!referenceCompleted){const progress=bootstrap.attachProgress().engineCinitProgress;if(progress?.pc==='3003251a'){referenceCompleted=progress;const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);referenceSnapshot=graph.value.snapshot();}}return originalImage(...args);});const write=NativeHeapObjectViews.prototype.writeUnsigned;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this.bytes.length===4104&&offset===4014&&width===1&&value===116)capturedArena=this;if(!capturedCameraArena&&this.bytes.length===4104&&offset===4012&&width===1&&value===99){const operations=bootstrap.attachProgress().engineCinitProgress?.operations??0;if(operations>9953&&operations<14039)capturedCameraArena=this;}return write.call(this,offset,value,width);});const free=NativeModuleCrtOwner.prototype.free;const release=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,allocation){if(this===crt&&!capturedRefBytes){const f=bootstrap.attachProgress().engineCinitProgress,p=f?.undecorationCopiedTypeWords?.[0]?.provenance;if(f?.pc==='30672f8a'&&f.operations>17613&&f.operations<18313&&p?.kind==='engine-allocation'&&p.fields.backing===allocation){capturedRefBytes=p.fields.bytes.slice();capturedRefMasks=p.fields.knownMask.slice();const input=f.typeNameArguments![1]!.provenance;if(input?.kind!=='engine-image')throw new Error('Actual reference-base undecoration source required');capturedRefInputFields=input.fields;capturedRefInputOffset=input.offset;}}return free.call(this,allocation);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();release.mockRestore();capture.mockRestore();}const f=referenceCompleted as ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress'];if(!f)throw new Error('Actual completed reference-base snapshot required');
 expect({pc:f.pc,operations:f.operations}).toEqual({pc:'3003251a',operations:18315});const referenceStack=NativeX86ThreadStack.forPlatform(platform);if(!referenceStack.known)throw new Error(referenceStack.reason);expect(referenceSnapshot!.calls.find(c=>c.site==='30076773')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'30076778'}}});expect(f.typeNameMemoryAdmin).toBe(owner.memory);expect(f.typeNameSecondCStringCopyReturned).toBe(true);const text=f.typeNameSecondCString!;expect(text.backing).toMatchObject({requestedBytes:17,capacity:20,freed:false});expect(text.readUnsigned(0)).toBe(8);expect(text.readUnsigned(4,2)).toBe(1);expect(text.knownMask[6]).toBe(255);expect(text.knownMask[7]).toBe(255);expect(text.readUnsigned(6,2)).toBe(0);expect(Buffer.from(text.bytes.subarray(8,17)).toString()).toBe('bCString\0');expect([...text.knownMask.subarray(8,17)]).toEqual(Array(9).fill(255));expect(f.typeNameCString!.readUnsigned(0)).toBe(5);expect(Buffer.from(f.typeNameCString!.bytes.subarray(8,14)).toString()).toBe('float\0');expect(f.typeNameCString!.backing.freed).toBe(false);
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'visualAnimationSecondStorage');if(!storage.known)throw new Error(storage.reason);const intArena=capturedArena as NativeHeapObjectViews|null;if(!intArena)throw new Error('Actual int character allocation required');expect(intArena.backing.freed).toBe(true);expect(Buffer.from(intArena.bytes.subarray(4012,4015)).toString()).toBe('int');expect([...intArena.knownMask.subarray(4012,4015)]).toEqual([255,255,255]);expect(f.undecorationTextNodeWords![3]!.value).toBe(3);expect(f.undecorationTextNodeLive).toBe(false);expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameLength).toBe(21);expect(f.typeNameLockHeld).toBe(false);expect(f.typeNameCopyResult).toBe(0);expect(f.typeNameCacheNode!.bytes.length).toBe(8);expect([...f.typeNameCacheNode!.knownMask]).toEqual(Array(8).fill(0));expect(f.typeNameCacheText!.bytes.length).toBe(22);expect([...f.typeNameCacheText!.knownMask]).toEqual(Array(22).fill(255));expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('class bCObjectRefBase\0');const publishedText=f.typeNameCacheNodeWords![0]!.provenance;if(publishedText?.kind!=='engine-allocation')throw new Error('Actual reference-base cache text required');expect(publishedText.fields).toBe(f.typeNameCacheText);expect(publishedText.offset).toBe(0);const publishedRoot=f.typeNameListRootWords![1]!.provenance;if(publishedRoot?.kind!=='engine-allocation')throw new Error('Actual reference-base cache list root required');expect(publishedRoot.fields).toBe(f.typeNameCacheNode);const priorCache=f.typeNameCacheNodeWords![1]!.provenance;if(priorCache?.kind!=='engine-allocation')throw new Error('Actual preceding camera cache required');expect(priorCache.fields.backing.freed).toBe(false);expect(priorCache.fields).not.toBe(f.typeNameCacheNode);expect(f.typeNameCacheText!.backing.freed).toBe(false);const cacheCapacity=NativeRuntimePlatform.canonicalEngineHeapAllocationViewsForPlatform(platform,crt,f.typeNameCacheText!.backing);if(!cacheCapacity.known)throw new Error(cacheCapacity.reason);expect(cacheCapacity.value.requestedBytes).toBe(22);expect(cacheCapacity.value.physicalCapacity).toBe(24);expect(f.typeNameCacheText!.backing).not.toBe(f.undecorationOutput!.backing);expect(f.typeNameCacheNode!.backing.freed).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.undecorationOutput!.bytes.length).toBe(24);expect(Buffer.from(f.undecorationOutput!.bytes.subarray(0,22)).toString()).toBe('class bCObjectRefBase\0');expect([...f.undecorationOutput!.knownMask]).toEqual([...Array(22).fill(255),0,0]);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:f.undecorationOutput!,offset:0},24).known).toBe(false);expect(f.undecorationOutput!.backing).not.toBe(intArena.backing);expect(f.undecorationParserWords![6]!.value).toBe(22);expect(f.undecorationOutputWriterArguments![0]!.provenance).toMatchObject({kind:'engine-allocation',fields:f.undecorationOutput,offset:0});expect(f.undecorationOutputWriterArguments![1]!.value).toBe(22);expect(f.undecorationTextNodeWord!.provenance).toMatchObject({kind:'engine-allocation',fields:intArena,offset:4020});const cameraArena=capturedCameraArena as NativeHeapObjectViews|null;if(!cameraArena)throw new Error('Actual camera class arena required');expect(cameraArena).not.toBe(intArena);expect(cameraArena.backing.freed).toBe(true);expect(Buffer.from(cameraArena.bytes.subarray(4012,4018)).toString()).toBe('class ');expect([...cameraArena.knownMask.subarray(4012,4018)]).toEqual(Array(6).fill(255));expect(new DataView(cameraArena.bytes.buffer,cameraArena.bytes.byteOffset,cameraArena.bytes.byteLength).getUint32(4032,true)).toBe(6);const nameOffset=Buffer.from(cameraArena.bytes).indexOf(Buffer.from('eCCameraBase'));expect(nameOffset).toBeGreaterThanOrEqual(0);expect([...cameraArena.knownMask.subarray(nameOffset,nameOffset+12)]).toEqual(Array(12).fill(255));expect(new DataView(cameraArena.bytes.buffer,cameraArena.bytes.byteOffset,cameraArena.bytes.byteLength).getUint32(4008,true)).toBe(12);expect(f.visualAnimationSecondRootWord!.provenance).toMatchObject({kind:'engine-image',fields:storage.value,offset:0});expect(f.exitTableFourth!.provenance).toMatchObject({kind:'source',type:'code',address:'3001c602'});expect(f.exitTableThird!.provenance).toMatchObject({kind:'source',type:'code',address:'30011a40'});expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',fields:f.exitTableAllocation,offset:28});expect(f.cppCursor!.provenance).toMatchObject({kind:'engine-image',offset:0x118});expect(f.onexitLockHeld).toBe(false);expect(storage.value.maskedWord(0)).toMatchObject({knownMask:3,value:0});const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'visualAnimationSecondRoot');if(!root.known)throw new Error(root.reason);expect(root.value.maskedWord(0).knownMask).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(referenceSnapshot!.calls.filter(c=>c.site==='1001325e').at(-2)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='1001362d').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='10091571').at(-2)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='10091571').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3007659e').at(-1)?.returned).toBe(true);for(const site of ['3069b54e','3069a330','3069b049','306971d4','30697402','3069b2eb','3069661c','3069b307','3069b2ff','3067dadd','3067db65','3067db85','3067db7a','30076603','30076619','307322d0'])expect(referenceSnapshot!.calls.filter(c=>c.site===site).at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3067dac6').at(-2)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3067dac6').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3067dac6').at(-3)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3069b2d3').at(-2)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3069b2d3').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3069b2de').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3069b8fe').at(-2)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3069b8fe').at(-1)?.returned).toBe(true);expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:29});expect(referenceSnapshot!.calls.filter(c=>c.site==='306973b2').at(-1)?.returned).toBe(true);for(const site of ['3069778c','306994ad','306994c9','306972f3','30697302','306994d5','306994e3','30699505','3069950f','306996a3'])expect(referenceSnapshot!.calls.filter(c=>c.site===site).at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='306996b0').at(-1)?.returned).toBe(true);for(const site of ['30697910','3069792c','3069793f','3069732d','3069733e','30697357','3069794e','306996bc','3069b528'])expect(referenceSnapshot!.calls.filter(c=>c.site===site).at(-1)?.returned).toBe(true);for(const site of ['3069b532','3069b53a','3069b676','3069b54e','3069b770','3069b8a3','3069a31c','3069a330','3069b03f','3069b049'])expect(referenceSnapshot!.calls.filter(c=>c.site===site).at(-1)?.returned).toBe(true);const classList=f.undecorationCopiedTypeWords![0]!.provenance;expect(classList?.kind).toBe('engine-allocation');expect(f.undecorationCopiedTypeWords![1]!.mask&15).toBe(15);expect(f.undecorationCopiedTypeWords![1]!.value&15).toBe(0);expect(referenceSnapshot!.calls.filter(c=>c.site==='3069b0ce').at(-2)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3069b0ce').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3069b0a2').at(-2)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3069b0a2').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3067db2d').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='30076703').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3007670e').at(-1)?.returned).toBe(true);const cameraStorage=NativeEngineCinitImages.imageForCrt(f.images,crt,'cameraBaseObjectStorage');if(!cameraStorage.known)throw new Error(cameraStorage.reason);const preservedInitializerCursor=f.cppCursor!.provenance;expect(preservedInitializerCursor?.kind).toBe('engine-image');expect(preservedInitializerCursor).toMatchObject({offset:0x118});expect(f.currentEsiWord!.provenance).toMatchObject({kind:'engine-image',offset:0x118});const cameraRoot=NativeEngineCinitImages.imageForCrt(f.images,crt,'cameraBaseObjectRoot');if(!cameraRoot.known)throw new Error(cameraRoot.reason);const cameraRootPointer=f.cameraBaseObjectRootWord!.provenance;expect(cameraRootPointer?.kind).toBe('engine-image');if(cameraRootPointer?.kind!=='engine-image')throw new Error('Actual published camera root required');expect(cameraRootPointer.fields).toBe(cameraStorage.value);expect(cameraRootPointer.offset).toBe(0);expect(f.exitTableSixth!.provenance).toMatchObject({kind:'source',type:'code',address:'300307f1'});const thirdStorage=NativeEngineCinitImages.imageForCrt(f.images,crt,'visualAnimationThirdStorage');if(!thirdStorage.known)throw new Error(thirdStorage.reason);expect(f.visualAnimationThirdRootWord!.provenance).toMatchObject({kind:'engine-image',fields:thirdStorage.value,offset:0});expect(f.exitTableFifth!.provenance).toMatchObject({kind:'source',type:'code',address:'3002f56d'});expect(f.typeNameThirdCStringCopyReturned).toBe(true);const thirdText=f.typeNameThirdCString!;expect(thirdText.backing).toMatchObject({requestedBytes:12,capacity:12,freed:false});expect(thirdText).not.toBe(f.typeNameCString);expect(thirdText).not.toBe(f.typeNameSecondCString);expect(thirdText.readUnsigned(0)).toBe(3);expect(thirdText.readUnsigned(4,2)).toBe(1);expect(Buffer.from(thirdText.bytes.subarray(8,12)).toString()).toBe('int\0');expect([...thirdText.knownMask.subarray(8,12)]).toEqual([255,255,255,255]);expect(referenceSnapshot!.calls.filter(c=>c.site==='1009155b').at(-2)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='1009155b').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3007660e').at(-1)?.returned).toBe(true);expect(f.typeNameCacheText!.backing.freed).toBe(false);const fourthText=f.typeNameFourthCString!;const fourthAllocation=fourthText.backing as NativeMemoryAllocation;expect(fourthAllocation.requestedBytes).toBe(21);expect(fourthAllocation.capacity).toBe(24);expect(fourthAllocation.freed).toBe(false);expect([...fourthText.knownMask]).toEqual(Array(24).fill(255));for(const prior of [f.typeNameCString,f.typeNameSecondCString,f.typeNameThirdCString])expect(fourthText).not.toBe(prior);const fifthText=f.typeNameFifthCString!;expect(fifthText.backing).toMatchObject({requestedBytes:24,capacity:24,freed:false});expect(fifthText.readUnsigned(0)).toBe(15);expect(fifthText.readUnsigned(4,2)).toBe(1);expect(fifthText.readUnsigned(6,2)).toBe(0);expect(Buffer.from(fifthText.bytes.slice(8)).toString()).toBe('bCObjectRefBase\0');expect([...fifthText.knownMask]).toEqual(Array(24).fill(255));expect(f.typeNameFifthCStringCopyReturned).toBe(true);for(const prior of [f.typeNameCString,f.typeNameSecondCString,f.typeNameThirdCString,f.typeNameFourthCString])expect(fifthText).not.toBe(prior);const refDestination=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseStorage');if(!refDestination.known)throw new Error(refDestination.reason);const currentDestination=f.objectRefBaseRootWord!.provenance;if(currentDestination?.kind!=='engine-image')throw new Error('Actual reference-base CString destination required');expect(currentDestination.fields).toBe(refDestination.value);expect(currentDestination.offset).toBe(0);expect(referenceSnapshot!.calls.filter(c=>c.site==='10091571').at(-1)).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'10091576'}}});expect(referenceSnapshot!.calls.find(c=>c.site==='3007677e')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'30076784'}}});expect(fourthText.readUnsigned(0)).toBe(12);expect(fourthText.readUnsigned(4,2)).toBe(1);expect(Buffer.from(fourthText.bytes.subarray(8,21)).toString()).toBe("eCCameraBase\0");expect(f.typeNameFourthCStringCopyReturned).toBe(true);expect(NativeMemoryAdmin.canonicalAllocationForPlatform(f.typeNameMemoryAdmin!,platform,fourthText.backing as NativeMemoryAllocation).known).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='1001325e').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='10013623').at(-1)?.returned).toBe(true); const refFlags=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseFlags'),refRoot=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot'),refInfo=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseTypeInfo');if(!refFlags.known||!refRoot.known||!refInfo.known)throw new Error('Actual object-reference property images required');const retainedCppCursor=f.cppCursor!.provenance;if(preservedInitializerCursor?.kind!=='engine-image'||retainedCppCursor?.kind!=='engine-image')throw new Error('Actual restored initializer cursor required');const priorReturnedEsi=f.undecorationRestoredEsiWord!.provenance;if(priorReturnedEsi?.kind!=='engine-image')throw new Error('Actual reference-base restored initializer cursor required');expect(priorReturnedEsi.fields).toBe(retainedCppCursor.fields);expect(priorReturnedEsi.offset).toBe(retainedCppCursor.offset-4);expect(refFlags.value.readUnsigned(0)).toBe(3);expect(refRoot.value.maskedWord(0).knownMask).toBe(0);expect(f.exitTableSeventh!.provenance).toMatchObject({kind:'source',type:'code',address:'300098e0'});expect(capturedRefInputFields).toBe(refInfo.value);expect(capturedRefInputOffset).toBe(9);expect(referenceSnapshot!.calls.filter(c=>c.site==='30076773').at(-1)?.returned).toBe(true); const refArenaPointer=f.undecorationFieldWords![0]!.provenance;if(refArenaPointer?.kind!=='engine-allocation')throw new Error('Actual reference-base parser arena required');const refArena=refArenaPointer.fields;expect(refArena).not.toBe(cameraArena);expect(refArena.backing.freed).toBe(true);const refBytes=capturedRefBytes as Uint8Array|null,refMasks=capturedRefMasks as Uint8Array|null;if(!refBytes||!refMasks)throw new Error('Reference-base arena bytes captured before release required');const refView=new DataView(refBytes.buffer,refBytes.byteOffset,refBytes.byteLength);expect(refBytes.length).toBe(4104);expect(()=>refArena.readUnsigned(4032)).toThrow();const nameCache=f.undecorationParserWords![1]!.provenance;if(nameCache?.kind!=='stack')throw new Error('Actual reference-base name cache required');expect(referenceSnapshot!.calls.filter(c=>c.site==='306994c9').at(-1)?.returned).toBe(true);if(classList?.kind!=='engine-allocation')throw new Error('Actual returned reference-base class list required');expect(classList.fields).toBe(refArena);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:refArena,offset:classList.offset},12).known).toBe(false);expect(new DataView(refMasks.buffer,refMasks.byteOffset,refMasks.byteLength).getUint32(classList.offset+4,true)).not.toBe(0xffffffff);const refNameOffset=Buffer.from(refBytes).indexOf(Buffer.from('bCObjectRefBase'));expect(refNameOffset).toBeGreaterThanOrEqual(0);expect([...refMasks.subarray(refNameOffset,refNameOffset+15)]).toEqual(Array(15).fill(255));expect(Buffer.from(refBytes.subarray(4012,4018)).toString()).toBe('class ');expect([...refMasks.subarray(4012,4018)]).toEqual(Array(6).fill(255));expect(refView.getUint32(4032,true)).toBe(6);expect(new DataView(refMasks.buffer,refMasks.byteOffset,refMasks.byteLength).getUint32(4028,true)).not.toBe(0xffffffff);expect(referenceSnapshot!.calls.filter(c=>c.site==='30699505').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='306996a3').at(-1)?.returned).toBe(true);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:refArena,offset:0},4104).known).toBe(false);for(const [index,offset,kind] of [[0,4084,3],[1,4068,1],[2,4052,3],[3,4036,1]]){const field=f.undecorationFieldWords![index!]!.provenance;if(field?.kind!=='engine-allocation')throw new Error('Actual retained parser field required');expect(field.fields).toBe(refArena);expect(field.offset).toBe(offset);expect(refView.getUint32(offset!+8,true)).toBe(kind);}expect(referenceSnapshot!.calls.filter(c=>c.site==='3069a31c').at(-1)?.returned).toBe(true);expect(referenceSnapshot!.calls.filter(c=>c.site==='3069b03f').at(-1)?.returned).toBe(true);

},30_000);

it('retains the original second CString when its terminator store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const write=NativeHeapObjectViews.prototype.writeUnsigned;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this.bytes.length===20&&offset===16&&width===1&&this.readUnsigned(0)===8)throw new Error('Interrupted original second CString terminator store');return write.call(this,offset,value,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('10013271');expect(f.typeNameSecondCString!.readUnsigned(0)).toBe(8);expect(f.typeNameSecondCString!.readUnsigned(4,2)).toBe(1);expect(f.typeNameSecondCStringCopyReturned).toBe(false);expect(f.typeNameCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameCString!.bytes.subarray(8,14)).toString()).toBe('float\0');expect(f.typeNameSecondCString!.backing.freed).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='10013623').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='10091571').at(-1)?.returned).toBe(false);
});

it('retains the second property shutdown caller when the original exit lock fails',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const lock=NativeCrtBootstrap.engineCinitExitLockForCrt;
 const spy=vi.spyOn(NativeCrtBootstrap,'engineCinitExitLockForCrt').mockImplementation((...args)=>{if(args[0]===bootstrap&&args[3]==='lock'&&bootstrap.attachProgress().engineCinitProgress!.operations>8158)return {known:false,reason:'Interrupted original second property exit lock'};return lock(...args);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067cfea');expect(f.onexitLockHeld).toBe(false);expect(f.typeNameSecondCStringCopyReturned).toBe(true);expect(f.typeNameSecondCString!.backing.freed).toBe(false);expect(f.exitTableThird!.provenance).toMatchObject({kind:'source',type:'code',address:'30011a40'});expect(f.exitTableFourth).toMatchObject({value:0,mask:0xffffffff,provenance:undefined});const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'visualAnimationSecondRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='300765a9').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='307322c0').at(-1)?.returned).toBe(false);
});

it('retains the third property caller when its original int cache word is unknown',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===11&&this.bytes[8]===46&&this.bytes[9]===72&&offset===4&&width===4){changed=true;this.knownMask[4]=0;}return read.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(changed).toBe(true);expect(f.pc).toBe('3067daa8');expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameSecondCStringCopyReturned).toBe(true);expect(f.typeNameSecondCString!.backing.freed).toBe(false);expect(f.visualAnimationSecondRootWord!.provenance).toMatchObject({kind:'engine-image',offset:0});const flags=NativeEngineCinitImages.imageForCrt(f.images,crt,'visualAnimationThirdFlags');if(!flags.known)throw new Error(flags.reason);expect(flags.value.readUnsigned(0)).toBe(3);
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'visualAnimationThirdRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076603').at(-1)?.returned).toBe(false);
});

it('retains original partial int text when its final character store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const write=NativeHeapObjectViews.prototype.writeUnsigned;
 let interruptedArena:NativeHeapObjectViews|null=null;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this.bytes.length===4104&&offset===4014&&width===1&&value===116){interruptedArena=this;throw new Error('Interrupted original int character store');}return write.call(this,offset,value,width);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30696f4b');expect(f.undecorationLockHeld).toBe(true);const intArena=interruptedArena as NativeHeapObjectViews|null;if(!intArena)throw new Error('Actual interrupted int arena required');expect(intArena.backing.freed).toBe(false);expect(Buffer.from(intArena.bytes.subarray(4012,4014)).toString()).toBe('in');expect([...intArena.knownMask.subarray(4012,4015)]).toEqual([255,255,0]);expect(f.typeNameSecondCStringCopyReturned).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='306973b2').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076603').at(-1)?.returned).toBe(false);
});


it('retains the actual int node when its original output allocator is unavailable',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const malloc=NativeModuleCrtOwner.prototype.malloc;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){if(this===crt&&bytes===8&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>9232)return {known:false,reason:'Interrupted original int output allocator'};return malloc.call(this,bytes);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672ec7');expect(f.undecorationLockHeld).toBe(true);expect(f.undecorationTextNodeLive).toBe(true);expect(f.typeNameSecondCStringCopyReturned).toBe(true);const node=f.undecorationTextNodeWord!.provenance;if(node?.kind!=='engine-allocation')throw new Error('Actual int text node required');expect(Buffer.from(node.fields.bytes.subarray(4012,4015)).toString()).toBe('int');expect(node.fields.backing.freed).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0b4').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b2de').at(-1)?.returned).toBe(false);
});


it('retains original int output when its terminator store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const write=NativeHeapObjectViews.prototype.writeUnsigned;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this===bootstrap.attachProgress().engineCinitProgress?.undecorationOutput&&offset===3&&width===1&&value===0&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>9349)throw new Error('Interrupted original int output terminator');return write.call(this,offset,value,width);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('306971f6');expect(f.undecorationLockHeld).toBe(true);expect(f.undecorationTextNodeLive).toBe(true);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(Buffer.from(f.undecorationOutput!.bytes.subarray(0,3)).toString()).toBe('int');expect([...f.undecorationOutput!.knownMask.subarray(0,4)]).toEqual([255,255,255,0]);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697402').at(-1)?.returned).toBe(true);
});


for(const failure of ['free','unlock'] as const)it('retains original int cleanup state when '+failure+' fails',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const free=NativeModuleCrtOwner.prototype.free,lock=NativeCrtBootstrap.engineCinitUndecorationLockForCrt;
 const freeSpy=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){if(failure==='free'&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>9499)return {known:false,reason:'Interrupted original int arena release'};return free.call(this,backing);});const lockSpy=vi.spyOn(NativeCrtBootstrap,'engineCinitUndecorationLockForCrt').mockImplementation((...args)=>{if(failure==='unlock'&&args[3]==='unlock'&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>9499)return {known:false,reason:'Interrupted original int arena unlock'};return lock(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{freeSpy.mockRestore();lockSpy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe(failure==='free'?'30672f8a':'3069b307');expect(f.undecorationLockHeld).toBe(true);expect(f.undecorationTextNodeLive).toBe(failure==='free');expect(f.undecorationOutput!.backing.freed).toBe(false);expect(Buffer.from(f.undecorationOutput!.bytes.subarray(0,4)).toString()).toBe('int\0');expect(f.typeNameSecondCStringCopyReturned).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067dac6').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site=== (failure==='free'?'3069661c':'3069b307')).at(-1)?.returned).toBe(false);
});


it('retains original int strlen when its terminator byte is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const alignment=NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform;let changed=false;
 const spy=vi.spyOn(NativeRuntimePlatform,'canonicalNativePointerModulo4ForPlatform').mockImplementation((...args)=>{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30679ad4'&&f.operations>9545){f.undecorationOutput!.knownMask[3]=0;changed=true;}return alignment(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(changed).toBe(true);expect(f.pc).toBe('30679b11');expect(f.undecorationLockHeld).toBe(false);expect(f.undecorationTextNodeLive).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(f.typeNameSecondCStringCopyReturned).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067dadd').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076603').at(-1)?.returned).toBe(false);
});


for(const bytes of [8,4])it('retains original int cache caller when allocation '+bytes+' is unavailable',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const malloc=NativeModuleCrtOwner.prototype.malloc;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,size){if(this===crt&&size===bytes&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>9573)return {known:false,reason:'Interrupted original int cache allocation'};return malloc.call(this,size);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672ec7');expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationLockHeld).toBe(false);expect(f.undecorationTextNodeLive).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(Buffer.from(f.undecorationOutput!.bytes.subarray(0,4)).toString()).toBe('int\0');const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site===(bytes===8?'3067db0b':'3067db1b')).at(-1)?.returned).toBe(false);
});

it('retains partial original int cache text when its final character write is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const write=NativeHeapObjectViews.prototype.writeUnsigned;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this.bytes.length===4&&offset===2&&value===116&&width===1&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>9573)throw new Error('Interrupted original int cache write');return write.call(this,offset,value,width);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3068a88a');expect(f.typeNameLockHeld).toBe(true);expect(f.typeNameCopyResult).toBeNull();expect(Buffer.from(f.typeNameCacheText!.bytes.subarray(0,2)).toString()).toBe('in');expect([...f.typeNameCacheText!.knownMask]).toEqual([255,255,0,0]);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db2d').at(-1)?.returned).toBe(false);
});


for(const failure of ['free','unlock'] as const)it('retains original int cache cleanup state when '+failure+' fails',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const free=NativeModuleCrtOwner.prototype.free,lock=NativeCrtBootstrap.engineCinitTypeNameLockForCrt;
 const freeSpy=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){if(failure==='free'&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>9668)return {known:false,reason:'Interrupted original int output release'};return free.call(this,backing);});const lockSpy=vi.spyOn(NativeCrtBootstrap,'engineCinitTypeNameLockForCrt').mockImplementation((...args)=>{if(failure==='unlock'&&args[3]==='unlock'&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>9668)return {known:false,reason:'Interrupted original int cache unlock'};return lock(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{freeSpy.mockRestore();lockSpy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe(failure==='free'?'30672f8a':'3067db85');expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationLockHeld).toBe(false);expect(f.undecorationTextNodeLive).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(failure==='unlock');expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('int\0');expect(f.typeNameSecondCStringCopyReturned).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076603').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site===(failure==='free'?'3067db65':'3067db85')).at(-1)?.returned).toBe(false);
});


it('retains original int name search when its cache character is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const alignment=NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform;let changed=false;
 const spy=vi.spyOn(NativeRuntimePlatform,'canonicalNativePointerModulo4ForPlatform').mockImplementation((...args)=>{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='100a7310'&&f.operations>9694){f.typeNameCacheText!.knownMask[2]=0;changed=true;}return alignment(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(changed).toBe(true);expect(f.pc).toBe('100a7343');expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.typeNameSecondCStringCopyReturned).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='1009155b').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3007660e').at(-1)?.returned).toBe(false);
});

it('retains original camera name search when its cache character is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const alignment=NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform;let changed=false;
 const spy=vi.spyOn(NativeRuntimePlatform,'canonicalNativePointerModulo4ForPlatform').mockImplementation((...args)=>{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='100a7310'&&f.operations>13735){f.typeNameCacheText!.knownMask[2]=0;changed=true;}return alignment(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(changed).toBe(true);expect(f.pc).toBe('100a7343');expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.typeNameSecondCStringCopyReturned).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='1009155b').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3007670e').at(-1)?.returned).toBe(false);
});


it('retains original third CString caller when its MemoryAdmin allocation is unavailable',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const malloc=NativeMemoryAdmin.prototype.malloc;
 const spy=vi.spyOn(NativeMemoryAdmin.prototype,'malloc').mockImplementation(function(this:NativeMemoryAdmin,bytes){if(bytes===12&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>9757)return {known:false,reason:'Interrupted original third CString allocation'};return malloc.call(this,bytes);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('10003cd8');expect(f.typeNameThirdCString).toBeNull();expect(f.typeNameThirdCStringCopyReturned).toBe(false);expect(f.typeNameSecondCStringCopyReturned).toBe(true);expect(f.typeNameCStringCopyReturned).toBe(true);expect(f.typeNameCacheText!.backing.freed).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='1001325e').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3007660e').at(-1)?.returned).toBe(false);
});

it('retains original third CString when its terminator store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const write=NativeHeapObjectViews.prototype.writeUnsigned;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this.bytes.length===12&&offset===11&&width===1&&value===0&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>9757)throw new Error('Interrupted original third CString terminator');return write.call(this,offset,value,width);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('10013271');expect(f.typeNameThirdCString!.readUnsigned(0)).toBe(3);expect(f.typeNameThirdCString!.readUnsigned(4,2)).toBe(1);expect(f.typeNameThirdCStringCopyReturned).toBe(false);expect(f.typeNameThirdCString!.backing.freed).toBe(false);expect(f.typeNameSecondCStringCopyReturned).toBe(true);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='10013623').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3007660e').at(-1)?.returned).toBe(false);
});


it('retains original third property shutdown caller when its exit lock fails',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const lock=NativeCrtBootstrap.engineCinitExitLockForCrt;
 const spy=vi.spyOn(NativeCrtBootstrap,'engineCinitExitLockForCrt').mockImplementation((...args)=>{if(args[0]===bootstrap&&args[3]==='lock'&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>9831)return {known:false,reason:'Interrupted original third property exit lock'};return lock(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067cfea');expect(f.onexitLockHeld).toBe(false);expect(f.typeNameThirdCStringCopyReturned).toBe(true);expect(f.typeNameThirdCString!.backing.freed).toBe(false);expect(f.exitTableFifth).toMatchObject({value:0,mask:0xffffffff,provenance:undefined});const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'visualAnimationThirdRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076619').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='307322d0').at(-1)?.returned).toBe(false);
});


it('retains original camera object caller when its RTTI cache word is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===27&&this.bytes[8]===46&&this.bytes[12]===101&&offset===4&&width===4){this.knownMask[4]=0;changed=true;}return read.call(this,offset,width);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(changed).toBe(true);expect(f.pc).toBe('3067daa8');expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameThirdCStringCopyReturned).toBe(true);expect(f.visualAnimationThirdRootWord!.provenance).toMatchObject({kind:'engine-image',offset:0});expect(f.exitTableFifth!.provenance).toMatchObject({kind:'source',type:'code',address:'3002f56d'});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076703').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='307322e0').at(-1)?.returned).toBe(false);
});


it('retains camera parser caller when its cold arena allocation is unavailable',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const malloc=NativeModuleCrtOwner.prototype.malloc;let interrupted=false;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){if(bytes===4104&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>10059){interrupted=true;return {known:false,reason:'Camera parser arena allocation unavailable'};}return malloc.call(this,bytes);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672ec7');expect(f.undecorationLockHeld).toBe(true);expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',offset:20});expect(f.cppCursor!.provenance).toMatchObject({kind:'engine-image',offset:0x110});
 for(const text of [f.typeNameCString!,f.typeNameSecondCString!,f.typeNameThirdCString!])expect(text.backing.freed).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b2d3').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076703').at(-1)?.returned).toBe(false);
});

it('retains original camera object caller when its decorated qualifier is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===27&&this.bytes[8]===46&&this.bytes[12]===101&&offset===10&&width===1&&bootstrap.attachProgress().engineCinitProgress?.pc==='3069aadf'){this.knownMask[10]=0;changed=true;}return read.call(this,offset,width);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(changed).toBe(true);expect(f.pc).toBe('3069aadf');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameThirdCStringCopyReturned).toBe(true);expect(f.visualAnimationThirdRootWord!.provenance).toMatchObject({kind:'engine-image',offset:0});expect(f.exitTableFifth!.provenance).toMatchObject({kind:'source',type:'code',address:'3002f56d'});expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:10});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b8fe').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='307322e0').at(-1)?.returned).toBe(false);
});

it('retains original camera object caller when its identifier byte is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===27&&this.bytes[8]===46&&this.bytes[12]===101&&offset===12&&width===1&&bootstrap.attachProgress().engineCinitProgress?.pc==='30699315'){this.knownMask[12]=0;changed=true;}return read.call(this,offset,width);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(changed).toBe(true);expect(f.pc).toBe('30699315');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameThirdCStringCopyReturned).toBe(true);expect(f.visualAnimationThirdRootWord!.provenance).toMatchObject({kind:'engine-image',offset:0});expect(f.exitTableFifth!.provenance).toMatchObject({kind:'source',type:'code',address:'3002f56d'});expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:12});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30699505').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='307322e0').at(-1)?.returned).toBe(false);
});

it('retains camera parser caller when its class list-link store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const write=NativeHeapObjectViews.prototype.maskedWord;let interrupted=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===4104&&bootstrap.attachProgress().engineCinitProgress?.pc==='30696e86'&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>12159){interrupted=true;throw new Error('Camera list-link store interrupted');}return write.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30696e86');expect(f.undecorationLockHeld).toBe(true);expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',offset:20});expect(f.cppCursor!.provenance).toMatchObject({kind:'engine-image',offset:0x110});
 for(const text of [f.typeNameCString!,f.typeNameSecondCString!,f.typeNameThirdCString!])expect(text.backing.freed).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069794e').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076703').at(-1)?.returned).toBe(false);
});

it('retains camera parser caller when its name output allocation is unavailable',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const malloc=NativeModuleCrtOwner.prototype.malloc;let interrupted=false;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){if(bytes===24&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>12658){interrupted=true;return {known:false,reason:'Camera output allocation unavailable'};}return malloc.call(this,bytes);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672ec7');expect(f.undecorationLockHeld).toBe(true);expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',offset:20});expect(f.cppCursor!.provenance).toMatchObject({kind:'engine-image',offset:0x110});
 for(const text of [f.typeNameCString!,f.typeNameSecondCString!,f.typeNameThirdCString!])expect(text.backing.freed).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0b4').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076703').at(-1)?.returned).toBe(false);
});

it('retains original camera object caller when its writer dispatch target is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(offset===8&&(width??4)===4&&bootstrap.attachProgress().engineCinitProgress?.pc==='306971d4'&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>12823){this.knownMask[8]=0;changed=true;}return read.call(this,offset,width);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(changed).toBe(true);expect(f.pc).toBe('306971d4');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameThirdCStringCopyReturned).toBe(true);expect(f.exitTableFifth!.provenance).toMatchObject({kind:'source',type:'code',address:'3002f56d'});expect(f.undecorationParserWords).toBeNull();expect(f.visualAnimationThirdRootWord).toBeNull();const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='307322e0').at(-1)?.returned).toBe(false);
});

it('retains camera parser caller when its output terminator store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const write=NativeHeapObjectViews.prototype.writeUnsigned;let interrupted=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this.bytes.length===24&&offset===18&&width===1&&bootstrap.attachProgress().engineCinitProgress?.pc==='306971f6'){interrupted=true;throw new Error('Camera output terminator store interrupted');}return write.call(this,offset,value,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('306971f6');expect(f.undecorationLockHeld).toBe(true);expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',offset:20});expect(f.cppCursor!.provenance).toMatchObject({kind:'engine-image',offset:0x110});
 for(const text of [f.typeNameCString!,f.typeNameSecondCString!,f.typeNameThirdCString!])expect(text.backing.freed).toBe(false);
 expect(Buffer.from(f.undecorationOutput!.bytes.subarray(0,18)).toString()).toBe('class eCCameraBase');expect(f.undecorationOutput!.knownMask[18]).toBe(0);expect(f.undecorationOutput!.backing.freed).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076703').at(-1)?.returned).toBe(false);
});

it('retains original camera object caller when its rendered output terminator is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===24&&offset===18&&width===1&&bootstrap.attachProgress().engineCinitProgress?.pc==='3069b0f3'){this.knownMask[18]=0;changed=true;}return read.call(this,offset,width);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(changed).toBe(true);expect(f.pc).toBe('3069b0f3');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameThirdCStringCopyReturned).toBe(true);expect(f.visualAnimationThirdRootWord!.provenance).toMatchObject({kind:'engine-image',offset:0});expect(f.exitTableFifth!.provenance).toMatchObject({kind:'source',type:'code',address:'3002f56d'});expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:26});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b2de').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='307322e0').at(-1)?.returned).toBe(false);
});

it('retains camera parser caller when its arena release is unavailable',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const free=NativeModuleCrtOwner.prototype.free;let interrupted=false;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){if(bootstrap.attachProgress().engineCinitProgress?.pc==='30672f8a'&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>13381){interrupted=true;return {known:false,reason:'Camera arena release unavailable'};}return free.call(this,backing);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672f8a');expect(f.undecorationLockHeld).toBe(true);expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',offset:20});expect(f.cppCursor!.provenance).toMatchObject({kind:'engine-image',offset:0x110});
 for(const text of [f.typeNameCString!,f.typeNameSecondCString!,f.typeNameThirdCString!])expect(text.backing.freed).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069661c').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076703').at(-1)?.returned).toBe(false);
});

it('retains original camera object caller when its DWORD scan terminator is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const read=NativeHeapObjectViews.prototype.maskedWord;let changed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===24&&offset===16&&(width??4)===4&&bootstrap.attachProgress().engineCinitProgress?.pc==='30679b00'){this.knownMask[18]=0;changed=true;}return read.call(this,offset,width);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}const f=bootstrap.attachProgress().engineCinitProgress!;expect(changed).toBe(true);expect(f.pc).toBe('30679b11');expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameThirdCStringCopyReturned).toBe(true);expect(f.visualAnimationThirdRootWord!.provenance).toMatchObject({kind:'engine-image',offset:0});expect(f.exitTableFifth!.provenance).toMatchObject({kind:'source',type:'code',address:'3002f56d'});expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:26});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067dadd').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='307322e0').at(-1)?.returned).toBe(false);
});

it('retains camera parser caller when its cache text allocation is unavailable',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const malloc=NativeModuleCrtOwner.prototype.malloc;let interrupted=false;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){if(bytes===19&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>13485){interrupted=true;return {known:false,reason:'Camera output allocation unavailable'};}return malloc.call(this,bytes);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672ec7');expect(f.undecorationLockHeld).toBe(false);expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',offset:20});expect(f.cppCursor!.provenance).toMatchObject({kind:'engine-image',offset:0x110});
 for(const text of [f.typeNameCString!,f.typeNameSecondCString!,f.typeNameThirdCString!])expect(text.backing.freed).toBe(false);
 expect(f.typeNameLockHeld).toBe(true);expect(f.typeNameCacheNode!.backing.freed).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db1b').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076703').at(-1)?.returned).toBe(false);
});

it('retains camera parser caller when its cache character store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const write=NativeHeapObjectViews.prototype.writeUnsigned;let interrupted=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this.bytes.length===19&&offset===10&&width===1&&bootstrap.attachProgress().engineCinitProgress?.pc==='3068a88a'){interrupted=true;throw new Error('Camera cache character store interrupted');}return write.call(this,offset,value,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3068a88a');expect(f.undecorationLockHeld).toBe(false);expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',offset:20});expect(f.cppCursor!.provenance).toMatchObject({kind:'engine-image',offset:0x110});
 for(const text of [f.typeNameCString!,f.typeNameSecondCString!,f.typeNameThirdCString!])expect(text.backing.freed).toBe(false);
 expect(f.typeNameLockHeld).toBe(true);expect(Buffer.from(f.typeNameCacheText!.bytes.subarray(0,10)).toString()).toBe('class eCCa');expect(f.typeNameCacheText!.knownMask[10]).toBe(0);expect(f.typeNameCacheText!.backing.freed).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db2d').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076703').at(-1)?.returned).toBe(false);
});

it('retains camera parser caller when its temporary output release is unavailable',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeArenaHeapExtension]});const free=NativeModuleCrtOwner.prototype.free;let interrupted=false;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){if(bootstrap.attachProgress().engineCinitProgress?.pc==='30672f8a'&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>13700){interrupted=true;return {known:false,reason:'Camera temporary output release unavailable'};}return free.call(this,backing);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672f8a');expect(f.undecorationLockHeld).toBe(false);expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',offset:20});expect(f.cppCursor!.provenance).toMatchObject({kind:'engine-image',offset:0x110});
 for(const text of [f.typeNameCString!,f.typeNameSecondCString!,f.typeNameThirdCString!])expect(text.backing.freed).toBe(false);
 expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(f.typeNameCacheText!.backing.freed).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db65').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076703').at(-1)?.returned).toBe(false);
});


it.each(['lock','unlock'] as const)('retains original camera registration when its exit %s is unavailable',(failure)=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const lock=NativeCrtBootstrap.engineCinitExitLockForCrt;let interrupted=false;
 const spy=vi.spyOn(NativeCrtBootstrap,'engineCinitExitLockForCrt').mockImplementation((...args)=>{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.typeNameFourthCStringCopyReturned&&args[3]===failure){interrupted=true;return {known:false,reason:'Interrupted original camera exit registration'};}return lock(...args);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='lock'?'3067cfea':'3067cff3');expect(f.onexitLockHeld).toBe(failure==='unlock');expect(f.typeNameFourthCStringCopyReturned).toBe(true);expect(f.typeNameFourthCString!.backing.freed).toBe(false);expect(Buffer.from(f.typeNameFourthCString!.bytes.subarray(8,21)).toString()).toBe('eCCameraBase\0');expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'cameraBaseObjectRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);expect(root.value.maskedWord(0).knownMask).toBe(0xffffffff);expect(f.exitCursor!.provenance?.kind).toBe('engine-allocation');if(f.exitCursor!.provenance?.kind!=='engine-allocation')throw new Error('Actual exit cursor required');expect(f.exitCursor!.provenance.offset).toBe(failure==='lock'?20:24);if(failure==='unlock')expect(f.exitTableSixth!.provenance).toMatchObject({kind:'source',type:'code',address:'300307f1'});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076719').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3007670e').at(-1)?.returned).toBe(true);
});


it('retains original reference-base parser caller when its arena is unavailable',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const malloc=NativeModuleCrtOwner.prototype.malloc;let interrupted=false;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){if(bytes===4104&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>14145){interrupted=true;return {known:false,reason:'Interrupted original reference-base arena request'};}return malloc.call(this,bytes);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe('30672ec7');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.onexitLockHeld).toBe(false);expect(f.typeNameFourthCStringCopyReturned).toBe(true);expect(f.typeNameFourthCString!.backing.freed).toBe(false);expect(f.exitTableSixth!.provenance).toMatchObject({kind:'source',type:'code',address:'300307f1'});const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot');if(!root.known)throw new Error(root.reason);expect(root.value.maskedWord(0)).toMatchObject({value:0,knownMask:0xffffffff});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30076773').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b2d3').at(-1)?.returned).toBe(false);
});


it('retains original reference-base qualifier caller when its RTTI byte is unknown',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned;let interrupted=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===30&&offset===10&&width===1&&bootstrap.attachProgress().engineCinitProgress?.pc==='3069aadf'){this.knownMask[10]=0;interrupted=true;}return read.call(this,offset,width);});try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe('3069aadf');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.typeNameFourthCStringCopyReturned).toBe(true);expect(f.typeNameFourthCString!.backing.freed).toBe(false);expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:10});const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot'),info=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseTypeInfo');if(!root.known||!info.known)throw new Error('Actual reference-base images required');expect(root.value.maskedWord(0)).toMatchObject({value:0,knownMask:0xffffffff});expect(info.value.knownMask[10]).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b8fe').at(-1)?.returned).toBe(false);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069acca'&&!c.returned)).toHaveLength(0);
});

it('retains reference-base class keyword prefix when its third write is unavailable',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const write=NativeHeapObjectViews.prototype.writeUnsigned;let interrupted:NativeHeapObjectViews|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){
  if(this.bytes.length===4104&&offset===4014&&width===1&&value===97&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>15002){interrupted=this;throw new Error('Reference-base class keyword destination unavailable');}
  return write.call(this,offset,value,width);
 });
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!,arena=interrupted as NativeHeapObjectViews|null;
 if(!arena)throw new Error('Actual interrupted reference-base class allocation required');
 expect(f.pc).toBe('30696f4b');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 expect(arena.backing.freed).toBe(false);expect(Buffer.from(arena.bytes.subarray(4012,4014)).toString()).toBe('cl');
 expect([...arena.knownMask.subarray(4012,4018)]).toEqual([255,255,0,0,0,0]);expect(arena.readUnsigned(4032)).toBe(6);
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:arena,offset:0},4104).known).toBe(true);
 expect(f.typeNameFourthCStringCopyReturned).toBe(true);expect(f.typeNameFourthCString!.backing.freed).toBe(false);
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot');if(!root.known)throw new Error(root.reason);
 expect(root.value.maskedWord(0)).toMatchObject({value:0,knownMask:0xffffffff});
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='306973b2').at(-1)?.returned).toBe(false);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='30699505'&&!c.returned)).toHaveLength(0);
});

it('retains reference-base name copy when a source character is unknown',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.readUnsigned,write=NativeHeapObjectViews.prototype.writeUnsigned;
 let interrupted=false,nameArena:NativeHeapObjectViews|null=null,nameOffset=-1;
 const reader=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(this.bytes.length===30&&offset===19&&width===1&&bootstrap.attachProgress().engineCinitProgress?.pc==='30696f47'){this.knownMask[19]=0;interrupted=true;}
  return read.call(this,offset,width);
 });
 const writer=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){
  if(nameOffset<0&&this.bytes.length===4104&&width===1&&value===98&&(bootstrap.attachProgress().engineCinitProgress?.operations??0)>15323){nameArena=this;nameOffset=offset;}
  return write.call(this,offset,value,width);
 });
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{reader.mockRestore();writer.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!,arena=nameArena as NativeHeapObjectViews|null;
 if(!arena)throw new Error('Actual reference-base identifier allocation required');
 expect(interrupted).toBe(true);expect(f.pc).toBe('30696f47');expect(f.undecorationLockHeld).toBe(true);expect(arena.backing.freed).toBe(false);
 expect(Buffer.from(arena.bytes.subarray(nameOffset,nameOffset+7)).toString()).toBe('bCObjec');
 expect([...arena.knownMask.subarray(nameOffset,nameOffset+15)]).toEqual([...Array(7).fill(255),...Array(8).fill(0)]);
 expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:27});
 expect(f.typeNameFourthCString!.backing.freed).toBe(false);
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot');if(!root.known)throw new Error(root.reason);
 expect(root.value.maskedWord(0)).toMatchObject({value:0,knownMask:0xffffffff});
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='3069778c').at(-1)?.returned).toBe(false);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='306994ad'&&!c.returned)).toHaveLength(0);
});

it('retains reference-base identifier return when its stack cookie is unknown',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.readUnsigned;let interrupted=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(this===bootstrap.physical.securityCookie&&offset===0&&(width??4)===4){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3067746c'&&f.operations>16031){this.knownMask[0]=0;interrupted=true;}}
  return read.call(this,offset,width);
 });
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe('3067746c');
 expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.typeNameFourthCString!.backing.freed).toBe(false);
 const arenaPointer=f.undecorationFieldWords![0]!.provenance;if(arenaPointer?.kind!=='engine-allocation')throw new Error('Actual retained reference-base arena required');
 const arena=arenaPointer.fields,nameOffset=Buffer.from(arena.bytes).indexOf(Buffer.from('bCObjectRefBase'));
 expect(arena.backing.freed).toBe(false);expect(nameOffset).toBeGreaterThanOrEqual(0);expect([...arena.knownMask.subarray(nameOffset,nameOffset+15)]).toEqual(Array(15).fill(255));
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='306994c9').at(-1)?.returned).toBe(true);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='306994e3').at(-1)?.returned).toBe(false);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='30699505').at(-1)?.returned).toBe(false);
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot');if(!root.known)throw new Error(root.reason);
 expect(root.value.maskedWord(0)).toMatchObject({value:0,knownMask:0xffffffff});
});

it('retains reference-base class append when its name link store is unavailable',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.maskedWord;let interrupted:NativeHeapObjectViews|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(this.bytes.length===4104){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30696e86'&&f.operations>16338){interrupted=this;throw new Error('Reference-base name link unavailable');}}
  return read.call(this,offset,width);
 });
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!,arena=interrupted as NativeHeapObjectViews|null;
 if(!arena)throw new Error('Actual reference-base class-list allocation required');
 expect(f.pc).toBe('30696e86');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(arena.backing.freed).toBe(false);
 expect(Buffer.from(arena.bytes.subarray(4012,4018)).toString()).toBe('class ');
 const nameOffset=Buffer.from(arena.bytes).indexOf(Buffer.from('bCObjectRefBase'));expect(nameOffset).toBeGreaterThanOrEqual(0);
 expect([...arena.knownMask.subarray(nameOffset,nameOffset+15)]).toEqual(Array(15).fill(255));
 expect(f.typeNameFourthCStringCopyReturned).toBe(true);expect(f.typeNameFourthCString!.backing.freed).toBe(false);
 expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',offset:24});
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot');if(!root.known)throw new Error(root.reason);
 expect(root.value.maskedWord(0)).toMatchObject({value:0,knownMask:0xffffffff});
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='3069794e').at(-1)?.returned).toBe(false);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b528').at(-1)?.returned).toBe(false);
});

it.each(['length dispatch','output allocator'] as const)('retains reference-base name caller when its %s is unavailable',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.readUnsigned,malloc=NativeModuleCrtOwner.prototype.malloc;let interrupted=false,retainedRoot:NativeHeapObjectViews|null=null;
 const reader=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(failure==='length dispatch'&&this.bytes.length===12&&this.bytes[0]===12&&this.bytes[1]===116&&this.bytes[2]===105&&this.bytes[3]===48&&offset===0&&(width??4)===4){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30697129'&&f.operations>16908){const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot');if(!root.known)throw new Error(root.reason);retainedRoot=root.value;this.knownMask[0]=0;interrupted=true;}}
  return read.call(this,offset,width);
 });
 const allocator=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){
  if(failure==='output allocator'&&bytes===24){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30672ec7'&&f.operations>16908){interrupted=true;return {known:false,reason:'Reference-base output allocation unavailable'};}}
  return malloc.call(this,bytes);
 });
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{reader.mockRestore();allocator.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);
 expect(f.pc).toBe(failure==='length dispatch'?'30697129':'30672ec7');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 if(failure==='length dispatch')expect(f.undecorationParserWords).toBeNull();else expect(f.undecorationParserWords![6]!.value).toBe(22);
 const list=f.undecorationCopiedTypeWords![0]!.provenance;if(list?.kind!=='engine-allocation')throw new Error('Actual returned reference-base class list required');
 expect(list.fields.backing.freed).toBe(false);expect(Buffer.from(list.fields.bytes).includes(Buffer.from('bCObjectRefBase'))).toBe(true);
 expect(f.typeNameFourthCStringCopyReturned).toBe(true);expect(f.typeNameFourthCString!.backing.freed).toBe(false);
 if(failure==='length dispatch'){const root=retainedRoot as NativeHeapObjectViews|null;if(!root)throw new Error('Root retained before readonly evidence changed required');expect(root.maskedWord(0)).toMatchObject({value:0,knownMask:0xffffffff});}else{const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot');if(!root.known)throw new Error(root.reason);expect(root.value.maskedWord(0)).toMatchObject({value:0,knownMask:0xffffffff});}
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.filter(c=>c.site=== (failure==='length dispatch'?'3069b0a2':'3069b0b4')).at(-1)?.returned).toBe(false);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce'&&!c.returned)).toHaveLength(0);
});

it.each(['source character','terminator write'] as const)('retains reference-base output writer when its %s is unavailable',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.readUnsigned,write=NativeHeapObjectViews.prototype.writeUnsigned;let interrupted=false;
 const reader=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(failure==='source character'&&this.bytes.length===4104&&width===1&&this.bytes[offset]===116){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30696f47'&&f.operations>17007){this.knownMask[offset]=0;interrupted=true;}}
  return read.call(this,offset,width);
 });
 const writer=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){
  if(failure==='terminator write'&&this.bytes.length===24&&offset===21&&value===0&&width===1){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='306971f6'&&f.operations>17007){interrupted=true;throw new Error('Reference-base output terminator unavailable');}}
  return write.call(this,offset,value,width);
 });
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{reader.mockRestore();writer.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!,output=f.undecorationOutput!;expect(interrupted).toBe(true);
 expect(f.pc).toBe(failure==='source character'?'30696f47':'306971f6');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const prefix=failure==='source character'?'class bCObjec':'class bCObjectRefBase';
 expect(output.backing.freed).toBe(false);expect(Buffer.from(output.bytes.subarray(0,prefix.length)).toString()).toBe(prefix);
 expect([...output.knownMask]).toEqual([...Array(prefix.length).fill(255),...Array(24-prefix.length).fill(0)]);
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:output,offset:0},24).known).toBe(true);
 expect(f.typeNameFourthCString!.backing.freed).toBe(false);expect(f.undecorationParserWords![6]!.value).toBe(22);
 const list=f.undecorationCopiedTypeWords![0]!.provenance;if(list?.kind!=='engine-allocation')throw new Error('Actual retained reference-base list required');expect(list.fields.backing.freed).toBe(false);
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot');if(!root.known)throw new Error(root.reason);
 expect(root.value.maskedWord(0)).toMatchObject({value:0,knownMask:0xffffffff});
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce').at(-1)?.returned).toBe(false);
});

it.each(['output byte','terminator write'] as const)('retains reference-base name parser when its %s is unavailable',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.readUnsigned,write=NativeHeapObjectViews.prototype.writeUnsigned;let interrupted=false;
 const reader=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(failure==='output byte'&&this.bytes.length===24&&offset===8&&width===1){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3069b0f3'&&f.operations>17430){this.knownMask[8]=0;interrupted=true;}}
  return read.call(this,offset,width);
 });
 const writer=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){
  if(failure==='terminator write'&&this.bytes.length===24&&offset===21&&value===0&&width===1){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3069b0fb'&&f.operations>17430){interrupted=true;throw new Error('Reference-base parser terminator unavailable');}}
  return write.call(this,offset,value,width);
 });
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{reader.mockRestore();writer.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!,output=f.undecorationOutput!;expect(interrupted).toBe(true);
 expect(f.pc).toBe(failure==='output byte'?'3069b0f3':'3069b0fb');expect(f.undecorationLockHeld).toBe(true);expect(output.backing.freed).toBe(false);
 expect(Buffer.from(output.bytes.subarray(0,21)).toString()).toBe('class bCObjectRefBase');
 const masks=[...Array(22).fill(255),0,0];if(failure==='output byte')masks[8]=0;expect([...output.knownMask]).toEqual(masks);
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:output,offset:0},24).known).toBe(true);
 const list=f.undecorationCopiedTypeWords![0]!.provenance;if(list?.kind!=='engine-allocation')throw new Error('Actual reference-base parser list required');expect(list.fields.backing.freed).toBe(false);
 expect(f.typeNameFourthCString!.backing.freed).toBe(false);
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot');if(!root.known)throw new Error(root.reason);
 expect(root.value.maskedWord(0)).toMatchObject({value:0,knownMask:0xffffffff});
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce').at(-1)?.returned).toBe(true);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b2de').at(-1)?.returned).toBe(false);
});

it.each(['arena release','lock release'] as const)('retains reference-base undecoration caller when its %s is unavailable',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const free=NativeModuleCrtOwner.prototype.free,unlock=NativeModuleCrtOwner.prototype.unlock;let interrupted=false;
 const release=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){
  if(failure==='arena release'&&this===crt){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30672f8a'&&f.operations>17613){interrupted=true;return {known:false,reason:'Reference-base arena release unavailable'};}}
  return free.call(this,backing);
 });
 const lock=vi.spyOn(NativeModuleCrtOwner.prototype,'unlock').mockImplementation(function(this:NativeModuleCrtOwner,id){
  if(failure==='lock release'&&this===crt&&id===5){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3069b307'&&f.operations>17613){interrupted=true;return {known:false,reason:'Reference-base unlock unavailable'};}}
  return unlock.call(this,id);
 });
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{release.mockRestore();lock.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!,output=f.undecorationOutput!;expect(interrupted).toBe(true);
 expect(f.pc).toBe(failure==='arena release'?'30672f8a':'3069b307');expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 expect(output.backing.freed).toBe(false);expect(Buffer.from(output.bytes.subarray(0,22)).toString()).toBe('class bCObjectRefBase\0');
 expect([...output.knownMask]).toEqual([...Array(22).fill(255),0,0]);
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:output,offset:0},24).known).toBe(true);
 const list=f.undecorationCopiedTypeWords![0]!.provenance;if(list?.kind!=='engine-allocation')throw new Error('Actual retained reference-base list required');
 expect(list.fields.backing.freed).toBe(failure==='lock release');
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:list.fields,offset:list.offset},12).known).toBe(failure==='arena release');
 expect(f.typeNameFourthCString!.backing.freed).toBe(false);
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseRoot');if(!root.known)throw new Error(root.reason);
 expect(root.value.maskedWord(0)).toMatchObject({value:0,knownMask:0xffffffff});
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='3069661c').at(-1)?.returned).toBe(failure==='lock release');
 expect(graph.value.snapshot().calls.filter(c=>c.site==='3067dac6').at(-1)?.returned).toBe(false);
 if(failure==='lock release')expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b307').at(-1)?.returned).toBe(false);
});


it.each([0,255])('scans reference-base name with unknown padding bits %s',padding=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 let completed:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;const image=NativeEngineCinitImages.imageForCrt;const capture=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((...args)=>{if(args[2]==='matrixPropertyFlags'&&!completed){const p=bootstrap.attachProgress().engineCinitProgress;if(p?.pc==='30015fbe')completed=p;}return image(...args);});
 const read=NativeHeapObjectViews.prototype.maskedWord;let observed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===24&&offset===20&&(width??4)===4&&this.bytes[0]===99&&this.bytes[6]===98){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30679b00'&&f.operations>17657){observed=true;this.bytes[22]=padding;this.bytes[23]=padding;}}return read.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();capture.mockRestore();}
 const f=completed as ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress'];if(!f)throw new Error('Actual padding observation before matrix entry required');expect(observed).toBe(true);expect(f).toMatchObject({pc:'30015fbe',typeNameLength:21,undecorationLockHeld:false,typeNameLockHeld:false});expect([...f.undecorationOutput!.knownMask]).toEqual([...Array(22).fill(255),0,0]);expect([...f.undecorationOutput!.bytes.slice(22)]).toEqual([padding,padding]);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067dadd').at(-1)).toMatchObject({returned:true});
});

it('keeps reference-base scan pending when its terminator is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.maskedWord;let observed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===24&&offset===20&&(width??4)===4&&this.bytes[0]===99&&this.bytes[6]===98){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30679b00'&&f.operations>17657){observed=true;this.knownMask[21]=0;}}return read.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(observed).toBe(true);expect(f.pc).toBe('30679b11');expect(f.typeNameLength).toBe(18);expect(f.undecorationOutput!.knownMask[21]).toBe(0);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067dadd').at(-1)).toMatchObject({returned:false});
});


it.each([8,22])('retains reference-base cache state when allocation %s is unavailable',request=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const malloc=NativeModuleCrtOwner.prototype.malloc;let interrupted=false;
 const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){if(this===crt&&bytes===request){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30672ec7'&&f.operations>17723){interrupted=true;return {known:false,reason:'Interrupted original reference-base cache allocator'};}}return malloc.call(this,bytes);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe('30672ec7');expect(f.typeNameLength).toBe(21);expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationLockHeld).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(Buffer.from(f.undecorationOutput!.bytes.slice(0,22)).toString()).toBe('class bCObjectRefBase\0');
 if(request===22){expect(f.typeNameCacheNode!.backing.freed).toBe(false);expect([...f.typeNameCacheNode!.knownMask]).toEqual(Array(8).fill(0));}
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site===(request===8?'3067db0b':'3067db1b')).at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.filter(c=>c.site==='3067dadd').at(-1)).toMatchObject({returned:true});
 const info=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseTypeInfo');if(!info.known)throw new Error(info.reason);expect(info.value.readUnsigned(4)).toBe(0);
});


it.each(['source byte','destination write'])('keeps the reference-base bounded cache copy pending on %s',failure=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.readUnsigned,write=NativeHeapObjectViews.prototype.writeUnsigned;let interrupted=false;
 const reading=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(failure==='source byte'&&this.bytes.length===24&&offset===8&&width===1){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3068a888'&&f.operations>17749){interrupted=true;this.knownMask[8]=0;}}return read.call(this,offset,width);});
 const writing=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(failure==='destination write'&&this.bytes.length===22&&offset===8&&width===1){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3068a88a'&&f.operations>17749){interrupted=true;throw new Error('Interrupted original reference-base cache write');}}return write.call(this,offset,value,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{reading.mockRestore();writing.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='source byte'?'3068a888':'3068a88a');expect(f.typeNameCopyResult).toBe(null);expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(Buffer.from(f.typeNameCacheText!.bytes.slice(0,8)).toString()).toBe('class bC');expect([...f.typeNameCacheText!.knownMask]).toEqual([...Array(8).fill(255),...Array(14).fill(0)]);expect([...f.typeNameCacheNode!.knownMask]).toEqual(Array(8).fill(0));
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db2d').at(-1)).toMatchObject({returned:false});
});


it.each(['next pointer','root pointer'])('retains the reference-base cache chain on interrupted %s publication',failure=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const word=NativeHeapObjectViews.prototype.maskedWord;let probing=false,interrupted=false;let previousRoot:NativeHeapObjectViews|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!probing&&this.bytes.length===8&&offset===4&&(width??4)===4){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f&&f.operations>17955&&f.pc==='3067db53'){const root=f.typeNameListRootWords![1]!.provenance;if(root?.kind==='engine-allocation')previousRoot=root.fields;}if(f&&f.operations>17955&&f.pc===(failure==='next pointer'?'3067db53':'3067db56')){interrupted=true;throw new Error('Interrupted original reference-base cache link');}}finally{probing=false;}}return word.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='next pointer'?'3067db53':'3067db56');expect(f.typeNameLockHeld).toBe(true);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('class bCObjectRefBase\0');
 const text=f.typeNameCacheNodeWords![0]!.provenance;if(text?.kind!=='engine-allocation')throw new Error('Actual linked cache text required');expect(text.fields).toBe(f.typeNameCacheText);expect(previousRoot).not.toBe(null);expect(previousRoot).not.toBe(f.typeNameCacheNode);if(failure==='next pointer'){const root=f.typeNameListRootWords![1]!.provenance;if(root?.kind!=='engine-allocation')throw new Error('Actual retained camera cache root required');expect(root.fields).toBe(previousRoot);expect(f.typeNameCacheNodeWords![1]!.mask).toBe(0);}else {expect(f.typeNameListRootWords![1]!.mask).toBe(0);expect(f.typeNameListRootWords![1]!.provenance).toBeUndefined();const next=f.typeNameCacheNodeWords![1]!.provenance;if(next?.kind!=='engine-allocation')throw new Error('Actual retained prior cache link required');expect(next.fields).toBe(previousRoot);expect(next.fields.backing.freed).toBe(false);}
});


it.each(['output release','lock release'])('retains reference-base type-name caller when %s is unavailable',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const free=NativeModuleCrtOwner.prototype.free,unlock=NativeModuleCrtOwner.prototype.unlock;let interrupted=false;
 const release=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,backing){if(failure==='output release'&&this===crt){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30672f8a'&&f.operations>17962&&backing===f.undecorationOutput!.backing){interrupted=true;return {known:false,reason:'Reference-base type-name output release unavailable'};}}return free.call(this,backing);});
 const lock=vi.spyOn(NativeModuleCrtOwner.prototype,'unlock').mockImplementation(function(this:NativeModuleCrtOwner,id){if(failure==='lock release'&&this===crt&&id===14){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3067db85'&&f.operations>17962){interrupted=true;return {known:false,reason:'Reference-base type-name unlock unavailable'};}}return unlock.call(this,id);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{release.mockRestore();lock.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='output release'?'30672f8a':'3067db85');expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationLockHeld).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(failure==='lock release');expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('class bCObjectRefBase\0');const root=f.typeNameListRootWords![1]!.provenance;if(root?.kind!=='engine-allocation')throw new Error('Actual published reference-base cache root required');expect(root.fields).toBe(f.typeNameCacheNode);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db65').at(-1)).toMatchObject({returned:failure==='lock release'});expect(graph.value.snapshot().calls.find(c=>c.site==='30076773')).toMatchObject({returned:false});
});


it.each([0,4])('keeps reference-base UnMangle pending on unknown search word at %s',wordOffset=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const word=NativeHeapObjectViews.prototype.maskedWord;let probing=false,interrupted=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!probing&&this.bytes.length===22&&offset===wordOffset&&(width??4)===4){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='100a7338'&&f.operations>17988){interrupted=true;this.knownMask[offset+1]=0;}}finally{probing=false;}}return word.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe('100a7343');expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.typeNameCacheText!.knownMask[wordOffset+1]).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='3007677e')).toMatchObject({returned:false});expect(graph.value.snapshot().calls.filter(c=>c.site==='1009155b').at(-1)).toMatchObject({returned:false});
});


it.each([13,21])('keeps reference-base CString scan pending on unknown byte at %s',byteOffset=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.readUnsigned;let interrupted=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(this.bytes.length===22&&offset===byteOffset&&width===1){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='10013610'&&f.operations>18076){interrupted=true;this.knownMask[offset]=0;}}return read.call(this,offset,width);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe('10013610');expect(f.typeNameCacheText!.knownMask[byteOffset]).toBe(0);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.typeNameLockHeld).toBe(false);const cursor=f.currentEaxWord!.provenance;if(cursor?.kind!=='engine-allocation')throw new Error('Actual retained CString scan cursor required');expect(cursor.fields).toBe(f.typeNameCacheText);expect(cursor.offset).toBe(byteOffset);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='1009155b').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='10091571').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.find(c=>c.site==='3007677e')).toMatchObject({returned:false});
});


it.each(['unavailable','NULL','aliased reference-base'])('retains the obsolete-class CString caller on %s allocation',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 const owner=createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const malloc=NativeMemoryAdmin.prototype.malloc;let interrupted=false;
 const spy=vi.spyOn(NativeMemoryAdmin.prototype,'malloc').mockImplementation(function(this:NativeMemoryAdmin,bytes){if(this===owner.memory&&bytes===24){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='10003cd8'&&f.operations>18315){interrupted=true;if(failure==='unavailable')return {known:false,reason:'Reference-base CString allocator unavailable'};if(failure==='NULL')return {known:true,value:null};return {known:true,value:f.typeNameFifthCString!.backing as NativeMemoryAllocation};}}return malloc.call(this,bytes);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe('10003cd8');expect(f.typeNameMemoryAdmin).toBe(owner.memory);expect(f.typeNameSixthCString).toBe(null);expect(f.typeNameSixthCStringCopyReturned).toBe(false);expect(f.typeNameFifthCString!.backing.freed).toBe(false);expect(f.typeNameFifthCString!.readUnsigned(0)).toBe(15);expect(Buffer.from(f.typeNameFifthCString!.bytes.slice(8,24)).toString()).toBe('bCObjectRefBase\0');expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'obsoleteClassStorage');if(!storage.known)throw new Error(storage.reason);expect(storage.value.readUnsigned(0)).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='1001325e').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.filter(c=>c.site==='10013623').at(-1)).toMatchObject({returned:false});
});


it.each(['unknown source mask','interrupted destination unit'])('preserves obsolete-class CString copy state on %s',failure=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const word=NativeHeapObjectViews.prototype.maskedWord;let probing=false,interrupted=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){const candidate=failure==='unknown source mask'?this.bytes.length===22&&offset===10:this.bytes.length===24&&offset===16;if(!probing&&candidate&&(width??4)===4){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='100a7a00'&&f.operations>18315&&this===(failure==='unknown source mask'?f.typeNameCacheText:f.typeNameSixthCString)){interrupted=true;if(failure==='unknown source mask')this.knownMask[13]=0;else throw new Error('Interrupted original reference-base CString copy unit');}}finally{probing=false;}}return word.call(this,offset,width);});
 const completed=captureBeforeMainCacheTemplate(bootstrap);
  try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();completed.restore();}
 const f=completed.snapshot(),text=f.typeNameSixthCString!;expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='unknown source mask'?'3003d8f7':'100a7a00');expect(text.backing.freed).toBe(false);expect(text.readUnsigned(0)).toBe(15);expect(text.readUnsigned(4,2)).toBe(1);expect(text.readUnsigned(23,1)).toBe(0);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(true);
 if(failure==='unknown source mask'){expect(f.typeNameSixthCStringCopyReturned).toBe(true);expect(text.knownMask[15]).toBe(0);expect(()=>text.readUnsigned(15,1)).toThrow();expect([...text.knownMask]).toEqual([...Array(15).fill(255),0,...Array(8).fill(255)]);}else {expect(f.typeNameSixthCStringCopyReturned).toBe(false);expect(Buffer.from(text.bytes.slice(8,16)).toString()).toBe('bCObsole');expect([...text.bytes.slice(16)]).toEqual(Array(8).fill(0));expect([...text.knownMask]).toEqual(Array(24).fill(255));}
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='1001362d').at(-1)).toMatchObject({returned:failure==='unknown source mask'});expect(graph.value.snapshot().calls.find(c=>c.site==='300767ee')).toMatchObject({returned:failure==='unknown source mask'});
});


it.each(['lock','unlock'])('keeps obsolete-class registration pending when exit %s is unavailable',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const lock=NativeModuleCrtOwner.prototype.lock,unlock=NativeModuleCrtOwner.prototype.unlock;let interrupted=false;
 const entering=vi.spyOn(NativeModuleCrtOwner.prototype,'lock').mockImplementation(function(this:NativeModuleCrtOwner,id){if(failure==='lock'&&this===crt&&id===8){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3067cfea'&&f.operations>18315){interrupted=true;return {known:false,reason:'Reference-base exit lock unavailable'};}}return lock.call(this,id);});
 const leaving=vi.spyOn(NativeModuleCrtOwner.prototype,'unlock').mockImplementation(function(this:NativeModuleCrtOwner,id){if(failure==='unlock'&&this===crt&&id===8){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3067cff3'&&f.operations>18315){interrupted=true;return {known:false,reason:'Reference-base exit unlock unavailable'};}}return unlock.call(this,id);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{entering.mockRestore();leaving.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='lock'?'3067cfea':'3067cff3');expect(f.onexitLockHeld).toBe(failure==='unlock');expect(f.typeNameSixthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameSixthCString!.bytes.slice(8)).toString()).toBe('bCObsoleteClass\0');expect(f.typeNameSixthCString!.backing.freed).toBe(false);expect(f.obsoleteClassRootWord).toMatchObject({value:0,mask:0xffffffff});expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',fields:f.exitTableAllocation,offset:failure==='lock'?28:32});
 if(failure==='unlock')expect(f.exitTableEighth!.provenance).toMatchObject({kind:'source',type:'code',address:'30018c5a'});else expect(f.exitTableEighth!.provenance).toBeUndefined();
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='300767f9')).toMatchObject({returned:false});expect(graph.value.snapshot().calls.find(c=>c.site==='30732300')).toMatchObject({returned:false});
});

it.each(['unavailable','NULL','aliased camera'])('retains the reference-base CString caller on %s allocation',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 const owner=createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const malloc=NativeMemoryAdmin.prototype.malloc;let interrupted=false;
 const spy=vi.spyOn(NativeMemoryAdmin.prototype,'malloc').mockImplementation(function(this:NativeMemoryAdmin,bytes){if(this===owner.memory&&bytes===24){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='10003cd8'&&f.operations>18157){interrupted=true;if(failure==='unavailable')return {known:false,reason:'Reference-base CString allocator unavailable'};if(failure==='NULL')return {known:true,value:null};return {known:true,value:f.typeNameFourthCString!.backing as NativeMemoryAllocation};}}return malloc.call(this,bytes);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe('10003cd8');expect(f.typeNameMemoryAdmin).toBe(owner.memory);expect(f.typeNameFifthCString).toBe(null);expect(f.typeNameFifthCStringCopyReturned).toBe(false);expect(f.typeNameFourthCString!.backing.freed).toBe(false);expect(f.typeNameFourthCString!.readUnsigned(0)).toBe(12);expect(Buffer.from(f.typeNameFourthCString!.bytes.slice(8,21)).toString()).toBe('eCCameraBase\0');expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'objectRefBaseStorage');if(!storage.known)throw new Error(storage.reason);expect(storage.value.readUnsigned(0)).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='1001325e').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.filter(c=>c.site==='10013623').at(-1)).toMatchObject({returned:false});
});


it.each(['unknown source mask','interrupted destination unit'])('preserves reference-base CString copy state on %s',failure=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const word=NativeHeapObjectViews.prototype.maskedWord;let probing=false,interrupted=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){const candidate=failure==='unknown source mask'?this.bytes.length===22&&offset===10:this.bytes.length===24&&offset===16;if(!probing&&candidate&&(width??4)===4){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='100a7a00'&&f.operations>=18182&&this===(failure==='unknown source mask'?f.typeNameCacheText:f.typeNameFifthCString)){interrupted=true;if(failure==='unknown source mask')this.knownMask[13]=0;else throw new Error('Interrupted original reference-base CString copy unit');}}finally{probing=false;}}return word.call(this,offset,width);});
 const completed=captureBeforeMainCacheTemplate(bootstrap);
  try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();completed.restore();}
 const f=completed.snapshot(),text=f.typeNameFifthCString!;expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='unknown source mask'?'3003d8f7':'100a7a00');expect(text.backing.freed).toBe(false);expect(text.readUnsigned(0)).toBe(15);expect(text.readUnsigned(4,2)).toBe(1);expect(text.readUnsigned(23,1)).toBe(0);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(true);
 if(failure==='unknown source mask'){expect(f.typeNameFifthCStringCopyReturned).toBe(true);expect(text.knownMask[15]).toBe(0);expect(()=>text.readUnsigned(15,1)).toThrow();expect([...text.knownMask]).toEqual([...Array(15).fill(255),0,...Array(8).fill(255)]);}else {expect(f.typeNameFifthCStringCopyReturned).toBe(false);expect(Buffer.from(text.bytes.slice(8,16)).toString()).toBe('bCObject');expect([...text.bytes.slice(16)]).toEqual(Array(8).fill(0));expect([...text.knownMask]).toEqual(Array(24).fill(255));}
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='1001362d').at(-1)).toMatchObject({returned:failure==='unknown source mask'});expect(graph.value.snapshot().calls.find(c=>c.site==='3007677e')).toMatchObject({returned:failure==='unknown source mask'});
});


it.each(['lock','unlock'])('keeps reference-base registration pending when exit %s is unavailable',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const lock=NativeModuleCrtOwner.prototype.lock,unlock=NativeModuleCrtOwner.prototype.unlock;let interrupted=false;
 const entering=vi.spyOn(NativeModuleCrtOwner.prototype,'lock').mockImplementation(function(this:NativeModuleCrtOwner,id){if(failure==='lock'&&this===crt&&id===8){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3067cfea'&&f.operations>18191){interrupted=true;return {known:false,reason:'Reference-base exit lock unavailable'};}}return lock.call(this,id);});
 const leaving=vi.spyOn(NativeModuleCrtOwner.prototype,'unlock').mockImplementation(function(this:NativeModuleCrtOwner,id){if(failure==='unlock'&&this===crt&&id===8){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3067cff3'&&f.operations>18191){interrupted=true;return {known:false,reason:'Reference-base exit unlock unavailable'};}}return unlock.call(this,id);});
 try{expect(bootstrap.processAttach().known).toBe(false);}finally{entering.mockRestore();leaving.mockRestore();}
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='lock'?'3067cfea':'3067cff3');expect(f.onexitLockHeld).toBe(failure==='unlock');expect(f.typeNameFifthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameFifthCString!.bytes.slice(8)).toString()).toBe('bCObjectRefBase\0');expect(f.typeNameFifthCString!.backing.freed).toBe(false);expect(f.objectRefBaseRootWord).toMatchObject({value:0,mask:0xffffffff});expect(f.exitCursor!.provenance).toMatchObject({kind:'engine-allocation',fields:f.exitTableAllocation,offset:failure==='lock'?24:28});
 if(failure==='unlock')expect(f.exitTableSeventh!.provenance).toMatchObject({kind:'source',type:'code',address:'300098e0'});else expect(f.exitTableSeventh!.provenance).toBeUndefined();
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.find(c=>c.site==='30076789')).toMatchObject({returned:false});expect(graph.value.snapshot().calls.find(c=>c.site==='307322f0')).toMatchObject({returned:false});
});

it.each([1,2])('keeps the matrix property initializer pending when guard bit %s is unknown',bit=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const images=NativeEngineCinitImages.forCrt(crt);if(!images.known)throw new Error(images.reason);
 const flags=NativeEngineCinitImages.imageForCrt(images.value,crt,'matrixPropertyFlags');if(!flags.known)throw new Error(flags.reason);
 flags.value.knownMask[0]=255^bit;
 expect(bootstrap.processAttach().known).toBe(false);
 const f=bootstrap.attachProgress().engineCinitProgress!;
 expect(f.pc).toBe(bit===1?'30076827':'3007683f');
 expect(flags.value.knownMask[0]).toBe(255^bit);
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'matrixPropertyRoot');if(!root.known)throw new Error(root.reason);
 expect(root.value.readUnsigned(0)).toBe(0);
 expect(f.typeNameSixthCStringCopyReturned).toBe(true);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.find(c=>c.site==='30732310')).toMatchObject({returned:false});
 expect(graph.value.snapshot().calls.some(c=>c.site==='30076853')).toBe(false);
});

it.each(['unavailable', 'NULL', 'aliased bCString'])(
 'retains the matrix property CString caller on %s allocation', failure => {
  const {bootstrap, platform, crt} = fixture(
   {writes: [{offset: 50, width: 2, value: 0, knownMask: 0xffff}], outcome: 'normal'},
   browserGameStandardIoInputs, browserGameArgvNlsInputs, true, browserGameProcessInputs,
   {engineHeapLayout: 'rounded-eight', processorFeatureProcedure: true, floatingPointPrecisionErratum: false});
  const owner = createNativeRuntimeAdminOwner(platform,
   {memoryExtensions: [nativeNpcHeapExtension, nativeSceneStartupHeapExtension]});
  const malloc = NativeMemoryAdmin.prototype.malloc;
  let interrupted = false;
  const spy = vi.spyOn(NativeMemoryAdmin.prototype, 'malloc').mockImplementation(function(this: NativeMemoryAdmin, bytes) {
   if (this === owner.memory && bytes === 17) {
    const f = bootstrap.attachProgress().engineCinitProgress;
    if (f?.pc === '10003cd8' && f.typeNameSixthCStringCopyReturned) {
     interrupted = true;
     if (failure === 'unavailable') return {known: false, reason: 'Matrix CString allocator unavailable'};
     if (failure === 'NULL') return {known: true, value: null};
     return {known: true, value: f.typeNameSecondCString!.backing as NativeMemoryAllocation};
    }
   }
   return malloc.call(this, bytes);
  });
  try { expect(bootstrap.processAttach().known).toBe(false); } finally { spy.mockRestore(); }
  const f = bootstrap.attachProgress().engineCinitProgress!;
  expect(interrupted).toBe(true);
  expect(f.pc).toBe('10003cd8');
  expect(f.typeNameMemoryAdmin).toBe(owner.memory);
  expect(f.typeNameSeventhCString).toBe(null);
  expect(f.typeNameSeventhCStringCopyReturned).toBe(false);
  expect(f.typeNameSecondCString!.backing.freed).toBe(false);
  expect(f.typeNameSecondCString!.readUnsigned(0)).toBe(8);
  expect(Buffer.from(f.typeNameSecondCString!.bytes.slice(8,17)).toString()).toBe('bCString\0');
  expect(f.typeNameCacheText!.backing.freed).toBe(false);
  expect(f.undecorationOutput!.backing.freed).toBe(true);
  expect(f.undecorationOutput!.bytes.length).toBe(16);
  expect(f.typeNameLockHeld).toBe(false);
  const storage = NativeEngineCinitImages.imageForCrt(f.images, crt, 'matrixPropertyStorage');
  if (!storage.known) throw new Error(storage.reason);
  expect(storage.value.readUnsigned(0)).toBe(0);
  const graph = NativeX86ThreadStack.forPlatform(platform);
  if (!graph.known) throw new Error(graph.reason);
  expect(graph.value.snapshot().calls.filter(c => c.site === '1001325e').at(-1)).toMatchObject({returned: false});
  expect(graph.value.snapshot().calls.find(c => c.site === '3007685e')).toMatchObject({returned: false});
 });

it.each(['unknown source mask', 'interrupted destination unit'])(
 'preserves matrix property CString copy state on %s', failure => {
  const {bootstrap, platform} = fixture(
   {writes: [{offset: 50, width: 2, value: 0, knownMask: 0xffff}], outcome: 'normal'},
   browserGameStandardIoInputs, browserGameArgvNlsInputs, true, browserGameProcessInputs,
   {engineHeapLayout: 'rounded-eight', processorFeatureProcedure: true, floatingPointPrecisionErratum: false});
  createNativeRuntimeAdminOwner(platform,
   {memoryExtensions: [nativeNpcHeapExtension, nativeSceneStartupHeapExtension]});
  const word = NativeHeapObjectViews.prototype.maskedWord;
  let probing = false, interrupted = false;
  let outputAtCopy:NativeHeapObjectViews|null=null;
  const spy = vi.spyOn(NativeHeapObjectViews.prototype, 'maskedWord').mockImplementation(function(this: NativeHeapObjectViews, offset, width) {
   const candidate = failure === 'unknown source mask'
    ? this.bytes.length === 15 && offset === 10
    : this.bytes.length === 20 && offset === 12;
   if (!probing && candidate && (width ?? 4) === 4) {
    probing = true;
    try {
     const f = bootstrap.attachProgress().engineCinitProgress;
     if (f?.pc === '100a7a00' && f.typeNameSixthCStringCopyReturned &&
       this === (failure === 'unknown source mask' ? f.typeNameCacheText : f.typeNameSeventhCString)) {
      interrupted = true;outputAtCopy=f.undecorationOutput;
      if (failure === 'unknown source mask') this.knownMask[13] = 0;
      else throw new Error('Interrupted original matrix CString copy unit');
     }
    } finally { probing = false; }
   }
   return word.call(this, offset, width);
  });
  const completed=captureBeforeMainCacheTemplate(bootstrap);
  try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();completed.restore();}
  const f=completed.snapshot(), text = f.typeNameSeventhCString!;
  expect(interrupted).toBe(true);
  expect(f.pc).toBe(failure === 'unknown source mask' ? '3003d8f7' : '100a7a00');
  expect(text.backing.freed).toBe(false);
  expect(text.readUnsigned(0)).toBe(8);
  expect(text.readUnsigned(4,2)).toBe(1);
  expect(text.readUnsigned(16,1)).toBe(0);
  expect(f.typeNameCacheText!.backing.freed).toBe(false);
  expect(f.undecorationOutput!.backing.freed).toBe(true);
  expect(outputAtCopy!.bytes.length).toBe(16);expect(outputAtCopy!.backing.freed).toBe(true);
  if (failure === 'unknown source mask') {
   expect(f.typeNameSeventhCStringCopyReturned).toBe(true);
   expect(text.knownMask[15]).toBe(0);
   expect(() => text.readUnsigned(15,1)).toThrow();
   expect([...text.knownMask]).toEqual([...Array(15).fill(255), 0, ...Array(4).fill(255)]);
  } else {
   expect(f.typeNameSeventhCStringCopyReturned).toBe(false);
   expect(Buffer.from(text.bytes.slice(8,12)).toString()).toBe('bCMa');
   expect([...text.bytes.slice(12)]).toEqual(Array(8).fill(0));
   expect([...text.knownMask]).toEqual(Array(20).fill(255));
  }
  const graph = NativeX86ThreadStack.forPlatform(platform);
  if (!graph.known) throw new Error(graph.reason);
  expect(graph.value.snapshot().calls.filter(c => c.site === '1001362d').at(-1)).toMatchObject({returned: failure === 'unknown source mask'});
  expect(graph.value.snapshot().calls.find(c => c.site === '3007685e')).toMatchObject({returned: failure === 'unknown source mask'});
 });

it.each(['lock', 'unlock'])(
 'keeps matrix property registration pending when exit %s is unavailable', failure => {
  const {bootstrap, platform, crt} = fixture(
   {writes: [{offset: 50, width: 2, value: 0, knownMask: 0xffff}], outcome: 'normal'},
   browserGameStandardIoInputs, browserGameArgvNlsInputs, true, browserGameProcessInputs,
   {engineHeapLayout: 'rounded-eight', processorFeatureProcedure: true, floatingPointPrecisionErratum: false});
  createNativeRuntimeAdminOwner(platform,
   {memoryExtensions: [nativeNpcHeapExtension, nativeSceneStartupHeapExtension]});
  const lock = NativeModuleCrtOwner.prototype.lock, unlock = NativeModuleCrtOwner.prototype.unlock;
  let interrupted = false;
  const entering = vi.spyOn(NativeModuleCrtOwner.prototype, 'lock').mockImplementation(function(this: NativeModuleCrtOwner, id) {
   if (failure === 'lock' && this === crt && id === 8) {
    const f = bootstrap.attachProgress().engineCinitProgress;
    if (f?.pc === '3067cfea' && f.typeNameSeventhCStringCopyReturned) {
     interrupted = true;
     return {known: false, reason: 'Matrix exit lock unavailable'};
    }
   }
   return lock.call(this, id);
  });
  const leaving = vi.spyOn(NativeModuleCrtOwner.prototype, 'unlock').mockImplementation(function(this: NativeModuleCrtOwner, id) {
   if (failure === 'unlock' && this === crt && id === 8) {
    const f = bootstrap.attachProgress().engineCinitProgress;
    if (f?.pc === '3067cff3' && f.typeNameSeventhCStringCopyReturned) {
     interrupted = true;
     return {known: false, reason: 'Matrix exit unlock unavailable'};
    }
   }
   return unlock.call(this, id);
  });
  try { expect(bootstrap.processAttach().known).toBe(false); }
  finally { entering.mockRestore(); leaving.mockRestore(); }
  const f = bootstrap.attachProgress().engineCinitProgress!;
  expect(interrupted).toBe(true);
  expect(f.pc).toBe(failure === 'lock' ? '3067cfea' : '3067cff3');
  expect(f.onexitLockHeld).toBe(failure === 'unlock');
  expect(f.typeNameSeventhCStringCopyReturned).toBe(true);
  expect(Buffer.from(f.typeNameSeventhCString!.bytes.slice(8,17)).toString()).toBe('bCMatrix\0');
  expect(f.typeNameSeventhCString!.backing.freed).toBe(false);
  expect(f.matrixPropertyRootWord).toMatchObject({value: 0, mask: 0xffffffff});
  expect(f.exitCursor!.provenance).toMatchObject({kind: 'engine-allocation', fields: f.exitTableAllocation, offset: failure === 'lock' ? 32 : 36});
  if (failure === 'unlock') expect(f.exitTableNinth!.provenance).toMatchObject({kind: 'source', type: 'code', address: '3000be1f'});
  else expect(f.exitTableNinth!.provenance).toBeUndefined();
  const graph = NativeX86ThreadStack.forPlatform(platform);
  if (!graph.known) throw new Error(graph.reason);
  expect(graph.value.snapshot().calls.find(c => c.site === '30076869')).toMatchObject({returned: false});
  expect(graph.value.snapshot().calls.find(c => c.site === '30732310')).toMatchObject({returned: false});
 });

it('completes the original vector, vector2 and rectangle properties through their physical callers', () => {
 const {bootstrap, platform, crt} = fixture(
  {writes: [{offset: 50, width: 2, value: 0, knownMask: 0xffff}], outcome: 'normal'},
  browserGameStandardIoInputs, browserGameArgvNlsInputs, true, browserGameProcessInputs,
  {engineHeapLayout: 'rounded-eight', processorFeatureProcedure: true, floatingPointPrecisionErratum: false});
 createNativeRuntimeAdminOwner(platform,
  {memoryExtensions: [nativeNpcHeapExtension, nativeSceneStartupHeapExtension]});
 let completed:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;
 const lookup=NativeEngineCinitImages.imageForCrt;
 const spy=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((images,owner,label)=>{
  if(label==='boolPropertyFlags'&&bootstrap.attachProgress().engineCinitProgress?.pc==='3000c0b8')completed=bootstrap.attachProgress().engineCinitProgress;
  return lookup(images,owner,label);
 });
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result.known).toBe(false);expect(completed).not.toBe(null);
 const f=completed!;expect(f.pc).toBe('3000c0b8');
 const properties=[
  {fields:f.typeNameEighthCString,returned:f.typeNameEighthCStringCopyReturned,name:'bCVector',request:17,capacity:20,prefix:'vectorProperty',root:f.vectorPropertyRootWord},
  {fields:f.typeNameNinthCString,returned:f.typeNameNinthCStringCopyReturned,name:'bCVector2',request:18,capacity:20,prefix:'vector2Property',root:f.vector2PropertyRootWord},
  {fields:f.typeNameTenthCString,returned:f.typeNameTenthCStringCopyReturned,name:'bCRect',request:15,capacity:16,prefix:'rectProperty',root:f.rectPropertyRootWord},
 ] as const;
 for(const property of properties){
  const text=property.fields!;expect(property.returned).toBe(true);
  expect(text.backing).toMatchObject({requestedBytes:property.request,capacity:property.capacity,freed:false});
  expect(text.readUnsigned(0)).toBe(property.name.length);expect(text.readUnsigned(4,2)).toBe(1);
  expect(Buffer.from(text.bytes.slice(8,9+property.name.length)).toString()).toBe(property.name+'\0');
  expect([...text.knownMask.slice(8,9+property.name.length)]).toEqual(Array(property.name.length+1).fill(255));
  const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,`${property.prefix}Storage`);
  const flags=NativeEngineCinitImages.imageForCrt(f.images,crt,`${property.prefix}Flags`);
  if(!storage.known)throw new Error(storage.reason);if(!flags.known)throw new Error(flags.reason);
  expect(flags.value.readUnsigned(0)).toBe(3);expect(storage.value.readUnsigned(4)).toBe(0);
  const root=property.root!.provenance;if(root?.kind!=='engine-image')throw new Error('Original owned property root required');
  expect(root.fields).toBe(storage.value);expect(root.offset).toBe(0);
 }
 const strings=[f.typeNameCString,f.typeNameSecondCString,f.typeNameThirdCString,f.typeNameFourthCString,f.typeNameFifthCString,f.typeNameSixthCString,f.typeNameSeventhCString,...properties.map(p=>p.fields)];
 expect(new Set(strings).size).toBe(10);for(const fields of strings)expect(fields!.backing.freed).toBe(false);
 expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.undecorationOutput!.bytes.length).toBe(16);
 expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('class bCRect\0');
 expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.onexitLockHeld).toBe(false);
 expect(f.exitTableTenth!.provenance).toMatchObject({kind:'source',type:'code',address:'30011e3c'});
 expect(f.exitTableEleventh!.provenance).toMatchObject({kind:'source',type:'code',address:'300057ae'});
 expect(f.exitTableTwelfth!.provenance).toMatchObject({kind:'source',type:'code',address:'3004214a'});
 expect(f.exitCursor!.provenance).toMatchObject({offset:48});expect(f.cppCursor!.provenance).toMatchObject({offset:0x12c});
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 for(const site of ['30732320','300768c3','300768ce','300768d9','30732330','30076933','3007693e','30076949','30732340','300769a3','300769ae','300769b9'])expect(graph.value.snapshot().calls.find(c=>c.site===site)).toMatchObject({returned:true});
});

const nextClassProperties = [
 {name:'bCBox', prefix:'boxProperty', entry:'3003eecd', callback:'307323e0', guardOne:'30076ea7', guardTwo:'30076ebf', typeCall:'30076ed3', request:14, ordinal:'Twentieth', previous:'Nineteenth', retained:'typeNameTwelfthCString'},
 {name:'eCProcessibleElement', prefix:'processibleElementProperty', entry:'3003470c', callback:'307323f0', guardOne:'30076f17', guardTwo:'30076f2f', typeCall:'30076f43', request:29, ordinal:'TwentyFirst', previous:'Twentieth', retained:'typeNameTwelfthCString'},
 {name:'eCEntityPropertySet', prefix:'entityPropertySetProperty', entry:'3002325e', callback:'30732400', guardOne:'30076f87', guardTwo:'30076f9f', typeCall:'30076fb3', request:28, ordinal:'TwentySecond', previous:'TwentyFirst', retained:'typeNameTwelfthCString'},
 {name:'eCBaseCache', prefix:'baseCacheProperty', entry:'3002de43', callback:'30732410', guardOne:'30076ff7', guardTwo:'3007700f', typeCall:'30077023', request:20, ordinal:'TwentyThird', previous:'TwentySecond', retained:'typeNameTwelfthCString'},
 {name:'eCResourceStorageContext', prefix:'resourceStorageContextProperty', entry:'30008cab', callback:'30732420', guardOne:'30077067', guardTwo:'3007707f', typeCall:'30077093', request:33, ordinal:'TwentyFourth', previous:'TwentyThird', retained:'typeNameTwelfthCString'},
 {name:'eCResourceBase_PS', prefix:'resourceBaseProperty', entry:'3001a89d', callback:'30732430', guardOne:'300770d7', guardTwo:'300770ef', typeCall:'30077103', request:26, ordinal:'TwentyFifth', previous:'TwentyFourth', retained:'typeNameTwelfthCString'},
 {name:'eCMainCache', prefix:'mainCacheProperty', entry:'3000bf41', callback:'30732440', guardOne:'30077147', guardTwo:'3007715f', typeCall:'30077173', request:20, ordinal:'TwentySixth', previous:'TwentyFifth', retained:'typeNameTwelfthCString'},
 {name:'eCResourceAdmin', prefix:'resourceAdminProperty', entry:'3003bb42', callback:'30732450', guardOne:'300771b7', guardTwo:'300771cf', typeCall:'300771e3', request:24, ordinal:'TwentySeventh', previous:'TwentySixth', retained:'typeNameTwelfthCString'},
 {name:'GUID', prefix:'guidProperty', entry:'3001427c', callback:'307323d0', guardOne:'30076e37', guardTwo:'30076e4f', typeCall:'30076e63', request:15, ordinal:'Nineteenth', previous:'Eighteenth', retained:'typeNameTenthCString'},
 {name:'eCEngineComponentBase', prefix:'engineComponentProperty', entry:'30038a87', callback:'30732370', guardOne:'30076ac7', guardTwo:'30076adf', typeCall:'30076af3', request:30, ordinal:'Thirteenth', previous:'Twelfth', retained:'typeNameSixthCString'},
 {name:'eCIlluminationAdmin', prefix:'illuminationAdminProperty', entry:'300140b0', callback:'30732380', guardOne:'30076b57', guardTwo:'30076b6f', typeCall:'30076b83', request:28, ordinal:'Fourteenth', previous:'Thirteenth', retained:'typeNameSixthCString'},
 {name:'eCMaterialAdmin', prefix:'materialAdminProperty', entry:'3003bbb0', callback:'30732390', guardOne:'30076c27', guardTwo:'30076c3f', typeCall:'30076c53', request:24, ordinal:'Fifteenth', previous:'Fourteenth', retained:'typeNameSixthCString'},
 {name:'eCGUIManager', prefix:'guiManagerProperty', entry:'3000d34b', callback:'307323a0', guardOne:'30076ce7', guardTwo:'30076cff', typeCall:'30076d13', request:21, ordinal:'Sixteenth', previous:'Fifteenth', retained:'typeNameSixthCString'},
 {name:'eCActionMapper', prefix:'actionMapperProperty', entry:'3000b8f7', callback:'307323b0', guardOne:'30076d57', guardTwo:'30076d6f', typeCall:'30076d83', request:23, ordinal:'Seventeenth', previous:'Sixteenth', retained:'typeNameSixthCString'},
 {name:'eCContextBase', prefix:'contextBaseProperty', entry:'3004284d', callback:'307323c0', guardOne:'30076dc7', guardTwo:'30076ddf', typeCall:'30076df3', request:22, ordinal:'Eighteenth', previous:'Seventeenth', retained:'typeNameSixthCString'},
 {name:'input receiver', prefix:'inputReceiverProperty', entry:'30044a94', callback:'30732360', guardOne:'30076a57', guardTwo:'30076a6f', typeCall:'30076a83', request:24, ordinal:'Twelfth', previous:'Eleventh', retained:'typeNameSixthCString'},
 {name:'boolean', prefix:'boolProperty', entry:'3000c0b8', callback:'30732350', guardOne:'300769e7', guardTwo:'300769ff', typeCall:'30076a13', request:13, ordinal:'Eleventh', previous:'Tenth', retained:'typeNameTenthCString'},
 {name:'vector', prefix:'vectorProperty', entry:'3003f1a7', callback:'30732320', guardOne:'30076897', guardTwo:'300768af', typeCall:'300768c3', request:17, ordinal:'Eighth', previous:'Seventh', retained:'typeNameSeventhCString'},
 {name:'vector2', prefix:'vector2Property', entry:'30038852', callback:'30732330', guardOne:'30076907', guardTwo:'3007691f', typeCall:'30076933', request:18, ordinal:'Ninth', previous:'Eighth', retained:'typeNameEighthCString'},
 {name:'rectangle', prefix:'rectProperty', entry:'3001c468', callback:'30732340', guardOne:'30076977', guardTwo:'3007698f', typeCall:'300769a3', request:15, ordinal:'Tenth', previous:'Ninth', retained:'typeNameCString'},
] as const;

it.each(nextClassProperties.flatMap(property => [1,2].map(bit => ({...property,bit}))))(
 'keeps original $name property guard bit $bit pending when unknown', property => {
  const {bootstrap, platform, crt} = fixture(
   {writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},
   browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,
   {engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
  createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
  const images=NativeEngineCinitImages.forCrt(crt);if(!images.known)throw new Error(images.reason);
  const flags=NativeEngineCinitImages.imageForCrt(images.value,crt,`${property.prefix}Flags`);if(!flags.known)throw new Error(flags.reason);
  flags.value.knownMask[0]=255^property.bit;
  expect(bootstrap.processAttach().known).toBe(false);
  const f=bootstrap.attachProgress().engineCinitProgress!;
  expect(f.pc).toBe(property.bit===1?property.guardOne:property.guardTwo);
  expect(flags.value.knownMask[0]).toBe(255^property.bit);
  expect(f[`typeName${property.previous}CStringCopyReturned`]).toBe(true);
  const root=NativeEngineCinitImages.imageForCrt(f.images,crt,`${property.prefix}Root`);if(!root.known)throw new Error(root.reason);
  expect(root.value.readUnsigned(0)).toBe(0);
  const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
  expect(graph.value.snapshot().calls.find(c=>c.site===property.callback)).toMatchObject({returned:false});
  expect(graph.value.snapshot().calls.some(c=>c.site===property.typeCall)).toBe(false);
 });

it.each(nextClassProperties.flatMap(property => ['unavailable','NULL','aliased backing'].map(failure => ({...property,failure}))))(
 'retains original $name CString on $failure allocation', property => {
  const {bootstrap, platform, crt} = fixture(
   {writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},
   browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,
   {engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
  const owner=createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
  const malloc=NativeMemoryAdmin.prototype.malloc;
  let interrupted=false,retained:NativeHeapObjectViews|null=null;
  let bytes:Uint8Array|null=null,masks:Uint8Array|null=null;
  const spy=vi.spyOn(NativeMemoryAdmin.prototype,'malloc').mockImplementation(function(this:NativeMemoryAdmin,request){
   if(this===owner.memory&&request===property.request){
    const f=bootstrap.attachProgress().engineCinitProgress;
    if(f?.pc==='10003cd8'&&f[`typeName${property.previous}CStringCopyReturned`]){
     interrupted=true;retained=f[property.retained]!;bytes=retained.bytes.slice();masks=retained.knownMask.slice();
     if(property.failure==='unavailable')return {known:false,reason:'Original class CString allocator unavailable'};
     if(property.failure==='NULL')return {known:true,value:null};
     return {known:true,value:retained.backing as NativeMemoryAllocation};
    }
   }
   return malloc.call(this,request);
  });
  try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();}
  const f=bootstrap.attachProgress().engineCinitProgress!;
  expect(interrupted).toBe(true);expect(f.pc).toBe('10003cd8');
  expect(f[`typeName${property.ordinal}CString`]).toBe(null);
  expect(f[`typeName${property.ordinal}CStringCopyReturned`]).toBe(false);
  const prior=f[property.retained]!;expect(prior).toBe(retained);expect(prior.backing.freed).toBe(false);
  expect(prior.bytes).toEqual(bytes);expect(prior.knownMask).toEqual(masks);
  expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.typeNameCacheText!.backing.freed).toBe(false);
  expect(f.typeNameLockHeld).toBe(false);
  const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,`${property.prefix}Storage`);if(!storage.known)throw new Error(storage.reason);
  expect(storage.value.readUnsigned(0)).toBe(0);
  const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
  expect(graph.value.snapshot().calls.filter(c=>c.site==='1001325e').at(-1)).toMatchObject({returned:false});
  expect(graph.value.snapshot().calls.find(c=>c.site===property.callback)).toMatchObject({returned:false});
 });

it.each(['unknown tail source','interrupted tail destination'])(
 'preserves original vector2 CString byte tail on %s', failure => {
  const {bootstrap, platform} = fixture(
   {writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},
   browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,
   {engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
  createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
  const word=NativeHeapObjectViews.prototype.maskedWord;
  let probing=false,interrupted=false;
  const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
   const candidate=failure==='unknown tail source'?this.bytes.length===16&&offset===14:this.bytes.length===20&&offset===16;
   if(!probing&&candidate&&width===1){
    probing=true;
    try{
     const f=bootstrap.attachProgress().engineCinitProgress;
     if(f?.pc==='100a7a00'&&f.typeNameEighthCStringCopyReturned&&this===(failure==='unknown tail source'?f.typeNameCacheText:f.typeNameNinthCString)){
      interrupted=true;
      if(failure==='unknown tail source')this.knownMask[14]=0;
      else throw new Error('Interrupted original vector2 CString byte tail');
     }
    }finally{probing=false;}
   }
   return word.call(this,offset,width);
  });
  const completed=captureBeforeMainCacheTemplate(bootstrap);
  try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();completed.restore();}
  const f=completed.snapshot(),text=f.typeNameNinthCString!;
  expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='unknown tail source'?'3003d8f7':'100a7a00');
  expect(text.backing.freed).toBe(false);expect(text.readUnsigned(0)).toBe(9);expect(text.readUnsigned(17,1)).toBe(0);
  expect(Buffer.from(text.bytes.slice(8,16)).toString()).toBe('bCVector');
  if(failure==='unknown tail source'){
   expect(f.typeNameNinthCStringCopyReturned).toBe(true);expect(text.knownMask[16]).toBe(0);
   expect(()=>text.readUnsigned(16,1)).toThrow();
  }else{
   expect(f.typeNameNinthCStringCopyReturned).toBe(false);expect(text.readUnsigned(16,1)).toBe(0);
  }
  const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
  expect(graph.value.snapshot().calls.find(c=>c.site==='3007693e')).toMatchObject({returned:failure==='unknown tail source'});
 });

it.each([0,255])('completes the original boolean property with unknown padding bits %s',padding=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const original=NativeHeapObjectViews.prototype.maskedWord;let probing=false,observed=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(!probing&&this.bytes.length===8&&offset===4&&(width??4)===4){
   probing=true;
   try{
    const state=bootstrap.attachProgress().engineCinitProgress;
    if(state?.pc==='100a7338'&&state.typeNameTenthCStringCopyReturned&&state.typeNameCacheText?.bytes.length===5&&state.typeNameCacheText.backing===this.backing){
     observed=true;for(let i=5;i<8;i++){expect(this.knownMask[i]).toBe(0);this.bytes[i]=padding;}
    }
   }finally{probing=false;}
  }
  return original.call(this,offset,width);
 });
 let completed:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;
 const lookup=NativeEngineCinitImages.imageForCrt;
 const images=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((imageOwner,owner,label)=>{
  if(label==='inputReceiverPropertyFlags'&&bootstrap.attachProgress().engineCinitProgress?.pc==='30044a94')completed=bootstrap.attachProgress().engineCinitProgress;
  return lookup(imageOwner,owner,label);
 });
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();images.mockRestore();}
 expect(observed).toBe(true);expect(result.known).toBe(false);expect(completed).not.toBe(null);const f=completed!;
 expect(f.pc,result.known?'Unexpected completed attach':result.reason).toBe('30044a94');expect(f.typeNameEleventhCStringCopyReturned).toBe(true);
 const text=f.typeNameEleventhCString!;expect(text.backing).toMatchObject({requestedBytes:13,capacity:16,freed:false});expect(text.readUnsigned(0)).toBe(4);expect(text.readUnsigned(4,2)).toBe(1);expect(Buffer.from(text.bytes.slice(8,13)).toString()).toBe('bool\0');
 expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.undecorationOutput!.bytes.length).toBe(8);expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('bool\0');
 expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.onexitLockHeld).toBe(false);expect(f.exitTableThirteenth!.provenance).toMatchObject({kind:'source',type:'code',address:'3002ca2f'});expect(f.exitCursor!.provenance).toMatchObject({offset:52});expect(f.cppCursor!.provenance).toMatchObject({offset:0x130});
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'boolPropertyStorage');if(!storage.known)throw new Error(storage.reason);const root=f.boolPropertyRootWord!.provenance;if(root?.kind!=='engine-image')throw new Error('Actual bool root required');expect(root.fields).toBe(storage.value);expect(root.offset).toBe(0);expect(storage.value.readUnsigned(4)).toBe(0);
 const flags=NativeEngineCinitImages.imageForCrt(f.images,crt,'boolPropertyFlags');if(!flags.known)throw new Error(flags.reason);expect(flags.value.readUnsigned(0)).toBe(3);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30732350','30076a13','30076a1e','30076a29'])expect(graph.value.snapshot().calls.find(c=>c.site===site)).toMatchObject({returned:true});
});


it.each(['unknown source mask','interrupted destination'])(
 'preserves original boolean CString copy state on %s',failure=>{
  const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
  createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
  const original=NativeHeapObjectViews.prototype.maskedWord;
  let probing=false,interrupted=false;
  const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
   const candidate=failure==='unknown source mask'?this.bytes.length===5&&offset===0:this.bytes.length===16&&offset===8;
   if(!probing&&candidate&&(width??4)===4){
    probing=true;
    try{
     const f=bootstrap.attachProgress().engineCinitProgress;
     if(f?.pc==='100a7a00'&&f.typeNameTenthCStringCopyReturned&&this===(failure==='unknown source mask'?f.typeNameCacheText:f.typeNameEleventhCString)){
      interrupted=true;
      if(failure==='unknown source mask')this.knownMask[2]=0;
      else throw new Error('Interrupted original boolean CString destination');
     }
    }finally{probing=false;}
   }
   return original.call(this,offset,width);
  });
  const completed=captureBeforeMainCacheTemplate(bootstrap);
  try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();completed.restore();}
  const f=completed.snapshot(),text=f.typeNameEleventhCString!;
  expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='unknown source mask'?'3003d8f7':'100a7a00');
  expect(text.backing.freed).toBe(false);expect(text.readUnsigned(0)).toBe(4);expect(text.readUnsigned(12,1)).toBe(0);
  expect(f.typeNameEleventhCStringCopyReturned).toBe(failure==='unknown source mask');
  if(failure==='unknown source mask'){expect(text.knownMask[10]).toBe(0);expect(()=>text.readUnsigned(10,1)).toThrow();}
  else expect([...text.bytes.slice(8,12)]).toEqual([0,0,0,0]);
  const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
  expect(graph.value.snapshot().calls.find(c=>c.site==='30076a1e')).toMatchObject({returned:failure==='unknown source mask'});
 });


it('completes the original input receiver property through its physical caller',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 let completed:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;
 const lookup=NativeEngineCinitImages.imageForCrt;
 const spy=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((images,owner,label)=>{
  if(label==='engineComponentPropertyFlags'&&bootstrap.attachProgress().engineCinitProgress?.pc==='30038a87')completed=bootstrap.attachProgress().engineCinitProgress;
  return lookup(images,owner,label);
 });
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result.known).toBe(false);expect(completed).not.toBe(null);const f=completed!;
 expect(f.pc,result.known?'Unexpected complete startup':result.reason).toBe('30038a87');
 expect(f.typeNameTwelfthCStringCopyReturned).toBe(true);
 const name='eCInputReceiver',text=f.typeNameTwelfthCString!;
 expect(text.backing).toMatchObject({requestedBytes:name.length+9,capacity:24,freed:false});
 expect(text.readUnsigned(0)).toBe(name.length);expect(text.readUnsigned(4,2)).toBe(1);
 expect(Buffer.from(text.bytes.slice(8,9+name.length)).toString()).toBe(name+'\0');
 expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('class '+name+'\0');
 expect(f.undecorationOutput!.backing.freed).toBe(true);
 expect(f.exitTableFourteenth!.provenance).toMatchObject({kind:'source',type:'code',address:'30003e3b'});
 expect(f.exitCursor!.provenance).toMatchObject({offset:56});expect(f.cppCursor!.provenance).toMatchObject({offset:0x134});
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'inputReceiverPropertyStorage');if(!storage.known)throw new Error(storage.reason);
 const root=f.inputReceiverPropertyRootWord!.provenance;if(root?.kind!=='engine-image')throw new Error('Actual input receiver property root required');expect(root.fields).toBe(storage.value);expect(root.offset).toBe(0);expect(storage.value.readUnsigned(4)).toBe(0);
 const flags=NativeEngineCinitImages.imageForCrt(f.images,crt,'inputReceiverPropertyFlags');if(!flags.known)throw new Error(flags.reason);expect(flags.value.readUnsigned(0)).toBe(3);
 expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.onexitLockHeld).toBe(false);
});

it.each(['unknown source mask','interrupted destination'])(
 'preserves original input receiver CString copy state on %s',failure=>{
  const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
  createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
  const original=NativeHeapObjectViews.prototype.maskedWord;
  let probing=false,interrupted=false;
  const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
   const candidate=failure==='unknown source mask'?this.bytes.length===22&&offset===6:this.bytes.length===24&&offset===8;
   if(!probing&&candidate&&(width??4)===4){
    probing=true;
    try{
     const f=bootstrap.attachProgress().engineCinitProgress;
     if(f?.pc==='100a7a00'&&f.typeNameEleventhCStringCopyReturned&&this===(failure==='unknown source mask'?f.typeNameCacheText:f.typeNameTwelfthCString)){
      interrupted=true;
      if(failure==='unknown source mask')this.knownMask[8]=0;
      else throw new Error('Interrupted original input receiver CString destination');
     }
    }finally{probing=false;}
   }
   return original.call(this,offset,width);
  });
  const completed=captureBeforeMainCacheTemplate(bootstrap);
  try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();completed.restore();}
  const f=completed.snapshot(),text=f.typeNameTwelfthCString!;
  expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='unknown source mask'?'3003d8f7':'100a7a00');
  expect(text.backing.freed).toBe(false);expect(text.readUnsigned(0)).toBe(15);expect(text.readUnsigned(23,1)).toBe(0);
  expect(f.typeNameTwelfthCStringCopyReturned).toBe(failure==='unknown source mask');
  if(failure==='unknown source mask'){expect(text.knownMask[10]).toBe(0);expect(()=>text.readUnsigned(10,1)).toThrow();}
  else expect([...text.bytes.slice(8,12)]).toEqual([0,0,0,0]);
  const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
  expect(graph.value.snapshot().calls.find(c=>c.site==='30076a8e')).toMatchObject({returned:failure==='unknown source mask'});
 });


it('completes the original engine component and admin property batch',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 let completed:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;
 const lookup=NativeEngineCinitImages.imageForCrt;
 const spy=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((images,owner,label)=>{
  if(label==='guidPropertyFlags'&&bootstrap.attachProgress().engineCinitProgress?.pc==='3001427c')completed=bootstrap.attachProgress().engineCinitProgress;
  return lookup(images,owner,label);
 });
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result.known).toBe(false);expect(completed).not.toBe(null);const f=completed!;
 expect(f.pc,result.known?'Unexpected complete startup':result.reason).toBe('3001427c');
 expect(f.typeNameThirteenthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameThirteenthCString!.bytes.slice(8,30)).toString()).toBe('eCEngineComponentBase\0');expect(f.typeNameThirteenthCString!.backing.freed).toBe(false);
 expect(f.typeNameFourteenthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameFourteenthCString!.bytes.slice(8,28)).toString()).toBe('eCIlluminationAdmin\0');expect(f.typeNameFourteenthCString!.backing.freed).toBe(false);
 expect(f.typeNameFifteenthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameFifteenthCString!.bytes.slice(8,24)).toString()).toBe('eCMaterialAdmin\0');expect(f.typeNameFifteenthCString!.backing.freed).toBe(false);
 expect(f.typeNameSixteenthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameSixteenthCString!.bytes.slice(8,21)).toString()).toBe('eCGUIManager\0');expect(f.typeNameSixteenthCString!.backing.freed).toBe(false);
 expect(f.typeNameSeventeenthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameSeventeenthCString!.bytes.slice(8,23)).toString()).toBe('eCActionMapper\0');expect(f.typeNameSeventeenthCString!.backing.freed).toBe(false);
 expect(f.typeNameEighteenthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameEighteenthCString!.bytes.slice(8,22)).toString()).toBe('eCContextBase\0');expect(f.typeNameEighteenthCString!.backing.freed).toBe(false);
 expect(f.typeNameThirteenthCString!.backing).toMatchObject({requestedBytes:30,capacity:32,freed:false});expect(f.typeNameThirteenthCString!.readUnsigned(0)).toBe(21);expect(f.typeNameThirteenthCString!.readUnsigned(4,2)).toBe(1);
 expect(f.typeNameFourteenthCString!.backing).toMatchObject({requestedBytes:28,capacity:28,freed:false});expect(f.typeNameFourteenthCString!.readUnsigned(0)).toBe(19);expect(f.typeNameFourteenthCString!.readUnsigned(4,2)).toBe(1);
 expect(f.typeNameFifteenthCString!.backing).toMatchObject({requestedBytes:24,capacity:24,freed:false});expect(f.typeNameFifteenthCString!.readUnsigned(0)).toBe(15);expect(f.typeNameFifteenthCString!.readUnsigned(4,2)).toBe(1);
 expect(f.typeNameSixteenthCString!.backing).toMatchObject({requestedBytes:21,capacity:24,freed:false});expect(f.typeNameSixteenthCString!.readUnsigned(0)).toBe(12);expect(f.typeNameSixteenthCString!.readUnsigned(4,2)).toBe(1);
 expect(f.typeNameSeventeenthCString!.backing).toMatchObject({requestedBytes:23,capacity:24,freed:false});expect(f.typeNameSeventeenthCString!.readUnsigned(0)).toBe(14);expect(f.typeNameSeventeenthCString!.readUnsigned(4,2)).toBe(1);
 expect(f.typeNameEighteenthCString!.backing).toMatchObject({requestedBytes:22,capacity:24,freed:false});expect(f.typeNameEighteenthCString!.readUnsigned(0)).toBe(13);expect(f.typeNameEighteenthCString!.readUnsigned(4,2)).toBe(1);
 const properties=[
  {prefix:'engineComponentProperty',root:f.engineComponentPropertyRootWord,shutdown:'30042037',callback:'30732370',body:0x30076ac0},
  {prefix:'illuminationAdminProperty',root:f.illuminationAdminPropertyRootWord,shutdown:'30026864',callback:'30732380',body:0x30076b50},
  {prefix:'materialAdminProperty',root:f.materialAdminPropertyRootWord,shutdown:'300267d8',callback:'30732390',body:0x30076c20},
  {prefix:'guiManagerProperty',root:f.guiManagerPropertyRootWord,shutdown:'30030729',callback:'307323a0',body:0x30076ce0},
  {prefix:'actionMapperProperty',root:f.actionMapperPropertyRootWord,shutdown:'30025ffe',callback:'307323b0',body:0x30076d50},
  {prefix:'contextBaseProperty',root:f.contextBasePropertyRootWord,shutdown:'3003c2b3',callback:'307323c0',body:0x30076dc0},
 ] as const;
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 for(const [index,property] of properties.entries()){
  const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,`${property.prefix}Storage`),flags=NativeEngineCinitImages.imageForCrt(f.images,crt,`${property.prefix}Flags`);
  if(!storage.known)throw new Error(storage.reason);if(!flags.known)throw new Error(flags.reason);
  const root=property.root!.provenance;if(root?.kind!=='engine-image')throw new Error('Actual component/admin property root required');
  expect(root.fields).toBe(storage.value);expect(root.offset).toBe(0);expect(storage.value.readUnsigned(4)).toBe(0);expect(flags.value.readUnsigned(0)).toBe(3);
  expect(f.exitTableEntries![14+index]!.provenance).toMatchObject({kind:'source',type:'code',address:property.shutdown});
  for(const site of [property.callback,...[51,62,73].map(offset=>(property.body+offset).toString(16))])expect(graph.value.snapshot().calls.find(c=>c.site===site)).toMatchObject({returned:true});
 }
 expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.onexitLockHeld).toBe(false);
 expect(f.exitCursor!.provenance).toMatchObject({offset:80});expect(f.cppCursor!.provenance).toMatchObject({offset:0x14c});
});


it('completes the original GUID property through its physical caller',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 let completed:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;
 const lookup=NativeEngineCinitImages.imageForCrt;
 const spy=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((images,owner,label)=>{
  if(label==='boxPropertyFlags'&&bootstrap.attachProgress().engineCinitProgress?.pc==='3003eecd')completed=bootstrap.attachProgress().engineCinitProgress;
  return lookup(images,owner,label);
 });
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result.known).toBe(false);expect(completed).not.toBe(null);const f=completed!;
 expect(f.pc,result.known?'Unexpected completed startup':result.reason).toBe('3003eecd');expect(f.typeNameNineteenthCStringCopyReturned).toBe(true);
 const text=f.typeNameNineteenthCString!;expect(text.backing).toMatchObject({requestedBytes:15,capacity:16,freed:false});expect(text.readUnsigned(0)).toBe(6);expect(text.readUnsigned(4,2)).toBe(1);expect(Buffer.from(text.bytes.slice(8,15)).toString()).toBe('bCGuid\0');
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'guidPropertyStorage'),flags=NativeEngineCinitImages.imageForCrt(f.images,crt,'guidPropertyFlags');if(!storage.known)throw new Error(storage.reason);if(!flags.known)throw new Error(flags.reason);
 const root=f.guidPropertyRootWord!.provenance;if(root?.kind!=='engine-image')throw new Error('Actual GUID property root required');expect(root.fields).toBe(storage.value);expect(root.offset).toBe(0);expect(storage.value.readUnsigned(4)).toBe(0);expect(flags.value.readUnsigned(0)).toBe(3);
 expect(f.exitTableEntries![20]!.provenance).toMatchObject({kind:'source',type:'code',address:'300418d0'});expect(f.exitCursor!.provenance).toMatchObject({offset:84});expect(f.cppCursor!.provenance).toMatchObject({offset:0x150});
 expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.onexitLockHeld).toBe(false);
});

it.each(['unknown source mask','interrupted destination'])(
 'preserves original GUID CString copy state on %s',failure=>{
  const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
  createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
  const original=NativeHeapObjectViews.prototype.maskedWord;
  let probing=false,interrupted=false;
  const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
   const candidate=failure==='unknown source mask'?this.bytes.length===13&&offset===6:this.bytes.length===16&&offset===8;
   if(!probing&&candidate&&(width??4)===4){
    probing=true;
    try{
     const f=bootstrap.attachProgress().engineCinitProgress;
     if(f?.pc==='100a7a00'&&f.typeNameEighteenthCStringCopyReturned&&this===(failure==='unknown source mask'?f.typeNameCacheText:f.typeNameNineteenthCString)){
      interrupted=true;
      if(failure==='unknown source mask')this.knownMask[8]=0;
      else throw new Error('Interrupted original GUID CString destination');
     }
    }finally{probing=false;}
   }
   return original.call(this,offset,width);
  });
  const completed=captureBeforeMainCacheTemplate(bootstrap);
  try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();completed.restore();}
  const f=completed.snapshot(),text=f.typeNameNineteenthCString!;
  expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='unknown source mask'?'3003d8f7':'100a7a00');
  expect(text.backing.freed).toBe(false);expect(text.readUnsigned(0)).toBe(6);expect(text.readUnsigned(14,1)).toBe(0);
  expect(f.typeNameNineteenthCStringCopyReturned).toBe(failure==='unknown source mask');
  if(failure==='unknown source mask'){expect(text.knownMask[10]).toBe(0);expect(()=>text.readUnsigned(10,1)).toThrow();}
  else expect([...text.bytes.slice(8,12)]).toEqual([0,0,0,0]);
  const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
  expect(graph.value.snapshot().calls.find(c=>c.site==='30076e6e')).toMatchObject({returned:failure==='unknown source mask'});
 });


it('completes the original box and resource cache property batch',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const completed=captureBeforeMainCacheTemplate(bootstrap);
 let result;try{result=bootstrap.processAttach();}finally{completed.restore();}
 expect(result.known).toBe(false);const f=completed.snapshot();
 expect(f.pc,result.known?'Unexpected completed startup':result.reason).toBe('3003d8f7');
 expect(f.typeNameTwentiethCStringCopyReturned).toBe(true);expect(f.typeNameTwentiethCString!.backing).toMatchObject({requestedBytes:14,capacity:16,freed:false});expect(f.typeNameTwentiethCString!.readUnsigned(0)).toBe(5);expect(f.typeNameTwentiethCString!.readUnsigned(4,2)).toBe(1);expect(Buffer.from(f.typeNameTwentiethCString!.bytes.slice(8,14)).toString()).toBe('bCBox\0');
 expect(f.typeNameTwentyFirstCStringCopyReturned).toBe(true);expect(f.typeNameTwentyFirstCString!.backing).toMatchObject({requestedBytes:29,capacity:32,freed:false});expect(f.typeNameTwentyFirstCString!.readUnsigned(0)).toBe(20);expect(f.typeNameTwentyFirstCString!.readUnsigned(4,2)).toBe(1);expect(Buffer.from(f.typeNameTwentyFirstCString!.bytes.slice(8,29)).toString()).toBe('eCProcessibleElement\0');
 expect(f.typeNameTwentySecondCStringCopyReturned).toBe(true);expect(f.typeNameTwentySecondCString!.backing).toMatchObject({requestedBytes:28,capacity:28,freed:false});expect(f.typeNameTwentySecondCString!.readUnsigned(0)).toBe(19);expect(f.typeNameTwentySecondCString!.readUnsigned(4,2)).toBe(1);expect(Buffer.from(f.typeNameTwentySecondCString!.bytes.slice(8,28)).toString()).toBe('eCEntityPropertySet\0');
 expect(f.typeNameTwentyThirdCStringCopyReturned).toBe(true);expect(f.typeNameTwentyThirdCString!.backing).toMatchObject({requestedBytes:20,capacity:20,freed:false});expect(f.typeNameTwentyThirdCString!.readUnsigned(0)).toBe(11);expect(f.typeNameTwentyThirdCString!.readUnsigned(4,2)).toBe(1);expect(Buffer.from(f.typeNameTwentyThirdCString!.bytes.slice(8,20)).toString()).toBe('eCBaseCache\0');
 expect(f.typeNameTwentyFourthCStringCopyReturned).toBe(true);expect(f.typeNameTwentyFourthCString!.backing).toMatchObject({requestedBytes:33,capacity:40,freed:false});expect(f.typeNameTwentyFourthCString!.readUnsigned(0)).toBe(24);expect(f.typeNameTwentyFourthCString!.readUnsigned(4,2)).toBe(1);expect(Buffer.from(f.typeNameTwentyFourthCString!.bytes.slice(8,33)).toString()).toBe('eCResourceStorageContext\0');
 expect(f.typeNameTwentyFifthCStringCopyReturned).toBe(true);expect(f.typeNameTwentyFifthCString!.backing).toMatchObject({requestedBytes:26,capacity:28,freed:false});expect(f.typeNameTwentyFifthCString!.readUnsigned(0)).toBe(17);expect(f.typeNameTwentyFifthCString!.readUnsigned(4,2)).toBe(1);expect(Buffer.from(f.typeNameTwentyFifthCString!.bytes.slice(8,26)).toString()).toBe('eCResourceBase_PS\0');
 expect(f.typeNameTwentySixthCStringCopyReturned).toBe(true);expect(f.typeNameTwentySixthCString!.backing).toMatchObject({requestedBytes:20,capacity:20,freed:false});expect(f.typeNameTwentySixthCString!.readUnsigned(0)).toBe(11);expect(f.typeNameTwentySixthCString!.readUnsigned(4,2)).toBe(1);expect(Buffer.from(f.typeNameTwentySixthCString!.bytes.slice(8,20)).toString()).toBe('eCMainCache\0');
 expect(f.typeNameTwentySeventhCStringCopyReturned).toBe(true);expect(f.typeNameTwentySeventhCString!.backing).toMatchObject({requestedBytes:24,capacity:24,freed:false});expect(f.typeNameTwentySeventhCString!.readUnsigned(0)).toBe(15);expect(f.typeNameTwentySeventhCString!.readUnsigned(4,2)).toBe(1);expect(Buffer.from(f.typeNameTwentySeventhCString!.bytes.slice(8,24)).toString()).toBe('eCResourceAdmin\0');
 const properties=[
  {prefix:'boxProperty',root:f.boxPropertyRootWord,shutdown:'3003ae86',callback:'307323e0',body:0x30076ea0},
  {prefix:'processibleElementProperty',root:f.processibleElementPropertyRootWord,shutdown:'3002eac8',callback:'307323f0',body:0x30076f10},
  {prefix:'entityPropertySetProperty',root:f.entityPropertySetPropertyRootWord,shutdown:'300191ff',callback:'30732400',body:0x30076f80},
  {prefix:'baseCacheProperty',root:f.baseCachePropertyRootWord,shutdown:'30044edb',callback:'30732410',body:0x30076ff0},
  {prefix:'resourceStorageContextProperty',root:f.resourceStorageContextPropertyRootWord,shutdown:'3002301a',callback:'30732420',body:0x30077060},
  {prefix:'resourceBaseProperty',root:f.resourceBasePropertyRootWord,shutdown:'3003f5f3',callback:'30732430',body:0x300770d0},
  {prefix:'mainCacheProperty',root:f.mainCachePropertyRootWord,shutdown:'300227fa',callback:'30732440',body:0x30077140},
  {prefix:'resourceAdminProperty',root:f.resourceAdminPropertyRootWord,shutdown:'30013908',callback:'30732450',body:0x300771b0},
 ] as const;
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 for(const [index,property] of properties.entries()){
  const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,`${property.prefix}Storage`),flags=NativeEngineCinitImages.imageForCrt(f.images,crt,`${property.prefix}Flags`);
  if(!storage.known)throw new Error(storage.reason);if(!flags.known)throw new Error(flags.reason);
  const root=property.root!.provenance;if(root?.kind!=='engine-image')throw new Error('Actual resource property root required');expect(root.fields).toBe(storage.value);expect(root.offset).toBe(0);expect(storage.value.readUnsigned(4)).toBe(0);expect(flags.value.readUnsigned(0)).toBe(3);
  expect(f.exitTableEntries![21+index]!.provenance).toMatchObject({kind:'source',type:'code',address:property.shutdown});
  for(const site of [property.callback,...[51,62,73].map(offset=>(property.body+offset).toString(16))])expect(graph.value.snapshot().calls.find(c=>c.site===site)).toMatchObject({returned:true});
 }
 const strings=Object.entries(f).filter(([key,fields])=>/^typeName.*CString$/.test(key)&&fields instanceof NativeHeapObjectViews).map(([,fields])=>fields as NativeHeapObjectViews);
 expect(strings.length).toBe(27);expect(new Set(strings).size).toBe(27);for(const text of strings)expect(text.backing.freed).toBe(false);
 expect(f.exitCursor!.provenance).toMatchObject({offset:116});expect(f.cppCursor!.provenance).toMatchObject({offset:0x170});
 expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.onexitLockHeld).toBe(false);
});

it.each(['unknown tail source','interrupted tail destination'])(
 'preserves original resource-base CString byte tail on %s', failure => {
  const {bootstrap, platform} = fixture(
   {writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},
   browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,
   {engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
  createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
  const word=NativeHeapObjectViews.prototype.maskedWord;
  let probing=false,interrupted=false;
  const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
   const candidate=failure==='unknown tail source'?this.bytes.length===24&&offset===22:this.bytes.length===28&&offset===24;
   if(!probing&&candidate&&width===1){
    probing=true;
    try{
     const f=bootstrap.attachProgress().engineCinitProgress;
     if(f?.pc==='100a7a00'&&f.typeNameTwentyFourthCStringCopyReturned&&this===(failure==='unknown tail source'?f.typeNameCacheText:f.typeNameTwentyFifthCString)){
      interrupted=true;
      if(failure==='unknown tail source')this.knownMask[22]=0;
      else throw new Error('Interrupted original resource-base CString byte tail');
     }
    }finally{probing=false;}
   }
   return word.call(this,offset,width);
  });
  const completed=captureBeforeMainCacheTemplate(bootstrap);
  try{expect(bootstrap.processAttach().known).toBe(false);}finally{spy.mockRestore();completed.restore();}
  const f=completed.snapshot(),text=f.typeNameTwentyFifthCString!;
  expect(interrupted).toBe(true);expect(f.pc).toBe(failure==='unknown tail source'?'3003d8f7':'100a7a00');
  expect(text.backing.freed).toBe(false);expect(text.readUnsigned(0)).toBe(17);expect(text.readUnsigned(25,1)).toBe(0);
  expect(Buffer.from(text.bytes.slice(8,24)).toString()).toBe('eCResourceBase_P');
  if(failure==='unknown tail source'){
   expect(f.typeNameTwentyFifthCStringCopyReturned).toBe(true);expect(text.knownMask[24]).toBe(0);
   expect(()=>text.readUnsigned(24,1)).toThrow();
  }else{
   expect(f.typeNameTwentyFifthCStringCopyReturned).toBe(false);expect(text.readUnsigned(24,1)).toBe(0);
  }
  const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
  expect(graph.value.snapshot().calls.find(c=>c.site==='3007710e')).toMatchObject({returned:failure==='unknown tail source'});
 });

function captureBeforeMainCacheTemplate(bootstrap:ReturnType<typeof fixture>['bootstrap']){
 let completed:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;
 const lookup=NativeEngineCinitImages.imageForCrt;
 const spy=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((images,owner,label)=>{
  if(label==='mainCacheTemplatePropertyFlags'&&bootstrap.attachProgress().engineCinitProgress?.pc==='3003d8f7')completed=bootstrap.attachProgress().engineCinitProgress;
  return lookup(images,owner,label);
 });
 return {snapshot:()=>completed??bootstrap.attachProgress().engineCinitProgress!,restore:()=>spy.mockRestore()};
}

it('retains the MainCache output when its final name terminator is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const write=NativeHeapObjectViews.prototype.writeUnsigned;let interrupted=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(offset===63&&width===1&&value===0){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='306971f6'&&f.undecorationOutput===this){interrupted=true;throw new Error('Interrupted MainCache final terminator');}}return write.call(this,offset,value,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('306971f6');expect(f.undecorationOutput!.backing.freed).toBe(false);expect(Buffer.from(f.undecorationOutput!.bytes.slice(0,63)).toString()).toBe('class bTPropertyObject<class eCMainCache,class bCObjectRefBase>');expect(Array.from(f.undecorationOutput!.knownMask.slice(0,63))).toEqual(Array(63).fill(255));expect(f.undecorationOutput!.knownMask[63]).toBe(0);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameTwentyEighthCString).toBe(null);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce'&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the MainCache name parser when normalization reads an unknown output byte',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false,probing=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===10&&width===1&&this.bytes.length===64){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3069b0f3'&&f.undecorationOutput===this){this.knownMask[offset]=0;changed=true;}}finally{probing=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3069b0f3');expect(f.undecorationOutput!.knownMask[10]).toBe(0);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameTwentyEighthCString).toBe(null);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b2de').at(-1)).toMatchObject({returned:false});expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the MainCache parser arena when its original free callback is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const free=NativeModuleCrtOwner.prototype.free;let interrupted=false;const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,allocation){if(this===crt){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30672f8a'&&f.undecorationOutput?.bytes.length===64){interrupted=true;throw new Error('Interrupted MainCache original arena free');}}return free.call(this,allocation);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672f8a');expect(f.undecorationLockHeld).toBe(true);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(Buffer.from(f.undecorationOutput!.bytes).toString()).toBe('class bTPropertyObject<class eCMainCache,class bCObjectRefBase>\0');expect(f.typeNameTwentyEighthCString).toBe(null);const arena=f.undecorationGlobalWords![3]!.provenance;if(arena?.kind!=='engine-allocation')throw new Error('Retained actual arena required');expect(arena.fields.backing.freed).toBe(false);expect(f.undecorationGlobalWords![2]).toMatchObject({value:0,mask:0xffffffff});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b2de').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='3069661c'&&!c.returned)).toHaveLength(1);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b2eb'&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the MainCache strlen caller when the output terminator is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const masked=NativeHeapObjectViews.prototype.maskedWord;let changed=false,probing=false;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===60&&this.bytes.length===64){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30679b00'&&f.undecorationOutput===this){this.knownMask[63]=0;changed=true;}}finally{probing=false;}}return masked.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30679b11');expect(f.undecorationOutput!.knownMask[63]).toBe(0);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.undecorationGlobalWords![3]).toMatchObject({value:0,mask:0xffffffff});const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067dadd'&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the MainCache cache-allocation null result before output cleanup',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const malloc=NativeModuleCrtOwner.prototype.malloc;let changed=false;const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){if(this===crt&&bytes===8&&!changed){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30672ec7'&&f.typeNameLength===63&&f.typeNameLockHeld){changed=true;return {known:true,value:null};}}return malloc.call(this,bytes);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067db62');expect(f.typeNameCacheNode).toBe(null);expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationLockHeld).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(f.typeNameTwentyEighthCString).toBe(null);const info=NativeEngineCinitImages.imageForCrt(f.images,crt,'mainCacheTemplatePropertyTypeInfo');if(!info.known)throw new Error(info.reason);expect(info.value.readUnsigned(4)).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db0b').at(-1)).toMatchObject({returned:true});expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the MainCache cache-copy caller when its terminator write is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const write=NativeHeapObjectViews.prototype.writeUnsigned;let changed=false;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(offset===63&&width===1&&value===0){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3068a88a'&&f.typeNameLength===63&&f.typeNameCacheText===this){changed=true;throw new Error('Interrupted MainCache cache terminator');}}return write.call(this,offset,value,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3068a88a');expect(f.typeNameCacheText!.knownMask[63]).toBe(0);expect(Array.from(f.typeNameCacheText!.knownMask.slice(0,63))).toEqual(Array(63).fill(255));expect(Buffer.from(f.typeNameCacheText!.bytes.slice(0,63)).toString()).toBe('class bTPropertyObject<class eCMainCache,class bCObjectRefBase>');expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(f.typeNameCopyResult).toBe(null);expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameTwentyEighthCString).toBe(null);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db2d'&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the MainCache type-name cleanup caller when temporary-output free is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const free=NativeModuleCrtOwner.prototype.free;let interrupted=false;const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'free').mockImplementation(function(this:NativeModuleCrtOwner,allocation){if(this===crt){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30672f8a'&&f.typeNameLength===63&&f.typeNameLockHeld&&!f.undecorationLockHeld&&f.undecorationOutput?.backing===allocation){interrupted=true;throw new Error('Interrupted MainCache temporary output free');}}return free.call(this,allocation);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(interrupted).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30672f8a');expect(f.typeNameLockHeld).toBe(true);expect(f.undecorationLockHeld).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(false);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.typeNameCopyResult).toBe(0);expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('class bTPropertyObject<class eCMainCache,class bCObjectRefBase>\0');expect(f.typeNameTwentyEighthCString).toBe(null);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3067db65'&&!c.returned)).toHaveLength(1);expect(graph.value.snapshot().calls.filter(c=>c.site==='30077253'&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the MainCache SharedBase search caller when its cache-space byte is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const masked=NativeHeapObjectViews.prototype.maskedWord;let changed=false,probing=false;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===4&&this.bytes.length===64&&this.bytes[5]===32){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='100a7338'&&f.typeNameLength===63&&f.typeNameCacheText===this){this.knownMask[5]=0;changed=true;}}finally{probing=false;}}return masked.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed,result.known?'Unexpected complete startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('100a7343');expect(f.typeNameCacheText!.knownMask[5]).toBe(0);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);expect(f.typeNameTwentyEighthCString).toBe(null);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['1009155b','3007725e'])expect(graph.value.snapshot().calls.filter(c=>c.site===site&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the MainCache CString constructor when its first text byte is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false,probing=false;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===6&&width===1&&this.bytes.length===64){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='10013610'&&f.typeNameLength===63&&f.typeNameCacheText===this){this.knownMask[6]=0;changed=true;}}finally{probing=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('10013610');expect(f.typeNameCacheText!.knownMask[6]).toBe(0);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(f.undecorationOutput!.backing.freed).toBe(true);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='10091571'&&!c.returned)).toHaveLength(1);expect(graph.value.snapshot().calls.filter(c=>c.site==='10013623'&&!c.returned)).toHaveLength(0);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the MainCache CString allocation caller when its terminator store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const write=NativeHeapObjectViews.prototype.writeUnsigned;let changed=false,originalByte:number|null=null,originalMask:number|null=null;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(offset===65&&value===0&&width===1){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='10013271'&&f.typeNameTwentyEighthCString===this){changed=true;originalByte=this.bytes[offset]!;originalMask=this.knownMask[offset]!;throw new Error('Interrupted MainCache CString terminator store');}}return write.call(this,offset,value,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('10013271');const fields=f.typeNameTwentyEighthCString!;expect(fields.backing.freed).toBe(false);expect(fields.bytes.length).toBe(80);expect((fields.backing as NativeMemoryAllocation).requestedBytes).toBe(66);expect(fields.readUnsigned(0)).toBe(57);expect(fields.readUnsigned(4,2)).toBe(1);expect(fields.bytes[65]).toBe(originalByte);expect(fields.knownMask[65]).toBe(originalMask);expect(f.typeNameTwentyEighthCStringCopyReturned).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='10013623'&&!c.returned)).toHaveLength(1);expect(graph.value.snapshot().calls.filter(c=>c.site==='1001325e').at(-1)).toMatchObject({returned:true});expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the MainCache memcpy caller when its second CString DWORD store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const masked=NativeHeapObjectViews.prototype.maskedWord;let changed=false,probing=false,remainingBytes:number[]|null=null,remainingMasks:number[]|null=null;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===12&&width===4&&this.bytes.length===80){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='100a7a00'&&f.typeNameTwentyEighthCString===this){changed=true;remainingBytes=Array.from(this.bytes.slice(12,65));remainingMasks=Array.from(this.knownMask.slice(12,65));throw new Error('Interrupted MainCache second memcpy DWORD');}}finally{probing=false;}}return masked.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('100a7a00');const fields=f.typeNameTwentyEighthCString!;expect(Buffer.from(fields.bytes.slice(8,12)).toString()).toBe('bTPr');expect(Array.from(fields.knownMask.slice(8,12))).toEqual(Array(4).fill(255));expect(Array.from(fields.bytes.slice(12,65))).toEqual(remainingBytes);expect(Array.from(fields.knownMask.slice(12,65))).toEqual(remainingMasks);expect(fields.readUnsigned(0)).toBe(57);expect(fields.readUnsigned(65,1)).toBe(0);expect(fields.backing.freed).toBe(false);expect(f.typeNameTwentyEighthCStringCopyReturned).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['1001362d','10091571','3007725e'])expect(graph.value.snapshot().calls.filter(c=>c.site===site&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the MainCache shutdown registration caller when its callback store is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const masked=NativeHeapObjectViews.prototype.maskedWord;let changed=false,probing=false,target:NativeHeapObjectViews|null=null,priorBytes:number[]|null=null,priorMasks:number[]|null=null;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===116&&this.bytes.length===128){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,p=f?.exitCursor?.provenance;if(f?.pc==='3067150b'&&f.typeNameTwentyEighthCStringCopyReturned&&p?.kind==='engine-allocation'&&p.fields===this){changed=true;target=this;priorBytes=Array.from(this.bytes.slice(offset,offset+4));priorMasks=Array.from(this.knownMask.slice(offset,offset+4));throw new Error('Interrupted MainCache shutdown callback store');}}finally{probing=false;}}return masked.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067150b');const observed=target as NativeHeapObjectViews|null;if(!observed)throw new Error('Actual shutdown table required');expect(Array.from(observed.bytes.slice(116,120))).toEqual(priorBytes);expect(Array.from(observed.knownMask.slice(116,120))).toEqual(priorMasks);expect(f.exitCursor!.provenance).toMatchObject({offset:116});expect(f.cppCursor!.provenance).toMatchObject({offset:0x170});expect(f.typeNameTwentyEighthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameTwentyEighthCString!.bytes.slice(8,66)).toString()).toBe('bTPropertyObject<class eCMainCache,class bCObjectRefBase>\0');expect(f.onexitLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'mainCacheTemplatePropertyRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30077269','30732460'])expect(graph.value.snapshot().calls.filter(c=>c.site===site&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the original MainCache template name parser caller and first constructor',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const memoryMalloc=NativeMemoryAdmin.prototype.malloc;let originalCStringBytes:number[]|null=null,originalCStringMask:number[]|null=null;const memorySpy=vi.spyOn(NativeMemoryAdmin.prototype,'malloc').mockImplementation(function(this:NativeMemoryAdmin,bytes){const result=memoryMalloc.call(this,bytes);if(bytes===66&&result.known&&result.value){const frame=bootstrap.attachProgress().engineCinitProgress;if(frame?.pc==='10003cd8'&&frame.typeNameLength===63&&frame.typeNameMemoryAdmin===this){originalCStringBytes=Array.from(result.value.bytes);originalCStringMask=Array.from(result.value.knownMask);}}return result;});
 const write=NativeHeapObjectViews.prototype.writeUnsigned;let commaFields:NativeHeapObjectViews|null=null,commaOffset:number|null=null,openingFields:NativeHeapObjectViews|null=null,openingOffset:number|null=null,closingFields:NativeHeapObjectViews|null=null,closingOffset:number|null=null;
 const commaSpy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(width===1&&value===44&&bootstrap.attachProgress().engineCinitProgress?.pc==='30697bdb'){commaFields=this;commaOffset=offset;}if(openingFields===null&&width===1&&value===60&&bootstrap.attachProgress().engineCinitProgress?.pc==='3069769e'){openingFields=this;openingOffset=offset;}if(width===1&&value===62&&bootstrap.attachProgress().engineCinitProgress?.pc==='30697bdb'){closingFields=this;closingOffset=offset;}return write.call(this,offset,value,width);});
 const read=NativeHeapObjectViews.prototype.readUnsigned;let savedParserContexts:readonly unknown[]|null=null,probingContexts=false;let mainCacheCalls:ReturnType<NativeX86ThreadStack['snapshot']>['calls']|null=null;let mainCacheTemplateMarker:number|null=null;let mainCacheFrame:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;
 const contextSpy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(mainCacheFrame===null&&!probingContexts&&offset===0x174&&width===4){probingContexts=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3067d221'&&f.typeNameTwentyEighthCStringCopyReturned){mainCacheFrame=f;const savedGraph=NativeX86ThreadStack.forPlatform(platform);if(!savedGraph.known)throw new Error(savedGraph.reason);mainCacheCalls=savedGraph.value.snapshot().calls;const marker=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!marker.known)throw new Error(marker.reason);mainCacheTemplateMarker=read.call(marker.value,37,1);}}finally{probingContexts=false;}}if(savedParserContexts===null&&!probingContexts&&offset===12&&width===1&&this.bytes[offset]===63){probingContexts=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='306991bd')savedParserContexts=f.undecorationParserWords!.slice(0,3);}finally{probingContexts=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{contextSpy.mockRestore();commaSpy.mockRestore();memorySpy.mockRestore();}expect(result.known).toBe(false);
 const f=mainCacheFrame as unknown as NonNullable<ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']>;expect(f).not.toBe(null);expect(f.typeNameLength).toBe(63);expect(f.typeNameCopyResult).toBe(0);expect(f.typeNameCacheNode!.bytes.length).toBe(8);expect(f.typeNameCacheNode!.backing.freed).toBe(false);expect(f.typeNameCacheText!.bytes.length).toBe(64);expect(f.typeNameCacheText!.backing).not.toBe(f.undecorationOutput!.backing);expect(f.typeNameCacheText!.backing.freed).toBe(false);expect(Array.from(f.typeNameCacheText!.knownMask)).toEqual(Array(64).fill(255));expect(Buffer.from(f.typeNameCacheText!.bytes).toString()).toBe('class bTPropertyObject<class eCMainCache,class bCObjectRefBase>\0');expect(savedParserContexts).not.toBe(null);expect(f.undecorationParserWords!.slice(0,3)).toEqual(savedParserContexts);
 expect(f.pc,result.known?'Unexpected complete startup':result.reason).toBe('3067d221');const traversalGraph=NativeX86ThreadStack.forPlatform(platform);if(!traversalGraph.known)throw new Error(traversalGraph.reason);expect(f.undecorationOutput?.bytes.length).toBe(64);expect(f.undecorationOutput?.backing.freed).toBe(true);expect(Array.from(f.undecorationOutput!.knownMask)).toEqual(Array(64).fill(255));expect(Buffer.from(f.undecorationOutput!.bytes).toString()).toBe('class bTPropertyObject<class eCMainCache,class bCObjectRefBase>\0');expect(f.undecorationOutputWriterArguments![1]).toMatchObject({value:64,mask:0xffffffff});const closing=closingFields as NativeHeapObjectViews|null,closingAt=closingOffset as number|null;if(!closing||closingAt===null)throw new Error('Original closing character node required');expect(Buffer.from(closing.bytes).readUIntLE(closingAt,1)).toBe(62);expect(closing.knownMask[closingAt]).toBe(255);expect(Buffer.from(closing.bytes).readUIntLE(closingAt-4,4)).toBe(0);expect(closing.backing.freed).toBe(true);
 const info=NativeEngineCinitImages.imageForCrt(f.images,crt,'mainCacheTemplatePropertyTypeInfo'),flags=NativeEngineCinitImages.imageForCrt(f.images,crt,'mainCacheTemplatePropertyFlags'),storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'mainCacheTemplatePropertyStorage'),root=NativeEngineCinitImages.imageForCrt(f.images,crt,'mainCacheTemplatePropertyRoot');
 if(!info.known||!flags.known||!storage.known||!root.known)throw new Error('Original MainCache template images required');
 expect(Buffer.from(info.value.bytes.slice(8)).toString()).toBe('.?AV?$bTPropertyObject@VeCMainCache@@VbCObjectRefBase@@@@\0');
 const parser=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!parser.known)throw new Error(parser.reason);expect(parser.value.bytes.length).toBe(38);expect(mainCacheTemplateMarker).toBe(0);
 expect(flags.value.readUnsigned(0)).toBe(3);const mainCacheRoot=f.mainCacheTemplatePropertyRootWord!.provenance;if(mainCacheRoot?.kind!=='engine-image')throw new Error('Actual published MainCache root required');expect(mainCacheRoot.fields).toBe(storage.value);expect(mainCacheRoot.offset).toBe(0);expect(storage.value.readUnsigned(4)).toBe(0);
 const cursor=f.undecorationParserWords![3]!.provenance;
 expect(cursor).toMatchObject({kind:'engine-image',offset:65});if(cursor?.kind!=='engine-image')throw new Error('Retained template cursor required');expect(cursor.fields).toBe(info.value);
 const arenaFields=closing;expect(f.undecorationGlobalWords![2]).toMatchObject({value:0,mask:0xffffffff});expect(f.undecorationGlobalWords![3]).toMatchObject({value:0,mask:0xffffffff});
 const nameAt=Buffer.from(arenaFields.bytes).indexOf('bTPropertyObject');expect(nameAt).toBeGreaterThanOrEqual(0);expect([...arenaFields.knownMask.slice(nameAt,nameAt+16)]).toEqual(Array(16).fill(255));expect(arenaFields.backing.freed).toBe(true);const argumentNameAt=Buffer.from(arenaFields.bytes).indexOf('eCMainCache');expect(argumentNameAt).toBeGreaterThanOrEqual(0);expect([...arenaFields.knownMask.slice(argumentNameAt,argumentNameAt+11)]).toEqual(Array(11).fill(255));
 const commaMemory=commaFields as NativeHeapObjectViews|null,commaAt=commaOffset as number|null;if(!commaMemory||commaAt===null)throw new Error('Original comma character node required');expect(commaMemory).toBe(arenaFields);expect(Buffer.from(commaMemory.bytes).readUIntLE(commaAt,1)).toBe(44);expect(commaMemory.knownMask[commaAt]).toBe(255);expect(Buffer.from(commaMemory.bytes).readUIntLE(commaAt-4,4)).toBe(0);
 const secondNameAt=Buffer.from(arenaFields.bytes).indexOf('bCObjectRefBase');expect(secondNameAt).toBeGreaterThanOrEqual(0);expect([...arenaFields.knownMask.slice(secondNameAt,secondNameAt+15)]).toEqual(Array(15).fill(255));
 const openingMemory=openingFields as NativeHeapObjectViews|null,openingAt=openingOffset as number|null;if(!openingMemory||openingAt===null)throw new Error('Original template opening character node required');expect(openingMemory).toBe(arenaFields);expect(Buffer.from(openingMemory.bytes).readUIntLE(openingAt,1)).toBe(60);expect(openingMemory.knownMask[openingAt]).toBe(255);expect(Buffer.from(openingMemory.bytes).readUIntLE(openingAt-4,4)).toBe(0);
 const cstring=f.typeNameTwentyEighthCString!;expect(cstring.bytes.length).toBe(80);const nativeCStringAllocation=cstring.backing as NativeMemoryAllocation;expect(nativeCStringAllocation.requestedBytes).toBe(66);expect(NativeMemoryAdmin.canonicalAllocationForPlatform(f.typeNameMemoryAdmin!,platform,nativeCStringAllocation).known).toBe(true);expect(cstring.backing.freed).toBe(false);expect(cstring.readUnsigned(0)).toBe(57);expect(cstring.readUnsigned(4,2)).toBe(1);expect(originalCStringBytes).not.toBe(null);expect(originalCStringMask).not.toBe(null);expect(Array.from(cstring.bytes.slice(6,8))).toEqual(originalCStringBytes!.slice(6,8));expect(Array.from(cstring.knownMask.slice(6,8))).toEqual(originalCStringMask!.slice(6,8));expect(Buffer.from(cstring.bytes.slice(8,66)).toString()).toBe('bTPropertyObject<class eCMainCache,class bCObjectRefBase>\0');expect(Array.from(cstring.knownMask.slice(8,66))).toEqual(Array(58).fill(255));expect(cstring.readUnsigned(65,1)).toBe(0);expect(f.typeNameTwentyEighthCStringCopyReturned).toBe(true);
 expect(f.typeNameTwentySeventhCStringCopyReturned).toBe(true);expect(f.exitCursor!.provenance).toMatchObject({offset:120});expect(f.cppCursor!.provenance).toMatchObject({offset:0x174});expect(traversalGraph.value.snapshot().calls.filter(c=>c.site==='3067d227').at(-1)).toMatchObject({returned:false});expect(traversalGraph.value.snapshot().trace).toContain('3067d225.EngineCinitSource');
 expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);expect(f.onexitLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);

 for(const site of ['306991ef','306991f7','306991ff','30699255','30699260','30699268','306996a3','30699505','3069b528','3069b770','30698be1','30698bec','30698c0c','30698c17','30697936','30698ae7','30697ba1','30697bb4','30697bc8','30697be5','30699282','30698c37','30697dab','306976cd','3069768a'])expect(mainCacheCalls!.filter(c=>c.site===site).at(-1)).toMatchObject({returned:true});
 for(const site of ['3069928e','30697db2','30697b1e','30697b25','30697b3d','30697b5c','3069794e','3069929a','306992a2','306992ba','306992e4','30699360','3069936b','306994d5','306994e3','3069950f','3069b03f','3069a31c','3069b049','3069b081','3069b0a2','3069b0b4'])expect(mainCacheCalls!.filter(c=>c.site===site).at(-1)).toMatchObject({returned:true});
 expect(mainCacheCalls!.filter(c=>c.site==='30699505'||c.site==='306996a3').every(c=>c.returned)).toBe(true);expect(mainCacheCalls!.filter(c=>['306996b0','306996bc','3069b770','3069b8a3'].includes(c.site)).every(c=>c.returned)).toBe(true);
 expect(mainCacheCalls!.filter(c=>c.site==='3069b0ce').at(-1)).toMatchObject({returned:true});expect(mainCacheCalls!.filter(c=>c.site==='3069b2de').at(-1)).toMatchObject({returned:true});for(const site of ['3069b2eb','3069661c','3069b2f7','3069b307','3069b2ff','3067dac6','3067dadd','3067dafb','3067db0b','3067db1b','3067db2d','3067db65','3067db72','3067db85','3067db7a','306713b3','30077253','1009155b','10013257','1001325e','10013623','1001362d','10091571','3007725e','30077269','30732460'])expect(mainCacheCalls!.filter(c=>c.site===site).at(-1)).toMatchObject({returned:true});expect(()=>arenaFields.readUnsigned(0)).toThrow('freed');
 expect(f.exitTableThirtieth).toMatchObject({provenance:{kind:'source',type:'code',address:'30019029'}});
},30_000);


it.each(['unknown dollar marker','different dollar marker'])(
 'retains original MainCache template marker state on %s',failure=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const original=NativeHeapObjectViews.prototype.readUnsigned;let changed=false,probing=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(!changed&&!probing&&offset===13&&width===1){
   probing=true;try{
    const f=bootstrap.attachProgress().engineCinitProgress,cursor=f?.undecorationParserWords?.[3]?.provenance;
    if(f?.pc==='306991c6'&&cursor?.kind==='engine-image'&&cursor.fields===this){changed=true;if(failure==='unknown dollar marker')this.knownMask[13]=0;else this.bytes[13]=33;}
   }finally{probing=false;}
  }
  return original.call(this,offset,width);
 });
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result.known).toBe(false);expect(changed).toBe(true);
 const f=bootstrap.attachProgress().engineCinitProgress!;
 expect(f.pc).toBe(failure==='unknown dollar marker'?'306991c6':'306991ca');
 expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:12});
 expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.typeNameTwentySeventhCStringCopyReturned).toBe(true);
 expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.exitCursor!.provenance).toMatchObject({offset:116});
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.find(c=>c.site==='30699360')).toMatchObject({returned:false});
 expect(graph.value.snapshot().calls.some(c=>c.site==='306991ef'||c.site==='3007725e'||c.site==='30077269')).toBe(false);
 },30_000);

it.each([1,2])('retains original MainCache template guard bit %i when unknown',bit=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const lookup=NativeEngineCinitImages.imageForCrt;let changed=false;
 const spy=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((images,owner,label)=>{
  const result=lookup(images,owner,label);if(!changed&&label==='mainCacheTemplatePropertyFlags'&&result.known){changed=true;result.value.knownMask[0]=result.value.knownMask[0]!&~bit;}return result;
 });
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result.known).toBe(false);expect(changed).toBe(true);
 const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe(bit===1?'30077227':'3007723f');expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.typeNameTwentySeventhCStringCopyReturned).toBe(true);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.some(c=>c.site==='30077253'||c.site==='306991ef')).toBe(false);
});


it.each(['unknown argument byte','end marker'])(
 'retains original MainCache template argument input on %s',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const original=NativeHeapObjectViews.prototype.readUnsigned;let changed=false,probing=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(!changed&&!probing&&offset===31&&width===1){
   probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,cursor=f?.undecorationParserWords?.[3]?.provenance;
    if(f?.pc==='30698ac4'&&cursor?.kind==='engine-image'&&cursor.fields===this){changed=true;if(failure==='unknown argument byte')this.knownMask[31]=0;else this.bytes[31]=64;}
   }finally{probing=false;}
  }
  return original.call(this,offset,width);
 });
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result.known).toBe(false);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;
 expect(f.pc).toBe(failure==='unknown argument byte'?'30698ac4':'30698ad1');expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:31});
 const parser=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!parser.known)throw new Error(parser.reason);expect(parser.value.readUnsigned(37,1)).toBe(1);
 expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.typeNameTwentySeventhCStringCopyReturned).toBe(true);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.find(c=>c.site==='30699255')).toMatchObject({returned:true});expect(graph.value.snapshot().calls.find(c=>c.site==='30699282')).toMatchObject({returned:false});expect(graph.value.snapshot().calls.some(c=>c.site==='30698be1')).toBe(false);
 });


it.each(['unknown name byte','unknown delimiter'])(
 'retains original MainCache class argument name state on %s',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const original=NativeHeapObjectViews.prototype.readUnsigned;let changed=false,probing=false;
 const targetOffset=failure==='unknown name byte'?32:43,targetPc=failure==='unknown name byte'?'30699315':'30697793';
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(!changed&&!probing&&offset===targetOffset&&width===1){
   probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,cursor=f?.undecorationParserWords?.[3]?.provenance;
    if(f?.pc===targetPc&&cursor?.kind==='engine-image'&&cursor.fields===this){changed=true;this.knownMask[targetOffset]=0;}
   }finally{probing=false;}
  }
  return original.call(this,offset,width);
 });
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result.known).toBe(false);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;
 // The delimited-name loop commits each consumed byte before reading the closing delimiter.
 expect(f.pc).toBe(targetPc);expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:targetOffset});
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'mainCacheTemplatePropertyRoot'),parser=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!root.known||!parser.known)throw new Error('Original MainCache template state required');
 expect(root.value.readUnsigned(0)).toBe(0);expect(parser.value.readUnsigned(37,1)).toBe(1);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.typeNameTwentySeventhCStringCopyReturned).toBe(true);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='30699505').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.filter(c=>c.site==='306996a3').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.some(c=>c.site==='30698bec')).toBe(false);
 });


it('retains original template comma node when its byte store is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const write=NativeHeapObjectViews.prototype.writeUnsigned;let interruptedFields:NativeHeapObjectViews|null=null,interruptedOffset:number|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(width===1&&value===44&&bootstrap.attachProgress().engineCinitProgress?.pc==='30697bdb'){interruptedFields=this;interruptedOffset=offset;throw new Error('Interrupted original template comma byte store');}return write.call(this,offset,value,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30697bdb');
 const fields=interruptedFields as NativeHeapObjectViews|null,offset=interruptedOffset as number|null;if(!fields||offset===null)throw new Error('Original interrupted comma node required');expect(fields.knownMask[offset]).toBe(0);expect(fields.readUnsigned(offset-4,4)).toBe(0);expect(fields.backing.freed).toBe(false);
 expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:45});expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.typeNameTwentySeventhCStringCopyReturned).toBe(true);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30698ae7').at(-1)).toMatchObject({returned:false});for(const site of ['30698c0c','30698c17','30697ba1','30697bb4','30697bc8'])expect(graph.value.snapshot().calls.filter(c=>c.site===site).at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.some(c=>c.site==='30697be5')).toBe(false);
});


it.each(['unknown name byte','unknown delimiter'])(
 'retains original MainCache second class argument name state on %s',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const original=NativeHeapObjectViews.prototype.readUnsigned;let changed=false,probing=false;
 const targetOffset=failure==='unknown name byte'?46:61,targetPc=failure==='unknown name byte'?'30699315':'30697793';
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){
  if(!changed&&!probing&&offset===targetOffset&&width===1){
   probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,cursor=f?.undecorationParserWords?.[3]?.provenance;
    if(f?.pc===targetPc&&cursor?.kind==='engine-image'&&cursor.fields===this){changed=true;this.knownMask[targetOffset]=0;}
   }finally{probing=false;}
  }
  return original.call(this,offset,width);
 });
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(result.known).toBe(false);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;
 // The delimited-name loop commits each consumed byte before reading the closing delimiter.
 expect(f.pc).toBe(targetPc);expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:targetOffset});
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'mainCacheTemplatePropertyRoot'),parser=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!root.known||!parser.known)throw new Error('Original MainCache template state required');
 expect(root.value.readUnsigned(0)).toBe(0);expect(parser.value.readUnsigned(37,1)).toBe(1);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.typeNameTwentySeventhCStringCopyReturned).toBe(true);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(graph.value.snapshot().calls.filter(c=>c.site==='30699505').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.filter(c=>c.site==='306996a3').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.filter(c=>c.site==='30698bec').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='30698ae7').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='30699282').at(-1)).toMatchObject({returned:false});
 });


it.each(['unknown stack byte','interrupted byte store'])('retains original template opening character on %s',failure=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned,write=NativeHeapObjectViews.prototype.writeUnsigned;let changed=false,interruptedFields:NativeHeapObjectViews|null=null,interruptedOffset:number|null=null;
 let probingOpeningStack=false;const readSpy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(failure==='unknown stack byte'&&!changed&&!probingOpeningStack&&this.bytes.length===4096&&width===1&&this.bytes[offset]===60){probingOpeningStack=true;try{if(bootstrap.attachProgress().engineCinitProgress?.pc==='30697693'){changed=true;this.knownMask[offset]=0;}}finally{probingOpeningStack=false;}}return read.call(this,offset,width);});
 const writeSpy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(failure==='interrupted byte store'&&width===1&&value===60&&bootstrap.attachProgress().engineCinitProgress?.pc==='3069769e'){changed=true;interruptedFields=this;interruptedOffset=offset;throw new Error('Interrupted original template opening character store');}return write.call(this,offset,value,width);});
 let result;try{result=bootstrap.processAttach();}finally{readSpy.mockRestore();writeSpy.mockRestore();}expect(result.known).toBe(false);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe(failure==='unknown stack byte'?'30697693':'3069769e');
 if(failure==='interrupted byte store'){const fields=interruptedFields as NativeHeapObjectViews|null,offset=interruptedOffset as number|null;if(!fields||offset===null)throw new Error('Original interrupted character allocation required');expect(fields.knownMask[offset]).toBe(0);expect(fields.readUnsigned(offset-4,4)).toBe(0);expect(fields.backing.freed).toBe(false);}
 expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:63});const parser=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!parser.known)throw new Error(parser.reason);expect(parser.value.readUnsigned(37,1)).toBe(0);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.typeNameTwentySeventhCStringCopyReturned).toBe(true);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30699282','30698c37','3069768a'])expect(graph.value.snapshot().calls.filter(c=>c.site===site).at(-1)).toMatchObject({returned:true});for(const site of ['3069928e','30697dab','306976cd'])expect(graph.value.snapshot().calls.filter(c=>c.site===site).at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.some(c=>c.site==='30697db2')).toBe(false);
});


it('retains original template last-character caller on unknown copied text byte',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false,probing=false,interruptedFields:NativeHeapObjectViews|null=null,interruptedOffset:number|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&width===1&&offset>=14&&[98,67,79,98,106,101,99,116,82,101,102,66,97,115,101].every((byte,index)=>this.bytes[offset-14+index]===byte)){probing=true;try{if(bootstrap.attachProgress().engineCinitProgress?.pc==='306973d3'){changed=true;interruptedFields=this;interruptedOffset=offset;this.knownMask[offset]=0;}}finally{probing=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}expect(result.known).toBe(false);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('306973d3');const fields=interruptedFields as NativeHeapObjectViews|null,offset=interruptedOffset as number|null;if(!fields||offset===null)throw new Error('Original copied last-character text allocation required');expect(fields.knownMask[offset]).toBe(0);expect(fields.backing.freed).toBe(false);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069929a').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='306992a2').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.filter(c=>c.site==='30697150').at(-1)).toMatchObject({returned:true});expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:63});const parser=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!parser.known)throw new Error(parser.reason);expect(parser.value.readUnsigned(37,1)).toBe(0);
});


it('retains original template closing-character caller on interrupted byte store',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const write=NativeHeapObjectViews.prototype.writeUnsigned;let changed=false,interruptedFields:NativeHeapObjectViews|null=null,interruptedOffset:number|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(width===1&&value===62&&bootstrap.attachProgress().engineCinitProgress?.pc==='30697bdb'){changed=true;interruptedFields=this;interruptedOffset=offset;throw new Error('Interrupted original template closing character store');}return write.call(this,offset,value,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}expect(result.known).toBe(false);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30697bdb');const fields=interruptedFields as NativeHeapObjectViews|null,offset=interruptedOffset as number|null;if(!fields||offset===null)throw new Error('Original closing character allocation required');expect(fields.knownMask[offset]).toBe(0);expect(fields.readUnsigned(offset-4,4)).toBe(0);expect(fields.backing.freed).toBe(false);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='306992a2').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='306992ba').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.filter(c=>c.site==='30697bc8').at(-1)).toMatchObject({returned:true});expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:63});const parser=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!parser.known)throw new Error(parser.reason);expect(parser.value.readUnsigned(37,1)).toBe(0);
});


it('retains original template-name return on unknown end-marker stack flag',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned,write=NativeHeapObjectViews.prototype.writeUnsigned;let changed=false,flagOffset:number|null=null,interruptedFields:NativeHeapObjectViews|null=null;
 const writeSpy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(width===1&&value===62&&bootstrap.attachProgress().engineCinitProgress?.pc==='30697bdb'){const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const cell=graph.value.snapshot().registers.EBP;if(!cell||cell.changed)throw new Error('Original template EBP word required');const word=cell.word as {provenance?:{kind?:string;offset?:number}};if(word.provenance?.kind!=='stack'||typeof word.provenance.offset!=='number')throw new Error('Original contained template frame required');flagOffset=word.provenance.offset+124;}return write.call(this,offset,value,width);});
 const readSpy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&flagOffset!==null&&offset===flagOffset&&width===1&&this.bytes.length===4096&&bootstrap.attachProgress().engineCinitProgress?.pc==='306992bf'){changed=true;interruptedFields=this;this.knownMask[offset]=0;}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{readSpy.mockRestore();writeSpy.mockRestore();}expect(result.known).toBe(false);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('306992bf');const fields=interruptedFields as NativeHeapObjectViews|null,offset=flagOffset as number|null;if(!fields||offset===null)throw new Error('Original interrupted template stack flag required');expect(fields.bytes[offset]).toBe(0);expect(fields.knownMask[offset]).toBe(0);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='306992ba').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='30699360').at(-1)).toMatchObject({returned:false});expect(graph.value.snapshot().calls.some(c=>c.site==='306992e4')).toBe(false);expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:63});const parser=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!parser.known)throw new Error(parser.reason);expect(parser.value.readUnsigned(37,1)).toBe(0);
});


it('retains original completed template identifier on unknown end-marker byte',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false,probing=false,interruptedFields:NativeHeapObjectViews|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===63&&width===1&&this.bytes[offset]===64){probing=true;try{if(bootstrap.attachProgress().engineCinitProgress?.pc==='30699375'){changed=true;interruptedFields=this;this.knownMask[offset]=0;}}finally{probing=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}expect(result.known).toBe(false);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30699375');const fields=interruptedFields as NativeHeapObjectViews|null;if(!fields)throw new Error('Original completed template input required');expect(fields.knownMask[63]).toBe(0);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30699360').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='3069936b').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='30699505'&&!c.returned)).toHaveLength(1);expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',fields,offset:63});const parser=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!parser.known)throw new Error(parser.reason);expect(parser.value.readUnsigned(37,1)).toBe(0);
});


it('retains original template scope delimiter on unknown input byte',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned;let changed=false,probing=false,interruptedFields:NativeHeapObjectViews|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===64&&width===1&&this.bytes[offset]===64){probing=true;try{if(bootstrap.attachProgress().engineCinitProgress?.pc==='30699524'){changed=true;interruptedFields=this;this.knownMask[offset]=0;}}finally{probing=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}expect(result.known).toBe(false);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30699524');const fields=interruptedFields as NativeHeapObjectViews|null;if(!fields)throw new Error('Original template scope input required');expect(fields.knownMask[64]).toBe(0);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30699505').every(c=>c.returned)).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069950f').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='306996a3'&&!c.returned)).toHaveLength(1);expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',fields,offset:64});const parser=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!parser.known)throw new Error(parser.reason);expect(parser.value.readUnsigned(37,1)).toBe(0);
});


it('retains original template class append on interrupted list-tail store',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned,masked=NativeHeapObjectViews.prototype.maskedWord;let arenaFields:NativeHeapObjectViews|null=null,changed=false,probing=false,interruptedOffset:number|null=null;
 const readSpy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(arenaFields===null&&!probing&&offset===64&&width===1&&this.bytes[offset]===64){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30699524'){const p=f.undecorationGlobalWords![3]!.provenance;if(p?.kind!=='engine-allocation')throw new Error('Original template arena required');arenaFields=p.fields;}}finally{probing=false;}}return read.call(this,offset,width);});
 const maskedSpy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&arenaFields===this&&(width===undefined||width===4)){probing=true;try{if(bootstrap.attachProgress().engineCinitProgress?.pc==='30696e86'){changed=true;interruptedOffset=offset;throw new Error('Interrupted original template class list-tail store');}}finally{probing=false;}}return masked.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{maskedSpy.mockRestore();readSpy.mockRestore();}expect(result.known).toBe(false);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30696e86');const fields=arenaFields as NativeHeapObjectViews|null,offset=interruptedOffset as number|null;if(!fields||offset===null)throw new Error('Original retained class list-tail cell required');expect(fields.readUnsigned(offset,4)).toBe(0);expect([...fields.knownMask.slice(offset,offset+4)]).toEqual([255,255,255,255]);expect(fields.backing.freed).toBe(false);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='306996a3').every(c=>c.returned)).toBe(true);expect(graph.value.snapshot().calls.filter(c=>c.site==='306996b0'&&!c.returned)).toHaveLength(1);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069794e'&&!c.returned)).toHaveLength(1);expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:65});const parser=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationParserGlobals');if(!parser.known)throw new Error(parser.reason);expect(parser.value.readUnsigned(37,1)).toBe(0);
});


it('retains original completed template length on unknown virtual target',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned;let measurement=false,changed=false,probing=false,interruptedFields:NativeHeapObjectViews|null=null,expectedFields:NativeHeapObjectViews|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!probing&&!measurement&&offset===65&&width===1&&this.bytes[offset]===0){probing=true;try{if(bootstrap.attachProgress().engineCinitProgress?.pc==='3069b075')measurement=true;}finally{probing=false;}}if(!changed&&!probing&&measurement&&offset===0&&(width===undefined||width===4)){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='30697129'){const table=NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationListVtableEntry');if(!table.known)throw new Error(table.reason);if(table.value!==this)throw new Error('Original list length target table required');expectedFields=table.value;changed=true;interruptedFields=this;this.knownMask.fill(0,0,4);}}finally{probing=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}expect(result.known).toBe(false);expect(measurement).toBe(true);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('306992a7');const fields=interruptedFields as NativeHeapObjectViews|null;if(!fields)throw new Error('Original template length virtual target required');expect([...fields.knownMask.slice(0,4)]).toEqual([0,0,0,0]);expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 expect(fields).toBe(expectedFields);expect(NativeEngineCinitImages.imageForCrt(f.images,crt,'undecorationListVtableEntry').known).toBe(false);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b03f').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0a2'&&!c.returned)).toHaveLength(1);expect(graph.value.snapshot().calls.filter(c=>c.site==='30697129'&&!c.returned)).toHaveLength(0);expect(f.undecorationParserWords).toBe(null);
});


it('retains original template output allocator null return',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});const read=NativeHeapObjectViews.prototype.readUnsigned,malloc=NativeModuleCrtOwner.prototype.malloc;let measurement=false,changed=false,probing=false;
 const readSpy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!measurement&&!probing&&offset===65&&width===1&&this.bytes[offset]===0){probing=true;try{if(bootstrap.attachProgress().engineCinitProgress?.pc==='3069b075')measurement=true;}finally{probing=false;}}return read.call(this,offset,width);});
 const mallocSpy=vi.spyOn(NativeModuleCrtOwner.prototype,'malloc').mockImplementation(function(this:NativeModuleCrtOwner,bytes){if(this===crt&&measurement&&bytes===64){changed=true;return {known:true,value:null};}return malloc.call(this,bytes);});
 let result;try{result=bootstrap.processAttach();}finally{mallocSpy.mockRestore();readSpy.mockRestore();}expect(result.known).toBe(false);expect(measurement).toBe(true);expect(changed).toBe(true);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3069b102');expect(f.undecorationOutput).toBe(null);expect(f.undecorationParserWords![5]).toMatchObject({value:0,mask:0xffffffff});expect(f.undecorationParserWords![6]).toMatchObject({value:64,mask:0xffffffff});expect(f.typeNameTwentyEighthCString).toBe(null);expect(f.undecorationLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0b4').at(-1)).toMatchObject({returned:true});expect(graph.value.snapshot().calls.filter(c=>c.site==='3069b0ce'&&!c.returned)).toHaveLength(0);expect(f.undecorationParserWords![3]!.provenance).toMatchObject({kind:'engine-image',offset:65});
});

it('returns the original geometry spatial context property initializer',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 let geometryFrame:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;let probing=false;const read=NativeHeapObjectViews.prototype.readUnsigned;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!geometryFrame&&!probing&&offset===0x178&&width===4){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3067d221'&&f.typeNameTwentyNinthCStringCopyReturned)geometryFrame=f;}finally{probing=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}expect(result.known).toBe(false);const f=geometryFrame as unknown as NonNullable<ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']>;expect(f).not.toBe(null);
 expect(f.pc,result.known?'Unexpected complete startup':result.reason).toBe('3067d221');
 expect(f.typeNameLength).toBe(30);expect(f.typeNameTwentyNinthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameTwentyNinthCString!.bytes.slice(8,33)).toString()).toBe('eCGeometrySpatialContext\0');
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'geometrySpatialContextPropertyStorage');if(!storage.known)throw new Error(storage.reason);expect(f.geometrySpatialContextPropertyRootWord?.provenance).toMatchObject({kind:'engine-image',crt,fields:storage.value,offset:0});expect(f.exitTableThirtyFirst?.provenance).toMatchObject({kind:'source',type:'code',address:'3000eb56'});
 expect(f.cppCursor!.provenance).toMatchObject({offset:0x178});expect(f.exitCursor!.provenance).toMatchObject({offset:124});expect(f.onexitLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);
 const flags=NativeEngineCinitImages.imageForCrt(f.images,crt,'geometrySpatialContextPropertyFlags');if(!flags.known)throw new Error(flags.reason);expect(flags.value.readUnsigned(0)).toBe(3);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['300772c3','300772ce','300772d9','30732470'])expect(graph.value.snapshot().calls.filter(c=>c.site===site)).toMatchObject([{returned:true}]);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the geometry spatial context shutdown registration caller when its callback store is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const masked=NativeHeapObjectViews.prototype.maskedWord;let changed=false,probing=false,target:NativeHeapObjectViews|null=null,priorBytes:number[]|null=null,priorMasks:number[]|null=null;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===120&&this.bytes.length===128){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,p=f?.exitCursor?.provenance;if(f?.pc==='3067150b'&&f.typeNameTwentyNinthCStringCopyReturned&&p?.kind==='engine-allocation'&&p.fields===this){changed=true;target=this;priorBytes=Array.from(this.bytes.slice(offset,offset+4));priorMasks=Array.from(this.knownMask.slice(offset,offset+4));throw new Error('Interrupted geometry spatial context shutdown callback store');}}finally{probing=false;}}return masked.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067150b');const observed=target as NativeHeapObjectViews|null;if(!observed)throw new Error('Actual shutdown table required');expect(Array.from(observed.bytes.slice(120,124))).toEqual(priorBytes);expect(Array.from(observed.knownMask.slice(120,124))).toEqual(priorMasks);expect(f.exitCursor!.provenance).toMatchObject({offset:120});expect(f.cppCursor!.provenance).toMatchObject({offset:0x174});expect(f.typeNameTwentyNinthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameTwentyNinthCString!.bytes.slice(8,33)).toString()).toBe('eCGeometrySpatialContext\0');expect(f.onexitLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'geometrySpatialContextPropertyRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['300772d9','30732470'])expect(graph.value.snapshot().calls.filter(c=>c.site===site&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});

it('returns the original PVS prefetcher property initializer',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 let prefetcherFrame:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;let probing=false;const read=NativeHeapObjectViews.prototype.readUnsigned;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!prefetcherFrame&&!probing&&offset===0x17c&&width===4){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3067d221'&&f.typeNameThirtiethCStringCopyReturned)prefetcherFrame=f;}finally{probing=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}expect(result.known).toBe(false);const f=prefetcherFrame as unknown as NonNullable<ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']>;expect(f).not.toBe(null);
 expect(f.pc,result.known?'Unexpected complete startup':result.reason).toBe('3067d221');
 expect(f.typeNameLength).toBe(22);expect(f.typeNameThirtiethCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameThirtiethCString!.bytes.slice(8,25)).toString()).toBe('eCPVSPrefetcher3\0');
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'pvsPrefetcher3PropertyStorage');if(!storage.known)throw new Error(storage.reason);expect(f.pvsPrefetcher3PropertyRootWord?.provenance).toMatchObject({kind:'engine-image',crt,fields:storage.value,offset:0});expect(f.exitTableThirtySecond?.provenance).toMatchObject({kind:'source',type:'code',address:'3000113b'});
 expect(f.cppCursor!.provenance).toMatchObject({offset:0x17c});expect(f.exitCursor!.provenance).toMatchObject({offset:128});expect(f.onexitLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);
 const flags=NativeEngineCinitImages.imageForCrt(f.images,crt,'pvsPrefetcher3PropertyFlags');if(!flags.known)throw new Error(flags.reason);expect(flags.value.readUnsigned(0)).toBe(3);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30077333','3007733e','30077349','30732480'])expect(graph.value.snapshot().calls.filter(c=>c.site===site)).toMatchObject([{returned:true}]);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the PVS prefetcher shutdown registration caller when its callback store is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const masked=NativeHeapObjectViews.prototype.maskedWord;let changed=false,probing=false,target:NativeHeapObjectViews|null=null,priorBytes:number[]|null=null,priorMasks:number[]|null=null;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===124&&this.bytes.length===128){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,p=f?.exitCursor?.provenance;if(f?.pc==='3067150b'&&f.typeNameThirtiethCStringCopyReturned&&p?.kind==='engine-allocation'&&p.fields===this){changed=true;target=this;priorBytes=Array.from(this.bytes.slice(offset,offset+4));priorMasks=Array.from(this.knownMask.slice(offset,offset+4));throw new Error('Interrupted PVS prefetcher shutdown callback store');}}finally{probing=false;}}return masked.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067150b');const observed=target as NativeHeapObjectViews|null;if(!observed)throw new Error('Actual shutdown table required');expect(Array.from(observed.bytes.slice(124,128))).toEqual(priorBytes);expect(Array.from(observed.knownMask.slice(124,128))).toEqual(priorMasks);expect(f.exitCursor!.provenance).toMatchObject({offset:124});expect(f.cppCursor!.provenance).toMatchObject({offset:0x178});expect(f.typeNameThirtiethCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameThirtiethCString!.bytes.slice(8,25)).toString()).toBe('eCPVSPrefetcher3\0');expect(f.onexitLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'pvsPrefetcher3PropertyRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30077349','30732480'])expect(graph.value.snapshot().calls.filter(c=>c.site===site&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});

it('returns the original occlusion processor property initializer',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const realloc=NativeModuleCrtOwner.prototype.reallocCrt;let oldTable:NativeHeapObjectViews|null=null,oldWords:readonly unknown[]|null=null;const spy=vi.spyOn(NativeModuleCrtOwner.prototype,'reallocCrt').mockImplementation(function(this:NativeModuleCrtOwner,pointer,bytes){const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='306714ce'&&f.typeNameThirtyFirstCStringCopyReturned&&f.exitTableAllocation===pointer.fields&&pointer.offset===0){expect(bytes).toBe(256);oldTable=pointer.fields;oldWords=[...f.exitTableEntries!,f.exitTableThirtieth,f.exitTableThirtyFirst,f.exitTableThirtySecond];}return realloc.call(this,pointer,bytes);});
 let occlusionFrame:ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']=null;let probing=false;const read=NativeHeapObjectViews.prototype.readUnsigned;const boundarySpy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!occlusionFrame&&!probing&&offset===0x180&&width===4){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress;if(f?.pc==='3067d221'&&f.typeNameThirtyFirstCStringCopyReturned)occlusionFrame=f;}finally{probing=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{boundarySpy.mockRestore();spy.mockRestore();}expect(result.known).toBe(false);const f=occlusionFrame as unknown as NonNullable<ReturnType<typeof bootstrap.attachProgress>['engineCinitProgress']>;expect(f).not.toBe(null);
 expect(f.pc,result.known?'Unexpected complete startup':result.reason).toBe('3067d221');
 expect(f.exitTableAllocation!.bytes.length).toBe(256);const previous=oldTable as NativeHeapObjectViews|null;expect(previous).not.toBe(null);if(!previous)throw new Error('Actual old exit allocation required');expect(previous.backing.freed).toBe(true);expect(f.exitTableAllocation).not.toBe(previous);expect([...f.exitTableEntries!,f.exitTableThirtieth,f.exitTableThirtyFirst,f.exitTableThirtySecond]).toEqual(oldWords);expect(f.exitCursor!.provenance?.kind).toBe('engine-allocation');if(f.exitCursor!.provenance?.kind!=='engine-allocation')throw new Error('Actual grown exit cursor required');expect(f.exitCursor!.provenance.fields).toBe(f.exitTableAllocation);expect(Array.from(f.exitTableAllocation!.knownMask.slice(132))).toEqual(Array(124).fill(0));
 expect(f.typeNameLength).toBe(26);expect(f.typeNameThirtyFirstCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameThirtyFirstCString!.bytes.slice(8,29)).toString()).toBe('eCOcclusionProcessor\0');
 const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,'occlusionProcessorPropertyStorage');if(!storage.known)throw new Error(storage.reason);expect(f.occlusionProcessorPropertyRootWord?.provenance).toMatchObject({kind:'engine-image',crt,fields:storage.value,offset:0});expect(f.exitTableThirtyThird?.provenance).toMatchObject({kind:'source',type:'code',address:'30045228'});
 expect(f.cppCursor!.provenance).toMatchObject({offset:0x180});expect(f.exitCursor!.provenance).toMatchObject({offset:132});expect(f.onexitLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);
 const flags=NativeEngineCinitImages.imageForCrt(f.images,crt,'occlusionProcessorPropertyFlags');if(!flags.known)throw new Error(flags.reason);expect(flags.value.readUnsigned(0)).toBe(3);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['300773a3','300773ae','300773b9','30732490'])expect(graph.value.snapshot().calls.filter(c=>c.site===site)).toMatchObject([{returned:true}]);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the occlusion processor shutdown registration caller when its callback store is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const masked=NativeHeapObjectViews.prototype.maskedWord;let changed=false,probing=false,target:NativeHeapObjectViews|null=null,priorBytes:number[]|null=null,priorMasks:number[]|null=null;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===128&&this.bytes.length===256){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,p=f?.exitCursor?.provenance;if(f?.pc==='3067150b'&&f.typeNameThirtyFirstCStringCopyReturned&&p?.kind==='engine-allocation'&&f.exitTableAllocation===this){changed=true;target=this;priorBytes=Array.from(this.bytes.slice(offset,offset+4));priorMasks=Array.from(this.knownMask.slice(offset,offset+4));throw new Error('Interrupted occlusion processor shutdown callback store');}}finally{probing=false;}}return masked.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067150b');const observed=target as NativeHeapObjectViews|null;if(!observed)throw new Error('Actual shutdown table required');expect(Array.from(observed.bytes.slice(128,132))).toEqual(priorBytes);expect(Array.from(observed.knownMask.slice(128,132))).toEqual(priorMasks);expect(f.exitCursor!.provenance).toMatchObject({offset:128});expect(f.cppCursor!.provenance).toMatchObject({offset:0x17c});expect(f.typeNameThirtyFirstCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameThirtyFirstCString!.bytes.slice(8,29)).toString()).toBe('eCOcclusionProcessor\0');expect(f.onexitLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'occlusionProcessorPropertyRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['300773b9','30732490'])expect(graph.value.snapshot().calls.filter(c=>c.site===site&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});

it("returns the original contiguous graphics and resource property initializer group",()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:"normal"},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:"rounded-eight",processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const result=bootstrap.processAttach();expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc,result.known?"Unexpected completed startup":result.reason).toBe("306992a7");expect(f.exitTableAllocation!.bytes.length).toBe(256);expect(f.exitCursor?.provenance?.kind).toBe("engine-allocation");if(f.exitCursor?.provenance?.kind!=="engine-allocation")throw new Error("Actual exit cursor required");expect(f.exitCursor.provenance.offset).toBe(236);expect(f.exitCursor.provenance.fields).toBe(f.exitTableAllocation);expect(f.cppCursor?.provenance?.kind).toBe("engine-image");if(f.cppCursor?.provenance?.kind!=="engine-image")throw new Error("Actual initializer cursor required");expect(f.cppCursor.provenance.offset).toBe(0x1e8);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const calls=graph.value.snapshot().calls;
 const data=[["307324a0", "ThirtySecond", "eCGfxAdmin", "gfxAdminProperty", "30077670", "30028af1"], ["307324b0", "ThirtyThird", "eCRenderSystemAdmin", "renderSystemAdminProperty", "300776e0", "3000bd2a"], ["307324c0", "ThirtyFourth", "eCImageCache", "imageCacheProperty", "30077760", "30018313"], ["307324d0", "ThirtyFifth", "eCMaterialCache", "materialCacheProperty", "300777d0", "3002ea91"], ["307324e0", "ThirtySixth", "eCMeshCache", "meshCacheProperty", "30077840", "3002fe32"], ["307324f0", "ThirtySeventh", "eCSoundCache", "soundCacheProperty", "300778b0", "3000fb19"], ["30732500", "ThirtyEighth", "eCCollisionMeshCache", "collisionMeshCacheProperty", "30077920", "3000ed86"], ["30732510", "ThirtyNinth", "eCAnimationCache", "animationCacheProperty", "30077990", "30029546"], ["30732520", "Fortieth", "eCIteratorAdmin", "iteratorAdminProperty", "30077ab0", "30017b5c"], ["30732530", "FortyFirst", "eCInpAdmin", "inpAdminProperty", "30077b20", "3000e45d"], ["30732540", "FortySecond", "eCDllInfoCtrl", "dllInfoCtrlProperty", "30077b90", "3002007c"], ["30732550", "FortyThird", "eCWnd", "wndProperty", "30077c00", "3000f538"], ["30732560", "FortyFourth", "eCPhysicsScene", "physicsSceneProperty", "30077c80", "300119cd"], ["30732570", "FortyFifth", "eCAnimationAdmin", "animationAdminProperty", "30077cf0", "3000fba5"], ["30732580", "FortySixth", "eCPerformanceAdmin", "performanceAdminProperty", "30077d60", "300346e4"], ["30732590", "FortySeventh", "eCVegetationAdmin", "vegetationAdminProperty", "30077dd0", "30031129"], ["307325a0", "FortyEighth", "eCShaderMaterialAdmin", "shaderMaterialAdminProperty", "30077ea0", "30020289"], ["307325b0", "FortyNinth", "eCPostProcessingAdmin", "postProcessingAdminProperty", "30077f30", "30033230"], ["307325c0", "Fiftieth", "eCGUIModule", "guiModuleProperty", "30078010", "30022bfb"], ["307325d0", "FiftyFirst", "eCTriggerBase_PS", "triggerBasePsProperty", "30078080", "3003e3bf"], ["307325e0", "FiftySecond", "eCSceneAdmin", "sceneAdminClassProperty", "300780f0", "300184df"], ["307325f0", "FiftyThird", "eCEffector", "effectorProperty", "30078160", "3002bb11"], ["30732600", "FiftyFourth", "eCEntityProxy", "entityProxyProperty", "300781d0", "30001b2c"], ["30732610", "FiftyFifth", "eCSpringAndDamperEffector", "springAndDamperEffectorProperty", "30078240", "30047749"], ["30732620", "FiftySixth", "eCVisualAnimation_PS", "visualAnimationPsProperty", "300782b0", "3003849c"], ["30732630", "FiftySeventh", "bCAnimationResourceString", "animationResourceStringProperty", "30078320", "30003e40"]] as const;
 for(const [callback,ordinal,name,prefix,body,shutdown] of data){const fields=f[("typeName"+ordinal+"CString") as keyof typeof f] as NativeHeapObjectViews|null;expect(fields,callback).not.toBe(null);if(!fields)throw new Error("Actual property CString required");expect(fields.backing.freed,callback).toBe(false);expect(Buffer.from(fields.bytes.slice(8,name.length+9)).toString(),callback).toBe(name+"\0");expect(Array.from(fields.knownMask.slice(8,name.length+9)),callback).toEqual(Array(name.length+1).fill(255));expect(f[("typeName"+ordinal+"CStringCopyReturned") as keyof typeof f],callback).toBe(true);const storage=NativeEngineCinitImages.imageForCrt(f.images,crt,(prefix+"Storage") as Parameters<typeof NativeEngineCinitImages.imageForCrt>[2]);if(!storage.known)throw new Error(storage.reason);const root=f[(prefix+"RootWord") as keyof typeof f] as typeof f.occlusionProcessorPropertyRootWord;expect(root?.provenance?.kind,callback).toBe("engine-image");if(root?.provenance?.kind!=="engine-image")throw new Error("Actual property root owner required");expect(root.provenance.fields,callback).toBe(storage.value);expect(root.provenance.offset,callback).toBe(0);for(const site of [callback,...[51,62,73].map(n=>(parseInt(body,16)+n).toString(16))])expect(calls.filter(c=>c.site===site),site).toMatchObject([{returned:true}]);expect(shutdown).not.toBe("");}
 expect(f.onexitLockHeld).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
},30_000);
it('retains the shader material admin shutdown registration caller when its callback store is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const masked=NativeHeapObjectViews.prototype.maskedWord;let changed=false,probing=false,target:NativeHeapObjectViews|null=null,priorBytes:number[]|null=null,priorMasks:number[]|null=null;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===196&&this.bytes.length===256){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,p=f?.exitCursor?.provenance;if(f?.pc==='3067150b'&&f.typeNameFortyEighthCStringCopyReturned&&p?.kind==='engine-allocation'&&p.fields===this){changed=true;target=this;priorBytes=Array.from(this.bytes.slice(offset,offset+4));priorMasks=Array.from(this.knownMask.slice(offset,offset+4));throw new Error('Interrupted shader material admin shutdown callback store');}}finally{probing=false;}}return masked.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067150b');const observed=target as NativeHeapObjectViews|null;if(!observed)throw new Error('Actual shutdown table required');expect(Array.from(observed.bytes.slice(196,200))).toEqual(priorBytes);expect(Array.from(observed.knownMask.slice(196,200))).toEqual(priorMasks);expect(f.exitCursor!.provenance).toMatchObject({offset:196});expect(f.cppCursor!.provenance).toMatchObject({offset:0x1c0});expect(f.typeNameFortyEighthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameFortyEighthCString!.bytes.slice(8,30)).toString()).toBe('eCShaderMaterialAdmin\0');expect(f.onexitLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'shaderMaterialAdminPropertyRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30077ee9','307325a0'])expect(graph.value.snapshot().calls.filter(c=>c.site===site&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the post-processing admin shutdown registration caller when its callback store is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const masked=NativeHeapObjectViews.prototype.maskedWord;let changed=false,probing=false,target:NativeHeapObjectViews|null=null,priorBytes:number[]|null=null,priorMasks:number[]|null=null;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===200&&this.bytes.length===256){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,p=f?.exitCursor?.provenance;if(f?.pc==='3067150b'&&f.typeNameFortyNinthCStringCopyReturned&&p?.kind==='engine-allocation'&&p.fields===this){changed=true;target=this;priorBytes=Array.from(this.bytes.slice(offset,offset+4));priorMasks=Array.from(this.knownMask.slice(offset,offset+4));throw new Error('Interrupted post-processing admin shutdown callback store');}}finally{probing=false;}}return masked.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067150b');const observed=target as NativeHeapObjectViews|null;if(!observed)throw new Error('Actual shutdown table required');expect(Array.from(observed.bytes.slice(200,204))).toEqual(priorBytes);expect(Array.from(observed.knownMask.slice(200,204))).toEqual(priorMasks);expect(f.exitCursor!.provenance).toMatchObject({offset:200});expect(f.cppCursor!.provenance).toMatchObject({offset:0x1c4});expect(f.typeNameFortyNinthCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameFortyNinthCString!.bytes.slice(8,'eCPostProcessingAdmin'.length+9)).toString()).toBe('eCPostProcessingAdmin\0');expect(f.onexitLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'postProcessingAdminPropertyRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30077f79','307325b0'])expect(graph.value.snapshot().calls.filter(c=>c.site===site&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the animation resource string shutdown registration caller when its callback store is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const masked=NativeHeapObjectViews.prototype.maskedWord;let changed=false,probing=false,target:NativeHeapObjectViews|null=null,priorBytes:number[]|null=null,priorMasks:number[]|null=null;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!changed&&!probing&&offset===232&&this.bytes.length===256){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,p=f?.exitCursor?.provenance;if(f?.pc==='3067150b'&&f.typeNameFiftySeventhCStringCopyReturned&&p?.kind==='engine-allocation'&&p.fields===this){changed=true;target=this;priorBytes=Array.from(this.bytes.slice(offset,offset+4));priorMasks=Array.from(this.knownMask.slice(offset,offset+4));throw new Error('Interrupted animation resource string shutdown callback store');}}finally{probing=false;}}return masked.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(changed,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('3067150b');const observed=target as NativeHeapObjectViews|null;if(!observed)throw new Error('Actual shutdown table required');expect(Array.from(observed.bytes.slice(232,236))).toEqual(priorBytes);expect(Array.from(observed.knownMask.slice(232,236))).toEqual(priorMasks);expect(f.exitCursor!.provenance).toMatchObject({offset:232});expect(f.cppCursor!.provenance).toMatchObject({offset:0x1e4});expect(f.typeNameFiftySeventhCStringCopyReturned).toBe(true);expect(Buffer.from(f.typeNameFiftySeventhCString!.bytes.slice(8,'bCAnimationResourceString'.length+9)).toString()).toBe('bCAnimationResourceString\0');expect(f.onexitLockHeld).toBe(true);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(false);const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'animationResourceStringPropertyRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30078369','30732630'])expect(graph.value.snapshot().calls.filter(c=>c.site===site&&!c.returned)).toHaveLength(1);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the original shape-group enum-template constructor at its actual parser dependency',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const result=bootstrap.processAttach();expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;
 expect(f.pc,result.known?'Unexpected completed startup':result.reason).toBe('306992a7');expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(true);
 expect(f.cppCursor?.provenance).toMatchObject({offset:0x1e8});expect(f.exitCursor?.provenance).toMatchObject({offset:236});expect(f.typeNameFiftyEighthCStringCopyReturned).toBe(false);
 const enumInfo=NativeEngineCinitImages.imageForCrt(f.images,crt,'shapeGroupContainerPropertyTypeInfo');if(!enumInfo.known)throw new Error(enumInfo.reason);const cursor=f.undecorationParserWords![3]!.provenance;expect(cursor).toMatchObject({kind:'engine-image',offset:50});if(cursor?.kind!=='engine-image')throw new Error('Actual advanced enum cursor required');expect(cursor.fields).toBe(enumInfo.value);const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'shapeGroupContainerPropertyRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);expect(graph.value.snapshot().calls.filter(c=>c.site==='30732640'&&!c.returned)).toHaveLength(1);const scopes=graph.value.snapshot().calls.filter(c=>c.site==='306996a3');expect(scopes.at(-1)).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'306996a8'}}});expect(scopes.filter(c=>!c.returned)).toHaveLength(1);for(const site of ['3069964b','30698035','30697def','306976fe','30697b1e','30697b25','30697b3d','3069752f','3069754f','3069755b','3069756c','3069732d','3069733e','30697357','3069757a','30697b52','30697df6','3069965a','30699666','3069969a'])expect(graph.value.snapshot().calls.filter(c=>c.site===site).at(-1)).toMatchObject({returned:true});
 expect(bootstrap.processAttach()).toEqual(result);
},30_000);

it('retains the original enum helper caller when its underlying digit read is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const read=NativeHeapObjectViews.prototype.readUnsigned;let interrupted=false,probing=false;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!interrupted&&!probing&&offset===35&&width===1){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,p=f?.undecorationParserWords?.[3]?.provenance;if(f?.pc==='30697fa8'&&p?.kind==='engine-image'&&p.fields===this&&p.offset===offset){interrupted=true;throw new Error('Interrupted actual enum underlying digit read');}}finally{probing=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}
 expect(interrupted,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('30697fa8');expect(f.undecorationParserWords![3]!.provenance).toMatchObject({offset:35});expect(f.cppCursor?.provenance).toMatchObject({offset:0x1e8});expect(f.exitCursor?.provenance).toMatchObject({offset:236});expect(f.typeNameFiftyEighthCStringCopyReturned).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(true);
 const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'shapeGroupContainerPropertyRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30732640','3069964b'])expect(graph.value.snapshot().calls.filter(c=>c.site===site&&!c.returned)).toHaveLength(1);expect(graph.value.snapshot().calls.some(c=>c.site==='30698035')).toBe(false);
 expect(bootstrap.processAttach()).toEqual(result);
},30_000);

it('retains the enum literal constructor when its first character read is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,browserGameProcessInputs,{engineHeapLayout:'rounded-eight',processorFeatureProcedure:true,floatingPointPrecisionErratum:false});
 createNativeRuntimeAdminOwner(platform,{memoryExtensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension]});
 const lookup=NativeEngineCinitImages.imageForCrt;let target:NativeHeapObjectViews|null=null;const imageSpy=vi.spyOn(NativeEngineCinitImages,'imageForCrt').mockImplementation((images,owner,label)=>{const result=lookup(images,owner,label);if(owner===crt&&label==='undecorationEnumLiteral'&&result.known)target=result.value;return result;});const read=NativeHeapObjectViews.prototype.readUnsigned;let interrupted=false,probing=false;const spy=vi.spyOn(NativeHeapObjectViews.prototype,'readUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,width){if(!interrupted&&!probing&&this===target&&offset===0&&width===1){probing=true;try{const f=bootstrap.attachProgress().engineCinitProgress,p=f?.undecorationLiteralArgument?.provenance;if(f?.pc==='306976f0'&&p?.kind==='engine-image'&&p.fields===this&&p.offset===0){interrupted=true;throw new Error('Interrupted actual enum literal character read');}}finally{probing=false;}}return read.call(this,offset,width);});
 let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();imageSpy.mockRestore();}
 expect(interrupted,result.known?'Unexpected completed startup':result.reason).toBe(true);expect(result.known).toBe(false);const f=bootstrap.attachProgress().engineCinitProgress!;expect(f.pc).toBe('306976f0');expect(f.cppCursor?.provenance).toMatchObject({offset:0x1e8});expect(f.exitCursor?.provenance).toMatchObject({offset:236});expect(f.typeNameFiftyEighthCStringCopyReturned).toBe(false);expect(f.typeNameLockHeld).toBe(false);expect(f.undecorationLockHeld).toBe(true);const root=NativeEngineCinitImages.imageForCrt(f.images,crt,'shapeGroupContainerPropertyRoot');if(!root.known)throw new Error(root.reason);expect(root.value.readUnsigned(0)).toBe(0);
 const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);for(const site of ['30732640','3069965a','30697def'])expect(graph.value.snapshot().calls.filter(c=>c.site===site&&!c.returned)).toHaveLength(1);expect(graph.value.snapshot().calls.some(c=>c.site==='306976fe')).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
},30_000);
