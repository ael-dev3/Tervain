import {expect,it} from 'vitest';
import {createBrowserGameCrtPlatform} from '../../src/gothic3/browser-game-crt-platform';
import {browserGameProcessInputs} from '../../src/gothic3/browser-game-process-inputs';
import {browserGameStartupIoInputs} from '../../src/gothic3/browser-game-startup-io-inputs';
import {browserGameStandardIoInputs} from '../../src/gothic3/browser-game-standard-io-inputs';
import {browserGameArgvNlsInputs} from '../../src/gothic3/browser-game-argv-nls-inputs';
import {nativeVirtualX86CpuSelection} from '../../src/gothic3/native-x86-thread-stack-profile';
import {NativeSharedStaticTls} from '../../src/gothic3/native-shared-static-tls';
import {NativeSharedCrtOwner} from '../../src/gothic3/native-shared-crt';
import {createBrowserGameCrtStartup} from '../../src/gothic3/browser-game-crt-startup';
import {NativeMemoryAdmin,nativeNpcHeapExtension,nativeSceneStartupHeapExtension,nativeClassNameHeapExtension,nativePropertyHeapExtension} from '../../src/gothic3/native-memory-admin';
import {NativeSharedMessageDebug} from '../../src/gothic3/native-shared-message-debug';
import {NativeSharedGuidNull} from '../../src/gothic3/native-shared-guid-null';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import {NativeSharedCrtSecurityCookie} from '../../src/gothic3/native-shared-crt-security-cookie';

