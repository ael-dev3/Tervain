import * as THREE from 'three';

/**
 * Cluster canopies for broadleaf trees (A134).
 *
 * The supplied broadleaf crowns are built of a few dozen large curved leaf sheets, each carrying one leaf picture, so a
 * crown read as flat cut-out cards with sky between them. A near or middle crown is now rebuilt at load from many small
 * leaf-cluster cards gathered into clumps: a dense outer shell with a sparser heart, every clump crossed by several cards
 * at different angles so it reads round from any side. The source sheets are kept only as a density field (where the
 * artist put leaves) and the wood's outer branch tips are covered first, so the crown follows the tree's own shape.
 *
 * The result is deterministic for a given source and options, and has the attributes of the cards it replaces
 * (position, normal, uv), so wind, shadows, distance fades, reflections and leaf sites keep working unchanged.
 */

export interface CanopyOptions {
  /** Cards to place (two triangles each). */
  readonly cards: number;
  /** Card edge length range (m). */
  readonly size: readonly [number, number];
  /** Clump radius (m). */
  readonly clump: number;
  /** Cards per clump on the crown's outer shell (the heart takes about half as many). */
  readonly perClump: number;
  /** Atlas cells across (the atlas is cells x cells clusters). */
  readonly cells: number;
  readonly seed: number;
}

export const NEAR_CANOPY = { size: [0.6, 1.2], clump: 0.95, perClump: 8, cells: 2 } as const;
export const MID_CANOPY = { size: [1.0, 1.9], clump: 1.4, perClump: 6, cells: 2 } as const;

/** Small stable PRNG (mulberry32). */
export function canopyRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CanopyCrown { centre: THREE.Vector3; radii: THREE.Vector3 }

export function canopyCrown(leaf: THREE.BufferGeometry): CanopyCrown {
  leaf.computeBoundingBox();
  const box = leaf.boundingBox!, size = box.getSize(new THREE.Vector3());
  const h = Math.max(0.3, Math.max(size.x, size.z) / 2);
  return { centre: box.getCenter(new THREE.Vector3()), radii: new THREE.Vector3(h, Math.max(0.3, size.y / 2), h) };
}

const depthIn = (crown: CanopyCrown, p: THREE.Vector3) => Math.hypot((p.x - crown.centre.x) / crown.radii.x, (p.y - crown.centre.y) / crown.radii.y, (p.z - crown.centre.z) / crown.radii.z);

/** Area-weighted points on the source leaf triangles: where the source tree carries leaves. */
function leafSamples(leaf: THREE.BufferGeometry, count: number, random: () => number): THREE.Vector3[] {
  const p = leaf.getAttribute('position');
  const index = leaf.index;
  const tris = index ? index.count / 3 : p.count / 3;
  const at = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);
  const areas = new Float64Array(tris);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let total = 0;
  for (let t = 0; t < tris; t++) {
    a.fromBufferAttribute(p, at(t, 0)); b.fromBufferAttribute(p, at(t, 1)); c.fromBufferAttribute(p, at(t, 2));
    total += b.sub(a).cross(c.sub(a)).length() / 2;
    areas[t] = total;
  }
  const out: THREE.Vector3[] = [];
  if (!(total > 0)) return out;
  for (let i = 0; i < count; i++) {
    const r = random() * total;
    let lo = 0, hi = tris - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (areas[mid]! < r) lo = mid + 1; else hi = mid; }
    let u = random(), v = random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    a.fromBufferAttribute(p, at(lo, 0)); b.fromBufferAttribute(p, at(lo, 1)); c.fromBufferAttribute(p, at(lo, 2));
    out.push(a.clone().addScaledVector(b.sub(a), u).addScaledVector(c.sub(a), v));
  }
  return out;
}

