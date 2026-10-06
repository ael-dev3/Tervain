import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Collider } from '../world/colliders';
import type { PhysicalActor } from '../world/physics';
import { mulberry32 } from '../world/noise';
import type { V2 } from '../world/layout';
import type { BuildContext, FrameContext, SceneModule } from './context';
import { modelAssetUrl } from './assets/modelUrl';
import { ANIMAL_AUDIO, ANIMAL_CALL_EVENT, type AnimalCall } from './sound/animalAudio';
import { ANIMALS, ANIMAL_SPEEDS, ANIMAL_TRIANGLE_LIMIT, requiredAnimalClips, type AnimalClip, type AnimalDefinition, type AnimalSpecies } from './animals/catalog';
import { animalGroundAllowed, animalHabitatAllowed, animalNavigationColliders, findAnimalPath, findAnimalSite, type AnimalSite } from './animals/navigation';
import { AnimalHunting, type HuntingAnimal } from './animals/hunting/adapter';
import type { AnimalArrowHit } from './animals/hunting/hit';
import type { AnimalId, HuntingState } from '../game/hunting';

export { ANIMALS, ANIMAL_TRIANGLE_LIMIT } from './animals/catalog';
export type AnimalTemplates = ReadonlyMap<string, GLTF>;
export type AnimalCallEvent = AnimalCall;
export { ANIMAL_CALL_EVENT } from './sound/animalAudio';
const pending = new Map<string, Promise<GLTF>>();
const PAWS = new Set(['frontPawL', 'frontPawR', 'hindPawL', 'hindPawR']);
const SOLE_SAMPLES_PER_PAW = 12;

export function animalModelUrl(definition: AnimalDefinition, base = import.meta.env.BASE_URL, page = document.baseURI): URL {
  return modelAssetUrl(`animals/${definition.file}`, base, page);
}

function boneTrack(track: THREE.KeyframeTrack, bones: ReadonlySet<string>): boolean {
  const binding = THREE.PropertyBinding.parseTrackName(track.name);
  const name = binding.objectName === 'bones' ? binding.objectIndex : binding.nodeName;
  return typeof name === 'string' && bones.has(name) && ['position', 'quaternion', 'scale'].includes(binding.propertyName);
}

type MotionSpeeds = { Walk: number; Run: number };
function modelMotionSpeeds(scene: THREE.Group, definition: AnimalDefinition): MotionSpeeds {
  if (definition.seated) return { Walk: 0, Run: 0 };
  let speeds: Partial<MotionSpeeds> | undefined;
  scene.traverse(object => { if (object.userData.animal?.motionSpeeds) speeds = object.userData.animal.motionSpeeds as Partial<MotionSpeeds>; });
  const motion = speeds as Partial<MotionSpeeds> | undefined;
  if (!motion || !Number.isFinite(motion.Walk) || !Number.isFinite(motion.Run) || motion.Walk! <= 0.1 || motion.Run! <= motion.Walk! || motion.Run! > 8) {
    throw new Error(`The ${definition.species} model requires measured Walk and Run stride speeds.`);
  }
  return { Walk: motion.Walk!, Run: motion.Run! };
}

