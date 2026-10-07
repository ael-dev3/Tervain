import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeEngineModuleAdmin } from '../../src/gothic3/native-engine-module-admin';
import type { NativeEngineModuleAdminHost, NativeEngineModuleClassName } from '../../src/gothic3/native-engine-module-admin';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativeSceneStartupHeapExtension } from '../../src/gothic3/native-memory-admin';
import type { NativeMemoryAllocation } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
type Module = { readonly name: string };
class Name implements NativeEngineModuleClassName {
  constructor(readonly text: string) {}
  isEmpty(): NativeValue<boolean> { return known(this.text.length === 0); }
}

function fixture(overrides: Partial<NativeEngineModuleAdminHost<Module>> = {},
  ownerMemory?: Pick<NativeMemoryAdmin, 'realloc' | 'free'>) {
  const platform = new NativeRuntimePlatform();
  const memory = new NativeMemoryAdmin(platform, { extensions: [nativeNpcHeapExtension, nativeSceneStartupHeapExtension] });
  // The app's heap owner is established before Engine ModuleAdmin's atexit
  // registration so the LIFO teardown can still free the module pointer list.
  const heap = memory.getInstance();
  if (!heap.known) throw new Error(heap.reason);
  const calls: string[] = [];
  const host: NativeEngineModuleAdminHost<Module> = {
    constructInputDispatcher: () => { calls.push('dispatcher.ctor'); return known(undefined); },
    createInputDispatcher: () => { calls.push('dispatcher.create'); return known(undefined); },
    registerInputModule: module => { calls.push('dispatcher.register:' + module.name); return known(undefined); },
    destroyInputDispatcher: () => { calls.push('dispatcher.destroy'); return known(undefined); },
    destructInputDispatcher: () => { calls.push('dispatcher.dtor'); return known(undefined); },
    moduleClassNameEquals: (module, name) => known(module.name === (name as Name).text),
    registerShutdown: (address, owner, execute) => platform.registerShutdown(address, owner, execute),
    ...overrides,
  };
  const admin = new NativeEngineModuleAdmin(host, ownerMemory ?? memory);
  return { admin, calls, platform, memory };
}

function movingMemory(): Pick<NativeMemoryAdmin, 'realloc' | 'free'> {
  const allocations = new Set<NativeMemoryAllocation>();
  return {
    realloc(old, bytes) {
      const region = { identity: Object.freeze({}), bytes: new Uint8Array(bytes),
        knownMask: new Uint8Array(bytes), freed: false };
      if (old) {
        const copyBytes = Math.min(bytes, old.bytes.length);
        region.bytes.set(old.bytes.subarray(0, copyBytes));
        region.knownMask.set(old.knownMask.subarray(0, copyBytes));
        old.freed = true;
      }
      const allocation: NativeMemoryAllocation = { identity: Object.freeze({}), region, offset: 0,
        capacity: bytes, requestedBytes: bytes, bytes: region.bytes, knownMask: region.knownMask, freed: false };
      allocations.add(allocation);
      return known(allocation);
    },
    free(allocation) {
      if (allocation === null) return known(undefined);
      if (!allocations.has(allocation) || allocation.freed) return unknown('Fake realloc owner requires a live allocation');
      allocation.freed = true;
      return known(undefined);
    },
  };
}