/** The wood's outer branch tips inside the crown: vertices far out from the trunk, high in the crown, spread apart. */
export function branchTips(wood: THREE.BufferGeometry | null, crown: CanopyCrown, spacing: number, limit: number): THREE.Vector3[] {
  if (!wood) return [];
  const p = wood.getAttribute('position'), v = new THREE.Vector3();
  const candidates: { p: THREE.Vector3; score: number }[] = [];
  const base = crown.centre.y - crown.radii.y;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (v.y < base + crown.radii.y * 0.4) continue;
    const d = depthIn(crown, v);
    if (d < 0.55 || d > 1.35) continue;
    candidates.push({ p: v.clone(), score: d });
  }
  candidates.sort((x, y) => y.score - x.score || x.p.x - y.p.x || x.p.y - y.p.y || x.p.z - y.p.z);
  const out: THREE.Vector3[] = [];
  for (const c of candidates) {
    if (out.length >= limit) break;
    if (out.every(o => o.distanceToSquared(c.p) > spacing * spacing)) out.push(c.p);
  }
  return out;
}

/** Clump centres: branch tips first, then even (minimum-distance) samples of the source leaves. */
function clumpCentres(leaf: THREE.BufferGeometry, crown: CanopyCrown, tips: THREE.Vector3[], count: number, spacing: number, random: () => number): THREE.Vector3[] {
  const out = tips.slice(0, count);
  const cell = spacing, grid = new Map<string, THREE.Vector3[]>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const add = (q: THREE.Vector3) => {
    const k = key(Math.floor(q.x / cell), Math.floor(q.y / cell), Math.floor(q.z / cell));
    let list = grid.get(k); if (!list) { list = []; grid.set(k, list); } list.push(q);
  };
  const near = (q: THREE.Vector3, d: number) => {
    const cx = Math.floor(q.x / cell), cy = Math.floor(q.y / cell), cz = Math.floor(q.z / cell);
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++)
      for (const o of grid.get(key(cx + x, cy + y, cz + z)) ?? []) if (o.distanceToSquared(q) < d * d) return true;
    return false;
  };
  out.forEach(add);
  // Relax the spacing until the count is met: dense sources fill at full spacing, sparse ones closer together.
  for (let d = spacing; out.length < count && d > spacing * 0.2; d *= 0.8) {
    const samples = leafSamples(leaf, (count - out.length) * 6, random);
    for (const q of samples) {
      if (out.length >= count) break;
      // The heart stays open (trunk and boughs show through it, as under a real crown): most samples there are skipped.
      if (depthIn(crown, q) < 0.45 && random() < 0.7) continue;
      // The lowest fifth of the source crown is hanging sheet ends; the boughs and trunk show beneath the canopy.
      if (q.y < crown.centre.y - crown.radii.y * 0.6) continue;
      if (near(q, d)) continue;
      out.push(q); add(q);
    }
  }
  return out;
}

/**
 * Build the cluster canopy. `leaf` is the source crown (density field and outline), `wood` the tree's wood (its branch
 * tips are covered first). Positions are in the same space as the inputs.
 */
