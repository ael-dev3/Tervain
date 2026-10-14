import { Layer, drawLeaf, drawStroke, rng, mix, clamp, finish } from './raster.mjs';

/**
 * Broadleaf cluster atlas: 4 x 4 cells, each a short leafy twig (a branch cluster) drawn leaf by leaf. Rows are leaf
 * shapes, columns growth stage and season; the last row holds four more distinct drawings so no two cells repeat.
 */
export const BROADLEAF_CELLS = [
  // row 0: oak (lobed)
  { name: 'oak-young', shape: 'oak', stage: 'young', season: 'summer' },
  { name: 'oak-mid', shape: 'oak', stage: 'mid', season: 'summer' },
  { name: 'oak-mature', shape: 'oak', stage: 'mature', season: 'summer' },
  { name: 'oak-autumn', shape: 'oak', stage: 'mid', season: 'autumn' },
  // row 1: birch (ovate, toothed)
  { name: 'birch-young', shape: 'birch', stage: 'young', season: 'summer' },
  { name: 'birch-mid', shape: 'birch', stage: 'mid', season: 'summer' },
  { name: 'birch-mature', shape: 'birch', stage: 'mature', season: 'summer' },
  { name: 'birch-autumn', shape: 'birch', stage: 'mid', season: 'autumn' },
  // row 2: orchard (elliptic, serrate)
  { name: 'orchard-young', shape: 'orchard', stage: 'young', season: 'summer' },
  { name: 'orchard-mid', shape: 'orchard', stage: 'mid', season: 'summer' },
  { name: 'orchard-mature', shape: 'orchard', stage: 'mature', season: 'summer' },
  { name: 'orchard-autumn', shape: 'orchard', stage: 'mid', season: 'autumn' },
  // row 3: varied twigs
  { name: 'oak-open', shape: 'oak', stage: 'mature', season: 'summer', variant: 'open' },
  { name: 'birch-weeping', shape: 'birch', stage: 'mid', season: 'summer', variant: 'weeping' },
  { name: 'beech-sprig', shape: 'beech', stage: 'mid', season: 'summer', variant: 'sprig' },
  { name: 'mixed-turning', shape: 'orchard', stage: 'mature', season: 'turning', variant: 'open' },
];

const PALETTE = {
  oak: { young: [[118, 150, 52], [132, 160, 58], [104, 140, 48]], mid: [[76, 108, 38], [88, 120, 42], [68, 98, 36], [98, 128, 44]], mature: [[52, 84, 32], [62, 94, 36], [72, 100, 38]] },
  birch: { young: [[134, 172, 66], [150, 182, 74], [120, 160, 60]], mid: [[96, 140, 50], [108, 150, 56], [84, 126, 46]], mature: [[72, 116, 44], [82, 126, 48], [64, 104, 40]] },
  orchard: { young: [[112, 158, 70], [126, 168, 78], [100, 146, 64]], mid: [[70, 120, 56], [82, 132, 62], [62, 108, 52]], mature: [[50, 96, 48], [60, 106, 52], [68, 112, 56]] },
  beech: { young: [[128, 164, 60]], mid: [[84, 122, 42], [96, 134, 48]], mature: [[64, 100, 38]] },
};
const AUTUMN = [[198, 152, 40], [178, 106, 36], [132, 130, 44], [152, 82, 34], [214, 174, 58], [104, 122, 40]];
const TURNING = [[84, 120, 42], [102, 134, 46], [168, 140, 40], [186, 122, 38], [76, 108, 40]];
const STAGE = { young: { size: 0.78, count: 0.8, lit: 1.08, twig: 1.0 }, mid: { size: 1.0, count: 1.0, lit: 1.0, twig: 1.0 }, mature: { size: 1.08, count: 1.14, lit: 0.94, twig: 1.1 } };

function pick(random, list) { return list[Math.floor(random() * list.length)]; }

