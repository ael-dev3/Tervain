import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BrowserNpcEntityRuntime, loadBrowserNpcEntitySources } from '../../src/gothic3/browser-npc-entity';
import type { BrowserNpcEntityServices, BrowserNpcEntitySources } from '../../src/gothic3/browser-npc-entity';
import { OriginalControlModuleState, OriginalControlReader } from '../../src/gothic3/control-reading';
import { NativeReflectionController } from '../../src/gothic3/entity-reflection';
import { monotonicClockMilliseconds } from '../../src/gothic3/world-clock';
import type { NativeValue } from '../../src/gothic3/dialogue';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
let source: BrowserNpcEntitySources;
beforeAll(async () => {
  vi.stubGlobal('location', { href: 'http://local.test/gothic3/index.html' });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    expect(url).toBe('http://local.test/gothic3/gameplay/npc-entity/bandit-records.json.gz');
    const bytes = new Uint8Array(readFileSync(new URL('../../public/gothic3/gameplay/npc-entity/bandit-records.json.gz', import.meta.url)));
    return new Response(bytes);
  }));
  source = await loadBrowserNpcEntitySources();
});
afterAll(() => vi.unstubAllGlobals());

function fixture(extra: Partial<BrowserNpcEntityServices> = {}) {
  const registrations: { address: string; module: OriginalControlModuleState; callback: () => NativeValue<void> }[] = [];
  const timestamps = monotonicClockMilliseconds(() => performance.now());
  const controlReflection = new NativeReflectionController('test-npc-shared-matrix', {
    timestamps, precision: 53, isInPanicState: () => ({ known: false,
      reason: 'Original ErrorAdmin singleton is not owned by this matrix-only test host' }),
  });
  const module = OriginalControlModuleState.fromColdOriginalImage();
  const control = new OriginalControlReader(controlReflection, {
    module,
    // Selected owned registration retains the exact module and its proven
    // literal-RET callback. Native CRT heap/locks are not this test profile.
    registerMatrixDestructor: address => {
      registrations.push({ address, module, callback: () => known(undefined) }); return known(0);
    },
  });
  const entropy = vi.fn(() => randomUUID());
  const runtime = new BrowserNpcEntityRuntime({ crypto: { randomUUID: entropy }, now: () => performance.now(), control, ...extra });
  return { runtime, registrations, entropy, control };
}

