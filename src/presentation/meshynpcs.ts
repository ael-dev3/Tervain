import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createGltfLoader } from './assets/gltfLoader';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { NPCS } from '../content/npcs';
import type { NpcId } from '../game/types';
import { createNpcAttachments, createStandInRig, setArmed, type Grip, type Rig, type NpcEquipment, type Mode } from './characters';
import { BONES, type BoneName } from './human/skin';
import { repairNpcSurfaceGeometry, repairNpcSurfaceMaterial } from './npcSurface';
import { installDualQuaternionSkinning } from './npc/dualQuaternionSkinning';
import { applyNpcSkinRepair, computeNpcSkinRepair, type LowerGarment, type SkinRepairJoints } from './npc/skinRepair';
import { fitNpcJoints, measuredPalm, type NpcJointFit } from './npc/jointFit';
import { fitNpcPoses, measureBody, type FittedWork, type NpcPoseFit } from './npc/poseFit';
import { createWorkProp } from './npc/workProps';
import { installResidentSurface, patchResidentShadow, residentHiddenLayers, residentSkinPrior, type ResidentAxis } from './npc/residentSurface';
import { npcStyle, type WorkGesture } from './npcStyle';
import { installResidentRig, parseResidentRig, residentRestPose, type ResidentBones, type ResidentRigData } from './npc/residentRig';
import { createResidentTools } from './npc/residentProps';
import { CENTRED_CLIPS, clipsFor, LOCOMOTION, measureSeat, ResidentMotion, residentMotionLibrary, retargetClip, SEAT_MOMENTS, SEATED_CLIPS, type Build, type ResidentClips, type ResidentMotionLibrary, type WorkContacts } from './npc/residentMotion';
import { BENCH_SEAT_HEIGHT } from '../world/layout';
import { modelAssetUrl } from './assets/modelUrl';
import { withModelLoadSlot, type ModelLoadProgress } from './assets/modelLoadQueue';
import { downloadAsset } from './assets/download';

export const NPC_TRIANGLE_LIMIT = 50_000;
export const NPC_ROLES = [
  ...Object.keys(NPCS).map(id => `named:${id}`),
  'ambient:fisher', 'ambient:fireside', 'ambient:keeper',
  'enemy:ford_bandit_a', 'enemy:ford_bandit_b', 'menu:warden',
] as const;

export interface MeshyNpcEntry {
  id: string;
  file: string;
  triangles: number;
  bytes: number;
  sha256: string;
  height: number;
  /** Verified authoring-stage normals/tangents baked only from source geometry, never from the source normal texture. */
  surfaceBake?: 'geometry-only-v1';
  /** The model's own humanoid rig (A65), beside it. */
  rig?: MeshyNpcFile;
}

/** A small file beside the models, checked by size and hash like them. */
export interface MeshyNpcFile { file: string; bytes: number; sha256: string }

export interface MeshyNpcManifest {
  schema: 1;
  maxTriangles: number;
  assets: MeshyNpcEntry[];
  roles: Record<string, string>;
  /** The residents' motion library (A65). */
  motion?: MeshyNpcFile;
}

const validFile = (value: MeshyNpcFile | undefined, folder: string, extension: string) => value === undefined
  || (!!value && typeof value.file === 'string' && new RegExp(`^${folder}/[a-z0-9]+(?:-[a-z0-9]+)*\.${extension}$`).test(value.file)
    && Number.isInteger(value.bytes) && value.bytes > 0 && /^[0-9a-f]{64}$/.test(value.sha256));

const PARENT: Record<BoneName, BoneName | null> = {
  hips: null, torso: 'hips', head: 'torso', armL: 'torso', elbowL: 'armL',
  armR: 'torso', elbowR: 'armR', legL: 'hips', kneeL: 'legL', legR: 'hips', kneeR: 'legR',
};
const ANGLES = ['legL', 'legR', 'armLx', 'armLy', 'armLz', 'armRx', 'armRy', 'armRz', 'torsoX', 'torsoZ', 'headX', 'headY', 'lower', 'bodyX', 'bodyY', 'kneeL', 'kneeR', 'elbowL', 'elbowR'];

/** Relative to the served page: works under /Tervain/ and another PC host. */
export function meshyNpcUrl(file = 'manifest.json', base = import.meta.env.BASE_URL, page = document.baseURI): URL {
  return modelAssetUrl(`npcs/${file}`, base, page);
}

/** Reject incomplete assignments and dishonest budgets before downloading model data. */
export function validateMeshyNpcManifest(value: unknown): MeshyNpcManifest {
  const manifest = value as MeshyNpcManifest | null;
  if (!manifest || manifest.schema !== 1 || manifest.maxTriangles !== NPC_TRIANGLE_LIMIT || !Array.isArray(manifest.assets)
    || !manifest.roles || typeof manifest.roles !== 'object') throw new Error('The resident model manifest is incompatible.');
  const ids = new Set<string>(), files = new Set<string>();
  for (const entry of manifest.assets) {
    if (!entry || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.glb$/.test(entry.file)
      || ids.has(entry.id) || files.has(entry.file) || !Number.isInteger(entry.triangles) || entry.triangles <= 0
      || entry.triangles > NPC_TRIANGLE_LIMIT || !Number.isInteger(entry.bytes) || entry.bytes < 20
      || !/^[0-9a-f]{64}$/.test(entry.sha256) || !Number.isFinite(entry.height) || entry.height < 1.4 || entry.height > 2.2
      || (entry.surfaceBake !== undefined && entry.surfaceBake !== 'geometry-only-v1') || !validFile(entry.rig, 'rigs', 'json')) {
      throw new Error(`The resident model manifest has an invalid entry (${entry?.id ?? 'unnamed'}).`);
    }
    ids.add(entry.id); files.add(entry.file);
  }
  if (!validFile(manifest.motion, 'motion', 'glb')) throw new Error('The resident model manifest has an invalid motion library.');
  for (const role of NPC_ROLES) if (!ids.has(manifest.roles[role] ?? '')) throw new Error(`The resident model manifest is missing ${role}.`);
  for (const [role, id] of Object.entries(manifest.roles)) if (!ids.has(id)) throw new Error(`The resident model role ${role} refers to an unknown model.`);
  return manifest;
}

