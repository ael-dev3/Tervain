/** Original SharedBase property-type constructors over retained native fields.
 * These owners do not register templates or execute a virtual Create call. */
import source from '../../assets/gothic3/property-type-constructors/source.json';
import registrationSource from '../../assets/gothic3/arena-property-registration/source.json';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeValue } from './dialogue';
import type { NativeMemoryAdmin } from './native-memory-admin';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): NativeValue<never> => ({ known: false, reason });
const claimed = new WeakMap<object, Set<number>>();
const completedNames = new WeakMap<NativePropertyTypeConstruction, {fields:NativeHeapObjectViews;name:NativeHeapCString}>();
for (const method of Object.values(source.methods)) {
  for (const hop of method.entryChain) Object.freeze(hop);
  Object.freeze(method.entryChain); Object.freeze(method);
}
Object.freeze(source.methods); Object.freeze(source);
function admit(): void {
  if (source.schema !== 'gothic3-property-type-constructors-v1' ||
      source.sharedBaseSha256 !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
      source.vtableVA !== '100ea164' ||
      source.methods.named.entryVA !== '0x10006a23' || source.methods.named.bodyVA !== '0x10088d50' ||
      source.methods.named.instructionCount !== 26 || source.methods.named.bodyByteCount !== 81 ||
      source.methods.simple.entryVA !== '0x10007ccf' || source.methods.simple.bodyVA !== '0x10088cc0' ||
      source.methods.simple.instructionCount !== 19 || source.methods.simple.bodyByteCount !== 60 ||
      source.methods.named.bodyInstructionBytesSha256 !== '31afb1364174f8ecadc8bd71e2619d792900c16773dd173844554b903ad7afdd' ||
      source.methods.simple.bodyInstructionBytesSha256 !== 'c929bfd50f97a809939aee704c6a21566f51b3e7fb355395a44bd323d2f592cd') {
    throw new Error('Original property constructor source differs');
  }
}
export class NativePropertyTypeConstruction {
  private state: 'constructing' | 'returned' | 'blocked' = 'constructing';
  private boundary: string | null = null;
  private readonly strings: NativeHeapCString[] = [];
  private constructor(readonly fields: NativeHeapObjectViews) {}
  static construct(memory: NativeMemoryAdmin, fields: NativeHeapObjectViews,
    input: Readonly<{ name: NativeHeapCString; propertyType: number;
      named?: Readonly<{ valueType: NativeHeapCString; category: NativeHeapCString; flag: number }> }>): NativeValue<NativePropertyTypeConstruction> {
    const owner = new NativePropertyTypeConstruction(fields);
    try {
      admit();
      if (fields.bytes.length !== 24) throw new Error('Actual 24-byte property base view required');
      const begin = fields.bytes.byteOffset - fields.backing.bytes.byteOffset, identity = fields.backing.identity;
      let positions = claimed.get(identity);
      if (positions?.has(begin)) throw new Error('Property constructor cannot replay over the same retained object');
      if (!positions) { positions = new Set(); claimed.set(identity, positions); }
      positions.add(begin);
      if (!Number.isInteger(input.propertyType) || input.propertyType < 0 || input.propertyType > 0xffffffff ||
          (input.named && (!Number.isInteger(input.named.flag) || input.named.flag < 0 || input.named.flag > 255))) {
        throw new Error('Source DWORD property type and BYTE flag required');
      }
      for (const string of [input.name, ...(input.named ? [input.named.valueType, input.named.category] : [])]) {
        if (!NativeHeapCString.prototype.usesMemoryAdmin.call(string, memory)) throw new Error('Property strings must use the same native heap');
      }
      const slot = (offset: number) => new NativeHeapObjectViews(fields.backing,
        fields.bytes.byteOffset - fields.backing.bytes.byteOffset + offset, 4);
      const copy = (offset: number, string: NativeHeapCString) => {
        const result = NativeHeapCString.copyForPropertyConstruction(string, slot(offset));
        if (!result.known) throw new Error(result.reason);
        owner.strings.push(result.value);
      };
      fields.writeUnsigned(0, 0x100ea164);
      copy(4, input.name);
      if (input.named) {
        // Original named constructor loads the third argument before the second.
        copy(8, input.named.category);
        copy(12, input.named.valueType);
      } else {
        owner.strings.push(new NativeHeapCString(memory, slot(8)));
        owner.strings.push(new NativeHeapCString(memory, slot(12)));
      }
      fields.writeUnsigned(16, input.propertyType);
      fields.writeUnsigned(20, input.named?.flag ?? 0, 1);
      owner.state = 'returned';
      completedNames.set(owner,{fields,name:owner.strings[0]!});
      return known(owner);
    } catch (error) {
      owner.state = 'blocked'; owner.boundary = error instanceof Error ? error.message : String(error);
      return unknown(owner.boundary);
    }
  }
  snapshot() {
    return Object.freeze({ phase: this.state, boundary: this.boundary,
      retainedStringOwners: this.strings.length, registered: false, virtualCreateExecuted: false });
  }
  /** Original GetName10006e83 returns the embedded CString at receiver +4. */
  getName():NativeValue<NativeHeapCString> {
    const proof=completedNames.get(this), method=registrationSource.methods.getPropertyName;
    if(!proof||proof.fields!==this.fields||method.entryVA!=='0x10006e83'||method.bodyVA!=='0x10088af0'||
      method.bodyInstructionBytesSha256!=='4181cb1fec090d6487f323c8ce84a17ff37429613d7843b4f5f40f5eae266b77')return unknown('Actual constructed property name and original getter required');
    return known(proof.name);
  }
}
