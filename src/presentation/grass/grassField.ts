import * as THREE from 'three';
import { clamp, mulberry32, smoothstep } from '../../world/noise';
import type { Terrain } from '../../world/terrain';
import type { Quality } from '../context';
import { hash3, woodlandColonyAt, type Habitat, type HabitatSample, newSample } from '../ground/habitat';
import { TileLayer, type TileBuffers } from '../ground/tileStream';
import { clumpTriangles, createGrassClump, type ClumpSpec } from './bladeGeometry';
import { createGrassMaterial, type GrassBand, type GrassMaterial } from './grassMaterial';
import type { GrassTrample } from './trample';
import type { GrassWind } from './wind';

/**
 * The realm's grass: individual blades in clumps, streamed in tiles around the camera at two levels of detail. Near the
 * player, clumps of many four-segment blades; further out, fewer and wider two-segment blades. The two hand over across a
 * distance band without a seam. Where grass grows, how tall and what colour comes from the shared habitat (ground/
 * habitat.ts), so it agrees with the terrain colouring, the trees' shade, paths, water and everything placed in the world.
 */

export interface GrassLevel {
  clump: ClumpSpec;
  /** Blade width at scale 1 (m): the far level's blades are wider, standing in for the ones it leaves out. */
  width: number;
  /** Clumps per square metre at full density, and the tile size (m). */
  density: number;
  tile: number;
  /** Thinning (start, end, far width compensation, power) and the band this level draws in. */
  fade: { start: number; end: number; sizeComp: number; power: number };
  band: GrassBand;
  farBlades: number;
}

export interface GrassQualitySpec {
  near: GrassLevel;
  far: GrassLevel;
  /** Interaction field texels and metres covered (0: none). */
  trample: { size: number; extent: number };
  shadows: boolean;
}

/** Clump radius and blade height (m) at scale 1, shared by both levels so they match where they meet. */
export const GRASS_CLUMP = { radius: 0.3, height: 0.5 } as const;
/** Largest height and radius scales a clump is sown with (the profile's tallest times the per-clump jitter). */
export const GRASS_MAX_SCALE = { height: 1.6 * 1.18, radius: 1.3 } as const;

export const GRASS_QUALITY: Readonly<Record<Quality, GrassQualitySpec>> = {
  high: {
    near: { clump: { blades: 18, segments: 4 }, width: 0.034, density: 4.2, tile: 12, fade: { start: 40, end: 41, sizeComp: 1, power: 1 }, band: { inStart: -2, inEnd: -1, outStart: 15, outEnd: 21 }, farBlades: 1 },
    far: { clump: { blades: 12, segments: 2 }, width: 0.055, density: 2.1, tile: 24, fade: { start: 24, end: 82, sizeComp: 2.1, power: 1.35 }, band: { inStart: 15, inEnd: 21, outStart: 1e5, outEnd: 1e5 + 1 }, farBlades: 0.5 },
    trample: { size: 256, extent: 48 },
    shadows: true,
  },
  medium: {
    near: { clump: { blades: 14, segments: 3 }, width: 0.038, density: 3.0, tile: 12, fade: { start: 34, end: 35, sizeComp: 1, power: 1 }, band: { inStart: -2, inEnd: -1, outStart: 12, outEnd: 17 }, farBlades: 1 },
    far: { clump: { blades: 10, segments: 2 }, width: 0.06, density: 1.4, tile: 24, fade: { start: 20, end: 66, sizeComp: 2.2, power: 1.35 }, band: { inStart: 12, inEnd: 17, outStart: 1e5, outEnd: 1e5 + 1 }, farBlades: 0.5 },
    trample: { size: 128, extent: 40 },
    shadows: true,
  },
  low: {
    near: { clump: { blades: 10, segments: 3 }, width: 0.045, density: 1.9, tile: 12, fade: { start: 26, end: 27, sizeComp: 1, power: 1 }, band: { inStart: -2, inEnd: -1, outStart: 9, outEnd: 13 }, farBlades: 1 },
    far: { clump: { blades: 8, segments: 2 }, width: 0.07, density: 0.9, tile: 24, fade: { start: 14, end: 48, sizeComp: 2.2, power: 1.3 }, band: { inStart: 9, inEnd: 13, outStart: 1e5, outEnd: 1e5 + 1 }, farBlades: 0.55 },
    trample: { size: 64, extent: 28 },
    shadows: false,
  },
};

