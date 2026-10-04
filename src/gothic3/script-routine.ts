/** Mutable ports of the original SPU task/state API.
 *
 * These methods perform their proven writes and call supplied native-equivalent
 * handlers in order. They do not implement the SPU process scheduler or every
 * instruction. Unresolved handlers reject before use; a failed callback exposes
 * its already-applied prefix and blocks further use of this instance.
 */
import rulesText from '../../assets/gothic3/routines/runtime-rules.json?raw';

const rules = JSON.parse(rulesText) as {
  schema: string; inputSha256: string; instructionPointers: string[]; timeMultiplier: number;
};
if (rules.schema !== 'gothic3-native-routines-rules-v1' ||
    rules.inputSha256 !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.timeMultiplier !== 1000 || rules.instructionPointers.join(',') !==
    '2002d3b2,2002b940,2001fe51,2001c76f,2001ba9a,20027f3e,2001fbbd,20034dec') {
  throw new Error('Original SPU rule receipt differs');
}

export interface NativeRoutineProperties {
  Routine: string;
  CurrentTask: string;
  LastTask: string;
  TaskPosition: number;
  TaskTime: number;
  StatePosition: number;
  StateTime: number;
  CurrentState: string;
  CurrentBreakBlock: number;
}
export interface NativeRoutineEntity {
  id: string;
  /** This live PS is separate from Navigation_PS.Routine. */
  properties: NativeRoutineProperties | null;
  navigationPresent: boolean;
}
/** Original 24-byte frame's semantic fields; unused capacity is retained. */
export interface NativeAIStateFrame {
  position: number;
  script: string;
  begin: boolean;
  object: string | null;
  callback: string;
  timeMilliseconds: number;
}
export interface NativeSPUState {
  self: string | null;
  frames: NativeAIStateFrame[];
  frameCount: number;
  task: string;
  localCallback: string;
  taskMilliseconds: number;
  stateMilliseconds: number;
  detectingTask: boolean;
  detectedTask: string;
  /** Original function pointer identity, not a guessed instruction name. */
  activeInstruction: string | null;
}
export interface NativeRoutineTrace {
  operation: string;
  entity?: string;
  property?: keyof NativeRoutineProperties;
  value?: string | number | boolean | null;
}
export interface NativeRoutineHost {
  /** Side-effect-free live registry lookup; callbacks may change its result. */
  resolveSelf(id: string): NativeRoutineEntity | null;
  /** Implements complete entity/object-reference notifier effects. */
  propertyHook?: (phase: 'enter' | 'exit', entity: NativeRoutineEntity,
    properties: NativeRoutineProperties, property: keyof NativeRoutineProperties,
    propagate: false, spu: NativeScriptProcessingUnit) => void;
  /** Separate boundaries retain the native post-destructor pointer read. */
  destroyFrameObject?: (object: string, argument: 0, frame: NativeAIStateFrame,
    spu: NativeScriptProcessingUnit) => void;
  deleteFrameObject?: (object: string | null, spu: NativeScriptProcessingUnit) => void;
  instruction?: (pointer: string) => ((argument: null, spu: NativeScriptProcessingUnit, abort: true) => boolean) | null;
  routine?: (name: string) => ((spu: NativeScriptProcessingUnit) => number | boolean | void | NativeRoutineResult) | null;
  script?: (name: 'ContinueRoutine') => ((self: string, other: null, argument: 0,
    spu: NativeScriptProcessingUnit) => number | boolean | void | NativeRoutineResult) | null;
}
export type NativeRoutineResult =
  | { supported: true; nativeReturnValue: 0 | 1 | null; beforeRevision: number;
      afterRevision: number; trace: readonly NativeRoutineTrace[] }
  | { supported: false; reason: string; partial: boolean; beforeRevision: number;
      afterRevision: number; trace: readonly NativeRoutineTrace[] };

function i32(value: number): boolean {
  return Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff;
}
function finiteFloat(value: number): boolean {
  return Number.isFinite(value) && Number.isFinite(Math.fround(value));
}
function validateProperties(value: NativeRoutineProperties): void {
  if (![value.Routine, value.CurrentTask, value.LastTask, value.CurrentState].every(v => typeof v === 'string') ||
      ![value.TaskPosition, value.StatePosition, value.CurrentBreakBlock].every(i32) ||
      ![value.TaskTime, value.StateTime].every(finiteFloat)) throw new Error('Invalid native ScriptRoutine properties');
}

export class NativeScriptProcessingUnit {
  private state: NativeSPUState;
  private epoch = 0;
  private blocked: string | null = null;
  private traces: NativeRoutineTrace[][] = [];

