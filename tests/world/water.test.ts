import { beforeAll, describe, expect, it } from 'vitest';
import { coastX } from '../../src/world/coast';
import { LIGHTHOUSE, SEA_LEVEL } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';
import { BATHY, BATHY_NX, breakerHeight, buildBathymetry, rockiness, sampleBathymetry, type Bathymetry } from '../../src/world/water/bathymetry';
import { flowDepth, solveChannel } from '../../src/world/water/channels';
import { SPRING_BASIN, SPRING_SOURCE, springBasinGround } from '../../src/world/water/spring';
import { FILM, spreads, WaterWorld } from '../../src/world/water/waterWorld';
import {
  breaking, groupVelocity, SEA_MAX_RISE, seaOffset, SWELL, SWELL_OMEGA, swashRise, swellHeight, waveNumber,
} from '../../src/world/water/waves';

const G = 9.81;
let terrain: Terrain;
let bathymetry: Bathymetry;
let world: WaterWorld;
beforeAll(() => {
  terrain = new Terrain();
  bathymetry = buildBathymetry(terrain);
  world = new WaterWorld(terrain);
});

describe('swell and wind waves', () => {
  it('solves linear dispersion within the approximation\'s 1.5 % from the shallows to deep water', () => {
    for (const depth of [0.2, 0.8, 2, 5, 12, 40, 200]) {
      const k = waveNumber(SWELL_OMEGA, depth);
      const omega = Math.sqrt(G * k * Math.tanh(k * depth));
      expect(Math.abs(omega - SWELL_OMEGA) / SWELL_OMEGA).toBeLessThan(0.015);
    }
    // Shallow water: the wave slows to sqrt(g h); deep water: the group travels at half the phase speed.
    expect(SWELL_OMEGA / waveNumber(SWELL_OMEGA, 0.5)).toBeCloseTo(Math.sqrt(G * 0.5), 1);
    expect(groupVelocity(SWELL_OMEGA, 300) / (SWELL_OMEGA / waveNumber(SWELL_OMEGA, 300))).toBeCloseTo(0.5, 2);
  });

  it('shoals toward the beach and breaks at its depth limit, never taller than the water allows', () => {
    // Linear shoaling dips a little at middle depths before the wave grows in the shallows.
    expect(swellHeight(60)).toBeCloseTo(SWELL.height, 1);
    for (const depth of [30, 20, 12, 8]) expect(swellHeight(depth)).toBeGreaterThan(SWELL.height * 0.88);
    expect(swellHeight(2.5)).toBeGreaterThan(swellHeight(12));
    for (const depth of [0.05, 0.3, 0.6, 1]) expect(swellHeight(depth)).toBeLessThanOrEqual(SWELL.breaker * depth + 1e-9);
    expect(swellHeight(0)).toBe(0);
    expect(breaking(SWELL.breaker * 1, 1)).toBeGreaterThan(0.95);
    expect(breaking(0.05, 10)).toBe(0);
    expect(breakerHeight(SWELL.height)).toBeGreaterThan(SWELL.height);
  });

  it('keeps every surface displacement finite and inside the bounds the sea mesh is culled with', () => {
    const out = { x: 0, y: 0, z: 0 };
    let highest = -Infinity;
    for (let t = 0; t < 30; t += 0.37) for (const depth of [0.3, 1, 3, 12, 40]) {
      const h = swellHeight(depth);
      seaOffset(t * 7, -t * 3, t, t * 1.3, h, breaking(h, depth), 0.98, 0.16, depth, out);
      expect([out.x, out.y, out.z].every(Number.isFinite)).toBe(true);
      highest = Math.max(highest, out.y);
    }
    expect(highest).toBeLessThan(SEA_MAX_RISE);
  });

  it('runs each wave up the beach and drains it again once per swell period', () => {
    const rises: number[] = [];
    for (let t = 0; t < SWELL.period * 3; t += SWELL.period / 40) rises.push(swashRise(0, 0.5, t));
    expect(Math.min(...rises)).toBe(0);
    expect(Math.max(...rises)).toBeGreaterThan(0.15);
    // One uprush per period: count the starts of each run-up.
    let starts = 0;
    for (let i = 1; i < rises.length; i++) if (rises[i - 1] === 0 && rises[i]! > 0) starts++;
    expect(starts).toBeGreaterThanOrEqual(2);
    expect(starts).toBeLessThanOrEqual(3);
    expect(swashRise(0, 0, 3)).toBe(0);
  });
});

