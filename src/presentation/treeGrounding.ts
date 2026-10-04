import type { TreeVariant } from './treeGen';
import type { FloraTree } from './floraPopulation';
import { WORLD } from '../world/layout';
import type { Terrain } from '../world/terrain';

/** The first few centimetres of woody geometry belong inside the soil, not above it. */
export const TREE_ROOT_PLANE = 0.025;
export const TREE_SOIL_OVERLAP = 0.06;
type Point = readonly [number, number, number];
const roots = new WeakMap<TreeVariant, readonly (readonly Point[])[]>();
const mix = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Actual basal surfaces of every woody LOD. Clipping preserves roots' shape and captures
 * long sloping edges even when neither endpoint lies exactly at the nominal planting plane. */
export function treeRootPolygons(variant: TreeVariant): readonly (readonly Point[])[] {
  const cached = roots.get(variant);
  if (cached) return cached;
  const polygons: Point[][] = [];
  for (const lod of variant.lods) {
    const geometry = lod.wood;
    if (!geometry) continue;
    const p = geometry.getAttribute('position'), index = geometry.index;
    const count = index?.count ?? p.count;
    for (let i = 0; i < count; i += 3) {
      const triangle: Point[] = [];
      for (let j = 0; j < 3; j++) {
        const at = index ? index.getX(i + j) : i + j;
        triangle.push([p.getX(at), p.getY(at), p.getZ(at)]);
      }
      const polygon: Point[] = [];
      for (let j = 0; j < triangle.length; j++) {
        const a = triangle[j]!, b = triangle[(j + 1) % triangle.length]!;
        if (a[1] <= TREE_ROOT_PLANE) polygon.push(a);
        if ((a[1] < TREE_ROOT_PLANE && b[1] > TREE_ROOT_PLANE) || (a[1] > TREE_ROOT_PLANE && b[1] < TREE_ROOT_PLANE)) {
          polygon.push(mix(a, b, (TREE_ROOT_PLANE - a[1]) / (b[1] - a[1])));
        }
      }
      if (polygon.length >= 3) polygons.push(polygon);
    }
  }
  if (polygons.length === 0) throw new Error(`Tree ${variant.species} has no woody ground-contact surface.`);
  roots.set(variant, polygons);
  return polygons;
}

/** A linear segment crosses terrain facets at grid edges and the x+z diagonals. */
function facetCrossings(a: Point, b: Point, visit: (point: Point) => void): void {
  visit(a);
  const cross = (start: number, end: number, origin: number) => {
    if (Math.abs(end - start) < 1e-10) return;
    const low = Math.min(start, end), high = Math.max(start, end);
    const first = Math.floor((low - origin) / WORLD.cell) + 1;
    const last = Math.ceil((high - origin) / WORLD.cell) - 1;
    for (let cell = first; cell <= last; cell++) visit(mix(a, b, (origin + cell * WORLD.cell - start) / (end - start)));
  };
  cross(a[0], b[0], WORLD.minX);
  cross(a[2], b[2], WORLD.minZ);
  cross(a[0] + a[2], b[0] + b[2], WORLD.minX + WORLD.minZ);
}

/** Terrain vertices inside a root surface matter too: checking only its perimeter can miss
 * a dip in the visible triangulated ground beneath a broad source-model root cap. */
function interiorTerrainVertices(polygon: readonly Point[], visit: (point: Point) => void): void {
  const a = polygon[0]!;
  for (let i = 1; i < polygon.length - 1; i++) {
    const b = polygon[i]!, c = polygon[i + 1]!;
    const det = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if (Math.abs(det) < 1e-10) continue;
    const minX = Math.min(a[0], b[0], c[0]), maxX = Math.max(a[0], b[0], c[0]);
    const minZ = Math.min(a[2], b[2], c[2]), maxZ = Math.max(a[2], b[2], c[2]);
    const firstX = Math.ceil((minX - WORLD.minX) / WORLD.cell), lastX = Math.floor((maxX - WORLD.minX) / WORLD.cell);
    const firstZ = Math.ceil((minZ - WORLD.minZ) / WORLD.cell), lastZ = Math.floor((maxZ - WORLD.minZ) / WORLD.cell);
    for (let ix = firstX; ix <= lastX; ix++) for (let iz = firstZ; iz <= lastZ; iz++) {
      const x = WORLD.minX + ix * WORLD.cell, z = WORLD.minZ + iz * WORLD.cell;
      const wa = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / det;
      const wb = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / det;
      const wc = 1 - wa - wb;
      if (Math.min(wa, wb, wc) >= -1e-8) visit([x, wa * a[1] + wb * b[1] + wc * c[1], z]);
    }
  }
}

/** Only translate the whole tree down. Its basal wood meets the lowest supporting soil
 * under every rotated/scaled root, while six centimetres of overlap hides raster seams.
 * The minimum occurs at intersections of the root and terrain triangles, checked exactly. */
export function groundedTreeY(terrain: Pick<Terrain, 'heightAt'>, tree: Pick<FloraTree, 'x' | 'z' | 's' | 'yaw'>, variant: TreeVariant): number {
  let y = terrain.heightAt(tree.x, tree.z) - TREE_SOIL_OVERLAP;
  const c = Math.cos(tree.yaw), s = Math.sin(tree.yaw);
  const world = (point: Point): Point => [tree.x + tree.s * (point[0] * c + point[2] * s), point[1] * tree.s, tree.z + tree.s * (point[2] * c - point[0] * s)];
  const contact = (point: Point) => { y = Math.min(y, terrain.heightAt(point[0], point[2]) - point[1] - TREE_SOIL_OVERLAP); };
  for (const local of treeRootPolygons(variant)) {
    const polygon = local.map(world);
    for (let i = 0; i < polygon.length; i++) facetCrossings(polygon[i]!, polygon[(i + 1) % polygon.length]!, contact);
    interiorTerrainVertices(polygon, contact);
  }
  return y;
}
