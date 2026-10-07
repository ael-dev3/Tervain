import * as THREE from 'three';
import type { BoneName } from '../human/skin';
import { weldExact } from './weld';

/**
 * The prepared residents share one generic joint layout: every elbow hangs straight below a shoulder at x = ±0.215 and
 * every knee straight below a hip at x = ±0.11, whatever the model. Their arms and legs do not: relaxed forearms angle
 * forward or back and most stances stand wide, so the real elbows sit 3–12 cm and the real knees up to 10 cm away from
 * the joints that bend them. A forearm or shin swinging round a point beside its own elbow or knee shears the joint.
 *
 * Each actor's private skeleton is refitted on load: elbows move to the arm's own centre at the elbow's height, found
 * from the shoulder–palm line and the arm surface around it; knees move onto the line from hip to the measured ankle.
 * Joint names, parents, identity axes, heights and the skin are unchanged; the inverse binds are recomputed, so the
 * figure is identical at rest and only bends where its own joints are.
 */
export const NPC_JOINT_FIT_PROFILE = 'resident-joint-fit-v1';

export interface NpcJointFit {
  profile: string;
  palmL: THREE.Vector3; palmR: THREE.Vector3;
  ankleL: THREE.Vector3; ankleR: THREE.Vector3;
  /** Horizontal distance each joint moved, metres. */
  moved: Partial<Record<BoneName, number>>;
}

interface SkinPoint { x: number; y: number; z: number; w: Partial<Record<BoneName, number>> }

/** Surface points of every skinned mesh in the scene's space with their joint weights by name (bind pose). */
export function bindSurface(scene: THREE.Object3D): SkinPoint[] {
  const points: SkinPoint[] = [], p = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  const toScene = new THREE.Matrix4().copy(scene.matrixWorld).invert();
  scene.traverse(object => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const position = mesh.geometry.getAttribute('position'), index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight');
    const names = mesh.skeleton.bones.map(bone => bone.name as BoneName);
    const toLocal = new THREE.Matrix4().multiplyMatrices(toScene, mesh.matrixWorld);
    for (const vertex of weldExact(position).first) {
      p.fromBufferAttribute(position, vertex).applyMatrix4(toLocal);
      const w: Partial<Record<BoneName, number>> = {};
      for (let slot = 0; slot < 4; slot++) {
        const amount = weight.getComponent(vertex, slot);
        if (amount > 0) { const name = names[index.getComponent(vertex, slot)]!; w[name] = (w[name] ?? 0) + amount; }
      }
      points.push({ x: p.x, y: p.y, z: p.z, w });
    }
  });
  return points;
}

/** Palm centre inferred from the lower tip of the source's actual elbow-weighted surface, with a bounded fallback for synthetic fixtures. */
export function measuredPalm(scene: THREE.Group, elbow: THREE.Bone, arm: THREE.Bone): THREE.Vector3 {
  const candidates: THREE.Vector3[] = [], point = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  scene.traverse(object => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const joint = mesh.skeleton.bones.indexOf(elbow), position = mesh.geometry.getAttribute('position');
    const indices = mesh.geometry.getAttribute('skinIndex'), weights = mesh.geometry.getAttribute('skinWeight');
    for (let vertex = 0; vertex < position.count; vertex++) {
      let weight = 0;
      for (let slot = 0; slot < 4; slot++) if (indices.getComponent(vertex, slot) === joint) weight += weights.getComponent(vertex, slot);
      if (weight < 0.6) continue;
      point.fromBufferAttribute(position, vertex); mesh.localToWorld(point); scene.worldToLocal(point);
      candidates.push(point.clone());
    }
  });
  const at = elbow.getWorldPosition(new THREE.Vector3()); scene.worldToLocal(at);
  const shoulder = arm.getWorldPosition(new THREE.Vector3()); scene.worldToLocal(shoulder);
  const fallback = at.clone().add(new THREE.Vector3(0.013, -Math.max(0.18, shoulder.y - at.y) - 0.035, 0.012));
  if (candidates.length < 12) return fallback;
  const bottom = Math.min(...candidates.map(candidate => candidate.y));
  const hand = candidates.filter(candidate => candidate.y <= bottom + 0.085);
  if (hand.length < 6 || bottom < at.y - 0.6 || bottom > at.y - 0.1) return fallback;
  const palm = hand.reduce((sum, candidate) => sum.add(candidate), new THREE.Vector3()).multiplyScalar(1 / hand.length);
  // The grasp lands above fingertips and near the centre of the glove, including chunky armour variants.
  palm.y = bottom + 0.065;
  return palm;
}

