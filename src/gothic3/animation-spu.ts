/** Bind original PlayAni to the SAME script processor, timers and entity
 * proxies used by ProcessScript/FullStop. No cloned snapshot is writable state.
 * Actor services are actual retained capabilities; catalog records are not
 * promoted to resident entities by this adapter. */
import { NativePlayAniInstruction } from './animation-state';
import type { OriginalAnimationLibrary } from './animation-state';
import type { NativeAnimationKnown, NativeEmbeddedMotionDescriptor, NativePlayAniArguments,
  NativePlayAniHost, NativePlayAniStorage } from './animation-state';
import { NativeInstructionProxyRegistry } from './script-instructions';
import type { NativeInstructionBody } from './script-instructions';
import { NativeScriptProcessingUnit } from './script-routine';
import type { NativeRoutineResult, NativeSPUAnimationDescriptor, NativeSPUAnimationField,
  NativeSPUAnimationStorage, NativeSPUSchedulerAccess } from './script-routine';
import type { NativePlayerActor, NativePlayerStateHost } from './player-state';
import { NativeAnimationInstruction } from './animation-instruction';
import type { NativeAnimationInstructionEngine, NativeMotionSlot } from './animation-instruction';

export const ORIGINAL_PLAYANI_POINTER = '2001c76f';
const GAME_SHA256 = 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f';
const boundProcessors = new WeakSet<NativeScriptProcessingUnit>();

export interface NativeAnimationSPUHost<E, V extends object, M> extends
    Omit<NativePlayAniHost<E, V, M>, 'getInstructionEntity' | 'clearEntityPointer'> {
  /** Resolve the actual live owner held by the proxy internal. Returning an
   * arbitrary source-catalog entity is not a native owner lookup. */
  resolveEntity(identity: string): NativeAnimationKnown<E | null>;
  entityIdentity(entity: E): string;
}

export class NativeAnimationSPUBinding<E, V extends object, M> {
  private access: NativeSPUSchedulerAccess | null = null;
  private blocked: string | null = null;
  private readonly conductor: NativePlayAniInstruction<E, V, M>;
  /** One persistent field facade and one persistent embedded descriptor.
   * Both reject reads/writes outside the current same-SPU scheduler scope. */
  readonly storage: NativePlayAniStorage<V>;

