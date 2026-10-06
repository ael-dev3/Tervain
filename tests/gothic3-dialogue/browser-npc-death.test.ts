import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserNpcDeathRuntime } from '../../src/gothic3/browser-npc-death';
import type { BrowserNpcDeathPresentation } from '../../src/gothic3/browser-npc-death';
import { calculateBrowserArdeaFistHit, HERO_SOURCE_ID } from '../../src/gothic3/browser-melee';
import type { BrowserFistHitResult } from '../../src/gothic3/browser-melee';
import { loadNativeFistCarrier } from '../../src/gothic3/native-fist-carrier';
import { loadNativeHeroPlayerMemory } from '../../src/gothic3/hero-property-runtime';
import { BrowserArdeaNpcCombatRuntime } from '../../src/gothic3/npc-combat-runtime';
import type { BrowserArdeaNpcCombatState } from '../../src/gothic3/npc-combat-runtime';
import { NativeGameplayResources, NativeWorldData } from '../../src/gothic3/native-data';
import { NativeQuestRuntime } from '../../src/gothic3/quest-runtime';
import { QuestStatus } from '../../src/gothic3/quest-state';
import type { ScenePerson } from '../../src/gothic3/types';

const ROOT = resolve(process.cwd(), 'public/gothic3'), BASE = '/Tervain/gothic3/';
const QUEST = 'Jack_KillBandits';
const BANDITS = ['0c3ad5c499a37e479901ef8b1a19877900000000',
  'ef1adbed209ec647b20ebc9fc989642500000000', '81630a69bab9c44b9df46b76df0ac7b100000000'];
async function localAsset(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
  const index = url.pathname.indexOf(BASE);
  if (index < 0) return new Response('', { status: 404 });
  const path = resolve(ROOT, decodeURIComponent(url.pathname.slice(index + BASE.length)));
  if (!path.startsWith(ROOT + sep)) return new Response('', { status: 400 });
  try { return new Response(await readFile(path)); } catch { return new Response('', { status: 404 }); }
}
function presentation() {
  const value: BrowserNpcDeathPresentation = { hasStaticOwner: () => true, nativeVisualAnimationPresent: () => false,
    nativeResetAllCapabilities: () => ({ characterControl: false, dynamicCollisionCircle: false, collisionShape: false, physicalObject: false }),
    applyResetAll: vi.fn(), defeated: vi.fn(), notify: vi.fn() };
  return value;
}
async function prepare() {
  const people = JSON.parse(await readFile(resolve(ROOT, 'scene.json'), 'utf8')).people as ScenePerson[];
  const player = await loadNativeHeroPlayerMemory(), quests = await NativeQuestRuntime.newGame(player, people);
  const npcs = new BrowserArdeaNpcCombatRuntime(people, new NativeWorldData(new NativeGameplayResources()), 1);
  const visible = presentation(), death = new BrowserNpcDeathRuntime(npcs, quests, visible);
  const fist = await loadNativeFistCarrier(HERO_SOURCE_ID);
  expect(quests.definitions.find((q) => q.id === QUEST)).toMatchObject({
    source: { path: 'G3_World_01/Jack_KillBandits_quest_G3_World_01.quest' }, rewards: { experience: 100 },
  });
  expect(quests.quests.run(QUEST).kind).toBe('applied');
  const hit = (actor: BrowserArdeaNpcCombatState) => calculateBrowserArdeaFistHit({ actor, player,
    runtime: quests, fist, style: 'attack', difficulty: 1 });
  async function schedule(id: string) {
    const actor = await npcs.initializeOnContact(id, quests.nativePlayerProgress().level, 1);
    expect(death.canScheduleFatalHit(actor).status).toBe('known');
    let final: Extract<BrowserFistHitResult, { status: 'resolved' }> | null = null;
    for (let swings = 0; actor.hitPoints > 0 && swings < 100; swings++) {
      const calculated = hit(actor);
      if (calculated.status !== 'resolved') throw new Error(calculated.reason);
      expect(calculated.zeroHitPointsDisposition).toMatchObject({ status: 'known', value: 'kill' });
      expect(death.applyHit(actor, calculated)).toMatchObject({ status: 'known' });
      final = calculated;
    }
    expect(actor.hitPoints).toBe(0);
    expect(actor.lifecycleCheckpoint?.phase).toBe('scheduled');
    return { actor, final: final! };
  }
  return { people, player, quests, npcs, visible, death, schedule, hit };
}
async function reload(fixture: Awaited<ReturnType<typeof prepare>>) {
  const player = await loadNativeHeroPlayerMemory();
  const quests = await NativeQuestRuntime.restore(fixture.quests.saveData(), player, fixture.people);
  const npcs = new BrowserArdeaNpcCombatRuntime(fixture.people, new NativeWorldData(new NativeGameplayResources()), 2);
  expect(await npcs.restore(fixture.npcs.saveData(), quests.nativePlayerProgress().level, 1)).toMatchObject({ skipped: [] });
  const visible = presentation(), death = new BrowserNpcDeathRuntime(npcs, quests, visible);
  return { player, quests, npcs, visible, death };
}

