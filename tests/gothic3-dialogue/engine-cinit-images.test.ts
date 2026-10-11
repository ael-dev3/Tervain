import {createHash} from 'node:crypto';
import {engineCinitTable} from '../../src/gothic3/native-engine-cinit-source';
import {engineCinitImage} from '../../src/gothic3/native-engine-cinit-source';
import { expect, it } from 'vitest';
import { NativeEngineCinitImages } from '../../src/gothic3/native-engine-cinit-images';
import { NativeEngineCrtOwner, NativeGameCrtOwner } from '../../src/gothic3/native-engine-crt-locks';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeValue } from '../../src/gothic3/dialogue';
const fact = <T>(v: NativeValue<T>): T => { if (!v.known) throw new Error(v.reason); return v.value; };
function fixture() { const platform = new NativeRuntimePlatform(), crt = new NativeEngineCrtOwner({ platform }); return { platform, crt, owner: fact(NativeEngineCinitImages.forCrt(crt)) }; }
it('retains mutable original Engine initializer bytes without reseeding', () => {
  const { crt, owner } = fixture(), fields = fact(NativeEngineCinitImages.imageForCrt(owner, crt, 'floatConversionPointers'));
  expect(fields.bytes.length).toBe(40); expect([...fields.knownMask]).toEqual(Array(40).fill(255));
  fields.writeUnsigned(0, 123); expect(fact(NativeEngineCinitImages.forCrt(crt))).toBe(owner); expect(fields.readUnsigned(0)).toBe(123);
});
it('rejects other DLL owners, foreign instances and counterfeit owners', () => {
  const a = fixture(), b = fixture();
  expect(NativeEngineCinitImages.imageForCrt(a.owner, b.crt, 'divideAdjustment').known).toBe(false);
  expect(NativeEngineCinitImages.forCrt(NativeGameCrtOwner.forPlatform({ platform: a.platform })).known).toBe(false);
  expect(NativeEngineCinitImages.forCrt(Object.create(NativeEngineCrtOwner.prototype)).known).toBe(false);
});
it('rejects released or replaced backing without repairing it', () => {
  const a = fixture(), fields = fact(NativeEngineCinitImages.imageForCrt(a.owner, a.crt, 'dynamicTlsCallback'));
  fields.backing.freed = true; expect(NativeEngineCinitImages.forCrt(a.crt).known).toBe(false);
  const b = fixture(), other = fact(NativeEngineCinitImages.imageForCrt(b.owner, b.crt, 'divideAdjustment'));
  Reflect.set(other.backing, 'bytes', new Uint8Array(4)); expect(NativeEngineCinitImages.forCrt(b.crt).known).toBe(false);
});
it('checks the original PE readonly section for the owned callback slot',()=>{
 const {crt,owner}=fixture(),fp=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'floatingPointCallback'));
 expect(fact(NativeEngineCinitImages.floatingPointSlotReadonlyForCrt(owner,crt,fp))).toBe(1);
 const other=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'divideAdjustment'));
 expect(NativeEngineCinitImages.floatingPointSlotReadonlyForCrt(owner,crt,other).known).toBe(false);
 const header=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'originalHeaders'));
 header.knownMask[0]=0;expect(NativeEngineCinitImages.floatingPointSlotReadonlyForCrt(owner,crt,fp).known).toBe(false);expect(header.knownMask[0]).toBe(0);
});

it('owns the exact onexit scope instead of PE headers and rejects mutated scope bytes',()=>{
 const {crt,owner}=fixture(),scope=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'onexitSehScope')),receipt=engineCinitImage('onexitSehScope');
 expect(scope.bytes.length).toBe(28);expect(Array.from(scope.bytes,b=>b.toString(16).padStart(2,'0')).join('')).toBe(receipt.raw);expect(scope.readUnsigned(0)).toBe(0xfffffffe);
 const headers=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'originalHeaders'));expect(scope).not.toBe(headers);expect(headers.readUnsigned(0,2)).toBe(0x5a4d);
 scope.bytes[0]=scope.bytes[0]!^1;expect(NativeEngineCinitImages.imageForCrt(owner,crt,'onexitSehScope').known).toBe(false);expect(scope.bytes[0]).toBe(0xff);
});

