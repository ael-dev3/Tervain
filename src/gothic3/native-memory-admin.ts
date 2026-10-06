import runtimeRules from '../../assets/gothic3/runtime-admin/runtime-rules.json';
import type { NativeValue } from './dialogue';

/** Physical bytes and pointer capabilities are separate: a browser identity is
 * never encoded as a guessed x86 address. Views alias the retained allocation. */
export interface NativeMemoryBacking {
  readonly identity: object;
  readonly bytes: Uint8Array;
  readonly knownMask: Uint8Array;
  freed: boolean;
}
export interface NativeMemoryRegion extends NativeMemoryBacking {}
export interface NativeMemoryAllocation {
  readonly identity: object;
  readonly region: NativeMemoryRegion;
  readonly offset: number;
  readonly capacity: number;
  readonly requestedBytes: number;
  readonly bytes: Uint8Array;
  readonly knownMask: Uint8Array;
  freed: boolean;
}
export interface NativeMemoryPlatform {
  virtualAlloc(bytes: number, type: 0x103000, protect: 4): NativeValue<NativeMemoryRegion | null>;
  crtNew(bytes: number): NativeValue<NativeMemoryBacking | null>;
  crtFree(backing: NativeMemoryBacking): NativeValue<void>;
  compareRegions(a: NativeMemoryRegion, b: NativeMemoryRegion): NativeValue<number>;
  initializeCriticalSection(address: '10189a18', owner: object, spinCount: 1000): NativeValue<number>;
  enterCriticalSection(address: '10189a18', owner: object): NativeValue<void>;
  leaveCriticalSection(address: '10189a18', owner: object): NativeValue<void>;
  registerShutdown(address: '100e2710', owner: object, execute: () => NativeValue<void>): NativeValue<number>;
  clearDefaultCString(owner: object): NativeValue<void>;
}
type ColdRange = { address: string; raw: string; knownMask: string; bytes: number };
type BucketRule = {
  stride: number; minimumRequest: number; maximumRequest: number;
  regionBytes: number; capacity: number; bitmapOffset: number; bitmapBytes: number;
  lastBitmapMask: number; payloadBytes: number;
  globals: { count: string; list: string; peak: string; descriptor: string };
  callbacks: string[];
};
type Rules = { schema: string; inputs: { SharedBase: string }; coldGlobals: Record<string, ColdRange>; buckets: Record<string, BucketRule> };
type Pool = { region: NativeMemoryRegion; bucket: Bucket; next: Pool | null };
type Bucket = { rule: BucketRule; head: Pool | null; descriptor: NativeMemoryBacking | null };
type Area = { region: NativeMemoryRegion; lower: number; upper: number; pool: Pool; descriptor: NativeMemoryBacking | null };
type MediumBlock = {
  region: NativeMemoryRegion; offset: number; units: number; allocated: boolean;
  previous: MediumBlock | null; next: MediumBlock | null;
  freePrevious: MediumBlock | null; freeNext: MediumBlock | null;
};
type Allocation = NativeMemoryAllocation & { requestedBytes: number; capacity: number; pool: Pool | null; block: MediumBlock | null };
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const SHARED_BASE = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214';
const hex = (value: string) => {
  if (!/^(?:[0-9a-f]{2})*$/.test(value)) throw new Error('Exact hexadecimal native source bytes required');
  return Uint8Array.from(value.match(/../g) ?? [], byte => Number.parseInt(byte, 16));
};
const uint32 = (value: number) => Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
const put32 = (backing: NativeMemoryBacking, offset: number, value: number) => {
  new DataView(backing.bytes.buffer, backing.bytes.byteOffset, backing.bytes.byteLength).setUint32(offset, value >>> 0, true);
  backing.knownMask.fill(255, offset, offset + 4);
};
const get32 = (backing: NativeMemoryBacking, offset: number) => new DataView(backing.bytes.buffer, backing.bytes.byteOffset, backing.bytes.byteLength).getUint32(offset, true);
const pointer = (backing: NativeMemoryBacking, offset: number, value: object | null) => {
  // The original native pointer exists as a retained capability. Only NULL has
  // a known numerical representation in this selected browser platform.
  if (value === null) put32(backing, offset, 0);
  else backing.knownMask.fill(0, offset, offset + 4);
};

