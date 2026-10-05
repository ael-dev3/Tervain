import * as THREE from 'three';
import type { Terrain } from '../world/terrain';
import { biomeAt } from '../world/biomes';
import { mulberry32, smoothstep } from '../world/noise';
import type { Quality, SceneModule } from './context';
import type { FloraTree } from './floraPopulation';
import type { TreeVariant } from './treeGen';
import { smoothDistanceFade } from './distanceVisibility';

/** Cosmetic shedding, separate from the paused rooted tree/leaf sway. All source geometry stays untouched. */
export const FALLING_LEAF_LIMIT: Readonly<Record<Quality, number>> = { high: 256, medium: 160, low: 80 };
export const FALLING_LEAF_DISTANCE = [30, 55] as const;

interface Site { x: number; y: number; z: number }
interface Stream {
  origin: Site; phase: number; speed: number; drift: number; flutter: number; yaw: number; size: number;
  contactTime: number; contact: Site; cycle: number; tint: number; terrainCeiling: number;
}

function seedFor(tree: Readonly<FloraTree>, slot: number): number {
  const key = `${tree.collisionId ?? `${tree.sp}:${tree.x}:${tree.z}`}:${tree.v}:${slot}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** Imported sites are alpha-visible source faces; procedural authoring fans use their four-vertex centres. */
function outerCanopySites(variant: TreeVariant): Site[] {
  const geometry = variant.lods[0].leaf;
  const position = geometry?.getAttribute('position');
  if (!position) return [];
  const sites: Site[] = [];
  let cx = 0, cz = 0;
  if (variant.assetId) {
    // The per-variant cache was sampled through the decoded source's UV alpha,
    // so leaves cannot spawn from empty portions of a curved foliage card.
    for (const { x, y, z } of variant.leafSurfaceSites ?? []) {
      if (![x, y, z].every(Number.isFinite)) continue;
      sites.push({ x, y, z }); cx += x; cz += z;
    }
  } else {
    for (let i = 0; i + 3 < position.count; i += 4) {
      let x = 0, y = 0, z = 0;
      for (let j = 0; j < 4; j++) { x += position.getX(i + j); y += position.getY(i + j); z += position.getZ(i + j); }
      x *= 0.25; y *= 0.25; z *= 0.25;
      if (![x, y, z].every(Number.isFinite)) continue;
      sites.push({ x, y, z }); cx += x; cz += z;
    }
  }
  if (!sites.length) return sites;
  cx /= sites.length; cz /= sites.length;
  const radii = sites.map(p => Math.hypot(p.x - cx, p.z - cz));
  const edge = Math.max(...radii) * 0.58;
  return sites.filter((_, i) => radii[i]! >= edge);
}

function worldCanopySite(tree: Readonly<FloraTree>, site: Site): Site {
  const cos = Math.cos(tree.yaw), sin = Math.sin(tree.yaw);
  return { x: tree.x + tree.s * (cos * site.x + sin * site.z), y: tree.y + tree.s * site.y,
    z: tree.z + tree.s * (-sin * site.x + cos * site.z) };
}

/** World-space release sites for inspection: grounded root, yaw and uniform scale, independent of render LOD. */
export function fallingLeafCanopySites(tree: Readonly<FloraTree>, variant: TreeVariant): readonly Site[] {
  return outerCanopySites(variant).map(site => worldCanopySite(tree, site));
}

/** A small folded, pointed leaf with a raised central vein. No rectangular backing or particle sprite. */
function leafGeometry(): THREE.BufferGeometry {
  const rim = [
    [0, -0.5, 0], [-0.18, -0.35, 0], [-0.32, -0.12, -0.035], [-0.29, 0.13, 0],
    [-0.16, 0.34, -0.018], [0, 0.5, 0], [0.16, 0.34, -0.018], [0.29, 0.13, 0],
    [0.32, -0.12, -0.035], [0.18, -0.35, 0],
  ];
  const positions = [0, 0, 0.065, ...rim.flat()];
  const colors = [0.9, 0.98, 0.55];
  for (let i = 0; i < rim.length; i++) colors.push(0.68 + (i % 3) * 0.035, 0.79 + (i % 3) * 0.025, 0.34);
  const indices: number[] = [];
  for (let i = 0; i < rim.length; i++) indices.push(0, i + 1, (i + 1) % rim.length + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function airbornePosition(stream: Stream, age: number, out: Site): void {
  const t = Math.min(age, stream.contactTime);
  // Bounded breeze drift and slow alternating sideslip start exactly on the selected canopy card.
  const breeze = t / (20 + t) * 1.15;
  out.x = stream.origin.x + Math.cos(stream.drift) * breeze + 0.31 * (Math.sin(t * 0.63 + stream.flutter) - Math.sin(stream.flutter));
  out.z = stream.origin.z + Math.sin(stream.drift) * breeze + 0.26 * (Math.sin(t * 0.49 + stream.flutter * 1.3) - Math.sin(stream.flutter * 1.3));
  out.y = stream.origin.y - stream.speed * t;
}

/** Cover the entire tiny folded mesh on hills, including its maximum rotated vertical/horizontal radius. */
function groundClearance(terrain: Pick<Terrain, 'heightAt'>, p: Site, radius: number): number {
  let ground = terrain.heightAt(p.x, p.z);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    ground = Math.max(ground, terrain.heightAt(p.x + Math.cos(angle) * radius, p.z + Math.sin(angle) * radius));
  }
  return ground + radius + 0.015;
}

/** Fixed-size one-mesh leaf streams tied to actual, selected broadleaf trees; never to the moving camera. */
export function buildFallingLeaves(
  terrain: Pick<Terrain, 'heightAt'>,
  quality: Quality,
  trees: readonly FloraTree[],
  variantFor: (tree: Readonly<FloraTree>) => TreeVariant,
): SceneModule {
  const group = new THREE.Group(); group.name = 'falling-leaves';
  const geometry = leafGeometry();
  const radius = geometry.boundingSphere!.radius;
  const streams: Stream[] = [];
  const sitesByVariant = new Map<TreeVariant, Site[]>();
  const candidates = trees.filter(t => (t.sp === 'oak' || t.sp === 'birch' || t.sp === 'orchard')
    && biomeAt(t.x, t.z).woodland > 0.15 && Number.isFinite(t.s) && t.s > 0 && Number.isFinite(t.y));
  // A stable spatial seed keeps the same sources when render presets retain a smaller cosmetic budget.
  candidates.sort((a, b) => seedFor(a, 0) - seedFor(b, 0));
  const perTree = quality === 'high' ? 2 : 1;
  const temporary: Site = { x: 0, y: 0, z: 0 };
  for (const tree of candidates) {
    const variant = variantFor(tree);
    if (variant.height * tree.s < 2) continue;
    let sites = sitesByVariant.get(variant);
    if (!sites) { sites = outerCanopySites(variant); sitesByVariant.set(variant, sites); }
    if (!sites.length) continue;
    for (let slot = 0; slot < perTree && streams.length < FALLING_LEAF_LIMIT[quality]; slot++) {
      const rng = mulberry32(seedFor(tree, slot));
      const site = sites[Math.floor(rng() * sites.length)]!;
      const origin = worldCanopySite(tree, site);
      const stream: Stream = { origin, phase: rng(), speed: 0.24 + rng() * 0.18, drift: -0.7 + rng() * 1.4,
        flutter: rng() * Math.PI * 2, yaw: rng() * Math.PI * 2, size: 0.16 + rng() * 0.08,
        contactTime: Infinity, contact: { x: 0, y: 0, z: 0 }, cycle: 0, tint: rng(), terrainCeiling: -Infinity };
      const leafRadius = radius * stream.size;
      const startFloor = groundClearance(terrain, origin, leafRadius);
      if (!Number.isFinite(startFloor) || origin.y < startFloor + 1) continue;
      // Find the first landing once. Analytical flight + a fixed contact pose is frame-rate independent,
      // never follows rising terrain after landing, and disappears before its hidden return to the canopy.
      const limit = Math.max(1, (origin.y - terrain.heightAt(origin.x, origin.z) + 4) / stream.speed);
      let previous = 0;
      for (let sample = 1; sample <= 48; sample++) {
        const age = limit * sample / 48;
        airbornePosition(stream, age, temporary);
        const floor = groundClearance(terrain, temporary, leafRadius);
        stream.terrainCeiling = Math.max(stream.terrainCeiling, floor);
        if (temporary.y <= floor) {
          let lo = previous, hi = age;
          for (let refine = 0; refine < 20; refine++) {
            const mid = (lo + hi) * 0.5;
            airbornePosition(stream, mid, temporary);
            const refinedFloor = groundClearance(terrain, temporary, leafRadius);
            stream.terrainCeiling = Math.max(stream.terrainCeiling, refinedFloor);
            if (temporary.y > refinedFloor) lo = mid; else hi = mid;
          }
          stream.contactTime = hi;
          airbornePosition(stream, hi, stream.contact);
          stream.contact.y = groundClearance(terrain, stream.contact, leafRadius);
          break;
        }
        previous = age;
      }
      if (!Number.isFinite(stream.contactTime)) continue;
      stream.cycle = stream.contactTime + 3.2;
      stream.phase *= stream.cycle;
      streams.push(stream);
    }
    if (streams.length >= FALLING_LEAF_LIMIT[quality]) break;
  }
  sitesByVariant.clear();
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(streams.length), 1).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aLeafOpacity', alpha);
  const material = new THREE.MeshLambertMaterial({ color: 0xe8da97, vertexColors: true, side: THREE.DoubleSide,
    transparent: true, depthWrite: false, opacity: 0.88 });
  material.forceSinglePass = true;
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aLeafOpacity;\nvarying float vLeafOpacity;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLeafOpacity = aLeafOpacity;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLeafOpacity;')
      .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\ndiffuseColor.a *= vLeafOpacity;\nif (diffuseColor.a <= 0.001) discard;');
  };
  material.customProgramCacheKey = () => 'tervain-falling-leaf-v1';
  const mesh = new THREE.InstancedMesh(geometry, material, streams.length);
  mesh.name = 'detached-leaves'; mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = false; mesh.receiveShadow = true;
  group.add(mesh);
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), euler = new THREE.Euler();
  const scale = new THREE.Vector3(), position = new THREE.Vector3(), colour = new THREE.Color();
  const leafVertex = new THREE.Vector3(), leafPositions = geometry.getAttribute('position');
  for (let i = 0; i < streams.length; i++) {
    const tint = streams[i]!.tint;
    mesh.setColorAt(i, colour.setRGB(0.82 + tint * 0.16, 0.86 + tint * 0.1, 0.58 + tint * 0.12));
  }
  let clock = 0, visible = 0, disposed = false;
  return {
    group,
    update(dt, frame) {
      if (disposed) return;
      if (!frame.reducedMotion && Number.isFinite(dt) && dt > 0 && Number.isFinite(clock + dt)) clock += dt;
      visible = 0;
      for (let i = 0; i < streams.length; i++) {
        const stream = streams[i]!, age = (clock + stream.phase) % stream.cycle;
        airbornePosition(stream, age, temporary);
        if (age >= stream.contactTime) { temporary.x = stream.contact.x; temporary.y = stream.contact.y; temporary.z = stream.contact.z; }
        const distance = Math.hypot(temporary.x - frame.camera.position.x, temporary.z - frame.camera.position.z);
        const coverage = smoothDistanceFade(distance, ...FALLING_LEAF_DISTANCE)
          * smoothstep(0, 1.2, age) * (1 - smoothstep(stream.contactTime - 0.65, stream.contactTime + 1.5, age));
        alpha.setX(i, coverage);
        if (coverage > 0.001) {
          visible++;
        }
        const landed = smoothstep(stream.contactTime - 0.25, stream.contactTime + 0.6, age);
        euler.set((0.5 + Math.sin(age * 1.1 + stream.flutter) * 0.38) * (1 - landed) + Math.PI / 2 * landed,
          stream.yaw + age * 0.29, Math.sin(age * 0.8 + stream.flutter) * 0.5 * (1 - landed));
        rotation.setFromEuler(euler);
        if (age >= stream.contactTime) {
          // Lower from the contact pose continuously, rather than stepping down when flight ends.
          temporary.y -= smoothstep(stream.contactTime, stream.contactTime + 0.6, age) * radius * stream.size * 0.85;
          if (coverage > 0.001) {
            // As it folds down, use its actual transformed vertices so it settles close to the soil rather than levitating.
            let floor = -Infinity;
            for (let v = 0; v < leafPositions.count; v++) {
              leafVertex.fromBufferAttribute(leafPositions, v).multiplyScalar(stream.size).applyQuaternion(rotation);
              floor = Math.max(floor, terrain.heightAt(temporary.x + leafVertex.x, temporary.z + leafVertex.z) - leafVertex.y + 0.012);
            }
            temporary.y = Math.max(temporary.y, floor);
          }
        } else if (coverage > 0.001 && temporary.y <= stream.terrainCeiling + 0.05) {
          // The cached path ceiling avoids terrain noise evaluation high in the air. Near landing,
          // validate the whole tiny rotated leaf between the contact search's samples.
          temporary.y = Math.max(temporary.y, groundClearance(terrain, temporary, radius * stream.size));
        }
        position.set(temporary.x, temporary.y, temporary.z);
        scale.setScalar(stream.size); matrix.compose(position, rotation, scale);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true; alpha.needsUpdate = true;
    },
    stats: () => ({ fallingLeaves: streams.length, fallingLeavesVisible: visible, fallingLeafTris: streams.length * 10 }),
    dispose() {
      if (disposed) return;
      disposed = true;
      mesh.dispose(); geometry.dispose(); material.dispose(); group.clear();
    },
  };
}
