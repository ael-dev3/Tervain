import * as THREE from 'three';
import type { Quality } from './context';
import { checkCancelled, type CooperativeOptions } from '../platform/cooperative';

/**
 * Procedural ground textures for the terrain: eight tileable layers with albedo and a height-derived normal map, made once
 * at start-up from fixed seeds (no downloads, so every machine sees the same ground). Original painted material groups
 * combine muted herb mats and turf, brown humus with embedded leaf litter, fractured shingle, wind-marked sand and layered
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

/** Pressed straw / fine roots, painted as curved, partly buried threads. The physical width stays
 * proportional to the tile at every texture preset. These marks wrap at both edges, not a repeated
 * grid or a bright pixel-noise overlay. All art is authored here rather than sampled from a reference. */
function groundThreads(l: Layer, n: number, seed: number, count: number, dry: number) {
  for (let thread = 0; thread < count; thread++) {
    const cx = hashi(thread, 0, seed) * n, cy = hashi(thread, 1, seed) * n;
    const angle = hashi(thread, 2, seed) * Math.PI * 2;
    const ax = Math.cos(angle), ay = Math.sin(angle);
    const length = n * (0.02 + hashi(thread, 3, seed) * 0.07);
    const bend = (hashi(thread, 4, seed) - 0.5) * length * 0.65;
    const width = Math.max(0.4, n * (0.0007 + hashi(thread, 5, seed) * 0.0007));
    const tone = hashi(thread, 6, seed);
    const color = mixc([0.23, 0.24, 0.17], [0.43, 0.385, 0.26], tone * dry);
    const steps = Math.max(3, Math.ceil(length * 1.5));
    for (let step = 0; step <= steps; step++) {
      const t = step / steps, side = Math.sin(t * Math.PI) * bend;
      const x = cx + (t - 0.5) * ax * length - ay * side;
      const y = cy + (t - 0.5) * ay * length + ax * side;
      const radius = Math.ceil(width + 0.5);
      for (let iy = Math.floor(y) - radius; iy <= y + radius; iy++) for (let ix = Math.floor(x) - radius; ix <= x + radius; ix++) {
        const distance = Math.hypot(ix + 0.5 - x, iy + 0.5 - y);
        const opacity = (1 - sstep(width * 0.4, width + 0.5, distance)) * (0.16 + tone * 0.18) * Math.sin(t * Math.PI);
        if (opacity <= 0) continue;
        const o = ((iy % n + n) % n) * n + ((ix % n + n) % n);
        for (let channel = 0; channel < 3; channel++) l.rgb[o * 3 + channel] = l.rgb[o * 3 + channel]! * (1 - opacity) + color[channel]! * opacity;
        l.h[o] = clamp01(l.h[o]! + opacity * 0.018);
      }
    }
  }
}

/** Small folded ground herbs form connected colonies in the turf's colour field. They are shallow
 * painted surface detail; the independently rooted 3D grass supplies the larger silhouette. */
function groundHerbs(l: Layer, n: number, seed: number, count: number) {
  for (let colony = 0; colony < count; colony++) {
    const cx = hashi(colony, 0, seed) * n, cy = hashi(colony, 1, seed) * n;
    const tone = hashi(colony, 2, seed), rotation = hashi(colony, 3, seed) * Math.PI * 2;
    const leaves = 3 + Math.floor(hashi(colony, 4, seed) * 3);
    for (let leaf = 0; leaf < leaves; leaf++) {
      const angle = rotation + leaf * Math.PI * 2 / leaves;
      const ax = Math.cos(angle), ay = Math.sin(angle);
      const length = n * (0.007 + hashi(colony, 5 + leaf, seed) * 0.016), width = length * 0.42;
      const radius = Math.ceil(length + 1);
      const color = mixc([0.19, 0.235, 0.13], [0.345, 0.345, 0.225], tone);
      for (let y = Math.floor(cy) - radius; y <= cy + radius; y++) for (let x = Math.floor(cx) - radius; x <= cx + radius; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const u = (dx * ax + dy * ay) / length, v = (-dx * ay + dy * ax) / width;
        if (u <= 0 || u >= 1) continue;
        const edge = Math.pow(Math.sin(u * Math.PI), 0.72);
        const opacity = (1 - sstep(edge * 0.65, edge, Math.abs(v))) * 0.72;
        if (opacity <= 0) continue;
        const o = ((y % n + n) % n) * n + ((x % n + n) % n);
        const vein = 1 - sstep(0.04, 0.15, Math.abs(v));
        const sideVeins = (1 - sstep(0.02, 0.09, Math.abs(Math.sin(u * 20 + Math.abs(v) * 7)))) * sstep(0.12, 0.4, Math.abs(v));
        const fold = 0.82 + vein * 0.19 + sideVeins * 0.055 + (v > 0 ? 0.065 : -0.065);
        for (let channel = 0; channel < 3; channel++) l.rgb[o * 3 + channel] = l.rgb[o * 3 + channel]! * (1 - opacity) + color[channel]! * fold * opacity;
        l.h[o] = clamp01(l.h[o]! + opacity * (0.018 + vein * 0.016));
      }
    }
  }
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
    const color = mixc([0.225, 0.17, 0.105], [0.435, 0.36, 0.235], tone);
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
        const opacity = (1 - rim * 0.25) * (0.61 + tone * 0.17);
        for (let c = 0; c < 3; c++) l.rgb[o * 3 + c] = l.rgb[o * 3 + c]! * (1 - opacity) + color[c]! * shade * opacity;
        l.h[o] = clamp01(l.h[o]! + (0.02 + vein * 0.022 + (1 - Math.abs(u)) * 0.015) * opacity);
      }
    }
  }
}

