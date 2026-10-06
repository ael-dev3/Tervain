import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeEngineCrtOwner } from '../../src/gothic3/native-engine-crt-locks';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeCrtUndName, nativeSceneTypeInfoForCrt } from '../../src/gothic3/native-crt-undname';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function input(text: string) {
  const bytes = new TextEncoder().encode(text + '\0');
  return { fields: new NativeHeapObjectViews({ identity: {}, bytes, knownMask: new Uint8Array(bytes.length).fill(255), freed: false }), offset: 0 };
}
function text(backing: NativeMemoryBacking): string {
  const fields = new NativeHeapObjectViews(backing); const bytes: number[] = [];
  for (let i = 0; i < fields.bytes.length; i++) { const byte = fields.readUnsigned(i, 1); if (!byte) return String.fromCharCode(...bytes); bytes.push(byte); }
  throw new Error('NUL required');
}
/** OS/TLS/module facts are explicitly selected fixture inputs; the production
 * owner starts from the cold image and cannot infer these initialized facts. */
function fixture(options: { services?: boolean } = {}) {
  const platform = new NativeRuntimePlatform({
    engineCrtServices: options.services === false ? undefined :
      { tlsValues: new Map<number, object>(), kernel32Available: true, pointerCodec: 'absent' } });
  const errno = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(4), knownMask: new Uint8Array(4).fill(255), freed: false });
  const crt = new NativeEngineCrtOwner({ platform, errnoSlot: () => known(errno) });
  crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
  expect(value(crt.initHeap())).toBe(1);
  return { platform, crt, errno, decoder: new NativeCrtUndName(crt) };
}

