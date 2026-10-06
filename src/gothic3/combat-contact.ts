import * as THREE from 'three';

export interface NativeVisualContactTarget {
  readonly id: string;
  readonly name: string;
  readonly object: THREE.Object3D;
  readonly active: boolean;
}

export interface HeroFistContactCandidate {
  readonly id: string;
  readonly name: string;
  readonly distance: number;
  readonly handPosition: readonly [number, number, number];
  readonly source: 'browser:Hero_Right_Hand_Hand_1-vs-rendered-NPC-bounds';
}

/** Finds the closest rendered character bounds touched by the animated Hero
 * right-hand bone at the recovered native hit-window. This is browser contact
 * detection for the exported static NPC meshes; native collision/eligibility
 * and the live damage state are separate services. */
export function detectHeroFistContactCandidate(
  handBone: THREE.Object3D | null,
  targets: readonly NativeVisualContactTarget[],
  tolerance = 0.12,
): HeroFistContactCandidate | null {
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 0.5) {
    throw new RangeError('Hero contact tolerance must be finite and between zero and half a metre.');
  }
  if (!handBone) return null;
  handBone.updateWorldMatrix(true, false);
  const handPosition = handBone.getWorldPosition(new THREE.Vector3());
  const box = new THREE.Box3();
  let candidate: HeroFistContactCandidate | null = null;

  for (const target of targets) {
    if (!target.active || !target.id || !target.name || !target.object.visible) continue;
    target.object.updateWorldMatrix(true, true);
    box.setFromObject(target.object, true);
    if (box.isEmpty()) continue;
    const distance = box.distanceToPoint(handPosition);
    if (distance > tolerance || (candidate && (distance > candidate.distance ||
        (distance === candidate.distance && target.id.localeCompare(candidate.id) >= 0)))) continue;
    candidate = Object.freeze({ id: target.id, name: target.name, distance,
      handPosition: Object.freeze([handPosition.x, handPosition.y, handPosition.z]) as readonly [number, number, number],
      source: 'browser:Hero_Right_Hand_Hand_1-vs-rendered-NPC-bounds' });
  }
  return candidate;
}
