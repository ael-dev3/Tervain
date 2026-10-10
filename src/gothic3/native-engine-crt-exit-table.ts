import source from '../../assets/gothic3/ai-helper-accessor-creator-startup/research.json';
import {admitAIHelperAccessorCreatorSource} from './native-game-ai-helper-accessor-creator-source';
import {NativeEngineCrtOwner} from './native-engine-crt-locks';
import {NativeHeapObjectViews} from './native-heap-views';
import type {NativeMemoryBacking} from './native-memory-admin';
import type {NativeBytePointer} from './native-pointer-geometry';
import type {NativeValue} from './dialogue';

const owners=new WeakMap<NativeEngineCrtOwner,NativeEngineExitTable>();
const known=<T>(value:T):NativeValue<T>=>({known:true,value});
const unknown=<T>(reason:string):NativeValue<T>=>({known:false,reason});
export interface NativeEngineExitCallback {readonly module:'Engine';readonly entry:'30797fc0';readonly identity:object;}
function cold(label:'exitBegin'|'exitEnd'):NativeHeapObjectViews {
  admitAIHelperAccessorCreatorSource();
  const row=source.engineExitInitialization.images.find(row=>row.label===label);
  if(!row||row.bytes!==4||row.raw!=='00000000'||row.address!==(label==='exitBegin'?'30af7e80':'30af7e7c'))throw new Error('Original Engine exit global required');
  return new NativeHeapObjectViews({identity:Object.freeze({module:'Engine',address:row.address}),bytes:new Uint8Array(4),knownMask:new Uint8Array(4).fill(255),freed:false});
}

/** Engine3067152b's initializer. Registration and shutdown traversal are separate
 * continuations; this owner never substitutes the Game CRT's table or heap. */
export class NativeEngineExitTable {
  readonly begin=cold('exitBegin');
  readonly end=cold('exitEnd');
  #allocation:NativeMemoryBacking|null=null;
  #pointer:NativeBytePointer|null=null;
  #completed=false;
  #result:0|24|null=null;
  #boundary:string|null=null;
  #active=false;
  readonly #trace:string[]=[];
  #callback:NativeEngineExitCallback|null=null;
  readonly #cells:{readonly allocation:NativeMemoryBacking;readonly offset:number;readonly callback:NativeEngineExitCallback|null}[]=[];
  private constructor(readonly crt:NativeEngineCrtOwner) {
    if(!(crt instanceof NativeEngineCrtOwner)||crt.module!=='Engine')throw new Error('Actual Engine CRT owner required');
  }
  static forCrt(crt:NativeEngineCrtOwner):NativeEngineExitTable {
    const old=owners.get(crt);if(old)return old;
    const owner=new NativeEngineExitTable(crt);owners.set(crt,owner);return owner;
  }
  initialize():NativeValue<0|24> {
    if(this.#boundary)return unknown(this.#boundary);
    if(this.#active)return unknown('Engine exit initializer is already executing');
    this.#active=true;
    this.#completed=false;this.#result=null;
    try {
      admitAIHelperAccessorCreatorSource();
      if(source.engineExitInitialization.entry!=='3067152b'||source.engineExitInitialization.initializerSlot.bytes!=='2b156730')throw new Error('Original Engine exit initializer slot required');
      this.#trace.push('30671530.calloc(32,4).attempt');
      const allocation=this.crt.callocCrt(32,4);if(!allocation.known)throw new Error(allocation.reason);
      this.#allocation=allocation.value;
      this.#pointer=allocation.value?Object.freeze({fields:new NativeHeapObjectViews(allocation.value),offset:0}):null;
      this.#trace.push('30671530.calloc.return');
      const encoded=this.crt.encodePointer(this.#pointer);if(!encoded.known)throw new Error(encoded.reason);
      this.begin.pointer(0).set(encoded.value);this.#trace.push('30671542.begin.store');
      this.end.pointer(0).set(encoded.value);this.#trace.push('30671547.end.store');
      if(this.#allocation){this.#pointer!.fields.writeUnsigned(0,0);this.#trace.push('30671553.first.cell.zero');this.#result=0;}
      else this.#result=24;
      this.#completed=true;return known(this.#result);
    } catch(error) {
      this.#boundary='Engine exit initializer3067152b: '+(error instanceof Error?error.message:String(error));
      return unknown(this.#boundary);
    } finally {this.#active=false;}
  }
  moduleShutdownCallback():NativeEngineExitCallback {
    admitAIHelperAccessorCreatorSource();
    const row=source.engineExitInitialization.shutdownCallback;
    if(row.entry!=='30797fc0'||row.raw!=='b9789ead30e9663b88ff')throw new Error('Original Engine ModuleAdmin callback required');
    return this.#callback??=Object.freeze({module:'Engine',entry:'30797fc0',identity:Object.freeze({})});
  }
  atexit(callback:NativeEngineExitCallback|null):NativeValue<0|-1> {
    if(this.#boundary)return unknown(this.#boundary);
    if(this.#active)return unknown('Engine exit table is already executing');
    if(callback!==null&&callback!==this.#callback)return unknown('Same Engine exit owner callback required');
    if(!this.#completed||this.#result!==0||!this.#allocation||!this.#pointer)return unknown('Original Engine exit initialization must return successfully');
    this.#active=true;
    try {
      const take=<T>(result:NativeValue<T>):T=>{if(!result.known)throw new Error(result.reason);return result.value;};
      take(this.crt.lock(8));this.#trace.push('3067cfe8.lock8');
      const begin=take(this.crt.decodePointer(this.begin.pointer<object>(0).get())) as NativeBytePointer|null;
      const end=take(this.crt.decodePointer(this.end.pointer<object>(0).get())) as NativeBytePointer|null;
      if(!begin||!end||begin.fields!==this.#pointer.fields||end.fields!==begin.fields||begin.offset!==0||!Number.isInteger(end.offset)||end.offset<0||end.offset>this.#allocation.bytes.length||(end.offset&3)!==0||this.#allocation.freed)throw new Error('Actual live same-allocation Engine exit pointers required');
      const size=take(this.crt.msize(begin));
      if(size<end.offset+4)throw new Error('Original Engine exit table growth3067ca49 is not connected');
      if(end.offset+4>this.#allocation.bytes.length)throw new Error('Owned Engine callback cell required');
      const encoded=take(this.crt.encodePointer(callback));begin.fields.pointer(end.offset).set(encoded);
      this.#cells.push(Object.freeze({allocation:this.#allocation,offset:end.offset,callback}));this.#trace.push('3067150b.callback.store');
      const next=Object.freeze({fields:begin.fields,offset:end.offset+4});
      this.end.pointer(0).set(take(this.crt.encodePointer(next)));this.#trace.push('30671517.end.store');
      take(this.crt.unlock(8));this.#trace.push('3067cff1.unlock8');
      return known(callback===null?-1:0);
    } catch(error){this.#boundary='Engine onexit3067155a: '+(error instanceof Error?error.message:String(error));return unknown(this.#boundary);}
    finally{this.#active=false;}
  }
  snapshot(){return Object.freeze({completed:this.#completed,result:this.#result,boundary:this.#boundary,allocation:this.#allocation,pointer:this.#pointer,callbackCells:Object.freeze([...this.#cells]),trace:Object.freeze([...this.#trace]),registrationOwned:'within-current-capacity',traversalOwned:false});}
}
