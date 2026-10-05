/** Concrete ScriptRoutine factory/read with the same live script properties.
 * The embedded SPU and CString ownership services are actual capabilities.
 * Constructor/default/read execution alone never establishes world residency.
 */
import rulesText from '../../assets/gothic3/routine-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativeMaskedWord, NativePropertyCallbacks } from './entity-lifecycle';
import { NativeReflectionWrapper, loadOriginalReflectionSerialized, originalReflectionPropertyInput } from './entity-reflection';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionAccessor } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';
import { OriginalEntityPropertySet } from './native-properties';
import type { OriginalPropertyOwner, OriginalRoutinePropertyBindings } from './native-properties';
import type { NativeRoutineProperties } from './script-routine';

type RoutineEnum = 'AniState' | 'Action' | 'AmbientAction' | 'AIMode' | 'HitDirection';
export interface OriginalRoutineValues extends NativeRoutineProperties {
  CommandTime: number; AniState: number; Action: number; AmbientAction: number; AIMode: number; HitDirection: number;
}
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string,string>; propertyType: number; getVersion: number;
  nativeBytes: number; nativeVtable: string; wrapperVtable: string; fields: NativeReflectionField[];
  enumGlobals: Record<RoutineEnum,string>; containerVtables: Record<RoutineEnum,string>;
  heroSerialized: { serializedSha256: string } };
