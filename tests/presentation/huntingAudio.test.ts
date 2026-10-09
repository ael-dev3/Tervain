import { afterEach, describe, expect, it, vi } from 'vitest';
import { HuntingAudio, HUNTING_SOUND_KINDS, huntingSoundMix, type HuntingSoundKind } from '../../src/presentation/huntingAudio';
import type { HuntingAudioListener } from '../../src/presentation/huntingAudio';

afterEach(() => { vi.unstubAllGlobals(); });
const listener: HuntingAudioListener = { x: 0, y: 1, z: 0, heading: 0 };

class Node {
  connect = vi.fn((next: Node) => next);
  disconnect = vi.fn();
}
class Gain extends Node { gain = { value: 1 }; }
class Pan extends Node { pan = { value: 0 }; }
class Source extends Node {
  buffer: unknown = null;
  loop = false;
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}
class Context {
  currentTime = 0;
  sources: Source[] = [];
  gains: Gain[] = [];
  pans: Pan[] = [];
  createBufferSource = () => { const node = new Source(); this.sources.push(node); return node; };
  createGain = () => { const node = new Gain(); this.gains.push(node); return node; };
  createStereoPanner = () => { const node = new Pan(); this.pans.push(node); return node; };
  decodeAudioData = vi.fn(async (_data: ArrayBuffer) => ({ duration: 1.5 } as AudioBuffer));
}

function manifest() {
  return { assets: HUNTING_SOUND_KINDS.map((id) => ({ id, path: `public/assets/audio/hunting/${id}.mp3`, sha256: 'b'.repeat(64) })) };
}

function fixture(assets: unknown = manifest()) {
  const ctx = new Context();
  const effects = new Node();
  const available = { value: true };
  const fetch = vi.fn(async (url: string, _options?: RequestInit) => url.endsWith('manifest.json')
    ? new Response(JSON.stringify(assets), { headers: { 'content-type': 'application/json' } })
    : new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } }));
  vi.stubGlobal('fetch', fetch);
  const audio = new HuntingAudio(ctx as unknown as AudioContext, effects as unknown as AudioNode, () => available.value);
  return { audio, ctx, effects, available, fetch };
}
async function flush() { await new Promise((resolve) => setTimeout(resolve, 0)); }

describe('hunting mix', () => {
  it('centers handling sounds and pans/culls world contacts using the camera heading', () => {
    expect(huntingSoundMix()).toEqual({ gain: 0.36, pan: 0, distance: 0 });
    expect(huntingSoundMix({ x: -4, y: 1, z: 0 }, listener)).toEqual({ gain: 0.36, pan: 1, distance: 4 });
    expect(huntingSoundMix({ x: 0, y: 1, z: 12 }, listener).gain).toBeCloseTo(0.12);
    expect(huntingSoundMix({ x: 0, y: 1, z: 38 }, listener).gain).toBe(0);
    expect(huntingSoundMix({ x: NaN, y: 1, z: 0 }, listener).gain).toBe(0);
  });
});

