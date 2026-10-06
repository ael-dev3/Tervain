import rulesText from '../../assets/gothic3/animation-instruction/runtime-rules.json?raw';
import type { NativeAnimationKnown, NativeEmbeddedMotionDescriptor,
  NativePlayAniArguments, NativePlayAniStorage } from './animation-state';

/** Original Game203685b0 /2036a1d0. This is ordered executable logic over
 * retained live capabilities, not a promise that EMFX/resource systems exist.
 * Unknown callbacks retain their prefix, block this instance and cannot replay.
 * Numerical stores are JS+f32 reconstruction, not captured x87 equivalence.
 */
const rules = JSON.parse(rulesText) as { schema: string; actionStrings: string[] };
if (rules.schema !== 'gothic3-animation-instruction-rules-v1' || rules.actionStrings.length !== 138 ||
    rules.actionStrings[54] !== 'Jump' || rules.actionStrings[57] !== 'Fall') throw new Error('Original PlayAni rules differ');
Object.freeze(rules.actionStrings);
const F32 = Math.fround;
export type NativeMotionSlot = 0 | 1 | 2 | 3 | 4 | 5;
export interface NativeAnimationNpcStorage { currentAni: string; } // live NPC+1a0
/** GetAniVariation receives the actual mutable SPU+150 CString reference. */
export interface NativeAnimationStringReference { value: string; }
export interface NativeAnimationAdminCapability<R> {
  getAniVariation(name: NativeAnimationStringReference): NativeAnimationKnown<void>;
  isAnimationMissed(name: string): NativeAnimationKnown<number>;
  queryMotionDataEntity(name: string, cacheBehavior: 1): NativeAnimationKnown<R | null>;
  addMissingAnimation(name: string): NativeAnimationKnown<void>;
  setAniVariationMax(filename: string): NativeAnimationKnown<void>;
  getStandardAniFadeTime(): NativeAnimationKnown<number>;
}
export type NativeAniStateScript<E> = (name: 'GetAniStateByAction', self: E | null,
  other: null, action: number) => NativeAnimationKnown<number>;
export interface NativeAnimationInstructionEngine<E, V, A, R, M, Q, S> {
  /** Records an attempted boundary in the SAME SPU journal before invocation. */
  recordBoundary(operation: string): void;
  getEntity(proxy: 'self' | 'instructionEntity'): NativeAnimationKnown<E | null>;
  setInstructionEntity(entity: E): NativeAnimationKnown<void>;
  getEntityName(entity: E): NativeAnimationKnown<string>;
  warningNullEntity(ownerName: string): NativeAnimationKnown<void>;
  getVisualAnimation(entity: E): NativeAnimationKnown<V | null>; // PS100
  getNpc(entity: E): NativeAnimationKnown<NativeAnimationNpcStorage | null>; // PS1e
  getMovement(entity: E): NativeAnimationKnown<M | null>; // PS15
  getRoutine(entity: E): NativeAnimationKnown<Q | null>; // PS2d
  getAnimationAdmin(): NativeAnimationKnown<NativeAnimationAdminCapability<R> | null>;
  getNativeMotionFileExt(): NativeAnimationKnown<string>;
  getResourceFileName(resource: R): NativeAnimationKnown<string>;
  releaseResource(resource: R): NativeAnimationKnown<void>;
  getActor(visual: V): NativeAnimationKnown<A | null>;
  hasMotion(visual: V, slot: NativeMotionSlot): NativeAnimationKnown<number>;
  isMotionRunning(actor: A, slot: NativeMotionSlot): NativeAnimationKnown<number>;
  isActorPlaying(actor: A, slot: NativeMotionSlot): NativeAnimationKnown<number>;
  getExtroBlending(actor: A, slot: 0): NativeAnimationKnown<number>;
  getIntroBlending(actor: A, slot: 0): NativeAnimationKnown<number>;
  setIntroExtroBlending(actor: A, slot: 0, filename: string): NativeAnimationKnown<void>;
  switchFadeOut(actor: A, slot: 0, force: false, duration: number): NativeAnimationKnown<void>;
  stopMotion(visual: V, slot: NativeMotionSlot, duration: 0): NativeAnimationKnown<void>;
  setTargetWeight(actor: A, slot: NativeMotionSlot, weight: 0): NativeAnimationKnown<void>;
  setMotionOwner(visual: V, slot: NativeMotionSlot, owner: 2 | 4): NativeAnimationKnown<void>;
  setMotion(visual: V, slot: NativeMotionSlot, resource: R): NativeAnimationKnown<void>;
  /** Must retain/read the actual embedded descriptor, not substitute a copy. */
  playMotion(visual: V, slot: NativeMotionSlot, descriptor: NativeEmbeddedMotionDescriptor): NativeAnimationKnown<void>;
  getPlayTime(actor: A, slot: NativeMotionSlot): NativeAnimationKnown<number>;
  getMaxTime(actor: A, slot: NativeMotionSlot): NativeAnimationKnown<number>;
  getPlaySpeed(actor: A, slot: NativeMotionSlot): NativeAnimationKnown<number>;
  stopAtLoopEnd(visual: V, slot: NativeMotionSlot): NativeAnimationKnown<void>;
  getScaledFrameSeconds(): NativeAnimationKnown<number>;
  enableMovementFromSPU(movement: M, enabled: false): NativeAnimationKnown<void>;
  getScriptAdmin(): NativeAnimationKnown<S>;
  /** Capture the virtual-table +bc SLOT before the following proxy read. The
   * returned closure resolves that retained slot at invocation, after the read. */
  captureAniStateScript(admin: S): NativeAnimationKnown<NativeAniStateScript<E>>;
  setRoutineAniState(routine: Q, state: number): NativeAnimationKnown<void>;
}
export interface NativeAnimationInstructionTrace {
  operation: string; kind: 'call' | 'write';
}
export interface NativeAnimationInstructionFailure { reason: string; partial: boolean; trace: readonly NativeAnimationInstructionTrace[]; }

