import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deriveNativeNpcStats, hasNativeReducedNpcFloor, nativeNpcDefaultXp } from '../../src/gothic3/combat';
import { initializeNativeNpcOnProcessingRange } from '../../src/gothic3/native-npc-processing';
import { NativeGameplayResources, NativeWorldData, sourceProperty } from '../../src/gothic3/native-data';
import type { NativeEntityRecord, NativeEntityIndex } from '../../src/gothic3/native-data';

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

function numberProperty(entity: NativeEntityRecord, set: string, name: string): number {
  const result = sourceProperty(entity, set, name);
  if (result.kind !== 'found' || typeof result.value !== 'number' || !Number.isInteger(result.value)) {
    throw new Error('Expected one decoded integer ' + set + '.' + name);
  }
  return result.value;
}

describe('native NPC processing-range stat initialization', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('derives the Ardea Orc Raider values from its hash-checked source record', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);

    const world = new NativeWorldData(new NativeGameplayResources());
    const files = await world.sourceFiles();
    const matches = files.filter((file) => file.source.path.endsWith('G3_Myrtana_01_Ardea_NPC_01.lrentdat'));
    expect(matches).toHaveLength(1);
    const [file] = matches;
    const byName = await world.entitiesNamed(file!.index, ['Orc_GameStartRaider_Warrior_01']);
    const [index] = byName.get('Orc_GameStartRaider_Warrior_01') ?? [];
    expect(index).toBeDefined();
    const loaded = await world.entity(index as NativeEntityIndex);
    expect(loaded.kind).toBe('found');
    if (loaded.kind !== 'found') throw new Error('Ardea Orc Raider source record is unavailable');

    const npc = loaded.value;
    expect(numberProperty(npc, 'gCNPC_PS', 'Level')).toBe(10);
    expect(numberProperty(npc, 'gCNPC_PS', 'LevelMax')).toBe(30);
    expect(numberProperty(npc, 'gCNPC_PS', 'Species')).toBe(5);
    expect(numberProperty(npc, 'gCDamageReceiver_PS', 'HitPoints')).toBe(1);
    expect(numberProperty(npc, 'gCDamageReceiver_PS', 'HitPointsMax')).toBe(1);

    const stats = deriveNativeNpcStats({ isPlayer: false,
      rawLevel: numberProperty(npc, 'gCNPC_PS', 'Level'),
      rawLevelMax: numberProperty(npc, 'gCNPC_PS', 'LevelMax'),
      species: numberProperty(npc, 'gCNPC_PS', 'Species') }, 0, 1);
    expect(stats).toMatchObject({ status: 'resolved', value: {
      level: 10, levelMax: 30, currentLevel: 10, strength: 25,
      refreshedHitPointsMax: 600, refreshedStaminaMax: 300,
    } });

    const processing = initializeNativeNpcOnProcessingRange({ isPlayer: false,
      rawLevel: numberProperty(npc, 'gCNPC_PS', 'Level'),
      rawLevelMax: numberProperty(npc, 'gCNPC_PS', 'LevelMax'),
      species: numberProperty(npc, 'gCNPC_PS', 'Species') }, {
      hitPoints: numberProperty(npc, 'gCDamageReceiver_PS', 'HitPoints'),
      hitPointsMax: numberProperty(npc, 'gCDamageReceiver_PS', 'HitPointsMax'),
      stamina: numberProperty(npc, 'gCDamageReceiver_PS', 'StaminaPoints'),
      staminaMax: numberProperty(npc, 'gCDamageReceiver_PS', 'StaminaPointsMax'),
    }, 0, 1);
    expect(processing).toMatchObject({ status: 'resolved', value: {
      hitPoints: 600, hitPointsMax: 600, stamina: 300, staminaMax: 300,
    }, evidence: expect.arrayContaining(['Script_Game:100cec10', 'Script_Game:10045c90', 'Script_Game:10045b20']) });
  }, 30_000);

  it('does not apply the native reduced HP and XP floors to species 47', () => {
    const reducedFloorSpecies = [24, 25, 26, 27, 28, 30, 31, 32, 35, 36, 37, 42, 43, 44, 45, 46];
    for (const species of reducedFloorSpecies) expect(hasNativeReducedNpcFloor(species)).toBe(true);
    for (const species of [23, 29, 33, 34, 38, 39, 40, 41, 47, 48]) expect(hasNativeReducedNpcFloor(species)).toBe(false);

    const stats = deriveNativeNpcStats({ isPlayer: false, rawLevel: 1, rawLevelMax: 30, species: 47 }, 0, 1);
    expect(stats).toMatchObject({ status: 'resolved', value: { refreshedHitPointsMax: 600 } });
    expect(nativeNpcDefaultXp({ isPlayer: false, rawLevel: 1, species: 47 })).toMatchObject({
      status: 'resolved', value: 50,
    });
    expect(deriveNativeNpcStats({ isPlayer: false, rawLevel: 1, rawLevelMax: 30, species: 46 }, 0, 1))
      .toMatchObject({ status: 'resolved', value: { refreshedHitPointsMax: 1 } });
    expect(nativeNpcDefaultXp({ isPlayer: false, rawLevel: 1, species: 46 })).toMatchObject({
      status: 'resolved', value: 25,
    });
  });
});
