import { mulberry32, valueNoise } from '../../world/noise';
import { beardAt, EYE_INSET, eyeBase, hairlineAt, headPoint, headSection, sculpt, toHead, unwarpU, unwarpV, type BeardStyle, type FaceShape } from './headShape';
import type { PaintSpec } from './paint';
import type { Wardrobe } from './person';
import { ellipsoid, mix3, mul3, NO_EDGE, PA, sstep, tube, type RGB, type V3, type WeightFn } from './skin';

/**
 * A head assembled like Gothic 3's: a sculpted, painted head mesh; eyeballs set into the sockets behind lid shells; ears;
 * and hair and beard as separate shells grown from the scalp and jaw regions of the same surface (docs/art/gothic3-reference.md#people).
 * Everything here goes into the head's part of the person's sheet, except a braid long enough to lie on the back, which
 * is painted with the body.
 */

export type HairCut = 'short' | 'cropped' | 'long' | 'tied' | 'bun' | 'bald';

export interface HeadSpec {
  shape: FaceShape;
  /** Linear RGB. */
  skin: RGB;
  hair: RGB;
  iris: RGB;
  cut: HairCut;
  beard: BeardStyle;
  age: number;
  seed: number;
  /** Something covers the crown (hood, hat, helmet, scarf): keep the hair shell low and thin under it. */
  covered: boolean;
}

export interface HeadContext {
  /** Bind-space origin of head space (the head joint) and the head's scale. */
  origin: V3;
  scale: number;
  head: WeightFn;
  hair: WeightFn;
  /** The back of the body at a height (bind space), for hair that falls onto it. */
  backZ: (y: number) => number;
  shoulderY: number;
}

export interface HeadFit {
  /** Bind-space height of the crown and of the brows; the head's half-width, front, back and centre depth with its hair. */
  crownY: number;
  browY: number;
  halfW: number;
  front: number;
  back: number;
  centerZ: number;
  /** How far forward the forehead reaches just above the brows (headwear must clear it). */
  browZ: number;
  /** Bind-space heights of the chin's underside and the base of the nose. */
  chinY: number;
  noseY: number;
  /** The sculpted head's horizontal extent row by row (bind space): half-width, front and back. */
  sections: { y: number; w: number; f: number; b: number }[];
}

const WS = 48;
const HS = 40;

/** Grey a hair colour with age. */
export function greyed(hair: RGB, age: number): RGB {
  const k = sstep(0.5, 0.95, age) * 0.7;
  return mix3(hair, [0.34, 0.33, 0.31], k);
}

