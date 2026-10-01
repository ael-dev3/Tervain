import { afterAll, describe, expect, it, vi } from 'vitest';
import {
  GROVE_CUE,
  GROVE_DOOR_OPEN,
  GROVE_MAX_SPIRITS,
  GroveFormation,
  createMenuGrove,
  groveFormationAt,
  groveSpiritBand,
  type MenuGrove,
} from '../../src/presentation/menu/menuGrove';
import { menuBeatTime, menuPhraseTime, sampleMenuRhythm, forEachMenuAccent } from '../../src/presentation/menu/menuScoreRhythm';
import { menuGroveFixture } from './groveFixture';

const fixture = menuGroveFixture();
afterAll(() => fixture.dispose());
const grove = () => createMenuGrove(fixture.world, GROVE_MAX_SPIRITS);
const at = (g: MenuGrove, i: number) => [g.position[i * 3]!, g.position[i * 3 + 1]!, g.position[i * 3 + 2]!] as const;
const insideCount = (g: MenuGrove) => {
  let n = 0;
  for (let i = 0; i < g.count; i++) if (g.inHollow(...at(g, i))) n++;
  return n;
};

describe('the hermitage awakening simulation', () => {
  it('unlatches the heavy door at 30 s, knocks it against its stop, rests it there, and thumps it shut before the loop', () => {
    const g = grove();
    g.advanceTo(GROVE_CUE - 0.01);
    expect(g.awake).toBe(false);
    expect(g.doorAngle).toBe(0);
    g.advanceTo(30.5);
    expect(g.doorAngle).toBeGreaterThan(0);
    expect(g.doorAngle).toBeLessThan(GROVE_DOOR_OPEN * 0.6);
    let peak = 0;
    let rebound = false;
    for (let t = 30; t < 40; t += 0.02) {
      g.advanceTo(t);
      expect(g.doorAngle).toBeLessThanOrEqual(GROVE_DOOR_OPEN);
      if (peak > GROVE_DOOR_OPEN * 0.95 && g.doorAngle < peak - 0.02) rebound = true;
      peak = Math.max(peak, g.doorAngle);
    }
    expect(rebound).toBe(true);
    g.advanceTo(33.6);
    expect(g.doorAngle / GROVE_DOOR_OPEN).toBeGreaterThan(0.95);
    for (let t = 36; t < 211; t += 5) {
      g.advanceTo(t);
      expect(g.doorAngle).toBe(GROVE_DOOR_OPEN);
    }
    g.advanceTo(213.6);
    expect(g.doorAngle).toBeLessThan(0.01 * GROVE_DOOR_OPEN);
    g.advanceTo(214.1);
    expect(g.doorAngle).toBe(0);
    // The song loops: the hollow sleeps again, with the door shut.
    g.advanceTo(0.02);
    expect(g.awake).toBe(false);
    expect(g.doorAngle).toBe(0);
  });

  it('lets every spirit out through the doorway on the beat and brings them all home before the door shuts', () => {
    const g = grove();
    g.advanceTo(32.5);
    expect(insideCount(g)).toBe(GROVE_MAX_SPIRITS);
    // The first leaves on the beat at 32.75 s, once the door rests open.
    const first = menuBeatTime(58);
    expect(first).toBeGreaterThan(32.6);
    expect(first).toBeLessThan(32.9);
    g.advanceTo(first - 0.03);
    expect(g.inHollow(...at(g, 0))).toBe(true);
    g.advanceTo(first + 1.2);
    expect(g.inHollow(...at(g, 0))).toBe(false);
    g.advanceTo(50);
    expect(insideCount(g)).toBe(0);
    g.advanceTo(200);
    expect(insideCount(g)).toBe(0);
    g.advanceTo(211.5);
    expect(insideCount(g)).toBe(GROVE_MAX_SPIRITS);
  });

  it('keeps every spirit out of the bark, boughs, roots and ground, and the dance round the whole tree', () => {
    const g = grove();
    let minimum = Infinity;
    const bins = new Set<number>();
    let low = Infinity;
    let high = -Infinity;
    let far = 0;
    for (let t = 32; t < 214; t += 0.25) {
      g.advanceTo(t);
      for (let i = 0; i < g.count; i++) {
        const [x, y, z] = at(g, i);
        expect(Number.isFinite(x + y + z)).toBe(true);
        if (g.inHollow(x, y, z)) continue;
        minimum = Math.min(minimum, g.clearance(x, y, z));
        far = Math.max(far, Math.hypot(x - 0.6, z));
        if (t > 40 && t < 200) {
          bins.add(Math.floor(((Math.atan2(z, x) + Math.PI) / (2 * Math.PI)) * 36));
          low = Math.min(low, y);
          high = Math.max(high, y);
        }
      }
    }
    expect(minimum).toBeGreaterThan(0);
    expect(far).toBeLessThan(9);
    expect(bins.size).toBeGreaterThanOrEqual(34);
    expect(low).toBeLessThan(1.5);
    expect(high).toBeGreaterThan(6);
  });

  it('reconstructs exactly the same pose from source time whatever path the clock took, without random sampling', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('the grove must not sample random'); });
    try {
      const a = grove();
      const b = grove();
      for (let t = 29; t < 70; t += 1 / 61) a.advanceTo(t);
      a.advanceTo(70);
      b.advanceTo(70);
      expect(Array.from(a.position)).toEqual(Array.from(b.position));
      expect(Array.from(a.velocity)).toEqual(Array.from(b.velocity));
      expect(Array.from(a.trail)).toEqual(Array.from(b.trail));
      expect(a.doorAngle).toBe(b.doorAngle);
      // A held clock changes nothing and does no work.
      const steps = a.stats.steps;
      const held = Array.from(a.position);
      for (let k = 0; k < 30; k++) a.advanceTo(70);
      expect(a.stats.steps).toBe(steps);
      expect(Array.from(a.position)).toEqual(held);
      // Backwards and forwards again (a seek): restored from a snapshot, identical to a fresh run.
      a.advanceTo(51.3);
      const c = grove();
      c.advanceTo(51.3);
      expect(Array.from(a.position)).toEqual(Array.from(c.position));
      expect(Array.from(a.trail)).toEqual(Array.from(c.trail));
      expect(a.trailHead).toBe(c.trailHead);
      expect(a.stats.restores).toBeGreaterThan(0);
      a.advanceTo(70);
      expect(Array.from(a.position)).toEqual(held);
      for (const bad of [Number.NaN, -3, Number.NEGATIVE_INFINITY]) {
        a.advanceTo(bad);
        expect(a.awake).toBe(false);
        expect(a.doorAngle).toBe(0);
      }
    } finally { random.mockRestore(); }
  });

  it('dances to the score: a new formation each phrase, a bounce on the beat, and an outward push on the accents', () => {
    expect(groveFormationAt(1)).toBe(GroveFormation.Helix);
    expect(groveFormationAt(2)).toBe(GroveFormation.Rings);
    expect(groveFormationAt(3)).toBe(GroveFormation.Maypole);
    expect(groveFormationAt(5)).toBe(GroveFormation.Fireflies);
    const g = grove();
    // As fireflies, half of them sit up in the crown and half flit along the low boughs; in the rings all circle the bole.
    const meanHeight = (from: number, to: number, which: (i: number) => boolean) => {
      let sum = 0;
      let n = 0;
      for (let t = from; t < to; t += 0.5) {
        g.advanceTo(t);
        for (let i = 0; i < g.count; i++) if (which(i)) { sum += g.position[i * 3 + 1]!; n++; }
      }
      return sum / n;
    };
    const crown = meanHeight(menuPhraseTime(5) + 3, menuPhraseTime(6) - 1, (i) => i % 2 === 1);
    const boughs = meanHeight(menuPhraseTime(5) + 3, menuPhraseTime(6) - 1, (i) => i % 2 === 0);
    const rings = meanHeight(menuPhraseTime(2) + 3, menuPhraseTime(3) - 1, () => true);
    expect(crown).toBeGreaterThan(rings + 2.5);
    expect(boughs).toBeGreaterThan(1.5);
    expect(boughs).toBeLessThan(crown - 2);
    // In the rings, the spirits of the low notes are higher between beats than on them.
    let onBeat = 0;
    let between = 0;
    const lowNotes = Array.from({ length: g.count }, (_, i) => i).filter((i) => groveSpiritBand(i) < 2);
    for (let beat = 112; beat < 136; beat++) {
      g.advanceTo(menuBeatTime(beat) + 0.06);
      for (const i of lowNotes) onBeat += g.position[i * 3 + 1]!;
      g.advanceTo(menuBeatTime(beat + 0.5) + 0.06);
      for (const i of lowNotes) between += g.position[i * 3 + 1]!;
    }
    expect(between).toBeGreaterThan(onBeat);
    // A strong accent pushes the crowd outward from the bole.
    let hit = -1;
    forEachMenuAccent(60, 100, (time, s) => { if (hit < 0 && s > 0.95) hit = time; });
    expect(hit).toBeGreaterThan(0);
    const radial = (t: number) => {
      g.advanceTo(t);
      let sum = 0;
      for (let i = 0; i < g.count; i++) {
        const [x, , z] = at(g, i);
        const d = Math.hypot(x - 0.6, z) || 1;
        sum += ((x - 0.6) * g.velocity[i * 3]! + z * g.velocity[i * 3 + 2]!) / d;
      }
      return sum / g.count;
    };
    expect(radial(hit + 0.04)).toBeGreaterThan(radial(hit - 0.04) + 0.3);
    expect(sampleMenuRhythm(hit + 0.02).accent).toBeGreaterThan(0.8);
  });
});
