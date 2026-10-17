import { FURNITURE, footprint, HOUSEHOLDS, pieceSize, reserved, type FurniturePlacement, type PieceId, type Rect } from './furniture';
import { BREAST_DEPTH, CHIMNEY_STACK, FIREPLACE, hearthOf, HEARTH_DRESS, HEARTH_SHAPE, INTERIORS, joistsOf, roomHalfSize, type InteriorSpec } from './interiors';

/**
 * What makes a room lived in (A123): the things on its tables and shelves, on its walls and before its hearth, and the
 * rugs on its floor. Gothic 3's houses (the references for 0.0.14) are full of them; ours stood with their furniture
 * alone. Nothing here is walked into, so none of it collides; it is laid out from the furniture already placed, so it
 * never stands in the way in, across a window or inside another piece.
 */
export type DressingId = 'bread' | 'jug' | 'candle' | 'pots' | 'cauldron' | 'herbs' | 'antlers' | 'pelt' | 'rug' | 'board' | 'small' | 'rail' | 'hung' | 'firewood';

/**
 * The small things a household keeps (A135), built in code (presentation/clutter.ts): a clay jar is about 30 cm tall,
 * a jug 22, a bowl a hand high. They crowd the wall shelves, the mantel and the floor's corners.
 */
export type SmallKind = 'jar' | 'jug' | 'bowl' | 'cup' | 'candle' | 'pot' | 'loaf' | 'bottle' | 'spool' | 'sack' | 'basket';

/** Things hung from a wall's peg rail (A136), built in code (presentation/clutter.ts). */
export type HungKind = 'ladle' | 'pan' | 'sickle' | 'rope' | 'axe' | 'saw' | 'basket' | 'onions' | FiresideKind | BowKind;
/** Things that stand by the fire (A139), drawn like the hung things (one instanced mesh each, colours in the vertices). */
export type FiresideKind = 'kettle' | 'stool' | 'logbasket';
/** A hunter's bows and his quiver (A140), hung from a peg rail. */
export type BowKind = 'bow' | 'quiver';

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
  /** Hung pieces only: what hangs from the peg. */
  hung?: HungKind;
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

/**
 * Each household's peg rails (A136), what hangs from each, left to right: the first by the hearth (the kitchen's pans
 * and ladles), the rest wherever the walls are free. Every house had bare plaster between its shelves.
 */
const RAILS: Record<string, HungKind[][]> = {
  weaver: [['onions', 'ladle'], ['basket', 'rope'], ['basket']],
  woodcutter: [['onions', 'ladle'], ['axe', 'rope'], ['saw'], ['axe']],
  herbalist: [['onions', 'ladle'], ['basket', 'sickle'], ['basket']],
  hunter: [['onions', 'pan'], ['rope', 'axe'], ['sickle']],
  farmer: [['onions', 'pan'], ['sickle', 'basket'], ['rope', 'sickle']],
  brewer: [['ladle', 'onions'], ['rope', 'basket'], ['ladle']],
  inn: [['pan', 'ladle'], ['pan', 'onions']], fisher: [['rope', 'basket'], ['rope']], keeper: [['pan', 'ladle']], bakery: [['basket', 'ladle']],
};
/** What each household hangs under its windows (A136): the tools of its work, two to a rail. */
const WINDOW_TOOLS: Record<string, HungKind[]> = {
  weaver: ['basket', 'rope', 'ladle', 'basket'], woodcutter: ['axe', 'sickle', 'rope', 'axe'], herbalist: ['sickle', 'basket', 'onions', 'ladle'],
  hunter: ['axe', 'rope', 'sickle', 'basket'], farmer: ['sickle', 'axe', 'basket', 'rope'], brewer: ['ladle', 'basket', 'rope', 'pan'],
  inn: ['pan', 'ladle'], fisher: ['rope', 'basket'],
};
/** The rail under a window's sill girt (the sill is about 1.29 m over the floor); the longest tool clears the floor. */
const WINDOW_RAIL_Y = 1.1;
/** How wide each hung thing is along the rail, metres. */
const HUNG_W: Record<HungKind, number> = { ladle: 0.14, pan: 0.3, sickle: 0.3, rope: 0.32, axe: 0.24, saw: 0.62, basket: 0.34, onions: 0.16, bow: 0.34, quiver: 0.16, kettle: 0.3, stool: 0.36, logbasket: 0.5 };

