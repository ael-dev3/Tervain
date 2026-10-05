/** Installed Hero PS_Normal_Loop and examined input branches.
 *
 * This operates on the same SPU, captured property sets and inventory. Source
 * movement wishes are not physical translation. Unknown focus search, physics,
 * animation, combat, speech and HUD calls stop at their ordered native boundary.
 * Browser keys may select native GameKey events under an explicit host profile;
 * they are never claimed to be captured native keyboard bindings.
 */
import rulesText from '../../assets/gothic3/player-state/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import type { NativeInventory } from './inventory';
import type { OriginalPlayerMemory } from './player-properties';
import type { NativeScriptActor, NativeScriptValues } from './routine-scripts';
import type { NativeInstructionHost, NativeScriptBody } from './script-instructions';
import { NativeInstructionScheduler } from './script-instructions';
import type { NativeRoutineResult, NativeScriptProcessingUnit, NativeSPUSchedulerAccess } from './script-routine';

const SHA = '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1';
const rules = JSON.parse(rulesText) as { schema: string; scriptGameSha256: string;
  bodies: Record<string, string>; labels: Record<string, { mask: string; counter: string; labels: string[] }> };
if (rules.schema !== 'gothic3-player-state-rules-v1' || rules.scriptGameSha256 !== SHA ||
    rules.bodies.PS_Normal_Loop !== '1009a660' || rules.bodies.PS_Normal_Sneak !== '1009ac30') {
  throw new Error('Original player state rule receipt differs');
}
function fact<T>(value: NativeValue<T> | undefined, name: string): T {
  if (!value?.known) throw new Error(name + ': ' + (value?.reason ?? 'original dependency unresolved'));
  return value.value;
}
function int(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new Error(name + ' needs a signed32 value');
  }
  return value;
}
function byte(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255) throw new Error(name + ' needs a byte');
  return value;
}
function success(result: NativeRoutineResult): void { if (!result.supported) throw new Error(result.reason); }

/** These are the actual scalar stores, not property-notification setters:
 * Navigation20286340 writes+218; CharacterControl202182e0 writes+ac. */
export interface NativePlayerWishedMovement { wishedMovementMode: number }
export interface NativePlayerMovementOwner {
  readonly id: string;
  navigation(): NativeValue<NativePlayerWishedMovement | null>;
  characterControl(): NativeValue<NativePlayerWishedMovement | null>;
}
export interface NativePlayerMovement {
  /** GetMovementMode20221cd0 / IsSprinting20221dc0 / IsSelfControlled20221a70
   * all read the identical live CharacterMovement DWORD+100. */
  movementMode: number;
  /** IsBraking20221ea0 reads this byte directly. Null means unknown loadedbytes. */
  brakingByte: number | null;
  /** IsStanding20221df0 only calls physics.GetVelocity/HasZeroMagnitude when
   * mode==1. This must implement that examined query, not a grounded guess. */
  standingVelocityZero(): NativeValue<boolean>;
  owner(): NativeValue<NativePlayerMovementOwner | null>;
}
export interface NativePlayerFocus {
  /** Actual Game2013bf10: temporary focus state and FindFocusEntity. An arbitrary
   * browser selection is not a native-equivalent implementation of this call. */
  query(combatMode: 1, direction: 0, spu: NativeScriptProcessingUnit): NativeValue<NativePlayerActor | null>;
  /** Game2013b0a0 -> Engine Entity*-proxy assignment, including ref lifetimes. */
  setFocus(entity: NativePlayerActor | null, spu: NativeScriptProcessingUnit): NativeValue<void>;
}
export interface NativePlayerActor extends NativeScriptActor {
  readonly focus: NativePlayerFocus | null;
  readonly movement: NativePlayerMovement | null;
  readonly inventory: NativeInventory | null;
  /** Same captured gCPlayerMemory_PS and actual SP attribute objects. */
  readonly memory: OriginalPlayerMemory | null;
  readonly damageReceiverPresent: boolean;
  /** Exact captured PSItem/PSParty pointer presence and live value reader. */
  readonly itemPresent: boolean;
  partyMemberType(): NativeValue<number>;
  /** Script10020250/Game2004c360: proxy temporary construction, NPC property
   * Enter/assignment/Exit, then temporary destruction. Required only with NPC. */
  setCurrentTarget(entity: NativePlayerActor | null, spu: NativeScriptProcessingUnit): NativeValue<void>;
}
export interface NativePlayerStateHost {
  actor(id: string): NativeValue<NativePlayerActor | null>;
  playerId(): NativeValue<string | null>;
  /** Game20022705: reread Self proxy, NPC(0x1e), then CurrentTarget proxy.
   * This differs from the separate instructionTarget slot used by WAIT. */
  targetEntity(spu: NativeScriptProcessingUnit): NativeValue<NativePlayerActor | null>;
  entityProcessingEnabled(): boolean;
  /** CallScriptFromScript2034dc70 reference-casts GameApp before slot+270.
   * Missing/wrong application is a cast/dereference boundary, not return0. */
  gameApplicationPresent(): NativeValue<boolean>;
  applicationMode(slot: 0x270): NativeValue<number>;
  fightMode(actor: NativePlayerActor): NativeValue<number>;
  /** Entity.IsCheatGodEnabled original global query. No cheat default is invented. */
  cheatGodEnabled(): NativeValue<number>;
  /** Complex Game2022c810 physical mode transition. Its ordered shape/speed/
   * effects/callback operations must be implemented before this can returnknown. */
  physicalMovementMode(actor: NativePlayerActor, mode: number, spu: NativeScriptProcessingUnit): NativeValue<void>;
}

