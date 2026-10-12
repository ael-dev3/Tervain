import type { BuildingSpec } from '../world/layout';
import { mulberry32 } from '../world/noise';
import { houseYard, type YardProp } from '../world/houseYards';
import { hash3, mulc, rgb } from './buildKit';
import type { Region } from './regions';
import { TINT, barrel, jitterTone, sack, woodpile, type Rnd } from './structures';

/**
 * How each village house looks from outside (A132), so the six read as six homes and not one house six times: the
 * paint of shutters and door, a stone plinth course, the eaves' reach, the chimney, a hood over the door, a dormer, a
 * hipped roof. Footprints, doors, windows and rooms are untouched; everything here is drawn on the house's own random
 * sequence (seeded from where it stands), after the shell, so the shell's own sequence is as it was.
 */
export interface HouseLook {
  shutter: number;
  door: number;
  /** Height of a dressed-stone course along the foot of the walls (0: none). */
  plinth: number;
  ohx: number;
  ohz: number;
  chimneyW: number;
  /** Extra height of the chimney above the usual. */
  chimneyUp: number;
  hood: boolean;
  dormer: boolean;
  roof?: 'hip';
  antlers?: boolean;
}

/** Muted earth paints, as a village would have: madder, ochre, verdigris, woad, umber. */
const PAINT = { madder: 0xc08a78, ochre: 0xd2b880, sage: 0xa8b494, woad: 0x9ca8b4, umber: 0xb09078, oxblood: 0xa87468, natural: 0xe6dccb };

export const HOUSE_LOOKS: Record<string, HouseLook> = {
  house_a: { shutter: PAINT.sage, door: PAINT.madder, plinth: 0.45, ohx: 0.55, ohz: 0.6, chimneyW: 0.8, chimneyUp: 0, hood: false, dormer: false },
  house_b: { shutter: PAINT.umber, door: PAINT.natural, plinth: 0, ohx: 0.75, ohz: 0.78, chimneyW: 0.95, chimneyUp: 0.35, hood: false, dormer: true },
  house_c: { shutter: PAINT.sage, door: PAINT.ochre, plinth: 0.3, ohx: 0.4, ohz: 0.55, chimneyW: 0.66, chimneyUp: 0.2, hood: true, dormer: false },
  house_d: { shutter: PAINT.oxblood, door: PAINT.umber, plinth: 0.62, ohx: 0.6, ohz: 0.6, chimneyW: 0.82, chimneyUp: 0.1, hood: false, dormer: false, roof: 'hip', antlers: true },
  house_e: { shutter: PAINT.woad, door: PAINT.woad, plinth: 0, ohx: 0.35, ohz: 0.62, chimneyW: 0.88, chimneyUp: 0, hood: true, dormer: true },
  house_f: { shutter: PAINT.ochre, door: PAINT.oxblood, plinth: 0.7, ohx: 0.5, ohz: 0.68, chimneyW: 0.9, chimneyUp: 0.5, hood: true, dormer: false },
};

export const lookOf = (b: BuildingSpec): HouseLook | undefined => (b.kind === 'house' ? HOUSE_LOOKS[b.id] : undefined);

/** The house's own sequence for everything drawn here: the same house always looks the same. */
export const lookRnd = (b: BuildingSpec): Rnd => mulberry32(Math.floor(hash3(b.x, b.z, 132) * 1e9));

const tone = (hex: number, r: Rnd, j = 0.1) => jitterTone(hex, r, j);

