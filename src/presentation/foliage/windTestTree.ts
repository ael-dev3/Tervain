import * as THREE from 'three';
import { createGltfLoader } from '../assets/gltfLoader';
import { FOLIAGE_RESPONSE, type FoliageField } from './foliageWind';
import { crownOf, foliageGeometryFeatures, installFoliage, installFoliageShadow } from './foliageMaterial';
import { shadowDepthMaterial } from './shadowCasters';

/**
 * A debug tree (?windtest=1, off by default): the synthetic tree of tools/wind-test-tree.mjs, which carries the hero
 * trees' branch data (`_WIND`, `_PIVOT`, baked crown light in vertex colour), drawn through the same foliage shaders as
 * the world's trees. For checking the branch-wise wind and the crown lighting before and beside real hero models.
 */
export const WIND_TEST_URL = `${import.meta.env.BASE_URL}debug/wind-test-tree.glb`;

export function windTestRequested(): boolean {
  return typeof location !== 'undefined' && new URLSearchParams(location.search).get('windtest') === '1';
}

/** Four leaf-cluster pictures (2 x 2 cells) drawn on a canvas: enough leaves to read as a clump, with soft alpha edges. */
function leafAtlas(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  let seed = 7;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const cell = size / 2;
  for (let c = 0; c < 4; c++) {
    const ox = (c % 2) * cell, oy = Math.floor(c / 2) * cell;
    for (let i = 0; i < 70; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * cell * 0.36;
      const x = ox + cell / 2 + Math.cos(a) * d, y = oy + cell / 2 + Math.sin(a) * d;
      const l = cell * (0.1 + rnd() * 0.06), ang = a + (rnd() - 0.5) * 1.2;
      const shade = 0.55 + rnd() * 0.45;
      g.save();
      g.translate(x, y); g.rotate(ang);
      g.fillStyle = `rgb(${Math.round(70 * shade)},${Math.round(125 * shade)},${Math.round(40 * shade)})`;
      g.beginPath(); g.ellipse(0, 0, l, l * 0.42, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export interface WindTestTree {
  readonly group: THREE.Group;
  dispose(): void;
}

export async function createWindTestTree(field: FoliageField, signal?: AbortSignal): Promise<WindTestTree | null> {
  const gltf = await createGltfLoader().loadAsync(WIND_TEST_URL);
  if (signal?.aborted) return null;
  const group = new THREE.Group();
  group.name = 'wind-test-tree';
  const atlas = leafAtlas();
  const owned: Array<THREE.Material | THREE.BufferGeometry | THREE.Texture> = [atlas];
  const response = { ...FOLIAGE_RESPONSE.broadleaf, height: 9 };
  gltf.scene.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const isLeaf = node.name === 'leaf';
    const material = (mesh.material as THREE.MeshStandardMaterial).clone();
    if (isLeaf) {
      material.map = atlas;
      material.color.set(0xffffff);
      material.alphaTest = 0.45;
      material.alphaToCoverage = true;
      material.side = THREE.DoubleSide;
    }
    mesh.material = material;
    const features = foliageGeometryFeatures(mesh.geometry);
    const crown = crownOf(mesh.geometry);
    const installed = installFoliage(material, { field, response, leaf: isLeaf, crown, ...features });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const depth = shadowDepthMaterial(material);
    installFoliageShadow(depth, { field, response, leaf: isLeaf, hierarchical: features.hierarchical }, installed);
    mesh.customDepthMaterial = depth;
    owned.push(material, depth, mesh.geometry);
  });
  group.add(gltf.scene);
  return { group, dispose: () => { for (const o of owned) o.dispose(); } };
}
