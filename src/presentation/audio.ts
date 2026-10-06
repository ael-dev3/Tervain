import type { ItemId, PlaceId } from '../game/types';
import type { Settings } from '../platform/settings';
import {
  bellCue, consumeCues, EQUIP, hitCue, landCues, MAP_OPEN, PAGE, pickupCues, SATCHEL_CLOSE, SATCHEL_OPEN, stepCue, swingCue, UNEQUIP, worldCues,
  type Cue, type SurfaceKind, type WorldAction,
} from './sound/foley';
import type { Vec3 } from './sound/soundscape';
import { type PlayOptions, type SoundFrame, SoundWorld } from './sound/soundWorld';
import { VOICE_AUDIO, type VoiceLineId } from './sound/voiceManifest';

/**
 * Audio facade for the prototype. The owner-supplied menu score streams through
 * the music bus. In the world, the recorded sound (sound/soundWorld.ts) plays
 * footsteps, combat, items, the world's moving parts, residents, wildlife,
 * place beds and the in-world score; interface navigation stays deliberately
 * quiet. The broad procedural wind/water beds remain underneath and step back
 * while recorded beds sound. Semantic captions are raised independently of
 * AudioContext availability and volume settings.
 */
export type { SurfaceKind } from './sound/foley';

export interface AmbienceEnvironment {
  nightness: number;
  waterProximity: number;
  flow: number;
  millNear: number;
  millTurning: boolean;
  windAmount: number;
  quarryNear: number;
  quarryWorking: boolean;
  time: number;
  underRoof: boolean;
  seaProximity?: number;
  /** Centre of the wind's band in Hz: higher in needles, lower in broad leaves and open ground. */
  windTone?: number;
}

const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const AUTOMATION_INTERVAL = 0.1;
const MUSIC_HEADROOM = 0.8;
const MUSIC_FADE_SECONDS = 0.15;
const MUSIC_PAUSE_DELAY = 900;
export const MENU_MUSIC_TITLE = "The Sovereign's Oath";
export const MENU_MUSIC_SOURCES = {
  opus: `${import.meta.env.BASE_URL}assets/audio/the-sovereigns-oath.ogg`,
  aac: `${import.meta.env.BASE_URL}assets/audio/the-sovereigns-oath.m4a`,
};
export type MenuMusicState = 'locked' | 'muted' | 'loading' | 'playing' | 'paused' | 'blocked' | 'unavailable';
export interface MenuMusicPlayback {
  /** Native stream position in seconds, including its reset at a loop boundary. */
  readonly time: number;
  /** Zero until finite stream metadata is available. */
  readonly duration: number;
  /** The menu score is actively playing through an audible, running mix. */
  readonly playing: boolean;
  /** Current track-envelope × Music × Master × media volume; zero when inactive. */
  readonly gain: number;
}

/**
 * A six-second brown-noise loop with a raised-cosine overlap at its join.
 * Its end continues naturally into the beginning instead of jumping to a fresh
 * random sample. Remove DC and reserve mix headroom before sharing this buffer.
 */
export function ambienceNoise(sampleRate: number, seconds = 6, random = Math.random): Float32Array {
  const length = Math.max(2, Math.round(sampleRate * seconds));
  const overlap = Math.min(Math.floor(length / 3), Math.max(1, Math.round(sampleRate * 0.18)));
  const raw = new Float32Array(length + overlap);
  let last = 0;
  for (let i = 0; i < raw.length; i++) {
    last = (last + 0.06 * (random() * 2 - 1)) / 1.06;
    raw[i] = last;
  }
  const data = new Float32Array(length);
  let sum = 0;
  for (let i = 0; i < length; i++) {
    const weight = i < overlap ? 0.5 - 0.5 * Math.cos(Math.PI * i / overlap) : 1;
    const value = i < overlap ? raw[length + i]! * (1 - weight) + raw[i]! * weight : raw[i]!;
    data[i] = value;
    sum += value;
  }
  const mean = sum / length;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    data[i] = data[i]! - mean;
    peak = Math.max(peak, Math.abs(data[i]!));
  }
  // Do not amplify a nearly silent/degenerate random source.
  const gain = peak > 0.000001 ? Math.min(3.2, 0.6 / peak) : 0;
  for (let i = 0; i < length; i++) data[i] = data[i]! * gain;
  return data;
}

