import * as THREE from 'three';

/**
 * The fixed simulation step, and the most of a slow frame that is caught up (A72). The world always advances in steps
 * of exactly SIM_STEP, as many as the frame's time holds, the remainder carried to the next frame. A frame up to
 * SIM_CATCH_UP long is simulated whole, so the world keeps its own time down to about 7 frames a second; a longer stall
 * advances it by SIM_CATCH_UP only, and is never replayed.
 */
export const SIM_STEP = 1 / 60, SIM_CATCH_UP = 0.15;
/** The most steps one frame runs: a stall's worth. */
export const SIM_MAX_STEPS = Math.round(SIM_CATCH_UP / SIM_STEP);

export interface FrameStep {
  /** Actual visible frame interval, for performance measurements. */
  interval: number;
  /** The time simulated this frame: steps × SIM_STEP. Hidden time is never accumulated. */
  dt: number;
  /** How many fixed steps of SIM_STEP run this frame (0 on a fast display between steps). */
  steps: number;
  /** How far the picture is between the last two steps, 0..1: the carried remainder over SIM_STEP. */
  alpha: number;
}

/** RAF can still run in a background tab. Reset its baseline across visibility changes. */
export class FrameClock {
  private last: number | null = null;
  private hidden = false;
  private carry = 0;
  private fresh = false;

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
    if (previous === null || now <= previous) {
      // A new baseline starts half a step in, so a steady display stays clear of a step boundary; the first frame after
      // it always simulates a step, so nothing is drawn unstepped.
      this.carry = SIM_STEP / 2;
      this.fresh = true;
      return null;
    }
    const interval = (now - previous) / 1000;
    this.carry += Math.min(SIM_CATCH_UP, interval);
    const steps = Math.max(this.fresh ? 1 : 0, Math.min(SIM_MAX_STEPS, Math.floor(this.carry / SIM_STEP + 1e-9)));
    this.fresh = false;
    this.carry = Math.min(SIM_STEP, Math.max(0, this.carry - steps * SIM_STEP));
    // A remainder within rounding of a whole step stays just under it.
    const alpha = Math.min(1, this.carry / SIM_STEP);
    return { interval, dt: steps * SIM_STEP, steps, alpha };
  }
}

interface Motion {
  prev: THREE.Vector3; prevQ: THREE.Quaternion;
  cur: THREE.Vector3; curQ: THREE.Quaternion;
  step: number;
}

/**
 * Interpolated rendering over a fixed-step simulation (A72). After every step the moving objects' transforms are
 * recorded; just before a draw each is placed between its last two recorded transforms by the frame's alpha, and put
 * back afterwards, so gameplay only ever sees its own stepped state. A skinned rig keeps its latest pose; only its root
 * moves between. An object moved outside a step (a respawn, a load), new this step, or jumping further than a stride
 * is drawn where it is.
 */
export class MotionInterpolation {
  private readonly motions = new Map<THREE.Object3D, Motion>();
  private applied: THREE.Object3D[] = [];
  private lastStep = -1;
  static readonly JUMP = 4;

  /** Record the transforms at the end of simulation step `step` (a counter that rises by one each step). */
  capture(step: number, objects: Iterable<THREE.Object3D | null | undefined>) {
    for (const object of objects) {
      if (!object) continue;
      let m = this.motions.get(object);
      if (!m) {
        m = { prev: object.position.clone(), prevQ: object.quaternion.clone(), cur: object.position.clone(), curQ: object.quaternion.clone(), step };
        this.motions.set(object, m);
        continue;
      }
      if (m.step === step - 1 && m.cur.distanceTo(object.position) <= MotionInterpolation.JUMP) {
        m.prev.copy(m.cur); m.prevQ.copy(m.curQ);
      } else {
        m.prev.copy(object.position); m.prevQ.copy(object.quaternion);
      }
      m.cur.copy(object.position); m.curQ.copy(object.quaternion);
      m.step = step;
    }
    for (const [object, m] of this.motions) if (m.step !== step) this.motions.delete(object);
    this.lastStep = step;
  }

  /** Place the recorded objects `alpha` of the way from their previous to their latest step. Call restore() after. */
  apply(alpha: number, step: number) {
    this.restore();
    if (step !== this.lastStep) return;
    const a = Math.min(1, Math.max(0, alpha));
    for (const [object, m] of this.motions) {
      if (!object.position.equals(m.cur) || !object.quaternion.equals(m.curQ)) continue;
      object.position.lerpVectors(m.prev, m.cur, a);
      object.quaternion.slerpQuaternions(m.prevQ, m.curQ, a);
      if ((object as THREE.Camera).isCamera) object.updateMatrixWorld();
      this.applied.push(object);
    }
  }

  /** Put every interpolated object back on its simulated transform. */
  restore() {
    for (const object of this.applied) {
      const m = this.motions.get(object);
      if (!m) continue;
      object.position.copy(m.cur); object.quaternion.copy(m.curQ);
      if ((object as THREE.Camera).isCamera) object.updateMatrixWorld();
    }
    this.applied = [];
  }

  clear() { this.restore(); this.motions.clear(); this.lastStep = -1; }
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
