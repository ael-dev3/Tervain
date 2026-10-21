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
  limbs: 6, boughsPerLimb: [4, 6], twigsPerBough: [9, 13],
  // Boughs grow on the outer part of a limb only: its inner reach stays a clean bare arm under the leaves.
  boughSpan: [0.45, 0.95],
  murray: [0.75, 0.8], lateral: { 1: 1.0, 2: 0.82, 3: 0.6 },
  angle: [35, 60],
  // Gothic 3's oaks: limbs spread wide from a short bole and go crooked, turning at elbows rather than running straight.
  limbAngle: [52, 72],      // lateral limbs, degrees from the bole
  elbow: { 1: 0.24, 2: 0.3 },   // chance per step that a limb (1) or bough (2) turns at an elbow
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
    const bounded = level >= 1 && level <= 2, maxTurn = level === 1 ? 0.5 : 0.6, maxDrift = level === 1 ? 0.35 : 0.2, minY = level === 1 ? -0.3 : -0.45;
    const elbow = P.elbow?.[level] ?? 0;
    const n = Math.max(2, Math.round(length / step)), seg = length / n;
    for (let i = 1; i <= n; i++) {
      const t = i / n, last = pts[pts.length - 1];
      d.x += rng.gauss() * wobble * 0.5; d.y += rng.gauss() * wobble * 0.3; d.z += rng.gauss() * wobble * 0.5;
      // An elbow: the limb turns 17-32 degrees about a random axis, then carries on (bounded below, so it never hooks back).
      if (elbow && i > 1 && rng() < elbow) d.applyAxisAngle(new THREE.Vector3(rng.gauss(), rng.gauss(), rng.gauss()).cross(d).normalize(), rng.range(0.3, 0.55));
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
  const rings = [-1.8, -1.2, -0.6, -0.2, 0.2, 0.6, 1.0, 1.5, 2.0, 2.6, 3.2, 3.9, 4.6, 5.2, P.trunkTop, P.trunkTop + 0.3];   // the last ring closes the leader's head under the limb bases
  const leanX = rng.range(-0.35, 0.35), leanZ = rng.range(-0.35, 0.35);
  for (const y of rings) {
    const t = Math.max(0, y) / P.trunkTop;
    trunkPts.push(new THREE.Vector3(leanX * t * t + (fbm3(y * 0.4, 1, 0, seed) - 0.5) * 0.35 * t, y, leanZ * t * t + (fbm3(y * 0.4, 7, 0, seed + 3) - 0.5) * 0.35 * t));
    trunkRadii.push(y > P.trunkTop ? 0.04 : trunkRadiusAt(Math.max(y, 0.0), P));
  }
  const trunk = new Branch({ level: 0, points: trunkPts, radii: trunkRadii, phase: 0, parent: null, forkT: 0, id: 0, isTrunk: true });
  trunk.finish(); branches.push(trunk);

  // Limbs: lateral ones peel off the upper trunk on a golden-angle spiral, then the leaders at the top.
  // A few great limbs, not a starburst: four lateral arms staggered up the bole, then the two leaders at the top.
  const heights = [3.0, 3.9, 4.6, 5.2];
  const az0 = rng() * Math.PI * 2, golden = 2.399963;
  const limbSpecs = [];
  heights.forEach((y, i) => limbSpecs.push({ y, az: az0 + i * golden + rng.range(-0.3, 0.3), polar: rng.range(...(P.limbAngle ?? [P.angle[0] + 4, P.angle[1] - 6])), top: false }));
  limbSpecs.push({ y: P.trunkTop, az: az0 + 4 * golden, polar: rng.range(34, 46), top: true });
  limbSpecs.push({ y: P.trunkTop, az: az0 + 4 * golden + Math.PI + rng.range(-0.4, 0.4), polar: rng.range(38, 50), top: true });
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
    const primary = grow({ start: f.p, dir, length: length * 0.6, r0: Math.min(f.r * rho, 0.9), taper: 0.28, level: 1, step: 1.0, wobble: 0.4, tropism: spec.top ? 0.08 : 0.05, droop: 0.12, parent: trunk, forkT: tAtY(spec.y), rMin: 0.08 });
    limbs.push(primary);
    const end = primary.at(1);
    for (const sgn of [-1, 1]) {
      const fd = forkDir(end.tan, (sgn < 0 ? 0 : Math.PI) + rng.range(-0.5, 0.5) + k0(spec), rng.range(24, 40));
      if (fd.y < 0.05) fd.y = 0.05; fd.normalize();
      limbs.push(grow({ tip: true, start: end.p, dir: fd, length: length * rng.range(0.5, 0.65), r0: end.r * rng.range(...P.murray) * 1.05, taper: 0.66, level: 1, step: 1.0, wobble: 0.42, tropism: 0.05, droop: 0.16, parent: primary, forkT: 1, rMin: 0.06 }));
    }
  }
  // Boughs along each limb, twigs along each bough.
  for (const limb of limbs) {
    const nB = rng.int(...P.boughsPerLimb);
    for (let k = 0; k < nB; k++) {
      const t = lerp(...(P.boughSpan ?? [0.2, 0.92]), (k + rng.range(0.1, 0.9)) / nB);
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

// Silver birch (Betula pendula): one slender stem runs nearly to the top; slim limbs climb from it, arch outward and let
// their boughs and twigs hang (the pendula habit), so the crown is a narrow, open ovoid of hanging curtains with sky
// between them.
export const BIRCH = {
  height: 16,
  trunkRadius: 0.24,        // at 1.5 m, metres
  flareGain: 0.55, flareDecay: 0.6,
  crownBase: [4.6, 5.8],    // the lowest limbs: forest birches shed their lower branches
  limbs: [11, 14], boughsPerLimb: [5, 8], twigsPerBough: [5, 9],
  boughSpan: [0.25, 0.95],
  murray: [0.72, 0.8], lateral: { 1: 0.66, 2: 0.62, 3: 0.6 },
  angle: [30, 55],
  minHeight: 2.4,
};

export function birchRadiusAt(y, P = BIRCH) {
  const t = clamp(y / P.height, 0, 1);
  return P.trunkRadius * Math.max(0.1, 1 - 0.9 * Math.pow(t, 1.1)) * (1 + P.flareGain * Math.exp(-Math.max(y, 0) / P.flareDecay));
}

export function growBirch(seed, P = BIRCH) {
  const rng = makeRng(seed), branches = [];
  const H = P.height * rng.range(0.95, 1.05), yb = rng.range(...P.crownBase);
  const center = new THREE.Vector3(rng.range(-0.3, 0.3), yb + (H - yb) * 0.46, rng.range(-0.3, 0.3));
  const Rh = rng.range(3.3, 4.1), Rv = (H - yb) * 0.56 + 0.5;
  // Crown envelope (>1 outside): an ovoid, widest a little below its middle and drawn to a point at the top.
  const widthAt = (y, m) => Rh * m * (y > center.y ? 1 - 0.62 * Math.pow((y - center.y) / Rv, 2) : 1 - 0.2 * Math.pow((y - center.y) / Rv, 2));
  const envelope = (p) => {
    const m = 0.8 + 0.42 * fbm3(p.x * 0.3, p.y * 0.3, p.z * 0.3, seed, 3);
    const w = Math.max(0.3, widthAt(p.y, m)), dx = (p.x - center.x) / w, dz = (p.z - center.z) / w, dy = (p.y - center.y) / Rv;
    return dx * dx + dz * dz + dy * dy;
  };
  const newPhase = () => rng() * Math.PI * 2;

  // Limbs arch: they rise, then bend out and a little down along their length. Boughs and twigs hang: the droop wins
  // over their launch angle within a few steps. No path turns back up on itself.
  function grow(o) {
    const { start, level, step, wobble, tropism, droop, length, r0, taper } = o;
    const pts = [start.clone()], d = o.dir.clone().normalize(), prev = d.clone();
    const maxTurn = level === 1 ? 0.3 : 0.45, minY = level === 1 ? -0.35 : -0.97;
    const n = Math.max(2, Math.round(length / step)), seg = length / n;
    for (let i = 1; i <= n; i++) {
      const t = i / n, last = pts[pts.length - 1];
      d.x += rng.gauss() * wobble * 0.5; d.y += rng.gauss() * wobble * 0.25; d.z += rng.gauss() * wobble * 0.5;
      d.y += tropism * (1 - t);
      // Boughs and twigs sag from their first step; a limb's load tells only toward its end.
      d.y -= droop * (level >= 2 ? 0.6 + 0.4 * t : t);
      const q = envelope(last);
      if (level === 1 && q > 0.8) { const out = last.clone().sub(center).setY(0).normalize(); d.addScaledVector(out, -0.3 * (q - 0.8) * 2); }
      d.normalize();
      if (d.y < minY) { d.y = minY; d.normalize(); }
      const turn = Math.acos(clamp(d.dot(prev), -1, 1));
      if (turn > maxTurn) d.copy(prev).lerp(d, maxTurn / turn).normalize();
      prev.copy(d);
      const p = last.clone().addScaledVector(d, seg);
      if (p.y < P.minHeight) p.y = lerp(p.y, P.minHeight, 0.8);
      pts.push(p);
      if (i > 2 && envelope(p) > (level === 1 ? 0.92 : 1.0)) break;
    }
    const radii = pts.map((_, i) => Math.max(o.rMin ?? 0.008, r0 * (1 - taper * Math.pow(i / (pts.length - 1), 0.9))));
    radii[radii.length - 1] = level === 3 ? 0.004 : 0.008;
    const b = new Branch({ level, points: pts, radii, phase: newPhase(), parent: o.parent ?? null, forkT: o.forkT ?? 0, id: branches.length });
    b.finish(); branches.push(b); o.parent?.children.push(b); return b;
  }

  // Trunk: the leader runs to the top, leaning a little and wandering at low frequency.
  const trunkPts = [], trunkRadii = [];
  const leanX = rng.range(-0.5, 0.5), leanZ = rng.range(-0.5, 0.5);
  // Close rings at the foot carry its dark, ragged edge (the mesher paints it per vertex).
  const rings = [-1.2, -0.7, -0.3, 0.1, 0.4, 0.7, 1.0, 1.3, 1.6, 2.0, 2.4];
  for (let y = 3.0; y < H - 0.4; y += 0.7) rings.push(y);
  rings.push(H);
  for (const y of rings) {
    const t = Math.max(0, y) / H;
    trunkPts.push(new THREE.Vector3(leanX * t * t + (fbm3(y * 0.3, 1, 0, seed) - 0.5) * 0.5 * t, y, leanZ * t * t + (fbm3(y * 0.3, 7, 0, seed + 3) - 0.5) * 0.5 * t));
    trunkRadii.push(y >= H ? 0.012 : birchRadiusAt(Math.max(y, 0), { ...P, height: H }));
  }
  const trunk = new Branch({ level: 0, points: trunkPts, radii: trunkRadii, phase: 0, parent: null, forkT: 0, id: 0, isTrunk: true });
  trunk.finish(); branches.push(trunk);

  const frame = (tan) => { const ref = Math.abs(tan.y) < 0.95 ? UP : new THREE.Vector3(1, 0, 0); const u = new THREE.Vector3().crossVectors(ref, tan).normalize(), w = new THREE.Vector3().crossVectors(tan, u); return [u, w]; };
  const forkDir = (tan, az, polarDeg) => { const [u, w] = frame(tan), th = polarDeg * Math.PI / 180; return tan.clone().multiplyScalar(Math.cos(th)).addScaledVector(u, Math.cos(az) * Math.sin(th)).addScaledVector(w, Math.sin(az) * Math.sin(th)).normalize(); };
  const tAtY = (y) => { let i = 1; while (i < trunk.points.length - 1 && trunk.points[i].y < y) i++; const p0 = trunk.points[i - 1], p1 = trunk.points[i], f = clamp((y - p0.y) / Math.max(1e-6, p1.y - p0.y), 0, 1); return (trunk.cum[i - 1] + f * (trunk.cum[i] - trunk.cum[i - 1])) / trunk.length; };

  // Limbs on a golden-angle spiral up the stem: low ones spread wide, high ones climb steeply and stay short.
  const limbs = [], nL = rng.int(...P.limbs), az0 = rng() * Math.PI * 2;
  for (let k = 0; k < nL; k++) {
    const h = (k + rng.range(0.15, 0.85)) / nL, y = lerp(yb, H - 1.4, Math.pow(h, 0.85));
    const f = trunk.at(tAtY(y)), polar = lerp(64, 26, h) + rng.range(-6, 6);
    // World directions: the polar angle is taken from vertical, not from the leaning stem.
    const th = polar * Math.PI / 180, az = az0 + k * 2.399963 + rng.range(-0.35, 0.35);
    const dir = new THREE.Vector3(Math.cos(az) * Math.sin(th), Math.cos(th), Math.sin(az) * Math.sin(th));
    const reach = widthAt(y, 1) * rng.range(0.85, 1.15) / Math.max(0.35, Math.sin(th));
    const length = clamp(reach, 1.4, 6.2);
    limbs.push(grow({ start: f.p, dir, length, r0: Math.max(0.035, f.r * rng.range(...P.murray) * P.lateral[1]), taper: 0.68, level: 1, step: 0.55, wobble: 0.16, tropism: 0.1, droop: lerp(0.16, 0.05, h), parent: trunk, forkT: tAtY(y), rMin: 0.016 }));
  }
  // Boughs hang from the outer limb; twigs hang from the boughs.
  for (const limb of limbs) {
    const nB = Math.max(2, Math.round(rng.int(...P.boughsPerLimb) * clamp(limb.length / 4.5, 0.45, 1.1)));
    for (let k = 0; k < nB; k++) {
      const t = lerp(...P.boughSpan, (k + rng.range(0.1, 0.9)) / nB);
      const f = limb.at(t), az = (k % 2 ? 1 : -1) * rng.range(0.9, 2.2) + k * 1.3;
      const dir = forkDir(f.tan, az, rng.range(...P.angle)); dir.y -= 0.55; dir.normalize();
      const length = rng.range(1.3, 2.8) * (1.1 - 0.4 * t);
      const bough = grow({ start: f.p, dir, length, r0: Math.max(0.012, f.r * rng.range(...P.murray) * P.lateral[2]), taper: 0.7, level: 2, step: 0.4, wobble: 0.2, tropism: 0.02, droop: 0.8, parent: limb, forkT: t, rMin: 0.009 });
      const nT = rng.int(...P.twigsPerBough);
      for (let m = 0; m < nT; m++) {
        const tt = lerp(0.15, 0.95, (m + rng.range(0.15, 0.85)) / nT), g = bough.at(tt);
        const d2 = forkDir(g.tan, m * 2.399 + rng.range(-0.5, 0.5), rng.range(...P.angle)); d2.y -= 0.6; d2.normalize();
        grow({ start: g.p, dir: d2, length: rng.range(0.5, 1.2) * (1.05 - 0.35 * tt), r0: Math.max(0.008, g.r * 0.7), taper: 0.6, level: 3, step: 0.3, wobble: 0.22, tropism: 0, droop: 0.95, parent: bough, forkT: tt, rMin: 0.005 });
      }
    }
  }
  for (const b of branches) b.parentPhase = b.parent ? b.parent.phase : 0;
  return { branches, trunk, limbs, center, envelope, seed, Rh, Rv, height: H, crownBase: yb };
}

// A bush (hazel-like, A163): many slim stems leave the ground together, fan out and arch over; their branches and twigs
// carry the leaves on a rounded dome down to near the ground. Not a small tree: no single stem, no trunk. The dome is about
// as wide as it is tall, the supplied shrubs' footprint, which placement, clearings and culling were tuned to.
export const BUSH = {
  height: 1.7,
  stems: [7, 10], stemAngle: [8, 40],   // degrees from vertical, inner stems steeper
  branchesPerStem: [3, 5], twigsPerBranch: [3, 5],
  stemRadius: [0.016, 0.03],
};

export function bushRadiusAt(y, P = BUSH) {
  void y; return P.stemRadius[1] * 2.2;   // the root crown the stems leave from
}

export function growBush(seed, P = BUSH) {
  const rng = makeRng(seed), branches = [];
  const H = P.height * rng.range(0.85, 1.15), Rh = H * rng.range(0.34, 0.4), Rv = H * 0.55;
  const center = new THREE.Vector3(rng.range(-0.08, 0.08), H * 0.5, rng.range(-0.08, 0.08));
  // Envelope (>1 outside): a rounded dome, irregular at its edge, its lower edge a little above the ground.
  const envelope = (p) => {
    const m = 0.82 + 0.36 * fbm3(p.x * 1.6, p.y * 1.6, p.z * 1.6, seed, 3);
    const dx = (p.x - center.x) / (Rh * m), dz = (p.z - center.z) / (Rh * m), dy = (p.y - center.y) / (Rv * (p.y > center.y ? 1.0 : 0.8));
    return dx * dx + dz * dz + dy * dy;
  };
  const newPhase = () => rng() * Math.PI * 2;
  function grow(o) {
    const { start, level, step, wobble, tropism, droop, length, r0, taper } = o;
    const pts = [start.clone()], d = o.dir.clone().normalize(), prev = d.clone();
    const n = Math.max(2, Math.round(length / step)), seg = length / n;
    for (let i = 1; i <= n; i++) {
      const t = i / n, last = pts[pts.length - 1];
      d.x += rng.gauss() * wobble * 0.5; d.y += rng.gauss() * wobble * 0.3; d.z += rng.gauss() * wobble * 0.5;
      d.y += tropism * (1 - t); d.y -= droop * t * t;
      const q = envelope(last);
      if (q > 0.85) { const out = last.clone().sub(center).setY(0).normalize(); d.addScaledVector(out, -0.3 * (q - 0.85)); }
      d.normalize();
      const turn = Math.acos(clamp(d.dot(prev), -1, 1));
      if (turn > 0.45) d.copy(prev).lerp(d, 0.45 / turn).normalize();
      prev.copy(d);
      const p = last.clone().addScaledVector(d, seg);
      if (p.y < 0.02) p.y = 0.02;
      pts.push(p);
      if (i > 1 && envelope(p) > 1.0) break;
    }
    const radii = pts.map((_, i) => Math.max(o.rMin ?? 0.004, r0 * (1 - taper * Math.pow(i / (pts.length - 1), 0.9))));
    radii[radii.length - 1] = 0.003;
    const b = new Branch({ level, points: pts, radii, phase: newPhase(), parent: o.parent ?? null, forkT: o.forkT ?? 0, id: branches.length });
    b.finish(); branches.push(b); o.parent?.children.push(b); return b;
  }
  // The root crown: a short stub under the ground the stems leave from (the mesher expects a level-0 stem).
  const rootR = bushRadiusAt(0, P);
  const trunk = new Branch({ level: 0, points: [new THREE.Vector3(0, -0.25, 0), new THREE.Vector3(0, 0.04, 0)], radii: [rootR, rootR * 0.8], phase: 0, parent: null, forkT: 0, id: 0, isTrunk: true });
  trunk.finish(); branches.push(trunk);
  const frame = (tan) => { const ref = Math.abs(tan.y) < 0.95 ? UP : new THREE.Vector3(1, 0, 0); const u = new THREE.Vector3().crossVectors(ref, tan).normalize(), w = new THREE.Vector3().crossVectors(tan, u); return [u, w]; };
  const forkDir = (tan, az, polarDeg) => { const [u, w] = frame(tan), th = polarDeg * Math.PI / 180; return tan.clone().multiplyScalar(Math.cos(th)).addScaledVector(u, Math.cos(az) * Math.sin(th)).addScaledVector(w, Math.sin(az) * Math.sin(th)).normalize(); };
  const limbs = [], nS = rng.int(...P.stems), az0 = rng() * Math.PI * 2;
  for (let k = 0; k < nS; k++) {
    // Stems fan from the root crown: a few steep inner ones, the rest leaning out; each leans a little off its neighbours.
    const inner = k < 2, th = (inner ? rng.range(P.stemAngle[0], P.stemAngle[0] + 12) : rng.range(P.stemAngle[0] + 14, P.stemAngle[1])) * Math.PI / 180;
    const az = az0 + k * 2.399963 + rng.range(-0.4, 0.4);
    const start = new THREE.Vector3(Math.cos(az) * rootR * 0.6, 0.02, Math.sin(az) * rootR * 0.6);
    const dir = new THREE.Vector3(Math.cos(az) * Math.sin(th), Math.cos(th), Math.sin(az) * Math.sin(th));
    const length = H * rng.range(0.85, 1.15) * (inner ? 1.0 : 0.95);
    limbs.push(grow({ start, dir, length, r0: rng.range(...P.stemRadius), taper: 0.75, level: 1, step: 0.16, wobble: 0.22, tropism: 0.05, droop: inner ? 0.12 : 0.32, parent: trunk, forkT: 1, rMin: 0.006 }));
  }
  for (const stem of limbs) {
    const nB = rng.int(...P.branchesPerStem);
    for (let k = 0; k < nB; k++) {
      const t = lerp(0.35, 0.92, (k + rng.range(0.1, 0.9)) / nB), f = stem.at(t);
      const dir = forkDir(f.tan, k * 2.1 + rng.range(-0.6, 0.6), rng.range(30, 60));
      const branch = grow({ start: f.p, dir, length: H * rng.range(0.25, 0.45) * (1.1 - 0.4 * t), r0: Math.max(0.005, f.r * 0.7), taper: 0.7, level: 2, step: 0.12, wobble: 0.3, tropism: 0.04, droop: 0.3, parent: stem, forkT: t, rMin: 0.004 });
      const nT = rng.int(...P.twigsPerBranch);
      for (let m = 0; m < nT; m++) {
        const tt = lerp(0.25, 0.95, (m + rng.range(0.15, 0.85)) / nT), g = branch.at(tt);
        grow({ start: g.p, dir: forkDir(g.tan, m * 2.4 + rng.range(-0.5, 0.5), rng.range(30, 60)), length: H * rng.range(0.1, 0.2), r0: Math.max(0.004, g.r * 0.7), taper: 0.6, level: 3, step: 0.08, wobble: 0.35, tropism: 0.03, droop: 0.3, parent: branch, forkT: tt, rMin: 0.003 });
      }
    }
  }
  for (const b of branches) b.parentPhase = b.parent ? b.parent.phase : 0;
  return { branches, trunk, limbs, center, envelope, seed, Rh, Rv, height: H };
}

// Orchard trees (A164): a short, often leaning trunk splits low into a few crooked scaffold limbs, each carrying boughs
// and short twigs out to an open, rounded crown. The apple's crown is wide and open in the middle (a vase); the pear keeps
// a leader and grows narrow and upright. Both stay within the footprint of the supplied orchard tree they replace.
export const APPLE = {
  height: 7,
  trunkTop: [1.3, 1.8],     // where the scaffold limbs part
  trunkRadius: 0.24,        // at 1 m, metres
  flareGain: 0.5, flareDecay: 0.45,
  scaffolds: [4, 5], scaffoldAngle: [44, 62], leader: false,
  crown: { rh: [2.95, 3.15], rv: [2.85, 3.05], cy: 4.05 },
  boughsPerLimb: [5, 7], twigsPerBough: [5, 8],
  murray: [0.72, 0.8], lateral: { 1: 0.8, 2: 0.62, 3: 0.6 },
  angle: [35, 62], elbow: { 1: 0.3, 2: 0.25 },
  minHeight: 1.0,
};
export const PEAR = {
  ...APPLE,
  trunkTop: [1.6, 2.1], trunkRadius: 0.2,
  scaffolds: [5, 6], scaffoldAngle: [26, 40], leader: true,
  crown: { rh: [1.62, 1.72], rv: [3.1, 3.3], cy: 3.85 },
  boughsPerLimb: [4, 6], twigsPerBough: [4, 7],
  angle: [30, 50], elbow: { 1: 0.18, 2: 0.2 },
};

// The sentinel (A165): a tall broadleaf of the moist groves, a lime's habit. A slim, straight bole clear to about a third
// of its height carries a leader to near the top; many limbs climb it and spread into a wide, rounded, dense crown that
// shades the ground beneath. The orchard grower at a tree's scale: longer boughs and twigs, coarser steps.
export const SENTINEL = {
  ...APPLE,
  height: 16,
  trunkTop: [4.4, 5.2], trunkRadius: 0.34, flareGain: 0.55, flareDecay: 0.8,
  scaffolds: [11, 14], scaffoldAngle: [36, 58], leader: true,
  crown: { rh: [4.9, 5.15], rv: [5.6, 6.0], cy: 9.8 },
  boughsPerLimb: [5, 7], twigsPerBough: [6, 9],
  lateral: { 1: 0.66, 2: 0.62, 3: 0.6 },
  angle: [35, 60], elbow: { 1: 0.12, 2: 0.18 },
  minHeight: 2.6,
  boughLength: [2.2, 3.6], twigLength: [0.9, 1.6], stepScale: 2.2, ringStep: 0.9,
};

export function fruitRadiusAt(y, P = APPLE) {
  const t = clamp(y / P.height, 0, 1);
  return P.trunkRadius * Math.max(0.2, 1 - 0.6 * t) * (1 + P.flareGain * Math.exp(-Math.max(y, 0) / P.flareDecay));
}

export function growFruit(seed, P = APPLE) {
  const rng = makeRng(seed), branches = [];
  const top = rng.range(...P.trunkTop), Rh = rng.range(...P.crown.rh), Rv = rng.range(...P.crown.rv);
  const center = new THREE.Vector3(rng.range(-0.2, 0.2), P.crown.cy, rng.range(-0.2, 0.2));
  // Crown envelope (>1 outside): a rounded dome, irregular at its edge, flatter underneath where the limbs part.
  const envelope = (p) => {
    const m = 0.82 + 0.36 * fbm3(p.x * 0.45, p.y * 0.45, p.z * 0.45, seed, 3);
    const dx = (p.x - center.x) / (Rh * m), dz = (p.z - center.z) / (Rh * m), dy = (p.y - center.y) / (Rv * (p.y > center.y ? 1 : 0.8));
    return dx * dx + dz * dz + dy * dy;
  };
  const newPhase = () => rng() * Math.PI * 2;

  // Limbs and boughs: bounded turns (with elbows: old fruit trees grow crooked), held inside the envelope.
  function grow(o) {
    const { start, level, step, wobble, tropism, droop, length, r0, taper } = o;
    const pts = [start.clone()], d = o.dir.clone().normalize(), d0 = d.clone(), prev = d.clone();
    const bounded = level >= 1 && level <= 2, maxTurn = level === 1 ? 0.5 : 0.6, maxDrift = level === 1 ? 0.4 : 0.25, minY = level === 1 ? -0.2 : -0.5;
    const elbow = P.elbow?.[level] ?? 0;
    const n = Math.max(2, Math.round(length / step)), seg = length / n;
    for (let i = 1; i <= n; i++) {
      const t = i / n, last = pts[pts.length - 1];
      d.x += rng.gauss() * wobble * 0.5; d.y += rng.gauss() * wobble * 0.3; d.z += rng.gauss() * wobble * 0.5;
      if (elbow && i > 1 && rng() < elbow) d.applyAxisAngle(new THREE.Vector3(rng.gauss(), rng.gauss(), rng.gauss()).cross(d).normalize(), rng.range(0.25, 0.5));
      d.y += tropism; d.y -= droop * t * t;
      const q = envelope(last);
      if (q > 0.85) { const out = last.clone().sub(center).setY(0).normalize(); d.addScaledVector(out, -0.35 * (q - 0.85) * 2.2); d.y -= 0.03 * (q - 0.85); }
      d.normalize();
      if (bounded) {
        if (d.y < minY) { d.y = minY; d.normalize(); }
        if (d.dot(d0) < maxDrift) d.addScaledVector(d0, (maxDrift - d.dot(d0)) * 1.6).normalize();
        const turn = Math.acos(clamp(d.dot(prev), -1, 1));
        if (turn > maxTurn) d.copy(prev).lerp(d, maxTurn / turn).normalize();
        prev.copy(d);
      }
      const p = last.clone().addScaledVector(d, seg);
      if (level >= 1 && p.y < P.minHeight) p.y = lerp(p.y, P.minHeight, 0.8);
      pts.push(p);
      if (level >= 2 && i > 1 && envelope(p) > 0.95) break;
      if (level === 1 && i > 2 && envelope(p) > 0.82) break;
    }
    const radii = pts.map((_, i) => Math.max(o.rMin ?? 0.006, r0 * (1 - taper * Math.pow(i / (pts.length - 1), 0.9))));
    radii[radii.length - 1] = level === 3 ? 0.004 : 0.008;
    const b = new Branch({ level, points: pts, radii, phase: newPhase(), parent: o.parent ?? null, forkT: o.forkT ?? 0, id: branches.length });
    b.finish(); branches.push(b); o.parent?.children.push(b); return b;
  }

  // Trunk: short, leaning a little, wandering at low frequency; a pear's leader carries on toward the top.
  const trunkPts = [], trunkRadii = [];
  const leanX = rng.range(-0.3, 0.3), leanZ = rng.range(-0.3, 0.3), end = P.leader ? center.y + Rv * 0.75 : top + 0.25;
  const rings = [-0.6, -0.3, 0, 0.25, 0.5, 0.8, 1.1];
  for (let y = 1.4; y < end; y += P.ringStep ?? 0.45) rings.push(y);
  rings.push(end);
  for (const y of rings) {
    const t = Math.max(0, y) / end;
    trunkPts.push(new THREE.Vector3(leanX * t + (fbm3(y * 0.6, 1, 0, seed) - 0.5) * 0.3 * t, y, leanZ * t + (fbm3(y * 0.6, 7, 0, seed + 3) - 0.5) * 0.3 * t));
    trunkRadii.push(y >= end ? 0.01 : y > top && !P.leader ? fruitRadiusAt(top, P) * 0.6 : fruitRadiusAt(Math.max(y, 0), P));
  }
  const trunk = new Branch({ level: 0, points: trunkPts, radii: trunkRadii, phase: 0, parent: null, forkT: 0, id: 0, isTrunk: true });
  trunk.finish(); branches.push(trunk);

  const frame = (tan) => { const ref = Math.abs(tan.y) < 0.95 ? UP : new THREE.Vector3(1, 0, 0); const u = new THREE.Vector3().crossVectors(ref, tan).normalize(), w = new THREE.Vector3().crossVectors(tan, u); return [u, w]; };
  const forkDir = (tan, az, polarDeg) => { const [u, w] = frame(tan), th = polarDeg * Math.PI / 180; return tan.clone().multiplyScalar(Math.cos(th)).addScaledVector(u, Math.cos(az) * Math.sin(th)).addScaledVector(w, Math.sin(az) * Math.sin(th)).normalize(); };
  const tAtY = (y) => { let i = 1; while (i < trunk.points.length - 1 && trunk.points[i].y < y) i++; const p0 = trunk.points[i - 1], p1 = trunk.points[i], f = clamp((y - p0.y) / Math.max(1e-6, p1.y - p0.y), 0, 1); return (trunk.cum[i - 1] + f * (trunk.cum[i] - trunk.cum[i - 1])) / trunk.length; };

  // Scaffold limbs part from the trunk's top (an apple's open vase) or climb the leader (a pear).
  const limbs = [], nL = rng.int(...P.scaffolds), az0 = rng() * Math.PI * 2;
  for (let k = 0; k < nL; k++) {
    const y = P.leader ? lerp(top, center.y + Rv * 0.25, (k + rng.range(0.1, 0.9)) / nL) : top + rng.range(-0.25, 0.2);
    const f = trunk.at(tAtY(y)), polar = rng.range(...P.scaffoldAngle) * (P.leader ? lerp(1.15, 0.8, k / Math.max(1, nL - 1)) : 1);
    const th = polar * Math.PI / 180, az = az0 + k * 2.399963 + rng.range(-0.3, 0.3);
    const dir = new THREE.Vector3(Math.cos(az) * Math.sin(th), Math.cos(th), Math.sin(az) * Math.sin(th));
    const length = (Rv + Rh) * rng.range(0.75, 0.95);
    limbs.push(grow({ start: f.p, dir, length, r0: Math.max(0.03, f.r * rng.range(...P.murray) * P.lateral[1]), taper: 0.62, level: 1, step: 0.45 * (P.stepScale ?? 1), wobble: 0.3, tropism: 0.06, droop: 0.1, parent: trunk, forkT: tAtY(y), rMin: 0.02 }));
  }
  // Boughs along the outer limb, and one carrying the limb on past its end (seen from under the open crown, a limb that
  // stopped short read as a sawn stub); short twigs (an orchard tree's spurs) along each bough.
  for (const limb of limbs) {
    const nB = rng.int(...P.boughsPerLimb);
    for (let k = -1; k < nB; k++) {
      const t = k < 0 ? 1 : lerp(0.3, 0.95, (k + rng.range(0.1, 0.9)) / nB), f = limb.at(t);
      const dir = k < 0 ? f.tan.clone() : forkDir(f.tan, (k % 2 ? 1 : -1) * rng.range(0.6, 2.4) + k * 1.3, rng.range(...P.angle));
      if (dir.y < -0.1) { dir.y = -0.1; dir.normalize(); }
      const r0 = k < 0 ? Math.max(0.012, limb.radii[Math.max(0, limb.radii.length - 2)] * 0.9) : Math.max(0.012, f.r * rng.range(...P.murray) * P.lateral[2]);
      const bough = grow({ start: f.p, dir, length: rng.range(...(P.boughLength ?? [1.0, 2.0])) * (1.15 - 0.35 * t), r0, taper: 0.66, level: 2, step: 0.32 * (P.stepScale ?? 1), wobble: 0.32, tropism: 0.05, droop: 0.25, parent: limb, forkT: t, rMin: 0.008 });
      const nT = rng.int(...P.twigsPerBough);
      for (let m = 0; m < nT; m++) {
        const tt = lerp(0.15, 0.97, (m + rng.range(0.15, 0.85)) / nT), g = bough.at(tt);
        const d2 = forkDir(g.tan, m * 2.399 + rng.range(-0.5, 0.5), rng.range(...P.angle));
        if (d2.y < -0.3) { d2.y = -0.3; d2.normalize(); }
        grow({ start: g.p, dir: d2, length: rng.range(...(P.twigLength ?? [0.35, 0.75])) * (1.1 - 0.4 * tt), r0: Math.max(0.006, g.r * 0.7), taper: 0.6, level: 3, step: 0.2 * (P.stepScale ?? 1), wobble: 0.35, tropism: 0.04, droop: 0.3, parent: bough, forkT: tt, rMin: 0.004 });
      }
    }
  }
  for (const b of branches) b.parentPhase = b.parent ? b.parent.phase : 0;
  return { branches, trunk, limbs, center, envelope, seed, Rh, Rv, height: center.y + Rv };
}
