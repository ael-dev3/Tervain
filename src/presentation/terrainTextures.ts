import * as THREE from 'three';

/**
 * Procedural ground textures for the terrain: eight tileable layers with albedo and a height-derived normal map, made once
 * at start-up from fixed seeds (no downloads, so every machine sees the same ground). Original painted material groups
 * combine greener moss and turf, brown humus with embedded leaf litter, rounded shingle, wind-marked sand and layered
 * lichen-stained rock. Height is stored beside the normal so the shader can blend layers along their relief rather than
 * cross-fading; the new litter marks occur in both albedo and that same relief.
 */

export const LAYERS = ['grass', 'heath', 'earth', 'gravel', 'sand', 'wetsand', 'rock', 'path'] as const;
export type LayerName = (typeof LAYERS)[number];
export const LAYER = Object.fromEntries(LAYERS.map((n, i) => [n, i])) as Record<LayerName, number>;

import { clamp01, fbmField, hashi, mixc, rnd, sstep, voronoi, type RGB } from './procTex';


interface Layer {
  /** sRGB colours 0..1. */
  rgb: Float32Array;
  h: Float32Array;
}

function newLayer(n: number): Layer {
  return { rgb: new Float32Array(n * n * 3), h: new Float32Array(n * n) };
}

function put(l: Layer, o: number, c: RGB, h: number) {
  l.rgb[o * 3] = c[0];
  l.rgb[o * 3 + 1] = c[1];
  l.rgb[o * 3 + 2] = c[2];
  l.h[o] = h;
}

/** Original embedded leaves and splinters at physical ground scale, with the same marks in albedo and relief.
 * The stamps wrap through texture edges; they are surface detail, not floating geometry or animation. */
function groundDebris(l: Layer, n: number, seed: number, count: number) {
  for (let leaf = 0; leaf < count; leaf++) {
    const cx = hashi(leaf, 0, seed) * n, cy = hashi(leaf, 1, seed) * n;
    const angle = hashi(leaf, 2, seed) * Math.PI * 2;
    const ax = Math.cos(angle), ay = Math.sin(angle);
    const length = n * (0.015 + hashi(leaf, 3, seed) * 0.024);
    const width = length * (0.24 + hashi(leaf, 4, seed) * 0.16);
    const radius = Math.ceil(length + width + 1);
    const tone = hashi(leaf, 5, seed);
    const color = mixc([0.25, 0.14, 0.065], [0.51, 0.37, 0.17], tone);
    for (let y = Math.floor(cy) - radius; y <= cy + radius; y++) {
      for (let x = Math.floor(cx) - radius; x <= cx + radius; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const u = (dx * ax + dy * ay) / length, v = (-dx * ay + dy * ax) / width;
        if (Math.abs(u) > 1) continue;
        const edge = Math.sin((u + 1) * Math.PI * 0.5) * (0.83 + 0.09 * Math.sin(u * 22 + tone * 7));
        if (Math.abs(v) > edge) continue;
        const o = ((y % n + n) % n) * n + ((x % n + n) % n);
        const vein = 1 - sstep(0.025, 0.11, Math.abs(v));
        const sideVeins = (1 - sstep(0.0, 0.13, Math.abs(Math.sin(u * 19 + Math.abs(v) * 7)))) * 0.07;
        const rim = sstep(edge * 0.65, edge, Math.abs(v));
        const shade = 0.88 + vein * 0.19 + sideVeins - rim * 0.18;
        const opacity = (1 - rim * 0.25) * (0.78 + tone * 0.17);
        for (let c = 0; c < 3; c++) l.rgb[o * 3 + c] = l.rgb[o * 3 + c]! * (1 - opacity) + color[c]! * shade * opacity;
        l.h[o] = clamp01(l.h[o]! + (0.035 + vein * 0.04 + (1 - Math.abs(u)) * 0.02) * opacity);
      }
    }
  }
}


function grass(n: number): Layer {
  const L = newLayer(n);
  const low = fbmField(n, 4, 4, 4, 11);
  const mid = fbmField(n, 12, 12, 3, 12);
  const blade = fbmField(n, 44, 14, 3, 13);
  const blade2 = fbmField(n, 30, 22, 3, 14);
  const dark: RGB = [0.13, 0.185, 0.075];
  const lush: RGB = [0.245, 0.33, 0.13];
  const dry: RGB = [0.37, 0.34, 0.175];
  for (let o = 0; o < n * n; o++) {
    const b = blade[o]! * 0.6 + blade2[o]! * 0.4;
    let c = mixc(dark, lush, sstep(0.2, 0.75, mid[o]!));
    c = mixc(c, dry, sstep(0.55, 0.85, low[o]!) * 0.7);
    const streak = (b - 0.5) * 0.4;
    c = [c[0] * (1 + streak), c[1] * (1 + streak * 0.9), c[2] * (1 + streak * 0.6)];
    const sp = rnd(o, 21);
    if (sp > 0.986) c = [0.5, 0.44, 0.22];
    else if (sp < 0.03) c = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55];
    put(L, o, c, clamp01(b * 0.8 + mid[o]! * 0.3));
  }
  groundDebris(L, n, 19, 36);
  return L;
}

