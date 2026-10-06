import { initializeNativeNpcOnProcessingRange } from './native-npc-processing';
import type { NativeNpcSerializedPoints, NativeNpcProcessingRangeState } from './native-npc-processing';
import type { NativeDifficulty, NativeKnowledge } from './combat';
import { generateNativePlunder, loadNativeTreasureSet } from './native-treasure-sets';
import type { NativeGeneratedPlunderStack, NativeTreasureSetResolution } from './native-treasure-sets';
import { NativeInventory } from './inventory';
import type { InventoryEquipPlan, InventoryTemplate, NativeInventorySnapshot } from './inventory';
import { NativeWorldData, sourceProperty } from './native-data';
import type { NativeEntityRecord, NativeSourceFile, SourceLookup } from './native-data';
import type { ScenePerson } from './types';
import type { NativeRoutineProperties, NativeSPUState, NativeSPUSchedulerStorage } from './script-routine';
import { NativeSpeechOutput } from './native-speech-output';
import type { NativeSpeechOutputCheckpoint } from './native-speech-output';

const SESSION_SCHEMA = 'gothic3-browser-npc-combat-session-v3';
const PRE_LIFECYCLE_SESSION_SCHEMA = 'gothic3-browser-npc-combat-session-v2';
const LEGACY_SESSION_SCHEMA = 'gothic3-browser-npc-combat-session-v1';
const PLUNDER_RANDOM_ALGORITHM = 'msvcrt-rand15-browser-seeded-v1';
const LIFECYCLE_CHECKPOINT_SCHEMA = 'gothic3-browser-npc-lifecycle-checkpoint-v1';
const HERO_SOURCE_ID = '054d6e4a5f059340bc5c2ca0cca6674500000000';
const DEATH_STATES = ['ZS_RagDollDead', 'ZS_Dead', 'ZS_Unconscious'];
const DEATH_LOOPS = DEATH_STATES.map((name) => name + '_Loop');
const DEATH_GLOBAL_GROUPS = [
  { mask: '102213f0', counter: '102213ec', labels: ['102213e8'] },
  { mask: '10221414', counter: '10221410', labels: ['1022140c', '10221408'] },
  { mask: '102217b0', counter: '102217ac', labels: ['102217a8', '102217a4'] },
] as const;

/** Exact serialized scalars seed this separate browser-owned writable store.
 * Physical engine objects, active attachments and presentation are not inferred. */
export interface BrowserNpcLiveState {
  routine: NativeRoutineProperties & { CommandTime: number; AIMode: number;
    AmbientAction: number; Action: number; AniState: number };
  npc: { CurrentAttackerEntity: string | null; LastAttackerEntity: string | null;
    CurrentTargetEntity: string | null; AlternativeTargetEntity: string | null;
    CombatState: number; DefeatedByPlayer: boolean; LastFightAgainstPlayer: number;
    LastFightTimestamp: number; StatusEffects: number; Voice: string };
  party: { PartyLeaderEntity: string | null; PartyMemberType: number; Members: (string | null)[] };
  navigation: { CurrentDestinationPointProxy: string | null };
  inventory: { GeneratedPlunder: boolean; GeneratedTrade: boolean };
  effect: { Effect: string; Static: boolean };
  movement: { CanBePushedWhileIdle: boolean; StepHeight: number;
    /** Owned factory proxies/scalar: constructor + Movement_PS.Read leave these
     * null/zero (version76 skips its old body; older reads end in Invalidate). */
    AlignmentTarget: string | null; GoalGroundEntity: string | null; GoalGroundOffset: number };
  enclaveGuid20: string;
}

export type BrowserNpcLifecycleSource =
  | { readonly status: 'source-resolved'; readonly seed: Readonly<BrowserNpcLiveState> }
  | { readonly status: 'unknown'; readonly reason: string };

export interface BrowserNpcLifecycleCheckpoint {
  schema: typeof LIFECYCLE_CHECKPOINT_SCHEMA;
  phase: 'source-seeded' | 'scheduled' | 'completed' | 'blocked' | 'zero-hp-unknown' | 'legacy-zero-hp-unknown';
  spu: NativeSPUState | null;
  scheduler: NativeSPUSchedulerStorage | null;
  speechOutput: NativeSpeechOutputCheckpoint | null;
  blockedReason: string | null;
}

export interface BrowserGeneratedPlunderState {
  readonly status: 'browser-generated-records-not-cache-in-inventory';
  readonly stacks: readonly NativeGeneratedPlunderStack[];
}

export type BrowserNpcWeaponryEquipPlan =
  | { readonly status: 'single-stack-plan'; readonly treasureSetSlot: number; readonly treasureSetName: string;
      readonly itemName: string; readonly itemGuid20: string; readonly stackIndex: number;
      /** Decision only; applying it still needs the live entity/skeleton/stat host. */
      readonly plan: InventoryEquipPlan }
  | { readonly status: 'two-hand-split-required'; readonly treasureSetSlot: number; readonly treasureSetName: string;
      readonly itemName: string; readonly itemGuid20: string; readonly reason: string };

type BrowserNpcTreasureSetResolution =
  | { readonly status: 'unresolved'; readonly treasureSetSlot: number; readonly name: string; readonly reason: string }
  | (NativeTreasureSetResolution & { readonly treasureSetSlot: number });

interface NativeNpcSourceFacts {
  readonly personId: string;
  readonly name: string;
  readonly sourcePath: string;
  readonly sourceFileIndex: number;
  readonly sourceSha256: string;
  readonly level: number;
  readonly levelMax: number;
  readonly species: number;
  readonly npcType: number;
  readonly politicalAlignment: number;
  readonly statusEffects: number;
  readonly serializedInventoryStackCount: number | null;
  readonly routineAction: number;
  readonly routineAniState: number;
  readonly routineStatePosition: number;
  readonly routineAiMode: number;
  readonly currentAttackerId: string | null;
  readonly lifecycleSource: BrowserNpcLifecycleSource;
  readonly treasureSets: readonly string[];
  readonly serializedEquipmentSlots: NativeNpcSerializedEquipmentSlots;
  readonly armorIsRobe: NativeKnowledge<boolean>;
  readonly navigationValid: true;
  readonly serializedPoints: NativeNpcSerializedPoints;
}

export type NativeNpcSerializedEquipmentSlots =
  | { readonly status: 'resolved'; readonly slots: readonly {
      readonly index: number; readonly templateGuid20: string; readonly templateName: string;
      readonly templateSourcePath: string; readonly templateSourceSha256: string; readonly itemGuid20: string;
      /** Native PSItem::IsRobe input for equipment slot17; null for other slots. */
      readonly robe: boolean | null;
    }[] }
  | { readonly status: 'unknown'; readonly reason: string };

type NativeNpcSerializedEquipmentSlotRefs =
  | { readonly status: 'resolved'; readonly slots: readonly {
      readonly index: number; readonly templateGuid20: string; readonly itemGuid20: string;
    }[] }
  | { readonly status: 'unknown'; readonly reason: string };

export interface BrowserArdeaNpcCombatState {
  readonly personId: string;
  readonly name: string;
  readonly sourcePath: string;
  readonly sourceFileIndex: number;
  readonly sourceSha256: string;
  readonly rawLevel: number;
  readonly rawLevelMax: number;
  readonly species: number;
  readonly npcType: number;
  readonly politicalAlignment: number;
  readonly statusEffects: number;
  /** Count from the original gCInventory_PS stack-list tail; null if undecoded. */
  readonly serializedInventoryStackCount: number | null;
  /** Serialized gCScriptRoutine_PS values; these are not live combat animation state. */
  readonly routineAction: number;
  readonly routineAniState: number;
  readonly routineStatePosition: number;
  readonly routineAiMode: number;
  readonly currentAttackerId: string | null;
  readonly lifecycleSource: BrowserNpcLifecycleSource;
  liveState: BrowserNpcLiveState | null;
  lifecycleCheckpoint: BrowserNpcLifecycleCheckpoint | null;
  /** gCItem_PS.Robe for the serialized body template in slot17. */
  readonly armorIsRobe: NativeKnowledge<boolean>;
  /** Source NPC inventory configuration; entries are names, not generated stacks. */
  readonly treasureSets: readonly string[];
  /** Serialized slot templates and item identities; these are not generated treasure or active attachments. */
  readonly serializedEquipmentSlots: NativeNpcSerializedEquipmentSlots;
  /** Source-resolved treasure and Weaponry recipes. */
  readonly treasureSetResolutions: readonly BrowserNpcTreasureSetResolution[];
  /** Browser-side Plunder arguments retained so inventory state can be audited and restored. */
  readonly generatedPlunder: BrowserGeneratedPlunderState;
  /** Plunder and deterministic Weaponry stacks; this does not attach gear or spawn ItemWorld objects. */
  readonly inventory: NativeInventory;
  /** Native EquipStack decisions for surviving Weaponry stacks; none is applied here. */
  readonly weaponryEquipPlans: readonly BrowserNpcWeaponryEquipPlan[];
  readonly navigationValid: true;
  readonly damageReceiverValid: true;
  readonly initialization: 'browser-source-processing-range-state';
  readonly processingRange: NativeNpcProcessingRangeState;
  hitPoints: number;
  stamina: number;
}

