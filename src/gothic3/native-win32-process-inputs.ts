/** Explicit virtual process-input contracts. No host process or Windows API
 * is observed, and source-buffer descriptions supply no pointer authority. */
import type { NativeValue } from './dialogue';
import type { NativeBytePointer } from './native-pointer-geometry';

export interface NativeProcessInputByteSelection {
  readonly kind: 'buffer';
  readonly bytes: ArrayLike<number>;
  readonly knownMask?: ArrayLike<number>;
  /** Undefined preserves the actual current logical thread LastError. */
  readonly lastError?: number;
}
export type NativeProcessInputOutcome = NativeProcessInputByteSelection |
  Readonly<{ kind: 'null'; lastError?: number }>;
export interface NativeProcessReleasePolicy { readonly result: number; readonly lastError?: number; }
export interface NativeProcessConversionFailure { readonly result: 0; readonly lastError?: number; }
export interface NativeWin32ProcessInputSelection {
  readonly acpCodePage: 1252;
  readonly conversionCoverage: 'ascii-explicit-positive-count';
  readonly initialDirectionFlag: 0;
  readonly commandLineA?: NativeProcessInputOutcome;
  readonly environmentW?: NativeProcessInputOutcome;
  readonly environmentA?: NativeProcessInputOutcome;
  readonly releaseW?: NativeProcessReleasePolicy;
  readonly releaseA?: NativeProcessReleasePolicy;
  readonly conversionFailure?: Readonly<{
    query?: NativeProcessConversionFailure; fill?: NativeProcessConversionFailure;
  }>;
}
export interface NativeWideCharToMultiByteArguments {
  readonly codePage: 0; readonly flags: 0;
  readonly input: NativeBytePointer; readonly inputCharacters: number;
  readonly output: NativeBytePointer | null; readonly outputBytes: number;
  readonly defaultCharacter: null; readonly usedDefaultCharacter: null;
}
export interface NativeWin32ProcessInputEndpoints {
  getCommandLineA(): NativeValue<NativeBytePointer | null>;
  getEnvironmentStringsW(): NativeValue<NativeBytePointer | null>;
  getEnvironmentStrings(): NativeValue<NativeBytePointer | null>;
  freeEnvironmentStringsW(input: NativeBytePointer): NativeValue<number>;
  freeEnvironmentStringsA(input: NativeBytePointer): NativeValue<number>;
  wideCharToMultiByte(args: NativeWideCharToMultiByteArguments): NativeValue<number>;
}

export type RetainedProcessInputOutcome = Readonly<{ kind: 'null'; lastError?: number }> |
  Readonly<{ kind: 'buffer'; bytes: readonly number[]; knownMask: readonly number[]; lastError?: number }>;
export interface RetainedWin32ProcessInputSelection {
  readonly acpCodePage: 1252; readonly conversionCoverage: 'ascii-explicit-positive-count';
  readonly initialDirectionFlag: 0;
  readonly commandLineA?: RetainedProcessInputOutcome;
  readonly environmentW?: RetainedProcessInputOutcome;
  readonly environmentA?: RetainedProcessInputOutcome;
  readonly releaseW: Readonly<NativeProcessReleasePolicy>;
  readonly releaseA: Readonly<NativeProcessReleasePolicy>;
  readonly conversionFailure: Readonly<{
    query?: Readonly<NativeProcessConversionFailure>; fill?: Readonly<NativeProcessConversionFailure>;
  }>;
}
function uint32(value: number | undefined): void {
  if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 0xffffffff)) {
    throw new Error('Declared process-input DWORD result/LastError required');
  }
}
function retainOutcome(value: NativeProcessInputOutcome | undefined, wide: boolean): RetainedProcessInputOutcome | undefined {
  if (value === undefined) return undefined;
  const { kind, lastError } = value; uint32(lastError);
  if (kind === 'null') return Object.freeze({ kind, lastError });
  if (kind !== 'buffer') throw new Error('Declared process-input buffer or NULL outcome required');
  const { bytes: suppliedBytes, knownMask: suppliedMasks } = value;
  const bytes = Array.from(suppliedBytes), masks = suppliedMasks === undefined ? bytes.map(() => 255) : Array.from(suppliedMasks);
  if (bytes.length === 0 || bytes.length > 0x7fffffff || (wide && bytes.length % 2 !== 0) ||
      masks.length !== bytes.length || bytes.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255) ||
      masks.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    throw new Error('Declared process-input bytes/masks and UTF16 byte geometry required');
  }
  return Object.freeze({ kind, bytes: Object.freeze(bytes), knownMask: Object.freeze(masks), lastError });
}
/** Copy caller storage and every nested policy before retaining it. Unknown
 * masks and non-ASCII contents remain for the source's actual later reads. */
export function retainNativeWin32ProcessInputSelection(value: NativeWin32ProcessInputSelection): RetainedWin32ProcessInputSelection {
  const { acpCodePage, conversionCoverage, initialDirectionFlag, commandLineA, environmentW, environmentA,
    releaseW, releaseA, conversionFailure } = value;
  if (acpCodePage !== 1252 || conversionCoverage !== 'ascii-explicit-positive-count' || initialDirectionFlag !== 0) {
    throw new Error('Explicit ACP1252 ASCII/count ABI and initial logical thread DF0 required');
  }
  const release = (policy: NativeProcessReleasePolicy | undefined) => {
    const { result, lastError } = policy ?? { result: 1 }; uint32(result); uint32(lastError);
    if (result === undefined) throw new Error('Declared raw environment release BOOL required');
    return Object.freeze({ result, lastError });
  };
  const failure = (policy: NativeProcessConversionFailure | undefined) => {
    if (policy === undefined) return undefined;
    const { result, lastError } = policy; uint32(lastError);
    if (result !== 0) throw new Error('Explicit selected conversion failure result0 required');
    return Object.freeze({ result, lastError });
  };
  return Object.freeze({ acpCodePage, conversionCoverage, initialDirectionFlag,
    commandLineA: retainOutcome(commandLineA, false), environmentW: retainOutcome(environmentW, true),
    environmentA: retainOutcome(environmentA, false), releaseW: release(releaseW), releaseA: release(releaseA),
    conversionFailure: Object.freeze({ query: failure(conversionFailure?.query), fill: failure(conversionFailure?.fill) }) });
}