/** Source-owned MemHeap algorithms, with platform allocation/CS/CRT services.
 * Unsupported branches retain their applied prefix (including an entered CS).
 * The module must be created before every source tagged-new using this heap. */
export class NativeMemoryAdmin {
  private readonly owner = {};
  private readonly globals: { address: number; backing: NativeMemoryBacking }[] = [];
  private readonly buckets: Bucket[] = [];
  private readonly areas: Area[] = [];
  private readonly mediumRegions: NativeMemoryRegion[] = [];
  private readonly freeBuckets = new Map<number, MediumBlock>();
  private readonly allocations = new Set<Allocation>();
  private readonly retainedVirtualRegions: NativeMemoryRegion[] = [];
  private descriptorHead: NativeMemoryBacking | null = null;
  private entered = false;
  private halted: string | null = null;
  private readonly trace: string[] = [];

  constructor(private readonly platform: NativeMemoryPlatform) {
    const rules = runtimeRules as unknown as Rules;
    if (rules.schema !== 'gothic3-runtime-admin-rules-v1' || rules.inputs.SharedBase !== SHARED_BASE) throw new Error('MemoryAdmin source receipt does not match the original SharedBase input');
    for (const [name, group] of Object.entries(rules.coldGlobals)) {
      // Error/Message/Spy storage belongs to their owners. Overlapping Memory
      // receipts refer to one physical range, rather than disconnected copies.
      if (!/^(?:memoryAdmin|memHeap|heap)/.test(name)) continue;
      const bytes = hex(group.raw), knownMask = hex(group.knownMask);
      if (bytes.length !== group.bytes || knownMask.length !== group.bytes) throw new Error(`Invalid cold global ${group.address}`);
      const address = Number.parseInt(group.address, 16);
      const overlap = this.globals.find(value => address >= value.address && address + bytes.length <= value.address + value.backing.bytes.length);
      if (overlap) {
        const offset = address - overlap.address;
        if (bytes.some((byte, index) => byte !== overlap.backing.bytes[offset + index]) || knownMask.some((byte, index) => byte !== overlap.backing.knownMask[offset + index])) throw new Error('Overlapping original MemoryAdmin receipts disagree');
        continue;
      }
      this.globals.push({ address, backing: { identity: {}, bytes, knownMask, freed: false } });
    }
    for (const rule of Object.values(rules.buckets)) {
      if (!uint32(rule.stride) || rule.stride === 0 || rule.maximumRequest !== rule.stride || rule.capacity * rule.stride !== rule.payloadBytes || rule.bitmapBytes % 4 !== 0 || rule.bitmapOffset + rule.bitmapBytes > rule.regionBytes || rule.callbacks.length !== 4) throw new Error('Invalid audited native pool geometry');
      this.buckets.push({ rule, head: null, descriptor: null });
    }
    this.buckets.sort((a, b) => a.rule.stride - b.rule.stride);
    for (const [address, bytes] of [['10142798', 16], ['102fb000', 1], ['102fb004', 4], ['102fb030', 4], ['102fb04c', 4]] as const) this.requireColdZero(address, bytes);
    for (const bucket of this.buckets) for (const address of Object.values(bucket.rule.globals)) this.requireColdZero(address, 4);
    this.requireColdZero('10144214', 4097 * 4);
  }

