import {createHash} from 'node:crypto';
import {engineCinitTable} from '../../src/gothic3/native-engine-cinit-source';
import {engineCinitImage} from '../../src/gothic3/native-engine-cinit-source';
import { expect, it } from 'vitest';
import { NativeEngineCinitImages } from '../../src/gothic3/native-engine-cinit-images';
import { NativeEngineCrtOwner, NativeGameCrtOwner } from '../../src/gothic3/native-engine-crt-locks';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeValue } from '../../src/gothic3/dialogue';
const fact = <T>(v: NativeValue<T>): T => { if (!v.known) throw new Error(v.reason); return v.value; };
it('captures the original obsolete-class storage and decorated type name', () => {
  expect(engineCinitImage('obsoleteClassFlags')).toMatchObject({address:'30ad9a24',raw:'00000000'});
  expect(engineCinitImage('obsoleteClassRoot')).toMatchObject({address:'30ad9e24',raw:'00000000'});
  expect(engineCinitImage('obsoleteClassStorage')).toMatchObject({address:'30ad9a1c',bytes:8,raw:'0000000000000000'});
  expect(engineCinitImage('obsoleteClassTypeInfo')).toMatchObject({address:'30aa2a3c',bytes:30,
    raw:'bc2a8930000000002e3f415662434f62736f6c657465436c617373404000'});
});
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

for(const label of ['undecorationCharacterVtableEntry','undecorationListVtableEntry','undecorationBasicTypeCaseMap','undecorationBasicTypeTargets','undecorationFloatLiteral','undecorationScopeSeparatorLiteral','undecorationClassLiteral','undecorationTemplateParameterLiteral','undecorationGenericTypeLiteral'] as const)it('owns and protects original '+label+' bytes',()=>{
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

it('rejects altered readonly class-keyword masks',()=>{
 const {crt,owner}=fixture(),literal=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationClassLiteral'));expect(Buffer.from(literal.bytes).toString('hex')).toBe('636c6173732000');literal.knownMask[0]=0;expect(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationClassLiteral').known).toBe(false);
});

it('owns separate third property storage and the original int RTTI',()=>{
 const {crt,owner}=fixture(),storage=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'visualAnimationThirdStorage')),info=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'visualAnimationThirdTypeInfo')),flags=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'visualAnimationThirdFlags'));
 expect(storage.readUnsigned(0)).toBe(0);expect(info.bytes.length).toBe(11);expect(Buffer.from(info.bytes.subarray(8)).toString()).toBe('.H\0');expect(info.readUnsigned(4)).toBe(0);flags.writeUnsigned(0,3);expect(storage.backing).not.toBe(fact(NativeEngineCinitImages.imageForCrt(owner,crt,'visualAnimationSecondStorage')).backing);
});

for(const storage of ['bytes','knownMask'] as const)it('rejects altered readonly int literal '+storage,()=>{
 const {crt,owner}=fixture(),literal=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationIntLiteral'));expect(Buffer.from(literal.bytes).toString('hex')).toBe('696e7400');literal[storage][0]=literal[storage][0]!^1;expect(NativeEngineCinitImages.imageForCrt(owner,crt,'undecorationIntLiteral').known).toBe(false);
});


it('owns separate camera object storage and the original eCCameraBase RTTI',()=>{
 const {crt,owner}=fixture(),storage=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'cameraBaseObjectStorage')),info=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'cameraBaseObjectTypeInfo'));expect(storage.readUnsigned(0)).toBe(0);expect(info.bytes.length).toBe(27);expect(Buffer.from(info.bytes.subarray(8)).toString()).toBe('.?AVeCCameraBase@@\0');expect(info.readUnsigned(4)).toBe(0);expect(storage.backing).not.toBe(fact(NativeEngineCinitImages.imageForCrt(owner,crt,'visualAnimationThirdStorage')).backing);
});


