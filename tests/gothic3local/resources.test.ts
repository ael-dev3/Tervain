import { describe, expect, it } from 'vitest';
import { BinaryReader } from '../../src/gothic3local/binary';
import { looksLikeObject, openGenomfle, openResource, propBool, propNumber, propString, propVector, readPropertyObject } from '../../src/gothic3local/genome';
import { decodeLevel, levelSize, parseImage } from '../../src/gothic3local/image';
import { parseLodList, parseMesh } from '../../src/gothic3local/mesh';
import { ByteWriter, dxt1Block, genomfle, meshFile, value, writeObject, ximg } from './fixtures';

describe('GENOMFLE resources and property objects', () => {
  it('reads strings through the table and typed properties', () => {
    const bytes = genomfle((w, s) =>
      writeObject(
        w,
        s,
        'eCTestThing_PS',
        [
          ['Range', 'float', value.f32(12.5)],
          ['Enabled', 'bool', value.bool(true)],
          ['Name', 'bCString', value.str('Ardea')],
          ['Mode', 'bTPropertyContainer<enum eETestMode>', value.enum(3)],
          ['Offset', 'bCVector', value.floats([1, 2, 3])],
          ['Blob', 'bCSomethingElse', (w) => void w.bytes([9, 8, 7])],
        ],
        (w) => void w.u32(0xabcdef),
      ),
    );
    const f = openGenomfle(bytes);
    const o = readPropertyObject(f.reader)!;
    expect(o.className).toBe('eCTestThing_PS');
    expect(propNumber(o, 'Range')).toBe(12.5);
    expect(propBool(o, 'Enabled')).toBe(true);
    expect(propString(o, 'Name')).toBe('Ardea');
    expect(propNumber(o, 'Mode')).toBe(3);
    expect(propVector(o, 'Offset')).toEqual([1, 2, 3]);
    expect(o.props.get('Blob')).toEqual(new Uint8Array([9, 8, 7]));
    expect(new DataView(bytes.buffer).getUint32(o.dataStart, true)).toBe(0xabcdef);
    expect(o.end).toBe(o.dataStart + 4);
    expect(looksLikeObject(f.reader, 14, (c) => c.startsWith('eCTest'))).toBe(true);
    expect(looksLikeObject(f.reader, 15, () => true)).toBe(false);
  });

  it('skips the identity older revisions carry before their properties', () => {
    for (const revision of [1, 0x51, 0x53]) {
      const bytes = genomfle((w, s) => writeObject(w, s, 'eCOld_PS', [['Count', 'int', (w) => void w.i32(-4)]], () => {}, revision));
      const o = readPropertyObject(openGenomfle(bytes).reader)!;
      expect([revision, o.props.get('Count')]).toEqual([revision, -4]);
    }
  });

  it('reads objects with inline strings when a resource has no string table', () => {
    // Inline strings: a u16 length and the characters, from offset 0.
    const w = new ByteWriter();
    const inline = (s: string) => w.u16(s.length).latin1(s);
    w.u16(1).u8(1).u16(1).u8(1);
    inline('eCResourceMeshLoD_PS');
    w.u16(1).u8(0).u16(0x53).u16(0x53);
    const sizeAt = w.length;
    w.u32(0);
    const start = w.length;
    w.u16(30).u32(1);
    inline('Count');
    inline('int');
    w.u16(30).u32(4).i32(2);
    inline('Tree_LOD0.xcmsh');
    inline('Tree_LOD1.xcmsh');
    w.patchU32(sizeAt, w.length - start);
    const bytes = w.done();
    const o = readPropertyObject(openResource(bytes).reader)!;
    expect([o.className, o.props.get('Count')]).toEqual(['eCResourceMeshLoD_PS', 2]);
    expect(parseLodList(bytes)).toEqual(['Tree_LOD0.xcmsh', 'Tree_LOD1.xcmsh']);
  });

  it('rejects a GENOMFLE file whose string table is damaged', () => {
    const bytes = genomfle((w) => void w.u32(1));
    const table = new DataView(bytes.buffer).getUint32(10, true);
    bytes[table] = 0;
    expect(() => openGenomfle(bytes)).toThrow(/marker/);
    expect(() => new BinaryReader(bytes).skip(bytes.length + 1)).toThrow(RangeError);
  });
});

