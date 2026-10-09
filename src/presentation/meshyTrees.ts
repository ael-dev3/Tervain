import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createGltfLoader } from './assets/gltfLoader';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Species, TreeVariant } from './treeGen';
import { assertNaturalModelBudget } from './naturalModelBudget';
import { deduplicateTreeTextures } from './treeTexturePool';
import { sampleLeafSurfaceSites } from './leafSurfaceSites';
import { modelAssetUrl } from './assets/modelUrl';
import { withModelLoadSlot } from './assets/modelLoadQueue';
import { downloadAsset } from './assets/download';

/** Owner-supplied sources. Plinth-bearing 3106/1459 are prepared reserves, not active plantings. */
export const MESHY_TREE_IDS = ['fir-spire', 'oak-elder', 'palm-date', 'palm-fan', 'palm-lean', 'tree-0208', 'tree-1537', 'tree-1527', 'tree-1521', 'tree-4949', 'tree-1505', 'tree-4815', 'verdant-sentinel'] as const;
export type MeshyTreeTemplates = ReadonlyMap<string, readonly [GLTF, GLTF, GLTF]>;
export const MESHY_TREE_LODS = ['near', 'mid', 'far'] as const;
const pending = new Map<string, Promise<GLTF>>();

/** Broadleaf kinds whose exported leaflets leave a thin crown (A70). */
const BROADLEAF = new Set<Species>(['oak', 'birch', 'orchard']);
/** Each detail level of a tree stays under the natural-model budget; thickening fills up to just below it. */
const TREE_TRIANGLES = 19_800;

/**
 * Fill a thin crown close up (A70). The 0.0.12 export cut the broadleaf leaf plates to small leaflets, so a near crown
 * shows sky through it. The near detail gains a second layer of the same cards, turned about the trunk and drawn a
 * tenth toward the crown's heart, filling the gaps between the first without changing the crown's outline. Middle and
 * far detail, where the gaps do not read, are left as exported.
 */
function thicken(leaf: THREE.BufferGeometry | null, enabled: boolean, room: number): THREE.BufferGeometry | null {
  if (!leaf || !enabled || room < 300) return leaf;
  leaf.computeBoundingBox();
  const box = leaf.boundingBox!;
  const heart = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y * 0.4 + box.max.y * 0.6, (box.min.z + box.max.z) / 2);
  const inner = leaf.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(heart.x, heart.y, heart.z)
    .multiply(new THREE.Matrix4().makeRotationY(0.83)).multiply(new THREE.Matrix4().makeScale(0.9, 0.93, 0.9))
    .multiply(new THREE.Matrix4().makeTranslation(-heart.x, -heart.y, -heart.z)));
  // Within the tree budget: where a whole second layer would not fit, an even share of its cards does.
  const cards = inner.index ? inner.index.count / 3 : inner.getAttribute('position').count / 3;
  if (cards > room && inner.index) {
    const keep = room / cards, src = inner.index.array, out: number[] = [];
    for (let t = 0, acc = 0; t < cards; t++) { acc += keep; if (acc >= 1) { acc -= 1; out.push(src[t * 3]!, src[t * 3 + 1]!, src[t * 3 + 2]!); } }
    inner.setIndex(out);
  } else if (cards > room) { inner.dispose(); return leaf; }
  const merged = mergeGeometries([leaf, inner]);
  inner.dispose();
  if (!merged) return leaf;
  leaf.dispose();
  merged.computeBoundingBox(); merged.computeBoundingSphere();
  return merged;
}