if (rules.schema !== 'gothic3-routine-reading-rules-v1' || rules.propertyType !== 45 || rules.getVersion !== 1 ||
    rules.nativeBytes !== 500 || rules.nativeVtable !== '2069c754' || rules.wrapperVtable !== '2069c9d4' || rules.fields.length !== 15 ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') {
  throw new Error('Original ScriptRoutine reader receipt differs');
}
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(value: NativeValue<T>, name: string): T { if (!value.known) throw new Error(name + ': ' + value.reason); return value.value; }
function u32(value: number): number { if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Original uint32 required'); return value; }
function enumName(field: NativeReflectionField): field is NativeReflectionField & { name: RoutineEnum } { return field.name in rules.enumGlobals; }
function stringField(field: NativeReflectionField): boolean { return field.typeName === 'bCString' || field.typeName === 'bCScriptString'; }

/** Native CString data ownership, including a nonNULL allocated empty string.
 * This is a capability to actual storage, never a fabricated numeric address. */
export interface NativeRoutineCStringAllocation {
  readonly identity: object; readonly text: string; readonly length: number;
  referenceCount: number; freed: boolean;
}
export class NativeRoutineCStringSlot {
  private current: NativeRoutineCStringAllocation | null = null;
  constructor(readonly nativeOffset: number, private readonly allocation: OriginalRoutineProperties) {}
  get pointer(): NativeRoutineCStringAllocation | null { return this.current; }
  set pointer(value: NativeRoutineCStringAllocation | null) {
    this.allocation.reader.guard(); this.allocation.exact(false);
    if (value !== null && (typeof value.identity !== 'object' || value.identity === null || typeof value.text !== 'string' ||
        !Number.isInteger(value.length) || value.length < 0 || !Number.isInteger(value.referenceCount) || value.referenceCount < 1 ||
        value.referenceCount > 65535 || value.freed)) throw new Error('Actual live native CString allocation required');
    this.current = value;
    if (value === null) this.allocation.storage.writeInt(this.nativeOffset, 0);
    else this.allocation.storage.unknownPointer(this.nativeOffset);
    this.allocation.reader.note('same physical CString pointer+'+this.nativeOffset.toString(16), 'SharedBase:bCString');
  }
  get text(): string {
    if (this.current?.freed) throw new Error('CString points to freed source storage');
    return this.current?.text ?? '';
  }
}
export interface NativeRoutineTemporaryCString { readonly identity: object; readonly pointer: NativeRoutineCStringAllocation | null }
/** Exactly one actual embedded processor at native+64. Each method executes
 * its original body, including by-value CString argument destruction. Methods
 * must use this allocation's properties and actual entity/proxy services. */
export interface NativeRoutineEmbeddedSPU {
  readonly identity: object;
  readonly allocation: OriginalRoutineProperties;
  gameReset(): NativeValue<void>;
  setSelfEntity(entity: NativeLiveEntity | null): NativeValue<void>;
  processScript(): NativeValue<void>;
  setTask(name: NativeRoutineTemporaryCString, flag: false): NativeValue<void>;
  setTaskPosition(value: number): NativeValue<void>;
  setTaskTime(value: number): NativeValue<void>;
  setTaskCallback(name: NativeRoutineTemporaryCString): NativeValue<void>;
  setState(name: NativeRoutineTemporaryCString): NativeValue<void>;
  setStatePosition(value: number): NativeValue<void>;
  setStateTime(value: number): NativeValue<void>;
  setLocalCallback(name: NativeRoutineTemporaryCString): NativeValue<void>;
}
export interface NativeRoutineProfileAdmin { readonly identity: object; addProfileTicks(ticks: number): NativeValue<void> }
export interface NativeRoutineReadingHost {
  /** Current module globals, not PE bytes used as live mutable values. Masked
   * copies can succeed while a later numeric access remains unsupported. */
  enumDefault(name: RoutineEnum, originalGlobalVA: string): NativeValue<NativeMaskedWord>;
  constructSPU(allocation: OriginalRoutineProperties, nativeOffset: 0x64): NativeValue<NativeRoutineEmbeddedSPU>;
  readCString(slot: NativeRoutineCStringSlot, input: NativeEntityByteInput): NativeValue<void>;
  assignCString(slot: NativeRoutineCStringSlot, text: string): NativeValue<void>;
  freeCString(data: NativeRoutineCStringAllocation): NativeValue<void>;
  copyCString(slot: NativeRoutineCStringSlot): NativeValue<NativeRoutineTemporaryCString>;
  constructEmptyCString(): NativeValue<NativeRoutineTemporaryCString>;
  timestamp(): NativeValue<number>;
  scriptAdmin(): NativeValue<NativeRoutineProfileAdmin>;
}

/** Masked original fields; missing initialized bits never read as zero. */
export class NativeRoutineBytes {
  readonly bytes=new Uint8Array(500);
  readonly knownMask=new Uint8Array(500);
  private readonly view=new DataView(this.bytes.buffer);
  revision=0;
  private range(at:number,length:number):void {if(!Number.isInteger(at)||!Number.isInteger(length)||at<0||length<0||at+length>500)throw new Error('Original Routine field range differs');}
  private need(at:number,length:number):void {this.range(at,length);if(this.knownMask.subarray(at,at+length).some(mask=>mask!==255))throw new Error('Unknown Routine physical bits+'+at.toString(16));}
  byte(at:number):number {this.need(at,1);return this.view.getUint8(at);}
  int(at:number):number {this.need(at,4);return this.view.getInt32(at,true);}
  float(at:number):number {this.need(at,4);const value=this.view.getFloat32(at,true);if(!Number.isFinite(value))throw new Error('Nonfinite routine use outside selected float32 profile');return value;}
  writeByte(at:number,value:number):void {this.range(at,1);if(!Number.isInteger(value)||value<0||value>255)throw new Error('Original byte required');this.view.setUint8(at,value);this.knownMask[at]=255;this.revision++;}
  writeInt(at:number,value:number):void {this.range(at,4);if(!Number.isInteger(value)||value< -0x80000000||value>0x7fffffff)throw new Error('Original signed32 required');this.view.setInt32(at,value,true);this.knownMask.fill(255,at,at+4);this.revision++;}
  writeFloat(at:number,value:number):void {this.range(at,4);if(!Number.isFinite(value)||!Object.is(value,Math.fround(value)))throw new Error('Stored finite float32 required');this.view.setFloat32(at,value,true);this.knownMask.fill(255,at,at+4);this.revision++;}
  writeRaw(at:number,data:Uint8Array,masks?:Uint8Array):void {this.range(at,data.length);if(masks&&masks.length!==data.length)throw new Error('Original field masks differ');this.bytes.set(data,at);if(masks)this.knownMask.set(masks,at);else this.knownMask.fill(255,at,at+data.length);this.revision++;}
  unknownPointer(at:number):void {this.range(at,4);this.knownMask.fill(0,at,at+4);this.revision++;}
}

export class OriginalRoutineProperties {
  /** Only the physical property bytes live here. Embedded SPU storage belongs
   * solely to the retained processor; its region is not a duplicate seed. */
  readonly storage = new NativeRoutineBytes();
  readonly strings = new Map<string,NativeRoutineCStringSlot>();
  readonly nativeVtables = new Map<number,number>();
  readonly values: OriginalRoutineValues;
  readonly base: NativeLivePropertySet<OriginalRoutineValues>;
  readonly notifications: OriginalEntityPropertySet<OriginalRoutineValues>;
  private owner: NativeLiveEntity | null = null;
  private embedded: NativeRoutineEmbeddedSPU | null = null;
  constructor(readonly wrapper: NativeReflectionWrapper, readonly reader: OriginalRoutineReader) {
    this.values = {} as OriginalRoutineValues;
    for (const field of rules.fields) {
      if (stringField(field)) this.strings.set(field.name,new NativeRoutineCStringSlot(field.nativeOffset,this));
      Object.defineProperty(this.values,field.name,{ enumerable:true, configurable:false,
        get: () => {
          if (stringField(field)) return this.strings.get(field.name)!.text;
          const offset = field.nativeOffset + (enumName(field) ? 4 : 0);
          return field.typeName === 'float' ? this.storage.float(offset) : this.storage.int(offset);
        },
        set: (value: unknown) => fact(this.reader.controller.value(() => {
          this.reader.guard(); this.exact();
          if (stringField(field)) {
            if (typeof value !== 'string') throw new Error('Original CString text required');
            this.reader.effect('same live CString assignment '+field.name,field.reader,()=>reader.host.assignCString(this.strings.get(field.name)!,value));
          } else {
            if (typeof value !== 'number') throw new Error('Original numeric property required');
            if (field.typeName === 'float') {
              if (!Number.isFinite(value) || !Object.is(value,Math.fround(value))) throw new Error('Finite stored float32 setter profile required');
              this.storage.writeFloat(field.nativeOffset,value);
            } else {
              if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) throw new Error('Original signed32 property required');
              this.storage.writeInt(field.nativeOffset+(enumName(field)?4:0),value);
            }
            this.reader.note('same live property write '+field.name,field.reader);
          }
          this.reader.guard();
        }), 'ScriptRoutine physical setter') });
    }
    const empty = (candidate: NativeLivePropertySet<object>): NativeValue<void> => reader.controller.value(() => {
      this.exact(); if (candidate !== this.base) throw new Error('Actual ScriptRoutine callback receiver required');
    });
    const callbacks: NativePropertyCallbacks = { added:empty, removed:empty,
      postRead:candidate => candidate === this.base ? reader.postRead(this) : unknown('Actual ScriptRoutine PostRead receiver required') };
    this.base = new NativeLivePropertySet(wrapper.identity+':native','gCScriptRoutine_PS',45,this.values,
      { read:()=>this.owner, write:value=>{ this.owner=value; } },null,callbacks,()=>reader.controller.value(()=>{ this.exact(); return true; }));
    this.notifications = new OriginalEntityPropertySet(this.base.identity,'gCScriptRoutine_PS',this.values,null);
    Object.defineProperty(this.notifications,'owner',{ configurable:false,
      get:()=>this.base.owner.read()?.propertyOwner ?? null,
      set:(value: OriginalPropertyOwner | null)=>{
        if (value !== (this.base.owner.read()?.propertyOwner ?? null)) throw new Error('Notification owner must remain the same physical live entity');
      } });
  }
  exact(attached=true): void {
    const slot = this.reader.controller.allocations().find(value=>value.wrapper===this.wrapper);
    if (this.wrapper.deleted || slot?.propertySet!==this.base || this.base.values!==this.values ||
        attached && (this.wrapper.native!==this.base || this.base.wrapper!==this.wrapper)) throw new Error('Actual retained ScriptRoutine allocation required');
  }
  retainSPU(value: NativeRoutineEmbeddedSPU): void {
    this.reader.guard(); this.exact(false);
    if (this.embedded !== null || value.allocation !== this || typeof value.identity !== 'object' || value.identity === null) throw new Error('Fresh actual embedded SPU capability required');
    this.embedded=value; this.reader.note('same embedded SPU constructed at+64','Game:20357ca0');
  }
  spu(): NativeRoutineEmbeddedSPU {
    this.reader.guard(); if (!this.embedded) throw new Error('Actual embedded source SPU has not been constructed'); return this.embedded;
  }
  bindRoutineNotifications(bindings: OriginalRoutinePropertyBindings): void { this.exact(); bindings.bind(this.notifications); }
  debugByte(): number { return this.storage.byte(0x1f0); }
  preProcess(): NativeValue<void> { return this.reader.run(()=>{
    this.exact(); const owner=this.base.owner.read(); this.reader.note('OnPreProcess current physical GetEntity','Game:203573f0');
    this.reader.effect('embedded SPU.SetSelfEntity', 'Game:203573f0',()=>this.spu().setSelfEntity(owner));
  }); }
  process(): NativeValue<void> { return this.reader.run(()=>{
    this.exact(); const before=u32(this.reader.effect('first original timestamp','Game:20357d80',()=>this.reader.host.timestamp()));
    this.reader.note('inherited EntityPS.OnProcess literal RET','Engine:eCEntityPropertySet::OnProcess');
    const owner=this.base.owner.read();
    this.reader.effect('current owner embedded SPU.SetSelfEntity','Game:20357d80',()=>this.spu().setSelfEntity(owner));
    this.reader.effect('same embedded SPU.ProcessScript','Game:20357d80',()=>this.spu().processScript());
    const after=u32(this.reader.effect('second original timestamp','Game:20357d80',()=>this.reader.host.timestamp()));
    const admin=this.reader.effect('current ScriptAdmin getter','Game:20357d80',()=>this.reader.host.scriptAdmin());
    this.reader.effect('captured ScriptAdmin.AddProfileTicks wrapping delta','Game:20357d80',()=>admin.addProfileTicks((after-before)>>>0));
  }); }
}

