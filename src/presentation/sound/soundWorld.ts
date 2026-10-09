import type { NpcId, PlaceId } from '../../game/types';
import { ANCHORS, bySpec, frontOf } from '../../world/layout';
import type { Terrain } from '../../world/terrain';
import { npcStyle } from '../npcStyle';
import { ANIMAL_AUDIO, ANIMAL_CALL_COOLDOWN, ANIMAL_VOICE_LIMIT, type AnimalCall, type AnimalCallFile } from './animalAudio';
import { type BankName, clipRef, VariantPicker } from './clips';
import { type Cue, stepCue, workSound, type WorkSound } from './foley';
import { type MusicAction, MusicDirector, type Threat } from './musicDirector';
import {
  bedTargets, cricketDensity, cricketRate, EmitterScheduler, groundSurface, innSong, temperatureAt, type Vec3, type WorldSoundState,
} from './soundscape';
import { VOICE_AUDIO, type VoiceBank, type VoiceLineId } from './voiceManifest';
import { WORLD_AUDIO, type LoopId, type MusicId, type SongId } from './worldAudioManifest';
import type { WaterSoundState } from '../water/waterSound';

/**
 * Tervain's recorded world sound at run time: one-shots placed in the world, looping beds that follow the place,
 * wildlife calls around the listener, the residents' footsteps, work and talk, enemies' calls, objects knocking into
 * things, crickets keeping time with the air's warmth, a heartbeat when wounded, the inn's evening tunes, and the
 * in-world score. The decisions come from the pure modules (foley, soundscape, musicDirector); this
 * class only turns them into Web Audio nodes, and no audio failure ever reaches the game.
 */

export interface SoundBuses {
  effects: GainNode;
  ambience: GainNode;
  music: GainNode;
  dialogue: GainNode;
}

export interface SoundResident {
  readonly id: NpcId;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** The actor's animation mode: walk, work, talk, sit or idle. */
  readonly mode: string;
  readonly hidden: boolean;
}

export interface SoundEnemy {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly state: string;
  readonly alive: boolean;
  readonly spawn: { readonly kind: 'bandit' | 'thornback' };
}

export interface SoundProp {
  id: string;
  kind: 'barrel' | 'crate';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  held: boolean;
  /** How much of it is under water (0 dry .. 1 sunk): a floating barrel knocks hollow and sloshes. */
  wet?: number;
}

export type GroundProbe = Pick<Terrain, 'deckAt' | 'carveAt' | 'seaDepth' | 'slopeAt'>;

export interface SoundFrame {
  /** play: the world runs; paused: a panel or conversation is open over it; dead: the fall. */
  mode: 'play' | 'paused' | 'dead';
  /** The camera: position and forward direction. */
  listener: Vec3 & { fx: number; fy: number; fz: number };
  /** `health` is a fraction of the maximum, 0..1. */
  player: Vec3 & { exhausted: boolean; health: number };
  world: WorldSoundState;
  indoors: boolean;
  threat: Threat;
  npcs: readonly SoundResident[];
  enemies: readonly SoundEnemy[];
  props: readonly SoundProp[];
  terrain: GroundProbe;
  /** Lines the people nearby may say soon (voice.ts ids): their banks are decoded ahead and kept while wanted. */
  speech?: readonly string[];
  /** The water around the listener and everything that disturbed it since the last frame. */
  water?: WaterSoundState | null;
}

type Bus = keyof SoundBuses;

export interface PlayOptions {
  /** Placed in the world; without a position the sound belongs to the player and is not panned. */
  at?: Vec3;
  bus?: Bus;
  /** Multiplies the cue's own level. */
  scale?: number;
  /** Distance (metres) inside which a placed sound is at full level; larger for loud sources. */
  ref?: number;
  /** Beyond this distance a placed sound is not started at all. */
  maxDistance?: number;
  /** Reverb send before the distance increase, 0..1. */
  reverb?: number;
  rate?: number;
}

interface Voice {
  source: AudioBufferSourceNode;
  nodes: AudioNode[];
  bus: Bus;
  started: number;
  speaker?: string;
  animal?: string;
  /** A voice that follows its speaker: where to place its panner each frame (A70). */
  follow?: { panner: PannerNode; at: () => Vec3 };
}

interface Bed {
  id: LoopId;
  gain: GainNode;
  panner: PannerNode | null;
  source: AudioBufferSourceNode | null;
  loading: boolean;
  buffer: AudioBuffer | null;
  silentFor: number;
  target: number;
}

interface PersonClock {
  /** Where they were last heard, and how far they have walked since their last footfall. */
  x: number;
  z: number;
  walked: number;
  work: number;
  burst: number;
  idle: number;
}

/**
 * Metres between footfalls: a resident's walk (the measured stride of the walking people), a toll-jumper walking and
 * running, the creature pacing and charging. Feet sound only for ground actually covered, never for walking in place.
 */
const STRIDE = { resident: 0.74, bandit: 0.8, banditRun: 1.2, beast: 0.65, beastRun: 1.3 } as const;
/** A larger jump between checks is a teleport or a respawn, not a walk. */
const TELEPORT = 4;

const LIMIT: Record<Bus, number> = { effects: 28, ambience: 18, dialogue: 6, music: 4 };
const UPDATE_INTERVAL = 1 / 20;
const LISTENER_INTERVAL = 1 / 60;
/** A bed that stays silent this long gives its decoded memory back. */
const BED_RELEASE = 45;
/** Fight loops and stings are decoded on demand and released after this long unused. */
const MUSIC_RELEASE = 150;

/** The hamlet's three silent residents stand on the same marks as in ambient.ts; two of them sleep after dark. */
const MENDER = frontOf(bySpec('net_store'), 2.4);
const FIRE = ANCHORS.strand_fire ?? { x: -103, z: 16 };
const KEEPER_DOOR = frontOf(bySpec('keeper_cottage'), 2.4);
const NET_MENDING: WorkSound = { clip: 'item.cloth', every: [5, 11], gain: 0.24 };
export const AMBIENT_PEOPLE_SOUND: readonly { id: string; x: number; z: number; work: WorkSound | null; sleeps: boolean }[] = [
  { id: 'ambient:fisher', x: MENDER.x, z: MENDER.z, work: NET_MENDING, sleeps: true },
  { id: 'ambient:fireside', x: FIRE.x + 1.6, z: FIRE.z + 1.0, work: null, sleeps: true },
  { id: 'ambient:keeper', x: KEEPER_DOOR.x + 2.6, z: KEEPER_DOOR.z - 1.2, work: null, sleeps: false },
];

/** A procedural stereo impulse response: sparse early reflections, then a decaying, decorrelated diffuse tail. */
export function impulse(ctx: BaseAudioContext, seconds: number, decay: number, early: readonly number[]): AudioBuffer {
  const n = Math.max(1, Math.round(seconds * ctx.sampleRate));
  const ir = ctx.createBuffer(2, n, ctx.sampleRate);
  let seed = 0x2545f491;
  const rnd = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) / 4294967296) * 2 - 1;
  };
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < n; i++) {
      const t = i / ctx.sampleRate;
      // A short fade-in: the dry path already carries the direct sound.
      d[i] = rnd() * Math.exp(-t / decay) * Math.min(1, t / 0.012) * 0.6;
    }
    early.forEach((at, k) => {
      const i = Math.round((at + c * 0.0037) * ctx.sampleRate);
      if (i < n) d[i] = d[i]! + (k % 2 ? -1 : 1) * 0.5 * Math.exp(-at / decay);
    });
  }
  return ir;
}

