import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from './assets';
import { readNativeBytes } from './resource';

interface LandmarkGeometry {
  url: string;
  bytes: number;
  sha256: string;
  triangles: number;
  vertices: number;
}

interface WorldLandmark {
  id: string;
  name: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
  boundsMetres: { min: [number, number, number]; max: [number, number, number] };
  streamRadiusMetres: number;
  geometry: LandmarkGeometry;
}

interface WorldLandmarkManifest {
  schema: 'gothic3-world-landmarks-v1';
  instances: WorldLandmark[];
}

interface ResidentLandmark { record: WorldLandmark; object: THREE.Group }

const RETAIN_MULTIPLIER = 1.4;
const MAX_RESIDENT = 24;

function distanceToBounds(bounds: WorldLandmark['boundsMetres'], point: THREE.Vector3): number {
  const { min, max } = bounds;
  return Math.hypot(
    Math.max(min[0] - point.x, 0, point.x - max[0]),
    Math.max(min[1] - point.y, 0, point.y - max[1]),
    Math.max(min[2] - point.z, 0, point.z - max[2]),
  );
}

/** Lazy source-placed static world meshes used for rendering and browser collision. */
export class NativeWorldLandmarks {
  readonly group = new THREE.Group();
  private readonly loader = new GLTFLoader();
  private readonly resident = new Map<string, ResidentLandmark>();
  private readonly pending = new Map<string, AbortController>();
  private readonly failed = new Map<string, string>();
  private readonly desired = new Set<string>();
  private readonly queue: WorldLandmark[] = [];
  private manifest: WorldLandmarkManifest | null = null;
  private lastSelection = 0;
  private changed = false;
  private disposed = false;
  private initialization: Promise<void> | null = null;
  private initializationFailure: string | null = null;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.group.name = 'Source-placed Gothic 3 static landmarks';
  }

  initialize(): Promise<void> {
    if (!this.initialization) this.initialization = this.readManifest().catch((error: unknown) => {
      this.initialization = null;
      this.initializationFailure = String(error);
      throw error;
    });
    return this.initialization;
  }

  private async readManifest(): Promise<void> {
    const response = await fetch(assetUrl('world/landmarks/manifest.json'), { cache: 'no-cache' });
    if (!response.ok) throw new Error('World landmark manifest HTTP ' + response.status);
    const manifest = await response.json() as WorldLandmarkManifest;
    if (manifest.schema !== 'gothic3-world-landmarks-v1' || !Array.isArray(manifest.instances) ||
        manifest.instances.length > 10000) throw new Error('Unsupported world landmark manifest');
    const ids = new Set<string>();
    for (const landmark of manifest.instances) {
      const { min, max } = landmark.boundsMetres;
      if (!/^[a-z0-9-]{1,80}$/.test(landmark.id) || ids.has(landmark.id) ||
          ![...landmark.position, ...landmark.quaternion, ...landmark.scale, ...min, ...max,
            landmark.streamRadiusMetres].every(Number.isFinite) ||
          min.some((value, axis) => value > max[axis]!) || landmark.streamRadiusMetres <= 0 ||
          !/^landmarks\/[A-Za-z0-9_.-]+\.glb$/.test(landmark.geometry.url) ||
          !Number.isSafeInteger(landmark.geometry.bytes) || landmark.geometry.bytes <= 0 ||
          landmark.geometry.bytes > 16 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(landmark.geometry.sha256) ||
          !Number.isSafeInteger(landmark.geometry.triangles) || landmark.geometry.triangles <= 0 ||
          !Number.isSafeInteger(landmark.geometry.vertices) || landmark.geometry.vertices <= 0) {
        throw new Error('Invalid source landmark receipt: ' + landmark.id);
      }
      ids.add(landmark.id);
    }
    if (this.disposed) return;
    this.manifest = manifest;
    this.initializationFailure = null;
  }

  get objects(): THREE.Object3D[] { return [...this.resident.values()].map((entry) => entry.object); }
  get failures(): string[] { return [...this.initializationFailure ? [this.initializationFailure] : [], ...this.failed.values()]; }
  consumeGeometryChange(): boolean { const changed = this.changed; this.changed = false; return changed; }

  update(relativePosition: THREE.Vector3, now: number, force = false): void {
    if (!this.manifest || this.disposed) return;
    if (force || now - this.lastSelection > 250) {
      this.lastSelection = now;
      const ordered = this.manifest.instances
        .map((record) => ({ record, distance: distanceToBounds(record.boundsMetres, relativePosition) }))
        .filter((entry) => entry.distance <= entry.record.streamRadiusMetres)
        .sort((a, b) => a.distance - b.distance || a.record.id.localeCompare(b.record.id))
        .slice(0, MAX_RESIDENT);
      this.desired.clear();
      for (const entry of ordered) this.desired.add(entry.record.id);
      for (const [id, entry] of this.resident) {
        if (distanceToBounds(entry.record.boundsMetres, relativePosition) >
            entry.record.streamRadiusMetres * RETAIN_MULTIPLIER) this.evict(id);
      }
      for (const [id, pending] of this.pending) if (!this.desired.has(id)) pending.abort();
      this.queue.splice(0, this.queue.length, ...ordered.map((entry) => entry.record)
        .filter((record) => !this.resident.has(record.id) && !this.pending.has(record.id) && !this.failed.has(record.id)));
    }
    while (this.pending.size < 2 && this.queue.length) {
      const record = this.queue.shift()!;
      const abort = new AbortController();
      this.pending.set(record.id, abort);
      void this.load(record, abort).then((entry) => {
        if (this.disposed || abort.signal.aborted || !this.desired.has(record.id)) {
          this.disposeEntry(entry);
          return;
        }
        this.resident.set(record.id, entry);
        this.group.add(entry.object);
        entry.object.updateMatrixWorld(true);
        this.changed = true;
      }).catch((error: unknown) => {
        if (!abort.signal.aborted && !this.disposed) this.failed.set(record.id, record.name + ': ' + String(error));
      }).finally(() => { this.pending.delete(record.id); });
    }
  }

  private async load(record: WorldLandmark, abort: AbortController): Promise<ResidentLandmark> {
    const bytes = await readNativeBytes('world/' + record.geometry.url, record.geometry, abort.signal,
      { maximumDecodedBytes: 16 * 1024 * 1024 });
    const gltf = await this.loader.parseAsync(bytes, assetUrl('world/'));
    const object = new THREE.Group();
    object.name = record.id;
    object.position.fromArray(record.position);
    object.quaternion.fromArray(record.quaternion).normalize();
    object.scale.fromArray(record.scale);
    object.userData.kind = 'static-world-landmark';
    object.userData.sourceName = record.name;
    object.add(gltf.scene);
    gltf.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.userData.kind = 'static-world-landmark';
      child.castShadow = false;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        material.side = THREE.DoubleSide;
        if (material instanceof THREE.MeshStandardMaterial && material.map) {
          material.map.colorSpace = THREE.SRGBColorSpace;
          material.map.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        }
      }
    });
    return { record, object };
  }

  private evict(id: string): void {
    const entry = this.resident.get(id);
    if (!entry) return;
    this.resident.delete(id);
    this.group.remove(entry.object);
    this.disposeEntry(entry);
    this.changed = true;
  }

  private disposeEntry(entry: ResidentLandmark): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    entry.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      geometries.add(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const pending of this.pending.values()) pending.abort();
    for (const id of this.resident.keys()) this.evict(id);
    this.queue.length = 0;
  }
}