/** What the habitat makes of the grass at a point: how much grows, how tall, how dry, how much flowers. */
export interface MeadowProfile { density: number; height: number; dry: number; flowers: number; shade: number }

/**
 * Lush in open, damp ground; golden and shorter where the soil is sun-cured; thin, short and dark under crowns; trimmed
 * along paths and on steep ground. Patches of a slow colony field keep a meadow from being evenly mown.
 */
export function meadowProfile(sample: Readonly<HabitatSample>, patchy: number, out: MeadowProfile = { density: 0, height: 0, dry: 0, flowers: 0, shade: 0 }): MeadowProfile {
  const shade = smoothstep(0.1, 0.78, sample.wood);
  const dry = clamp(sample.dry, 0, 1) * (1 - shade * 0.9);
  const colony = smoothstep(0.15, 0.75, patchy);
  out.density = clamp(sample.open * (1 - shade * 0.86) * (0.62 + 0.38 * colony) * (1 - dry * 0.12), 0, 1);
  out.height = clamp((0.92 + 0.5 * sample.wet - 0.32 * dry - 0.5 * shade - 0.45 * sample.slope + 0.34 * (patchy - 0.5))
    * (0.4 + 0.6 * smoothstep(0.1, 0.8, sample.open)), 0.25, 1.6);
  out.dry = clamp(dry * 0.8 + 0.12, 0, 0.92);
  out.flowers = clamp(0.03 + 0.09 * colony * (1 - shade) * (1 - dry * 0.5) + 0.05 * dry, 0, 0.2);
  out.shade = shade;
  return out;
}

const cMeadow = new THREE.Color().setHex(0x55663f);
const cLush = new THREE.Color().setHex(0x40592f);
const cGold = new THREE.Color().setHex(0x86764a);
const cShade = new THREE.Color().setHex(0x3d4c34);

export function meadowTint(sample: Readonly<HabitatSample>, profile: Readonly<MeadowProfile>, out: THREE.Color): THREE.Color {
  return out.copy(cMeadow).lerp(cLush, sample.wet * 0.7).lerp(cGold, profile.dry * 0.55).lerp(cShade, profile.shade * 0.85);
}

export interface GrassField {
  group: THREE.Group;
  layers: TileLayer[];
  materials: GrassMaterial[];
  update(camera: THREE.Vector3): void;
  stats(): { instances: number; triangles: number; draws: number; tiles: number };
  dispose(): void;
}

/**
 * Bounds every blade can reach, from the shader's own extremes: the tallest stem (its random length at most 1.35 of the
 * clump height, a seed stem 1.32 times longer), bent flat in any direction from the outermost root, and half the widest
 * blade the distance compensation can draw.
 */
export function grassReach(level: Pick<GrassLevel, 'width' | 'fade' | 'farBlades'>, clump: { radius: number; height: number } = GRASS_CLUMP): { maxHeight: number; maxRadius: number } {
  const height = clump.height * GRASS_MAX_SCALE.height * 1.35 * 1.32;
  const comp = Math.max(1, level.fade.sizeComp) * (1 + (1 / Math.max(Math.min(1, level.farBlades), 0.3) - 1) * 0.5);
  const root = clump.radius * GRASS_MAX_SCALE.radius * 1.28;
  return { maxHeight: height, maxRadius: root + height + 0.5 * level.width * 1.35 * comp };
}

