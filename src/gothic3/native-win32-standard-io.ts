/** Declared virtual standard handles. These are copied ABI inputs, never host
 * HANDLE numbers, procedure callbacks or physical-call authority. */
import type { NativeValue } from './dialogue';
export type NativeStandardIoCallSite = '204744b4' | '204744c6' | '20467de8' | '20467dff' |
  '20467e01' | '20467e3d' | '20474246' | '2047451e';
export type NativeStandardIoCallKind = 'GetStdHandle' | 'GetFileType' | 'TlsGetValue' |
  'FlsGetValue' | 'DecodePointer' | 'InitializeCriticalSectionAndSpinCount' | 'SetHandleCount';
export type NativeStandardIoCapabilityKind = 'handle' | 'tls-get' | 'fls-get' | 'decode' | 'section' | 'encoded';
export interface NativeStandardHandleSelection {
  readonly id: -10 | -11 | -12;
  readonly result: 'valid' | 'null' | 'invalid' | 'unknown';
  readonly fileType: number;
  readonly getStdHandleLastError?: number;
  readonly fileTypeLastError?: number;
}
export interface NativeWin32StandardIoSelection {
  readonly standardHandles: readonly NativeStandardHandleSelection[];
  readonly setHandleCount: Readonly<{ result: number; lastError?: number }>;
  readonly sectionInitialization: 'owned-registration';
}
export type RetainedWin32StandardIoSelection = Readonly<NativeWin32StandardIoSelection>;
export interface NativeStandardIoCallGrant { readonly identity: object; }
export type NativeStandardIoResult = object | number | null;
export interface NativeWin32StandardIoEndpoints { invoke(call: NativeStandardIoCallGrant): NativeValue<NativeStandardIoResult>; }
export interface NativeWin32HandleCapability { readonly identity: object; readonly owner: object; }
function data(value: unknown, key: string, required = false): unknown {
  if (!value || typeof value !== 'object' || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new Error('Standard-I/O declarations require plain own data records');
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor && !required) return undefined;
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new Error('Standard-I/O accessor declaration:' + key);
  return descriptor.value;
}
function uint(value: unknown, optional = false): number | undefined {
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Standard-I/O DWORD declaration required');
  return value;
}
export function retainNativeWin32StandardIoSelection(value: NativeWin32StandardIoSelection): RetainedWin32StandardIoSelection {
  const entries = data(value, 'standardHandles', true);
  if (!Array.isArray(entries) || Object.getPrototypeOf(entries) !== Array.prototype ||
      Reflect.ownKeys(entries).includes(Symbol.iterator) || entries.length !== 3) throw new Error('Three ordinary standard-handle data entries required');
  const handles: Readonly<NativeStandardHandleSelection>[] = [];
  for (let index = 0; index < 3; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(entries, String(index));
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new Error('Own standard-handle array data required');
    const entry: unknown = descriptor.value, id = data(entry, 'id', true), result = data(entry, 'result', true);
    if (id !== -10 - index || !['valid', 'null', 'invalid', 'unknown'].includes(result as string)) throw new Error('Ordered standard IDs-10/-11/-12 and explicit outcomes required');
    handles.push(Object.freeze({ id: id as -10 | -11 | -12, result: result as NativeStandardHandleSelection['result'],
      fileType: uint(data(entry, 'fileType', true))!, getStdHandleLastError: uint(data(entry, 'getStdHandleLastError'), true),
      fileTypeLastError: uint(data(entry, 'fileTypeLastError'), true) }));
  }
  const count = data(value, 'setHandleCount', true);
  if (data(value, 'sectionInitialization', true) !== 'owned-registration') throw new Error('Actual owned section-registration policy required');
  return Object.freeze({ standardHandles: Object.freeze(handles), sectionInitialization: 'owned-registration',
    setHandleCount: Object.freeze({ result: uint(data(count, 'result', true))!, lastError: uint(data(count, 'lastError'), true) }) });
}