export function meshyTreeUrl(id: string, lod: typeof MESHY_TREE_LODS[number], base = import.meta.env.BASE_URL, page = document.baseURI): URL {
  return modelAssetUrl(`flora/meshy-012/${id}-${lod}.glb`, base, page);
}
interface Part { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; matrix: THREE.Matrix4 }
interface Parts { wood: Part | null; leaf: Part | null }
/** Only a rejected, not-yet-pooled parse owns these images; accepted templates stay immutable and cached. */
function disposeRejectedTree(gltf: GLTF): void {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>(), images = new Set<unknown>();
  for (const scene of new Set([gltf.scene, ...gltf.scenes])) scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
  });
  const recordImage = (image: unknown) => { if (Array.isArray(image)) image.forEach(recordImage); else images.add(image); };
  for (const material of materials) for (const value of Object.values(material)) if ((value as THREE.Texture | null)?.isTexture) textures.add(value as THREE.Texture);
  for (const texture of textures) recordImage(texture.image);
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
  for (const image of images) if (typeof (image as { close?: unknown } | null)?.close === 'function') (image as { close(): void }).close();
}
function assertDecodedTreeTextures(gltf: GLTF, decoded: Parts): void {
  const json = gltf.parser.json as { materials?: { pbrMetallicRoughness?: { baseColorTexture?: unknown; metallicRoughnessTexture?: unknown }; normalTexture?: unknown; occlusionTexture?: unknown; emissiveTexture?: unknown }[] };
  for (const part of [decoded.wood!, decoded.leaf!]) {
    const material = part.material;
    const sourceIndex = gltf.parser.associations.get(material)?.materials;
    const source = sourceIndex === undefined ? undefined : json.materials?.[sourceIndex];
    if (!source || !material.map) throw new Error('Tree albedo could not be decoded. Retry the model download.');
    const required = [material.map,
      ...(source.normalTexture ? [material.normalMap] : []),
      ...(source.occlusionTexture ? [material.aoMap] : []),
      ...(source.emissiveTexture ? [material.emissiveMap] : []),
      ...(source.pbrMetallicRoughness?.metallicRoughnessTexture ? [material.roughnessMap, material.metalnessMap] : []),
    ];
    for (const texture of required) {
      const image = texture?.image as { width?: number; height?: number } | null;
      if (!image || !(image.width! > 0 && image.height! > 0)) throw new Error('A required tree texture could not be decoded. Retry the model download.');
    }
  }
}
/** Semantic names are authored by the preparation pipeline; opaque leaf volumes are still foliage. */
export function meshyTreeParts(gltf: GLTF): Parts {
  gltf.scene.updateMatrixWorld(true);
  const result: Parts = { wood: null, leaf: null };
  gltf.scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material) || !(mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) throw new Error('Tree art requires one PBR material per semantic mesh.');
    const name = mesh.name.toLowerCase();
    const key = name.includes('foliage') ? 'leaf' : name.includes('wood') ? 'wood' : null;
    if (!key || result[key]) throw new Error('Tree art must contain one Wood and one Foliage mesh.');
    result[key] = { geometry: mesh.geometry, material: mesh.material as THREE.MeshStandardMaterial, matrix: mesh.matrixWorld.clone() };
  });
  if (!result.wood || !result.leaf) throw new Error('Tree art is missing its semantic wood or foliage.');
  assertNaturalModelBudget('Meshy tree', [result.wood.geometry, result.leaf.geometry]);
  const count = [result.wood, result.leaf].reduce((sum, part) => sum + (part.geometry.index?.count ?? part.geometry.getAttribute('position').count) / 3, 0);
  if (count >= 20_000) throw new Error('Tree art must remain strictly below 20,000 triangles.');
  return result;
}
/** The file a tree model's images come from when it carries none of its own (A71). */
function sharedImages(gltf: GLTF): string | null {
  const extras = (gltf.parser.json as { asset?: { extras?: { tervainSharedImages?: unknown } } }).asset?.extras;
  return typeof extras?.tervainSharedImages === 'string' ? extras.tervainSharedImages : null;
}

const TEXTURE_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'] as const;
const borrowed = new WeakSet<GLTF>();
/** Give a mid or far model the near model's textures, material by material, slot by slot (A71). */
function borrowTextures(near: GLTF, lod: GLTF) {
  if (!sharedImages(lod) || borrowed.has(lod)) return;
  const source = new Map<string, THREE.MeshStandardMaterial>();
  near.scene.traverse(o => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && !Array.isArray(m)) source.set(m.name, m); });
  lod.scene.traverse(o => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    const from = m && !Array.isArray(m) ? source.get(m.name) : undefined;
    if (!m || !from) return;
    for (const slot of TEXTURE_SLOTS) if (from[slot] && !m[slot]) (m as unknown as Record<string, THREE.Texture | null>)[slot] = from[slot];
    m.needsUpdate = true;
  });
  assertDecodedTreeTextures(lod, meshyTreeParts(lod));
  borrowed.add(lod);
}

