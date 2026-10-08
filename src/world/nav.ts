import type { Colliders } from './colliders';
import { WORLD, type V2 } from './layout';
import type { Terrain } from './terrain';
import { finishCooperatively, type CooperativeOptions } from '../platform/cooperative';

export interface NavigationConstructionOptions extends CooperativeOptions {
  onProgress?: (completed: number, total: number) => void;
}

function* navigationSteps(terrain: Terrain, colliders: Colliders, radius: number): Generator<number, Uint8Array> {
  const blocked = new Uint8Array(terrain.nx * terrain.nz);
  for (let j = 0; j < terrain.nz; j++) {
    for (let i = 0; i < terrain.nx; i++) {
      const x = WORLD.minX + (i + 0.5) * WORLD.cell, z = WORLD.minZ + (j + 0.5) * WORLD.cell;
      let bad = !terrain.walkable(x, z, 0.8);
      // Sample the whole cell: 2 m cells would otherwise let a route slip through a thin wall.
      for (let k = 0; !bad && k < 9; k++) {
        const ox = ((k % 3) - 1) * (WORLD.cell * 0.45), oz = (Math.floor(k / 3) - 1) * (WORLD.cell * 0.45);
        if (colliders.blocked(x + ox, z + oz, radius)) bad = true;
      }
      blocked[j * terrain.nx + i] = bad ? 1 : 0;
    }
    if ((j + 1) % 4 === 0 || j + 1 === terrain.nz) yield j + 1;
  }
  return blocked;
}

/**
 * Grid navigation derived from the same terrain and colliders the player walks on. It is
 * rebuilt when dynamic colliders change so a shortcut opening changes reachable routes.
 */
export class NavGrid {
  readonly w: number;
  readonly h: number;
  private blocked: Uint8Array;
  private readonly widerGrids = new Map<number, NavGrid>();
  builtVersion = -1;

  constructor(private terrain: Terrain, private colliders: Colliders, private radius = 0.55, prepared?: { blocked: Uint8Array; version: number }) {
    this.w = terrain.nx;
    this.h = terrain.nz;
    this.blocked = prepared?.blocked ?? new Uint8Array(this.w * this.h);
    if (prepared) this.builtVersion = prepared.version;
    else this.rebuild();
  }

  /** Build navigation while loading, without exposing a partially traversable grid. */
  static async create(terrain: Terrain, colliders: Colliders, radius = 0.55, options: NavigationConstructionOptions = {}): Promise<NavGrid> {
    for (;;) {
      const version = colliders.version;
      const blocked = await finishCooperatively(navigationSteps(terrain, colliders, radius), {
        ...options, onProgress: completed => options.onProgress?.(completed, terrain.nz),
      });
      // A changed gate invalidates every earlier row, not just the rows sampled after the yield.
      if (version === colliders.version) return new NavGrid(terrain, colliders, radius, { blocked, version });
    }
  }

  cellCenter(i: number, j: number): V2 {
    return { x: WORLD.minX + (i + 0.5) * WORLD.cell, z: WORLD.minZ + (j + 0.5) * WORLD.cell };
  }

  toCell(x: number, z: number) {
    return { i: Math.floor((x - WORLD.minX) / WORLD.cell), j: Math.floor((z - WORLD.minZ) / WORLD.cell) };
  }

  rebuild() {
    const steps = navigationSteps(this.terrain, this.colliders, this.radius);
    for (;;) { const next = steps.next(); if (next.done) { this.blocked = next.value; break; } }
    this.builtVersion = this.colliders.version;
  }

  ensureFresh() {
    if (this.builtVersion !== this.colliders.version) this.rebuild();
  }

  /** A large creature needs a route sized for its whole body, including the smoothing clearance. */
  forRadius(radius: number): NavGrid {
    if (radius <= this.radius) return this;
    let grid = this.widerGrids.get(radius);
    if (!grid) {
      grid = new NavGrid(this.terrain, this.colliders, radius);
      this.widerGrids.set(radius, grid);
    }
    return grid;
  }

  async forRadiusAsync(radius: number, options: NavigationConstructionOptions = {}): Promise<NavGrid> {
    if (radius <= this.radius) return this;
    const existing = this.widerGrids.get(radius);
    if (existing?.builtVersion === this.colliders.version) return existing;
    const grid = await NavGrid.create(this.terrain, this.colliders, radius, options);
    this.widerGrids.set(radius, grid);
    return grid;
  }

  isBlocked(i: number, j: number): boolean {
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return true;
    return this.blocked[j * this.w + i] === 1;
  }

