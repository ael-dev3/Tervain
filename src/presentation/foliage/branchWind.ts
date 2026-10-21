import * as THREE from 'three';

/**
 * Branch data derived at load for a tree whose model carries none (the shipped Meshy trees): the `_wind` and `_pivot`
 * vertex attributes the hierarchical foliage shader reads (see foliageWind.ts), worked out from the geometry alone.
 *
 *   _wind  (x level 0 trunk .. 1 twig, y the limb's phase, z its parent bough's phase, w leaf flutter)
 *   _pivot where the vertex's limb grows from, in the tree's space
 *
 * Wood: the trunk is the model's vertical axis through its base; a vertex's level grows with its distance from that axis
 * (past the trunk's own radius at its height) and with its height. Wood beyond the trunk falls into limbs, the connected
 * pieces of wood the trunk does not hold; a limb has one phase and one pivot (its lowest vertex), so it moves as one stiff
 * piece. Leaf cards take the data of the wood they hang from, so they ride their limb, and add their own flutter.
 * Everything is a function of the geometry: the same tree always gets the same attributes.
 */
export interface BranchField {
  /** The trunk axis (x, z) and the wood's height and radius. */
  readonly axis: readonly [number, number];
  readonly height: number;
  /** Number of limbs found (pieces of wood beyond the trunk). */
  readonly limbs: number;
  /** Nearest wood vertex to a point (exact) within `max` metres, or -1. */
  nearest(x: number, y: number, z: number, max?: number): number;
  /** Read a wood vertex's branch data. */
  read(vertex: number, wind: THREE.Vector4, pivot: THREE.Vector3): void;
  /** A wood vertex's position. */
  position(vertex: number, out: THREE.Vector3): void;
}

