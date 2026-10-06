import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnimalAudio, animalCallMix, type AnimalCallEvent, type AnimalAudioListener } from '../../src/presentation/animalAudio';

afterEach(() => { vi.unstubAllGlobals(); });
const listener: AnimalAudioListener = { x: 0, y: 1, z: 0, heading: 0 };
const call = (id = 'wolf-1', extra: Partial<AnimalCallEvent> = {}): AnimalCallEvent => ({
  id, species: 'wolf', position: { x: 0, y: 1, z: 3 }, gain: 1, ...extra,
});

class Node {
  connect = vi.fn((next: Node) => next);
  disconnect = vi.fn();
}
class Gain extends Node { gain = { value: 1 }; }
class Pan extends Node { pan = { value: 0 }; }
class Source extends Node {
  buffer: unknown = null;
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
  decodeAudioData = vi.fn(async (_data: ArrayBuffer) => ({ duration: 2.5 } as AudioBuffer));
}

function manifest() {
  return { assets: ['bear', 'lion', 'tiger', 'wolf', 'cat', 'dog', 'boar', 'deer', 'stag'].flatMap((species) => [1, 2].map((variant) => ({
    id: `${species}-call-${variant}`, species, path: `public/assets/audio/animals/${species}-call-${variant}.mp3`, sha256: 'a'.repeat(64),
  }))) };
}

function fixture(assets: unknown = manifest()) {
  const ctx = new Context();
  const effects = new Node();
  const available = { value: true };
  const fetch = vi.fn(async (url: string, _options?: RequestInit) => url.endsWith('manifest.json')
    ? new Response(JSON.stringify(assets), { headers: { 'content-type': 'application/json' } })
    : new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } }));
  vi.stubGlobal('fetch', fetch);
  const audio = new AnimalAudio(ctx as unknown as AudioContext, effects as unknown as AudioNode,
    () => available.value);
  return { audio, ctx, effects, available, fetch };
}

async function flush() { await new Promise((resolve) => setTimeout(resolve, 0)); }

describe('animal spatial call mix', () => {
  it('attenuates distance in three dimensions, pans with camera heading, and culls distant or invalid calls', () => {
    expect(animalCallMix(call(), listener)).toEqual({ gain: 0.36, pan: 0, distance: 3 });
    expect(animalCallMix(call('near', { position: { x: -4, y: 1, z: 0 } }), listener).pan).toBe(1);
    expect(animalCallMix(call('left', { position: { x: 4, y: 1, z: 0 } }), listener).pan).toBe(-1);
    expect(animalCallMix(call('turn', { position: { x: 0, y: 1, z: 4 } }), { ...listener, heading: Math.PI / 2 }).pan).toBeCloseTo(1);
    expect(animalCallMix(call('far', { position: { x: 0, y: 1, z: 12 } }), listener).gain).toBeCloseTo(0.12);
    expect(animalCallMix(call('high', { position: { x: 0, y: 13, z: 0 } }), listener).gain).toBeCloseTo(0.12);
    expect(animalCallMix(call('edge', { position: { x: 0, y: 1, z: 38 } }), listener).gain).toBe(0);
    expect(animalCallMix(call('invalid', { position: { x: NaN, y: 1, z: 0 } }), listener).gain).toBe(0);
    expect(animalCallMix(call('muted', { gain: NaN }), listener).gain).toBe(0);
  });
});

