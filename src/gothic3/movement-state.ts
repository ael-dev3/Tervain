/** Installed character movement stores and examined native transitions.
 *
 * Native units remain centimetres. These operations retain the SAME +100 mode,
 * owner, property-set pointers and velocity buffer used by the Hero scripts.
 * No position integration, grounded guess, speed limit or Explorer motion is
 * substituted for unresolved collision/PhysX/animation services. Unknown calls
 * preserve their ordered prefix. Selected host profile: synchronous stable
 * allocations, finite binary32 fields and no reentrant movement mutation.
 */
import rulesText from '../../assets/gothic3/movement-state/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import type { NativePlayerActor, NativePlayerMovement, NativePlayerMovementOwner } from './player-state';
import type { NativeScriptProcessingUnit } from './script-routine';

const rules = JSON.parse(rulesText) as { schema: string; gameSha256: string; defaultSpeed: number;
  speedSourceOffsets: Record<string, number>; entries: Record<string, { body: string }> };
if (rules.schema !== 'gothic3-movement-state-rules-v1' || rules.gameSha256 !==
    'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.entries.SetMovementMode?.body !== '2022c810' || rules.defaultSpeed !== 1) {
  throw new Error('Original movement rules differ');
}
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(v: NativeValue<T>, label: string): T {
  if (!v.known) throw new Error(label + ': ' + v.reason);
  return v.value;
}
function integer(v: number, signed = false): number {
  if (!Number.isInteger(v) || v < (signed ? -0x80000000 : 0) || v > (signed ? 0x7fffffff : 0xffffffff)) {
    throw new Error('Native ' + (signed ? 'int32' : 'uint32') + ' required');
  }
  return v;
}
function u8(v: number): number { if (!Number.isInteger(v) || v < 0 || v > 255) throw new Error('Native byte required'); return v; }
function float(v: number): number {
  if (!Number.isFinite(v) || !Number.isFinite(Math.fround(v))) throw new Error('Finite binary32 movement field required');
  return Math.fround(v);
}
export type NativeMovementVector = readonly [number, number, number];
export type NativeMovementQuaternion = readonly [number, number, number, number];
function vector(v: NativeMovementVector): NativeMovementVector { return [float(v[0]), float(v[1]), float(v[2])]; }
function quaternion(v: NativeMovementQuaternion): NativeMovementQuaternion { return [float(v[0]), float(v[1]), float(v[2]), float(v[3])]; }
/** SharedBase10025840 squares X/Y, adds them, adds Z², stores ONE float32,
 * then compares with0. Tiny nonzero vectors can therefore returntrue. Use
 * exact integer rationals and all three x87 precision widths; reject a result
 * that depends on uncaptured precision control. Selected host rounding mode
 * is nearest/even; an altered native rounding mode is outside this profile. */
export function nativeMovementHasZeroMagnitude(value: NativeMovementVector): boolean {
  const bits = new DataView(new ArrayBuffer(4));
  const terms = vector(value).map(n => {
    bits.setFloat32(0, n, true); const word = bits.getUint32(0, true), exponent = (word >>> 23) & 255;
    const mantissa = BigInt((word & 0x7fffff) | (exponent === 0 ? 0 : 0x800000));
    return mantissa * mantissa << BigInt(exponent === 0 ? 0 : 2 * (exponent - 1));
  });
  const rounded = (n: bigint, width: number): bigint => {
    const lost = n.toString(2).length - width; if (lost <= 0) return n;
    const shift = BigInt(lost), top = n >> shift, rest = n - (top << shift), half = 1n << (shift - 1n);
    return (top + (rest > half || (rest === half && (top & 1n) !== 0n) ? 1n : 0n)) << shift;
  };
  const results = [24, 53, 64].map(width => rounded(rounded(rounded(terms[0]!, width) +
    rounded(terms[1]!, width), width) + rounded(terms[2]!, width), width) <= (1n << 148n));
  if (results.some(result => result !== results[0])) throw new Error('HasZeroMagnitude depends on uncaptured x87 precision control');
  return results[0]!;
}
const zero = nativeMovementHasZeroMagnitude;

/** Explicit actual object bytes/known mask. No absent loaded field is replaced
 * with a factory default. The byte array and mask are retained, not copied. A
 * source-backed property decoder may fill the identical storage later. */
export class NativeMovementBytes {
  private readonly view: DataView;
  /** Native masked writes can initialize selected bits of a fresh byte while
   * its other bits remain unknown. Whole-byte knownBytes remains compatible;
   * callers directly updating retained metadata must keep both masks coherent. */
  readonly knownBitMasks: Uint8Array;
  revision = 0;
  constructor(readonly bytes: Uint8Array, readonly knownBytes: Uint8Array, knownBitMasks?: Uint8Array) {
    if (bytes.length < 0x3dc || knownBytes.length !== bytes.length || knownBytes.some(v => v !== 0 && v !== 1)) {
      throw new Error('CharacterMovement physical byte store/known-mask shape differs');
    }
    this.knownBitMasks = knownBitMasks ?? Uint8Array.from(knownBytes, value => value === 1 ? 255 : 0);
    if (this.knownBitMasks.length !== bytes.length || this.knownBitMasks.some((value, index) =>
      (value === 255) !== (knownBytes[index] === 1))) throw new Error('Movement whole-byte/bit-known masks disagree');
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  has(offset: number, length: number): boolean {
    return Number.isInteger(offset) && Number.isInteger(length) && offset >= 0 && length >= 0 && offset + length <= this.bytes.length &&
      this.knownBytes.subarray(offset, offset + length).every(v => v === 1);
  }
  private range(offset: number, length: number): void {
    if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length < 0 || offset + length > this.bytes.length) {
      throw new Error('CharacterMovement write range outside physical storage');
    }
  }
  private check(offset: number, length: number): void {
    if (!this.has(offset, length)) throw new Error('Unknown CharacterMovement bytes+' + offset.toString(16));
  }
  byte(offset: number): number { this.check(offset, 1); return this.view.getUint8(offset); }
  int(offset: number): number { this.check(offset, 4); return this.view.getInt32(offset, true); }
  uint(offset: number): number { this.check(offset, 4); return this.view.getUint32(offset, true); }
  float(offset: number): number { this.check(offset, 4); return float(this.view.getFloat32(offset, true)); }
  vector(offset: number): NativeMovementVector { return [this.float(offset), this.float(offset + 4), this.float(offset + 8)]; }
  quaternion(offset: number): NativeMovementQuaternion { return [this.float(offset), this.float(offset + 4), this.float(offset + 8), this.float(offset + 12)]; }
  private changed(offset: number, length: number): void {
    this.knownBytes.fill(1, offset, offset + length); this.knownBitMasks.fill(255, offset, offset + length); this.revision++;
  }
  maskedByte(offset: number, mask: number): number {
    this.range(offset, 1); u8(mask);
    if ((this.knownBitMasks[offset]! & mask) !== mask) throw new Error('Unknown CharacterMovement bits+' + offset.toString(16));
    return this.view.getUint8(offset) & mask;
  }
  writeMaskedByte(offset: number, mask: number, value: number): void {
    this.range(offset, 1); u8(mask); u8(value);
    this.view.setUint8(offset, (this.view.getUint8(offset) & ~mask) | (value & mask));
    this.knownBitMasks[offset] = this.knownBitMasks[offset]! | mask;
    this.knownBytes[offset] = this.knownBitMasks[offset] === 255 ? 1 : 0; this.revision++;
  }
  writeByte(offset: number, value: number): void { this.range(offset, 1); this.view.setUint8(offset, u8(value)); this.changed(offset, 1); }
  writeInt(offset: number, value: number): void { this.range(offset, 4); this.view.setInt32(offset, integer(value, true), true); this.changed(offset, 4); }
  writeFloat(offset: number, value: number): void { this.range(offset, 4); this.view.setFloat32(offset, float(value), true); this.changed(offset, 4); }
  writeVector(offset: number, value: NativeMovementVector): void {
    this.range(offset, 12); const v = vector(value); v.forEach((n, i) => this.view.setFloat32(offset + i * 4, n, true)); this.changed(offset, 12);
  }
  writeQuaternion(offset: number, value: NativeMovementQuaternion): void {
    this.range(offset, 16); const v = quaternion(value); v.forEach((n, i) => this.view.setFloat32(offset + i * 4, n, true)); this.changed(offset, 16);
  }
  writeMatrix(offset: number, value: readonly number[]): void {
    this.range(offset, 64); if (value.length !== 16) throw new Error('Native matrix requires16 fields');
    const fields = value.map(float); fields.forEach((n, i) => this.view.setFloat32(offset + i * 4, n, true)); this.changed(offset, 64);
  }
}
export type NativeMovementResult<T> =
  | { outcome: 'complete'; value: T; applied: readonly string[]; attempted: readonly string[] }
  | { outcome: 'partial' | 'unsupported'; value: null; required: string; applied: readonly string[]; attempted: readonly string[] };
