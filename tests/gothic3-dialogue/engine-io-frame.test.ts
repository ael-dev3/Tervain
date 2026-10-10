import type {NativeWin32ProcessInputSelection} from '../../src/gothic3/native-win32-process-inputs';
import type {NativeArgvNlsCallGrant,NativeWin32ArgvNlsSelection} from '../../src/gothic3/native-win32-argv-nls';
import {browserGameArgvNlsInputs} from '../../src/gothic3/browser-game-argv-nls-inputs';
import {NativeCrtThreadStartup} from '../../src/gothic3/native-crt-thread-startup';
import {expect,it,vi} from 'vitest';
// Retained Engine startup now executes both case conversions; allow for CI load.
vi.setConfig({testTimeout:20_000});
import {NativeCrtBootstrap} from '../../src/gothic3/native-crt-bootstrap';
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
function fixture(startupInfoA?:NativeStartupInfoWriterSelection,standardIo?:NativeWin32StandardIoSelection,argvNls?:NativeWin32ArgvNlsSelection,pageAlignment=true,processInputs:NativeWin32ProcessInputSelection=browserGameProcessInputs){
 const platform=new NativeRuntimePlatform({engineCrtServices:{argvNls,standardIo,startupIo:startupInfoA?{startupInfoA}:undefined,tlsValues:new Map(),kernel32Available:true,pointerCodec:'absent',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},processInputs,
  entropy:{systemTimeAsFileTime:()=>({known:true,value:{low:0x12345678,high:1}}),currentProcessId:()=>({known:true,value:4}),currentThreadId:()=>({known:true,value:5}),tickCount:()=>({known:true,value:6}),performanceCounter:()=>({known:true,value:{success:true,low:7,high:8}})},
  threadStack:{threadCapability:{},reservationBytes:4096,addressModel:'opaque-relative',initialRegisters:'unknown',initialFs0:'unknown',pageAlignment:pageAlignment?'virtual-page-4096':undefined}}});
 let bootstrap:NativeCrtBootstrap;const crt=new NativeEngineCrtOwner({platform,errnoSlot:()=>bootstrap.thread.errnoSlot(),getLastError:()=>platform.getWin32LastError()});bootstrap=NativeCrtBootstrap.forCrt(crt);return {crt,platform,bootstrap};
}
function observeBeforeParser(bootstrap:NativeCrtBootstrap,observe:()=>void){
 const original=NativeCrtBootstrap.engineArgvCommandLineForCrt,spy=vi.spyOn(NativeCrtBootstrap,'engineArgvCommandLineForCrt').mockImplementation((...args)=>{if(args[0]===bootstrap)observe();return original(...args);});try{return bootstrap.processAttach();}finally{spy.mockRestore();}
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
 expect(result.reason).toContain('Engine argument allocation caller at3068e7c9');
 const frame=bootstrap.attachProgress().engineArgvProgress!;
 expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,codepageCtorReturned:true,codepageAcpReturned:true,codepageReturned:true,codepageResult:1252});
 expect(frame.codepagePtd!.readUnsigned(0x70)).toBe(1);expect(selectedArgument).toBe(1252);

 const automatic=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'codepageAutomatic');if(!automatic.known)throw new Error(automatic.reason);expect(automatic.value.readUnsigned(0)).toBe(0);
 expect(NativeX86ThreadStack.engineArgvNlsArgumentsForPlatform(platform,{identity:{}}).known).toBe(false);
 expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.attachProgress().engineArgvProgress!.operations).toBe(12669);
});

