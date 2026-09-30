import { mulberry32 } from '../../world/noise';
import type { Frame } from './frame';
import type { HeadFit } from './head';
import type { ClothKind } from './humanTex';
import { box, ellipsoid, loft, mix3, mul3, sstep, tube, type Mesher, type Ring, type RGB, type V3, type WeightFn } from './skin';

/**
 * Clothes as layers over the body, the way Gothic 3 dresses its people: a shirt, trousers tucked into boots or bound with
 * leg wraps, an outer garment whose silhouette says who someone is (tunic, jerkin, gambeson, coat, dress, robe), a belt
 * with its pouch, and the pieces a role adds (apron, shawl, scapular, hood, hat, helmet, pack). Every layer is offset
 * from the one beneath and ends in a visible turned edge, so the costume reads in hard-edged layers at a distance
 * (docs/art/gothic3-reference.md#people). Colours are vertex colours; the weave, leather grain, quilting and mail come
 * from tiling detail maps on each material.
 */

export type Neck = 'crew' | 'laced' | 'open' | 'high' | 'square';
export type Sleeve = 'long' | 'rolled' | 'short' | 'none' | 'wide';
export type OuterKind = 'tunic' | 'jerkin' | 'vest' | 'gambeson' | 'dress' | 'robe' | 'coat';

export interface Outfit {
  skin: RGB;
  shirt?: { color: RGB; cloth: 'linen' | 'wool'; sleeve: Sleeve; neck: Neck };
  legs: { color: RGB; cloth: 'wool' | 'linen' | 'leather'; baggy: number };
  feet: { kind: 'boots' | 'shoes'; color: RGB; cuff?: boolean; wraps?: RGB };
  outer?: { kind: OuterKind; color: RGB; trim?: RGB; cloth: ClothKind; hem: number; sleeve: Sleeve; neck: Neck; open?: boolean };
  mail?: RGB;
  belt?: { color: RGB; metal: RGB; pouch?: RGB; knife?: boolean; rope?: boolean };
  bracers?: RGB;
  pauldrons?: RGB;
  apron?: { color: RGB; bib: boolean };
  shawl?: RGB;
  scapular?: RGB;
  hood?: RGB;
  cowl?: RGB;
  hat?: RGB;
  helmet?: RGB;
  scarf?: RGB;
  cloak?: { color: RGB; clasp: RGB };
  pack?: { color: RGB; roll: RGB };
  satchel?: { color: RGB; strap: RGB };
  ledger?: RGB;
  /** 0 clean .. 1 caked. */
  dirt: number;
  seed: number;
}

export type MatKey = 'skin' | ClothKind | 'metal';

export class Meshers {
  private readonly map = new Map<string, Mesher>();
  constructor(private readonly make: () => Mesher) {}
  get(key: string): Mesher {
    let m = this.map.get(key);
    if (!m) {
      m = this.make();
      this.map.set(key, m);
    }
    return m;
  }
  entries(): [string, Mesher][] {
    return [...this.map.entries()];
  }
}

const SHIRT = 0.006;
const TROUSERS = 0.011;

/** Where the belt sits, what the outer layer grows by, and what the head wears: shared by the pieces. */
interface Fit {
  outerGrow: number;
  beltY: number;
  sleeveGrow: number;
  /** Where the visible sleeve ends (metres below the shoulder), or 0 for none. */
  sleeveEnd: number;
  /** The outermost skirt's section at a height, grown by `grow` (and clear of its folds): for aprons and panels over it. */
  skirt: (y: number, grow: number) => Ring;
}

