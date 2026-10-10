import {expect,it} from 'vitest';
import {NativeEngineArgvImages} from '../../src/gothic3/native-engine-argv-images';
import {NativeEngineCrtOwner,NativeGameCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import type {NativeValue} from '../../src/gothic3/dialogue';
const fact=<T>(value:NativeValue<T>):T=>{if(!value.known)throw new Error(value.reason);return value.value;};
function fixture(){const platform=new NativeRuntimePlatform(),crt=new NativeEngineCrtOwner({platform}),owner=fact(NativeEngineArgvImages.forCrt(crt));return {platform,crt,owner};}
it('retains original Engine argument globals without reseeding mutable state',()=>{
 const {crt,owner}=fixture(),count=fact(NativeEngineArgvImages.imageForCrt(owner,crt,'argumentCount')),vector=fact(NativeEngineArgvImages.imageForCrt(owner,crt,'argumentVector')),filename=fact(NativeEngineArgvImages.imageForCrt(owner,crt,'moduleFilename'));
 expect(count.readUnsigned(0)).toBe(0);expect(filename.bytes.length).toBe(260);expect([...filename.knownMask]).toEqual(Array(260).fill(255));
 count.writeUnsigned(0,3);const pointer={};vector.pointer(0).set(pointer);filename.writeUnsigned(0,71,1);
 expect(fact(NativeEngineArgvImages.forCrt(crt))).toBe(owner);expect(count.readUnsigned(0)).toBe(3);expect(vector.pointer(0).get()).toBe(pointer);expect(filename.readUnsigned(0,1)).toBe(71);
});
it('rejects foreign and counterfeit argument owners',()=>{
 const a=fixture(),b=fixture();expect(NativeEngineArgvImages.imageForCrt(a.owner,b.crt,'argumentCount').known).toBe(false);expect(NativeEngineArgvImages.forCrt(NativeGameCrtOwner.forPlatform({platform:a.platform})).known).toBe(false);expect(NativeEngineArgvImages.forCrt(Object.create(NativeEngineCrtOwner.prototype)).known).toBe(false);
 expect(NativeEngineArgvImages.imageForCrt(a.owner,a.crt,'commandLinePointer' as never).known).toBe(false);
});
it('rejects replaced or released argument image backing without repairing it',()=>{
 const a=fixture(),count=fact(NativeEngineArgvImages.imageForCrt(a.owner,a.crt,'argumentCount'));Reflect.set(count.backing,'bytes',new Uint8Array(4));expect(NativeEngineArgvImages.forCrt(a.crt).known).toBe(false);
 const b=fixture(),filename=fact(NativeEngineArgvImages.imageForCrt(b.owner,b.crt,'moduleFilename'));filename.backing.freed=true;expect(NativeEngineArgvImages.forCrt(b.crt).known).toBe(false);
});
