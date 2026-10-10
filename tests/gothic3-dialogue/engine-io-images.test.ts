import {expect,it} from 'vitest';
import {NativeEngineIoImages} from '../../src/gothic3/native-engine-io-images';
import {NativeEngineCrtOwner,NativeGameCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeCrtBootstrap} from '../../src/gothic3/native-crt-bootstrap';
import type {NativeValue} from '../../src/gothic3/dialogue';
const fact=<T>(value:NativeValue<T>):T=>{if(!value.known)throw new Error(value.reason);return value.value;};
function fixture(){const platform=new NativeRuntimePlatform(),crt=new NativeEngineCrtOwner({platform}),owner=fact(NativeEngineIoImages.forCrt(crt));return {platform,crt,owner};}
it('connects the same cold I/O image owner to the retained Engine bootstrap',()=>{
 const {crt,owner}=fixture(),bootstrap=NativeCrtBootstrap.forCrt(crt);
 expect(bootstrap.attachProgress().engineIoImages).toBe(owner);
 expect(bootstrap.attachProgress().ioProgress).toBe(null);
 expect(bootstrap.attachProgress().ioResult).toBe(null);
 const count=fact(NativeEngineIoImages.imageForCrt(owner,crt,'ioHandleCount'));count.writeUnsigned(0,32);
 expect(NativeCrtBootstrap.forCrt(crt)).toBe(bootstrap);
 expect(fact(NativeEngineIoImages.imageForCrt(bootstrap.attachProgress().engineIoImages!,crt,'ioHandleCount')).readUnsigned(0)).toBe(32);
});
it('retains mutable Engine count and table images without reseeding them',()=>{
 const {crt,owner}=fixture();const count=fact(NativeEngineIoImages.imageForCrt(owner,crt,'ioHandleCount')),table=fact(NativeEngineIoImages.imageForCrt(owner,crt,'ioBlockPointers'));
 expect(count.readUnsigned(0)).toBe(0);expect(table.bytes.length).toBe(256);expect([...table.knownMask]).toEqual(Array(256).fill(255));
 count.writeUnsigned(0,32);const pointer=Object.freeze({});table.pointer(0).set(pointer);
 expect(fact(NativeEngineIoImages.forCrt(crt))).toBe(owner);expect(fact(NativeEngineIoImages.imageForCrt(owner,crt,'ioHandleCount')).readUnsigned(0)).toBe(32);
 expect(fact(NativeEngineIoImages.imageForCrt(owner,crt,'ioBlockPointers')).pointer(0).get()).toBe(pointer);
});
it('rejects foreign owners, Game and prototype-only CRTs',()=>{
 const a=fixture(),b=fixture();expect(NativeEngineIoImages.imageForCrt(a.owner,b.crt,'ioHandleCount').known).toBe(false);
 expect(NativeEngineIoImages.forCrt(NativeGameCrtOwner.forPlatform({platform:a.platform})).known).toBe(false);
 expect(NativeEngineIoImages.forCrt(Object.create(NativeEngineCrtOwner.prototype)).known).toBe(false);
});
it('rejects changed or unknown original scope bytes without reseeding',()=>{
 const {crt,owner}=fixture(),scope=fact(NativeEngineIoImages.imageForCrt(owner,crt,'ioSehScope'));
 const before=scope.readUnsigned(0,1);scope.writeUnsigned(0,before^1,1);
 expect(NativeEngineIoImages.forCrt(crt).known).toBe(false);expect(scope.readUnsigned(0,1)).toBe(before^1);
 scope.writeUnsigned(0,before,1);scope.knownMask[0]=0;expect(NativeEngineIoImages.imageForCrt(owner,crt,'ioHandleCount').known).toBe(false);
});
it('rejects replaced backing arrays and released image storage',()=>{
 const a=fixture(),count=fact(NativeEngineIoImages.imageForCrt(a.owner,a.crt,'ioHandleCount'));
 Reflect.set(count.backing,'bytes',new Uint8Array(4));expect(NativeEngineIoImages.forCrt(a.crt).known).toBe(false);
 const b=fixture(),table=fact(NativeEngineIoImages.imageForCrt(b.owner,b.crt,'ioBlockPointers'));table.backing.freed=true;
 expect(NativeEngineIoImages.forCrt(b.crt).known).toBe(false);
});
it.each(['ioCallocSehScope','ioSectionSehScope'] as const)('retains and verifies nested scope %s',label=>{
 const {crt,owner}=fixture(),scope=fact(NativeEngineIoImages.imageForCrt(owner,crt,label));
 expect(scope.bytes.length).toBe(28);expect(fact(NativeEngineIoImages.forCrt(crt))).toBe(owner);
 const before=scope.readUnsigned(4);scope.writeUnsigned(4,before^1);
 expect(NativeEngineIoImages.imageForCrt(owner,crt,'ioBlockPointers').known).toBe(false);
 expect(scope.readUnsigned(4)).toBe((before^1)>>>0);
});