  constructor(readonly spu: NativeScriptProcessingUnit, readonly proxies: NativeInstructionProxyRegistry,
    readonly host: NativeAnimationSPUHost<E, V, M>) {
    if (boundProcessors.has(spu)) throw new Error('This SPU already has its physical PlayAni binding');
    if (spu.failure() !== null || spu.schedulerSnapshot() === null || spu.animationSnapshot() === null ||
        proxies.proxySnapshot(spu) === null) throw new Error('PlayAni requires the existing usable SPU/scheduler/proxy stores');
    const descriptor = {} as NativeEmbeddedMotionDescriptor;
    for (const key of ['fadeIn', 'mode', 'playSpeed', 'loops', 'weight', 'fadeOut', 'blendMode'] as const) {
      Object.defineProperty(descriptor, key, { enumerable: true, configurable: false,
        get: () => this.scope().animationStorage().motionDescriptor[key],
        set: (value: NativeSPUAnimationDescriptor[typeof key]) => this.scope().writeAnimationDescriptor(key, value) });
    }
    Object.preventExtensions(descriptor);
    const storage = {} as NativePlayAniStorage<V>;
    for (const key of ['completedByte', 'visualAnimation', 'name', 'waitForFadeByte', 'phaseMode', 'phaseFinishedByte'] as const) {
      Object.defineProperty(storage, key, { enumerable: true, configurable: false,
        get: () => {
          const value = this.scope().animationStorage()[key];
          if (value === null && ['completedByte', 'phaseMode', 'phaseFinishedByte'].includes(key)) {
            throw new Error('Original SPU animation field is uninitialized: ' + key);
          }
          return value;
        },
        set: (value: NativeSPUAnimationStorage[typeof key]) => this.write(key, value) });
    }
    Object.defineProperty(storage, 'motionDescriptor', { enumerable: true, configurable: false,
      get: () => { this.scope(); return descriptor; } });
    Object.defineProperty(storage, 'activeInstruction', { enumerable: true, configurable: false,
      get: () => this.scope().snapshot().activeInstruction,
      set: (value: string | null) => { this.scope(); this.require(this.spu.setActiveInstruction(value)); } });
    for (const key of ['waitElapsedMilliseconds', 'waitDurationMilliseconds'] as const) {
      Object.defineProperty(storage, key, { enumerable: true, configurable: false,
        get: () => {
          const value = this.scope().storage()[key];
          if (value === null) throw new Error('Original SPU wait duration is uninitialized'); return value;
        },
        set: (value: number) => this.scope().writeStorage(key, value) });
    }
    Object.preventExtensions(storage); this.storage = storage;
    const call = <T>(operation: string, body: () => NativeAnimationKnown<T>): NativeAnimationKnown<T> => {
      const access = this.scope(); access.record({ operation: 'PlayAni-' + operation });
      const value = body(); this.scope(); return value;
    };
    const bound: NativePlayAniHost<E, V, M> = {
      start: (args, state) => call('Start', () => host.start(args, state)),
      loop: state => call('ItlLoop', () => host.loop(state)),
      getInstructionEntity: () => call('GetEntity', () => {
        const id = proxies.get(spu, 'instructionEntity', this.scope());
        if (id === null) return { known: true, value: null };
        const entity = host.resolveEntity(id);
        if (!entity.known) return entity;
        if (entity.value === null || host.entityIdentity(entity.value) !== id) {
          return { known: false, reason: 'Original retained instruction entity capability is unresolved' };
        }
        return entity;
      }),
      getNpc: entity => call('GetPS:NPC', () => host.getNpc(entity)),
      getMovement: entity => call('GetPS:Movement', () => host.getMovement(entity)),
      enableMovementFromSPU: (movement, enabled) => call('EnableMovementFromSPU', () => host.enableMovementFromSPU(movement, enabled)),
      stopAtLoopEnd: (visual, type) => call('StopAtLoopEnd', () => host.stopAtLoopEnd(visual, type)),
      setMotionOwner: (visual, type, owner) => call('SetMotionOwner', () => host.setMotionOwner(visual, type, owner)),
      clearEntityPointer: key => call('ClearProxy:' + key, () => {
        proxies.set(spu, key, null, this.scope()); return { known: true, value: undefined };
      }),
    };
    this.conductor = new NativePlayAniInstruction(storage, bound);
    boundProcessors.add(spu);
  }
  private require(result: NativeRoutineResult): void { if (!result.supported) throw new Error(result.reason); }
  private scope(): NativeSPUSchedulerAccess {
    if (this.blocked !== null) throw new Error(this.blocked);
    const access = this.access;
    if (access === null || !this.spu.ownsSchedulerAccess(access)) throw new Error('Expired or cross-SPU PlayAni storage facade');
    access.snapshot(); return access;
  }
  private write<K extends NativeSPUAnimationField>(key: K, value: NativeSPUAnimationStorage[K]): void {
    this.scope().writeAnimation(key, value);
  }
  recordBoundary(operation: string): void { this.scope().record({ operation: 'PlayAni-engine:' + operation }); }
  /** Start/loop services use these exact same retained proxy fields. */
  setProxy(key: 'instructionEntity' | 'instructionTarget', entity: E | null): void {
    const access = this.scope(); access.record({ operation: 'PlayAni-set-proxy:' + key });
    this.proxies.set(this.spu, key, entity === null ? null : this.host.entityIdentity(entity), access);
  }
  queryProxy(key: 'instructionEntity' | 'instructionTarget'): NativeAnimationKnown<E | null> {
    const access = this.scope(); access.record({ operation: 'PlayAni-query-proxy:' + key });
    const id = this.proxies.get(this.spu, key, access);
    if (id === null) return { known: true, value: null };
    const result = this.host.resolveEntity(id); this.scope();
    if (result.known && (result.value === null || this.host.entityIdentity(result.value) !== id)) {
      return { known: false, reason: 'Retained animation proxy owner capability differs' };
    }
    return result;
  }
  queryEntity(key: 'self' | 'instructionEntity'): NativeAnimationKnown<E | null> {
    if (key === 'instructionEntity') return this.queryProxy(key);
    const access = this.scope(); access.record({ operation: 'PlayAni-query-Self' });
    const id = access.snapshot().self;
    if (id === null) return { known: true, value: null };
    const result = this.host.resolveEntity(id); this.scope();
    if (result.known && (result.value === null || this.host.entityIdentity(result.value) !== id)) {
      return { known: false, reason: 'Original Self owner capability differs' };
    }
    return result;
  }
  /** Source invocation from a script, inside or outside ProcessScript. */
  invoke(args: NativePlayAniArguments<E> | null, abortByte = 0): NativeRoutineResult {
    return this.spu.dispatchScheduler(access => this.invokeScoped(access, args, abortByte));
  }
  invokeScoped(access: NativeSPUSchedulerAccess, args: NativePlayAniArguments<E> | null, abortByte = 0): 0 | 1 {
    if (!this.spu.ownsSchedulerAccess(access)) throw new Error('Cross-instance PlayAni instruction dispatch');
    access.snapshot();
    if (this.blocked !== null) throw new Error(this.blocked);
    if (this.access !== null) {
      this.blocked = 'Reentrant PlayAni instruction binding'; throw new Error(this.blocked);
    }
    this.access = access;
    try {
      const result = this.conductor.invoke(args, abortByte);
      if (!result.supported) throw new Error(result.reason);
      return result.nativeReturnValue;
    } catch (error) {
      this.blocked = error instanceof Error ? error.message : String(error); throw error;
    } finally { this.access = null; }
  }
  failure(): string | null { return this.blocked; }
  /** ProcessScript polls2001c76f with null descriptor and AL=false. */
  instruction(pointer: string): NativeInstructionBody | null {
    if (pointer !== ORIGINAL_PLAYANI_POINTER) return null;
    return { source: { moduleSha256: GAME_SHA256, entry: ORIGINAL_PLAYANI_POINTER },
      invoke: (argument, spu, access, abort) => {
        if (argument !== null || spu !== this.spu || typeof abort !== 'boolean') throw new Error('Invalid PlayAni poll adapter');
        return this.invokeScoped(access, null, abort ? 1 : 0);
      } };
  }
  /** The existing FullStop routine uses the same conductor and proxy registry. */
  abortHandler(pointer: string): ((argument: null, spu: NativeScriptProcessingUnit, abort: true) => boolean) | null {
    if (pointer !== ORIGINAL_PLAYANI_POINTER) return null;
    return (argument, spu, abort) => {
      if (argument !== null || spu !== this.spu || abort !== true) throw new Error('Invalid PlayAni FullStop adapter');
      const result = this.invoke(null, 1); this.require(result);
      return result.supported && result.nativeReturnValue === 1;
    };
  }
}

