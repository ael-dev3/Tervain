import { createTarget, rasterize, type RasterTarget } from './raster';
import type { BoneName, V3 } from './skin';

/**
 * A person's texture sheet: one image that is a character model sheet. The top half shows the whole figure from the front,
 * the right, the back and the left; the bottom half shows the head large from the front (the face) and smaller from the
 * right, the back, the left and above. Every surface takes its colour from the views that face it, blended by how
 * squarely it faces each one, so the sheet is simply a set of orthographic pictures of the person. That is what makes it
 * easy to repaint: an image generator (or a painter) only has to draw the person from the front, the sides and the back,
 * inside the silhouettes the template shows (docs/art/people-retexture.md).
 *
 * The pictures are taken in an unwrap pose with the arms raised out to the sides (an A-pose), so the arms never cover the
 * body in the front and back views. The rig is still bound and animated in its usual pose; the sheet coordinates are
 * computed once, so they bend with the skin.
 */

export const VIEWS = ['front', 'right', 'back', 'left', 'top'] as const;
export type ViewName = (typeof VIEWS)[number];
export const VIEW_COUNT = VIEWS.length;

/** Image right (u), image up (v) and the direction toward the viewer for each orthographic view. */
export const VIEW_AXES: Readonly<Record<ViewName, { u: V3; v: V3; toward: V3 }>> = {
  front: { u: [1, 0, 0], v: [0, 1, 0], toward: [0, 0, 1] },
  right: { u: [0, 0, 1], v: [0, 1, 0], toward: [-1, 0, 0] },
  back: { u: [-1, 0, 0], v: [0, 1, 0], toward: [0, 0, -1] },
  left: { u: [0, 0, -1], v: [0, 1, 0], toward: [1, 0, 0] },
  // From above, with the face toward the bottom of the picture.
  top: { u: [1, 0, 0], v: [0, 0, -1], toward: [0, 1, 0] },
};

/** Which part of the person a vertex belongs to: the body and costume, or the head (face, eyes, ears, hair, beard). */
export type SheetSet = 'body' | 'head';

export interface SheetRegion {
  /** Stable name used by the template and the export manifest. */
  name: string;
  set: SheetSet;
  view: ViewName;
  /** Pixel rectangle, origin at the top left. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Unwrap-pose coordinates on the view's u and v axes at the region's left and bottom edges. */
  u0: number;
  v0: number;
  /** Pixels per metre. */
  scale: number;
}

export interface SheetLayout {
  width: number;
  height: number;
  regions: SheetRegion[];
}

export interface Bounds {
  min: V3;
  max: V3;
}

/** The arms' lift in the unwrap pose, from hanging (radians). */
export const UNWRAP_ARM_ANGLE = (30 * Math.PI) / 180;

/**
 * Lay out a square sheet. Body views share one scale and stand on one ground line; the head's views share a cube centred
 * on the head (the face panel at twice the scale of the small views).
 */
export function layoutSheet(size: number, body: Bounds, head: Bounds): SheetLayout {
  const W = size;
  const H = size;
  const m = Math.max(2, Math.round(size * 0.012));
  const half = Math.floor(H / 2);
  const regions: SheetRegion[] = [];

  // Body: front, right, back, left side by side.
  const X = Math.max(Math.abs(body.min[0]), Math.abs(body.max[0]));
  const zr = body.max[2] - body.min[2];
  const hy = body.max[1] - body.min[1];
  const availW = W - 2 * m - 3 * m;
  const availH = half - 2 * m;
  const scale = Math.min(availW / (4 * X + 2 * zr), availH / hy);
  const used = scale * (4 * X + 2 * zr);
  let x = m + Math.floor((availW - used) / 2);
  const bh = Math.round(hy * scale);
  const by = half - m - bh;
  const bodyView = (view: ViewName, w: number, u0: number) => {
    const pw = Math.round(w * scale);
    regions.push({ name: `body-${view}`, set: 'body', view, x, y: by, w: pw, h: bh, u0, v0: body.min[1], scale });
    x += pw + m;
  };
  bodyView('front', 2 * X, -X);
  bodyView('right', zr, body.min[2]);
  bodyView('back', 2 * X, -X);
  bodyView('left', zr, -body.max[2]);

  // Head: a cube round the head, seen large from the front and small from the other four sides.
  const c: V3 = [(head.min[0] + head.max[0]) / 2, (head.min[1] + head.max[1]) / 2, (head.min[2] + head.max[2]) / 2];
  const S = 1.04 * Math.max(head.max[0] - head.min[0], head.max[1] - head.min[1], head.max[2] - head.min[2]);
  const headView = (name: string, view: ViewName, rx: number, ry: number, side: number, cu: number, cv: number) => {
    const inner = side - 2 * m;
    regions.push({ name, set: 'head', view, x: rx + m, y: ry + m, w: inner, h: inner, u0: cu - S / 2, v0: cv - S / 2, scale: inner / S });
  };
  const q = Math.floor(half / 2);
  headView('face', 'front', 0, half, half, c[0], c[1]);
  headView('head-right', 'right', half, half, q, c[2], c[1]);
  headView('head-back', 'back', half + q, half, q, -c[0], c[1]);
  headView('head-left', 'left', half, half + q, q, -c[2], c[1]);
  headView('head-top', 'top', half + q, half + q, q, c[0], -c[2]);
  return { width: W, height: H, regions };
}

