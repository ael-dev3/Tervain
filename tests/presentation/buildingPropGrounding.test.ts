import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildStandard } from '../../src/presentation/buildings';
import { Ctx } from '../../src/presentation/buildKit';
import { Region } from '../../src/presentation/regions';
import { bySpec, type BuildingSpec } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';

const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });

function audit(b: BuildingSpec, terrain: Terrain, props: { x: number; z: number; footprint: number; material?: string }[]) {
  const region = new Region(b.id, new Ctx());
  buildStandard(region, terrain, b, { lanterns: [] });
  const group = region.toGroup({ get: () => material }); group.updateMatrixWorld(true);
  const point = (x: number, z: number) => new THREE.Vector3(b.x + x * Math.cos(b.yaw) + z * Math.sin(b.yaw), 0, b.z - x * Math.sin(b.yaw) + z * Math.cos(b.yaw));
  for (const prop of props) {
    const mesh = group.getObjectByName(`${b.id}:${prop.material ?? 'planks'}`)!;
    // Probe the actual bottom from below at the centre and four points around its standing footprint.
    for (const [dx, dz] of [[0, 0], [-prop.footprint, 0], [prop.footprint, 0], [0, -prop.footprint], [0, prop.footprint]]) {
      const p = point(prop.x + dx!, prop.z + dz!);
      const ground = terrain.heightAt(p.x, p.z);
      p.y = ground - 2;
      const bottom = new THREE.Raycaster(p, new THREE.Vector3(0, 1, 0)).intersectObject(mesh)[0];
      expect(bottom, `${b.id} prop ${prop.x},${prop.z} support ${dx},${dz}`).toBeDefined();
      expect(bottom!.point.y - ground, `${b.id} hovering edge`).toBeLessThanOrEqual(0.001);
      // A gentle grade should require a shallow embed, never an item buried out of view.
      expect(ground - bottom!.point.y).toBeLessThan(0.45);
    }
  }
  group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
}

describe('ordinary building exterior props meet their own terrain', () => {
  it.each([0, Math.PI / 2, -0.35])('grounds house barrels and sacks on a downhill shoulder at yaw %f', (yaw) => {
    const b = { ...bySpec('house_a'), x: 0, z: 0, yaw };
    const terrain = { heightAt: (x: number, z: number) => -0.12 * x - 0.18 * z } as unknown as Terrain;
    audit(b, terrain, [
      { x: -b.w / 2 + 0.7, z: b.d / 2 + 0.7, footprint: 0.26 },
      { x: -b.w / 2 + 1.5, z: b.d / 2 + 0.6, footprint: 0.08, material: 'cloth' },
    ]);
  });

  it.each([0, Math.PI / 2, -0.2])('grounds store cargo over its full footprint at yaw %f', (yaw) => {
    const b = { ...bySpec('quarry_office'), x: 0, z: 0, yaw };
    const terrain = { heightAt: (x: number, z: number) => 0.12 * x - 0.18 * z } as unknown as Terrain;
    audit(b, terrain, [
      { x: -b.w / 2 + 0.7, z: b.d / 2 + 0.6, footprint: 0.23 },
      { x: b.w / 2 - 0.9, z: b.d / 2 + 0.7, footprint: 0.18 },
      { x: b.w / 2 - 1.8, z: b.d / 2 + 0.75, footprint: 0.15 },
    ]);
  });

  it.each(['quarry_office', 'house_f', 'crew_bunks'])('removes the measured floating barrel at the actual %s terrain position', (id) => {
    const b = bySpec(id);
    audit(b, new Terrain(), [{ x: -b.w / 2 + 0.7, z: b.d / 2 + (b.kind === 'house' ? 0.7 : 0.6), footprint: b.kind === 'house' ? 0.26 : 0.23 }]);
  });
});