it('preserves an already owned Engine locale flag through the code-page helper',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const original=NativeCrtBootstrap.engineArgvPtdForCrt;let changed=false;
 const probe=vi.spyOn(NativeCrtBootstrap,'engineArgvPtdForCrt').mockImplementation((...args)=>{const result=original(...args);if(result.known&&result.value&&!changed&&bootstrap.attachProgress().engineArgvProgress?.codepageEbp!=null){result.value.writeUnsigned(0x70,3);changed=true;}return result;});
 let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(changed).toBe(true);expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;
 expect(frame).toMatchObject({pc:'3068e7c9',codepageReturned:true,codepageResult:1252});expect(frame.codepagePtd!.readUnsigned(0x70)).toBe(3);
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
 expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,multibyteMallocReturned:true,multibyteCopyReturned:true});expect(destination.backing).not.toBe(source.backing);expect(destination.bytes.length).toBe(544);
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
 expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcInitCodepageReturned:true,mbcValidCodepageReturned:true,mbcInfoReturned:true});expect([...info!.slice(0,4)]).toEqual([1,0,0,0]);expect(Array.from(info!.slice(4,18))).toEqual([63,...Array(13).fill(0)]);
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
 expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcMemsetReturned:true,mbcSingleByteInitialized:true});expect(fields.readUnsigned(0)).toBe(2);expect(fields.readUnsigned(4)).toBe(1252);expect(fields.readUnsigned(8)).toBe(0);expect(fields.readUnsigned(12)).toBe(0);expect(initialized).not.toBe(null);expect(Array.from(initialized!.slice(0,269))).toEqual(Array(269).fill(0));expect(Array.from(masks!.slice(0,269))).toEqual(Array(269).fill(255));expect(initialized![269]).toBe(0xa5);expect(masks![269]).toBe(0x55);expect(bootstrap.processAttach()).toEqual(result);
});
it('prepares the case-table frame and its actual code-page arguments on the retained Engine stack',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;let abi:number[]|null=null;const spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30691517'){const caller=graph.value.snapshot().calls.find(call=>call.site==='30684dc7')!,esp=caller.position-1352;abi=[0,4,12,20,24,28].map(offset=>frame.stack.readUnsigned(esp+offset));}return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,snapshot=graph.value.snapshot(),caller=snapshot.calls.find(call=>call.site==='30684dc7')!;
 const caseEbp=caller.position-1184;
 expect(frame).toMatchObject({pc:'3068e7c9',operations:12669});expect(caller.returned).toBe(true);expect(caller.returnWord).toMatchObject({provenance:{kind:'source',type:'code',address:'30684dcc'}});
 expect(snapshot.registers.EBP).toMatchObject({changed:false,word:{provenance:{kind:'stack',offset:frame.ebp!}}});expect(snapshot.registers.ESP).toMatchObject({changed:false,word:{provenance:{kind:'stack',offset:snapshot.calls.find(call=>call.site==='3068e7c4')!.position+4}}});expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);
 expect(abi).toEqual([0,1,256,1252,0,0]);expect(frame.stack.maskedWord(caseEbp+1176).knownMask).not.toBe(0xffffffff);
 expect(snapshot.calls.find(call=>call.site==='306849d4')?.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='30684a46')?.returned).toBe(true);expect(frame.mbcCaseEbp).toBe(caseEbp);expect(frame.mbcCaseInfoReturned).toBe(true);expect(frame.mbcCaseInfo!.readUnsigned(0)).toBe(1);expect(frame.mbcCaseInfo!.backing).toBe(frame.stack.backing);expect(frame.mbcCaseInfo!.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(caseEbp-124);expect(frame.stack.bytes.slice(caseEbp+0x398,caseEbp+0x498)).toEqual(Uint8Array.from({length:256},(_,index)=>index===0?32:index));expect(frame.stack.knownMask.slice(caseEbp+0x398,caseEbp+0x498)).toEqual(new Uint8Array(256).fill(255));expect(bootstrap.processAttach()).toEqual(result);
});
it('constructs a separate classification locale record and releases only its acquired ownership after the body returns',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 let ecxMask:number|null=null;const result=observeBeforeParser(bootstrap,()=>{ecxMask=bootstrap.attachProgress().engineArgvProgress!.bank.maskedWord(8).knownMask;}),frame=bootstrap.attachProgress().engineArgvProgress!,snapshot=graph.value.snapshot(),fields=frame.mbcClassifyLocaleRecord!,body=snapshot.calls.find(call=>call.site==='306916cb')!;
 expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcClassifyCtorReturned:true});expect(frame.mbcClassifyPtd).toBe(frame.multibytePtd);expect(frame.mbcClassifyPtd!.readUnsigned(0x70)).toBe(1);expect(fields).not.toBe(frame.codepageLocaleRecord);expect(fields.backing).toBe(frame.stack.backing);expect(fields.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcClassifyEbp!-16);
 expect(snapshot.calls.find(call=>call.site==='306916ae')?.returned).toBe(true);expect(body.returned).toBe(true);expect(body.returnWord).toMatchObject({provenance:{kind:'source',type:'code',address:'306916d0'}});expect(ecxMask).toBe(0);expect(bootstrap.processAttach()).toEqual(result);
});
it('returns the original Unicode classification probe into its separate Engine stack WORD',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;let observed:number|null=null,masks:number[]|null=null;const spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30691517'){observed=frame.mbcClassifyProbe!.readUnsigned(0,2);masks=[...frame.mbcClassifyProbe!.knownMask];}return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,fields=frame.mbcClassifyProbe!,selector=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'classificationApiSelector');if(!selector.known)throw new Error(selector.reason);
 expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcClassifyProbeReturned:true});expect(fields.backing).toBe(frame.stack.backing);expect(fields.bytes.length).toBe(2);expect(fields.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcClassifyBodyEbp!-8);expect(observed).toBe(browserGameArgvNlsInputs.ctype1[0]);expect(frame.mbcConversionQueryReturned).toBe(true);expect(masks).toEqual([255,255]);expect(selector.value.readUnsigned(0)).toBe(1);
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
 const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform;let argumentsAtReturn:number[]|null=null,queryResult:number|null=null;const probe=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3069158e'){queryResult=result.known&&result.value.kind==='scalar'?result.value.value:null;const position=graph.value.snapshot().calls.find(call=>call.site==='3069158e')!.position;argumentsAtReturn=[4,8,16,20,24].map(offset=>frame.stack.readUnsigned(position+offset));}return result;});let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,query=graph.value.snapshot().calls.find(call=>call.site==='3069158e')!,fields=frame.mbcConversionInput!;
 expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcConversionQueryReturned:true});expect(fields.backing).toBe(frame.stack.backing);expect(fields.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcCaseEbp!+0x398);expect(fields.bytes.length).toBe(256);expect(fields.bytes).toEqual(Uint8Array.from({length:256},(_,index)=>index===0?32:index));
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
 const frame=bootstrap.attachProgress().engineArgvProgress!,buffer=frame.mbcStackBuffer!,base=frame.mbcStackEntryEsp!-frame.mbcStackBytes!,aligned=520+((frame.mbcStackEntryEsp!-520)&15);expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcStackReturned:true,mbcStackMemsetReturned:true});expect(frame.mbcStackBytes).toBe(aligned);expect(base%16).toBe(0);expect(buffer.backing).toBe(frame.stack.backing);expect(buffer.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(base);expect(buffer.bytes.length).toBe(520);expect(finishedBytes).not.toBe(null);expect(finishedBytes!.slice(0,4)).toEqual(Uint8Array.from([0xcc,0xcc,0,0]));expect(padding).not.toBe(null);expect(finishedBytes!.slice(4,8)).toEqual(padding);expect(finishedMasks!.slice(4,8)).toEqual(paddingMasks);expect(clearedBytes).toEqual(new Uint8Array(512));expect(clearedMasks).toEqual(new Uint8Array(512).fill(255));
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
 const frame=bootstrap.attachProgress().engineArgvProgress!;expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3068e7c9',mbcConversionFillReturned:true,mbcCaseTypesReturned:true});expect(observed).toBe(true);for(const site of ['306915f8','30691606'])expect(graph.value.snapshot().calls.find(call=>call.site===site)?.returned).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
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
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(result.known).toBe(false);if(result.known)throw new Error('Mapping scan remains unfinished');expect(result.reason).toContain('Engine argument allocation caller at3068e7c9');expect(frame).toMatchObject({pc:'3068e7c9',operations:12669});
 const selector=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'mappingApiSelector');if(!selector.known)throw new Error(selector.reason);expect(selector.value.readUnsigned(0)).toBe(1);const call=graph.value.snapshot().calls.find(call=>call.site==='3067c5ac')!;expect(call.returned).toBe(true);expect(call.returnWord).toMatchObject({provenance:{kind:'source',type:'code',address:'3067c5b2'}});expect(graph.value.snapshot().calls.find(call=>call.site==='3067c94a')?.returned).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});

