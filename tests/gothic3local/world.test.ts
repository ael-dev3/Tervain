import { describe, expect, it } from 'vitest';
import { openGenomfle, readPropertyObject } from '../../src/gothic3local/genome';
import { parseVegetation } from '../../src/gothic3local/vegetation';
import { CELL_SIZE, cellOf, entityMesh, entitySpeedTree, parseNodeEntities, setOf } from '../../src/gothic3local/world';
import { nodeFile, writeVegetation } from './fixtures';

const at = (x: number, y: number, z: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

/** The eCVegetation_PS object in a test file. */
function vegetationSet(bytes: Uint8Array) {
  const f = openGenomfle(bytes);
  for (let p = 14; p < f.end; p++) {
    if (bytes[p] !== 1 || bytes[p + 1] !== 0 || bytes[p + 2] !== 1 || bytes[p + 3] !== 1) continue;
    f.reader.pos = p;
    try {
      const o = readPropertyObject(f.reader);
      if (o?.className === 'eCVegetation_PS') return { reader: f.reader, set: o };
    } catch {
      // Not an object here.
    }
  }
  throw new Error('no vegetation set');
}

describe('world nodes', () => {
  it('finds entity records and their property sets among unrelated data', () => {
    const entities = parseNodeEntities(
      nodeFile([
        { world: at(84000, 2150, -19900), mesh: 'G3_Ardea_House_01.xlmsh' },
        { world: at(84100, 2160, -19950), tree: 'G3_Tree_S_Linden_01.spt' },
      ]),
    );
    expect(entities).toHaveLength(2);
    expect(Array.from(entities[0]!.world.subarray(12, 15))).toEqual([84000, 2150, -19900]);
    expect(entityMesh(entities[0]!)).toBe('G3_Ardea_House_01.xlmsh');
    expect(entitySpeedTree(entities[1]!)).toBe('G3_Tree_S_Linden_01.spt');
    expect(setOf(entities[1]!, 'eCSpeedTree_PS')?.props.get('EnableWind')).toBe(true);
    expect(entities[0]!.range).toBe(5000);
    expect(entities[0]!.guid).not.toBe(entities[1]!.guid);
  });

  it('rejects a record whose world matrix is not a transform', () => {
    const skewed = at(1, 2, 3);
    skewed[15] = 7;
    expect(parseNodeEntities(nodeFile([{ world: skewed, mesh: 'Broken.xcmsh' }]))).toHaveLength(0);
  });

  it('names compiled cells by their centres', () => {
    expect(cellOf('G3_World_01/SysDyn_{X}/G3_World_01_x85000y0z-15000_CStat.node')).toMatchObject({ x: 85000, z: -15000 });
    expect(cellOf('G3_World_01/World/Ardea_City/Houses.node')).toBeNull();
    expect(CELL_SIZE).toBe(10000);
  });
});

describe('ground vegetation', () => {
  it('reads the meshes and the instance grid of a cell', () => {
    const tuft = {
      name: 'G3_Brush_Plant_Grass_05.xcmsh',
      texture: 'G3_Nature_Plant_Herbs_Composit_01_Diffuse_S1.dds',
      shading: 1,
      wind: 0.5,
      doubleSided: true,
      positions: [-10, 0, 0, 10, 0, 0, 10, 40, 0, -10, 40, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      uvs: [0.75, -0.25, 1, -0.25, 1, -0.41, 0.75, -0.41],
      indices: [0, 1, 2, 0, 2, 3],
    };
    const pebble = { ...tuft, name: 'G3_Brush_Object_Stone_Small_01.xcmsh', shading: 0, wind: 0, doubleSided: false };
    const bytes = nodeFile([], (w, s) =>
      writeVegetation(w, s, [tuft, pebble], [
        { box: [0, 0, 0, 1000, 100, 1000], instances: [{ mesh: 0, position: [100, 5, 200], rotation: [0, 0.3826834, 0, 0.9238795], scale: [0.9, 1.2], tint: 0xffb9c197 }] },
        {
          box: [1000, 0, 0, 2000, 100, 1000],
          instances: [
            { mesh: 1, position: [1500, 7, 400], rotation: [0, 0, 0, 1], scale: [1, 1], tint: 0xff808080 },
            { mesh: 0, position: [1600, 8, 500], rotation: [0, 0, 0, 1], scale: [1.5, 2], tint: 0xffffffff },
          ],
        },
      ]),
    );
    const { reader, set } = vegetationSet(bytes);
    const vegetation = parseVegetation(reader, set);
    expect(vegetation.meshes.map((m) => [m.index, m.name, m.shading, m.wind, m.doubleSided])).toEqual([
      [0, 'G3_Brush_Plant_Grass_05.xcmsh', 1, 0.5, true],
      [1, 'G3_Brush_Object_Stone_Small_01.xcmsh', 0, 0, false],
    ]);
    expect(vegetation.meshes[0]!.texture).toBe('G3_Nature_Plant_Herbs_Composit_01_Diffuse_S1.dds');
    expect(Array.from(vegetation.meshes[0]!.indices)).toEqual([0, 1, 2, 0, 2, 3]);
    expect(Array.from(vegetation.meshes[0]!.uvs.subarray(4, 6))).toEqual([1, Math.fround(-0.41)]);
    expect([vegetation.viewRange, vegetation.fadeStart]).toEqual([5000, 2500]);
    expect(vegetation.nodes.map((n) => [n.first, n.count])).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(Array.from(vegetation.mesh)).toEqual([0, 1, 0]);
    expect(Array.from(vegetation.position.subarray(3, 6))).toEqual([1500, 7, 400]);
    expect(vegetation.rotation[1]).toBeCloseTo(0.3826834, 6);
    expect(Array.from(vegetation.scale.subarray(4, 6))).toEqual([1.5, 2]);
    expect(vegetation.tint[0]).toBe(0xffb9c197);
  });
});
