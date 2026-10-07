/** Source-backed reads of a property descriptor's owner pointer. The actual
 * retained receiver vtable selects the layout. Source candidates alone never
 * establish a current pointer, type singleton or live virtual-call frame. */
import sourceText from '../../assets/gothic3/property-owner-getters/source.json?raw';
import { propertyOwnerGetterSourceText } from './native-property-owner-getter-source';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeValue } from './dialogue';

interface Rules {
  readonly vtables: Readonly<Record<string, string>>;
  readonly getters: Readonly<Record<string, { readonly fieldOffset: number; readonly entry: string; readonly body: string }>>;
}
if (sourceText !== propertyOwnerGetterSourceText) throw new Error('Original property owner getter source differs');
const rules = JSON.parse(sourceText) as Rules;
for (const getter of Object.values(rules.getters)) Object.freeze(getter);
Object.freeze(rules.getters); Object.freeze(rules.vtables); Object.freeze(rules);

export function readGamePropertyOwnerPointer(fields: NativeHeapObjectViews): NativeValue<object | null> {
  try {
    const vtable = NativeHeapObjectViews.prototype.readUnsigned.call(fields, 0).toString(16).padStart(8, '0');
    const entry = rules.vtables[vtable], getter = entry && rules.getters[entry];
    if (!getter) return { known: false, reason: 'Current receiver has no admitted Game property owner getter' };
    return { known: true, value: NativeHeapObjectViews.prototype.pointer.call(fields, getter.fieldOffset).get() };
  } catch (error) {
    return { known: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
