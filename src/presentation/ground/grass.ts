import * as THREE from 'three';
import { clamp, mulberry32, smoothstep } from '../../world/noise';
import type { BuildContext, Quality } from '../context';
import { GeoBuilder, type GV, type Vec3 } from './geoBuilder';
import { Habitat, hash3, newSample, woodlandColonyAt, type HabitatSample } from './habitat';
import { createPatchMaterial, type PatchMaterial } from './patchMaterial';
import { buildGrassClusterTexture } from './grassTexture';
import { TileLayer, type TileBuffers } from './tileStream';
import type { PatchShared } from './shared';

/**
 * Fine grass, herb and seed-head clusters, streamed on the existing rooted tile system.
 * Adapted from ael-dev3/Warpkeep src/components/realm/createLowPolyGrassGeometry.ts and
 * createRealmGrassMaterial.ts @786c0b2 (Apache-2.0), rewritten for a free camera at ground level.
 * The original folded-blade geometry is replaced by original Tervain painted cutouts and bent
 * supports. Several stems occupy each cutout; world population, exclusions and fades remain
 * deterministic, and the adapted shared wind/normal/colour treatment is retained. The wind/pusher
 * system is separate from paused attached tree foliage.
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

export const GRASS_Q: Readonly<Record<Quality, GrassQuality>> = {
  high: { blades: 9, density: 6.4, tile: 16, fadeStart: 12, fadeEnd: 96, shadows: true },
  medium: { blades: 7, density: 4.2, tile: 16, fadeStart: 10, fadeEnd: 80, shadows: true },
  low: { blades: 5, density: 2.0, tile: 16, fadeStart: 8, fadeEnd: 64, shadows: false },
};

/** Thin smoothly across the extended reach rather than enlarging the entire full-density meadow. */
export const GRASS_THINNING_POWER = 2.1;

const GRASS_SIZE_COMP = 1.12;
const GRASS_MAX_WIDTH_SCALE = 1.45;
const GRASS_MAX_HEIGHT_SCALE = 1.5;
const GRASS_WIND_AMP = 0.13;
const GROUND_SCALE_ENDPOINTS = [1, GRASS_SIZE_COMP] as const;

/** Bounds cover every blade after maximum instance scale, compensation, wind and pusher deformation. */
export function grassPatchBounds(geometry: THREE.BufferGeometry): { maxHeight: number; maxRadius: number } {
  const position = geometry.getAttribute('position');
  let radius = 0, height = 0;
  for (let i = 0; i < position.count; i++) {
    radius = Math.max(radius, Math.hypot(position.getX(i), position.getZ(i)));
    height = Math.max(height, position.getY(i));
  }
  // aBlade.w <= 1.16, primary + secondary <= 1.28, gust <= 1; pusher lateral offset <= 0.6 * 0.75.
  const wind = 1.28 * 1.16 * GRASS_WIND_AMP * GRASS_MAX_HEIGHT_SCALE * GRASS_SIZE_COMP * Math.hypot(1, 0.16);
  return {
    maxHeight: height * GRASS_MAX_HEIGHT_SCALE * GRASS_SIZE_COMP,
    maxRadius: radius * GRASS_MAX_WIDTH_SCALE * GRASS_SIZE_COMP + wind + 0.45,
  };
}

/** Several short herb clusters interlock beneath a few meadow stems. Supports are four
 * triangles, with an individual terrain-fitted foot at each edge; no free floating cards. */