function heath(n: number): Layer {
  const L = newLayer(n);
  const low = fbmField(n, 5, 5, 4, 31);
  const mid = fbmField(n, 18, 18, 3, 32);
  const fibre = fbmField(n, 40, 16, 3, 33);
  const fibre2 = fbmField(n, 16, 40, 3, 34);
  const straw: RGB = [0.36, 0.31, 0.17];
  const moss: RGB = [0.19, 0.255, 0.105];
  const heather: RGB = [0.27, 0.19, 0.21];
  for (let o = 0; o < n * n; o++) {
    const f = Math.max(fibre[o]!, fibre2[o]!);
    let c = mixc(straw, moss, sstep(0.42, 0.7, mid[o]!) * 0.8);
    c = mixc(c, heather, sstep(0.66, 0.85, low[o]!) * 0.6);
    const k = 0.8 + f * 0.42;
    c = [c[0] * k, c[1] * k, c[2] * k];
    const sp = rnd(o, 41);
    if (sp > 0.99) c = [0.55, 0.5, 0.32];
    put(L, o, c, clamp01(f * 0.9 + mid[o]! * 0.2));
  }
  groundDebris(L, n, 39, 24);
  return L;
}

function earth(n: number): Layer {
  const L = newLayer(n);
  const low = fbmField(n, 5, 5, 4, 51);
  const grain = fbmField(n, 48, 48, 3, 52);
  const cr = voronoi(n, 7, 53, 0.95);
  for (let o = 0; o < n * n; o++) {
    const edge = cr.f2[o]! - cr.f1[o]!;
    const crack = 1 - sstep(0.02, 0.11, edge);
    let c = mixc([0.165, 0.115, 0.07], [0.31, 0.235, 0.145], sstep(0.25, 0.8, low[o]!));
    const g = 0.75 + grain[o]! * 0.5;
    c = [c[0] * g, c[1] * g, c[2] * g];
    c = [c[0] * (1 - crack * 0.1), c[1] * (1 - crack * 0.1), c[2] * (1 - crack * 0.1)];
    const sp = rnd(o, 61);
    if (sp > 0.992) c = [0.42, 0.36, 0.28];
    put(L, o, c, clamp01(0.48 + grain[o]! * 0.34 - crack * 0.07 + low[o]! * 0.12));
  }
  groundDebris(L, n, 59, 104);
  return L;
}

function gravel(n: number): Layer {
  const L = newLayer(n);
  const v = voronoi(n, 30, 71, 0.85);
  const v2 = voronoi(n, 61, 72, 0.9);
  const low = fbmField(n, 6, 6, 3, 73);
  for (let o = 0; o < n * n; o++) {
    const big = 1 - sstep(0.0, 0.6, v.f1[o]!);
    const edge = sstep(0.0, 0.16, v.f2[o]! - v.f1[o]!);
    // Rounded individual shingle sits in soil, instead of filling every Voronoi cell like a tiled pavement.
    const pebble = (1 - sstep(0.26 + v.id[o]! * 0.12, 0.5 + v.id[o]! * 0.1, v.f1[o]!)) * edge;
    const lum = 0.2 + v.id[o]! * 0.34 + (v2.id[o]! - 0.5) * 0.05;
    const warm = 0.9 + (v.id[o]! - 0.5) * 0.25;
    let c: RGB = [lum * warm * 1.05, lum * 0.98, lum * 0.86 / warm];
    const shade = 0.72 + 0.28 * edge;
    c = [c[0] * shade, c[1] * shade, c[2] * shade];
    const grit = 0.8 + rnd(o, 81) * 0.4;
    c = [c[0] * grit * (0.85 + low[o]! * 0.3), c[1] * grit * (0.85 + low[o]! * 0.3), c[2] * grit * (0.85 + low[o]! * 0.3)];
    c = mixc([0.205 * grit, 0.185 * grit, 0.15 * grit], c, pebble);
    put(L, o, c, clamp01(0.23 + big * pebble * 0.6 + v2.f1[o]! * 0.09));
  }
  return L;
}

