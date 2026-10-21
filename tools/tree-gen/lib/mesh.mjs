// Mesh accumulation and the wood builders: bark-relief tubes, buttress roots and the soil skirt.
import * as THREE from 'three';
import { makeRng, clamp, lerp, smoothstep, fbm3 } from './util.mjs';
import { barkHeight } from './bark.mjs';

export class MeshBuilder {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.col = []; this.wind = []; this.pivot = []; this.idx = []; }
  get vertexCount() { return this.pos.length / 3; }
  get triangleCount() { return this.idx.length / 3; }
  vertex(p, uv, col, wind, pivot, n = [0, 1, 0]) {
    this.pos.push(p.x, p.y, p.z); this.nrm.push(n[0], n[1], n[2]); this.uv.push(uv[0], uv[1]);
    this.col.push(col[0], col[1], col[2], col[3]); this.wind.push(wind[0], wind[1], wind[2], wind[3]); this.pivot.push(pivot.x, pivot.y, pivot.z);
    return this.vertexCount - 1;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  /** Area-weighted smooth normals; seamPairs [[a, b], ...] are averaged so duplicated seam vertices shade alike. */
  computeNormals(seamPairs = []) {
    const n = new Float32Array(this.pos.length), p = this.pos;
    for (let i = 0; i < this.idx.length; i += 3) {
      const a = this.idx[i] * 3, b = this.idx[i + 1] * 3, c = this.idx[i + 2] * 3;
      const e1x = p[b] - p[a], e1y = p[b + 1] - p[a + 1], e1z = p[b + 2] - p[a + 2], e2x = p[c] - p[a], e2y = p[c + 1] - p[a + 1], e2z = p[c + 2] - p[a + 2];
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
    }
    for (const [a, b] of seamPairs) for (let k = 0; k < 3; k++) { const s = n[a * 3 + k] + n[b * 3 + k]; n[a * 3 + k] = s; n[b * 3 + k] = s; }
    for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; this.nrm[i] = n[i] / l; this.nrm[i + 1] = n[i + 1] / l; this.nrm[i + 2] = n[i + 2] / l; }
  }
}

export const groundAO = (y) => lerp(0.3, 1, smoothstep(0, 0.5, y));
const aoByte = (y) => Math.round(groundAO(y) * 255);

/** Branch level weight for hierarchical wind: 0 trunk ... 1 twig tip. */
export const windLevel = (level, t) => clamp((level + 0.75 * t) / 3.75, 0, 1);

/**
 * One bark tube along a branch. Ring vertices are displaced by the bark height field (real relief, not only normals).
 * sides: ring vertex count. uTiles: how often the bark tile repeats around the girth. Returns the first/last ring indices.
 */
