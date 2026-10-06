import type { NativeLiveEntity, NativeMaskedWord } from './entity-lifecycle';
import { NativeEntityReadData } from './entity-reading';
import type { OriginalPropertyOwner } from './native-properties';
import type { NativeMemoryAllocation } from './native-memory-admin';
import { NativeHeapObjectViews } from './native-heap-views';

const FLOAT_FIELDS = new Set([0x34, 0x128, 0x12c, 0x134, 0x14c, 0x150, 0x154, 0x188]);
const DWORD_FIELDS = new Set([0x2c, 0x30, 0x15c, 0x160, 0x164, 0x168, 0x16c,
  0x170, 0x174, 0x178, 0x17c, 0x180, 0x18c]);
/** The Map tracks which source fields were written; each value is reread from
 * physical backing. It never holds a second copy of the scalar value. */
class NativeEntityHeapNumericFields extends Map<number, number> {
  constructor(private readonly views: NativeHeapObjectViews) { super(); }
  override set(offset: number, value: number): this {
    if (FLOAT_FIELDS.has(offset)) this.views.writeFloat(offset, value);
    else if (DWORD_FIELDS.has(offset)) this.views.writeUnsigned(offset, value);
    else if (offset === 0x38) this.views.writeUnsigned(offset, value, 1);
    else if (offset === 0x184 || offset === 0x190) this.views.writeUnsigned(offset, value, 2);
    else throw new Error('Unaudited physical entity scalar field +' + offset.toString(16));
    super.set(offset, 0); return this;
  }
  override get(offset: number): number | undefined {
    if (!super.has(offset)) return undefined;
    return FLOAT_FIELDS.has(offset) ? this.views.readFloat(offset)
      : this.views.readUnsigned(offset, offset === 0x38 ? 1 : offset === 0x184 || offset === 0x190 ? 2 : 4);
  }
  override *entries(): MapIterator<[number, number]> {
    for (const offset of super.keys()) yield [offset, this.get(offset)!];
  }
  override *values(): MapIterator<number> { for (const [, value] of this.entries()) yield value; }
  override [Symbol.iterator](): MapIterator<[number, number]> { return this.entries(); }
  override forEach(callback: (value: number, key: number, map: Map<number, number>) => void, thisArg?: unknown): void {
    for (const [offset, value] of this.entries()) callback.call(thisArg, value, offset, this);
  }
}

/** Selected constructor/Create field bindings, not a full eCEntity port. The
 * empty child/property arrays cannot grow until their physical container
 * operations are owned. CString non-NULL assignment/cleanup is also gated. */
