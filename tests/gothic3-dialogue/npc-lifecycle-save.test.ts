import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NativeGameplayResources, NativeWorldData } from '../../src/gothic3/native-data';
import { BrowserArdeaNpcCombatRuntime } from '../../src/gothic3/npc-combat-runtime';
import type { BrowserArdeaNpcCombatState, BrowserNpcLifecycleCheckpoint } from '../../src/gothic3/npc-combat-runtime';
import { NativeNpcDeathGlobals, NativeNpcDeathLifecycle } from '../../src/gothic3/npc-death-lifecycle';
import type { NativeNpcDeathHost } from '../../src/gothic3/npc-death-lifecycle';
import { NativeInstructionProxyRegistry, NativeInstructionScheduler, NativeSPUFrameSchedule } from '../../src/gothic3/script-instructions';
import type { NativeActorCombatState, NativeKnowledge } from '../../src/gothic3/combat';
import { NativeSpeechAllocation, NativeSpeechOutput } from '../../src/gothic3/native-speech-output';
import type { ScenePerson } from '../../src/gothic3/types';

const ROOT = resolve(process.cwd(), 'public/gothic3');
const BASE = '/Tervain/gothic3/';
const HERO = '054d6e4a5f059340bc5c2ca0cca6674500000000';
const BANDIT = '0c3ad5c499a37e479901ef8b1a19877900000000';
const known = <T>(value: T): NativeKnowledge<T> => ({ status: 'known', value, source: 'test:explicit-live-lifecycle-host' });
async function localAsset(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
  const index = url.pathname.indexOf(BASE);
  if (index < 0) return new Response('', { status: 404 });
  const path = resolve(ROOT, decodeURIComponent(url.pathname.slice(index + BASE.length)));
  if (!path.startsWith(ROOT + sep)) return new Response('', { status: 400 });
  try { return new Response(await readFile(path)); } catch { return new Response('', { status: 404 }); }
}
async function sourceRuntime(world = new NativeWorldData(new NativeGameplayResources())) {
  const people = JSON.parse(await readFile(resolve(ROOT, 'scene.json'), 'utf8')).people as ScenePerson[];
  return new BrowserArdeaNpcCombatRuntime(people, world, 0x12345678);
}

/** Real source actor, real task wrapper, real scheduler and native ordered Kill
 * port. Engine capabilities are explicit test hosts; this is a save regression,
 * not evidence that the browser implements their physical native operations. */