export function buildHead(wd: Wardrobe, spec: HeadSpec, ctx: HeadContext): HeadFit {
  const s = spec.shape;
  const { origin, scale } = ctx;
  const part = (surface: PaintSpec['surface'], piece: string, extra: Partial<PaintSpec> = {}): PaintSpec => ({ surface, piece, seed: spec.seed, ...extra });
  const face = wd.useHead(part('face', 'face'));
  const a: number[] = new Array(PA).fill(0);
  a[2] = a[3] = a[4] = NO_EDGE;
  const P = (p: readonly [number, number, number]): V3 => {
    const m = toHead(s, p);
    return [origin[0] + m[0] * scale, origin[1] + m[1] * scale, origin[2] + m[2] * scale];
  };

  /* ---- the head grid ---- */
  const grid: V3[] = [];
  const base: { x: number; y: number; z: number; front: number }[] = [];
  const rows: number[] = [];
  for (let iy = 0; iy <= HS; iy++) {
    const v = iy / HS;
    const start = face.count;
    for (let ix = 0; ix <= WS; ix++) {
      const u = ix / WS;
      const hp = headPoint(s, u, v);
      const p = P(sculpt(s, hp));
      grid.push(p);
      base.push(hp);
      // Its place on the head grid is all the painter needs: the face map is painted in the same (u, v). The skin colour
      // is the template's block-in.
      a[0] = u;
      a[1] = v;
      face.vert(p[0], p[1], p[2], spec.skin, u * 5, v * 2, ctx.head(p[0], p[1], p[2]), a);
    }
    face.weld(start, start + WS);
    rows.push(start);
  }
  for (let iy = 0; iy < HS; iy++) {
    for (let ix = 0; ix < WS; ix++) {
      const a = rows[iy]! + ix;
      const b = a + 1;
      const d = rows[iy + 1]! + ix;
      const c = d + 1;
      face.tri(a, b, c);
      face.tri(a, c, d);
    }
  }
  {
    // Close the small ring under the chin.
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let ix = 0; ix < WS; ix++) {
      const p = grid[ix]!;
      cx += p[0] / WS;
      cy += p[1] / WS;
      cz += p[2] / WS;
    }
    a[0] = 0.5;
    a[1] = 0;
    const ctr = face.vert(cx, cy - 0.002 * scale, cz, spec.skin, 2.5, 0, ctx.head(cx, cy, cz), a);
    for (let ix = 0; ix < WS; ix++) face.tri(ctr, rows[0]! + ix + 1, rows[0]! + ix);
  }
  const at = (ix: number, iy: number) => grid[iy * (WS + 1) + ix]!;
  const bi = (ix: number, iy: number) => base[iy * (WS + 1) + ix]!;
  const normalAt = (ix: number, iy: number): V3 => {
    if (iy >= HS) return [0, 1, 0];
    if (iy <= 0) return [0, -1, 0];
    const l = at((ix + WS - 1) % WS, iy);
    const r = at((ix + 1) % WS, iy);
    const dn = at(ix, iy - 1);
    const up = at(ix, iy + 1);
    const du: V3 = [r[0] - l[0], r[1] - l[1], r[2] - l[2]];
    const dv: V3 = [up[0] - dn[0], up[1] - dn[1], up[2] - dn[2]];
    const n: V3 = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    return [n[0] / len, n[1] / len, n[2] / len];
  };

  /* ---- eyes and lids ---- */
  const skinC = spec.skin;
  const eb = eyeBase(s);
  const R = s.eyeR * scale;
  for (const sx of [-1, 1]) {
    const surf = P([sx * eb.x, eb.y, eb.z]);
    const ctr: V3 = [surf[0], surf[1], surf[2] - R - EYE_INSET * scale];
    // Each eye looks a little outward and down.
    const yaw = sx * 0.07;
    const pitch = -0.04;
    const fwd: V3 = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    const right: V3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const up: V3 = [fwd[1] * right[2] - fwd[2] * right[1], fwd[2] * right[0] - fwd[0] * right[2], fwd[0] * right[1] - fwd[1] * right[0]];
    ellipsoid(wd.useHead(part('eye', 'eye', { tint: spec.iris })), ctr, [R, R, R], [1, 1, 1], ctx.head, { ws: 16, hs: 12, basis: [right, up, fwd] });
    // Lids: shells over the eyeball with an almond opening between them; the upper lid's margin carries the lashes.
    const temporal = sx;
    const lidRows = 5;
    const cols = 12;
    // The opening is about as wide as a real eye's (some 30 mm) and a third as high, so the white shows at its corners.
    const phiMax = 1.45;
    const openW = 1.15;
    // An almond: the upper lid's arch peaks toward the nose, the lower lid is flatter; the corners lie a little low.
    const lidOpen = s.lidOpen;
    const upperEdge = (ph: number) => lidOpen * Math.pow(Math.max(0, 1 - (ph / openW) ** 2), 0.8) + 0.01 - 0.05 * (ph / openW);
    const lowerEdge = (ph: number) => -0.27 * Math.pow(Math.max(0, 1 - (ph / openW) ** 2), 0.9) - 0.03 + 0.03 * (ph / openW);
    const lidPoint = (ph: number, el: number, rr: number): V3 => {
      const lx = Math.sin(ph) * Math.cos(el) * temporal;
      const ly = Math.sin(el);
      const lz = Math.cos(ph) * Math.cos(el);
      return [ctr[0] + (right[0] * lx + up[0] * ly + fwd[0] * lz) * rr, ctr[1] + (right[1] * lx + up[1] * ly + fwd[1] * lz) * rr, ctr[2] + (right[2] * lx + up[2] * ly + fwd[2] * lz) * rr];
    };
    for (const upper of [true, false]) {
      const lid = wd.useHead(part('lid', upper ? 'upper eyelid' : 'lower eyelid'));
      const start = lid.count;
      for (let r = 0; r <= lidRows + 1; r++) {
        for (let c = 0; c <= cols; c++) {
          const ph = -phiMax + (2 * phiMax * c) / cols;
          const edge = upper ? upperEdge(ph) : lowerEdge(ph);
          const far = upper ? 0.95 : -0.9;
          let el: number;
          let rr: number;
          let col: RGB;
          if (r === 0) {
            // The rolled margin, just inside the lid's edge.
            el = edge + (upper ? -0.02 : 0.02);
            rr = R * 1.01;
            col = upper ? [0.05, 0.04, 0.035] : mul3(mix3(skinC, [0.6, 0.3, 0.28], 0.25), 0.8);
          } else {
            const k = (r - 1) / lidRows;
            el = edge + (far - edge) * k;
            // The lid hugs the eyeball, a little thicker at its fold, then sinks back under the face round the socket.
            rr = R * (1.035 + 0.025 * Math.sin(k * Math.PI) - 0.1 * sstep(0.55, 1, k));
            const lash = upper && r === 1 ? 0.5 : 0;
            col = mul3(skinC, (0.74 - 0.12 * (1 - k)) * (1 - lash));
          }
          const p = lidPoint(ph, el, rr);
          // The lid takes its colour from the painted face just round the eye, so it never reads as a separate cup.
          const hx = (p[0] - origin[0]) / scale / s.sx;
          const hy = ((p[1] - origin[1]) / scale - s.cy) / s.sy;
          const hz = ((p[2] - origin[2]) / scale - s.cz) / s.sz;
          a[0] = unwarpU(Math.atan2(hx, hz));
          a[1] = unwarpV(Math.max(-1, Math.min(1, hy)));
          a[6] = r;
          a[7] = upper ? 1 : 0;
          lid.vert(p[0], p[1], p[2], col, c / cols, r / (lidRows + 1), ctx.head(p[0], p[1], p[2]), a);
        }
      }
      // Rows run away from the opening and columns toward the temple; pick the winding that faces away from the eyeball.
      const flip = (upper ? -1 : 1) * temporal > 0;
      for (let r = 0; r <= lidRows; r++) {
        for (let c = 0; c < cols; c++) {
          const a = start + r * (cols + 1) + c;
          const b = a + 1;
          const d = a + cols + 1;
          const e = d + 1;
          if (flip) {
            lid.tri(a, e, b);
            lid.tri(a, d, e);
          } else {
            lid.tri(a, b, e);
            lid.tri(a, e, d);
          }
        }
      }
    }
  }

  /* ---- ears ---- */
  {
    const earY = s.eyeY - 0.14;
    const sec = headSection(s, earY);
    const e = 2 / sec.p;
    for (const sx of [-1, 1]) {
      const th = sx * (Math.PI / 2 + 0.12);
      const sn = Math.sin(th);
      const cs = Math.cos(th);
      const bx = sec.w * Math.sign(sn) * Math.pow(Math.abs(sn), e);
      const bz = sec.cz + sec.b * Math.sign(cs) * Math.pow(Math.abs(cs), e);
      const root = P([bx * 0.96, earY, bz]);
      const out: V3 = [sx * Math.cos(0.22), 0, -Math.sin(0.22)];
      const upv: V3 = [0, Math.cos(0.18), -Math.sin(0.18)];
      // A right-handed basis for both ears (the ear is symmetric front to back, so its local z may point either way).
      const third: V3 = [out[1] * upv[2] - out[2] * upv[1], out[2] * upv[0] - out[0] * upv[2], out[0] * upv[1] - out[1] * upv[0]];
      const size = (s.build === 'woman' ? 0.9 : 1) * scale;
      const ctr: V3 = [root[0] + out[0] * 0.006 * size, root[1], root[2] + out[2] * 0.006 * size - 0.004 * size];
      const earC = mix3(skinC, [skinC[0] * 1.08, skinC[1] * 0.86, skinC[2] * 0.82], 0.5);
      ellipsoid(
        wd.useHead(part('ear', 'ear')),
        ctr,
        [0.007 * size, 0.028 * size, 0.016 * size],
        (d) => mul3(earC, d[0] > 0.2 ? 0.72 + 0.28 * Math.min(1, (d[1] * d[1] + d[2] * d[2]) * 1.6) : 0.92),
        ctx.head,
        {
          ws: 10,
          hs: 8,
          basis: [out, upv, third],
          shape: (d) => {
            // Cup the outer face into a bowl inside a rolled rim; narrow the lobe.
            const rim = d[1] * d[1] + d[2] * d[2];
            let x = d[0];
            if (x > 0) x -= 1.5 * x * Math.max(0, 1 - rim * 1.35);
            const lobe = d[1] < -0.4 ? 1 - 0.35 * sstep(-0.4, -1, d[1]) : 1;
            return [x, d[1], d[2] * lobe];
          },
        },
      );
    }
  }

  /* ---- hair and beard shells ---- */
  const hairC = greyed(spec.hair, spec.age);
  const rnd = mulberry32((spec.seed ^ 0x9e3779b9) >>> 0);
  const lumpPh = rnd() * 50;
  let crownY = -Infinity;
  let halfW = 0;
  let frontZ = -Infinity;
  let backZ = Infinity;
  /** A shell over part of the head grid: only quads with some weight are kept, only their vertices are written. */
  const shell = (
    hair: ReturnType<Wardrobe['useHead']>,
    weightAt: (ix: number, iy: number) => number,
    thickAt: (ix: number, iy: number, k: number) => number,
    colAt: (ix: number, iy: number, k: number) => RGB,
    drop?: (ix: number, iy: number, k: number) => V3,
  ) => {
    const W = new Float32Array((WS + 1) * (HS + 1));
    for (let iy = 0; iy <= HS; iy++) for (let ix = 0; ix <= WS; ix++) W[iy * (WS + 1) + ix] = weightAt(ix % WS, iy);
    const keep: [number, number][] = [];
    for (let iy = 0; iy < HS; iy++) {
      for (let ix = 0; ix < WS; ix++) {
        const i0 = iy * (WS + 1) + ix;
        if (Math.max(W[i0]!, W[i0 + 1]!, W[i0 + WS + 1]!, W[i0 + WS + 2]!) >= 0.04) keep.push([ix, iy]);
      }
    }
    const index = new Map<number, number>();
    const vid = (ix: number, iy: number) => {
      const key = iy * (WS + 1) + ix;
      let v = index.get(key);
      if (v === undefined) {
        const k = W[key]!;
        const p = at(ix % WS, iy);
        const n = normalAt(ix % WS, iy);
        const th = thickAt(ix % WS, iy, k);
        const dv = drop ? drop(ix % WS, iy, k) : ([0, 0, 0] as V3);
        const q: V3 = [p[0] + n[0] * th + dv[0], p[1] + n[1] * th + dv[1], p[2] + n[2] * th + dv[2]];
        a[0] = ix / WS;
        a[1] = iy / HS;
        a[6] = k;
        v = hair.vert(q[0], q[1], q[2], colAt(ix % WS, iy, k), (ix / WS) * 10, (iy / HS) * 3, ctx.hair(q[0], q[1], q[2]), a);
        index.set(key, v);
        if (k > 0.05) {
          crownY = Math.max(crownY, q[1]);
          halfW = Math.max(halfW, Math.abs(q[0] - origin[0]));
          frontZ = Math.max(frontZ, q[2]);
          backZ = Math.min(backZ, q[2]);
        }
        // The seam columns are the same place.
        if (ix === WS && index.has(iy * (WS + 1))) hair.weld(index.get(iy * (WS + 1))!, v);
        if (ix === 0 && index.has(iy * (WS + 1) + WS)) hair.weld(index.get(iy * (WS + 1) + WS)!, v);
      }
      return v;
    };
    for (const [ix, iy] of keep) {
      const p0 = vid(ix, iy);
      const p1 = vid(ix + 1, iy);
      const p2 = vid(ix + 1, iy + 1);
      const p3 = vid(ix, iy + 1);
      hair.tri(p0, p1, p2);
      hair.tri(p0, p2, p3);
    }
  };
  const cutT: Record<HairCut, number> = { short: 0.009, cropped: 0.0045, long: 0.008, tied: 0.008, bun: 0.008, bald: 0 };
  const T = (spec.covered ? Math.min(cutT[spec.cut], 0.004) : cutT[spec.cut]) * scale;
  if (spec.cut !== 'bald') {
    // The shell starts a little inside the painted hairline, so its edge always sinks into painted hair rather than skin.
    shell(
      wd.useHead(part('hair', 'hair')),
      (ix, iy) => {
        const b = bi(ix, iy);
        return sstep(0.02, 0.32, hairlineAt(s, b.x, b.y, b.z));
      },
      (ix, iy, k) => {
        const b = bi(ix, iy);
        const pole = sstep(0.8, 0.97, iy / HS);
        // Broad lumps and long locks running from the crown, so the hair is not a moulded cap.
        const lump = 1 + (0.6 * valueNoise(ix * 0.9 + lumpPh, iy * 0.7, spec.seed) - 0.3 + 0.5 * (valueNoise(ix * 2.7 + lumpPh, iy * 0.22, spec.seed + 1) - 0.5)) * (1 - pole);
        const top = 0.75 + 0.45 * sstep(-0.2, 0.7, b.y);
        // Thin over a wide band toward the hairline, so the painted fringe, not the shell's edge, draws the line.
        return T * k * k * lump * top - 0.0018 * scale * (1 - k);
      },
      (ix, iy, k) => {
        const b = bi(ix, iy);
        const st = 0.82 + 0.3 * valueNoise(ix * 2.3, iy * 0.35 + lumpPh, spec.seed + 3);
        return mul3(hairC, st * (0.72 + 0.28 * k) * (1 - 0.18 * sstep(0.2, -0.6, b.y)));
      },
    );
  }
  if (!isFinite(crownY)) crownY = P([0, 1, 0])[1];
  const hs = headSection(s, 0.35);
  halfW = Math.max(halfW, hs.w * s.sx * scale);
  if (!isFinite(frontZ)) frontZ = P([0, s.browY, headSection(s, s.browY).f])[2];
  if (!isFinite(backZ)) backZ = P([0, 0.35, -hs.b])[2];

  // Long hair is worn in a braid: gathered at the nape and hanging down the back to the shoulder blades.
  if (spec.cut === 'long' && !spec.covered) {
    const pts: V3[] = [];
    const radii: number[] = [];
    const cols: RGB[] = [];
    const topY = P([0, s.eyeY - 0.05, 0])[1];
    const endY = ctx.shoulderY - 0.2 * scale;
    const steps = 22;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const y = topY + (endY - topY) * k;
      const r = (0.021 - 0.008 * k) * scale;
      // Lie on whichever is further back at this height: the back of the head (with its hair) or the neck and back.
      const uy = ((y - origin[1]) / scale - s.cy) / s.sy;
      const sec = headSection(s, Math.max(-1, uy));
      const headBack = uy > -0.9 ? P([0, uy, sec.cz - sec.b])[2] - T - 0.002 * scale : Infinity;
      const z = Math.min(headBack, ctx.backZ(y) - 0.008) - r * 0.8;
      pts.push([origin[0] + Math.sin(k * 2.1) * 0.006 * scale, y, z]);
      // The plaits: a lump every few centimetres, alternating sides in shade.
      const lump = Math.abs(Math.sin(k * Math.PI * 7.5));
      radii.push(r * (0.8 + 0.3 * lump));
      cols.push(mul3(hairC, (i % 2 ? 0.8 : 0.98) * (0.95 - 0.15 * k)));
    }
    // The braid lies on the back, outside the head's part of the sheet: it is painted with the body.
    tube(wd.use(part('fur', 'braid')), pts, radii, cols, { sides: 8, wf: ctx.hair, capEnd: true, up: [0, 0, -1], tile: 0.05 });
    // A leather tie below the last plait.
    const e = pts[pts.length - 3]!;
    tube(wd.use(part('leather', 'hair tie')), [e, [e[0], e[1] - 0.012 * scale, e[2]]], 0.015 * scale, [0.14, 0.1, 0.07], { sides: 8, wf: ctx.hair, up: [0, 0, -1], capStart: true, capEnd: true });
  }
  // Tied hair: a short tail at the nape; a bun sits higher on the back of the head.
  if ((spec.cut === 'tied' || spec.cut === 'bun') && !spec.covered) {
    const lvl = s.eyeY + (spec.cut === 'bun' ? 0.25 : 0.05);
    const lsec = headSection(s, lvl);
    const occ = P([0, lvl, lsec.cz - lsec.b * 1.02])[2];
    const oy = P([0, lvl, 0])[1];
    if (spec.cut === 'bun') {
      ellipsoid(wd.useHead(part('fur', 'bun')), [origin[0], oy, occ - 0.02 * scale], [0.04 * scale, 0.034 * scale, 0.03 * scale], (d) => mul3(hairC, 0.85 + 0.15 * d[1]), ctx.head, { ws: 10, hs: 8 });
    } else {
      const pts: V3[] = [];
      const radii: number[] = [];
      for (let i = 0; i <= 6; i++) {
        const k = i / 6;
        pts.push([origin[0] + Math.sin(k * 2.2 + spec.seed) * 0.006 * scale, oy - k * 0.15 * scale, occ - 0.01 * scale - Math.sin(k * 1.6) * 0.03 * scale]);
        radii.push((0.02 - 0.011 * k) * scale);
      }
      tube(wd.useHead(part('fur', 'hair tail')), pts, radii, mul3(hairC, 0.9), { sides: 8, wf: ctx.hair, capEnd: true, up: [0, 0, -1], tile: 0.05 });
      tube(wd.useHead(part('leather', 'hair tie')), [pts[1]!, [pts[1]![0], pts[1]![1] - 0.012 * scale, pts[1]![2] - 0.002 * scale]], 0.021 * scale, [0.12, 0.09, 0.06], { sides: 8, wf: ctx.hair, up: [0, 0, -1] });
    }
  }

  // A short beard is painted only; longer ones get a shell over the painted growth.
  if (spec.beard !== 'none' && spec.beard !== 'short') {
    const full = spec.beard === 'full';
    const bt = (full ? 0.01 : spec.beard === 'goatee' ? 0.006 : 0.0035) * scale;
    const beardC = mul3(greyed(spec.hair, Math.min(1, spec.age + 0.1)), 0.92);
    shell(
      wd.useHead(part('beard', 'beard')),
      (ix, iy) => {
        const b = bi(ix, iy);
        return beardAt(s, spec.beard, b.x, b.y, b.z);
      },
      (ix, iy, k) => {
        const b = bi(ix, iy);
        const lump = 0.8 + 0.4 * valueNoise(ix * 1.3, iy * 1.1 + 7, spec.seed + 5);
        const chin = sstep(s.mouthY - 0.05, -0.95, b.y);
        return bt * Math.pow(k, 1.3) * lump * (1 + (full ? 1.4 : 0.5) * chin) - 0.0012 * scale * (1 - k);
      },
      (ix, iy, k) => {
        const st = 0.8 + 0.3 * valueNoise(ix * 2.7, iy * 0.5, spec.seed + 9);
        return mul3(beardC, st * (0.75 + 0.25 * k));
      },
      (ix, iy, k) => {
        if (!full && spec.beard !== 'goatee') return [0, 0, 0];
        const b = bi(ix, iy);
        // A full beard hangs below the chin and juts a little.
        const chin = sstep(s.mouthY - 0.1, -0.98, b.y) * sstep(0.1, 0.6, b.front + 0.2);
        const drop = (full ? 0.032 : 0.016) * scale * k * chin;
        return [0, -drop, drop * 0.35];
      },
    );
  }

  const browY = P([0, s.browY, 0])[1];
  const fsec = headSection(s, s.browY + 0.12);
  const browZ = P([0, s.browY + 0.12, fsec.cz + fsec.f + 0.06 * s.browK])[2];
  // The sculpted head row by row, for things worn over the face (a scarf pulled up to the nose).
  const sections: HeadFit['sections'] = [];
  for (let iy = 0; iy <= HS; iy++) {
    let w = 0;
    let fz = -Infinity;
    let bz = Infinity;
    let y = 0;
    for (let ix = 0; ix < WS; ix++) {
      const p = at(ix, iy);
      w = Math.max(w, Math.abs(p[0] - origin[0]));
      fz = Math.max(fz, p[2]);
      bz = Math.min(bz, p[2]);
      y += p[1] / WS;
    }
    sections.push({ y, w, f: fz, b: bz });
  }
  return {
    crownY,
    browY,
    halfW,
    front: Math.max(frontZ, browZ),
    back: backZ,
    centerZ: origin[2] + s.cz * scale,
    browZ,
    chinY: P([0, -1, 0])[1],
    noseY: P([0, s.noseBaseY, 0])[1],
    sections,
  };
}
