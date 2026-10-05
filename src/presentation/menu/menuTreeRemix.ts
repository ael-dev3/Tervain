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

interface CustomSprig {
  vertexStart: number;
  vertexCount: number;
  stemRootVertexIndices: readonly number[];
}
interface CustomFoliage { sourceVertices: number; sprigs: readonly CustomSprig[] }
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

/** Minimal embedded attachment ranges; the full asset manifest is never a runtime dependency. */
function customFoliage(mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>): CustomFoliage | undefined {
  const data = mesh.userData.tervainCustomFoliage ?? mesh.geometry.userData.tervainCustomFoliage;
  if (data === undefined) return;
  const count = mesh.geometry.getAttribute('position').count;
  if (!data || data.schemaVersion !== 1 || !Number.isInteger(data.sourceVertices) || data.sourceVertices <= 0 ||
    data.sourceVertices >= count || !Array.isArray(data.sprigs) || !data.sprigs.length) {
    throw new Error('Supplied menu foliage has invalid custom attachment metadata.');
  }
  const occupied = new Uint8Array(count);
  for (const sprig of data.sprigs as CustomSprig[]) {
    if (!sprig || typeof sprig !== 'object') throw new Error('Supplied menu foliage has an invalid custom sprig range or stem root.');
    const end = sprig.vertexStart + sprig.vertexCount;
    if (!Number.isInteger(sprig.vertexStart) || !Number.isInteger(sprig.vertexCount) || sprig.vertexCount <= 0 ||
      sprig.vertexStart < data.sourceVertices || end > count || !Array.isArray(sprig.stemRootVertexIndices) ||
      sprig.stemRootVertexIndices.length < 3 || new Set(sprig.stemRootVertexIndices).size !== sprig.stemRootVertexIndices.length ||
      sprig.stemRootVertexIndices.some(index => !Number.isInteger(index) || index < sprig.vertexStart || index >= end)) {
      throw new Error('Supplied menu foliage has an invalid custom sprig range or stem root.');
    }
    for (let i = sprig.vertexStart; i < end; i++) {
      if (occupied[i]) throw new Error('Supplied menu foliage custom sprig ranges overlap.');
      occupied[i] = 1;
    }
  }
  for (let i = data.sourceVertices; i < count; i++) if (!occupied[i]) {
    throw new Error('Supplied menu foliage custom vertices lack an attachment range.');
  }
  return data as CustomFoliage;
}

/** Exact closest-point queries on retained carved wood; boxes only reject distant triangles. */
function nearestWoodSurface(wood: THREE.BufferGeometry): (point: THREE.Vector3, target: THREE.Vector3) => void {
  const positions = wood.getAttribute('position'), indices = wood.index;
  const count = indices?.count ?? positions.count;
  const triangles: THREE.Triangle[] = [], bounds: THREE.Box3[] = [];
  for (let i = 0; i < count; i += 3) {
    const point = (offset: number) => new THREE.Vector3().fromBufferAttribute(positions, indices?.getX(i + offset) ?? i + offset);
    const triangle = new THREE.Triangle(point(0), point(1), point(2));
    if (triangle.getArea() <= 1e-12) continue;
    triangles.push(triangle); bounds.push(new THREE.Box3().setFromPoints([triangle.a, triangle.b, triangle.c]));
  }
  if (!triangles.length) throw new Error('Supplied menu sprigs need finite retained wood triangles.');
  const candidate = new THREE.Vector3(), boxPoint = new THREE.Vector3();
  return (point, target) => {
    let distance = Infinity;
    for (let i = 0; i < triangles.length; i++) {
      bounds[i]!.clampPoint(point, boxPoint);
      if (boxPoint.distanceToSquared(point) > distance) continue;
      triangles[i]!.closestPointToPoint(point, candidate);
      const next = candidate.distanceToSquared(point);
      if (Number.isFinite(next) && next < distance) { distance = next; target.copy(candidate); }
    }
    if (!Number.isFinite(distance)) throw new Error('Supplied menu sprig cannot meet retained wood.');
  };
}

