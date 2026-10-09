import * as THREE from 'three';
import { clamp01, fbmField, mixc, pnoise, rnd, sstep, voronoi, type RGB } from './procTex';

/**
 * Surface textures for buildings and props: weathered planks and beams, rubble stone, peeling plaster, straw thatch, broken
 * clay tile, slate and coarse cloth. Each is a tileable albedo (dark, dirty, uneven) plus a normal map from the same height field.
 * The albedo carries the colour; vertex colours only tint it a little so no two walls are quite the same.
 *
 * Since A67 the textures are baked offline at 1024 px (tools/textures/bake-buildings.py) and installed here once loaded
 * (bakedTextures.ts); the procedural generators below are the fallback for any that are missing, and what tests see.
 */

export type TexKey = 'plaster' | 'timber' | 'planks' | 'stone' | 'cobble' | 'tile' | 'thatch' | 'slate' | 'cloth' | 'bark' | 'rock' | 'bronze';
export const TEX_KEYS: readonly TexKey[] = ['plaster', 'timber', 'planks', 'stone', 'cobble', 'tile', 'thatch', 'slate', 'cloth', 'bark', 'rock', 'bronze'];

/** Metres covered by one repeat of each texture. */
export const TILE_M: Record<TexKey, number> = { plaster: 2.2, timber: 1.2, planks: 1.2, stone: 2, cobble: 1.6, tile: 1.1, thatch: 1.1, slate: 1.1, cloth: 0.6, bark: 1.2, rock: 2.6, bronze: 1.2 };

interface Field {
  rgb: Float32Array;
  h: Float32Array;
}

const newField = (n: number): Field => ({ rgb: new Float32Array(n * n * 3), h: new Float32Array(n * n) });
const set = (f: Field, o: number, c: RGB, h: number) => {
  f.rgb[o * 3] = c[0];
  f.rgb[o * 3 + 1] = c[1];
  f.rgb[o * 3 + 2] = c[2];
  f.h[o] = h;
};

function planks(n: number): [Field, number] {
  const f = newField(n);
  // The U axis is long grain. Geometry assigns it along each board/beam rather than around a barrel hoop.
  // Different board widths, occasional butt joints and fibre wear replace six perfectly regular dark stripes.
  const widths = [0.12, 0.19, 0.15, 0.22, 0.14, 0.18];
  const edges = [0];
  for (const width of widths) edges.push(edges[edges.length - 1]! + width);
  const streak = fbmField(n, 2, 78, 3, 301);
  const streak2 = fbmField(n, 4, 38, 2, 302);
  const stain = fbmField(n, 3, 3, 4, 303);
  const fine = fbmField(n, 40, 64, 2, 304);
  for (let j = 0; j < n; j++) {
    const vv = j / n;
    const row = Math.min(widths.length - 1, edges.findIndex((e, k) => k > 0 && vv < e) - 1);
    const width = widths[row]!;
    const v = (vv - edges[row]!) / width;
    const tone = 0.91 + rnd(row * 97, 305) * 0.17;
    const shift = Math.floor(rnd(row * 13, 306) * n);
    for (let i = 0; i < n; i++) {
      const o = j * n + i;
      const gi = (i + shift) % n;
      const g = streak[j * n + gi]! * 0.64 + streak2[j * n + gi]! * 0.36;
      // Thin recess, with a bleached worn shoulder; contrast belongs to actual overlaps, not every grain line.
      const edge = Math.min(v, 1 - v);
      const gap = 1 - sstep(0.0, 0.032, edge);
      const shoulder = sstep(0.022, 0.052, edge) * (1 - sstep(0.052, 0.14, edge));
      const jx = rnd(row, 307);
      const du = Math.min(Math.abs(i / n - jx), 1 - Math.abs(i / n - jx));
      const joint = (1 - sstep(0.0015, 0.005, du)) * (row % 3 === 1 ? 1 : 0);
      const split = (1 - sstep(0.006, 0.021, Math.abs(g - 0.43))) * sstep(0.48, 0.69, stain[o]!);
      let base = mixc([0.15, 0.125, 0.09], [0.47, 0.405, 0.30], clamp01(g * 0.82 + stain[o]! * 0.25));
      base = mixc(base, [0.49, 0.46, 0.37], sstep(0.62, 0.85, g) * 0.38 + shoulder * 0.07);
      const k = tone * (0.93 + fine[o]! * 0.14);
      base = [base[0] * k, base[1] * k, base[2] * k];
      base = mixc(base, [0.09, 0.079, 0.064], clamp01(gap * 0.72 + joint * 0.45 + split * 0.30));
      set(f, o, base, clamp01(0.52 + g * 0.075 - gap * 0.16 - joint * 0.10 - split * 0.08 + shoulder * 0.028));
    }
  }
  // Irregular paired nail heads sit within real board edges, not a repeated dot at every pixel course.
  for (let r = 0; r < widths.length; r++) for (const nx of [0.16, 0.73]) {
    const cx = Math.floor(nx * n + rnd(r, 308) * n * 0.012);
    const cy = Math.floor((edges[r]! + widths[r]! * 0.28) * n);
    const radius = Math.max(1, Math.round(n / 160));
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const o = ((cy + dy + n) % n) * n + ((cx + dx + n) % n);
      set(f, o, [0.095, 0.087, 0.073], 0.65);
    }
  }
  return [f, 1.25];
}

