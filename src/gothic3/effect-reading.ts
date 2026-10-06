/** Original fresh gCEffect_PS factory/current Hero read and examined immediate
 * callbacks. Detached construction does not establish entity/world residency. */
import rulesText from '../../assets/gothic3/effect-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativePropertyCallbacks, NativePropertyObjectReference } from './entity-lifecycle';
import { loadOriginalReflectionSerialized, originalReflectionPropertyInput } from './entity-reflection';
import type { NativeReflectionWrapper, NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionAccessor } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';

const rules=JSON.parse(rulesText) as {schema:string;inputs:Record<string,string>;nativeBytes:number;getVersion:number;propertyType:number;
  nativeVtable:string;wrapperVtable:string;fields:readonly NativeReflectionField[];sourceHero:{index:number;packetSha256:string};sources:Record<string,string>};
if(rules.schema!=='gothic3-effect-reading-rules-v1'||rules.nativeBytes!==64||rules.getVersion!==1||rules.propertyType!==96||
  rules.nativeVtable!=='20666f8c'||rules.wrapperVtable!=='20666c84'||rules.fields.map(f=>f.nativeOffset).join(',')!=='20,24,36,40'||
  rules.sourceHero.index!==17||rules.sourceHero.packetSha256!=='364c745d009a1cbe64f7c021ea328677a37fe2750f82b74c6b55d557bb230c71'||
  rules.inputs.Game!=='b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'||
  rules.inputs.Engine!=='d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'||
  rules.inputs.SharedBase!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214')throw new Error('Original Effect receipt differs');
const known=<T>(value:T):NativeValue<T>=>({known:true,value});
const unknown=<T>(reason:string):NativeValue<T>=>({known:false,reason});
function fact<T>(value:NativeValue<T>,operation:string):T {if(!value.known)throw new Error(operation+': '+value.reason);return value.value;}
function u32(value:number):number {if(!Number.isInteger(value)||value<0||value>0xffffffff)throw new Error('Original DWORD required');return value;}

/** Known masks preserve uninitialized math/padding and unknown pointer bytes.
 * NonNULL addresses are capabilities; numerical addresses are never invented. */
export class NativeEffectBytes {
  readonly bytes=new Uint8Array(64);readonly knownMask=new Uint8Array(64);revision=0;
  private readonly view=new DataView(this.bytes.buffer);
  constructor(private readonly guard:()=>void) {}
  private range(at:number,length:number):void {if(!Number.isInteger(at)||!Number.isInteger(length)||at<0||length<0||at+length>64)throw new Error('Original Effect physical range differs');}
  has(at:number,length:number):boolean {this.range(at,length);return this.knownMask.subarray(at,at+length).every(mask=>mask===255);}
  uint(at:number):number {if(!this.has(at,4))throw new Error('Unknown Effect DWORD');return this.view.getUint32(at,true);}
  byte(at:number):number {if(!this.has(at,1))throw new Error('Unknown Effect byte');return this.bytes[at]!;}
  raw(at:number,length:number):Uint8Array {if(!this.has(at,length))throw new Error('Unknown Effect raw field');return this.bytes.slice(at,at+length);}
  float(at:number):number {if(!this.has(at,4))throw new Error('Unknown Effect float');return this.view.getFloat32(at,true);}
  writeRaw(at:number,data:Uint8Array,masks?:Uint8Array):void {this.guard();this.range(at,data.length);if(masks&&masks.length!==data.length)throw new Error('Original masks differ');this.bytes.set(data,at);if(masks)this.knownMask.set(masks,at);else this.knownMask.fill(255,at,at+data.length);this.revision++;this.guard();}
  writeUint(at:number,value:number):void {u32(value);const bytes=new Uint8Array(4);new DataView(bytes.buffer).setUint32(0,value,true);this.writeRaw(at,bytes);}
  writeByte(at:number,value:number):void {if(!Number.isInteger(value)||value<0||value>255)throw new Error('Original byte required');this.writeRaw(at,new Uint8Array([value]));}
  pointer(at:number,nonnull:boolean):void {this.writeRaw(at,new Uint8Array(4),nonnull?new Uint8Array(4):undefined);}
}
export interface NativeEffectCStringAllocation {
  readonly identity:object;readonly text:string;readonly length:number;referenceCount:number;freed:boolean;
}
/** Actual pointer slot, distinct from an allocated empty CString buffer. */
export class NativeEffectCStringSlot {
  private current:NativeEffectCStringAllocation|null|undefined;
  constructor(readonly allocation:OriginalEffectProperties) {}
  get pointer():NativeEffectCStringAllocation|null {
    if(this.current===undefined)throw new Error('Effect CString is not constructed');
    this.allocation.assertPointer(0x14,this.current!==null);if(this.current?.freed)throw new Error('Effect CString points to freed data');return this.current;
  }
  set pointer(value:NativeEffectCStringAllocation|null) {
    this.allocation.reader.guard();this.allocation.exact(false);
    if(value!==null&&(typeof value.identity!=='object'||value.identity===null||typeof value.text!=='string'||
      !Number.isInteger(value.length)||value.length<0||!Number.isInteger(value.referenceCount)||value.referenceCount<0||value.referenceCount>65535||value.freed))throw new Error('Actual live CString buffer/header required');
    this.current=value;this.allocation.storage.pointer(0x14,value!==null);this.allocation.reader.note('same CString physical pointer+14','SharedBase:10014640');
  }
  get text():string {return this.pointer?.text??'';}
  isEmpty():boolean {const data=this.pointer;return data===null||data.length===0;}
}
export interface NativeEffectBucketAllocation {
  readonly identity:object;readonly bytes:Uint8Array;readonly knownMask:Uint8Array;
}
export interface NativeEffectMemoryAdmin {
  /** Actual original Realloc(NULL,204) allocation capability. Returned bytes
   * are not presumed zero; the constructor subsequently performs memset. */
  realloc(old:NativeEffectBucketAllocation|null,bytes:204):NativeValue<NativeEffectBucketAllocation|null>;
}
export interface NativeEffectInstance {readonly identity:object}
export class NativeEffectMatrixTemporary {
  readonly identity={};readonly bytes=new Uint8Array(64);readonly knownMask=new Uint8Array(64);destroyed=false;
  raw(at:number,length:number):Uint8Array {if(this.destroyed||!Number.isInteger(at)||!Number.isInteger(length)||at<0||length<0||at+length>64||!this.knownMask.subarray(at,at+length).every(mask=>mask===255))throw new Error('Live original matrix temporary required');return this.bytes.slice(at,at+length);}
}
export interface NativeEffectSystem {
  readonly identity:object;
  /** Captured original vtable0, exact five stack operands. Result is written
   * into the same PS handle before the NULL-result warning branch. */
  createEffect(name:NativeEffectCStringSlot,owner:NativeLiveEntity|null,other:null,matrix:NativeEffectMatrixTemporary,flag:true):NativeValue<NativeEffectInstance|null>;
  /** Original vtable+4, return ignored, actual current handle may be NULL
   * after effect-module/system callbacks changed it. */
  stopEffect(instance:NativeEffectInstance|null,flag:false):NativeValue<unknown>;
}
export interface NativeEffectModule {
  readonly identity:object;
  /** Must read this module's actual live DWORD+14, not synthesize a system. */
  getSystem():NativeValue<NativeEffectSystem|null>;
}
export interface NativeEffectReadingHost {
  memoryAdmin():NativeValue<NativeEffectMemoryAdmin>;
  /** Indexed archive virtual CString Read including table buffer identity,
   * ushort reference counts and old destination ownership. Consumes2bytes. */
  readCString(slot:NativeEffectCStringSlot,input:NativeEntityByteInput):NativeValue<void>;
  freeCString?(data:NativeEffectCStringAllocation):NativeValue<void>;
  /** Real char*-assignment/Realloc(0) ownership for a nonNULL destination. */
  assignEmptyCString?(slot:NativeEffectCStringSlot):NativeValue<void>;
  /** Actual application/module-admin/RTTI cached GetInstance path. */
  effectModule?():NativeValue<NativeEffectModule|null>;
  /** Same SharedBase GetIdentity cache/CRT state used by other constructors. */
  matrixIdentity?():NativeValue<{raw(at:number,length:number):Uint8Array}>;
  warning?(format:'gCEffect_PS::CreateEffect -> Could not create effect: %s.',currentData:NativeEffectCStringAllocation|null):NativeValue<unknown>;
}
export interface OriginalEffectValues {
  readonly Effect:string;readonly Offset:readonly [number,number,number];readonly Probability:number;readonly Static:boolean;
}

export class OriginalEffectProperties {
  readonly storage:NativeEffectBytes;readonly values:OriginalEffectValues;readonly base:NativeLivePropertySet<OriginalEffectValues>;
  readonly effectName=new NativeEffectCStringSlot(this);readonly temporaries:NativeEffectMatrixTemporary[]=[];
  private owner:NativeLiveEntity|null=null;private main:NativeEffectInstance|null|undefined;private buckets:NativeEffectBucketAllocation|null|undefined;
  private currentVtable:number|null=null;lastReadReturnByte:1|null=null;
  constructor(readonly reflectionWrapper:NativeReflectionWrapper,readonly reader:OriginalEffectReader) {
    this.storage=new NativeEffectBytes(()=>{reader.guard();this.exact(false);});
    const current=this;
    this.values={get Effect(){current.exact();return current.effectName.text;},get Offset(){current.exact();const b=current.storage.raw(0x18,12),v=new DataView(b.buffer);return [v.getFloat32(0,true),v.getFloat32(4,true),v.getFloat32(8,true)] as const;},
      get Probability(){current.exact();return current.storage.float(0x24);},get Static(){current.exact();return current.storage.byte(0x28)!==0;}};
    const callbacks:NativePropertyCallbacks={added:set=>set===this.base?reader.emptyCallback(this,'added'):unknown('Same Effect added receiver required'),
      removed:set=>set===this.base?reader.emptyCallback(this,'removed'):unknown('Same Effect removed receiver required'),
      postRead:set=>set===this.base?reader.emptyCallback(this,'postRead'):unknown('Same Effect PostRead receiver required')};
    this.base=new NativeLivePropertySet(reflectionWrapper.identity+':native','gCEffect_PS',96,this.values,
      {read:()=>{this.assertPointer(0xc,this.owner!==null);return this.owner;},write:value=>{reader.guard();this.exact(false);this.owner=value;this.storage.pointer(0xc,value!==null);}},null,callbacks,
      ()=>reader.run(()=>{this.exact();return this.storage.byte(0x28)===0;}));
    let actualWrapper:NativePropertyObjectReference|null=null;
    Object.defineProperty(this.base,'wrapper',{configurable:false,get:()=>{this.assertPointer(4,actualWrapper!==null);return actualWrapper;},
      set:(value:NativePropertyObjectReference|null)=>{reader.guard();this.exact(false);if(value!==null&&value!==reflectionWrapper)throw new Error('Same Effect wrapper pointer required');actualWrapper=value;this.storage.pointer(4,value!==null);}});
  }
  assertPointer(at:number,nonnull:boolean):void {if(nonnull){if(this.storage.knownMask.subarray(at,at+4).some(mask=>mask!==0))throw new Error('Effect capability/raw pointer alias differs');}else if(this.storage.uint(at)!==0)throw new Error('Actual Effect NULL pointer required');}
  get nativeVtable():number|null {this.assertPointer(0,this.currentVtable!==null);return this.currentVtable;}
  set nativeVtable(value:number|null) {this.reader.guard();this.exact(false);if(value!==null)u32(value);this.currentVtable=value;this.storage.pointer(0,value!==null);this.reader.guard();}
  exact(attached=true):void {const wrapper=this.reflectionWrapper,allocation=wrapper.controller.allocations().find(a=>a.wrapper===wrapper);
    if(wrapper.deleted||wrapper.controller!==this.reader.controller||allocation?.propertySet!==this.base||this.base.values!==this.values||
      attached&&(wrapper.native!==this.base||this.base.wrapper!==wrapper||this.nativeVtable!==0x20666f8c))throw new Error('Exact retained Effect allocation required');}
  get handle():NativeEffectInstance|null {if(this.main===undefined)throw new Error('Effect handle not constructed');this.assertPointer(0x2c,this.main!==null);return this.main;}
  set handle(value:NativeEffectInstance|null) {this.reader.guard();this.exact(false);if(value!==null&&(typeof value.identity!=='object'||value.identity===null))throw new Error('Actual effect-instance capability required');this.main=value;this.storage.pointer(0x2c,value!==null);}
  get bucketAllocation():NativeEffectBucketAllocation|null {if(this.buckets===undefined)throw new Error('Effect map pointer not constructed');this.assertPointer(0x30,this.buckets!==null);return this.buckets;}
  set bucketAllocation(value:NativeEffectBucketAllocation|null) {this.reader.guard();this.exact(false);if(value!==null&&(typeof value.identity!=='object'||value.identity===null||value.bytes.length!==204||value.knownMask.length!==204))throw new Error('Actual204B Effect map allocation required');this.buckets=value;this.storage.pointer(0x30,value!==null);}
  get bucketCount():number {return this.storage.uint(0x34);}
  get bucketCapacity():number {return this.storage.uint(0x38);}
  get runtimeEffectCount():number {return this.storage.uint(0x3c);}
  bucketIsNull(index:number):boolean {if(!Number.isInteger(index)||index<0||index>=this.bucketCount)throw new Error('Original active bucket index required');const allocation=this.bucketAllocation;if(allocation===null)throw new Error('Native map has NULL backing allocation');const at=index*4;if(!allocation.knownMask.subarray(at,at+4).every(mask=>mask===255))throw new Error('Unknown native map node pointer');return new DataView(allocation.bytes.buffer,allocation.bytes.byteOffset,allocation.bytes.byteLength).getUint32(at,true)===0;}
  process():NativeValue<void> {return this.reader.callback(this,'process');}
  enterProcessingRange():NativeValue<void> {return this.reader.callback(this,'enterROI');}
  exitProcessingRange():NativeValue<void> {return this.reader.callback(this,'exitROI');}
  cacheOut():NativeValue<void> {return this.reader.callback(this,'cacheOut');}
  createEffect():NativeValue<void> {return this.reader.callback(this,'createEffect');}
  preProcess():NativeValue<void> {return this.reader.emptyCallback(this,'preProcess');}
  postProcess():NativeValue<void> {return this.reader.emptyCallback(this,'postProcess');}
  notify(phase:'enter'|'exit',property:string,propagated:boolean):NativeValue<true> {return this.reader.run(()=>this.reader.notify(this,phase,property,propagated));}
}

export class OriginalEffectReader {
  readonly factory:NativeReflectionFactory;private readonly retained=new WeakMap<NativeReflectionWrapper,OriginalEffectProperties>();
  private active=false;private nestedAttempt=false;
  constructor(readonly controller:NativeReflectionController,readonly host:NativeEffectReadingHost) {
    const root=Object.freeze({className:'gCEffect_PS',baseClassName:'eCEntityPropertySet',fields:Object.freeze(rules.fields.map(f=>Object.freeze({...f})))});
    this.factory={root,nativeCategory:'entity-property-set',cloneRoot:current=>current===controller?this.run(()=>this.construct()):unknown('Same Effect reflection controller required'),
      getVersion:wrapper=>controller.value(()=>{this.actual(wrapper);return 1;}),read:(wrapper,input)=>this.run(()=>this.read(wrapper,input))};
    fact(controller.registerFactory(this.factory),'Actual Effect factory registration');
  }
  guard():void {if(this.nestedAttempt)throw new Error('Reentrant Effect operation unsupported');const required=this.controller.receipt().required;if(required!==null)throw new Error(required);}
  run<T>(body:()=>T):NativeValue<T> {if(this.active){this.nestedAttempt=true;return this.controller.value(()=>{throw new Error('Reentrant Effect factory/read/callback unsupported');});}
    this.active=true;this.nestedAttempt=false;try{return this.controller.value(()=>{this.guard();const result=body();this.guard();return result;});}finally{this.active=false;}}
  note(operation:string,source:string):void {this.guard();this.controller.write(operation,source);this.guard();}
  private write(operation:string,source:string,body:()=>void):void {this.guard();body();this.note(operation,source);}
  private effect<T>(operation:string,source:string,body:()=>NativeValue<T>|undefined):T {this.guard();const result=this.controller.effect(operation,source,body);this.guard();return result;}
  properties(wrapper:NativeReflectionWrapper,attached=true):NativeValue<OriginalEffectProperties> {const value=this.retained.get(wrapper);if(!value)return unknown('Actual retained Effect wrapper required');try{value.exact(attached);return known(value);}catch(error){return unknown(String(error));}}
  retainedProperties(wrapper:NativeReflectionWrapper):NativeValue<OriginalEffectProperties> {return this.properties(wrapper,false);}
  private actual(wrapper:NativeReflectionWrapper):OriginalEffectProperties {return fact(this.properties(wrapper),'Actual Effect native receiver');}
  private construct():NativeReflectionWrapper {
    const wrapper=this.controller.allocateWrapper(this.factory,'Game:2011df70'),value=new OriginalEffectProperties(wrapper,this);
    this.retained.set(wrapper,value);this.controller.retainNative(wrapper,value.base);
    Object.defineProperty(value.base,'referenceWord',{configurable:false,get:()=>value.storage.uint(8),set:(word:number)=>{this.guard();value.exact(false);value.storage.writeUint(8,u32(word));}});
    Object.defineProperties(value.base.baseFlags,{
      value:{configurable:false,get:()=>value.storage.bytes[0x10]!,set:(word:number)=>{this.guard();value.exact(false);if(u32(word)>255)throw new Error('Physical Effect flag byte required');value.storage.writeRaw(0x10,new Uint8Array([word]),new Uint8Array([value.storage.knownMask[0x10]!]));}},
      knownMask:{configurable:false,get:()=>value.storage.knownMask[0x10]!,set:(word:number)=>{this.guard();value.exact(false);if(u32(word)>255)throw new Error('Physical Effect flag mask required');value.storage.writeRaw(0x10,new Uint8Array([value.storage.bytes[0x10]!]),new Uint8Array([word]));}}});
    this.write('ObjectBase constructor vtable capability','SharedBase:1004a1c2',()=>{value.nativeVtable=0x100e7e1c;value.storage.pointer(0,true);});
    value.base.wrapper=null;this.write('RefBase constructor vtable capability','SharedBase:1004a5ba',()=>value.nativeVtable=0x100e7eac);value.base.referenceWord=1;
    this.write('EntityPS flags ANDf1 OR1 lower4known','Engine:30481a70',()=>value.storage.writeRaw(0x10,new Uint8Array([1]),new Uint8Array([15])));
    this.write('EntityPS constructor vtable capability','Engine:30481a73',()=>value.nativeVtable=0x30875d8c);value.base.owner.write(null);
    this.write('Effect leaf native vtable','Game:2011899c',()=>value.nativeVtable=0x20666f8c);value.effectName.pointer=null;
    this.note('Vector constructor empty: same12B remainunknown','SharedBase:10002833');this.constructMap(value);value.handle=null;
    if(!value.base.isValid()){value.base.createBase();this.note('Create strict virtual IsValid/base Create branch','Game:201183e0');}
    this.controller.setAllocationPhase(wrapper,'created');this.controller.attachConstructedNative(wrapper,value.base,rules.sources.attach!,rules.sources.initialize!);
    this.controller.initializeProperties(wrapper,field=>this.controller.value(()=>{
      this.guard();if(!this.factory.root.fields.includes(field))throw new Error('Same Effect descriptor required');const current=this.actual(wrapper);
      if(field.typeName==='bCString')this.clearString(current.effectName);
      else if(field.typeName==='bCVector')this.write('descriptor Vector.Clear zero12',field.defaultInitializer!,()=>current.storage.writeRaw(field.nativeOffset,new Uint8Array(12)));
      else if(field.typeName==='float')this.write('descriptor float default0 raw4',field.defaultInitializer!,()=>current.storage.writeUint(field.nativeOffset,0));
      else if(field.typeName==='bool')this.write('descriptor bool default0',field.defaultInitializer!,()=>current.storage.writeByte(field.nativeOffset,0));
      else throw new Error('Unexamined Effect descriptor default');
    }),()=>this.controller.value(()=>{
      this.guard();const current=this.actual(wrapper);this.note('PostInitialize inherited RefBase literalreturn1','SharedBase:1004a4d0');this.assignEmpty(current.effectName,'Game:20118416');
      current.handle=null;this.write('PostInitialize Static0','Game:20118429',()=>current.storage.writeByte(0x28,0));
      this.write('PostInitialize Probability actual readonly f32one','Game:2011842c',()=>current.storage.writeRaw(0x24,new Uint8Array([0,0,128,63])));
    }),'Game:20118400');return wrapper;
  }
  private constructMap(value:OriginalEffectProperties):void {
    value.bucketAllocation=null;for(const at of [0x34,0x38,0x3c])value.storage.writeUint(at,0);this.note('map constructor header pointer/count/capacity/entries0','Game:2011d360');
    const captured=value.bucketAllocation,oldCapacity=value.bucketCapacity;
    const admin=this.effect('actual MemoryAdmin.GetInstance','Game:20119dfb',()=>this.host.memoryAdmin());value.exact(false);
    const allocation=this.effect('actual map Realloc(NULL,204) capacity43+8','Game:20119e03',()=>admin.realloc(captured,204));value.exact(false);
    // Source rereads current count after Realloc; this implementation supports
    // only the proved fresh/stable-header growth branch, without replay.
    const currentCount=value.bucketCount;value.bucketAllocation=allocation;
    if(allocation===null)throw new Error('Native NULL Realloc pointer stored; following memset(NULL,204) unsupported');
    if(oldCapacity!==0||currentCount!==0||value.bucketCapacity!==0||value.runtimeEffectCount!==0)throw new Error('Changed live map header before original memset branch unsupported');
    this.write('actual memset204 from newpointer/currentcount0','Game:20119e1d',()=>{allocation.bytes.fill(0);allocation.knownMask.fill(255);});
    this.write('map capacity51 AFTER memset','Game:20119e25',()=>value.storage.writeUint(0x38,51));
    this.write('map bucketcount43','Game:2011d387',()=>value.storage.writeUint(0x34,43));
    this.write('constructor explicitly zeroes43 bucket heads again','Game:2011d392',()=>{allocation.bytes.fill(0,0,172);allocation.knownMask.fill(255,0,172);});
  }
  private clearString(slot:NativeEffectCStringSlot):void {
    const data=slot.pointer;if(data===null||data.length===0){this.note('CString.Clear actual NULL/length0 unchanged','SharedBase:100149b0');return;}
    this.write('actual captured CString ushort reference decrement','SharedBase:100149b0',()=>{data.referenceCount=(data.referenceCount-1)&65535;});
    if(data.referenceCount===0){this.effect('actual CString Free before pointerNULL','SharedBase:100149b0',()=>this.host.freeCString?.(data));data.freed=true;}
    slot.pointer=null;
  }
  private assignEmpty(slot:NativeEffectCStringSlot,source:string):void {
    if(slot.pointer===null){slot.pointer=null;this.note('char*-literal empty strlen0/Realloc0 actual NULL branch','SharedBase:10013e70');return;}
    this.effect('char*-literal empty actual CString Realloc0 ownership',source,()=>this.host.assignEmptyCString?.(slot));slot.allocation.exact();if(!slot.isEmpty())throw new Error('Original empty CString assignment postcondition differs');
  }
  notify(value:OriginalEffectProperties,phase:'enter'|'exit',property:string,propagated:boolean):true {
    this.guard();value.exact();if(value.reader!==this||typeof property!=='string'||property.includes('\0')||(phase!=='enter'&&phase!=='exit')||typeof propagated!=='boolean')throw new Error('Actual Effect Notify arguments required');
    value.base.owner.read()?.propertyOwner.modified();this.note('outer Notify owner.Modified pureDWORD130 read','Engine:'+(phase==='enter'?'30481b20':'30481b50'));
    this.note('SharedBase dispatch actual propertyName/propagated to virtual OnNotify','SharedBase:'+(phase==='enter'?'1004a3b0':'1004a3c0'));
    value.base.owner.read()?.propertyOwner.modified();this.note('inherited OnNotify current owner.Modified reread','Engine:'+(phase==='enter'?'30481ac0':'30481af0'));
    this.note('SharedBase OnNotify literaltrue','SharedBase:'+(phase==='enter'?'1004a390':'1004a3a0'));return true;
  }
  private read(wrapper:NativeReflectionWrapper,input:NativeEntityByteInput):number {
    this.actual(wrapper);return this.controller.readWrapperProperties(wrapper,input,{wrapperSource:rules.sources.wrapperRead!,dataSource:rules.sources.dataRead!,
      readField:(field,stream)=>this.controller.value(()=>{
        this.guard();if(!this.factory.root.fields.includes(field))throw new Error('Same Effect descriptor required');stream.u16();stream.u32();this.note('descriptor version/declared length consumed, no seek',field.reader);
        this.notify(this.actual(wrapper),'enter',field.name,true);const value=this.actual(wrapper);
        if(field.typeName==='bCString'){
          const begin=stream.cursor();this.effect('actual indexed CString ownership into SAME slot',field.reader,()=>this.host.readCString(value.effectName,stream));value.exact();
          if(stream.cursor()!==begin+2)throw new Error('Original indexed CString read must consume2bytes');const index=new DataView(stream.bytes.buffer,stream.bytes.byteOffset,stream.bytes.byteLength).getUint16(begin,true);
          if(typeof stream.strings[index]!=='string'||value.effectName.text!==stream.strings[index])throw new Error('Actual CString/table result differs');
        }else if(field.typeName==='bCVector')this.write('Vector ONE raw12 virtual Read','SharedBase:10025af0',()=>value.storage.writeRaw(field.nativeOffset,stream.take(12)));
        else if(field.typeName==='float')this.write('float ONE raw4 virtual Read',field.reader,()=>value.storage.writeRaw(field.nativeOffset,stream.take(4)));
        else if(field.typeName==='bool')this.write('canonical bool physical byte read',field.reader,()=>value.storage.writeByte(field.nativeOffset,Number(stream.bool())));
        else throw new Error('Unexamined Effect descriptor read');
        this.notify(this.actual(wrapper),'exit',field.name,true);
      }),readNative:stream=>this.controller.value(()=>{this.guard();const value=this.actual(wrapper);stream.u16();value.lastReadReturnByte=1;this.note('native Read ignores consumedushort thenreturn1','Game:20118460');})});
  }
  emptyCallback(value:OriginalEffectProperties,operation:'added'|'removed'|'postRead'|'preProcess'|'postProcess'):NativeValue<void> {
    return this.run(()=>{value.exact();if(value.reader!==this)throw new Error('Same Effect callback receiver required');this.note('actual inherited '+operation+' literalRET','Engine:'+({added:'30481830',removed:'30481840',postRead:'304818a0',preProcess:'304818f0',postProcess:'30481900'}[operation]));});
  }
  callback(value:OriginalEffectProperties,operation:'process'|'enterROI'|'exitROI'|'cacheOut'|'createEffect'):NativeValue<void> {
    return this.run(()=>{value.exact();if(value.reader!==this)throw new Error('Same Effect callback receiver required');
      if(operation==='process'){if(value.storage.byte(0x28)===0)this.create(value);this.note('OnProcess strict Static0 gate','Game:201186d0');}
      else if(operation==='enterROI'){if(value.storage.byte(0x28)===1)this.create(value);this.note('EnterROI strict Static1 gate','Game:201186e0');}
      else if(operation==='createEffect')this.create(value);
      else if(operation==='cacheOut'||value.storage.byte(0x28)===1)this.stop(value,operation==='cacheOut'?'Game:20118730':'Game:201186f0');
    });
  }
  private system(value:OriginalEffectProperties,source:string):NativeEffectSystem|null {
    const module=this.effect('actual effect-module cached GetInstance',source,()=>this.host.effectModule?.());value.exact();
    if(module===null)throw new Error('Original NULL module GetSystem+14 dereference unsupported');
    const system=this.effect('actual captured module GetSystem reads live+14','Game:201153f0',()=>module.getSystem());value.exact();return system;
  }
  private create(value:OriginalEffectProperties):void {
    if(value.handle!==null){this.note('CreateEffect existing handle skips','Game:20118576');return;}
    const flags=value.storage.bytes[0x10]!,mask=value.storage.knownMask[0x10]!;
    if((flags&mask&14)!==0){this.note('CreateEffect known disabled/template flags skip','Game:20118580');return;}
    if((mask&14)!==14)throw new Error('Original CreateEffect flag bits1..3 unknown');
    if(value.effectName.isEmpty()){this.note('CreateEffect actual CString.IsEmpty skips','Game:20118590');return;}
    const system=this.system(value,'Game:2011859f');if(system===null){this.note('CreateEffect NULL system skips','Game:201185ad');return;}
    const identity=this.effect('actual SharedBase Matrix.GetIdentity global/CRT capability','SharedBase:100033f5',()=>this.host.matrixIdentity?.());value.exact();
    const raw=identity.raw(0,64);this.guard();value.exact();if(raw.length!==64)throw new Error('Actual64B shared identity matrix required');
    const temporary=new NativeEffectMatrixTemporary();value.temporaries.push(temporary);
    this.write('actual stack matrix copy64','SharedBase:10001703',()=>{temporary.bytes.set(raw);temporary.knownMask.fill(255);});
    this.write('AccessTranslation+30 then raw Offset vector copy12','SharedBase:10007cf2',()=>temporary.bytes.set(value.storage.raw(0x18,12),0x30));
    const create=system.createEffect,owner=value.base.owner.read();this.note('captured system virtual0 and GetEntity+68 zero operands','Game:201185eb');
    const result=this.effect('captured system create five operands', 'Game:201185f3',()=>create.call(system,value.effectName,owner,null,temporary,true));value.exact();
    this.write('Create result stored SAME handle BEFORE warning','Game:201185f7',()=>{value.handle=result;});
    if(result===null){const currentData=value.effectName.pointer;this.effect('native warning uses current CString data pointer','Game:20118606',()=>this.host.warning?.('gCEffect_PS::CreateEffect -> Could not create effect: %s.',currentData));value.exact();this.assignEmpty(value.effectName,'Game:20118616');}
    this.write('actual matrix destructor literalRET then lifetime ends','SharedBase:10002c25',()=>{temporary.destroyed=true;});
  }
  private stop(value:OriginalEffectProperties,source:string):void {
    if(value.handle===null){this.note('NULL main effect skips stop',source);return;}
    const system=this.system(value,source);if(system===null){this.note('NULL system retains existing handle',source);return;}
    const current=value.handle,stop=system.stopEffect;this.effect('captured system virtual4 current handle/false ignoredreturn',source,()=>stop.call(system,current,false));value.exact();
    this.write('handleNULL AFTER stop returns',source,()=>{value.handle=null;});
  }
}

export async function readOriginalHeroEffect(reader:OriginalEffectReader):Promise<NativeValue<{
  accessor:NativeReflectionAccessor;properties:OriginalEffectProperties;input:NativeEntityByteInput;outerVersion:1;worldResident:false;
}>> {
  const document=await loadOriginalReflectionSerialized(),packet=originalReflectionPropertyInput(document,'PC_Hero',17);
  if(packet.outerVersion!==1||packet.source.nativeReadVersion!==1||packet.source.className!=='gCEffect_PS'||packet.source.serializedSha256!==rules.sourceHero.packetSha256)return unknown('Original Hero Effect packet differs');
  const accessor=reader.controller.readAccessor(packet.input);if(!accessor.known)return accessor;const wrapper=accessor.value.instance;if(!wrapper)return unknown('Original Effect wrapperNULL');
  const properties=reader.properties(wrapper);if(!properties.known)return properties;return known({accessor:accessor.value,properties:properties.value,input:packet.input,outerVersion:1,worldResident:false});
}