it('retains the complete original C++ table without reseeding mutable storage',()=>{
 const {crt,owner}=fixture(),table=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'cppInitializers')),receipt=engineCinitTable('cppInitializers');
 expect(table.bytes.length).toBe(receipt.slots*4);expect(createHash('sha256').update(table.bytes).digest('hex')).toBe(receipt.sha256);expect(table.knownMask.every(byte=>byte===255)).toBe(true);
 table.writeUnsigned(0,123);expect(fact(NativeEngineCinitImages.forCrt(crt))).toBe(owner);expect(fact(NativeEngineCinitImages.imageForCrt(owner,crt,'cppInitializers'))).toBe(table);expect(table.readUnsigned(0)).toBe(123);
});

it('loads the original type-name scope and rejects changed bytes',()=>{
 const {crt,owner}=fixture(),scope=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'propertyTypeNameSehScope'));expect(scope.bytes.length).toBe(28);expect(Buffer.from(scope.bytes).toString('hex')).toBe(engineCinitImage('propertyTypeNameSehScope').raw);scope.bytes[0]=scope.bytes[0]!^1;expect(NativeEngineCinitImages.imageForCrt(owner,crt,'propertyTypeNameSehScope').known).toBe(false);
});

it('loads and protects the exact undecoration exception scope',()=>{
 const {crt,owner}=fixture(),scope=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationSehScope'));expect(scope.bytes.length).toBe(28);expect(Buffer.from(scope.bytes).toString('hex')).toBe(engineCinitImage('undecorationSehScope').raw);scope.knownMask[0]=0;expect(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationSehScope').known).toBe(false);
});

it('retains and protects the original field vtable entry',()=>{
 const {crt,owner}=fixture(),table=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationFieldVtableEntry'));expect(table.bytes.length).toBe(4);expect(Buffer.from(table.bytes).toString('hex')).toBe(engineCinitImage('undecorationFieldVtableEntry').raw);table.bytes[0]=table.bytes[0]!^1;expect(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationFieldVtableEntry').known).toBe(false);
});

for(const label of ['undecorationBasicTypeCaseMap','undecorationBasicTypeTargets','undecorationFloatLiteral'] as const)it('owns and protects original '+label+' bytes',()=>{
 const {crt,owner}=fixture(),image=fact(NativeEngineCinitImages.imageForCrt(owner,crt,label)),receipt=engineCinitImage(label);expect(Buffer.from(image.bytes).toString('hex')).toBe(receipt.raw);expect(image.knownMask.every(byte=>byte===255)).toBe(true);image.bytes[0]=image.bytes[0]!^1;expect(NativeEngineCinitImages.imageForCrt(owner,crt,label).known).toBe(false);
});

it('retains and protects the original text-node vtable entry',()=>{
 const {crt,owner}=fixture(),table=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationTextVtableEntry'));expect(table.bytes.length).toBe(12);expect(Buffer.from(table.bytes).toString('hex')).toBe(engineCinitImage('undecorationTextVtableEntry').raw);table.knownMask[0]=0;expect(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationTextVtableEntry').known).toBe(false);
});


for(const storage of ['bytes','knownMask'] as const)it('rejects altered readonly text-node writer vtable '+storage,()=>{
 const {crt,owner}=fixture(),table=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationTextVtableEntry'));expect(table.bytes.length).toBe(12);expect(table.readUnsigned(8)).toBe(0x306973db);table[storage][8]=table[storage][8]!^1;expect(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationTextVtableEntry').known).toBe(false);
});

it('owns separate second-property images and the original bCString RTTI',()=>{
 const {crt,owner}=fixture(),flags=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'visualAnimationSecondFlags')),storage=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'visualAnimationSecondStorage')),info=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'visualAnimationSecondTypeInfo'));
 expect(flags.readUnsigned(0)).toBe(0);expect(storage.readUnsigned(0)).toBe(0);expect(info.readUnsigned(4)).toBe(0);expect(String.fromCharCode(...info.bytes.subarray(8,-1))).toBe('.?AVbCString@@');
 const first=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'visualAnimationFloatStorage'));expect(storage.backing).not.toBe(first.backing);flags.writeUnsigned(0,3);expect(first.readUnsigned(0)).toBe(0);expect(fact(NativeEngineCinitImages.imageForCrt(owner,crt,'visualAnimationSecondFlags'))).toBe(flags);
});