function bindNpcBones(scene: THREE.Group): Record<BoneName, THREE.Bone> {
  const found = new Map<string, THREE.Bone>();
  scene.traverse(object => {
    if (!(object as THREE.Bone).isBone) return;
    if (found.has(object.name)) throw new Error(`Resident model has duplicate ${object.name} joints.`);
    found.set(object.name, object as THREE.Bone);
  });
  const bones = {} as Record<BoneName, THREE.Bone>;
  scene.updateMatrixWorld(true);
  for (const name of BONES) {
    const bone = found.get(name);
    if (!bone) throw new Error(`Resident model is missing its ${name} joint.`);
    const parent = PARENT[name];
    if (parent && bone.parent?.name !== parent) throw new Error(`Resident model has an incompatible ${name} parent.`);
    if (!bone.position.toArray().every(Number.isFinite) || !bone.scale.toArray().every(v => Math.abs(v - 1) < 1e-5)
      || Math.abs(bone.quaternion.w) < 1 - 1e-5 || Math.hypot(bone.quaternion.x, bone.quaternion.y, bone.quaternion.z) > 1e-5) {
      throw new Error(`Resident model has an incompatible ${name} bind transform.`);
    }
    // The procedural pose delta is expressed in world-facing character axes. A rotated armature would twist it.
    const world = bone.getWorldQuaternion(new THREE.Quaternion());
    if (Math.abs(world.w) < 1 - 1e-5 || Math.hypot(world.x, world.y, world.z) > 1e-5) throw new Error(`Resident model has a rotated ${name} armature.`);
    bones[name] = bone;
  }
  if (!(bones.hips.position.y > 0.5 && bones.hips.position.y < 1.3)) throw new Error('Resident model is not grounded in metre-scale bind space.');
  return bones;
}

/** Count complete mesh instances, including hidden parts, and verify real skinning rather than trusting the manifest. */
export function validateMeshyNpcAsset(asset: Pick<GLTF, 'scene' | 'animations'>, entry: MeshyNpcEntry): number {
  const bones = bindNpcBones(asset.scene);
  let triangles = 0, skins = 0;
  asset.scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const position = mesh.geometry.getAttribute('position');
    if (!position) throw new Error(`Resident ${entry.id} has a mesh without positions.`);
    const count = mesh.geometry.index?.count ?? position.count;
    if (count % 3 !== 0) throw new Error(`Resident ${entry.id} has incomplete triangles.`);
    triangles += count / 3;
    const skin = mesh as THREE.SkinnedMesh;
    if (!skin.isSkinnedMesh) return;
    skins++;
    const indices = skin.geometry.getAttribute('skinIndex'), weights = skin.geometry.getAttribute('skinWeight');
    if (!indices || !weights || indices.itemSize !== 4 || weights.itemSize !== 4 || indices.count !== position.count || weights.count !== position.count) {
      throw new Error(`Resident ${entry.id} has incomplete skin weights.`);
    }
    for (const bone of skin.skeleton.bones) if (!Object.values(bones).includes(bone)) throw new Error(`Resident ${entry.id} uses an unsupported skin joint.`);
    for (let vertex = 0; vertex < position.count; vertex++) {
      let total = 0;
      for (let slot = 0; slot < 4; slot++) {
        const index = indices.getComponent(vertex, slot), weight = weights.getComponent(vertex, slot);
        if (!Number.isInteger(index) || index < 0 || index >= skin.skeleton.bones.length || !Number.isFinite(weight) || weight < 0 || weight > 1) {
          throw new Error(`Resident ${entry.id} has invalid skin weights.`);
        }
        total += weight;
      }
      if (Math.abs(total - 1) > 0.015) throw new Error(`Resident ${entry.id} has unnormalised skin weights.`);
    }
  });
  if (!skins || triangles > NPC_TRIANGLE_LIMIT || triangles !== entry.triangles) throw new Error(`Resident ${entry.id} geometry does not match its ${NPC_TRIANGLE_LIMIT}-triangle budget (${triangles}).`);
  // These derivatives use the retained game poser; source static GLBs do not claim authored motion.
  if (asset.animations.length) throw new Error(`Resident ${entry.id} has unexpected animation channels.`);
  return triangles;
}

/** Mara's source and its fireside twin keep their measured long-skirt fit (below) instead of the shared leg cloth. */
export const NPC_LOWER_GARMENTS: Readonly<Record<string, LowerGarment>> = { 'rillford-reeve': 'fitted', fireside: 'fitted' };

/**
 * Sources whose arms took a garment panel hanging beside them (the caravan master's cape, the baker's apron, the fisher's
 * pack), with how close beside the forearm and hand that panel hangs.
 */
export const NPC_ARM_GARMENTS: Readonly<Record<string, Partial<Record<'upper' | 'fore' | 'hand', number>>>> = {
  // The baker's back apron hangs right against his forearms and below his hands: only its detached panel is released.
  'caravan-master': { hand: 0.09 }, 'village-baker': { upper: 1, fore: 1, hand: 1 }, fisher: {},
};

/** Presentation repairs layered over the prepared skins; every one is on in the game. Review tools switch them off to compare. */
export interface NpcRigOptions {
  /** Blend joints as rigid motions (dual quaternions) instead of averaged matrices. */
  dualQuaternion?: boolean;
  /** Blend the shoulder seam and release garments that the source skin gave to the arms. */
  skinRepair?: boolean;
  /** Move each elbow and knee to the model's own joint before anything measures from them. */
  jointFit?: boolean;
  /** Fit the hanging arm and the standing gestures to this figure's own body. */
  poseFit?: boolean;
  /** Shade skin, cloth, leather and steel as what they are (npc/residentSurface.ts). */
  surface?: boolean;
  /** The resident's task when it is drawn with tools (writing, provisioning, stonework, measuring). */
  work?: WorkGesture;
  /** Play authored clips on the resident's own humanoid rig (A65) when the catalog has one; off keeps the procedural poser. */
  authoredMotion?: boolean;
}

/**
 * Figures whose cape hangs between the arms and the body (tools/meshy-rig releases it from the arms): how much of the
 * clips' arm movement is held back, so the cape stretches less where it still meets the arm.
 */
export const RESIDENT_GARMENT_ARMS: Readonly<Record<string, number>> = { 'caravan-master': 0.6 };

/** A resident's own rig and the motion library, handed to the rig builder by the catalog. */
export interface ResidentMotionSource {
  data: ResidentRigData;
  library: ResidentMotionLibrary;
  build: Build;
  seed: number;
  fighter: boolean;
  work?: WorkGesture;
}

export const NPC_RIG_DEFAULTS: Required<Omit<NpcRigOptions, 'work'>> & Pick<NpcRigOptions, 'work'> = { dualQuaternion: true, skinRepair: true, jointFit: true, poseFit: true, surface: true, authoredMotion: true };