export function dress(f: Frame, o: Outfit, ms: Meshers): Fit {
  const H = f.H;
  const rnd = mulberry32((o.seed ^ 0x2545f491) >>> 0);
  const ph = rnd() * 10;
  const trunkW = f.weights('trunk');
  const skirtW = f.weights('skirt');
  const skin = ms.get('skin');
  const wear = (hemY: number, dirt = o.dirt) => (th: number, y: number, c: RGB, x: number, z: number): RGB => {
    const hem = dirt * (1 - sstep(hemY, hemY + 0.32, y));
    const blot = 0.9 + 0.1 * Math.sin(x * 29 + ph) * Math.sin(z * 23 + y * 13 - ph * 0.7);
    const k = (1 - hem * 0.38) * blot * (1 - 0.04 * Math.cos(th * 2));
    return [c[0] * k, c[1] * k * 0.99, c[2] * k * 0.97];
  };
  const folds = (amp: number, from: number, to: number, n = 7) => (th: number, y: number) => amp * sstep(from, to, y) * Math.sin(th * n + ph + y * 3.1);
  const outer = o.outer;
  const outerGrow = outer ? (outer.kind === 'gambeson' ? 0.026 : outer.kind === 'jerkin' || outer.kind === 'coat' ? 0.022 : 0.017) : SHIRT;
  const fit: Fit = {
    outerGrow,
    beltY: f.hipY + 0.135 * H,
    sleeveGrow: SHIRT,
    sleeveEnd: 0,
    skirt: (y, grow) => f.hipsRing(y, outerGrow + grow, [1, 1, 1]),
  };

  /* ---------------------------------------------------------------- skin */

  // Neck and the top of the chest (under the collar); hands.
  loft(
    skin,
    [1.3, 1.36, 1.42, 1.46, 1.49, 1.51, 1.53, 1.555, 1.58, 1.61, 1.64].map((k) => f.trunkRing(k * H, 0, mul3(o.skin, k > 1.5 ? 1 : 0.94))),
    { sides: 16, wf: trunkW, tile: 0.3 },
  );
  for (const side of [1, -1]) hand(f, skin, side, o.skin);

  /* ---------------------------------------------------------------- sleeves: what covers each arm, and bare skin below */
  const outerSleeve = outer && outer.sleeve !== 'none' ? outer.sleeve : null;
  const sleeveKind: Sleeve = outerSleeve ?? o.shirt?.sleeve ?? 'none';
  const sleeveEnd = (k: Sleeve) => (k === 'long' || k === 'wide' ? f.upper + f.fore - 0.03 * H : k === 'rolled' ? f.upper + 0.1 * H : k === 'short' ? 0.13 * H : 0);
  fit.sleeveEnd = Math.max(sleeveEnd(sleeveKind), outerSleeve && o.shirt ? sleeveEnd(o.shirt.sleeve) : 0);
  // Bare arm from the end of the longest sleeve to the wrist.
  const bareFrom = fit.sleeveEnd;
  if (bareFrom < f.upper + f.fore - 0.02) {
    for (const side of [1, -1]) {
      const secs: Ring[] = [];
      const s1 = f.upper + f.fore + 0.01;
      const s0 = Math.max(-0.034 * H, bareFrom - 0.03);
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const s = s1 + ((s0 - s1) * i) / n;
        secs.push(f.armRing(side, s, 0, mul3(o.skin, 0.96 + 0.04 * (i / n))));
      }
      loft(skin, secs, { sides: 10, wf: f.weights(side > 0 ? 'armL' : 'armR'), capTop: s0 < 0 });
    }
  }

  /* ---------------------------------------------------------------- shirt */
  if (o.shirt) {
    const sh = o.shirt;
    const m = ms.get(sh.cloth);
    const c = mul3(sh.color, 1.08);
    const tuckY = 0.99 * H;
    const ys = [tuckY, 1.06 * H, 1.14 * H, 1.22 * H, 1.3 * H, 1.37 * H, 1.42 * H, 1.455 * H, 1.48 * H, 1.505 * H, 1.53 * H];
    const vDepth = sh.neck === 'laced' || sh.neck === 'open' ? 0.075 * H : sh.neck === 'square' ? 0.06 * H : 0;
    loft(
      m,
      ys.map((y) => f.trunkRing(y, SHIRT + 0.003 * sstep(1.1 * H, 1.3 * H, y), c)),
      {
        sides: 20,
        wf: trunkW,
        tile: 0.22,
        seed: o.seed + 1,
        wobble: 0.012,
        lipTop: 0.004,
        shade: wear(tuckY),
        lift: vDepth ? neckline(vDepth, 1.49 * H, sh.neck === 'square') : undefined,
        push: folds(0.003, 1.0 * H, 1.3 * H, 5),
      },
    );
    if (sh.neck === 'laced') laces(f, ms.get('leather'), 1.43 * H, 1.52 * H, SHIRT + 0.004, [0.16, 0.11, 0.07], trunkW);
    // Shirt sleeves show when nothing covers them, or peek out below a shorter outer sleeve.
    const shirtEnd = sleeveEnd(sh.sleeve);
    const outerEnd = outerSleeve ? sleeveEnd(outerSleeve) : 0;
    if (shirtEnd > outerEnd + 0.02) {
      for (const side of [1, -1]) sleeve(f, m, side, Math.max(-0.034 * H, outerEnd - 0.05), shirtEnd, SHIRT + 0.002, c, sh.sleeve, o.seed + side, wear(0));
    }
  }

  /* ---------------------------------------------------------------- trousers */
  {
    const lg = o.legs;
    const m = ms.get(lg.cloth);
    const c = mul3(lg.color, 1.06);
    // Seat and hips: from inside the thighs to the waistband.
    const ys = [0.82, 0.87, 0.92, 0.97, 1.03, 1.09, 1.13].map((k) => k * H);
    loft(m, ys.map((y) => f.trunkRing(y, TROUSERS, c)), { sides: 20, wf: trunkW, tile: 0.22, capBottom: true, lipTop: 0.005, shade: wear(0) });
    const bootTop = o.feet.kind === 'boots' ? f.thigh + 0.1 * H : f.thigh + f.shin - 0.06 * H;
    for (const side of [1, -1]) {
      const secs: Ring[] = [];
      const n = 11;
      const s0 = -0.07 * H;
      const s1 = bootTop + 0.035 * H;
      for (let i = 0; i <= n; i++) {
        const s = s1 + ((s0 - s1) * i) / n;
        // Fuller through the thigh, blousing over the boot top, gathered at the knee.
        const bag = lg.baggy * (0.012 * sstep(0.35 * H, 0.1 * H, s) + 0.012 * sstep(bootTop - 0.12 * H, bootTop - 0.02 * H, s)) - 0.003 * Math.exp(-(((s - f.thigh) / (0.05 * H)) ** 2));
        secs.push(f.legRing(side, s, TROUSERS + bag, c));
      }
      loft(m, secs, { sides: 12, wf: f.weights(side > 0 ? 'legL' : 'legR'), tile: 0.2, shade: wear(0.25 * H), push: folds(0.002 + 0.003 * lg.baggy, f.hipY - f.thigh - 0.2, f.hipY, 5), seed: o.seed + 3 + side });
    }
  }

  /* ---------------------------------------------------------------- feet */
  for (const side of [1, -1]) feet(f, ms, side, o, wear);

  /* ---------------------------------------------------------------- mail, under the outer layer */
  if (o.mail) {
    const m = ms.get('mail');
    const c = o.mail;
    const hemY = f.hipY - 0.38 * H;
    const ys: number[] = [];
    for (let y = 1.47 * H; y > hemY; y -= 0.06 * H) ys.push(y);
    ys.push(hemY);
    ys.reverse();
    loft(m, ys.map((y) => (y < f.hipY + 0.05 ? f.hipsRing(y, 0.018 + 0.02 * sstep(f.hipY, hemY, y), c) : f.trunkRing(y, 0.012, c))), { sides: 20, wf: skirtW, tile: 0.12, lipBottom: 0.004 });
    for (const side of [1, -1]) sleeve(f, m, side, -0.035 * H, f.upper + 0.12 * H, 0.011, c, 'short', o.seed + 7, (_t, _y, cc) => cc);
  }

  /* ---------------------------------------------------------------- outer garment */
  if (outer) {
    const m = ms.get(outer.cloth);
    const c = mul3(outer.color, 1.06);
    const trim = outer.trim ?? mul3(outer.color, 0.7);
    const g = outerGrow;
    const hemY = f.hipY - outer.hem * H;
    const long = outer.hem > 0.3;
    const topY = outer.kind === 'vest' || outer.kind === 'jerkin' ? 1.475 * H : 1.525 * H;
    // Body of the garment down to the hips.
    const ys = [1.02, 1.08, 1.14, 1.2, 1.26, 1.32, 1.37, 1.42, 1.45, 1.475, 1.5, 1.525].map((k) => k * H).filter((y) => y <= topY + 1e-6);
    const vDepth = outer.neck === 'laced' || outer.neck === 'open' ? 0.12 * H : outer.neck === 'square' ? 0.08 * H : 0;
    const bodyOpen = outer.kind === 'vest' || (outer.open && outer.kind !== 'coat');
    loft(
      m,
      ys.map((y) => f.trunkRing(y, g + 0.004 * sstep(1.3 * H, 1.1 * H, y), c)),
      {
        sides: 22,
        wf: trunkW,
        tile: outer.cloth === 'leather' ? 0.3 : 0.22,
        arc: bodyOpen ? [0.24, Math.PI * 2 - 0.24] : undefined,
        lipTop: 0.005,
        shade: wear(hemY),
        lift: vDepth ? neckline(vDepth, topY - 0.03 * H, outer.neck === 'square') : undefined,
        seed: o.seed + 11,
      },
    );
    if (outer.neck === 'high') {
      // A standing collar.
      loft(m, [1.5, 1.525, 1.56].map((k, i) => f.trunkRing(k * H, g + 0.006 - i * 0.002, mul3(trim, 1))), { sides: 18, wf: trunkW, lipTop: 0.006, tile: 0.2 });
    }
    if (outer.neck === 'laced') laces(f, ms.get('leather'), 1.36 * H, 1.47 * H, g + 0.004, [0.12, 0.08, 0.05], trunkW);
    // Skirt from the waist to the hem, round both legs; it follows the legs as they move.
    if (hemY < 1.02 * H) {
      const kFlare = outer.kind === 'robe' ? 0.07 : outer.kind === 'dress' ? 0.06 : outer.kind === 'coat' ? 0.05 : 0.035;
      const foldAmp = 0.006 + (long ? 0.006 : 0);
      const skirtAt = (y: number, extra: number): Ring => {
        const flare = kFlare * sstep(1.02 * H, hemY, y);
        const r = f.hipsRing(y, g + 0.004 + flare + extra, c);
        return { ...r, f: r.f + flare * 0.5, b: r.b + flare * 0.9 };
      };
      fit.skirt = (y, grow) => skirtAt(y, grow + foldAmp);
      const secs: Ring[] = [];
      const n = long ? 9 : 5;
      for (let i = 0; i <= n; i++) secs.push(skirtAt(hemY + ((1.02 * H - hemY) * i) / n, 0));
      loft(m, secs, {
        sides: 26,
        wf: skirtW,
        tile: 0.24,
        arc: outer.open ? [0.2, Math.PI * 2 - 0.2] : undefined,
        lipBottom: 0.005,
        shade: wear(hemY),
        push: folds(foldAmp, 1.0 * H, hemY, 9),
        seed: o.seed + 13,
      });
    }
    // Sleeves.
    if (outer.sleeve !== 'none') {
      const end = sleeveEnd(outer.sleeve);
      for (const side of [1, -1]) sleeve(f, m, side, -0.036 * H, end, SHIRT + 0.009 + (outer.kind === 'gambeson' ? 0.006 : 0), c, outer.sleeve, o.seed + 17 + side, wear(0), trim);
      fit.sleeveGrow = SHIRT + 0.009;
    }
    // Trim down the front of an open coat.
    if (outer.open && outer.kind === 'coat') {
      for (const side of [1, -1]) {
        const pts: V3[] = [];
        for (let i = 0; i <= 10; i++) {
          const y = hemY + ((1.49 * H - hemY) * i) / 10;
          const r = y < 1.02 * H ? f.hipsRing(y, g + 0.012, trim) : f.trunkRing(y, g + 0.006, trim);
          const th = 0.2 * side;
          pts.push([r.w * Math.sin(th) * 0.9, y, r.f * Math.cos(th) + 0.004]);
        }
        tube(m, pts, 0.017, trim, { sides: 4, wf: skirtW, flat: 0.3, up: [0, 0, 1], tile: 0.2, twist: Math.PI / 4 });
      }
    }
  }

  /* ---------------------------------------------------------------- belt */
  if (o.belt) {
    const b = o.belt;
    const y = fit.beltY;
    const g = outerGrow + 0.006;
    const m = ms.get(b.rope ? 'linen' : 'leather');
    if (b.rope) {
      const pts: V3[] = [];
      for (let i = 0; i <= 24; i++) {
        const th = (i / 24) * Math.PI * 2;
        const r = f.trunkRing(y, g, b.color);
        pts.push([r.w * Math.sin(th), y, Math.cos(th) > 0 ? r.f * Math.cos(th) : r.b * Math.cos(th)]);
      }
      tube(m, pts, 0.009, b.color, { sides: 6, wf: trunkW, up: [0, 1, 0] });
      // Knotted ends hanging at the front.
      for (const dx of [-0.02, 0.025]) {
        const r = f.trunkRing(y, g, b.color);
        const top: V3 = [dx, y, r.f + 0.006];
        tube(m, [top, [dx * 1.4, y - 0.12 * H, r.f + 0.03], [dx * 1.6, y - 0.28 * H, r.f + 0.05]], 0.007, b.color, { sides: 5, wf: skirtW, capEnd: true, up: [0, 0, 1] });
      }
    } else {
      loft(m, [f.trunkRing(y - 0.024 * H, g, mul3(b.color, 0.85)), f.trunkRing(y + 0.024 * H, g, b.color)], { sides: 22, wf: trunkW, lipTop: 0.004, lipBottom: 0.004, tile: 0.3 });
      // The buckle and the strap's end, unless an apron's bib covers them.
      if (!o.apron?.bib) {
        const front = f.trunk(y).f + g + 0.006;
        box(ms.get('metal'), [0.012, y, front], [0.024, 0.026 * H, 0.004], b.metal, trunkW);
        box(m, [-0.045, y, front - 0.002], [0.03, 0.016 * H, 0.003], mul3(b.color, 0.8), trunkW);
      }
    }
    if (b.pouch) {
      const t = f.trunk(y);
      const px = -(t.w * 0.72 + g);
      const pz = t.f * 0.55 + g;
      ellipsoid(ms.get('leather'), [px, y - 0.075 * H, pz], [0.055, 0.065 * H, 0.03], (d) => mul3(b.pouch!, 0.8 + 0.2 * d[1]), f.weights('hips'), { ws: 8, hs: 6, basis: [[Math.cos(0.8), 0, Math.sin(0.8)], [0, 1, 0], [-Math.sin(0.8), 0, Math.cos(0.8)]] });
      box(ms.get('leather'), [px + 0.004, y - 0.03 * H, pz + 0.018], [0.045, 0.012, 0.012], mul3(b.pouch, 0.7), f.weights('hips'), [[Math.cos(0.8), 0, -Math.sin(0.8)], [0, 1, 0], [Math.sin(0.8), 0, Math.cos(0.8)]]);
    }
    if (b.knife) {
      const t = f.trunk(y);
      const kx = t.w * 0.5;
      const kz = -(t.b + g) * 0.9;
      tube(ms.get('leather'), [[kx, y + 0.01, kz], [kx + 0.01, y - 0.2 * H, kz - 0.02]], [0.018, 0.01], [0.13, 0.09, 0.06], { sides: 5, wf: f.weights('hips'), flat: 0.5, capEnd: true, up: [0, 0, -1] });
    }
  }

  /* ---------------------------------------------------------------- bracers, pauldrons */
  if (o.bracers) {
    const m = ms.get('leather');
    for (const side of [1, -1]) {
      const secs: Ring[] = [];
      const s0 = f.upper + f.fore - 0.02 * H;
      const s1 = f.upper + 0.1 * H;
      for (let i = 0; i <= 4; i++) {
        const s = s0 + ((s1 - s0) * i) / 4;
        secs.push(f.armRing(side, s, fit.sleeveGrow + 0.007 + 0.004 * (i / 4), mul3(o.bracers, 0.9 + 0.1 * (i / 4))));
      }
      loft(m, secs, { sides: 10, wf: f.weights(side > 0 ? 'armL' : 'armR'), lipTop: 0.003, lipBottom: 0.003, tile: 0.2 });
      for (const k of [0.3, 0.7]) {
        const s = s0 + (s1 - s0) * k;
        const r = f.armRing(side, s, fit.sleeveGrow + 0.012, o.bracers);
        const pts: V3[] = [];
        for (let i = 0; i <= 10; i++) {
          const th = (i / 10) * Math.PI * 2;
          pts.push([r.cx! + r.w * Math.sin(th), r.y, (r.cz ?? 0) + r.f * Math.cos(th)]);
        }
        tube(m, pts, 0.003, [0.1, 0.07, 0.05], { sides: 4, wf: f.weights(side > 0 ? 'armL' : 'armR'), up: [0, 1, 0] });
      }
    }
  }
  if (o.pauldrons) {
    const m = ms.get('leather');
    for (const side of [1, -1]) {
      const c: V3 = [side * (f.shoulderX - 0.01), f.shoulderY + 0.012 * H, 0];
      // A dome whose axis tips outward over the shoulder; the basis stays right-handed on both sides.
      const cs = Math.cos(0.35);
      const sn = Math.sin(0.35);
      ellipsoid(m, c, [0.078, 0.06, 0.085], (d) => mul3(o.pauldrons!, 0.75 + 0.25 * d[1]), f.weights(side > 0 ? 'armL' : 'armR'), {
        ws: 12,
        hs: 6,
        theta: [0, 1.35],
        basis: [
          [cs, -side * sn, 0],
          [side * sn, cs, 0],
          [0, 0, 1],
        ],
      });
    }
  }

  /* ---------------------------------------------------------------- apron, scapular, shawl */
  if (o.apron) {
    const m = ms.get('linen');
    const c = mul3(o.apron.color, 1.05);
    const hemY = f.hipY - 0.4 * H;
    const top = o.apron.bib ? 1.36 * H : fit.beltY + 0.02 * H;
    const ys: number[] = [];
    for (let i = 0; i <= 8; i++) ys.push(hemY + ((top - hemY) * i) / 8);
    loft(
      m,
      // Over whatever skirt is beneath it, clear of that skirt's folds.
      ys.map((y) => (y < 1.02 * H ? { ...fit.skirt(y, 0.016), c } : f.trunkRing(y, outerGrow + 0.01, c))),
      { sides: 12, wf: skirtW, arc: [-1.05, 1.05], lipBottom: 0.003, tile: 0.25, shade: wear(hemY, o.dirt * 0.5), push: folds(0.004, 1.0 * H, hemY, 6) },
    );
    // Ties at the waist; a strap round the neck for a bib.
    const r = f.trunkRing(fit.beltY, outerGrow + 0.012, c);
    const pts: V3[] = [];
    for (let i = 0; i <= 12; i++) {
      const th = 1.0 + (i / 12) * (Math.PI * 2 - 2.0);
      pts.push([r.w * Math.sin(th), fit.beltY, Math.cos(th) > 0 ? r.f * Math.cos(th) : r.b * Math.cos(th)]);
    }
    tube(m, pts, 0.011, mul3(c, 0.92), { sides: 4, wf: trunkW, flat: 0.35, up: outward(f), twist: Math.PI / 4 });
    if (o.apron.bib) {
      // A strap from each top corner of the bib, over the base of the neck and round behind it.
      const g = outerGrow + 0.01;
      const pts2: V3[] = [];
      const cornerX = 0.075;
      const nx = 0.085 * Math.sqrt(f.G);
      for (const [x, y, dir] of [
        [cornerX, 1.36 * H, 1],
        [nx, 1.45 * H, 1],
        [nx, shoulderTop(f, nx) + g, 0],
        [nx * 0.75, 1.48 * H, -1],
        [0, 1.475 * H, -1],
        [-nx * 0.75, 1.48 * H, -1],
        [-nx, shoulderTop(f, nx) + g, 0],
        [-nx, 1.45 * H, 1],
        [-cornerX, 1.36 * H, 1],
      ] as [number, number, number][]) {
        pts2.push([x, y, dir === 0 ? 0 : surfaceZ(f, x, y, g, dir)]);
      }
      tube(m, pts2, 0.013, c, { sides: 4, wf: trunkW, flat: 0.3, up: outward(f), twist: Math.PI / 4, lift: 0.6 });
    }
  }
  if (o.scapular) {
    const m = ms.get('wool');
    const c = mul3(o.scapular, 1.05);
    const hemY = f.hipY - 0.78 * H;
    for (const back of [false, true]) {
      const ys: number[] = [];
      for (let i = 0; i <= 10; i++) ys.push(hemY + ((1.5 * H - hemY) * i) / 10);
      const a0 = back ? Math.PI - 0.5 : -0.5;
      loft(
        m,
        ys.map((y) => (y < 1.02 * H ? { ...fit.skirt(y, 0.012), c } : f.trunkRing(y, outerGrow + 0.012, c))),
        { sides: 6, wf: skirtW, arc: [a0, a0 + 1.0], lipBottom: 0.003, tile: 0.25, shade: wear(hemY) },
      );
    }
  }
  if (o.shawl) {
    const m = ms.get('wool');
    const c = mul3(o.shawl, 1.05);
    // A triangle of wool round the shoulders: its point hangs down the back, its two ends cross over the breast and
    // are tucked into the belt.
    const ys = [1.34, 1.39, 1.43, 1.465, 1.495, 1.525].map((k) => k * H);
    const g = outerGrow + 0.012;
    loft(
      m,
      ys.map((y) => {
        const r = f.trunkRing(y, g, c);
        const k = sstep(1.525 * H, 1.47 * H, y);
        const w = r.w * (1 - k) + (f.shoulderX + 0.026) * k;
        return { ...r, w: Math.max(r.w, w), f: r.f + 0.008, b: r.b + 0.01, p: 2.2 };
      }),
      {
        sides: 32,
        wf: trunkW,
        lipBottom: 0.004,
        tile: 0.2,
        wobble: 0.02,
        seed: o.seed + 21,
        lift: (th, y) => (y < 1.36 * H ? -0.2 * H * Math.max(0, -Math.cos(th)) ** 3 - (1.34 * H - fit.beltY) * Math.max(0, Math.cos(th)) ** 10 : 0),
        push: (th, y) => folds(0.005, 1.48 * H, 1.34 * H, 11)(th, y) + (y < 1.36 * H ? 0.02 * Math.max(0, Math.cos(th)) ** 10 : 0),
        shade: wear(1.2 * H),
      },
    );
  }

  /* ---------------------------------------------------------------- cloak */
  if (o.cloak) {
    const m = ms.get('wool');
    const c = mul3(o.cloak.color, 1.02);
    const hemY = f.hipY - 0.66 * H;
    const secs: Ring[] = [];
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const y = hemY + ((1.515 * H - hemY) * i) / n;
      const shoulders = f.shoulderX + f.armR(0.05 * H) + outerGrow + 0.03;
      let r: Ring;
      if (y > 1.4 * H) {
        const t = f.trunkRing(y, outerGrow + 0.028, c);
        const k = sstep(1.515 * H, 1.44 * H, y);
        r = { ...t, w: Math.max(t.w, shoulders * k + t.w * (1 - k)) };
      } else if (y > f.hipY) {
        const t = f.trunkRing(y, outerGrow + 0.03, c);
        r = { ...t, w: Math.max(t.w, shoulders * 0.98), b: t.b + 0.02 };
      } else {
        const t = { ...fit.skirt(y, 0.03), c };
        r = { ...t, w: Math.max(t.w, shoulders), b: t.b + 0.05 + 0.05 * sstep(f.hipY, hemY, y) };
      }
      secs.push({ ...r, c: mul3(c, 0.78 + 0.22 * (i / n)) });
    }
    loft(m, secs, {
      sides: 24,
      wf: (x, y, z) => (y > f.hipY ? trunkW(x, y, z) : skirtW(x, y, z)),
      arc: [0.62, Math.PI * 2 - 0.62],
      lipBottom: 0.004,
      wobble: 0.03,
      seed: o.seed + 23,
      tile: 0.3,
      push: folds(0.01, 1.3 * H, hemY, 8),
      shade: wear(hemY, o.dirt + 0.2),
    });
    const r = f.trunkRing(1.5 * H, outerGrow + 0.03, c);
    ellipsoid(ms.get('metal'), [0, 1.5 * H, r.f + 0.004], [0.018, 0.018, 0.006], o.cloak.clasp, trunkW, { ws: 8, hs: 6 });
  }

  /* ---------------------------------------------------------------- back and side */
  if (o.pack) {
    const m = ms.get('leather');
    const y = 1.27 * H;
    const back = f.trunk(y).b + outerGrow + 0.07;
    const torso = f.weights('torso');
    box(m, [0, y, -back], [0.14, 0.17 * H, 0.065], mul3(o.pack.color, 0.9), torso);
    box(m, [0, y + 0.07 * H, -back - 0.066], [0.12, 0.08 * H, 0.004], mul3(o.pack.color, 0.7), torso);
    tube(ms.get('wool'), [[-0.17, y + 0.2 * H, -back + 0.01], [0.17, y + 0.2 * H, -back + 0.01]], 0.05, o.pack.roll, { sides: 10, wf: torso, capStart: true, capEnd: true, up: [0, 1, 0] });
    for (const side of [1, -1]) {
      const g = outerGrow + 0.008;
      const x = side * 0.1 * Math.sqrt(f.G);
      const top = shoulderTop(f, x) + g;
      const underArm = f.trunkRing(1.3 * H, g, o.pack.color).w + 0.002;
      const pts: V3[] = [
        [side * 0.085, y + 0.15 * H, -back + 0.05],
        [x, 1.47 * H, surfaceZ(f, x, 1.47 * H, g, -1)],
        [x, top, 0],
        [x * 1.05, 1.45 * H, surfaceZ(f, x * 1.05, 1.45 * H, g, 1)],
        [x * 1.2, 1.37 * H, surfaceZ(f, x * 1.2, 1.37 * H, g, 1)],
        [side * underArm * 0.9, 1.3 * H, surfaceZ(f, underArm * 0.9, 1.3 * H, g, 1) * 0.6],
        [side * underArm, 1.26 * H, -0.02],
        [side * 0.12, y - 0.1 * H, -back + 0.05],
      ];
      tube(m, pts, 0.024, mul3(o.pack.color, 0.75), { sides: 4, wf: trunkW, flat: 0.2, up: outward(f), twist: Math.PI / 4, lift: 0.7 });
    }
  }
  if (o.satchel) {
    const m = ms.get('leather');
    const bagY = f.hipY + 0.02 * H;
    const t = f.hipsRing(bagY, outerGrow + 0.02, o.satchel.color);
    // A soft leather bag: a rounded box, slumped at the bottom, its flap over the top.
    ellipsoid(m, [t.w + 0.028, bagY, 0.02], [0.03, 0.085 * H, 0.11], (d) => mul3(o.satchel!.color, 0.75 + 0.25 * d[1]), f.weights('hips'), {
      ws: 12,
      hs: 8,
      shape: (d) => {
        const k = 0.55;
        const sy = Math.sign(d[1]) * Math.pow(Math.abs(d[1]), k);
        const sz = Math.sign(d[2]) * Math.pow(Math.abs(d[2]), k);
        return [d[0] * (1 - 0.25 * Math.abs(d[1])), Math.max(-0.92, sy), sz];
      },
    });
    box(m, [t.w + 0.06, bagY + 0.045 * H, 0.02], [0.004, 0.045 * H, 0.1], mul3(o.satchel.color, 0.72), f.weights('hips'));
    bandolier(f, m, -1, outerGrow + 0.012, 0.02, o.satchel.strap, trunkW);
  }
  if (o.ledger) {
    const m = ms.get('leather');
    const t = f.trunk(fit.beltY);
    box(m, [t.w + outerGrow + 0.03, fit.beltY - 0.1 * H, 0.03], [0.02, 0.12 * H, 0.09], o.ledger, f.weights('hips'), [[1, 0, 0], [0, Math.cos(0.12), Math.sin(0.12)], [0, -Math.sin(0.12), Math.cos(0.12)]]);
    box(m, [t.w + outerGrow + 0.052, fit.beltY - 0.1 * H, 0.03], [0.002, 0.105 * H, 0.078], [0.52, 0.47, 0.36], f.weights('hips'));
  }
  return fit;
}

