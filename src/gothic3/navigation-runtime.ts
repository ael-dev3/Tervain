/** Original-PE navigation registration and processing-range lifecycle.
 *
 * These are world/property-set identities, never renderer objects or a radius
 * selected by the browser. Native nav-scene/PVS construction and character
 * movement/physics remain explicit host dependencies. A partial callback records
 * its already-applied prefix; callers must not label it a completed activation.
 * All spatial values here are original float32 centimetres, without a floating
 * origin. JS arithmetic is not asserted to emulate x87 extended precision.
 */
import rulesText from '../../assets/gothic3/navigation/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';

const GAME_SHA = 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f';
const ENGINE_SHA = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3';
const rules = JSON.parse(rulesText) as {
  schema: string; inputs: { Game: string; Engine: string };
  navigationConstructor: { processingDataOffset: string; inProcessingRange: boolean; enabled: boolean };
  range: { installedBaseRadiusCm: number; movementPaddingCm: number; dynamicRequiredFlags: number;
    staticRequiredFlags: number; excludedFlags: number; canDeactivateFlag: number; enteredFlag: number };
};
if (rules.schema !== 'gothic3-navigation-runtime-rules-v1' || rules.inputs.Game !== GAME_SHA ||
    rules.inputs.Engine !== ENGINE_SHA || rules.navigationConstructor.processingDataOffset !== '0x1e1' ||
    rules.navigationConstructor.inProcessingRange !== false || rules.navigationConstructor.enabled !== true ||
    rules.range.installedBaseRadiusCm !== 4000 || rules.range.movementPaddingCm !== 250 ||
    rules.range.dynamicRequiredFlags !== 0x100108 || rules.range.staticRequiredFlags !== 0x100100 ||
    rules.range.excludedFlags !== 0x40 || rules.range.canDeactivateFlag !== 0x20 || rules.range.enteredFlag !== 0x80) {
  throw new Error('Unsupported original navigation rule receipt');
}

export type NativePositionCm = readonly [number, number, number];
/** Captured GetWorldPosition storage, not a snapshot or a new entity lookup.
 * EnterEx observers can mutate its contents before the native vector copy. */
export interface NativeVectorReference { read(): NativeValue<NativePositionCm> }
export interface NativeBoxCm { readonly min: NativePositionCm; readonly max: NativePositionCm }
/** A host-owned original entity identity. Reusing a GUID does not preserve its
 * object identity across destruction/recreation. The host resolves live facts. */
export interface NativeNavigationEntity { readonly id: string }
export interface NativeNavigationState {
  /** Diagnostic ID; the registry compares this state object itself. */
  readonly id: string;
  entity: NativeNavigationEntity | null;
  /** eCEntityPropertySet base validity needs its constructor/create/read host. */
  baseValidity: NativeValue<boolean>;
  startPositionCm: NativePositionCm;
  lastUseableNavigationPositionCm: NativeValue<NativePositionCm>;
  currentZoneId: string | null;
  lastZoneId: string | null;
  lastUseableZoneId: string | null;
  /** Exact live gCNavigation_PS data byte+0x1e1, object byte+0x1e5. */
  inProcessingRange: boolean;
  floorDetectionFailed: boolean;
  enabled: boolean;
  /** Native cached pointers: constructor/Invalidate clears both. Range entry
   * reads them directly; it MUST NOT invoke the lazy GetCharacterMovement. */
  characterMovement: NativeNavigationMovementHost | null;
  dynamicCollisionCircle: NativeNavigationDCCHost | null;
  /** Unnamed source fields are kept at their data offsets, not relabelled. */
  fields: { '0x188': number; '0x204': boolean; '0x205': boolean;
    '0x238': string | null; '0x24c': boolean };
}

