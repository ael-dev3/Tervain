/** Concrete original entity flag/name setters needed during ReadV83 and Start.
 * Every callback operates on the same physical entity/PS/physics object. */
import type { NativeValue } from './dialogue';
import type { NativeLiveEntity } from './entity-lifecycle';
import type { NativeEntityReadData, NativeEntityReadSetter } from './entity-reading';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function fact<T>(value: NativeValue<T>, name: string): T {
  if (!value.known) throw new Error(name + ': ' + value.reason);
  return value.value;
}

/** Original name table holds ordered NONOWNING pointers and permits duplicates.
 * Erasing the last matching pointer preserves the remaining order and empty
 * table entry. Absent-name count is -1; an existing empty entry has count0.
 * Browser profile: successful storage allocation and a single calling thread. */
export class NativeSceneNameRegistry {
  private readonly entries = new Map<string, NativeLiveEntity[]>();
  register(name: string, entity: NativeLiveEntity): true {
    if (name.length === 0 || name.includes('\0')) throw new Error('Name table profile requires nonempty names without embedded NUL');
    const list = this.entries.get(name);
    if (list) list.push(entity);
    else this.entries.set(name, [entity]);
    return true;
  }
  unregister(name: string, entity: NativeLiveEntity): boolean {
    const list = this.entries.get(name);
    if (!list) return false;
    const index = list.lastIndexOf(entity);
    if (index < 0) return false;
    list.splice(index, 1); return true;
  }
  count(name: string): number { return this.entries.get(name)?.length ?? -1; }
  first(name: string): NativeLiveEntity | null { return this.entries.get(name)?.[0] ?? null; }
  /** A read-only copy of the pointer array; entities themselves are not cloned. */
  entities(name: string): readonly NativeLiveEntity[] { return Object.freeze([...(this.entries.get(name) ?? [])]); }
}

export interface NativeEntityCollisionShape {
  readonly values: { IgnoredByTraceRay: boolean; DisableCollision: boolean };
  notifyEnter(property: 'IgnoredByTraceRay' | 'DisableCollision', propagated: false): NativeValue<void>;
  notifyExit(property: 'IgnoredByTraceRay' | 'DisableCollision', propagated: false): NativeValue<void>;
  clearTouchingShapes(): NativeValue<void>;
}
export interface NativeEntityPhysicsObject {
  setIgnoredByTraceRay(ignored: boolean): NativeValue<void>;
  setCollisionEnabled(enabled: boolean): NativeValue<void>;
}
export interface NativeEntitySetterHost {
  /** Actual virtual GetChildAt, after native GetChildrenCount reads its array. */
  child(target: NativeEntityReadData, index: number): NativeValue<NativeEntityReadData | null>;
  collisionShape(target: NativeEntityReadData, selector: 14): NativeValue<NativeEntityCollisionShape | null>;
  /** Reread DWORD30 after any PS callback; a captured earlier pointer is wrong. */
  physicalObject(target: NativeEntityReadData): NativeValue<NativeEntityPhysicsObject | null>;
  modified(target: NativeEntityReadData): NativeValue<number>;
  entityProcessingChanged(target: NativeEntityReadData): NativeValue<void>;
}
export interface NativeEntitySetterTrace {
  entity: string; operation: string; state: 'attempted' | 'applied'; value?: number | boolean | string;
}
export type NativeEntitySetterResult =
  | { supported: true; trace: readonly NativeEntitySetterTrace[] }
  | { supported: false; reason: string; trace: readonly NativeEntitySetterTrace[] };

