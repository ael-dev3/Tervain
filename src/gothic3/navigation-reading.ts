/** Concrete original Navigation constructor/defaults/reflection/current Read.
 * Detached construction never establishes entity addition or world residency.
 * The state and wished movement capability supplied by the allocation host are
 * the same objects used by navigation lifecycle and Hero script consumers.
 */
import rulesText from '../../assets/gothic3/navigation-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativePropertyCallbacks } from './entity-lifecycle';
import { NativeReflectionWrapper } from './entity-reflection';
import type { NativeReflectionFactory, NativeReflectionField } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';
import type { NativeNavigationState, NativeNavigationEntity, NativeNavigationLifecycle, NativeNavigationOperation, NativePositionCm } from './navigation-runtime';
import type { NativePlayerWishedMovement } from './player-state';
import { nativeNavigationRoutinePointAssignments } from './navigation-routine';
import type { NativeNavigationRoutinePoint } from './navigation-routine';
import { OriginalEnclaveProxy } from './native-properties';

const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; version: number; getVersion: number;
  propertyType: number; nativeBytes: number; wrapperVtable: string; fields: NativeReflectionField[] };
if (rules.schema !== 'gothic3-navigation-reading-rules-v1' || rules.version !== 37 || rules.getVersion !== 1 ||
    rules.propertyType !== 5 || rules.nativeBytes !== 0x2b0 || rules.wrapperVtable !== '2068e3ec' || rules.fields.length !== 15 ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original Navigation reading receipt differs');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(value: NativeValue<T>, operation: string): T {
  if (!value.known) throw new Error(operation + ': ' + value.reason); return value.value;
}
const hex = (bytes: Uint8Array): string => [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
function bytes(value: string): Uint8Array {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error('Original 20-byte PropertyID required');
  return Uint8Array.from(value.match(/../g)!.map(byte => parseInt(byte, 16)));
}
function ascii(value: string): string {
  if (!/^[\x20-\x7e]*$/.test(value)) throw new Error('Audited indexed ASCII string profile required'); return value;
}
/** GUID ctor initializes only byte16. CoCreateGuid's HRESULT is ignored by
 * bCGuid.Generate; successful completion does not invent initialized bits. */
export interface NativeNavigationGuidScratch { readonly bytes: Uint8Array; readonly knownMask: Uint8Array; destroyed: boolean }
export interface NativeNavigationReadingHost {
  allocateNavigation(identity: string): NativeValue<{ state: NativeNavigationState; wishes: NativePlayerWishedMovement }>;
  /** Actual selected CoCreateGuid service writes the captured first16 bytes
   * and their known masks. A browser entropy adapter must declare its profile. */
  coCreateGuid?(scratch: NativeNavigationGuidScratch): NativeValue<number>;
  /** Stable view of the same physical owner pointer, never GUID re-lookup. */
  ownerView?(owner: NativeLiveEntity): NativeValue<NativeNavigationEntity>;
  lifecycle?: NativeNavigationLifecycle;
  /** Full original GameReset/array fallback/proxy SetEntity/PostRead sequence.
   * Required after addition; derived Read itself does not invoke PostRead. */
  postRead?(properties: OriginalNavigationProperties): NativeValue<void>;
}
export interface NativeNavigationValueArray {
  allocation: Uint8Array | null; count: number; capacity: number;
}
export interface NativeNavigationStringArray {
  allocation: string[] | null; count: number; capacity: number;
}
type ArrayStore = NativeNavigationValueArray | NativeNavigationStringArray;

/** Numeric bytes/masks represent only source-proven fields. Heap arrays and
 * proxies retain actual object capabilities separately from native addresses.
 * No uninitialized byte is inferred from JavaScript's zero-filled allocation. */
export class OriginalNavigationProperties {
  readonly numericBytes = new Uint8Array(0x2b0);
  readonly knownMask = new Uint8Array(0x2b0);
  private readonly view = new DataView(this.numericBytes.buffer);
  readonly values: Record<string, unknown> = {};
  readonly arrays = new Map<string, ArrayStore>();
  readonly proxies = new Map<string, OriginalEnclaveProxy>();
  readonly guidScratch: NativeNavigationGuidScratch[] = [];
  owner: NativeLiveEntity | null = null;
  base!: NativeLivePropertySet<Record<string, unknown>>;
  private readonly vectors = new Map<number, Float32Array>();
  private readonly pointers = new Map<number, object | null>();
  constructor(readonly wrapper: NativeReflectionWrapper, readonly host: NativeNavigationReadingHost,
    readonly state: NativeNavigationState, readonly wishes: NativePlayerWishedMovement) {
    if (state.entity !== null || state.characterMovement !== null || state.dynamicCollisionCircle !== null ||
        !state.id || typeof wishes !== 'object') throw new Error('Fresh detached Navigation allocation required');
  }
  /** The caller already constructed/retained the actual base PS. Native base
   * constructor therefore precedes every derived member constructor/write. */
  initializeMembers(): void {
    for (const field of rules.fields) {
      const offset = field.nativeOffset;
      if (field.typeName === 'bCVector') {
        this.vectors.set(offset, new Float32Array(this.numericBytes.buffer, offset, 3)); // Mask remains unknown.
        Object.defineProperty(this.values, field.name, { enumerable: true, get: () => this.vector(offset) });
      } else if (field.typeName === 'bCPropertyID') {
        this.store(offset, new Uint8Array(20));
        Object.defineProperty(this.values, field.name, { enumerable: true, get: () => this.id(offset), set: value => this.store(offset, bytes(value)) });
      } else if (field.typeName === 'eCEntityProxy') {
        const proxy = OriginalEnclaveProxy.fromConstructor(); this.proxies.set(field.name, proxy); this.values[field.name] = proxy;
      } else if (field.typeName.startsWith('bTValArray<')) {
        const array: NativeNavigationValueArray = { allocation: null, count: 0, capacity: 0 };
        this.arrays.set(field.name, array); this.values[field.name] = array; this.bindArray(array, offset);
      } else if (field.typeName.startsWith('bTObjArray<')) {
        const array: NativeNavigationStringArray = { allocation: null, count: 0, capacity: 0 };
        this.arrays.set(field.name, array); this.values[field.name] = array; this.bindArray(array, offset);
      } else if (field.typeName === 'bCString') {
        let value = ''; this.u32(offset, 0);
        Object.defineProperty(this.values, field.name, { enumerable: true, get: () => value, set: incoming => {
          value = ascii(incoming); if (value === '') this.u32(offset, 0); else this.knownMask.fill(0, offset, offset + 4);
        } });
      }
      else if (field.typeName === 'bool') Object.defineProperty(this.values, field.name, { enumerable: true,
        get: () => this.byte(offset) !== 0, set: value => { if (typeof value !== 'boolean') throw new Error('Canonical bool required'); this.u8(offset, Number(value)); } });
      else throw new Error('Unrecovered Navigation descriptor type ' + field.typeName);
    }
    // Other ctor-owned arrays are all NULL/count0/capacity0. Their future
    // destruction/read semantics are not inferred from the reflective arrays.
    for (const offset of [0x10c, 0x118, 0x138, 0x144, 0x190, 0x19c, 0x1a8, 0x1c0]) {
      this.u32(offset, 0); this.u32(offset + 4, 0); this.u32(offset + 8, 0);
    }
    for (const offset of [0x124, 0x224, 0x23c]) this.store(offset, new Uint8Array(20));
    for (const [name, offset] of [['raw150', 0x150], ['raw16c', 0x16c], ['workingCache258', 0x258],
      ['relaxingCache274', 0x274], ['sleepingCache290', 0x290]] as const) {
      this.proxies.set(name, OriginalEnclaveProxy.fromConstructor()); this.pointers.set(offset, this.proxies.get(name)!);
    }
    this.vectors.set(0x1b4, new Float32Array(this.numericBytes.buffer, 0x1b4, 3));
    this.vectors.set(0x1ec, new Float32Array(this.numericBytes.buffer, 0x1ec, 3));
    this.wrapper.controller.write('Navigation member constructors; known NULL arrays/empty IDs/strings/proxies; vectors remain masked', 'Game:20289960');
    // Original Invalidate sees constructor's NULL owner; sets movement/start
    // vectors to zero and scalar/pointer defaults, but not LastUseablePosition.
    this.u32(0x1cc, 0xffffffff); this.writeVector(0x1b4, [0, 0, 0]); this.writeVector(0x14, [0, 0, 0]);
    for (const offset of [0x1d0, 0x1d1, 0x1e5, 0x1e6, 0x209, 0x208, 0x211, 0x255, 0x220, 0x238, 0x250]) this.u8(offset, 0);
    for (const offset of [0x1d4, 0x1d8, 0x1dc, 0x1e0, 0x1e8, 0x214, 0x21c, 0x18c]) this.u32(offset, 0);
    this.u8(0x1e4, 1); this.u8(0x210, 1); this.u32(0x218, 4); this.u32(0x2ac, 0xffff); this.u8(0x254, 1);
    this.state.inProcessingRange = false; this.state.floorDetectionFailed = false; this.state.enabled = true;
    this.state.characterMovement = null; this.state.dynamicCollisionCircle = null;
    this.wrapper.controller.write('Navigation.Invalidate fresh NULL-owner known field writes', 'Game:20286e50');
    this.bindState();
  }
  private bindArray(array: ArrayStore, offset: number): void {
    let allocation: ArrayStore['allocation'] = null;
    this.u32(offset, 0); this.u32(offset + 4, 0); this.u32(offset + 8, 0);
    Object.defineProperties(array, {
      allocation: { enumerable: true, get: () => allocation, set: value => {
        allocation = value;
        if (value === null) this.u32(offset, 0); else this.knownMask.fill(0, offset, offset + 4);
      } },
      count: { enumerable: true, get: () => this.dword(offset + 4), set: value => this.u32(offset + 4, value) },
      capacity: { enumerable: true, get: () => this.dword(offset + 8), set: value => this.u32(offset + 8, value) },
    });
  }
  private bindState(): void {
    const scalar = (target: object, key: string, offset: number, bool = false): void => {
      Object.defineProperty(target, key, { enumerable: true, configurable: false,
        get: () => bool ? this.byte(offset) !== 0 : this.dword(offset),
        set: value => { if (bool) this.u8(offset, Number(value)); else this.u32(offset, value); } });
    };
    scalar(this.state, 'inProcessingRange', 0x1e5, true); scalar(this.state, 'floorDetectionFailed', 0x1e6, true); scalar(this.state, 'enabled', 0x1e4, true);
    scalar(this.wishes, 'wishedMovementMode', 0x218);
    for (const [name, offset] of [['dynamicCollisionCircle', 0x1dc], ['characterMovement', 0x1e0]] as const) {
      this.pointers.set(offset, null);
      Object.defineProperty(this.state, name, { enumerable: true, get: () => this.pointers.get(offset), set: value => {
        this.pointers.set(offset, value); if (value === null) this.u32(offset, 0); else this.knownMask.fill(0, offset, offset + 4);
      } });
    }
    // MOVSS at Game20287018 stores a float here, even though the shared
    // navigation facade names the slot by its base-relative byte offset.
    Object.defineProperty(this.state.fields, '0x188', { enumerable: true,
      get: () => { this.dword(0x18c); return this.view.getFloat32(0x18c, true); },
      set: value => {
        if (!Number.isFinite(value) || !Object.is(value, Math.fround(value))) throw new Error('Finite float32 Navigation field required');
        this.view.setFloat32(0x18c, value, true); this.knownMask.fill(0xff, 0x18c, 0x190);
      } });
    scalar(this.state.fields, '0x204', 0x208, true); scalar(this.state.fields, '0x205', 0x209, true); scalar(this.state.fields, '0x24c', 0x250, true);
    Object.defineProperty(this.state.fields, '0x238', { enumerable: true, get: () => this.emptyAsNull(this.id(0x23c)),
      set: value => { this.store(0x23c, bytes(value ?? '0'.repeat(40)).subarray(0, 16)); this.u32(0x24c, 0); } });
    Object.defineProperty(this.state, 'baseValidity', { enumerable: true, get: () => this.base ? known(this.base.isValid()) : missing('Base constructor/Create pending') });
    Object.defineProperty(this.state, 'entity', { enumerable: true, get: () => this.owner === null ? null :
      fact(this.host.ownerView?.(this.owner) ?? missing('Actual captured owner Navigation view unresolved'), 'Navigation.GetEntity view') });
    Object.defineProperty(this.state, 'startPositionCm', { enumerable: true, get: () => this.vector(0x14), set: value => this.writeVector(0x14, value) });
    Object.defineProperty(this.state, 'lastUseableNavigationPositionCm', { enumerable: true,
      get: () => this.knownMask.subarray(0xe4, 0xf0).every(value => value === 0xff) ? known(this.vector(0xe4)) : missing('Original vector storage remains uninitialized'),
      set: value => { if (!value.known) throw new Error('Cannot replace native vector contents with an unknown record'); this.writeVector(0xe4, value.value); } });
    for (const [name, property] of [['currentZoneId', 'CurrentZoneEntityProxy'], ['lastZoneId', 'LastZoneEntityProxy']] as const) {
      const proxy = this.proxies.get(property)!;
      Object.defineProperty(this.state, name, { enumerable: true, get: () => this.emptyAsNull(proxy.propertyID()),
        set: value => proxy.setEntity(value ?? '0'.repeat(40), (operation) => this.wrapper.controller.write(operation, 'Engine:3000247d')) });
    }
    Object.defineProperty(this.state, 'lastUseableZoneId', { enumerable: true, get: () => this.emptyAsNull(this.id(0xf0)),
      set: value => { this.store(0xf0, bytes(value ?? '0'.repeat(40)).subarray(0, 16)); this.u32(0x100, 0); } });
  }
  private emptyAsNull(value: string): string | null { return /^0{32}/.test(value) ? null : value; }
  private store(offset: number, value: Uint8Array, mask?: Uint8Array): void {
    this.numericBytes.set(value, offset); this.knownMask.set(mask ?? new Uint8Array(value.length).fill(0xff), offset);
  }
  private u8(offset: number, value: number): void { this.view.setUint8(offset, value); this.knownMask[offset] = 0xff; }
  private u32(offset: number, value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Native uint32 required');
    this.view.setUint32(offset, value, true); this.knownMask.fill(0xff, offset, offset + 4);
  }
  private byte(offset: number): number { if (this.knownMask[offset] !== 0xff) throw new Error('Uninitialized native byte'); return this.view.getUint8(offset); }
  private dword(offset: number): number { if (!this.knownMask.subarray(offset, offset + 4).every(v => v === 0xff)) throw new Error('Uninitialized native DWORD'); return this.view.getUint32(offset, true); }
  private id(offset: number): string {
    if (!this.knownMask.subarray(offset, offset + 20).every(v => v === 0xff)) throw new Error('Uninitialized PropertyID bits'); return hex(this.numericBytes.subarray(offset, offset + 20));
  }
  private vector(offset: number): NativePositionCm {
    if (!this.knownMask.subarray(offset, offset + 12).every(v => v === 0xff)) throw new Error('Uninitialized native vector');
    const vector = this.vectors.get(offset); if (!vector) throw new Error('Actual embedded vector missing'); return vector as unknown as NativePositionCm;
  }
  private writeVector(offset: number, value: readonly number[]): void {
    if (value.length !== 3 || value.some(v => !Number.isFinite(v) || !Object.is(v, Math.fround(v)))) throw new Error('Finite float32 vector required');
    const vector = this.vectors.get(offset); if (!vector) throw new Error('Actual embedded vector missing');
    for (let i = 0; i < 3; i++) { vector[i] = value[i]!; this.view.setFloat32(offset + i * 4, value[i]!, true); }
    this.knownMask.fill(0xff, offset, offset + 12);
  }
  exact(): void {
    if (this.wrapper.native !== this.base || this.base.values !== this.values || this.base.wrapper !== this.wrapper || this.wrapper.deleted) throw new Error('Actual retained Navigation PS/value store required');
  }
  /** Propagated=true selects both original custom overrides' inherited branch.
   * Each owner pointer is independently reread; Modified is its actual read. */
  notify(phase: 'enter' | 'exit', property: string): void {
    this.exact();
    const controller = this.wrapper.controller;
    for (let index = 0; index < 2; index++) {
      const owner = this.base.owner.read();
      if (owner !== null) { owner.propertyOwner.modified(); controller.write('owner.Modified read ' + phase, index === 0 ? 'Engine:NotifyEx' : 'Engine:OnNotifyEx'); }
      if (index === 0) controller.write('Navigation virtual OnNotify ' + phase + '(propagated=true) ' + property,
        phase === 'enter' ? 'Game:200328bc' : 'Game:2002bb11');
    }
    controller.write('SharedBase inherited OnNotify true', phase === 'enter' ? 'Engine:3002ad10' : 'Engine:30037ca4');
  }
  /** Apply the source Routine string and its three indexed point properties.
   * This preserves the native setter order but does not resolve a point into a
   * world position, construct a resident, or start navigation movement. */
  setRoutine(routine: string): NativeValue<void> {
    return this.wrapper.controller.value(() => {
      this.exact();
      const names = this.arrays.get('RoutineNames') as NativeNavigationStringArray | undefined;
      const namesValue = names?.allocation;
      if (!names || !namesValue || names.count !== namesValue.length) {
        throw new Error('Actual loaded RoutineNames array is required before changing an NPC routine.');
      }
      const pointRows = (name: NativeNavigationRoutinePoint): readonly string[] => {
        const array = this.arrays.get(name === 'WorkingPoint' ? 'WorkingPoints' : name === 'RelaxingPoint' ? 'RelaxingPoints' : 'SleepingPoints') as NativeNavigationValueArray | undefined;
        const storage = array?.allocation;
        if (!array || !(storage instanceof Uint8Array) || storage.length !== array.count * 20) {
          throw new Error('Actual loaded ' + name + ' array is required before changing an NPC routine.');
        }
        return Array.from({ length: array.count }, (_, index) => hex(storage.subarray(index * 20, (index + 1) * 20)));
      };
      const routineName = ascii(routine);
      const hasRoutine = namesValue.includes(routineName);
      const selected = nativeNavigationRoutinePointAssignments(routineName, namesValue, hasRoutine ? {
        SleepingPoint: pointRows('SleepingPoint'), WorkingPoint: pointRows('WorkingPoint'), RelaxingPoint: pointRows('RelaxingPoint'),
      } : { SleepingPoint: [], WorkingPoint: [], RelaxingPoint: [] });
      if (!selected.known) throw new Error(selected.reason);
      this.values.Routine = routineName;
      this.wrapper.controller.write('Navigation.Routine=bCString', 'Game:202873e0');
      for (const assignment of selected.value) {
        this.values[assignment.property] = assignment.propertyId;
        this.wrapper.controller.write('Navigation.Set' + assignment.property + '(Routine)', 'Game:202873e0');
      }
    });
  }
  assignDefault(field: NativeReflectionField): NativeValue<void> {
    return this.wrapper.controller.value(() => {
      this.exact(); const offset = field.nativeOffset;
      if (field.typeName === 'bCVector') this.writeVector(offset, [0, 0, 0]);
      else if (field.typeName === 'bCPropertyID') {
        const scratch: NativeNavigationGuidScratch = { bytes: new Uint8Array(20), knownMask: new Uint8Array(20), destroyed: false };
        scratch.knownMask[16] = 0xff; this.guidScratch.push(scratch);
        this.wrapper.controller.write('temporary bCGuid ctor known validity byte0', 'SharedBase:100063c5');
        this.wrapper.controller.effect('CoCreateGuid captured temporary; HRESULT ignored', 'SharedBase:10012570', () => this.host.coCreateGuid?.(scratch));
        scratch.bytes[16] = 1; scratch.knownMask[16] = 0xff;
        this.wrapper.controller.write('Guid.Generate validity byte1', 'SharedBase:10012570');
        // Captured destination remains this physical PS even if the GUID host
        // changes wrapper.native; the next GetNativeObject will then stop.
        this.store(offset, scratch.bytes.subarray(0, 16), scratch.knownMask.subarray(0, 16)); this.u32(offset + 16, 0);
        scratch.destroyed = true; this.wrapper.controller.write('PropertyID.copy Guid16/cache0; Guid destructor RET', 'SharedBase:10092760');
      } else if (field.typeName === 'bCString') this.values[field.name] = '';
      else if (field.typeName === 'bool') this.u8(offset, 0);
      // Array/proxy default functions only resolve the existing member pointer.
      this.wrapper.controller.write('descriptor default ' + field.name, field.defaultInitializer ?? field.reader);
    });
  }
  private readArray(field: NativeReflectionField, input: NativeEntityByteInput, stringArray: boolean): void {
    const array = this.arrays.get(field.name); if (!array) throw new Error('Actual constructor array missing');
    input.u8(); const count = input.u32();
    // Fresh one-pass source profile excludes existing heap destruction/realloc.
    if (array.allocation !== null || array.count !== 0 || array.capacity !== 0 || count > 65536) throw new Error('Nonfresh/large native array allocation profile unresolved');
    const offset = field.nativeOffset, controller = this.wrapper.controller;
    if (count > 0) {
      array.allocation = stringArray ? Array<string>(count).fill('') : new Uint8Array(count * 20);
      this.knownMask.fill(0, offset, offset + 4); // Capability pointer has no fabricated native address.
      controller.write('successful Realloc source array backing', stringArray ? 'Game:2028f890' : 'Game:20279700');
      array.capacity = count; this.u32(offset + 8, count);
      controller.write('source array new-member initialization/capacity', stringArray ? 'Game:2028f890' : 'Game:20279700');
    }
    array.count = count; this.u32(offset + 4, count); controller.write('source array count before payload read', stringArray ? 'Game:2028f890' : 'Game:20279700');
    if (stringArray) {
      const storage = array.allocation as string[] | null;
      for (let i = 0; i < count; i++) { storage![i] = ascii(input.string()); controller.write('indexed CString array element ' + i, 'Game:2028f890'); }
    } else if (count > 0) {
      // ValArray reads raw20B records; trailing cache DWORDs are preserved here.
      (array.allocation as Uint8Array).set(input.take(count * 20)); controller.write('raw PropertyID array payload', 'Game:20279700');
    }
  }
  readField(field: NativeReflectionField, input: NativeEntityByteInput): NativeValue<void> {
    return this.wrapper.controller.value(() => {
      const descriptorVersion = input.u16(); input.u32();
      this.notify('enter', field.name); this.exact();
      const offset = field.nativeOffset;
      if (field.typeName === 'bCVector') {
        const raw = input.take(12), view = new DataView(raw.buffer, raw.byteOffset, 12);
        this.writeVector(offset, [view.getFloat32(0, true), view.getFloat32(4, true), view.getFloat32(8, true)]);
      } else if (field.typeName === 'bCPropertyID') {
        const serialized = input.take(20); this.store(offset, serialized.subarray(0, 16)); this.u32(offset + 16, 0);
      } else if (field.typeName === 'bCString') this.values[field.name] = ascii(input.string());
      else if (field.typeName === 'bool') this.u8(offset, Number(input.bool()));
      else if (field.typeName === 'eCEntityProxy') {
        const proxy = this.proxies.get(field.name)!;
        input.u16(); const present = input.bool();
        if (present) proxy.setEntity(input.propertyID(), operation => this.wrapper.controller.write(operation, 'Engine:3000247d'));
        else proxy.clearEntityPointer(operation => this.wrapper.controller.write(operation, 'Engine:3000247d'));
      } else if (field.typeName.startsWith('bTValArray<') || field.typeName.startsWith('bTObjArray<')) {
        if (descriptorVersion < 30) throw new Error('Legacy array descriptor branch below30 unresolved');
        this.readArray(field, input, field.typeName.startsWith('bTObjArray<'));
      } else throw new Error('Actual Navigation descriptor reader unresolved');
      this.wrapper.controller.write('serialized property payload ' + field.name, field.reader);
      this.notify('exit', field.name);
    });
  }
  readNative(input: NativeEntityByteInput): NativeValue<void> {
    return this.wrapper.controller.value(() => {
      this.exact(); const version = input.u16();
      this.wrapper.controller.write('Navigation.Read consumes native version ' + version, 'Game:20030a30');
      if (version < 37) throw new Error('Navigation.Read legacy point/array tails below37 unresolved');
      // Source >=37 returns1 without base.Read or PostRead notifications.
    });
  }
}

function lifecycle(result: NativeNavigationOperation): NativeValue<void> {
  return result.outcome === 'complete' ? known(undefined) : missing(result.required);
}
/** Register a real original Navigation factory. Allocation exposes the actual
 * physical properties object before any default generator can stop the prefix. */
export function createNativeNavigationFactory(host: NativeNavigationReadingHost): NativeReflectionFactory & {
  properties(wrapper: NativeReflectionWrapper): NativeValue<OriginalNavigationProperties>;
} {
  const instances = new WeakMap<NativeReflectionWrapper, OriginalNavigationProperties>();
  const physical = (wrapper: NativeReflectionWrapper): OriginalNavigationProperties => {
    const result = instances.get(wrapper); if (!result) throw new Error('Actual constructed Navigation capability missing'); return result;
  };
  const factory: NativeReflectionFactory & { properties(wrapper: NativeReflectionWrapper): NativeValue<OriginalNavigationProperties> } = {
    root: Object.freeze({ className: 'gCNavigation_PS', baseClassName: 'eCEntityPropertySet', fields: Object.freeze(rules.fields.map(field => Object.freeze({ ...field }))) }),
    properties: wrapper => instances.has(wrapper) ? known(physical(wrapper)) : missing('Actual constructed Navigation capability missing'),
    getVersion: wrapper => wrapper.controller.value(() => { physical(wrapper).exact(); return 1; }),
    cloneRoot: controller => controller.value(() => {
      const wrapper = controller.allocateWrapper(factory, 'Game:20292300');
      const storage = controller.effect('fresh native Navigation allocation', 'Game:20291510', () => host.allocateNavigation(wrapper.identity + ':native'));
      const properties = new OriginalNavigationProperties(wrapper, host, storage.state, storage.wishes); instances.set(wrapper, properties);
      const callbacks: NativePropertyCallbacks = {
        added: candidate => controller.value(() => { properties.exact(); if (candidate !== properties.base) throw new Error('Actual Navigation callback receiver required');
          controller.effect('Navigation.OnPropertySetAdded', 'Game:2000ab32', () => host.lifecycle ? lifecycle(host.lifecycle.onPropertySetAdded(properties.state)) : undefined); }),
        removed: candidate => controller.value(() => { properties.exact(); if (candidate !== properties.base) throw new Error('Actual Navigation callback receiver required');
          controller.effect('Navigation.OnPropertySetRemoved', 'Game:200223cc', () => host.lifecycle ? lifecycle(host.lifecycle.onPropertySetRemoved(properties.state)) : undefined); }),
        postRead: candidate => controller.value(() => { properties.exact(); if (candidate !== properties.base) throw new Error('Actual Navigation callback receiver required');
          controller.effect('Navigation.OnPostRead GameReset/proxy callbacks', 'Game:2001708f', () => host.postRead?.(properties)); }),
      };
      const set = new NativeLivePropertySet(wrapper.identity + ':native', 'gCNavigation_PS', 5, properties.values,
        { read: () => properties.owner, write: owner => { properties.owner = owner; } }, null, callbacks,
        // Native slot+84: Game20461ec8 -> Engine30008783 ->30481520.
        // The body clears AL before RET; IsProcessable is false.
        () => known(false));
      properties.base = set; controller.retainNative(wrapper, set);
      controller.write('Native base eCEntityPropertySet constructor before Navigation members', 'Game:20289960');
      properties.initializeMembers();
      if (!set.isValid()) set.createBase(); controller.write('Navigation.Create inherited base.Create (return1)', 'Game:20004593');
      controller.setAllocationPhase(wrapper, 'created'); controller.attachConstructedNative(wrapper, set, 'Game:2028be90', 'Game:20291510');
      controller.initializeProperties(wrapper, field => properties.assignDefault(field), () => { properties.exact(); return known(undefined); }, 'SharedBase:100076f8');
      return wrapper;
    }),
    read: (wrapper, input) => wrapper.controller.value(() => wrapper.controller.readWrapperProperties(wrapper, input,
      { wrapperSource: 'Game:20028443', dataSource: 'Game:20292380',
        readField: (field, stream) => physical(wrapper).readField(field, stream), readNative: stream => physical(wrapper).readNative(stream) })),
  };
  return factory;
}
