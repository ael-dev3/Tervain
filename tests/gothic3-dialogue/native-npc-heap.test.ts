import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NativeMemoryAdmin, nativeNpcHeapExtension } from '../../src/gothic3/native-memory-admin';
import type { NativeMemoryAllocation } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import type { NativeValue } from '../../src/gothic3/dialogue';

function value<T>(result: NativeValue<T>): T {
  if (!result.known) throw new Error(result.reason); return result.value;
}
function block(result: NativeValue<NativeMemoryAllocation | null>): NativeMemoryAllocation {
  const allocation = value(result); if (!allocation) throw new Error('Expected source allocation'); return allocation;
}
function fixture() {
  const platform = new NativeRuntimePlatform();
  return { platform, memory: new NativeMemoryAdmin(platform, { extensions: [nativeNpcHeapExtension] }) };
}
const text = (input: string) => Uint8Array.from([...input].map(character => character.charCodeAt(0)).concat(0));

describe('construction-only NPC heap extension', () => {
  it('preserves the frozen base receipt and exact original extended dispatch ranges', () => {
    const original = readFileSync(new URL('../../assets/gothic3/runtime-admin/runtime-rules.json', import.meta.url));
    expect(createHash('sha256').update(original).digest('hex')).toBe(nativeNpcHeapExtension.baseRulesSha256);
    const f = fixture();
    for (const request of [17, 20]) expect(block(f.memory.newObject(request)).capacity).toBe(20);
    for (const request of [33, 36, 40]) expect(block(f.memory.malloc(request)).capacity).toBe(40);
    expect(f.memory.snapshot().pools.find(pool => pool.stride === 20)!.count).toBe(2);
    expect(f.memory.snapshot().pools.find(pool => pool.stride === 40)!.count).toBe(3);
  });
  it('rejects invented/copy/repeated extension identities before platform calls', () => {
    const platform = new NativeRuntimePlatform();
    expect(() => new NativeMemoryAdmin(platform, { extensions: [{ ...nativeNpcHeapExtension }] })).toThrow('source identity');
    expect(() => new NativeMemoryAdmin(platform, { extensions: [nativeNpcHeapExtension, nativeNpcHeapExtension] })).toThrow('source identity');
    expect(platform.snapshot().allocations).toHaveLength(0);
    expect(platform.snapshot().pending).toHaveLength(0);
  });
  it('keeps the default frozen scope and uses all fifteen NPC buckets on one extended owner', () => {
    const old = new NativeMemoryAdmin(new NativeRuntimePlatform());
    expect(old.newObject(20).known).toBe(false);
    const f = fixture(), requests = [12, 16, 20, 28, 29, 36, 72, 108, 120, 172, 204, 448, 520, 688, 1468];
    const allocations = requests.map(request => block(f.memory.newObject(request)));
    expect(allocations.map(allocation => allocation.capacity)).toEqual([12, 16, 20, 28, 32, 40, 80, 112, 128, 192, 224, 448, 640, 768, 1536]);
    expect(f.memory.snapshot().pointerAreaCount).toBe(15);
    expect(f.platform.snapshot().pending.filter(entry => entry.address === '100e2710')).toHaveLength(1);
    allocations.forEach(allocation => value(f.memory.free(allocation)));
    expect(f.memory.snapshot().pools.every(pool => pool.count === 0 && pool.peak === 1)).toBe(true);
  });
});

