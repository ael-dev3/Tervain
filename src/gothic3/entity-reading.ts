/** Original ReadV83 controller over a live entity and its embedded data.
 * A reflective accessor must really construct/read its concrete property set.
 * Serialized candidates do not become resident through this controller alone.
 */
import rulesText from '../../assets/gothic3/entity-reading/runtime-rules.json?raw';
import { NativeSceneEntityRegistry } from './entity-lifecycle';
import type { NativeLiveEntity, NativeLivePropertySet } from './entity-lifecycle';
import type { NativeValue } from './dialogue';

const rules = JSON.parse(rulesText) as { schema: string; entityVersion: number; sentinel: number;
  inputs: Record<string, string> };
if (rules.schema !== 'gothic3-entity-reading-rules-v1' || rules.entityVersion !== 83 ||
    rules.sentinel !== 0xdeadc0de ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') {
  throw new Error('Original entity read receipt differs');
}
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function fact<T>(value: NativeValue<T>, name: string): T {
  if (!value.known) throw new Error(name + ': ' + value.reason);
  return value.value;
}
const F32_MAX = 3.4028234663852886e38;

/** Source IsValid compares six sentinel values, not min<=max. Finite f32 input
 * excludes the unexamined native NaN/FPU exception domain. */
export function nativeEntityBoxIsValid(box: readonly number[]): boolean {
  if (box.length !== 6 || box.some((v) => !Number.isFinite(v) || !Object.is(v, Math.fround(v)))) {
    throw new Error('Box requires six finite native float32 fields');
  }
  return box[3] !== -F32_MAX && box[4] !== -F32_MAX && box[5] !== -F32_MAX &&
    box[0] !== F32_MAX && box[1] !== F32_MAX && box[2] !== F32_MAX;
}

/** Exact physical embedded arrays, supplied by the actual constructor host.
 * These references stay stable across Read and class-specific callbacks. */
export interface NativeEntityEmbeddedArrays {
  readonly worldMatrix: number[]; readonly localMatrix: number[];
  readonly treeBox: number[]; readonly localBox: number[]; readonly worldBox: number[];
  readonly worldSphere: number[]; readonly localSphere: number[];
}
export class NativeEntityReadData {
  readonly numeric = new Map<number, number>();
  readonly arrays: NativeEntityEmbeddedArrays;
  constructor(readonly entity: NativeLiveEntity, arrays: NativeEntityEmbeddedArrays,
    public name: string) {
    // Capture the same physical arrays once. The holder is metadata only;
    // callbacks can mutate array contents, never replace embedded storage.
    this.arrays = Object.freeze({ ...arrays });
    for (const [key, length] of [['worldMatrix', 16], ['localMatrix', 16], ['treeBox', 6],
      ['localBox', 6], ['worldBox', 6], ['worldSphere', 4], ['localSphere', 4]] as const) {
      if (this.arrays[key].length !== length) throw new Error('Supply actual embedded ' + key + ' storage');
    }
  }
}
export interface NativeEntityReadAccessor {
  /** Native ReadV83 compares this AL exactly with1. */
  isValidByte(): NativeValue<number>;
  nativeObject(): NativeValue<object | null>;
  className(): NativeValue<string>;
  destroy(): NativeValue<void>;
}
export type NativeEntityReadSetter = 'Enable' | 'EnableRendering' | 'DisableProcessing' |
  'EnablePicking' | 'EnableCollision' | 'SetRenderAlphaValue' | 'Lock';
export interface NativeEntityReadHost {
  /** Concrete engine setter, including ordered child/PS/physics callbacks.
   * Recursive false applies only to Picking; RenderAlpha uses true. */
  setter(target: NativeEntityReadData, operation: NativeEntityReadSetter,
    value: number | boolean, recursive?: boolean): NativeValue<void>;
  modified(target: NativeEntityReadData): NativeValue<number>;
  setName(target: NativeEntityReadData, name: string): NativeValue<void>;
  removeAllPropertySets(target: NativeEntityReadData): NativeValue<void>;
  readAccessor(input: NativeEntityByteInput): NativeValue<NativeEntityReadAccessor>;
  castPropertySet(object: object | null): NativeValue<NativeLivePropertySet<object> | null>;
  propertySetVersion(set: NativeLivePropertySet<object>): NativeValue<number>;
  /** The source rereads nativeObject and ignores AddPropertySet's bool return. */
  addPropertySet(target: NativeEntityReadData, object: object | null, sort: false): NativeValue<boolean>;
  warningNewerVersion(className: string, entityName: string, serializedVersion: number): NativeValue<void>;
  fatalInvalidSentinel(className: string, entityName: string,
    sourceFile: '.\\components\\scene\\entity\\ge_entity.cpp', sourceLine: 0xe19): NativeValue<void>;
  onPostRead(target: NativeEntityReadData): NativeValue<void>;
  /** Real GetPureScaling ->GetX. Includes its chosen x87/CRT math profile;
   * a generic Three.js decomposition is not this original helper. */
  pureScalingX(worldMatrix: readonly number[]): NativeValue<number>;
}

