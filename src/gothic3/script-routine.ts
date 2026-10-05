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
  /** Exact original GetPropertySet(0x1e) presence. The daily-routine fallback
   * queries NPC_PS, independently of Navigation_PS. */
  npcPresent: boolean;
  /** @deprecated Compatibility metadata only; never used for dispatch. */
  navigationPresent?: boolean;
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

/** Additional native SPU fields. Null timer values mean the constructor did not
 * initialize those bytes; they must not be read until a proven setter writes them. */
export interface NativeSPUSchedulerStorage {
  waitElapsedMilliseconds: number;
  waitDurationMilliseconds: number | null;
  instructionEntity: string | null;
  instructionTarget: string | null;
  taskCallbackMilliseconds: number | null;
  localCallbackMilliseconds: number | null;
  localTimeScale: number;
  lastFrameTimestamp: number;
  audioChannel: string | null;
}
/** Original embedded animation descriptor. Null retains an unknown field;
 * pointers preserve the actual capability identity instead of cloning it. */
export interface NativeSPUAnimationDescriptor {
  fadeIn: number | null; mode: 0 | 1 | 2 | null; playSpeed: number | null;
  loops: number | null; weight: number | null; fadeOut: number | null;
  blendMode: 1 | 2 | null;
}
export interface NativeSPUAnimationStorage {
  completedByte: number | null; // +94
  visualAnimation: object | null; // +130
  motionDescriptor: NativeSPUAnimationDescriptor; // +134..14c
  name: string; // +150 CString
  waitForFadeByte: number | null; // +158
  phaseMode: number | null; // +15c
  phaseFinishedByte: number | null; // +164
}
export type NativeSPUAnimationField = Exclude<keyof NativeSPUAnimationStorage, 'motionDescriptor'>;
/** Scoped access used by the original ProcessScript port. No mutable state
 * reference escapes: all writes share this SPU's journal, revision and failure. */
