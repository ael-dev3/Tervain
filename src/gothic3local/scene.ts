import * as THREE from 'three';
import { type GothicArchives, readEntry } from './archive';
import { meshGeometries } from './geometry';
import { type Genomfle, openGenomfle, propNumber, propVector } from './genome';
import { parseImage } from './image';
import { type AtlasSprite, clusterFor, leafClusters } from './leafatlas';
import { parseMaterial } from './material';
import { parseLodList, parseMesh } from './mesh';
import { buildMaterial, type MaterialOptions, missingMaterial, type Variant } from './shading';
import { parseSpeedTree } from './speedtree';
import { barkMaterial, growTree, isConifer, leafMaterials } from './trees';
import { TextureCache } from './textures';
import { Undergrowth } from './undergrowth';
import { parseVegetation } from './vegetation';
import { isWater, waterMaterial, waterUniforms } from './water';
import { CELL_SIZE, cellOf, type Entity, entityMesh, entitySpeedTree, parseNodeEntities, setOf } from './world';

/**
 * The world as Three.js objects. Everything sits in `root`, which converts Gothic 3's left-handed centimetres to
 * Three.js's right-handed metres (scale 0.01, Z mirrored). Static meshes are drawn as instances: one InstancedMesh per
 * mesh element, holding every placement of that mesh in the loaded cells.
 */

export interface Placement {
  mesh: string;
  matrix: THREE.Matrix4;
  guid: string;
  variant: Variant;
}

/** Depth-only helper meshes under rivers and the sea: not drawn. */
const HIDDEN_MATERIAL = /_depth_\d+_[a-z]\.xshmat$/i;

/** The low-poly terrain and water of the whole world, drawn beyond the full-detail cells. */
export const HORIZON_NODE = 'G3_World_01/World/_Level/G3_World_Lowpoly_01_Levelmesh_01/G3_World_Lowpoly_Landscape_01_SPG.node';

export interface LoadStats {
  cells: number;
  entities: number;
  placements: number;
  meshes: number;
  materials: number;
  instancedMeshes: number;
  trees: number;
  lights: number;
  failedMeshes: string[];
}

interface MeshAsset {
  parts: { geometry: THREE.BufferGeometry; material: THREE.Material; triangles: number }[];
}

export class WorldView {
  readonly root = new THREE.Group();
  readonly archives: GothicArchives;
  readonly textures: TextureCache;
  readonly options: MaterialOptions;
  private readonly materials = new Map<string, Promise<THREE.Material>>();
  private readonly meshes = new Map<string, Promise<MeshAsset | null>>();
  private readonly loadedCells = new Set<string>();
  /** Static placements for walking: geometry, its world matrix (Three space) and its horizontal bounds. */
  readonly ground: { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4; box: THREE.Box3 }[] = [];
  readonly lights: { position: THREE.Vector3; color: THREE.Color; range: number }[] = [];
  readonly trees: { spt: string; matrix: THREE.Matrix4 }[] = [];
  /** Sky values the water reflects, updated with the hour. */
  readonly water = waterUniforms();
  /** Grass, herbs, ferns and pebbles near the camera. */
  readonly undergrowth: Undergrowth;
  /** The full-detail cells' extent, Gothic 3 centimetres. */
  private readonly detail = new THREE.Box2(new THREE.Vector2(Infinity, Infinity), new THREE.Vector2(-Infinity, -Infinity));
  stats: LoadStats = { cells: 0, entities: 0, placements: 0, meshes: 0, materials: 0, instancedMeshes: 0, trees: 0, lights: 0, failedMeshes: [] };

  constructor(renderer: THREE.WebGLRenderer, archives: GothicArchives, options: MaterialOptions) {
    this.archives = archives;
    this.textures = new TextureCache(renderer, archives);
    this.options = options;
    this.root.scale.set(0.01, 0.01, -0.01);
    this.root.updateMatrixWorld(true);
    this.undergrowth = new Undergrowth(this.textures, options);
    this.root.add(this.undergrowth.group);
  }

  /** Gothic 3 centimetres (left-handed) to Three.js metres. */
  static toThree(x: number, y: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(x / 100, y / 100, -z / 100);
  }

  static fromThree(v: THREE.Vector3): { x: number; y: number; z: number } {
    return { x: v.x * 100, y: v.y * 100, z: -v.z * 100 };
  }

