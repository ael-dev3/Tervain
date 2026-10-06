import { describe, expect, it } from 'vitest';
import { NativeWorldData } from '../../src/gothic3/native-data';
import type { NativeEntityIndex, NativeGameplayManifest, NativeSourceFile } from '../../src/gothic3/native-data';
import type { NativeGameplayResources } from '../../src/gothic3/native-data';

const source = { archive: 'Projects_compiled.p00', path: 'G3_World_01/SysDyn.lrentdat',
  sha256: 'a'.repeat(64), selection: 'test', layers: [] };
const row = (name: string, entityIndex: number): NativeEntityIndex => ({
  key: 'world-key-' + entityIndex, name, guid: entityIndex.toString(16).padStart(40, '0'), creator: null,
  file: 2419, entityIndex, propertySets: ['gCAnchor_PS'], hasGameplay: true,
  position: [1000 + entityIndex, 2000, -3000],
});

function worldData(rows: readonly NativeEntityIndex[], declaredCount = rows.length): NativeWorldData {
  const file: NativeSourceFile = { index: 2419, url: 'world/2419.json', source,
    entities: declaredCount, gameplayEntities: declaredCount };
  const descriptor = { schema: 'gothic3-entity-chunks-v1', source,
    entityCount: rows.length, parents: [], chunks: [],
    indexChunks: [{ url: 'world/index.json', bytes: 1, sha256: 'b'.repeat(64), entities: rows.length }] };
  const manifest = { schema: 'gothic3-gameplay-v1', world: { index: '', files: 'world/files.json', errors: '' } };
  const fakeResources = {
    manifest: async () => manifest as unknown as NativeGameplayManifest,
    read: async <T>(path: string): Promise<T> => {
      if (path === 'world/files.json') return [file] as T;
      if (path === 'world/2419.json') return descriptor as T;
      if (path === 'world/index.json') return { entities: rows } as T;
      throw new Error('Unexpected test resource: ' + path);
    },
  };
  return new NativeWorldData(fakeResources as unknown as NativeGameplayResources);
}

describe('selected native world entity names', () => {
  it('returns only requested matches and preserves duplicate names as ambiguous', async () => {
    const world = worldData([row('Ardea_4Friends', 10), row('Ardea_4Friends', 11), row('Unrequested', 12)]);
    const matches = await world.entitiesNamed(2419, ['Ardea_4Friends', 'Missing']);
    expect(matches.get('Ardea_4Friends')?.map((entity) => entity.entityIndex)).toEqual([10, 11]);
    expect(matches.get('Missing')).toEqual([]);
  });

  it('rejects an entity-index count mismatch', async () => {
    const world = worldData([row('Ardea_4Friends', 10)], 2);
    await expect(world.entitiesNamed(2419, ['Ardea_4Friends'])).rejects.toThrow('Native entity count differs: 2419');
  });
});