const TAU = Math.PI * 2;
/** Wood this close (m) to other wood beyond the trunk belongs to the same limb. */
const JOIN = 0.25;
/** A vertex with a level at or below this is trunk: it belongs to no limb. */
const TRUNK_LEVEL = 0.02;
/** Hash of a quantized point into [0, 1): stable across runs and platforms. */
function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(Math.round(x * 8) | 0, 73856093) ^ Math.imul(Math.round(y * 8) | 0, 19349663) ^ Math.imul(Math.round(z * 8) | 0, 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** How a kind of tree's trunk tapers and its crown reaches: broadleaf by default, a cone for conifers (branches in whorls). */
export interface BranchShape { readonly taper: number; readonly trunkFloor: number; readonly cone: boolean }
export const BROADLEAF_BRANCH: BranchShape = { taper: 0.8, trunkFloor: 0.4, cone: false };
/** A conifer's trunk thins to a spike, and each whorl's branches reach less than the one below: level is judged against the cone's local reach. */
export const CONIFER_BRANCH: BranchShape = { taper: 0.95, trunkFloor: 0.1, cone: true };

/** Level of a wood vertex: 0 on the trunk, rising with its reach from the axis beyond the trunk's radius and with its height. */
export function branchLevel(radial: number, heightFraction: number, trunkRadius: number, reachMax: number): number {
  const past = Math.max(0, radial - trunkRadius) / Math.max(1e-3, reachMax - trunkRadius);
  return Math.min(1, Math.pow(Math.min(1, past), 0.7) * (0.6 + 0.4 * Math.min(1, Math.max(0, heightFraction))));
}

/**
 * Add `_wind` and `_pivot` to a wood geometry (tree space, base at y = 0). Returns the field leaves read their anchors
 * from, or null when the wood has no usable limbs (the tree then keeps the whole-crown sway).
 */
export function deriveBranchWood(wood: THREE.BufferGeometry, shape: BranchShape = BROADLEAF_BRANCH): BranchField | null {
  const position = wood.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!position || position.count < 12 || wood.getAttribute('_wind')) return null;
  const n = position.count, px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);
  let top = 0, reachMax = 0;
  for (let i = 0; i < n; i++) { px[i] = position.getX(i); py[i] = position.getY(i); pz[i] = position.getZ(i); top = Math.max(top, py[i]!); }
  if (!(top > 1)) return null;
  // The trunk's axis: the centre of the wood's lowest vertices.
  let ax = 0, az = 0, base = 0;
  for (let i = 0; i < n; i++) if (py[i]! < top * 0.06) { ax += px[i]!; az += pz[i]!; base++; }
  if (!base) return null;
  ax /= base; az /= base;
  // The trunk's radius at the base: most of the lowest wood lies within it (roots flare a little past).
  const baseR: number[] = [];
  for (let i = 0; i < n; i++) if (py[i]! < top * 0.12) baseR.push(Math.hypot(px[i]! - ax, pz[i]! - az));
  baseR.sort((a, b) => a - b);
  const rootR = baseR[Math.floor(baseR.length * 0.75)]! * 1.15;
  const radial = new Float32Array(n);
  for (let i = 0; i < n; i++) { radial[i] = Math.hypot(px[i]! - ax, pz[i]! - az); reachMax = Math.max(reachMax, radial[i]!); }
  if (!(reachMax > rootR * 1.5)) return null;
  // The trunk tapers with height: a vertex is trunk wood within the taper at its height.
  const trunkAt = (h: number) => rootR * Math.max(shape.trunkFloor, 1 - shape.taper * h);
  // A broadleaf crown reaches out as far at any height; a conifer's reach shrinks toward its tip (a cone).
  const reachAt = (h: number) => shape.cone ? Math.max(rootR * 2, reachMax * (1 - 0.85 * h)) : reachMax;
  const level = new Float32Array(n);
  for (let i = 0; i < n; i++) { const h = py[i]! / top; level[i] = branchLevel(radial[i]!, h, trunkAt(h) * 1.25, reachAt(h)); }
  // Limbs: the connected pieces of wood above the trunk threshold.
  const parent = new Int32Array(n).map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]!]!; i = parent[i]!; } return i; };
  const index = wood.index, triangles = Math.floor((index?.count ?? n) / 3);
  const corner = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);
  for (let t = 0; t < triangles; t++) {
    const a = corner(t, 0), b = corner(t, 1), c = corner(t, 2);
    if (level[a]! <= TRUNK_LEVEL || level[b]! <= TRUNK_LEVEL || level[c]! <= TRUNK_LEVEL) continue;
    parent[find(b)] = find(a); parent[find(c)] = find(a);
  }
  // The models' branches are often separate tubes that meet or overlap at their joints: wood within JOIN of other wood
  // beyond the trunk is one limb too, so a limb is not shattered into its tubes.
  const join = new Map<number, number[]>();
  const jk = (x: number, y: number, z: number) => ((x + 1024) * 2048 + (y + 1024)) * 2048 + (z + 1024);
  for (let i = 0; i < n; i++) {
    if (level[i]! <= TRUNK_LEVEL) continue;
    const gx = Math.floor(px[i]! / JOIN), gy = Math.floor(py[i]! / JOIN), gz = Math.floor(pz[i]! / JOIN);
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const list = join.get(jk(gx + x, gy + y, gz + z)); if (!list) continue;
      for (const j of list) if ((px[i]! - px[j]!) ** 2 + (py[i]! - py[j]!) ** 2 + (pz[i]! - pz[j]!) ** 2 <= JOIN * JOIN) { const ra = find(i), rb = find(j); if (ra !== rb) parent[rb] = ra; }
    }
    const k = jk(gx, gy, gz), list = join.get(k); if (list) list.push(i); else join.set(k, [i]);
  }
  // Per limb: its lowest vertex (the pivot) and its centroid (the phase).
  const low = new Int32Array(n).fill(-1), sum = new Float64Array(n * 4);
  const limbIds = new Int32Array(n).fill(-1);
  let limbs = 0;
  for (let i = 0; i < n; i++) {
    if (level[i]! <= TRUNK_LEVEL) continue;
    const r = find(i);
    if (low[r]! < 0) { limbs++; low[r] = i; }
    else if (py[i]! < py[low[r]!]! || py[i]! === py[low[r]!]! && i < low[r]!) low[r] = i;
    { const o = r * 4; sum[o] = sum[o]! + px[i]!; sum[o + 1] = sum[o + 1]! + py[i]!; sum[o + 2] = sum[o + 2]! + pz[i]!; sum[o + 3] = sum[o + 3]! + 1; }
    limbIds[i] = r;
  }
  if (limbs < 1) return null;
  const wind = new Float32Array(n * 4), pivot = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = limbIds[i]!;
    if (r < 0) { pivot[i * 3] = ax; pivot[i * 3 + 1] = py[i]!; pivot[i * 3 + 2] = az; wind[i * 4] = level[i]!; continue; }
    const cnt = sum[r * 4 + 3]!, cx = sum[r * 4]! / cnt, cy = sum[r * 4 + 1]! / cnt, cz = sum[r * 4 + 2]! / cnt;
    const phase = hash3(cx, cy, cz) * TAU;
    // The parent bough: limbs on the same side of the trunk (an octant) share one.
    const octant = Math.floor((Math.atan2(cz - az, cx - ax) / TAU + 0.5) * 8) % 8;
    wind[i * 4] = level[i]!; wind[i * 4 + 1] = phase; wind[i * 4 + 2] = hash3(octant, Math.floor(cy / Math.max(1, top / 3)), 17) * TAU; wind[i * 4 + 3] = 0;
    const lo = low[r]!; pivot[i * 3] = px[lo]!; pivot[i * 3 + 1] = py[lo]!; pivot[i * 3 + 2] = pz[lo]!;
  }
  wood.setAttribute('_wind', new THREE.BufferAttribute(wind, 4));
  wood.setAttribute('_pivot', new THREE.BufferAttribute(pivot, 3));
  return woodField(px, py, pz, top, [ax, az], limbs, wind, pivot);
}

