import { Layer, rng, mix, clamp, smooth, finish } from './raster.mjs';

/**
 * Conifer needle-pad atlas: 4 x 4 pads of individually drawn needles.
 *   row 0: fir sprigs (flat, two-ranked sprays, base on the left edge, pointing right)
 *   row 1: spruce sprigs (needled all round, drooping, base left)
 *   row 2: pine pads (whole branchlets, stem vertical, long paired needles; same footprint as the source sheet's pictures)
 *   row 3: a fir whorl and a pine tuft (radial), a fir leader and a pine leader (stem vertical)
 */
export const CONIFER_CELLS = [
  { name: 'fir-spray-a', kind: 'fir' }, { name: 'fir-spray-b', kind: 'fir' }, { name: 'fir-spray-c', kind: 'fir' }, { name: 'fir-spray-d', kind: 'fir' },
  { name: 'spruce-sprig-a', kind: 'spruce' }, { name: 'spruce-sprig-b', kind: 'spruce' }, { name: 'spruce-sprig-c', kind: 'spruce' }, { name: 'spruce-sprig-d', kind: 'spruce' },
  { name: 'pine-pad-a', kind: 'pine' }, { name: 'pine-pad-b', kind: 'pine' }, { name: 'pine-pad-c', kind: 'pine' }, { name: 'pine-pad-d', kind: 'pine' },
  { name: 'fir-whorl', kind: 'whorl-fir' }, { name: 'pine-tuft', kind: 'whorl-pine' }, { name: 'fir-leader', kind: 'tip-fir' }, { name: 'pine-leader', kind: 'tip-pine' },
];

/** One needle: a tapered capsule with a lit side, composited over what is behind it. */
export function needle(L, x, y, ang, len, w, colour, depth, under) {
  const n = L.n, ca = Math.cos(ang), sa = Math.sin(ang), R = w + 2;
  const ex = x + ca * len, ey = y + sa * len;
  const x0 = Math.max(0, Math.floor(Math.min(x, ex) - R)), x1 = Math.min(n - 1, Math.ceil(Math.max(x, ex) + R));
  const y0 = Math.max(0, Math.floor(Math.min(y, ey) - R)), y1 = Math.min(n - 1, Math.ceil(Math.max(y, ey) + R));
  const k0 = 0.55 + 0.55 * depth;
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const dx = px + 0.5 - x, dy = py + 0.5 - y;
    const along = dx * ca + dy * sa, s = -dx * sa + dy * ca;
    const t = clamp(along / len, 0, 1);
    const r = w * 0.5 * (1 - 0.8 * t * t) + 0.05;
    const cov = clamp(r - Math.hypot(along - t * len, s) + 0.5, 0, 1);
    if (cov <= 0) continue;
    const k = k0 * (1 + 0.28 * (s / Math.max(r, 0.3))) * (0.9 + 0.2 * t);
    L.over(py * n + px, clamp(colour[0] * k, 0, 255), clamp(colour[1] * k, 0, 255), clamp(colour[2] * k, 0, 255), cov, under);
  }
}

function stem(L, pts, colour) {
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, ay, ar] = pts[k], [bx, by, br] = pts[k + 1];
    needle(L, ax, ay, Math.atan2(by - ay, bx - ax), Math.hypot(bx - ax, by - ay) + 0.5, ar + br, colour, 0.6, 0.1);
  }
}

const FIR = [[34, 66, 36], [40, 74, 40], [30, 58, 34], [46, 80, 44]];
const NEW = [96, 138, 56];
const PINE = [[62, 92, 44], [72, 102, 48], [84, 112, 50], [56, 84, 42]];
const jitter = (c, random, a = 0.14) => { const j = 1 + (random() - 0.5) * a * 2; return [c[0] * j, c[1] * j * (1 + (random() - 0.5) * 0.06), c[2] * j]; };
const toward = (base, goal, t) => [mix(base[0], goal[0], t), mix(base[1], goal[1], t), mix(base[2], goal[2], t)];
const draw = (L, list) => { for (const o of list) needle(L, o.x, o.y, o.ang, o.len, o.w, o.colour, o.depth, o.under); };