  /** Caller supplies real factory/read/runtime state; no serialized seed defaults are invented. */
  constructor(seed: NativeSPUState, private readonly host: NativeRoutineHost) {
    if ((seed.self !== null && typeof seed.self !== 'string') || !Array.isArray(seed.frames) ||
        !Number.isSafeInteger(seed.frameCount) || seed.frameCount < 0 || seed.frameCount > seed.frames.length ||
        ![seed.task, seed.localCallback, seed.detectedTask].every(v => typeof v === 'string') ||
        typeof seed.detectingTask !== 'boolean' || ![seed.taskMilliseconds, seed.stateMilliseconds].every(finiteFloat) ||
        (seed.activeInstruction !== null && !/^[0-9a-f]{8}$/.test(seed.activeInstruction)) ||
        seed.frames.some(frame => !i32(frame.position) || typeof frame.script !== 'string' ||
          typeof frame.begin !== 'boolean' || (frame.object !== null && typeof frame.object !== 'string') ||
          typeof frame.callback !== 'string' || !finiteFloat(frame.timeMilliseconds))) {
      throw new Error('Invalid supplied native SPU state');
    }
    this.state = structuredClone(seed);
  }

  revision(): number { return this.epoch; }
  snapshot(): Readonly<NativeSPUState> { return structuredClone(this.state); }
  failure(): string | null { return this.blocked; }

  private record(trace: NativeRoutineTrace): void {
    this.epoch++;
    for (const journal of this.traces) journal.push({ ...trace });
  }
  private run(operation: () => 0 | 1 | null): NativeRoutineResult {
    const before = this.epoch, trace: NativeRoutineTrace[] = [];
    if (this.blocked) return { supported: false, reason: this.blocked, partial: false,
      beforeRevision: before, afterRevision: before, trace };
    this.traces.push(trace);
    try {
      const value = operation();
      if (this.blocked) throw new Error(this.blocked);
      return { supported: true, nativeReturnValue: value, beforeRevision: before, afterRevision: this.epoch, trace };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const partial = this.epoch !== before;
      if (partial) this.blocked = reason;
      return { supported: false, reason, partial, beforeRevision: before, afterRevision: this.epoch, trace };
    } finally { this.traces.pop(); }
  }
  private entity(): NativeRoutineEntity | null {
    return this.state.self === null ? null : this.host.resolveSelf(this.state.self);
  }
  private requireHooks(entity: NativeRoutineEntity | null): void {
    if (entity?.properties) {
      validateProperties(entity.properties);
      if (!this.host.propertyHook) throw new Error('Complete ScriptRoutine property hooks are unresolved');
    }
  }
  private write<K extends keyof NativeRoutineProperties>(entity: NativeRoutineEntity,
    key: K, operand: NativeRoutineProperties[K] | (() => NativeRoutineProperties[K]),
    properties: NativeRoutineProperties | null = entity.properties): void {
    if (!properties || !this.host.propertyHook) throw new Error('Live routine property/hook is unavailable');
    this.record({ operation: 'property-enter', entity: entity.id, property: key });
    this.host.propertyHook('enter', entity, properties, key, false, this);
    // A reference to a live property is read after EnterEx, as in the setter.
    const value = typeof operand === 'function' ? operand() : operand;
    properties[key] = value;
    this.record({ operation: 'property-write', entity: entity.id, property: key, value });
    this.host.propertyHook('exit', entity, properties, key, false, this);
    this.record({ operation: 'property-exit', entity: entity.id, property: key });
  }

  setSelfEntity(id: string | null): NativeRoutineResult {
    return this.run(() => {
      this.state.self = id;
      this.record({ operation: 'self-proxy', value: id });
      return null;
    });
  }
  /** Instruction bodies own their resulting pointer/task changes. */
  setActiveInstruction(pointer: string | null): NativeRoutineResult {
    return this.run(() => {
      if (pointer !== null && !/^[0-9a-f]{8}$/.test(pointer)) throw new Error('Invalid instruction pointer identity');
      this.state.activeInstruction = pointer;
      this.record({ operation: 'active-instruction', value: pointer });
      return null;
    });
  }
  fullStop(selector = 0): NativeRoutineResult {
    return this.run(() => {
      if (!i32(selector)) throw new Error('Instruction selector is outside signed32bit profile');
      const pointer = this.state.activeInstruction;
      if (pointer === null || (selector >= 1 && selector <= 8 && pointer !== rules.instructionPointers[selector - 1])) return null;
      const abort = this.host.instruction?.(pointer);
      if (!abort) throw new Error('Active instruction abort handler is unresolved: ' + pointer);
      this.record({ operation: 'abort-instruction', value: pointer });
      abort(null, this, true); // Original caller ignores the instruction's bool.
      return null;
    });
  }