/** The tools a household hangs on the hearth's wall either side of the breast (A139), where the room's views take them in. */
const HEARTH_TOOLS: Record<string, [HungKind[], HungKind[]]> = {
  weaver: [['rope', 'basket'], ['sickle', 'ladle']], woodcutter: [['saw'], ['axe', 'axe']], herbalist: [['sickle', 'basket'], ['onions', 'onions', 'ladle']],
  hunter: [['axe', 'rope'], ['saw']], farmer: [['sickle', 'axe'], ['basket', 'rope']], brewer: [['ladle', 'pan'], ['rope', 'basket']],
  inn: [['pan', 'ladle'], ['pan', 'rope']], fisher: [['rope', 'basket'], ['axe']], keeper: [['axe', 'rope'], ['pan']], lodge: [['axe', 'rope'], ['saw']],
};
/** A trade's own wall (A140): its rails of tools, the walls it may take in order, and what it keeps near. */
const TRADE_WALL: Record<string, { rails: HungKind[][]; walls: Wall[]; near?: 'workbench'; pelt?: boolean }> = {
  woodcutter: { rails: [['saw', 'axe', 'axe']], walls: ['right', 'back', 'left'], near: 'workbench' },
  hunter: { rails: [['bow', 'bow', 'quiver']], walls: ['right', 'left', 'back'], pelt: true },
};
/** The hearth wall's rails: lower than the others, so the tools on them hang at eye level beside the breast. */
const HEARTH_RAIL_Y = 1.62;
/** A peg rail's height above the floor: above the wainscot, the things on it clear of the rail along its top. */
export const RAIL_Y = 1.78;

/** Each household's sacks and baskets on the floor (A136), stood together against a wall. */
const STORES: Record<string, SmallKind[]> = {
  weaver: ['basket', 'basket'], woodcutter: ['sack', 'basket'], herbalist: ['basket', 'sack', 'basket'], hunter: ['sack', 'sack'],
  farmer: ['sack', 'sack', 'sack', 'basket'], brewer: ['sack', 'sack', 'basket'], inn: ['sack', 'sack'], bakery: ['sack', 'sack', 'sack'],
};

