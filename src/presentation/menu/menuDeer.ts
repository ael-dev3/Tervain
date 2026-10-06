import * as THREE from 'three';
import type { AnimalFigure } from '../animals';
import type { AnimalClip } from '../animals/catalog';
import type { GrassMover } from '../grass/trample';
import { menuHeight } from './menuLayout';

/**
 * A stag working its way across the heath at dusk. It comes in from beyond the standing stones, grazes a while, lifts
 * its head toward the camp, crosses the cart track and grazes again, then wanders off past the ancient tree; a little
 * later it comes round again. Its legs part the grass and lay it down, so a trail follows it through the heath and
 * slowly closes.
 *
 * Everything is a function of the menu clock alone (no state carried between frames), so reduced motion holds the stag
 * exactly where it stands and a rebuilt scene puts it back on the same path.
 */

export type DeerLeg =
  | { kind: 'walk'; to: readonly [number, number] }
  | { kind: 'graze' | 'alert' | 'idle'; seconds: number }
  /** Out of sight beyond the frame, before coming round again. */
  | { kind: 'away'; seconds: number };

/** Where it enters (out of view to the right) and what it does, in order. */
export const MENU_DEER_ROUTE: { start: readonly [number, number]; legs: readonly DeerLeg[] } = {
  start: [34, -16],
  legs: [
    { kind: 'walk', to: [13, -16] },
    { kind: 'graze', seconds: 9 },
    { kind: 'walk', to: [9.5, -19] },
    { kind: 'graze', seconds: 7 },
    { kind: 'alert', seconds: 2.6 },
    { kind: 'walk', to: [-2.5, -22.5] },
    { kind: 'graze', seconds: 9 },
    { kind: 'walk', to: [-8, -22] },
    { kind: 'idle', seconds: 3 },
    { kind: 'graze', seconds: 6 },
    { kind: 'walk', to: [-36, -15] },
    { kind: 'away', seconds: 18 },
  ],
};

/** An unhurried walk (m/s), how long it takes to reach that pace or stop, and how long a turn to a new heading takes. */
export const MENU_DEER_PACE = { speed: 1.0, ease: 1.1, turn: 1.4 } as const;

interface Span {
  t0: number;
  t1: number;
  kind: DeerLeg['kind'];
  from: readonly [number, number];
  to: readonly [number, number];
  /** Heading while walking this span, and the one it turns from. */
  yaw: number;
  fromYaw: number;
}

export interface DeerPose {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  kind: DeerLeg['kind'];
  /** Seconds into the current span. */
  into: number;
}