/** Headwear, fitted round the head that was built (hood, scarf, hat, helmet, cowl). */
export function dressHead(f: Frame, o: Outfit, ms: Meshers, head: HeadFit, outerGrow: number) {
  const H = f.H;
  const headW = f.weights('head');
  const trunkW = f.weights('trunk');
  const cx = 0;
  const cz = head.centerZ;
  const halfD = (head.front - head.back) / 2;
  const midZ = (head.front + head.back) / 2;
  const collar = (color: RGB, lo: number) => {
    const ys = [lo, 1.4, 1.46, 1.5, 1.535].map((k) => k * H);
    loft(
      ms.get('wool'),
      ys.map((y, i) => {
        const r = f.trunkRing(y, outerGrow + 0.014 + 0.008 * (1 - i / 4), color);
        const shoulders = f.shoulderX + f.armR(0.04 * H) * 0.7 + outerGrow + 0.012;
        const k = sstep(1.52 * H, 1.44 * H, y);
        return { ...r, w: Math.max(r.w, shoulders * k + r.w * (1 - k)), f: r.f + 0.008 * k, b: r.b + 0.01 * k, p: 2.1, c: mul3(color, 0.8 + 0.2 * (i / 4)) };
      }),
      { sides: 24, wf: trunkW, lipBottom: 0.005, wobble: 0.04, seed: o.seed + 31, tile: 0.2 },
    );
  };
  if (o.hood) {
    const m = ms.get('wool');
    const c = o.hood;
    collar(mul3(c, 0.95), 1.32);
    // The hood: round the back and sides of the head, open at the face, rounding over the crown.
    const y0 = f.headY + 0.01 * H;
    const y1 = head.crownY + 0.04;
    const rings: Ring[] = [];
    const nR = 11;
    for (let i = 0; i <= nR; i++) {
      const k = i / nR;
      const y = y0 + (y1 - y0) * k;
      // Loose round the head, a dome over the crown, drawn back into a soft point behind it.
      const dome = k < 0.5 ? 1 : Math.pow(Math.cos(((k - 0.5) / 0.5) * (Math.PI / 2)), 0.75);
      const w = (head.halfW + 0.03) * (0.9 + 0.1 * Math.sin(Math.PI * k * 0.9)) * dome;
      rings.push({
        y,
        w: Math.max(0.006, w),
        f: Math.max(0.006, (halfD + 0.024) * (0.35 + 0.65 * dome)),
        b: Math.max(0.006, (halfD + 0.04 + 0.03 * k) * Math.pow(dome, 0.55)),
        cx,
        cz: midZ - 0.006 - 0.04 * k * k,
        p: 2,
        c: mul3(c, 0.82 + 0.18 * k),
      });
    }
    // Open at the face below the upper forehead, closed above it.
    const openTop = head.browY + 0.05 * H;
    let split = rings.findIndex((r) => r.y >= openTop);
    if (split < 1) split = Math.max(1, rings.length - 3);
    const open = 0.82;
    const lower = rings.slice(0, split + 1);
    const upper = rings.slice(split);
    loft(m, lower, { sides: 18, wf: headW, arc: [open, Math.PI * 2 - open], lipBottom: 0.004, tile: 0.2, wobble: 0.02, seed: o.seed + 33 });
    loft(m, upper, { sides: 22, wf: headW, capTop: true, tile: 0.2, wobble: 0.02, seed: o.seed + 34 });
    // The face opening's turned edge: up one side, across the brow, down the other.
    const edge: V3[] = [];
    const at = (r: Ring, th: number): V3 => [r.w * Math.sin(th), r.y, (Math.cos(th) > 0 ? r.f : r.b) * Math.cos(th) + (r.cz ?? 0)];
    for (const r of lower) edge.push(at(r, -open));
    const top = lower[lower.length - 1]!;
    for (let i = 1; i < 6; i++) edge.push(at(top, -open + (2 * open * i) / 6));
    for (const r of [...lower].reverse()) edge.push(at(r, open));
    tube(m, edge, 0.011, mul3(c, 0.72), { sides: 5, wf: headW, flat: 0.7, up: (p) => [p[0], 0, p[2] - midZ] });
  } else if (o.cowl) {
    collar(o.cowl, 1.34);
  }
  if (o.scarf) {
    const m = ms.get('linen');
    const c = o.scarf;
    const ys: number[] = [];
    const y0 = head.browY + 0.008;
    const y1 = head.crownY + 0.008;
    for (let i = 0; i <= 6; i++) ys.push(y0 + ((y1 - y0) * i) / 6);
    loft(
      m,
      ys.map((y, i) => {
        const k = i / 6;
        const round = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (k - 0.45) / 0.55), 2)));
        return { y, w: (head.halfW + 0.006) * round, f: (halfD + 0.004) * round, b: (halfD + 0.008) * round, cx, cz: midZ, p: 2, c: mul3(c, 0.85 + 0.15 * k) };
      }),
      { sides: 20, wf: headW, capTop: true, lipBottom: 0.003, tile: 0.18, lift: (th) => -0.035 * Math.max(0, -Math.cos(th)) * H, seed: o.seed + 35 },
    );
    // The knot and its tails at the nape.
    const ky = y0 - 0.03;
    const kz = head.back - 0.012;
    ellipsoid(m, [0, ky, kz], [0.022, 0.016, 0.014], c, headW, { ws: 8, hs: 6 });
    for (const side of [1, -1]) tube(m, [[side * 0.008, ky - 0.01, kz], [side * 0.02, ky - 0.08, kz - 0.015]], [0.014, 0.008], mul3(c, 0.85), { sides: 4, wf: f.weights('hair'), flat: 0.3, capEnd: true, up: [0, 0, -1] });
  }
  if (o.hat) {
    const m = ms.get('felt');
    const c = o.hat;
    const y0 = head.browY + 0.02;
    // Brim: a soft felt disc drooping at front and back; crown: low and rounded, dented a little on top.
    ellipsoid(m, [0, y0, midZ], [head.halfW + 0.09, 0.008, halfD + 0.09], (d) => mul3(c, d[1] > 0 ? 1 : 0.7), headW, {
      ws: 22,
      hs: 4,
      shape: (d) => [d[0], d[1] - 3.2 * d[2] * d[2] + 0.7 * d[0] * d[0], d[2]],
    });
    const ys = [y0, y0 + 0.035, (y0 + head.crownY) / 2 + 0.02, head.crownY + 0.014, head.crownY + 0.026];
    loft(
      m,
      ys.map((y, i) => {
        const k = [1, 0.97, 0.9, 0.66, 0.22][i]!;
        return { y, w: (head.halfW + 0.012) * k, f: (halfD + 0.01) * k, b: (halfD + 0.012) * k, cx, cz: midZ, p: 2.2, c: mul3(c, 0.9 + 0.1 * (i / 4)) };
      }),
      { sides: 18, wf: headW, capTop: true, tile: 0.2, wobble: 0.04, seed: o.seed + 37 },
    );
    loft(m, [0, 1].map((i) => ({ y: y0 + 0.006 + i * 0.022, w: head.halfW + 0.015, f: halfD + 0.013, b: halfD + 0.015, cx, cz: midZ, p: 2.2, c: [0.08, 0.06, 0.045] as RGB })), { sides: 18, wf: headW });
  }
  if (o.helmet) {
    const m = ms.get('metal');
    const c = o.helmet;
    // An iron kettle hat: a low dome with a ridge, sitting above the brows, its brim sloping steeply down all round.
    const y0 = head.browY + 0.03;
    const ys: number[] = [y0 - 0.014];
    for (let i = 0; i <= 6; i++) ys.push(y0 + (head.crownY + 0.006 - y0) * (i / 6));
    loft(
      m,
      ys.map((y, i) => {
        const k = Math.max(0, (i - 1) / 6);
        const round = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (k - 0.2) / 0.8), 1.6)));
        return { y, w: Math.max(0.004, (head.halfW + 0.008) * round), f: Math.max(0.004, (halfD + 0.006) * round), b: Math.max(0.004, (halfD + 0.008) * round), cx, cz: midZ, p: 2, c: mul3(c, 0.7 + 0.3 * k) };
      }),
      { sides: 20, wf: headW, capTop: true, lipBottom: 0.003, push: (th) => 0.004 * Math.pow(Math.abs(Math.cos(th)), 12) },
    );
    ellipsoid(m, [0, y0 + 0.004, midZ], [head.halfW + 0.04, 0.005, halfD + 0.04], mul3(c, 0.65), headW, { ws: 20, hs: 4, shape: (d) => [d[0], d[1] - 4.6 * (d[0] * d[0] + d[2] * d[2]), d[2]] });
  }
  void cz;
}