async function load(id: string, lod: typeof MESHY_TREE_LODS[number]): Promise<GLTF> {
  const key = `${id}:${lod}`, existing = pending.get(key);
  if (existing) return existing;
  const request = withModelLoadSlot(async () => {
    const url = meshyTreeUrl(id, lod);
    const buffer = await downloadAsset(url, { label: `Tree ${id}`, model: `flora/meshy-012/${id}-${lod}.glb` });
    if (buffer.byteLength < 12) throw new Error(`Tree ${id} download is incomplete.`);
    const header = new DataView(buffer);
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== buffer.byteLength) throw new Error(`Tree ${id} is not a complete GLB 2 file.`);
    const gltf = await createGltfLoader().parseAsync(buffer, new URL('.', url).href);
    try {
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      if (bounds.isEmpty() || ![...bounds.min, ...bounds.max].every(Number.isFinite)) throw new Error(`Tree ${id} has invalid geometry bounds.`);
      // A mid or far file whose images are the near file's carries none of its own; it borrows them once loaded (A71).
      if (!sharedImages(gltf)) {
        assertDecodedTreeTextures(gltf, meshyTreeParts(gltf));
        await deduplicateTreeTextures(gltf, buffer);
      }
    } catch (error) {
      disposeRejectedTree(gltf);
      throw error;
    }
    return gltf;
  }).catch((error: unknown) => { pending.delete(key); throw error; });
  pending.set(key, request);
  return request;
}
/** Decode a bounded number of trees concurrently; failed requests can be retried by the loading screen. */
export async function loadMeshyTrees(ids: readonly string[] = MESHY_TREE_IDS, onProgress?: (loaded: number, total: number) => void): Promise<MeshyTreeTemplates> {
  const result = new Map<string, readonly [GLTF, GLTF, GLTF]>();
  const selected = [...new Set(ids)];
  let next = 0, active = true;
  onProgress?.(0, selected.length);
  try {
    await Promise.all(Array.from({ length: Math.min(3, selected.length) }, async () => {
      while (active && next < selected.length) {
        const id = selected[next++]!;
        const lods = await Promise.all(MESHY_TREE_LODS.map(lod => load(id, lod)));
        for (const lod of lods.slice(1)) borrowTextures(lods[0]!, lod);
        result.set(id, lods as unknown as readonly [GLTF, GLTF, GLTF]);
        if (active) onProgress?.(result.size, selected.length);
      }
    }));
  } finally {
    // Already shared in-flight requests can finish, but a failed build must not overwrite its Retry screen.
    active = false;
  }
  return result;
}
const FAMILIES: Record<Exclude<Species, 'pine'>, readonly string[]> = {
  oak: ['oak-elder', 'tree-0208', 'tree-1521'], birch: ['tree-1527', 'tree-4815', 'tree-1527'],
  fir: ['fir-spire'], shorepine: ['fir-spire'], palm: ['palm-date', 'palm-lean', 'palm-fan'],
  orchard: ['tree-4949', 'tree-4815', 'tree-4949'], shrub: ['tree-1521', 'tree-4949', 'tree-1521'], dead: ['tree-1537'],
};
const HEIGHT: Record<Exclude<Species, 'pine'>, number> = { oak: 18, birch: 16, fir: 24, shorepine: 10, palm: 14, orchard: 7, shrub: 1.5, dead: 13 };
export function meshyTreeId(species: Exclude<Species, 'pine'>, variant: number, explicit?: string): string {
  const family = FAMILIES[species]; return explicit ?? family[Math.abs(variant) % family.length]!;
}
export interface MeshyForest {
  variant(species: Exclude<Species, 'pine'>, seed: number, assetId?: string): TreeVariant;
  materialsFor(variant: TreeVariant): readonly { wood: THREE.Material | null; leaf: THREE.Material | null }[];
  dispose(): void;
}
/** Only source transforms, one uniform family scale and root translation; no crown/axis deformation. */
export function createMeshyForest(templates: MeshyTreeTemplates): MeshyForest {
  const textures = new Map<THREE.Texture, THREE.Texture>(), materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>();
  const variants = new Map<string, TreeVariant>(), palettes = new Map<string, readonly { wood: THREE.Material | null; leaf: THREE.Material | null }[]>();
  const cloneMaterial = (source: THREE.MeshStandardMaterial, wood: boolean) => {
    const material = source.clone(), fields = material as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(fields)) if ((value as THREE.Texture | null)?.isTexture) {
      const original = value as THREE.Texture;
      let owned = textures.get(original);
      if (!owned) { owned = original.clone(); owned.anisotropy = 16; owned.needsUpdate = true; textures.set(original, owned); }
      fields[key] = owned;
    }
    material.metalness = 0; material.roughness = Math.max(wood ? 0.88 : 0.82, material.roughness);
    material.emissive.set(0); material.envMapIntensity = 0.35;
    material.alphaToCoverage = material.alphaTest > 0;
    material.transparent = false;
    if (!wood) { material.side = THREE.DoubleSide; material.shadowSide = THREE.DoubleSide; }
    materials.add(material); return material;
  };
  let disposed = false;
  return {
    variant(species, seed, explicit) {
      if (disposed) throw new Error('Tree resources have been disposed.');
      const id = meshyTreeId(species, seed, explicit), key = `${species}:${id}`;
      const cached = variants.get(key); if (cached) return cached;
      const source = templates.get(id); if (!source) throw new Error(`Required tree ${id} is missing from the art catalog.`);
      const decoded = source.map(meshyTreeParts), bounds = new THREE.Box3().setFromObject(source[0].scene);
      const nativeHeight = bounds.max.y - bounds.min.y;
      if (!(nativeHeight > 0)) throw new Error(`Tree ${id} has no height.`);
      const scale = HEIGHT[species] / nativeHeight;
      let height = 0, crownRadius = 0, trunkRadius = 0;
      const prepare = (part: Part | null, leaf: boolean) => {
        if (!part || leaf && species === 'dead') return null;
        const geometry = part.geometry.clone().applyMatrix4(part.matrix);
        geometry.translate(0, -bounds.min.y, 0).scale(scale, scale, scale);
        geometry.computeBoundingBox(); geometry.computeBoundingSphere();
        const p = geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++) {
          height = Math.max(height, p.getY(i));
          // Clearing guards cover every rendered branch as well as leaves, including deadwood.
          crownRadius = Math.max(crownRadius, Math.hypot(p.getX(i), p.getZ(i)));
          if (!leaf && p.getY(i) < 2.6) trunkRadius = Math.max(trunkRadius, Math.hypot(p.getX(i), p.getZ(i)));
        }
        geometries.add(geometry); return geometry;
      };
      const palette = decoded.map(parts => ({ wood: parts.wood ? cloneMaterial(parts.wood.material, true) : null, leaf: parts.leaf && species !== 'dead' ? cloneMaterial(parts.leaf.material, false) : null }));
      const lods = decoded.map((parts, lod) => {
        const wood = prepare(parts.wood, false), exported = prepare(parts.leaf, true);
        const triangles = (g: THREE.BufferGeometry | null) => (g ? (g.index?.count ?? g.getAttribute('position').count) / 3 : 0);
        const leaf = thicken(exported, lod === 0 && BROADLEAF.has(species), TREE_TRIANGLES - triangles(wood) - triangles(exported));
        if (leaf && leaf !== exported) { geometries.delete(exported!); geometries.add(leaf); }
        return { wood, leaf, tris: [wood, leaf].reduce((sum, geometry) => sum + (geometry ? (geometry.index?.count ?? geometry.getAttribute('position').count) / 3 : 0), 0) };
      }) as TreeVariant['lods'];
      const leafSurfaceSites = lods[0].leaf && palette[0]!.leaf
        ? sampleLeafSurfaceSites(lods[0].leaf, palette[0]!.leaf as THREE.MeshStandardMaterial) : [];
      const variant: TreeVariant = { species, assetId: id, leafSurfaceSites, height, crownRadius, trunkRadius, bark: species === 'fir' || species === 'shorepine' ? 'pine' : species === 'dead' ? 'dead' : 'oak', leafTexture: 'oak', crownTexture: 'crown', lods };
      variants.set(key, variant); palettes.set(key, palette); return variant;
    },
    materialsFor(variant) { const found = palettes.get(`${variant.species}:${variant.assetId}`); if (!found) throw new Error('No owned materials for this tree.'); return found; },
    dispose() {
      if (disposed) return; disposed = true;
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      variants.clear(); palettes.clear(); geometries.clear(); materials.clear(); textures.clear();
    },
  };
}
