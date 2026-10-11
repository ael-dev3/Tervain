import type { NativeValue } from './dialogue';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeHeapObjectViews } from './native-heap-views';
import { engineCinitImage, engineCinitHeaders, engineCinitFloatingPointCallback, engineCinitString, engineCinitTable } from './native-engine-cinit-source';

type Label = 'guidPropertyFlags' | 'guidPropertyRoot' | 'guidPropertyStorage' | 'guidPropertyTypeInfo' | 'engineComponentPropertyFlags' | 'engineComponentPropertyRoot' | 'engineComponentPropertyStorage' | 'engineComponentPropertyTypeInfo' | 'illuminationAdminPropertyFlags' | 'illuminationAdminPropertyRoot' | 'illuminationAdminPropertyStorage' | 'illuminationAdminPropertyTypeInfo' | 'materialAdminPropertyFlags' | 'materialAdminPropertyRoot' | 'materialAdminPropertyStorage' | 'materialAdminPropertyTypeInfo' | 'guiManagerPropertyFlags' | 'guiManagerPropertyRoot' | 'guiManagerPropertyStorage' | 'guiManagerPropertyTypeInfo' | 'actionMapperPropertyFlags' | 'actionMapperPropertyRoot' | 'actionMapperPropertyStorage' | 'actionMapperPropertyTypeInfo' | 'contextBasePropertyFlags' | 'contextBasePropertyRoot' | 'contextBasePropertyStorage' | 'contextBasePropertyTypeInfo' | 'inputReceiverPropertyFlags' | 'inputReceiverPropertyRoot' | 'inputReceiverPropertyStorage' | 'inputReceiverPropertyTypeInfo' | 'boolPropertyFlags' | 'boolPropertyRoot' | 'boolPropertyStorage' | 'boolPropertyTypeInfo' | 'undecorationBoolLiteral' | 'vectorPropertyFlags' | 'vectorPropertyRoot' | 'vectorPropertyStorage' | 'vectorPropertyTypeInfo' | 'vector2PropertyFlags' | 'vector2PropertyRoot' | 'vector2PropertyStorage' | 'vector2PropertyTypeInfo' | 'rectPropertyFlags' | 'rectPropertyRoot' | 'rectPropertyStorage' | 'rectPropertyTypeInfo' | 'matrixPropertyFlags' | 'matrixPropertyRoot' | 'matrixPropertyStorage' | 'matrixPropertyTypeInfo' | 'obsoleteClassFlags' | 'obsoleteClassRoot' | 'obsoleteClassStorage' | 'obsoleteClassTypeInfo' | 'objectRefBaseFlags' | 'objectRefBaseRoot' | 'objectRefBaseStorage' | 'objectRefBaseTypeInfo' | 'cameraBaseObjectFlags' | 'cameraBaseObjectRoot' | 'cameraBaseObjectStorage' | 'cameraBaseObjectTypeInfo' | 'undecorationIntLiteral' | 'visualAnimationThirdFlags' | 'visualAnimationThirdRoot' | 'visualAnimationThirdStorage' | 'visualAnimationThirdTypeInfo' | 'visualAnimationSecondFlags' | 'visualAnimationSecondRoot' | 'visualAnimationSecondStorage' | 'visualAnimationSecondTypeInfo' | 'undecorationListVtableEntry' | 'undecorationTextVtableEntry' | 'undecorationBasicTypeCaseMap' | 'undecorationBasicTypeTargets' | 'undecorationTemplateParameterLiteral' | 'undecorationGenericTypeLiteral' | 'undecorationScopeSeparatorLiteral' | 'undecorationClassLiteral' | 'undecorationFloatLiteral' | 'undecorationParserGlobals' | 'undecorationFieldVtableEntry' | 'undecorationGlobals' | 'undecorationSehScope' | 'propertyTypeNameSehScope' | 'visualAnimationFloatFlags' | 'visualAnimationFloatRoot' | 'visualAnimationFloatStorage' | 'visualAnimationFloatDefault' | 'visualAnimationFloatTypeInfo' | 'cppInitializers' | 'onexitSehScope' | 'sse2Control' | 'sse2Ready' | 'streamCount' | 'streamPointers' | 'staticStreams' | 'exitTableBegin' | 'exitTableEnd' | 'errorInitializers' | 'divideModule' | 'divideExport' | 'originalHeaders' | 'floatingPointCallback' | 'floatConversionPointers' | 'divideAdjustment' | 'dynamicTlsCallback';
const tableReceipts=new Map<string,Readonly<{address:string;bytes:number;raw:string}>>();
function original(label:Label){if(label==='errorInitializers'||label==='cppInitializers'){const retained=tableReceipts.get(label);if(retained)return retained;const table=engineCinitTable(label),bytes=new Uint8Array(table.slots*4),view=new DataView(bytes.buffer),begin=parseInt(table.begin,16);for(const entry of table.nonzeroEntries)view.setUint32(parseInt(entry.slot,16)-begin,parseInt(entry.target,16),true);const receipt=Object.freeze({address:table.begin,bytes:bytes.length,raw:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')});tableReceipts.set(label,receipt);return receipt;}if(label==='originalHeaders')return engineCinitHeaders();if(label==='divideModule'||label==='divideExport'){const row=engineCinitString(label);return {...row,bytes:row.raw.length/2};}return engineCinitImage(label);}
const owners = new WeakMap<NativeModuleCrtOwner, NativeEngineCinitImages>();
const token = Object.freeze({});
const buffer = Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer')!.get!;
const offset = Object.getOwnPropertyDescriptor(DataView.prototype, 'byteOffset')!.get!;
const length = Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength')!.get!;
export class NativeEngineCinitImages {
  readonly #images = new Map<Label, { fields: NativeHeapObjectViews; backing: NativeHeapObjectViews['backing']; bytes: Uint8Array; masks: Uint8Array; rootBytes: Uint8Array; rootMasks: Uint8Array; view: DataView; size: number }>();
  private constructor(readonly crt: NativeModuleCrtOwner, grant: object) {
    if (grant !== token || new.target !== NativeEngineCinitImages || !NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Engine' || !(crt.host.platform instanceof NativeRuntimePlatform)) throw new Error('Constructed Engine initializer owner required');
    for (const label of ['guidPropertyFlags','guidPropertyRoot','guidPropertyStorage','guidPropertyTypeInfo','engineComponentPropertyFlags','engineComponentPropertyRoot','engineComponentPropertyStorage','engineComponentPropertyTypeInfo','illuminationAdminPropertyFlags','illuminationAdminPropertyRoot','illuminationAdminPropertyStorage','illuminationAdminPropertyTypeInfo','materialAdminPropertyFlags','materialAdminPropertyRoot','materialAdminPropertyStorage','materialAdminPropertyTypeInfo','guiManagerPropertyFlags','guiManagerPropertyRoot','guiManagerPropertyStorage','guiManagerPropertyTypeInfo','actionMapperPropertyFlags','actionMapperPropertyRoot','actionMapperPropertyStorage','actionMapperPropertyTypeInfo','contextBasePropertyFlags','contextBasePropertyRoot','contextBasePropertyStorage','contextBasePropertyTypeInfo','inputReceiverPropertyFlags','inputReceiverPropertyRoot','inputReceiverPropertyStorage','inputReceiverPropertyTypeInfo','boolPropertyFlags','boolPropertyRoot','boolPropertyStorage','boolPropertyTypeInfo','undecorationBoolLiteral','vectorPropertyFlags','vectorPropertyRoot','vectorPropertyStorage','vectorPropertyTypeInfo','vector2PropertyFlags','vector2PropertyRoot','vector2PropertyStorage','vector2PropertyTypeInfo','rectPropertyFlags','rectPropertyRoot','rectPropertyStorage','rectPropertyTypeInfo','matrixPropertyFlags','matrixPropertyRoot','matrixPropertyStorage','matrixPropertyTypeInfo','obsoleteClassFlags','obsoleteClassRoot','obsoleteClassStorage','obsoleteClassTypeInfo','objectRefBaseFlags','objectRefBaseRoot','objectRefBaseStorage','objectRefBaseTypeInfo','cameraBaseObjectFlags','cameraBaseObjectRoot','cameraBaseObjectStorage','cameraBaseObjectTypeInfo','undecorationIntLiteral','visualAnimationThirdFlags','visualAnimationThirdRoot','visualAnimationThirdStorage','visualAnimationThirdTypeInfo','visualAnimationSecondFlags','visualAnimationSecondRoot','visualAnimationSecondStorage','visualAnimationSecondTypeInfo','undecorationListVtableEntry','undecorationTextVtableEntry','undecorationBasicTypeCaseMap','undecorationBasicTypeTargets','undecorationFloatLiteral','undecorationScopeSeparatorLiteral','undecorationClassLiteral','undecorationTemplateParameterLiteral','undecorationGenericTypeLiteral','undecorationParserGlobals','undecorationFieldVtableEntry','undecorationGlobals','undecorationSehScope','propertyTypeNameSehScope','visualAnimationFloatFlags','visualAnimationFloatRoot','visualAnimationFloatStorage','visualAnimationFloatDefault','visualAnimationFloatTypeInfo','cppInitializers','onexitSehScope','sse2Control','sse2Ready','streamCount','streamPointers','staticStreams','exitTableBegin','exitTableEnd','errorInitializers','divideModule','divideExport','originalHeaders', 'floatingPointCallback', 'floatConversionPointers', 'divideAdjustment', 'dynamicTlsCallback'] as const) {
      const row = original(label);
      const bytes = Uint8Array.from(row.raw.match(/../g)!, byte => parseInt(byte, 16));
      if (bytes.length !== row.bytes) throw new Error('Original initializer image extent required');
      const fields = new NativeHeapObjectViews({ identity: Object.freeze({ crt: crt.identity, address: row.address }), bytes, knownMask: new Uint8Array(row.bytes).fill(255), freed: false });
      Object.freeze(fields);
      this.#images.set(label, { fields, backing: fields.backing, bytes: fields.bytes, masks: fields.knownMask, rootBytes: fields.backing.bytes, rootMasks: fields.backing.knownMask, view: fields.view, size: row.bytes });
    }
    Object.freeze(this);
  }
  #validate() {
    const active = NativeRuntimePlatform.requireActivePlatform(this.crt.host.platform as NativeRuntimePlatform);
    if (!active.known) throw new Error(active.reason);
    for (const [label, p] of this.#images) {
      const row=original(label);
      const f = p.fields;
      if (f.backing !== p.backing || f.backing.freed || f.bytes !== p.bytes || f.knownMask !== p.masks || f.view !== p.view || f.backing.bytes !== p.rootBytes || f.backing.knownMask !== p.rootMasks || f.bytes.length !== p.size || f.knownMask.length !== p.size || buffer.call(f.view) !== f.bytes.buffer || offset.call(f.view) !== f.bytes.byteOffset || length.call(f.view) !== p.size) throw new Error('Retained Engine initializer storage required');
      if(label==='undecorationIntLiteral'||label==='undecorationListVtableEntry'||label==='undecorationTextVtableEntry'||label==='undecorationBasicTypeCaseMap'||label==='undecorationBasicTypeTargets'||label==='undecorationFloatLiteral'||label==='undecorationScopeSeparatorLiteral'||label==='undecorationClassLiteral'||label==='undecorationTemplateParameterLiteral'||label==='undecorationGenericTypeLiteral'||label==='undecorationFieldVtableEntry'||label==='undecorationSehScope'||label==='propertyTypeNameSehScope'||label==='onexitSehScope'||label==='originalHeaders'||label==='divideModule'||label==='divideExport')for(let i=0;i<p.size;i++)if(f.knownMask[i]!==255||f.bytes[i]!==parseInt(row.raw.slice(i*2,i*2+2),16))throw new Error('Original Engine readonly header or literal bytes required');
    }
  }
  static forCrt(crt: NativeModuleCrtOwner): NativeValue<NativeEngineCinitImages> {
    try { let owner = owners.get(crt); if (!owner) { owner = new NativeEngineCinitImages(crt, token); owners.set(crt, owner); } owner.#validate(); return { known: true, value: owner }; }
    catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }
  static imageForCrt(owner: NativeEngineCinitImages, crt: NativeModuleCrtOwner, label: Label): NativeValue<NativeHeapObjectViews> {
    try { if (owners.get(crt) !== owner || owner.crt !== crt) throw new Error('Same Engine initializer owner required'); owner.#validate(); const image = owner.#images.get(label); if (!image) throw new Error('Original initializer image required'); return { known: true, value: image.fields }; }
    catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }
  /** Translated readonly guard contract; its internal x86 rows are not counted. */
  static floatingPointSlotReadonlyForCrt(owner:NativeEngineCinitImages,crt:NativeModuleCrtOwner,fields:NativeHeapObjectViews):NativeValue<0|1>{
    try{
      const fp=this.imageForCrt(owner,crt,'floatingPointCallback'),header=this.imageForCrt(owner,crt,'originalHeaders');
      if(!fp.known)throw new Error(fp.reason);if(!header.known)throw new Error(header.reason);
      if(fields!==fp.value)throw new Error('Actual Engine floating-point callback slot required');
      const h=header.value,read=(offset:number,width:1|2|4=4)=>NativeHeapObjectViews.prototype.readUnsigned.call(h,offset,width);
      if(read(0,2)!==0x5a4d)return {known:true,value:0};
      const nt=read(0x3c);if(read(nt)!==0x4550||read(nt+24,2)!==0x10b)return {known:true,value:0};
      const count=read(nt+6,2),table=nt+24+read(nt+20,2),rva=parseInt(engineCinitFloatingPointCallback().slot,16)-parseInt(engineCinitHeaders().address,16);
      for(let i=0;i<count;i++){
        const section=table+i*40,begin=read(section+12),end=(begin+read(section+8))>>>0;
        if(rva>=begin&&rva<end)return {known:true,value:(read(section+36)&0x80000000)===0?1:0};
      }
      return {known:true,value:0};
    }catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
  }
}