function sand(n: number): Layer {
  const L = newLayer(n);
  const low = fbmField(n, 4, 4, 3, 91);
  const grain = fbmField(n, 96, 96, 2, 92);
  const rip = fbmField(n, 5, 40, 2, 93);
  const shell = voronoi(n, 16, 94, 0.9);
  for (let o = 0; o < n * n; o++) {
    const r = Math.sin((rip[o]! * 7 + (o / n | 0) / n * 24) * Math.PI * 2) * 0.5 + 0.5;
    let c = mixc([0.47, 0.38, 0.27], [0.6, 0.5, 0.37], low[o]!);
    const k = 0.9 + grain[o]! * 0.2 + (r - 0.5) * 0.08;
    c = [c[0] * k, c[1] * k, c[2] * k];
    const sp = rnd(o, 95);
    if (sp > 0.985) c = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.5];
    else if (sp < 0.008) c = [0.7, 0.66, 0.58];
    if (shell.f1[o]! < 0.06 && shell.id[o]! > 0.8) c = [0.62, 0.58, 0.5];
    put(L, o, c, clamp01(0.5 + (r - 0.5) * 0.22 + grain[o]! * 0.3));
  }
  return L;
}

function wetsand(n: number): Layer {
  const L = newLayer(n);
  const low = fbmField(n, 4, 4, 3, 101);
  const grain = fbmField(n, 64, 64, 2, 102);
  const rip = fbmField(n, 6, 30, 2, 103);
  for (let o = 0; o < n * n; o++) {
    const r = Math.sin((rip[o]! * 5 + (o / n | 0) / n * 16) * Math.PI * 2) * 0.5 + 0.5;
    let c = mixc([0.24, 0.19, 0.13], [0.33, 0.27, 0.2], low[o]!);
    const k = 0.92 + grain[o]! * 0.14 + (r - 0.5) * 0.1;
    c = [c[0] * k, c[1] * k, c[2] * k];
    if (rnd(o, 105) > 0.995) c = [0.14, 0.12, 0.1];
    put(L, o, c, clamp01(0.5 + (r - 0.5) * 0.3));
  }
  return L;
}

function rock(n: number): Layer {
  const L = newLayer(n);
  const warpA = fbmField(n, 3, 3, 3, 111);
  const strata = fbmField(n, 2, 17, 3, 112);
  const grain = fbmField(n, 64, 64, 3, 113);
  const lichenF = fbmField(n, 7, 7, 4, 114);
  const cr = voronoi(n, 6, 115, 0.9);
  const cr2 = voronoi(n, 13, 116, 0.9);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const o = j * n + i;
      const band = strata[o]! + (warpA[o]! - 0.5) * 0.35;
      const edge = Math.min(cr.f2[o]! - cr.f1[o]!, (cr2.f2[o]! - cr2.f1[o]!) * 1.4);
      // Only a few weathered fissures cross each layered face: no black polygon grid over every rock.
      const crack = (1 - sstep(0.004, 0.036, edge)) * sstep(0.38, 0.8, warpA[o]!);
      let c = mixc([0.26, 0.245, 0.225], [0.44, 0.415, 0.375], band);
      c = mixc(c, [0.34, 0.3, 0.24], sstep(0.55, 0.9, cr2.id[o]!) * 0.35);
      const g = 0.82 + grain[o]! * 0.36;
      c = [c[0] * g, c[1] * g, c[2] * g];
      const lich = sstep(0.62, 0.78, lichenF[o]!) * sstep(0.35, 0.6, grain[o]!);
      c = mixc(c, [0.42, 0.42, 0.2], lich * 0.55);
      c = [c[0] * (1 - crack * 0.36), c[1] * (1 - crack * 0.36), c[2] * (1 - crack * 0.36)];
      put(L, o, c, clamp01(0.35 + band * 0.44 - crack * 0.16 + grain[o]! * 0.21 + cr.id[o]! * 0.04));
    }
  }
  return L;
}