describe('the sea bed and its solved swell', () => {
  it('marks open water as sea and the land above the swash as never sea', () => {
    expect(sampleBathymetry(bathymetry.height, -340, 30, -1)).toBeGreaterThan(0);
    expect(sampleBathymetry(bathymetry.height, -200, 30, -1)).toBeLessThan(0);
    expect(SEA_LEVEL - sampleBathymetry(bathymetry.bed, -340, 30, 0)).toBeGreaterThan(5);
  });

  it('refracts the swell to meet the strand nearly head on, travelling up the slope of the bed', () => {
    const w = BATHY_NX + 1;
    const gradient = (field: Float32Array, x: number, z: number) => {
      const i = Math.round((x - BATHY.minX) / BATHY.cell), j = Math.round((z - BATHY.minZ) / BATHY.cell);
      const at = (ii: number, jj: number) => field[jj * w + ii]!;
      return { x: at(i + 1, j) - at(i - 1, j), z: at(i, j + 1) - at(i, j - 1) };
    };
    for (const z of [0, 30, 60]) {
      const x = coastX(z) - 12;
      // Phase grows along the direction of travel; the bed rises toward the shore.
      const k = gradient(bathymetry.phase, x, z), up = gradient(bathymetry.bed, x, z);
      const cosine = (k.x * up.x + k.z * up.z) / (Math.hypot(k.x, k.z) * Math.hypot(up.x, up.z));
      expect(cosine).toBeGreaterThan(Math.cos(Math.PI / 6));
    }
  });

  it('shelters the water behind the headland and finds rock at the cliffs, sand on the strand', () => {
    expect(rockiness(bathymetry, coastX(LIGHTHOUSE.z) - 6, LIGHTHOUSE.z)).toBeGreaterThan(rockiness(bathymetry, coastX(30) - 6, 30));
    expect(Math.min(...bathymetry.shelter.filter(Number.isFinite))).toBeLessThan(0.6);
    expect(Math.max(...bathymetry.shelter.filter(Number.isFinite))).toBeLessThanOrEqual(1);
  });
});

describe('streams, races and the spring', () => {
  it('never lets a channel\'s water rise downstream, and keeps it on its bed, at every quest flow', () => {
    for (const flow of [0.1, 0.5, 1]) {
      const w = new WaterWorld(terrain);
      for (let i = 0; i < 300; i++) w.update(0.1, { spring: flow, main: flow, village: flow, quarry: flow });
      for (const channel of [...w.channels, w.rill]) {
        let last = Infinity;
        for (const s of channel.samples) {
          if (!Number.isFinite(s.surface)) continue;
          expect(s.surface, `${channel.id} at ${s.s.toFixed(1)} m, flow ${flow}`).toBeLessThanOrEqual(last + 1e-9);
          expect(s.surface).toBeGreaterThanOrEqual(s.bed);
          expect(s.speed).toBeGreaterThanOrEqual(0);
          expect(s.rough).toBeGreaterThanOrEqual(0);
          expect(s.rough).toBeLessThanOrEqual(1);
          last = s.surface;
        }
      }
    }
    expect(flowDepth(0.4, 0)).toBeCloseTo(0.1, 6);
    expect(flowDepth(0.4, 1)).toBeCloseTo(0.4, 6);
    // A dry course stays dry.
    const dry = solveChannel(new WaterWorld(terrain).channel('quarry'), 0);
    expect(dry.samples.filter((s) => Number.isFinite(s.surface) && s.surface - s.bed > 0.05).length).toBe(0);
  });

  it('cuts the spring\'s basin as a bowl whose still water fills it below its lip', () => {
    const centre = springBasinGround(SPRING_BASIN.x, SPRING_BASIN.z, 20);
    expect(centre.ground).toBeCloseTo(SPRING_BASIN.floor, 1);
    expect(centre.water).toBeGreaterThan(0.5);
    const outside = springBasinGround(SPRING_BASIN.x + SPRING_BASIN.blendR + 1, SPRING_BASIN.z, 20);
    expect(outside.ground).toBe(20);
    expect(outside.water).toBe(0);
    expect(terrain.heightAt(SPRING_BASIN.x, SPRING_BASIN.z)).toBeLessThan(SPRING_BASIN.level);
  });
});