export function createGrassField(terrain: Terrain, habitat: Habitat, quality: Quality, wind: GrassWind, trample: GrassTrample | null): GrassField {
  const spec = GRASS_QUALITY[quality];
  const group = new THREE.Group();
  group.name = 'grass';
  const look = { rootShade: 0.34, tipLift: 0.3, translucency: 1.1, sheen: 0.34, transTint: new THREE.Color(1.1, 1.22, 0.6) };
  const materials: GrassMaterial[] = [];
  const layers: TileLayer[] = [];
  const S = newSample();
  const profile: MeadowProfile = { density: 0, height: 0, dry: 0, flowers: 0, shade: 0 };
  const tint = new THREE.Color();
  for (const [name, level] of [['grass-near', spec.near], ['grass-far', spec.far]] as const) {
    const material = createGrassMaterial({
      wind, trample, look, farBlades: level.farBlades, band: level.band, fade: level.fade,
      clump: { ...GRASS_CLUMP, width: level.width, blades: level.clump.blades },
    });
    materials.push(material);
    const T = level.tile;
    const capacity = Math.ceil(T * T * level.density);
    const layer = new TileLayer({
      name, tileSize: T, capacity, geometry: createGrassClump(level.clump), material: material.material,
      fadeStart: level.fade.start, fadeEnd: level.fade.end, power: level.fade.power,
      ...grassReach(level), receiveShadow: spec.shadows,
      band: { start: level.band.inStart, end: level.band.outEnd },
      generate(tx: number, tz: number, out: TileBuffers) {
        // The same seed for both levels: where they overlap they stand on the same patches of ground.
        const rng = mulberry32(Math.floor(hash3(tx * T, tz * T, 707) * 4294967296));
        const x0 = tx * T, z0 = tz * T;
        let n = 0;
        for (let k = 0; k < capacity; k++) {
          const x = x0 + rng() * T, z = z0 + rng() * T;
          const uAccept = rng(), uRank = rng(), uYaw = rng(), uH = rng(), uC = rng(), uW = rng(), uSeed = rng();
          habitat.sample(x, z, S);
          if (S.open < 0.04) continue;
          meadowProfile(S, woodlandColonyAt(x, z), profile);
          if (uAccept >= profile.density) continue;
          const radius = 0.8 + uW * (GRASS_MAX_SCALE.radius - 0.8);
          if (habitat.hardBlocked(x, z, GRASS_CLUMP.radius * radius + 0.08)) continue;
          const y = terrain.heightAt(x, z) - 0.02;
          const e = 0.35;
          const gx = (terrain.heightAt(x + e, z) - terrain.heightAt(x - e, z)) / (2 * e);
          const gz = (terrain.heightAt(x, z + e) - terrain.heightAt(x, z - e)) / (2 * e);
          meadowTint(S, profile, tint);
          const j = 0.9 + uC * 0.2, o = n * 4;
          out.base[o] = x; out.base[o + 1] = y; out.base[o + 2] = z; out.base[o + 3] = (k + uRank) / capacity;
          out.shape[o] = uYaw * Math.PI * 2; out.shape[o + 1] = radius; out.shape[o + 2] = profile.height * (0.82 + (GRASS_MAX_SCALE.height / 1.6 - 0.82) * uH); out.shape[o + 3] = uSeed;
          out.tint[o] = tint.r * j; out.tint[o + 1] = tint.g * (0.95 + uH * 0.1) * j; out.tint[o + 2] = tint.b * j; out.tint[o + 3] = 1 - S.wood * 0.85;
          out.slope[o] = gx; out.slope[o + 1] = gz; out.slope[o + 2] = profile.dry; out.slope[o + 3] = profile.flowers;
          out.ymin = Math.min(out.ymin, y - GRASS_CLUMP.radius * 1.5 * Math.hypot(gx, gz));
          out.ymax = Math.max(out.ymax, y + GRASS_CLUMP.radius * 1.5 * Math.hypot(gx, gz));
          n++;
        }
        return n;
      },
    });
    layers.push(layer);
    group.add(layer.group);
  }
  return {
    group, layers, materials,
    update(camera) {
      const ok = materials.every((m) => m.ok());
      for (const layer of layers) { layer.enabled = ok; layer.update(camera); }
    },
    stats() {
      let instances = 0, triangles = 0, draws = 0, tiles = 0;
      layers.forEach((layer, i) => {
        const level = i === 0 ? spec.near : spec.far;
        instances += layer.visibleInstances;
        triangles += layer.visibleInstances * clumpTriangles(level.clump);
        draws += layer.drawCalls;
        tiles += layer.activeTiles;
      });
      return { instances, triangles, draws, tiles };
    },
    dispose() {
      for (const layer of layers) layer.dispose();
    },
  };
}
