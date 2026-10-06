import { biomeAt } from '../../world/biomes';
import { Colliders, type Collider } from '../../world/colliders';
import { BUILDINGS, ROADS, type V2 } from '../../world/layout';
import { distToPolyline, type Terrain } from '../../world/terrain';
import type { AnimalDefinition } from './catalog';

export interface AnimalSite extends V2 { radius: number }
export type AnimalTerrain = Pick<Terrain, 'heightAt' | 'walkable' | 'carveAt' | 'seaDepth' | 'deckAt'>;

/** Wildlife also avoids modest physical stones that the player's step controller is allowed to climb.
 * This private index preserves every canonical collider identity and its active state, without closing player/NPC routes. */
export function animalNavigationColliders(source: Colliders): Colliders {
  const result = new Colliders(); source.all.forEach(collider => result.add(collider));
  for (const stone of source.rockMeshes) {
    const b = stone.bounds;
    result.box(`animal-rock:${stone.id}`, (b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2,
      (b.maxX - b.minX) / 2 + 0.04, (b.maxZ - b.minZ) / 2 + 0.04, 0, true, { minY: b.minY, maxY: b.maxY });
  }
  return result;
}

function buildingDistance(x: number, z: number): number {
  let nearest = Infinity;
  for (const b of BUILDINGS) {
    const dx = x - b.x, dz = z - b.z, c = Math.cos(b.yaw), s = Math.sin(b.yaw);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    nearest = Math.min(nearest, Math.hypot(Math.max(0, Math.abs(lx) - b.w / 2), Math.max(0, Math.abs(lz) - b.d / 2)));
  }
  return nearest;
}

export function animalHabitatAllowed(definition: AnimalDefinition, point: V2): boolean {
  const settled = buildingDistance(point.x, point.z);
  if (definition.habitat === 'settlement') return settled < 20;
  if (settled < 15) return false;
  const biome = biomeAt(point.x, point.z);
  if (definition.habitat === 'warm-woodland') return biome.weights['ochre-woodland'] > 0.4;
  if (definition.habitat === 'rocky-woodland') return biome.weights['cool-fir-ridge'] > 0.32 && biome.woodland > 0.55;
  if (definition.habitat === 'deepwood') return biome.woodland > 0.7 && biome.weights['pine-deepwood'] > 0.3;
  return biome.woodland > 0.3;
}

/** Sample the entire conservative body disc, keeping paws, heads and tails away from water and steep ledges.
 * Animals stay on natural soil; bridge/stair support is reserved for the player and residents. */
export function animalGroundAllowed(terrain: AnimalTerrain, point: V2, radius: number): boolean {
  for (let k = -1; k < 8; k++) {
    const angle = k * Math.PI / 4, x = point.x + (k < 0 ? 0 : Math.sin(angle) * radius), z = point.z + (k < 0 ? 0 : Math.cos(angle) * radius);
    if (!terrain.walkable(x, z, 0.38) || terrain.carveAt(x, z) > 0.06 || terrain.seaDepth(x, z) > 0.03 || terrain.deckAt(x, z)) return false;
  }
  return true;
}

export function animalPointAllowed(definition: AnimalDefinition, point: V2, radius: number, terrain: AnimalTerrain,
  colliders: Colliders, extras: readonly Collider[] = [], height = 2.5): boolean {
  if (!animalHabitatAllowed(definition, point) || !animalGroundAllowed(terrain, point, radius)) return false;
  const y = terrain.heightAt(point.x, point.z), bounds = { minY: y + 0.03, maxY: y + height };
  if (colliders.blocked(point.x, point.z, radius, bounds)) return false;
  const resolved = colliders.resolve(point.x, point.z, radius, undefined, bounds, extras);
  return !resolved.hit;
}

export function animalRouteDistance(point: V2): number {
  let nearest = Infinity;
  for (const road of ROADS) nearest = Math.min(nearest, distToPolyline(point.x, point.z, road.points).d);
  return nearest;
}

/** Placement happens after trees, rocks and settlement props have registered their actual footprints. */
export function findAnimalSite(definition: AnimalDefinition, radius: number, terrain: AnimalTerrain, colliders: Colliders,
  occupied: readonly AnimalSite[] = [], height = 2.5): AnimalSite {
  for (let ring = 0; ring <= 20; ring++) {
    const count = ring ? Math.ceil(Math.PI * ring * 2) : 1;
    for (let k = 0; k < count; k++) {
      const a = k * Math.PI * 2 / count + ring * 0.37, distance = ring * 0.75;
      const point = { x: definition.home.x + Math.sin(a) * distance, z: definition.home.z + Math.cos(a) * distance };
      if (occupied.some(site => Math.hypot(site.x - point.x, site.z - point.z) < site.radius + radius + 1)) continue;
      const routeReach = definition.habitat === 'rocky-woodland' ? 65 : 30;
      if (animalPointAllowed(definition, point, radius, terrain, colliders, [], height) && animalRouteDistance(point) < routeReach) return { ...point, radius };
    }
  }
  throw new Error(`The ${definition.species} habitat has no clear ground placement (${definition.id}).`);
}

/** Every segment is checked against the same swept body volume and wet/slope samples used during movement. */
export function animalSegmentClear(definition: AnimalDefinition, a: V2, b: V2, radius: number, terrain: AnimalTerrain,
  colliders: Colliders, home: V2, roam: number, extras: readonly Collider[] = [], height = 2.5): boolean {
  if (Math.hypot(b.x - home.x, b.z - home.z) > roam + 0.01) return false;
  const y = terrain.heightAt(a.x, a.z);
  if (colliders.cast(a.x, a.z, b.x, b.z, radius, undefined, { minY: y + 0.03, maxY: y + height }, extras, true)) return false;
  const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.65));
  for (let k = 1; k <= count; k++) {
    const point = { x: a.x + (b.x - a.x) * k / count, z: a.z + (b.z - a.z) * k / count };
    if (!animalPointAllowed(definition, point, radius, terrain, colliders, extras, height)) return false;
  }
  return true;
}

