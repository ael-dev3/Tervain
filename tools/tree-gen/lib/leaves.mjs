// Leaf clusters: Poisson-disc placement on twig ends, three fanned cards per cluster, baked crown AO and thickness.
import * as THREE from 'three';
import { makeRng, clamp, lerp, smoothstep } from './util.mjs';
import { LEAF_ATLAS } from './leafAtlas.mjs';

const UP = new THREE.Vector3(0, 1, 0);
/** Atlas cell choice: mostly mature summer rows, some spring, few autumn (placeholder atlas: rows 0-1 summer, 2 spring, 3 autumn). */
function pickCell(rng) {
  const r = rng(), row = r < 0.42 ? 0 : r < 0.8 ? 1 : r < 0.93 ? 2 : 3;
  return row * LEAF_ATLAS.cells + rng.int(0, LEAF_ATLAS.cells - 1);
}

/** Candidate attachment points along the leaf-bearing outer part of the skeleton. */
export function leafCandidates(sk, rng) {
  const out = [];
  for (const b of sk.branches) {
    if (b.level < 1) continue;
    const from = b.level === 3 ? 0.2 : b.level === 2 ? 0.5 : 0.86, spacing = 0.1, count = Math.floor(b.length * (1 - from) / spacing);
    for (let i = 0; i <= count; i++) {
      const t = from + (1 - from) * (i / Math.max(1, count)), f = b.at(t);
      // Interior stays bare: the crown carries leaves on its outer shell and ends of limbs only.
      const horiz = Math.hypot(f.p.x - sk.center.x, f.p.z - sk.center.z), rel = f.p.clone().sub(sk.center);
      const shell = clamp(Math.hypot(horiz / 8.2, rel.y / 7.0), 0, 1.4);
      if (shell < 0.45 && rng() < 0.7) continue;
      out.push({ p: f.p, tan: f.tan, branch: b, t, tip: b.level === 3 && t > 0.9 });
    }
  }
  return out;
}

/** Dart-throwing Poisson-disc over the candidates with a spatial hash. Tips are tried first so every twig end gets a cluster. */
export function poisson(cands, radius, rng, max) {
  const cell = radius, grid = new Map(), key = (x, y, z) => `${x},${y},${z}`, picked = [];
  const order = cands.map((c, i) => [c.tip ? rng() * 0.2 : 0.2 + rng(), i]).sort((a, b) => a[0] - b[0]);
  for (const [, i] of order) {
    const c = cands[i], gx = Math.floor(c.p.x / cell), gy = Math.floor(c.p.y / cell), gz = Math.floor(c.p.z / cell);
    let ok = true;
    for (let x = gx - 1; x <= gx + 1 && ok; x++) for (let y = gy - 1; y <= gy + 1 && ok; y++) for (let z = gz - 1; z <= gz + 1 && ok; z++) {
      const list = grid.get(key(x, y, z)); if (!list) continue;
      for (const q of list) if (q.p.distanceToSquared(c.p) < radius * radius) { ok = false; break; }
    }
    if (!ok) continue;
    const k = key(gx, gy, gz); (grid.get(k) ?? grid.set(k, []).get(k)).push(c); picked.push(c);
    if (picked.length >= max) break;
  }
  return picked;
}

/** Pick the Poisson radius that lands closest to (not above) the wanted cluster count. */
export function placeClusters(cands, want, rng, rMin = 0.22, rMax = 2.2) {
  let lo = rMin, hi = rMax, best = poisson(cands, lo, makeRng(11), want);
  for (let it = 0; it < 9; it++) {
    const mid = (lo + hi) / 2, got = poisson(cands, mid, makeRng(11), 1e9);
    if (got.length > want) lo = mid; else { hi = mid; best = got; }
  }
  return best;
}

