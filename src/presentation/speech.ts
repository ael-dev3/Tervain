import { BARKS } from '../content/npcs';
import { HERO_LINES, SCENES, TALKS, VOICE_LINES, inHours, shown, type HeroCue, type Scene, type Speaker } from '../content/voice';
import { evalAll } from '../game/state';
import type { NpcId, WorldState } from '../game/types';
import { VOICE_AUDIO } from './sound/voiceManifest';

/**
 * Who says what, and when (A53). People speak in the world, never in a window (A27): interacting with someone plays
 * the next exchange they have for the player, the hero's question first when there is one; the hero remarks on
 * places, a first blade, a beast, wounds and the bell. A speaker says one thing at a time, an exchange never talks
 * over the hero, and everything is timed by the game clock, so a pause holds the next line back.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SpeechHooks {
  /**
   * Plays a line (from a place in the world, when given) and returns its length in seconds, playable or not; null
   * when its voice is still loading and the line should wait a moment.
   */
  say(line: string, at?: Vec3 | (() => Vec3)): number | null;
  /** Shows the spoken words for as long as they are heard. */
  caption(speaker: Speaker, text: string, seconds: number): void;
  /** Stops what a speaker is saying (a passing remark, when the player starts a conversation). */
  hush?(speaker: Speaker): void;
}

interface SpeechStep {
  line: string;
  where?: () => Vec3;
}

interface SpeechChain {
  cast: readonly NpcId[];
  remaining: SpeechStep[];
  /** An exchange stays pending while a line is loading, even past its estimated end. */
  pending: boolean;
  until: number;
  interaction: boolean;
  /** Mark an exchange heard when its answer starts, so an interrupted question can be asked again. */
  talk?: number;
  /** Player exchanges take turns, including when their first question has not loaded yet. */
  after?: SpeechChain;
}

interface Queued extends SpeechStep {
  at: number;
  chain?: SpeechChain;
  /** A remark of the hero's own waits for a conversation to finish, but not for ever. */
  remark?: { until: number; cue?: HeroCue; last?: number; turn?: number };
  /** Times it has waited for its voice to load. */
  tries?: number;
}

/** How long a line may wait for its voice before it is shown without one. */
const LOAD_TRIES = 12;

/** A breath between the question and the answer. */
const ANSWER_GAP = 0.35;

export class SpeechDirector {
  private clock = 0;
  private queue: Queued[] = [];
  /** Talks heard this session, by their place in TALKS. */
  private readonly heard = new Set<number>();
  private readonly busy = new Map<Speaker, number>();
  /** Until when an exchange holds someone (a passing remark does not). */
  private readonly held = new Map<NpcId, number>();
  private readonly chains = new Set<SpeechChain>();
  private readonly turns = new Map<HeroCue, number>();
  private readonly cycles = new Map<NpcId, number>();
  /** The game day each scene was last overheard. */
  private readonly scenes = new Map<string, number>();
  private readonly said = new Set<HeroCue>();
  private readonly lastCue = new Map<HeroCue, number>();

  constructor(private readonly hooks: SpeechHooks) {}

  /** Seconds until this speaker has finished what they are saying (0 when quiet). */
  busyFor(speaker: Speaker): number {
    const held = speaker === 'hero' ? 0 : this.held.get(speaker) ?? 0;
    return Math.max(0, Math.max(this.busy.get(speaker) ?? 0, held) - this.clock);
  }

  /** Seconds an exchange or a scene still holds this person (a passing remark does not hold anyone) (A69). */
  heldFor(npc: NpcId): number {
    return Math.max(0, (this.held.get(npc) ?? 0) - this.clock);
  }

  /** The current spoken line only. A listener stays in the exchange without gesturing through another person's turn. */
  speakingFor(speaker: Speaker): number {
    return Math.max(0, (this.busy.get(speaker) ?? 0) - this.clock);
  }

  /** The exchange someone would have with the player now: the first unheard one that applies, else a repeatable one. */
  nextTalk(npc: NpcId, state: WorldState): number | null {
    const i = this.peekTalk(npc, state);
    // Repeatable ones come round in turn, rather than always the first.
    if (i !== null && this.heard.has(i)) this.cycles.set(npc, (this.cycles.get(npc) ?? 0) + 1);
    return i;
  }

  private peekTalk(npc: NpcId, state: WorldState): number | null {
    const repeatable: number[] = [];
    for (let i = 0; i < TALKS.length; i++) {
      const t = TALKS[i]!;
      if (t.npc !== npc || !evalAll(state, t.when)) continue;
      if (!this.heard.has(i)) return i;
      if (t.again) repeatable.push(i);
    }
    if (!repeatable.length) return null;
    return repeatable[(this.cycles.get(npc) ?? 0) % repeatable.length]!;
  }

