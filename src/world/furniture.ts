import { FURNITURE_SIZES, type FurnitureId } from './furnitureSizes';
import { CHIMNEY_STACK, doorwayClear, FIREPLACE, hearthOf, INTERIORS, roomHalfSize, type InteriorSpec } from './interiors';

/**
 * The rooms' furniture (A66): which pieces furnish each building, and where. Every piece but the shrine's benches is a
 * prepared Meshy model (public/models/furniture); the benches are built in code. Pieces stand against walls with their
 * backs to them or freely on the floor, always square to the room, and are placed by a small deterministic solver from
 * each kind of building's wish list: the doorway and the way in stay clear, tall pieces keep off the windows, the
 * hearth keeps its own space, and nothing overlaps. The same placements give the colliders and the drawn furniture.
 */
export type PieceId = FurnitureId | 'bench';

/** Code-built pieces: width, height, depth (front towards +z). */
const CODE_PIECES = { bench: [1.9, 0.55, 0.42] } as const;

export function pieceSize(piece: PieceId): readonly [number, number, number] {
  return piece === 'bench' ? CODE_PIECES.bench : FURNITURE_SIZES[piece];
}

export interface FurniturePlacement {
  room: InteriorSpec;
  piece: PieceId;
  /** The footprint's centre on the room floor, in the building's frame, and its turn about y (0: front towards +z). */
  x: number;
  z: number;
  yaw: number;
}

type Wall = 'back' | 'left' | 'right' | 'front';
interface Wish {
  piece: PieceId;
  /** Against a wall (its back to it), or free on the floor. */
  at: Wall | 'floor';
  /** Along the wall, -1 .. 1 from its left end to its right as seen from inside (back, front: x; left, right: z). */
  along?: number;
  /** Free on the floor: the preferred spot, as fractions of the room's half width and half depth, and the turn. */
  spot?: [number, number];
  yaw?: number;
  /** Beside an earlier wish (its index in the list) on one of its sides, facing it. */
  beside?: { of: number; side: 'front' | 'back' | 'left' | 'right'; offset?: number };
}

const W = (piece: PieceId, at: Wall, along: number): Wish => ({ piece, at, along });
const F = (piece: PieceId, spot: [number, number], yaw = 0): Wish => ({ piece, at: 'floor', spot, yaw });
const B = (piece: PieceId, of: number, side: 'front' | 'back' | 'left' | 'right', offset = 0): Wish => ({ piece, at: 'floor', beside: { of, side, offset } });

/** A table with a seat on each long side. */
const tableWith = (spot: [number, number], seat: PieceId, index: number, seats: ('front' | 'back' | 'left' | 'right')[] = ['front', 'back']): Wish[] =>
  [F('table', spot), ...seats.map((side) => B(seat, index, side))];

const HOUSE_EXTRA: Record<string, PieceId[]> = { house_b: ['workbench'], house_c: ['loom'], house_d: ['workbench'], house_e: ['rack'], house_f: ['loom'] };

