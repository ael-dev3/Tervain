import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { HuntingArrows, type ArrowWater } from '../../src/presentation/huntingArrow';
import { makeBathymetryTextures, oceanVisibilityBounds } from '../../src/presentation/water/ocean';
import { RippleField } from '../../src/presentation/water/ripples';
import { Splashes } from '../../src/presentation/water/splashes';
import { WaterSystem } from '../../src/presentation/water/waterSystem';
import { SEA_LEVEL } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';
import { BATHY_NX, BATHY_NZ } from '../../src/world/water/bathymetry';
import { FILM } from '../../src/world/water/waterWorld';
import { SEA_MAX_RISE } from '../../src/world/water/waves';

let terrain: Terrain;
let water: WaterSystem;
beforeAll(() => {
  terrain = new Terrain();
  water = new WaterSystem(terrain, 'high');
  // Ease to a full stream so every inland surface is wet.
  water.update(0.1, { spring: 1, main: 1, village: 0.8, quarry: 0.6 }, new THREE.PerspectiveCamera(), new THREE.Vector3(), false, false);
  for (let i = 0; i < 300; i++) water.world.update(0.1, { spring: 1, main: 1, village: 0.8, quarry: 0.6 });
  water.inland.refresh();
});

describe('the sea as drawn', () => {
  it('uploads the solved bed and swell as finite float textures, with every unsolved phase filled', () => {
    const tex = makeBathymetryTextures(water.world.bathymetry);
    try {
      for (const t of [tex.bed, tex.wave]) {
        expect(t.image.width).toBe(BATHY_NX + 1);
        expect(t.image.height).toBe(BATHY_NZ + 1);
        expect(Array.from(t.image.data as Float32Array).every(Number.isFinite)).toBe(true);
        expect(t.magFilter).toBe(THREE.NearestFilter);
      }
    } finally { tex.bed.dispose(); tex.wave.dispose(); }
  });

  it('bounds the sea for the water pass: offshore views see it, a forest view inland does not', () => {
    const boxes = oceanVisibilityBounds(water.world.bathymetry, SEA_MAX_RISE);
    const frustum = (from: THREE.Vector3, to: THREE.Vector3) => {
      const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.25, 1400);
      camera.position.copy(from); camera.lookAt(to); camera.updateMatrixWorld();
      return new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    };
    const sea = frustum(new THREE.Vector3(-262, 3, 30), new THREE.Vector3(-320, 0, 30));
    expect(boxes.some((b) => sea.intersectsBox(b))).toBe(true);
    const inland = frustum(new THREE.Vector3(-150, 6, 0), new THREE.Vector3(0, 4, 0));
    expect(boxes.some((b) => inland.intersectsBox(b))).toBe(false);
    for (const b of boxes) {
      expect(b.min.y).toBeLessThan(SEA_LEVEL);
      expect(b.max.y).toBeCloseTo(SEA_LEVEL + SEA_MAX_RISE, 6);
    }
  });
});

describe('inland water as drawn', () => {
  it('never floats a sheet of water above the ground it stands on', () => {
    for (const mesh of water.inland.meshes) {
      if (!mesh.visible) continue;
      const p = mesh.geometry.getAttribute('position'), wet = mesh.geometry.getAttribute('aWet');
      for (let i = 0; i < p.count; i++) {
        if (wet.getX(i) < 0.5) {
          expect(p.getY(i)).toBeLessThan(terrain.heightAt(p.getX(i), p.getZ(i)));
          continue;
        }
        const ground = terrain.heightAt(p.getX(i), p.getZ(i));
        // A wet vertex is under ground (a bank), or over it by no more than the water the model solved there.
        const sample = water.world.sample(p.getX(i), p.getZ(i));
        const allowed = Math.max(FILM, sample ? sample.depth : 0) + 0.6;
        expect(p.getY(i) - ground, `${mesh.name} vertex ${i}`).toBeLessThan(allowed);
      }
    }
  });

  it('lays the spring pool level at the model\'s pool height', () => {
    const pool = water.inland.meshes.find((m) => m.name === 'water-spring-pool')!;
    const p = pool.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i += 37) expect(p.getY(i)).toBeCloseTo(water.world.poolLevel, 6);
  });
});

describe('disturbing the water', () => {
  it('keeps spray in a fixed pool of droplets that falls and fades', () => {
    const spray = new Splashes();
    try {
      spray.emit(0, 0, 0, 40, 3);
      expect(spray.active).toBe(40);
      for (let i = 0; i < 120; i++) spray.update(1 / 30);
      expect(spray.active).toBe(0);
      spray.emit(Number.NaN, 0, 0, 10, 2);
      expect(spray.active).toBe(0);
    } finally { spray.dispose(); }
  });

  it('queues ripple drops and refuses nonsense', () => {
    const field = new RippleField(64, 20);
    try {
      field.drop({ x: 1, z: 1, radius: 0.4, strength: 0.05, foam: 0.3 });
      field.drop({ x: Number.NaN, z: 1, radius: 0.4, strength: 0.05, foam: 0.3 });
      field.drop({ x: 1, z: 1, radius: 0, strength: 0.05, foam: 0.3 });
      expect((field as unknown as { pending: unknown[] }).pending).toHaveLength(1);
      expect(field.ready).toBe(false);
    } finally { field.dispose(); }
  });

  it('turns a body meeting the water into spray, rings and a sound to hear, and hears a fish rise now and then', () => {
    const disturb = vi.spyOn(water, 'disturb');
    water.splash(-300, 0, 30, 0.8);
    water.emit('stroke', -300, 0, 30, 0.4);
    const state = water.soundState(-300, 1, 30, 0.1);
    expect(state.events.map((e) => e.kind)).toEqual(['splash', 'stroke']);
    expect(disturb).toHaveBeenCalledOnce();
    expect(water.soundState(-300, 1, 30, 0.1).events).toHaveLength(0);
    disturb.mockRestore();
  });
});

describe('arrows and water', () => {
  it('splashes once as an arrow breaks the surface, slows it hard, then floats it and lets it drift', () => {
    const arrows = new HuntingArrows();
    const enter = vi.fn();
    const pond: ArrowWater = { sample: () => ({ surface: 0, flowX: 0.5, flowZ: 0 }), enter };
    try {
      arrows.launch(new THREE.Vector3(0, 2, 0), new THREE.Vector3(1, -0.6, 0).normalize(), 30);
      for (let i = 0; i < 90; i++) arrows.update(1 / 60, () => null, undefined, pond);
      expect(enter).toHaveBeenCalledOnce();
      expect(enter.mock.calls[0]![1]).toBeGreaterThan(20);
      expect(arrows.activeCount).toBe(0);
      expect(arrows.floatingCount).toBe(1);
      const floating = arrows.group.children[0]!;
      const x = floating.position.x;
      for (let i = 0; i < 120; i++) arrows.update(1 / 60, () => null, undefined, pond);
      expect(floating.position.y).toBeCloseTo(0, 1);
      expect(floating.position.x).toBeGreaterThan(x + 0.5);
    } finally { arrows.dispose(); }
  });
});
