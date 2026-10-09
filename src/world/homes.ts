import type { NpcId } from '../game/types';
import { buildingStepSurfacesAt } from './buildingEntries';
import type { Colliders } from './colliders';
import { FURNITURE, pieceSize, type PieceId } from './furniture';
import { fromBuildingLocal, hearthOf, INTERIORS, onRoomFloor, roomHalfSize, toBuildingLocal, type InteriorSpec } from './interiors';
import { ANCHORS, bySpec, type V2 } from './layout';
import type { Terrain } from './terrain';

/**
 * Where the residents sleep (A70). In Gothic every person has a bed and goes to it: at night they walk in through their
 * door, sit down on the edge of the bed and lie down, and in the morning they get up and walk out again. Each resident's
 * night place is a piece of furniture in a room (a bed, a bunk, a shrine bench), a free piece of a room's floor (a
 * bedroll by the hearth), or, for the two who live out of doors, their seat or their shelter.
 */
export type HomeBerth =
  | { building: string; piece: 'bed' | 'bunk' | 'bench'; index: number }
  | { building: string; piece: 'floor' }
  | { anchor: string; piece: 'seat' | 'ground' };

export const RESIDENT_HOMES: Partial<Record<NpcId, HomeBerth>> = {
  rillford_reeve: { building: 'reeve_house', piece: 'bed', index: 0 },
  // The cell and the guard post beside the hall are not built: the two keep their vigil on the hall's front benches.
  spring_steward: { building: 'shrine_hall', piece: 'bench', index: 2 },
  shrine_warden: { building: 'shrine_hall', piece: 'bench', index: 5 },
  quarry_foreman: { building: 'crew_bunks', piece: 'bunk', index: 1 },
  quarry_hand: { building: 'crew_bunks', piece: 'bunk', index: 2 },
  estate_steward: { building: 'quarry_office', piece: 'floor' },
  maintenance_worker: { building: 'inn', piece: 'floor' },
  // "Lives beside the mill": the nearest house with a bed.
  mill_hand: { building: 'house_a', piece: 'bed', index: 0 },
  village_baker: { building: 'bakery', piece: 'floor' },
  ash_recorder: { anchor: 'ford_camp', piece: 'seat' },
  trail_hunter: { anchor: 'hunter_shelter', piece: 'ground' },
};

/** Lying surfaces above the floor or ground they stand on, metres: a mattress, a lower bunk, a plank bench, a bedroll. */
const SURFACE: Record<'bed' | 'bunk' | 'bench' | 'floor' | 'ground', number> = { bed: 0.5, bunk: 0.45, bench: 0.55, floor: 0.1, ground: 0.1 };
/** A lying body's hip joint above the surface it lies on (on their side). */
const HIP_ABOVE = 0.15;
const BODY = 0.35;

/** A resident's bed for the night, in the world (A70). */
export interface Berth {
  /** Where they stand to sit down on its edge, facing away from it, and the seat's height above that standing ground. */
  stand: V2;
  yaw: number;
  seat: number;
  /** How far behind the standing place the seated hips rest. */
  seatBack: number;
  /** The lying hip joint (world) and the unit direction, along the bed, from the hips to the head. */
  hip: { x: number; y: number; z: number };
  head: V2;
  room: InteriorSpec | null;
}

type Ground = Pick<Terrain, 'groundAt'> & Partial<Pick<Terrain, 'heightAt'>>;

/** The height a resident walks on: the ground or a room's floor, or a building's doorstep within a stride of their feet (A70). */
export function walkingGround(terrain: Ground, x: number, z: number, feetY?: number): number {
  const ground = terrain.groundAt(x, z);
  if (typeof terrain.heightAt !== 'function') return ground;
  let best = ground;
  for (const step of buildingStepSurfacesAt(x, z, (px, pz) => terrain.heightAt!(px, pz))) {
    if (step > best && (feetY === undefined || Math.abs(step - feetY) < 0.45)) best = step;
  }
  return best;
}

const worldDir = (room: InteriorSpec, dx: number, dz: number): V2 => {
  const b = room.building, o = fromBuildingLocal(b, 0, 0), p = fromBuildingLocal(b, dx, dz);
  const l = Math.hypot(p.x - o.x, p.z - o.z) || 1;
  return { x: (p.x - o.x) / l, z: (p.z - o.z) / l };
};

