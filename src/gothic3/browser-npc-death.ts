/** Binds source-seeded Ardea owners to the original SPU death state path.
 * This host implements the verified empty-hand, humanoid, no active effect,
 * no native VisualAnimation capability branch. Native enclave/plunder and
 * ragdoll services remain explicit stopping points after an applied prefix.
 */
import { NativeNpcDeathGlobals, NativeNpcDeathLifecycle } from './npc-death-lifecycle';
import type { NativeNpcDeathActor, NativeNpcDeathHost, NativeNpcDeathOperation } from './npc-death-lifecycle';
import { NativeInstructionScheduler, NativeInstructionProxyRegistry, NativeSPUFrameSchedule } from './script-instructions';
import { OriginalEntityPropertySet, OriginalEnclaveProxy, OriginalPropertyOwner, OriginalRoutinePropertyBindings } from './native-properties';
import { NativeScriptProcessingUnit } from './script-routine';
import type { NativeRoutineEntity, NativeSPUSchedulerAccess } from './script-routine';
import type { NativeActorCombatState, NativeDefeatEffect, NativeKnowledge } from './combat';
import { nativeNpcDefaultXp } from './combat';
import { HERO_SOURCE_ID } from './browser-melee';
import type { BrowserArdeaNpcCombatRuntime, BrowserArdeaNpcCombatState, BrowserNpcLiveState } from './npc-combat-runtime';
import type { BrowserFistHitResult } from './browser-melee';
import type { NativeQuestRuntime } from './quest-runtime';
import { NativeSpeechAllocation, NativeSpeechOutput } from './native-speech-output';
import { NativeSvmManagerData } from './native-svm-data';

const PROFILE = 'browser-empty-hand-humanoid-death-v1';
const CHECKPOINT = 'gothic3-browser-npc-lifecycle-checkpoint-v1';
const IDS = new Set(['0c3ad5c499a37e479901ef8b1a19877900000000',
  'ef1adbed209ec647b20ebc9fc989642500000000', '81630a69bab9c44b9df46b76df0ac7b100000000']);
const known = <T>(value: T, source = PROFILE): NativeKnowledge<T> => ({ status: 'known', value, source });
const unknown = <T>(reason: string): NativeKnowledge<T> => ({ status: 'unknown', reason });
const isKnown = <T>(value: NativeKnowledge<T>): T => {
  if (value.status !== 'known') throw new Error(value.reason); return value.value;
};

export interface BrowserNpcDeathPresentation {
  /** Real live Group identity must exist. It has no native VisualAnimation PS
   * attached until the original animation service is connected. */
  hasStaticOwner(id: string): boolean;
  nativeVisualAnimationPresent(id: string): boolean;
  /** Attached browser engine capabilities, separate from serialized source
   * classes. Source bandits do contain collision/rigid-body/VisualAni data. */
  nativeResetAllCapabilities(id: string): { characterControl: boolean;
    dynamicCollisionCircle: boolean; collisionShape: boolean; physicalObject: boolean };
  applyResetAll(id: string, state: { lookAt: null; alignmentTarget: null;
    constraintsDegrees: 360; autoAim: false; dcc: true; collisionGroup: 4 }): void;
  defeated(id: string): void;
  notify(message: string): void;
}
interface Binding {
  actor: BrowserArdeaNpcCombatState;
  scheduler: NativeInstructionScheduler;
  death: NativeNpcDeathLifecycle;
  speech: NativeSpeechOutput;
  routine: OriginalEntityPropertySet<BrowserNpcLiveState['routine']>;
  npc: OriginalEntityPropertySet<BrowserNpcLiveState['npc']>;
  pendingXp: number;
}

export class BrowserNpcDeathRuntime {
  private readonly bindings = new Map<string, Binding>();
  private readonly frames = NativeSPUFrameSchedule.fromOriginalLoader();
  private readonly globals: NativeNpcDeathGlobals;
  private readonly svm = new NativeSvmManagerData();
  private timestamp = 0;
  constructor(private readonly npcs: BrowserArdeaNpcCombatRuntime,
    private readonly quests: NativeQuestRuntime, private readonly presentation: BrowserNpcDeathPresentation) {
    const retained = npcs.deathGlobals();
    this.globals = retained ? new NativeNpcDeathGlobals(retained) : NativeNpcDeathGlobals.fromOriginalLoader();
  }

