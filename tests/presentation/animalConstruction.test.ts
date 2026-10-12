import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildAnimals, buildAnimalsAsync } from '../../src/presentation/animals';
import { ANIMALS } from '../../src/presentation/animals/catalog';
import { Terrain } from '../../src/world/terrain';
import { buildStaticColliders } from '../../src/world/colliders';
import { animalFixture, animalTemplates } from './animalFixture';

describe('wildlife construction during play', () => {
  it('yields between real source models and retains the synchronous population, placement and contacts', async () => {
    const templates = await animalTemplates(ANIMALS), terrain = new Terrain();
    const ctx = { terrain, colliders: buildStaticColliders(terrain), quality: 'high' as const };
    const synchronous = buildAnimals(ctx, templates, ANIMALS, () => {});
    let yields = 0;
    const staged = await buildAnimalsAsync(ctx, templates, { budgetMs: 0, yieldNow: async () => { yields++; } });
    try {
      // Fitting, cloning and carcass support scans each stop between models; all nineteen still activate together.
      expect(yields).toBe(ANIMALS.length * 3);
      expect(staged.snapshot()).toEqual(synchronous.snapshot());
      expect(staged.contacts).toEqual(synchronous.contacts);
      expect(staged.physicalActors).toEqual(synchronous.physicalActors);
      expect(staged.stats?.()).toEqual(synchronous.stats?.());
    } finally { synchronous.dispose?.(); staged.dispose?.(); }
  }, 20_000);

  it.each([ANIMALS.length + 2, ANIMALS.length * 2 + 2])('releases partial copies when cancelled at construction turn %s', async stopAt => {
    const source = animalFixture(), templates = new Map(ANIMALS.map(definition => [definition.id, source]));
    const skin = source.scene.children.find(object => (object as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh;
    const originalClone = skin.geometry.clone.bind(skin.geometry), copies: THREE.BufferGeometry[] = [];
    const clone = vi.spyOn(skin.geometry, 'clone').mockImplementation(() => {
      const geometry = originalClone(); vi.spyOn(geometry, 'dispose'); copies.push(geometry); return geometry;
    });
    const templateDisposed = vi.spyOn(skin.geometry, 'dispose'), controller = new AbortController(), reason = new Error('world replaced');
    const terrain = new Terrain(); let turns = 0;
    try {
      await expect(buildAnimalsAsync({ terrain, colliders: buildStaticColliders(terrain), quality: 'low' }, templates,
        { budgetMs: 0, signal: controller.signal, yieldNow: async () => { if (++turns === stopAt) controller.abort(reason); } })).rejects.toBe(reason);
      expect(turns).toBe(stopAt);
      expect(copies).toHaveLength(stopAt < ANIMALS.length * 2 ? 2 : ANIMALS.length);
      for (const geometry of copies) expect(geometry.dispose).toHaveBeenCalledOnce();
      expect(templateDisposed).not.toHaveBeenCalled();
    } finally { clone.mockRestore(); templateDisposed.mockRestore(); }
  });
});