it('uses the current Engine mapping selector without repeating a successful probe',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),selector=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'mappingApiSelector');if(!selector.known)throw new Error(selector.reason);selector.value.writeUnsigned(0,1);const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3068e7c9',operations:12656});expect(graph.value.snapshot().calls.some(call=>call.site==='3067c5ac')).toBe(false);expect(selector.value.readUnsigned(0)).toBe(1);
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
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'maskedWord').mockImplementation(function(this:NativeHeapObjectViews,...args){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3067c67a'&&this===frame.stack&&args[0]===frame.mbcMappingStackEntryEsp!-frame.mbcMappingStackBytes!){padding=frame.mbcMappingStackBuffer!.bytes.slice(4,8);masks=frame.mbcMappingStackBuffer!.knownMask.slice(4,8);}return original.apply(this,args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,buffer=frame.mbcMappingStackBuffer!,base=frame.mbcMappingStackEntryEsp!-frame.mbcMappingStackBytes!;expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcMappingStackReturned:true});expect(buffer).not.toBe(frame.mbcStackBuffer);expect(buffer.backing).toBe(frame.stack.backing);expect(buffer.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(base);expect(base%16).toBe(0);expect(buffer.bytes.length).toBe(520);expect(buffer.readUnsigned(0)).toBe(0xcccc);expect(padding).not.toBe(null);expect(buffer.bytes.slice(4,8)).toEqual(padding);expect(buffer.knownMask.slice(4,8)).toEqual(masks);
 const call=graph.value.snapshot().calls.filter(call=>call.site==='3067c66f').at(-1)!;expect(call.returned).toBe(true);expect(call.returnWord).toMatchObject({provenance:{kind:'source',type:'code',address:'3067c674'}});expect(call.position).toBe(frame.mbcMappingStackEntryEsp!-4);expect(bootstrap.processAttach()).toEqual(result);
});

