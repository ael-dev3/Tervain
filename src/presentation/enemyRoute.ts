import type { Colliders } from '../world/colliders';
import type { V2 } from '../world/layout';
import type { NavGrid } from '../world/nav';
import type { Terrain } from '../world/terrain';

type RouteWorld = { terrain: Terrain; colliders: Colliders; nav?: NavGrid };

/** Validate the whole capsule route, including a low fence and a sudden drop between grid centres. */
function clearLeg(from: V2, to: V2, ctx: RouteWorld, radius: number, height: number): boolean {
  let previous = from, y = ctx.terrain.groundAt(from.x, from.z);
  if (!Number.isFinite(y)) return false;
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / .3));
  for (let i = 1; i <= steps; i++) {
    const p = { x: from.x + (to.x - from.x) * i / steps, z: from.z + (to.z - from.z) * i / steps };
    const ny = ctx.terrain.groundAt(p.x, p.z);
    if (!Number.isFinite(ny) || !ctx.terrain.walkable(p.x, p.z, 1) || Math.abs(ny - y) > .3) return false;
    if (ctx.colliders.cast(previous.x, previous.z, p.x, p.z, radius, undefined,
      { minY: Math.min(y, ny) + .02, maxY: Math.max(y, ny) + height }, [], true)) return false;
    previous = p; y = ny;
  }
  return true;
}

/** Hostiles share the authored walkable grid instead of endlessly running into a tree on a straight chase. */
export class EnemyRoute {
  private path: V2[] | null = null;
  private index = 0;
  private target: V2 | null = null;
  private version = -1;
  private retry = 0;
  private lineRefresh = 0;
  private blockedFor = 0;

  reset() {
    this.path = null; this.target = null; this.index = 0; this.retry = 0; this.lineRefresh = 0; this.blockedFor = 0;
  }

  resolved(travel: number, expected: number, dt: number) {
    this.blockedFor = expected > 1e-5 && travel < expected * .15 ? this.blockedFor + dt : 0;
  }

  waypoint(from: V2, to: V2, dt: number, ctx: RouteWorld, radius: number, height: number): V2 | null {
    // Small test/preview worlds without a navigation grid retain direct steering and swept contacts.
    if (!ctx.nav) return to;
    this.retry = Math.max(0, this.retry - dt);
    this.lineRefresh = Math.max(0, this.lineRefresh - dt);
    const movedTarget = !this.target || Math.hypot(to.x - this.target.x, to.z - this.target.z) > 1.5;
    const changed = this.version !== ctx.colliders.version;
    if (changed || this.retry === 0 && (movedTarget || this.blockedFor > .6 || !this.path)) {
      this.target = { ...to }; this.version = ctx.colliders.version;
      this.index = 0; this.retry = .75; this.blockedFor = 0;
      const nav = ctx.nav.forRadius?.(radius) ?? ctx.nav;
      this.path = clearLeg(from, to, ctx, radius, height) ? [{ ...to }] : nav.findPath(from, to);
      // A* cells can land near a counter/wall. Keep only physically reachable legs; retry a null route later.
      if (this.path) {
        let previous = from;
        for (let i = 0; i < this.path.length; i++) {
          const p = this.path[i]!;
          if (!clearLeg(previous, p, ctx, radius, height)) { this.path = i > 0 ? this.path.slice(0, i) : null; break; }
          previous = p;
        }
      }
    }
    while (this.path && this.index < this.path.length && Math.hypot(from.x - this.path[this.index]!.x, from.z - this.path[this.index]!.z) < .12) this.index++;
    if (!this.path || this.index >= this.path.length) {
      this.path = null;
      return null;
    }
    // A clear last leg follows the player's small movements without continuously allocating A* searches.
    if (this.index === this.path.length - 1 && this.target && this.lineRefresh === 0
      && Math.hypot(to.x - this.target.x, to.z - this.target.z) > .25) {
      this.lineRefresh = .2;
      if (clearLeg(from, to, ctx, radius, height)) {
        this.path[this.index] = { ...to };
        this.target = { ...to };
      }
    }
    return this.path[this.index]!;
  }
}
