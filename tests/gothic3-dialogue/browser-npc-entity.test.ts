import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BrowserNpcEntityRuntime, loadBrowserNpcEntitySources } from '../../src/gothic3/browser-npc-entity';
import type { BrowserNpcEntityServices, BrowserNpcEntitySources } from '../../src/gothic3/browser-npc-entity';
import { OriginalControlModuleState, OriginalControlReader } from '../../src/gothic3/control-reading';
import { NativeReflectionController } from '../../src/gothic3/entity-reflection';
import { monotonicClockMilliseconds } from '../../src/gothic3/world-clock';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { createBrowserNpcEntityServices } from '../../src/gothic3/browser-npc-entity-services';
import { loadBrowserNpcNavigationOwner } from '../../src/gothic3/browser-npc-navigation-owner';
import { BrowserNavigationAreaSourceRuntime } from '../../src/gothic3/browser-navigation-area-source-runtime';
import { navigationPropertyId } from '../../src/gothic3/navigation-scene';
import { browserHeroPositionToNativeCm, GOTHIC3_HERO_EYE_HEIGHT_METRES } from '../../src/gothic3/native-world-coordinates';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
let source: BrowserNpcEntitySources;
beforeAll(async () => {
  vi.stubGlobal('location', { href: 'http://local.test/gothic3/index.html' });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const path = new URL(url).pathname;
    const localPath = path === '/gothic3/gameplay/npc-entity/bandit-records.json.gz'
      ? '../../public/gothic3/gameplay/npc-entity/bandit-records.json.gz'
      : /^\/gothic3\/navigation-scene\/(query-map|entity-definitions)\.json\.gz$/.test(path)
        ? '../../public' + path : null;
    if (!localPath) throw new Error('Unexpected source fixture request: ' + url);
    const bytes = new Uint8Array(readFileSync(new URL(localPath, import.meta.url)));
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
  it('keeps the ScriptAdmin getter and area CallScript slot as separate injectable owners', () => {
    const owner = createBrowserNpcEntityServices({ crypto: { randomUUID }, now: () => performance.now() });
    try {
      const before = owner.navigationNames.host.scriptAdmin();
      expect(before.known).toBe(false);
      if (!before.known) expect(before.reason).toContain('Original Game ScriptAdmin getter owner is not connected');
      const admin = { identity: {} };
      owner.navigationNames.connectScriptAdminLookup({ getInstance: () => known(admin) });
      expect(owner.navigationNames.host.scriptAdmin()).toEqual(known(admin));
      const slot = owner.navigationNames.host.captureAreaScriptSlot(admin);
      expect(slot.known).toBe(false);
      if (!slot.known) expect(slot.reason).toContain('Original Navigation area script vtable slot owner is not connected');
      expect(() => owner.navigationNames.connectScriptAdminLookup({ getInstance: () => known(admin) }))
        .toThrow('One retained source ScriptAdmin lookup owner is required');
    } finally { owner.dispose(); }
  },30000);

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

  it('uses the application-owned runtime admins for the retained source NPC read', () => {
    const owner = createBrowserNpcEntityServices({ crypto: { randomUUID }, now: () => performance.now() });
    try {
      expect(owner.startBrowserSessionMode()).toEqual(known(undefined));
      const runtime = new BrowserNpcEntityRuntime(owner.services);
      const result = runtime.prepare(source.entities[0]!);
      expect(owner.services.runtimeAdmins!.error.isInPanicState()).toEqual(known(false));
      expect(result.allocation!.heapFields!.data.name).toBe(source.entities[0]!.name);
      const read = result.read;
      expect(read?.supported).toBe(false);
      if (!read || read.supported) throw new Error('Expected the Navigation area-proxy read boundary');
      expect(result.consumedBytes, `${read.reason}; ${JSON.stringify(owner.services.runtimeAdmins!.error.snapshot().trace)}`)
        .toBeGreaterThan(338);
      expect(read.reason).toContain('Compiled navigation query requires actual owned area proxy resolution');
      expect(result.worldResident).toBe(false);
    } finally {
      owner.dispose();
    }
  },30000);

  it('loads source-registered Navigation areas and resolves Navigation name notifications', async () => {
    const serviceOwner = createBrowserNpcEntityServices({ crypto: { randomUUID }, now: () => performance.now() });
    let navigation: Awaited<ReturnType<typeof loadBrowserNpcNavigationOwner>> | null = null;
    let areas: BrowserNavigationAreaSourceRuntime | null = null;
    try {
      expect(serviceOwner.startBrowserSessionMode()).toEqual(known(undefined));
      navigation = await loadBrowserNpcNavigationOwner(serviceOwner.application);
      const areaRuntime = new BrowserNavigationAreaSourceRuntime(navigation);
      areas = areaRuntime;
      serviceOwner.navigationNames.connectProxyEntityServices(areaRuntime);
      const binding = navigation.bindStoredQueryProperties();
      expect(binding.status, binding.reason).toBe('query-bindings-complete');
      expect(binding.fullNavigationAdminCompiled).toBe(false);
      expect(areas.sourceLoadSummary()).toEqual({ loadedSources: 67, failedSources: 0, liveAreas: 5385 });
      expect(navigation.registeredAreas()).toHaveLength(5385);

      const xardasTower = areas.source.definitions.entities.find((definition) => definition.name === 'Xardas_Tower');
      if (!xardasTower) throw new Error('Missing source Navigation zone Xardas_Tower.');
      expect(areas.findZoneAtPositionCm([
        xardasTower.worldMatrix[12]!, xardasTower.worldMatrix[13]!, xardasTower.worldMatrix[14]!,
      ])).toEqual({ known: true, value: { id: navigationPropertyId(xardasTower.guid), name: 'Xardas_Tower' } });
      const [nativeX, nativeY, nativeZ] = xardasTower.worldMatrix.slice(12, 15);
      if (nativeX === undefined || nativeY === undefined || nativeZ === undefined) {
        throw new Error('Xardas_Tower source matrix has no complete position');
      }
      const heroEyePosition: [number, number, number] = [
        nativeX / 100 - 920,
        nativeY / 100 - 52 + GOTHIC3_HERO_EYE_HEIGHT_METRES,
        -nativeZ / 100 - 120,
      ];
      expect(areas.findZoneAtPositionCm(browserHeroPositionToNativeCm(heroEyePosition, [920, 52, 120]))).toEqual({
        known: true, value: { id: navigationPropertyId(xardasTower.guid), name: 'Xardas_Tower' },
      });

      const bandit = source.entities[0]!;
      const runtime = new BrowserNpcEntityRuntime({ ...serviceOwner.services,
        applicationMode270EqualsOne: navigation.applicationMode270EqualsOne,
        findZoneAt: navigation.findZoneAt,
      });
      const prepared = runtime.prepare(bandit);
      expect(prepared.read?.supported).toBe(false);
      if (!prepared.read || prepared.read.supported) throw new Error('Expected a later retained Navigation read boundary');
      expect(prepared.consumedBytes).toBe(700);
      expect(prepared.read.reason).not.toContain('actual owned area proxy resolution');
      expect(prepared.read.reason).not.toContain('Navigation proxy GetEntity: Original Engine proxy GetEntity owner is not connected');
      expect(prepared.read.reason).toContain('Navigation area ScriptAdmin getter: Original Game ScriptAdmin getter owner is not connected');
      const currentZoneProxy = prepared.navigation?.proxies.get('CurrentZoneEntityProxy');
      expect(currentZoneProxy?.propertyID()).toBe('7e3d269f0004064d9bcbd4c4c62de6aa00000000');
      expect(currentZoneProxy?.internal?.identity).toBe('browser-navigation-proxy-reference:browser-navigation-source:world-0048:20');
      expect(prepared.worldResident).toBe(false);
    } finally {
      areas?.dispose();
      navigation?.dispose();
      serviceOwner.dispose();
    }
  }, 120000);

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