function finite(value: number, context: string): number {
  if (!Number.isFinite(value)) throw new Error('Unknown/non-finite native animation ' + context);
  return value;
}
function float(value: number | null, context: string): number {
  if (value === null || !Number.isFinite(value) || !Object.is(value, F32(value))) {
    throw new Error('Native animation float storage is uninitialized/invalid: ' + context);
  }
  return value;
}
function byte(value: number | null, context: string): number {
  if (value === null || !Number.isInteger(value) || value < 0 || value > 255) throw new Error('Invalid native animation byte: ' + context);
  return value;
}
function text(value: string): string {
  if (typeof value !== 'string') throw new Error('Invalid native animation CString');
  return value;
}
function present<T>(value: T | null, context: string): T {
  if (value === null) throw new Error('Original native dereference is null: ' + context);
  return value;
}
function stored32(value: number | null, context: string): number {
  if (value === null || !Number.isInteger(value) || value < -0x80000000 || value > 0xffffffff) {
    throw new Error('Native animation integer storage is uninitialized: ' + context);
  }
  return value;
}

/** Pure action-selection portion of original Script_Game100cd200.
 * Its Entity AttachTo/Self/Other wrapper setup and PS getter/destructor effects
 * remain the script registry adapter's responsibility. The Die branch rereads
 * the current state just as the original script does.
 */
export function selectNativeAniStateByAction(action: number, readCurrentState: () => number): number {
  let result = stored32(readCurrentState(), 'current AniState');
  stored32(action, 'action');
  switch (action) {
    case 13: return 4;
    case 26: return 15;
    case 29: return 16;
    case 30: return 17;
    case 32: {
      const current = stored32(readCurrentState(), 'Die current AniState');
      if (current === 15 || current === 16) result = 18;
      else if (current === 17) result = 19;
      else if (current === 20) result = 21;
      return result;
    }
    case 33: return 19;
    case 34: return 20;
    case 35: return 21;
    case 73: return 2;
    case 74: return 3;
    case 75: return 5;
    case 76: return 6;
    case 77: return 7;
    case 78: return 8;
    case 79: return 9;
    case 80: return 10;
    case 81: return 11;
    case 107: return 12;
    case 108: return 13;
    case 109: return 14;
    default: return result;
  }
}