export class NativeEntityHeapFields {
  readonly views: NativeHeapObjectViews;
  readonly data: NativeEntityReadData;
  readonly creator: { propertyId20: string };
  readonly flags1bc: NativeMaskedWord;
  private defaultComparator: object | null = null;
  constructor(readonly allocation: NativeMemoryAllocation, entity: NativeLiveEntity, owner: OriginalPropertyOwner) {
    if (allocation.requestedBytes !== 0x1c0 || allocation.capacity < 0x1c0) throw new Error('Actual original gCEntity448-byte allocation required');
    const views = this.views = new NativeHeapObjectViews(allocation, 0, 0x1c0);
    const scalar = (target: object, key: string, offset: number) => Object.defineProperty(target, key, {
      enumerable: true, configurable: false, get: () => views.readUnsigned(offset), set: (value: number) => views.writeUnsigned(offset, value),
    });
    const pointer = (key: string, offset: number) => {
      const slot = views.pointer(offset);
      Object.defineProperty(entity, key, { enumerable: true, configurable: false, get: slot.get, set: slot.set });
    };
    const propertyId = views.propertyId(0x18);
    Object.defineProperty(entity, 'propertyId20', { enumerable: true, get: propertyId.get, set: propertyId.set });
    scalar(entity, 'referenceWord', 8); scalar(owner, 'modifiedWord', 0x130);
    pointer('propertyObjectReference', 4); pointer('parent', 0xc); pointer('context', 0x1a4); pointer('frustumEntity', 0x158);
    Object.defineProperty(entity, 'flags', { enumerable: true, value: views.maskedWord(0x3c) });
    Object.defineProperty(entity, 'propertyTypeBits', { enumerable: true, value: views.dwordArray(0x194, 4) });
    Object.defineProperty(entity, 'propertyArraySorted', { enumerable: true,
      get: () => views.readUnsigned(0x148, 1) === 1,
      set: (value: boolean) => { if (typeof value !== 'boolean') throw new Error('Native sorted bool required'); views.writeUnsigned(0x148, Number(value), 1); },
    });
    const comparator = views.pointer(0x144);
    Object.defineProperty(entity, 'propertySortProfile', { enumerable: true,
      get: () => {
        if (views.knownMask.subarray(0x144, 0x148).every(value => value === 255) && views.readUnsigned(0x144) === 0x30017323) return 'entity-property-set';
        if (this.defaultComparator !== null && comparator.get() === this.defaultComparator) return 'default';
        throw new Error('Actual property comparator pointer has no owned profile');
      },
      set: (value: string) => {
        if (value === 'entity-property-set') views.writeUnsigned(0x144, 0x30017323);
        else if (value === 'default' && this.defaultComparator !== null) comparator.set(this.defaultComparator);
        else throw new Error('Default imported property comparator capability is not owned');
      },
    });
    Object.preventExtensions(entity.children); Object.preventExtensions(entity.propertySets);
    this.data = new NativeEntityReadData(entity, {
      worldMatrix: views.floatArray(0x40, 16), localMatrix: views.floatArray(0x80, 16),
      treeBox: views.floatArray(0xc0, 6), worldSphere: views.floatArray(0xd8, 4),
      worldBox: views.floatArray(0xe8, 6), localSphere: views.floatArray(0x100, 4), localBox: views.floatArray(0x110, 6),
    }, '');
    Object.defineProperty(this.data, 'numeric', { value: new NativeEntityHeapNumericFields(views), enumerable: true });
    const name = views.pointer(0x138);
    Object.defineProperty(this.data, 'name', { enumerable: true,
      get: () => {
        if (name.get() === null) return '';
        throw new Error('Non-NULL source CString owner is outside constructor-only entity heap profile');
      },
      set: (value: string) => {
        if (value !== '' || name.get() !== null) throw new Error('Owned source CString assignment/clear dependency required');
        name.set(null);
      },
    });
    const creator = views.propertyId(0x1a8);
    this.creator = { get propertyId20() { return creator.get(); }, set propertyId20(value: string) { creator.set(value); } };
    this.flags1bc = views.maskedWord(0x1bc, 2);
  }
  /** Native CString constructor storesNULL without reading the old slot. */
  initializeName(): void { this.views.pointer(0x138).set(null); }
  initializeChildren(): void {
    this.views.pointer(0x14).set(null); this.views.writeUnsigned(0x10, 0, 2); this.views.writeUnsigned(0x12, 0, 2);
  }
  initializeProperties(): void {
    this.views.pointer(0x140).set(null); this.views.writeUnsigned(0x13c, 0, 2); this.views.writeUnsigned(0x13e, 0, 2);
  }
  setDefaultComparator(value: object): void { this.defaultComparator = value; }
  setVtable(value: number): void { this.views.writeUnsigned(0, value); }
  clearPropertyId(offset: 0x18 | 0x1a8): void {
    for (const field of [12, 8, 4, 0, 16]) this.views.writeUnsigned(offset + field, 0);
  }
  assignGeneratedPropertyId(value: string): void {
    if (!/^[0-9a-f]{32}00000000$/.test(value)) throw new Error('Generated GUID16/cleared cache DWORD required');
    const bytes = Uint8Array.from(value.match(/../g)!, byte => Number.parseInt(byte, 16)), raw = new DataView(bytes.buffer);
    for (const field of [0, 4, 8, 12]) this.views.writeUnsigned(0x18 + field, raw.getUint32(field, true));
    this.views.writeUnsigned(0x28, 0);
  }
}
