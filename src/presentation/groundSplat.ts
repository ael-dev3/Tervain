import { cliffiness, coastalShelfAt, seaWetness, shoreDistance } from '../world/coast';
import { FIELDS, SEA_LEVEL, STREAMS } from '../world/layout';
import { clamp, fbm, smoothstep } from '../world/noise';
import { distToPolyline, roadWeight, type Terrain } from '../world/terrain';
import { LAYER } from './terrainTextures';
import { deepwoodCover } from '../world/forest';
import type { PlantedCrownField } from './plantedCrowns';
import { biomeAt, type BiomeSample } from '../world/biomes';

/**
 * What the ground is made of at a point: eight layer weights (summing to 1) and a wetness. Everything comes from the
 * terrain itself (height, slope, water, shore) plus the authored roads and fields, so the ground colour always agrees with the
 * shape: rock on steep faces and cliffs, sand and wet sand along the strand, gravel and mud in stream beds, worn earth on
 * the tracks, dry heath on the exposed high ground and greener grass in the damp hollows.
 */

const NL = 8;

export function streamDistance(x: number, z: number): number {
  let d = Infinity;
  for (const s of STREAMS) d = Math.min(d, distToPolyline(x, z, s.points).d);
  return d;
}

function inField(x: number, z: number) {
  for (const f of FIELDS) {
    const dx = x - f.x;
    const dz = z - f.z;
    const lx = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
    const lz = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
    if (Math.abs(lx) < f.w / 2 && Math.abs(lz) < f.d / 2) return f;
  }
  return null;
}

/** Scale everything already there by (1 - a) and give the freed share to `layer`. */
function blend(w: Float32Array, layer: number, a: number) {
  if (a <= 0) return;
  const k = 1 - Math.min(1, a);
  for (let i = 0; i < NL; i++) w[i]! *= k;
  w[layer]! += Math.min(1, a);
}

