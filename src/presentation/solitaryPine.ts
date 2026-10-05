import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mulberry32 } from '../world/noise';
import type { Species, TreeVariant } from './treeGen';
import { barkTextures } from './treeTextures';
import { installBarkDetail } from './treeMaterials';
import { assertNaturalModelBudget } from './naturalModelBudget';

export const PINE_FILES = ['solitary-pine-under-10k.glb', 'solitary-pine-mid.glb', 'solitary-pine-far.glb'] as const;
export type PineSpecies = 'pine' | 'fir' | 'shorepine';
export type PineTemplates = readonly [GLTF, GLTF, GLTF];
const pending = new Map<string, Promise<GLTF>>();

export function isPineSpecies(species: Species): species is PineSpecies {
  return species === 'pine' || species === 'fir' || species === 'shorepine';
}

export function solitaryPineUrl(file: string, base = import.meta.env.BASE_URL, page = document.baseURI) {
  return new URL(`${base}models/flora/${file}`, page);
}

/** Required art: failures reach the existing loading screen's Retry rather than restoring old conifers. */
function load(file: string): Promise<GLTF> {
  const existing = pending.get(file);
  if (existing) return existing;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  const request = (async () => {
    const url = solitaryPineUrl(file);
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`The forest model could not load (HTTP ${response.status}).`);
    if (response.headers.get('content-type')?.includes('text/html')) throw new Error('The forest model URL returned a page instead of model data.');
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 12) throw new Error('The forest model download is incomplete.');
    const header = new DataView(buffer);
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== buffer.byteLength) {
      throw new Error('The forest model download is not a complete GLB 2 file.');
    }
    const gltf = await new GLTFLoader().parseAsync(buffer, new URL('.', url).href);
    if (new THREE.Box3().setFromObject(gltf.scene).isEmpty()) throw new Error('The forest model contains no geometry.');
    const decoded = parts(gltf);
    if (file !== PINE_FILES[2] && !decoded.wood) throw new Error('Close forest models must include real woody branches.');
    return gltf;
  })().catch((error: unknown) => {
    pending.delete(file);
    throw error;
  }).finally(() => clearTimeout(timeout));
  pending.set(file, request);
  return request;
}

/** Cache CPU templates; every world receives separate disposable GPU resources. */
export async function loadSolitaryPine(): Promise<PineTemplates> {
  return await Promise.all(PINE_FILES.map(load)) as unknown as PineTemplates;
}

interface Part { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; matrix: THREE.Matrix4 }
interface Parts { wood: Part | null; leaf: Part }
function parts(gltf: GLTF): Parts {
  gltf.scene.updateMatrixWorld(true);
  let wood: Part | null = null, leaf: Part | null = null;
  gltf.scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material) || !(mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
      throw new Error('The forest model requires one PBR material per mesh.');
    }
    const material = mesh.material as THREE.MeshStandardMaterial;
    const part = { geometry: mesh.geometry, material, matrix: mesh.matrixWorld.clone() };
    if (material.alphaTest > 0) {
      if (leaf) throw new Error('The forest model has unexpected foliage meshes.');
      leaf = part;
    } else {
      if (wood) throw new Error('The forest model has unexpected wood meshes.');
      wood = part;
    }
  });
  // traverse assigns these synchronously; an explicit result avoids TypeScript
  // treating callback-assigned locals as their initial null values.
  const complete = { wood, leaf } as { wood: Part | null; leaf: Part | null };
  const leafPart = complete.leaf;
  if (!leafPart) throw new Error('The forest model has no masked foliage.');
  assertNaturalModelBudget('Solitary Pine', [complete.wood?.geometry ?? null, leafPart.geometry]);
  return { wood: complete.wood, leaf: leafPart };
}

const PROFILE: Record<PineSpecies, { height: number }> = {
  pine: { height: 25 }, fir: { height: 22 }, shorepine: { height: 8.5 },
};

/** Maximum radial extent of both close wood surfaces below a horizontal clearance plane.
 * Clip crossing triangle edges too: a long branch can enter the slab without a vertex at its top. */
function woodRadius(lods: TreeVariant['lods'], top: number): number {
  let radius = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  for (const lod of lods.slice(0, 2)) {
    const geometry = lod.wood;
    if (!geometry) continue;
    const positions = geometry.getAttribute('position'), index = geometry.index;
    const count = index?.count ?? positions.count;
    for (let i = 0; i < count; i += 3) {
      for (let edge = 0; edge < 3; edge++) {
        const ai = index ? index.getX(i + edge) : i + edge;
        const bi = index ? index.getX(i + (edge + 1) % 3) : i + (edge + 1) % 3;
        a.fromBufferAttribute(positions, ai); b.fromBufferAttribute(positions, bi);
        if (a.y <= top) radius = Math.max(radius, Math.hypot(a.x, a.z));
        if ((a.y < top && b.y > top) || (b.y < top && a.y > top)) {
          const t = (top - a.y) / (b.y - a.y);
          radius = Math.max(radius, Math.hypot(THREE.MathUtils.lerp(a.x, b.x, t), THREE.MathUtils.lerp(a.z, b.z, t)));
        }
      }
    }
  }
  return radius;
}