  private range(address: string | number, length: number): { backing: NativeMemoryBacking; offset: number } {
    const numeric = typeof address === 'number' ? address : Number.parseInt(address, 16);
    const group = this.globals.find(value => numeric >= value.address && numeric + length <= value.address + value.backing.bytes.length);
    if (!group) throw new Error(`Missing original cold global range ${numeric.toString(16)}+${length}`);
    return { backing: group.backing, offset: numeric - group.address };
  }
  private hasRange(address: string, length: number): boolean {
    const numeric = Number.parseInt(address, 16);
    return this.globals.some(group => numeric >= group.address && numeric + length <= group.address + group.backing.bytes.length);
  }
  private requireColdZero(address: string, length: number) {
    const value = this.range(address, length);
    if (value.backing.bytes.subarray(value.offset, value.offset + length).some(byte => byte !== 0) || value.backing.knownMask.subarray(value.offset, value.offset + length).some(byte => byte !== 255)) throw new Error(`Unsupported nonzero/unknown cold global ${address}`);
  }
  private global32(address: string): number { const { backing, offset } = this.range(address, 4); return get32(backing, offset); }
  private setGlobal32(address: string, value: number) { const { backing, offset } = this.range(address, 4); put32(backing, offset, value); }
  private setGlobalPointer(address: string, value: object | null) { const { backing, offset } = this.range(address, 4); pointer(backing, offset, value); }
  private byte(address: string): number { const { backing, offset } = this.range(address, 1); return backing.bytes[offset]!; }
  private setByte(address: string, value: number) { const { backing, offset } = this.range(address, 1); backing.bytes[offset] = value; backing.knownMask[offset] = 255; }
  private stop<T>(reason: string): NativeValue<T> { this.halted = reason; this.trace.push(`blocked:${reason}`); return unknown(reason); }

  getInstance(): NativeValue<this> {
    if (this.halted) return unknown(this.halted);
    if ((this.global32('101427a4') & 1) === 0) {
      this.setGlobal32('101427a4', this.global32('101427a4') | 1);
      this.setByte('101427a1', 1);
      if (this.byte('1014279d') === 0) {
        this.setByte('101427a1', 1); this.setByte('1014279d', 1); this.setByte('1014279c', 1);
      }
      this.setByte('101427a0', 0);
      this.trace.push('memory-bootstrap');
      const result = this.platform.registerShutdown('100e2710', this.owner, () => this.shutdown());
      if (!result.known) return this.stop(result.reason);
      // Native _atexit's integer result is ignored by GetInstance/tagged-new.
      this.trace.push(`memory-atexit:${result.value}`);
    }
    return known(this);
  }

  private shutdown(): NativeValue<void> {
    if (this.byte('1014279c') !== 0) {
      // bCString::Clear 10003d28->100149b0 returns immediately for the actual
      // source-owned NULL holder. No disconnected platform string is seeded.
      const holder = this.range('10142798', 4);
      if (holder.backing.knownMask.subarray(holder.offset, holder.offset + 4).every(byte => byte === 255) && get32(holder.backing, holder.offset) === 0) this.trace.push('default-cstring-clear-null');
      else {
        const cleared = this.platform.clearDefaultCString(this.owner);
        if (!cleared.known) return this.stop(cleared.reason);
      }
      if (this.byte('101427a2') !== 0) return this.stop('MemoryAdmin shutdown MemHeap::Dump branch is not implemented');
      this.setByte('101427a0', 0); this.setByte('101427a1', 1); this.setByte('1014279c', 0);
      this.trace.push('memory-shutdown');
    }
    return known(undefined);
  }

  private synchronized<T>(operation: () => NativeValue<T>): NativeValue<T> {
    if (this.halted) return unknown(this.halted);
    if (this.entered) return this.stop('Unowned reentrant native MemHeap critical-section call');
    if (this.byte('102fb000') === 0) {
      const initialized = this.platform.initializeCriticalSection('10189a18', this.owner, 1000);
      if (!initialized.known) return this.stop(initialized.reason);
      this.setByte('102fb000', initialized.value === 1 ? 1 : 0);
      this.trace.push(`critical-section-init:${initialized.value}`);
      if (initialized.value !== 1) return this.stop('Native failed critical-section initialization reaches an unowned unconditional LeaveCriticalSection branch');
      const { backing, offset } = this.range('10189a18', 24); backing.knownMask.fill(0, offset, offset + 24);
    }
    const entered = this.platform.enterCriticalSection('10189a18', this.owner);
    if (!entered.known) return this.stop(entered.reason);
    this.entered = true; this.trace.push('critical-section-enter');
    const result = operation();
    if (!result.known) return this.stop(result.reason);
    const left = this.platform.leaveCriticalSection('10189a18', this.owner);
    if (!left.known) return this.stop(left.reason);
    this.entered = false; this.trace.push('critical-section-leave');
    return result;
  }

