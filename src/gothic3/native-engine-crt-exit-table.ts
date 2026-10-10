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
  private constructor(readonly crt:NativeEngineCrtOwner) {
    if(!(crt instanceof NativeEngineCrtOwner)||crt.module!=='Engine')throw new Error('Actual Engine CRT owner required');
  }
  static forCrt(crt:NativeEngineCrtOwner):NativeEngineExitTable {
    const old=owners.get(crt);if(old)return old;
    const owner=new NativeEngineExitTable(crt);owners.set(crt,owner);return owner;
  }
  initialize():NativeValue<0|24> {
    if(this.#boundary)return unknown(this.#boundary);
    if(this.#completed)return known(this.#result!);
    if(this.#active)return unknown('Engine exit initializer is already executing');
    this.#active=true;
    try {
      admitAIHelperAccessorCreatorSource();
      if(source.engineExitInitialization.entry!=='3067152b'||source.engineExitInitialization.initializerSlot.bytes!=='2b156730')throw new Error('Original Engine exit initializer slot required');
      this.#trace.push('30671530.calloc(32,4).attempt');
      const allocation=this.crt.callocCrt(32,4);if(!allocation.known)throw new Error(allocation.reason);
      this.#allocation=allocation.value;
      if(allocation.value)this.#pointer=Object.freeze({fields:new NativeHeapObjectViews(allocation.value),offset:0});
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
  snapshot(){return Object.freeze({completed:this.#completed,result:this.#result,boundary:this.#boundary,allocation:this.#allocation,pointer:this.#pointer,trace:Object.freeze([...this.#trace]),registrationOwned:false,traversalOwned:false});}
}