/** Validate the entire rendered model, including supplied saddles, ears, horns and tails. */
export function validateAnimalTemplate(template: Pick<GLTF, 'scene' | 'animations'>, definition: AnimalDefinition): { bounds: THREE.Box3; triangles: number; motionSpeeds: MotionSpeeds } {
  let triangles = 0, skins = 0;
  const bones = new Set<string>();
  template.scene.traverse(object => { if ((object as THREE.Bone).isBone) bones.add(object.name); });
  template.scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const vertices = mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position')?.count;
    if (!vertices || vertices % 3) throw new Error(`The ${definition.species} model requires complete triangle geometry.`);
    triangles += vertices / 3;
    const parser = (template as GLTF).parser;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const association = parser?.associations?.get(material), authored = association?.materials === undefined ? undefined : parser?.json?.materials?.[association.materials];
      const expected: Record<string, unknown> = { map: authored?.pbrMetallicRoughness?.baseColorTexture,
        roughnessMap: authored?.pbrMetallicRoughness?.metallicRoughnessTexture, metalnessMap: authored?.pbrMetallicRoughness?.metallicRoughnessTexture,
        normalMap: authored?.normalTexture, aoMap: authored?.occlusionTexture, emissiveMap: authored?.emissiveTexture };
      for (const [slot, reference] of Object.entries(expected)) {
        const texture = Reflect.get(material, slot) as THREE.Texture | null | undefined;
        if (!texture && !reference) continue;
        const image = texture?.image as { width?: number; height?: number } | undefined;
        if (!texture?.isTexture || !image || !(image.width! > 0) || !(image.height! > 0)) throw new Error(`The ${definition.species} model texture could not be decoded.`);
      }
    }
    const skinned = object as THREE.SkinnedMesh;
    if (!skinned.isSkinnedMesh) return;
    skins++;
    const positions = mesh.geometry.getAttribute('position'), indices = mesh.geometry.getAttribute('skinIndex'), weights = mesh.geometry.getAttribute('skinWeight');
    if (!positions || !indices || !weights || indices.count !== positions.count || weights.count !== positions.count || skinned.skeleton.bones.length < 12) {
      throw new Error(`The ${definition.species} model requires a complete quadruped skin.`);
    }
    for (let i = 0; i < weights.count; i++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        const joint = indices.getComponent(i, k), weight = weights.getComponent(i, k);
        if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(joint) || joint < 0 || joint >= skinned.skeleton.bones.length) throw new Error(`The ${definition.species} skin has invalid joint weights.`);
        sum += weight;
      }
      if (Math.abs(sum - 1) > 0.02) throw new Error(`The ${definition.species} skin weights are not normalized.`);
    }
  });
  if (!skins || !triangles || triangles > ANIMAL_TRIANGLE_LIMIT) throw new Error(`The ${definition.species} model must be skinned and fit ${ANIMAL_TRIANGLE_LIMIT} triangles (${triangles}).`);
  for (const name of requiredAnimalClips(definition)) {
    const clip = template.animations.find(candidate => candidate.name === name);
    if (!clip || !Number.isFinite(clip.duration) || clip.duration <= 0 || !clip.tracks.some(track => boneTrack(track, bones))) {
      throw new Error(`The ${definition.species} model is missing its skinned ${name} motion.`);
    }
  }
  template.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(template.scene), size = bounds.getSize(new THREE.Vector3());
  if (bounds.isEmpty() || ![size.x, size.y, size.z, bounds.min.y].every(Number.isFinite) || size.y < 0.2 || size.y > 3.4 || size.x > 6 || size.z > 6 || Math.abs(bounds.min.y) > 0.16) {
    throw new Error(`The ${definition.species} model must use grounded, metre-scale geometry.`);
  }
  return { bounds, triangles, motionSpeeds: modelMotionSpeeds(template.scene, definition) };
}

function releaseRejectedTemplate(template: GLTF) {
  const geometry = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  template.scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometry.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometry.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
  const images = new Set<{ close?: () => void }>();
  textures.forEach(value => { value.dispose(); if (value.image) images.add(value.image as { close?: () => void }); });
  images.forEach(value => value.close?.());
}

function loadAnimal(definition: AnimalDefinition): Promise<GLTF> {
  const cached = pending.get(definition.id);
  if (cached) return cached;
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 60_000);
  const request = (async () => {
    const url = animalModelUrl(definition), response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`The ${definition.species} model could not load (HTTP ${response.status}).`);
    if (response.headers.get('content-type')?.includes('text/html')) throw new Error('The animal model URL returned a page instead of model data.');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 12) throw new Error('The animal model download is incomplete.');
    const header = new DataView(bytes);
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== bytes.byteLength) {
      throw new Error('The animal model download is not a complete GLB 2 file.');
    }
    const template = await new GLTFLoader().parseAsync(bytes, new URL('.', url).href);
    try { validateAnimalTemplate(template, definition); } catch (error) { releaseRejectedTemplate(template); throw error; }
    return template;
  })().catch(error => { pending.delete(definition.id); throw error; }).finally(() => clearTimeout(timeout));
  pending.set(definition.id, request);
  return request;
}

/** Required source animals load through the production commit pin, with three bounded concurrent downloads.
 * Rejected art reaches the existing loading Retry; completed CPU templates survive a world reload. */