  private statePreflight(entity: NativeRoutineEntity | null): void {
    this.requireHooks(entity);
    if (this.state.frames.some(frame => frame.object !== null) &&
        (!this.host.destroyFrameObject || !this.host.deleteFrameObject)) {
      throw new Error('Native frame object destruction is unresolved');
    }
  }
  private setStateInternal(name: string): void {
    // Native destroys every frame in allocated capacity, not just live count.
    for (const frame of [...this.state.frames]) if (frame.object !== null) {
      this.record({ operation: 'destroy-frame-object', value: frame.object });
      this.host.destroyFrameObject!(frame.object, 0, frame, this);
      this.record({ operation: 'delete-frame-object', value: frame.object });
      this.host.deleteFrameObject!(frame.object, this);
      frame.object = null;
      this.record({ operation: 'clear-frame-object', value: null });
    }
    this.state.frames = Array.from({ length: 5 }, () => ({ position: 0, script: '', begin: true,
      object: null, callback: '', timeMilliseconds: 1000 }));
    this.state.frameCount = 1;
    this.state.frames[0]!.script = name;
    this.record({ operation: 'replace-state-stack', value: name });
    // Destructors may have changed Self; original resolves it at this point.
    const entity = this.entity();
    this.requireHooks(entity);
    if (entity?.properties) {
      const properties = entity.properties;
      this.write(entity, 'StatePosition', 0, properties);
      this.state.stateMilliseconds = 0;
      this.record({ operation: 'state-milliseconds', value: 0 });
      const timeEntity = this.entity();
      this.requireHooks(timeEntity);
      if (timeEntity?.properties) this.write(timeEntity, 'StateTime', 0);
      this.write(entity, 'CurrentState', name, properties);
      this.write(entity, 'CurrentBreakBlock', 0, properties);
    }
  }
  setState(name: string): NativeRoutineResult {
    return this.run(() => {
      if (typeof name !== 'string') throw new Error('State script name is unresolved');
      const entity = this.entity();
      this.statePreflight(entity);
      this.setStateInternal(name);
      return null; // AISetState is void; protected SetCurrentAIState returns1.
    });
  }
  setTask(name: string, flag = false): NativeRoutineResult {
    return this.run(() => {
      if (typeof name !== 'string' || typeof flag !== 'boolean') throw new Error('Task operands are unresolved');
      if (this.state.detectingTask) {
        this.state.detectedTask = name;
        this.record({ operation: 'detected-task', value: name });
        return null;
      }
      const entity = this.entity();
      if (!entity?.properties || flag) return null;
      this.statePreflight(entity);
      const properties = entity.properties;
      this.write(entity, 'LastTask', () => properties.CurrentTask);
      this.write(entity, 'CurrentTask', name, properties);
      this.write(entity, 'TaskPosition', 0, properties);
      this.state.localCallback = '';
      this.state.task = name;
      this.state.taskMilliseconds = 0;
      this.record({ operation: 'task-fields', value: name });
      const timeEntity = this.entity();
      this.requireHooks(timeEntity);
      if (timeEntity?.properties) this.write(timeEntity, 'TaskTime', 0);
      this.setStateInternal(name);
      return null;
    });
  }
  setTime(kind: 'task' | 'state', seconds: number): NativeRoutineResult {
    return this.run(() => {
      if ((kind !== 'task' && kind !== 'state') || !finiteFloat(seconds)) throw new Error('Native time operands are unresolved');
      const value = Math.fround(seconds), milliseconds = Math.fround(value * rules.timeMultiplier);
      if (!Number.isFinite(milliseconds)) throw new Error('Time exceeds bounded native float profile');
      const entity = this.entity();
      this.requireHooks(entity);
      if (kind === 'task') this.state.taskMilliseconds = milliseconds;
      else this.state.stateMilliseconds = milliseconds;
      this.record({ operation: kind + '-milliseconds', value: milliseconds });
      if (entity?.properties) this.write(entity, kind === 'task' ? 'TaskTime' : 'StateTime', value);
      return null;
    });
  }

  private detectInternal(force: boolean): 0 | 1 {
    const entity = this.entity();
    // Original retrieves a PS through Self before its later None test. Exclude
    // that unsafe pointer profile rather than claim it is a native return0.
    if (!entity) throw new Error('Daily routine detection requires resolved non-None Self');
    const properties = entity.properties;
    if (!properties) return 0;
    validateProperties(properties);
    const name = properties.Routine;
    if (!name && !entity.navigationPresent) return 0;
    const routine = name ? this.host.routine?.(name) : null;
    const script = name ? null : this.host.script?.('ContinueRoutine');
    if (name ? !routine : !script) throw new Error('Original routine/script dispatch handler is unresolved: ' + (name || 'ContinueRoutine'));
    if (force) {
      this.state.detectingTask = true;
      this.state.detectedTask = properties.CurrentTask;
      this.record({ operation: 'begin-task-detection', value: properties.CurrentTask });
    }
    this.record({ operation: name ? 'run-script-routine' : 'call-script', entity: entity.id, value: name || 'ContinueRoutine' });
    const called = routine ? routine(this) : script!(entity.id, null, 0, this);
    if (called && typeof called === 'object' && !called.supported) throw new Error(called.reason);
    if (force) {
      this.state.detectingTask = false;
      this.record({ operation: 'end-task-detection', value: false });
    }
    return 1; // Native ignores the called script's return value.
  }
  detectDailyRoutineTask(force: boolean): NativeRoutineResult {
    return this.run(() => {
      if (typeof force !== 'boolean') throw new Error('Detection operand is unresolved');
      return this.detectInternal(force);
    });
  }
  continueRoutine(ownerEntityId: string): NativeRoutineResult {
    return this.run(() => {
      this.state.self = ownerEntityId;
      this.record({ operation: 'self-proxy', value: ownerEntityId });
      this.detectInternal(false);
      return null; // Both AIContinueRoutine wrappers are void.
    });
  }
}
