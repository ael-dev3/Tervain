import * as THREE from 'three';
import type { FurnitureId } from '../world/furnitureSizes';

/**
 * The small things of a lived-in room (A76): bowls, jugs, cups, a loaf, candles and pots on the tables, counters,
 * desks, workbenches and chests. Rooms had their furniture but nothing on it, so they read as bare. Each thing is a few
 * dozen triangles built here, drawn as one instanced mesh per kind; each stands on its piece's own surface, found by a
 * ray down onto the piece's model at load, and a spot the ray misses (or that is not level) is left empty.
 */
export type ClutterKind = 'bowl' | 'jug' | 'cup' | 'loaf' | 'candle' | 'pot';

/** What stands on each kind of piece: where (fractions of its half width and half depth, front towards +z) and what. */
export const CLUTTER_SPOTS: Partial<Record<FurnitureId, readonly (readonly [ClutterKind, number, number])[]>> = {
  table: [['bowl', -0.5, 0.15], ['jug', 0.45, -0.3], ['cup', 0.62, 0.35], ['cup', -0.1, -0.45], ['loaf', -0.05, 0.25], ['candle', 0.12, -0.05]],
  counter: [['jug', -0.62, -0.1], ['cup', -0.32, 0.25], ['cup', 0.15, 0.2], ['pot', 0.65, -0.15], ['bowl', 0.05, -0.25]],
  desk: [['candle', 0.7, -0.2], ['cup', -0.65, 0.1]],
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
    case 'loaf': return new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 0.65);
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