function timber(n: number): [Field, number] {
  const f = newField(n);
  const grain = fbmField(n, 2, 78, 3, 311);
  const grain2 = fbmField(n, 4, 34, 2, 312);
  const stain = fbmField(n, 3, 3, 3, 313);
  const cr = fbmField(n, 2, 26, 2, 314);
  for (let o = 0; o < n * n; o++) {
    const g = grain[o]! * 0.6 + grain2[o]! * 0.4;
    const crack = (1 - sstep(0.006, 0.032, Math.abs(cr[o]! - 0.5))) * sstep(0.24, 0.58, stain[o]!);
    let c = mixc([0.09, 0.078, 0.058], [0.36, 0.32, 0.26], clamp01(g * 0.9 + stain[o]! * 0.28));
    c = mixc(c, [0.4, 0.38, 0.31], sstep(0.64, 0.86, g) * 0.24);
    c = [c[0] * (1 - crack * 0.62), c[1] * (1 - crack * 0.62), c[2] * (1 - crack * 0.62)];
    set(f, o, c, clamp01(0.5 + g * 0.15 - crack * 0.19));
  }
  // knots
  for (let k = 0; k < 4; k++) {
    const cx = Math.floor(rnd(k, 315) * n);
    const cy = Math.floor(rnd(k, 316) * n);
    const r = n * (0.025 + rnd(k, 317) * 0.02);
    for (let y = -r * 2; y <= r * 2; y++) for (let x = -r * 3; x <= r * 3; x++) {
      const d = Math.hypot(x / 2.2, y);
      if (d > r) continue;
      const o = ((cy + Math.floor(y) + n) % n) * n + ((cx + Math.floor(x) + n) % n);
      const t = 1 - d / r;
      f.rgb[o * 3]! *= 1 - 0.55 * t;
      f.rgb[o * 3 + 1]! *= 1 - 0.55 * t;
      f.rgb[o * 3 + 2]! *= 1 - 0.55 * t;
      f.h[o]! += 0.07 * t;
    }
  }
  return [f, 1.65];
}

function plaster(n: number): [Field, number] {
  // Cared-for lime render (A75), as the baked map: trowelled and even, the odd hairline, no peeling, mould or streaks.
  const f = newField(n);
  const low = fbmField(n, 3, 3, 4, 321);
  const mid = fbmField(n, 9, 9, 3, 322);
  const fine = fbmField(n, 60, 60, 2, 323);
  const cr = voronoi(n, 4, 324, 0.95);
  for (let o = 0; o < n * n; o++) {
    const edge = cr.f2[o]! - cr.f1[o]!;
    const crack = (1 - sstep(0.0, 0.006, edge)) * sstep(0.72, 0.86, low[o]!) * sstep(0.5, 0.7, mid[o]!);
    let c = mixc([0.60, 0.565, 0.49], [0.70, 0.665, 0.585], clamp01(low[o]! * 0.6 + fine[o]! * 0.15 + (mid[o]! - 0.5) * 0.5));
    c = [c[0] * (1 - crack * 0.22), c[1] * (1 - crack * 0.22), c[2] * (1 - crack * 0.22)];
    set(f, o, c, clamp01(0.6 + (mid[o]! - 0.5) * 0.06 + fine[o]! * 0.02 - crack * 0.03));
  }
  return [f, 1.2];
}

