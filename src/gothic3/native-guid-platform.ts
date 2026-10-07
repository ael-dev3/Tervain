import type { NativeValue } from './dialogue';
import type { NativeGuidTextPlatform, NativeMultiByteToWideCharArguments } from './native-guid-text';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeBytePointer } from './native-pointer-geometry';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });

/** An explicitly selected browser service. It supplies the admitted external
 * ABI results over retained storage; it does not execute Windows or OLE. */
export interface SelectedAsciiGuidTextPlatform extends NativeGuidTextPlatform {
  readonly profile: 'selected-ascii-utf16-canonical-braced-guid';
  readonly nativeWindowsFunctionsExecuted: false;
}

function attempt<T>(operation: string, body: () => T): NativeValue<T> {
  try { return known(body()); }
  catch (error) { return unknown(operation + ': ' + (error instanceof Error ? error.message : String(error))); }
}

/** Capture the passed pointer, rather than copying its data or rereading a
 * mutable argument object during the call. Lifetime/known bits are checked by
 * each actual NativeHeapObjectViews load or store. */
function pointer(value: NativeBytePointer): NativeBytePointer {
  if (!value) throw new Error('Actual retained byte pointer required');
  const { fields, offset } = value;
  if (!(fields instanceof NativeHeapObjectViews) || !Number.isSafeInteger(offset) || offset < 0) {
    throw new Error('Actual retained byte pointer required');
  }
  return { fields, offset };
}

function asciiByte(input: NativeBytePointer, index: number): number {
  const value = input.fields.readUnsigned(input.offset + index, 1);
  if (value > 0x7f) throw new Error('Selected CP_ACP conversion admits only ASCII bytes');
  return value;
}

/** CP_ACP/flags 0/-1 only. Count includes the terminating NUL. A fill is a new
 * call: it reads its supplied live pointer, retaining the caller's cch value.
 * See https://learn.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-multibytetowidechar */
function multiByteToWideChar(args: NativeMultiByteToWideCharArguments): NativeValue<number> {
  return attempt('Selected MultiByteToWideChar', () => {
    if (args.codePage !== 0 || args.flags !== 0 || args.inputBytes !== -1) {
      throw new Error('Selected codePage 0/flags 0/inputBytes -1 contract required');
    }
    const characters = args.outputCharacters;
    if (!Number.isInteger(characters) || characters < 0 || characters > 0x7fffffff) {
      throw new Error('Selected nonnegative signed INT output character count required');
    }
    const input = pointer(args.input);
    if (characters === 0) {
      // The query does not use or validate the output buffer.
      for (let index = 0; ; index++) {
        if (asciiByte(input, index) === 0) return index + 1;
      }
    }
    // The documented NULL/nonzero-cch failure returns 0. The caller ignores
    // this known conversion result and may pass NULL onward to IIDFromString.
    if (args.output === null) return 0;
    const output = pointer(args.output);
    if (input.fields.bytes.buffer === output.fields.bytes.buffer) {
      const inputBegin = input.fields.bytes.byteOffset + input.offset;
      const outputBegin = output.fields.bytes.byteOffset + output.offset;
      if (inputBegin === outputBegin) return 0; // Documented same-pointer failure.
      const inputEnd = input.fields.bytes.byteOffset + input.fields.bytes.length;
      const outputEnd = outputBegin + characters * 2;
      if (inputBegin < outputEnd && outputBegin < inputEnd) {
        throw new Error('Overlapping retained conversion spans are outside the selected profile');
      }
    }
    for (let index = 0; ; index++) {
      if (index >= characters) {
        // Failure output bytes are not specified by the external contract.
        // Retain the selected writer prefix without claiming a Windows result.
        throw new Error('Retained cch is insufficient for the current input; remaining external failure behavior is unowned');
      }
      const value = asciiByte(input, index);
      output.fields.writeUnsigned(output.offset + index * 2, value, 2);
      if (value === 0) return index + 1;
    }
  });
}

/** Canonical IID text has 38 ASCII UTF16 code units plus its NUL. Other forms
 * remain unowned instead of inventing their HRESULT or failure output bytes. */
function canonicalGuid(input: NativeBytePointer): readonly [number, number, number, string] {
  let text = '';
  for (let index = 0; index < 39; index++) {
    const value = input.fields.readUnsigned(input.offset + index * 2, 2);
    if (value === 0) {
      const match = /^\{([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\}$/i.exec(text);
      if (!match) throw new Error('Selected canonical braced GUID text required');
      return [Number.parseInt(match[1]!, 16), Number.parseInt(match[2]!, 16),
        Number.parseInt(match[3]!, 16), match[4]! + match[5]!];
    }
    if (value > 0x7f) throw new Error('Selected IID text admits only ASCII UTF16 code units');
    text += String.fromCharCode(value);
  }
  throw new Error('Selected canonical GUID must terminate after 38 code units');
}

/** Write the actual 16-byte output prefix. Data1/2/3 use x86 little-endian
 * fields; Data4 preserves its text byte order. No bCGuid validity or padding
 * store belongs to this external endpoint. NULL input yields GUID_NULL.
 * See https://learn.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-iidfromstring
 * and https://learn.microsoft.com/en-us/windows/win32/api/guiddef/ns-guiddef-guid */
function iidFromString(inputValue: NativeBytePointer | null, output: NativeHeapObjectViews): NativeValue<number> {
  return attempt('Selected IIDFromString', () => {
    if (!(output instanceof NativeHeapObjectViews) || output.bytes.length !== 16) {
      throw new Error('Actual aliased 16-byte GUID payload output view required');
    }
    const [data1, data2, data3, data4] = inputValue === null ? [0, 0, 0, '0000000000000000'] as const :
      canonicalGuid(pointer(inputValue));
    // These are this selected provider's writes, not captured OLE instructions.
    output.writeUnsigned(0, data1);
    output.writeUnsigned(4, data2, 2);
    output.writeUnsigned(6, data3, 2);
    for (let index = 0; index < 8; index++) {
      output.writeUnsigned(8 + index, Number.parseInt(data4.slice(index * 2, index * 2 + 2), 16), 1);
    }
    return 0; // S_OK. The native caller requires HRESULT exactly 0.
  });
}

/** Selection is explicit; absent platform services remain unknown in the
 * source owner. Native buffers are supplied by that owner's same MemoryAdmin,
 * and this provider neither allocates replacements nor caches a query input. */
export function selectAsciiGuidTextPlatform(): SelectedAsciiGuidTextPlatform {
  return Object.freeze({ profile: 'selected-ascii-utf16-canonical-braced-guid',
    nativeWindowsFunctionsExecuted: false, multiByteToWideChar, iidFromString });
}