  newObject(bytes: number, tag?: number): NativeValue<NativeMemoryAllocation | null> {
    if (!uint32(bytes)) return unknown('Native new size must be uint32');
    const initialized = this.getInstance();
    if (!initialized.known) return initialized;
    this.trace.push(`tagged-new:${bytes}:${tag ?? 'none'}`);
    const result = this.synchronized(() => this.allocate(bytes));
    if (!result.known || result.value !== null) return result;
    return this.stop('Native tagged-new NULL result requires ErrorAdmin critical/fatal error callbacks');
  }
  realloc(old: NativeMemoryAllocation | null, bytes: number): NativeValue<NativeMemoryAllocation | null> {
    if (!uint32(bytes)) return unknown('Native realloc size must be uint32');
    return this.synchronized(() => {
      if (old === null) return this.allocate(bytes);
      const owned = this.owned(old); if (!owned.known) return owned;
      const allocation = owned.value;
      const area = this.findArea(allocation); if (!area.known) return area;
      if (area.value) {
        if (area.value.descriptor === null || area.value.descriptor.freed || area.value.descriptor !== allocation.pool?.bucket.descriptor) return unknown('Native pointer-area callback descriptor is not owned and live');
        if (bytes <= allocation.capacity) { allocation.requestedBytes = bytes; return known(allocation); }
        const moved = this.allocate(bytes);
        if (!moved.known || moved.value === null) return moved;
        this.copy(moved.value, allocation, allocation.capacity);
        this.release(allocation); return moved;
      }
      const medium = this.findMediumRegion(allocation); if (!medium.known) return medium;
      if (!medium.value || !allocation.block) return unknown('Native realloc reaches an unowned process-heap pointer');
      return this.reallocateMedium(allocation, bytes);
    });
  }
  free(old: NativeMemoryAllocation | null): NativeValue<void> {
    return this.synchronized(() => {
      if (old === null) return known(undefined);
      const owned = this.owned(old); if (!owned.known) return owned;
      const area = this.findArea(owned.value); if (!area.known) return area;
      if (area.value && (area.value.descriptor === null || area.value.descriptor.freed)) return unknown('Native pointer-area Free callback has no live descriptor');
      if (!area.value) {
        const medium = this.findMediumRegion(owned.value); if (!medium.known) return medium;
        if (!medium.value || !owned.value.block) return unknown('Native Free reaches an unowned process-heap pointer');
      }
      this.release(owned.value); return known(undefined);
    });
  }
  deleteObject(old: NativeMemoryAllocation | null): NativeValue<void> { return this.free(old); }

