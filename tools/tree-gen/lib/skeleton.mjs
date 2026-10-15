// Four-level recursive oak skeleton: trunk -> limbs -> boughs -> twigs, as polylines with radii.
// Forks use Murray-style radius ratios (0.75-0.8 of the parent at the fork, with an extra lateral factor for side
// shoots), branch angles of 35-60 degrees from the parent's axis, phototropic bending and a noisy crown envelope.
import * as THREE from 'three';
import { makeRng, fbm3, clamp, lerp, smoothstep } from './util.mjs';

const UP = new THREE.Vector3(0, 1, 0);

export const OAK = {
  height: 15,
  trunkTop: 5.6,            // veteran oak: a short, thick bole that dissolves into the primary limbs at about this height
  trunkRadius: 0.82,        // radius at 1.5 m before the flare, metres
  flareGain: 0.55, flareDecay: 1.1,
  limbs: 10, boughsPerLimb: [3, 5], twigsPerBough: [9, 13],
  murray: [0.75, 0.8], lateral: { 1: 1.0, 2: 0.82, 3: 0.6 },
  angle: [35, 60],
  minHeight: 2.4,           // wood stays above the player slab (colliders are trunk-only)
};

export function trunkRadiusAt(y, P = OAK) {
  const t = clamp(y / P.trunkTop, 0, 1);
  const base = P.trunkRadius - 0.22 * Math.pow(t, 0.9);
  return base * (1 + P.flareGain * Math.exp(-Math.max(y, 0) / P.flareDecay));
}

class Branch {
  constructor(o) { Object.assign(this, o); this.children = []; this.cum = []; }
  finish() {
    let c = 0; this.cum = [0];
    for (let i = 1; i < this.points.length; i++) { c += this.points[i].distanceTo(this.points[i - 1]); this.cum.push(c); }
    this.length = c;
    this.tangents = this.points.map((p, i) => {
      const a = this.points[Math.max(0, i - 1)], b = this.points[Math.min(this.points.length - 1, i + 1)];
      return b.clone().sub(a).normalize();
    });
  }
  /** Position, tangent and radius at fraction t of the path length. */
  at(t) {
    const d = clamp(t, 0, 1) * this.length;
    let i = 1; while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const f = clamp((d - this.cum[i - 1]) / Math.max(1e-6, this.cum[i] - this.cum[i - 1]), 0, 1);
    return {
      p: this.points[i - 1].clone().lerp(this.points[i], f),
      tan: this.tangents[i - 1].clone().lerp(this.tangents[i], f).normalize(),
      r: lerp(this.radii[i - 1], this.radii[i], f),
    };
  }
}

