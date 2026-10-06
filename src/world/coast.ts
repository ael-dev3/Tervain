import { clamp, fbm, lerp, ridged, smoothstep } from './noise';
import { COAST, COAST_SHELVES, LIGHTHOUSE, SEA_LEVEL } from './layout';

/**
 * The west coast: a beach with dunes on the Grey Strand, rock and cliff to the north and around Lantern Point. Everything
 * here is a pure function of position so terrain, water, ground colour and prop placement all read one shoreline.
 */

const P = COAST;

/** Cubic Hermite (Catmull-Rom) through the mean waterline, then a little noise so the edge is never a clean curve. */
export function coastX(z: number): number {
  const n = P.length;
  if (z <= P[0]!.z) return P[0]!.x + shoreNoise(z);
  if (z >= P[n - 1]!.z) return P[n - 1]!.x + shoreNoise(z);
  let i = 0;
  while (i < n - 2 && z > P[i + 1]!.z) i++;
  const p0 = P[Math.max(0, i - 1)]!;
  const p1 = P[i]!;
  const p2 = P[i + 1]!;
  const p3 = P[Math.min(n - 1, i + 2)]!;
  const t = (z - p1.z) / (p2.z - p1.z);
  const h = p2.z - p1.z;
  const m1 = ((p2.x - p0.x) / (p2.z - p0.z)) * h;
  const m2 = ((p3.x - p1.x) / (p3.z - p1.z)) * h;
  const t2 = t * t;
  const t3 = t2 * t;
  const x = (2 * t3 - 3 * t2 + 1) * p1.x + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2.x + (t3 - t2) * m2;
  return x + shoreNoise(z);
}

function shoreNoise(z: number) {
  return 3.4 * fbm(z / 24, 1.7, 3, 61) + 1.2 * fbm(z / 7, 8.4, 2, 62);
}

/** Grassy bench cover shared by physical terrain and its surface paint. The noisy radius breaks a smooth oval lip. */
export function coastalShelfAt(x: number, z: number): number {
  let cover = 0;
  for (const shelf of COAST_SHELVES) {
    const d = Math.hypot((x - shelf.x) / shelf.rx, (z - shelf.z) / shelf.rz)
      + fbm(x / 12, z / 14, 2, 211) * 0.075;
    cover = Math.max(cover, 1 - smoothstep(1 - shelf.edge, 1, d));
  }
  return cover;
}

/** Height of the original bench tops. Cut roads and source-tree grounding still sample the final physical grid. */
export function coastalShelfHeight(x: number, z: number): number {
  let height = 0;
  for (const shelf of COAST_SHELVES) {
    const d = Math.hypot((x - shelf.x) / shelf.rx, (z - shelf.z) / shelf.rz)
      + fbm(x / 12, z / 14, 2, 211) * 0.075;
    height = Math.max(height, shelf.height * (1 - smoothstep(1 - shelf.edge, 1, d)));
  }
  return height;
}

/** Signed distance from the waterline: negative in the sea, positive on land (measured along x, which is good enough here). */
export const shoreDistance = (x: number, z: number) => x - coastX(z);

/** 0 on the sandy strand, 1 where the shore is rock and cliff (north of the strand and around Lantern Point). */
export function cliffiness(z: number): number {
  const north = 1 - smoothstep(-116, -65, z);
  const south = smoothstep(72, 90, z);
  return clamp(Math.max(north, south), 0, 1);
}

/** Depth of the sea bed below sea level at distance d out from the shore (d >= 0), beach shape. */
const beachBed = (d: number) => Math.min(20, 0.06 * d + 0.0011 * d * d);
const cliffBed = (d: number) => Math.min(22, 0.42 * d + 0.0025 * d * d);

/**
 * Ground height in the band where the sea meets the land, and how strongly it should replace the inland ground.
 * `inland` is the height the ground would have without a coast; the return value is the final height.
 */
export function shapeCoast(x: number, z: number, inland: number): number {
  const sd = shoreDistance(x, z);
  const cl = cliffiness(z);
  const rocks = ridged(x / 9, z / 9, 3, 71);
  if (sd <= 0) {
    const d = -sd;
    // Rock shoals break the sea bed near cliffs and the headland.
    const bed = lerp(beachBed(d), cliffBed(d), cl) - cl * (1.6 * rocks * (1 - smoothstep(0, 26, d)));
    return SEA_LEVEL - bed;
  }
  // Sand: rises to a berm, drops to the dune slack, then the dunes and heath.
  const dunes = fbm(x / 13, z / 15, 3, 73);
  const berm = 0.07 * sd * (1 - smoothstep(7, 15, sd)) + 1.05 * smoothstep(7, 15, sd);
  const dune = smoothstep(23, 34, sd) * (0.55 + 0.9 * (dunes * 0.5 + 0.5)) * (1 - smoothstep(42, 62, sd));
  const sand = Math.min(inland + 0.4, berm + dune) + 0.12 * fbm(x / 3.2, z / 3.2, 2, 75);
  // Rock: a steep lip out of the water, cut into crags, joining the inland ground about 18 m back.
  const lip = 0.9 + 0.7 * sd + 4.5 * rocks * smoothstep(1, 9, sd);
  const rock = lerp(lip, inland, smoothstep(6, 22, sd));
  const shore = lerp(sand, rock, cl);
  const beach = lerp(shore, inland, smoothstep(cl > 0.5 ? 12 : 40, cl > 0.5 ? 30 : 64, sd));
  const shelf = coastalShelfHeight(x, z) * smoothstep(14, 23, sd);
  return Math.max(beach, shelf + 0.16 * fbm(x / 8, z / 9, 2, 213) * coastalShelfAt(x, z));
}

/** The rocky knob the lighthouse stands on, rising out of the headland. */
export function lighthouseRock(x: number, z: number): number {
  const d = Math.hypot(x - LIGHTHOUSE.x, z - LIGHTHOUSE.z) / LIGHTHOUSE.rockR;
  const n = 0.75 + 0.5 * ridged(x / 11, z / 11, 3, 77);
  // A broad weathered cap above a steeper foot gives the tower a headland, rather than a smooth cone.
  return LIGHTHOUSE.rockH * n * (1 - smoothstep(0.46, 1, d));
}

/** 0..1 how wet the ground is from the sea (wet sand line, spray on the rocks). */
export function seaWetness(x: number, z: number): number {
  const sd = shoreDistance(x, z);
  return 1 - smoothstep(-2, 5.5 + 2.5 * fbm(x / 6, z / 6, 2, 79), sd);
}
