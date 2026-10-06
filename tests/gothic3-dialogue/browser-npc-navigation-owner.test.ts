import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BrowserNavigationApplicationOwner, BrowserNpcNavigationOwner } from '../../src/gothic3/browser-npc-navigation-owner';
import type { BrowserConstructedNavigationArea, BrowserConstructedNavigationAreaHost,
  BrowserSessionModeOwner } from '../../src/gothic3/browser-npc-navigation-owner';
import { loadNativeNavigationSceneSource, navigationPropertyId } from '../../src/gothic3/navigation-scene';
import type { NativeNavigationSceneSource } from '../../src/gothic3/navigation-scene';
import { NativeLiveEntity, NativeLivePropertySet, NativeSceneEntityRegistry } from '../../src/gothic3/entity-lifecycle';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { OriginalPropertyOwner } from '../../src/gothic3/native-properties';
import type { NativeValue } from '../../src/gothic3/dialogue';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const fact = <T>(value: NativeValue<T>): T => { if (!value.known) throw new Error(value.reason); return value.value; };
let source: NativeNavigationSceneSource;
beforeAll(async () => {
  vi.stubGlobal('location', { href: 'http://local.test/gothic3/index.html' });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const path = new URL(url).pathname;
    if (!/^\/gothic3\/navigation-scene\/(query-map|entity-definitions)\.json\.gz$/.test(path)) throw new Error('Unexpected fixture resource');
    return new Response(new Uint8Array(readFileSync(new URL('../../public' + path, import.meta.url))));
  }));
  source = await loadNativeNavigationSceneSource();
});
afterAll(() => vi.unstubAllGlobals());

const sceneRegistries = new WeakMap<BrowserNpcNavigationOwner, NativeSceneEntityRegistry>();
function fixtureOwner(): BrowserNpcNavigationOwner {
  const registry = new NativeSceneEntityRegistry();
  const owner = new BrowserNpcNavigationOwner(source, undefined, { resolvePropertySet: proxy => {
    // Explicit fixture ownership of all three SceneAdmin tables and empty lower
    // lookup branches, plus the fixture's completed OnReadContent/type lookup.
    const entity = registry.getEntity(proxy.guid20!, 0, { findSpatial: () => known(null), findTemplate: () => known(null) });
    if (!entity.known) return entity;
    return known(entity.value?.propertySets.find(set => set.className === proxy.propertySet) ?? null);
  } });
  sceneRegistries.set(owner, registry); return owner;
}
function constructedFixture(owner: BrowserNpcNavigationOwner, key: string, override: Partial<BrowserConstructedNavigationAreaHost> = {}) {
  const area = fact(owner.createArea(key));
  const entity = new NativeLiveEntity('fixture:' + key, OriginalPropertyOwner.fromConstructor('fixture:' + key, 'eCEntity'),
    '0101010101010101010101010101010100000000'); //explicit fixture GUID capability.
  const registry = sceneRegistries.get(owner) ?? new NativeSceneEntityRegistry();
  expect(registry.readNodeIdentity(entity, 1, () => known(area.id)).outcome).toBe('complete');
  // These caller prerequisites are explicitly supplied by this fixture; the
  // browser owner does not construct/read/attach production source areas.
  entity.sourceReadStage = 'entity-read-complete';
  let current: NativeLiveEntity | null = entity;
  const set = new NativeLivePropertySet('fixture-PS:' + key, area.kind === 'zone' ? 'gCNavZone_PS' : 'gCNavPath_PS',
    area.kind === 'zone' ? 8 : 10, area, { read: () => current, write: value => { current = value; } }, null,
    { added: () => known(undefined), removed: () => known(undefined), postRead: () => known(undefined) }, () => known(false));
  set.createBase(); entity.propertySets.push(set);
  const physical = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(64), knownMask: new Uint8Array(64), freed: false });
  area.worldMatrix.forEach((value, index) => physical.writeFloat(index * 4, value));
  const matrix = physical.floatArray(0, 16);
  const host: BrowserConstructedNavigationAreaHost = { isTemplate: () => known(false), worldMatrix: () => known(matrix),
    verifyConstructedArea: () => known(undefined), ...override }; //explicitly supplied fixture prerequisites.
  const record = fact(owner.admitConstructedArea(set, host));
  return { area, entity, set, record, host, physical, matrix, registry };
}
const zoneKey = () => source.definitions.entities.find(value => value.propertySets.some(set => set.name === 'gCNavZone_PS'))!.key;
const pathKey = () => source.definitions.entities.find(value => value.propertySets.some(set => set.name === 'gCNavPath_PS'))!.key;

