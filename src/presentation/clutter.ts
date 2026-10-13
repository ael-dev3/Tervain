import * as THREE from 'three';
import type { FurnitureId } from '../world/furnitureSizes';
import type { HungKind } from '../world/dressing';

/**
 * The small things of a lived-in room (A76): bowls, jugs, cups, a loaf, candles and pots on the tables, counters,
 * desks, workbenches and chests. Rooms had their furniture but nothing on it, so they read as bare. Each thing is a few
 * dozen triangles built here, drawn as one instanced mesh per kind; each stands on its piece's own surface, found by a
 * ray down onto the piece's model at load, and a spot the ray misses (or that is not level) is left empty.
 */
export type ClutterKind = 'bowl' | 'jug' | 'cup' | 'loaf' | 'candle' | 'pot' | 'jar' | 'bottle' | 'spool' | 'sack' | 'basket';

/** What stands on each kind of piece: where (fractions of its half width and half depth, front towards +z) and what. */
export const CLUTTER_SPOTS: Partial<Record<FurnitureId, readonly (readonly [ClutterKind, number, number])[]>> = {
  // The bread board, jug and candlestick on a table are modelled props since A123 (world/dressing.ts); bowls and cups stay.
  table: [['bowl', -0.5, 0.35], ['cup', 0.62, 0.35], ['cup', -0.1, -0.45]],
  counter: [['jug', -0.62, -0.1], ['cup', -0.32, 0.25], ['cup', 0.15, 0.2], ['pot', 0.65, -0.15], ['bowl', 0.05, -0.25]],
  desk: [['cup', -0.65, 0.1]],
  workbench: [['pot', -0.7, -0.2], ['bowl', 0.6, 0.15]],
  chest: [['candle', 0.6, 0], ['bowl', -0.5, 0.05]],
};

const lathe = (profile: [number, number][], segments = 12) =>
  new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/** The geometry of each kind, standing on y = 0. */
export function clutterGeometry(kind: ClutterKind): THREE.BufferGeometry {
  switch (kind) {
    case 'bowl': return lathe([[0, 0.002], [0.045, 0], [0.075, 0.025], [0.085, 0.05], [0.078, 0.052], [0.068, 0.03], [0.04, 0.012], [0, 0.012]]);
    case 'jug': return lathe([[0, 0], [0.055, 0], [0.068, 0.05], [0.064, 0.12], [0.042, 0.17], [0.04, 0.205], [0.048, 0.215], [0.036, 0.215], [0, 0.19]]);
    case 'cup': return lathe([[0, 0], [0.032, 0], [0.036, 0.08], [0.03, 0.08], [0, 0.01]], 10);
    case 'pot': return lathe([[0, 0], [0.07, 0], [0.095, 0.07], [0.09, 0.14], [0.07, 0.17], [0.075, 0.185], [0, 0.185]]);
    case 'candle': {
      const holder = lathe([[0, 0], [0.045, 0], [0.045, 0.008], [0.016, 0.014], [0.016, 0.03], [0, 0.03]], 10);
      const wax = new THREE.CylinderGeometry(0.012, 0.013, 0.12, 8).translate(0, 0.09, 0);
      const merged = mergeTwo(holder, wax);
      holder.dispose(); wax.dispose();
      return merged;
    }
    // A135: a clay storage jar about 30 cm tall, a squat dark bottle and a spool of wool.
    case 'jar': return lathe([[0, 0], [0.06, 0], [0.095, 0.06], [0.105, 0.14], [0.09, 0.22], [0.055, 0.26], [0.05, 0.285], [0.06, 0.3], [0.045, 0.3], [0, 0.28]]);
    case 'bottle': return lathe([[0, 0], [0.045, 0], [0.05, 0.1], [0.04, 0.15], [0.016, 0.18], [0.016, 0.23], [0.02, 0.235], [0, 0.235]], 10);
    case 'spool': return lathe([[0, 0], [0.05, 0], [0.05, 0.015], [0.042, 0.02], [0.05, 0.05], [0.052, 0.09], [0.042, 0.12], [0.05, 0.125], [0.05, 0.14], [0, 0.14]], 10);
    case 'loaf': return new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 0.65);
    // A136: a grain sack slumped on the floor (about 36 cm) and a wicker basket (about 22 cm).
    case 'sack': return lathe([[0, 0], [0.15, 0], [0.19, 0.06], [0.2, 0.16], [0.17, 0.26], [0.1, 0.31], [0.05, 0.33], [0.06, 0.36], [0, 0.36]], 9).scale(1, 1, 0.8);
    case 'basket': return lathe([[0, 0], [0.12, 0], [0.16, 0.08], [0.19, 0.2], [0.2, 0.22], [0.18, 0.22], [0.17, 0.2], [0.14, 0.09], [0, 0.03]], 12);
  }
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const parts = [a, b].map((g) => (g.index ? g.toNonIndexed() : g.clone()));
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv'] as const) {
    const arrays = parts.map((g) => g.getAttribute(name).array as Float32Array);
    const joined = new Float32Array(arrays.reduce((n, x) => n + x.length, 0));
    let o = 0;
    for (const x of arrays) { joined.set(x, o); o += x.length; }
    out.setAttribute(name, new THREE.BufferAttribute(joined, name === 'uv' ? 2 : 3));
  }
  parts.forEach((g) => g.dispose());
  return out;
}