/** Move each owned sprig as one rigid piece; the ordinary source crown stays uniformly fitted. */
function bindCustomSprigs(
  geometry: THREE.BufferGeometry, custom: CustomFoliage | undefined,
  nearest: ReturnType<typeof nearestWoodSurface> | undefined,
): void {
  const positions = geometry.getAttribute('position'), weights = new Float32Array(positions.count).fill(1);
  const root = new THREE.Vector3(), anchor = new THREE.Vector3(), delta = new THREE.Vector3(), point = new THREE.Vector3();
  for (const sprig of custom?.sprigs ?? []) {
    root.set(0, 0, 0);
    for (const index of sprig.stemRootVertexIndices) root.add(point.fromBufferAttribute(positions, index));
    root.divideScalar(sprig.stemRootVertexIndices.length);
    nearest!(root, anchor); delta.subVectors(anchor, root);
    let reach = 0;
    const end = sprig.vertexStart + sprig.vertexCount;
    for (let i = sprig.vertexStart; i < end; i++) {
      point.fromBufferAttribute(positions, i); reach = Math.max(reach, point.distanceTo(root));
      point.add(delta); positions.setXYZ(i, point.x, point.y, point.z);
    }
    for (let i = sprig.vertexStart; i < end; i++) {
      point.fromBufferAttribute(positions, i);
      weights[i] = Math.min(1, point.distanceTo(anchor) / Math.max(reach, 1e-6));
    }
    for (const index of sprig.stemRootVertexIndices) weights[index] = 0;
  }
  positions.needsUpdate = true;
  geometry.setAttribute('menuCrownWindWeight', new THREE.Float32BufferAttribute(weights, 1));
}

/**
 * Actual source-painted foliage over the functional carved hermitage. One uniform
 * crown fit preserves source proportions/UVs; the original bole/root/branch curves
 * retain the door and music-driven collision authority. The same selected source
 * LOD and sampled perches are used on every preset, so a rebuild cannot alter the dance.
 * Added custom sprigs have different source wood: after the uniform fit each is
 * rigidly translated onto an actual retained architectural wood triangle. Their
 * stem roots receive zero wind displacement, without deforming the sprig or source.
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

  const attachments = selected.map(customFoliage);
  const nearest = attachments.some(Boolean) ? nearestWoodSurface(architecture.wood) : undefined;

  const textures = new Map<THREE.Texture, THREE.Texture>();
  const parts: CrownPart[] = [];
  const sourceBounds = new THREE.Box3();
  for (const [partIndex, mesh] of selected.entries()) {
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    // The original painted crown determines the fit. New attached sprigs cannot
    // change its scale or centre merely by adding a tip outside that envelope.
    const custom = attachments[partIndex], position = geometry.getAttribute('position'), point = new THREE.Vector3();
    for (let i = 0; i < (custom?.sourceVertices ?? position.count); i++) sourceBounds.expandByPoint(point.fromBufferAttribute(position, i));
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
      shader.vertexShader = `uniform float uMenuCrownTime;\nuniform float uMenuCrownWind;\nattribute float menuCrownWindWeight;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        transformed.x += sin(position.y * 0.63 + position.z * 0.24 + uMenuCrownTime * 0.55) * uMenuCrownWind * menuCrownWindWeight * 0.055;
        transformed.z += sin(position.y * 0.48 + position.x * 0.21 + uMenuCrownTime * 0.43) * uMenuCrownWind * menuCrownWindWeight * 0.035;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
        THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
      lights.patch(shader);
    };
    material.customProgramCacheKey = () => `tervain-menu-supplied-crown-v2-anchored-sprigs-${lights.key}`;
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
  for (const [partIndex, part] of parts.entries()) {
    part.geometry.applyMatrix4(fit);
    bindCustomSprigs(part.geometry, attachments[partIndex], nearest);
    part.geometry.computeBoundingBox(); part.geometry.computeBoundingSphere();
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