/** Clips retargeted onto one model's rig, shared by every actor of that model. */
const retargeted = new WeakMap<ResidentRigData, Map<string, ReturnType<typeof retargetClip>>>();
function residentClips(source: ResidentMotionSource, bones: ResidentBones, mesh?: THREE.SkinnedMesh): ResidentClips {
  let known = retargeted.get(source.data);
  if (!known) { known = new Map(); retargeted.set(source.data, known); }
  const rest = residentRestPose(bones);
  const clips: ResidentClips = new Map();
  for (const name of clipsFor(source.build, source.work, source.fighter)) {
    let clip = known.get(name);
    if (!clip) {
      const library = source.library.clips.get(name);
      if (!library) continue;
      clip = retargetClip(library, source.library.rest, rest, LOCOMOTION.has(name), CENTRED_CLIPS.has(name));
      // Seated clips are measured where they sit; getting down and up at their seated ends (A69).
      if ((SEATED_CLIPS.has(name) || SEAT_MOMENTS[name]) && mesh) {
        clip.seat = measureSeat(clip, rest, source.data, mesh.geometry.getAttribute('position') as THREE.BufferAttribute, SEAT_MOMENTS[name]);
      }
      known.set(name, clip);
    }
    clips.set(name, clip);
  }
  return clips;
}

/** The palm's centre in a rig's bind pose: the middle of the surface the hand joint mostly carries. */
/**
 * Each hand's surface in its own joint's frame, from the bind pose (A70): the vertices that follow the hand, and the way
 * its fingers run and its palm faces (towards the body's middle line, as the tools are placed).
 */
const HAND_DIRECTIONS = 160;
function residentHands(mesh: THREE.SkinnedMesh, own: ResidentBones, scene: THREE.Group): WorkContacts['hands'] {
  const position = mesh.geometry.getAttribute('position'), index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight');
  const out = {} as WorkContacts['hands'];
  scene.updateMatrixWorld(true);
  for (const side of ['LeftHand', 'RightHand'] as const) {
    const hand = own[side], joint = mesh.skeleton.bones.indexOf(hand);
    const toHand = new THREE.Matrix4().copy(hand.matrixWorld).invert().multiply(mesh.matrixWorld);
    const all: [number, THREE.Vector3][] = [], centre = new THREE.Vector3();
    for (let vertex = 0; vertex < position.count; vertex++) {
      let w = 0;
      for (let slot = 0; slot < 4; slot++) if (index.getComponent(vertex, slot) === joint) w += weight.getComponent(vertex, slot);
      if (w < 0.6) continue;
      const p = new THREE.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(toHand);
      all.push([vertex, p]); centre.add(p);
    }
    if (!all.length) continue;
    centre.multiplyScalar(1 / all.length);
    // Only the hand's outermost vertices can touch first: the furthest out along each of many directions.
    const vertices = new Set<number>(), direction = new THREE.Vector3();
    for (let i = 0; i < HAND_DIRECTIONS; i++) {
      const y = 1 - (2 * i + 1) / HAND_DIRECTIONS, r = Math.sqrt(1 - y * y), a = i * Math.PI * (3 - Math.sqrt(5));
      direction.set(Math.cos(a) * r, y, Math.sin(a) * r);
      let best = all[0]!;
      for (const candidate of all) if (candidate[1].dot(direction) > best[1].dot(direction)) best = candidate;
      vertices.add(best[0]);
    }
    const fingers = centre.clone().normalize();
    const toLocal = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().copy(hand.matrixWorld).invert().multiply(scene.matrixWorld));
    const wristX = scene.worldToLocal(hand.getWorldPosition(new THREE.Vector3())).x;
    const inward = new THREE.Vector3(-Math.sign(wristX) || 1, 0, 0).applyMatrix3(toLocal).normalize();
    const palm = inward.sub(fingers.clone().multiplyScalar(inward.dot(fingers))).normalize();
    out[side] = { vertices: [...vertices], centre, fingers, palm };
  }
  return out;
}

function residentPalm(mesh: THREE.SkinnedMesh, hand: THREE.Bone, scene: THREE.Group): THREE.Vector3 {
  const joint = mesh.skeleton.bones.indexOf(hand);
  const position = mesh.geometry.getAttribute('position'), index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight');
  const sum = new THREE.Vector3(), point = new THREE.Vector3();
  let count = 0;
  for (let vertex = 0; vertex < position.count; vertex++) {
    let w = 0;
    for (let slot = 0; slot < 4; slot++) if (index.getComponent(vertex, slot) === joint) w += weight.getComponent(vertex, slot);
    if (w < 0.6) continue;
    point.fromBufferAttribute(position, vertex);
    mesh.localToWorld(point); scene.worldToLocal(point);
    sum.add(point); count++;
  }
  return count ? sum.multiplyScalar(1 / count) : scene.worldToLocal(hand.getWorldPosition(new THREE.Vector3()));
}

/** Skin priors per source geometry and repair setting (every actor of one model shares its prior). */
const skinPriors = new WeakMap<THREE.BufferGeometry, Map<string, Float32Array>>();

/** Covered layers per source geometry and joint fit (the fitted axes decide a lining's side). */
const hiddenLayers = new WeakMap<THREE.BufferGeometry, Map<string, Float32Array>>();

/** Joint fits per source model: the first actor measures, the rest take the same joint places. */
const jointFits = new WeakMap<THREE.Object3D, { fit: NpcJointFit; places: Map<string, THREE.Vector3> }>();

function fittedJoints(template: THREE.Object3D, scene: THREE.Group, bones: Record<BoneName, THREE.Bone>): NpcJointFit {
  const known = jointFits.get(template);
  if (!known) {
    const fit = fitNpcJoints(scene, bones);
    jointFits.set(template, { fit, places: new Map(BONES.map(name => [name, bones[name].position.clone()])) });
    return fit;
  }
  for (const name of BONES) bones[name].position.copy(known.places.get(name)!);
  scene.updateMatrixWorld(true);
  scene.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) (object as THREE.SkinnedMesh).skeleton.calculateInverses(); });
  return known.fit;
}

/** Pose fits are measured once per source model and repair setting; every actor of that model shares the angles. */
const poseFits = new WeakMap<THREE.BufferGeometry, Map<string, NpcPoseFit>>();

