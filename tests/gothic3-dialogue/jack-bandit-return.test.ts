import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NativeCatalog } from '../../src/gothic3/catalog';
import type { NativeInfo } from '../../src/gothic3/catalog';
import { executeNativeDialogue, planNativeDialogue } from '../../src/gothic3/dialogue';
import type { DialogueExecutionPlan, DialogueFacts, DialogueParticipants } from '../../src/gothic3/dialogue';
import { loadNativeHeroPlayerMemory } from '../../src/gothic3/hero-property-runtime';
import { BrowserDialogueHost } from '../../src/gothic3/live-dialogue';
import { NativeGameplayResources, NativeWorldData } from '../../src/gothic3/native-data';
import { generateNativePickpocketLoot } from '../../src/gothic3/native-treasure-sets';
import { BrowserArdeaNpcCombatRuntime } from '../../src/gothic3/npc-combat-runtime';
import type { BrowserArdeaNpcCombatState } from '../../src/gothic3/npc-combat-runtime';
import { NativeQuestRuntime } from '../../src/gothic3/quest-runtime';
import { QuestStatus } from '../../src/gothic3/quest-state';
import type { ScenePerson } from '../../src/gothic3/types';

const assetRoot = resolve(process.cwd(), 'public/gothic3');
const pagesBase = '/Tervain/gothic3/';
const goldGuid = '708696aa2b91a6409241715851931dd200000000';
const hero = { id: 'PC_Hero', name: 'PC_Hero' };
const questId = 'Jack_KillBandits';
const bandits = ['Ardea_OutNovice_01', 'Ardea_OutNovice_02', 'Ardea_OutNovice_03'];

async function readLocalAsset(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
  const marker = url.pathname.indexOf(pagesBase);
  if (marker < 0) return new Response('Unexpected asset route', { status: 404 });
  const path = resolve(assetRoot, decodeURIComponent(url.pathname.slice(marker + pagesBase.length)));
  if (!path.startsWith(assetRoot)) return new Response('Invalid asset path', { status: 400 });
  try { return new Response(await readFile(path), { status: 200 }); }
  catch { return new Response('Missing test asset: ' + url.pathname, { status: 404 }); }
}

/** A minimal DOM sink automatically presses Continue. The actual browser host
 * still renders every source Say and executes every command and callback. */
class DialogueElement {
  readonly children: DialogueElement[] = [];
  readonly dataset: Record<string, string> = {};
  className = '';
  textContent = '';
  scrollTop = 0;
  removed = false;
  onclick: (() => void) | null = null;
  constructor(readonly tag: string) {}
  get scrollHeight(): number { return this.children.length; }
  append(...elements: DialogueElement[]): void {
    this.children.push(...elements);
    for (const element of elements) {
      if (element.className === 'dialogue-continue') queueMicrotask(() => element.onclick?.());
    }
  }
  remove(): void { this.removed = true; }
}

function factsFor(runtime: NativeQuestRuntime, jack: ScenePerson): DialogueFacts {
  return {
    entity: (name) => name === '' ? { known: true, value: null }
      : name === hero.name ? { known: true, value: hero }
      : name === jack.name ? { known: true, value: jack }
      : { known: false, reason: 'Entity outside the source-backed Jack test: ' + name },
    given: (info) => runtime.infoState.given(info),
    quest: (name) => {
      const definition = runtime.definitions.find((quest) => quest.id === name);
      if (!definition) return { known: true, value: null };
      const state = runtime.quests.state(name);
      return state ? { known: true, value: { definition, status: state.status } }
        : { known: false, reason: 'Source quest state missing: ' + name };
    },
    ownerDistance: () => ({ known: false, reason: 'This source chain has no owner-distance condition.' }),
    playerKnows: (event) => ({ known: true, value: runtime.gameEvents.isSet(event) }),
    itemStackAmount: (entity, template) => runtime.heroItemStackAmount(entity, template),
    actor: () => ({ known: false, reason: 'Native NPC death and wound predicates remain unconnected.' }),
    actorDialog: (entity) => runtime.actorDialogs.dialog(entity),
    dialogFlag: (entity, field) => runtime.actorDialogs.dialogFlag(entity, field),
    condition: (info) => ({ kind: 'unknown', reason: 'Unexpected source condition ' + info.conditionType }),
  };
}