/* ---------------------------------------------------------------- pieces */

/** A neckline: vertices at the front of the top rings sink to a V (or a square). */
function neckline(depth: number, fromY: number, square: boolean) {
  return (th: number, y: number) => {
    if (y < fromY) return 0;
    const k = sstep(fromY, fromY + 0.04, y);
    const c = Math.cos(th);
    if (c <= 0) return 0;
    const v = square ? sstep(0.55, 0.8, c) : Math.pow(c, 6);
    return -depth * v * k;
  };
}

/** Crossed laces down the front, between two heights. */
function laces(f: Frame, m: Mesher, y0: number, y1: number, grow: number, color: RGB, wf: WeightFn) {
  const n = 4;
  for (let i = 0; i < n; i++) {
    const ya = y0 + ((y1 - y0) * i) / n;
    const yb = y0 + ((y1 - y0) * (i + 1)) / n;
    for (const side of [1, -1]) {
      const za = f.trunk(ya).f + grow;
      const zb = f.trunk(yb).f + grow;
      tube(m, [[-0.018 * side, ya, za], [0.018 * side, yb, zb]], 0.0025, color, { sides: 4, wf, up: [0, 0, 1] });
    }
  }
}

/** A sleeve from s0 to s1 below the shoulder, with a cuff, a roll or a flare at its end. */
function sleeve(f: Frame, m: Mesher, side: number, s0: number, s1: number, grow: number, c: RGB, kind: Sleeve, seed: number, shade: (th: number, y: number, c: RGB, x: number, z: number) => RGB, trim?: RGB) {
  const secs: Ring[] = [];
  const n = Math.max(4, Math.round((s1 - s0) / 0.05));
  for (let i = 0; i <= n; i++) {
    const s = s1 + ((s0 - s1) * i) / n;
    const k = 1 - i / n;
    const wide = kind === 'wide' ? 0.045 * sstep(0.15, 1, k) : 0;
    const baggy = 0.003 * Math.sin(k * Math.PI);
    secs.push(f.armRing(side, s, grow + baggy + wide, mul3(c, 0.92 + 0.08 * (1 - k))));
  }
  const wf = f.weights(side > 0 ? 'armL' : 'armR');
  loft(m, secs, { sides: 12, wf, tile: 0.2, lipBottom: kind === 'wide' ? 0.004 : 0.003, seed, wobble: 0.015, shade, capTop: s0 <= -0.03 * f.H, push: (th, y) => 0.002 * Math.sin(th * 5 + y * 60) });
  if (kind === 'rolled') {
    // The roll of cloth pushed up the forearm.
    const r0 = f.armRing(side, s1 + 0.005, grow + 0.009, mul3(c, 0.95));
    const r1 = f.armRing(side, s1 - 0.035, grow + 0.011, c);
    loft(m, [r0, { ...r1, y: (r0.y + r1.y) / 2, w: r1.w + 0.002, f: r1.f + 0.002, b: r1.b + 0.002 }, r1], { sides: 12, wf, lipBottom: 0.003, lipTop: 0.003, tile: 0.2 });
  } else if (kind === 'long' || kind === 'wide') {
    const a = f.armRing(side, s1 + 0.002, grow + 0.004 + (kind === 'wide' ? 0.045 : 0), trim ?? mul3(c, 0.85));
    const b = f.armRing(side, s1 - 0.04, grow + 0.004 + (kind === 'wide' ? 0.04 : 0), trim ?? mul3(c, 0.85));
    loft(m, [a, b], { sides: 12, wf, lipBottom: 0.003, lipTop: 0.002, tile: 0.2 });
  }
}