  /** Nearest open cell to a world position (for goals that sit on a collider edge). */
  nearestOpen(x: number, z: number, maxRing = 6): { i: number; j: number } | null {
    const { i, j } = this.toCell(x, z);
    if (!this.isBlocked(i, j)) return { i, j };
    for (let ring = 1; ring <= maxRing; ring++) {
      let best: { i: number; j: number; d: number } | null = null;
      for (let dj = -ring; dj <= ring; dj++) {
        for (let di = -ring; di <= ring; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== ring) continue;
          if (this.isBlocked(i + di, j + dj)) continue;
          const d = di * di + dj * dj;
          if (!best || d < best.d) best = { i: i + di, j: j + dj, d };
        }
      }
      if (best) return { i: best.i, j: best.j };
    }
    return null;
  }

  private lineClear(a: V2, b: V2): boolean {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(len / (WORLD.cell * 0.5)));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const { i, j } = this.toCell(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
      if (this.isBlocked(i, j)) return false;
    }
    return true;
  }

  /** A* over the cell grid with string-pulling. Returns world waypoints or null when unreachable. */
  findPath(from: V2, to: V2, maxExpand = 90000): V2[] | null {
    this.ensureFresh();
    const s = this.nearestOpen(from.x, from.z);
    const g = this.nearestOpen(to.x, to.z);
    if (!s || !g) return null;
    const W = this.w;
    const total = W * this.h;
    const gScore = new Float32Array(total).fill(Infinity);
    const came = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const startIdx = s.j * W + s.i;
    const goalIdx = g.j * W + g.i;
    gScore[startIdx] = 0;

    // Binary heap keyed by f-score.
    const heapIdx: number[] = [startIdx];
    const heapF: number[] = [0];
    const push = (idx: number, f: number) => {
      heapIdx.push(idx);
      heapF.push(f);
      let k = heapIdx.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heapF[p]! <= heapF[k]!) break;
        [heapF[p], heapF[k]] = [heapF[k]!, heapF[p]!];
        [heapIdx[p], heapIdx[k]] = [heapIdx[k]!, heapIdx[p]!];
        k = p;
      }
    };
    const pop = () => {
      const top = heapIdx[0]!;
      const lastI = heapIdx.pop()!;
      const lastF = heapF.pop()!;
      if (heapIdx.length > 0) {
        heapIdx[0] = lastI;
        heapF[0] = lastF;
        let k = 0;
        for (;;) {
          const l = k * 2 + 1;
          const r = l + 1;
          let m = k;
          if (l < heapIdx.length && heapF[l]! < heapF[m]!) m = l;
          if (r < heapIdx.length && heapF[r]! < heapF[m]!) m = r;
          if (m === k) break;
          [heapF[m], heapF[k]] = [heapF[k]!, heapF[m]!];
          [heapIdx[m], heapIdx[k]] = [heapIdx[k]!, heapIdx[m]!];
          k = m;
        }
      }
      return top;
    };
    const heur = (i: number, j: number) => {
      const dx = Math.abs(i - g.i);
      const dz = Math.abs(j - g.j);
      return (dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz)) * 1.0;
    };
    const dirs = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
    ] as const;

    let expanded = 0;
    let found = false;
    while (heapIdx.length > 0 && expanded < maxExpand) {
      const cur = pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      expanded++;
      if (cur === goalIdx) {
        found = true;
        break;
      }
      const ci = cur % W;
      const cj = (cur / W) | 0;
      for (const [di, dj, cost] of dirs) {
        const ni = ci + di;
        const nj = cj + dj;
        if (this.isBlocked(ni, nj)) continue;
        if (di !== 0 && dj !== 0 && (this.isBlocked(ci + di, cj) || this.isBlocked(ci, cj + dj))) continue; // no corner cutting
        const n = nj * W + ni;
        if (closed[n]) continue;
        const ng = gScore[cur]! + cost;
        if (ng < gScore[n]!) {
          gScore[n] = ng;
          came[n] = cur;
          push(n, ng + heur(ni, nj));
        }
      }
    }
    if (!found) return null;

    const cells: V2[] = [];
    for (let n = goalIdx; n !== -1; n = came[n]!) {
      cells.push(this.cellCenter(n % W, (n / W) | 0));
      if (n === startIdx) break;
    }
    cells.reverse();
    // String-pull: drop waypoints that have a clear straight line to a later one.
    const out: V2[] = [];
    let anchor = cells[0]!;
    let k = 1;
    while (k < cells.length) {
      let far = k;
      for (let m = cells.length - 1; m > k; m--) {
        if (this.lineClear(anchor, cells[m]!)) {
          far = m;
          break;
        }
      }
      out.push(cells[far]!);
      anchor = cells[far]!;
      k = far + 1;
    }
    // Land exactly on the requested goal when it is reachable in a straight step. The goal cell's centre is only the
    // grid's: when the leg before it already reaches the goal, the route goes straight there instead of stepping up to
    // a point as much as 1.4 m aside and turning back (A69).
    const last = out[out.length - 1];
    if (last && this.lineClear(last, to)) {
      if (this.lineClear(out.length > 1 ? out[out.length - 2]! : from, to)) out[out.length - 1] = { x: to.x, z: to.z };
      else out.push({ x: to.x, z: to.z });
    }
    return out;
  }
}
