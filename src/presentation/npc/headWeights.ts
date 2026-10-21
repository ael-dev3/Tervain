import type * as THREE from 'three';
import { RESIDENT_JOINTS, type ResidentRigData } from './residentRig';

/**
 * Head skin repair. Meshy's auto-rig weighted some faces to the shoulders: the fisher's nose, eyes and brow are two
 * thirds LeftShoulder/RightShoulder, so whenever a clip moved the shoulders and the head apart (mending, a stretch, a
 * look round) the face sheared off the skull into a spike, or folded down into the scarf, while the skeleton itself
 * stayed sound. The skull must move as one piece with the head joint.
 *
 * Every vertex in the head's column (around the line from the head joint to its face marker) above the jaw hands the
 * weight it gives to the neck and to joints outside the head over to the head joint, fully above `FULL` metres over the head
 * joint and fading to nothing at `FROM` (the jaw and beard, forward of the throat, from lower down), so a collar or scarf below the jaw still follows the shoulders and the throat
 * blends into the neck. Vertices outside the column (a basket, a raised hood's back) are untouched.
 */
const FROM = 0.02, FULL = 0.08;
/** Forward of this share of the way from the head joint to its face marker lies the jaw, whose ramp is this much lower. */
const JAW_FORWARD = 0.55, JAW_DROP = 0.05;
/** The column's radius about the middle of the head joint and the face marker, metres in the model. */
const COLUMN = 0.13;
/** The joints that move as the skull: the neck's share of the skull comes over too, as the shoulders' does. */
const HEAD_CHAIN = new Set(['Head', 'head_end', 'headfront']);

/** One result per rig: a rig is made for one model (its hash), so every actor's copy of that model has the same bind. */
const repaired = new WeakMap<ResidentRigData, ResidentRigData>();

/** The share of a vertex at bind position (x, y, z) that must follow the head joint whatever its rig weights say. */
export function headShare(data: Pick<ResidentRigData, 'bones'>, x: number, y: number, z: number): number {
  const head = data.bones[RESIDENT_JOINTS.indexOf('Head')]!.position, front = data.bones[RESIDENT_JOINTS.indexOf('headfront')]!.position;
  if (Math.hypot(x - (head[0] + front[0]) / 2, z - (head[2] + front[2]) / 2) > COLUMN) return 0;
  // The jaw and beard hang forward of the throat and lower: in the front of the column the ramp starts lower.
  const fx = front[0] - head[0], fz = front[2] - head[2], reach = Math.hypot(fx, fz) || 1;
  const forward = ((x - head[0]) * fx + (z - head[2]) * fz) / (reach * reach);
  const drop = forward > JAW_FORWARD ? JAW_DROP : 0;
  const t = Math.min(1, Math.max(0, (y - head[1] - FROM + drop) / (FULL - FROM)));
  return t * t * (3 - 2 * t);
}

/**
 * The rig with its skull weighted to the head (see above), for the prepared model's bind positions. Returns the same
 * data when nothing needed moving. The result is kept per rig, so every actor of a model shares it and what is keyed on
 * it (the finger plan, the skin attributes).
 */
export function repairHeadWeights(data: ResidentRigData, position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): ResidentRigData {
  const steps = repairHeadWeightsSteps(data, position);
  for (;;) { const next = steps.next(); if (next.done) return next.value; }
}

/** Repair the same skin in bounded scans so arriving residents cannot monopolise one frame. */
export function* repairHeadWeightsSteps(data: ResidentRigData, position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): Generator<void, ResidentRigData, void> {
  const known = repaired.get(data);
  if (known) return known;
  if (position.count !== data.vertices) throw new Error('A resident rig does not match its model.');
  const headIndex = RESIDENT_JOINTS.indexOf('Head');
  const chain = new Set(RESIDENT_JOINTS.flatMap((name, i) => HEAD_CHAIN.has(name) ? [i] : []));
  let joints: Uint8Array | null = null, weights: Uint8Array | null = null;
  const share = new Map<number, number>();
  for (let v = 0; v < data.vertices; v++) {
    if (v > 0 && v % 512 === 0) yield;
    const t = headShare(data, position.getX(v), position.getY(v), position.getZ(v));
    if (t <= 0) continue;
    let outside = 0;
    for (let s = 0; s < 4; s++) if (!chain.has(data.joints[v * 4 + s]!)) outside += data.weights[v * 4 + s]!;
    if (outside === 0) continue;
    // Move t of the weight outside the head chain onto the head joint, then keep the four heaviest and renormalise.
    share.clear();
    for (let s = 0; s < 4; s++) {
      const joint = data.joints[v * 4 + s]!, weight = data.weights[v * 4 + s]!;
      if (!weight) continue;
      share.set(joint, (share.get(joint) ?? 0) + (chain.has(joint) ? weight : weight * (1 - t)));
    }
    share.set(headIndex, (share.get(headIndex) ?? 0) + outside * t);
    const kept = [...share].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = kept.reduce((sum, [, w]) => sum + w, 0);
    const bytes = kept.map(([, w]) => Math.floor(w / total * 255));
    bytes[0]! += 255 - bytes.reduce((sum, w) => sum + w, 0);
    if (!joints || !weights) { joints = data.joints.slice(); weights = data.weights.slice(); }
    for (let s = 0; s < 4; s++) {
      joints[v * 4 + s] = kept[s]?.[0] ?? kept[0]![0];
      weights[v * 4 + s] = bytes[s] ?? 0;
    }
  }
  // Another caller may have completed this rig while this iterator was suspended.
  const completed = repaired.get(data);
  if (completed) return completed;
  const result = joints && weights ? { ...data, joints, weights } : data;
  repaired.set(data, result);
  return result;
}