describe('local hunting recordings', () => {
  it('waits for active, unlocked and audible playback without eager fetching', async () => {
    const { audio, fetch, available, ctx } = fixture({ assets: [] });
    audio.sound('bow_draw');
    audio.setActive(true);
    available.value = false;
    audio.sound('bow_draw');
    expect(fetch).not.toHaveBeenCalled();
    available.value = true;
    audio.sound('bow_draw');
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(audio.diagnostics.state).toBe('unavailable');
    ctx.currentTime = 2;
    audio.sound('bow_draw');
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(ctx.sources).toHaveLength(0);
    audio.dispose();
  });

  it('uses integrity-checked same-origin MP3s once per recording and routes them through Effects', async () => {
    const { audio, ctx, effects, fetch } = fixture();
    audio.setActive(true);
    audio.sound('bow_release', { x: -4, y: 1, z: 0 }, listener);
    await flush();
    expect(fetch.mock.calls[1]![0]).toMatch(/assets\/audio\/hunting\/bow_release\.mp3$/);
    expect(fetch.mock.calls[1]![1]).toMatchObject({ integrity: expect.stringMatching(/^sha256-/) });
    expect(ctx.pans[0]!.pan.value).toBe(1);
    expect(ctx.pans[0]!.connect).toHaveBeenCalledWith(effects);
    expect(ctx.sources[0]!.loop).toBe(false);
    ctx.sources[0]!.onended?.();
    expect(audio.diagnostics.voices).toBe(0);
    ctx.currentTime = 1;
    audio.sound('bow_release');
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1);
    audio.dispose();
    expect([...ctx.sources, ...ctx.gains, ...ctx.pans].every((node) => node.disconnect.mock.calls.length === 1)).toBe(true);
  });

  it('plays one skinning loop until selective cancellation and keeps other effects running', async () => {
    const { audio, ctx } = fixture();
    audio.setActive(true);
    audio.sound('skinning');
    audio.sound('bow_release');
    await flush();
    const loop = ctx.sources.find((source) => source.loop)!;
    const shot = ctx.sources.find((source) => !source.loop)!;
    expect(loop).toBeDefined();
    expect(audio.diagnostics.skinning).toBe(true);
    ctx.currentTime = 10;
    for (let i = 0; i < 100; i++) audio.sound('skinning');
    await flush();
    expect(ctx.sources).toHaveLength(2);
    audio.stop('skinning');
    expect(loop.stop).toHaveBeenCalledTimes(1);
    expect(shot.stop).not.toHaveBeenCalled();
    expect(audio.diagnostics).toMatchObject({ skinning: false, voices: 1 });
    audio.sound('skinning');
    await flush();
    expect(ctx.sources).toHaveLength(3);
    audio.dispose();
  });

  it('bounds pending/playing voices and blocks repeated draw/impact events', async () => {
    const { audio, ctx } = fixture();
    audio.setActive(true);
    for (let i = 0; i < 100; i++) for (const kind of HUNTING_SOUND_KINDS) audio.sound(kind);
    expect(audio.diagnostics.pending).toBe(6);
    await flush();
    expect(ctx.sources).toHaveLength(6);
    for (const source of ctx.sources) source.onended?.();
    audio.sound('bow_draw');
    await flush();
    expect(ctx.sources).toHaveLength(6);
    ctx.currentTime = 0.5;
    audio.sound('bow_draw');
    await flush();
    expect(ctx.sources).toHaveLength(7);
    audio.dispose();
  });

  it('cancels a pending skinning loop without canceling an independently decoded shot', async () => {
    const { audio, ctx } = fixture();
    let finishDecode: (value: AudioBuffer) => void = () => {};
    ctx.decodeAudioData.mockImplementationOnce(() => new Promise((resolve) => { finishDecode = resolve; }));
    audio.setActive(true);
    audio.sound('skinning');
    await flush();
    audio.sound('bow_release');
    audio.stop('skinning');
    finishDecode({ duration: 3 } as AudioBuffer);
    await flush();
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0]!.loop).toBe(false);
    expect(audio.diagnostics.pending).toBe(0);
    audio.dispose();
  });

  it('never resumes a canceled draw or old impact after pause or a slow decode', async () => {
    const { audio, ctx } = fixture();
    let finishDecode: (value: AudioBuffer) => void = () => {};
    ctx.decodeAudioData.mockImplementationOnce(() => new Promise((resolve) => { finishDecode = resolve; }));
    audio.setActive(true);
    audio.sound('bow_draw');
    await flush();
    audio.setActive(false);
    audio.setActive(true);
    finishDecode({ duration: 1.5 } as AudioBuffer);
    await flush();
    expect(ctx.sources).toHaveLength(0);
    ctx.decodeAudioData.mockImplementationOnce(() => new Promise((resolve) => { finishDecode = resolve; }));
    audio.sound('arrow_flesh');
    await flush();
    ctx.currentTime = 3;
    finishDecode({ duration: 0.8 } as AudioBuffer);
    await flush();
    expect(ctx.sources).toHaveLength(0);
    audio.dispose();
  });

  it('stops skinning on mute and aborts requests on disposal without replaying late results', async () => {
    const { audio, ctx, available, fetch } = fixture();
    audio.setActive(true);
    audio.sound('skinning');
    await flush();
    available.value = false;
    audio.stop();
    expect(ctx.sources[0]!.stop).toHaveBeenCalledTimes(1);
    audio.sound('skinning');
    expect(fetch).toHaveBeenCalledTimes(2);
    audio.dispose();
    audio.dispose();
    expect(ctx.sources[0]!.disconnect).toHaveBeenCalledTimes(1);
    const pending = fixture();
    const signals: AbortSignal[] = [];
    pending.fetch.mockImplementationOnce(async (_url, options) => {
      signals.push(options!.signal!);
      return new Promise<Response>(() => {});
    });
    pending.audio.setActive(true);
    pending.audio.sound('bow_draw');
    pending.audio.dispose();
    expect(signals[0]!.aborted).toBe(true);
    expect(pending.ctx.sources).toHaveLength(0);
  });

  it('rejects traversal/external manifests, invalid kinds and invalid decoded durations', async () => {
    const invalid = manifest();
    invalid.assets[0]!.path = 'https://example.com/bow_draw.mp3';
    invalid.assets[1]!.path = 'public/assets/audio/hunting/../../secret.mp3';
    const { audio, ctx, fetch } = fixture(invalid);
    audio.setActive(true);
    audio.sound('bow_draw');
    audio.sound('bow_release');
    audio.sound('unexpected' as HuntingSoundKind);
    audio.sound('arrow_ground', { x: NaN, y: 1, z: 0 }, listener);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    ctx.decodeAudioData.mockResolvedValueOnce({ duration: NaN } as AudioBuffer);
    audio.sound('arrow_flesh');
    await flush();
    ctx.currentTime = 1;
    audio.sound('arrow_flesh');
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(ctx.sources).toHaveLength(0);
    audio.dispose();
  });
});

describe('hunting load failures (A71)', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('retries a failed manifest or recording after a backoff instead of staying silent for the session', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { audio, ctx, fetch } = fixture();
    const real = fetch.getMockImplementation()!;
    fetch.mockImplementationOnce(async () => { throw new TypeError('network blip'); });
    audio.setActive(true);
    audio.sound('bow_draw');
    await flush();
    expect(audio.diagnostics.state).toBe('unavailable');
    ctx.currentTime += 10;
    audio.sound('bow_draw');
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 6_000);
    ctx.currentTime += 10;
    fetch.mockImplementation(async (url: string, options?: RequestInit) => url.endsWith('.mp3')
      ? new Response(null, { status: 503 }) : real(url, options));
    audio.sound('bow_draw');
    await flush();
    expect(audio.diagnostics.state).toBe('ready');
    expect(ctx.sources).toHaveLength(0);
    const calls = fetch.mock.calls.length;
    ctx.currentTime += 10;
    audio.sound('bow_draw');
    await flush();
    expect(fetch).toHaveBeenCalledTimes(calls);
    vi.setSystemTime(Date.now() + 6_000);
    ctx.currentTime += 10;
    fetch.mockImplementation(real);
    audio.sound('bow_draw');
    await flush();
    expect(ctx.sources).toHaveLength(1);
    audio.dispose();
  });
});
