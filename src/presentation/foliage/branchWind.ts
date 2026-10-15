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
  /** Nearest wood vertex to a point (exact), or -1 without wood. */
  nearest(x: number, y: number, z: number): number;
  /** Read a wood vertex's branch data. */
  read(vertex: number, wind: THREE.Vector4, pivot: THREE.Vector3): void;
  /** A wood vertex's position. */
  position(vertex: number, out: THREE.Vector3): void;
}

const TAU = Math.PI * 2;
/** A vertex with a level at or below this is trunk: it belongs to no limb. */
const TRUNK_LEVEL = 0.02;
/** Hash of a quantized point into [0, 1): stable across runs and platforms. */
function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(Math.round(x * 8) | 0, 73856093) ^ Math.imul(Math.round(y * 8) | 0, 19349663) ^ Math.imul(Math.round(z * 8) | 0, 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Level of a wood vertex: 0 on the trunk, rising with its reach from the axis beyond the trunk's radius and with its height. */
export function branchLevel(radial: number, heightFraction: number, trunkRadius: number, reachMax: number): number {
  const past = Math.max(0, radial - trunkRadius) / Math.max(1e-3, reachMax - trunkRadius);
  return Math.min(1, Math.pow(Math.min(1, past), 0.7) * (0.6 + 0.4 * Math.min(1, Math.max(0, heightFraction))));
}

/**
 * Add `_wind` and `_pivot` to a wood geometry (tree space, base at y = 0). Returns the field leaves read their anchors
 * from, or null when the wood has no usable limbs (the tree then keeps the whole-crown sway).
 */
export function deriveBranchWood(wood: THREE.BufferGeometry): BranchField | null {
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
  const trunkAt = (h: number) => rootR * Math.max(0.4, 1 - 0.8 * h);
  const level = new Float32Array(n);
  for (let i = 0; i < n; i++) { const h = py[i]! / top; level[i] = branchLevel(radial[i]!, h, trunkAt(h) * 1.25, reachMax); }
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
  // Per limb: its lowest vertex (the pivot) and its centroid (the phase).
  const low = new Int32Array(n).fill(-1), sum = new Float64Array(n * 4);
  const limbIds = new Int32Array(n).fill(-1);
  let limbs = 0;
  for (let i = 0; i < n; i++) {
    if (level[i]! <= TRUNK_LEVEL) continue;
    const r = find(i);
    if (low[r]! < 0) { limbs++; low[r] = i; }
    else if (py[i]! < py[low[r]!]! || py[i]! === py[low[r]!]! && i < low[r]!) low[r] = i;
    sum[r * 4] += px[i]!; sum[r * 4 + 1] += py[i]!; sum[r * 4 + 2] += pz[i]!; sum[r * 4 + 3] += 1;
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
  // Nearest-vertex search: a uniform grid, searched in growing shells until no nearer vertex can exist.
  const cell = Math.max(0.5, top / 40), cells = new Map<number, number[]>();
  const key = (x: number, y: number, z: number) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
  for (let i = 0; i < n; i++) {
    const k = key(Math.floor(px[i]! / cell), Math.floor(py[i]! / cell), Math.floor(pz[i]! / cell));
    const list = cells.get(k); if (list) list.push(i); else cells.set(k, [i]);
  }
  const reach = Math.ceil(Math.max(reachMax, top) / cell) + 1;
  const nearest = (x: number, y: number, z: number): number => {
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    let best = -1, bd = Infinity;
    for (let s = 0; s <= reach; s++) {
      if (best >= 0 && (s - 1) * cell > Math.sqrt(bd)) break;
      for (let a = -s; a <= s; a++) for (let b = -s; b <= s; b++) for (let c = -s; c <= s; c++) {
        if (Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) !== s) continue;
        const list = cells.get(key(cx + a, cy + b, cz + c)); if (!list) continue;
        for (const i of list) {
          const d = (px[i]! - x) ** 2 + (py[i]! - y) ** 2 + (pz[i]! - z) ** 2;
          if (d < bd || d === bd && i < best) { bd = d; best = i; }
        }
      }
    }
    return best;
  };
  return {
    axis: [ax, az], height: top, limbs, nearest,
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
  for (let i = 0; i < n; i++) { const r = find(i); sum[r * 4] += position.getX(i); sum[r * 4 + 1] += position.getY(i); sum[r * 4 + 2] += position.getZ(i); sum[r * 4 + 3] += 1; }
  const wind = new Float32Array(n * 4), pivot = new Float32Array(n * 3);
  const p = new THREE.Vector3(), line = new THREE.Line3(), at = new THREE.Vector3(), c = new THREE.Vector3();
  const cardWind = new Map<number, { w: THREE.Vector4; p: THREE.Vector3 }>();
  let cards = 0, found = 0;
  for (let i = 0; i < n; i++) {
    const r = find(i);
    let card = cardWind.get(r);
    if (!card) {
      const cnt = sum[r * 4 + 3]!;
      c.set(sum[r * 4]! / cnt, sum[r * 4 + 1]! / cnt, sum[r * 4 + 2]! / cnt);
      let vertex = field.nearest(c.x, c.y, c.z);
      card = { w: new THREE.Vector4(), p: new THREE.Vector3() };
      cards++;
      if (vertex >= 0) {
        field.position(vertex, p);
        let bd = p.distanceToSquared(c), best = -1;
        // A card nearer a grown twig than the wood hangs from the limb that twig grows from.
        for (let k = 0; k < twigs.length; k++) { line.set(twigs[k]!.from, twigs[k]!.to).closestPointToPoint(c, true, at); const d = at.distanceToSquared(c); if (d < bd) { bd = d; best = k; } }
        if (best >= 0) { const from = twigs[best]!.from, vt = field.nearest(from.x, from.y, from.z); if (vt >= 0) vertex = vt; }
        field.read(vertex, card.w, card.p);
        const lever = Math.max(0.5, card.p.distanceTo(c));
        // The seed (1..255) names the card's own flutter; the amplitude (0..1] is scaled to the lever it turns about.
        const seed = 1 + Math.floor(hash3(c.x, c.y, c.z) * 254);
        card.w.w = seed + Math.min(1, FLUTTER_DISPLACEMENT / lever);
        if (card.w.x > TRUNK_LEVEL && Math.sqrt(bd) < reach) found++;
      }
      cardWind.set(r, card);
    }
    wind[i * 4] = card.w.x; wind[i * 4 + 1] = card.w.y; wind[i * 4 + 2] = card.w.z; wind[i * 4 + 3] = card.w.w;
    pivot[i * 3] = card.p.x; pivot[i * 3 + 1] = card.p.y; pivot[i * 3 + 2] = card.p.z;
  }
  const anchored = cards ? found / cards : 0;
  if (anchored < 0.5) return null;
  leaf.setAttribute('_wind', new THREE.BufferAttribute(wind, 4));
  leaf.setAttribute('_pivot', new THREE.BufferAttribute(pivot, 3));
  return { anchored };
}
