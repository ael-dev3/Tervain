import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from './assets';
import { readNativeBytes, readNativeResource } from './resource';
import { TerrainMaterials } from './terrain-materials';
import type { TerrainMaterialLease } from './terrain-materials';
import type { NativeMaterialGraphs, TerrainCell, TerrainManifest } from './terrain-types';

interface ResidentCell { cell: TerrainCell; object: THREE.Group; leases: TerrainMaterialLease[] }
export interface TerrainStatus {
  ready: boolean;
  cells: number;
  total: number;
  triangles: number;
  downloading: number;
  queued: number;
  estimatedTextureBytes: number;
  region: string | null;
  groundReady: boolean;
  failures: string[];
}
export interface TerrainDestination { name: string; region: string; position: [number, number, number] }

const LOAD_RADIUS = 500;
const RETAIN_RADIUS = 700;
const CELL_LIMIT = 48;
const GPU_BUDGET = 256 * 1024 * 1024;
const distance = (cell: TerrainCell, position: THREE.Vector3): number => {
  const { min, max } = cell.boundsMetres;
  return Math.hypot(Math.max(min[0] - position.x, 0, position.x - max[0]), Math.max(min[2] - position.z, 0, position.z - max[2]));
};

/** Static native landscape streaming. Runtime sectors and PhysX are separate. */
export class NativeTerrain {
  readonly group = new THREE.Group();
  private readonly loader = new GLTFLoader();
  private readonly resident = new Map<string, ResidentCell>();
  private readonly pending = new Map<string, AbortController>();
  private readonly failed = new Map<string, string>();
  private readonly absolutePosition = new THREE.Vector3();
  private readonly origin = new THREE.Vector3();
  private source: TerrainManifest | null = null;
  private materials: TerrainMaterials | null = null;
  private queue: TerrainCell[] = [];
  private desired = new Set<string>();
  private lastSelection = 0;
  private changed = false;
  private disposed = false;
  private initialization: Promise<void> | null = null;
  private initializationFailure: string | null = null;

  constructor(private readonly renderer: THREE.WebGLRenderer) { this.group.name = 'Native landscape cells'; }

  initialize(): Promise<void> {
    if (!this.initialization) this.initialization = this.readManifest().catch((error: unknown) => {
      this.initialization = null; this.initializationFailure = String(error); throw error;
    });
    return this.initialization;
  }

  private async readManifest(): Promise<void> {
    const response = await fetch(assetUrl('terrain/manifest.json'), { cache: 'no-cache' });
    if (!response.ok) throw new Error('Terrain manifest HTTP ' + response.status);
    const manifest = await response.json() as TerrainManifest;
    if (manifest.schema !== 'gothic3-terrain-v1' || !Array.isArray(manifest.cells) || !manifest.cells.length ||
        !Array.isArray(manifest.textures) || manifest.cells.length !== manifest.summary.cells ||
        !manifest.coordinates.legacyArdeaOriginMetres.every(Number.isFinite)) throw new Error('Unsupported native terrain manifest');
    const ids = new Set<string>();
    for (const cell of manifest.cells) {
      const { min, max } = cell.boundsMetres;
      if (ids.has(cell.id) || min.length !== 3 || max.length !== 3 || ![...min, ...max].every(Number.isFinite) ||
          min.some((value, axis) => value > max[axis]!) || !/^cells\/[A-Za-z0-9_.-]+\.glb$/.test(cell.geometry.url) ||
          !Number.isSafeInteger(cell.geometry.bytes) || cell.geometry.bytes > 16 * 1024 * 1024 ||
          !Array.isArray(cell.primitiveMaterialIds)) throw new Error('Invalid native terrain cell');
      ids.add(cell.id);
    }
    for (const texture of manifest.textures) {
      if (!/^textures\/[a-f0-9]{64}\.png$/.test(texture.url) || !Number.isSafeInteger(texture.width) ||
          !Number.isSafeInteger(texture.height) || texture.width <= 0 || texture.height <= 0 ||
          texture.width > this.renderer.capabilities.maxTextureSize || texture.height > this.renderer.capabilities.maxTextureSize) {
        throw new Error('Invalid or unsupported native terrain texture');
      }
    }
    if (manifest.materialGraphs.url !== 'material-graphs.json') throw new Error('Unsupported native material graph path');
    const graphs = await readNativeResource<NativeMaterialGraphs>('terrain/' + manifest.materialGraphs.url, manifest.materialGraphs);
    if (graphs.schema !== 'gothic3-terrain-material-graphs-v1' || !Array.isArray(graphs.materials)) throw new Error('Unsupported material graph schema');
    if (this.disposed) return;
    this.origin.fromArray(manifest.coordinates.legacyArdeaOriginMetres);
    this.source = manifest;
    this.materials = new TerrainMaterials(graphs.materials, manifest.textures, this.renderer);
    this.initializationFailure = null;
  }

