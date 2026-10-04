// Persistent world model and command vocabulary for the Bellwether Vale slice.
// Everything in src/game is renderer-free so scenarios can run without a browser
// (docs/engineering/architecture.md: "The renderer displays state").

export const SAVE_FORMAT_VERSION = 1;
export const CONTENT_REVISION = 'deepwood-proto-0.0.5-unarmed';
/**
 * Content revisions from before the wanderer began unarmed. A save from one of these was made by a player who already
 * carried a blade, so loading it hands them the wreck's sword rather than silently taking their weapon away.
 */
export const ARMED_START_REVISIONS: readonly string[] = [
  'bellwether-proto-0.1',
  'bellwether-proto-0.0.1',
  'bellwether-proto-0.0.2',
  'bellwether-proto-0.0.3',
  'bellwether-proto-0.0.4',
  'deepwood-proto-0.0.5',
];
/** The first weapon: found in the wreck on the strand. */
export const WRECK_BLADE_PICKUP = 'wreck_blade';

export type QuestPhase = 'unseen' | 'investigating' | 'decision_ready' | 'committed' | 'settled';
export const PHASE_ORDER: readonly QuestPhase[] = ['unseen', 'investigating', 'decision_ready', 'committed', 'settled'];

export type Allocation = 'rillford' | 'quarry' | 'rotation';
export type GateState = 'damaged' | 'jammed' | 'stabilized';

export type EvidenceId =
  | 'dry_channel'
  | 'reduced_spring_flow'
  | 'diversion_and_seep'
  | 'cracked_sluice'
  | 'rotation_ledger'
  | 'worker_testimony';

export const EVIDENCE_IDS: readonly EvidenceId[] = [
  'dry_channel',
  'reduced_spring_flow',
  'diversion_and_seep',
  'cracked_sluice',
  'rotation_ledger',
  'worker_testimony',
];

/** Stable role identifiers survive later name revisions (quests-and-consequences.md). */
export type NpcId =
  | 'rillford_reeve'
  | 'spring_steward'
  | 'quarry_foreman'
  | 'maintenance_worker'
  | 'estate_steward'
  | 'ash_recorder'
  | 'shrine_warden'
  | 'mill_hand'
  | 'quarry_hand'
  | 'village_baker'
  | 'caravan_master';

export const NPC_IDS: readonly NpcId[] = [
  'rillford_reeve',
  'spring_steward',
  'quarry_foreman',
  'maintenance_worker',
  'estate_steward',
  'ash_recorder',
  'shrine_warden',
  'mill_hand',
  'quarry_hand',
  'village_baker',
  'caravan_master',
];

export const PRINCIPALS: readonly NpcId[] = ['rillford_reeve', 'spring_steward', 'quarry_foreman', 'maintenance_worker'];
/** The three whose consent a witnessed rotation needs. */
export const DECISION_MAKERS: readonly NpcId[] = ['rillford_reeve', 'spring_steward', 'quarry_foreman'];
export type Party = 'mara' | 'edda' | 'darin';
export const PARTY_NPC: Record<Party, NpcId> = {
  mara: 'rillford_reeve',
  edda: 'spring_steward',
  darin: 'quarry_foreman',
};
export const PARTIES: readonly Party[] = ['mara', 'edda', 'darin'];

export type ItemId =
  | 'coin'
  | 'rusted_sword'
  | 'sluice_brace'
  | 'gate_wrench'
  | 'archive_key'
  | 'votive_reed'
  | 'poultice'
  | 'shore_apple'
  | 'bread'
  | 'healing_herb'
  | 'field_mushroom'
  | 'iron_scrap'
  | 'league_sash'
  | 'contract_band'
  | 'witness_cord';

export type SkillId = 'steady_guard';

export const QUICK_SLOT_COUNT = 10;
/** Item actions today; a future active-skill action can extend this vocabulary without granting placeholder skills. */
export type QuickSlot = ItemId | null;
export interface MapMarker { x: number; z: number }

export type EncounterId = 'cut_creature' | 'ford_bandit_a' | 'ford_bandit_b';