/** A hand hanging at the wrist: palm, four fingers and a thumb, relaxed and a little curled. */
function hand(f: Frame, m: Mesher, side: number, skin: RGB) {
  const hs = f.handScale * f.H;
  const wf = f.weights(side > 0 ? 'armL' : 'armR');
  const wx = side * f.shoulderX;
  const wy = f.shoulderY - f.upper - f.fore;
  // Palm: from the knuckles up to the wrist; x is thickness (the palm faces the thigh), z its width.
  const palmL = 0.092 * hs;
  const palm: Ring[] = [];
  const rows: [number, number, number][] = [
    [-palmL, 0.043, 0.0125],
    [-palmL * 0.7, 0.045, 0.015],
    [-palmL * 0.35, 0.042, 0.016],
    [0, 0.033, 0.017],
    [0.02 * hs, 0.029, 0.018],
  ];
  for (const [dy, hw, th] of rows) {
    palm.push({ y: wy + dy, w: th * hs, f: hw * hs, b: hw * hs * 0.95, cx: wx - side * 0.002, cz: 0.004 * hs, p: 2.6, c: mul3(skin, dy < -palmL * 0.5 ? 0.97 : 1) });
  }
  loft(m, palm, { sides: 12, wf, capBottom: true });
  // Fingers from the knuckles, curling toward the palm (inward, -x on the left hand).
  const lens: [number, number, number, number][] = [
    [0.028, 0.044, 0.026, 0.02],
    [0.009, 0.049, 0.029, 0.021],
    [-0.01, 0.046, 0.027, 0.02],
    [-0.028, 0.036, 0.021, 0.018],
  ];
  const curl = [0.28, 0.5, 0.4];
  lens.forEach(([z0, l1, l2, l3], i) => {
    const pts: V3[] = [];
    let p: V3 = [wx - side * 0.002, wy - palmL + 0.004 * hs, z0 * hs + 0.004 * hs];
    pts.push(p);
    let a = 0.05 + i * 0.02;
    for (const [j, l] of [l1, l2, l3].entries()) {
      a += curl[j]! * (1 + i * 0.08);
      const d: V3 = [-side * Math.sin(a), -Math.cos(a), 0];
      p = [p[0] + d[0] * l * hs, p[1] + d[1] * l * hs, p[2] + d[2] * l * hs - (i === 0 ? 0.002 : 0)];
      pts.push(p);
    }
    const r0 = (i === 3 ? 0.0082 : 0.0095) * hs;
    tube(m, pts, [r0, r0 * 0.94, r0 * 0.86, r0 * 0.74], [mul3(skin, 1.02), skin, mul3(skin, 0.98), [skin[0] * 1.02, skin[1] * 0.92, skin[2] * 0.9]], { sides: 6, wf, capEnd: true, up: [side, 0, 0] });
  });
  // Thumb: from the base of the palm, forward and down, turned to face the fingers.
  const t0: V3 = [wx - side * 0.006 * hs, wy - 0.02 * hs, 0.03 * hs];
  const t1: V3 = [wx - side * 0.014 * hs, wy - 0.05 * hs, 0.047 * hs];
  const t2: V3 = [wx - side * 0.022 * hs, wy - 0.075 * hs, 0.05 * hs];
  const t3: V3 = [wx - side * 0.028 * hs, wy - 0.095 * hs, 0.044 * hs];
  tube(m, [t0, t1, t2, t3], [0.013 * hs, 0.011 * hs, 0.0095 * hs, 0.008 * hs], skin, { sides: 6, wf, capEnd: true, up: [side, 0, 0] });
}

