import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Pose, Rig } from '../characters';
import { HeroAnimationController } from './animation';
import { createHeroAttachments } from './attachments';
import { bindHeroBones } from './bones';

export interface HeroAsset {
  scene: THREE.Group;
  animations: readonly THREE.AnimationClip[];
}

export type MainHeroRig = Rig & { hero: HeroAnimationController };

/** A playable copy: unique skeleton/materials, retained source geometry and PBR images. */
export function createHeroRig(asset: HeroAsset): MainHeroRig {
  const root = new THREE.Group();
  root.name = 'Main hero / physics-owned world transform';
  const body = new THREE.Group();
  body.name = 'Main hero / visual action pivot';
  root.add(body);
  const scene = cloneSkinned(asset.scene) as THREE.Group;
  body.add(scene);
  const bones = bindHeroBones(scene);
  const materials: THREE.MeshStandardMaterial[] = [];
  let skins = 0;
  const copies = new Map<THREE.Material, THREE.Material>();
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const own = (source: THREE.Material) => {
      let material = copies.get(source);
      if (!material) {
        material = source.clone();
        copies.set(source, material);
        if ((material as THREE.MeshStandardMaterial).isMeshStandardMaterial) materials.push(material as THREE.MeshStandardMaterial);
      }
      return material;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
    mesh.castShadow = mesh.receiveShadow = true;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
      skins++;
      // Authored mesh bounds are an A-pose; active hands and the falling visual need a generous local sphere.
      (mesh as THREE.SkinnedMesh).boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.95, 0), 2.15);
    }
  });
  if (skins !== 1) throw new Error(`Main hero requires one skinned character mesh; found ${skins}`);
  const hero = new HeroAnimationController(scene, body, bones, asset.animations);
  const attachments = createHeroAttachments(bones);
  materials.push(...attachments.materials);
  return {
    root, body, hips: bones['mixamorig:Hips'], torso: bones['mixamorig:Spine2'], head: bones['mixamorig:Head'],
    armL: bones['mixamorig:LeftArm'], armR: bones['mixamorig:RightArm'], elbowL: bones['mixamorig:LeftForeArm'], elbowR: bones['mixamorig:RightForeArm'],
    legL: bones['mixamorig:LeftUpLeg'], legR: bones['mixamorig:RightUpLeg'], kneeL: bones['mixamorig:LeftLeg'], kneeR: bones['mixamorig:RightLeg'],
    weapon: attachments.weapon, scabbard: attachments.scabbard, sheathed: attachments.sheathed,
    sash: attachments.sash, shield: null, grip: 'none', height: 1.899, hipY: bones['mixamorig:Hips'].position.y,
    cur: {}, materials, hitFlash: 0, kind: 'humanoid', hero,
  };
}

/** Return true when the authored hero handled the pose, so the legacy procedural poser can return early. */
export function poseHeroRig(rig: Rig & { hero?: HeroAnimationController }, pose: Pose, dt: number): boolean {
  if (!rig.hero) return false;
  rig.hero.pose(pose, dt, rig.grip === 'blade');
  return true;
}
