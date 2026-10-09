import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BINDINGS, assignSlot, cancelsCapture, defaultSettings, loadSettings, resetToDefaults, saveSettings } from '../../src/platform/settings';

afterEach(() => vi.unstubAllGlobals());

function storage(value: unknown) {
  let stored = JSON.stringify(value);
  vi.stubGlobal('localStorage', { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } });
  return () => stored;
}

describe('persisted desktop settings', () => {
  it('rejects foreign quality presets and malformed numeric controls instead of breaking a rebuild or emitting NaN styles', () => {
    storage({ quality: 'ultra', textScale: 'large', brightness: null, mouseSensitivity: { value: 2 } });
    const loaded = loadSettings(), defaults = defaultSettings();
    expect(loaded.quality).toBe('high');
    expect(loaded.textScale).toBe(defaults.textScale);
    expect(loaded.brightness).toBe(defaults.brightness);
    expect(loaded.mouseSensitivity).toBe(defaults.mouseSensitivity);
    storage({ quality: 'low', textScale: 99, brightness: -4, mouseSensitivity: 8 });
    expect(loadSettings()).toMatchObject({ quality: 'low', textScale: 1.8, brightness: 0.6, mouseSensitivity: 3 });
  });

  it('preserves real false/true preferences without treating old string booleans as motion or sprint choices', () => {
    storage({ reducedMotion: 'false', toggleSprint: 'false', toggleBlock: 1, highContrast: [], captions: false, invertY: true, guidance: false });
    expect(loadSettings()).toMatchObject({ reducedMotion: defaultSettings().reducedMotion, toggleSprint: false, toggleBlock: false,
      highContrast: false, captions: false, invertY: true, guidance: false });
    storage({ reducedMotion: true, toggleSprint: true, toggleBlock: true, highContrast: true });
    expect(loadSettings()).toMatchObject({ reducedMotion: true, toggleSprint: true, toggleBlock: true, highContrast: true });
  });

  it('keeps saved mute levels, bounds the real buses and recovers malformed nested values independently', () => {
    storage({ volumes: { master: 0, music: 5, effects: -1, ambience: 'quiet', dialogue: null } });
    const defaults = defaultSettings();
    expect(loadSettings().volumes).toEqual({ master: 0, music: 1, effects: 0, ambience: defaults.volumes.ambience, dialogue: defaults.volumes.dialogue });
    storage({ volumes: ['foreign'], bindings: 'foreign' });
    expect(loadSettings().volumes).toEqual(defaults.volumes);
    expect(loadSettings().bindings).toEqual(DEFAULT_BINDINGS);
  });

  it('preserves unbound actions and valid alternate keys while removing duplicate, sparse and foreign binding values', () => {
    storage({ bindings: { forward: ['KeyW', null, 3, 'KeyW', 'ArrowUp', '', 'Key W', 'x'.repeat(100)], jump: [], sprint: null } });
    const loaded = loadSettings();
    expect(loaded.bindings.forward).toEqual(['KeyW', 'ArrowUp']);
    expect(loaded.bindings.jump).toEqual([]);
    expect(loaded.bindings.sprint).toEqual(DEFAULT_BINDINGS.sprint);
    loaded.bindings.sprint.push('ShiftRight');
    expect(DEFAULT_BINDINGS.sprint).toEqual(['ShiftLeft']);
  });

  it('round-trips legitimate player preferences and falls back safely from non-object historical roots', () => {
    const contents = storage({});
    const settings = defaultSettings();
    settings.quality = 'medium'; settings.volumes.music = 0; settings.toggleSprint = true; settings.bindings.jump = ['KeyV'];
    saveSettings(settings);
    expect(JSON.parse(contents())).toEqual(settings);
    expect(loadSettings()).toEqual(settings);
    for (const value of [null, 14, 'old preferences', []]) {
      storage(value);
      expect(loadSettings()).toEqual(defaultSettings());
    }
  });
});

describe('settings panel rebinding (A71)', () => {
  it('rebinding a slot to the key in its other slot keeps one copy instead of "W / W"', () => {
    const b = defaultSettings().bindings;
    b.forward = ['KeyW', 'ArrowUp'];
    assignSlot(b, 'forward', 1, 'KeyW');
    expect(b.forward).toEqual(['KeyW']);
    assignSlot(b, 'forward', 1, 'ArrowUp');
    expect(b.forward).toEqual(['KeyW', 'ArrowUp']);
  });
  it('lets Escape be bound back to pause while it still cancels every other rebind', () => {
    expect(cancelsCapture('pause', 'Escape')).toBe(false);
    expect(cancelsCapture('forward', 'Escape')).toBe(true);
    expect(cancelsCapture('forward', 'KeyP')).toBe(false);
  });
  it('Reset to defaults asks for a world rebuild only when the quality actually changes', () => {
    const st = defaultSettings();
    st.bindings.pause = ['KeyP'];
    expect(resetToDefaults(st)).toBe(false);
    expect(st.bindings.pause).toEqual(['Escape']);
    st.quality = 'low';
    expect(resetToDefaults(st)).toBe(true);
    expect(st.quality).toBe('high');
  });
});
