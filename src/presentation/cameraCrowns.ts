/**
 * Tree crowns the follow camera keeps out of (A82). Seen from among a crown's branches a tree is a few thousand coarse
 * triangles of wood filling the screen; from outside it, the same tree reads well. A crown is the ellipsoid its leaves
 * fill; the camera keeps out of its core, the dense middle where the limbs are, and is free through its fringe.
 */
export interface CameraCrown {
  /** The crown's centre (world). */
  x: number; y: number; z: number;
  /** Its half-widths across and up. */
  h: number; v: number;
  /** The camera is held out only above this height (world): below it, among the low leaves, it moves freely. */
  floor: number;
}

/** The share of a crown's half-widths that is its core. */
export const CROWN_CORE = 0.75;
/** The shortest the boom is pulled to for a crown; beside the trunk the leaves near the eye fade (A79). */
export const CROWN_MIN_BOOM = 1.6;
/** Head room under a crown: the camera is never held out of what hangs this low above the ground. */
export const CROWN_FLOOR = 2.6;

/** Crowns by grid cell, for the camera's neighbourhood. */
export class CrownIndex {
  private readonly cells = new Map<number, CameraCrown[]>();
  private largest = 0;
  private readonly found: CameraCrown[] = [];

  constructor(private readonly cell = 8) {}

  private key(ix: number, iz: number) { return (ix + 4096) * 8192 + (iz + 4096); }

  add(crown: CameraCrown) {
    if (![crown.x, crown.y, crown.z, crown.h, crown.v, crown.floor].every(Number.isFinite) || crown.h <= 0 || crown.v <= 0) return;
    const k = this.key(Math.floor(crown.x / this.cell), Math.floor(crown.z / this.cell));
    let list = this.cells.get(k);
    if (!list) { list = []; this.cells.set(k, list); }
    list.push(crown);
    this.largest = Math.max(this.largest, crown.h);
  }

  get size() { let n = 0; for (const list of this.cells.values()) n += list.length; return n; }

  /** The crowns whose centres lie within `r` (plus the widest crown) of (x, z). The list is reused between calls. */
  near(x: number, z: number, r: number): readonly CameraCrown[] {
    this.found.length = 0;
    const reach = r + this.largest;
    const x0 = Math.floor((x - reach) / this.cell), x1 = Math.floor((x + reach) / this.cell);
    const z0 = Math.floor((z - reach) / this.cell), z1 = Math.floor((z + reach) / this.cell);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const list = this.cells.get(this.key(ix, iz));
      if (list) for (const c of list) if (Math.hypot(c.x - x, c.z - z) <= reach) this.found.push(c);
    }
    return this.found;
  }
}

function inCore(c: CameraCrown, x: number, y: number, z: number): boolean {
  if (y < c.floor) return false;
  const h = c.h * CROWN_CORE, v = c.v * CROWN_CORE;
  const dx = x - c.x, dy = y - c.y, dz = z - c.z;
  return (dx * dx + dz * dz) / (h * h) + (dy * dy) / (v * v) < 1;
}

/**
 * The boom length, up to `boom`, at which the camera stays out of every crown's core along the boom from `pivot` in
 * direction `dir` (unit). A crown whose core holds the pivot itself is passed over: the wanderer is in it already.
 */
export function crownBoom(pivot: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, boom: number,
  crowns: readonly CameraCrown[]): number {
  let allowed = boom;
  for (const c of crowns) {
    if (inCore(c, pivot.x, pivot.y, pivot.z)) continue;
    for (let d = 0.2; d <= allowed; d += 0.2) {
      if (!inCore(c, pivot.x + dir.x * d, pivot.y + dir.y * d, pivot.z + dir.z * d)) continue;
      allowed = Math.min(allowed, d - 0.3);
      break;
    }
  }
  return Math.max(Math.min(boom, CROWN_MIN_BOOM), allowed);
}
