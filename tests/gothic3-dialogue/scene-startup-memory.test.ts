import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativeSceneStartupHeapExtension } from '../../src/gothic3/native-memory-admin';
import type { NativeMemoryAllocation, NativeMemoryRulesExtension } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeValue } from '../../src/gothic3/dialogue';

function value<T>(result: NativeValue<T>): T {
  if (!result.known) throw new Error(result.reason); return result.value;
}
function block(result: NativeValue<NativeMemoryAllocation | null>): NativeMemoryAllocation {
  const allocation = value(result); if (!allocation) throw new Error('Expected source allocation'); return allocation;
}
function fixture(extensions: readonly NativeMemoryRulesExtension[] = [nativeNpcHeapExtension, nativeSceneStartupHeapExtension]) {
  const platform = new NativeRuntimePlatform();
  return { platform, memory: new NativeMemoryAdmin(platform, { extensions }) };
}
const text = (input: string) => Uint8Array.from([...input].map(character => character.charCodeAt(0)).concat(0));
const word = (bytes: Uint8Array, offset: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);

describe('source-admitted pools for class-name and reflected SceneAdmin allocation', () => {
  it('retains frozen source identities and rejects copied, repeated, and conflicting caller extensions before platform calls', () => {
    const original = readFileSync(new URL('../../assets/gothic3/runtime-admin/runtime-rules.json', import.meta.url));
    expect(createHash('sha256').update(original).digest('hex')).toBe(nativeSceneStartupHeapExtension.baseRulesSha256);
    expect(nativeSceneStartupHeapExtension.schema).toBe('gothic3-scene-startup-rules-v1');
    expect(Object.isFrozen(nativeSceneStartupHeapExtension)).toBe(true);
    expect(Object.isFrozen(nativeSceneStartupHeapExtension.inputs)).toBe(true);
    const platform = new NativeRuntimePlatform();
    const conflictingCaller = { ...nativeSceneStartupHeapExtension, buckets: { 24: { minimumRequest: 17, maximumRequest: 24 } } };
    for (const extensions of [
      [{ ...nativeSceneStartupHeapExtension }],
      [Object.create(nativeSceneStartupHeapExtension) as NativeMemoryRulesExtension],
      [nativeSceneStartupHeapExtension, nativeSceneStartupHeapExtension],
      [nativeNpcHeapExtension, nativeSceneStartupHeapExtension, nativeNpcHeapExtension],
      [nativeNpcHeapExtension, conflictingCaller],
    ]) expect(() => new NativeMemoryAdmin(platform, { extensions })).toThrow('source identity');
    expect(platform.snapshot().allocations).toHaveLength(0);
    expect(platform.snapshot().pending).toHaveLength(0);
    expect(platform.snapshot().sections).toHaveLength(0);
  });

  it('preserves the eight-bucket default and ten-bucket NPC profile while adding a separate ten-bucket scene profile', () => {
    const base = new NativeMemoryAdmin(new NativeRuntimePlatform());
    expect(base.snapshot().pools.map(pool => pool.stride)).toEqual([12, 16, 28, 112, 192, 224, 448, 768]);
    expect(base.newObject(21).known).toBe(false);
    const npc = fixture([nativeNpcHeapExtension]);
    expect(npc.memory.snapshot().pools.map(pool => pool.stride)).toEqual([12, 16, 20, 28, 40, 112, 192, 224, 448, 768]);
    expect(npc.memory.newObject(348, 0xc4).known).toBe(false);
    const scene = fixture([nativeSceneStartupHeapExtension]);
    expect(scene.memory.snapshot().pools.map(pool => pool.stride)).toEqual([12, 16, 24, 28, 112, 192, 224, 384, 448, 768]);
    expect(block(scene.memory.malloc(21)).capacity).toBe(24);
    expect(block(scene.memory.newObject(348, 0xc4)).capacity).toBe(384);
  });

  it('uses exact dispatch boundaries without admitting surrounding unsupported pools', () => {
    const f = fixture([nativeSceneStartupHeapExtension]);
    expect([21, 24, 321, 348, 384].map(request => block(f.memory.newObject(request)).capacity)).toEqual([24, 24, 384, 384, 384]);
    expect(block(f.memory.newObject(25)).capacity).toBe(28);
    expect(block(f.memory.newObject(385)).capacity).toBe(448);
    for (const request of [20, 29, 32, 41, 320, 449, 640]) {
      const selected = fixture([nativeSceneStartupHeapExtension]);
      const result = selected.memory.newObject(request);
      expect(result.known).toBe(false);
      if (!result.known) expect(result.reason).toBe(`Native simple-allocation table bucket for ${request} bytes is not audited`);
      expect(selected.memory.snapshot().pointerAreaCount).toBe(0);
      expect(selected.platform.snapshot().allocations).toHaveLength(0);
    }
  });

  it('owns the exact descriptor callbacks, region geometry, bitmap and retained payload for both source pools', () => {
    const f = fixture(), small = block(f.memory.malloc(21)), scene = block(f.memory.newObject(348, 0xc4));
    const expected = [
      { allocation: small, stride: 24, regionBytes: 0xc0000, bitmapOffset: 0xbf008, bitmapBytes: 0xfec, lastMask: 0x1fffff,
        callbacks: [0x10003ee5, 0x1000332d, 0x10008a6c, 0x10007536] },
      { allocation: scene, stride: 384, regionBytes: 0x300000, bitmapOffset: 0x2ffb90, bitmapBytes: 0x400, lastMask: 0x1fffffff,
        callbacks: [0x10001b68, 0x100012d5, 0x1000629e, 0x10006217] },
    ];
    for (const selected of expected) {
      const pool = f.memory.snapshot().pools.find(pool => pool.stride === selected.stride)!;
      expect(pool.descriptor).not.toBeNull();
      expect([4, 8, 12, 16].map(offset => word(pool.descriptor!.bytes, offset))).toEqual(selected.callbacks);
      expect(selected.allocation.region.bytes.length).toBe(selected.regionBytes);
      expect(selected.allocation.offset).toBe(16);
      expect(word(selected.allocation.region.bytes, 8)).toBe(1);
      expect(word(selected.allocation.region.bytes, 12)).toBe(0);
      expect(word(selected.allocation.region.bytes, selected.bitmapOffset)).toBe(0xfffffffe);
      expect(word(selected.allocation.region.bytes, selected.bitmapOffset + selected.bitmapBytes - 4)).toBe(selected.lastMask);
      expect(selected.allocation.bytes.every(byte => byte === 0)).toBe(true);
      expect(selected.allocation.knownMask.every(byte => byte === 255)).toBe(true);
    }
    expect(f.memory.snapshot().trace).toContain('tagged-new:348:196');
    expect(f.memory.snapshot().pointerAreaCount).toBe(2);
    expect(f.platform.snapshot().sections).toHaveLength(1);
  });

  it('constructs the actual twelve-character class-name CString with a 21-byte holder and releases it through the same heap', () => {
    const f = fixture(), heap = value(f.platform.createWin32Heap({}, 0, 4096, 0))!;
    const source = value(f.platform.win32HeapAlloc(heap, 0, 13))!;
    source.bytes.set(text('eCSceneAdmin')); source.knownMask.fill(255);
    const slot = new NativeHeapObjectViews({ identity: {}, bytes: Uint8Array.of(0xa1, 0xb2, 0xc3, 0xd4),
      knownMask: new Uint8Array(4), freed: false });
    const name = NativeHeapCString.beginTextConstruction(f.memory, slot);
    expect([...slot.bytes]).toEqual([0xa1, 0xb2, 0xc3, 0xd4]); expect([...slot.knownMask]).toEqual([0, 0, 0, 0]);
    value(name.constructText({ fields: new NativeHeapObjectViews(source), offset: 0 }));
    const allocation = name.snapshot().allocation!, fields = new NativeHeapObjectViews(allocation);
    expect(allocation.requestedBytes).toBe(21); expect(allocation.capacity).toBe(24);
    expect(fields.readUnsigned(0)).toBe(12); expect(fields.readUnsigned(4, 2)).toBe(1);
    expect([...allocation.bytes.subarray(8, 21)]).toEqual([...text('eCSceneAdmin')]);
    expect([...allocation.knownMask.subarray(6, 8)]).toEqual([255, 255]);
    expect(name.snapshot().pointerMask).toEqual([0, 0, 0, 0]);
    expect(value(name.text())).toBe('eCSceneAdmin');
    value(name.destroy());
    expect(allocation.freed).toBe(true);
    expect(word(allocation.bytes, 4) & 0xffff).toBe(0);
    expect(name.snapshot().pointerMask).toEqual([0, 0, 0, 0]);
    expect(name.text().known).toBe(false);
    expect(f.memory.snapshot().trace).toContain('pool-free:24:0');
    expect(f.memory.snapshot().pools.find(pool => pool.stride === 24)!.count).toBe(0);
    expect(value(f.platform.win32HeapFree(heap, 0, source))).toBe(true);
  });

  it('dispatches actual realloc/free callbacks with full 24-byte and 384-byte copies, bitmap reuse, and ended allocation lifetimes', () => {
    const f = fixture(), small = block(f.memory.malloc(21)), scene = block(f.memory.newObject(348, 0xc4));
    small.bytes.set(Array.from({ length: 24 }, (_, index) => index + 1));
    small.knownMask[7] = 0;
    scene.bytes.fill(0x5a); scene.knownMask[347] = 0;
    expect(value(f.memory.realloc(small, 24))).toBe(small);
    expect(value(f.memory.realloc(scene, 384))).toBe(scene);
    const largerSmall = block(f.memory.realloc(small, 25)), largerScene = block(f.memory.realloc(scene, 385));
    expect(largerSmall.capacity).toBe(28); expect(largerScene.capacity).toBe(448);
    expect([...largerSmall.bytes.subarray(0, 24)]).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));
    expect(largerSmall.knownMask[7]).toBe(0);
    expect(largerScene.bytes.subarray(0, 384).every(byte => byte === 0x5a)).toBe(true);
    expect(largerScene.knownMask[347]).toBe(0);
    expect(small.freed).toBe(true); expect(scene.freed).toBe(true);
    expect(() => new NativeHeapObjectViews(scene).readUnsigned(0)).toThrow('freed');
    const reusedSmall = block(f.memory.malloc(21)), reusedScene = block(f.memory.newObject(348, 0xc4));
    expect(reusedSmall.region).toBe(small.region); expect(reusedSmall.offset).toBe(small.offset);
    expect(reusedScene.region).toBe(scene.region); expect(reusedScene.offset).toBe(scene.offset);
    expect(reusedScene.identity).not.toBe(scene.identity); expect(reusedScene.bytes[383]).toBe(0x5a);
    for (const allocation of [largerSmall, largerScene, reusedSmall, reusedScene]) value(f.memory.deleteObject(allocation));
    expect(f.memory.snapshot().pools.filter(pool => pool.regions.length).every(pool => pool.count === 0 && pool.regions.every(region => region.used === 0))).toBe(true);
    expect(f.memory.snapshot().trace).toContain('copy:24'); expect(f.memory.snapshot().trace).toContain('copy:384');
    expect(f.platform.snapshot().allocations.filter(entry => entry.kind === 'virtual').every(entry => !entry.backing.freed)).toBe(true);
  });

  it('tail-dispatches failed VirtualAlloc to the exact next admitted pool and preserves native counter effects', () => {
    const f = fixture(), virtualAlloc = f.platform.virtualAlloc.bind(f.platform);
    f.platform.virtualAlloc = (bytes, type, protect) => bytes === 0xc0000 || bytes === 0x300000 ? { known: true, value: null } : virtualAlloc(bytes, type, protect);
    const small = block(f.memory.malloc(21)), scene = block(f.memory.newObject(348, 0xc4));
    expect(small.capacity).toBe(28); expect(small.requestedBytes).toBe(21);
    expect(scene.capacity).toBe(448); expect(scene.requestedBytes).toBe(348);
    expect(f.memory.snapshot().trace).toContain('pool-fallback:24');
    expect(f.memory.snapshot().trace).toContain('pool-fallback:384');
    expect(f.memory.snapshot().pointerAreaCount).toBe(2);
    value(f.memory.free(small)); value(f.memory.deleteObject(scene));
    expect(f.memory.snapshot().pools.filter(pool => pool.count !== 0).map(pool => [pool.stride, pool.count])).toEqual([[24, 1], [384, 1]]);
    expect(f.memory.snapshot().pools.filter(pool => pool.descriptor).map(pool => pool.stride)).toEqual([28, 448]);
  });

  it('uses all twelve source buckets on one owner and canonical pointer-area prefix in either extension order', () => {
    for (const extensions of [[nativeNpcHeapExtension, nativeSceneStartupHeapExtension], [nativeSceneStartupHeapExtension, nativeNpcHeapExtension]]) {
      const f = fixture(extensions), requests = [12, 16, 20, 21, 28, 36, 108, 172, 204, 348, 448, 688];
      const allocations = requests.map(request => block(f.memory.newObject(request)));
      expect(allocations.map(allocation => allocation.capacity)).toEqual([12, 16, 20, 24, 28, 40, 112, 192, 224, 384, 448, 768]);
      expect(f.memory.snapshot()).toMatchObject({ pointerAreaCount: 12, guard: 1, criticalSectionEntered: false });
      expect(f.platform.snapshot().pending.filter(entry => entry.address === '100e2710')).toHaveLength(1);
      const section = f.platform.snapshot().sections[0]!;
      expect(f.platform.snapshot().sections).toHaveLength(1); expect(section.depth).toBe(0);
      expect(f.platform.snapshot().pending[0]!.owner).toBe(section.owner);
      for (const allocation of allocations) value(f.memory.free(allocation));
      expect(f.memory.snapshot().pools.every(pool => pool.count === 0 && pool.peak === 1)).toBe(true);
      value(f.platform.dispose());
      expect(f.platform.snapshot()).toMatchObject({ phase: 'disposed', boundary: null });
      expect(f.platform.snapshot().executed.map(entry => entry.address)).toEqual(['100e2710']);
      expect(f.platform.snapshot().executed[0]!.owner).toBe(section.owner);
      expect(f.memory.snapshot().initialized).toBe(false);
      // Source MemoryAdmin shutdown clears its NULL default CString. It does
      // not substitute a full SceneAdmin destructor or free retained pools.
      expect(f.memory.snapshot().trace).toContain('default-cstring-clear-null');
      expect(f.platform.snapshot().allocations.every(entry => !entry.backing.freed)).toBe(true);
    }
  });

  it('preserves an applied source Free prefix when the actual critical-section leave capability fails', () => {
    const f = fixture(), scene = block(f.memory.newObject(348, 0xc4)), name = block(f.memory.malloc(21));
    f.platform.leaveCriticalSection = () => ({ known: false, reason: 'Selected heap LeaveCriticalSection unavailable' });
    const result = f.memory.deleteObject(scene);
    expect(result).toEqual({ known: false, reason: 'Selected heap LeaveCriticalSection unavailable' });
    expect(scene.freed).toBe(true); expect(name.freed).toBe(false);
    expect(f.memory.snapshot()).toMatchObject({ criticalSectionEntered: true, blockedReason: 'Selected heap LeaveCriticalSection unavailable' });
    expect(f.memory.snapshot().pools.find(pool => pool.stride === 384)!.count).toBe(0);
    expect(f.memory.snapshot().trace).toContain('pool-free:384:0');
    expect(f.platform.snapshot().sections[0]!.depth).toBe(1);
    expect(f.memory.free(name).known).toBe(false);
    expect(name.freed).toBe(false);
  });

  it('retains the actual allocation prefix when a thirteenth pool region would exceed the audited pointer-area range', () => {
    const f = fixture(), requests = [12, 16, 20, 21, 28, 36, 108, 172, 204, 348, 448, 688];
    requests.forEach(request => block(f.memory.newObject(request)));
    // Source pool 384 capacity 0x1ffd: the first allocation leaves 0x1ffc slots.
    for (let index = 0; index < 0x1ffc; index++) block(f.memory.newObject(348, 0xc4));
    expect(f.memory.snapshot().pointerAreaCount).toBe(12);
    const result = f.memory.newObject(348, 0xc4);
    expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('pointer-area write exceeds');
    expect(f.memory.snapshot()).toMatchObject({ pointerAreaCount: 12, criticalSectionEntered: true });
    expect(f.memory.snapshot().virtualRegions).toHaveLength(13);
    expect(f.memory.snapshot().pools.find(pool => pool.stride === 384)!.count).toBe(0x1ffe);
    expect(f.memory.newObject(21).known).toBe(false);
    expect(f.memory.snapshot().virtualRegions).toHaveLength(13);
  });
});
