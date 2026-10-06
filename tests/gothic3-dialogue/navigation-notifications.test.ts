import { describe, expect, it } from 'vitest';
import { NativeReflectionController } from '../../src/gothic3/entity-reflection';
import { createNativeNavigationFactory } from '../../src/gothic3/navigation-reading';
import { createNativeNavigationState } from '../../src/gothic3/navigation-runtime';
import { NativeLiveEntity } from '../../src/gothic3/entity-lifecycle';
import { OriginalEnclaveProxy, OriginalPropertyOwner } from '../../src/gothic3/native-properties';
import { monotonicClockMilliseconds } from '../../src/gothic3/world-clock';
import type { NativeNavigationNotificationHost, NativeNavigationNotifyString } from '../../src/gothic3/navigation-notifications';
import type { NativeValue } from '../../src/gothic3/dialogue';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function entity(name: string): NativeLiveEntity {
  return new NativeLiveEntity(name, OriginalPropertyOwner.fromConstructor(name, 'gCEntity'), '0'.repeat(40));
}

/** Isolated virtual-call fixtures. Lower owners are controlled explicitly;
 * successful fixture calls are not evidence of production module startup. */
function fixture() {
  const calls: string[] = [], strings = new Map<NativeNavigationNotifyString, string>();
  const pointers = new Map<OriginalEnclaveProxy, NativeLiveEntity | null>();
  const temporaries = new Set<OriginalEnclaveProxy>();
  const actor = entity('actor'), areaEntity = entity('area'), areaSet = Object.freeze({ identity: 'zonePS' });
  const controller = new NativeReflectionController('isolated-notification', {
    timestamps: monotonicClockMilliseconds(() => 42), precision: 53,
    isInPanicState: () => known(false), //Selected test state, never production.
  });
  const host: NativeNavigationNotificationHost = {
    constructString: text => { calls.push('string+' + text); const object = { identity: {} }; strings.set(object, text); return known(object); },
    destroyString: object => { calls.push('string-' + strings.get(object)); if (!strings.delete(object)) return missing('dead string'); return known(undefined); },
    equalsNameString: (name, object) => { calls.push('compare:' + name); return strings.has(object) ? known(Number(strings.get(object) === name)) : missing('dead string'); },
    equalsNameChars: (name, text) => { calls.push('chars:' + name); return known(Number(name === text)); },
    getProxyEntity: proxy => { calls.push('proxy-get'); return known(pointers.get(proxy) ?? null); },
    constructProxy: () => { calls.push('proxy+'); const proxy = OriginalEnclaveProxy.fromConstructor(); temporaries.add(proxy); return known(proxy); },
    assignProxy: (destination, source) => { calls.push('proxy='); pointers.set(destination, pointers.get(source) ?? null); return known(undefined); },
    destroyProxy: proxy => { calls.push('proxy-'); return temporaries.delete(proxy) ? known(undefined) : missing('dead proxy'); },
    hasPropertySet: (_entity, type) => { calls.push('has:' + type); return known(Number(type === 8)); },
    getPropertySet: (_entity, type) => { calls.push('ps:' + type); return known(type === 6 ? null : areaSet); },
    getPropertyOwner: () => { calls.push('area-owner'); return known(areaEntity); },
    getNavigationOwner: () => { calls.push('actor-owner'); return known(actor); },
    registerDcc: () => { calls.push('dcc+'); return missing('No DCC capability admitted'); },
    deregisterDcc: (_set, dcc) => { calls.push('dcc-' + String(dcc)); return known(undefined); },
    contactNotificationsEnabled: owner => { calls.push('flags:' + owner.identity); return known(0); },
    constructContactIterator: () => missing('No contact iterator admitted'),
    destroyContactIterator: () => missing('No contact iterator admitted'),
    captureContactSlot: () => missing('No contact virtual admitted'),
    scriptAdmin: () => { calls.push('script-admin'); return known(null); },
    captureAreaScriptSlot: () => missing('No ScriptAdmin capability admitted'),
    pointNotification: (_properties, phase, name) => { calls.push('point:' + phase + ':' + name); return missing('Point lookup not admitted'); },
    routineNotification: () => { calls.push('routine'); return missing('Routine setters not admitted'); },
  };
  const factory = createNativeNavigationFactory({
    allocateNavigation: identity => known({ state: createNativeNavigationState(identity), wishes: { wishedMovementMode: 0 } }),
    coCreateGuid: scratch => { scratch.bytes.fill(7, 0, 16); scratch.knownMask.fill(255, 0, 16); return known(0); },
    notifications: host,
  });
  value(controller.registerFactory(factory));
  const wrapper = value(factory.cloneRoot(controller));
  const properties = value(factory.properties(wrapper));
  properties.owner = actor;
  const notify = (phase: 'enter' | 'exit', name: string, propagated = false) =>
    controller.value(() => properties.notify(phase, name, propagated));
  return { calls, strings, pointers, temporaries, actor, areaEntity, areaSet, controller, properties, host, notify };
}