it('fills every Engine mapping Unicode code unit and returns its actual mapping-size query',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);let ecxMask:number|null=null,count:number|null=null;observeBeforeParser(bootstrap,()=>{const f=bootstrap.attachProgress().engineArgvProgress!;ecxMask=f.bank.maskedWord(8).knownMask;count=f.stack.readUnsigned(f.mbcMappingEbp!-56-8);});const frame=bootstrap.attachProgress().engineArgvProgress!,wide=frame.mbcMappingWideOutput!;expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcMappingFillReturned:true,mbcMappingSizeReturned:true});expect(wide.backing).toBe(frame.stack.backing);expect(wide.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcMappingStackEntryEsp!-frame.mbcMappingStackBytes!+8);expect(wide.bytes.length).toBe(512);for(let index=0;index<256;index++)expect(wide.readUnsigned(index*2,2)).toBe(browserGameArgvNlsInputs.unicode[index===0?32:index]);expect([...wide.knownMask]).toEqual(Array(512).fill(255));expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(ecxMask).toBe(0);for(const site of ['3067c6b6','3067c6d2'])expect(graph.value.snapshot().calls.find(call=>call.site===site)?.returned).toBe(true);expect(count).toBe(256);
});
it('retains partial Engine mapping Unicode writes and its pending conversion return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;let untouched:Uint8Array|null=null,masks:Uint8Array|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3067c6b6'&&this===frame.mbcMappingWideOutput){if(offset===0){untouched=this.bytes.slice(12,14);masks=this.knownMask.slice(12,14);}if(offset===12)throw new Error('Interrupted Engine mapping Unicode output');}original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067c6b6',mbcMappingFillReturned:false,mbcMappingSizeReturned:false});for(let index=0;index<6;index++)expect(frame.mbcMappingWideOutput!.readUnsigned(index*2,2)).toBe(browserGameArgvNlsInputs.unicode[index===0?32:index]);expect(untouched).not.toBe(null);expect(frame.mbcMappingWideOutput!.bytes.slice(12,14)).toEqual(untouched);expect(frame.mbcMappingWideOutput!.knownMask.slice(12,14)).toEqual(masks);expect(graph.value.snapshot().calls.find(call=>call.site==='3067c6b6')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('maps every Engine character into a separate aligned upper-case Unicode buffer',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);bootstrap.processAttach();const frame=bootstrap.attachProgress().engineArgvProgress!,mapped=frame.mbcMappedOutput!,base=frame.mbcMappedStackEntryEsp!-frame.mbcMappedStackBytes!;expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcMappedFillReturned:true});expect(mapped).not.toBe(frame.mbcMappingWideOutput);expect(mapped.backing).toBe(frame.stack.backing);expect(base%16).toBe(0);expect(frame.mbcMappedStackBuffer!.readUnsigned(0)).toBe(0xcccc);expect(mapped.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(base+8);expect(mapped.bytes.byteOffset+mapped.bytes.length).toBeLessThanOrEqual(frame.mbcMappingWideOutput!.bytes.byteOffset);for(let index=0;index<256;index++)expect(mapped.readUnsigned(index*2,2)).toBe(browserGameArgvNlsInputs.upper[index===0?32:index]);expect(mapped.readUnsigned(65*2,2)).toBe(65);expect([...mapped.knownMask]).toEqual(Array(512).fill(255));expect(graph.value.snapshot().calls.find(call=>call.site==='3067c72d')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3067c732'}}});expect(graph.value.snapshot().calls.find(call=>call.site==='3067c76f')?.returned).toBe(true);
});
it('retains partial Engine lower-case Unicode writes and the actual pending mapping return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;let untouched:Uint8Array|null=null,masks:Uint8Array|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3067c76f'&&this===frame.mbcMappedOutput){if(offset===0){untouched=this.bytes.slice(12,14);masks=this.knownMask.slice(12,14);}if(offset===12)throw new Error('Interrupted Engine lower-case output');}original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3067c76f',mbcMappedFillReturned:false});for(let index=0;index<6;index++)expect(frame.mbcMappedOutput!.readUnsigned(index*2,2)).toBe(browserGameArgvNlsInputs.lower[index===0?32:index]);expect(untouched).not.toBe(null);expect(frame.mbcMappedOutput!.bytes.slice(12,14)).toEqual(untouched);expect(frame.mbcMappedOutput!.knownMask.slice(12,14)).toEqual(masks);expect(graph.value.snapshot().calls.find(call=>call.site==='3067c76f')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});


it('narrows every mapped Engine character into its original lower-case byte destination',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);bootstrap.processAttach();const frame=bootstrap.attachProgress().engineArgvProgress!,output=frame.mbcLowerCaseOutput!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcNarrowReturned:true});expect(output.backing).toBe(frame.stack.backing);expect(output.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcCaseEbp!+0x298);expect(output.bytes.length).toBe(256);for(let index=0;index<256;index++)expect(output.readUnsigned(index,1)).toBe(reverse.get(browserGameArgvNlsInputs.lower[index===0?32:index]!));expect(output.readUnsigned(65,1)).toBe(97);expect([...output.knownMask]).toEqual(Array(256).fill(255));expect(graph.value.snapshot().calls.find(call=>call.site==='3067c792')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3067c798'}}});
});
it('retains partial Engine byte narrowing and forbids replaying its pending return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;let untouched:Uint8Array|null=null,masks:Uint8Array|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='3067c792'&&this===frame.mbcNarrowedOutput){if(offset===0){untouched=this.bytes.slice(6);masks=this.knownMask.slice(6);}if(offset===6)throw new Error('Interrupted Engine byte narrowing');}original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(frame).toMatchObject({pc:'3067c792',mbcNarrowReturned:false});for(let index=0;index<6;index++)expect(frame.mbcNarrowedOutput!.readUnsigned(index,1)).toBe(reverse.get(browserGameArgvNlsInputs.lower[index===0?32:index]!));expect(untouched).not.toBe(null);expect(frame.mbcNarrowedOutput!.bytes.slice(6)).toEqual(untouched);expect(frame.mbcNarrowedOutput!.knownMask.slice(6)).toEqual(masks);expect(graph.value.snapshot().calls.find(call=>call.site==='3067c792')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('returns both Engine mapping cleanup calls, checks its cookie and releases owned locale state',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!,calls=graph.value.snapshot().calls;expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcMappingReturned:true});for(const [site,address] of [['3067c79c','3067c7a1'],['3067c7a5','3067c7aa'],['3067c917','3067c91c'],['3067c94a','3067c94f'],['30684a66','30684a6b']])expect(calls.find(call=>call.site===site)).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address}}});expect(calls.some(call=>call.site==='30675d7a')).toBe(false);expect(frame.mbcMappingPtd!.readUnsigned(0x70)).toBe(1);expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(bootstrap.processAttach()).toEqual(result);
});

