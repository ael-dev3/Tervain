import type { Settings } from '../platform/settings';

/**
 * Audio facade for the prototype. Until sourced and reviewed recordings are available,
 * ordinary UI, dialogue, footstep and combat contacts stay deliberately quiet. The
 * broad wind/water beds remain procedural; semantic captions are raised
 * independently of AudioContext availability and volume settings.
 */
export type SurfaceKind = 'grass' | 'road' | 'stone' | 'water' | 'deck' | 'sand';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: { music: GainNode; effects: GainNode; ambience: GainNode; dialogue: GainNode };
  private noiseBuf: AudioBuffer | null = null;
  private wind: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private water: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private sea: { rumble: GainNode; hiss: GainNode } | null = null;
  private pageHidden = false;
  onCaption: ((text: string) => void) | null = null;
  enabled = true;

  constructor(private getSettings: () => Settings) {}

  /** Must be called from a user gesture. */
  resume() {
    if (this.pageHidden) return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) {
        this.enabled = false;
        return;
      }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      const mk = () => {
        const g = this.ctx!.createGain();
        g.connect(this.master);
        return g;
      };
      this.buses = { music: mk(), effects: mk(), ambience: mk(), dialogue: mk() };
      this.noiseBuf = this.makeNoise(2);
      this.startBeds();
      this.applySettings();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
  }

  /** Suspend the whole context so looping sources and their LFO clocks stop in a hidden tab. */
  setPageHidden(hidden: boolean) {
    this.pageHidden = hidden;
    if (!this.ctx || this.ctx.state === 'closed') return;
    // Queue both transitions, including a quick hide/show before suspend has resolved.
    const transition = hidden ? this.ctx.suspend() : this.ctx.resume();
    void transition.catch(() => undefined);
  }

  get ready() {
    return !this.pageHidden && this.ctx !== null && this.ctx.state === 'running';
  }

  private makeNoise(seconds: number) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.06 * w) / 1.06; // brown-ish
      d[i] = last * 3.2;
    }
    return buf;
  }

  private noiseSrc(loop = true) {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = loop;
    return s;
  }

  applySettings() {
    if (!this.ctx) return;
    const v = this.getSettings().volumes;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(v.master, t, 0.05);
    this.buses.music.gain.setTargetAtTime(v.music, t, 0.05);
    this.buses.effects.gain.setTargetAtTime(v.effects, t, 0.05);
    this.buses.ambience.gain.setTargetAtTime(v.ambience, t, 0.05);
    this.buses.dialogue.gain.setTargetAtTime(v.dialogue, t, 0.05);
  }

  private startBeds() {
    const ctx = this.ctx!;
    // Wind: band-passed brown noise with a slow LFO on level.
    const ws = this.noiseSrc();
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 420;
    wf.Q.value = 0.5;
    const wg = ctx.createGain();
    wg.gain.value = 0.0;
    ws.connect(wf).connect(wg).connect(this.buses.ambience);
    ws.start();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lg = ctx.createGain();
    lg.gain.value = 120;
    lfo.connect(lg).connect(wf.frequency);
    lfo.start();
    this.wind = { gain: wg, filter: wf };
    // Water: low-passed noise whose level follows proximity and flow.
    const ns = this.noiseSrc();
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 1400;
    const ng = ctx.createGain();
    ng.gain.value = 0;
    ns.connect(nf).connect(ng).connect(this.buses.ambience);
    ns.start();
    this.water = { gain: ng, filter: nf };
    // The sea: a deep swell rumble and a bright hiss of spray, both breathing with the waves (a slow LFO, a little out of step).
    const rs = this.noiseSrc();
    const rf = ctx.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.value = 240;
    const rg = ctx.createGain();
    rg.gain.value = 0;
    rs.connect(rf).connect(rg).connect(this.buses.ambience);
    rs.start();
    const hs = this.noiseSrc();
    const hf = ctx.createBiquadFilter();
    hf.type = 'bandpass';
    hf.frequency.value = 3000;
    hf.Q.value = 0.6;
    const hg = ctx.createGain();
    hg.gain.value = 0;
    hs.connect(hf).connect(hg).connect(this.buses.ambience);
    hs.start();
    for (const [g, f, depth] of [[rg, 0.12, 0.05], [hg, 0.15, 0.03]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = depth;
      o.connect(og).connect(g.gain);
      o.start();
    }
    this.sea = { rumble: rg, hiss: hg };
  }

  /** Per-frame ambience update. */
  update(dt: number, e: { nightness: number; waterProximity: number; flow: number; millNear: number; millTurning: boolean; windAmount: number; quarryNear: number; quarryWorking: boolean; time: number; underRoof: boolean; seaProximity?: number }) {
    if (this.pageHidden || !this.ctx || !this.wind || !this.water) return;
    const t = this.ctx.currentTime;
    const roof = e.underRoof ? 0.35 : 1;
    this.wind.gain.gain.setTargetAtTime(0.05 * (0.5 + e.windAmount) * roof, t, 0.6);
    const wl = e.waterProximity * (0.05 + 0.35 * e.flow) * roof;
    this.water.gain.gain.setTargetAtTime(wl, t, 0.4);
    this.water.filter.frequency.setTargetAtTime(700 + 1400 * e.flow, t, 0.5);
    const sp = (e.seaProximity ?? 0) * roof;
    if (this.sea) {
      this.sea.rumble.gain.setTargetAtTime(0.16 * sp, t, 0.8);
      this.sea.hiss.gain.setTargetAtTime(0.06 * sp * sp, t, 0.8);
    }
    // Wildlife, quarry impacts and the placeholder score remain silent until they can
    // be supplied as locally packaged, provenance-checked, reviewed audio assets.
    void e.nightness;
    void e.millNear;
    void e.millTurning;
    void e.quarryNear;
    void e.quarryWorking;
    void e.time;
    void dt;
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