function stone(n: number): [Field, number] {
  const f = newField(n);
  // Original split rubble, not outlined manufactured brick. Broad angular pieces have unequal heights,
  // muted sandy mortar and planar face variation; real corner/threshold geometry provides the deep shadows.
  const rubble = voronoi(n, 5, 331, 0.98, 7);
  const grit = fbmField(n, 42, 42, 3, 332);
  const low = fbmField(n, 3, 3, 3, 333);
  const splitField = fbmField(n, 9, 13, 2, 334);
  const mineral = fbmField(n, 19, 22, 2, 335);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const o = j * n + i, u = i / n, v = j / n;
    const edge = rubble.f2[o]! - rubble.f1[o]!;
    const jointWidth = 0.014 + pnoise(u, v, 12, 12, 336) * 0.014;
    const mortar = 1 - sstep(jointWidth, jointWidth + 0.057, edge);
    const shoulder = sstep(0.015, 0.045, edge) * (1 - sstep(0.075, 0.18, edge));
    const id = rubble.id[o]!;
    const warm = sstep(0.61, 0.83, id);
    const face = clamp01(0.27 + id * 0.34 + low[o]! * 0.19 + grit[o]! * 0.1);
    let c = mixc([0.295, 0.282, 0.242], [0.57, 0.54, 0.455], face);
    c = mixc(c, [0.49, 0.415, 0.30], warm * 0.23);
    // Broken cleavage follows a face, never a second complete cell grid or dark circular pebble rim.
    const cleavage = (1 - sstep(0.006, 0.024, Math.abs(splitField[o]! - (0.35 + id * 0.18))))
      * sstep(0.64, 0.82, low[o]!) * (1 - mortar);
    const k = 0.96 + mineral[o]! * 0.065 - cleavage * 0.11 + shoulder * 0.06;
    c = [c[0] * k, c[1] * k, c[2] * k];
    c = mixc(c, [0.31, 0.315, 0.235], sstep(0.69, 0.85, low[o]!) * 0.19);
    const mortarColor: RGB = [0.26 + grit[o]! * 0.046, 0.248 + grit[o]! * 0.04, 0.208 + grit[o]! * 0.037];
    c = mixc(c, mortarColor, mortar * 0.91);
    set(f, o, c, clamp01(0.54 + id * 0.035 + mineral[o]! * 0.025 + grit[o]! * 0.018 - mortar * 0.12 - cleavage * 0.025 + shoulder * 0.022));
  }
  return [f, 1.35];
}

function cobble(n: number): [Field, number] {
  const f = newField(n);
  const a = voronoi(n, 12, 341, 0.75);
  const grit = fbmField(n, 40, 40, 3, 342);
  for (let o = 0; o < n * n; o++) {
    const edge = sstep(0.0, 0.2, a.f2[o]! - a.f1[o]!);
    const tone = 0.28 + a.id[o]! * 0.2;
    let c: RGB = [tone * 1.04, tone, tone * 0.86];
    const k = (0.42 + 0.58 * edge) * (0.92 + grit[o]! * 0.15);
    c = [c[0] * k, c[1] * k, c[2] * k];
    set(f, o, c, clamp01(0.43 + edge * 0.19 + (1 - a.f1[o]!) * 0.05));
  }
  return [f, 1.85];
}

function tile(n: number): [Field, number] {
  const f = newField(n);
  const rows = 4;
  const rh = n / rows;
  const streak = fbmField(n, 5, 20, 2, 351);
  const stain = fbmField(n, 4, 4, 3, 352);
  const fine = fbmField(n, 50, 50, 2, 353);
  for (let j = 0; j < n; j++) {
    const row = Math.floor(j / rh);
    const v = (j % rh) / rh;
    const off = (row % 2) * 0.5;
    for (let i = 0; i < n; i++) {
      const o = j * n + i;
      const cols = 5;
      const u = ((i / n) * cols + off) % 1;
      const col = Math.floor((i / n) * cols + off);
      const id = rnd(row * 31 + col, 354);
      const seamX = Math.min(u, 1 - u);
      const seam = 1 - sstep(0.0, 0.06, seamX);
      const lip = sstep(0.75, 1.0, v);
      const shadow = 1 - sstep(0.0, 0.22, v);
      let c = mixc([0.285, 0.162, 0.092], [0.58, 0.354, 0.20], clamp01(id * 0.9 + stain[o]! * 0.4));
      c = mixc(c, [0.18, 0.2, 0.13], sstep(0.68, 0.85, stain[o]!) * 0.5);
      const k = (0.72 + streak[o]! * 0.4 + fine[o]! * 0.2) * (1 - shadow * 0.30) * (1 - seam * 0.31);
      c = [c[0] * k, c[1] * k, c[2] * k];
      if (id > 0.93) c = [c[0] * 0.76, c[1] * 0.76, c[2] * 0.76];
      set(f, o, c, clamp01(0.4 + v * 0.5 - seam * 0.3 + lip * 0.1));
    }
  }
  return [f, 1.25];
}