export interface BrowserArdeaNpcCombatSessionSave {
  readonly schema: typeof SESSION_SCHEMA;
  readonly plunderRandom?: { readonly algorithm: typeof PLUNDER_RANDOM_ALGORITHM; readonly state: number };
  readonly deathGlobals?: Readonly<Record<string, number>>;
  readonly deathPlayingTimeSeconds?: number;
  readonly actors: readonly {
    readonly personId: string;
    readonly sourcePath: string;
    readonly sourceSha256: string;
    readonly hitPoints: number;
    readonly stamina: number;
    readonly generatedPlunder?: BrowserGeneratedPlunderState;
    readonly inventory?: NativeInventorySnapshot;
    readonly liveState: BrowserNpcLiveState | null;
    readonly lifecycleCheckpoint: BrowserNpcLifecycleCheckpoint | null;
  }[];
}

export interface BrowserArdeaNpcRestoreResult {
  readonly restored: number;
  readonly skipped: readonly { readonly personId: string; readonly reason: string }[];
}

type CombatWorldSource = Pick<NativeWorldData, 'sourceByPath' | 'entityIndex' | 'entity' |
  'templateByNameWithSource' | 'templateByGuidWithSource' | 'template'>;
export type NativeInventoryTemplateWorldSource = CombatWorldSource;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function uniqueSet(record: NativeEntityRecord, setName: string): boolean {
  return record.propertySets.filter((set) => set.name === setName).length === 1;
}

function sourceValue<T>(record: NativeEntityRecord, setName: string, property: string,
  accepts: (value: unknown) => value is T): T {
  const result = sourceProperty(record, setName, property);
  if (result.kind !== 'found' || !accepts(result.value)) {
    throw new Error(result.kind === 'found'
      ? `Source ${setName}.${property} has an unsupported value.`
      : result.kind === 'missing' ? result.reason
      : `Source ${setName}.${property} is ambiguous across ${result.candidates.length} values.`);
  }
  return result.value;
}

function sourceProxyGuid(record: NativeEntityRecord, setName: string, property: string): string | null {
  const result = sourceProperty(record, setName, property);
  if (result.kind === 'missing' && result.reason === 'Source property is absent: ' + property) return null;
  if (result.kind !== 'found' || !isRecord(result.value) || typeof result.value.present !== 'boolean' ||
      (result.value.rawGuid20 !== null && (typeof result.value.rawGuid20 !== 'string' ||
        !/^[a-f0-9]{40}$/i.test(result.value.rawGuid20))) ||
      result.value.present !== (typeof result.value.rawGuid20 === 'string')) {
    throw new Error(`Source ${setName}.${property} is absent, undecoded, ambiguous or malformed.`);
  }
  return typeof result.value.rawGuid20 === 'string' ? result.value.rawGuid20.toLowerCase() : null;
}

function int32(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= -0x80000000 && (value as number) <= 0x7fffffff;
}

function nonnegativeInt32(value: unknown): value is number {
  return int32(value) && (value as number) >= 0;
}

function uint32(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 0xffffffff;
}

function float32(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Object.is(Math.fround(value), value);
}

function sourceCString(value: unknown): value is string {
  return typeof value === 'string' && !value.includes('\0');
}

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function strictSourceProxy(record: NativeEntityRecord, set: string, property: string): string | null {
  // A missing property is unknown; only an explicitly absent decoded proxy is null.
  const value = sourceValue(record, set, property, (raw): raw is Record<string, unknown> => isRecord(raw) &&
    typeof raw.present === 'boolean' && raw.present === (typeof raw.rawGuid20 === 'string') &&
    (raw.rawGuid20 === null || (typeof raw.rawGuid20 === 'string' && /^[a-f0-9]{40}$/i.test(raw.rawGuid20))));
  return typeof value.rawGuid20 === 'string' ? value.rawGuid20.toLowerCase() : null;
}

function freezeLiveSeed(seed: BrowserNpcLiveState): Readonly<BrowserNpcLiveState> {
  for (const value of Object.values(seed)) if (isRecord(value)) {
    for (const child of Object.values(value)) if (Array.isArray(child)) Object.freeze(child);
    Object.freeze(value);
  }
  return Object.freeze(seed);
}

function readLifecycleSource(entity: NativeEntityRecord): BrowserNpcLifecycleSource {
  try {
    const scalar = <T>(set: string, name: string, accepts: (v: unknown) => v is T): T => sourceValue(entity, set, name, accepts);
    const routine = <T>(name: string, accepts: (v: unknown) => v is T): T => scalar('gCScriptRoutine_PS', name, accepts);
    const npc = <T>(name: string, accepts: (v: unknown) => v is T): T => scalar('gCNPC_PS', name, accepts);
    const bool = (v: unknown): v is boolean => typeof v === 'boolean';
    const enclave = npc('Enclave', (v): v is Record<string, unknown> => isRecord(v) &&
      typeof v.rawGuid20 === 'string' && /^[a-f0-9]{40}$/i.test(v.rawGuid20));
    const partySets = entity.propertySets.filter((set) => set.name === 'gCParty_PS');
    const partyTail = partySets[0]?.tail;
    if (partySets.length !== 1 || partySets[0]?.version !== 1 || partyTail?.status !== 'decoded' ||
        !isRecord(partyTail.value) || !isRecord(partyTail.value.members) || !isRecord(partyTail.value.members.value)) {
      throw new Error('Source gCParty_PS owned Members tail is absent or undecoded.');
    }
    const members = partyTail.value.members.value;
    if (members.prefix !== 1 || members.elementType !== 'class eCEntityProxy' || !Array.isArray(members.items) ||
        members.count !== members.items.length || members.items.length > 327_680) {
      throw new Error('Source gCParty_PS owned Members array is malformed.');
    }
    const memberIds = members.items.map((proxy) => {
      if (!isRecord(proxy) || typeof proxy.present !== 'boolean' || proxy.present !== (typeof proxy.rawGuid20 === 'string') ||
          (proxy.rawGuid20 !== null && (typeof proxy.rawGuid20 !== 'string' || !/^[a-f0-9]{40}$/i.test(proxy.rawGuid20)))) {
        throw new Error('Source Party Members contains an undecoded proxy.');
      }
      return typeof proxy.rawGuid20 === 'string' ? proxy.rawGuid20.toLowerCase() : null;
    });
    const movementSets = entity.propertySets.filter((set) => set.name === 'gCCharacterMovement_PS');
    if (movementSets.length !== 1 || !Number.isInteger(movementSets[0]?.version) ||
        movementSets[0]!.version < 0 || movementSets[0]!.version > 0xffff) {
      throw new Error('Source CharacterMovement_PS class version is unknown.');
    }
    const seed: BrowserNpcLiveState = {
      routine: { Routine: routine('Routine', sourceCString), CurrentTask: routine('CurrentTask', sourceCString),
        LastTask: routine('LastTask', sourceCString), TaskPosition: routine('TaskPosition', int32),
        TaskTime: routine('TaskTime', float32), StatePosition: routine('StatePosition', int32),
        StateTime: routine('StateTime', float32), CurrentState: routine('CurrentState', sourceCString),
        CurrentBreakBlock: routine('CurrentBreakBlock', int32), CommandTime: routine('CommandTime', int32),
        AIMode: routine('AIMode', int32), AmbientAction: routine('AmbientAction', int32),
        Action: routine('Action', int32), AniState: routine('AniState', int32) },
      npc: { CurrentAttackerEntity: strictSourceProxy(entity, 'gCNPC_PS', 'CurrentAttackerEntity'),
        LastAttackerEntity: strictSourceProxy(entity, 'gCNPC_PS', 'LastAttackerEntity'),
        CurrentTargetEntity: strictSourceProxy(entity, 'gCNPC_PS', 'CurrentTargetEntity'),
        AlternativeTargetEntity: strictSourceProxy(entity, 'gCNPC_PS', 'AlternativeTargetEntity'),
        CombatState: npc('CombatState', int32), DefeatedByPlayer: npc('DefeatedByPlayer', bool),
        LastFightAgainstPlayer: npc('LastFightAgainstPlayer', int32), LastFightTimestamp: npc('LastFightTimestamp', float32),
        StatusEffects: npc('StatusEffects', uint32), Voice: npc('Voice', sourceCString) },
      party: { PartyLeaderEntity: strictSourceProxy(entity, 'gCParty_PS', 'PartyLeaderEntity'),
        PartyMemberType: scalar('gCParty_PS', 'PartyMemberType', int32), Members: memberIds },
      navigation: { CurrentDestinationPointProxy: strictSourceProxy(entity, 'gCNavigation_PS', 'CurrentDestinationPointProxy') },
      inventory: { GeneratedPlunder: scalar('gCInventory_PS', 'GeneratedPlunder', bool),
        GeneratedTrade: scalar('gCInventory_PS', 'GeneratedTrade', bool) },
      effect: { Effect: scalar('gCEffect_PS', 'Effect', sourceCString), Static: scalar('gCEffect_PS', 'Static', bool) },
      movement: { CanBePushedWhileIdle: scalar('gCCharacterMovement_PS', 'CanBePushedWhileIdle', bool),
        StepHeight: scalar('gCCharacterMovement_PS', 'StepHeight', float32),
        AlignmentTarget: null, GoalGroundEntity: null, GoalGroundOffset: 0 },
      enclaveGuid20: (enclave.rawGuid20 as string).toLowerCase(),
    };
    return Object.freeze({ status: 'source-resolved', seed: freezeLiveSeed(seed) });
  } catch (error) {
    return Object.freeze({ status: 'unknown', reason: error instanceof Error ? error.message : String(error) });
  }
}