export class NativeAnimationInstruction<E, V, A, R, M, Q, S> {
  private active = false;
  private blocked: NativeAnimationInstructionFailure | null = null;
  private journal: NativeAnimationInstructionTrace[] = [];
  constructor(private readonly engine: NativeAnimationInstructionEngine<E, V, A, R, M, Q, S>) {}
  failure(): Readonly<NativeAnimationInstructionFailure> | null { return this.blocked; }
  trace(): readonly NativeAnimationInstructionTrace[] { return Object.freeze(this.journal.map(row => Object.freeze({ ...row }))); }
  private check(): void { if (this.blocked) throw new Error(this.blocked.reason); }
  private call<T>(operation: string, invoke: () => NativeAnimationKnown<T>): T {
    this.check(); this.journal.push({ operation, kind: 'call' });
    this.engine.recordBoundary(operation); this.check();
    const result = invoke(); this.check();
    if (!result || result.known !== true) throw new Error(result?.known === false ? result.reason : 'Invalid native callback receipt');
    return result.value;
  }
  private write<T, K extends keyof T>(target: T, field: K, value: T[K], operation: string): void {
    this.check(); this.journal.push({ operation, kind: 'write' }); target[field] = value; this.check();
  }
  private run<T>(operation: () => T): NativeAnimationKnown<T> {
    if (this.active) {
      this.blocked = { reason: 'Reentrant native animation Start/Loop', partial: true, trace: this.trace() };
      return { known: false, reason: this.blocked.reason };
    }
    if (this.blocked) return { known: false, reason: this.blocked.reason };
    this.active = true; this.journal = [];
    try { return { known: true, value: operation() }; }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.blocked = Object.freeze({ reason, partial: this.journal.length > 0, trace: this.trace() });
      return { known: false, reason };
    } finally { this.active = false; }
  }
  private entity(): E | null { return this.call('instructionEntity.GetEntity', () => this.engine.getEntity('instructionEntity')); }
  private stopLayer(visual: V, actor: A, slot: NativeMotionSlot): void {
    this.call('Visual.StopMotion:' + slot, () => this.engine.stopMotion(visual, slot, 0));
    this.call('Actor.SetTargetWeight:' + slot, () => this.engine.setTargetWeight(actor, slot, 0));
    this.call('Visual.SetMotionOwner:' + slot, () => this.engine.setMotionOwner(visual, slot, 2));
  }
  private query(admin: NativeAnimationAdminCapability<R>, readName: () => string): R | null {
    const missedName = text(readName());
    const missed = byte(this.call('AnimationAdmin.IsAnimationMissed', () => admin.isAnimationMissed(missedName)), 'missed AL');
    if (missed !== 0) return null;
    const queryName = text(readName());
    return this.call('AnimationAdmin.QueryMotionDataEntity', () => admin.queryMotionDataEntity(queryName, 1));
  }
  private fileName(resource: R): string { return text(this.call('Resource.GetFileName', () => this.engine.getResourceFileName(resource))); }

  readonly start = (args: NativePlayAniArguments<E> | null, state: NativePlayAniStorage<V>): NativeAnimationKnown<boolean> =>
    this.run(() => this.startInternal(args, state));

  private startInternal(args: NativePlayAniArguments<E> | null, state: NativePlayAniStorage<V>): boolean {
    const e = this.engine;
    if (args === null || args.self === null) {
      let name = '';
      if (this.call('Self.GetEntity:presence', () => e.getEntity('self')) !== null) {
        const owner = present(this.call('Self.GetEntity:name', () => e.getEntity('self')), 'Self name');
        name = text(this.call('Entity.GetName', () => e.getEntityName(owner)));
      }
      this.call('GE_MESSAGEF_WARN:null-entity', () => e.warningNullEntity(name)); return false;
    }
    const instructionEntity = args.self;
    this.call('instructionEntity.SetEntity', () => e.setInstructionEntity(instructionEntity));
    if (this.entity() === null) return false;
    this.write(state, 'phaseMode', 0, 'SPU+15c=0');
    let motionType: 0 | 4 = 0;
    const visualOwner = present(this.entity(), 'Start Visual owner');
    const visual = this.call('Entity.GetPropertySet:100', () => e.getVisualAnimation(visualOwner));
    if (visual === null) return false;
    if (byte(args.overlayByte, 'overlay') === 1 || text(args.name).includes('_O_')) {
      this.write(state, 'phaseMode', 1, 'SPU+15c=1'); motionType = 4;
    }
    this.write(state, 'name', text(args.name), 'SPU+150=args.name');
    if (state.name.length === 0) return false;
    const admin = this.call('GetAnimationAdmin', () => e.getAnimationAdmin());
    if (admin === null) return false;
    const nameReference = {} as NativeAnimationStringReference;
    let referenceActive = true;
    Object.defineProperty(nameReference, 'value', { enumerable: true, configurable: false,
      get: () => { this.check(); if (!referenceActive) throw new Error('Expired variation CString reference'); return text(state.name); },
      set: (value: string) => {
        this.check(); if (!referenceActive) throw new Error('Expired variation CString reference');
        this.write(state, 'name', text(value), 'SPU+150=GetAniVariation mutation');
      } });
    Object.preventExtensions(nameReference);
    try { this.call('AnimationAdmin.GetAniVariation', () => admin.getAniVariation(nameReference)); }
    finally { referenceActive = false; }
    const extension = text(this.call('Motion.GetNativeFileExt', () => e.getNativeMotionFileExt()));
    this.write(state, 'name', state.name + extension, 'SPU+150+=extension');
    let resource = this.query(admin, () => state.name);
    if (resource === null) {
      this.call('AnimationAdmin.AddMissing:variation', () => admin.addMissingAnimation(state.name));
      this.write(state, 'name', text(args.name), 'SPU+150=args.name:fallback');
      this.write(state, 'name', state.name + extension, 'SPU+150+=extension:fallback');
      resource = this.query(admin, () => state.name);
      if (resource === null) {
        this.call('AnimationAdmin.AddMissing:original', () => admin.addMissingAnimation(state.name));
        const first = state.name.indexOf('_'); const second = state.name.indexOf('_', first + 1);
        const start = second + 1; const end = state.name.indexOf('_', start);
        if (first < 0 || second < 0 || end < start) throw new Error('Original fallback CString Delete/Insert outside structured-name profile');
        this.write(state, 'name', state.name.slice(0, start) + state.name.slice(end), 'SPU+150.Delete:third-word');
        this.write(state, 'name', state.name.slice(0, start) + 'None' + state.name.slice(start), 'SPU+150.Insert:None');
        resource = this.query(admin, () => state.name);
        if (resource === null) {
          this.call('AnimationAdmin.AddMissing:None', () => admin.addMissingAnimation(state.name)); return false;
        }
      }
    }
    const motion = resource;
    if (state.phaseMode === 0) {
      const owner = present(this.entity(), 'CurrentAni owner');
      const npc = present(this.call('Entity.GetPropertySet:1e', () => e.getNpc(owner)), 'CurrentAni NPC');
      const filename = this.fileName(motion);
      this.write(npc, 'currentAni', filename, 'NPC+1a0=resource.filename');
    }
    const variationFile = this.fileName(motion);
    this.call('AnimationAdmin.SetAniVariationMax', () => admin.setAniVariationMax(variationFile));
    const actor = this.call('Visual.GetActor', () => e.getActor(visual));
    if (actor === null) { this.call('Resource.ReleaseReference:actor-null', () => e.releaseResource(motion)); return false; }
    if (motionType === 0) {
      const oldExtro = F32(finite(this.call('Actor.GetExtroBlending', () => e.getExtroBlending(actor, 0)), 'extro'));
      const filename = this.fileName(motion);
      this.call('Actor.SetIntroExtroBlending', () => e.setIntroExtroBlending(actor, 0, filename));
      if (byte(this.call('Visual.HasMotion:0', () => e.hasMotion(visual, 0)), 'HasMotion AL') === 1) {
        if (byte(this.call('Actor.IsMotionRunning:0', () => e.isMotionRunning(actor, 0)), 'running AL') === 1) {
          let fade = F32(.1);
          if (!state.name.includes('_Begin_')) {
            const intro = finite(this.call('Actor.GetIntroBlending:compare', () => e.getIntroBlending(actor, 0)), 'intro');
            fade = oldExtro;
            if (intro <= oldExtro) fade = F32(finite(this.call('Actor.GetIntroBlending:result', () => e.getIntroBlending(actor, 0)), 'intro'));
          }
          this.call('Actor.SwitchFadeOut', () => e.switchFadeOut(actor, 0, false, fade));
        }
        this.stopLayer(visual, actor, 0);
      }
      for (const slot of [1, 2, 3] as const) {
        if (byte(this.call('Visual.HasMotion:' + slot, () => e.hasMotion(visual, slot)), 'HasMotion AL') === 1) this.stopLayer(visual, actor, slot);
      }
    } else if (byte(this.call('Visual.HasMotion:4', () => e.hasMotion(visual, 4)), 'HasMotion AL') === 1) this.stopLayer(visual, actor, 4);
    this.call('Visual.SetMotion', () => e.setMotion(visual, motionType, motion));
    this.call('Resource.ReleaseReference:Self', () => e.releaseResource(motion));
    const newOwner = present(this.entity(), 'cached Visual owner');
    const cachedVisual = this.call('Entity.GetPropertySet:100:cached', () => e.getVisualAnimation(newOwner));
    this.write(state, 'visualAnimation', cachedVisual, 'SPU+130=Visual');
    if (cachedVisual === null) return false;
    const descriptor = state.motionDescriptor;
    // This captured embedded pointer survives every subsequent actor callback.
    this.write(descriptor, 'fadeIn', 0, 'SPU+134=0'); this.write(state.motionDescriptor, 'fadeOut', 0, 'SPU+148=0');
    if (state.phaseMode !== 0) {
      if (state.name.includes('_Begin_')) {
        if (byte(args.reverseByte, 'reverse') !== 0) this.write(state.motionDescriptor, 'fadeOut', F32(.1), 'SPU+148=.1');
        else this.write(descriptor, 'fadeIn', F32(.1), 'SPU+134=.1');
      } else if (state.name.includes('_End_')) {
        if (byte(args.reverseByte, 'reverse') === 0) this.write(state.motionDescriptor, 'fadeOut', F32(.1), 'SPU+148=.1');
        else this.write(descriptor, 'fadeIn', F32(.1), 'SPU+134=.1');
      }
    }
    this.write(state.motionDescriptor, 'mode', byte(args.reverseByte, 'reverse') !== 0 ? 1 : 0, 'SPU+138=reverse');
    this.write(state.motionDescriptor, 'playSpeed', finite(F32(finite(args.playSpeed, 'speed')), 'stored speed'), 'SPU+13c=speed');
    const duration = stored32(args.duration, 'duration') >>> 0;
    this.write(state.motionDescriptor, 'loops', duration === 0 ? 2 : 0xffffffff, 'SPU+140=loops');
    this.write(state.motionDescriptor, 'weight', 1, 'SPU+144=1');
    this.write(state.motionDescriptor, 'blendMode', 1, 'SPU+14c=1');
    this.call('Visual.PlayMotion:Self', () => e.playMotion(present(state.visualAnimation, 'Self PlayMotion Visual'), motionType, descriptor));
    const otherAdmin = this.call('GetAnimationAdmin:after-PlayMotion', () => e.getAnimationAdmin());
    if (otherAdmin === null) return false;
    const other = args.other;
    if (other !== null) {
      const otherVisual = this.call('Other.GetPropertySet:100', () => e.getVisualAnimation(other));
      if (otherVisual !== null) {
        const otherActor = this.call('Other.Visual.GetActor', () => e.getActor(otherVisual));
        if (otherActor === null) return false;
        for (const slot of [0, 1, 2, 3] as const) {
          if (byte(this.call('Other.Visual.HasMotion:' + slot, () => e.hasMotion(otherVisual, slot)), 'HasMotion AL') === 1) this.stopLayer(otherVisual, otherActor, slot);
        }
        let interactionName = state.name;
        const normal = interactionName.indexOf('_N_'); const at = normal + 1;
        if (at < 0 || at >= interactionName.length) throw new Error('Original interaction CString.SetAt outside supported name');
        // Native Find==-1 yields SetAt(0,'I'); no invented _N_ requirement.
        interactionName = interactionName.slice(0, at) + 'I' + interactionName.slice(at + 1);
        const otherMotion = this.query(otherAdmin, () => interactionName);
        if (otherMotion === null) this.call('AnimationAdmin.AddMissing:Other', () => otherAdmin.addMissingAnimation(interactionName));
        else {
          this.call('Other.Visual.SetMotion', () => e.setMotion(otherVisual, 0, otherMotion));
          const filename = this.fileName(otherMotion);
          this.call('Other.Actor.SetIntroExtroBlending', () => e.setIntroExtroBlending(otherActor, 0, filename));
          this.call('Resource.ReleaseReference:Other', () => e.releaseResource(otherMotion));
          this.write(descriptor, 'fadeIn', 0, 'SPU+134=0:Other');
          this.write(state.motionDescriptor, 'fadeOut', 0, 'SPU+148=0:Other');
          const mode = stored32(state.motionDescriptor.mode, 'mode');
          this.write(state.motionDescriptor, 'loops', mode !== 0 ? 2 : 1, 'SPU+140=loops:Other');
          this.call('Other.Visual.PlayMotion', () => e.playMotion(otherVisual, 0, descriptor));
        }
      }
    }
    this.write(state, 'waitForFadeByte', byte(args.waitForFadeByte, 'wait-for-fade'), 'SPU+158=wait-for-fade');
    this.call('Visual.SetMotionOwner:Self', () => e.setMotionOwner(present(state.visualAnimation, 'owner Visual'), motionType, 4));
    return true;
  }

  readonly loop = (state: NativePlayAniStorage<V>): NativeAnimationKnown<void> => this.run(() => this.loopInternal(state));
  private loopInternal(state: NativePlayAniStorage<V>): void {
    const e = this.engine;
    if (float(state.waitElapsedMilliseconds, 'wait elapsed') < float(state.waitDurationMilliseconds, 'wait duration')) return;
    const mode = stored32(state.phaseMode, 'phase mode');
    const slot: 0 | 4 | 5 = mode === 1 ? 4 : mode === 2 ? 5 : 0;
    const actor = this.call('Visual.GetActor:loop', () => e.getActor(present(state.visualAnimation, 'loop Visual')));
    if (actor === null) return;
    let remaining: number;
    if (stored32(state.motionDescriptor.mode, 'play mode') === 1) {
      remaining = F32(finite(this.call('Actor.GetPlayTime:reverse', () => e.getPlayTime(actor, slot)), 'play time'));
    } else {
      const maximum = finite(this.call('Actor.GetMaxTime:remaining', () => e.getMaxTime(actor, slot)), 'max time');
      const time = finite(this.call('Actor.GetPlayTime:remaining', () => e.getPlayTime(actor, slot)), 'play time');
      remaining = F32(maximum - time);
    }
    const speed = finite(this.call('Actor.GetPlaySpeed:condition', () => e.getPlaySpeed(actor, slot)), 'play speed');
    if (speed > 0) {
      const divisor = finite(this.call('Actor.GetPlaySpeed:division', () => e.getPlaySpeed(actor, slot)), 'play speed');
      remaining = F32(remaining / divisor);
      if (!Number.isFinite(remaining)) throw new Error('Original remaining-time division exceeds finite supported profile');
    }
    if (float(state.waitDurationMilliseconds, 'wait duration') > 0 || stored32(state.motionDescriptor.mode, 'play mode') === 0) {
      this.call('Visual.StopAtLoopEnd', () => e.stopAtLoopEnd(present(state.visualAnimation, 'StopAtLoopEnd Visual'), slot));
    }
    const admin = present(this.call('GetAnimationAdmin:loop', () => e.getAnimationAdmin()), 'AnimationAdmin fade getter');
    const fade = F32(finite(this.call('AnimationAdmin.GetStandardAniFadeTime', () => admin.getStandardAniFadeTime()), 'standard fade'));
    let completed = byte(this.call('Actor.IsActorPlaying', () => e.isActorPlaying(actor, slot)), 'playing AL') !== 1;
    if (!completed) {
      let flow: 'active' | 'ordinary' | 'complete' = 'ordinary';
      if (state.phaseMode === 0) {
        if (finite(this.call('Actor.GetPlaySpeed:ordinary', () => e.getPlaySpeed(actor, 0)), 'play speed') === 0) flow = 'complete';
        else if (state.phaseMode !== 0) flow = this.overlayFlow(state, remaining);
      } else flow = this.overlayFlow(state, remaining);
      completed = flow === 'complete';
      if (flow === 'ordinary' && byte(state.waitForFadeByte, 'wait-for-fade') !== 0 && remaining <= fade) completed = true;
    }
    if (!completed) {
      if (this.entity() === null) { this.write(state, 'completedByte', 1, 'SPU+94=1:null-owner'); return; }
      const npcOwner = present(this.entity(), 'loop NPC owner');
      const npc = this.call('Entity.GetPropertySet:1e:loop', () => e.getNpc(npcOwner));
      if (npc === null) return;
      const currentAni = text(npc.currentAni); // CString COPY before movement callback
      const movementOwner = present(this.entity(), 'loop Movement owner');
      const movement = this.call('Entity.GetPropertySet:15:loop', () => e.getMovement(movementOwner));
      if (movement === null) return;
      if (currentAni.includes('_Stumble') || currentAni.includes('_Parade') || currentAni.includes('Attack')) {
        this.call('Movement.EnableMovementFromSPU:false', () => e.enableMovementFromSPU(movement, false));
      }
      if (byte(state.phaseFinishedByte, 'phase finished') === 0 && state.name.includes('_Begin_')) {
        const maximum = F32(finite(this.call('Actor.GetMaxTime:half', () => e.getMaxTime(actor, slot)), 'max time'));
        const halfway = maximum * .5;
        const time = finite(this.call('Actor.GetPlayTime:half', () => e.getPlayTime(actor, slot)), 'play time');
        if (time >= halfway) this.finishBegin(state);
      }
      return;
    }
    if (byte(state.phaseFinishedByte, 'phase finished') === 0 && state.name.includes('_Begin_')) this.finishBegin(state);
    this.write(state, 'completedByte', 1, 'SPU+94=1');
  }
  private overlayFlow(state: NativePlayAniStorage<V>, remaining: number): 'active' | 'ordinary' | 'complete' {
    if (remaining !== 0) {
      const frame = finite(this.call('Application.GetScaledFrameSeconds', () => this.engine.getScaledFrameSeconds()), 'scaled frame');
      // Native JA 2036a322 goes directly to active work; a callback changing
      // phaseMode to zero does not send this path through wait-for-fade.
      if (remaining > frame) return 'active';
    }
    return state.phaseMode !== 0 ? 'complete' : 'ordinary';
  }
  private finishBegin(state: NativePlayAniStorage<V>): void {
    const words = text(state.name).split('_');
    // SharedBase10004bf6 returns the final remaining word even when ordinal5
    // exceeds the separator count; the caller ignores its -1 position result.
    const actionName = words[Math.min(5, words.length - 1)]!;
    let action = 0;
    for (let index = 1; index < rules.actionStrings.length; index++) {
      if (actionName === rules.actionStrings[index]) { action = index; break; }
    }
    const admin = this.call('GetScriptAdmin', () => this.engine.getScriptAdmin());
    const callback = this.call('ScriptAdmin.captureVirtualSlot+bc', () => this.engine.captureAniStateScript(admin));
    const owner = this.entity(); // after virtual-slot address capture, before its dereference
    const aniState = stored32(this.call('ScriptAdmin.CallScript:GetAniStateByAction', () => callback('GetAniStateByAction', owner, null, action)), 'script result');
    if (((aniState - 2) >>> 0) < 28) {
      const routineOwner = present(this.entity(), 'Begin Routine owner');
      const routine = this.call('Entity.GetPropertySet:2d', () => this.engine.getRoutine(routineOwner));
      if (routine !== null) this.call('Routine.SetAniState', () => this.engine.setRoutineAniState(routine, aniState));
    }
    this.write(state, 'phaseFinishedByte', 1, 'SPU+164=1');
  }
}
