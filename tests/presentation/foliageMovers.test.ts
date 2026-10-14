import * as THREE from 'three';
import { expect, it } from 'vitest';
import { FoliageMoverSelection } from '../../src/presentation/foliage/movers';
import type { GrassMover } from '../../src/presentation/grass/trample';
import { createFoliageField, FOLIAGE_MAX_MOVERS } from '../../src/presentation/foliage/foliageWind';
import { GrassWind } from '../../src/presentation/grass/wind';

import { REALM_WIND } from '../../src/presentation/realmWind';

const terrain = { heightAt: (x: number, z: number) => x * .1 - z * .2 };
function original(focus: THREE.Vector3, movers: readonly GrassMover[]) {
  const heroLift = Math.max(0, focus.y - terrain.heightAt(focus.x, focus.z));
  return [{ x: focus.x, z: focus.z, radius: .75, centre: 1 + heroLift },
    ...movers.map(m => ({ x: m.x, z: m.z, radius: m.radius * 1.4, centre: Math.max(.5, m.radius * 1.2) }))]
    .map(m => ({ ...m, d: Math.hypot(m.x - focus.x, m.z - focus.z) }))
    .filter(m => m.d < 40 && [m.x, m.z, m.radius].every(Number.isFinite))
    .sort((a, b) => a.d - b.d).slice(0, FOLIAGE_MAX_MOVERS)
    .map(m => [m.x, terrain.heightAt(m.x, m.z) + m.centre, m.z, m.radius]);
}

it('matches the old selection through movement, ties, invalid inputs and shrinking populations', () => {
  const selection = new FoliageMoverSelection(), field = createFoliageField(new GrassWind(REALM_WIND));
  const movers: GrassMover[] = Array.from({ length: 80 }, (_, i) => ({ x: i - 40, z: i % 3, radius: .2 + (i % 5) * .1 }));
  movers.push({ x: NaN, z: 0, radius: 1 }, { x: 0, z: Infinity, radius: 1 }, { x: 0, z: 0, radius: NaN });
  for (let step = 0; step < 300; step++) {
    const focus = new THREE.Vector3(step % 20 - 10, step % 5, step % 7);
    const bodies = step % 11 ? movers : movers.slice(0, step % 3);
    selection.update(focus, bodies, terrain, field);
    const expected = original(focus, bodies);
    expect(field.moverCount.value).toBe(expected.length);
    expect(field.movers.value.slice(0, expected.length).map(v => v.toArray())).toEqual(expected);
  }
  const ties = Array.from({ length: 12 }, (_, i) => ({ x: i % 2 ? -1 : 1, z: 0, radius: .1 + i / 20 }));
  const focus = new THREE.Vector3(0, 0, 0);
  selection.update(focus, ties, terrain, field);
  expect(field.movers.value.slice(0, field.moverCount.value).map(v => v.toArray())).toEqual(original(focus, ties));
  for (const x of [NaN, Infinity, -Infinity]) {
    const at = new THREE.Vector3(x, 0, 0); selection.update(at, movers, terrain, field);
    expect(field.moverCount.value).toBe(original(at, movers).length);
  }
});