function wishes(room: InteriorSpec): Wish[] {
  const b = room.building;
  switch (b.kind) {
    case 'house':
      return [W('bed', 'back', -0.6), W('chest', 'back', 0.15), ...tableWith([-0.3, 0.05], 'stool', 2), W('shelf', 'left', -0.5),
        W('cupboard', 'right', 0.55), W('sacks', 'front', 0.85), ...(HOUSE_EXTRA[b.id] ?? []).map((piece) => W(piece, 'left', 0.4))];
    case 'reeve':
      return [W('desk', 'left', -0.2), B('chair', 0, 'front'), ...tableWith([0.05, 0.15], 'chair', 2, ['left', 'right']),
        W('bed', 'back', 0.55), W('bookshelf', 'back', -0.75), W('chest', 'back', -0.1), W('cupboard', 'right', 0.6), W('sacks', 'front', 0.9)];
    case 'bakery':
      return [W('counter', 'front', 0.8), W('sacks', 'left', -0.6), W('sacks', 'left', 0.3), ...tableWith([-0.2, 0.1], 'stool', 3, ['front']), W('shelf', 'back', -0.55)];
    case 'inn':
      return [W('counter', 'back', -0.45), W('shelf', 'left', -0.55), W('cupboard', 'left', 0.5),
        ...tableWith([-0.35, 0.25], 'stool', 3), ...tableWith([0.4, 0.2], 'stool', 6), W('sacks', 'front', 0.9), W('chest', 'back', 0.15)];
    case 'mill':
      return [W('sacks', 'left', -0.6), W('sacks', 'left', 0.1), W('sacks', 'back', -0.6), W('workbench', 'back', 0.1), W('chest', 'front', 0.85),
        ...tableWith([-0.35, 0.35], 'stool', 5, ['front']), W('shelf', 'right', 0.6)];
    case 'hut':
      return [W('workbench', 'back', -0.5), B('stool', 0, 'front'), W('chest', 'left', 0.5), W('sacks', 'front', 0.9)];
    case 'office':
      return [W('desk', 'back', -0.45), B('chair', 0, 'front'), W('bookshelf', 'back', 0.55), ...tableWith([0.25, 0.25], 'stool', 3, ['front']),
        W('chest', 'left', 0.3), W('cupboard', 'right', -0.3)];
    case 'bunks':
      return [W('bunk', 'back', -0.75), W('bunk', 'back', 0.05), W('bunk', 'back', 0.85), W('chest', 'front', -0.85), W('chest', 'front', 0.85),
        W('chest', 'left', 0.6)];
    case 'lodge':
      return [W('bed', 'back', -0.5), W('rack', 'right', -0.2), ...tableWith([-0.15, 0.25], 'chair', 2, ['left', 'right']), W('chest', 'left', 0.6)];
    case 'fisher':
      return [W('bed', 'back', -0.7), W('bed', 'back', 0.15), ...tableWith([-0.3, 0.2], 'stool', 2, ['front', 'back', 'left']), W('shelf', 'left', -0.6),
        W('workbench', 'right', 0.6), W('sacks', 'front', 0.9), W('chest', 'left', 0.55)];
    case 'store':
      return [W('shelf', 'back', -0.5), W('shelf', 'back', 0.5), W('sacks', 'left', 0.2), W('sacks', 'right', 0.2), W('chest', 'front', 0.85)];
    case 'keeper':
      return [W('bed', 'back', -0.6), ...tableWith([-0.25, 0.25], 'chair', 1, ['left', 'right']), W('cupboard', 'left', 0.35), W('chest', 'back', 0.35)];
    case 'shrine':
      return [W('altar', 'back', 0), W('bookshelf', 'back', -0.7), W('bookshelf', 'back', 0.7), W('rack', 'left', -0.3), W('rack', 'right', -0.3),
        W('chest', 'front', -0.85), W('chest', 'front', 0.85),
        ...[-0.62, 0.62].flatMap((x) => [F('bench', [x, -0.2], 0), F('bench', [x, 0.05], 0), F('bench', [x, 0.3], 0)])];
    default:
      return [];
  }
}

interface Rect { x0: number; x1: number; z0: number; z1: number }
const overlaps = (a: Rect, b: Rect, margin = 0) => a.x0 < b.x1 + margin && b.x0 < a.x1 + margin && a.z0 < b.z1 + margin && b.z0 < a.z1 + margin;

/** A piece's footprint at a place and turn (a multiple of a quarter turn). */
export function footprint(piece: PieceId, x: number, z: number, yaw: number): Rect {
  const [w, , d] = pieceSize(piece);
  const across = Math.abs(Math.sin(yaw)) > 0.5;
  const hx = (across ? d : w) / 2, hz = (across ? w : d) / 2;
  return { x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz };
}

/** Pieces taller than this stand clear of the windows (their sills are about 1.3 m above the floor); a bunkhouse's bunks
 * stand under them all the same. */
const TALL = 1.2;
/** Clear ground around free-standing pieces for walking. */
const WALKWAY = 0.55;

/** What a room keeps free of furniture: the way in, the hearth and the windows (the latter for tall pieces only). */
function reserved(room: InteriorSpec): { always: Rect[]; windows: Rect[] } {
  const b = room.building, { hw, hd } = roomHalfSize(room), { x: dx } = room.door;
  const always: Rect[] = [doorwayClear(room)];
  const hearth = hearthOf(room);
  if (hearth) {
    const c = CHIMNEY_STACK;
    always.push({ x0: hearth.stack.x - c, x1: hearth.stack.x + c, z0: hearth.stack.z - c, z1: hearth.stack.z + c });
    // The fireplace (or the bakery's oven) and room to tend it.
    const oven = b.kind === 'bakery' ? pieceSize('oven') : null;
    always.push(hearth.footprint((oven ? oven[0] / 2 : FIREPLACE.halfWidth) + 0.1, (oven ? oven[2] : FIREPLACE.depth) + 0.5));
  }
  const windows: Rect[] = [];
  if (b.kind !== 'shrine') {
    const span = 0.52;
    for (const side of [-1, 1]) {
      const wx = side * Math.min(b.w * 0.32, b.w / 2 - 0.75);
      if (Math.abs(wx - dx) >= 1.25) windows.push({ x0: wx - span, x1: wx + span, z0: hd - 0.8, z1: hd + 1 });
      windows.push({ x0: side * b.w * 0.24 - span, x1: side * b.w * 0.24 + span, z0: -hd - 1, z1: -hd + 0.8 });
      windows.push({ x0: side > 0 ? hw - 0.8 : -hw - 1, x1: side > 0 ? hw + 1 : -hw + 0.8, z0: -b.d * 0.2 - span, z1: b.d * 0.2 + span });
    }
  }
  return { always, windows };
}

