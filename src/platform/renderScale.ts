/**
 * Dynamic resolution (A113). The pixel ratio a quality preset asks for is a ceiling, not a promise: a Retina MacBook on
 * High draws four times a 1× screen's pixels with a fraction of a desktop card's power, and the game missed most of its
 * 60 Hz frames there. The scale watches the frames the display actually shows and lowers the drawing resolution while
 * they are being missed, then raises it again once they have been steady for a while.
 */
export const FRAME_BUDGET_MS = 1000 / 60;
/** A frame shown later than this missed its refresh. */
const MISSED_MS = FRAME_BUDGET_MS * 1.4;
/** Longer gaps are loading, a hidden tab or a breakpoint, not drawing cost. */
const IGNORED_MS = 250;
const RECENT = 90;
const STEADY = 600;
const DROP_SHARE = 0.1;
const RAISE_SHARE = 0.01;
const SETTLE_FRAMES = 90;
const DOWN = 0.15;
const UP = 0.1;

export class RenderScale {
  /** Multiplier on the preset's pixel ratio, in [floor, 1]. */
  scale = 1;
  private readonly missed = new Uint8Array(STEADY);
  private cursor = 0;
  private count = 0;
  private recentMissed = 0;
  private steadyMissed = 0;
  private settle = 0;

  /** `floor`: the lowest multiplier allowed for this screen (see renderScaleFloor). */
  constructor(public floor = 0.5) {}

  /** One shown frame's interval in milliseconds; true when the scale changed and the targets should be resized. */
  sample(intervalMs: number): boolean {
    if (!(intervalMs > 0) || intervalMs > IGNORED_MS) return false;
    if (this.settle > 0) { this.settle--; return false; }
    const missed = intervalMs > MISSED_MS ? 1 : 0;
    if (this.count >= RECENT) this.recentMissed -= this.missed[(this.cursor + STEADY - RECENT) % STEADY]!;
    if (this.count === STEADY) this.steadyMissed -= this.missed[this.cursor]!;
    this.missed[this.cursor] = missed;
    this.cursor = (this.cursor + 1) % STEADY;
    this.count = Math.min(STEADY, this.count + 1);
    this.recentMissed += missed;
    this.steadyMissed += missed;
    if (this.count >= RECENT && this.recentMissed / RECENT > DROP_SHARE && this.scale > this.floor) {
      this.scale = Math.max(this.floor, +(this.scale - DOWN).toFixed(3));
      return this.changed();
    }
    if (this.count >= STEADY && this.steadyMissed / STEADY < RAISE_SHARE && this.scale < 1) {
      this.scale = Math.min(1, +(this.scale + UP).toFixed(3));
      return this.changed();
    }
    return false;
  }

  reset() { this.scale = 1; this.clearWindow(); this.settle = 0; }

  private clearWindow() {
    this.missed.fill(0);
    this.cursor = this.count = this.recentMissed = this.steadyMissed = 0;
  }

  private changed(): boolean {
    // The frames around a resize are slow for their own reasons; judge the new size on fresh ones.
    this.clearWindow();
    this.settle = SETTLE_FRAMES;
    return true;
  }
}

/** Never below one drawn pixel per CSS pixel on a high-density screen, nor below 0.75 on an ordinary one. */
export function renderScaleFloor(presetRatio: number): number {
  return Math.min(1, Math.max(0.75, presetRatio * 0.5) / presetRatio);
}