  material(name: string, variant: Variant = 'detail'): Promise<THREE.Material> {
    const key = `${name.toLowerCase()}|${variant}`;
    let p = this.materials.get(key);
    if (!p) {
      p = (async () => {
        const e = this.archives.named(name);
        if (!e) return missingMaterial(name);
        try {
          const graph = parseMaterial(await readEntry(e));
          this.stats.materials++;
          if (isWater(graph)) return waterMaterial(name, graph, this.options, this.water);
          const built = await buildMaterial(name, graph, this.textures, this.options, variant);
          return built.material;
        } catch (err) {
          console.warn(`material ${name}:`, err);
          return missingMaterial(name);
        }
      })();
      this.materials.set(key, p);
    }
    return p;
  }

  /** A mesh by the name an entity gives (an .xcmsh, or an .xlmsh whose nearest level is used). */
  mesh(name: string, variant: Variant = 'detail'): Promise<MeshAsset | null> {
    const key = `${name.toLowerCase()}|${variant}`;
    let p = this.meshes.get(key);
    if (!p) {
      p = (async () => {
        try {
          let file = name;
          if (/\.xlmsh$/i.test(name)) {
            const lod = await this.archives.readNamed(name);
            const levels = lod ? parseLodList(lod) : [];
            if (!levels.length) return null;
            file = levels[0]!;
          }
          const bytes = await this.archives.readNamed(file);
          if (!bytes) return null;
          const parsed = parseMesh(bytes);
          const parts = await Promise.all(
            meshGeometries(parsed)
              .filter((g) => !HIDDEN_MATERIAL.test(g.material))
              .map(async (g) => ({ geometry: g.geometry, material: await this.material(g.material, variant), triangles: g.triangles })),
          );
          this.stats.meshes++;
          return { parts };
        } catch (err) {
          this.stats.failedMeshes.push(name);
          console.warn(`mesh ${name}:`, err);
          return null;
        }
      })();
      this.meshes.set(key, p);
    }
    return p;
  }

  /** The compiled-world cells within `radius` cells of a point (Gothic 3 centimetres). */
  cellsAround(x: number, z: number, radius: number): string[] {
    const want: { path: string; d: number }[] = [];
    for (const e of this.archives.list((k) => k.endsWith('_cstat.node'))) {
      const c = cellOf(e.path);
      if (!c) continue;
      const dx = Math.abs(c.x - x) / CELL_SIZE;
      const dz = Math.abs(c.z - z) / CELL_SIZE;
      if (dx <= radius + 0.5 && dz <= radius + 0.5) want.push({ path: e.path, d: Math.hypot(c.x - x, c.z - z) });
    }
    return want.sort((a, b) => a.d - b.d).map((w) => w.path);
  }

  /** Load node files (cells or sector layers) and add their static meshes, trees and lights. */
  async loadNodes(paths: readonly string[], onProgress?: (done: number, total: number, label: string) => void, variant: Variant = 'detail'): Promise<void> {
    const todo = paths.filter((p) => !this.loadedCells.has(p.toLowerCase()));
    for (const p of todo) {
      const c = cellOf(p);
      if (!c || variant !== 'detail') continue;
      this.detail.expandByPoint(new THREE.Vector2(c.x - CELL_SIZE / 2, c.z - CELL_SIZE / 2));
      this.detail.expandByPoint(new THREE.Vector2(c.x + CELL_SIZE / 2, c.z + CELL_SIZE / 2));
    }
    if (variant === 'detail' && !this.detail.isEmpty()) {
      // Three.js x/z of the detail area, shrunk a little so the far terrain meets the near at the edge.
      const a = WorldView.toThree(this.detail.min.x, 0, this.detail.min.y);
      const b = WorldView.toThree(this.detail.max.x, 0, this.detail.max.y);
      this.options.detailBox.value.set(Math.min(a.x, b.x) + 2, Math.min(a.z, b.z) + 2, Math.max(a.x, b.x) - 2, Math.max(a.z, b.z) - 2);
    }
    const placements: Placement[] = [];
    let done = 0;
    for (const path of todo) {
      onProgress?.(done, todo.length, path.split('/').pop() ?? path);
      this.loadedCells.add(path.toLowerCase());
      let entities: Entity[] = [];
      let file: Genomfle | null = null;
      try {
        const bytes = await this.archives.read(path);
        file = openGenomfle(bytes);
        entities = parseNodeEntities(bytes);
      } catch (err) {
        console.warn(`node ${path}:`, err);
      }
      this.stats.entities += entities.length;
      for (const e of entities) this.collect(e, placements, variant, file);
      done++;
      this.stats.cells++;
    }
    onProgress?.(done, todo.length, 'meshes');
    await this.place(placements, (d, t) => onProgress?.(d, t, 'meshes'));
    await this.plantTrees((d, t) => onProgress?.(d, t, 'trees'));
    await this.undergrowth.prepare();
  }