class Operation {
  readonly applied: string[] = [];
  readonly attempted: string[] = [];
  private failed: string | null = null;
  constructor(private readonly guard: () => void = () => {}) {}
  fail(error: unknown): void { this.failed ??= error instanceof Error ? error.message : String(error); }
  verify(): void { if (this.failed !== null) throw new Error(this.failed); this.guard(); }
  call<T>(label: string, body: () => NativeValue<T>): T {
    try {
      this.verify(); this.attempted.push(label); const value = fact(body(), label); this.applied.push(label); this.verify(); return value;
    } catch (error) { this.fail(error); throw error; }
  }
  write(label: string, body: () => void): void {
    try { this.verify(); body(); this.applied.push(label); this.verify(); }
    catch (error) { this.fail(error); throw error; }
  }
}
function complete<T>(result: NativeMovementResult<T>): NativeValue<T> {
  return result.outcome === 'complete' ? known(result.value) : unknown(result.required +
    '; retained native prefix: ' + result.applied.join(', '));
}

/** Captured virtual-table capability. Source may capture a table then reread
 * the +170 receiver after vector construction. Pass that actual live receiver
 * to the captured function; do not silently rebind its function table. */
export interface NativeMovementRigidBody {
  readonly virtuals: {
    setLinearVelocity(receiver: NativeMovementRigidBody, value: NativeMovementVector): NativeValue<void>;
    getLinearVelocity(receiver: NativeMovementRigidBody): NativeValue<NativeMovementVector>;
    addBodyFlag(receiver: NativeMovementRigidBody, mask: number): NativeValue<void>;
    removeBodyFlag(receiver: NativeMovementRigidBody, mask: number): NativeValue<void>;
    setGravity(receiver: NativeMovementRigidBody, enabledByte: number): NativeValue<void>;
  };
}
export interface NativeMovementCollision { readonly identity: object }
export interface NativeMovementSensor {
  /** Game20236b60 is a direct +3c pointer store. */
  movement: NativeCharacterMovement | null;
  position: NativeMovementVector; // live +14
  goalRotation: NativeMovementQuaternion; // live +50
  postProcessByte: number; // live +40
  setGoalPosition(position: NativeMovementVector, changedByte: number): NativeValue<void>;
  process(): NativeValue<void>;
}
/** Pure examined sensor stores; full Sensor.Process collision controller is
 * required explicitly. No wish is copied into the world transform. */
export class NativeCharacterSensor implements NativeMovementSensor {
  constructor(public movement: NativeCharacterMovement | null, public position: NativeMovementVector,
    public goalRotation: NativeMovementQuaternion, public postProcessByte: number,
    public goalPosition: NativeMovementVector, public previousPosition: NativeMovementVector,
    public processByte39: number, public processByte41: number,
    private readonly processBody: () => NativeValue<void>) {
    this.position = vector(position); this.goalRotation = quaternion(goalRotation); u8(postProcessByte);
    this.goalPosition = vector(goalPosition); this.previousPosition = vector(previousPosition); u8(processByte39); u8(processByte41);
  }
  setGoalPosition(position: NativeMovementVector, changedByte: number): NativeValue<void> {
    const value = vector(position); u8(changedByte);
    // Game20236ca0 compares goal+44 first, then writes changed+40. Its false
    // second argument always selects both actual position copies and+41 reset.
    if (value.some((n, i) => n !== this.goalPosition[i])) { this.goalPosition = value; this.postProcessByte = 1; }
    if (u8(this.processByte39) === 0 || changedByte === 0 || u8(this.processByte41) === 1) {
      this.position = vector(this.goalPosition); this.previousPosition = vector(this.position); this.processByte41 = 0;
    }
    return known(undefined);
  }
  process(): NativeValue<void> { return this.processBody(); }
}
export interface NativeMovementOwner extends NativePlayerMovementOwner {
  /** Actual owner GetPropertySet selectors, not source-catalog membership. */
  propertySet(selector: 13): NativeValue<NativeMovementRigidBody | null>;
  propertySet(selector: 14): NativeValue<NativeMovementCollision | null>;
  propertySet(selector: 23): NativeValue<NativeMovementSensor | null>;
  propertySet(selector: 100): NativeValue<object | null>;
  hasPropertySet(selector: 22): NativeValue<number>; // original returned AL
  processingRangeEntered(): NativeValue<number>;
  dead(): NativeValue<number>;
  worldPosition(): NativeValue<NativeMovementVector>;
  atVector(): NativeValue<NativeMovementVector>;
  worldMatrix(): NativeValue<readonly number[]>;
}
export interface NativeMovementPointers {
  rigidBody: NativeMovementRigidBody | null; // +170
  collision: NativeMovementCollision | null; // +174
  sensor: NativeMovementSensor | null; // +178
  /** Exact live CString at+3d8. Null means its source value is unknown. */
  effectName: string | null;
}
/** Captured ScriptAdmin receiver/+bc CallScript function, BEFORE the later
 * owner reread. Its original implementation gates game-running/processing,
 * updates the embedded admin SPU Self/Other/IntParameter, and calls RunScript.
 * Those effects must execute even when the selected callback body is trivial.
 * A provider may use originalBody ONLY after resolving the installed original
 * registration and constructing its nonowning Self/Other wrapper copies.
 * The incoming Hero SPU is not the native embedded ScriptAdmin SPU. */