export interface NativeConnectedAnimationServices<E, V extends object, A, R, M, Q, S> extends
    Omit<NativeAnimationInstructionEngine<E, V, A, R, M, Q, S>,
      'recordBoundary' | 'getEntity' | 'setInstructionEntity' | 'enableMovementFromSPU' | 'setMotionOwner'> {
  resolveEntity(identity: string): NativeAnimationKnown<E | null>;
  entityIdentity(entity: E): string;
  enableMovementFromSPU(movement: M, enabled: boolean): NativeAnimationKnown<void>;
  /** A null receiver reaches the original native dereference boundary;
   * report it as unsupported, retaining prior writes, rather than succeeding. */
  setMotionOwner(visual: V | null, slot: NativeMotionSlot, owner: 2 | 4 | 7 | 8): NativeAnimationKnown<void>;
}
/** Actual Start/Loop and conductor composition, with one retained processor
 * and proxy registry. Engine services must supply their real loaded objects,
 * layer operations and resource references; this factory creates no scenery,
 * collision bodies or substitute resource-cache membership. */
export function connectOriginalAnimationSPU<E, V extends object, A, R, M, Q, S>(spu: NativeScriptProcessingUnit,
  proxies: NativeInstructionProxyRegistry, services: NativeConnectedAnimationServices<E, V, A, R, M, Q, S>): {
    binding: NativeAnimationSPUBinding<E, V, M>; instruction: NativeAnimationInstruction<E, V, A, R, M, Q, S> } {
  let instruction: NativeAnimationInstruction<E, V, A, R, M, Q, S>;
  const binding = new NativeAnimationSPUBinding<E, V, M>(spu, proxies, {
    resolveEntity: identity => services.resolveEntity(identity), entityIdentity: entity => services.entityIdentity(entity),
    start: (args, state) => instruction.start(args, state), loop: state => instruction.loop(state),
    getNpc: entity => {
      const result = services.getNpc(entity);
      return result.known ? { known: true, value: result.value !== null } : result;
    },
    getMovement: entity => services.getMovement(entity),
    enableMovementFromSPU: (movement, enabled) => services.enableMovementFromSPU(movement, enabled),
    stopAtLoopEnd: (visual, slot) => services.stopAtLoopEnd(visual, slot),
    setMotionOwner: (visual, slot, owner) => services.setMotionOwner(visual, slot, owner),
  });
  const engine: NativeAnimationInstructionEngine<E, V, A, R, M, Q, S> = {
    recordBoundary: operation => binding.recordBoundary(operation),
    getEntity: key => binding.queryEntity(key),
    setInstructionEntity: entity => {
      binding.setProxy('instructionEntity', entity); return { known: true, value: undefined };
    },
    enableMovementFromSPU: (movement, enabled) => services.enableMovementFromSPU(movement, enabled),
    setMotionOwner: (visual, slot, owner) => services.setMotionOwner(visual, slot, owner),
    getEntityName: entity => services.getEntityName(entity),
    warningNullEntity: name => services.warningNullEntity(name),
    getVisualAnimation: entity => services.getVisualAnimation(entity),
    getNpc: entity => services.getNpc(entity), getMovement: entity => services.getMovement(entity),
    getRoutine: entity => services.getRoutine(entity),
    getAnimationAdmin: () => services.getAnimationAdmin(),
    getNativeMotionFileExt: () => services.getNativeMotionFileExt(),
    getResourceFileName: resource => services.getResourceFileName(resource),
    releaseResource: resource => services.releaseResource(resource),
    getActor: visual => services.getActor(visual),
    hasMotion: (visual, slot) => services.hasMotion(visual, slot),
    isMotionRunning: (actor, slot) => services.isMotionRunning(actor, slot),
    isActorPlaying: (actor, slot) => services.isActorPlaying(actor, slot),
    getExtroBlending: (actor, slot) => services.getExtroBlending(actor, slot),
    getIntroBlending: (actor, slot) => services.getIntroBlending(actor, slot),
    setIntroExtroBlending: (actor, slot, name) => services.setIntroExtroBlending(actor, slot, name),
    switchFadeOut: (actor, slot, force, duration) => services.switchFadeOut(actor, slot, force, duration),
    stopMotion: (visual, slot, duration) => services.stopMotion(visual, slot, duration),
    setTargetWeight: (actor, slot, weight) => services.setTargetWeight(actor, slot, weight),
    setMotion: (visual, slot, resource) => services.setMotion(visual, slot, resource),
    playMotion: (visual, slot, descriptor) => services.playMotion(visual, slot, descriptor),
    getPlayTime: (actor, slot) => services.getPlayTime(actor, slot),
    getMaxTime: (actor, slot) => services.getMaxTime(actor, slot),
    getPlaySpeed: (actor, slot) => services.getPlaySpeed(actor, slot),
    stopAtLoopEnd: (visual, slot) => services.stopAtLoopEnd(visual, slot),
    getScaledFrameSeconds: () => services.getScaledFrameSeconds(),
    getScriptAdmin: () => services.getScriptAdmin(),
    captureAniStateScript: admin => services.captureAniStateScript(admin),
    setRoutineAniState: (routine, state) => services.setRoutineAniState(routine, state),
  };
  instruction = new NativeAnimationInstruction(engine);
  return { binding, instruction };
}

