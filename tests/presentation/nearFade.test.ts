import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { NEAR_FADE, NearFade, heroNearCoverage } from '../../src/presentation/nearFade';

describe('hero near fade', () => {
  const feet = { x: 0, y: 10, z: 0 };
  it('draws him fully at a normal boom and removes him with the lens at his shoulder', () => {
    expect(heroNearCoverage({ x: 0, y: 12.2, z: -4 }, feet)).toBe(1);
    expect(heroNearCoverage({ x: 0.3, y: 11.4, z: -0.3 }, feet)).toBe(0);
  });
  it('fades smoothly between, measured from the body axis rather than the pivot', () => {
    const mid = heroNearCoverage({ x: (NEAR_FADE.start + NEAR_FADE.end) / 2, y: 11, z: 0 }, feet);
    expect(mid).toBeCloseTo(0.5, 5);
    // Below his feet the distance runs to the soles, not the hips.
    expect(heroNearCoverage({ x: 0, y: 10 - NEAR_FADE.start - 0.2, z: 0 }, feet)).toBe(1);
  });
  it('patches each material once with a shared coverage and hides the group when gone', () => {
    const fade = new NearFade(), group = new THREE.Group(), material = new THREE.MeshStandardMaterial();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
    const key = material.customProgramCacheKey();
    fade.apply(group, 1);
    const patched = material.customProgramCacheKey();
    expect(patched).not.toBe(key);
    fade.apply(group, 0.5);
    expect(material.customProgramCacheKey()).toBe(patched);
    expect(group.visible).toBe(true);
    fade.apply(group, 0);
    expect(group.visible).toBe(false);
    expect(fade.uniform.value).toBe(0);
  });
});
