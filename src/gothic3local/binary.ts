/**
 * Little-endian reading over a byte array. Gothic 3's files are little-endian throughout; strings are Latin-1. In
 * GENOMFLE files a string is a 16-bit index into the file's string table; elsewhere it is a 16-bit length and characters.
 */
export class BinaryReader {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  /** The GENOMFLE string table, or null where strings are written inline. */
  readonly strings: readonly string[] | null;
  pos = 0;

  constructor(bytes: Uint8Array, strings: readonly string[] | null = null, pos = 0) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.strings = strings;
    this.pos = pos;
  }

  get length(): number {
    return this.bytes.length;
  }

  get remaining(): number {
    return this.bytes.length - this.pos;
  }

  need(n: number): void {
    if (n < 0 || this.pos + n > this.bytes.length) throw new RangeError(`read past the end (${this.pos} + ${n} > ${this.bytes.length})`);
  }

  u8(): number {
    this.need(1);
    return this.bytes[this.pos++]!;
  }

  bool(): boolean {
    return this.u8() !== 0;
  }

  u16(): number {
    this.need(2);
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }

  i16(): number {
    this.need(2);
    const v = this.view.getInt16(this.pos, true);
    this.pos += 2;
    return v;
  }

  u32(): number {
    this.need(4);
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }

  i32(): number {
    this.need(4);
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }

  f32(): number {
    this.need(4);
    const v = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return v;
  }

  /** A 64-bit unsigned value; offsets and sizes in Gothic 3's archives fit well within 2^53. */
  u64(): number {
    this.need(8);
    const lo = this.view.getUint32(this.pos, true);
    const hi = this.view.getUint32(this.pos + 4, true);
    this.pos += 8;
    return hi * 0x1_0000_0000 + lo;
  }

  bytesView(n: number): Uint8Array {
    this.need(n);
    const v = this.bytes.subarray(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }

  skip(n: number): void {
    this.need(n);
    this.pos += n;
  }

  /** `count` floats starting here, copied out (the source may not be 4-byte aligned). */
  floats(count: number): Float32Array {
    this.need(count * 4);
    const out = new Float32Array(count);
    for (let i = 0; i < count; i++) out[i] = this.view.getFloat32(this.pos + i * 4, true);
    this.pos += count * 4;
    return out;
  }

  /** `count` 32-bit unsigned integers starting here, copied out. */
  uints(count: number): Uint32Array {
    this.need(count * 4);
    const out = new Uint32Array(count);
    for (let i = 0; i < count; i++) out[i] = this.view.getUint32(this.pos + i * 4, true);
    this.pos += count * 4;
    return out;
  }

  /** A bCString: a string-table index in GENOMFLE files, inline length and characters elsewhere. */
  str(): string {
    if (this.strings) {
      const i = this.u16();
      return this.strings[i] ?? '';
    }
    return this.inlineStr();
  }

  inlineStr(): string {
    const n = this.u16();
    return latin1(this.bytesView(n));
  }

  /** A GUID as 32 lower-case hex digits in byte order. */
  guid(): string {
    return hex(this.bytesView(16));
  }
}

export function latin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 4096) s += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + 4096)));
  return s;
}

export function hex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}
