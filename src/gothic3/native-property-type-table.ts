/** Original SharedBase string-keyed table operations, over retained fields.
 * This does not create the singleton or invoke a type's class-name virtual. */
import source from '../../assets/gothic3/property-registration-lifecycle/source.json';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeMemoryAdmin } from './native-memory-admin';
import { NativePropertyTemplateArray } from './native-property-template-array';
import type { NativeMemoryAllocation } from './native-memory-admin';
import type { NativeValue } from './dialogue';

function fact<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
const constructed = new WeakMap<object, Set<number>>();
class Node {
  constructor(readonly fields: NativeHeapObjectViews, readonly name: NativeHeapCString,
    readonly memory: NativeMemoryAdmin) {}
}
export class NativePropertyTypeTable {
  private active = false;
  private boundary: string | null = null;
  constructor(readonly fields: NativeHeapObjectViews, private readonly memory: NativeMemoryAdmin) {
    if (fields.bytes.length !== 16 || source.sharedBaseSha256 !==
        '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
        source.methods.findTypeSlot.bodyVA !== '0x10090ac0' || source.methods.lookupTypeSlot.bodyVA !== '0x10090e30' ||
        source.methods.findTypeSlot.bodyInstructionBytesSha256 !== 'b18d216888a9b6639c354c0e97ee63325d832fa63e05628b15f9c243dc6eb1d6' ||
        source.methods.lookupTypeSlot.bodyInstructionBytesSha256 !== '4bf9956a530c2f03466f5a649f55ab39064e1d489a07e8bca6db69efa00c8801') {
      throw new Error('Original property type table and actual 16-byte fields required');
    }
  }
  /** Original 100911d0 fresh constructor. Singleton clearing/growth is separate. */
  static construct(memory: NativeMemoryAdmin, fields: NativeHeapObjectViews): NativeValue<NativePropertyTypeTable> {
    try {
      const table = new NativePropertyTypeTable(fields, memory);
      if (source.methods.constructTypeTable.bodyVA !== '0x100911d0' ||
          source.methods.constructTypeTable.bodyInstructionBytesSha256 !== 'e52e47a0da18415be5b9c59cb833ddbdb7d546060eaf327830e554dd2c407431') {
        throw new Error('Original type table constructor source differs');
      }
      const position = fields.bytes.byteOffset - fields.backing.bytes.byteOffset;
      let claimed = constructed.get(fields.backing.identity);
      if (claimed?.has(position)) throw new Error('Property table constructor cannot replay');
      if (!claimed) { claimed = new Set(); constructed.set(fields.backing.identity, claimed); }
      claimed.add(position);
      fields.pointer(0).set(null);
      fields.writeUnsigned(4, 0); fields.writeUnsigned(8, 0); fields.writeUnsigned(12, 0);
      const begin = fields.bytes.byteOffset - fields.backing.bytes.byteOffset;
      const array = new NativePropertyTemplateArray(new NativeHeapObjectViews(fields.backing, begin, 12), memory, 'typeTable');
      fact(array.reserve(43, 0));
      fields.writeUnsigned(4, 43);
      // Source reloads the bucket pointer on every iteration.
      for (let offset = 0; offset < 172; offset += 4) table.buckets().writeUnsigned(offset, 0);
      return { known: true, value: table };
    } catch (error) {
      return { known: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }
  private buckets(): NativeHeapObjectViews {
    const storage = this.fields.pointer<NativeHeapObjectViews | NativeMemoryAllocation>(0).get();
    if (!storage) throw new Error('Original property buckets reach NULL storage');
    return storage instanceof NativeHeapObjectViews ? storage : new NativeHeapObjectViews(storage);
  }
  endLifetime(): void { this.boundary ??= 'Native property type table lifetime has ended'; }
  private run<T>(body: () => T): NativeValue<T> {
    if (this.active) this.boundary ??= 'Property table cannot reenter an executing operation';
    if (this.boundary) return { known: false, reason: this.boundary };
    this.active = true;
    try {
      const value = body();
      if (this.boundary) throw new Error(this.boundary);
      return { known: true, value };
    } catch (error) {
      this.boundary ??= error instanceof Error ? error.message : String(error);
      return { known: false, reason: this.boundary };
    } finally { this.active = false; }
  }
  private find(name: NativeHeapCString, index: NativeHeapObjectViews): Node | null {
    if (!NativeHeapCString.prototype.usesMemoryAdmin.call(name, this.memory) || index.bytes.length !== 4) {
      throw new Error('Same-heap name and actual DWORD bucket output required');
    }
    const count = this.fields.readUnsigned(4), hash = fact(NativeHeapCString.prototype.hash.call(name));
    if (this.boundary) throw new Error(this.boundary);
    if (count === 0) throw new Error('Original property table DIV reaches zero bucket count');
    const bucket = hash % count;
    index.writeUnsigned(0, bucket);
    if (bucket >= this.fields.readUnsigned(4)) return null;
    const buckets = this.buckets();
    let node = buckets.pointer<Node>((bucket * 4) >>> 0).get();
    const seen = new Set<Node>();
    while (node) {
      if (!(node instanceof Node) || node.memory !== this.memory) throw new Error('Property table node has no same-heap owner');
      if (seen.has(node)) throw new Error('Original property bucket chain does not terminate');
      seen.add(node);
      // Read the actual name slot, checking node lifetime before CString equality.
      node.fields.pointer(0).get();
      const equal = fact(NativeHeapCString.prototype.equalsCString.call(name, node.name));
      if (this.boundary) throw new Error(this.boundary);
      if (equal) return node;
      node = node.fields.pointer<Node>(8).get();
    }
    return null;
  }
  findSlot(name: NativeHeapCString, index: NativeHeapObjectViews): NativeValue<NativeHeapObjectViews | null> {
    return this.run(() => {
      const node = this.find(name, index);
      return node ? this.valueSlot(node) : null;
    });
  }
  private valueSlot(node: Node): NativeHeapObjectViews {
    const begin = node.fields.bytes.byteOffset - node.fields.backing.bytes.byteOffset;
    return new NativeHeapObjectViews(node.fields.backing, begin + 4, 4);
  }
  /** Original clear deletes value wrappers, releases keys and nodes, frees
   * bucket storage, then allocates a fresh 43-bucket table. */
  clear(): NativeValue<void> { return this.reset(true); }
  /** Original map destruction dependency omits value-wrapper deletion. */
  resetForDestruction(): NativeValue<void> { return this.reset(false); }
  private reset(deleteValues: boolean): NativeValue<void> {
    return this.run(() => {
      const method = deleteValues ? source.methods.clearTypeTable : source.methods.destroyTypeTable;
      if (method.bodyVA !== (deleteValues ? '0x100910d0' : '0x10091230') ||
          method.bodyInstructionBytesSha256 !== (deleteValues ?
            'b2c843805ce1a75ce128c96d83bf533737663f3561cc5d6172bae5a7e604e06a' :
            '70995dcf63faa747310585dbe53993e43e3fe8ea0c16345cba35bb787cbeb1c2')) throw new Error('Original table clear source differs');
      const selectedMemory = () => {
        if (fact(NativeMemoryAdmin.prototype.getInstance.call(this.memory)) !== this.memory || this.boundary) {
          throw new Error(this.boundary ?? 'Original same-heap singleton required');
        }
      };
      for (let bucket = 0; bucket < (this.fields.readUnsigned(4) | 0); bucket++) {
        let node = this.buckets().pointer<Node>(bucket * 4).get();
        const seen = new Set<Node>();
        while (node) {
          if (!(node instanceof Node) || node.memory !== this.memory || seen.has(node)) {
            throw new Error('Original clear reaches an unowned or cyclic node');
          }
          seen.add(node);
          if (!deleteValues) node.fields.pointer(0).get();
          const wrapper = deleteValues ? node.fields.pointer<NativeMemoryAllocation>(4).get() : null;
          const next = node.fields.pointer<Node>(8).get();
          if (wrapper) {
            selectedMemory(); fact(NativeMemoryAdmin.prototype.deleteObject.call(this.memory, wrapper));
            if (this.boundary) throw new Error(this.boundary);
            node.fields.pointer(4).set(null);
          }
          fact(NativeHeapCString.prototype.destroy.call(node.name));
          if (this.boundary) throw new Error(this.boundary);
          const allocation = node.fields.backing;
          if (!('region' in allocation)) throw new Error('Original node DeleteObject requires its retained allocation');
          selectedMemory(); fact(NativeMemoryAdmin.prototype.deleteObject.call(this.memory, allocation));
          if (this.boundary) throw new Error(this.boundary);
          node = next;
        }
      }
      const storage = this.fields.pointer<NativeMemoryAllocation>(0).get();
      if (storage) {
        selectedMemory(); fact(NativeMemoryAdmin.prototype.free.call(this.memory, storage));
        if (this.boundary) throw new Error(this.boundary);
        this.fields.pointer(0).set(null); this.fields.writeUnsigned(4, 0); this.fields.writeUnsigned(8, 0);
      }
      this.fields.writeUnsigned(12, 0);
      const begin = this.fields.bytes.byteOffset - this.fields.backing.bytes.byteOffset;
      const array = new NativePropertyTemplateArray(new NativeHeapObjectViews(this.fields.backing, begin, 12), this.memory, 'typeTable');
      fact(array.reserve(43, 0));
      if (this.boundary) throw new Error(this.boundary);
      this.fields.writeUnsigned(4, 43);
      for (let offset = 0; offset < 172; offset += 4) this.buckets().writeUnsigned(offset, 0);
    });
  }
  getOrInsertSlot(name: NativeHeapCString, index: NativeHeapObjectViews): NativeValue<NativeHeapObjectViews> {
    return this.run(() => {
      const found = this.find(name, index);
      if (found) return this.valueSlot(found);
      const allocation = fact(NativeMemoryAdmin.prototype.newObject.call(this.memory, 12, 0x169));
      if (!allocation) throw new Error('Original property table CString assignment reaches NULL node');
      if (this.boundary) throw new Error(this.boundary);
      const fields = new NativeHeapObjectViews(allocation, 0, 12);
      const string = new NativeHeapCString(this.memory, new NativeHeapObjectViews(allocation, 0, 4));
      fact(NativeHeapCString.prototype.assign.call(string, name));
      if (this.boundary) throw new Error(this.boundary);
      const buckets = this.buckets();
      const bucket = (index.readUnsigned(0) * 4) >>> 0;
      fields.pointer(8).set(buckets.pointer<Node>(bucket).get());
      const node = new Node(fields, string, this.memory);
      // The original reloads bucket storage before linking the node.
      const current = this.buckets();
      current.pointer(bucket).set(node);
      this.fields.writeUnsigned(12, (this.fields.readUnsigned(12) + 1) >>> 0);
      return this.valueSlot(node);
    });
  }
}
