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
