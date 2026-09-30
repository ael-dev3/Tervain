import { applyEffects, execute } from './commands';
import { NPC_OBSERVATIONS } from '../content/arrival';
import { getNode, pickEntryNode, visibleChoices } from './dialogue';
import { cloneState, createInitialState, evalAll } from './state';
import type { Command, CommandResult, GameEvent, NpcId, WorldState } from './types';

export type Listener = (events: GameEvent[]) => void;

export type ChooseResult =
  | { ok: true; next: string | 'end'; events: GameEvent[] }
  | { ok: false; reason: string };

/**
 * Owns the persistent world state. Every meaningful change goes through dispatch(): the
 * command runs on a copy and is committed only on success, so a failed effect never leaves a
 * half-applied resolution (architecture.md, "Quest and dialogue architecture").
 */
export class Game {
  state: WorldState;
  private listeners = new Set<Listener>();

  constructor(state?: WorldState) {
    this.state = state ?? createInitialState();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  replaceState(state: WorldState) {
    this.state = state;
  }

  private emit(events: GameEvent[]) {
    if (events.length === 0) return;
    for (const l of this.listeners) l(events);
  }

  dispatch(cmd: Command): CommandResult {
    const draft = cloneState(this.state);
    const res = execute(draft, cmd);
    if (!res.ok) return res;
    this.state = draft;
    this.emit(res.events);
    return res;
  }

  /** Non-command mutation for high-frequency values that are not gameplay facts. */
  setPlayerTransform(x: number, y: number, z: number, yaw: number) {
    const p = this.state.player;
    p.x = x;
    p.y = y;
    p.z = z;
    p.yaw = yaw;
  }

  addPlaySeconds(dt: number) {
    this.state.playSeconds += dt;
  }

  /** Advance the world clock by game minutes. Delivers any reports that have come due. */
  tickClock(minutes: number) {
    if (minutes <= 0) return;
    this.dispatch({ t: 'advanceClock', minutes });
  }

  /** Observe a visible person without speaking, meeting them or choosing their quest branch. */
  observeNpc(npc: NpcId): { ok: true; key: string } | { ok: false } {
    if (!this.state.npcs[npc].available) return { ok: false };
    return { ok: true, key: NPC_OBSERVATIONS[npc] };
  }

  /* ---------- Dialogue ---------- */

  entryNode(npc: NpcId): string | null {
    return pickEntryNode(this.state, npc);
  }

  /** Show a node: applies its authored enter effects atomically. */
  showNode(nodeId: string): { ok: boolean } {
    const node = getNode(nodeId);
    if (!node) return { ok: false };
    if (node.onEnter && node.onEnter.length > 0) {
      const draft = cloneState(this.state);
      const events: GameEvent[] = [];
      const err = applyEffects(draft, node.onEnter, events);
      if (err) return { ok: false };
      this.state = draft;
      this.emit(events);
    }
    return { ok: true };
  }

  /** Commit a dialogue choice. Conditions are re-checked; effects apply atomically. */
  choose(nodeId: string, index: number): ChooseResult {
    const node = getNode(nodeId);
    const choice = node?.choices[index];
    if (!node || !choice) return { ok: false, reason: 'bad_choice' };
    if (!evalAll(this.state, choice.when)) return { ok: false, reason: 'requirements' };
    const draft = cloneState(this.state);
    const events: GameEvent[] = [];
    const err = applyEffects(draft, choice.effects, events);
    if (err) return { ok: false, reason: err };
    this.state = draft;
    this.emit(events);
    return { ok: true, next: choice.next, events };
  }

  choices(nodeId: string) {
    const node = getNode(nodeId);
    return node ? visibleChoices(this.state, node) : [];
  }
}