/**
 * The field over a wood that carries its own branch data (a generated tree's `_wind` and `_pivot`, tools/tree-gen): its
 * rebuilt crown's cards then ride the limbs the generator grew. Null without that data or without wood off the trunk.
 */
export function branchFieldOf(wood: THREE.BufferGeometry): BranchField | null {
  const position = wood.getAttribute('position') as THREE.BufferAttribute | undefined;
  const windAttr = wood.getAttribute('_wind') as THREE.BufferAttribute | undefined, pivotAttr = wood.getAttribute('_pivot') as THREE.BufferAttribute | undefined;
  if (!position || !windAttr || !pivotAttr || position.count < 12) return null;
  const n = position.count, px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);
  const wind = new Float32Array(n * 4), pivot = new Float32Array(n * 3), phases = new Set<number>();
  let top = 0;
  for (let i = 0; i < n; i++) {
    px[i] = position.getX(i); py[i] = position.getY(i); pz[i] = position.getZ(i); top = Math.max(top, py[i]!);
    wind[i * 4] = windAttr.getX(i); wind[i * 4 + 1] = windAttr.getY(i); wind[i * 4 + 2] = windAttr.getZ(i); wind[i * 4 + 3] = windAttr.getW(i);
    pivot[i * 3] = pivotAttr.getX(i); pivot[i * 3 + 1] = pivotAttr.getY(i); pivot[i * 3 + 2] = pivotAttr.getZ(i);
    if (wind[i * 4]! > TRUNK_LEVEL) phases.add(wind[i * 4 + 1]!);
  }
  if (!(top > 1) || !phases.size) return null;
  let ax = 0, az = 0, base = 0;
  for (let i = 0; i < n; i++) if (py[i]! < top * 0.06) { ax += px[i]!; az += pz[i]!; base++; }
  if (base) { ax /= base; az /= base; }
  return woodField(px, py, pz, top, [ax, az], phases.size, wind, pivot);
}

