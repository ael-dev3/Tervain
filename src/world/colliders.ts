import { ARCHIVE_ROOM, ARCHIVE_SHUTTER, BUILDINGS, DECKS, LIGHTHOUSE, PALISADE, SHORTCUT, WAGON, WORLD, bySpec, type BuildingSpec } from './layout';

/** Simple 2D collision shapes on the ground plane. Trunks block movement; most leaves do not. */
export interface CircleCollider {
  id: string;
  kind: 'circle';
  x: number;
  z: number;
  r: number;
  active: boolean;
}
export interface BoxCollider {
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

const CELL = 8;

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

  circle(id: string, x: number, z: number, r: number, active = true) {
    this.add({ id, kind: 'circle', x, z, r, active });
  }

  box(id: string, x: number, z: number, hw: number, hd: number, yaw = 0, active = true) {
    this.add({ id, kind: 'box', x, z, hw, hd, yaw, active });
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
  resolve(x: number, z: number, radius: number, ignore?: string): { x: number; z: number; hit: boolean } {
    let px = x;
    let pz = z;
    let hit = false;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const c of this.near(px, pz, radius + 1)) {
        if (ignore && c.id === ignore) continue;
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

  blocked(x: number, z: number, radius: number): boolean {
    const r = this.resolve(x, z, radius);
    return r.hit && Math.hypot(r.x - x, r.z - z) > 0.02;
  }

  /** Does the segment a→b pass through an active collider (used for sight lines and the camera)? */
  segmentBlocked(ax: number, az: number, bx: number, bz: number, ignoreIds?: ReadonlySet<string>): boolean {
    const len = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(2, Math.ceil(len / 0.6));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      for (const c of this.near(x, z, 0.3)) {
        if (ignoreIds?.has(c.id)) continue;
        if (c.kind === 'circle') {
          if (Math.hypot(x - c.x, z - c.z) < c.r) return true;
        } else {
          const cos = Math.cos(c.yaw);
          const sin = Math.sin(c.yaw);
          const dx = x - c.x;
          const dz = z - c.z;
          const lx = dx * cos - dz * sin;
          const lz = dx * sin + dz * cos;
          if (Math.abs(lx) < c.hw && Math.abs(lz) < c.hd) return true;
        }
      }
    }
    return false;
  }
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
export function buildStaticColliders(): Colliders {
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
  c.box('wagon', WAGON.x, WAGON.z, 2.6, 1.3, WAGON.yaw);
  // The lighthouse shaft. Its door faces south, onto the levelled ledge.
  c.circle('lighthouse', LIGHTHOUSE.x, LIGHTHOUSE.z, LIGHTHOUSE.r + 0.25);
  c.box('stack_a', 92, -16, 2.2, 1.4, 0.3);
  c.box('stack_b', 84, -32, 2.6, 1.6, -0.2);
  c.box('stack_c', 98, -26, 1.6, 1.6, 0.6);
  c.box('crates_a', 78, -24, 0.8, 0.8, 0.2);
  c.circle('altar', -14, -98, 1.0);
  for (const d of DECKS) {
    // Railings along both long sides of the deck.
    c.box(`${d.id}_rail_n`, d.x, d.z - d.hz - 0.05, d.hx - 0.4, 0.1, d.yaw);
    c.box(`${d.id}_rail_s`, d.x, d.z + d.hz + 0.05, d.hx - 0.4, 0.1, d.yaw);
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
  void WORLD;
  return c;
}