export class OriginalRoutineReader {
  readonly factory: NativeReflectionFactory;
  private readonly retained = new WeakMap<NativeReflectionWrapper,OriginalRoutineProperties>();
  private readonly retainedSPUs = new WeakSet<object>();
  private active=false;
  private nestedAttempt=false;
  constructor(readonly controller: NativeReflectionController, readonly host: NativeRoutineReadingHost) {
    const root=Object.freeze({ className:'gCScriptRoutine_PS',baseClassName:'eCEntityPropertySet',fields:Object.freeze(rules.fields.map(field=>Object.freeze({...field}))) });
    this.factory={root,nativeCategory:'entity-property-set',
      cloneRoot:current=>current===controller?this.run(()=>this.construct()):unknown('Same actual reflection controller required'),
      getVersion:wrapper=>controller.value(()=>{ fact(this.properties(wrapper),'Routine version receiver').exact(); return 1; }),
      read:(wrapper,input)=>this.run(()=>this.read(wrapper,input))};
    fact(controller.registerFactory(this.factory),'Actual ScriptRoutine factory registration');
  }
  guard(): void { if(this.nestedAttempt) throw new Error('Reentrant ScriptRoutine mutation unsupported'); const reason=this.controller.receipt().required; if(reason!==null) throw new Error(reason); }
  run<T>(body:()=>T): NativeValue<T> {
    if(this.active){this.nestedAttempt=true;return this.controller.value(()=>{throw new Error('Reentrant ScriptRoutine factory/read/callback unsupported');});}
    this.active=true;this.nestedAttempt=false;
    try{return this.controller.value(()=>{this.guard();const value=body();this.guard();return value;});}finally{this.active=false;}
  }
  note(operation:string,source:string): void {this.guard();this.controller.write(operation,source);this.guard();}
  effect<T>(operation:string,source:string,body:()=>NativeValue<T>): T {this.guard();const value=this.controller.effect(operation,source,body);this.guard();return value;}
  properties(wrapper:NativeReflectionWrapper,attached=true): NativeValue<OriginalRoutineProperties> {
    const value=this.retained.get(wrapper);if(!value)return unknown('Actual retained ScriptRoutine wrapper required');
    try{value.exact(attached);return known(value);}catch(error){return unknown(String(error));}
  }
  private actual(wrapper:NativeReflectionWrapper): OriginalRoutineProperties {return fact(this.properties(wrapper),'Actual ScriptRoutine receiver');}
  private field(field:NativeReflectionField): void {if(!this.factory.root.fields.includes(field))throw new Error('Same actual ScriptRoutine descriptor required');}
  private enumCopy(value:OriginalRoutineProperties,field:NativeReflectionField&{name:RoutineEnum}): void {
    value.exact(false);
    const word=this.effect('current masked enum global '+field.name,field.defaultInitializer??'Game:20357c00',()=>this.host.enumDefault(field.name,rules.enumGlobals[field.name]));
    value.exact(false);
    u32(word.value);u32(word.knownMask);
    value.storage.writeRaw(field.nativeOffset+4,new Uint8Array([word.value&255,(word.value>>>8)&255,(word.value>>>16)&255,word.value>>>24]),
      new Uint8Array([word.knownMask&255,(word.knownMask>>>8)&255,(word.knownMask>>>16)&255,word.knownMask>>>24]));
    this.note('same enum value masked copy '+field.name,field.defaultInitializer??'Game:20357c00');
  }
  private clearString(slot:NativeRoutineCStringSlot): void {
    const pointer=slot.pointer;if(pointer===null||pointer.length===0)return;
    pointer.referenceCount=(pointer.referenceCount-1)&65535;this.note('CString.Clear reference ushort decrement','SharedBase:100149b0');
    if(pointer.referenceCount===0)this.effect('actual CString data Free','SharedBase:100149b0',()=>this.host.freeCString(pointer));
    slot.pointer=null;
  }
  private construct(): NativeReflectionWrapper {
    const wrapper=this.controller.allocateWrapper(this.factory,'Game:2035c910'),value=new OriginalRoutineProperties(wrapper,this);
    this.retained.set(wrapper,value);this.controller.retainNative(wrapper,value.base);
    this.note('base RefBase/EntityPS constructor, NULL wrapper/owner and count1','Engine:300025bd');
    value.nativeVtables.set(0,parseInt(rules.nativeVtable,16));this.note('final ScriptRoutine native vtable','Game:20357c14');
    for(const name of ['Routine','CurrentTask','LastTask','CurrentState']){value.strings.get(name)!.pointer=null;this.note('CString default constructor '+name,'Game:20357c00');}
    for(const field of this.factory.root.fields)if(enumName(field)){
      value.nativeVtables.set(field.nativeOffset,parseInt(rules.containerVtables[field.name],16));this.enumCopy(value,field);
    }
    const embedded=this.effect('actual embedded gCScriptProcessingUnit constructor','Game:20357ca0',()=>this.host.constructSPU(value,0x64));
    if(this.retainedSPUs.has(embedded.identity))throw new Error('One embedded SPU cannot belong to two physical Routine allocations');
    this.retainedSPUs.add(embedded.identity);value.retainSPU(embedded);
    value.storage.writeByte(0x1f0,0);this.note('debug byte+1f0=0','Game:20357ca6');
    if(!value.base.isValid()){value.base.createBase();this.note('Create actual IsValid false then base Create','Game:20356b90');}
    this.controller.setAllocationPhase(wrapper,'created');this.controller.attachConstructedNative(wrapper,value.base,'Game:20358b80','Game:2035c910');
    this.controller.initializeProperties(wrapper,field=>this.controller.value(()=>{
      this.guard();value.exact();this.field(field);
      if(stringField(field))this.clearString(value.strings.get(field.name)!);
      else if(enumName(field))this.enumCopy(value,field);
      else value.storage.writeInt(field.nativeOffset,0);
      this.note('actual descriptor default '+field.name,field.defaultInitializer!);
    }),()=>this.controller.value(()=>{this.guard();value.exact();this.note('PostInitialize inherited RefBase literal1','SharedBase:100076f8');}),'SharedBase:100076f8');
    this.guard();return wrapper;
  }
  private notify(value:OriginalRoutineProperties,phase:'enter'|'exit',name:string,propagated:boolean): void {
    this.guard();value.exact();const result=value.notifications.notify(phase,name,propagated);
    if(!result.supported)throw new Error(result.reason);
    this.note('actual same-store Notify '+phase+' '+name,phase==='enter'?'Engine:3003b5bb':'Engine:3001a091');
  }
  private read(wrapper:NativeReflectionWrapper,input:NativeEntityByteInput): number {
    this.actual(wrapper);return this.controller.readWrapperProperties(wrapper,input,{wrapperSource:'Game:2035ae10',dataSource:'Game:20364ee0',
      readField:(field,stream)=>this.controller.value(()=>{
        this.guard();this.field(field);stream.u16();stream.u32();this.note('descriptor version/declared length; no seek',field.reader);
        this.notify(this.actual(wrapper),'enter',field.name,true);
        const value=this.actual(wrapper); // Descriptor address is resolved after Enter.
        if(stringField(field))this.effect('actual indexed CString ownership read '+field.name,field.reader,()=>this.host.readCString(value.strings.get(field.name)!,stream));
        else if(enumName(field)){stream.u16();value.storage.writeInt(field.nativeOffset+4,stream.u32()|0);}
        else value.storage.writeRaw(field.nativeOffset,stream.take(4));
        this.note('same physical descriptor payload '+field.name,field.reader);
        this.notify(this.actual(wrapper),'exit',field.name,true); // Source re-fetches native before Exit.
      }),readNative:stream=>this.controller.value(()=>{this.guard();this.actual(wrapper);stream.u16();this.note('native Read consumes onlyu16 and returns1','Game:20356d70');})});
  }
  postRead(value:OriginalRoutineProperties): NativeValue<void> {return this.run(()=>{
    value.exact();value.storage.writeByte(0x1f0,0);this.note('GameReset debug byte+1f0=0','Game:20356a50');
    for(const [name,offset,source] of [['StatePosition',0x28,'20356a77'],['StateTime',0x24,'20356a9b'],
      ['CommandTime',0x2c,'20356abe'],['CurrentBreakBlock',0x38,'20356adf']] as const){
      this.notify(value,'enter',name,false);value.exact();value.storage.writeInt(offset,0);
      this.note('GameReset current field '+name+'=0','Game:'+source);this.notify(value,'exit',name,false);
    }
    const spu=value.spu();this.effect('same embedded SPU.GameReset','Game:20356a50',()=>spu.gameReset());
    const task=this.effect('copy current CurrentTask CString','Game:20356a50',()=>this.host.copyCString(value.strings.get('CurrentTask')!));
    this.effect('SPU.AISetTask copied argument and owned destruction','Game:20356a50',()=>spu.setTask(task,false));
    this.effect('SPU.AISetTaskPosition current field','Game:20356a50',()=>spu.setTaskPosition(value.values.TaskPosition));
    this.effect('SPU.AISetTaskTime current field','Game:20356a50',()=>spu.setTaskTime(value.values.TaskTime));
    const callback=this.effect('construct empty task callback CString','Game:20356a50',()=>this.host.constructEmptyCString());
    this.effect('SPU.AISetTaskCallback owned argument','Game:20356a50',()=>spu.setTaskCallback(callback));
    const state=this.effect('copy current CurrentState CString','Game:20356a50',()=>this.host.copyCString(value.strings.get('CurrentState')!));
    this.effect('SPU.AISetState owned copied argument','Game:20356a50',()=>spu.setState(state));
    this.effect('SPU.AISetStatePosition current field','Game:20356a50',()=>spu.setStatePosition(value.values.StatePosition));
    this.effect('SPU.AISetStateTime current field','Game:20356a50',()=>spu.setStateTime(value.values.StateTime));
    const local=this.effect('construct empty local callback CString','Game:20356a50',()=>this.host.constructEmptyCString());
    this.effect('SPU.AISetLocalCallback owned argument','Game:20356a50',()=>spu.setLocalCallback(local));
    this.note('inherited EntityPS.OnPostRead RET','Game:203573a0');
  });}
}

export async function readOriginalHeroRoutine(reader:OriginalRoutineReader): Promise<NativeValue<{
  accessor:NativeReflectionAccessor;properties:OriginalRoutineProperties;input:NativeEntityByteInput;outerVersion:1;worldResident:false;
}>> {
  const document=await loadOriginalReflectionSerialized(),packet=originalReflectionPropertyInput(document,'PC_Hero',8);
  if(packet.outerVersion!==1 || packet.source.nativeReadVersion!==1 || packet.source.className!=='gCScriptRoutine_PS' ||
      packet.source.serializedSha256!==rules.heroSerialized.serializedSha256)return unknown('Original Hero Routine packet differs');
  const accessor=reader.controller.readAccessor(packet.input);if(!accessor.known)return accessor;
  const wrapper=accessor.value.instance;if(!wrapper)return unknown('Actual Routine wrapperNULL');
  const properties=reader.properties(wrapper);if(!properties.known)return properties;
  return known({accessor:accessor.value,properties:properties.value,input:packet.input,outerVersion:1,worldResident:false});
}