/** Boots or shoes, the foot, and leg wraps. */
function feet(f: Frame, ms: Meshers, side: number, o: Outfit, wear: (hemY: number, dirt?: number) => (th: number, y: number, c: RGB, x: number, z: number) => RGB) {
  const H = f.H;
  const m = ms.get('leather');
  const wf = f.weights(side > 0 ? 'legL' : 'legR');
  const fx = side * (f.hipX + 0.004);
  const c = mul3(o.feet.color, 1.05);
  const boots = o.feet.kind === 'boots';
  const topS = boots ? f.thigh + 0.11 * H : f.thigh + f.shin - 0.05 * H;
  const ankleS = f.thigh + f.shin;
  // The shaft: from below the ankle up over the trousers.
  const secs: Ring[] = [];
  const n = boots ? 7 : 3;
  for (let i = 0; i <= n; i++) {
    const s = ankleS + 0.02 * H + ((topS - ankleS - 0.02 * H) * i) / n;
    const flare = boots ? 0.006 * sstep(topS - 0.1 * H, topS, s) : 0;
    const r = f.legRing(side, s, TROUSERS + 0.006 + flare, mul3(c, 0.9 + 0.1 * (i / n)));
    secs.push(r);
  }
  secs.reverse();
  loft(m, secs, { sides: 12, wf, lipTop: 0.004, tile: 0.25, shade: wear(0.25 * H, o.dirt + 0.3), push: (th, y) => 0.0025 * Math.sin(th * 3 + y * 70) * sstep(0.12 * H, 0.35 * H, y) });
  if (boots && o.feet.cuff) {
    // The turned-down top.
    const a = f.legRing(side, topS + 0.075 * H, TROUSERS + 0.017, mul3(c, 0.78));
    const b = f.legRing(side, topS - 0.004 * H, TROUSERS + 0.021, mul3(c, 0.95));
    loft(m, [a, b], { sides: 12, wf, lipBottom: 0.004, lipTop: 0.003, tile: 0.25, wobble: 0.05, seed: o.seed + side });
  }
  // Foot: lofted from heel to toe (the loft's "up" runs forward; its front faces down to the sole).
  const L = 0.285 * H;
  const heelZ = -0.07 * H;
  const prof: [number, number, number][] = [
    // along, half-width, height of the top above the sole
    [0, 0.03, 0.07],
    [0.07, 0.042, 0.105],
    [0.25, 0.046, 0.11],
    [0.45, 0.046, 0.088],
    [0.65, 0.05, 0.066],
    [0.8, 0.05, 0.052],
    [0.92, 0.043, 0.044],
    [1, 0.025, 0.03],
  ];
  const rings: Ring[] = prof.map(([t, hw, top]) => {
    const h = top * H;
    return { y: t * L, w: hw * H, f: h / 2, b: h / 2, cz: -h / 2, p: 2.6, c };
  });
  loft(m, rings, {
    sides: 14,
    wf,
    capBottom: true,
    capTop: true,
    tile: 0.25,
    map: (x, y, z) => [fx + x, -z, heelZ + y],
    // A dark sole under the foot.
    shade: (th, _y, cc) => (Math.cos(th) > 0.55 ? mul3(cc, 0.35) : mul3(cc, 0.9 + 0.1 * Math.sin(th * 3))),
  });
  box(m, [fx, 0.014 * H, heelZ + 0.035 * H], [0.034 * H, 0.014 * H, 0.035 * H], mul3(c, 0.35), wf);
  // Leg wraps over the trousers, from the ankle to below the knee.
  if (o.feet.wraps && !boots) {
    const lm = ms.get('linen');
    const s0 = ankleS - 0.03 * H;
    const s1 = f.thigh + 0.06 * H;
    // Bands wound upward, each overlapping the last, then a cord crossed over them and tied below the knee.
    const helix = (turns: number, grow: number, dir: number, phase: number): V3[] => {
      const pts: V3[] = [];
      const steps = Math.round(turns * 14);
      for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        const s = s0 + (s1 - s0) * k;
        const th = dir * k * turns * Math.PI * 2 + phase;
        const r = f.legRing(side, s, grow, o.feet.wraps!);
        pts.push([r.cx! + r.w * Math.sin(th), r.y, (r.cz ?? 0) + r.f * Math.cos(th)]);
      }
      return pts;
    };
    const band = helix(6, TROUSERS + 0.004, 1, 0);
    tube(lm, band, 0.045 * H, band.map((_, i) => mul3(o.feet.wraps!, 0.94 + 0.06 * Math.sin(i * 0.45))), {
      sides: 4,
      wf,
      flat: 0.07,
      up: (p) => [p[0] - fx, 0, p[2]],
      tile: 0.12,
      twist: Math.PI / 4,
      lift: 0.7,
    });
    for (const [dir, ph] of [
      [1, 0.4],
      [-1, 2.2],
    ] as const) {
      const cord = helix(2, TROUSERS + 0.009, dir, ph);
      tube(ms.get('leather'), cord, 0.0028, [0.1, 0.075, 0.05], { sides: 4, wf, up: (p) => [p[0] - fx, 0, p[2]] });
    }
  }
}

