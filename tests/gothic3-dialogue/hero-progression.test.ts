import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadNativeHeroPlayerMemory } from '../../src/gothic3/hero-property-runtime';
import { NativeQuestRuntime } from '../../src/gothic3/quest-runtime';
import { NativeGameplayResources, NativeWorldData } from '../../src/gothic3/native-data';
import { BrowserArdeaNpcCombatRuntime } from '../../src/gothic3/npc-combat-runtime';
import { resolveNativePickpocketAction } from '../../src/gothic3/pickpocket';
import type { NativePickpocketSkills } from '../../src/gothic3/pickpocket';
import { NativeInventory } from '../../src/gothic3/inventory';

const assetRoot = resolve(process.cwd(), 'public/gothic3');
const pagesBase = '/Tervain/gothic3/';

async function readLocalAsset(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
  const marker = url.pathname.indexOf(pagesBase);
  if (marker < 0) return new Response('Unexpected asset route', { status: 404 });
  const path = resolve(assetRoot, decodeURIComponent(url.pathname.slice(marker + pagesBase.length)));
  if (!path.startsWith(assetRoot)) return new Response('Invalid asset path', { status: 400 });
  try { return new Response(await readFile(path), { status: 200 }); }
  catch { return new Response('Missing test asset: ' + url.pathname, { status: 404 }); }
}

