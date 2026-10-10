import type {NativeWin32ArgvNlsSelection} from '../../src/gothic3/native-win32-argv-nls';
import {browserGameArgvNlsInputs} from '../../src/gothic3/browser-game-argv-nls-inputs';
import {NativeCrtThreadStartup} from '../../src/gothic3/native-crt-thread-startup';
import {expect,it,vi} from 'vitest';
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
function fixture(startupInfoA?:NativeStartupInfoWriterSelection,standardIo?:NativeWin32StandardIoSelection,argvNls?:NativeWin32ArgvNlsSelection){
 const platform=new NativeRuntimePlatform({engineCrtServices:{argvNls,standardIo,startupIo:startupInfoA?{startupInfoA}:undefined,tlsValues:new Map(),kernel32Available:true,pointerCodec:'absent',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},processInputs:browserGameProcessInputs,
  entropy:{systemTimeAsFileTime:()=>({known:true,value:{low:0x12345678,high:1}}),currentProcessId:()=>({known:true,value:4}),currentThreadId:()=>({known:true,value:5}),tickCount:()=>({known:true,value:6}),performanceCounter:()=>({known:true,value:{success:true,low:7,high:8}})},
  threadStack:{threadCapability:{},reservationBytes:4096,addressModel:'opaque-relative',initialRegisters:'unknown',initialFs0:'unknown',pageAlignment:'virtual-page-4096'}}});
 let bootstrap:NativeCrtBootstrap;const crt=new NativeEngineCrtOwner({platform,errnoSlot:()=>bootstrap.thread.errnoSlot(),getLastError:()=>platform.getWin32LastError()});bootstrap=NativeCrtBootstrap.forCrt(crt);return {crt,platform,bootstrap};
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
 for(const [ready,mask,pc,operations] of [[1,255,'3068e787',9],[0,0,'3068e778',5]] as const){
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
 expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;expect(frame.pc).toBe('3068e787');expect(frame.operations).toBe(14);expect(reads).toBe(2);expect(ready.value.readUnsigned(0)).toBe(1);expect(bootstrap.processAttach()).toEqual(result);
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
 const result=bootstrap.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Startup remains unfinished');
 expect(result.reason).toContain('Engine MBC code-page initialization30684c58 at30684ecb');
 const frame=bootstrap.attachProgress().engineArgvProgress!;
 expect(frame).toMatchObject({pc:'30684c58',operations:211,codepageCtorReturned:true,codepageAcpReturned:true,codepageReturned:true,codepageResult:1252});
 expect(frame.codepagePtd!.readUnsigned(0x70)).toBe(1);expect(frame.stack.readUnsigned(frame.entryEsp-40)).toBe(1252);

 const automatic=NativeEngineArgvImages.imageForCrt(bootstrap.attachProgress().engineArgvImages!,crt,'codepageAutomatic');if(!automatic.known)throw new Error(automatic.reason);expect(automatic.value.readUnsigned(0)).toBe(1);
 expect(NativeX86ThreadStack.engineArgvNlsArgumentsForPlatform(platform,{identity:{}}).known).toBe(false);
 expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.attachProgress().engineArgvProgress!.operations).toBe(211);
});

it('preserves an already owned Engine locale flag through the code-page helper',()=>{
 const {bootstrap}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const original=NativeCrtBootstrap.engineArgvPtdForCrt;let changed=false;
 const probe=vi.spyOn(NativeCrtBootstrap,'engineArgvPtdForCrt').mockImplementation((...args)=>{const result=original(...args);if(result.known&&result.value&&!changed&&bootstrap.attachProgress().engineArgvProgress?.codepageEbp!=null){result.value.writeUnsigned(0x70,3);changed=true;}return result;});
 let result;try{result=bootstrap.processAttach();}finally{probe.mockRestore();}
 expect(changed).toBe(true);expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!;
 expect(frame).toMatchObject({pc:'30684c58',codepageReturned:true,codepageResult:1252});expect(frame.codepagePtd!.readUnsigned(0x70)).toBe(3);
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
 });try{bootstrap.processAttach();}finally{probe.mockRestore();}expect(observed).toBe(2);
});

it('copies the actual Engine MBC bytes and masks into its separately owned allocation',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs,browserGameArgvNlsInputs);
 const source=bootstrap.thread.physical.mbcObject;source.bytes[500]=0xa5;source.knownMask[500]=0x55;
 const originalBytes=source.bytes.slice(),originalMasks=source.knownMask.slice();const graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 const result=bootstrap.processAttach();expect(result.known).toBe(false);const frame=bootstrap.attachProgress().engineArgvProgress!,destination=frame.multibyteAllocation!;
 expect(frame).toMatchObject({pc:'30684c58',operations:211,multibyteMallocReturned:true,multibyteCopyReturned:true});expect(destination.backing).not.toBe(source.backing);expect(destination.bytes.length).toBe(544);
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:destination,offset:0},544).known).toBe(true);
 expect(destination.readUnsigned(0)).toBe(0);expect(destination.bytes.slice(4)).toEqual(originalBytes.slice(4));expect(destination.knownMask.slice(4)).toEqual(originalMasks.slice(4));expect(source.bytes.slice(4)).toEqual(originalBytes.slice(4));expect(source.knownMask.slice(4)).toEqual(originalMasks.slice(4));
 expect(frame.bank.readUnsigned(8)).toBe(0);expect(graph.value.snapshot().calls.find(call=>call.site==='3067c9c9')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(call=>call.site==='30684ea8')?.returned).toBe(true);expect(graph.value.snapshot().calls.find(call=>call.site==='30684ecb')?.returned).toBe(false);expect(bootstrap.processAttach()).toEqual(result);
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