export function buildCanopy(leaf: THREE.BufferGeometry, wood: THREE.BufferGeometry | null, opts: CanopyOptions): THREE.BufferGeometry {
  const random = canopyRandom(opts.seed);
  const crown = canopyCrown(leaf);
  // Cards per clump vary with depth: a full shell, a thin heart.
  const meanPer = opts.perClump * 0.8;
  const clumps = Math.max(1, Math.round(opts.cards / meanPer));
  const spacing = opts.clump * 1.1;
  const tips = branchTips(wood, crown, spacing * 1.2, Math.round(clumps * 0.25));
  const centres = clumpCentres(leaf, crown, tips, clumps, spacing, random);
  const weights = centres.map(c => 0.3 + 0.7 * THREE.MathUtils.smoothstep(depthIn(crown, c), 0.35, 0.85));
  const weightSum = weights.reduce((s, w) => s + w, 0);
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], index: number[] = [];
  const out = new THREE.Vector3(), dir = new THREE.Vector3(), n = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  const centre = new THREE.Vector3(), corner = new THREE.Vector3(), vn = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const randomUnit = (v: THREE.Vector3) => {
    const z = random() * 2 - 1, a = random() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    return v.set(r * Math.cos(a), z, r * Math.sin(a));
  };
  let placed = 0, carry = 0;
  centres.forEach((source, ci) => {
    let c = source;
    carry += opts.cards * weights[ci]! / weightSum;
    const k = ci === centres.length - 1 ? opts.cards - placed : Math.min(opts.cards - placed, Math.floor(carry));
    carry -= k;
    // Outward from the crown's heart (on its spheroid), a little upward.
    out.set((c.x - crown.centre.x) / crown.radii.x ** 2, (c.y - crown.centre.y) / crown.radii.y ** 2, (c.z - crown.centre.z) / crown.radii.z ** 2);
    if (out.lengthSq() < 1e-8) out.set(0, 1, 0);
    out.normalize().addScaledVector(up, 0.25).normalize();
    const rc = opts.clump * (0.8 + random() * 0.4);
    // Clumps bulge outward (their cards sit on their outer face), so each is drawn in by part of its radius: the canopy
    // keeps the source crown's outline rather than growing a clump past it.
    c = c.clone().addScaledVector(out, -opts.clump * 0.6);
    for (let j = 0; j < k; j++) {
      // A point in the clump, biased to its outer face; the card faces mostly out from the clump, then out and up.
      dir.copy(randomUnit(dir)).addScaledVector(out, 0.7).normalize();
      centre.copy(c).addScaledVector(dir, rc * (0.3 + 0.7 * Math.sqrt(random())));
      n.copy(dir).multiplyScalar(0.75).addScaledVector(out, 0.35).addScaledVector(randomUnit(t1), 0.35).normalize();
      // Card basis with a random roll about its normal.
      t1.copy(Math.abs(n.y) < 0.9 ? up : out.x !== 0 || out.z !== 0 ? t2.set(out.z, 0, -out.x).normalize() : t2.set(1, 0, 0));
      t1.crossVectors(n, t1).normalize(); t2.crossVectors(n, t1).normalize();
      const roll = random() * Math.PI * 2, cr = Math.cos(roll), sr = Math.sin(roll);
      const ax = t1.clone().multiplyScalar(cr).addScaledVector(t2, sr), ay = t1.clone().multiplyScalar(-sr).addScaledVector(t2, cr);
      const s = (opts.size[0] + (opts.size[1] - opts.size[0]) * random()) / 2;
      const cellIndex = Math.floor(random() * opts.cells * opts.cells), cu = cellIndex % opts.cells, cv = Math.floor(cellIndex / opts.cells);
      const flip = random() < 0.5;
      const base = positions.length / 3;
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        corner.copy(centre).addScaledVector(ax, x * s).addScaledVector(ay, y * s);
        positions.push(corner.x, corner.y, corner.z);
        // Rounded shading: the clump's sphere at this corner, then the crown's, then the card's own facing.
        vn.copy(corner).sub(c).normalize().multiplyScalar(0.55).addScaledVector(out, 0.3).addScaledVector(n, 0.15).normalize();
        normals.push(vn.x, vn.y, vn.z);
        const u = ((flip ? -x : x) * 0.5 + 0.5), v = y * 0.5 + 0.5;
        uvs.push((cu + u) / opts.cells, (cv + v) / opts.cells);
      }
      index.push(base, base + 1, base + 2, base, base + 2, base + 3);
      placed++;
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  geometry.userData.canopy = { clumps: centres.length, tips: tips.length, cards: placed };
  return geometry;
}

/**
 * Wood triangles that stand clear of the canopy (A134): the giant oak's upper branch tips end in open, flat shards that
 * read black against the sky. Any wood triangle above the crown's lower third whose centroid is farther than `reach`
 * from every clump-covered point is dropped.
 */
export function trimExposedWood(wood: THREE.BufferGeometry, canopy: THREE.BufferGeometry, reach: number): { geometry: THREE.BufferGeometry; removed: number } {
  const index = wood.index;
  if (!index) return { geometry: wood, removed: 0 };
  const crown = canopyCrown(canopy);
  const cp = canopy.getAttribute('position');
  const cell = reach, grid = new Set<string>();
  for (let i = 0; i < cp.count; i++) grid.add(`${Math.floor(cp.getX(i) / cell)},${Math.floor(cp.getY(i) / cell)},${Math.floor(cp.getZ(i) / cell)}`);
  const covered = (x: number, y: number, z: number) => {
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) if (grid.has(`${cx + a},${cy + b},${cz + c}`)) return true;
    return false;
  };
  const p = wood.getAttribute('position'), keep: number[] = [];
  const floor = crown.centre.y - crown.radii.y * 0.3;
  let removed = 0;
  for (let t = 0; t < index.count; t += 3) {
    const i0 = index.getX(t), i1 = index.getX(t + 1), i2 = index.getX(t + 2);
    const x = (p.getX(i0) + p.getX(i1) + p.getX(i2)) / 3, y = (p.getY(i0) + p.getY(i1) + p.getY(i2)) / 3, z = (p.getZ(i0) + p.getZ(i1) + p.getZ(i2)) / 3;
    if (y > floor && !covered(x, y, z)) { removed++; continue; }
    keep.push(i0, i1, i2);
  }
  if (!removed) return { geometry: wood, removed: 0 };
  const geometry = wood.clone();
  geometry.setIndex(keep);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return { geometry, removed };
}

