import { describe, expect, it, vi } from 'vitest';
import { Terrain } from '../../src/world/terrain';
import { NavGrid } from '../../src/world/nav';
import { Colliders } from '../../src/world/colliders';
import { WORLD } from '../../src/world/layout';

describe('physical ground and navigation construction', () => {
  it('does not cache partial source rows when the first build is cancelled', async () => {
    const controller = new AbortController();
    await expect(Terrain.create({
      signal: controller.signal, budgetMs: 0, yieldNow: async () => {}, onProgress: () => controller.abort(),
    })).rejects.toMatchObject({ name: 'AbortError' });
    const rows: number[] = [];
    const completed = await Terrain.create({ budgetMs: 0, yieldNow: async () => {}, onProgress: count => rows.push(count) });
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0]).toBe(4); expect(rows.at(-1)).toBe(completed.nz + 1);
  });

  it('returns the same sampled ground and water cuts after yielding, with complete arrays on first access', async () => {
    const progress: [number, number][] = [], yieldNow = vi.fn(async () => {});
    const terrain = await Terrain.create({ yieldNow, budgetMs: 0, onProgress: (completed, total) => progress.push([completed, total]) });
    const sync = new Terrain();
    expect(terrain.heights).toEqual(sync.heights); expect(terrain.carve).toEqual(sync.carve);
    expect(progress.at(-1)).toEqual([terrain.nz + 1, terrain.nz + 1]);
    // A previously completed source cache can make this request ready without another sampling pass.
    if (progress.length > 1) expect(yieldNow).toHaveBeenCalled();
    expect(terrain.heightAt(-220, 20)).toBe(sync.heightAt(-220, 20));
  });

  it('does not complete a physical ground request cancelled between sampled rows', async () => {
    const controller = new AbortController(), reason = new DOMException('Start request replaced', 'AbortError');
    const progress = vi.fn((_completed: number, _total: number) => controller.abort(reason));
    await expect(Terrain.create({ signal: controller.signal, budgetMs: 0, yieldNow: async () => {}, onProgress: progress })).rejects.toBe(reason);
    expect(progress).toHaveBeenCalledOnce();
    expect(progress.mock.calls[0]![0]).toBeGreaterThan(0);
    expect(progress.mock.calls[0]![1]).toBe((WORLD.maxZ - WORLD.minZ) / WORLD.cell + 1);
  });

  it('reuses complete CPU source samples without sharing a world’s mutable height/water arrays', async () => {
    const original = new Terrain(), firstHeight = original.heights[0]!, firstCarve = original.carve[0]!;
    original.heights[0] = firstHeight + 50; original.carve[0] = firstCarve + 9;
    const yieldNow = vi.fn(async () => {}), fresh = await Terrain.create({ yieldNow });
    expect(fresh.heights).not.toBe(original.heights); expect(fresh.carve).not.toBe(original.carve);
    expect(fresh.heights[0]).toBe(firstHeight); expect(fresh.carve[0]).toBe(firstCarve);
    expect(yieldNow).not.toHaveBeenCalled();
    fresh.heights[0] = firstHeight - 20;
    expect(new Terrain().heights[0]).toBe(firstHeight);
  });

  it('activates ready routes for both body widths and preserves every closed-cell decision', async () => {
    const terrain = { nx: 8, nz: 12, walkable: () => true } as unknown as Terrain;
    const colliders = new Colliders();
    colliders.box('gate', WORLD.minX + 6, WORLD.minZ + 11, 0.08, 8);
    const reference = new NavGrid(terrain, colliders), yieldNow = vi.fn(async () => {});
    const nav = await NavGrid.create(terrain, colliders, .55, { yieldNow, budgetMs: 0 });
    const wider = await nav.forRadiusAsync(.85, { yieldNow, budgetMs: 0 }), wideReference = reference.forRadius(.85);
    for (let j = 0; j < terrain.nz; j++) for (let i = 0; i < terrain.nx; i++) {
      expect(nav.isBlocked(i, j)).toBe(reference.isBlocked(i, j));
      expect(wider.isBlocked(i, j)).toBe(wideReference.isBlocked(i, j));
    }
    expect(nav.forRadius(.85)).toBe(wider);
    expect(nav.builtVersion).toBe(colliders.version); expect(wider.builtVersion).toBe(colliders.version);
    expect(yieldNow).toHaveBeenCalled();
  });

  it('resamples earlier route rows when a gate changes during cooperative construction', async () => {
    const terrain = { nx: 8, nz: 12, walkable: () => true } as unknown as Terrain, colliders = new Colliders();
    colliders.box('gate', WORLD.minX + 6, WORLD.minZ + 2, .2, 2);
    let changed = false;
    const nav = await NavGrid.create(terrain, colliders, .55, {
      yieldNow: async () => {}, budgetMs: 0,
      onProgress: () => { if (!changed) { changed = true; colliders.setActive('gate', false); } },
    });
    const reference = new NavGrid(terrain, colliders);
    for (let j = 0; j < terrain.nz; j++) for (let i = 0; i < terrain.nx; i++) expect(nav.isBlocked(i, j)).toBe(reference.isBlocked(i, j));
    expect(nav.builtVersion).toBe(colliders.version);
  });
});