/** A room's doorstep outside its door, where an outdoor route ends and the way in begins (the door anchors' 1.4 m). */
export function roomDoorstep(room: InteriorSpec): V2 {
  return fromBuildingLocal(room.building, room.door.x, room.building.d / 2 + 1.4);
}

interface RoomGrid { version: number; height: number; nx: number; nz: number; x0: number; z0: number; free: Uint8Array }
const GRID = 0.15;
const grids = new WeakMap<InteriorSpec, RoomGrid>();

/** Where a body can stand in a room and its doorway out to the doorstep, on a fine grid in the building's frame. */
function roomGrid(room: InteriorSpec, terrain: Ground, colliders: Colliders, height: number): RoomGrid {
  const cached = grids.get(room);
  if (cached && cached.version === colliders.version && Math.abs(cached.height - height) < 0.2) return cached;
  const b = room.building, { hw, hd } = roomHalfSize(room);
  // Aligned on the doorway's middle, so the narrow way in has a row of cells down its centre.
  const x0 = room.door.x - Math.ceil((room.door.x + hw) / GRID) * GRID, z0 = -hd;
  const nx = Math.floor((hw - x0) / GRID) + 1, nz = Math.floor((b.d / 2 + 1.7 - z0) / GRID) + 1;
  const free = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const lx = x0 + i * GRID, lz = z0 + j * GRID;
    const outside = lz > hd;
    if (outside ? Math.abs(lx - room.door.x) > room.door.halfWidth + 0.8 : !onRoomFloor(room, lx, lz)) continue;
    const p = fromBuildingLocal(b, lx, lz), y = walkingGround(terrain, p.x, p.z);
    // A little wider than a body, so a route drawn on it never grazes a door jamb or a table's corner.
    if (!Number.isFinite(y) || colliders.blocked(p.x, p.z, BODY + 0.06, { minY: y + 0.02, maxY: y + height })) continue;
    free[j * nx + i] = 1;
  }
  const grid = { version: colliders.version, height, nx, nz, x0, z0, free };
  grids.set(room, grid);
  return grid;
}

/**
 * A walk within a room and its doorway (A70): the coarse navigation grid cannot see through a doorway a metre wide, so
 * the way in and about a room is found on its own fine grid. Returns world points from near `from` to `to`, or null.
 */
