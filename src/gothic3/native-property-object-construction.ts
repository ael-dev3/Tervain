/** Original SharedBase constructors. No singleton registration or virtual dispatch. */
import destruction from '../../assets/gothic3/property-object-destruction/source.json';
import { NativeMemoryAdmin } from './native-memory-admin';
import type { NativeMemoryAllocation } from './native-memory-admin';
import source from '../../assets/gothic3/property-object-constructors/source.json';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeValue } from './dialogue';

for (const method of Object.values(source.methods)) Object.freeze(method);
Object.freeze(source.methods); Object.freeze(source);

function fact<T>(result:NativeValue<T>):T { if(!result.known)throw new Error(result.reason);return result.value; }
interface ConstructionProof {
 readonly fields:NativeHeapObjectViews;readonly memory:NativeMemoryAdmin;
 readonly kind:'objectType'|'namedFactory';readonly string:NativeHeapCString;
 active:boolean;destroyed:boolean;boundary:string|null;
}
const proofs=new WeakMap<NativePropertyObjectConstruction,ConstructionProof>();
function freeze(value:unknown):void { if(value&&typeof value==='object'&&!Object.isFrozen(value)) {for(const child of Object.values(value))freeze(child);Object.freeze(value);} }
freeze(destruction);
const claimed = new WeakMap<object, Set<number>>();
export class NativePropertyObjectConstruction {
  private string: NativeHeapCString | null = null;
  private constructor(readonly fields: NativeHeapObjectViews) {}
  snapshot() { return Object.freeze({ retainedStringOwner: this.string !== null, registered: false }); }

