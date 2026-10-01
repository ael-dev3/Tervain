import { facePixels, type FacePaint } from './facePaint';
import type { FaceShape } from './headShape';
import { paintSheet, type PaintSpec } from './paint';
import { boundsOf, layoutSheet, projectSheet, unwrapPositions, type SheetLayout } from './sheet';
import { BONES, smoothNormals, type BoneName, type V3 } from './skin';

/**
 * Painting a person's sheet as one self-contained job: everything in it is plain data, so it can run on a worker thread
 * (sheetPool.ts) as well as inline (tests, tools, browsers without workers). The job unwraps the merged mesh, lays out
 * and projects the sheet, paints the face map and the sheet, and returns each vertex's sheet coordinates and weights with
 * the pixels.
 */
export interface SheetJob {
  size: number;
  /** Merged mesh in the bind pose. */
  pos: Float32Array;
  col: Float32Array;
  pa: Float32Array;
  part: Uint16Array;
  index: Uint32Array;
  welds: Uint32Array;
  skinIndex: Uint16Array;
  skinWeight: Float32Array;
  /** 0 body, 1 head, per vertex. */
  set: Uint8Array;
  joints: Record<BoneName, V3>;
  parts: PaintSpec[];
  face: { shape: FaceShape; paint: FacePaint; n: number };
  /** Only project (an image will colour the sheet). */
  skipPaint?: boolean;
  /** Return the projection buffers and the image-order pixels too (tools). */
  keep?: boolean;
}

export interface SheetResult {
  layout: SheetLayout;
  /** Per vertex, VIEW_COUNT (u, v) pairs and VIEW_COUNT weights. */
  uv: Float32Array;
  weight: Float32Array;
  /** sRGB RGBA, rows bottom to top (texture order); null when not painted. */
  pixels: Uint8Array | null;
  /** Which pixels a surface covers (image order). */
  covered: Uint8Array;
  /** Image-order pixels and the projection, when `keep`. */
  image?: Uint8Array;
  target?: { depth: Float32Array; tri: Int32Array; b1: Float32Array; b2: Float32Array };
  ms: { project: number; paint: number };
}

export function runSheetJob(job: SheetJob): SheetResult {
  const t0 = performance.now();
  const upos = unwrapPositions(job.pos, job.skinIndex, job.skinWeight, job.joints, BONES);
  const unrm = smoothNormals(upos, job.index, job.welds);
  const layout = layoutSheet(
    job.size,
    boundsOf(upos, () => true),
    boundsOf(upos, (i) => job.set[i] === 1),
  );
  const proj = projectSheet({ pos: upos, nrm: unrm, index: job.index, set: job.set, part: job.part }, layout);
  const t1 = performance.now();
  let pixels: Uint8Array | null = null;
  let image: Uint8Array | undefined;
  let covered: Uint8Array;
  if (job.skipPaint) {
    covered = new Uint8Array(layout.width * layout.height);
    for (let o = 0; o < covered.length; o++) covered[o] = proj.target.tri[o]! >= 0 ? 1 : 0;
  } else {
    const faceMap = facePixels(job.face.shape, job.face.paint, job.face.n);
    const painted = paintSheet(proj, { pos: job.pos, col: job.col, pa: job.pa, part: job.part, index: job.index }, { parts: job.parts, faceMap, faceN: job.face.n });
    covered = painted.covered;
    pixels = flipRows(painted.rgba, layout.width, layout.height);
    if (job.keep) image = painted.rgba;
  }
  const t2 = performance.now();
  const out: SheetResult = { layout, uv: proj.uv, weight: proj.weight, pixels, covered, ms: { project: t1 - t0, paint: t2 - t1 } };
  if (job.keep) {
    out.image = image;
    const t = proj.target;
    out.target = { depth: t.depth, tri: t.tri, b1: t.b1, b2: t.b2 };
  }
  return out;
}

/** Image rows top to bottom become texture rows bottom to top (texture v runs up). */
export function flipRows(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(rgba.length);
  const row = width * 4;
  for (let y = 0; y < height; y++) out.set(rgba.subarray(y * row, (y + 1) * row), (height - 1 - y) * row);
  return out;
}

/** The arrays a job's result can hand back without copying. */
export function resultTransfer(r: SheetResult): ArrayBuffer[] {
  const list: ArrayBufferLike[] = [r.uv.buffer, r.weight.buffer, r.covered.buffer];
  if (r.pixels) list.push(r.pixels.buffer);
  if (r.image) list.push(r.image.buffer);
  if (r.target) list.push(r.target.depth.buffer, r.target.tri.buffer, r.target.b1.buffer, r.target.b2.buffer);
  return [...new Set(list)] as ArrayBuffer[];
}