  /**
   * What someone may say soon, so the voice can be ready before it is wanted: their next exchange with the player
   * (the hero's question too), the remarks that apply at this hour, and their part in any scene that could start now.
   */
  soon(npc: NpcId, state: WorldState, hour: number): string[] {
    const out: string[] = [];
    const i = this.peekTalk(npc, state);
    if (i !== null) {
      const t = TALKS[i]!;
      if (t.ask) out.push(t.ask);
      out.push(t.reply);
    }
    for (const b of BARKS) if (b.npc === npc && (!b.hours || inHours(hour, b.hours)) && evalAll(state, b.when)) out.push(b.line);
    for (const s of SCENES) {
      if (s.cast.includes(npc) && inHours(hour, s.hours) && evalAll(state, s.when)) out.push(...s.lines.filter((id) => VOICE_LINES[id]?.speaker === npc));
    }
    return out;
  }

  /** Talk to someone: their next exchange, unless one is still under way. A passing remark gives way to it. */
  talk(npc: NpcId, where: () => Vec3, state: WorldState): boolean {
    if ((this.held.get(npc) ?? 0) > this.clock || this.queue.some((q) => VOICE_LINES[q.line]?.speaker === npc)) return false;
    const i = this.nextTalk(npc, state);
    if (i === null) return false;
    const t = TALKS[i]!;
    if (this.busyFor(npc) > 0) {
      this.hooks.hush?.(npc);
      this.busy.delete(npc);
    }
    const steps: SpeechStep[] = [];
    if (t.ask) steps.push({ line: t.ask });
    steps.push({ line: t.reply, where });
    this.enqueueChain([npc], steps, this.clock + this.busyFor('hero'), true, i);
    this.update(0);
    return true;
  }

  /** A passing remark: said now unless they are already speaking; the words show in a bubble, not a caption. */
  remark(npc: NpcId, line: string, at: Vec3 | (() => Vec3)): number {
    if (this.busyFor(npc) > 0 || !VOICE_LINES[line]) return 0;
    // A remark whose voice is not ready is simply not made; there will be another.
    const seconds = this.hooks.say(line, at);
    if (seconds === null) return 0;
    this.busy.set(npc, this.clock + seconds);
    return seconds;
  }

  /** Whether two people may start a scene now: not overheard yet today, neither of them busy. */
  sceneDue(scene: Scene, day: number): boolean {
    if (this.scenes.get(scene.id) === day) return false;
    return !scene.cast.some((n) => (this.held.get(n) ?? 0) > this.clock || this.busyFor(n) > 0 || this.queue.some((q) => VOICE_LINES[q.line]?.speaker === n));
  }

  /** Two people talk between themselves, each line from where its speaker stands. */
  scene(scene: Scene, day: number, where: (npc: NpcId) => Vec3): boolean {
    if (!this.sceneDue(scene, day)) return false;
    this.scenes.set(scene.id, day);
    const steps = scene.lines.map((id) => {
      const speaker = VOICE_LINES[id]!.speaker as NpcId;
      return { line: id, where: () => where(speaker) };
    });
    this.enqueueChain(scene.cast, steps, this.clock + 0.3, false);
    this.update(0);
    return true;
  }

  /**
   * The hero remarks on something. A cue is said once unless `again` allows it after a cooldown; a cue with several
   * lines takes them in turn. Never over another of the hero's lines.
   */
  hero(cue: HeroCue, { delay = 0, again = 0 }: { delay?: number; again?: number } = {}): boolean {
    const lines = HERO_LINES[cue];
    if (!lines?.length) return false;
    if (again > 0) {
      const last = this.lastCue.get(cue);
      if (last !== undefined && this.clock - last < again) return false;
    } else if (this.said.has(cue)) return false;
    if (delay === 0 && this.busyFor('hero') > 0) return false;
    const k = this.turns.get(cue) ?? 0;
    const last = this.lastCue.get(cue);
    this.turns.set(cue, k + 1);
    this.said.add(cue);
    this.lastCue.set(cue, this.clock);
    // What it was before, so a remark dropped unheard can be said again later (A71).
    this.queue.push({ at: this.clock + delay, line: lines[k % lines.length]!, remark: { until: this.clock + delay + 20, cue, last, turn: k } });
    this.update(0);
    return true;
  }