describe('selected browser application and original cached session getter', () => {
  it('keeps the original cold bytes and strict Engine initialized comparison', () => {
    const app = new BrowserNavigationApplicationOwner();
    expect([...app.physical.sessionCache.bytes]).toEqual(new Array(8).fill(0));
    expect([...app.physical.sessionCache.knownMask]).toEqual(new Array(8).fill(255));
    const session = app.createSessionModeOwner();
    expect(session.readRunningByte()).toEqual(known(0));
    expect(session.fields.knownMask.slice(0, 0xe8).every(mask => mask === 0)).toBe(true);
    fact(session.writeRunningByte(1)); fact(app.registerSession(session));
    expect(app.applicationMode270EqualsOne()).toEqual(known(false));
    fact(app.writeInitializedByte(2));
    expect(app.applicationMode270EqualsOne()).toEqual(known(false));
    expect(app.physical.sessionCache.readUnsigned(4)).toBe(0);
    fact(app.writeInitializedByte(1));
    expect(app.applicationMode270EqualsOne()).toEqual(known(true));
    expect(app.physical.sessionCache.pointer(0).get()).toBe(session);
  });
  it('reads the same physical session byte each call, comparing exactly with one', () => {
    const app = new BrowserNavigationApplicationOwner(); const session = app.createSessionModeOwner();
    fact(app.registerSession(session)); fact(app.writeInitializedByte(1));
    expect(app.applicationMode270EqualsOne()).toEqual(known(false));
    const alias = new NativeHeapObjectViews(session.fields.backing);
    alias.writeUnsigned(0xe8, 1, 1); expect(app.applicationMode270EqualsOne()).toEqual(known(true));
    alias.writeUnsigned(0xe8, 2, 1); expect(app.applicationMode270EqualsOne()).toEqual(known(false));
    alias.knownMask[0xe8] = 0; expect(app.applicationMode270EqualsOne().known).toBe(false);
  });
  it('sets the guard before resolution, preserves other bits, and caches a NULL lookup', () => {
    let app: BrowserNavigationApplicationOwner;
    const resolve = vi.fn(() => {
      expect(app.physical.sessionCache.readUnsigned(4)).toBe(0x80000001);
      expect(app.applicationMode270EqualsOne()).toEqual(known(false)); //source guard permits recursive cached NULL read.
      return known(null);
    });
    app = new BrowserNavigationApplicationOwner({ resolveRegisteredSession: resolve });
    app.physical.sessionCache.writeUnsigned(4, 0x80000000); fact(app.writeInitializedByte(1));
    expect(app.applicationMode270EqualsOne()).toEqual(known(false));
    const session = app.createSessionModeOwner(); fact(session.writeRunningByte(1)); fact(app.registerSession(session));
    expect(app.applicationMode270EqualsOne()).toEqual(known(false)); expect(resolve).toHaveBeenCalledTimes(1);
  });
  it('retains a failed lookup guard prefix and never turns unknown ownership into cached NULL success', () => {
    const resolve = vi.fn((): NativeValue<BrowserSessionModeOwner | null> => ({ known: false, reason: 'class/module/RTTI bridge unavailable' }));
    const app = new BrowserNavigationApplicationOwner({ resolveRegisteredSession: resolve }); fact(app.writeInitializedByte(1));
    expect(app.applicationMode270EqualsOne().known).toBe(false);
    expect(app.physical.sessionCache.readUnsigned(4)).toBe(1);
    expect(app.physical.sessionCache.pointer(0).get()).toBeNull();
    expect(app.applicationMode270EqualsOne().known).toBe(false); expect(resolve).toHaveBeenCalledTimes(1);
  });
  it('uses both source getter calls and gates a missing second receiver', () => {
    let session: BrowserSessionModeOwner;
    let app: BrowserNavigationApplicationOwner;
    app = new BrowserNavigationApplicationOwner({ resolveRegisteredSession: () => {
      fact(app.writeInitializedByte(0)); return known(session);
    } });
    session = app.createSessionModeOwner(); fact(session.writeRunningByte(1)); fact(app.writeInitializedByte(1));
    expect(app.applicationMode270EqualsOne()).toEqual({ known: false, reason: 'Source second session lookup has no captured receiver' });
    expect(app.physical.sessionCache.pointer(0).get()).toBe(session);
  });
  it('retains first-match cached allocation after module replacement and rejects its destroyed lifetime', () => {
    const app = new BrowserNavigationApplicationOwner();
    const first = app.createSessionModeOwner(), second = app.createSessionModeOwner();
    fact(first.writeRunningByte(1)); fact(app.registerSession(first)); fact(app.registerSession(second)); fact(app.writeInitializedByte(1));
    expect(app.applicationMode270EqualsOne()).toEqual(known(true));
    fact(app.removeSession(first)); expect(app.applicationMode270EqualsOne()).toEqual(known(true));
    first.dispose(); expect(app.applicationMode270EqualsOne().known).toBe(false);
    expect(app.physical.sessionCache.pointer(0).get()).toBe(first);
  });
  it('aliases a supplied initialized byte and preserves its separate allocation on disposal', () => {
    const initialized = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array([0]), knownMask: new Uint8Array([255]), freed: false });
    const app = new BrowserNavigationApplicationOwner({ initializedByte: initialized });
    expect(app.physical.engineInitialized).toBe(initialized);
    fact(app.writeInitializedByte(1)); app.dispose(); expect(initialized.backing.freed).toBe(false);
    expect(initialized.readUnsigned(0, 1)).toBe(1); expect(app.applicationMode270EqualsOne().known).toBe(false);
  });
  it('rejects an initialized view with a detached mask rather than claiming shared storage', () => {
    const initialized = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array([0]), knownMask: new Uint8Array([255]), freed: false });
    Object.defineProperty(initialized, 'knownMask', { value: new Uint8Array([255]) });
    expect(() => new BrowserNavigationApplicationOwner({ initializedByte: initialized })).toThrow('Canonical');
  });
});

