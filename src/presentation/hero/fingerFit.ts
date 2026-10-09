import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HERO_FINGERS } from './bones';

/**
 * Seat the wanderer's finger joints in his fingers (A75). The A74 body was skinned to the A45 rig's finger chains, which
 * sit 30-50 mm off the new mesh's digits: each knuckle turned the skin about a point outside the finger, so a grip swung
 * the digits wide and stretched the skin between them. Linear blend skinning bends best about the middle of the crease
 * where a joint takes over from its parent, so each finger joint is moved to the weighted centre of that crease, measured
 * from the mesh's own weights. Inverse binds move with the joints (the skin stands exactly as modelled at bind), the
 * joints keep their rest turns (every clip and grip turns them as before), and the clips' constant finger translations
 * are carried to the new rest so they do not pull the joints back.
 *
 * Applied once per loaded asset, before any rig is cloned from it.
 */
const FITTED = 'heroFingersFitted';
/** A vertex belongs to a crease when both sides carry at least this much of it. */
const CREASE = 0.15;
/** A crease needs at least this many vertices to be measured; a joint with fewer keeps its place. */
const CREASE_VERTICES = 6;
/** No joint moves further than this (metres): a larger move means the crease measured something else. */
const MAX_MOVE = 0.1;

export interface FingerFitReport { joint: string; moved: number }

export function fitHeroFingers(asset: Pick<GLTF, 'scene' | 'animations'>): FingerFitReport[] {
  if (asset.scene.userData[FITTED]) return asset.scene.userData[FITTED] as FingerFitReport[];
  let skin: THREE.SkinnedMesh | null = null;
  asset.scene.traverse((object) => { if (!skin && (object as THREE.SkinnedMesh).isSkinnedMesh) skin = object as THREE.SkinnedMesh; });
  const report: FingerFitReport[] = [];
  if (!skin) return report;
  const mesh = skin as THREE.SkinnedMesh, skeleton = mesh.skeleton;
  // GLTFLoader drops the colon from 'mixamorig:' joint names; either spelling is found.
  const named = new Map(skeleton.bones.map((bone, i) => [bone.name.replace(':', ''), i]));
  const index = { get: (name: string) => named.get(name.replace(':', '')) };
  const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
  if (!position || !skinIndex || !skinWeight) return report;
  // Bind-space world placement of every joint, and of every vertex.
  const bindWorld = skeleton.boneInverses.map((inverse) => inverse.clone().invert());
  const vertex = new THREE.Vector3();
  const weightOf = (v: number, joint: number) => {
    let w = 0;
    for (let s = 0; s < 4; s++) if (skinIndex.getComponent(v, s) === joint) w += skinWeight.getComponent(v, s);
    return w;
  };
  const moved = new Map<number, THREE.Vector3>();
  for (const side of ['Left', 'Right'] as const) {
    const hand = index.get(`mixamorig:${side}Hand`);
    if (hand === undefined) continue;
    for (const finger of HERO_FINGERS) {
      const chain = [1, 2, 3, 4].map((k) => index.get(`mixamorig:${side}Hand${finger}${k}`));
      if (chain.some((joint) => joint === undefined)) continue;
      const joints = chain as number[];
      const before = joints.map((joint) => new THREE.Vector3().setFromMatrixPosition(bindWorld[joint]!));
      const after = before.map((p) => p.clone());
      // Each joint sits at the middle of the crease between it and the joint (or hand) before it.
      const fitted = [false, false, false, false];
      for (let k = 0; k < 4; k++) {
        const parent = k === 0 ? hand : joints[k - 1]!, joint = joints[k]!;
        const sum = new THREE.Vector3();
        let total = 0, count = 0;
        for (let v = 0; v < position.count; v++) {
          const a = weightOf(v, parent), b = weightOf(v, joint);
          if (a < CREASE || b < CREASE) continue;
          const w = Math.min(a, b);
          vertex.fromBufferAttribute(position, v).applyMatrix4(mesh.bindMatrix);
          sum.addScaledVector(vertex, w); total += w; count++;
        }
        if (count < CREASE_VERTICES || total <= 0) continue;
        const centre = sum.multiplyScalar(1 / total);
        if (centre.distanceTo(before[k]!) > MAX_MOVE) continue;
        after[k] = centre; fitted[k] = true;
      }
      // A joint with no crease of its own (an end joint that carries nothing) keeps its reach beyond the one before it.
      for (let k = 1; k < 4; k++) if (!fitted[k]) after[k] = after[k - 1]!.clone().add(before[k]!.clone().sub(before[k - 1]!));
      joints.forEach((joint, k) => {
        const distance = after[k]!.distanceTo(before[k]!);
        if (distance < 1e-6) return;
        moved.set(joint, after[k]!);
        report.push({ joint: skeleton.bones[joint]!.name, moved: distance });
      });
    }
  }
  if (!moved.size) { asset.scene.userData[FITTED] = report; return report; }
  // New inverse binds: the same rest turn, at the new place.
  const oldBindWorld = bindWorld.map((matrix) => matrix.clone());
  for (const [joint, at] of moved) {
    const world = bindWorld[joint]!;
    world.setPosition(at);
    skeleton.boneInverses[joint]!.copy(world).invert();
  }
  // Each moved joint's rest offset from its parent changes by as much as its bind offset does.
  const localOf = (binds: THREE.Matrix4[], joint: number, parent: number) =>
    new THREE.Vector3().setFromMatrixPosition(binds[parent]!.clone().invert().multiply(binds[joint]!));
  const rest = new Map<THREE.Bone, THREE.Vector3>();
  for (const joint of skeleton.bones.keys()) {
    const bone = skeleton.bones[joint]!, parent = skeleton.bones.indexOf(bone.parent as THREE.Bone);
    if (parent < 0 || (!moved.has(joint) && !moved.has(parent))) continue;
    rest.set(bone, bone.position.clone().add(localOf(bindWorld, joint, parent).sub(localOf(oldBindWorld, joint, parent))));
  }
  for (const [bone, translation] of rest) {
    const offset = translation.clone().sub(bone.position);
    bone.position.copy(translation);
    for (const clip of asset.animations) for (const track of clip.tracks) {
      if (track.name !== `${bone.name}.position`) continue;
      const values = track.values;
      for (let i = 0; i + 2 < values.length; i += 3) { values[i]! += offset.x; values[i + 1]! += offset.y; values[i + 2]! += offset.z; }
    }
  }
  asset.scene.updateMatrixWorld(true);
  asset.scene.userData[FITTED] = report;
  return report;
}
