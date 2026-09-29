import type { Settings } from '../platform/settings';

/**
 * Procedural audio: no sample files, so nothing in the prototype needs a licence beyond
 * this source. Independent master/music/effects/ambience/dialogue levels; essential
 * non-verbal cues also raise a caption event so they never depend on sound alone.
 */
export type SurfaceKind = 'grass' | 'road' | 'stone' | 'water' | 'deck';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: { music: GainNode; effects: GainNode; ambience: GainNode; dialogue: GainNode };
  private noiseBuf: AudioBuffer | null = null;
  private wind: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private water: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private mill: { gain: GainNode } | null = null;
  private nextBird = 0;
  private nextCricket = 0;
  private nextNote = 0;
  private nextHammer = 0;
  private musicStep = 0;
  onCaption: ((text: string) => void) | null = null;
  enabled = true;

  constructor(private getSettings: () => Settings) {}

  /** Must be called from a user gesture. */
  resume() {
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
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get ready() {
    return this.ctx !== null && this.ctx.state === 'running';
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
    // Mill wheel: slow creaking thump.
    const ms = this.noiseSrc();
    const mf = ctx.createBiquadFilter();
    mf.type = 'lowpass';
    mf.frequency.value = 260;
    const mg = ctx.createGain();
    mg.gain.value = 0;
    ms.connect(mf).connect(mg).connect(this.buses.ambience);
    ms.start();
    this.mill = { gain: mg };
  }

  /** Per-frame ambience update. */
  update(dt: number, e: { nightness: number; waterProximity: number; flow: number; millNear: number; millTurning: boolean; windAmount: number; quarryNear: number; quarryWorking: boolean; time: number; underRoof: boolean }) {
    if (!this.ctx || !this.wind || !this.water || !this.mill) return;
    const t = this.ctx.currentTime;
    const roof = e.underRoof ? 0.35 : 1;
    this.wind.gain.gain.setTargetAtTime(0.05 * (0.5 + e.windAmount) * roof, t, 0.6);
    const wl = e.waterProximity * (0.05 + 0.35 * e.flow) * roof;
    this.water.gain.gain.setTargetAtTime(wl, t, 0.4);
    this.water.filter.frequency.setTargetAtTime(700 + 1400 * e.flow, t, 0.5);
    this.mill.gain.gain.setTargetAtTime(e.millTurning ? 0.16 * e.millNear : 0.0, t, 0.5);
    // Birds by day, crickets by night.
    if (e.time > this.nextBird && e.nightness < 0.4 && !e.underRoof) {
      this.chirp();
      this.nextBird = e.time + 2.5 + Math.random() * 6;
    }
    if (e.time > this.nextCricket && e.nightness > 0.5 && !e.underRoof) {
      this.cricket();
      this.nextCricket = e.time + 0.5 + Math.random() * 1.5;
    }
    if (e.quarryWorking && e.quarryNear > 0.05 && e.time > this.nextHammer) {
      this.hammer(e.quarryNear);
      this.nextHammer = e.time + 0.55 + Math.random() * 0.5;
    }
    // Sparse generative music: a phrase every so often, mostly silence.
    if (e.time > this.nextNote) {
      this.phrase();
      this.nextNote = e.time + 9 + Math.random() * 14;
    }
    void dt;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, bus: GainNode, at = 0, attack = 0.02, detune = 0, lp = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = o;
    if (lp > 0) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      o.connect(f);
      node = f;
    }
    node.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private burst(dur: number, freq: number, q: number, vol: number, bus: GainNode, type: BiquadFilterType = 'bandpass', at = 0, sweep = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const s = this.noiseSrc(false);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweep !== 0) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * sweep), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  }

  /* ---- ambient one-shots ---- */
  private chirp() {
    if (!this.ctx) return;
    const base = 2200 + Math.random() * 1600;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      this.tone(base * (1 + i * 0.08), 0.09, 'sine', 0.035, this.buses.ambience, i * 0.11, 0.01);
    }
  }

  private cricket() {
    if (!this.ctx) return;
    for (let i = 0; i < 3; i++) this.tone(4300, 0.04, 'square', 0.006, this.buses.ambience, i * 0.07, 0.005, 0, 6000);
  }

  private hammer(near: number) {
    if (!this.ctx) return;
    this.burst(0.06, 2400, 6, 0.28 * near, this.buses.ambience, 'bandpass');
    this.tone(880, 0.2, 'triangle', 0.05 * near, this.buses.ambience, 0, 0.002, 0, 3000);
  }

  private phrase() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    // D dorian, intimate and sparse: bowed-ish saw through a low-pass, occasional soft second voice.
    const scale = [146.83, 164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63];
    const notes = 3 + Math.floor(Math.random() * 3);
    let idx = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < notes; i++) {
      idx = Math.max(0, Math.min(scale.length - 1, idx + Math.floor(Math.random() * 5) - 2));
      const f = scale[idx]!;
      const at = i * (1.6 + Math.random() * 1.2);
      this.tone(f, 4.6, 'sawtooth', 0.045, this.buses.music, at, 1.2, Math.random() * 10 - 5, 900);
      this.tone(f * 1.5, 4.0, 'sine', 0.02, this.buses.music, at + 0.3, 1.4);
      if (i === 0) this.tone(f / 2, 7, 'sine', 0.05, this.buses.music, at, 2.0);
    }
    this.musicStep++;
    void ctx;
  }

  /* ---- effects ---- */
  footstep(surface: SurfaceKind, running: boolean) {
    if (!this.ctx) return;
    const v = running ? 0.14 : 0.09;
    switch (surface) {
      case 'water':
        this.burst(0.16, 900 + Math.random() * 300, 1.2, v * 1.3, this.buses.effects, 'lowpass');
        break;
      case 'stone':
      case 'deck':
        this.burst(0.06, 1600 + Math.random() * 300, 1.5, v, this.buses.effects);
        this.tone(140, 0.08, 'triangle', v * 0.5, this.buses.effects, 0, 0.002);
        break;
      case 'road':
        this.burst(0.09, 700 + Math.random() * 200, 0.9, v, this.buses.effects);
        break;
      default:
        this.burst(0.11, 420 + Math.random() * 120, 0.7, v * 0.9, this.buses.effects, 'lowpass');
    }
  }

  swing(heavy: boolean) {
    if (!this.ctx) return;
    this.burst(heavy ? 0.32 : 0.2, 900, 1.2, heavy ? 0.22 : 0.16, this.buses.effects, 'bandpass', 0, 3);
  }

  hit(kind: 'flesh' | 'block' | 'perfect') {
    if (!this.ctx) return;
    if (kind === 'flesh') {
      this.burst(0.12, 260, 0.7, 0.4, this.buses.effects, 'lowpass');
      this.tone(96, 0.18, 'sine', 0.3, this.buses.effects, 0, 0.004);
    } else {
      this.tone(1180, 0.32, 'triangle', 0.16, this.buses.effects, 0, 0.002);
      this.tone(1760, 0.24, 'sine', 0.1, this.buses.effects, 0, 0.002);
      this.burst(0.05, 3200, 3, 0.25, this.buses.effects);
      if (kind === 'perfect') this.tone(2350, 0.4, 'sine', 0.1, this.buses.effects, 0.03, 0.002);
    }
  }

  hurt() {
    if (!this.ctx) return;
    this.tone(180, 0.22, 'sawtooth', 0.12, this.buses.effects, 0, 0.005, 0, 700);
    this.tone(140, 0.3, 'sawtooth', 0.1, this.buses.effects, 0.05, 0.005, 0, 600);
  }

  growl() {
    if (!this.ctx) return;
    this.tone(70, 0.7, 'sawtooth', 0.14, this.buses.effects, 0, 0.1, 0, 300);
    this.tone(84, 0.7, 'sawtooth', 0.1, this.buses.effects, 0.05, 0.1, 6, 260);
    this.caption('[A low growl]');
  }

  pickup() {
    if (!this.ctx) return;
    this.tone(660, 0.25, 'triangle', 0.14, this.buses.effects, 0, 0.005);
    this.tone(990, 0.35, 'sine', 0.1, this.buses.effects, 0.08, 0.005);
  }

  interact() {
    if (!this.ctx) return;
    this.tone(520, 0.1, 'triangle', 0.1, this.buses.effects, 0, 0.003);
  }

  uiMove() {
    if (!this.ctx) return;
    this.tone(700, 0.05, 'sine', 0.05, this.buses.effects, 0, 0.002);
  }

  uiConfirm() {
    if (!this.ctx) return;
    this.tone(560, 0.09, 'triangle', 0.09, this.buses.effects, 0, 0.003);
    this.tone(840, 0.14, 'sine', 0.07, this.buses.effects, 0.05, 0.003);
  }

  journal() {
    if (!this.ctx) return;
    this.burst(0.12, 2200, 1, 0.1, this.buses.effects, 'highpass');
    this.tone(392, 0.3, 'sine', 0.06, this.buses.effects, 0.05);
  }

  blip(pitch: number) {
    if (!this.ctx) return;
    this.tone(pitch, 0.05, 'triangle', 0.028, this.buses.dialogue, 0, 0.004, 0, 1800);
  }

  gateCreak() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, t);
    o.frequency.linearRampToValueAtTime(58, t + 1.4);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.13, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(f).connect(g).connect(this.buses.effects);
    o.start(t);
    o.stop(t + 1.6);
    this.burst(0.9, 300, 1, 0.12, this.buses.effects, 'lowpass', 0.1);
    this.caption('[The sluice gate groans]');
  }

  waterSurge() {
    if (!this.ctx) return;
    this.burst(2.4, 500, 0.8, 0.28, this.buses.effects, 'lowpass', 0, 3.4);
  }

  rite() {
    if (!this.ctx) return;
    [392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 2.6, 'sine', 0.08, this.buses.effects, i * 0.18, 0.4));
    this.burst(1.6, 1800, 2, 0.08, this.buses.effects, 'bandpass', 0.1, 0.4);
    this.caption('[A calm rising chord]');
  }

  /** A struck bell with inharmonic partials. gain is 0..1 (distance already applied). */
  bell(gain: number, bright = false) {
    if (!this.ctx || gain <= 0.01) return;
    const base = bright ? 392 : 246;
    const partials = [1, 2.0, 2.76, 5.4, 8.9];
    partials.forEach((p, i) => this.tone(base * p, 3.2 / (1 + i * 0.5), 'sine', 0.22 * gain / (1 + i * 0.6), this.buses.effects, 0, 0.003));
    this.burst(0.05, 2800, 2, 0.15 * gain, this.buses.effects);
  }

  caption(text: string) {
    this.onCaption?.(text);
  }
}