function thatch(n: number): [Field, number] {
  const f = newField(n);
  const fibre = fbmField(n, 96, 4, 3, 361);
  const fibre2 = fbmField(n, 40, 8, 3, 362);
  const stain = fbmField(n, 4, 4, 3, 363);
  for (let j = 0; j < n; j++) {
    const v = j / n;
    const bind = 1 - sstep(0, 0.012, Math.abs(((v * 4) % 1) - 0.5) - 0.44);
    for (let i = 0; i < n; i++) {
      const o = j * n + i;
      const g = fibre[o]! * 0.6 + fibre2[o]! * 0.4;
      let c = mixc([0.245, 0.182, 0.092], [0.60, 0.485, 0.29], clamp01(g * 1.15 - 0.1 + stain[o]! * 0.25));
      c = mixc(c, [0.15, 0.17, 0.09], sstep(0.66, 0.84, stain[o]!) * 0.5);
      c = mixc(c, [0.12, 0.09, 0.06], bind * 0.34);
      const lap = 1 - sstep(0.04, 0.2, (v * 4) % 1);
      c = [c[0] * (1 - lap * 0.18), c[1] * (1 - lap * 0.18), c[2] * (1 - lap * 0.18)];
      set(f, o, c, clamp01(0.4 + g * 0.24 - bind * 0.09 - lap * 0.08));
    }
  }
  return [f, 1.2];
}

function slate(n: number): [Field, number] {
  const f = newField(n);
  const grit = fbmField(n, 48, 48, 2, 372);
  const lich = fbmField(n, 6, 6, 4, 373);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const o = j * n + i, u = i / n, v = j / n;
    const course = v * 4, row = Math.floor(course), cv = course - row;
    const across = (u * 5 + (row % 2) * 0.5) % 5;
    const col = Math.floor(across), cu = across - col;
    const id = rnd(row * 11 + col, 371);
    const seam = 1 - sstep(0.018, 0.058, Math.min(cu, 1 - cu));
    const lap = 1 - sstep(0.03, 0.24, cv);
    const cleavage = (1 - sstep(0.018, 0.055, Math.abs(cv - (0.36 + id * 0.34 + cu * 0.07)))) * 0.1;
    let c = mixc([0.23, 0.24, 0.225], [0.38, 0.395, 0.355], 0.25 + id * 0.48 + grit[o]! * 0.17);
    c = mixc(c, [0.37, 0.365, 0.245], sstep(0.71, 0.87, lich[o]!) * 0.38);
    const k = 1 - seam * 0.51 - lap * 0.34 - cleavage;
    set(f, o, [c[0] * k, c[1] * k, c[2] * k], clamp01(0.5 + cv * 0.09 - seam * 0.15 - lap * 0.1 + grit[o]! * 0.025 - cleavage * 0.15));
  }
  return [f, 1.75];
}

function cloth(n: number): [Field, number] {
  const f = newField(n);
  const low = fbmField(n, 5, 5, 3, 381);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const o = j * n + i;
      const weave = 0.5 + 0.5 * Math.sin(i * 1.7) * Math.sin(j * 1.7);
      const thread = pnoise(i / n, j / n, 64, 64, 382);
      const c = mixc([0.24, 0.2, 0.15], [0.5, 0.44, 0.34], clamp01(low[o]! * 0.9 + thread * 0.2));
      const k = 0.8 + weave * 0.28;
      set(f, o, [c[0] * k, c[1] * k, c[2] * k], weave);
    }
  }
  return [f, 1.2];
}

function bark(n: number): [Field, number] {
  const f = newField(n);
  const warp = fbmField(n, 4, 6, 3, 391);
  for (let j = 0; j < n; j++) {
    const v = j / n;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const o = j * n + i;
      const w = (warp[o]! - 0.5) * 0.11;
      const fur = 1 - Math.abs(pnoise((u + w) % 1, v, 11, 2, 392) * 2 - 1);
      const ht = sstep(0.15, 0.95, fur);
      set(f, o, mixc([0.09, 0.075, 0.06], [0.3, 0.26, 0.21], ht), ht);
    }
  }
  return [f, 8];
}

