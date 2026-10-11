import { describe, expect, it } from 'vitest';
import { groundSurface, innSong } from '../../src/presentation/sound/soundscape';
import { BUILDINGS } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';

describe('footsteps on room floors (A89 scout)', () => {
  it('sound boarded in every walkable room and flagged in the shrine hall, not grass or road', () => {
    const terrain = new Terrain();
    let rooms = 0;
    for (const b of BUILDINGS) {
      if (!terrain.rooms.at(b.x, b.z)) continue;
      rooms++;
      expect(groundSurface(terrain, b.x, b.z), b.id).toBe(b.kind === 'shrine' ? 'stone' : 'deck');
    }
    expect(rooms).toBeGreaterThan(10);
  });
});

describe('the inn’s evening music (A89 scout)', () => {
  it('is heard whole inside the inn, louder than from the lane outside, and muffled from another room', () => {
    const world = { hour: 20, nightness: 1, flows: { main: 1, village: 1, quarry: 1 }, millTurning: false, quarryWorking: false };
    const inside = innSong({ x: -4, y: 1, z: 30, indoors: true, inInn: true }, world).gain;
    const lane = innSong({ x: -4, y: 1, z: 37, indoors: false }, world).gain;
    const elsewhere = innSong({ x: -4, y: 1, z: 37, indoors: true }, world).gain;
    expect(inside).toBeGreaterThan(0);
    expect(inside).toBeGreaterThanOrEqual(lane);
    expect(elsewhere).toBeLessThan(lane);
  });
});