it('executes both original Engine mapping calls into separate lower and upper byte destinations',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(result.known).toBe(false);expect(frame).toMatchObject({pc:'3068e7c9',mbcMappingPass:'upper',mbcMappingReturned:true,mbcNarrowReturned:true});expect(frame.mbcLowerCaseOutput).not.toBe(frame.mbcUpperCaseOutput);for(const [output,table,offset] of [[frame.mbcLowerCaseOutput!,browserGameArgvNlsInputs.lower,0x298],[frame.mbcUpperCaseOutput!,browserGameArgvNlsInputs.upper,0x198]] as const){expect(output.backing).toBe(frame.stack.backing);expect(output.bytes.byteOffset-frame.stack.bytes.byteOffset).toBe(frame.mbcCaseEbp!+offset);for(let index=0;index<256;index++)expect(output.readUnsigned(index,1)).toBe(reverse.get(table[index===0?32:index]!));expect([...output.knownMask]).toEqual(Array(256).fill(255));}expect(frame.mbcLowerCaseOutput!.readUnsigned(65,1)).toBe(97);expect(frame.mbcUpperCaseOutput!.readUnsigned(97,1)).toBe(65);for(const site of ['30684a66','30684a8b'])expect(graph.value.snapshot().calls.find(call=>call.site===site)?.returned).toBe(true);expect(graph.value.snapshot().calls.filter(call=>call.site==='3067c5ac')).toHaveLength(1);expect(frame.mbcMappingPtd!.readUnsigned(0x70)).toBe(1);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('retains the completed lower table when the original upper byte conversion is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;let untouched:Uint8Array|null=null,masks:Uint8Array|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.mbcMappingPass==='upper'&&frame.pc==='3067c792'&&this===frame.mbcNarrowedOutput){if(offset===0){untouched=this.bytes.slice(6);masks=this.knownMask.slice(6);}if(offset===6)throw new Error('Interrupted Engine upper narrowing');}original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(frame).toMatchObject({pc:'3067c792',mbcMappingPass:'upper',mbcMappingReturned:false,mbcNarrowReturned:false,mbcUpperCaseOutput:null});for(let index=0;index<256;index++)expect(frame.mbcLowerCaseOutput!.readUnsigned(index,1)).toBe(reverse.get(browserGameArgvNlsInputs.lower[index===0?32:index]!));for(let index=0;index<6;index++)expect(frame.mbcNarrowedOutput!.readUnsigned(index,1)).toBe(reverse.get(browserGameArgvNlsInputs.upper[index===0?32:index]!));expect(untouched).not.toBe(null);expect(frame.mbcNarrowedOutput!.bytes.slice(6)).toEqual(untouched);expect(frame.mbcNarrowedOutput!.knownMask.slice(6)).toEqual(masks);const calls=graph.value.snapshot().calls.filter(call=>call.site==='3067c792');expect(calls).toHaveLength(2);expect(calls[0]!.returned).toBe(true);expect(calls[1]!.returned).toBe(false);expect(frame.mbcMappingPtd!.readUnsigned(0x70)).toBe(3);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('publishes all original Engine character flags and case bytes then returns both retained callers',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);let tail:Uint8Array|null=null,masks:Uint8Array|null=null;const original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform,spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.mbcMappingPass==='upper'&&frame.pc==='3067c792'){tail=frame.multibyteAllocation!.bytes.slice(541);masks=frame.multibyteAllocation!.knownMask.slice(541);}return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,record=frame.multibyteAllocation!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(frame).toMatchObject({pc:'3068e7c9',mbcCaseReturned:true,mbcInitReturned:true});for(let index=0;index<256;index++){const input=index===0?32:index,type=browserGameArgvNlsInputs.ctype1[input]!,flag=type&1?0x10:type&2?0x20:0,converted=type&1?reverse.get(browserGameArgvNlsInputs.lower[input]!):type&2?reverse.get(browserGameArgvNlsInputs.upper[input]!):0;expect(record.readUnsigned(29+index,1)).toBe(flag);expect(record.readUnsigned(285+index,1)).toBe(converted);}expect(record.readUnsigned(29+65,1)).toBe(0x10);expect(record.readUnsigned(285+65,1)).toBe(97);expect(record.readUnsigned(29+97,1)).toBe(0x20);expect(record.readUnsigned(285+97,1)).toBe(65);expect(tail).not.toBe(null);expect(record.bytes.slice(541)).toEqual(tail);expect(record.knownMask.slice(541)).toEqual(masks);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:record,offset:0},544).known).toBe(true);for(const [site,address] of [['30684b2d','30684b32'],['30684dc7','30684dcc'],['30684e2a','30684e2f'],['30684ecb','30684ed0']])expect(graph.value.snapshot().calls.find(call=>call.site===site)).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address}}});expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('retains partial Engine character-record writes without returning the case initializer',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeHeapObjectViews.prototype.writeUnsigned;let untouched:Uint8Array|null=null,masks:Uint8Array|null=null;
 const spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){const frame=bootstrap.attachProgress().engineArgvProgress;if(this===frame?.multibyteAllocation){if(frame.pc==='30684ac7'&&offset===285){untouched=this.bytes.slice(355);masks=this.knownMask.slice(355);}if(frame.pc==='30684abe'&&offset===355)throw new Error('Interrupted Engine character record publication');}original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,record=frame.multibyteAllocation!,reverse=new Map(browserGameArgvNlsInputs.reverse);expect(frame).toMatchObject({pc:'30684abe',mbcMappingReturned:true,mbcCaseReturned:false,mbcInitReturned:false});for(let index=0;index<70;index++){const input=index===0?32:index,type=browserGameArgvNlsInputs.ctype1[input]!,converted=type&1?reverse.get(browserGameArgvNlsInputs.lower[input]!):type&2?reverse.get(browserGameArgvNlsInputs.upper[input]!):0;expect(record.readUnsigned(285+index,1)).toBe(converted);}expect(record.readUnsigned(29+70,1)).toBe(0x10);expect(untouched).not.toBe(null);expect(record.bytes.slice(355)).toEqual(untouched);expect(record.knownMask.slice(355)).toEqual(masks);for(const site of ['30684dc7','30684ecb'])expect(graph.value.snapshot().calls.find(call=>call.site===site)?.returned).toBe(false);expect(record.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('releases the prior Engine MBC reference and installs the populated record through both imports',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const old=bootstrap.thread.physical.mbcObject,original=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform;let before:number|null=null;const spy=vi.spyOn(NativeX86ThreadStack,'writeEngineArgvNlsMemoryForPlatform').mockImplementation((...args)=>{if(bootstrap.attachProgress().engineArgvProgress?.pc==='30684ee3')before=old.readUnsigned(0);return original(...args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e7c9',mbcPriorDecrementReturned:true,mbcInstalledInPtd:true,mbcReferenceIncrementReturned:true});expect(frame.mbcPriorReference).toBe(old);expect(before).not.toBe(null);expect(old.readUnsigned(0)).toBe((before!-2)>>>0);expect(old.backing.freed).toBe(false);expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(2);expect(frame.multibytePtd!.pointer(0x68).get()).toBe(frame.multibyteAllocation);for(const [site,address] of [['30684ee3','30684ee9'],['30684f08','30684f0a']])expect(graph.value.snapshot().calls.find(call=>call.site===site)).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address}}});expect(graph.value.snapshot().calls.some(call=>call.site==='30684ef8')).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('retains the installed Engine MBC pointer and pending increment if its reference write is interrupted',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform;const spy=vi.spyOn(NativeX86ThreadStack,'writeEngineArgvNlsMemoryForPlatform').mockImplementation((...args)=>{if(bootstrap.attachProgress().engineArgvProgress?.pc==='30684f08')throw new Error('Interrupted Engine MBC increment');return original(...args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'30684f08',mbcPriorDecrementReturned:true,mbcInstalledInPtd:true,mbcReferenceIncrementReturned:false});expect(frame.multibytePtd!.pointer(0x68).get()).toBe(frame.multibyteAllocation);expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(0);expect(graph.value.snapshot().calls.find(call=>call.site==='30684ee3')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(call=>call.site==='30684f08')?.returned).toBe(false);expect(frame.multibyteAllocation!.backing.freed).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
},20000);

it('publishes the Engine global MBC header under its actual lock before table copying',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);let tryLevel:number|null=null;const result=observeBeforeParser(bootstrap,()=>{const f=bootstrap.attachProgress().engineArgvProgress!;tryLevel=f.stack.readUnsigned(f.multibyteEbp!-4);}),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcGlobalLockHeld:false,mbcGlobalHeaderPublished:true,mbcInstalledInPtd:true});for(const [label,offset] of [['globalMbcCodepage',4],['globalMbcSingleByte',8],['globalMbcLocale',12]] as const){const image=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,label);if(!image.known)throw new Error(image.reason);expect(image.value.readUnsigned(0)).toBe(frame.multibyteAllocation!.readUnsigned(offset));}expect(graph.value.snapshot().calls.find(call=>call.site==='30684f23')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'30684f28'}}});for(const [label,offset,size] of [['globalMbcWideTypes',16,10],['globalMbcCharacterTypes',28,257],['globalMbcCaseBytes',285,256]] as const){const image=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,label);if(!image.known)throw new Error(image.reason);expect(image.value.bytes).toEqual(frame.multibyteAllocation!.bytes.slice(offset,offset+size));expect([...image.value.knownMask]).toEqual(Array(size).fill(255));}expect(tryLevel).toBe(0xfffffffe);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains partial Engine global case copying and the held publication lock',()=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),image=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'globalMbcCaseBytes');if(!image.known)throw new Error(image.reason);const tail=image.value.bytes.slice(70),masks=image.value.knownMask.slice(70),original=NativeHeapObjectViews.prototype.writeUnsigned,spy=vi.spyOn(NativeHeapObjectViews.prototype,'writeUnsigned').mockImplementation(function(this:NativeHeapObjectViews,offset,value,width){if(this===image.value&&offset===70)throw new Error('Interrupted Engine global case copy');original.call(this,offset,value,width);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'30684f8b',mbcGlobalLockHeld:true,mbcGlobalHeaderPublished:true});expect(image.value.bytes.slice(0,70)).toEqual(frame.multibyteAllocation!.bytes.slice(285,355));expect(image.value.bytes.slice(70)).toEqual(tail);expect(image.value.knownMask.slice(70)).toEqual(masks);expect(frame.multibytePtd!.pointer(0x68).get()).toBe(frame.multibyteAllocation);expect(bootstrap.processAttach()).toEqual(result);
});

