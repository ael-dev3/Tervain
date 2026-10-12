import { FURNITURE, footprint, HOUSEHOLDS, pieceSize, reserved, type FurniturePlacement, type PieceId, type Rect } from './furniture';
import { hearthOf, HEARTH_DRESS, INTERIORS, joistsOf, roomHalfSize, type InteriorSpec } from './interiors';

/**
 * What makes a room lived in (A123): the things on its tables and shelves, on its walls and before its hearth, and the
 * rugs on its floor. Gothic 3's houses (the references for 0.0.14) are full of them; ours stood with their furniture
 * alone. Nothing here is walked into, so none of it collides; it is laid out from the furniture already placed, so it
 * never stands in the way in, across a window or inside another piece.
 */
export type DressingId = 'bread' | 'jug' | 'candle' | 'pots' | 'cauldron' | 'herbs' | 'antlers' | 'pelt' | 'rug' | 'board' | 'small';

/**
 * The small things a household keeps (A135), built in code (presentation/clutter.ts): a clay jar is about 30 cm tall,
 * a jug 22, a bowl a hand high. They crowd the wall shelves, the mantel and the floor's corners.
 */
export type SmallKind = 'jar' | 'jug' | 'bowl' | 'cup' | 'candle' | 'pot' | 'loaf' | 'bottle' | 'spool';

export interface Dressing {
  room: InteriorSpec;
  piece: DressingId;
  /** In the building's frame, on the room floor; `y` above the floor. */
  x: number;
  z: number;
  y: number;
  yaw: number;
  /** Rugs and wall shelves only: their size (rugs: on the floor; shelves: length along the wall and depth). */
  size?: readonly [number, number];
  /** Uniform scale of a modelled or small piece (1 by default). */
  scale?: number;
  /** Small pieces only: what it is. */
  kind?: SmallKind;
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

type Wall = 'back' | 'left' | 'right' | 'front';

/** Things hung on the walls by each household, and in every other inhabited room. */
const WALL_ITEMS: Record<string, ('antlers' | 'pelt' | 'herbs')[]> = {
  weaver: ['herbs'], woodcutter: ['antlers', 'herbs'], herbalist: ['herbs', 'herbs', 'herbs'], hunter: ['antlers', 'pelt', 'herbs'],
  farmer: ['herbs', 'herbs'], brewer: ['herbs'], reeve: ['antlers'], inn: ['antlers', 'pelt', 'herbs'], lodge: ['pelt', 'antlers'],
  fisher: ['herbs'], keeper: ['herbs'], bakery: ['herbs', 'herbs'], mill: [],
};

/** Hung items' heights above the floor (their lower edge) and their footprint along the wall. */
const HANG = { antlers: { y: 1.55, w: 0.8 }, pelt: { y: 0.75, w: 1.2 }, herbs: { y: 1.5, w: 0.45 } } as const;

/** How many bunches each household hangs to dry from its ceiling joists (A135). */
const HANG_FROM_JOISTS: Record<string, number> = { weaver: 3, woodcutter: 2, herbalist: 7, hunter: 3, farmer: 4, brewer: 3, inn: 3, fisher: 2, keeper: 2, bakery: 2, reeve: 1 };

/**
 * The prepared models' scale in a room (A135): the clay pots on a shelf and the jug on a table were modelled at about
 * one and a half times a real one's size (a jar knee-high to the hero), so they are drawn smaller.
 */
export const MODEL_SCALE: Partial<Record<DressingId, number>> = { pots: 0.62, jug: 0.68, bread: 0.85 };

/** Each household's wall shelves (A135): how many, and what crowds each, left to right. */
const SHELVES: Record<string, SmallKind[][]> = {
  weaver: [['spool', 'spool', 'bowl', 'spool', 'jar', 'spool', 'candle'], ['jar', 'cup', 'cup', 'bowl', 'spool', 'spool']],
  woodcutter: [['jar', 'cup', 'bowl', 'bottle', 'pot', 'cup'], ['jar', 'jar', 'loaf', 'bowl', 'candle']],
  herbalist: [['jar', 'bottle', 'jar', 'bottle', 'jar', 'bottle', 'jar'], ['bottle', 'bottle', 'jar', 'bowl', 'jar', 'bottle', 'pot'],
    ['jar', 'jar', 'bowl', 'bottle', 'cup', 'jar']],
  hunter: [['jar', 'bottle', 'cup', 'bowl', 'pot', 'candle'], ['jar', 'jar', 'bowl', 'cup', 'bottle']],
  farmer: [['jar', 'jar', 'pot', 'bowl', 'loaf', 'cup', 'cup'], ['pot', 'jar', 'bowl', 'bowl', 'candle']],
  brewer: [['jug', 'bottle', 'jug', 'bottle', 'cup', 'jug', 'bottle'], ['bottle', 'bottle', 'jug', 'cup', 'cup', 'jar']],
  reeve: [['jar', 'cup', 'candle', 'bowl']], inn: [['jug', 'cup', 'cup', 'jug', 'bottle', 'cup'], ['bowl', 'bowl', 'jar', 'pot']],
  fisher: [['jar', 'bowl', 'cup', 'pot', 'bottle']], keeper: [['jar', 'cup', 'bowl', 'candle']], bakery: [['jar', 'jar', 'bowl', 'pot', 'loaf']],
};

/** Each household's floor corners (A135): a few vessels stood together against a wall. */
const CORNERS: Record<string, SmallKind[][]> = {
  weaver: [['jar', 'spool', 'jar']], woodcutter: [['jar', 'pot', 'jar']], herbalist: [['jar', 'jar', 'pot', 'jar'], ['pot', 'jar']],
  hunter: [['jar', 'pot']], farmer: [['jar', 'jar', 'pot'], ['pot', 'jar']], brewer: [['jug', 'jar', 'jug', 'jar'], ['jar', 'jug']],
};

/** How wide each small thing stands (metres), for spacing them along a shelf; and the scale a corner's vessels take. */
const SMALL_W: Record<SmallKind, number> = { jar: 0.2, jug: 0.16, bowl: 0.19, cup: 0.09, candle: 0.1, pot: 0.21, loaf: 0.2, bottle: 0.1, spool: 0.11 };
/** Wall shelves: the upper and lower boards' heights above the floor, their depth and length. */
export const SHELF = { y: 1.58, low: 1.12, depth: 0.24, length: 0.95 } as const;

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

