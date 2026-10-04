import { deflateSync } from 'node:zlib';

/**
 * Synthetic Gothic 3 files for the from-your-install viewer's tests. They follow the layouts the viewer reads (see
 * docs/engineering/gothic3-local.md); no game data is used or needed.
 */

export class ByteWriter {
  private buf = new Uint8Array(256);
  length = 0;

  private ensure(n: number): void {
    if (this.length + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.length + n) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.buf.subarray(0, this.length));
    this.buf = next;
  }

  private view(n: number): DataView {
    this.ensure(n);
    const v = new DataView(this.buf.buffer, this.length, n);
    this.length += n;
    return v;
  }

  u8(v: number): this {
    this.view(1).setUint8(0, v);
    return this;
  }

  u16(v: number): this {
    this.view(2).setUint16(0, v, true);
    return this;
  }

  u32(v: number): this {
    this.view(4).setUint32(0, v >>> 0, true);
    return this;
  }

  i32(v: number): this {
    this.view(4).setInt32(0, v, true);
    return this;
  }

  f32(v: number): this {
    this.view(4).setFloat32(0, v, true);
    return this;
  }

  u64(v: number): this {
    const d = this.view(8);
    d.setUint32(0, v % 0x1_0000_0000, true);
    d.setUint32(4, Math.floor(v / 0x1_0000_0000), true);
    return this;
  }

  floats(values: readonly number[]): this {
    for (const v of values) this.f32(v);
    return this;
  }

  bytes(b: Uint8Array | readonly number[]): this {
    const a = b instanceof Uint8Array ? b : Uint8Array.from(b);
    this.ensure(a.length);
    this.buf.set(a, this.length);
    this.length += a.length;
    return this;
  }

  latin1(s: string): this {
    return this.bytes(Array.from(s, (c) => c.charCodeAt(0)));
  }

  patchU32(at: number, v: number): void {
    new DataView(this.buf.buffer).setUint32(at, v >>> 0, true);
  }

  patchU64(at: number, v: number): void {
    const d = new DataView(this.buf.buffer);
    d.setUint32(at, v % 0x1_0000_0000, true);
    d.setUint32(at + 4, Math.floor(v / 0x1_0000_0000), true);
  }

  done(): Uint8Array {
    return this.buf.slice(0, this.length);
  }
}

/** A GENOMFLE file's string table, filled as strings are written. */
export class Strings {
  readonly list: string[] = [];

  index(s: string): number {
    let i = this.list.indexOf(s);
    if (i < 0) {
      i = this.list.length;
      this.list.push(s);
    }
    return i;
  }
}

export type Writer = (w: ByteWriter, s: Strings) => void;

/** "GENOMFLE", a version, the string table's offset; the body from 14; then the table. */
export function genomfle(body: Writer): Uint8Array {
  const w = new ByteWriter();
  const s = new Strings();
  w.latin1('GENOMFLE').u16(1);
  const tableAt = w.length;
  w.u32(0);
  body(w, s);
  w.patchU32(tableAt, w.length);
  w.u32(0xdeadbeef).u8(1).u32(s.list.length);
  for (const str of s.list) w.u16(str.length).latin1(str);
  return w.done();
}

export const value = {
  f32: (v: number): Writer => (w) => void w.f32(v),
  bool: (v: boolean): Writer => (w) => void w.u8(v ? 1 : 0),
  str: (v: string): Writer => (w, s) => void w.u16(s.index(v)),
  enum: (v: number): Writer => (w) => void w.u16(1).u32(v),
  floats: (v: readonly number[]): Writer => (w) => void w.floats(v),
};

export type Prop = [name: string, type: string, write: Writer];

/** A property object: header, class name, revision, size, (identity), the property list, then the class's own data. */
export function writeObject(w: ByteWriter, s: Strings, className: string, props: readonly Prop[], classData: Writer, revision = 0x53): void {
  w.u16(1).u8(1).u16(1).u8(1).u16(s.index(className)).u16(1).u8(0).u16(revision).u16(revision);
  const sizeAt = w.length;
  w.u32(0);
  const start = w.length;
  if (revision < 0x40) w.u16(s.index(`${className} object`));
  if (revision <= 0x51) w.bytes(new Uint8Array(16).fill(7)).u32(0);
  w.u16(30).u32(props.length);
  for (const [name, type, write] of props) {
    w.u16(s.index(name)).u16(s.index(type)).u16(30);
    const at = w.length;
    w.u32(0);
    const from = w.length;
    write(w, s);
    w.patchU32(at, w.length - from);
  }
  classData(w, s);
  w.patchU32(sizeAt, w.length - start);
}

/* ------------------------------------------------------------------ archives */

export interface PackFile {
  path: string;
  data: Uint8Array;
  compress?: boolean;
}

