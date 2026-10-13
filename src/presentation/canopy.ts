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

/** Outward from the crown's heart (on its spheroid), a little upward. */
function clumpOutward(crown: CanopyCrown, c: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  out.set((c.x - crown.centre.x) / crown.radii.x ** 2, (c.y - crown.centre.y) / crown.radii.y ** 2, (c.z - crown.centre.z) / crown.radii.z ** 2);
  if (out.lengthSq() < 1e-8) out.set(0, 1, 0);
  return out.normalize().addScaledVector(new THREE.Vector3(0, 1, 0), 0.25).normalize();
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
 * Clump centres stay within `ANCHOR_REACH` clump radii of the wood (playtest 7): a clump placed from the source sheets
 * alone could hang metres clear of every branch and read, from below at dusk, as a leaf mass floating in the sky.
 */
export const ANCHOR_REACH = 0.55;
/** A clump farther than this many clump radii from the wood is dropped instead of given a twig (its cards go elsewhere). */
const ANCHOR_DROP = 7;
/** Clump centres closer than this many clump radii overlap: one held by the wood holds the other. */
const ANCHOR_LINK = 1.8;
/** A clump is held through a neighbour only within this many clump radii of the wood. */
const ANCHOR_HOLD = 3;
/** Twigs stay above the player's 2.6 m slab (source space is metres): see treeWoodCollisionRadius. */
const TWIG_FLOOR = 3.2;

/** Nearest point on the wood's triangles: returns the distance and writes the point to `hit` (Infinity without wood). */
/** With `max`, the search stops there: a point farther from the wood returns Infinity. */
export function woodAnchor(wood: THREE.BufferGeometry | null): (p: THREE.Vector3, hit: THREE.Vector3, max?: number) => number {
  const position = wood?.getAttribute('position');
  if (!wood || !position || position.count === 0) return () => Infinity;
  const index = wood.index, count = Math.floor((index?.count ?? position.count) / 3);
  // Flat triangle corners and boxes; a bounding-volume tree over them (leaves of up to 8 triangles, split at the median
  // centre of the longest axis). Nearest queries visit the closer half first and prune by distance.
  const corners = new Float32Array(count * 9), boxes = new Float32Array(count * 6), centres = new Float32Array(count * 3);
  for (let t = 0; t < count; t++) {
    for (let k = 0; k < 3; k++) {
      const v = index ? index.getX(t * 3 + k) : t * 3 + k;
      corners[t * 9 + k * 3] = position.getX(v); corners[t * 9 + k * 3 + 1] = position.getY(v); corners[t * 9 + k * 3 + 2] = position.getZ(v);
    }
    for (let c = 0; c < 3; c++) {
      const a = corners[t * 9 + c]!, b = corners[t * 9 + 3 + c]!, d = corners[t * 9 + 6 + c]!;
      boxes[t * 6 + c] = Math.min(a, b, d); boxes[t * 6 + 3 + c] = Math.max(a, b, d); centres[t * 3 + c] = (a + b + d) / 3;
    }
  }
  const order = new Int32Array(count).map((_, i) => i);
  const nodeBox: number[] = [], nodeStart: number[] = [], nodeEnd: number[] = [], nodeLeft: number[] = [], nodeRight: number[] = [];
  const build = (start: number, end: number): number => {
    const id = nodeStart.length;
    nodeStart.push(start); nodeEnd.push(end); nodeLeft.push(-1); nodeRight.push(-1);
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = start; i < end; i++) { const t = order[i]!; for (let c = 0; c < 3; c++) { lo[c] = Math.min(lo[c]!, boxes[t * 6 + c]!); hi[c] = Math.max(hi[c]!, boxes[t * 6 + 3 + c]!); } }
    nodeBox.push(...lo, ...hi);
    if (end - start <= 8) return id;
    const axis = hi[0]! - lo[0]! >= hi[1]! - lo[1]! && hi[0]! - lo[0]! >= hi[2]! - lo[2]! ? 0 : hi[1]! - lo[1]! >= hi[2]! - lo[2]! ? 1 : 2;
    order.subarray(start, end).sort((a, b) => centres[a * 3 + axis]! - centres[b * 3 + axis]!);
    const middle = (start + end) >> 1;
    const left = build(start, middle), right = build(middle, end);
    nodeLeft[id] = left; nodeRight[id] = right;
    return id;
  };
  build(0, count);
  const boxDistance = (array: ArrayLike<number>, o: number, p: THREE.Vector3) => Math.hypot(
    Math.max(array[o]! - p.x, 0, p.x - array[o + 3]!), Math.max(array[o + 1]! - p.y, 0, p.y - array[o + 4]!), Math.max(array[o + 2]! - p.z, 0, p.z - array[o + 5]!));
  const triangle = new THREE.Triangle(), near = new THREE.Vector3();
  return (p, hit, max = Infinity) => {
    let best = max, found = false;
    const visit = (node: number) => {
      if (boxDistance(nodeBox, node * 6, p) > best) return;
      if (nodeLeft[node]! < 0) {
        for (let i = nodeStart[node]!; i < nodeEnd[node]!; i++) {
          const t = order[i]!;
          if (boxDistance(boxes, t * 6, p) > best) continue;
          triangle.a.fromArray(corners, t * 9); triangle.b.fromArray(corners, t * 9 + 3); triangle.c.fromArray(corners, t * 9 + 6);
          triangle.closestPointToPoint(p, near);
          const d = near.distanceTo(p);
          if (d <= best) { best = d; hit.copy(near); found = true; }
        }
        return;
      }
      const a = nodeLeft[node]!, b = nodeRight[node]!;
      if (boxDistance(nodeBox, a * 6, p) <= boxDistance(nodeBox, b * 6, p)) { visit(a); visit(b); } else { visit(b); visit(a); }
    };
    visit(0);
    return found ? best : Infinity;
  };
}