  static construct(memory: NativeMemoryAdmin, fields: NativeHeapObjectViews,
    input: { readonly kind: 'objectType'; readonly flag: number } |
      { readonly kind: 'namedFactory'; readonly name: NativeHeapCString }): NativeValue<NativePropertyObjectConstruction> {
    try {
      if (source.schema !== 'gothic3-property-object-constructors-v1' ||
          source.sharedBaseSha256 !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
          source.methods.objectType.bodyVA !== '0x10088020' || source.methods.namedFactory.bodyVA !== '0x1008d0a0' ||
          source.methods.objectType.bodyInstructionBytesSha256 !== '7242b1b70bae9ac3603cacdc6207c60116c132671fa82516789c4f2ad048a337' ||
          source.methods.namedFactory.bodyInstructionBytesSha256 !== '44f2e59ad87428827b456735e50ba25ba7a2f0c7601e9f3dfd6539c721e5752c') {
        throw new Error('Original property object constructor source differs');
      }
      if (fields.bytes.length !== 24) throw new Error('Actual 24-byte property object base view required');
      if (input.kind === 'objectType' && (!Number.isInteger(input.flag) || input.flag < 0 || input.flag > 255)) {
        throw new Error('Source BYTE flag required');
      }
      if (input.kind === 'namedFactory' && !NativeHeapCString.prototype.usesMemoryAdmin.call(input.name, memory)) {
        throw new Error('Factory name must use the same native heap');
      }
      const begin = fields.bytes.byteOffset - fields.backing.bytes.byteOffset;
      let positions = claimed.get(fields.backing.identity);
      if (positions?.has(begin)) throw new Error('Property object constructor cannot replay');
      if (!positions) { positions = new Set(); claimed.set(fields.backing.identity, positions); }
      positions.add(begin);
      const owner = new NativePropertyObjectConstruction(fields);
      const slot = (offset: number) => new NativeHeapObjectViews(fields.backing, begin + offset, 4);
      if (input.kind === 'objectType') {
        fields.writeUnsigned(0, 0x100e9d6c);
        owner.string = new NativeHeapCString(memory, slot(4));
        fields.pointer(8).set(null);
        fields.writeUnsigned(12, 0); fields.writeUnsigned(16, 0);
        const flag = fields.maskedWord(20, 1);
        // XOR/AND/XOR changes exactly bit 0; other bits retain their knowledge.
        flag.value = (flag.value & 0xfe) | (input.flag & 1);
        flag.knownMask |= 1;
      } else {
        fields.writeUnsigned(0, 0x100ea9c4);
        fields.pointer(4).set(null);
        fields.writeUnsigned(8, 0); fields.writeUnsigned(12, 0);
        fields.writeUnsigned(16, 1, 2);
        const copied = NativeHeapCString.copyForPropertyConstruction(input.name, slot(20));
        if (!copied.known) throw new Error(copied.reason);
        owner.string = copied.value;
      }
      proofs.set(owner,{fields,memory,kind:input.kind,string:owner.string!,active:false,destroyed:false,boundary:null});
      Object.defineProperty(owner,'fields',{value:fields,writable:false,configurable:false});
      return { known: true, value: owner };
    } catch (error) {
      return { known: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }
  /** Source destructor bodies; pointer arrays with live virtual destructor
   * targets stop before that unowned call, preserving the prior prefix. */
  destroy():NativeValue<void> {
    const proof=proofs.get(this);
    if(!proof)return {known:false,reason:'Actual completed property-object constructor required'};
    if(proof.active)proof.boundary??='Property-object destruction cannot reenter';
    if(proof.boundary||proof.destroyed)return {known:false,reason:proof.boundary??'Property-object lifetime ended'};
    proof.active=true;
    const fields=proof.fields,memory=proof.memory;
    const selectedMemory=()=>{
      if(fact(NativeMemoryAdmin.prototype.getInstance.call(memory))!==memory||proof.boundary) {
        throw new Error(proof.boundary??'Actual shared MemoryAdmin required');
      }
    };
    const freeArray=(offset:number)=>{
      const allocation=fields.pointer<NativeMemoryAllocation>(offset).get();
      if(allocation) {
        selectedMemory();fact(NativeMemoryAdmin.prototype.free.call(memory,allocation));
        if(proof.boundary)throw new Error(proof.boundary);
        fields.pointer(offset).set(null);fields.writeUnsigned(offset+4,0);fields.writeUnsigned(offset+8,0);
      }
    };
    const clearPointers=()=>{
      let index=0;
      while(index<fields.readUnsigned(12)) {
        const allocation=fields.pointer<NativeMemoryAllocation>(8).get();
        if(!allocation)throw new Error('Original property pointer clear reaches NULL array storage');
        const entry=new NativeHeapObjectViews(allocation,index*4,4);
        if(entry.pointer(0).get()!==null)throw new Error('Original property pointer clear requires its live vtable+0x58 destructor owner');
        index++;
      }
      freeArray(8);
    };
    try {
      const method=proof.kind==='objectType'?destruction.methods.destroyObjectType:destruction.methods.destroyNamedFactory;
      if(destruction.schema!=='gothic3-property-object-destruction-v1'||destruction.sharedBaseSha256!==source.sharedBaseSha256||
        method.bodyVA!==(proof.kind==='objectType'?'0x100880a0':'0x1008d110')||
        method.bodyInstructionBytesSha256!==(proof.kind==='objectType'?'8486b7a063c0d4369cb54297da8f4236128958875e998c2bebedfb130626413f':'eead719707a13201e1cd468ecfd91bcd383b1a0246fd15a15de08cee1216c83c')||
        destruction.methods.clearPropertyPointers.bodyVA!=='0x10088720'||
        destruction.methods.clearPropertyPointers.bodyInstructionBytesSha256!=='7857fd68c81ff03a9c44720e835dbc9fd61c74089f12c1e107cc5b61b4a435c6') {
        throw new Error('Original property-object destruction source differs');
      }
      if(this.fields!==fields)throw new Error('Actual retained property-object fields required');
      fields.writeUnsigned(0,proof.kind==='objectType'?0x100e9d6c:0x100ea9c4);
      if(proof.kind==='objectType') {
        clearPointers();clearPointers();
        freeArray(8);freeArray(8);
        fact(NativeHeapCString.prototype.destroy.call(proof.string));
      } else {
        fact(NativeHeapCString.prototype.destroy.call(proof.string));
        if(proof.boundary)throw new Error(proof.boundary);
        freeArray(4);freeArray(4);
      }
      if(proof.boundary)throw new Error(proof.boundary);
      proof.destroyed=true;return {known:true,value:undefined};
    } catch(error) {
      proof.boundary??=error instanceof Error?error.message:String(error);
      return {known:false,reason:proof.boundary};
    } finally {proof.active=false;}
  }

}