export function roomRoute(room: InteriorSpec, from: V2, to: V2, terrain: Ground, colliders: Colliders, height: number): V2[] | null {
  const g = roomGrid(room, terrain, colliders, height), b = room.building;
  const cell = (p: V2) => {
    const l = toBuildingLocal(b, p.x, p.z);
    const ci = Math.round((l.x - g.x0) / GRID), cj = Math.round((l.z - g.z0) / GRID);
    let best = -1, bestD = Infinity;
    for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) {
      const i = ci + di, j = cj + dj;
      if (i < 0 || j < 0 || i >= g.nx || j >= g.nz || !g.free[j * g.nx + i]) continue;
      const d = di * di + dj * dj;
      if (d < bestD) { bestD = d; best = j * g.nx + i; }
    }
    return best;
  };
  const start = cell(from), goal = cell(to);
  if (start < 0 || goal < 0) return null;
  const prev = new Int32Array(g.nx * g.nz).fill(-1), cost = new Float32Array(g.nx * g.nz).fill(Infinity);
  cost[start] = 0;
  // A small Dijkstra over 8 neighbours (a few hundred cells): diagonals only where both sides are free.
  const open: number[] = [start];
  while (open.length) {
    let k = 0;
    for (let n = 1; n < open.length; n++) if (cost[open[n]!]! < cost[open[k]!]!) k = n;
    const at = open.splice(k, 1)[0]!;
    if (at === goal) break;
    const i = at % g.nx, j = (at - i) / g.nx;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const a = i + di, c = j + dj;
      if (a < 0 || c < 0 || a >= g.nx || c >= g.nz) continue;
      const next = c * g.nx + a;
      if (!g.free[next] || (di && dj && (!g.free[j * g.nx + a] || !g.free[c * g.nx + i]))) continue;
      const step = cost[at]! + (di && dj ? Math.SQRT2 : 1);
      if (step >= cost[next]!) continue;
      if (cost[next] === Infinity) open.push(next);
      cost[next] = step; prev[next] = at;
    }
  }
  if (cost[goal] === Infinity) return null;
  const cells: number[] = [];
  for (let at = goal; at >= 0; at = prev[at]!) { cells.push(at); if (at === start) break; }
  cells.reverse();
  const points = cells.map((at) => { const i = at % g.nx; return fromBuildingLocal(b, g.x0 + i * GRID, g.z0 + ((at - i) / g.nx) * GRID); });
  // Pull the string: keep a corner only where the straight way past it is not free.
  const clear = (p: V2, q: V2) => {
    const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.z - p.z) / (GRID * 0.5)));
    for (let s = 1; s < n; s++) {
      const l = toBuildingLocal(b, p.x + (q.x - p.x) * s / n, p.z + (q.z - p.z) * s / n);
      const i = Math.round((l.x - g.x0) / GRID), j = Math.round((l.z - g.z0) / GRID);
      if (i < 0 || j < 0 || i >= g.nx || j >= g.nz || !g.free[j * g.nx + i]) return false;
    }
    return true;
  };
  // Through a doorway square to it, by its middle: a corner is never cut past a jamb (A70).
  const { hd } = roomHalfSize(room), pinned = new Set<number>();
  for (const z of [b.d / 2 + 0.35, hd - 0.5]) {
    let best = -1, bestD = 0.2;
    cells.forEach((at, n) => {
      const i = at % g.nx, lx = g.x0 + i * GRID, lz = g.z0 + ((at - i) / g.nx) * GRID, d = Math.hypot(lx - room.door.x, lz - z);
      if (d < bestD) { bestD = d; best = n; }
    });
    if (best > 0) pinned.add(best);
  }
  // Grazing a jamb or a table's corner, a resident first steps clear onto the route's own first cell.
  const out: V2[] = Math.hypot(points[0]!.x - from.x, points[0]!.z - from.z) > 0.05 ? [points[0]!] : [];
  let anchor = points[0]!;
  for (let n = 1; n < points.length; n++) {
    if (n === points.length - 1 || pinned.has(n) || !clear(anchor, points[n + 1]!)) { out.push(points[n]!); anchor = points[n]!; }
  }
  out.push({ x: to.x, z: to.z });
  return out;
}

const facing = (room: InteriorSpec, front: V2) => { const d = worldDir(room, front.x, front.z); return Math.atan2(d.x, d.z); };

/** A berth on a piece of furniture: sit on the edge of its front, then lie along it, head to its other end. */
function pieceBerth(room: InteriorSpec, piece: PieceId, index: number, surface: number, terrain: Ground, colliders: Colliders, height: number): Berth | null {
  const placement = FURNITURE.filter((p) => p.room === room && p.piece === piece)[index];
  if (!placement) return null;
  const [w, , d] = pieceSize(piece);
  const front = { x: Math.sin(placement.yaw), z: Math.cos(placement.yaw) }, along = { x: front.z, z: -front.x };
  const b = room.building;
  for (const side of [0.35, -0.35, 0.5, -0.5, 0.2, -0.2, 0.65, -0.65, 0.8, -0.8]) {
    if (Math.abs(side) > w / 2 - 0.2) continue;
    for (const out of [0.57, 0.7, 0.85]) {
      const sx = placement.x + front.x * (d / 2 - 0.15) + along.x * side, sz = placement.z + front.z * (d / 2 - 0.15) + along.z * side;
      const px = sx + front.x * out, pz = sz + front.z * out;
      const stand = fromBuildingLocal(b, px, pz), y = walkingGround(terrain, stand.x, stand.z);
      if (colliders.blocked(stand.x, stand.z, BODY + 0.06, { minY: y + 0.02, maxY: y + height })) continue;
      if (!roomRoute(room, roomDoorstep(room), stand, terrain, colliders, height)) continue;
      const hipLocal = { x: placement.x + front.x * 0.05 + along.x * Math.sign(side) * 0.3, z: placement.z + front.z * 0.05 + along.z * Math.sign(side) * 0.3 };
      const hip = fromBuildingLocal(b, hipLocal.x, hipLocal.z);
      return { stand, yaw: facing(room, front), seat: surface, seatBack: out, room,
        hip: { x: hip.x, y: y + surface + HIP_ABOVE, z: hip.z }, head: worldDir(room, -along.x * Math.sign(side), -along.z * Math.sign(side)) };
    }
  }
  return null;
}