function position(value: NativePositionCm, label: string): NativePositionCm {
  if (value.length !== 3 || value.some((n) => !Number.isFinite(n) || Math.fround(n) !== n)) {
    throw new Error(label + ' must contain three finite native float32 centimetres.');
  }
  return Object.freeze([value[0], value[1], value[2]] as const);
}
function box(value: NativeBoxCm, label: string): NativeBoxCm {
  const min = position(value.min, label + '.min'), max = position(value.max, label + '.max');
  if (min.some((n, i) => n > max[i]!)) throw new Error(label + ' has inverted bounds.');
  return Object.freeze({ min, max });
}
function flags(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Native entity flags require uint32.');
  return value;
}
/** Constructor subset proven by Game20289960 -> Invalidate20286e50. Serialized
 * navigation properties must subsequently be hydrated by the real property
 * reader; this function does not reconstruct those values from mesh placement. */
export function createNativeNavigationState(id: string, entity: NativeNavigationEntity | null = null): NativeNavigationState {
  if (!id) throw new Error('Navigation identity is required.');
  return { id, entity, baseValidity: { known: false, reason: 'Base property-set create/read validity is not inferred from navigation registration.' },
    startPositionCm: Object.freeze([0, 0, 0]),
    lastUseableNavigationPositionCm: { known: false,
      reason: 'The original default bCVector constructor leaves this storage uninitialized until read/add.' },
    currentZoneId: null, lastZoneId: null, lastUseableZoneId: null,
    inProcessingRange: false, floorDetectionFailed: false, enabled: true,
    characterMovement: null, dynamicCollisionCircle: null,
    fields: { '0x188': 0, '0x204': false, '0x205': false, '0x238': null, '0x24c': false } };
}

/** Both arrays are independent in the original; registering in ROI does not
 * imply membership in allPS. No implicit cache invalidation or range changes. */
export class NativeNavigationRegistry {
  private readonly all: NativeNavigationState[] = [];
  private readonly roi: NativeNavigationState[] = [];
  get navigationPS(): readonly NativeNavigationState[] { return Object.freeze([...this.all]); }
  get navigationPSInROI(): readonly NativeNavigationState[] { return Object.freeze([...this.roi]); }
  registerNavigationPS(state: NativeNavigationState): 0 | 1 { return this.append(this.all, state); }
  deregisterNavigationPS(state: NativeNavigationState): 0 | 1 { return this.remove(this.all, state); }
  registerNavigationPSInROI(state: NativeNavigationState): 0 | 1 { return this.append(this.roi, state); }
  deregisterNavigationPSInROI(state: NativeNavigationState): 0 | 1 { return this.remove(this.roi, state); }
  private append(list: NativeNavigationState[], state: NativeNavigationState): 0 | 1 {
    if (list.lastIndexOf(state) >= 0) return 0;
    list.push(state);
    return 1;
  }
  private remove(list: NativeNavigationState[], state: NativeNavigationState): 0 | 1 {
    const index = list.lastIndexOf(state);
    if (index < 0) return 0;
    list.splice(index, 1);
    return 1;
  }
}

export interface NativeNavigationMovementHost {
  getGoalReached(a: false, b: false, c: false): NativeValue<boolean>;
  stopMovement(): NativeValue<void>;
  resetIsProcessing(): NativeValue<void>;
}
export interface NativeNavigationDCCHost {
  destroyCollisionCirclePSObject(): NativeValue<void>;
  setEnabled(value: boolean): NativeValue<void>;
}
export interface NativeNavigationLifecycleHost {
  /** Exact comparison of original gCGameApp virtual+0x270 result to1. */
  applicationMode270EqualsOne(): NativeValue<boolean>;
  isTemplate(entity: NativeNavigationEntity): NativeValue<boolean>;
  worldPositionRef(entity: NativeNavigationEntity): NativeValue<NativeVectorReference>;
  /** Native gCNavigationMap::GetZone(position,ID,isPath,false,true,-1.0).
   * null means a proven empty PropertyID, not an unavailable nav map. */
  findZoneAt(positionCm: NativePositionCm, a: false, b: true, distance: -1): NativeValue<string | null>;
  notifyProperty(state: NativeNavigationState, phase: 'enter' | 'exit',
    name: 'StartPosition' | 'CurrentZoneEntityProxy' | 'LastUseableNavigationPosition', value: false): NativeValue<void>;
  propertySetBaseCallback(state: NativeNavigationState, phase: 'added' | 'removed'): NativeValue<void>;
  /** Native Entity.GetPropertySet(type21), used ONLY by the lazy getter. */
  findCharacterMovementPS(entity: NativeNavigationEntity): NativeValue<NativeNavigationMovementHost | null>;
  /** Source PS type45, mode at+0x58; null means property is genuinely absent. */
  characterControlMode(state: NativeNavigationState): NativeValue<number | null>;
  /** Required only for an entity in mode1 with character movement. This must
   * execute the full source floor/reposition/restore-or-reset tail, including
   * all observers. A generic browser-ground snap is not this implementation. */
  enterCharacterRangeTail?: (state: NativeNavigationState, movement: NativeNavigationMovementHost) => NativeValue<void>;
}
export type NativeNavigationOperation =
  | { outcome: 'complete'; returnValue: 0 | 1 | null; applied: readonly string[]; attempted: readonly string[] }
  | { outcome: 'unsupported' | 'partial'; returnValue: null; applied: readonly string[];
      /** A failed/unknown callback may already have performed its own prefix. */
      attempted: readonly string[]; required: string };
