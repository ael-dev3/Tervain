import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkyRig } from '../../src/presentation/sky';
import { SKY } from '../../src/presentation/skyState';

let sky: SkyRig;
const focus = new THREE.Vector3(-268, 0.5, 27);
const luminance = (color: THREE.Color) => color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;

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

  it('retains a cool diffuse reading floor throughout night with the normal environment active', () => {
    SKY.ibl.value = 1;
    sky.update(12, focus, 120, true);
    expect(sky.sun.intensity).toBeGreaterThan(2.5);
    // This measures available linear diffuse illumination, not final pixels:
    // the ordinary native forest review still decides route/hero readability.
    for (let sample = 0; sample <= 90; sample++) {
      const hour = (20.2 + sample * 0.1) % 24;
      sky.update(hour, focus, 120, true);
      const fill = luminance(sky.hemi.color) * sky.hemi.intensity;
      const bounce = luminance(sky.hemi.groundColor) * sky.hemi.intensity;
      expect(fill, `default night sky fill at ${hour.toFixed(1)}`).toBeGreaterThanOrEqual(0.25);
      expect(fill, 'diffuse night illumination remains bounded below HDR white energy').toBeLessThan(0.55);
      expect(bounce, 'roots and dark downward faces need a subdued bounce').toBeGreaterThan(0.09);
      expect(sky.hemi.color.b).toBeGreaterThan(sky.hemi.color.r);
    }
    for (const hour of [22, 23, 24, 0]) {
      sky.update(hour, focus, 120, true);
      expect(sky.sun.intensity, 'night readability comes from fill, not artificial sunlight').toBe(0);
      // No sun shadow at night, and no shadow map drawn for it; it still counts as a shadowed light, so no material is
      // compiled again at dusk or dawn.
      expect(sky.sun.shadow.intensity).toBe(0);
      expect(sky.sunShadows).toBe(false);
      expect(sky.sun.castShadow).toBe(true);
    }
    for (const boundary of [0, 5.2, 20.2, 22]) {
      sky.update((boundary + 24 - 0.001) % 24, focus, 120, true);
      const before = SKY.ambient.value.clone();
      sky.update((boundary + 0.001) % 24, focus, 120, true);
      const after = SKY.ambient.value;
      expect(Math.abs(luminance(before) - luminance(after))).toBeLessThan(0.001);
    }
  });

  it('moves the sun and moon smoothly through the ends of the day, without a jump (A70)', () => {
    let sun = new THREE.Vector3(), moon = new THREE.Vector3();
    for (let step = 0; step <= 2400; step++) {
      const hour = step / 100;
      sky.update(hour, focus, 120, true);
      if (step) {
        expect(sky.state.sunDir.angleTo(sun), 'sun at ' + hour).toBeLessThan(0.03);
        expect(sky.state.moonDir.angleTo(moon), 'moon at ' + hour).toBeLessThan(0.03);
      }
      expect(sky.state.sunDir.length()).toBeCloseTo(1, 6);
      sun = sky.state.sunDir.clone(); moon = sky.state.moonDir.clone();
    }
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