/** The route as timed spans, and how long one round takes. */
export function deerTimeline(route = MENU_DEER_ROUTE, pace = MENU_DEER_PACE): { spans: Span[]; period: number } {
  const spans: Span[] = [];
  let t = 0;
  let at = route.start;
  let yaw = 0;
  for (const leg of route.legs) {
    if (leg.kind === 'walk') {
      const dx = leg.to[0] - at[0], dz = leg.to[1] - at[1];
      const length = Math.hypot(dx, dz);
      // A trapezoid: speeding up and slowing down each cost half the ease time over a steady walk.
      const seconds = length / pace.speed + pace.ease;
      const heading = Math.atan2(dx, dz);
      spans.push({ t0: t, t1: t + seconds, kind: 'walk', from: at, to: leg.to, yaw: heading, fromYaw: spans.length ? yaw : heading });
      yaw = heading;
      at = leg.to;
      t += seconds;
    } else {
      spans.push({ t0: t, t1: t + leg.seconds, kind: leg.kind, from: at, to: at, yaw, fromYaw: yaw });
      t += leg.seconds;
    }
  }
  return { spans, period: t };
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Where the stag is and what it is doing at menu time t. */
export function deerPoseAt(t: number, timeline = deerTimeline(), pace = MENU_DEER_PACE, out: DeerPose = { x: 0, z: 0, yaw: 0, speed: 0, kind: 'idle', into: 0 }): DeerPose {
  const time = Number.isFinite(t) ? ((t % timeline.period) + timeline.period) % timeline.period : 0;
  const span = timeline.spans.find((s) => time < s.t1) ?? timeline.spans[timeline.spans.length - 1]!;
  const into = Math.max(0, time - span.t0), length = span.t1 - span.t0;
  out.kind = span.kind;
  out.into = into;
  if (span.kind !== 'walk') {
    out.x = span.from[0]; out.z = span.from[1]; out.yaw = span.yaw; out.speed = 0;
    return out;
  }
  // Distance along a trapezoidal speed profile: ease up to pace, hold it, ease down to a stop.
  const dist = Math.hypot(span.to[0] - span.from[0], span.to[1] - span.from[1]);
  const e = Math.min(pace.ease, length / 2), v = dist / Math.max(1e-6, length - e);
  let s: number, speed: number;
  if (into < e) { speed = v * (into / e); s = 0.5 * v * into * into / e; }
  else if (into > length - e) { const r = length - into; speed = v * (r / e); s = dist - 0.5 * v * r * r / e; }
  else { speed = v; s = 0.5 * v * e + v * (into - e); }
  const f = dist > 0 ? Math.min(1, Math.max(0, s / dist)) : 1;
  out.x = span.from[0] + (span.to[0] - span.from[0]) * f;
  out.z = span.from[1] + (span.to[1] - span.from[1]) * f;
  const turn = THREE.MathUtils.smootherstep(into, 0, pace.turn);
  out.yaw = span.fromYaw + wrapAngle(span.yaw - span.fromYaw) * turn;
  out.speed = speed;
  return out;
}

const CLIP: Record<DeerLeg['kind'], AnimalClip> = { walk: 'Walk', graze: 'Graze', alert: 'Alert', idle: 'Idle', away: 'Idle' };

export interface MenuDeer {
  readonly root: THREE.Group;
  /** Where its fore and hind legs are pressing through the heath now (none while it is away). */
  movers(out: GrassMover[]): void;
  update(t: number, step: number): void;
  readonly pose: Readonly<DeerPose>;
  dispose(): void;
}

export function buildMenuDeer(figure: AnimalFigure, opts: { shadows: boolean }): MenuDeer {
  const root = new THREE.Group();
  root.name = 'Menu_Heath_Deer';
  root.add(figure.scene);
  root.rotation.order = 'YXZ';
  figure.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = opts.shadows;
    mesh.receiveShadow = true;
  });
  const timeline = deerTimeline();
  const pose: DeerPose = { x: 0, z: 0, yaw: 0, speed: 0, kind: 'idle', into: 0 };
  // About a third of its length: where the fore and hind legs stand from the middle of the body.
  const reach = Math.max(0.35, Math.min(0.9, Math.max(figure.size.x, figure.size.z) * 0.32));
  let clip: AnimalClip | null = null;
  let lastT = Number.NaN;
  let disposed = false;
  const place = (t: number) => {
    deerPoseAt(t, timeline, MENU_DEER_PACE, pose);
    const fx = Math.sin(pose.yaw), fz = Math.cos(pose.yaw);
    const front = menuHeight(pose.x + fx * reach, pose.z + fz * reach), back = menuHeight(pose.x - fx * reach, pose.z - fz * reach);
    // Feet on the ground beneath it, the body pitched with the slope.
    root.position.set(pose.x, Math.min(front, back, menuHeight(pose.x, pose.z)) + 0.01, pose.z);
    root.rotation.set(-Math.atan2(front - back, reach * 2), pose.yaw, 0);
    root.visible = pose.kind !== 'away';
  };
  place(0);
  return {
    root,
    pose,
    movers(out) {
      if (!root.visible || disposed) return;
      const fx = Math.sin(pose.yaw), fz = Math.cos(pose.yaw);
      const vx = fx * pose.speed, vz = fz * pose.speed;
      // Grazing, it only shifts its feet; walking, it presses a lane through the grass.
      const weight = pose.kind === 'walk' ? 0.9 : 0.55;
      for (const k of [1, -1]) out.push({ x: pose.x + fx * reach * k, z: pose.z + fz * reach * k, radius: 0.48, weight, vx, vz });
    },
    update(t, step) {
      if (disposed || !Number.isFinite(t)) return;
      place(t);
      const want = CLIP[pose.kind];
      if (want !== clip && figure.animation.has(want)) { figure.animation.transition(want); clip = want; }
      // Repeating a time (a held frame) never advances its legs.
      const dt = Number.isFinite(lastT) && t > lastT ? Math.min(step, t - lastT) : 0;
      lastT = t;
      figure.animation.update(dt, pose.speed);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      figure.dispose();
    },
  };
}
