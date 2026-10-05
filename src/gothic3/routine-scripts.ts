/** Original installed Script_Game routine/state bodies.
 *
 * The scheduler, frames and property value objects are the live shared objects.
 * Missing engine operations fail at their native call boundary, preserving the
 * preceding writes. The supported branch profiles below are deliberate: this
 * is not an implementation of every registered AI/player state.
 */
import rulesText from '../../assets/gothic3/routine-scripts/runtime-rules.json?raw';
import { OriginalEntityPropertySet } from './native-properties';
import type { NativeValue } from './dialogue';
import type { NativeInstructionHost, NativeScriptBody } from './script-instructions';
import { NativeInstructionScheduler } from './script-instructions';
import type { NativeInventory } from './inventory';
import type { NativeAIStateFrame, NativeRoutineEntity, NativeRoutineHost, NativeRoutineProperties,
  NativeRoutineResult, NativeSPUSchedulerAccess } from './script-routine';
import type { NativeScriptProcessingUnit } from './script-routine';

const SHA = '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1';
const rules = JSON.parse(rulesText) as { schema: string; scriptGameSha256: string;
  labels: Record<string, { mask: string; counter: string; labels: string[] }>; supportedBodies: Record<string, string>;
  fightPairs: readonly (readonly [number, number, number])[] };
if (rules.schema !== 'gothic3-routine-scripts-rules-v1' || rules.scriptGameSha256 !== SHA) {
  throw new Error('Original routine script receipt differs');
}
function fact<T>(value: NativeValue<T> | undefined, name: string): T {
  if (!value || !value.known) throw new Error(name + ': ' + (value?.reason ?? 'original dependency is unresolved'));
  return value.value;
}
function i32(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new Error(name + ' is not the original signed32 value');
  }
  return value;
}
function bool(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new Error(name + ' is not a known native boolean');
  return value;
}
function byte(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255) throw new Error(name + ' needs its AL byte');
  return value;
}
function success(result: NativeRoutineResult): void { if (!result.supported) throw new Error(result.reason); }

/** Script100204a0/Game2002c04d: absent NPC wrapper returns0; otherwise every
 * requested bit must be present in the live NPC DWORD+0x178. Mask0 returns1. */
export function nativeRoutineHasStatusEffects(npcStatusWord: NativeValue<number> | null, mask: number): NativeValue<number> {
  try {
    if (!Number.isInteger(mask) || mask < 0 || mask > 0xffffffff) throw new Error('Status mask is not uint32');
    if (npcStatusWord === null) return { known: true, value: 0 };
    const value = fact(npcStatusWord, 'live NPC DWORD+0x178');
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('NPC status word is not uint32');
    return { known: true, value: ((value & mask) >>> 0) === mask ? 1 : 0 };
  } catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
}

export type NativeScriptValues = Record<string, unknown>;
export interface NativeScriptActor {
  readonly entity: NativeRoutineEntity;
  /** Exact captured PS and value-storage identities; no cloned routine store. */
  readonly routine: OriginalEntityPropertySet<NativeRoutineProperties & NativeScriptValues> | null;
  readonly npc: OriginalEntityPropertySet<NativeScriptValues> | null;
  readonly playerMemory: OriginalEntityPropertySet<NativeScriptValues> | null;
  /** These readers belong to the captured wrapper's PS pointers. They must not
   * re-resolve a replacement PS by entity ID. Values behind each PS remain live. */
  navigationValid(): NativeValue<boolean>;
  hasStatusEffects(mask: number): NativeValue<number>;
}
export type NativeRoutineEngineOperation =
  | { kind: 'player-reset-action-queue'; entity: string; helper: '1000ecc0' }
  | { kind: 'player-control-flag'; entity: string; value: false; helper: '10009520' }
  | { kind: 'look-at-target' | 'alignment-target'; entity: string; target: null }
  | { kind: 'movement-constraints'; entity: string; degrees: 0 | 360 }
  | { kind: 'cross-hair'; visible: false }
  | { kind: 'auto-aiming'; entity: string; enabled: false; target: null; animation: '' }
  | { kind: 'dcc-enabled'; entity: string; enabled: true }
  | { kind: 'collision-group'; entity: string; group: 3 | 4 | 5 | 16 }
  | { kind: 'strip-enabled'; entity: string; enabled: false }
  | { kind: 'revert-playing-animation'; entity: string; milliseconds: 100 }
  | { kind: 'stop-runtime-effect'; entity: string; name: 'eff_ani_fight_bow_raise_01' | 'eff_magic_parade_shield_01'; fade: false }
  | { kind: 'current-target'; entity: string; target: null }
  | { kind: 'camera-mode'; mode: 2; firstFlag: true; secondFlag: true }
  | { kind: 'focus-entity'; entity: string; target: null }
  | { kind: 'focus-property'; entity: string; property: 'CurrentMode' | 'EnableRangeRating' | 'FocusLookAtMode'; value: number | false };