export interface NativePlayerActionRecord {
  readonly signal: number;
  readonly argument: number;
  /** Source176-byte value record includes a captured nonowning Entity wrapper. */
  readonly other: NativePlayerActor | null;
}
export interface NativePlayerControlSeed {
  readonly movementBytes: readonly number[]; // offsets0..6 of102203dc
  readonly queueBytes: readonly number[]; // offsets0..2 of10220420
  readonly records: readonly NativePlayerActionRecord[];
  /** Original third pending record at10220420+164/+168/+16c. */
  readonly pending: NativePlayerActionRecord;
}
/** One module-wide control object and queue, shared by all original player
 * handlers/SPUs. The caller supplies proven factory/runtime bytes; no live
 * native session state is guessed. Successful allocation profile is bounded
 * to65536 records. Nonowning Entity copies/destructors have no ref callbacks. */
export class NativePlayerControls {
  private readonly movement: number[];
  private readonly queue: number[];
  private readonly actions: NativePlayerActionRecord[];
  private pending: NativePlayerActionRecord;
  constructor(seed: NativePlayerControlSeed) {
    if (seed.movementBytes.length !== 7 || seed.queueBytes.length !== 3 || seed.records.length > 65536) {
      throw new Error('Original control object seed shape differs');
    }
    this.movement = seed.movementBytes.map((v, i) => byte(v, 'movement byte+' + i));
    this.queue = seed.queueBytes.map((v, i) => byte(v, 'queue byte+' + i));
    this.actions = seed.records.map(record => this.copy(record));
    this.pending = this.copy(seed.pending);
  }
  /** Explicit original OnInit reset + queue-constructor profile. This does not
   * assert that OnInit was invoked in a captured running native session. */
  static fromOriginalInit(): NativePlayerControls {
    return new NativePlayerControls({ movementBytes: [0, 0, 0, 0, 0, 0, 0], queueBytes: [0, 0, 0],
      records: [], pending: { signal: 0, argument: 0, other: null } });
  }
  private copy(record: NativePlayerActionRecord): NativePlayerActionRecord {
    return { signal: int(record.signal, 'action signal'), argument: int(record.argument, 'action argument'),
      other: record.other ? capture(record.other) : null };
  }
  snapshot(): NativePlayerControlSeed { return { movementBytes: [...this.movement], queueBytes: [...this.queue],
    records: this.actions.map(record => this.copy(record)), pending: this.copy(this.pending) }; }
  movementByte(offset: 0 | 1 | 2 | 3 | 4 | 5 | 6): number { return byte(this.movement[offset], 'live movement byte'); }
  queueByte(offset: 0 | 1 | 2): number { return byte(this.queue[offset], 'live queue byte'); }
  /** Direct OnInit10009680, without introducing an SPU state frame. */
  resetOriginalMovementOnInit(): void { this.movement.fill(0); }
  /** First three writes of OnInit1000ed50. The subsequent original array
   * destruction/free remains the startup host's boundary. Pending+164/+168/
   * +16c is deliberately retained: this native helper never resets it. */
  resetOriginalQueueFlagsOnInit(): void { this.queue.fill(0); }
  /** Call only after1000ed50's existing storage destruction/free completed.
   * These are the same JS-owned value records used by all player handlers. */
  clearOriginalQueueAfterOnInitRelease(): void { this.actions.length = 0; }
  writeMovement(offset: 0 | 1 | 2 | 3 | 4 | 5 | 6, value: number, access: NativeSPUSchedulerAccess): void {
    access.snapshot();
    this.movement[offset] = byte(value, 'movement byte');
    access.record({ operation: 'player-control-102203dc+' + offset, value });
  }
  writeQueueByte(offset: 0 | 1 | 2, value: number, access: NativeSPUSchedulerAccess): void {
    access.snapshot();
    this.queue[offset] = byte(value, 'queue byte');
    access.record({ operation: 'player-control-10220420+' + offset, value });
  }
  /**1000cf80 ignores its by-value Self argument and only peeks the queue. */
  peek(): number { return this.actions.length > 0 ? this.actions[0]!.signal : 0; }
  pendingRecord(): NativePlayerActionRecord { return this.copy(this.pending); }
  writePendingSignal(value: number, access: NativeSPUSchedulerAccess): void {
    access.snapshot(); this.pending = { ...this.pending, signal: int(value, 'pending signal') };
    access.record({ operation: 'player-pending+164-write', value });
  }
  writePendingArgument(value: number, access: NativeSPUSchedulerAccess): void {
    access.snapshot(); this.pending = { ...this.pending, argument: int(value, 'pending argument') };
    access.record({ operation: 'player-pending+168-write', value });
  }
  writePendingOther(value: NativePlayerActor | null, access: NativeSPUSchedulerAccess): void {
    access.snapshot(); this.pending = { ...this.pending, other: value ? capture(value) : null };
    access.record({ operation: 'player-pending+16c-Entity-copy', value: value?.entity.id ?? null });
  }
  /**1000ec30 clears existing entries, count0, allocates/count1, initializes,
   * then copies the supplied176-byte value. JS allocation is a stated profile. */
  replace(record: NativePlayerActionRecord, access: NativeSPUSchedulerAccess): void {
    access.snapshot();
    const copied = this.copy(record);
    this.actions.length = 0;
    access.record({ operation: 'player-queue-clear-count', value: 0 });
    this.actions.push({ signal: 0, argument: 0, other: null });
    access.record({ operation: 'player-queue-SetCount', value: 1 });
    this.actions[0] = copied;
    access.record({ operation: 'player-queue-copy-signal', value: copied.signal });
  }
  clear(access: NativeSPUSchedulerAccess): void {
    access.snapshot();
    this.actions.length = 0; access.record({ operation: 'player-queue-clear-count', value: 0 });
  }
  /**100108d0: signal!=0 writes pending+164, replaces the entire queue from
   * pending+164/+168/+16c, then zeros both scalars and assigns Other=None. */
  signal(value: number, access: NativeSPUSchedulerAccess): void {
    access.snapshot();
    int(value, 'native action signal'); if (value === 0) return;
    this.writePendingSignal(value, access);
    this.replace(this.pending, access);
    this.writePendingSignal(0, access); this.writePendingArgument(0, access); this.writePendingOther(null, access);
  }
  /**1000d6f0 live Player equality gates10015cc0(index0): nonowning wrapper
   * destruction, memmove of following records, last-slot reset, count decrement. */
  consume(actor: NativePlayerActor, player: string | null, access: NativeSPUSchedulerAccess): void {
    access.snapshot();
    if (actor.entity.id !== player || this.actions.length <= 0) return;
    this.actions.shift(); access.record({ operation: 'player-queue-remove-index0', value: this.actions.length });
  }
}

