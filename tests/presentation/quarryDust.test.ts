import * as THREE from 'three';
import { expect, it } from 'vitest';
import { WorldScene } from '../../src/presentation/world';

it('hides cleared dust, preserves the last integrated frame and wakes for new particles', () => {
  const position = new THREE.Float32BufferAttribute(new Float32Array(6), 3);
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', position));
  const p = { x: 1, y: 2, z: 3, vx: 2, vy: 1, vz: -1, life: .01 };
  const world = Object.assign(Object.create(WorldScene.prototype), { dust, dustNeedsClear: true, dustData: [p, { ...p, life: 0 }] });
  const step = (dt: number) => Reflect.get(world, 'advanceDust').call(world, dt);
  step(.02);
  expect(dust.visible).toBe(true); expect(position.getX(0)).toBeCloseTo(1.04);
  step(.02);
  expect(dust.visible).toBe(false); expect(position.getY(0)).toBe(-200);
  const clearedVersion = position.version;
  for (let i = 0; i < 120; i++) step(1 / 60);
  expect(dust.visible).toBe(false); expect(position.version).toBe(clearedVersion);
  p.life = 1; step(.02);
  expect(dust.visible).toBe(true); expect(position.version).toBeGreaterThan(clearedVersion);
  dust.geometry.dispose(); (dust.material as THREE.Material).dispose();
});