describe('source-backed Hero level progression', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the serialized Hero NPC and applies, saves, and restores a threshold-crossing GiveXP award', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);

    const player = await loadNativeHeroPlayerMemory();
    expect(player.npc.values.Level).toBe(0);
    expect(player.npcWrapper.native).toBe(player.npc.base);
    expect([...player.npc.obsoleteProperties.keys()]).toContain('Level');
    expect(player.npc.obsoleteProperties.get('Level')?.payload.byteLength).toBeGreaterThan(0);
    const runtime = await NativeQuestRuntime.newGame(player);
    expect(runtime.heroCombatSkills()).toMatchObject({
      Perk_1H_2: { status: 'known', value: false },
      Perk_1H_3: { status: 'known', value: false },
      Perk_OrcSlayer: { status: 'known', value: false },
      Perk_Shield_2: { status: 'known', value: false },
      Perk_LightArmor: { status: 'known', value: false },
      Perk_HeavyArmor: { status: 'known', value: false },
      Perk_Learn: { status: 'known', value: false },
    });
    const oneHandSkill = runtime.heroCombatSkills().Perk_1H_2;
    expect(oneHandSkill?.status).toBe('known');
    if (oneHandSkill?.status === 'known') expect(oneHandSkill.source).toContain('starting-inventory.json@');
    const jack = { id: '1517cf4bc02a0a429a8d560cc826ceee00000000', name: 'Jack' };
    expect(runtime.heroInventoryStacks()).toHaveLength(121);
    expect(runtime.heroInventoryStacks().filter((stack) => stack.learned)).toHaveLength(5);
    expect(runtime.heroItemStackAmount({ id: 'PC_Hero', name: 'PC_Hero' }, 'It_Gold'))
      .toEqual({ known: true, value: 123 });
    expect(runtime.heroItemStackAmount({ id: 'PC_Hero', name: 'PC_Hero' }, 'It_FiremageCup'))
      .toEqual({ known: true, value: null });
    expect(runtime.heroItemStackAmount(jack, 'It_Gold').known).toBe(false);
    expect(runtime.actorDialogs.dialogFlag(jack, 'TradeEnabled')).toEqual({ known: true, value: false });
    expect(runtime.actorDialogs.dialogFlag(jack, 'PartyEnabled')).toEqual({ known: true, value: false });
    expect(runtime.actorDialogs.dialogFlag(jack, 'TeachEnabled')).toEqual({ known: true, value: false });
    expect(runtime.actorDialogs.setTradeEnabled(jack, true)).toEqual({ known: true, value: true });
    expect(runtime.actorDialogs.setDialogFlag(jack, 'PartyEnabled', true)).toEqual({ known: true, value: true });
    expect(runtime.actorDialogs.setDialogFlag(jack, 'TeachEnabled', true)).toEqual({ known: true, value: true });
    expect(runtime.actorDialogs.setPickedPocket(jack, true)).toEqual({ known: true, value: true });
    const award = runtime.awardExperienceScript(250);
    expect(award).toMatchObject({ known: true, value: {
      awardedAmount: 1250,
      progress: { xp: 1250, level: 1, lp: 10, levelUp: true },
    } });
    expect(player.memory.getXP()).toBe(1250);
    expect(player.memory.getLPAttribs()).toBe(10);
    expect(player.npc.values.Level).toBe(1);

    const save = runtime.saveData();
    expect(save.sources.initialInventory).toMatch(/^[a-f0-9]{64}$/);
    expect(save.tradeEnabledArdeaActors).toEqual([jack.id]);
    expect(save.partyEnabledArdeaActors).toEqual([jack.id]);
    expect(save.teachEnabledArdeaActors).toEqual([jack.id]);
    expect(save.pickedPocketArdeaActors).toEqual([jack.id]);
    const restoredPlayer = await loadNativeHeroPlayerMemory();
    const restored = await NativeQuestRuntime.restore(save, restoredPlayer);
    expect(restoredPlayer.memory.getXP()).toBe(1250);
    expect(restoredPlayer.memory.getLPAttribs()).toBe(10);
    expect(restoredPlayer.npc.values.Level).toBe(1);
    expect(restored.actorDialogs.dialogFlag(jack, 'TradeEnabled')).toEqual({ known: true, value: true });
    expect(restored.actorDialogs.dialogFlag(jack, 'PartyEnabled')).toEqual({ known: true, value: true });
    expect(restored.actorDialogs.dialogFlag(jack, 'TeachEnabled')).toEqual({ known: true, value: true });
    expect(restored.actorDialogs.dialog(jack)).toMatchObject({ known: true, value: { pickedPocket: true } });
    expect(restored.heroItemStackAmount({ id: 'PC_Hero', name: 'PC_Hero' }, 'It_Gold'))
      .toEqual({ known: true, value: 123 });
    expect(restored.saveData().heroProgress).toEqual({ xp: 1250, level: 1, lpAttribs: 10, awards: [250] });
  }, 30_000);

  it('clamps Hero HP through the native PlayerMemory setter and saves/restores the live value', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);

    const player = await loadNativeHeroPlayerMemory();
    const runtime = await NativeQuestRuntime.newGame(player);
    expect(runtime.heroVitals()).toEqual({ hitPoints: 100, hitPointsMax: 100 });
    expect(runtime.setHeroHitPoints(150)).toEqual({ known: true, value: 100 });
    expect(runtime.setHeroHitPoints(-1)).toEqual({ known: true, value: 0 });
    expect(runtime.setHeroHitPoints(37)).toEqual({ known: true, value: 37 });
    expect(runtime.setHeroHitPoints(0x80000000).known).toBe(false);

    const save = runtime.saveData();
    expect(save.heroVitals).toEqual({ hitPoints: 37, hitPointsMax: 100 });
    const restored = await NativeQuestRuntime.restore(save, await loadNativeHeroPlayerMemory());
    expect(restored.heroVitals()).toEqual({ hitPoints: 37, hitPointsMax: 100 });
  }, 30_000);

  it('uses the hash-checked health-potion modifier and persists the reduced current stack', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);

    const player = await loadNativeHeroPlayerMemory();
    const runtime = await NativeQuestRuntime.newGame(player);
    expect(runtime.setHeroHitPoints(37)).toEqual({ known: true, value: 37 });
    const used = await runtime.useHealthPotion();
    expect(used).toEqual({ known: true, value: { hitPointsBefore: 37, hitPointsAfter: 87, amountRemaining: 9 } });
    expect(runtime.heroItemStackAmount({ id: 'PC_Hero', name: 'PC_Hero' }, 'It_Potion_Health'))
      .toEqual({ known: true, value: 9 });
    const save = runtime.saveData();
    expect(save.consumedItems).toEqual([]);
    expect(save.heroInventory?.stacks.find((stack) => stack.templateName === 'It_Potion_Health')?.amount).toBe(9);

    const restored = await NativeQuestRuntime.restore(save, await loadNativeHeroPlayerMemory());
    expect(restored.heroVitals()).toEqual({ hitPoints: 87, hitPointsMax: 100 });
    expect(restored.heroItemStackAmount({ id: 'PC_Hero', name: 'PC_Hero' }, 'It_Potion_Health'))
      .toEqual({ known: true, value: 9 });
    const restoredAgain = await NativeQuestRuntime.restore(restored.saveData(), await loadNativeHeroPlayerMemory());
    expect(restoredAgain.heroItemStackAmount({ id: 'PC_Hero', name: 'PC_Hero' }, 'It_Potion_Health'))
      .toEqual({ known: true, value: 9 });
  }, 30_000);

  it('migrates legacy consumed overlays once with and without a saved inventory', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
    const original = await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory());
    const save = original.saveData();
    const potionGuid = 'afb494ac7a569f40b12c6aebf0a0d2d600000000';
    for (const heroInventory of [undefined, save.heroInventory]) {
      const legacy = { ...save, heroInventory, consumedItems: [{ templateGuid20: potionGuid, amount: 3 }] };
      const migrated = await NativeQuestRuntime.restore(legacy, await loadNativeHeroPlayerMemory());
      expect(migrated.heroItemStackAmount({ id: 'PC_Hero', name: 'PC_Hero' }, 'It_Potion_Health'))
        .toEqual({ known: true, value: 7 });
      expect(migrated.saveData().consumedItems).toEqual([]);
      const restoredAgain = await NativeQuestRuntime.restore(migrated.saveData(), await loadNativeHeroPlayerMemory());
      expect(restoredAgain.heroItemStackAmount({ id: 'PC_Hero', name: 'PC_Hero' }, 'It_Potion_Health'))
        .toEqual({ known: true, value: 7 });
    }
  }, 30_000);

  it('uses received potions after the starting stack is exhausted and refuses transferred-away potions', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
    const runtime = await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory());
    const potionGuid = 'afb494ac7a569f40b12c6aebf0a0d2d600000000';
    const potionTemplate = runtime.heroInventory.template(potionGuid)!;
    const equipment = runtime.heroInventory.snapshot().equipment;
    for (let index = 0; index < 10; index++) {
      runtime.setHeroHitPoints(0);
      expect(await runtime.useHealthPotion()).toMatchObject({ known: true, value: { amountRemaining: 9 - index } });
    }
    expect(runtime.heroInventory.findStackIndex(potionGuid)).toBe(-1);
    expect(runtime.heroInventory.snapshot().equipment).toEqual(equipment);
    const donor = new NativeInventory([potionTemplate], { observers: [] });
    expect(donor.createItems(potionGuid, 0, 3).status).toBe('applied');
    const context = { donorEntityGuid20: '1'.repeat(40), recipientEntityGuid20: '2'.repeat(40), recipientIsPlayer: true,
      questNotification: { status: 'known-absent' as const, source: 'test inventory transfer without a quest host' } };
    expect(donor.transferItemsTo(runtime.heroInventory, 0, 3, context).status).toBe('applied');
    runtime.setHeroHitPoints(0);
    expect(await runtime.useHealthPotion()).toMatchObject({ known: true, value: {
      hitPointsBefore: 0, hitPointsAfter: 50, amountRemaining: 2,
    } });
    const restored = await NativeQuestRuntime.restore(runtime.saveData(), await loadNativeHeroPlayerMemory());
    expect(restored.heroItemStackAmount({ id: 'PC_Hero', name: 'PC_Hero' }, 'It_Potion_Health'))
      .toEqual({ known: true, value: 2 });
    const potionIndex = restored.heroInventory.findStackIndex(potionGuid);
    expect(restored.heroInventory.transferItemsTo(donor, potionIndex, 2, { ...context, recipientIsPlayer: false }).status)
      .toBe('applied');
    restored.setHeroHitPoints(37);
    expect(await restored.useHealthPotion()).toMatchObject({ known: false, reason: /current Hero inventory/ });
    expect(restored.heroVitals().hitPoints).toBe(37);
    expect(restored.heroInventory.snapshot().stacks.map((stack) => stack.index))
      .toEqual(restored.heroInventory.snapshot().stacks.map((_, index) => index));
  }, 30_000);

  it('rechecks the last potion after source reads before two overlapping uses can apply HP', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
    const runtime = await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory());
    const potionGuid = 'afb494ac7a569f40b12c6aebf0a0d2d600000000';
    expect(runtime.heroInventory.consumeBrowserStack(runtime.heroInventory.findStackIndex(potionGuid), 9).status).toBe('applied');
    runtime.setHeroHitPoints(0);
    const used = await Promise.all([runtime.useHealthPotion(), runtime.useHealthPotion()]);
    expect(used.filter((result) => result.known)).toHaveLength(1);
    expect(used.filter((result) => !result.known)).toHaveLength(1);
    expect(runtime.heroVitals().hitPoints).toBe(50);
    expect(runtime.heroInventory.findStackIndex(potionGuid)).toBe(-1);
  }, 30_000);
});