export interface NativeMovementModeDispatcher {
  callScript(name: 'OnMovementModeChanged', owner: NativeMovementOwner, other: null, integerArgument: 0,
    originalBody: { readonly entry: '100029f5'; invoke(capturedMovement: NativeCharacterMovement): NativeValue<number> },
    access: NativeMovementExecution): NativeValue<number>;
}
export interface NativeMovementServices {
  /** Original +68 GetEntity and +6c AccessEntity are distinct calls. */
  owner(access: boolean): NativeValue<NativeMovementOwner | null>;
  applicationMode(slot: 0x26c | 0x270): NativeValue<number>;
  scaledSeconds(): NativeValue<number>;
  cameraMode168(): NativeValue<number | null>; // session getter + camera getter, null actual missing camera
  /** Complex source helper services must preserve effects, not just a bool.
   * Missing implementations returnunknown and stop at this exact boundary. */
  createShapes(movement: NativeCharacterMovement): NativeValue<void>;
  setShapes(movement: NativeCharacterMovement, mode: number): NativeValue<number>;
  canWalkOnFloor(movement: NativeCharacterMovement, normal: NativeMovementVector): NativeValue<number>;
  findFloorWaterCeiling(movement: NativeCharacterMovement, position: NativeMovementVector,
    flags: readonly [0, 1]): NativeValue<void>;
  putToGround(movement: NativeCharacterMovement, a: boolean, b: boolean): NativeValue<number>;
  visualAnimationMode(movement: NativeCharacterMovement, visual: object | null, enabled: 0 | 1): NativeValue<void>;
  stopMovementPose(movement: NativeCharacterMovement): NativeValue<void>;
  setEffects(movement: NativeCharacterMovement, mode: number): NativeValue<number>;
  /** Game200a4bb0 module getter/cache and captured ScriptAdmin vtable+bc.
   * Null is actual native absence, not an invented no-op dispatcher. */
  captureMovementModeDispatcher(): NativeValue<NativeMovementModeDispatcher | null>;
  controlledTranslation(movement: NativeCharacterMovement, access: NativeMovementExecution): NativeValue<void>;
  controlledRotation(movement: NativeCharacterMovement, access: NativeMovementExecution): NativeValue<void>;
  validateZoneGeometry(movement: NativeCharacterMovement, access: NativeMovementExecution): NativeValue<void>;
  contributeFloorMovements(movement: NativeCharacterMovement, access: NativeMovementExecution): NativeValue<void>;
  physicsMovements(movement: NativeCharacterMovement, access: NativeMovementExecution): NativeValue<void>;
  movementAnimation(movement: NativeCharacterMovement, access: NativeMovementExecution): NativeValue<void>;
  contributeFloorActions(movement: NativeCharacterMovement, access: NativeMovementExecution): NativeValue<void>;
  floorProxyEntity(dereference: boolean): NativeValue<{ worldMatrix(): NativeValue<readonly number[]> } | null>;
}
/** Scoped same-object source helper calls. Controlled translation may call
 * SetMovementMode or SetCurrentVelocity legally; these share the outer trace
 * and state. A saved, stale, async or cross-instance capability is rejected. */
export interface NativeMovementExecution {
  readonly movement: NativeCharacterMovement;
  setMovementMode(mode: number, spu?: NativeScriptProcessingUnit): void;
  setCurrentVelocity(value: NativeMovementVector): void;
  setGoalPosition(value: NativeMovementVector): void;
  stopMovement(): void;
}

/** Same live object exposed to PS_Normal and _AI_Jump. Pointer caches and
 * scalar stores are retained across all methods; results never roll back. */
