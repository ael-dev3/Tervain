import { describe, expect, it, vi } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeLiveEntity } from '../../src/gothic3/entity-lifecycle';
import { OriginalPropertyOwner } from '../../src/gothic3/native-properties';
import { NativeMemoryAdmin } from '../../src/gothic3/native-memory-admin';
import type { NativeMemoryAllocation } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeHeapSceneEntityRegistry, NativeScenePropertyIdHeap, nativePropertyIdHash } from '../../src/gothic3/native-scene-heap';
import type { NativeSceneHeapHost, NativeSceneHeapSection } from '../../src/gothic3/native-scene-heap';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function fact<T>(value: NativeValue<T>): T { if (!value.known) throw new Error(value.reason); return value.value; }
function id(first = 8, last = 0, second = 0): string {
  const bytes = new Uint8Array(20), view = new DataView(bytes.buffer);
  view.setUint32(0, first, true); view.setUint32(4, second, true); view.setUint32(16, last, true);
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function entity(name: string, value = id()): NativeLiveEntity {
  return new NativeLiveEntity(name, OriginalPropertyOwner.fromConstructor(name, 'gCEntity'), value);
}
/** The selected section owns an actual entered depth; its callbacks are
 * observable and can fail after effects. It is an initialized table capability,
 * with no claim that the full SceneAdmin/global module has been constructed. */
function fixture(options: { initialize?: boolean } = {}) {
  const platform = new NativeRuntimePlatform(), memory = new NativeMemoryAdmin(platform);
  const events: string[] = []; let depth = 0;
  const section: NativeSceneHeapSection = {
    identity: {}, sourceAddress: '30af24f4',
    acquire() { depth++; events.push('enter'); return known(undefined); },
    release() {
      if (depth === 0) return { known: false, reason: 'Selected section was not entered' };
      depth--; events.push('leave'); return known(undefined);
    },
  };
  const host: NativeSceneHeapHost = { memory, section };
  const heap = new NativeScenePropertyIdHeap(host), registry = new NativeHeapSceneEntityRegistry(heap);
  if (options.initialize !== false) fact(registry.initialize());
  return { platform, memory, events, section, host, heap, registry, depth: () => depth };
}

describe('physical selected SceneAdmin PropertyID table', () => {
  it('constructs without a section and gates only the first operation that acquires it', () => {
    const memory = new NativeMemoryAdmin(new NativeRuntimePlatform());
    const heap = new NativeScenePropertyIdHeap({ memory });
    fact(heap.initialize());
    expect(heap.holder.readUnsigned(4)).toBe(43);
    expect(fact(heap.register(null))).toBe(false);
    expect(heap.register(entity('requires-section'))).toMatchObject({ known: false });
    expect(heap.snapshot()).toMatchObject({ entered: false, phase: 'blocked' });
    expect(heap.snapshot().boundary).toContain('section30af24f4');
    expect(heap.snapshot().retainedNodes).toHaveLength(0);
    expect(memory.snapshot().pools.find(pool => pool.stride === 224)!.count).toBe(1);
  });

  it('does not inspect a supplied section before the source constructor finishes', () => {
    let reads = 0;
    const memory = new NativeMemoryAdmin(new NativeRuntimePlatform());
    const host = { memory, get section(): NativeSceneHeapSection { reads++; throw new Error('Section capability unavailable'); } };
    const heap = new NativeScenePropertyIdHeap(host); fact(heap.initialize());
    expect(reads).toBe(0); expect(heap.holder.readUnsigned(4)).toBe(43);
    const result = heap.register(entity('first-section-use')); expect(result.known).toBe(false);
    expect(reads).toBe(1); expect(heap.snapshot().entered).toBe(false);
    expect(heap.register(entity('no-replay'))).toEqual(result); expect(reads).toBe(1);
  });

  it('owns a 16B holder, requested204B backing, source43 buckets and51 capacity', () => {
    const f = fixture(), state = f.heap.snapshot(), allocation = state.backing!;
    expect(state).toMatchObject({ phase: 'ready', bucketCount: 43, capacity: 51, entryCount: 0, entered: false });
    expect(allocation).toMatchObject({ requestedBytes: 204, capacity: 224, freed: false });
    expect(state.holder.pointer(0).get()).toBe(allocation);
    expect([...state.holder.knownMask.subarray(0, 4)]).toEqual([0, 0, 0, 0]);
    expect([...allocation.bytes.subarray(0, 204)]).toEqual(Array(204).fill(0));
    expect([...allocation.knownMask.subarray(0, 204)]).toEqual(Array(204).fill(255));
    expect(f.memory.snapshot().pools.find(pool => pool.stride === 224)!.count).toBe(1);
    fact(f.heap.initialize()); expect(f.memory.snapshot().pools.find(pool => pool.stride === 224)!.count).toBe(1);
    expect(f.events).toEqual([]); // Table construction does not acquire this section.
  });

  it('uses unsigned source hash DWORD0>>3 plusDWORD16 without normalizing the ID', () => {
    expect(nativePropertyIdHash(id(0xffffffff, 0xffffffff))).toBe(0x1ffffffe);
    expect(nativePropertyIdHash(id(8, 3))).toBe(4);
    expect(() => nativePropertyIdHash('00')).toThrow('twenty');
    const f = fixture(), owner = entity('same-guid');
    expect(f.registry.register(owner).outcome).toBe('complete');
    // Equality ignores the tail DWORD; lookup still hashes the caller's tail.
    expect(f.registry.findRegistered(id(8, 43))).toBe(owner);
    expect(f.registry.findRegistered(id(8, 1))).toBeNull();
  });

  it('constructs physical28B linked nodes and overwrites duplicate IDs without allocating', () => {
    const f = fixture(), first = entity('first'), replacement = entity('replacement');
    const newObject = vi.spyOn(f.memory, 'newObject');
    expect(f.registry.register(first)).toMatchObject({ outcome: 'complete', value: true });
    const node = f.heap.snapshot().retainedNodes[0]!;
    expect(node.allocation).toMatchObject({ requestedBytes: 28, capacity: 28, freed: false });
    expect(newObject).toHaveBeenCalledExactlyOnceWith(28, 0x199);
    expect(node.views.propertyId(0).get()).toBe(first.propertyId20);
    expect(node.views.pointer(20).get()).toBe(first); expect(node.views.pointer(24).get()).toBeNull();
    expect([...node.views.knownMask.subarray(20, 24)]).toEqual([0, 0, 0, 0]);
    expect(f.registry.register(replacement)).toMatchObject({ outcome: 'complete', value: true });
    expect(f.heap.snapshot().retainedNodes).toHaveLength(1); expect(f.heap.snapshot().entryCount).toBe(1);
    expect(node.views.pointer(20).get()).toBe(replacement);
    expect(f.registry.unregister(first)).toMatchObject({ outcome: 'complete', value: true });
    expect(node.allocation.freed).toBe(true); expect([...node.allocation.bytes.subarray(0, 20)]).toEqual(Array(20).fill(0));
    expect(f.registry.findRegistered(replacement.propertyId20)).toBeNull();
    expect(f.heap.snapshot().entryCount).toBe(0); expect(f.depth()).toBe(0);
  });

  it('traverses actual bucket links and unlinks middle, head and tail in source order', () => {
    const f = fixture(), owners = [entity('tail', id(8)), entity('middle', id(8 + 43 * 8)), entity('head', id(8 + 86 * 8))];
    owners.forEach(owner => expect(f.registry.register(owner).outcome).toBe('complete'));
    const [tail, middle, head] = f.heap.snapshot().retainedNodes;
    const table = new NativeHeapObjectViews(f.heap.snapshot().backing!, 0, 204);
    expect(table.pointer<{ views: NativeHeapObjectViews }>(4).get()!.views).toBe(head!.views);
    expect(head!.views.pointer<{ views: NativeHeapObjectViews }>(24).get()!.views).toBe(middle!.views);
    expect(middle!.views.pointer<{ views: NativeHeapObjectViews }>(24).get()!.views).toBe(tail!.views);
    const nativeDelete = f.memory.deleteObject.bind(f.memory);
    const deletion = vi.spyOn(f.memory, 'deleteObject').mockImplementation(allocation => {
      if (!allocation) throw new Error('Actual linked node must be supplied');
      expect([...allocation.bytes.subarray(0, 20)]).toEqual(Array(20).fill(0));
      expect(f.heap.snapshot().entryCount).toBe(3);
      expect(head!.views.pointer<{ views: NativeHeapObjectViews }>(24).get()!.views).toBe(tail!.views);
      return nativeDelete(allocation);
    });
    expect(f.registry.unregister(owners[1]!).outcome).toBe('complete'); deletion.mockRestore();
    expect(f.registry.findRegistered(owners[0]!.propertyId20)).toBe(owners[0]);
    expect(f.registry.findRegistered(owners[2]!.propertyId20)).toBe(owners[2]);
    expect(f.registry.unregister(owners[2]!).outcome).toBe('complete');
    expect(f.registry.unregister(owners[0]!).outcome).toBe('complete');
    expect(f.heap.snapshot().entryCount).toBe(0); expect(table.pointer(4).get()).toBeNull();
  });

  it('frees the old identity before the source stream read and registers copy16/tail0 afterward', () => {
    const f = fixture(), owner = entity('read-owner'); f.registry.register(owner);
    const old = f.heap.snapshot().retainedNodes[0]!.allocation;
    const result = f.registry.readNodeIdentity(owner, 0xffff, () => {
      expect(old.freed).toBe(true); expect(f.heap.snapshot().entryCount).toBe(0); expect(f.depth()).toBe(0);
      return known(id(80, 0xdecafbad));
    });
    expect(result).toMatchObject({ outcome: 'complete', value: 1 });
    expect(owner.propertyId20).toBe(id(80)); expect(owner.sourceReadStage).toBe('node-id-read');
    expect(f.registry.findRegistered(id(80))).toBe(owner);
    const next = f.heap.snapshot().retainedNodes[1]!.allocation;
    expect(next.identity).not.toBe(old.identity); expect(next.region).toBe(old.region); expect(next.offset).toBe(old.offset);
    expect(f.events).toEqual(['enter', 'leave', 'enter', 'leave', 'enter', 'leave']);
  });

  it('retains a failed read prefix and blocks replay after the old node was removed', () => {
    const f = fixture(), owner = entity('failed-read'); f.registry.register(owner);
    let reads = 0;
    const read = () => { reads++; return { known: false as const, reason: 'Source stream unavailable' }; };
    expect(f.registry.readNodeIdentity(owner, 83, read)).toMatchObject({ outcome: 'partial' });
    expect(f.heap.snapshot().retainedNodes[0]!.allocation.freed).toBe(true);
    expect(f.heap.snapshot().entryCount).toBe(0); expect(f.registry.findRegistered(owner.propertyId20)).toBeNull();
    expect(f.registry.readNodeIdentity(owner, 83, read)).toMatchObject({ outcome: 'unsupported' }); expect(reads).toBe(1);
  });

  it('returns NULL before touching the section and invokes invalid-owner Create while entered', () => {
    const f = fixture(), owner = entity('invalid', id(0));
    expect(f.registry.register(null)).toMatchObject({ outcome: 'complete', value: false });
    expect(f.registry.unregister(null)).toMatchObject({ outcome: 'complete', value: false }); expect(f.events).toEqual([]);
    const create = owner.create.bind(owner);
    vi.spyOn(owner, 'create').mockImplementation(() => { expect(f.depth()).toBe(1); return create(); });
    expect(f.registry.register(owner).outcome).toBe('complete'); expect(owner.referenceWord).toBe(0x80000001);
    expect(f.registry.findRegistered(id(0))).toBe(owner); expect(f.events).toEqual(['enter', 'leave']);
  });

  it('keeps registered lookup unlocked and preserves spatial/template hint ordering and unknowns', () => {
    const f = fixture(), owner = entity('lookup'); f.registry.register(owner); f.events.length = 0;
    const spatial = vi.fn(() => known(null)), template = vi.fn(() => known(owner));
    const host = { findSpatial: spatial, findTemplate: template };
    expect(fact(f.registry.getEntity(owner.propertyId20, 0, host))).toBe(owner);
    expect(spatial).not.toHaveBeenCalled(); expect(f.events).toEqual([]);
    expect(fact(f.registry.getEntity(id(800), 0, host))).toBe(owner);
    expect(spatial).toHaveBeenCalledOnce(); expect(template).toHaveBeenCalledOnce();
    spatial.mockClear(); template.mockClear();
    expect(fact(f.registry.getEntity(id(800), 2, host))).toBe(owner); expect(spatial).not.toHaveBeenCalled();
    expect(fact(f.registry.getEntity(id(800), 3, host))).toBeNull();
    expect(f.registry.getEntity(id(800), 1, { ...host, findSpatial: () => ({ known: false, reason: 'Spatial table not owned' }) })).toEqual({ known: false, reason: 'Spatial table not owned' });
    expect(f.events).toEqual([]);
  });

  it('detects raw chain-pointer corruption rather than consulting a second logical ID map', () => {
    const f = fixture(), owner = entity('corrupt'); f.registry.register(owner);
    const backing = f.heap.snapshot().backing!; backing.bytes[4] = backing.bytes[4]! ^ 1;
    expect(f.heap.lookup(owner.propertyId20)).toMatchObject({ known: false, reason: expect.stringContaining('backing changed') });
    expect(() => f.registry.findRegistered(owner.propertyId20)).toThrow('backing changed');
  });

  it('blocks constructor replay after ignored direct constructor reentry', () => {
    const f = fixture({ initialize: false });
    const nativeRealloc = f.memory.realloc.bind(f.memory); let retained: NativeMemoryAllocation | null = null;
    const realloc = vi.spyOn(f.memory, 'realloc').mockImplementation((old, bytes) => {
      retained = fact(nativeRealloc(old, bytes));
      expect(f.heap.initialize()).toMatchObject({ known: false });
      return known(retained);
    });
    expect(f.heap.initialize()).toMatchObject({ known: false, reason: expect.stringContaining('reentrant') });
    expect(retained).not.toBeNull(); expect(f.heap.snapshot()).toMatchObject({ phase: 'blocked', bucketCount: 0, capacity: 0, entryCount: 0, backing: null });
    expect(f.heap.initialize()).toMatchObject({ known: false }); expect(realloc).toHaveBeenCalledOnce();
  });

  it('retains actual allocations from an unknown allocator callback without publishing a completed table', () => {
    const f = fixture({ initialize: false }), nativeRealloc = f.memory.realloc.bind(f.memory);
    let retained: NativeMemoryAllocation | null = null;
    const realloc = vi.spyOn(f.memory, 'realloc').mockImplementation((old, bytes) => {
      retained = fact(nativeRealloc(old, bytes)); return { known: false, reason: 'Allocator return not established after applied prefix' };
    });
    expect(f.heap.initialize()).toMatchObject({ known: false, reason: expect.stringContaining('return not established') });
    expect(retained).not.toBeNull(); expect(f.memory.snapshot().pools.find(pool => pool.stride === 224)!.count).toBe(1);
    expect(f.heap.snapshot()).toMatchObject({ phase: 'blocked', backing: null, bucketCount: 0, capacity: 0, entryCount: 0 });
    expect(f.heap.initialize()).toMatchObject({ known: false }); expect(realloc).toHaveBeenCalledOnce();
  });

  it('preserves PropertyID constructor, assignment and destructor DWORD store order', () => {
    const f = fixture(), owner = entity('store-order', id(8, 0, 24)), writes: number[] = [];
    const original = NativeHeapObjectViews.prototype.writeUnsigned;
    const store = vi.spyOn(NativeHeapObjectViews.prototype, 'writeUnsigned').mockImplementation(function (this: NativeHeapObjectViews, offset, value, width) {
      if (this.bytes.length === 28) writes.push(offset);
      original.call(this, offset, value, width);
    });
    expect(f.registry.register(owner).outcome).toBe('complete');
    // Last pointer is a known NULL next link, represented by DWORD24=0.
    expect(writes).toEqual([12, 8, 4, 0, 16, 0, 4, 8, 12, 16, 24]); writes.length = 0;
    expect(f.registry.unregister(owner).outcome).toBe('complete');
    expect(writes).toEqual([12, 8, 4, 0, 16]); store.mockRestore();
  });

  it('latches ignored direct register reentry during acquire and retains the completed section enter', () => {
    const f = fixture(), owner = entity('outer'), nested = entity('nested', id(80));
    const acquire = f.section.acquire.bind(f.section);
    vi.spyOn(f.section, 'acquire').mockImplementation(() => {
      const entered = acquire(); expect(f.heap.register(nested)).toMatchObject({ known: false }); return entered;
    });
    expect(f.heap.register(owner)).toMatchObject({ known: false, reason: expect.stringContaining('reentrant') });
    expect(f.heap.snapshot()).toMatchObject({ phase: 'blocked', entered: true, entryCount: 0 }); expect(f.depth()).toBe(1);
    expect(f.heap.register(owner)).toMatchObject({ known: false }); expect(f.events).toEqual(['enter']);
  });

  it('marks section depth unknown after an unknown acquire callback with effects', () => {
    const f = fixture(), owner = entity('unknown-enter'), acquire = f.section.acquire.bind(f.section);
    const enter = vi.spyOn(f.section, 'acquire').mockImplementation(() => {
      fact(acquire()); return { known: false, reason: 'Selected enter return unavailable after effect' };
    });
    expect(f.heap.register(owner)).toMatchObject({ known: false, reason: expect.stringContaining('enter return unavailable') });
    expect(f.heap.snapshot()).toMatchObject({ phase: 'blocked', entered: null, entryCount: 0 });
    expect(f.depth()).toBe(1); expect(f.events).toEqual(['enter']);
    expect(f.heap.register(owner)).toMatchObject({ known: false }); expect(enter).toHaveBeenCalledOnce();
  });

  it('marks section depth unknown after an unknown release callback and preserves the published entry', () => {
    const f = fixture(), owner = entity('unknown-leave'), release = f.section.release.bind(f.section);
    const leave = vi.spyOn(f.section, 'release').mockImplementation(() => {
      fact(release()); return { known: false, reason: 'Selected leave return unavailable after effect' };
    });
    expect(f.heap.register(owner)).toMatchObject({ known: false, reason: expect.stringContaining('leave return unavailable') });
    expect(f.heap.snapshot()).toMatchObject({ phase: 'blocked', entered: null, entryCount: 1 });
    expect(f.heap.snapshot().retainedNodes[0]!.views.pointer(20).get()).toBe(owner);
    expect(f.depth()).toBe(0); expect(f.events).toEqual(['enter', 'leave']);
    expect(f.heap.register(owner)).toMatchObject({ known: false }); expect(leave).toHaveBeenCalledOnce();
  });

  it('retains unlink/destructor effects when DeleteObject fails and never replays them', () => {
    const f = fixture(), owner = entity('partial-delete'); f.registry.register(owner);
    const node = f.heap.snapshot().retainedNodes[0]!;
    const deletion = vi.spyOn(f.memory, 'deleteObject').mockReturnValue({ known: false, reason: 'Native heap callback unavailable' });
    expect(f.registry.unregister(owner)).toMatchObject({ outcome: 'partial' });
    expect([...node.allocation.bytes.subarray(0, 20)]).toEqual(Array(20).fill(0)); expect(node.allocation.freed).toBe(false);
    expect(f.heap.snapshot()).toMatchObject({ phase: 'blocked', entered: true, entryCount: 1 });
    expect(f.registry.unregister(owner)).toMatchObject({ outcome: 'unsupported' }); expect(deletion).toHaveBeenCalledOnce(); expect(f.depth()).toBe(1);
  });
});
