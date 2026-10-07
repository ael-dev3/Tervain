/** Original SharedBase constructors. No singleton registration or virtual dispatch. */
import source from '../../assets/gothic3/property-object-constructors/source.json';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryAdmin } from './native-memory-admin';
import type { NativeValue } from './dialogue';

for (const method of Object.values(source.methods)) Object.freeze(method);
Object.freeze(source.methods); Object.freeze(source);

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
      return { known: true, value: owner };
    } catch (error) {
      return { known: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }
}