/** Cards for one cluster. Returns [{ base, dir, side, normal, len, wid, cell, flip, bend }]. */
export function clusterCards(cl, sk, rng, o) {
  const outward = cl.p.clone().sub(sk.center).setY(0);
  if (outward.lengthSq() < 1e-4) outward.set(rng.range(-1, 1), 0, rng.range(-1, 1)); outward.normalize();
  const axis = cl.tan.clone().multiplyScalar(0.55).addScaledVector(outward, 0.45).addScaledVector(UP, 0.12).normalize();
  const ref = Math.abs(axis.y) < 0.95 ? UP : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(ref, axis).normalize(), w = new THREE.Vector3().crossVectors(axis, u);
  const cards = [], phase = rng() * Math.PI * 2, n = o.cards ?? 3;
  const rowBias = rng.int(0, 2);
  for (let i = 0; i < n; i++) {
    const az = phase + (i / n) * Math.PI * 2 + rng.range(-0.4, 0.4), th = rng.range(40, 70) * Math.PI / 180;
    const d = axis.clone().multiplyScalar(Math.cos(th)).addScaledVector(u, Math.cos(az) * Math.sin(th)).addScaledVector(w, Math.sin(az) * Math.sin(th));
    d.y -= 0.12 + rng() * 0.1; d.normalize();                          // gravity droop
    const len = rng.range(0.7, 1.5) * o.sizeScale, wid = len * rng.range(0.8, 1.1);
    // Card plane contains d; the width direction is mostly horizontal so the card faces up-and-out; random roll.
    let side = new THREE.Vector3().crossVectors(UP, d); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
    side.applyAxisAngle(d, rng.range(-1.5, 1.5));
    const normal = new THREE.Vector3().crossVectors(d, side).normalize();
    if (normal.y < 0) normal.negate();
    cards.push({ base: cl.p.clone().addScaledVector(axis, -0.04), dir: d, side, normal, len, wid, cell: pickCell(rng), flip: rng() < 0.5, tint: rng.range(0.82, 1.0), outward });
    void rowBias;
  }
  return cards;
}

/** Crown AO (0 inside .. 1 outer rim) and thickness (0 thin .. 1 dense) per cluster, from 32 rays against the cluster spheres. */
export function bakeCrown(clusters, radius = 0.85) {
  const dirs = [], N = 32;
  for (let i = 0; i < N; i++) { const y = 1 - (2 * i + 1) / N, r = Math.sqrt(1 - y * y), a = i * 2.399963; dirs.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); }
  const centres = clusters.map((c) => c.p);
  const grid = new Map(), cell = 2.0, key = (x, y, z) => `${x},${y},${z}`;
  centres.forEach((p, i) => { const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell), Math.floor(p.z / cell)); (grid.get(k) ?? grid.set(k, []).get(k)).push(i); });
  const near = (p, reach) => { const out = [], r = Math.ceil(reach / cell), gx = Math.floor(p.x / cell), gy = Math.floor(p.y / cell), gz = Math.floor(p.z / cell);
    for (let x = gx - r; x <= gx + r; x++) for (let y = gy - r; y <= gy + r; y++) for (let z = gz - r; z <= gz + r; z++) { const l = grid.get(key(x, y, z)); if (l) out.push(...l); } return out; };
  const occ = [], dens = [];
  const tmp = new THREE.Vector3();
  clusters.forEach((c, i) => {
    const cand = near(c.p, 9).filter((j) => j !== i); let hit = 0;
    for (const d of dirs) {
      let blocked = false;
      for (const j of cand) {
        tmp.copy(centres[j]).sub(c.p); const t = tmp.dot(d); if (t < 0.5 || t > 9) continue;
        if (tmp.addScaledVector(d, -t).lengthSq() < radius * radius) { blocked = true; break; }
      }
      if (blocked) hit++;
    }
    occ.push(hit / N);
    dens.push(near(c.p, 1.6).filter((j) => j !== i && centres[j].distanceToSquared(c.p) < 2.56).length);
  });
  const rank = (arr) => { const s = [...arr].sort((a, b) => a - b), lo = s[Math.floor(s.length * 0.05)], hi = s[Math.floor(s.length * 0.95)]; return arr.map((v) => clamp((v - lo) / Math.max(1e-6, hi - lo))); };
  const ao = rank(occ).map((v) => 1 - v), thick = rank(dens);
  clusters.forEach((c, i) => { c.crownAO = ao[i]; c.thickness = thick[i]; });
}
