/** Original gCFocus_PS construction, physical defaults and current Hero read.
 * The actual focus search remains its scene/interaction host dependency. */
import rulesText from '../../assets/gothic3/focus-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeReflectionController, loadOriginalReflectionSerialized, originalReflectionPropertyInput } from './entity-reflection';
import type { NativeReflectionAccessor, NativeReflectionFactory, NativeReflectionField, NativeReflectionWrapper } from './entity-reflection';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativeMaskedWord, NativePropertyCallbacks, NativePropertyObjectReference } from './entity-lifecycle';
import type { NativeEntityByteInput } from './entity-reading';
import { OriginalEnclaveProxy } from './native-properties';
import type { OriginalProxyInternalReference } from './native-properties';

type FocusEnum = 'FocusLookAtMode' | 'FocusLookAtKeysFOR' | 'CurrentMode';
const sourceMutationPermission=Symbol('original Focus constructor/invalidate');
type Store = { source: string; kind: 'word' | 'byte'; offset: number; raw: string }
  | { source: string; kind: 'enum-temporary'; name: FocusEnum; value: number };
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string,string>; nativeBytes: number;
  propertyType: number; getVersion: number; nativeVtable: string; wrapperVtable: string; fields: NativeReflectionField[];
  enumGlobals: Record<FocusEnum,string>; containerVtables: Record<FocusEnum,string>;
  invalidatePlan: Store[]; postInitializePlan: Store[]; heroSerialized: { serializedSha256: string } };
