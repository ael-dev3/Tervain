import * as THREE from 'three';
import { expect, it } from 'vitest';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { installResidentRig, residentRestPose } from '../../src/presentation/npc/residentRig';
import { measureSeatSteps, residentMotionLibrary, retargetClip } from '../../src/presentation/npc/residentMotion';
import { loadResident, loadResidentMotion, loadResidentRigData, residentMesh } from './residentFixtures';

it.each([
  ['rillford-reeve', { x: 0.18868835658777713, y: 0.41916618318649707, z: -0.22401437761464826 }],
  ['ash-recorder', { x: 0.11559099063384444, y: 0.361485429022814, z: -0.181650917535566 }],
] as const)('prepares %s seat contacts in bounded steps without moving the measured seat', async (id, expected) => {
  const { source } = await loadResident(id), data = await loadResidentRigData(id);
  const scene = clone(source.scene), mesh = residentMesh(scene);
  mesh.geometry = mesh.geometry.clone();
  const installed = installResidentRig(mesh, data), rest = residentRestPose(installed.bones);
  const library = residentMotionLibrary(await loadResidentMotion());
  const clip = retargetClip(library.clips.get('sit.idle.m')!, library.rest, rest);
  let reads = 0, largest = 0, turns = 0;
  const weights = new Proxy(data.weights, {
    get(target, key) {
      if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
      return Reflect.get(target, key, target);
    },
  });
  const steps = measureSeatSteps(clip, rest, { ...data, weights }, mesh.geometry.getAttribute('position') as THREE.BufferAttribute);
  try {
    for (;;) {
      reads = 0;
      const next = steps.next();
      largest = Math.max(largest, reads);
      turns++;
      if (next.done) {
        expect(next.value.x).toBeCloseTo(expected.x, 8);
        expect(next.value.y).toBeCloseTo(expected.y, 8);
        expect(next.value.z).toBeCloseTo(expected.z, 8);
        break;
      }
    }
    // Candidate selection and CPU skinning must yield inside a sample, rather than after a whole surface.
    expect(largest).toBeLessThanOrEqual(512 * 4);
    expect(turns).toBeGreaterThan(20);
  } finally {
    steps.return({ x: 0, y: 0, z: 0 });
    mesh.geometry.dispose(); mesh.skeleton.dispose();
  }
}, 20_000);
