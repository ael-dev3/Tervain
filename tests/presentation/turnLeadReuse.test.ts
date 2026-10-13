import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { applyTurnLead, TurnLead } from '../../src/presentation/turnSteps';

function fixture() {
  const root = new THREE.Group();
  root.position.set(3, 1, -4); root.rotation.set(.1, .4, -.2); root.scale.set(.8, 1.1, 1.2);
  const bones = [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()];
  root.add(bones[0]!); bones[0]!.add(bones[1]!); bones[1]!.add(bones[2]!);
  bones.forEach((bone, i) => bone.position.set(.1 * i, .3, 0));
  const chain = bones.map((bone, i) => [bone, [.2, .35, .45][i]!] as const);
  return { root, bones, chain };
}

it('reuses turn pose records while preserving restore, edited-clip and fade-to-zero behavior', () => {
  const control = fixture(), actual = fixture(), controller = new TurnLead();
  const held = new Map<THREE.Bone, { before: THREE.Quaternion; after: THREE.Quaternion }>();
  const up = new THREE.Vector3(0, 1, 0), axis = new THREE.Vector3(1, 0, 0);
  const snapshot = (bones: THREE.Bone[], poses: typeof held) => bones.map(bone => ({
    quaternion: bone.quaternion.toArray(),
    before: poses.get(bone)?.before.toArray(), after: poses.get(bone)?.after.toArray(),
  }));
  const clones = vi.spyOn(THREE.Quaternion.prototype, 'clone');
  let beforeClones = 0, afterClones = 0;
  try {
    for (let frame = 0; frame < 30; frame++) {
      // Alternate authored edits and poses left as-is; both restoration paths must match the existing helper.
      if (frame % 2 === 0) for (let i = 0; i < 3; i++) {
        control.bones[i]!.quaternion.setFromAxisAngle(axis, .03 * (frame + i));
        actual.bones[i]!.quaternion.copy(control.bones[i]!.quaternion);
      }
      const lead = frame % 7 === 0 ? 0 : .2 * Math.sin(frame * .31);
      let start = clones.mock.calls.length;
      applyTurnLead(control.chain, lead, up, held); beforeClones += clones.mock.calls.length - start;
      start = clones.mock.calls.length;
      controller.lead = lead; controller.apply(actual.chain, up); afterClones += clones.mock.calls.length - start;
      expect(snapshot(actual.bones, controller.held)).toEqual(snapshot(control.bones, held));
      if (!lead) expect(controller.held.size).toBe(0);
    }
  } finally { clones.mockRestore(); }
  expect(beforeClones).toBe(25 * 6);
  expect(afterClones).toBe(6);
});