export function growOak(seed, P = OAK) {
  const rng = makeRng(seed), branches = [];
  const center = new THREE.Vector3(rng.range(-0.9, 0.9), rng.range(8.3, 8.9), rng.range(-0.9, 0.9));
  const Rh = rng.range(6.7, 7.5), Rv = rng.range(6.1, 6.9);
  // Crown envelope: >1 outside. Noise makes the outline irregular with gaps and asymmetric limbs.
  const envelope = (p) => {
    const m = 0.78 + 0.5 * fbm3(p.x * 0.22, p.y * 0.22, p.z * 0.22, seed, 3);
    const dx = (p.x - center.x) / (Rh * m), dz = (p.z - center.z) / (Rh * m), dy = (p.y - center.y) / (Rv * (0.85 + 0.3 * m) * (p.y > center.y ? 1.12 : 0.78));   // domed: fuller above the centre, flatter below
    return dx * dx + dz * dz + dy * dy;
  };
  let phaseSeed = 0;
  const newPhase = () => { phaseSeed++; return rng() * Math.PI * 2; };

  function grow(o) {
    const { start, level, step, wobble, tropism, droop, length, r0, taper } = o;
    const pts = [start.clone()], d = o.dir.clone().normalize(), d0 = d.clone(), prev = d.clone();
    // Limbs and boughs: bounded turn per step, bounded drift from the launch direction and limited droop, so none hooks back or curls.
    const bounded = level >= 1 && level <= 2, maxTurn = level === 1 ? 0.3 : 0.45, maxDrift = level === 1 ? 0.5 : 0.2, minY = level === 1 ? -0.2 : -0.45;
    const n = Math.max(2, Math.round(length / step)), seg = length / n;
    for (let i = 1; i <= n; i++) {
      const t = i / n, last = pts[pts.length - 1];
      d.x += rng.gauss() * wobble * 0.5; d.y += rng.gauss() * wobble * 0.3; d.z += rng.gauss() * wobble * 0.5;
      d.y += tropism;                                   // phototropism: shoots lean toward the light
      d.y -= droop * t * t;                             // thin ends sag under load
      const q = envelope(last);
      if (q > 0.85) { const out = last.clone().sub(center).setY(0).normalize(); d.addScaledVector(out, -0.35 * (q - 0.85) * 2.2); d.y -= 0.03 * (q - 0.85); }
      d.normalize();
      if (bounded) {
        if (d.y < minY) { d.y = minY; d.normalize(); }
        if (d.dot(d0) < maxDrift) { d.addScaledVector(d0, (maxDrift - d.dot(d0)) * 1.6).normalize(); }
        const turn = Math.acos(clamp(d.dot(prev), -1, 1));
        if (turn > maxTurn) d.copy(prev).lerp(d, maxTurn / turn).normalize();
        prev.copy(d);
      }
      const p = last.clone().addScaledVector(d, seg);
      if (level >= 1 && p.y < P.minHeight) { p.y = lerp(p.y, P.minHeight, 0.8); }
      pts.push(p);
      // Bough and twig tips end inside the crown envelope: nothing bare pokes out of the leaves.
      if (level >= 2 && i > 2 && envelope(p) > 0.9) break;
      // A limb ends at the foliage envelope too, so no bare arm reaches past the leaves.
      if (level === 1 && i > 2 && envelope(p) > 0.8) break;
    }
    const radii = pts.map((_, i) => Math.max(o.rMin ?? 0.012, r0 * (1 - taper * Math.pow(i / (pts.length - 1), 0.9))));
    if (level === 3) radii[radii.length - 1] = 0.006;   // twigs end in a point
    if (level === 2 || o.tip) radii[radii.length - 1] = 0.012;   // boughs and limb ends close to a point, never a cut end
    const b = new Branch({ ...o.meta, level, points: pts, radii, phase: newPhase(), parent: o.parent ?? null, forkT: o.forkT ?? 0, id: branches.length });
    b.finish(); branches.push(b); o.parent?.children.push(b); return b;
  }

  // Trunk (not an envelope-bound path: it leans a little and wobbles low-frequency).
  const trunkPts = [], trunkRadii = [];
  const rings = [-1.8, -1.2, -0.6, -0.2, 0.2, 0.6, 1.0, 1.5, 2.0, 2.6, 3.2, 3.9, 4.6, 5.2, P.trunkTop];
  const leanX = rng.range(-0.35, 0.35), leanZ = rng.range(-0.35, 0.35);
  for (const y of rings) {
    const t = Math.max(0, y) / P.trunkTop;
    trunkPts.push(new THREE.Vector3(leanX * t * t + (fbm3(y * 0.4, 1, 0, seed) - 0.5) * 0.35 * t, y, leanZ * t * t + (fbm3(y * 0.4, 7, 0, seed + 3) - 0.5) * 0.35 * t));
    trunkRadii.push(trunkRadiusAt(Math.max(y, 0.0), P) * (y < 0 ? 1.0 : 1));
  }
  const trunk = new Branch({ level: 0, points: trunkPts, radii: trunkRadii, phase: 0, parent: null, forkT: 0, id: 0, isTrunk: true });
  trunk.finish(); branches.push(trunk);

  // Limbs: lateral ones peel off the upper trunk on a golden-angle spiral, then the leaders at the top.
  const heights = [2.6, 3.0, 3.9, 4.3, 5.0, 5.4];   // staggered in three bands, a golden angle apart in azimuth
  const az0 = rng() * Math.PI * 2, golden = 2.399963;
  const limbSpecs = [];
  heights.forEach((y, i) => limbSpecs.push({ y, az: az0 + i * golden + rng.range(-0.3, 0.3), polar: rng.range(P.angle[0] + 4, P.angle[1] - 6), top: false }));
  limbSpecs.push({ y: P.trunkTop, az: az0 + 6 * golden, polar: rng.range(40, 52), top: true });
  limbSpecs.push({ y: P.trunkTop, az: az0 + 6 * golden + Math.PI + rng.range(-0.4, 0.4), polar: rng.range(44, 56), top: true });
  // Secondary stems: upright co-dominant leaders that part from the bole a little below its top.
  limbSpecs.push({ y: 4.7, az: az0 + 7 * golden, polar: rng.range(22, 30), top: true });
  limbSpecs.push({ y: 5.3, az: az0 + 8 * golden, polar: rng.range(24, 32), top: true });
  const frame = (tan) => { const ref = Math.abs(tan.y) < 0.95 ? UP : new THREE.Vector3(1, 0, 0); const u = new THREE.Vector3().crossVectors(ref, tan).normalize(), w = new THREE.Vector3().crossVectors(tan, u); return [u, w]; };
  const forkDir = (tan, az, polarDeg) => { const [u, w] = frame(tan), th = polarDeg * Math.PI / 180; return tan.clone().multiplyScalar(Math.cos(th)).addScaledVector(u, Math.cos(az) * Math.sin(th)).addScaledVector(w, Math.sin(az) * Math.sin(th)).normalize(); };

  const limbs = [];
  const k0 = (spec) => spec.az * 0.37;
  for (const spec of limbSpecs.slice(0, P.limbs)) {
    const tAtY = (y) => { let i = 1; while (i < trunk.points.length - 1 && trunk.points[i].y < y) i++; const p0 = trunk.points[i - 1], p1 = trunk.points[i], f = clamp((y - p0.y) / Math.max(1e-6, p1.y - p0.y), 0, 1); return (trunk.cum[i - 1] + f * (trunk.cum[i] - trunk.cum[i - 1])) / trunk.length; };
    const f = trunk.at(tAtY(spec.y));
    const dir = forkDir(f.tan, spec.az, spec.polar);
    const rho = rng.range(...P.murray) * P.lateral[1] * (spec.top ? 1.05 : 1);
    const length = spec.top ? rng.range(6, 7.5) : rng.range(7, 8.8);
    // A primary limb runs about 60 % of its reach, then forks in two that carry on to the crown edge: the veteran oak's wide, forked arms.
    const primary = grow({ start: f.p, dir, length: length * 0.6, r0: f.r * rho, taper: 0.28, level: 1, step: 1.0, wobble: 0.3, tropism: spec.top ? 0.08 : 0.06, droop: 0.06, parent: trunk, forkT: tAtY(spec.y), rMin: 0.08 });
    limbs.push(primary);
    const end = primary.at(1);
    for (const sgn of [-1, 1]) {
      const fd = forkDir(end.tan, (sgn < 0 ? 0 : Math.PI) + rng.range(-0.5, 0.5) + k0(spec), rng.range(24, 40));
      if (fd.y < 0.05) fd.y = 0.05; fd.normalize();
      limbs.push(grow({ tip: true, start: end.p, dir: fd, length: length * rng.range(0.5, 0.65), r0: end.r * rng.range(...P.murray) * 1.05, taper: 0.8, level: 1, step: 1.0, wobble: 0.32, tropism: 0.06, droop: 0.08, parent: primary, forkT: 1, rMin: 0.06 }));
    }
  }
  // Boughs along each limb, twigs along each bough.
  for (const limb of limbs) {
    const nB = rng.int(...P.boughsPerLimb);
    for (let k = 0; k < nB; k++) {
      const t = lerp(0.2, 0.92, (k + rng.range(0.1, 0.9)) / nB);
      const f = limb.at(t), az = (k % 2 ? 1 : -1) * rng.range(0.5, 2.6) + k * 1.4;
      let dir = forkDir(f.tan, az, rng.range(...P.angle));
      if (dir.y < -0.05) dir = forkDir(f.tan, az + Math.PI, rng.range(...P.angle));
      const length = rng.range(3.0, 4.8) * (1.15 - 0.35 * t);
      const bough = grow({ start: f.p, dir, length, r0: f.r * rng.range(...P.murray) * P.lateral[2], taper: 0.6, level: 2, step: 0.85, wobble: 0.36, tropism: 0.06, droop: 0.3, parent: limb, forkT: t, rMin: 0.04 });
      const nT = rng.int(...P.twigsPerBough);
      for (let m = 0; m < nT; m++) {
        const tt = lerp(0.12, 0.97, (m + rng.range(0.15, 0.85)) / nT), g = bough.at(tt);
        const az2 = m * 2.399 + rng.range(-0.5, 0.5);
        let d2 = forkDir(g.tan, az2, rng.range(...P.angle));
        if (d2.y < -0.3) d2.y = -0.3 + (d2.y + 0.3) * 0.3;
        d2.normalize();
        const tl = rng.range(1.2, 2.3) * (1.1 - 0.45 * tt);
        const twig = grow({ start: g.p, dir: d2, length: tl, r0: Math.max(0.022, g.r * rng.range(...P.murray) * P.lateral[3]), taper: 0.78, level: 3, step: 0.75, wobble: 0.38, tropism: 0.06, droop: 0.4, parent: bough, forkT: tt, rMin: 0.013 });
        // Tertiary sprigs: each twig forks into two or three short ones, so the crown thickens toward its rim.
        const nS = rng.int(2, 3);
        for (let q = 0; q < nS; q++) {
          const st = lerp(0.35, 0.85, (q + rng.range(0.1, 0.9)) / nS), sg = twig.at(st);
          let d3 = forkDir(sg.tan, q * 2.1 + rng.range(-0.5, 0.5), rng.range(...P.angle));
          if (d3.y < -0.3) d3.y = -0.3 + (d3.y + 0.3) * 0.3; d3.normalize();
          grow({ start: sg.p, dir: d3, length: rng.range(0.7, 1.3), r0: Math.max(0.014, sg.r * 0.7), taper: 0.7, level: 3, step: 0.6, wobble: 0.4, tropism: 0.05, droop: 0.4, parent: twig, forkT: st, rMin: 0.011 });
        }
      }
    }
  }
  // parent phase chain
  for (const b of branches) b.parentPhase = b.parent ? b.parent.phase : 0;
  return { branches, trunk, limbs, center, envelope, seed, Rh, Rv };
}