export async function loadAnimalTemplates(progress?: (loaded: number, total: number) => void,
  definitions: readonly AnimalDefinition[] = ANIMALS): Promise<AnimalTemplates> {
  const templates = new Map<string, GLTF>();
  let next = 0, loaded = 0, failed = false;
  await Promise.all(Array.from({ length: Math.min(3, definitions.length) }, async () => {
    while (!failed && next < definitions.length) {
      const definition = definitions[next++]!;
      try {
        const template = await loadAnimal(definition); templates.set(definition.id, template); loaded++;
        if (!failed) progress?.(loaded, definitions.length);
      } catch (error) { failed = true; throw error; }
    }
  }));
  return templates;
}

/** Own actions on an independently cloned skeleton. Only bones can be clip targets; world placement is authoritative. */
export class AnimalAnimation {
  readonly mixer: THREE.AnimationMixer;
  private actions = new Map<AnimalClip, THREE.AnimationAction>();
  current: AnimalClip = 'Idle';
  constructor(private scene: THREE.Group, clips: readonly THREE.AnimationClip[], species: AnimalSpecies,
    private motionSpeeds: MotionSpeeds = { Walk: ANIMAL_SPEEDS[species].walk, Run: ANIMAL_SPEEDS[species].run }) {
    this.mixer = new THREE.AnimationMixer(scene);
    const bones = new Set<string>(); scene.traverse(object => { if ((object as THREE.Bone).isBone) bones.add(object.name); });
    for (const source of clips) {
      if (!['Idle', 'Walk', 'Run', 'Alert', 'Call', 'Graze', 'Groom', 'Sleep'].includes(source.name)) continue;
      const clip = source.clone(); clip.tracks = clip.tracks.filter(track => boneTrack(track, bones));
      if (!clip.tracks.length) continue;
      const action = this.mixer.clipAction(clip);
      if (['Alert', 'Call', 'Groom'].includes(clip.name)) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
      this.actions.set(clip.name as AnimalClip, action);
    }
    this.actions.get('Idle')?.play();
  }
  duration(clip: AnimalClip) { return this.actions.get(clip)?.getClip().duration ?? 2; }
  has(clip: AnimalClip) { return this.actions.has(clip); }
  referenceSpeed(clip: 'Walk' | 'Run') { return this.motionSpeeds[clip]; }
  transition(clip: AnimalClip) {
    if (clip === this.current) return;
    const next = this.actions.get(clip);
    if (!next) return;
    const previous = this.actions.get(this.current);
    next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    if (previous) previous.crossFadeTo(next, 0.22, false); else next.fadeIn(0.22);
    this.current = clip;
  }
  update(dt: number, speed: number) {
    const action = this.actions.get(this.current);
    if (action && (this.current === 'Walk' || this.current === 'Run')) {
      const reference = this.referenceSpeed(this.current);
      action.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / reference, 0, 1.5));
    }
    this.mixer.update(dt);
  }
  reset() { this.mixer.stopAllAction(); this.current = 'Idle'; this.actions.get('Idle')?.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play(); }
  dispose() { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.scene); }
}

interface AnimalBody {
  scene: THREE.Group;
  bounds: THREE.Box3;
  size: THREE.Vector3;
  triangles: number;
  paws: { mesh: THREE.SkinnedMesh; vertices: number[] }[];
  skeletons: Set<THREE.Skeleton>;
  animation: AnimalAnimation;
}

