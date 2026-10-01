import { ARCHIVE_ROOM, ARCHIVE_SHUTTER, BUILDINGS, DECKS, HANDCART_CONSTRUCTION, LIGHTHOUSE, LIGHTHOUSE_CONSTRUCTION, PALISADE, SHORTCUT, WAGON, WAGON_CONSTRUCTION, WORLD, bySpec, type BuildingSpec } from './layout';
import { LIGHTHOUSE_STAIR_ANGLE, lighthouseTreadTop } from './lighthouse';
import type { Terrain } from './terrain';

/** Absolute vertical bounds are optional: old callers keep their ground-plane collision contract. */
export interface VerticalBounds {
  minY?: number;
  maxY?: number;
}
export interface ColliderBounds extends VerticalBounds {
  /** Authored standing planks block a rising head/camera, while Terrain owns steps and landing. */
  supportOnly?: boolean;
}
/** Simple collision shapes on the ground plane. Trunks block movement; most leaves do not. */
export interface CircleCollider extends ColliderBounds {
  id: string;
  kind: 'circle';
  x: number;
  z: number;
  r: number;
  active: boolean;
}
export interface BoxCollider extends ColliderBounds {
  id: string;
  kind: 'box';
  x: number;
  z: number;
  hw: number;
  hd: number;
  yaw: number;
  active: boolean;
}
export type Collider = CircleCollider | BoxCollider;

export interface ColliderHit {
  t: number;
  x: number;
  z: number;
  nx: number;
  nz: number;
  collider: Collider;
}

const CELL = 8;
const CONTACT_EPS = 1e-7;
const SKIN = 1e-4;

const overlapsHeight = (c: Collider, bounds?: VerticalBounds) => !bounds ||
  (bounds.maxY ?? Infinity) > (c.minY ?? -Infinity) + CONTACT_EPS &&
  (bounds.minY ?? -Infinity) < (c.maxY ?? Infinity) - CONTACT_EPS;

/** Exact segment/disc contact. The normal points out of the obstacle. */
function circleHit(ax: number, az: number, dx: number, dz: number, cx: number, cz: number, r: number): { t: number; nx: number; nz: number } | null {
  const ox = ax - cx;
  const oz = az - cz;
  const a = dx * dx + dz * dz;
  const d = Math.hypot(ox, oz);
  if (d < r - CONTACT_EPS) return { t: 0, nx: d > CONTACT_EPS ? ox / d : 1, nz: d > CONTACT_EPS ? oz / d : 0 };
  if (a < CONTACT_EPS * CONTACT_EPS) return null;
  const b = ox * dx + oz * dz;
  const discriminant = b * b - a * (ox * ox + oz * oz - r * r);
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(Math.max(0, discriminant))) / a;
  if (t < -CONTACT_EPS || t > 1 + CONTACT_EPS) return null;
  const nx = (ox + dx * t) / r;
  const nz = (oz + dz * t) / r;
  // Touching a face and moving parallel/outwards must not pin the controller there.
  if (dx * nx + dz * nz >= -CONTACT_EPS) return null;
  return { t: Math.max(0, Math.min(1, t)), nx, nz };
}