/* ---- Leaf-cluster atlas ---- */

export interface CanopyAtlasLevel { width: number; height: number; data: Uint8Array }

/** Fraction of texels whose alpha (0..255) clears `cutoff` (0..1). */
export function alphaCoverage(level: CanopyAtlasLevel, cutoff: number, scale = 1): number {
  const limit = cutoff * 255;
  let n = 0;
  for (let i = 3; i < level.data.length; i += 4) if (level.data[i]! * scale > limit) n++;
  return n / (level.width * level.height);
}

/**
 * Halve a level (box filter, colour weighted by alpha so leaf edges do not darken), then scale its alpha so the share of
 * texels past the cut-off matches the full-size level: a distant crown keeps the body it has up close.
 */
export function downsampleCoverage(level: CanopyAtlasLevel, target: number, cutoff: number): CanopyAtlasLevel {
  const w = Math.max(1, level.width >> 1), h = Math.max(1, level.height >> 1), d = new Uint8Array(w * h * 4), s = level.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let k = 0; k < 4; k++) {
      const sx = Math.min(level.width - 1, x * 2 + (k & 1)), sy = Math.min(level.height - 1, y * 2 + (k >> 1)), i = (sy * level.width + sx) * 4;
      const al = s[i + 3]! + 1;
      r += s[i]! * al; g += s[i + 1]! * al; b += s[i + 2]! * al; a += al;
    }
    const o = (y * w + x) * 4;
    d[o] = r / a; d[o + 1] = g / a; d[o + 2] = b / a; d[o + 3] = Math.max(0, a - 4) / 4;
  }
  const out = { width: w, height: h, data: d };
  let lo = 0.5, hi = 4;
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (alphaCoverage(out, cutoff, mid) < target) lo = mid; else hi = mid; }
  const scale = (lo + hi) / 2;
  for (let i = 3; i < d.length; i += 4) d[i] = Math.min(255, Math.round(d[i]! * scale));
  return out;
}

/**
 * A procedural atlas of `cells` x `cells` dense leaf clusters: many small pointed leaves in olive greens, the back leaves
 * darker than the front, thinning toward the cluster's rim so its edge is soft. Pixel rows run from v = 0 upward.
 */
