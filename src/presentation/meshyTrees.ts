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
import { installBarkDetail } from './treeMaterials';
import { barkTextures } from './treeTextures';
import { leafAtlasInUse, leafAtlasTexture, leafAtlasWanted, loadLeafAtlas, broadleafCellWeights, LEAF_ATLAS_GRID } from './leafAtlas';
import { buildCanopy, canopyAtlasTexture, growTwigs, trimExposedWood, NEAR_CANOPY, MID_CANOPY, twigTriangles, type CanopyTwig } from './canopy';

/** Owner-supplied sources. Plinth-bearing 3106/1459 are prepared reserves, not active plantings. */
export const MESHY_TREE_IDS = ['fir-spire', 'oak-elder', 'palm-date', 'palm-fan', 'palm-lean', 'tree-0208', 'tree-1537', 'tree-1527', 'tree-1521', 'tree-4949', 'tree-1505', 'tree-4815', 'verdant-sentinel'] as const;
export type MeshyTreeTemplates = ReadonlyMap<string, readonly [GLTF, GLTF, GLTF]>;
export const MESHY_TREE_LODS = ['near', 'mid', 'far'] as const;
const pending = new Map<string, Promise<GLTF>>();

/** Broadleaf kinds whose exported leaflets leave a thin crown (A70). */
const BROADLEAF = new Set<Species>(['oak', 'birch', 'orchard']);
/** Kinds whose trunks take the metre-scale bark detail (A133). */
const BARK_DETAIL = new Set<Species>(['oak', 'orchard', 'shrub', 'dead']);
/** Each detail level of a tree stays under the natural-model budget; thickening fills up to just below it. */
const TREE_TRIANGLES = 19_800;
/**
 * The extra layers of a near broadleaf crown (A70, A72): each the exported cards again, turned about the crown's heart
 * and drawn toward it, so its cards fall between the cards already there and stay inside the crown's outline. The
 * second turns the other way and sits deeper, filling the crown's heart.
 */
// A79: only the inner layer. A layer at 90 % lay just under the crown's surface and showed through its gaps as a second,
// smeared copy of the outer cards (owner playtest: noisy, smeared crowns); the inner one fills the body and stays behind.
// A133: the layer's cards (now the cut-up sheets, see splitSheets) are drawn at 0.85 of their size and spun about
// their own faces, so the layer adds separate, slightly smaller clusters rather than a turned copy of the same cards.
// At 0.6 the crown lost too much cover (GPU check). Same triangles as before.
const CROWN_LAYERS: readonly { turn: number; scale: readonly [number, number, number] }[] = [
  { turn: -1.91, scale: [0.8, 0.87, 0.8] },
];
/** How the large source sheets are cut (A133): sheets over 3 m become pieces of whole grid cells about 2 m across, up to 0.35 m apart in depth. */
export const SHEET_SPLIT = { minSize: 3, piece: 2, depth: 0.35, tilt: 0.12 } as const;
/** Each added card's size, of the exported card's (A133). */
export const CLUSTER_SCALE = 0.85;
/** Cluster-canopy cards (A134): a near crown's cap, and a middle crown's share of its source triangles. */
export const CANOPY_NEAR_CARDS = 6000;
export const CANOPY_MID_SHARE = 1.2;

/**
 * Break the source's large leaf sheets into separate smaller cards at different depths (A133).
 *
 * The broadleaf exports carry two kinds of foliage card: small cluster cards (well under a metre) and large curved
 * sheets, 7 x 7 vertex grids some 5-8 m across, set along the crown's axes. A sheet carries one clustered leaf picture,
 * so close up it read as a single flat cut-out. Every sheet larger than `minSize` is cut into pieces of whole grid cells about `piece`
 * metres across, each with its own vertices, pushed in or out along the sheet's normal and tilted a little, so the sheet
 * becomes a loose volume of smaller cards. Seen square on the pieces still join into the same picture, so nothing opens up;
 * from any other angle they part in depth. Triangles, UVs and normals are unchanged, and small cards are left as they are.
 */
