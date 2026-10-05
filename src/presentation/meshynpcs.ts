import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { NPCS } from '../content/npcs';
import { createNpcAttachments, setArmed, type Grip, type Rig, type NpcEquipment, type Mode } from './characters';
import { BONES, type BoneName } from './human/skin';

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
  return new URL(`${base}models/npcs/${file}`, page);
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
      || !/^[0-9a-f]{64}$/.test(entry.sha256) || !Number.isFinite(entry.height) || entry.height < 1.4 || entry.height > 2.2) {
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

/** A private animated skeleton and GPU resources per actor/world; only decoded image pixels are shared. */
export function createMeshyNpcRig(asset: Pick<GLTF, 'scene' | 'animations'>, entry: MeshyNpcEntry, heightScale = 1, grip: Grip = 'none', equipment?: NpcEquipment): Rig {
  if (!Number.isFinite(heightScale) || heightScale < 0.7 || heightScale > 1.4) throw new Error('Resident height scale is invalid.');
  const root = new THREE.Group(), body = new THREE.Group();
  root.name = `Resident / ${entry.id}`; body.name = 'Resident / visual action pivot'; root.add(body);
  const scene = cloneSkinned(asset.scene) as THREE.Group;
  body.add(scene);
  const bones = bindNpcBones(scene);
  const geometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
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
      if ((copy as THREE.MeshStandardMaterial).isMeshStandardMaterial) paint.push(copy as THREE.MeshStandardMaterial);
    }
    return copy;
  };
  scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    let geometry = geometries.get(mesh.geometry);
    if (!geometry) { geometry = mesh.geometry.clone(); geometries.set(mesh.geometry, geometry); }
    mesh.geometry = geometry;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(ownMaterial) : ownMaterial(mesh.material);
    mesh.castShadow = mesh.receiveShadow = true;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
      const skin = mesh as THREE.SkinnedMesh;
      skin.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, entry.height / 2, 0), entry.height * 1.2);
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
    attachmentTriangles: completeTriangles - entry.triangles, animation: 'derived-game-poser' };
  const rig: Rig = {
    root, body, hips: bones.hips, torso: bones.torso, head: bones.head,
    armL: bones.armL, armR: bones.armR, elbowL: bones.elbowL, elbowR: bones.elbowR,
    legL: bones.legL, legR: bones.legR, kneeL: bones.kneeL, kneeR: bones.kneeR,
    weapon: attachments?.weapon ?? null, shield: null, scabbard: attachments?.scabbard ?? null, sheathed: attachments?.sheathed ?? null, sash: null,
    grip, height: entry.height * heightScale, hipY: bones.hips.position.y,
    cur: Object.fromEntries(ANGLES.map(key => [key, 0])), materials: paint, hitFlash: 0, kind: 'humanoid',
  };
  const sole = npcSoleSamples(scene);
  rig.npc = { settle(mode: Mode) {
    root.userData.meshyNpc.soleClearance = 0;
    if (!sole.length || mode === 'dead' || mode === 'dodge') return;
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
    body.position.y += clearance;
    root.userData.meshyNpc.soleClearance = clearance;
  } };
  root.userData.meshyNpc.soleSamples = sole.reduce((total, sample) => total + sample.vertices.length, 0);
  if (carried) setArmed(rig, carried === 'sheathed' ? 'sheathed' : 'drawn');
  return rig;
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

/** Palm centre inferred from the lower tip of the source's actual elbow-weighted surface, with a bounded fallback for synthetic fixtures. */
function measuredPalm(scene: THREE.Group, elbow: THREE.Bone, arm: THREE.Bone): THREE.Vector3 {
  const candidates: THREE.Vector3[] = [], point = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  scene.traverse(object => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const joint = mesh.skeleton.bones.indexOf(elbow), position = mesh.geometry.getAttribute('position');
    const indices = mesh.geometry.getAttribute('skinIndex'), weights = mesh.geometry.getAttribute('skinWeight');
    for (let vertex = 0; vertex < position.count; vertex++) {
      let weight = 0;
      for (let slot = 0; slot < 4; slot++) if (indices.getComponent(vertex, slot) === joint) weight += weights.getComponent(vertex, slot);
      if (weight < 0.6) continue;
      point.fromBufferAttribute(position, vertex); mesh.localToWorld(point); scene.worldToLocal(point);
      candidates.push(point.clone());
    }
  });
  const at = elbow.getWorldPosition(new THREE.Vector3()); scene.worldToLocal(at);
  const shoulder = arm.getWorldPosition(new THREE.Vector3()); scene.worldToLocal(shoulder);
  const fallback = at.clone().add(new THREE.Vector3(0.013, -Math.max(0.18, shoulder.y - at.y) - 0.035, 0.012));
  if (candidates.length < 12) return fallback;
  const bottom = Math.min(...candidates.map(candidate => candidate.y));
  const hand = candidates.filter(candidate => candidate.y <= bottom + 0.085);
  if (hand.length < 6 || bottom < at.y - 0.6 || bottom > at.y - 0.1) return fallback;
  const palm = hand.reduce((sum, candidate) => sum.add(candidate), new THREE.Vector3()).multiplyScalar(1 / hand.length);
  // The grasp lands above fingertips and near the centre of the glove, including chunky armour variants.
  palm.y = bottom + 0.065;
  return palm;
}

