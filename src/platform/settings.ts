export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'sprint'
  | 'jump'
  | 'interact'
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
  'forward', 'back', 'left', 'right', 'sprint', 'jump', 'interact', 'grab', 'throw', 'attack', 'heavy', 'block', 'dodge',
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

export function loadSettings(): Settings {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged: Settings = {
      ...base,
      ...parsed,
      volumes: { ...base.volumes, ...(parsed.volumes ?? {}) },
      bindings: { ...base.bindings, ...(parsed.bindings ?? {}) },
    };
    // A stored binding list may be sparse or hold stray values from an older build: keep only real strings.
    for (const a of ACTIONS) {
      const list = merged.bindings[a];
      merged.bindings[a] = Array.isArray(list) ? list.filter((c): c is string => typeof c === 'string' && c.length > 0) : [...DEFAULT_BINDINGS[a]];
    }
    merged.textScale = Math.max(0.8, Math.min(1.8, merged.textScale));
    merged.brightness = Math.max(0.6, Math.min(1.6, merged.brightness));
    merged.mouseSensitivity = Math.max(0.2, Math.min(3, merged.mouseSensitivity));
    // Only a real saved boolean expresses the player's inversion preference; stale strings must not invert the camera.
    merged.invertY = typeof parsed.invertY === 'boolean' ? parsed.invertY : base.invertY;
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
