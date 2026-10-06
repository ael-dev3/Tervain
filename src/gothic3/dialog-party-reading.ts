/** Original Dialog/Party construction and reading on retained physical stores.
 * This successful fresh-allocation/current-Hero profile is detached from world
 * residency. Native heap addresses remain masked; PE addresses identify source
 * dispatch only. Nonempty proxy-list allocation/destruction requires the actual
 * original memory services rather than an invented JavaScript array substitute.
 */
import rulesText from '../../assets/gothic3/dialog-party-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativeMaskedWord, NativePropertyCallbacks, NativePropertyObjectReference } from './entity-lifecycle';
import { loadOriginalReflectionSerialized, originalReflectionPropertyInput } from './entity-reflection';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionWrapper, NativeReflectionAccessor } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';

export type OriginalDialogPartyClass = 'gCDialog_PS' | 'gCParty_PS';
export type OriginalDialogPartyEnum = 'TradeCategory' | 'PartyMemberType';
interface ClassRules {
  packetIndex: number; packetBytes: number; constructor: string; nativeBytes: number; propertyType: number;
  nativeVtable: string; wrapperVtable: string; containerVtable: string; enumGlobal: string; enumName: OriginalDialogPartyEnum;
  proxyOffset: number; listOffset: number; fields: NativeReflectionField[];
  heroSerialized: { serializedSha256: string; nativeReadVersion: number; className: string };
}
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string,string>; classes: Record<OriginalDialogPartyClass,ClassRules> };
if (rules.schema !== 'gothic3-dialog-party-reading-rules-v1' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
    rules.classes.gCDialog_PS.propertyType !== 68 || rules.classes.gCDialog_PS.nativeBytes !== 88 ||
    rules.classes.gCDialog_PS.nativeVtable !== '206861cc' || rules.classes.gCDialog_PS.wrapperVtable !== '20685f54' ||
    rules.classes.gCDialog_PS.fields.length !== 9 || rules.classes.gCDialog_PS.packetIndex !== 14 ||
    rules.classes.gCParty_PS.propertyType !== 77 || rules.classes.gCParty_PS.nativeBytes !== 72 ||
    rules.classes.gCParty_PS.nativeVtable !== '20697834' || rules.classes.gCParty_PS.wrapperVtable !== '206975bc' ||
    rules.classes.gCParty_PS.fields.length !== 3 || rules.classes.gCParty_PS.packetIndex !== 16) {
  throw new Error('Original Dialog/Party reading source receipt differs');
}
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(value: NativeValue<T>, label: string): T { if (!value.known) throw new Error(label+': '+value.reason); return value.value; }
function u32(value: number): number { if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Original uint32 required'); return value; }
function propertyID(value: string): string { if (!/^[0-9a-f]{40}$/.test(value)) throw new Error('Original PropertyID20 bytes required'); return value; }
function hex(data: Uint8Array): string { return Array.from(data, byte=>byte.toString(16).padStart(2,'0')).join(''); }
function unhex(value: string): Uint8Array { propertyID(value); return new Uint8Array(value.match(/../g)!.map(byte=>parseInt(byte,16))); }
const INTERNAL = Symbol('original Dialog/Party reader operation');

export interface OriginalDialogValues {
  TalkedToPlayer: boolean; EndDialogTimestamp: number; TradeEnabled: boolean; TradeCategory: number;
  TeachEnabled: boolean; PartyEnabled: boolean; MobEnabled: boolean; SlaveryEnabled: boolean; PickedPocket: boolean;
}
export interface OriginalPartyValues {
  readonly PartyLeaderEntity: NativeDialogPartyProxy; PartyMemberType: number; Waiting: boolean;
}
/** Actual cached eCEntityProxyInternal, including the original Add/Release
 * reference effects and final destruction. An unknown callback can be partial. */
export interface NativeDialogPartyProxyReference {
  readonly identity: object;
  addReference(): NativeValue<void>;
  releaseReference(): NativeValue<void>;
  getEntity?(): NativeValue<NativeLiveEntity | null>;
}
export interface NativeDialogPartyReadingHost {
  /** Current mutable module global. PE initial bytes are not a live value. */
  enumDefault(name: OriginalDialogPartyEnum, originalGlobalVA: string): NativeValue<NativeMaskedWord>;
  /** Exact QueryEntityProxyInternal call; returns an already referenced actual
   * internal capability, never a catalog or rendered-object lookup. */
  queryEntityProxyInternal?(entity: NativeLiveEntity): NativeValue<NativeDialogPartyProxyReference | null>;
  /** Original virtual ResolveEntity/SceneAdmin lookup, only reached for a
   * valid ID after the captured cached-reference getter returnedNULL. */
  resolveEntity?(proxy: NativeDialogPartyProxy): NativeValue<NativeLiveEntity | null>;
}

/** Bit masks describe initialized physical derived bytes. Base ref/wrapper and
 * owner fields are the sole NativeLivePropertySet capabilities, not copies. */
export class NativeDialogPartyBytes {
  private readonly data: Uint8Array;
  private readonly masks: Uint8Array;
  private readonly view: DataView;
  constructor(private readonly allocation: OriginalDialogPartyProperties, size: number) {
    this.data=new Uint8Array(size);this.masks=new Uint8Array(size);this.view=new DataView(this.data.buffer);
  }
  private range(at: number,length: number): void {
    if (!Number.isInteger(at)||!Number.isInteger(length)||at<0x14||length<0||at+length>this.data.length) throw new Error('Original derived byte range differs');
  }
  private need(at: number,length: number): void {
    this.range(at,length);if(this.masks.subarray(at,at+length).some(mask=>mask!==255))throw new Error('Unknown original physical bytes+'+at.toString(16));
  }
  snapshot(): { bytes: Uint8Array; knownMask: Uint8Array } { return {bytes:this.data.slice(),knownMask:this.masks.slice()}; }
  raw(at: number,length: number): Uint8Array {this.need(at,length);return this.data.slice(at,at+length);}
  byte(at: number): number {this.need(at,1);return this.view.getUint8(at);}
  int(at: number): number {this.need(at,4);return this.view.getInt32(at,true);}
  word(at: number): NativeMaskedWord {this.range(at,4);return {value:this.view.getUint32(at,true),knownMask:new DataView(this.masks.buffer).getUint32(at,true)};}
  float(at: number): number {this.need(at,4);return this.view.getFloat32(at,true);}
  write(at: number,data: Uint8Array,masks?: Uint8Array): void {
    this.allocation.reader.guard();this.allocation.exact(false);this.range(at,data.length);
    if(masks&&masks.length!==data.length)throw new Error('Original mask length differs');
    this.data.set(data,at);if(masks)this.masks.set(masks,at);else this.masks.fill(255,at,at+data.length);this.allocation.reader.guard();
  }
  writeByte(at: number,value: number): void {
    if(!Number.isInteger(value)||value<0||value>255)throw new Error('Original byte required');this.write(at,new Uint8Array([value]));
  }
  writeWord(at: number,value: number,mask=0xffffffff): void {
    u32(value);u32(mask);const data=new Uint8Array(4),masks=new Uint8Array(4);
    new DataView(data.buffer).setUint32(0,value,true);new DataView(masks.buffer).setUint32(0,mask,true);this.write(at,data,masks);
  }
  writeFloat(at: number,value: number): void {
    if(!Number.isFinite(value)||!Object.is(value,Math.fround(value)))throw new Error('Stored finite float32 required');
    const data=new Uint8Array(4);new DataView(data.buffer).setFloat32(0,value,true);this.write(at,data);
  }
  unknownPointer(at: number): void {this.allocation.reader.guard();this.allocation.exact(false);this.range(at,4);this.masks.fill(0,at,at+4);this.allocation.reader.guard();}
}

/** Stable embedded proxy facade; ID bytes live solely in the allocation store.
 * Its cached reference is a real capability, with numeric heap bits masked. */
export class NativeDialogPartyProxy {
  private cached: NativeDialogPartyProxyReference | null | undefined;
  constructor(readonly allocation: OriginalDialogPartyProperties, readonly nativeOffset: number) {}
  private exact(): void {this.allocation.reader.guard();this.allocation.exact(false);if(this.allocation.proxy!==this)throw new Error('Same embedded proxy required');}
  get internal(): NativeDialogPartyProxyReference | null {
    this.exact();if(this.cached===undefined)throw new Error('Original proxy has not been constructed');return this.cached;
  }
  propertyID(): string {this.exact();return hex(this.allocation.storage.raw(this.nativeOffset+8,20));}
  private pointer(value: NativeDialogPartyProxyReference | null): void {
    this.exact();if(value!==null&&(typeof value.identity!=='object'||value.identity===null))throw new Error('Actual proxy reference capability required');
    this.cached=value;if(value===null)this.allocation.storage.writeWord(this.nativeOffset+4,0);else this.allocation.storage.unknownPointer(this.nativeOffset+4);
  }
  private copyID(value: string): void {this.allocation.storage.write(this.nativeOffset+8,unhex(propertyID(value).slice(0,32)+'00000000'));}
  construct(token: symbol): void {
    this.exact();if(token!==INTERNAL||this.cached!==undefined)throw new Error('Fresh original embedded proxy constructor required');
    this.allocation.nativeVtables.set(this.nativeOffset,'Engine:3087bff4');this.allocation.storage.write(this.nativeOffset+8,new Uint8Array(20));
    this.allocation.reader.note('PropertyID constructor Destroy all20bytes','Engine:304c45a0');
    this.pointer(null);this.allocation.reader.note('proxy internal=NULL','Engine:304c45b7');
    this.allocation.storage.write(this.nativeOffset+8,new Uint8Array(20));this.allocation.reader.note('PropertyID Destroy all20bytes','Engine:304c45be');
  }
  private release(source: string): void {
    const old=this.internal;if(old!==null){this.allocation.reader.effect('captured proxy internal.ReleaseReference',source,()=>old.releaseReference());this.pointer(null);this.allocation.reader.note('proxy internal clear after release',source);}
  }
  /** Native Read ignores its version and reads one bool. Present IDs compare
   * only16bytes; absent branch always clears all20 ID bytes after release. */
  read(token: symbol,input: NativeEntityByteInput): void {
    this.exact();if(token!==INTERNAL)throw new Error('Internal source reader permission required');
    input.u16();const present=input.bool();this.allocation.reader.note('proxy native version/bool read','Engine:304c4410');
    if(present){
      const temporary=new Uint8Array(20);temporary.set(input.take(16));input.take(4); // Stream operator consumes cached DWORD then clears it.
      this.allocation.reader.note('temporary PropertyID16+discard4/cache0','SharedBase:10003a71');
      const id=hex(temporary);
      if(id.slice(0,32)!==this.propertyID().slice(0,32)){
        this.copyID(id);this.allocation.reader.note('differentID copy16/cache0 before release','Engine:304c4410');this.release('Engine:304c4410');
      }
      this.allocation.reader.note('temporary PropertyID destructor literal RET','SharedBase:bCPropertyID::~bCPropertyID');
    }else{
      this.release('Engine:304c4410');this.pointer(null);this.allocation.reader.note('proxy absent unconditional internalNULL','Engine:304c4410');
      this.allocation.storage.write(this.nativeOffset+8,new Uint8Array(20));this.allocation.reader.note('proxy absent ID.Destroy20','Engine:304c4410');
    }
  }
  /** Concrete proxy assignment, including source reference capture/re-read.
   * It deliberately has no self-assignment shortcut absent from304c4290. */
  assign(source: NativeDialogPartyProxy): NativeValue<1> {return this.allocation.reader.run(()=>{this.assignInside(INTERNAL,source);return 1;});}
  assignInside(token: symbol,source: NativeDialogPartyProxy): void {
    this.exact();if(token!==INTERNAL)throw new Error('Internal source assignment permission required');
    const incoming=source.internal;if(incoming!==null)this.allocation.reader.effect('captured source proxy internal.AddReference','Engine:304c4290',()=>incoming.addReference());
    this.release('Engine:304c4290');this.copyID(source.propertyID());this.allocation.reader.note('proxy assignment current sourceID16/cache0','Engine:304c4290');
    this.pointer(source.internal);this.allocation.reader.note('proxy assignment current source internal','Engine:304c4290');
  }
  resetFromNullTemporary(token: symbol): void {
    this.exact();if(token!==INTERNAL)throw new Error('Internal NULL temporary assignment permission required');
    // Original temporary Entity*-NULL ctor performs PropertyID ctor/Destroy,
    // SetEntity(NULL), then assignment; none resolve an engine singleton.
    this.allocation.reader.note('temporary NULL proxy ctor and SetEntity(NULL)','Engine:304c45d0');
    this.release('Engine:304c4290');this.copyID('0'.repeat(40));this.allocation.reader.note('copy temporaryID16/cache0','Engine:304c4290');
    this.pointer(null);this.allocation.reader.note('assign temporary internalNULL','Engine:304c4290');
    this.allocation.reader.note('temporary proxy destructor/PropertyID Destroy','Engine:304c4680');
  }
  setEntity(entity: NativeLiveEntity | null): NativeValue<void> {return this.allocation.reader.run(()=>this.setEntityInside(entity));}
  private setEntityInside(entity: NativeLiveEntity | null): void {
    this.exact();if(entity===null){this.release('Engine:304c43a0');this.pointer(null);this.allocation.reader.note('NULL Entity* internal clear','Engine:304c43a0');
      this.allocation.storage.write(this.nativeOffset+8,new Uint8Array(20));this.allocation.reader.note('NULL Entity* ID.Destroy20','Engine:304c43a0');return;}
    this.copyID(entity.propertyId20);this.allocation.reader.note('Entity* current Node.ID16 copy/cache0','Engine:304c43a0');this.release('Engine:304c43a0');
    const host=this.allocation.reader.host.queryEntityProxyInternal;
    const result=this.allocation.reader.effect<NativeDialogPartyProxyReference|null>('actual current entity.QueryEntityProxyInternal','Engine:304c43f6',()=>host?host.call(this.allocation.reader.host,entity):unknown('Original entity.QueryEntityProxyInternal service required'));
    this.pointer(result);this.allocation.reader.note('store captured QueryEntityProxyInternal result','Engine:304c43fb');
  }
  entity(): NativeValue<NativeLiveEntity | null> {return this.allocation.reader.run(()=>{
    this.exact();const cached=this.internal;
    if(cached!==null){
      const entity=this.allocation.reader.effect<NativeLiveEntity|null>('captured cached proxyInternal.GetEntity','Engine:3005db90',()=>cached.getEntity?cached.getEntity():unknown('Original cached proxyInternal.GetEntity required'));
      if(entity!==null)return entity;
    }
    if(this.propertyID().slice(0,32)==='0'.repeat(32)){this.allocation.reader.note('invalidID GetEntity returnsNULL','Engine:3005db90');return null;}
    const host=this.allocation.reader.host.resolveEntity;
    const entity=this.allocation.reader.effect<NativeLiveEntity|null>('actual virtual ResolveEntity/SceneAdmin lookup','Engine:3005db90',()=>host?host.call(this.allocation.reader.host,this):unknown('Original proxy ResolveEntity/SceneAdmin service required'));
    if(entity!==null)this.setEntityInside(entity);
    return entity;
  });}
}

/** Actual fresh NULL-buffer/count0/capacity0 list. Nonzero reserve cannot be
 * replaced by allocating arbitrary JS proxies: native allocator, construction
 * and relocation services remain required at their original call boundary. */
export class NativeDialogPartyProxyList {
  constructor(readonly allocation: OriginalDialogPartyProperties, readonly nativeOffset: number) {}
  get count(): number {return this.allocation.storage.int(this.nativeOffset+4);}
  get capacity(): number {return this.allocation.storage.int(this.nativeOffset+8);}
  construct(token: symbol): void {
    this.allocation.reader.guard();this.allocation.exact(false);
    if(token!==INTERNAL)throw new Error('Internal source list constructor required');
    for(let at=0;at<12;at+=4){this.allocation.storage.writeWord(this.nativeOffset+at,0);this.allocation.reader.note('fresh list store+'+(this.nativeOffset+at).toString(16)+'=0','Game:'+rules.classes[this.allocation.className].constructor);}
  }
  clearInside(token: symbol): void {
    this.allocation.reader.guard();this.allocation.exact();if(token!==INTERNAL)throw new Error('Internal source list clear required');
    this.allocation.reader.note('list Reserve(0,-1) returns before allocation','Game:200799b0');
    if(this.count>0)this.allocation.reader.effect('original live-element destruction and reconstruction','Game:2020baf6',()=>unknown('Nonempty Dialog list destructor/buffer constructor services required'));
    this.allocation.storage.writeWord(this.nativeOffset+4,0);this.allocation.reader.note('Dialog TalkedToBy count0','Game:2020bb0d');
  }
  readInside(token: symbol,input: NativeEntityByteInput): void {
    this.allocation.reader.guard();this.allocation.exact();if(token!==INTERNAL)throw new Error('Internal source list reader required');
    input.u8();const requested=input.u32();this.allocation.reader.note('native proxy-list prefixu8/countu32','Game:2007a810');
    if(requested!==0&&this.capacity<(requested|0))this.allocation.reader.effect('original MemoryAdmin.GetInstance/Realloc','Game:2007a863',()=>unknown('Nonempty native proxy-list reserve/construct services required'));
    if((requested|0)<this.count)this.allocation.reader.effect('original truncated tail destruction/reconstruction','Game:2007a810',()=>unknown('Nonempty proxy-list tail lifetime services required'));
    this.allocation.storage.writeWord(this.nativeOffset+4,requested);this.allocation.reader.note('original list count assignment','Game:2007a810');
    if((requested|0)>0)this.allocation.reader.effect('native per-element actual proxy read','Game:2007a810',()=>unknown('Original allocated proxy elements required'));
  }
}

export class OriginalDialogPartyProperties {
  readonly storage: NativeDialogPartyBytes;
  readonly values: OriginalDialogValues | OriginalPartyValues;
  readonly base: NativeLivePropertySet<OriginalDialogValues | OriginalPartyValues>;
  readonly proxy: NativeDialogPartyProxy;
  readonly members: NativeDialogPartyProxyList;
  readonly nativeVtables=new Map<number,string>();
  private owner: NativeLiveEntity|null=null;
  private referenceWord=1;
  private baseFlagValue=1;
  private baseFlagMask=15;
  private propertyObject:NativePropertyObjectReference|null=null;
  constructor(readonly className: OriginalDialogPartyClass,readonly wrapper: NativeReflectionWrapper,readonly reader: OriginalDialogPartyReader) {
    const data=rules.classes[className];this.storage=new NativeDialogPartyBytes(this,data.nativeBytes);
    this.proxy=new NativeDialogPartyProxy(this,data.proxyOffset);this.members=new NativeDialogPartyProxyList(this,data.listOffset);
    const values: Record<string,unknown>={};
    for(const field of data.fields){
      if(field.name==='PartyLeaderEntity')Object.defineProperty(values,field.name,{enumerable:true,get:()=>this.proxy});
      else Object.defineProperty(values,field.name,{enumerable:true,
        get:()=>{this.reader.guard();this.exact(false);return field.typeName==='bool'?this.storage.byte(field.nativeOffset)!==0:
          field.typeName==='float'?this.storage.float(field.nativeOffset):this.storage.int(field.nativeOffset+4);},
        set:(value:unknown)=>{this.reader.guard();this.exact(false);if(field.typeName==='bool'){
          if(typeof value!=='boolean')throw new Error('Original bool required');this.storage.writeByte(field.nativeOffset,value?1:0);
        }else if(field.typeName==='float'){if(typeof value!=='number')throw new Error('Original float required');this.storage.writeFloat(field.nativeOffset,value);
        }else{if(typeof value!=='number'||!Number.isInteger(value)||value< -2147483648||value>2147483647)throw new Error('Original enum signed32 required');this.storage.writeWord(field.nativeOffset+4,value>>>0);}
        this.reader.note('same physical value '+field.name,field.registrar);}});
    }
    this.values=values as unknown as OriginalDialogValues|OriginalPartyValues;
    const callback=(candidate:NativeLivePropertySet<object>,source:string):NativeValue<void>=>candidate===this.base?this.reader.emptyCallback(this,source):unknown('Actual same Dialog/Party callback receiver required');
    const callbacks: NativePropertyCallbacks={
      added:candidate=>callback(candidate,'Engine:3002d713'),removed:candidate=>callback(candidate,'Engine:3000c0c7'),postRead:candidate=>callback(candidate,'Engine:3003d10e')};
    this.base=new NativeLivePropertySet(wrapper.identity+':native',className,data.propertyType,this.values,
      {read:()=>this.owner,write:entity=>{this.reader.guard();this.exact(false);this.owner=entity;this.reader.guard();}},null,callbacks,
      ()=>reader.controller.value(()=>{this.reader.guard();this.exact();return className==='gCDialog_PS';}));
    // Each facade aliases one physical slot. These are guarded backing fields,
    // not a second reference word/property-object/flag snapshot.
    Object.defineProperty(this.base,'referenceWord',{get:()=>this.referenceWord,set:(value:number)=>{
      this.reader.guard();this.referenceWord=u32(value);this.reader.guard();}});
    Object.defineProperty(this.base,'wrapper',{get:()=>this.propertyObject,set:(value:NativePropertyObjectReference|null)=>{
      this.reader.guard();this.propertyObject=value;this.reader.guard();}});
    Object.defineProperties(this.base.baseFlags,{
      value:{get:()=>this.baseFlagValue,set:(value:number)=>{this.reader.guard();u32(value);if(value>255)throw new Error('Physical EntityPS flag byte required');this.baseFlagValue=value;this.reader.guard();}},
      knownMask:{get:()=>this.baseFlagMask,set:(value:number)=>{this.reader.guard();u32(value);if(value>255)throw new Error('Physical EntityPS flag byte mask required');this.baseFlagMask=value;this.reader.guard();}},
    });
  }
  exact(attached=true): void {
    const allocation=this.reader.controller.allocations().find(row=>row.wrapper===this.wrapper);
    if(this.wrapper.deleted||allocation?.propertySet!==this.base||this.base.values!==this.values||attached&&(this.wrapper.native!==this.base||this.base.wrapper!==this.wrapper))throw new Error('Same actual retained Dialog/Party allocation required');
  }
  dialog(): OriginalDialogValues {this.reader.guard();this.exact();if(this.className!=='gCDialog_PS')throw new Error('Actual Dialog required');return this.values as OriginalDialogValues;}
  party(): OriginalPartyValues {this.reader.guard();this.exact();if(this.className!=='gCParty_PS')throw new Error('Actual Party required');return this.values as OriginalPartyValues;}
  preProcess(): NativeValue<void> {return this.reader.emptyCallback(this,this.className==='gCDialog_PS'?'Game:2020b8d0':'Engine:3003f98b');}
  process(): NativeValue<void> {return this.reader.emptyCallback(this,this.className==='gCDialog_PS'?'Game:2020b8b0':'Engine:3002a25c');}
  postProcess(): NativeValue<void> {return this.reader.emptyCallback(this,'Engine:30004318');}
  childrenAvailable(): NativeValue<void> {return this.reader.emptyCallback(this,this.className==='gCParty_PS'?'Game:20317b60':'Engine:3000da80');}
}

export class OriginalDialogPartyReader {
  readonly dialogFactory: NativeReflectionFactory;
  readonly partyFactory: NativeReflectionFactory;
  private readonly retained=new WeakMap<NativeReflectionWrapper,OriginalDialogPartyProperties>();
  private active=false;
  private nestedAttempt=false;
  constructor(readonly controller: NativeReflectionController,readonly host: NativeDialogPartyReadingHost) {
    const factory=(className:OriginalDialogPartyClass):NativeReflectionFactory=>{
      const root=Object.freeze({className,baseClassName:'eCEntityPropertySet',fields:Object.freeze(rules.classes[className].fields.map(field=>Object.freeze({...field})))});
      const result:NativeReflectionFactory={root,nativeCategory:'entity-property-set',
        cloneRoot:current=>current===controller?this.run(()=>this.construct(className)):unknown('Same actual reflection controller required'),
        getVersion:wrapper=>controller.value(()=>{this.guard();const value=this.actual(wrapper);if(value.className!==className)throw new Error('Actual version receiver class differs');return 1;}),
        read:(wrapper,input)=>this.run(()=>this.read(className,wrapper,input))};return result;
    };
    this.dialogFactory=factory('gCDialog_PS');this.partyFactory=factory('gCParty_PS');
    fact(controller.registerFactory(this.dialogFactory),'Dialog factory registration');fact(controller.registerFactory(this.partyFactory),'Party factory registration');
  }
  guard(): void {if(this.nestedAttempt)throw new Error('Reentrant Dialog/Party operation unsupported');const required=this.controller.receipt().required;if(required!==null)throw new Error(required);}
  run<T>(body:()=>T):NativeValue<T> {
    if(this.active){this.nestedAttempt=true;return this.controller.value(()=>{throw new Error('Reentrant Dialog/Party factory/read/callback unsupported');});}
    this.active=true;this.nestedAttempt=false;
    try{return this.controller.value(()=>{this.guard();const value=body();this.guard();return value;});}finally{this.active=false;}
  }
  note(operation:string,source:string):void {this.guard();this.controller.write(operation,source);this.guard();}
  effect<T>(operation:string,source:string,body:()=>NativeValue<T>):T {this.guard();const value=this.controller.effect(operation,source,body);this.guard();return value;}
  properties(wrapper:NativeReflectionWrapper,attached=true):NativeValue<OriginalDialogPartyProperties> {
    const value=this.retained.get(wrapper);if(!value)return unknown('Actual retained Dialog/Party wrapper required');
    try{this.guard();value.exact(attached);return known(value);}catch(error){return unknown(String(error));}
  }
  private actual(wrapper:NativeReflectionWrapper):OriginalDialogPartyProperties {return fact(this.properties(wrapper),'Actual current descriptor receiver');}
  private factory(className:OriginalDialogPartyClass):NativeReflectionFactory {return className==='gCDialog_PS'?this.dialogFactory:this.partyFactory;}
  private enumCopy(value:OriginalDialogPartyProperties,field:NativeReflectionField,source:string):void {
    value.exact(false);const data=rules.classes[value.className];
    const word=this.effect('current mutable enum '+data.enumName,source,()=>this.host.enumDefault(data.enumName,data.enumGlobal));
    value.exact(false);u32(word.value);u32(word.knownMask);value.storage.writeWord(field.nativeOffset+4,word.value,word.knownMask);this.note('same physical masked enum copy '+field.name,source);
  }
  private construct(className:OriginalDialogPartyClass):NativeReflectionWrapper {
    const data=rules.classes[className],factory=this.factory(className),source=className==='gCDialog_PS'?'Game:2020f740':'Game:2031b910';
    const wrapper=this.controller.allocateWrapper(factory,source),value=new OriginalDialogPartyProperties(className,wrapper,this);
    this.retained.set(wrapper,value);this.controller.retainNative(wrapper,value.base);this.note('base constructor retained count1/NULLowner/NULLwrapper','Engine:300025bd');
    value.nativeVtables.set(0,'Game:'+data.nativeVtable);this.note('final native '+className+' vtable','Game:'+data.constructor);
    const enumField=factory.root.fields.find(field=>field.name===data.enumName)!;
    if(className==='gCParty_PS')value.proxy.construct(INTERNAL);
    value.nativeVtables.set(enumField.nativeOffset,'SharedBase:100e7e1c');this.note('enum bCObjectBase constructor stores base vtable100e7e1c','SharedBase:1004a1c0');
    value.nativeVtables.set(enumField.nativeOffset,'Game:'+data.containerVtable);this.note('enum derived container vtable store','Game:'+data.constructor);
    this.enumCopy(value,enumField,'Game:'+data.constructor);
    if(className==='gCDialog_PS')value.proxy.construct(INTERNAL);
    value.members.construct(INTERNAL);
    if(!value.base.isValid()){value.base.createBase();this.note('actual IsValid false then inherited Create','Game:'+(className==='gCDialog_PS'?'2020b820':'20317af0'));}
    this.controller.setAllocationPhase(wrapper,'created');this.guard();
    this.controller.attachConstructedNative(wrapper,value.base,className==='gCDialog_PS'?'Game:2020bec0':'Game:203180b0',source);this.guard();
    this.controller.initializeProperties(wrapper,field=>this.controller.value(()=>{
      this.guard();value.exact();if(!factory.root.fields.includes(field))throw new Error('Actual same descriptor required');
      if(field.typeName==='bool')value.storage.writeByte(field.nativeOffset,0);
      else if(field.typeName==='float')value.storage.writeWord(field.nativeOffset,0);
      else if(field.name==='PartyLeaderEntity')this.note('proxy descriptor default resolves address only; no write','Game:2031a130');
      else this.enumCopy(value,field,field.defaultInitializer!);
      this.note('actual source descriptor default '+field.name,field.defaultInitializer!);
    }),()=>this.controller.value(()=>{this.guard();value.exact();this.note('inherited RefBase.PostInitializeProperties literal1','SharedBase:100076f8');
      if(className==='gCDialog_PS'){value.members.clearInside(INTERNAL);value.proxy.resetFromNullTemporary(INTERNAL);}
    }),className==='gCDialog_PS'?'Game:2020bad0':'SharedBase:100076f8');
    this.guard();return wrapper;
  }
  /** Both classes inherit the exact Engine Notify/OnNotify chain: owner is
   * re-read twice; Modified only reads the owner's existing timestamp DWORD. */
  private notify(value:OriginalDialogPartyProperties,phase:'enter'|'exit',name:string):void {
    this.guard();value.exact();
    for(const stage of ['outerNotify','inheritedOnNotify']){
      const owner=value.base.owner.read();if(owner!==null){owner.propertyOwner.modified();this.guard();this.note(stage+' current owner.Modified read '+name,phase==='enter'?'Engine:3003b5bb':'Engine:3001a091');}
      if(stage==='outerNotify')this.note('SharedBase virtualOnNotify '+phase+' propagatedtrue',phase==='enter'?'SharedBase:10006019':'SharedBase:10002568');
    }
    this.note('SharedBase OnNotify literaltrue',phase==='enter'?'Engine:3002ad10':'Engine:30037ca4');
  }
  private read(className:OriginalDialogPartyClass,wrapper:NativeReflectionWrapper,input:NativeEntityByteInput):number {
    const before=this.actual(wrapper);if(before.className!==className)throw new Error('Actual reader receiver class differs');
    return this.controller.readWrapperProperties(wrapper,input,{wrapperSource:className==='gCDialog_PS'?'Game:2020cd80':'Game:20318f70',dataSource:className==='gCDialog_PS'?'Game:2020fe90':'Game:2031c050',
      readField:(field,stream)=>this.controller.value(()=>{
        this.guard();if(!this.factory(className).root.fields.includes(field))throw new Error('Actual current class descriptor required');
        stream.u16();stream.u32();this.note('descriptor version/declared length; no seek',field.reader);
        this.notify(this.actual(wrapper),'enter',field.name);
        const current=this.actual(wrapper);if(current.className!==className)throw new Error('Descriptor receiver replaced with another class'); // Source resolves address afterEnter.
        if(field.typeName==='bool')current.storage.writeByte(field.nativeOffset,stream.bool()?1:0);
        else if(field.typeName==='float')current.storage.write(field.nativeOffset,stream.take(4));
        else if(field.name==='PartyLeaderEntity')current.proxy.read(INTERNAL,stream);
        else{stream.u16();current.storage.write(field.nativeOffset+4,stream.take(4));}
        this.note('same actual descriptor payload '+field.name,field.reader);this.notify(this.actual(wrapper),'exit',field.name); // Native refetched independently beforeExit.
      }),readNative:stream=>this.controller.value(()=>{
        this.guard();const current=this.actual(wrapper),version=stream.u16();this.note('native Read consumesu16/returns1','Game:'+(className==='gCDialog_PS'?'2020b860':'20317ce0'));
        if(className==='gCParty_PS'&&version===1)current.members.readInside(INTERNAL,stream);
      })});
  }
  emptyCallback(value:OriginalDialogPartyProperties,source:string):NativeValue<void> {return this.run(()=>{value.exact();this.note('actual selected inherited/own literal RET callback',source);});}
}

async function readHero(reader:OriginalDialogPartyReader,className:OriginalDialogPartyClass):Promise<NativeValue<{
  accessor:NativeReflectionAccessor;properties:OriginalDialogPartyProperties;input:NativeEntityByteInput;outerVersion:1;worldResident:false;
}>> {
  const document=await loadOriginalReflectionSerialized(),data=rules.classes[className],packet=originalReflectionPropertyInput(document,'PC_Hero',data.packetIndex);
  if(packet.outerVersion!==1||packet.source.className!==className||packet.source.nativeReadVersion!==1||packet.source.serializedSha256!==data.heroSerialized.serializedSha256)return unknown('Original Hero Dialog/Party packet differs');
  const accessor=reader.controller.readAccessor(packet.input);if(!accessor.known)return accessor;
  if(!accessor.value.instance)return unknown('Actual original Dialog/Party wrapperNULL');const value=reader.properties(accessor.value.instance);if(!value.known)return value;
  return known({accessor:accessor.value,properties:value.value,input:packet.input,outerVersion:1,worldResident:false});
}
export function readOriginalHeroDialog(reader:OriginalDialogPartyReader):ReturnType<typeof readHero> {return readHero(reader,'gCDialog_PS');}
export function readOriginalHeroParty(reader:OriginalDialogPartyReader):ReturnType<typeof readHero> {return readHero(reader,'gCParty_PS');}
