import {NativeEngineCrtOwner,NativeModuleCrtOwner} from './native-engine-crt-locks';
import {NativeCrtBootstrap} from './native-crt-bootstrap';
import {browserGameCrtPlatformProfile} from './browser-game-crt-platform';
import type {NativeRuntimePlatform} from './native-runtime-platform';
import type {NativeValue} from './dialogue';

export interface BrowserEngineCrtStartup {
  readonly crt:NativeEngineCrtOwner;
  readonly bootstrap:NativeCrtBootstrap;
  readonly attachResult:NativeValue<number>;
  readonly attachProgress:ReturnType<NativeCrtBootstrap['attachProgress']>;
}
const retained=new WeakMap<NativeRuntimePlatform,{active:boolean;interruption:string|null;result:NativeValue<BrowserEngineCrtStartup>|null}>();
/** Retain Engine's own heap, TLS and errno graph. An incomplete CRT attach
 * never grants permission to execute Engine's later static initializer table. */
export function createBrowserEngineCrtStartup(platform:NativeRuntimePlatform):NativeValue<BrowserEngineCrtStartup> {
  const profile=browserGameCrtPlatformProfile(platform);if(!profile.known)return profile;
  const old=retained.get(platform);
  if(old){if(old.active){old.interruption='Browser Engine CRT startup is already constructing';return {known:false,reason:old.interruption};}return old.result!;}
  const state:{active:boolean;interruption:string|null;result:NativeValue<BrowserEngineCrtStartup>|null}={active:true,interruption:null,result:null};retained.set(platform,state);
  let bootstrap:NativeCrtBootstrap|null=null;
  try {
    const crt=new NativeEngineCrtOwner(Object.freeze({platform,
      errnoSlot:()=>bootstrap?bootstrap.thread.errnoSlot():{known:false as const,reason:'Engine errno requires its retained bootstrap thread'},
      getLastError:()=>platform.getWin32LastError()}));
    bootstrap=NativeCrtBootstrap.forCrt(crt);
    if(state.interruption)throw new Error(state.interruption);
    const attachResult=Object.freeze(NativeCrtBootstrap.processAttachForCrt(bootstrap,crt));
    if(state.interruption)throw new Error(state.interruption);
    state.result=Object.freeze({known:true,value:Object.freeze({crt,bootstrap,attachResult,attachProgress:bootstrap.attachProgress()})});
  }catch(error){state.result=Object.freeze({known:false,reason:error instanceof Error?error.message:String(error)});}
  finally{state.active=false;}
  return state.result!;
}

export function canonicalBrowserEngineCrtStartup(graph:BrowserEngineCrtStartup,platform:NativeRuntimePlatform):NativeValue<void> {
 const profile=browserGameCrtPlatformProfile(platform);if(!profile.known)return profile;
 const state=retained.get(platform);
 return state&&!state.active&&!state.interruption&&state.result?.known&&state.result.value===graph&&
  graph.crt.host.platform===platform&&NativeModuleCrtOwner.isConstructedOwner(graph.crt)&&graph.bootstrap.crt===graph.crt
  ?{known:true,value:undefined}:{known:false,reason:'Actual retained same-platform Engine CRT startup graph required'};
}
