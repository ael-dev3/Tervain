import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { NPCS } from '../content/npcs';
import type { NpcId } from '../game/types';
import { createNpcAttachments, setArmed, type Grip, type Rig, type NpcEquipment, type Mode } from './characters';
import { BONES, type BoneName } from './human/skin';
import { repairNpcSurfaceGeometry, repairNpcSurfaceMaterial } from './npcSurface';
import { installDualQuaternionSkinning } from './npc/dualQuaternionSkinning';
import { applyNpcSkinRepair, computeNpcSkinRepair, type LowerGarment, type SkinRepairJoints } from './npc/skinRepair';
import { fitNpcJoints, measuredPalm, type NpcJointFit } from './npc/jointFit';
import { fitNpcPoses, measureBody, type FittedWork, type NpcPoseFit } from './npc/poseFit';
import { createWorkProp } from './npc/workProps';
import { installResidentSurface, patchResidentShadow, residentHiddenLayers, residentSkinPrior, type ResidentAxis } from './npc/residentSurface';
import { npcStyle, type WorkGesture } from './npcStyle';
import { modelAssetUrl } from './assets/modelUrl';
import { withModelLoadSlot, type ModelLoadProgress } from './assets/modelLoadQueue';

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
}

export interface MeshyNpcManifest {
  schema: 1;
  maxTriangles: number;
  assets: MeshyNpcEntry[];
  roles: Record<string, string>;
}

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
      || (entry.surfaceBake !== undefined && entry.surfaceBake !== 'geometry-only-v1')) {
      throw new Error(`The resident model manifest has an invalid entry (${entry?.id ?? 'unnamed'}).`);
    }
    ids.add(entry.id); files.add(entry.file);
  }
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
}

export const NPC_RIG_DEFAULTS: Required<Omit<NpcRigOptions, 'work'>> & Pick<NpcRigOptions, 'work'> = { dualQuaternion: true, skinRepair: true, jointFit: true, poseFit: true, surface: true };

/** Skin priors per source geometry and repair setting (every actor of one model shares its prior). */
const skinPriors = new WeakMap<THREE.BufferGeometry, Map<string, Float32Array>>();

/** Covered layers per source geometry (npc/residentSurface.ts), shared the same way. */
const hiddenLayers = new WeakMap<THREE.BufferGeometry, Float32Array>();

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
  options: NpcRigOptions = {}): Rig {
  const settings = { ...NPC_RIG_DEFAULTS, ...options };
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
        const priorKey = `${settings.skinRepair}`, source = sourceOf(skin.geometry);
        let priors = skinPriors.get(source);
        if (!priors) { priors = new Map(); skinPriors.set(source, priors); }
        let prior = priors.get(priorKey);
        if (!prior) { prior = residentSkinPrior(skin.geometry, names); priors.set(priorKey, prior); }
        let hidden = hiddenLayers.get(source);
        if (!hidden) { hidden = residentHiddenLayers(source, names, residentAxes(repairJoints ?? npcRepairJoints(scene, bones))); hiddenLayers.set(source, hidden); }
        for (const material of Array.isArray(skin.material) ? skin.material : [skin.material]) {
          if ((material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            installResidentSurface(material as THREE.MeshStandardMaterial, skin.geometry, prior,
              { metal: (material as THREE.MeshStandardMaterial).metalness > 0.1, hidden });
          }
        }
      }
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
  if (attachments) {
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
  const rig: Rig = {
    root, body, hips: bones.hips, torso: bones.torso, head: bones.head,
    armL: bones.armL, armR: bones.armR, elbowL: bones.elbowL, elbowR: bones.elbowR,
    legL: bones.legL, legR: bones.legR, kneeL: bones.kneeL, kneeR: bones.kneeR,
    weapon: attachments?.weapon ?? null, shield: null, scabbard: attachments?.scabbard ?? null, sheathed: attachments?.sheathed ?? null, sash: null,
    grip, height: entry.height * heightScale, hipY: bones.hips.position.y,
    cur: Object.fromEntries(ANGLES.map(key => [key, 0])), materials: paint, hitFlash: 0, kind: 'humanoid',
  };
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

export class MeshyNpcCatalog {
  constructor(readonly manifest: MeshyNpcManifest, private readonly templates: ReadonlyMap<string, GLTF>) {}
  create(role: string, heightScale = 1, grip: Grip = 'none', options?: NpcRigOptions): Rig {
    const id = this.manifest.roles[role], entry = this.manifest.assets.find(candidate => candidate.id === id);
    const asset = id && this.templates.get(id);
    if (!entry || !asset) throw new Error(`Resident model ${role} has not been prepared.`);
    const equipment = role === 'enemy:ford_bandit_b' ? 'club' : role === 'enemy:ford_bandit_a' ? 'blade' : role === 'named:shrine_warden' ? 'sheathed' : undefined;
    const resident = role.startsWith('named:') ? role.slice('named:'.length) as NpcId : null;
    const task = resident ? npcStyle(resident).work : undefined;
    const work = task === 'writing' || task === 'provisioning' || task === 'stonework' || task === 'measuring' ? task : undefined;
    return createMeshyNpcRig(asset, entry, heightScale, grip, equipment, { work, ...options });
  }
}

const templates = new Map<string, Promise<GLTF>>();
interface CatalogProgress { loaded: number; total: number; complete: boolean; failed: boolean; listeners: Set<ModelLoadProgress> }
const catalogs = new Map<string, { request: Promise<MeshyNpcCatalog>; progress: CatalogProgress }>();
let manifestRequest: Promise<MeshyNpcManifest> | null = null;

async function fetchNpc(url: URL): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Resident models could not load (HTTP ${response.status}).`);
    if (response.headers.get('content-type')?.includes('text/html')) throw new Error('Resident model URL returned a page instead of model data.');
    // Buffer while the timeout still covers the download, not just response headers.
    return await response.arrayBuffer();
  } finally { clearTimeout(timeout); }
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
  if (!roles.length || roles.some(role => !NPC_ROLES.includes(role))) return Promise.reject(new Error('The requested resident roles are invalid.'));
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
              const buffer = await fetchNpc(url);
              if (buffer.byteLength !== entry.bytes || buffer.byteLength < 20) throw new Error(`Resident ${id} download is incomplete.`);
              const header = new DataView(buffer);
              if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== buffer.byteLength) throw new Error(`Resident ${id} is not a complete GLB 2 file.`);
              const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))].map(byte => byte.toString(16).padStart(2, '0')).join('');
              if (digest !== entry.sha256) throw new Error(`Resident ${id} download failed its integrity check.`);
              const asset = await new GLTFLoader().parseAsync(buffer, new URL('.', url).href);
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
    status.complete = true; status.listeners.clear();
    return new MeshyNpcCatalog(manifest, loaded);
  })().catch(error => { status.failed = true; status.listeners.clear(); catalogs.delete(key); throw error; });
  catalogs.set(key, { request, progress: status });
  return request;
}