  private live(actor: BrowserArdeaNpcCombatState): BrowserNpcLiveState {
    if (!actor.liveState) throw new Error('The actor source lifecycle fields are unavailable.');
    return actor.liveState;
  }
  /** Empty native calls are admitted from actual linked stack/slot state,
   * not inferred from a missing rendered weapon. */
  private emptyHands(actor: BrowserArdeaNpcCombatState): boolean {
    const inventory = actor.inventory.snapshot();
    return actor.serializedEquipmentSlots.status === 'resolved' &&
      !actor.serializedEquipmentSlots.slots.some(slot => slot.index === 1 || slot.index === 2) &&
      inventory.equipment.length === 0 && inventory.observerRegistry === 'complete' &&
      inventory.unresolvedEffects.length === 0 &&
      inventory.stacks.every(stack => stack.linkedSlot === 0 && stack.physicalItemGuid20 === null);
  }
  private profile(actor: BrowserArdeaNpcCombatState): string | null {
    if (this.npcs.get(actor.personId) !== actor) return 'The actor no longer belongs to the live NPC registry.';
    if (!IDS.has(actor.personId) || actor.lifecycleSource.status !== 'source-resolved' || !actor.liveState) {
      return 'The browser death host currently requires a source-resolved Jack bandit owner.';
    }
    const live = actor.liveState;
    if (!this.presentation.hasStaticOwner(actor.personId) || this.presentation.nativeVisualAnimationPresent(actor.personId)) {
      return 'This empty-animation death profile does not own the actor presentation.';
    }
    const capabilities = this.presentation.nativeResetAllCapabilities(actor.personId);
    if (Object.values(capabilities).some(present => present !== false)) {
      return 'Attached native control, collision or physics capabilities require their actual ResetAll host.';
    }
    if (actor.species !== 0 || live.npc.StatusEffects !== 0 || live.effect.Effect !== '' ||
        live.navigation.CurrentDestinationPointProxy !== null || live.npc.CombatState !== 0 ||
        live.party.PartyLeaderEntity !== null || !this.emptyHands(actor)) {
      return 'Active effects, interaction, combat, party or hand equipment need additional native death services.';
    }
    return null;
  }

  private combat(id: string): NativeKnowledge<NativeNpcDeathActor | null> {
    if (id === HERO_SOURCE_ID) {
      const source = this.quests.heroNpcCombatProfile();
      if (!source.known) return unknown(source.reason);
      const progress = this.quests.nativePlayerProgress(), vitals = this.quests.heroVitals();
      const combat: NativeActorCombatState = { id, name: 'PC_Hero', isPlayer: true,
        species: source.value.species, npcType: source.value.npcType, rawLevel: progress.level,
        rawLevelMax: source.value.rawLevelMax, hasPlayerMemory: true, transformed: false,
        navigationValid: true, damageReceiverValid: true, initialization: 'initialized',
        hitPoints: vitals.hitPoints, hitPointsMax: vitals.hitPointsMax, stamina: 0, staminaMax: 0,
        action: 0, aniState: 0, primaryPose: 0, statePosition: 0, hands: { leftUseType: 0, rightUseType: 8 },
        currentAttackerId: unknown('Hero CurrentAttacker is not used by the NPC death task.'),
        armorIsRobe: unknown('Hero armor is not used by the NPC death task.'),
        skills: this.quests.heroCombatSkills(), enclavePresent: unknown('Hero enclave is not queried by this task prefix.') };
      return known({ combat, aiMode: unknown('Hero AIMode is not queried by this NPC task prefix.') });
    }
    const actor = this.npcs.get(id);
    if (!actor) return known(null);
    const live = this.live(actor);
    const combat: NativeActorCombatState = { id, name: actor.name, isPlayer: false,
      species: actor.species, npcType: actor.npcType, rawLevel: actor.rawLevel, rawLevelMax: actor.rawLevelMax,
      hasPlayerMemory: false, transformed: false, navigationValid: actor.navigationValid,
      damageReceiverValid: actor.damageReceiverValid, initialization: 'initialized',
      hitPoints: actor.hitPoints, hitPointsMax: actor.processingRange.hitPointsMax,
      stamina: actor.stamina, staminaMax: actor.processingRange.staminaMax,
      action: live.routine.Action, aniState: live.routine.AniState, primaryPose: 0,
      statePosition: live.routine.StatePosition, hands: { leftUseType: 0, rightUseType: 0 },
      currentAttackerId: known(live.npc.CurrentAttackerEntity), armorIsRobe: actor.armorIsRobe,
      skills: {}, enclavePresent: known(live.enclaveGuid20 !== null) };
    return known({ combat, aiMode: known(live.routine.AIMode) });
  }

