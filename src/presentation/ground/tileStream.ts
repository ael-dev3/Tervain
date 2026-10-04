import * as THREE from 'three';
import { smoothstep } from '../../world/noise';

/**
 * Streams a world-fixed grid of instanced tiles around the camera.
 *
 * Each tile is generated once from a deterministic seed (so the meadow never shifts under you), holds its
 * instances sorted by a stable rank in [0,1), and owns one draw call that three.js frustum-culls. Every frame the
 * layer sets each tile's instance count to those instances whose rank is below the density the camera distance
 * allows; the fragment shader fades each patch by the same rule without changing its shape. Tiles are built
 * ahead of that fade, and any missing visible tile is completed before rendering. Buffers are pooled.
 *
 * The streaming idea follows ael-dev3/Warpkeep src/components/realm/realmGrassActiveWindow.ts and
 * createRealmGrassLayer.ts @786c0b2 (Apache-2.0): a bounded active window re-seeded from a deterministic grid,
 * stable ranks for LOD handoff, and pooled instance buffers.
 */

export interface TileBuffers {
  base: Float32Array; // x, y, z, rank
  shape: Float32Array; // yaw, widthScale, heightScale, phase
  tint: Float32Array; // r, g, b, sunExposure
  ymin: number;
  ymax: number;
}

export interface TileLayerOptions {
  name: string;
  tileSize: number;
  capacity: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  fadeStart: number;
  fadeEnd: number;
  power: number;
  /** Tallest thing in a tile above its highest ground, for bounding volumes. */
  maxHeight: number;
  /** Maximum horizontal extent from an instance anchor, including shader wind and interaction displacement. */
  maxRadius?: number;
  receiveShadow: boolean;
  /** Fill the buffers for tile (tx, tz) with instances in ascending rank; return how many. */
  generate(tx: number, tz: number, out: TileBuffers): number;
}

interface Tile {
  key: number;
  tx: number;
  tz: number;
  mesh: THREE.Mesh;
  geo: THREE.InstancedBufferGeometry;
  count: number;
  x0: number;
  z0: number;
  ymin: number;
  ymax: number;
  attrs: THREE.InstancedBufferAttribute[];
}

export class TileLayer {
  readonly group = new THREE.Group();
  private tiles = new Map<number, Tile>();
  private pool: Tile[] = [];
  private buf: TileBuffers;
  private first = true;
  private wantList: { tx: number; tz: number; d: number }[] = [];
  visibleInstances = 0;
  visibleTriangles = 0;
  drawCalls = 0;
  activeTiles = 0;
  private trisPerInstance: number;
  private disposed = false;
  enabled = true;
  /** Multiplier on how many tiles may be built per frame (1 = 2 tiles). */
  buildRate = 1;

  constructor(private o: TileLayerOptions) {
    this.group.name = o.name;
    this.buf = {
      base: new Float32Array(o.capacity * 4),
      shape: new Float32Array(o.capacity * 4),
      tint: new Float32Array(o.capacity * 4),
      ymin: 0,
      ymax: 0,
    };
    this.trisPerInstance = (o.geometry.index ? o.geometry.index.count : (o.geometry.attributes.position?.count ?? 0)) / 3;
  }

  private key(tx: number, tz: number) {
    return (tx + 512) * 1024 + (tz + 512);
  }