export interface PineForest {
  variant(species: PineSpecies, seed: number): TreeVariant;
  materials: readonly { wood: THREE.Material | null; leaf: THREE.Material }[];
  /** Conservative wood footprint through the player clearance slab, including the actual buried origin. */
  collisionRadius(species: PineSpecies, seed: number, instanceScale: number, groundDepth?: number): number;
  dispose(): void;
}

/** Flatten source transforms and share textures/materials across all instanced conifers in this world. */
export function createPineForest(templates: PineTemplates): PineForest {
  const source = templates.map(parts);
  if (!source[0]!.wood || !source[1]!.wood) throw new Error('Close forest models must include real woody branches.');
  const nativeBounds = new THREE.Box3().setFromObject(templates[0].scene);
  const nativeHeight = nativeBounds.max.y - nativeBounds.min.y;
  if (!(nativeHeight > 0)) throw new Error('The forest model has invalid bounds.');
  const textures = new Map<THREE.Texture, THREE.Texture>();
  const ownedMaterials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const variants = new Map<string, TreeVariant>();
  const cloneTexture = (texture: THREE.Texture): THREE.Texture => {
    let clone = textures.get(texture);
    if (!clone) {
      clone = texture.clone(); clone.anisotropy = 16; clone.needsUpdate = true;
      textures.set(texture, clone);
    }
    return clone;
  };
  const cloneMaterial = (original: THREE.MeshStandardMaterial) => {
    const material = original.clone();
    // Texture images are retained CPU data. Texture objects and GPU handles belong to this world.
    const fields = material as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(fields)) {
      if (!(value as THREE.Texture | null)?.isTexture) continue;
      const texture = value as THREE.Texture;
      fields[key] = cloneTexture(texture);
    }
    material.vertexColors = false;
    material.alphaToCoverage = material.alphaTest > 0;
    ownedMaterials.add(material);
    return material;
  };
  const nearMaterials = { wood: cloneMaterial(source[0]!.wood!.material), leaf: cloneMaterial(source[0]!.leaf.material) };
  // Needle UVs match near; remeshed mid wood has its own baked bark atlas.
  const materials = [nearMaterials, { wood: cloneMaterial(source[1]!.wood!.material), leaf: nearMaterials.leaf }, { wood: source[2]!.wood ? cloneMaterial(source[2]!.wood.material) : null, leaf: cloneMaterial(source[2]!.leaf.material) }];
  const bark = barkTextures('pine', 1024);
  const detail = { map: cloneTexture(bark.map) as THREE.DataTexture, surface: cloneTexture(bark.surface) as THREE.DataTexture };
  for (const level of materials) if (level.wood) installBarkDetail(level.wood, detail);
  let disposed = false;
  return {
    materials,
    variant(species, seed) {
      if (disposed) throw new Error('The forest resources have been disposed.');
      const key = `${species}:${seed}`;
      const cached = variants.get(key);
      if (cached) return cached;
      const profile = PROFILE[species];
      const height = profile.height * (0.94 + mulberry32(seed * 1291 + species.length * 17)() * 0.10);
      const scale = height / nativeHeight;
      let crownRadius = 0, actualHeight = 0;
      const prepare = (part: Part | null) => {
        if (!part) return null;
        const g = part.geometry.clone().applyMatrix4(part.matrix);
        g.translate(0, -nativeBounds.min.y, 0).scale(scale, scale, scale);
        // Preserve the authored tree: grounding and one uniform scale only.
        // Fitting trunks or lowering crowns vertex-by-vertex stretches source faces and branch joins.
        g.computeBoundingBox(); g.computeBoundingSphere();
        actualHeight = Math.max(actualHeight, g.boundingBox!.max.y);
        const p = g.getAttribute('position');
        for (let i = 0; i < p.count; i++) crownRadius = Math.max(crownRadius, Math.hypot(p.getX(i), p.getZ(i)));
        geometries.add(g);
        return g;
      };
      const lods = source.map((part) => {
        const wood = prepare(part.wood), leaf = prepare(part.leaf);
        const triangles = (g: THREE.BufferGeometry | null) => g ? (g.index?.count ?? g.getAttribute('position').count) / 3 : 0;
        return { wood, leaf, tris: triangles(wood) + triangles(leaf) };
      }) as TreeVariant['lods'];
      const tree: TreeVariant = { species, height: actualHeight, crownRadius, trunkRadius: woodRadius(lods, 3.4), bark: 'pine', leafTexture: 'needle', crownTexture: 'conifer', lods };
      variants.set(key, tree);
      return tree;
    },
    collisionRadius(species, seed, instanceScale, groundDepth = 0.06) {
      const tree = this.variant(species, seed);
      return woodRadius(tree.lods, (2.6 + groundDepth) / instanceScale) * instanceScale + 0.03;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      variants.clear(); geometries.clear(); ownedMaterials.clear(); textures.clear();
    },
  };
}