  private write<P extends object, K extends keyof P>(set: OriginalEntityPropertySet<P>, key: K, value: P[K],
    access?: NativeSPUSchedulerAccess): void {
    const enter = set.notify('enter', String(key), false); if (!enter.supported) throw new Error(enter.reason);
    set.values[key] = value;
    const exit = set.notify('exit', String(key), false); if (!exit.supported) throw new Error(exit.reason);
    access?.record({ operation: 'browser-death-property-' + String(key), entity: set.identity });
  }

  private binding(actor: BrowserArdeaNpcCombatState): Binding {
    const retained = this.bindings.get(actor.personId); if (retained) return retained;
    const error = this.profile(actor); if (error) throw new Error(error);
    const live = this.live(actor), owner = OriginalPropertyOwner.fromConstructor(actor.personId, 'gCEntity');
    const routine = new OriginalEntityPropertySet(actor.personId + ':routine', 'gCScriptRoutine_PS', live.routine, owner);
    const npc = new OriginalEntityPropertySet(actor.personId + ':npc', 'gCNPC_PS', live.npc, owner,
      new OriginalEnclaveProxy(live.enclaveGuid20 ?? '0000000000000000000000000000000000000000', null));
    const routineHooks = new OriginalRoutinePropertyBindings(); routineHooks.bind(routine);
    const entity: NativeRoutineEntity = { id: actor.personId, properties: live.routine, npcPresent: true };
    let binding!: Binding;
    const host: NativeNpcDeathHost = {
      actor: id => this.combat(id), playerId: () => known(HERO_SOURCE_ID),
      preflight: operation => this.preflight(binding, operation),
      engine: (operation, spu, access) => this.engine(binding, operation, spu, access),
      questEvent: (name, id) => {
        if (name !== 'OnNPCKilled') return unknown('The original OnNPCDefeated quest callback is not connected yet.');
        const victim = this.npcs.get(id); if (!victim) return unknown('Quest event victim is not a live source actor.');
        const result = this.quests.recordNpcKilled(victim.name);
        if (result.kind === 'unsupported') return unknown(result.reason);
        if (result.progress.length) this.presentation.notify('Kill objectives: ' + result.progress.map(p =>
          p.questId + ' ' + p.counter + '/' + p.amount).join(', '));
        return known(undefined, 'Game:20347c90; browser registered quest manager');
      },
      defeatXpContext: (attackerId, victimId) => {
        if (attackerId !== HERO_SOURCE_ID || victimId !== actor.personId) return unknown('Non-Hero defeat credit is unresolved.');
        const amount = nativeNpcDefaultXp(isKnown(this.combat(victimId))!.combat);
        if (amount.status !== 'resolved') return unknown(amount.reason);
        binding.pendingXp = live.npc.DefeatedByPlayer ? 0 : amount.value;
        return known({ player: this.quests.nativePlayerProgress(), credit: { playerId: HERO_SOURCE_ID,
          creditedActorId: attackerId, creditedPartyLeaderId: known(null), playerPartyLeaderId: known(null),
          victimDefeatedByPlayer: known(live.npc.DefeatedByPlayer), victimPartyMemberType: known(live.party.PartyMemberType) } });
      },
      xpEffect: (effect, _spu, access) => this.xpEffect(binding, effect, access),
    };
    const death = new NativeNpcDeathLifecycle(host, this.globals);
    const speechHost = {
      allocate: (kind: 'channel' | 'sound', bytes: 20 | 16) => known(
        new NativeSpeechAllocation(actor.personId + ':death-speech-' + kind, bytes), 'actual browser-owned native speech wrapper storage'),
      audioModule: () => known(null, 'selected browser application registry has no native AudioModule attached'),
    };
    const savedSpeech = actor.lifecycleCheckpoint?.speechOutput;
    const speech = savedSpeech ? NativeSpeechOutput.fromCheckpoint(speechHost, savedSpeech)
      : NativeSpeechOutput.fromOriginalFactory(speechHost);
    const routineHost = { resolveSelf: (id: string) => id === entity.id ? entity : null, propertyHook: routineHooks.hook };
    const arithmetic = { precisionBits: 53 as const, rounding: 'nearest-even' as const, capturedNativeEnvironment: false as const };
    const instructionHost = { entityProcessingEnabled: () => true, script: death.body };
    const saved = actor.lifecycleCheckpoint;
    const scheduler = saved?.phase === 'scheduled' && saved.spu && saved.scheduler
      ? new NativeInstructionScheduler(new NativeScriptProcessingUnit(saved.spu, routineHost), saved.scheduler,
        this.frames, arithmetic, new NativeInstructionProxyRegistry([]), instructionHost)
      : NativeInstructionScheduler.fromOriginalFactory(routineHost, this.frames, arithmetic,
        new NativeInstructionProxyRegistry([]), instructionHost);
    death.bind(scheduler);
    speech.bind(scheduler.spu);
    const self = scheduler.spu.setSelfEntity(actor.personId); if (!self.supported) throw new Error(self.reason);
    binding = { actor, scheduler, death, speech, routine, npc, pendingXp: 0 };
    this.bindings.set(actor.personId, binding);
    this.checkpoint(binding, saved?.phase === 'scheduled' ? 'scheduled' : 'source-seeded');
    return binding;
  }

