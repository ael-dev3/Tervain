import * as THREE from 'three';
import { coastX } from '../world/coast';
import { mulberry32 } from '../world/noise';
import { clearanceAt } from '../world/terrain';
import { Ctx } from './buildKit';
import type { BuildContext, SceneModule } from './context';
import { makeTexPair } from './buildingTextures';
import { Region, type MatKey } from './regions';
import { rockShapes } from './rockGeometry';
import { attachGroundedRockSurface } from './rockSurface';
export { rockShapes } from './rockGeometry';
import { streamDistance } from './groundSplat';
import { createScatterPopulation, createShoreDetailPopulation, registerScatterColliders, selectScatterPopulation, type ShoreDetail } from './scatterPopulation';
import { buildForestLeafTexture } from './forestFloor';

/**
 * Stones and the things the sea leaves: boulders and scree, pebbles at the tide line, driftwood, wrack (weed), reeds by the
 * water, and the sea stacks off Lantern Point. Everything is merged into 96 m chunks that cull on their own, and every rock is its
 * own shape: an icosphere pushed out by ridged noise and then cut by a few planes, so faces are flat and edges are sharp.
 */

type RGB = [number, number, number];

export interface ShoreWoodSegment { a: [number, number, number]; b: [number, number, number]; radius: number; endRadius: number }

/** A short storm-broken limb stays beneath ordinary step height. Its connected forks begin on
 * real trunk nodes, and every exposed end follows the beach rather than floating above one sample. */
export function createShoreWoodSegments(detail: ShoreDetail, heightAt: (x: number, z: number) => number): ShoreWoodSegment[] {
  const rnd = mulberry32(detail.seed), segments: ShoreWoodSegment[] = [];
  const dx = Math.cos(detail.yaw), dz = Math.sin(detail.yaw), len = detail.scale;
  const radius = 0.045 + rnd() * 0.045;
  const nodes: [number, number, number][] = [];
  for (let node = 0; node <= 3; node++) {
    const t = node / 3, side = node === 0 || node === 3 ? 0 : (rnd() - 0.5) * len * 0.1;
    const x = detail.x + dx * len * (t - 0.5) - dz * side;
    const z = detail.z + dz * len * (t - 0.5) + dx * side;
    nodes.push([x, heightAt(x, z) + radius * (0.55 - t * 0.18), z]);
  }
  for (let node = 0; node < 3; node++) segments.push({ a: nodes[node]!, b: nodes[node + 1]!, radius: radius * (1 - node * 0.14), endRadius: radius * (0.86 - node * 0.14) });
  for (let fork = 0; fork < 2; fork++) {
    if (rnd() > 0.7) continue;
    const a = nodes[1 + fork]!, az = detail.yaw + (fork ? -1.2 : 1.25) + (rnd() - 0.5) * 0.4;
    const branchLength = len * (0.22 + rnd() * 0.14), x = a[0] + Math.cos(az) * branchLength, z = a[2] + Math.sin(az) * branchLength;
    segments.push({ a, b: [x, heightAt(x, z) + radius * 0.2, z], radius: radius * 0.45, endRadius: radius * 0.16 });
  }
  return segments;
}

