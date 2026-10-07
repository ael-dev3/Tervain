import { describe, expect, it } from 'vitest';
import { NativeMemoryAdmin } from '../src/gothic3/native-memory-admin';
import type { NativeMemoryAllocation, NativeMemoryBacking, NativeMemoryPlatform, NativeMemoryRegion } from '../src/gothic3/native-memory-admin';
import type { NativeValue } from '../src/gothic3/dialogue';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function value<T>(result: NativeValue<T>): T {
  if (!result.known) throw new Error(result.reason);
  return result.value;
}
function allocation(result: NativeValue<NativeMemoryAllocation | null>): NativeMemoryAllocation {
  const resultValue = value(result); if (!resultValue) throw new Error('Expected allocation'); return resultValue;
}

/** The selected platform owns regions and CRT objects; source pool algorithms
 * live in NativeMemoryAdmin, rather than being replaced by these allocations. */
function fixture() {
  const regions: NativeMemoryRegion[] = [], crt: NativeMemoryBacking[] = [];
  const shutdown: (() => NativeValue<void>)[] = [];
  const events: string[] = [];
  let virtualBudget = Infinity, failRegionBytes: number | null = null;
  let section: object | null = null, entered = false;
  const platform: NativeMemoryPlatform = {
    virtualAlloc(bytes, type, protect) {
      expect(type).toBe(0x103000); expect(protect).toBe(4);
      events.push(`virtual:${bytes}`);
      if (regions.length >= virtualBudget || bytes === failRegionBytes) return known(null);
      const region: NativeMemoryRegion = { identity: {}, bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes).fill(255), freed: false };
      regions.push(region); return known(region);
    },
    crtNew(bytes) {
      const backing: NativeMemoryBacking = { identity: {}, bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes), freed: false };
      crt.push(backing); events.push(`crt-new:${bytes}`); return known(backing);
    },
    crtFree(backing) { backing.freed = true; events.push('crt-free'); return known(undefined); },
    compareRegions(a, b) {
      const first = regions.indexOf(a), second = regions.indexOf(b);
      if (first < 0 || second < 0) return { known: false, reason: 'Unowned region order' };
      return known(Math.sign(first - second));
    },
    initializeCriticalSection(address, owner, spinCount) {
      expect(address).toBe('10189a18'); expect(spinCount).toBe(1000);
      if (section) return { known: false, reason: 'Section already initialized' };
      section = owner; events.push('cs-init'); return known(1);
    },
    enterCriticalSection(_address, owner) {
      if (section !== owner || entered) return { known: false, reason: 'Section enter unavailable' };
      entered = true; events.push('cs-enter'); return known(undefined);
    },
    leaveCriticalSection(_address, owner) {
      if (section !== owner || !entered) return { known: false, reason: 'Section leave unavailable' };
      entered = false; events.push('cs-leave'); return known(undefined);
    },
    registerShutdown(address, _owner, execute) { expect(address).toBe('100e2710'); shutdown.push(execute); events.push('atexit'); return known(0); },
    clearDefaultCString() { return { known: false, reason: 'No external default CString substitute' }; },
  };
  return { memory: new NativeMemoryAdmin(platform), platform, regions, crt, shutdown, events,
    setVirtualBudget(count: number) { virtualBudget = count; },
    failRegion(bytes: number) { failRegionBytes = bytes; },
  };
}
const word = (bytes: Uint8Array, offset: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);

