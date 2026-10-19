import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createGltfLoader } from './assets/gltfLoader';
import type { TreeVariant } from './treeGen';
import { modelAssetUrl } from './assets/modelUrl';
import { withModelLoadSlot } from './assets/modelLoadQueue';
import { downloadAsset } from './assets/download';

/**
 * Hero pines (tools/tree-gen-pine): four generated variants per file, each a wood mesh and a masked needle-pad mesh.
 * Off by default; `?heropine=1` swaps them in for species 'pine' (solitaryPine.ts stays the fallback).
 * The GLBs carry _WIND (x level, y limb phase, z parent phase, w needle flutter) and _PIVOT for the hierarchical wind
 * shader, and COLOR_0 = (crown AO, thickness, ground AO). Until that shader lands, the loader turns COLOR_0 into a plain
 * grey/soil vertex colour and keeps the packed values in the `tvAo` attribute.
 */
export const HERO_PINE_FILES = ['hero/hero-pine-near.glb', 'hero/hero-pine-mid.glb', 'hero/hero-pine-far.glb'] as const;
export const HERO_PINE_VARIANTS = 4;
/** Off until the hero pine is approved; `?heropine=1` turns it on and `?heropine=0` is the explicit escape once it becomes the default. */
export const HERO_PINE_DEFAULT = true;
/** The live solitary pine stands 25 m (solitaryPine.ts PROFILE.pine) with a +-5 % seeded spread: a hero pine is scaled to the same height so placement and sight lines do not move. */
export const HERO_PINE_HEIGHT = 25;
/** Multiplies the needle albedo. The conifer atlas is a pale grey-green and the foliage shader pulls saturation back, so this warms and darkens it until the crown's measured mean colour matches the solitary pine's (about 153, 154, 114 at 30 m, 11:00). */
export const HERO_NEEDLE_TINT = new THREE.Color(0.63, 0.68, 0.31);
const seededSpread = (seed: number): number => { let a = (seed * 1291 + 4 * 17) >>> 0; a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return 0.94 + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 0.10; };
/** `?pinetint=r,g,b` overrides the needle tint (a look-development aid; the default is HERO_NEEDLE_TINT). */
function needleTint(search = typeof location !== 'undefined' ? location.search : ''): THREE.Color {
  try {
    const raw = new URLSearchParams(search).get('pinetint')?.split(',').map(Number);
    if (raw?.length === 3 && raw.every((v) => Number.isFinite(v) && v >= 0 && v <= 3)) return new THREE.Color(raw[0]!, raw[1]!, raw[2]!);
  } catch { /* the default tint */ }
  return HERO_NEEDLE_TINT;
}
export type HeroPineTemplates = readonly [GLTF, GLTF, GLTF];

export function heroPineEnabled(search = typeof location !== 'undefined' ? location.search : ''): boolean {
  try { const flag = new URLSearchParams(search).get('heropine'); return flag === '1' ? true : flag === '0' ? false : HERO_PINE_DEFAULT; } catch { return HERO_PINE_DEFAULT; }
}

const pending = new Map<string, Promise<GLTF>>();
let loaded: HeroPineTemplates | null = null;
export const heroPineTemplates = (): HeroPineTemplates | null => loaded;

function load(file: string): Promise<GLTF> {
  const existing = pending.get(file);
  if (existing) return existing;
  const request = withModelLoadSlot(async () => {
    const url = modelAssetUrl(`flora/${file}`, import.meta.env.BASE_URL, document.baseURI);
    const buffer = await downloadAsset(url, { label: 'The hero pine model', model: `flora/${file}` });
    return createGltfLoader().parseAsync(buffer, new URL('.', url).href);
  }).catch((error: unknown) => { pending.delete(file); throw error; });
  pending.set(file, request);
  return request;
}

export async function loadHeroPine(progress?: (loaded: number, total: number) => void): Promise<HeroPineTemplates> {
  let done = 0;
  loaded = await Promise.all(HERO_PINE_FILES.map((file) => load(file).then((gltf) => { progress?.(++done, HERO_PINE_FILES.length); return gltf; }))) as unknown as HeroPineTemplates;
  return loaded;
}

export interface HeroPineForest {
  variant(seed: number): TreeVariant;
  materials: readonly { wood: THREE.Material | null; leaf: THREE.Material }[];
  /** Trunk-only footprint (the flare and root lobes are not obstacles). */
  collisionRadius(seed: number, instanceScale: number): number;
  dispose(): void;
}

