export interface FrameStep {
  /** Actual visible frame interval, for performance measurements. */
  interval: number;
  /** Bounded simulation interval. Hidden time is never accumulated. */
  dt: number;
}

/** RAF can still run in a background tab. Reset its baseline across visibility changes. */
export class FrameClock {
  private last: number | null = null;
  private hidden = false;

  setHidden(hidden: boolean) {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    this.last = null;
  }

  tick(now: number): FrameStep | null {
    if (this.hidden || !Number.isFinite(now)) {
      this.last = null;
      return null;
    }
    const previous = this.last;
    this.last = now;
    if (previous === null || now <= previous) return null;
    const interval = (now - previous) / 1000;
    return { interval, dt: Math.min(0.05, interval) };
  }
}