/** Pinned browser lifecycle domain. Identity and unported source properties
 * cannot be changed by loading a save; supported native cleanup can clear them. */
function validLiveState(value: unknown, source: BrowserNpcLifecycleSource): value is BrowserNpcLiveState {
  if (source.status !== 'source-resolved' || !exactKeys(value,
    ['routine', 'npc', 'party', 'navigation', 'inventory', 'effect', 'movement', 'enclaveGuid20'])) return false;
  const seed = source.seed;
  if (!exactKeys(value.routine, Object.keys(seed.routine)) || !exactKeys(value.npc, Object.keys(seed.npc)) ||
      !exactKeys(value.party, Object.keys(seed.party)) || !exactKeys(value.navigation, Object.keys(seed.navigation)) ||
      !exactKeys(value.inventory, Object.keys(seed.inventory)) || !exactKeys(value.effect, Object.keys(seed.effect)) ||
      !exactKeys(value.movement, Object.keys(seed.movement))) return false;
  const r = value.routine, n = value.npc;
  const allowedTask = (name: unknown, original: string): boolean => sourceCString(name) &&
    [original, '', ...DEATH_STATES, ...DEATH_LOOPS].includes(name);
  const target = (id: unknown, original: string | null): boolean => id === null || id === original || id === HERO_SOURCE_ID;
  const retainedMembers = (members: unknown): boolean => {
    if (!Array.isArray(members)) return false;
    let previous = -1;
    return members.every((id) => {
      const index = seed.party.Members.indexOf(id, previous + 1);
      if (index < 0) return false;
      previous = index; return true;
    });
  };
  return value.enclaveGuid20 === seed.enclaveGuid20 && r.Routine === seed.routine.Routine &&
    allowedTask(r.CurrentTask, seed.routine.CurrentTask) &&
    // AISetTask copies the preceding CurrentTask to LastTask.
    (r.LastTask === seed.routine.CurrentTask || allowedTask(r.LastTask, seed.routine.LastTask)) &&
    allowedTask(r.CurrentState, seed.routine.CurrentState) &&
    ['TaskPosition', 'StatePosition', 'CurrentBreakBlock'].every((key) => int32(r[key])) &&
    ['TaskTime', 'StateTime'].every((key) => float32(r[key])) &&
    r.CommandTime === seed.routine.CommandTime && [seed.routine.AmbientAction, 0].includes(r.AmbientAction as number) &&
    [seed.routine.AIMode, 8, 9].includes(r.AIMode as number) &&
    [seed.routine.Action, 0].includes(r.Action as number) && [seed.routine.AniState, 2, 17, 19].includes(r.AniState as number) &&
    [n.CurrentAttackerEntity, n.LastAttackerEntity].every((id) => id === null || id === HERO_SOURCE_ID) &&
    target(n.CurrentTargetEntity, seed.npc.CurrentTargetEntity) && target(n.AlternativeTargetEntity, seed.npc.AlternativeTargetEntity) &&
    [seed.npc.CombatState, 0].includes(n.CombatState as number) && typeof n.DefeatedByPlayer === 'boolean' &&
    (!seed.npc.DefeatedByPlayer || n.DefeatedByPlayer) &&
    [seed.npc.LastFightAgainstPlayer, 1].includes(n.LastFightAgainstPlayer as number) && n.Voice === seed.npc.Voice &&
    float32(n.LastFightTimestamp) && n.LastFightTimestamp >= 0 && uint32(n.StatusEffects) &&
    ((n.StatusEffects & ~seed.npc.StatusEffects) >>> 0) === 0 &&
    [seed.party.PartyLeaderEntity, null].includes(value.party.PartyLeaderEntity as string | null) &&
    [seed.party.PartyMemberType, 0].includes(value.party.PartyMemberType as number) &&
    retainedMembers(value.party.Members) &&
    [seed.navigation.CurrentDestinationPointProxy, null].includes(value.navigation.CurrentDestinationPointProxy as string | null) &&
    value.inventory.GeneratedPlunder === true && value.inventory.GeneratedTrade === seed.inventory.GeneratedTrade &&
    [seed.effect.Effect, ''].includes(value.effect.Effect as string) && value.effect.Static === seed.effect.Static &&
    [seed.movement.CanBePushedWhileIdle, false].includes(value.movement.CanBePushedWhileIdle as boolean) &&
    value.movement.StepHeight === seed.movement.StepHeight && value.movement.AlignmentTarget === null &&
    value.movement.GoalGroundEntity === null && [0, Math.fround(Math.max(Math.min(0, seed.movement.StepHeight), -seed.movement.StepHeight))]
      .includes(value.movement.GoalGroundOffset as number);
}

function validDeathGlobals(value: unknown): value is Readonly<Record<string, number>> {
  if (!isRecord(value)) return false;
  const required = DEATH_GLOBAL_GROUPS.flatMap((group) => [group.mask, group.counter, ...group.labels]);
  if (required.some((key) => !(key in value)) || Object.keys(value).some((key) =>
    !required.includes(key as typeof required[number]) && key !== '10220e8c')) return false;
  if ('10220e8c' in value && (!float32(value['10220e8c']) || value['10220e8c'] < 0)) return false;
  // Lazy initialization may visit either label first. Each allocated label
  // receives the next ordinal; unallocated labels retain loader zero bytes.
  return DEATH_GLOBAL_GROUPS.every((group) => {
    const mask = value[group.mask];
    if (!nonnegativeInt32(mask) || mask >= 1 << group.labels.length) return false;
    const active = group.labels.filter((_key, index) => (mask & (1 << index)) !== 0);
    return value[group.counter] === active.length && group.labels.every((key, index) =>
      nonnegativeInt32(value[key]) && ((mask & (1 << index)) !== 0 ? value[key] < active.length : value[key] === 0)) &&
      new Set(active.map((key) => value[key])).size === active.length;
  });
}