class MissingNavigationFact extends Error {}
function fact<T>(value: NativeValue<T>, label: string): T {
  if (!value.known) throw new MissingNavigationFact(label + ': ' + value.reason);
  return value.value;
}
function mutation<T>(body: () => NativeValue<T>, label: string, attempted: string[]): T {
  attempted.push(label);
  return fact(body(), label);
}
/** Callbacks preserve native effect order, including effects preceding an
 * unresolved host boundary. Use a detached host draft if atomicity is required.
 * After partial failure inspect the recorded prefix; do not blindly replay it. */
export class NativeNavigationLifecycle {
  constructor(readonly registry: NativeNavigationRegistry, readonly host: NativeNavigationLifecycleHost) {}
  private run(body: (applied: string[], attempted: string[]) => 0 | 1 | null): NativeNavigationOperation {
    const applied: string[] = [], attempted: string[] = [];
    try { return { outcome: 'complete', returnValue: body(applied, attempted),
      applied: Object.freeze(applied), attempted: Object.freeze(attempted) }; }
    catch (error) {
      return { outcome: applied.length || attempted.length ? 'partial' : 'unsupported', returnValue: null,
        applied: Object.freeze(applied), attempted: Object.freeze(attempted),
        required: error instanceof Error ? error.message : String(error) };
    }
  }
  private notify(state: NativeNavigationState, phase: 'enter' | 'exit',
    name: 'StartPosition' | 'CurrentZoneEntityProxy' | 'LastUseableNavigationPosition',
    applied: string[], attempted: string[]): void {
    mutation(() => this.host.notifyProperty(state, phase, name, false), name + '.' + phase, attempted);
    applied.push(name + '.' + phase);
  }
  private register(state: NativeNavigationState, applied: string[], attempted: string[]): 0 | 1 {
    const result = this.registry.registerNavigationPS(state);
    if (!result) return 0;
    applied.push('allPS.append');
    if (!fact(this.host.applicationMode270EqualsOne(), 'application virtual270')) return 1;
    if (!state.entity) throw new MissingNavigationFact('RegisterNavigationPS requires its live entity in mode1.');
    const source = fact(this.host.worldPositionRef(state.entity), 'world-position pointer');
    const world = position(fact(source.read(), 'world position'), 'world position');
    const zone = fact(this.host.findZoneAt(world, false, true, -1), 'compiled navigation zone lookup');
    state.lastZoneId = null;
    applied.push('LastZoneEntityProxy=null');
    state.lastUseableZoneId = null;
    applied.push('LastUseableNavigationZoneID=empty');
    this.notify(state, 'enter', 'CurrentZoneEntityProxy', applied, attempted);
    state.currentZoneId = zone;
    applied.push('CurrentZoneEntityProxy.write');
    this.notify(state, 'exit', 'CurrentZoneEntityProxy', applied, attempted);
    if (state.startPositionCm.every((n) => n === 0)) {
      // Native getter occurs again after CurrentZone observers; do not reuse it.
      if (!state.entity) throw new MissingNavigationFact('CurrentZone observers invalidated the live entity.');
      const start = fact(this.host.worldPositionRef(state.entity), 'live start-position pointer');
      this.notify(state, 'enter', 'StartPosition', applied, attempted);
      state.startPositionCm = position(fact(start.read(), 'start position after EnterEx'), 'start position');
      applied.push('StartPosition.write');
      this.notify(state, 'exit', 'StartPosition', applied, attempted);
    }
    return 1;
  }
  registerNavigationPS(state: NativeNavigationState): NativeNavigationOperation {
    return this.run((applied, attempted) => this.register(state, applied, attempted));
  }
  onPropertySetAdded(state: NativeNavigationState): NativeNavigationOperation {
    return this.run((applied, attempted) => {
      if (!state.entity) throw new MissingNavigationFact('OnPropertySetAdded requires a live entity.');
      if (!fact(this.host.isTemplate(state.entity), 'template RTTI')) this.register(state, applied, attempted);
      if (!state.entity) throw new MissingNavigationFact('Property observers invalidated the entity.');
      const source = fact(this.host.worldPositionRef(state.entity), 'last usable-position pointer');
      this.notify(state, 'enter', 'LastUseableNavigationPosition', applied, attempted);
      state.lastUseableNavigationPositionCm = { known: true,
        value: position(fact(source.read(), 'last usable position after EnterEx'), 'last usable position') };
      applied.push('LastUseableNavigationPosition.write');
      this.notify(state, 'exit', 'LastUseableNavigationPosition', applied, attempted);
      mutation(() => this.host.propertySetBaseCallback(state, 'added'), 'base OnPropertySetAdded', attempted);
      applied.push('base.OnPropertySetAdded');
      return null;
    });
  }
  onPropertySetRemoved(state: NativeNavigationState): NativeNavigationOperation {
    return this.run((applied, attempted) => {
      if (state.inProcessingRange) {
        this.registry.deregisterNavigationPSInROI(state);
        applied.push('ROI.remove');
      }
      if (!state.entity) throw new MissingNavigationFact('OnPropertySetRemoved requires live template RTTI.');
      if (!fact(this.host.isTemplate(state.entity), 'template RTTI')) {
        this.registry.deregisterNavigationPS(state);
        applied.push('allPS.remove');
      }
      // Removal itself does NOT clear native byte1e1 or invoke range-exit.
      mutation(() => this.host.propertySetBaseCallback(state, 'removed'), 'base OnPropertySetRemoved', attempted);
      applied.push('base.OnPropertySetRemoved');
      return null;
    });
  }
  onEnterProcessingRange(state: NativeNavigationState): NativeNavigationOperation {
    return this.run((applied, attempted) => {
      if (!state.inProcessingRange) {
        this.registry.registerNavigationPSInROI(state);
        applied.push('ROI.append-if-absent');
      }
      state.inProcessingRange = true;
      applied.push('byte1e1=1');
      state.floorDetectionFailed = false;
      applied.push('byte1e2=0');
      state.fields['0x238'] = null;
      applied.push('PropertyID238=empty');
      state.fields['0x24c'] = false;
      applied.push('byte24c=0');
      if (!state.entity || !fact(this.host.applicationMode270EqualsOne(), 'application virtual270')) return null;
      const movement = state.characterMovement;
      if (!movement) return null;
      if (!this.host.enterCharacterRangeTail) {
        throw new MissingNavigationFact('Original floor detection/repositioning and movement restore/Reset(false,true,true) tail is required.');
      }
      mutation(() => this.host.enterCharacterRangeTail!(state, movement), 'full character range-entry tail', attempted);
      applied.push('character range-entry tail');
      return null;
    });
  }
  onExitProcessingRange(state: NativeNavigationState): NativeNavigationOperation {
    return this.run((applied, attempted) => {
      if (state.inProcessingRange) {
        this.registry.deregisterNavigationPSInROI(state);
        applied.push('ROI.remove');
        state.fields['0x188'] = 0;
        applied.push('dword188=0');
      }
      state.inProcessingRange = false;
      applied.push('byte1e1=0');
      const dcc = state.dynamicCollisionCircle;
      if (dcc) {
        mutation(() => dcc.destroyCollisionCirclePSObject(), 'DestroyCollisionCirclePSObject', attempted);
        applied.push('DCC.DestroyCollisionCirclePSObject');
      }
      if (!state.entity || !fact(this.host.applicationMode270EqualsOne(), 'application virtual270')) return null;
      const movement = state.characterMovement;
      if (!movement) return null;
      state.fields['0x205'] = !fact(movement.getGoalReached(false, false, false), 'GetGoalReached');
      applied.push('byte205=!GoalReached');
      if (fact(this.host.characterControlMode(state), 'character-control mode') === 9) {
        state.fields['0x205'] = false;
        applied.push('byte205=0(mode9)');
      }
      const movementForStop = state.characterMovement;
      if (!movementForStop) throw new MissingNavigationFact('Native cached movement pointer became null before StopMovement.');
      mutation(() => movementForStop.stopMovement(), 'StopMovement', attempted);
      applied.push('StopMovement');
      const movementForReset = state.characterMovement;
      if (!movementForReset) throw new MissingNavigationFact('Native cached movement pointer became null before ResetIsProcessing.');
      mutation(() => movementForReset.resetIsProcessing(), 'ResetIsProcessing', attempted);
      applied.push('ResetIsProcessing');
      return null;
    });
  }
  setEnabled(state: NativeNavigationState, value: boolean): NativeNavigationOperation {
    return this.run((applied, attempted) => {
      state.enabled = value;
      applied.push('byte250=Enabled');
      const dcc = state.dynamicCollisionCircle;
      if (dcc) {
        mutation(() => dcc.setEnabled(value), 'DCC.SetEnabled', attempted);
        applied.push('DCC.SetEnabled');
      }
      return null;
    });
  }
  /** Game2000a74a/2001d007: raw cached-pointer setters, without notifications. */
  setCharacterMovement(state: NativeNavigationState, movement: NativeNavigationMovementHost | null): void {
    state.characterMovement = movement;
  }
  setDCC(state: NativeNavigationState, dcc: NativeNavigationDCCHost | null): void { state.dynamicCollisionCircle = dcc; }
  getDCC(state: NativeNavigationState): NativeNavigationDCCHost | null { return state.dynamicCollisionCircle; }
  /** Game200216c5: look up PS21 only if cached pointer is null. A returned null
   * is not cached as a populated marker: the next getter performs lookup again. */
  getCharacterMovement(state: NativeNavigationState): NativeValue<NativeNavigationMovementHost | null> {
    if (state.characterMovement) return { known: true, value: state.characterMovement };
    if (!state.entity) return { known: false, reason: 'Lazy GetCharacterMovement requires a live entity.' };
    const movement = this.host.findCharacterMovementPS(state.entity);
    if (movement.known) state.characterMovement = movement.value;
    return movement;
  }
}