describe('compiled images', () => {
  // 8×8 DXT1 with four levels, each a different colour, stored smallest first.
  const RED = 0xf800;
  const GREEN = 0x07e0;
  const BLUE = 0x001f;
  const WHITE = 0xffff;
  const levels = [
    Uint8Array.from([...dxt1Block(RED), ...dxt1Block(RED), ...dxt1Block(RED), ...dxt1Block(RED)]),
    Uint8Array.from(dxt1Block(GREEN)),
    Uint8Array.from(dxt1Block(BLUE)),
    Uint8Array.from(dxt1Block(WHITE)),
  ];

  it('finds the full-size level at the end of the data and the smaller ones before it', () => {
    const image = parseImage(ximg(8, 8, 'DXT1', levels));
    expect([image.width, image.height, image.format, image.faces.length, image.faces[0]!.length]).toEqual([8, 8, 'DXT1', 1, 4]);
    const rgba = decodeLevel('DXT1', image.faces[0]![0]!, 8, 8);
    expect(Array.from(rgba.subarray(0, 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(rgba.subarray(rgba.length - 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(decodeLevel('DXT1', image.faces[0]![1]!, 4, 4).subarray(0, 4))).toEqual([0, 255, 0, 255]);
    expect(Array.from(decodeLevel('DXT1', image.faces[0]![3]!, 1, 1))).toEqual([255, 255, 255, 255]);
  });

  it('decodes explicit DXT3 alpha and A8R8G8B8 pixels', () => {
    const alpha = Array.from({ length: 8 }, (_, i) => (2 * i) | ((2 * i + 1) << 4));
    const dxt3 = parseImage(ximg(4, 4, 'DXT3', [Uint8Array.from([...alpha, ...dxt1Block(WHITE)])]));
    const a = decodeLevel('DXT3', dxt3.faces[0]![0]!, 4, 4);
    expect(Array.from({ length: 16 }, (_, i) => a[i * 4 + 3])).toEqual(Array.from({ length: 16 }, (_, i) => i * 17));
    const argb = parseImage(ximg(1, 1, 'ARGB8', [Uint8Array.from([10, 20, 30, 40])]));
    expect(Array.from(decodeLevel('ARGB8', argb.faces[0]![0]!, 1, 1))).toEqual([30, 20, 10, 40]);
  });

  it('sizes levels in whole blocks', () => {
    expect([levelSize('DXT1', 2, 2), levelSize('DXT5', 8, 4), levelSize('ARGB8', 3, 2)]).toEqual([8, 32, 24]);
    expect(() => parseImage(new Uint8Array(0x60))).toThrow(/G3IMG/);
  });
});

describe('compiled meshes', () => {
  it('reads each element and finds the next one past the unrelated block between them', () => {
    const quad = { positions: [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0], indices: [0, 1, 2, 0, 2, 3], uv0: [0, 0, 1, 0, 1, 1, 0, 1] };
    const mesh = parseMesh(
      meshFile([
        { material: 'G3_Wood_01.xshmat', ...quad },
        { material: 'G3_Thatch_01.xshmat', positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] },
      ]),
    );
    expect(mesh.elements.map((e) => e.material)).toEqual(['G3_Wood_01.xshmat', 'G3_Thatch_01.xshmat']);
    expect(Array.from(mesh.elements[0]!.indices)).toEqual(quad.indices);
    expect(Array.from(mesh.elements[0]!.uvs[0]!)).toEqual(quad.uv0);
    expect(mesh.elements[1]!.uvs[0]).toBeNull();
    expect(Array.from(mesh.box)).toEqual([-100, -100, -100, 100, 100, 100]);
  });
});