describe('live constructed Navigation area owner and stored query hooks', () => {
  it('does not register source candidates, renderer state, or admit detached area values', () => {
    const owner = fixtureOwner();
    const area = fact(owner.createArea(zoneKey()));
    expect(owner.createArea(zoneKey())).toEqual(known(area));
    expect(owner.registeredAreas()).toEqual([]); expect(owner.resolveAreaById(area.id)).toEqual(known(null));
    expect(new BrowserNpcNavigationOwner(source).resolveAreaById(area.id).known).toBe(false);
    expect(owner.findZoneAt([0, 0, 0], false, true, -1).known).toBe(false);
    const fixture = constructedFixture(owner, pathKey());
    fixture.entity.propertySets.length = 0;
    expect(owner.admitConstructedArea(fixture.set, fixture.host).known).toBe(false);
    expect(owner.registerArea(fixture.record).known).toBe(false);
  });
  it('uses exact PS pointer registration, live matrix alias and first16-byte IDs', () => {
    const owner = fixtureOwner();
    const fixture = constructedFixture(owner, zoneKey());
    fact(owner.registerArea(fixture.record)); fact(owner.registerArea(fixture.record));
    expect(owner.registeredAreas()).toEqual([fixture.record]); expect(fixture.area.worldMatrix).toBe(fixture.matrix);
    expect(owner.resolveAreaById(fixture.area.id.slice(0, 32) + '12345678')).toEqual(known(fixture.record));
    fixture.physical.writeFloat(48, Math.fround(fixture.matrix[12]! + 50));
    expect(fixture.area.worldMatrix[12]).toBe(fixture.matrix[12]);
    fact(owner.deregisterArea(fixture.record)); expect(owner.registeredAreas()).toEqual([]);
    expect(owner.resolveAreaById(fixture.area.id)).toEqual(known(fixture.record)); //source map deregistration does not remove entity/PS.
    expect(fixture.registry.unregister(fixture.entity).outcome).toBe('complete');
    expect(owner.resolveAreaById(fixture.area.id)).toEqual(known(null)); //actual complete fixture SceneAdmin miss.
    expect(fixture.registry.register(fixture.entity).outcome).toBe('complete');
    fact(owner.registerArea(fixture.record)); expect(owner.registeredAreas()).toEqual([fixture.record]);
  });
  it('retains register-before-matrix prefix and blocks replay after unknown lower callbacks', () => {
    const owner = fixtureOwner();
    const matrix = vi.fn((): NativeValue<readonly number[]> => ({ known: false, reason: 'physical owner matrix unavailable' }));
    const fixture = constructedFixture(owner, pathKey(), { worldMatrix: matrix });
    expect(owner.registerArea(fixture.record).known).toBe(false);
    expect(owner.registeredAreas()).toEqual([fixture.record]);
    expect(owner.resolveAreaById(fixture.area.id).known).toBe(false);
    expect(owner.registerArea(fixture.record).known).toBe(false); expect(matrix).toHaveBeenCalledTimes(1);
    expect(owner.deregisterArea(fixture.record).known).toBe(false); expect(owner.registeredAreas()).toEqual([fixture.record]);
  });
  it('stops at the unknown lifecycle call before further construction verification callbacks', () => {
    const owner = fixtureOwner(); let boundaryReached = false;
    const verify = vi.fn((): NativeValue<void> => boundaryReached
      ? { known: false, reason: 'This later verification must not execute' } : known(undefined));
    const fixture = constructedFixture(owner, zoneKey(), { verifyConstructedArea: verify,
      worldMatrix: () => { boundaryReached = true; return { known: false, reason: 'Original matrix boundary' }; } });
    const initialVerifications = verify.mock.calls.length;
    const result = owner.registerArea(fixture.record);
    expect(result.known).toBe(false); if (!result.known) expect(result.reason).toContain('Original matrix boundary');
    expect(verify).toHaveBeenCalledTimes(initialVerifications + 1);
    expect(owner.registeredAreas()).toEqual([fixture.record]);
    expect(owner.registerArea(fixture.record)).toEqual(result);
    expect(verify).toHaveBeenCalledTimes(initialVerifications + 1);
  });
  it('retains registration when a matrix callback attempts recursive area mutation', () => {
    const owner = fixtureOwner(); let record: BrowserConstructedNavigationArea;
    const fixture = constructedFixture(owner, zoneKey(), { worldMatrix: () => {
      expect(owner.deregisterArea(record).known).toBe(false); return known(fixture.matrix);
    } });
    record = fixture.record;
    expect(owner.registerArea(record).known).toBe(false); expect(owner.registeredAreas()).toEqual([record]);
    expect(owner.resolveAreaById(fixture.area.id).known).toBe(false);
  });
  it('leaves missing source RTTI unknown without creating a registered area', () => {
    const owner = fixtureOwner();
    const fixture = constructedFixture(owner, zoneKey(), { isTemplate: () => ({ known: false, reason: 'actual template RTTI unavailable' }) });
    expect(owner.registerArea(fixture.record).known).toBe(false); expect(owner.registeredAreas()).toEqual([]);
    expect(owner.resolveAreaById(fixture.area.id).known).toBe(false);
  });
  it('requires explicit construction evidence beyond mutable entity metadata and GUID/type', () => {
    const owner = fixtureOwner(); const fixture = constructedFixture(owner, zoneKey());
    const other = fixtureOwner(); const area = fact(other.createArea(zoneKey()));
    const set = new NativeLivePropertySet('stand-in', 'gCNavZone_PS', 8, area, fixture.set.owner, null,
      fixture.set.callbacks, fixture.set.processable);
    set.createBase(); fixture.entity.propertySets.push(set);
    const host = { isTemplate: fixture.host.isTemplate, worldMatrix: fixture.host.worldMatrix };
    expect(other.admitConstructedArea(set, host as BrowserConstructedNavigationAreaHost).known).toBe(false);
    fixture.entity.sourceReadStage = 'constructor';
    expect(owner.admitConstructedArea(fixture.set, fixture.host).known).toBe(false);
  });
  it('rechecks actual proxy lookup and rejects a replaced source property-set capability', () => {
    const owner = fixtureOwner(); const fixture = constructedFixture(owner, zoneKey());
    fact(owner.registerArea(fixture.record)); expect(owner.resolveAreaById(fixture.area.id)).toEqual(known(fixture.record));
    const replacement = new NativeLiveEntity('replacement', OriginalPropertyOwner.fromConstructor('replacement', 'eCEntity'), fixture.area.id);
    const replacementSet = new NativeLivePropertySet('replacement-PS', 'gCNavZone_PS', 8, {},
      { read: () => replacement, write: () => {} }, null, fixture.set.callbacks, fixture.set.processable);
    replacement.propertySets.push(replacementSet);
    expect(fixture.registry.register(replacement).outcome).toBe('complete');
    expect(owner.resolveAreaById(fixture.area.id).known).toBe(false);
    expect(fixture.registry.unregister(replacement).outcome).toBe('complete');
    expect(owner.resolveAreaById(fixture.area.id)).toEqual(known(null));
  });
  it('preserves area lifetime and blocks replacement by a reused GUID', () => {
    const owner = fixtureOwner(); const fixture = constructedFixture(owner, pathKey());
    fact(owner.registerArea(fixture.record)); fact(owner.releaseArea(fixture.record));
    expect(owner.resolveAreaById(fixture.area.id).known).toBe(false); expect(owner.registerArea(fixture.record).known).toBe(false);
    fixture.entity.propertyId20 = '0202020202020202020202020202020200000000';
    expect(owner.resolveAreaById(fixture.area.id).known).toBe(false);
  });
  it('retains the first missing proxy boundary and forbids stored binding replay', () => {
    const owner = new BrowserNpcNavigationOwner(source);
    const first = source.query.zoneBindings[0]!, proxy = source.query.proxies[first.proxy]!;
    expect(owner.resolveAreaById(proxy.guid20!).known).toBe(false);
    const result = owner.bindStoredQueryProperties();
    expect(result.status).toBe('partial'); expect(result.attempted).toEqual(['resolve-zone:' + first.proxy]);
    expect(result.applied).toEqual([]); expect(result.fullNavigationAdminCompiled).toBe(false);
    expect(owner.bindStoredQueryProperties().status).toBe('unsupported');
    expect(owner.findZoneAt([0, 0, 0], false, true, -1).known).toBe(false);
  });
  it('binds actual registered source areas with inherited path observers and runs original GetZone', () => {
    const owner = fixtureOwner();
    const modified = vi.fn(); const fixtures: ReturnType<typeof constructedFixture>[] = [];
    for (const definition of source.definitions.entities) {
      const fixture = constructedFixture(owner, definition.key); fixtures.push(fixture);
      const original = fixture.entity.propertyOwner.modified.bind(fixture.entity.propertyOwner);
      fixture.entity.propertyOwner.modified = () => { modified(); return original(); };
      fact(owner.registerArea(fixture.record));
    }
    const binding = owner.bindStoredQueryProperties();
    expect(binding.status).toBe('query-bindings-complete'); expect(owner.scene.queryBindingsReady).toBe(true);
    expect(modified).toHaveBeenCalledTimes(source.query.pathBindings.length * 6 * 2 * 2);
    const zone = fixtures.find(value => value.area.kind === 'zone')!.area;
    const point = [Math.fround(zone.worldMatrix[12]! + zone.pointsCm[0]![0]),
      Math.fround(zone.worldMatrix[13]! + zone.pointsCm[0]![1]), Math.fround(zone.worldMatrix[14]! + zone.pointsCm[0]![2])] as const;
    const result = owner.findZoneAt(point, false, true, -1);
    expect(result.known).toBe(true);
    if (result.known && result.value !== null) expect(owner.resolveAreaById(result.value).known).toBe(true);
    expect(navigationPropertyId(zone.id)).toBe(zone.id);
    owner.dispose(); expect(owner.findZoneAt(point, false, true, -1).known).toBe(false);
    expect(owner.applicationMode270EqualsOne().known).toBe(false);
  }, 30000);
});