function cloneAnimal(template: GLTF, definition: AnimalDefinition): AnimalBody {
  const validated = validateAnimalTemplate(template, definition), scene = cloneSkinned(template.scene) as THREE.Group;
  const geometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>(), materials = new Map<THREE.Material, THREE.Material>(), textures = new Map<THREE.Texture, THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>(), paws: AnimalBody['paws'] = [];
  const soles = new Map<string, { mesh: THREE.SkinnedMesh; vertex: number; y: number }[]>();
  const fallbackSoles: { mesh: THREE.SkinnedMesh; vertex: number; y: number }[] = [];
  const ownMaterial = (source: THREE.Material) => {
    let copy = materials.get(source);
    if (!copy) {
      copy = source.clone(); materials.set(source, copy);
      for (const [key, value] of Object.entries(copy)) if (value instanceof THREE.Texture) {
        let texture = textures.get(value); if (!texture) { texture = value.clone(); textures.set(value, texture); }
        Reflect.set(copy, key, texture);
      }
    }
    return copy;
  };
  scene.updateMatrixWorld(true);
  const inverse = scene.matrixWorld.clone().invert(), position = new THREE.Vector3();
  scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    let geometry = geometries.get(mesh.geometry);
    if (!geometry) { geometry = mesh.geometry.clone(); geometries.set(mesh.geometry, geometry); }
    mesh.geometry = geometry;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(ownMaterial) : ownMaterial(mesh.material);
    mesh.receiveShadow = true;
    const skinned = mesh as THREE.SkinnedMesh;
    if (!skinned.isSkinnedMesh) return;
    skeletons.add(skinned.skeleton);
    // Animation can raise heads and swing tails outside the rest sphere.
    geometry.computeBoundingSphere();
    skinned.boundingSphere = geometry.boundingSphere!.clone(); skinned.boundingSphere.radius = skinned.boundingSphere.radius * 1.8 + 0.04;
    const footJoints = new Set(skinned.skeleton.bones.flatMap((bone, index) => PAWS.has(bone.name) ? [index] : []));
    const positions = geometry.getAttribute('position'), skinIndex = geometry.getAttribute('skinIndex'), skinWeight = geometry.getAttribute('skinWeight');
    for (let vertex = 0; vertex < positions.count; vertex++) {
      position.fromBufferAttribute(positions, vertex).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
      if (!footJoints.size) {
        if (position.y <= validated.bounds.min.y + 0.075) fallbackSoles.push({ mesh: skinned, vertex, y: position.y });
        continue;
      }
      let influence = 0, paw = '';
      for (let k = 0; k < 4; k++) {
        const joint = skinIndex.getComponent(vertex, k), weight = skinWeight.getComponent(vertex, k);
        if (!footJoints.has(joint) || weight <= influence) continue;
        influence = weight; paw = skinned.skeleton.bones[joint]!.name;
      }
      if (influence <= 0.35) continue;
      const points = soles.get(paw) ?? []; points.push({ mesh: skinned, vertex, y: position.y }); soles.set(paw, points);
    }
  });
  const byMesh = new Map<THREE.SkinnedMesh, number[]>();
  const retain = (points: typeof fallbackSoles, limit: number) => {
    const minimum = points.reduce((y, point) => Math.min(y, point.y), Infinity);
    const bottom = points.filter(point => point.y <= minimum + 0.075), stride = Math.max(1, Math.ceil(bottom.length / limit));
    bottom.forEach((point, index) => {
      if (index % stride) return;
      const vertices = byMesh.get(point.mesh) ?? []; vertices.push(point.vertex); byMesh.set(point.mesh, vertices);
    });
  };
  // Rest art may hold a paw above the other three. Select each paw's own sole so it can land later;
  // share the 48-sample cap across every mesh of the complete animal.
  if (soles.size) for (const points of soles.values()) retain(points, SOLE_SAMPLES_PER_PAW);
  else retain(fallbackSoles, SOLE_SAMPLES_PER_PAW * 4);
  byMesh.forEach((vertices, mesh) => paws.push({ mesh, vertices }));
  return { scene, bounds: validated.bounds, size: validated.bounds.getSize(new THREE.Vector3()), triangles: validated.triangles,
    paws, skeletons, animation: new AnimalAnimation(scene, template.animations, definition.species, validated.motionSpeeds) };
}

export interface AnimalSnapshot { id: string; species: AnimalSpecies; x: number; y: number; z: number; yaw: number; radius: number; state: AnimalClip | 'Dead' | 'Skinned'; visible: boolean }
interface AnimalInstance extends AnimalBody {
  definition: AnimalDefinition;
  root: THREE.Group;
  home: AnimalSite;
  yaw: number;
  state: AnimalClip;
  stateTime: number;
  rest: number;
  callIn: number;
  callSent: boolean;
  alertIn: number;
  path: V2[];
  blockedFor: number;
  planIn: number;
  turn: THREE.Quaternion;
  rng: () => number;
  alarm: { x: number; z: number; remaining: number } | null;
  initialYaw: number;
}

export interface AnimalWildlife extends SceneModule {
  setPeople(people: readonly PhysicalActor[]): void;
  readonly contacts: readonly Collider[];
  readonly physicalActors: readonly PhysicalActor[];
  snapshot(): AnimalSnapshot[];
  syncHunting(records: HuntingState, restore?: boolean): void;
  traceArrow(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): AnimalArrowHit | null;
  showArrowImpact(hit: AnimalArrowHit, direction: THREE.Vector3): void;
  alertShot(position: { x: number; z: number }, radius?: number): void;
  nearestCarcass: AnimalHunting['nearestCarcass'];
  skinningFrame: AnimalHunting['skinningFrame'];
  setRunning(value: boolean): void;
  setReduceEffects(value: boolean): void;
}

