import type { NativeValue } from './dialogue';
import type { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';

/** A retained pointer, never an invented numerical x86 address. */
export interface NativeBytePointer {
  readonly fields: NativeHeapObjectViews;
  readonly offset: number;
}

/** Minted by an actual successful lower allocator record. Offsets locate bytes
 * within that canonical allocation; JS buffer alignment supplies no residue. */
export interface NativePointerGeometry {
  readonly canonicalBacking: NativeMemoryBacking;
  readonly allocationIdentity: object;
  readonly offset: number;
  readonly allocationBegin: number;
  readonly allocationEnd: number;
  readonly canonicalCapacity: number;
  readonly modulo4: 0 | 1 | 2 | 3;
}

export interface NativeByteGeometryHost {
  /** Resolves provenance and aliases without making a native memory access or
   * checking an ended lifetime before the source's actual load/store. */
  resolveNativePointer(pointer: NativeBytePointer): NativeValue<NativePointerGeometry>;
  /** Distinct owned allocations require contained copy spans. Missing pointer
   * ordering stays unknown when those disjointness facts cannot prove a path. */
  proveNativeCopyDirection(destination: NativeBytePointer, source: NativeBytePointer,
    bytes: number): NativeValue<'forward' | 'backward'>;
}
