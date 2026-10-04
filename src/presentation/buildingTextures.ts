import * as THREE from 'three';
import { clamp01, fbmField, mixc, pnoise, rnd, sstep, voronoi, type RGB } from './procTex';

/**
 * Surface textures for buildings and props: weathered planks and beams, rubble stone, peeling plaster, straw thatch, broken
 * clay tile, slate and coarse cloth. Each is a tileable albedo (dark, dirty, uneven) plus a normal map from the same height field.
 * The albedo carries the colour; vertex colours only tint it a little so no two walls are quite the same.
 */

export type TexKey = 'plaster' | 'timber' | 'planks' | 'stone' | 'cobble' | 'tile' | 'thatch' | 'slate' | 'cloth' | 'bark' | 'rock';

/** Metres covered by one repeat of each texture. */
export const TILE_M: Record<TexKey, number> = { plaster: 2.2, timber: 1.2, planks: 1.2, stone: 2, cobble: 1.6, tile: 1.1, thatch: 1.1, slate: 1.1, cloth: 0.6, bark: 1.2, rock: 2.6 };

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
  const streak = fbmField(n, 4, 56, 3, 301);
  const streak2 = fbmField(n, 9, 24, 2, 302);
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
      const gap = 1 - sstep(0.0, 0.07, edge);
      // butt joints
      const jx = Math.floor(rnd(row, 307) * n);
      const joint = 1 - sstep(0, 3, Math.abs(i - jx));
      let base = mixc([0.14, 0.105, 0.075], [0.4, 0.35, 0.29], clamp01(0.25 + g * 0.8 + stain[o]! * 0.4 - 0.2));
      const k = 0.6 + rowTone * 0.7 * (0.55 + fine[o]! * 0.6);
      base = [base[0] * k, base[1] * k, base[2] * k];
      const dark = clamp01(gap * 0.95 + joint * 0.7);
      base = [base[0] * (1 - dark * 0.9), base[1] * (1 - dark * 0.9), base[2] * (1 - dark * 0.9)];
      set(f, o, base, clamp01(0.55 + g * 0.3 - dark * 0.7 + (v - 0.5) * 0.15));
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
  return [f, 3.2];
}

function timber(n: number): [Field, number] {
  const f = newField(n);
  const grain = fbmField(n, 3, 64, 3, 311);
  const grain2 = fbmField(n, 6, 30, 2, 312);
  const stain = fbmField(n, 3, 3, 3, 313);
  const cr = fbmField(n, 2, 26, 2, 314);
  for (let o = 0; o < n * n; o++) {
    const g = grain[o]! * 0.6 + grain2[o]! * 0.4;
    const crack = 1 - sstep(0.01, 0.05, Math.abs(cr[o]! - 0.5));
    let c = mixc([0.13, 0.1, 0.07], [0.36, 0.31, 0.26], clamp01(g * 1.1 + stain[o]! * 0.35 - 0.15));
    c = [c[0] * (1 - crack * 0.8), c[1] * (1 - crack * 0.8), c[2] * (1 - crack * 0.8)];
    set(f, o, c, clamp01(0.5 + g * 0.35 - crack * 0.6));
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
      f.h[o]! += 0.3 * t;
    }
  }
  return [f, 3.4];
}

function plaster(n: number): [Field, number] {
  const f = newField(n);
  const low = fbmField(n, 3, 3, 4, 321);
  const mid = fbmField(n, 9, 9, 3, 322);
  const fine = fbmField(n, 60, 60, 2, 323);
  const cr = voronoi(n, 4, 324, 0.95);
  const peel = voronoi(n, 3, 325, 1);
  const rub = voronoi(n, 12, 326, 0.9);
  for (let o = 0; o < n * n; o++) {
    const edge = cr.f2[o]! - cr.f1[o]!;
    const crack = 1 - sstep(0.0, 0.035, edge);
    // peeled patches expose the rubble behind
    const pm = sstep(0.56, 0.7, mid[o]! * 0.6 + (1 - peel.f1[o]!) * 0.5 + low[o]! * 0.2);
    const stoneTone = 0.16 + rub.id[o]! * 0.22;
    const stoneEdge = sstep(0, 0.12, rub.f2[o]! - rub.f1[o]!);
    let c = mixc([0.29, 0.26, 0.2], [0.5, 0.46, 0.38], clamp01(low[o]! * 0.9 + fine[o]! * 0.25));
    c = mixc(c, [0.2, 0.16, 0.11], sstep(0.55, 0.85, mid[o]!) * 0.55);
    const st: RGB = [stoneTone * 1.05 * (0.35 + 0.65 * stoneEdge), stoneTone * (0.35 + 0.65 * stoneEdge), stoneTone * 0.88 * (0.35 + 0.65 * stoneEdge)];
    c = mixc(c, st, pm);
    c = [c[0] * (1 - crack * 0.6), c[1] * (1 - crack * 0.6), c[2] * (1 - crack * 0.6)];
    set(f, o, c, clamp01(0.6 - pm * 0.35 + stoneEdge * pm * 0.25 - crack * 0.4 + fine[o]! * 0.1));
  }
  return [f, 4.2];
}

