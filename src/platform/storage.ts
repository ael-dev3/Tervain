import { createInitialState } from '../game/state';
import { normalizeEquippedWeapon, normalizeInventory, normalizeQuickSlots } from '../game/inventory';
import { ARROW_QUIVER_CAPACITY, normalizeHunting, normalizeHuntTally } from '../game/hunting';
import { validMapMarker } from '../game/map';
import { ARMED_START_REVISIONS, CONTENT_REVISION, NPC_IDS, SAVE_FORMAT_VERSION, WRECK_BLADE_PICKUP, type WorldState } from '../game/types';
import { GAME_BUILD } from '../version';
import type { Allocation, GateState, QuestPhase } from '../game/types';

/** The values the game writes for these fields, so a save holding anything else is caught (A72). */
const QUEST_PHASES = ['unseen', 'investigating', 'decision_ready', 'committed', 'settled'] as const satisfies readonly QuestPhase[];
const GATE_STATES = ['damaged', 'jammed', 'stabilized'] as const satisfies readonly GateState[];
const ALLOCATIONS = ['rillford', 'quarry', 'rotation'] as const satisfies readonly Allocation[];

/**
 * Local saves behind a narrow adapter (architecture.md, "Saves and progression continuity").
 * Browser storage backs the web build; a desktop shell would swap in file access behind the
 * same KeyValueStore. Nothing here depends on a UI framework, a server, or a Steam session.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

export class MemoryStore implements KeyValueStore {
  private m = new Map<string, string>();
  get(key: string) {
    return this.m.get(key) ?? null;
  }
  set(key: string, value: string) {
    this.m.set(key, value);
  }
  remove(key: string) {
    this.m.delete(key);
  }
  keys() {
    return [...this.m.keys()];
  }
}

export class BrowserStore implements KeyValueStore {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  set(key: string, value: string) {
    localStorage.setItem(key, value);
  }
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }
  keys() {
    const out: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) out.push(k);
      }
    } catch {
      /* storage unavailable */
    }
    return out;
  }
}

export const SLOT_IDS = ['auto', 'quick', 'slot-1', 'slot-2', 'slot-3'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

/** Upper bound for a save payload; larger values are rejected as corrupt. */
export const MAX_SAVE_BYTES = 512 * 1024;
const MAGIC = 'tervain-save';
const PREFIX = 'tervain:save:';

export interface SaveSummary {
  slot: SlotId;
  savedAt: number;
  playSeconds: number;
  clock: number;
  phase: WorldState['quest']['phase'];
  allocation: WorldState['quest']['allocation'];
  gameBuild: string;
  contentRevision: string;
}

interface Envelope {
  magic: typeof MAGIC;
  saveFormatVersion: number;
  gameBuild: string;
  contentRevision: string;
  slotId: string;
  savedAt: number;
  playSeconds: number;
  summary: Omit<SaveSummary, 'slot' | 'savedAt' | 'playSeconds' | 'gameBuild' | 'contentRevision'>;
  checksum: string;
  state: WorldState;
}

export type LoadResult =
  | { ok: true; state: WorldState; summary: SaveSummary; recovered: null | 'previous' | 'temporary' }
  | { ok: false; kind: 'missing' | 'corrupt' | 'incompatible'; message: string };

/** FNV-1a 32-bit: catches truncation and accidental edits, not tampering. */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Missing old-save poses use the authored baseline; malformed entries never reach WASM. */
function physicalObjects(raw: unknown): WorldState['physicalObjects'] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: WorldState['physicalObjects'] = [];
  for (const value of raw.slice(0, 64)) {
    if (!isObj(value) || typeof value.id !== 'string' || value.id.length > 80 || seen.has(value.id)
      || !isObj(value.position) || !isObj(value.rotation)) continue;
    const p = value.position, q = value.rotation;
    if (![p.x, p.y, p.z, q.x, q.y, q.z, q.w].every(isNum)) continue;
    const position = { x: p.x as number, y: p.y as number, z: p.z as number };
    const rotation = { x: q.x as number, y: q.y as number, z: q.z as number, w: q.w as number };
    const n = Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w);
    if (position.x < -380 || position.x > 200 || position.z < -170 || position.z > 170
      || position.y < -50 || position.y > 120 || n < .9 || n > 1.1) continue;
    rotation.x /= n; rotation.y /= n; rotation.z /= n; rotation.w /= n;
    seen.add(value.id); result.push({ id: value.id, position, rotation });
  }
  return result;
}