/** The chimney stack with its fireplace (or the bakery's oven), as solid footprints. */
function hearthBlocks(room: InteriorSpec): Rect[] {
  const hearth = hearthOf(room);
  if (!hearth) return [];
  const c = CHIMNEY_STACK, oven = hearthPiece(room);
  return [{ x0: hearth.stack.x - c, x1: hearth.stack.x + c, z0: hearth.stack.z - c, z1: hearth.stack.z + c },
    oven ? footprint(oven.piece, oven.x, oven.z, oven.yaw) : hearth.footprint(FIREPLACE.halfWidth, FIREPLACE.depth)];
}

/** The bakery bakes at its chimney: its oven stands against the stack where other rooms have their fireplace. */
export function hearthPiece(room: InteriorSpec): FurniturePlacement | null {
  const hearth = hearthOf(room);
  if (!hearth || room.building.kind !== 'bakery') return null;
  const at = hearth.before(pieceSize('oven')[2] / 2 + 0.02);
  return { room, piece: 'oven', x: at.x, z: at.z, yaw: hearth.yaw };
}

const WALL_YAW: Record<Wall, number> = { back: 0, front: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };

/** Someone walking about a room: their radius, and how near they must get to a piece to reach it. */
const BODY = 0.4, REACH = 0.7, GRID = 0.1;

/**
 * Whether a room with these obstacles can still be walked from its doorway to every piece in it, without most of its
 * floor being cut off: a flood fill of the spots a body can stand on.
 */
function walkable(room: InteriorSpec, blocks: readonly Rect[], pieces: readonly Rect[]): boolean {
  const { hw, hd } = roomHalfSize(room);
  const nx = Math.floor((2 * hw) / GRID), nz = Math.floor((2 * hd) / GRID);
  const at = (i: number, j: number) => ({ x: -hw + (i + 0.5) * GRID, z: -hd + (j + 0.5) * GRID });
  const free = new Uint8Array(nx * nz);
  let total = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const { x, z } = at(i, j);
    if (x - BODY < -hw || x + BODY > hw || z - BODY < -hd) continue;
    if (blocks.some((r) => x + BODY > r.x0 && x - BODY < r.x1 && z + BODY > r.z0 && z - BODY < r.z1)) continue;
    free[j * nx + i] = 1;
    total++;
  }
  const seen = new Uint8Array(nx * nz);
  const queue: number[] = [];
  // Enter from the doorway: the row along the front wall under the doorway.
  for (let i = 0; i < nx; i++) {
    const key = (nz - 1) * nx + i, { x } = at(i, nz - 1);
    if (free[key] && Math.abs(x - room.door.x) < room.door.halfWidth) { seen[key] = 1; queue.push(key); }
  }
  let reached = queue.length;
  while (queue.length) {
    const key = queue.pop()!, i = key % nx, j = (key - i) / nx;
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]] as const) {
      if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const next = b * nx + a;
      if (!free[next] || seen[next]) continue;
      seen[next] = 1;
      reached++;
      queue.push(next);
    }
  }
  if (reached < total * 0.7) return false;
  return pieces.every((r) => {
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      if (!seen[j * nx + i]) continue;
      const { x, z } = at(i, j);
      if (Math.hypot(Math.max(0, r.x0 - x, x - r.x1), Math.max(0, r.z0 - z, z - r.z1)) < REACH) return true;
    }
    return false;
  });
}