/** A dressed-stone course along the foot of the walls, broken by the doorway. */
export function plinthCourse(R: Region, r: Rnd, b: BuildingSpec, y0: number, top: number, door: { x0: number; x1: number }) {
  const hw = b.w / 2, hd = b.d / 2, o = 0.07, y = y0 - 0.06, y1 = y0 + top;
  const c = () => tone(TINT.stone, r, 0.08);
  const opts = { jit: 0.06, amp: 0.03, sub: 1.4 };
  R.stone.bx(-hw - o, y, hd - 0.02, door.x0 - 0.12, y1, hd + o, c(), opts);
  R.stone.bx(door.x1 + 0.12, y, hd - 0.02, hw + o, y1, hd + o, c(), opts);
  R.stone.bx(-hw - o, y, -hd - o, hw + o, y1, -hd + 0.02, c(), opts);
  for (const s of [-1, 1]) R.stone.bx(s * hw - 0.02 * s, y, -hd, s * (hw + o), y1, hd, c(), opts);
  // A bevelled cap.
  const cap = () => tone(TINT.stoneDark, r, 0.06);
  R.stone.bx(-hw - o - 0.02, y1, hd - 0.02, door.x0 - 0.12, y1 + 0.06, hd + o + 0.03, cap(), { jit: 0.04, amp: 0.02 });
  R.stone.bx(door.x1 + 0.12, y1, hd - 0.02, hw + o + 0.02, y1 + 0.06, hd + o + 0.03, cap(), { jit: 0.04, amp: 0.02 });
  R.stone.bx(-hw - o - 0.02, y1, -hd - o - 0.03, hw + o + 0.02, y1 + 0.06, -hd + 0.02, cap(), { jit: 0.04, amp: 0.02 });
  for (const s of [-1, 1]) R.stone.bx(s * hw - 0.02 * s, y1, -hd, s * (hw + o + 0.03), y1 + 0.06, hd, cap(), { jit: 0.04, amp: 0.02 });
}

/** A shingled hood over the door on two carved brackets (no posts: the way in stays open). */
export function doorHood(R: Region, r: Rnd, b: BuildingSpec, doorX: number, y: number) {
  const hd = b.d / 2, half = 0.82, reach = 0.85, drop = 0.32;
  const dark = mulc(rgb(TINT.woodDark), 1.5);
  for (const s of [-1, 1]) {
    const x = doorX + s * (half - 0.12);
    R.timber.bx(x - 0.06, y - 0.05, hd, x + 0.06, y + 0.1, hd + reach - 0.05, dark, { grain: 'z', jit: 0.03 });
    R.timber.rod(x, y - 0.55, hd + 0.04, x, y - 0.02, hd + reach - 0.22, 0.05, 4, dark, { jit: 0.02 });
  }
  R.ctx.push(doorX, y + 0.1, hd, 0, -Math.atan2(drop, reach));
  const n = 7;
  for (let i = 0; i < n; i++) {
    const z = (i + 0.5) * (reach + 0.1) / n;
    R.planks.bx(-half - 0.05, 0.02 + (n - i) * 0.012, z - 0.1, half + 0.05, 0.06 + (n - i) * 0.012, z + 0.1, tone(0x84715a, r, 0.12), { grain: 'z', jit: 0.08, amp: 0.02 });
  }
  R.planks.bx(-half, -0.04, 0, half, 0.02, reach + 0.1, tone(TINT.woodDark, r), { grain: 'x', jit: 0.04 });
  R.ctx.pop();
}

/**
 * A small gabled dormer on the front slope of a gable roof: its cheeks and face rise from inside the roof (the room's
 * ceiling is at the wall top, so nothing of it shows inside), a shuttered window in its face, its own little roof.
 */