/** Earthenware, turned wood, pewter, tallow and bread: dull, worn surfaces in the rooms' own browns. */
export function clutterMaterial(kind: ClutterKind): THREE.MeshStandardMaterial {
  const look: Record<ClutterKind, [number, number, number]> = {
    bowl: [0x5c3f27, 0.85, 0], jug: [0x7a5034, 0.8, 0], cup: [0x6b6862, 0.55, 0.45],
    pot: [0x4e4636, 0.75, 0], candle: [0xcfc3a0, 0.7, 0], loaf: [0x8e5e30, 0.95, 0],
    jar: [0x8a573a, 0.88, 0], bottle: [0x2f3a26, 0.35, 0.1], spool: [0x7e3426, 1, 0],
    sack: [0x8c7a58, 1, 0], basket: [0x7a5a32, 0.95, 0],
  };
  const [color, roughness, metalness] = look[kind];
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3();

/**
 * Where each thing stands on a piece, in the piece's own frame: on the surface a ray from above finds at its spot, when
 * that surface is level (within about 8°). Spots the ray misses are dropped.
 */
export function clutterOnPiece(piece: FurnitureId, model: THREE.Mesh, size: readonly [number, number, number]): { kind: ClutterKind; at: THREE.Vector3 }[] {
  const spots = CLUTTER_SPOTS[piece];
  if (!spots) return [];
  const [w, h, d] = size;
  const out: { kind: ClutterKind; at: THREE.Vector3 }[] = [];
  model.updateMatrixWorld(true);
  for (const [kind, fx, fz] of spots) {
    from.set(fx * w / 2, h + 0.5, fz * d / 2);
    ray.set(from, down);
    const hit = ray.intersectObject(model, false)[0];
    if (!hit || !hit.face) continue;
    const normal = hit.face.normal.clone().transformDirection(model.matrixWorld);
    if (normal.y < 0.99 || hit.point.y < h * 0.4) continue;
    out.push({ kind, at: hit.point.clone() });
  }
  return out;
}

/**
 * Things hung from a peg rail on a wall (A136): ladles, pans, sickles, coils of rope, axes, saws, baskets and strings of
 * onions. Each hangs from its peg at y = 0, down the wall (local x along the wall, +z out from it), a few dozen
 * triangles with its wood and iron told apart by vertex colour.
 */
export type { HungKind };

const WOOD = 0x6a4a2c, IRONC = 0x34312d, ROPE = 0x8f7a54, WICKER = 0x7a5a32, ONION = 0x9a6436;

export function hungGeometry(kind: HungKind): THREE.BufferGeometry {
  const parts: [THREE.BufferGeometry, number][] = [];
  const cyl = (r: number, h: number, x: number, y: number, z: number, c: number, rz = 0, seg = 6) => parts.push([new THREE.CylinderGeometry(r, r, h, seg).rotateZ(rz).translate(x, y, z), c]);
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: number) => parts.push([new THREE.BoxGeometry(w, h, d).translate(x, y, z), c]);
  const torus = (r: number, tube: number, x: number, y: number, z: number, c: number, arc = Math.PI * 2, rz = 0) => parts.push([new THREE.TorusGeometry(r, tube, 4, 14, arc).rotateZ(rz).translate(x, y, z), c]);
  switch (kind) {
    case 'ladle':
      torus(0.014, 0.004, 0, -0.012, 0.02, IRONC);
      cyl(0.009, 0.32, 0, -0.18, 0.02, WOOD);
      parts.push([new THREE.SphereGeometry(0.05, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, -0.33, 0.045), WOOD]);
      break;
    case 'pan':
      torus(0.014, 0.004, 0, -0.012, 0.02, IRONC);
      box(0.028, 0.24, 0.012, 0, -0.14, 0.02, IRONC);
      // The pan's bowl stands against the wall, its base towards it.
      parts.push([new THREE.CylinderGeometry(0.13, 0.11, 0.04, 14).rotateX(Math.PI / 2).translate(0, -0.39, 0.035), IRONC]);
      break;
    case 'sickle':
      cyl(0.015, 0.13, 0, -0.07, 0.025, WOOD);
      torus(0.11, 0.008, 0.1, -0.15, 0.025, IRONC, Math.PI * 1.25, -Math.PI * 0.2);
      break;
    case 'rope':
      for (const [k, dy] of [0, 0.02, 0.04].entries()) torus(0.13 - k * 0.01, 0.018, 0.005 * k, -0.15 - dy, 0.035 + k * 0.012, ROPE);
      break;
    case 'axe':
      cyl(0.017, 0.62, 0, -0.33, 0.03, WOOD);
      box(0.15, 0.09, 0.025, 0.055, -0.04, 0.03, IRONC);
      box(0.03, 0.15, 0.02, 0.13, -0.04, 0.03, IRONC);
      break;
    case 'saw':
      // A frame saw: two arms, a stretcher between them and the blade across their feet, a cord twisted over the top.
      for (const sx of [-1, 1]) box(0.028, 0.34, 0.02, sx * 0.27, -0.17, 0.03, WOOD);
      box(0.54, 0.025, 0.02, 0, -0.12, 0.03, WOOD);
      box(0.58, 0.05, 0.004, 0, -0.31, 0.03, IRONC);
      cyl(0.005, 0.56, 0, -0.025, 0.03, ROPE, Math.PI / 2);
      break;
    case 'basket':
      torus(0.12, 0.008, 0, -0.12, 0.13, WICKER, Math.PI, 0);
      parts.push([new THREE.LatheGeometry([[0, 0], [0.1, 0], [0.13, 0.06], [0.15, 0.15], [0.14, 0.15], [0.12, 0.07], [0, 0.02]].map(([r, y]) => new THREE.Vector2(r, y)), 10).translate(0, -0.27, 0.13), WICKER]);
      break;
    case 'onions':
      cyl(0.006, 0.48, 0, -0.24, 0.04, ROPE);
      for (let i = 0; i < 9; i++) parts.push([new THREE.SphereGeometry(0.035, 6, 4).scale(1, 0.9, 1).translate(((i % 3) - 1) * 0.03, -0.08 - i * 0.045, 0.045 + (i % 2) * 0.012), ONION]);
      break;
  }
  return mergeColoured(parts);
}