  get originMetres(): THREE.Vector3 { return this.origin.clone(); }
  get objects(): THREE.Object3D[] { return [...this.resident.values()].map((entry) => entry.object); }
  get manifest(): TerrainManifest | null { return this.source; }

  /** One coalesced collision-index update for any number of async arrivals. */
  consumeGeometryChange(): boolean { const changed = this.changed; this.changed = false; return changed; }

  update(relativePosition: THREE.Vector3, now: number, force = false): void {
    if (!this.source || this.disposed) return;
    this.absolutePosition.copy(relativePosition).add(this.origin);
    if (force || now - this.lastSelection > 250) {
      this.lastSelection = now;
      const ordered = this.source.cells.filter((cell) => cell.native.registered && cell.native.enabledByAnyRegistry)
        .map((cell) => ({ cell, distance: distance(cell, this.absolutePosition) }))
        .filter((entry) => entry.distance <= LOAD_RADIUS)
        .sort((a, b) => a.distance - b.distance || a.cell.id.localeCompare(b.cell.id))
        .slice(0, CELL_LIMIT);
      this.desired = new Set(ordered.map((entry) => entry.cell.id));
      for (const [id, entry] of this.resident) {
        if (distance(entry.cell, this.absolutePosition) > RETAIN_RADIUS) this.evict(id);
      }
      for (const [id, pending] of this.pending) if (!this.desired.has(id)) pending.abort();
      this.queue = ordered.map((entry) => entry.cell).filter((cell) => !this.resident.has(cell.id) && !this.pending.has(cell.id) && !this.failed.has(cell.id));
      this.trim();
    }
    while (this.pending.size < 2 && this.queue.length) {
      const cell = this.queue[0]!;
      if (this.materials!.estimatedTextureBytes >= GPU_BUDGET && distance(cell, this.absolutePosition) > 30) break;
      this.queue.shift();
      const abort = new AbortController();
      this.pending.set(cell.id, abort);
      void this.load(cell, abort).then((entry) => {
        if (this.disposed || abort.signal.aborted || !this.desired.has(cell.id)) { this.disposeEntry(entry); return; }
        this.resident.set(cell.id, entry);
        this.group.add(entry.object);
        entry.object.updateMatrixWorld(true);
        this.changed = true;
        this.trim();
      }).catch((error: unknown) => {
        if (!abort.signal.aborted && !this.disposed) this.failed.set(cell.id, cell.region + ': ' + String(error));
      }).finally(() => { this.pending.delete(cell.id); });
    }
  }

