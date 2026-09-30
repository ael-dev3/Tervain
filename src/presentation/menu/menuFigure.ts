import * as THREE from 'three';
import { valueNoise } from '../../world/noise';

/**
 * The warden of the vigil, made for this one view. The playable rig is built for walking people seen from a third-person
 * camera; a figure wrapped in a heavy cloak reads better as its own sculpted shape. He sits across the fire from the viewer,
 * hunched, hood forward, sleeves reaching to the warmth, the wool falling over his knees and caked with mud at the hem.
 *
 * Local frame: +z is where he faces, y up, feet at y = 0.
 */

type V3 = [number, number, number];

interface Ring {
  y: number;
  /** Centre offset forward (+z). */
  cz: number;
  rx: number;
  rz: number;
  /** How deep the folds cut at this height. */
  fold: number;
  color: V3;
}

class Acc {
  pos: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  get n() {
    return this.pos.length / 3;
  }
  v(p: V3, c: V3) {
    this.pos.push(p[0], p[1], p[2]);
    this.col.push(c[0], c[1], c[2]);
    return this.n - 1;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixc = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/**
 * A loft of folded rings. `open` leaves the front arc (the hood's face) without faces above a height; `seam` darkens the
 * front of the rings between two heights, where a cloak parts over the clothes beneath.
 */
function loft(acc: Acc, rings: Ring[], seg: number, seed: number, o: { open?: { halfAngle: number; above: number }; seam?: [number, number] } = {}) {
  const base = acc.n;
  for (let r = 0; r < rings.length; r++) {
    const R = rings[r]!;
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      // Heavy wool folds: a few deep ones, finer creases between, all irregular and drifting with height.
      const f =
        Math.sin(a * 5 + seed + R.y * 1.3) * 0.55 +
        Math.sin(a * 11 + seed * 1.7 - R.y * 2.1) * 0.22 +
        (valueNoise(a * 2.4 + seed, R.y * 3.3, seed) - 0.5) * 0.7;
      const k = 1 + f * R.fold;
      const x = Math.sin(a) * R.rx * k;
      const z = R.cz + Math.cos(a) * R.rz * k;
      let shade = 0.78 + 0.34 * Math.max(-0.5, Math.min(0.5, f));
      if (o.seam && R.y > o.seam[0] && R.y < o.seam[1] && Math.cos(a) > 0.93) shade *= 0.45;
      const hem = r === 0 ? (valueNoise(a * 4 + seed, 0, seed) - 0.5) * 0.06 : 0;
      acc.v([x, R.y + hem, z], [R.color[0] * shade, R.color[1] * shade, R.color[2] * shade]);
    }
  }
  const row = seg + 1;
  for (let r = 0; r < rings.length - 1; r++) {
    for (let s = 0; s < seg; s++) {
      const a = ((s + 0.5) / seg) * Math.PI * 2;
      if (o.open && rings[r]!.y >= o.open.above && Math.cos(a) > Math.cos(o.open.halfAngle)) continue;
      const i = base + r * row + s;
      acc.idx.push(i, i + 1, i + row, i + 1, i + row + 1, i + row);
    }
  }
}

function blob(acc: Acc, c: V3, r: V3, color: V3, seed: number, lump = 0.25) {
  const base = acc.n;
  const seg = 9;
  const rings = 6;
  for (let j = 0; j <= rings; j++) {
    const ph = (j / rings) * Math.PI;
    for (let s = 0; s <= seg; s++) {
      const th = (s / seg) * Math.PI * 2;
      const k = 1 + (valueNoise(s * 1.3 + seed, j * 1.7, seed) - 0.5) * lump;
      acc.v([c[0] + Math.sin(ph) * Math.cos(th) * r[0] * k, c[1] + Math.cos(ph) * r[1] * k, c[2] + Math.sin(ph) * Math.sin(th) * r[2] * k], color);
    }
  }
  const row = seg + 1;
  for (let j = 0; j < rings; j++) {
    for (let s = 0; s < seg; s++) {
      const i = base + j * row + s;
      acc.idx.push(i, i + row, i + 1, i + 1, i + row, i + row + 1);
    }
  }
}

/** A sleeve (or a staff): a tube through points, radius tapering from r0 to r1. */
function tube(acc: Acc, pts: V3[], r0: number, r1: number, color: V3, seed: number, seg = 8) {
  const base = acc.n;
  const n = pts.length;
  let ref: V3 = [0, 1, 0];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    let t: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const tl = Math.hypot(t[0], t[1], t[2]) || 1;
    t = [t[0] / tl, t[1] / tl, t[2] / tl];
    if (Math.abs(t[0] * ref[0] + t[1] * ref[1] + t[2] * ref[2]) > 0.95) ref = [1, 0, 0];
    let side: V3 = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]];
    const sl = Math.hypot(side[0], side[1], side[2]) || 1;
    side = [side[0] / sl, side[1] / sl, side[2] / sl];
    const up: V3 = [side[1] * t[2] - side[2] * t[1], side[2] * t[0] - side[0] * t[2], side[0] * t[1] - side[1] * t[0]];
    ref = up;
    const r = lerp(r0, r1, i / (n - 1));
    for (let s = 0; s <= seg; s++) {
      const ang = (s / seg) * Math.PI * 2;
      const k = 1 + (valueNoise(ang * 2 + seed, i * 1.1, seed) - 0.5) * 0.25;
      const cx = Math.cos(ang) * r * k;
      const cy = Math.sin(ang) * r * k;
      const p = pts[i]!;
      acc.v([p[0] + side[0] * cx + up[0] * cy, p[1] + side[1] * cx + up[1] * cy, p[2] + side[2] * cx + up[2] * cy], color);
    }
  }
  const row = seg + 1;
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < seg; s++) {
      const a = base + i * row + s;
      acc.idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
}

function woolMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  // Wool sheen: a little light scattered at grazing angles lifts a silhouette's edge where the fire or the sky catches it.
  mat.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
      {
        float wSheen = pow(1.0 - clamp(dot(normalize(vViewPosition), -normal), 0.0, 1.0), 3.0);
        reflectedLight.directDiffuse *= 1.0 + wSheen * 0.9;
      }`,
    );
  };
  mat.customProgramCacheKey = () => 'tervain-menu-wool';
  return mat;
}

export interface CloakedFigure {
  group: THREE.Group;
  /** Breathing: a slow rise of the shoulders; zero amplitude holds still. */
  update(time: number, amp: number): void;
  dispose(): void;
}

function finish(acc: Acc, name: string, rate: number): CloakedFigure {
  const geo = acc.geometry();
  const mat = woolMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  const group = new THREE.Group();
  group.add(mesh);
  return {
    group,
    update(time: number, amp: number) {
      const b = Math.sin(time * rate) * 0.006 * amp;
      mesh.scale.set(1 + b * 0.5, 1 + b, 1 + b * 0.5);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

const WOOL: V3 = [0.03, 0.026, 0.022];
const MUD: V3 = [0.06, 0.045, 0.03];

/** The warden at the fire: seated, hunched forward, hood up, hands to the flames. */
export function buildCloakedFigure(seed = 17): CloakedFigure {
  const acc = new Acc();
  const spec: [number, number, number, number, number, number][] = [
    // y, cz, rx, rz, fold, mud
    [0.0, -0.04, 0.56, 0.56, 0.16, 1],
    [0.1, -0.06, 0.5, 0.5, 0.18, 0.75],
    [0.28, -0.09, 0.42, 0.4, 0.16, 0.3],
    [0.48, -0.09, 0.35, 0.3, 0.12, 0.05],
    [0.66, -0.06, 0.32, 0.24, 0.09, 0],
    [0.84, -0.01, 0.3, 0.22, 0.07, 0],
    [0.96, 0.03, 0.28, 0.19, 0.05, 0],
    [1.04, 0.06, 0.2, 0.15, 0.04, 0],
    [1.08, 0.07, 0.1, 0.09, 0.02, 0],
  ];
  const rings: Ring[] = spec.map(([y, cz, rx, rz, fold, m]) => ({ y, cz, rx, rz, fold, color: mixc(WOOL, MUD, m) }));
  loft(acc, rings, 40, seed * 0.37 + 3.1, { seam: [0.5, 0.98] });
  // The cloak falls forward over the knees and spreads on the ground in front.
  blob(acc, [0, 0.3, 0.26], [0.3, 0.27, 0.3], mixc(WOOL, MUD, 0.45), seed + 3, 0.35);
  for (const sx of [-1, 1]) blob(acc, [sx * 0.12, 0.5, 0.32], [0.1, 0.09, 0.2], WOOL, seed + 5 + sx, 0.2);
  // Sleeves reaching toward the fire, and the hands held out to it.
  for (const sx of [-1, 1]) {
    tube(acc, [[sx * 0.25, 0.92, 0.02], [sx * 0.27, 0.68, 0.16], [sx * 0.15, 0.7, 0.42]], 0.08, 0.062, [WOOL[0] * 1.1, WOOL[1] * 1.1, WOOL[2] * 1.1], seed + 7 + sx);
    blob(acc, [sx * 0.12, 0.7, 0.51], [0.045, 0.035, 0.07], [0.13, 0.08, 0.055], seed + 11 + sx);
  }
  // The hood: a deep cowl pulled forward, its point falling back, open at the face over a shadowed face.
  const hs: [number, number, number, number][] = [
    [1.02, 0.07, 0.21, 0.2],
    [1.12, 0.11, 0.18, 0.19],
    [1.22, 0.13, 0.16, 0.18],
    [1.31, 0.12, 0.145, 0.16],
    [1.38, 0.09, 0.12, 0.13],
    [1.43, 0.04, 0.08, 0.09],
    [1.46, -0.04, 0.035, 0.04],
  ];
  loft(acc, hs.map(([y, cz, rx, rz]) => ({ y, cz, rx, rz, fold: 0.05, color: [WOOL[0] * 1.1, WOOL[1] * 1.1, WOOL[2] * 1.05] as V3 })), 28, seed + 7.3, { open: { halfAngle: 0.9, above: 1.1 } });
  blob(acc, [0, 1.2, 0.15], [0.085, 0.105, 0.08], [0.018, 0.013, 0.01], seed + 13, 0.15);
  // Boots under the hem at the front.
  for (const sx of [-1, 1]) blob(acc, [sx * 0.16, 0.06, 0.6], [0.07, 0.06, 0.13], [0.045, 0.032, 0.022], seed + 21 + sx);
  return finish(acc, 'Menu_Warden_Figure', 1.35);
}