  private preflight(binding: Binding, operation: NativeNpcDeathOperation): NativeKnowledge<void> {
    const actor = binding.actor, live = this.live(actor);
    switch (operation.kind) {
      case 'set-hit-points': case 'last-fight-timestamp': case 'set-task': case 'set-task-time':
      case 'routine-property': case 'npc-property': case 'defeat-xp': case 'xp-effect': return known(undefined);
      case 'ragdoll-before-kill': return actor.species === 0 && live.npc.Voice !== ''
        ? known(undefined, 'source SVM manager initialized; actual null AudioModule speech allocation branch')
        : unknown('Non-humanoid speech/effect branches are unavailable.');
      case 'stop-effect': return live.effect.Effect === '' ? known(undefined, 'Game:20118670 same empty effect CString')
        : unknown('A nonempty native effect needs its live effect-system token.');
      case 'player-control-flag': return actor.personId !== HERO_SOURCE_ID ? known(undefined) : unknown('Player controls unavailable.');
      case 'kill-party-cleanup': {
        return live.party.PartyLeaderEntity === null && live.party.Members.length === 0 ? known(undefined,
          'Game:20317b20 owned Party member array; source version1 prefix1 count0')
          : unknown('Native party member relinking is unavailable.');
      }
      case 'combat-state-cleanup': return live.npc.CombatState !== 1 ? known(undefined, 'Script_Game:10010130 CombatState !=1')
        : unknown('The native replacement target and combat state branch is unavailable.');
      case 'quest-event': {
        if (operation.name !== 'OnNPCKilled') return unknown('OnNPCDefeated manager dispatch is not connected.');
        const result = this.quests.canRecordNpcKilled(actor.name);
        return result.known ? known(undefined) : unknown(result.reason);
      }
      case 'native-script':
        if (operation.name === 'ResetAll') return live.npc.StatusEffects === 0 && this.emptyHands(actor) &&
          !this.presentation.nativeVisualAnimationPresent(actor.personId) &&
          Object.values(this.presentation.nativeResetAllCapabilities(actor.personId)).every(present => present === false)
          ? known(undefined) : unknown('ResetAll status/held-item branches are not connected.');
        if (operation.name === 'ResetInteraction') return live.navigation.CurrentDestinationPointProxy === null
          ? known(undefined, 'Script_Game:10031fe0 absent interaction receiver') : unknown('Active interaction animation is unavailable.');
        if (operation.name === 'RemoveNonCombatItems' || operation.name === 'DropHandItems') return this.emptyHands(actor)
          ? known(undefined, 'Game empty hand StackList and SlotArray branches') : unknown('Native hand item transfer is unavailable.');
        return unknown('Native ' + operation.name + ' remains unconnected after the death task prefix.');
      default: return unknown('Native death service is unavailable: ' + operation.kind);
    }
  }

