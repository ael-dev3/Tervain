import * as THREE from 'three';
import { fbm, mulberry32, smoothstep } from '../../world/noise';
import type { BuildContext, Quality } from '../context';
import { GeoBuilder, type GV, type Vec3 } from './geoBuilder';
import { Habitat, hash3, newSample } from './habitat';
import { createPatchMaterial, type PatchMaterial } from './patchMaterial';
import { TileLayer, type TileBuffers } from './tileStream';
import type { PatchShared } from './shared';

/**
 * Meadow grass: clumps of individual tapered blades, thousands of them, streamed around the camera.
 * A "patch" is a tuft of 7-14 blades (three triangles each); the blade layout and the wind/normal/colour treatment are
 * ports of ael-dev3/Warpkeep src/components/realm/createLowPolyGrassGeometry.ts and createRealmGrassMaterial.ts
 * @786c0b2 (Apache-2.0), rewritten for a free camera at ground level.
 */

interface GrassQuality {
  blades: number;
  /** patches per square metre at full density near the camera */
  density: number;
  tile: number;
  fadeStart: number;
  fadeEnd: number;
  shadows: boolean;
}

const GRASS_Q: Record<Quality, GrassQuality> = {
  high: { blades: 11, density: 3.6, tile: 16, fadeStart: 8, fadeEnd: 60, shadows: true },
  medium: { blades: 9, density: 2.4, tile: 16, fadeStart: 6, fadeEnd: 48, shadows: true },
  low: { blades: 6, density: 1.4, tile: 16, fadeStart: 4, fadeEnd: 34, shadows: false },
};

/** One tuft: blades on a golden-angle spiral so a few patches overlapping read as a meadow. */
export function createGrassPatch(blades: number, seed: number): THREE.BufferGeometry {
  const rng = mulberry32(seed);
  const b = new GeoBuilder();
  b.upBias = 0.72;
  const white: Vec3 = [1, 1, 1];
  const R = 0.5;
  for (let i = 0; i < blades; i++) {
    const r = R * Math.sqrt((i + 0.5) / blades) * (0.9 + rng() * 0.2);
    const a = i * 2.39996 + rng() * 0.5;
    const rx = Math.cos(a) * r;
    const rz = Math.sin(a) * r;
    // Blades splay outward from the tuft's heart, with scatter; the heart blades stand tallest.
    const psi = Math.atan2(rz, rx) + (rng() - 0.5) * 1.7;
    const ax = Math.cos(psi);
    const az = Math.sin(psi);
    const fx = -az;
    const fz = ax;
    const heart = 1 - r / R;
    const h = (0.42 + heart * 0.2 + rng() * 0.34) * (i % 5 === 0 ? 1.25 : 1);
    const w0 = 0.028 + rng() * 0.02;
    const lean = h * (0.16 + rng() * 0.42 + (1 - heart) * 0.16);
    b.phase = rng() * Math.PI * 2;
    b.stiff = 0.8 + rng() * 0.36;
    const my = h * 0.52;
    const mw = w0 * 0.66;
    const mo = lean * 0.3;
    const rl: GV = { p: [rx - ax * w0, 0, rz - az * w0], c: white, w: 0 };
    const rr: GV = { p: [rx + ax * w0, 0, rz + az * w0], c: white, w: 0 };
    const ml: GV = { p: [rx - ax * mw + fx * mo, my, rz - az * mw + fz * mo], c: white, w: 0.52 };
    const mr: GV = { p: [rx + ax * mw + fx * mo, my, rz + az * mw + fz * mo], c: white, w: 0.52 };
    const tp: GV = { p: [rx + fx * lean, h, rz + fz * lean], c: white, w: 1 };
    b.tri(rl, rr, ml);
    b.tri(rr, mr, ml);
    b.tri(ml, mr, tp);
  }
  return b.build();
}

const cMeadow = new THREE.Color().setHex(0x66703a);
const cDeep = new THREE.Color().setHex(0x3f5230);
const cGold = new THREE.Color().setHex(0x9a8a52);
const cShade = new THREE.Color().setHex(0x34452e);

