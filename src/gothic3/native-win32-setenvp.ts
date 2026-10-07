/** Fresh virtual Game heap policy for the source-owned environment unit.
 * Data declarations are not host Windows observations or call authority. */
import type { NativeValue } from './dialogue';
import type { NativeMemoryBacking } from './native-memory-admin';
export type NativeSetEnvpCallSite = '20477ce8' | '20467cd2';
export interface NativeWin32SetEnvpSelection {
  readonly physicalGameHeapCapacity: 'round-eight-unknown-padding';
  readonly heapFree: Readonly<{ outcome: 'success' | 'false' | 'unknown'; lastError?: number }>;
}
export type RetainedWin32SetEnvpSelection = Readonly<NativeWin32SetEnvpSelection>;
export interface NativeSetEnvpCallGrant { readonly identity: object; }
export type NativeSetEnvpResult = NativeMemoryBacking | null | boolean;
export interface NativeWin32SetEnvpEndpoints { invoke(call: NativeSetEnvpCallGrant): NativeValue<NativeSetEnvpResult>; }
function data(value: unknown, key: string, required = false): unknown {
  if (!value || typeof value !== 'object' ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new Error('Environment ABI declarations require plain own data records');
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor && !required) return undefined;
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new Error('Environment ABI accessor:' + key);
  return descriptor.value;
}
export function retainNativeWin32SetEnvpSelection(value: NativeWin32SetEnvpSelection): RetainedWin32SetEnvpSelection {
  if (data(value, 'physicalGameHeapCapacity', true) !== 'round-eight-unknown-padding') {
    throw new Error('Explicit fresh eight-byte capacity policy with unknown padding required');
  }
  const free = data(value, 'heapFree', true), outcome = data(free, 'outcome', true), lastError = data(free, 'lastError');
  if (outcome !== 'success' && outcome !== 'false' && outcome !== 'unknown') throw new Error('Explicit HeapFree outcome required');
  if (lastError !== undefined && (typeof lastError !== 'number' || !Number.isInteger(lastError) || lastError < 0 || lastError > 0xffffffff)) {
    throw new Error('Environment HeapFree LastError must be a declared DWORD');
  }
  return Object.freeze({ physicalGameHeapCapacity: 'round-eight-unknown-padding',
    heapFree: Object.freeze({ outcome, lastError: lastError as number | undefined }) });
}