/** Place a new one-shot's panner at once. */
function placeAt(p: PannerNode, at: Vec3) {
  if (p.positionX) {
    p.positionX.value = at.x;
    p.positionY.value = at.y;
    p.positionZ.value = at.z;
  } else (p as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(at.x, at.y, at.z);
}

function quietly(fn: () => void) {
  try {
    fn();
  } catch {
    // stopping or disconnecting twice is harmless
  }
}

export class SoundWorld {
  private readonly ctx: AudioContext;
  private readonly buses: SoundBuses;
  private readonly base: string;
  /** Ogg Opus where the browser plays it; AAC otherwise, and for good after an Opus file fails to decode. */
  private ext: 'ogg' | 'm4a';
  private readonly bankBuffers = new Map<BankName, AudioBuffer>();
  private readonly bankLoads = new Map<BankName, Promise<void>>();
  private readonly musicBuffers = new Map<MusicId, { buffer: AudioBuffer; used: number }>();
  private readonly musicLoads = new Map<MusicId, Promise<AudioBuffer | null>>();
  private readonly beds = new Map<LoopId, Bed>();
  private readonly voices = new Set<Voice>();
  private readonly animalBuffers = new Map<AnimalCallFile, AudioBuffer>();
  private readonly animalLoads = new Map<AnimalCallFile, Promise<void>>();
  private readonly animalVoices = new Map<string, Voice>();
  private readonly animalLastCall = new Map<string, number>();
  private animalsPrepared = false;
  private animalsAudible = true;
  /** Stings share the music one-shot cap and remain owned until ended or cancelled. */
  private readonly stings = new Set<Voice>();
  private stingEpoch = 0;
  private worldActive = false;
  private hidden = false;
  private readonly pendingMedia = new Map<HTMLAudioElement, number>();
  private streamRequest = 0;
  private readonly retirements = new Map<ReturnType<typeof setTimeout>, () => void>();
  private readonly retiringMedia = new Set<HTMLAudioElement>();
  private readonly picker: VariantPicker;
  private readonly random: () => number;
  private readonly emitters: EmitterScheduler;
  private readonly director: MusicDirector;
  private readonly owned: AudioNode[] = [];
  private readonly targets = new WeakMap<AudioParam, number>();
  /** Outdoor beds and point sources pass a muffle that closes indoors and in panels, and fall silent under a menu. */
  private readonly outdoor: { filter: BiquadFilterNode; gain: GainNode };
  /** Open air among trees and walls, and a stone room. */
  private readonly reverbs: { send: GainNode }[] = [];
  /** Pieces and fight loops step back under a sting. */
  private readonly duck: GainNode;
  /** ...and under speech. */
  private readonly talk: GainNode;
  private readonly voiceBuffers = new Map<VoiceBank, AudioBuffer>();
  private readonly voiceLoads = new Map<VoiceBank, Promise<void>>();
  /** When each loaded bank last played or was wanted, for letting go of the ones nobody near is using. */
  private readonly voiceUsed = new Map<VoiceBank, number>();
  private voiceSweep = 0;
  /** Each speaker says one thing at a time. */
  private readonly speaking = new Map<string, Voice>();
  private speechEpoch = 0;
  private speechActive = false;
  private readonly people = new Map<string, PersonClock>();
  private readonly foes = new Map<string, { state: string; x: number; z: number; walked: number }>();
  private readonly objects = new Map<string, { speed: number; cooldown: number }>();
  private piece: { media: HTMLAudioElement; source: MediaElementAudioSourceNode; gain: GainNode } | null = null;
  /** The inn's tune, streamed through the walls (a muffle) from the inn's place in the world. */
  private song: { id: SongId; media: HTMLAudioElement; source: MediaElementAudioSourceNode; gain: GainNode; nodes: AudioNode[] } | null = null;
  private lastSong: SongId | null = null;
  private songRest = 5;
  private songAway = 0;
  private songLevel = 0;
  private readonly crickets: { x: number; z: number; clock: number; rate: number; voice: number }[] = [];
  private heart = 0.3;
  private loop: { id: MusicId; source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private loopWanted: MusicId | null = null;
  private acc = 0;
  private listenerAcc = 0;
  private breath = 0.4;
  private clock = 0;
  private open = false;
  private lastFrame: SoundFrame | null = null;
  private disposed = false;
  /** Counts for the developer panel. */
  readonly stats = { voices: 0, beds: 0, emitted: 0, dropped: 0, decodeErrors: 0 };

  constructor(ctx: AudioContext, buses: SoundBuses, base: string, random: () => number = Math.random) {
    this.ctx = ctx;
    this.buses = buses;
    this.base = base;
    this.random = random;
    this.picker = new VariantPicker(random);
    this.emitters = new EmitterScheduler(random);
    this.director = new MusicDirector(random);
    const probe = typeof Audio === 'function' ? new Audio() : null;
    this.ext = probe && probe.canPlayType('audio/ogg; codecs="opus"') ? 'ogg' : 'm4a';
    try {
      const filter = this.own(ctx.createBiquadFilter());
      filter.type = 'lowpass';
      filter.frequency.value = 20000;
      filter.Q.value = 0.5;
      const gain = this.own(ctx.createGain());
      gain.gain.value = 0;
      filter.connect(gain).connect(buses.ambience);
      this.outdoor = { filter, gain };
      const rooms: [AudioBuffer, number][] = [
        [impulse(ctx, 1.8, 0.42, [0.021, 0.034, 0.055, 0.081]), 0.32],
        [impulse(ctx, 1.1, 0.25, [0.006, 0.011, 0.017, 0.024, 0.031]), 0.42],
      ];
      rooms.forEach(([ir, level], i) => {
        const send = this.own(ctx.createGain());
        send.gain.value = i === 0 ? 1 : 0;
        const convolver = this.own(ctx.createConvolver());
        convolver.normalize = true;
        convolver.buffer = ir;
        const wet = this.own(ctx.createGain());
        wet.gain.value = level;
        send.connect(convolver).connect(wet).connect(buses.effects);
        this.reverbs.push({ send });
      });
      this.duck = this.own(ctx.createGain());
      this.talk = this.own(ctx.createGain());
      this.duck.connect(this.talk).connect(buses.music);
    } catch (error) {
      for (const n of this.owned) quietly(() => n.disconnect());
      throw error;
    }
    for (const name of Object.keys(WORLD_AUDIO.banks) as BankName[]) void this.loadBank(name);
    // The hero speaks first, on the strand; his other lines and everyone else's load when they are wanted.
    void this.loadVoiceBank(VOICE_AUDIO.lines['hero.arrival'][0]);
  }

  private own<T extends AudioNode>(node: T): T {
    this.owned.push(node);
    return node;
  }

  /**
   * Bounded automation, as in the audio facade: an unchanged target schedules nothing, and a new one replaces the
   * pending ramp instead of piling events onto the parameter's timeline.
   */
  private target(param: AudioParam, value: number, t: number, constant: number, epsilon = 1e-4) {
    const last = this.targets.get(param);
    if (last !== undefined && Math.abs(last - value) < epsilon) return;
    this.targets.set(param, value);
    if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(t);
    else {
      const current = param.value;
      param.cancelScheduledValues(t);
      param.setValueAtTime(current, t);
    }
    param.setTargetAtTime(value, t, constant);
  }

  /** Move a bed's panner smoothly; centimetre changes are not worth an automation event. */
  private moveTo(p: PannerNode, at: Vec3, t: number) {
    if (p.positionX) {
      this.target(p.positionX, at.x, t, 0.4, 0.05);
      this.target(p.positionY, at.y, t, 0.4, 0.05);
      this.target(p.positionZ, at.z, t, 0.4, 0.05);
    } else placeAt(p, at);
  }

  /* ------------------------------------------------------------------ loading */

  url(file: string, ext = this.ext, folder: string = WORLD_AUDIO.base): string {
    return `${this.base}${folder}${file}.${ext}`;
  }

  private async decode(file: string, folder: string = WORLD_AUDIO.base): Promise<AudioBuffer | null> {
    for (;;) {
      const ext = this.ext;
      try {
        const res = await fetch(this.url(file, ext, folder));
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.arrayBuffer();
        if (this.disposed) return null;
        const buffer = await this.ctx.decodeAudioData(data);
        // decodeAudioData cannot be aborted: disposal may have happened during its await.
        return this.disposed ? null : buffer;
      } catch {
        if (this.disposed) return null;
        // As with the menu score, a browser that names Opus but cannot use it falls back to AAC.
        if (ext === 'ogg' && !this.disposed) {
          this.ext = 'm4a';
          continue;
        }
        this.stats.decodeErrors++;
        return null;
      }
    }
  }

  private loadBank(name: BankName): Promise<void> {
    let p = this.bankLoads.get(name);
    if (!p) {
      p = this.decode(WORLD_AUDIO.banks[name].file).then((buffer) => {
        if (buffer && !this.disposed) this.bankBuffers.set(name, buffer);
        // A failed bank is tried again on a later request.
        else this.bankLoads.delete(name);
      });
      this.bankLoads.set(name, p);
    }
    return p;
  }

  private loadMusic(id: MusicId): Promise<AudioBuffer | null> {
    const held = this.musicBuffers.get(id);
    if (held) {
      held.used = this.clock;
      return Promise.resolve(held.buffer);
    }
    let p = this.musicLoads.get(id);
    if (!p) {
      p = this.decode(WORLD_AUDIO.music[id].file).then((buffer) => {
        this.musicLoads.delete(id);
        if (buffer && !this.disposed) this.musicBuffers.set(id, { buffer, used: this.clock });
        return buffer;
      });
      this.musicLoads.set(id, p);
    }
    return p;
  }

  private loadVoiceBank(bank: VoiceBank): Promise<void> {
    if (this.disposed || this.hidden) return Promise.resolve();
    this.voiceUsed.set(bank, this.clock);
    if (this.voiceBuffers.has(bank)) return Promise.resolve();
    let p = this.voiceLoads.get(bank);
    if (!p) {
      const epoch = this.speechEpoch;
      p = this.decode(VOICE_AUDIO.banks[bank].file, VOICE_AUDIO.base).then((buffer) => {
        if (this.voiceLoads.get(bank) !== p) return;
        this.voiceLoads.delete(bank);
        if (buffer && !this.disposed && !this.hidden && epoch === this.speechEpoch) this.voiceBuffers.set(bank, buffer);
      });
      this.voiceLoads.set(bank, p);
    }
    return p;
  }

  private loadAnimal(file: AnimalCallFile): Promise<void> {
    if (this.disposed || this.hidden || !this.animalsAudible || this.animalBuffers.has(file)) return Promise.resolve();
    let p = this.animalLoads.get(file);
    if (!p) {
      p = this.decode(file, ANIMAL_AUDIO.base).then((buffer) => {
        this.animalLoads.delete(file);
        if (buffer && !this.disposed) this.animalBuffers.set(file, buffer);
      });
      this.animalLoads.set(file, p);
    }
    return p;
  }

  private prepareAnimals() {
    if (this.animalsPrepared || !this.animalsAudible || this.hidden) return;
    this.animalsPrepared = true;
    for (const animal of Object.values(ANIMAL_AUDIO.species)) for (const file of animal.files) void this.loadAnimal(file);
  }

  /** Fetches all of a speaker's spoken lines at once. The game instead names the lines it may need (`speech`). */
  prepareVoice(speaker: string): Promise<void> {
    const banks = (Object.keys(VOICE_AUDIO.banks) as VoiceBank[]).filter((b) => VOICE_AUDIO.banks[b].speaker === speaker && VOICE_AUDIO.banks[b].set === 'spoken');
    return Promise.all(banks.map((b) => this.loadVoiceBank(b))).then(() => undefined);
  }

  /** True when a line can start now; false while its bank is still on its way (it is requested). */
  voiceReady(id: VoiceLineId): boolean {
    if (this.disposed || !this.speechActive || this.hidden) return false;
    const bank = VOICE_AUDIO.lines[id][0];
    if (this.voiceBuffers.has(bank)) return true;
    void this.loadVoiceBank(bank);
    return false;
  }

  /**
   * A spoken line on the dialogue bus, from the speaker's place in the world when given (a resident), or close and
   * centred (the hero). The speaker's previous line stops, and the score steps back while anyone speaks. False when
   * the line's bank has not loaded yet.
   */
  speak(id: VoiceLineId, opt: { at?: Vec3 | (() => Vec3) } = {}): boolean {
    if (this.disposed || !this.speechActive || this.hidden || this.ctx.state === 'closed') return false;
    const [bank, offset, length, speaker] = VOICE_AUDIO.lines[id];
    const buffer = this.voiceBuffers.get(bank);
    if (!buffer) {
      void this.loadVoiceBank(bank);
      return false;
    }
    this.voiceUsed.set(bank, this.clock);
    const nodes: AudioNode[] = [];
    let voice: Voice | null = null;
    let follow: Voice['follow'];
    const at = typeof opt.at === 'function' ? opt.at() : opt.at;
    try {
      this.hush(speaker);
      this.makeRoom('dialogue');
      const ctx = this.ctx;
      const source = ctx.createBufferSource();
      nodes.push(source);
      source.buffer = buffer;
      const gain = ctx.createGain();
      nodes.push(gain);
      gain.gain.value = 1;
      source.connect(gain);
      let tail: AudioNode = gain;
      if (at) {
        const panner = ctx.createPanner();
        nodes.push(panner);
        panner.panningModel = 'equalpower';
        panner.distanceModel = 'inverse';
        // Speech carries a little further than a footfall before it begins to fall away.
        panner.refDistance = 3;
        panner.rolloffFactor = 1;
        panner.maxDistance = 10000;
        placeAt(panner, at);
        if (typeof opt.at === 'function') follow = { panner, at: opt.at };
        tail.connect(panner);
        tail = panner;
      }
      tail.connect(this.buses.dialogue);
      if (at) {
        // A little of the place's air on a voice out in the world.
        const send = ctx.createGain();
        nodes.push(send);
        send.gain.value = 0.1;
        tail.connect(send);
        for (const r of this.reverbs) send.connect(r.send);
      }
      voice = { source, nodes, speaker, bus: 'dialogue', started: ctx.currentTime, follow };
      this.speaking.set(speaker, voice);
      this.voices.add(voice);
      const held = voice;
      source.onended = () => this.release(held);
      source.start(ctx.currentTime, offset, length);
      this.duckForSpeech();
      return true;
    } catch {
      if (voice) {
        quietly(() => voice!.source.stop());
        this.release(voice);
      } else for (const n of nodes) quietly(() => n.disconnect());
      return false;
    }
  }

  /** Lets go of decoded speech nobody has wanted for a minute; it is fetched again when wanted. */
  private sweepVoices() {
    for (const bank of [...this.voiceBuffers.keys()]) {
      if (this.speaking.has(VOICE_AUDIO.banks[bank].speaker)) continue;
      // Banks of lines still wanted nearby are touched every frame; anything else goes after a minute.
      if (this.clock - (this.voiceUsed.get(bank) ?? 0) > 60) {
        this.voiceBuffers.delete(bank);
        this.voiceLoads.delete(bank);
        this.voiceUsed.delete(bank);
      }
    }
  }

  /** Banks of decoded speech held now (for the developer panel and the tests). */
  get voiceBanksHeld(): VoiceBank[] {
    return [...this.voiceBuffers.keys()];
  }

  /** Stops whatever this speaker is saying. */
  hush(speaker: string) {
    const v = this.speaking.get(speaker);
    if (!v) return;
    quietly(() => v.source.stop());
    this.release(v);
  }

  private cancelSpeech() {
    this.speechEpoch++;
    // Decoding cannot be aborted, but an old result must neither play nor retain a stale bank.
    for (const bank of this.voiceLoads.keys()) if (!this.voiceBuffers.has(bank)) this.voiceUsed.delete(bank);
    this.voiceLoads.clear();
    for (const speaker of [...this.speaking.keys()]) this.hush(speaker);
  }

  /** Who is speaking now (for the developer panel and the browser review). */
  get speakers(): string[] {
    return [...this.speaking.keys()];
  }

  private duckForSpeech() {
    const talking = this.speaking.size > 0;
    this.target(this.talk.gain, talking ? 0.55 : 1, this.ctx.currentTime, talking ? 0.08 : 0.6);
  }

  /** True once every one-shot bank is decoded (for the developer panel and the browser review). */
  get banksReady(): boolean {
    return this.bankBuffers.size === Object.keys(WORLD_AUDIO.banks).length;
  }

  /** 1 while recorded beds are sounding in the world; the procedural beds step back underneath them. */
  get recordedLevel(): number {
    if (!this.open) return 0;
    for (const bed of this.beds.values()) if (bed.source) return 1;
    return 0;
  }

  /* ------------------------------------------------------------------ one-shots */

  /** Play exactly once when a real animal's Call gesture begins, from that actor's current position. */
  callAnimal(call: AnimalCall): boolean {
    if (this.disposed || this.hidden || !this.worldActive || this.lastFrame?.mode !== 'play'
      || !this.animalsAudible || this.ctx.state !== 'running') return false;
    const profile = ANIMAL_AUDIO.species[call.species];
    const at = call.position;
    if (!profile || !Number.isFinite(at.x) || !Number.isFinite(at.y) || !Number.isFinite(at.z)) return false;
    const l = this.lastFrame.listener;
    const distance = Math.hypot(at.x - l.x, at.y - l.y, at.z - l.z);
    if (distance > profile.maxDistance || this.animalVoices.has(call.id) || this.animalVoices.size >= ANIMAL_VOICE_LIMIT
      || this.clock - (this.animalLastCall.get(call.id) ?? -Infinity) < ANIMAL_CALL_COOLDOWN) return false;
    const file = profile.files[call.callVariant - 1];
    if (!file) return false;
    const buffer = this.animalBuffers.get(file);
    if (!buffer) {
      void this.loadAnimal(file);
      this.stats.dropped++;
      // Never replay after decoding: the visible gesture may already be over or the world paused.
      return false;
    }
    const nodes: AudioNode[] = [];
    let voice: Voice | null = null;
    try {
      this.makeRoom('ambience');
      const source = this.ctx.createBufferSource();
      nodes.push(source);
      source.buffer = buffer;
      source.playbackRate.value = 1 + (this.random() * 2 - 1) * 0.025;
      const gain = this.ctx.createGain();
      nodes.push(gain);
      gain.gain.value = profile.gain;
      source.connect(gain);
      let tail: AudioNode = gain;
      if (distance > 12) {
        const air = this.ctx.createBiquadFilter();
        nodes.push(air);
        air.type = 'lowpass';
        air.frequency.value = Math.max(1400, 18000 * Math.exp(-(distance - 12) / 40));
        tail.connect(air);
        tail = air;
      }
      const panner = this.ctx.createPanner();
      nodes.push(panner);
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = profile.ref;
      panner.rolloffFactor = 1;
      panner.maxDistance = 10000;
      placeAt(panner, at);
      // The existing outdoor path also muffles calls heard from a roofed room.
      tail.connect(panner).connect(this.outdoor.filter);
      voice = { source, nodes, animal: call.id, bus: 'ambience', started: this.ctx.currentTime };
      this.voices.add(voice);
      this.animalVoices.set(call.id, voice);
      const held = voice;
      source.onended = () => this.release(held);
      source.start(this.ctx.currentTime);
      this.animalLastCall.set(call.id, this.clock);
      this.stats.emitted++;
      return true;
    } catch {
      if (voice) {
        quietly(() => voice!.source.stop());
        this.release(voice);
      } else for (const node of nodes) quietly(() => node.disconnect());
      return false;
    }
  }

  /** Mute/menu changes retire calls, so an unheard tail cannot emerge when the mix is restored. */
  setAnimalsAudible(audible: boolean) {
    this.animalsAudible = audible;
    if (!audible) this.cancelAnimals();
  }

  private cancelAnimals() {
    for (const voice of [...this.animalVoices.values()]) {
      quietly(() => voice.source.stop());
      this.release(voice);
    }
  }

  /** Play a cue now (or after its delay). Returns false when it was not started. */
  play(cue: Cue, opt: PlayOptions = {}): boolean {
    if (this.disposed || this.ctx.state === 'closed') return false;
    try {
      const ref = clipRef(cue.clip);
      const buffer = this.bankBuffers.get(ref.bank);
      if (!buffer) {
        void this.loadBank(ref.bank);
        this.stats.dropped++;
        return false;
      }
      const bus = opt.bus ?? 'effects';
      let distance = 0;
      if (opt.at) {
        const l = this.lastFrame?.listener ?? opt.at;
        distance = Math.hypot(opt.at.x - l.x, opt.at.y - l.y, opt.at.z - l.z);
        if (distance > (opt.maxDistance ?? 60)) return false;
      }
      const take = cue.variant !== undefined ? Math.min(ref.variants.length - 1, Math.max(0, cue.variant)) : this.picker.pick(cue.clip);
      const [offset, length] = ref.variants[take]!;
      const from = Math.min(length, Math.max(0, cue.from ?? 0));
      const to = Math.min(length, cue.to ?? length);
      if (to - from < 0.02) return false;
      this.makeRoom(bus);
      const ctx = this.ctx;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const spread = cue.pitch ?? 0;
      source.playbackRate.value = (opt.rate ?? 1) * (1 + (this.random() * 2 - 1) * spread);
      const gain = ctx.createGain();
      gain.gain.value = cue.gain * (opt.scale ?? 1) * (0.92 + 0.16 * this.random());
      source.connect(gain);
      const nodes: AudioNode[] = [source, gain];
      let tail: AudioNode = gain;
      if (opt.at) {
        // Air takes the top off distant sounds; the panner places them and lowers them with distance.
        if (distance > 12) {
          const air = ctx.createBiquadFilter();
          air.type = 'lowpass';
          air.frequency.value = Math.max(1400, 18000 * Math.exp(-(distance - 12) / 40));
          tail.connect(air);
          tail = air;
          nodes.push(air);
        }
        const panner = ctx.createPanner();
        panner.panningModel = 'equalpower';
        panner.distanceModel = 'inverse';
        panner.refDistance = opt.ref ?? 2;
        panner.rolloffFactor = 1;
        panner.maxDistance = 10000;
        placeAt(panner, opt.at);
        tail.connect(panner);
        tail = panner;
        nodes.push(panner);
      }
      tail.connect(this.buses[bus]);
      const send = Math.min(1, (opt.reverb ?? 0.06) + (opt.at ? Math.min(0.35, distance / 120) : 0));
      if (send > 0.01) {
        const s = ctx.createGain();
        s.gain.value = send;
        tail.connect(s);
        for (const r of this.reverbs) s.connect(r.send);
        nodes.push(s);
      }
      const voice: Voice = { source, nodes, bus, started: ctx.currentTime };
      this.voices.add(voice);
      source.onended = () => this.release(voice);
      source.start(ctx.currentTime + Math.max(0, cue.delay ?? 0), offset + from, to - from);
      return true;
    } catch {
      return false;
    }
  }

  /** Several layers of one action. */
  playAll(cues: readonly Cue[], opt: PlayOptions = {}) {
    for (const c of cues) this.play(c, opt);
  }

  private release(v: Voice) {
    this.stings.delete(v);
    if (!this.voices.delete(v)) return;
    if (v.animal && this.animalVoices.get(v.animal) === v) this.animalVoices.delete(v.animal);
    if (v.speaker && this.speaking.get(v.speaker) === v) this.speaking.delete(v.speaker);
    for (const n of v.nodes) quietly(() => n.disconnect());
    if (v.speaker) this.duckForSpeech();
  }

  /** Keep each bus within its voice budget by ending its oldest voice. */
  private makeRoom(bus: Bus) {
    let count = 0;
    let oldest: Voice | null = null;
    for (const v of this.voices) {
      if (v.bus !== bus) continue;
      count++;
      if (!oldest || v.started < oldest.started) oldest = v;
    }
    if (count >= LIMIT[bus] && oldest) {
      const v = oldest;
      quietly(() => v.source.stop());
      this.release(v);
    }
  }

  /* ------------------------------------------------------------------ the frame */

  /** Called every frame; `null` while a menu covers the world. */
  update(dt: number, frame: SoundFrame | null) {
    if (this.disposed) return;
    // Invalidate pending decodes immediately, including menu frames below the 20 Hz cadence.
    if (!frame && this.worldActive) this.cancelStings();
    this.worldActive = !!frame;
    if (!frame || frame.mode !== 'play') this.cancelAnimals();
    const speechActive = frame?.mode === 'play' && !this.hidden;
    if (!speechActive && (this.speechActive || this.voiceLoads.size > 0)) this.cancelSpeech();
    this.speechActive = speechActive;
    // A voice that follows its speaker moves with them, so a remark made walking is heard from the walker (A70).
    for (const voice of this.speaking.values()) {
      const follow = voice.follow;
      if (follow) quietly(() => placeAt(follow.panner, follow.at()));
    }
    try {
      this.clock += dt;
      if (frame) {
        this.lastFrame = frame;
        if (frame.mode === 'play') this.prepareAnimals();
        this.listenerAcc += dt;
        if (this.listenerAcc >= LISTENER_INTERVAL) {
          this.listenerAcc = 0;
          this.setListener(frame.listener);
        }
        // Fights and knocks are timed to the frame; the rest of the world is checked twenty times a second.
        if (frame.mode === 'play') this.updateEnemies(frame);
        if (frame.mode !== 'paused') this.updateProps(dt, frame);
        if (frame.mode === 'play') this.updateWater(frame);
        for (const id of this.speechActive ? frame.speech ?? [] : []) {
          const line = VOICE_AUDIO.lines[id as VoiceLineId];
          if (line) void this.loadVoiceBank(line[0]);
        }
      }
      this.voiceSweep += dt;
      if (this.voiceSweep > 5) {
        this.voiceSweep = 0;
        this.sweepVoices();
      }
      this.acc += dt;
      if (this.acc < UPDATE_INTERVAL) return;
      const step = Math.min(0.25, this.acc);
      this.acc = 0;
      this.updateBeds(step, frame);
      this.updateMusic(step, frame);
      if (frame?.mode === 'play') {
        for (const e of this.emitters.update(step, { ...frame.listener, indoors: frame.indoors }, frame.world)) {
          if (this.play({ clip: e.clip, gain: e.gain, pitch: e.pitch, delay: e.delay }, { at: e.at, bus: 'ambience', ref: 9, maxDistance: 110, reverb: 0.12 })) this.stats.emitted++;
        }
        this.updatePeople(step, frame);
        this.updateBreath(step, frame);
        this.updateCrickets(step, frame);
        this.updateHeart(step, frame);
      }
      this.updateSong(step, frame);
      this.stats.voices = this.voices.size;
    } catch {
      // A broken frame of sound never stops the game.
    }
  }

  private setListener(l: SoundFrame['listener']) {
    const li = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (li.positionX) {
      this.target(li.positionX, l.x, t, 0.02, 0.01);
      this.target(li.positionY, l.y, t, 0.02, 0.01);
      this.target(li.positionZ, l.z, t, 0.02, 0.01);
      this.target(li.forwardX, l.fx, t, 0.02, 0.002);
      this.target(li.forwardY, l.fy, t, 0.02, 0.002);
      this.target(li.forwardZ, l.fz, t, 0.02, 0.002);
    } else {
      const old = li as unknown as { setPosition(x: number, y: number, z: number): void; setOrientation(a: number, b: number, c: number, d: number, e: number, f: number): void };
      old.setPosition(l.x, l.y, l.z);
      old.setOrientation(l.fx, l.fy, l.fz, 0, 1, 0);
    }
  }

  /* ------------------------------------------------------------------ beds */

  private updateBeds(dt: number, frame: SoundFrame | null) {
    const t = this.ctx.currentTime;
    this.open = !!frame;
    // Under a menu the world's beds give way to the menu's own; indoors, in panels and under water they are muffled.
    const under = (frame?.water?.under ?? 0) > 0.05;
    const cutoff = !frame ? 20000 : under ? 420 : frame.indoors ? 1100 : frame.mode === 'paused' ? 5200 : 20000;
    this.target(this.outdoor.gain.gain, frame ? 1 : 0, t, frame ? 0.6 : 0.35);
    this.target(this.outdoor.filter.frequency, cutoff, t, 0.25, 1);
    const indoors = !!frame?.indoors;
    this.reverbs.forEach((r, i) => this.target(r.send.gain, (i === 1) === indoors ? 1 : 0, t, 0.3));
    const targets = frame ? bedTargets({ ...frame.listener, indoors }, frame.world, frame.water) : null;
    let active = 0;
    for (const id of Object.keys(WORLD_AUDIO.loops) as LoopId[]) {
      const target = targets?.[id];
      const gain = frame ? target?.gain ?? 0 : 0;
      let bed = this.beds.get(id);
      if (!bed) {
        if (gain <= 0.004) continue;
        bed = this.makeBed(id, !!target?.at);
      }
      bed.target = gain;
      if (gain > 0.004) {
        bed.silentFor = 0;
        if (!bed.source) this.startBed(bed);
      } else bed.silentFor += dt;
      this.target(bed.gain.gain, gain, t, gain > bed.gain.gain.value ? 1.4 : 0.9, 0.002);
      if (bed.panner && target?.at) this.moveTo(bed.panner, target.at, t);
      if (bed.source && bed.silentFor > BED_RELEASE) this.stopBed(bed);
      if (bed.source) active++;
    }
    this.stats.beds = active;
  }

  private makeBed(id: LoopId, positioned: boolean): Bed {
    const gain = this.own(this.ctx.createGain());
    gain.gain.value = 0;
    let panner: PannerNode | null = null;
    if (positioned) {
      panner = this.own(this.ctx.createPanner());
      panner.panningModel = 'equalpower';
      // Rivers, wheels and quarries are large sources: the place level already carries the distance, so the panner
      // only gives the side.
      panner.rolloffFactor = 0;
      gain.connect(panner).connect(this.outdoor.filter);
    } else if (id === 'interior' || id === 'hall_drone' || id === 'underwater') gain.connect(this.buses.ambience);
    else gain.connect(this.outdoor.filter);
    const bed: Bed = { id, gain, panner, source: null, loading: false, buffer: null, silentFor: 0, target: 0 };
    this.beds.set(id, bed);
    return bed;
  }

  private startBed(bed: Bed) {
    if (bed.loading) return;
    const play = (buffer: AudioBuffer) => {
      if (this.disposed || bed.source || bed.target <= 0.004) return;
      const s = this.ctx.createBufferSource();
      s.buffer = buffer;
      s.loop = true;
      s.connect(bed.gain);
      // Start anywhere in the loop, so two visits never begin identically.
      s.start(this.ctx.currentTime, this.random() * buffer.duration);
      bed.source = s;
    };
    if (bed.buffer) {
      play(bed.buffer);
      return;
    }
    bed.loading = true;
    void this.decode(WORLD_AUDIO.loops[bed.id].file).then((buffer) => {
      bed.loading = false;
      if (!buffer || this.disposed) return;
      bed.buffer = buffer;
      play(buffer);
    });
  }

  private stopBed(bed: Bed) {
    const s = bed.source;
    bed.source = null;
    bed.buffer = null;
    if (!s) return;
    quietly(() => s.stop());
    quietly(() => s.disconnect());
  }

  /* ------------------------------------------------------------------ residents, enemies, objects */

  private clockFor(id: string, x: number, z: number): PersonClock {
    let s = this.people.get(id);
    if (!s) {
      s = { x, z, walked: this.random() * STRIDE.resident, work: 1 + this.random() * 4, burst: 0, idle: 10 + this.random() * 30 };
      this.people.set(id, s);
    }
    return s;
  }

  private updatePeople(dt: number, frame: SoundFrame) {
    const l = frame.listener;
    for (const a of frame.npcs) {
      const d = Math.hypot(a.x - l.x, a.z - l.z);
      if (a.hidden || d > 36) continue;
      const s = this.clockFor(a.id, a.x, a.z);
      const at = { x: a.x, y: a.y + 0.2, z: a.z };
      const moved = Math.hypot(a.x - s.x, a.z - s.z);
      s.x = a.x;
      s.z = a.z;
      if (a.mode === 'walk') {
        if (moved < TELEPORT) s.walked += moved;
        if (s.walked >= STRIDE.resident) {
          s.walked %= STRIDE.resident;
          this.play(stepCue(groundSurface(frame.terrain, a.x, a.z), false, this.random), { at, scale: 0.85, ref: 1.6, maxDistance: 26, reverb: 0.05 });
        }
      } else if (a.mode === 'work') {
        this.workTick(s, workSound(a.id, npcStyle(a.id).work), dt, at);
      }
      // A resident talks only while their own voiced line plays: no crowd murmur over it (A70).
      if (a.mode !== 'walk' && a.mode !== 'talk') this.idleTick(s, dt, at, d);
    }
    for (const p of AMBIENT_PEOPLE_SOUND) {
      const d = Math.hypot(p.x - l.x, p.z - l.z);
      if (d > 30 || (p.sleeps && frame.world.nightness > 0.75)) continue;
      const s = this.clockFor(p.id, p.x, p.z);
      const at = { x: p.x, y: 1, z: p.z };
      this.workTick(s, p.work, dt, at);
      this.idleTick(s, dt, at, d);
    }
  }

  private workTick(s: PersonClock, w: WorkSound | null, dt: number, at: Vec3) {
    if (!w) return;
    s.work -= dt;
    if (s.work > 0) return;
    this.play({ clip: w.clip, gain: w.gain, pitch: 0.05 }, { at, ref: 2.5, maxDistance: 36, reverb: 0.08 });
    const span = (r: readonly [number, number]) => r[0] + (r[1] - r[0]) * this.random();
    if (w.burst && w.rest) {
      if (s.burst <= 0) s.burst = Math.round(span(w.burst));
      s.burst--;
      s.work = s.burst > 0 ? span(w.every) : span(w.rest);
    } else s.work = span(w.every);
  }

  /** Someone standing about now and then clears their throat or shifts their clothes. */
  private idleTick(s: PersonClock, dt: number, at: Vec3, d: number) {
    s.idle -= dt;
    if (s.idle > 0) return;
    s.idle = 22 + 40 * this.random();
    if (d > 16) return;
    const cough = this.random() < 0.3;
    this.play(
      cough ? { clip: 'voice.cough', gain: 0.32, pitch: 0.08 } : { clip: 'item.cloth', gain: 0.2, pitch: 0.06, from: 0, to: 1.2 },
      { at: { ...at, y: at.y + (cough ? 1.4 : 0.8) }, bus: cough ? 'dialogue' : 'effects', ref: 1.6, maxDistance: 18 },
    );
  }

  /** Enemies are heard by what they do: winding up, striking, staggering, falling, running. Noticing comes from the game. */
  private updateEnemies(frame: SoundFrame) {
    for (const e of frame.enemies) {
      let s = this.foes.get(e.id);
      if (!s) {
        s = { state: e.state, x: e.x, z: e.z, walked: 0 };
        this.foes.set(e.id, s);
      }
      const beast = e.spawn.kind === 'thornback';
      if (e.state !== s.state) {
        const at = { x: e.x, y: e.y + 1, z: e.z };
        switch (e.state) {
          case 'telegraph':
            if (beast) this.play({ clip: 'beast.attack', gain: 0.7, pitch: 0.05, to: 1.8 }, { at, ref: 5, maxDistance: 80 });
            else if (this.random() < 0.5) this.play({ clip: 'bandit.shout', gain: 0.55, pitch: 0.06 }, { at, bus: 'dialogue', ref: 4, maxDistance: 60 });
            break;
          case 'strike':
            this.play(beast ? { clip: 'swing.heavy', gain: 0.5, pitch: 0.05 } : { clip: 'swing', gain: 0.5, pitch: 0.06 }, { at, rate: beast ? 0.8 : 1, ref: 3 });
            break;
          case 'stagger':
            this.play(beast ? { clip: 'beast.hurt', gain: 0.6, pitch: 0.06, to: 1.4 } : { clip: 'voice.hurt', gain: 0.6, pitch: 0.06 }, { at, bus: beast ? 'effects' : 'dialogue', rate: beast ? 1 : 0.9, ref: 4 });
            break;
          case 'dead':
            this.play(beast ? { clip: 'beast.hurt', gain: 0.75, pitch: 0.03 } : { clip: 'voice.death', gain: 0.65, pitch: 0.04 }, { at, bus: beast ? 'effects' : 'dialogue', rate: beast ? 0.85 : 0.92, ref: 4, maxDistance: 70 });
            break;
        }
        s.state = e.state;
      }
      // Feet for ground covered: the creature paces its patch even at rest, and a lunge or a stagger is a footfall too.
      const moved = Math.hypot(e.x - s.x, e.z - s.z);
      s.x = e.x;
      s.z = e.z;
      if (!e.alive || moved >= TELEPORT) continue;
      const running = e.state === 'chase' || e.state === 'strike';
      const stride = beast ? (running ? STRIDE.beastRun : STRIDE.beast) : running ? STRIDE.banditRun : STRIDE.bandit;
      s.walked += moved;
      if (s.walked < stride) continue;
      s.walked %= stride;
      const foot = { x: e.x, y: e.y + 0.1, z: e.z };
      if (beast) this.play({ clip: 'land', gain: running ? 0.45 : 0.25, pitch: 0.08 }, { at: foot, rate: 0.72, ref: 3, maxDistance: 40 });
      else this.play(stepCue(groundSurface(frame.terrain, e.x, e.z), running, this.random), { at: foot, ref: 1.8, maxDistance: 40 });
    }
  }

  /** A barrel or crate that suddenly loses speed has hit something: louder for a harder knock. */
  /** The water's one-shots: crests breaking near the listener, splashes, strokes, wading, getting in and out. */
  private updateWater(frame: SoundFrame) {
    const w = frame.water;
    if (!w) return;
    for (const b of w.breaks) {
      const size = Math.min(1, b.size / 0.7);
      this.play({ clip: b.rock ? 'water.rock' : 'water.wave', gain: (b.rock ? 0.55 : 0.42) * (0.55 + 0.45 * size), pitch: 0.06 },
        { at: { x: b.x, y: 0.3, z: b.z }, bus: 'ambience', ref: 10, maxDistance: 95, reverb: 0.05, rate: 1.05 - 0.12 * size });
    }
    for (const e of w.events) {
      const at = { x: e.x, y: e.y, z: e.z };
      switch (e.kind) {
        case 'splash':
          this.play({ clip: 'water.splash.big', gain: 0.35 + 0.55 * e.energy, pitch: 0.06 }, { at, ref: 4, maxDistance: 70, reverb: 0.08, rate: 1.12 - 0.22 * e.energy });
          break;
        case 'plop':
          this.play({ clip: 'water.splash.small', gain: 0.3 + 0.5 * e.energy, pitch: 0.1 }, { at, ref: 2.5, maxDistance: 45, reverb: 0.06, rate: 1.2 - 0.3 * e.energy });
          break;
        case 'fish':
          this.play({ clip: 'water.fish', gain: 0.42, pitch: 0.08 }, { at, bus: 'ambience', ref: 4, maxDistance: 50, reverb: 0.08 });
          break;
        case 'stroke':
          this.play({ clip: 'water.swim', gain: 0.32 + 0.35 * e.energy, pitch: 0.07 }, { at, ref: 2.5, maxDistance: 30, reverb: 0.04 });
          break;
        case 'wade':
          this.play({ clip: 'water.wade', gain: 0.28 + 0.42 * e.energy, pitch: 0.07 }, { at, ref: 2.5, maxDistance: 30, reverb: 0.04 });
          break;
        case 'enter':
          this.play({ clip: 'water.enter', gain: 0.4 + 0.4 * e.energy, pitch: 0.05 }, { at, ref: 3, maxDistance: 40, reverb: 0.05 });
          break;
        case 'exit':
          this.play({ clip: 'water.exit', gain: 0.45, pitch: 0.05 }, { at, ref: 3, maxDistance: 35, reverb: 0.05 });
          break;
        case 'dive':
        case 'surface':
          this.play({ clip: 'water.bubbles', gain: 0.5, pitch: 0.08 });
          break;
      }
    }
  }

  private updateProps(dt: number, frame: SoundFrame) {
    for (const p of frame.props) {
      const speed = Math.hypot(p.vx, p.vy, p.vz);
      let s = this.objects.get(p.id);
      if (!s) {
        s = { speed, cooldown: 0 };
        this.objects.set(p.id, s);
      }
      s.cooldown -= dt;
      const lost = s.speed - speed;
      if (!p.held && s.speed > 1.1 && lost > Math.max(0.9, s.speed * 0.38) && s.cooldown <= 0) {
        const hard = Math.min(1, lost / 7);
        // Afloat, wood knocks hollow against rock and sloshes instead of thudding on the ground.
        if ((p.wet ?? 0) > 0.08) this.play({ clip: 'water.knock', gain: 0.25 + 0.6 * hard, pitch: 0.08 }, { at: { x: p.x, y: p.y, z: p.z }, rate: p.kind === 'barrel' ? 0.92 : 1.08, ref: 2.5, maxDistance: 40, reverb: 0.08 });
        else this.play({ clip: 'wood.impact', gain: 0.25 + 0.65 * hard, pitch: 0.07 }, { at: { x: p.x, y: p.y, z: p.z }, rate: p.kind === 'barrel' ? 0.86 : 1.06, ref: 2.5, maxDistance: 45, reverb: 0.1 });
        s.cooldown = 0.12;
      }
      s.speed = speed;
    }
  }

  private updateBreath(dt: number, frame: SoundFrame) {
    if (!frame.player.exhausted) {
      this.breath = 0.4;
      return;
    }
    this.breath -= dt;
    if (this.breath > 0) return;
    this.breath = 1.05 + 0.35 * this.random();
    this.play({ clip: 'hero.breath', gain: 0.4, pitch: 0.05 }, { bus: 'dialogue', reverb: 0.02 });
  }

  /**
   * Crickets keep their places around the listener and chirp at the rate the air's warmth sets (Dolbear's law), each
   * with its own voice and a little of its own tempo; one left far behind moves to a new spot nearby.
   */
  private updateCrickets(dt: number, frame: SoundFrame) {
    const l = frame.listener;
    const want = Math.round(cricketDensity({ ...l, indoors: frame.indoors }, frame.world) * 6);
    while (this.crickets.length > want) this.crickets.pop();
    while (this.crickets.length < want) this.crickets.push(this.newCricket(l));
    const rate = cricketRate(temperatureAt(frame.world.hour));
    for (const c of this.crickets) {
      if (Math.hypot(c.x - l.x, c.z - l.z) > 34) Object.assign(c, this.newCricket(l));
      c.clock -= dt * rate * c.rate;
      if (c.clock > 0) continue;
      c.clock += 1;
      this.play({ clip: 'cricket', gain: 0.3, pitch: 0.008, variant: c.voice }, { at: { x: c.x, y: 0.15, z: c.z }, bus: 'ambience', ref: 3, maxDistance: 36, reverb: 0.05 });
    }
  }

  private newCricket(l: Vec3) {
    const a = this.random() * Math.PI * 2;
    const r = 6 + 20 * this.random();
    return { x: l.x + Math.sin(a) * r, z: l.z + Math.cos(a) * r, clock: this.random(), rate: 0.88 + 0.24 * this.random(), voice: Math.floor(this.random() * 6) };
  }

  /** Below a third of health the player hears their own heart, faster and louder as the end comes near. */
  private updateHeart(dt: number, frame: SoundFrame) {
    const h = frame.player.health;
    if (!(h > 0 && h < 0.3)) {
      this.heart = 0.3;
      return;
    }
    const fear = (0.3 - h) / 0.3;
    this.heart -= dt;
    if (this.heart > 0) return;
    this.heart = 60 / (72 + 48 * fear);
    this.play({ clip: 'heart', gain: 0.32 + 0.45 * fear }, { bus: 'effects', reverb: 0 });
  }

  /**
   * The inn's evening music: a tune streams from the inn through its walls; between tunes the player rests a while.
   * Walking away lets the tune fade; staying away a while lets it end. A fight drowns it.
   */
  private updateSong(dt: number, frame: SoundFrame | null) {
    const target = frame && frame.mode !== 'dead' ? innSong({ ...frame.listener, indoors: frame.indoors }, frame.world) : null;
    const level = (target?.gain ?? 0) * (frame?.threat === 'none' ? 1 : 0.25);
    this.songLevel = level;
    const t = this.ctx.currentTime;
    const s = this.song;
    if (s) {
      this.target(s.gain.gain, 0.9 * level, t, 0.8, 0.002);
      this.songAway = level < 0.01 ? this.songAway + dt : 0;
      if (s.media.ended || this.songAway > 12) {
        this.releaseSong(s.media.ended ? 0.05 : 1);
        this.songRest = 25 + 45 * this.random();
      }
      return;
    }
    if (level < 0.02 || typeof Audio !== 'function') return;
    this.songRest -= dt;
    if (this.songRest > 0) return;
    const ids = (Object.keys(WORLD_AUDIO.songs) as SongId[]).filter((id) => id !== this.lastSong);
    const id = ids[Math.floor(this.random() * ids.length)];
    if (!id || !target) return;
    this.lastSong = id;
    const media = new Audio();
    media.preload = 'auto';
    const file = WORLD_AUDIO.songs[id].file;
    media.src = this.url(file);
    media.addEventListener('error', () => {
      if (this.song?.media !== media || !media.src.endsWith('.ogg')) return;
      this.ext = 'm4a';
      media.src = this.url(file, 'm4a');
      this.pendingMedia.delete(media);
      this.playStream(media);
    }, { once: true });
    const source = this.ctx.createMediaElementSource(media);
    const walls = this.ctx.createBiquadFilter();
    walls.type = 'lowpass';
    walls.frequency.value = 2300;
    walls.Q.value = 0.5;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'equalpower';
    panner.rolloffFactor = 0;
    placeAt(panner, target.at);
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    source.connect(walls).connect(panner).connect(gain).connect(this.duck);
    this.song = { id, media, source, gain, nodes: [source, walls, panner, gain] };
    this.playStream(media);
  }

  private releaseSong(fade: number) {
    const s = this.song;
    this.song = null;
    if (!s) return;
    this.retiringMedia.add(s.media);
    this.fadeOut(s.gain, fade, () => {
      this.retiringMedia.delete(s.media);
      s.media.pause();
      s.media.removeAttribute('src');
      s.media.load();
      for (const n of s.nodes) quietly(() => n.disconnect());
    });
  }

  /* ------------------------------------------------------------------ the score */

  private updateMusic(dt: number, frame: SoundFrame | null) {
    const actions = this.director.update(dt, {
      active: !!frame && frame.mode !== 'dead',
      x: frame?.player.x ?? 0,
      z: frame?.player.z ?? 0,
      night: (frame?.world.nightness ?? 0) > 0.55,
      diegetic: this.songLevel > 0.15,
      // The actual media clock owns the end: buffering or autoplay rejection consumes no unheard piece.
      pieceFinished: !!this.piece?.media.ended,
      // A panel opened mid-fight pauses the fight, not its music.
      threat: frame && frame.mode !== 'dead' ? frame.threat : 'none',
    });
    this.applyMusic(actions);
    // Decoded loops and stings that have not been needed for a while give their memory back.
    for (const [id, held] of this.musicBuffers) {
      if (this.clock - held.used > MUSIC_RELEASE && this.loop?.id !== id) this.musicBuffers.delete(id);
    }
  }

  /** Discovery, quest, victory and death stings, from game events; a discovery names its place. */
  sting(kind: 'discover' | 'quest' | 'victory' | 'death', place?: PlaceId) {
    // Inventory panels still belong to the world; a title/pause menu or hidden page does not.
    // Death stings are allowed while the world frame is present in its dead mode.
    if (this.disposed || !this.worldActive || this.hidden || this.ctx.state === 'closed') return;
    this.applyMusic(this.director.sting(kind, place));
  }

  private applyMusic(actions: readonly MusicAction[]) {
    for (const a of actions) {
      try {
        if (a.t === 'stop') this.stopMusic(a.fadeOut);
        else if (a.t === 'piece') this.playPiece(a.id, a.fadeIn);
        else if (a.t === 'loop') this.playLoop(a.id, a.fadeIn);
        else this.playSting(a.id);
      } catch {
        // the score is never worth a broken frame
      }
    }
  }

  private fadeOut(gain: GainNode, seconds: number, after: () => void) {
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + Math.max(0.05, seconds));
    const finish = () => {
      clearTimeout(timer);
      this.retirements.delete(timer);
      after();
    };
    const timer = setTimeout(finish, Math.max(50, seconds * 1000 + 80));
    this.retirements.set(timer, finish);
  }

  private releasePiece(seconds: number) {
    const piece = this.piece;
    this.piece = null;
    if (!piece) return;
    this.retiringMedia.add(piece.media);
    this.fadeOut(piece.gain, seconds, () => {
      this.retiringMedia.delete(piece.media);
      piece.media.pause();
      piece.media.removeAttribute('src');
      piece.media.load();
      quietly(() => piece.source.disconnect());
      quietly(() => piece.gain.disconnect());
    });
  }

  private releaseLoop(seconds: number) {
    const loop = this.loop;
    this.loop = null;
    if (!loop) return;
    this.fadeOut(loop.gain, seconds, () => {
      quietly(() => loop.source.stop());
      quietly(() => loop.source.disconnect());
      quietly(() => loop.gain.disconnect());
    });
  }

  private stopMusic(seconds: number) {
    this.loopWanted = null;
    this.releasePiece(seconds);
    this.releaseLoop(seconds);
  }

  private playPiece(id: MusicId, fadeIn: number) {
    this.stopMusic(1.5);
    if (typeof Audio !== 'function') return;
    // Pieces stream like the menu score: a whole piece is never decoded into memory.
    const media = new Audio();
    media.preload = 'auto';
    const file = WORLD_AUDIO.music[id].file;
    media.src = this.url(file);
    media.addEventListener('error', () => {
      if (this.piece?.media !== media || !media.src.endsWith('.ogg')) return;
      this.ext = 'm4a';
      media.src = this.url(file, 'm4a');
      this.pendingMedia.delete(media);
      this.playStream(media);
    }, { once: true });
    const gain = this.ctx.createGain();
    const source = this.ctx.createMediaElementSource(media);
    source.connect(gain).connect(this.duck);
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.85, t + fadeIn);
    this.piece = { media, source, gain };
    this.playStream(media);
  }

  private currentStream(media: HTMLAudioElement): boolean {
    return this.piece?.media === media || this.song?.media === media;
  }

  private playStream(media: HTMLAudioElement) {
    if (this.disposed || this.hidden || !this.worldActive || !this.currentStream(media) || this.pendingMedia.has(media)) return;
    const request = ++this.streamRequest;
    this.pendingMedia.set(media, request);
    try {
      void media.play().then(() => {
        // A slow play promise may settle after a menu, replacement, hiding or disposal.
        if (this.disposed || this.hidden || !this.worldActive || !this.currentStream(media)) media.pause();
      }).catch(() => {
        // A new gesture/focus can retry; never retry every frame or advance an unheard piece.
      }).finally(() => {
        if (this.pendingMedia.get(media) === request) this.pendingMedia.delete(media);
      });
    } catch {
      if (this.pendingMedia.get(media) === request) this.pendingMedia.delete(media);
    }
  }

  /** Called from an existing user gesture; retry blocked streams without replacing their clock or nodes. */
  resumeStreams() {
    for (const media of [this.piece?.media, this.song?.media]) {
      if (media && media.paused && !media.ended) this.playStream(media);
    }
  }

  private playLoop(id: MusicId, fadeIn: number) {
    this.loopWanted = id;
    this.releasePiece(2);
    if (this.loop?.id === id) return;
    this.releaseLoop(0.8);
    void this.loadMusic(id).then((buffer) => {
      if (!buffer || this.disposed || this.loopWanted !== id || this.loop) return;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.8, t + fadeIn);
      source.connect(gain).connect(this.duck);
      source.start();
      this.loop = { id, source, gain };
    });
  }

  private playSting(id: MusicId) {
    const epoch = this.stingEpoch;
    void this.loadMusic(id).then((buffer) => {
      if (!buffer || this.disposed || !this.worldActive || this.hidden || epoch !== this.stingEpoch || this.ctx.state === 'closed') return;
      const nodes: AudioNode[] = [];
      let voice: Voice | null = null;
      try {
        this.makeRoom('music');
        const source = this.ctx.createBufferSource();
        nodes.push(source);
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        nodes.push(gain);
        gain.gain.value = 0.8;
        source.connect(gain).connect(this.talk);
        voice = { source, nodes, bus: 'music', started: this.ctx.currentTime };
        this.voices.add(voice);
        this.stings.add(voice);
        const held = voice;
        source.onended = () => this.release(held);
        source.start();
        // Whatever else is playing steps back for the sting.
        const t = this.ctx.currentTime;
        this.duck.gain.cancelScheduledValues(t);
        this.duck.gain.setTargetAtTime(0.35, t, 0.15);
        this.duck.gain.setTargetAtTime(1, t + buffer.duration * 0.85, 0.6);
      } catch {
        if (voice) {
          quietly(() => voice!.source.stop());
          this.release(voice);
        } else for (const n of nodes) quietly(() => n.disconnect());
      }
    });
  }

  private cancelStings() {
    this.stingEpoch++;
    for (const v of [...this.stings]) {
      quietly(() => v.source.stop());
      this.release(v);
    }
    const t = this.ctx.currentTime;
    this.duck.gain.cancelScheduledValues(t);
    this.duck.gain.setValueAtTime(1, t);
  }

  /** A hidden tab suspends the audio clock; a streamed piece must not run on silently under it. */
  setHidden(hidden: boolean) {
    if (this.disposed) return;
    if (hidden && !this.hidden) this.stingEpoch++;
    this.hidden = hidden;
    if (hidden) for (const media of this.retiringMedia) media.pause();
    if (hidden) {
      this.cancelSpeech();
      this.cancelAnimals();
      this.speechActive = false;
    } else this.speechActive = this.worldActive && this.lastFrame?.mode === 'play';
    for (const media of [this.piece?.media, this.song?.media]) {
      if (!media) continue;
      if (hidden) {
        this.pendingMedia.delete(media);
        media.pause();
      }
      else if (!media.ended) this.playStream(media);
    }
  }

  /** The score's state, for the developer panel and the browser review. */
  get musicState(): { phase: string; piece: MusicId | null; loop: MusicId | null; song: SongId | null } {
    return { phase: this.director.phase, piece: this.director.current, loop: this.loop?.id ?? null, song: this.song?.id ?? null };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelStings();
    this.cancelSpeech();
    this.speechActive = false;
    // A fading stream/loop has left its current handle but still belongs to this world.
    for (const finish of [...this.retirements.values()]) quietly(finish);
    this.retirements.clear();
    this.retiringMedia.clear();
    this.loopWanted = null;
    const piece = this.piece;
    this.piece = null;
    if (piece) {
      piece.media.pause();
      piece.media.removeAttribute('src');
      piece.media.load();
      quietly(() => piece.source.disconnect());
      quietly(() => piece.gain.disconnect());
    }
    const loop = this.loop;
    this.loop = null;
    if (loop) {
      quietly(() => loop.source.stop());
      quietly(() => loop.source.disconnect());
      quietly(() => loop.gain.disconnect());
    }
    const song = this.song;
    this.song = null;
    if (song) {
      song.media.pause();
      song.media.removeAttribute('src');
      song.media.load();
      for (const n of song.nodes) quietly(() => n.disconnect());
    }
    for (const v of [...this.voices]) {
      quietly(() => v.source.stop());
      this.release(v);
    }
    for (const speaker of [...this.speaking.keys()]) this.hush(speaker);
    for (const bed of this.beds.values()) this.stopBed(bed);
    this.beds.clear();
    for (const n of this.owned) quietly(() => n.disconnect());
    this.bankBuffers.clear();
    this.bankLoads.clear();
    this.musicBuffers.clear();
    this.musicLoads.clear();
    this.pendingMedia.clear();
    this.voiceBuffers.clear();
    this.voiceLoads.clear();
    this.voiceUsed.clear();
    this.animalBuffers.clear();
    this.animalLoads.clear();
    this.animalLastCall.clear();
  }
}
