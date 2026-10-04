import { ACTIONS, type Action, type Settings } from './settings';

/**
 * Controls are game actions with keyboard/mouse and controller bindings (architecture.md).
 * Gameplay code asks about actions, never about devices.
 */

const PAD = {
  interact: 0,
  dodge: 1,
  attack: 2,
  heavy: 3,
  jump: 4,
  heal: 5,
  block: 6,
  sprint: 7,
  map: 8,
  pause: 9,
  journal: 12,
  inventory: 13,
} as const;

const PAD_ACTIONS: Partial<Record<Action, number>> = PAD;

export type Device = 'keyboard' | 'gamepad';

export class Input {
  private down = new Set<string>();
  private pressedCodes = new Set<string>();
  private padDown = new Set<number>();
  private padPressed = new Set<number>();
  private lookX = 0;
  private lookY = 0;
  private wheel = 0;
  device: Device = 'keyboard';
  gamepadConnected = false;
  /** Set by the UI while typing/rebinding so gameplay keys are ignored. */
  captureNext: ((code: string) => void) | null = null;
  /** True while menus, panels or dialogue are open: the browser keeps Tab, Space and the arrows for focus and buttons. */
  private menuOpen = false;
  get uiOpen() { return this.menuOpen; }
  set uiOpen(open: boolean) {
    if (open === this.menuOpen) return;
    this.reset();
    this.menuOpen = open;
  }
  /** Called when a pending rebind is cancelled (for example by a left click), so the UI can restore its label. */
  captureCancel: (() => void) | null = null;
  /** Set by the app when a click only exists to recapture the pointer; that click is not a gameplay press. */
  swallowClick = false;
  padAxes = { lx: 0, ly: 0, rx: 0, ry: 0 };
  private toggles: Partial<Record<Action, boolean>> = {};
  private toggledThisFrame = new Set<Action>();
  private blockedCodes = new Set<string>();
  private blockedPad = new Set<number>();
  private stickNeedsNeutral = false;
  /** Reported once per gamepad D-pad/stick menu step. */
  onNavigate: ((dx: number, dy: number) => void) | null = null;
  private navCooldown = 0;