function hostFor(runtime: NativeQuestRuntime, catalog: NativeCatalog, jack: ScenePerson,
  actor: BrowserArdeaNpcCombatState) {
  const output = new DialogueElement('section');
  const facts = factsFor(runtime, jack);
  const host = new BrowserDialogueHost(runtime, catalog, facts, catalog.infos, new AbortController().signal,
    output as unknown as HTMLElement, jack, actor.inventory, null);
  const participants: DialogueParticipants = { player: hero, a: jack, b: hero };
  return { host, facts, output, participants };
}

function sourceInfo(catalog: NativeCatalog, id: string): NativeInfo {
  const info = catalog.infos.find((candidate) => candidate.id === id);
  if (!info) throw new Error('Missing hash-checked source Info ' + id);
  return info;
}

function sayPairs(plan: DialogueExecutionPlan) {
  return plan.operations.flatMap((operation) => operation.kind === 'say'
    ? [{ version: 1, speakerKey: 'FO_It_' + operation.speaker!.name, textKey: operation.textKey }] : []);
}

async function prepare() {
  vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
  vi.stubGlobal('fetch', readLocalAsset);
  vi.stubGlobal('document', { createElement: (tag: string) => new DialogueElement(tag) });
  const people = JSON.parse(await readFile(resolve(assetRoot, 'scene.json'), 'utf8')).people as ScenePerson[];
  const jack = people.find((person) => person.name === 'Jack')!;
  const player = await loadNativeHeroPlayerMemory();
  const runtime = await NativeQuestRuntime.newGame(player, people);
  const catalog = new NativeCatalog();
  await catalog.load();
  const commands = await catalog.nativeCommandNames();
  const npcs = new BrowserArdeaNpcCombatRuntime(people, new NativeWorldData(new NativeGameplayResources()), 1);
  const actor = await npcs.initializeOnContact(jack.id, runtime.saveData().heroProgress!.level, 1);
  const live = hostFor(runtime, catalog, jack, actor);
  const plan = (id: string) => planNativeDialogue(sourceInfo(catalog, id), live.participants, live.facts,
    catalog.infos, live.host, commands);
  const execute = async (id: string) => {
    const result = plan(id);
    expect(result.kind, result.kind === 'ready' ? '' : result.reason).toBe('ready');
    if (result.kind !== 'ready') throw new Error(result.reason);
    expect(await executeNativeDialogue(result.plan, live.host)).toEqual({ known: true, value: true });
    return result.plan;
  };
  return { people, jack, player, runtime, catalog, commands, npcs, actor, live, plan, execute };
}