/** Exact sweep of a disc against a box, including its rounded expanded corners. */
function boxHit(c: BoxCollider, ax: number, az: number, dx: number, dz: number, radius: number): { t: number; nx: number; nz: number } | null {
  const cos = Math.cos(c.yaw);
  const sin = Math.sin(c.yaw);
  const lx = (ax - c.x) * cos - (az - c.z) * sin;
  const lz = (ax - c.x) * sin + (az - c.z) * cos;
  const vx = dx * cos - dz * sin;
  const vz = dx * sin + dz * cos;
  let nearest: { t: number; nx: number; nz: number } | null = null;
  const consider = (t: number, nx: number, nz: number) => {
    if (t < -CONTACT_EPS || t > 1 + CONTACT_EPS || vx * nx + vz * nz >= -CONTACT_EPS) return;
    if (!nearest || t < nearest.t) nearest = { t: Math.max(0, Math.min(1, t)), nx, nz };
  };
  // Interior starts are needed by line of sight; movement depenetrates before casting.
  const qx = Math.max(-c.hw, Math.min(c.hw, lx));
  const qz = Math.max(-c.hd, Math.min(c.hd, lz));
  const ox = lx - qx;
  const oz = lz - qz;
  const dist = Math.hypot(ox, oz);
  if (dist < radius - CONTACT_EPS || (Math.abs(lx) < c.hw && Math.abs(lz) < c.hd)) {
    if (dist > CONTACT_EPS) nearest = { t: 0, nx: ox / dist, nz: oz / dist };
    else if (c.hw - Math.abs(lx) < c.hd - Math.abs(lz)) nearest = { t: 0, nx: Math.sign(lx || 1), nz: 0 };
    else nearest = { t: 0, nx: 0, nz: Math.sign(lz || 1) };
  }
  for (const side of [-1, 1]) {
    if (Math.abs(vx) > CONTACT_EPS) {
      const t = (side * (c.hw + radius) - lx) / vx;
      if (Math.abs(lz + vz * t) <= c.hd + CONTACT_EPS) consider(t, side, 0);
    }
    if (Math.abs(vz) > CONTACT_EPS) {
      const t = (side * (c.hd + radius) - lz) / vz;
      if (Math.abs(lx + vx * t) <= c.hw + CONTACT_EPS) consider(t, 0, side);
    }
  }
  if (radius > 0) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const hit = circleHit(lx, lz, vx, vz, sx * c.hw, sz * c.hd, radius);
    if (hit && sx * (lx + vx * hit.t) >= c.hw - CONTACT_EPS && sz * (lz + vz * hit.t) >= c.hd - CONTACT_EPS) consider(hit.t, hit.nx, hit.nz);
  }
  if (!nearest) return null;
  const hit = nearest as { t: number; nx: number; nz: number };
  return { t: hit.t, nx: hit.nx * cos + hit.nz * sin, nz: -hit.nx * sin + hit.nz * cos };
}

export class Colliders {
  readonly all: Collider[] = [];
  private byId = new Map<string, Collider[]>();
  private grid = new Map<number, Collider[]>();
  version = 0;

  private key(cx: number, cz: number) {
    return (cx + 512) * 4096 + (cz + 512);
  }

  private extent(c: Collider) {
    return c.kind === 'circle' ? c.r : Math.hypot(c.hw, c.hd);
  }