/** A private animated skeleton and GPU resources per actor/world; only decoded image pixels are shared. */
export function createMeshyNpcRig(asset: Pick<GLTF, 'scene' | 'animations'>, entry: MeshyNpcEntry, heightScale = 1, grip: Grip = 'none', equipment?: NpcEquipment,
  options: NpcRigOptions = {}, motion?: ResidentMotionSource): Rig {
  const settings = { ...NPC_RIG_DEFAULTS, ...options };
  // On its own rig a resident plays authored clips: the eleven-joint repairs and fitted poses do not apply.
  const authored = settings.authoredMotion && motion ? motion : null;
  if (authored) { settings.jointFit = false; settings.skinRepair = false; settings.poseFit = false; }
  const installed: { bones: ResidentBones | null; mesh: THREE.SkinnedMesh | null } = { bones: null, mesh: null };
  if (!Number.isFinite(heightScale) || heightScale < 0.7 || heightScale > 1.4) throw new Error('Resident height scale is invalid.');
  const root = new THREE.Group(), body = new THREE.Group();
  root.name = `Resident / ${entry.id}`; body.name = 'Resident / visual action pivot'; root.add(body);
  const scene = cloneSkinned(asset.scene) as THREE.Group;
  body.add(scene);
  const bones = bindNpcBones(scene);
  const jointFit = settings.jointFit ? fittedJoints(asset.scene, scene, bones) : null;
  const repairJoints = settings.skinRepair ? npcRepairJoints(scene, bones) : null;
  const geometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  const sourceOf = (own: THREE.BufferGeometry) => { for (const [template, clone] of geometries) if (clone === own) return template; return own; };
  const fittedSkirts = new Set<THREE.BufferGeometry>();
  const materials = new Map<THREE.Material, THREE.Material>();
  const textures = new Map<THREE.Texture, THREE.Texture>();
  const paint: THREE.MeshStandardMaterial[] = [];
  const ownMaterial = (source: THREE.Material) => {
    let copy = materials.get(source);
    if (!copy) {
      copy = source.clone(); materials.set(source, copy);
      for (const [key, value] of Object.entries(copy)) {
        if (!(value instanceof THREE.Texture)) continue;
        let texture = textures.get(value);
        if (!texture) { texture = value.clone(); textures.set(value, texture); }
        Reflect.set(copy, key, texture);
      }
      if ((copy as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        // Material.copy intentionally omits callback functions; retain any environmental/inspection extension.
        copy.onBeforeCompile = source.onBeforeCompile; copy.customProgramCacheKey = source.customProgramCacheKey;
        repairNpcSurfaceMaterial(copy as THREE.MeshStandardMaterial);
        paint.push(copy as THREE.MeshStandardMaterial);
      }
    }
    return copy;
  };
  scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    let geometry = geometries.get(mesh.geometry);
    if (!geometry) {
      geometry = mesh.geometry.clone();
      // BufferGeometry.copy shares userData; owned repair/garment annotations must not mark the cached template.
      geometry.userData = { ...geometry.userData };
      // Properly rebaked templates already carry the precise Blender basis used by their normal texture.
      // Only old prepared templates/recovery fixtures need runtime geometric-normal reconstruction.
      if (entry.surfaceBake !== 'geometry-only-v1') repairNpcSurfaceGeometry(geometry);
      const skinned = mesh as THREE.SkinnedMesh;
      if (repairJoints && skinned.isSkinnedMesh) {
        applyNpcSkinRepair(geometry, computeNpcSkinRepair(mesh.geometry, skinned.skeleton.bones.map(bone => bone.name), repairJoints,
          { lowerGarment: NPC_LOWER_GARMENTS[entry.id] ?? 'shared', armGarments: entry.id in NPC_ARM_GARMENTS, armReach: NPC_ARM_GARMENTS[entry.id] }));
      }
      geometries.set(mesh.geometry, geometry);
    }
    mesh.geometry = geometry;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(ownMaterial) : ownMaterial(mesh.material);
    mesh.castShadow = mesh.receiveShadow = true;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
      const skin = mesh as THREE.SkinnedMesh;
      // These two source variants share a continuous ankle-length skirt, not two trouser legs.
      // Fit its private skin once; leave the cached source and every other resident's gait untouched.
      if ((entry.id === 'rillford-reeve' || entry.id === 'fireside') && !fittedSkirts.has(geometry)) {
        conditionLongSkirtSkin(skin); fittedSkirts.add(geometry);
      }
      skin.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, entry.height / 2, 0), entry.height * 1.2);
      if (settings.surface) {
        const names = skin.skeleton.bones.map(bone => bone.name);
        const priorKey = `${settings.skinRepair}|${settings.jointFit}`, source = sourceOf(skin.geometry);
        let priors = skinPriors.get(source);
        if (!priors) { priors = new Map(); skinPriors.set(source, priors); }
        let prior = priors.get(priorKey);
        if (!prior) { prior = residentSkinPrior(skin.geometry, names); priors.set(priorKey, prior); }
        const hiddenKey = `${settings.jointFit}`;
        let byFit = hiddenLayers.get(source);
        if (!byFit) { byFit = new Map(); hiddenLayers.set(source, byFit); }
        let hidden = byFit.get(hiddenKey);
        if (!hidden) { hidden = residentHiddenLayers(source, names, residentAxes(repairJoints ?? npcRepairJoints(scene, bones))); byFit.set(hiddenKey, hidden); }
        for (const material of Array.isArray(skin.material) ? skin.material : [skin.material]) {
          if ((material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            installResidentSurface(material as THREE.MeshStandardMaterial, skin.geometry, prior,
              { metal: (material as THREE.MeshStandardMaterial).metalness > 0.1, hidden });
          }
        }
      }
      // The resident's own rig replaces the eleven-joint skeleton once the measurements that read the old skin are done.
      if (authored && !installed.bones) { installed.bones = installResidentRig(skin, authored.data).bones; installed.mesh = skin; }
      // The matching shadow materials belong to the actor's colour material and leave with it.
      const owner = Array.isArray(skin.material) ? skin.material[0] : skin.material;
      if (settings.dualQuaternion) {
        const dq = installDualQuaternionSkinning(skin);
        owner?.addEventListener('dispose', () => dq.dispose());
      } else if (settings.surface) {
        const side = owner?.side ?? THREE.FrontSide;
        const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side }), distance = new THREE.MeshDistanceMaterial({ side });
        skin.customDepthMaterial = depth; skin.customDistanceMaterial = distance;
        owner?.addEventListener('dispose', () => { depth.dispose(); distance.dispose(); });
      }
      if (settings.surface) {
        for (const shadow of [skin.customDepthMaterial, skin.customDistanceMaterial]) if (shadow) patchResidentShadow(shadow as THREE.MeshDepthMaterial);
      }
    }
  });
  const carried = equipment ?? (grip === 'blade' ? 'blade' : undefined);
  const attachments = carried ? createNpcAttachments(carried) : null;
  const residentBones = installed.bones, residentMesh = installed.mesh;
  if (attachments && residentBones && residentMesh) {
    // On the resident's own rig the weapon rides the right hand at the palm, turned as it was held at rest.
    const hand = residentBones.RightHand;
    const palm = residentPalm(residentMesh, hand, scene);
    const socket = new THREE.Group(); socket.name = 'NPC / right palm equipment socket';
    scene.updateMatrixWorld(true);
    const handWorld = hand.matrixWorld.clone(), toScene = scene.matrixWorld.clone().invert();
    const handInScene = new THREE.Matrix4().multiplyMatrices(toScene, handWorld);
    const rest = new THREE.Matrix4().compose(palm, new THREE.Quaternion().setFromEuler(new THREE.Euler(1.9, 0, 0)), new THREE.Vector3(1, 1, 1));
    new THREE.Matrix4().multiplyMatrices(handInScene.clone().invert(), rest).decompose(socket.position, socket.quaternion, socket.scale);
    hand.add(socket); socket.add(attachments.weapon);
    if (attachments.scabbard) {
      const hips = residentBones.Hips, scabbard = attachments.scabbard;
      const at = new THREE.Matrix4().compose(new THREE.Vector3(-0.24, hips.position.y + 0.04, 0.035), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.52, 0, 0.12)), new THREE.Vector3(1, 1, 1));
      const hipsInScene = new THREE.Matrix4().multiplyMatrices(toScene, hips.matrixWorld);
      new THREE.Matrix4().multiplyMatrices(hipsInScene.invert(), at).decompose(scabbard.position, scabbard.quaternion, scabbard.scale);
      hips.add(scabbard);
    }
    paint.push(...attachments.materials);
  } else if (attachments) {
    // The relaxed source forearm length is measured from its own weighted hand vertices, rather than assuming the old doll's wrist.
    const palm = measuredPalm(scene, bones.elbowR, bones.armR);
    const elbow = bones.elbowR.getWorldPosition(new THREE.Vector3());
    scene.worldToLocal(elbow);
    const hand = new THREE.Group(); hand.name = 'NPC / right palm equipment socket';
    hand.position.copy(palm).sub(elbow); hand.rotation.x = 1.9;
    bones.elbowR.add(hand); hand.add(attachments.weapon);
    if (attachments.scabbard) {
      attachments.scabbard.position.set(Math.abs(bones.armR.position.x) + 0.025, 0.04, 0.035);
      attachments.scabbard.rotation.set(0.52, 0, 0.12); bones.hips.add(attachments.scabbard);
    }
    paint.push(...attachments.materials);
  }
  let completeTriangles = 0;
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) completeTriangles += (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
  });
  if (completeTriangles > NPC_TRIANGLE_LIMIT) throw new Error(`Resident ${entry.id} exceeds the complete ${NPC_TRIANGLE_LIMIT}-triangle actor budget after equipment (${completeTriangles}).`);
  // Scale the visual only. Controllers, routes, collision radii and durable actor identities remain authoritative.
  body.scale.setScalar(heightScale);
  root.userData.meshyNpc = { id: entry.id, triangles: completeTriangles, modelTriangles: entry.triangles,
    attachmentTriangles: completeTriangles - entry.triangles, animation: 'derived-game-poser', jointFit: jointFit?.moved ?? null };
  const own = residentBones;
  const rig: Rig = {
    root, body,
    ...(own ? {
      hips: own.Hips, torso: own.Spine, head: own.Head, armL: own.LeftArm, armR: own.RightArm, elbowL: own.LeftForeArm, elbowR: own.RightForeArm,
      legL: own.LeftUpLeg, legR: own.RightUpLeg, kneeL: own.LeftLeg, kneeR: own.RightLeg,
    } : {
      hips: bones.hips, torso: bones.torso, head: bones.head, armL: bones.armL, armR: bones.armR, elbowL: bones.elbowL, elbowR: bones.elbowR,
      legL: bones.legL, legR: bones.legR, kneeL: bones.kneeL, kneeR: bones.kneeR,
    }),
    weapon: attachments?.weapon ?? null, shield: null, scabbard: attachments?.scabbard ?? null, sheathed: attachments?.sheathed ?? null, sash: null,
    grip, height: entry.height * heightScale, hipY: own ? own.Hips.position.y : bones.hips.position.y,
    cur: Object.fromEntries(ANGLES.map(key => [key, 0])), materials: paint, hitFlash: 0, kind: 'humanoid',
  };
  let residentWork: { gesture: WorkGesture; props: THREE.Object3D[] } | undefined;
  if (own && authored) {
    // Tools first, while the rig still stands in its bind pose.
    const tools = createResidentTools(authored.work, own, scene, side => residentPalm(residentMesh!, own[side], scene));
    paint.push(...tools.materials);
    rig.resident = new ResidentMotion(scene, body, own, residentClips(authored, own, residentMesh ?? undefined), {
      build: authored.build, seed: authored.seed, defaultSeat: BENCH_SEAT_HEIGHT, seatDepth: 0.13 * entry.height / 1.8,
      garmentArms: RESIDENT_GARMENT_ARMS[entry.id],
      contacts: residentMesh ? { mesh: residentMesh, hands: residentHands(residentMesh, own, scene), tools: tools.points } : undefined,
    });
    root.userData.meshyNpc.animation = 'meshy-authored-clips';
    root.userData.meshyNpc.rig = 'meshy-auto-rig-v1';
    if (tools.props.length && authored.work) {
      residentWork = { gesture: authored.work, props: tools.props };
      root.userData.meshyNpc.triangles += tools.triangles;
      root.userData.meshyNpc.attachmentTriangles += tools.triangles;
      if (root.userData.meshyNpc.triangles > NPC_TRIANGLE_LIMIT) throw new Error(`Resident ${entry.id} exceeds the complete ${NPC_TRIANGLE_LIMIT}-triangle actor budget with work tools.`);
    }
  }
  const sole = npcSoleSamples(scene);
  let soleClearance = 0;
  rig.npc = { settle(mode: Mode, dt: number) {
    root.userData.meshyNpc.soleClearance = 0;
    if (!sole.length || mode === 'dead' || mode === 'dodge') { soleClearance = 0; return; }
    root.updateMatrixWorld(true);
    let lowest = Infinity;
    const point = new THREE.Vector3();
    for (const { mesh, vertices } of sole) {
      mesh.skeleton.update();
      for (const vertex of vertices) {
        mesh.getVertexPosition(vertex, point);
        mesh.localToWorld(point); body.worldToLocal(point);
        lowest = Math.min(lowest, body.position.y + point.y * heightScale);
      }
    }
    const clearance = Math.min(0.1, Math.max(0, -lowest));
    // Raise enough to keep a planted sole out of the floor; release that visual lift gently as the foot recovers.
    // The poser resets body.position each frame, so retaining the filter value never accumulates actor height.
    soleClearance = clearance >= soleClearance ? clearance
      : clearance + (soleClearance - clearance) * Math.exp(-Math.max(0, dt) * 10);
    body.position.y += soleClearance;
    root.userData.meshyNpc.soleClearance = soleClearance;
  } };
  if (residentWork) rig.npc.work = residentWork;
  root.userData.meshyNpc.soleSamples = sole.reduce((total, sample) => total + sample.vertices.length, 0);
  if (settings.poseFit) {
    let skin: THREE.SkinnedMesh | null = null, source: THREE.BufferGeometry | null = null;
    scene.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh && !skin) skin = object as THREE.SkinnedMesh; });
    for (const [template, own] of geometries) if (own === skin!?.geometry) source = template;
    const key = `${settings.skinRepair}|${settings.jointFit}`;
    const known = source ? poseFits.get(source)?.get(key) : undefined;
    const palms: [THREE.Vector3, THREE.Vector3] = jointFit ? [jointFit.palmL, jointFit.palmR]
      : [measuredPalm(scene, bones.elbowL, bones.armL), measuredPalm(scene, bones.elbowR, bones.armR)];
    const fit = known ?? (skin ? fitNpcPoses(rig, measureBody(rig, skin), palms, entry.id in NPC_ARM_GARMENTS) : undefined);
    if (fit && source && !known) {
      const byKey = poseFits.get(source) ?? new Map<string, NpcPoseFit>();
      byKey.set(key, fit); poseFits.set(source, byKey);
    }
    rig.npc.fit = fit;
    root.userData.meshyNpc.poseFit = fit ? { hang: fit.hang, rest: fit.rest, unplaced: fit.unplaced } : null;
    const task = settings.work && fit?.work[settings.work as FittedWork];
    if (task && settings.work) {
      // Tools for the resident's task, shown only while they work; the complete actor stays within its budget.
      const props: THREE.Object3D[] = [];
      let added = 0;
      for (const placement of task.props) {
        const built = createWorkProp(placement.kind, placement.length);
        const holder = placement.holder === 'lap' ? bones.hips : placement.holder === 'handL' ? bones.elbowL : bones.elbowR;
        const socket = new THREE.Group();
        socket.name = `NPC / ${placement.holder} work socket`;
        if (placement.holder === 'lap') socket.position.fromArray(placement.position);
        else socket.position.copy(placement.holder === 'handL' ? palms[0] : palms[1]).sub(scene.worldToLocal(holder.getWorldPosition(new THREE.Vector3())));
        built.group.quaternion.fromArray(placement.quaternion);
        socket.add(built.group);
        holder.add(socket);
        props.push(socket);
        paint.push(...built.materials);
        added += built.triangles;
      }
      for (const prop of props) prop.visible = false;
      rig.npc.work = { gesture: settings.work, props };
      root.userData.meshyNpc.triangles += added;
      root.userData.meshyNpc.attachmentTriangles += added;
      if (root.userData.meshyNpc.triangles > NPC_TRIANGLE_LIMIT) throw new Error(`Resident ${entry.id} exceeds the complete ${NPC_TRIANGLE_LIMIT}-triangle actor budget with work tools.`);
    }
  }
  if (carried) setArmed(rig, carried === 'sheathed' ? 'sheathed' : 'drawn');
  return rig;
}

