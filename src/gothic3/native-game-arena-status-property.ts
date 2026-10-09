/** Original first Arena property initializer. Its retained prefix does not
 * certify completion of Create, registration, __cinit or NPC activation. */
import type { NativeValue } from './dialogue';
import { NativeGameCrtOwner } from './native-game-crt';
import { NativeGameArenaType } from './native-game-arena-type';
import { NativeGameArenaClassName } from './native-game-arena-class-name';
import { NativeGameArenaStatusClassName } from './native-game-arena-status-class-name';
import registration from '../../assets/gothic3/arena-property-registration/source.json';
import { NativePropertyTemplateArray } from './native-property-template-array';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeMemoryAdmin } from './native-memory-admin';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeSharedMessageDebug } from './native-shared-message-debug';
import { NativePropertyTypeConstruction } from './native-property-type-construction';
import { admitGameArenaStatusSource } from './native-game-arena-status-source';
import {NativeGameExitTable} from './native-game-crt-exit-table';

const owners = new WeakMap<NativeGameCrtOwner, NativeGameArenaStatusProperty>();
const token = Object.freeze({});
function fact<T>(result: NativeValue<T>): T {
  if (!result.known) throw new Error(result.reason);
  return result.value;
}
export class NativeGameArenaStatusProperty {
  readonly fields: NativeHeapObjectViews;
  #temporary: NativeHeapCString | null = null;
  #base: NativePropertyTypeConstruction | null = null;
  #arena: NativeGameArenaType;
  #active = false;
  #created = false;
  #descriptorStored = false;
  #propertyRegistered = false;
  #temporaryDestroyed = false;
  #initializerReturned = false;
  #diagnosticNames:Readonly<{propertyName:NativeHeapCString;typeName:NativeHeapCString}>|null=null;
  #boundary: string | null = null;
  #trace: string[] = [];
  private constructor(readonly crt: NativeGameCrtOwner, private readonly memory: NativeMemoryAdmin, proof: object) {
    if (proof !== token || NativeGameCrtOwner.forPlatform(crt.host) !== crt) throw new Error('Canonical Game owner required');
    admitGameArenaStatusSource();
    if(registration.sharedBaseSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
      registration.methods.unregisterPropertyTemplate.bodyInstructionBytesSha256!=='3427dbf37cc26b0f7b862cebf86971b467d7eb489a27ce04b788e4d35631653a')throw new Error('Original SharedBase unregister source differs');
    this.#arena = NativeGameArenaType.forCrt(crt,memory);
    this.fields = crt.imageStorage('arenaStatusDescriptor');
    const receipt = crt.sourceProfile.heapRules.methods['arenaStatus.statusInitializer'];
    if (receipt?.entry !== '204b1dd0' || receipt.body !== '204b1dd0' || this.fields.bytes.length !== 36) {
      throw new Error('Original first Arena initializer and descriptor required');
    }
    const ctor = crt.sourceProfile.heapRules.imports?.Game?.find(row => row.iatVA === '0x207d8794');
    if (ctor?.module !== 'SharedBase.dll' || ctor.name !== '??0bCPropertyTypeBase@@IAE@ABVbCString@@W4bEPropertyType@@@Z') {
      throw new Error('Original SharedBase property constructor import differs');
    }
    for (const key of ['crt','memory','fields'] as const) Object.defineProperty(this,key,{value:this[key],writable:false,configurable:false});
  }
  static forCrt(crt:NativeGameCrtOwner,memory:NativeMemoryAdmin):NativeGameArenaStatusProperty {
    const old=owners.get(crt);
    if(old) {if(old.memory!==memory)throw new Error('Status property cannot change its SharedBase heap');return old;}
    const owner=new NativeGameArenaStatusProperty(crt,memory,token);owners.set(crt,owner);return owner;
  }
  #propertyIndex():number {
    const receipt=registration.methods.getPropertyTemplateIndex;
    if(receipt.bodyVA!=='0x10087e80'||receipt.bodyInstructionBytesSha256!=='3ad129ad47522550461403313934e7b7816928da56f40116385aaae4b7f72ca8')throw new Error('Original property lookup source differs');
    if(this.fields.readUnsigned(0)!==0x20659aec || this.crt.imageStorage('arenaStatusVtable').readUnsigned(16)!==0x2001af23)throw new Error('Actual Status owner virtual slot required');
    const owner=this.fields.pointer<NativeHeapObjectViews>(24).get();
    if(owner!==this.#arena.fields)throw new Error('Actual retained Arena descriptor owner required');
    const className=NativeGameArenaClassName.forCrt(this.crt,this.memory);
    const invokeName=(receiver:NativeHeapObjectViews)=>{
      if(receiver.readUnsigned(0)!==0x2065915c || this.crt.imageStorage('arenaTypeClassNameSlot').readUnsigned(0)!==0x2001d278)throw new Error('Actual Arena class-name virtual slot required');
      const result=fact(NativeGameArenaClassName.prototype.get.call(className));if(this.#boundary)throw new Error(this.#boundary);return result;
    };
    const receiverName=invokeName(this.#arena.fields);
    const ownerName=invokeName(owner);
    const equal=fact(NativeHeapCString.prototype.equalsCString.call(ownerName,receiverName));
    this.#trace.push('10087ea7.compareActualTypeNames');
    if(!equal)return -1;
    const count=this.#arena.fields.readUnsigned(12)|0;
    for(let index=0;index<count;index++) {
      const array=this.#arena.fields.pointer<{identity:object;bytes:Uint8Array;knownMask:Uint8Array;freed:boolean}>(8).get();
      if(!array)throw new Error('Original property lookup dereferences NULL array');
      const slot=new NativeHeapObjectViews(array,index*4,4);
      if(slot.pointer(0).get()===this.fields)return index;
    }
    return -1;
  }
  #create():void {
    if(registration.methods.createProperty.bodyInstructionBytesSha256!=='a4d5d84016666096a7dc09286b4f07c4c3c6c5d139718223bdfa9d8eaf146650' ||
      this.fields.readUnsigned(0)!==0x20659aec || this.crt.imageStorage('arenaStatusVtable').readUnsigned(0x48)!==0x2002ad8d)throw new Error('Original Create dispatch differs');
    this.#trace.push('10088ad0.dispatch2002ad8d');
    if(registration.methods.destroyProperty.bodyVA!=='0x10088ac0'||registration.methods.destroyProperty.bodyInstructionBytesSha256!=='ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e')throw new Error('Original no-op property destruction differs');
    this.#trace.push('20070f23.baseDestroy.return');
    if(this.fields.pointer(32).get()!==null)throw new Error('Unowned non-NULL Status default storage reset');
    this.#trace.push('20070e9c.NULLdefault.return');
    const index=this.#propertyIndex();
    if(index!==-1) {
      const fields=this.#arena.fields;
      const array=new NativePropertyTemplateArray(new NativeHeapObjectViews(fields.backing,fields.bytes.byteOffset-fields.backing.bytes.byteOffset+8,12),this.memory);
      fact(array.remove(index));
      throw new Error('Unowned property unregistration diagnostic after actual removal');
    }
    this.#trace.push('10087fcc.unregisterAbsent.return0');
    this.#created=true;
  }
  #register():boolean {
    if(registration.methods.registerPropertyTemplate.bodyVA!=='0x10088130'||registration.methods.registerPropertyTemplate.bodyInstructionBytesSha256!=='b7f5b904cda05bf757443b27f2c272c97a9a885fd838368ed45b9fd687186fa6')throw new Error('Original property registration source differs');
    const index=this.#propertyIndex();
    if(index!==-1)throw new Error('Unowned duplicate property registration warning');
    const type=this.#arena.fields;
    const arrayFields=new NativeHeapObjectViews(type.backing,type.bytes.byteOffset-type.backing.bytes.byteOffset+8,12);
    const requested=(arrayFields.readUnsigned(4)+1)>>>0;
    const array=new NativePropertyTemplateArray(arrayFields,this.memory);
    fact(NativePropertyTemplateArray.prototype.reserve.call(array,requested,requested===0?0xffffffff:0));
    if(this.#boundary)throw new Error(this.#boundary);
    const allocation=arrayFields.pointer<{identity:object;bytes:Uint8Array;knownMask:Uint8Array;freed:boolean}>(0).get();
    if(!allocation)throw new Error('Original registration dereferences NULL pointer array');
    const slot=new NativeHeapObjectViews(allocation,((requested*4-4)>>>0),4);
    arrayFields.writeUnsigned(4,requested);
    slot.pointer(0).set(this.fields);
    this.#descriptorStored=true;
    this.#trace.push('10088172.storeActualPropertyPointer');
    if(this.fields.readUnsigned(0)!==0x20659aec||this.crt.imageStorage('arenaStatusVtable').readUnsigned(12)!==0x2000185c)throw new Error('Actual Status type-name virtual slot required');
    const typeName=fact(NativeGameArenaStatusClassName.prototype.get.call(NativeGameArenaStatusClassName.forCrt(this.crt,this.memory)));
    if(this.#boundary)throw new Error(this.#boundary);
    const propertyName=fact(NativePropertyTypeConstruction.prototype.getName.call(this.#base!));
    const typeText=fact(NativeHeapCString.prototype.getTextPointer.call(typeName));
    const propertyText=fact(NativeHeapCString.prototype.getTextPointer.call(propertyName));
    this.#diagnosticNames=Object.freeze({propertyName,typeName});
    this.#trace.push('10088186.loadDiagnosticTextPointers');
    const diagnostic=NativeSharedMessageDebug.forPlatform(this.crt.host.platform as NativeRuntimePlatform);
    const result=NativeSharedMessageDebug.prototype.registerProperty.call(diagnostic,propertyText,typeText);
    if(!result.known)throw new Error('Property registration Message.Debug at 10088191: '+result.reason);
    this.#propertyRegistered=true;
    this.#trace.push('1008819e.propertyRegistration.return1');
    return true;
  }
  initialize():NativeValue<void> {
    if(this.#boundary)return {known:false,reason:this.#boundary};
    if(this.#initializerReturned)return {known:true,value:undefined};
    if(this.#active) {this.#boundary='Reentrant first Arena property initializer';return {known:false,reason:this.#boundary};}
    this.#active=true;
    try {
      if(this.crt.imageStorage('arenaStatusDescriptor')!==this.fields)throw new Error('Actual Game descriptor storage required');
      const temporarySlot=new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(4),knownMask:new Uint8Array(4),freed:false});
      this.#temporary=NativeHeapCString.beginTextConstruction(this.memory,temporarySlot);
      fact(NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.crt.host.platform as NativeRuntimePlatform,
        this.crt,'arenaStatusLiteral',0,7));
      fact(this.#temporary.constructText({fields:this.crt.imageStorage('arenaStatusLiteral'),offset:0}));
      if(this.#boundary)throw new Error(this.#boundary);
      this.#trace.push('204b1dda.Status.textConstructor');
      const base=new NativeHeapObjectViews(this.fields.backing,this.fields.bytes.byteOffset-this.fields.backing.bytes.byteOffset,24);
      this.#base=fact(NativePropertyTypeConstruction.construct(this.memory,base,{name:this.#temporary,propertyType:2}));
      if(this.#boundary)throw new Error(this.#boundary);
      this.#trace.push('204b1dec.propertyBaseConstructor');
      this.fields.writeUnsigned(0,0x20659aec);
      this.#trace.push('204b1df2.derivedVtable');
      const arena=fact(NativeGameArenaType.prototype.get.call(this.#arena));
      if(this.#boundary)throw new Error(this.#boundary);
      this.fields.pointer<NativeHeapObjectViews>(24).set(arena);
      this.fields.writeUnsigned(28,20);
      this.fields.pointer(32).set(null);
      this.#trace.push('204b1e15.ownerOffsetAndDefaultStored');
      this.#create();
      this.#register();
      fact(NativeHeapCString.prototype.destroy.call(this.#temporary));
      this.#temporaryDestroyed=true;
      this.#trace.push('204b1e39.temporaryCString.destroy');
      const exit=NativeGameExitTable.forCrt(this.crt);
      const callback=fact(exit.callbackForMethod('arenaStatusCleanup'));
      const registered=fact(exit.atexit(callback));
      this.#trace.push(registered===0?'204b1e44.cleanup.registered':'204b1e44.cleanup.returnMinusOne');
      this.#initializerReturned=true;
      this.#trace.push('204b1e4c.initializer.return');
      return {known:true,value:undefined};
    } catch(error) {
      this.#boundary ??= error instanceof Error ? error.message : String(error);
      return {known:false,reason:this.#boundary};
    } finally {this.#active=false;}
  }
  snapshot() {return Object.freeze({boundary:this.#boundary,temporaryName:this.#temporary,
    baseConstructed:this.#base!==null,createCompleted:this.#created,descriptorStored:this.#descriptorStored,
    diagnosticNames:this.#diagnosticNames,trace:Object.freeze([...this.#trace]),
    temporaryDestroyed:this.#temporaryDestroyed,
    initializerReturned:this.#initializerReturned,propertyRegistered:this.#propertyRegistered,wholeCrtTraversalCompleted:false});}
}
