import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateBrowserArdeaFistHit, HERO_SOURCE_ID } from '../../src/gothic3/browser-melee';
import { nativeOutlawAttitude } from '../../src/gothic3/combat';
import { loadNativeFistCarrier } from '../../src/gothic3/native-fist-carrier';
import { loadNativeHeroPlayerMemory } from '../../src/gothic3/hero-property-runtime';
import { NativeGameplayResources, NativeWorldData } from '../../src/gothic3/native-data';
import { BrowserArdeaNpcCombatRuntime } from '../../src/gothic3/npc-combat-runtime';
import type { BrowserArdeaNpcCombatState } from '../../src/gothic3/npc-combat-runtime';
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

async function scenePeople(): Promise<ScenePerson[]> {
  return JSON.parse(await readFile(resolve(process.cwd(), 'public/gothic3/scene.json'), 'utf8')).people as ScenePerson[];
}

function npcRuntime(people: readonly ScenePerson[]): BrowserArdeaNpcCombatRuntime {
  return new BrowserArdeaNpcCombatRuntime(people, new NativeWorldData(new NativeGameplayResources()));
}

describe('browser combat for source-pinned Ardea actors', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('derives a supported Hero fist hit for each of the 15 placed Raiders and preserves zero-HP state', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);

    const people = await scenePeople();
    const raiders = people.filter((person) => /^Orc_GameStartRaider_(?:Warrior|Scout)_\d{2}$/.test(person.name));
    expect(raiders).toHaveLength(15);
    expect(new Set(raiders.map((person) => person.id.toLowerCase())).size).toBe(15);

    const player = await loadNativeHeroPlayerMemory();
    const quests = await NativeQuestRuntime.newGame(player, people);
    const fist = await loadNativeFistCarrier(HERO_SOURCE_ID);
    const npcs = npcRuntime(people);
    const resolved: { id: string; before: number; after: number }[] = [];
    const unsupported: { name: string; reason: string }[] = [];

    for (const person of raiders) {
      const actor = await npcs.initializeOnContact(person.id, 0, 1);
      const hit = calculateBrowserArdeaFistHit({ actor, player, runtime: quests, fist, style: 'attack', difficulty: 1 });
      if (hit.status === 'unsupported') {
        unsupported.push({ name: person.name, reason: hit.reason });
      } else {
        expect(hit.zeroHitPointsDisposition).toMatchObject({ status: 'unknown' });
        resolved.push({ id: person.id, before: hit.hitPointsBefore, after: hit.hitPointsAfter });
      }
    }

    expect(unsupported).toEqual([]);
    expect(resolved).toHaveLength(15);
    expect(resolved.every((hit) => hit.before > 0 && hit.after < hit.before)).toBe(true);

    const defeatedActorId = raiders[0]!.id;
    const defeated = npcs.get(defeatedActorId);
    expect(defeated).toBeDefined();
    for (let swing = 0; swing < 100 && defeated!.hitPoints > 0; swing++) {
      const hit = calculateBrowserArdeaFistHit({ actor: defeated!, player, runtime: quests, fist,
        style: 'attack', difficulty: 1 });
      if (hit.status === 'unsupported') throw new Error(hit.reason);
      defeated!.hitPoints = hit.hitPointsAfter;
    }
    expect(defeated!.hitPoints).toBe(0);
    const saved = npcs.saveData();
    const restored = npcRuntime(people);
    expect(await restored.restore(saved, 0, 1)).toMatchObject({ restored: 15, skipped: [] });
    expect(restored.get(defeatedActorId!)?.hitPoints).toBe(0);
  }, 60_000);

  it('places and damages all three real Jack targets with source Outlaw kill disposition and retained HP', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
    const people = await scenePeople();
    const bandits = people.filter((person) => /^Ardea_OutNovice_0[123]$/.test(person.name));
    expect(bandits.map((person) => ({ name: person.name, id: person.id, position: person.position }))).toEqual([
      { name: 'Ardea_OutNovice_01', id: '0c3ad5c499a37e479901ef8b1a19877900000000',
        position: [110.432422, -0.384512, 81.931602] },
      { name: 'Ardea_OutNovice_02', id: 'ef1adbed209ec647b20ebc9fc989642500000000',
        position: [106.492656, 0.197041, 84.789746] },
      { name: 'Ardea_OutNovice_03', id: '81630a69bab9c44b9df46b76df0ac7b100000000',
        position: [105.497187, 0.138384, 79.031816] },
    ]);
    const player = await loadNativeHeroPlayerMemory();
    const quests = await NativeQuestRuntime.newGame(player, people);
    const fist = await loadNativeFistCarrier(HERO_SOURCE_ID);
    const npcs = npcRuntime(people);
    for (const person of bandits) {
      const actor = await npcs.initializeOnContact(person.id, 0, 1);
      expect(actor).toMatchObject({ rawLevel: 0, rawLevelMax: 20, species: 0, npcType: 0,
        politicalAlignment: 7, routineAiMode: 0, armorIsRobe: { status: 'known', value: false },
        hitPoints: 400, stamina: 200, processingRange: { hitPointsMax: 400, staminaMax: 200 } });
      let swings = 0;
      while (actor.hitPoints > 0 && swings++ < 100) {
        const hit = calculateBrowserArdeaFistHit({ actor, player, runtime: quests, fist, style: 'attack', difficulty: 1 });
        if (hit.status !== 'resolved') throw new Error(person.name + ': ' + hit.reason);
        expect(hit.zeroHitPointsDisposition).toMatchObject({ status: 'known', value: 'kill' });
        expect(hit.hitPointsAfter).toBeLessThan(hit.hitPointsBefore);
        actor.hitPoints = hit.hitPointsAfter;
      }
      expect(actor.hitPoints).toBe(0);
    }
    const saved = npcs.saveData();
    const restored = npcRuntime(people);
    expect(await restored.restore(saved, 0, 1)).toEqual({ restored: 3, skipped: [] });
    for (const person of bandits) expect(restored.get(person.id)?.hitPoints).toBe(0);
  }, 60_000);

  it('rejects altered bandit identities, source receipts, armor and Outlaw inputs before applying damage', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
    const people = await scenePeople();
    const person = people.find((candidate) => candidate.name === 'Ardea_OutNovice_01')!;
    const actor = await npcRuntime(people).initializeOnContact(person.id, 0, 1);
    const player = await loadNativeHeroPlayerMemory();
    const quests = await NativeQuestRuntime.newGame(player, people);
    const fist = await loadNativeFistCarrier(HERO_SOURCE_ID);
    const changed: Partial<BrowserArdeaNpcCombatState>[] = [
      { personId: '0'.repeat(40) }, { name: 'Ardea_OutNovice_02' }, { sourcePath: 'another-source.lrentdat' },
      { sourceSha256: '0'.repeat(64) }, { politicalAlignment: 0 }, { species: 5 }, { npcType: 3 },
      { routineAiMode: 4 }, { rawLevelMax: 30 }, { currentAttackerId: HERO_SOURCE_ID },
      { armorIsRobe: { status: 'unknown', reason: 'Undecoded slot17' } },
      { armorIsRobe: { status: 'known', value: true, source: actor.armorIsRobe.status === 'known' ? actor.armorIsRobe.source : '' } },
      { armorIsRobe: { status: 'known', value: false, source: '' } },
    ];
    for (const change of changed) {
      expect(calculateBrowserArdeaFistHit({ actor: { ...actor, ...change }, player, runtime: quests,
        fist, style: 'attack', difficulty: 1 }).status).toBe('unsupported');
    }
    expect(actor.hitPoints).toBe(400);
  }, 60_000);
});

