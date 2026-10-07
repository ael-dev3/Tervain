import * as THREE from 'three';
import type { ArmAngles, Rig } from '../characters';

/**
 * Two-joint reach for a resident's arm: the shoulder's three turns and the elbow's bend that put the palm on a target,
 * with the elbow pointing towards a pole. Used on load to place gestures that touch the body (a hand on the hip, hands
 * clasped at the belt, crossed forearms) on each figure's own surfaces, rather than replaying angles written for one
 * figure. The answer is in the poser's own channels (Euler XYZ at the shoulder, x at the elbow).
 */
export interface ReachResult extends ArmAngles {
  /** How far the palm lands from the target (only when the target was out of reach). */
  miss: number;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();

/** Rotation about x applied to a vector (the elbow's single hinge in the upper arm's frame). */
function hinge(v: THREE.Vector3, angle: number): THREE.Vector3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return new THREE.Vector3(v.x, v.y * c - v.z * s, v.y * s + v.z * c);
}

/**
 * Solve one arm. `target` and `pole` are in the model's frame (the skeleton's parent, unscaled bind space) for the
 * rig's current pose (its matrices must be up to date); `palm` is the bind-pose palm centre in that frame
 * (npc/jointFit.ts). Joints keep identity axes at bind, so bind offsets add up along the chain.
 */
export function reachArm(rig: Rig, side: 0 | 1, target: THREE.Vector3, pole: THREE.Vector3, palm: THREE.Vector3): ReachResult {
  const arm = side === 0 ? rig.armL : rig.armR, elbow = side === 0 ? rig.elbowL! : rig.elbowR!;
  const torso = arm.parent!;
  const model = rig.hips.parent!;
  // Work in the torso's frame, where the shoulder's angles live.
  const toTorso = _m.copy(torso.matrixWorld).invert().multiply(model.matrixWorld);
  const t = target.clone().applyMatrix4(toTorso);
  const s = arm.position.clone();
  const poleDir = pole.clone().transformDirection(toTorso);
  // Bind directions in the upper arm's frame.
  const u0 = elbow.position.clone();
  const elbowBind = new THREE.Vector3();
  for (let node: THREE.Object3D | null = elbow; node && node !== model; node = node.parent) elbowBind.add(node.position);
  // The hips joint is posed by height; its bind height is the rig's hip height.
  elbowBind.y += rig.hipY - rig.hips.position.y;
  const f0 = palm.clone().sub(elbowBind);
  const upper = u0.length(), fore = f0.length();
  u0.normalize(); f0.normalize();
  // Triangle: shoulder, elbow, palm.
  const toTarget = t.clone().sub(s);
  let distance = toTarget.length();
  const reach = THREE.MathUtils.clamp(distance, Math.abs(upper - fore) + 0.01, upper + fore - 0.005);
  const miss = Math.abs(distance - reach);
  distance = reach;
  const along = toTarget.normalize();
  const cosShoulder = THREE.MathUtils.clamp((upper * upper + distance * distance - fore * fore) / (2 * upper * distance), -1, 1);
  const sideways = poleDir.clone().addScaledVector(along, -poleDir.dot(along));
  if (sideways.lengthSq() < 1e-8) sideways.set(0, 0, 1).addScaledVector(along, -along.z);
  sideways.normalize();
  const u1 = along.clone().multiplyScalar(cosShoulder).addScaledVector(sideways, Math.sqrt(1 - cosShoulder * cosShoulder)).normalize();
  const elbowAt = s.clone().addScaledVector(u1, upper);
  const f1 = s.clone().addScaledVector(along, distance).sub(elbowAt).normalize();
  // Elbow hinge: find the bend that opens the forearm to the triangle's angle from the upper arm, bending forward.
  const cosTarget = u1.dot(f1);
  const a = u0.x * f0.x, b = u0.y * f0.y + u0.z * f0.z, c = -u0.y * f0.z + u0.z * f0.y;
  const r = Math.hypot(b, c), delta = Math.atan2(c, b);
  const spread = Math.acos(THREE.MathUtils.clamp((cosTarget - a) / Math.max(1e-9, r), -1, 1));
  const candidates = [delta + spread, delta - spread].map(angle => THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI);
  // The forearm hinges forward (negative angle) from the hanging rest; never backwards through the elbow.
  const bend = candidates.filter(angle => angle <= 0.05).sort((p, q) => q - p)[0] ?? Math.min(...candidates);
  const fBent = hinge(f0, bend);
  // Shoulder: the rotation taking the bind pair (upper arm, bent forearm) onto the solved pair.
  const frame = (x: THREE.Vector3, y: THREE.Vector3) => {
    const yy = y.clone().addScaledVector(x, -y.dot(x));
    if (yy.lengthSq() < 1e-10) yy.copy(sideways).addScaledVector(x, -sideways.dot(x));
    yy.normalize();
    const zz = new THREE.Vector3().crossVectors(x, yy);
    return new THREE.Matrix4().makeBasis(x, yy, zz);
  };
  const from = frame(u0, fBent), to = frame(u1, f1);
  const rotation = to.multiply(from.transpose());
  _q.setFromRotationMatrix(rotation);
  _e.setFromQuaternion(_q, 'XYZ');
  return { x: _e.x, y: _e.y, z: _e.z, elbow: bend, miss };
}