  private acquire(): Tile {
    const p = this.pool.pop();
    if (p) return p;
    const o = this.o;
    const geo = new THREE.InstancedBufferGeometry();
    for (const [name, attr] of Object.entries(o.geometry.attributes)) geo.setAttribute(name, attr);
    if (o.geometry.index) geo.setIndex(o.geometry.index);
    const mk = (name: string) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(o.capacity * 4), 4);
      a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
      return a;
    };
    const attrs = [mk('aBase'), mk('aShape'), mk('aTint')];
    geo.instanceCount = 0;
    geo.boundingSphere = new THREE.Sphere();
    const mesh = new THREE.Mesh(geo, o.material);
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = true;
    mesh.castShadow = false;
    mesh.receiveShadow = o.receiveShadow;
    mesh.raycast = () => {};
    mesh.visible = false;
    this.group.add(mesh);
    return { key: -1, tx: 0, tz: 0, mesh, geo, count: 0, x0: 0, z0: 0, ymin: 0, ymax: 0, attrs };
  }

  private fill(t: Tile, tx: number, tz: number) {
    const o = this.o;
    this.buf.ymin = Infinity;
    this.buf.ymax = -Infinity;
    const n = Math.min(o.generate(tx, tz, this.buf), o.capacity);
    t.tx = tx;
    t.tz = tz;
    t.key = this.key(tx, tz);
    t.count = n;
    t.x0 = tx * o.tileSize;
    t.z0 = tz * o.tileSize;
    t.ymin = n > 0 ? this.buf.ymin : 0;
    t.ymax = n > 0 ? this.buf.ymax : 0;
    const dst = [t.attrs[0]!, t.attrs[1]!, t.attrs[2]!];
    const src = [this.buf.base, this.buf.shape, this.buf.tint];
    for (let i = 0; i < 3; i++) {
      const a = dst[i]!;
      (a.array as Float32Array).set(src[i]!.subarray(0, n * 4));
      a.clearUpdateRanges();
      a.addUpdateRange(0, Math.max(1, n * 4));
      a.needsUpdate = true;
    }
    const centerOffset = o.tileSize / 2;
    const half = centerOffset + (o.maxRadius ?? 0.4);
    const cy = (t.ymin + t.ymax + o.maxHeight) / 2;
    const ry = (t.ymax + o.maxHeight - t.ymin) / 2;
    const r = Math.hypot(half, half, ry) + 0.2;
    t.geo.boundingSphere!.set(new THREE.Vector3(t.x0 + centerOffset, cy, t.z0 + centerOffset), r);
  }

  private release(t: Tile) {
    this.tiles.delete(t.key);
    t.mesh.visible = false;
    t.geo.instanceCount = 0;
    t.count = 0;
    this.pool.push(t);
  }

  private distTo(t: { x0: number; z0: number; ymin: number; ymax: number }, c: THREE.Vector3): number {
    const s = this.o.tileSize;
    const dx = Math.max(t.x0 - c.x, 0, c.x - (t.x0 + s));
    const dz = Math.max(t.z0 - c.z, 0, c.z - (t.z0 + s));
    // The shader's density rule measures the anchor, not the blade tip. Geometry displacement belongs
    // in the frustum bound only; extending this interval by blade height submits needless far patches.
    const lo = t.ymin;
    const hi = t.ymax;
    const dy = Math.max(lo - c.y, 0, c.y - hi);
    return Math.hypot(dx, dy, dz);
  }

  update(cam: THREE.Vector3) {
    if (this.disposed) return;
    const o = this.o;
    if (!this.enabled) {
      this.group.visible = false;
      this.visibleInstances = this.visibleTriangles = this.drawCalls = 0;
      return;
    }
    this.group.visible = true;
    const T = o.tileSize;
    // Two complete rings buy generation time before an anchor enters the visible fade. Streaming uses
    // horizontal distance: high terrain must not be released and immediately regenerated every frame.
    const reach = o.fadeEnd + T * 2;
    const tx0 = Math.floor((cam.x - reach) / T);
    const tx1 = Math.floor((cam.x + reach) / T);
    const tz0 = Math.floor((cam.z - reach) / T);
    const tz1 = Math.floor((cam.z + reach) / T);

    // Drop tiles that are far behind us (hysteresis keeps a border from thrashing).
    const drop = reach + T * 1.5;
    for (const t of this.tiles.values()) {
      if (tileHorizontalDistance(t.x0, t.z0, T, cam) > drop) this.release(t);
    }

    // Build the missing tiles the camera can see, nearest first.
    const want = this.wantList;
    want.length = 0;
    for (let tz = tz0; tz <= tz1; tz++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (this.tiles.has(this.key(tx, tz))) continue;
        const d = tileHorizontalDistance(tx * T, tz * T, T, cam);
        if (d < reach) want.push({ tx, tz, d });
      }
    }
    if (want.length) {
      want.sort((a, b) => a.d - b.d);
      const cap = this.first ? want.length : Math.max(1, Math.round(2 * this.buildRate));
      // Teleports and large camera moves may outrun preloading. Never leave a hole inside the shader's
      // visible radius merely to meet an incremental-build quota; only the unseen reserve is throttled.
      for (let i = 0; i < want.length && (i < cap || want[i]!.d < o.fadeEnd); i++) {
        const w = want[i]!;
        const t = this.acquire();
        this.fill(t, w.tx, w.tz);
        this.tiles.set(t.key, t);
      }
      this.first = false;
    }

    // Set every tile's instance count from the camera distance and show only what could be on screen.
    let inst = 0;
    let draws = 0;
    for (const t of this.tiles.values()) {
      const d = this.distTo(t, cam);
      const q = Math.pow(1 - smoothstep(o.fadeStart, o.fadeEnd, d), o.power);
      // gKeep = smoothstep(0,.12,gQ-rank) has zero coverage when rank >= gQ. The nearest anchor
      // interval is conservative for every patch, so no extra .12 rank tail needs to be submitted.
      const limit = q + 1e-6;
      // Binary search: first instance whose rank >= limit.
      const base = t.attrs[0]!.array as Float32Array;
      let lo = 0;
      let hi = t.count;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (base[mid * 4 + 3]! < limit) lo = mid + 1;
        else hi = mid;
      }
      const n = q <= 0 ? 0 : lo;
      t.geo.instanceCount = n;
      t.mesh.visible = n > 0;
      if (n > 0) {
        // Counters include tiles three.js will frustum-cull, so they are an upper bound.
        inst += n;
        draws++;
      }
    }
    this.visibleInstances = inst;
    this.visibleTriangles = inst * this.trisPerInstance;
    this.drawCalls = draws;
    this.activeTiles = this.tiles.size;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const t of this.tiles.values()) this.pool.push(t);
    this.tiles.clear();
    for (const t of this.pool) {
      t.mesh.removeFromParent();
      t.geo.dispose();
    }
    this.pool.length = 0;
    this.o.geometry.dispose();
    this.o.material.dispose();
  }
}

/** Distance to an entire tile footprint; using its center can remove patches still visible at the near edge. */
export function tileHorizontalDistance(x0: number, z0: number, size: number, cam: Pick<THREE.Vector3, 'x' | 'z'>): number {
  return Math.hypot(Math.max(x0 - cam.x, 0, cam.x - x0 - size), Math.max(z0 - cam.z, 0, cam.z - z0 - size));
}