/** The region of a set seen from a view (undefined for the body from above). */
export function regionFor(layout: SheetLayout, set: SheetSet, view: ViewName): SheetRegion | undefined {
  return layout.regions.find((r) => r.set === set && r.view === view);
}

/** Pixel coordinates (origin top left) and depth toward the viewer of an unwrap-pose point in a region. */
export function project(r: SheetRegion, x: number, y: number, z: number, out: Float32Array, o = 0) {
  const a = VIEW_AXES[r.view];
  const u = a.u[0] * x + a.u[1] * y + a.u[2] * z;
  const v = a.v[0] * x + a.v[1] * y + a.v[2] * z;
  out[o] = r.x + (u - r.u0) * r.scale;
  out[o + 1] = r.y + r.h - (v - r.v0) * r.scale;
  out[o + 2] = a.toward[0] * x + a.toward[1] * y + a.toward[2] * z;
}

/* ---------------------------------------------------------------- unwrap pose */

/**
 * Positions in the unwrap pose: each vertex follows its bones as linear blend skinning would move it, with each upper arm
 * turned out from the shoulder by `angle` (the forearm and hand go with it) and every other bone at rest.
 */
export function unwrapPositions(pos: Float32Array, skinIndex: Uint16Array, skinWeight: Float32Array, joints: Record<BoneName, V3>, bones: readonly BoneName[], angle = UNWRAP_ARM_ANGLE): Float32Array {
  const n = pos.length / 3;
  const out = new Float32Array(pos.length);
  // Per bone: pivot and rotation about +z (0 for bones that stay at rest).
  const pivot: V3[] = [];
  const turn: number[] = [];
  for (const b of bones) {
    const left = b === 'armL' || b === 'elbowL';
    const right = b === 'armR' || b === 'elbowR';
    pivot.push(left ? joints.armL : right ? joints.armR : [0, 0, 0]);
    turn.push(left ? angle : right ? -angle : 0);
  }
  const cs = turn.map((t) => Math.cos(t));
  const sn = turn.map((t) => Math.sin(t));
  for (let i = 0; i < n; i++) {
    const px = pos[i * 3]!;
    const py = pos[i * 3 + 1]!;
    const pz = pos[i * 3 + 2]!;
    let ox = 0;
    let oy = 0;
    let oz = 0;
    for (let k = 0; k < 4; k++) {
      const w = skinWeight[i * 4 + k]!;
      if (w <= 0) continue;
      const b = skinIndex[i * 4 + k]!;
      if (turn[b] === 0) {
        ox += w * px;
        oy += w * py;
        oz += w * pz;
        continue;
      }
      const [jx, jy] = pivot[b]!;
      const dx = px - jx;
      const dy = py - jy;
      ox += w * (jx + cs[b]! * dx - sn[b]! * dy);
      oy += w * (jy + sn[b]! * dx + cs[b]! * dy);
      oz += w * pz;
    }
    out[i * 3] = ox;
    out[i * 3 + 1] = oy;
    out[i * 3 + 2] = oz;
  }
  return out;
}

export function boundsOf(pos: Float32Array, pick: (i: number) => boolean): Bounds {
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  const n = pos.length / 3;
  for (let i = 0; i < n; i++) {
    if (!pick(i)) continue;
    for (let k = 0; k < 3; k++) {
      const v = pos[i * 3 + k]!;
      if (v < min[k]!) min[k] = v;
      if (v > max[k]!) max[k] = v;
    }
  }
  return { min, max };
}

/* ---------------------------------------------------------------- projection into the sheet */

/** What a sheet needs from a person's merged mesh, in the unwrap pose. */
export interface SheetMesh {
  pos: Float32Array;
  nrm: Float32Array;
  index: Uint32Array;
  /** 0 body, 1 head, per vertex. */
  set: Uint8Array;
  /** The painted part per vertex: a vertex is only seen through another part's surface when that lies almost on it. */
  part?: Uint16Array;
}

/** Depth within which another part's surface still counts as the vertex's own (paint on paint), in metres. */
const SAME_SURFACE = 0.003;

