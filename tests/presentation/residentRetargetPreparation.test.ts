import { expect, it } from 'vitest';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { installResidentRig, residentRestPose } from '../../src/presentation/npc/residentRig';
import { residentMotionLibrary, retargetClip, retargetClipSteps } from '../../src/presentation/npc/residentMotion';
import { loadResident, loadResidentMotion, loadResidentRigData, residentMesh } from './residentFixtures';

it.each([
  ['walk.quick', true, false],
  ['talk.chat', false, true],
  ['sit.idle.m', false, false],
] as const)('prepares %s over multiple turns with identical completed samples', async (name, inPlace, centre) => {
  const { source } = await loadResident('ash-recorder'), data = await loadResidentRigData('ash-recorder');
  const scene = clone(source.scene), mesh = residentMesh(scene);
  mesh.geometry = mesh.geometry.clone();
  const installed = installResidentRig(mesh, data), rest = residentRestPose(installed.bones);
  const library = residentMotionLibrary(await loadResidentMotion()), clip = library.clips.get(name)!;
  const expected = retargetClip(clip, library.rest, rest, inPlace, centre);
  const steps = retargetClipSteps(clip, library.rest, rest, inPlace, centre);
  let turns = 0;
  try {
    for (;;) {
      const next = steps.next(); turns++;
      if (!next.done) continue;
      expect(turns).toBeGreaterThan(2);
      expect(next.value.cycleMetres).toBe(expected.cycleMetres);
      expect(next.value.hipsDrop).toBe(expected.hipsDrop);
      expect(next.value.hipsAt).toEqual(expected.hipsAt);
      expect(next.value.clip.duration).toBe(expected.clip.duration);
      expect(next.value.clip.tracks.length).toBe(expected.clip.tracks.length);
      next.value.clip.tracks.forEach((track, index) => {
        const prior = expected.clip.tracks[index]!;
        expect(track.name).toBe(prior.name);
        expect(Array.from(track.times)).toEqual(Array.from(prior.times));
        expect(Array.from(track.values)).toEqual(Array.from(prior.values));
      });
      break;
    }
  } finally {
    steps.return(expected);
    mesh.geometry.dispose(); mesh.skeleton.dispose();
  }
}, 20_000);