export class NativeEntitySetters {
  private readonly rows: NativeEntitySetterTrace[] = [];
  private blocked: string | null = null;
  private active = false;
  constructor(readonly host: NativeEntitySetterHost, readonly names: NativeSceneNameRegistry) {}
  private record(target: NativeEntityReadData, operation: string, state: NativeEntitySetterTrace['state'],
    value?: NativeEntitySetterTrace['value']): void {
    this.rows.push({ entity: target.entity.identity, operation, state, value });
  }
  private call<T>(target: NativeEntityReadData, operation: string, callback: () => NativeValue<T>): T {
    if (this.blocked) throw new Error(this.blocked);
    this.record(target, operation, 'attempted');
    const value = fact(callback(), operation);
    if (this.blocked) throw new Error(this.blocked);
    this.record(target, operation, 'applied'); return value;
  }
  private write(target: NativeEntityReadData, operation: string, callback: () => void,
    value?: NativeEntitySetterTrace['value']): void {
    callback(); this.record(target, operation, 'applied', value);
  }
  private flag(target: NativeEntityReadData, mask: number, value: boolean): void {
    this.write(target, 'flags mask0x' + mask.toString(16), () => {
      const flags = target.entity.flags;
      flags.value = ((flags.value & ~mask) | (value ? mask : 0)) >>> 0;
      flags.knownMask = (flags.knownMask | mask) >>> 0;
    }, value);
  }
  private bit(target: NativeEntityReadData, mask: number): boolean {
    const flags = target.entity.flags;
    if ((flags.knownMask & mask) !== mask) throw new Error('Unproven backing flags at mask0x' + mask.toString(16));
    return (flags.value & mask) === mask;
  }
  private children(target: NativeEntityReadData, operation: NativeEntityReadSetter,
    value: number | boolean, recursive?: boolean): void {
    // Each next count reads the current real child array, including changes by callbacks.
    for (let index = 0; index < target.entity.children.length; index++) {
      const child = this.call(target, 'virtual GetChildAt(' + index + ')', () => this.host.child(target, index));
      if (child === null) throw new Error('Native setter reached a null child pointer');
      this.apply(child, operation, value, recursive);
    }
  }
  private apply(target: NativeEntityReadData, operation: NativeEntityReadSetter,
    value: number | boolean, recursive?: boolean): void {
    if (operation === 'SetRenderAlphaValue') {
      if (typeof value !== 'number' || !Number.isFinite(value) || !Object.is(value, Math.fround(value))) {
        throw new Error('Render alpha requires native finite float32');
      }
      this.write(target, 'DWORD34 render alpha', () => { target.numeric.set(0x34, value); }, value);
      if (recursive === true) this.children(target, operation, value, true);
      this.call(target, 'virtual Modified', () => this.host.modified(target));
      return;
    }
    if (typeof value !== 'boolean') throw new Error(operation + ' requires canonical native bool');
    switch (operation) {
      case 'Enable':
        this.flag(target, 8, value); this.children(target, operation, value); return;
      case 'EnableRendering':
        this.flag(target, 4, value); this.children(target, operation, value); return;
      case 'DisableProcessing':
        if (this.bit(target, 2) !== value) {
          this.flag(target, 2, value);
          if (this.bit(target, 0x80)) {
            this.call(target, 'EntityAdmin OnEntityProcessingChanged', () => this.host.entityProcessingChanged(target));
          }
        }
        this.children(target, operation, value); return;
      case 'EnablePicking': {
        this.flag(target, 0x800, value);
        const set = this.call(target, 'GetPropertySet14', () => this.host.collisionShape(target, 14));
        if (set !== null) {
          this.call(target, 'IgnoredByTraceRay NotifyEnter', () => set.notifyEnter('IgnoredByTraceRay', false));
          const exit = set.notifyExit; // Original function pointer captured before field write.
          this.write(target, 'CollisionShape IgnoredByTraceRay', () => { set.values.IgnoredByTraceRay = !value; }, !value);
          this.call(target, 'IgnoredByTraceRay NotifyExit', () => exit.call(set, 'IgnoredByTraceRay', false));
        }
        const physics = this.call(target, 'reread physic object', () => this.host.physicalObject(target));
        if (physics !== null) this.call(target, 'PhysicObject SetIgnoredByTraceRay', () => physics.setIgnoredByTraceRay(!value));
        if (recursive === true) this.children(target, operation, value, true);
        return;
      }
      case 'EnableCollision': {
        this.flag(target, 0x1000, value);
        const set = this.call(target, 'GetPropertySet14', () => this.host.collisionShape(target, 14));
        if (set !== null) {
          this.call(target, 'DisableCollision NotifyEnter', () => set.notifyEnter('DisableCollision', false));
          const exit = set.notifyExit;
          this.write(target, 'CollisionShape DisableCollision', () => { set.values.DisableCollision = !value; }, !value);
          this.call(target, 'DisableCollision NotifyExit', () => exit.call(set, 'DisableCollision', false));
          this.call(target, 'ClearTouchingShapes', () => set.clearTouchingShapes());
        }
        const physics = this.call(target, 'reread physic object', () => this.host.physicalObject(target));
        if (physics !== null) this.call(target, 'PhysicObject SetCollisionEnabled', () => physics.setCollisionEnabled(value));
        this.children(target, operation, value); return;
      }
      case 'Lock':
        this.flag(target, 1, value);
        // Original Lock applies EnablePicking to children, not recursive Lock.
        this.children(target, 'EnablePicking', value, true); return;
    }
  }
  private run(body: () => void): NativeEntitySetterResult {
    if (this.active) this.blocked = 'Reentrant external entity setter is outside the selected profile';
    if (this.blocked) return { supported: false, reason: this.blocked, trace: this.rows.slice() };
    this.active = true;
    try {
      body();
      if (this.blocked) throw new Error(this.blocked);
      return { supported: true, trace: this.rows.slice() };
    } catch (error) {
      this.blocked = error instanceof Error ? error.message : String(error);
      return { supported: false, reason: this.blocked, trace: this.rows.slice() };
    } finally { this.active = false; }
  }
  execute(target: NativeEntityReadData, operation: NativeEntityReadSetter, value: number | boolean,
    recursive?: boolean): NativeEntitySetterResult {
    return this.run(() => this.apply(target, operation, value, recursive));
  }
  /** Exact Engine SetName profile; concrete overridden virtuals require their own host. */
  setName(target: NativeEntityReadData, name: string): NativeEntitySetterResult {
    return this.run(() => {
      if (name.includes('\0') || target.name.includes('\0')) throw new Error('Embedded NUL name is outside the selected string profile');
      if (target.name.length !== 0) this.write(target, 'SceneAdmin UnregisterNameInfo', () => {
        this.names.unregister(target.name, target.entity);
      }, target.name);
      this.write(target, 'entity name assignment', () => { target.name = name; }, name);
      if (target.name.length !== 0) this.write(target, 'SceneAdmin RegisterNameInfo', () => {
        this.names.register(target.name, target.entity);
      }, target.name);
      this.call(target, 'virtual Modified', () => this.host.modified(target));
    });
  }
  readHostSetter(target: NativeEntityReadData, operation: NativeEntityReadSetter,
    value: number | boolean, recursive?: boolean): NativeValue<void> {
    const result = this.execute(target, operation, value, recursive);
    return result.supported ? known(undefined) : { known: false, reason: result.reason };
  }
}