export interface NativeEnclaveCacheHost<Proxy> {
  npcEnclaveId(entity: NativeNavigationEntity): NativeValue<string | null>;
  createProxy(entity: NativeNavigationEntity): NativeValue<Proxy>;
  resolveProxy(proxy: Proxy): NativeValue<NativeNavigationEntity | null>;
}
/** Original cached GetMembers/BuildMemberList. Empty is NOT a populated marker:
 * empty GetMembers repeats the registry scan. Nonempty caches survive registry
 * edits, property changes and unresolved/dead proxies until explicitly rebuilt. */
export class NativeEnclaveMemberCache<Proxy> {
  private entries: Proxy[] = [];
  constructor(readonly enclaveEntityId: string, readonly registry: NativeNavigationRegistry,
    readonly host: NativeEnclaveCacheHost<Proxy>) {
    if (!/^[0-9a-f]{40}$/.test(enclaveEntityId)) {
      throw new Error('Enclave requires its canonical lower-case20byte native PropertyID.');
    }
  }
  buildMemberList(force: boolean): NativeValue<void> {
    try {
      // Missing host facts are not native values. Preflight the detached result
      // instead of destructively treating unknowns as absent NPCs/entities.
      const next = force ? [] : [...this.entries];
      for (const navigation of this.registry.navigationPS) {
        const entity = navigation.entity;
        if (!entity) continue;
        const enclave = fact(this.host.npcEnclaveId(entity), 'NPC.Enclave');
        if (enclave !== null && !/^[0-9a-f]{40}$/.test(enclave)) {
          throw new MissingNavigationFact('NPC.Enclave requires a canonical lower-case20byte PropertyID.');
        }
        if (enclave !== this.enclaveEntityId) continue;
        let duplicate = false;
        for (const proxy of next) {
          if (fact(this.host.resolveProxy(proxy), 'cached entity proxy') === entity) { duplicate = true; break; }
        }
        if (!duplicate) next.push(fact(this.host.createProxy(entity), 'create entity proxy'));
      }
      this.entries = next;
      return { known: true, value: undefined };
    } catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }
  getMembers(): NativeValue<readonly (NativeNavigationEntity | null)[]> {
    if (this.entries.length < 1) {
      const result = this.buildMemberList(false);
      if (!result.known) return result;
    }
    try { return { known: true, value: Object.freeze(this.entries.map((proxy) =>
      fact(this.host.resolveProxy(proxy), 'cached entity proxy'))) }; }
    catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }
  get cachedProxyCount(): number { return this.entries.length; }
}

