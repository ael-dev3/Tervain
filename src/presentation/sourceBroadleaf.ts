import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { deepwoodCover, forestClearingDistance } from '../world/forest';
import type { PhysicalWoodGeometry } from '../world/physicsGeometry';
import type { BuildContext, SceneModule } from './context';
import { PlantedCrownIndex } from './plantedCrowns';
import { assertNaturalModelBudget } from './naturalModelBudget';
import { groundedNaturalGeometryY } from './treeGrounding';
import { buildFallingLeaves } from './fallingLeaves';
import type { FloraTree } from './floraPopulation';
import type { TreeVariant } from './treeGen';
import { modelAssetUrl } from './assets/modelUrl';

export const BROADLEAF_FILE = 'ancient-guardian-broadleaf-under-20k.glb';
/** Owner-source height anchors uniform scale for the reviewed volume and tiny leaf fringe. */
export const SOURCE_BROADLEAF_HEIGHT = 1.9235869646072388;
let pending: Promise<GLTF> | null = null;
interface Part { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; matrix: THREE.Matrix4; canopySites?: unknown }
interface Parts { wood: Part; leaf: Part[] }

function sourceParts(template: GLTF): Parts {
  const parts: Part[] = [];
  template.scene.updateMatrixWorld(true);
  template.scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material) || !(mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) throw new Error('Guardian tree requires one PBR material per source part.');
    parts.push({ geometry: mesh.geometry, material: mesh.material as THREE.MeshStandardMaterial, matrix: mesh.matrixWorld.clone(), canopySites: mesh.userData.canopySites });
  });
  assertNaturalModelBudget('Ancient Guardian broadleaf', parts.map(part => part.geometry));
  const wood = parts.filter(part => part.material.alphaTest === 0), leaf = parts.filter(part => part.material.alphaTest > 0);
  if (wood.length !== 1 || leaf.length !== 2 || parts.length !== 3) throw new Error('Guardian tree requires one woody source volume, one crown volume and one small leaf fringe.');
  return { wood: wood[0]!, leaf };
}

export function broadleafUrl(base = import.meta.env.BASE_URL, page = document.baseURI): URL {
  return modelAssetUrl(`scenery/${BROADLEAF_FILE}`, base, page);
}