it.each(['ptd','global'] as const)('honors the actual %s policy bit that skips Engine global publication',policy=>{
 const {bootstrap,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),original=NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform,spy=vi.spyOn(NativeRuntimePlatform,'canonicalArgvNlsNormalReturnForPlatform').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.pc==='30684f08'){if(policy==='ptd')frame.multibytePtd!.writeUnsigned(0x70,frame.multibytePtd!.readUnsigned(0x70)|2);}return result;});if(policy==='global'){const flags=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'multibyteLocaleFlags');if(!flags.known)throw new Error(flags.reason);flags.value.writeUnsigned(0,(flags.value.readUnsigned(0)|1)>>>0);}let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e7c9',mbcInstalledInPtd:true,mbcReferenceIncrementReturned:true,mbcGlobalLockHeld:false,mbcGlobalHeaderPublished:false});expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(1);expect(bootstrap.processAttach()).toEqual(result);
});

it('replaces the Engine global MBC reference, unlocks and returns the original multibyte wrapper',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!,images=bootstrap.attachProgress().engineArgvImages!,pointer=NativeEngineArgvImages.imageForCrt(images,crt,'currentMultibytePointer'),ready=NativeEngineArgvImages.imageForCrt(images,crt,'multibyteReady');if(!pointer.known||!ready.known)throw new Error('Missing global MBC images');expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,mbcGlobalDecrementReturned:true,mbcGlobalInstalled:true,mbcGlobalIncrementReturned:true,mbcGlobalLockHeld:false,multibyteFsRestored:true,multibyteReturned:true,multibyteWrapperReturned:true});expect(pointer.value.pointer(0).get()).toBe(frame.multibyteAllocation);expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(2);expect(frame.mbcGlobalPriorReference!.readUnsigned(0)).toBe(0xffffffff);expect(frame.mbcGlobalPriorReference!.backing.freed).toBe(false);expect(ready.value.readUnsigned(0)).toBe(1);for(const [site,address] of [['30684f9a','30684fa0'],['30684fbe','30684fc0'],['30684fd0','30684fd5'],['30684fc7','30684fcc'],['30685001','30685006'],['30685012','30685017']])expect(graph.value.snapshot().calls.find(call=>call.site===site)).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address}}});expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains the installed global Engine MBC when its second reference increment is interrupted',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform,spy=vi.spyOn(NativeX86ThreadStack,'writeEngineArgvNlsMemoryForPlatform').mockImplementation((...args)=>{if(bootstrap.attachProgress().engineArgvProgress?.pc==='30684fbe')throw new Error('Interrupted global Engine MBC increment');return original(...args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,images=bootstrap.attachProgress().engineArgvImages!,pointer=NativeEngineArgvImages.imageForCrt(images,crt,'currentMultibytePointer'),ready=NativeEngineArgvImages.imageForCrt(images,crt,'multibyteReady');if(!pointer.known||!ready.known)throw new Error('Missing MBC images');expect(frame).toMatchObject({pc:'30684fbe',mbcGlobalDecrementReturned:true,mbcGlobalInstalled:true,mbcGlobalIncrementReturned:false,mbcGlobalLockHeld:true,multibyteReturned:false,multibyteWrapperReturned:false});expect(pointer.value.pointer(0).get()).toBe(frame.multibyteAllocation);expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(1);expect(ready.value.readUnsigned(0)).toBe(0);expect(graph.value.snapshot().calls.find(call=>call.site==='30684fbe')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the actual Engine global unlock call without returning multibyte setup on failure',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeCrtBootstrap.engineArgvLocaleLockForCrt,spy=vi.spyOn(NativeCrtBootstrap,'engineArgvLocaleLockForCrt').mockImplementation((...args)=>bootstrap.attachProgress().engineArgvProgress?.pc==='30684fd0'?{known:false,reason:'Unavailable Engine global unlock'}:original(...args));let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!,ready=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'multibyteReady');if(!ready.known)throw new Error(ready.reason);expect(frame).toMatchObject({pc:'30684fd0',mbcGlobalInstalled:true,mbcGlobalIncrementReturned:true,mbcGlobalLockHeld:true,multibyteReturned:false,multibyteWrapperReturned:false});expect(frame.multibyteAllocation!.readUnsigned(0)).toBe(2);expect(ready.value.readUnsigned(0)).toBe(0);expect(graph.value.snapshot().calls.find(call=>call.site==='30684fd0')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('returns the Engine module filename through the actual three-argument import and owned buffer',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const sentinel=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'moduleFilenameSentinel');if(!sentinel.known)throw new Error(sentinel.reason);sentinel.value.writeUnsigned(0,165,1);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,moduleFilenameReturned:true,moduleFilenameResult:browserGameArgvNlsInputs.moduleName.length,multibyteWrapperReturned:true});expect([...frame.moduleFilename!.bytes.slice(0,browserGameArgvNlsInputs.moduleName.length)]).toEqual(browserGameArgvNlsInputs.moduleName);expect(frame.moduleFilename!.readUnsigned(browserGameArgvNlsInputs.moduleName.length,1)).toBe(0);expect(sentinel.value.readUnsigned(0,1)).toBe(0);expect(frame.moduleFilenameResult).toBe(browserGameArgvNlsInputs.moduleName.length);expect(graph.value.snapshot().calls.find(call=>call.site==='3068e799')).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3068e79f'}}});expect(bootstrap.processAttach()).toEqual(result);
});
it('retains partial Engine module filename output and the pending import without fabricated return',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeX86ThreadStack.writeEngineArgvNlsMemoryForPlatform,spy=vi.spyOn(NativeX86ThreadStack,'writeEngineArgvNlsMemoryForPlatform').mockImplementation((...args)=>{if(bootstrap.attachProgress().engineArgvProgress?.pc==='3068e799'&&args[2]===3)throw new Error('Interrupted Engine filename output');return original(...args);});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e799',moduleFilenameReturned:false,moduleFilenameResult:null,multibyteWrapperReturned:true});expect([...frame.moduleFilename!.bytes.slice(0,3)]).toEqual(browserGameArgvNlsInputs.moduleName.slice(0,3));expect(frame.moduleFilename!.readUnsigned(3,1)).toBe(0);expect(graph.value.snapshot().calls.find(call=>call.site==='3068e799')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('counts the retained Engine process command line and returns through the real parser caller',()=>{
 const {bootstrap,platform,crt}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!,call=graph.value.snapshot().calls.find(call=>call.site==='3068e7c4')!,name=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'programNamePointer');if(!name.known)throw new Error(name.reason);expect(frame).toMatchObject({pc:'3068e7c9',operations:12669,programNamePublished:true,argumentUsesFilename:false,parserCalled:true,parserReturned:true,parserOperations:1047,parserCounts:{count:2,bytes:12}});expect(frame.commandLinePointer).not.toBe(null);expect(name.value.pointer(0).get()).toMatchObject({fields:frame.moduleFilename,offset:0});expect(call).toMatchObject({returned:true,returnWord:{provenance:{kind:'source',type:'code',address:'3068e7c9'}}});expect(graph.value.snapshot().registers.ESP).toMatchObject({changed:false,word:{provenance:{kind:'stack',offset:call.position+4}}});expect(bootstrap.processAttach()).toEqual(result);
});
it.each(['null','empty'] as const)('counts the actual filename fallback for an Engine %s command line',kind=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,{...browserGameProcessInputs,commandLineA:kind==='null'?{kind:'null'}:{kind:'buffer',bytes:[0]}}),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e7c9',argumentUsesFilename:true,programNamePublished:true,parserCalled:true,parserReturned:true,parserCounts:{count:2,bytes:browserGameArgvNlsInputs.moduleName.length+1}});expect(bootstrap.processAttach()).toEqual(result);
});
it('stops at the actual unknown Engine command line byte without guessing filename fallback',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,{...browserGameProcessInputs,commandLineA:{kind:'buffer',bytes:[65,0],knownMask:[0,255]}});const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e7ae',programNamePublished:true,argumentUsesFilename:false,argumentInput:null,parserCalled:false});expect(bootstrap.processAttach()).toEqual(result);
});

