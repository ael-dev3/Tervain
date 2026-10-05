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
    const award = runtime.awardExperienceScript(250);
    expect(award).toMatchObject({ known: true, value: {
      awardedAmount: 1250,
      progress: { xp: 1250, level: 1, lp: 10, levelUp: true },
    } });
    expect(player.memory.getXP()).toBe(1250);
    expect(player.memory.getLPAttribs()).toBe(10);
    expect(player.npc.values.Level).toBe(1);

    const save = runtime.saveData();
    const restoredPlayer = await loadNativeHeroPlayerMemory();
    const restored = await NativeQuestRuntime.restore(save, restoredPlayer);
    expect(restoredPlayer.memory.getXP()).toBe(1250);
    expect(restoredPlayer.memory.getLPAttribs()).toBe(10);
    expect(restoredPlayer.npc.values.Level).toBe(1);
    expect(restored.saveData().heroProgress).toEqual({ xp: 1250, level: 1, lpAttribs: 10, awards: [250] });
  }, 30_000);
});