/** Small broken shale/soil aggregates are pressed into the same tileable skin.
 * Incomplete angular rims, broad painted facets and shallow relief avoid shiny
 * round beads or a regular Voronoi paving grid on the walking surface. */
function groundFragments(l: Layer, n: number, seed: number, count: number, pale: number) {
  for (let fragment = 0; fragment < count; fragment++) {
    const cx = hashi(fragment, 0, seed) * n, cy = hashi(fragment, 1, seed) * n;
    const angle = hashi(fragment, 2, seed) * Math.PI * 2, ax = Math.cos(angle), ay = Math.sin(angle);
    const length = n * (0.003 + hashi(fragment, 3, seed) * 0.008), width = length * (0.3 + hashi(fragment, 4, seed) * 0.35);
    const radius = Math.ceil(length + 1), tone = hashi(fragment, 5, seed);
    const color = mixc([0.255, 0.235, 0.195], [0.445, 0.425, 0.345], tone * pale);
    for (let y = Math.floor(cy) - radius; y <= cy + radius; y++) for (let x = Math.floor(cx) - radius; x <= cx + radius; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = (dx * ax + dy * ay) / length, v = (-dx * ay + dy * ax) / width;
      const shape = Math.max(Math.abs(u + v * 0.18), Math.abs(v - u * 0.14)) + Math.max(0, -u - v) * 0.18;
      const edge = 1 - sstep(0.68, 1.0, shape);
      if (edge <= 0) continue;
      const o = ((y % n + n) % n) * n + ((x % n + n) % n);
      const facet = 0.92 + (v > u * 0.6 ? 0.08 : -0.035), opacity = edge * (0.4 + tone * 0.25);
      for (let channel = 0; channel < 3; channel++) l.rgb[o * 3 + channel] = l.rgb[o * 3 + channel]! * (1 - opacity) + color[channel]! * facet * opacity;
      l.h[o] = clamp01(l.h[o]! + opacity * 0.012);
    }
  }
}


function grass(n: number): Layer {
  const L = newLayer(n);
  const low = fbmField(n, 4, 4, 4, 11);
  const mid = fbmField(n, 12, 12, 3, 12);
  const blade = fbmField(n, 36, 30, 3, 13);
  const blade2 = fbmField(n, 24, 42, 3, 14);
  const herbGrain = fbmField(n, 112, 98, 2, 15);
  const dark: RGB = [0.17, 0.205, 0.12];
  const lush: RGB = [0.285, 0.325, 0.205];
  const dry: RGB = [0.37, 0.35, 0.25];
  for (let o = 0; o < n * n; o++) {
    const b = blade[o]! * 0.6 + blade2[o]! * 0.4;
    let c = mixc(dark, lush, sstep(0.2, 0.75, mid[o]!));
    c = mixc(c, dry, sstep(0.5, 0.8, low[o]!) * 0.55);
    const fibre = 0.79 + b * 0.16 + herbGrain[o]! * 0.26 + (rnd(o, 21) - 0.5) * 0.025;
    c = [c[0] * fibre, c[1] * fibre, c[2] * fibre];
    // Turf is a shallow woven skin. Its colour carries the undergrowth, rather than a noisy normal map.
    put(L, o, c, clamp01(0.38 + b * 0.16 + mid[o]! * 0.1));
  }
  groundHerbs(L, n, 17, 620);
  groundThreads(L, n, 18, 420, 0.7);
  groundDebris(L, n, 19, 26);
  return L;
}