export interface SheetProjection {
  layout: SheetLayout;
  /** Nearest-surface buffers for every region (the body views hold the whole figure; the head views only the head). */
  target: RasterTarget;
  /** Per vertex and view: sheet texture coordinates (u, v in 0..1, v up), VIEW_COUNT pairs. */
  uv: Float32Array;
  /** Per vertex and view: blend weight, VIEW_COUNT values summing to 1. */
  weight: Float32Array;
}

/** How sharply a surface prefers the view it faces most squarely. */
const FACING_POW = 3;

/**
 * Project a person into a sheet: draw every region's nearest surfaces, then give each vertex its coordinates in the views
 * of its own set and a weight for each, by how squarely it faces that view and whether something nearer hides it there.
 */
export function projectSheet(mesh: SheetMesh, layout: SheetLayout): SheetProjection {
  const { pos, nrm, index, set, part } = mesh;
  const n = pos.length / 3;
  const target = createTarget(layout.width, layout.height);
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const sz = new Float32Array(n);
  const tmp = new Float32Array(3);
  const triCount = index.length / 3;
  const headTris: number[] = [];
  const allTris: number[] = [];
  for (let f = 0; f < triCount; f++) {
    allTris.push(f);
    if (set[index[f * 3]!] === 1) headTris.push(f);
  }
  const uv = new Float32Array(n * VIEW_COUNT * 2);
  const weight = new Float32Array(n * VIEW_COUNT);
  const vis = new Float32Array(n * VIEW_COUNT);
  for (const r of layout.regions) {
    for (let i = 0; i < n; i++) {
      project(r, pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!, tmp);
      sx[i] = tmp[0]!;
      sy[i] = tmp[1]!;
      sz[i] = tmp[2]!;
    }
    // The body views show the whole figure (so the sheet reads as a complete character); the head views only the head.
    rasterize(target, sx, sy, sz, index, r.set === 'body' ? allTris : headTris, { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h });
    const vi = VIEWS.indexOf(r.view);
    const want = r.set === 'body' ? 0 : 1;
    const tol = r.set === 'body' ? 0.02 : 0.006;
    for (let i = 0; i < n; i++) {
      if (set[i] !== want) continue;
      const o = (i * VIEW_COUNT + vi) * 2;
      uv[o] = sx[i]! / layout.width;
      uv[o + 1] = 1 - sy[i]! / layout.height;
      // Visible if any pixel round it holds nothing nearer than the vertex itself, with a tolerance for the curve of its
      // own part's surface; another part (a sleeve over a shawl) hides it unless it lies almost on it.
      const px = Math.floor(sx[i]!);
      const py = Math.floor(sy[i]!);
      let seen = false;
      for (let dy = -1; dy <= 1 && !seen; dy++) {
        const yy = py + dy;
        if (yy < r.y || yy >= r.y + r.h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = px + dx;
          if (xx < r.x || xx >= r.x + r.w) continue;
          const o = yy * layout.width + xx;
          const d = target.depth[o]!;
          if (d > sz[i]! + tol) continue;
          if (part && d > sz[i]! + SAME_SURFACE && part[index[target.tri[o]! * 3]!] !== part[i]) continue;
          seen = true;
          break;
        }
      }
      vis[i * VIEW_COUNT + vi] = seen ? 1 : 0;
    }
  }
  const facing = new Float32Array(VIEW_COUNT);
  for (let i = 0; i < n; i++) {
    const head = set[i] === 1;
    let sum = 0;
    let raw = 0;
    const nx = nrm[i * 3]!;
    const ny = nrm[i * 3 + 1]!;
    const nz = nrm[i * 3 + 2]!;
    facing.fill(0);
    for (let v = 0; v < VIEW_COUNT; v++) {
      if (!head && VIEWS[v] === 'top') continue;
      const t = VIEW_AXES[VIEWS[v]!].toward;
      const d = Math.max(0, nx * t[0] + ny * t[1] + nz * t[2]);
      facing[v] = Math.pow(d, FACING_POW);
      raw += facing[v]!;
      const w = facing[v]! * vis[i * VIEW_COUNT + v]!;
      weight[i * VIEW_COUNT + v] = w;
      sum += w;
    }
    if (sum < 1e-4) {
      // Hidden everywhere (under a layer, inside a sleeve) or facing straight down: take the views it faces regardless,
      // or failing that the front and back.
      if (raw > 1e-4) {
        for (let v = 0; v < VIEW_COUNT; v++) weight[i * VIEW_COUNT + v] = facing[v]!;
        sum = raw;
      } else {
        weight[i * VIEW_COUNT] = 0.5;
        weight[i * VIEW_COUNT + 2] = 0.5;
        sum = 1;
      }
    }
    for (let v = 0; v < VIEW_COUNT; v++) weight[i * VIEW_COUNT + v] = weight[i * VIEW_COUNT + v]! / sum;
  }
  return { layout, target, uv, weight };
}
