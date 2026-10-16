import { mulberry32, clamp, lerp, smoothstep } from './rng.mjs';
import { add, sub, mul, norm, cross, madd, rot, dot, lerp3 } from './vec.mjs';

const TAU = Math.PI * 2;
const UP = [0, 1, 0];

/** Hand-picked variant recipes: the forest should not show four copies of one tree. */
export const VARIANTS = [
  { seed: 1101, height: 15.5, lean: 0.55, crown: 0.12, whorls: 14, rootCount: 5, bow: 0.55 },
  { seed: 2207, height: 19.0, snags: 2, lean: 0.4, crown: 0.25, whorls: 17, rootCount: 6, bow: 0.35 },
  { seed: 3313, height: 22.5, lean: 0.8, crown: 0.2, whorls: 18, rootCount: 4, bow: 0.8 },
  { seed: 4421, height: 17.0, snags: 1, lean: 0.5, crown: 0.15, whorls: 15, rootCount: 5, bow: 0.45 },
];

/**
 * The tree as data: a leaning trunk with root lobes, 14-18 whorls of 4-6 branches (dead stubs in the lower half,
 * living drooping limbs above, a flat umbrella top) and needle pads along each living limb. Every random choice is
 * made here once, so the near/mid/far meshes of one variant describe the same tree.
 */