if (rules.schema !== 'gothic3-focus-reading-rules-v1' || rules.nativeBytes !== 408 || rules.propertyType !== 59 ||
    rules.getVersion !== 44 || rules.nativeVtable !== '2066a1a4' || rules.wrapperVtable !== '20669d84' || rules.fields.length !== 80 ||
    rules.invalidatePlan.length !== 12 || rules.postInitializePlan.length !== 80 ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original Focus source profile differs');
const known = <T>(value:T):NativeValue<T> => ({known:true,value});
const missing = <T>(reason:string):NativeValue<T> => ({known:false,reason});
function fact<T>(value:NativeValue<T>,label:string):T {if(!value.known)throw new Error(label+': '+value.reason);return value.value;}
function uint(value:number):number {if(!Number.isInteger(value)||value<0||value>0xffffffff)throw new Error('Original uint32 required');return value;}
function bytes(raw:string):Uint8Array {if(!/^(?:[a-f0-9]{2})+$/.test(raw))throw new Error('Original raw bytes required');return Uint8Array.from(raw.match(/../g)!.map(v=>parseInt(v,16)));}
function hex(raw:Uint8Array):string {return Array.from(raw,v=>v.toString(16).padStart(2,'0')).join('');}
function isEnum(field:NativeReflectionField):field is NativeReflectionField & {name:FocusEnum} {return Object.hasOwn(rules.enumGlobals,field.name);}
export interface OriginalFocusValues extends Record<string,number|boolean|OriginalFocusEntityProxy> {
  FocusLookAtMode:number; FocusLookAtKeysFOR:number; CurrentMode:number;
  CurrentEntity:OriginalFocusEntityProxy; DrawFocusName:boolean;
}
export interface NativeFocusCandidateAllocation {readonly identity:object}
export interface NativeFocusEnumTemporary {
  readonly bytes:Uint8Array;readonly knownMask:Uint8Array;destroyed:boolean;constructionCycle:number;
}
export interface NativeFocusReadingHost {
  enumDefault(name:FocusEnum,originalGlobalVA:string):NativeValue<NativeMaskedWord>;
  freeCandidateArray?(properties:OriginalFocusProperties,captured:NativeFocusCandidateAllocation):NativeValue<void>;
  /** Execute the actual original search over this allocation and live world. */
  findFocusEntity?(properties:OriginalFocusProperties,flag:false):NativeValue<NativeLiveEntity|null>;
}

/** One physical allocation. Uninitialized bits remain unreadable; direct
 * writes are storage operations, not implicit native property notifications. */
export class NativeFocusBytes {
  readonly bytes=new Uint8Array(408);readonly knownMask=new Uint8Array(408);
  private readonly view=new DataView(this.bytes.buffer);
  constructor(private readonly guard:()=>void) {}
  private range(at:number,size:number):void {if(!Number.isInteger(at)||!Number.isInteger(size)||at<0||size<0||at+size>408)throw new Error('Focus physical range differs');}
  raw(at:number,size:number):Uint8Array {this.range(at,size);if(this.knownMask.subarray(at,at+size).some(v=>v!==255))throw new Error('Unknown Focus physical bits+'+at.toString(16));return this.bytes.slice(at,at+size);}
  word(at:number):number {this.raw(at,4);return this.view.getUint32(at,true);}
  byte(at:number):number {return this.raw(at,1)[0]!;}
  float(at:number):number {this.raw(at,4);const v=this.view.getFloat32(at,true);if(!Number.isFinite(v))throw new Error('Nonfinite Focus access outside selected float32 profile');return v;}
  write(at:number,data:Uint8Array,masks?:Uint8Array):void {this.guard();this.range(at,data.length);if(masks&&masks.length!==data.length)throw new Error('Focus byte masks differ');this.bytes.set(data,at);if(masks)this.knownMask.set(masks,at);else this.knownMask.fill(255,at,at+data.length);this.guard();}
  writeWord(at:number,value:number):void {uint(value);this.write(at,new Uint8Array([value&255,(value>>>8)&255,(value>>>16)&255,value>>>24]));}
  pointer(at:number,isNull:boolean):void {if(isNull)this.writeWord(at,0);else this.write(at,new Uint8Array(4),new Uint8Array(4));}
}

/** Actual eCEntityProxy at+130: vtable, internal+4, PropertyID+8. */
export class OriginalFocusEntityProxy extends OriginalEnclaveProxy {
  private sourceReference:OriginalProxyInternalReference|null=null;
  constructor(readonly allocation:OriginalFocusProperties) {
    super('0000000000000000000000000000000000000000',null);
    Object.defineProperty(this,'id',{configurable:false,
      get:()=>hex(allocation.storage.raw(0x138,20)),
      set:(value:string)=>{allocation.reader.guard();allocation.exact(false);if(!/^[a-f0-9]{40}$/.test(value))throw new Error('Actual20B Focus proxy ID required');allocation.storage.write(0x138,bytes(value));} });
    Object.defineProperty(this,'internal',{configurable:false,
      get:()=>this.sourceReference,
      set:(value:OriginalProxyInternalReference|null)=>{
        allocation.reader.guard();allocation.exact(false);
        this.sourceReference=value;allocation.storage.pointer(0x134,value===null);
      } });
  }
}

export class OriginalFocusProperties {
  readonly storage:NativeFocusBytes;readonly nativeVtables=new Map<number,number>();
  readonly values:OriginalFocusValues;readonly base:NativeLivePropertySet<OriginalFocusValues>;
  /** One reused 8B stack slot per actual Invalidate/PostInitialize invocation. */
  readonly enumTemporaries:NativeFocusEnumTemporary[]=[];
  private owner:NativeLiveEntity|null=null;private proxy:OriginalFocusEntityProxy|null=null;
  private candidates:NativeFocusCandidateAllocation|null=null;
  constructor(readonly wrapper:NativeReflectionWrapper,readonly reader:OriginalFocusReader) {
    this.storage=new NativeFocusBytes(()=>{reader.guard();this.exact(false);});this.values={} as OriginalFocusValues;
    for(const field of rules.fields)Object.defineProperty(this.values,field.name,{enumerable:true,configurable:false,
      get:()=>{this.exact();if(field.typeName==='eCEntityProxy')return this.currentEntity();if(field.typeName==='bool')return this.storage.byte(field.nativeOffset)!==0;return isEnum(field)?this.storage.word(field.nativeOffset+4)|0:this.storage.float(field.nativeOffset);},
      set:(value:unknown)=>{reader.guard();this.exact();
        if(field.typeName==='eCEntityProxy')throw new Error('Retain the actual embedded Focus proxy');
        if(field.typeName==='bool'){if(typeof value!=='boolean')throw new Error('Original bool required');this.storage.write(field.nativeOffset,new Uint8Array([Number(value)]));}
        else if(isEnum(field)){if(typeof value!=='number'||!Number.isInteger(value)||value< -0x80000000||value>0x7fffffff)throw new Error('Original signed enum required');this.storage.writeWord(field.nativeOffset+4,value>>>0);}
        else {if(typeof value!=='number'||!Number.isFinite(value)||!Object.is(value,Math.fround(value)))throw new Error('Stored finite float32 required');const raw=new Uint8Array(4);new DataView(raw.buffer).setFloat32(0,value,true);this.storage.write(field.nativeOffset,raw);}
        reader.note('same Focus physical field '+field.name,field.reader);
      } });
    const empty=(candidate:NativeLivePropertySet<object>):NativeValue<void>=>reader.controller.value(()=>{
      reader.guard();this.exact();if(candidate!==this.base)throw new Error('Actual Focus callback receiver required');
    });
    const callbacks:NativePropertyCallbacks={added:empty,removed:empty,postRead:empty};
    this.base=new NativeLivePropertySet(wrapper.identity+':native','gCFocus_PS',59,this.values,
      {read:()=>this.owner,write:value=>{reader.guard();this.exact(false);this.owner=value;this.storage.pointer(0x0c,value===null);}},null,callbacks,()=>reader.controller.value(()=>{reader.guard();this.exact();return true;}));
    Object.defineProperties(this.base.baseFlags,{
      value:{configurable:false,get:()=>this.storage.bytes[0x10]!,set:(value:number)=>{reader.guard();uint(value);if(value>255)throw new Error('Physical Focus flag byte required');this.storage.write(0x10,new Uint8Array([value]),new Uint8Array([this.storage.knownMask[0x10]!]));}},
      knownMask:{configurable:false,get:()=>this.storage.knownMask[0x10]!,set:(value:number)=>{reader.guard();uint(value);if(value>255)throw new Error('Physical Focus flag mask required');this.storage.write(0x10,new Uint8Array([this.storage.bytes[0x10]!]),new Uint8Array([value]));}},
    });
    let actualWrapper:NativePropertyObjectReference|null=null;
    Object.defineProperty(this.base,'wrapper',{configurable:false,get:()=>actualWrapper,set:(value:NativePropertyObjectReference|null)=>{
      reader.guard();this.exact(false);if(value!==null&&value!==wrapper)throw new Error('Actual retained Focus wrapper pointer required');actualWrapper=value;this.storage.pointer(4,value===null);
    }});
  }
  exact(attached=true):void {
    const slot=this.reader.controller.allocations().find(v=>v.wrapper===this.wrapper);
    if(this.wrapper.deleted||slot?.propertySet!==this.base||this.base.values!==this.values||
       attached&&(this.wrapper.native!==this.base||this.base.wrapper!==this.wrapper||this.nativeVtables.get(0)!==0x2066a1a4))throw new Error('Actual retained Focus physical allocation required');
  }
  currentEntity():OriginalFocusEntityProxy {if(!this.proxy)throw new Error('Actual Focus EntityProxy not constructed');return this.proxy;}
  constructCurrentEntity(permission:symbol):void {this.reader.guard();this.exact(false);if(permission!==sourceMutationPermission)throw new Error('Actual Focus constructor boundary required');if(this.proxy!==null)throw new Error('Fresh embedded Focus proxy required');this.proxy=new OriginalFocusEntityProxy(this);this.nativeVtables.set(0x130,0x3087bff4);this.storage.pointer(0x130,false);this.storage.write(0x138,new Uint8Array(20));this.reader.note('embedded PropertyID constructor zero20','Engine:304c45af');this.proxy.internal=null;this.storage.write(0x138,new Uint8Array(20));this.reader.note('embedded PropertyID Destroy zero20 after internalNULL','Engine:304c45be');}
  get candidateAllocation():NativeFocusCandidateAllocation|null {return this.candidates;}
  set candidateAllocation(value:NativeFocusCandidateAllocation|null) {this.reader.guard();this.exact(false);if(value!==null&&(typeof value.identity!=='object'||value.identity===null))throw new Error('Actual candidate allocation capability required');this.candidates=value;this.storage.pointer(0x178,value===null);}
  invalidate():NativeValue<void> {return this.reader.run(()=>this.reader.invalidate(this,sourceMutationPermission));}
  process():NativeValue<void> {return this.reader.run(()=>{
    this.exact();this.reader.note('inherited EntityPS.OnProcess literal RET','Engine:OnProcess');
    if(this.storage.byte(0x124)===1)this.reader.effect('actual FindFocusEntity(false)','Game:2013e130',()=>this.reader.host.findFocusEntity?.(this,false));
  });}
  postProcess():NativeValue<void> {return this.reader.run(()=>{this.exact();this.storage.write(0x18c,new Uint8Array(12));this.reader.note('same look vector Clear then inherited PostProcess RET','Game:2013b0d0');});}
}

export class OriginalFocusReader {
  readonly factory:NativeReflectionFactory;
  private readonly retained=new WeakMap<NativeReflectionWrapper,OriginalFocusProperties>();
  private active=false;private reentrant=false;
  constructor(readonly controller:NativeReflectionController,readonly host:NativeFocusReadingHost) {
    const root=Object.freeze({className:'gCFocus_PS',baseClassName:'eCEntityPropertySet',fields:Object.freeze(rules.fields.map(v=>Object.freeze({...v})))});
    this.factory={root,nativeCategory:'entity-property-set',cloneRoot:current=>current===controller?this.run(()=>this.construct()):missing('Same Focus reflection controller required'),
      getVersion:wrapper=>controller.value(()=>{fact(this.properties(wrapper),'Focus GetVersion').exact();return 44;}),read:(wrapper,input)=>this.run(()=>this.read(wrapper,input))};
    fact(controller.registerFactory(this.factory),'Original Focus factory registration');
  }
  guard():void {if(this.reentrant)throw new Error('Reentrant Focus mutation unsupported');const reason=this.controller.receipt().required;if(reason!==null)throw new Error(reason);}
  run<T>(body:()=>T):NativeValue<T> {if(this.active){this.reentrant=true;return this.controller.value(()=>{throw new Error('Reentrant Focus factory/read/callback');});}this.active=true;this.reentrant=false;try{return this.controller.value(()=>{this.guard();const value=body();this.guard();return value;});}finally{this.active=false;}}
  note(operation:string,source:string):void {this.guard();this.controller.write(operation,source);this.guard();}
  effect<T>(operation:string,source:string,body:()=>NativeValue<T>|undefined):T {this.guard();const value=this.controller.effect(operation,source,body);this.guard();return value;}
  properties(wrapper:NativeReflectionWrapper,attached=true):NativeValue<OriginalFocusProperties> {const value=this.retained.get(wrapper);if(!value)return missing('Actual retained Focus wrapper required');try{value.exact(attached);return known(value);}catch(error){return missing(String(error));}}
  private actual(wrapper:NativeReflectionWrapper):OriginalFocusProperties {return fact(this.properties(wrapper),'Actual Focus descriptor receiver');}
  private enumCopy(value:OriginalFocusProperties,field:NativeReflectionField&{name:FocusEnum}):void {
    value.exact(false);if(value.nativeVtables.get(field.nativeOffset)!==parseInt(rules.containerVtables[field.name],16))throw new Error('Actual Focus enum receiver/vtable required');const current=this.effect('current masked Focus enum '+field.name,field.defaultInitializer??'Game:2013d480',()=>this.host.enumDefault(field.name,rules.enumGlobals[field.name]));value.exact(false);
    uint(current.value);uint(current.knownMask);value.storage.write(field.nativeOffset+4,bytes(current.value.toString(16).padStart(8,'0').match(/../g)!.reverse().join('')),bytes(current.knownMask.toString(16).padStart(8,'0').match(/../g)!.reverse().join('')));
  }
  private plan(value:OriginalFocusProperties,rows:Store[]):void {
    const temporary:NativeFocusEnumTemporary={bytes:new Uint8Array(8),knownMask:new Uint8Array(8),destroyed:false,constructionCycle:0};
    const temporaryView=new DataView(temporary.bytes.buffer);value.enumTemporaries.push(temporary);
    for(const row of rows){this.guard();value.exact(false);
      if(row.kind==='enum-temporary'){
        const field=this.factory.root.fields.find(v=>v.name===row.name)!;
        if(value.nativeVtables.get(field.nativeOffset)!==parseInt(rules.containerVtables[row.name],16))throw new Error('Actual Focus enum assignment dispatch required');
        temporary.destroyed=false;temporary.constructionCycle++;
        temporaryView.setUint32(0,0x100e7e1c,true);temporary.knownMask.fill(255,0,4);
        this.note('actual temporary ObjectBase ctor writes base vtable','SharedBase:1004a1c0');
        temporaryView.setUint32(0,parseInt(rules.containerVtables[row.name],16),true);temporaryView.setUint32(4,row.value,true);temporary.knownMask.fill(255);
        this.note('same temporary typed enum vtable/value'+row.value,row.source);
        value.storage.write(field.nativeOffset+4,temporary.bytes.subarray(4,8));this.note('same enum virtual1c copies temporary value',row.source);
        temporaryView.setUint32(0,parseInt(rules.containerVtables[row.name],16),true);this.note('temporary enum destructor restores typed vtable',row.source);
        temporaryView.setUint32(0,0x100e7e1c,true);temporary.destroyed=true;this.note('actual temporary ObjectBase destructor writes base vtable','SharedBase:10049fe0');
      }else {value.storage.write(row.offset,bytes(row.raw));this.note('source ordered Focus store+'+row.offset.toString(16),row.source);}
    }
  }
  invalidate(value:OriginalFocusProperties,permission:symbol):void {
    this.guard();if(permission!==sourceMutationPermission)throw new Error('Actual guarded Focus Invalidate required');value.exact(false);const captured=value.candidateAllocation;
    if(captured!==null){this.effect('actual Free captured candidate backing','Game:2013c864',()=>this.host.freeCandidateArray?.(value,captured));value.exact(false);value.candidateAllocation=null;value.storage.writeWord(0x17c,0);value.storage.writeWord(0x180,0);this.note('candidate header clears after successful Free','Game:2013c86a');}
    this.plan(value,rules.invalidatePlan);value.storage.write(0x18c,new Uint8Array(12));this.note('actual bCVector.Clear look vector','Game:2013c954');
  }
  private construct():NativeReflectionWrapper {
    const wrapper=this.controller.allocateWrapper(this.factory,'Game:20145f00'),value=new OriginalFocusProperties(wrapper,this);
    this.retained.set(wrapper,value);this.controller.retainNative(wrapper,value.base);
    value.storage.writeWord(8,1);value.storage.write(0x10,new Uint8Array([1]),new Uint8Array([15]));value.base.wrapper=null;value.base.owner.write(null);
    Object.defineProperty(value.base,'referenceWord',{configurable:false,get:()=>value.storage.word(8),set:(next:number)=>value.storage.writeWord(8,uint(next))});
    this.note('inherited RefBase/EntityPS constructor actual NULL wrapper/owner and count1','Engine:300025bd');
    value.nativeVtables.set(0,0x2066a1a4);value.storage.pointer(0,false);this.note('final Focus native vtable','Game:2013d496');
    for(const name of ['FocusLookAtMode','FocusLookAtKeysFOR','CurrentMode'] as const){const field=this.factory.root.fields.find(v=>v.name===name)!;value.nativeVtables.set(field.nativeOffset,0x100e7e1c);value.storage.pointer(field.nativeOffset,false);this.note('embedded enum actual ObjectBase ctor base vtable','SharedBase:1004a1c0');value.nativeVtables.set(field.nativeOffset,parseInt(rules.containerVtables[name],16));this.note('embedded enum typed vtable','Game:2013d480');this.enumCopy(value,field as NativeReflectionField&{name:FocusEnum});}
    value.constructCurrentEntity(sourceMutationPermission);this.note('actual EntityProxy ctor at+130 internalNULL/zero20ID','Engine:304c45a0');
    this.note('bCVector default ctor at+14c leaves components unknown','SharedBase:10024b70');
    value.candidateAllocation=null;value.storage.writeWord(0x17c,0);value.storage.writeWord(0x180,0);this.note('candidate array constructor NULL/count0/capacity0','Game:2013d4fb');
    this.note('bCVector default ctor at+18c leaves components unknown','SharedBase:10024b70');this.invalidate(value,sourceMutationPermission);
    if(!value.base.isValid()){value.base.createBase();this.note('actual Create IsValid false then inherited Create','Game:2013b100');}
    this.controller.setAllocationPhase(wrapper,'created');this.controller.attachConstructedNative(wrapper,value.base,'Game:2013f210','Game:20145f00');
    this.controller.initializeProperties(wrapper,field=>this.controller.value(()=>{
      this.guard();value.exact();if(!this.factory.root.fields.includes(field))throw new Error('Same Focus descriptor required');
      if(isEnum(field))this.enumCopy(value,field);
      else if(field.typeName==='eCEntityProxy')this.note('CurrentEntity default resolves member only; no reset',field.defaultInitializer!);
      else value.storage.write(field.nativeOffset,new Uint8Array(field.typeName==='bool'?1:4));
      this.note('actual Focus descriptor default '+field.name,field.defaultInitializer!);
    }),()=>this.controller.value(()=>{this.guard();value.exact();this.note('inherited PostInitializeProperties literal1','SharedBase:100076f8');this.plan(value,rules.postInitializePlan);}),'Game:2013c4e0');
    this.guard();return wrapper;
  }
  private notify(value:OriginalFocusProperties,phase:'enter'|'exit',name:string):void {
    this.guard();value.exact();value.base.owner.read()?.propertyOwner.modified();this.guard();
    if(phase==='enter'){
      value.base.owner.read()?.propertyOwner.modified();this.guard();
      this.note('Focus Enter inherited OnNotify rereads owner.Modified then return1 '+name,'Engine:3003b5bb');
    }else this.note('Focus Exit virtual override literal1 without second owner read '+name,'Game:2013b140');
  }
  private read(wrapper:NativeReflectionWrapper,input:NativeEntityByteInput):number {
    this.actual(wrapper);return this.controller.readWrapperProperties(wrapper,input,{wrapperSource:'Game:20140c30',dataSource:'Game:201479b0',
      readField:(field,stream)=>this.controller.value(()=>{
        this.guard();if(!this.factory.root.fields.includes(field))throw new Error('Same actual Focus descriptor required');stream.u16();stream.u32();this.notify(this.actual(wrapper),'enter',field.name);
        const value=this.actual(wrapper);
        if(isEnum(field)){if(value.nativeVtables.get(field.nativeOffset)!==parseInt(rules.containerVtables[field.name],16))throw new Error('Actual Focus enum Read virtual10 dispatch required');stream.u16();value.storage.write(field.nativeOffset+4,stream.take(4));}
        else if(field.typeName==='eCEntityProxy'){
          const proxy=value.currentEntity();stream.u16();const present=stream.bool();
          if(present){this.note('temporary PropertyID constructor zero20','Engine:304c4410');const id=stream.propertyID().slice(0,32)+'00000000';proxy.setEntity(id,(operation)=>this.note(operation,'Engine:304c4410'));this.note('temporary PropertyID destructor','SharedBase:10092ac0');}
          else proxy.clearEntityPointer(operation=>this.note(operation,'Engine:304c4410'));
        }else if(field.typeName==='bool')value.storage.write(field.nativeOffset,new Uint8Array([Number(stream.bool())]));
        else value.storage.write(field.nativeOffset,stream.take(4));
        this.note('same Focus descriptor payload '+field.name,field.reader);this.notify(this.actual(wrapper),'exit',field.name);
      }),readNative:stream=>this.controller.value(()=>{this.guard();this.actual(wrapper);stream.u16();this.note('native Focus Read onlyu16, returns1','Game:2013b150');})});
  }
}

export async function readOriginalHeroFocus(reader:OriginalFocusReader):Promise<NativeValue<{
  accessor:NativeReflectionAccessor;properties:OriginalFocusProperties;input:NativeEntityByteInput;outerVersion:44;worldResident:false
}>> {
  const document=await loadOriginalReflectionSerialized(),packet=originalReflectionPropertyInput(document,'PC_Hero',12);
  if(packet.outerVersion!==44||packet.source.className!=='gCFocus_PS'||packet.source.nativeReadVersion!==44||packet.source.serializedSha256!==rules.heroSerialized.serializedSha256)return missing('Original Hero Focus packet differs');
  const accessor=reader.controller.readAccessor(packet.input);if(!accessor.known)return accessor;const wrapper=accessor.value.instance;if(!wrapper)return missing('Original Focus wrapperNULL');
  const properties=reader.properties(wrapper);if(!properties.known)return properties;return known({accessor:accessor.value,properties:properties.value,input:packet.input,outerVersion:44,worldResident:false});
}