function rock(n: number): [Field, number] {
  const f = newField(n);
  const warp = fbmField(n, 3, 3, 3, 401);
  const strata = fbmField(n, 2, 15, 3, 402);
  const grain = fbmField(n, 56, 56, 3, 403);
  const lichenF = fbmField(n, 7, 7, 4, 404);
  const cr = voronoi(n, 6, 405, 0.94, 10);
  const cr2 = voronoi(n, 15, 406, 0.9, 11);
  const coarse = fbmField(n, 17, 21, 3, 407);
  for (let o = 0; o < n * n; o++) {
    const band = clamp01(strata[o]! + (warp[o]! - 0.5) * 0.35);
    const edge = Math.min(cr.f2[o]! - cr.f1[o]!, (cr2.f2[o]! - cr2.f1[o]!) * 1.4);
    const fractured = sstep(0.59, 0.79, warp[o]!);
    const crack = (1 - sstep(0.004, 0.023, edge)) * fractured;
    const lip = sstep(0.012, 0.036, edge) * (1 - sstep(0.036, 0.095, edge)) * fractured;
    const plate = sstep(0.27, 0.73, cr.id[o]!);
    let c = mixc([0.30, 0.29, 0.255], [0.56, 0.54, 0.475], band * 0.58 + plate * 0.17 + coarse[o]! * 0.25);
    c = mixc(c, [0.335, 0.28, 0.215], sstep(0.55, 0.9, cr2.id[o]!) * 0.3);
    const g = 0.9 + grain[o]! * 0.14 + coarse[o]! * 0.08;
    c = [c[0] * g, c[1] * g, c[2] * g];
    const lich = sstep(0.64, 0.8, lichenF[o]!) * sstep(0.35, 0.6, grain[o]!);
    c = mixc(c, [0.365, 0.365, 0.2], lich * 0.4);
    const shade = 1 - crack * 0.26 + lip * 0.045;
    const speck = rnd(o, 408);
    const mineral = speck > 0.991 ? 1.07 : speck < 0.015 ? 0.88 : 1;
    c = [c[0] * shade * mineral, c[1] * shade * mineral, c[2] * shade * mineral];
    set(f, o, c, clamp01(0.44 + band * 0.12 + plate * 0.035 + coarse[o]! * 0.035 - crack * 0.055 + lip * 0.018 + grain[o]! * 0.035));
  }
  return [f, 1.35];
}

/** Original cast bronze: broad tarnish and verdigris patches, with restrained pitted relief. */
function bronze(n: number): [Field, number] {
  const f = newField(n);
  const patina = fbmField(n, 4, 5, 4, 411);
  const cast = fbmField(n, 22, 22, 3, 412);
  const wear = fbmField(n, 2, 12, 2, 413);
  for (let o = 0; o < n * n; o++) {
    let c = mixc([0.31, 0.245, 0.125], [0.58, 0.45, 0.22], 0.3 + wear[o]! * 0.58);
    const oxidation = sstep(0.56, 0.77, patina[o]!);
    c = mixc(c, [0.19, 0.25, 0.175], oxidation * 0.8);
    const soot = 1 - sstep(0.24, 0.43, patina[o]!);
    c = [c[0] * (0.91 + cast[o]! * 0.17 - soot * 0.2), c[1] * (0.91 + cast[o]! * 0.17 - soot * 0.2), c[2] * (0.91 + cast[o]! * 0.17 - soot * 0.2)];
    set(f, o, c, 0.48 + cast[o]! * 0.075 + oxidation * 0.025);
  }
  return [f, 0.8];
}

const MAKERS: Record<TexKey, (n: number) => [Field, number]> = { plaster, timber, planks, stone, cobble, tile, thatch, slate, cloth, bark, rock, bronze };

export interface TexPair {
  map: THREE.Texture;
  normal: THREE.Texture;
}

/** A baked texture's decoded images: albedo (sRGB) and normal map, rows from v = 0 like the generated ones. */
export interface BakedImages {
  map: TexImageSource;
  normal: TexImageSource;
}

const cache = new Map<string, TexPair>();
const baked = new Map<TexKey, BakedImages>();
let bakedSize = 0, bakedAnisotropy = 1;
const listeners = new Set<() => void>();

/**
 * Use baked images for these keys from now on (decoded at `size` texels, filtered with at least `anisotropy` samples).
 * Materials made earlier hear of it through {@link onBakedTextures} and can take the new pairs from {@link makeTexPair}.
 * Baked pairs belong to this module, not to the materials drawing them: they last for the whole session, apart from those
 * decoded for another preset, which are released once everything has moved on to the new ones.
 */
