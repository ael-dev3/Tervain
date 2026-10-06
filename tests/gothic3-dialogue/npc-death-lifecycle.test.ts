import { describe, expect, it } from 'vitest';
import { NativeNpcDeathGlobals, NativeNpcDeathLifecycle, planNativeNpcDeathTask } from '../../src/gothic3/npc-death-lifecycle';
import type { NativeNpcDeathHost, NativeNpcDeathOperation } from '../../src/gothic3/npc-death-lifecycle';
import type { NativeActorCombatState, NativeKnowledge } from '../../src/gothic3/combat';
import { NativeInstructionProxyRegistry, NativeInstructionScheduler, NativeSPUFrameSchedule } from '../../src/gothic3/script-instructions';
import type { NativeRoutineEntity, NativeRoutineProperties } from '../../src/gothic3/script-routine';

const known = <T>(value: T): NativeKnowledge<T> => ({ status: 'known', value, source: 'test:explicit-native-host' });
type MutableCombat = { -readonly [K in keyof NativeActorCombatState]: NativeActorCombatState[K] };
function actor(id: string, isPlayer = false): MutableCombat {
  return { id, name: id, isPlayer, species: 0, npcType: 0, rawLevel: 1, rawLevelMax: 30,
    hasPlayerMemory: isPlayer, transformed: false, navigationValid: true, damageReceiverValid: true,
    initialization: 'initialized', hitPoints: 100, hitPointsMax: 100, stamina: 100, staminaMax: 100,
    action: 24, aniState: 2, primaryPose: 0, statePosition: 0, hands: { leftUseType: 0, rightUseType: 0 },
    currentAttackerId: known('hero'), armorIsRobe: known(false), skills: {}, enclavePresent: known(true) };
}
function operationKey(op: NativeNpcDeathOperation): string {
  if (op.kind === 'native-script') return op.kind + ':' + op.name;
  if (op.kind === 'npc-property' || op.kind === 'routine-property') return op.kind + ':' + op.property;
  if (op.kind === 'xp-effect') return op.kind + ':' + op.effect.type;
  return op.kind;
}
function fixture(globals = NativeNpcDeathGlobals.fromOriginalLoader()) {
  const victim = actor('bandit'), hero = actor('hero', true), calls: string[] = [];
  const player = { xp: 1000, level: 10, lp: 0, learnPerkActive: known(false) };
  let aiMode = 0, defeatedByPlayer = false, processingEnabled = true, moveReturn = 1, questXp = 0;
  const missing = new Set<string>();
  const properties: NativeRoutineProperties = { Routine: '', CurrentTask: '', LastTask: '', TaskPosition: 0,
    TaskTime: 0, StatePosition: 0, StateTime: 0, CurrentState: '', CurrentBreakBlock: 0 };
  const entity: NativeRoutineEntity = { id: 'bandit', properties, npcPresent: true };
  const host: NativeNpcDeathHost = {
    actor: id => known(id === victim.id ? { combat: victim, aiMode: known(aiMode) }
      : id === hero.id ? { combat: hero, aiMode: known(0) } : null),
    playerId: () => known(hero.id),
    preflight: op => missing.has(operationKey(op))
      ? { status: 'unknown', reason: 'Missing ' + operationKey(op) } : known(undefined),
    engine: (op, spu) => {
      calls.push(operationKey(op));
      if (op.kind === 'npc-property' && op.property === 'AIMode') aiMode = Number(op.value);
      if (op.kind === 'set-hit-points') victim.hitPoints = op.value;
      if (op.kind === 'combat-move' && moveReturn === 0) {
        const result = spu.setActiveInstruction('2001fe51'); if (!result.supported) throw new Error(result.reason);
      }
      return known(op.kind === 'combat-move' ? moveReturn : op.kind === 'ai-die' ? 1 : undefined);
    },
    questEvent: name => { calls.push(name); player.xp += questXp; return known(undefined); },
    defeatXpContext: () => {
      calls.push('read-live-xp:' + player.xp);
      return known({ credit: { playerId: hero.id, creditedActorId: hero.id,
        creditedPartyLeaderId: known(null), playerPartyLeaderId: known(null),
        victimDefeatedByPlayer: known(defeatedByPlayer), victimPartyMemberType: known(0) },
        player: { ...player } });
    },
    xpEffect: effect => {
      calls.push('xp-effect:' + effect.type);
      if (effect.type === 'setPlayerXp') player.xp = effect.value;
      if (effect.type === 'setPlayerLevel') player.level = effect.value;
      if (effect.type === 'setPlayerLp') player.lp = effect.value;
      if (effect.type === 'markDefeatedByPlayer') defeatedByPlayer = true;
      return known(undefined);
    },
  };
  const lifecycle = new NativeNpcDeathLifecycle(host, globals);
  const scheduler = NativeInstructionScheduler.fromOriginalFactory({
    resolveSelf: id => id === entity.id ? entity : null,
    propertyHook: () => {},
  }, NativeSPUFrameSchedule.fromOriginalLoader(), { precisionBits: 53, rounding: 'nearest-even', capturedNativeEnvironment: false },
  new NativeInstructionProxyRegistry([]), { entityProcessingEnabled: () => processingEnabled, script: lifecycle.body });
  lifecycle.bind(scheduler);
  expect(scheduler.spu.setSelfEntity(entity.id).supported).toBe(true);
  const process = () => scheduler.process({ processingEnabled: true, scaledSeconds: Math.fround(.016) });
  return { victim, hero, host, lifecycle, scheduler, properties, player, calls, missing, process,
    aiMode: () => aiMode, setAiMode: (value: number) => { aiMode = value; }, defeated: () => defeatedByPlayer,
    setProcessing: (value: boolean) => { processingEnabled = value; }, setMoveReturn: (value: number) => { moveReturn = value; },
    setQuestXp: (value: number) => { questXp = value; } };
}

