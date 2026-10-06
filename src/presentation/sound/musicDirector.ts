import type { PlaceId } from '../../game/types';
import { FOREST_REGION, PLACES } from '../../world/layout';
import { villageCover } from './soundscape';
import { WORLD_AUDIO, type MusicId } from './worldAudioManifest';

/**
 * The in-world score, decided without any audio objects. Gothic-like pacing: a piece for the mood of the place plays
 * once, then the world is left to itself for a while (the art direction asks for quiet intervals); a threat brings in
 * a low pulsing loop, a fight the battle loop, and when it is over the world falls quiet again. Short stings mark a
 * discovered place, a step of the story, a victory and a fall.
 *
 * Two voices share the score: pieces generated from prompts, and pieces composed in code around one Tervain theme
 * (`origin: 'composed'`). The first time a mood is heard, its own arrangement of the theme plays; a fight keeps one
 * voice from warning to battle; each region announces itself with the theme's opening in its own instruments.
 *
 * Moods: `vale` (Rillford and the hamlet, the ford, the mill, the sluice, the quarry by day), `wild` (the strand, the
 * deepwood, the overlook, Lantern Point, the Cut), `sacred` (the spring shrine and the archive), `night` (anywhere after
 * dark, except sacred ground).
 */

export type Mood = 'vale' | 'wild' | 'sacred' | 'night';
export type Threat = 'none' | 'alert' | 'combat';
export type Region = 'coast' | 'wood' | 'vale' | 'stone' | 'sacred' | 'light';

export interface MusicContext {
  /** The world is running (not a menu, not the fall). */
  active: boolean;
  x: number;
  z: number;
  night: boolean;
  threat: Threat;
  /** Music is playing in the world itself (the inn's tune): the score keeps quiet rather than play over it. */
  diegetic?: boolean;
}

export type MusicAction =
  | { t: 'piece'; id: MusicId; fadeIn: number }
  | { t: 'loop'; id: MusicId; fadeIn: number }
  | { t: 'stop'; fadeOut: number }
  | { t: 'sting'; id: MusicId };

type MusicEntry = (typeof WORLD_AUDIO.music)[MusicId];
type Origin = MusicEntry['origin'];

const entries = Object.entries(WORLD_AUDIO.music) as [MusicId, MusicEntry][];
const ids = (pick: (e: MusicEntry) => boolean) => entries.filter(([, e]) => pick(e)).map(([id]) => id);
export const PLAYLISTS: Record<Mood, MusicId[]> = {
  vale: ids((e) => e.kind === 'piece' && e.mood === 'vale'),
  wild: ids((e) => e.kind === 'piece' && e.mood === 'wild'),
  sacred: ids((e) => e.kind === 'piece' && e.mood === 'sacred'),
  night: ids((e) => e.kind === 'piece' && e.mood === 'night'),
};
export const THREAT_LOOPS: Record<'alert' | 'combat', MusicId[]> = {
  alert: ids((e) => e.kind === 'loop' && e.mood === 'danger'),
  combat: ids((e) => e.kind === 'loop' && e.mood === 'combat'),
};

/** Which region's motif greets each place on first discovery. */
export const PLACE_REGION: Record<PlaceId, Region> = {
  shore: 'coast', deepwood: 'wood', overlook: 'wood', lantern_point: 'light', rillford: 'vale', ford: 'vale',
  sluice: 'vale', quarry: 'stone', the_cut: 'stone', spring_shrine: 'sacred', archive: 'sacred',
};
export const REGION_STING: Record<Region, MusicId> = {
  coast: 'place_coast', wood: 'place_wood', vale: 'place_vale', stone: 'place_stone', sacred: 'place_sacred', light: 'place_light',
};

const SACRED = [PLACES.spring_shrine, PLACES.archive];

