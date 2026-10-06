import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AnimalDefinition } from './catalog';
import type { AnimalBehavior } from './behavior';
import type { AnimalGround } from './navigation';
import { disposeSceneResources } from '../disposeScene';
import { AnimalArrowSurface } from './hit';

const REQUIRED_CLIPS = ['Idle', 'Walk', 'Run', 'Call'] as const;
const PAWS = ['FrontLeftFoot', 'FrontRightFoot', 'BackLeftFoot', 'BackRightFoot'] as const;

/** Every resident owns its decoded scene and skeleton; no global GLTF cache survives an eviction. */
export class AnimalRig {
  readonly root = new THREE.Group();
  readonly mixer: THREE.AnimationMixer;
  readonly triangles: number;
  readonly joints: number;
  readonly height: number;
  readonly clips: ReadonlyMap<string, THREE.AnimationClip>;
  readonly arrowSurface: AnimalArrowSurface;
  activeClip = 'Idle';
  private action: THREE.AnimationAction;
  private soles: { mesh: THREE.SkinnedMesh; vertex: number }[] = [];
  private point = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private normal = new THREE.Vector3();
  private turn = new THREE.Quaternion();
  private disposed = false;
  private corpseSurfaces: { mesh: THREE.SkinnedMesh; vertex: number }[] = [];
  private restBones: { bone: THREE.Bone; rest: THREE.Quaternion }[] = [];
  private death: { elapsed: number; poses: { bone: THREE.Bone; start: THREE.Quaternion; end: THREE.Quaternion }[]; side: number; exactSupport: number | null } | null = null;
  constructor(readonly definition: AnimalDefinition, readonly asset: Pick<GLTF, 'scene' | 'animations'>) {
    this.root.name = `animal:${definition.id}`;
    this.root.add(asset.scene);
    this.clips = new Map(asset.animations.map((clip) => [clip.name, clip]));
    for (const name of REQUIRED_CLIPS) if (!this.clips.has(name)) throw new Error(`${definition.id} is missing its native ${name} animation.`);
    let triangles = 0;
    const bones = new Set<THREE.Bone>();
    asset.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position?.count ?? 0) / 3;
      mesh.castShadow = mesh.receiveShadow = true;
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) for (const bone of (mesh as THREE.SkinnedMesh).skeleton.bones) bones.add(bone);
    });
    this.restBones = [...bones].map((bone) => ({ bone, rest: bone.quaternion.clone() }));
    this.triangles = triangles; this.joints = bones.size;
    if (triangles > 50_000 || triangles < 1 || bones.size < 12) throw new Error(`${definition.id} violates its 50,000-triangle rigged model contract.`);
    const bounds = new THREE.Box3().setFromObject(asset.scene);
    this.height = bounds.max.y - bounds.min.y;
    const sphere = bounds.getBoundingSphere(new THREE.Sphere()); sphere.radius += .35;
    asset.scene.traverse((object) => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = object as THREE.SkinnedMesh;
        mesh.boundingSphere = sphere.clone();
        // Box3 computed a bind-pose box above. Native gait/head motion must not be rejected by that stale raycast box.
        (mesh as unknown as { boundingBox: THREE.Box3 | null }).boundingBox = null;
      }
    });
    this.mixer = new THREE.AnimationMixer(asset.scene);
    this.action = this.mixer.clipAction(this.clips.get('Idle')!).play();
    this.arrowSurface = new AnimalArrowSurface(definition, asset.scene);
    asset.scene.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      const position = mesh.geometry.attributes.position!, indices = mesh.geometry.attributes.skinIndex!, weights = mesh.geometry.attributes.skinWeight!;
      const supportPatches = new Map<string, { min: number; max: number }>();
      for (let vertex = 0; vertex < position.count; vertex++) {
        // A roll puts the animal's flank on the ground. Retain both lateral extremes across body/leg/head patches.
        const y = Math.min(7, Math.floor((position.getY(vertex) - bounds.min.y) / Math.max(.001, this.height) * 8));
        const z = Math.min(7, Math.floor((position.getZ(vertex) - bounds.min.z) / Math.max(.001, bounds.max.z - bounds.min.z) * 8));
        const key = `${y},${z}`, patch = supportPatches.get(key);
        if (!patch) supportPatches.set(key, { min: vertex, max: vertex });
        else {
          if (position.getX(vertex) < position.getX(patch.min)) patch.min = vertex;
          if (position.getX(vertex) > position.getX(patch.max)) patch.max = vertex;
        }
      }
      for (const vertex of new Set([...supportPatches.values()].flatMap((patch) => [patch.min, patch.max]))) this.corpseSurfaces.push({ mesh, vertex });
      for (const footName of PAWS) {
        const region = new Set(mesh.skeleton.bones.flatMap((bone, index) => bone.name === footName || bone.name === footName.replace('Foot', 'Lower') ? [index] : []));
        const candidates: { vertex: number; y: number }[] = [];
        for (let vertex = 0; vertex < position.count; vertex++) {
          if (position.getY(vertex) > bounds.min.y + this.height * .25) continue;
          let weight = 0;
          for (let component = 0; component < 4; component++) if (region.has(indices.getComponent(vertex, component))) weight += weights.getComponent(vertex, component);
          if (weight >= .35) candidates.push({ vertex, y: position.getY(vertex) });
        }
        candidates.sort((a, b) => a.y - b.y);
        const unique = new Set<string>();
        for (const candidate of candidates) {
          const vertex = candidate.vertex;
          // UV seams duplicate positions. Spread the samples over distinct centimetre-sized sole patches.
          const key = `${Math.round(position.getX(vertex) * 100)},${Math.round(position.getY(vertex) * 100)},${Math.round(position.getZ(vertex) * 100)}`;
          if (unique.has(key)) continue;
          unique.add(key); this.soles.push({ mesh, vertex });
          if (unique.size === 8) break;
        }
      }
    });
  }

  animate(dt: number, behavior: AnimalBehavior, speed: number, reducedMotion: boolean, forcedClip: string | null = null) {
    if (this.death) return;
    const desired = forcedClip && this.clips.has(forcedClip) ? forcedClip : behavior === 'call' ? 'Call'
      : speed > .02 ? behavior === 'flee' ? 'Run' : 'Walk' : behavior === 'graze' && this.clips.has('Graze') ? 'Graze' : 'Idle';
    if (desired !== this.activeClip) {
      const next = this.mixer.clipAction(this.clips.get(desired)!);
      next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
      this.action.crossFadeTo(next, .18, false);
      this.action = next; this.activeClip = desired;
    }
    // Native gait time follows resolved ground movement, including steering and blocked steps.
    const reference = this.activeClip === 'Run' ? this.definition.runSpeed : this.definition.walkSpeed;
    this.action.timeScale = forcedClip ? 1 : (this.activeClip === 'Run' || this.activeClip === 'Walk') ? Math.max(.1, speed / Math.max(.1, reference)) : 1;
    this.mixer.update(Math.max(0, dt) * (reducedMotion && (desired === 'Idle' || desired === 'Graze') ? .45 : 1));
  }

  /** Follow the visible terrain, with bounded actual paw-surface samples rather than ankle-height assumptions. */
  ground(terrain: AnimalGround, x: number, z: number, yaw: number) {
    const e = Math.max(.3, this.definition.radius);
    const y = terrain.heightAt(x, z);
    const dx = (terrain.heightAt(x + e, z) - terrain.heightAt(x - e, z)) / (e * 2);
    const dz = (terrain.heightAt(x, z + e) - terrain.heightAt(x, z - e)) / (e * 2);
    this.normal.set(-dx, 1, -dz).normalize();
    this.turn.setFromAxisAngle(this.up, yaw);
    this.root.quaternion.setFromUnitVectors(this.up, this.normal).multiply(this.turn);
    this.root.position.set(x, y + .012, z);
    this.root.updateMatrixWorld(true);
    let support = 0;
    for (const sole of this.soles) {
      sole.mesh.getVertexPosition(sole.vertex, this.point);
      sole.mesh.localToWorld(this.point);
      support = Math.max(support, terrain.heightAt(this.point.x, this.point.z) + .012 - this.point.y);
    }
    // A body support adjustment preserves the native leg curves and avoids stretching a leaf foot bone.
    // Local terrain steering already rejects steep/wet patches; this is approximate support, not foot IK.
    if (support > 0) {
      this.root.position.y += support;
      this.root.updateMatrixWorld(true);
    }
  }

  /** One articulated collapse, followed by a stable grounded pose. Reloaded deaths start in their final pose. */
  beginDeath(terrain: AnimalGround, x: number, z: number, yaw: number, immediate = false) {
    if (!this.death) {
      this.mixer.stopAllAction(); this.activeClip = 'Dead';
      const side = [...this.definition.id].reduce((value, char) => value + char.charCodeAt(0), 0) % 2 ? -1 : 1;
      const poses = this.restBones.map(({ bone, rest }) => {
        const rotation = new THREE.Euler();
        if (bone.name.endsWith('Upper')) { rotation.x = bone.name.startsWith('Front') ? -.28 : .38; rotation.z = side * .12; }
        if (bone.name.endsWith('Lower')) rotation.x = .48;
        if (bone.name.endsWith('Foot')) rotation.x = -.18;
        if (bone.name === 'Neck') rotation.x = .18;
        if (bone.name === 'Head') {
          rotation.x = .24; rotation.z = side * .12;
          // Let the antlered skull rest at an angle; a full sideways crown would prop the whole torso in the air.
          if (this.definition.species === 'deer' || this.definition.species === 'stag') rotation.y = -side * .6;
        }
        if (bone.name === 'Tail1' || bone.name === 'Tail2') rotation.x = .2;
        return { bone, start: bone.quaternion.clone(), end: rest.clone().multiply(new THREE.Quaternion().setFromEuler(rotation)) };
      });
      this.death = { elapsed: immediate ? 1 : 0, poses, side, exactSupport: null };
    }
    if (immediate) this.death.elapsed = 1;
    this.updateDeath(0, terrain, x, z, yaw);
  }

  updateDeath(dt: number, terrain: AnimalGround, x: number, z: number, yaw: number) {
    const death = this.death;
    if (!death) return;
    death.elapsed = Math.min(1, death.elapsed + Math.max(0, dt) / .9);
    const phase = death.elapsed * death.elapsed * (3 - 2 * death.elapsed);
    for (const pose of death.poses) pose.bone.quaternion.slerpQuaternions(pose.start, pose.end, phase);
    const e = Math.max(.3, this.definition.radius), y = terrain.heightAt(x, z);
    const dx = (terrain.heightAt(x + e, z) - terrain.heightAt(x - e, z)) / (2 * e);
    const dz = (terrain.heightAt(x, z + e) - terrain.heightAt(x, z - e)) / (2 * e);
    this.normal.set(-dx, 1, -dz).normalize(); this.turn.setFromAxisAngle(this.up, yaw);
    this.root.quaternion.setFromUnitVectors(this.up, this.normal).multiply(this.turn)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), death.side * Math.PI / 2 * phase));
    this.root.position.set(x, y + .012, z); this.root.updateMatrixWorld(true);
    let support = 0;
    if (death.exactSupport !== null) support = death.exactSupport;
    else if (death.elapsed === 1) {
      // Once per decoded carcass, check every deformed surface vertex so horns/paws cannot sink into graded ground.
      this.asset.scene.traverse((object) => {
        const mesh = object as THREE.SkinnedMesh;
        if (!mesh.isSkinnedMesh) return;
        for (let vertex = 0; vertex < mesh.geometry.attributes.position!.count; vertex++) {
          mesh.getVertexPosition(vertex, this.point); mesh.localToWorld(this.point);
          support = Math.max(support, terrain.heightAt(this.point.x, this.point.z) + .012 - this.point.y);
        }
      });
      death.exactSupport = support;
    } else for (const surface of this.corpseSurfaces) {
      surface.mesh.getVertexPosition(surface.vertex, this.point); surface.mesh.localToWorld(this.point);
      support = Math.max(support, terrain.heightAt(this.point.x, this.point.z) + .012 - this.point.y);
    }
    this.root.position.y += support; this.root.updateMatrixWorld(true);
  }

  get isDead() { return !!this.death; }
  get collapseComplete() { return this.death?.elapsed === 1; }

  get soleSampleCount() { return this.soles.length; }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.asset.scene);
    releaseAnimalAsset(this.asset.scene);
    this.root.clear(); this.root.removeFromParent();
  }
}

/** Also used for a GLB that completed after its world was disposed or its contract failed. */
export function releaseAnimalAsset(group: THREE.Group) {
  const images = new Set<{ close(): void }>();
  group.traverse((object) => {
    const material = (object as THREE.Mesh).material;
    if (!material) return;
    for (const mat of Array.isArray(material) ? material : [material]) for (const value of Object.values(mat)) {
      if (!(value as THREE.Texture | null)?.isTexture) continue;
      const data = (value as THREE.Texture).source.data as unknown;
      for (const image of Array.isArray(data) ? data : [data]) if (image && typeof (image as { close?: unknown }).close === 'function') images.add(image as { close(): void });
    }
  });
  const detached = new THREE.Scene(); detached.add(group);
  disposeSceneResources(detached, () => {});
  for (const image of images) image.close();
}
