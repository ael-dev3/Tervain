/** Original nonpropagated Navigation notifications. Lower calls require actual
 * proxy/string/area/contact/script owners. A missing call preserves its prefix,
 * including temporary lifetimes; source cleanup never runs through finally. */
import rulesText from '../../assets/gothic3/browser-navigation-owner/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import type { NativeLiveEntity } from './entity-lifecycle';
import type { OriginalEnclaveProxy } from './native-properties';
import type { OriginalNavigationProperties } from './navigation-reading';
import type { NativeNavigationDCCHost } from './navigation-runtime';

const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>;
  methods: Record<string, { entry: string; body: string }> };
if (rules.schema !== 'gothic3-browser-navigation-owner-rules-v1' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
    rules.methods.navigationNotifyEnter?.body !== '20286d40' ||
    rules.methods.navigationNotifyExit?.body !== '202873e0') throw new Error('Navigation notification source receipt differs');

type Phase = 'enter' | 'exit';
type Point = 'SleepingPoint' | 'WorkingPoint' | 'RelaxingPoint';
export type NativeNavigationPropertyName = 'CurrentZoneEntityProxy' | 'Routine' | Point;
/** An actual retained CString, not the name text or a catalog entry. */
export interface NativeNavigationNotifyString { readonly identity: object }
export interface NativeNavigationContactIterator { readonly identity: object }
export interface NativeNavigationScriptAdmin { readonly identity: object }
/** Retains the captured vtable SLOT, loading its current function at invoke.
 * Changing the receiver's vtable pointer cannot replace this retained slot. */
export interface NativeNavigationContactSlot {
  invoke(other: NativeLiveEntity | null, iterator: NativeNavigationContactIterator): NativeValue<void>;
}
export interface NativeNavigationAreaScriptSlot {
  invoke(name: NativeNavigationNotifyString, self: NativeLiveEntity | null,
    other: NativeLiveEntity | null, argument: 0): NativeValue<void>;
}

/** These calls are the lower source boundaries, not inferred callbacks from
 * geometry or a serialized property name. Return values retain native AL. */
export interface NativeNavigationNotificationHost {
  constructString(text: string): NativeValue<NativeNavigationNotifyString>;
  destroyString(value: NativeNavigationNotifyString): NativeValue<void>;
  equalsNameString(name: NativeNavigationPropertyName, value: NativeNavigationNotifyString): NativeValue<number>;
  equalsNameChars(name: Point, text: string): NativeValue<number>;
  /** Engine304c46e0, including internal.GetEntity/valid-ID/Resolve/SetEntity. */
  getProxyEntity(proxy: OriginalEnclaveProxy): NativeValue<NativeLiveEntity | null>;
  constructProxy(): NativeValue<OriginalEnclaveProxy>;
  assignProxy(destination: OriginalEnclaveProxy, source: OriginalEnclaveProxy): NativeValue<void>;
  destroyProxy(proxy: OriginalEnclaveProxy): NativeValue<void>;
  hasPropertySet(entity: NativeLiveEntity, type: 8 | 10): NativeValue<number>;
  getPropertySet(entity: NativeLiveEntity, type: 6 | 8 | 10): NativeValue<object | null>;
  getPropertyOwner(set: object): NativeValue<NativeLiveEntity | null>;
  getNavigationOwner(properties: OriginalNavigationProperties): NativeValue<NativeLiveEntity | null>;
  registerDcc(set: object, dcc: NativeNavigationDCCHost): NativeValue<void>;
  deregisterDcc(set: object, dcc: NativeNavigationDCCHost | null): NativeValue<void>;
  /** GetEntityFlags and guarded Game201327e0 over the actual current flags. */
  contactNotificationsEnabled(entity: NativeLiveEntity): NativeValue<number>;
  constructContactIterator(type: 5 | 8 | 10): NativeValue<NativeNavigationContactIterator>;
  destroyContactIterator(iterator: NativeNavigationContactIterator): NativeValue<void>;
  /** Capture the receiver's vtable slot BEFORE iterator construction. Invoke
   * reads its current function after argument callbacks, using that same table. */
  captureContactSlot(receiver: NativeLiveEntity, phase: Phase): NativeValue<NativeNavigationContactSlot>;
  /** Original initialized-test/guard-first cached module/RTTI getter. */
  scriptAdmin(): NativeValue<NativeNavigationScriptAdmin | null>;
  captureAreaScriptSlot(admin: NativeNavigationScriptAdmin): NativeValue<NativeNavigationAreaScriptSlot>;
  /** Exact point ref-counter lookup and Routine setter branches. They are not
   * exercised by CurrentZone/StartPosition/LastUseablePosition attachment. */
  pointNotification(properties: OriginalNavigationProperties, phase: Phase, name: Point): NativeValue<void>;
  routineNotification(properties: OriginalNavigationProperties): NativeValue<void>;
}

