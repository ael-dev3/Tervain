import { expect, it } from 'vitest';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeValue } from '../../src/gothic3/dialogue';

function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function fixture() {
  const string = new NativeHeapCString(new NativeMemoryAdmin(new NativeRuntimePlatform()));
  value(string.allocateTextBytes(new TextEncoder().encode('abcdef')));
  return { string, holder: string.snapshot().allocation! };
}
it('hashes signed character bytes through the first NUL without reading holder metadata or the suffix', () => {
  const { string, holder } = fixture(), fields = new NativeHeapObjectViews(holder);
  fields.writeUnsigned(8, 0xff, 1); fields.writeUnsigned(9, 0x80, 1); fields.writeUnsigned(10, 0, 1);
  holder.knownMask.fill(0, 0, 8); holder.knownMask.fill(0, 11);
  expect(value(string.hash())).toBe((-1 * 33 - 128) >>> 0);
});
it('wraps the source DWORD polynomial and returns zero for the canonical NULL string', () => {
  const { string } = fixture();
  let expected = 0;
  for (const byte of new TextEncoder().encode('abcdef')) expected = (Math.imul(expected, 33) + byte) >>> 0;
  expect(value(string.hash())).toBe(expected);
  expect(value(new NativeHeapCString(new NativeMemoryAdmin(new NativeRuntimePlatform())).hash())).toBe(0);
});
it('retains an unknown boundary when an actually read character is unknown', () => {
  const { string, holder } = fixture();
  holder.knownMask[9] = 0;
  expect(string.hash().known).toBe(false);
  holder.knownMask[9] = 255;
  expect(string.hash().known).toBe(false);
});