export interface NativeSPUSchedulerAccess {
  snapshot(): Readonly<NativeSPUState>;
  storage(): Readonly<NativeSPUSchedulerStorage>;
  resolveSelf(): NativeRoutineEntity | null;
  writeMilliseconds(kind: 'task' | 'state', value: number): void;
  writeStorage<K extends keyof NativeSPUSchedulerStorage>(key: K, value: NativeSPUSchedulerStorage[K]): void;
  animationStorage(): Readonly<NativeSPUAnimationStorage>;
  writeAnimation<K extends NativeSPUAnimationField>(key: K, value: NativeSPUAnimationStorage[K]): void;
  writeAnimationDescriptor<K extends keyof NativeSPUAnimationDescriptor>(key: K, value: NativeSPUAnimationDescriptor[K]): void;
  writeTaskCallback(name: string): void;
  writeFrame<K extends keyof NativeAIStateFrame>(index: number, key: K, value: NativeAIStateFrame[K]): void;
  writeProperty<K extends keyof NativeRoutineProperties>(entity: NativeRoutineEntity,
    properties: NativeRoutineProperties, key: K, value: NativeRoutineProperties[K]): void;
  /** Original Script_Game frame-stack Add/SetCount. Returns the live appended
   * slot; an existing spare slot is deliberately not reinitialized. */
  pushFrame(): number;
  removeFrame(index: number): void;
  record(trace: NativeRoutineTrace): void;
}

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
  private schedulerState: NativeSPUSchedulerStorage | null = null;
  private animationState: NativeSPUAnimationStorage | null = null;
  private schedulerAccess: NativeSPUSchedulerAccess | null = null;
  private schedulerScopeRevision = 0;

  /** Caller supplies real factory/read/runtime state; no serialized seed defaults are invented. */
  constructor(seed: NativeSPUState, private readonly host: NativeRoutineHost) {
    if ((seed.self !== null && typeof seed.self !== 'string') || !Array.isArray(seed.frames) ||
        !Number.isSafeInteger(seed.frameCount) || seed.frameCount < 0 || seed.frameCount > seed.frames.length ||
        ![seed.task, seed.localCallback, seed.detectedTask].every(v => typeof v === 'string') ||
        typeof seed.detectingTask !== 'boolean' || ![seed.taskMilliseconds, seed.stateMilliseconds].every(finiteFloat) ||
        new Set(seed.frames).size !== seed.frames.length ||
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

  schedulerSnapshot(): Readonly<NativeSPUSchedulerStorage> | null {
    return this.schedulerState === null ? null : structuredClone(this.schedulerState);
  }
  /** Diagnostic scalar copy. The visual pointer intentionally remains the same
   * native capability; the embedded descriptor's writable store never escapes. */
  animationSnapshot(): Readonly<NativeSPUAnimationStorage> | null {
    return this.animationState === null ? null : { ...this.animationState,
      motionDescriptor: { ...this.animationState.motionDescriptor } };
  }
  /** Supplied constructor/read state, bound once. No implicit zero-fill. */
  initializeAnimation(seed: NativeSPUAnimationStorage): NativeRoutineResult {
    return this.run(() => {
      if (this.animationState !== null) throw new Error('SPU animation fields are already bound');
      if (!seed || Object.keys(seed).sort().join(',') !==
          'completedByte,motionDescriptor,name,phaseFinishedByte,phaseMode,visualAnimation,waitForFadeByte' ||
          !seed.motionDescriptor || Object.keys(seed.motionDescriptor).sort().join(',') !==
          'blendMode,fadeIn,fadeOut,loops,mode,playSpeed,weight') throw new Error('Incomplete native animation seed');
      for (const key of ['completedByte', 'visualAnimation', 'name', 'waitForFadeByte', 'phaseMode', 'phaseFinishedByte'] as const) {
        this.validateAnimationField(key, seed[key]);
      }
      for (const key of Object.keys(seed.motionDescriptor) as (keyof NativeSPUAnimationDescriptor)[]) {
        this.validateAnimationDescriptor(key, seed.motionDescriptor[key]);
      }
      this.animationState = { ...seed, motionDescriptor: { ...seed.motionDescriptor } };
      this.record({ operation: 'initialize-animation-fields' }); return null;
    });
  }
  private validateAnimationField(key: NativeSPUAnimationField, value: NativeSPUAnimationStorage[NativeSPUAnimationField]): void {
    if (key === 'visualAnimation') {
      if (value !== null && (typeof value !== 'object' || value === undefined)) throw new Error('Actual VisualAnimation capability required');
    } else if (key === 'name') {
      if (typeof value !== 'string') throw new Error('Native animation CString required');
    } else if (key === 'phaseMode') {
      if (value !== null && (typeof value !== 'number' || !i32(value))) throw new Error('Native animation phase mode must be int32');
    } else if (['completedByte', 'waitForFadeByte', 'phaseFinishedByte'].includes(key)) {
      if (value !== null && (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255)) throw new Error('Native animation flag must be a byte');
    } else throw new Error('Unknown physical animation field');
  }
  private validateAnimationDescriptor(key: keyof NativeSPUAnimationDescriptor,
    value: NativeSPUAnimationDescriptor[keyof NativeSPUAnimationDescriptor]): void {
    if (!['fadeIn', 'mode', 'playSpeed', 'loops', 'weight', 'fadeOut', 'blendMode'].includes(key)) throw new Error('Unknown embedded motion field');
    if (value === null) return;
    if (typeof value !== 'number') throw new Error('Native descriptor scalar required');
    if (key === 'mode') {
      if (![0, 1, 2].includes(value)) throw new Error('Native play mode outside recovered enum');
    } else if (key === 'blendMode') {
      if (![1, 2].includes(value)) throw new Error('Native blend mode outside recovered enum');
    } else if (key === 'loops') {
      if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Native loop count must be uint32');
    } else if (!finiteFloat(value) || !Object.is(value, Math.fround(value))) throw new Error('Native descriptor must store finite float32');
  }
  /** Identity and lifetime check for source adapters using scoped capabilities. */
  ownsSchedulerAccess(access: NativeSPUSchedulerAccess): boolean { return this.schedulerAccess === access; }
  /** Explicit native factory/read state, supplied once. Existing constructor
   * callers retain their old API and do not acquire invented scheduler fields. */
  initializeScheduler(seed: NativeSPUSchedulerStorage): NativeRoutineResult {
    return this.run(() => {
      if (this.schedulerState !== null) throw new Error('SPU scheduler fields are already bound');
      for (const key of Object.keys(seed) as (keyof NativeSPUSchedulerStorage)[]) this.validateSchedulerField(key, seed[key]);
      if (Object.keys(seed).sort().join(',') !==
          'audioChannel,instructionEntity,instructionTarget,lastFrameTimestamp,localCallbackMilliseconds,localTimeScale,taskCallbackMilliseconds,waitDurationMilliseconds,waitElapsedMilliseconds') {
        throw new Error('Incomplete native scheduler seed');
      }
      this.schedulerState = structuredClone(seed);
      this.record({ operation: 'initialize-scheduler-fields' });
      return null;
    });
  }
  private validateSchedulerField(key: keyof NativeSPUSchedulerStorage, value: NativeSPUSchedulerStorage[keyof NativeSPUSchedulerStorage]): void {
    if (key === 'instructionEntity' || key === 'instructionTarget' || key === 'audioChannel') {
      if (value !== null && typeof value !== 'string') throw new Error('Invalid native entity/channel identity');
    } else if (key === 'lastFrameTimestamp') {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Invalid native frame timestamp');
    } else if (value === null && ['waitDurationMilliseconds', 'taskCallbackMilliseconds', 'localCallbackMilliseconds'].includes(key)) {
      return;
    } else if (typeof value !== 'number' || !finiteFloat(value) || !Object.is(Math.fround(value), value)) {
      throw new Error('Scheduler value must be a finite stored native float32');
    }
  }
  /** Source ports enter one shared transition. A failing callback retains and
   * reports its native ordered prefix, exactly like the existing task API. */
  dispatchScheduler(operation: (access: NativeSPUSchedulerAccess) => 0 | 1 | null): NativeRoutineResult {
    // Source script bodies legally start instructions and call setters/abort
    // inside ProcessScript. Those operations reuse this SPU's live capability.
    if (this.schedulerAccess !== null) {
      const access = this.schedulerAccess;
      return this.run(() => operation(access));
    }
    return this.run(() => {
      if (!this.schedulerState) throw new Error('SPU scheduler fields are unbound');
      let live = true;
      const check = (): void => {
        if (!live) throw new Error('Expired SPU scheduler binding');
        if (this.blocked) throw new Error(this.blocked);
      };
      const access: NativeSPUSchedulerAccess = {
        snapshot: () => { check(); return this.snapshot(); },
        storage: () => { check(); return this.schedulerSnapshot()!; },
        resolveSelf: () => { check(); return this.entity(); },
        writeMilliseconds: (kind, value) => {
          check(); if (!finiteFloat(value) || !Object.is(value, Math.fround(value))) throw new Error('Invalid stored SPU time');
          this.state[kind === 'task' ? 'taskMilliseconds' : 'stateMilliseconds'] = value;
          this.record({ operation: kind + '-milliseconds', value });
        },
        writeStorage: (key, value) => {
          check(); this.validateSchedulerField(key, value); this.schedulerState![key] = value;
          this.record({ operation: 'scheduler-' + key, value });
        },
        animationStorage: () => {
          check(); const state = this.animationSnapshot();
          if (!state) throw new Error('SPU animation fields are unbound'); return state;
        },
        writeAnimation: (key, value) => {
          check(); this.validateAnimationField(key, value);
          if (!this.animationState) throw new Error('SPU animation fields are unbound');
          this.animationState[key] = value;
          this.record({ operation: 'animation-' + key,
            ...(typeof value === 'object' && value !== null ? {} : { value }) });
        },
        writeAnimationDescriptor: (key, value) => {
          check(); this.validateAnimationDescriptor(key, value);
          if (!this.animationState) throw new Error('SPU animation fields are unbound');
          this.animationState.motionDescriptor[key] = value;
          this.record({ operation: 'animation-descriptor-' + key, value });
        },
        writeTaskCallback: name => {
          check(); if (typeof name !== 'string') throw new Error('Invalid task callback name');
          this.state.localCallback = name;
          this.record({ operation: 'task-callback-name', value: name });
        },
        writeFrame: (index, key, value) => {
          check(); const frame = this.state.frames[index];
          if (!Number.isInteger(index) || index < 0 || !frame) throw new Error('Native frame address is outside allocated capacity');
          const draft = { ...frame, [key]: value };
          if (!i32(draft.position) || typeof draft.script !== 'string' || typeof draft.begin !== 'boolean' ||
              (draft.object !== null && typeof draft.object !== 'string') || typeof draft.callback !== 'string' || !finiteFloat(draft.timeMilliseconds)) throw new Error('Invalid native frame write');
          frame[key] = value; this.record({ operation: 'frame-' + index + '-' + key, value });
        },
        writeProperty: (entity, properties, key, value) => {
          check(); validateProperties({ ...properties, [key]: value });
          this.write(entity, key, value, properties);
        },
        pushFrame: () => { check(); return this.pushSchedulerFrame(); },
        removeFrame: index => { check(); this.removeSchedulerFrame(index); },
        record: trace => { check(); this.record(trace); },
      };
      this.schedulerScopeRevision = this.epoch;
      this.schedulerAccess = access;
      try { return operation(access); }
      finally { live = false; this.schedulerAccess = null; }
    });
  }
  /** Script_Game1001d9e0 Add ->1001d8b0 SetCount. This bounded successful-moving
   * Realloc profile copies live and spare values and invalidates old physical
   * addresses. Native Realloc may instead retain its address; that outcome is
   * outside this profile. Only new slots receive1001cd70 constructor defaults.
   * Native allocator failure and stacks above65536 slots are also excluded. */
  private pushSchedulerFrame(): number {
    const requested = this.state.frameCount + 1, capacity = this.state.frames.length;
    if (!i32(requested) || requested < 1 || requested > 65536) {
      throw new Error('Frame Add exceeds the explicit finite successful-allocation profile');
    }
    if (capacity < requested) {
      const growth = Math.max(4, Math.min(1024, capacity >> 3));
      const nextCapacity = requested + growth;
      if (nextCapacity > 65536) throw new Error('Native frame Realloc exceeds the bounded allocation profile');
      const allocation = this.state.frames.map(frame => ({ ...frame }));
      this.state.frames = allocation;
      this.record({ operation: 'frame-realloc-copy', value: nextCapacity });
      for (let i = capacity; i < nextCapacity; i++) {
        allocation.push({ position: 0, script: '', begin: true, object: null, callback: '', timeMilliseconds: 1000 });
        this.record({ operation: 'initialize-new-frame', value: i });
      }
      this.record({ operation: 'frame-capacity', value: nextCapacity });
    }
    this.state.frameCount = requested;
    this.record({ operation: 'frame-count', value: requested });
    return this.state.frameCount - 1;
  }
  private removeSchedulerFrame(index: number): void {
    if (!i32(index) || index < 0 || index >= this.state.frameCount) throw new Error('Invalid native RemoveAt index');
    const frame = this.state.frames[index]!;
    if (frame.object !== null) {
      if (!this.host.destroyFrameObject || !this.host.deleteFrameObject) throw new Error('Native frame object destruction is unresolved');
      this.record({ operation: 'destroy-frame-object', value: frame.object });
      this.host.destroyFrameObject(frame.object, 0, frame, this);
      // Original rereads this captured frame address after the destructor.
      if (!this.state.frames.includes(frame)) throw new Error('Destructor freed/replaced the captured native frame allocation');
      this.record({ operation: 'delete-frame-object', value: frame.object });
      this.host.deleteFrameObject(frame.object, this);
      if (!this.state.frames.includes(frame)) throw new Error('Delete callback freed/replaced the captured native frame allocation');
      frame.object = null; this.record({ operation: 'clear-frame-object', value: null });
    }
    frame.callback = ''; frame.script = '';
    this.record({ operation: 'destroy-frame-strings', value: index });
    // Native RemoveAt rereads both count and data after the destructor.
    const remaining = this.state.frameCount - index - 1;
    if (remaining > 0) {
      if (index + remaining >= this.state.frames.length) throw new Error('Native frame memmove leaves its allocation');
      for (let i = index; i < index + remaining; i++) Object.assign(this.state.frames[i]!, this.state.frames[i + 1]!);
      this.record({ operation: 'frame-memmove', value: remaining });
    }
    const last = this.state.frameCount - 1;
    if (last < 0 || last >= this.state.frames.length) throw new Error('Native last frame initialization leaves its allocation');
    Object.assign(this.state.frames[last]!, { position: 0, script: '', begin: true, object: null, callback: '', timeMilliseconds: 1000 });
    this.record({ operation: 'initialize-unused-frame', value: last });
    this.state.frameCount--; this.record({ operation: 'frame-count', value: this.state.frameCount });
  }

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
      if (value !== null && value !== 0 && value !== 1) throw new Error('Native SPU transition must synchronously return0/1/void');
      return { supported: true, nativeReturnValue: value, beforeRevision: before, afterRevision: this.epoch, trace };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const partial = this.epoch !== before;
      // A nested source setter/abort can fail before its own first write even
      // though ProcessScript already applied a prefix. Preserve that failure
      // at the common boundary, including direct task/state/time API calls.
      if (partial || (this.schedulerAccess !== null && this.epoch !== this.schedulerScopeRevision)) this.blocked = reason;
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
    // Native captures PS from the first read, then tests Self again.
    if (!this.entity() || !properties) return 0;
    validateProperties(properties);
    const name = properties.Routine;
    if (!name) {
      const current = this.entity();
      if (!current) throw new Error('Self disappeared before the native NPC_PS read');
      if (typeof current.npcPresent !== 'boolean') throw new Error('Exact NPC_PS selector0x1e presence is unresolved');
      if (!current.npcPresent) return 0;
    }
    const routine = name ? this.host.routine?.(name) : null;
    const script = name ? null : this.host.script?.('ContinueRoutine');
    if (name ? !routine : !script) throw new Error('Original routine/script dispatch handler is unresolved: ' + (name || 'ContinueRoutine'));
    if (force) {
      this.state.detectingTask = true;
      this.state.detectedTask = properties.CurrentTask;
      this.record({ operation: 'begin-task-detection', value: properties.CurrentTask });
    }
    this.record({ operation: name ? 'run-script-routine' : 'call-script', entity: entity.id, value: name || 'ContinueRoutine' });
    // ContinueRoutine receives the final live Self, after task-detection writes.
    const current = routine ? null : this.entity();
    if (!routine && !current) throw new Error('Final ContinueRoutine Self is outside the non-None owner profile');
    const called = routine ? routine(this) : script!(current!.id, null, 0, this);
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