/** Sides of a grown twig; rings along it (base, bend, tip). Each twig costs sides × (rings − 1) × 2 triangles. */
const TWIG_SIDES = 3;
/** Only a twig longer than this (m) bends at a middle ring; a short one, hidden in leaves, is a single tapered segment. */
const TWIG_BEND_LENGTH = 2.5;
const twigRings = (t: CanopyTwig) => t.from.distanceTo(t.to) > TWIG_BEND_LENGTH ? 3 : 2;
/** Triangles the twigs add to the wood (growTwigs). */
export const twigTriangles = (twigs: readonly CanopyTwig[]) => twigs.reduce((n, t) => n + TWIG_SIDES * (twigRings(t) - 1) * 2, 0);

/** A twig grown from the wood (`from`, on its surface) out to a clump's centre (`to`). */
export interface CanopyTwig { from: THREE.Vector3; to: THREE.Vector3 }

/**
 * The wood with twigs added (playtest 7): a thin three-sided limb from just inside the bough out to each clump,
 * tapering to a point and bowing down a little at its middle, with the wood's own attribute set. Each twig gets its
 * own bark: uv runs along it from the bough's uv, and normal and tangent follow its own surface (copied tangents
 * from the bough left the normal map's frame skewed and the twigs near black). Other attributes (vertex colours,
 * wind weights) copy the nearest bough vertex.
 */
