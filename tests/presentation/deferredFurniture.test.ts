import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { FrameContext, SceneModule } from '../../src/presentation/context';
import { deferredFurniture } from '../../src/presentation/furniture';

function fakeInner(): SceneModule {
  return { group: new THREE.Group(), update: vi.fn(), stats: () => ({ furniture: 3, furnitureTris: 900 }), dispose: vi.fn() };
}

describe('furniture that arrives after the world opens (backlog 4)', () => {
  it('stands in empty, then draws and counts the pieces once they arrive', () => {
    const lazy = deferredFurniture(), frame = {} as FrameContext;
    expect(lazy.arrived).toBe(false);
    expect(lazy.group.children).toHaveLength(0);
    expect(lazy.stats?.()).toEqual({});
    lazy.update(0.016, frame);
    const inner = fakeInner();
    lazy.attach(inner);
    expect(lazy.arrived).toBe(true);
    expect(lazy.group.children).toContain(inner.group);
    lazy.update(0.016, frame);
    expect(inner.update).toHaveBeenCalledWith(0.016, frame);
    expect(lazy.stats?.()).toEqual({ furniture: 3, furnitureTris: 900 });
    lazy.dispose?.();
    expect(inner.dispose).toHaveBeenCalledOnce();
  });

  it('disposes furniture that arrives after the world was closed', () => {
    const lazy = deferredFurniture(), inner = fakeInner();
    lazy.dispose?.();
    lazy.attach(inner);
    expect(inner.dispose).toHaveBeenCalledOnce();
    expect(lazy.arrived).toBe(false);
    expect(lazy.group.children).toHaveLength(0);
  });
});
