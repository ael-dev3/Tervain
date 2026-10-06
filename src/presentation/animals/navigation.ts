import type { Colliders } from '../../world/colliders';
import { ROADS, type V2 } from '../../world/layout';
import { distToPolyline, type Terrain } from '../../world/terrain';
import type { AnimalDefinition } from './catalog';

export interface AnimalGround {
  heightAt(x: number, z: number): number;
  walkable(x: number, z: number, maxSlope?: number): boolean;
  carveAt(x: number, z: number): number;
  seaDepth(x: number, z: number): number;
}

/** Keep animals off water, steep ground, solid scenery, and the authored walking strip. */
export function animalCanStand(terrain: AnimalGround, colliders: Pick<Colliders, 'blocked'>, point: V2, definition: AnimalDefinition, protectRoads = true) {
  if (!terrain.walkable(point.x, point.z, .58) || terrain.carveAt(point.x, point.z) > .16 || terrain.seaDepth(point.x, point.z) > .03) return false;
  if (colliders.blocked(point.x, point.z, definition.radius + .15)) return false;
  if (protectRoads && ROADS.some((road) => distToPolyline(point.x, point.z, road.points).d < road.width / 2 + definition.radius + .35)) return false;
  return true;
}

/** Bounded local steering: sample the whole step and sweep a body disc so thin fences cannot be skipped. */
export function animalCanTravel(terrain: AnimalGround, colliders: Pick<Colliders, 'blocked' | 'cast'>, from: V2, to: V2, definition: AnimalDefinition, protectRoads = true) {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  if (length > 18 || colliders.cast(from.x, from.z, to.x, to.z, definition.radius + .15, undefined, undefined, [], true)) return false;
  const steps = Math.max(1, Math.ceil(length / .5));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!animalCanStand(terrain, colliders, { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t }, definition, protectRoads)) return false;
  }
  return true;
}

/** Scenery varies by quality. Move an authored anchor only enough to find an open patch beside it. */
export function findAnimalHome(terrain: Terrain, colliders: Colliders, definition: AnimalDefinition, anchor = definition.home, protectRoads = true): V2 | null {
  if (animalCanStand(terrain, colliders, anchor, definition, protectRoads)) return { ...anchor };
  for (let ring = 1; ring <= 10; ring++) for (let ray = 0; ray < 16; ray++) {
    const angle = ray * Math.PI / 8 + ring * .3;
    const point = { x: anchor.x + Math.sin(angle) * ring, z: anchor.z + Math.cos(angle) * ring };
    if (animalCanStand(terrain, colliders, point, definition, protectRoads)) return point;
  }
  return null;
}