function validCheckpoint(value: unknown, actorId: string, live: BrowserNpcLiveState | null): value is BrowserNpcLifecycleCheckpoint {
  if (!exactKeys(value, ['schema', 'phase', 'spu', 'scheduler', 'speechOutput', 'blockedReason']) ||
      value.schema !== LIFECYCLE_CHECKPOINT_SCHEMA || !['source-seeded', 'scheduled', 'completed', 'blocked', 'zero-hp-unknown', 'legacy-zero-hp-unknown'].includes(value.phase as string) ||
      (value.phase === 'blocked' ? !sourceCString(value.blockedReason) || value.blockedReason.length === 0 : value.blockedReason !== null)) return false;
  if (value.phase === 'legacy-zero-hp-unknown' || value.phase === 'zero-hp-unknown') {
    return value.spu === null && value.scheduler === null && value.speechOutput === null;
  }
  if (!live) return false;
  if (value.spu === null || value.scheduler === null) return value.phase === 'source-seeded' && value.spu === null && value.scheduler === null && value.speechOutput === null;
  if (value.speechOutput !== null && (!NativeSpeechOutput.validateCheckpoint(value.speechOutput) ||
      (value.speechOutput.channel !== null && value.speechOutput.channel.id !== actorId + ':death-speech-channel') ||
      (value.speechOutput.sound !== null && value.speechOutput.sound.id !== actorId + ':death-speech-sound'))) return false;
  if (!exactKeys(value.spu, ['self', 'frames', 'frameCount', 'task', 'localCallback', 'taskMilliseconds', 'stateMilliseconds',
      'detectingTask', 'detectedTask', 'activeInstruction']) || !exactKeys(value.scheduler, ['waitElapsedMilliseconds',
      'waitDurationMilliseconds', 'instructionEntity', 'instructionTarget', 'taskCallbackMilliseconds', 'localCallbackMilliseconds',
      'localTimeScale', 'lastFrameTimestamp', 'audioChannel'])) return false;
  const s = value.spu, timers = value.scheduler;
  const task = (name: unknown): boolean => name === '' || DEATH_STATES.includes(name as string) || DEATH_LOOPS.includes(name as string);
  if (s.self !== actorId || !Array.isArray(s.frames) || s.frames.length !== 5 || s.frameCount !== 1 ||
      !task(s.task) || s.localCallback !== '' || s.detectingTask !== false || s.detectedTask !== '' || s.activeInstruction !== null ||
      !float32(s.taskMilliseconds) || !float32(s.stateMilliseconds) || s.frames.some((frame) =>
        !exactKeys(frame, ['position', 'script', 'begin', 'object', 'callback', 'timeMilliseconds']) ||
        !nonnegativeInt32(frame.position) || frame.position > 2 || !task(frame.script) || typeof frame.begin !== 'boolean' ||
        frame.object !== null || frame.callback !== '' || !float32(frame.timeMilliseconds))) return false;
  if (s.frames.slice(1).some((frame) => frame.script !== '' || frame.position !== 0 || frame.begin !== true || frame.timeMilliseconds !== 1000)) return false;
  // ProcessScript copies timers to the PS only at its end. A blocked prefix
  // retains advanced SPU clocks/label positions and the earlier PS values.
  if (s.task !== live.routine.CurrentTask || s.frames[0].script !== live.routine.CurrentState) return false;
  if (value.phase !== 'source-seeded' && !DEATH_STATES.includes(s.task as string)) return false;
  if (value.phase === 'completed' && !DEATH_LOOPS.includes(s.frames[0].script)) return false;
  if (![timers.instructionEntity, timers.instructionTarget].every((id) => id === null || id === actorId || id === HERO_SOURCE_ID) ||
      timers.audioChannel !== (value.speechOutput?.channel?.id ?? null) || !uint32(timers.lastFrameTimestamp)) return false;
  return ['waitElapsedMilliseconds', 'localTimeScale'].every((key) => float32(timers[key])) &&
    ['waitDurationMilliseconds', 'taskCallbackMilliseconds', 'localCallbackMilliseconds'].every((key) => timers[key] === null || float32(timers[key]));
}

function initialPlunderSeed(): number {
  const seed = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(seed)[0]!;
  return (Date.now() ^ Math.floor(Math.random() * 0x1_0000_0000)) >>> 0;
}

function isGeneratedPlunderState(value: unknown): value is BrowserGeneratedPlunderState {
  if (!isRecord(value) || value.status !== 'browser-generated-records-not-cache-in-inventory' ||
      !Array.isArray(value.stacks) || value.stacks.length > 327_680) return false;
  return value.stacks.every((stack) => isRecord(stack) && Number.isInteger(stack.treasureSetSlot) &&
    (stack.treasureSetSlot as number) >= 1 && (stack.treasureSetSlot as number) <= 5 &&
    typeof stack.treasureSetName === 'string' && typeof stack.treasureSetGuid20 === 'string' &&
    /^[a-f0-9]{40}$/i.test(stack.treasureSetGuid20) && typeof stack.treasureSetSourcePath === 'string' &&
    typeof stack.treasureSetSourceSha256 === 'string' && /^[a-f0-9]{64}$/i.test(stack.treasureSetSourceSha256) &&
    typeof stack.itemName === 'string' && typeof stack.itemGuid20 === 'string' && /^[a-f0-9]{40}$/i.test(stack.itemGuid20) &&
    typeof stack.itemSourcePath === 'string' && typeof stack.itemSourceSha256 === 'string' &&
    /^[a-f0-9]{64}$/i.test(stack.itemSourceSha256) && nonnegativeInt32(stack.configuredAmount) &&
    (stack.configuredAmount as number) > 0 && nonnegativeInt32(stack.amount) && (stack.amount as number) > 0 &&
    stack.amount <= stack.configuredAmount && stack.creationQuality === 0 && stack.createItemsFlag === true);
}

function sourceReference(person: ScenePerson): { path: string; entityIndex: number } {
  const match = /^.+ :: (.+) # entity (\d+)$/.exec(person.source);
  if (!match || !match[1]) throw new Error('Scene character source reference is not in the reviewed archive/path/entity form.');
  const entityIndex = Number(match[2]);
  if (!Number.isSafeInteger(entityIndex) || entityIndex < 0) throw new Error('Scene character source entity index is invalid.');
  return { path: match[1], entityIndex };
}

function slotProxy(properties: readonly unknown[], name: 'Template' | 'Item'): string {
  const matching = properties.filter((entry) => isRecord(entry) && entry.name === name);
  if (matching.length !== 1 || !isRecord(matching[0]) || matching[0].status !== 'decoded' ||
      !isRecord(matching[0].value)) {
    throw new Error(`Native inventory slot ${name} proxy is missing, undecoded or ambiguous.`);
  }
  const value = matching[0].value;
  if (value.present !== true || typeof value.rawGuid20 !== 'string' || !/^[a-f0-9]{40}$/i.test(value.rawGuid20)) {
    throw new Error(`Native inventory slot ${name} proxy is not one present 20-byte identity.`);
  }
  return value.rawGuid20.toLowerCase();
}

/** Read only the serialized inventory slot identities. Dynamic treasure sets,
 * item construction and slot attachment remain separate cache-in operations. */
function readSerializedEquipmentSlots(entity: NativeEntityRecord): NativeNpcSerializedEquipmentSlotRefs {
  const sets = entity.propertySets.filter((set) => set.name === 'gCInventory_PS');
  if (sets.length !== 1) return { status: 'unknown', reason: 'Native gCInventory_PS is missing or ambiguous.' };
  const tail = sets[0]!.tail;
  if (!tail || tail.status !== 'decoded' || !isRecord(tail.value) ||
      !Number.isSafeInteger(tail.value.slotCount) || !Array.isArray(tail.value.slots) ||
      tail.value.slotCount !== tail.value.slots.length || tail.value.slots.length > 256) {
    return { status: 'unknown', reason: 'Native serialized inventory slot tail is not completely decoded.' };
  }
  try {
    const slots = tail.value.slots.map((raw, index) => {
      if (!isRecord(raw) || raw.index !== index || typeof raw.empty !== 'boolean') {
        throw new Error('Native serialized inventory slot indices are incomplete or out of order.');
      }
      if (raw.empty) return null;
      const record = raw.record;
      if (!isRecord(record) || record.name !== 'gCInventorySlot' || !Array.isArray(record.properties)) {
        throw new Error('Native nonempty inventory slot has no decoded gCInventorySlot record.');
      }
      return Object.freeze({ index, templateGuid20: slotProxy(record.properties, 'Template'),
        itemGuid20: slotProxy(record.properties, 'Item') });
    }).filter((slot): slot is NonNullable<typeof slot> => slot !== null);
    return { status: 'resolved', slots: Object.freeze(slots) };
  } catch (error) {
    return { status: 'unknown', reason: error instanceof Error ? error.message : String(error) };
  }
}

function readSerializedInventoryStackCount(entity: NativeEntityRecord): number | null {
  const sets = entity.propertySets.filter((set) => set.name === 'gCInventory_PS');
  if (sets.length !== 1) return null;
  const tail = sets[0]!.tail;
  if (!tail || tail.status !== 'decoded' || !isRecord(tail.value) ||
      !Number.isSafeInteger(tail.value.stackListVersion) || !Array.isArray(tail.value.stacks) ||
      tail.value.stacks.length > 327_680) return null;
  return tail.value.stacks.length;
}

async function resolveSerializedEquipmentSlots(refs: NativeNpcSerializedEquipmentSlotRefs,
  world: CombatWorldSource): Promise<NativeNpcSerializedEquipmentSlots> {
  if (refs.status === 'unknown') return refs;
  try {
    const slots = await Promise.all(refs.slots.map(async (slot) => {
      const header = indexedUnique(await world.templateByGuidWithSource(slot.templateGuid20),
        'serialized inventory slot template ' + slot.templateGuid20);
      const source = header.source;
      if (header.guid?.toLowerCase() !== slot.templateGuid20 || !header.name || !source?.path ||
          !/^[a-f0-9]{64}$/i.test(source.sha256)) {
        throw new Error('Serialized inventory slot template source identity is incomplete.');
      }
      const template = indexedUnique(await world.template(header), header.name);
      if (template.guid?.toLowerCase() !== slot.templateGuid20) {
        throw new Error('Serialized inventory slot template payload identity differs from its index.');
      }
      const robe = slot.index === 17
        ? sourceValue(template, 'gCItem_PS', 'Robe', (value): value is boolean => typeof value === 'boolean')
        : null;
      return Object.freeze({ ...slot, templateName: header.name,
        templateSourcePath: source.path, templateSourceSha256: source.sha256, robe });
    }));
    return { status: 'resolved', slots: Object.freeze(slots) };
  } catch (error) {
    return { status: 'unknown', reason: error instanceof Error ? error.message : String(error) };
  }
}

