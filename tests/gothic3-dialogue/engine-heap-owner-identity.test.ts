import {describe,it,expect} from 'vitest';
import {NativeEngineCrtOwner,NativeModuleCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';

describe('private Engine heap constructor identity',()=>{
 it('admits the constructed same-platform owner',()=>{
  const platform=new NativeRuntimePlatform(),owner=new NativeEngineCrtOwner({platform});
  const proof=NativeModuleCrtOwner.canonicalEngineHeapOwnerIdentityForPlatform(platform,owner.identity);
  expect(proof.known).toBe(true);if(proof.known)expect(proof.value).toBe(owner);
 });
 it('rejects other-platform and caller-shaped identities',()=>{
  const platform=new NativeRuntimePlatform(),owner=new NativeEngineCrtOwner({platform});
  expect(NativeModuleCrtOwner.canonicalEngineHeapOwnerIdentityForPlatform(new NativeRuntimePlatform(),owner.identity).known).toBe(false);
  expect(NativeModuleCrtOwner.canonicalEngineHeapOwnerIdentityForPlatform(platform,{}).known).toBe(false);
  expect(NativeModuleCrtOwner.canonicalEngineHeapOwnerIdentityForPlatform(platform,{identity:owner.identity,host:owner.host,module:'Engine'}).known).toBe(false);
 });
});
