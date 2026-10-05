/** Original SharedBase10002c7a ->10087ad0 CString hash over actual bytes.
 * The native loop uses signed char, multiplies the uint32 accumulator by33,
 * and stops at the first physical NUL. It does not hash decoded JavaScript text.
 * A NULL CString slot resolves through GetText10013210 to the original empty
 * literal; its hash is0. Callers retain/check the allocation and pointer slot. */
export function originalCStringByteHash(bytes: Uint8Array | null,
    knownMask?: Uint8Array): number {
  if (bytes === null) {
    if (knownMask !== undefined) throw new Error('NULL CString cannot supply a separate byte mask');
    return 0;
  }
  if (knownMask !== undefined && knownMask.length !== bytes.length) {
    throw new Error('CString hash requires the same physical byte and mask extent');
  }
  let value = 0;
  for (let offset = 0; offset < bytes.length; offset++) {
    if (knownMask !== undefined && knownMask[offset] !== 255) {
      throw new Error('CString hash reached an unknown original byte');
    }
    const byte = bytes[offset]!;
    if (byte === 0) return value;
    const signed = byte < 128 ? byte : byte - 256;
    value = (Math.imul(value, 33) + signed) >>> 0;
  }
  throw new Error('CString hash requires its actual terminating NUL byte');
}