/**
 * The measured Mara/fireside source skirt begins just above the boots (.10 m) and joins the waist (.90 m).
 * A broad paired-leg field keeps continuous cloth rounded instead of pulling it into two independent knee panels.
 * Original hip/thigh/knee totals remain exact, so equal left/right sitting rotations preserve the source's seated form.
 * This is a bounded skin-weight fit, not simulated cloth: sole/boot tips, sleeves, face, UVs and the baked basis stay intact.
 */
function conditionLongSkirtSkin(mesh: THREE.SkinnedMesh) {
  const position = mesh.geometry.getAttribute('position'), indices = mesh.geometry.getAttribute('skinIndex');
  const weights = mesh.geometry.getAttribute('skinWeight');
  const named = (name: BoneName) => mesh.skeleton.bones.findIndex(bone => bone.name === name);
  const hips = named('hips'), legL = named('legL'), legR = named('legR'), kneeL = named('kneeL'), kneeR = named('kneeR');
  const lower = new Set([legL, legR, kneeL, kneeR]);
  const smooth = (a: number, b: number, value: number) => {
    const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1); return t * t * (3 - 2 * t);
  };
  let fitted = 0;
  for (let vertex = 0; vertex < position.count; vertex++) {
    const x = position.getX(vertex), y = position.getY(vertex), z = position.getZ(vertex);
    if (y <= 0.095 || y >= 0.9) continue;
    let lowerWeight = 0;
    for (let slot = 0; slot < 4; slot++) {
      const joint = indices.getComponent(vertex, slot);
      if (lower.has(joint) || joint === hips) lowerWeight += weights.getComponent(vertex, slot);
    }
    // Spatial overlap with a relaxed hand does not make it cloth.
    if (lowerWeight < 0.99) continue;
    const outsideBoot = Math.max(smooth(0.18, 0.24, Math.abs(x)), 1 - smooth(-0.14, -0.08, z), smooth(0.17, 0.22, z));
    const fit = smooth(0.095, 0.125, y) * Math.max(outsideBoot, smooth(0.14, 0.24, y)) * (1 - smooth(0.78, 0.9, y));
    if (fit < 1e-6) continue;
    const side = 0.35 + 0.3 * smooth(-0.28, 0.28, x);
    const original = new Map<number, number>();
    for (let slot = 0; slot < 4; slot++) {
      const joint = indices.getComponent(vertex, slot), weight = weights.getComponent(vertex, slot);
      original.set(joint, (original.get(joint) ?? 0) + weight);
    }
    const combined = new Map(original);
    for (const [left, right] of [[legL, legR], [kneeL, kneeR]] as const) {
      const leftWeight = original.get(left) ?? 0, rightWeight = original.get(right) ?? 0, total = leftWeight + rightWeight;
      combined.set(left, leftWeight * (1 - fit) + total * side * fit);
      combined.set(right, rightWeight * (1 - fit) + total * (1 - side) * fit);
    }
    const strongest = [...combined].filter(([, weight]) => weight > 1e-8).sort((a, b) => b[1] - a[1]);
    // This source field never mixes hip, thigh and knee bands simultaneously. Preserve unusual imported mixes intact.
    if (strongest.length > 4) continue;
    const total = strongest.reduce((sum, [, weight]) => sum + weight, 0);
    for (let slot = 0; slot < 4; slot++) {
      indices.setComponent(vertex, slot, strongest[slot]?.[0] ?? 0);
      weights.setComponent(vertex, slot, (strongest[slot]?.[1] ?? 0) / total);
    }
    fitted++;
  }
  if (fitted) {
    indices.needsUpdate = weights.needsUpdate = true;
    mesh.geometry.userData.npcGarment = { profile: 'mara-long-skirt-v1', fittedVertices: fitted };
  }
}