describe('retained original Ardea NPC owner prefix', () => {
  it('admits only verified complete raw records and freezes their source context', () => {
    expect(source.entities).toHaveLength(3);
    expect(source.entities[0]!.propertySets.map(set => set.name)).toHaveLength(16);
    expect(Object.isFrozen(source.context)).toBe(true);
    const { runtime } = fixture();
    expect(() => runtime.prepare({ ...source.entities[0]! })).toThrow('hash-verified');
    expect(runtime.factory.heap()).toHaveLength(0);
  });

  it('allocates a platform GUID before reading the original Node identity into the same owner', () => {
    const { runtime, registrations, entropy } = fixture();
    const record = source.entities[0]!;
    const result = runtime.prepare(record);
    expect(result.construction.supported).toBe(true);
    expect(registrations.map(entry => entry.address)).toEqual(['100e2910']);
    expect(entropy).toHaveBeenCalled();
    const allocation = result.allocation!;
    const generatedId = [...allocation.guidTemporary.bytes].map(value => value.toString(16).padStart(2, '0')).join('') + '00000000';
    expect(generatedId).not.toBe(record.guid);
    expect(runtime.registry.findRegistered(generatedId)).toBeNull();
    expect(runtime.getOwner(record.guid)).toBe(allocation.data.entity);
    expect(runtime.resolve(record.guid)).toEqual(known(allocation.data.entity));
    expect(runtime.resolve(record.guid.slice(0, 32) + 'deadbeef')).toEqual(known(allocation.data.entity));
    expect(allocation.data.entity.sourceReadStage).toBe('node-id-read');
    expect(allocation.creator.propertyId20).toBe(record.creatorGuid.slice(0, 32) + '00000000');
    expect(allocation.data.name).toBe(record.name);
    expect(runtime.names.first(record.name)).toBe(allocation.data.entity);
    expect(allocation.data.entity.flags.knownMask).not.toBe(0xffffffff);
  });

  it('retains real Navigation defaults at the earlier ErrorAdmin creator cleanup boundary', () => {
    const { runtime } = fixture();
    const record = source.entities[0]!;
    const result = runtime.prepare(record);
    expect(result.read?.supported).toBe(false);
    expect(result.boundary).toContain('ErrorAdmin.GetInstance/Create');
    expect(result.navigation).not.toBeNull();
    expect(result.navigation!.owner).toBeNull();
    expect(runtime.navigationRegistry.navigationPS).toEqual([]);
    expect(runtime.navigationRegistry.navigationPSInROI).toEqual([]);
    expect(result.allocation!.data.entity.propertySets).toEqual([]);
    expect(result.propertyAttachments).toEqual([]);
    expect(result.consumedBytes).toBe(338);
    expect(result.navigation!.wrapper.native).toBe(result.navigation!.base);
    expect(result.navigation!.base.values).toBe(result.navigation!.values);
    expect(result.allocation!.data.entity.context).toBeNull();
    expect(result.sourceContext).toBe(source.context);
    expect(result.worldResident).toBe(false);
  });

  it('does not replay a retained partial callback and constructs the other two owners independently', () => {
    const { runtime, entropy } = fixture();
    const first = runtime.prepare(source.entities[0]!);
    const calls = entropy.mock.calls.length;
    expect(runtime.prepare(source.entities[0]!)).toBe(first);
    expect(entropy.mock.calls.length).toBe(calls);
    const second = runtime.prepare(source.entities[1]!);
    const third = runtime.prepare(source.entities[2]!);
    expect(second.boundary).toContain('ErrorAdmin.GetInstance/Create');
    expect(third.boundary).toContain('ErrorAdmin.GetInstance/Create');
    expect(new Set([first, second, third].map(row => row.allocation!.data.entity)).size).toBe(3);
    expect(runtime.navigationRegistry.navigationPS).toHaveLength(0);
    expect(runtime.constructionCounter134.value).toBe(3);
    expect(runtime.factory.heap()).toHaveLength(3);
  });

  it('keeps a missing registered ID unknown until real spatial/template services resolve it', () => {
    const { runtime } = fixture();
    runtime.prepare(source.entities[0]!);
    const enclave = '145ead7514ee364bab2e0402c3f7481c00000000';
    expect(runtime.resolve(enclave)).toEqual({ known: false,
      reason: 'Live spatial entity table is not owned by this partial NPC profile' });
    expect(runtime.resolve(enclave, 2)).toEqual({ known: false,
      reason: 'Live template entity table is not owned by this partial NPC profile' });
    expect(runtime.getOwner(enclave)).toBeNull();
  });

  it('stops at ErrorAdmin before querying any later application or navigation capability', () => {
    const applicationMode270EqualsOne = vi.fn(() => known(true));
    const findZoneAt = vi.fn(() => known(null));
    const { runtime } = fixture({ applicationMode270EqualsOne, findZoneAt });
    const result = runtime.prepare(source.entities[0]!);
    expect(result.boundary).toContain('ErrorAdmin.GetInstance/Create');
    expect(applicationMode270EqualsOne).not.toHaveBeenCalled();
    expect(findZoneAt).not.toHaveBeenCalled();
    expect(runtime.navigationRegistry.navigationPS).toEqual([]);
    expect(result.allocation!.data.entity.propertySets).toHaveLength(0);
    expect(result.worldResident).toBe(false);
  });

  it('does not skip the first factory cleanup to attach NPC or Routine packets out of source order', () => {
    const { runtime } = fixture();
    const record = source.entities[0]!;
    const result = runtime.prepare(record);
    expect(result.boundary).toContain('ErrorAdmin.GetInstance/Create');
    const navigation = result.navigation!;
    const entity = result.allocation!.data.entity;
    expect(entity.propertySets).toEqual([]);
    expect(entity.propertyTypeBits[0]! & (1 << 5)).toBe(0);
    expect(result.propertyAttachments).toEqual([]);
    expect(navigation.wrapper.getReferenceCount()).toEqual(known(2));
    expect(navigation.wrapper.deleted).toBe(false);
    expect(result.reflection!.allocations().map(row => row.wrapper.factory.root.className)).toEqual(['gCNavigation_PS']);
    expect(result.reflection!.allocations()[0]!.phase).toBe('initialized');
    expect(result.reflection!.receipt().trace.some(row => row.operation === 'wrapper virtual Read')).toBe(false);
    expect(result.consumedBytes).toBeLessThan(record.propertySets[0]!.accessorEndSourceOffset - record.sourceOffset);
    expect(entity.sourceReadStage).toBe('node-id-read');
    expect(entity.context).toBeNull();
    expect(result.worldResident).toBe(false);
  });
});
