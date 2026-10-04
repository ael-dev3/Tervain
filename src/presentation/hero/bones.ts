import * as THREE from 'three';

/** Exact 66-joint owner-supplied Mixamo rig; GLTFLoader sanitizes colons in track targets. */
export const HERO_BONES = [
  'mixamorig:Hips',
  'mixamorig:Spine',
  'mixamorig:Spine1',
  'mixamorig:Spine2',
  'mixamorig:Neck',
  'mixamorig:Head',
  'mixamorig:HeadTop_End',
  'headfront',
  'mixamorig:LeftShoulder',
  'mixamorig:LeftArm',
  'mixamorig:LeftForeArm',
  'mixamorig:LeftHand',
  'mixamorig:LeftHandThumb1',
  'mixamorig:LeftHandThumb2',
  'mixamorig:LeftHandThumb3',
  'mixamorig:LeftHandThumb4',
  'mixamorig:LeftHandPinky1',
  'mixamorig:LeftHandPinky2',
  'mixamorig:LeftHandPinky3',
  'mixamorig:LeftHandPinky4',
  'mixamorig:LeftHandRing1',
  'mixamorig:LeftHandRing2',
  'mixamorig:LeftHandRing3',
  'mixamorig:LeftHandRing4',
  'mixamorig:LeftHandMiddle1',
  'mixamorig:LeftHandMiddle2',
  'mixamorig:LeftHandMiddle3',
  'mixamorig:LeftHandMiddle4',
  'Bone_034',
  'Bone_033',
  'Bone_024',
  'Bone_023',
  'mixamorig:RightShoulder',
  'mixamorig:RightArm',
  'mixamorig:RightForeArm',
  'mixamorig:RightHand',
  'mixamorig:RightHandThumb1',
  'mixamorig:RightHandThumb2',
  'mixamorig:RightHandThumb3',
  'mixamorig:RightHandThumb4',
  'mixamorig:RightHandPinky1',
  'mixamorig:RightHandPinky2',
  'mixamorig:RightHandPinky3',
  'mixamorig:RightHandPinky4',
  'mixamorig:RightHandMiddle1',
  'mixamorig:RightHandMiddle2',
  'mixamorig:RightHandMiddle3',
  'mixamorig:RightHandMiddle4',
  'mixamorig:RightHandRing1',
  'mixamorig:RightHandRing2',
  'mixamorig:RightHandRing3',
  'mixamorig:RightHandRing4',
  'Bone_038',
  'Bone_037',
  'Bone_029',
  'Bone_028',
  'mixamorig:LeftUpLeg',
  'mixamorig:LeftLeg',
  'mixamorig:LeftFoot',
  'mixamorig:LeftToeBase',
  'mixamorig:LeftToe_End',
  'mixamorig:RightUpLeg',
  'mixamorig:RightLeg',
  'mixamorig:RightFoot',
  'mixamorig:RightToeBase',
  'mixamorig:RightToe_End',
] as const;

export type HeroBoneName = (typeof HERO_BONES)[number];
export type HeroBones = Record<HeroBoneName, THREE.Bone>;

export function bindHeroBones(scene: THREE.Object3D): HeroBones {
  const found = new Map<string, THREE.Bone>();
  scene.traverse((object) => {
    if ((object as THREE.Bone).isBone) found.set(object.name, object as THREE.Bone);
  });
  const bones = {} as HeroBones;
  for (const name of HERO_BONES) {
    const bone = found.get(name) ?? found.get(THREE.PropertyBinding.sanitizeNodeName(name));
    if (!bone) throw new Error(`Main hero is missing the authored ${name} joint`);
    bones[name] = bone;
  }
  return bones;
}

/** This source has four named phalange chains per hand; the auxiliary Bone_* joints are not finger aliases. */
export const HERO_FINGERS = ['Thumb', 'Middle', 'Ring', 'Pinky'] as const;