/** At most 64 cached heel/toe/sole representatives for the complete actor, selected once in bind space. */
function npcSoleSamples(scene: THREE.Group): { mesh: THREE.SkinnedMesh; vertices: number[] }[] {
  const candidates: { mesh: THREE.SkinnedMesh; vertex: number; side: number; x: number; y: number; z: number }[] = [];
  scene.traverse(object => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const position = mesh.geometry.getAttribute('position'), indices = mesh.geometry.getAttribute('skinIndex'), weights = mesh.geometry.getAttribute('skinWeight');
    const joints = ['kneeL', 'kneeR'].map(name => mesh.skeleton.bones.findIndex(bone => bone.name === name));
    for (let vertex = 0; vertex < position.count; vertex++) {
      if (position.getY(vertex) > 0.24) continue;
      for (let side = 0; side < 2; side++) {
        let weight = 0;
        for (let slot = 0; slot < 4; slot++) if (indices.getComponent(vertex, slot) === joints[side]) weight += weights.getComponent(vertex, slot);
        if (weight >= 0.35) candidates.push({ mesh, vertex, side, x: position.getX(vertex), y: position.getY(vertex), z: position.getZ(vertex) });
      }
    }
  });
  const selected = new Set<(typeof candidates)[number]>();
  for (let side = 0; side < 2; side++) {
    const foot = candidates.filter(candidate => candidate.side === side);
    if (!foot.length) continue;
    const xMin = Math.min(...foot.map(point => point.x)), xMax = Math.max(...foot.map(point => point.x));
    const zMin = Math.min(...foot.map(point => point.z)), zMax = Math.max(...foot.map(point => point.z));
    const cells = new Map<string, (typeof candidates)[number]>();
    for (const point of foot) {
      const x = Math.min(3, Math.floor(4 * (point.x - xMin) / Math.max(0.001, xMax - xMin)));
      const z = Math.min(3, Math.floor(4 * (point.z - zMin) / Math.max(0.001, zMax - zMin)));
      const key = `${x}:${z}`, existing = cells.get(key);
      if (!existing || point.y < existing.y) cells.set(key, point);
    }
    for (const point of cells.values()) selected.add(point);
    // Heel/toe silhouettes change which surface is lowest as a foot rotates. Cache extrema over its expected pitch range,
    // not only the lowest bind-pose vertex in a bin. Sixteen cells + thirteen extrema + three low points = at most 32/side.
    for (const z of [-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8]) {
      selected.add(foot.reduce((lowest, point) => point.y + z * point.z < lowest.y + z * lowest.z ? point : lowest));
    }
    for (const x of [-0.15, -0.05, 0.05, 0.15]) {
      selected.add(foot.reduce((lowest, point) => point.y + x * point.x < lowest.y + x * lowest.x ? point : lowest));
    }
    foot.sort((a, b) => a.y - b.y);
    for (let index = 0; index < Math.min(3, foot.length); index++) selected.add(foot[index]!);
  }
  const samples = new Map<THREE.SkinnedMesh, number[]>();
  for (const point of [...selected].slice(0, 64)) {
    const vertices = samples.get(point.mesh) ?? [];
    vertices.push(point.vertex); samples.set(point.mesh, vertices);
  }
  return [...samples].map(([mesh, vertices]) => ({ mesh, vertices }));
}