describe('native CString holder ownership over retained heap bytes', () => {
  it('aliases the real entity CString slot and allocates the source name27-byte holder', () => {
    const f = fixture(), entity = block(f.memory.newObject(448, 0x170));
    const string = new NativeHeapCString(f.memory, new NativeHeapObjectViews(entity, 0x138, 4));
    expect(new NativeHeapObjectViews(entity).readUnsigned(0x138)).toBe(0);
    value(string.setTextBytes(text('Ardea_OutNovice_01')));
    const data = string.snapshot().allocation!;
    expect(data.requestedBytes).toBe(27); expect(data.capacity).toBe(28);
    const fields = new NativeHeapObjectViews(data);
    expect(fields.readUnsigned(0)).toBe(18); expect(fields.readUnsigned(4, 2)).toBe(1);
    expect(fields.readUnsigned(26, 1)).toBe(0);
    expect([...entity.knownMask.subarray(0x138, 0x13c)]).toEqual([0, 0, 0, 0]);
    expect(value(string.text())).toBe('Ardea_OutNovice_01');
    expect(data.region.bytes[data.offset + 8]).toBe(65);
  });
  it('shares one source holder into entity/name-key slots and frees only the final reference', () => {
    const f = fixture();
    const source = new NativeHeapCString(f.memory), entityName = new NativeHeapCString(f.memory), nameKey = new NativeHeapCString(f.memory);
    value(source.allocateTextBytes(text('Ardea_OutNovice_01').subarray(0, 18)));
    const holder = source.snapshot().allocation!;
    value(entityName.assign(source)); value(nameKey.assign(entityName));
    expect(entityName.snapshot().data).toBe(source.snapshot().data);
    expect(nameKey.snapshot().allocation).toBe(holder);
    expect(new NativeHeapObjectViews(holder).readUnsigned(4, 2)).toBe(3);
    value(source.destroy());
    expect(source.snapshot().pointerMask).toEqual([0, 0, 0, 0]);
    expect(new NativeHeapObjectViews(holder).readUnsigned(4, 2)).toBe(2);
    value(entityName.clear()); expect(holder.freed).toBe(false);
    value(nameKey.release()); expect(holder.freed).toBe(true);
    expect(nameKey.snapshot().pointerBytes).toEqual([0, 0, 0, 0]);
    expect(nameKey.snapshot().pointerMask).toEqual([255, 255, 255, 255]);
    expect(source.text().known).toBe(false);
  });
  it('performs native copy-on-change and uses old length rather than spare allocation capacity', () => {
    const f = fixture(), first = new NativeHeapCString(f.memory), shared = new NativeHeapCString(f.memory);
    value(first.setTextBytes(text('Ardea_OutNovice_01'))); value(shared.assign(first));
    const original = first.snapshot().allocation!;
    value(first.setTextBytes(text('Ardea_OutNovice_02')));
    expect(first.snapshot().allocation).not.toBe(original); expect(original.freed).toBe(false);
    expect(value(shared.text())).toBe('Ardea_OutNovice_01');
    const unique = first.snapshot().allocation!;
    value(first.setTextBytes(text('short'))); expect(first.snapshot().allocation).toBe(unique);
    value(first.setTextBytes(text('longertext'))); expect(unique.freed).toBe(true);
    expect(first.snapshot().allocation!.requestedBytes).toBe(19);
    expect(first.snapshot().allocation!.capacity).toBe(20);
  });
  it('distinguishes Clear allocated-empty no-op, Release clear, and destructor stale slot', () => {
    const f = fixture(), string = new NativeHeapCString(f.memory);
    value(string.setTextBytes(text('ABC'))); const holder = string.snapshot().allocation!;
    value(string.setTextBytes(text('')));
    expect(value(string.isEmpty())).toBe(true); expect(string.snapshot().allocation).toBe(holder);
    value(string.clear()); expect(holder.freed).toBe(false); expect(string.snapshot().allocation).toBe(holder);
    value(string.destroy()); expect(holder.freed).toBe(true);
    expect(string.snapshot().data).not.toBeNull(); expect(string.snapshot().pointerMask).toEqual([0, 0, 0, 0]);
    expect(string.release().known).toBe(false);
  });
  it('reuses a unique target when assigning an empty source and ignores same nonempty holder assignment', () => {
    const f = fixture(), target = new NativeHeapCString(f.memory), empty = new NativeHeapCString(f.memory);
    value(target.setTextBytes(text('ABC'))); const holder = target.snapshot().allocation!;
    value(target.assign(target)); expect(new NativeHeapObjectViews(holder).readUnsigned(4, 2)).toBe(1);
    value(target.assign(empty)); expect(target.snapshot().allocation).toBe(holder);
    expect(new NativeHeapObjectViews(holder).readUnsigned(0)).toBe(0);
    value(target.release()); expect(holder.freed).toBe(true);
  });
  it('preserves source ushort reference wrapping and the ASCII hash fold', () => {
    const f = fixture(), source = new NativeHeapCString(f.memory), alias = new NativeHeapCString(f.memory);
    expect(value(source.hash())).toBe(0);
    value(source.setTextBytes(text('ABC'))); expect(value(source.hash())).toBe(73030);
    const holder = source.snapshot().allocation!, fields = new NativeHeapObjectViews(holder);
    fields.writeUnsigned(4, 0xffff, 2); value(alias.assign(source));
    expect(fields.readUnsigned(4, 2)).toBe(0);
    value(alias.destroy()); expect(fields.readUnsigned(4, 2)).toBe(0xffff); expect(holder.freed).toBe(false);
  });
  it('gates non-ASCII and unterminated inputs before allocating or inventing a holder', () => {
    const f = fixture();
    const nonAscii = new NativeHeapCString(f.memory), unterminated = new NativeHeapCString(f.memory);
    expect(nonAscii.setTextBytes(Uint8Array.of(0xe4, 0)).known).toBe(false);
    expect(unterminated.setTextBytes(Uint8Array.of(65)).known).toBe(false);
    expect(f.memory.snapshot().pointerAreaCount).toBe(0); expect(f.platform.snapshot().allocations).toHaveLength(0);
  });
  it('rejects cross-heap sharing and leaves the native applied release prefix when Free is unavailable', () => {
    const f = fixture(), second = fixture(), string = new NativeHeapCString(f.memory), foreign = new NativeHeapCString(second.memory);
    value(string.setTextBytes(text('ABC'))); value(foreign.setTextBytes(text('XYZ')));
    const target = new NativeHeapCString(f.memory);
    expect(target.assign(foreign).known).toBe(false); expect(target.snapshot().allocation).toBeNull();
    const holder = string.snapshot().allocation!;
    f.memory.free = () => ({ known: false, reason: 'Selected Free capability unavailable' });
    expect(string.release().known).toBe(false);
    expect(new NativeHeapObjectViews(holder).readUnsigned(4, 2)).toBe(0);
    expect(string.snapshot().allocation).toBe(holder); expect(holder.freed).toBe(false);
    expect(string.snapshot().pointerMask).toEqual([0, 0, 0, 0]);
  });
});
