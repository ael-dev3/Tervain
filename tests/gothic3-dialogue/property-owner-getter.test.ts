import { describe, expect, it } from 'vitest';
import source from '../../assets/gothic3/property-owner-getters/source.json';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { readGamePropertyOwnerPointer } from '../../src/gothic3/native-property-owner-getter';

function receiver() {
  return new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(32),
    knownMask: new Uint8Array(32), freed: false });
}
describe('original property owner virtual getter layouts', () => {
  it.each([24, 28])('reads the actual field at offset %i selected by the retained vtable', offset => {
    const [vtable] = Object.entries(source.vtables).find(([, entry]) =>
      source.getters[entry as keyof typeof source.getters].fieldOffset === offset)!;
    const fields = receiver(), owner = {}, other = {};
    fields.writeUnsigned(0, Number.parseInt(vtable, 16));
    fields.pointer(offset === 24 ? 28 : 24).set(other);
    fields.pointer(offset).set(owner);
    expect(readGamePropertyOwnerPointer(fields)).toEqual({ known: true, value: owner });
    const alias = new NativeHeapObjectViews(fields.backing);
    alias.pointer(offset).set(null);
    expect(readGamePropertyOwnerPointer(fields)).toEqual({ known: true, value: null });
  });
  it('rejects unknown vtables, unreadable pointer words and ended receiver storage', () => {
    const fields = receiver();
    expect(readGamePropertyOwnerPointer(fields).known).toBe(false);
    fields.writeUnsigned(0, 0x100ea164);
    expect(readGamePropertyOwnerPointer(fields).known).toBe(false);
    const vtable = Object.keys(source.vtables)[0]!;
    fields.writeUnsigned(0, Number.parseInt(vtable, 16));
    expect(readGamePropertyOwnerPointer(fields).known).toBe(false);
    fields.backing.freed = true;
    expect(readGamePropertyOwnerPointer(fields).known).toBe(false);
  });
});
