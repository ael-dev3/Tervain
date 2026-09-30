import { fbm, smoothstep } from '../../world/noise';

/**
 * Where everything in the menu vigil stands. Metres, y up; the camera looks roughly toward -z, over a camp on a headland
 * and down to the sea. One place for the numbers, so the ground, the props and the tests agree.
 */

export const MENU_CAMERA = { x: 0.35, y: 1.62, z: 9.4, lookX: -0.3, lookY: 2.9, lookZ: -20, fov: 46 };

/** The warden's fire, beside the track. */
export const MENU_FIRE = { x: 4.3, z: 0.1 };
/** The ancient tree whose roots hold the hermit's door. */
export const MENU_TREE = { x: -10.5, z: -9.8 };
/** The single Hegemony standard (A24): one pole, one banner. */
export const MENU_BANNER = { x: 9.6, z: -8.2 };
/** Standing stones on the rise to the right. */
export const MENU_STONES = { x: 19.5, z: -31 };
/** Lantern Point, far off on its own headland, standing against the sunset. */
export const MENU_LIGHTHOUSE = { x: -160, z: -520 };

/** The cart track: a centreline from behind the camera, past the camp, to the brow. */
export const MENU_TRACK: [number, number][] = [
  [0.4, 18],
  [0.7, 8],
  [0.3, 1],
  [-0.9, -7],
  [-1.6, -15],
  [-0.4, -24],
  [1.8, -33],
  [3.4, -42],
];

/** Distance from (x, z) to the track centreline, and how far along it the nearest point lies (0..1). */
export function trackDistance(x: number, z: number): { d: number; t: number } {
  let best = Infinity;
  let bestT = 0;
  const n = MENU_TRACK.length - 1;
  for (let i = 0; i < n; i++) {
    const [ax, az] = MENU_TRACK[i]!;
    const [bx, bz] = MENU_TRACK[i + 1]!;
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const d = Math.hypot(x - (ax + dx * u), z - (az + dz * u));
    if (d < best) {
      best = d;
      bestT = (i + u) / n;
    }
  }
  return { d: best, t: bestT };
}

/** Where the headland breaks off toward the sea. Wanders a little, swings back on the right, far away on the wooded left. */
export function browZ(x: number): number {
  return -37 + 4 * Math.sin(x * 0.07 + 0.6) + 2 * Math.sin(x * 0.19) - Math.max(0, -x - 22) * 2.2 + Math.max(0, x - 34) * 0.9;
}

const gauss = (x: number, z: number, cx: number, cz: number, r2: number) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / r2);

/**
 * Ground height. A worn hilltop: it falls gently toward the sea, bulges into a knoll under the tree and a rise for the
 * stones, climbs into the wooded hill on the left, and drops off the brow into the sea. The track is sunk a hand's depth
 * with two deeper wheel ruts, and the camp has been trodden flat round the fire.
 */
export function menuHeight(x: number, z: number): number {
  let h = -0.052 * Math.max(0, 6 - z) - 0.1 * Math.max(0, -9 - z);
  h += 0.9 * smoothstep(-24, -52, x) + 0.05 * Math.max(0, -x - 30);
  h += 1.45 * gauss(x, z, MENU_TREE.x, MENU_TREE.z, 80);
  h += 2.4 * gauss(x, z, MENU_STONES.x, MENU_STONES.z, 150);
  h += fbm(x * 0.06, z * 0.06, 4, 11) * 0.7 + fbm(x * 0.35, z * 0.35, 3, 12) * 0.09 + fbm(x * 1.7, z * 1.7, 2, 13) * 0.025;
  // Trodden camp: pull toward a flat pan round the fire.
  const camp = gauss(x, z, MENU_FIRE.x - 0.6, MENU_FIRE.z, 14);
  h = h * (1 - camp * 0.55) + (-0.25) * camp * 0.55;
  // The track and its ruts, churned into lumps where carts and boots have worked the mud.
  const { d } = trackDistance(x, z);
  h -= 0.13 * (1 - smoothstep(0.9, 1.9, d));
  const churn = Math.max(1 - smoothstep(1.2, 2.4, d), camp * 1.6);
  h += Math.min(1, churn) * (fbm(x * 2.3, z * 2.3, 3, 14) * 0.045 + fbm(x * 5.1, z * 5.1, 2, 15) * 0.018);
  for (const off of [-0.72, 0.72]) h -= 0.085 * Math.exp(-((d - Math.abs(off)) ** 2) / 0.035);
  // The brow and the fall to the sea.
  const b = browZ(x);
  const over = smoothstep(b, b - 13, z);
  h = h * (1 - over) + (-42.5) * Math.pow(over, 1.25);
  return h;
}

/** Eight terrain layer weights (grass, heath, earth, gravel, sand, wet sand, rock, path) and a wetness value. */
export function menuSplat(x: number, z: number): { w: number[]; wet: number } {
  const w = [0, 0, 0, 0, 0, 0, 0, 0];
  const { d } = trackDistance(x, z);
  const patchy = fbm(x * 0.21, z * 0.21, 3, 21) * 0.5 + 0.5;
  const fine = fbm(x * 1.3, z * 1.3, 2, 22) * 0.5 + 0.5;
  // Heath and grass everywhere to begin with, heath on the drier high ground.
  const heath = 0.35 + 0.45 * patchy;
  w[0] = 1 - heath;
  w[1] = heath;
  // Track: churned earth, gravel pressed into the ruts, a worn path verge.
  const track = 1 - smoothstep(1.1, 2.2 + fine * 0.6, d);
  const rut = Math.max(Math.exp(-((d - 0.72) ** 2) / 0.05), 0);
  // Camp: trampled to mud round the fire, the log and the cart.
  const camp = Math.exp(-((x - (MENU_FIRE.x - 0.4)) ** 2 + (z - (MENU_FIRE.z + 0.2)) ** 2) / (6 + fine * 4));
  // The tree's feet: rock between the roots, dark earth and leaf litter.
  const roots = Math.exp(-((x - MENU_TREE.x) ** 2 + (z - MENU_TREE.z) ** 2) / 26);
  const stones = Math.exp(-((x - MENU_STONES.x) ** 2 + (z - MENU_STONES.z) ** 2) / 60);
  const mud = Math.max(track, camp * 0.95);
  let grass = w[0]! * (1 - mud);
  let heathW = w[1]! * (1 - mud);
  // Mud: trodden path earth and dark wet silt; the dry-cracked earth layer only at the tree's feet.
  let earth = mud * (0.22 + 0.2 * fine) + roots * 0.5;
  const path = mud * (0.55 + 0.2 * patchy);
  const silt = 0;
  const gravel = rut * track * 0.28 + camp * 0.05 + mud * 0.05;
  let rock = roots * 0.45 * smoothstep(0.35, 0.7, fine) + stones * 0.35 * smoothstep(0.3, 0.8, patchy);
  // The fall at the brow is bare rock and scree.
  const brow = smoothstep(browZ(x) + 1.5, browZ(x) - 3, z);
  rock += brow * 1.4;
  grass *= 1 - brow;
  heathW *= 1 - brow;
  earth *= 1 - brow * 0.5;
  const raw = [grass, heathW, earth, gravel, 0, silt, rock, path];
  let s = 0;
  for (const v of raw) s += v;
  for (let i = 0; i < 8; i++) w[i] = raw[i]! / Math.max(1e-6, s);
  const wet = Math.min(0.45, mud * (0.12 + 0.25 * fine) * (0.6 + 0.4 * patchy) + rut * track * 0.3 + camp * 0.08);
  return { w, wet };
}