function indexedUnique<T>(result: SourceLookup<T>, label: string): T {
  if (result.kind !== 'found') throw new Error(result.kind === 'missing'
    ? result.reason
    : `Native ${label} has ${result.candidates.length} matching source records.`);
  return result.value;
}

export async function loadNativeInventoryTemplate(world: NativeInventoryTemplateWorldSource, guid: string, expected?: {
  readonly name: string; readonly sourcePath: string; readonly sourceSha256: string;
}): Promise<InventoryTemplate> {
  const header = indexedUnique(await world.templateByGuidWithSource(guid), `inventory item ${guid}`);
  const source = header.source;
  if (header.guid?.toLowerCase() !== guid.toLowerCase() || !source?.path ||
      !/^[a-f0-9]{64}$/i.test(source.sha256) ||
      (expected && (header.name !== expected.name || source.path !== expected.sourcePath ||
        source.sha256 !== expected.sourceSha256))) {
    throw new Error('Inventory item template does not match its exact hash-checked source reference.');
  }
  const entity = indexedUnique(await world.template(header), header.name);
  if (entity.guid?.toLowerCase() !== guid.toLowerCase() || entity.name !== header.name) {
    throw new Error('Inventory item template payload differs from its indexed identity.');
  }
  const interactionSets = entity.propertySets.filter((set) => set.name === 'gCInteraction_PS');
  const itemSets = entity.propertySets.filter((set) => set.name === 'gCItem_PS');
  if (interactionSets.length > 1 || itemSets.length > 1) throw new Error('Inventory item has duplicate source property sets.');
  const useType = interactionSets.length ? sourceValue(entity, 'gCInteraction_PS', 'UseType', int32) : 0;
  const itemPropertySetPresent = itemSets.length === 1;
  const category = itemPropertySetPresent ? sourceValue(entity, 'gCItem_PS', 'Category', int32) : 0;
  const permanent = itemPropertySetPresent
    ? sourceValue(entity, 'gCItem_PS', 'Permanent', (value): value is boolean => typeof value === 'boolean') : null;
  const missionItem = itemPropertySetPresent
    ? sourceValue(entity, 'gCItem_PS', 'MissionItem', (value): value is boolean => typeof value === 'boolean') : null;
  const skillGuid20 = itemPropertySetPresent ? sourceProxyGuid(entity, 'gCItem_PS', 'Skill') : null;
  const spellGuid20 = itemPropertySetPresent ? sourceProxyGuid(entity, 'gCItem_PS', 'Spell') : null;
  return Object.freeze({ name: header.name, guid20: guid.toLowerCase(), useType, category,
    permanent, missionItem, skillGuid20, spellGuid20, itemPropertySetPresent,
    source: Object.freeze({ path: source.path, sha256: source.sha256 }) });
}

interface ExpectedNpcInventoryStack {
  readonly itemGuid20: string;
  readonly name: string;
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly quality: number;
  readonly stackType: 0;
  initialAmount: number;
}

function npcInventoryStackKey(guid: string, quality: number, stackType: number): string {
  return `${guid.toLowerCase()}:${quality | 0}:${stackType | 0}`;
}

function expectedNpcInventoryStacks(plunder: BrowserGeneratedPlunderState,
  resolutions: readonly BrowserNpcTreasureSetResolution[]): Map<string, ExpectedNpcInventoryStack> {
  const expected = new Map<string, ExpectedNpcInventoryStack>();
  const add = (entry: Omit<ExpectedNpcInventoryStack, 'initialAmount'>, amount: number,
    mode: 'add' | 'assure') => {
    if (!nonnegativeInt32(amount) || amount < 1 || !/^[a-f0-9]{40}$/i.test(entry.itemGuid20) ||
        !/^[a-f0-9]{64}$/i.test(entry.sourceSha256) || !entry.name || !entry.sourcePath) {
      throw new Error('NPC treasure inventory recipe has incomplete source identity or amount.');
    }
    const key = npcInventoryStackKey(entry.itemGuid20, entry.quality, entry.stackType);
    const existing = expected.get(key);
    if (existing) {
      if (existing.name !== entry.name || existing.sourcePath !== entry.sourcePath ||
          existing.sourceSha256 !== entry.sourceSha256) {
        throw new Error('NPC treasure recipes disagree about one item template identity.');
      }
      existing.initialAmount = mode === 'add' ? existing.initialAmount + amount
        : Math.max(existing.initialAmount, amount);
    } else {
      expected.set(key, { ...entry, initialAmount: amount });
    }
  };

  for (const stack of plunder.stacks) {
    add({ itemGuid20: stack.itemGuid20, name: stack.itemName, sourcePath: stack.itemSourcePath,
      sourceSha256: stack.itemSourceSha256, quality: stack.creationQuality, stackType: 0 }, stack.amount, 'add');
  }
  for (const resolution of resolutions) {
    if (resolution.status === 'unresolved') continue;
    if (resolution.distribution !== 3) continue;
    if (resolution.status !== 'weaponry-recipe-resolved') {
      throw new Error('NPC Weaponry source was not completely resolved.');
    }
    for (const stack of resolution.weaponry) {
      if (stack.treasureSetName !== resolution.name || stack.treasureSetGuid20 !== resolution.guid20 ||
          stack.treasureSetSourcePath !== resolution.sourcePath || stack.treasureSetSourceSha256 !== resolution.sourceSha256) {
        throw new Error('NPC Weaponry recipe differs from its hash-checked treasure-set identity.');
      }
      add({ itemGuid20: stack.itemGuid20, name: stack.itemName, sourcePath: stack.itemSourcePath,
        sourceSha256: stack.itemSourceSha256, quality: stack.inventoryQuality, stackType: 0 },
      stack.configuredAmount, 'assure');
    }
  }
  return expected;
}

function validateSavedNpcInventory(snapshot: NativeInventorySnapshot,
  expected: ReadonlyMap<string, ExpectedNpcInventoryStack>): void {
  if (snapshot.equipment.length !== 0) throw new Error('NPC inventory save contains equipment not applied by this browser runtime.');
  const seen = new Set<string>();
  for (const stack of snapshot.stacks) {
    const key = npcInventoryStackKey(stack.templateGuid20, stack.quality, stack.stackType);
    const source = expected.get(key);
    if (!source || seen.has(key) || stack.templateName !== source.name || stack.amount > source.initialAmount ||
        stack.linkedSlot !== 0 || stack.physicalItemGuid20 !== null) {
      throw new Error('Saved NPC inventory contains a stack outside the source-derived Plunder and Weaponry state.');
    }
    seen.add(key);
  }
}