export function createGrassPatch(blades: number, seed: number): THREE.BufferGeometry {
  const rng = mulberry32(seed), b = new GeoBuilder();
  const roots: number[] = [], uv: number[] = [];
  b.upBias = 0.42;
  const white: Vec3 = [1, 1, 1];
  const R = 0.37;
  for (let i = 0; i < blades; i++) {
    const r = R * Math.sqrt((i + 0.5) / blades) * (0.88 + rng() * 0.24);
    const a = i * 2.39996 + rng() * 0.6, rx = Math.cos(a) * r, rz = Math.sin(a) * r;
    const herb = i % 3 !== 0;
    const tile = herb ? i % 2 === 0 ? 2 : 0 : i % 4 === 0 ? 3 : 1;
    const yaw = a + rng() * 1.9, ax = Math.cos(yaw), az = Math.sin(yaw), fx = -az, fz = ax;
    const h = (herb ? 0.13 : 0.29) + rng() * (herb ? 0.11 : 0.14);
    const w = (herb ? 0.125 : 0.08) + rng() * 0.035;
    const lean = h * (0.15 + rng() * 0.28);
    b.phase = rng() * Math.PI * 2; b.stiff = 0.86 + rng() * 0.3;
    const rows: [GV, GV][] = [0, 0.5, 1].map(t => {
      const offset = lean * t * t, span = w * (1 - t * 0.16);
      const at = (sign: number): GV => ({ p: [rx + ax * span * sign + fx * offset, h * t, rz + az * span * sign + fz * offset], c: white, w: t });
      return [at(-1), at(1)];
    });
    const tx = tile % 2, ty = Math.floor(tile / 2);
    const paintUV = (u: number, v: number) => [(tx + 0.012 + u * 0.976) * 0.5, (ty + 0.012 + v * 0.976) * 0.5];
    for (let segment = 0; segment < 2; segment++) {
      const t0 = segment * 0.5, t1 = (segment + 1) * 0.5;
      const vertices = [rows[segment]![0], rows[segment]![1], rows[segment + 1]![1], rows[segment]![0], rows[segment + 1]![1], rows[segment + 1]![0]];
      b.tri(vertices[0]!, vertices[1]!, vertices[2]!); b.tri(vertices[3]!, vertices[4]!, vertices[5]!);
      const chart = [[0, t0], [1, t0], [1, t1], [0, t0], [1, t1], [0, t1]];
      for (const [across, t] of chart) {
        uv.push(...paintUV(across!, t!));
        const sign = across! * 2 - 1;
        // Each vertical side begins on the actual terrain below its own support edge.
        roots.push(rx + ax * w * sign, rz + az * w * sign);
      }
    }
  }
  const geometry = b.build();
  geometry.setAttribute('aRoot', new THREE.Float32BufferAttribute(roots, 2));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geometry;
}

const cMeadow = new THREE.Color().setHex(0x58634b);
const cDeep = new THREE.Color().setHex(0x46583d);
const cGold = new THREE.Color().setHex(0x75694e);
const cShade = new THREE.Color().setHex(0x45523c);

/** Under real crowns, grass yields to humus and fern colonies instead of becoming a pale verge ribbon. */
export interface GrassHabitatProfile { density: number; height: number; exposure: number; shade: number }
export function grassHabitatProfile(sample: Readonly<HabitatSample>, patchy: number, out: GrassHabitatProfile = { density: 0, height: 0, exposure: 0, shade: 0 }): GrassHabitatProfile {
  const shade = smoothstep(0.12, 0.8, sample.wood);
  const exposure = clamp(sample.dry, 0, 1) * (1 - shade * 0.94);
  const colony = smoothstep(0.2, 0.7, patchy);
  const density = clamp(sample.open * (1 - shade * 0.9) * (1 - exposure * 0.22) * (0.3 + colony * 0.7) * 0.62, 0, 1);
  const height = (0.78 + 0.44 * sample.wet + 0.32 * (patchy - 0.5) - 0.15 * exposure - 0.44 * shade - 0.3 * sample.slope)
    * (0.55 + 0.45 * smoothstep(0.08, 0.85, sample.open));
  out.density = density; out.height = height; out.exposure = exposure; out.shade = shade;
  return out;
}

export interface GrassLayer {
  layer: TileLayer;
  material: PatchMaterial;
}

