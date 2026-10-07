/** Original property-template array reserve over its actual three DWORD fields.
 * The caller owns array initialization and selecting the shared MemoryAdmin.
 * No property registration or virtual-method result is synthesized here. */
import source from '../../assets/gothic3/property-type-constructors/source.json';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeMemoryAdmin } from './native-memory-admin';
import type { NativeMemoryAllocation } from './native-memory-admin';
import type { NativeValue } from './dialogue';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): NativeValue<never> => ({ known: false, reason });
const uint32 = (value: number) => Number.isInteger(value) && value >= 0 && value <= 0xffffffff;

export class NativePropertyTemplateArray {
  private phase: 'idle' | 'invoking' | 'blocked' = 'idle';
  private boundary: string | null = null;
  private reallocations = 0;
  private zeroFillBytes = 0;
  constructor(readonly fields: NativeHeapObjectViews, private readonly memory: NativeMemoryAdmin) {
    const method = source.methods.reserveTemplates;
    if (source.sharedBaseSha256 !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
        method.entryVA !== '0x100013ed' || method.bodyVA !== '0x10088570' ||
        method.instructionCount !== 49 || method.bodyByteCount !== 124 ||
        method.bodyInstructionBytesSha256 !== 'efcca40fe42a8aaf90094ae6054e1b0993fa2b0c3677df8361865475d1202126' ||
        fields.bytes.length !== 12 || !(memory instanceof NativeMemoryAdmin)) {
      throw new Error('Original reserve source and actual 12-byte template array required');
    }
  }
  /** Parameters are raw DWORD arguments; comparisons and growth use signed
   * x86 values, while allocation size and memset byte count wrap to uint32. */
  reserve(requested: number, extra: number): NativeValue<void> {
    if (this.phase !== 'idle') {
      this.phase = 'blocked'; this.boundary ??= 'Template reserve cannot reenter or resume a blocked operation';
      return unknown(this.boundary);
    }
    this.phase = 'invoking';
    try {
      if (!uint32(requested) || !uint32(extra)) throw new Error('Actual DWORD reserve arguments required');
      const oldCapacity = this.fields.readUnsigned(8) | 0;
      if (oldCapacity < (requested | 0)) {
        let growth = extra | 0;
        if (growth <= 0) growth = growth === 0 ? Math.max(8, Math.min(0x400, oldCapacity >> 3)) : 0;
        const capacity = (growth + requested) >>> 0;
        const bytes = (capacity * 4) >>> 0;
        const old = this.fields.pointer<NativeMemoryAllocation>(0).get();
        const result = NativeMemoryAdmin.prototype.realloc.call(this.memory, old, bytes);
        if (!result.known) throw new Error(result.reason);
        this.reallocations++;
        if (this.boundary) throw new Error(this.boundary);
        const count = this.fields.readUnsigned(4);
        const zeroBytes = ((capacity - oldCapacity) * 4) >>> 0;
        // The original stores even a NULL realloc result before memset. A
        // failed dereference must retain that store and the old capacity.
        this.fields.pointer<NativeMemoryAllocation>(0).set(result.value);
        if (!result.value) throw new Error('Original template memset reaches a NULL realloc result');
        const begin = (count * 4) >>> 0;
        const destination = new NativeHeapObjectViews(result.value, begin, zeroBytes);
        for (let offset = 0; offset < zeroBytes; offset += 4) destination.writeUnsigned(offset, 0);
        this.zeroFillBytes += zeroBytes;
        this.fields.writeUnsigned(8, capacity);
      }
      this.phase = 'idle'; return known(undefined);
    } catch (error) {
      this.phase = 'blocked'; this.boundary ??= error instanceof Error ? error.message : String(error);
      return unknown(this.boundary);
    }
  }
  snapshot() {
    return Object.freeze({ phase: this.phase, boundary: this.boundary,
      reallocations: this.reallocations, zeroFillBytes: this.zeroFillBytes,
      registrationExecuted: false });
  }
}
