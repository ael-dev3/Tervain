import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NativeGameplayResources, NativeWorldData } from '../../src/gothic3/native-data';
import { BrowserArdeaNpcCombatRuntime } from '../../src/gothic3/npc-combat-runtime';
import type { BrowserArdeaNpcCombatSessionSave } from '../../src/gothic3/npc-combat-runtime';
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

async function scenePeople(): Promise<ScenePerson[]> {
  return JSON.parse(await readFile(resolve(process.cwd(), 'public/gothic3/scene.json'), 'utf8')).people as ScenePerson[];
}

function runtime(people: readonly ScenePerson[]): BrowserArdeaNpcCombatRuntime {
  return new BrowserArdeaNpcCombatRuntime(people, new NativeWorldData(new NativeGameplayResources()));
}

describe('Ardea NPC browser combat state source bridge', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('resolves a rendered Orc to its exact source actor and applies processing-range point refresh', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
    const people = await scenePeople();
    const warrior = people.find((person) => person.name === 'Orc_GameStartRaider_Warrior_01');
    expect(warrior).toBeDefined();

    const actor = await runtime(people).initializeOnContact(warrior!.id, 0, 1);
    expect(actor).toMatchObject({ personId: warrior!.id, name: warrior!.name,
      sourcePath: 'G3_World_01/Myrtana/Ardea_City/G3_Myrtana_01_Ardea_NPC_01/G3_Myrtana_01_Ardea_NPC_01.lrentdat',
      sourceSha256: '46b70fff7a3844e8c16e6e71d69d8f7c57b5f1e8429d73e814b2ce9ffe9f2ac0',
      rawLevel: 10, rawLevelMax: 30, species: 5, npcType: 0, action: 24, aniState: 2,
      currentAttackerId: null, treasureSets: ['TS_Plunder_Orc_Warrior', 'TS_Weaponry_Orc_Halberd', '', '', ''],
      serializedEquipmentSlots: { status: 'resolved', slots: [
        { index: 16, templateGuid20: 'cabc7f17d0934e4887fa7b143b35064400000000',
          templateName: 'Orc_Head_S12',
          templateSourcePath: 'NPC/__Master_Orcs/OrcBodyParts_Orc_Head_S12.tple',
          templateSourceSha256: 'd8973d2d3f4e8b19d73041be8443064abafd205a408387c973b7796d03fb502c',
          itemGuid20: '79220ebbac147840a428aa71eb33512800000000' },
        { index: 17, templateGuid20: '7655489e313e004ab73a2108b537461800000000',
          templateName: 'Orc_Body_Warrior_Outlaw',
          templateSourcePath: 'NPC/__Master_Orcs/OrcBodyParts_Orc_Body_Warrior_Outlaw.tple',
          templateSourceSha256: '0c8cc6735162e4a816cecbe39828e40d29314a11b13acde7c5d23f2de37ef522',
          itemGuid20: '1ce894592b52a042b9975d84611a4c8800000000' },
      ] },
      initialization: 'browser-source-processing-range-state',
      hitPoints: 600, stamina: 300,
      processingRange: { hitPointsMax: 600, staminaMax: 300 } });
    expect(actor.treasureSetResolutions).toHaveLength(2);
    expect(actor.treasureSetResolutions[0]).toMatchObject({
      name: 'TS_Plunder_Orc_Warrior', distribution: 0, status: 'generation-not-implemented',
      sourcePath: 'Treasure/NPC/Plunder_NPC_TS_Plunder_Orc_Warrior.tple',
      sourceSha256: 'ee1ca5684ffa3685e8ae1c8083341412d62c2c4e664daba29855f961c86f11e2',
    });
    expect(actor.treasureSetResolutions[1]).toMatchObject({
      name: 'TS_Weaponry_Orc_Halberd', distribution: 3, status: 'weaponry-recipe-resolved',
      sourcePath: 'Treasure/NPC/Weaponry_NPC_TS_Weaponry_Orc_Halberd.tple',
      weaponry: [{ itemName: 'It_Axe_OrcSword_01', itemGuid20: 'a4f100d0f5b6a347b3acfaa532a6976500000000',
        configuredAmount: 1, equippedAmount: 1, sourceQuality: 0, inventoryQuality: 256,
        useType: 52, category: 1, equipSlots: { primary: 6, alternative: 0 },
        carrier: { ownerId: warrior!.id, damageKind: 2, damageAmount: 125, damageHitMultiplier: 1,
          itemQualityBits: 256, spellPresent: { status: 'known', value: false },
          projectilePresent: { status: 'known', value: false } } }],
    });
  }, 30_000);

  it('restores mutable NPC points only when source identity and derived maxima match', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
    const people = await scenePeople();
    const warrior = people.find((person) => person.name === 'Orc_GameStartRaider_Warrior_01')!;
    const first = runtime(people);
    const actor = await first.initializeOnContact(warrior.id, 0, 1);
    actor.hitPoints = 451;
    actor.stamina = 212;
    const save = first.saveData();

    const restoredRuntime = runtime(people);
    const restored = await restoredRuntime.restore(save, 0, 1);
    expect(restored).toEqual({ restored: 1, skipped: [] });
    expect(restoredRuntime.get(warrior.id)).toMatchObject({ hitPoints: 451, stamina: 212,
      processingRange: { hitPointsMax: 600, staminaMax: 300 } });

    const tampered = { ...save, actors: save.actors.map((entry) => ({ ...entry,
      sourceSha256: '0'.repeat(64), hitPoints: 601 })) } satisfies BrowserArdeaNpcCombatSessionSave;
    const rejectedRuntime = runtime(people);
    const rejected = await rejectedRuntime.restore(tampered, 0, 1);
    expect(rejected.restored).toBe(0);
    expect(rejected.skipped).toHaveLength(1);
    expect(rejectedRuntime.get(warrior.id)).toBeNull();
  }, 30_000);

  it('rejects contact identities that are not placed source characters', async () => {
    const people = await scenePeople();
    await expect(runtime(people).initializeOnContact('0'.repeat(40), 0, 1))
      .rejects.toThrow('does not identify a placed Ardea source person');
  });
});