function path(n: number): Layer {
  const L = newLayer(n);
  const low = fbmField(n, 4, 4, 4, 121);
  const mid = fbmField(n, 11, 11, 3, 124);
  const grit = voronoi(n, 22, 122, 0.85);
  const big = voronoi(n, 9, 126, 0.9);
  const fine = fbmField(n, 64, 64, 2, 123);
  for (let o = 0; o < n * n; o++) {
    // Trodden earth in blotches of damp dark and dry pale, with stones pressed in.
    let c = mixc([0.22, 0.165, 0.105], [0.455, 0.36, 0.25], clamp01(low[o]! * 0.9 + mid[o]! * 0.35 - 0.1));
    const peb = 1 - sstep(0.0, 0.34, grit.f1[o]!);
    const pl = 0.2 + grit.id[o]! * 0.3;
    c = mixc(c, [pl * 1.05, pl, pl * 0.88], peb * 0.85 * (grit.id[o]! > 0.5 ? 1 : 0));
    const stone = 1 - sstep(0.0, 0.18, big.f1[o]!);
    if (big.id[o]! > 0.72) c = mixc(c, [0.32, 0.3, 0.27], stone * 0.9);
    const k = 0.8 + fine[o]! * 0.35;
    c = [c[0] * k, c[1] * k, c[2] * k];
    if (rnd(o, 125) > 0.994) c = [0.5, 0.44, 0.27];
    put(L, o, c, clamp01(0.4 + peb * 0.4 + stone * (big.id[o]! > 0.72 ? 0.4 : 0) + fine[o]! * 0.2));
  }
  groundDebris(L, n, 129, 18);
  return L;
}

/** Normal from the height field with wrap-around, packed as RGB with the height in alpha. */
function packNormal(h: Float32Array, n: number, strength: number, out: Uint8Array, layer: number) {
  const base = layer * n * n * 4;
  for (let j = 0; j < n; j++) {
    const jm = (j - 1 + n) % n;
    const jp = (j + 1) % n;
    for (let i = 0; i < n; i++) {
      const im = (i - 1 + n) % n;
      const ip = (i + 1) % n;
      const dx = (h[j * n + im]! - h[j * n + ip]!) * strength;
      const dy = (h[jm * n + i]! - h[jp * n + i]!) * strength;
      const l = Math.hypot(dx, dy, 1);
      const o = base + (j * n + i) * 4;
      out[o] = Math.round((dx / l * 0.5 + 0.5) * 255);
      out[o + 1] = Math.round((dy / l * 0.5 + 0.5) * 255);
      out[o + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
      out[o + 3] = Math.round(clamp01(h[j * n + i]!) * 255);
    }
  }
}

export interface TerrainTextures {
  albedo: THREE.DataArrayTexture;
  normal: THREE.DataArrayTexture;
  size: number;
  dispose(): void;
}

const MAKERS: Record<LayerName, (n: number) => Layer> = { grass, heath, earth, gravel, sand, wetsand, rock, path };
/** Relief strength per layer when turning height into a normal. */
const RELIEF: Record<LayerName, number> = { grass: 5, heath: 6, earth: 9, gravel: 14, sand: 3.5, wetsand: 2.5, rock: 15, path: 10 };

/** Builds all layers. `yieldNow` lets the caller repaint a loading screen between layers. */
export async function makeTerrainTextures(size: number, yieldNow: () => Promise<void> = async () => {}): Promise<TerrainTextures> {
  const n = size;
  const alb = new Uint8Array(n * n * 4 * LAYERS.length);
  const nrm = new Uint8Array(n * n * 4 * LAYERS.length);
  for (let li = 0; li < LAYERS.length; li++) {
    const name = LAYERS[li]!;
    const L = MAKERS[name](n);
    const base = li * n * n * 4;
    for (let o = 0; o < n * n; o++) {
      alb[base + o * 4] = Math.round(clamp01(L.rgb[o * 3]!) * 255);
      alb[base + o * 4 + 1] = Math.round(clamp01(L.rgb[o * 3 + 1]!) * 255);
      alb[base + o * 4 + 2] = Math.round(clamp01(L.rgb[o * 3 + 2]!) * 255);
      alb[base + o * 4 + 3] = 255;
    }
    packNormal(L.h, n, RELIEF[name] * (n / 512), nrm, li);
    await yieldNow();
  }
  const mk = (data: Uint8Array, srgb: boolean) => {
    const t = new THREE.DataArrayTexture(data, n, n, LAYERS.length);
    t.format = THREE.RGBAFormat;
    t.type = THREE.UnsignedByteType;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 8;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  };
  const albedo = mk(alb, true);
  const normal = mk(nrm, false);
  return {
    albedo,
    normal,
    size: n,
    dispose() {
      albedo.dispose();
      normal.dispose();
    },
  };
}

/** Mean sRGB colour of a layer, for tests and for the reference notes. */
export function layerMean(name: LayerName, n = 128): RGB {
  const L = MAKERS[name](n);
  const s: RGB = [0, 0, 0];
  for (let o = 0; o < n * n; o++) {
    s[0] += L.rgb[o * 3]!;
    s[1] += L.rgb[o * 3 + 1]!;
    s[2] += L.rgb[o * 3 + 2]!;
  }
  return [s[0] / (n * n), s[1] / (n * n), s[2] / (n * n)];
}