/** Captured Entity wrapper copies pointer fields, not the mutable values they
 * point to. Reader functions are captured once and invoked against this copy. */
function capture(actor: NativePlayerActor): NativePlayerActor {
  const navigation = actor.navigationValid, status = actor.hasStatusEffects;
  const party = actor.partyMemberType, target = actor.setCurrentTarget;
  const copy: NativePlayerActor = { ...actor, entity: { ...actor.entity },
    navigationValid: () => navigation.call(copy), hasStatusEffects: mask => status.call(copy, mask),
    partyMemberType: () => party.call(copy), setCurrentTarget: (entity, spu) => target.call(copy, entity, spu) };
  return copy;
}
interface JumpArgument { readonly kind: '_AI_Jump'; self: NativePlayerActor | null; other: NativePlayerActor | null }

/**202223f0 unsigned table switch. Outside1..14 falls toreturn1, including0.
 * Script wrapper returns0 if CharacterMovement PS is absent. */
export function nativePlayerCanJump(movement: NativePlayerMovement | null): 0 | 1 {
  if (movement === null) return 0;
  const mode = int(movement.movementMode, 'CanJump DWORD+100');
  return [6, 7, 8, 9, 10, 11, 13, 14].includes(mode) ? 0 : 1;
}
export interface NativePlayerPressedEvent {
  /** Live reads of the SAME captured original CharacterControl input property.
   * A selected DOM mapping may supply explicit0/1 values; native keyboard setup
   * and the full OnPlayerGameKeyPressed dispatcher remain separate boundaries. */
  isPressed(): NativeValue<number>;
  isPressedBefore?(): NativeValue<number>;
}

export class NativePlayerStateGlobals {
  private readonly values = new Map<string, number>();
  /** Last read loot/HUD globals are not initialized by these loop bodies. */
  hudPage: number | null = null;
  hudOther: NativePlayerActor | null | undefined = undefined;
  constructor(seed: Readonly<Record<string, number>>) {
    for (const [address, value] of Object.entries(seed)) this.values.set(address, int(value, address));
  }
  static fromOriginalLoader(): NativePlayerStateGlobals {
    const seed: Record<string, number> = {};
    for (const group of Object.values(rules.labels)) for (const address of [group.mask, group.counter, ...group.labels]) seed[address] = 0;
    return new NativePlayerStateGlobals(seed);
  }
  label(body: string, index: number, access: NativeSPUSchedulerAccess): number {
    access.snapshot();
    const group = rules.labels[body]; if (!group) throw new Error('Unproved player state label');
    const label = group.labels[index]; if (!label || index > 30) throw new Error('Unproved player state label index');
    const get = (address: string): number => {
      const value = this.values.get(address); if (value === undefined) throw new Error('Unknown original static ' + address); return value;
    };
    const write = (address: string, value: number): void => {
      this.values.set(address, value); access.record({ operation: 'player-state-static-' + address, value });
    };
    const bit = 1 << index;
    if ((get(group.mask) & bit) === 0) {
      const counter = get(group.counter);
      write(group.mask, get(group.mask) | bit); write(label, counter); write(group.counter, (counter + 1) | 0);
    }
    return get(label);
  }
  snapshot(): Readonly<Record<string, number>> { return Object.freeze(Object.fromEntries(this.values)); }
}

/** Concrete source-backed state bodies. Install with routine.installPlayerStates
 * before/after its one scheduler bind. Missing bodies still resolve tonull. */