async function buildNpcInventory(plunder: BrowserGeneratedPlunderState,
  resolutions: readonly BrowserNpcTreasureSetResolution[], world: CombatWorldSource,
  restored?: NativeInventorySnapshot): Promise<{ inventory: NativeInventory; weaponryEquipPlans: readonly BrowserNpcWeaponryEquipPlan[] }> {
  const expected = expectedNpcInventoryStacks(plunder, resolutions);
  if (restored) validateSavedNpcInventory(restored, expected);
  const templateSources = new Map<string, { name: string; sourcePath: string; sourceSha256: string }>();
  for (const entry of expected.values()) {
    const source = { name: entry.name, sourcePath: entry.sourcePath, sourceSha256: entry.sourceSha256 };
    const existing = templateSources.get(entry.itemGuid20);
    if (existing && (existing.name !== source.name || existing.sourcePath !== source.sourcePath ||
        existing.sourceSha256 !== source.sourceSha256)) {
      throw new Error('NPC treasure recipes assign conflicting source identity to one item GUID.');
    }
    templateSources.set(entry.itemGuid20, source);
  }
  const templates = await Promise.all([...templateSources.entries()]
    .map(([guid, source]) => loadNativeInventoryTemplate(world, guid, source)));
  // No NPC inventory UI listeners are attached in this browser milestone.
  // [] describes that TypeScript host state; it does not certify the original
  // engine's global listener registry or future trade callbacks.
  const inventory = restored
    ? NativeInventory.fromSnapshot(templates, restored, { observers: [] })
    : new NativeInventory(templates, { observers: [] });
  if (!restored) {
    for (const stack of plunder.stacks) {
      // Distribution-0 generation calls the GUID CreateItems overload with
      // quality 0 and the drawn amount.
      const result = inventory.createItems(stack.itemGuid20, stack.creationQuality, stack.amount, 0);
      if (result.status !== 'applied') throw new Error(result.reason);
    }
    for (const resolution of resolutions) {
      if (resolution.status === 'unresolved') continue;
      if (resolution.distribution !== 3 || resolution.status !== 'weaponry-recipe-resolved') continue;
      for (const stack of resolution.weaponry) {
        // Script_Game:100ced90 ensures at least the configured count in the
        // NPC inventory using the source item quality with the native weapon
        // quality bit, then asks EquipStack to attach it to the actor.
        const result = inventory.assureItems(stack.itemGuid20, stack.inventoryQuality, stack.configuredAmount);
        if (result.status !== 'applied') throw new Error(result.reason);
      }
    }
  }

  const weaponryEquipPlans: BrowserNpcWeaponryEquipPlan[] = [];
  for (const resolution of resolutions) {
    if (resolution.status === 'unresolved') continue;
    if (resolution.distribution !== 3 || resolution.status !== 'weaponry-recipe-resolved') continue;
    for (const stack of resolution.weaponry) {
      if (stack.useType === 2) {
        weaponryEquipPlans.push(Object.freeze({ status: 'two-hand-split-required',
          treasureSetSlot: resolution.treasureSetSlot, treasureSetName: resolution.name,
          itemName: stack.itemName, itemGuid20: stack.itemGuid20,
          reason: 'Native EquipWeaponry splits one stack and links the two-hand item to slots 6 and 5.' }));
        continue;
      }
      const stackIndex = inventory.findStackIndex(stack.itemGuid20, 1, stack.inventoryQuality);
      if (stackIndex < 0) continue; // A saved actor may have consumed/transferred this stack.
      const result = inventory.planEquipStack(stackIndex);
      if (result.status !== 'applied') throw new Error(result.reason);
      if (!result.value) throw new Error('Native EquipStack did not return a plan for its resolved Weaponry item.');
      weaponryEquipPlans.push(Object.freeze({ status: 'single-stack-plan', treasureSetSlot: resolution.treasureSetSlot,
        treasureSetName: resolution.name, itemName: stack.itemName, itemGuid20: stack.itemGuid20,
        stackIndex, plan: result.value }));
    }
  }
  return { inventory, weaponryEquipPlans: Object.freeze(weaponryEquipPlans) };
}

async function loadNpcFacts(person: ScenePerson, world: CombatWorldSource): Promise<NativeNpcSourceFacts> {
  const sourceRef = sourceReference(person);
  const source: NativeSourceFile = indexedUnique(await world.sourceByPath(sourceRef.path), sourceRef.path);
  const rows = (await world.entityIndex(source.index)).filter((row) =>
    row.guid?.toLowerCase() === person.id.toLowerCase() && row.name === person.name && row.entityIndex === sourceRef.entityIndex);
  if (rows.length !== 1) throw new Error(`Scene character ${person.name} does not resolve to one exact native entity-index row.`);
  const entity = indexedUnique(await world.entity(rows[0]!), person.name);
  if (entity.guid?.toLowerCase() !== person.id.toLowerCase() || entity.name !== person.name ||
      !Array.isArray(entity.propertySets)) throw new Error('Loaded NPC source identity differs from the scene actor.');
  for (const required of ['gCNPC_PS', 'gCScriptRoutine_PS', 'gCNavigation_PS', 'gCDamageReceiver_PS', 'gCInventory_PS']) {
    if (!uniqueSet(entity, required)) throw new Error(`Native ${required} source set is missing or ambiguous for ${person.name}.`);
  }

  const level = sourceValue(entity, 'gCNPC_PS', 'Level', nonnegativeInt32);
  const levelMax = sourceValue(entity, 'gCNPC_PS', 'LevelMax', nonnegativeInt32);
  const species = sourceValue(entity, 'gCNPC_PS', 'Species', int32);
  const npcType = sourceValue(entity, 'gCNPC_PS', 'Type', int32);
  const politicalAlignment = sourceValue(entity, 'gCNPC_PS', 'PoliticalAlignment', int32);
  const statusEffects = sourceValue(entity, 'gCNPC_PS', 'StatusEffects', nonnegativeInt32);
  const serializedInventoryStackCount = readSerializedInventoryStackCount(entity);
  const routineAction = sourceValue(entity, 'gCScriptRoutine_PS', 'Action', int32);
  const routineAniState = sourceValue(entity, 'gCScriptRoutine_PS', 'AniState', int32);
  const routineStatePosition = sourceValue(entity, 'gCScriptRoutine_PS', 'StatePosition', int32);
  const routineAiMode = sourceValue(entity, 'gCScriptRoutine_PS', 'AIMode', int32);
  const treasureSets = Object.freeze([1, 2, 3, 4, 5].map((slot) =>
    sourceValue(entity, 'gCInventory_PS', 'TreasureSet' + slot, (value): value is string => typeof value === 'string')));
  const serializedEquipmentSlots = await resolveSerializedEquipmentSlots(readSerializedEquipmentSlots(entity), world);
  const armorSlot = serializedEquipmentSlots.status === 'resolved'
    ? serializedEquipmentSlots.slots.find((slot) => slot.index === 17) : undefined;
  const armorIsRobe: NativeKnowledge<boolean> = armorSlot && armorSlot.robe !== null
    ? Object.freeze({ status: 'known', value: armorSlot.robe,
      source: `template:${armorSlot.templateGuid20}:${armorSlot.templateSourcePath}@${armorSlot.templateSourceSha256}:gCItem_PS.Robe` })
    : Object.freeze({ status: 'unknown', reason: armorSlot
      ? 'Native slot17 item template does not provide a decoded Robe value.'
      : 'Native slot17 armor template is absent or unresolved.' });
  const attacker = sourceProperty(entity, 'gCNPC_PS', 'CurrentAttackerEntity');
  if (attacker.kind !== 'found' || !isRecord(attacker.value) || typeof attacker.value.present !== 'boolean' ||
      (attacker.value.rawGuid20 !== null && (typeof attacker.value.rawGuid20 !== 'string' ||
        !/^[a-f0-9]{40}$/i.test(attacker.value.rawGuid20)))) {
    throw new Error(attacker.kind === 'missing' ? attacker.reason
      : attacker.kind === 'ambiguous' ? 'Native CurrentAttackerEntity source value is ambiguous.'
      : 'Native CurrentAttackerEntity source value is malformed.');
  }
  if (attacker.value.present !== (typeof attacker.value.rawGuid20 === 'string')) {
    throw new Error('Native CurrentAttackerEntity presence and PropertyID disagree.');
  }
  const serializedPoints: NativeNpcSerializedPoints = {
    hitPoints: sourceValue(entity, 'gCDamageReceiver_PS', 'HitPoints', nonnegativeInt32),
    hitPointsMax: sourceValue(entity, 'gCDamageReceiver_PS', 'HitPointsMax', nonnegativeInt32),
    stamina: sourceValue(entity, 'gCDamageReceiver_PS', 'StaminaPoints', nonnegativeInt32),
    staminaMax: sourceValue(entity, 'gCDamageReceiver_PS', 'StaminaPointsMax', nonnegativeInt32),
  };
  return Object.freeze({ personId: person.id, name: person.name, sourcePath: sourceRef.path,
    sourceFileIndex: source.index, sourceSha256: source.source.sha256, level, levelMax, species, npcType, politicalAlignment,
    statusEffects, serializedInventoryStackCount, routineAction, routineAniState, routineStatePosition, routineAiMode, armorIsRobe,
    currentAttackerId: typeof attacker.value.rawGuid20 === 'string' ? attacker.value.rawGuid20.toLowerCase() : null,
    treasureSets, serializedEquipmentSlots, lifecycleSource: readLifecycleSource(entity),
    navigationValid: true, serializedPoints: Object.freeze(serializedPoints) });
}

function validSavedActor(value: unknown): value is BrowserArdeaNpcCombatSessionSave['actors'][number] {
  return isRecord(value) && typeof value.personId === 'string' && /^[a-f0-9]{40}$/i.test(value.personId) &&
    typeof value.sourcePath === 'string' && value.sourcePath.length > 0 &&
    typeof value.sourceSha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sourceSha256) &&
    nonnegativeInt32(value.hitPoints) && nonnegativeInt32(value.stamina) &&
    (value.generatedPlunder === undefined || isGeneratedPlunderState(value.generatedPlunder)) &&
    (value.inventory === undefined || (isRecord(value.inventory) && Array.isArray(value.inventory.stacks) &&
      Array.isArray(value.inventory.equipment) && Array.isArray(value.inventory.unresolvedEffects) &&
      (value.inventory.observerRegistry === 'complete' || value.inventory.observerRegistry === 'unresolved')));
}