describe('native Outlaw attitude branch', () => {
  it('uses numeric alignment7 and the other actor humanoid predicate, leaving undecided pairs at0', () => {
    for (const species of [0, 5]) {
      expect(nativeOutlawAttitude({ politicalAlignment: 7, species: 23 }, { politicalAlignment: 0, species }))
        .toMatchObject({ status: 'resolved', value: 4 });
      expect(nativeOutlawAttitude({ politicalAlignment: 0, species }, { politicalAlignment: 7, species: 23 }))
        .toMatchObject({ status: 'resolved', value: 4 });
    }
    for (const [self, other] of [
      [{ politicalAlignment: 7, species: 0 }, { politicalAlignment: 7, species: 0 }],
      [{ politicalAlignment: 7, species: 0 }, { politicalAlignment: 0, species: 23 }],
      [{ politicalAlignment: 0, species: 23 }, { politicalAlignment: 7, species: 0 }],
      [{ politicalAlignment: 0, species: 0 }, { politicalAlignment: 1, species: 5 }],
    ] as const) expect(nativeOutlawAttitude(self, other)).toMatchObject({ status: 'resolved', value: 0 });
    expect(nativeOutlawAttitude({ politicalAlignment: NaN, species: 0 }, { politicalAlignment: 0, species: 0 }).status)
      .toBe('unsupported');
  });
});