export function dormer(R: Region, r: Rnd, b: BuildingSpec, x: number, wallTop: number, roof: { pitch: number; halfSpan: number }, style: 'thatch' | 'planks', roofTint: number, wallTint: 'plaster' | 'planks') {
  const tan = Math.tan(roof.pitch), ey = wallTop - 0.06;
  const zf = b.d / 2 - 0.35, top = wallTop + 1.55 + (style === 'thatch' ? 0.25 : 0);
  const zb = Math.min(zf - 0.7, roof.halfSpan - (top + 0.15 - ey) / tan);
  const hw = 0.72;
  const wall = wallTint === 'plaster' ? R.plaster : R.planks;
  const wt = tone(wallTint === 'plaster' ? TINT.plaster : TINT.wood, r, 0.05);
  // Face and cheeks, from inside the roof up to the dormer's eaves.
  wall.bx(x - hw, wallTop + 0.04, zf - 0.12, x + hw, top, zf, wt, { jit: 0.03, amp: 0.03, grain: 'x' });
  for (const s of [-1, 1]) wall.bx(x + s * hw - (s > 0 ? 0.12 : 0), wallTop + 0.04, zb, x + s * hw + (s < 0 ? 0.12 : 0), top, zf, wt, { jit: 0.03, amp: 0.03 });
  // Gable triangle over the face.
  const rise = (hw + 0.2) * 0.75;
  R.ctx.push(x, top, zf - 0.06);
  wall.prism([[-hw, 0], [hw, 0], [0, rise]], -0.06, 0.06, wt, { jit: 0.03, amp: 0.05 });
  R.ctx.pop();
  // A small window with shutters, its frame and sill.
  const dark = mulc(rgb(TINT.woodDark), 1.55);
  const wy = top - 0.95;
  R.vc.bx(x - 0.3, wy, zf - 0.02, x + 0.3, wy + 0.6, zf + 0.005, 0x1a1712, { jit: 0, amp: 0 });
  R.timber.bx(x - 0.4, wy - 0.1, zf - 0.02, x + 0.4, wy, zf + 0.1, dark, { jit: 0.04 });
  R.timber.bx(x - 0.4, wy + 0.6, zf - 0.02, x + 0.4, wy + 0.68, zf + 0.07, dark, { jit: 0.04 });
  for (const s of [-1, 1]) R.timber.bx(x + s * 0.3 - 0.04, wy, zf - 0.02, x + s * 0.3 + 0.04, wy + 0.6, zf + 0.07, dark, { jit: 0.04 });
  R.timber.bx(x - 0.02, wy, zf, x + 0.02, wy + 0.6, zf + 0.05, dark, { jit: 0.04 });
  // Its roof: two planes from a ridge running back into the main roof, reaching a little past the face.
  const pitch = Math.atan2(rise, hw), oh = 0.2, len = zf + 0.28 - (zb - 0.3);
  const S = (hw + oh) / Math.cos(pitch), mid = (zf + 0.28 + zb - 0.3) / 2;
  const B = style === 'thatch' ? R.thatch : R.planks;
  for (const s of [-1, 1]) {
    R.ctx.push(x + s * (hw + oh) / 2, top + rise / 2 - oh * Math.tan(pitch) / 2 + 0.06, mid, 0, 0, s * pitch);
    B.box(S, style === 'thatch' ? 0.2 : 0.08, len, 0, -0.04, 0, tone(roofTint, r, 0.06), { jit: 0.06, amp: style === 'thatch' ? 0.05 : 0.02, grain: 'z' });
    R.ctx.pop();
  }
  R.timber.rod(x, top + rise + 0.08, zf + 0.3, x, top + rise + 0.08, zb - 0.2, 0.07, 4, dark, { jit: 0.02 });
}

/** Antlers over the hunter's door, on a small board. */
export function antlers(R: Region, r: Rnd, x: number, y: number, z: number, k = 0.7) {
  const bone = 0xd8ccb0;
  R.planks.box(0.42 * k, 0.34 * k, 0.05, x, y - 0.05 * k, z, tone(TINT.woodDark, r), { grain: 'y', jit: 0.05 });
  R.vc.blob(0.11 * k, 0.1 * k, 0.1 * k, x, y + 0.13 * k, z + 0.07, bone, { seg: 6, rings: 3, lump: 0.08, seed: 3, smooth: true });
  for (const s of [-1, 1]) {
    const pts: [number, number, number][] = [[0.08, 0.17, 0.1], [0.35, 0.32, 0.16], [0.52, 0.62, 0.12], [0.48, 0.92, 0.06]].map(([a, b, c]) => [x + s * a! * k, y + b! * k, z + c!]);
    for (let i = 0; i < pts.length - 1; i++) R.vc.rod(...pts[i]!, ...pts[i + 1]!, (0.035 - i * 0.008) * k, 4, bone, { jit: 0.02 });
    for (const [i, len] of [[1, 0.26], [2, 0.22]] as const) {
      const p = pts[i]!;
      R.vc.rod(...p, p[0] - s * 0.06 * k, p[1] + len * k, p[2] + 0.04, 0.018 * k, 3, bone, { jit: 0.02 });
    }
  }
}