/** Bind pivots the skin repair measures from: shoulders, elbows and palms in the skinned scene's space. */
/** The bones' spans in bind space, for telling a garment's outer face from its lining: spine, arms to the palms, legs to the ankles. */
function residentAxes({ pivots, palmL, palmR }: SkinRepairJoints): ResidentAxis[] {
  const ankle = (knee: THREE.Vector3) => new THREE.Vector3(knee.x, 0.06, knee.z);
  return [
    [pivots.hips, pivots.torso], [pivots.torso, pivots.head], [pivots.head, pivots.head.clone().add(new THREE.Vector3(0, 0.2, 0))],
    [pivots.armL, pivots.elbowL], [pivots.elbowL, palmL], [pivots.armR, pivots.elbowR], [pivots.elbowR, palmR],
    [pivots.legL, pivots.kneeL], [pivots.kneeL, ankle(pivots.kneeL)], [pivots.legR, pivots.kneeR], [pivots.kneeR, ankle(pivots.kneeR)],
  ];
}

function npcRepairJoints(scene: THREE.Group, bones: Record<BoneName, THREE.Bone>): SkinRepairJoints {
  const at = (bone: THREE.Bone) => scene.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
  const pivots = Object.fromEntries(BONES.map(name => [name, at(bones[name])])) as Record<BoneName, THREE.Vector3>;
  return { pivots, palmL: measuredPalm(scene, bones.elbowL, bones.armL), palmR: measuredPalm(scene, bones.elbowR, bones.armR) };
}

/** Figures without a resident style: how they are built and what they do. */
const ROLE_MOTION: Readonly<Record<string, { build: Build; work?: WorkGesture }>> = {
  'ambient:fisher': { build: 'man', work: 'mending' }, 'ambient:fireside': { build: 'woman' }, 'ambient:keeper': { build: 'man' },
  'enemy:ford_bandit_a': { build: 'man' }, 'enemy:ford_bandit_b': { build: 'man' }, 'menu:warden': { build: 'man', work: 'guard' },
};

export class MeshyNpcCatalog {
  constructor(readonly manifest: MeshyNpcManifest, private readonly templates: ReadonlyMap<string, GLTF>,
    private readonly rigs: ReadonlyMap<string, ResidentRigData> = new Map(), readonly library: ResidentMotionLibrary | null = null) {}
  /** Whether this catalog holds the role's model: a world opened with only the near residents lacks the rest (stage 2). */
  has(role: string): boolean {
    const id = this.manifest.roles[role];
    return !!id && this.templates.has(id);
  }
  /**
   * The place of a figure whose model is still on its way (stage 2): a body as tall as theirs with nothing to draw, so
   * routes, seats and beds are found for them as before, until create() makes the real one.
   */
  standIn(role: string, heightScale = 1, grip: Grip = 'none'): Rig {
    const entry = this.manifest.assets.find(candidate => candidate.id === this.manifest.roles[role]);
    return createStandInRig((entry?.height ?? 1.8) * heightScale, grip);
  }
  create(role: string, heightScale = 1, grip: Grip = 'none', options?: NpcRigOptions): Rig {
    const id = this.manifest.roles[role], entry = this.manifest.assets.find(candidate => candidate.id === id);
    const asset = id && this.templates.get(id);
    if (!entry || !asset) throw new Error(`Resident model ${role} has not been prepared.`);
    const equipment = role === 'enemy:ford_bandit_b' ? 'club' : role === 'enemy:ford_bandit_a' ? 'blade' : role === 'named:shrine_warden' ? 'sheathed' : undefined;
    const resident = role.startsWith('named:') ? role.slice('named:'.length) as NpcId : null;
    const style = resident ? npcStyle(resident) : null;
    const task = style?.work;
    const work = task === 'writing' || task === 'provisioning' || task === 'stonework' || task === 'measuring' ? task : undefined;
    const data = this.rigs.get(id);
    const known = ROLE_MOTION[role];
    const motion: ResidentMotionSource | undefined = data && this.library ? {
      data, library: this.library,
      build: style ? (style.build === 'woman' ? 'woman' : style.build === 'man' ? 'man' : 'neutral') : known?.build ?? 'neutral',
      seed: style?.faceSeed ?? [...role].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261),
      fighter: role.startsWith('enemy:'), work: task ?? known?.work,
    } : undefined;
    return createMeshyNpcRig(asset, entry, heightScale, grip, equipment, { work, ...options }, motion);
  }
}