it('owns separate reference-base storage and the original bCObjectRefBase RTTI',()=>{
 const {crt,owner}=fixture(),storage=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'objectRefBaseStorage')),info=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'objectRefBaseTypeInfo')),root=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'objectRefBaseRoot')),flags=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'objectRefBaseFlags'));expect(info.bytes.length).toBe(30);expect(Buffer.from(info.bytes.subarray(8)).toString()).toBe('.?AVbCObjectRefBase@@\0');expect(info.readUnsigned(4)).toBe(0);for(const fields of [storage,root,flags])expect(fields.bytes.every(byte=>byte===0)).toBe(true);expect(storage.backing).not.toBe(fact(NativeEngineCinitImages.imageForCrt(owner,crt,'cameraBaseObjectStorage')).backing);expect(info.knownMask.every(byte=>byte===255)).toBe(true);
});

it('captures original geometry spatial context property storage and RTTI',()=>{
 expect(engineCinitImage('geometrySpatialContextPropertyFlags')).toMatchObject({address:'30ad9b38',raw:'00000000'});
 expect(engineCinitImage('geometrySpatialContextPropertyRoot')).toMatchObject({address:'30ad9dc8',raw:'00000000'});
 expect(engineCinitImage('geometrySpatialContextPropertyStorage')).toMatchObject({address:'30ad9b30',bytes:8,raw:'0000000000000000'});
 expect(engineCinitImage('geometrySpatialContextPropertyTypeInfo')).toMatchObject({address:'30aa2d28',bytes:39,raw:'bc2a8930000000002e3f4156654347656f6d657472795370617469616c436f6e74657874404000'});
});

it('captures original PVS prefetcher property storage and RTTI',()=>{
 expect(engineCinitImage('pvsPrefetcher3PropertyFlags')).toMatchObject({address:'30ad9b44',raw:'00000000'});
 expect(engineCinitImage('pvsPrefetcher3PropertyRoot')).toMatchObject({address:'30ad9dc4',raw:'00000000'});
 expect(engineCinitImage('pvsPrefetcher3PropertyStorage')).toMatchObject({address:'30ad9b3c',bytes:8,raw:'0000000000000000'});
 expect(Buffer.from(engineCinitImage('pvsPrefetcher3PropertyTypeInfo').raw,'hex').subarray(8).toString()).toBe('.?AVeCPVSPrefetcher3@@\0');
});

it('captures original occlusion processor property storage and RTTI',()=>{
 expect(engineCinitImage('occlusionProcessorPropertyFlags')).toMatchObject({address:'30ad9b50',raw:'00000000'});
 expect(engineCinitImage('occlusionProcessorPropertyRoot')).toMatchObject({address:'30ad9dc0',raw:'00000000'});
 expect(engineCinitImage('occlusionProcessorPropertyStorage')).toMatchObject({address:'30ad9b48',bytes:8,raw:'0000000000000000'});
 expect(Buffer.from(engineCinitImage('occlusionProcessorPropertyTypeInfo').raw,'hex').subarray(8).toString()).toBe('.?AVeCOcclusionProcessor@@\0');
});

