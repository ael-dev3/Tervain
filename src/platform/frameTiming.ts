/**
 * The longest single simulation step, and the most of a slow frame that is caught up (A70). A frame up to SIM_CATCH_UP
 * long is simulated whole, in steps of at most SIM_STEP, so the world keeps its own time down to about 7 frames a
 * second; a longer stall advances it by SIM_CATCH_UP only, and is never replayed.
 */
export const SIM_STEP = 0.05, SIM_CATCH_UP = 0.15;

export interface FrameStep {
  /** Actual visible frame interval, for performance measurements. */
  interval: number;
  /** Bounded simulation interval. Hidden time is never accumulated. */
  dt: number;
  /** How many equal steps of at most SIM_STEP the interval is simulated in. */
  steps: number;
}

/** RAF can still run in a background tab. Reset its baseline across visibility changes. */
export class FrameClock {
  private last: number | null = null;
  private hidden = false;

  /** Loading may span many frames without advancing simulation. Start with a fresh baseline afterward. */
  reset() { this.last = null; }

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
    const dt = Math.min(SIM_CATCH_UP, interval);
    return { interval, dt, steps: Math.max(1, Math.ceil(dt / SIM_STEP - 1e-9)) };
  }
}

/**
 * The 60-frame cap's schedule (A71): whether a display refresh at `now` draws, and when the next frame is due. Frames
 * fall due every sixtieth of a second on their own schedule, so 120 Hz and 144 Hz displays average 60; 2 ms of allowance
 * keeps a jittery 60 Hz display at 60, and a frame more than 50 ms late restarts the schedule.
 */
export const CAPPED_FRAME = 1000 / 60;
export function cappedFrame(now: number, due: number): { draw: boolean; due: number } {
  if (now < due - 2) return { draw: false, due };
  return { draw: true, due: now - due > 50 ? now + CAPPED_FRAME : due + CAPPED_FRAME };
}
