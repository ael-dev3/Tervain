/** Explicit virtual machine state; no Windows stack/register observations. */
export interface NativeX86ThreadStackSelection {
  readonly threadCapability: object;
  readonly reservationBytes: number;
  readonly addressModel: 'opaque-relative';
  readonly initialRegisters: 'unknown';
  readonly initialFs0: 'unknown';
  /** Explicit virtual low-bit geometry, chosen before this thread exists. */
  readonly pageAlignment?: 'virtual-page-4096';
}
export function retainNativeX86ThreadStackSelection(value: NativeX86ThreadStackSelection): Readonly<NativeX86ThreadStackSelection> {
  const { threadCapability, reservationBytes, addressModel, initialRegisters, initialFs0, pageAlignment } = value;
  if (!threadCapability || typeof threadCapability !== 'object' || !Number.isSafeInteger(reservationBytes) ||
      reservationBytes < 128 || reservationBytes > 1024 * 1024 || reservationBytes % 4 !== 0 ||
      addressModel !== 'opaque-relative' || initialRegisters !== 'unknown' || initialFs0 !== 'unknown' ||
      (pageAlignment !== undefined && (pageAlignment !== 'virtual-page-4096' || reservationBytes % 4096 !== 0))) {
    throw new Error('Declared opaque-relative logical-thread stack reservation and unknown initial state required');
  }
  return Object.freeze({ threadCapability, reservationBytes, addressModel, initialRegisters, initialFs0, pageAlignment });
}
