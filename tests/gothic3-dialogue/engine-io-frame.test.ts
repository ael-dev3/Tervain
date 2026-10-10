import {expect,it,vi} from 'vitest';
import {NativeCrtBootstrap} from '../../src/gothic3/native-crt-bootstrap';
import {NativeEngineIoImages} from '../../src/gothic3/native-engine-io-images';
import {NativeEngineCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeX86ThreadStack} from '../../src/gothic3/native-x86-thread-stack';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import type {NativeStartupInfoWriterSelection} from '../../src/gothic3/native-win32-startup-io';
import type {NativeWin32StandardIoSelection} from '../../src/gothic3/native-win32-standard-io';
import {browserGameStandardIoInputs} from '../../src/gothic3/browser-game-standard-io-inputs';
import {browserGameProcessInputs} from '../../src/gothic3/browser-game-process-inputs';
function fixture(startupInfoA?:NativeStartupInfoWriterSelection,standardIo?:NativeWin32StandardIoSelection){
 const platform=new NativeRuntimePlatform({engineCrtServices:{standardIo,startupIo:startupInfoA?{startupInfoA}:undefined,tlsValues:new Map(),kernel32Available:true,pointerCodec:'absent',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},processInputs:browserGameProcessInputs,
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
  else{expect(result.reason).toContain(outcome==='valid'?'Engine startup call3068e76f at30677276':outcome==='null'?'Engine NULL standard handle branch at306888f1':'Engine invalid standard handle branch at306888f1');expect(frame.operations).toBe(outcome==='valid'?579:outcome==='null'?450:448);if(outcome==='valid'){expect(frame.fileType).toBe(2);expect(frame.sectionResult).toBe(true);expect(frame.section!.backing).toBe(frame.allocation!.backing);expect(frame.section!.bytes.length).toBe(24);expect(frame.section!.bytes.byteOffset-frame.allocation!.bytes.byteOffset).toBe(124);expect(frame.allocation!.readUnsigned(8)).toBe(1);}else expect(frame.bank.readUnsigned(0)).toBe(outcome==='null'?0:0xffffffff);}
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
  const result=bootstrap.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('CRT caller continuation unfinished');expect(result.reason).toContain('Engine startup call3068e76f at30677276');
  const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame.phase).toBe('returned');expect(frame.pc).toBe('3068892b');expect(frame.operations).toBe(579);expect(frame.fsRestored).toBe(true);expect(frame.setHandleCountResult).toBe(countResult);expect(frame.bank.readUnsigned(0)).toBe(0);
  for(const offset of [4,16,20,24,32])expect(frame.bank.maskedWord(offset).knownMask).toBe(0);
  expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.attachProgress().engineIoProgress!.operations).toBe(579);
 }
});

it('retains the actual Engine I/O caller result without granting descriptive return proofs',()=>{
 const {bootstrap,crt,platform}=fixture({writes:[{offset:50,width:2,value:0,knownMask:0xffff}],outcome:'normal'},browserGameStandardIoInputs),graph=NativeX86ThreadStack.forPlatform(platform);if(!graph.known)throw new Error(graph.reason);
 expect(NativeX86ThreadStack.returnedEngineIoForBootstrap(graph.value,bootstrap,crt,{}).known).toBe(false);expect(bootstrap.attachProgress().ioResult).toBe(null);
 const result=bootstrap.processAttach();expect(result.known).toBe(false);expect(bootstrap.attachProgress().ioResult).toBe(0);expect(bootstrap.attachProgress().nextBoundary).toMatchObject({address:'30677276',target:'3068e76f'});
 expect(NativeX86ThreadStack.returnedEngineIoForBootstrap(graph.value,bootstrap,crt,{}).known).toBe(false);expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.attachProgress().ioResult).toBe(0);
});