export function moodAt(x: number, z: number, night: boolean): Mood {
  if (SACRED.some((p) => Math.hypot(p.x - x, p.z - z) < p.r * 1.15)) return 'sacred';
  if (night) return 'night';
  // Settled ground, Rillford or the hamlet behind the strand, has the vale's music wherever it lies.
  if (villageCover(x, z) > 0.5) return 'vale';
  // West of the vale lies the open coast and the deepwood; the Cut is wild ground east of the quarry.
  if (x < FOREST_REGION.maxX + 10) return 'wild';
  if (Math.hypot(PLACES.the_cut.x - x, PLACES.the_cut.z - z) < PLACES.the_cut.r * 1.6) return 'wild';
  return 'vale';
}

/**
 * How dangerous the moment is: an engaged enemy closing in or fighting nearby means combat; one that has noticed the
 * player farther off, or is hunting them from a distance, means alert.
 */
export function threatFrom(enemies: readonly { x: number; z: number; alive: boolean; engaged: boolean; state: string }[], x: number, z: number): Threat {
  let threat: Threat = 'none';
  for (const e of enemies) {
    if (!e.alive || !e.engaged) continue;
    const d = Math.hypot(e.x - x, e.z - z);
    if (d < 16 && e.state !== 'alert' && e.state !== 'return') return 'combat';
    if (d < 34) threat = 'alert';
  }
  return threat;
}

const QUIET_AFTER_PIECE: [number, number] = [35, 80];
const FIRST_WAIT: [number, number] = [8, 18];
const MOOD_SETTLE = 8;
const COMBAT_HOLD = 4;
/** After the inn's tune, the score waits at least this long before a piece. */
const AFTER_DIEGETIC = 20;

type State =
  | { s: 'off' }
  | { s: 'wait'; left: number }
  | { s: 'piece'; id: MusicId; mood: Mood; left: number; offMood: number }
  | { s: 'threat'; level: 'alert' | 'combat'; calm: number };

export class MusicDirector {
  private state: State = { s: 'off' };
  private last: MusicId | null = null;
  private readonly heard = new Set<Mood>();
  /** Flips at each encounter; the first fight of a session hears the composed music. */
  private fightVoice: Origin = 'generated';
  private readonly random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  get phase(): State['s'] {
    return this.state.s;
  }

  get current(): MusicId | null {
    return this.state.s === 'piece' ? this.state.id : null;
  }

  private range([a, b]: [number, number]): number {
    return a + (b - a) * this.random();
  }

  private pick(mood: Mood): MusicId | null {
    const list = PLAYLISTS[mood].length ? PLAYLISTS[mood] : PLAYLISTS.wild;
    if (!list.length) return null;
    // The first time a mood is heard, its own arrangement of the theme: the place's voice before its variations.
    if (!this.heard.has(mood)) {
      this.heard.add(mood);
      const own = list.find((id) => WORLD_AUDIO.music[id].origin === 'composed');
      if (own) return own;
    }
    const choices = list.length > 1 ? list.filter((id) => id !== this.last) : list;
    return choices[Math.floor(this.random() * choices.length)] ?? null;
  }

  private readonly loopTurns = new Map<string, number>();

  /** A fight keeps one voice: a composed warning leads to the composed battle. Within a voice the takes come in turn. */
  private loopFor(level: 'alert' | 'combat'): MusicId {
    const list = THREAT_LOOPS[level];
    const voice = list.filter((id) => WORLD_AUDIO.music[id].origin === this.fightVoice);
    const pool = voice.length ? voice : list;
    const key = `${level}.${this.fightVoice}`;
    const turn = this.loopTurns.get(key) ?? 0;
    this.loopTurns.set(key, turn + 1);
    return pool[turn % pool.length]!;
  }

