import type { PaintSpec } from './paint';
import { hash, toSrgb } from './paint';
import type { SheetLayout, SheetRegion } from './sheet';

/**
 * Guides for repainting a person's sheet (docs/art/people-retexture.md). From the same projection the painter used:
 *
 * - a template: every surface in its flat base colour (a block-in, as a concept painter starts), outlined where one piece
 *   meets another and at the silhouette, with guide lines at the joints and the features and each panel labelled;
 * - a parts map: each piece in its own flat colour, listed in the manifest, for tools that want to select one;
 * - masks: white where a surface is (and its inverse with transparency, the form image editors take for "paint here").
 *
 * All plain pixel arrays (RGBA, rows top to bottom), so the export tool writes them as PNG in Node.
 */

export interface TemplateInput {
  layout: SheetLayout;
  /** Nearest-surface triangle per pixel (-1 none) and barycentrics, from the projection. */
  tri: Int32Array;
  b1: Float32Array;
  b2: Float32Array;
  index: Uint32Array;
  /** Per vertex: part and linear base colour. */
  part: Uint16Array;
  col: Float32Array;
  parts: readonly PaintSpec[];
  /** Guide lines: bind-pose heights (m) for the body panels and for the head panels. */
  bodyLines: { label: string; y: number }[];
  headLines: { label: string; y: number }[];
}