  private owned(value: NativeMemoryAllocation): NativeValue<Allocation> {
    const allocation = value as Allocation;
    if (!this.allocations.has(allocation) || allocation.freed || allocation.region.freed) return unknown('Native MemHeap pointer is not an owned live allocation');
    return known(allocation);
  }
  private allocation(region: NativeMemoryRegion, offset: number, capacity: number, requestedBytes: number, pool: Pool | null, block: MediumBlock | null): Allocation {
    const allocation: Allocation = {
      identity: {}, region, offset, capacity, requestedBytes, pool, block, freed: false,
      get bytes() { return region.bytes.subarray(offset, offset + this.capacity); },
      get knownMask() { return region.knownMask.subarray(offset, offset + this.capacity); },
    };
    this.allocations.add(allocation); return allocation;
  }
  private findArea(allocation: Allocation): NativeValue<Area | null> {
    // MemHeap::GetPointerArea 10005b37->1003c700: [lower,upper), binary search.
    let base = 0, count = this.areas.length;
    while (count !== 0) {
      const half = count >>> 1, index = base + half, area = this.areas[index]!;
      const order = allocation.region === area.region ? known(0) : this.platform.compareRegions(allocation.region, area.region);
      if (!order.known) return order;
      if (order.value < 0 || (order.value === 0 && allocation.offset < area.lower)) count = half;
      else if (order.value === 0 && allocation.offset < area.upper) return known(area);
      else { base = index + 1; count -= half + 1; }
    }
    return known(null);
  }
  private findMediumRegion(allocation: Allocation): NativeValue<NativeMemoryRegion | null> {
    // Source 1003c920/1003d6b0 use the same sorted region binary search,
    // accepting [region,region+0x400000). Retained order replaces pointer bits.
    let base = 0, count = this.mediumRegions.length;
    while (count !== 0) {
      const half = count >>> 1, index = base + half, region = this.mediumRegions[index]!;
      const order = allocation.region === region ? known(0) : this.platform.compareRegions(allocation.region, region);
      if (!order.known) return order;
      if (order.value < 0 || (order.value === 0 && allocation.offset < 0)) count = half;
      else if (order.value === 0 && allocation.offset < 0x400000) return known(region);
      else { base = index + 1; count -= half + 1; }
    }
    return known(null);
  }
  private allocate(bytes: number): NativeValue<Allocation | null> {
    if (bytes <= 4096) {
      const bucket = this.buckets.find(value => bytes >= value.rule.minimumRequest && bytes <= value.rule.maximumRequest);
      if (!bucket) return unknown(`Native simple-allocation table bucket for ${bytes} bytes is not audited`);
      return this.allocateSmall(bucket, bytes);
    }
    if (bytes <= 0x3fff0) return this.allocateMedium(bytes);
    return unknown(`Native process-heap allocation branch for ${bytes} bytes is not implemented`);
  }
  private validBacking(backing: NativeMemoryBacking, length: number, virtual: boolean): boolean {
    return !backing.freed && backing.bytes.length === length && backing.knownMask.length === length && (!virtual || (!backing.bytes.some(byte => byte !== 0) && !backing.knownMask.some(byte => byte !== 255)));
  }
  private allocateSmall(bucket: Bucket, requested: number): NativeValue<Allocation | null> {
    const rule = bucket.rule;
    const count = (this.global32(rule.globals.count) + 1) >>> 0;
    this.setGlobal32(rule.globals.count, count);
    if (this.global32(rule.globals.peak) < count) this.setGlobal32(rule.globals.peak, count);
    this.trace.push(`pool-count:${rule.stride}:${count}`);
    while (true) {
      for (let pool = bucket.head; pool; pool = pool.next) {
        if (get32(pool.region, 8) === rule.capacity) continue;
        put32(pool.region, 8, get32(pool.region, 8) + 1);
        const start = get32(pool.region, 12), words = rule.bitmapBytes / 4;
        for (let word = start; word < words; word++) {
          const available = get32(pool.region, rule.bitmapOffset + word * 4);
          if (available === 0) continue;
          const bit = 31 - Math.clz32((available & -available) >>> 0);
          put32(pool.region, rule.bitmapOffset + word * 4, available & ~(1 << bit));
          put32(pool.region, 12, word);
          this.trace.push(`pool-allocate:${rule.stride}:${word * 32 + bit}`);
          return known(this.allocation(pool.region, 16 + (word * 32 + bit) * rule.stride, rule.stride, requested, pool, null));
        }
        put32(pool.region, 8, get32(pool.region, 8) - 1); put32(pool.region, 12, 0);
      }
      const memory = this.platform.virtualAlloc(rule.regionBytes, 0x103000, 4);
      if (!memory.known) return memory;
      if (memory.value === null) {
        const next = this.buckets.find(value => rule.stride + 1 >= value.rule.minimumRequest && rule.stride + 1 <= value.rule.maximumRequest);
        this.trace.push(`pool-fallback:${rule.stride}`);
        if (next) return this.allocateSmall(next, requested);
        return unknown(`Native ${rule.stride}-byte pool VirtualAlloc failure tail-dispatches the next unaudited bucket`);
      }
      if (!this.validBacking(memory.value, rule.regionBytes, true)) return unknown('VirtualAlloc host did not return a fresh zeroed known native region');
      this.retainedVirtualRegions.push(memory.value);
      const initialized = this.initializePool(bucket, memory.value);
      if (!initialized.known) return initialized;
    }
  }
  private initializePool(bucket: Bucket, region: NativeMemoryRegion): NativeValue<void> {
    const rule = bucket.rule;
    if (bucket.descriptor === null) {
      const allocated = this.platform.crtNew(20);
      if (!allocated.known) return allocated;
      if (allocated.value === null) return unknown('Native pool descriptor CRTnew failure/new-handler branch is not owned');
      if (!this.validBacking(allocated.value, 20, false)) return unknown('Invalid retained native CRT pool descriptor');
      bucket.descriptor = allocated.value;
      for (let index = 0; index < 4; index++) put32(bucket.descriptor, 4 + index * 4, Number.parseInt(rule.callbacks[index]!, 16));
      pointer(bucket.descriptor, 0, null);
      const previous = this.descriptorHead; this.descriptorHead = bucket.descriptor;
      this.setGlobalPointer('102fb004', bucket.descriptor); pointer(bucket.descriptor, 0, previous);
      this.setGlobalPointer(rule.globals.descriptor, bucket.descriptor);
      this.trace.push(`descriptor-link:${rule.stride}`);
    }
    put32(region, 8, 0); put32(region, 12, 0);
    region.bytes.fill(255, rule.bitmapOffset, rule.bitmapOffset + rule.bitmapBytes);
    region.knownMask.fill(255, rule.bitmapOffset, rule.bitmapOffset + rule.bitmapBytes);
    put32(region, rule.bitmapOffset + rule.bitmapBytes - 4, rule.lastBitmapMask);
    pointer(region, 0, null);
    const pool: Pool = { region, bucket, next: bucket.head };
    bucket.head = pool; this.setGlobalPointer(rule.globals.list, region); pointer(region, 0, pool.next?.region ?? null);
    const area: Area = { region, lower: 16, upper: 16 + rule.payloadBytes, pool, descriptor: bucket.descriptor };
    // Native addPointerArea insertion compares old lower < new upper.
    let position = 0;
    while (position < this.areas.length) {
      const existing = this.areas[position]!;
      const comparison = this.platform.compareRegions(existing.region, region);
      if (!comparison.known) return comparison;
      if (comparison.value > 0 || (comparison.value === 0 && existing.lower >= area.upper)) break;
      position++;
    }
    if (!this.hasRange('10149a18', (this.areas.length + 1) * 16)) return unknown('Native pointer-area write exceeds the source-pinned selected record range');
    this.areas.splice(position, 0, area);
    // Static original MemPointerArea records: lower, upper, context, descriptor.
    // The numerical pointer bits stay unknown; the ordered capabilities above
    // are the same records consumed by owned Free/Realloc dispatch.
    const table = this.range('10149a18', this.areas.length * 16);
    for (let index = 0; index < this.areas.length; index++) {
      const record = this.areas[index]!;
      pointer(table.backing, table.offset + index * 16, record);
      pointer(table.backing, table.offset + index * 16 + 4, record);
      pointer(table.backing, table.offset + index * 16 + 8, record.region);
      pointer(table.backing, table.offset + index * 16 + 12, record.descriptor);
    }
    this.setGlobal32('102fb030', (this.global32('102fb030') + 1) >>> 0);
    this.trace.push(`pointer-area:${rule.stride}:${position}`);
    return known(undefined);
  }
  private copy(to: Allocation, from: Allocation, bytes: number) {
    if (bytes > to.capacity) throw new Error('Source capacity copy exceeds destination');
    to.bytes.set(from.bytes.subarray(0, bytes)); to.knownMask.set(from.knownMask.subarray(0, bytes));
    this.trace.push(`copy:${bytes}`);
  }
  private release(allocation: Allocation) {
    if (allocation.pool) {
      const { rule } = allocation.pool.bucket, { region } = allocation;
      const index = (allocation.offset - 16) / rule.stride, word = index >>> 5, bit = index & 31;
      this.setGlobal32(rule.globals.count, this.global32(rule.globals.count) - 1);
      put32(region, rule.bitmapOffset + word * 4, get32(region, rule.bitmapOffset + word * 4) | (1 << bit));
      put32(region, 8, get32(region, 8) - 1); put32(region, 12, word);
      this.trace.push(`pool-free:${rule.stride}:${index}`);
    } else if (allocation.block) this.freeMedium(allocation.block);
    allocation.freed = true;
  }

