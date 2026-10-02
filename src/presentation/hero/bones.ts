import * as THREE from 'three';

/** Authored names; GLTFLoader removes periods when naming its animation targets. */
export const HERO_BONES = [
  'root', 'pelvis', 'spine', 'chest', 'neck', 'head',
  'clavicle.L', 'upperarm.L', 'forearm.L', 'hand.L', 'fingers.L', 'thumb.L',
  'clavicle.R', 'upperarm.R', 'forearm.R', 'hand.R', 'fingers.R', 'thumb.R',
  'thigh.L', 'calf.L', 'foot.L', 'toe.L', 'thigh.R', 'calf.R', 'foot.R', 'toe.R',
  'tabard_front.L', 'tabard_front.R', 'tabard_back.L', 'tabard_back.R',
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
