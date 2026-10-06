import { describe, expect, it } from 'vitest';
import { NativeWorldData } from '../../src/gothic3/native-data';
import type { NativeGameplayManifest, NativeGameplayResources, NativeTemplateIndex } from '../../src/gothic3/native-data';

const GUID = '145ead7514ee364bab2e0402c3f7481c';
const header = (propertyId20: string | null, index = 0): NativeTemplateIndex => ({
  file: 21, header: index, name: 'SourceTemplate_' + index, guid: propertyId20,
  refTemplate: null, helperParent: false, propertySets: ['gCEnclave_PS'], dataChunk: 'templates/data.json',
});

function world(headers: readonly NativeTemplateIndex[]): NativeWorldData {
  const resources = {
    manifest: async () => ({ templates: { index: 'templates/index.json' } }) as NativeGameplayManifest,
    read: async <T>(path: string): Promise<T> => {
      if (path === 'templates/index.json') return { schema: 'gothic3-template-index-chunks-v1',
        headerCount: headers.length, chunks: [{ url: 'templates/headers.json', headers: headers.length }] } as T;
      if (path === 'templates/headers.json') return { headers } as T;
      throw new Error('Unexpected resource ' + path);
    },
  };
  return new NativeWorldData(resources as unknown as NativeGameplayResources);
}

describe('native template PropertyID source admission', () => {
  it('compares the four GUID DWORDs and preserves the actual source cache bytes', async () => {
    const source = header(GUID + '78563412');
    const data = world([source, header(null, 1)]);
    expect(await data.templateByPropertyId((GUID + 'ffffffff').toUpperCase()))
      .toEqual({ kind: 'found', value: source });
    expect((await data.templateByGuid(GUID + '00000000')).kind).toBe('missing');
    expect(await data.templateByGuid(GUID + '78563412')).toEqual({ kind: 'found', value: source });
  });

  it('retains duplicate native keys as ambiguous rather than choosing a header', async () => {
    const sources = [header(GUID + '00000000'), header(GUID + 'ffffffff', 1)];
    expect(await world(sources).templateByPropertyId(GUID + '01000000'))
      .toEqual({ kind: 'ambiguous', candidates: sources });
  });

  it('reports source absence without creating a live owner', async () => {
    const lookup = await world([header('a'.repeat(40))]).templateByPropertyId(GUID + '00000000');
    expect(lookup.kind).toBe('missing');
  });

  it.each(['', GUID, GUID + 'xyzxyzxy', 'g'.repeat(40)])('rejects malformed PropertyID %s', async value => {
    await expect(world([]).templateByPropertyId(value)).rejects.toThrow('20-byte PropertyID');
  });

  it('rejects an invalid indexed PropertyID before selecting a candidate', async () => {
    const data = world([header(GUID + '00000000'), header('bad', 1)]);
    await expect(data.templateByPropertyId(GUID + '00000000')).rejects.toThrow('invalid PropertyID');
  });
});