describe('original false Navigation virtual notifications', () => {
  it('keeps propagated payload notifications free of custom calls', () => {
    const f = fixture();
    expect(f.notify('exit', 'CurrentZoneEntityProxy', true)).toEqual(known(undefined));
    expect(f.calls).toEqual([]);
  });
  it('runs the false no-match exit CString lifetime between two fresh owner reads', () => {
    const f = fixture(), second = entity('second');
    f.actor.propertyOwner.modified = () => { f.calls.push('modified:actor'); return 1; };
    second.propertyOwner.modified = () => { f.calls.push('modified:second'); return 2; };
    const construct = f.host.constructString;
    f.host.constructString = text => { f.properties.owner = second; return construct(text); };
    expect(f.notify('exit', 'StartPosition')).toEqual(known(undefined));
    expect(f.calls).toEqual(['modified:actor', 'string+StartPosition',
      'compare:CurrentZoneEntityProxy', 'compare:Routine', 'compare:SleepingPoint',
      'compare:WorkingPoint', 'compare:RelaxingPoint', 'string-StartPosition', 'modified:second']);
    expect(f.strings.size).toBe(0);
  });
  it('compares all three false-enter point globals even for unrelated attachment names', () => {
    const f = fixture(); expect(f.notify('enter', 'LastUseableNavigationPosition')).toEqual(known(undefined));
    expect(f.calls).toEqual(['chars:SleepingPoint', 'chars:WorkingPoint', 'chars:RelaxingPoint']);
  });
  it('skips area callbacks for equal resolved pointers, including the fresh both-NULL pair', () => {
    for (const resolved of [null, entity('same-area')]) {
      const f = fixture();
      f.pointers.set(f.properties.proxies.get('CurrentZoneEntityProxy')!, resolved);
      f.pointers.set(f.properties.proxies.get('LastZoneEntityProxy')!, resolved);
      expect(f.notify('exit', 'CurrentZoneEntityProxy')).toEqual(known(undefined));
      expect(f.calls.filter(call => call === 'proxy-get')).toHaveLength(2);
      expect(f.calls).not.toContain('proxy+'); expect(f.calls).not.toContain('script-admin');
      expect(f.strings.size).toBe(0);
    }
  });
  it('rereads differing pointers, leaves with NULL DCC, then enters and queries actual PS6', () => {
    const f = fixture(), old = entity('old-area');
    f.pointers.set(f.properties.proxies.get('CurrentZoneEntityProxy')!, f.areaEntity);
    f.pointers.set(f.properties.proxies.get('LastZoneEntityProxy')!, old);
    expect(f.notify('exit', 'CurrentZoneEntityProxy')).toEqual(known(undefined));
    expect(f.calls.filter(call => call === 'proxy+')).toHaveLength(2);
    expect(f.calls.indexOf('dcc-null')).toBeGreaterThan(f.calls.indexOf('proxy='));
    expect(f.calls.indexOf('ps:6')).toBeGreaterThan(f.calls.indexOf('dcc-null'));
    expect(f.calls).not.toContain('dcc+'); expect(f.calls.filter(call => call === 'script-admin')).toHaveLength(2);
    expect(f.temporaries.size).toBe(0); expect(f.strings.size).toBe(0);
  });
  it('preserves both temporaries and skips later cleanup/owner read at an unknown area flag', () => {
    const f = fixture(); f.pointers.set(f.properties.proxies.get('CurrentZoneEntityProxy')!, f.areaEntity);
    f.host.contactNotificationsEnabled = () => missing('Actual area flags unowned');
    let reads = 0; f.actor.propertyOwner.modified = () => { reads++; return 1; };
    const result = f.notify('exit', 'CurrentZoneEntityProxy');
    expect(result.known).toBe(false); if (!result.known) expect(result.reason).toContain('Actual area flags unowned');
    expect(f.temporaries.size).toBe(1); expect(f.strings.size).toBe(1); expect(reads).toBe(1);
    expect(f.calls).not.toContain('proxy-'); expect(f.calls).not.toContain('script-admin');
    const prefix = f.calls.slice(); expect(f.notify('exit', 'CurrentZoneEntityProxy')).toEqual(result); expect(f.calls).toEqual(prefix);
  });
  it('requires matched point and Routine branches and retains their CString on unknown exit work', () => {
    for (const name of ['Routine', 'SleepingPoint', 'WorkingPoint', 'RelaxingPoint']) {
      const f = fixture(), result = f.notify('exit', name);
      expect(result.known).toBe(false); expect(f.strings.size).toBe(1);
      expect(f.calls.some(call => call === 'routine' || call === 'point:exit:' + name)).toBe(true);
    }
  });
  it('preserves nonzero CString results while type/contact tests require exact one', () => {
    const f = fixture(); f.host.equalsNameString = name => known(name === 'CurrentZoneEntityProxy' ? 2 : 0);
    expect(f.notify('exit', 'CurrentZoneEntityProxy')).toEqual(known(undefined));
    expect(f.calls.filter(call => call === 'proxy-get')).toHaveLength(2); expect(f.strings.size).toBe(0);
  });
  it('stores the actual PS6 pointer before an unknown DCC registration', () => {
    const f = fixture(), dccObject = Object.freeze({ identity: 'actual-DCC-pointer' });
    f.pointers.set(f.properties.proxies.get('CurrentZoneEntityProxy')!, f.areaEntity);
    f.host.getPropertySet = (_entity, type) => known(type === 6 ? dccObject : f.areaSet);
    const result = f.notify('exit', 'CurrentZoneEntityProxy');
    expect(result.known).toBe(false); expect(f.properties.state.dynamicCollisionCircle).toBe(dccObject);
    expect(f.temporaries.size).toBe(1); expect(f.strings.size).toBe(1);
    expect(f.calls).toContain('dcc+'); expect(f.calls).not.toContain('proxy-');
  });
  it('captures the contact receiver/vtable slot before iterator construction and rereads the argument afterward', () => {
    const f = fixture(), changedActor = entity('changed-actor');
    f.pointers.set(f.properties.proxies.get('CurrentZoneEntityProxy')!, f.areaEntity);
    f.host.contactNotificationsEnabled = owner => known(Number(owner === f.areaEntity));
    let actor = f.actor;
    f.host.getNavigationOwner = () => { f.calls.push('argument-owner'); return known(actor); };
    f.host.captureContactSlot = (receiver, phase) => {
      f.calls.push('capture:' + receiver.identity + ':' + phase);
      return known({ invoke: other => { f.calls.push('invoke:' + receiver.identity + ':' + other?.identity); return known(undefined); } });
    };
    f.host.constructContactIterator = type => { f.calls.push('iterator+' + type); actor = changedActor; return known({ identity: {} }); };
    f.host.destroyContactIterator = () => { f.calls.push('iterator-'); return known(undefined); };
    expect(f.notify('exit', 'CurrentZoneEntityProxy')).toEqual(known(undefined));
    expect(f.calls.indexOf('capture:area:enter')).toBeLessThan(f.calls.indexOf('iterator+5'));
    expect(f.calls.indexOf('invoke:area:changed-actor')).toBeGreaterThan(f.calls.indexOf('iterator+5'));
    expect(f.calls.indexOf('iterator-')).toBeGreaterThan(f.calls.indexOf('invoke:area:changed-actor'));
  });
  it('constructs/captures the area script before fresh OTHER and SELF reads, then destroys its CString', () => {
    const f = fixture(); f.pointers.set(f.properties.proxies.get('CurrentZoneEntityProxy')!, f.areaEntity);
    f.host.scriptAdmin = () => known({ identity: {} });
    f.host.captureAreaScriptSlot = () => { f.calls.push('script-capture'); return known({ invoke: (name, self, other, argument) => {
      f.calls.push('script-call:' + f.strings.get(name) + ':' + self?.identity + ':' + other?.identity + ':' + argument);
      return known(undefined);
    } }); };
    expect(f.notify('exit', 'CurrentZoneEntityProxy')).toEqual(known(undefined));
    const index = f.calls.indexOf('string+OnEnterArea');
    expect(f.calls.slice(index, index + 6)).toEqual(['string+OnEnterArea', 'script-capture',
      'proxy-get', 'actor-owner', 'script-call:OnEnterArea:actor:area:0', 'string-OnEnterArea']);
    expect(f.strings.size).toBe(0); expect(f.temporaries.size).toBe(0);
  });
  it('does not record a contact dispatch attempt when its post-iterator argument lookup is unknown', () => {
    const f = fixture(); f.pointers.set(f.properties.proxies.get('CurrentZoneEntityProxy')!, f.areaEntity);
    f.host.contactNotificationsEnabled = () => known(1);
    f.host.captureContactSlot = () => known({ invoke: () => { f.calls.push('contact-dispatch'); return known(undefined); } });
    f.host.constructContactIterator = () => { f.host.getNavigationOwner = () => missing('Argument owner unavailable'); return known({ identity: {} }); };
    expect(f.notify('exit', 'CurrentZoneEntityProxy').known).toBe(false);
    expect(f.calls).not.toContain('contact-dispatch');
    expect(f.controller.receipt().attempted).not.toContain('Navigation area contact virtual');
    expect(f.temporaries.size).toBe(1); expect(f.strings.size).toBe(1);
  });
  it('rereads the retained vtable slot after callbacks while ignoring a replacement vtable pointer', () => {
    const f = fixture(); f.pointers.set(f.properties.proxies.get('CurrentZoneEntityProxy')!, f.areaEntity);
    f.host.contactNotificationsEnabled = owner => known(Number(owner === f.areaEntity));
    const originalTable = { slot: () => { f.calls.push('old-function'); return known(undefined); } };
    let receiverTable = originalTable;
    f.host.captureContactSlot = () => { const captured = receiverTable; return known({ invoke: () => captured.slot() }); };
    f.host.constructContactIterator = () => {
      originalTable.slot = () => { f.calls.push('changed-original-slot'); return known(undefined); };
      receiverTable = { slot: () => { f.calls.push('replacement-table'); return known(undefined); } };
      return known({ identity: {} });
    };
    f.host.destroyContactIterator = () => known(undefined);
    expect(f.notify('exit', 'CurrentZoneEntityProxy')).toEqual(known(undefined));
    expect(f.calls).toContain('changed-original-slot');
    expect(f.calls).not.toContain('old-function'); expect(f.calls).not.toContain('replacement-table');
  });
  it('preserves independent CString cleanup but rejects the next PS read after a callback destroys it', () => {
    const f = fixture(), construct = f.host.constructString; let modified = 0;
    f.actor.propertyOwner.modified = () => { modified++; return 1; };
    f.host.constructString = text => { const result = construct(text); f.properties.wrapper.deleted = true; return result; };
    const result = f.notify('exit', 'StartPosition');
    expect(result.known).toBe(false); if (!result.known) expect(result.reason).toContain('Actual retained Navigation');
    expect(f.calls).toContain('string-StartPosition'); expect(f.strings.size).toBe(0); expect(modified).toBe(1);
  });
  it('keeps source script/string/proxy cleanup after receiver destruction and stops before inherited owner access', () => {
    const f = fixture(); f.pointers.set(f.properties.proxies.get('CurrentZoneEntityProxy')!, f.areaEntity);
    f.host.scriptAdmin = () => known({ identity: {} });
    f.host.captureAreaScriptSlot = () => known({ invoke: () => { f.properties.wrapper.deleted = true; return known(undefined); } });
    expect(f.notify('exit', 'CurrentZoneEntityProxy').known).toBe(false);
    expect(f.calls).toContain('string-OnEnterArea'); expect(f.calls).toContain('proxy-');
    expect(f.calls).toContain('string-CurrentZoneEntityProxy');
    expect(f.strings.size).toBe(0); expect(f.temporaries.size).toBe(0);
  });
  it('retains the constructed proxy and stops before copying a destroyed embedded source proxy', () => {
    const f = fixture(), construct = f.host.constructProxy;
    f.pointers.set(f.properties.proxies.get('CurrentZoneEntityProxy')!, f.areaEntity);
    f.host.constructProxy = () => { const result = construct(); f.properties.wrapper.deleted = true; return result; };
    expect(f.notify('exit', 'CurrentZoneEntityProxy').known).toBe(false);
    expect(f.temporaries.size).toBe(1); expect(f.strings.size).toBe(1);
    expect(f.calls).not.toContain('proxy='); expect(f.calls).not.toContain('proxy-');
  });
});