function platformFixture(){
 return createBrowserGameCrtPlatform({processInputs:browserGameProcessInputs,
  threadStack:{reservationBytes:4096,pageAlignment:'virtual-page-4096',cpu:nativeVirtualX86CpuSelection},
  startupIo:browserGameStartupIoInputs,standardIo:browserGameStandardIoInputs,argvNls:browserGameArgvNlsInputs,
  setEnvp:{physicalGameHeapCapacity:'round-eight-unknown-padding',heapFree:{outcome:'success'}}});
}
it('retains SharedBase CRT prerequisites on the actual browser platform',()=>{
 const platform=platformFixture();
 const tls=NativeSharedStaticTls.forPlatform(platform);
 if(!tls.known)throw new Error(tls.reason);
 expect(tls.value.loadSharedBase().known).toBe(true);
 const guid=NativeSharedGuidNull.forPlatform(platform);if(!guid.known)throw new Error(guid.reason);
 expect(guid.value.adoptReturnedCrtExecution().known).toBe(false);
 const owner=NativeSharedCrtOwner.forPlatform(platform),result=owner.processAttach();
 expect(result).toEqual({known:true,value:1});
 expect(owner.snapshot().ptdInstalled).toBe(true);
 expect(owner.snapshot().ptdInitialized).toBe(true);
 expect(guid.value.adoptReturnedCrtExecution()).toEqual({known:true,value:undefined});
 const payload=guid.value.guidNullPayload();if(!payload.known)throw new Error(payload.reason);
 expect(payload.value).toBe(owner.snapshot().initializerImages['101ab150']);
 expect(guid.value.adoptReturnedCrtExecution().known).toBe(false);
 expect(guid.value.invokeInitializer().known).toBe(false);
 expect(guid.value.snapshot().executionOrigin).toBe('returned-crt');
 const memory=new NativeMemoryAdmin(platform,{extensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension,nativeClassNameHeapExtension,nativePropertyHeapExtension]});
 const game=createBrowserGameCrtStartup(platform,memory);
 expect(game.known).toBe(true);
 if(!game.known)throw new Error(game.reason);
 expect(game.value.attachResult).toEqual({known:false,
  reason:'crtAttach204677e4: Unowned Translated Arena Status initializer pending: Property registration Message.Debug at 10088191: Unowned SharedBase registration MessageAdmin getter at 10049924 -> 100088b4 (vsprintf returned)'});
 const diagnostic=NativeSharedMessageDebug.forPlatform(platform).snapshot(),locale=diagnostic.formatterLocale!;
 expect(diagnostic.localeReturned).toBe(true);
 expect(locale.pointer(8).get()).toBe(owner.snapshot().ptd);
 expect(locale.pointer(0).get()).toBe(owner.snapshot().ptd!.pointer(0x6c).get());
 expect(locale.pointer(4).get()).toBe(owner.snapshot().ptd!.pointer(0x68).get());
 expect(locale.readUnsigned(12,1)).toBe(1);
 expect(owner.snapshot().ptd!.readUnsigned(0x70)&2).toBe(0);
 const expected="bCPropertyObjectTypeBase::RegisterPropertyTemplate - property 'Status' with valuetype 'bTPropertyContainer<enum gEArenaStatus>' added.";
 expect(diagnostic.formatterOutputCount).toBe(expected.length);
 expect(new TextDecoder().decode(diagnostic.buffer!.bytes.subarray(0,expected.length))).toBe(expected);
 expect(diagnostic.terminatorWritten).toBe(true);
 expect(diagnostic.buffer!.readUnsigned(expected.length,1)).toBe(0);
 expect(diagnostic.formatterReturned).toBe(true);
 expect(diagnostic.messageCallFrame!.pointer(0).get()).toEqual({module:'SharedBase',source:'10049929'});
 expect(diagnostic.messageCallFrame!.pointer<{fields:NativeHeapObjectViews;offset:number}>(8).get()!.fields).toBe(diagnostic.buffer);
 expect([4,12,16,20,24].map(offset=>diagnostic.messageCallFrame!.readUnsigned(offset))).toEqual([1,0,0,0xffffffff,5]);
 expect(diagnostic.messageDispatched).toBe(false);
 expect(owner.processAttach()).toEqual(result);
 expect(owner.snapshot().wholeCrtTraversalCompleted).toBe(false);
});
it('retains output and rejects a changed cookie before returning or writing the terminator',()=>{
 const platform=platformFixture(),tls=NativeSharedStaticTls.forPlatform(platform);
 if(!tls.known)throw new Error(tls.reason);expect(tls.value.loadSharedBase().known).toBe(true);
 const crt=NativeSharedCrtOwner.forPlatform(platform);expect(crt.processAttach()).toEqual({known:true,value:1});
 const diagnostic=NativeSharedMessageDebug.forPlatform(platform),cookie=NativeSharedCrtSecurityCookie.forPlatform(platform);
 const memory=new NativeMemoryAdmin(platform,{extensions:[nativeNpcHeapExtension,nativeSceneStartupHeapExtension,nativeClassNameHeapExtension,nativePropertyHeapExtension]});
 const write=NativeHeapObjectViews.prototype.writeUnsigned;let changed=false;
 try{
  NativeHeapObjectViews.prototype.writeUnsigned=function(offset,value,width=4){
   write.call(this,offset,value,width);
   const state=diagnostic.snapshot();
   if(!changed&&state.formatterFrame&&this===state.buffer&&width===1){changed=true;write.call(cookie.fields,0,0x12345678,4);}
  };
  const game=createBrowserGameCrtStartup(platform,memory);if(!game.known)throw new Error(game.reason);
  expect(game.value.attachResult.known).toBe(false);
  if(game.value.attachResult.known)throw new Error('Changed cookie accepted');
  expect(game.value.attachResult.reason).toContain('security-cookie mismatch at 100b01d2');
 }finally{NativeHeapObjectViews.prototype.writeUnsigned=write;}
 expect(changed).toBe(true);
 const state=diagnostic.snapshot();expect(state.formatterOutputCount).toBeGreaterThan(0);
 expect(state.formatterReturned).toBe(false);expect(state.terminatorWritten).toBe(false);
 expect(state.messageDispatched).toBe(false);
 expect(state.messageCallFrame).toBeNull();
 expect(state.buffer!.knownMask[state.formatterOutputCount!]).toBe(255); // original TLS template stays known
});
