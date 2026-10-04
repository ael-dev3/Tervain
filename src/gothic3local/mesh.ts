import { BinaryReader, latin1 } from './binary';
import { openResource, readPropertyObject } from './genome';

/**
 * Compiled meshes (.xcmsh), as observed: a GENOMFLE file holding an `eCResourceMeshComplex_PS` object (properties:
 * BoundingBox, ResourcePriority). Its own data is a version (u16 35), a version (u16 30), two u32 words, the element
 * count (u32), then the elements. An element is: version (u16), a flags word (u32), its bounding box (6 floats), a word
 * (u32), its material name (string), the number of vertex streams (u32), and the streams; then a block of data this
 * viewer does not need (index groups and bounding volumes, of varying length). A stream is a type (u32), a version
 * (u16 1), a flag (u8), a count (u32) and count items:
 *
 *   0 indices (u32)          1 positions (3 floats)   3 normals (3 floats)
 *   4 colour (u32 ARGB)       5 second colour (u32)
 *   12, 15, 18, 21 texture-coordinate sets 0–3 (2 floats)            73 lightmap coordinates (2 floats)
 *   64 tangents (3 floats)    72 a further vector (3 floats)
 *
 * Because the block after the streams varies, the next element is found by its header: version, flags, a valid box,
 * a material index within the string table, a sensible stream count and a stream header. Units are centimetres in a
 * left-handed, Y-up space.
 */

export interface MeshElement {
  material: string;
  box: Float32Array;
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array | null;
  /** Vertex colours as RGBA floats 0..1 (from ARGB), or null. */
  colors: Float32Array | null;
  /** Texture-coordinate sets 0–3 (streams 12, 15, 18, 21); materials choose among them. */
  uvs: (Float32Array | null)[];
  /** Lightmap coordinates (stream 73). */
  lightmapUv: Float32Array | null;
  tangents: Float32Array | null;
}

export interface G3Mesh {
  box: Float32Array;
  elements: MeshElement[];
}

export const STREAM = {
  index: 0,
  position: 1,
  normal: 3,
  color: 4,
  color2: 5,
  uv0: 12,
  uv1: 15,
  uv2: 18,
  uv3: 21,
  tangent: 64,
  lightmap: 73,
} as const;

// 72 is a further per-vertex vector, not drawn here.
const ITEM_SIZE: Record<number, number> = { 0: 4, 1: 12, 3: 12, 4: 4, 5: 4, 12: 8, 15: 8, 18: 8, 21: 8, 64: 12, 72: 12, 73: 8 };

function streamItemSize(type: number, count: number, r: BinaryReader): number {
  const known = ITEM_SIZE[type];
  if (known !== undefined) return known;
  throw new Error(`unknown vertex stream type ${type} (${count} items at ${r.pos})`);
}

/** Is there an element header at `at`? (The flags word describes the element's streams, so it varies.) */
function elementAt(r: BinaryReader, at: number, version: number): boolean {
  const v = r.view;
  if (at + 51 > r.length) return false;
  if (v.getUint16(at, true) !== version || v.getUint32(at + 2, true) > 0xffff) return false;
  for (let i = 0; i < 3; i++) {
    const lo = v.getFloat32(at + 6 + i * 4, true);
    const hi = v.getFloat32(at + 18 + i * 4, true);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) return false;
  }
  // The material: a string-table index, or an inline name.
  let after = at + 36;
  const mat = v.getUint16(at + 34, true);
  if (r.strings) {
    if (mat >= r.strings.length) return false;
  } else {
    if (at + 36 + mat + 10 > r.length) return false;
    for (let i = 0; i < mat; i++) {
      const c = r.bytes[at + 36 + i]!;
      if (c < 32 || c > 126) return false;
    }
    after += mat;
  }
  const streams = v.getUint32(after, true);
  if (streams < 1 || streams > 32 || after + 15 > r.length) return false;
  const type = v.getUint32(after + 4, true);
  const size = ITEM_SIZE[type];
  if (size === undefined || v.getUint16(after + 8, true) !== 1) return false;
  const count = v.getUint32(after + 11, true);
  return count > 0 && after + 15 + count * size <= r.length;
}