describe('Engine eCModuleAdmin source owner', () => {
  it('sets the one-time guard, constructs the dispatcher, initializes fields and registers the exact shutdown thunk', () => {
    const f = fixture();
    expect(f.admin.getInstance()).toEqual(known(f.admin));
    expect(f.admin.getInstance()).toEqual(known(f.admin));
    expect(f.admin.guard.readUnsigned(0)).toBe(1);
    expect(f.admin.fields.pointer<object>(0).get()).toMatchObject({ module: 'Engine', address: '3081cdd4' });
    expect(f.admin.fields.pointer(0x34).get()).toBeNull();
    expect(f.admin.fields.readUnsigned(0x38)).toBe(0);
    expect(f.admin.fields.readUnsigned(0x3c)).toBe(0);
    expect(f.calls).toEqual(['dispatcher.ctor', 'dispatcher.create']);
    expect(f.platform.snapshot().pending.map(entry => entry.address)).toContain('30797fc0');
  });

  it('grows the original pointer array, deduplicates backward, and finds the first class-name match', () => {
    const f = fixture(), wolf: Module = { name: 'eCWolf' }, guard: Module = { name: 'eCGuard' },
      secondWolf: Module = { name: 'eCWolf' };
    expect(f.admin.getInstance()).toEqual(known(f.admin));
    expect(f.admin.registerModule(wolf)).toEqual(known(1));
    expect(f.admin.registerModule(guard)).toEqual(known(1));
    expect(f.admin.registerModule(wolf)).toEqual(known(1));
    expect(f.admin.registerModule(secondWolf)).toEqual(known(1));
    expect(f.admin.snapshot()).toMatchObject({ moduleCount: 3, moduleCapacity: 9, modules: [wolf, guard, secondWolf] });
    expect(f.admin.findModule(new Name('eCWolf'))).toEqual(known(wolf));
    expect(f.admin.findModule(new Name('eCGuard'))).toEqual(known(guard));
    expect(f.admin.findModule(new Name(''))).toEqual(known(null));
    expect(f.calls).toEqual(['dispatcher.ctor', 'dispatcher.create', 'dispatcher.register:eCWolf',
      'dispatcher.register:eCGuard', 'dispatcher.register:eCWolf']);
  });

  it('grows the real module registry across its source-audited 72-byte request', () => {
    const f = fixture();
    const modules = Array.from({ length: 10 }, (_, index) => ({ name: 'component-' + index }));
    expect(f.admin.getInstance()).toEqual(known(f.admin));
    for (const module of modules) expect(f.admin.registerModule(module)).toEqual(known(1));
    expect(f.admin.snapshot()).toMatchObject({ moduleCount: 10, moduleCapacity: 18, modules });
    expect(f.memory.snapshot().trace).toContain('pool-allocate:80:0');
    expect(f.admin.findModule(new Name('component-0'))).toEqual(known(modules[0]));
    expect(f.admin.findModule(new Name('component-9'))).toEqual(known(modules[9]));
  });

  it('rebinds opaque module capabilities when an injected Realloc owner moves the pointer array', () => {
    const f = fixture({}, movingMemory());
    const modules = Array.from({ length: 10 }, (_, index) => ({ name: 'component-' + index }));
    expect(f.admin.getInstance()).toEqual(known(f.admin));
    for (const module of modules) expect(f.admin.registerModule(module)).toEqual(known(1));
    expect(f.admin.snapshot()).toMatchObject({ moduleCount: 10, moduleCapacity: 18, modules });
    expect(f.admin.findModule(new Name('component-0'))).toEqual(known(modules[0]));
    expect(f.admin.findModule(new Name('component-9'))).toEqual(known(modules[9]));
  });

  it('keeps the native append prefix when the input-dispatcher registration owner is unavailable', () => {
    const f = fixture({ registerInputModule: () => unknown('input receiver priority path is not owned') });
    const component: Module = { name: 'eCSceneAdmin' };
    expect(f.admin.getInstance()).toEqual(known(f.admin));
    const result = f.admin.registerModule(component);
    expect(result.known).toBe(false);
    expect(f.admin.snapshot()).toMatchObject({ moduleCount: 1, modules: [component] });
    expect(f.admin.snapshot().trace).toContain('moduleAdmin.array.append');
    expect(f.admin.snapshot().boundary).toContain('input receiver priority path is not owned');
  });

  it('runs the registered Engine destructor before the earlier heap owner on shutdown', () => {
    const f = fixture(), component: Module = { name: 'eCSceneAdmin' };
    expect(f.admin.getInstance()).toEqual(known(f.admin));
    expect(f.admin.registerModule(component)).toEqual(known(1));
    expect(f.platform.dispose()).toEqual(known(undefined));
    expect(f.admin.snapshot()).toMatchObject({ destroyed: true, moduleCount: 0, moduleCapacity: 0 });
    expect(f.calls.slice(-2)).toEqual(['dispatcher.destroy', 'dispatcher.dtor']);
  });
});