/** Narrow original engine boundaries. These effects are not replaced by browser
 * UI or invented scalar assignments. A host must supply native-equivalent
 * implementations; unknown values stop execution at the ordered call boundary. */
export interface NativeRoutineScriptHost {
  actor(id: string): NativeValue<NativeScriptActor | null>;
  playerId(): NativeValue<string | null>;
  applicationMode(slot: 0x26c | 0x270): NativeValue<number>;
  entityProcessingEnabled(): boolean;
  engine(operation: NativeRoutineEngineOperation, spu: NativeScriptProcessingUnit): NativeValue<void>;
  heldItem(actor: NativeScriptActor, slot: 1 | 2): NativeValue<{ id: string; useType(): NativeValue<number> } | null>;
  currentDestination(actor: NativeScriptActor): NativeValue<string | null>;
  /** Exact original fight table102203e4 lookup, not a use-type heuristic. */
  fightCategory(actor: NativeScriptActor): NativeValue<number>;
  /** One existing inventory instance. No copied stack state is mutated here. */
  inventory?(actor: NativeScriptActor): NativeValue<NativeInventory | null>;
  weaponSelection?: NativeWeaponSelection;
  isTutorialEnabled?(actor: NativeScriptActor, tutorial: 2 | 4): NativeValue<number>;
  alternateCamera?(): NativeValue<number>;
  /** The full GetAttitudeToPlayer helper has additional hostile/crime/party
   * dependencies. Supplying unknown is safe; a guessed friendly default is not. */
  attitudeToPlayer?(actor: NativeScriptActor, spu: NativeScriptProcessingUnit): NativeValue<number>;
}

/** Original lazy function-local labels, shared by every SPU in one module.
 * Explicit seeds support loaded/live globals; factory uses PE loader-zero bytes.
 * It does not claim the labels still equal their loader seed in a native session. */
export class NativeRoutineScriptGlobals {
  private readonly values = new Map<string, number>();
  constructor(seed: Readonly<Record<string, number>>) {
    for (const [address, value] of Object.entries(seed)) {
      if (!/^[0-9a-f]{8}$/.test(address)) throw new Error('Invalid native global address');
      this.values.set(address, i32(value, address));
    }
  }
  static fromOriginalLoader(): NativeRoutineScriptGlobals {
    const seed: Record<string, number> = {};
    for (const group of Object.values(rules.labels)) for (const address of [group.mask, group.counter, ...group.labels]) seed[address] = 0;
    return new NativeRoutineScriptGlobals(seed);
  }
  snapshot(): Readonly<Record<string, number>> { return Object.freeze(Object.fromEntries(this.values)); }
  label(body: string, index: number, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): number {
    if (!spu.ownsSchedulerAccess(access)) throw new Error('Stale/cross-SPU static-label capability');
    const group = rules.labels[body], address = group?.labels[index];
    if (!group || !address || index > 30) throw new Error('Unproved original static label');
    const get = (key: string): number => {
      const value = this.values.get(key); if (value === undefined) throw new Error('Original global bytes unknown: ' + key); return value;
    };
    const bit = 1 << index;
    if ((get(group.mask) & bit) === 0) {
      this.values.set(group.mask, get(group.mask) | bit);
      access.record({ operation: 'routine-global-' + group.mask, value: get(group.mask) });
      this.values.set(address, get(group.counter));
      access.record({ operation: 'routine-global-' + address, value: get(address) });
      this.values.set(group.counter, (get(group.counter) + 1) | 0);
      access.record({ operation: 'routine-global-' + group.counter, value: get(group.counter) });
    }
    return get(address);
  }
}

/** Original selection object102203e4. Its constructor ordered triples retain
 * duplicates: first matching (0,0,2) wins over the later (0,0,8). */
export class NativeWeaponSelection {
  constructor(public firstIndex: number, public secondIndex: number) {
    i32(firstIndex, 'selection first index'); i32(secondIndex, 'selection second index');
  }
  static fromOriginalConstructor(): NativeWeaponSelection { return new NativeWeaponSelection(-1, -1); }
  category(leftUseType: number, rightUseType: number): number {
    i32(leftUseType, 'left UseType'); i32(rightUseType, 'right UseType');
    if (!rules.fightPairs?.length) throw new Error('Original ordered fight table is unavailable');
    for (const [left, right, category] of rules.fightPairs) if (left === leftUseType && right === rightUseType) return category;
    return 0;
  }
}
type ArgumentRequest = { kind: '_AI_ChangeAction'; self: string; other: string | null; action: number }
  | { kind: '_AI_StandUp'; self: string }
  | { kind: '_AI_TransferItem'; self: string; index: number }
  | { kind: '_AI_HoldInventoryItems'; self: string; first: number; second: number };
