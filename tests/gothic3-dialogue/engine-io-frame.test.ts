import {expect,it,vi} from 'vitest';
import {NativeCrtBootstrap} from '../../src/gothic3/native-crt-bootstrap';
import {NativeEngineCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeX86ThreadStack} from '../../src/gothic3/native-x86-thread-stack';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import type {NativeStartupInfoWriterSelection} from '../../src/gothic3/native-win32-startup-io';
import {browserGameProcessInputs} from '../../src/gothic3/browser-game-process-inputs';
function fixture(startupInfoA?:NativeStartupInfoWriterSelection){
 const platform=new NativeRuntimePlatform({engineCrtServices:{startupIo:startupInfoA?{startupInfoA}:undefined,tlsValues:new Map(),kernel32Available:true,pointerCodec:'absent',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},processInputs:browserGameProcessInputs,
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
 const {bootstrap}=fixture({writes:[{offset:0,width:4,value:68,knownMask:0xffffffff},{offset:45,width:1,value:0xa5,knownMask:0xff}],outcome:'normal'});
 const result=bootstrap.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Continuation unfinished');expect(result.reason).toContain('Engine calloc3067ca01 at30688714');
 const frame=bootstrap.attachProgress().engineIoProgress!;expect(frame.operations).toBe(34);expect(frame.startupInfo!.readUnsigned(0)).toBe(68);expect(frame.startupInfo!.readUnsigned(45,1)).toBe(0xa5);
 for(const offset of [0,4,8])expect(frame.bank.maskedWord(offset).knownMask).toBe(0);
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
