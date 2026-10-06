import { describe, expect, it } from 'vitest';
import { NativeWorldData, NativeGameplayResources } from '../../src/gothic3/native-data';
import type { NativeEntityIndex } from '../../src/gothic3/native-data';
import { nativeRoutinePointPlacement, nativeRoutineStartPoint } from '../../src/gothic3/scene-routine-position';
import type { SourceArdeaActor } from '../../src/gothic3/actor-dialogue-state';
import type { ScenePerson } from '../../src/gothic3/types';

const point = 'bce7457eadf75f45b70381866846a48600000000';
const person: ScenePerson = { id: '1e51df278c13ed4f9d578491bbd3c4cd00000000', name: 'Diego',
  position: [-34.596641, -0.424346, -19.418203], rotationY: -2.78, source: 'native source actor' };

function property(name: string, value: unknown) { return { name, status: 'decoded', value }; }
function actor(points: { WorkingPoints?: string[]; RelaxingPoints?: string[]; SleepingPoints?: string[];
  current?: Partial<Record<'WorkingPoint' | 'RelaxingPoint' | 'SleepingPoint', string>> } = {}): SourceArdeaActor {
  const refs = (values: string[]) => ({ prefix: 1, count: values.length, items: values.map((rawGuid20) => ({ rawGuid20 })) });
  const working = points.WorkingPoints ?? [point];
  const relaxing = points.RelaxingPoints ?? [point];
  const sleeping = points.SleepingPoints ?? [point];
  return { name: person.name, guid: person.id, propertySets: [{ name: 'gCNavigation_PS', properties: [
    property('Routine', 'Start'), property('RoutineNames', { prefix: 1, count: 1, items: ['Start'] }),
    property('WorkingPoint', { rawGuid20: points.current?.WorkingPoint ?? working[0] }),
    property('RelaxingPoint', { rawGuid20: points.current?.RelaxingPoint ?? relaxing[0] }),
    property('SleepingPoint', { rawGuid20: points.current?.SleepingPoint ?? sleeping[0] }),
    property('WorkingPoints', refs(working)), property('RelaxingPoints', refs(relaxing)),
    property('SleepingPoints', refs(sleeping)),
  ] }] };
}

const origin: [number, number, number] = [92000, 5200, -12000];
const bounds = { min: [-125, -110, -200] as [number, number, number], max: [200, 30, 250] as [number, number, number] };
const target: NativeEntityIndex = { key: 'world-2419:26868', name: 'Stand', guid: point, file: 2419,
  entityIndex: 26868, creator: null, propertySets: ['gCAIHelper_FreePoint_PS'], hasGameplay: true,
  position: [88306.328125, 5115.416015625, -11121.1240234375], dataChunk: 'world/entity-chunks/2419-0096.json.gz' };

describe('source-backed Ardea routine positions', () => {
  it('selects the current native routine point when work/rest/sleep agree', () => {
    expect(nativeRoutineStartPoint(actor())).toEqual({ known: true, value: { routine: 'Start', pointId20: point } });
  });

  it('does not guess a day-part destination when routine points differ', () => {
    const result = nativeRoutineStartPoint(actor({ SleepingPoints: ['9e6d681baf75da47800341ad6fa0c0af00000000'] }));
    expect(result).toMatchObject({ known: false,
      reason: 'Native work/rest/sleep points differ; current day-part selection is not resolved.' });
  });

  it('requires stored current points to match the selected Start row', () => {
    expect(nativeRoutineStartPoint(actor({ current: { SleepingPoint: '9e6d681baf75da47800341ad6fa0c0af00000000' } })))
      .toMatchObject({ known: false, reason: 'Native Navigation.SleepingPoint differs from the selected Routine row.' });
  });

  it('treats cached variants of the same PropertyID as the same native point', () => {
    const result = nativeRoutineStartPoint(actor({ SleepingPoints: [point.slice(0, 32) + '79540100'] }));
    expect(result.known).toBe(true);
    if (result.known) {
      expect(result.value.routine).toBe('Start');
      expect(result.value.pointId20.slice(0, 32)).toBe(point.slice(0, 32));
    }
  });

  it('converts the resolved source position into the scene and uses its transform', () => {
    const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 88306.328125, 5115.416015625, -11121.1240234375, 1];
    const result = nativeRoutinePointPlacement(person, 'Start', point, 2419, [target], origin, bounds, matrix);
    expect(result).toMatchObject({ known: true, value: {
      personId: person.id, personName: 'Diego', routine: 'Start', pointId20: point, pointName: 'Stand',
      position: [-36.93671875, -0.84583984375, -8.788759765625], rotationY: 0,
    } });
  });

  it('matches native PropertyIDs by the first 16 bytes and rejects ambiguous targets', () => {
    const cacheVariant = { ...target, guid: target.guid!.slice(0, 32) + '79540100' };
    expect(nativeRoutinePointPlacement(person, 'Start', point, 2419, [cacheVariant], origin, bounds).known).toBe(true);
    expect(nativeRoutinePointPlacement(person, 'Start', point, 2419, [target, cacheVariant], origin, bounds))
      .toMatchObject({ known: false, reason: 'Native routine point PropertyID is ambiguous in its source file.' });
  });

  it('finds only requested entity IDs within one verified source index', async () => {
    const sha256 = 'a'.repeat(64);
    const file = { index: 2419, url: 'world/2419.json', entities: 2,
      source: { path: 'SysDyn.lrentdat', sha256 } };
    const rows: NativeEntityIndex[] = [target, { ...target, key: 'world-2419:99', guid: '1'.repeat(40), entityIndex: 99 }];
    const reads: Record<string, unknown> = {
      'world/files.json': [file],
      'world/2419.json': { schema: 'gothic3-entity-chunks-v1', source: { sha256 }, entityCount: 2,
        chunks: [], indexChunks: [{ url: 'world/indices/2419-0000.json.gz', entities: 2 }] },
      'world/indices/2419-0000.json.gz': { entities: rows },
    };
    const resources = { manifest: async () => ({ world: { files: 'world/files.json' } }),
      read: async (path: string) => reads[path] } as unknown as NativeGameplayResources;
    const data = new NativeWorldData(resources);
    const matches = await data.entitiesByPropertyIds(2419, [point.slice(0, 32) + '79540100']);
    expect(matches.get(point.slice(0, 32))).toEqual([target]);
  });
});
