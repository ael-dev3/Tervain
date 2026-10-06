import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { authorMillWheel, authorMillWheelSupports } from '../../src/presentation/millWheel';
import { Ctx } from '../../src/presentation/buildKit';
import { Region } from '../../src/presentation/regions';
import { buildStaticColliders } from '../../src/world/colliders';
import { MILL_WHEEL, bySpec } from '../../src/world/layout';
import { MILL_WHEEL_CONSTRUCTION as C, millWheelPlacement } from '../../src/world/millWheel';
import { Terrain } from '../../src/world/terrain';
import { WaterWorld } from '../../src/world/water/waterWorld';

const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
const terrain = new Terrain();

function wheel() {
  const region = new Region('wheel', new Ctx());
  const placement = authorMillWheel(region, terrain);
  const group = region.toGroup({ get: () => material });
  return { region, placement, group };
}

describe('the water mill is a grounded, connected rotating assembly', () => {
  it('clears the actual triangle terrain through a full rotation and matches its finite obstacle envelope', () => {
    const { group, placement } = wheel();
    const obstacle = buildStaticColliders(terrain).all.find((c) => c.id === 'mill_pit')!;
    let lowestClearance = Infinity, envelopeError = -Infinity;
    for (let i = 0; i < 96; i++) {
      const a = i / 96 * Math.PI * 2, cosine = Math.cos(a), sine = Math.sin(a);
      group.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const p = o.geometry.getAttribute('position');
        for (let j = 0; j < p.count; j++) {
          const x = placement.x + p.getX(j), y = placement.y + p.getY(j) * cosine - p.getZ(j) * sine, z = placement.z + p.getY(j) * sine + p.getZ(j) * cosine;
          lowestClearance = Math.min(lowestClearance, y - terrain.heightAt(x, z));
          // The shaft has its own volume; the disk contains every rim/spoke/paddle vertex at every phase.
          if (Math.abs(p.getX(j)) <= C.halfWidth) {
            envelopeError = Math.max(envelopeError, obstacle.minY! - y, y - obstacle.maxY!, Math.abs(z - placement.z) - MILL_WHEEL.r);
          }
        }
      });
    }
    expect(lowestClearance).toBeGreaterThan(0.02);
    expect(envelopeError).toBeLessThanOrEqual(1e-6);
    group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
  });

  it.each([0.62, 0.85])('the lowest real paddle tips reach the race\'s solved water at turning flow %f without touching the bed', (flow) => {
    const { group, placement } = wheel();
    // The shared water model, eased to this flow: the surface the race is drawn with and floating things ride on.
    const water = new WaterWorld(terrain);
    for (let i = 0; i < 400; i++) water.update(0.1, { spring: 1, main: 1, village: flow, quarry: 0.3 });
    let deepestWetTip = -Infinity, bedClearance = Infinity;
    for (let phase = 0; phase < 24; phase++) {
      const angle = phase / 24 * Math.PI * 2;
      const vertices = (group.getObjectByName('wheel:planks') as THREE.Mesh).geometry.getAttribute('position');
      for (let i = 0; i < vertices.count; i++) {
        const x = placement.x + vertices.getX(i), y = placement.y + vertices.getY(i) * Math.cos(angle) - vertices.getZ(i) * Math.sin(angle), z = placement.z + vertices.getY(i) * Math.sin(angle) + vertices.getZ(i) * Math.cos(angle);
        if (y > terrain.heightAt(x, z) + 1.1) continue;
        bedClearance = Math.min(bedClearance, y - terrain.heightAt(x, z));
        const sample = water.sample(x, z);
        if (sample?.body === 'village') deepestWetTip = Math.max(deepestWetTip, sample.surface - y);
      }
    }
    expect(deepestWetTip).toBeGreaterThan(0.05);
    expect(deepestWetTip).toBeLessThan(0.3);
    expect(bedClearance).toBeGreaterThan(0.02);
    group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
  });

  it('the shaft enters the real mill wall and its outer bearing has planted posts below the axle', () => {
    const p = millWheelPlacement(terrain), mill = bySpec('mill');
    expect(p.x + p.innerAxle).toBeLessThan(mill.x + mill.w / 2);
    expect(C.outerAxle).toBeGreaterThan(C.bearingX);
    const region = new Region('supports', new Ctx()); authorMillWheelSupports(region, terrain);
    const group = region.toGroup({ get: () => material }); group.updateMatrixWorld(true);
    const timber = group.getObjectByName('supports:timber')!;
    for (const dz of [-0.58, 0.58]) {
      const x = p.x + C.bearingX, z = p.z + dz, floor = terrain.heightAt(x, z);
      const bottom = new THREE.Raycaster(new THREE.Vector3(x, floor - 1, z), new THREE.Vector3(0, 1, 0)).intersectObject(timber)[0];
      expect(bottom).toBeDefined(); expect(bottom!.point.y).toBeLessThan(floor);
      const top = new THREE.Raycaster(new THREE.Vector3(x, p.y + 1, z), new THREE.Vector3(0, -1, 0)).intersectObject(timber)[0];
      expect(top).toBeDefined(); expect(top!.point.y).toBeGreaterThanOrEqual(p.y - 0.001);
    }
    group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
  });
});