export interface GrassLayer {
  layer: TileLayer;
  material: PatchMaterial;
}

export function createGrassLayer(ctx: BuildContext, habitat: Habitat, shared: PatchShared): GrassLayer {
  const q = GRASS_Q[ctx.quality];
  const geometry = createGrassPatch(q.blades, 12345);
  const material = createPatchMaterial(ctx.sway, shared.pushers, shared.sun, {
    vertexColors: false,
    fadeStart: q.fadeStart,
    fadeEnd: q.fadeEnd,
    sizeComp: 1.75,
    power: 1.45,
    windAmp: 0.13,
    rootShade: 0.34,
    tipShade: 1.1,
  });
  const T = q.tile;
  const capacity = Math.ceil(T * T * q.density);
  const terrain = ctx.terrain;
  const S = newSample();
  const tint = new THREE.Color();
  const layer = new TileLayer({
    name: 'grass',
    tileSize: T,
    capacity,
    geometry,
    material: material.material,
    fadeStart: q.fadeStart,
    fadeEnd: q.fadeEnd,
    power: 1.45,
    maxHeight: 1.3,
    receiveShadow: q.shadows,
    generate(tx: number, tz: number, out: TileBuffers) {
      const rng = mulberry32(Math.floor(hash3(tx, tz, 101) * 4294967296));
      const x0 = tx * T;
      const z0 = tz * T;
      let n = 0;
      for (let k = 0; k < capacity; k++) {
        const x = x0 + rng() * T;
        const z = z0 + rng() * T;
        const uAccept = rng();
        const uRank = rng();
        const uYaw = rng();
        const uH = rng();
        const uC = rng();
        const uW = rng();
        habitat.sample(x, z, S);
        if (S.open < 0.04) continue;
        const patchy = fbm(x / 9, z / 9, 2, 5) * 0.5 + 0.5;
        let g = S.open * (1 - S.wood * 0.55) * (1 - 0.3 * S.dry) * (0.62 + 0.38 * smoothstep(0.1, 0.6, patchy));
        g = Math.min(1, g * 0.62);
        if (uAccept >= g) continue;
        if (habitat.hardBlocked(x, z, 0.35)) continue;
        const y = terrain.heightAt(x, z) - 0.04;
        // Height: tall and lush where it is wet, short in dry, shaded or steep ground, and trimmed at path edges.
        let hs = 0.78 + 0.5 * S.wet + 0.32 * (patchy - 0.5) - 0.22 * S.dry - 0.3 * S.wood - 0.3 * S.slope;
        hs *= 0.55 + 0.45 * smoothstep(0.08, 0.85, S.open);
        hs *= 0.82 + 0.36 * uH;
        hs = Math.max(0.38, Math.min(1.5, hs));
        // Colour: deep green by water, meadow green, gold on the sun-cured patches, cooler in the woods.
        tint.copy(cMeadow).lerp(cDeep, S.wet * 0.65).lerp(cGold, S.dry * 0.8).lerp(cShade, S.wood * 0.6);
        const j = 0.9 + uC * 0.2;
        const o = n * 4;
        out.base[o] = x;
        out.base[o + 1] = y;
        out.base[o + 2] = z;
        out.base[o + 3] = (k + uRank) / capacity;
        out.shape[o] = uYaw * Math.PI * 2;
        out.shape[o + 1] = 0.85 + uW * 0.6;
        out.shape[o + 2] = hs;
        out.shape[o + 3] = uC * 20;
        out.tint[o] = tint.r * j;
        out.tint[o + 1] = tint.g * (0.95 + uH * 0.1) * j;
        out.tint[o + 2] = tint.b * j;
        out.tint[o + 3] = 1 - S.wood * 0.85;
        if (y < out.ymin) out.ymin = y;
        if (y > out.ymax) out.ymax = y;
        n++;
      }
      return n;
    },
  });
  return { layer, material };
}