  add(c: Collider) {
    this.all.push(c);
    const list = this.byId.get(c.id) ?? [];
    list.push(c);
    this.byId.set(c.id, list);
    const e = this.extent(c);
    const x0 = Math.floor((c.x - e) / CELL);
    const x1 = Math.floor((c.x + e) / CELL);
    const z0 = Math.floor((c.z - e) / CELL);
    const z1 = Math.floor((c.z + e) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const k = this.key(cx, cz);
        const bucket = this.grid.get(k);
        if (bucket) bucket.push(c);
        else this.grid.set(k, [c]);
      }
    }
  }

  circle(id: string, x: number, z: number, r: number, active = true, bounds: ColliderBounds = {}) {
    this.add({ id, kind: 'circle', x, z, r, active, ...bounds });
  }

  box(id: string, x: number, z: number, hw: number, hd: number, yaw = 0, active = true, bounds: ColliderBounds = {}) {
    this.add({ id, kind: 'box', x, z, hw, hd, yaw, active, ...bounds });
  }

  setActive(id: string, active: boolean) {
    const list = this.byId.get(id);
    if (!list) return;
    let changed = false;
    for (const c of list) {
      if (c.active !== active) {
        c.active = active;
        changed = true;
      }
    }
    if (changed) this.version++;
  }

  isActive(id: string): boolean {
    return this.byId.get(id)?.some((c) => c.active) ?? false;
  }

  /** Colliders whose grid cells overlap the disc around (x, z). */
  near(x: number, z: number, r: number): Collider[] {
    const out: Collider[] = [];
    const seen = new Set<Collider>();
    const x0 = Math.floor((x - r) / CELL);
    const x1 = Math.floor((x + r) / CELL);
    const z0 = Math.floor((z - r) / CELL);
    const z1 = Math.floor((z + r) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const bucket = this.grid.get(this.key(cx, cz));
        if (!bucket) continue;
        for (const c of bucket) {
          if (c.active && !seen.has(c)) {
            seen.add(c);
            out.push(c);
          }
        }
      }
    }
    return out;
  }

  /** Push a circle out of any overlapping collider. Returns the corrected position. */
  resolve(x: number, z: number, radius: number, ignore?: string, bounds?: VerticalBounds, extra: readonly Collider[] = []): { x: number; z: number; hit: boolean } {
    let px = x;
    let pz = z;
    let hit = false;
    for (let iter = 0; iter < 8; iter++) {
      let moved = false;
      for (const c of [...this.near(px, pz, radius + 1), ...extra]) {
        if (!c.active || c.supportOnly) continue;
        if ((ignore && c.id === ignore) || !overlapsHeight(c, bounds)) continue;
        if (c.kind === 'circle') {
          const dx = px - c.x;
          const dz = pz - c.z;
          const d = Math.hypot(dx, dz);
          const min = c.r + radius;
          if (d < min) {
            const nx = d > 1e-5 ? dx / d : 1;
            const nz = d > 1e-5 ? dz / d : 0;
            px = c.x + nx * min;
            pz = c.z + nz * min;
            moved = true;
          }
        } else {
          const cos = Math.cos(c.yaw);
          const sin = Math.sin(c.yaw);
          const dx = px - c.x;
          const dz = pz - c.z;
          const lx = dx * cos - dz * sin;
          const lz = dx * sin + dz * cos;
          const cx = Math.max(-c.hw, Math.min(c.hw, lx));
          const cz = Math.max(-c.hd, Math.min(c.hd, lz));
          let ox = lx - cx;
          let oz = lz - cz;
          let d = Math.hypot(ox, oz);
          if (d < radius) {
            if (d < 1e-5) {
              // Centre inside the box: exit through the nearest face.
              const penX = c.hw - Math.abs(lx);
              const penZ = c.hd - Math.abs(lz);
              if (penX < penZ) {
                ox = Math.sign(lx || 1);
                oz = 0;
                d = -penX;
              } else {
                ox = 0;
                oz = Math.sign(lz || 1);
                d = -penZ;
              }
            } else {
              ox /= d;
              oz /= d;
            }
            const push = radius - d;
            const nlx = lx + ox * push;
            const nlz = lz + oz * push;
            px = c.x + nlx * cos + nlz * sin;
            pz = c.z - nlx * sin + nlz * cos;
            moved = true;
          }
        }
      }
      if (!moved) break;
      hit = true;
    }
    return { x: px, z: pz, hit };
  }

  private overlapsDisc(c: Collider, x: number, z: number, radius: number): boolean {
    if (c.kind === 'circle') return Math.hypot(x - c.x, z - c.z) < c.r + radius - CONTACT_EPS;
    const cos = Math.cos(c.yaw);
    const sin = Math.sin(c.yaw);
    const lx = (x - c.x) * cos - (z - c.z) * sin;
    const lz = (x - c.x) * sin + (z - c.z) * cos;
    if (Math.abs(lx) < c.hw && Math.abs(lz) < c.hd) return true;
    return Math.hypot(Math.max(0, Math.abs(lx) - c.hw), Math.max(0, Math.abs(lz) - c.hd)) < radius - CONTACT_EPS;
  }

  blocked(x: number, z: number, radius: number, bounds?: VerticalBounds): boolean {
    return this.near(x, z, radius).some((c) => !c.supportOnly && overlapsHeight(c, bounds) && this.overlapsDisc(c, x, z, radius));
  }

  /** A rising body meets the underside of a finite overhead volume, rather than jumping through its roof. */
  ceilingAt(x: number, z: number, radius: number, fromTop: number, toTop: number): number | null {
    let ceiling: number | null = null;
    if (toTop <= fromTop) return null;
    for (const c of this.near(x, z, radius)) {
      if (c.minY === undefined || c.minY < fromTop - CONTACT_EPS || c.minY > toTop) continue;
      if (this.overlapsDisc(c, x, z, radius)) ceiling = Math.min(ceiling ?? Infinity, c.minY);
    }
    return ceiling;
  }

  /** Earliest exact horizontal segment/disc hit, independent of step size or box rotation. */
  cast(ax: number, az: number, bx: number, bz: number, radius = 0, ignoreIds?: ReadonlySet<string>, bounds?: VerticalBounds, extra: readonly Collider[] = [], excludeSupports = false): ColliderHit | null {
    const dx = bx - ax;
    const dz = bz - az;
    let nearest: ColliderHit | null = null;
    for (const c of [...this.near((ax + bx) / 2, (az + bz) / 2, Math.hypot(dx, dz) / 2 + radius), ...extra]) {
      if (!c.active || excludeSupports && c.supportOnly) continue;
      if (ignoreIds?.has(c.id) || !overlapsHeight(c, bounds)) continue;
      const hit = c.kind === 'circle'
        ? circleHit(ax, az, dx, dz, c.x, c.z, c.r + radius)
        : boxHit(c, ax, az, dx, dz, radius);
      if (hit && (!nearest || hit.t < nearest.t)) nearest = { ...hit, x: ax + dx * hit.t, z: az + dz * hit.t, collider: c };
    }
    return nearest;
  }

  /** Swept movement with contact-plane sliding. Never resolves an endpoint on the far side of a thin wall. */
  move(ax: number, az: number, dx: number, dz: number, radius: number, ignore?: string, bounds?: VerticalBounds, extra: readonly Collider[] = []): { x: number; z: number; hit: boolean; normals: { x: number; z: number }[] } {
    const start = this.resolve(ax, az, radius, ignore, bounds, extra);
    let x = start.x;
    let z = start.z;
    let rx = dx;
    let rz = dz;
    const normals: { x: number; z: number }[] = [];
    const ignoreIds = ignore ? new Set([ignore]) : undefined;
    for (let i = 0; i < 6 && Math.hypot(rx, rz) > CONTACT_EPS; i++) {
      const contact = this.cast(x, z, x + rx, z + rz, radius, ignoreIds, bounds, extra, true);
      if (!contact) { x += rx; z += rz; break; }
      x = contact.x + contact.nx * SKIN;
      z = contact.z + contact.nz * SKIN;
      normals.push({ x: contact.nx, z: contact.nz });
      rx *= 1 - contact.t;
      rz *= 1 - contact.t;
      const inward = rx * contact.nx + rz * contact.nz;
      if (inward < 0) { rx -= contact.nx * inward; rz -= contact.nz * inward; }
    }
    const end = this.resolve(x, z, radius, ignore, bounds, extra);
    return { x: end.x, z: end.z, hit: start.hit || end.hit || normals.length > 0, normals };
  }

  /** Exact sight line query: narrow fences, endpoints and rotated walls cannot fall between samples. */
  segmentBlocked(ax: number, az: number, bx: number, bz: number, ignoreIds?: ReadonlySet<string>): boolean {
    return this.cast(ax, az, bx, bz, 0, ignoreIds) !== null;
  }

}