export type PlaceId =
  | 'shore'
  | 'lantern_point'
  | 'overlook'
  | 'deepwood'
  | 'rillford'
  | 'ford'
  | 'spring_shrine'
  | 'sluice'
  | 'quarry'
  | 'the_cut'
  | 'archive';

export type EvidenceVia = 'observed' | 'testimony' | 'document' | 'derived';

export interface EvidenceRecord {
  via: EvidenceVia;
  source: string;
  atClock: number;
}

export type FactValue = boolean | number | string;

export interface NpcState {
  available: boolean;
  /** Why they are unavailable, when they are. Absence is a bounded durable state. */
  cause: string | null;
  trust: number;
  met: boolean;
}

export type OffenseKind = 'archive_trespass' | 'gate_forced';

/** A witnessed act that has not yet reached anyone who can act on it. */
export interface PendingReport {
  id: string;
  offense: OffenseKind;
  observedBy: NpcId[];
  reportTo: NpcId;
  dueClock: number;
}

export interface KnownOffense {
  offense: OffenseKind;
  knownTo: NpcId[];
  atClock: number;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  health: number;
  maxHealth: number;
}

export interface QuestState {
  phase: QuestPhase;
  gate: GateState;
  allocation: Allocation | null;
  repairRequired: boolean;
  entry: string | null;
  witnesses: NpcId[];
  /** Who keeps the arrangement working. */
  maintainer: string | null;
  committedAtClock: number | null;
  settledAtClock: number | null;
  /** Authored reaction ids queued at commitment and consumed by presentation/NPC logic. */
  reactions: string[];
}

/** Plain transforms only; no physics-engine handles belong in a format-1 save. */
export interface PhysicalObjectPose {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
}

export interface WorldState {
  saveFormatVersion: number;
  contentRevision: string;
  slotId: string;
  /** Total game minutes since the first morning of the arrival day. */
  clock: number;
  playSeconds: number;
  quest: QuestState;
  evidence: Partial<Record<EvidenceId, EvidenceRecord>>;
  facts: Record<string, FactValue>;
  grants: Record<string, true>;
  inventory: Partial<Record<ItemId, number>>;
  /** Player-created bindings. A depleted consumable keeps its binding until reassigned. */
  quickSlots: QuickSlot[];
  equippedWeapon: ItemId | null;
  mapMarker: MapMarker | null;
  physicalObjects: PhysicalObjectPose[];
  skills: SkillId[];
  npcs: Record<NpcId, NpcState>;
  offenses: { pending: PendingReport[]; known: KnownOffense[] };
  defeated: Partial<Record<EncounterId, true>>;
  discovered: Partial<Record<PlaceId, true>>;
  /** Persistent differences from the content baseline (opened doors, taken pickups). */
  locationChanges: Record<string, string>;
  player: PlayerState;
}

/* ---------- Conditions and effects (authored data, validated at build/test time) ---------- */

export type Cond =
  | { t: 'fact'; key: string; is?: FactValue }
  | { t: 'evidence'; id: EvidenceId }
  | { t: 'phase'; is?: QuestPhase; atLeast?: QuestPhase; below?: QuestPhase }
  | { t: 'gate'; is: GateState }
  | { t: 'item'; id: ItemId; min?: number }
  | { t: 'trust'; npc: NpcId; min: number }
  | { t: 'alloc'; is: Allocation }
  | { t: 'avail'; npc: NpcId; is?: boolean }
  | { t: 'skill'; id: SkillId }
  | { t: 'met'; npc: NpcId }
  | { t: 'consent'; party: Party }
  | { t: 'defeated'; id: EncounterId }
  | { t: 'anyDefeated' }
  | { t: 'applied' }
  | { t: 'grant'; id: string }
  | { t: 'not'; c: Cond }
  | { t: 'all'; c: Cond[] }
  | { t: 'any'; c: Cond[] };

