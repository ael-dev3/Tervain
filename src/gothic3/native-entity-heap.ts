import type { NativeLiveEntity, NativeMaskedWord } from './entity-lifecycle';
import { NativeEntityReadData } from './entity-reading';
import type { OriginalPropertyOwner } from './native-properties';
import type { NativeMemoryAdmin, NativeMemoryAllocation } from './native-memory-admin';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeHeapCString } from './native-heap-cstring';
import npcHeapRulesText from '../../assets/gothic3/npc-heap/runtime-rules.json?raw';

const npcHeapRules = JSON.parse(npcHeapRulesText) as { schema: string; entityComparatorImport?: {
  iatVA: string; module: string; importIdentity: { iatVA: string; module: string; name: string; ordinal: number | null };
  originalIatRaw: string; originalIatSha256: string; resolvedExportEntry: string; resolvedExportBody: string; sourceMethod: string;
}; nameStringPath?: { sourceRecordsSha256: string; sourceStringTableSha256: string;
  selectedNames: readonly { key: string; name: string; sourceStringIndex: number; raw: string; bytes: number;
    nativeCStringRequestBytes: number; nativeBucket: string }[] } };
const comparatorImport = npcHeapRules.entityComparatorImport;
if (npcHeapRules.schema !== 'gothic3-npc-heap-rules-v1' || comparatorImport?.iatVA !== '30afcd5c' ||
    comparatorImport.module !== 'Engine' || comparatorImport.importIdentity.iatVA !== '0x30afcd5c' ||
    comparatorImport.importIdentity.module !== 'SharedBase.dll' ||
    comparatorImport.importIdentity.name !== '?g_ArraySortDefaultCompare@@YAHPBX0@Z' ||
    comparatorImport.importIdentity.ordinal !== null || comparatorImport.originalIatRaw !== 'ca2ab000' ||
    comparatorImport.originalIatSha256 !== '17b509660e929a2a20d729af5b65984bbb091167736ed5ba155bad906110d35b' ||
    comparatorImport.resolvedExportEntry !== '10003553' || comparatorImport.resolvedExportBody !== '10087b60' ||
    comparatorImport.sourceMethod !== 'arraySortDefaultCompare') {
  throw new Error('Original imported default comparator identity differs');
}
const selectedNameReceipts = [
  { key: 'world-2419:22138', name: 'Ardea_OutNovice_01', sourceStringIndex: 1096, raw: '41726465615f4f75744e6f766963655f3031' },
  { key: 'world-2419:22141', name: 'Ardea_OutNovice_02', sourceStringIndex: 1097, raw: '41726465615f4f75744e6f766963655f3032' },
  { key: 'world-2419:22144', name: 'Ardea_OutNovice_03', sourceStringIndex: 1098, raw: '41726465615f4f75744e6f766963655f3033' },
] as const;
const nameStringPath = npcHeapRules.nameStringPath;
if (nameStringPath?.sourceRecordsSha256 !== '1c4a516f70704609744ca6b18c8d3a8fefa97290e8f320baef5037f5be7976ee' ||
    nameStringPath.sourceStringTableSha256 !== 'd201acbb3ea681bee822c308fb043e847c5c3f8eb0e57c4176af04956ac3aa53' ||
    nameStringPath.selectedNames.length !== selectedNameReceipts.length ||
    nameStringPath.selectedNames.some((row, index) => {
      const expected = selectedNameReceipts[index]!;
      return row.key !== expected.key || row.name !== expected.name || row.sourceStringIndex !== expected.sourceStringIndex ||
        row.raw !== expected.raw || row.bytes !== 18 || row.nativeCStringRequestBytes !== 27 || row.nativeBucket !== '28';
    })) throw new Error('Selected NPC CString source-byte receipts differ');
function selectedNpcNameBytes(name: string): Uint8Array {
  const row = nameStringPath!.selectedNames.find(value => value.name === name);
  if (!row) throw new Error('NPC CString name is outside the selected original Ardea string records');
  const result = Uint8Array.from(row.raw.match(/../g)!, byte => Number.parseInt(byte, 16));
  if (result.length !== row.bytes || new TextDecoder().decode(result) !== name) {
    throw new Error('Selected original NPC string bytes do not match the decoded name');
  }
  return result;
}
/** Opaque original import identity for the constructor's pointer store. It is
 * not a claim that the source comparator body has been invoked here. */
export const nativeEntityDefaultComparatorImportIdentity = Object.freeze({
  module: 'SharedBase.dll', address: '10087b60', name: '?g_ArraySortDefaultCompare@@YAHPBX0@Z',
});

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
  private nameCString: NativeHeapCString | null = null;
  constructor(readonly allocation: NativeMemoryAllocation, entity: NativeLiveEntity, owner: OriginalPropertyOwner,
    private readonly memory: NativeMemoryAdmin) {
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
    Object.defineProperty(this.data, 'name', { enumerable: true,
      get: () => {
        if (!this.nameCString) throw new Error('Original entity CString constructor has not run');
        const value = this.nameCString.text();
        if (!value.known) throw new Error(value.reason);
        return value.value;
      },
      set: (value: string) => {
        if (!this.nameCString) throw new Error('Original entity CString constructor has not run');
        if (typeof value !== 'string' || value.includes('\0')) throw new Error('Selected source NPC CString bridge requires a valid source name');
        const source = new NativeHeapCString(this.memory);
        const input = selectedNpcNameBytes(value);
        const allocated = source.allocateTextBytes(input);
        if (!allocated.known) throw new Error(allocated.reason);
        const assigned = this.nameCString.assign(source);
        if (!assigned.known) throw new Error(assigned.reason);
        const destroyed = source.destroy();
        if (!destroyed.known) throw new Error(destroyed.reason);
      },
    });
    const creator = views.propertyId(0x1a8);
    this.creator = { get propertyId20() { return creator.get(); }, set propertyId20(value: string) { creator.set(value); } };
    this.flags1bc = views.maskedWord(0x1bc, 2);
  }
  /** Native CString constructor storesNULL without reading the old slot. */
  initializeName(): void {
    if (this.nameCString) throw new Error('Original entity CString constructor already ran');
    this.nameCString = new NativeHeapCString(this.memory, new NativeHeapObjectViews(this.allocation, 0x138, 4));
  }
  clearName(): void {
    if (!this.nameCString) throw new Error('Original entity CString constructor has not run');
    const result = this.nameCString.clear();
    if (!result.known) throw new Error(result.reason);
  }
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
