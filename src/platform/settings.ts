export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'sprint'
  | 'jump'
  | 'interact'
  | 'skin'
  | 'grab'
  | 'throw'
  | 'attack'
  | 'heavy'
  | 'block'
  | 'dodge'
  | 'journal'
  | 'map'
  | 'inventory'
  | 'heal'
  | 'camLeft'
  | 'camRight'
  | 'quicksave'
  | 'quickload'
  | 'pause';

export const ACTIONS: Action[] = [
  'forward', 'back', 'left', 'right', 'sprint', 'jump', 'interact', 'skin', 'grab', 'throw', 'attack', 'heavy', 'block', 'dodge',
  'heal', 'journal', 'map', 'inventory', 'camLeft', 'camRight', 'quicksave', 'quickload', 'pause',
];

export type Bindings = Record<Action, string[]>;

export const DEFAULT_BINDINGS: Bindings = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft'],
  jump: ['Space'],
  interact: ['KeyE'],
  skin: ['KeyV'],
  grab: ['KeyF'],
  throw: ['KeyR'],
  attack: ['Mouse0', 'KeyJ'],
  heavy: ['KeyK'],
  block: ['Mouse2', 'KeyL'],
  dodge: ['KeyQ'],
  heal: ['KeyH'],
  journal: ['Tab'],
  map: ['KeyM'],
  inventory: ['KeyI'],
  camLeft: ['KeyZ'],
  camRight: ['KeyC'],
  quicksave: ['F5'],
  quickload: ['F9'],
  pause: ['Escape'],
};

export interface Settings {
  textScale: number;
  reducedMotion: boolean;
  highContrast: boolean;
  reduceEffects: boolean;
  brightness: number;
  quality: 'low' | 'medium' | 'high';
  guidance: boolean;
  showFps: boolean;
  barks: boolean;
  captions: boolean;
  mouseSensitivity: number;
  invertY: boolean;
  toggleSprint: boolean;
  toggleBlock: boolean;
  volumes: { master: number; music: number; effects: number; ambience: number; dialogue: number };
  bindings: Bindings;
}

export function defaultSettings(): Settings {
  let reduced = false;
  try {
    reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    reduced = false;
  }
  return {
    textScale: 1,
    reducedMotion: reduced,
    highContrast: false,
    reduceEffects: false,
    brightness: 1,
    quality: 'high',
    guidance: true,
    showFps: false,
    barks: true,
    captions: true,
    mouseSensitivity: 1,
    invertY: false,
    toggleSprint: false,
    toggleBlock: false,
    volumes: { master: 0.8, music: 0.55, effects: 0.8, ambience: 0.7, dialogue: 0.8 },
    bindings: structuredClone(DEFAULT_BINDINGS),
  };
}

const KEY = 'tervain:settings';

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown> : {};
const bounded = (value: unknown, fallback: number, min: number, max: number): number => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(min, Math.min(max, value)) : fallback;
const boolean = (value: unknown, fallback: boolean): boolean => typeof value === 'boolean' ? value : fallback;

export function loadSettings(): Settings {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = record(JSON.parse(raw));
    const volumes = record(parsed.volumes), bindings = record(parsed.bindings);
    const merged: Settings = {
      ...base,
      volumes: { ...base.volumes },
      bindings: { ...base.bindings },
    };
    // Local preferences are untrusted historical data. Invalid graphics presets must never reach a renderer rebuild,
    // and a string such as "false" must not enable toggled sprint or freeze menu motion through truthiness.
    merged.quality = parsed.quality === 'low' || parsed.quality === 'medium' || parsed.quality === 'high' ? parsed.quality : base.quality;
    merged.textScale = bounded(parsed.textScale, base.textScale, 0.8, 1.8);
    merged.brightness = bounded(parsed.brightness, base.brightness, 0.6, 1.6);
    merged.mouseSensitivity = bounded(parsed.mouseSensitivity, base.mouseSensitivity, 0.2, 3);
    const flags = ['reducedMotion', 'highContrast', 'reduceEffects', 'guidance', 'showFps', 'barks', 'captions', 'invertY', 'toggleSprint', 'toggleBlock'] as const;
    for (const flag of flags) merged[flag] = boolean(parsed[flag], base[flag]);
    for (const bus of ['master', 'music', 'effects', 'ambience', 'dialogue'] as const) merged.volumes[bus] = bounded(volumes[bus], base.volumes[bus], 0, 1);
    // Preserve deliberately empty actions and every real key, while rejecting sparse/foreign entries and duplicates.
    for (const a of ACTIONS) {
      const list = bindings[a];
      merged.bindings[a] = Array.isArray(list) ? [...new Set(list.filter((c): c is string => typeof c === 'string' && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(c)))] : [...DEFAULT_BINDINGS[a]];
    }
    return merged;
  } catch {
    return base;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable; settings apply for this session only */
  }
}

/** Human-readable label for a binding code. */
export function codeLabel(code: string | null | undefined): string {
  if (!code) return '—';
  if (code.startsWith('Mouse')) return ['Left click', 'Middle click', 'Right click'][Number(code.slice(5))] ?? code;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Shift', Escape: 'Esc', Tab: 'Tab', ArrowUp: '↑', ArrowDown: '↓',
    ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', ControlLeft: 'Ctrl', AltLeft: 'Alt', Backspace: 'Backspace',
  };
  return map[code] ?? code;
}

/** Find another action already using this code (for conflict feedback while rebinding). */
export function findConflict(b: Bindings, action: Action, code: string): Action | null {
  for (const a of ACTIONS) {
    if (a !== action && b[a].includes(code)) return a;
  }
  return null;
}