export function loadSourceBroadleaf(): Promise<GLTF> {
  if (pending) return pending;
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 60_000);
  pending = (async () => {
    const url = broadleafUrl(), response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Guardian tree could not load (HTTP ${response.status}).`);
    if (response.headers.get('content-type')?.includes('text/html')) throw new Error('Guardian tree URL returned a page instead of model data.');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 12) throw new Error('Guardian tree download is incomplete.');
    const header = new DataView(bytes);
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== bytes.byteLength) throw new Error('Guardian tree download is not a complete GLB 2 file.');
    const template = await new GLTFLoader().parseAsync(bytes, new URL('.', url).href);
    sourceParts(template);
    return template;
  })().catch(error => { pending = null; throw error; }).finally(() => clearTimeout(timeout));
  return pending;
}

export interface BroadleafPlacement { id: string; x: number; y: number; z: number; yaw: number; s: number; radius: number }
/** A few separate broadleaf accents; all existing pine identities and source shapes remain intact. */
const CANDIDATES = [
  { x: -228, z: 8, height: 10, yaw: 0.4 },
  { x: -214, z: 43, height: 9, yaw: 2.2 },
  { x: -196, z: -8, height: 11, yaw: 3.8 },
  { x: -170, z: 39, height: 10, yaw: 5.1 },
  { x: -147, z: 7, height: 9.5, yaw: 1.7 },
  { x: -119, z: 39, height: 10.5, yaw: 4.5 },
] as const;

function woodRadius(geometry: THREE.BufferGeometry, top: number): number {
  const p = geometry.getAttribute('position'), index = geometry.index;
  let radius = 0;
  const count = index?.count ?? p.count;
  const visit = (x: number, z: number) => { radius = Math.max(radius, Math.hypot(x, z)); };
  for (let i = 0; i < count; i += 3) {
    for (let j = 0; j < 3; j++) {
      const a = index ? index.getX(i + j) : i + j, b = index ? index.getX(i + (j + 1) % 3) : i + (j + 1) % 3;
      const ay = p.getY(a), by = p.getY(b);
      if (ay <= top) visit(p.getX(a), p.getZ(a));
      if ((ay < top && by > top) || (by < top && ay > top)) {
        const t = (top - ay) / (by - ay); visit(p.getX(a) + t * (p.getX(b) - p.getX(a)), p.getZ(a) + t * (p.getZ(b) - p.getZ(a)));
      }
    }
  }
  return radius;
}

export function sourceBroadleafPlacements(ctx: Pick<BuildContext, 'terrain' | 'colliders' | 'excl'>,
  wood: THREE.BufferGeometry, bounds: THREE.Box3): BroadleafPlacement[] {
  const accepted: BroadleafPlacement[] = [];
  const crown = Math.max(Math.hypot(bounds.min.x, bounds.min.z), Math.hypot(bounds.max.x, bounds.max.z));
  const offsets = [[0, 0], ...[2, 4].flatMap(r => Array.from({ length: 8 }, (_, i) => [r * Math.cos(i * Math.PI / 4), r * Math.sin(i * Math.PI / 4)]))];
  for (const [candidateIndex, candidate] of CANDIDATES.entries()) {
    const s = candidate.height / SOURCE_BROADLEAF_HEIGHT;
    for (const [dx, dz] of offsets) {
      const x = candidate.x + dx!, z = candidate.z + dz!;
      if (deepwoodCover(x, z) < 0.25 || ctx.terrain.heightAt(x, z) < 0.3 || ctx.terrain.slopeAt(x, z) > 0.35
        || ctx.excl.blocked(x, z, crown * s + 0.5) || forestClearingDistance(x, z) < crown * s + 0.5) continue;
      const placement: BroadleafPlacement = { id: `tree:source-guardian:${candidateIndex}`, x, z, y: 0, s, yaw: candidate.yaw, radius: 0 };
      placement.y = groundedNaturalGeometryY(ctx.terrain, placement, wood, 0.025, 0.06);
      const burial = ctx.terrain.heightAt(x, z) - placement.y;
      placement.radius = woodRadius(wood, (2.6 + burial) / s) * s + 0.03;
      if (ctx.colliders.blocked(x, z, placement.radius + 0.4)
        || accepted.some(tree => Math.hypot(tree.x - x, tree.z - z) < tree.radius + placement.radius + 0.4)) continue;
      accepted.push(placement); break;
    }
    if (accepted.length === 4) break;
  }
  return accepted;
}

/** Resident, static attached geometry. Only the existing detached-leaf simulation animates. */
export function buildSourceBroadleaf(ctx: BuildContext, template: GLTF): SceneModule & {
  placements: readonly BroadleafPlacement[]; physicalWood: readonly PhysicalWoodGeometry[];
} {
  const original = sourceParts(template), textures = new Map<THREE.Texture, THREE.Texture>();
  const own = (part: Part) => {
    const geometry = part.geometry.clone().applyMatrix4(part.matrix), material = part.material.clone();
    const fields = material as unknown as Record<string, unknown>;
    for (const [key, field] of Object.entries(fields)) if ((field as THREE.Texture | null)?.isTexture) {
      const source = field as THREE.Texture; let texture = textures.get(source);
      if (!texture) { texture = source.clone(); texture.anisotropy = 16; texture.needsUpdate = true; textures.set(source, texture); }
      fields[key] = texture;
    }
    material.metalness = 0; material.roughness = 0.92; material.emissive.set(0); material.envMapIntensity = 0.3;
    material.side = THREE.DoubleSide; material.transparent = false;
    material.alphaToCoverage = material.alphaTest > 0;
    material.shadowSide = THREE.DoubleSide;
    return { geometry, material };
  };
  const wood = own(original.wood), leaf = original.leaf.map(own), bounds = new THREE.Box3();
  for (const part of [wood, ...leaf]) { part.geometry.computeBoundingBox(); bounds.union(part.geometry.boundingBox!); }
  const minimum = bounds.min.y;
  for (const part of [wood, ...leaf]) { part.geometry.translate(0, -minimum, 0); part.geometry.computeBoundingBox(); part.geometry.computeBoundingSphere(); }
  bounds.translate(new THREE.Vector3(0, -minimum, 0));
  const triangles = assertNaturalModelBudget('Ancient Guardian broadleaf', [wood.geometry, ...leaf.map(part => part.geometry)]);
  const placements = sourceBroadleafPlacements(ctx, wood.geometry, bounds);
  const positions = wood.geometry.getAttribute('position'), sourceIndex = wood.geometry.index;
  const packed = new Float32Array(positions.count * 3), indices = new Uint32Array(sourceIndex?.count ?? positions.count);
  for (let i = 0; i < positions.count; i++) packed.set([positions.getX(i), positions.getY(i), positions.getZ(i)], i * 3);
  for (let i = 0; i < indices.length; i++) indices[i] = sourceIndex ? sourceIndex.getX(i) : i;
  const group = new THREE.Group(); group.name = 'source-guardian-broadleaves';
  const physicalWood: PhysicalWoodGeometry[] = [];
  for (const placement of placements) {
    const tree = new THREE.Group(); tree.name = placement.id;
    tree.position.set(placement.x, placement.y, placement.z); tree.rotation.y = placement.yaw; tree.scale.setScalar(placement.s);
    for (const [label, part] of [['wood', wood], ...leaf.map((part, i) => [`crown:${i}`, part] as const)] as const) {
      const mesh = new THREE.Mesh(part.geometry, part.material); mesh.name = `${placement.id}:${label}`;
      mesh.castShadow = ctx.quality !== 'low'; mesh.receiveShadow = true; tree.add(mesh);
    }
    tree.updateMatrixWorld(true); group.add(tree);
    if (ctx.plantedCrowns instanceof PlantedCrownIndex) {
      for (const part of leaf) ctx.plantedCrowns.add('oak', placement, part.geometry);
    }
    ctx.colliders.circle(placement.id, placement.x, placement.z, placement.radius);
    physicalWood.push({ id: placement.id, positions: packed, indices, translation: { x: placement.x, y: placement.y, z: placement.z }, yaw: placement.yaw, scale: placement.s });
  }
  // Release from actual crown surfaces, rather than assuming the volume's indexed
  // geometry has the four-vertex layout of the procedural trees' detached-leaf sampler.
  const release = new THREE.BufferGeometry();
  const sourceSites = original.leaf.flatMap(part => Array.isArray(part.canopySites) ? [{ part, sites: part.canopySites as number[][] }] : []);
  if (!sourceSites.length) throw new Error('Guardian tree has no source-painted leaf release sites.');
  const releasePositions: number[] = [];
  for (const { part, sites } of sourceSites) for (const site of sites) {
    if (site.length !== 3 || !site.every(Number.isFinite)) throw new Error('Guardian leaf release sites must be finite.');
    const point = new THREE.Vector3(site[0], site[1], site[2]).applyMatrix4(part.matrix); point.y -= minimum;
    for (let corner = 0; corner < 4; corner++) releasePositions.push(point.x, point.y, point.z);
  }
  release.setAttribute('position', new THREE.Float32BufferAttribute(releasePositions, 3));
  const variant: TreeVariant = { species: 'oak', height: SOURCE_BROADLEAF_HEIGHT, crownRadius: Math.hypot(bounds.max.x, bounds.max.z),
    trunkRadius: woodRadius(wood.geometry, 0.5), bark: 'oak', leafTexture: 'oak', crownTexture: 'crown',
    lods: [0, 1, 2].map(() => ({ wood: wood.geometry, leaf: release, tris: triangles })) as TreeVariant['lods'] };
  const shedTrees: FloraTree[] = placements.map(p => ({ ...p, sp: 'oak', v: 0, tint: 1, collisionId: p.id, decorationRank: 0 }));
  const shedding = buildFallingLeaves(ctx.terrain, ctx.quality, shedTrees, () => variant); group.add(shedding.group);
  let disposed = false;
  return { group, placements, physicalWood, update: (dt, frame) => shedding.update(dt, frame),
    stats: () => ({ sourceBroadleaves: placements.length, sourceBroadleafModelTris: triangles, sourceBroadleafTris: triangles * placements.length, ...shedding.stats?.() }),
    dispose() {
      if (disposed) return; disposed = true;
      shedding.dispose?.(); release.dispose(); for (const part of [wood, ...leaf]) { part.geometry.dispose(); part.material.dispose(); }
      textures.forEach(texture => texture.dispose()); textures.clear(); group.clear();
    },
  };
}
