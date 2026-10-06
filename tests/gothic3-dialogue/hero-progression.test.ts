import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadNativeHeroPlayerMemory } from '../../src/gothic3/hero-property-runtime';
import { NativeQuestRuntime } from '../../src/gothic3/quest-runtime';

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
    const restoredPlayer = await loadNativeHeroPlayerMemory();
    const restored = await NativeQuestRuntime.restore(save, restoredPlayer);
    expect(restoredPlayer.memory.getXP()).toBe(1250);
    expect(restoredPlayer.memory.getLPAttribs()).toBe(10);
    expect(restoredPlayer.npc.values.Level).toBe(1);
    expect(restored.actorDialogs.dialogFlag(jack, 'TradeEnabled')).toEqual({ known: true, value: true });
    expect(restored.actorDialogs.dialogFlag(jack, 'PartyEnabled')).toEqual({ known: true, value: true });
    expect(restored.actorDialogs.dialogFlag(jack, 'TeachEnabled')).toEqual({ known: true, value: true });
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

  it('uses the hash-checked health-potion modifier and saves the consumed count', async () => {
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
    expect(save.consumedItems).toEqual([{ templateGuid20: 'afb494ac7a569f40b12c6aebf0a0d2d600000000', amount: 1 }]);

    const restored = await NativeQuestRuntime.restore(save, await loadNativeHeroPlayerMemory());
    expect(restored.heroVitals()).toEqual({ hitPoints: 87, hitPointsMax: 100 });
    expect(restored.heroItemStackAmount({ id: 'PC_Hero', name: 'PC_Hero' }, 'It_Potion_Health'))
      .toEqual({ known: true, value: 9 });
  }, 30_000);
});
