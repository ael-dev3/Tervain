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

it('retains SharedBase CRT prerequisites on the actual browser platform',()=>{
 const platform=createBrowserGameCrtPlatform({processInputs:browserGameProcessInputs,
  threadStack:{reservationBytes:4096,pageAlignment:'virtual-page-4096',cpu:nativeVirtualX86CpuSelection},
  startupIo:browserGameStartupIoInputs,standardIo:browserGameStandardIoInputs,argvNls:browserGameArgvNlsInputs,
  setEnvp:{physicalGameHeapCapacity:'round-eight-unknown-padding',heapFree:{outcome:'success'}}});
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
  reason:'crtAttach204677e4: Unowned Translated Arena Status initializer pending: Property registration Message.Debug at 10088191: Unowned SharedBase registration formatter continuation at 100b53b0 (LocaleUpdate returned)'});
 const diagnostic=NativeSharedMessageDebug.forPlatform(platform).snapshot(),locale=diagnostic.formatterLocale!;
 expect(diagnostic.localeReturned).toBe(true);
 expect(locale.pointer(8).get()).toBe(owner.snapshot().ptd);
 expect(locale.pointer(0).get()).toBe(owner.snapshot().ptd!.pointer(0x6c).get());
 expect(locale.pointer(4).get()).toBe(owner.snapshot().ptd!.pointer(0x68).get());
 expect(locale.readUnsigned(12,1)).toBe(1);
 expect(owner.snapshot().ptd!.readUnsigned(0x70)&2).toBe(2);
 expect(diagnostic.formatterReturned).toBe(false);
 expect(diagnostic.messageDispatched).toBe(false);
 expect(owner.processAttach()).toEqual(result);
 expect(owner.snapshot().wholeCrtTraversalCompleted).toBe(false);
});
