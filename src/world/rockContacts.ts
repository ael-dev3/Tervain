import type { PhysicalRockGeometry } from './physicsGeometry';
import { PLAYER_BODY_HEIGHT, PLAYER_BODY_RADIUS } from './playerPlacement';

/** Shares the character controller's finite slope limit; ordinary fractured crowns have useful footholds. */
export const ROCK_CLIMB_ANGLE = Math.PI * .30;
export const ROCK_STEP_HEIGHT = .48;
const MIN_NORMAL_Y = Math.cos(ROCK_CLIMB_ANGLE);
const CELL = 8;

type Point = { x: number; y: number; z: number };
const point = (p: Float32Array, index: number): Point => ({ x: p[index * 3]!, y: p[index * 3 + 1]!, z: p[index * 3 + 2]! });
const inside = (x: number, z: number, a: Point, b: Point, c: Point) => {
  const area = (b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z);
  if (Math.abs(area) < 1e-9) return false;
  const u = ((x - a.x) * (c.z - a.z) - (c.x - a.x) * (z - a.z)) / area;
  const v = ((b.x - a.x) * (z - a.z) - (x - a.x) * (b.z - a.z)) / area;
  return u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6;
};

/** Exact sphere-foot contact against an upward triangle, including its finite edges.
 * Returns capsule bottom height, not the top of an enclosing cylinder or AABB. */
export function rockTriangleSupport(x: number, z: number, a: Point, b: Point, c: Point, radius = PLAYER_BODY_RADIUS): number | null {
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
  const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz);
  if (length < 1e-9 || ny / length < MIN_NORMAL_Y) return null;
  nx /= length; ny /= length; nz /= length;
  const centrePlaneY = a.y - (nx * (x - a.x) + nz * (z - a.z)) / ny;
  let height = -Infinity;
  if (inside(x - nx * radius, z - nz * radius, a, b, c)) height = centrePlaneY + radius / ny - radius;
  for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
    const dx = q.x - p.x, dz = q.z - p.z, dy = q.y - p.y;
    const horizontal2 = dx * dx + dz * dz;
    if (horizontal2 < 1e-12) continue;
    const dot = (x - p.x) * dx + (z - p.z) * dz, t0 = dot / horizontal2;
    const perpendicular2 = Math.max(0, (x - p.x) ** 2 + (z - p.z) ** 2 - dot * dot / horizontal2);
    if (perpendicular2 > radius * radius) continue;
    const horizontal = Math.sqrt(horizontal2), reach = Math.sqrt(radius * radius - perpendicular2);
    const gradient = dy / horizontal;
    const t = Math.max(0, Math.min(1, t0 + reach * gradient / Math.sqrt(1 + gradient * gradient) / horizontal));
    const qx = p.x + dx * t, qz = p.z + dz * t, qy = p.y + dy * t;
    const vertical2 = radius * radius - (x - qx) ** 2 - (z - qz) ** 2;
    if (vertical2 < -1e-8) continue;
    const vertical = Math.sqrt(Math.max(0, vertical2));
    if (vertical / radius >= MIN_NORMAL_Y) height = Math.max(height, qy + vertical - radius);
  }
  return Number.isFinite(height) ? height : null;
}

const subtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y + a.z * b.z;
const squaredDistance = (a: Point, b: Point) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;