export class NativePlayerStates {
  private scheduler: NativeInstructionScheduler | null = null;
  private nextArgument = 1;
  private readonly jumpArguments = new Map<string, { owner: NativeScriptProcessingUnit; destroyed: boolean; value: JumpArgument }>();
  constructor(private readonly host: NativePlayerStateHost, readonly controls: NativePlayerControls,
    readonly globals: NativePlayerStateGlobals) {}
  bind(scheduler: NativeInstructionScheduler): void {
    if (this.scheduler) throw new Error('Player state adapter is already bound'); this.scheduler = scheduler;
  }
  private require(spu: NativeScriptProcessingUnit, access?: NativeSPUSchedulerAccess): void {
    if (!this.scheduler || this.scheduler.spu !== spu || (access && !spu.ownsSchedulerAccess(access))) throw new Error('Unbound/stale/cross-SPU player state');
  }
  private self(spu: NativeScriptProcessingUnit): NativePlayerActor {
    const id = spu.snapshot().self;
    if (id === null) throw new Error('PS_Normal requires resolved Self');
    const actor = fact(this.host.actor(id), 'GetSelfEntity/AttachTo');
    if (!actor || actor.entity.id !== id || (actor.routine && actor.routine.values !== actor.entity.properties)) {
      throw new Error('Captured player ScriptRoutine/actor identity differs');
    }
    if (actor.routine && actor.routine.kind !== 'gCScriptRoutine_PS' || actor.npc && actor.npc.kind !== 'gCNPC_PS' ||
        actor.playerMemory && actor.playerMemory.kind !== 'gCPlayerMemory_PS' ||
        typeof actor.itemPresent !== 'boolean' || typeof actor.damageReceiverPresent !== 'boolean') {
      throw new Error('Captured player PS classes/pointer presence are unresolved');
    }
    if (actor.memory && (actor.memory.properties as unknown) !== actor.playerMemory) throw new Error('Duplicate PlayerMemory store');
    return capture(actor);
  }
  private stage(name: string, access: NativeSPUSchedulerAccess, ordinal = 0): boolean {
    const label = this.globals.label(name, ordinal, access), state = access.snapshot(), index = state.frameCount - 1;
    const top = state.frames[index]; if (!top) throw new Error('Player loop reads missing frame');
    if (int(top.position, 'native frame position') > label) return false;
    access.writeFrame(index, 'position', (label + 1) | 0); return true;
  }
  private read(actor: NativePlayerActor, set: 'routine' | 'npc' | 'playerMemory', name: string): unknown {
    const ps = actor[set]; if (!ps || ps.failure()) throw new Error('Captured ' + set + ' missing/failed for ' + name);
    const value = (ps.values as NativeScriptValues)[name];
    if (value === undefined) throw new Error('Live ' + set + '.' + name + ' unknown'); return value;
  }
  private writeRoutine(actor: NativePlayerActor, field: 'Action' | 'AniState', value: number, access: NativeSPUSchedulerAccess): void {
    const ps = actor.routine; if (!ps || ps.kind !== 'gCScriptRoutine_PS') throw new Error('Captured Routine PS missing');
    for (const phase of ['enter', 'exit'] as const) {
      access.record({ operation: 'player-' + field + '-' + phase, entity: actor.entity.id, value });
      const receipt = ps.notify(phase, field, false); if (!receipt.supported) throw new Error(receipt.reason);
      if (phase === 'enter') { ps.values[field] = value; access.record({ operation: 'player-' + field + '-write', entity: actor.entity.id, value }); }
    }
  }
  private writeAni(actor: NativePlayerActor, value: number, access: NativeSPUSchedulerAccess): void {
    this.writeRoutine(actor, 'AniState', value, access);
  }
  private consume(actor: NativePlayerActor, access: NativeSPUSchedulerAccess): void {
    this.controls.consume(actor, fact(this.host.playerId(), 'live Entity.GetPlayer'), access);
  }
  private stamina(actor: NativePlayerActor): number {
    //Compiled10046590 checks PlayerMemory first, then DamageReceiver.
    if (actor.playerMemory) {
      if (!actor.memory || (actor.memory.properties as unknown) !== actor.playerMemory) throw new Error('GetStaminaPoints requires shared original SP attribute store');
      return int(actor.memory.getValue('SP'), 'shared SP value');
    }
    if (actor.damageReceiverPresent) throw new Error('DamageReceiver fallback SP scalar/getter is unresolved');
    return 0;
  }
  private addJumpStamina(actor: NativePlayerActor, access: NativeSPUSchedulerAccess): 0 | 1 {
    //10046af0 player equality + cheat query are re-evaluated at this call.
    if (fact(this.host.playerId(), 'AddStaminaPoints GetPlayer') === actor.entity.id &&
        byte(fact(this.host.cheatGodEnabled(), 'Entity.IsCheatGodEnabled'), 'cheat AL') !== 0) return 0;
    const requested = (this.stamina(actor) - 10) | 0;
    //100467f0 reads current SP (discarded) BEFORE maximum then clamp.
    if (!actor.playerMemory) {
      if (actor.damageReceiverPresent) throw new Error('SetStaminaPoints DamageReceiver fallback setter unresolved');
      return 1; // Add ignores the inner SetStaminaPoints0 return.
    }
    const memory = actor.memory;
    if (!memory || (memory.properties as unknown) !== actor.playerMemory) throw new Error('Jump SP duplicate/unresolved captured PlayerMemory');
    void this.stamina(actor);
    const maximum = int(memory.getMaximum('SP'), 'SP maximum');
    let amount = requested <= 0 ? 0 : requested;
    if (amount > maximum) amount = maximum; // Negative original maximum remainsnegative.
    access.record({ operation: 'AddStaminaPoints-SetValue-call', entity: actor.entity.id, value: amount });
    const result = memory.setValue('SP', amount);
    for (const row of result.applied) access.record({ operation: 'player-SP-' + row.operation, entity: actor.entity.id,
      ...(typeof row.value === 'number' || typeof row.value === 'boolean' || typeof row.value === 'string' || row.value === null ? { value: row.value } : {}) });
    if (!result.supported) throw new Error(result.reason);
    return 1;
  }
  /** Source CallScriptFromScript gates are reread separately for EVERY call.
   * Explicit Self and nonnull None operands avoid embedded-SPU fallbacks; the
   * source-pinned Get/Add registrations are selected by this implementation. */
  private staminaScript(kind: 'GetStaminaPoints' | 'AddStaminaPoints', actor: NativePlayerActor,
    access: NativeSPUSchedulerAccess): number {
    access.record({ operation: 'CallScriptFromScript-call', entity: actor.entity.id,
      value: kind + '(Self,None,' + (kind === 'AddStaminaPoints' ? '-10' : '0') + ')' });
    const present = fact(this.host.gameApplicationPresent(), 'CallScriptFromScript GameApp dynamic_cast');
    if (typeof present !== 'boolean') throw new Error('GameApp presence is not a known native boolean');
    if (!present) throw new Error('CallScriptFromScript native reference-cast/dereference requires actual GameApp');
    if (byte(fact(this.host.applicationMode(0x270), 'CallScriptFromScript GameApp+270'), 'game running AL') === 0) return 0;
    const enabled = this.host.entityProcessingEnabled(); if (typeof enabled !== 'boolean') throw new Error('Entity processing flag unknown');
    if (!enabled) return 0;
    //RunScriptFromScript2034d3a0 repeats the admin processing query before
    //the original registered script lookup/invoke. It is not a cached flag.
    const enabledAgain = this.host.entityProcessingEnabled();
    if (typeof enabledAgain !== 'boolean') throw new Error('RunScriptFromScript processing reread unknown');
    if (!enabledAgain) return 0;
    return kind === 'GetStaminaPoints' ? this.stamina(actor) : this.addJumpStamina(actor, access);
  }
  /** Script10011d00 complete ordinary-player wish branch. Exceptional modes and
   * nonplayer owners reach the unresolved physical setter at its real boundary. */
  private movementMode(actor: NativePlayerActor, mode: number, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): void {
    const movement = actor.movement; if (!movement) return;
    const current = (): number => int(movement.movementMode, 'CharacterMovement DWORD+100');
    const physical = (): void => {
      access.record({ operation: 'player-physical-movement-call', entity: actor.entity.id, value: mode });
      fact(this.host.physicalMovementMode(actor, mode, spu), 'Game2022c810 SetMovementMode');
      access.record({ operation: 'player-physical-movement-return', entity: actor.entity.id, value: mode });
    };
    if (current() === 0) { physical(); return; }
    const exceptional = current() === 10 || current() === 7;
    if (mode === 6) { physical(); return; }
    if (!((!exceptional && current() !== 6 && current() < 12) || mode === 14 || current() === 14)) return;
    const player = fact(this.host.playerId(), 'SetMovementMode Session.GetPlayer');
    let owner = fact(movement.owner(), 'CharacterMovement.GetEntity');
    if (!owner) throw new Error('Native owner dereference is null');
    if (owner.id !== player || mode === 14) physical();
    owner = fact(movement.owner(), 'reread CharacterMovement.GetEntity for Navigation');
    if (!owner) throw new Error('Native owner Navigation lookup is null');
    const navigation = fact(owner.navigation(), 'owner.GetPropertySet(5)');
    if (navigation) { navigation.wishedMovementMode = mode; access.record({ operation: 'Navigation+218-write', entity: owner.id, value: mode }); }
    owner = fact(movement.owner(), 'reread CharacterMovement.GetEntity for CharacterControl');
    if (!owner) throw new Error('Native owner CharacterControl lookup is null');
    const control = fact(owner.characterControl(), 'owner.GetPropertySet(0x16)');
    if (control) { control.wishedMovementMode = mode; access.record({ operation: 'CharacterControl+ac-write', entity: owner.id, value: mode }); }
  }
  private toggleSneak(actor: NativePlayerActor, enabled: number, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): void {
    if (fact(this.host.playerId(), 'Sneak GetPlayer') === actor.entity.id) this.controls.writeMovement(5, enabled, access);
    if (enabled !== 1) return;
    this.toggleParade(actor, 0, spu, access);
    if (int(this.read(actor, 'npc', 'Species'), 'Species') === 0) {
      const mode = int(fact(this.host.fightMode(actor), 'native1000c160 mode'), 'fight mode');
      this.writeAni(actor, mode === 1 ? 4 : 3, access);
    }
    this.movementMode(actor, 3, spu, access);
  }
  private toggleParade(actor: NativePlayerActor, enabled: number, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): void {
    if (fact(this.host.playerId(), 'Parade GetPlayer') === actor.entity.id) this.controls.writeMovement(4, enabled, access);
    if (enabled !== 1) return;
    this.toggleSneak(actor, 0, spu, access); this.writeAni(actor, 4, access); this.movementMode(actor, 2, spu, access);
  }
  private updateMovement(actor: NativePlayerActor, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): void {
    if (fact(this.host.playerId(), 'UpdateControl Player equality') !== actor.entity.id) return;
    //10009520 repeats live equality before its separate byte+6 write.
    if (fact(this.host.playerId(), 'Control-flag Player equality') === actor.entity.id) this.controls.writeMovement(6, 0, access);
    this.controls.writeMovement(3, 0, access);
    const mode = int(fact(this.host.fightMode(actor), 'UpdateControl native fight mode'), 'fight mode');
    if (mode === 0 || mode === 2) this.controls.writeMovement(4, 0, access);
    if (this.controls.movementByte(4) === 1) {
      if (this.controls.queueByte(1) !== 0) {
        if (this.controls.peek() !== 0 || int(this.read(actor, 'routine', 'AniState'), 'AniState') === 4) return;
        throw new Error('UpdateControl10012584 requires original1000a7b0 opponent/parade queue preparation');
      }
      this.toggleParade(actor, 0, spu, access);
    } else if (this.controls.movementByte(5) === 1) {
      if (this.controls.queueByte(2) !== 0) {
        if (this.controls.peek() !== 0) return;
        const ani = int(this.read(actor, 'routine', 'AniState'), 'AniState');
        if ((mode === 1 && ani === 4) || (mode !== 1 && ani === 3)) return;
        //10220584/+588/+58c IS10220420+164/+168/+16c, not another object.
        this.controls.writePendingSignal(74, access);
        this.controls.replace(this.controls.pendingRecord(), access);
        this.controls.writePendingArgument(0, access); this.controls.writePendingSignal(0, access);
        this.controls.writePendingOther(null, access);
        return;
      }
      this.toggleSneak(actor, 0, spu, access);
    } else if (this.controls.movementByte(1) === 1) {
      this.writeAni(actor, 2, access); this.movementMode(actor, 3, spu, access); return;
    } else if (this.controls.movementByte(2) === 1) {
      const stamina = this.staminaScript('GetStaminaPoints', actor, access);
      const sprinting = (): boolean => actor.movement !== null && int(actor.movement.movementMode, 'IsSprinting DWORD+100') === 5;
      if (stamina > 20 || (stamina > 0 && sprinting())) {
        this.writeAni(actor, 2, access); this.movementMode(actor, 5, spu, access); return;
      }
    }
    this.writeAni(actor, 2, access); this.movementMode(actor, 4, spu, access);
  }
  private quickUse(actor: NativePlayerActor, slot: number, access: NativeSPUSchedulerAccess): void {
    if (byte(fact(actor.hasStatusEffects(0x10), 'PSNpc.IsTransformed status0x10'), 'IsTransformed AL') === 1) return;
    if (this.stance(actor)) return;
    this.consume(actor, access);
    const inventory = actor.inventory;
    const index = inventory ? inventory.snapshot().stacks.find(stack => stack.quickSlot === slot)?.index ?? -1 : -1;
    const stack = inventory?.getStack(index) ?? null;
    const definition = stack ? inventory!.template(stack.templateGuid20) : null;
    if (stack && !definition) throw new Error('QuickUse live stack template resolution is unknown');
    const useType = definition ? int(definition.useType, 'QuickUse UseType') : 0;
    // Original switch defaults return1 without further item effects. Other
    // branches stop after the already-executed queue consumption.
    if (![2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 32, 44, 51, 52].includes(useType)) return;
    if (useType === 44 && int(definition!.category, 'QuickUse Category') !== 3) return;
    throw new Error('QuickUse10078ed0 UseType' + useType + ' requires original requirements/selection/use script');
  }
  private stance(actor: NativePlayerActor): boolean {
    return int(this.read(actor, 'routine', 'AniState'), 'AniState') === 4 || int(this.read(actor, 'routine', 'AniState'), 'AniState') === 3;
  }
  private loot(actor: NativePlayerActor, focus: NativePlayerActor, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): void {
    const count = focus.inventory?.snapshot().stacks.length ?? 0;
    for (let index = 0; index < count; index++) {
      const category = (): number => {
        const stack = focus.inventory!.getStack(index); if (!stack) return 0;
        const definition = focus.inventory!.template(stack.templateGuid20);
        if (!definition) throw new Error('Loot category template resolution unknown'); return int(definition.category, 'Category');
      };
      if (category() !== 0 && category() !== 9) {
        //100800e0 resets the WHOLE queue (1000ecc0), not consume(index0).
        //SUB ESP,a8 precedes LEA[ESP+b8]: source pointer is pre-SUB+10, Self.
        if (fact(this.host.playerId(), 'Loot reset queue live Player') === actor.entity.id) this.controls.clear(access);
        this.globals.hudPage = 10; access.record({ operation: 'player-global-10222400', value: 10 });
        this.globals.hudOther = capture(focus); access.record({ operation: 'player-global-10222408-Entity-copy', entity: focus.entity.id });
        success(spu.setState('PS_HUD')); return;
      }
    }
    throw new Error('NothingToGet10084910 requires native Entity.GetRandomNumber(3) and original speech/voice handler1000db70');
  }
  private use(actor: NativePlayerActor, focus: NativePlayerActor | null, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): void {
    //1009a879 SUB ESP,a8 then1009a87f LEA[ESP+b8] selects pre-SUB+10, Self.
    this.consume(actor, access); if (!focus) return;
    if (fact(focus.navigationValid(), 'captured focus PSNavigation.IsValid')) {
      if (int(this.read(focus, 'routine', 'AIMode'), 'focus AIMode') === 8 || int(this.read(focus, 'routine', 'AIMode'), 'focus AIMode') === 9) {
        this.loot(actor, focus, spu, access); return;
      }
      if (int(this.read(focus, 'routine', 'AIMode'), 'focus AIMode') === 7) {
        if (this.stance(actor)) {
          throw new Error('MasterThief Template resolution/IsSkillActive is unresolved at1009a925; queue consumed');
        }
      } else if (int(this.read(focus, 'routine', 'AIMode'), 'focus AIMode') === 3 ||
                 int(this.read(focus, 'routine', 'AIMode'), 'focus AIMode') === 4 ||
                 int(this.read(focus, 'routine', 'AIMode'), 'focus AIMode') === 5) return;
      throw new Error('Talk100414a0 requires original crime/info/party/interaction state dispatch; queue consumed');
    }
    if (focus.itemPresent) success(spu.setState('PS_Normal_Take'));
    else success(spu.setTask('PS_Interact'));
  }
  private loop(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 1 {
    const actor = this.self(spu);
    //GetTargetEntity executes its real NPC-current-target query even though
    //this body subsequently only destroys the captured nonowning wrapper.
    const target = fact(this.host.targetEntity(spu), 'Game20022705 GetTargetEntity');
    if (target) capture(target);
    if (!this.stage('PS_Normal_Loop', access)) return 1;
    let focus: NativePlayerActor | null = null;
    if (actor.focus) {
      access.record({ operation: 'Focus.GetFocusEntity-call', entity: actor.entity.id, value: 'CombatMode1 Direction0' });
      const result = fact(actor.focus.query(1, 0, spu), 'Game2013bf10/FindFocusEntity');
      focus = result ? capture(result) : null;
      access.record({ operation: 'Focus.SetFocusEntity-call', entity: actor.entity.id, value: focus?.entity.id ?? null });
      fact(actor.focus.setFocus(focus, spu), 'Game2013b0a0 proxy SetEntity');
    }
    if (actor.npc) {
      access.record({ operation: 'NPC.SetCurrentTarget-call', entity: actor.entity.id, value: focus?.entity.id ?? null });
      fact(actor.setCurrentTarget(focus, spu), 'Script10020250/Game2004c360 CurrentTarget proxy');
    }
    this.updateMovement(actor, spu, access);
    const signal = this.controls.peek();
    if (signal === 54) { success(spu.setState('PS_Normal_Jump')); return 1; }
    if (signal === 74) { success(spu.setState('PS_Normal_Sneak')); return 1; }
    if (signal === 65) {
      this.consume(actor, access);
      if (!this.stance(actor)) throw new Error('Weapon toggle100787d0 requires original LastWeaponConfig/selection/equipment script');
    } else if (signal >= 128 && signal <= 137) this.quickUse(actor, signal - 128, access);
    //Native rereads the queue after the directly invoked script, even onreturn0.
    if (this.controls.peek() === 60) this.use(actor, focus, spu, access);
    return 1;
  }
  private sneak(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 1 {
    const actor = this.self(spu), target = fact(this.host.targetEntity(spu), 'Sneak GetTargetEntity');
    if (target) capture(target);
    if (this.stage('PS_Normal_Sneak', access)) {
      //SUB ESP,a8 then LEA[ESP+b0] at1009acbd selects pre-SUB+8, Self.
      this.consume(actor, access); this.toggleSneak(actor, 1, spu, access); success(spu.setState('PS_Normal_Loop'));
    }
    return 1;
  }
  /** Registered OnPlayerMovement stores flag+0; the physical control's later
   * axis/timer updates are a separate original OnAction dependency. */
  onPlayerMovement(spu: NativeScriptProcessingUnit, event: NativePlayerPressedEvent): NativeRoutineResult {
    this.require(spu);
    return spu.dispatchScheduler(access => {
      this.self(spu); // Source captures the supplied Self wrapper even here.
      this.controls.writeMovement(0, byte(fact(event.isPressed(), 'OnPlayerMovement IsPressed'), 'pressed AL'), access);
      return this.controls.movementByte(6) === 1 ? 0 : 1;
    });
  }
  /** Normal/interact rising primary action and concrete release prefix.
   * Combat/knockdown handlers retain their ordered prefix then block. */
  onPlayerAction(spu: NativeScriptProcessingUnit, event: NativePlayerPressedEvent): NativeRoutineResult {
    this.require(spu);
    return spu.dispatchScheduler(access => {
      const actor = this.self(spu);
      const pressed = (): number => byte(fact(event.isPressed(), 'OnPlayerAction IsPressed'), 'pressed AL');
      const before = (): number => byte(fact(event.isPressedBefore?.(), 'OnPlayerAction IsPressedBefore'), 'before AL');
      const task = (): string => {
        const value = this.read(actor, 'routine', 'CurrentTask'); if (typeof value !== 'string') throw new Error('Original CurrentTask string unknown'); return value;
      };
      if (pressed() === 0) this.controls.writeQueueByte(0, 0, access);
      if (task() === 'PS_Ranged') {
        if (this.stance(actor)) return 0;
        throw new Error('OnPlayerAction ranged use-type/shot handler1000c1d0/100107c0 unresolved');
      }
      if (task() === 'PS_Melee') throw new Error('OnPlayerAction melee timing/focus/attack handlers unresolved');
      if (task() === 'ZS_SitKnockDown' && pressed() === 1 && before() === 0) throw new Error('OnPlayerAction knockdown focus/attack prefix unresolved');
      if (task() === 'PS_Interact' && pressed() === 1 && before() === 0) this.controls.signal(60, access);
      if (task() === 'PS_Normal' && pressed() === 1 && before() === 0) this.controls.signal(60, access);
      return 1;
    });
  }
  /** Standalone registered OnPlayerWalk. This is NOT the entire native
   * CharacterControl.OnAction / OnPlayerGameKeyPressed event dispatcher. */
  onPlayerWalk(spu: NativeScriptProcessingUnit, event: NativePlayerPressedEvent): NativeRoutineResult {
    this.require(spu);
    return spu.dispatchScheduler(access => {
      const actor = this.self(spu), pressed = byte(fact(event.isPressed(), 'OnPlayerWalk IsPressed'), 'pressed AL');
      const flag = (offset: 1 | 2, value: 0 | 1): void => {
        if (fact(this.host.playerId(), 'Movement flag Entity.GetPlayer') === actor.entity.id) this.controls.writeMovement(offset, value, access);
      };
      if (pressed === 0) { flag(1, 0); flag(2, 0); return 1; }
      let standing = false;
      if (actor.movement && int(actor.movement.movementMode, 'IsStanding mode') === 1) {
        standing = fact(actor.movement.standingVelocityZero(), 'IsStanding physics velocity HasZeroMagnitude');
        if (typeof standing !== 'boolean') throw new Error('IsStanding requires original boolean query');
      }
      if (standing) flag(1, 1);
      else {
        const braking = actor.movement === null ? 0 : byte(actor.movement.brakingByte, 'IsBraking byte+17c');
        if (braking === 1) flag(1, 1); else flag(2, 1);
      }
      return 1;
    });
  }
  /** OnPlayerSneak stores the first read, then rereads IsPressed. */
  onPlayerSneak(spu: NativeScriptProcessingUnit, event: NativePlayerPressedEvent): NativeRoutineResult {
    this.require(spu);
    return spu.dispatchScheduler(access => {
      const actor = this.self(spu);
      this.controls.writeQueueByte(2, byte(fact(event.isPressed(), 'Sneak first IsPressed'), 'pressed AL'), access);
      if (byte(fact(event.isPressed(), 'Sneak second IsPressed'), 'pressed AL') === 0) this.toggleSneak(actor, 0, spu, access);
      else if (int(this.read(actor, 'npc', 'Species'), 'Species') === 0) this.controls.signal(74, access);
      return 1;
    });
  }
  /** OnPlayerJump does not read IsPressed itself: caller dispatcher controls
   * event eligibility. The source checks CanJump exactlyAL1 then Species0. */
  onPlayerJump(spu: NativeScriptProcessingUnit): NativeRoutineResult {
    this.require(spu);
    return spu.dispatchScheduler(access => {
      const actor = this.self(spu);
      if (nativePlayerCanJump(actor.movement) === 1 && int(this.read(actor, 'npc', 'Species'), 'Species') === 0) this.controls.signal(54, access);
      return 1;
    });
  }
  ownsArgument(token: string): boolean { return this.jumpArguments.has(token); }
  destroyArgument(token: string, argument: 0, spu: NativeScriptProcessingUnit): void {
    this.require(spu);
    const record = this.jumpArguments.get(token);
    if (argument !== 0 || !record || record.owner !== spu || record.destroyed) throw new Error('Unresolved340B Jump argument destructor');
    //1007e0b0: Other Entity destructor, Self destructor (both RET), base vtable,
    //flag0 skips delete; generic frame deletion follows via a separate call.
    record.destroyed = true;
  }
  deleteArgument(token: string, spu: NativeScriptProcessingUnit): void {
    this.require(spu);
    const record = this.jumpArguments.get(token);
    if (!record || record.owner !== spu || !record.destroyed) throw new Error('Jump DeleteObject precedes native argument destructor');
    this.jumpArguments.delete(token);
  }
  private argument(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): JumpArgument {
    const state = access.snapshot(), token = state.frames[state.frameCount - 1]?.object;
    const record = token ? this.jumpArguments.get(token) : undefined;
    if (!record || record.destroyed || record.owner !== spu || record.value.kind !== '_AI_Jump') throw new Error('Captured340B Jump argument identity unresolved');
    return record.value;
  }
  private pushJump(actor: NativePlayerActor, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 0 | 1 {
    const before = access.snapshot(); if (before.frameCount < 1 || !before.frames[before.frameCount - 1]) throw new Error('Jump original parent callback unavailable');
    const index = access.pushFrame(); access.writeFrame(index, 'script', '_AI_Jump'); access.writeFrame(index, 'begin', false);
    const token = 'player-jump-args:' + this.nextArgument++;
    const assertLive = (): void => {
      const record = this.jumpArguments.get(token);
      if (!record || record.owner !== spu || record.destroyed || record.value !== argument) throw new Error('Captured Jump argument allocation destroyed/unregistered during callback');
    };
    //Successful340B allocation/constructor initializes BOTH nonowning wrappers
    //toNone. Self/Other source assignments occur AFTER object/callback writes.
    const argument = new Proxy<JumpArgument>({ kind: '_AI_Jump', self: null, other: null }, {
      get: (target, key, receiver) => { assertLive(); return Reflect.get(target, key, receiver); },
      set: (target, key, value, receiver) => { assertLive(); return Reflect.set(target, key, value, receiver); },
    });
    this.jumpArguments.set(token, { owner: spu, destroyed: false, value: argument });
    access.record({ operation: 'player-jump-args340-construct-None-vtable1020f3b4', value: token });
    access.writeFrame(index, 'object', token);
    const parent = access.snapshot().frames[index - 1]; if (!parent) throw new Error('Jump parent frame disappeared');
    access.writeFrame(index, 'callback', parent.callback);
    argument.self = capture(actor); access.record({ operation: 'player-jump-args+4-Entity-copy', entity: actor.entity.id });
    argument.other = null; access.record({ operation: 'player-jump-args+ac-Entity-None', value: null });
    const enabled = this.host.entityProcessingEnabled(); if (typeof enabled !== 'boolean') throw new Error('Entity processing flag unresolved');
    if (!enabled) return 0;
    const body = this.body('function', '_AI_Jump'); if (!body) throw new Error('Jump function not registered');
    access.record({ operation: 'script-function', value: '_AI_Jump' });
    if (byte(body.invoke(spu, access), 'Jump function AL') !== 1) return 0;
    access.removeFrame(access.snapshot().frameCount - 1); return 1;
  }
  private jumpState(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 0 | 1 {
    const actor = this.self(spu), target = fact(this.host.targetEntity(spu), 'Jump GetTargetEntity'); if (target) capture(target);
    if (this.stage('PS_Normal_Jump', access) && this.pushJump(actor, spu, access) !== 1) return 0;
    this.stage('PS_Normal_Jump', access, 1); return 1;
  }
  private jumpFunction(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 1 {
    const argument = this.argument(spu, access);
    const actor = (): NativePlayerActor => {
      const value = argument.self; if (!value) throw new Error('Jump Self assignment incomplete'); return value;
    };
    if (this.stage('_AI_Jump', access)) {
      const captured = actor();
      if (captured.npc) {
        if (captured.npc.kind !== 'gCNPC_PS' || captured.npc.failure()) throw new Error('ForceNextPose NPC storage unavailable');
        captured.npc.values.ForcedPose = 1; //Game202f90b0 directDWORD+1a4, no notification.
        access.record({ operation: 'NPC+1a4-ForcedPose-write', entity: captured.entity.id, value: 1 });
      }
      this.writeRoutine(actor(), 'Action', 54, access);
      this.writeAni(actor(), 2, access);
      this.consume(actor(), access);
      if (nativePlayerCanJump(actor().movement) === 0) { void argument.kind; return 1; }
      this.movementMode(actor(), 6, spu, access);
      //1000c4d0 invokes AddSP(Self,None,−10), then GetSP(Self,None,0), ignoring
      //itsAL result. This lossless ordered prefix precedes missing animation.
      this.staminaScript('AddStaminaPoints', actor(), access); void this.staminaScript('GetStaminaPoints', actor(), access);
      throw new Error('Jump GetAni(Action54,UseTypes0/0,Phase12) and PlayAni descriptor(loop0,speed1,flags0) are unresolved after actual movement/SP prefix');
    }
    if (this.stage('_AI_Jump', access, 1)) {
      void actor();
      throw new Error('Resumed Jump GetAni(Action57,UseTypes0/0,Phase5)/PlayAni(loop−1,speed1,flags0) unresolved');
    }
    this.stage('_AI_Jump', access, 2); void argument.kind; return 1;
  }
  readonly body: NonNullable<NativeInstructionHost['script']> = (kind, name) => {
    const entry = rules.bodies[name]; if (!entry || (name === '_AI_Jump' ? kind !== 'function' : kind !== 'state')) return null;
    return { source: { moduleSha256: SHA, entry }, invoke: (spu, access) => {
      this.require(spu, access);
      if (name === 'PS_Normal_Loop') return this.loop(spu, access);
      if (name === 'PS_Normal_Sneak') return this.sneak(spu, access);
      if (name === 'PS_Normal_Jump') return this.jumpState(spu, access);
      if (name === '_AI_Jump') return this.jumpFunction(spu, access);
      throw new Error('Unported original player state ' + name);
    } } satisfies NativeScriptBody;
  };
}