// ---------------------------------------------------------------------------------------------------------- yards

const post = (R: Region, r: Rnd, x: number, z: number, h: number, rad = 0.065) =>
  R.timber.rod(x + (r() - 0.5) * 0.03, 0, z, x, h, z + (r() - 0.5) * 0.03, rad, 4, tone(TINT.woodDark, r, 0.1), { jit: 0.04 });

/** A wattle or rail fence run along local x, from -hw to hw. */
function fenceRun(R: Region, r: Rnd, hw: number, h: number, rails = 3) {
  const n = Math.max(1, Math.round((hw * 2) / 1.1));
  for (let i = 0; i <= n; i++) post(R, r, -hw + (i * 2 * hw) / n, 0, h);
  for (let k = 0; k < rails; k++) {
    const y = 0.22 + (k * (h - 0.32)) / Math.max(1, rails - 1);
    R.bark.rod(-hw - 0.05, y + (r() - 0.5) * 0.05, 0.05, hw + 0.05, y + (r() - 0.5) * 0.05, 0.05, 0.035, 4, tone(0xc8b8a0, r, 0.15), { jit: 0.04 });
  }
}

function hangingCloth(R: Region, r: Rnd, x: number, y: number, z: number, w: number, h: number, hex: number) {
  R.cloth.box(w, h, 0.025, x, y - h, z, tone(hex, r, 0.06), { rz: (r() - 0.5) * 0.05, jit: 0.05, amp: 0.03 });
}

