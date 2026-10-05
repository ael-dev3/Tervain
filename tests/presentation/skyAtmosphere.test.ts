import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkyRig } from '../../src/presentation/sky';
import { SKY } from '../../src/presentation/skyState';

let sky: SkyRig;
const focus = new THREE.Vector3(-268, 0.5, 27);

beforeEach(() => {
  vi.stubGlobal('window', { devicePixelRatio: 1 });
  SKY.ibl.value = 0;
  sky = new SkyRig(1024);
});
afterEach(() => { sky.dispose(); vi.unstubAllGlobals(); });

describe('continuous coastal atmosphere', () => {
  it('keeps sky, directional light, fog and ambient values finite through the whole day', () => {
    for (let hour = 0; hour <= 24; hour += 0.25) {
      sky.update(hour, focus, 1 / 60, false);
      const values = [
        ...SKY.top.value.toArray(), ...SKY.horizon.value.toArray(), ...SKY.ambient.value.toArray(),
        ...SKY.sunDir.value.toArray(), ...SKY.moonDir.value.toArray(),
        SKY.night.value, SKY.cover.value, sky.fog.density, sky.sun.intensity, sky.moon.intensity,
      ];
      expect(values.every(Number.isFinite)).toBe(true);
      expect(SKY.night.value).toBeGreaterThanOrEqual(0);
      expect(SKY.night.value).toBeLessThanOrEqual(1);
      expect(sky.hemi.intensity).toBeGreaterThan(0);
      expect(SKY.ambient.value.r + SKY.ambient.value.g + SKY.ambient.value.b).toBeGreaterThan(0);
      expect(sky.state.horizon.equals(sky.fog.color)).toBe(true);
      expect(SKY.horizon.value.equals(sky.fog.color)).toBe(true);
    }
  });

  it('joins the midnight ambient and ground fill without a day-boundary flash', () => {
    sky.update(24, focus, 1, true);
    const ambient = SKY.ambient.value.clone(), ground = SKY.ground.value.clone();
    const top = SKY.top.value.clone(), fog = sky.fog.color.clone(), intensity = sky.hemi.intensity;
    sky.update(0, focus, 1, true);
    expect(SKY.ambient.value.equals(ambient)).toBe(true);
    expect(SKY.ground.value.equals(ground)).toBe(true);
    expect(SKY.top.value.equals(top)).toBe(true);
    expect(sky.fog.color.equals(fog)).toBe(true);
    expect(sky.hemi.intensity).toBe(intensity);
  });

  it('freezes cloud and star motion while day/night lighting and brightness remain accessible', () => {
    sky.update(12, focus, 2, false);
    const phase = SKY.time.value;
    sky.update(0, focus, 120, true);
    expect(SKY.time.value).toBe(phase);
    expect(SKY.night.value).toBe(1);
    const ambient = SKY.ambient.value.clone(), moon = sky.moon.intensity;
    sky.brightness = 1.4;
    sky.update(0, focus, 120, true);
    expect(SKY.time.value).toBe(phase);
    expect(SKY.ambient.value.r).toBeGreaterThan(ambient.r);
    expect(sky.moon.intensity).toBeGreaterThan(moon);
    sky.update(0, focus, 0.5, false);
    expect(SKY.time.value).toBeCloseTo(phase + 0.5);
  });
});