/** Source Entity.GetAniEx1002faf0 subcalls. Each callback follows its actual
 * wrapper/native implementation, including missing-PS warnings and the live
 * primary-pose mutation. The final AniState read is separate from FixDirection.
 */
export interface NativeEntityAnimationNameHost<E> {
  skeletonName(entity: E): NativeAnimationKnown<{ valid: boolean; name: string }>;
  primaryPose(entity: E, action: number, phase: number): NativeAnimationKnown<{ valid: boolean; pose: number }>;
  navigationDirection(entity: E): NativeAnimationKnown<number>;
  fixDirection(entity: E, action: number, phase: number, direction: number): NativeAnimationKnown<{ valid: boolean; direction: number }>;
  aniState(entity: E): NativeAnimationKnown<number>;
}
export function originalEntityAnimationName<E>(library: OriginalAnimationLibrary, host: NativeEntityAnimationNameHost<E>,
  entity: E, action: number, useTypeA: number, useTypeB: number, phase: number,
  record: (operation: string) => void): NativeAnimationKnown<string> {
  const call = <T>(name: string, fn: () => NativeAnimationKnown<T>): T => {
    record(name); const result = fn(); record(name + ':return');
    if (!result.known) throw new Error(result.reason); return result.value;
  };
  try {
    const skeleton = call('Script.GetSkeletonName', () => host.skeletonName(entity));
    if (typeof skeleton.valid !== 'boolean' || typeof skeleton.name !== 'string') throw new Error('Original skeleton getter result unresolved');
    if (!skeleton.valid) return { known: true, value: '' };
    const skeletonName = skeleton.name;
    const pose = call('Script.GetPrimaryPoseExt', () => host.primaryPose(entity, action, phase));
    if (typeof pose.valid !== 'boolean') throw new Error('Original primary-pose AL unresolved');
    if (!pose.valid) return { known: true, value: '' };
    const primaryPose = pose.pose;
    const direction = call('Script.GetAniDirection', () => host.navigationDirection(entity));
    const fixed = call('Script.FixAniDirection', () => host.fixDirection(entity, action, phase, direction));
    if (typeof fixed.valid !== 'boolean') throw new Error('Original direction AL unresolved');
    if (!fixed.valid) return { known: true, value: '' };
    const fixedDirection = fixed.direction;
    const aniState = call('Script.PropertyAniState.get', () => host.aniState(entity));
    return { known: true, value: library.name({ skeleton: skeletonName, aniState, useTypeA, useTypeB,
      pose: primaryPose, action, phase, overlay: 0, direction: fixedDirection, variation: 0 }) };
  } catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
}

/** Wire the real Hero _AI_Jump handler to this same SPU conductor. The caller
 * supplies actual Entity.GetAni PS services, never a predetermined clip name. */
export function originalPlayerAnimationPort<V extends object, M>(binding: NativeAnimationSPUBinding<NativePlayerActor, V, M>,
  library: OriginalAnimationLibrary, host: NativeEntityAnimationNameHost<NativePlayerActor>): NonNullable<NativePlayerStateHost['animation']> {
  const check = (spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess) => {
    if (spu !== binding.spu || !spu.ownsSchedulerAccess(access)) throw new Error('Cross-SPU Hero animation capability');
    access.snapshot();
  };
  return {
    getAni: (actor, action, useTypeA, useTypeB, phase, spu, access) => {
      check(spu, access);
      return originalEntityAnimationName(library, host, actor, action, useTypeA, useTypeB, phase,
        operation => { check(spu, access); access.record({ operation, entity: actor.entity.id }); });
    },
    playAni: (args, spu, access) => {
      check(spu, access);
      try { return { known: true, value: binding.invokeScoped(access, args, 0) }; }
      catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
    },
  };
}