export class MeshyNpcCatalog {
  constructor(readonly manifest: MeshyNpcManifest, private readonly templates: ReadonlyMap<string, GLTF>) {}
  create(role: string, heightScale = 1, grip: Grip = 'none'): Rig {
    const id = this.manifest.roles[role], entry = this.manifest.assets.find(candidate => candidate.id === id);
    const asset = id && this.templates.get(id);
    if (!entry || !asset) throw new Error(`Resident model ${role} has not been prepared.`);
    const equipment = role === 'enemy:ford_bandit_b' ? 'club' : role === 'enemy:ford_bandit_a' ? 'blade' : role === 'named:shrine_warden' ? 'sheathed' : undefined;
    return createMeshyNpcRig(asset, entry, heightScale, grip, equipment);
  }
}

let pending: Promise<MeshyNpcCatalog> | null = null;
const templates = new Map<string, Promise<GLTF>>();

async function fetchNpc(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Resident models could not load (HTTP ${response.status}).`);
    if (response.headers.get('content-type')?.includes('text/html')) throw new Error('Resident model URL returned a page instead of model data.');
    // Buffer while the timeout still covers the download, not just response headers.
    return new Response(await response.arrayBuffer(), { headers: response.headers });
  } finally { clearTimeout(timeout); }
}

/** Required roles only, four downloads at a time. A failed download remains a visible, retryable loading error. */
export function loadMeshyNpcCatalog(progress?: (loaded: number, total: number) => void): Promise<MeshyNpcCatalog> {
  if (pending) return pending;
  pending = (async () => {
    const manifest = validateMeshyNpcManifest(await (await fetchNpc(meshyNpcUrl())).json());
    const selected = [...new Set(NPC_ROLES.map(role => manifest.roles[role]!))];
    const loaded = new Map<string, GLTF>();
    let next = 0, done = 0, failed = false;
    progress?.(0, selected.length);
    await Promise.all(Array.from({ length: Math.min(4, selected.length) }, async () => {
      try {
        while (next < selected.length && !failed) {
          const id = selected[next++]!, entry = manifest.assets.find(candidate => candidate.id === id)!;
          const url = meshyNpcUrl(entry.file), key = `${url.href}|${entry.sha256}`;
          let template = templates.get(key);
          if (!template) {
            template = (async () => {
              const buffer = await (await fetchNpc(url)).arrayBuffer();
              if (buffer.byteLength !== entry.bytes || buffer.byteLength < 20) throw new Error(`Resident ${id} download is incomplete.`);
              const header = new DataView(buffer);
              if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== buffer.byteLength) throw new Error(`Resident ${id} is not a complete GLB 2 file.`);
              const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))].map(byte => byte.toString(16).padStart(2, '0')).join('');
              if (digest !== entry.sha256) throw new Error(`Resident ${id} download failed its integrity check.`);
              const asset = await new GLTFLoader().parseAsync(buffer, new URL('.', url).href);
              validateMeshyNpcAsset(asset, entry);
              return asset;
            })().catch(error => { templates.delete(key); throw error; });
            templates.set(key, template);
          }
          loaded.set(id, await template);
          // A sibling failure may already have put up Retry. Late downloads cannot overwrite that recovery button.
          if (!failed) progress?.(++done, selected.length);
        }
      } catch (error) { failed = true; throw error; }
    }));
    return new MeshyNpcCatalog(manifest, loaded);
  })().catch(error => { pending = null; throw error; });
  return pending;
}