export function buildScatter(ctx: BuildContext): SceneModule & { counts: { rocks: number; pieces: number; driftwood: number; shoreScrub: number } } {
  const { terrain, colliders, quality } = ctx;
  const group = new THREE.Group();
  group.name = 'scatter';
  // Debris has its own random stream; visual density never affects rock obstacle authoring.
  const rng = mulberry32(8081);
  const regions = new Map<string, Region>();
  const region = (x: number, z: number) => {
    const key = `${Math.floor(x / 96)}:${Math.floor(z / 96)}`;
    let r = regions.get(key);
    if (!r) {
      r = new Region(`scatter:${key}`, new Ctx());
      regions.set(key, r);
    }
    return r;
  };
  const density = quality === 'low' ? 0.55 : quality === 'medium' ? 0.8 : 1;
  const shapes = rockShapes();
  const trunks = colliders.all.filter((c) => c.kind === 'circle' && c.id.startsWith('tree:')).map((c) => ({ x: c.x, z: c.z, radius: c.kind === 'circle' ? c.r : 0 }));
  const population = createScatterPopulation(terrain, ctx.excl, trunks);
  registerScatterColliders(population, colliders);
  terrain.registerRockSurfaces(population.flatMap(rock => rock.contact ? [rock.contact] : []));
  const plan = selectScatterPopulation(population, quality);
  const rocks = plan.rocks.length;
  for (const rock of plan.rocks) {
    const { x, y, z, size } = rock;
    const R = region(x, z);
    const list = size > 0.55 ? shapes.big : shapes.small;
    const g = list[rock.shape]!;
    const B = R.get('rock' as MatKey);
    R.ctx.push(x, y, z, rock.yaw, rock.rx, rock.rz);
    R.ctx.matrix.scale(new THREE.Vector3(size, size * rock.squash, size * rock.zScale));
    B.addGeometry(g, null, rock.tint, 0.06, size);
    R.ctx.pop();
  }

  /* ---- Driftwood, wrack and reeds ---- */
  const drift = (detail: ShoreDetail) => {
    const R = region(detail.x, detail.z), woodRandom = mulberry32(detail.seed ^ 8191);
    const tint: RGB = [0.25 + woodRandom() * 0.08, 0.225 + woodRandom() * 0.06, 0.18 + woodRandom() * 0.045];
    for (const segment of createShoreWoodSegments(detail, (x, z) => terrain.heightAt(x, z))) {
      R.get('bark').rod(...segment.a, ...segment.b, segment.radius, 6, tint, { rEnd: segment.endRadius, jit: 0.14 });
    }
  };
  // Wind-shaped, knee-high shore scrub stays on the dry shelf. Its static woody fans all start
  // in the terrain, with individually attached painted leaves; the open central sand stays empty.
  const scrub = (detail: ShoreDetail) => {
    const R = region(detail.x, detail.z), sr = mulberry32(detail.seed), leaves = R.get('cloth');
    leaves.uvScale = 1; // Leaf charts occupy 0..1; the cloth key only reserves a separate local material batch.
    const y = terrain.heightAt(detail.x, detail.z) - 0.025;
    const leaf = (root: THREE.Vector3, direction: THREE.Vector3, length: number, tint: RGB) => {
      const side = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
      const mid = root.clone().addScaledVector(direction, length * 0.52); mid.y += length * 0.1;
      const tip = root.clone().addScaledVector(direction, length); tip.y -= length * 0.08;
      const left = mid.clone().addScaledVector(side, -length * 0.4), right = mid.clone().addScaledVector(side, length * 0.4);
      const normal = new THREE.Vector3().crossVectors(left.clone().sub(root), tip.clone().sub(root)).normalize();
      if (normal.y < 0) normal.negate();
      const vert = (p: THREE.Vector3, u: number, v: number) => leaves.vert(p.x, p.y, p.z, normal.x, normal.y, normal.z, u, v, tint, 1, 0.035);
      const a = vert(root, 0.5, 0), b = vert(left, 0, 0.5), c = vert(mid, 0.5, 0.5), d = vert(right, 1, 0.5), e = vert(tip, 0.5, 1);
      leaves.tri(a, c, b); leaves.tri(a, d, c); leaves.tri(b, c, e); leaves.tri(c, d, e);
    };
    for (let fan = 0; fan < 3; fan++) {
      const az = detail.yaw + fan * 2.05 + (sr() - 0.5) * 0.3;
      const dx = Math.cos(az), dz = Math.sin(az), s = detail.scale;
      const at = (t: number) => new THREE.Vector3(detail.x + dx * s * 0.48 * t * t + s * 0.18 * t,
        y + s * (0.46 + fan * 0.05) * t, detail.z + dz * s * 0.48 * t * t);
      let previous = at(0);
      for (let node = 1; node <= 4; node++) {
        const point = at(node / 4);
        R.get('bark').rod(previous.x, previous.y, previous.z, point.x, point.y, point.z, s * 0.014 * (1 - node / 7), 4, [0.20, 0.17, 0.11], { rEnd: s * 0.014 * (1 - (node + 1) / 7), jit: 0.1 });
        if (node > 1) for (const sign of [-1, 1]) {
          const direction = new THREE.Vector3(-dz * sign + dx * 0.5, 0.1, dx * sign + dz * 0.5).normalize();
          leaf(point, direction, s * (0.15 + sr() * 0.11), [0.15 + sr() * 0.035, 0.17 + sr() * 0.035, 0.08 + sr() * 0.025]);
        }
        previous = point;
      }
    }
  };
  const shoreDetails = createShoreDetailPopulation(terrain, ctx.excl, trunks).filter(detail => detail.rank < density);
  for (const detail of shoreDetails) {
    if (detail.kind === 'driftwood') drift(detail); else scrub(detail);
  }
  const driftwood = shoreDetails.filter(detail => detail.kind === 'driftwood').length;
  const shoreScrub = shoreDetails.length - driftwood;
  // Wrack: dark ribbons of weed at the waterline.
  for (let z = -140; z < 130; z += 1.8) {
    if (rng() > 0.5 * density) continue;
    const zz = z + rng() * 1.8;
    const sd = -0.5 + rng() * 5;
    const xs = coastX(zz) + sd;
    const y = terrain.heightAt(xs, zz);
    if (y < -0.25 || y > 1.3) continue;
    const R = region(xs, zz);
    const B = R.get('leaf');
    const n = 3 + Math.floor(rng() * 4);
    const tint: RGB = [0.24 + rng() * 0.08, 0.22 + rng() * 0.06, 0.1 + rng() * 0.04];
    for (let k = 0; k < n; k++) {
      const a = rng() * Math.PI * 2;
      const l = 0.5 + rng() * 0.9;
      const w = 0.05 + rng() * 0.05;
      const ox = xs + (rng() - 0.5) * 0.5;
      const oz = zz + (rng() - 0.5) * 0.5;
      const oy = terrain.heightAt(ox, oz) + 0.025;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      B.quad([ox - dz * w, oy, oz + dx * w, ox + dz * w, oy, oz - dx * w, ox + dx * l + dz * w * 0.6, oy + 0.05 + rng() * 0.05, oz + dz * l - dx * w * 0.6, ox + dx * l - dz * w * 0.6, oy + 0.05 + rng() * 0.05, oz + dz * l + dx * w * 0.6], tint, { nu: 1, nv: 1, amp: 0.1 });
    }
  }
  // Reeds along the streams and round the spring pool.
  for (let i = 0; i < 900 * density; i++) {
    const x = -60 + rng() * 240;
    const z = -130 + rng() * 220;
    const d = streamDistance(x, z);
    if (d > 6 || d < 1.3 || terrain.carveAt(x, z) > 0.4) continue;
    if (clearanceAt(x, z) < 0.05 && d > 2.5) continue;
    const R = region(x, z);
    const B = R.get('leaf');
    const n = 4 + Math.floor(rng() * 5);
    for (let k = 0; k < n; k++) {
      const a = rng() * Math.PI * 2;
      const l = 0.9 + rng() * 1.3;
      const bend = 0.12 + rng() * 0.3;
      const ox = x + (rng() - 0.5) * 0.7;
      const oz = z + (rng() - 0.5) * 0.7;
      const oy = terrain.heightAt(ox, oz) - 0.05;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      const tint: RGB = [0.42 + rng() * 0.1, 0.4 + rng() * 0.08, 0.2 + rng() * 0.05];
      const w = 0.03;
      const tx = ox + dx * bend * l;
      const tz = oz + dz * bend * l;
      B.quad([ox - dz * w, oy, oz + dx * w, ox + dz * w, oy, oz - dx * w, tx + dz * 0.004, oy + l, tz - dx * 0.004, tx - dz * 0.004, oy + l, tz + dx * 0.004], tint, { amp: 0.14, nu: 1, nv: 2 });
    }
    if (rng() < 0.3) {
      // A cattail head.
      const ox = x + (rng() - 0.5) * 0.5;
      const oz = z + (rng() - 0.5) * 0.5;
      const oy = terrain.heightAt(ox, oz);
      R.get('vc').rod(ox, oy, oz, ox, oy + 1.5, oz, 0.008, 4, [0.35, 0.3, 0.16], { caps: false });
      R.get('vc').cyl(0.02, 0.02, 0.16, 5, ox, oy + 1.4, oz, [0.22, 0.13, 0.08], { jit: 0.1 });
    }
  }

  /* ---- Materials and merge ---- */
  const matVc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: false });
  const matLeaf = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
  const shoreLeafTexture = buildForestLeafTexture(128);
  const matShoreLeaf = new THREE.MeshStandardMaterial({ vertexColors: true, map: shoreLeafTexture, alphaTest: 0.35, roughness: 1, metalness: 0, envMapIntensity: 0.2, side: THREE.DoubleSide });
  // Shore logs retain their authored supports/UVs, but weathered bark now carries their long fibres instead of
  // leaving pale, untextured cylinders against the worn sand. These texture references belong to this module.
  const cachedBark = makeTexPair('bark', 256, 8);
  const barkTex = { map: cachedBark.map.clone(), normal: cachedBark.normal.clone() };
  const matBark = new THREE.MeshStandardMaterial({ vertexColors: true, map: barkTex.map, normalMap: barkTex.normal,
    roughness: 0.98, metalness: 0, envMapIntensity: 0.3 });
  matBark.normalScale.set(0.45, 0.45);
  const rockTex = makeTexPair('rock', 256, 8);
  const matRock = new THREE.MeshStandardMaterial({ vertexColors: true, map: rockTex.map, normalMap: rockTex.normal, roughness: 0.97, metalness: 0, envMapIntensity: 0.35 });
  attachGroundedRockSurface(matRock, terrain);
  const lite = {
    get: (k: MatKey): THREE.Material => (k === 'cloth' ? matShoreLeaf : k === 'leaf' ? matLeaf : k === 'bark' ? matBark : k === 'rock' ? matRock : matVc),
  };
  let pieces = 0;
  for (const R of regions.values()) {
    const g = R.toGroup(lite, { isStatic: true, shadows: true });
    pieces += R.tris;
    group.add(g);
  }
  return {
    group,
    counts: { rocks, pieces, driftwood, shoreScrub },
    update() {},
    stats: () => ({ rocks, scatterTris: pieces, driftwood, shoreScrub }),
    dispose() {
      barkTex.map.dispose();
      barkTex.normal.dispose();
      matVc.dispose();
      matLeaf.dispose();
      shoreLeafTexture.dispose();
      matShoreLeaf.dispose();
      matBark.dispose();
      matRock.dispose();
    },
  };
}
