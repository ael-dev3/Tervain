import {describe,expect,it,vi} from 'vitest';
import {browserGameProcessInputs} from '../../src/gothic3/browser-game-process-inputs';
import {NativeEngineCrtOwner,NativeGameCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeEngineCrtEnvironment} from '../../src/gothic3/native-engine-crt-environment';
import {NativeEngineCrtByteCopy} from '../../src/gothic3/native-engine-crt-byte-copy';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import type {NativeWin32ProcessInputSelection} from '../../src/gothic3/native-win32-process-inputs';
function selected(inputs:NativeWin32ProcessInputSelection=browserGameProcessInputs){
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'absent',processInputs:inputs}});
 const errno=new NativeHeapObjectViews({identity:Object.freeze({}),bytes:new Uint8Array(4),knownMask:new Uint8Array(4).fill(255),freed:false});
 const crt=new NativeEngineCrtOwner({platform,errnoSlot:()=>({known:true,value:errno})});
 crt.physical.crtOsFields.writeUnsigned(0,2);crt.physical.crtOsFields.writeUnsigned(12,6);
 const heap=crt.initHeap();if(!heap.known)throw new Error(heap.reason);
 const result=NativeEngineCrtEnvironment.forCrt(crt);
 if(!result.known)throw new Error(result.reason);return {platform,crt,owner:result.value};
}
describe('original Engine environment selection and measurement prefix',()=>{
 it('retains actual ANSI copy stores and OS input when a later dispatch is unsupported',()=>{
  const {owner,crt}=selected({...browserGameProcessInputs,environmentW:{kind:'null',lastError:120}});
  const copy=NativeEngineCrtByteCopy.forCrt(crt);if(!copy.known)throw new Error(copy.reason);
  const table=NativeEngineCrtByteCopy.imageForCrt(copy.value,crt,'forwardTail');if(!table.known)throw new Error(table.reason);
  table.value.writeUnsigned(12,0x2046407c);const result=owner.capture();expect(result.known).toBe(false);
  const state=owner.snapshot();expect(state).toMatchObject({phase:'blocked',pc:'3068e945',mode:2});
  expect(state.input!.fields.backing.freed).toBe(false);expect(state.copyProgress.invocations[0]).toMatchObject({phase:'blocked',bytesStored:16});
  expect(state.effects.map(effect=>effect.operation)).not.toContain('FreeEnvironmentStringsA.return');
  expect([...state.output!.fields.knownMask.subarray(0,19)]).toEqual([...Array(16).fill(255),0,0,0]);
  expect(owner.capture()).toEqual(result);expect(owner.snapshot()).toEqual(state);
 });
 it('converts actual UTF16 input into Engine output and permits a fresh physical call',()=>{
  const {crt,owner,platform}=selected();const result=owner.capture();expect(result.known).toBe(true);
  if(!result.known||result.value===null)throw new Error('Actual converted output required');
  expect(owner.snapshot()).toMatchObject({module:'Engine',mode:1,branch:'wide',pc:'3068e95c',phase:'returned',inputCharacters:19,outputBytes:19,invocations:1});
  expect(owner.snapshot().allocation).not.toBe(null);
  expect(owner.snapshot().output!.fields.backing).toBe(owner.snapshot().allocation);
  expect(owner.snapshot().input).not.toBe(null);expect(owner.snapshot().effects.map(effect=>effect.operation)).toContain('WideCharToMultiByte.measure.return');
  expect(Array.from(result.value.fields.bytes.subarray(0,19))).toEqual(Array.from(browserGameProcessInputs.environmentA!.kind==='buffer'?browserGameProcessInputs.environmentA!.bytes:[]));
  expect(owner.snapshot().input!.fields.backing.freed).toBe(true);
  const next=owner.capture();if(!next.known||next.value===null)throw new Error('Fresh output required');
  expect(next.value).not.toBe(result.value);expect(owner.snapshot().invocations).toBe(2);
  expect(NativeEngineCrtEnvironment.canonicalDestinationForPlatform(platform,result.value,19).known).toBe(true);
  const again=NativeEngineCrtEnvironment.forCrt(crt);expect(again).toEqual({known:true,value:owner});
 });
 it('copies error120 ANSI input into the actual allocation and releases OS storage',()=>{
  const {owner}=selected({...browserGameProcessInputs,environmentW:{kind:'null',lastError:120}});const result=owner.capture();expect(result.known).toBe(true);
  expect(owner.snapshot()).toMatchObject({mode:2,branch:'ansi',pc:'3068e95c',phase:'returned',outputBytes:19,inputCharacters:null});
  if(!result.known||!result.value)throw new Error('Actual ANSI output required');
  expect([...result.value.fields.bytes.subarray(0,19)]).toEqual(browserGameProcessInputs.environmentA!.kind==='buffer'?browserGameProcessInputs.environmentA!.bytes:[]);
  expect(owner.snapshot().input!.fields.backing.freed).toBe(true);expect(owner.snapshot().copyProgress.invocations[0]).toMatchObject({phase:'returned',bytesStored:19});
  const next=owner.capture();expect(next.known).toBe(true);if(!next.known)throw new Error(next.reason);expect(next.value).not.toBe(result.value);
 });
 it('uses ANSI on a different wide failure without changing mode to2',()=>{
  const {owner}=selected({...browserGameProcessInputs,environmentW:{kind:'null',lastError:5}});expect(owner.capture().known).toBe(true);
  expect(owner.snapshot()).toMatchObject({mode:0,branch:'ansi',pc:'3068e95c',phase:'returned'});
 });
 it('releases wide input and returns NULL after zero conversion measurement',()=>{
  const {owner}=selected({...browserGameProcessInputs,conversionFailure:{query:{result:0}}});
  expect(owner.capture()).toEqual({known:true,value:null});expect(owner.snapshot()).toMatchObject({phase:'returned',mode:1,outputBytes:0});
  expect(owner.snapshot().effects.map(effect=>effect.operation)).toContain('FreeEnvironmentStringsW.return');
  expect(owner.capture()).toEqual({known:true,value:null});expect(owner.snapshot().invocations).toBe(2);
 });
 it('returns actual NULL when both APIs return NULL and permits another physical call',()=>{
  const {owner}=selected({...browserGameProcessInputs,environmentW:{kind:'null',lastError:120},environmentA:{kind:'null'}});
  expect(owner.capture()).toEqual({known:true,value:null});expect(owner.capture()).toEqual({known:true,value:null});
  expect(owner.snapshot()).toMatchObject({mode:2,branch:'ansi',invocations:2});
 });
 it('uses one character for an empty wide block and stops at an unknown scan byte',()=>{
  const empty=selected({...browserGameProcessInputs,environmentW:{kind:'buffer',bytes:[0,0,0,0]}}).owner;
  empty.capture();expect(empty.snapshot()).toMatchObject({inputCharacters:1,outputBytes:1});
  const bad=selected({...browserGameProcessInputs,environmentW:{kind:'buffer',bytes:[65,0,0,0,0,0],knownMask:[0,255,255,255,255,255]}}).owner;
  expect(bad.capture().known).toBe(false);expect(bad.snapshot()).toMatchObject({pc:'3068e88d',mode:1,outputBytes:null});
 });
 it('rejects a Game CRT before creating an Engine environment owner',()=>{
  const {platform}=selected();const game=NativeGameCrtOwner.forPlatform({platform});expect(NativeEngineCrtEnvironment.forCrt(game).known).toBe(false);
 });
 it.each([false,true])('releases the input after an actual NULL allocation (ANSI=%s)',ansi=>{
  const {platform,owner}=selected(ansi?{...browserGameProcessInputs,environmentW:{kind:'null',lastError:120}}:browserGameProcessInputs);
  const allocation=vi.spyOn(platform,'win32HeapAlloc').mockReturnValue({known:true,value:null});
  expect(owner.capture()).toEqual({known:true,value:null});
  expect(owner.snapshot()).toMatchObject({phase:'returned',allocation:null,output:null});
  expect(owner.snapshot().effects.map(effect=>effect.operation)).toContain(ansi?'FreeEnvironmentStringsA.return':'FreeEnvironmentStringsW.return');
  expect(allocation).toHaveBeenCalledOnce();allocation.mockRestore();
 });
 it('frees converted output on fill failure before releasing the wide input',()=>{
  const {owner,platform}=selected({...browserGameProcessInputs,conversionFailure:{fill:{result:0}}});
  expect(owner.capture()).toEqual({known:true,value:null});const state=owner.snapshot();
  expect(state.output).toBe(null);expect(state.allocation!.freed).toBe(true);expect(state.input!.fields.backing.freed).toBe(true);
  const effects=state.effects.map(effect=>effect.operation);expect(effects.indexOf('free30672f8a.return')).toBeLessThan(effects.indexOf('FreeEnvironmentStringsW.return'));
  expect(NativeEngineCrtEnvironment.canonicalDestinationForPlatform(platform,{fields:new NativeHeapObjectViews(state.allocation!),offset:0},1).known).toBe(false);
 });
 it('rejects copied destination views and foreign platforms before conversion',()=>{
  const a=selected(),b=selected();const result=a.owner.capture();if(!result.known||result.value===null)throw new Error('Output required');
  expect(NativeEngineCrtEnvironment.canonicalDestinationForPlatform(b.platform,result.value,1).known).toBe(false);
  expect(NativeEngineCrtEnvironment.canonicalDestinationForPlatform(a.platform,{fields:new NativeHeapObjectViews(result.value.fields.backing),offset:0},1).known).toBe(false);
  expect(NativeEngineCrtEnvironment.canonicalDestinationForPlatform(a.platform,result.value,20).known).toBe(false);
 });
});
