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

describe('source-backed quest success rewards', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('applies Ardea skill and XP rewards plus PoliticalFame, then saves and restores them', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);

    const player = await loadNativeHeroPlayerMemory();
    const runtime = await NativeQuestRuntime.newGame(player);
    const thievery = player.memory.getBaseValue('THF');
    const politicalFame = [...player.memory.politicalFameValues()];

    expect(runtime.canSucceedQuest('Ardea_Pocket')).toEqual({ known: true, value: true });
    expect(runtime.quests.run('Ardea_Pocket').kind).toBe('applied');
    expect(runtime.quests.succeed('Ardea_Pocket').kind).toBe('applied');
    expect(player.memory.getBaseValue('THF')).toBe(thievery + 1);

    expect(runtime.canSucceedQuest('Anog_ReportInog')).toEqual({ known: true, value: true });
    expect(runtime.quests.run('Anog_ReportInog').kind).toBe('applied');
    expect(runtime.quests.succeed('Anog_ReportInog').kind).toBe('applied');
    expect(player.memory.politicalFameValues()[3]).toBe(politicalFame[3]! + 1);
    expect(runtime.quests.state('Ardea_Pocket')?.status).toBe(2);
    expect(runtime.quests.state('Anog_ReportInog')?.status).toBe(2);

    expect(runtime.canSucceedQuest('Abbas_Artefakt').known).toBe(false);
    const beforeUnsupportedQuest = {
      xp: player.memory.getXP(), politicalFame: [...player.memory.politicalFameValues()],
    };
    expect(runtime.quests.run('Abbas_Artefakt').kind).toBe('applied');
    expect(runtime.quests.succeed('Abbas_Artefakt').kind).toBe('unsupported');
    expect(runtime.quests.state('Abbas_Artefakt')?.status).toBe(1);
    expect(player.memory.getXP()).toBe(beforeUnsupportedQuest.xp);
    expect(player.memory.politicalFameValues()).toEqual(beforeUnsupportedQuest.politicalFame);

    expect(runtime.canSucceedQuest('Ardea_Revolution').known).toBe(false);
    const flagsBeforeRevolution = player.memory.getTutorialFlags();
    expect(runtime.quests.run('Ardea_Revolution').kind).toBe('applied');
    expect(runtime.quests.succeed('Ardea_Revolution').kind).toBe('unsupported');
    expect(runtime.quests.state('Ardea_Revolution')?.status).toBe(1);
    expect(player.memory.getTutorialFlags()).toBe(flagsBeforeRevolution);
    const save = runtime.saveData();
    const restoredPlayer = await loadNativeHeroPlayerMemory();
    const restored = await NativeQuestRuntime.restore(save, restoredPlayer);
    expect(restoredPlayer.memory.getBaseValue('THF')).toBe(thievery + 1);
    expect(restoredPlayer.memory.politicalFameValues()).toEqual([
      ...politicalFame.slice(0, 3), politicalFame[3]! + 1, ...politicalFame.slice(4),
    ]);
    expect(restored.saveData().heroQuestRewards).toEqual(save.heroQuestRewards);
  }, 30_000);
});