  update(dt: number, ctx: MusicContext): MusicAction[] {
    const out: MusicAction[] = [];
    if (!ctx.active) {
      if (this.state.s !== 'off') out.push({ t: 'stop', fadeOut: 1.2 });
      this.state = { s: 'off' };
      return out;
    }
    const mood = moodAt(ctx.x, ctx.z, ctx.night);
    const st = this.state;

    // A threat overrides everything else. A fight never steps back down to the warning loop while it lasts.
    if (ctx.threat !== 'none') {
      if (st.s !== 'threat') {
        // Each new encounter alternates the voice of its fight music.
        this.fightVoice = this.fightVoice === 'composed' ? 'generated' : 'composed';
        const combat = ctx.threat === 'combat';
        out.push({ t: 'loop', id: this.loopFor(combat ? 'combat' : 'alert'), fadeIn: combat ? 0.8 : 2.2 });
        this.state = { s: 'threat', level: ctx.threat, calm: 0 };
      } else {
        if (ctx.threat === 'combat' && st.level === 'alert') {
          out.push({ t: 'loop', id: this.loopFor('combat'), fadeIn: 0.8 });
          st.level = 'combat';
        }
        st.calm = 0;
      }
      return out;
    }

    if (ctx.diegetic && st.s !== 'threat') {
      // Music in the world itself (the inn): the score gives way and waits until it is over.
      if (st.s === 'piece') out.push({ t: 'stop', fadeOut: 3 });
      if (st.s !== 'wait' || st.left < AFTER_DIEGETIC) this.state = { s: 'wait', left: AFTER_DIEGETIC };
      return out;
    }

    switch (st.s) {
      case 'off':
        this.state = { s: 'wait', left: this.range(FIRST_WAIT) };
        break;
      case 'threat':
        st.calm += dt;
        if (st.calm >= (st.level === 'combat' ? COMBAT_HOLD : 1.5)) {
          out.push({ t: 'stop', fadeOut: 3 });
          this.state = { s: 'wait', left: this.range([12, 24]) };
        }
        break;
      case 'wait':
        st.left -= dt;
        if (st.left <= 0) {
          const id = this.pick(mood);
          if (id) {
            this.last = id;
            out.push({ t: 'piece', id, fadeIn: 2.5 });
            this.state = { s: 'piece', id, mood, left: WORLD_AUDIO.music[id].duration, offMood: 0 };
          } else st.left = 30;
        }
        break;
      case 'piece':
        st.left -= dt;
        // A piece for another mood finishes naturally unless the new mood holds for a while (entering a shrine).
        st.offMood = mood === st.mood ? 0 : st.offMood + dt;
        if (st.left <= 0) this.state = { s: 'wait', left: this.range(QUIET_AFTER_PIECE) };
        else if (st.offMood > MOOD_SETTLE && (mood === 'sacred' || st.mood === 'sacred')) {
          out.push({ t: 'stop', fadeOut: 4 });
          this.state = { s: 'wait', left: 4.5 };
        }
        break;
    }
    return out;
  }

  /** The composed form two times in three; the generated one keeps some variety. */
  private either(composed: MusicId, generated: MusicId): MusicId {
    return this.random() < 2 / 3 ? composed : generated;
  }

  /** A sting over the quiet: never over a fight. A discovery names its place, so its region can answer. */
  sting(kind: 'discover' | 'quest' | 'victory' | 'death', place?: PlaceId): MusicAction[] {
    if (kind === 'death') {
      this.state = { s: 'off' };
      return [{ t: 'stop', fadeOut: 0.4 }, { t: 'sting', id: this.either('sting_fall_theme', 'sting_death') }];
    }
    if (kind === 'victory') {
      const was = this.state;
      this.state = { s: 'wait', left: this.range([14, 26]) };
      const id = this.either('sting_victory_theme', 'sting_victory');
      return was.s === 'threat' ? [{ t: 'stop', fadeOut: 1.5 }, { t: 'sting', id }] : [{ t: 'sting', id }];
    }
    if (this.state.s === 'threat') return [];
    if (kind === 'quest') return [{ t: 'sting', id: this.either('sting_quest_theme', 'sting_quest') }];
    if (place && PLACE_REGION[place]) return [{ t: 'sting', id: REGION_STING[PLACE_REGION[place]] }];
    return [{ t: 'sting', id: this.random() < 0.5 ? 'sting_discover' : 'sting_lute' }];
  }
}