/** Engine30024ff5: inclusive AABB intersection. No spherical-distance shortcut. */
export function nativeProcessingBoxesIntersect(entity: NativeBoxCm, region: NativeBoxCm): boolean {
  const a = box(entity, 'entity WorldNodeBoundary'), b = box(region, 'processing region');
  return a.min.every((n, i) => n <= b.max[i]! && b.min[i]! <= a.max[i]!);
}
export interface NativeProcessingRegionUpdate {
  readonly rebuilt: boolean;
  readonly region: NativeBoxCm;
  readonly oldRegion: NativeBoxCm;
  /** First old sphere was cleared to radius=-FLT_MAX, so its box is inverted. */
  readonly oldRegionValid: boolean;
}
/** Engine3002d0bf stored sphere/box geometry and250cm strict hysteresis.
 * Candidate enumeration and its PVS order are supplied separately, not guessed.
 * Radius is a required effective configuration value;4000 is recorded base INI,
 * not a hard-coded replacement for overrides. Force before first candidate pass. */
export class NativeProcessingRegion {
  private center: NativePositionCm = Object.freeze([0, 0, 0]);
  private current: NativeBoxCm | null = null;
  private previous: NativeBoxCm = Object.freeze({
    min: Object.freeze([3.4028234663852886e38, 3.4028234663852886e38, 3.4028234663852886e38] as const),
    max: Object.freeze([-3.4028234663852886e38, -3.4028234663852886e38, -3.4028234663852886e38] as const),
  });
  update(cameraPositionCm: NativePositionCm, effectiveRadiusCm: number, force: boolean): NativeProcessingRegionUpdate {
    const camera = position(cameraPositionCm, 'camera position');
    if (!Number.isFinite(effectiveRadiusCm) || effectiveRadiusCm < 0 || Math.fround(effectiveRadiusCm) !== effectiveRadiusCm) {
      throw new Error('Effective Entity.ROI must be a finite nonnegative native float32 radius.');
    }
    const delta = camera.map((n, i) => Math.fround(this.center[i]! - n));
    // SharedBase1002e700 stores the squared sum to float32 BEFORE sqrt, then
    // stores sqrt's result to float32; preserving both stores matters at250cm.
    const squared = Math.fround(delta[2]! * delta[2]! + delta[0]! * delta[0]! + delta[1]! * delta[1]!);
    const moved = Math.fround(Math.sqrt(squared));
    const rebuilt = moved > 250 || force;
    if (rebuilt) {
      const radius = Math.fround(effectiveRadiusCm + 250);
      const next = box({ min: camera.map((n) => Math.fround(n - radius)) as unknown as NativePositionCm,
        max: camera.map((n) => Math.fround(n + radius)) as unknown as NativePositionCm }, 'expanded processing region');
      if (this.current) this.previous = this.current;
      this.center = camera;
      this.current = next;
    }
    if (!this.current) throw new Error('Initial native processing box is uninitialized; force a full ROI update.');
    return Object.freeze({ rebuilt, region: this.current, oldRegion: this.previous,
      oldRegionValid: this.previous.min.every((n, i) => n <= this.previous.max[i]!) });
  }
}

