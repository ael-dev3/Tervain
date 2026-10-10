import {describe,expect,it,vi} from 'vitest';
import {browserGameProcessInputs} from '../../src/gothic3/browser-game-process-inputs';
import {NativeEngineCrtOwner,NativeGameCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeEngineCrtEnvironment} from '../../src/gothic3/native-engine-crt-environment';
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
 it('scans actual UTF16 input, measures it, and retains its pending allocation without replay',()=>{
  const {crt,owner}=selected();const result=owner.capture();expect(result.known).toBe(false);
  expect(owner.snapshot()).toMatchObject({module:'Engine',mode:1,branch:'wide',pc:'3068e8db',phase:'blocked',inputCharacters:19,outputBytes:19,invocations:1});
  expect(owner.snapshot().allocation).not.toBe(null);
  expect(owner.snapshot().output!.fields.backing).toBe(owner.snapshot().allocation);
  expect(owner.snapshot().input).not.toBe(null);expect(owner.snapshot().effects.map(effect=>effect.operation)).toContain('WideCharToMultiByte.measure.return');
  const before=owner.snapshot();expect(owner.capture()).toEqual(result);expect(owner.snapshot()).toEqual(before);
  const again=NativeEngineCrtEnvironment.forCrt(crt);expect(again).toEqual({known:true,value:owner});
 });
 it('retains error120 ANSI selection and computes the original byte count',()=>{
  const {owner}=selected({...browserGameProcessInputs,environmentW:{kind:'null',lastError:120}});expect(owner.capture().known).toBe(false);
  expect(owner.snapshot()).toMatchObject({mode:2,branch:'ansi',pc:'3068e945',outputBytes:19,inputCharacters:null});
 });
 it('uses ANSI on a different wide failure without changing mode to2',()=>{
  const {owner}=selected({...browserGameProcessInputs,environmentW:{kind:'null',lastError:5}});owner.capture();
  expect(owner.snapshot()).toMatchObject({mode:0,branch:'ansi',pc:'3068e945'});
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
});