export function drawConiferCell(spec, seed, n = 512, density = 1) {
  const random = rng(seed), L = new Layer(n), kind = spec.kind, list = [];
  const bark = [92, 70, 48];
  if (kind === 'fir' || kind === 'spruce') {
    const spruce = kind === 'spruce', droop = (spruce ? 0.5 : 0.18) + random() * 0.2;
    const base = [n * 0.05, n * (0.5 + (random() - 0.5) * 0.08)];
    const mainLen = n * (0.88 + random() * 0.06);
    const axis = [];
    let x = base[0], y = base[1], a = (random() - 0.5) * 0.12;
    for (let s = 0; s <= 40; s++) {
      axis.push({ x, y, a });
      x += Math.cos(a) * mainLen / 40; y += Math.sin(a) * mainLen / 40;
      a += droop * 0.01 + (random() - 0.5) * 0.01;
    }
    stem(L, axis.map((p, i) => [p.x, p.y, 2.4 - 1.6 * i / 40]), bark);
    const needleLen = spruce ? 24 : 30, step = (spruce ? 4.6 : 5.4) / density, gap = (spruce ? 14 : 17) / density;
    const shoots = [];
    for (let d = 26; d < mainLen * 0.96; d += gap * (0.85 + random() * 0.3)) {
      const p = axis[Math.min(40, Math.round(d / mainLen * 40))], side = shoots.length % 2 ? 1 : -1, f = d / mainLen;
      const length = n * (0.4 * Math.pow(1 - f, 0.9) + 0.06) * (0.85 + random() * 0.3);
      shoots.push({ x: p.x, y: p.y, ang: p.a + side * (0.95 + random() * 0.3 - 0.35 * f) + (spruce ? 0.25 : 0.05), length });
    }
    const along = (sx, sy, ang, length) => {
      for (let d = 4; d < length; d += step * (0.8 + random() * 0.4)) {
        const px = sx + Math.cos(ang) * d, py = sy + Math.sin(ang) * d + (spruce ? d * 0.1 * droop : 0), tip = d / length;
        const lenN = needleLen * (0.7 + random() * 0.45) * (1 - 0.45 * tip * tip);
        for (const side of spruce ? [-1, 1, 0.35, -0.35] : [-1, 1]) {
          const a = ang + side * Math.min((spruce ? 0.9 : 1.05) + random() * 0.25 - 0.4 * tip, 1.4) + (random() - 0.5) * 0.2;
          const colour = toward(jitter(FIR[Math.floor(random() * 4)], random), NEW, smooth(0.62, 1, tip) * 0.8 * (random() < 0.7 ? 1 : 0.3));
          list.push({ x: px, y: py, ang: a, len: lenN, w: spruce ? 2.5 : 2.2, colour, depth: random() * 0.9 + (Math.abs(side) < 1 ? 0.1 : 0), under: 0.5 });
        }
      }
    };
    shoots.forEach((s) => along(s.x, s.y, s.ang, s.length));
    along(axis[2].x, axis[2].y, 0.02, mainLen * 0.97);
    list.sort((p, q) => p.depth - q.depth);
    shoots.forEach((s) => stem(L, [[s.x, s.y, 1.2], [s.x + Math.cos(s.ang) * s.length, s.y + Math.sin(s.ang) * s.length, 0.5]], bark));
    draw(L, list);
  } else if (kind === 'pine') {
    const cx = n * (0.5 + (random() - 0.5) * 0.04), y0 = n * 0.95, y1 = n * 0.05;
    const stemPts = [];
    for (let s = 0; s <= 30; s++) { const f = s / 30; stemPts.push([cx + Math.sin(f * 3 + seed) * 5 * f, mix(y0, y1, f), 2.2 - 1.4 * f]); }
    stem(L, stemPts, bark);
    const fascicle = (x, y, ang, len, depth, tip) => {
      const count = 2 + (random() < 0.35 ? 1 : 0);
      for (let k = 0; k < count; k++) {
        const a = ang + (k - (count - 1) / 2) * (0.1 + random() * 0.08) + (random() - 0.5) * 0.08;
        list.push({ x, y, ang: a, len: len * (0.85 + random() * 0.25), w: 1.9, colour: toward(jitter(PINE[Math.floor(random() * 4)], random, 0.12), [120, 150, 62], tip ? 0.45 : 0), depth, under: 0.45 });
      }
    };
    for (let y = y0 - 26; y > y1 + 24; y -= (26 + random() * 8) / density) {
      const f = (y0 - y) / (y0 - y1), side = Math.floor((y0 - y) / 30) % 2 ? 1 : -1;
      for (const sd of [side, -side]) {
        if (random() < 0.2) continue;
        const reach = n * (0.38 * Math.pow(1 - f, 0.8) + 0.08) * (0.85 + random() * 0.3);
        const ang = -Math.PI / 2 + sd * (1.05 - 0.45 * f + (random() - 0.5) * 0.2);
        const ex = cx + Math.cos(ang) * reach, ey = y + Math.sin(ang) * reach + reach * 0.12;
        stem(L, [[cx, y, 1.1], [(cx + ex) / 2, (y + ey) / 2 - 2, 0.9], [ex, ey, 0.5]], bark);
        for (let d = reach * 0.25; d <= reach; d += (11 + random() * 4) / density) {
          const q = d / reach, px = cx + (ex - cx) * q, py = y + (ey - y) * q;
          const nlen = (62 + random() * 26) * (1 - 0.25 * f), forward = ang + (sd > 0 ? -0.55 : 0.55) * (random() * 0.9 + 0.1);
          fascicle(px, py, forward, nlen, random(), q > 0.85);
          fascicle(px, py, forward + (sd > 0 ? 0.9 : -0.9), nlen * 0.8, random() * 0.7, false);
        }
        fascicle(ex, ey, ang, 70, 0.9, true);
      }
    }
    for (let k = 0; k < 7; k++) fascicle(cx + (random() - 0.5) * 8, y1 + 8, -Math.PI / 2 + (random() - 0.5) * 1.3, 52, 0.9, true);
    list.sort((p, q) => p.depth - q.depth);
    draw(L, list);
  } else if (kind === 'whorl-fir' || kind === 'whorl-pine') {
    const pine = kind === 'whorl-pine', cx = n / 2, cy = n / 2, rings = pine ? 5 : 7;
    for (let r = 0; r < rings; r++) {
      const count = Math.round((pine ? 30 : 40) * (0.5 + r * 0.22) * density);
      for (let k = 0; k < count; k++) {
        const a = (k + random() * 0.8) / count * Math.PI * 2 + r * 0.4;
        const len = (pine ? 150 : 100) * (0.4 + 0.6 * (r + 1) / rings) * (0.8 + random() * 0.35);
        const colour = toward(jitter((pine ? PINE : FIR)[Math.floor(random() * 4)], random), [110, 148, 60], smooth(0.4, 1, (r + 1) / rings) * 0.4);
        list.push({ x: cx + Math.cos(a) * 6, y: cy + Math.sin(a) * 6, ang: a + (random() - 0.5) * 0.18, len, w: pine ? 2.0 : 2.4, colour, depth: 1 - (r + random()) / rings, under: 0.5 });
      }
    }
    list.sort((p, q) => p.depth - q.depth);
    draw(L, list);
  } else {
    const pine = kind === 'tip-pine', cx = n / 2, top = n * 0.06, bottom = n * 0.94;
    stem(L, [[cx, bottom, 2.4], [cx + 3, (top + bottom) / 2, 1.6], [cx, top, 0.6]], bark);
    for (let y = bottom - 10; y > top + 8; y -= (pine ? 7 : 5) / density) {
      const f = (bottom - y) / (bottom - top), reach = (pine ? 120 : 80) * Math.pow(1 - f, 0.7) + 10;
      for (let k = 0; k < (pine ? 3 : 4); k++) {
        const side = random() < 0.5 ? -1 : 1, spread = 0.55 + random() * 0.6 - 0.35 * f;
        const colour = toward(jitter((pine ? PINE : FIR)[Math.floor(random() * 4)], random), [112, 146, 60], smooth(0.5, 1, f) * 0.75);
        list.push({ x: cx, y, ang: -Math.PI / 2 + side * spread, len: (pine ? 70 : 46) * (0.6 + 0.4 * (1 - f * 0.6)) * (0.8 + random() * 0.4) + reach * 0.15, w: pine ? 2.0 : 2.3, colour, depth: random(), under: 0.5 });
      }
    }
    list.sort((p, q) => p.depth - q.depth);
    draw(L, list);
  }
  return finish(L, { feather: 0.7, gain: 1.12, border: 12 });
}