export class NativeCharacterMovement implements NativePlayerMovement {
  private active = false;
  private nestedAttempt = false;
  private activeOperation: Operation | null = null;
  private blocked: string | null = null;
  constructor(readonly storage: NativeMovementBytes, readonly pointers: NativeMovementPointers,
    readonly services: NativeMovementServices) {}
  get movementMode(): number { return this.storage.int(0x100); }
  set movementMode(value: number) { this.storage.writeInt(0x100, value); }
  get brakingByte(): number | null { return this.storage.has(0x17c, 1) ? this.storage.byte(0x17c) : null; }
  set brakingByte(value: number | null) {
    if (value === null) { this.storage.knownBytes[0x17c] = 0; this.storage.knownBitMasks[0x17c] = 0; this.storage.revision++; }
    else this.storage.writeByte(0x17c, value);
  }
  owner(): NativeValue<NativeMovementOwner | null> { return this.services.owner(false); }
  private entity(op: Operation, access = false): NativeMovementOwner {
    const owner = op.call(access ? 'owner+6c' : 'owner+68', () => this.services.owner(access));
    if (!owner) throw new Error('Native owner dereference requires a nonnull resident entity');
    return owner;
  }
  private physics(): NativeMovementRigidBody {
    if (!this.pointers.rigidBody) throw new Error('Native +170 rigid-body dereference is null');
    return this.pointers.rigidBody;
  }
  private bodyCall(op: Operation, slot: 'addBodyFlag' | 'removeBodyFlag' | 'setGravity', value: number): void {
    const receiver = this.physics(), call = receiver.virtuals[slot];
    op.call('rigidBody.' + slot + '(' + value + ')', () => call(receiver, value));
  }
  private run<T>(body: (op: Operation) => T): NativeMovementResult<T> {
    const op = new Operation(() => {
      if (this.nestedAttempt) throw new Error('Callback attempted unsupported public reentrant movement mutation');
      if (!this.active || this.activeOperation !== op) throw new Error('Movement operation has no live same-instance capability');
    });
    if (this.active) { this.nestedAttempt = true; return { outcome: 'unsupported', value: null,
      required: 'Selected movement profile excludes reentrant mutation', applied: [], attempted: [] }; }
    if (this.blocked !== null) return { outcome: 'unsupported', value: null,
      required: 'Movement retained a partial prefix: ' + this.blocked, applied: [], attempted: [] };
    this.active = true; this.nestedAttempt = false; this.activeOperation = op;
    try {
      const value = body(op);
      op.verify();
      if (this.nestedAttempt) throw new Error('Callback attempted unsupported reentrant movement mutation');
      return { outcome: 'complete', value, applied: Object.freeze(op.applied), attempted: Object.freeze(op.attempted) };
    } catch (e) {
      const required = e instanceof Error ? e.message : String(e), partial = op.applied.length > 0 || op.attempted.length > 0;
      if (partial) this.blocked = required;
      return { outcome: partial ? 'partial' : 'unsupported', value: null,
        required, applied: Object.freeze(op.applied), attempted: Object.freeze(op.attempted) };
    } finally { this.active = false; this.activeOperation = null; }
  }
  /** Integration suspension after unknown native effects prevents replay. It
   * is not an original movement flag/reset; captured stores remain unchanged. */
  failure(): string | null { return this.blocked; }
  private processingService(op: Operation, label: string,
    body: (access: NativeMovementExecution) => NativeValue<void>): void {
    let live = true;
    const check = (): void => {
      if (!live || !this.active || this.activeOperation !== op) throw new Error('Stale native movement execution capability');
      op.verify();
    };
    const invoke = (body: () => void): void => {
      try { check(); body(); op.verify(); } catch (error) { op.fail(error); throw error; }
    };
    const access: NativeMovementExecution = Object.freeze({ movement: this,
      setMovementMode: (mode: number, spu?: NativeScriptProcessingUnit) => invoke(() => this.mode(op, integer(mode, true), spu)),
      setCurrentVelocity: (value: NativeMovementVector) => invoke(() => { vector(value); this.velocity(op, value); }),
      setGoalPosition: (value: NativeMovementVector) => invoke(() => this.goal(op, vector(value))),
      stopMovement: () => invoke(() => this.stop(op)),
    });
    try { op.call(label, () => body(access)); } finally { live = false; }
  }
  private b(op: Operation, offset: number, value: number): void { op.write('movement.byte+' + offset.toString(16), () => this.storage.writeByte(offset, value)); }
  private f(op: Operation, offset: number, value: number): void { op.write('movement.float+' + offset.toString(16), () => this.storage.writeFloat(offset, value)); }
  private v(op: Operation, offset: number, value: NativeMovementVector): void { op.write('movement.vector+' + offset.toString(16), () => this.storage.writeVector(offset, value)); }
  private dependants(op: Operation): void {
    if (!this.pointers.rigidBody) {
      const owner = this.entity(op); const value = op.call('GetPS13', () => owner.propertySet(13));
      op.write('cache+170', () => { this.pointers.rigidBody = value; });
    }
    if (!this.pointers.collision) {
      const owner = this.entity(op); const value = op.call('GetPS14', () => owner.propertySet(14));
      op.write('cache+174', () => { this.pointers.collision = value; });
    }
    const owner = this.entity(op, true);
    if (u8(op.call('HasPS22', () => owner.hasPropertySet(22))) === 1 && !this.pointers.sensor) {
      const source = this.entity(op); const value = op.call('GetPS23', () => source.propertySet(23));
      op.write('cache+178', () => { this.pointers.sensor = value; });
      if (!value) throw new Error('Native fatal missing gCCharacterSensor_PS; fatal error service not reconstructed');
      op.write('sensor+3c=movement', () => { value.movement = this; });
    }
  }
  createDependantPSets(): NativeMovementResult<void> { return this.run(op => this.dependants(op)); }
  standingVelocityZero(): NativeValue<boolean> {
    try {
      // Existing caller only invokes this when current mode is1.
      const receiver = this.physics(); const result = receiver.virtuals.getLinearVelocity(receiver);
      return result.known ? known(zero(vector(result.value))) : result;
    } catch (e) { return unknown(e instanceof Error ? e.message : String(e)); }
  }
  private speed(op: Operation, mode: number): 1 {
    const offset = rules.speedSourceOffsets[String(mode)];
    this.f(op, 0x160, mode === 14 ? 0 : offset === undefined ? rules.defaultSpeed : this.storage.float(offset));
    return 1;
  }
  setSpeedByMode(mode: number): NativeMovementResult<1> { return this.run(op => this.speed(op, integer(mode, true))); }
  private flags(op: Operation, mode: number): 0 | 1 {
    this.b(op, 0x260, 0);
    if (this.storage.byte(0x261) === 1) { this.bodyCall(op, 'addBodyFlag', 4); return 0; }
    const owner = this.entity(op);
    if (u8(op.call('IsDead', () => owner.dead())) === 1) {
      this.bodyCall(op, 'addBodyFlag', 14); this.bodyCall(op, 'addBodyFlag', 112); this.bodyCall(op, 'setGravity', 0); return 1;
    }
    if ([1, 2, 3, 4, 5, 10].includes(mode)) {
      if (!this.pointers.rigidBody) return 1;
      this.bodyCall(op, 'removeBodyFlag', 14); this.bodyCall(op, 'addBodyFlag', 4);
      this.bodyCall(op, 'addBodyFlag', 112); this.bodyCall(op, 'setGravity', 0); return 1;
    }
    if (mode === 6) {
      this.b(op, 0x17e, 0); if (!this.pointers.rigidBody) return 1;
      this.bodyCall(op, 'removeBodyFlag', 14); this.bodyCall(op, 'setGravity', 1); this.bodyCall(op, 'addBodyFlag', 112);
    } else if (mode === 13) {
      if (!this.pointers.rigidBody) return 1;
      this.bodyCall(op, 'removeBodyFlag', 14); this.bodyCall(op, 'setGravity', this.storage.byte(0x15)); this.b(op, 0x17e, 1);
    } else if (mode === 12) {
      this.b(op, 0x17e, 0); if (!this.pointers.rigidBody) return 1;
      this.bodyCall(op, 'addBodyFlag', 112); this.bodyCall(op, 'removeBodyFlag', 14); this.bodyCall(op, 'setGravity', this.storage.byte(0x15));
    } else if (mode === 0) {
      if (!this.pointers.rigidBody) return 1;
      this.bodyCall(op, 'removeBodyFlag', 14); this.bodyCall(op, 'removeBodyFlag', 112); this.bodyCall(op, 'setGravity', this.storage.byte(0x15));
    } else if (mode === 14) {
      this.b(op, 0x17e, 0); if (!this.pointers.rigidBody) return 1;
      this.bodyCall(op, 'addBodyFlag', 14); this.bodyCall(op, 'addBodyFlag', 112); this.bodyCall(op, 'setGravity', 0);
    }
    return 1;
  }
  setFlagsByMode(mode: number): NativeMovementResult<0 | 1> { return this.run(op => this.flags(op, integer(mode, true))); }
  private shapes(op: Operation, mode: number): number {
    if (!this.pointers.collision) {
      let owner = this.entity(op); const rb = op.call('Shape.GetPS13', () => owner.propertySet(13));
      op.write('shape.cache+170', () => { this.pointers.rigidBody = rb; });
      owner = this.entity(op); const collision = op.call('Shape.GetPS14', () => owner.propertySet(14));
      op.write('shape.cache+174', () => { this.pointers.collision = collision; });
      owner = this.entity(op); const sensor = op.call('Shape.GetPS23', () => owner.propertySet(23));
      op.write('shape.cache+178', () => { this.pointers.sensor = sensor; });
      if (!this.pointers.collision) return 0;
    }
    // Native cached-count !=0 bypasses all CreateDependantShapes work, even a
    // negative count. No fake cache is constructed from renderer geometry.
    if (this.storage.int(0x308) === 0) op.call('CreateDependantShapes', () => this.services.createShapes(this));
    const current = this.movementMode;
    if (current !== 0 && current !== 1 && mode !== 13 && current !== 13 && mode !== 14 && current !== 14) {
      if (current >= 12 && mode >= 12) return 0;
      if (current < 12 && mode < 12) return 0;
    }
    return integer(op.call('SetShapeByMode.remaining', () => this.services.setShapes(this, mode)), true);
  }
  private effects(op: Operation, mode: number): number {
    if (this.pointers.effectName === null) throw new Error('Unknown native effect CString+3d8');
    if (this.pointers.effectName === '' && ![7, 10, 12].includes(mode)) return 1;
    return u8(op.call('SetEffectsByMode', () => this.services.setEffects(this, mode)));
  }
  private goal(op: Operation, position: NativeMovementVector): void {
    this.dependants(op); this.v(op, 0x360, position); this.f(op, 0x37c, -1);
    const owner = this.entity(op, true);
    if (u8(op.call('Goal.HasPS22', () => owner.hasPropertySet(22))) === 1 && this.pointers.sensor) {
      this.dependants(op); const sensor = this.pointers.sensor;
      if (!sensor) throw new Error('Reread sensor+178 is null');
      op.call('Sensor.SetGoalPosition(false)', () => sensor.setGoalPosition(position, 0));
      this.b(op, 0x21c, 0); return;
    }
    const previous = this.storage.vector(0x2c0);
    if (position.some((v, i) => v !== previous[i])) this.b(op, 0x21d, 1);
    this.v(op, 0x2c0, position); this.b(op, 0x21c, 0);
  }
  setGoalPosition(position: NativeMovementVector): NativeMovementResult<void> { return this.run(op => this.goal(op, vector(position))); }
  private stop(op: Operation): void {
    if (this.storage.byte(0x264) === 1) return;
    for (const offset of [0x158, 0x15c, 0x10c]) this.f(op, offset, 0);
    for (const offset of [0x134, 0x140, 0x14c]) this.v(op, offset, [0, 0, 0]);
    if (!this.pointers.rigidBody) {
      const owner = this.entity(op); const rb = op.call('Stop.GetPS13', () => owner.propertySet(13));
      op.write('stop.cache+170', () => { this.pointers.rigidBody = rb; });
    }
    if (this.pointers.rigidBody) {
      op.call('StopMovement.SetGoalPose', () => this.services.stopMovementPose(this));
      const receiver = this.physics(), call = receiver.virtuals.setLinearVelocity;
      op.call('StopMovement.SetLinearVelocity(zero)', () => call(receiver, [0, 0, 0]));
    }
    this.v(op, 0x134, [0, 0, 0]);
    op.write('movement.byte+fc OR2', () => this.storage.writeMaskedByte(0xfc, 2, 2));
  }
  stopMovement(): NativeMovementResult<void> { return this.run(op => this.stop(op)); }
  private mode(op: Operation, mode: number, spu?: NativeScriptProcessingUnit): void {
    void spu; // Physical setter invokes the captured admin's embedded SPU instead.
    if (u8(op.call('app+26c', () => this.services.applicationMode(0x26c))) === 1 &&
        u8(op.call('app+270', () => this.services.applicationMode(0x270))) === 0) return;
    let owner = this.entity(op);
    if (u8(op.call('HasProcessingRangeEntered', () => owner.processingRangeEntered())) === 0) return;
    this.dependants(op); if (this.movementMode === mode) return;
    if (mode === 1) {
      if (this.storage.maskedByte(0xfc, 2) === 0 && u8(op.call('CanWalkOnFloor', () =>
        this.services.canWalkOnFloor(this, this.storage.vector(0xb8)))) === 0) return;
      if (this.movementMode === 7 || this.movementMode === 10) return;
      if (this.storage.byte(0x25f) === 1) {
        owner = this.entity(op); const pos = vector(op.call('worldPosition', () => owner.worldPosition()));
        op.call('FindFloorWaterCeiling(false,true)', () => this.services.findFloorWaterCeiling(this, pos, [0, 1]));
        if (this.storage.byte(0x25f) === 1) this.f(op, 0x390, this.storage.float(0x9c));
        op.call('PutToGround(true,false)', () => this.services.putToGround(this, true, false)); this.b(op, 0x25f, 0);
      }
      this.f(op, 0x158, 0); if (zero(this.storage.vector(0x354))) this.f(op, 0x15c, 0);
      this.f(op, 0x108, 0); this.v(op, 0x134, [0, 0, 0]); this.v(op, 0x140, [0, 0, 0]);
    }
    owner = this.entity(op); const visual = op.call('GetPS100', () => owner.propertySet(100));
    if (mode === 14) {
      this.stop(op); op.call('visualMode(1)', () => this.services.visualAnimationMode(this, visual, 1));
    } else {
      if (this.movementMode === 14) op.call('visualMode(0)', () => this.services.visualAnimationMode(this, visual, 0));
      if (mode === 12) {
        owner = this.entity(op); const at = vector(op.call('GetAtVector', () => owner.atVector()));
        const a = this.storage.vector(0xc4), dot = a[0] * at[0] + a[1] * at[1] + a[2] * at[2];
        // Float64 dot sign only accepted when all products and their sum are
        // exact binary32; avoids silently claiming arbitrary x87 rounding.
        if ([a[0] * at[0], a[1] * at[1], a[2] * at[2], dot].some(v => v !== Math.fround(v))) {
          throw new Error('Slide dot-product precision outside exact binary32 profile');
        }
        this.b(op, 0x3b8, dot < 0 ? 1 : 0);
        op.call('PutToGround(true,true)', () => this.services.putToGround(this, true, true));
      }
    }
    this.b(op, 0x17d, 1); this.shapes(op, mode); this.speed(op, mode); this.flags(op, mode); this.effects(op, mode);
    if (mode === 6) {
      const captured = this.physics().virtuals.setLinearVelocity;
      const jump: NativeMovementVector = [0, this.storage.float(0x80), 0];
      const receiver = this.physics(); op.call('jump.rigidBody+16c', () => captured(receiver, jump));
      this.b(op, 0x3d1, this.movementMode === 5 ? 1 : 0);
    }
    const previous = this.movementMode;
    op.write('movement.int+104', () => this.storage.writeInt(0x104, previous));
    op.write('movement.int+100', () => this.storage.writeInt(0x100, mode));
    if (previous >= 12) {
      if (mode < 12) {
        owner = this.entity(op, true);
        if (u8(op.call('GetMovementIsControledByPlayer', () => owner.hasPropertySet(22))) === 1) {
          owner = this.entity(op); const pos = vector(op.call('worldPosition.goal', () => owner.worldPosition())); this.goal(op, pos);
        }
        owner = this.entity(op); this.f(op, 0x390, vector(op.call('worldPosition.Y', () => owner.worldPosition()))[1]);
      } else this.f(op, 0x390, this.storage.float(0x9c));
    } else if (mode === 13) { this.f(op, 0x388, 0); this.f(op, 0x38c, 0); }
    const dispatcher = op.call('ScriptAdmin getter/capture+bc', () => this.services.captureMovementModeDispatcher());
    if (!dispatcher) throw new Error('Original ScriptAdmin getter returned null before native vtable dereference');
    owner = this.entity(op);
    this.processingService(op, 'ScriptAdmin.CallScript(OnMovementModeChanged)', access => {
      let bodyLive = true;
      const originalBody = Object.freeze({ entry: '100029f5' as const,
        invoke: (captured: NativeCharacterMovement): NativeValue<number> => {
          try {
            op.verify();
            if (!bodyLive) throw new Error('Stale original movement callback capability');
            if (captured !== this) throw new Error('Original callback Self wrapper has a different CharacterMovement PS');
            const current = this.movementMode, old = this.storage.int(0x104);
            if ([7, 10, 12, 13].includes(current) || [7, 12, 13].includes(old)) {
              throw new Error('Original fall/swim/slide/old-mode callback body requires further script effects');
            }
            op.applied.push('OnMovementModeChanged ordinary original body returns1');
            return known(1);
          } catch (error) { op.fail(error); throw error; }
        },
      });
      try {
        const result = dispatcher.callScript('OnMovementModeChanged', owner, null, 0, originalBody, access);
        // Native caller ignores the complete integer return, including gate0.
        return result.known ? (integer(result.value, true), known(undefined)) : result;
      } finally { bodyLive = false; }
    });
    this.f(op, 0x3bc, -1); this.b(op, 0x17e, 0);
    for (const offset of [0x3c4, 0x398, 0x94, 0x3c8]) this.f(op, offset, 0);
    if (mode !== 13 && mode !== 6) this.b(op, 0x3d1, 0);
  }
  setMovementMode(mode: number, spu?: NativeScriptProcessingUnit): NativeMovementResult<void> {
    return this.run(op => this.mode(op, integer(mode, true), spu));
  }
  /** NativePlayerStateHost physicalMovementMode adapter requires object identity
   * matching. It does not modify wishes, actor state, or a renderer transform. */
  physicalMovementMode(actor: NativePlayerActor, mode: number, spu: NativeScriptProcessingUnit): NativeValue<void> {
    return actor.movement === this ? complete(this.setMovementMode(mode, spu)) : unknown('Actor has a different captured movement PS');
  }
  private velocity(op: Operation, value: NativeMovementVector): void {
    if (this.pointers.rigidBody) {
      const receiver = this.physics(), call = receiver.virtuals.setLinearVelocity;
      op.call('SetCurrentVelocity.rigidBody+16c', () => call(receiver, value));
    }
    this.v(op, 0x134, value);
  }
  setCurrentVelocity(value: NativeMovementVector): NativeMovementResult<void> {
    return this.run(op => { vector(value); this.velocity(op, value); });
  }
  calcNextSteps(): NativeMovementResult<void> {
    return this.run(op => {
      const owner = this.entity(op, true);
      if (u8(op.call('CalcNextSteps.HasPS22', () => owner.hasPropertySet(22))) !== 1 || !this.pointers.sensor) return;
      this.dependants(op); let sensor = this.pointers.sensor;
      if (!sensor) throw new Error('Reread sensor+178 is null');
      this.v(op, 0x2c0, vector(sensor.position)); this.dependants(op); sensor = this.pointers.sensor;
      if (!sensor) throw new Error('Second reread sensor+178 is null');
      op.write('movement.quaternion+2cc', () => this.storage.writeQuaternion(0x2cc, quaternion(sensor.goalRotation)));
    });
  }
  processSensorMovements(): NativeMovementResult<void> {
    return this.run(op => {
      if (this.movementMode === 1 || !this.pointers.sensor) return;
      const owner = this.entity(op, true);
      if (u8(op.call('Sensor.HasPS22', () => owner.hasPropertySet(22))) !== 1) return;
      this.dependants(op); const sensor = this.pointers.sensor;
      if (!sensor) throw new Error('Reread sensor+178 is null');
      op.call('Sensor.Process', () => sensor.process());
    });
  }
  resetProcessing(): NativeMovementResult<void> { return this.run(op => this.b(op, 0x2bc, 0)); }
  getProcessing(): number { return this.storage.byte(0x2bc); }
  /** Engine inherited OnPreProcess304818f0 is RET; then Game20221630 writes1. */
  preProcess(): NativeMovementResult<void> { return this.run(op => { op.applied.push('base OnPreProcess RET'); this.b(op, 0x2bc, 1); }); }
  isProcessable(): 1 { return 1; }
  /** Original GetCurrentVelocity20222ba0 returns a scalar current speed+158,
   * distinct from the physical vector query used by IsStanding. */
  getCurrentVelocity(): number { return this.storage.float(0x158); }
  saveFrameStates(): NativeMovementResult<void> {
    return this.run(op => {
      let owner = this.entity(op); this.v(op, 0x11c, vector(op.call('SaveFrame.worldPosition', () => owner.worldPosition())));
      owner = this.entity(op); const matrix = op.call('SaveFrame.worldMatrix', () => owner.worldMatrix());
      if (matrix.length !== 16) throw new Error('Owner world matrix is outside original16-field profile');
      this.v(op, 0x128, [float(matrix[8]!), float(matrix[9]!), float(matrix[10]!)]);
      if (op.call('floorProxy.GetEntity', () => this.services.floorProxyEntity(false)) !== null) {
        const floor = op.call('floorProxy.operator-> reread', () => this.services.floorProxyEntity(true));
        if (floor === null) throw new Error('Floor proxy operator-> dereference is null');
        const world = op.call('floor.worldMatrix', () => floor.worldMatrix());
        op.write('movement.matrix+19c', () => this.storage.writeMatrix(0x19c, world));
      }
    });
  }
  sensorPostProcess(): NativeMovementResult<void> {
    return this.run(op => {
      if (!this.pointers.sensor) throw new Error('SensorPostProcess requires actual sensor receiver');
      const sensor = this.pointers.sensor; op.write('sensor.byte+40', () => { sensor.postProcessByte = 0; });
    });
  }
  /** Exact ProcessMovements routing. Remaining source services are named
   * individually in native order; their effects must execute before completion. */
  processMovements(): NativeMovementResult<void> {
    return this.run(op => {
      if (this.movementMode >= 12) this.processingService(op, 'ProcessPhysicsMovements', access => this.services.physicsMovements(this, access));
      else {
        this.processingService(op, 'ValidateZoneGeometry', access => this.services.validateZoneGeometry(this, access));
        this.processingService(op, 'ProcessControledTranslation', access => this.services.controlledTranslation(this, access));
        this.processingService(op, 'ProcessControledRotation', access => this.services.controlledRotation(this, access));
        this.processingService(op, 'ContributeFloorMovements', access => this.services.contributeFloorMovements(this, access));
        const receiver = this.physics(); const velocity = vector(op.call('GetLinearVelocity', () => receiver.virtuals.getLinearVelocity(receiver)));
        if (zero(velocity) && this.storage.byte(0x90) === 0) this.bodyCall(op, 'addBodyFlag', 14);
      }
      if (this.storage.byte(0x22c) === 1) this.processingService(op, 'ProcessMovementAnimation', access => this.services.movementAnimation(this, access));
      this.processingService(op, 'ContributeFloorActions', access => this.services.contributeFloorActions(this, access));
    });
  }
  /** Actual translation timer+3d4 prefix, followed by the camera/special-mode
   * boundary. Subtraction of binary32 inputs is performed in binary64 then
   * storedbinary32; exact-store profile rejects ambiguous extended rounding. */
  controlledTranslationPrefix(): NativeMovementResult<void> {
    return this.run(op => {
      const dt = float(op.call('GetScaledFrameTimeInSeconds', () => this.services.scaledSeconds()));
      const pending = this.storage.float(0x3d4);
      if (pending > 0) {
        const difference = pending - dt;
        if (difference > 0 && difference !== Math.fround(difference)) throw new Error('Timer subtraction outside exact binary32 profile');
        this.f(op, 0x3d4, difference < 0 ? 0 : difference);
      }
      const owner = this.entity(op, true);
      if (u8(op.call('Translation.HasPS22', () => owner.hasPropertySet(22))) === 1) {
        const camera = op.call('Camera.slot168', () => this.services.cameraMode168());
        if (camera !== null && u8(camera) === 1) {
          op.call('PutToGround(false,false)', () => this.services.putToGround(this, false, false));
          throw new Error('Original AddToCurrentVelocity camera path requires vector/buffer processing');
        }
      }
      throw new Error(this.movementMode === 6 ? 'Original jump translation requires ordered five TraceRayFirstHit calls and goal/velocity processing' :
        'Original controlled translation requires PutToGround, goal distance, braking, acceleration and collision services');
    });
  }
}