export function makeSpec(recipe) {
  const rnd = mulberry32(recipe.seed);
  const H = recipe.height;
  const rb = 0.17 + 0.0118 * H; // radius at breast height
  const leanDir = rnd() * TAU;
  const w = [0, 1, 2, 3].map(() => rnd() * TAU);
  const A1 = 0.015 + 0.03 * rnd(), A2 = 0.01 + 0.02 * rnd();
  const wl1 = H * (0.38 + 0.2 * rnd()), wl2 = H * (0.16 + 0.1 * rnd());
  const center = (y) => {
    const t = clamp(y / H, 0, 1), ramp = smoothstep(0, 3.5, y);
    const lean = recipe.lean * Math.pow(t, 1.35);
    const wob = (ph1, ph2) => ramp * (A1 * Math.sin((TAU * y) / wl1 + ph1) + A2 * Math.sin((TAU * y) / wl2 + ph2));
    return [lean * Math.cos(leanDir) + wob(w[0], w[1]), lean * Math.sin(leanDir) + wob(w[2], w[3])];
  };
  const radius = (y) => {
    const t = clamp((y - 1.3) / (H - 1.3), 0, 1);
    const taper = rb * (1 - 0.86 * Math.pow(t, 0.8)) + 0.03 * (1 - t);
    const flare = y < 1.3 ? 1 + 0.42 * Math.exp(-Math.max(y, 0) / 0.55) : 1;
    return Math.max(0.03, taper * flare);
  };
  // root lobes
  const rootCount = recipe.rootCount;
  const rootBase = rnd() * TAU;
  const roots = [];
  for (let i = 0; i < rootCount; i++) {
    const theta = rootBase + (i + (rnd() - 0.5) * 0.5) * (TAU / rootCount);
    roots.push({
      theta, reach: rb * (1.9 + 1.5 * rnd()), top: 0.55 + 0.7 * rnd(), width: 0.9 + 0.5 * rnd(),
      wiggle: (rnd() - 0.5) * 0.7, major: true, seed: Math.floor(rnd() * 1e9),
    });
  }
  for (let i = 0; i < 2; i++) {
    const gap = rnd() * rootCount;
    roots.push({
      theta: rootBase + (Math.floor(gap) + 0.5) * (TAU / rootCount), reach: rb * (1.5 + 1.4 * rnd()), top: 0.3 + 0.2 * rnd(),
      width: 0.45, wiggle: (rnd() - 0.5) * 0.9, major: false, seed: Math.floor(rnd() * 1e9),
    });
  }

  // whorls
  const W = recipe.whorls;
  const yStart = 0.17 * H, yEnd = 0.965 * H;
  const deadTop = 0.44 * H + (rnd() - 0.5) * 0.04 * H;
  const spin = rnd() * TAU;
  const whorls = [];
  for (let i = 0; i < W; i++) {
    const u = Math.pow(i / (W - 1), 0.9);
    const y = lerp(yStart, yEnd, u) + (rnd() - 0.5) * 0.25;
    whorls.push({ y, n: 4 + Math.floor(rnd() * 3), spin: spin + i * 2.399 + rnd() * 0.5 });
  }
  const crownBase = deadTop, crownSpan = H * 0.965 - crownBase;
  const branches = [];
  let id = 0;
  const Lmax = H * (0.24 + 0.04 * recipe.crown) + 0.4;
  for (const wh of whorls) {
    for (let k = 0; k < wh.n; k++) {
      const theta = wh.spin + (k + (rnd() - 0.5) * 0.7) * (TAU / wh.n);
      const y = wh.y + (rnd() - 0.5) * 0.45;
      const dead = y < deadTop;
      const t = clamp((y - crownBase) / crownSpan, 0, 1);
      if (dead) {
        const q = rnd();
        if (q < 0.3) {
          // a short tapered stub near the trunk
          branches.push({ id: id++, y, theta, dead: true, L: 0.18 + 0.22 * rnd(), phase: rnd() * TAU, e0: -0.1 + 0.3 * (rnd() - 0.5), droop: 0.25, tipUp: 0, yaw: 0, pads: [], seed: Math.floor(rnd() * 1e9) });
        } else if (q < 0.7 && y > 0.24 * H) {
          // a short, drooping needled spur instead of a bare stick
          branches.push({ id: id++, y, theta, dead: false, spur: true, L: 0.9 + 0.8 * rnd(), phase: rnd() * TAU, e0: -0.05, droop: 0.8 + 0.4 * rnd(), tipUp: 0, yaw: (rnd() - 0.5) * 0.8, laterals: 0, upper: false, lowerCount: 1, padScale: 1.8 + 0.5 * rnd(), pads: [], seed: Math.floor(rnd() * 1e9) });
        }
        continue;
      }
      if (rnd() < 0.07) continue;
      // crown profile: a rounded cone blends into a wide, flat umbrella
      const conic = 0.32 + 0.68 * Math.sin(Math.PI * Math.pow(0.1 + 0.9 * t, 0.62)) ;
      const umbrella = 0.4 + 0.6 * Math.sin(Math.PI * clamp(0.12 + 0.5 * t, 0, 1));
      const flatTop = t > 0.9 ? 1 - 0.3 * (t - 0.9) / 0.1 : 1;
      const prof = 0.16 + 0.84 * Math.pow(1 - t, 0.8) * (t < 0.12 ? 0.9 + 0.1 * t / 0.12 : 1);   // a cone: widest low in the crown, narrowing to a spire
      const L = Lmax * 0.75 * prof * (0.72 + 0.5 * rnd()) * (y > 0.9 * H ? 0.8 : 1);
      const lowness = 1 - t;
      branches.push({
        id: id++, y, theta, dead: false, L,
        phase: rnd() * TAU,
        e0: lerp(0.3, -0.1, lowness) + (rnd() - 0.5) * 0.25,
        droop: (0.08 + 0.5 * lowness * lowness + 0.12 * lowness) * (0.8 + 0.4 * rnd()) * (0.6 + recipe.bow * 0.7),
        tipUp: (0.55 + 1.2 * recipe.crown * t) * (0.7 + 0.6 * rnd()),
        yaw: (rnd() - 0.5) * 2.2 * (0.6 + 0.8 * rnd()), wave: 0.12 + 0.2 * rnd(), wavePhase: rnd() * TAU,
        twist: (rnd() - 0.5) * 1.6,
        laterals: t > 0.4 ? 1 + Math.floor(rnd() * 2) : 0, upper: t > 0.45, lowerCount: rnd() < 0.5 ? 1 : 2,
        padScale: (2.6 + 1.5 * clamp(L / 5.0, 0, 1)) * (0.55 + 0.45 * prof) * (0.9 + 0.3 * rnd()),
        pads: [], seed: Math.floor(rnd() * 1e9),
      });
    }
  }
  // Dead snags: the lowest living limbs of some variants died back to long bare spars.
  { let n = recipe.snags ?? 0; for (const b of branches) { if (n <= 0) break; if (b.dead || b.spur || b.y < deadTop + 0.8 || b.y > deadTop + 3.2) continue; b.dead = true; b.snag = true; b.L = 2.4 + 1.4 * rnd(); b.e0 = 0.12; b.droop = 0.1; b.pads = []; n--; } }
  return {
    recipe, H, rb, center, radius, roots, branches, deadTop,
    trunkPhase: rnd() * TAU, barkU: rnd(), barkV: rnd() * 4, U: 2,
    crownCentre: null, seed: recipe.seed,
  };
}
export { UP };