  private planted = 0;
  private readonly clusters = new Map<string, Promise<AtlasSprite[]>>();

  /** The leaf clusters of a SpeedTree composite image (see leafatlas.ts). */
  private leafClusters(image: string): Promise<AtlasSprite[]> {
    const key = TextureCache.imageName(image).toLowerCase();
    let p = this.clusters.get(key);
    if (!p) {
      p = (async () => {
        const bytes = await this.archives.readNamed(TextureCache.imageName(image));
        if (!bytes) return [];
        try {
          return leafClusters(parseImage(bytes));
        } catch (err) {
          console.warn(`leaf clusters ${image}:`, err);
          return [];
        }
      })();
      this.clusters.set(key, p);
    }
    return p;
  }

  /** Grow each tree species once and instance it at every placement collected so far. */
  private async plantTrees(onProgress?: (done: number, total: number) => void): Promise<void> {
    const fresh = this.trees.slice(this.planted);
    this.planted = this.trees.length;
    const bySpecies = new Map<string, THREE.Matrix4[]>();
    for (const t of fresh) {
      const k = t.spt.toLowerCase();
      let list = bySpecies.get(k);
      if (!list) bySpecies.set(k, (list = []));
      list.push(t.matrix);
    }
    let done = 0;
    for (const [name, matrices] of bySpecies) {
      onProgress?.(done++, bySpecies.size);
      const bytes = await this.archives.readNamed(name.split(/[\\/]/).pop() ?? name);
      if (!bytes) continue;
      let grown;
      try {
        const def = parseSpeedTree(bytes);
        const clusters = def.composite ? await this.leafClusters(def.composite) : [];
        const cluster = clusterFor(name, clusters, isConifer(name));
        grown = growTree(name, def, cluster ? [cluster.u0, cluster.v0, cluster.u1, cluster.v1] : null);
      } catch (err) {
        console.warn(`tree ${name}:`, err);
        continue;
      }
      const [barkTex, leafTex] = await Promise.all([this.textures.get(grown.barkImage), this.textures.get(grown.leafImage)]);
      const bark = barkMaterial(barkTex, this.options, grown.height, name);
      // Leaf images keep a noise pattern in their alpha inside each leaf (for fading); everything above zero is leaf.
      const leaves = leafMaterials(leafTex, this.options, grown.height, name);
      for (const [geometry, material, depth] of [
        [grown.bark, bark, null],
        [grown.leaves, leaves.material, leaves.depth],
      ] as const) {
        if (!geometry.index || geometry.index.count === 0) continue;
        const im = new THREE.InstancedMesh(geometry, material, matrices.length);
        im.name = name;
        matrices.forEach((m, i) => im.setMatrixAt(i, m));
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = true;
        im.receiveShadow = true;
        if (depth) im.customDepthMaterial = depth;
        this.root.add(im);
      }
      this.stats.trees += matrices.length;
    }
  }

  private collect(e: Entity, out: Placement[], variant: Variant, file: Genomfle | null): void {
    const m = new THREE.Matrix4().fromArray(e.world);
    const mesh = entityMesh(e);
    if (mesh) out.push({ mesh, matrix: m, guid: e.guid, variant });
    if (variant === 'far') return;
    const spt = entitySpeedTree(e);
    if (spt) this.trees.push({ spt, matrix: m });
    const vegetation = setOf(e, 'eCVegetation_PS');
    if (vegetation && file) {
      try {
        this.undergrowth.add(parseVegetation(file.reader, vegetation));
      } catch (err) {
        console.warn('vegetation:', err);
      }
    }
    const light = setOf(e, 'eCStaticPointLight_PS') ?? setOf(e, 'eCDynamicLight_PS');
    if (light) {
      const c = propVector(light, 'Color') ?? [1, 0.8, 0.6];
      const [r = 1, gr = 0.8, b = 0.6] = c;
      const range = propNumber(light, 'Range', propNumber(light, 'Intensity', 500));
      const p = new THREE.Vector3(e.world[12], e.world[13], e.world[14]);
      this.lights.push({ position: WorldView.toThree(p.x, p.y, p.z), color: new THREE.Color(r, gr, b), range: range / 100 });
    }
  }