/** Closest point on a complete finite triangle; used only for placement/save clearance, not per-frame rendering. */
function triangleDistanceSquared(p: Point, a: Point, b: Point, c: Point): number {
  const ab = subtract(b, a), ac = subtract(c, a), ap = subtract(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return squaredDistance(p, a);
  const bp = subtract(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return squaredDistance(p, b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const t = d1 / (d1 - d3);
    return squaredDistance(p, { x: a.x + ab.x * t, y: a.y + ab.y * t, z: a.z + ab.z * t });
  }
  const cp = subtract(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return squaredDistance(p, c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const t = d2 / (d2 - d6);
    return squaredDistance(p, { x: a.x + ac.x * t, y: a.y + ac.y * t, z: a.z + ac.z * t });
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const t = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return squaredDistance(p, { x: b.x + (c.x - b.x) * t, y: b.y + (c.y - b.y) * t, z: b.z + (c.z - b.z) * t });
  }
  const inverse = 1 / (va + vb + vc), u = vb * inverse, v = vc * inverse;
  return squaredDistance(p, { x: a.x + ab.x * u + ac.x * v, y: a.y + ab.y * u + ac.y * v, z: a.z + ab.z * u + ac.z * v });
}

function capsuleTouchesTriangle(x: number, y: number, z: number, a: Point, b: Point, c: Point): boolean {
  let low = y + PLAYER_BODY_RADIUS, high = y + PLAYER_BODY_HEIGHT - PLAYER_BODY_RADIUS;
  // Distance to a convex triangle is convex along the vertical capsule axis. The final uncertainty is <0.07mm.
  for (let iteration = 0; iteration < 26; iteration++) {
    const first = (low * 2 + high) / 3, second = (low + high * 2) / 3;
    if (triangleDistanceSquared({ x, y: first, z }, a, b, c) < triangleDistanceSquared({ x, y: second, z }, a, b, c)) high = second;
    else low = first;
  }
  return triangleDistanceSquared({ x, y: (low + high) / 2, z }, a, b, c) < (PLAYER_BODY_RADIUS - .008) ** 2;
}

/** Bounded source-triangle registry for standing/save queries; never edits the terrain grid or authored roads. */
export class RockSurfaces {
  private cells = new Map<string, PhysicalRockGeometry[]>();
  register(rocks: readonly PhysicalRockGeometry[]) {
    this.cells.clear();
    for (const rock of rocks) for (let ix = Math.floor(rock.bounds.minX / CELL); ix <= Math.floor(rock.bounds.maxX / CELL); ix++) {
      for (let iz = Math.floor(rock.bounds.minZ / CELL); iz <= Math.floor(rock.bounds.maxZ / CELL); iz++) {
        const key = `${ix}:${iz}`, list = this.cells.get(key) ?? [];
        list.push(rock); this.cells.set(key, list);
      }
    }
  }
  /** Source-exact full capsule clearance prevents a saved foothold inside an adjacent steep rock. */
  clearAt(x: number, y: number, z: number): boolean {
    const seen = new Set<PhysicalRockGeometry>();
    for (let ix = Math.floor((x - PLAYER_BODY_RADIUS) / CELL); ix <= Math.floor((x + PLAYER_BODY_RADIUS) / CELL); ix++) {
      for (let iz = Math.floor((z - PLAYER_BODY_RADIUS) / CELL); iz <= Math.floor((z + PLAYER_BODY_RADIUS) / CELL); iz++) {
        for (const rock of this.cells.get(`${ix}:${iz}`) ?? []) {
          if (seen.has(rock)) continue; seen.add(rock);
          if (x + PLAYER_BODY_RADIUS < rock.bounds.minX || x - PLAYER_BODY_RADIUS > rock.bounds.maxX ||
            z + PLAYER_BODY_RADIUS < rock.bounds.minZ || z - PLAYER_BODY_RADIUS > rock.bounds.maxZ ||
            y + PLAYER_BODY_HEIGHT < rock.bounds.minY || y > rock.bounds.maxY) continue;
          const above: number[] = [], centreY = y + PLAYER_BODY_HEIGHT / 2;
          for (let i = 0; i < rock.indices.length; i += 3) {
            const a = point(rock.positions, rock.indices[i]!), b = point(rock.positions, rock.indices[i + 1]!), c = point(rock.positions, rock.indices[i + 2]!);
            if (capsuleTouchesTriangle(x, y, z, a, b, c)) return false;
            if (inside(x, z, a, b, c)) {
              const dx = b.x - a.x, dz = b.z - a.z, ex = c.x - a.x, ez = c.z - a.z;
              const determinant = dx * ez - ex * dz;
              const u = ((x - a.x) * ez - ex * (z - a.z)) / determinant;
              const v = (dx * (z - a.z) - (x - a.x) * dz) / determinant;
              const height = a.y + u * (b.y - a.y) + v * (c.y - a.y);
              if (height > centreY + 1e-6 && !above.some(value => Math.abs(value - height) < 1e-5)) above.push(height);
            }
          }
          if (above.length % 2) return false;
        }
      }
    }
    return true;
  }
  supportAt(x: number, z: number, feetY: number, rise = .8): number | null {
    let result = -Infinity;
    const seen = new Set<PhysicalRockGeometry>();
    for (let ix = Math.floor((x - PLAYER_BODY_RADIUS) / CELL); ix <= Math.floor((x + PLAYER_BODY_RADIUS) / CELL); ix++) {
      for (let iz = Math.floor((z - PLAYER_BODY_RADIUS) / CELL); iz <= Math.floor((z + PLAYER_BODY_RADIUS) / CELL); iz++) {
        for (const rock of this.cells.get(`${ix}:${iz}`) ?? []) {
          if (seen.has(rock)) continue; seen.add(rock);
          if (x + PLAYER_BODY_RADIUS < rock.bounds.minX || x - PLAYER_BODY_RADIUS > rock.bounds.maxX ||
            z + PLAYER_BODY_RADIUS < rock.bounds.minZ || z - PLAYER_BODY_RADIUS > rock.bounds.maxZ || rock.bounds.minY > feetY + rise) continue;
          for (let i = 0; i < rock.indices.length; i += 3) {
            const height = rockTriangleSupport(x, z, point(rock.positions, rock.indices[i]!), point(rock.positions, rock.indices[i + 1]!), point(rock.positions, rock.indices[i + 2]!));
            if (height !== null && height <= feetY + rise + 1e-6) result = Math.max(result, height);
          }
        }
      }
    }
    return Number.isFinite(result) ? result : null;
  }
}