/** Connected body, wheels and low drawbars share the dimensions used to construct the cart mesh. */
export function addCartColliders(c: Colliders, id: string, x: number, z: number, yaw: number, kind: 'wagon' | 'handcart', base?: number) {
  const spec = kind === 'wagon' ? WAGON_CONSTRUCTION : HANDCART_CONSTRUCTION;
  const bounds = (min: number, max: number): VerticalBounds => base === undefined ? {} : { minY: base + min, maxY: base + max };
  c.box(id, x, z, spec.length / 2 + 0.12, spec.wheelTrack + spec.wheelRadius * 0.285 + 0.015, yaw, true, bounds(0, spec.sideTop + 0.1));
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
    const a = spec.shaftStart + i * (spec.shaftEnd - spec.shaftStart) / 6;
    const b = spec.shaftStart + (i + 1) * (spec.shaftEnd - spec.shaftStart) / 6;
    const f0 = i / 6, f1 = (i + 1) / 6;
    const za = side * spec.shaftZ * (1 - 0.22 * f0), zb = side * spec.shaftZ * (1 - 0.22 * f1);
    const lx = (a + b) / 2, lz = (za + zb) / 2;
    const high = spec.shaftStartY + (spec.shaftEndY - spec.shaftStartY) * f0 + 0.07;
    const low = spec.shaftStartY + (spec.shaftEndY - spec.shaftStartY) * f1 - 0.07;
    c.box(`${id}-shafts`, x + lx * cos + lz * sin, z - lx * sin + lz * cos,
      Math.hypot(b - a, zb - za) / 2 + 0.035, 0.075, yaw - Math.atan2(zb - za, b - a), true, bounds(low, high));
  }
  const crossX = spec.shaftEnd - 0.24;
  c.box(`${id}-shaft-crossbar`, x + crossX * cos, z - crossX * sin, 0.05, spec.shaftZ * 0.78 + 0.05, yaw, true,
    bounds(spec.shaftEndY - 0.005, spec.shaftEndY + 0.085));
}