/** Fills `w` (length 8) and returns the wetness. */
export function groundSplat(terrain: Terrain, x: number, z: number, w: Float32Array, crowns?: PlantedCrownField, sampledBiome?: Readonly<BiomeSample>): number {
  const h = terrain.heightAt(x, z);
  const slope = terrain.slopeAt(x, z);
  const carve = terrain.carveAt(x, z);
  const nLow = fbm(x / 40, z / 40, 3, 21) * 0.5 + 0.5;
  const nMid = fbm(x / 11, z / 11, 3, 23) * 0.5 + 0.5;
  const nHi = fbm(x / 3.3, z / 3.3, 2, 27) * 0.5 + 0.5;
  const sd = shoreDistance(x, z);
  const nearSea = sd < 90;
  const cl = nearSea ? cliffiness(z) : 0;
  const sDist = streamDistance(x, z);
  const wetStream = 1 - smoothstep(0.5, 7, sDist);
  const biome = sampledBiome ?? biomeAt(x, z);

  w.fill(0);
  // Damp hollows and stream banks are lush; exposed, high or windy ground is dry heath.
  const wood = crowns ? crowns.coverAt(x, z) : deepwoodCover(x, z);
  const lush = Math.max(wood * 0.78, clamp(0.28 + 0.95 * wetStream + (nLow - 0.5) * 1.1 - smoothstep(8, 40, h) * 0.5
    + biome.moisture * 0.32 - biome.exposure * 0.3, 0, 1));
  w[LAYER.grass] = lush;
  w[LAYER.heath] = 1 - lush;

  // Bare patches of earth in the open, gravel where the ground is broken.
  blend(w, LAYER.earth, smoothstep(0.62, 0.8, nMid) * 0.55);
  // Moss islands and humus beneath the canopy, rather than the exposed heath's straw base.
  blend(w, LAYER.earth, wood * (0.36 + 0.36 * nMid));
  blend(w, LAYER.gravel, smoothstep(0.28, 0.5, slope) * 0.55 * nMid + smoothstep(0.78, 0.9, nHi) * 0.25);

  // Soil changes with the same regional field that selects the trees. Damp broadleaf bodies
  // have dark green soil gaps; cool ridges keep humus and broken stone; warm ochre woods expose
  // their brown earth. None of these fertility cues marks the surface physically wet.
  blend(w, LAYER.grass, biome.weights['humid-broadleaf'] * (0.12 + nLow * 0.1));
  blend(w, LAYER.earth, biome.weights['cool-fir-ridge'] * (0.2 + nMid * 0.14));
  blend(w, LAYER.gravel, biome.weights['cool-fir-ridge'] * smoothstep(0.12, 0.4, slope) * 0.16);
  blend(w, LAYER.earth, biome.weights['ochre-woodland'] * (0.18 + nMid * 0.16));
  blend(w, LAYER.heath, biome.weights['ochre-woodland'] * (0.1 + nHi * 0.1));
  blend(w, LAYER.sand, biome.weights['sheltered-palms'] * (0.22 + nMid * 0.28));

  // The coast: sand above the tide line, wet sand at the water, rock and shingle on the headlands.
  let wet = 0;
  if (nearSea) {
    const shelf = coastalShelfAt(x, z);
    const sandEnd = 31 + 10 * (nMid - 0.4) + 5 * nHi;
    const sand = (1 - cl) * (1 - smoothstep(sandEnd * 0.76, sandEnd, sd)) * smoothstep(-40, 0.5, sd)
      * (1 - smoothstep(2, 4.2, h));
    blend(w, LAYER.sand, sand);
    // Low wind-cut grassy caps, exposed mineral faces and a narrow rubble toe share actual elevation/slope.
    blend(w, LAYER.grass, shelf * smoothstep(2.2, 5, h) * (1 - smoothstep(0.35, 0.7, slope)) * 0.74);
    blend(w, LAYER.gravel, shelf * smoothstep(0.25, 0.8, slope) * (1 - smoothstep(0.9, 1.3, slope)) * 0.34);
    // Shingle band behind the wet sand, and around rocks.
    blend(w, LAYER.gravel, (1 - cl) * smoothstep(3, 6, sd) * (1 - smoothstep(6, 11, sd)) * nHi * 0.7);
    // Horizontal distance alone marks the entire lighthouse cliff as soaked. Only the actual tidal/splash band is wet;
    // elevated stone remains dry even when it stands directly above the shoreline.
    const splash = 1 - smoothstep(0.55, 2.4, h - SEA_LEVEL);
    const sw = seaWetness(x, z) * splash;
    wet = sw;
    blend(w, LAYER.wetsand, sw * (1 - cl * 0.85));
    // The raised lighthouse outcrop reaches seaward of the approximate horizontal coastline. Only genuinely submerged
    // ground is seabed: a positive-height cliff there must keep its dry surface and the same elevation-limited splash mask.
    if (sd < 0 && h <= SEA_LEVEL) {
      w.fill(0);
      w[LAYER.sand] = 1 - smoothstep(-6, -14, sd) * 0.4;
      w[LAYER.gravel] = smoothstep(-6, -14, sd) * 0.4 + cl * 0.4;
      w[LAYER.wetsand] = 0.0;
      let s = 0;
      for (let i = 0; i < NL; i++) s += w[i]!;
      for (let i = 0; i < NL; i++) w[i]! /= s;
      wet = 1;
    }
  }

  // Cultivated ground.
  if (inField(x, z)) blend(w, LAYER.earth, 0.8);

  // Bed of a watercourse: mud and gravel, wet whether or not water runs over it.
  if (carve > 0.03) {
    const c = clamp(carve * 1.6, 0, 1);
    blend(w, LAYER.earth, c * 0.6);
    blend(w, LAYER.gravel, c * 0.4);
    wet = Math.max(wet, c * 0.7);
  } else wet = Math.max(wet, wetStream * 0.22);

  // Rock: steep faces, high ground, and the cliffs where the sea meets the headlands.
  const rock = smoothstep(0.66, 1.05, slope) + smoothstep(22, 46, h) * 0.8 + cl * (1 - smoothstep(8, 26, sd)) * (sd > 0 ? 0.9 : 0);
  blend(w, LAYER.rock, clamp(rock, 0, 1));

  // Worn tracks keep their authored centre. Only the visual shoulders fray into the same earth
  // and herb mat as their surroundings; path / collider geometry is never moved by this noise.
  const road = roadWeight(x, z);
  if (road > 0) {
    const centre = smoothstep(0.55, 0.9, road);
    const shoulder = 0.74 + nHi * 0.26;
    blend(w, LAYER.earth, road * (1 - centre) * (0.18 + wood * 0.2));
    blend(w, LAYER.path, road * (0.92 * centre + shoulder * (1 - centre)));
  }

  let sum = 0;
  for (let i = 0; i < NL; i++) sum += w[i]!;
  if (sum > 0) for (let i = 0; i < NL; i++) w[i]! /= sum;
  return clamp(wet, 0, 1);
}