  private storeBlock(block: MediumBlock) {
    pointer(block.region, block.offset, block.previous); pointer(block.region, block.offset + 4, block.next);
    put32(block.region, block.offset + 8, block.units); put32(block.region, block.offset + 12, block.allocated ? 1 : 0);
  }
  private insertFree(block: MediumBlock) {
    block.freePrevious = null; block.freeNext = this.freeBuckets.get(block.units) ?? null;
    if (block.freeNext) { block.freeNext.freePrevious = block; pointer(block.freeNext.region, block.freeNext.offset + 20, block); }
    pointer(block.region, block.offset + 16, block.freeNext); pointer(block.region, block.offset + 20, null);
    this.freeBuckets.set(block.units, block); this.setGlobalPointer((0x10144214 + block.units * 4).toString(16), block);
  }
  private unlinkFree(block: MediumBlock) {
    if (block.freeNext) { block.freeNext.freePrevious = block.freePrevious; pointer(block.freeNext.region, block.freeNext.offset + 20, block.freePrevious); }
    if (block.freePrevious) { block.freePrevious.freeNext = block.freeNext; pointer(block.freePrevious.region, block.freePrevious.offset + 16, block.freeNext); }
    if (this.freeBuckets.get(block.units) === block) {
      if (block.freeNext) this.freeBuckets.set(block.units, block.freeNext); else this.freeBuckets.delete(block.units);
      this.setGlobalPointer((0x10144214 + block.units * 4).toString(16), block.freeNext);
    }
  }
  private split(block: MediumBlock, units: number) {
    if (units === block.units) return;
    const remainder: MediumBlock = { region: block.region, offset: block.offset + units * 1024, units: block.units - units, allocated: false, previous: block, next: block.next, freePrevious: null, freeNext: null };
    if (block.next) { block.next.previous = remainder; pointer(block.next.region, block.next.offset, remainder); }
    block.units = units; block.next = remainder;
    this.storeBlock(block); this.storeBlock(remainder); this.insertFree(remainder);
    this.trace.push(`medium-split:${units}:${remainder.units}`);
  }
  private mergeForward(block: MediumBlock) {
    const next = block.next;
    if (!next || next.allocated) throw new Error('Native medium merge requires a free next block');
    this.unlinkFree(next); block.units += next.units; block.next = next.next;
    if (block.next) { block.next.previous = block; pointer(block.next.region, block.next.offset, block); }
    this.storeBlock(block); this.trace.push(`medium-merge:${block.units}`);
  }
  private allocateMedium(bytes: number): NativeValue<Allocation | null> {
    const units = ((bytes + 0x40f) >>> 0) >>> 10;
    while (true) {
      for (let size = units; size <= 4096; size++) {
        const block = this.freeBuckets.get(size); if (!block) continue;
        this.unlinkFree(block); this.split(block, units); block.allocated = true; put32(block.region, block.offset + 12, 1);
        this.trace.push(`medium-allocate:${units}`);
        return known(this.allocation(block.region, block.offset + 16, units * 1024 - 16, bytes, null, block));
      }
      const memory = this.platform.virtualAlloc(0x400000, 0x103000, 4);
      if (!memory.known) return memory;
      if (memory.value === null) return known(null);
      const region = memory.value;
      if (!this.validBacking(region, 0x400000, true)) return unknown('VirtualAlloc did not return a fresh known medium region');
      this.retainedVirtualRegions.push(region);
      const block: MediumBlock = { region, offset: 0, units: 4096, allocated: false, previous: null, next: null, freePrevious: null, freeNext: null };
      this.storeBlock(block);
      let position = 0;
      while (position < this.mediumRegions.length) {
        const comparison = this.platform.compareRegions(this.mediumRegions[position]!, region);
        if (!comparison.known) return comparison;
        if (comparison.value > 0) break; position++;
      }
      if (!this.hasRange('10148218', (this.mediumRegions.length + 1) * 4)) return unknown('Native medium-region insertion exceeds the source-owned table range');
      this.mediumRegions.splice(position, 0, region);
      const table = this.range('10148218', this.mediumRegions.length * 4);
      for (let index = 0; index < this.mediumRegions.length; index++) pointer(table.backing, table.offset + index * 4, this.mediumRegions[index]!);
      this.setGlobal32('102fb04c', this.global32('102fb04c') + 1);
      this.insertFree(block); this.trace.push(`medium-region:${position}`);
    }
  }
  private freeMedium(block: MediumBlock) {
    block.allocated = false; put32(block.region, block.offset + 12, 0);
    if (block.next && !block.next.allocated) this.mergeForward(block);
    this.insertFree(block);
    if (block.previous && !block.previous.allocated) {
      const previous = block.previous; this.unlinkFree(previous); this.mergeForward(previous); this.insertFree(previous);
    }
    this.trace.push('medium-free');
  }
  private reallocateMedium(allocation: Allocation, bytes: number): NativeValue<Allocation | null> {
    const block = allocation.block!;
    const units = ((bytes + 0x40f) >>> 0) >>> 10;
    if (units === 0) return unknown('Native medium realloc uint32 wrap reaches an unported zero-unit split branch');
    if (units < block.units) {
      this.split(block, units); allocation.capacity = units * 1024 - 16; allocation.requestedBytes = bytes; return known(allocation);
    }
    if (units === block.units) { allocation.requestedBytes = bytes; return known(allocation); }
    if (block.next && !block.next.allocated && block.units + block.next.units >= units) {
      this.mergeForward(block); this.split(block, units); allocation.capacity = units * 1024 - 16; allocation.requestedBytes = bytes; return known(allocation);
    }
    const moved = this.allocate(bytes); if (!moved.known) return moved;
    if (moved.value) this.copy(moved.value, allocation, allocation.capacity);
    // Unlike the small-pool callback, the native medium helper frees the old
    // block even when its allocation returns NULL.
    this.release(allocation); return moved;
  }

  snapshot() {
    return {
      initialized: this.byte('1014279c') !== 0, created: this.byte('1014279d') !== 0,
      guard: this.global32('101427a4'), singletonBytes: [this.byte('101427a0'), this.byte('101427a1'), this.byte('101427a2')],
      criticalSectionInitialized: this.byte('102fb000') !== 0, criticalSectionEntered: this.entered, blockedReason: this.halted,
      pointerAreaCount: this.global32('102fb030'), mediumRegionCount: this.global32('102fb04c'),
      virtualRegions: [...this.retainedVirtualRegions],
      pools: this.buckets.map(bucket => ({ stride: bucket.rule.stride, count: this.global32(bucket.rule.globals.count), peak: this.global32(bucket.rule.globals.peak), descriptor: bucket.descriptor, regions: this.areas.filter(area => area.pool.bucket === bucket).map(area => ({ region: area.region, used: get32(area.region, 8), searchWord: get32(area.region, 12) })) })),
      mediumFree: [...this.freeBuckets].map(([units, block]) => ({ units, region: block.region, offset: block.offset })),
      trace: [...this.trace],
    };
  }
}
