import * as THREE from 'three';
import { coastX } from '../world/coast';
import { clamp, fbm, mulberry32, ridged, smoothstep } from '../world/noise';
import { clearanceAt } from '../world/terrain';
import { Ctx } from './buildKit';
import type { BuildContext, SceneModule } from './context';
import { makeTexPair } from './buildingTextures';
import { Region, type MatKey } from './regions';
import { streamDistance } from './groundSplat';
import { createScatterPopulation, registerScatterColliders, SCATTER_SHAPES, selectScatterPopulation } from './scatterPopulation';

/**
 * Stones and the things the sea leaves: boulders and scree, pebbles at the tide line, driftwood, wrack (weed), reeds by the
 * water, and the sea stacks off Lantern Point. Everything is merged into 96 m chunks that cull on their own, and every rock is its
 * own shape: an icosphere pushed out by ridged noise and then cut by a few planes, so faces are flat and edges are sharp.
 */

type V3 = [number, number, number];
type RGB = [number, number, number];

/** A fractured rock: a noisy blob with several plane cuts, strata bands in the colour and lichen on the top faces. */
function rockGeometry(seed: number, detail: 1 | 2, tone: RGB): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const planes: { n: V3; d: number }[] = [];
  const nPlanes = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < nPlanes; i++) {
    const a = rnd() * Math.PI * 2;
    const e = (rnd() - 0.3) * 1.1;
    const n: V3 = [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)];
    planes.push({ n, d: 0.62 + rnd() * 0.3 });
  }
  const sx = 0.85 + rnd() * 0.5;
  const sy = 0.5 + rnd() * 0.45;
  const sz = 0.85 + rnd() * 0.5;
  const ph = rnd() * 50;
  const cache = new Map<string, V3>();
  const cols = new Float32Array(pos.count * 3);
  const displaced: V3[] = [];
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let p = cache.get(key);
    if (!p) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const n = 1 + 0.46 * (ridged(x * 1.6 + ph, z * 1.6 + y * 1.3, 3, seed) - 0.3) + 0.14 * fbm(x * 5 + ph, z * 5 - y * 3, 2, seed + 4);
      x *= n;
      y *= n;
      z *= n;
      for (const pl of planes) {
        const over = x * pl.n[0] + y * pl.n[1] + z * pl.n[2] - pl.d;
        if (over > 0) {
          x -= pl.n[0] * over;
          y -= pl.n[1] * over;
          z -= pl.n[2] * over;
        }
      }
      p = [x * sx, Math.max(-0.55, y) * sy, z * sz];
      cache.set(key, p);
    }
    displaced.push(p);
  }
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, displaced[i]![0], displaced[i]![1], displaced[i]![2]);
  g.computeVertexNormals();
  const nor = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const strata = 0.82 + 0.28 * Math.sin(y * 9 + ph + fbm(pos.getX(i) * 3, pos.getZ(i) * 3, 2, seed + 9) * 4);
    const top = clamp(nor.getY(i), 0, 1);
    // Lichen and moss on the sheltered top faces; damp dark at the foot.
    const lich = smoothstep(0.55, 0.9, top) * smoothstep(0.35, 0.65, fbm(pos.getX(i) * 5 + ph, pos.getZ(i) * 5, 2, seed + 12) * 0.5 + 0.5);
    const foot = smoothstep(-0.2, -0.5, y);
    let r = tone[0] * strata;
    let gg = tone[1] * strata;
    let b = tone[2] * strata;
    r = r * (1 - lich * 0.3) + 0.06 * lich;
    gg = gg * (1 - lich * 0.2) + 0.08 * lich;
    b = b * (1 - lich * 0.35) + 0.02 * lich;
    const k = 1 - 0.35 * foot;
    cols[i * 3] = r * k;
    cols[i * 3 + 1] = gg * k;
    cols[i * 3 + 2] = b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.deleteAttribute('uv');
  // Faceted: rocks are angular. Convert to flat-shaded normals.
  // IcosahedronGeometry is already non-indexed, so every triangle has its own vertices and computeVertexNormals gives flat facets.
  g.computeVertexNormals();
  return g;
}

