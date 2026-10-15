import * as THREE from 'three';
import { expect, it } from 'vitest';
import { PlantedCrownIndex } from '../../src/presentation/plantedCrowns';

it('samples occupied and empty cells without string map keys, retaining independent signed and distant axes', () => {
  const geometry = new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2).translate(0, 6, 0);
  const field = new PlantedCrownIndex();
  // The third placement would collide with the first under a fixed x + 1024*z key.
  const positions = [[-31.5, 33.5], [31.5, -33.5], [32736.5, 1.5]] as const;
  field.add('oak', { x: positions[0][0], z: positions[0][1], s: 1, yaw: .3 }, geometry);
  for (const [x, z] of positions.slice(1)) field.add('pine', { x, z, s: 1, yaw: -.7 }, geometry);
  const get = Map.prototype.get, values: number[][] = [];
  let stringGets = 0, numericGets = 0;
  try {
    Map.prototype.get = function(key: unknown) {
      if (typeof key === 'string') stringGets++;
      if (typeof key === 'number') numericGets++;
      return get.call(this, key);
    };
    for (let repeat = 0; repeat < 10; repeat++) {
      for (const [x, z] of positions) values.push([field.coverAt(x, z), field.broadleafAt(x, z)]);
      values.push([field.coverAt(-10000, -10000), field.broadleafAt(10000, 10000)]);
    }
  } finally { Map.prototype.get = get; geometry.dispose(); }
  expect(values.length).toBe(40);
  for (let i = 0; i < values.length; i += 4) {
    expect(values[i]![0]).toBeGreaterThan(.6);
    expect(values[i]![1]).toBe(values[i]![0]);
    expect(values[i + 1]![0]).toBeGreaterThan(.6); expect(values[i + 1]![1]).toBe(0);
    expect(values[i + 2]![0]).toBeGreaterThan(.6); expect(values[i + 2]![1]).toBe(0);
    expect(values[i + 3]).toEqual([0, 0]);
  }
  expect(stringGets).toBe(0);
  expect(numericGets).toBeGreaterThan(0);
});
