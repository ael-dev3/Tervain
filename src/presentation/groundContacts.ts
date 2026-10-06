import { buildingEntry } from '../world/buildingEntries';
import { BUILDINGS, type BuildingSpec } from '../world/layout';
import { fbm, smoothstep } from '../world/noise';
import type { PhysicalRockGeometry } from '../world/physicsGeometry';
import type { Terrain } from '../world/terrain';

/** Presentation-only wear, mineral toe and sheltered soil. These masks never change
 * a collider, supporting height, canonical object ID or save. */
export interface GroundContactField {
  sampleAt(x: number, z: number, out: Float32Array): void;
  readonly rockFootprints: number;
}
type Point = readonly [number, number];
type Foot = { points: Point[]; minX: number; maxX: number; minZ: number; maxZ: number; reach: number };
const CELL = 16;
const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

function hull(points: Point[]): Point[] {
  const unique = new Map<string, Point>();
  for (const point of points) unique.set(`${point[0].toFixed(4)}:${point[1].toFixed(4)}`, point);
  const ordered = [...unique.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (ordered.length < 3) return [];
  const lower: Point[] = [], upper: Point[] = [];
  for (const point of ordered) {
    while (lower.length > 1 && cross(lower.at(-2)!, lower.at(-1)!, point) <= 0) lower.pop();
    lower.push(point);
  }
  for (let i = ordered.length - 1; i >= 0; i--) {
    const point = ordered[i]!;
    while (upper.length > 1 && cross(upper.at(-2)!, upper.at(-1)!, point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop(); upper.pop();
  return [...lower, ...upper];
}

function footprintDistance(x: number, z: number, points: Point[]): number {
  let nearest = Infinity, inside = true;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!;
    if (cross(a, b, [x, z]) < -0.00001) inside = false;
    const dx = b[0] - a[0], dz = b[1] - a[1], length = dx * dx + dz * dz;
    const t = length > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / length)) : 0;
    nearest = Math.min(nearest, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return inside ? 0 : nearest;
}

/** Use actual accepted rock vertices near their supporting ground, not generic circular
 * scatter candidates. A bounded hull is a visual soil proxy, not an exact new contact surface.
 * Tall sea-stack tops and lifted rocks cannot stain unrelated land underneath them. */
export function createGroundContactField(terrain: Pick<Terrain, 'heightAt'>, rocks: readonly PhysicalRockGeometry[], buildings: readonly BuildingSpec[] = BUILDINGS): GroundContactField {
  const cells = new Map<string, Foot[]>(), feet: Foot[] = [];
  for (const rock of rocks) {
    const b = rock.bounds, width = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
    if (width < 0.6 || b.maxY - b.minY < 0.18) continue;
    const points: Point[] = [], basal = b.minY + (b.maxY - b.minY) * 0.38;
    for (let i = 0; i < rock.positions.length; i += 3) {
      const x = rock.positions[i]!, y = rock.positions[i + 1]!, z = rock.positions[i + 2]!;
      if (y <= basal && y <= terrain.heightAt(x, z) + 0.5) points.push([x, z]);
    }
    const boundary = hull(points);
    if (boundary.length < 3) continue;
    const foot: Foot = { points: boundary, minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity,
      reach: Math.min(1.9, 0.65 + width * 0.16) };
    for (const [x, z] of boundary) {
      foot.minX = Math.min(foot.minX, x); foot.maxX = Math.max(foot.maxX, x);
      foot.minZ = Math.min(foot.minZ, z); foot.maxZ = Math.max(foot.maxZ, z);
    }
    feet.push(foot);
    for (let iz = Math.floor((foot.minZ - foot.reach) / CELL); iz <= Math.floor((foot.maxZ + foot.reach) / CELL); iz++) {
      for (let ix = Math.floor((foot.minX - foot.reach) / CELL); ix <= Math.floor((foot.maxX + foot.reach) / CELL); ix++) {
        const key = `${ix}:${iz}`, list = cells.get(key);
        if (list) list.push(foot); else cells.set(key, [foot]);
      }
    }
  }
  return {
    rockFootprints: feet.length,
    sampleAt(x, z, out) {
      out.fill(0);
      // Noise feathers the soil into adjacent cover; it cannot move the actual object or route.
      const breakup = 0.72 + (fbm(x / 1.45, z / 1.45, 2, 467) * 0.5 + 0.5) * 0.28;
      for (const foot of cells.get(`${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`) ?? []) {
        if (x < foot.minX - foot.reach || x > foot.maxX + foot.reach || z < foot.minZ - foot.reach || z > foot.maxZ + foot.reach) continue;
        const distance = footprintDistance(x, z, foot.points);
        const toe = (1 - smoothstep(0.12, foot.reach, distance)) * breakup;
        out[1] = Math.max(out[1]!, toe * 0.68);
        out[2] = Math.max(out[2]!, toe * 0.28);
      }
      for (const building of buildings) {
        const dx = x - building.x, dz = z - building.z;
        if (Math.hypot(dx, dz) > Math.hypot(building.w, building.d) / 2 + 4.8) continue;
        const c = Math.cos(building.yaw), s = Math.sin(building.yaw);
        const lx = dx * c - dz * s, lz = dx * s + dz * c;
        const outside = Math.hypot(Math.max(0, Math.abs(lx) - building.w / 2), Math.max(0, Math.abs(lz) - building.d / 2));
        const foot = (1 - smoothstep(0.15, 1.65, outside)) * breakup;
        out[1] = Math.max(out[1]!, foot * 0.22);
        out[2] = Math.max(out[2]!, foot * 0.32);
        const door = buildingEntry(building);
        const entrance = Math.hypot((lx - door.x) / (door.w * 0.5 + 0.75), (lz - door.z - 0.9) / 2.2);
        out[0] = Math.max(out[0]!, (1 - smoothstep(0.2, 1.45, entrance)) * 0.87);
      }
    },
  };
}