/** A bedroll on a room's floor: the free spot nearest its hearth (else farthest from its door) a body can lie down on. */
function floorBerth(room: InteriorSpec, terrain: Ground, colliders: Colliders, height: number): Berth | null {
  const b = room.building, { hw, hd } = roomHalfSize(room), hearth = hearthOf(room)?.before(1.1);
  const candidates: { lx: number; lz: number; yaw: number; side: number; cost: number }[] = [];
  for (let lx = -hw + 0.4; lx <= hw - 0.4; lx += 0.1) for (let lz = -hd + 0.4; lz <= hd - 0.4; lz += 0.1) {
    const cost = hearth ? Math.hypot(lx - hearth.x, lz - hearth.z) : -Math.hypot(lx - room.door.x, lz - hd);
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) for (const side of [1, -1]) candidates.push({ lx, lz, yaw, side, cost });
  }
  candidates.sort((p, q) => p.cost - q.cost);
  for (const c of candidates) {
    const front = { x: Math.round(Math.sin(c.yaw)), z: Math.round(Math.cos(c.yaw)) }, along = { x: front.z, z: -front.x };
    // The lying body (hips, back, head, knees, feet) and the place to stand before it, all on clear floor.
    const parts = [[0, 0], [-0.45, 0], [-0.85, 0], [0, 0.45], [0.4, 0.4]].map(([a, f]) => ({ x: c.lx + along.x * c.side * a! + front.x * f!, z: c.lz + along.z * c.side * a! + front.z * f! }));
    const standLocal = { x: c.lx + front.x * 0.55, z: c.lz + front.z * 0.55 };
    if (![...parts, standLocal].every((p) => onRoomFloor(room, p.x, p.z, -0.25) && Math.abs(p.z) <= hd - 0.25)) continue;
    // Not in the way in.
    if (Math.abs(standLocal.x - room.door.x) < room.door.halfWidth + 0.5 && standLocal.z > hd - 1.5) continue;
    const floor = walkingGround(terrain, fromBuildingLocal(b, c.lx, c.lz).x, fromBuildingLocal(b, c.lx, c.lz).z);
    if (parts.some((p) => { const w = fromBuildingLocal(b, p.x, p.z); return colliders.blocked(w.x, w.z, 0.22, { minY: floor + 0.05, maxY: floor + 0.5 }); })) continue;
    const stand = fromBuildingLocal(b, standLocal.x, standLocal.z);
    if (colliders.blocked(stand.x, stand.z, BODY + 0.06, { minY: floor + 0.02, maxY: floor + height })) continue;
    if (!roomRoute(room, roomDoorstep(room), stand, terrain, colliders, height)) continue;
    const hip = fromBuildingLocal(b, c.lx, c.lz);
    return { stand, yaw: facing(room, front), seat: SURFACE.floor, seatBack: 0.55, room,
      hip: { x: hip.x, y: floor + SURFACE.floor + HIP_ABOVE, z: hip.z }, head: worldDir(room, -along.x * c.side, -along.z * c.side) };
  }
  return null;
}

/** Out of doors: on their seat (along the bench), or on the ground at their shelter. */
function anchorBerth(anchor: string, piece: 'seat' | 'ground', terrain: Ground, colliders: Colliders, height: number): Berth | null {
  const a = ANCHORS[anchor];
  if (!a) return null;
  const front = { x: Math.sin(a.yaw), z: Math.cos(a.yaw) }, along = { x: front.z, z: -front.x };
  const ground = walkingGround(terrain, a.x, a.z);
  if (piece === 'seat' && a.seat !== undefined) {
    // The seat place itself: the actor stands up in front of it as for any seat (see NpcActor.placeFor).
    for (const out of [0.45, 0.6]) {
      const stand = { x: a.x + front.x * out, z: a.z + front.z * out }, y = walkingGround(terrain, stand.x, stand.z);
      if (colliders.blocked(stand.x, stand.z, BODY + 0.06, { minY: y + 0.02, maxY: y + height })) continue;
      return { stand, yaw: a.yaw, seat: a.seat + ground - y, seatBack: out, room: null,
        hip: { x: a.x + along.x * 0.3, y: ground + a.seat + HIP_ABOVE, z: a.z + along.z * 0.3 }, head: { x: -along.x, z: -along.z } };
    }
    return null;
  }
  const hip = { x: a.x - front.x * 0.55, z: a.z - front.z * 0.55 };
  return { stand: { x: a.x, z: a.z }, yaw: a.yaw, seat: SURFACE.ground, seatBack: 0.55, room: null,
    hip: { x: hip.x, y: walkingGround(terrain, hip.x, hip.z) + SURFACE.ground + HIP_ABOVE, z: hip.z }, head: { x: -along.x, z: -along.z } };
}