/** Place one room's furniture from its wish list. Wishes that find no room are left out. */
export function furnishRoom(room: InteriorSpec): FurniturePlacement[] {
  const { hw, hd } = roomHalfSize(room);
  const { always, windows } = reserved(room);
  const placed: FurniturePlacement[] = [];
  // Each placed footprint with the walking room it keeps about itself (free pieces and their seats keep a walkway).
  const rects: (Rect & { clear: number })[] = [];
  const hearth = hearthPiece(room);
  if (hearth) placed.push(hearth);
  // What a body cannot walk through: the chimney with its hearth, and every piece placed so far.
  const blocks: Rect[] = hearthBlocks(room), pieceRects: Rect[] = [];
  const byWish: (FurniturePlacement | null)[] = [];
  const hostRects: ((Rect & { clear: number }) | undefined)[] = [];
  const fits = (piece: PieceId, r: Rect, clear: number, host?: Rect) => {
    if (r.x0 < -hw - 1e-6 || r.x1 > hw + 1e-6 || r.z0 < -hd - 1e-6 || r.z1 > hd + 1e-6) return false;
    if (always.some((o) => overlaps(r, o))) return false;
    if (pieceSize(piece)[1] > TALL && piece !== 'bunk' && windows.some((o) => overlaps(r, o))) return false;
    // A seat may stand at its own table; everything else keeps its distance.
    return !rects.some((o) => overlaps(r, o, o === host ? 0.04 : Math.max(0.04, clear, o.clear)));
  };
  for (const wish of wishes(room)) {
    const [w, , d] = pieceSize(wish.piece);
    const candidates: { x: number; z: number; yaw: number; cost: number }[] = [];
    if (wish.at === 'floor' && wish.beside) {
      const host = byWish[wish.beside.of];
      if (host) {
        const r = footprint(host.piece, host.x, host.z, host.yaw);
        const gap = 0.06 + d / 2, o = wish.beside.offset ?? 0;
        const spot = { front: { x: (r.x0 + r.x1) / 2 + o, z: r.z1 + gap, yaw: Math.PI }, back: { x: (r.x0 + r.x1) / 2 + o, z: r.z0 - gap, yaw: 0 },
          left: { x: r.x0 - gap, z: (r.z0 + r.z1) / 2 + o, yaw: -Math.PI / 2 }, right: { x: r.x1 + gap, z: (r.z0 + r.z1) / 2 + o, yaw: Math.PI / 2 } }[wish.beside.side];
        candidates.push({ ...spot, cost: 0 });
      }
    } else if (wish.at === 'floor') {
      const [fx, fz] = wish.spot ?? [0, 0], yaw = wish.yaw ?? 0;
      for (let x = -hw; x <= hw; x += 0.1) for (let z = -hd; z <= hd; z += 0.1) candidates.push({ x, z, yaw, cost: Math.hypot(x - fx * hw, z - fz * hd) });
    } else {
      const yaw = WALL_YAW[wish.at], inset = d / 2 + 0.03;
      const length = wish.at === 'back' || wish.at === 'front' ? hw : hd;
      // Along each wall, "left" is the left end as seen from the room's middle facing that wall.
      const sign = wish.at === 'back' ? 1 : wish.at === 'front' ? -1 : wish.at === 'left' ? -1 : 1;
      const want = (wish.along ?? 0) * length * sign;
      for (let t = -length + w / 2; t <= length - w / 2 + 1e-6; t += 0.05) {
        const spot = wish.at === 'back' ? { x: t, z: -hd + inset } : wish.at === 'front' ? { x: t, z: hd - inset }
          : wish.at === 'left' ? { x: -hw + inset, z: t } : { x: hw - inset, z: t };
        candidates.push({ ...spot, yaw, cost: Math.abs(t - want) });
      }
    }
    candidates.sort((a, b) => a.cost - b.cost);
    const clear = wish.at === 'floor' ? WALKWAY : 0;
    const host = wish.beside ? hostRects[wish.beside.of] : undefined;
    const chosen = candidates.find((c) => {
      const r = footprint(wish.piece, c.x, c.z, c.yaw);
      return fits(wish.piece, r, clear, host) && walkable(room, [...blocks, r], [...pieceRects, r]);
    }) ?? null;
    const placement = chosen ? { room, piece: wish.piece, x: chosen.x, z: chosen.z, yaw: chosen.yaw } : null;
    byWish.push(placement);
    let rect: (Rect & { clear: number }) | undefined;
    if (placement) {
      placed.push(placement);
      rect = { ...footprint(placement.piece, placement.x, placement.z, placement.yaw), clear };
      rects.push(rect);
      blocks.push(rect);
      pieceRects.push(rect);
    }
    hostRects.push(rect);
  }
  return placed;
}

/** Every room's furniture, placed once. */
export const FURNITURE: readonly FurniturePlacement[] = INTERIORS.flatMap(furnishRoom);
