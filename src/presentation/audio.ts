import type { Settings } from '../platform/settings';

/**
 * Audio facade for the prototype. The owner-supplied menu score streams through
 * the music bus; until sourced and reviewed recordings are available,
 * ordinary UI, dialogue, footstep and combat contacts stay deliberately quiet. The
 * broad wind/water beds remain procedural; semantic captions are raised
 * independently of AudioContext availability and volume settings.
 */
export type SurfaceKind = 'grass' | 'road' | 'stone' | 'water' | 'deck' | 'sand';

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
    windFrequency: 420 + 120 * Math.sin(t * Math.PI * 0.22),
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
  private musicPauseTimer: ReturnType<typeof setTimeout> | null = null;
  private musicSeek = 0;
  private musicListeners: [string, EventListener][] = [];
  onCaption: ((text: string) => void) | null = null;
  onMusicState: ((state: MenuMusicState) => void) | null = null;
  enabled = true;

  constructor(private getSettings: () => Settings) {}

  /** Must be called from a user gesture. */
  resume() {
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
    if (this.ctx.state !== 'running' && this.ctx.state !== 'closed' && !this.resuming) {
      this.resuming = true;
      void this.ctx.resume().catch(() => undefined).finally(() => { this.resuming = false; });
    }
    // Calling play in the same gesture unlocks browser media playback too.
    this.syncMusic();
  }

  /** Menus share one stream; scene/quality rebuilds never allocate another score. */
  setMenuActive(active: boolean) {
    if (active === this.menuActive || this.disposed) return;
    this.menuActive = active;
    this.syncMusic();
  }

  get menuMusicState() { return this.musicState; }

  private setMusicState(state: MenuMusicState) {
    if (state === this.musicState) return;
    this.musicState = state;
    this.onMusicState?.(state);
  }

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
    listen('playing', () => { if (this.wantsMusic) this.setMusicState('playing'); });
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
      if (!this.music.paused || this.musicPending) return;
      const media = this.music;
      const generation = this.musicGeneration;
      this.musicPending = true;
      this.setMusicState('loading');
      void media.play().then(() => {
        if (!this.wantsMusic) media.pause();
        if (generation !== this.musicGeneration || this.disposed) return;
        if (this.wantsMusic) this.setMusicState('playing');
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
    if (this.disposed || !this.ctx || this.ctx.state === 'closed') return;
    this.lastAutomation = -Infinity;
    // Queue both transitions, including a quick hide/show before suspend has resolved.
    const transition = hidden ? this.ctx.suspend() : this.ctx.resume();
    void transition.catch(() => undefined);
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
    this.target(this.wind.gain.gain, mix.wind, t, 0.35);
    this.target(this.wind.filter.frequency, mix.windFrequency, t, 0.35);
    this.target(this.water.gain.gain, mix.water, t, 0.18);
    this.target(this.water.filter.frequency, mix.waterFrequency, t, 0.25);
    this.target(this.sea.rumble.gain, mix.rumble, t, 0.3);
    this.target(this.sea.hiss.gain, mix.hiss, t, 0.25);
    // Wildlife and quarry impacts remain silent until they can
    // be supplied as locally packaged, provenance-checked, reviewed audio assets.
  }

  private releaseGraph() {
    this.clearMusicPause();
    this.musicGeneration++;
    this.musicPending = false;
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

  /* ---- effects ---- */
  footstep(_surface: SurfaceKind, _running: boolean) {
    // Surface-specific recordings are required before a boot contact is emitted.
  }

  swing(_heavy: boolean) {
    // A synthesized sweep reads as an electronic effect; keep the contact quiet for now.
  }

  hit(_kind: 'flesh' | 'block' | 'perfect') {
    // Combat outcome remains visible in the existing health, stamina and hit reactions.
  }

  hurt() {
    // Replace with a reviewed, licensed exertion cue before enabling.
  }

  growl() {
    this.caption('[A low growl]');
  }

  pickup() {
    // The item toast is the feedback until a material-specific sample is available.
  }

  interact() {
    // The world interaction supplies visual state and caption feedback where needed.
  }

  uiMove() {
    // Navigation remains silent to avoid a musical interface.
  }

  uiConfirm() {
    // Focus and pressed states carry confirmation feedback.
  }

  journal() {
    // Reading is silent until there is a reviewed page-turn sample.
  }

  gateCreak(caption = '[The sluice gate groans]') {
    this.caption(caption);
  }

  waterSurge() {
    this.caption('[Water begins to rush through the channel]');
  }

  rite() {
    this.caption('[Water settles at the spring]');
  }

  /** Keep the story bell silent until a reviewed acoustic recording is available. */
  bell(_gain: number, _bright = false) {
    // The app raises its separate semantic caption when a bell event matters.
  }

  caption(text: string) {
    this.onCaption?.(text);
  }
}