/** A stable, light colour for a kind of piece (the same piece name always gets the same colour). */
export function partColor(piece: string): [number, number, number] {
  let h = 0;
  for (let i = 0; i < piece.length; i++) h = (Math.imul(h, 31) + piece.charCodeAt(i)) | 0;
  const hue = hash(h, 7) * 360;
  const s = 0.45 + 0.3 * hash(h, 11);
  const l = 0.55 + 0.15 * hash(h, 13);
  // HSL to RGB.
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/* ---------------------------------------------------------------- a small pixel font for labels */

// 5x7 glyphs, one row per string, '#' set.
const GLYPHS: Record<string, string[]> = {
  A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  B: ['#### ', '#   #', '#   #', '#### ', '#   #', '#   #', '#### '],
  C: [' ####', '#    ', '#    ', '#    ', '#    ', '#    ', ' ####'],
  D: ['#### ', '#   #', '#   #', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'],
  F: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#    '],
  G: [' ####', '#    ', '#    ', '#  ##', '#   #', '#   #', ' ####'],
  H: ['#   #', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  I: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '#####'],
  J: ['  ###', '    #', '    #', '    #', '#   #', '#   #', ' ### '],
  K: ['#   #', '#  # ', '# #  ', '##   ', '# #  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '#   #', '#   #', '#   #', '#   #'],
  N: ['#   #', '##  #', '# # #', '#  ##', '#   #', '#   #', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#   #', '#### ', '#    ', '#    ', '#    '],
  Q: [' ### ', '#   #', '#   #', '#   #', '# # #', '#  # ', ' ## #'],
  R: ['#### ', '#   #', '#   #', '#### ', '# #  ', '#  # ', '#   #'],
  S: [' ####', '#    ', '#    ', ' ### ', '    #', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
  W: ['#   #', '#   #', '#   #', '# # #', '# # #', '## ##', '#   #'],
  X: ['#   #', '#   #', ' # # ', '  #  ', ' # # ', '#   #', '#   #'],
  Y: ['#   #', '#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],
  '0': [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
  '1': ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  '2': [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'],
  '3': ['#### ', '    #', '    #', ' ### ', '    #', '    #', '#### '],
  '4': ['#   #', '#   #', '#   #', '#####', '    #', '    #', '    #'],
  '5': ['#####', '#    ', '#    ', '#### ', '    #', '    #', '#### '],
  '6': [' ### ', '#    ', '#    ', '#### ', '#   #', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', '  #  ', '  #  ', '  #  '],
  '8': [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
  '9': [' ### ', '#   #', '#   #', ' ####', '    #', '    #', ' ### '],
  '-': ['     ', '     ', '     ', ' ### ', '     ', '     ', '     '],
  '.': ['     ', '     ', '     ', '     ', '     ', '     ', '  #  '],
  ' ': ['     ', '     ', '     ', '     ', '     ', '     ', '     '],
};

/** Draw text with the pixel font at a scale, top-left at (x, y). */
export function drawText(rgba: Uint8Array, width: number, height: number, text: string, x: number, y: number, scale: number, color: [number, number, number]) {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS[' ']!;
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (g[gy]![gx] !== '#') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = cx + gx * scale + sx;
            const py = y + gy * scale + sy;
            if (px < 0 || py < 0 || px >= width || py >= height) continue;
            const o = (py * width + px) * 4;
            rgba[o] = color[0];
            rgba[o + 1] = color[1];
            rgba[o + 2] = color[2];
            rgba[o + 3] = 255;
          }
        }
      }
    }
    cx += 6 * scale;
  }
}

/** The label each panel carries. */
export function regionLabel(r: SheetRegion): string {
  return r.name.replace('body-', '').replace('head-', 'head ');
}

/** Pixel row of a bind-pose height in a region (body panels and the four head side views; not the top view). */
export function rowOf(r: SheetRegion, y: number): number {
  return Math.round(r.y + r.h - (y - r.v0) * r.scale);
}

export interface TemplateImages {
  template: Uint8Array;
  parts: Uint8Array;
  mask: Uint8Array;
  editMask: Uint8Array;
  legend: { piece: string; surface: string; color: [number, number, number] }[];
}

export function sheetTemplates(t: TemplateInput): TemplateImages {
  const { width: W, height: H } = t.layout;
  const N = W * H;
  const template = new Uint8Array(N * 4);
  const parts = new Uint8Array(N * 4);
  const mask = new Uint8Array(N * 4);
  const editMask = new Uint8Array(N * 4);
  const pid = new Int32Array(N).fill(-1);
  const bg: [number, number, number] = [92, 88, 82];
  for (let o = 0; o < N; o++) {
    const f = t.tri[o]!;
    const q = o * 4;
    if (f < 0) {
      template.set([bg[0], bg[1], bg[2], 255], q);
      parts.set([0, 0, 0, 255], q);
      mask.set([0, 0, 0, 255], q);
      editMask.set([0, 0, 0, 255], q);
      continue;
    }
    const ia = t.index[f * 3]!;
    const ib = t.index[f * 3 + 1]!;
    const ic = t.index[f * 3 + 2]!;
    const wb = t.b1[o]!;
    const wc = t.b2[o]!;
    const wa = 1 - wb - wc;
    const p = t.part[ia]!;
    pid[o] = p;
    for (let k = 0; k < 3; k++) template[q + k] = toSrgb(t.col[ia * 3 + k]! * wa + t.col[ib * 3 + k]! * wb + t.col[ic * 3 + k]! * wc);
    template[q + 3] = 255;
    const pc = partColor(t.parts[p]!.piece);
    parts.set([pc[0], pc[1], pc[2], 255], q);
    mask.set([255, 255, 255, 255], q);
    // An image editor repaints where its mask is transparent.
    editMask.set([0, 0, 0, 0], q);
  }
  // Outlines: where the piece changes, and at the silhouette.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = y * W + x;
      const a = pid[o]!;
      if (a < 0) continue;
      const r = x + 1 < W ? pid[o + 1]! : -1;
      const d = y + 1 < H ? pid[o + W]! : -1;
      const l = x > 0 ? pid[o - 1]! : -1;
      const u = y > 0 ? pid[o - W]! : -1;
      const pa = t.parts[a]!.piece;
      const differs = (b: number) => b < 0 || t.parts[b]!.piece !== pa;
      if (differs(r) || differs(d) || differs(l) || differs(u)) {
        const q = o * 4;
        template[q] = Math.round(template[q]! * 0.35);
        template[q + 1] = Math.round(template[q + 1]! * 0.35);
        template[q + 2] = Math.round(template[q + 2]! * 0.35);
      }
    }
  }
  // Guide lines and labels.
  const guide: [number, number, number] = [96, 196, 214];
  const scale = Math.max(1, Math.round(W / 512));
  const titleH = 8 * (scale + 1) + 2;
  const line = (r: SheetRegion, row: number, label: string, labelled: boolean) => {
    if (row < r.y || row >= r.y + r.h) return;
    for (let x = r.x; x < r.x + r.w; x += 1) {
      if ((x - r.x) % 6 > 3) continue;
      const q = (row * W + x) * 4;
      template[q] = guide[0];
      template[q + 1] = guide[1];
      template[q + 2] = guide[2];
    }
    // Labels sit right-aligned above their line, clear of the panel's title.
    if (!labelled || row - 8 * scale < r.y + titleH) return;
    drawText(template, W, H, label, r.x + r.w - label.length * 6 * scale - 2, row - 8 * scale, scale, guide);
  };
  for (const r of t.layout.regions) {
    if (r.view !== 'top') {
      const lines = (r.set === 'body' ? t.bodyLines : t.headLines).map((g) => ({ ...g, row: rowOf(r, g.y) })).sort((a, b) => a.row - b.row);
      let last = -Infinity;
      for (const g of lines) {
        // Skip a label that would overlap the one above it.
        const labelled = g.row - last >= 9 * scale;
        line(r, g.row, g.label, labelled);
        if (labelled) last = g.row;
      }
    }
    drawText(template, W, H, regionLabel(r), r.x + 2, r.y + 2, scale + 1, [235, 228, 210]);
  }
  const seen = new Map<string, { piece: string; surface: string; color: [number, number, number] }>();
  for (const p of t.parts) if (!seen.has(p.piece)) seen.set(p.piece, { piece: p.piece, surface: p.surface, color: partColor(p.piece) });
  return { template, parts, mask, editMask, legend: [...seen.values()] };
}