function heath(n: number): Layer {
  const L = newLayer(n);
  const low = fbmField(n, 5, 5, 4, 31);
  const mid = fbmField(n, 18, 18, 3, 32);
  const fibre = fbmField(n, 40, 16, 3, 33);
  const fibre2 = fbmField(n, 16, 40, 3, 34);
  const straw: RGB = [0.37, 0.325, 0.235];
  const moss: RGB = [0.245, 0.275, 0.175];
  const heather: RGB = [0.305, 0.255, 0.245];
  for (let o = 0; o < n * n; o++) {
    const f = Math.max(fibre[o]!, fibre2[o]!);
    let c = mixc(straw, moss, sstep(0.42, 0.7, mid[o]!) * 0.8);
    c = mixc(c, heather, sstep(0.66, 0.85, low[o]!) * 0.6);
    const k = 0.88 + f * 0.22;
    c = [c[0] * k, c[1] * k, c[2] * k];
    put(L, o, c, clamp01(0.4 + f * 0.15 + mid[o]! * 0.09));
  }
  groundHerbs(L, n, 37, 120);
  groundThreads(L, n, 38, 320, 1);
  groundDebris(L, n, 39, 24);
  return L;
}

function earth(n: number): Layer {
  const L = newLayer(n);
  const low = fbmField(n, 5, 5, 4, 51);
  const grain = fbmField(n, 48, 48, 3, 52);
  const humus = fbmField(n, 15, 18, 3, 54);
  const cr = voronoi(n, 7, 53, 0.95);
  for (let o = 0; o < n * n; o++) {
    const edge = cr.f2[o]! - cr.f1[o]!;
    const crack = 1 - sstep(0.02, 0.11, edge);
    let c = mixc([0.185, 0.155, 0.115], [0.36, 0.305, 0.225], sstep(0.25, 0.8, low[o]!));
    c = mixc(c, [0.235, 0.24, 0.165], sstep(0.6, 0.79, humus[o]!) * 0.3);
    const g = 0.85 + grain[o]! * 0.28;
    c = [c[0] * g, c[1] * g, c[2] * g];
    c = [c[0] * (1 - crack * 0.1), c[1] * (1 - crack * 0.1), c[2] * (1 - crack * 0.1)];
    const embedded = sstep(0.79, 0.91, grain[o]!);
    c = mixc(c, [0.365, 0.325, 0.27], embedded * 0.28);
    put(L, o, c, clamp01(0.38 + grain[o]! * 0.18 - crack * 0.035 + low[o]! * 0.08));
  }
  groundThreads(L, n, 58, 170, 0.8);
  groundDebris(L, n, 59, 118);
  groundFragments(L, n, 60, 96, 0.7);
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
    // Incomplete angular chips sit in compact soil. Their broken cell edges avoid a carpet of
    // evenly rounded beads, but the empty cells keep it from becoming a paved polygon grid.
    const pebble = sstep(0.018, 0.085, v.f2[o]! - v.f1[o]!)
      * (1 - sstep(0.48, 0.69, v.f1[o]!)) * sstep(0.17, 0.42, v.id[o]!);
    const lum = 0.24 + v.id[o]! * 0.23 + (v2.id[o]! - 0.5) * 0.04;
    const warm = 0.9 + (v.id[o]! - 0.5) * 0.25;
    let c: RGB = [lum * warm * 1.05, lum * 0.98, lum * 0.86 / warm];
    const shade = 0.72 + 0.28 * edge;
    c = [c[0] * shade, c[1] * shade, c[2] * shade];
    const grit = 0.9 + rnd(o, 81) * 0.2;
    c = [c[0] * grit * (0.85 + low[o]! * 0.3), c[1] * grit * (0.85 + low[o]! * 0.3), c[2] * grit * (0.85 + low[o]! * 0.3)];
    c = mixc([0.205 * grit, 0.185 * grit, 0.15 * grit], c, pebble);
    put(L, o, c, clamp01(0.36 + big * pebble * 0.22 + v2.f1[o]! * 0.05));
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
    // Fine sandy marks remain colour detail. Oversized normal ridges made an
    // otherwise dry beach look like embossed foil under low coastal sunlight.
    put(L, o, c, clamp01(0.46 + (r - 0.5) * 0.12 + grain[o]! * 0.12));
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
    put(L, o, c, clamp01(0.48 + (r - 0.5) * 0.11 + grain[o]! * 0.035));
  }
  return L;
}