/** Wood, iron, rope and wicker: dull, worn, the colours in the vertices. */
export function hungMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.15 });
}

function mergeColoured(parts: [THREE.BufferGeometry, number][]): THREE.BufferGeometry {
  const flat = parts.map(([g, c]) => [g.index ? g.toNonIndexed() : g, new THREE.Color(c)] as const);
  const out = new THREE.BufferGeometry(), count = flat.reduce((n, [g]) => n + g.getAttribute('position').count, 0);
  const pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3), uv = new Float32Array(count * 2), col = new Float32Array(count * 3);
  let o = 0;
  for (const [g, c] of flat) {
    const n = g.getAttribute('position').count;
    pos.set(g.getAttribute('position').array as Float32Array, o * 3);
    nrm.set(g.getAttribute('normal').array as Float32Array, o * 3);
    uv.set(g.getAttribute('uv').array as Float32Array, o * 2);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], (o + i) * 3);
    o += n;
  }
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  for (const [g] of parts) g.dispose();
  for (const [g] of flat) g.dispose();
  return out;
}

/**
 * Split firewood stacked beside a hearth (A136): eleven logs in rows of four, four and three, about 0.55 m long and
 * 0.4 m high, laid unevenly (each a little turned, pushed out or short), some whole in their bark and some split in half
 * with the pale split face showing. One texture (`firewoodMaterial`) holds bark, the sawn end's rings and split grain in
 * three columns; the geometry's uv picks the column. Stands on y = 0, the logs along x.
 */