const rigRequests = new Map<string, Promise<ResidentRigData | null>>();
let libraryRequest: Promise<ResidentMotionLibrary | null> | null = null;

/** A small file the manifest lists, checked by size and hash before it is used. */
function fetchChecked(file: MeshyNpcFile): Promise<ArrayBuffer> {
  return downloadAsset(meshyNpcUrl(file.file), { label: file.file, bytes: file.bytes, sha256: file.sha256 });
}

/**
 * A model's own rig, checked against the model it was made for. A resident whose rig is missing or fails its checks
 * keeps the procedural poser rather than holding up the world.
 */
function loadResidentRigFile(entry: MeshyNpcEntry): Promise<ResidentRigData | null> {
  if (!entry.rig) return Promise.resolve(null);
  const key = `${entry.id}|${entry.rig.sha256}`;
  let request = rigRequests.get(key);
  if (!request) {
    request = fetchChecked(entry.rig)
      .then(buffer => {
        const data = parseResidentRig(JSON.parse(new TextDecoder().decode(buffer)));
        if (data.modelSha256 !== entry.sha256) throw new Error(`Resident ${entry.id} rig was made for another model.`);
        return data;
      })
      .catch(error => { console.warn(`Resident ${entry.id} keeps its procedural poser:`, error); rigRequests.delete(key); return null; });
    rigRequests.set(key, request);
  }
  return request;
}

/** The residents' motion library, loaded once for every catalog that has rigs. */
function loadResidentMotionLibrary(file: MeshyNpcFile | undefined): Promise<ResidentMotionLibrary | null> {
  if (!file) return Promise.resolve(null);
  if (!libraryRequest) {
    libraryRequest = fetchChecked(file)
      .then(buffer => createGltfLoader().parseAsync(buffer, new URL('.', meshyNpcUrl(file.file)).href))
      .then(gltf => residentMotionLibrary(gltf))
      .catch(error => { console.warn('Residents keep their procedural poser:', error); libraryRequest = null; return null; });
  }
  return libraryRequest;
}

const templates = new Map<string, Promise<GLTF>>();
interface CatalogProgress { loaded: number; total: number; complete: boolean; failed: boolean; listeners: Set<ModelLoadProgress> }
const catalogs = new Map<string, { request: Promise<MeshyNpcCatalog>; progress: CatalogProgress }>();
let manifestRequest: Promise<MeshyNpcManifest> | null = null;

function fetchNpc(url: URL): Promise<ArrayBuffer> {
  return downloadAsset(url, { label: 'Resident models' });
}

function loadNpcManifest(): Promise<MeshyNpcManifest> {
  if (!manifestRequest) {
    manifestRequest = fetchNpc(meshyNpcUrl()).then(buffer => validateMeshyNpcManifest(JSON.parse(new TextDecoder().decode(buffer))))
      .catch(error => { manifestRequest = null; throw error; });
  }
  return manifestRequest;
}

/** Only requested roles download; menu/world catalogs share immutable GLBs and the global decode budget.
 * A failed request remains visible and retryable without discarding accepted resident templates. */
export function loadMeshyNpcCatalog(progress?: ModelLoadProgress, requiredRoles: readonly string[] = NPC_ROLES): Promise<MeshyNpcCatalog> {
  const roles = [...new Set(requiredRoles)];
  // No roles at all is a catalog of the manifest and the motion library: a world entered far from everyone (stage 2).
  if (roles.some(role => !NPC_ROLES.includes(role))) return Promise.reject(new Error('The requested resident roles are invalid.'));
  const key = JSON.stringify([...roles].sort()), cached = catalogs.get(key);
  if (cached) {
    const status = cached.progress;
    if (progress) {
      if (status.total) progress(status.loaded, status.total);
      if (!status.complete && !status.failed) status.listeners.add(progress);
    }
    return cached.request;
  }
  const status: CatalogProgress = { loaded: 0, total: 0, complete: false, failed: false, listeners: new Set(progress ? [progress] : []) };
  const report = (loaded: number, total: number) => {
    status.loaded = loaded; status.total = total;
    for (const listener of status.listeners) listener(loaded, total);
  };
  const request = (async () => {
    const manifest = await loadNpcManifest();
    const selected = [...new Set(roles.map(role => manifest.roles[role]!))];
    const loaded = new Map<string, GLTF>();
    let next = 0, done = 0, failed = false;
    report(0, selected.length);
    await Promise.all(Array.from({ length: Math.min(4, selected.length) }, async () => {
      try {
        while (next < selected.length && !failed) {
          const id = selected[next++]!, entry = manifest.assets.find(candidate => candidate.id === id)!;
          const url = meshyNpcUrl(entry.file), key = `${url.href}|${entry.sha256}`;
          let template = templates.get(key);
          if (!template) {
            template = withModelLoadSlot(async () => {
              const buffer = await downloadAsset(url, { label: `Resident ${id}`, bytes: entry.bytes, sha256: entry.sha256 });
              if (buffer.byteLength < 20) throw new Error(`Resident ${id} download is incomplete.`);
              const header = new DataView(buffer);
              if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== buffer.byteLength) throw new Error(`Resident ${id} is not a complete GLB 2 file.`);
              const asset = await createGltfLoader().parseAsync(buffer, new URL('.', url).href);
              validateMeshyNpcAsset(asset, entry);
              return asset;
            }).catch(error => { templates.delete(key); throw error; });
            templates.set(key, template);
          }
          loaded.set(id, await template);
          // A sibling failure may already have put up Retry. Late downloads cannot overwrite that recovery button.
          if (!failed) report(++done, selected.length);
        }
      } catch (error) { failed = true; throw error; }
    }));
    // Each model's own rig and the shared motion library (small files beside the models).
    const [library, ...rigFiles] = await Promise.all([loadResidentMotionLibrary(manifest.motion),
      ...selected.map(id => loadResidentRigFile(manifest.assets.find(candidate => candidate.id === id)!))]);
    const rigs = new Map<string, ResidentRigData>();
    selected.forEach((id, i) => { const data = rigFiles[i]; if (data) rigs.set(id, data); });
    status.complete = true; status.listeners.clear();
    return new MeshyNpcCatalog(manifest, loaded, rigs, library);
  })().catch(error => { status.failed = true; status.listeners.clear(); catalogs.delete(key); throw error; });
  catalogs.set(key, { request, progress: status });
  return request;
}
