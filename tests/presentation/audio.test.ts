import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../../src/platform/settings';
import { AudioEngine } from '../../src/presentation/audio';

afterEach(() => vi.unstubAllGlobals());

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
