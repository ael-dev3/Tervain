import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../../src/platform/settings';
import { AudioEngine, MENU_MUSIC_SOURCES, ambienceMix, ambienceNoise, type AmbienceEnvironment } from '../../src/presentation/audio';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('semantic audio captions', () => {
  it('delivers event captions with no audio device and all volumes muted', () => {
    vi.stubGlobal('window', {});
    const settings = defaultSettings();
    for (const key of Object.keys(settings.volumes) as (keyof typeof settings.volumes)[]) settings.volumes[key] = 0;
    const audio = new AudioEngine(() => settings);
    const caption = vi.fn();
    audio.onCaption = caption;
    audio.resume();
    expect(audio.enabled).toBe(false);
    audio.gateCreak();
    audio.waterSurge();
    audio.rite();
    audio.growl();
    expect(caption.mock.calls.map(([text]) => text)).toEqual([
      '[The sluice gate groans]',
      '[Water begins to rush through the channel]',
      '[Water settles at the spring]',
      '[A low growl]',
    ]);
  });

  it('does not initialize audio while hidden, without suppressing semantic captions', () => {
    const createAudio = vi.fn();
    vi.stubGlobal('window', { AudioContext: createAudio });
    const audio = new AudioEngine(defaultSettings);
    const caption = vi.fn();
    audio.onCaption = caption;
    audio.setPageHidden(true);
    audio.resume();
    audio.caption('[A distant bell]');
    expect(createAudio).not.toHaveBeenCalled();
    expect(audio.ready).toBe(false);
    expect(caption).toHaveBeenCalledWith('[A distant bell]');
  });

  it('queues suspend and resume on a quick hide/show transition and handles autoplay rejection', async () => {
    const ctx = { state: 'running', suspend: vi.fn(() => Promise.resolve()), resume: vi.fn(() => Promise.reject(new Error('gesture required'))) };
    const audio = new AudioEngine(defaultSettings);
    // Inject a running context to exercise visibility timing independently of WebAudio synthesis nodes.
    (audio as unknown as { ctx: typeof ctx }).ctx = ctx;
    audio.setPageHidden(true);
    expect(audio.ready).toBe(false);
    audio.setPageHidden(false);
    await Promise.resolve();
    expect(ctx.suspend).toHaveBeenCalledTimes(1);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });
});

const environment = (overrides: Partial<AmbienceEnvironment> = {}): AmbienceEnvironment => ({
  nightness: 0, waterProximity: 1, flow: 1, millNear: 0, millTurning: false,
  windAmount: 1, quarryNear: 0, quarryWorking: false, time: 0, underRoof: false,
  seaProximity: 1, ...overrides,
});

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

class Param {
  value = 1;
  setTargetAtTime = vi.fn((value: number, _time: number, _constant: number) => { this.value = value; });
  cancelAndHoldAtTime = vi.fn((_time: number) => undefined);
  cancelScheduledValues = vi.fn((_time: number) => undefined);
  setValueAtTime = vi.fn((value: number, _time: number) => { this.value = value; });
}

class Node {
  connect = vi.fn((node: Node) => node);
  disconnect = vi.fn();
}

class Gain extends Node { gain = new Param(); }
class Filter extends Node { frequency = new Param(); Q = new Param(); type = ''; }
class Source extends Node {
  buffer: { duration: number } | null = null;
  loop = false;
  playbackRate = new Param();
  start = vi.fn((_when: number, _offset: number) => undefined);
  stop = vi.fn();
}

class Context {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new Node();
  nodes: Node[] = [];
  gains: Gain[] = [];
  sources: Source[] = [];
  filters: Filter[] = [];
  mediaSources: Node[] = [];
  bufferData: Float32Array | null = null;
  listeners = new Map<string, EventListener[]>();
  addEventListener = vi.fn((type: string, listener: EventListener) => {
    this.listeners.set(type, [...this.listeners.get(type) ?? [], listener]);
  });
  removeEventListener = vi.fn((type: string, listener: EventListener) => {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== listener));
  });
  emit(type: string) { for (const listener of this.listeners.get(type) ?? []) listener(new Event(type)); }
  createGain = () => {
    const node = new Gain(); this.nodes.push(node); this.gains.push(node); return node;
  };
  createBiquadFilter = () => {
    const node = new Filter(); this.nodes.push(node); this.filters.push(node); return node;
  };
  createBufferSource = () => {
    const node = new Source(); this.nodes.push(node); this.sources.push(node); return node;
  };
  createMediaElementSource = (_media: HTMLAudioElement) => {
    const node = new Node(); this.nodes.push(node); this.mediaSources.push(node); return node;
  };
  createBuffer = (_channels: number, length: number, rate: number) => {
    this.bufferData = new Float32Array(length);
    return { duration: length / rate, getChannelData: (_channel: number) => this.bufferData! };
  };
  resume = vi.fn(() => { this.state = 'running'; return Promise.resolve(); });
  suspend = vi.fn(() => { this.state = 'suspended'; return Promise.resolve(); });
  close = vi.fn(() => { this.state = 'closed'; return Promise.resolve(); });
}