export function installBakedTextures(images: ReadonlyMap<TexKey, BakedImages>, size: number, anisotropy = 1) {
  if (!images.size) return;
  const stale = [...cache].filter(([id]) => id.includes(':baked:') && !id.endsWith(`:baked:${size}`));
  for (const [key, pair] of images) baked.set(key, pair);
  bakedSize = size;
  bakedAnisotropy = anisotropy;
  for (const listener of [...listeners]) listener();
  for (const [id, pair] of stale) {
    cache.delete(id);
    pair.map.dispose();
    pair.normal.dispose();
  }
}

/** Called whenever baked textures are installed; returns the unsubscribe. */
export function onBakedTextures(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether a key currently draws from baked images rather than its generator. */
export const isBaked = (key: TexKey) => baked.has(key);

const configure = <T extends THREE.Texture>(t: T, srgb: boolean, aniso: number): T => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = aniso;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
};

function bakedPair(images: BakedImages, aniso: number): TexPair {
  const mk = (image: TexImageSource, srgb: boolean) => {
    const t = new THREE.Texture(image as THREE.Texture['image']);
    // Rows run from v = 0, as the generated DataTextures do: never flipped on upload.
    t.flipY = false;
    return configure(t, srgb, aniso);
  };
  return { map: mk(images.map, true), normal: mk(images.normal, false) };
}

export function makeTexPair(key: TexKey, size: number, aniso = 4): TexPair {
  const images = baked.get(key);
  const id = images ? `${key}:baked:${bakedSize}` : `${key}:${size}`;
  const hit = cache.get(id);
  if (hit) {
    // One baked pair serves every caller, so it keeps the sharpest filtering any of them asked for.
    if (images && hit.map.anisotropy < aniso) for (const t of [hit.map, hit.normal]) { t.anisotropy = aniso; t.needsUpdate = true; }
    return hit;
  }
  if (images) {
    const pair = bakedPair(images, Math.max(aniso, bakedAnisotropy));
    cache.set(id, pair);
    return pair;
  }
  const [f, strength] = MAKERS[key](size);
  const n = size;
  const alb = new Uint8Array(n * n * 4);
  const nrm = new Uint8Array(n * n * 4);
  for (let o = 0; o < n * n; o++) {
    alb[o * 4] = Math.round(clamp01(f.rgb[o * 3]!) * 255);
    alb[o * 4 + 1] = Math.round(clamp01(f.rgb[o * 3 + 1]!) * 255);
    alb[o * 4 + 2] = Math.round(clamp01(f.rgb[o * 3 + 2]!) * 255);
    alb[o * 4 + 3] = 255;
  }
  for (let j = 0; j < n; j++) {
    const jm = (j - 1 + n) % n;
    const jp = (j + 1) % n;
    for (let i = 0; i < n; i++) {
      const im = (i - 1 + n) % n;
      const ip = (i + 1) % n;
      const dx = (f.h[j * n + im]! - f.h[j * n + ip]!) * strength * (n / 256);
      const dy = (f.h[jm * n + i]! - f.h[jp * n + i]!) * strength * (n / 256);
      const l = Math.hypot(dx, dy, 1);
      const o = (j * n + i) * 4;
      nrm[o] = Math.round((dx / l * 0.5 + 0.5) * 255);
      nrm[o + 1] = Math.round((dy / l * 0.5 + 0.5) * 255);
      nrm[o + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
      nrm[o + 3] = 255;
    }
  }
  const mk = (data: Uint8Array, srgb: boolean) => configure(new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType), srgb, aniso);
  const pair = { map: mk(alb, true), normal: mk(nrm, false) };
  cache.set(id, pair);
  return pair;
}

/** Leaded window glass: dark with a faint sheen and lead came lines. */
export function makePaneTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#26303a';
  g.fillRect(0, 0, 128, 128);
  const grd = g.createLinearGradient(0, 0, 128, 128);
  grd.addColorStop(0, 'rgba(120,140,150,0.35)');
  grd.addColorStop(1, 'rgba(20,30,40,0.1)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#15100c';
  g.lineWidth = 7;
  g.strokeRect(0, 0, 128, 128);
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(64, 0);
  g.lineTo(64, 128);
  g.moveTo(0, 64);
  g.lineTo(128, 64);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function disposeBuildingTextures() {
  for (const p of cache.values()) {
    p.map.dispose();
    p.normal.dispose();
  }
  cache.clear();
}