/** Original collision callback inputs are actual iterator capabilities. Read
 * operations consume the SAME iterator in source order, including all patches
 * and points; browser mesh ray hits are not equivalent contact iterators. */
export interface NativeMovementContact {
  collisionType(): NativeValue<number>;
  nextShape(): NativeValue<number>;
  shape(index: 0): NativeValue<{ group: number; rawByte2f: number; rawByte30: number } | null>;
  nextPatch(): NativeValue<number>;
  nextPoint(): NativeValue<number>;
}
export interface NativeMovementContactEntity {
  readonly identity: object;
  flags(): NativeValue<number>;
  /** Literal selector22 is gCCharacterControl_PS; PlayerMemory is selector60. */
  hasCharacterControl(): NativeValue<number>;
}
export interface NativeMovementContactHost {
  targetProxy(): NativeValue<NativeMovementContactEntity | null>; // actual movement+240 proxy
  ownerHasCharacterControl(): NativeValue<number>;
  ownerPosition(): NativeValue<NativeMovementVector>;
}
export function nativeMovementOnUntouch(storage: NativeMovementBytes, entity: NativeMovementContactEntity | null,
  contact: NativeMovementContact, host: Pick<NativeMovementContactHost, 'ownerHasCharacterControl'>): NativeMovementResult<void> {
  const op = new Operation();
  try {
    if (entity !== null && (integer(op.call('contactEntity.flags', () => entity.flags())) & 0x800000) !== 0 &&
        u8(op.call('owner.HasPS22', () => host.ownerHasCharacterControl())) === 0) {
      if (integer(op.call('collisionType14', () => contact.collisionType()), true) === 14) {
        if (u8(op.call('contactEntity.HasPS22', () => entity.hasCharacterControl())) === 1) {
          op.write('movement.byte+25e', () => storage.writeByte(0x25e, 0));
        }
      } else if (integer(op.call('collisionType8', () => contact.collisionType()), true) === 8 ||
                 integer(op.call('collisionType10', () => contact.collisionType()), true) === 10 ||
                 integer(op.call('collisionType11', () => contact.collisionType()), true) === 11) {
        op.write('movement.byte+25d', () => storage.writeByte(0x25d, 0));
      }
    }
    return { outcome: 'complete', value: undefined, applied: op.applied, attempted: op.attempted };
  } catch (e) { return { outcome: op.applied.length || op.attempted.length ? 'partial' : 'unsupported', value: null,
    required: e instanceof Error ? e.message : String(e), applied: op.applied, attempted: op.attempted }; }
}
export function nativeMovementOnTouch(storage: NativeMovementBytes, entity: NativeMovementContactEntity | null,
  contact: NativeMovementContact, host: NativeMovementContactHost): NativeMovementResult<void> {
  const op = new Operation();
  const readByte = (label: string, body: () => NativeValue<number>): number => u8(op.call(label, body));
  try {
    if (entity === null) return { outcome: 'complete', value: undefined, applied: [], attempted: [] };
    if (integer(op.call('contact.GetCollisionType', () => contact.collisionType()), true) === 14) {
      if (storage.int(0x100) === 13) {
        const pos = vector(op.call('ownerPosition', () => host.ownerPosition()));
        const diff = pos[1] - storage.float(0x9c);
        if (diff !== Math.fround(diff)) throw new Error('Touch height subtraction outside exact binary32 profile');
        if (diff < storage.float(0x1c)) op.write('movement.byte+17e', () => storage.writeByte(0x17e, 0));
      }
      const first = op.call('targetProxy.GetEntity', () => host.targetProxy());
      const same = first !== null && op.call('targetProxy.GetEntity reread', () => host.targetProxy())?.identity === entity.identity;
      if (same || storage.int(0x100) === 13 || storage.int(0x100) === 6) {
        let weapon = false;
        while (readByte('GoNextShape', () => contact.nextShape()) !== 0) {
          const shape = op.call('GetShape(0)', () => contact.shape(0));
          if (shape) {
            if (same && integer(shape.group, true) === 7) weapon = true;
            if (!same && [1, 6, 12, 9].includes(integer(shape.group, true)) &&
                u8(shape.rawByte2f) === 0 && u8(shape.rawByte30) === 0) {
              op.write('movement.float+3bc', () => storage.writeFloat(0x3bc, 2));
            }
          }
          while (readByte('GoNextPatch', () => contact.nextPatch()) !== 0) {
            while (readByte('GoNextPoint', () => contact.nextPoint()) !== 0) { /* native iterator advances only */ }
          }
        }
        if (same && weapon) op.write('movement.byte+394', () => storage.writeByte(0x394, 1));
      }
    }
    if ((integer(op.call('contactEntity.flags', () => entity.flags())) & 0x800000) !== 0 &&
        readByte('owner.HasPS22', () => host.ownerHasCharacterControl()) === 0) {
      const type = integer(op.call('collisionType reread', () => contact.collisionType()), true);
      if (type === 14) {
        if (readByte('contactEntity.HasPS22', () => entity.hasCharacterControl()) === 1) op.write('movement.byte+25e', () => storage.writeByte(0x25e, 1));
      } else {
        if (integer(op.call('collisionType8', () => contact.collisionType()), true) === 8 || integer(op.call('collisionType10', () => contact.collisionType()), true) === 10 ||
            integer(op.call('collisionType11', () => contact.collisionType()), true) === 11) {
          op.write('movement.byte+25d', () => storage.writeByte(0x25d, 1));
        }
      }
    }
    return { outcome: 'complete', value: undefined, applied: op.applied, attempted: op.attempted };
  } catch (e) { return { outcome: op.applied.length || op.attempted.length ? 'partial' : 'unsupported', value: null,
    required: e instanceof Error ? e.message : String(e), applied: op.applied, attempted: op.attempted }; }
}