/** The body's surface in front (+1) or behind (-1) at (x, y), with `grow` added; 0 beyond the side. */
function surfaceZ(f: Frame, x: number, y: number, grow: number, dir: number): number {
  const r = f.trunkRing(y, grow, [0, 0, 0]);
  const p = r.p ?? 2;
  const q = Math.min(1, Math.abs(x) / r.w);
  const k = Math.pow(Math.max(0, 1 - Math.pow(q, p)), 1 / p);
  return dir * (dir > 0 ? r.f : r.b) * k;
}

/** Height of the top of the shoulder at |x| (where the trunk's half-width falls to |x|). */
function shoulderTop(f: Frame, x: number): number {
  const H = f.H;
  let y = 1.44 * H;
  while (y < 1.6 * H && f.trunk(y).w > Math.abs(x)) y += 0.002 * H;
  return y;
}

/**
 * A path round the body from the top of one shoulder (side +1 = the left) down across the chest to the opposite hip and
 * back up across the back: for straps, bandoliers and the sash.
 */
function crossPath(f: Frame, side: number, grow: number, lowY: number): V3[] {
  const H = f.H;
  const topX = side * 0.105 * Math.sqrt(f.G);
  const topY = shoulderTop(f, topX) + grow;
  const pts: V3[] = [];
  const n = 10;
  const hip = (y: number) => f.trunkRing(y, grow, [0, 0, 0]).w;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = topY + (lowY - topY) * t;
    const x = topX + (-side * hip(lowY) * 0.97 - topX) * t;
    pts.push([x, y, surfaceZ(f, x, y, grow, 1) + (i === 0 ? 0.01 : 0)]);
  }
  pts.push([-side * (hip(lowY) + 0.002), lowY, 0]);
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const y = topY + (lowY - topY) * t;
    const x = topX + (-side * hip(lowY) * 0.97 - topX) * t;
    pts.push([x, y, surfaceZ(f, x, y, grow, -1) - (i === 0 ? 0.01 : 0)]);
  }
  pts.push([topX, topY + 0.008 * H, 0]);
  pts.push(pts[0]!);
  return pts;
}

/** Outward from the body at a point, tipping up over the top of the shoulders. */
const outward = (f: Frame) => (p: V3): V3 => [p[0] * 0.6, Math.max(0, p[1] - 1.43 * f.H) * 12, p[2]];

/** A strap across the body from one shoulder (side +1 = the left) to the opposite hip. */
function bandolier(f: Frame, m: Mesher, side: number, grow: number, width: number, color: RGB, wf: WeightFn) {
  const pts = crossPath(f, side, grow, f.hipY + 0.07 * f.H);
  tube(m, pts, width * 1.41, color, { sides: 4, wf, flat: 0.16, up: outward(f), tile: 0.2, twist: Math.PI / 4, lift: 0.7 });
}

/** The sash of local standing (recoloured at runtime): a band from the left shoulder to the right hip. */
export function sashBand(f: Frame, m: Mesher, outerGrow: number) {
  bandolier(f, m, 1, outerGrow + 0.016, 0.034, [1, 1, 1], f.weights('trunk'));
}

export { mix3 };
