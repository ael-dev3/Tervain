import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserPickpocketActions } from '../../src/gothic3/browser-pickpocket';
import { loadNativeHeroPlayerMemory } from '../../src/gothic3/hero-property-runtime';
import { NativeGameplayResources, NativeWorldData } from '../../src/gothic3/native-data';
import { BrowserArdeaNpcCombatRuntime } from '../../src/gothic3/npc-combat-runtime';
import { NativeQuestRuntime } from '../../src/gothic3/quest-runtime';
import type { ScenePerson } from '../../src/gothic3/types';

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

async function session() {
  vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
  vi.stubGlobal('fetch', readLocalAsset);
  const people = JSON.parse(await readFile(resolve(assetRoot, 'scene.json'), 'utf8')).people as ScenePerson[];
  const jack = people.find((person) => person.name === 'Jack')!;
  const runtime = await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory(), people);
  const npcs = new BrowserArdeaNpcCombatRuntime(people, new NativeWorldData(new NativeGameplayResources()), 1);
  return { jack, runtime, npcs, actions: new BrowserPickpocketActions() };
}

describe('browser PickPocket action lifetime', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('keeps one attempt for an actor through asynchronous loot reads and a reopened panel', async () => {
    const { jack, runtime, npcs, actions } = await session();
    let resume!: () => void;
    let arrived!: () => void;
    const pending = new Promise<void>((resolve) => { resume = resolve; });
    const started = new Promise<void>((resolve) => { arrived = resolve; });
    const receive = runtime.receiveNativePickpocketLoot.bind(runtime);
    const receipt = vi.spyOn(runtime, 'receiveNativePickpocketLoot').mockImplementation(async (loot) => {
      arrived(); await pending; return receive(loot);
    });
    const random = vi.spyOn(npcs, 'nextGameRandomNumber').mockReturnValue(0);
    const first = actions.attempt(jack, runtime, npcs, 1);
    await started;
    expect(runtime.actorDialogs.dialog(jack)).toMatchObject({ known: true, value: { pickedPocket: false } });
    expect(await actions.attempt({ ...jack, id: jack.id.toUpperCase() }, runtime, npcs, 1)).toContain('already in progress');
    expect(receipt).toHaveBeenCalledTimes(1);
    expect(random).toHaveBeenCalledTimes(1);
    resume();
    expect(await first).toContain('PickPocket succeeded');
    expect(runtime.actorDialogs.dialog(jack)).toMatchObject({ known: true, value: { pickedPocket: true } });
    const savedInventory = runtime.heroInventory.snapshot();
    expect(await actions.attempt(jack, runtime, npcs, 1)).toContain('already marked PickedPocket');
    expect(runtime.heroInventory.snapshot()).toEqual(savedInventory);
    expect(random).toHaveBeenCalledTimes(1);
  }, 30_000);

  it('releases the actor after failed rolls or rejected source reads without creating loot', async () => {
    const { jack, runtime, npcs, actions } = await session();
    vi.spyOn(runtime, 'heroTheft').mockReturnValue({ known: true, value: 0 });
    vi.spyOn(npcs, 'nextGameRandomNumber').mockReturnValueOnce(99).mockReturnValue(0);
    const inventory = runtime.heroInventory.snapshot();
    expect(await actions.attempt(jack, runtime, npcs, 1)).toContain('PickPocket failed');
    expect(runtime.heroInventory.snapshot()).toEqual(inventory);
    const receive = runtime.receiveNativePickpocketLoot.bind(runtime);
    vi.spyOn(runtime, 'receiveNativePickpocketLoot').mockRejectedValueOnce(new Error('source read stopped')).mockImplementation(receive);
    await expect(actions.attempt(jack, runtime, npcs, 1)).rejects.toThrow('source read stopped');
    expect(runtime.heroInventory.snapshot()).toEqual(inventory);
    expect(runtime.actorDialogs.dialog(jack)).toMatchObject({ known: true, value: { pickedPocket: false } });
    expect(await actions.attempt(jack, runtime, npcs, 1)).toContain('PickPocket succeeded');
    expect(runtime.actorDialogs.dialog(jack)).toMatchObject({ known: true, value: { pickedPocket: true } });
  }, 30_000);
});