  constructor(private target: HTMLElement, private getSettings: () => Settings) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('blur', this.releaseAll);
    window.addEventListener('contextmenu', (e) => {
      if (document.pointerLockElement || (e.target as HTMLElement)?.id === 'view') e.preventDefault();
    });
    window.addEventListener('gamepadconnected', () => {
      this.gamepadConnected = true;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadConnected = navigator.getGamepads?.().some((g) => g) ?? false;
      this.padDown.clear();
      this.padPressed.clear();
      this.padAxes = { lx: 0, ly: 0, rx: 0, ry: 0 };
      this.blockedPad.clear();
      this.toggles = {};
      if (!this.gamepadConnected) this.device = 'keyboard';
    });
  }

  private static readonly BLOCKED_DEFAULTS = new Set(['Tab', 'F5', 'F9', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

  private onKeyDown = (e: KeyboardEvent) => {
    this.device = 'keyboard';
    if (this.captureNext) {
      e.preventDefault();
      const cb = this.captureNext;
      this.captureNext = null;
      cb(e.code);
      return;
    }
    const tag = (e.target as HTMLElement | null)?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement | null)?.isContentEditable;
    if (typing && e.code !== 'Escape') return;
    // Space/Enter belong to a focused hotbar button's native activation, never a simultaneous world jump or attack.
    if (['Space', 'Enter', 'NumpadEnter'].includes(e.code) && (e.target as HTMLElement | null)?.closest?.('button, [role="button"]')) return;
    if (this.blockedCodes.has(e.code)) {
      if (e.repeat) return;
      this.blockedCodes.delete(e.code);
    }
    if (Input.BLOCKED_DEFAULTS.has(e.code) && !typing && !this.uiOpen) {
      const b = this.getSettings().bindings;
      if (ACTIONS.some((a) => b[a].includes(e.code))) e.preventDefault();
    }
    if (!e.repeat) this.pressedCodes.add(e.code);
    this.down.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
    this.blockedCodes.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent) => {
    this.device = 'keyboard';
    if (this.captureNext) {
      e.preventDefault();
      // A left click is how the player operates the interface, so it cancels a rebind instead of becoming the binding.
      if (e.button === 0) {
        this.captureNext = null;
        this.captureCancel?.();
        return;
      }
      const cb = this.captureNext;
      this.captureNext = null;
      cb(`Mouse${e.button}`);
      return;
    }
    if (this.uiOpen) return;
    if (this.swallowClick) {
      this.swallowClick = false;
      return;
    }
    // Only clicks that reach the 3D view count as gameplay input; UI panels handle their own clicks.
    const t = e.target as HTMLElement | null;
    if (t !== this.target && !this.locked) return;
    if (document.pointerLockElement && !this.locked) return;
    const code = `Mouse${e.button}`;
    this.down.add(code);
    this.pressedCodes.add(code);
  };

  private onMouseUp = (e: MouseEvent) => {
    this.down.delete(`Mouse${e.button}`);
    this.blockedCodes.delete(`Mouse${e.button}`);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.uiOpen || (document.pointerLockElement && !this.locked)) return;
    if (!this.locked && e.buttons === 0) return;
    if (this.locked || (e.buttons & 1) === 1) {
      const t = e.target as HTMLElement | null;
      if (!this.locked && t !== this.target) return;
      this.lookX += e.movementX;
      this.lookY += e.movementY;
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (this.uiOpen || (!this.locked && e.target !== this.target) || !Number.isFinite(e.deltaY)) return;
    const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    this.wheel += Math.max(-400, Math.min(400, pixels));
  };

  /** A modal transition, blur or hidden tab must discard buffered actions and wait for held buttons to release. */
  reset() {
    for (const code of this.down) this.blockedCodes.add(code);
    for (const button of this.padDown) this.blockedPad.add(button);
    this.down.clear();
    this.pressedCodes.clear();
    this.padDown.clear();
    this.padPressed.clear();
    this.toggles = {};
    this.toggledThisFrame.clear();
    this.padAxes = { lx: 0, ly: 0, rx: 0, ry: 0 };
    this.stickNeedsNeutral = true;
    this.lookX = this.lookY = this.wheel = 0;
    this.swallowClick = false;
    this.navCooldown = 0;
  }

  private releaseAll = () => this.reset();

  /** Poll the gamepad once per frame, before gameplay reads any action. */
  poll(dt: number) {
    const pads = navigator.getGamepads?.() ?? [];
    let pad: Gamepad | null = null;
    for (const p of pads) if (p && p.connected) pad = p;
    this.padPressed.clear();
    if (!pad) {
      this.padAxes = { lx: 0, ly: 0, rx: 0, ry: 0 };
      this.padDown.clear();
      this.blockedPad.clear();
      this.gamepadConnected = false;
      return;
    }
    this.gamepadConnected = true;
    const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
    this.padAxes = { lx: dz(pad.axes[0] ?? 0), ly: dz(pad.axes[1] ?? 0), rx: dz(pad.axes[2] ?? 0), ry: dz(pad.axes[3] ?? 0) };
    if (this.stickNeedsNeutral) {
      if (Object.values(this.padAxes).every((axis) => axis === 0)) this.stickNeedsNeutral = false;
      else this.padAxes = { lx: 0, ly: 0, rx: 0, ry: 0 };
    }
    const now = new Set<number>();
    pad.buttons.forEach((b, i) => {
      if (b.pressed || b.value > 0.6) now.add(i);
    });
    for (const i of this.blockedPad) if (!now.has(i)) this.blockedPad.delete(i);
    for (const i of this.blockedPad) now.delete(i);
    for (const i of now) if (!this.padDown.has(i)) this.padPressed.add(i);
    this.padDown = now;
    if (now.size > 0 || Math.abs(this.padAxes.lx) + Math.abs(this.padAxes.ly) + Math.abs(this.padAxes.rx) > 0.4) this.device = 'gamepad';

    // Menu navigation from D-pad or left stick.
    this.navCooldown -= dt;
    if (this.uiOpen && this.onNavigate) {
      let dx = 0;
      let dy = 0;
      if (now.has(14)) dx = -1;
      else if (now.has(15)) dx = 1;
      if (now.has(12)) dy = -1;
      else if (now.has(13)) dy = 1;
      if (dx === 0 && dy === 0) {
        if (Math.abs(this.padAxes.ly) > 0.6) dy = Math.sign(this.padAxes.ly);
        else if (Math.abs(this.padAxes.lx) > 0.6) dx = Math.sign(this.padAxes.lx);
      }
      if ((dx !== 0 || dy !== 0) && this.navCooldown <= 0) {
        this.navCooldown = 0.18;
        this.onNavigate(dx, dy);
      }
    }
  }

  private codesFor(a: Action): string[] {
    return this.getSettings().bindings[a];
  }

  isDown(a: Action): boolean {
    if (this.codesFor(a).some((c) => this.down.has(c))) return true;
    const b = PAD_ACTIONS[a];
    if (b !== undefined && this.padDown.has(b)) return true;
    return false;
  }

  /** Edge-triggered: true once per press. */
  pressed(a: Action): boolean {
    if (this.codesFor(a).some((c) => this.pressedCodes.has(c))) return true;
    const b = PAD_ACTIONS[a];
    return b !== undefined && this.padPressed.has(b);
  }

  pressedKey(code: string): boolean {
    return this.pressedCodes.has(code);
  }

  padButtonPressed(i: number): boolean {
    return this.padPressed.has(i);
  }

  /** Held state honouring the hold/toggle preference for sprint and block. */
  held(a: Action): boolean {
    const s = this.getSettings();
    const toggle = (a === 'sprint' && s.toggleSprint) || (a === 'block' && s.toggleBlock);
    if (!toggle) return this.isDown(a);
    if (this.pressed(a) && !this.toggledThisFrame.has(a)) {
      this.toggles[a] = !this.toggles[a];
      this.toggledThisFrame.add(a);
    }
    return this.toggles[a] === true;
  }

  clearToggle(a: Action) {
    this.toggles[a] = false;
  }

  /** Movement vector: x right, y forward; length ≤ 1. */
  move(): { x: number; y: number } {
    if (this.uiOpen) return { x: 0, y: 0 };
    let x = 0;
    let y = 0;
    if (this.isDown('right')) x += 1;
    if (this.isDown('left')) x -= 1;
    if (this.isDown('forward')) y += 1;
    if (this.isDown('back')) y -= 1;
    x += this.padAxes.lx;
    y -= this.padAxes.ly;
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y };
  }

  /** Camera input in radians for this frame. */
  look(dt: number): { yaw: number; pitch: number } {
    if (this.uiOpen) return { yaw: 0, pitch: 0 };
    const s = this.getSettings();
    const mouse = 0.0022 * s.mouseSensitivity;
    let yaw = -this.lookX * mouse;
    // The rig's positive pitch lifts the boom and looks down at its pivot: screen-down input must add pitch.
    // Yaw uses the opposite sign because this world's forward direction is +Z (screen-right is -X at yaw zero).
    let pitch = this.lookY * mouse * (s.invertY ? -1 : 1);
    const stick = 2.6 * s.mouseSensitivity * dt;
    yaw -= this.padAxes.rx * stick;
    pitch += this.padAxes.ry * stick * (s.invertY ? -1 : 1);
    const key = 1.9 * dt;
    if (this.isDown('camLeft')) yaw += key;
    if (this.isDown('camRight')) yaw -= key;
    return { yaw, pitch };
  }

  zoom(): number {
    return this.uiOpen ? 0 : this.wheel;
  }

  /** Drop this frame's button presses so a press that closed a menu does not also act in the world. */
  consumePad() {
    this.padPressed.clear();
    this.pressedCodes.clear();
  }

  /** Whether the pressed action was caused by a device other than keyboard (for prompt glyphs). */
  label(a: Action, codeLabel: (c: string) => string): string {
    if (this.device === 'gamepad') {
      const b = PAD_ACTIONS[a];
      const names: Record<number, string> = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'Back', 9: 'Start', 12: 'D-pad ↑', 13: 'D-pad ↓' };
      if (b !== undefined) return names[b] ?? `Button ${b}`;
    }
    const c = this.codesFor(a)[0];
    return c ? codeLabel(c) : '—';
  }

  /** Call once at the end of every frame. */
  endFrame() {
    this.pressedCodes.clear();
    this.lookX = 0;
    this.lookY = 0;
    this.wheel = 0;
    this.toggledThisFrame.clear();
  }

  requestPointerLock() {
    try {
      const p = this.target.requestPointerLock?.() as unknown;
      if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => undefined);
    } catch {
      /* pointer lock refused; drag-to-look still works */
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  get locked() {
    return document.pointerLockElement === this.target;
  }
}
