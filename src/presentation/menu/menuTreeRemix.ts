import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AncientTree } from './menuTree';
import type { SwayUniforms } from '../vegetation';
import type { WispLighting } from './menuWispLight';
import { sampleLeafSurfaceSites } from '../leafSurfaceSites';

/** Owner-supplied leafy silhouette selected for the score-led hermitage. */
export const MENU_TREE_SOURCE = 'tree-0208';
/** Hollow, hinged door and its hardware are counted again from the final constructed scene. */
const ARCHITECTURE_RESERVE = 2500;
const TRIANGLE_LIMIT = 20_000;

interface CrownPart { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }
export interface MenuTreeRemix {
  readonly parts: readonly CrownPart[];
  readonly crown: AncientTree['crown'];
  readonly leafSites: AncientTree['leafSites'];
  readonly triangles: number;
  readonly sourceLod: number;
  dispose(): void;
}

function sourceFoliage(template: GLTF): THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] {
  const parts: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
  template.scene.updateMatrixWorld(true);
  template.scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.name.toLowerCase().includes('foliage')) return;
    if (Array.isArray(mesh.material) || !(mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
      throw new Error('Supplied menu tree foliage requires one source PBR material per part.');
    }
    parts.push(mesh as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>);
  });
  return parts;
}

/**
 * Actual source-painted foliage over the functional carved hermitage. One uniform
 * crown fit preserves source proportions/UVs; the original bole/root/branch curves
 * retain the door and music-driven collision authority. The same selected source
 * LOD and sampled perches are used on every preset, so a rebuild cannot alter the dance.
 */
export function createMenuTreeRemix(
  source: readonly [GLTF, GLTF, GLTF], architecture: AncientTree, sway: SwayUniforms, lights: WispLighting,
): MenuTreeRemix {
  const available = TRIANGLE_LIMIT - 1 - architecture.stats.woodTris - ARCHITECTURE_RESERVE;
  let selected: ReturnType<typeof sourceFoliage> | undefined, sourceLod = -1, triangles = 0;
  for (const lod of [0, 1, 2]) {
    const foliage = sourceFoliage(source[lod]!);
    const count = foliage.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0);
    if (count > 0 && count <= available) { selected = foliage; sourceLod = lod; triangles = count; break; }
  }
  if (!selected) throw new Error(`Supplied menu crown cannot fit the complete under-20k tree budget (${available} foliage triangles available).`);

  const textures = new Map<THREE.Texture, THREE.Texture>();
  const parts: CrownPart[] = [];
  const sourceBounds = new THREE.Box3();
  for (const mesh of selected) {
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    geometry.computeBoundingBox(); sourceBounds.union(geometry.boundingBox!);
    const material = mesh.material.clone();
    const fields = material as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(fields)) if ((value as THREE.Texture | null)?.isTexture) {
      const original = value as THREE.Texture;
      let owned = textures.get(original);
      if (!owned) { owned = original.clone(); owned.anisotropy = 16; owned.needsUpdate = true; textures.set(original, owned); }
      fields[key] = owned;
    }
    material.metalness = 0; material.roughness = Math.max(0.88, material.roughness);
    material.emissive.set(0); material.envMapIntensity = 0.3;
    material.side = THREE.DoubleSide; material.shadowSide = THREE.DoubleSide;
    material.transparent = false; material.alphaToCoverage = material.alphaTest > 0;
    material.onBeforeCompile = shader => {
      shader.uniforms.uMenuCrownTime = sway.uTime; shader.uniforms.uMenuCrownWind = sway.uWind;
      shader.vertexShader = `uniform float uMenuCrownTime;\nuniform float uMenuCrownWind;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        transformed.x += sin(position.y * 0.63 + position.z * 0.24 + uMenuCrownTime * 0.55) * uMenuCrownWind * 0.055;
        transformed.z += sin(position.y * 0.48 + position.x * 0.21 + uMenuCrownTime * 0.43) * uMenuCrownWind * 0.035;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
        THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
      lights.patch(shader);
    };
    material.customProgramCacheKey = () => `tervain-menu-supplied-crown-v1-${lights.key}`;
    parts.push({ geometry, material });
  }
  const sourceSize = sourceBounds.getSize(new THREE.Vector3()), sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
  if (![sourceSize.x, sourceSize.y, sourceSize.z].every(value => Number.isFinite(value) && value > 0.01)) {
    for (const part of parts) { part.geometry.dispose(); part.material.dispose(); }
    for (const texture of textures.values()) texture.dispose();
    throw new Error('Supplied menu crown has no finite volumetric bounds.');
  }
  const branches = new THREE.Box3();
  for (const site of architecture.leafSites) branches.expandByPoint(new THREE.Vector3(...site));
  const target = branches.getCenter(new THREE.Vector3());
  const branchSize = branches.getSize(new THREE.Vector3());
  // Fit the horizontal source envelope to the retained limb tips using a single scale.
  // The source's relative height/depth and all source normals/UVs remain coherent.
  const horizontalFit = Math.max(branchSize.x, branchSize.z) * 1.04 / Math.max(sourceSize.x, sourceSize.z);
  const verticalFit = Math.max(6, branchSize.y + 1.6) / sourceSize.y;
  const scale = Math.min(horizontalFit, verticalFit);
  const fit = new THREE.Matrix4().makeTranslation(target.x, target.y, target.z)
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(new THREE.Matrix4().makeTranslation(-sourceCenter.x, -sourceCenter.y, -sourceCenter.z));
  const crown = { x: target.x, z: target.z, radius: 0, bottom: Infinity, top: -Infinity };
  const leafSites: AncientTree['leafSites'] = [];
  for (const part of parts) {
    part.geometry.applyMatrix4(fit); part.geometry.computeBoundingBox(); part.geometry.computeBoundingSphere();
    const p = part.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      crown.radius = Math.max(crown.radius, Math.hypot(p.getX(i) - crown.x, p.getZ(i) - crown.z));
      crown.bottom = Math.min(crown.bottom, p.getY(i)); crown.top = Math.max(crown.top, p.getY(i));
    }
    // The prepared cards contain transparent space: perches must also pass their
    // decoded alpha at the actual UV, while opaque source volumes need no readback.
    for (const site of sampleLeafSurfaceSites(part.geometry, part.material, { limit: 120 })) {
      leafSites.push([site.x, site.y, site.z]);
    }
  }
  // Cover gentle menu-only wind in the crow avoidance envelope.
  crown.radius += 0.1; crown.bottom -= 0.1; crown.top += 0.1;
  let disposed = false;
  return { parts, crown, leafSites, triangles, sourceLod,
    dispose() {
      if (disposed) return; disposed = true;
      for (const part of parts) { part.geometry.dispose(); part.material.dispose(); }
      for (const texture of textures.values()) texture.dispose();
    },
  };
}

/** Includes retained carved wood/cell and moving door, independent of renderer visibility. */
export function assertMenuTreeBudget(treeRoot: THREE.Object3D, door?: THREE.Object3D, staticDoorTriangles = 0): number {
  let triangles = staticDoorTriangles;
  for (const root of [treeRoot, door]) root?.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) triangles += (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
  });
  if (!Number.isInteger(triangles) || triangles >= TRIANGLE_LIMIT) throw new Error(`Complete menu tree has ${triangles} triangles; it must be strictly below ${TRIANGLE_LIMIT}.`);
  return triangles;
}
