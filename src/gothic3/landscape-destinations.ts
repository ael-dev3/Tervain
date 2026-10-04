import { gameplayResources } from './native-data';
import type { NativeEntityRecord } from './native-data';
import type { TerrainDestination } from './terrain';

const references = [
  { name: 'Ardea', region: 'Myrtana', sourceName: 'Hamlar', key: 'world-2419:26817', guid: '2da6e6d0b7884a44a2bd7f9749379cc400000000', chunk: 'world/entity-chunks/2419-0096.json.gz' },
  { name: 'Xardas’s tower', region: 'Nordmar', sourceName: 'Xardas', key: 'world-2419:8291', guid: '77d7a2d399cef544a8aa96093f0ae40700000000', chunk: 'world/entity-chunks/2419-0030.json.gz' },
  { name: 'Lago', region: 'Varant', sourceName: 'Vatras', key: 'world-2419:6850', guid: 'd05b9deb6b8e3f4c8a025597a7a10c8200000000', chunk: 'world/entity-chunks/2419-0024.json.gz' },
] as const;

/** Preview locations read from exact stored actor records, never active routines. */
export async function landscapeDestinations(): Promise<TerrainDestination[]> {
  return Promise.all(references.map(async (reference) => {
    const document = await gameplayResources.read<{ entities: NativeEntityRecord[] }>(reference.chunk);
    const matches = document.entities.filter((entity) => entity.key === reference.key && entity.guid === reference.guid && entity.name === reference.sourceName);
    const matrix = matches[0]?.worldMatrix;
    if (matches.length !== 1 || !Array.isArray(matrix) || matrix.length !== 16 || !matrix.every(Number.isFinite)) throw new Error('Original landscape destination does not resolve: ' + reference.name);
    return {
      name: reference.name, region: reference.region,
      position: [matrix[12]! / 100, matrix[13]! / 100, -matrix[14]! / 100] as [number, number, number],
    };
  }));
}
