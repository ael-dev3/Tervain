import { BinaryReader, latin1 } from './binary';

/**
 * Genome's serialisation, as observed in the installed files.
 *
 * A GENOMFLE file begins with "GENOMFLE", a version (u16) and the offset of its string table (u32). The table at that
 * offset is the marker 0xDEADBEEF, a version byte, a count (u32) and that many strings (u16 length, characters). In the
 * body every string is a u16 index into the table.
 *
 * A property object ("bCAccessorPropertyObject") is: version (u16), present (bool), version (u16), present (bool), the
 * class name (string), version (u16), a flag (bool), two class revisions (u16), the byte size of what follows (u32),
 * then the property list (version u16, count u32; each property is name, type name, version u16, byte size u32 and the
 * value), then the class's own data up to the given size.
 */

export interface Genomfle {
  reader: BinaryReader;
  strings: string[];
  /** Offset of the string table: the body ends here. */
  end: number;
}

const DEADBEEF = 0xdeadbeef;

export function isGenomfle(bytes: Uint8Array): boolean {
  return bytes.length >= 14 && latin1(bytes.subarray(0, 8)) === 'GENOMFLE';
}

/** A resource file's body: a GENOMFLE file, or (in older files) a property object with inline strings from offset 0. */
export function openResource(bytes: Uint8Array): Genomfle {
  if (isGenomfle(bytes)) return openGenomfle(bytes);
  return { reader: new BinaryReader(bytes, null, 0), strings: [], end: bytes.length };
}

export function openGenomfle(bytes: Uint8Array): Genomfle {
  if (!isGenomfle(bytes)) throw new Error('not a GENOMFLE file');
  const head = new BinaryReader(bytes, null, 8);
  head.u16();
  const tableAt = head.u32();
  if (tableAt > bytes.length) throw new Error(`string table offset ${tableAt} beyond the file`);
  const t = new BinaryReader(bytes, null, tableAt);
  if (t.u32() !== DEADBEEF) throw new Error('GENOMFLE string table marker missing');
  t.u8();
  const count = t.u32();
  const strings: string[] = [];
  for (let i = 0; i < count; i++) strings.push(t.inlineStr());
  return { reader: new BinaryReader(bytes, strings, 14), strings, end: tableAt };
}

export type PropertyValue = number | boolean | string | number[] | Uint8Array;

export interface PropertyObject {
  className: string;
  revision: number;
  props: Map<string, PropertyValue>;
  /** Where the class's own data starts and where the object ends, in the reader's bytes. */
  dataStart: number;
  end: number;
}

/** Decode a property value by its type name; unknown types come back as their raw bytes. */
export function readPropertyValue(r: BinaryReader, type: string, size: number): PropertyValue {
  const start = r.pos;
  let v: PropertyValue;
  if (type === 'float' && size === 4) v = r.f32();
  else if ((type === 'int' || type === 'long') && size === 4) v = r.i32();
  else if ((type === 'unsigned int' || type === 'unsigned long') && size === 4) v = r.u32();
  else if (type === 'short' && size === 2) v = r.i16();
  else if (type === 'unsigned short' && size === 2) v = r.u16();
  else if ((type === 'bool' || type === 'char' || type === 'unsigned char') && size === 1) v = type === 'bool' ? r.u8() !== 0 : r.u8();
  else if (/String$/.test(type) || type === 'eCLocString') v = size >= 2 ? r.str() : '';
  else if (type === 'bCVector' && size === 12) v = Array.from(r.floats(3));
  else if (type === 'bCVector2' && size === 8) v = Array.from(r.floats(2));
  else if (type === 'bCVector4' && size === 16) v = Array.from(r.floats(4));
  else if (type === 'bCQuaternion' && size === 16) v = Array.from(r.floats(4));
  else if (type === 'bCBox' && size === 24) v = Array.from(r.floats(6));
  else if (type === 'bCFloatColor' && size === 12) v = Array.from(r.floats(3));
  else if (type === 'bCFloatAlphaColor' && size === 16) v = Array.from(r.floats(4));
  else if (type === 'bCRange1' && size === 8) v = Array.from(r.floats(2));
  else if (type.startsWith('bTPropertyContainer<') && size === 6) {
    // An enumerated value: a version, then the value.
    r.u16();
    v = r.u32();
  } else v = r.bytesView(size).slice();
  r.pos = start + size;
  return v;
}

/** Read a property object at the reader's position; returns null where the object is marked absent. */
export function readPropertyObject(r: BinaryReader): PropertyObject | null {
  r.u16();
  if (!r.bool()) return null;
  r.u16();
  r.bool();
  const className = r.str();
  r.u16();
  r.bool();
  const revision = r.u16();
  r.u16();
  const size = r.u32();
  const start = r.pos;
  const end = start + size;
  if (end > r.length) throw new RangeError(`${className}: object of ${size} bytes runs past the data`);
  // Older objects carry an identity first: revision 1 a name, a GUID and a word; revision 81 a GUID and a word.
  if (revision < 0x40) r.str();
  if (revision <= 0x51) {
    r.skip(16);
    r.u32();
  }
  r.u16();
  const count = r.u32();
  const props = new Map<string, PropertyValue>();
  for (let i = 0; i < count; i++) {
    const name = r.str();
    const type = r.str();
    r.u16();
    const psize = r.u32();
    props.set(name, readPropertyValue(r, type, psize));
  }
  return { className, revision, props, dataStart: r.pos, end };
}

/** Does a property object start at this position? (Signature: 1, true, 1, true, a class name ending in a known suffix.) */
export function looksLikeObject(r: BinaryReader, at: number, classTest: (name: string) => boolean): boolean {
  const b = r.bytes;
  if (at + 8 > b.length) return false;
  if (b[at] !== 1 || b[at + 1] !== 0 || b[at + 2] !== 1 || b[at + 3] !== 1 || b[at + 4] !== 0 || b[at + 5] !== 1) return false;
  if (!r.strings) return false;
  const name = r.strings[b[at + 6]! | (b[at + 7]! << 8)];
  return name !== undefined && classTest(name);
}

export function propNumber(o: PropertyObject | undefined, key: string, fallback = 0): number {
  const v = o?.props.get(key);
  return typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : fallback;
}

export function propString(o: PropertyObject | undefined, key: string): string {
  const v = o?.props.get(key);
  return typeof v === 'string' ? v : '';
}

export function propBool(o: PropertyObject | undefined, key: string): boolean {
  const v = o?.props.get(key);
  return typeof v === 'boolean' ? v : typeof v === 'number' ? v !== 0 : false;
}

export function propVector(o: PropertyObject | undefined, key: string): number[] | null {
  const v = o?.props.get(key);
  return Array.isArray(v) ? v : null;
}