/** One actual Engine eCPhysicObjectStateBuffer. A freshly constructed buffer
 * has actor=null and empty headers, but its pending velocity is UNINITIALIZED.
 * The default vector constructor10024b70 performs no writes. Successful JS
 * allocation profile is bounded to65534 queue records; native allocation
 * failures, concurrent locks, NxActor execution and storage addresses are not
 * simulated. Commands below affect pending state, never world transforms. */
export interface NativePendingPhysicsSeed {
  actor: object | null; // physical +1b8, not owner or mesh identity
  commands: readonly number[]; // header+1c8 ushort capacity/count, selected JS storage profile
  pendingBits: readonly number[]; // logical bCBitField64, three allocated DWORDs
  velocity: NativeMovementVector | null; // +80; null unknown/uninitialized
  addFlags: readonly number[]; // pointer/count/capacity header+184
  removeFlags: readonly number[]; // header+190
}
export interface NativePendingPhysicsHost {
  sceneLocked(): NativeValue<number>;
  /** Exact unlocked branch, including acquire/release and NxActor calls.
   * Until those services are reconstructed this returnsunknown. */
  immediate(command: 4 | 11 | 12, actor: object,
    value: NativeMovementVector | number): NativeValue<void>;
}
export class NativePendingPhysicsBuffer {
  actor: object | null;
  private readonly commands: number[];
  private readonly pendingBits: number[];
  private velocity: NativeMovementVector | null;
  private readonly addFlags: number[];
  private readonly removeFlags: number[];
  revision = 0;
  constructor(seed: NativePendingPhysicsSeed, readonly host: NativePendingPhysicsHost) {
    if (seed.commands.length > 65534 || seed.pendingBits.length !== 3 || seed.commands.some(n => n !== 4 && n !== 11 && n !== 12)) {
      throw new Error('Pending buffer contains commands outside examined4/11/12 domain');
    }
    this.actor = seed.actor; this.commands = seed.commands.map(n => integer(n));
    this.pendingBits = seed.pendingBits.map(n => integer(n)); this.velocity = seed.velocity === null ? null : vector(seed.velocity);
    this.addFlags = seed.addFlags.map(n => integer(n)); this.removeFlags = seed.removeFlags.map(n => integer(n));
    if (this.commands.filter(n => n === 11).length !== this.addFlags.length ||
        this.commands.filter(n => n === 12).length !== this.removeFlags.length ||
        this.commands.filter(n => n === 4).length > 1 || this.commands.some(n => !this.contains(n)) ||
        (this.commands.includes(4) && this.velocity === null)) throw new Error('Pending buffer header/payload/bitfield receipts disagree');
  }
  static fromConstructor(host: NativePendingPhysicsHost): NativePendingPhysicsBuffer {
    return new NativePendingPhysicsBuffer({ actor: null, commands: [], pendingBits: [0, 0, 0],
      velocity: null, addFlags: [], removeFlags: [] }, host);
  }
  snapshot(): NativePendingPhysicsSeed { return { actor: this.actor, commands: [...this.commands], pendingBits: [...this.pendingBits],
    velocity: this.velocity === null ? null : vector(this.velocity), addFlags: [...this.addFlags], removeFlags: [...this.removeFlags] }; }
  private contains(n: number): boolean { return (((this.pendingBits[n >>> 5] ?? 0) >>> (n & 31)) & 1) !== 0; }
  private flag(n: number): void { const index = n >>> 5; this.pendingBits[index] = ((this.pendingBits[index] ?? 0) | (1 << (n & 31))) >>> 0; }
  private queue(n: 4 | 11 | 12, unique: boolean): void {
    if (!unique || !this.commands.includes(n)) {
      if (this.commands.length >= 65534) throw new Error('Native command capacity saturates65534; append would leave successful allocation profile');
      this.commands.push(n); this.revision++;
    }
    this.flag(n); this.revision++;
  }
  setLinearVelocity(value: NativeMovementVector): NativeValue<void> {
    try {
      vector(value); if (!this.actor) return known(undefined);
      if (u8(fact(this.host.sceneLocked(), 'Engine Scene.IsLocked')) === 0) {
        if (!this.actor) throw new Error('Native NxActor pointer became null after lock query');
        return this.host.immediate(4, this.actor, value);
      }
      this.queue(4, true); this.velocity = vector(value); this.revision++; return known(undefined);
    } catch (e) { return unknown(e instanceof Error ? e.message : String(e)); }
  }
  addBodyFlag(mask: number): NativeValue<void> { return this.bodyFlag(11, mask); }
  removeBodyFlag(mask: number): NativeValue<void> { return this.bodyFlag(12, mask); }
  private bodyFlag(command: 11 | 12, mask: number): NativeValue<void> {
    try {
      integer(mask); if (!this.actor) return known(undefined);
      if (u8(fact(this.host.sceneLocked(), 'Engine Scene.IsLocked')) === 0) {
        if (!this.actor) throw new Error('Native NxActor pointer became null after lock query');
        return this.host.immediate(command, this.actor, mask);
      }
      this.queue(command, false);
      (command === 11 ? this.addFlags : this.removeFlags).push(mask); this.revision++; return known(undefined);
    } catch (e) { return unknown(e instanceof Error ? e.message : String(e)); }
  }
  /** Data-only inspection of actual Execute FIFO dispatch operands. Flag
   * payloads are selected from their LAST index then popped. This does not
   * consume the live queue or claim NxActor execution/Reset was performed. */
  executionOperands(): readonly { command: 4 | 11 | 12; value: NativeMovementVector | number }[] {
    const add = [...this.addFlags], remove = [...this.removeFlags];
    return this.commands.map(command => {
      if (command === 4) {
        if (!this.velocity) throw new Error('Unknown pending velocity for command4');
        return { command: 4, value: vector(this.velocity) };
      }
      const value = (command === 11 ? add : remove).pop();
      if (value === undefined) throw new Error('Missing original flag payload');
      return { command: command as 11 | 12, value };
    });
  }
  /** Native ClearAll30311ab0 resets active COUNTS and bits only if command
   * count!=0. This API exposes logical active arrays; native backing payload
   * bytes/capacity retention is outside its selected JS allocation profile.
   * The pending velocity field retains its last value. */
  clearAll(): void {
    if (this.commands.length === 0) return;
    this.addFlags.length = 0; this.removeFlags.length = 0; this.commands.length = 0;
    this.pendingBits.fill(0); this.revision++;
  }
}