export function splitSheets(geometry: THREE.BufferGeometry, opts: { readonly minSize: number; readonly piece: number; readonly depth: number; readonly tilt: number }): THREE.BufferGeometry {
  const index = geometry.index;
  if (!index) return geometry;
  const p = geometry.getAttribute('position'), count = p.count;
  const parent = new Int32Array(count).map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]!]!; i = parent[i]!; } return i; };
  for (let t = 0; t < index.count; t += 3) {
    const a = find(index.getX(t));
    parent[find(index.getX(t + 1))] = a; parent[find(index.getX(t + 2))] = a;
  }
  const boxes = new Map<number, THREE.Box3>(), v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const r = find(i); let box = boxes.get(r);
    if (!box) { box = new THREE.Box3(); boxes.set(r, box); }
    box.expandByPoint(v.fromBufferAttribute(p, i));
  }
  const sheets = new Set<number>();
  for (const [r, box] of boxes) if (box.getSize(v).length() > opts.minSize) sheets.add(r);
  if (!sheets.size) return geometry;
  // Grid cell of each sheet vertex: the sheet's 7 x 7 grid is evenly spaced, so a vertex's cell along each in-plane
  // axis is its rank among the sheet's distinct coordinates there.
  const attributes = Object.keys(geometry.attributes);
  const source = attributes.map(name => geometry.getAttribute(name) as THREE.BufferAttribute);
  const out = source.map(a => Array.from(a.array as ArrayLike<number>));
  const newIndex: number[] = [];
  const pieceVertex = new Map<string, number>();
  const pieceOf = new Map<number, { axes: [number, number, number]; box: THREE.Box3 }>();
  for (const r of sheets) {
    const size = boxes.get(r)!.getSize(new THREE.Vector3()).toArray();
    const thin = size.indexOf(Math.min(...size));
    const axes = [0, 1, 2].filter(k => k !== thin) as [number, number];
    pieceOf.set(r, { axes: [axes[0], axes[1], thin], box: boxes.get(r)! });
  }
  // Grid cells across each sheet (its vertex grid is square), and how many cells make a piece of about `piece` metres.
  const verticesOf = new Map<number, number>();
  for (let i = 0; i < count; i++) { const r = find(i); if (sheets.has(r)) verticesOf.set(r, (verticesOf.get(r) ?? 0) + 1); }
  const cell = (r: number, centre: THREE.Vector3): [number, number] => {
    const s = pieceOf.get(r)!, min = s.box.min.toArray(), max = s.box.max.toArray(), c = centre.toArray();
    const across = Math.max(1, Math.round(Math.sqrt(verticesOf.get(r)!)) - 1);
    const span = Math.max(max[s.axes[0]]! - min[s.axes[0]]!, max[s.axes[1]]! - min[s.axes[1]]!);
    const per = Math.max(1, Math.round(opts.piece / Math.max(1e-6, span / across)));
    const at = (k: number) => Math.min(across - 1, Math.max(0, Math.floor((c[k]! - min[k]!) / Math.max(1e-6, max[k]! - min[k]!) * across)));
    return [Math.floor(at(s.axes[0]) / per), Math.floor(at(s.axes[1]) / per)];
  };
  const pieces = new Map<string, { r: number; vertices: number[] }>();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < index.count; t += 3) {
    const tri = [index.getX(t), index.getX(t + 1), index.getX(t + 2)], r = find(tri[0]!);
    if (!sheets.has(r)) { newIndex.push(...tri); continue; }
    a.fromBufferAttribute(p, tri[0]!); b.fromBufferAttribute(p, tri[1]!); c.fromBufferAttribute(p, tri[2]!);
    const [u, w] = cell(r, a.add(b).add(c).divideScalar(3));
    const key = `${r}:${u}:${w}`;
    let piece = pieces.get(key);
    if (!piece) { piece = { r, vertices: [] }; pieces.set(key, piece); }
    for (const vertex of tri) {
      const vk = `${key}:${vertex}`;
      let at = pieceVertex.get(vk);
      if (at === undefined) {
        at = out[0]!.length / source[0]!.itemSize;
        for (let k = 0; k < source.length; k++) for (let e = 0; e < source[k]!.itemSize; e++) out[k]!.push((source[k]!.array as ArrayLike<number>)[vertex * source[k]!.itemSize + e]!);
        pieceVertex.set(vk, at); piece.vertices.push(at);
      }
      newIndex.push(at);
    }
  }
  const pos = out[attributes.indexOf('position')]!;
  let seed = 0;
  const random = () => { seed += 1; const x = Math.sin(seed * 127.1 + pieces.size * 3.7) * 43758.5453; return x - Math.floor(x); };
  const m = new THREE.Matrix4(), rot = new THREE.Matrix4(), centre = new THREE.Vector3(), axis = new THREE.Vector3();
  for (const piece of pieces.values()) {
    const s = pieceOf.get(piece.r)!;
    centre.set(0, 0, 0);
    for (const i of piece.vertices) centre.add(v.set(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!));
    centre.divideScalar(piece.vertices.length);
    const push = new THREE.Vector3(); push.setComponent(s.axes[2], (random() * 2 - 1) * opts.depth);
    axis.set(0, 0, 0).setComponent(s.axes[0], 1);
    rot.makeRotationAxis(axis, (random() * 2 - 1) * opts.tilt);
    axis.set(0, 0, 0).setComponent(s.axes[1], 1);
    rot.multiply(new THREE.Matrix4().makeRotationAxis(axis, (random() * 2 - 1) * opts.tilt));
    m.makeTranslation(centre.x + push.x, centre.y + push.y, centre.z + push.z).multiply(rot).multiply(new THREE.Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z));
    for (const i of piece.vertices) {
      v.set(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!).applyMatrix4(m);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    }
  }
  const result = new THREE.BufferGeometry();
  attributes.forEach((name, k) => {
    const attribute = source[k]!;
    const Array_ = (attribute.array as Float32Array).constructor as Float32ArrayConstructor;
    result.setAttribute(name, new THREE.BufferAttribute(new Array_(out[k]!), attribute.itemSize, attribute.normalized));
  });
  result.setIndex(newIndex);
  result.computeBoundingBox(); result.computeBoundingSphere();
  return result;
}