export type Effect =
  | { t: 'fact'; key: string; value?: FactValue }
  | { t: 'evidence'; id: EvidenceId; via: EvidenceVia; source: string }
  | { t: 'trust'; npc: NpcId; delta: number }
  | { t: 'grant'; id: string; items: Partial<Record<ItemId, number>> }
  | { t: 'item'; id: ItemId; delta: number }
  | { t: 'consent'; party: Party }
  | { t: 'enter'; trigger: string }
  | { t: 'met'; npc: NpcId }
  | { t: 'cmd'; cmd: Command };

/* ---------- Commands ---------- */

export type Command =
  | { t: 'observe'; id: EvidenceId; via: EvidenceVia; source: string }
  | { t: 'enter'; trigger: string }
  | { t: 'discover'; place: PlaceId }
  | { t: 'pickup'; pickupId: string; item: ItemId; qty: number }
  | { t: 'rescueWorker'; method: 'fight' | 'shortcut' }
  | { t: 'openShortcut' }
  | { t: 'archiveAccess'; method: 'permission' | 'borrowed_key' | 'trespass'; observedBy?: NpcId[] }
  | { t: 'readLedger' }
  | { t: 'performRite' }
  | { t: 'stabilizeGate' }
  | { t: 'forceGate'; observedBy?: NpcId[] }
  | { t: 'commitAllocation'; allocation: Allocation }
  | { t: 'settle'; via: string }
  | { t: 'train'; skill: SkillId }
  | { t: 'defeat'; id: EncounterId }
  | { t: 'setUnavailable'; npc: NpcId; cause: string }
  | { t: 'setAvailable'; npc: NpcId }
  | { t: 'advanceClock'; minutes: number }
  | { t: 'useItem'; item: ItemId }
  | { t: 'assignQuickSlot'; slot: number; item: ItemId | null }
  | { t: 'swapQuickSlots'; from: number; to: number }
  | { t: 'equipWeapon'; item: ItemId | null }
  | { t: 'setMapMarker'; marker: MapMarker | null }
  | { t: 'damagePlayer'; amount: number }
  | { t: 'healPlayer'; amount: number }
  | { t: 'setFact'; key: string; value: FactValue }
  | { t: 'inspect'; pointId: string };

export type GameEvent =
  | { t: 'toast'; key: string; params?: Record<string, string | number> }
  | { t: 'evidence'; id: EvidenceId; via: EvidenceVia }
  | { t: 'phase'; phase: QuestPhase }
  | { t: 'gate'; gate: GateState }
  | { t: 'allocation'; allocation: Allocation }
  | { t: 'grant'; id: string; items: Partial<Record<ItemId, number>> }
  | { t: 'autosave'; reason: string }
  | { t: 'report'; offense: OffenseKind; to: NpcId }
  | { t: 'item'; id: ItemId; delta: number }
  | { t: 'quickSlots' }
  | { t: 'equipment'; item: ItemId | null }
  | { t: 'mapMarker'; marker: MapMarker | null }
  | { t: 'skill'; id: SkillId }
  | { t: 'place'; id: PlaceId }
  | { t: 'npc'; npc: NpcId; available: boolean }
  | { t: 'shortcut' }
  | { t: 'worker_rescued'; method: string }
  | { t: 'archive'; method: string }
  | { t: 'rite' }
  | { t: 'surge' }
  | { t: 'trust'; npc: NpcId; delta: number };

export type CommandResult =
  | { ok: true; events: GameEvent[] }
  | { ok: false; reason: string };

/* ---------- Dialogue ---------- */

export interface DialogueChoice {
  text: string;
  /** Shown before the line so the player knows what the choice is for. */
  intent?: 'ask' | 'offer' | 'warn' | 'persuade' | 'accuse' | 'agree' | 'leave' | 'train' | 'commit';
  when?: Cond[];
  /** Locked choices stay visible with their requirement so nothing is an unexplained dice roll. */
  showLocked?: boolean;
  effects?: Effect[];
  next: string | 'end';
}

export interface DialogueNode {
  id: string;
  speaker: NpcId | 'narrator';
  text: string;
  /** Applied once when the node is shown. */
  onEnter?: Effect[];
  choices: DialogueChoice[];
}

export interface EntryRule {
  when?: Cond[];
  node: string;
}