/** Engine303177f0. Native Scene.IsLocked is forcedtrue when+6b==0; otherwise
 * it asks the actual NxScene virtual+144 and returns its logical negation. */
export function nativePhysicsSceneLocked(byte6b: number, nxSceneSlot144: () => NativeValue<number>): NativeValue<number> {
  try { return u8(byte6b) === 0 ? known(1) : known(u8(fact(nxSceneSlot144(), 'NxScene+144')) === 0 ? 1 : 0); }
  catch (e) { return unknown(e instanceof Error ? e.message : String(e)); }
}
export interface NativeRigidBodyVelocityContext {
  ownerProcessingRangeEntered(): NativeValue<number>; // actual AccessEntity+6c then Entity flag0x80
  actor(): NativeValue<object | null>; // actual rigidBody+f4
  sceneEnabledByte(): NativeValue<number>; // actual scene+14
  actorVelocity(actor: object): NativeValue<NativeMovementVector>; // actual NxActor+dc, PhysX units
}
/** Engine3032ccf0 never reads the pending buffer. It returns StartVelocity
 * offrange/actor-null, zero when scene+14==0, otherwise actual actor velocity
 * scaledby100 with one final float32 store percomponent. */
export function nativeRigidBodyLinearVelocity(context: NativeRigidBodyVelocityContext,
  startVelocity: () => NativeValue<NativeMovementVector>): NativeValue<NativeMovementVector> {
  try {
    if (u8(fact(context.ownerProcessingRangeEntered(), 'GetVelocity.AccessEntity/processing range')) === 0) {
      return known(vector(fact(startVelocity(), 'StartVelocity+1c')));
    }
    const actor = fact(context.actor(), 'RigidBody.actor+f4');
    if (actor === null) {
      return known(vector(fact(startVelocity(), 'StartVelocity+1c')));
    }
    if (u8(fact(context.sceneEnabledByte(), 'PhysicsScene.byte+14')) === 0) return known([0, 0, 0]);
    const current = fact(context.actor(), 'RigidBody.actor+f4 reread');
    if (current === null) throw new Error('Native actor+f4 dereference became null after scene read');
    const value = vector(fact(context.actorVelocity(current), 'NxActor+dc'));
    return known([float(value[0] * 100), float(value[1] * 100), float(value[2] * 100)]);
  } catch (e) { return unknown(e instanceof Error ? e.message : String(e)); }
}