  private engine(binding: Binding, operation: NativeNpcDeathOperation, spu: NativeScriptProcessingUnit,
    access: NativeSPUSchedulerAccess): NativeKnowledge<number | void> {
    const actor = binding.actor, live = this.live(actor);
    switch (operation.kind) {
      case 'set-hit-points': actor.hitPoints = 0; access.record({ operation: 'NPC.SetHitPoints', entity: actor.personId, value: 0 }); break;
      case 'last-fight-timestamp': this.write(binding.npc, 'LastFightTimestamp', this.npcs.deathPlayingTimeSeconds(), access); break;
      case 'ragdoll-before-kill':
        this.globals.recordSvmTimestamp(this.npcs.deathPlayingTimeSeconds(), spu, access);
        {
          const output = binding.speech.startOutput(this.svm.sampleName(live.npc.Voice, 'DEAD'), spu, access);
          if (output.status !== 'known') return output;
          // SaySVM returns TRUE after its admitted category branch. The void
          // wrappers ignore StartOutput's FALSE playback result.
          return known(1, 'Script_Game:1000db70 admitted SaySVM category return; ' + output.source);
        }
      case 'npc-property':
        if (operation.property === 'AIMode') {
          this.write(binding.routine, 'AIMode', operation.value as number, access);
          if (operation.value === 9) this.presentation.defeated(actor.personId);
        } else if (operation.property === 'LastFightAgainstPlayer') this.write(binding.npc, operation.property, operation.value as number, access);
        else live.movement.CanBePushedWhileIdle = false;
        break;
      case 'routine-property': live.routine[operation.property] = operation.value; break;
      case 'native-script':
        if (operation.name === 'ResetAll') {
          live.routine.AmbientAction = 0;
          // Native SetAlignmentTarget(None) writes the owned movement proxy.
          // LookAt/AutoAim, CharacterControl and DCC use their separately
          // checked absent attached PS branches. CollisionShape is absent;
          // the selected state's physical-object pointer is null, so the
          // PhysicsStateBuffer setter performs no collision/dirty writes.
          live.movement.AlignmentTarget = null;
          this.presentation.applyResetAll(actor.personId, { lookAt: null, alignmentTarget: null,
            constraintsDegrees: 360, autoAim: false, dcc: true, collisionGroup: 4 });
        } else if (operation.name === 'ResetInteraction') {
          // Navigation is present. ResetInteract(None) returns early, then
          // SetGroundBias(None) still calls this nonnull movement PS setter.
          live.movement.GoalGroundOffset = Math.fround(Math.max(Math.min(0, live.movement.StepHeight),
            -live.movement.StepHeight));
          live.movement.GoalGroundEntity = null;
        }
        // The original fight table's first (0,0) row yields category2, so
        // RemoveNonCombatItems returns FALSE without HoldStacks. DropHandItems
        // executes checked HoldStacks(-1,-1), ignoring its right child's FALSE.
        return known(operation.name === 'RemoveNonCombatItems' ? 0 : 1);
      case 'stop-effect': case 'player-control-flag': case 'kill-party-cleanup': case 'combat-state-cleanup': break;
      default: return unknown('No concrete death engine operation: ' + operation.kind);
    }
    return known(undefined);
  }

  private xpEffect(binding: Binding, effect: NativeDefeatEffect, access: NativeSPUSchedulerAccess): NativeKnowledge<void> {
    if (effect.type === 'markDefeatedByPlayer') {
      this.write(binding.npc, 'DefeatedByPlayer', true, access); return known(undefined);
    }
    if (effect.type === 'nativeBoundary') {
      if (effect.operation === 'xpNotifications') this.presentation.notify('+' + binding.pendingXp + ' XP');
      else if (effect.operation === 'levelUpNotifications') this.presentation.notify('Level up');
      else return unknown('Unconnected native defeat notification: ' + effect.operation);
      return known(undefined, 'browser notification presentation for native XP/level-up events; native audio/VFX remain unported');
    }
    const result = this.quests.applyNpcDefeatProgressEffect(effect);
    return result.known ? known(undefined) : unknown(result.reason);
  }

