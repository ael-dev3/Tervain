import { NATIVE_COMBAT_CONSTANTS } from './combat';

export type HeroAttackStyle = 'attack' | 'powerAttack';
export type HeroAttackPhase = 'raise' | 'hit' | 'recover';

export interface HeroAttackClip {
  readonly name: string;
  readonly role: string;
  readonly phase?: string | null;
  readonly duration: number;
}

export type HeroAttackSequenceEvent =
  | { readonly type: 'phase'; readonly style: HeroAttackStyle; readonly phase: HeroAttackPhase; readonly clipName: string }
  | { readonly type: 'hit-window'; readonly style: HeroAttackStyle; readonly phase: 'hit'; readonly clipName: string }
  | { readonly type: 'complete'; readonly style: HeroAttackStyle };

interface ActiveAttack {
  readonly style: HeroAttackStyle;
  phase: HeroAttackPhase;
  elapsed: number;
  hitWindowFired: boolean;
}

const PHASES: readonly HeroAttackPhase[] = ['raise', 'hit', 'recover'];

/** Plays the three recovered native Hero fist clips in raise/hit/recover order.
 * The hit-window event marks the audited OnHit timing; it does not detect a
 * target or apply damage. */
export class HeroAttackSequence {
  private readonly clips = new Map<HeroAttackStyle, Map<HeroAttackPhase, HeroAttackClip>>();
  private activeAttack: ActiveAttack | null = null;

  constructor(clips: readonly HeroAttackClip[]) {
    for (const style of ['attack', 'powerAttack'] as const) {
      const phases = new Map<HeroAttackPhase, HeroAttackClip>();
      for (const phase of PHASES) {
        const matches = clips.filter((clip) => clip.role === style && clip.phase === phase);
        if (matches.length !== 1 || !matches[0]!.name || !Number.isFinite(matches[0]!.duration) || matches[0]!.duration <= 0) {
          throw new Error(`Native Hero ${style} ${phase} clip is missing, duplicated or has an invalid duration.`);
        }
        phases.set(phase, matches[0]!);
      }
      this.clips.set(style, phases);
    }
  }

  get active(): boolean { return this.activeAttack !== null; }
  get currentClipName(): string | null {
    if (!this.activeAttack) return null;
    return this.clip(this.activeAttack.style, this.activeAttack.phase).name;
  }

  begin(style: HeroAttackStyle): boolean {
    if (this.activeAttack || !this.clips.has(style)) return false;
    this.activeAttack = { style, phase: 'raise', elapsed: 0, hitWindowFired: false };
    return true;
  }

  advance(seconds: number): readonly HeroAttackSequenceEvent[] {
    if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Hero attack time must be finite and nonnegative.');
    const events: HeroAttackSequenceEvent[] = [];
    let remaining = seconds;
    let transitions = 0;
    while (this.activeAttack && transitions++ < 8) {
      const active = this.activeAttack;
      const clip = this.clip(active.style, active.phase);
      if (active.phase === 'hit' && !active.hitWindowFired) {
        const threshold = Math.fround(clip.duration) * NATIVE_COMBAT_CONSTANTS.fistHitPhaseFraction;
        const untilHit = Math.max(0, threshold - active.elapsed);
        if (remaining >= untilHit) {
          active.elapsed += untilHit;
          remaining -= untilHit;
          active.hitWindowFired = true;
          events.push({ type: 'hit-window', style: active.style, phase: 'hit', clipName: clip.name });
          continue;
        }
      }
      const untilEnd = Math.max(0, clip.duration - active.elapsed);
      if (remaining < untilEnd) {
        active.elapsed += remaining;
        break;
      }
      remaining -= untilEnd;
      if (active.phase === 'recover') {
        this.activeAttack = null;
        events.push({ type: 'complete', style: active.style });
        break;
      }
      const nextPhase = PHASES[PHASES.indexOf(active.phase) + 1];
      if (!nextPhase) throw new Error('Native Hero attack phase order is incomplete.');
      active.phase = nextPhase;
      active.elapsed = 0;
      active.hitWindowFired = false;
      events.push({ type: 'phase', style: active.style, phase: nextPhase,
        clipName: this.clip(active.style, nextPhase).name });
    }
    if (transitions >= 8 && remaining > 0) throw new Error('Hero attack advanced through an invalid phase loop.');
    return events;
  }

  private clip(style: HeroAttackStyle, phase: HeroAttackPhase): HeroAttackClip {
    const clip = this.clips.get(style)?.get(phase);
    if (!clip) throw new Error(`Native Hero ${style} ${phase} clip is unavailable.`);
    return clip;
  }
}