export interface NativeOriginalRigidBodyHost {
  ownerRangeEntered(): NativeValue<number>; // first GetEntity + HasProcessingRangeEntered
  getBuffer(): NativeValue<NativePendingPhysicsBuffer>; // second GetEntity + original GetBuffer selection
  notifyStartVelocity(phase: 'enter' | 'exit', localByte: 0): NativeValue<void>;
  /** Actual GetLinearVelocity3032ccf0 path; pending buffer selection versus
   * NxActor and native100 scale must be supplied, not a guessed vector. */
  linearVelocity(): NativeValue<NativeMovementVector>;
}
/** Original flag container+78/+7c stores and StartVelocity+1c. Container
 * assignment3032f480 is a PURE DWORD copy and returns1, no owner notification.
 * Native virtual receiver identity is enforced even after table capture. */
export class NativeOriginalRigidBody implements NativeMovementRigidBody {
  readonly virtuals: NativeMovementRigidBody['virtuals'];
  revision = 0;
  constructor(public bodyFlags: number, public startVelocity: NativeMovementVector | null,
    readonly host: NativeOriginalRigidBodyHost) {
    integer(bodyFlags); if (startVelocity !== null) this.startVelocity = vector(startVelocity);
    const receiver = (value: NativeMovementRigidBody): NativeOriginalRigidBody => {
      if (value !== this) throw new Error('Captured rigid-body vtable used with another concrete receiver'); return this;
    };
    this.virtuals = Object.freeze({
      setLinearVelocity: (body: NativeMovementRigidBody, v: NativeMovementVector) => receiver(body).setLinearVelocity(v),
      getLinearVelocity: (body: NativeMovementRigidBody) => receiver(body).host.linearVelocity(),
      addBodyFlag: (body: NativeMovementRigidBody, mask: number) => receiver(body).flags(mask, true),
      removeBodyFlag: (body: NativeMovementRigidBody, mask: number) => receiver(body).flags(mask, false),
      setGravity: (body: NativeMovementRigidBody, enabled: number) => receiver(body).flags(1, u8(enabled) !== 1),
    });
  }
  private flags(mask: number, add: boolean): NativeValue<void> {
    try {
      integer(mask); integer(this.bodyFlags);
      this.bodyFlags = (add ? this.bodyFlags | mask : this.bodyFlags & ~mask) >>> 0; this.revision++;
      const buffer = fact(this.host.getBuffer(), 'RigidBody.GetEntity/GetBuffer');
      return add ? buffer.addBodyFlag(mask) : buffer.removeBodyFlag(mask);
    } catch (e) { return unknown(e instanceof Error ? e.message : String(e)); }
  }
  private setLinearVelocity(value: NativeMovementVector): NativeValue<void> {
    try {
      vector(value);
      if (u8(fact(this.host.ownerRangeEntered(), 'RigidBody.GetEntity/HasProcessingRangeEntered')) === 0) {
        fact(this.host.notifyStartVelocity('enter', 0), 'StartVelocity.NotifyEnter');
        this.startVelocity = vector(value); this.revision++;
        fact(this.host.notifyStartVelocity('exit', 0), 'StartVelocity.NotifyExit'); return known(undefined);
      }
      const buffer = fact(this.host.getBuffer(), 'RigidBody.GetEntity/GetBuffer reread'); return buffer.setLinearVelocity(value);
    } catch (e) { return unknown(e instanceof Error ? e.message : String(e)); }
  }
}
