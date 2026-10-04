import { decodeLevel, type G3Image } from './image';

/**
 * Where the leaves are in a SpeedTree composite image. Gothic 3's trees take their leaves, fronds and distant
 * billboards from a handful of shared composite images, but the definitions (.spt) do not say which part of the image
 * a tree's leaves use (the game supplies that at run time). This module finds the leaf clusters by looking at the
 * image: the composites are laid out on a grid of quarter tiles; a leaf cluster fills most of its tile with one ragged
 * shape, bare branches are thin lines, and billboards are narrow upright trees standing side by side. It is a
 * heuristic for this viewer's own trees, not the game's mapping.
 */

export interface AtlasSprite {
  /** Texture coordinates (top-left origin, as the images are stored). */
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** Share of the sprite's box that is opaque. */
  coverage: number;
  /** Boundary texels per opaque texel: high for needles and twigs, low for broad leaves. */
  thinness: number;
}

interface Blob {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  area: number;
}

/** Opaque shapes in a tile (8-connected, after closing one-texel gaps). */
function blobs(opaque: (x: number, y: number) => boolean, x0: number, y0: number, x1: number, y1: number): Blob[] {
  const w = x1 - x0;
  const h = y1 - y0;
  const near = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (opaque(x0 + x + dx, y0 + y + dy)) return true;
    return false;
  };
  const filled = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) filled[y * w + x] = near(x, y) ? 1 : 0;
  const seen = new Uint8Array(w * h);
  const out: Blob[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!filled[s] || seen[s]) continue;
    const b: Blob = { x0: w, y0: h, x1: 0, y1: 0, area: 0 };
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const c = stack.pop()!;
      const x = c % w;
      const y = (c - x) / w;
      b.area++;
      b.x0 = Math.min(b.x0, x);
      b.y0 = Math.min(b.y0, y);
      b.x1 = Math.max(b.x1, x + 1);
      b.y1 = Math.max(b.y1, y + 1);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const k = yy * w + xx;
          if (filled[k] && !seen[k]) {
            seen[k] = 1;
            stack.push(k);
          }
        }
      }
    }
    out.push(b);
  }
  return out;
}

/** The leaf clusters of a composite image, most solid first. */
export function leafClusters(image: G3Image): AtlasSprite[] {
  const levels = image.faces[0]!;
  // About 64 texels per tile: enough to tell shapes apart, and cheap to decode.
  const tiles = image.width === image.height ? 4 : 2;
  let level = 0;
  while (level + 1 < levels.length && image.width >> (level + 1) >= tiles * 64) level++;
  const w = Math.max(1, image.width >> level);
  const h = Math.max(1, image.height >> level);
  const rgba = decodeLevel(image.format, levels[level]!, w, h);
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && rgba[(y * w + x) * 4 + 3]! > 40;
  const tw = w / tiles;
  const rows = Math.round(h / tw);
  const out: AtlasSprite[] = [];
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const x0 = Math.round(tx * tw);
      const y0 = Math.round(ty * tw);
      const x1 = Math.round((tx + 1) * tw);
      const y1 = Math.min(h, Math.round((ty + 1) * tw));
      const size = (x1 - x0) * (y1 - y0);
      const shapes = blobs(opaque, x0, y0, x1, y1).filter((b) => b.area > size * 0.02);
      if (!shapes.length) continue;
      // Side-by-side upright trees: billboards.
      const upright = shapes.filter((b) => b.x1 - b.x0 < 0.55 * (x1 - x0) && b.y1 - b.y0 > 1.3 * (b.x1 - b.x0));
      if (upright.length >= 2) continue;
      const main = shapes.reduce((a, b) => (b.area > a.area ? b : a));
      if (main.x1 - main.x0 < 0.6 * (x1 - x0) || main.y1 - main.y0 < 0.6 * (y1 - y0)) continue;
      let count = 0;
      let edge = 0;
      for (let y = y0 + main.y0; y < y0 + main.y1; y++) {
        for (let x = x0 + main.x0; x < x0 + main.x1; x++) {
          if (!opaque(x, y)) continue;
          count++;
          if (!opaque(x + 1, y) || !opaque(x - 1, y) || !opaque(x, y + 1) || !opaque(x, y - 1)) edge++;
        }
      }
      const coverage = count / ((main.x1 - main.x0) * (main.y1 - main.y0));
      // Bare branches are thin lines.
      if (coverage < 0.12) continue;
      out.push({ u0: (x0 + main.x0) / w, v0: (y0 + main.y0) / h, u1: (x0 + main.x1) / w, v1: (y0 + main.y1) / h, coverage, thinness: edge / Math.max(1, count) });
    }
  }
  // Needles only show at a finer level: measure the outlines again there.
  const fine = Math.max(0, level - 2);
  if (fine !== level) {
    const fw = Math.max(1, image.width >> fine);
    const fh = Math.max(1, image.height >> fine);
    const f = decodeLevel(image.format, levels[fine]!, fw, fh);
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < fw && y < fh && f[(y * fw + x) * 4 + 3]! > 40;
    for (const s of out) {
      let count = 0;
      let edge = 0;
      for (let y = Math.floor(s.v0 * fh); y < Math.ceil(s.v1 * fh); y++) {
        for (let x = Math.floor(s.u0 * fw); x < Math.ceil(s.u1 * fw); x++) {
          if (!solid(x, y)) continue;
          count++;
          if (!solid(x + 1, y) || !solid(x - 1, y) || !solid(x, y + 1) || !solid(x, y - 1)) edge++;
        }
      }
      s.thinness = edge / Math.max(1, count);
    }
  }
  return out.sort((a, b) => b.coverage - a.coverage);
}

/** The cluster for a species: needle trees take the finest one, others one picked by name among the broader ones. */
export function clusterFor(name: string, clusters: readonly AtlasSprite[], conifer: boolean): AtlasSprite | null {
  if (!clusters.length) return null;
  const byThinness = [...clusters].sort((a, b) => b.thinness - a.thinness);
  if (conifer) return byThinness[0]!;
  const broad = byThinness.length > 1 ? byThinness.slice(1) : byThinness;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return broad[hash % broad.length]!;
}
