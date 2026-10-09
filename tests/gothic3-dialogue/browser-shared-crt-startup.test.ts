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

it('retains SharedBase CRT prerequisites on the actual browser platform',()=>{
 const platform=createBrowserGameCrtPlatform({processInputs:browserGameProcessInputs,
  threadStack:{reservationBytes:4096,pageAlignment:'virtual-page-4096',cpu:nativeVirtualX86CpuSelection},
  startupIo:browserGameStartupIoInputs,standardIo:browserGameStandardIoInputs,argvNls:browserGameArgvNlsInputs,
  setEnvp:{physicalGameHeapCapacity:'round-eight-unknown-padding',heapFree:{outcome:'success'}}});
 const tls=NativeSharedStaticTls.forPlatform(platform);
 if(!tls.known)throw new Error(tls.reason);
 expect(tls.value.loadSharedBase().known).toBe(true);
 const owner=NativeSharedCrtOwner.forPlatform(platform),result=owner.processAttach();
 expect(result).toEqual({known:true,value:1});
 expect(owner.snapshot().ptdInstalled).toBe(true);
 expect(owner.snapshot().ptdInitialized).toBe(true);
 const game=createBrowserGameCrtStartup(platform);
 expect(game.known).toBe(true);
 if(!game.known)throw new Error(game.reason);
 expect(game.value.attachResult).toEqual({known:false,
  reason:'crtAttach204677e4: Unowned Original Game C++ initializer callback is not yet admitted at 204b11b0'});
 expect(owner.processAttach()).toEqual(result);
 expect(owner.snapshot().wholeCrtTraversalCompleted).toBe(false);
});