function readElement(r: BinaryReader): MeshElement {
  r.u16();
  r.u32();
  const box = r.floats(6);
  r.u32();
  const material = r.str();
  const streamCount = r.u32();
  const el: MeshElement = { material, box, indices: new Uint32Array(0), positions: new Float32Array(0), normals: null, colors: null, uvs: [null, null, null, null], lightmapUv: null, tangents: null };
  for (let s = 0; s < streamCount; s++) {
    const type = r.u32();
    r.u16();
    r.u8();
    const count = r.u32();
    const size = streamItemSize(type, count, r);
    switch (type) {
      case STREAM.index:
        el.indices = r.uints(count);
        break;
      case STREAM.position:
        el.positions = r.floats(count * 3);
        break;
      case STREAM.normal:
        el.normals = r.floats(count * 3);
        break;
      case STREAM.color: {
        const raw = r.uints(count);
        const c = new Float32Array(count * 4);
        for (let i = 0; i < count; i++) {
          const v = raw[i]!;
          c[i * 4] = ((v >>> 16) & 255) / 255;
          c[i * 4 + 1] = ((v >>> 8) & 255) / 255;
          c[i * 4 + 2] = (v & 255) / 255;
          c[i * 4 + 3] = (v >>> 24) / 255;
        }
        el.colors = c;
        break;
      }
      case STREAM.uv0:
        el.uvs[0] = r.floats(count * 2);
        break;
      case STREAM.uv1:
        el.uvs[1] = r.floats(count * 2);
        break;
      case STREAM.uv2:
        el.uvs[2] = r.floats(count * 2);
        break;
      case STREAM.uv3:
        el.uvs[3] = r.floats(count * 2);
        break;
      case STREAM.lightmap:
        el.lightmapUv = r.floats(count * 2);
        break;
      case STREAM.tangent:
        el.tangents = r.floats(count * 3);
        break;
      default:
        r.skip(count * size);
    }
  }
  return el;
}

export function parseMesh(bytes: Uint8Array): G3Mesh {
  const f = openResource(bytes);
  const r = f.reader;
  const obj = readPropertyObject(r);
  if (!obj || !/^eCResourceMesh/.test(obj.className)) throw new Error(`not a mesh resource (${obj?.className ?? 'empty'})`);
  const boxProp = obj.props.get('BoundingBox');
  const box = new Float32Array(Array.isArray(boxProp) ? boxProp : [0, 0, 0, 0, 0, 0]);
  r.pos = obj.dataStart;
  r.u16();
  r.u16();
  r.u32();
  r.u32();
  const count = r.u32();
  const elements: MeshElement[] = [];
  if (count === 0) return { box, elements };
  const version = r.view.getUint16(r.pos, true);
  elements.push(readElement(r));
  for (let i = 1; i < count; i++) {
    // Skip the block that ends the previous element: the next element is the first header that reads as a sound
    // element (a candidate that does not is a coincidence in that block's data).
    let at = r.pos;
    for (;;) {
      while (at < obj.end && !elementAt(r, at, version)) at++;
      if (at >= obj.end) throw new Error(`mesh element ${i} of ${count} not found`);
      r.pos = at;
      try {
        const el = readElement(r);
        if (!elementProblem(el)) {
          elements.push(el);
          break;
        }
      } catch {
        // Not an element after all.
      }
      at++;
    }
  }
  return { box, elements };
}

/** Validate an element: indices in range, streams the same length. Returns a reason, or null when it is sound. */
export function elementProblem(el: MeshElement): string | null {
  const n = el.positions.length / 3;
  if (n === 0) return 'no positions';
  if (el.indices.length % 3) return 'index count not a multiple of 3';
  for (const i of el.indices) if (i >= n) return `index ${i} beyond ${n} vertices`;
  if (el.normals && el.normals.length !== n * 3) return 'normal count';
  for (const uv of el.uvs) if (uv && uv.length !== n * 2) return 'uv count';
  if (el.colors && el.colors.length !== n * 4) return 'colour count';
  return null;
}

/**
 * LOD descriptions (.xlmsh): an `eCResourceMeshLoD_PS` object with inline strings (not a GENOMFLE file) whose own data
 * lists the level meshes, nearest first. They are found here as the inline strings naming .xcmsh files.
 */
export function parseLodList(bytes: Uint8Array): string[] {
  const out: string[] = [];
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let at = 0; at + 2 < bytes.length; at++) {
    const n = v.getUint16(at, true);
    if (n < 7 || at + 2 + n > bytes.length) continue;
    const s = latin1(bytes.subarray(at + 2, at + 2 + n));
    if (/^[\w .-]+\.xcmsh$/i.test(s)) {
      out.push(s);
      at += 1 + n;
    }
  }
  return out;
}
