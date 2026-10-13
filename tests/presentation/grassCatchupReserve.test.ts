import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildGroundcover } from '../../src/presentation/groundcover';
import { createGrassField } from '../../src/presentation/grass/grassField';
import type { BuildContext, FrameContext } from '../../src/presentation/context';

vi.mock('../../src/presentation/grass/grassField', async importOriginal => {
  const original = await importOriginal<typeof import('../../src/presentation/grass/grassField')>();
  return { ...original, createGrassField: vi.fn() };
});
vi.mock('../../src/presentation/ground/habitat', () => ({ Habitat: class {} }));

describe('grass catch-up work allowance', () => {
  it.each(['low', 'high'] as const)('shares one allowance through nine steps and resets without trample work (%s)', quality => {
    const reserves: { remaining: number; deadline?: number }[] = [];
    let generated = 0;
    const field = { group: new THREE.Group(), update: vi.fn((_cam, reserve) => {
      reserves.push(reserve);
      reserve.deadline ??= 2;
      const n = Math.min(2, reserve.remaining); generated += n; reserve.remaining -= n;
    }), stats: () => ({ instances: 0, triangles: 0, draws: 0, tiles: 0 }), dispose: vi.fn() };
    vi.mocked(createGrassField).mockReturnValue(field as unknown as ReturnType<typeof createGrassField>);
    const ground = buildGroundcover({ quality, terrain: { heightAt: () => 0 } } as unknown as BuildContext);
    const frame = { camera: new THREE.PerspectiveCamera(), focus: new THREE.Vector3(), reducedMotion: true } as unknown as FrameContext;
    try {
      for (let i = 0; i < 9; i++) ground.update(1 / 60, frame);
      expect(generated).toBe(2);
      expect(new Set(reserves).size).toBe(1);
      ground.prepare({} as THREE.WebGLRenderer, 0.15);
      expect(reserves[0]!.deadline).toBeUndefined();
      for (let i = 0; i < 9; i++) ground.update(1 / 60, frame);
      expect(generated).toBe(4);
    } finally { ground.dispose?.(); }
  });
});
