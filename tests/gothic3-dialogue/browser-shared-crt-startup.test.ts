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
import {createBrowserNpcRuntimeAdminOwner} from '../../src/gothic3/native-runtime-platform';
import {NativeGameArenaStatusProperty} from '../../src/gothic3/native-game-arena-status-property';
import {NativeGameArenaEnum} from '../../src/gothic3/native-game-arena-enum';

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
 const runtime=createBrowserNpcRuntimeAdminOwner(platform),memory=runtime.memory;
 const game=createBrowserGameCrtStartup(platform,memory);
 expect(game.known).toBe(true);
 if(!game.known)throw new Error(game.reason);
 expect(game.value.attachResult).toEqual({known:false,
  reason:'crtAttach204677e4: Unowned Translated Arena Status initializer pending: Unowned enum name registry cleanup registration at 200719c5 -> 204637ce (20549ac0)'});
 const diagnostic=NativeSharedMessageDebug.forPlatform(platform).snapshot(),locale=diagnostic.formatterLocale!;
 expect(diagnostic.messageOwner).toBe(runtime.message);
 expect(diagnostic.messageGetterReturned).toBe(true);
 expect(runtime.message.snapshot().phase).toBe('ready');
 expect(runtime.message.storage.uint(28)).toBe(1);
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
 expect(diagnostic.messageCallReturned).toBe(true);
 expect(diagnostic.debugReturned).toBe(true);
 const status=NativeGameArenaStatusProperty.forCrt(game.value.crt,memory).snapshot();
 expect(status.propertyRegistered).toBe(true);
 expect(status.temporaryDestroyed).toBe(true);
 expect(status.temporaryName!.snapshot().destroyed).toBe(true);
 expect(status.initializerReturned).toBe(true);
 expect(status.trace).toContain('204b1e44.cleanup.registered');
 expect(status.trace).toContain('204b1e4c.initializer.return');
 const enumOwner=NativeGameArenaEnum.forCrt(game.value.crt,memory),enumState=enumOwner.snapshot();
 expect(enumState.allocation).not.toBeNull();
 expect(new NativeHeapObjectViews(enumState.allocation!,0,12).readUnsigned(0)).toBe(0x20659c74);
 expect(new NativeHeapObjectViews(enumState.allocation!,0,12).readUnsigned(4)).toBe(0x2065902c);
 expect(new NativeHeapObjectViews(enumState.allocation!,0,12).readUnsigned(8)).toBe(0);
 expect(enumState.trace).toContain('1004a1c8.enumBaseConstructor.return');
 const registry=game.value.crt.imageStorage('enumNameRegistry');
 expect(game.value.crt.imageStorage('enumNameRegistryGuard').readUnsigned(0)&1).toBe(1);
 expect([4,8,12].map(offset=>registry.readUnsigned(offset))).toEqual([43,51,0]);
 const buckets=registry.pointer<{bytes:Uint8Array;knownMask:Uint8Array}>(0).get()!;
 expect(buckets.bytes.subarray(0,204).every(byte=>byte===0)).toBe(true);
 expect(buckets.knownMask.subarray(0,204).every(byte=>byte===255)).toBe(true);
 expect(enumState.trace).toContain('200711e6.enumNameRegistry.constructor.return');
 expect(enumState.temporary!.snapshot().destroyed).toBe(false);
 expect(enumState.initializerReturned).toBe(false);
 expect(enumState.valueInserted).toBe(false);
 expect(enumOwner.initialize()).toEqual({known:false,reason:enumState.boundary});
 expect(enumOwner.snapshot().allocation).toBe(enumState.allocation);
 expect(runtime.message.snapshot().trace).toContain('10049574.message.threshold.return');
 expect(runtime.message.onMessageBelowThreshold(2)).toEqual({known:false,reason:'Unowned MessageAdmin.OnMessage callback loop at 1004951d'});
 expect(runtime.message.onMessageBelowThreshold(0xffffffff)).toEqual({known:true,value:true});
 expect(runtime.message.onMessageBelowThreshold(-1).known).toBe(false);
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