it.each([["gfxAdminProperty", "30ad9b5c", "30ad9dbc", "30ad9b54", "30aa2dac", "bc2a8930000000002e3f4156654347667841646d696e404000"], ["renderSystemAdminProperty", "30ad9b68", "30ad9db8", "30ad9b60", "30aa2dcc", "bc2a8930000000002e3f4156654352656e64657253797374656d41646d696e404000"], ["imageCacheProperty", "30ad9b74", "30ad9db4", "30ad9b6c", "30aa2df4", "bc2a8930000000002e3f41566543496d6167654361636865404000"], ["materialCacheProperty", "30ad9b80", "30ad9db0", "30ad9b78", "30aa2e14", "bc2a8930000000002e3f415665434d6174657269616c4361636865404000"], ["meshCacheProperty", "30ad9b8c", "30ad9dac", "30ad9b84", "30aa2e38", "bc2a8930000000002e3f415665434d6573684361636865404000"], ["soundCacheProperty", "30ad9b98", "30ad9da8", "30ad9b90", "30aa2e58", "bc2a8930000000002e3f41566543536f756e644361636865404000"], ["collisionMeshCacheProperty", "30ad9ba4", "30ad9da4", "30ad9b9c", "30aa2e78", "bc2a8930000000002e3f41566543436f6c6c6973696f6e4d6573684361636865404000"], ["animationCacheProperty", "30ad9bb0", "30ad9da0", "30ad9ba8", "30aa2ea4", "bc2a8930000000002e3f41566543416e696d6174696f6e4361636865404000"], ["iteratorAdminProperty", "30ad9bbc", "30ad9d9c", "30ad9bb4", "30aa2ecc", "bc2a8930000000002e3f415665434974657261746f7241646d696e404000"], ["inpAdminProperty", "30ad9bc8", "30ad9d98", "30ad9bc0", "30aa2ef0", "bc2a8930000000002e3f41566543496e7041646d696e404000"], ["dllInfoCtrlProperty", "30ad9bd4", "30ad9d94", "30ad9bcc", "30aa2f10", "bc2a8930000000002e3f41566543446c6c496e666f4374726c404000"], ["wndProperty", "30ad9be0", "30ad9d90", "30ad9bd8", "30aa244c", "bc2a8930000000002e3f41566543576e64404000"], ["physicsSceneProperty", "30ad9bec", "30ad9d8c", "30ad9be4", "30aa2f34", "bc2a8930000000002e3f41566543506879736963735363656e65404000"], ["animationAdminProperty", "30ad9bf8", "30ad9d88", "30ad9bf0", "30aa2f58", "bc2a8930000000002e3f41566543416e696d6174696f6e41646d696e404000"], ["performanceAdminProperty", "30ad9c04", "30ad9d84", "30ad9bfc", "30aa2f80", "bc2a8930000000002e3f41566543506572666f726d616e636541646d696e404000"], ["vegetationAdminProperty", "30ad9c10", "30ad9d80", "30ad9c08", "30aa2fa8", "bc2a8930000000002e3f4156654356656765746174696f6e41646d696e404000"], ["shaderMaterialAdminProperty", "30ad9c1c", "30ad9d7c", "30ad9c14", "30aa2fd0", "bc2a8930000000002e3f415665435368616465724d6174657269616c41646d696e404000"]])("captures original property data for %s",(prefix,flags,root,storage,typeInfo,raw)=>{
 expect(engineCinitImage((prefix+"Flags") as Parameters<typeof engineCinitImage>[0])).toMatchObject({address:flags,raw:"00000000"});
 expect(engineCinitImage((prefix+"Root") as Parameters<typeof engineCinitImage>[0])).toMatchObject({address:root,raw:"00000000"});
 expect(engineCinitImage((prefix+"Storage") as Parameters<typeof engineCinitImage>[0])).toMatchObject({address:storage,bytes:8,raw:"0000000000000000"});
 expect(engineCinitImage((prefix+"TypeInfo") as Parameters<typeof engineCinitImage>[0])).toMatchObject({address:typeInfo,raw});
});


it.each(['shapeMaterialContainerPropertyFlags', 'shapeMaterialContainerPropertyRoot', 'shapeMaterialContainerPropertyStorage', 'shapeMaterialContainerPropertyTypeInfo', 'collisionGroupContainerPropertyFlags', 'collisionGroupContainerPropertyRoot', 'collisionGroupContainerPropertyStorage', 'collisionGroupContainerPropertyTypeInfo'] as const)('owns the captured following enum image %s',label=>{
 const {crt,owner}=fixture(),fields=fact(NativeEngineCinitImages.imageForCrt(owner,crt,label)),receipt=engineCinitImage(label);
 expect(fields.bytes.length).toBe(receipt.bytes);expect(Buffer.from(fields.bytes).toString('hex')).toBe(receipt.raw);expect(Array.from(fields.knownMask)).toEqual(Array(receipt.bytes).fill(255));expect(fact(NativeEngineCinitImages.imageForCrt(owner,crt,label))).toBe(fields);
 const other=fixture();expect(NativeEngineCinitImages.imageForCrt(owner,other.crt,label).known).toBe(false);
 fields.backing.freed=true;expect(NativeEngineCinitImages.imageForCrt(owner,crt,label).known).toBe(false);expect(fields.backing.freed).toBe(true);
});

