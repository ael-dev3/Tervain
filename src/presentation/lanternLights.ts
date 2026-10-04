import { smoothstep } from '../world/noise';

interface LanternPosition { x: number; y: number; z: number }

export interface LanternLightSlot {
  source: number | null;
  strength: number;
}

/** Three local lights retain their lamp identities and dim before a slot changes lamps. */
export class LanternLightPool {
  readonly slots: LanternLightSlot[];

  constructor(capacity = 3) {
    this.slots = Array.from({ length: capacity }, () => ({ source: null, strength: 0 }));
  }

  update(dt: number, positions: readonly LanternPosition[], focus: LanternPosition) {
    const occupied = new Set(this.slots.map(slot => slot.source));
    const candidates = positions.map((p, source) => {
      const distance = Math.hypot(p.x - focus.x, p.y - focus.y, p.z - focus.z);
      // A small preference for resident lamps avoids swapping a bright pair at their distance tie.
      return { source, distance, rank: distance - (occupied.has(source) ? 3 : 0) };
    }).filter(p => p.distance < 40).sort((a, b) => a.rank - b.rank || a.source - b.source).slice(0, this.slots.length);
    const desired = new Map(candidates.map(p => [p.source, 1 - smoothstep(28, 40, p.distance)]));
    const blend = 1 - Math.exp(-Math.max(0, Number.isFinite(dt) ? dt : 0) * 7);
    for (const slot of this.slots) {
      const target = slot.source === null ? 0 : desired.get(slot.source) ?? 0;
      slot.strength += (target - slot.strength) * blend;
      // Even at full night this last residue contributes under 0.036 light intensity.
      // Clear it before moving the PointLight; never interpolate a light through empty air.
      if (slot.strength < 0.003 && target === 0) {
        slot.source = null;
        slot.strength = 0;
      }
    }
    const assigned = new Set(this.slots.map(slot => slot.source));
    for (const slot of this.slots) {
      if (slot.source !== null) continue;
      const next = candidates.find(p => !assigned.has(p.source));
      if (!next) break;
      slot.source = next.source;
      assigned.add(next.source);
      // The new lamp starts dark, so a source reassignment cannot create a bright position jump.
    }
    return this.slots;
  }
}