describe('packaged animal audio lifetime', () => {
  it('does no fetching before active/unlocked playback and tolerates a pending generation manifest without missing-file requests', async () => {
    const { audio, available, fetch, ctx } = fixture({ assets: [] });
    audio.call(call(), listener);
    expect(fetch).not.toHaveBeenCalled();
    audio.setActive(true);
    available.value = false;
    audio.call(call(), listener);
    expect(fetch).not.toHaveBeenCalled();
    available.value = true;
    audio.call(call(), listener);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(audio.diagnostics.state).toBe('pending generation');
    ctx.currentTime = 8;
    audio.call(call(), listener);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(ctx.sources).toHaveLength(0);
    audio.dispose();
  });

  it('uses same-origin integrity-checked audio, two variants, the effects bus and one decode per recording', async () => {
    const { audio, ctx, effects, fetch } = fixture();
    audio.setActive(true);
    audio.call(call('wolf-a'), listener);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]![0]).toMatch(/assets\/audio\/animals\/wolf-call-1\.mp3$/);
    expect(fetch.mock.calls[1]![1]).toMatchObject({ integrity: expect.stringMatching(/^sha256-/) });
    expect(ctx.sources[0]!.buffer).toMatchObject({ duration: 2.5 });
    expect(ctx.gains[0]!.gain.value).toBe(0.36);
    expect(ctx.pans[0]!.connect).toHaveBeenCalledWith(effects);
    ctx.sources[0]!.onended?.();
    expect(audio.diagnostics.voices).toBe(0);
    audio.call(call('wolf-b'), listener);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1);
    audio.call(call('wolf-c', { variant: 1 }), listener);
    await flush();
    expect(fetch.mock.calls[2]![0]).toMatch(/wolf-call-2\.mp3$/);
    expect(audio.diagnostics.decoded).toBe(2);
    audio.dispose();
    expect(ctx.sources[0]!.disconnect).toHaveBeenCalledTimes(1);
    expect(ctx.sources.slice(1).every((source) => source.stop.mock.calls.length === 1)).toBe(true);
    expect([...ctx.sources, ...ctx.gains, ...ctx.pans].every((node) => node.disconnect.mock.calls.length === 1)).toBe(true);
    audio.dispose();
  });

  it('caps pending and live voices and suppresses repeated calls from one model through cooldown', async () => {
    const { audio, ctx, fetch } = fixture();
    audio.setActive(true);
    for (let id = 0; id < 12; id++) audio.call(call(`wolf-${id}`), listener);
    expect(audio.diagnostics.pending).toBe(4);
    await flush();
    expect(ctx.sources).toHaveLength(4);
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const source of ctx.sources) source.onended?.();
    audio.call(call('wolf-0'), listener);
    await flush();
    expect(ctx.sources).toHaveLength(4);
    ctx.currentTime = 7;
    audio.call(call('wolf-0'), listener);
    await flush();
    expect(ctx.sources).toHaveLength(5);
    audio.dispose();
  });

  it('stops calls on pause/hidden/mute and invalidates slow decoded events across a resume', async () => {
    const { audio, ctx, available } = fixture();
    audio.setActive(true);
    let finishDecode: (value: AudioBuffer) => void = () => {};
    ctx.decodeAudioData.mockImplementationOnce(() => new Promise((resolve) => { finishDecode = resolve; }));
    audio.call(call(), listener);
    await flush();
    audio.setActive(false);
    audio.setActive(true);
    finishDecode({ duration: 2.5 } as AudioBuffer);
    await flush();
    expect(ctx.sources).toHaveLength(0);
    ctx.currentTime = 8;
    audio.call(call(), listener);
    await flush();
    expect(ctx.sources).toHaveLength(1);
    available.value = false;
    audio.stop();
    expect(ctx.sources[0]!.stop).toHaveBeenCalledTimes(1);
    expect(audio.diagnostics.voices).toBe(0);
    audio.call(call('new'), listener);
    await flush();
    expect(ctx.sources).toHaveLength(1);
    audio.dispose();
  });

  it('rejects external/traversal manifest paths and avoids repeated failed fetches or unhandled decoders', async () => {
    const invalid = manifest();
    invalid.assets[0]!.path = 'https://example.com/external.mp3';
    invalid.assets[6]!.path = 'public/assets/audio/animals/../../secret.mp3';
    const { audio, ctx, fetch } = fixture(invalid);
    audio.setActive(true);
    audio.call(call(), listener);
    audio.call(call('bear', { species: 'bear' }), listener);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    ctx.decodeAudioData.mockRejectedValue(new Error('unsupported MP3'));
    audio.call(call('cat', { species: 'cat' }), listener);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);
    ctx.currentTime = 8;
    audio.call(call('cat', { species: 'cat' }), listener);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(ctx.sources).toHaveLength(0);
    audio.dispose();
  });

  it('aborts in-flight fetches on disposal and never starts a voice after disposal', async () => {
    const { audio, ctx, fetch } = fixture();
    const signals: AbortSignal[] = [];
    fetch.mockImplementationOnce(async (_url, options) => {
      signals.push(options!.signal!);
      return new Promise<Response>(() => {});
    });
    audio.setActive(true);
    audio.call(call(), listener);
    audio.dispose();
    expect(signals[0]!.aborted).toBe(true);
    audio.call(call('later'), listener);
    expect(ctx.sources).toHaveLength(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
