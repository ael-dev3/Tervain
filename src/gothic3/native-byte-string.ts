import rules from '../../assets/gothic3/cstring-text-construction/runtime-rules.json';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeByteGeometryHost, NativeBytePointer } from './native-pointer-geometry';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
const source = rules as unknown as { schema: string; inputs: { SharedBase: string };
  methods: Record<string, { body: string; bodyInstructionBytesSha256: string }>;
  derivedEntries: { strchrAlignedTail: { entry: string; bodyInstructionBytesSha256: string } };
  constBytes: { spaceLiteral: { address: string; raw: string } } };
function admit(): void {
  if (source.schema !== 'gothic3-cstring-text-construction-rules-v1' ||
      source.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
      source.constBytes.spaceLiteral.address !== '100e6f44' || source.constBytes.spaceLiteral.raw !== '2000' ||
      source.derivedEntries.strchrAlignedTail.entry !== '100a7306' ||
      source.derivedEntries.strchrAlignedTail.bodyInstructionBytesSha256 !== '677282408ab09f5808d244ec6d645e674231066e023bdbd8cec4afff86fca318') {
    throw new Error('Original CString scalar source receipt differs');
  }
  for (const [name, body, hash] of [
    ['memcpy', '100a7a00', 'ada0fafd69940490a3c1ac706772420ce32760254cc28aff588c401ed09f1c44'],
    ['strstr', '100a7430', 'b9ed1ff8cb9f134bc493b1a93c251e88d6279640f682edaddb28ee2a7bbe6fa9'],
    ['strchr', '100a7300', '22f27502570ab4aa937590c5aebf8c378db90379f04e561945d1db27bff36e8e'],
  ]) if (source.methods[name!]?.body !== body || source.methods[name!]?.bodyInstructionBytesSha256 !== hash) {
    throw new Error('Original CString scalar method differs: ' + name);
  }
}
function fact<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function attempt<T>(body: () => T): NativeValue<T> {
  try { admit(); return known(body()); }
  catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
}

/** UnMangle's exact one-character strstr needle. The original tail reads whole
 * aligned DWORDs, including post-NUL bytes, and rereads a candidate DWORD. */
export function findNativeSpace(host: NativeByteGeometryHost, input: NativeBytePointer): NativeValue<NativeBytePointer | null> {
  return attempt(() => {
    const literal = new NativeHeapObjectViews({ identity: {}, bytes: Uint8Array.from([0x20, 0]),
      knownMask: new Uint8Array(2).fill(255), freed: false });
    const target = literal.readUnsigned(0, 1);
    if (literal.readUnsigned(1, 1) !== 0) throw new Error('UnMangle strstr one-character source needle differs');
    const geometry = fact(host.resolveNativePointer(input));
    let cursor = input.offset;
    let residue: number = geometry.modulo4;
    while (residue !== 0) {
      const byte = input.fields.readUnsigned(cursor, 1);
      cursor++;
      if (byte === target) return { fields: input.fields, offset: cursor - 1 };
      if (byte === 0) return null;
      residue = (residue + 1) & 3;
    }
    const repeated = Math.imul(target, 0x01010101) >>> 0;
    for (;;) {
      const word = input.fields.readUnsigned(cursor, 4);
      const targetWord = (word ^ repeated) >>> 0;
      const wordSum = (word + 0x7efefeff) >>> 0;
      const zero = ((word ^ 0xffffffff) ^ wordSum) >>> 0;
      const match = (((targetWord ^ 0xffffffff) ^ ((targetWord + 0x7efefeff) >>> 0)) & 0x81010100) >>> 0;
      cursor += 4;
      if (match !== 0) {
        const candidate = input.fields.readUnsigned(cursor - 4, 4);
        for (let byteIndex = 0; byteIndex < 4; byteIndex++) {
          const byte = (candidate >>> (byteIndex * 8)) & 255;
          if (byte === target) return { fields: input.fields, offset: cursor - 4 + byteIndex };
          if (byte === 0) return null;
        }
      } else if ((zero & 0x81010100) !== 0) {
        if ((zero & 0x1010100) !== 0 || (wordSum & 0x80000000) === 0) return null;
      }
    }
  });
}

/** Original scalar memcpy units, retaining each completed native load/store.
 * Unknown source masks copy as masks; they never become known string bytes. */
export function copyNativeBytesScalar(host: NativeByteGeometryHost, destination: NativeBytePointer,
  input: NativeBytePointer, bytes: number): NativeValue<void> {
  return attempt(() => {
    if (!Number.isInteger(bytes) || bytes < 0 || bytes > 0xffffffff) throw new Error('Original memcpy uint32 size required');
    const direction = fact(host.proveNativeCopyDirection(destination, input, bytes));
    const destinationGeometry = fact(host.resolveNativePointer(destination));
    const copy = (offset: number, width: 1 | 4): void => {
      const loaded = input.fields.maskedWord(input.offset + offset, width);
      const value = loaded.value, mask = loaded.knownMask;
      const stored = destination.fields.maskedWord(destination.offset + offset, width);
      stored.value = value; stored.knownMask = mask;
    };
    if (direction === 'forward') {
      // 100a7a28 reads the live CPU global before alignment peels or stores.
      if (bytes >= 256) throw new Error('memcpy100a7a28 requires actual SharedBase CRT CPU global102f854c and vector capability');
      let position = 0, remaining = bytes;
      if (destinationGeometry.modulo4 !== 0 && remaining >= 4) {
        const peel = 4 - destinationGeometry.modulo4;
        for (let i = 0; i < peel; i++) copy(position++, 1);
        remaining -= peel;
      }
      while (remaining >= 4) { copy(position, 4); position += 4; remaining -= 4; }
      while (remaining !== 0) { copy(position++, 1); remaining--; }
    } else {
      // This source branch bypasses CPU feature dispatch for every size.
      let remaining = bytes;
      if (remaining >= 4) {
        const peel = (destinationGeometry.modulo4 + remaining - 4) & 3;
        for (let i = 0; i < peel; i++) copy(--remaining, 1);
        while (remaining >= 4) { remaining -= 4; copy(remaining, 4); }
      }
      while (remaining !== 0) copy(--remaining, 1);
    }
  });
}
