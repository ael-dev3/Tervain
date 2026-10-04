import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { assetUrl } from './assets';
import { configureNativeSkinning } from './skinning';
import { NativeMotionPlayer } from './native-motion';

export interface NativeClip {
  name: string;
  role: 'idle' | 'walk' | 'run' | 'attack' | 'powerAttack';
  phase?: string | null;
  duration: number;
  source: string;
  tracks: number;
  keyframes: number;
  interpolations: string[];
  rootMotion: Record<string, unknown>;
}

export interface AnimatedAsset {
  id: string;
  glb: string;
  native: string;
  parts: { name: string; source: string; triangles: number; splitVertices: number; joints: number; skinAttributeSets: number }[];
  clips: NativeClip[];
}

export interface AnimationManifest {
  version: number;
  units: 'metres';
  assets: AnimatedAsset[];
  coordinateConvention: unknown;
  limitations: string[];
  outputs: Record<string, { sha256: string; bytes: number }>;
  audit: unknown;
}

/** Each actor owns its bones and mixer. Geometry and textures are shared. */
export class AnimatedActor {
  readonly motion: NativeMotionPlayer;
  private selected: NativeClip | null = null;
  private disposed = false;

  constructor(
    readonly object: THREE.Group,
    readonly asset: AnimatedAsset,
    raw: unknown,
  ) {
    this.motion = new NativeMotionPlayer(object, raw);
    for (const clip of asset.clips) {
      if (!this.motion.clipNames.includes(clip.name)) throw new Error('Native channel data is missing: ' + clip.name);
    }
  }

  get clip(): NativeClip | null { return this.selected; }
  get playing(): boolean { return this.motion.playing; }
  set playing(value: boolean) { this.motion.playing = value; }

  select(name: string | null): void {
    const record = name === null ? null : this.asset.clips.find((clip) => clip.name === name);
    if (name !== null && !record) throw new Error('Native clip is missing: ' + name);
    // Attacks keep their individual native phases. Repetition in this model
    // inspector is a preview control, not the original combat state machine.
    this.motion.select(name);
    this.selected = record ?? null;
  }

  update(seconds: number): void { this.motion.update(seconds); }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.motion.select(null);
    disposeActorResources(this.object);
  }
}

function disposeActorResources(object: THREE.Group): void {
    const skeletons = new Set<THREE.Skeleton>();
    const materials = new Set<THREE.Material>();
    object.traverse((node) => {
      if (node instanceof THREE.SkinnedMesh) skeletons.add(node.skeleton);
      if (node instanceof THREE.Mesh) {
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          if (material.userData.gothic3ActorOwned) materials.add(material);
        }
      }
    });
    for (const skeleton of skeletons) skeleton.dispose();
    for (const material of materials) material.dispose();
}

export class NativeAnimations {
  manifest: AnimationManifest | null = null;
  private readonly cache = new Map<string, Promise<{ object: THREE.Group; raw: unknown }>>();

  async loadManifest(): Promise<void> {
    const response = await fetch(assetUrl('animated/manifest.json'));
    if (!response.ok) throw new Error('Animation manifest HTTP ' + response.status);
    const manifest = await response.json() as AnimationManifest;
    if (manifest.version !== 1 || manifest.units !== 'metres' || !Array.isArray(manifest.assets)) {
      throw new Error('Unsupported native animation manifest');
    }
    this.manifest = manifest;
  }

  async actor(id: string): Promise<AnimatedActor | null> {
    const asset = this.manifest?.assets.find((candidate) => candidate.id === id);
    if (!asset) return null;
    let pending = this.cache.get(asset.glb);
    if (!pending) {
      pending = Promise.all([
        this.readAsset(asset.glb),
        this.readBytes(asset.native).then((bytes) => JSON.parse(new TextDecoder().decode(bytes)) as unknown),
      ]).then(([gltf, raw]) => {
        const names = new Set(gltf.animations.map((clip) => clip.name));
        for (const clip of asset.clips) {
          if (!names.has(clip.name)) throw new Error('GLB does not contain native clip ' + clip.name);
        }
        gltf.scene.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
            const map = (material as THREE.MeshStandardMaterial).map;
            if (map) map.anisotropy = 8;
          }
        });
        return { object: gltf.scene, raw };
      }).catch((error: unknown) => {
        if (this.cache.get(asset.glb) === pending) this.cache.delete(asset.glb);
        throw error;
      });
      this.cache.set(asset.glb, pending);
    }
    const loaded = await pending;
    const object = clone(loaded.object) as THREE.Group;
    object.updateMatrixWorld(true);
    try {
      object.traverse((node) => { if (node instanceof THREE.SkinnedMesh) configureNativeSkinning(node); });
      return new AnimatedActor(object, asset, loaded.raw);
    }
    catch (error) { disposeActorResources(object); throw error; }
  }

  private async readAsset(path: string) {
    const bytes = await this.readBytes(path);
    return new GLTFLoader().parseAsync(bytes, new URL('./', assetUrl(path)).href);
  }

  private async readBytes(path: string): Promise<ArrayBuffer> {
    const expected = this.manifest?.outputs[path];
    if (!expected) throw new Error('Animated output not listed: ' + path);
    const url = assetUrl(path);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Animated model HTTP ' + response.status);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== expected.bytes) throw new Error('Animated model size differs from the manifest');
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (hash !== expected.sha256) throw new Error('Animated model hash differs from the manifest');
    return bytes;
  }
}