/** One yard prop in its own frame (origin on the ground at its centre, local x along its length). */
function drawYardProp(R: Region, r: Rnd, p: YardProp, all: YardProp[]) {
  switch (p.kind) {
    case 'bench': {
      R.planks.bx(-p.hw, p.h - 0.07, -p.hd, p.hw, p.h, p.hd, tone(TINT.wood, r), { grain: 'x', jit: 0.06 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) R.timber.bx(sx * (p.hw - 0.12) - 0.04, 0, sz * (p.hd - 0.06) - 0.04, sx * (p.hw - 0.12) + 0.04, p.h - 0.07, sz * (p.hd - 0.06) + 0.04, tone(TINT.woodDark, r), { grain: 'y', jit: 0.05 });
      // Two baskets of yarn on it and a skein hung over its end.
      for (const [bx, hex] of [[-0.42, 0xb88070], [0.3, 0x98a8b8]] as const) {
        R.bark.lathe([0.13, 0, 0.18, 0.2, 0.19, 0.22, 0.17, 0.22, 0.12, 0.03], 8, bx, p.h, 0, tone(0xc8b090, r, 0.1), { jit: 0.05 });
        for (const [dx, dz] of [[-0.06, 0.03], [0.06, -0.02], [0, 0.07]]) R.cloth.blob(0.075, 0.07, 0.075, bx + dx!, p.h + 0.2, dz!, tone(hex, r, 0.12), { seg: 6, rings: 3, lump: 0.06, seed: Math.floor(r() * 100), smooth: true });
      }
      R.cloth.box(0.1, 0.32, 0.04, p.hw - 0.08, p.h - 0.34, p.hd + 0.02, tone(0xd8c888, r), { jit: 0.05 });
      break;
    }
    case 'clothPost': break; // drawn with its line
    case 'clothLine': {
      const ends = all.filter((q) => q.kind === 'clothPost');
      for (const e of ends) {
        // Into this prop's frame: the line runs along local x (the yard's z, turned by its yaw of π/2).
        const lx = -(e.z - p.z) * (p.yaw ? 1 : 0) + (p.yaw ? 0 : e.x - p.x);
        post(R, r, lx, 0, 2.05, 0.07);
        R.timber.bx(lx - 0.04, 1.86, -0.18, lx + 0.04, 1.94, 0.18, tone(TINT.woodDark, r), { grain: 'z', jit: 0.04 });
      }
      R.cloth.rod(-p.hw - 0.2, 1.93, 0.12, p.hw + 0.2, 1.88, 0.12, 0.012, 3, tone(TINT.rope, r));
      let x = -p.hw + 0.15;
      for (const [w, h, hex] of [[0.8, 1.0, 0xc08a78], [0.6, 0.75, 0xd2c088], [0.9, 1.05, 0x8ca0b8], [0.55, 0.8, 0xd8ccb0]] as const) {
        hangingCloth(R, r, x + w / 2, 1.92, 0.12, w, h, hex);
        x += w + 0.12;
      }
      break;
    }
    case 'logStack': {
      woodpile(R, r, 0, 0, 0, p.hw * 2 - 0.1, 4);
      for (const s of [-1, 1]) for (const z of [-0.3, 0.3]) post(R, r, s * p.hw, z, p.h + 0.1, 0.06);
      break;
    }
    case 'chopBlock': {
      R.bark.lathe([0.3, 0, 0.31, 0.25, 0.29, p.h - 0.1, 0, p.h - 0.1], 9, 0, 0, 0, tone(0xcfc0a8, r), { jit: 0.06 });
      R.planks.lathe([0.27, 0, 0.27, 0.012, 0, 0.012], 9, 0, p.h - 0.1, 0, tone(TINT.woodPale, r), { jit: 0.04 });
      // The axe, its bit in the block and its haft leaning out.
      R.metal.box(0.04, 0.16, 0.2, 0.05, p.h - 0.16, 0, TINT.iron, { rz: 0.5, jit: 0.04 });
      R.timber.rod(0.08, p.h - 0.02, 0, 0.62, p.h + 0.22, 0.05, 0.025, 4, tone(TINT.wood, r), { jit: 0.02 });
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + r();
        R.bark.rod(Math.cos(a) * 0.5, 0.06, Math.sin(a) * 0.5, Math.cos(a) * 0.5 + Math.sin(a) * 0.3, 0.07, Math.sin(a) * 0.5 - Math.cos(a) * 0.3, 0.06, 4, tone(0xd8cbb8, r, 0.2));
      }
      break;
    }
    case 'sawhorse': {
      for (const s of [-1, 1]) {
        R.timber.rod(s * (p.hw - 0.15), 0, -0.3, s * (p.hw - 0.15), p.h - 0.1, 0.25, 0.045, 4, tone(TINT.woodDark, r));
        R.timber.rod(s * (p.hw - 0.15), 0, 0.3, s * (p.hw - 0.15), p.h - 0.1, -0.25, 0.045, 4, tone(TINT.woodDark, r));
      }
      R.timber.rod(-p.hw + 0.1, 0.3, 0, p.hw - 0.1, 0.3, 0, 0.035, 4, tone(TINT.woodDark, r));
      R.bark.rod(-p.hw - 0.2, p.h - 0.02, 0, p.hw + 0.25, p.h + 0.02, 0, 0.15, 7, tone(0xd0c0a8, r));
      break;
    }
    case 'herbBed': {
      R.vc.bx(-p.hw + 0.05, 0, -p.hd + 0.05, p.hw - 0.05, 0.1, p.hd - 0.05, 0x3a2c20, { jit: 0.06, amp: 0.02 });
      // Wattle all round.
      for (const [len, x, z, yaw] of [[p.hd, -p.hw, 0, Math.PI / 2], [p.hd, p.hw, 0, Math.PI / 2], [p.hw, 0, -p.hd, 0], [p.hw, 0, p.hd, 0]] as const) {
        R.ctx.push(x, 0, z, yaw);
        fenceRun(R, r, len, p.h, 2);
        R.ctx.pop();
      }
      const greens = [0x3a5228, 0x46592e, 0x52603a, 0x3c4c30, 0x5a5a38];
      for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) {
        const x = -p.hw + 0.45 + i * (p.hw * 2 - 0.9) + (r() - 0.5) * 0.1, z = -p.hd + 0.4 + j * ((p.hd * 2 - 0.8) / 3) + (r() - 0.5) * 0.1;
        const s = 0.17 + r() * 0.08;
        R.vc.blob(s, s * (0.8 + r() * 0.6), s, x, 0.12 + s * 0.5, z, greens[(i * 5 + j) % greens.length]!, { seg: 6, rings: 3, lump: 0.35, seed: i * 7 + j, smooth: true });
      }
      break;
    }
    case 'herbRack': {
      for (const s of [-1, 1]) {
        R.timber.rod(s * p.hw, 0, -0.28, s * p.hw, p.h, 0, 0.045, 4, tone(TINT.woodDark, r));
        R.timber.rod(s * p.hw, 0, 0.28, s * p.hw, p.h, 0, 0.045, 4, tone(TINT.woodDark, r));
      }
      for (const y of [p.h - 0.05, p.h - 0.6]) {
        const z = y < p.h - 0.1 ? 0.13 : 0;
        R.timber.rod(-p.hw - 0.08, y, z, p.hw + 0.08, y, z, 0.03, 4, tone(TINT.wood, r));
        const n = 6;
        for (let i = 0; i < n; i++) {
          const x = -p.hw + 0.18 + (i * (p.hw * 2 - 0.36)) / (n - 1);
          const hex = [0x6a7a48, 0x8a8a58, 0x5d6e40, 0x9a8a60][(i + (z ? 1 : 0)) % 4]!;
          R.vc.blob(0.07, 0.18, 0.07, x, y - 0.2, z, hex, { seg: 5, rings: 3, lump: 0.3, seed: i + (z ? 9 : 0), smooth: false });
          R.cloth.rod(x, y - 0.02, z, x, y - 0.06, z, 0.03, 3, tone(TINT.rope, r));
        }
      }
      break;
    }
    case 'skeps': {
      R.planks.bx(-p.hw, 0.42, -p.hd, p.hw, 0.48, p.hd, tone(TINT.wood, r), { grain: 'x', jit: 0.05 });
      for (const s of [-1, 1]) R.timber.bx(s * (p.hw - 0.12) - 0.05, 0, -0.05, s * (p.hw - 0.12) + 0.05, 0.42, 0.05, tone(TINT.woodDark, r), { jit: 0.05 });
      for (const x of [-0.28, 0.28]) {
        R.thatch.lathe([0.24, 0, 0.25, 0.12, 0.23, 0.26, 0.17, 0.38, 0.08, 0.45, 0, 0.47], 9, x, 0.48, 0, tone(0xd8c08a, r, 0.06), { jit: 0.04 });
        R.vc.box(0.07, 0.05, 0.03, x, 0.49, 0.24, 0x16120e, { jit: 0 });
      }
      break;
    }
    case 'hideFrame': {
      const hw = p.hw, h = p.h;
      const frame = () => tone(TINT.woodDark, r);
      for (const s of [-1, 1]) R.timber.rod(s * hw, 0, -0.02, s * (hw - 0.06), h, 0.02, 0.05, 4, frame());
      for (const y of [0.35, h - 0.12]) R.timber.rod(-hw - 0.08, y, 0, hw + 0.08, y, 0, 0.045, 4, frame());
      for (const s of [-1, 1]) R.timber.rod(s * (hw - 0.1), 0, -0.65, s * (hw - 0.1), h - 0.3, -0.02, 0.04, 4, frame());
      // The hide, stretched, laced to the frame.
      R.cloth.prism([[-0.55, 0.5], [0.5, 0.48], [0.62, 0.9], [0.5, 1.45], [0.05, 1.62], [-0.48, 1.48], [-0.64, 1.0]], -0.012, 0.012, tone(0xc8a080, r, 0.06), { jit: 0.04, amp: 0.02 });
      for (const [ax, ay, bx, by] of [[-0.6, 0.6, -hw, 0.62], [-0.6, 1.3, -hw, 1.28], [0.58, 0.62, hw, 0.6], [0.58, 1.3, hw - 0.04, 1.32], [0, 1.6, 0, h - 0.12], [0, 0.48, 0, 0.35]] as const) {
        R.cloth.rod(ax, ay, 0.015, bx, by, 0.015, 0.01, 3, tone(TINT.rope, r));
      }
      break;
    }
    case 'meatRack': {
      for (const s of [-1, 1]) {
        R.timber.rod(s * p.hw, 0, -0.4, s * p.hw, p.h, 0, 0.045, 4, tone(TINT.woodDark, r));
        R.timber.rod(s * p.hw, 0, 0.4, s * p.hw, p.h, 0, 0.045, 4, tone(TINT.woodDark, r));
      }
      R.timber.rod(-p.hw - 0.12, p.h - 0.05, 0, p.hw + 0.12, p.h - 0.05, 0, 0.04, 4, tone(TINT.wood, r));
      for (let i = 0; i < 6; i++) {
        const x = -p.hw + 0.2 + (i * (p.hw * 2 - 0.4)) / 5, l = 0.35 + r() * 0.2;
        R.vc.box(0.09, l, 0.035, x, p.h - 0.08 - l, 0, i % 2 ? 0x5a2a20 : 0x6a3424, { jit: 0.1, rz: (r() - 0.5) * 0.1 });
      }
      // The cold stones of the smoking fire under it.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        R.stone.blob(0.1, 0.07, 0.09, Math.cos(a) * 0.32, 0.02, Math.sin(a) * 0.25, tone(TINT.stoneDark, r), { seg: 5, rings: 3, lump: 0.2, seed: i, smooth: true });
      }
      R.vc.box(0.4, 0.02, 0.3, 0, 0.0, 0, 0x16130f, { jit: 0 });
      break;
    }
    case 'fence':
      fenceRun(R, r, p.hw, p.h, 3);
      break;
    case 'hay': {
      R.thatch.box(p.hw * 2, p.h, p.hd * 2, 0, 0, 0, tone(0xe0cc90, r, 0.06), { jit: 0.05, amp: 0.04 });
      for (const x of [-p.hw * 0.45, p.hw * 0.45]) R.cloth.box(0.04, p.h + 0.02, p.hd * 2 + 0.02, x, 0.006, 0, tone(TINT.rope, r), { jit: 0.03 });
      break;
    }
    case 'trough': {
      const c = () => tone(TINT.wood, r);
      R.planks.bx(-p.hw, 0.1, -p.hd, p.hw, 0.18, p.hd, c(), { grain: 'x' });
      for (const s of [-1, 1]) {
        R.planks.bx(-p.hw, 0, s * p.hd - 0.04, p.hw, p.h, s * p.hd + 0.04, c(), { grain: 'x' });
        R.planks.bx(s * p.hw - 0.04, 0, -p.hd, s * p.hw + 0.04, p.h, p.hd, c(), { grain: 'z' });
        R.timber.bx(s * (p.hw - 0.1) - 0.05, 0, -p.hd - 0.06, s * (p.hw - 0.1) + 0.05, 0.12, p.hd + 0.06, tone(TINT.woodDark, r), { grain: 'z' });
      }
      R.vc.bx(-p.hw + 0.04, p.h - 0.1, -p.hd + 0.04, p.hw - 0.04, p.h - 0.08, p.hd - 0.04, 0x2a3530, { jit: 0 });
      break;
    }
    case 'cartWheel': {
      // Leaning against the wall: the wheel's plane is local x/y, tipped back towards the wall (local -z).
      const rad = p.h / 2;
      R.ctx.push(0, 0, 0.05, 0, -0.22);
      const n = 10, c = tone(TINT.woodDark, r, 0.08);
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        R.timber.rod(Math.cos(a0) * rad, rad + Math.sin(a0) * rad, 0, Math.cos(a1) * rad, rad + Math.sin(a1) * rad, 0, 0.045, 4, c, { jit: 0.02 });
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        R.timber.rod(0, rad, 0, Math.cos(a) * rad * 0.95, rad + Math.sin(a) * rad * 0.95, 0, 0.025, 4, c, { jit: 0.02 });
      }
      R.timber.rod(0, rad, -0.12, 0, rad, 0.12, 0.09, 6, c);
      R.ctx.pop();
      break;
    }
    case 'tools': {
      // A rake and a pitchfork leaning on the wall.
      for (const [x, fork] of [[-0.16, false], [0.18, true]] as const) {
        const top = p.h, base = 0;
        R.timber.rod(x, base, 0.25, x + 0.02, top, -0.02, 0.022, 4, tone(TINT.wood, r));
        if (fork) for (const dx of [-0.07, 0, 0.07]) R.metal.rod(x + dx, top - 0.02, -0.02, x + dx * 1.3, top + 0.28, -0.05, 0.01, 3, TINT.iron);
        else {
          R.timber.box(0.42, 0.04, 0.05, x + 0.02, top - 0.02, -0.02, tone(TINT.wood, r));
          for (let i = 0; i < 7; i++) R.timber.rod(x - 0.18 + i * 0.06, top - 0.02, -0.02, x - 0.18 + i * 0.06, top + 0.08, -0.02, 0.008, 3, tone(TINT.woodDark, r));
        }
      }
      break;
    }
    case 'barrelStack': {
      // Two casks lying on a cradle and a third on top of them.
      for (const s of [-1, 1]) R.timber.bx(-p.hw, 0, s * 0.3 - 0.06, p.hw, 0.1, s * 0.3 + 0.06, tone(TINT.woodDark, r), { grain: 'x' });
      for (const [x, y] of [[-0.45, 0.46], [0.45, 0.46], [0, 1.08]] as const) {
        R.ctx.push(x, y, 0, 0, Math.PI / 2);
        barrel(R, r, 0, -0.45, 0, 0.9);
        R.ctx.pop();
      }
      break;
    }
    case 'vat': {
      const rad = p.hw, h = p.h, c = tone(TINT.wood, r);
      const first = R.planks.uv.n;
      R.planks.lathe([0, 0, rad * 0.94, 0, rad, h, rad - 0.06, h, rad * 0.88, 0.12, 0, 0.12], 12, 0, 0, 0, c, { jit: 0.06 });
      for (let i = first; i < R.planks.uv.n; i += 2) {
        const u = R.planks.uv.a[i]!;
        R.planks.uv.a[i] = R.planks.uv.a[i + 1]!;
        R.planks.uv.a[i + 1] = u;
      }
      for (const y of [0.18, h - 0.16]) R.metal.lathe([rad + 0.012, y, rad + 0.014, y + 0.06], 12, 0, 0, 0, TINT.iron, { jit: 0.04 });
      R.vc.lathe([0, h - 0.14, rad - 0.08, h - 0.14], 12, 0, 0, 0, 0x2e2216, { jit: 0 });
      R.timber.rod(-0.2, h - 0.3, 0.1, 0.35, h + 0.7, -0.15, 0.03, 4, tone(TINT.wood, r));
      break;
    }
    case 'sacks':
      sack(R, r, -0.28, 0, 0, 1.05);
      sack(R, r, 0.25, 0, 0.05, 0.95);
      sack(R, r, 0, 0.32, 0, 0.85);
      break;
  }
}

/** Draws a house's yard; `ground` sets a prop on its own terrain (as the building's other outside things are). */
export function drawHouseYard(R: Region, b: BuildingSpec, ground: (author: () => void) => void) {
  const r = mulberry32(Math.floor(hash3(b.x, b.z, 1320) * 1e9));
  const yard = houseYard(b);
  for (const p of yard) {
    if (p.kind === 'clothPost') continue;
    ground(() => {
      R.ctx.push(p.x, 0, p.z, p.yaw);
      drawYardProp(R, r, p, yard);
      R.ctx.pop();
    });
  }
}
