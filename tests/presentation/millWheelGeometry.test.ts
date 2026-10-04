import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { authorMillWheel, authorMillWheelSupports } from '../../src/presentation/millWheel';
import { Ctx } from '../../src/presentation/buildKit';
import { Region } from '../../src/presentation/regions';
import { buildWater } from '../../src/presentation/waterMesh';
import { buildStaticColliders } from '../../src/world/colliders';
import { MILL_WHEEL, bySpec } from '../../src/world/layout';
import { MILL_WHEEL_CONSTRUCTION as C, millWheelPlacement } from '../../src/world/millWheel';
import { Terrain } from '../../src/world/terrain';

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

  it.each([0.62, 0.85])('the lowest real paddle tips reach actual household water at turning flow %f without touching the bed', (flow) => {
    const { group, placement } = wheel();
    const water = buildWater(terrain);
    const geo = water.ribbons.village.mesh.geometry.clone();
    const p = geo.getAttribute('position'), bed = geo.getAttribute('aBed'), level = geo.getAttribute('aLevel');
    const across = geo.getAttribute('aAcross'), half = geo.getAttribute('aHalf'), perpendicular = geo.getAttribute('aPerp');
    // Match the shader's managed width and level at both allocations that turn the mill; cosmetic waves are disabled.
    const width = 0.18 + 0.82 * THREE.MathUtils.smoothstep(flow, 0.02, 0.75);
    for (let i = 0; i < p.count; i++) {
      const shift = across.getX(i) * half.getX(i) * (width - 1);
      p.setX(i, p.getX(i) + perpendicular.getX(i) * shift);
      p.setZ(i, p.getZ(i) + perpendicular.getY(i) * shift);
      p.setY(i, bed.getX(i) + level.getX(i) * (0.25 + 0.75 * flow));
    }
    const surface = new THREE.Mesh(geo, material); surface.updateMatrixWorld(true);
    let deepestWetTip = -Infinity;
    for (let phase = 0; phase < 24; phase++) {
      const angle = phase / 24 * Math.PI * 2;
      const vertices = (group.getObjectByName('wheel:planks') as THREE.Mesh).geometry.getAttribute('position');
      for (let i = 0; i < vertices.count; i++) {
        const x = placement.x + vertices.getX(i), y = placement.y + vertices.getY(i) * Math.cos(angle) - vertices.getZ(i) * Math.sin(angle), z = placement.z + vertices.getY(i) * Math.sin(angle) + vertices.getZ(i) * Math.cos(angle);
        if (y > 1.1) continue;
        const hit = new THREE.Raycaster(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0)).intersectObject(surface)[0];
        if (hit && hit.point.y > terrain.heightAt(x, z)) deepestWetTip = Math.max(deepestWetTip, hit.point.y - y);
      }
    }
    expect(deepestWetTip).toBeGreaterThan(0.005);
    expect(deepestWetTip).toBeLessThan(0.18);
    geo.dispose(); water.dispose(); group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
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
