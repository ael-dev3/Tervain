/** Copied declarations for the virtual GetStartupInfoA writer. No host process
 * data, HANDLE service or native exception dispatch is supplied by this scope. */
import type { NativeValue } from './dialogue';

export interface NativeStartupInfoWrite {
  readonly offset: number; readonly width: 1 | 2 | 4;
  readonly value: number; readonly knownMask: number;
}
export interface NativeStartupInfoWriterSelection {
  readonly writes: readonly NativeStartupInfoWrite[];
  readonly outcome: 'normal' | 'unknown';
  readonly reason?: string;
  /** Undefined preserves current logical-thread LastError. */
  readonly lastError?: number;
}
export interface NativeWin32StartupIoSelection { readonly startupInfoA?: NativeStartupInfoWriterSelection; }
/** Shape is descriptive; only the stack's private pending-call registry owns
 * an actual grant, and only the Runtime's current endpoint can use it. */
export interface NativeStartupInfoCallGrant { readonly identity: object; }
export interface NativeWin32StartupIoEndpoints {
  getStartupInfoA(call: NativeStartupInfoCallGrant): NativeValue<void>;
}
export interface RetainedWin32StartupIoSelection {
  readonly startupInfoA?: Readonly<NativeStartupInfoWriterSelection>;
}
function data(record: object, key: string, required = false): unknown {
  if (!record || typeof record !== 'object' ||
      (Object.getPrototypeOf(record) !== Object.prototype && Object.getPrototypeOf(record) !== null)) {
    throw new Error('Startup writer declarations require plain own data records');
  }
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor && !required) return undefined;
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    throw new Error('Startup writer declarations cannot use accessor fields:' + key);
  }
  return descriptor.value;
}
/** Retain only copied primitives. No caller iterator, function or accessor is
 * stored or invoked later by the actual endpoint. Write order is explicit. */
export function retainNativeWin32StartupIoSelection(value: NativeWin32StartupIoSelection): Readonly<RetainedWin32StartupIoSelection> {
  const startupInfoA = data(value, 'startupInfoA') as NativeStartupInfoWriterSelection | undefined;
  if (startupInfoA === undefined) return Object.freeze({});
  const supplied = data(startupInfoA, 'writes', true) as readonly NativeStartupInfoWrite[];
  const outcome = data(startupInfoA, 'outcome', true) as NativeStartupInfoWriterSelection['outcome'];
  const reason = data(startupInfoA, 'reason') as string | undefined, lastError = data(startupInfoA, 'lastError') as number | undefined;
  if ((outcome !== 'normal' && outcome !== 'unknown') ||
      (reason !== undefined && typeof reason !== 'string') ||
      (lastError !== undefined && (!Number.isInteger(lastError) || lastError < 0 || lastError > 0xffffffff))) {
    throw new Error('Declared startup writer normal/unknown and DWORD LastError policies required');
  }
  if (!Array.isArray(supplied) || Object.getPrototypeOf(supplied) !== Array.prototype ||
      Reflect.ownKeys(supplied).some(key => key === Symbol.iterator)) throw new Error('Startup writer requires an ordinary data array, without caller iterators');
  const writes: Readonly<NativeStartupInfoWrite>[] = [];
  for (let index = 0; index < supplied.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(supplied, String(index));
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new Error('Startup write array entries must be own data values');
    const suppliedWrite = descriptor.value as NativeStartupInfoWrite;
    const offset = data(suppliedWrite, 'offset', true) as number, width = data(suppliedWrite, 'width', true) as 1 | 2 | 4;
    const word = data(suppliedWrite, 'value', true) as number, knownMask = data(suppliedWrite, 'knownMask', true) as number;
    const maximum = width === 4 ? 0xffffffff : width === 2 ? 0xffff : 0xff;
    if (![1, 2, 4].includes(width) || !Number.isSafeInteger(offset) || offset < 0 || offset + width > 68 ||
        !Number.isInteger(word) || word < 0 || word > maximum ||
        !Number.isInteger(knownMask) || knownMask < 0 || knownMask > maximum) {
      throw new Error('Declared bounded STARTUPINFOA byte/word/dword value and mask required');
    }
    // This scope owns only the NULL reserved pointer. A partial/numeric pointer
    // plan cannot manufacture a borrowed startup-block capability.
    if (offset < 0x38 && offset + width > 0x34 &&
        (offset !== 0x34 || width !== 4 || word !== 0 || knownMask !== 0xffffffff)) {
      throw new Error('Non-NULL or partial lpReserved2 requires a separately owned startup-block pointer');
    }
    writes.push(Object.freeze({ offset, width, value: word, knownMask }));
  }
  return Object.freeze({ startupInfoA: Object.freeze({ writes: Object.freeze(writes), outcome, reason, lastError }) });
}