/** A G3V0 pack: the files at the root and one subfolder holding `nested`. */
export function pack(files: readonly PackFile[], nested: readonly PackFile[] = []): Uint8Array {
  const w = new ByteWriter();
  w.u32(0).latin1('G3V0').u32(0).u32(0).u32(0).u32(0).u64(0).u64(0).u64(0);
  const place = (f: PackFile) => {
    const stored = f.compress ? new Uint8Array(deflateSync(f.data)) : f.data;
    const offset = w.length;
    w.bytes(stored);
    return { ...f, offset, packed: stored.length, unpacked: f.data.length, compression: f.compress ? 2 : 0 };
  };
  const top = files.map(place);
  const inner = nested.map(place);
  const tableAt = w.length;
  w.patchU64(0x18, tableAt);
  w.patchU64(0x20, tableAt);
  const name = (s: string) => {
    w.u32(s.length);
    if (s.length) w.latin1(s).u8(0);
  };
  const file = (e: ReturnType<typeof place>) => {
    w.bytes(new Uint8Array(24)).u64(e.unpacked).u32(0x80).u64(e.offset).u64(e.packed).u64(e.unpacked).u32(0).u32(e.compression);
    name(e.path);
    name(`C:\\build\\${e.path.replace(/\//g, '\\')}`);
  };
  // The root directory, with one subdirectory.
  w.bytes(new Uint8Array(24)).u64(0).u32(0x10);
  name('');
  w.u32(1);
  w.bytes(new Uint8Array(24)).u64(0).u32(0x10);
  name('Sub');
  w.u32(0).u32(inner.length);
  inner.forEach(file);
  w.u32(top.length);
  top.forEach(file);
  w.patchU64(0x28, w.length - 4);
  return w.done();
}

/* ------------------------------------------------------------------ images */

/** A compiled image (.ximg). `levels` are given largest first and stored smallest first, as the game stores them. */
export function ximg(width: number, height: number, format: 'DXT1' | 'DXT3' | 'DXT5' | 'ARGB8', levels: readonly Uint8Array[]): Uint8Array {
  const data = levels.slice().reverse();
  const size = data.reduce((n, l) => n + l.length, 0);
  const out = new Uint8Array(0x57 + size + 12);
  const v = new DataView(out.buffer);
  out.set(Array.from('GENOMFLE', (c) => c.charCodeAt(0)), 0);
  v.setUint32(0x0a, 0x57 + size, true);
  out.set(Array.from('G3IMG', (c) => c.charCodeAt(0)), 0x26);
  v.setUint32(0x2f, width, true);
  v.setUint32(0x33, height, true);
  v.setUint32(0x3f, levels.length, true);
  if (format === 'ARGB8') v.setUint32(0x47, 21, true);
  else out.set(Array.from(format, (c) => c.charCodeAt(0)), 0x47);
  let at = 0x57;
  for (const l of data) {
    out.set(l, at);
    at += l.length;
  }
  return out;
}

/** One DXT1 block of a single RGB565 colour. */
export function dxt1Block(rgb565: number): number[] {
  return [rgb565 & 255, rgb565 >> 8, 0, 0, 0, 0, 0, 0];
}

/* ------------------------------------------------------------------ meshes */

export interface ElementSpec {
  material: string;
  positions: readonly number[];
  indices: readonly number[];
  uv0?: readonly number[];
}

/** A compiled mesh with the given elements, each followed by a block of unrelated bytes, as in the game's files. */
export function meshFile(elements: readonly ElementSpec[], trailing = 41): Uint8Array {
  return genomfle((w, s) => {
    writeObject(w, s, 'eCResourceMeshComplex_PS', [['BoundingBox', 'bCBox', value.floats([-100, -100, -100, 100, 100, 100])]], (w) => {
      w.u16(35).u16(30).u32(0).u32(0).u32(elements.length);
      for (const el of elements) {
        w.u16(5).u32(0x1234).floats([-50, -50, -50, 50, 50, 50]).u32(0).u16(s.index(el.material));
        const streams: [number, number, readonly number[]][] = [[1, 3, el.positions]];
        if (el.uv0) streams.push([12, 2, el.uv0]);
        streams.push([0, 1, el.indices]);
        w.u32(streams.length);
        for (const [type, per, items] of streams) {
          w.u32(type).u16(1).u8(0).u32(items.length / per);
          if (type === 0) for (const i of items) w.u32(i);
          else w.floats(items);
        }
        for (let i = 0; i < trailing; i++) w.u8((i * 37 + 11) & 255);
      }
    });
  });
}

/* ------------------------------------------------------------------ world */

export interface EntitySpec {
  /** World matrix, 16 numbers in Direct3D row-vector order. */
  world: readonly number[];
  mesh?: string;
  tree?: string;
}