describe('scheduled native NPC death lifecycle', () => {
  it('schedules the real SPU state without synchronously dispatching a quest event', () => {
    const f = fixture();
    expect(f.lifecycle.schedule('ZS_RagDollDead')).toMatchObject({ supported: true, nativeReturnValue: null });
    expect(f.properties.CurrentTask).toBe('ZS_RagDollDead');
    expect(f.scheduler.spu.snapshot().frames[0]?.script).toBe('ZS_RagDollDead');
    expect(f.calls).toEqual([]);
    f.setProcessing(false);
    expect(f.process().supported).toBe(true);
    expect(f.calls).toEqual([]);
    f.setProcessing(true);
    expect(f.process().supported).toBe(true);
    expect(f.calls).toContain('OnNPCKilled');
    expect(f.aiMode()).toBe(9);
    expect(f.properties.CurrentState).toBe('ZS_RagDollDead_Loop');
  });

  it('uses CurrentAttacker as task Self and preserves quest XP before default NPC XP', () => {
    const f = fixture(); f.setQuestXp(750);
    f.lifecycle.schedule('ZS_RagDollDead');
    expect(f.process().supported).toBe(true);
    expect(f.player.xp).toBe(1800); // 1000 + manager750 + NPC50, not world GiveXP×5.
    expect(f.calls.indexOf('OnNPCKilled')).toBeLessThan(f.calls.indexOf('read-live-xp:1750'));
    expect(f.calls.indexOf('read-live-xp:1750')).toBeLessThan(f.calls.indexOf('xp-effect:setPlayerXp'));
    expect(f.calls.indexOf('xp-effect:markDefeatedByPlayer')).toBeLessThan(f.calls.indexOf('native-script:NotifyEnclave'));
    const xp = f.lifecycle.executionSnapshot()?.applied.find(op => op.kind === 'defeat-xp');
    expect(xp).toMatchObject({ attackerId: 'hero', victimId: 'bandit' });
  });

  it('retains event and XP before an unresolved enclave callback and prevents replay', () => {
    const f = fixture(); f.missing.add('native-script:NotifyEnclave');
    f.lifecycle.schedule('ZS_RagDollDead');
    expect(f.process()).toMatchObject({ supported: false, partial: true });
    expect(f.aiMode()).toBe(9);
    expect(f.player.xp).toBe(1050);
    expect(f.defeated()).toBe(true);
    const receipt = f.lifecycle.executionSnapshot();
    expect(receipt).toMatchObject({ outcome: 'partial', required: { kind: 'native-script', name: 'NotifyEnclave' } });
    expect(receipt?.applied.some(op => op.kind === 'quest-event')).toBe(true);
    expect(receipt?.attempted.at(-1)).toMatchObject({ name: 'NotifyEnclave' });
    expect(f.calls).not.toContain('native-script:NotifyEnclave');
    expect(f.calls).not.toContain('ragdoll-after-kill');
    const count = f.calls.length;
    expect(f.process().supported).toBe(false);
    expect(f.lifecycle.runTask('kill', 'hero', 'bandit').outcome).toBe('blocked');
    expect(f.calls).toHaveLength(count);
  });

  it('exposes complete preflight without converting later missing capabilities into early native rollback', () => {
    const f = fixture(); f.missing.add('native-script:NotifyEnclave');
    expect(f.lifecycle.preflightTask('kill', 'hero', 'bandit')).toMatchObject({
      supported: false, required: { kind: 'native-script', name: 'NotifyEnclave' } });
    expect(f.calls).toEqual([]);
    expect(f.lifecycle.runTask('kill', 'hero', 'bandit').outcome).toBe('partial');
    expect(f.calls).toContain('OnNPCKilled');
  });

  it('routes ragdoll with AIMode8 to a scheduled ZS_Dead without an immediate Kill', () => {
    const f = fixture(); f.setAiMode(8);
    f.lifecycle.schedule('ZS_RagDollDead');
    expect(f.process().supported).toBe(true);
    expect(f.properties.CurrentTask).toBe('ZS_Dead');
    expect(f.properties.CurrentState).toBe('ZS_Dead');
    expect(f.calls).toEqual(['set-hit-points']);
    expect(f.player.xp).toBe(1000);
    expect(f.process().supported).toBe(true);
    expect(f.calls.filter(name => name === 'OnNPCKilled')).toHaveLength(1);
  });

  it('ZS_Dead AIMode9 changes pose/state without repeating Kill or quest dispatch', () => {
    const f = fixture(); f.setAiMode(9);
    f.lifecycle.schedule('ZS_Dead');
    expect(f.process().supported).toBe(true);
    expect(f.calls).toEqual(['force-next-pose', 'animation-direction', 'routine-property:AniState']);
    expect(f.properties.CurrentState).toBe('ZS_Dead_Loop');
    expect(f.player.xp).toBe(1000);
    expect(f.lifecycle.preflightState('ZS_Dead', 'bandit').supported).toBe(true);
  });

  it('does not invent an AIMode9 guard in ZS_RagDollDead', () => {
    const f = fixture(); f.setAiMode(9);
    f.lifecycle.schedule('ZS_RagDollDead');
    expect(f.process().supported).toBe(true);
    expect(f.calls).toContain('OnNPCKilled');
  });

  it('stops at unresolved hand cleanup before mode, quest event, or reward mutations', () => {
    const f = fixture(); f.missing.add('native-script:DropHandItems');
    f.lifecycle.schedule('ZS_RagDollDead');
    expect(f.process().supported).toBe(false);
    expect(f.lifecycle.executionSnapshot()).toMatchObject({ outcome: 'partial',
      required: { kind: 'native-script', name: 'DropHandItems' } });
    expect(f.aiMode()).toBe(0);
    expect(f.calls).not.toContain('OnNPCKilled');
    expect(f.player.xp).toBe(1000);
  });

  it('keeps the None attacker boundary explicit instead of substituting the player', () => {
    const f = fixture(); f.victim.currentAttackerId = known(null);
    f.lifecycle.schedule('ZS_RagDollDead');
    expect(f.process().supported).toBe(false);
    expect(f.lifecycle.executionSnapshot()?.reason).toContain('None CurrentAttacker');
    expect(f.calls).not.toContain('OnNPCKilled');
  });

  it('unconscious task emits defeat before XP and resumes after an actual pending combat instruction', () => {
    const f = fixture(); f.setMoveReturn(0);
    f.lifecycle.schedule('ZS_Unconscious');
    expect(f.process().supported).toBe(true);
    expect(f.calls.filter(name => name === 'OnNPCDefeated')).toHaveLength(1);
    expect(f.calls.indexOf('OnNPCDefeated')).toBeLessThan(f.calls.indexOf('read-live-xp:1000'));
    expect(f.aiMode()).toBe(8);
    expect(f.scheduler.spu.snapshot().frames[0]?.position).toBe(1);
    expect(f.scheduler.spu.snapshot().activeInstruction).toBe('2001fe51');
    expect(f.scheduler.spu.setActiveInstruction(null).supported).toBe(true);
    f.setMoveReturn(1);
    expect(f.process().supported).toBe(false); // scheduler immediately attempts unresolved new loop on resumed frame.
    expect(f.calls.filter(name => name === 'OnNPCDefeated')).toHaveLength(1);
    expect(f.properties.CurrentState).toBe('ZS_Unconscious_Loop');
    expect(f.lifecycle.executionSnapshot()?.applied.some(op => op.kind === 'set-task-time')).toBe(true);
  });

  it('shares lazy native label globals across SPUs and only resolves examined state registrations', () => {
    const globals = NativeNpcDeathGlobals.fromOriginalLoader(), first = fixture(globals), second = fixture(globals);
    first.setAiMode(9); second.setAiMode(9);
    first.lifecycle.schedule('ZS_Dead'); second.lifecycle.schedule('ZS_Dead');
    expect(first.process().supported).toBe(true); expect(second.process().supported).toBe(true);
    expect(globals.snapshot()['10221410']).toBe(1);
    expect(first.lifecycle.body('function', 'ZS_Dead')).toBeNull();
    expect(first.lifecycle.body('state', 'ZS_Dead_Loop')).toBeNull();
    expect(first.lifecycle.body('state', 'ZS_Dead')?.source.entry).toBe('100292e0');
  });

  it('retains native module labels and DEAD SVM timestamp across a saved module-global snapshot', () => {
    const globals = NativeNpcDeathGlobals.fromOriginalLoader(), f = fixture(globals);
    expect(globals.svmTimestamp()).toBe(0);
    f.scheduler.spu.dispatchScheduler(access => { globals.recordSvmTimestamp(.125, f.scheduler.spu, access); return null; });
    f.setAiMode(9); f.lifecycle.schedule('ZS_Dead'); f.process();
    const restored = new NativeNpcDeathGlobals(globals.snapshot());
    expect(restored.snapshot()).toEqual(globals.snapshot());
    expect(restored.svmTimestamp()).toBe(.125);
    const next = fixture(restored); next.setAiMode(9); next.lifecycle.schedule('ZS_Dead'); next.process();
    expect(restored.snapshot()['10221410']).toBe(1);
  });

  it('preserves special Talchef ordering and rejects player game-over as unsupported input', () => {
    const victim = actor('bandit'); victim.name = 'Talchef';
    const plan = planNativeNpcDeathTask('kill', 'hero', victim, 'hero');
    const kinds = plan.operations.map(operationKey);
    expect(kinds.indexOf('quest-event')).toBeLessThan(kinds.indexOf('talchef-routines'));
    expect(kinds.indexOf('talchef-routines')).toBeLessThan(kinds.indexOf('defeat-xp'));
    expect(() => planNativeNpcDeathTask('kill', 'hero', actor('hero', true), 'hero')).toThrow('Player death');
  });
});