  // At the hearth (A135): the cooking pot on its trivet at the side of the mouth, and a few things on the mantel shelf
  // (the bakery bakes in its oven instead).
  const hearth = hearthOf(room);
  if (hearth && room.building.kind !== 'bakery') {
    const pot = hearth.at(HEARTH_DRESS.pot.x, HEARTH_DRESS.pot.z);
    out.push({ room, piece: 'cauldron', ...pot, y: HEARTH_DRESS.pot.y, yaw: hearth.yaw + 0.4, scale: 0.86 });
    const mantel: SmallKind[] = household === 'herbalist' ? ['bottle', 'jar', 'candle', 'bottle', 'bowl', 'jar']
      : household === 'brewer' ? ['jug', 'cup', 'candle', 'cup', 'jug'] : ['candle', 'jar', 'bowl', 'cup', 'jar'];
    mantel.forEach((kind, i) => {
      const lx = -HEARTH_DRESS.mantel.half + (i + 0.5) * (2 * HEARTH_DRESS.mantel.half) / mantel.length;
      const at = hearth.at(lx, HEARTH_DRESS.mantel.z);
      out.push({ room, piece: 'small', kind, ...at, y: HEARTH_DRESS.mantel.y, yaw: hearth.yaw + i * 1.3, scale: wobble(room, i, 0.85, 1.1) });
    });
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

  // Shelves on the walls, crowded with the household's things (A135): clear of the windows, the hearth and anything
  // tall, near the hearth or the work pieces where there is a choice.
  const work = placed.find((p) => p.piece === 'workbench' || p.piece === 'desk' || p.piece === 'loom' || p.piece === 'table');
  const pieces: Rect[] = placed.map((p) => footprint(p.piece, p.x, p.z, p.yaw));
  const rows = [...(SHELVES[household] ?? [])];
  for (let n = 0; rows.length && n < 4; n++) {
    const spot = wallSpot(hw, hd, SHELF.length, (r) => !windows.some((o) => near(r, o)) && !always.some((o) => near(r, o))
      && !tall.some((o) => near(r, o)) && !taken.some((o) => near(r, o, 0.3)), n === 0 && work ? work : null, 0.13, 0,
      ['back', 'left', 'right', 'front'], 0.04);
    if (!spot) break;
    taken.push(spot.rect);
    // A second board below the first where nothing stands under it: a little rack of two shelves.
    const levels = pieces.some((o) => near(spot.rect, o, 0.02)) ? [SHELF.y] : [SHELF.y, SHELF.low];
    for (const y of levels) {
      const row = rows.shift();
      if (!row) break;
      out.push({ room, piece: 'board', x: spot.x, z: spot.z, y, yaw: spot.yaw, size: [SHELF.length, SHELF.depth] });
      let t = -SHELF.length / 2 + 0.03;
      for (const [i, kind] of row.entries()) {
        const w = SMALL_W[kind] * 0.95;
        if (t + w > SHELF.length / 2 - 0.02) break;
        const along = t + w / 2, c = Math.cos(spot.yaw), s = Math.sin(spot.yaw);
        // Along the wall is the shelf's own x; a little out from the wall, staggered.
        const lz = (i % 2 ? 0.025 : -0.015);
        out.push({ room, piece: 'small', kind, x: spot.x + along * c + lz * s, z: spot.z - along * s + lz * c, y: y + 0.03,
          yaw: spot.yaw + i * 2.1, scale: wobble(room, n * 10 + i + y, 0.85, 1.1) });
        t += w + 0.015;
      }
    }
  }

  // Bunches of herbs drying from the ceiling joists (A135), over the table and the work, never over the fire.
  const joists = joistsOf(room), hangs = HANG_FROM_JOISTS[household] ?? 0;
  const over = placed.filter((p) => p.piece === 'table' || p.piece === 'workbench' || p.piece === 'desk' || p.piece === 'bed');
  for (let i = 0; i < hangs && over.length; i++) {
    const p = over[i % over.length]!, [w] = pieceSize(p.piece), lx = (wobble(room, 200 + i, -0.5, 0.5)) * w;
    const at = turn(p, lx, 0), z = joists.reduce((best, j) => (Math.abs(j - at.z) < Math.abs(best - at.z) ? j : best), joists[0]!);
    const zz = joists[(joists.indexOf(z) + Math.floor(i / over.length)) % joists.length]!;
    if (hearth && Math.hypot(at.x - hearth.stack.x, zz - hearth.stack.z) < 1.3) continue;
    out.push({ room, piece: 'herbs', x: at.x, z: zz, y: room.wallTop - room.floorTop - 0.86, yaw: wobble(room, 300 + i, 0, 6.28), scale: wobble(room, 400 + i, 0.75, 1) });
  }

  // Vessels stood together in the corners of the floor, against a wall and clear of every piece (A135).
  for (const [n, group] of (CORNERS[household] ?? []).entries()) {
    const width = group.length * 0.24;
    const spot = wallSpot(hw, hd, width, (r) => !always.some((o) => near(r, o)) && !pieces.some((o) => near(r, o, 0.08))
      && !taken.some((o) => near(r, o, 0.15)), hearth ? hearth.stack : null, 0.2, n, ['back', 'left', 'right', 'front'], 0.05);
    if (!spot) continue;
    taken.push(spot.rect);
    for (const [i, kind] of group.entries()) {
      const along = -width / 2 + (i + 0.5) * 0.24, c = Math.cos(spot.yaw), s = Math.sin(spot.yaw), lz = (i % 2) * 0.16 - 0.04;
      out.push({ room, piece: 'small', kind, x: spot.x + along * c + lz * s, z: spot.z - along * s + lz * c, y: 0,
        yaw: i * 1.7 + n, scale: wobble(room, 100 + n * 10 + i, 1.0, 1.35) });
    }
  }
  return out;
}

/** A steady per-room variation between lo and hi for the n-th thing. */
function wobble(room: InteriorSpec, n: number, lo: number, hi: number): number {
  let h = 2166136261;
  for (const c of `${room.building.id}:w${n}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return lo + ((h >>> 0) % 1000) / 1000 * (hi - lo);
}

const near = (a: Rect, b: Rect, margin = 0.05) => a.x0 < b.x1 + margin && b.x0 < a.x1 + margin && a.z0 < b.z1 + margin && b.z0 < a.z1 + margin;

/**
 * The first free stretch of wall for a hung item `w` wide, nearest `towards` when given (herbs dry by the fire). `inset`
 * is how far out from the wall its middle stands, `end` how far it keeps from the corners, `walls` which walls it may
 * take; `skip` passes over that many best spots (for a second cluster).
 */
function wallSpot(hw: number, hd: number, w: number, free: (r: Rect) => boolean, towards: { x: number; z: number } | null, inset = 0.16, skip = 0,
  walls: readonly Wall[] = ['back', 'left', 'right'], end = 0.2) {
  const spots: { x: number; z: number; yaw: number; rect: Rect; cost: number }[] = [];
  for (const wall of walls) {
    const length = wall === 'back' || wall === 'front' ? hw : hd;
    for (let t = -length + w / 2 + end; t <= length - w / 2 - end + 1e-6; t += 0.1) {
      const x = wall === 'back' || wall === 'front' ? t : wall === 'left' ? -hw + inset : hw - inset;
      const z = wall === 'back' ? -hd + inset : wall === 'front' ? hd - inset : t;
      const yaw = wall === 'back' ? 0 : wall === 'front' ? Math.PI : wall === 'left' ? Math.PI / 2 : -Math.PI / 2;
      const rect = wall === 'back' ? { x0: x - w / 2, x1: x + w / 2, z0: -hd, z1: -hd + 0.5 }
        : wall === 'front' ? { x0: x - w / 2, x1: x + w / 2, z0: hd - 0.5, z1: hd }
        : { x0: wall === 'left' ? -hw : hw - 0.5, x1: wall === 'left' ? -hw + 0.5 : hw, z0: z - w / 2, z1: z + w / 2 };
      if (!free(rect)) continue;
      // Spread the hung things about the room in a fixed order: back wall first, then sides; near the hearth for herbs.
      const cost = towards ? Math.hypot(x - towards.x, z - towards.z) : walls.indexOf(wall) * 10 + Math.abs(t);
      spots.push({ x, z, yaw, rect, cost });
    }
  }
  spots.sort((a, b) => a.cost - b.cost);
  return spots[skip] ?? spots[0] ?? null;
}

export const DRESSING: readonly Dressing[] = INTERIORS.flatMap((room) => dressRoom(room));

/** Pieces drawn from prepared models (the rest, rugs, shelves and small things, are built in code). */
export const DRESSING_MODELS: readonly Exclude<DressingId, 'rug' | 'board' | 'small'>[] = ['bread', 'jug', 'candle', 'pots', 'cauldron', 'herbs', 'antlers', 'pelt'];
export type { PieceId };
