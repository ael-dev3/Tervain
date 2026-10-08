/** Original 10090650 constructor dependencies. Canonical image storage,
 * getter guard and SharedBase exit registration are separate prerequisites. */
import source from '../../assets/gothic3/property-registration-lifecycle/source.json';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativePropertyTypeTable } from './native-property-type-table';
import { NativePropertyTemplateArray } from './native-property-template-array';
import type { NativeMemoryAdmin, NativeMemoryAllocation } from './native-memory-admin';
import type { NativeValue } from './dialogue';

function fact<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
const claimed = new WeakMap<object, Set<number>>();
export class NativePropertySingletonConstruction {
  private constructor(readonly fields: NativeHeapObjectViews, readonly table: NativePropertyTypeTable) {}
  static construct(memory: NativeMemoryAdmin, fields: NativeHeapObjectViews): NativeValue<NativePropertySingletonConstruction> {
    try {
      if (fields.bytes.length !== 28 || source.sharedBaseSha256 !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
          source.methods.constructPropertySingleton.bodyVA !== '0x10090650' ||
          source.methods.constructPropertySingleton.bodyInstructionBytesSha256 !== 'e8b9667b9bc36790bd7f7f449f74e9d6dfc85fe2c0315e68d724bd4c472acbb2') {
        throw new Error('Original property singleton constructor and actual 28-byte base fields required');
      }
      const begin = fields.bytes.byteOffset - fields.backing.bytes.byteOffset;
      let positions = claimed.get(fields.backing.identity);
      if (positions?.has(begin)) throw new Error('Property singleton constructor cannot replay');
      if (!positions) { positions = new Set(); claimed.set(fields.backing.identity, positions); }
      positions.add(begin);
      fields.writeUnsigned(0, 0x100eb390);
      const tableFields = new NativeHeapObjectViews(fields.backing, begin + 12, 16);
      const table = fact(NativePropertyTypeTable.construct(memory, tableFields));
      fields.writeUnsigned(4, 1, 1); fields.pointer(8).set(null);
      // Preserve the original allocation/free/recreation sequence.
      fact(table.clear());
      const reserve = new NativePropertyTemplateArray(new NativeHeapObjectViews(fields.backing, begin + 12, 12), memory, 'typeTable');
      fact(reserve.reserve(359, 0));
      tableFields.writeUnsigned(4, 359);
      for (let offset = 0; offset < 1436; offset += 4) {
        const buckets = tableFields.pointer<NativeMemoryAllocation>(0).get();
        if (!buckets) throw new Error('Original singleton constructor zero loop reaches NULL buckets');
        new NativeHeapObjectViews(buckets).writeUnsigned(offset, 0);
      }
      return { known: true, value: new NativePropertySingletonConstruction(fields, table) };
    } catch (error) {
      return { known: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }
}
