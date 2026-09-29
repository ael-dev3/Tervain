import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Loader and catalog for the runtime GLBs shared with Warpkeep (see public/models/warpkeep/manifest.json,
 * docs/engineering/asset-inventory.md and tools/import-warpkeep-assets.mjs). The GLBs are byte-exact
 * copies; this module never rewrites them, it only decodes and (optionally) instances them.
 */

export type Lod = 'high' | 'balanced' | 'compact';
export const LOD_ORDER: Lod[] = ['high', 'balanced', 'compact'];

export interface AssetLodEntry {
  file: string;
  bytes: number;
  sha256: string;
  triangles: number;
  skinned: boolean;
  animations: string[];
  /** Bounding-box size in the asset's own units (metres in the source files). */
  size: [number, number, number];
  minY: number;
  source: string;
}

export interface AssetEntry {
  id: string;
  lods: Partial<Record<Lod, AssetLodEntry>>;
}

interface Manifest {
  schema: number;
  source: { repository: string; commit: string; note: string };
  terms: { status: string; summary: string };
  totals: { files: number; bytes: number; assets: number };
  assets: AssetEntry[];
}

export interface LoadedAsset {
  id: string;
  lod: Lod;
  entry: AssetLodEntry;
  /** The decoded scene graph. Treat as read-only; use `instantiate` or reuse its geometry for instancing. */
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export interface LoadProgress {
  loaded: number;
  total: number;
  label: string;
}

const BASE = `${import.meta.env.BASE_URL}models/warpkeep/`;

export class AssetLibrary {
  private manifest: Manifest;
  private byId = new Map<string, AssetEntry>();
  private cache = new Map<string, Promise<LoadedAsset>>();
  private done = new Map<string, LoadedAsset>();
  private loader = new GLTFLoader();
  bytesLoaded = 0;

  private constructor(manifest: Manifest) {
    this.manifest = manifest;
    for (const a of manifest.assets) this.byId.set(a.id, a);
  }

  static async open(): Promise<AssetLibrary> {
    const res = await fetch(`${BASE}manifest.json`);
    if (!res.ok) throw new Error(`asset manifest unavailable (${res.status})`);
    return new AssetLibrary((await res.json()) as Manifest);
  }

  /** An empty library for tests and for running without assets (everything falls back to procedural art). */
  static empty(): AssetLibrary {
    return new AssetLibrary({ schema: 1, source: { repository: '', commit: '', note: '' }, terms: { status: '', summary: '' }, totals: { files: 0, bytes: 0, assets: 0 }, assets: [] });
  }

  get source() {
    return this.manifest.source;
  }

  get terms() {
    return this.manifest.terms;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  entry(id: string): AssetEntry | undefined {
    return this.byId.get(id);
  }

  /** Catalog ids that start with a prefix, e.g. `tree.` or `citizen.`. */
  ids(prefix: string): string[] {
    return [...this.byId.keys()].filter((k) => k.startsWith(prefix));
  }

  /** The requested LOD if present, otherwise the closest available one. */
  resolveLod(id: string, want: Lod): Lod | null {
    const e = this.byId.get(id);
    if (!e) return null;
    if (e.lods[want]) return want;
    const i = LOD_ORDER.indexOf(want);
    for (let d = 1; d < LOD_ORDER.length; d++) {
      for (const j of [i - d, i + d]) {
        const l = LOD_ORDER[j];
        if (l && e.lods[l]) return l;
      }
    }
    return null;
  }

  private key(id: string, lod: Lod) {
    return `${id}@${lod}`;
  }

  load(id: string, want: Lod): Promise<LoadedAsset> {
    const lod = this.resolveLod(id, want);
    if (!lod) return Promise.reject(new Error(`unknown asset ${id}`));
    const key = this.key(id, lod);
    let p = this.cache.get(key);
    if (!p) {
      const entry = this.byId.get(id)!.lods[lod]!;
      p = this.loader.loadAsync(`${BASE}${entry.file}`).then((gltf) => {
        this.bytesLoaded += entry.bytes;
        const asset: LoadedAsset = { id, lod, entry, scene: gltf.scene, animations: gltf.animations };
        gltf.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        this.done.set(key, asset);
        return asset;
      });
      this.cache.set(key, p);
    }
    return p;
  }

  /** Synchronous access once loaded (falls back to any loaded LOD of the same asset). */
  get(id: string, want: Lod): LoadedAsset | undefined {
    const lod = this.resolveLod(id, want);
    if (lod) {
      const exact = this.done.get(this.key(id, lod));
      if (exact) return exact;
    }
    for (const l of LOD_ORDER) {
      const any = this.done.get(this.key(id, l));
      if (any) return any;
    }
    return undefined;
  }

  async preload(list: { id: string; lod: Lod }[], onProgress?: (p: LoadProgress) => void): Promise<void> {
    const seen = new Set<string>();
    const todo = list.filter((x) => {
      const lod = this.resolveLod(x.id, x.lod);
      if (!lod) return false;
      const k = this.key(x.id, lod);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    let loaded = 0;
    await Promise.all(
      todo.map(async (x) => {
        try {
          await this.load(x.id, x.lod);
        } catch (e) {
          // A missing or damaged asset must not stop the game: callers fall back to procedural art.
          console.warn(`asset ${x.id} (${x.lod}) failed to load`, e);
        }
        loaded++;
        onProgress?.({ loaded, total: todo.length, label: x.id });
      }),
    );
  }

  /**
   * A fresh copy of a loaded asset with its own transforms. Skinned models are cloned with their
   * skeleton so each instance can animate independently. Geometry and materials stay shared; clone
   * materials yourself if you need per-instance colour.
   */
  instantiate(id: string, lod: Lod): THREE.Object3D | null {
    const a = this.get(id, lod);
    if (!a) return null;
    const hasSkin = a.entry.skinned;
    const obj = hasSkin ? cloneSkinned(a.scene) : a.scene.clone(true);
    return obj;
  }

  /** Merge the meshes of a loaded (static) asset into one flat list of geometry + material for instancing. */
  meshParts(id: string, lod: Lod): { geometry: THREE.BufferGeometry; material: THREE.Material; matrix: THREE.Matrix4 }[] {
    const a = this.get(id, lod);
    if (!a) return [];
    a.scene.updateMatrixWorld(true);
    const out: { geometry: THREE.BufferGeometry; material: THREE.Material; matrix: THREE.Matrix4 }[] = [];
    a.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const material = Array.isArray(m.material) ? m.material[0]! : m.material;
      out.push({ geometry: m.geometry, material, matrix: m.matrixWorld.clone() });
    });
    return out;
  }
}

/* ---------- Shared instance ---------- */

let shared: AssetLibrary | null = null;

/** The library opened at start-up. Rigs and scene modules read it here so no constructor needs threading through. */
export function setSharedLibrary(lib: AssetLibrary) {
  shared = lib;
}

export function sharedLibrary(): AssetLibrary {
  return shared ?? (shared = AssetLibrary.empty());
}

/** A model the game would like loaded before the world is built. */
export interface AssetNeed {
  id: string;
  lod: Lod;
}