function find(gltf: GLTF, name: string): THREE.Mesh {
  let found: THREE.Mesh | null = null;
  gltf.scene.traverse((o) => { if (o.name === name && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh; });
  if (!found) throw new Error(`The hero pine model lacks ${name}.`);
  return found;
}

/** Vertex colour stand-in for the hierarchical shading: leaves darken with crown AO, wood with ground contact (soil tint). */
function bakeLook(geometry: THREE.BufferGeometry, leaf: boolean, height: number) {
  const position = geometry.getAttribute('position');
  const packed = geometry.getAttribute('color');
  geometry.setAttribute('tvAo', packed);
  const out = new Float32Array(packed.count * 3);
  for (let i = 0; i < packed.count; i++) {
    const ao = packed.getX(i), ground = packed.getZ(i);
    if (leaf) { const k = 0.82 + 0.18 * ao; out.set([k, k, k], i * 3); }
    else {
      // Scots-pine bark warms from grey-brown at the foot to orange-red high on the trunk.
      const up = THREE.MathUtils.smoothstep(position.getY(i) / height, 0.22, 0.85), k = ao * (0.4 + 0.6 * ground), soil = 1 - ground;
      out.set([k * (1 + 0.5 * soil) * (1 + 0.14 * up), k * (1 + 0.1 * soil) * (1 - 0.02 * up), k * (1 - 0.25 * soil) * (1 - 0.12 * up)], i * 3);
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(out, 3));
}

export function createHeroPineForest(templates: HeroPineTemplates): HeroPineForest {
  const geometries = new Set<THREE.BufferGeometry>();
  const owned = new Set<THREE.Material>();
  const textures = new Map<THREE.Texture, THREE.Texture>();
  const tex = (t: THREE.Texture) => { let c = textures.get(t); if (!c) { c = t.clone(); c.anisotropy = 8; c.needsUpdate = true; textures.set(t, c); } return c; };
  const own = (m: THREE.MeshStandardMaterial) => {
    const c = m.clone();
    for (const [key, value] of Object.entries(c as unknown as Record<string, unknown>)) {
      if ((value as THREE.Texture | null)?.isTexture) (c as unknown as Record<string, unknown>)[key] = tex(value as THREE.Texture);
    }
    c.vertexColors = true;
    if (c.alphaTest > 0) c.color.multiply(needleTint());
    c.alphaToCoverage = c.alphaTest > 0;
    owned.add(c);
    return c;
  };
  const sample = find(templates[0], 'v0-wood');
  const materials = templates.map((gltf) => ({
    wood: own(find(gltf, 'v0-wood').material as THREE.MeshStandardMaterial),
    leaf: own(find(gltf, 'v0-leaf').material as THREE.MeshStandardMaterial),
  }));
  void sample;
  const variants = new Map<number, TreeVariant>();
  const extras = (n: number) => (find(templates[0], `v${n}-wood`).userData ?? {}) as { trunkRadius?: number; height?: number };
  return {
    materials,
    variant(seed) {
      const n = ((seed % HERO_PINE_VARIANTS) + HERO_PINE_VARIANTS) % HERO_PINE_VARIANTS;
      let tree = variants.get(n);
      if (tree) return tree;
      let crownRadius = 0;
      const native = (extras(n).height as number | undefined) ?? 18, scale = HERO_PINE_HEIGHT * seededSpread(seed) / native;
      const windScale = new THREE.Matrix4().makeScale(scale, scale, scale);
      const lods = templates.map((gltf, l) => {
        const wood = find(gltf, `v${n}-wood`).geometry.clone(), leaf = find(gltf, `v${n}-leaf`).geometry.clone();
        const heightOf = (extras(n).height as number | undefined) ?? 18;
        bakeLook(wood, false, heightOf); bakeLook(leaf, true, heightOf);
        wood.scale(scale, scale, scale); leaf.scale(scale, scale, scale);
        // Branch anchors are points in the same space as the scaled vertices.
        for (const geometry of [wood, leaf]) geometry.getAttribute('_pivot').applyMatrix4(windScale);
        wood.computeBoundingBox(); wood.computeBoundingSphere(); leaf.computeBoundingBox(); leaf.computeBoundingSphere();
        if (l === 0) {
          const trunkIndex = (extras(n) as { trunkIndexCount?: number }).trunkIndexCount;
          // Collision and contact geometry use the trunk and roots only; limbs and stubs are drawn, not solid.
          if (typeof trunkIndex === 'number') wood.userData.twigIndex = trunkIndex;
          const p = leaf.getAttribute('position');
          for (let i = 0; i < p.count; i++) crownRadius = Math.max(crownRadius, Math.hypot(p.getX(i), p.getZ(i)));
        }
        geometries.add(wood); geometries.add(leaf);
        const count = (g: THREE.BufferGeometry) => (g.index?.count ?? g.getAttribute('position').count) / 3;
        return { wood, leaf, tris: count(wood) + count(leaf) };
      }) as TreeVariant['lods'];
      const info = extras(n);
      tree = { species: 'pine', height: native * scale, crownRadius, trunkRadius: (info.trunkRadius ?? 0.5) * scale, bark: 'pine', leafTexture: 'needle', crownTexture: 'conifer', lods };
      variants.set(n, tree);
      return tree;
    },
    collisionRadius(seed, instanceScale) {
      const tree = this.variant(seed);
      return tree.trunkRadius * instanceScale + 0.05;
    },
    dispose() {
      geometries.forEach((g) => g.dispose()); owned.forEach((m) => m.dispose()); textures.forEach((t) => t.dispose());
      geometries.clear(); owned.clear(); textures.clear(); variants.clear();
    },
  };
}