function rock(n: number): Layer {
  const L = newLayer(n);
  const warpA = fbmField(n, 3, 3, 3, 111);
  const strata = fbmField(n, 2, 17, 3, 112);
  const grain = fbmField(n, 56, 56, 3, 113);
  const lichenF = fbmField(n, 7, 7, 4, 114);
  const cr = voronoi(n, 6, 115, 0.94, 10);
  const cr2 = voronoi(n, 15, 116, 0.9, 11);
  const coarse = fbmField(n, 17, 21, 3, 117);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const o = j * n + i;
      const band = clamp01(strata[o]! + (warpA[o]! - 0.5) * 0.35);
      const edge = Math.min(cr.f2[o]! - cr.f1[o]!, (cr2.f2[o]! - cr2.f1[o]!) * 1.4);
      // Only a few weathered fissures cross each layered face: no black polygon grid over every rock.
      const crack = (1 - sstep(0.005, 0.055, edge)) * sstep(0.32, 0.68, warpA[o]!);
      const lip = sstep(0.012, 0.036, edge) * (1 - sstep(0.036, 0.095, edge)) * sstep(0.32, 0.68, warpA[o]!);
      const plate = sstep(0.27, 0.73, cr.id[o]!);
      const strataEdge = sstep(0.46, 0.53, band);
      let c = mixc([0.245, 0.225, 0.20], [0.49, 0.46, 0.415], band * 0.55 + plate * 0.28 + coarse[o]! * 0.17);
      c = mixc(c, [0.37, 0.31, 0.235], sstep(0.55, 0.9, cr2.id[o]!) * 0.3);
      const g = 0.76 + grain[o]! * 0.36 + coarse[o]! * 0.12;
      c = [c[0] * g, c[1] * g, c[2] * g];
      const lich = sstep(0.62, 0.78, lichenF[o]!) * sstep(0.35, 0.6, grain[o]!);
      c = mixc(c, [0.415, 0.405, 0.23], lich * 0.45);
      const fractureShade = 1 - crack * 0.28 + lip * 0.06;
      const speck = rnd(o, 118);
      const mineral = speck > 0.984 ? 1.12 : speck < 0.035 ? 0.79 : 1;
      c = [c[0] * fractureShade * mineral, c[1] * fractureShade * mineral, c[2] * fractureShade * mineral];
      put(L, o, c, clamp01(0.24 + band * 0.29 + plate * 0.13 + strataEdge * 0.045 + coarse[o]! * 0.11 - crack * 0.22 + lip * 0.065 + grain[o]! * 0.14));
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
    let c = mixc([0.255, 0.215, 0.155], [0.43, 0.365, 0.27], clamp01(low[o]! * 0.9 + mid[o]! * 0.35 - 0.1));
    const peb = 1 - sstep(0.02, 0.28, grit.f1[o]!);
    const pl = 0.26 + grit.id[o]! * 0.2;
    c = mixc(c, [pl * 1.03, pl, pl * 0.91], peb * 0.54 * (grit.id[o]! > 0.68 ? 1 : 0));
    const stone = 1 - sstep(0.0, 0.18, big.f1[o]!);
    if (big.id[o]! > 0.82) c = mixc(c, [0.32, 0.3, 0.265], stone * 0.65);
    const k = 0.9 + fine[o]! * 0.19;
    c = [c[0] * k, c[1] * k, c[2] * k];
    put(L, o, c, clamp01(0.41 + peb * (grit.id[o]! > 0.68 ? 0.13 : 0) + stone * (big.id[o]! > 0.82 ? 0.12 : 0) + fine[o]! * 0.1));
  }
  groundThreads(L, n, 128, 210, 0.95);
  groundDebris(L, n, 129, 25);
  groundFragments(L, n, 130, 74, 1);
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
const RELIEF: Record<LayerName, number> = { grass: 3.4, heath: 3.7, earth: 6, gravel: 8, sand: 3.2, wetsand: 2.5, rock: 11, path: 4.5 };

export interface TerrainTextureData {
  albedo: Uint8Array;
  normal: Uint8Array;
}