function validateGeneratedPlunder(saved: BrowserGeneratedPlunderState,
  resolutions: readonly BrowserNpcTreasureSetResolution[]): void {
  for (let slot = 1; slot <= 5; slot++) {
    const resolution = resolutions.find((entry) => entry.treasureSetSlot === slot);
    const stacks = saved.stacks.filter((stack) => stack.treasureSetSlot === slot);
    if (!resolution || resolution.status === 'unresolved' || resolution.distribution !== 0) {
      if (stacks.length) throw new Error('Saved Plunder stacks reference a source slot without a resolved distribution-0 treasure set.');
      continue;
    }
    if (resolution.status !== 'plunder-source-resolved') throw new Error('Saved Plunder source set has an unsupported resolution status.');
    const min = resolution.minimumTransferStacks;
    const max = resolution.maximumTransferStacks;
    const lower = min === max ? (min < 1 ? 1 : min) : Math.min(min, max);
    const upper = min === max ? lower : Math.max(min, max);
    if (stacks.length > 0 ? stacks.length < Math.max(1, lower) || stacks.length > upper
      : lower > 0 && upper >= lower) {
      throw new Error('Saved Plunder stack count is outside the source treasure-set transfer range.');
    }
    for (const stack of stacks) {
      if (stack.treasureSetName !== resolution.name || stack.treasureSetGuid20 !== resolution.guid20 ||
          stack.treasureSetSourcePath !== resolution.sourcePath || stack.treasureSetSourceSha256 !== resolution.sourceSha256) {
        throw new Error('Saved Plunder stack belongs to a different hash-checked treasure-set source.');
      }
      const candidate = resolution.plunderCandidates.find((entry) => entry.itemGuid20 === stack.itemGuid20);
      if (!candidate || stack.itemName !== candidate.itemName || stack.itemSourcePath !== candidate.itemSourcePath ||
          stack.itemSourceSha256 !== candidate.itemSourceSha256 || stack.configuredAmount !== candidate.configuredAmount) {
        throw new Error('Saved Plunder stack differs from its hash-checked source item template.');
      }
      const half = Math.floor(candidate.configuredAmount / 2);
      if (stack.amount < (candidate.configuredAmount > 1 ? half : candidate.configuredAmount)) {
        throw new Error('Saved Plunder amount is outside the native source draw interval.');
      }
    }
  }
}

/** Browser-owned mutable combat-state bridge for Ardea's source actors.
 *
 * This resolves each rendered person to one hash-checked source entity and
 * applies the exact HP/stamina refresh arithmetic at first contact. It does
 * not construct or activate the original engine entity, choose its native
 * processing radius, accept native collision, run AI tasks, or apply damage.
 */
export class BrowserArdeaNpcCombatRuntime {
  private readonly peopleById = new Map<string, ScenePerson>();
  private readonly actors = new Map<string, BrowserArdeaNpcCombatState>();
  private readonly initializing = new Map<string, Promise<BrowserArdeaNpcCombatState>>();
  private plunderRandomState: number;
  private retainedDeathGlobals: Readonly<Record<string, number>> | undefined;
  private retainedDeathPlayingTimeSeconds = 0;

  constructor(people: readonly ScenePerson[], private readonly world: CombatWorldSource = new NativeWorldData(),
    plunderSeed = initialPlunderSeed()) {
    if (!uint32(plunderSeed)) throw new Error('Browser Plunder seed must be an unsigned 32-bit integer.');
    this.plunderRandomState = plunderSeed;
    for (const person of people) {
      const id = person.id.toLowerCase();
      if (!/^[a-f0-9]{40}$/i.test(person.id) || this.peopleById.has(id)) {
        throw new Error('Ardea combat people need unique native 20-byte scene identities.');
      }
      this.peopleById.set(id, person);
    }
  }

  get(personId: string): BrowserArdeaNpcCombatState | null {
    return this.actors.get(personId.toLowerCase()) ?? null;
  }

  async initializeOnContact(personId: string, playerLevel: number,
    difficulty: NativeDifficulty): Promise<BrowserArdeaNpcCombatState> {
    return this.initializeActor(personId, playerLevel, difficulty);
  }

  private initializeActor(personId: string, playerLevel: number, difficulty: NativeDifficulty,
    restoredPlunder?: BrowserGeneratedPlunderState, restoredInventory?: NativeInventorySnapshot): Promise<BrowserArdeaNpcCombatState> {
    const id = personId.toLowerCase();
    const existing = this.actors.get(id);
    if (existing) return Promise.resolve(existing);
    const pending = this.initializing.get(id);
    if (pending) return pending;
    const operation = this.buildActor(id, playerLevel, difficulty, restoredPlunder, restoredInventory).finally(() => {
      this.initializing.delete(id);
    });
    this.initializing.set(id, operation);
    return operation;
  }

  private async buildActor(id: string, playerLevel: number, difficulty: NativeDifficulty,
    restoredPlunder?: BrowserGeneratedPlunderState, restoredInventory?: NativeInventorySnapshot): Promise<BrowserArdeaNpcCombatState> {
    const person = this.peopleById.get(id);
    if (!person) throw new Error('Combat contact does not identify a placed Ardea source person.');
    const facts = await loadNpcFacts(person, this.world);
    const treasureSetResolutions: BrowserNpcTreasureSetResolution[] = [];
    const generatedPlunder: NativeGeneratedPlunderStack[] = [];
    for (const [index, treasureSetName] of facts.treasureSets.entries()) {
      if (!treasureSetName) continue;
      let resolution: NativeTreasureSetResolution;
      try {
        resolution = await loadNativeTreasureSet(treasureSetName, facts.personId, this.world);
      } catch (error) {
        treasureSetResolutions.push(Object.freeze({ status: 'unresolved', treasureSetSlot: index + 1, name: treasureSetName,
          reason: error instanceof Error ? error.message : String(error) }));
        continue;
      }
      treasureSetResolutions.push(Object.freeze({ ...resolution, treasureSetSlot: index + 1 }));
      if (!restoredPlunder && resolution.distribution === 0) {
        generatedPlunder.push(...generateNativePlunder(resolution, index + 1, () => this.nextPlunderRand()));
      }
    }
    const plunderState = restoredPlunder ?? Object.freeze({
      status: 'browser-generated-records-not-cache-in-inventory' as const,
      stacks: Object.freeze(generatedPlunder),
    });
    validateGeneratedPlunder(plunderState, treasureSetResolutions);
    const { inventory, weaponryEquipPlans } = await buildNpcInventory(plunderState,
      treasureSetResolutions, this.world, restoredInventory);
    const initialized = initializeNativeNpcOnProcessingRange({ isPlayer: false, rawLevel: facts.level,
      rawLevelMax: facts.levelMax, species: facts.species }, facts.serializedPoints, playerLevel, difficulty);
    if (initialized.status !== 'resolved') throw new Error(initialized.reason);
    const state: BrowserArdeaNpcCombatState = {
      personId: facts.personId, name: facts.name, sourcePath: facts.sourcePath,
      sourceFileIndex: facts.sourceFileIndex, sourceSha256: facts.sourceSha256,
      rawLevel: facts.level, rawLevelMax: facts.levelMax, species: facts.species, npcType: facts.npcType,
      politicalAlignment: facts.politicalAlignment,
      statusEffects: facts.statusEffects, serializedInventoryStackCount: facts.serializedInventoryStackCount,
      routineAction: facts.routineAction,
      routineAniState: facts.routineAniState, routineStatePosition: facts.routineStatePosition,
      routineAiMode: facts.routineAiMode,
      currentAttackerId: facts.currentAttackerId, armorIsRobe: facts.armorIsRobe, treasureSets: facts.treasureSets,
      lifecycleSource: facts.lifecycleSource,
      liveState: facts.lifecycleSource.status === 'source-resolved' ? structuredClone(facts.lifecycleSource.seed) : null,
      lifecycleCheckpoint: facts.lifecycleSource.status === 'source-resolved' ? {
        schema: LIFECYCLE_CHECKPOINT_SCHEMA, phase: 'source-seeded', spu: null, scheduler: null, speechOutput: null, blockedReason: null,
      } : null,
      serializedEquipmentSlots: facts.serializedEquipmentSlots,
      treasureSetResolutions: Object.freeze(treasureSetResolutions),
      generatedPlunder: plunderState,
      inventory,
      weaponryEquipPlans,
      navigationValid: facts.navigationValid, damageReceiverValid: true,
      initialization: 'browser-source-processing-range-state', processingRange: initialized.value,
      hitPoints: initialized.value.hitPoints, stamina: initialized.value.stamina,
    };
    // Inventory build above succeeded; this live browser inventory now owns the
    // generated records. The immutable source flag remains available separately.
    if (state.liveState) state.liveState.inventory.GeneratedPlunder = true;
    this.actors.set(id, state);
    return state;
  }

