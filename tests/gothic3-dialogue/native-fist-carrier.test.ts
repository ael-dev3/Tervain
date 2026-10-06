import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NativeGameplayResources, NativeWorldData } from '../../src/gothic3/native-data';
import { loadNativeFistCarrier } from '../../src/gothic3/native-fist-carrier';

const assetRoot = resolve(process.cwd(), 'public/gothic3');
const pagesBase = '/Tervain/gothic3/';

async function readLocalAsset(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
  const marker = url.pathname.indexOf(pagesBase);
  if (marker < 0) return new Response('Unexpected asset route', { status: 404 });
  const assetPath = resolve(assetRoot, decodeURIComponent(url.pathname.slice(marker + pagesBase.length)));
  if (!assetPath.startsWith(assetRoot)) return new Response('Invalid asset path', { status: 400 });
  try { return new Response(await readFile(assetPath), { status: 200 }); }
  catch { return new Response('Missing test asset: ' + url.pathname, { status: 404 }); }
}

describe('original Fist melee carrier', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the unique source template and returns its Impact1 damage values', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
    const result = await loadNativeFistCarrier('1e51df278c13ed4f9d578491bbd3c4cd00000000',
      new NativeWorldData(new NativeGameplayResources()));

    expect(result.source).toMatchObject({ templateName: 'Fist', sourcePath: 'Items/Items/Action_Items_Fist.tple',
      sourceSha256: 'd4f3825a6e101917f4ca98b34d10aff4c70008c968a006554335c6cb73ce007e',
      templateGuid20: '5e6ca17c30a967489b27269fec4499ee00000000', damageType: 1, damageAmount: 10,
      damageHitMultiplier: 1, itemQualityBits: 0, spellPresent: false, projectilePresent: false });
    expect(result.carrier).toMatchObject({ id: result.source.templateGuid20,
      ownerId: '1e51df278c13ed4f9d578491bbd3c4cd00000000', damageKind: 1, damageAmount: 10,
      damageHitMultiplier: 1, itemQualityBits: 0,
      spellPresent: { status: 'known', value: false }, projectilePresent: { status: 'known', value: false } });
  }, 30_000);

  it('does not choose the deleted Fist placeholder by its duplicate name', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
    const world = new NativeWorldData(new NativeGameplayResources());
    await expect(world.templateByName('Fist')).resolves.toMatchObject({ kind: 'ambiguous' });
    await expect(world.templateByNameInSource('Fist', 'Items/Items/Action_Items_Fist.tple'))
      .resolves.toMatchObject({ kind: 'found', value: { file: 707, header: 1 } });
  }, 30_000);

  it('rejects a malformed actor identity before reading a template', async () => {
    await expect(loadNativeFistCarrier('PC_Hero', new NativeWorldData(new NativeGameplayResources())))
      .rejects.toThrow('20-byte actor identity');
  });
});
