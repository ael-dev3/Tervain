import * as THREE from 'three';
import { clamp01, fbmField, mixc, pnoise, rnd, sstep, voronoi, type RGB } from './procTex';

/**
 * Surface textures for buildings and props: weathered planks and beams, rubble stone, peeling plaster, straw thatch, broken
 * clay tile, slate and coarse cloth. Each is a tileable albedo (dark, dirty, uneven) plus a normal map from the same height field.
 * The albedo carries the colour; vertex colours only tint it a little so no two walls are quite the same.
 */

export type TexKey = 'plaster' | 'timber' | 'planks' | 'stone' | 'cobble' | 'tile' | 'thatch' | 'slate' | 'cloth' | 'bark' | 'rock' | 'bronze';

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
  const rows = 6;
  const streak = fbmField(n, 2, 72, 3, 301);
  const streak2 = fbmField(n, 5, 32, 2, 302);
  const stain = fbmField(n, 3, 3, 4, 303);
  const fine = fbmField(n, 48, 48, 2, 304);
  const rh = n / rows;
  for (let j = 0; j < n; j++) {
    const row = Math.floor(j / rh);
    const v = (j % rh) / rh;
    const rowTone = 0.55 + rnd(row * 97, 305) * 0.7;
    const rowShift = Math.floor(rnd(row * 13, 306) * n);
    for (let i = 0; i < n; i++) {
      const o = j * n + i;
      const gi = (i + rowShift) % n;
      const g = streak[j * n + gi]! * 0.6 + streak2[j * n + gi]! * 0.4;
      // board edge: dark gap, bevelled
      const edge = Math.min(v, 1 - v);
      const gap = 1 - sstep(0.0, 0.055, edge);
      // butt joints
      const jx = Math.floor(rnd(row, 307) * n);
      const joint = 1 - sstep(0, 3, Math.abs(i - jx));
      const split = (1 - sstep(0.012, 0.065, Math.abs(g - 0.43))) * sstep(0.28, 0.55, stain[o]!);
      let base = mixc([0.10, 0.085, 0.063], [0.43, 0.38, 0.29], clamp01(g * 0.8 + stain[o]! * 0.36));
      // Sun-bleached fibres belong to the board, rather than a separate bright speckle on every face.
      base = mixc(base, [0.44, 0.42, 0.35], sstep(0.65, 0.88, g) * 0.32);
      const k = 0.68 + rowTone * 0.46 * (0.8 + fine[o]! * 0.25);
      base = [base[0] * k, base[1] * k, base[2] * k];
      const lap = 1 - sstep(0.045, 0.24, v);
      const dark = clamp01(gap * 0.95 + joint * 0.7 + split * 0.42 + lap * 0.24);
      base = [base[0] * (1 - dark * 0.9), base[1] * (1 - dark * 0.9), base[2] * (1 - dark * 0.9)];
      set(f, o, base, clamp01(0.52 + g * 0.12 - gap * 0.26 - joint * 0.17 - split * 0.12 + v * 0.08));
    }
  }
  // nails
  for (let r = 0; r < rows; r++) for (const nx of [0.18, 0.7]) {
    const cx = Math.floor(nx * n + rnd(r, 308) * 12);
    const cy = Math.floor((r + 0.5) * rh);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy > 5) continue;
      const o = ((cy + dy + n) % n) * n + ((cx + dx + n) % n);
      set(f, o, [0.08, 0.075, 0.07], 0.9);
    }
  }
  return [f, 1.55];
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
  const f = newField(n);
  const low = fbmField(n, 3, 3, 4, 321);
  const mid = fbmField(n, 9, 9, 3, 322);
  const fine = fbmField(n, 60, 60, 2, 323);
  const cr = voronoi(n, 4, 324, 0.95);
  const peel = voronoi(n, 3, 325, 1);
  const rubble = stone(n)[0];
  for (let o = 0; o < n * n; o++) {
    const edge = cr.f2[o]! - cr.f1[o]!;
    const crack = (1 - sstep(0.0, 0.012, edge)) * sstep(0.42, 0.72, low[o]!);
    // peeled patches expose the rubble behind
    const pm = sstep(0.69, 0.79, mid[o]! * 0.6 + (1 - peel.f1[o]!) * 0.5 + low[o]! * 0.2);
    let c = mixc([0.36, 0.315, 0.24], [0.61, 0.56, 0.44], clamp01(low[o]! * 0.85 + fine[o]! * 0.17));
    const u = (o % n) / n, v = Math.floor(o / n) / n;
    const rain = pnoise(u, v, 20, 2, 327) * pnoise(u, v, 3, 3, 328);
    c = mixc(c, [0.23, 0.21, 0.16], sstep(0.3, 0.58, rain) * 0.48);
    const st: RGB = [rubble.rgb[o * 3]!, rubble.rgb[o * 3 + 1]!, rubble.rgb[o * 3 + 2]!];
    c = mixc(c, st, pm);
    c = [c[0] * (1 - crack * 0.4), c[1] * (1 - crack * 0.4), c[2] * (1 - crack * 0.4)];
    set(f, o, c, clamp01(0.57 - pm * 0.12 + rubble.h[o]! * pm * 0.1 - crack * 0.12 + fine[o]! * 0.035));
  }
  return [f, 1.8];
}

