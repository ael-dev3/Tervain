/** Explicit virtual machine state; no Windows stack/register observations. */
export interface NativeX86CpuSelection {
  /** Declared virtual user-mode EFLAGS; never a host CPU observation. */
  readonly initialEflags: number;
  readonly idBitWritable: boolean;
  readonly cpuidLeaf0?: readonly [number, number, number, number];
  readonly cpuidLeaf1?: readonly [number, number, number, number];
  readonly sse2Execution?: 'normal' | 'illegal-instruction';
}
export const nativeVirtualX86CpuSelection: Readonly<NativeX86CpuSelection> = Object.freeze({
  initialEflags: 0x202, idBitWritable: true,
  // Explicit virtual GenuineIntel leaf 0 and selected leaf 1. Only the
  // declared leaves are supported; these values are not captured hardware.
  cpuidLeaf0: Object.freeze([1, 0x756e6547, 0x6c65746e, 0x49656e69] as const),
  cpuidLeaf1: Object.freeze([0x00000600, 0, 0, 0x06000000] as const),
  sse2Execution: 'normal',
});
export interface NativeX86ThreadStackSelection {
  readonly threadCapability: object;
  readonly reservationBytes: number;
  readonly addressModel: 'opaque-relative';
  readonly initialRegisters: 'unknown';
  readonly initialFs0: 'unknown';
  /** Explicit virtual low-bit geometry, chosen before this thread exists. */
  readonly pageAlignment?: 'virtual-page-4096';
  readonly cpu?: NativeX86CpuSelection;
}
export function retainNativeX86ThreadStackSelection(value: NativeX86ThreadStackSelection): Readonly<NativeX86ThreadStackSelection> {
  const { threadCapability, reservationBytes, addressModel, initialRegisters, initialFs0, pageAlignment, cpu } = value;
  if (!threadCapability || typeof threadCapability !== 'object' || !Number.isSafeInteger(reservationBytes) ||
      reservationBytes < 128 || reservationBytes > 1024 * 1024 || reservationBytes % 4 !== 0 ||
      addressModel !== 'opaque-relative' || initialRegisters !== 'unknown' || initialFs0 !== 'unknown' ||
      (pageAlignment !== undefined && (pageAlignment !== 'virtual-page-4096' || reservationBytes % 4096 !== 0))) {
    throw new Error('Declared opaque-relative logical-thread stack reservation and unknown initial state required');
  }
  let retainedCpu: Readonly<NativeX86CpuSelection> | undefined;
  if (cpu !== undefined) {
    const { initialEflags, idBitWritable, cpuidLeaf0, cpuidLeaf1, sse2Execution } = cpu;
    const tuple = (row: readonly [number, number, number, number] | undefined) => {
      if (row === undefined) return undefined;
      if (!Array.isArray(row) || row.length !== 4) throw new Error('Four explicit virtual CPUID DWORDs required');
      const copied = Array.from(row);
      if (copied.length !== 4 || copied.some(n => !Number.isInteger(n) || n < 0 || n > 0xffffffff)) throw new Error('Four explicit virtual CPUID DWORDs required');
      return Object.freeze(copied) as readonly [number, number, number, number];
    };
    // CPL3, IOPL0, IF1, protected mode, no pending trap or resume. Reserved
    // bits retain the architectural fixed values. Other supported bits may vary.
    if (!Number.isInteger(initialEflags) || initialEflags < 0 || initialEflags > 0xffffffff ||
        (initialEflags & ~0x244ed7) !== 0 || (initialEflags & 0x302) !== 0x202 ||
        typeof idBitWritable !== 'boolean' || (sse2Execution !== undefined && !['normal', 'illegal-instruction'].includes(sse2Execution))) throw new Error('Declared CPL3 IOPL0 virtual EFLAGS and CPU policy required');
    retainedCpu = Object.freeze({ initialEflags, idBitWritable, cpuidLeaf0: tuple(cpuidLeaf0), cpuidLeaf1: tuple(cpuidLeaf1), sse2Execution });
  }
  return Object.freeze({ threadCapability, reservationBytes, addressModel, initialRegisters, initialFs0, pageAlignment, cpu: retainedCpu });
}
