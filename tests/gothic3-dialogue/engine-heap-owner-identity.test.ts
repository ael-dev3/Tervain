import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
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


function capacityFixture(layout?:'rounded-eight') {
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'absent',engineHeapLayout:layout,osVersion:{platform:2,major:6,minor:1,build:42}}});
 const errno=new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(4),knownMask:new Uint8Array(4).fill(255),freed:false});
 const owner=new NativeEngineCrtOwner({platform,errnoSlot:()=>({known:true,value:errno})});owner.physical.crtOsFields.writeUnsigned(0,2);owner.physical.crtOsFields.writeUnsigned(12,6);expect(owner.initHeap()).toEqual({known:true,value:1});
 const result=owner.malloc(6);if(!result.known||!result.value)throw new Error('Actual Engine allocation required');
 return {platform,owner,backing:result.value};
}

describe('selected Engine physical allocation capacity',()=>{
 it('preserves logical request and unknown physical padding with common ownership',()=>{
  const {platform,owner,backing}=capacityFixture('rounded-eight');
  const proof=NativeRuntimePlatform.canonicalEngineHeapAllocationViewsForPlatform(platform,owner,backing);if(!proof.known)throw new Error(proof.reason);
  expect(proof.value.requestedBytes).toBe(6);expect(proof.value.physicalCapacity).toBe(8);
  expect(proof.value.logical.bytes.length).toBe(6);expect(proof.value.physical.bytes.length).toBe(8);
  expect(proof.value.logical.backing).toBe(proof.value.physical.backing);
  expect([...proof.value.physical.knownMask]).toEqual(Array(8).fill(0));
  proof.value.logical.writeUnsigned(0,0x616f6c66);proof.value.logical.writeUnsigned(4,0x74,2);
  expect([...proof.value.physical.knownMask]).toEqual([255,255,255,255,255,255,0,0]);
  expect(proof.value.physical.bytes[4]).toBe(0x74);
  expect(owner.free(backing).known).toBe(true);
  expect(proof.value.logical.backing.freed).toBe(true);expect(proof.value.physical.backing.freed).toBe(true);
  expect(NativeRuntimePlatform.canonicalEngineHeapAllocationViewsForPlatform(platform,owner,backing).known).toBe(false);
 });
 it('retains exact capacity when layout is omitted',()=>{
  const {platform,owner,backing}=capacityFixture();expect(backing.bytes.length).toBe(6);
  expect(NativeRuntimePlatform.canonicalEngineHeapAllocationViewsForPlatform(platform,owner,backing).known).toBe(false);
 });
 it('rejects substituted backing and another owner',()=>{
  const {platform,owner,backing}=capacityFixture('rounded-eight');
  expect(NativeRuntimePlatform.canonicalEngineHeapAllocationViewsForPlatform(platform,owner,{...backing}).known).toBe(false);
  expect(NativeRuntimePlatform.canonicalEngineHeapAllocationViewsForPlatform(platform,new NativeEngineCrtOwner({platform}),backing).known).toBe(false);
  expect(NativeRuntimePlatform.canonicalEngineHeapAllocationViewsForPlatform(new NativeRuntimePlatform(),owner,backing).known).toBe(false);
 });
});