/** Mean shift in the horizontal plane over points in a height band: the centre of the densest nearby limb section. */
function meanShift(points: readonly SkinPoint[], start: THREE.Vector2, y: number, band: number, window: number, iterations = 8): THREE.Vector2 | null {
  const section = points.filter(point => Math.abs(point.y - y) < band);
  const centre = start.clone();
  let used = 0;
  for (let i = 0; i < iterations; i++) {
    let sx = 0, sz = 0;
    used = 0;
    for (const point of section) {
      if (Math.hypot(point.x - centre.x, point.z - centre.y) >= window) continue;
      sx += point.x; sz += point.z; used++;
    }
    if (used < 6) return null;
    centre.set(sx / used, sz / used);
  }
  return centre;
}

/**
 * Refit an actor's private skeleton to its own limbs. Call on a freshly cloned resident (bind pose, unscaled scene) before
 * anything measures sockets or skin from the joints; returns the measurements used.
 */
export function fitNpcJoints(scene: THREE.Group, bones: Record<BoneName, THREE.Bone>): NpcJointFit {
  const surface = bindSurface(scene);
  const at = (bone: THREE.Bone) => scene.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
  const moved: Partial<Record<BoneName, number>> = {};
  const fit: NpcJointFit = { profile: NPC_JOINT_FIT_PROFILE, palmL: new THREE.Vector3(), palmR: new THREE.Vector3(), ankleL: new THREE.Vector3(), ankleR: new THREE.Vector3(), moved };
  const place = (bone: THREE.Bone, target: THREE.Vector3) => {
    const parent = at(bone.parent as THREE.Bone);
    const before = at(bone);
    moved[bone.name as BoneName] = Math.hypot(target.x - before.x, target.z - before.z);
    // Identity axes: a child's local offset is its scene-space offset from the parent.
    bone.position.copy(target).sub(parent);
    bone.updateMatrixWorld(true);
  };
  for (const side of ['L', 'R'] as const) {
    const sign = side === 'L' ? 1 : -1;
    const arm = bones[`arm${side}`], elbow = bones[`elbow${side}`], leg = bones[`leg${side}`], knee = bones[`knee${side}`];
    // Elbow: on the shoulder–palm line at the elbow's height, drawn to the arm's own section there.
    const shoulder = at(arm), elbowAt = at(elbow);
    const palm = measuredPalm(scene, elbow, arm);
    fit[`palm${side}`] = palm;
    const t = THREE.MathUtils.clamp((shoulder.y - elbowAt.y) / Math.max(1e-3, shoulder.y - palm.y), 0, 1);
    const guess = new THREE.Vector2(shoulder.x + (palm.x - shoulder.x) * t, shoulder.z + (palm.z - shoulder.z) * t);
    const armPoints = surface.filter(point => (point.w[`arm${side}`] ?? 0) + (point.w[`elbow${side}`] ?? 0) > 0.5);
    const section = meanShift(armPoints, guess, elbowAt.y, 0.03, 0.055);
    const elbowXZ = section && section.distanceTo(guess) < 0.045 ? section : guess;
    place(elbow, new THREE.Vector3(elbowXZ.x, elbowAt.y, elbowXZ.y));
    // Knee: on the line from the hip joint to the ankle, the boot's centre just above the sole.
    const hip = at(leg), kneeAt = at(knee);
    const legPoints = surface.filter(point => point.x * sign > 0.01 && (point.w[`knee${side}`] ?? 0) > 0.5);
    const ankleXZ = meanShift(legPoints, new THREE.Vector2(hip.x + sign * 0.03, 0), 0.1, 0.05, 0.09);
    const ankle = ankleXZ && Math.abs(ankleXZ.x) > 0.05 && Math.abs(ankleXZ.x) < 0.3 && Math.abs(ankleXZ.y) < 0.15
      ? new THREE.Vector3(ankleXZ.x, 0.1, ankleXZ.y) : new THREE.Vector3(kneeAt.x, 0.1, kneeAt.z);
    fit[`ankle${side}`] = ankle;
    const s = (hip.y - kneeAt.y) / Math.max(1e-3, hip.y - ankle.y);
    place(knee, new THREE.Vector3(hip.x + (ankle.x - hip.x) * s, kneeAt.y, hip.z + (ankle.z - hip.z) * s));
  }
  scene.updateMatrixWorld(true);
  // The figure stays exactly as bound: each joint's inverse bind follows its new place.
  scene.traverse(object => {
    const mesh = object as THREE.SkinnedMesh;
    if (mesh.isSkinnedMesh) mesh.skeleton.calculateInverses();
  });
  return fit;
}
