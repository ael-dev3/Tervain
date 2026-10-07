/** Original SharedBase string-keyed table operations, over retained fields.
 * This does not create the singleton or invoke a type's class-name virtual. */
import source from '../../assets/gothic3/property-registration-lifecycle/source.json';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeMemoryAdmin } from './native-memory-admin';
import type { NativeValue } from './dialogue';

function fact<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
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
    const buckets = this.fields.pointer<NativeHeapObjectViews>(0).get();
    if (!(buckets instanceof NativeHeapObjectViews)) throw new Error('Original property buckets have no retained field owner');
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
      const buckets = this.fields.pointer<NativeHeapObjectViews>(0).get();
      if (!(buckets instanceof NativeHeapObjectViews)) throw new Error('Original property buckets have no retained field owner');
      const bucket = (index.readUnsigned(0) * 4) >>> 0;
      fields.pointer(8).set(buckets.pointer<Node>(bucket).get());
      const node = new Node(fields, string, this.memory);
      // The original reloads bucket storage before linking the node.
      const current = this.fields.pointer<NativeHeapObjectViews>(0).get();
      if (!(current instanceof NativeHeapObjectViews)) throw new Error('Property bucket storage changed to an unowned pointer');
      current.pointer(bucket).set(node);
      this.fields.writeUnsigned(12, (this.fields.readUnsigned(12) + 1) >>> 0);
      return this.valueSlot(node);
    });
  }
}