describe('source-owned SharedBase MemoryAdmin and MemHeap', () => {
  it('boots source globals once and executes the nonempty shutdown NULL-CString branch', () => {
    const f = fixture();
    expect(f.memory.snapshot().initialized).toBe(false);
    expect(value(f.memory.getInstance())).toBe(f.memory);
    value(f.memory.getInstance());
    expect(f.shutdown).toHaveLength(1);
    expect(f.memory.snapshot()).toMatchObject({ initialized: true, created: true, guard: 1, singletonBytes: [0, 1, 0] });
    value(f.shutdown[0]!());
    expect(f.memory.snapshot()).toMatchObject({ initialized: false, created: true, guard: 1, singletonBytes: [0, 1, 0] });
    expect(f.memory.snapshot().trace).toContain('default-cstring-clear-null');
    value(f.shutdown[0]!());
    expect(f.memory.snapshot().trace.filter(event => event === 'memory-shutdown')).toHaveLength(1);
  });

  it('shares original prior entity/wrapper/Navigation allocations with the later admin allocations', () => {
    const f = fixture();
    const entity = allocation(f.memory.newObject(448, 0x170));
    const wrapper = allocation(f.memory.newObject(16, 0x190));
    const navigation = allocation(f.memory.newObject(688, 0xc4));
    const holder = allocation(f.memory.newObject(12, 0xe3));
    const callbacks = allocation(f.memory.realloc(null, 108));
    const history = allocation(f.memory.realloc(null, 12500));
    expect([entity.capacity, wrapper.capacity, navigation.capacity, holder.capacity, callbacks.capacity, history.capacity]).toEqual([448, 16, 768, 12, 112, 13296]);
    expect(f.shutdown).toHaveLength(1);
    expect(f.events.filter(event => event === 'cs-init')).toHaveLength(1);
    expect(f.memory.snapshot()).toMatchObject({ pointerAreaCount: 5, mediumRegionCount: 1, criticalSectionEntered: false });
    expect(f.memory.snapshot().pools.filter(pool => pool.count === 1).map(pool => pool.stride)).toEqual([12, 16, 112, 448, 768]);
    expect(f.crt.every(backing => backing.bytes.length === 20)).toBe(true);
    for (const pool of f.memory.snapshot().pools.filter(pool => pool.descriptor)) expect(word(pool.descriptor!.bytes, 4)).toBeGreaterThan(0x10000000);
  });

  it('retains actual region views, bitmap reuse, full-stride copies, and payload after Free', () => {
    const f = fixture();
    const first = allocation(f.memory.newObject(9, 0xe3));
    expect(first.offset).toBe(16); expect(first.capacity).toBe(12);
    first.bytes.set(Array.from({ length: 12 }, (_, index) => index + 1));
    expect(first.region.bytes[16]).toBe(1);
    const second = allocation(f.memory.newObject(12, 0xe3));
    expect(second.region).toBe(first.region); expect(second.offset).toBe(28);
    const moved = allocation(f.memory.realloc(first, 13));
    expect(moved.capacity).toBe(16); expect([...moved.bytes.subarray(0, 12)]).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    expect(first.freed).toBe(true);
    const reused = allocation(f.memory.newObject(12, 0xe3));
    expect(reused.offset).toBe(first.offset); expect(reused.identity).not.toBe(first.identity);
    expect([...reused.bytes]).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    value(f.memory.free(second)); value(f.memory.deleteObject(reused)); value(f.memory.free(moved));
    expect(f.memory.snapshot().pools.filter(pool => pool.regions.length).every(pool => pool.count === 0 && pool.regions.every(region => region.used === 0))).toBe(true);
    expect(f.regions.every(region => !region.freed)).toBe(true);
  });

  it('owns all admitted map/entity/admin buckets and their descriptor and free effects', () => {
    const f = fixture();
    const requests = [12, 16, 28, 72, 108, 172, 204, 448, 688];
    const blocks = requests.map(bytes => allocation(f.memory.newObject(bytes)));
    expect(blocks.map(block => block.capacity)).toEqual([12, 16, 28, 80, 112, 192, 224, 448, 768]);
    expect(f.memory.snapshot().pointerAreaCount).toBe(9);
    expect(f.crt).toHaveLength(9);
    expect([...f.crt[0]!.knownMask.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
    expect(word(f.crt[0]!.bytes, 0)).toBe(0);
    expect([...f.crt[1]!.knownMask.subarray(0, 4)]).toEqual([0, 0, 0, 0]);
    for (const block of blocks) value(f.memory.free(block));
    expect(f.memory.snapshot().pools.every(pool => pool.count === 0 && pool.peak === 1)).toBe(true);
  });

  it('preserves native small-pointer identity for a size0 resize', () => {
    const f = fixture(); const block = allocation(f.memory.newObject(12));
    expect(value(f.memory.realloc(block, 0))).toBe(block); expect(block.freed).toBe(false);
  });

  it('implements medium in-place growth, shrink, and coalesces both neighbor directions', () => {
    const f = fixture();
    const first = allocation(f.memory.realloc(null, 12500));
    const second = allocation(f.memory.realloc(null, 12500));
    first.bytes.fill(7);
    value(f.memory.free(second));
    expect(value(f.memory.realloc(first, 20000))).toBe(first);
    expect(first.capacity).toBe(20464); expect(first.bytes[0]).toBe(7);
    expect(value(f.memory.realloc(first, 5000))).toBe(first); expect(first.capacity).toBe(5104);
    value(f.memory.free(first));
    // Native shrink inserts a new tail without merging the existing free tail;
    // Free merges only the immediate next block, preserving two free blocks.
    expect(f.memory.snapshot().mediumFree.map(block => block.units).sort((a, b) => a - b)).toEqual([20, 4076]);
    const next = allocation(f.memory.realloc(null, 12500));
    expect(next.region).toBe(first.region); expect(next.offset).toBe(16);
  });

  it('coalesces a freed medium block with its immediate next and previous neighbors', () => {
    const f = fixture();
    const first = allocation(f.memory.realloc(null, 12500));
    const middle = allocation(f.memory.realloc(null, 12500));
    const last = allocation(f.memory.realloc(null, 12500));
    value(f.memory.free(first)); value(f.memory.free(last)); value(f.memory.free(middle));
    expect(f.memory.snapshot().mediumFree).toHaveLength(1);
    expect(f.memory.snapshot().mediumFree[0]!.units).toBe(4096);
  });

  it('frees an old medium allocation when the native move allocation returns NULL', () => {
    const f = fixture(); f.setVirtualBudget(1);
    const old = allocation(f.memory.realloc(null, 12500));
    for (let index = 0; index < 15; index++) allocation(f.memory.realloc(null, 0x3fff0));
    allocation(f.memory.realloc(null, 240000));
    expect(value(f.memory.realloc(old, 100000))).toBeNull();
    expect(old.freed).toBe(true); expect(f.memory.snapshot().criticalSectionEntered).toBe(false);
  });

  it('retains failed small-pool counter effects and runs the actual audited next-bucket fallback', () => {
    const f = fixture(); f.failRegion(0xc2000);
    const block = allocation(f.memory.newObject(12, 0xe3));
    expect(block.capacity).toBe(16);
    expect(f.memory.snapshot().pools.find(pool => pool.stride === 12)!.count).toBe(1);
    expect(f.memory.snapshot().pools.find(pool => pool.stride === 16)!.count).toBe(1);
    value(f.memory.free(block));
    expect(f.memory.snapshot().pools.find(pool => pool.stride === 16)!.count).toBe(0);
  });

  it('stops at an unaudited bucket with the native entered-section prefix retained', () => {
    const f = fixture();
    const block = allocation(f.memory.newObject(12));
    const failed = f.memory.realloc(block, 300);
    expect(failed.known).toBe(false);
    expect(block.freed).toBe(false);
    expect(f.memory.snapshot()).toMatchObject({ criticalSectionEntered: true });
    expect(f.events.at(-1)).toBe('cs-enter');
    expect(f.memory.free(block).known).toBe(false);
  });
});