  /** Instance the placements: one InstancedMesh per mesh element and handedness. */
  private async place(placements: readonly Placement[], onProgress?: (done: number, total: number) => void): Promise<void> {
    const byMesh = new Map<string, Placement[]>();
    for (const p of placements) {
      const k = `${p.mesh.toLowerCase()}|${p.variant}`;
      let list = byMesh.get(k);
      if (!list) byMesh.set(k, (list = []));
      list.push(p);
    }
    let done = 0;
    const total = byMesh.size;
    const queue = [...byMesh.entries()];
    const workers = Array.from({ length: 8 }, async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) return;
        const [, list] = next;
        const asset = await this.mesh(list[0]!.mesh, list[0]!.variant);
        if (asset) this.instance(asset, list);
        done++;
        onProgress?.(done, total);
      }
    });
    await Promise.all(workers);
  }

  private instance(asset: MeshAsset, list: readonly Placement[]): void {
    this.stats.placements += list.length;
    for (const mirrored of [false, true]) {
      const group = list.filter((p) => p.matrix.determinant() < 0 === mirrored);
      if (!group.length) continue;
      for (const part of asset.parts) {
        const im = new THREE.InstancedMesh(part.geometry, part.material, group.length);
        im.name = list[0]!.mesh;
        group.forEach((p, i) => im.setMatrixAt(i, p.matrix));
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        const far = group[0]!.variant === 'far';
        im.castShadow = !far;
        im.receiveShadow = !far;
        if (far) im.renderOrder = -1;
        if (mirrored) {
          // A mirrored placement turns its faces around; Three.js only accounts for the object's own matrix.
          const m = (part.material as THREE.Material).clone();
          m.side = m.side === THREE.DoubleSide ? THREE.DoubleSide : THREE.BackSide;
          im.material = m;
        }
        this.root.add(im);
        this.stats.instancedMeshes++;
      }
      for (const p of group) {
        if (p.variant === 'far') continue;
        const world = new THREE.Matrix4().multiplyMatrices(this.root.matrixWorld, p.matrix);
        for (const part of asset.parts) {
          const box = part.geometry.boundingBox!.clone().applyMatrix4(world);
          this.ground.push({ geometry: part.geometry, matrix: world, box });
        }
      }
    }
  }

  /** Height of the ground below a point (Three.js metres), or null. */
  groundBelow(x: number, y: number, z: number, maxDrop = 50): number | null {
    const ray = new THREE.Ray();
    const inv = new THREE.Matrix4();
    const local = new THREE.Ray();
    const tri = new THREE.Vector3();
    let best: number | null = null;
    const origin = new THREE.Vector3(x, y + 0.5, z);
    const down = new THREE.Vector3(0, -1, 0);
    for (const g of this.ground) {
      if (x < g.box.min.x || x > g.box.max.x || z < g.box.min.z || z > g.box.max.z) continue;
      if (g.box.min.y > y + 0.6 || g.box.max.y < y - maxDrop) continue;
      inv.copy(g.matrix).invert();
      ray.set(origin, down);
      local.copy(ray).applyMatrix4(inv);
      const hit = intersectGeometry(g.geometry, local, tri);
      if (hit) {
        tri.applyMatrix4(g.matrix);
        if (tri.y <= y + 0.6 && (best === null || tri.y > best)) best = tri.y;
      }
    }
    return best;
  }
}

const va = new THREE.Vector3();
const vb = new THREE.Vector3();
const vc = new THREE.Vector3();

/** First hit of a ray on a geometry's triangles (both faces), in the geometry's space. */
function intersectGeometry(g: THREE.BufferGeometry, ray: THREE.Ray, out: THREE.Vector3): boolean {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const index = g.index!;
  if (g.boundingSphere && !ray.intersectsSphere(g.boundingSphere)) return false;
  let bestT = Infinity;
  const hit = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    va.fromBufferAttribute(pos, index.getX(i));
    vb.fromBufferAttribute(pos, index.getX(i + 1));
    vc.fromBufferAttribute(pos, index.getX(i + 2));
    if (ray.intersectTriangle(va, vb, vc, false, hit)) {
      const t = hit.distanceToSquared(ray.origin);
      if (t < bestT) {
        bestT = t;
        out.copy(hit);
      }
    }
  }
  return bestT < Infinity;
}