describe('one water model for everything that meets water', () => {
  it('answers sea, stream and pool with a surface above the bed, and nothing on dry ground', () => {
    const sea = world.sample(-340, 30)!;
    expect(sea.body).toBe('sea');
    expect(sea.depth).toBeGreaterThan(5);
    expect(world.sample(-200, 30)).toBeNull();
    const pool = world.sample(SPRING_BASIN.x, SPRING_BASIN.z)!;
    expect(pool.body).toBe('pool');
    expect(pool.surface).toBeCloseTo(world.poolLevel, 6);
    for (let x = -250; x <= 190; x += 7) for (let z = -160; z <= 160; z += 7) {
      const s = world.sample(x, z);
      if (s) expect(s.surface).toBeGreaterThan(s.bed);
    }
  });

  it('keeps a stream\'s water inside its banks: no deep phantom water on the hillside below the spring', () => {
    let deepest = 0;
    for (let x = SPRING_SOURCE.x - 8; x <= SPRING_SOURCE.x + 4; x += 0.5) for (let z = SPRING_SOURCE.z - 6; z <= SPRING_SOURCE.z + 6; z += 0.5) {
      const s = world.sample(x, z);
      if (s && s.body !== 'pool') deepest = Math.max(deepest, s.depth);
    }
    expect(deepest).toBeLessThan(0.6);
    // Water spreads out to a bank and no further; ground that falls away below the channel is not part of it.
    const flat = { heightAt: () => 0 };
    expect(spreads(flat, 0, 0, 2, 0, 0.3, 0, 0)).toBe(true);
    expect(spreads({ heightAt: (x: number) => (x > 0.5 && x < 1.5 ? 0.5 : 0) }, 0, 0, 2, 0, 0.3, 0, 0)).toBe(false);
    expect(spreads(flat, 0, 0, 2, 0, 0.3, 1, 0)).toBe(false);
    expect(FILM).toBeGreaterThan(0);
  });

  it('eases toward the quest\'s flows, re-solves as they move, and holds its clock still for Reduced Motion', () => {
    const w = new WaterWorld(terrain);
    const revision = w.revision, level = w.poolLevel;
    for (let i = 0; i < 300; i++) w.update(0.1, { spring: 1, main: 1, village: 0.8, quarry: 0.6 });
    expect(w.flows.spring).toBeCloseTo(1, 2);
    expect(w.revision).toBeGreaterThan(revision);
    expect(w.poolLevel).toBeGreaterThan(level);
    const time = w.time;
    w.update(0.5, { spring: 1, main: 1, village: 0.8, quarry: 0.6 }, true);
    expect(w.time).toBe(time);
    w.update(0.5, { spring: 1, main: 1, village: 0.8, quarry: 0.6 });
    expect(w.time).toBeCloseTo(time + 0.5, 6);
  });

  it('moves the sea\'s surface with the swell over time and carries broken water shoreward', () => {
    const w = new WaterWorld(terrain);
    const x = coastX(30) - 20, heights: number[] = [];
    for (let i = 0; i < 40; i++) {
      w.update(SWELL.period / 40, { spring: 0.3, main: 0.3, village: 0.1, quarry: 0.3 });
      heights.push(w.surfaceAt(x, 30)!);
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.15);
    const surf = w.sample(coastX(30) - 4, 30);
    if (surf && surf.body === 'sea') expect(surf.rough).toBeGreaterThan(0.2);
  });
});