/** Bounded local A*: animals explore their own habitat instead of following global settlement shortcuts.
 * This runs when choosing a goal, at most once every few seconds per moving animal. */
export function findAnimalPath(definition: AnimalDefinition, from: V2, goal: V2, home: V2, radius: number,
  terrain: AnimalTerrain, colliders: Colliders, extras: readonly Collider[] = [], height = 2.5): V2[] | null {
  const roam = definition.roam;
  if (roam <= 0 || !animalPointAllowed(definition, goal, radius, terrain, colliders, extras, height)) return null;
  const clear = (a: V2, b: V2) => animalSegmentClear(definition, a, b, radius, terrain, colliders, home, roam, extras, height);
  if (clear(from, goal)) return [goal];
  const step = 1.8, width = Math.ceil(roam * 2 / step) + 1, origin = { x: home.x - roam, z: home.z - roam };
  const pointAt = (i: number) => ({ x: origin.x + i % width * step, z: origin.z + Math.floor(i / width) * step });
  const cell = (point: V2) => Math.max(0, Math.min(width - 1, Math.round((point.x - origin.x) / step)))
    + Math.max(0, Math.min(width - 1, Math.round((point.z - origin.z) / step))) * width;
  const start = cell(from), end = cell(goal), costs = new Float32Array(width * width).fill(Infinity);
  const came = new Int32Array(width * width).fill(-1), visited = new Uint8Array(width * width), open: number[] = [start];
  const valid = new Int8Array(width * width).fill(-1);
  const allowed = (i: number) => {
    if (i === start) return true;
    if (valid[i] === -1) {
      const p = pointAt(i);
      valid[i] = Math.hypot(p.x - home.x, p.z - home.z) <= roam && animalPointAllowed(definition, p, radius, terrain, colliders, extras, height) ? 1 : 0;
    }
    return valid[i] === 1;
  };
  costs[start] = 0;
  for (let expanded = 0; open.length && expanded < 800; expanded++) {
    let best = 0, score = Infinity;
    for (let k = 0; k < open.length; k++) {
      const i = open[k]!, p = pointAt(i), f = costs[i]! + Math.hypot(p.x - goal.x, p.z - goal.z);
      if (f < score) { best = k; score = f; }
    }
    const current = open.splice(best, 1)[0]!;
    if (visited[current]) continue;
    visited[current] = 1;
    const currentPoint = current === start ? from : pointAt(current);
    if (current === end || Math.hypot(currentPoint.x - goal.x, currentPoint.z - goal.z) < step * 1.5 && clear(currentPoint, goal)) {
      const path: V2[] = [goal];
      if (!clear(currentPoint, goal)) continue;
      for (let i = current; i !== start && i >= 0; i = came[i]!) path.push(pointAt(i));
      path.reverse();
      const compact: V2[] = []; let anchor = from;
      for (let k = 0; k < path.length;) {
        let far = k;
        for (let m = path.length - 1; m > k; m--) if (clear(anchor, path[m]!)) { far = m; break; }
        compact.push(path[far]!); anchor = path[far]!; k = far + 1;
      }
      return compact;
    }
    const ci = current % width, cj = Math.floor(current / width);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj || ci + di < 0 || ci + di >= width || cj + dj < 0 || cj + dj >= width) continue;
      const next = current + di + dj * width;
      if (visited[next] || !allowed(next) || !clear(currentPoint, pointAt(next))) continue;
      const cost = costs[current]! + Math.hypot(pointAt(next).x - currentPoint.x, pointAt(next).z - currentPoint.z);
      if (cost >= costs[next]!) continue;
      costs[next] = cost; came[next] = current; open.push(next);
    }
  }
  return null;
}