/** Audio-clock breathing is multiplied by proximity: a distant sea stays silent. */
export function ambienceMix(e: AmbienceEnvironment, audioTime: number) {
  const t = Number.isFinite(audioTime) ? audioTime : 0;
  const roof = e.underRoof ? 0.35 : 1;
  const flow = unit(e.flow);
  const sea = unit(e.seaProximity ?? 0) * roof;
  return {
    wind: 0.05 * (0.5 + unit(e.windAmount)) * roof * (0.88 + 0.12 * Math.sin(t * 0.2)),
    windFrequency: (e.windTone !== undefined && Number.isFinite(e.windTone) ? e.windTone : 420) + 120 * Math.sin(t * Math.PI * 0.22),
    water: unit(e.waterProximity) * (0.05 + 0.35 * flow) * roof,
    waterFrequency: 700 + 1400 * flow,
    rumble: 0.16 * sea * (0.72 + 0.24 * Math.sin(t * 0.75) + 0.04 * Math.sin(t * 1.09)),
    hiss: 0.06 * sea * sea * (0.57 + 0.38 * Math.sin(t * 0.75 + 0.65) + 0.05 * Math.sin(t * 1.21)),
  };
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: { music: GainNode; effects: GainNode; ambience: GainNode; dialogue: GainNode };
  private noiseBuf: AudioBuffer | null = null;
  private wind: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private water: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private sea: { rumble: GainNode; hiss: GainNode } | null = null;
  private readonly nodes = new Set<AudioNode>();
  private readonly sources = new Set<AudioBufferSourceNode>();
  private readonly targets = new WeakMap<AudioParam, number>();
  private lastAutomation = -Infinity;
  private disposed = false;
  private resuming = false;
  private contextResumeGeneration = 0;
  private pageHidden = false;
  private menuActive = false;
  private musicUnlocked = false;
  private music: HTMLAudioElement | null = null;
  private musicEnvelope: GainNode | null = null;
  private musicSource = '';
  private musicFallbackUsed = false;
  private musicState: MenuMusicState = 'locked';
  private musicGeneration = 0;
  private musicPending = false;
  private musicBuffering = false;
  private musicPauseTimer: ReturnType<typeof setTimeout> | null = null;
  private musicSeek = 0;
  private musicListeners: [string, EventListener][] = [];
  private soundWorld: SoundWorld | null = null;
  private worldFailed = false;
  onCaption: ((text: string) => void) | null = null;
  onMusicState: ((state: MenuMusicState) => void) | null = null;
  enabled = true;

  constructor(private getSettings: () => Settings) {}

  /** Must be called from a user gesture. The explicit Play control may retry a browser-held pending resume request. */
  resume(options: { retryPending?: boolean } = {}) {
    if (this.pageHidden || this.disposed) return;
    this.musicUnlocked = true;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) {
        this.enabled = false;
        this.setMusicState('unavailable');
        return;
      }
      try {
        this.ctx = new AC({ latencyHint: 'interactive' });
        this.ctx.addEventListener('statechange', this.onContextStateChange);
        this.master = this.own(this.ctx.createGain());
        this.master.gain.value = unit(this.getSettings().volumes.master);
        this.master.connect(this.ctx.destination);
        const mk = (level: number) => {
          const g = this.own(this.ctx!.createGain());
          g.gain.value = unit(level);
          g.connect(this.master);
          return g;
        };
        const v = this.getSettings().volumes;
        this.buses = { music: mk(v.music), effects: mk(v.effects), ambience: mk(v.ambience), dialogue: mk(v.dialogue) };
        this.noiseBuf = this.makeNoise();
        this.startBeds();
      } catch {
        // Audio-device or graph creation must not interrupt input or the game.
        this.releaseGraph();
        this.enabled = false;
        this.setMusicState('unavailable');
        return;
      }
    }
    this.enabled = this.ctx.state !== 'closed';
    if (this.ctx.state !== 'running' && this.ctx.state !== 'closed' && (!this.resuming || options.retryPending)) {
      const ctx = this.ctx, generation = ++this.contextResumeGeneration;
      this.resuming = true;
      void ctx.resume().then(() => {
        if (this.ctx === ctx && generation === this.contextResumeGeneration) this.onContextStateChange();
      }).catch(() => {
        if (this.ctx === ctx && generation === this.contextResumeGeneration) this.onContextStateChange();
      }).finally(() => { if (generation === this.contextResumeGeneration) this.resuming = false; });
    }
    // Calling play in the same gesture unlocks browser media playback too.
    this.syncMusic();
    this.soundWorld?.resumeStreams();
  }

  /** Menus share one stream; scene/quality rebuilds never allocate another score. */
  setMenuActive(active: boolean) {
    if (active === this.menuActive || this.disposed) return;
    this.menuActive = active;
    this.syncMusic();
  }

  get menuMusicState() { return this.musicState; }

  /** Read-only media snapshot for score-led visuals; never advances a second clock. */
  get menuMusicPlayback(): MenuMusicPlayback {
    const media = this.music;
    const time = media && Number.isFinite(media.currentTime) ? Math.max(0, media.currentTime) : 0;
    const duration = media && Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0;
    const mixGain = media && this.musicEnvelope && this.ctx
      ? unit(this.musicEnvelope.gain.value) * unit(this.buses.music.gain.value)
        * unit(this.master.gain.value) * unit(media.volume) : 0;
    const playing = !!media && this.wantsMusic && this.ready && !this.musicPending && !this.musicBuffering
      && !media.paused && !media.ended && !media.seeking && !media.muted && !media.error
      && media.readyState >= 3 && this.musicState === 'playing' && mixGain > 0;
    return { time, duration, playing, gain: playing ? mixGain : 0 };
  }

  /** F3 review transport only: seek the real menu stream, never fabricate a visual clock or allocate another player. */
  seekMenuMusic(seconds: number): boolean {
    const media = this.music;
    if (!this.menuActive || this.disposed || !media || !Number.isFinite(seconds) || !Number.isFinite(media.duration) || media.duration <= 0) return false;
    try {
      media.currentTime = Math.max(0, Math.min(media.duration - 0.05, seconds));
      return true;
    } catch { return false; }
  }

  private setMusicState(state: MenuMusicState) {
    // A native media element can be ready and unpaused while its WebAudio destination is suspended. The title must
    // expose its gesture control rather than claiming audible playback or inventing progress for the grove clock.
    if ((state === 'playing' || state === 'loading') && this.wantsMusic && this.ctx?.state !== 'running') state = 'blocked';
    if (state === this.musicState) return;
    this.musicState = state;
    this.onMusicState?.(state);
  }

  private onContextStateChange = () => {
    if (!this.ctx || this.disposed || this.pageHidden || !this.menuActive || !this.musicUnlocked) return;
    if (this.ctx.state === 'closed') { this.setMusicState('unavailable'); return; }
    // Muted/hidden menus and terminal media errors keep their own meaning. Unexpected suspension only affects a score
    // the player actually wants to hear; this event handler never calls context.resume() or starts a retry timer.
    if (!this.wantsMusic || this.music?.error || this.musicState === 'unavailable') return;
    if (this.ctx.state !== 'running') this.setMusicState('blocked');
    else this.syncMusic();
  };

  private get wantsMusic() {
    const v = this.getSettings().volumes;
    return this.menuActive && this.musicUnlocked && !this.pageHidden && !this.disposed
      && unit(v.master) > 0 && unit(v.music) > 0 && this.ctx !== null && this.ctx.state !== 'closed';
  }

  private clearMusicPause() {
    if (this.musicPauseTimer !== null) clearTimeout(this.musicPauseTimer);
    this.musicPauseTimer = null;
  }

  private makeMusic() {
    if (this.music || !this.ctx) return;
    // Native streaming keeps the whole song out of an AudioBuffer in memory.
    const media = new window.Audio();
    this.music = media;
    this.musicBuffering = false;
    media.preload = 'none';
    media.loop = true;
    media.volume = 1;
    this.musicFallbackUsed = !media.canPlayType('audio/ogg; codecs="opus"');
    this.musicSource = this.musicFallbackUsed ? MENU_MUSIC_SOURCES.aac : MENU_MUSIC_SOURCES.opus;
    media.src = this.musicSource;
    let envelope: GainNode | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    try {
      envelope = this.own(this.ctx.createGain());
      envelope.gain.value = 0;
      source = this.own(this.ctx.createMediaElementSource(media));
      source.connect(envelope).connect(this.buses.music);
      this.musicEnvelope = envelope;
    } catch (error) {
      for (const node of [source, envelope]) if (node) { node.disconnect(); this.nodes.delete(node); }
      media.pause();
      media.removeAttribute('src');
      media.load();
      this.music = null;
      throw error;
    }
    const listen = (type: string, listener: EventListener) => {
      media.addEventListener(type, listener);
      this.musicListeners.push([type, listener]);
    };
    listen('playing', () => {
      this.musicBuffering = false;
      if (this.wantsMusic) this.setMusicState('playing');
    });
    listen('waiting', () => {
      this.musicBuffering = true;
      if (this.wantsMusic) this.setMusicState('loading');
    });
    listen('seeking', () => {
      this.musicBuffering = true;
      if (this.wantsMusic) this.setMusicState('loading');
    });
    listen('seeked', () => {
      this.musicBuffering = media.readyState < 3;
      if (this.wantsMusic && !media.paused) this.setMusicState(this.musicBuffering ? 'loading' : 'playing');
    });
    // Native pause/media controls and buffering can change playback independently of our play() promise. Diagnostic/UI
    // state must describe that real stream without starting a retry loop or allocating another score.
    listen('pause', () => {
      // pause() queues a native event: it may arrive after a terminal decoder error was already reported, or after a
      // replacement source resumed. Neither delayed event is evidence that the current, healthy stream was paused.
      if (this.wantsMusic && media.paused && !media.error && this.musicState !== 'unavailable') this.setMusicState('paused');
    });
    listen('loadedmetadata', () => {
      if (this.musicSeek > 0) {
        try { media.currentTime = this.musicSeek; } catch { /* unseekable media still plays */ }
        this.musicSeek = 0;
      }
    });
    listen('error', () => this.musicError());
  }

  private musicError() {
    if (!this.music || this.disposed) return;
    this.musicGeneration++;
    this.musicPending = false;
    this.musicBuffering = false;
    if (!this.musicFallbackUsed) {
      this.musicFallbackUsed = true;
      this.musicSeek = Number.isFinite(this.music.currentTime) ? this.music.currentTime : 0;
      this.musicSource = MENU_MUSIC_SOURCES.aac;
      this.music.src = this.musicSource;
      this.music.load();
      this.syncMusic();
    } else {
      this.music.pause();
      this.setMusicState('unavailable');
    }
  }

  private syncMusic() {
    if (!this.wantsMusic) {
      // Invalidate an outstanding play request; showing or unmuting may issue a
      // fresh request even if the old browser promise has not settled yet.
      this.musicGeneration++;
      this.musicPending = false;
      if (this.musicEnvelope && this.ctx) this.target(this.musicEnvelope.gain, 0, this.ctx.currentTime, MUSIC_FADE_SECONDS);
      if (this.music && !this.music.paused) {
        if (this.pageHidden || !this.menuActive && this.ctx?.state !== 'running'
          || unit(this.getSettings().volumes.master) === 0 || unit(this.getSettings().volumes.music) === 0) {
          this.clearMusicPause();
          this.music.pause();
        } else if (this.musicPauseTimer === null) {
          // Six time constants leave less than 0.25% before pausing the stream.
          this.musicPauseTimer = setTimeout(() => {
            this.musicPauseTimer = null;
            if (!this.wantsMusic) this.music?.pause();
          }, MUSIC_PAUSE_DELAY);
        }
      }
      this.setMusicState(this.menuActive && !this.musicUnlocked ? 'locked'
        : this.menuActive && (unit(this.getSettings().volumes.master) === 0 || unit(this.getSettings().volumes.music) === 0) ? 'muted' : 'paused');
      return;
    }
    this.clearMusicPause();
    try {
      this.makeMusic();
      if (!this.music || !this.musicEnvelope || !this.ctx) return;
      this.target(this.musicEnvelope.gain, MUSIC_HEADROOM, this.ctx.currentTime, MUSIC_FADE_SECONDS);
      if (this.musicPending) return;
      if (!this.music.paused) {
        // Returning during the fade keeps playback alive, so no new native
        // playing event will arrive to restore the menu's diagnostic state.
        this.setMusicState(!this.musicBuffering && !this.music.seeking && this.music.readyState >= 3 ? 'playing' : 'loading');
        return;
      }
      const media = this.music;
      const generation = this.musicGeneration;
      this.musicPending = true;
      this.setMusicState('loading');
      void media.play().then(() => {
        if (!this.wantsMusic) media.pause();
        if (generation !== this.musicGeneration || this.disposed) return;
        if (this.wantsMusic) this.setMusicState(!this.musicBuffering && !media.seeking && media.readyState >= 3 ? 'playing' : 'loading');
      }).catch(() => {
        // Autoplay, offline and decoder failures cannot block the menu. A new
        // gesture may retry; no per-frame retry or unhandled rejection is raised.
        if (generation === this.musicGeneration && this.wantsMusic) this.setMusicState(media.error ? 'unavailable' : 'blocked');
      }).finally(() => { if (generation === this.musicGeneration) this.musicPending = false; });
    } catch {
      this.setMusicState('unavailable');
    }
  }

  /** Suspend looping sources and the audio clock in a hidden tab. */
  setPageHidden(hidden: boolean) {
    this.pageHidden = hidden;
    this.syncMusic();
    this.soundWorld?.setHidden(hidden);
    if (this.disposed || !this.ctx || this.ctx.state === 'closed') return;
    this.lastAutomation = -Infinity;
    // Queue both transitions, including a quick hide/show before suspend has resolved.
    const ctx = this.ctx, transition = hidden ? ctx.suspend() : ctx.resume();
    void transition.then(() => { if (this.ctx === ctx) this.onContextStateChange(); })
      .catch(() => { if (this.ctx === ctx) this.onContextStateChange(); });
  }

  get ready() {
    return !this.disposed && !this.pageHidden && this.ctx !== null && this.ctx.state === 'running';
  }

  /** Device-reported values for the developer panel, not an end-to-end latency claim. */
  get diagnostics() {
    return {
      state: this.ctx?.state ?? 'not initialized',
      sampleRate: this.ctx?.sampleRate ?? 0,
      baseLatency: this.ctx?.baseLatency ?? null,
      voices: this.sources.size,
      music: {
        state: this.musicState, source: this.musicSource,
        currentTime: this.music?.currentTime ?? 0, duration: this.music?.duration ?? 0,
      },
      world: this.soundWorld ? { ...this.soundWorld.stats, banksReady: this.soundWorld.banksReady, score: this.soundWorld.musicState, speaking: this.soundWorld.speakers } : null,
    };
  }

  private own<T extends AudioNode>(node: T): T {
    this.nodes.add(node);
    return node;
  }

  private makeNoise() {
    const ctx = this.ctx!;
    const data = ambienceNoise(ctx.sampleRate);
    const buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
    buf.getChannelData(0).set(data);
    return buf;
  }

  private startNoise(filter: BiquadFilterNode, offset: number, rate: number) {
    const s = this.own(this.ctx!.createBufferSource());
    s.buffer = this.noiseBuf;
    s.loop = true;
    s.playbackRate.value = rate;
    s.connect(filter);
    this.sources.add(s);
    s.start(this.ctx!.currentTime, offset);
  }

  /** Replace the previous ramp instead of accumulating per-frame automation. */
  private target(param: AudioParam, value: number, time: number, smoothing: number) {
    const previous = this.targets.get(param);
    if (previous !== undefined && Math.abs(previous - value) < 0.000001) return;
    this.targets.set(param, value);
    if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(time);
    else {
      const current = param.value;
      param.cancelScheduledValues(time);
      param.setValueAtTime(current, time);
    }
    param.setTargetAtTime(value, time, smoothing);
  }

  applySettings() {
    if (this.disposed || !this.ctx || this.ctx.state === 'closed') return;
    const v = this.getSettings().volumes;
    const t = this.ctx.currentTime;
    this.target(this.master.gain, unit(v.master), t, 0.035);
    this.target(this.buses.music.gain, unit(v.music), t, 0.035);
    this.target(this.buses.effects.gain, unit(v.effects), t, 0.035);
    this.target(this.buses.ambience.gain, unit(v.ambience), t, 0.035);
    this.target(this.buses.dialogue.gain, unit(v.dialogue), t, 0.035);
    this.syncMusic();
  }

  private startBeds() {
    const ctx = this.ctx!;
    // Separate offsets and playback rates avoid four phase-correlated copies.
    const wf = this.own(ctx.createBiquadFilter());
    wf.type = 'bandpass';
    wf.frequency.value = 420;
    wf.Q.value = 0.5;
    const wg = this.own(ctx.createGain());
    wg.gain.value = 0.0;
    wf.connect(wg).connect(this.buses.ambience);
    this.startNoise(wf, 0.19, 0.91);
    this.wind = { gain: wg, filter: wf };
    // Water: low-passed noise whose level follows proximity and flow.
    const nf = this.own(ctx.createBiquadFilter());
    nf.type = 'lowpass';
    nf.frequency.value = 1400;
    const ng = this.own(ctx.createGain());
    ng.gain.value = 0;
    nf.connect(ng).connect(this.buses.ambience);
    this.startNoise(nf, 1.73, 1.013);
    this.water = { gain: ng, filter: nf };
    // Sea envelopes remain positive and vanish with actual proximity.
    const rf = this.own(ctx.createBiquadFilter());
    rf.type = 'lowpass';
    rf.frequency.value = 240;
    const rg = this.own(ctx.createGain());
    rg.gain.value = 0;
    rf.connect(rg).connect(this.buses.ambience);
    this.startNoise(rf, 3.11, 0.773);
    const hf = this.own(ctx.createBiquadFilter());
    hf.type = 'bandpass';
    hf.frequency.value = 3000;
    hf.Q.value = 0.6;
    const hg = this.own(ctx.createGain());
    hg.gain.value = 0;
    hf.connect(hg).connect(this.buses.ambience);
    this.startNoise(hf, 4.37, 1.087);
    this.sea = { rumble: rg, hiss: hg };
  }

  /** Called per frame; graph automation is capped at ten updates per audio second. */
  update(_dt: number, e: AmbienceEnvironment) {
    if (!this.ready || !this.ctx || !this.wind || !this.water || !this.sea) return;
    const t = this.ctx.currentTime;
    if (t - this.lastAutomation < AUTOMATION_INTERVAL) return;
    this.lastAutomation = t;
    const mix = ambienceMix(e, t);
    // Recorded beds carry the place; the procedural noise stays underneath as body and as a fallback.
    const recorded = this.soundWorld?.recordedLevel ?? 0;
    this.target(this.wind.gain.gain, mix.wind * (1 - 0.55 * recorded), t, 0.35);
    this.target(this.wind.filter.frequency, mix.windFrequency, t, 0.35);
    this.target(this.water.gain.gain, mix.water * (1 - 0.75 * recorded), t, 0.18);
    this.target(this.water.filter.frequency, mix.waterFrequency, t, 0.25);
    this.target(this.sea.rumble.gain, mix.rumble * (1 - 0.6 * recorded), t, 0.3);
    this.target(this.sea.hiss.gain, mix.hiss * (1 - 0.8 * recorded), t, 0.25);
  }

  /**
   * The recorded world: beds, wildlife, residents, enemies, objects and the in-world score; `null` while a menu covers
   * the world. Created on the first world frame, so menus and tests that never enter the world allocate nothing.
   */
  updateWorld(dt: number, frame: SoundFrame | null) {
    if (!this.ready || !this.ctx) return;
    if (frame && !this.soundWorld && !this.worldFailed) {
      try {
        this.soundWorld = new SoundWorld(this.ctx, this.buses, import.meta.env.BASE_URL);
      } catch {
        // Without convolution or panning support the world keeps its procedural beds and captions.
        this.worldFailed = true;
      }
    }
    this.soundWorld?.update(dt, frame);
  }

  /** A graphics build stops world frames; retire their mix once without touching the menu score or device. */
  pauseWorld() {
    if (this.disposed) return;
    // Reach the world even while the tab/context is suspended: late decodes must see the pause boundary.
    this.soundWorld?.update(1 / 20, null);
    if (this.ctx && this.ctx.state !== 'closed') {
      const t = this.ctx.currentTime;
      for (const gain of [this.wind?.gain, this.water?.gain, this.sea?.rumble, this.sea?.hiss]) {
        if (gain) this.target(gain.gain, 0, t, 0.18);
      }
    }
    // The first recovered world frame must replace the silent targets, even within the usual update interval.
    this.lastAutomation = -Infinity;
  }

  private releaseGraph() {
    this.soundWorld?.dispose();
    this.soundWorld = null;
    this.clearMusicPause();
    this.musicGeneration++;
    this.contextResumeGeneration++;
    this.resuming = false;
    this.musicPending = false;
    this.musicBuffering = false;
    if (this.music) {
      for (const [type, listener] of this.musicListeners) this.music.removeEventListener(type, listener);
      this.music.pause();
      this.music.removeAttribute('src');
      this.music.load();
      this.music = null;
    }
    this.musicListeners = [];
    this.musicEnvelope = null;
    for (const source of this.sources) {
      try { source.stop(); } catch { /* a partially created source may not have started */ }
    }
    this.sources.clear();
    for (const node of this.nodes) node.disconnect();
    this.nodes.clear();
    const ctx = this.ctx;
    ctx?.removeEventListener('statechange', this.onContextStateChange);
    this.ctx = null;
    this.noiseBuf = null;
    this.wind = this.water = this.sea = null;
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined);
  }

  /** Stop owned loops and release the device once when the app is actually torn down. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.enabled = false;
    this.onCaption = null;
    this.onMusicState = null;
    this.releaseGraph();
  }

  /* ---- speech ---- */

  /** A spoken line (src/content/voice.ts): it plays when the world's sound is running, and its length is returned either way. */
  say(line: string, at?: Vec3): number | null {
    const voiced = (VOICE_AUDIO.lines as Record<string, readonly [string, number, number, string]>)[line];
    if (!voiced) return 0;
    // While the world's sound runs, a line whose voice is still loading waits (null); otherwise it is shown silently.
    if (this.ready && this.soundWorld && !this.soundWorld.speak(line as VoiceLineId, { at }) && !this.soundWorld.voiceReady(line as VoiceLineId)) return null;
    return voiced[2];
  }

  /** Stops what someone is saying. */
  hush(speaker: string) {
    this.soundWorld?.hush(speaker);
  }

  /* ---- effects ---- */
  private cue(cues: Cue | readonly Cue[], opt?: PlayOptions) {
    if (!this.ready || !this.soundWorld) return;
    if (Array.isArray(cues)) this.soundWorld.playAll(cues, opt);
    else this.soundWorld.play(cues as Cue, opt);
  }

  footstep(surface: SurfaceKind, running: boolean) {
    this.cue(stepCue(surface, running), { reverb: 0.04 });
  }

  jump(surface: SurfaceKind) {
    this.cue([{ ...stepCue(surface, true), gain: 0.45 }, { clip: 'item.cloth', gain: 0.18, pitch: 0.06, from: 0, to: 0.5 }]);
  }

  /** Touching down after a jump or a drop; harder for a faster fall (metres per second). */
  land(surface: SurfaceKind, fallSpeed: number) {
    this.cue(landCues(surface, fallSpeed), { reverb: 0.05 });
  }

  dodge(surface: SurfaceKind) {
    this.cue([{ clip: 'item.cloth', gain: 0.32, pitch: 0.06, from: 0, to: 0.7 }, { ...stepCue(surface, true), gain: 0.5, delay: 0.18 }]);
  }

  swing(heavy: boolean, armed = true) {
    // A bare-handed blow is a shorter, quicker rush of air.
    this.cue(swingCue(heavy), armed ? undefined : { rate: 1.25, scale: 0.7 });
  }

  hit(kind: 'flesh' | 'block' | 'perfect', armed = true) {
    this.cue(hitCue(kind, armed), { reverb: 0.08 });
  }

  hurt() {
    // The hero's own voice (A53): the generic take, performed again by his designed voice.
    this.cue({ clip: 'hero.hurt', gain: 0.55, pitch: 0.05 }, { bus: 'dialogue' });
  }

  growl(at?: Vec3) {
    this.cue({ clip: 'beast.growl', gain: 0.75, pitch: 0.04 }, { at, ref: 6, maxDistance: 90, reverb: 0.12 });
    this.caption('[A low growl]');
  }

  /** A toll-jumper has seen the player. */
  shout(at?: Vec3) {
    this.cue({ clip: 'bandit.shout', gain: 0.6, pitch: 0.05 }, { at, bus: 'dialogue', ref: 5, maxDistance: 80 });
    this.caption('[A rough shout]');
  }

  /** Picking something up: the object itself, and the satchel it goes into. */
  pickup(item?: ItemId) {
    this.cue(item ? pickupCues(item) : { clip: 'item.cloth', gain: 0.32, pitch: 0.05, from: 0, to: 0.9 });
  }

  /** Eating, chewing or applying a remedy. */
  consume(item: ItemId) {
    this.cue(consumeCues(item));
  }

  /** Drawing (true) or putting away (false) the blade. */
  equip(drawn: boolean) {
    this.cue(drawn ? EQUIP : UNEQUIP);
  }

  /** Lifting or throwing a barrel or crate. */
  prop(action: 'grab' | 'throw') {
    this.cue(action === 'grab' ? { clip: 'wood.lift', gain: 0.45, pitch: 0.05 } : { clip: 'swing.heavy', gain: 0.35, pitch: 0.08 });
  }

  interact() {
    // Reaching for something: a soft movement of clothing. The thing itself answers with its own sound.
    this.cue({ clip: 'item.cloth', gain: 0.16, pitch: 0.06, from: 0, to: 0.5 });
  }

  uiMove() {
    // Navigation remains silent to avoid a musical interface.
  }

  uiConfirm() {
    // Focus and pressed states carry confirmation feedback.
  }

  journal() {
    this.cue(PAGE);
  }

  /** Opening (or closing) the journal, the satchel or the map. */
  panel(kind: 'journal' | 'inventory' | 'map', open = true) {
    if (kind === 'inventory') this.cue(open ? SATCHEL_OPEN : SATCHEL_CLOSE);
    else this.cue(kind === 'journal' ? PAGE : MAP_OPEN, open ? undefined : { scale: 0.7 });
  }

  /** The world's moving parts: doors, gates, the lever, the sluice, the surge and the rite. */
  worldEvent(action: WorldAction, caption?: string) {
    this.cue(worldCues(action), { reverb: 0.12 });
    if (caption) this.caption(caption);
  }

  gateCreak(caption = '[The sluice gate groans]') {
    this.worldEvent('gate', caption);
  }

  waterSurge() {
    this.worldEvent('surge', '[Water begins to rush through the channel]');
  }

  rite() {
    this.worldEvent('rite', '[Water settles at the spring]');
  }

  /**
   * The story bell, cast on D and placed at its tower: `gain` is the app's distance fade, `bright` the all-clear peal,
   * `index` the strike's place in its sequence (the peal rings high to low).
   */
  bell(gain: number, bright = false, at?: Vec3, index = 0) {
    if (!(gain > 0.01)) return;
    // A huge reference distance leaves the level to the app's fade and uses the panner only for direction.
    this.cue(bellCue(bright, index), { at, scale: Math.min(1, gain), ref: 1e4, maxDistance: 1e4, reverb: 0.3 });
  }

  /** Short pieces of score over the quiet: a newly found place (its region's motif), a step of the story, a won fight, a fall. */
  discover(place?: PlaceId) { this.soundWorld?.sting('discover', place); }
  quest() { this.soundWorld?.sting('quest'); }
  victory() { this.soundWorld?.sting('victory'); }

  death() {
    this.cue({ clip: 'hero.death', gain: 0.6 }, { bus: 'dialogue' });
    this.soundWorld?.sting('death');
  }

  caption(text: string) {
    this.onCaption?.(text);
  }
}
