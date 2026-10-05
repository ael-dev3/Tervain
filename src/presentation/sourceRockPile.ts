import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { coastX } from '../world/coast';
import type { PhysicalRockGeometry } from '../world/physicsGeometry';
import type { BuildContext, SceneModule } from './context';
import { assertNaturalModelBudget } from './naturalModelBudget';
import { groundedNaturalGeometryY } from './treeGrounding';

export const ROCK_PILE_FILE = 'weathered-rock-pile-under-20k.glb';
let pending: Promise<GLTF> | null = null;

export function rockPileUrl(base = import.meta.env.BASE_URL, page = document.baseURI): URL {
  return new URL(`${base}models/scenery/${ROCK_PILE_FILE}`, page);
}

function sourceMesh(template: GLTF): THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
  let result: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null = null;
  template.scene.updateMatrixWorld(true);
  template.scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (result || Array.isArray(mesh.material) || !(mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
      throw new Error('Rock pile requires one source mesh with a PBR material.');
    }
    assertNaturalModelBudget('Weathered Rock Pile', [mesh.geometry]);
    result = mesh as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  });
  if (!result) throw new Error('Rock pile contains no geometry.');
  return result;
}

/** Required art shares a CPU template; failure reaches the existing loading Retry. */
export function loadSourceRockPile(): Promise<GLTF> {
  if (pending) return pending;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  pending = (async () => {
    const url = rockPileUrl(), response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Rock pile could not load (HTTP ${response.status}).`);
    if (response.headers.get('content-type')?.includes('text/html')) throw new Error('Rock pile URL returned a page instead of model data.');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 12) throw new Error('Rock pile download is incomplete.');
    const header = new DataView(bytes);
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== bytes.byteLength) {
      throw new Error('Rock pile download is not a complete GLB 2 file.');
    }
    const template = await new GLTFLoader().parseAsync(bytes, new URL('.', url).href);
    sourceMesh(template);
    return template;
  })().catch(error => { pending = null; throw error; }).finally(() => clearTimeout(timeout));
  return pending;
}

/** Small authored coastal accents. Every preset uses the same accepted placements. */
const CANDIDATES = [
  { z: -123, shoreOffset: 11, s: 1.2, yaw: 0.35 },
  { z: -84, shoreOffset: 10, s: 1.0, yaw: 1.85 },
  { z: -45, shoreOffset: 8, s: 0.9, yaw: 3.1 },
  { z: -8, shoreOffset: 8, s: 1.15, yaw: 4.65 },
  { z: 75, shoreOffset: 13, s: 1.1, yaw: 5.45 },
  { z: 139, shoreOffset: 15, s: 1.4, yaw: 2.4 },
] as const;

export interface RockPilePlacement { id: string; x: number; y: number; z: number; s: number; yaw: number; radius: number }

export function sourceRockPilePlacements(ctx: Pick<BuildContext, 'terrain' | 'colliders' | 'excl'>,
  geometry: THREE.BufferGeometry): RockPilePlacement[] {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!, p = geometry.getAttribute('position');
  let radius = 0;
  for (let i = 0; i < p.count; i++) radius = Math.max(radius, Math.hypot(p.getX(i), p.getZ(i)));
  const basalPlane = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.12;
  const accepted: RockPilePlacement[] = [];
  for (const [index, candidate] of CANDIDATES.entries()) {
    const x = coastX(candidate.z) + candidate.shoreOffset, z = candidate.z;
    const pad = radius * candidate.s;
    // Never alter a route/interaction/tree merely to make this optional accent fit.
    if (ctx.excl.blocked(x, z, pad + 0.5) || ctx.colliders.blocked(x, z, pad + 0.4) || ctx.terrain.heightAt(x, z) < 0.1
      || ctx.terrain.slopeAt(x, z) > 0.5 || accepted.some(rock => Math.hypot(rock.x - x, rock.z - z) < rock.radius + pad + 0.4)) continue;
    const placement = { id: `source-rock-pile:${index}`, x, z, s: candidate.s, yaw: candidate.yaw, radius: pad, y: 0 };
    placement.y = groundedNaturalGeometryY(ctx.terrain, placement, geometry, basalPlane, 0.055);
    accepted.push(placement);
  }
  return accepted;
}

function physicalContact(geometry: THREE.BufferGeometry, placement: RockPilePlacement, matrix: THREE.Matrix4): PhysicalRockGeometry {
  const p = geometry.getAttribute('position'), point = new THREE.Vector3();
  const positions = new Float32Array(p.count * 3), index = geometry.index;
  const indices = new Uint32Array(index?.count ?? p.count);
  const bounds = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
  for (let i = 0; i < p.count; i++) {
    point.fromBufferAttribute(p, i).applyMatrix4(matrix);
    positions.set([point.x, point.y, point.z], i * 3);
    bounds.minX = Math.min(bounds.minX, positions[i * 3]!); bounds.maxX = Math.max(bounds.maxX, positions[i * 3]!);
    bounds.minY = Math.min(bounds.minY, positions[i * 3 + 1]!); bounds.maxY = Math.max(bounds.maxY, positions[i * 3 + 1]!);
    bounds.minZ = Math.min(bounds.minZ, positions[i * 3 + 2]!); bounds.maxZ = Math.max(bounds.maxZ, positions[i * 3 + 2]!);
  }
  for (let i = 0; i < indices.length; i++) indices[i] = index ? index.getX(i) : i;
  return { id: placement.id, positions, indices, bounds };
}

/** Original source forms stay rigid, uniformly scaled and resident; contacts use their exact rendered triangles. */
export function buildSourceRockPiles(ctx: BuildContext, template: GLTF): SceneModule & {
  placements: readonly RockPilePlacement[]; contacts: readonly PhysicalRockGeometry[];
} {
  const original = sourceMesh(template), geometry = original.geometry.clone().applyMatrix4(original.matrixWorld);
  geometry.computeBoundingBox();
  geometry.translate(0, -geometry.boundingBox!.min.y, 0);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const triangles = assertNaturalModelBudget('Weathered Rock Pile', [geometry]);
  const material = original.material.clone(), textures = new Map<THREE.Texture, THREE.Texture>();
  const fields = material as unknown as Record<string, unknown>;
  for (const [key, field] of Object.entries(fields)) if ((field as THREE.Texture | null)?.isTexture) {
    const texture = field as THREE.Texture;
    let clone = textures.get(texture);
    if (!clone) { clone = texture.clone(); clone.anisotropy = 16; clone.needsUpdate = true; textures.set(texture, clone); }
    fields[key] = clone;
  }
  material.name = 'Weathered source rock pile';
  material.metalness = 0; material.roughness = 1; material.envMapIntensity = 0.35;
  material.emissive.set(0); material.emissiveMap = null; material.normalScale.set(0.8, 0.8);
  const placements = sourceRockPilePlacements(ctx, geometry), contacts: PhysicalRockGeometry[] = [];
  const group = new THREE.Group(); group.name = 'source-rock-piles';
  for (const placement of placements) {
    const mesh = new THREE.Mesh(geometry, material); mesh.name = placement.id;
    mesh.position.set(placement.x, placement.y, placement.z); mesh.rotation.y = placement.yaw;
    mesh.scale.setScalar(placement.s); mesh.castShadow = true; mesh.receiveShadow = true; mesh.updateMatrixWorld(true);
    const contact = physicalContact(geometry, placement, mesh.matrixWorld);
    ctx.colliders.registerRockMesh(contact);
    ctx.colliders.circle(placement.id, placement.x, placement.z, placement.radius, true,
      { minY: contact.bounds.minY, maxY: contact.bounds.maxY, rockMesh: contact });
    contacts.push(contact); group.add(mesh);
  }
  // register replaces the terrain registry, so carry forward every existing exact scatter surface.
  ctx.terrain.registerRockSurfaces(ctx.colliders.rockMeshes);
  let disposed = false;
  return { group, placements, contacts, update() {},
    stats: () => ({ sourceRockPiles: placements.length, sourceRockModelTris: triangles, sourceRockTris: triangles * placements.length }),
    dispose() {
      if (disposed) return; disposed = true;
      geometry.dispose(); material.dispose(); textures.forEach(texture => texture.dispose()); textures.clear(); group.clear();
    },
  };
}