  private async load(cell: TerrainCell, abort: AbortController): Promise<ResidentCell> {
    const bytes = await readNativeBytes('terrain/' + cell.geometry.url, cell.geometry, abort.signal);
    const gltf = await this.loader.parseAsync(bytes, assetUrl('terrain/'));
    const object = gltf.scene;
    const leases: TerrainMaterialLease[] = [];
    const placeholders = new Set<THREE.Material>();
    try {
      const meshes: THREE.Mesh[] = [];
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        meshes.push(child);
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) placeholders.add(material);
      });
      if (!meshes.length) throw new Error('Native landscape cell has no primitives');
      for (const mesh of meshes) {
        const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const replacements: THREE.Material[] = [];
        for (const placeholder of old) {
          const id = placeholder.userData.nativeMaterialId as string | undefined;
          if (!id || !cell.primitiveMaterialIds.includes(id)) throw new Error('Native primitive material differs from receipt');
          const lease = await this.materials!.acquire(id, mesh.geometry);
          leases.push(lease); replacements.push(lease.material);
        }
        mesh.material = Array.isArray(mesh.material) ? replacements : replacements[0]!;
        mesh.userData.kind = 'terrain';
      }
      // Exported child nodes already restore their absolute native center.
      // Apply the existing Ardea display origin exactly once at the scene root.
      object.position.sub(this.origin);
      object.name = cell.id;
      object.userData.nativeCell = cell;
      return { cell, object, leases };
    } catch (error) {
      this.disposeEntry({ cell, object, leases });
      throw error;
    } finally { for (const material of placeholders) material.dispose(); }
  }

  private trim(): void {
    if (!this.materials) return;
    const farthest = [...this.resident.values()].sort((a, b) => distance(b.cell, this.absolutePosition) - distance(a.cell, this.absolutePosition));
    for (const entry of farthest) {
      if (this.resident.size <= CELL_LIMIT && this.materials.estimatedTextureBytes <= GPU_BUDGET) break;
      // Keep ground underneath the camera; a budget is never a reason to drop
      // the current support surface during grounded exploration.
      if (distance(entry.cell, this.absolutePosition) < 30) continue;
      this.evict(entry.cell.id);
    }
  }

  private evict(id: string): void {
    const entry = this.resident.get(id);
    if (!entry) return;
    this.resident.delete(id); this.group.remove(entry.object);
    this.disposeEntry(entry); this.changed = true;
  }
  private disposeEntry(entry: ResidentCell): void {
    for (const lease of entry.leases) lease.release();
    const geometries = new Set<THREE.BufferGeometry>();
    entry.object.traverse((child) => { if (child instanceof THREE.Mesh) geometries.add(child.geometry); });
    for (const geometry of geometries) geometry.dispose();
  }

  /** No invented floor at an unloaded cell. The caller may suspend walking. */
  hasGroundAt(relativePosition: THREE.Vector3): boolean {
    const point = relativePosition.clone().add(this.origin);
    const required = this.source?.cells.filter((cell) => cell.native.registered && cell.native.enabledByAnyRegistry && distance(cell, point) <= 0.5) ?? [];
    return required.length > 0 && required.every((cell) => this.resident.has(cell.id));
  }

  status(): TerrainStatus {
    const closest = [...this.resident.values()].sort((a, b) => distance(a.cell, this.absolutePosition) - distance(b.cell, this.absolutePosition))[0];
    return {
      ready: this.source !== null, cells: this.resident.size, total: this.source?.summary.cells ?? 0,
      triangles: [...this.resident.values()].reduce((sum, entry) => sum + entry.cell.geometry.triangles, 0),
      downloading: this.pending.size, queued: this.queue.length, estimatedTextureBytes: this.materials?.estimatedTextureBytes ?? 0,
      region: closest?.cell.region ?? null,
      groundReady: this.hasGroundAt(this.absolutePosition.clone().sub(this.origin)),
      failures: [...this.initializationFailure ? [this.initializationFailure] : [], ...this.failed.values(), ...this.materials?.limitations.values() ?? []],
    };
  }
  retry(): void {
    this.failed.clear(); this.lastSelection = -Infinity;
    if (!this.source) void this.initialize().catch(() => { /* status retains failure */ });
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const pending of this.pending.values()) pending.abort();
    for (const id of this.resident.keys()) this.evict(id);
    this.queue = []; this.materials?.destroy();
  }
}