/** How wide each small thing stands (metres), for spacing them along a shelf; and the scale a corner's vessels take. */
const SMALL_W: Record<SmallKind, number> = { jar: 0.2, jug: 0.16, bowl: 0.19, cup: 0.09, candle: 0.1, pot: 0.21, loaf: 0.2, bottle: 0.1, spool: 0.11, sack: 0.38, basket: 0.38 };
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
    // A136: a pan and a ladle hung from hooks under each end of the mantel shelf, before the piers.
    for (const [side, hung] of [[-1, 'pan'], [1, 'ladle']] as const) {
      const at = hearth.at(side * (FIREPLACE.halfWidth + 0.02), HEARTH_SHAPE.mantelFront - 0.04);
      out.push({ room, piece: 'hung', hung, ...at, y: HEARTH_SHAPE.mantelY - 0.11, yaw: hearth.yaw });
    }
    // A136: split wood stacked against the breast beside the fire, on whichever side the room has space and nothing
    // stands (the pot's side last), and a rug or pelt on the boards before the hearthstone where no table's rug lies.
    const furniture = placed.map((p) => footprint(p.piece, p.x, p.z, p.yaw)), door = reserved(room).always.slice(0, 1);
    let woodSide = 0;
    for (const side of [-1, 1]) {
      const c = hearth.at(side * (FIREPLACE.halfWidth + 0.42), CHIMNEY_STACK + 0.22), along = Math.abs(Math.sin(hearth.yaw)) > 0.5;
      const rect = along ? { x0: c.x - 0.2, x1: c.x + 0.2, z0: c.z - 0.33, z1: c.z + 0.33 } : { x0: c.x - 0.33, x1: c.x + 0.33, z0: c.z - 0.2, z1: c.z + 0.2 };
      if (rect.x0 < -hw + 0.02 || rect.x1 > hw - 0.02 || rect.z0 < -hd + 0.02 || rect.z1 > hd - 0.02) continue;
      if (furniture.some((o) => near(rect, o, 0.03)) || door.some((o) => near(rect, o, 0))) continue;
      out.push({ room, piece: 'firewood', ...c, y: 0, yaw: hearth.yaw });
      woodSide = side;
      break;
    }
    const mat = hearth.at(0, HEARTH_SHAPE.slab + 0.42), rugs = out.filter((d) => d.piece === 'rug');
    const matRect = { x0: mat.x - 0.75, x1: mat.x + 0.75, z0: mat.z - 0.75, z1: mat.z + 0.75 };
    const clearOf = (o: { x: number; z: number; size?: readonly [number, number] }) => Math.hypot(o.x - mat.x, o.z - mat.z) > 0.6 + Math.max(...(o.size ?? [1, 1])) / 2;
    if (rugs.every(clearOf) && !furniture.some((o) => near(matRect, o, -0.35)) && Math.abs(mat.x) < hw - 0.5 && Math.abs(mat.z) < hd - 0.5) {
      out.push({ room, piece: 'rug', ...mat, y: 0.006, yaw: hearth.yaw, size: [1.5, 0.9] });
    }
    // A139: by the fire, at their real sizes: a kettle on the hearthstone across from the pot, a three-legged stool
    // drawn up before it, and a basket of logs against the breast on the side the stacked wood is not.
    const potSide = Math.sign(HEARTH_DRESS.pot.x) || 1;
    const fireside: [FiresideKind, number, number, number, number][] = [
      ['kettle', -potSide * 0.58, (HEARTH_SHAPE.front + HEARTH_SHAPE.slab) / 2, 0.045, 0.12],
      ['stool', potSide * 1.0, HEARTH_SHAPE.slab + 0.42, 0, 0.2],
      ['logbasket', -(woodSide || 1) * (FIREPLACE.halfWidth + 0.4), CHIMNEY_STACK + 0.3, 0, 0.27],
    ];
    for (const [kind, lx, lz, y, r] of fireside) {
      const c = hearth.at(lx, lz), rect = { x0: c.x - r, x1: c.x + r, z0: c.z - r, z1: c.z + r };
      if (rect.x0 < -hw + 0.02 || rect.x1 > hw - 0.02 || rect.z0 < -hd + 0.02 || rect.z1 > hd - 0.02) continue;
      if (y === 0 && (furniture.some((o) => near(rect, o, 0.03)) || door.some((o) => near(rect, o, 0))
        || out.some((d) => d.piece === 'firewood' && Math.hypot(d.x - c.x, d.z - c.z) < r + 0.36))) continue;
      out.push({ room, piece: 'hung', hung: kind, ...c, y, yaw: hearth.yaw + (kind === 'stool' ? 0.5 : kind === 'kettle' ? -potSide * 0.9 : 0) });
    }
  }

  // On the walls, between the windows and clear of anything tall: the household's own things.
  const { always, windows } = reserved(room);
  const tall: Rect[] = placed.filter((p) => pieceSize(p.piece)[1] > 1.2).map((p) => footprint(p.piece, p.x, p.z, p.yaw));
  const taken: Rect[] = [];

  // A139: tools on short peg rails beside the hearth, where the room's views look: on the hearth's own wall either side
  // of the breast, or, where the breast stands near a corner, on the next wall round it, past the breast's cap. A rail
  // is shortened, a tool at a time, until it clears the windows (the back wall's at ±0.24 of the width; a side wall's
  // stands just past the breast on its far side), the doorway and anything tall.
  if (hearth && room.building.kind !== 'bakery') {
    const rows = HEARTH_TOOLS[household] ?? [['axe', 'saw'], ['sickle', 'rope']], doorway = always.slice(0, 1), b = room.building;
    const glass: Rect[] = [-1, 1].map((sx) => ({ x0: sx * b.w * 0.24 - 0.47, x1: sx * b.w * 0.24 + 0.47, z0: -hd - 0.2, z1: -hd + 0.2 }));
    const wall = CHIMNEY_STACK - BREAST_DEPTH + 0.05;
    for (const [i, side] of ([-1, 1] as const).entries()) {
      // Along the hearth's wall from beside the breast, or along the corner's wall from past the breast's cap.
      const cornerAt = (() => {
        for (let u = CHIMNEY_STACK; u < 4; u += 0.05) { const p = hearth.at(side * u, wall); if (Math.abs(p.x) > hw - 0.02 || Math.abs(p.z) > hd - 0.02) return u; }
        return Infinity;
      })();
      const onCorner = cornerAt < CHIMNEY_STACK + 0.6 && hearth.wall !== 'back';
      const facing = onCorner ? hearth.yaw - side * Math.PI / 2 : hearth.yaw;
      const point = onCorner ? (u: number) => hearth.at(side * (cornerAt - 0.07), u) : (u: number) => hearth.at(side * u, wall);
      const start = onCorner ? CHIMNEY_STACK + 0.3 : CHIMNEY_STACK + 0.16;
      // A side wall's hearth: away from its corner, its window stands just past the breast.
      if (!onCorner && hearth.wall !== 'back') continue;
      const row = [...rows[i]!];
      while (row.length) {
        const width = row.reduce((t, k) => t + HUNG_W[k] + 0.06, 0.08), ends = [point(start), point(start + width)];
        const rect = { x0: Math.min(ends[0]!.x, ends[1]!.x) - 0.04, x1: Math.max(ends[0]!.x, ends[1]!.x) + 0.04, z0: Math.min(ends[0]!.z, ends[1]!.z) - 0.04, z1: Math.max(ends[0]!.z, ends[1]!.z) + 0.04 };
        const inside = ends.every((e) => Math.abs(e.x) < hw - 0.03 && Math.abs(e.z) < hd - 0.03);
        if (!inside || glass.some((o) => near(rect, o, 0)) || doorway.some((o) => near(rect, o)) || tall.some((o) => near(rect, o, 0)) || taken.some((o) => near(rect, o, 0.05))) { row.pop(); continue; }
        taken.push(rect);
        out.push({ room, piece: 'rail', ...point(start + width / 2), y: HEARTH_RAIL_Y, yaw: facing, size: [width, 0.08] });
        let t = 0.07;
        for (const kind of row) {
          out.push({ room, piece: 'hung', hung: kind, ...point(start + t + HUNG_W[kind] / 2), y: HEARTH_RAIL_Y - 0.005, yaw: facing });
          t += HUNG_W[kind] + 0.06;
        }
        break;
      }
    }
  }

  // A140: each trade's own wall, where the room's views take it in. The woodcutter's saw and axes on pegs over his
  // workbench; the hunter's bows and quiver on a rack and a pelt on the wall his first view looks at.
  const trade = TRADE_WALL[household];
  if (trade) {
    const bench = placed.find((p) => p.piece === 'workbench');
    const clear = (r: Rect, gap: number) => !windows.some((o) => near(r, o, -0.01)) && !always.some((o) => near(r, o)) && !tall.some((o) => near(r, o)) && !taken.some((o) => near(r, o, gap));
    for (const whole of trade.rails) {
      // Shortened a tool at a time until it finds a free stretch of wall.
      const row = [...whole];
      let width = 0, spot: ReturnType<typeof wallSpot> = null;
      while (row.length) {
        width = row.reduce((t, k) => t + HUNG_W[k] + 0.06, 0.08);
        spot = wallSpot(hw, hd, width, (r) => clear(r, 0.12), trade.near === 'workbench' && bench ? bench : null, 0.05, 0, trade.walls, 0.1);
        if (spot) break;
        row.splice(row.length - 2, 1);
      }
      if (!spot) continue;
      taken.push(spot.rect);
      out.push({ room, piece: 'rail', x: spot.x, z: spot.z, y: RAIL_Y, yaw: spot.yaw, size: [width, 0.08] });
      const c = Math.cos(spot.yaw), s = Math.sin(spot.yaw);
      let t = -width / 2 + 0.07;
      for (const kind of row) {
        const along = t + HUNG_W[kind] / 2;
        out.push({ room, piece: 'hung', hung: kind, x: spot.x + along * c, z: spot.z - along * s, y: RAIL_Y - 0.005, yaw: spot.yaw });
        t += HUNG_W[kind] + 0.06;
      }
    }
    if (trade.pelt) {
      // Hung high, over whatever low thing stands before it (a bed, a chest): 0.72 m across.
      const spot = wallSpot(hw, hd, 0.72, (r) => clear(r, 0.1), null, 0.16, 0, trade.walls, 0.1);
      if (spot) { taken.push(spot.rect); out.push({ room, piece: 'pelt', x: spot.x, z: spot.z, y: 1.3, yaw: spot.yaw, scale: 0.6 }); }
    }
  }

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

  // Peg rails along the walls (A136), hung with the household's pans, tools, baskets and onions: the kitchen's by the
  // hearth, the next wherever a wall is free. They keep above the wainscot, clear of windows, shelves and anything tall.
  const unhung: HungKind[] = [];
  for (const [n, row] of (RAILS[household] ?? []).entries()) {
    const width = row.reduce((t, k) => t + HUNG_W[k] + 0.06, 0.08);
    const spot = wallSpot(hw, hd, width, (r) => !windows.some((o) => near(r, o)) && !always.some((o) => near(r, o))
      && !tall.some((o) => near(r, o)) && !taken.some((o) => near(r, o, 0.12)), n === 0 && hearth ? hearth.stack : null, 0.05, 0,
      ['back', 'left', 'right', 'front'], 0.1);
    if (!spot) { unhung.push(...row); continue; }
    taken.push(spot.rect);
    out.push({ room, piece: 'rail', x: spot.x, z: spot.z, y: RAIL_Y, yaw: spot.yaw, size: [width, 0.08] });
    const c = Math.cos(spot.yaw), s = Math.sin(spot.yaw);
    let t = -width / 2 + 0.07;
    for (const kind of row) {
      const along = t + HUNG_W[kind] / 2;
      out.push({ room, piece: 'hung', hung: kind, x: spot.x + along * c, z: spot.z - along * s, y: RAIL_Y - 0.005, yaw: spot.yaw });
      t += HUNG_W[kind] + 0.06;
    }
  }

  // What finds no free wall hangs from the joists instead, in a row across the room near the hearth (never over the
  // fire) or its middle: pans, baskets, onions and tools hung from the beams.
  if (unhung.length) {
    const joists = joistsOf(room), near0 = hearth ? hearth.before(1.6) : { x: 0, z: 0 };
    const order = [...joists].sort((a, b) => Math.abs(a - near0.z) - Math.abs(b - near0.z));
    let k = 0;
    for (const z of order) {
      for (let x = -hw + 0.5; x <= hw - 0.5 && k < unhung.length; x += 0.42) {
        if (hearth && Math.hypot(x - hearth.stack.x, z - hearth.stack.z) < 1.4) continue;
        if (always.some((o) => x > o.x0 - 0.2 && x < o.x1 + 0.2 && z > o.z0 - 0.2 && z < o.z1 + 0.2)) continue;
        out.push({ room, piece: 'hung', hung: unhung[k]!, x: x + wobble(room, 600 + k, -0.06, 0.06), z, y: room.wallTop - room.floorTop - 0.16, yaw: wobble(room, 700 + k, 0, 6.28) });
        k++;
      }
      if (k >= unhung.length) break;
    }
  }

  // Onions and a bunch of herbs drying from the joist nearest the front of the hearth (A136), either side of the fire's
  // light, where the room's usual views take them in.
  if (hearth && room.building.kind !== 'bakery') {
    const joists = joistsOf(room);
    for (const [i, side] of [-1, 1].entries()) {
      const p = hearth.at(side * 0.95, CHIMNEY_STACK + 1.25), z = joists.reduce((b, j) => (Math.abs(j - p.z) < Math.abs(b - p.z) ? j : b), joists[0]!);
      if (Math.abs(p.x) > hw - 0.25 || Math.hypot(p.x - hearth.stack.x, z - hearth.stack.z) < 1.0) continue;
      out.push(i === 0 ? { room, piece: 'hung', hung: 'onions', x: p.x, z, y: room.wallTop - room.floorTop - 0.2, yaw: hearth.yaw }
        : { room, piece: 'herbs', x: p.x, z, y: room.wallTop - room.floorTop - 0.86, yaw: hearth.yaw + 0.7, scale: 0.85 });
    }
  }

  // Tools on the window walls (A136): a short peg rail under a window's sill where nothing stands before it.
  const tools = WINDOW_TOOLS[household] ?? [];
  let tool = 0;
  for (const w of windows) {
    if (tool >= tools.length) break;
    const front = { x0: w.x0 - 0.1, x1: w.x1 + 0.1, z0: w.z0 - 0.1, z1: w.z1 + 0.1 };
    if (pieces.some((o) => near(front, o, 0.05)) || taken.some((o) => near(w, o, 0))) continue;
    const wall: Wall = w.z0 <= -hd + 0.01 ? 'back' : w.z1 >= hd - 0.01 ? 'front' : w.x0 <= -hw + 0.01 ? 'left' : 'right';
    const yaw = wall === 'back' ? 0 : wall === 'front' ? Math.PI : wall === 'left' ? Math.PI / 2 : -Math.PI / 2;
    const mx = (w.x0 + w.x1) / 2, mz = (w.z0 + w.z1) / 2;
    const x = wall === 'left' ? -hw + 0.05 : wall === 'right' ? hw - 0.05 : mx, z = wall === 'back' ? -hd + 0.05 : wall === 'front' ? hd - 0.05 : mz;
    const pair = tools.slice(tool, tool + 2), width = pair.reduce((t, k) => t + HUNG_W[k] + 0.06, 0.08);
    tool += pair.length;
    taken.push(w);
    out.push({ room, piece: 'rail', x, z, y: WINDOW_RAIL_Y, yaw, size: [width, 0.08] });
    const c = Math.cos(yaw), s = Math.sin(yaw);
    let t = -width / 2 + 0.07;
    for (const kind of pair) {
      const along = t + HUNG_W[kind] / 2;
      out.push({ room, piece: 'hung', hung: kind, x: x + along * c, z: z - along * s, y: WINDOW_RAIL_Y - 0.005, yaw });
      t += HUNG_W[kind] + 0.06;
    }
  }

  // Sacks and baskets stood against a wall (A136), clear of every piece and the way in.
  const stores = STORES[household];
  if (stores) {
    const width = stores.length * 0.4;
    const spot = wallSpot(hw, hd, width, (r) => !always.some((o) => near(r, o)) && !pieces.some((o) => near(r, o, 0.08))
      && !taken.some((o) => near(r, o, 0.15)) && !out.some((d) => d.piece === 'firewood' && Math.hypot(d.x - (r.x0 + r.x1) / 2, d.z - (r.z0 + r.z1) / 2) < width / 2 + 0.45),
      null, 0.24, 1, ['back', 'left', 'right', 'front'], 0.1);
    if (spot) {
      taken.push(spot.rect);
      const c = Math.cos(spot.yaw), s = Math.sin(spot.yaw);
      for (const [i, kind] of stores.entries()) {
        const along = -width / 2 + (i + 0.5) * 0.4, lz = (i % 2) * 0.05;
        out.push({ room, piece: 'small', kind, x: spot.x + along * c + lz * s, z: spot.z - along * s + lz * c, y: 0, yaw: spot.yaw + i * 0.9, scale: wobble(room, 500 + i, 0.92, 1.08) });
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
export const DRESSING_MODELS: readonly Exclude<DressingId, 'rug' | 'board' | 'small' | 'rail' | 'hung' | 'firewood'>[] = ['bread', 'jug', 'candle', 'pots', 'cauldron', 'herbs', 'antlers', 'pelt'];
export type { PieceId };