  canScheduleFatalHit(actor: BrowserArdeaNpcCombatState): NativeKnowledge<void> {
    const reason = this.profile(actor); if (reason) return unknown(reason);
    if (actor.lifecycleCheckpoint && !['source-seeded'].includes(actor.lifecycleCheckpoint.phase)) {
      return unknown('The actor already has a retained death task or legacy zero-HP state.');
    }
    const canQuest = this.quests.canRecordNpcKilled(actor.name);
    return canQuest.known ? known(undefined) : unknown(canQuest.reason);
  }

  /** The hit changes attacker properties and HP; native task scheduling emits
   * no quest callback. The next browser application frame runs the state. */
  applyHit(actor: BrowserArdeaNpcCombatState, hit: Extract<BrowserFistHitResult, { status: 'resolved' }>): NativeKnowledge<void> {
    try {
      if (actor.hitPoints <= 0 || (actor.lifecycleCheckpoint && actor.lifecycleCheckpoint.phase !== 'source-seeded')) {
        return unknown('A scheduled, stopped or depleted NPC cannot accept another death hit.');
      }
      if (actor.hitPoints !== hit.hitPointsBefore) return unknown('The hit points changed before combat commit.');
      if (!Number.isInteger(hit.hitPointsAfter) || hit.hitPointsAfter < 0 || hit.hitPointsAfter > hit.hitPointsBefore ||
          hit.hitPointsAfter !== Math.max(0, hit.hitPointsBefore - hit.calculation.finalDamage)) {
        return unknown('The hit result differs from its retained source damage calculation.');
      }
      if (hit.hitPointsAfter === 0 && hit.zeroHitPointsDisposition.status === 'known' && hit.zeroHitPointsDisposition.value === 'kill') {
        const capability = this.canScheduleFatalHit(actor); if (capability.status !== 'known') return capability;
      }
      const binding = this.binding(actor), live = this.live(actor);
      this.write(binding.npc, 'LastAttackerEntity', live.npc.CurrentAttackerEntity);
      this.write(binding.npc, 'CurrentAttackerEntity', HERO_SOURCE_ID);
      actor.hitPoints = hit.hitPointsAfter;
      if (actor.hitPoints === 0 && hit.zeroHitPointsDisposition.status === 'known' && hit.zeroHitPointsDisposition.value === 'kill') {
        const stopped = binding.scheduler.spu.fullStop(); if (!stopped.supported) throw new Error(stopped.reason);
        const scheduled = binding.scheduler.spu.setTaskFromScriptRoutine('ZS_RagDollDead');
        if (!scheduled.supported) throw new Error(scheduled.reason);
        this.checkpoint(binding, 'scheduled');
      } else this.checkpoint(binding, 'source-seeded');
      return known(undefined);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }

  private checkpoint(binding: Binding, phase: 'source-seeded' | 'scheduled' | 'completed' | 'blocked', reason: string | null = null): void {
    binding.actor.lifecycleCheckpoint = { schema: CHECKPOINT, phase, spu: binding.scheduler.spu.snapshot(),
      scheduler: binding.scheduler.spu.schedulerSnapshot(), speechOutput: binding.speech.snapshot(), blockedReason: reason };
    this.npcs.setDeathGlobals(this.globals.snapshot());
  }

  processFrame(seconds: number): void {
    this.npcs.setDeathPlayingTimeSeconds(Math.fround(this.npcs.deathPlayingTimeSeconds() + Math.fround(seconds)));
    this.frames.newFrame(this.timestamp = (this.timestamp + 1) >>> 0);
    for (const binding of this.bindings.values()) {
      if (binding.actor.lifecycleCheckpoint?.phase !== 'scheduled') continue;
      const result = binding.scheduler.process({ processingEnabled: true, scaledSeconds: Math.fround(seconds) });
      if (!result.supported) {
        this.checkpoint(binding, 'blocked', result.reason);
        this.presentation.notify(binding.actor.name + ': death task stopped after its applied native prefix. ' + result.reason + ' Press P to save.');
      } else this.checkpoint(binding, 'completed');
    }
  }

  /** Reattach only tasks that were scheduled but had not executed when saved.
   * Completed/blocked/legacy zero-HP owners are inert and never replay events. */
  restoreScheduled(): void {
    for (const saved of this.npcs.saveData().actors) {
      const actor = this.npcs.get(saved.personId);
      if (actor?.lifecycleCheckpoint?.phase === 'scheduled') this.binding(actor);
    }
  }
}