class Media {
  src = '';
  loop = false;
  preload = '';
  volume = 1;
  paused = true;
  readyState = 4;
  ended = false;
  seeking = false;
  muted = false;
  currentTime = 0;
  duration = 214.2;
  error: { code: number } | null = null;
  listeners = new Map<string, EventListener[]>();
  canPlayType = vi.fn((_type: string) => 'probably');
  play = vi.fn(() => { this.paused = false; return Promise.resolve(); });
  pause = vi.fn(() => { this.paused = true; });
  load = vi.fn();
  removeAttribute = vi.fn((name: string) => { if (name === 'src') this.src = ''; });
  addEventListener = vi.fn((type: string, listener: EventListener) => {
    this.listeners.set(type, [...this.listeners.get(type) ?? [], listener]);
  });
  removeEventListener = vi.fn((type: string, listener: EventListener) => {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((l) => l !== listener));
  });
  emit(type: string) { for (const listener of this.listeners.get(type) ?? []) listener(new Event(type)); }
}

function musicFixture(settings = defaultSettings(), supported = true) {
  const ctx = new Context();
  const media = new Media();
  media.canPlayType.mockReturnValue(supported ? 'probably' : '');
  const makeMedia = vi.fn(function () { return media; });
  vi.stubGlobal('window', { AudioContext: vi.fn(function () { return ctx; }), Audio: makeMedia });
  const audio = new AudioEngine(() => settings);
  return { audio, ctx, media, makeMedia, settings };
}

async function flushMusic() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function audioFixture(settings = defaultSettings()) {
  const ctx = new Context();
  const makeContext = vi.fn(function (_options: AudioContextOptions) { return ctx; });
  vi.stubGlobal('window', { AudioContext: makeContext });
  const audio = new AudioEngine(() => settings);
  audio.resume();
  return { ctx, audio, settings, makeContext };
}