/** A resident's bed for the night, or null for someone with none (who then goes in at their door as before). */
export function berthFor(id: NpcId, terrain: Ground, colliders: Colliders, height: number): Berth | null {
  const home = RESIDENT_HOMES[id];
  if (!home) return null;
  if ('anchor' in home) return anchorBerth(home.anchor, home.piece, terrain, colliders, height);
  const room = INTERIORS.find((r) => r.building === bySpec(home.building));
  if (!room) return null;
  if (home.piece === 'floor') return floorBerth(room, terrain, colliders, height);
  return pieceBerth(room, home.piece, home.index, SURFACE[home.piece], terrain, colliders, height);
}

/**
 * Indoor work places (A70): a furnished spot in a resident's workshop or home where they spend part of the day, as a
 * Gothic baker works at the oven before standing at the door. Each is a piece of a room's furniture; the worker stands
 * square before whichever side of it is clear and reachable from the doorway.
 */
export const INDOOR_POSTS: Record<string, { building: string; piece: PieceId; index: number }> = {
  bakery_oven: { building: 'bakery', piece: 'oven', index: 0 },
  mill_bench: { building: 'mill', piece: 'workbench', index: 0 },
  office_table: { building: 'quarry_office', piece: 'table', index: 0 },
  reeve_table: { building: 'reeve_house', piece: 'table', index: 0 },
};

/** An indoor post's stance: where the worker stands, facing the piece, the piece's top and its footprint corners. */
export interface IndoorPost { x: number; z: number; yaw: number; room: InteriorSpec; top: number; corners: V2[] }

const posts = new Map<string, { version: number; post: IndoorPost | null }>();

export function indoorPost(name: string, terrain: Ground, colliders: Colliders, height: number): IndoorPost | null {
  const spec = INDOOR_POSTS[name];
  if (!spec) return null;
  const cached = posts.get(name);
  if (cached && cached.version === colliders.version) return cached.post;
  const room = INTERIORS.find((r) => r.building === bySpec(spec.building)) ?? null;
  const placement = room ? FURNITURE.filter((p) => p.room === room && p.piece === spec.piece)[spec.index] : undefined;
  let post: IndoorPost | null = null;
  if (room && placement) {
    const [w, h, d] = pieceSize(spec.piece), b = room.building;
    const front = { x: Math.sin(placement.yaw), z: Math.cos(placement.yaw) }, along = { x: front.z, z: -front.x };
    // Front first, then its two ends, then its back (a table's far side).
    for (const [fx, ax, reach] of [[1, 0, d / 2], [0, 1, w / 2], [0, -1, w / 2], [-1, 0, d / 2]] as const) {
      const out = { x: front.x * fx + along.x * ax, z: front.z * fx + along.z * ax };
      const local = { x: placement.x + out.x * (reach + 0.45), z: placement.z + out.z * (reach + 0.45) };
      const at = fromBuildingLocal(b, local.x, local.z), y = walkingGround(terrain, at.x, at.z);
      if (colliders.blocked(at.x, at.z, BODY + 0.06, { minY: y + 0.02, maxY: y + height })) continue;
      if (!roomRoute(room, roomDoorstep(room), at, terrain, colliders, height)) continue;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sa, sf]) =>
        fromBuildingLocal(b, placement.x + along.x * sa! * w / 2 + front.x * sf! * d / 2, placement.z + along.z * sa! * w / 2 + front.z * sf! * d / 2));
      // The oven is worked at its mouth, not on its crown.
      post = { x: at.x, z: at.z, yaw: facing(room, { x: -out.x, z: -out.z }), room, top: y + (spec.piece === 'oven' ? 0.95 : h), corners };
      break;
    }
  }
  posts.set(name, { version: colliders.version, post });
  return post;
}
