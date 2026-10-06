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
  say(line: string, at?: Vec3): number | null;
  /** Shows the spoken words for as long as they are heard. */
  caption(speaker: Speaker, text: string, seconds: number): void;
  /** Stops what a speaker is saying (a passing remark, when the player starts a conversation). */
  hush?(speaker: Speaker): void;
}

interface Queued {
  at: number;
  line: string;
  where?: () => Vec3;
  /** A remark of the hero's own waits for a conversation to finish, but not for ever. */
  remark?: { until: number };
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
  private readonly turns = new Map<HeroCue, number>();
  private readonly cycles = new Map<NpcId, number>();
  /** The game day each scene was last overheard. */
  private readonly scenes = new Map<string, number>();
  private readonly said = new Set<HeroCue>();
  private readonly lastCue = new Map<HeroCue, number>();

  constructor(private readonly hooks: SpeechHooks) {}

  /** Seconds until this speaker has finished what they are saying (0 when quiet). */
  busyFor(speaker: Speaker): number {
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
    this.heard.add(i);
    if (this.busyFor(npc) > 0) {
      this.hooks.hush?.(npc);
      this.busy.delete(npc);
    }
    let at = this.clock + this.busyFor('hero');
    if (t.ask) {
      this.queue.push({ at, line: t.ask });
      at += this.length(t.ask) + ANSWER_GAP;
    }
    this.queue.push({ at, line: t.reply, where });
    this.busy.set(npc, at + this.length(t.reply));
    this.held.set(npc, at + this.length(t.reply));
    this.update(0);
    return true;
  }

  /** A passing remark: said now unless they are already speaking; the words show in a bubble, not a caption. */
  remark(npc: NpcId, line: string, at: Vec3): number {
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
    let at = this.clock + 0.3;
    for (const id of scene.lines) {
      const speaker = VOICE_LINES[id]!.speaker as NpcId;
      this.queue.push({ at, line: id, where: () => where(speaker) });
      at += this.length(id) + ANSWER_GAP;
    }
    for (const n of scene.cast) {
      this.held.set(n, at);
      this.busy.set(n, at);
    }
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
    this.turns.set(cue, k + 1);
    this.said.add(cue);
    this.lastCue.set(cue, this.clock);
    this.queue.push({ at: this.clock + delay, line: lines[k % lines.length]!, remark: { until: this.clock + delay + 20 } });
    this.update(0);
    return true;
  }

  /** Advance the game clock and start the lines that are due. */
  update(dt: number) {
    this.clock += dt;
    this.queue.sort((a, b) => a.at - b.at);
    while (this.queue.length && this.queue[0]!.at <= this.clock + 1e-9) {
      const q = this.queue.shift()!;
      const line = VOICE_LINES[q.line];
      if (!line) continue;
      if (q.remark) {
        // Never over a conversation or over himself: later, while it is still worth saying.
        const free = Math.max(this.busy.get('hero') ?? 0, ...[...this.held.values()]);
        if (free > this.clock) {
          if (free + 0.6 <= q.remark.until) this.queue.push({ ...q, at: free + 0.6 });
          this.queue.sort((a, b) => a.at - b.at);
          continue;
        }
      }
      let seconds = this.hooks.say(q.line, q.where?.());
      if (seconds === null) {
        // Its voice is on its way: wait a moment, then go ahead without it if need be.
        if ((q.tries ?? 0) < LOAD_TRIES) {
          this.queue.push({ ...q, at: this.clock + 0.25, tries: (q.tries ?? 0) + 1 });
          this.queue.sort((a, b) => a.at - b.at);
          continue;
        }
        seconds = this.length(q.line);
      }
      const until = this.clock + seconds;
      this.busy.set(line.speaker, Math.max(this.busy.get(line.speaker) ?? 0, until));
      // An exchange's answer holds its speaker for as long as it actually lasts.
      if (line.speaker !== 'hero' && (this.held.get(line.speaker) ?? 0) > this.clock) this.held.set(line.speaker, until);
      this.hooks.caption(line.speaker, shown(line.text), seconds);
    }
  }

  /** Forget the queue (a load, a new game, the title). What has been heard stays heard this session. */
  clear() {
    this.queue = [];
    this.busy.clear();
    this.held.clear();
  }

  private length(line: string): number {
    const voiced = (VOICE_AUDIO.lines as Record<string, readonly [string, number, number, string]>)[line];
    return voiced ? voiced[2] : 0.4 + (VOICE_LINES[line]?.text.length ?? 0) / 14;
  }
}