  /** Advance the game clock and start the lines that are due. */
  update(dt: number) {
    this.clock += dt;
    for (const chain of this.chains) if (!chain.pending && chain.until <= this.clock) this.chains.delete(chain);
    this.syncHeld();
    this.queue.sort((a, b) => a.at - b.at);
    while (this.queue.length && this.queue[0]!.at <= this.clock + 1e-9) {
      const q = this.queue.shift()!;
      const line = VOICE_LINES[q.line];
      if (!line) continue;
      if (q.chain?.after) {
        const after = q.chain.after;
        if (after.pending || after.until + ANSWER_GAP > this.clock + 1e-9) {
          const at = after.pending ? this.clock + 0.25 : after.until + ANSWER_GAP;
          this.defer(q, at);
          continue;
        }
        q.chain.after = undefined;
      }
      if (q.remark) {
        // Never over a conversation or over himself: later, while it is still worth saying.
        const free = Math.max(this.busy.get('hero') ?? 0, ...[...this.held.values()]);
        if (free > this.clock) {
          if (free + 0.6 <= q.remark.until) this.queue.push({ ...q, at: free + 0.6 });
          else this.unsay(q);
          this.queue.sort((a, b) => a.at - b.at);
          continue;
        }
      }
      // The voice follows its speaker, who may walk on while saying it (A70).
      let seconds = this.hooks.say(q.line, q.where);
      if (seconds === null) {
        // Its voice is on its way: wait a moment, then go ahead without it if need be.
        if ((q.tries ?? 0) < LOAD_TRIES) {
          this.defer({ ...q, tries: (q.tries ?? 0) + 1 }, this.clock + 0.25);
          continue;
        }
        seconds = this.length(q.line);
      }
      const until = this.clock + seconds;
      this.busy.set(line.speaker, Math.max(this.busy.get(line.speaker) ?? 0, until));
      if (q.chain) {
        // Only schedule the next turn after this one starts. Loading and playback durations can both differ from
        // the estimate, so no answer or later scene line can overtake its predecessor.
        this.reserve(q.chain, this.clock, seconds);
        const next = q.chain.remaining.shift();
        if (next) this.queue.push({ ...next, at: until + ANSWER_GAP, chain: q.chain });
        else {
          q.chain.pending = false;
          q.chain.until = until;
          if (q.chain.talk !== undefined) this.heard.add(q.chain.talk);
        }
        this.syncHeld();
        this.queue.sort((a, b) => a.at - b.at);
      }
      this.hooks.caption(line.speaker, shown(line.text), seconds);
    }
  }

  /** Forget the queue (a load, a new game, the title). What has been heard stays heard this session. */
  clear() {
    // Forgetting scheduling metadata must also stop the sources belonging to the old session.
    for (const speaker of this.busy.keys()) this.hooks.hush?.(speaker);
    // A hero remark still waiting was never heard, so it is not yet said (A71).
    for (const q of this.queue.slice().reverse()) this.unsay(q);
    this.queue = [];
    this.busy.clear();
    this.held.clear();
    this.chains.clear();
  }

  /** Undo a hero remark's bookkeeping when it is dropped before it started (A71). */
  private unsay(q: Queued) {
    const cue = q.remark?.cue;
    if (cue === undefined) return;
    if (q.remark!.last === undefined) {
      this.said.delete(cue);
      this.lastCue.delete(cue);
    } else this.lastCue.set(cue, q.remark!.last);
    this.turns.set(cue, q.remark!.turn ?? 0);
  }

  private enqueueChain(cast: readonly NpcId[], steps: SpeechStep[], at: number, interaction: boolean, talk?: number) {
    const first = steps.shift();
    if (!first) return;
    const after = interaction ? [...this.chains].filter((c) => c.interaction && (c.pending || c.until > this.clock)).at(-1) : undefined;
    const chain: SpeechChain = { cast, remaining: steps, pending: true, until: at, interaction, after, talk };
    this.chains.add(chain);
    this.reserve(chain, Math.max(at, after?.until ?? at), this.length(first.line));
    this.queue.push({ ...first, at, chain });
  }

  private reserve(chain: SpeechChain, at: number, seconds: number) {
    chain.until = at + seconds + chain.remaining.reduce((sum, step) => sum + ANSWER_GAP + this.length(step.line), 0);
    this.syncHeld();
  }

  private syncHeld() {
    this.held.clear();
    for (const chain of this.chains) {
      const until = chain.pending ? Math.max(chain.until, this.clock + 0.25) : chain.until;
      for (const npc of chain.cast) this.held.set(npc, Math.max(this.held.get(npc) ?? 0, until));
    }
  }

  private defer(q: Queued, at: number) {
    if (q.chain) this.reserve(q.chain, at, this.length(q.line));
    this.queue.push({ ...q, at });
    this.queue.sort((a, b) => a.at - b.at);
  }

  private length(line: string): number {
    const voiced = (VOICE_AUDIO.lines as Record<string, readonly [string, number, number, string]>)[line];
    return voiced ? voiced[2] : 0.4 + (VOICE_LINES[line]?.text.length ?? 0) / 14;
  }
}