export function drawBroadleafCell(spec, seed, n = 512) {
  const random = rng(seed), L = new Layer(n);
  const stage = STAGE[spec.stage], variant = spec.variant ?? 'normal';
  const species = spec.shape === 'orchard' || spec.shape === 'beech' || spec.shape === 'birch' ? spec.shape : 'oak';
  const greens = PALETTE[species][spec.stage];
  const colours = spec.season === 'autumn' ? AUTUMN : spec.season === 'turning' ? TURNING : greens;
  const leafLen = n * (spec.shape === 'oak' ? 0.205 : spec.shape === 'birch' ? 0.17 : spec.shape === 'beech' ? 0.18 : 0.175) * stage.size * (variant === 'sprig' ? 0.85 : 1);
  const widRatio = spec.shape === 'oak' ? 0.62 : spec.shape === 'birch' ? 0.66 : spec.shape === 'beech' ? 0.5 : 0.56;
  const open = variant === 'open', weeping = variant === 'weeping';

  // Skeleton: a main twig rising from the lower middle with side shoots, each a gently curved polyline.
  const twigs = [];
  const trace = (x, y, ang, length, curve, r0, r1, steps = 14) => {
    const pts = [];
    let a = ang;
    for (let s = 0; s <= steps; s++) {
      const f = s / steps;
      pts.push([x, y, mix(r0, r1, Math.pow(f, 0.8))]);
      x += Math.cos(a) * length / steps; y += Math.sin(a) * length / steps;
      a += curve / steps + (weeping ? 0.04 : 0) * Math.sign(Math.cos(a)) * -1;
      if (weeping) a += (Math.PI / 2 - a) * 0.05 * (Math.cos(a) > 0 ? -1 : 1) * 0 + 0.015 * Math.sin(a + Math.PI / 2);
    }
    return pts;
  };
  const baseX = n * (0.5 + (random() - 0.5) * 0.12), baseY = n * 0.93;
  const mainAng = -Math.PI / 2 + (random() - 0.5) * 0.5;
  const mainLen = n * (open ? 0.68 : 0.66) * stage.twig;
  const main = trace(baseX, baseY, mainAng, mainLen, (random() - 0.5) * 0.9, 3.4 * stage.twig, 1.1);
  twigs.push({ pts: main, main: true });
  const shoots = open ? 5 : weeping ? 4 : 5 + (spec.stage === 'mature' ? 1 : 0);
  for (let k = 0; k < shoots; k++) {
    const f = 0.2 + 0.66 * (k + random() * 0.5) / shoots;
    const at = main[Math.min(main.length - 1, Math.floor(f * (main.length - 1)))];
    const prev = main[Math.max(0, Math.floor(f * (main.length - 1)) - 1)];
    const dir = Math.atan2(at[1] - prev[1], at[0] - prev[0]);
    const side = k % 2 ? 1 : -1;
    const ang = dir + side * (0.62 + random() * 0.42);
    const length = n * (weeping ? 0.34 : open ? 0.24 : 0.27) * (1 - f * 0.55) * (0.9 + random() * 0.3);
    twigs.push({ pts: trace(at[0], at[1], ang, length, side * (weeping ? 0.9 : 0.5) * (random() - 0.2), 1.8, 0.7, 10), main: false, side });
  }

  // Twigs first (behind everything), bark greening toward the tips.
  const bark = species === 'birch' ? [[118, 100, 84], [150, 140, 100]] : [[88, 66, 46], [124, 110, 58]];
  for (const t of twigs) {
    drawStroke(L, t.pts, (u) => [mix(bark[0][0], bark[1][0], u), mix(bark[0][1], bark[1][1], u), mix(bark[0][2], bark[1][2], u)], (u) => (t.main ? 0.35 + 0.65 * Math.min(1, u * 8) : 1), 0.1, true);
  }

  // Leaves: along every twig, alternating sides, each on a short petiole; a terminal leaf at each twig's tip.
  const leaves = [];
  const addLeaf = (x, y, ang, scale, depth) => {
    const len = leafLen * scale * (0.82 + random() * 0.36);
    const colour = pick(random, colours), jitter = (random() - 0.5) * 0.18;
    leaves.push({
      x, y, ang, len, wid: len * widRatio * (0.88 + random() * 0.24), shape: spec.shape, bend: (random() - 0.5) * 0.28,
      colour: [colour[0] * (1 + jitter), colour[1] * (1 + jitter * 0.7), colour[2] * (1 + jitter * 0.4)],
      lit: stage.lit * (0.9 + random() * 0.22), depth, under: 0.45 + random() * 0.4, veins: 0.6 + random() * 0.4, phase: random(), lobes: 2.7 + random() * 1.1, cup: random(),
    });
  };
  for (const t of twigs) {
    const pts = t.pts, per = Math.round((t.main ? (open ? 6 : 8) : (open ? 4 : 6)) * stage.count);
    for (let k = 0; k < per; k++) {
      const f = (t.main ? 0.2 : 0.1) + 0.82 * (k + random() * 0.6) / per;
      const idx = Math.min(pts.length - 2, Math.floor(f * (pts.length - 1)));
      const p0 = pts[idx], p1 = pts[idx + 1], dir = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      const side = (k % 2 ? 1 : -1) * (random() < 0.12 ? -1 : 1);
      const pet = 5 + random() * 8, pa = dir + side * (0.85 + random() * 0.4), grow = (weeping ? 0.5 : 0.18) * (Math.PI / 2 - pa) * 0 + (weeping ? 0.35 : 0.1);
      const lx = p0[0] + Math.cos(pa) * pet, ly = p0[1] + Math.sin(pa) * pet;
      const la = pa + (random() - 0.5) * 0.5 + (weeping ? 0.5 * side * 0 : 0) + side * -0.15 + (Math.PI / 2 - pa) * grow * 0.4;
      const tipScale = 1 - 0.28 * (f > 0.7 ? (f - 0.7) / 0.3 : 0);
      drawStroke(L, [[p0[0], p0[1], 1.0], [lx, ly, 0.8]], () => [96, 112, 56], () => 1, 0.2, false);
      addLeaf(lx, ly, la, tipScale * (t.main ? 1 : 0.92), random());
    }
    const end = pts[pts.length - 1], prev = pts[pts.length - 2], da = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
    addLeaf(end[0], end[1], da + (random() - 0.5) * 0.3, 0.86, random());
    if (!open) addLeaf(end[0] - Math.cos(da) * 4, end[1] - Math.sin(da) * 4, da + (random() < 0.5 ? 0.7 : -0.7), 0.7, random() * 0.8);
  }
  leaves.sort((p, q) => p.depth - q.depth);
  for (const leaf of leaves) drawLeaf(L, leaf);
  return finish(L, { feather: 1.15, gain: 1.06, border: 16 });
}