export function addTube(mb, branch, o, bark) {
  const { sides, uTiles, uOff, vOff, ringStep, relief, shape, lumps = 0, seed = 1, noRelief = false, vScale = 1, crownShade = null, palette = null } = o;
  const pts = branch.points, rad = branch.radii, n = pts.length;
  // Frames by parallel transport along the polyline.
  const tans = branch.tangents, frames = [];
  let nrm = new THREE.Vector3().crossVectors(Math.abs(tans[0].y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0), tans[0]).normalize();
  for (let i = 0; i < n; i++) {
    if (i > 0) { const axis = new THREE.Vector3().crossVectors(tans[i - 1], tans[i]); const s = axis.length(); if (s > 1e-6) { axis.divideScalar(s); nrm.applyAxisAngle(axis, Math.asin(Math.min(1, s))); } }
    nrm.sub(tans[i].clone().multiplyScalar(nrm.dot(tans[i]))).normalize();
    frames.push([nrm.clone(), new THREE.Vector3().crossVectors(tans[i], nrm).normalize()]);
  }
  // Put the u seam on the underside (thin branches only see a strip of the tile, so a seam there stays hidden).
  const down = new THREE.Vector3(0, -1, 0);
  const a0 = Math.atan2(down.dot(frames[0][1]), down.dot(frames[0][0]));
  const first = mb.vertexCount, cols = sides + 1, seam = [];
  const pivot = branch.points[0];
  for (let i = 0; i < n; i++) {
    const [N, B] = frames[i], c = pts[i];
    const t = i / (n - 1), y = c.y;
    const wind = [windLevel(branch.level, t), branch.phase, branch.parentPhase ?? 0, 0];
    const v = vOff + branch.cum[i] / 2.0 * vScale;
    for (let s = 0; s <= sides; s++) {
      const ang = a0 + (s / sides) * Math.PI * 2, dx = Math.cos(ang), dy = Math.sin(ang);
      const dir = N.clone().multiplyScalar(dx).addScaledVector(B, dy);
      const u = uOff + (s / sides) * uTiles;
      let r = rad[i];
      if (shape) r = shape(r, y, ang, i, dir);
      if (lumps) r *= 1 + lumps * (fbm3(c.x * 1.3 + dir.x * 1.1, c.y * 0.9 + dir.y, c.z * 1.3 + dir.z * 1.1, seed, 2) - 0.5);
      let h = 0;
      if (!noRelief) h = (barkHeight(bark, u, v) - 0.5) * relief(r);
      const p = c.clone().addScaledVector(dir, Math.max(0.0015, r + h));
      const ao = groundAO(p.y) * 255;
      // Warm brown-olive wood with moss on the upper side and the lower trunk, varying limb to limb.
      const lv = ((branch.id * 2654435761) % 1000) / 1000, mossN = fbm3(c.x * 0.9 + dir.x, c.y * 0.9, c.z * 0.9 + dir.z, seed + 11, 2);
      const moss = clamp((0.55 * clamp(dir.y, 0, 1) + (branch.isTrunk ? 0.5 * (1 - smoothstep(0.2, 3.2, y)) : 0.1) + 0.35 * (lv - 0.5)) * (0.4 + 1.2 * mossN), 0, 0.5);
      // A palette (another species) replaces the oak's warm tint, scales its moss and may darken the trunk's foot and the thin wood.
      const warm = palette ? palette.warm : [0.94, 0.84 + 0.03 * lv, 0.76 + 0.08 * lv], mossC = [0.76, 0.9, 0.66], mk = palette ? moss * palette.moss : moss;
      const tone = palette ? (branch.isTrunk ? palette.foot(p.y, mossN) : palette.level[branch.level] ?? 1) : 1;
      const tr = lerp(warm[0], mossC[0], mk) * tone, tg = lerp(warm[1], mossC[1], mk) * tone, tb = lerp(warm[2], mossC[2], mk) * tone;
      const sh = crownShade ? lerp(1, crownShade(p, branch), smoothstep(0, 1, branch.cum[i] / (1.2 + 2.5 * rad[0]))) : 1, cool = [lerp(0.82, 1, sh), 1, lerp(0.9, 1, sh)];
      const vi = mb.vertex(p, [u, v], [Math.round(ao * tr * sh * cool[0]), Math.round(ao * tg * sh * cool[1]), Math.round(ao * tb * sh * cool[2]), 255], wind, pivot, [dir.x, dir.y, dir.z]);
      if (s === 0) seam.push([vi, vi + sides]);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let s = 0; s < sides; s++) {
    const a = first + i * cols + s, b = a + 1, c = a + cols, d = c + 1;
    mb.tri(a, b, c); mb.tri(b, d, c);
  }
  return seam;
}

/** Buttress roots: tapered tubes that leave the flare, follow the ground and sink below it. */
export function addRoots(mb, P, bark, rng, trunkR, seam, azimuths) {
  const roots = [];
  for (const az of azimuths) {
    const big = Math.max(0, trunkR - 1.3), reach = rng.range(2.6, 3.8) + big * 1.1, r0 = rng.range(0.34, 0.46) * (1 + 0.45 * big), rise = rng.range(0.8, 1.2);
    const pts = [], radii = [], N = 6;
    const sway = rng.range(-0.5, 0.5);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const dist = lerp(trunkR * 0.7, reach, Math.pow(t, 0.85));
      const a = az + sway * t * t;
      // Only the first stretch of a root is visible above the soil: it leaves the flare, settles to the base plane within about a fifth of its reach and
      // dives from there in proportion to its reach. The game seats a tree on a slope by its flare, and a root that hugs the base plane for longer
      // hovers over the downhill soil (a giant's lobes floated as pale chunks), while a tip that ends only 0.7 m down pokes out of a falling slope.
      const y = t < 0.18 ? lerp(rise, -0.1, smoothstep(0, 1, t / 0.18)) : lerp(-0.1, -(0.7 + 0.55 * reach), Math.pow((t - 0.18) / 0.82, 1.1));
      pts.push(new THREE.Vector3(Math.cos(a) * dist, y, Math.sin(a) * dist));
      radii.push(Math.max(0.05, r0 * (1 - 0.82 * Math.pow(t, 0.8))));
    }
    const b = { level: 0, id: 500 + roots.length, points: pts, radii, phase: 0, parentPhase: 0 };
    b.cum = [0]; for (let i = 1; i < pts.length; i++) b.cum.push(b.cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    b.tangents = pts.map((p, i) => pts[Math.min(pts.length - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize());
    b.pivot = new THREE.Vector3(0, 0, 0);
    roots.push({ b, az });
    const sm = addTube(mb, b, { sides: P.rootSides, uTiles: 0.55, uOff: rng(), vOff: rng(), relief: (r) => clamp(0.35 * r, 0.01, 0.05), shape: null, noRelief: false }, bark);
    seam.push(...sm);
  }
  return roots;
}

/**
 * Soil skirt: a ring around the trunk foot at ground level. Its vertex colour is the soil tint, and alpha falls to 0 at
 * the rim (the wood material is alpha-masked, so the edge dissolves under alpha-to-coverage instead of a hard cut).
 */
export function addSkirt(mb, bark, rng, trunkFootR, seg = 24) {
  const rings = [
    { r: trunkFootR * 0.7, y: 0.0, a: 255, k: 0.6 },
    { r: trunkFootR + 0.35, y: 0.045, a: 235, k: 0.62 },
    { r: trunkFootR + 0.75, y: -0.01, a: 150, k: 0.66 },
    { r: trunkFootR + 1.15, y: -0.14, a: 0, k: 0.7 },
  ];
  const first = mb.vertexCount, off = rng() * Math.PI * 2, pivot = new THREE.Vector3(0, 0, 0);
  rings.forEach((ring) => {
    for (let s = 0; s <= seg; s++) {
      const ang = off + (s / seg) * Math.PI * 2, wob = 1 + 0.18 * (fbm3(Math.cos(ang) * 1.7, Math.sin(ang) * 1.7, ring.r, 5) - 0.5) * 2;
      const rr = ring.r * (ring.r > trunkFootR + 0.1 ? wob : 1), x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
      const col = [Math.round(255 * ring.k * 0.95), Math.round(255 * ring.k * 0.8), Math.round(255 * ring.k * 0.62), ring.a];
      mb.vertex({ x, y: ring.y + (fbm3(x * 2, 0, z * 2, 3) - 0.5) * 0.05, z }, [0.5 + x * 0.22, 0.5 + z * 0.22], col, [0, 0, 0, 0], pivot, [0, 1, 0]);
    }
  });
  const cols = seg + 1;
  for (let i = 0; i < rings.length - 1; i++) for (let s = 0; s < seg; s++) {
    const a = first + i * cols + s, b = a + 1, c = a + cols, d = c + 1;
    mb.tri(a, b, c); mb.tri(b, d, c);
  }
}