/** The stockade as collision boxes [x, z, halfLength, yaw] in runs of about 3 m, with a gap left for the gate. */
export function palisadeBoxes(): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const pts = PALISADE.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / len;
    const dz = (b.z - a.z) / len;
    for (let c0 = 0; c0 < len; c0 += 3) {
      const c1 = Math.min(len, c0 + 3);
      const mx = a.x + (dx * (c0 + c1)) / 2;
      const mz = a.z + (dz * (c0 + c1)) / 2;
      if (mz > PALISADE.gate.z0 - 0.4 && mz < PALISADE.gate.z1 + 0.4) continue;
      out.push([mx, mz, (c1 - c0) / 2, Math.atan2(dx, dz)]);
    }
  }
  return out;
}

function wallBox(c: Colliders, id: string, b: BuildingSpec, lx0: number, lx1: number, lz0: number, lz1: number, activeId = id) {
  // local rectangle -> world box
  const cx = (lx0 + lx1) / 2;
  const cz = (lz0 + lz1) / 2;
  const cos = Math.cos(b.yaw);
  const sin = Math.sin(b.yaw);
  c.box(activeId, b.x + cx * cos + cz * sin, b.z - cx * sin + cz * cos, (lx1 - lx0) / 2, (lz1 - lz0) / 2, b.yaw);
  void id;
}