it.each([
 {bytes:[103,32,97,0],count:3,size:4},
 {bytes:[103,32,34,97,32,98,34,0],count:3,size:6},
 {bytes:[103,32,34,34,0],count:3,size:3},
 {bytes:[103,32,97,92,34,98,0],count:3,size:6},
 {bytes:[103,32,34,97,34,34,98,34,0],count:3,size:6},
 {bytes:[103,9,97,32,98,0],count:4,size:6},
])('counts Engine parser quote/backslash input $bytes through owned helper returns',input=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,{...browserGameProcessInputs,commandLineA:{kind:'buffer',bytes:input.bytes}}),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e7c9',parserReturned:true,parserCounts:{count:input.count,bytes:input.size}});expect(frame.parserLeadCalls).toBeGreaterThan(0);expect(frame.multibytePtd!.readUnsigned(0x70)&2).toBe(0);expect(graph.value.snapshot().calls.filter(call=>['3068e62a','3068e732'].includes(call.site)).every(call=>call.returned)).toBe(true);expect(bootstrap.processAttach()).toEqual(result);
});
it('retains partial Engine parser counts when a later input byte is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs,true,{...browserGameProcessInputs,commandLineA:{kind:'buffer',bytes:[103,32,97,0],knownMask:[255,255,0,255]}}),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const result=bootstrap.processAttach(),frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068e66d',parserReturned:false,parserCounts:null});expect(frame.stack.readUnsigned(frame.ebp!-8)).toBe(1);expect(frame.stack.readUnsigned(frame.ebp!-12)).toBe(2);expect(graph.value.snapshot().calls.find(call=>call.site==='3068e7c4')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});

it('retains the Engine parser classification caller and acquired PTD ownership when its MBC flag is unknown',()=>{
 const {bootstrap,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);const original=NativeCrtBootstrap.engineArgvPtdForCrt,spy=vi.spyOn(NativeCrtBootstrap,'engineArgvPtdForCrt').mockImplementation((...args)=>{const result=original(...args),frame=bootstrap.attachProgress().engineArgvProgress;if(frame?.parserCalled&&frame.pc==='3067e12c')frame.multibyteAllocation!.knownMask[29+71]=0;return result;});let result;try{result=bootstrap.processAttach();}finally{spy.mockRestore();}const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame).toMatchObject({pc:'3068451e',parserReturned:false,parserCounts:null});expect(frame.multibytePtd!.readUnsigned(0x70)&2).toBe(2);expect(graph.value.snapshot().calls.filter(call=>call.site==='3068e62a').at(-1)?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
});