it.each(['shapeMaterialContainerPropertyTypeInfo', 'collisionGroupContainerPropertyTypeInfo'] as const)('retains unknown following enum cache bytes without reseeding %s',label=>{
 const {crt,owner}=fixture(),fields=fact(NativeEngineCinitImages.imageForCrt(owner,crt,label));fields.knownMask[4]=0;expect(fact(NativeEngineCinitImages.imageForCrt(owner,crt,label))).toBe(fields);expect(fields.knownMask[4]).toBe(0);
});


it.each(['springAndDamperEffectorTemplatePropertyFlags', 'springAndDamperEffectorTemplatePropertyRoot', 'springAndDamperEffectorTemplatePropertyStorage', 'springAndDamperEffectorTemplatePropertyTypeInfo', 'audioModulePropertyFlags', 'audioModulePropertyRoot', 'audioModulePropertyStorage', 'audioModulePropertyTypeInfo'] as const)('owns the captured template and audio image %s',label=>{
 const {crt,owner}=fixture(),fields=fact(NativeEngineCinitImages.imageForCrt(owner,crt,label)),receipt=engineCinitImage(label);
 expect(fields.bytes.length).toBe(receipt.bytes);expect(Buffer.from(fields.bytes).toString('hex')).toBe(receipt.raw);expect(Array.from(fields.knownMask)).toEqual(Array(receipt.bytes).fill(255));expect(fact(NativeEngineCinitImages.imageForCrt(owner,crt,label))).toBe(fields);
 const other=fixture();expect(NativeEngineCinitImages.imageForCrt(owner,other.crt,label).known).toBe(false);fields.backing.freed=true;expect(NativeEngineCinitImages.imageForCrt(owner,crt,label).known).toBe(false);expect(fields.backing.freed).toBe(true);
});

it.each(['springAndDamperEffectorTemplatePropertyTypeInfo', 'audioModulePropertyTypeInfo'] as const)('retains unknown template and audio cache bytes without reseeding %s',label=>{
 const {crt,owner}=fixture(),fields=fact(NativeEngineCinitImages.imageForCrt(owner,crt,label));fields.knownMask[4]=0;expect(fact(NativeEngineCinitImages.imageForCrt(owner,crt,label))).toBe(fields);expect(fields.knownMask[4]).toBe(0);
});


it.each(['sharedCriticalSectionReferenceCounter', 'sharedCriticalSectionArray', 'sharedCriticalSectionReferenceAddress', 'sharedCriticalSectionSecondReferenceAddress'] as const)('owns the original shared critical-section image %s',label=>{const {crt,owner}=fixture(),fields=fact(NativeEngineCinitImages.imageForCrt(owner,crt,label)),receipt=engineCinitImage(label);expect(fields.bytes.length).toBe(receipt.bytes);expect(Buffer.from(fields.bytes).toString('hex')).toBe(receipt.raw);expect(Array.from(fields.knownMask)).toEqual(Array(receipt.bytes).fill(255));expect(fact(NativeEngineCinitImages.imageForCrt(owner,crt,label))).toBe(fields);fields.backing.freed=true;expect(NativeEngineCinitImages.imageForCrt(owner,crt,label).known).toBe(false);});

it('retains the original standard-output filebuf storage extent',()=>{const {crt,owner}=fixture(),fields=fact(NativeEngineCinitImages.imageForCrt(owner,crt,'standardOutputFilebufStorage'));expect(engineCinitImage('standardOutputFilebufStorage')).toMatchObject({address:'30af6e08',bytes:80,fileBackedBytes:0,loaderZeroFillBytes:80});expect(Array.from(fields.bytes)).toEqual(Array(80).fill(0));expect(Array.from(fields.knownMask)).toEqual(Array(80).fill(255));expect(fact(NativeEngineCinitImages.imageForCrt(owner,crt,'standardOutputFilebufStorage'))).toBe(fields);fields.backing.freed=true;expect(NativeEngineCinitImages.imageForCrt(owner,crt,'standardOutputFilebufStorage').known).toBe(false);});