/** Static and dynamic colliders authored with the layout. Vegetation and props add their own. */
export function buildStaticColliders(terrain?: Pick<Terrain, 'heightAt'>): Colliders {
  const c = new Colliders();
  for (const b of BUILDINGS) {
    if (b.kind === 'archive') {
      const hw = b.w / 2;
      const hd = b.d / 2;
      const { wallThickness: t, doorHalfWidth: gap, shutterHalfWidth: sw } = ARCHIVE_ROOM;
      // south (front) wall with door gap
      wallBox(c, 'archive_wall', b, -hw, -gap, hd - t, hd + t);
      wallBox(c, 'archive_wall', b, gap, hw, hd - t, hd + t);
      // north wall with shutter gap
      wallBox(c, 'archive_wall', b, -hw, -sw, -hd - t, -hd + t);
      wallBox(c, 'archive_wall', b, sw, hw, -hd - t, -hd + t);
      // side walls
      wallBox(c, 'archive_wall', b, -hw - t, -hw + t, -hd, hd);
      wallBox(c, 'archive_wall', b, hw - t, hw + t, -hd, hd);
      // dynamic: door and shutter fill the openings until opened
      wallBox(c, 'archive_door', b, -gap, gap, hd - t, hd + t, 'archive_door');
      wallBox(c, 'archive_shutter', b, -sw, sw, -hd - t, -hd + t, 'archive_shutter');
    } else {
      c.box(`b:${b.id}`, b.x, b.z, b.w / 2, b.d / 2, b.yaw);
    }
  }
  // The mill wheel and its pit sit against the mill's east wall.
  const mill = bySpec('mill');
  c.box('mill_pit', mill.x + mill.w / 2 + 1.5, mill.z, 1.6, 2.2, 0);
  // Bell tower base, well, wagon, quarry stacks and crates.
  c.circle('bell_tower', -1, 4, 1.5);
  c.circle('well', -6, 18, 1.5);
  const relativeBounds = (x: number, z: number, min: number, max: number): VerticalBounds => terrain
    ? { minY: terrain.heightAt(x, z) + min, maxY: terrain.heightAt(x, z) + max } : {};
  addCartColliders(c, 'wagon', WAGON.x, WAGON.z, WAGON.yaw, 'wagon', terrain?.heightAt(WAGON.x, WAGON.z));
  // Finite compound volumes let the stair pass above its connected keeper's house.
  const L = LIGHTHOUSE_CONSTRUCTION;
  const lb = (min: number, max: number) => relativeBounds(LIGHTHOUSE.x, LIGHTHOUSE.z, min, max);
  c.circle('lighthouse', LIGHTHOUSE.x, LIGHTHOUSE.z, LIGHTHOUSE.r + 0.055, true, lb(-1, L.shaftTop));
  c.box('lighthouse-door', LIGHTHOUSE.x, LIGHTHOUSE.z + 3.55, 1.05, 0.18, 0, true, lb(L.house.wallBase, 2.92));
  c.box('lighthouse-house-door', LIGHTHOUSE.x + L.house.x - 0.65, LIGHTHOUSE.z + L.house.d / 2 + 0.23, 0.95, 0.2, 0, true, lb(L.house.wallBase, 2.9));
  c.circle('lighthouse-lantern', LIGHTHOUSE.x, LIGHTHOUSE.z, 2.78, true, lb(L.stairTop, L.stairTop + 4.9));
  c.box('lighthouse-house', LIGHTHOUSE.x + L.house.x, LIGHTHOUSE.z + L.house.z, L.house.w / 2, L.house.d / 2, 0, true, lb(-0.55, L.house.roofTop));
  for (const px of [-L.house.w / 2 + 0.3, L.house.w / 2 - 0.3]) {
    c.box('lighthouse-porch-post', LIGHTHOUSE.x + L.house.x + px, LIGHTHOUSE.z + L.house.z + L.house.d / 2 + 1.9, 0.12, 0.12, 0, true, lb(-0.55, 2.95));
  }
  c.box('lighthouse-porch-roof', LIGHTHOUSE.x + L.house.x, LIGHTHOUSE.z + L.house.d / 2 + 1, (L.house.w + 0.4) / 2, 0.95, 0, true, lb(2.75, 3.65));
  for (let i = 0; i < L.stairSteps; i++) {
    const a0 = L.stairStart + i * LIGHTHOUSE_STAIR_ANGLE;
    const a1 = a0 + LIGHTHOUSE_STAIR_ANGLE;
    const mid = (a0 + a1) / 2;
    const top = lighthouseTreadTop(i);
    const treadRadius = (L.stairInner + L.stairOuter) / 2;
    c.box('lighthouse-stair-plank', LIGHTHOUSE.x + treadRadius * Math.cos(mid), LIGHTHOUSE.z + treadRadius * Math.sin(mid),
      (L.stairOuter - L.stairInner) / 2, L.stairOuter * Math.sin(LIGHTHOUSE_STAIR_ANGLE / 2), -mid, true,
      { ...lb(top - L.treadThickness, top), supportOnly: true });
    const rr = L.stairOuter - 0.02;
    const ax = LIGHTHOUSE.x + rr * Math.cos(a0), az = LIGHTHOUSE.z + rr * Math.sin(a0);
    const bx = LIGHTHOUSE.x + rr * Math.cos(a1), bz = LIGHTHOUSE.z + rr * Math.sin(a1);
    c.box('lighthouse-stair-rail', (ax + bx) / 2, (az + bz) / 2, 0.06, Math.hypot(bx - ax, bz - az) / 2 + 0.012, Math.atan2(bx - ax, bz - az), true, lb(top + 0.4, top + L.railHeight + 0.055));
    if (i % 4 === 0) c.circle('lighthouse-stair-post', LIGHTHOUSE.x + rr * Math.cos(mid), LIGHTHOUSE.z + rr * Math.sin(mid), 0.065, true, lb(top - 0.1, top + L.railHeight + 0.055));
  }
  for (let i = 0; i < 32; i++) {
    const a0 = i * Math.PI * 2 / 32, a1 = (i + 1) * Math.PI * 2 / 32;
    const mid = (a0 + a1) / 2;
    const outer = mid >= L.galleryOpeningStart && mid < L.galleryOpeningEnd ? L.stairInner : L.galleryOuter;
    const floorRadius = (L.galleryInner + outer) / 2;
    c.box('lighthouse-gallery-plank', LIGHTHOUSE.x + floorRadius * Math.cos(mid), LIGHTHOUSE.z + floorRadius * Math.sin(mid),
      (outer - L.galleryInner) / 2, outer * Math.sin(Math.PI / 32), -mid, true,
      { ...lb(L.stairTop - 0.18, L.stairTop), supportOnly: true });
    const rr = L.galleryOuter - 0.02;
    const ax = LIGHTHOUSE.x + rr * Math.cos(a0), az = LIGHTHOUSE.z + rr * Math.sin(a0);
    const bx = LIGHTHOUSE.x + rr * Math.cos(a1), bz = LIGHTHOUSE.z + rr * Math.sin(a1);
    c.box('lighthouse-gallery-rail', (ax + bx) / 2, (az + bz) / 2, 0.065, Math.hypot(bx - ax, bz - az) / 2 + 0.012, Math.atan2(bx - ax, bz - az), true, lb(L.stairTop + 0.4, L.stairTop + L.railHeight + 0.06));
    if (i % 2 === 0) c.circle('lighthouse-gallery-post', (ax + bx) / 2, (az + bz) / 2, 0.065, true, lb(L.stairTop - 0.1, L.stairTop + L.railHeight + 0.06));
  }
  c.box('stack_a', 92, -16, 2.2, 1.4, 0.3);
  c.box('stack_b', 84, -32, 2.6, 1.6, -0.2);
  c.box('stack_c', 98, -26, 1.6, 1.6, 0.6);
  c.box('crates_a', 78, -24, 0.8, 0.8, 0.2);
  c.circle('altar', -14, -98, 1.0);
  for (const d of DECKS) {
    // Railings along both long sides of the deck.
    c.box(`${d.id}_rail_n`, d.x, d.z - d.hz - 0.05, d.hx - 0.4, 0.1, d.yaw, true, terrain ? { minY: d.y - 0.15, maxY: d.y + 1.15 } : {});
    c.box(`${d.id}_rail_s`, d.x, d.z + d.hz + 0.05, d.hx - 0.4, 0.1, d.yaw, true, terrain ? { minY: d.y - 0.15, maxY: d.y + 1.15 } : {});
  }
  // The fishing camp's stockade and its watch platform.
  for (const [x, z, hl, yaw] of palisadeBoxes()) c.box('palisade', x, z, 0.2, hl, yaw);
  c.box('watchtower', PALISADE.tower.x, PALISADE.tower.z, 1.6, 1.6, PALISADE.tower.yaw);
  // Sluice posts flank the gate.
  c.circle('sluice_post_w', 6.5, -57.6, 0.6);
  c.circle('sluice_post_e', 13.5, -58.5, 0.8);
  // Shortcut gate: closed until the maintenance lever is pulled.
  c.box('shortcut_gate', SHORTCUT.gate.x, SHORTCUT.gate.z, SHORTCUT.gate.hw + 0.9, SHORTCUT.gate.hd, SHORTCUT.gate.yaw);
  c.circle('shutter_pad', ARCHIVE_SHUTTER.x, ARCHIVE_SHUTTER.z + 4, 0.001, false);
  // Older authored shapes also get real vertical limits in the gameplay world; legacy callers remain compatible.
  if (terrain) for (const shape of c.all) {
    if (shape.minY !== undefined && shape.maxY !== undefined) continue;
    const b = shape.id.startsWith('b:') ? BUILDINGS.find((building) => `b:${building.id}` === shape.id) : undefined;
    const base = terrain.heightAt(shape.x, shape.z);
    const height = b ? b.h + Math.min(b.w, b.d) * 0.65 + 0.5
      : shape.id.startsWith('archive_') ? shape.id === 'archive_door' ? ARCHIVE_ROOM.doorHeight + 0.2 : shape.id === 'archive_shutter' ? ARCHIVE_ROOM.shutterTop : 6.1
      : shape.id === 'bell_tower' ? 8.5 : shape.id === 'watchtower' ? 6.3
      : shape.id === 'palisade' ? 3 : shape.id.endsWith('_rail_n') || shape.id.endsWith('_rail_s') ? 1.35
      : shape.id === 'well' ? 1.15 : shape.id === 'altar' ? 1.0
      : shape.id.startsWith('stack_') ? 2.5 : shape.id === 'crates_a' ? 1.6
      : shape.id === 'shortcut_gate' ? 2.4 : shape.id.startsWith('sluice_post') ? 3 : 2.2;
    shape.minY = base - 0.4;
    shape.maxY = base + height;
  }
  void WORLD;
  return c;
}