function stone(n: number): [Field, number] {
  const f = newField(n);
  // Original coursed rubble: broad split faces and thin recessed mortar, never a field of round pebbles.
  // Periodic warps keep every repeat seamless; per-course offsets interrupt the manufactured grid.
  const grit = fbmField(n, 38, 38, 3, 332);
  const low = fbmField(n, 3, 3, 3, 333);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const o = j * n + i, u = i / n, v = j / n;
    const course = ((v + (pnoise(u, v, 4, 3, 334) - 0.5) * 0.035) * 7 + 7) % 7;
    const row = Math.floor(course), cv = course - row;
    const cols = rnd(row, 335) > 0.5 ? 4 : 5;
    const across = ((u * cols + rnd(row, 336) * 4 + (pnoise(u, v, 5, 4, 337) - 0.5) * 0.11) % cols + cols) % cols;
    const col = Math.floor(across), cu = across - col;
    const id = rnd(row * 17 + col, 338);
    const verticalJoint = 1 - sstep(0.018, 0.065, Math.min(cu, 1 - cu));
    const horizontalJoint = 1 - sstep(0.025, 0.105, Math.min(cv, 1 - cv));
    const mortar = Math.max(verticalJoint, horizontalJoint);
    const split = (1 - sstep(0.018, 0.055, Math.abs(cv - (0.35 + id * 0.27 + (cu - 0.5) * 0.23)))) * sstep(0.48, 0.72, low[o]!);
    const face = clamp01(0.19 + id * 0.57 + low[o]! * 0.19 + grit[o]! * 0.10);
    let c = mixc([0.22, 0.205, 0.16], [0.53, 0.49, 0.38], face);
    const upperShade = 1 - sstep(0.1, 0.34, cv);
    const lowerLip = sstep(0.71, 0.86, cv) * (1 - horizontalJoint);
    const k = 1 - upperShade * 0.21 - split * 0.22 + lowerLip * 0.12;
    c = [c[0] * k, c[1] * k, c[2] * k];
    c = mixc(c, [0.13, 0.15, 0.09], sstep(0.68, 0.86, low[o]!) * (0.13 + horizontalJoint * 0.35));
    c = mixc(c, [0.075, 0.07, 0.052], mortar * 0.9);
    set(f, o, c, clamp01(0.58 + id * 0.06 + grit[o]! * 0.045 - mortar * 0.3 - split * 0.045 + lowerLip * 0.02));
  }
  return [f, 1.8];
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
  const rows = 6;
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
      const cols = 6;
      const u = ((i / n) * cols + off) % 1;
      const col = Math.floor((i / n) * cols + off);
      const id = rnd(row * 31 + col, 354);
      const seamX = Math.min(u, 1 - u);
      const seam = 1 - sstep(0.0, 0.06, seamX);
      const lip = sstep(0.75, 1.0, v);
      const shadow = 1 - sstep(0.0, 0.22, v);
      let c = mixc([0.2, 0.1, 0.075], [0.4, 0.22, 0.15], clamp01(id * 0.9 + stain[o]! * 0.4));
      c = mixc(c, [0.18, 0.2, 0.13], sstep(0.68, 0.85, stain[o]!) * 0.5);
      const k = (0.72 + streak[o]! * 0.4 + fine[o]! * 0.2) * (1 - shadow * 0.5) * (1 - seam * 0.6);
      c = [c[0] * k, c[1] * k, c[2] * k];
      if (id > 0.93) c = [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5];
      set(f, o, c, clamp01(0.4 + v * 0.5 - seam * 0.3 + lip * 0.1));
    }
  }
  return [f, 2.0];
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
      let c = mixc([0.16, 0.125, 0.07], [0.5, 0.4, 0.23], clamp01(g * 1.15 - 0.1 + stain[o]! * 0.25));
      c = mixc(c, [0.15, 0.17, 0.09], sstep(0.66, 0.84, stain[o]!) * 0.5);
      c = mixc(c, [0.12, 0.09, 0.06], bind * 0.6);
      const lap = 1 - sstep(0.04, 0.2, (v * 4) % 1);
      c = [c[0] * (1 - lap * 0.27), c[1] * (1 - lap * 0.27), c[2] * (1 - lap * 0.27)];
      set(f, o, c, clamp01(0.4 + g * 0.24 - bind * 0.09 - lap * 0.08));
    }
  }
  return [f, 1.7];
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
  map: THREE.DataTexture;
  normal: THREE.DataTexture;
}

const cache = new Map<string, TexPair>();

export function makeTexPair(key: TexKey, size: number, aniso = 4): TexPair {
  const id = `${key}:${size}`;
  const hit = cache.get(id);
  if (hit) return hit;
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
  const mk = (data: Uint8Array, srgb: boolean) => {
    const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = aniso;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  };
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