/** A world node file: some unrelated tree data, then entity records with their property sets. */
export function nodeFile(entities: readonly EntitySpec[], extra?: Writer): Uint8Array {
  return genomfle((w, s) => {
    w.bytes(new Uint8Array(23).fill(9));
    for (const [n, e] of entities.entries()) {
      const record = new Uint8Array(298);
      const v = new DataView(record.buffer);
      v.setUint16(0, 0x53, true);
      v.setUint16(2, 1, true);
      record.fill(n + 1, 4, 20);
      v.setUint32(20, 0, true);
      const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      identity.forEach((x, i) => v.setFloat32(43 + i * 4, x, true));
      e.world.forEach((x, i) => v.setFloat32(107 + i * 4, x, true));
      [-10, -10, -10, 10, 10, 10].forEach((x, i) => v.setFloat32(171 + i * 4, x, true));
      v.setFloat32(280, 5000, true);
      const sets: [string, Prop[]][] = [];
      if (e.mesh) sets.push(['eCVisualMeshStatic_PS', [['ResourceFileName', 'bCString', value.str(e.mesh)]]]);
      if (e.tree) sets.push(['eCSpeedTree_PS', [['ResourceFilePath', 'bCString', value.str(e.tree)], ['EnableWind', 'bool', value.bool(true)]]]);
      v.setUint32(294, sets.length, true);
      w.bytes(record);
      for (const [cls, props] of sets) {
        w.u16(1);
        writeObject(w, s, cls, props, (w) => void w.u8(1));
        w.u32(0xdeadc0de);
      }
    }
    extra?.(w, s);
  });
}

/* ------------------------------------------------------------------ vegetation */

export interface VegetationMeshSpec {
  name: string;
  texture: string;
  shading: number;
  wind: number;
  doubleSided: boolean;
  positions: readonly number[];
  normals: readonly number[];
  uvs: readonly number[];
  indices: readonly number[];
}

export interface VegetationInstanceSpec {
  mesh: number;
  position: readonly [number, number, number];
  rotation: readonly [number, number, number, number];
  scale: readonly [number, number];
  tint: number;
}

/** An `eCVegetation_PS` set's property object: the meshes, then a grid of nodes holding instances. */
export function writeVegetation(w: ByteWriter, s: Strings, meshes: readonly VegetationMeshSpec[], nodes: readonly { box: readonly number[]; instances: readonly VegetationInstanceSpec[] }[]): void {
  writeObject(
    w,
    s,
    'eCVegetation_PS',
    [
      ['UseDefaultViewRange', 'bool', value.bool(true)],
      ['ViewRange', 'float', value.f32(5000)],
      ['FadeOutStart', 'float', value.f32(2500)],
      ['GridNodeSize', 'float', value.f32(1000)],
    ],
    (w, s) => {
      w.u16(2).u8(1).u8(1).u32(0).u8(0).u16(s.index('eCVegetation_Mesh')).u32(meshes.length).u32(meshes.length);
      meshes.forEach((m, index) => {
        writeObject(
          w,
          s,
          'eCVegetation_Mesh',
          [
            ['MeshFilePath', 'bCString', value.str(`E:\\Work\\Data\\_compiledMesh\\Plants\\${m.name}`)],
            ['MeshShading', 'bTPropertyContainer<enum eEVegetationMeshShading>', value.enum(m.shading)],
            ['MinSpacing', 'float', value.f32(50)],
            ['WindStrength', 'float', value.f32(m.wind)],
            ['DoubleSided', 'bool', value.bool(m.doubleSided)],
          ],
          (w, s) => {
            w.u16(2).u16(0).u16(index).bytes([0, 9, 33, 221, 8, 205, 198, 1]).u16(s.index(m.texture)).floats([-20, 0, -20, 20, 60, 20]);
            w.u8(1).u32(m.positions.length / 3).floats(m.positions);
            w.u8(1).u32(m.normals.length / 3).floats(m.normals);
            w.u8(1).u32(m.uvs.length / 2).floats(m.uvs);
            w.u8(1).u32(m.indices.length);
            for (const i of m.indices) w.u32(i);
          },
        );
      });
      w.u16(2).f32(1000).i32(80).i32(-20).i32(91).i32(-1).u32(nodes.length);
      nodes.forEach((node, n) => {
        w.u32(n).u16(1).floats(node.box).u32(node.instances.length);
        for (const i of node.instances) w.u16(0).u16(i.mesh).floats(i.position).floats(i.rotation).floats(i.scale).u32(i.tint);
      });
      w.floats([-1e5, -1e5, -1e5, 1e5, 1e5, 1e5]);
    },
  );
}

/* ------------------------------------------------------------------ SpeedTree */

export type Token = [id: number, payload?: string | number | Uint8Array | readonly number[]];

/** A SpeedTree definition: u32 ids, each followed by its payload (strings length-prefixed, numbers as floats). */
export function speedTree(tokens: readonly Token[]): Uint8Array {
  const w = new ByteWriter();
  for (const [id, payload] of tokens) {
    w.u32(id);
    if (payload === undefined) continue;
    if (typeof payload === 'string') w.u32(payload.length).latin1(payload);
    else if (typeof payload === 'number') w.f32(payload);
    else if (payload instanceof Uint8Array) w.bytes(payload);
    else w.floats(payload);
  }
  return w.done();
}