export function createGrassLayer(ctx: BuildContext, habitat: Habitat, shared: PatchShared): GrassLayer {
  const q = GRASS_Q[ctx.quality];
  const geometry = createGrassPatch(q.blades, 12345);
  const texture = buildGrassClusterTexture();
  const material = createPatchMaterial(ctx.sway, shared.pushers, shared.sun, {
    vertexColors: false,
    cutoutMap: texture,
    fadeStart: q.fadeStart,
    fadeEnd: q.fadeEnd,
    sizeComp: GRASS_SIZE_COMP,
    power: GRASS_THINNING_POWER,
    windAmp: GRASS_WIND_AMP,
    rootShade: 0.43,
    tipShade: 0.92,
    terrain: ctx.terrain,
  });
  material.material.addEventListener('dispose', () => texture.dispose());
  const T = q.tile;
  const capacity = Math.ceil(T * T * q.density);
  const terrain = ctx.terrain;
  const S = newSample();
  const grassProfile: GrassHabitatProfile = { density: 0, height: 0, exposure: 0, shade: 0 };
  const tint = new THREE.Color();
  const rootAttribute = geometry.getAttribute('aRoot');
  const rootPoints: [number, number][] = [];
  let nativeRadius = 0;
  for (let i = 0; i < rootAttribute.count; i++) {
    const x = rootAttribute.getX(i), z = rootAttribute.getY(i);
    if (!rootPoints.some(p => p[0] === x && p[1] === z)) rootPoints.push([x, z]);
  }
  const vertices = geometry.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) nativeRadius = Math.max(nativeRadius, Math.hypot(vertices.getX(i), vertices.getZ(i)));
  const layer = new TileLayer({
    name: 'grass',
    tileSize: T,
    capacity,
    geometry,
    material: material.material,
    fadeStart: q.fadeStart,
    fadeEnd: q.fadeEnd,
    power: GRASS_THINNING_POWER,
    ...grassPatchBounds(geometry),
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
        const patchy = woodlandColonyAt(x, z);
        const profile = grassHabitatProfile(S, patchy, grassProfile);
        if (uAccept >= profile.density) continue;
        const width = 0.85 + uW * 0.6;
        if (habitat.hardBlocked(x, z, nativeRadius * width * GRASS_SIZE_COMP + 0.12)) continue;
        const y = terrain.heightAt(x, z) - 0.04;
        // Height: tall and lush where it is wet, short in dry, shaded or steep ground, and trimmed at path edges.
        let hs = profile.height;
        hs *= 0.82 + 0.36 * uH;
        hs = Math.max(0.38, Math.min(1.5, hs));
        // Colour: deep green by water, meadow green, gold on the sun-cured patches, cooler in the woods.
        tint.copy(cMeadow).lerp(cDeep, S.wet * 0.65).lerp(cGold, profile.exposure * 0.38).lerp(cShade, profile.shade * 0.84);
        const j = 0.9 + uC * 0.2;
        const o = n * 4;
        out.base[o] = x;
        out.base[o + 1] = y;
        out.base[o + 2] = z;
        out.base[o + 3] = (k + uRank) / capacity;
        const yaw = uYaw * Math.PI * 2;
        out.shape[o] = yaw;
        out.shape[o + 1] = width;
        out.shape[o + 2] = hs;
        out.shape[o + 3] = uC * 20;
        out.tint[o] = tint.r * j;
        out.tint[o + 1] = tint.g * (0.95 + uH * 0.1) * j;
        out.tint[o + 2] = tint.b * j;
        out.tint[o + 3] = 1 - S.wood * 0.85;
        // Conservative tile heights include the separately fitted blade roots at both distance-scale endpoints.
        // The intervening scale range spans under 12 cm; the normal stream sphere's extra 20 cm retains its ridges.
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        for (const root of rootPoints) for (const size of GROUND_SCALE_ENDPOINTS) {
          const rx = root[0] * width * size, rz = root[1] * width * size;
          const ry = terrain.heightAt(x + rx * cy + rz * sy, z - rx * sy + rz * cy) - 0.04;
          out.ymin = Math.min(out.ymin, ry);
          out.ymax = Math.max(out.ymax, ry);
        }
        n++;
      }
      return n;
    },
  });
  return { layer, material };
}