describe('source-backed Ardea PickPocket inventory action', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates Jack source loot in Hero inventory and saves the target flag', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
    const people = JSON.parse(await readFile(resolve(process.cwd(), 'public/gothic3/scene.json'), 'utf8')).people;
    const jack = people.find((person: { name?: string }) => person.name === 'Jack');
    expect(jack).toBeDefined();

    const player = await loadNativeHeroPlayerMemory();
    const runtime = await NativeQuestRuntime.newGame(player, people);
    const npcRuntime = new BrowserArdeaNpcCombatRuntime(people,
      new NativeWorldData(new NativeGameplayResources()), 1);
    const actor = await npcRuntime.initializeOnContact(jack.id, 0, 1);
    expect(actor.rawLevelMax).toBe(20);
    expect(actor.treasureSetResolutions).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'TS_PickPocket_Poor', distribution: 7, status: 'pickpocket-source-resolved' }),
    ]));

    const theft = runtime.heroTheft();
    expect(theft.known).toBe(true);
    if (!theft.known) return;
    const unknownPerk = (name: string) => ({ status: 'unknown' as const, reason: name + ' is not part of this level-20 attempt.' });
    const skills: NativePickpocketSkills = { pickpocket2: unknownPerk('PickPocket II'), pickpocket3: unknownPerk('PickPocket III') };
    const action = resolveNativePickpocketAction(actor.rawLevelMax, theft.value, skills,
      actor.treasureSetResolutions, () => 0, () => 0);
    expect(action.status).toBe('succeeded');
    if (action.status !== 'succeeded') return;
    expect(action.loot.length).toBeGreaterThan(0);
    const receipt = await runtime.receiveNativePickpocketLoot(action.loot);
    expect(receipt.known).toBe(true);
    if (!receipt.known) return;
    for (const stack of receipt.value) {
      expect(runtime.heroInventoryStacks()).toContainEqual(expect.objectContaining({
        templateName: stack.templateName, amount: expect.any(Number), templateSource: {
          path: expect.stringMatching(/\.tple$/), sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      }));
    }
    expect(runtime.actorDialogs.setPickedPocket({ id: jack.id, name: jack.name }, true))
      .toEqual({ known: true, value: true });

    const save = runtime.saveData();
    expect(save.pickedPocketArdeaActors).toContain(jack.id);
    const restored = await NativeQuestRuntime.restore(save, await loadNativeHeroPlayerMemory(), people);
    expect(restored.actorDialogs.dialog({ id: jack.id, name: jack.name }))
      .toMatchObject({ known: true, value: { pickedPocket: true } });
    for (const stack of receipt.value) {
      expect(restored.heroInventoryStacks()).toContainEqual(expect.objectContaining({ templateName: stack.templateName }));
    }
    expect(restored.quests.state('Ardea_Pocket')?.status).toBe(0);
  }, 30_000);
});