/** Buffered indexed-string stream used by the selected GENOMFLE archives.
 * Bounds/canonical-bool/finite-f32 guards state this reader's supported domain.
 * Read failure retains the cursor and all earlier live entity effects. */
export class NativeEntityByteInput {
  private readonly view: DataView;
  private position: number;
  constructor(readonly bytes: Uint8Array, readonly strings: readonly string[],
    begin = 0, readonly end = bytes.byteLength) {
    if (!Number.isSafeInteger(begin) || !Number.isSafeInteger(end) || begin < 0 || end < begin || end > bytes.byteLength) {
      throw new Error('Invalid native entity stream bounds');
    }
    this.position = begin;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  cursor(): number { return this.position; }
  private offset(length: number): number {
    if (!Number.isSafeInteger(length) || length < 0 || this.position + length > this.end) {
      throw new Error('Original entity stream is truncated at ' + this.position);
    }
    const start = this.position; this.position += length; return start;
  }
  u8(): number { return this.view.getUint8(this.offset(1)); }
  u16(): number { return this.view.getUint16(this.offset(2), true); }
  u32(): number { return this.view.getUint32(this.offset(4), true); }
  bool(): boolean {
    const value = this.u8();
    if (value !== 0 && value !== 1) throw new Error('Noncanonical original bool byte is outside this profile');
    return value === 1;
  }
  f32(): number {
    const value = this.view.getFloat32(this.offset(4), true);
    if (!Number.isFinite(value)) throw new Error('Nonfinite original entity field is outside this profile');
    return value;
  }
  take(length: number): Uint8Array {
    const start = this.offset(length); return this.bytes.subarray(start, start + length);
  }
  propertyID(): string { return [...this.take(20)].map((v) => v.toString(16).padStart(2, '0')).join(''); }
  string(): string {
    const index = this.u16(), value = this.strings[index];
    if (typeof value !== 'string') throw new Error('Original indexed string is absent: ' + index);
    return value;
  }
}
export interface NativeEntityReadTrace {
  operation: string; state: 'attempted' | 'applied'; cursor: number;
  value?: number | string | boolean;
}
export type NativeEntityReadResult =
  | { supported: true; nativeReturnValue: 1; trace: readonly NativeEntityReadTrace[]; worldResident: false }
  | { supported: false; nativeReturnValue: null; reason: string; trace: readonly NativeEntityReadTrace[]; worldResident: false };

export class NativeEntityV83Reader {
  private active = false;
  private blocked: string | null = null;
  private readonly rows: NativeEntityReadTrace[] = [];
  constructor(readonly host: NativeEntityReadHost, readonly registry: NativeSceneEntityRegistry) {}
  failure(): string | null { return this.blocked; }
  read(target: NativeEntityReadData, input: NativeEntityByteInput, entityVersion: 83): NativeEntityReadResult {
    if (this.active) this.blocked = 'Nested entity read is outside the selected profile';
    if (this.blocked || entityVersion !== 83) return { supported: false, nativeReturnValue: null,
      reason: this.blocked ?? 'Only original ReadV83 is implemented', trace: this.rows.slice(), worldResident: false };
    const record = (operation: string, state: NativeEntityReadTrace['state'], value?: NativeEntityReadTrace['value']): void => {
      this.rows.push({ operation, state, cursor: input.cursor(), value });
    };
    const call = <T>(name: string, callback: () => NativeValue<T>): T => {
      if (this.blocked) throw new Error(this.blocked);
      record(name, 'attempted');
      const value = fact(callback(), name);
      if (this.blocked) throw new Error(this.blocked);
      record(name, 'applied'); return value;
    };
    const write = (name: string, callback: () => void, value?: NativeEntityReadTrace['value']): void => {
      callback(); record(name, 'applied', value);
    };
    const flag = (mask: number, value: number): void => write('flags mask0x' + mask.toString(16), () => {
      target.entity.flags.value = ((target.entity.flags.value & ~mask) | (value & mask)) >>> 0;
      target.entity.flags.knownMask = (target.entity.flags.knownMask | mask) >>> 0;
    });
    const setter = (name: NativeEntityReadSetter, value: number | boolean, recursive?: boolean): void => {
      call(name, () => this.host.setter(target, name, value, recursive));
    };
    const modified = (): void => { call('Modified', () => this.host.modified(target)); };
    const array = (name: keyof NativeEntityEmbeddedArrays): void => {
      // Matrix/Box/Sphere each issue ONE virtual stream Read for64/24/16 bytes.
      // Decode that block into the same embedded array without callbacks between members.
      const values = target.arrays[name];
      const length = name.endsWith('Matrix') ? 16 : name.endsWith('Box') ? 6 : 4;
      if (values.length !== length) throw new Error('Actual embedded ' + name + ' storage changed size');
      record(name + ' block read', 'attempted');
      const bytes = input.take(length * 4);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let index = 0; index < length; index++) if (!Number.isFinite(view.getFloat32(index * 4, true))) {
        throw new Error('Nonfinite ' + name + ' block is outside the selected profile');
      }
      write(name + ' block read', () => {
        for (let index = 0; index < length; index++) values[index] = view.getFloat32(index * 4, true);
      });
    };
    const scalar = (offset: number, value: number): void => {
      write('field0x' + offset.toString(16), () => { target.numeric.set(offset, value); }, value);
    };
    this.active = true;
    try {
      const nodeVersion = input.u16();
      call('Node.Read', () => {
        const result = this.registry.readNodeIdentity(target.entity, nodeVersion, () => known(input.propertyID()));
        return result.outcome === 'complete' ? known(undefined) : { known: false, reason: result.required };
      });
      setter('Enable', input.bool());
      setter('EnableRendering', input.bool());
      setter('DisableProcessing', input.bool());
      flag(0x20, Number(input.bool()) << 5);
      flag(0x400, Number(input.bool()) << 10); modified();
      setter('EnablePicking', input.bool(), false);
      setter('EnableCollision', input.bool());
      setter('SetRenderAlphaValue', input.f32(), true);
      flag(0x3c000, input.u16() << 14); modified();
      scalar(0x38, input.u8()); modified();
      setter('Lock', input.bool());
      flag(0x2000000, Number(input.bool()) << 25);
      flag(0x2000, Number(input.bool()) << 13);
      const name = input.string(); call('virtual SetName', () => this.host.setName(target, name));
      array('worldMatrix'); array('localMatrix');
      array('treeBox'); array('localBox'); array('worldBox');
      array('worldSphere'); array('localSphere');
      scalar(0x128, input.f32());
      flag(0x400000, Number(input.bool()) << 22);
      scalar(0x12c, input.f32());
      const timestamp = input.u32(); // Kept on native stack until after OnPostRead.
      scalar(0x134, input.f32());
      flag(0x8000000, Number(input.bool()) << 27);
      flag(0x10000000, Number(input.bool()) << 28);
      call('RemoveAllPropertySets', () => this.host.removeAllPropertySets(target));
      const count = input.u32() | 0; // Source loop uses signed JLE/JL comparisons.
      for (let index = 0; index < count; index++) {
        const version = input.u16();
        const accessor = call('accessor construct/read', () => this.host.readAccessor(input));
        const valid = call('accessor IsValid', () => accessor.isValidByte());
        if (!Number.isInteger(valid) || valid < 0 || valid > 255) throw new Error('Accessor validity is not a native AL byte');
        if (valid === 1) {
          const object = call('accessor GetNativeObject for cast', () => accessor.nativeObject());
          const set = call('dynamic_cast eCEntityPropertySet', () => this.host.castPropertySet(object));
          if (set !== null) {
            const current = call('PS virtual GetVersion', () => this.host.propertySetVersion(set));
            if (!Number.isInteger(current) || current < 0 || current > 65535) throw new Error('Property version is not uint16');
            if (current < version) {
              const className = call('accessor class name', () => accessor.className());
              call('GE_MESSAGEF_WARN newer PS', () => this.host.warningNewerVersion(className, target.name, version));
            } else {
              const reread = call('accessor GetNativeObject for Add', () => accessor.nativeObject());
              call('virtual AddPropertySet(false)', () => this.host.addPropertySet(target, reread, false));
            }
          }
        }
        const sentinel = input.u32();
        if (sentinel !== 0xdeadc0de) {
          const className = call('accessor class name for fatal', () => accessor.className());
          call('CallFatalError invalid PS sentinel', () => this.host.fatalInvalidSentinel(className, target.name,
            '.\\components\\scene\\entity\\ge_entity.cpp', 0xe19));
        }
        call('accessor destructor', () => accessor.destroy());
      }
      flag(0x80000, Number(nativeEntityBoxIsValid(target.arrays.localBox)) << 19);
      flag(0x100000, Number(nativeEntityBoxIsValid(target.arrays.worldBox)) << 20);
      flag(0x200000, Number(nativeEntityBoxIsValid(target.arrays.treeBox)) << 21);
      call('virtual OnPostRead', () => this.host.onPostRead(target));
      write('DWORD130 source timestamp', () => { target.entity.propertyOwner.modifiedWord = timestamp; }, timestamp);
      if (target.arrays.worldMatrix.length !== 16) throw new Error('Actual embedded worldMatrix storage changed size');
      const scale = call('world GetPureScaling/GetX', () => this.host.pureScalingX(target.arrays.worldMatrix));
      if (!Number.isFinite(scale) || !Object.is(scale, Math.fround(scale))) throw new Error('Pure scaling result requires finite native float32');
      scalar(0x134, scale);
      // Base ReadV83 does not certify completion of the enclosing dynamic or
      // spatial Read, its creator/template patch, or active world membership.
      return { supported: true, nativeReturnValue: 1, trace: this.rows.slice(), worldResident: false };
    } catch (error) {
      this.blocked = error instanceof Error ? error.message : String(error);
      return { supported: false, nativeReturnValue: null, reason: this.blocked,
        trace: this.rows.slice(), worldResident: false };
    } finally { this.active = false; }
  }
}
