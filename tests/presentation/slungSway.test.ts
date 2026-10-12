import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SlungSway } from '../../src/presentation/playerHunting';

const still = new THREE.Quaternion();

describe('the slung bow swings with his steps (A118)', () => {
  it('stays strapped exactly while he stands still', () => {
    const s = new SlungSway(), p = new THREE.Vector3(1, 1.3, 2);
    for (let i = 0; i < 120; i++) s.update(1 / 60, p, still);
    expect(s.angle).toBe(0);
    expect(s.bob).toBe(0);
  });

  it('swings within its limits on a walk and settles back when he stops', () => {
    const s = new SlungSway(), p = new THREE.Vector3();
    let most = 0;
    for (let i = 0; i < 240; i++) {
      const t = i / 60;
      p.set(0.04 * Math.sin(t * Math.PI * 1.8), 1.3 + 0.03 * Math.sin(t * Math.PI * 3.6), t * 1.6);
      s.update(1 / 60, p, still);
      most = Math.max(most, Math.abs(s.angle));
      expect(Math.abs(s.angle)).toBeLessThanOrEqual(SlungSway.MAX_ANGLE);
      expect(Math.abs(s.bob)).toBeLessThanOrEqual(SlungSway.MAX_BOB);
    }
    expect(most).toBeGreaterThan(0.01);
    for (let i = 0; i < 600; i++) s.update(1 / 60, p, still);
    expect(Math.abs(s.angle)).toBeLessThan(1e-3);
    expect(Math.abs(s.bob)).toBeLessThan(1e-3);
  });

  it('does not swing from a teleport', () => {
    const s = new SlungSway();
    s.update(1 / 60, new THREE.Vector3(0, 1.3, 0), still);
    s.update(1 / 60, new THREE.Vector3(0, 1.3, 0), still);
    s.update(1 / 60, new THREE.Vector3(40, 1.3, 0), still);
    expect(s.angle).toBe(0);
  });
});