export interface TerrainTextureOptions extends CooperativeOptions {
  onProgress?: (completed: number, total: number, layer: LayerName) => void;
  /** Test/offline hosts can opt out; browsers generate pixels away from their input/render thread. */
  worker?: boolean;
}

/** CPU pixels only: identical seeds and packing in the worker and the cooperative fallback. */
export async function generateTerrainTextureData(size: number, yieldNow: () => Promise<void> = async () => {}, options: TerrainTextureOptions = {}): Promise<TerrainTextureData> {
  if (!Number.isInteger(size) || size < 1) throw new Error('Terrain texture size must be a positive integer.');
  checkCancelled(options.signal);
  const n = size;
  const alb = new Uint8Array(n * n * 4 * LAYERS.length);
  const nrm = new Uint8Array(n * n * 4 * LAYERS.length);
  for (let li = 0; li < LAYERS.length; li++) {
    checkCancelled(options.signal);
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
    options.onProgress?.(li + 1, LAYERS.length, name);
    await yieldNow();
  }
  checkCancelled(options.signal);
  return { albedo: alb, normal: nrm };
}

type TextureWorkerReply = { type: 'progress'; completed: number; total: number; layer: LayerName }
  | { type: 'complete'; albedo: Uint8Array; normal: Uint8Array }
  | { type: 'error'; message: string };

/** Worker boot failures fall back; generation errors remain visible to the normal loading/retry screen. */
async function textureDataInWorker(size: number, options: TerrainTextureOptions): Promise<TerrainTextureData | null> {
  if (options.worker === false || typeof Worker === 'undefined') return null;
  checkCancelled(options.signal);
  let worker: Worker;
  try { worker = new Worker(new URL('./terrainTextureWorker.ts', import.meta.url), { type: 'module' }); }
  catch { return null; }
  return await new Promise<TerrainTextureData | null>((resolve, reject) => {
    let completed = false;
    const finish = (result: TerrainTextureData | null, error?: unknown) => {
      if (completed) return;
      completed = true;
      options.signal?.removeEventListener('abort', abort);
      worker.terminate();
      if (error !== undefined) reject(error); else resolve(result);
    };
    const abort = () => finish(null, options.signal?.reason ?? new DOMException('Loading was cancelled.', 'AbortError'));
    options.signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = (event: MessageEvent<TextureWorkerReply>) => {
      if (completed) return;
      const reply = event.data;
      if (reply.type === 'error') finish(null, new Error(reply.message));
      else if (reply.type === 'complete') finish({ albedo: reply.albedo, normal: reply.normal });
      else {
        try { options.onProgress?.(reply.completed, reply.total, reply.layer); }
        catch (error) { finish(null, error); }
      }
    };
    worker.onerror = event => {
      event.preventDefault();
      // Module loading/CSP failures cannot send our protocol. Explicit generation errors use the error reply above.
      finish(null);
    };
    try { worker.postMessage({ size }); }
    catch (error) { finish(null, error); }
  });
}

/** Texels across each ground layer for each preset. */
export const TERRAIN_TEXTURE_SIZE: Record<Quality, number> = { high: 1024, medium: 768, low: 256 };

/** Pixels a worker is already making ahead of the world build (A68), by size; the next build of that size takes them. */
const ahead = new Map<number, Promise<TerrainTextureData | null>>();

/**
 * Start the worker on a size's pixels now, while the world's models download, so they are ready when the build asks
 * for them (A68). Hosts without workers make them in the build as before.
 */
export function prefetchTerrainTextureData(size: number) {
  if (ahead.has(size) || typeof Worker === 'undefined') return;
  ahead.set(size, textureDataInWorker(size, {}).catch(() => null));
}

/** Builds GPU texture handles on the main thread after the worker has transferred its pixel buffers. */
export async function makeTerrainTextures(size: number, yieldNow: () => Promise<void> = async () => {}, options: TerrainTextureOptions = {}): Promise<TerrainTextures> {
  if (!Number.isInteger(size) || size < 1) throw new Error('Terrain texture size must be a positive integer.');
  checkCancelled(options.signal);
  // Pixels made ahead are used once: they become this world's textures, and a later build makes its own.
  const early = options.worker === false ? undefined : ahead.get(size);
  ahead.delete(size);
  const data = (early ? await early : null) ?? await textureDataInWorker(size, options) ?? await generateTerrainTextureData(size, yieldNow, options);
  checkCancelled(options.signal);
  const n = size;
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
  const albedo = mk(data.albedo, true);
  const normal = mk(data.normal, false);
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