export function growTwigs(wood: THREE.BufferGeometry, twigs: readonly CanopyTwig[]): THREE.BufferGeometry {
  if (!twigs.length) return wood;
  const source = wood;
  const p = source.getAttribute('position'), names = Object.keys(source.attributes);
  const added: Record<string, number[]> = Object.fromEntries(names.map(n => [n, []]));
  const index: number[] = source.index ? Array.from(source.index.array) : Array.from({ length: p.count }, (_, i) => i);
  let next = p.count;
  const nearestVertex = (q: THREE.Vector3) => { let best = 0, bd = Infinity; for (let i = 0; i < p.count; i++) { const d = (p.getX(i) - q.x) ** 2 + (p.getY(i) - q.y) ** 2 + (p.getZ(i) - q.z) ** 2; if (d < bd) { bd = d; best = i; } } return best; };
  const uv = source.getAttribute('uv');
  const axis = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Vector3(), n = new THREE.Vector3();
  const centre = new THREE.Vector3(), tangent = new THREE.Vector3(), down = new THREE.Vector3();
  for (const t of twigs) {
    axis.subVectors(t.to, t.from); const length = axis.length(); if (!(length > 1e-3)) continue; axis.divideScalar(length);
    a.set(Math.abs(axis.y) < 0.9 ? 0 : 1, Math.abs(axis.y) < 0.9 ? 1 : 0, 0).cross(axis).normalize(); b.crossVectors(axis, a);
    // Bow: the middle sags (gravity), perpendicular to the twig.
    down.set(0, -1, 0).addScaledVector(axis, axis.y).normalize().multiplyScalar(length * 0.08);
    const r0 = Math.min(0.05, Math.max(0.022, 0.018 + length * 0.007)), r1 = 0.004;
    const start = t.from.clone().addScaledVector(axis, -Math.min(0.08, r0 * 2)), base = next, copy = nearestVertex(t.from);
    const u0 = uv ? uv.getX(copy) : 0, v0 = uv ? uv.getY(copy) : 0;
    const rings = twigRings(t);
    for (let ring = 0; ring < rings; ring++) {
      const f = ring / (rings - 1), r = r0 + (r1 - r0) * Math.pow(f, 0.8);
      centre.copy(start).lerp(t.to, f).addScaledVector(down, Math.sin(f * Math.PI));
      tangent.copy(axis).addScaledVector(down, Math.cos(f * Math.PI) * Math.PI / Math.max(length, 1e-3)).normalize();
      for (let k = 0; k < TWIG_SIDES; k++) {
        const angle = k / TWIG_SIDES * Math.PI * 2;
        n.copy(a).multiplyScalar(Math.cos(angle)).addScaledVector(b, Math.sin(angle));
        q.copy(centre).addScaledVector(n, r);
        n.addScaledVector(tangent, -n.dot(tangent)).normalize();
        for (const name of names) {
          const attr = source.getAttribute(name), out = added[name]!;
          if (name === 'position') out.push(q.x, q.y, q.z);
          else if (name === 'normal') out.push(n.x, n.y, n.z);
          else if (name === 'tangent') out.push(tangent.x, tangent.y, tangent.z, 1);
          else if (name === 'uv') out.push(u0 + k / TWIG_SIDES * 0.02, v0 - f * Math.min(0.08, length * 0.02));
          else for (let c = 0; c < attr.itemSize; c++) out.push(attr.getComponent(copy, c));
        }
        next++;
      }
    }
    for (let ring = 0; ring < rings - 1; ring++) for (let k = 0; k < TWIG_SIDES; k++) {
      const k1 = (k + 1) % TWIG_SIDES, i0 = base + ring * TWIG_SIDES, i1 = i0 + TWIG_SIDES;
      index.push(i0 + k, i0 + k1, i1 + k1, i0 + k, i1 + k1, i1 + k);
    }
  }
  const geometry = new THREE.BufferGeometry();
  for (const name of names) {
    const attr = source.getAttribute(name) as THREE.BufferAttribute, values = new Float32Array((p.count + (next - p.count)) * attr.itemSize);
    for (let i = 0; i < p.count; i++) for (let c = 0; c < attr.itemSize; c++) values[i * attr.itemSize + c] = attr.getComponent(i, c);
    values.set(added[name]!, p.count * attr.itemSize);
    geometry.setAttribute(name, new THREE.BufferAttribute(values, attr.itemSize));
  }
  geometry.setIndex(index);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  // The twigs follow the wood's own triangles; treeWoodCollisionRadius stops at `twigIndex` (twigs are not obstacles).
  geometry.userData = { ...wood.userData, twigs: twigs.length, twigIndex: source.index ? source.index.count : p.count };
  return geometry;
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
  // Every clump hangs from the wood (playtest 7). One beyond reach keeps its place and grows a twig out to it (see
  // growTwigs), from the nearest bough or an earlier twig, nearest clumps first, so twigs branch from each other rather
  // than fanning out of one point. It is drawn a little fuller, and smaller clumps along the twig hide it in leaves (a
  // bare twig read as a dark spike against the sky). Only a clump far out is dropped.
  const anchor = woodAnchor(wood), hit = new THREE.Vector3(), reach = opts.clump * ANCHOR_REACH;
  let dropped = 0;
  const twigs: CanopyTwig[] = [], grown = new Set<THREE.Vector3>(), placedIn = new Set<THREE.Vector3>();
  const sources = clumpCentres(leaf, crown, tips, clumps, spacing, random);
  const plans = sources.map(source => {
    // Where the clump will sit once drawn in (below).
    const sits = source.clone().addScaledVector(clumpOutward(crown, source, new THREE.Vector3()), -opts.clump * 0.6);
    return { source, sits, d: wood ? anchor(sits, hit) : 0, hit: hit.clone(), keep: [source] as THREE.Vector3[], twig: null as CanopyTwig | null };
  });
  const onTwig = (q: THREE.Vector3, out: THREE.Vector3) => {
    let best = Infinity; const line = new THREE.Line3(), at = new THREE.Vector3();
    for (const t of twigs) { line.set(t.from, t.to).closestPointToPoint(q, true, at); const d = at.distanceTo(q); if (d < best) { best = d; out.copy(at); } }
    return best;
  };
  // A clump overlapping one already held (by wood or a twig) is held through it: its leaves touch that clump's.
  const held: THREE.Vector3[] = [], link = opts.clump * ANCHOR_LINK;
  const touchesHeld = (q: THREE.Vector3) => held.some(h => h.distanceToSquared(q) <= link * link);
  for (const plan of [...plans].sort((a, b) => a.d - b.d)) {
    if (!wood) continue;
    // Only near the wood: a clump far out still gets its own twig, so leaves stay close to the branches.
    if (plan.d <= reach || plan.d <= opts.clump * ANCHOR_HOLD && touchesHeld(plan.sits)) { held.push(plan.sits); continue; }
    held.push(plan.sits);
    if (plan.d > opts.clump * ANCHOR_DROP) { dropped++; plan.keep = []; continue; }
    const from = plan.hit.clone(), viaTwig = new THREE.Vector3(), dt = onTwig(plan.sits, viaTwig);
    if (dt <= reach) continue;
    if (dt < plan.d) from.copy(viaTwig);
    // A twig through the 2.6 m walking slab would widen the trunk's collision footprint; low clumps are pulled in instead.
    if (Math.min(from.y, plan.sits.y) < TWIG_FLOOR) {
      const moved = from.clone().addScaledVector(plan.sits.clone().sub(from).normalize(), reach * 0.9);
      placedIn.add(moved); plan.keep = [moved]; continue;
    }
    // The twig ends inside its clump, short of the centre, so the tip never pokes out of the leaves.
    const reachIn = Math.max(0, from.distanceTo(plan.sits) - opts.clump * 0.45);
    plan.twig = { from, to: from.clone().lerp(plan.sits, reachIn / Math.max(from.distanceTo(plan.sits), 1e-6)) };
    twigs.push(plan.twig);
    grown.add(plan.source);
    const step = opts.clump * 1.0, length = from.distanceTo(plan.sits);
    for (let along = length - step; along > reach + opts.clump * 0.5; along -= step) {
      const at = from.clone().lerp(plan.sits, along / length);
      placedIn.add(at); plan.keep.push(at); held.push(at);
    }
  }
  // Playtest 8: no lone clump out in the sky. Clumps link when their leaves touch; any group not linked (through
  // others) to a clump at the wood is pulled in, nearest first, until it touches the linked mass. At play distance a
  // twig is invisible, so a clump hanging on one alone read as a floating chunk; a pulled clump drops its twig.
  if (wood) {
    const touch = opts.clump * 1.1, tmp = new THREE.Vector3();
    const items = plans.flatMap(plan => plan.keep.map((c, k) => ({ plan, k, at: placedIn.has(c) ? c.clone() : c.clone().addScaledVector(clumpOutward(crown, c, tmp), -opts.clump * 0.6), linked: false })));
    type Item = (typeof items)[number];
    // Each unlinked clump keeps its nearest linked one, updated only against clumps as they join.
    const near = new Map<Item, { to: Item; d: number }>();
    const join = (added: Item[]) => { for (const it of items) if (!it.linked) for (const l of added) { const d = it.at.distanceToSquared(l.at), n = near.get(it); if (!n || d < n.d) near.set(it, { to: l, d }); } };
    const spread = (from: Item) => {
      const queue = [from], added = [from]; from.linked = true; near.delete(from);
      while (queue.length) { const a = queue.pop()!; for (const b of items) if (!b.linked && b.at.distanceToSquared(a.at) <= touch * touch) { b.linked = true; near.delete(b); added.push(b); queue.push(b); } }
      return added;
    };
    const seeds: Item[] = [];
    for (const it of items) if (!it.linked && anchor(it.at, tmp) <= reach) seeds.push(...spread(it));
    join(seeds);
    while (seeds.length && near.size) {
      let best: Item | null = null, bd = Infinity;
      for (const [it, n] of near) if (n.d < bd) { bd = n.d; best = it; }
      const to = near.get(best!)!.to;
      best!.at.sub(to.at).setLength(touch * 0.85).add(to.at);
      placedIn.add(best!.at); best!.plan.keep[best!.k] = best!.at;
      if (best!.plan.twig) { twigs.splice(twigs.indexOf(best!.plan.twig), 1); best!.plan.twig = null; }
      join(spread(best!));
    }
  }
  const centres = plans.flatMap(plan => plan.keep);
  const weights = centres.map(c => 0.6 + 0.4 * THREE.MathUtils.smoothstep(depthIn(crown, c), 0.35, 0.85));
  const weightSum = weights.reduce((s, w) => s + w, 0);
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], index: number[] = [];
  const out = new THREE.Vector3(), dir = new THREE.Vector3(), n = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  const centre = new THREE.Vector3(), corner = new THREE.Vector3(), vn = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const ax = new THREE.Vector3(), ay = new THREE.Vector3();
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
    clumpOutward(crown, c, out);
    const rc = opts.clump * (0.8 + random() * 0.4) * (grown.has(c) ? 1.15 : 1);
    // Clumps bulge outward (their cards sit on their outer face), so each is drawn in by part of its radius: the canopy
    // keeps the source crown's outline rather than growing a clump past it.
    if (!placedIn.has(c)) c = c.clone().addScaledVector(out, -opts.clump * 0.6);
    for (let j = 0; j < k; j++) {
      // A point in the clump, biased to its outer face; the card faces mostly out from the clump, then out and up.
      dir.copy(randomUnit(dir)).addScaledVector(out, 0.7).normalize();
      centre.copy(c).addScaledVector(dir, rc * (0.3 + 0.7 * Math.sqrt(random())));
      n.copy(dir).multiplyScalar(0.75).addScaledVector(out, 0.35).addScaledVector(randomUnit(t1), 0.35).normalize();
      // Card basis with a random roll about its normal.
      t1.copy(Math.abs(n.y) < 0.9 ? up : out.x !== 0 || out.z !== 0 ? t2.set(out.z, 0, -out.x).normalize() : t2.set(1, 0, 0));
      t1.crossVectors(n, t1).normalize(); t2.crossVectors(n, t1).normalize();
      const roll = random() * Math.PI * 2, cr = Math.cos(roll), sr = Math.sin(roll);
      ax.copy(t1).multiplyScalar(cr).addScaledVector(t2, sr);
      ay.copy(t1).multiplyScalar(-sr).addScaledVector(t2, cr);
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
  geometry.userData.canopy = { clumps: centres.length, tips: tips.length, cards: placed, anchored: twigs.length, dropped, twigs };
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
