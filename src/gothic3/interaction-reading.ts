/** Original fresh Interaction factory/current Hero read. Retained field, proxy
 * and CString capabilities remain the same objects for later native services.
 * Construction/read alone never establishes world residency or interaction. */
import rulesText from '../../assets/gothic3/interaction-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativeMaskedWord, NativePropertyCallbacks, NativePropertyObjectReference } from './entity-lifecycle';
import type { OriginalProxyInternalReference } from './native-properties';
import { NativeReflectionWrapper, loadOriginalReflectionSerialized, originalReflectionPropertyInput } from './entity-reflection';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionAccessor } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';

type InteractionEnum = 'FocusPriority' | 'UseType' | 'FocusNameType';
type InteractionString = 'ScriptUseFunc' | 'FocusNameBone' | 'EnterROIScript' | 'ExitROIScript';
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string,string>; nativeBytes: number;
  getVersion: number; propertyType: number; nativeVtable: string; wrapperVtable: string;
  fields: readonly NativeReflectionField[]; enumGlobals: Record<InteractionEnum,string>; containerVtables: Record<InteractionEnum,string>;
  sourceHero: { index: number; packetSha256: string }; sources: Record<string,string> };
if (rules.schema !== 'gothic3-interaction-reading-rules-v1' || rules.nativeBytes !== 224 || rules.getVersion !== 84 ||
    rules.propertyType !== 49 || rules.nativeVtable !== '206ab484' || rules.wrapperVtable !== '206ab62c' ||
    rules.fields.map(field => field.nativeOffset).join(',') !== '20,28,56,84,92,96,124,132,136,148,160,164,168,172' ||
    rules.sourceHero.index !== 9 || rules.sourceHero.packetSha256 !== '0551364e20ce1d23f4f52a8ec4eff3de788bc7dcbe3724bc89dd6fa72ce9de44' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original Interaction receipt differs');
const known = <T>(value:T):NativeValue<T> => ({known:true,value});
const unknown = <T>(reason:string):NativeValue<T> => ({known:false,reason});
function fact<T>(value:NativeValue<T>,operation:string):T {if(!value.known)throw new Error(operation+': '+value.reason);return value.value;}
function u32(value:number):number {if(!Number.isInteger(value)||value<0||value>0xffffffff)throw new Error('Original DWORD required');return value;}
function enumField(field:NativeReflectionField):field is NativeReflectionField&{name:InteractionEnum} {return field.name in rules.enumGlobals;}
function hex(bytes:Uint8Array):string {return Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');}

/** Unknown math/padding/addresses have mask0. A nonNULL pointer is a retained
 * capability, never a fabricated numerical native address. */
export class NativeInteractionBytes {
  readonly bytes=new Uint8Array(224); readonly knownMask=new Uint8Array(224);
  private readonly view=new DataView(this.bytes.buffer); revision=0;
  constructor(private readonly guard:()=>void) {}
  private range(at:number,length:number):void {if(!Number.isInteger(at)||!Number.isInteger(length)||at<0||length<0||at+length>224)throw new Error('Original Interaction physical range differs');}
  has(at:number,length:number):boolean {this.range(at,length);return this.knownMask.subarray(at,at+length).every(mask=>mask===255);}
  byte(at:number):number {if(!this.has(at,1))throw new Error('Unknown Interaction byte');return this.view.getUint8(at);}
  uint(at:number):number {if(!this.has(at,4))throw new Error('Unknown Interaction DWORD');return this.view.getUint32(at,true);}
  vector(at:number):readonly [number,number,number] {if(!this.has(at,12))throw new Error('Unknown Interaction vector');return [this.view.getFloat32(at,true),this.view.getFloat32(at+4,true),this.view.getFloat32(at+8,true)];}
  writeByte(at:number,value:number):void {this.guard();this.range(at,1);if(!Number.isInteger(value)||value<0||value>255)throw new Error('Original byte required');this.view.setUint8(at,value);this.knownMask[at]=255;this.revision++;this.guard();}
  writeUint(at:number,value:number):void {this.guard();this.range(at,4);this.view.setUint32(at,u32(value),true);this.knownMask.fill(255,at,at+4);this.revision++;this.guard();}
  writeRaw(at:number,data:Uint8Array,masks?:Uint8Array):void {this.guard();this.range(at,data.length);if(masks&&masks.length!==data.length)throw new Error('Original masks differ');this.bytes.set(data,at);if(masks)this.knownMask.set(masks,at);else this.knownMask.fill(255,at,at+data.length);this.revision++;this.guard();}
  pointerUnknown(at:number):void {this.guard();this.range(at,4);this.knownMask.fill(0,at,at+4);this.revision++;this.guard();}
}

export interface NativeInteractionCStringAllocation {
  readonly identity: object; readonly text:string; readonly length:number; referenceCount:number; freed:boolean;
}
/** Actual physical pointer slot; NULL is distinct from an allocated empty data
 * buffer. Host ownership operations mutate this same slot and ushortrefs. */
export class NativeInteractionCStringSlot {
  private current:NativeInteractionCStringAllocation|null|undefined;
  constructor(readonly nativeOffset:number,readonly allocation:OriginalInteractionProperties) {}
  get pointer():NativeInteractionCStringAllocation|null {if(this.current===undefined)throw new Error('CString constructor has not initialized this physical pointer');return this.current;}
  set pointer(value:NativeInteractionCStringAllocation|null) {
    this.allocation.reader.guard();this.allocation.exact(false);
    if(value!==null&&(typeof value.identity!=='object'||value.identity===null||typeof value.text!=='string'||
      !Number.isInteger(value.length)||value.length<0||!Number.isInteger(value.referenceCount)||value.referenceCount<0||value.referenceCount>65535||value.freed))throw new Error('Actual live CString data allocation required');
    this.current=value;
    if(value===null)this.allocation.storage.writeUint(this.nativeOffset,0);else this.allocation.storage.pointerUnknown(this.nativeOffset);
    this.allocation.reader.note('same live CString pointer+'+this.nativeOffset.toString(16),'SharedBase:10014640');
  }
  get text():string {const data=this.pointer;if(data?.freed)throw new Error('CString points to freed data');return data?.text??'';}
  isEmpty():boolean {return this.pointer===null||this.pointer.length===0;}
}

/** Embedded EntityProxy28B. Every field aliases the one PS backing/capability
 * store; equal first16B IDs retain its cached reference. */
export class OriginalInteractionEntityProxy {
  private currentInternal:OriginalProxyInternalReference|null|undefined;
  constructor(readonly nativeOffset:number,readonly allocation:OriginalInteractionProperties) {}
  get internal():OriginalProxyInternalReference|null {if(this.currentInternal===undefined)throw new Error('EntityProxy internal pointer is not constructed');return this.currentInternal;}
  set internal(value:OriginalProxyInternalReference|null) {
    this.allocation.reader.guard();this.allocation.exact(false);this.currentInternal=value;
    if(value===null)this.allocation.storage.writeUint(this.nativeOffset+4,0);else this.allocation.storage.pointerUnknown(this.nativeOffset+4);
    this.allocation.reader.note('same EntityProxy internal pointer','Engine:304c4410');
  }
  propertyID():string {if(!this.allocation.storage.has(this.nativeOffset+8,20))throw new Error('EntityProxy embedded ID is not constructed');return hex(this.allocation.storage.bytes.subarray(this.nativeOffset+8,this.nativeOffset+28));}
  setPropertyId20(value:string):void {
    this.allocation.reader.guard();this.allocation.exact(false);if(!/^[0-9a-f]{40}$/.test(value))throw new Error('Original20B PropertyID required');
    this.allocation.storage.writeRaw(this.nativeOffset+8,Uint8Array.from(value.match(/../g)!.map(byte=>parseInt(byte,16))));
    this.allocation.reader.note('same embedded PropertyID20B','SharedBase:10092970');
  }
}
export class OriginalInteractionPropertyID {
  readonly bytes=new Uint8Array(20); destroyed=false; deleted=false;
  constructor(readonly identity:string) {if(!identity)throw new Error('Actual owned PropertyID allocation required');}
}
export class OriginalInteractionTemplateProxy {
  private currentTemplate:object|null|undefined;
  private currentId:OriginalInteractionPropertyID|null|undefined;
  constructor(readonly nativeOffset:number,readonly allocation:OriginalInteractionProperties) {}
  get cachedTemplate():object|null {if(this.currentTemplate===undefined)throw new Error('TemplateProxy cache pointer is not constructed');return this.currentTemplate;}
  set cachedTemplate(value:object|null) {
    this.allocation.reader.guard();this.allocation.exact(false);this.currentTemplate=value;
    if(value===null)this.allocation.storage.writeUint(this.nativeOffset+4,0);else this.allocation.storage.pointerUnknown(this.nativeOffset+4);
    this.allocation.reader.note('same TemplateProxy cached pointer','Engine:304c7270');
  }
  get propertyId():OriginalInteractionPropertyID|null {if(this.currentId===undefined)throw new Error('TemplateProxy owned ID pointer is not constructed');return this.currentId;}
  set propertyId(value:OriginalInteractionPropertyID|null) {
    this.allocation.reader.guard();this.allocation.exact(false);if(value&&(value.destroyed||value.deleted))throw new Error('Live owned PropertyID allocation required');this.currentId=value;
    if(value===null)this.allocation.storage.writeUint(this.nativeOffset+8,0);else this.allocation.storage.pointerUnknown(this.nativeOffset+8);
    this.allocation.reader.note('same TemplateProxy owned ID pointer','Engine:304c73d0');
  }
  propertyID():string|null {const id=this.propertyId;if(id?.deleted||id?.destroyed)throw new Error('TemplateProxy has destroyed owned ID');return id===null?null:hex(id.bytes);}
}
export interface NativeInteractionNavigationAdmin {
  readonly identity:object;
  registerInteraction(set:NativeLivePropertySet<OriginalInteractionValues>):NativeValue<void>;
  deregisterInteraction(set:NativeLivePropertySet<OriginalInteractionValues>):NativeValue<void>;
}
export interface NativeInteractionROIAdmin {
  readonly identity:object;
  addInteraction(set:NativeLivePropertySet<OriginalInteractionValues>):NativeValue<void>;
  removeInteraction(set:NativeLivePropertySet<OriginalInteractionValues>):NativeValue<void>;
}
export interface NativeInteractionTemporaryCString {readonly identity:object;readonly pointer:NativeInteractionCStringAllocation|null}
export interface NativeInteractionScriptAdmin {
  readonly identity:object;
  /** Actual captured virtual+bc; native result is ignored. */
  callScript(name:NativeInteractionCStringSlot|NativeInteractionTemporaryCString,self:NativeLiveEntity,other:null,value:0):NativeValue<unknown>;
}
export interface NativeInteractionReadingHost {
  enumDefault(name:InteractionEnum,originalGlobalVA:string):NativeValue<NativeMaskedWord>;
  /** Native char*-literal assignment including allocation/copy/old data release. */
  assignCString(slot:NativeInteractionCStringSlot,text:string):NativeValue<void>;
  /** Selected indexed archive virtual Read(CString*) including source table
   * buffer identity/refcount and old destination release before pointer store. */
  readCString(slot:NativeInteractionCStringSlot,input:NativeEntityByteInput):NativeValue<void>;
  freeCString?(data:NativeInteractionCStringAllocation):NativeValue<void>;
  deleteTemplateId?(data:OriginalInteractionPropertyID):NativeValue<void>;
  /** Actual RTTI result from the captured owner pointer, including NULL. */
  isTemplate?(owner:NativeLiveEntity|null):NativeValue<boolean>;
  navigationAdmin?():NativeValue<NativeInteractionNavigationAdmin>;
  roiAdmin?():NativeValue<NativeInteractionROIAdmin>;
  /** Captured original gCGameApp virtual+270 AL (strict1 gate). */
  applicationMode?():NativeValue<number>;
  scriptAdmin?():NativeValue<NativeInteractionScriptAdmin|null>;
  constructScriptName?(literal:'OnEnterProcessingRange'|'OnExitProcessingRange'):NativeValue<NativeInteractionTemporaryCString>;
  destroyScriptName?(temporary:NativeInteractionTemporaryCString):NativeValue<void>;
}
export interface OriginalInteractionValues {
  readonly FocusPriority:number; readonly Owner:OriginalInteractionEntityProxy; readonly User:OriginalInteractionEntityProxy;
  readonly UseType:number; readonly ScriptUseFunc:string; readonly AnchorPoint:OriginalInteractionEntityProxy;
  readonly FocusNameType:number; readonly FocusNameBone:string; readonly FocusViewOffset:readonly [number,number,number];
  readonly FocusWorldOffset:readonly [number,number,number]; readonly UsedByPlayer:boolean; readonly EnterROIScript:string;
  readonly ExitROIScript:string; readonly Spell:OriginalInteractionTemplateProxy;
}

/** The original8B stack allocation is retained for source/lifetime inspection.
 * Its vtable is a module capability; pointer bytes have unknown address masks.
 * The scalar occupies the same physical+4 bytes used by virtual CopyFrom. */
export interface OriginalInteractionEnumTemporary {
  readonly bytes:Uint8Array; readonly knownMask:Uint8Array;
  vtableCapability:number|null; destroyed:boolean; lifetimeGeneration:number;
}

export class OriginalInteractionProperties {
  readonly storage:NativeInteractionBytes; readonly nativeVtables=new Map<number,number>();
  readonly strings=new Map<InteractionString,NativeInteractionCStringSlot>();
  readonly proxies=new Map<number,OriginalInteractionEntityProxy>();
  readonly spell=new OriginalInteractionTemplateProxy(0xac,this);
  /** Additional non-reflected eCPropertySetProxy at+b8: EntityProxy base,
   * property-type DWORD+d4 and CString pointer+d8. Same retained allocations. */
  readonly zoneProxy=new OriginalInteractionEntityProxy(0xb8,this);
  readonly zoneName=new NativeInteractionCStringSlot(0xd8,this);
  readonly temporaries:OriginalInteractionEnumTemporary[]=[];
  readonly values:OriginalInteractionValues; readonly base:NativeLivePropertySet<OriginalInteractionValues>;
  private owner:NativeLiveEntity|null=null;
  lastReadReturnByte:1|null=null;
  constructor(readonly reflectionWrapper:NativeReflectionWrapper,readonly reader:OriginalInteractionReader) {
    this.storage=new NativeInteractionBytes(()=>{reader.guard();this.exact(false);});
    this.values={} as OriginalInteractionValues;
    for(const field of rules.fields){
      if(field.typeName==='bCString')this.strings.set(field.name as InteractionString,new NativeInteractionCStringSlot(field.nativeOffset,this));
      if(field.typeName==='eCEntityProxy')this.proxies.set(field.nativeOffset,new OriginalInteractionEntityProxy(field.nativeOffset,this));
      Object.defineProperty(this.values,field.name,{enumerable:true,configurable:false,get:()=>{
        this.exact();
        if(enumField(field))return this.storage.uint(field.nativeOffset+4);
        if(field.typeName==='bCString')return this.strings.get(field.name as InteractionString)!.text;
        if(field.typeName==='bool')return this.storage.byte(field.nativeOffset)!==0;
        if(field.typeName==='bCVector')return this.storage.vector(field.nativeOffset);
        if(field.typeName==='eCEntityProxy')return this.proxies.get(field.nativeOffset)!;
        if(field.typeName==='eCTemplateEntityProxy')return this.spell;
        throw new Error('Unknown original Interaction field');
      }});
    }
    const callbacks:NativePropertyCallbacks={added:set=>set===this.base?reader.ownerCallback(this,'added'):unknown('Actual Interaction added receiver required'),
      removed:set=>set===this.base?reader.ownerCallback(this,'removed'):unknown('Actual Interaction removed receiver required'),
      postRead:set=>set===this.base?reader.emptyCallback(this,'postRead'):unknown('Actual Interaction PostRead receiver required')};
    this.base=new NativeLivePropertySet(reflectionWrapper.identity+':native','gCInteraction_PS',49,this.values,
      {read:()=>this.owner,write:value=>{reader.guard();this.exact(false);this.owner=value;if(value===null)this.storage.writeUint(0xc,0);else this.storage.pointerUnknown(0xc);reader.guard();}},null,callbacks,()=>reader.controller.value(()=>{reader.guard();this.exact();return false;}));
    let actualWrapper:NativePropertyObjectReference|null=null;
    Object.defineProperty(this.base,'wrapper',{configurable:false,get:()=>actualWrapper,set:(value:NativePropertyObjectReference|null)=>{
      reader.guard();this.exact(false);if(value!==null&&value!==reflectionWrapper)throw new Error('Actual retained Interaction wrapper pointer required');actualWrapper=value;if(value===null)this.storage.writeUint(4,0);else this.storage.pointerUnknown(4);reader.guard();
    }});
  }
  exact(attached=true):void {
    const wrapper=this.reflectionWrapper,allocation=wrapper.controller.allocations().find(value=>value.wrapper===wrapper);
    if(wrapper.deleted||wrapper.controller!==this.reader.controller||allocation?.propertySet!==this.base||this.base.values!==this.values||
      attached&&(wrapper.native!==this.base||this.base.wrapper!==wrapper||this.nativeVtables.get(0)!==0x206ab484))throw new Error('Exact retained Interaction allocation required');
  }
  process():NativeValue<void> {return this.reader.emptyCallback(this,'process');}
  preProcess():NativeValue<void> {return this.reader.emptyCallback(this,'preProcess');}
  postProcess():NativeValue<void> {return this.reader.emptyCallback(this,'postProcess');}
  enterProcessingRange():NativeValue<void> {return this.reader.processingRange(this,'enter');}
  exitProcessingRange():NativeValue<void> {return this.reader.processingRange(this,'exit');}
  notify(phase:'enter'|'exit',property:string,propagated:boolean):NativeValue<true> {return this.reader.run(()=>this.reader.notify(this,phase,property,propagated));}
}

export class OriginalInteractionReader {
  readonly factory:NativeReflectionFactory;
  private readonly retained=new WeakMap<NativeReflectionWrapper,OriginalInteractionProperties>();
  private active=false; private nestedAttempt=false;
  constructor(readonly controller:NativeReflectionController,readonly host:NativeInteractionReadingHost) {
    const root=Object.freeze({className:'gCInteraction_PS',baseClassName:'eCEntityPropertySet',fields:Object.freeze(rules.fields.map(field=>Object.freeze({...field})))});
    this.factory={root,nativeCategory:'entity-property-set',cloneRoot:current=>current===controller?this.run(()=>this.construct()):unknown('Same reflection controller required'),
      getVersion:wrapper=>controller.value(()=>{this.actual(wrapper);return 84;}),read:(wrapper,input)=>this.run(()=>this.read(wrapper,input))};
    fact(controller.registerFactory(this.factory),'Actual Interaction factory registration');
  }
  guard():void {if(this.nestedAttempt)throw new Error('Reentrant Interaction mutation unsupported');const required=this.controller.receipt().required;if(required!==null)throw new Error(required);}
  run<T>(body:()=>T):NativeValue<T> {
    if(this.active){this.nestedAttempt=true;return this.controller.value(()=>{throw new Error('Reentrant Interaction factory/read/callback unsupported');});}
    this.active=true;this.nestedAttempt=false;
    try{return this.controller.value(()=>{this.guard();const result=body();this.guard();return result;});}finally{this.active=false;}
  }
  note(operation:string,source:string):void {this.guard();this.controller.write(operation,source);this.guard();}
  private write(operation:string,source:string,body:()=>void):void {this.guard();body();this.note(operation,source);}
  effect<T>(operation:string,source:string,body:()=>NativeValue<T>|undefined):T {this.guard();const result=this.controller.effect(operation,source,body);this.guard();return result;}
  properties(wrapper:NativeReflectionWrapper,attached=true):NativeValue<OriginalInteractionProperties> {
    const value=this.retained.get(wrapper);if(!value)return unknown('Actual retained Interaction wrapper required');
    try{value.exact(attached);return known(value);}catch(error){return unknown(String(error));}
  }
  retainedProperties(wrapper:NativeReflectionWrapper):NativeValue<OriginalInteractionProperties> {return this.properties(wrapper,false);}
  private actual(wrapper:NativeReflectionWrapper):OriginalInteractionProperties {return fact(this.properties(wrapper),'Actual Interaction native receiver');}
  private field(field:NativeReflectionField):void {if(!this.factory.root.fields.includes(field))throw new Error('Same original Interaction descriptor required');}
  private enumCopy(value:OriginalInteractionProperties,field:NativeReflectionField&{name:InteractionEnum},source:string):void {
    value.exact(false);
    if(value.nativeVtables.get(field.nativeOffset)!==parseInt(rules.containerVtables[field.name],16))throw new Error('Actual captured enum default virtual+18 required');
    const word=this.effect('current module enum default '+field.name,source,()=>this.host.enumDefault(field.name,rules.enumGlobals[field.name]));value.exact(false);u32(word.value);u32(word.knownMask);
    this.write('same masked enum DWORD copy '+field.name,source,()=>value.storage.writeRaw(field.nativeOffset+4,
      new Uint8Array([word.value&255,(word.value>>>8)&255,(word.value>>>16)&255,word.value>>>24]),
      new Uint8Array([word.knownMask&255,(word.knownMask>>>8)&255,(word.knownMask>>>16)&255,word.knownMask>>>24])));
  }
  private constructEntityProxy(value:OriginalInteractionProperties,proxy:OriginalInteractionEntityProxy):void {
    this.write('EntityProxy final vtable capability','Engine:304c45a0',()=>{value.nativeVtables.set(proxy.nativeOffset,0x3087bff4);value.storage.pointerUnknown(proxy.nativeOffset);});
    proxy.setPropertyId20('0000000000000000000000000000000000000000');proxy.internal=null;proxy.setPropertyId20('0000000000000000000000000000000000000000');
  }
  private clearProxy(proxy:OriginalInteractionEntityProxy,source:string):void {
    const internal=proxy.internal;if(internal!==null){this.effect('captured cached EntityProxy ReleaseReference',source,()=>internal.releaseReference());proxy.internal=null;}
    proxy.internal=null;proxy.setPropertyId20('0000000000000000000000000000000000000000');
  }
  private clearString(slot:NativeInteractionCStringSlot):void {
    const data=slot.pointer;if(data===null||data.length===0){this.note('CString.Clear NULL/length0 branch unchanged','SharedBase:100149b0');return;}
    if(data.freed)throw new Error('Original CString Clear live allocation required');
    this.write('captured CString ushort reference decrement','SharedBase:100149b0',()=>{data.referenceCount=(data.referenceCount-1)&65535;});
    if(data.referenceCount===0){this.effect('actual CString data Free','SharedBase:100149b0',()=>this.host.freeCString?.(data));data.freed=true;}
    slot.pointer=null;
  }
  private enumZero(value:OriginalInteractionProperties,name:'FocusNameType'|'UseType',temporary:OriginalInteractionEnumTemporary):void {
    this.guard();value.exact();
    const field=this.factory.root.fields.find(field=>field.name===name)!;
    if(value.nativeVtables.get(field.nativeOffset)!==parseInt(rules.containerVtables[name],16))throw new Error('Actual captured enum assignment virtual+1c required');
    if(!value.temporaries.includes(temporary)||temporary.bytes.length!==8||temporary.knownMask.length!==8)throw new Error('Same actual8B PostInit stack temporary required');
    const view=new DataView(temporary.bytes.buffer);temporary.destroyed=false;temporary.lifetimeGeneration++;temporary.vtableCapability=0x100e7e1c;
    view.setUint32(0,0x100e7e1c,true);this.note('same8B temporary ObjectBase constructor vtable capability','SharedBase:1004a1c2');
    temporary.vtableCapability=parseInt(rules.containerVtables[name],16);view.setUint32(0,temporary.vtableCapability,true);view.setUint32(4,0,true);temporary.knownMask.fill(255,4,8);
    this.note('same8B enum temporary leaf vtable/value0 '+name,'Game:20404180');
    this.write('captured enum virtual+1c copies same temporary+4 scalar '+name,'Game:20404180',()=>value.storage.writeRaw(field.nativeOffset+4,temporary.bytes.subarray(4,8)));
    view.setUint32(0,temporary.vtableCapability,true);this.note('same temporary destructor restores leaf enum vtable '+name,'Game:20404180');
    temporary.vtableCapability=0x100e7e1c;view.setUint32(0,0x100e7e1c,true);temporary.destroyed=true;
    this.note('same8B temporary base destructor vtable then lifetime ends','SharedBase:10049fe0');
  }
  private construct():NativeReflectionWrapper {
    const wrapper=this.controller.allocateWrapper(this.factory,'Game:2040d1f0'),value=new OriginalInteractionProperties(wrapper,this);
    this.retained.set(wrapper,value);this.controller.retainNative(wrapper,value.base);
    // retainNative validates the inherited constructor's initial reference1.
    // Thereafter all header scalars alias this same physical allocation.
    Object.defineProperty(value.base,'referenceWord',{configurable:false,get:()=>value.storage.uint(8),set:(word:number)=>{
      this.guard();value.exact(false);value.storage.writeUint(8,u32(word));this.guard();
    }});
    Object.defineProperties(value.base.baseFlags,{
      value:{configurable:false,get:()=>value.storage.bytes[0x10]!,set:(word:number)=>{
        this.guard();value.exact(false);u32(word);if(word>255)throw new Error('Physical Interaction flag byte required');
        value.storage.writeRaw(0x10,new Uint8Array([word]),new Uint8Array([value.storage.knownMask[0x10]!]));this.guard();
      }},
      knownMask:{configurable:false,get:()=>value.storage.knownMask[0x10]!,set:(word:number)=>{
        this.guard();value.exact(false);u32(word);if(word>255)throw new Error('Physical Interaction flag mask byte required');
        value.storage.writeRaw(0x10,new Uint8Array([value.storage.bytes[0x10]!]),new Uint8Array([word]));this.guard();
      }},
    });
    this.write('ObjectBase constructor vtable','SharedBase:1004a1c2',()=>{value.nativeVtables.set(0,0x100e7e1c);value.storage.pointerUnknown(0);});
    value.base.wrapper=null;
    this.write('RefBase constructor vtable','SharedBase:1004a5ba',()=>value.nativeVtables.set(0,0x100e7eac));
    value.base.referenceWord=1;
    this.write('EntityPS masked flags ANDf1 OR1','Engine:30481a70',()=>value.storage.writeRaw(0x10,new Uint8Array([1]),new Uint8Array([15])));
    this.write('EntityPS constructor vtable','Engine:30481a73',()=>value.nativeVtables.set(0,0x30875d8c));value.base.owner.write(null);
    this.note('EntityPS/RefBase constructor same owner/ref/wrapper/flags','Engine:300025bd');
    this.write('Interaction native vtable','Game:20404457',()=>{value.nativeVtables.set(0,0x206ab484);value.storage.pointerUnknown(0);});
    const makeEnum=(name:InteractionEnum):void=>{const field=this.factory.root.fields.find(field=>field.name===name)!;
      this.write('embedded enum ObjectBase constructor vtable '+name,'SharedBase:1004a1c2',()=>{value.nativeVtables.set(field.nativeOffset,0x100e7e1c);value.storage.pointerUnknown(field.nativeOffset);});
      this.write('embedded enum leaf vtable '+name,'Game:20404440',()=>value.nativeVtables.set(field.nativeOffset,parseInt(rules.containerVtables[name],16)));
      this.enumCopy(value,field as NativeReflectionField&{name:InteractionEnum},'Game:20404440');};
    makeEnum('FocusPriority');this.constructEntityProxy(value,value.proxies.get(0x1c)!);this.constructEntityProxy(value,value.proxies.get(0x38)!);
    makeEnum('UseType');value.strings.get('ScriptUseFunc')!.pointer=null;this.constructEntityProxy(value,value.proxies.get(0x60)!);
    makeEnum('FocusNameType');value.strings.get('FocusNameBone')!.pointer=null;
    this.note('two bCVector constructors are source empty;12B masks remainunknown','SharedBase:10002833');
    value.strings.get('EnterROIScript')!.pointer=null;value.strings.get('ExitROIScript')!.pointer=null;
    this.write('TemplateProxy vtable/NULL cache/NULL owned-ID constructor','Engine:304c7270',()=>{value.nativeVtables.set(0xac,0x3087c124);value.storage.pointerUnknown(0xac);value.spell.cachedTemplate=null;value.spell.propertyId=null;});
    this.constructEntityProxy(value,value.zoneProxy);
    this.write('PropertySetProxy leaf vtable/type0/nameNULL','Engine:304c6620',()=>{value.nativeVtables.set(0xb8,0x3087c0f4);value.storage.writeUint(0xd4,0);value.zoneName.pointer=null;});
    this.note('PropertySetProxy base EntityProxy.Create literalreturn1 ignored','Engine:304c4320');
    this.write('Interaction constructor patch byte+dc=0','Game:20404502',()=>value.storage.writeByte(0xdc,0));
    if(!value.base.isValid()){value.base.createBase();this.note('virtual Create strict IsValid branch/base Create','Game:20403f20');}
    this.controller.setAllocationPhase(wrapper,'created');this.controller.attachConstructedNative(wrapper,value.base,'Game:20404f00','Game:20407b70');
    this.controller.initializeProperties(wrapper,field=>this.controller.value(()=>{
      this.guard();this.field(field);const current=this.actual(wrapper);
      if(enumField(field))this.enumCopy(current,field,field.defaultInitializer!);
      else if(field.typeName==='bCString')this.clearString(current.strings.get(field.name as InteractionString)!);
      else if(field.typeName==='bCVector')this.write('descriptor Vector.Clear positive zero12',field.defaultInitializer!,()=>current.storage.writeRaw(field.nativeOffset,new Uint8Array(12)));
      else if(field.typeName==='bool')this.write('descriptor bool default0',field.defaultInitializer!,()=>current.storage.writeByte(field.nativeOffset,0));
      else if(field.typeName==='eCEntityProxy')this.note('descriptor validates EntityProxy receiver; no reset',field.defaultInitializer!);
      else if(field.typeName==='eCTemplateEntityProxy'){
        this.note('temporary TemplateProxy(EntityNULL) constructor','Engine:304c7590');this.clearTemplate(current.spell,'Engine:304c75c0');this.note('NULL temporary TemplateProxy destructor','Engine:304c7390');
      }else throw new Error('Unknown Interaction descriptor default');
    }),()=>this.controller.value(()=>{
      this.guard();const current=this.actual(wrapper);this.note('PostInitialize inherited RefBase return1','SharedBase:1004a4d0');
      const temporary:OriginalInteractionEnumTemporary={bytes:new Uint8Array(8),knownMask:new Uint8Array(8),vtableCapability:null,destroyed:true,lifetimeGeneration:0};
      current.temporaries.push(temporary);this.enumZero(current,'FocusNameType',temporary);
      this.effect('literal Head_Head_End actual CString assignment','Game:204041d6',()=>this.host.assignCString(current.strings.get('FocusNameBone')!,'Head_Head_End'));current.exact();
      if(current.strings.get('FocusNameBone')!.text!=='Head_Head_End')throw new Error('Original literal assignment postcondition differs');
      this.write('PostInitialize FocusViewOffset.SetVector0','Game:204041e8',()=>current.storage.writeRaw(0x88,new Uint8Array(12)));
      this.write('PostInitialize FocusWorldOffset.SetVector0','Game:204041fa',()=>current.storage.writeRaw(0x94,new Uint8Array(12)));
      this.enumZero(current,'UseType',temporary);this.clearProxy(current.proxies.get(0x1c)!,'Engine:304c43a0');this.clearProxy(current.proxies.get(0x38)!,'Engine:304c43a0');
    }),'Game:20404180');return wrapper;
  }
  private clearTemplate(proxy:OriginalInteractionTemplateProxy,source:string):void {
    const id=proxy.propertyId;
    if(id!==null){this.write('captured old owned PropertyID destructorzero20',source,()=>{id.bytes.fill(0);id.destroyed=true;});this.effect('actual old owned PropertyID DeleteObject',source,()=>this.host.deleteTemplateId?.(id));id.deleted=true;proxy.propertyId=null;}
    this.write('TemplateProxy cached and owned pointersNULL',source,()=>{proxy.cachedTemplate=null;proxy.propertyId=null;});
  }
  private readProxy(proxy:OriginalInteractionEntityProxy,input:NativeEntityByteInput):void {
    input.u16();const present=input.bool();this.note('EntityProxy version/present read','Engine:304c4410');
    if(!present){this.clearProxy(proxy,'Engine:304c4410');return;}
    const id=input.propertyID().slice(0,32)+'00000000';this.note('PropertyID raw16/trailing4 read then cacheDWORD0','SharedBase:10092a00');
    if(proxy.propertyID().slice(0,32)!==id.slice(0,32)){
      proxy.setPropertyId20(id);const internal=proxy.internal;if(internal!==null){this.effect('unequal-ID release AFTER embedded ID assignment','Engine:304c4410',()=>internal.releaseReference());proxy.internal=null;}
    }
    this.note('temporary PropertyID destructorzero20','SharedBase:10092ac0');
  }
  private readTemplate(proxy:OriginalInteractionTemplateProxy,input:NativeEntityByteInput):void {
    input.u16();const present=input.bool();this.note('TemplateProxy version/present read','Engine:304c7520');
    if(!present){this.note('TemplateProxy absent branch retains oldID/cache','Engine:304c7520');return;}
    const id=input.propertyID().slice(0,32)+'00000000';this.note('temporary PropertyID source read','SharedBase:10092a00');this.clearTemplate(proxy,'Engine:304c73d0');
    const allocation=new OriginalInteractionPropertyID(proxy.allocation.base.identity+':template-id:'+proxy.allocation.storage.revision);
    this.note('successful owned PropertyID20B allocation/tag147 then constructorzero20','Engine:304c73d0');
    this.write('TemplateProxy owned pointer assignment before ID copy','Engine:304c73d0',()=>{proxy.propertyId=allocation;proxy.allocation.storage.pointerUnknown(proxy.nativeOffset+8);});
    this.write('same owned ID copies16/cache0','SharedBase:10092970',()=>allocation.bytes.set(Uint8Array.from(id.match(/../g)!.map(byte=>parseInt(byte,16)))));
    this.note('temporary PropertyID destructorzero20','SharedBase:10092ac0');
  }
  notify(value:OriginalInteractionProperties,phase:'enter'|'exit',property:string,propagated:boolean):true {
    this.guard();value.exact();if(value.reader!==this||typeof property!=='string'||property.includes('\0')||(phase!=='enter'&&phase!=='exit')||typeof propagated!=='boolean')throw new Error('Actual Interaction Notify arguments required');
    value.base.owner.read()?.propertyOwner.modified();this.note('outer Notify current owner.Modified pureDWORD130 read','Engine:'+ (phase==='enter'?'30481b20':'30481b50'));
    this.note('SharedBase dispatches exact propertyName/propagated to virtual OnNotify','SharedBase:'+(phase==='enter'?'1004a3b0':'1004a3c0'));
    value.base.owner.read()?.propertyOwner.modified();this.note('inherited OnNotify reread current owner.Modified pureDWORD130','Engine:'+(phase==='enter'?'30481ac0':'30481af0'));
    this.note('SharedBase OnNotify literaltrue','SharedBase:'+(phase==='enter'?'1004a390':'1004a3a0'));return true;
  }
  private read(wrapper:NativeReflectionWrapper,input:NativeEntityByteInput):number {
    this.actual(wrapper);return this.controller.readWrapperProperties(wrapper,input,{wrapperSource:rules.sources.wrapperRead!,dataSource:rules.sources.dataRead!,
      readField:(field,stream)=>this.controller.value(()=>{
        this.guard();this.field(field);stream.u16();stream.u32();this.note('descriptor version/declared length no seek',field.reader);
        this.notify(this.actual(wrapper),'enter',field.name,true);const value=this.actual(wrapper);
        if(enumField(field)){
          if(value.nativeVtables.get(field.nativeOffset)!==parseInt(rules.containerVtables[field.name],16))throw new Error('Actual captured enum native Read virtual+10 required');
          stream.u16();this.write('same enum nativeRead scalarDWORD',field.reader,()=>value.storage.writeRaw(field.nativeOffset+4,stream.take(4)));
        }
        else if(field.typeName==='bCString'){
          const begin=stream.cursor(),slot=value.strings.get(field.name as InteractionString)!;
          this.effect('indexed CString actual ownership '+field.name,field.reader,()=>this.host.readCString(slot,stream));
          if(stream.cursor()!==begin+2)throw new Error('Selected indexed CString virtual read must consume2bytes');
          const index=new DataView(stream.bytes.buffer,stream.bytes.byteOffset,stream.bytes.byteLength).getUint16(begin,true),expected=stream.strings[index];
          if(typeof expected!=='string'||slot.text!==expected)throw new Error('Original indexed CString ownership result differs from source table');
        }
        else if(field.typeName==='bool')this.write('same bool physical read',field.reader,()=>value.storage.writeByte(field.nativeOffset,Number(stream.bool())));
        else if(field.typeName==='bCVector')this.write('Vector one raw12 virtual Read', 'SharedBase:10025af0',()=>value.storage.writeRaw(field.nativeOffset,stream.take(12)));
        else if(field.typeName==='eCEntityProxy')this.readProxy(value.proxies.get(field.nativeOffset)!,stream);
        else if(field.typeName==='eCTemplateEntityProxy')this.readTemplate(value.spell,stream);
        else throw new Error('Unexamined Interaction reader');
        this.notify(this.actual(wrapper),'exit',field.name,true); // Native re-fetches again after payload.
      }),readNative:stream=>this.controller.value(()=>{this.guard();const value=this.actual(wrapper);stream.u16();value.lastReadReturnByte=1;this.note('native Read ushort consumed/ignored thenreturn1','Game:20403fb0');})});
  }
  emptyCallback(value:OriginalInteractionProperties,operation:'postRead'|'process'|'preProcess'|'postProcess'):NativeValue<void> {
    return this.run(()=>{value.exact();if(value.reader!==this)throw new Error('Same Interaction receiver required');
      this.note('actual inherited '+operation+' literalRET','Engine:'+({postRead:'304818a0',process:'304818e0',preProcess:'304818f0',postProcess:'30481900'}[operation]));});
  }
  ownerCallback(value:OriginalInteractionProperties,operation:'added'|'removed'):NativeValue<void> {
    return this.run(()=>{value.exact();if(value.reader!==this)throw new Error('Same Interaction owner callback required');
      const source='Game:'+(operation==='added'?'20404900':'204048c0'),owner=value.base.owner.read();
      const template=owner===null?false:this.effect('captured owner RTTI template cast',source,()=>this.host.isTemplate?.(owner));
      if(!template){const admin=this.effect('actual NavigationAdmin getter',source,()=>this.host.navigationAdmin?.());
        this.effect('captured NavigationAdmin '+operation+' samePS',source,()=>operation==='added'?admin.registerInteraction(value.base):admin.deregisterInteraction(value.base));}
      this.note('inherited EntityPS '+operation+' literalRET','Engine:'+(operation==='added'?'30481930':'30481920'));});
  }
  processingRange(value:OriginalInteractionProperties,phase:'enter'|'exit'):NativeValue<void> {
    return this.run(()=>{value.exact();if(value.reader!==this)throw new Error('Same Interaction ROI callback required');const source='Game:'+(phase==='enter'?'20404730':'204047f0');
      if(phase==='enter'){const admin=this.effect('InteractionAdmin getter before ROI add',source,()=>this.host.roiAdmin?.());this.effect('captured InteractionAdmin Add samePS',source,()=>admin.addInteraction(value.base));}
      const owner=value.base.owner.read();
      if(owner!==null){const mode=this.effect('application RTTI getter/virtual270 AL',source,()=>this.host.applicationMode?.());if(!Number.isInteger(mode)||mode<0||mode>255)throw new Error('Original application AL byte required');
        if(mode===1){const admin=this.effect('ScriptAdmin getter after strict mode1',source,()=>this.host.scriptAdmin?.());if(admin!==null){const slot=value.strings.get(phase==='enter'?'EnterROIScript':'ExitROIScript')!;
          if(slot.isEmpty()){const literal=phase==='enter'?'OnEnterProcessingRange':'OnExitProcessingRange',temporary=this.effect('actual fallback name CString constructor',source,()=>this.host.constructScriptName?.(literal));
            if(temporary.pointer===null||temporary.pointer.freed||temporary.pointer.text!==literal)throw new Error('Actual live fallback CString required');
            this.effect('captured ScriptAdmin virtualbc same owner/NULL/0 ignoredresult',source,()=>admin.callScript(temporary,owner,null,0));this.effect('actual fallback name CString destructor BEFORE exitROI remove',source,()=>this.host.destroyScriptName?.(temporary));
          }else this.effect('captured ScriptAdmin virtualbc current CString/capturedowner',source,()=>admin.callScript(slot,owner,null,0));}
        }
      }
      if(phase==='exit'){const admin=this.effect('InteractionAdmin getter AFTER script/destructor',source,()=>this.host.roiAdmin?.());this.effect('captured InteractionAdmin Remove samePS',source,()=>admin.removeInteraction(value.base));}
    });
  }
}

export async function readOriginalHeroInteraction(reader:OriginalInteractionReader):Promise<NativeValue<{
  accessor:NativeReflectionAccessor;properties:OriginalInteractionProperties;input:NativeEntityByteInput;outerVersion:84;worldResident:false;
}>> {
  const document=await loadOriginalReflectionSerialized(),packet=originalReflectionPropertyInput(document,'PC_Hero',9);
  if(packet.outerVersion!==84||packet.source.nativeReadVersion!==84||packet.source.className!=='gCInteraction_PS'||packet.source.serializedSha256!==rules.sourceHero.packetSha256)return unknown('Original Hero Interaction packet differs');
  const accessor=reader.controller.readAccessor(packet.input);if(!accessor.known)return accessor;const wrapper=accessor.value.instance;if(!wrapper)return unknown('Original Interaction wrapperNULL');
  const properties=reader.properties(wrapper);if(!properties.known)return properties;
  return known({accessor:accessor.value,properties:properties.value,input:packet.input,outerVersion:84,worldResident:false});
}