describe('source-backed Jack bandit return through the browser dialogue host', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('executes the original conversation chain, completes three objectives, pays gold/XP once and restores the result', async () => {
    const { people, jack, player, runtime, catalog, commands, npcs, actor, live, plan, execute } = await prepare();
    const returning = sourceInfo(catalog, 'BPANKRATZ31463');
    expect(returning).toMatchObject({ owner: 'Jack', npc: 'Jack', conditionType: 10, type: 3, permanent: false,
      quest: questId, source: { archive: 'Infos.pak', path: 'G3_World_01/BPANKRATZ31463_info_G3_World_01.info',
        sha256: '147820469f4453296a2aba365cf5bb06a4975d881c020c61cb22f441a7a1b171' } });
    expect(plan(returning.id)).toMatchObject({ kind: 'unavailable', reason: /Quest status/ });
    expect(plan('BPANKRATZ31461')).toMatchObject({ kind: 'unavailable', reason: /Jack_NiceTower/ });
    const xpBefore = player.memory.getXP();
    const heroGoldBefore = runtime.heroItemStackAmount(hero, 'It_Gold');
    expect(heroGoldBefore).toEqual({ known: true, value: 123 });
    const jackGoldBefore = actor.inventory.snapshot().stacks.find((stack) => stack.templateGuid20 === goldGuid)!.amount;
    // This seed gives Jack less than50 gold. Script_Game Give's audited
    // AssureItems call must create the shortfall before its indexed transfer.
    expect(jackGoldBefore).toBeLessThan(50);

    await execute('BPANKRATZ31460');
    expect(runtime.gameEvents.isSet('Jack_NiceTower')).toBe(true);
    const report = await execute('BPANKRATZ31461');
    expect(runtime.gameEvents.isSet('Jack_BanditsThrere')).toBe(true);
    expect(runtime.quests.state(questId)?.status).toBe(QuestStatus.Open);
    const accept = await execute('BPANKRATZ31462');
    expect(runtime.quests.state(questId)).toMatchObject({ status: QuestStatus.Running, counters: [0, 0, 0] });
    expect(player.memory.getXP()).toBe(xpBefore);
    for (const name of bandits) expect(runtime.recordNpcKilled(name).kind).toBe('applied');
    expect(runtime.quests.state(questId)).toMatchObject({ status: QuestStatus.Success, counters: [1, 1, 1] });
    expect(player.memory.getXP()).toBe(xpBefore + 500);
    expect(runtime.saveData().heroProgress?.awards).toEqual([100]);
    expect(runtime.recordNpcKilled(bandits[2]!)).toEqual({ kind: 'applied', progress: [] });
    expect(player.memory.getXP()).toBe(xpBefore + 500);

    const returnPlan = await execute(returning.id);
    expect(returnPlan.operations.map((operation) => operation.kind)).toEqual([
      'say', 'say', 'say', 'say', 'give', 'experienceScript',
    ]);
    expect(runtime.heroItemStackAmount(hero, 'It_Gold')).toEqual({ known: true, value: 173 });
    expect(actor.inventory.snapshot().stacks.find((stack) => stack.templateGuid20 === goldGuid)?.amount ?? 0)
      .toBe(Math.max(jackGoldBefore, 50) - 50);
    expect(player.memory.getXP()).toBe(xpBefore + 750);
    expect(runtime.saveData().heroProgress?.awards).toEqual([100, 50]);
    const logPairs = [...sayPairs(report), ...sayPairs(accept), ...sayPairs(returnPlan)];
    expect(runtime.quests.state(questId)).toMatchObject({ status: QuestStatus.Success, counters: [1, 1, 1],
      logPairs, logKeys: logPairs.map((pair) => pair.textKey) });
    expect(runtime.infoState.given(returning)).toEqual({ known: true, value: true });
    expect(live.output.children.filter((element) => element.tag === 'article')).toHaveLength(16);
    expect(live.output.children.filter((element) => element.className === 'gothic-xp-message')
      .map((element) => element.textContent)).toEqual(['Jack → PC_Hero · 50 gold', catalog.text('GO_XP') + ' + 250']);
    expect(plan(returning.id)).toMatchObject({ kind: 'unavailable', reason: /already Given/ });
    const saved = runtime.saveData();
    const inventoryAfterReturn = actor.inventory.snapshot();
    expect(await executeNativeDialogue(returnPlan, live.host)).toMatchObject({ known: false, reason: /already Given/ });
    expect(runtime.saveData().heroProgress).toEqual(saved.heroProgress);
    expect(actor.inventory.snapshot()).toEqual(inventoryAfterReturn);
    expect(runtime.heroInventory.snapshot()).toEqual(saved.heroInventory);

    const restoredPlayer = await loadNativeHeroPlayerMemory();
    const restored = await NativeQuestRuntime.restore(saved, restoredPlayer, people);
    const restoredNpcs = new BrowserArdeaNpcCombatRuntime(people, new NativeWorldData(new NativeGameplayResources()), 2);
    expect(await restoredNpcs.restore(npcs.saveData(), restored.saveData().heroProgress!.level, 1))
      .toMatchObject({ restored: 1, skipped: [] });
    const restoredActor = restoredNpcs.get(jack.id)!;
    expect(restoredActor.inventory.snapshot()).toEqual(inventoryAfterReturn);
    expect(restored.heroInventory.snapshot()).toEqual(saved.heroInventory);
    expect(restored.quests.state(questId)).toMatchObject({ status: QuestStatus.Success, counters: [1, 1, 1], logPairs });
    expect(restored.gameEvents.isSet('Jack_BanditsThrere')).toBe(true);
    expect(restored.infoState.given(returning)).toEqual({ known: true, value: true });
    expect(restoredPlayer.memory.getXP()).toBe(xpBefore + 750);
    const restoredLive = hostFor(restored, catalog, jack, restoredActor);
    expect(planNativeDialogue(returning, restoredLive.participants, restoredLive.facts, catalog.infos,
      restoredLive.host, commands)).toMatchObject({ kind: 'unavailable', reason: /already Given/ });
    expect(await executeNativeDialogue(returnPlan, restoredLive.host)).toMatchObject({ known: false, reason: /already Given/ });
    expect(restored.heroInventory.snapshot()).toEqual(saved.heroInventory);
    expect(restoredPlayer.memory.getXP()).toBe(xpBefore + 750);
  }, 30_000);

  it('merges source PickPocket loot into an existing Hero starting-item stack and retains its full receipt', async () => {
    const { people, runtime, actor } = await prepare();
    const set = actor.treasureSetResolutions.find((resolution) => resolution.status === 'pickpocket-source-resolved' &&
      resolution.pickpocketCandidates.some((candidate) => runtime.heroInventory.hasTemplate(candidate.itemGuid20)));
    expect(set).toBeDefined();
    if (!set || set.status !== 'pickpocket-source-resolved') throw new Error('Jack has no matching source PickPocket candidate.');
    const selected = set.pickpocketCandidates.findIndex((candidate) => runtime.heroInventory.hasTemplate(candidate.itemGuid20));
    const loot = generateNativePickpocketLoot(set, set.treasureSetSlot, vi.fn().mockReturnValueOnce(selected).mockReturnValue(0));
    expect(loot).not.toBeNull();
    if (!loot) throw new Error('The source PickPocket candidate did not generate loot.');
    const before = runtime.heroInventory.snapshot();
    const stack = before.stacks.find((entry) => entry.templateGuid20 === loot.itemGuid20 && entry.quality === loot.creationQuality)!;
    expect(stack).toBeDefined();
    const originalTemplate = runtime.heroInventory.template(loot.itemGuid20)!;
    expect(originalTemplate.source).toMatchObject({ archive: 'Templates.pak', path: loot.itemSourcePath,
      sha256: loot.itemSourceSha256 });

    expect(await runtime.receiveNativePickpocketLoot([loot])).toEqual({ known: true,
      value: [{ templateName: loot.itemName, amount: loot.amount, quality: loot.creationQuality }] });
    const after = runtime.heroInventory.snapshot();
    expect(after.stacks).toHaveLength(before.stacks.length);
    expect(after.stacks.find((entry) => entry.templateGuid20 === loot.itemGuid20 && entry.quality === loot.creationQuality)?.amount)
      .toBe(stack.amount + loot.amount);
    expect(runtime.heroInventory.template(loot.itemGuid20)).toEqual(originalTemplate);
    expect(after.equipment).toEqual(before.equipment);
    const restored = await NativeQuestRuntime.restore(runtime.saveData(), await loadNativeHeroPlayerMemory(), people);
    expect(restored.heroInventory.snapshot()).toEqual(after);
  }, 30_000);

  it('keeps template path/hash/archive and intrinsic property conflicts blocked despite source receipt shape differences', async () => {
    const { runtime, actor } = await prepare();
    const compact = actor.inventory.template(goldGuid)!;
    const source = compact.source as { path: string; sha256: string };
    const before = runtime.heroInventory.snapshot();
    expect(runtime.heroInventory.template(goldGuid)?.source).toMatchObject({ ...source, archive: 'Templates.pak' });
    expect(() => runtime.heroInventory.registerTemplate(compact)).not.toThrow();
    for (const conflict of [
      { ...compact, guid20: 'f'.repeat(39) },
      { ...compact, source: { ...source, path: 'Different/It_Gold.tple' } },
      { ...compact, source: { ...source, sha256: 'f'.repeat(64) } },
      { ...compact, source: { ...source, archive: 'Different.pak' } },
      { ...compact, useType: compact.useType + 1 },
      { ...compact, category: compact.category + 1 },
      { ...compact, permanent: !compact.permanent },
      { ...compact, missionItem: !compact.missionItem },
      { ...compact, skillGuid20: 'a'.repeat(40) },
      { ...compact, spellGuid20: 'a'.repeat(40) },
      { ...compact, itemPropertySetPresent: !compact.itemPropertySetPresent },
    ]) expect(() => runtime.heroInventory.registerTemplate(conflict)).toThrow();
    expect(runtime.heroInventory.snapshot()).toEqual(before);
  }, 30_000);
});