/** Sea stacks, cliffs and boulders share a handful of seeded shapes per size class; each placed rock picks one and is scaled and turned. */

let sharedShapes: { big: THREE.BufferGeometry[]; small: THREE.BufferGeometry[] } | null = null;
const ROCK_TONES: RGB[] = [[1.0, 0.95, 0.88], [0.88, 0.86, 0.8], [1.08, 0.95, 0.82], [0.8, 0.8, 0.78]];

/** The shared set of rock shapes (also used by the settlement for quarry faces and boulders, so they match the ones on the heath). */
export function rockShapes() {
  if (!sharedShapes) {
    sharedShapes = {
      big: Array.from({ length: SCATTER_SHAPES }, (_, i) => rockGeometry(100 + i, 2, ROCK_TONES[i % ROCK_TONES.length]!)),
      small: Array.from({ length: SCATTER_SHAPES }, (_, i) => rockGeometry(200 + i, 1, ROCK_TONES[(i + 1) % ROCK_TONES.length]!)),
    };
  }
  return sharedShapes;
}

export function buildScatter(ctx: BuildContext): SceneModule & { counts: { rocks: number; pieces: number } } {
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
  const population = createScatterPopulation(terrain, ctx.excl);
  registerScatterColliders(population, colliders);
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
  const drift = (x: number, z: number) => {
    const R = region(x, z);
    const y = terrain.heightAt(x, z);
    const len = 1.2 + rng() * 3.2;
    const yaw = rng() * Math.PI;
    const r = 0.05 + rng() * 0.11;
    const tint: RGB = [0.3 + rng() * 0.08, 0.26 + rng() * 0.07, 0.2 + rng() * 0.06];
    const cx = Math.cos(yaw) * len * 0.5;
    const cz = Math.sin(yaw) * len * 0.5;
    R.get('bark').rod(x - cx, y + r * 0.7, z - cz, x + cx, y + r * 0.7 + (rng() - 0.5) * 0.2, z + cz, r, 6, tint, { rEnd: r * (0.5 + rng() * 0.4), jit: 0.2 });
    if (rng() < 0.4) R.get('bark').rod(x, y + r, z, x + Math.cos(yaw + 1.3) * len * 0.3, y + r + 0.3, z + Math.sin(yaw + 1.3) * len * 0.3, r * 0.4, 5, tint, { jit: 0.2 });
  };
  for (let z = -120; z < 100; z += 4.5) {
    if (rng() > 0.55 * density) continue;
    const zz = z + rng() * 4;
    const xs = coastX(zz) + (2.5 + rng() * 9);
    if (terrain.heightAt(xs, zz) > 0.15 && terrain.heightAt(xs, zz) < 2) drift(xs, zz);
  }
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
  const matBark = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const rockTex = makeTexPair('rock', 256, 8);
  const matRock = new THREE.MeshStandardMaterial({ vertexColors: true, map: rockTex.map, normalMap: rockTex.normal, roughness: 0.92, metalness: 0 });
  const lite = {
    get: (k: MatKey): THREE.Material => (k === 'leaf' ? matLeaf : k === 'bark' ? matBark : k === 'rock' ? matRock : matVc),
  };
  let pieces = 0;
  for (const R of regions.values()) {
    const g = R.toGroup(lite, { isStatic: true, shadows: true });
    pieces += R.tris;
    group.add(g);
  }
  return {
    group,
    counts: { rocks, pieces },
    update() {},
    stats: () => ({ rocks, scatterTris: pieces }),
    dispose() {
      matVc.dispose();
      matLeaf.dispose();
      matBark.dispose();
      matRock.dispose();
    },
  };
}
