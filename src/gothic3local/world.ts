import { BinaryReader, hex } from './binary';
import { type PropertyObject, openGenomfle, propString, readPropertyObject } from './genome';

/**
 * World placement, as observed in the compiled world (`Projects_compiled`): sectors and layers hold `.node` files,
 * GENOMFLE files whose body is a spatial tree of entities. The static world is also compiled into cells of 100 m
 * (`G3_World_01/SysDyn_{…}/G3_World_01_x{X}y0z{Z}_CStat.node`, X and Z the cell centre in centimetres).
 *
 * An entity record starts with version 0x53 (u16) and 1 (u16), its GUID, a zero word, and flags; at fixed offsets from
 * its start it holds its local matrix (+43) and world matrix (+107), each 16 floats in Direct3D row-vector order
 * (translation in the last row), its bounding volumes, then at +294 the number of its property sets and from +298 the
 * sets themselves, each a version (u16), a property object (`eCVisualMeshStatic_PS`, `eCSpeedTree_PS`,
 * `eCStaticPointLight_PS`, …) and the marker 0xDEADC0DE. Records are found by that header and checked by their
 * matrices and markers, so the tree around them need not be walked.
 */

export interface Entity {
  guid: string;
  /** World matrix, 16 floats in Direct3D order (it is Three.js's column-major order as stored). */
  world: Float32Array;
  /** World-space bounding box, centimetres. */
  box: Float32Array;
  /** View range from the record (centimetres), or 0. */
  range: number;
  sets: PropertyObject[];
}

const ENTITY_VERSION = 0x53;

function plausibleMatrix(m: Float32Array): boolean {
  if (Math.abs(m[3]!) > 1e-3 || Math.abs(m[7]!) > 1e-3 || Math.abs(m[11]!) > 1e-3 || Math.abs(m[15]! - 1) > 1e-3) return false;
  for (let i = 0; i < 16; i++) if (!Number.isFinite(m[i]!)) return false;
  // The rotation-scale rows must not be degenerate.
  for (let row = 0; row < 3; row++) {
    const l = Math.hypot(m[row * 4]!, m[row * 4 + 1]!, m[row * 4 + 2]!);
    if (l < 1e-4 || l > 1e4) return false;
  }
  return Math.abs(m[12]!) < 1e8 && Math.abs(m[13]!) < 1e8 && Math.abs(m[14]!) < 1e8;
}

function entityAt(r: BinaryReader, at: number, end: number): Entity | null {
  const v = r.view;
  if (at + 300 > end) return null;
  if (v.getUint16(at, true) !== ENTITY_VERSION || v.getUint16(at + 2, true) !== 1 || v.getUint32(at + 20, true) !== 0) return null;
  const world = new Float32Array(16);
  for (let i = 0; i < 16; i++) world[i] = v.getFloat32(at + 107 + i * 4, true);
  if (!plausibleMatrix(world)) return null;
  const count = v.getUint32(at + 294, true);
  if (count > 64) return null;
  const box = new Float32Array(6);
  for (let i = 0; i < 6; i++) box[i] = v.getFloat32(at + 171 + i * 4, true);
  const range = v.getFloat32(at + 280, true);
  const sets: PropertyObject[] = [];
  // Each property set: its version (u16), the object, and the marker 0xDEADC0DE.
  r.pos = at + 298;
  for (let i = 0; i < count; i++) {
    r.u16();
    const o = readPropertyObject(r);
    if (!o || o.end + 4 > end) return null;
    sets.push(o);
    r.pos = o.end;
    if (r.u32() !== SET_END) return null;
  }
  return { guid: hex(r.bytes.subarray(at + 4, at + 20)), world, box, range: Number.isFinite(range) ? range : 0, sets };
}

const SET_END = 0xdeadc0de;

/** All entity records in a node file. */
export function parseNodeEntities(bytes: Uint8Array): Entity[] {
  const f = openGenomfle(bytes);
  const r = f.reader;
  const out: Entity[] = [];
  const b = r.bytes;
  for (let at = 14; at + 300 <= f.end; at++) {
    if (b[at] !== ENTITY_VERSION || b[at + 1] !== 0 || b[at + 2] !== 1 || b[at + 3] !== 0) continue;
    let e: Entity | null = null;
    try {
      e = entityAt(r, at, f.end);
    } catch {
      e = null;
    }
    if (e) {
      out.push(e);
      // Continue after the record's property sets; nested records start later.
      at = r.pos - 1;
    }
  }
  return out;
}

export function setOf(e: Entity, className: string): PropertyObject | undefined {
  return e.sets.find((s) => s.className === className);
}

/** The mesh an entity shows, if any (a .xcmsh, or a .xlmsh level-of-detail list). Landscape cells give only the name. */
export function entityMesh(e: Entity): string {
  const s = setOf(e, 'eCVisualMeshStatic_PS');
  return propString(s, 'ResourceFilePath') || propString(s, 'ResourceFileName');
}

/** The SpeedTree an entity shows, if any. */
export function entitySpeedTree(e: Entity): string {
  const s = setOf(e, 'eCSpeedTree_PS');
  return s ? propString(s, 'ResourceFilePath') || propString(s, 'SpeedTreeFilePath') : '';
}

/* ------------------------------------------------------------------ cells */

export interface CellName {
  path: string;
  /** Cell centre, centimetres. */
  x: number;
  z: number;
}

const CELL = /_x(-?\d+)y-?\d+z(-?\d+)_CStat\.node$/i;

export function cellOf(path: string): CellName | null {
  const m = CELL.exec(path);
  return m ? { path, x: Number(m[1]), z: Number(m[2]) } : null;
}

/** Cells are 100 m squares; their names give their centres. */
export const CELL_SIZE = 10000;
