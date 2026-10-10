import {expect,it} from 'vitest';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import {constructNativePropertyIdFromGuid} from '../../src/gothic3/native-property-id-guid';

function view(size:number) {
  return new NativeHeapObjectViews({identity:Object.freeze({}),bytes:new Uint8Array(size),
    knownMask:new Uint8Array(size).fill(255),freed:false});
}

it('clears an invalid GUID destination without reading the null payload',()=>{
  const destination=view(20),guid=view(20);destination.bytes.fill(0xcc);
  expect(constructNativePropertyIdFromGuid(destination,guid,()=>{throw new Error('Null payload must not be read');})).toEqual({known:true,value:undefined});
  expect([...destination.bytes]).toEqual(Array(20).fill(0));
});

it('retains the cleared PropertyID for a valid null GUID',()=>{
  const destination=view(20),guid=view(20),payload=view(16);guid.writeUnsigned(16,1,1);
  destination.bytes.fill(0xcc);let reads=0;
  expect(constructNativePropertyIdFromGuid(destination,guid,()=>{reads++;return {known:true,value:payload};})).toEqual({known:true,value:undefined});
  expect(reads).toBe(1);expect([...destination.bytes]).toEqual(Array(20).fill(0));
});

it('copies the GUID payload and clears the cache without copying validity or padding',()=>{
  const destination=view(20),guid=view(20),payload=view(16);
  for(let i=0;i<16;i++)guid.writeUnsigned(i,i+1,1);
  guid.writeUnsigned(16,1,1);guid.bytes.fill(0xa5,17);const before=[...guid.bytes];
  expect(constructNativePropertyIdFromGuid(destination,guid,()=>({known:true,value:payload}))).toEqual({known:true,value:undefined});
  expect([...destination.bytes.subarray(0,16)]).toEqual(before.slice(0,16));
  expect(destination.readUnsigned(16)).toBe(0);expect([...guid.bytes]).toEqual(before);
});
