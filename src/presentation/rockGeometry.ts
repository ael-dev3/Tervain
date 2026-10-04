import * as THREE from 'three';
import { clamp, fbm, mulberry32, ridged, smoothstep } from '../world/noise';

type V3 = [number, number, number];
type RGB = [number, number, number];
export const SCATTER_SHAPES = 6;

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
  const sy = 0.42 + rnd() * 0.25;
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
      p = [x * sx, Math.min(.82, Math.max(-0.55, y)) * sy, z * sz];
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
  // A metre-scale projection per flat fracture face gives every side real albedo/normal detail.
  // Render batching multiplies these local units by the placed rock size; support positions are untouched.
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    if (ny >= nx && ny >= nz) { uv[i * 2] = pos.getX(i); uv[i * 2 + 1] = pos.getZ(i); }
    else if (nx >= nz) { uv[i * 2] = pos.getZ(i); uv[i * 2 + 1] = pos.getY(i); }
    else { uv[i * 2] = pos.getX(i); uv[i * 2 + 1] = pos.getY(i); }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
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


export interface RockTransform {
  x: number; y: number; z: number; size: number; shape: number;
  yaw: number; rx: number; rz: number; squash: number; zScale: number;
}

/** The very same YXZ transform used by Ctx/Region, including every nonuniform rock scale and tilt. */
export function rockTransform(rock: RockTransform): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rock.rx, rock.yaw, rock.rz, 'YXZ'));
  return new THREE.Matrix4().compose(new THREE.Vector3(rock.x, rock.y, rock.z), q,
    new THREE.Vector3(rock.size, rock.size * rock.squash, rock.size * rock.zScale));
}

/** Seat the whole transformed cut base, rather than balancing the centre over one ground sample.
 * All vertices in the lowest 12% are embedded; a steep hillside may bury more of the upslope side. */
export function groundedRockY(rock: RockTransform, heightAt: (x: number, z: number) => number, burial: number): number {
  const shapes = rockShapes(), g = (rock.size > .55 ? shapes.big : shapes.small)[rock.shape]!;
  const positions = g.getAttribute('position'), matrix = rockTransform({ ...rock, y: 0 });
  const p = new THREE.Vector3(), points: THREE.Vector3[] = [];
  let low = Infinity, high = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i).applyMatrix4(matrix);
    low = Math.min(low, p.y); high = Math.max(high, p.y); points.push(p.clone());
  }
  const threshold = low + (high - low) * .12;
  let seated = Infinity;
  for (const point of points) if (point.y <= threshold + 1e-6) seated = Math.min(seated, heightAt(point.x, point.z) - point.y);
  return seated - burial;
}

export function rockContactGeometry(rock: RockTransform, id: string): import('../world/physicsGeometry').PhysicalRockGeometry {
  const shapes = rockShapes(), g = (rock.size > .55 ? shapes.big : shapes.small)[rock.shape]!;
  const source = g.getAttribute('position'), matrix = rockTransform(rock), p = new THREE.Vector3();
  const positions = new Float32Array(source.count * 3), indices = new Uint32Array(source.count);
  const bounds = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
  for (let i = 0; i < source.count; i++) {
    p.fromBufferAttribute(source, i).applyMatrix4(matrix);
    positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z; indices[i] = i;
    bounds.minX = Math.min(bounds.minX, positions[i * 3]!); bounds.maxX = Math.max(bounds.maxX, positions[i * 3]!);
    bounds.minY = Math.min(bounds.minY, positions[i * 3 + 1]!); bounds.maxY = Math.max(bounds.maxY, positions[i * 3 + 1]!);
    bounds.minZ = Math.min(bounds.minZ, positions[i * 3 + 2]!); bounds.maxZ = Math.max(bounds.maxZ, positions[i * 3 + 2]!);
  }
  return { id, positions, indices, bounds };
}