export type NativeProcessingTransition = 'enter' | 'exit' | 'none';
/** Proven Engine dynamic/dirty decision. The flag byte0x80 belongs to the entity
 * and is distinct from Navigation_PS byte1e1. Unknown original boundaries must
 * block callers; never substitute render bounds or distance to the player. */
export function nativeDynamicProcessingTransition(entityFlags: number, worldNodeBoundary: NativeBoxCm,
  region: NativeBoxCm): NativeProcessingTransition {
  const bits = flags(entityFlags);
  const eligible = (bits & 0x100108) === 0x100108 && (bits & 0x40) === 0 &&
    ((bits & 0x20) === 0 || nativeProcessingBoxesIntersect(worldNodeBoundary, region));
  const entered = (bits & 0x80) !== 0;
  return eligible ? (entered ? 'none' : 'enter') : (entered ? 'exit' : 'none');
}
/** Static cull classifications are native:0=outside,1=fullyinside,2=intersecting.
 * This function does not manufacture those classifications from visible cells. */
export function nativeStaticProcessingTransition(entityFlags: number, worldNodeBoundary: NativeBoxCm,
  region: NativeBoxCm, cull: 0 | 1 | 2): NativeProcessingTransition {
  const bits = flags(entityFlags);
  const eligible = (bits & 0x100100) === 0x100100 && (bits & 0x40) === 0 && cull !== 0 &&
    (cull === 1 || nativeProcessingBoxesIntersect(worldNodeBoundary, region));
  const entered = (bits & 0x80) !== 0;
  return eligible ? (entered ? 'none' : 'enter') : (entered ? 'exit' : 'none');
}