describe('retained Engine ___unDName ordinary class RTTI path', () => {
  it('owns the source152B scratch graph and independent24B output then frees scratch before unlocking', () => {
    const f = fixture(); expect(value(f.crt.initLocks())).toBe(1);
    const original = input('?AVeCSceneAdmin@@');
    const output = value(f.decoder.decode(original, 0x2800))!;
    expect(text(output)).toBe('class eCSceneAdmin'); expect(output.bytes.length).toBe(24);
    const s = f.decoder.snapshot(); expect(s.boundary).toBe(null); expect(s.held).toBe(false);
    expect(s.fields.pointer(36).get()).toBe(original);
    expect(s.fields.pointer<{ fields: NativeHeapObjectViews; offset: number }>(32).get()!.offset).toBe(17);
    expect(s.fields.readUnsigned(48)).toBe(0x2800); expect(s.fields.readUnsigned(44)).toBe(19);
    expect(s.arena!.blocks).toHaveLength(1); expect(s.arena!.blocks[0]!.bytes.length).toBe(4104);
    expect(s.arena!.blocks[0]!.freed).toBe(true); expect(s.fields.readUnsigned(16)).toBe(3944);
    expect(s.fields.pointer(8).get()).toBe(null); expect(s.fields.pointer(12).get()).toBe(null);
    expect(output.freed).toBe(false);
    expect(s.decorator!.backing.freed).toBe(true);
    expect(() => s.fields.pointer<{ fields: NativeHeapObjectViews }>(24).get()!.fields.readUnsigned(0)).toThrow('freed');
    expect(s.trace.indexOf('HeapManager.destructor')).toBeLessThan(s.trace.indexOf('crt.unlock5.attempt'));
    const sections = f.platform.snapshot().physicalSections;
    expect(sections).toHaveLength(15); expect(sections.every(section => section.depth === 0 && section.spinCount === 4000)).toBe(true);
  });
  it.each(['eCSceneAdmin', 'Example', 'a_b$C', 'Test-Name', 'T<Type>'])('reads identifier%s from supplied bytes', identifier => {
    const f = fixture(); value(f.crt.initLocks());
    expect(text(value(f.decoder.decode(input('?AV' + identifier + '@@'), 0x2800))!)).toBe('class ' + identifier);
  });
  it('uses shared demangler globals and fresh per-call arena blocks across instances of one CRT owner', () => {
    const f = fixture(); value(f.crt.initLocks()); const other = new NativeCrtUndName(f.crt);
    expect(other.fields).toBe(f.decoder.fields);
    const first = value(f.decoder.decode(input('?AVFirst@@'), 0x2800))!;
    const second = value(other.decode(input('?AVSecond@@'), 0x2800))!;
    expect(text(first)).toBe('class First'); expect(text(second)).toBe('class Second');
    expect(first).not.toBe(second); expect(first.freed).toBe(false); expect(second.freed).toBe(false);
    expect(other.snapshot().arena!.blocks).toHaveLength(1);
  });
  it('connects retained descriptor offset9 and canonical Engine type-info list to one cached19B name', () => {
    const f = fixture(); value(f.crt.initLocks());
    const names = nativeSceneTypeInfoForCrt(f.crt);
    expect(nativeSceneTypeInfoForCrt(f.crt)).toBe(names); expect(names.list).toBe(f.crt.physical.crtTypeInfoList);
    const cached = value(names.getName())!; expect(cached.bytes.length).toBe(19); expect(text(cached)).toBe('class eCSceneAdmin');
    expect(names.descriptor.pointer(4).get()).toBe(cached);
    expect(f.decoder.fields.pointer<{ fields: NativeHeapObjectViews; offset: number }>(36).get()!.fields).toBe(names.descriptor);
    expect(f.decoder.fields.pointer<{ fields: NativeHeapObjectViews; offset: number }>(36).get()!.offset).toBe(9);
    const node = names.list.pointer<NativeMemoryBacking>(4).get()!;
    expect(node.bytes.length).toBe(8); expect(new NativeHeapObjectViews(node).pointer(0).get()).toBe(cached);
    expect(value(names.getName())).toBe(cached); expect(names.snapshot().held).toBe(false);
    expect(f.crt.snapshot().allocations.filter(backing => backing.bytes.length === 24 && backing.freed)).toHaveLength(1);
  });
  it('retains the first static lock publication at an unowned production TLS gate', () => {
    const f = fixture({ services: false }); const init = f.crt.initLocks(); expect(init.known).toBe(false);
    expect(f.platform.snapshot().physicalSections).toHaveLength(0);
    const result = f.decoder.decode(input('?AVeCSceneAdmin@@'), 0x2800);
    expect(result.known).toBe(false); expect(f.decoder.snapshot().arena).toBe(null);
    expect(f.decoder.fields.readUnsigned(0)).toBe(0); expect(f.decoder.fields.readUnsigned(36)).toBe(0);
  });
  it('keeps consumed qualification and held lock at the first unowned grammar call', () => {
    const f = fixture(); value(f.crt.initLocks());
    const result = f.decoder.decode(input('?AVThing@Namespace@@'), 0x2800);
    expect(result.known).toBe(false); if (!result.known) expect(result.reason).toContain('getScopedName scope');
    expect(f.decoder.snapshot().held).toBe(true); expect(f.decoder.fields.readUnsigned(48)).toBe(0x800);
    expect(f.decoder.snapshot().arena!.blocks[0]!.freed).toBe(false);
    const trace = [...f.decoder.snapshot().trace]; expect(f.decoder.decode(input('?AVGood@@'), 0x2800)).toEqual(result);
    expect(f.decoder.snapshot().trace).toEqual(trace);
  });
  it('preserves invalid-identifier fallback to original text and source space collapse', () => {
    const f = fixture(); value(f.crt.initLocks());
    const output = value(f.decoder.decode(input('?AVBad   Name@@'), 0x2800))!;
    expect(text(output)).toBe('?AVBad Name@@'); expect(f.decoder.snapshot().held).toBe(false);
  });
  it('retains the special-prefix cursor and data-type flag clear before its next unsupported branch', () => {
    const f = fixture(); value(f.crt.initLocks());
    const result = f.decoder.decode(input('?@VThing@@'), 0x2800); expect(result.known).toBe(false);
    expect(f.decoder.fields.pointer<{ fields: NativeHeapObjectViews; offset: number }>(32).get()!.offset).toBe(2);
    expect(f.decoder.fields.readUnsigned(48)).toBe(0x800); expect(f.decoder.snapshot().held).toBe(true);
  });
  it('retains the source truncated-status node before unowned scoped concatenation', () => {
    const f = fixture(); value(f.crt.initLocks());
    const result = f.decoder.decode(input('?AVThing'), 0x2800); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('truncated-name concatenation30697e2e');
    expect(f.decoder.snapshot().held).toBe(true);
    // Four16B Replicator status nodes,24B keyword,24B identifier,8B
    // identifier record, then the16B status node preceding the missing helper.
    expect(f.decoder.fields.readUnsigned(16)).toBe(4096 - (64 + 24 + 24 + 8 + 16));
  });
  it.each(['template-parameter-', 'generic-type-'])('retains%s cursor consumption before the unowned dimension call', prefix => {
    const f = fixture(); value(f.crt.initLocks());
    const result = f.decoder.decode(input('?AV' + prefix + '1@@'), 0x2800); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('parameter/dimension');
    expect(f.decoder.fields.pointer<{ fields: NativeHeapObjectViews; offset: number }>(32).get()!.offset).toBe(3 + prefix.length);
    expect(f.decoder.snapshot().held).toBe(true); expect(f.decoder.snapshot().decorator!.backing.freed).toBe(false);
  });
  it('returnsNULL on owned output allocation failure, frees scratch, and permits normal retry', () => {
    const f = fixture(); value(f.crt.initLocks());
    const allocate = f.crt.malloc.bind(f.crt); let fail = true;
    f.crt.malloc = bytes => fail && bytes === 24 ? (fail = false, known(null)) : allocate(bytes);
    expect(value(f.decoder.decode(input('?AVeCSceneAdmin@@'), 0x2800))).toBe(null);
    expect(f.decoder.snapshot().held).toBe(false); expect(f.decoder.snapshot().arena!.blocks[0]!.freed).toBe(true);
    expect(text(value(f.decoder.decode(input('?AVeCSceneAdmin@@'), 0x2800))!)).toBe('class eCSceneAdmin');
  });
  it('retains output and held-lock facts when scratch free becomes unowned', () => {
    const f = fixture(); value(f.crt.initLocks()); const release = f.crt.free.bind(f.crt);
    f.crt.free = backing => backing?.bytes.length === 4104 ? unknown('scratch free unavailable') : release(backing);
    const result = f.decoder.decode(input('?AVeCSceneAdmin@@'), 0x2800); expect(result.known).toBe(false);
    expect(f.decoder.snapshot().held).toBe(true); expect(f.decoder.snapshot().arena!.blocks[0]!.freed).toBe(false);
    expect(text(f.decoder.fields.pointer<{ fields: NativeHeapObjectViews }>(40).get()!.fields.backing as NativeMemoryBacking)).toBe('class eCSceneAdmin');
  });
  it('rejects recursive entry across separate wrappers sharing original globals', () => {
    const f = fixture(); value(f.crt.initLocks()); const other = new NativeCrtUndName(f.crt);
    const allocate = f.crt.malloc.bind(f.crt); let first = true;
    f.crt.malloc = bytes => { if (first && bytes === 4104) { first = false; expect(other.decode(input('?AVNested@@'), 0x2800).known).toBe(false); } return allocate(bytes); };
    const result = f.decoder.decode(input('?AVeCSceneAdmin@@'), 0x2800); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('shared ___unDName reentry');
    expect(other.snapshot().held).toBe(true); expect(other.decode(input('?AVLater@@'), 0x2800)).toEqual(result);
  });
});
