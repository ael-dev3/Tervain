import { FURNITURE, footprint, HOUSEHOLDS, pieceSize, reserved, type FurniturePlacement, type PieceId, type Rect } from './furniture';
import { hearthOf, INTERIORS, roomHalfSize, type InteriorSpec } from './interiors';

/**
 * What makes a room lived in (A123): the things on its tables and shelves, on its walls and before its hearth, and the
 * rugs on its floor. Gothic 3's houses (the references for 0.0.14) are full of them; ours stood with their furniture
 * alone. Nothing here is walked into, so none of it collides; it is laid out from the furniture already placed, so it
 * never stands in the way in, across a window or inside another piece.
 */
export type DressingId = 'bread' | 'jug' | 'candle' | 'pots' | 'cauldron' | 'herbs' | 'antlers' | 'pelt' | 'rug';

export interface Dressing {
  room: InteriorSpec;
  piece: DressingId;
  /** In the building's frame, on the room floor; `y` above the floor. */
  x: number;
  z: number;
  y: number;
  yaw: number;
  /** Rugs only: their size on the floor. */
  size?: readonly [number, number];
}

/** A rug's woven pattern, by household (index into the rug material's palettes). */
export function rugPattern(room: InteriorSpec, n: number): number {
  let h = 2166136261;
  for (const c of `${room.building.id}:${n}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % 4;
}

const turn = (p: FurniturePlacement, lx: number, lz: number) => {
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  return { x: p.x + lx * c + lz * s, z: p.z - lx * s + lz * c };
};

type Wall = 'back' | 'left' | 'right';

/** Things hung on the walls by each household, and in every other inhabited room. */
const WALL_ITEMS: Record<string, ('antlers' | 'pelt' | 'herbs')[]> = {
  weaver: ['herbs'], woodcutter: ['antlers', 'herbs'], herbalist: ['herbs', 'herbs', 'herbs'], hunter: ['antlers', 'pelt', 'herbs'],
  farmer: ['herbs', 'herbs'], brewer: ['herbs'], reeve: ['antlers'], inn: ['antlers', 'pelt', 'herbs'], lodge: ['pelt', 'antlers'],
  fisher: ['herbs'], keeper: ['herbs'], bakery: ['herbs', 'herbs'], mill: [],
};

/** Hung items' heights above the floor (their lower edge) and their footprint along the wall. */
const HANG = { antlers: { y: 1.55, w: 0.8 }, pelt: { y: 0.75, w: 1.2 }, herbs: { y: 1.5, w: 0.45 } } as const;

export function dressRoom(room: InteriorSpec, placed: readonly FurniturePlacement[] = FURNITURE.filter((p) => p.room === room)): Dressing[] {
  const out: Dressing[] = [];
  const { hw, hd } = roomHalfSize(room);
  const household = room.building.kind === 'house' ? HOUSEHOLDS[room.building.id] ?? 'weaver' : room.building.kind;

  // On every table: a board of bread and cheese, a jug and cups, a candle (left out where the table is a counter).
  let rugs = 0;
  for (const p of placed) {
    const [w, h, d] = pieceSize(p.piece);
    if (p.piece === 'table') {
      const bread = turn(p, -w * 0.22, 0.02), jug = turn(p, w * 0.26, d * 0.12), candle = turn(p, w * 0.02, -d * 0.18);
      out.push({ room, piece: 'bread', ...bread, y: h, yaw: p.yaw + 0.3 }, { room, piece: 'jug', ...jug, y: h, yaw: p.yaw - 0.6 },
        { room, piece: 'candle', ...candle, y: h, yaw: 0 });
      // A rug under the table and its seats.
      out.push({ room, piece: 'rug', x: p.x, z: p.z, y: 0.006, yaw: p.yaw, size: [w + 1.0, d + 1.1] });
      rugs++;
    } else if (p.piece === 'desk' || p.piece === 'workbench') {
      const candle = turn(p, w * 0.32, -d * 0.15);
      out.push({ room, piece: 'candle', ...candle, y: h, yaw: 0 });
    } else if (p.piece === 'shelf' || p.piece === 'cupboard') {
      const pots = turn(p, 0, 0.02);
      out.push({ room, piece: 'pots', ...pots, y: h, yaw: p.yaw });
    } else if (p.piece === 'bed' && rugs < 2) {
      // A small rug at the bed's side, where feet go in the morning.
      const side = turn(p, 0, d / 2 + 0.45);
      out.push({ room, piece: 'rug', ...side, y: 0.006, yaw: p.yaw, size: [1.4, 0.8] });
      rugs++;
    }
  }

  // Before the hearth: the cooking pot (the bakery bakes in its oven instead).
  const hearth = hearthOf(room);
  if (hearth && room.building.kind !== 'bakery') {
    const at = hearth.before(0.3);
    out.push({ room, piece: 'cauldron', ...at, y: 0, yaw: hearth.yaw + 0.4 });
  }

  // On the walls, between the windows and clear of anything tall: the household's own things.
  const { always, windows } = reserved(room);
  const tall: Rect[] = placed.filter((p) => pieceSize(p.piece)[1] > 1.2).map((p) => footprint(p.piece, p.x, p.z, p.yaw));
  const taken: Rect[] = [];
  for (const item of WALL_ITEMS[household] ?? []) {
    const { y, w } = HANG[item];
    const spot = wallSpot(hw, hd, w, (r) => !windows.some((o) => near(r, o)) && !always.some((o) => near(r, o))
      && !tall.some((o) => near(r, o)) && !taken.some((o) => near(r, o, 0.25))
      // A pelt hangs low: nothing may stand in front of it.
      && (item !== 'pelt' || !placed.some((p) => near(r, footprint(p.piece, p.x, p.z, p.yaw)))), item === 'herbs' && hearth ? hearth.stack : null);
    if (!spot) continue;
    taken.push(spot.rect);
    out.push({ room, piece: item, x: spot.x, z: spot.z, y, yaw: spot.yaw });
  }
  return out;
}

const near = (a: Rect, b: Rect, margin = 0.05) => a.x0 < b.x1 + margin && b.x0 < a.x1 + margin && a.z0 < b.z1 + margin && b.z0 < a.z1 + margin;

/** The first free stretch of wall for a hung item `w` wide, nearest `towards` when given (herbs dry by the fire). */
function wallSpot(hw: number, hd: number, w: number, free: (r: Rect) => boolean, towards: { x: number; z: number } | null) {
  const spots: { x: number; z: number; yaw: number; rect: Rect; cost: number }[] = [];
  const walls: Wall[] = ['back', 'left', 'right'];
  for (const wall of walls) {
    const length = wall === 'back' ? hw : hd;
    for (let t = -length + w / 2 + 0.2; t <= length - w / 2 - 0.2; t += 0.1) {
      const x = wall === 'back' ? t : wall === 'left' ? -hw + 0.16 : hw - 0.16;
      const z = wall === 'back' ? -hd + 0.16 : t;
      const yaw = wall === 'back' ? 0 : wall === 'left' ? Math.PI / 2 : -Math.PI / 2;
      const rect = wall === 'back' ? { x0: x - w / 2, x1: x + w / 2, z0: -hd, z1: -hd + 0.5 }
        : { x0: wall === 'left' ? -hw : hw - 0.5, x1: wall === 'left' ? -hw + 0.5 : hw, z0: z - w / 2, z1: z + w / 2 };
      if (!free(rect)) continue;
      // Spread the hung things about the room in a fixed order: back wall first, then sides; near the hearth for herbs.
      const cost = towards ? Math.hypot(x - towards.x, z - towards.z) : walls.indexOf(wall) * 10 + Math.abs(t);
      spots.push({ x, z, yaw, rect, cost });
    }
  }
  spots.sort((a, b) => a.cost - b.cost);
  return spots[0] ?? null;
}

export const DRESSING: readonly Dressing[] = INTERIORS.flatMap((room) => dressRoom(room));

/** Pieces drawn from prepared models (the rest, rugs, are built in code). */
export const DRESSING_MODELS: readonly Exclude<DressingId, 'rug'>[] = ['bread', 'jug', 'candle', 'pots', 'cauldron', 'herbs', 'antlers', 'pelt'];
export type { PieceId };