/** Nearest-vertex search and branch-data reads over a wood's vertices. */
function woodField(px: Float32Array, py: Float32Array, pz: Float32Array, top: number, axis: readonly [number, number], limbs: number, wind: Float32Array, pivot: Float32Array): BranchField {
  const n = px.length;
  // Nearest-vertex search: a dense uniform grid (counting-sorted), searched in growing shells until nothing nearer can exist.
  const cell = Math.max(0.75, top / 30);
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) { x0 = Math.min(x0, px[i]!); x1 = Math.max(x1, px[i]!); y0 = Math.min(y0, py[i]!); y1 = Math.max(y1, py[i]!); z0 = Math.min(z0, pz[i]!); z1 = Math.max(z1, pz[i]!); }
  const nx = Math.floor((x1 - x0) / cell) + 1, ny = Math.floor((y1 - y0) / cell) + 1, nz = Math.floor((z1 - z0) / cell) + 1;
  const start = new Int32Array(nx * ny * nz + 1), slot = new Int32Array(n);
  const cellOf = (i: number) => (Math.floor((px[i]! - x0) / cell) * ny + Math.floor((py[i]! - y0) / cell)) * nz + Math.floor((pz[i]! - z0) / cell);
  for (let i = 0; i < n; i++) { slot[i] = cellOf(i); start[slot[i]! + 1]!++; }
  for (let k = 0; k < nx * ny * nz; k++) start[k + 1] = start[k + 1]! + start[k]!;
  const fill = start.slice(0, nx * ny * nz), order = new Int32Array(n);
  for (let i = 0; i < n; i++) order[fill[slot[i]!]!++] = i;
  const nearest = (x: number, y: number, z: number, max = Infinity): number => {
    const cx = Math.floor((x - x0) / cell), cy = Math.floor((y - y0) / cell), cz = Math.floor((z - z0) / cell);
    const last = Math.min(Math.ceil(max / cell) + 1, Math.max(nx, ny, nz) + Math.max(Math.abs(cx), Math.abs(cy), Math.abs(cz)));
    let best = -1, bd = Infinity;
    const visit = (gx: number, gy: number, gz: number) => {
      if (gx < 0 || gy < 0 || gz < 0 || gx >= nx || gy >= ny || gz >= nz) return;
      const c = (gx * ny + gy) * nz + gz;
      for (let k = start[c]!; k < start[c + 1]!; k++) {
        const i = order[k]!, d = (px[i]! - x) ** 2 + (py[i]! - y) ** 2 + (pz[i]! - z) ** 2;
        if (d < bd || d === bd && i < best) { bd = d; best = i; }
      }
    };
    for (let s = 0; s <= last; s++) {
      if ((s - 1) * cell > Math.min(max, best >= 0 ? Math.sqrt(bd) : Infinity)) break;
      // Intersect the shell with the occupied grid before walking it. Queries
      // outside the wood (leaf cards) otherwise enumerate empty space cubically.
      const ax0 = Math.max(-s, -cx), ax1 = Math.min(s, nx - 1 - cx);
      const ay0 = Math.max(-s, -cy), ay1 = Math.min(s, ny - 1 - cy);
      const az0 = Math.max(-s, -cz), az1 = Math.min(s, nz - 1 - cz);
      for (let a = ax0; a <= ax1; a++) for (let b = ay0; b <= ay1; b++) {
        if (Math.abs(a) === s || Math.abs(b) === s) { for (let c = az0; c <= az1; c++) visit(cx + a, cy + b, cz + c); }
        else if (s > 0) { visit(cx + a, cy + b, cz - s); visit(cx + a, cy + b, cz + s); }
        else visit(cx, cy, cz);
      }
    }
    return best >= 0 && bd <= max * max ? best : -1;
  };
  return {
    axis, height: top, limbs, nearest,
    position(v, out) { out.set(px[v]!, py[v]!, pz[v]!); },
    read(v, w, p) { w.set(wind[v * 4]!, wind[v * 4 + 1]!, wind[v * 4 + 2]!, wind[v * 4 + 3]!); p.set(pivot[v * 3]!, pivot[v * 3 + 1]!, pivot[v * 3 + 2]!); },
  };
}