type Argument = ArgumentRequest & { capturedSelf: NativeScriptActor };
interface ArgumentRecord { value: Argument; destroyed: boolean; owner: NativeScriptProcessingUnit }

/** Resolvers can be passed before scheduler construction, then bind exactly
 * once. Every invocation validates that it operates on that same SPU. */
export class NativeRoutineScripts {
  private scheduler: NativeInstructionScheduler | null = null;
  private nextArgument = 1;
  private readonly arguments = new Map<string, ArgumentRecord>();
  constructor(private readonly host: NativeRoutineScriptHost, readonly globals: NativeRoutineScriptGlobals) {}
  bind(scheduler: NativeInstructionScheduler): void {
    if (this.scheduler) throw new Error('Native routine script adapter is already bound');
    this.scheduler = scheduler;
  }
  private require(spu: NativeScriptProcessingUnit, access?: NativeSPUSchedulerAccess): NativeInstructionScheduler {
    if (!this.scheduler || this.scheduler.spu !== spu || (access && !spu.ownsSchedulerAccess(access))) {
      throw new Error('Unbound, stale or cross-SPU routine script adapter');
    }
    return this.scheduler;
  }
  private actor(id: string): NativeScriptActor {
    const actor = fact(this.host.actor(id), 'original actor ' + id);
    if (!actor || actor.entity.id !== id || (actor.routine && actor.routine.values !== actor.entity.properties)) {
      throw new Error('Original actor/captured ScriptRoutine storage identity mismatch');
    }
    if (actor.routine && actor.routine.kind !== 'gCScriptRoutine_PS') throw new Error('Wrong original routine PS class');
    if (actor.npc && actor.npc.kind !== 'gCNPC_PS') throw new Error('Wrong original NPC PS class');
    if (actor.playerMemory && actor.playerMemory.kind !== 'gCPlayerMemory_PS') throw new Error('Wrong original PlayerMemory PS class');
    return actor;
  }
  private self(spu: NativeScriptProcessingUnit): NativeScriptActor {
    const id = spu.snapshot().self; if (id === null) throw new Error('Original script requires resolved non-None Self');
    return this.actor(id);
  }
  private top(access: NativeSPUSchedulerAccess): { index: number; frame: Readonly<NativeAIStateFrame> } {
    const state = access.snapshot(), index = state.frameCount - 1, frame = state.frames[index];
    if (!frame || index < 0) throw new Error('Original script reads an unavailable top frame');
    return { index, frame };
  }
  private step(body: string, index: number, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): boolean {
    const label = this.globals.label(body, index, spu, access), top = this.top(access);
    if (top.frame.position > label) return false;
    access.writeFrame(top.index, 'position', (label + 1) | 0); return true;
  }
  private read(actor: NativeScriptActor, set: 'routine' | 'npc' | 'playerMemory', field: string): unknown {
    const propertySet = actor[set]; if (!propertySet) throw new Error('Original ' + set + ' PS missing for ' + field);
    if (propertySet.failure()) throw new Error(propertySet.failure()!);
    const value = (propertySet.values as NativeScriptValues)[field];
    if (value === undefined) throw new Error('Original live value unknown: ' + set + '.' + field); return value;
  }
  private write(actor: NativeScriptActor, kind: 'routine' | 'npc' | 'playerMemory', field: string,
    value: number | boolean, access: NativeSPUSchedulerAccess): void {
    const set = actor[kind]; if (!set) throw new Error('Native property setter missing PS: ' + kind + '.' + field);
    for (const phase of ['enter', 'exit'] as const) {
      access.record({ operation: 'script-property-' + phase, entity: actor.entity.id, value: kind + '.' + field });
      const receipt = set.notify(phase, field, false); if (!receipt.supported) throw new Error(receipt.reason);
      if (phase === 'enter') {
        (set.values as NativeScriptValues)[field] = value;
        access.record({ operation: 'script-property-write-' + field, entity: actor.entity.id, value });
      }
    }
  }
  private effect(operation: NativeRoutineEngineOperation, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): void {
    access.record({ operation: 'script-engine-call', value: operation.kind });
    fact(this.host.engine(operation, spu), 'Original ' + operation.kind);
    access.record({ operation: 'script-engine-return', value: operation.kind });
  }
  readonly routine: NonNullable<NativeRoutineHost['routine']> = name => name === 'Rtn_Player'
    ? spu => { this.require(spu); return spu.dispatchScheduler(access => this.playerRoutine(spu, access)); } : null;
  readonly script: NonNullable<NativeRoutineHost['script']> = name => name === 'ContinueRoutine'
    ? (self, other, argument, spu) => {
      this.require(spu);
      if (other !== null || argument !== 0) throw new Error('Unproved ContinueRoutine call operands');
      return spu.dispatchScheduler(access => this.continueRoutine(self, spu, access));
    } : null;
  readonly body: NonNullable<NativeInstructionHost['script']> = (kind, name) => {
    const entry = rules.supportedBodies[name];
    const functions = new Set(['_AI_ChangeAction', '_AI_StandUp', '_AI_TransferItem', '_AI_HoldInventoryItems']);
    if (!entry || (functions.has(name) ? kind !== 'function' : kind !== 'state')) return null;
    return { source: { moduleSha256: SHA, entry }, invoke: (spu, access) => {
      this.require(spu, access);
      if (functions.has(name)) {
        // The compiled body captures its heap args allocation. Reentrant
        // callbacks may destroy it; that memory domain is outside this port.
        const argument = this.argument(access, name as Argument['kind'], spu);
        let result: number;
        if (name === '_AI_ChangeAction') result = this.changeAction(spu, access);
        else if (name === '_AI_StandUp') result = this.standUpFunction(spu, access);
        else if (name === '_AI_TransferItem') result = this.transferFunction(spu, access);
        else if (name === '_AI_HoldInventoryItems') result = this.holdFunction(spu, access);
        else throw new Error('Unported original function body');
        void argument.kind; // Require the same still-live allocation on return.
        return result;
      }
      if (name === 'ZS_Attack_Wait') return this.attackWait(spu, access);
      if (name === 'ZS_StandUp') return this.standUpState(spu, access);
      if (name === 'PS_Normal') return this.normalState(spu, access);
      throw new Error('Original registered body has no supported execution path: ' + name);
    } } satisfies NativeScriptBody;
  };
  private playerRoutine(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 1 {
    const actor = this.self(spu);
    this.write(actor, 'routine', 'AIMode', 0, access);
    this.write(actor, 'npc', 'Ransacked', false, access);
    let task = 'PS_Ghost';
    if (byte(fact(actor.hasStatusEffects(0x80), 'HasStatusEffects(0x80)'), 'HasStatusEffects AL') !== 1) {
      this.resetAll(actor, spu, access);
      const category = i32(fact(this.host.fightCategory(actor), 'Fight-mode table102203e4 lookup'), 'fight category');
      task = category === 4 ? 'PS_Melee' : category === 5 ? 'PS_Ranged' : category === 6 ? 'PS_Magic' : 'PS_Normal';
    }
    success(spu.setTask(task)); return 1;
  }
  /** Concrete compiled ResetAll call sequence. The frozen-status branch stops
   * before its unresolved effect/species/frozen operations. */
  private resetAll(actor: NativeScriptActor, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): void {
    const entity = actor.entity.id;
    this.write(actor, 'routine', 'AmbientAction', 0, access);
    if (fact(this.host.playerId(), 'Reset-action-queue Entity.GetPlayer') === entity) {
      this.effect({ kind: 'player-reset-action-queue', entity, helper: '1000ecc0' }, spu, access);
    }
    if (fact(this.host.playerId(), 'Control-flag Entity.GetPlayer') === entity) {
      this.effect({ kind: 'player-control-flag', entity, value: false, helper: '10009520' }, spu, access);
    }
    this.effect({ kind: 'look-at-target', entity, target: null }, spu, access);
    this.effect({ kind: 'alignment-target', entity, target: null }, spu, access);
    this.effect({ kind: 'movement-constraints', entity, degrees: 360 }, spu, access);
    const player = fact(this.host.playerId(), 'Entity.GetPlayer');
    if (player === entity) this.effect({ kind: 'cross-hair', visible: false }, spu, access);
    this.effect({ kind: 'auto-aiming', entity, enabled: false, target: null, animation: '' }, spu, access);
    this.effect({ kind: 'dcc-enabled', entity, enabled: true }, spu, access);
    if (byte(fact(actor.hasStatusEffects(2), 'HasStatusEffects(2)'), 'status AL') === 1) {
      throw new Error('ResetAll frozen branch requires original StopEffect/species burst/EnableFrozen/SetTimeScale bodies');
    }
    const ghost = byte(fact(actor.hasStatusEffects(0x80), 'HasStatusEffects(0x80)'), 'status AL') === 1;
    const group = ghost ? 16 : fact(this.host.playerId(), 'Live collision Entity.IsPlayer') === entity ? 3 : 4;
    this.effect({ kind: 'collision-group', entity, group }, spu, access);
    // Native retrieves both held-item wrappers before checking either result.
    const right = fact(this.host.heldItem(actor, 1), 'GetItemFromSlot(1)');
    const left = fact(this.host.heldItem(actor, 2), 'GetItemFromSlot(2)');
    if (right) {
      this.effect({ kind: 'strip-enabled', entity: right.id, enabled: false }, spu, access);
      this.effect({ kind: 'collision-group', entity: right.id, group: 5 }, spu, access);
    }
    if (left) {
      this.effect({ kind: 'strip-enabled', entity: left.id, enabled: false }, spu, access);
      this.effect({ kind: 'collision-group', entity: left.id, group: 5 }, spu, access);
      const use = i32(fact(left.useType(), 'Left held-item UseType'), 'UseType');
      if (use === 5) {
        this.effect({ kind: 'revert-playing-animation', entity: left.id, milliseconds: 100 }, spu, access);
        if (!right) throw new Error('Native right-item UseType read lacks resolved wrapper semantics');
        if (i32(fact(right.useType(), 'Right held-item UseType'), 'UseType') === 4) {
          this.effect({ kind: 'stop-runtime-effect', entity: right.id, name: 'eff_ani_fight_bow_raise_01', fade: false }, spu, access);
        }
      } else if (use === 12) {
        this.effect({ kind: 'stop-runtime-effect', entity, name: 'eff_magic_parade_shield_01', fade: false }, spu, access);
      }
    }
    // Native re-evaluates Entity.IsPlayer here, after engine effect callbacks.
    if (fact(this.host.playerId(), 'Entity.IsPlayer') === entity) this.write(actor, 'playerMemory', 'IsConsumingItem', false, access);
  }
  private continueRoutine(self: string, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 0 | 1 {
    if (spu.snapshot().self !== self) throw new Error('Cross-owner ContinueRoutine PS-to-SPU lookup is unresolved');
    const actor = this.actor(self);
    if (!bool(fact(actor.navigationValid(), 'PSNavigation.IsValid'), 'navigation validity')) return 0;
    if (byte(fact(this.host.applicationMode(0x26c), 'application virtual26c'), 'application AL') === 1 ||
        byte(fact(this.host.applicationMode(0x270), 'application virtual270'), 'application AL') === 0) {
      throw new Error('ContinueRoutine reached the original nonreturning abort profile');
    }
    const attitude = i32(fact(this.host.attitudeToPlayer?.(actor, spu), 'GetAttitudeToPlayer10019910/100194c0'), 'attitude');
    this.write(actor, 'npc', 'AttitudeToPlayer2', attitude, access);
    const mode = i32(this.read(actor, 'routine', 'AIMode'), 'AIMode');
    if (mode === 9 || i32(this.read(actor, 'routine', 'AIMode'), 'AIMode') === 8) {
      this.effect({ kind: 'current-target', entity: self, target: null }, spu, access);
      success(spu.setTask(mode === 9 ? 'ZS_Dead' : 'ZS_StandUp')); return 1;
    }
    this.write(actor, 'npc', 'AttackReason', 0, access);
    this.write(actor, 'npc', 'Ransacked', false, access);
    this.resetAll(actor, spu, access);
    throw new Error('ContinueRoutine normal tail requires live enclave/GetAttitudeTo/HP/CanHealSelf/UpdateRoutine/party task selection; its ordered prefix is retained');
  }
  private attackWait(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 0 | 1 {
    const actor = this.self(spu);
    if (this.step('ZS_Attack_Wait', 0, spu, access)) {
      this.write(actor, 'routine', 'Action', 47, access);
      const result = this.require(spu).wait({ entity: actor.entity.id, milliseconds: 100 }); success(result);
      if (result.supported && result.nativeReturnValue !== 1) return 0;
    }
    if (this.step('ZS_Attack_Wait', 1, spu, access)) success(spu.setState('ZS_Attack_Loop'));
    return 1;
  }
  private argument(access: NativeSPUSchedulerAccess, kind: Argument['kind'], spu: NativeScriptProcessingUnit): Argument {
    const token = this.top(access).frame.object, record = token ? this.arguments.get(token) : undefined;
    if (!record || record.destroyed || record.owner !== spu || record.value.kind !== kind) throw new Error('Original function argument object identity/type is unresolved');
    return record.value;
  }
  /** Native Add + script/begin/object/callback writes, then actual registered
   * function dispatch. Returning1 pops the live current top frame. */
  private push(argument: ArgumentRequest, actor: NativeScriptActor, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): number {
    if (actor.entity.id !== argument.self) throw new Error('Captured argument Self differs');
    // Source callers copy their existing parent frame's callback. No valid
    // original call profile exists for fabricating one before frame0.
    this.top(access);
    const index = access.pushFrame();
    access.writeFrame(index, 'script', argument.kind); access.writeFrame(index, 'begin', false);
    const token = 'routine-args:' + this.nextArgument++;
    // Script Entity copy/assignment is42 plain DWORD copies, destructor is RET.
    // Capture the PS pointer fields, retaining the same mutable PS value objects.
    const navigationReader = actor.navigationValid, statusReader = actor.hasStatusEffects;
    const capturedSelf: NativeScriptActor = { ...actor, entity: { ...actor.entity },
      navigationValid: () => navigationReader.call(capturedSelf),
      hasStatusEffects: mask => statusReader.call(capturedSelf, mask) };
    const assertLive = (): void => {
      const record = this.arguments.get(token);
      if (!record || record.destroyed || record.owner !== spu || record.value !== captured) {
        throw new Error('Captured native argument allocation was destroyed/unregistered during a callback');
      }
    };
    // Every later field read/write checks the captured allocation, not the
    // current top frame. A deleted object must not survive as a usable JS copy.
    const captured: Argument = new Proxy({ ...argument, capturedSelf }, {
      get: (target, property, receiver) => { assertLive(); return Reflect.get(target, property, receiver); },
      set: (target, property, value, receiver) => { assertLive(); return Reflect.set(target, property, value, receiver); },
    });
    this.arguments.set(token, { value: captured, destroyed: false, owner: spu });
    access.record({ operation: 'script-args-allocate', value: token });
    access.writeFrame(index, 'object', token);
    const parent = access.snapshot().frames[index - 1];
    if (!parent) throw new Error('Original function caller frame is absent');
    access.writeFrame(index, 'callback', parent.callback);
    access.record({ operation: 'script-args-Entity42DWORD-copy', entity: argument.self });
    return this.runFunction(argument.kind, spu, access);
  }
  private runFunction(name: string, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): number {
    if (!bool(this.host.entityProcessingEnabled(), 'EntityAdmin.IsProcessingEnabled')) return 0;
    const body = this.body('function', name); if (!body) throw new Error('Original function handler unsupported: ' + name);
    access.record({ operation: 'script-function', value: name });
    const result = byte(body.invoke(spu, access), 'Function AL');
    if (result === 1) { access.removeFrame(access.snapshot().frameCount - 1); return 1; }
    return 0;
  }
  readonly destroyFrameObject: NonNullable<NativeRoutineHost['destroyFrameObject']> = (token, argument, _frame, spu) => {
    this.require(spu);
    const record = this.arguments.get(token);
    if (!record || record.owner !== spu || record.destroyed || argument !== 0) throw new Error('Unresolved native argument destructor');
    // Script Entity destructor1002ede0 is RET: no entity refcount/release effect.
    // Concrete args destructors then restore their base vtable; flag0 skips free.
    record.destroyed = true;
  };
  readonly deleteFrameObject: NonNullable<NativeRoutineHost['deleteFrameObject']> = (token, spu) => {
    this.require(spu);
    if (token === null) return;
    const record = this.arguments.get(token);
    if (!record || record.owner !== spu || !record.destroyed) throw new Error('Original DeleteObject without completed argument destructor');
    this.arguments.delete(token);
  };
  private changeAction(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 1 {
    const argument = this.argument(access, '_AI_ChangeAction', spu);
    if (argument.kind !== '_AI_ChangeAction') throw new Error('Wrong native args');
    const actor = argument.capturedSelf;
    if (this.step('_AI_ChangeAction', 0, spu, access)) {
      if (argument.other === null) {
        const destination = fact(this.host.currentDestination(actor), 'GetCurrentDestinationPoint');
        if (destination !== null) {
          argument.other = destination;
          access.record({ operation: 'script-args-other-write', value: destination });
        }
      }
      const current = i32(this.read(actor, 'routine', 'Action'), 'Action');
      if (argument.action !== current && (current === 83 || current === 89 || current === 91 || current === 96 ||
          (current !== 0 && current !== 119 && current > 59))) {
        throw new Error('_AI_ChangeAction old-action branch requires original ground bias/GetAni/PlayAni continuation');
      }
    }
    if (this.step('_AI_ChangeAction', 1, spu, access)) {
      const current = i32(this.read(actor, 'routine', 'Action'), 'Action');
      if (argument.action !== current) {
        if (argument.action === 83 || argument.action === 89 || argument.action === 91 || argument.action === 96) {
          throw new Error('_AI_ChangeAction requested ground-bias branch is unresolved');
        }
        this.write(actor, 'routine', 'Action', argument.action, access);
        if (argument.action !== 0 && argument.action !== 119) throw new Error('_AI_ChangeAction new-action PlayAni continuation is unresolved');
      }
    }
    return 1;
  }
  private standUpFunction(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 1 {
    const argument = this.argument(access, '_AI_StandUp', spu), actor = argument.capturedSelf;
    if (this.step('_AI_StandUp', 0, spu, access)) {
      if (i32(this.read(actor, 'routine', 'AIMode'), 'AIMode') !== 0) throw new Error('_AI_StandUp requires original ResetAni/ResetState bodies for nonzero AIMode');
      if (i32(this.read(actor, 'routine', 'AniState'), 'AniState') !== 2) throw new Error('_AI_StandUp requires _AI_AniStateAction(0x49) for AniState other than2');
    }
    return 1;
  }
  private standUpState(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 0 | 1 {
    const actor = this.self(spu);
    if (this.step('ZS_StandUp', 0, spu, access) && this.push({ kind: '_AI_StandUp', self: actor.entity.id }, actor, spu, access) !== 1) return 0;
    if (this.step('ZS_StandUp', 1, spu, access)) {
      this.write(actor, 'routine', 'AIMode', 0, access); success(spu.continueRoutine(actor.entity.id));
    }
    return 1;
  }
  private slot(actor: NativeScriptActor, slot: 1 | 2): number {
    const inventory = fact(this.host.inventory?.(actor), 'Original live inventory');
    if (!inventory) return -1;
    for (const stack of inventory.snapshot().stacks) if (stack.linkedSlot === slot) return stack.index;
    return -1;
  }
  private useType(actor: NativeScriptActor, index: number): number {
    const inventory = fact(this.host.inventory?.(actor), 'Original live inventory');
    if (!inventory) return 0;
    const stack = inventory.getStack(index >>> 0); // Original unsigned index bound.
    if (!stack) return 0;
    const template = inventory.template(stack.templateGuid20);
    if (!template) throw new Error('Native template proxy GetStackUseType is unresolved for a populated stack');
    return i32(template.useType, 'template UseType');
  }
  private desiredCategory(actor: NativeScriptActor, first: number, second: number): number {
    if (first === second && first !== -1) return 0;
    if (!this.host.weaponSelection) throw new Error('Original weapon-selection object is unresolved');
    //1000bfa0 queries the first index, then the second, preserving table order.
    return this.host.weaponSelection.category(this.useType(actor, first), this.useType(actor, second));
  }
  private transferFunction(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 1 {
    const argument = this.argument(access, '_AI_TransferItem', spu);
    if (argument.kind !== '_AI_TransferItem') throw new Error('Wrong native transfer args');
    if (this.step('_AI_TransferItem', 0, spu, access)) {
      if (argument.index === -1) return 1;
      throw new Error('_AI_TransferItem nonnegative index requires native item/slot/animation operations');
    }
    throw new Error('_AI_TransferItem resumed non-initial path is not ported');
  }
  private holdFunction(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 0 | 1 {
    const argument = this.argument(access, '_AI_HoldInventoryItems', spu);
    if (argument.kind !== '_AI_HoldInventoryItems') throw new Error('Wrong native hold args');
    const actor = argument.capturedSelf;
    if (this.step('_AI_HoldInventoryItems', 0, spu, access)) {
      const category = this.desiredCategory(actor, argument.first, argument.second);
      if (category === 0 || category === 7) throw new Error('Hold category0/7 template-name wrapper/debug lifetime path remains unresolved');
      //100098e0 returns1 on EQUALITY, including both indices being -1.
      if (this.slot(actor, 2) === argument.second) {
        if (this.push({ kind: '_AI_TransferItem', self: argument.self, index: argument.second }, actor, spu, access) !== 1) return 0;
      }
    }
    if (this.step('_AI_HoldInventoryItems', 1, spu, access)) {
      if (this.slot(actor, 1) === argument.first) {
        if (this.push({ kind: '_AI_TransferItem', self: argument.self, index: argument.first }, actor, spu, access) !== 1) return 0;
      }
    }
    if (this.step('_AI_HoldInventoryItems', 2, spu, access)) {
      if (this.slot(actor, 2) === argument.first && this.slot(actor, 1) === argument.second) return 1;
      throw new Error('Hold desired/current slots differ; original action/equip/animation tail is unresolved');
    }
    throw new Error('Hold resumed later position has no supported original tail');
  }
  private normalState(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 0 | 1 {
    const actor = this.self(spu);
    if (this.step('PS_Normal', 0, spu, access)) {
      this.write(actor, 'routine', 'AIMode', 0, access);
      this.effect({ kind: 'camera-mode', mode: 2, firstFlag: true, secondFlag: true }, spu, access);
      if (this.push({ kind: '_AI_ChangeAction', self: actor.entity.id, other: null, action: 0 }, actor, spu, access) !== 1) return 0;
    }
    if (this.step('PS_Normal', 1, spu, access)) {
      const selection = this.host.weaponSelection; if (!selection) throw new Error('Original weapon selection is unresolved');
      const first = i32(selection.firstIndex, 'selected first'), second = i32(selection.secondIndex, 'selected second');
      if (this.desiredCategory(actor, first, second) !== 2) {
        //100096e0 only writes if passed Self equals the then-current player.
        if (fact(this.host.playerId(), 'selection Entity.GetPlayer') === actor.entity.id) {
          selection.firstIndex = -1; selection.secondIndex = -1;
          access.record({ operation: 'player-weapon-selection-clear', entity: actor.entity.id });
        }
      }
      if (this.push({ kind: '_AI_HoldInventoryItems', self: actor.entity.id, first, second }, actor, spu, access) !== 1) return 0;
    }
    if (this.step('PS_Normal', 2, spu, access)) {
      const tut2 = byte(fact(this.host.isTutorialEnabled?.(actor, 2), 'IsTutorialEnabled(2)'), 'tutorial AL');
      if (tut2 === 1 && bool(this.read(actor, 'playerMemory', 'TalkedToDiego'), 'TalkedToDiego') &&
          bool(this.read(actor, 'playerMemory', 'TalkedToMilten'), 'TalkedToMilten') &&
          bool(this.read(actor, 'playerMemory', 'TalkedToGorn'), 'TalkedToGorn')) {
        throw new Error('PS_Normal AfterFriends tutorial disable/localization/HUD function is unresolved');
      }
      const tut4 = byte(fact(this.host.isTutorialEnabled?.(actor, 4), 'IsTutorialEnabled(4)'), 'tutorial AL');
      if (tut4 === 1 && bool(this.read(actor, 'playerMemory', 'TalkedToLester'), 'TalkedToLester')) {
        throw new Error('PS_Normal AfterLester tutorial disable/localization/HUD function is unresolved');
      }
      this.effect({ kind: 'focus-entity', entity: actor.entity.id, target: null }, spu, access);
      this.effect({ kind: 'focus-property', entity: actor.entity.id, property: 'CurrentMode', value: 2 }, spu, access);
      this.effect({ kind: 'focus-property', entity: actor.entity.id, property: 'EnableRangeRating', value: false }, spu, access);
      this.effect({ kind: 'look-at-target', entity: actor.entity.id, target: null }, spu, access);
      this.effect({ kind: 'alignment-target', entity: actor.entity.id, target: null }, spu, access);
      if (this.push({ kind: '_AI_StandUp', self: actor.entity.id }, actor, spu, access) !== 1) return 0;
    }
    if (this.step('PS_Normal', 3, spu, access)) {
      const alternate = byte(fact(this.host.alternateCamera?.(), 'Alternate-camera flag1000bae0'), 'camera AL');
      if (alternate === 1) this.effect({ kind: 'movement-constraints', entity: actor.entity.id, degrees: 360 }, spu, access);
      else {
        const species = i32(this.read(actor, 'npc', 'Species'), 'Species');
        if (species !== 0) throw new Error('Normal nonalternate camera species table is not ported beyond original Hero Species0');
        this.effect({ kind: 'movement-constraints', entity: actor.entity.id, degrees: 0 }, spu, access);
      }
      this.effect({ kind: 'focus-property', entity: actor.entity.id, property: 'FocusLookAtMode', value: alternate === 1 ? 1 : 0 }, spu, access);
      const destination = fact(this.host.currentDestination(actor), 'Native cleanup current destination');
      if (destination !== null) throw new Error('Normal destination cleanup requires native anchor/user changes for non-None destination');
      //100c9560 called with actual None wrapper as Other, whose Navigation/Item
      // PS are missing; currentDestination None equals Other and returns0.
      access.record({ operation: 'native-destination-cleanup-None-return', value: 0 });
      success(spu.setState('PS_Normal_Loop'));
    }
    return 1;
  }
  /** Source-supported direct compiled AI_ChangeAction call interface for future
   * native player/state bodies. The caller owns its preceding continuation write. */
  changeActionFunction(self: string, action: number, other: string | null = null): NativeRoutineResult {
    if (!this.scheduler) throw new Error('Routine scripts are unbound');
    const spu = this.scheduler.spu;
    return spu.dispatchScheduler(access => this.push({ kind: '_AI_ChangeAction', self, other, action: i32(action, 'Action') }, this.actor(self), spu, access) === 1 ? 1 : 0);
  }
}
