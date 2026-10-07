import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildGroundcover } from '../../src/presentation/groundcover';
import { createFoliageField } from '../../src/presentation/foliage/foliageWind';
import { GrassWind } from '../../src/presentation/grass/wind';
import { REALM_WIND } from '../../src/presentation/realmWind';
import { Exclusions } from '../../src/presentation/vegetation';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import type { BuildContext, FrameContext } from '../../src/presentation/context';

describe('one wind for the realm', () => {
  it('lets the world own the shared wind: the grass answers it but neither steps nor disposes it, and its trample field is the shared one', () => {
    const terrain = new Terrain(), wind = new GrassWind(REALM_WIND), foliage = createFoliageField(wind);
    const ctx = { terrain, colliders: new Colliders(), excl: new Exclusions(terrain), quality: 'low', plantedCrowns: { coverAt: () => 0, broadleafAt: () => 0 }, foliage } as unknown as BuildContext;
    const ground = buildGroundcover(ctx);
    expect(ground.wind).toBe(wind);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(40, terrain.heightAt(40, -20) + 2, -20);
    const frame = { camera, focus: new THREE.Vector3(40, terrain.heightAt(40, -20), -20), reducedMotion: false } as unknown as FrameContext;
    const before = wind.uniforms.uGrassTime.value;
    ground.update(0.5, frame);
    expect(wind.uniforms.uGrassTime.value).toBe(before);
    // The ferns read the same trails as the grass.
    const renderer = { getRenderTarget: vi.fn(() => null), setRenderTarget: vi.fn(), render: vi.fn(), clear: vi.fn(), autoClear: true };
    ground.prepare(renderer as unknown as THREE.WebGLRenderer, 0.1);
    expect(foliage.trample.uTrample.value.w).toBe(1);
    expect(foliage.trample.tTrample.value).not.toBeNull();
    const dispose = vi.spyOn(wind.uniforms.tGust.value, 'dispose');
    ground.dispose!();
    expect(dispose).not.toHaveBeenCalled();
    wind.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps a standalone ground cover self-sufficient', () => {
    const terrain = new Terrain();
    const ctx = { terrain, colliders: new Colliders(), excl: new Exclusions(terrain), quality: 'low', plantedCrowns: { coverAt: () => 0, broadleafAt: () => 0 } } as unknown as BuildContext;
    const ground = buildGroundcover(ctx);
    const camera = new THREE.PerspectiveCamera();
    const before = ground.wind.uniforms.uGrassTime.value;
    ground.update(0.5, { camera, focus: new THREE.Vector3(), reducedMotion: false } as unknown as FrameContext);
    expect(ground.wind.uniforms.uGrassTime.value).toBeGreaterThan(before);
    const dispose = vi.spyOn(ground.wind.uniforms.tGust.value, 'dispose');
    ground.dispose!();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
