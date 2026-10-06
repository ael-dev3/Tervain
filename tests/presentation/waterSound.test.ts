import { beforeAll, describe, expect, it } from 'vitest';
import { bedTargets, farSea, type WorldSoundState } from '../../src/presentation/sound/soundscape';
import { WaterListener, type WaterSoundState } from '../../src/presentation/water/waterSound';
import { coastX } from '../../src/world/coast';
import { FORD, LIGHTHOUSE } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';
import { SPRING_BASIN } from '../../src/world/water/spring';
import { WaterWorld } from '../../src/world/water/waterWorld';
import { SWELL } from '../../src/world/water/waves';

let world: WaterWorld;
beforeAll(() => {
  world = new WaterWorld(new Terrain());
  for (let i = 0; i < 300; i++) world.update(0.1, { spring: 1, main: 1, village: 0.6, quarry: 0.5 });
});

function listen(x: number, y: number, z: number, seconds = 0.5) {
  const ear = new WaterListener();
  let state: WaterSoundState | null = null;
  for (let t = 0; t < seconds; t += 0.05) state = ear.update(world, x, y, z, 0.05, []);
  return state!;
}

const day: WorldSoundState = { hour: 12, nightness: 0, flows: { main: 1, village: 0.6, quarry: 0.5 }, millTurning: true, quarryWorking: false };

describe('the water heard from where the listener stands', () => {
  it('places surf on the strand\'s breaker line and surf on rock at the headland', () => {
    const strand = listen(coastX(30) + 8, 2, 30);
    expect(strand.surf).not.toBeNull();
    expect(strand.surf!.d).toBeLessThan(40);
    // Seaward of the listener: the breaker line or the swash running up below it.
    expect(strand.surf!.x).toBeLessThan(coastX(30) + 8);
    const cliff = listen(coastX(LIGHTHOUSE.z) + 4, 12, LIGHTHOUSE.z);
    expect(cliff.rocks).not.toBeNull();
    const village = listen(-6, 2, 10);
    expect(village.surf).toBeNull();
    expect(village.rocks).toBeNull();
  });

  it('finds calm water at the ford and the spring pool, white water where the spring falls', () => {
    expect(listen(FORD.x + 6, 1.5, FORD.z).calm).not.toBeNull();
    expect(listen(SPRING_BASIN.x + 4, 9, SPRING_BASIN.z).calm).not.toBeNull();
    expect(listen(-6, 11, -91).rapids).not.toBeNull();
  });

  it('hears each crest break once as it reaches the listener\'s stretch of surf', () => {
    const ear = new WaterListener();
    const w = new WaterWorld(new Terrain());
    let breaks = 0;
    const x = coastX(30) + 6;
    for (let t = 0; t < SWELL.period * 4; t += 1 / 30) {
      w.update(1 / 30, { spring: 0.3, main: 0.3, village: 0.1, quarry: 0.3 });
      breaks += ear.update(w, x, 2, 30, 1 / 30, []).breaks.filter((b) => !b.rock).length;
    }
    expect(breaks).toBeGreaterThanOrEqual(3);
    expect(breaks).toBeLessThanOrEqual(6);
  });

  it('knows when the ears are under the surface, and passes on what disturbed the water', () => {
    const x = coastX(30) - 30;
    const surface = world.surfaceAt(x, 30)!;
    const ear = new WaterListener();
    const under = ear.update(world, x, surface - 1, 30, 0.1, [{ kind: 'splash', x, y: surface, z: 30, energy: 0.7 }]);
    expect(under.under).toBeCloseTo(1, 6);
    expect(under.events).toHaveLength(1);
    expect(ear.update(world, x, surface + 2, 30, 0.1, []).under).toBe(0);
  });

  it('sets the water beds from that: surf near the beach, the open sea far off and high up, muffled sea below', () => {
    const near = listen(coastX(30) + 8, 2, 30);
    const beds = bedTargets({ x: coastX(30) + 8, y: 2, z: 30, indoors: false }, day, near);
    expect(beds.surf.gain).toBeGreaterThan(0.3);
    expect(beds.surf.at).toBeDefined();
    expect(beds.underwater.gain).toBe(0);
    const inland = bedTargets({ x: 40, y: 3, z: -20, indoors: false }, day, listen(40, 3, -20));
    expect(inland.surf.gain).toBe(0);
    expect(inland.surf_rocks.gain).toBe(0);
    expect(farSea({ x: coastX(LIGHTHOUSE.z) + 10, y: 30, z: LIGHTHOUSE.z })).toBeGreaterThan(0.4);
    expect(farSea({ x: 40, y: 3, z: -20 })).toBeLessThan(0.05);
    const below = bedTargets({ x: coastX(30) - 30, y: -2, z: 30, indoors: false }, day, { ...near, under: 1.5 });
    expect(below.underwater.gain).toBeGreaterThan(0.5);
    // Without water state (older callers), the water beds stay silent rather than failing.
    const none = bedTargets({ x: coastX(30) + 8, y: 2, z: 30, indoors: false }, day);
    expect(none.surf.gain).toBe(0);
    expect(none.underwater.gain).toBe(0);
  });
});