/** Structural validation plus forward-compatible merge with current defaults. Returns null when unusable. */
export function reviveState(raw: unknown): WorldState | null {
  if (!isObj(raw)) return null;
  const base = createInitialState(typeof raw.slotId === 'string' ? raw.slotId : 'slot-1');
  const q = raw.quest;
  const p = raw.player;
  if (!isObj(q) || !isObj(p) || !isNum(raw.clock)) return null;
  if (!isNum(p.x) || !isNum(p.y) || !isNum(p.z) || !isNum(p.yaw) || !isNum(p.health)) return null;
  if (typeof q.phase !== 'string' || typeof q.gate !== 'string') return null;
  // A damaged or hand-edited save must not carry values the game never writes (A72): an unknown phase or gate state is
  // refused, an unknown allocation dropped.
  if (!(QUEST_PHASES as readonly string[]).includes(q.phase) || !(GATE_STATES as readonly string[]).includes(q.gate)) return null;
  if (!isObj(raw.npcs) || !isObj(raw.inventory) || !isObj(raw.facts)) return null;

  const merged: WorldState = {
    ...base,
    ...(raw as unknown as WorldState),
    quest: { ...base.quest, ...(q as unknown as WorldState['quest']) },
    player: { ...base.player, ...(p as unknown as WorldState['player']) },
    offenses: {
      pending: isObj(raw.offenses) && Array.isArray(raw.offenses.pending) ? (raw.offenses.pending as unknown[]).filter(isObj) as unknown as WorldState['offenses']['pending'] : [],
      known: isObj(raw.offenses) && Array.isArray(raw.offenses.known) ? (raw.offenses.known as unknown[]).filter(isObj) as unknown as WorldState['offenses']['known'] : [],
    },
    npcs: { ...base.npcs },
    inventory: normalizeInventory(raw.inventory),
    quickSlots: normalizeQuickSlots(raw.quickSlots),
    equippedWeapon: null,
    physicalObjects: physicalObjects(raw.physicalObjects),
    hunting: normalizeHunting(raw.hunting),
    huntTally: normalizeHuntTally(raw.huntTally),
    mapMarker: validMapMarker(raw.mapMarker) ? { x: raw.mapMarker.x, z: raw.mapMarker.z } : null,
    saveFormatVersion: SAVE_FORMAT_VERSION,
    contentRevision: CONTENT_REVISION,
  };
  for (const id of NPC_IDS) {
    const n = (raw.npcs as Record<string, unknown>)[id];
    if (!isObj(n)) continue;
    const was = base.npcs[id];
    // Each field only when it has its own type; anything else keeps the starting value (A72).
    merged.npcs[id] = {
      ...was,
      available: typeof n.available === 'boolean' ? n.available : was.available,
      cause: typeof n.cause === 'string' || n.cause === null ? n.cause : was.cause,
      trust: isNum(n.trust) ? n.trust : was.trust,
      met: typeof n.met === 'boolean' ? n.met : was.met,
    };
  }
  if (merged.quest.allocation !== null && !(ALLOCATIONS as readonly unknown[]).includes(merged.quest.allocation)) merged.quest.allocation = null;
  if (!isNum(merged.playSeconds) || merged.playSeconds < 0) merged.playSeconds = 0;
  // The quiver never holds more than it can (A72).
  if ((merged.inventory.arrow ?? 0) > ARROW_QUIVER_CAPACITY) merged.inventory = { ...merged.inventory, arrow: ARROW_QUIVER_CAPACITY };
  if (!isNum(merged.player.maxHealth) || merged.player.maxHealth <= 0) merged.player.maxHealth = base.player.maxHealth;
  merged.player.health = Math.max(0, Math.min(merged.player.maxHealth, merged.player.health));
  if (typeof merged.player.mount !== 'string' || !/^[0-9]{1,20}$/.test(merged.player.mount)) delete merged.player.mount;
  merged.skills = Array.isArray(raw.skills) && raw.skills.includes('steady_guard') ? ['steady_guard'] : [];
  if (!isObj(merged.evidence)) merged.evidence = {};
  if (!isObj(merged.grants)) merged.grants = {};
  if (!isObj(merged.defeated)) merged.defeated = {};
  if (!isObj(merged.discovered)) merged.discovered = {};
  if (!isObj(merged.locationChanges)) merged.locationChanges = {};
  // Saves from before the unarmed start were made by a player who already carried a blade: keep them armed, and
  // treat the wreck's sword as the one they carry.
  if (typeof raw.contentRevision === 'string' && ARMED_START_REVISIONS.includes(raw.contentRevision)) {
    merged.inventory = { ...merged.inventory, rusted_sword: Math.max(1, merged.inventory.rusted_sword ?? 0) };
    merged.locationChanges = { ...merged.locationChanges, [`pickup:${WRECK_BLADE_PICKUP}`]: 'taken' };
  }
  // Older builds armed the player whenever the sword was carried. Preserve that behavior only when the new
  // equipment field was absent; an explicit null records the player's deliberate choice to go unarmed.
  merged.equippedWeapon = normalizeEquippedWeapon(
    Object.hasOwn(raw, 'equippedWeapon') ? raw.equippedWeapon : 'rusted_sword', merged.inventory,
  );
  return merged;
}