/**
 * Shrink every connected card (cluster) of a leaf geometry about its own centre and spin it about its face normal by a
 * stable per-card angle (A133). Positions only; UVs, normals and index are kept.
 */
export function shrinkClusters(geometry: THREE.BufferGeometry, scale: number): void {
  const p = geometry.getAttribute('position') as THREE.BufferAttribute, index = geometry.index;
  if (!index) return;
  const parent = new Int32Array(p.count).map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]!]!; i = parent[i]!; } return i; };
  for (let t = 0; t < index.count; t += 3) {
    const a = find(index.getX(t)), b = find(index.getX(t + 1)), c = find(index.getX(t + 2));
    parent[b] = a; parent[find(c)] = a;
  }
  const sums = new Map<number, number[]>();
  for (let i = 0; i < p.count; i++) {
    const r = find(i); let s = sums.get(r);
    if (!s) { s = [0, 0, 0, 0, 0, 0, 0]; sums.set(r, s); }
    s[0]! += p.getX(i); s[1]! += p.getY(i); s[2]! += p.getZ(i); s[3]! += 1;
  }
  // Face normal of each card from its first triangle.
  const n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), v0 = new THREE.Vector3();
  for (let t = 0; t < index.count; t += 3) {
    const r = find(index.getX(t)), s = sums.get(r)!;
    if (s[4] !== 0 || s[5] !== 0 || s[6] !== 0) continue;
    v0.fromBufferAttribute(p, index.getX(t));
    e1.fromBufferAttribute(p, index.getX(t + 1)).sub(v0); e2.fromBufferAttribute(p, index.getX(t + 2)).sub(v0);
    n.crossVectors(e1, e2);
    if (n.lengthSq() < 1e-12) continue;
    n.normalize(); s[4] = n.x; s[5] = n.y; s[6] = n.z;
  }
  const q = new THREE.Quaternion(), v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const r = find(i), s = sums.get(r)!;
    c.set(s[0]! / s[3]!, s[1]! / s[3]!, s[2]! / s[3]!);
    n.set(s[4]!, s[5]!, s[6]!);
    const spin = (Math.sin(r * 12.9898) * 43758.5453 % 1) * Math.PI * 2;
    if (n.lengthSq() > 0.5) q.setFromAxisAngle(n, spin); else q.identity();
    v.fromBufferAttribute(p, i).sub(c).applyQuaternion(q).multiplyScalar(scale).add(c);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true;
}