  private nextPlunderRand(): number {
    this.plunderRandomState = (Math.imul(this.plunderRandomState, 0x343fd) + 0x269ec3) >>> 0;
    return (this.plunderRandomState >>> 16) & 0x7fff;
  }

  /** Browser-owned stand-in for the session's Entity::GetRandomNumber bound
   * call. It shares the persisted C-runtime-compatible stream used by native
   * treasure generation; its seed and global call order are not the game's. */
  nextGameRandomNumber(upperBound: number): number {
    if (!Number.isInteger(upperBound) || upperBound < 0 || upperBound > 0x7fffffff) {
      throw new RangeError('Native random upper bound must be a nonnegative int32.');
    }
    return upperBound < 2 ? 0 : this.nextPlunderRand() % upperBound;
  }

  /** One raw 15-bit draw for the distribution-7 treasure helper. */
  nextPickpocketRawRandom(): number { return this.nextPlunderRand(); }

  deathGlobals(): Readonly<Record<string, number>> | undefined {
    return this.retainedDeathGlobals === undefined ? undefined : Object.freeze({ ...this.retainedDeathGlobals });
  }

  setDeathGlobals(value: Readonly<Record<string, number>>): void {
    if (!validDeathGlobals(value)) throw new Error('Unsupported browser death module globals.');
    this.retainedDeathGlobals = Object.freeze({ ...value });
  }

  deathPlayingTimeSeconds(): number { return this.retainedDeathPlayingTimeSeconds; }

  setDeathPlayingTimeSeconds(value: number): void {
    if (!float32(value) || value < 0) throw new Error('Browser death playing time must be nonnegative finite float32.');
    this.retainedDeathPlayingTimeSeconds = value;
  }

  saveData(): BrowserArdeaNpcCombatSessionSave {
    return Object.freeze({ schema: SESSION_SCHEMA,
      plunderRandom: Object.freeze({ algorithm: PLUNDER_RANDOM_ALGORITHM, state: this.plunderRandomState }),
      ...(this.retainedDeathGlobals === undefined ? {} : { deathGlobals: this.deathGlobals() }),
      deathPlayingTimeSeconds: this.retainedDeathPlayingTimeSeconds,
      actors: Object.freeze([...this.actors.values()].map((actor) =>
      Object.freeze({ personId: actor.personId, sourcePath: actor.sourcePath, sourceSha256: actor.sourceSha256,
        hitPoints: actor.hitPoints, stamina: actor.stamina, generatedPlunder: actor.generatedPlunder,
        inventory: actor.inventory.snapshot(), liveState: structuredClone(actor.liveState),
        lifecycleCheckpoint: actor.hitPoints === 0 && (actor.lifecycleCheckpoint === null || actor.lifecycleCheckpoint.phase === 'source-seeded')
          ? { schema: LIFECYCLE_CHECKPOINT_SCHEMA, phase: 'zero-hp-unknown', spu: null, scheduler: null, speechOutput: null, blockedReason: null } as const
          : structuredClone(actor.lifecycleCheckpoint) }))) });
  }

  async restore(value: unknown, playerLevel: number, difficulty: NativeDifficulty): Promise<BrowserArdeaNpcRestoreResult> {
    const isLegacy = isRecord(value) && value.schema === LEGACY_SESSION_SCHEMA;
    const isPreLifecycle = isRecord(value) && value.schema === PRE_LIFECYCLE_SESSION_SCHEMA;
    const hasLifecycle = isRecord(value) && value.schema === SESSION_SCHEMA;
    if (!isRecord(value) || (!hasLifecycle && !isPreLifecycle && !isLegacy) || !Array.isArray(value.actors) ||
        value.actors.length > this.peopleById.size || !value.actors.every(validSavedActor) ||
        new Set(value.actors.map((actor) => actor.personId.toLowerCase())).size !== value.actors.length ||
        (value.plunderRandom !== undefined && (!isRecord(value.plunderRandom) ||
          value.plunderRandom.algorithm !== PLUNDER_RANDOM_ALGORITHM || !uint32(value.plunderRandom.state))) ||
        (hasLifecycle && ((value.deathGlobals !== undefined && !validDeathGlobals(value.deathGlobals)) ||
          (value.deathPlayingTimeSeconds !== undefined && (!float32(value.deathPlayingTimeSeconds) || value.deathPlayingTimeSeconds < 0)) ||
          value.actors.some((actor) => !Object.hasOwn(actor, 'liveState') || !Object.hasOwn(actor, 'lifecycleCheckpoint'))))) {
      return { restored: 0, skipped: Object.freeze([{ personId: '*', reason: 'Saved NPC combat state has an unsupported schema or shape.' }]) };
    }
    if (!isLegacy && (!isRecord(value.plunderRandom) || !value.actors.every((actor) =>
      actor.generatedPlunder !== undefined && actor.inventory !== undefined))) {
      return { restored: 0, skipped: Object.freeze([{ personId: '*', reason: 'Version-2/3 NPC saves must retain Plunder draws, inventory state and the random stream.' }]) };
    }
    const savedRandom = isRecord(value.plunderRandom) && uint32(value.plunderRandom.state)
      ? value.plunderRandom.state : null;
    // Loading replaces the session, including actors absent from this save.
    // Await outstanding source construction before discarding its old owners.
    await Promise.allSettled([...this.initializing.values()]);
    this.actors.clear();
    if (savedRandom !== null) this.plunderRandomState = savedRandom;
    const skipped: { personId: string; reason: string }[] = [];
    for (const saved of value.actors) {
      try {
        const initialized = await this.initializeActor(saved.personId, playerLevel, difficulty,
          saved.generatedPlunder, isLegacy ? undefined : saved.inventory);
        if (initialized.sourcePath !== saved.sourcePath || initialized.sourceSha256 !== saved.sourceSha256) {
          this.actors.delete(saved.personId.toLowerCase());
          throw new Error('Saved NPC state belongs to a different source file or source hash.');
        }
        if (saved.hitPoints > initialized.processingRange.hitPointsMax ||
            saved.stamina > initialized.processingRange.staminaMax) {
          this.actors.delete(saved.personId.toLowerCase());
          throw new Error('Saved NPC points exceed the re-derived native processing maxima.');
        }
        if (hasLifecycle) {
          const live = saved.liveState;
          const checkpoint = saved.lifecycleCheckpoint;
          if (live === null ? initialized.lifecycleSource.status !== 'unknown'
            : !validLiveState(live, initialized.lifecycleSource)) {
            throw new Error('Saved NPC live lifecycle properties differ from the supported source identity/domain.');
          }
          if (checkpoint === null ? initialized.lifecycleSource.status !== 'unknown'
            : !validCheckpoint(checkpoint, initialized.personId, live)) {
            throw new Error('Saved NPC lifecycle checkpoint is outside the supported source/SPU profile.');
          }
          if ((saved.hitPoints === 0 && checkpoint?.phase === 'source-seeded') ||
              (checkpoint && ['legacy-zero-hp-unknown', 'zero-hp-unknown'].includes(checkpoint.phase) && saved.hitPoints !== 0) ||
              (checkpoint && ['scheduled', 'blocked', 'completed'].includes(checkpoint.phase) && value.deathGlobals === undefined)) {
            throw new Error('Saved NPC lifecycle phase, points and module globals are inconsistent.');
          }
          initialized.liveState = structuredClone(live);
          initialized.lifecycleCheckpoint = structuredClone(checkpoint);
        } else if (saved.hitPoints === 0) {
          // Old HP-only saves cannot establish whether native Kill/quest/XP ran.
          // Preserve zero HP, but never synthesize or replay that missing history.
          initialized.lifecycleCheckpoint = { schema: LIFECYCLE_CHECKPOINT_SCHEMA,
            phase: 'legacy-zero-hp-unknown', spu: null, scheduler: null, speechOutput: null, blockedReason: null };
        }
        initialized.hitPoints = saved.hitPoints;
        initialized.stamina = saved.stamina;
      } catch (error) {
        this.actors.delete(saved.personId.toLowerCase());
        skipped.push({ personId: saved.personId, reason: error instanceof Error ? error.message : String(error) });
      }
    }
    if (savedRandom !== null) this.plunderRandomState = savedRandom;
    if (hasLifecycle) {
      this.retainedDeathGlobals = value.deathGlobals === undefined ? undefined : Object.freeze({ ...value.deathGlobals as Record<string, number> });
      this.retainedDeathPlayingTimeSeconds = value.deathPlayingTimeSeconds as number | undefined ?? 0;
    } else {
      this.retainedDeathGlobals = undefined;
      this.retainedDeathPlayingTimeSeconds = 0;
    }
    return Object.freeze({ restored: value.actors.length - skipped.length, skipped: Object.freeze(skipped) });
  }
}