export class SaveStore {
  constructor(private store: KeyValueStore, private now: () => number = () => Date.now()) {}

  private key(slot: string, part: 'cur' | 'prev' | 'tmp') {
    return `${PREFIX}${slot}:${part}`;
  }

  private encode(slot: SlotId, state: WorldState): string {
    const stateJson = JSON.stringify(state);
    const env: Envelope = {
      magic: MAGIC,
      saveFormatVersion: SAVE_FORMAT_VERSION,
      gameBuild: GAME_BUILD,
      contentRevision: CONTENT_REVISION,
      slotId: slot,
      savedAt: this.now(),
      playSeconds: state.playSeconds,
      summary: { clock: state.clock, phase: state.quest.phase, allocation: state.quest.allocation },
      checksum: checksum(stateJson),
      state,
    };
    return JSON.stringify(env);
  }

  private decode(text: string | null): LoadResult {
    if (text === null) return { ok: false, kind: 'missing', message: 'No save in this slot.' };
    if (text.length > MAX_SAVE_BYTES) return { ok: false, kind: 'corrupt', message: 'The save is larger than any valid save.' };
    let env: unknown;
    try {
      env = JSON.parse(text);
    } catch {
      return { ok: false, kind: 'corrupt', message: 'The save file could not be read.' };
    }
    if (!isObj(env) || env.magic !== MAGIC || !isNum(env.saveFormatVersion)) {
      return { ok: false, kind: 'corrupt', message: 'This is not a Tervain save.' };
    }
    if (env.saveFormatVersion > SAVE_FORMAT_VERSION) {
      return { ok: false, kind: 'incompatible', message: 'This save was written by a newer version of the game.' };
    }
    if (typeof env.checksum !== 'string' || JSON.stringify(env.state) === undefined || checksum(JSON.stringify(env.state)) !== env.checksum) {
      return { ok: false, kind: 'corrupt', message: 'The save failed its integrity check.' };
    }
    const state = reviveState(env.state);
    if (!state) return { ok: false, kind: 'corrupt', message: 'The save is missing required data.' };
    const summary: SaveSummary = {
      slot: (typeof env.slotId === 'string' ? env.slotId : 'slot-1') as SlotId,
      savedAt: isNum(env.savedAt) ? env.savedAt : 0,
      playSeconds: state.playSeconds,
      clock: state.clock,
      phase: state.quest.phase,
      allocation: state.quest.allocation,
      gameBuild: typeof env.gameBuild === 'string' ? env.gameBuild : 'unknown',
      contentRevision: typeof env.contentRevision === 'string' ? env.contentRevision : 'unknown',
    };
    return { ok: true, state, summary, recovered: null };
  }