function stone(n: number): [Field, number] {
  const f = newField(n);
  // Rubble: stretched cells so courses are roughly horizontal but never aligned.
  const a = voronoi(n, 8, 331, 0.85, 12);
  const grit = fbmField(n, 40, 40, 3, 332);
  const low = fbmField(n, 4, 4, 3, 333);
  for (let o = 0; o < n * n; o++) {
    const edge = sstep(0.0, 0.11, a.f2[o]! - a.f1[o]!);
    const tone = 0.22 + a.id[o]! * 0.3;
    const warm = 0.85 + (a.id[o]! - 0.5) * 0.3;
    let c: RGB = [tone * warm * 1.14, tone * 1.0, tone * 0.78 / warm];
    const k = (0.4 + 0.6 * edge) * (0.84 + grit[o]! * 0.36);
    c = [c[0] * k, c[1] * k, c[2] * k];
    // damp lower patches: dark green-grey
    c = mixc(c, [0.16, 0.19, 0.14], sstep(0.62, 0.85, low[o]!) * 0.4);
    set(f, o, c, clamp01(edge * (0.55 + a.id[o]! * 0.3) + grit[o]! * 0.15 + (1 - a.f1[o]!) * 0.15));
  }
  return [f, 6];
}

function cobble(n: number): [Field, number] {
  const f = newField(n);
  const a = voronoi(n, 12, 341, 0.75);
  const grit = fbmField(n, 40, 40, 3, 342);
  for (let o = 0; o < n * n; o++) {
    const edge = sstep(0.0, 0.2, a.f2[o]! - a.f1[o]!);
    const tone = 0.2 + a.id[o]! * 0.26;
    let c: RGB = [tone * 1.12, tone, tone * 0.8];
    const k = (0.32 + 0.68 * edge) * (0.85 + grit[o]! * 0.3);
    c = [c[0] * k, c[1] * k, c[2] * k];
    set(f, o, c, clamp01(edge * 0.7 + (1 - a.f1[o]!) * 0.3));
  }
  return [f, 7];
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
  return [f, 5];
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
      set(f, o, c, clamp01(g * 0.9 + (1 - bind) * 0.1));
    }
  }
  return [f, 5];
}

function slate(n: number): [Field, number] {
  const f = newField(n);
  const a = voronoi(n, 5, 371, 0.55, 7);
  const grit = fbmField(n, 48, 48, 2, 372);
  const lich = fbmField(n, 6, 6, 4, 373);
  for (let o = 0; o < n * n; o++) {
    const edge = sstep(0.0, 0.09, a.f2[o]! - a.f1[o]!);
    const tone = 0.18 + a.id[o]! * 0.2;
    let c: RGB = [tone * 0.96, tone, tone * 1.06];
    c = mixc(c, [0.36, 0.36, 0.2], sstep(0.66, 0.84, lich[o]!) * 0.5);
    const k = (0.4 + 0.6 * edge) * (0.85 + grit[o]! * 0.3);
    set(f, o, [c[0] * k, c[1] * k, c[2] * k], clamp01(edge * 0.7 + grit[o]! * 0.2));
  }
  return [f, 4.5];
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
    const fractured = sstep(0.32, 0.68, warp[o]!);
    const crack = (1 - sstep(0.005, 0.055, edge)) * fractured;
    const lip = sstep(0.012, 0.036, edge) * (1 - sstep(0.036, 0.095, edge)) * fractured;
    const plate = sstep(0.27, 0.73, cr.id[o]!);
    let c = mixc([0.235, 0.215, 0.19], [0.455, 0.425, 0.375], band * 0.55 + plate * 0.28 + coarse[o]! * 0.17);
    c = mixc(c, [0.335, 0.28, 0.215], sstep(0.55, 0.9, cr2.id[o]!) * 0.3);
    const g = 0.76 + grain[o]! * 0.36 + coarse[o]! * 0.12;
    c = [c[0] * g, c[1] * g, c[2] * g];
    const lich = sstep(0.64, 0.8, lichenF[o]!) * sstep(0.35, 0.6, grain[o]!);
    c = mixc(c, [0.365, 0.365, 0.2], lich * 0.4);
    const shade = 1 - crack * 0.46 + lip * 0.09;
    const speck = rnd(o, 408);
    const mineral = speck > 0.984 ? 1.12 : speck < 0.035 ? 0.79 : 1;
    c = [c[0] * shade * mineral, c[1] * shade * mineral, c[2] * shade * mineral];
    set(f, o, c, clamp01(0.24 + band * 0.29 + plate * 0.13 + sstep(0.46, 0.53, band) * 0.045 + coarse[o]! * 0.11 - crack * 0.22 + lip * 0.065 + grain[o]! * 0.14));
  }
  return [f, 7];
}

const MAKERS: Record<TexKey, (n: number) => [Field, number]> = { plaster, timber, planks, stone, cobble, tile, thatch, slate, cloth, bark, rock };

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
