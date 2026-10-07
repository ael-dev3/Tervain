import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeGameCrtOwner } from '../../src/gothic3/native-game-crt';
import { NativeEngineCrtOwner } from '../../src/gothic3/native-engine-crt-locks';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeCrtUndName, nativeGameTypeInfoForCrt } from '../../src/gothic3/native-crt-undname';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function input(text: string) {
  const bytes = new TextEncoder().encode(text + '\0');
  return { fields: new NativeHeapObjectViews({ identity: {}, bytes,
    knownMask: new Uint8Array(bytes.length).fill(255), freed: false }), offset: 0 };
}
function text(backing: NativeMemoryBacking): string {
  const fields = new NativeHeapObjectViews(backing), bytes: number[] = [];
  for (let offset = 0; offset < fields.bytes.length; offset++) {
    const byte = fields.readUnsigned(offset, 1); if (!byte) return String.fromCharCode(...bytes); bytes.push(byte);
  }
  throw new Error('NUL required');
}
function fixture() {
  const platform = new NativeRuntimePlatform({ engineCrtServices: {
    tlsValues: new Map<number, object>(), kernel32Available: true, pointerCodec: 'absent',
  } });
  const errno = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(4),
    knownMask: new Uint8Array(4).fill(255), freed: false });
  const crt = NativeGameCrtOwner.forPlatform({ platform, errnoSlot: () => known(errno) });
  crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
  value(crt.initHeap()); value(crt.initLocks());
  return { platform, crt };
}

describe('Game CRT ordinary class RTTI and type_info::Name', () => {
  it('demangles with Game-owned globals, DName constants, locks and heap allocations', () => {
    const { crt } = fixture(), demangler = new NativeCrtUndName(crt);
    const output = value(demangler.decode(input('?AVgCNavigation_PS@@'), 0x2800));
    expect(output).not.toBe(null);
    expect(text(output!)).toBe('class gCNavigation_PS');
    expect(demangler.fields).toBe(crt.imageStorage('demanglerGlobals'));
    expect(demangler.snapshot().boundary).toBe(null);
    expect(demangler.snapshot().held).toBe(false);
    expect(demangler.snapshot().arena?.blocks).toHaveLength(1);
    expect(demangler.snapshot().arena?.blocks[0]?.freed).toBe(true);
  });

  it('does not read or mutate Engine demangler globals while using the Game owner', () => {
    const { platform, crt } = fixture(), engine = new NativeEngineCrtOwner({ platform });
    const engineDemangler = new NativeCrtUndName(engine), gameDemangler = new NativeCrtUndName(crt);
    expect(engineDemangler.fields).not.toBe(gameDemangler.fields);
    expect(engineDemangler.fields.backing.identity).not.toBe(gameDemangler.fields.backing.identity);
    value(gameDemangler.decode(input('?AVgCNavigation_PS@@'), 0x2800));
    expect(engineDemangler.fields.readUnsigned(0)).toBe(0);
    expect(engineDemangler.snapshot().trace).toEqual([]);
    expect(platform.snapshot().winHeaps.map(heap => heap.capability.owner)).toEqual([crt.identity]);
  });

  it('caches the Game name through physical descriptor/list links and returns the cache without scanning it', () => {
    const { crt } = fixture(), typeInfo = nativeGameTypeInfoForCrt(crt);
    const name = value(typeInfo.getName());
    expect(name).not.toBe(null);
    expect(text(name!)).toBe('class gCNavigation_PS');
    expect(typeInfo.descriptor.pointer<NativeMemoryBacking>(4).get()).toBe(name);
    const node = typeInfo.list.pointer<NativeMemoryBacking>(4).get();
    expect(node).not.toBe(null);
    const links = new NativeHeapObjectViews(node!);
    expect(links.pointer<NativeMemoryBacking>(0).get()).toBe(name);
    expect(links.pointer<NativeMemoryBacking>(4).get()).toBe(null);
    expect(crt.physical.crtTypeInfoList).toBe(typeInfo.list);

    const traceLength = typeInfo.snapshot().trace.length;
    const unreadable = { identity: {}, bytes: new Uint8Array(1), knownMask: new Uint8Array(1), freed: false };
    typeInfo.descriptor.pointer<NativeMemoryBacking>(4).set(unreadable);
    expect(value(typeInfo.getName())).toBe(unreadable);
    expect(typeInfo.snapshot().trace).toHaveLength(traceLength);
  });
});