export interface NativeProcessingQueueHost {
  /** Caller supplies complete original entity callbacks: physics/content and
   * every property-set enter/exit in source order, including navigation. */
  exit(entity: NativeNavigationEntity, recursive: false): NativeValue<void>;
  enter(entity: NativeNavigationEntity, recursive: false): NativeValue<void>;
  liveEntityFlags(entity: NativeNavigationEntity): NativeValue<number>;
}
/** Original processing queue order: exits precede all enters; enter rereads the
 * live0x100 eligibility bit after exits. Does not set entity flags independently
 * of callbacks or claim that its supplied candidates cover the whole world. */
export function dispatchNativeProcessingQueues(exits: readonly NativeNavigationEntity[],
  enters: readonly NativeNavigationEntity[], host: NativeProcessingQueueHost): NativeNavigationOperation {
  const applied: string[] = [], attempted: string[] = [];
  try {
    if (enters.some((entity) => exits.includes(entity))) throw new MissingNavigationFact('Entity appears in both native enter and exit queues.');
    for (const entity of exits) {
      mutation(() => host.exit(entity, false), entity.id + '.ExitProcessingRange', attempted);
      applied.push('exit:' + entity.id);
    }
    for (const entity of enters) {
      if ((flags(fact(host.liveEntityFlags(entity), entity.id + '.flags')) & 0x100) === 0) continue;
      mutation(() => host.enter(entity, false), entity.id + '.EnterProcessingRange', attempted);
      applied.push('enter:' + entity.id);
    }
    return { outcome: 'complete', returnValue: null, applied: Object.freeze(applied), attempted: Object.freeze(attempted) };
  } catch (error) {
    return { outcome: applied.length || attempted.length ? 'partial' : 'unsupported', returnValue: null,
      applied: Object.freeze(applied), attempted: Object.freeze(attempted),
      required: error instanceof Error ? error.message : String(error) };
  }
}
