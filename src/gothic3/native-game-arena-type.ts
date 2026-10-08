/** Selected original Game Arena type singleton, including SharedBase type
 * registration. This owner does not traverse Game __cinit or activate an NPC. */
import type { NativeValue } from './dialogue';
import registration from '../../assets/gothic3/property-registration-lifecycle/source.json';
import { NativeGameCrtOwner } from './native-game-crt';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeMemoryAdmin } from './native-memory-admin';
import type { NativeMemoryAllocation } from './native-memory-admin';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativePropertyObjectConstruction } from './native-property-object-construction';
import { NativeGameArenaClassName } from './native-game-arena-class-name';
import { NativeGameExitTable } from './native-game-crt-exit-table';
import type { NativeGameCrtCallback } from './native-game-crt-exit-table';
import { NativePropertySingleton } from './native-property-singleton';
import { NativePropertyTypeTable } from './native-property-type-table';
import { admitNativeGameCrtSource, nativeGameImageReceipt } from './native-game-crt-profile';
import { admitGameArenaTypeSource } from './native-game-arena-type-source';
import { admitGameArenaSource } from './native-game-arena-class-name-source';

function fact<T>(result:NativeValue<T>):T { if(!result.known)throw new Error(result.reason);return result.value; }
const owners=new WeakMap<NativeGameCrtOwner,NativeGameArenaType>();
const token=Object.freeze({});
export class NativeGameArenaType {
  readonly storage:NativeHeapObjectViews;
  readonly fields:NativeHeapObjectViews;
  readonly base:NativeHeapObjectViews;
  readonly factory:NativeHeapObjectViews;
  #baseOwner:NativePropertyObjectConstruction|null=null;
  #factoryOwner:NativePropertyObjectConstruction|null=null;
  #className:NativeGameArenaClassName;
  #exit:NativeGameExitTable;
  #callback:NativeGameCrtCallback|null=null;
  #wrapper:NativeMemoryAllocation|null=null;
  #slot:NativeHeapObjectViews|null=null;
  #boundary:string|null=null;
  #registered=false;
  #constructed=false;
  #active=false;
  #destroyed=false;
  #trace:string[]=[];
  private constructor(readonly crt:NativeGameCrtOwner,private readonly memory:NativeMemoryAdmin,grant:object) {
    if(grant!==token||crt.module!=='Game'||NativeGameCrtOwner.forPlatform(crt.host)!==crt)throw new Error('Canonical Game CRT required for Arena type');
    const platform=crt.host.platform;
    if(!(platform instanceof NativeRuntimePlatform)||!NativeRuntimePlatform.isRetainedPlatform(platform)||
      !NativeMemoryAdmin.prototype.usesPlatform.call(memory,platform))throw new Error('Actual same-platform SharedBase heap required');
    admitNativeGameCrtSource();admitGameArenaTypeSource();admitGameArenaSource();
    const receipt=nativeGameImageReceipt('arenaTypeAndGuard');
    if(receipt.address!=='207b4f64'||receipt.bytes!==64)throw new Error('Original Arena type storage differs');
    const imports=[
      ['207d870c','??0bCPropertyObjectTypeBase@@IAE@_N@Z'],
      ['207d8710','??0bCPropertyObjectFactory@@QAE@ABVbCString@@@Z'],
      ['207d8714','?RegisterTemplate@bCPropertyObjectSingleton@@QAE_NPBVbCPropertyObjectTypeBase@@@Z'],
      ['207d8868','?GetInstance@bCPropertyObjectSingleton@@SGAAV1@XZ'],
      ['207d87a0','??1bCPropertyObjectFactory@@UAE@XZ'],
      ['207d87a4','??1bCPropertyObjectTypeBase@@UAE@XZ'],
    ];
    for(const [address,name] of imports) {
      const imported=crt.sourceProfile.heapRules.imports?.Game?.find(row=>row.iatVA==='0x'+address);
      if(!imported||imported.module!=='SharedBase.dll'||imported.name!==name||imported.ordinal!==null)throw new Error('Original Arena import differs: '+address);
    }
    this.storage=crt.imageStorage('arenaTypeAndGuard');
    const begin=this.storage.bytes.byteOffset-this.storage.backing.bytes.byteOffset;
    this.fields=new NativeHeapObjectViews(this.storage.backing,begin,60);
    this.base=new NativeHeapObjectViews(this.storage.backing,begin,24);
    this.factory=new NativeHeapObjectViews(this.storage.backing,begin+24,24);
    this.#className=NativeGameArenaClassName.forCrt(crt,memory);
    this.#exit=NativeGameExitTable.forCrt(crt);
    for(const key of ['crt','memory','storage','fields','base','factory'] as const)Object.defineProperty(this,key,{value:this[key],writable:false,configurable:false});
  }
  static forCrt(crt:NativeGameCrtOwner,memory:NativeMemoryAdmin):NativeGameArenaType {
    const prior=owners.get(crt);
    if(prior) {if(prior.memory!==memory)throw new Error('Arena type cannot change its SharedBase heap');return prior;}
    const owner=new NativeGameArenaType(crt,memory,token);owners.set(crt,owner);return owner;
  }
  #retain():void {
    if(owners.get(this.crt)!==this||this.crt.imageStorage('arenaTypeAndGuard')!==this.storage||
      !NativeMemoryAdmin.prototype.usesPlatform.call(this.memory,this.crt.host.platform))throw new Error('Actual retained Arena type storage and heap required');
  }
  #call<T>(label:string,operation:()=>NativeValue<T>,retain?:(value:T)=>void):T {
    this.#trace.push(label+'.attempt');
    const result=operation();
    if(result.known)retain?.(result.value);
    if(this.#boundary)throw new Error(this.#boundary);
    const value=fact(result);this.#trace.push(label);return value;
  }
  /** The actual RegisterTemplate body for this original canonical type. The
   * receiver vtable and its slot are loaded after wrapper allocation. */
  #register(singleton:NativePropertySingleton):void {
    const method=registration.methods.registerType;
    if(registration.sharedBaseSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'||
      method.entryVA!=='0x1000191f'||method.bodyVA!=='0x100904d0'||
      method.bodyInstructionBytesSha256!=='0c455f701cd98d32fc6c2ee4e95b08504e9bd9de2c95313b66f70a5be3bb5a20')throw new Error('Original SharedBase RegisterTemplate source differs');
    this.#wrapper=this.#call('SharedBase.taggedNew4.ed',()=>NativeMemoryAdmin.prototype.newObject.call(this.memory,4,0xed),value=>{this.#wrapper=value;});
    if(this.#wrapper)new NativeHeapObjectViews(this.#wrapper,0,4).pointer(0).set(this.fields);
    const vtable=this.fields.readUnsigned(0);
    if(vtable!==0x2065915c)throw new Error('Arena RegisterTemplate reaches an unowned type vtable');
    const entry=this.crt.imageStorage('arenaTypeClassNameSlot').readUnsigned(0);
    if(entry!==0x2001d278)throw new Error('Arena RegisterTemplate reaches an unowned class-name virtual entry');
    // The independent source package pins all three forwarding jumps from this
    // original virtual slot to the admitted class-name getter body.
    admitGameArenaSource();
    const name=this.#call('Game.Arena.virtualClassName2001d278',()=>NativeGameArenaClassName.prototype.get.call(this.#className));
    const table=this.#call('SharedBase.propertySingleton.table',()=>NativePropertySingleton.prototype.table.call(singleton));
    const index=new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(4),knownMask:new Uint8Array(4),freed:false});
    this.#slot=this.#call('SharedBase.typeTable.lookupOrInsert',()=>NativePropertyTypeTable.prototype.getOrInsertSlot.call(table,name,index),value=>{this.#slot=value;});
    this.#slot.pointer(0).set(this.#wrapper);
    this.#registered=true;this.#trace.push('SharedBase.RegisterTemplate.return1');
  }
  get():NativeValue<NativeHeapObjectViews> {
    if(this.#boundary||this.#destroyed)return {known:false,reason:this.#boundary??'Arena type lifetime ended'};
    let executing=false;
    try {
      this.#retain();
      const guard=this.storage.maskedWord(60,4);
      if((guard.knownMask&1)===0)throw new Error('Actual Arena type guard bit is unknown');
      if((guard.value&1)!==0)return {known:true,value:this.fields};
      if(this.#active)throw new Error('Arena cold constructor cannot replay');
      this.#active=true;executing=true;
      guard.value=(guard.value|1)>>>0;guard.knownMask=(guard.knownMask|1)>>>0;
      this.#trace.push('Game.Arena.type.guard1');
      this.#baseOwner=this.#call('SharedBase.propertyTypeBase.construct',()=>NativePropertyObjectConstruction.construct(this.memory,this.base,{kind:'objectType',flag:1}),value=>{this.#baseOwner=value;});
      this.fields.writeUnsigned(0,0x2065915c);this.#trace.push('Game.Arena.type.vtable2065915c');
      const name=this.#call('Game.Arena.directClassName20031fca',()=>NativeGameArenaClassName.prototype.get.call(this.#className));
      this.#factoryOwner=this.#call('SharedBase.namedFactory.construct',()=>NativePropertyObjectConstruction.construct(this.memory,this.factory,{kind:'namedFactory',name}),value=>{this.#factoryOwner=value;});
      const platform=this.crt.host.platform as NativeRuntimePlatform;
      const singleton=this.#call('SharedBase.propertySingleton.owner',()=>NativePropertySingleton.forPlatform(platform,this.memory));
      this.#call('SharedBase.propertySingleton.GetInstance',()=>NativePropertySingleton.prototype.get.call(singleton));
      this.#register(singleton);
      const callback=this.#call('Game.Arena.typeCleanup.capability',()=>NativeGameExitTable.prototype.callbackForMethod.call(this.#exit,'arenaTypeCleanup'));
      const result=this.#call('Game.Arena.typeCleanup.atexit',()=>NativeGameExitTable.prototype.atexit.call(this.#exit,callback));
      if(result===0)this.#callback=callback;
      this.#constructed=true;this.#trace.push('Game.Arena.type.return207b4f64');
      return {known:true,value:this.fields};
    } catch(error) {this.#boundary??=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
    finally {if(executing)this.#active=false;}
  }
  /** Selected registered callback body; Game exit-table traversal is separate. */
  invokeRegisteredCleanup(callback:NativeGameCrtCallback):NativeValue<void> {
    if(callback!==this.#callback||!this.#constructed||!this.#baseOwner||!this.#factoryOwner)return {known:false,reason:'Actual registered Arena type cleanup capability required'};
    if(this.#boundary||this.#destroyed)return {known:false,reason:this.#boundary??'Arena type lifetime ended'};
    if(this.#active) {this.#boundary='Arena cleanup cannot reenter construction';return {known:false,reason:this.#boundary};}
    this.#active=true;
    try {
      this.#retain();this.fields.writeUnsigned(0,0x2065915c);this.#trace.push('Game.Arena.cleanup.restore-derived-vtable');
      this.#call('SharedBase.namedFactory.destroy',()=>NativePropertyObjectConstruction.prototype.destroy.call(this.#factoryOwner!));
      this.#call('SharedBase.propertyTypeBase.destroy',()=>NativePropertyObjectConstruction.prototype.destroy.call(this.#baseOwner!));
      this.#destroyed=true;return {known:true,value:undefined};
    } catch(error) {this.#boundary??=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
    finally {this.#active=false;}
  }
  snapshot() {return Object.freeze({boundary:this.#boundary,constructed:this.#constructed,registered:this.#registered,
    destroyed:this.#destroyed,wrapper:this.#wrapper,slot:this.#slot,callback:this.#callback,trace:Object.freeze([...this.#trace]),
    wholeCrtTraversalCompleted:false,liveNpcActivated:false});}
}