  /**
   * Write to a temporary key, validate it by reading it back, retain the previous save, then
   * replace the selected save. An interrupted write leaves either the old save or a recoverable copy.
   */
  save(slot: SlotId, state: WorldState): { ok: true } | { ok: false; message: string } {
    try {
      // A save from a newer version of the game is never overwritten by this one, which cannot read it (A71).
      const existing = this.store.get(this.key(slot, 'cur'));
      if (existing !== null) {
        const found = this.decode(existing);
        if (!found.ok && found.kind === 'incompatible') return { ok: false, message: 'This slot holds a save from a newer version of the game; it was kept.' };
      }
      const text = this.encode(slot, state);
      if (text.length > MAX_SAVE_BYTES) return { ok: false, message: 'Save is too large.' };
      this.store.set(this.key(slot, 'tmp'), text);
      const check = this.decode(this.store.get(this.key(slot, 'tmp')));
      if (!check.ok) {
        this.store.remove(this.key(slot, 'tmp'));
        return { ok: false, message: 'The written save did not verify; the previous save was kept.' };
      }
      const current = this.store.get(this.key(slot, 'cur'));
      // Keep the previous save only if the current one is itself intact; otherwise leave the older good copy alone.
      if (current !== null && this.decode(current).ok) this.store.set(this.key(slot, 'prev'), current);
      this.store.set(this.key(slot, 'cur'), text);
      this.store.remove(this.key(slot, 'tmp'));
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Storage is unavailable.' };
    }
  }

  load(slot: SlotId): LoadResult {
    const cur = this.decode(this.store.get(this.key(slot, 'cur')));
    if (cur.ok) return cur;
    if (cur.kind === 'incompatible') return cur;
    const prev = this.decode(this.store.get(this.key(slot, 'prev')));
    if (prev.ok) return { ...prev, recovered: 'previous' };
    const tmp = this.decode(this.store.get(this.key(slot, 'tmp')));
    if (tmp.ok) return { ...tmp, recovered: 'temporary' };
    // Report the most informative failure: a damaged save beats an empty slot.
    for (const r of [cur, prev, tmp]) if (!r.ok && r.kind === 'corrupt') return r;
    return cur;
  }

  summary(slot: SlotId): SaveSummary | null {
    const r = this.load(slot);
    return r.ok ? r.summary : null;
  }

  list(): { slot: SlotId; result: LoadResult }[] {
    return SLOT_IDS.map((slot) => ({ slot, result: this.load(slot) }));
  }

  hasAny(): boolean {
    return SLOT_IDS.some((s) => this.load(s).ok);
  }

  /** The most recently written valid slot, for "Continue". */
  latest(): { slot: SlotId; state: WorldState; summary: SaveSummary } | null {
    let best: { slot: SlotId; state: WorldState; summary: SaveSummary } | null = null;
    for (const slot of SLOT_IDS) {
      const r = this.load(slot);
      if (r.ok && (!best || r.summary.savedAt > best.summary.savedAt)) best = { slot, state: r.state, summary: r.summary };
    }
    return best;
  }

  delete(slot: SlotId) {
    for (const part of ['cur', 'prev', 'tmp'] as const) this.store.remove(this.key(slot, part));
  }
}