describe('browser source Jack NPC death lifecycle integration', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', localAsset);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('schedules3 actual fist kills, processes callbacks later, awards quest XP before NPC XP and saves the blocked prefixes', async () => {
    const f = await prepare(), before = f.player.memory.getXP();
    const order: { operation: string; xp: number; value?: number }[] = [];
    const record = f.quests.recordNpcKilled.bind(f.quests);
    const recordSpy = vi.spyOn(f.quests, 'recordNpcKilled').mockImplementation((name) => {
      order.push({ operation: 'event-before:' + name, xp: f.player.memory.getXP() });
      const result = record(name);
      order.push({ operation: 'event-after:' + name, xp: f.player.memory.getXP() });
      return result;
    });
    const scalar = f.quests.applyNpcDefeatProgressEffect.bind(f.quests);
    vi.spyOn(f.quests, 'applyNpcDefeatProgressEffect').mockImplementation((effect) => {
      order.push({ operation: effect.type, xp: f.player.memory.getXP(), ...('value' in effect && typeof effect.value === 'number' ? { value: effect.value } : {}) });
      return scalar(effect);
    });
    for (const [index, id] of BANDITS.entries()) {
      const { actor } = await f.schedule(id);
      expect(recordSpy).toHaveBeenCalledTimes(index);
      expect(f.player.memory.getXP()).toBe(before + index * 50);
      expect(actor.lifecycleCheckpoint?.spu?.frames[0]).toMatchObject({ script: 'ZS_RagDollDead', position: 0 });
      f.death.processFrame(.016);
      expect(recordSpy).toHaveBeenCalledTimes(index + 1);
      expect(actor.lifecycleCheckpoint).toMatchObject({ phase: 'blocked', blockedReason: expect.stringContaining('NotifyEnclave'),
        spu: { activeInstruction: null, frames: [expect.objectContaining({ script: 'ZS_RagDollDead', position: 1 }),
          expect.anything(), expect.anything(), expect.anything(), expect.anything()] } });
      expect(actor.liveState!.npc).toMatchObject({ DefeatedByPlayer: true, CurrentAttackerEntity: HERO_SOURCE_ID });
      expect(actor.liveState!.routine.AIMode).toBe(9);
      expect(actor.lifecycleCheckpoint!.speechOutput).toMatchObject({
        channel: { id: id + ':death-speech-channel', words: [0x2067b6cc, 0, 1, 0, 0] },
        sound: { id: id + ':death-speech-sound', words: [0x2067b744, 0, 1, 0] },
      });
    }
    expect(f.quests.quests.state(QUEST)).toMatchObject({ status: QuestStatus.Success, counters: [1, 1, 1] });
    expect(f.player.memory.getXP()).toBe(before + 650);
    expect(f.quests.saveData().heroProgress?.awards).toEqual([10, 10, 100, 10]);
    expect(order.filter((entry) => entry.operation === 'setPlayerXp').map(({ xp, value }) => ({ xp, value }))).toEqual([
      { xp: before, value: before + 50 }, { xp: before + 50, value: before + 100 },
      { xp: before + 600, value: before + 650 },
    ]);
    expect(order.find((entry) => entry.operation === 'event-after:Ardea_OutNovice_03')?.xp).toBe(before + 600);
    expect(f.visible.applyResetAll).toHaveBeenCalledTimes(3);
    expect(f.visible.defeated).toHaveBeenCalledTimes(3);
    const npcSave = f.npcs.saveData(), questSave = f.quests.saveData();
    expect(npcSave.schema).toBe('gothic3-browser-npc-combat-session-v3');
    expect(npcSave.deathGlobals?.['102213ec']).toBe(1); // Shared lazy label, allocated once for all3 actors.
    expect(npcSave.deathGlobals?.['10220e8c']).toBe(f.npcs.deathPlayingTimeSeconds());
    f.death.processFrame(.016);
    expect(recordSpy).toHaveBeenCalledTimes(3);
    expect(f.quests.saveData().heroProgress).toEqual(questSave.heroProgress);
    const restored = await reload(f);
    expect(restored.player.memory.getXP()).toBe(before + 650);
    expect(restored.quests.saveData().heroProgress).toEqual(questSave.heroProgress);
    const restoredEvents = vi.spyOn(restored.quests, 'recordNpcKilled');
    restored.death.restoreScheduled(); restored.death.processFrame(.016);
    expect(restoredEvents).not.toHaveBeenCalled();
    expect(restored.visible.defeated).not.toHaveBeenCalled();
    expect(restored.quests.quests.state(QUEST)).toMatchObject({ status: QuestStatus.Success, counters: [1, 1, 1] });
    for (const saved of npcSave.actors) expect(restored.npcs.get(saved.personId)!.lifecycleCheckpoint).toEqual(saved.lifecycleCheckpoint);
  }, 30_000);

  it('reattaches a saved pending SPU once and retains the later blocked state on repeated load', async () => {
    const f = await prepare(), before = f.player.memory.getXP();
    await f.schedule(BANDITS[0]!);
    const restored = await reload(f), record = vi.spyOn(restored.quests, 'recordNpcKilled');
    expect(restored.npcs.get(BANDITS[0]!)!.lifecycleCheckpoint?.phase).toBe('scheduled');
    expect(restored.player.memory.getXP()).toBe(before);
    restored.death.restoreScheduled(); restored.death.restoreScheduled();
    expect(record).not.toHaveBeenCalled();
    restored.death.processFrame(.016); restored.death.processFrame(.016);
    expect(record).toHaveBeenCalledTimes(1);
    expect(restored.player.memory.getXP()).toBe(before + 50);
    expect(restored.quests.quests.state(QUEST)?.counters).toEqual([1, 0, 0]);
    const checkpoint = restored.npcs.get(BANDITS[0]!)!.lifecycleCheckpoint;
    expect(checkpoint).toMatchObject({ phase: 'blocked', blockedReason: expect.stringContaining('NotifyEnclave') });
    const second = await reload({ ...f, ...restored }), events = vi.spyOn(second.quests, 'recordNpcKilled');
    second.death.restoreScheduled(); second.death.processFrame(.016);
    expect(events).not.toHaveBeenCalled();
    expect(second.player.memory.getXP()).toBe(before + 50);
    expect(second.npcs.get(BANDITS[0]!)!.lifecycleCheckpoint).toEqual(checkpoint);
  }, 30_000);

  it.each(['gothic3-browser-npc-combat-session-v1', 'gothic3-browser-npc-combat-session-v2'])
  ('keeps zero-HP %s actor inert through adapter scheduling, frame and stale-hit entry points', async (schema) => {
    const f = await prepare();
    const { final } = await f.schedule(BANDITS[0]!);
    const oldSave = { ...f.npcs.saveData(), schema, actors: f.npcs.saveData().actors.map(({ liveState: _live,
      lifecycleCheckpoint: _checkpoint, ...old }) => old) };
    const npcs = new BrowserArdeaNpcCombatRuntime(f.people, new NativeWorldData(new NativeGameplayResources()), 2);
    expect(await npcs.restore(oldSave, f.quests.nativePlayerProgress().level, 1)).toEqual({ restored: 1, skipped: [] });
    const death = new BrowserNpcDeathRuntime(npcs, f.quests, presentation()), actor = npcs.get(BANDITS[0]!)!;
    const events = vi.spyOn(f.quests, 'recordNpcKilled'), before = f.player.memory.getXP();
    expect(actor.lifecycleCheckpoint!.phase).toBe('legacy-zero-hp-unknown');
    expect(death.canScheduleFatalHit(actor).status).toBe('unknown');
    death.restoreScheduled(); death.processFrame(.016);
    const stale = { ...final, hitPointsBefore: 0, hitPointsAfter: 0 };
    expect(death.applyHit(actor, stale).status).toBe('unknown');
    death.processFrame(.016);
    expect(events).not.toHaveBeenCalled();
    expect(f.player.memory.getXP()).toBe(before);
    expect(actor.lifecycleCheckpoint!.phase).toBe('legacy-zero-hp-unknown');
  }, 30_000);

  it('rejects a stale restored blocked hit before rebuilding an owner or mutating its checkpoint', async () => {
    const f = await prepare(), { final } = await f.schedule(BANDITS[0]!);
    f.death.processFrame(.016);
    const restored = await reload(f), actor = restored.npcs.get(BANDITS[0]!)!;
    const save = restored.npcs.saveData(), events = vi.spyOn(restored.quests, 'recordNpcKilled');
    expect(restored.death.applyHit(actor, { ...final, hitPointsBefore: 0, hitPointsAfter: 0 }).status).toBe('unknown');
    restored.death.processFrame(.016);
    expect(events).not.toHaveBeenCalled();
    expect(actor.lifecycleCheckpoint).toEqual(save.actors[0]!.lifecycleCheckpoint);
  }, 30_000);

  it('retains a replayable XP prefix when a browser observer fails during a threshold-crossing NPC award', async () => {
    const f = await prepare();
    expect(f.quests.awardExperienceScript(90).known).toBe(true);
    expect(f.quests.nativePlayerProgress()).toMatchObject({ xp: 450, level: 0 });
    await f.schedule(BANDITS[0]!);
    const unsubscribe = f.quests.subscribe(() => {
      if (f.player.memory.getXP() === 500) throw new Error('Browser XP observer failed');
    });
    f.death.processFrame(.016); unsubscribe();
    expect(f.player.memory.getXP()).toBe(500);
    expect(f.npcs.get(BANDITS[0]!)!.lifecycleCheckpoint?.phase).toBe('blocked');
    const saved = f.quests.saveData();
    expect(saved.heroProgress!.awards).toEqual([90, { schema: 'gothic3-native-npc-xp-scalar-prefix-v1', requestedAmount: 10,
      scalars: [{ type: 'setPlayerXp', value: 500, delta: 50 }] }]);
    expect(saved.heroProgress).toMatchObject({ xp: 500, level: 0, lpAttribs: 0 });
    const restored = await NativeQuestRuntime.restore(saved, await loadNativeHeroPlayerMemory(), f.people);
    expect(restored.saveData().heroProgress).toEqual(saved.heroProgress);
    expect(restored.applyNpcDefeatProgressEffect({ type: 'setPlayerLevel', playerId: HERO_SOURCE_ID, value: 1 }).known).toBe(false);
    expect(restored.awardExperienceScript(10).known).toBe(true);
    const later = restored.saveData();
    expect(later.heroProgress).toMatchObject({ xp: 550, level: 1, lpAttribs: 10 });
    expect(later.heroProgress!.awards).toEqual([...saved.heroProgress!.awards, 10]);
    const repeated = await NativeQuestRuntime.restore(later, await loadNativeHeroPlayerMemory(), f.people);
    expect(repeated.saveData().heroProgress).toEqual(later.heroProgress);
  }, 30_000);

  it('records XP and Level but does not fabricate LP when the ordered level-up presentation fails', async () => {
    const f = await prepare();
    expect(f.quests.awardExperienceScript(90).known).toBe(true);
    await f.schedule(BANDITS[0]!);
    vi.mocked(f.visible.notify).mockImplementation((message) => { if (message === 'Level up') throw new Error('Level-up presentation failed'); });
    f.death.processFrame(.016);
    const saved = f.quests.saveData();
    expect(saved.heroProgress).toEqual({ xp: 500, level: 1, lpAttribs: 0,
      awards: [90, { schema: 'gothic3-native-npc-xp-scalar-prefix-v1', requestedAmount: 10,
        scalars: [{ type: 'setPlayerXp', value: 500, delta: 50 }, { type: 'setPlayerLevel', value: 1 }] }] });
    expect(f.npcs.get(BANDITS[0]!)!.liveState!.npc.DefeatedByPlayer).toBe(false);
    expect(f.npcs.get(BANDITS[0]!)!.lifecycleCheckpoint?.blockedReason).toContain('Level-up presentation failed');
    const restored = await reload(f), events = vi.spyOn(restored.quests, 'recordNpcKilled');
    restored.death.restoreScheduled(); restored.death.processFrame(.016);
    expect(restored.quests.saveData().heroProgress).toEqual(saved.heroProgress);
    expect(events).not.toHaveBeenCalled();
  }, 30_000);

  it('collapses a fully applied threshold-crossing NPC scalar sequence to its compatible numeric receipt', async () => {
    const f = await prepare();
    expect(f.quests.awardExperienceScript(90).known).toBe(true);
    await f.schedule(BANDITS[0]!); f.death.processFrame(.016);
    expect(f.quests.saveData().heroProgress).toEqual({ xp: 500, level: 1, lpAttribs: 10, awards: [90, 10] });
    expect((await reload(f)).quests.saveData().heroProgress).toEqual(f.quests.saveData().heroProgress);
  }, 30_000);

  it('rejects missing, duplicated, reordered or altered native scalar receipts and live out-of-order writes', async () => {
    const f = await prepare();
    expect(f.quests.awardExperienceScript(90).known).toBe(true);
    const xp = { type: 'setPlayerXp' as const, playerId: HERO_SOURCE_ID, value: 500, delta: 50 };
    expect(f.quests.applyNpcDefeatProgressEffect({ type: 'setPlayerLp', playerId: HERO_SOURCE_ID, value: 10, delta: 10 }).known).toBe(false);
    expect(f.quests.applyNpcDefeatProgressEffect(xp).known).toBe(true);
    expect(f.quests.applyNpcDefeatProgressEffect(xp).known).toBe(false);
    const saved = f.quests.saveData(), prefix = saved.heroProgress!.awards[1]!;
    if (typeof prefix === 'number') throw new Error('Expected incomplete native receipt');
    const scalar = prefix.scalars[0]!;
    const variants = [[], [scalar, scalar], [{ type: 'setPlayerLevel', value: 1 }],
      [{ type: 'setPlayerLevel', value: 1 }, scalar], [scalar, { type: 'setPlayerLp', value: 10, delta: 10 }],
      [{ ...scalar, value: 501 }], [{ ...scalar, delta: 55 }], [{ ...scalar, extra: 'injected' }],
      [scalar, { type: 'setPlayerLevel', value: 1 }, { type: 'setPlayerLp', value: 10, delta: 10 }]];
    for (const scalars of variants) {
      await expect(NativeQuestRuntime.restore({ ...saved, heroProgress: { ...saved.heroProgress!,
        awards: [90, { ...prefix, scalars }] } }, await loadNativeHeroPlayerMemory(), f.people)).rejects.toThrow(/prefix/);
    }
    expect(f.quests.applyNpcDefeatProgressEffect({ type: 'setPlayerLp', playerId: HERO_SOURCE_ID, value: 10, delta: 10 }).known).toBe(false);
    expect(f.quests.applyNpcDefeatProgressEffect({ type: 'setPlayerLevel', playerId: HERO_SOURCE_ID, value: 1 }).known).toBe(true);
    expect(f.quests.applyNpcDefeatProgressEffect({ type: 'setPlayerLevel', playerId: HERO_SOURCE_ID, value: 2 }).known).toBe(false);
    expect(f.quests.applyNpcDefeatProgressEffect({ type: 'setPlayerLp', playerId: HERO_SOURCE_ID, value: 10, delta: 10 }).known).toBe(true);
    expect(f.quests.applyNpcDefeatProgressEffect({ type: 'setPlayerLp', playerId: HERO_SOURCE_ID, value: 20, delta: 10 }).known).toBe(false);
    expect(f.quests.saveData().heroProgress!.awards).toEqual([90, 10]);
    expect(saved.heroProgress!.awards).toEqual([90, prefix]); // Later writes do not mutate an earlier snapshot.
  }, 30_000);

  it('keeps serialized collision facts distinct from the absent browser cleanup capabilities and rejects a present unported service', async () => {
    const f = await prepare(), actor = await f.npcs.initializeOnContact(BANDITS[0]!, 0, 1);
    const receipt = JSON.parse(await readFile(resolve(process.cwd(), 'assets/gothic3/combat/bandit-death-source-evidence.json'), 'utf8')) as {
      source: { sha256: string }; records: { id: string; completeSerializedClasses: { name: string; version: number }[];
        collisionShape: { shapeCount: number; allTailBytesConsumed: boolean } }[];
    };
    expect(receipt.source.sha256).toBe(actor.sourceSha256);
    const source = receipt.records.find((record) => record.id === actor.personId)!;
    expect(source.completeSerializedClasses.find((set) => set.name === 'eCCollisionShape_PS')?.version).toBe(63);
    expect(source.completeSerializedClasses.some((set) => set.name === 'eCRigidBody_PS')).toBe(true);
    expect(source.collisionShape).toMatchObject({ shapeCount: 2, allTailBytesConsumed: true });
    expect(f.visible.nativeResetAllCapabilities(actor.personId)).toEqual({ characterControl: false,
      dynamicCollisionCircle: false, collisionShape: false, physicalObject: false });
    for (const field of ['characterControl', 'dynamicCollisionCircle', 'collisionShape', 'physicalObject'] as const) {
      const supplied = presentation();
      supplied.nativeResetAllCapabilities = () => ({ characterControl: false, dynamicCollisionCircle: false,
        collisionShape: false, physicalObject: false, [field]: true });
      const death = new BrowserNpcDeathRuntime(f.npcs, f.quests, supplied);
      expect(death.canScheduleFatalHit(actor).status).toBe('unknown');
    }
  }, 30_000);
});