export function canopyAtlas(size: number, cells: number, seed: number): CanopyAtlasLevel {
  const random = canopyRandom(seed);
  const data = new Uint8Array(size * size * 4);
  // Background colour under the leaves (alpha 0) is a dark green, so filtered edges never pick up white or black.
  for (let i = 0; i < size * size; i++) { data[i * 4] = 52; data[i * 4 + 1] = 66; data[i * 4 + 2] = 30; }
  const cell = size / cells;
  for (let cv = 0; cv < cells; cv++) for (let cu = 0; cu < cells; cu++) {
    const cx = (cu + 0.5) * cell, cy = (cv + 0.5) * cell, R = cell * 0.47;
    const leaves = 340;
    for (let l = 0; l < leaves; l++) {
      const depth = l / leaves; // drawn back to front
      const rr = R * Math.sqrt(random()) * (0.55 + 0.45 * (1 - depth * 0.4));
      const ang = random() * Math.PI * 2;
      const lx = cx + Math.cos(ang) * rr, ly = cy + Math.sin(ang) * rr;
      const rim = rr / R;
      // Leaves point roughly outward from the cluster's stem, with scatter.
      const heading = ang + (random() - 0.5) * 1.6;
      const len = cell * (0.075 + random() * 0.05) * (1 - 0.3 * rim), wid = len * (0.36 + random() * 0.14);
      const hx = Math.cos(heading), hy = Math.sin(heading);
      const shade = 0.68 + 0.42 * depth + (random() - 0.5) * 0.2;
      const hue = random();
      const base = [84 + hue * 40, 112 + hue * 30 + random() * 14, 40 + random() * 20];
      const fade = 1 - 0.55 * THREE.MathUtils.smoothstep(rim, 0.62, 1.0);
      const reach = len + 2;
      const x0 = Math.max(0, Math.floor(lx - reach)), x1 = Math.min(size - 1, Math.ceil(lx + reach));
      const y0 = Math.max(0, Math.floor(ly - reach)), y1 = Math.min(size - 1, Math.ceil(ly + reach));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        let cover = 0, along = 0, across = 0;
        for (let sub = 0; sub < 4; sub++) {
          const px = x + 0.25 + 0.5 * (sub & 1) - lx, py = y + 0.25 + 0.5 * (sub >> 1) - ly;
          const u = (px * hx + py * hy) / len, v = (-px * hy + py * hx) / wid; // u in -0.5..0.5 along the leaf
          const t = u + 0.5;
          if (t <= 0 || t >= 1) continue;
          const half = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.75) * 0.5;
          if (Math.abs(v) < half) { cover += 0.25; along += t * 0.25; across += Math.abs(v) / Math.max(half, 1e-3) * 0.25; }
        }
        if (cover <= 0) continue;
        along /= cover; across /= cover;
        // A lighter midrib, a darker leaf edge and base.
        const light = shade * (0.82 + 0.18 * along) * (1.05 - 0.2 * across) * (across < 0.12 ? 1.12 : 1);
        const i = (y * size + x) * 4, a = cover * fade, prev = data[i + 3]! / 255;
        const outA = a + prev * (1 - a);
        for (let k = 0; k < 3; k++) {
          const c = Math.min(255, base[k]! * light);
          data[i + k] = outA > 0 ? (c * a + data[i + k]! * prev * (1 - a)) / outA : data[i + k]!;
        }
        data[i + 3] = Math.round(outA * 255);
      }
    }
  }
  return { width: size, height: size, data };
}

/** The atlas with coverage-preserving mips, as a texture (A134). */
export function canopyAtlasTexture(size: number, cells: number, cutoff: number, seed = 1340): THREE.DataTexture {
  const top = canopyAtlas(size, cells, seed);
  const target = alphaCoverage(top, cutoff);
  const mipmaps: CanopyAtlasLevel[] = [top];
  while (mipmaps[mipmaps.length - 1]!.width > 1) mipmaps.push(downsampleCoverage(mipmaps[mipmaps.length - 1]!, target, cutoff));
  const texture = new THREE.DataTexture(top.data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.mipmaps = mipmaps as unknown as THREE.DataTexture['mipmaps'];
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.name = 'canopy-cluster-atlas';
  texture.needsUpdate = true;
  return texture;
}
