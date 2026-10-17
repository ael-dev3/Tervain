import type * as THREE from 'three';
import type { GrassMover } from '../grass/trample';
import { FOLIAGE_MAX_MOVERS, type FoliageField } from './foliageWind';

type Candidate = { x: number; z: number; radius: number; centre: number; d: number };

/** Borrowed scratch space owned by one world; stable nearest-six ordering. */
export class FoliageMoverSelection {
  private readonly nearest: Candidate[] = Array.from({ length: FOLIAGE_MAX_MOVERS }, () => ({ x: 0, z: 0, radius: 0, centre: 0, d: 0 }));
  private count = 0;

  update(focus: THREE.Vector3, movers: readonly GrassMover[], terrain: { heightAt(x: number, z: number): number }, field: FoliageField) {
    this.count = 0;
    const heroLift = Math.max(0, focus.y - terrain.heightAt(focus.x, focus.z));
    this.consider(focus.x, focus.z, .75, 1 + heroLift, Math.hypot(focus.x - focus.x, focus.z - focus.z));
    for (const mover of movers) this.consider(mover.x, mover.z, mover.radius * 1.4, Math.max(.5, mover.radius * 1.2), Math.hypot(mover.x - focus.x, mover.z - focus.z));
    for (let i = 0; i < this.count; i++) {
      const m = this.nearest[i]!;
      field.movers.value[i]!.set(m.x, terrain.heightAt(m.x, m.z) + m.centre, m.z, m.radius);
    }
    field.moverCount.value = this.count;
  }

  private consider(x: number, z: number, radius: number, centre: number, d: number) {
    if (!(d < 40 && Number.isFinite(x) && Number.isFinite(z) && Number.isFinite(radius))) return;
    let at = 0;
    // Insert after equal distances, preserving the old stable-sort input order.
    while (at < this.count && this.nearest[at]!.d <= d) at++;
    if (at === FOLIAGE_MAX_MOVERS) return;
    const last = Math.min(this.count, FOLIAGE_MAX_MOVERS - 1);
    for (let i = last; i > at; i--) Object.assign(this.nearest[i]!, this.nearest[i - 1]!);
    const slot = this.nearest[at]!;
    slot.x = x; slot.z = z; slot.radius = radius; slot.centre = centre; slot.d = d;
    this.count = Math.min(this.count + 1, FOLIAGE_MAX_MOVERS);
  }
}