describe('ambience signal and mix', () => {
  it('has no isolated loop-boundary impulse, DC offset or overloaded PCM peak', () => {
    for (const seed of [15, 7005, 9021]) {
      const data = ambienceNoise(8000, 6, seededRandom(seed));
      expect(data).toHaveLength(48000);
      let sum = 0;
      let peak = 0;
      let maximumStep = 0;
      for (let i = 0; i < data.length; i++) {
        const value = data[i]!;
        expect(Number.isFinite(value)).toBe(true);
        sum += value;
        peak = Math.max(peak, Math.abs(value));
        if (i) maximumStep = Math.max(maximumStep, Math.abs(value - data[i - 1]!));
      }
      expect(Math.abs(sum / data.length)).toBeLessThan(0.000001);
      expect(peak).toBeLessThanOrEqual(0.600001);
      expect(peak).toBeGreaterThan(0.3);
      // The seam is an ordinary filtered-noise step, not a reset-to-zero click.
      expect(Math.abs(data[0]! - data[data.length - 1]!)).toBeLessThanOrEqual(maximumStep);
    }
    expect(ambienceNoise(100, 1, () => 0.5).every((value) => value === 0)).toBe(true);
  });

  it('makes surf vanish at zero proximity and keeps every full-volume envelope positive with headroom', () => {
    for (let time = 0; time < 60; time += 0.037) {
      const distant = ambienceMix(environment({ seaProximity: 0 }), time);
      expect(distant.rumble).toBe(0);
      expect(distant.hiss).toBe(0);
      const near = ambienceMix(environment(), time);
      const levels = [near.wind, near.water, near.rumble, near.hiss];
      expect(levels.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
      expect(levels.reduce((sum, value) => sum + value, 0) * 0.6).toBeLessThan(0.42);
      const sheltered = ambienceMix(environment({ underRoof: true }), time);
      expect(sheltered.wind).toBeCloseTo(near.wind * 0.35);
      expect(sheltered.water).toBeCloseTo(near.water * 0.35);
      expect(sheltered.rumble).toBeCloseTo(near.rumble * 0.35);
      expect(sheltered.hiss).toBeCloseTo(near.hiss * 0.35 * 0.35);
    }
    const invalid = ambienceMix(environment({ flow: Infinity, waterProximity: NaN, windAmount: -10, seaProximity: -1 }), NaN);
    expect(Object.values(invalid).every(Number.isFinite)).toBe(true);
    expect(invalid.water).toBe(0);
    expect(invalid.rumble).toBe(0);
  });
});

describe('audio graph lifetime and automation', () => {
  it('quiets procedural world envelopes for a graphics build without replacing sources, then restores them immediately', () => {
    const { ctx, audio } = audioFixture();
    audio.update(0.05, environment());
    const beds = ctx.gains.slice(5);
    expect(beds.some((node) => node.gain.value > 0)).toBe(true);
    const sourceCount = ctx.sources.length;
    audio.pauseWorld();
    expect(beds.every((node) => node.gain.value === 0)).toBe(true);
    expect(ctx.sources).toHaveLength(sourceCount);
    // A build may finish within the 100 ms automation interval.
    audio.update(0.001, environment());
    expect(beds.some((node) => node.gain.value > 0)).toBe(true);
    expect(ctx.sources).toHaveLength(sourceCount);
    audio.dispose();
  });

  it('leaves the owner-supplied menu stream and its actual clock alone during a graphics build', async () => {
    const { audio, media, ctx } = musicFixture();
    audio.setMenuActive(true);
    audio.resume();
    await flushMusic();
    media.currentTime = 47;
    const sources = ctx.mediaSources.length;
    audio.pauseWorld();
    expect(media.paused).toBe(false);
    expect(media.currentTime).toBe(47);
    expect(media.play).toHaveBeenCalledOnce();
    expect(ctx.mediaSources).toHaveLength(sources);
    audio.dispose();
  });

  it('initializes exactly one loop graph with independent source phases and rates', () => {
    const { ctx, audio, makeContext } = audioFixture();
    const count = ctx.nodes.length;
    audio.resume();
    audio.resume();
    expect(makeContext).toHaveBeenCalledExactlyOnceWith({ latencyHint: 'interactive' });
    expect(ctx.nodes).toHaveLength(count);
    expect(ctx.sources).toHaveLength(4);
    expect(new Set(ctx.sources.map((source) => source.start.mock.calls[0]![1])).size).toBe(4);
    expect(new Set(ctx.sources.map((source) => source.playbackRate.value)).size).toBe(4);
    expect(ctx.sources.every((source) => source.loop && source.buffer?.duration === 6)).toBe(true);
    // A single buffer is shared; repeated gestures do not allocate duplicate beds.
    expect(new Set(ctx.sources.map((source) => source.buffer)).size).toBe(1);
    expect(audio.ready).toBe(true);
    audio.dispose();
  });

  it('starts muted immediately and clamps corrupt or out-of-range stored volumes', () => {
    const settings = defaultSettings();
    settings.volumes = { master: 0, ambience: 0, effects: 100, music: NaN, dialogue: -1 };
    const { ctx, audio } = audioFixture(settings);
    expect(ctx.gains[0]!.gain.value).toBe(0);
    expect(ctx.gains[1]!.gain.value).toBe(0);
    expect(ctx.gains[2]!.gain.value).toBe(1);
    expect(ctx.gains[3]!.gain.value).toBe(0);
    expect(ctx.gains[4]!.gain.value).toBe(0);
    expect(ctx.gains.slice(5).every((node) => node.gain.value === 0)).toBe(true);
    settings.volumes.master = Infinity;
    audio.applySettings();
    expect(ctx.gains[0]!.gain.setTargetAtTime.mock.calls.at(-1)![0]).toBe(0);
    audio.dispose();
  });

  it('bounds automation independently of render rate and skips unchanged settings or inactive contexts', async () => {
    const { ctx, audio } = audioFixture();
    for (let frame = 0; frame < 120; frame++) {
      ctx.currentTime = frame / 120;
      audio.update(1 / 120, environment({ waterProximity: 0, seaProximity: 0 }));
    }
    const wind = ctx.gains[5]!.gain;
    expect(wind.setTargetAtTime.mock.calls.length).toBeGreaterThan(1);
    expect(wind.setTargetAtTime.mock.calls.length).toBeLessThanOrEqual(11);
    expect(wind.cancelAndHoldAtTime).toHaveBeenCalledTimes(wind.setTargetAtTime.mock.calls.length);
    // An unchanged dry channel schedules only its first zero target.
    expect(ctx.gains[6]!.gain.setTargetAtTime).toHaveBeenCalledTimes(1);
    audio.applySettings();
    const settingsCalls = ctx.gains[0]!.gain.setTargetAtTime.mock.calls.length;
    audio.applySettings();
    expect(ctx.gains[0]!.gain.setTargetAtTime).toHaveBeenCalledTimes(settingsCalls);
    audio.setPageHidden(true);
    ctx.currentTime = 2;
    const count = wind.setTargetAtTime.mock.calls.length;
    audio.update(1, environment());
    expect(wind.setTargetAtTime).toHaveBeenCalledTimes(count);
    audio.setPageHidden(false);
    await Promise.resolve();
    audio.update(0, environment());
    expect(wind.setTargetAtTime).toHaveBeenCalledTimes(count + 1);
    ctx.state = 'suspended';
    ctx.currentTime = 3;
    audio.update(1, environment());
    expect(wind.setTargetAtTime).toHaveBeenCalledTimes(count + 1);
    audio.dispose();
  });

  it('stops sources, disconnects nodes and releases the context exactly once', () => {
    const { ctx, audio, makeContext } = audioFixture();
    audio.dispose();
    audio.dispose();
    audio.resume();
    audio.update(1, environment());
    audio.applySettings();
    expect(ctx.sources.every((source) => source.stop.mock.calls.length === 1)).toBe(true);
    expect(ctx.nodes.every((node) => node.disconnect.mock.calls.length === 1)).toBe(true);
    expect(ctx.close).toHaveBeenCalledTimes(1);
    expect(makeContext).toHaveBeenCalledTimes(1);
    expect(audio.ready).toBe(false);
  });

  it('holds the present value before replacing ramps on older AudioParam implementations', () => {
    const { ctx, audio } = audioFixture();
    const master = ctx.gains[0]!.gain;
    Object.defineProperty(master, 'cancelAndHoldAtTime', { value: undefined });
    const current = master.value;
    ctx.currentTime = 0.7;
    audio.applySettings();
    expect(master.cancelScheduledValues).toHaveBeenCalledWith(0.7);
    expect(master.setValueAtTime).toHaveBeenCalledWith(current, 0.7);
    expect(master.setTargetAtTime).toHaveBeenCalledWith(current, 0.7, 0.035);
    audio.dispose();
  });

  it('releases a partially created graph and allows a later gesture to retry', () => {
    const ctx = new Context();
    ctx.createBuffer = () => { throw new Error('buffer allocation unavailable'); };
    vi.stubGlobal('window', { AudioContext: vi.fn(function () { return ctx; }) });
    const audio = new AudioEngine(defaultSettings);
    expect(() => audio.resume()).not.toThrow();
    expect(ctx.nodes.every((node) => node.disconnect.mock.calls.length === 1)).toBe(true);
    expect(ctx.close).toHaveBeenCalledTimes(1);
    expect(audio.ready).toBe(false);
    const retry = new Context();
    vi.stubGlobal('window', { AudioContext: vi.fn(function () { return retry; }) });
    audio.resume();
    expect(audio.ready).toBe(true);
    expect(retry.sources).toHaveLength(4);
    audio.dispose();
  });

  it('keeps input and captions available when device creation fails', () => {
    vi.stubGlobal('window', { AudioContext: class { constructor() { throw new Error('device unavailable'); } } });
    const audio = new AudioEngine(defaultSettings);
    const caption = vi.fn();
    audio.onCaption = caption;
    expect(() => audio.resume()).not.toThrow();
    audio.gateCreak();
    expect(caption).toHaveBeenCalledWith('[The sluice gate groans]');
    expect(audio.ready).toBe(false);
    expect(audio.enabled).toBe(false);
  });
});

describe('streamed owner-supplied menu score', () => {
  it('exposes unexpected output suspension truthfully without an automatic retry or a second media clock', async () => {
    const { audio, ctx, media, makeMedia } = musicFixture();
    const states = vi.fn(); audio.onMusicState = states;
    audio.setMenuActive(true); audio.resume(); await flushMusic();
    media.currentTime = 60;
    ctx.state = 'suspended'; ctx.emit('statechange');
    expect(audio.menuMusicState).toBe('blocked');
    expect(states).toHaveBeenLastCalledWith('blocked');
    expect(audio.menuMusicPlayback).toMatchObject({ time: 60, playing: false, gain: 0 });
    for (let i = 0; i < 120; i++) audio.update(1 / 60, environment());
    expect(ctx.resume).not.toHaveBeenCalled(); expect(media.play).toHaveBeenCalledTimes(1);
    audio.resume({ retryPending: true }); await flushMusic();
    expect(audio.menuMusicState).toBe('playing');
    expect(audio.menuMusicPlayback).toMatchObject({ time: 60, playing: true });
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(makeMedia).toHaveBeenCalledTimes(1); expect(ctx.mediaSources).toHaveLength(1);
    expect(media.play).toHaveBeenCalledTimes(1);
    audio.dispose();
    expect(ctx.listeners.get('statechange')).toEqual([]);
  });

  it('retains a visible recovery state after rejected resume and allows the next explicit Play gesture to retry', async () => {
    const { audio, ctx, media } = musicFixture();
    audio.setMenuActive(true); audio.resume(); await flushMusic();
    media.currentTime = 73;
    ctx.state = 'suspended'; ctx.emit('statechange');
    ctx.resume.mockImplementationOnce(() => Promise.reject(new Error('fresh gesture required')));
    audio.resume(); await flushMusic();
    expect(audio.menuMusicState).toBe('blocked');
    audio.applySettings(); expect(audio.menuMusicState).toBe('blocked');
    expect(audio.menuMusicPlayback).toMatchObject({ time: 73, playing: false });
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    audio.resume({ retryPending: true }); await flushMusic();
    expect(audio.menuMusicState).toBe('playing');
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(ctx.mediaSources).toHaveLength(1); expect(media.currentTime).toBe(73);
    audio.dispose();
  });

  it('allows an explicit Play gesture to bypass a browser-held pending resume without stale completion changing the new state', async () => {
    const { audio, ctx, media } = musicFixture();
    audio.setMenuActive(true); audio.resume(); await flushMusic();
    ctx.state = 'suspended'; ctx.emit('statechange');
    let oldResume = () => {};
    ctx.resume.mockImplementationOnce(() => new Promise<void>((resolve) => { oldResume = resolve; }));
    audio.resume(); audio.resume();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(audio.menuMusicState).toBe('blocked');
    audio.resume({ retryPending: true }); await flushMusic();
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(audio.menuMusicState).toBe('playing');
    oldResume(); await flushMusic();
    expect(audio.menuMusicState).toBe('playing');
    expect(media.play).toHaveBeenCalledTimes(1); expect(ctx.mediaSources).toHaveLength(1);
    audio.dispose();
  });

  it('keeps hidden, muted and terminal-error states distinct when the output context changes', async () => {
    const { audio, ctx, media, settings } = musicFixture(defaultSettings(), false);
    audio.setMenuActive(true); audio.resume(); await flushMusic();
    audio.setPageHidden(true); ctx.emit('statechange');
    expect(audio.menuMusicState).toBe('paused');
    settings.volumes.music = 0;
    audio.setPageHidden(false); await flushMusic(); ctx.emit('statechange');
    expect(audio.menuMusicState).toBe('muted');
    settings.volumes.music = 0.55; audio.applySettings(); await flushMusic();
    media.error = { code: 3 }; media.emit('error');
    expect(audio.menuMusicState).toBe('unavailable');
    ctx.state = 'suspended'; ctx.emit('statechange');
    expect(audio.menuMusicState).toBe('unavailable');
    expect(audio.menuMusicPlayback.playing).toBe(false);
    audio.dispose();
  });

  it('keeps a terminal decoder failure unavailable when its queued native pause event arrives afterwards', async () => {
    const { audio, media, ctx } = musicFixture(defaultSettings(), false);
    audio.setMenuActive(true); audio.resume(); await flushMusic();
    media.error = { code: 3 }; media.emit('error');
    expect(audio.menuMusicState).toBe('unavailable');
    media.emit('pause');
    expect(audio.menuMusicState).toBe('unavailable');
    expect(audio.menuMusicPlayback).toMatchObject({ playing: false, gain: 0 });
    // Even if a browser clears the error object before delivering the queued event, the terminal state is preserved.
    media.error = null; media.emit('pause');
    expect(audio.menuMusicState).toBe('unavailable');
    expect(media.play).toHaveBeenCalledTimes(1); expect(ctx.mediaSources).toHaveLength(1);
    audio.dispose();
  });

  it('does not report a stale queued pause after the same healthy stream has already resumed', async () => {
    const { audio, media } = musicFixture();
    audio.setMenuActive(true); audio.resume(); await flushMusic();
    media.paused = false; media.emit('pause');
    expect(audio.menuMusicState).toBe('playing');
    expect(audio.menuMusicPlayback.playing).toBe(true);
    expect(media.play).toHaveBeenCalledTimes(1);
    audio.dispose();
  });

  it('reports native buffering and seeking truthfully through settings/gesture refreshes without retrying or duplicating the score', async () => {
    const { audio, media, ctx } = musicFixture();
    audio.setMenuActive(true); audio.resume(); await flushMusic();
    const nodes = ctx.nodes.length;
    media.currentTime = 73; media.emit('waiting');
    expect(audio.menuMusicState).toBe('loading');
    audio.applySettings(); audio.resume();
    expect(audio.menuMusicState).toBe('loading');
    expect(audio.menuMusicPlayback).toMatchObject({ time: 73, playing: false, gain: 0 });
    media.emit('playing'); expect(audio.menuMusicState).toBe('playing');
    media.seeking = true; media.emit('seeking');
    expect(audio.menuMusicState).toBe('loading');
    audio.resume(); expect(audio.menuMusicState).toBe('loading');
    media.currentTime = 88; media.seeking = false; media.emit('seeked');
    expect(audio.menuMusicState).toBe('playing');
    expect(audio.menuMusicPlayback).toMatchObject({ time: 88, playing: true });
    expect(media.play).toHaveBeenCalledTimes(1);
    expect(ctx.nodes).toHaveLength(nodes); expect(ctx.mediaSources).toHaveLength(1);
    audio.dispose();
  });

  it('reports a native media pause and resumes the same position only on a fresh gesture', async () => {
    const { audio, media, ctx } = musicFixture();
    audio.setMenuActive(true); audio.resume(); await flushMusic();
    media.currentTime = 101; media.paused = true; media.emit('pause');
    expect(audio.menuMusicState).toBe('paused');
    expect(audio.menuMusicPlayback).toMatchObject({ time: 101, playing: false, gain: 0 });
    for (let i = 0; i < 20; i++) audio.update(1 / 60, environment());
    expect(media.play).toHaveBeenCalledTimes(1);
    audio.resume(); await flushMusic();
    expect(audio.menuMusicState).toBe('playing');
    expect(media.currentTime).toBe(101);
    expect(media.play).toHaveBeenCalledTimes(2); expect(ctx.mediaSources).toHaveLength(1);
    audio.dispose();
  });

  it('waits for a gesture, then streams once through Music and Master without decoding a song buffer', async () => {
    const { audio, ctx, media, makeMedia } = musicFixture();
    audio.setMenuActive(true);
    expect(audio.menuMusicState).toBe('locked');
    expect(makeMedia).not.toHaveBeenCalled();
    audio.resume();
    await flushMusic();
    expect(makeMedia).toHaveBeenCalledTimes(1);
    expect(ctx.mediaSources).toHaveLength(1);
    expect(media.src).toBe(MENU_MUSIC_SOURCES.opus);
    expect(media.preload).toBe('none');
    expect(media.loop).toBe(true);
    expect(media.volume).toBe(1);
    expect(audio.menuMusicState).toBe('playing');
    const envelope = ctx.gains[9]!;
    expect(ctx.mediaSources[0]!.connect).toHaveBeenCalledWith(envelope);
    expect(envelope.connect).toHaveBeenCalledWith(ctx.gains[1]);
    expect(envelope.gain.setTargetAtTime).toHaveBeenCalledWith(0.8, 0, 0.15);
    // Repeated menu gestures and quality/menu refreshes retain one media element.
    audio.resume(); audio.setMenuActive(true); audio.resume();
    expect(makeMedia).toHaveBeenCalledTimes(1);
    expect(media.play).toHaveBeenCalledTimes(1);
    expect(ctx.sources).toHaveLength(4);
    expect(ctx.bufferData).toHaveLength(48000);
    expect(audio.diagnostics.music).toMatchObject({ state: 'playing', source: MENU_MUSIC_SOURCES.opus, duration: 214.2 });
    audio.dispose();
  });

  it('selects the AAC fallback without trying Opus when the codec is unsupported', async () => {
    const { audio, media } = musicFixture(defaultSettings(), false);
    audio.setMenuActive(true); audio.resume();
    await flushMusic();
    expect(media.src).toBe(MENU_MUSIC_SOURCES.aac);
    expect(media.canPlayType).toHaveBeenCalledWith('audio/ogg; codecs="opus"');
    expect(audio.menuMusicState).toBe('playing');
    audio.dispose();
  });

  it('falls back once on a media error and preserves position when metadata becomes available', async () => {
    const { audio, ctx, media, makeMedia } = musicFixture();
    audio.setMenuActive(true); audio.resume();
    await flushMusic();
    media.currentTime = 73;
    media.paused = true;
    media.emit('error');
    expect(media.src).toBe(MENU_MUSIC_SOURCES.aac);
    media.currentTime = 0;
    media.emit('loadedmetadata');
    await flushMusic();
    expect(media.currentTime).toBe(73);
    expect(media.play).toHaveBeenCalledTimes(2);
    expect(ctx.mediaSources).toHaveLength(1);
    expect(makeMedia).toHaveBeenCalledTimes(1);
    media.emit('error');
    expect(audio.menuMusicState).toBe('unavailable');
    expect(media.load).toHaveBeenCalledTimes(1);
    audio.dispose();
  });

  it('does not start a muted stream and responds to Master/Music without affecting other buses', async () => {
    const settings = defaultSettings();
    settings.volumes.music = 0;
    const { audio, ctx, media, makeMedia } = musicFixture(settings);
    audio.setMenuActive(true); audio.resume();
    expect(makeMedia).not.toHaveBeenCalled();
    expect(audio.menuMusicState).toBe('muted');
    settings.volumes.music = 0.75;
    audio.applySettings();
    await flushMusic();
    expect(ctx.gains[1]!.gain.value).toBe(0.75);
    expect(audio.menuMusicState).toBe('playing');
    media.currentTime = 45;
    settings.volumes.master = 0;
    audio.applySettings();
    expect(media.paused).toBe(true);
    expect(audio.menuMusicState).toBe('muted');
    const ambience = ctx.gains[3]!.gain.value;
    settings.volumes.master = 1;
    audio.applySettings();
    await flushMusic();
    expect(media.paused).toBe(false);
    expect(media.currentTime).toBe(45);
    expect(ctx.gains[3]!.gain.value).toBe(ambience);
    expect(makeMedia).toHaveBeenCalledTimes(1);
    audio.dispose();
  });

  it('fades before pausing for gameplay, resumes the same position and cancels a pending fade on quick return', async () => {
    vi.useFakeTimers();
    const { audio, ctx, media } = musicFixture();
    audio.setMenuActive(true); audio.resume();
    await flushMusic();
    media.currentTime = 89;
    ctx.currentTime = 89;
    audio.setMenuActive(false);
    expect(ctx.gains[9]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 89, 0.15);
    expect(media.paused).toBe(false);
    vi.advanceTimersByTime(899);
    expect(media.paused).toBe(false);
    vi.advanceTimersByTime(1);
    expect(media.paused).toBe(true);
    expect(media.currentTime).toBe(89);
    audio.setMenuActive(true);
    await flushMusic();
    expect(media.play).toHaveBeenCalledTimes(2);
    expect(media.currentTime).toBe(89);
    audio.setMenuActive(false);
    vi.advanceTimersByTime(100);
    audio.setMenuActive(true);
    vi.advanceTimersByTime(1000);
    expect(media.paused).toBe(false);
    expect(media.play).toHaveBeenCalledTimes(2);
    audio.dispose();
  });

  it('pauses immediately while hidden and resumes without resetting or duplicating the stream', async () => {
    const { audio, ctx, media, makeMedia } = musicFixture();
    audio.setMenuActive(true); audio.resume();
    await flushMusic();
    media.currentTime = 121.2;
    audio.setPageHidden(true);
    expect(media.paused).toBe(true);
    expect(ctx.suspend).toHaveBeenCalledTimes(1);
    audio.resume();
    expect(media.play).toHaveBeenCalledTimes(1);
    audio.setPageHidden(false);
    await flushMusic();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(media.paused).toBe(false);
    expect(media.currentTime).toBe(121.2);
    expect(makeMedia).toHaveBeenCalledTimes(1);
    expect(ctx.mediaSources).toHaveLength(1);
    audio.dispose();
  });

  it('restores truthful playing state on a quick menu return without requiring another playing event', async () => {
    vi.useFakeTimers();
    const { audio, media } = musicFixture();
    audio.setMenuActive(true); audio.resume();
    await flushMusic();
    expect(audio.menuMusicState).toBe('playing');
    media.currentTime = 101;
    audio.setMenuActive(false);
    expect(audio.menuMusicState).toBe('paused');
    vi.advanceTimersByTime(100);
    media.currentTime = 101.1;
    audio.setMenuActive(true);
    expect(audio.menuMusicState).toBe('playing');
    expect(audio.diagnostics.music.currentTime).toBe(101.1);
    expect(media.play).toHaveBeenCalledTimes(1);
    expect(media.pause).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    audio.dispose();
  });

  it('preserves the leave-menu pause deadline through repeated gameplay gestures', async () => {
    vi.useFakeTimers();
    const { audio, media } = musicFixture();
    audio.setMenuActive(true); audio.resume();
    await flushMusic();
    audio.setMenuActive(false);
    // The app calls resume on every keydown/pointerdown, including held-key repeat.
    for (let i = 0; i < 8; i++) {
      vi.advanceTimersByTime(100);
      audio.resume();
      expect(media.paused).toBe(false);
    }
    vi.advanceTimersByTime(99);
    audio.resume();
    expect(media.paused).toBe(false);
    vi.advanceTimersByTime(1);
    expect(media.paused).toBe(true);
    audio.resume();
    expect(media.play).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    audio.dispose();
  });

  it('contains rejected play promises and waits for a fresh gesture instead of retrying each frame', async () => {
    const { audio, media } = musicFixture();
    media.play.mockImplementationOnce(() => Promise.reject(new Error('autoplay blocked')));
    audio.setMenuActive(true); audio.resume();
    await flushMusic();
    expect(audio.menuMusicState).toBe('blocked');
    for (let i = 0; i < 120; i++) { audio.update(1 / 120, environment()); audio.setMenuActive(true); }
    expect(media.play).toHaveBeenCalledTimes(1);
    audio.resume();
    await flushMusic();
    expect(media.play).toHaveBeenCalledTimes(2);
    expect(audio.menuMusicState).toBe('playing');
    audio.dispose();
  });

  it('ignores late play promises after backgrounding and allows a fresh visible request', async () => {
    const { audio, media } = musicFixture();
    let resolvePlay = () => {};
    media.play.mockImplementationOnce(() => new Promise<void>((resolve) => { resolvePlay = resolve; media.paused = false; }));
    audio.setMenuActive(true); audio.resume();
    expect(audio.menuMusicState).toBe('loading');
    audio.setPageHidden(true);
    resolvePlay();
    await flushMusic();
    expect(media.paused).toBe(true);
    expect(audio.menuMusicState).toBe('paused');
    audio.setPageHidden(false);
    await flushMusic();
    expect(media.play).toHaveBeenCalledTimes(2);
    expect(audio.menuMusicState).toBe('playing');
    audio.dispose();
  });

  it('releases listeners, media data, pending fades and every connected node exactly once', async () => {
    vi.useFakeTimers();
    const { audio, ctx, media, makeMedia } = musicFixture();
    audio.setMenuActive(true); audio.resume();
    await flushMusic();
    audio.setMenuActive(false);
    audio.dispose();
    audio.dispose();
    vi.advanceTimersByTime(1000);
    audio.resume(); audio.setMenuActive(true);
    expect(media.pause).toHaveBeenCalledTimes(1);
    expect(media.removeAttribute).toHaveBeenCalledExactlyOnceWith('src');
    expect(media.load).toHaveBeenCalledTimes(1);
    expect([...media.listeners.values()].every((listeners) => listeners.length === 0)).toBe(true);
    expect(ctx.nodes.every((node) => node.disconnect.mock.calls.length === 1)).toBe(true);
    expect(makeMedia).toHaveBeenCalledTimes(1);
    expect(ctx.close).toHaveBeenCalledTimes(1);
  });

  it('keeps the ambience graph usable if media graph creation fails and cleans a failed partial stream', async () => {
    const { audio, ctx, media } = musicFixture();
    ctx.createMediaElementSource = () => { throw new Error('media graph unavailable'); };
    audio.setMenuActive(true);
    expect(() => audio.resume()).not.toThrow();
    await flushMusic();
    expect(audio.ready).toBe(true);
    expect(audio.menuMusicState).toBe('unavailable');
    expect(media.play).not.toHaveBeenCalled();
    expect(media.removeAttribute).toHaveBeenCalledWith('src');
    expect(ctx.gains[9]!.disconnect).toHaveBeenCalledTimes(1);
    expect(ctx.sources).toHaveLength(4);
    audio.dispose();
    expect(ctx.gains[9]!.disconnect).toHaveBeenCalledTimes(1);
  });
});

describe('read-only native menu score playback snapshot', () => {
  it('remains inert before gesture/media creation and follows native time through a loop without a second clock', async () => {
    const { audio, ctx, media, makeMedia } = musicFixture();
    audio.setMenuActive(true);
    for (let i = 0; i < 10; i++) expect(audio.menuMusicPlayback).toEqual({ time: 0, duration: 0, playing: false, gain: 0 });
    expect(makeMedia).not.toHaveBeenCalled();
    audio.resume();
    await flushMusic();
    const nodes = ctx.nodes.length;
    media.currentTime = 107.123456;
    ctx.currentTime = 10000;
    expect(audio.menuMusicPlayback).toEqual({ time: 107.123456, duration: 214.2, playing: true, gain: 0.8 * 0.55 * 0.8 });
    for (let i = 0; i < 100; i++) audio.update(1 / 60, environment({ time: i * 100 }));
    expect(audio.menuMusicPlayback.time).toBe(107.123456);
    media.currentTime = 0.017;
    expect(audio.menuMusicPlayback.time).toBe(0.017);
    expect(audio.menuMusicPlayback.playing).toBe(true);
    expect(ctx.nodes).toHaveLength(nodes);
    expect(media.play).toHaveBeenCalledTimes(1);
    audio.dispose();
    expect(audio.menuMusicPlayback).toEqual({ time: 0, duration: 0, playing: false, gain: 0 });
  });

  it('reports only audible menu playback through Master/Music, media controls and the running context', async () => {
    const { audio, ctx, media, settings } = musicFixture();
    audio.setMenuActive(true); audio.resume();
    await flushMusic();
    media.currentTime = 32.5;
    settings.volumes.master = 0.5;
    settings.volumes.music = 0.25;
    media.volume = 0.5;
    audio.applySettings();
    expect(audio.menuMusicPlayback.gain).toBeCloseTo(0.8 * 0.25 * 0.5 * 0.5);
    media.muted = true;
    expect(audio.menuMusicPlayback).toMatchObject({ time: 32.5, playing: false, gain: 0 });
    media.muted = false;
    media.volume = 0;
    expect(audio.menuMusicPlayback.playing).toBe(false);
    media.volume = 1;
    ctx.state = 'suspended';
    expect(audio.menuMusicPlayback.playing).toBe(false);
    ctx.state = 'running';
    settings.volumes.music = 0;
    audio.applySettings();
    expect(audio.menuMusicPlayback).toMatchObject({ time: 32.5, playing: false, gain: 0 });
    settings.volumes.music = 0.25;
    audio.applySettings();
    await flushMusic();
    expect(audio.menuMusicPlayback.playing).toBe(true);
    audio.setPageHidden(true);
    expect(audio.menuMusicPlayback).toMatchObject({ time: 32.5, playing: false, gain: 0 });
    audio.setPageHidden(false);
    await flushMusic();
    expect(audio.menuMusicPlayback.playing).toBe(true);
    audio.setMenuActive(false);
    expect(audio.menuMusicPlayback).toMatchObject({ time: 32.5, playing: false, gain: 0 });
    audio.setMenuActive(true);
    expect(audio.menuMusicPlayback.playing).toBe(true);
    audio.dispose();
  });

  it('freezes visual playback while pending, buffering, paused, seeking, ended or errored without modifying stream position', async () => {
    const { audio, media } = musicFixture();
    let resolvePlay = () => {};
    media.play.mockImplementationOnce(() => new Promise<void>((resolve) => { resolvePlay = resolve; media.paused = false; }));
    audio.setMenuActive(true); audio.resume();
    media.currentTime = 8.25;
    expect(audio.menuMusicPlayback).toMatchObject({ time: 8.25, playing: false, gain: 0 });
    resolvePlay();
    await flushMusic();
    expect(audio.menuMusicPlayback.playing).toBe(true);
    media.emit('waiting');
    expect(audio.menuMusicPlayback).toMatchObject({ time: 8.25, playing: false, gain: 0 });
    media.emit('playing');
    expect(audio.menuMusicPlayback.playing).toBe(true);
    media.readyState = 2;
    expect(audio.menuMusicPlayback.playing).toBe(false);
    media.readyState = 4;
    for (const flag of ['paused', 'seeking', 'ended'] as const) {
      media[flag] = true;
      expect(audio.menuMusicPlayback).toMatchObject({ time: 8.25, playing: false, gain: 0 });
      media[flag] = false;
      expect(audio.menuMusicPlayback.playing).toBe(true);
    }
    media.error = { code: 3 };
    expect(audio.menuMusicPlayback.playing).toBe(false);
    media.error = null;
    expect(media.currentTime).toBe(8.25);
    expect(media.play).toHaveBeenCalledTimes(1);
    audio.dispose();
  });

  it('seeks the real menu stream for timing review without restarting or creating another source', async () => {
    const { audio, media, ctx } = musicFixture();
    expect(audio.seekMenuMusic(30)).toBe(false);
    audio.setMenuActive(true); audio.resume();
    await flushMusic();
    const nodeCount = ctx.nodes.length;
    expect(audio.seekMenuMusic(28)).toBe(true);
    expect(audio.menuMusicPlayback.time).toBe(28);
    expect(audio.seekMenuMusic(40)).toBe(true);
    expect(audio.menuMusicPlayback.time).toBe(40);
    expect(audio.seekMenuMusic(-1)).toBe(true);
    expect(media.currentTime).toBe(0);
    expect(audio.seekMenuMusic(1000)).toBe(true);
    expect(media.currentTime).toBeCloseTo(media.duration - 0.05);
    expect(audio.seekMenuMusic(NaN)).toBe(false);
    expect(media.play).toHaveBeenCalledTimes(1);
    expect(ctx.nodes).toHaveLength(nodeCount);
    audio.setMenuActive(false);
    expect(audio.seekMenuMusic(30)).toBe(false);
    audio.dispose();
    expect(audio.seekMenuMusic(30)).toBe(false);
  });

  it('keeps unknown/nonfinite metadata finite without replacing the native position with duration or animation time', async () => {
    const { audio, media } = musicFixture();
    audio.setMenuActive(true); audio.resume();
    await flushMusic();
    media.currentTime = 21.125;
    media.duration = NaN;
    expect(audio.menuMusicPlayback).toMatchObject({ time: 21.125, duration: 0 });
    media.duration = Infinity;
    expect(audio.menuMusicPlayback.duration).toBe(0);
    media.currentTime = NaN;
    expect(audio.menuMusicPlayback.time).toBe(0);
    media.currentTime = 21.125;
    media.duration = 214.2;
    expect(audio.menuMusicPlayback).toMatchObject({ time: 21.125, duration: 214.2 });
    audio.dispose();
  });
});
