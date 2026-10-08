import * as THREE from 'three';
import { retargetClip, type ResidentMotionLibrary, type RestPose } from '../npc/residentMotion';
import { RESIDENT_JOINTS, type ResidentJoint } from '../npc/residentRig';
import type { HeroBoneName, HeroBones } from './bones';

/**
 * The wanderer's swimming (A65): the breaststroke and treading water from the residents' motion library, retargeted
 * onto his own skeleton. His rig matches the library's reference rig joint for joint under Mixamo names, with fingers
 * and a few auxiliary joints besides, which keep their own pose.
 */
export const HERO_SWIM_CLIPS = { stroke: 'swim.forward', tread: 'swim.idle' } as const;

/**
 * Where each clip is in its cycle when a stroke's pull ends (the hands at their widest), read from the clips: the
 * stroke clip holds two breaststrokes, widest at 24% and 73% of it; the treading clip one sculling cycle, widest at 22%.
 */
export const HERO_SWIM_CYCLE = { strokesPerLoop: 2, strokePull: 0.244, treadPull: 0.22 } as const;

/**
 * Cycles a second while treading water and while swimming at full pace: the authored strokes play somewhat brisker
 * than the clips' own pace (0.33 and 0.44 a second), the stroke about 0.7 a second at full speed.
 */
export const HERO_SWIM_RATE = { treadHz: 0.42, strokeHz: 0.58 } as const;

const HERO_JOINT: Record<ResidentJoint, HeroBoneName> = {
  Hips: 'mixamorig:Hips', Spine02: 'mixamorig:Spine', Spine01: 'mixamorig:Spine1', Spine: 'mixamorig:Spine2', neck: 'mixamorig:Neck',
  Head: 'mixamorig:Head', head_end: 'mixamorig:HeadTop_End', headfront: 'headfront',
  LeftShoulder: 'mixamorig:LeftShoulder', LeftArm: 'mixamorig:LeftArm', LeftForeArm: 'mixamorig:LeftForeArm', LeftHand: 'mixamorig:LeftHand',
  RightShoulder: 'mixamorig:RightShoulder', RightArm: 'mixamorig:RightArm', RightForeArm: 'mixamorig:RightForeArm', RightHand: 'mixamorig:RightHand',
  LeftUpLeg: 'mixamorig:LeftUpLeg', LeftLeg: 'mixamorig:LeftLeg', LeftFoot: 'mixamorig:LeftFoot', LeftToeBase: 'mixamorig:LeftToeBase',
  RightUpLeg: 'mixamorig:RightUpLeg', RightLeg: 'mixamorig:RightLeg', RightFoot: 'mixamorig:RightFoot', RightToeBase: 'mixamorig:RightToeBase',
};

export interface HeroSwimClips { stroke: THREE.AnimationClip; tread: THREE.AnimationClip }

/**
 * Bake the library's swim clips onto the wanderer's skeleton from its rest (each bone's local transform at bind). The
 * stroke loses its forward drift, since physics moves him; null if the library lacks either clip.
 */
export function heroSwimClips(library: ResidentMotionLibrary, bones: HeroBones,
  rest: ReadonlyMap<THREE.Bone, { position: THREE.Vector3; quaternion: THREE.Quaternion }>): HeroSwimClips | null {
  const stroke = library.clips.get(HERO_SWIM_CLIPS.stroke), tread = library.clips.get(HERO_SWIM_CLIPS.tread);
  if (!stroke || !tread) return null;
  const target: RestPose = new Map(RESIDENT_JOINTS.map((joint) => {
    const bind = rest.get(bones[HERO_JOINT[joint]])!;
    return [joint, { position: bind.position.clone(), quaternion: bind.quaternion.clone() }];
  }));
  const bake = (clip: THREE.AnimationClip, name: string, inPlace: boolean) => {
    const baked = retargetClip(clip, library.rest, target, inPlace).clip;
    const tracks = baked.tracks.map((track) => {
      const [joint, property] = track.name.split('.') as [ResidentJoint, string];
      const copy = track.clone();
      copy.name = `${bones[HERO_JOINT[joint]].name}.${property}`;
      return copy;
    });
    return new THREE.AnimationClip(name, baked.duration, tracks);
  };
  return { stroke: bake(stroke, 'SwimStroke', true), tread: bake(tread, 'SwimTread', false) };
}
