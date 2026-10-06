import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadNativeHeroPlayerMemory } from '../../src/gothic3/hero-property-runtime';
import { NativeQuestRuntime } from '../../src/gothic3/quest-runtime';
import type { NativeQuestSessionSave } from '../../src/gothic3/quest-runtime';
import type { ScenePerson } from '../../src/gothic3/types';

const assetRoot = resolve(process.cwd(), 'public/gothic3');
const pagesBase = '/Tervain/gothic3/';
const banditIds = new Set([
  '0c3ad5c499a37e479901ef8b1a19877900000000',
  'ef1adbed209ec647b20ebc9fc989642500000000',
  '81630a69bab9c44b9df46b76df0ac7b100000000',
]);
const dialogFields = ['talkedToArdeaActors', 'pickedPocketArdeaActors', 'tradeEnabledArdeaActors',
  'partyEnabledArdeaActors', 'teachEnabledArdeaActors'] as const;

interface SceneReceipt {
  files: { archive: string; path: string; sha256: string }[];
  actors: [string, string][];
}

async function readLocalAsset(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
  const marker = url.pathname.indexOf(pagesBase);
  if (marker < 0) return new Response('Unexpected asset route', { status: 404 });
  const path = resolve(assetRoot, decodeURIComponent(url.pathname.slice(marker + pagesBase.length)));
  if (!path.startsWith(assetRoot)) return new Response('Invalid asset path', { status: 400 });
  try { return new Response(await readFile(path), { status: 200 }); }
  catch { return new Response('Missing test asset: ' + url.pathname, { status: 404 }); }
}

async function sourceScene(): Promise<{ people: ScenePerson[]; previousPeople: ScenePerson[] }> {
  const people = JSON.parse(await readFile(resolve(assetRoot, 'scene.json'), 'utf8')).people as ScenePerson[];
  const previousPeople = people.filter((person) => !banditIds.has(person.id.toLowerCase()));
  expect(people).toHaveLength(70);
  expect(previousPeople).toHaveLength(67);
  return { people, previousPeople };
}

function receipt(save: NativeQuestSessionSave): SceneReceipt {
  return JSON.parse(save.sources.sceneActors!) as SceneReceipt;
}

