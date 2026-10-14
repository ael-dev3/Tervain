// Four-level recursive oak skeleton: trunk -> limbs -> boughs -> twigs, as polylines with radii.
// Forks use Murray-style radius ratios (0.75-0.8 of the parent at the fork, with an extra lateral factor for side
// shoots), branch angles of 35-60 degrees from the parent's axis, phototropic bending and a noisy crown envelope.
import * as THREE from 'three';
import { makeRng, fbm3, clamp, lerp, smoothstep } from './util.mjs';

const UP = new THREE.Vector3(0, 1, 0);

export const OAK = {
  height: 17.5,
  trunkTop: 6.2,            // the trunk dissolves into limbs at about this height
  trunkRadius: 0.62,        // radius at 1.5 m before the flare, metres
  flareGain: 0.8, flareDecay: 1.2,
  limbs: 7, boughsPerLimb: [3, 4], twigsPerBough: [6, 10],
  murray: [0.75, 0.8], lateral: { 1: 1.0, 2: 0.78, 3: 0.64 },
  angle: [35, 60],
  minHeight: 3.0,           // wood stays above the player slab (colliders are trunk-only)
};

export function trunkRadiusAt(y, P = OAK) {
  const t = clamp(y / P.trunkTop, 0, 1);
  const base = P.trunkRadius - 0.27 * Math.pow(t, 0.9);
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
  const center = new THREE.Vector3(rng.range(-0.9, 0.9), 11.2, rng.range(-0.9, 0.9));
  const Rh = rng.range(8.2, 9.2), Rv = 7.1;
  // Crown envelope: >1 outside. Noise makes the outline irregular with gaps and asymmetric limbs.
  const envelope = (p) => {
    const m = 0.78 + 0.5 * fbm3(p.x * 0.22, p.y * 0.22, p.z * 0.22, seed, 3);
    const dx = (p.x - center.x) / (Rh * m), dz = (p.z - center.z) / (Rh * m), dy = (p.y - center.y) / (Rv * (0.85 + 0.3 * m));
    return dx * dx + dz * dz + dy * dy;
  };
  let phaseSeed = 0;
  const newPhase = () => { phaseSeed++; return rng() * Math.PI * 2; };

  function grow(o) {
    const { start, level, step, wobble, tropism, droop, length, r0, taper } = o;
    const pts = [start.clone()], d = o.dir.clone().normalize();
    const n = Math.max(2, Math.round(length / step)), seg = length / n;
    for (let i = 1; i <= n; i++) {
      const t = i / n, last = pts[pts.length - 1];
      d.x += rng.gauss() * wobble * 0.5; d.y += rng.gauss() * wobble * 0.3; d.z += rng.gauss() * wobble * 0.5;
      d.y += tropism;                                   // phototropism: shoots lean toward the light
      d.y -= droop * t * t;                             // thin ends sag under load
      const q = envelope(last);
      if (q > 0.85) { const out = last.clone().sub(center).setY(0).normalize(); d.addScaledVector(out, -0.35 * (q - 0.85) * 2.2); d.y -= 0.03 * (q - 0.85); }
      d.normalize();
      const p = last.clone().addScaledVector(d, seg);
      if (level >= 1 && p.y < P.minHeight) { p.y = lerp(p.y, P.minHeight, 0.8); }
      pts.push(p);
    }
    const radii = pts.map((_, i) => Math.max(o.rMin ?? 0.012, r0 * (1 - taper * Math.pow(i / n, 0.9))));
    if (level === 3) radii[radii.length - 1] = 0.0025;   // twigs end in a point
    const b = new Branch({ ...o.meta, level, points: pts, radii, phase: newPhase(), parent: o.parent ?? null, forkT: o.forkT ?? 0, id: branches.length });
    b.finish(); branches.push(b); o.parent?.children.push(b); return b;
  }

  // Trunk (not an envelope-bound path: it leans a little and wobbles low-frequency).
  const trunkPts = [], trunkRadii = [];
  const rings = [-0.6, -0.2, 0.2, 0.6, 1.0, 1.5, 2.0, 2.6, 3.2, 3.8, 4.4, 5.0, 5.6, P.trunkTop];
  const leanX = rng.range(-0.35, 0.35), leanZ = rng.range(-0.35, 0.35);
  for (const y of rings) {
    const t = Math.max(0, y) / P.trunkTop;
    trunkPts.push(new THREE.Vector3(leanX * t * t + (fbm3(y * 0.4, 1, 0, seed) - 0.5) * 0.35 * t, y, leanZ * t * t + (fbm3(y * 0.4, 7, 0, seed + 3) - 0.5) * 0.35 * t));
    trunkRadii.push(trunkRadiusAt(Math.max(y, 0.0), P) * (y < 0 ? 1.0 : 1));
  }
  const trunk = new Branch({ level: 0, points: trunkPts, radii: trunkRadii, phase: 0, parent: null, forkT: 0, id: 0, isTrunk: true });
  trunk.finish(); branches.push(trunk);

  // Limbs: lateral ones peel off the upper trunk on a golden-angle spiral, then the leaders at the top.
  const heights = [3.5, 4.2, 4.9, 5.5, 5.9];
  const az0 = rng() * Math.PI * 2, golden = 2.399963;
  const limbSpecs = [];
  heights.forEach((y, i) => limbSpecs.push({ y, az: az0 + i * golden + rng.range(-0.3, 0.3), polar: rng.range(P.angle[0] + 6, P.angle[1] + 8), top: false }));
  limbSpecs.push({ y: P.trunkTop, az: az0 + 5 * golden, polar: rng.range(22, 36), top: true });
  limbSpecs.push({ y: P.trunkTop, az: az0 + 5 * golden + Math.PI + rng.range(-0.4, 0.4), polar: rng.range(28, 44), top: true });
  const frame = (tan) => { const ref = Math.abs(tan.y) < 0.95 ? UP : new THREE.Vector3(1, 0, 0); const u = new THREE.Vector3().crossVectors(ref, tan).normalize(), w = new THREE.Vector3().crossVectors(tan, u); return [u, w]; };
  const forkDir = (tan, az, polarDeg) => { const [u, w] = frame(tan), th = polarDeg * Math.PI / 180; return tan.clone().multiplyScalar(Math.cos(th)).addScaledVector(u, Math.cos(az) * Math.sin(th)).addScaledVector(w, Math.sin(az) * Math.sin(th)).normalize(); };

  const limbs = [];
  for (const spec of limbSpecs.slice(0, P.limbs)) {
    const f = trunk.at(clamp((spec.y + 0.6) / trunk.length, 0, 1));
    const dir = forkDir(f.tan, spec.az, spec.polar);
    const rho = rng.range(...P.murray) * P.lateral[1] * (spec.top ? 1.05 : 1);
    const length = spec.top ? rng.range(7.5, 9.5) : rng.range(6.2, 8.2);
    limbs.push(grow({ start: f.p, dir, length, r0: f.r * rho, taper: 0.5, level: 1, step: 1.0, wobble: 0.34, tropism: spec.top ? 0.05 : 0.085, droop: 0.28, parent: trunk, forkT: spec.y / trunk.length, rMin: 0.05 }));
  }
  // Boughs along each limb, twigs along each bough.
  for (const limb of limbs) {
    const nB = rng.int(...P.boughsPerLimb);
    for (let k = 0; k < nB; k++) {
      const t = lerp(0.26, 0.9, (k + rng.range(0.1, 0.9)) / nB);
      const f = limb.at(t), az = (k % 2 ? 1 : -1) * rng.range(0.5, 2.6) + k * 1.4;
      let dir = forkDir(f.tan, az, rng.range(...P.angle));
      if (dir.y < -0.05) dir = forkDir(f.tan, az + Math.PI, rng.range(...P.angle));
      const length = rng.range(2.8, 4.6) * (1.15 - 0.4 * t);
      const bough = grow({ start: f.p, dir, length, r0: f.r * rng.range(...P.murray) * P.lateral[2], taper: 0.62, level: 2, step: 0.85, wobble: 0.38, tropism: 0.07, droop: 0.34, parent: limb, forkT: t, rMin: 0.025 });
      const nT = rng.int(...P.twigsPerBough);
      for (let m = 0; m < nT; m++) {
        const tt = lerp(0.12, 0.97, (m + rng.range(0.15, 0.85)) / nT), g = bough.at(tt);
        const az2 = m * 2.399 + rng.range(-0.5, 0.5);
        let d2 = forkDir(g.tan, az2, rng.range(...P.angle));
        if (d2.y < -0.3) d2.y = -0.3 + (d2.y + 0.3) * 0.3;
        d2.normalize();
        const tl = rng.range(1.2, 2.3) * (1.1 - 0.45 * tt);
        grow({ start: g.p, dir: d2, length: tl, r0: Math.max(0.02, g.r * rng.range(...P.murray) * P.lateral[3]), taper: 0.78, level: 3, step: 0.75, wobble: 0.38, tropism: 0.06, droop: 0.4, parent: bough, forkT: tt, rMin: 0.011 });
      }
    }
  }
  // parent phase chain
  for (const b of branches) b.parentPhase = b.parent ? b.parent.phase : 0;
  return { branches, trunk, limbs, center, envelope, seed };
}