function al(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('Actual original AL byte required');
  return value;
}

/** This is only the concrete virtual override between the outer and inherited
 * owner.Modified reads. The caller owns those two separate source rereads. */
export function nativeNavigationCustomNotification(properties: OriginalNavigationProperties,
  phase: Phase, property: string, host?: NativeNavigationNotificationHost): void {
  const controller = properties.wrapper.controller;
  const source = phase === 'enter' ? 'Game:20286d40' : 'Game:202873e0';
  const call = <T>(operation: string, invoke: (owner: NativeNavigationNotificationHost) => NativeValue<T>): T =>
    controller.effect(operation, source, () => host ? invoke(host) : undefined);
  const points: readonly Point[] = ['SleepingPoint', 'WorkingPoint', 'RelaxingPoint'];
  if (phase === 'enter') {
    for (const name of points) {
      if (al(call('Navigation false enter CString==chars ' + name, owner => owner.equalsNameChars(name, property))) !== 0) {
        properties.exact();
        call('Navigation false enter point ref-count ' + name, owner => owner.pointNotification(properties, phase, name));
      }
    }
    return;
  }
  const string = call('Navigation false exit temporary CString constructor', owner => owner.constructString(property));
  if (al(call('Navigation false exit CString==CString CurrentZoneEntityProxy', owner =>
    owner.equalsNameString('CurrentZoneEntityProxy', string))) !== 0) {
    properties.exact();
    const current = properties.proxies.get('CurrentZoneEntityProxy');
    const last = properties.proxies.get('LastZoneEntityProxy');
    if (!current || !last) throw new Error('Actual current/last Navigation proxies required');
    const get = (proxy: OriginalEnclaveProxy): NativeLiveEntity | null => {
      // Embedded proxies share the receiver's allocation. Independent
      // temporary proxies retain their own lifetime after it is destroyed.
      if (proxy === current || proxy === last) properties.exact();
      return call('Navigation proxy GetEntity', owner => owner.getProxyEntity(proxy));
    };
    // Pointer equality, not PropertyID equality. Each GetEntity may rebind the
    // actual internal reference and later calls deliberately reread it.
    const currentEntity = get(current), lastEntity = get(last);
    if (currentEntity !== lastEntity) {
      transition(last, 'exit');
      transition(current, 'enter');
    }

    function transition(proxy: OriginalEnclaveProxy, transitionPhase: Phase): void {
      if (get(proxy) === null) return;
      const temporary = call('Navigation area temporary proxy constructor', owner => owner.constructProxy());
      properties.exact(); //assignment reads the embedded source proxy anew.
      call('Navigation area temporary proxy assignment', owner => owner.assignProxy(temporary, proxy));
      if (get(temporary) !== null) {
        let type: 8 | 10 | null = null;
        const zoneEntity = get(temporary);
        if (zoneEntity === null) throw new Error('Source HasPropertySet dereferences its newly reread entity');
        if (al(call('Navigation area HasPropertySet8', owner => owner.hasPropertySet(zoneEntity, 8))) === 1) type = 8;
        else {
          const pathEntity = get(temporary);
          if (pathEntity === null) throw new Error('Source HasPropertySet dereferences its newly reread entity');
          if (al(call('Navigation area HasPropertySet10', owner => owner.hasPropertySet(pathEntity, 10))) === 1) type = 10;
        }
        if (type !== null) {
          const capturedEntity = get(temporary);
          if (capturedEntity === null) throw new Error('Source area property getter dereferences its reread entity');
          const set = call('Navigation area GetPropertySet' + type, owner => owner.getPropertySet(capturedEntity, type));
          if (set === null) throw new Error('Source area property-set pointer is dereferenced without a NULL check');
          properties.exact(); //next source read of Navigation's cached DCC.
          if (transitionPhase === 'exit') {
            // Source calls this even when Navigation's cached DCC is NULL.
            call('Navigation area DeregisterDCCPS', owner => owner.deregisterDcc(set, properties.state.dynamicCollisionCircle));
          } else {
            let dcc = properties.state.dynamicCollisionCircle;
            if (dcc === null) {
              const actor = navigationOwner();
              if (actor === null) throw new Error('Source actor property getter requires its actual owner');
              const object = call('Navigation owner GetPropertySet6', owner => owner.getPropertySet(actor, 6));
              // Preserve the actual PS pointer BEFORE asking its operation
              // host to register it. This cast retains pointer storage only;
              // it does not establish that its DCC callbacks are available.
              dcc = object as NativeNavigationDCCHost | null;
              properties.exact(); //actual pointer store requires a live PS.
              properties.state.dynamicCollisionCircle = dcc;
              controller.write('Navigation cached DCC pointer store', type === 8 ? 'Game:202876ee' : 'Game:202877d0');
            }
            if (dcc !== null) call('Navigation area RegisterDCCPS', owner => owner.registerDcc(set, dcc));
          }
          const areaOwner = call('Navigation area virtual GetEntity for flags', owner => owner.getPropertyOwner(set));
          if (areaOwner === null) throw new Error('Source area flags dereference requires its actual owner');
          if (al(call('Navigation area flags notification helper', owner => owner.contactNotificationsEnabled(areaOwner))) === 1) {
            const receiver = call('Navigation area fresh virtual GetEntity for contact', owner => owner.getPropertyOwner(set));
            if (receiver === null) throw new Error('Source contact receiver requires its actual owner');
            const target = call('Navigation area captured contact vtable slot', owner => owner.captureContactSlot(receiver, transitionPhase));
            const iterator = call('Navigation area contact iterator constructor5', owner => owner.constructContactIterator(5));
            const other = navigationOwner();
            call('Navigation area contact virtual', () => target.invoke(other, iterator));
            call('Navigation area contact iterator destructor', owner => owner.destroyContactIterator(iterator));
          }
          const actorForFlags = navigationOwner();
          if (actorForFlags === null) throw new Error('Source actor flags dereference requires its actual owner');
          if (al(call('Navigation actor flags notification helper', owner => owner.contactNotificationsEnabled(actorForFlags))) === 1) {
            const receiver = navigationOwner();
            if (receiver === null) throw new Error('Source actor contact receiver requires its actual owner');
            const target = call('Navigation actor captured contact vtable slot', owner => owner.captureContactSlot(receiver, transitionPhase));
            const iterator = call('Navigation actor contact iterator constructor' + type, owner => owner.constructContactIterator(type));
            const other = get(temporary);
            call('Navigation actor contact virtual', () => target.invoke(other, iterator));
            call('Navigation actor contact iterator destructor', owner => owner.destroyContactIterator(iterator));
          }
          const admin = call('Navigation area ScriptAdmin getter', owner => owner.scriptAdmin());
          if (admin !== null) {
            const name = call('Navigation area script CString constructor', owner =>
              owner.constructString(transitionPhase === 'enter' ? 'OnEnterArea' : 'OnLeaveArea'));
            const target = call('Navigation captured ScriptAdmin virtualBC slot', owner => owner.captureAreaScriptSlot(admin));
            // Native evaluates proxy GetEntity before the fresh actor owner.
            const other = get(temporary), self = navigationOwner();
            call('Navigation area script virtualBC(self,other,0)', () => target.invoke(name, self, other, 0));
            call('Navigation area script CString destructor', owner => owner.destroyString(name));
          }
        }
      }
      call('Navigation area temporary proxy destructor', owner => owner.destroyProxy(temporary));
    }
    function navigationOwner(): NativeLiveEntity | null {
      properties.exact();
      return call('Navigation fresh virtual GetEntity', owner => owner.getNavigationOwner(properties));
    }
  }
  if (al(call('Navigation false exit CString==CString Routine', owner => owner.equalsNameString('Routine', string))) !== 0) {
    properties.exact();
    call('Navigation false exit Routine point setters', owner => owner.routineNotification(properties));
  }
  for (const name of points) {
    if (al(call('Navigation false exit CString==CString ' + name, owner => owner.equalsNameString(name, string))) !== 0) {
      properties.exact();
      call('Navigation false exit point ref-count/cache ' + name, owner => owner.pointNotification(properties, phase, name));
    }
  }
  call('Navigation false exit temporary CString destructor', owner => owner.destroyString(string));
}