/**
 * Fill a thin crown close up (A70). The 0.0.12 export cut the broadleaf leaf plates to small leaflets, so a near crown
 * shows sky through it. The near detail gains an inner layer of the same cards (CROWN_LAYERS), within the tree
 * budget: the near wood was simplified to make room for them (A72, tools/rebalance-tree-wood.mjs). Middle and far
 * detail, where the gaps do not read, are left as exported.
 */
function thicken(leaf: THREE.BufferGeometry | null, enabled: boolean, room: number): THREE.BufferGeometry | null {
  if (!leaf || !enabled || room < 300) return leaf;
  leaf.computeBoundingBox();
  const box = leaf.boundingBox!;
  const heart = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y * 0.4 + box.max.y * 0.6, (box.min.z + box.max.z) / 2);
  const layers: THREE.BufferGeometry[] = [];
  for (const { turn, scale } of CROWN_LAYERS) {
    if (room < 300) break;
    const layer = leaf.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(heart.x, heart.y, heart.z)
      .multiply(new THREE.Matrix4().makeRotationY(turn)).multiply(new THREE.Matrix4().makeScale(...scale))
      .multiply(new THREE.Matrix4().makeTranslation(-heart.x, -heart.y, -heart.z)));
    shrinkClusters(layer, CLUSTER_SCALE);
    // Within the tree budget: where a whole layer would not fit, an even share of its cards does.
    const cards = layer.index ? layer.index.count / 3 : layer.getAttribute('position').count / 3;
    if (cards > room && layer.index) {
      const keep = room / cards, src = layer.index.array, out: number[] = [];
      for (let t = 0, acc = 0; t < cards; t++) { acc += keep; if (acc >= 1) { acc -= 1; out.push(src[t * 3]!, src[t * 3 + 1]!, src[t * 3 + 2]!); } }
      layer.setIndex(out);
    } else if (cards > room) { layer.dispose(); break; }
    room -= (layer.index ? layer.index.count : layer.getAttribute('position').count) / 3;
    layers.push(layer);
  }
  if (!layers.length) return leaf;
  const merged = mergeGeometries([leaf, ...layers]);
  layers.forEach(layer => layer.dispose());
  if (!merged) return leaf;
  const exportedIndexCount = leaf.index ? leaf.index.count : leaf.getAttribute('position').count;
  leaf.dispose();
  merged.computeBoundingBox(); merged.computeBoundingSphere();
  // The exported cards come first; the added layers follow them (for diagnostics and the layer comparisons).
  merged.userData.exportedIndexCount = exportedIndexCount;
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
  // B12: the procedural leaf atlases load beside the models (a failure keeps the earlier leaf art).
  if (leafAtlasWanted()) await loadLeafAtlas();
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
/** Albedo lift of a conifer's source needle sheet (measured texture means; see cloneMaterial). */
export const CONIFER_LEAF_LIFT: Partial<Record<Species, THREE.Color>> = {
  fir: new THREE.Color(2.3, 2.45, 2.2), shorepine: new THREE.Color(2.3, 2.45, 2.2),
};
/**
 * The fir's attached leaf atlas (8×8 cells) keeps a pale blue-green fern sheet in its top-right cell, unlike every other
 * cell's dark needles; near firs mapped about a thousand card vertices onto it and, once conifers were lit (0.0.16), it
 * read as a cyan patch in the crown (playtest 8). Those cards take the dense fir sprite two rows down instead.
 */