describe('audited Jack bandit scene save migration', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('migrates the exact 67-actor source receipt, preserving previous flags and progress and seeding three bandits', async () => {
    const { people, previousPeople } = await sourceScene();
    const previous = await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory(), previousPeople);
    for (const person of previousPeople) {
      const dialog = previous.actorDialogs.dialog(person);
      if (!dialog.known || !dialog.value.hasDialog) continue;
      expect(previous.actorDialogs.setPickedPocket(person, true)).toEqual({ known: true, value: true });
      for (const [field, key] of [['TradeEnabled', 'tradeEnabled'], ['PartyEnabled', 'partyEnabled'],
        ['TeachEnabled', 'teachEnabled']] as const) {
        expect(previous.actorDialogs.setDialogFlag(person, field, !dialog.value[key]))
          .toEqual({ known: true, value: true });
      }
      if (dialog.value.hasNpc) {
        expect(previous.beginInfoManager(person)).toEqual({ known: true, value: true });
        previous.endInfoManager(person);
      }
    }
    expect(previous.quests.run('Jack_KillBandits')).toEqual({ kind: 'applied' });
    expect(previous.recordNpcKilled('Ardea_OutNovice_01').kind).toBe('applied');
    expect(previous.awardExperienceScript(40).known).toBe(true);
    expect(previous.setHeroHitPoints(37)).toEqual({ known: true, value: 37 });
    previous.gameEvents.set('JackBanditMigrationRegression');
    const oldSave = previous.saveData();
    const currentSeed = await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory(), people);
    const currentSave = currentSeed.saveData();
    expect(receipt(oldSave).actors).toHaveLength(67);
    expect(receipt(currentSave).actors).toHaveLength(70);
    expect(receipt(oldSave).files).toEqual(receipt(currentSave).files);
    expect(receipt(oldSave).files).toContainEqual({ archive: 'Projects_compiled.p00',
      path: 'G3_World_01/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat',
      sha256: '28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938' });

    const restored = await NativeQuestRuntime.restore(oldSave, await loadNativeHeroPlayerMemory(), people);
    for (const person of previousPeople) expect(restored.actorDialogs.dialog(person)).toEqual(previous.actorDialogs.dialog(person));
    for (const person of people.filter((actor) => banditIds.has(actor.id))) {
      expect(restored.actorDialogs.dialog(person)).toEqual(currentSeed.actorDialogs.dialog(person));
    }
    const migratedSave = restored.saveData();
    expect(migratedSave.sources).toEqual({ ...oldSave.sources, sceneActors: currentSave.sources.sceneActors });
    for (const field of dialogFields) expect(migratedSave[field]).toEqual(oldSave[field]);
    for (const field of ['clock', 'quests', 'gameEvents', 'givenInfoIds', 'heroProgress', 'heroQuestRewards',
      'heroVitals', 'heroInventory'] as const) expect(migratedSave[field]).toEqual(oldSave[field]);
    const restoredAgain = await NativeQuestRuntime.restore(migratedSave, await loadNativeHeroPlayerMemory(), people);
    for (const person of previousPeople) expect(restoredAgain.actorDialogs.dialog(person)).toEqual(previous.actorDialogs.dialog(person));
  }, 60_000);

  it('rejects edited source file receipts, old actor identities, removals, duplicates, additions and partial bandit sets', async () => {
    const { people, previousPeople } = await sourceScene();
    const oldSave = (await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory(), previousPeople)).saveData();
    const currentSave = (await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory(), people)).saveData();
    const mutate: ((value: SceneReceipt) => void)[] = [
      (value) => { value.files[0]!.sha256 = '0'.repeat(64); },
      (value) => { value.files[0]!.path += '.changed'; },
      (value) => { value.files[0]!.archive = 'other.pak'; },
      (value) => { value.files.pop(); },
      (value) => { value.actors[0]![0] = '0'.repeat(40); },
      (value) => { value.actors[0]![1] += '_renamed'; },
      (value) => { value.actors.pop(); },
      (value) => { value.actors.push([...value.actors[0]!] as [string, string]); },
      (value) => { value.actors.push(['f'.repeat(40), 'UnexpectedActor']); },
      (value) => { value.actors.push(receipt(currentSave).actors.find(([id]) => banditIds.has(id))!); },
    ];
    for (const change of mutate) {
      const changed = receipt(oldSave);
      change(changed);
      const save = { ...oldSave, sources: { ...oldSave.sources, sceneActors: JSON.stringify(changed) } };
      await expect(NativeQuestRuntime.restore(save, await loadNativeHeroPlayerMemory(), people))
        .rejects.toThrow(/different Ardea scene actor records/);
    }
    await expect(NativeQuestRuntime.restore(oldSave, await loadNativeHeroPlayerMemory(), people.slice(1)))
      .rejects.toThrow(/different Ardea scene actor records/);
    await expect(NativeQuestRuntime.restore(currentSave, await loadNativeHeroPlayerMemory(), previousPeople))
      .rejects.toThrow(/different Ardea scene actor records/);
  }, 60_000);

  it('rejects new-bandit flags in an old receipt and retains their flags after a current-scene save', async () => {
    const { people, previousPeople } = await sourceScene();
    const oldSave = (await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory(), previousPeople)).saveData();
    const bandit = people.find((person) => banditIds.has(person.id))!;
    for (const field of dialogFields) {
      await expect(NativeQuestRuntime.restore({ ...oldSave, [field]: [...oldSave[field]!, bandit.id] },
        await loadNativeHeroPlayerMemory(), people)).rejects.toThrow(/outside its original Ardea scene actor records/);
    }
    const current = await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory(), people);
    expect(current.beginInfoManager(bandit)).toEqual({ known: true, value: true });
    current.endInfoManager(bandit);
    expect(current.actorDialogs.setPickedPocket(bandit, true)).toEqual({ known: true, value: true });
    for (const field of ['TradeEnabled', 'PartyEnabled', 'TeachEnabled'] as const) {
      expect(current.actorDialogs.setDialogFlag(bandit, field, true)).toEqual({ known: true, value: true });
    }
    const saved = current.saveData();
    const restored = await NativeQuestRuntime.restore(saved, await loadNativeHeroPlayerMemory(), people);
    expect(restored.actorDialogs.dialog(bandit)).toEqual(current.actorDialogs.dialog(bandit));
    for (const field of dialogFields) expect(restored.saveData()[field]).toContain(bandit.id);
  }, 60_000);
});