function deathBinding(actor: BrowserArdeaNpcCombatState) {
  const live = actor.liveState!;
  const globals = NativeNpcDeathGlobals.fromOriginalLoader();
  let questCalls = 0, xp = 0, defeated = false;
  const speech = NativeSpeechOutput.fromOriginalFactory({
    allocate: (kind, bytes) => known(new NativeSpeechAllocation(actor.personId + ':death-speech-' + kind, bytes)),
    audioModule: () => known(null),
  });
  const combat = (): NativeActorCombatState => ({ id: actor.personId, name: actor.name, isPlayer: false,
    species: actor.species, npcType: actor.npcType, rawLevel: actor.rawLevel, rawLevelMax: actor.rawLevelMax,
    hasPlayerMemory: false, transformed: false, navigationValid: true, damageReceiverValid: true,
    initialization: 'initialized', hitPoints: actor.hitPoints, hitPointsMax: actor.processingRange.hitPointsMax,
    stamina: actor.stamina, staminaMax: actor.processingRange.staminaMax, action: live.routine.Action,
    aniState: live.routine.AniState, primaryPose: 0, statePosition: live.routine.StatePosition,
    hands: { leftUseType: 0, rightUseType: 0 }, currentAttackerId: known(live.npc.CurrentAttackerEntity),
    armorIsRobe: actor.armorIsRobe, skills: {}, enclavePresent: known(true) });
  const host: NativeNpcDeathHost = {
    actor: id => known(id === actor.personId ? { combat: combat(), aiMode: known(live.routine.AIMode) }
      : id === HERO ? { combat: { ...combat(), id: HERO, name: 'PC_Hero', isPlayer: true, hasPlayerMemory: true }, aiMode: known(0) } : null),
    playerId: () => known(HERO),
    preflight: op => op.kind === 'native-script' && op.name === 'NotifyEnclave'
      ? { status: 'unknown', reason: 'Native NotifyEnclave unavailable after rewards' } : known(undefined),
    engine: (op, spu, access) => {
      if (op.kind === 'ragdoll-before-kill') {
        const result = speech.startOutput('Hum_Warrior_Hard_DEAD01', spu, access);
        if (result.status === 'unknown') return result;
      }
      if (op.kind === 'set-hit-points') actor.hitPoints = 0;
      if (op.kind === 'last-fight-timestamp') live.npc.LastFightTimestamp = 12;
      if (op.kind === 'npc-property' && op.property === 'AIMode') live.routine.AIMode = Number(op.value);
      if (op.kind === 'npc-property' && op.property === 'CanBePushedWhileIdle') live.movement.CanBePushedWhileIdle = false;
      return known(undefined);
    },
    questEvent: () => { questCalls++; return known(undefined); },
    defeatXpContext: () => known({ credit: { playerId: HERO, creditedActorId: HERO,
      creditedPartyLeaderId: known(null), playerPartyLeaderId: known(null),
      victimDefeatedByPlayer: known(defeated), victimPartyMemberType: known(0) },
      player: { xp, level: 0, lp: 0, learnPerkActive: known(false) } }),
    xpEffect: effect => {
      if (effect.type === 'setPlayerXp') xp = effect.value;
      if (effect.type === 'markDefeatedByPlayer') { defeated = true; live.npc.DefeatedByPlayer = true; }
      return known(undefined);
    },
  };
  const death = new NativeNpcDeathLifecycle(host, globals);
  const entity = { id: actor.personId, properties: live.routine, npcPresent: true };
  const scheduler = NativeInstructionScheduler.fromOriginalFactory({ resolveSelf: id => id === actor.personId ? entity : null,
    propertyHook: () => {} }, NativeSPUFrameSchedule.fromOriginalLoader(),
  { precisionBits: 53, rounding: 'nearest-even', capturedNativeEnvironment: false },
  new NativeInstructionProxyRegistry([]), { entityProcessingEnabled: () => true, script: death.body });
  death.bind(scheduler);
  speech.bind(scheduler.spu);
  expect(scheduler.spu.setSelfEntity(actor.personId).supported).toBe(true);
  const checkpoint = (phase: BrowserNpcLifecycleCheckpoint['phase'], reason: string | null = null) => {
    actor.lifecycleCheckpoint = { schema: 'gothic3-browser-npc-lifecycle-checkpoint-v1', phase,
      spu: scheduler.spu.snapshot(), scheduler: scheduler.spu.schedulerSnapshot(), speechOutput: speech.snapshot(), blockedReason: reason };
  };
  return { death, scheduler, globals, checkpoint, questCalls: () => questCalls, xp: () => xp };
}