export function remapStrayFernCell(geometry: THREE.BufferGeometry): number {
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
  if (!uv) return 0;
  let moved = 0;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    if (u > 0.875 && v < 0.125) { uv.setY(i, v + 0.25); moved++; }
  }
  if (moved) uv.needsUpdate = true;
  return moved;
}

/** Only source transforms, one uniform family scale and root translation; no crown/axis deformation. */
export function createMeshyForest(templates: MeshyTreeTemplates): MeshyForest {
  const conifers = new Map<string, THREE.Texture>();
  const textures = new Map<THREE.Texture, THREE.Texture>(), materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>();
  const variants = new Map<string, TreeVariant>(), palettes = new Map<string, readonly { wood: THREE.Material | null; leaf: THREE.Material | null }[]>();
  const cloneMaterial = (source: THREE.MeshStandardMaterial, wood: boolean, species?: Species) => {
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
    // Playtest 7: the fir sheet's needles average a linear albedo of about 0.035 (broadleaf sheets 0.10-0.15), so firs
    // read near-black at dusk beside lit broadleaf crowns. Lift them to a dark but lit green (~0.085).
    if (!wood && species && CONIFER_LEAF_LIFT[species]) {
      // B12: the procedural needle pads are painted at the lifted mean, so they take no lift and keep their own mips.
      const pads = leafAtlasInUse();
      if (pads) {
        const cutoff = Math.max(0.05, material.alphaTest) / 1.3, key = cutoff.toFixed(3);
        let needles = conifers.get(key);
        if (!needles) { needles = leafAtlasTexture(pads.fir, 'fir', cutoff, 'fir-needle-sheet'); conifers.set(key, needles); }
        material.map = needles; material.color.set(0xffffff);
        material.defines = { ...material.defines, TV_COVERAGE_MIPS: '' };
      } else material.color.multiply(CONIFER_LEAF_LIFT[species]!);
    }
    // A133: a broadleaf trunk's source atlas is soft and has no normal map, so close up it read flat and untextured. It
    // takes metre-scale triplanar oak bark with relief (the procedural trees' and pines' detail), deeper than theirs.
    if (wood && species && BARK_DETAIL.has(species)) {
      const bark = barkTextures(species === 'dead' ? 'dead' : 'oak', 1024);
      // A134: at 0.6 the bark darkened the trunks well below the source's warm brown; 0.4 keeps its relief and warmth.
      installBarkDetail(material, bark, { mix: 0.4, relief: 0.035 });
    }
    materials.add(material); return material;
  };
  // A134: one procedural leaf-cluster atlas for every rebuilt crown, with coverage-preserving mips.
  let atlas: THREE.DataTexture | null = null, broadleafAtlas: THREE.DataTexture | null = null;
  const clusterMaterial = (source: THREE.MeshStandardMaterial) => {
    const material = cloneMaterial(source, false);
    const cutoff = Math.max(0.05, material.alphaTest) / 1.3, pads = leafAtlasInUse();
    // B12: the 4 x 4 procedural cluster atlas (16 distinct twigs) replaces the 2 x 2 generated one behind ?leafatlas=1.
    if (pads) { broadleafAtlas ??= leafAtlasTexture(pads.broadleaf, 'broadleaf', cutoff, 'broadleaf-cluster-atlas'); material.map = broadleafAtlas; }
    else { atlas ??= canopyAtlasTexture(1024, NEAR_CANOPY.cells, cutoff); material.map = atlas; }
    for (const slot of ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'] as const) material[slot] = null;
    material.color.set(0xffffff); material.roughness = 0.85;
    material.defines = { ...material.defines, TV_COVERAGE_MIPS: '' };
    // Clumps shade as rounded masses of their own within the crown's: the crown normal takes less of the card's.
    material.userData.foliageLook = { crownNormal: 0.6 };
    material.needsUpdate = true;
    return material;
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
        if (leaf && (species === 'fir' || species === 'shorepine')) remapStrayFernCell(geometry);
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
      const clusters = BROADLEAF.has(species);
      const palette = decoded.map((parts, lod) => ({ wood: parts.wood ? cloneMaterial(parts.wood.material, true, species) : null, leaf: parts.leaf && species !== 'dead' ? (clusters && lod < 2 ? clusterMaterial(parts.leaf.material) : cloneMaterial(parts.leaf.material, false, species)) : null }));
      const lods = decoded.map((parts, lod) => {
        let wood = prepare(parts.wood, false);
        let exported = prepare(parts.leaf, true);
        // A134: near and middle broadleaf crowns are rebuilt as clumps of small leaf-cluster cards (see canopy.ts); the
        // source sheets only say where the leaves go. Far crowns keep the source cards.
        if (exported && lod < 2 && clusters) {
          const triangles = (g: THREE.BufferGeometry | null) => (g ? (g.index?.count ?? g.getAttribute('position').count) / 3 : 0);
          const shape = lod === 0 ? NEAR_CANOPY : MID_CANOPY;
          let cards = lod === 0 ? Math.min(CANOPY_NEAR_CARDS, Math.floor((TREE_TRIANGLES - triangles(wood)) / 2)) : Math.max(400, Math.round(triangles(exported) * CANOPY_MID_SHARE / 2));
          const seed = [...`${id}:${lod}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
          // The grown twigs (below) come out of the same triangle budget: fewer leaf cards make room for them, since
          // the twig clumps cover those leaves. A few rebuilds settle it (the twig count shifts a little with the cards).
          let canopy!: THREE.BufferGeometry, trimmedWood = wood;
          for (let attempt = 0; attempt < 4; attempt++) {
            const pads = leafAtlasInUse();
            canopy = buildCanopy(exported, wood, { ...shape, cards, seed, ...(pads ? { cells: LEAF_ATLAS_GRID, cellWeights: broadleafCellWeights(species) } : {}) });
            trimmedWood = wood ? trimExposedWood(wood, canopy, shape.clump * 1.6).geometry : null;
            const twigTris = twigTriangles((canopy.userData.canopy as { twigs: CanopyTwig[] }).twigs);
            const over = triangles(trimmedWood) + triangles(canopy) + twigTris - TREE_TRIANGLES;
            if (over <= 0 || attempt === 3) break;
            canopy.dispose(); if (trimmedWood !== wood) trimmedWood?.dispose();
            cards = Math.max(200, cards - Math.ceil(over / 2) - 25);
          }
          geometries.delete(exported); exported.dispose(); geometries.add(canopy);
          if (wood && trimmedWood !== wood) { geometries.delete(wood); wood.dispose(); geometries.add(trimmedWood!); wood = trimmedWood; }
          // Playtest 7: the twigs out to clumps beyond the boughs' reach (after the trim, which would cut them).
          const twigs = (canopy.userData.canopy as { twigs: CanopyTwig[] }).twigs;
          if (wood && twigs.length) { const grownWood = growTwigs(wood, twigs); geometries.delete(wood); wood.dispose(); geometries.add(grownWood); wood = grownWood; }
          const tris = triangles(wood) + triangles(canopy);
          return { wood, leaf: canopy, tris };
        }
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
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); conifers.forEach(t => t.dispose()); conifers.clear(); atlas?.dispose(); atlas = null; broadleafAtlas?.dispose(); broadleafAtlas = null;
      variants.clear(); palettes.clear(); geometries.clear(); materials.clear(); textures.clear();
    },
  };
}