/** Independent peaceful wildlife controllers with optional durable hunting presentation. */
export function buildAnimals(ctx: Pick<BuildContext, 'terrain' | 'colliders' | 'quality'>, templates: AnimalTemplates,
  definitions: readonly AnimalDefinition[] = ANIMALS, emit: (event: AnimalCallEvent) => void = event => window.dispatchEvent(new CustomEvent(ANIMAL_CALL_EVENT, { detail: event }))): AnimalWildlife {
  const group = new THREE.Group(); group.name = 'Land wildlife';
  const animals: AnimalInstance[] = [], occupied: AnimalSite[] = [];
  let people: readonly PhysicalActor[] = [], disposed = false, running = true, calls = 0;
  const { terrain } = ctx, colliders = animalNavigationColliders(ctx.colliders);
  // Fit every habitat before allocating disposable copies, so a bad placement cannot strand a partial set of GPU resources.
  const fitted = definitions.map(definition => {
    const template = templates.get(definition.id);
    if (!template) throw new Error(`The ${definition.species} source model was not loaded.`);
    const size = validateAnimalTemplate(template, definition).bounds.getSize(new THREE.Vector3()), radius = Math.hypot(size.x, size.z) / 2 + 0.14;
    const home = findAnimalSite(definition, radius, terrain, colliders, occupied, size.y); occupied.push(home);
    return { definition, template, home };
  });
  for (const [index, { definition, template, home }] of fitted.entries()) {
    const body = cloneAnimal(template, definition), root = new THREE.Group(); root.name = `${definition.species} / ${definition.id}`; root.add(body.scene);
    body.scene.traverse(object => { if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).castShadow = ctx.quality !== 'low'; });
    const rng = mulberry32(Number(definition.id.slice(-7)) + index * 271), yaw = rng() * Math.PI * 2;
    root.position.set(home.x, terrain.heightAt(home.x, home.z), home.z); root.rotation.y = yaw; group.add(root);
    const state: AnimalClip = body.animation.has('Graze') ? 'Graze' : 'Idle'; body.animation.transition(state);
    const animal: AnimalInstance = { ...body, definition, root, home, yaw, state, stateTime: 0, rest: 3 + rng() * 7,
      callIn: 18 + index * 2.1 + rng() * 25, callSent: false, alertIn: 0, path: [], blockedFor: 0, planIn: 0, turn: new THREE.Quaternion(), rng, alarm: null, initialYaw: yaw };
    animals.push(animal);
  }
  const up = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3(), basis = new THREE.Matrix4(), vertex = new THREE.Vector3();
  const normal: [number, number, number] = [0, 1, 0];
  const enter = (animal: AnimalInstance, state: AnimalClip) => {
    if (animal.state === state) return;
    animal.state = state; animal.stateTime = 0; animal.callSent = false; animal.animation.transition(state);
  };
  const rest = (animal: AnimalInstance) => {
    animal.path = []; animal.rest = 4 + animal.rng() * 9;
    const state = animal.definition.seated ? (animal.rng() < 0.2 ? 'Groom' : 'Idle')
      : animal.animation.has('Graze') && animal.rng() < 0.75 ? 'Graze' : 'Idle';
    enter(animal, state);
  };
  const extrasFor = (animal: AnimalInstance, focus: THREE.Vector3): Collider[] => [
    ...animals.filter(other => other !== animal && hunting.isVisible(other)).map(other => ({ id: `animal:${other.definition.id}`, kind: 'circle' as const, x: other.root.position.x, z: other.root.position.z,
      r: other.home.radius, active: true, minY: other.root.position.y, maxY: other.root.position.y + other.size.y })),
    ...people.filter(person => person.active).map(person => ({ id: person.id, kind: 'circle' as const, x: person.x, z: person.z, r: person.radius + 0.12,
      active: true, minY: person.y, maxY: person.y + person.height })),
    { id: 'wildlife:player', kind: 'circle', x: focus.x, z: focus.z, r: 0.55, active: true, minY: focus.y, maxY: focus.y + 1.9 },
  ];
  const goal = (animal: AnimalInstance, focus: THREE.Vector3, fleeing: boolean): boolean => {
    animal.planIn = 0.9 + animal.rng() * 0.4;
    const start = animal.root.position, allExtras = extrasFor(animal, focus);
    // Yield from a newly approaching actor's avoidance margin; the actual step still resolves the full contacts.
    const extras = allExtras.filter(extra => extra.kind !== 'circle' || Math.hypot(extra.x - start.x, extra.z - start.z) > extra.r + animal.home.radius + 0.05);
    for (let attempt = 0; attempt < 10; attempt++) {
      const a = fleeing ? Math.atan2(start.x - focus.x, start.z - focus.z) + (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * 0.34 : animal.rng() * Math.PI * 2;
      const distance = fleeing ? 7 + attempt * 0.45 : 4 + animal.rng() * Math.max(1, animal.definition.roam * 0.65);
      const candidate = { x: start.x + Math.sin(a) * distance, z: start.z + Math.cos(a) * distance };
      if (Math.hypot(candidate.x - animal.home.x, candidate.z - animal.home.z) > animal.definition.roam) continue;
      const path = findAnimalPath(animal.definition, start, candidate, animal.home, animal.home.radius, terrain, colliders, extras, animal.size.y);
      if (!path?.length) continue;
      animal.path = path; animal.blockedFor = 0; enter(animal, fleeing ? 'Run' : 'Walk'); return true;
    }
    return false;
  };
  const place = (animal: AnimalInstance, dt: number) => {
    const point = animal.root.position;
    terrain.normalAt(point.x, point.z, normal); up.set(...normal);
    forward.set(Math.sin(animal.yaw), 0, Math.cos(animal.yaw)).addScaledVector(up, -forward.dot(up)).normalize();
    right.crossVectors(up, forward).normalize(); forward.crossVectors(right, up).normalize();
    basis.makeBasis(right, up, forward); animal.turn.setFromRotationMatrix(basis);
    animal.root.quaternion.slerp(animal.turn, 1 - Math.exp(-dt * 9));
    point.y = terrain.heightAt(point.x, point.z) - animal.bounds.min.y;
    animal.root.updateMatrixWorld(true); animal.skeletons.forEach(skeleton => skeleton.update());
    let correction = -Infinity;
    for (const paw of animal.paws) for (const index of paw.vertices) {
      paw.mesh.getVertexPosition(index, vertex).applyMatrix4(paw.mesh.matrixWorld);
      correction = Math.max(correction, terrain.heightAt(vertex.x, vertex.z) - vertex.y);
    }
    if (Number.isFinite(correction)) point.y += THREE.MathUtils.clamp(correction, -0.06, 0.18) + 0.006;
    animal.root.updateMatrixWorld(true);
  };
  const hunting = new AnimalHunting(animals, terrain, (body: HuntingAnimal, position) => {
    const animal = body as AnimalInstance;
    animal.alarm = { ...position, remaining: 8 }; animal.path = []; animal.planIn = 0; animal.callSent = true;
    if (!goal(animal, new THREE.Vector3(position.x, terrain.heightAt(position.x, position.z), position.z), true)) enter(animal, 'Alert');
  }, body => {
    const animal = body as AnimalInstance;
    animal.alarm = null; animal.path = []; animal.yaw = animal.initialYaw; animal.root.rotation.set(0, animal.yaw, 0);
    animal.root.position.set(animal.home.x, terrain.heightAt(animal.home.x, animal.home.z), animal.home.z);
    animal.state = 'Idle'; animal.stateTime = 0; animal.callSent = false; animal.callIn = 20 + animal.rng() * 35; rest(animal);
  });
  hunting.group.traverse(object => { if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).castShadow = ctx.quality !== 'low'; });
  group.add(hunting.group);

  return {
    group,
    setPeople(next) { people = next; },
    syncHunting: (records, restore) => hunting.syncHunting(records, restore),
    traceArrow: (origin, direction, distance) => running ? hunting.traceArrow(origin, direction, distance) : null,
    showArrowImpact: (hit, direction) => hunting.showArrowImpact(hit, direction),
    alertShot: (position, radius) => hunting.alertShot(position, radius),
    nearestCarcass: (player, distance) => hunting.nearestCarcass(player, distance),
    skinningFrame: (id: AnimalId, player) => hunting.skinningFrame(id, player),
    setRunning(value) { running = value && !disposed; hunting.setRunning(running); },
    setReduceEffects: value => hunting.setReduceEffects(value),
    get contacts(): Collider[] {
      return animals.filter(animal => hunting.isVisible(animal)).map(animal => hunting.corpseContact(animal) ?? ({ id: `animal:${animal.definition.id}`, kind: 'box', x: animal.root.position.x, z: animal.root.position.z,
        hw: animal.size.x / 2 + 0.07, hd: animal.size.z / 2 + 0.07, yaw: animal.yaw, active: true,
        minY: animal.root.position.y, maxY: animal.root.position.y + animal.size.y }));
    },
    get physicalActors(): PhysicalActor[] {
      return animals.filter(animal => hunting.isVisible(animal)).map(animal => {
        const corpse = hunting.corpseContact(animal);
        return { id: `animal:${animal.definition.id}`, x: corpse?.x ?? animal.root.position.x, y: corpse?.minY ?? animal.root.position.y, z: corpse?.z ?? animal.root.position.z,
          radius: corpse ? corpse.kind === 'box' ? Math.max(.18, Math.hypot(corpse.hw, corpse.hd)) : corpse.r : Math.max(.18, animal.size.x * .5),
          height: corpse ? Math.max(.25, corpse.maxY! - corpse.minY!) : Math.max(animal.size.x, animal.size.y), active: true };
      });
    },
    snapshot: () => animals.map(animal => ({ id: animal.definition.id, species: animal.definition.species, x: animal.root.position.x,
      y: animal.root.position.y, z: animal.root.position.z, yaw: animal.yaw, radius: animal.home.radius,
      state: !hunting.isVisible(animal) ? 'Skinned' : hunting.isDead(animal) ? 'Dead' : animal.state, visible: animal.root.visible })),
    stats: () => ({ animals: animals.length, animalModels: new Set(animals.map(animal => animal.definition.id)).size,
      animalVisible: animals.filter(animal => animal.root.visible).length, animalCalls: calls, animalTriangles: animals.reduce((sum, animal) => sum + animal.triangles, 0),
      animalDead: animals.filter(animal => hunting.isDead(animal)).length, animalSkinned: animals.filter(animal => !hunting.isVisible(animal)).length }),
    update(inputDt: number, frame: FrameContext) {
      if (disposed || !running || frame.wildlifeActive === false) return;
      const dt = Math.min(Math.max(0, inputDt), 0.1);
      hunting.update(dt, frame.reducedMotion);
      hunting.group.traverse(object => { if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).castShadow = frame.quality !== 'low'; });
      for (const animal of animals) {
        const p = animal.root.position, distance = Math.hypot(p.x - frame.focus.x, p.z - frame.focus.z);
        // All nineteen remain in the scene on every preset. Expanded skin bounds let Three's actual
        // camera/shadow frusta reject submissions without a visible distance seam.
        animal.scene.traverse(object => { if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).castShadow = frame.quality !== 'low'; });
        if (!hunting.isVisible(animal) || hunting.isDead(animal)) continue;
        if (animal.alarm) { animal.alarm.remaining -= dt; if (animal.alarm.remaining <= 0) animal.alarm = null; }
        const fleeingFrom = animal.alarm ? new THREE.Vector3(animal.alarm.x, p.y, animal.alarm.z) : frame.focus;
        animal.stateTime += dt; animal.callIn -= dt; animal.alertIn = Math.max(0, animal.alertIn - dt); animal.planIn = Math.max(0, animal.planIn - dt);
        const speeds = ANIMAL_SPEEDS[animal.definition.species];
        if (animal.definition.seated) {
          if (distance < speeds.notice && animal.alertIn <= 0 && animal.state !== 'Alert') { enter(animal, 'Alert'); animal.alertIn = 14; }
        } else if (distance < speeds.flee || animal.alarm) {
          if (animal.planIn <= 0 && (animal.state !== 'Run' || !animal.path.length || animal.blockedFor > 0.4)) {
            if (!goal(animal, fleeingFrom, true)) { animal.path = []; enter(animal, 'Alert'); }
          }
        } else if (distance < speeds.notice && animal.alertIn <= 0 && animal.state !== 'Run' && animal.state !== 'Alert') {
          animal.path = []; enter(animal, 'Alert'); animal.alertIn = 13 + animal.rng() * 12;
        }
        const callNow = animal.state === 'Call' && !animal.callSent && animal.stateTime >= 0.25;
        let speed = 0;
        if (animal.state === 'Walk' || animal.state === 'Run') {
          const target = animal.path[0];
          if (target) {
            const dx = target.x - p.x, dz = target.z - p.z, length = Math.hypot(dx, dz);
            const desiredYaw = Math.atan2(dx, dz), turn = Math.atan2(Math.sin(desiredYaw - animal.yaw), Math.cos(desiredYaw - animal.yaw));
            animal.yaw += THREE.MathUtils.clamp(turn, -dt * 3.5, dt * 3.5);
            const turning = Math.abs(turn) > 0.18;
            const step = turning ? 0 : Math.min(length, dt * animal.animation.referenceSpeed(animal.state));
            const extras = extrasFor(animal, frame.focus);
            const next = colliders.move(p.x, p.z, dx / Math.max(length, 1e-5) * step, dz / Math.max(length, 1e-5) * step, animal.home.radius,
              undefined, { minY: p.y + 0.03, maxY: p.y + animal.size.y }, extras);
            if (animalGroundAllowed(terrain, next, animal.home.radius) && animalHabitatAllowed(animal.definition, next)
              && Math.hypot(next.x - animal.home.x, next.z - animal.home.z) <= animal.definition.roam + 0.01) {
              const travel = Math.hypot(next.x - p.x, next.z - p.z);
              p.x = next.x; p.z = next.z; speed = travel / Math.max(dt, 1e-5);
            }
            animal.blockedFor = !turning && speed < 0.1 ? animal.blockedFor + dt : 0;
            if (length < 0.25 || step >= length && speed > 0) animal.path.shift();
            if (animal.blockedFor > 1 || !animal.path.length) rest(animal);
          } else rest(animal);
        } else {
          if (animal.state === 'Alert') {
            const yaw = Math.atan2(frame.focus.x - p.x, frame.focus.z - p.z), turn = Math.atan2(Math.sin(yaw - animal.yaw), Math.cos(yaw - animal.yaw));
            animal.yaw += THREE.MathUtils.clamp(turn, -dt * 1.4, dt * 1.4);
          }
          const gestureDuration = animal.state === 'Call' ? Math.max(3.8, animal.animation.duration('Call')) : animal.animation.duration(animal.state);
          if (['Call', 'Alert', 'Groom'].includes(animal.state) && animal.stateTime > gestureDuration + 0.2) rest(animal);
          animal.rest -= dt;
          if (animal.callIn <= 0 && distance < ANIMAL_AUDIO.species[animal.definition.species].maxDistance && distance > speeds.flee + 1 && ['Idle', 'Graze', 'Sleep'].includes(animal.state)) {
            enter(animal, 'Call'); animal.callIn = 35 + animal.rng() * 40;
          } else if (animal.rest <= 0 && ['Idle', 'Graze', 'Sleep'].includes(animal.state)) {
            if (animal.definition.seated) { enter(animal, frame.nightness > 0.7 && animal.rng() < 0.55 ? 'Sleep' : 'Groom'); animal.rest = 9 + animal.rng() * 14; }
            else if (!goal(animal, frame.focus, false)) animal.rest = 4 + animal.rng() * 5;
          }
        }
        animal.animation.update(dt, speed); place(animal, dt);
        if (callNow) {
          animal.callSent = true; calls++;
          const mouth = animal.scene.getObjectByName('jaw') ?? animal.scene.getObjectByName('head');
          if (mouth) mouth.getWorldPosition(vertex); else vertex.set(p.x, p.y + animal.size.y * 0.68, p.z);
          emit({ id: animal.definition.id, species: animal.definition.species,
            position: { x: vertex.x, y: vertex.y, z: vertex.z }, callVariant: animal.rng() < 0.5 ? 1 : 2 });
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      hunting.dispose();
      const geometry = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
      for (const animal of animals) {
        animal.animation.dispose(); animal.skeletons.forEach(skeleton => skeleton.dispose());
        animal.scene.traverse(object => {
          const mesh = object as THREE.Mesh; if (!mesh.isMesh) return;
          geometry.add(mesh.geometry);
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            materials.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
          }
        });
      }
      geometry.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
    },
  };
}