describe('source-backed NPC lifecycle state and save v3', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', localAsset);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps exact source bandit lifecycle scalars immutable and separates generated inventory/live writes', async () => {
    const runtime = await sourceRuntime(), actor = await runtime.initializeOnContact(BANDIT, 0, 1);
    expect(actor.sourceSha256).toBe('28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938');
    expect(actor.lifecycleSource).toEqual({ status: 'source-resolved', seed: {
      routine: { Routine: '', CurrentTask: '', LastTask: '', TaskPosition: 0, TaskTime: 0, StatePosition: 0,
        StateTime: 0, CurrentState: '', CurrentBreakBlock: 0, CommandTime: 0, AIMode: 0, AmbientAction: 0, Action: 24, AniState: 2 },
      npc: { CurrentAttackerEntity: null, LastAttackerEntity: null, CurrentTargetEntity: null, AlternativeTargetEntity: null,
        CombatState: 0, DefeatedByPlayer: false, LastFightAgainstPlayer: 0, LastFightTimestamp: 0, StatusEffects: 0, Voice: 'Hum_Warrior_Hard' },
      party: { PartyLeaderEntity: null, PartyMemberType: 0, Members: [] }, navigation: { CurrentDestinationPointProxy: null },
      inventory: { GeneratedPlunder: false, GeneratedTrade: false }, effect: { Effect: '', Static: false },
      movement: { CanBePushedWhileIdle: false, StepHeight: 65, AlignmentTarget: null, GoalGroundEntity: null, GoalGroundOffset: 0 },
      enclaveGuid20: '145ead7514ee364bab2e0402c3f7481c00000000',
    } });
    actor.liveState!.npc.CurrentAttackerEntity = HERO;
    expect(actor.liveState!.inventory.GeneratedPlunder).toBe(true);
    if (actor.lifecycleSource.status !== 'source-resolved') throw new Error('Missing source seed');
    expect(actor.lifecycleSource.seed.inventory.GeneratedPlunder).toBe(false);
    expect(actor.lifecycleSource.seed.npc.CurrentAttackerEntity).toBeNull();
    expect(Object.isFrozen(actor.lifecycleSource.seed.npc)).toBe(true);
    expect(Object.isFrozen(actor.lifecycleSource.seed.party.Members)).toBe(true);
    const restored = await sourceRuntime();
    expect(await restored.restore(runtime.saveData(), 0, 1)).toEqual({ restored: 1, skipped: [] });
    expect(restored.get(BANDIT)!.liveState).toEqual(actor.liveState);
  });

  it('preserves actual scheduled and blocked native prefixes, module label globals and playing time', async () => {
    const runtime = await sourceRuntime(), actor = await runtime.initializeOnContact(BANDIT, 0, 1);
    actor.hitPoints = 0;
    actor.liveState!.npc.CurrentAttackerEntity = HERO;
    const binding = deathBinding(actor);
    expect(binding.death.schedule('ZS_RagDollDead').supported).toBe(true);
    binding.checkpoint('scheduled');
    runtime.setDeathGlobals(binding.globals.snapshot());
    runtime.setDeathPlayingTimeSeconds(Math.fround(12.125));
    const scheduledSave = runtime.saveData();
    const restoredScheduled = await sourceRuntime();
    expect(await restoredScheduled.restore(scheduledSave, 0, 1)).toEqual({ restored: 1, skipped: [] });
    expect(restoredScheduled.get(BANDIT)!.lifecycleCheckpoint).toEqual(actor.lifecycleCheckpoint);
    expect(binding.questCalls()).toBe(0);

    const result = binding.scheduler.process({ processingEnabled: true, scaledSeconds: Math.fround(.016) });
    expect(result).toMatchObject({ supported: false, partial: true });
    expect(!result.supported && result.reason).toContain('Native NotifyEnclave unavailable after rewards');
    expect(binding.questCalls()).toBe(1);
    expect(binding.xp()).toBeGreaterThan(0);
    binding.checkpoint('blocked', !result.supported ? result.reason : null);
    const globals = { ...binding.globals.snapshot(), '10220e8c': Math.fround(11.75) };
    runtime.setDeathGlobals(globals);
    const save = runtime.saveData();
    expect(save.actors[0]!.lifecycleCheckpoint!.spu!.frames[0]!.position).toBe(1);
    expect(save.actors[0]!.liveState!.routine.StatePosition).toBe(0);
    expect(save.actors[0]!.liveState!.npc).toMatchObject({ DefeatedByPlayer: true, LastFightTimestamp: 12 });
    expect(save.actors[0]!.lifecycleCheckpoint!.speechOutput).toMatchObject({
      channel: { id: BANDIT + ':death-speech-channel', bytes: 20, words: [0x2067b6cc, 0, 1, 0, 0] },
      sound: { id: BANDIT + ':death-speech-sound', bytes: 16, words: [0x2067b744, 0, 1, 0] },
    });
    const restored = await sourceRuntime();
    expect(await restored.restore(save, 0, 1)).toEqual({ restored: 1, skipped: [] });
    expect(restored.saveData()).toEqual(save);
    expect(restored.deathGlobals()).toEqual(globals);
    expect(restored.deathPlayingTimeSeconds()).toBe(Math.fround(12.125));
    const again = await sourceRuntime();
    expect(await again.restore(restored.saveData(), 0, 1)).toEqual({ restored: 1, skipped: [] });
    expect(again.get(BANDIT)!.lifecycleCheckpoint!.phase).toBe('blocked');
    expect(binding.questCalls()).toBe(1); // Restore neither schedules nor executes Kill.
    const speech = NativeSpeechOutput.fromCheckpoint({
      allocate: () => { throw new Error('Retained objects must not allocate again'); }, audioModule: () => known(null),
    }, again.get(BANDIT)!.lifecycleCheckpoint!.speechOutput!);
    expect(speech.snapshot()).toEqual(save.actors[0]!.lifecycleCheckpoint!.speechOutput);
  });

  it.each(['gothic3-browser-npc-combat-session-v1', 'gothic3-browser-npc-combat-session-v2'])
  ('migrates %s positive HP from source but marks zero HP completion unknown', async (schema) => {
    const runtime = await sourceRuntime(), actor = await runtime.initializeOnContact(BANDIT, 0, 1);
    const save = runtime.saveData();
    const { liveState: _live, lifecycleCheckpoint: _checkpoint, ...oldActor } = save.actors[0]!;
    const oldSave = { schema, plunderRandom: save.plunderRandom, actors: [oldActor] };
    const positive = await sourceRuntime();
    expect(await positive.restore(oldSave, 0, 1)).toEqual({ restored: 1, skipped: [] });
    expect(positive.get(BANDIT)!.liveState).toEqual(actor.liveState);
    expect(positive.get(BANDIT)!.lifecycleCheckpoint).toMatchObject({ phase: 'source-seeded', spu: null, scheduler: null });
    const zero = await sourceRuntime();
    expect(await zero.restore({ ...oldSave, actors: [{ ...oldActor, hitPoints: 0 }] }, 0, 1)).toEqual({ restored: 1, skipped: [] });
    expect(zero.get(BANDIT)!.lifecycleCheckpoint).toEqual({ schema: 'gothic3-browser-npc-lifecycle-checkpoint-v1',
      phase: 'legacy-zero-hp-unknown', spu: null, scheduler: null, speechOutput: null, blockedReason: null });
    const repeat = await sourceRuntime();
    expect(await repeat.restore(zero.saveData(), 0, 1)).toEqual({ restored: 1, skipped: [] });
    expect(repeat.get(BANDIT)!.lifecycleCheckpoint!.phase).toBe('legacy-zero-hp-unknown');
  });

  it('keeps existing NPC/inventory support when a needed lifecycle property is missing', async () => {
    const world = new NativeWorldData(new NativeGameplayResources()), original = world.entity.bind(world);
    vi.spyOn(world, 'entity').mockImplementation(async (row) => {
      const result = await original(row);
      if (result.kind !== 'found') return result;
      return { kind: 'found', value: { ...result.value,
        propertySets: result.value.propertySets.filter((set) => set.name !== 'gCEffect_PS') } };
    });
    const runtime = await sourceRuntime(world), actor = await runtime.initializeOnContact(BANDIT, 0, 1);
    expect(actor.lifecycleSource.status).toBe('unknown');
    expect(actor.liveState).toBeNull();
    expect(actor.lifecycleCheckpoint).toBeNull();
    expect(actor.hitPoints).toBeGreaterThan(0);
    expect(actor.inventory.snapshot().stacks.length).toBeGreaterThan(0);
    const restored = await sourceRuntime(world);
    expect(await restored.restore(runtime.saveData(), 0, 1)).toEqual({ restored: 1, skipped: [] });
    actor.hitPoints = 0;
    const zeroSave = runtime.saveData();
    expect(zeroSave.actors[0]!.liveState).toBeNull();
    expect(zeroSave.actors[0]!.lifecycleCheckpoint).toMatchObject({ phase: 'zero-hp-unknown', spu: null, scheduler: null, speechOutput: null });
    const zeroRestored = await sourceRuntime(world);
    expect(await zeroRestored.restore(zeroSave, 0, 1)).toEqual({ restored: 1, skipped: [] });
    expect(zeroRestored.saveData()).toEqual(zeroSave);
  });

  it('replaces an already loaded session inventory/actors and isolates save snapshots from later writes', async () => {
    const runtime = await sourceRuntime(), actor = await runtime.initializeOnContact(BANDIT, 0, 1);
    const save = runtime.saveData(), stack = actor.inventory.snapshot().stacks[0]!;
    expect(actor.inventory.createItems(stack.templateGuid20, stack.quality, 3).status).toBe('applied');
    actor.liveState!.npc.CurrentAttackerEntity = HERO;
    expect(save.actors[0]!.liveState!.npc.CurrentAttackerEntity).toBeNull();
    await runtime.initializeOnContact('ef1adbed209ec647b20ebc9fc989642500000000', 0, 1);
    expect(await runtime.restore(save, 0, 1)).toEqual({ restored: 1, skipped: [] });
    expect(runtime.get(BANDIT)!.inventory.snapshot()).toEqual(save.actors[0]!.inventory);
    expect(runtime.saveData()).toEqual(save);
    expect(runtime.get('ef1adbed209ec647b20ebc9fc989642500000000')).toBeNull();
  });

  it('saves an unscheduled current zero-HP actor with explicit unknown completion rather than inferring Kill', async () => {
    const runtime = await sourceRuntime(), actor = await runtime.initializeOnContact(BANDIT, 0, 1);
    actor.hitPoints = 0;
    const save = runtime.saveData();
    expect(save.actors[0]!.lifecycleCheckpoint).toEqual({ schema: 'gothic3-browser-npc-lifecycle-checkpoint-v1',
      phase: 'zero-hp-unknown', spu: null, scheduler: null, speechOutput: null, blockedReason: null });
    const restored = await sourceRuntime();
    expect(await restored.restore(save, 0, 1)).toEqual({ restored: 1, skipped: [] });
    expect(restored.get(BANDIT)!.liveState!.npc.DefeatedByPlayer).toBe(false);
    expect(restored.saveData()).toEqual(save);
  });

  it.each([
    ['enclave identity', (a: BrowserArdeaNpcCombatState) => { a.liveState!.enclaveGuid20 = '0'.repeat(40); }],
    ['attacker injection', (a: BrowserArdeaNpcCombatState) => { a.liveState!.npc.CurrentAttackerEntity = BANDIT; }],
    ['last attacker injection', (a: BrowserArdeaNpcCombatState) => { a.liveState!.npc.LastAttackerEntity = BANDIT; }],
    ['party identity', (a: BrowserArdeaNpcCombatState) => { a.liveState!.party.PartyLeaderEntity = HERO; }],
    ['owned party membership', (a: BrowserArdeaNpcCombatState) => { a.liveState!.party.Members.push(HERO); }],
    ['movement ground owner', (a: BrowserArdeaNpcCombatState) => { a.liveState!.movement.GoalGroundEntity = HERO; }],
    ['movement ground offset', (a: BrowserArdeaNpcCombatState) => { a.liveState!.movement.GoalGroundOffset = 65; }],
    ['unknown task name', (a: BrowserArdeaNpcCombatState) => { a.liveState!.routine.CurrentTask = 'ZS_Unknown'; }],
    ['unported status effect', (a: BrowserArdeaNpcCombatState) => { a.liveState!.npc.StatusEffects = 4; }],
    ['unported effect', (a: BrowserArdeaNpcCombatState) => { a.liveState!.effect.Effect = 'ICE'; }],
    ['source voice identity', (a: BrowserArdeaNpcCombatState) => { a.liveState!.npc.Voice = 'Hum_Bandit'; }],
    ['native instruction pointer', (a: BrowserArdeaNpcCombatState) => { a.lifecycleCheckpoint!.spu!.activeInstruction = '2001fe51'; }],
    ['native frame object', (a: BrowserArdeaNpcCombatState) => { a.lifecycleCheckpoint!.spu!.frames[0]!.object = 'injected-pointer'; }],
    ['scheduler entity pointer', (a: BrowserArdeaNpcCombatState) => { a.lifecycleCheckpoint!.scheduler!.instructionEntity = 'deadbeef'; }],
    ['native audio channel', (a: BrowserArdeaNpcCombatState) => { a.lifecycleCheckpoint!.scheduler!.audioChannel = 'injected-pointer'; }],
    ['unregistered callback', (a: BrowserArdeaNpcCombatState) => { a.lifecycleCheckpoint!.spu!.localCallback = 'Inject'; }],
    ['unsupported frame count', (a: BrowserArdeaNpcCombatState) => { a.lifecycleCheckpoint!.spu!.frameCount = 2; }],
    ['speech allocation owner', (a: BrowserArdeaNpcCombatState) => {
      a.lifecycleCheckpoint!.speechOutput = { schema: 'gothic3-native-speech-output-v1',
        channel: { id: HERO + ':death-speech-channel', bytes: 20, words: [0x2067b6cc, 0, 1, 0, 0] }, sound: null };
      a.lifecycleCheckpoint!.scheduler!.audioChannel = HERO + ':death-speech-channel';
    }],
    ['speech allocation bytes', (a: BrowserArdeaNpcCombatState) => {
      a.lifecycleCheckpoint!.speechOutput = { schema: 'gothic3-native-speech-output-v1',
        channel: { id: BANDIT + ':death-speech-channel', bytes: 20, words: [0x2067b6cc, 0, 99, 0, 0] }, sound: null };
      a.lifecycleCheckpoint!.scheduler!.audioChannel = BANDIT + ':death-speech-channel';
    }],
  ] as const)('rejects v3 %s', async (_name, mutate) => {
    const runtime = await sourceRuntime(), actor = await runtime.initializeOnContact(BANDIT, 0, 1);
    actor.hitPoints = 0; actor.liveState!.npc.CurrentAttackerEntity = HERO;
    const binding = deathBinding(actor);
    expect(binding.death.schedule('ZS_RagDollDead').supported).toBe(true);
    binding.checkpoint('scheduled'); runtime.setDeathGlobals(binding.globals.snapshot());
    mutate(actor);
    const restored = await sourceRuntime();
    const result = await restored.restore(runtime.saveData(), 0, 1);
    expect(result.restored).toBe(0);
    expect(result.skipped).toHaveLength(1);
    expect(restored.get(BANDIT)).toBeNull();
  });

  it('validates canonical shared globals and refuses inconsistent phases or missing v3 stores', async () => {
    const runtime = await sourceRuntime();
    const canonical = NativeNpcDeathGlobals.fromOriginalLoader().snapshot();
    expect(() => runtime.setDeathGlobals({ ...canonical, '10221414': 3, '10221410': 2,
      '1022140c': 0, '10221408': 1 })).not.toThrow();
    for (const bad of [{ ...canonical, badAddress: 0 }, { ...canonical, '10221410': 2 },
      { ...canonical, '10221414': 3, '10221410': 2, '1022140c': 0, '10221408': 0 },
      { ...canonical, '10220e8c': .1 }]) expect(() => runtime.setDeathGlobals(bad)).toThrow();
    expect(() => runtime.setDeathPlayingTimeSeconds(.1)).toThrow();
    const actor = await runtime.initializeOnContact(BANDIT, 0, 1);
    actor.hitPoints = 0;
    const restored = await sourceRuntime();
    const unscheduled = runtime.saveData();
    expect((await restored.restore({ ...unscheduled, actors: unscheduled.actors.map((saved) => ({ ...saved,
      lifecycleCheckpoint: { ...saved.lifecycleCheckpoint!, phase: 'source-seeded' },
    })) }, 0, 1)).skipped[0]!.reason).toContain('inconsistent');
    const { liveState: _live, ...missing } = runtime.saveData().actors[0]!;
    expect((await restored.restore({ ...runtime.saveData(), actors: [missing] }, 0, 1)).skipped[0]!.reason).toContain('shape');
    const modern = runtime.saveData();
    expect(await runtime.restore({ ...modern, schema: 'gothic3-browser-npc-combat-session-v2',
      actors: modern.actors.map((saved) => ({ ...saved, hitPoints: 1 })) }, 0, 1)).toEqual({ restored: 1, skipped: [] });
    expect(runtime.deathGlobals()).toBeUndefined();
    expect(runtime.deathPlayingTimeSeconds()).toBe(0);
  });
});