export function firewoodGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const column = (g: THREE.BufferGeometry, col: number) => {
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setX(i, (col + Math.min(0.999, Math.max(0, uv.getX(i)))) / 3);
  };
  let k = 0;
  const rnd = (n: number) => { const x = Math.sin(n * 91.7 + 13.1) * 43758.5; return x - Math.floor(x); };
  for (const [row, n] of [4, 4, 3].entries()) for (let i = 0; i < n; i++, k++) {
    const r = 0.05 + rnd(k) * 0.025, len = 0.48 + rnd(k + 40) * 0.12, split = rnd(k + 80) < 0.45;
    const theta = split ? Math.PI : Math.PI * 2;
    const side = new THREE.CylinderGeometry(r, r * (0.92 + rnd(k + 9) * 0.1), len, 7, 1, true, 0, theta);
    column(side, 0);
    const ends = [len / 2, -len / 2].map((y) => {
      const cap = new THREE.CircleGeometry(r, 7, 0, theta).rotateX(y > 0 ? -Math.PI / 2 : Math.PI / 2).translate(0, y, 0);
      // A half disc turned to lie under the half shell (which covers +x).
      if (split) cap.rotateY(y > 0 ? -Math.PI / 2 : Math.PI / 2);
      column(cap, 1);
      return cap;
    });
    const log: THREE.BufferGeometry[] = [side, ...ends];
    if (split) {
      // The split face: a flat plank through the axis.
      const face = new THREE.PlaneGeometry(2 * r, len).rotateY(Math.PI / 2);
      column(face, 2);
      log.push(face);
    }
    const yaw = (rnd(k + 3) - 0.5) * 0.2, roll = split ? (row % 2 ? 1 : -1) * Math.PI / 2 + (rnd(k + 5) - 0.5) * 0.6 : rnd(k + 5) * 6;
    for (const g of log) {
      g.rotateY(roll).rotateZ(Math.PI / 2).rotateY(yaw);
      g.translate((rnd(k + 7) - 0.5) * 0.08, 0.06 + row * 0.105 + (rnd(k + 11) - 0.5) * 0.015, (i - (n - 1) / 2) * 0.13 + (row % 2) * 0.03 + (rnd(k + 13) - 0.5) * 0.02);
      parts.push(g);
    }
  }
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const out = new THREE.BufferGeometry(), count = flat.reduce((n, g) => n + g.getAttribute('position').count, 0);
  for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2]] as const) {
    const arr = new Float32Array(count * size);
    let o = 0;
    for (const g of flat) { arr.set(g.getAttribute(name).array as Float32Array, o); o += g.getAttribute(name).count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  parts.forEach((g) => g.dispose()); flat.forEach((g) => g.dispose());
  return out;
}

/** Bark, the rings of a sawn end and split grain (A136), drawn once on a small canvas. */
export function firewoodMaterial(): THREE.MeshStandardMaterial {
  const W = 384, H = 128, canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;
  const rnd = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
  // Bark: dark furrowed strips along the log, with lichen grey in places.
  g.fillStyle = '#3a2c20'; g.fillRect(0, 0, 128, H);
  for (let i = 0; i < 70; i++) {
    const x = rnd(i) * 128, w = 1 + rnd(i + 99) * 4;
    g.fillStyle = rnd(i + 7) < 0.5 ? '#1f170f' : rnd(i + 3) < 0.85 ? '#4e3d2c' : '#6d6a58';
    g.fillRect(x, rnd(i + 5) * H * 0.5, w, H * (0.4 + rnd(i + 11) * 0.6));
  }
  // The sawn end: rings round a dark heart, a crack, cut marks.
  const cx = 128 + 64, cy = 64;
  g.fillStyle = '#9a7a52'; g.fillRect(128, 0, 128, H);
  for (let r = 60; r > 2; r -= 3 + rnd(r) * 3) { g.strokeStyle = r % 2 ? 'rgba(80,52,30,0.55)' : 'rgba(150,118,80,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = '#5a3e26'; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2a1c10'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 40, cy - 22); g.stroke();
  // The rim of bark round the end.
  g.strokeStyle = '#2a1e14'; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, 62, 0, Math.PI * 2); g.stroke();
  // Split grain: pale, fibrous streaks along the log.
  g.fillStyle = '#a4825a'; g.fillRect(256, 0, 128, H);
  for (let i = 0; i < 60; i++) { g.fillStyle = rnd(i + 300) < 0.5 ? 'rgba(110,80,50,0.5)' : 'rgba(190,160,120,0.4)'; g.fillRect(256 + rnd(i + 200) * 128, 0, 1 + rnd(i + 250) * 2, H); }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
}

/** A peg rail: a strip one unit long (scaled along x), its pegs at y = 0 standing out from the wall. */
export function pegRailGeometry(): THREE.BufferGeometry {
  const parts: [THREE.BufferGeometry, number][] = [[new THREE.BoxGeometry(1, 0.08, 0.025).translate(0, 0, 0.0125), 0x3e2a1a]];
  for (const x of [-0.42, -0.25, -0.08, 0.08, 0.25, 0.42]) parts.push([new THREE.CylinderGeometry(0.011, 0.013, 0.07, 6).rotateX(Math.PI / 2).translate(x, -0.005, 0.055), 0x4a3422]);
  return mergeColoured(parts);
}