/** A twig grown from the wood out to a clump (see growTwigs): a leaf near one hangs from the limb the twig grows from. */
export interface AnchorTwig { from: THREE.Vector3; to: THREE.Vector3 }

/** Largest lever (m) a card's flutter is scaled for: the shader turns a card about the pivot, so a far pivot needs a small angle. */
const FLUTTER_DISPLACEMENT = 0.4;

/**
 * Add `_wind` and `_pivot` to a leaf geometry from the wood field. A card (a connected piece of the leaf geometry) takes the
 * level, phases and pivot of the wood vertex it hangs from, so the card moves exactly with that wood; its flutter weight
 * carries its own seed (w = seed + amplitude, see the shader). Returns the share of cards that found wood within `reach`
 * of a limb; the geometry is left untouched (null) when too few did.
 */
export function deriveBranchLeaf(leaf: THREE.BufferGeometry, field: BranchField, twigs: readonly AnchorTwig[] = [], reach = 6): { anchored: number } | null {
  const position = leaf.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!position || leaf.getAttribute('_wind')) return null;
  const n = position.count, parent = new Int32Array(n).map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]!]!; i = parent[i]!; } return i; };
  const index = leaf.index, triangles = Math.floor((index?.count ?? n) / 3);
  for (let t = 0; t < triangles; t++) {
    const a = index ? index.getX(t * 3) : t * 3, b = index ? index.getX(t * 3 + 1) : t * 3 + 1, c = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    parent[find(b)] = find(a); parent[find(c)] = find(a);
  }
  const sum = new Float64Array(n * 4);
  for (let i = 0; i < n; i++) { const r = find(i); { const o = r * 4; sum[o] = sum[o]! + position.getX(i); sum[o + 1] = sum[o + 1]! + position.getY(i); sum[o + 2] = sum[o + 2]! + position.getZ(i); sum[o + 3] = sum[o + 3]! + 1; } }
  const wind = new Float32Array(n * 4), pivot = new Float32Array(n * 3);
  const p = new THREE.Vector3(), c = new THREE.Vector3();
  // The twigs as points every TWIG_STEP along their length, in a grid: the nearest one to a card names its twig.
  const TWIG_STEP = 0.4, TWIG_CELL = 1;
  const samples = new Map<number, number[]>(), tk = (x: number, y: number, z: number) => ((x + 1024) * 2048 + (y + 1024)) * 2048 + (z + 1024);
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  twigs.forEach((t, k) => {
    const steps = Math.max(1, Math.ceil(t.from.distanceTo(t.to) / TWIG_STEP));
    for (let s = 0; s <= steps; s++) {
      const f = s / steps, x = t.from.x + (t.to.x - t.from.x) * f, y = t.from.y + (t.to.y - t.from.y) * f, z = t.from.z + (t.to.z - t.from.z) * f;
      const gx = Math.floor(x / TWIG_CELL), gy = Math.floor(y / TWIG_CELL), gz = Math.floor(z / TWIG_CELL);
      minX = Math.min(minX, gx); minY = Math.min(minY, gy); minZ = Math.min(minZ, gz);
      maxX = Math.max(maxX, gx); maxY = Math.max(maxY, gy); maxZ = Math.max(maxZ, gz);
      const key = tk(gx, gy, gz), list = samples.get(key);
      if (list) list.push(k, x, y, z); else samples.set(key, [k, x, y, z]);
    }
  });
  const nearestTwig = (cx: number, cy: number, cz: number, within: number): number => {
    let best = -1, bd = within * within;
    const gx = Math.floor(cx / TWIG_CELL), gy = Math.floor(cy / TWIG_CELL), gz = Math.floor(cz / TWIG_CELL), span = Math.ceil(within / TWIG_CELL);
    // Preserve the original cell order and strict-distance ties. Outside the packed key's
    // unique coordinate range, keep the old traversal (out-of-range cells can alias).
    const bounded = gx - span >= -1024 && gx + span < 1024 && gy - span >= -1024 && gy + span < 1024 && gz - span >= -1024 && gz + span < 1024;
    const ax = bounded ? Math.max(-span, minX - gx) : -span, bx = bounded ? Math.min(span, maxX - gx) : span;
    const ay = bounded ? Math.max(-span, minY - gy) : -span, by = bounded ? Math.min(span, maxY - gy) : span;
    const az = bounded ? Math.max(-span, minZ - gz) : -span, bz = bounded ? Math.min(span, maxZ - gz) : span;
    for (let a = ax; a <= bx; a++) for (let b = ay; b <= by; b++) for (let d = az; d <= bz; d++) {
      const list = samples.get(tk(gx + a, gy + b, gz + d)); if (!list) continue;
      for (let i = 0; i < list.length; i += 4) { const dd = (list[i + 1]! - cx) ** 2 + (list[i + 2]! - cy) ** 2 + (list[i + 3]! - cz) ** 2; if (dd < bd) { bd = dd; best = list[i]!; } }
    }
    return best;
  };
  // Final attributes also hold each component's shared data at its root vertex.
  // Keep only membership, rather than two retained vectors and an object per card.
  const cardWind = new Set<number>(), cardW = new THREE.Vector4(), cardP = new THREE.Vector3();
  let cards = 0, found = 0;
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!cardWind.has(r)) {
      const cnt = sum[r * 4 + 3]!;
      c.set(sum[r * 4]! / cnt, sum[r * 4 + 1]! / cnt, sum[r * 4 + 2]! / cnt);
      let vertex = field.nearest(c.x, c.y, c.z, reach);
      // A card far from any wood still rides the nearest limb, rather than standing still among moving ones.
      if (vertex < 0) vertex = field.nearest(c.x, c.y, c.z);
      cardW.set(0, 0, 0, 1); cardP.set(0, 0, 0);
      cards++;
      if (vertex >= 0) {
        field.position(vertex, p);
        const bd = p.distanceToSquared(c);
        // A card nearer a grown twig than the wood hangs from the limb that twig grows from.
        const best = twigs.length ? nearestTwig(c.x, c.y, c.z, Math.sqrt(bd)) : -1;
        if (best >= 0) { const from = twigs[best]!.from, vt = field.nearest(from.x, from.y, from.z, 3); if (vt >= 0) vertex = vt; }
        field.read(vertex, cardW, cardP);
        const lever = Math.max(0.5, cardP.distanceTo(c));
        // The seed (1..255) names the card's own flutter; the amplitude (0..1] is scaled to the lever it turns about.
        const seed = 1 + Math.floor(hash3(c.x, c.y, c.z) * 254);
        cardW.w = seed + Math.min(1, FLUTTER_DISPLACEMENT / lever);
        if (cardW.x > TRUNK_LEVEL && Math.sqrt(bd) < reach) found++;
      }
      wind[r * 4] = cardW.x; wind[r * 4 + 1] = cardW.y; wind[r * 4 + 2] = cardW.z; wind[r * 4 + 3] = cardW.w;
      pivot[r * 3] = cardP.x; pivot[r * 3 + 1] = cardP.y; pivot[r * 3 + 2] = cardP.z;
      cardWind.add(r);
    }
    wind[i * 4] = wind[r * 4]!; wind[i * 4 + 1] = wind[r * 4 + 1]!; wind[i * 4 + 2] = wind[r * 4 + 2]!; wind[i * 4 + 3] = wind[r * 4 + 3]!;
    pivot[i * 3] = pivot[r * 3]!; pivot[i * 3 + 1] = pivot[r * 3 + 1]!; pivot[i * 3 + 2] = pivot[r * 3 + 2]!;
  }
  const anchored = cards ? found / cards : 0;
  if (anchored < 0.5) return null;
  leaf.setAttribute('_wind', new THREE.BufferAttribute(wind, 4));
  leaf.setAttribute('_pivot', new THREE.BufferAttribute(pivot, 3));
  return { anchored };
}
