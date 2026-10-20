import * as THREE from 'three';
import { expect, it } from 'vitest';
import { meshyTreeTemplates, meshyTreeTemplate } from './meshyTreeFixture';
import { createMeshyForest, MESHY_TREE_LODS } from '../../src/presentation/meshyTrees';
import { groundedTreeY, seatTreeFlares, TREE_FLARE_MAX_SINK } from '../../src/presentation/treeGrounding';
import { Terrain } from '../../src/world/terrain';
import type { FloraTree } from '../../src/presentation/floraPopulation';
import type { TreeVariant } from '../../src/presentation/treeGen';

it('seats the displayed roots within the original cap without raising old seats or moving planting claims', async () => {
  const templates = new Map(await meshyTreeTemplates(['tree-0208']));
  templates.set('hero-oak-b', await Promise.all(MESHY_TREE_LODS.map(lod => meshyTreeTemplate(`../hero/hero-oak-b-${lod}.glb`))) as never);
  const forest = createMeshyForest(templates), terrain = new Terrain();
  const footprint = forest.footprint('oak', 1), rendered = forest.variant('oak', 1, 'hero-oak-b');
  const buried = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-.01, -100, -.01, .01, -100, -.01, 0, -100, .01], 3));
  const smaller: TreeVariant = { ...footprint, lods: [0, 1, 2].map(() => ({ wood: buried, leaf: null, tris: 1 })) as TreeVariant['lods'] };
  const poses = [
    { x: -153.84126710205845, z: 50.97761472273617, s: .9997050802316516, yaw: .8799843445715542, probe: [-153.13559912615818, 46.81427792209723] },
    { x: -121.24891903335272, z: 54.54132063213735, s: .9180886542871595, yaw: 6.223634928518714, probe: [-117.86223421234637, 56.77817936622598] },
    { x: -149.38447409311817, z: 64.81398542076349, s: .8060178429755434, yaw: 4.413138236807198, probe: [-147.29706669746793, 67.06619155039256] },
  ];
  const mesh = new THREE.Mesh(rendered.lods[0].wood!, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), ray = new THREE.Raycaster();
  const surfaceGap = (tree: FloraTree, probe: number[]) => {
    mesh.position.set(tree.x, tree.y, tree.z); mesh.rotation.y = tree.yaw; mesh.scale.setScalar(tree.s); mesh.updateMatrixWorld(true);
    let largest = -Infinity;
    for (let x = probe[0]! - .35; x <= probe[0]! + .35; x += .05) for (let z = probe[1]! - .35; z <= probe[1]! + .35; z += .05) {
      const ground = terrain.heightAt(x, z);
      ray.set(new THREE.Vector3(x, ground - 20, z), new THREE.Vector3(0, 1, 0));
      const hit = ray.intersectObject(mesh, false)[0];
      if (hit) largest = Math.max(largest, hit.point.y - ground);
    }
    return largest;
  };
  try {
    for (const pose of poses) {
      const plantingY = groundedTreeY(terrain, pose, footprint);
      const base = { ...pose, sp: 'oak', v: 1, y: plantingY, radius: 1, tint: 1, collisionId: null, decorationRank: 0 } satisfies FloraTree;
      const before = { ...base }, after = { ...base }, unchanged = { ...base }, smallerModel = { ...base };
      seatTreeFlares([before], terrain, () => footprint, () => false);
      seatTreeFlares([after], terrain, () => footprint, () => false, () => rendered);
      seatTreeFlares([unchanged], terrain, () => footprint, () => false, () => footprint);
      seatTreeFlares([smallerModel], terrain, () => footprint, () => false, () => smaller);
      expect(surfaceGap(before, pose.probe)).toBeGreaterThan(.08);
      expect(surfaceGap(after, pose.probe)).toBeLessThan(.08);
      expect(after.y).toBeLessThan(before.y);
      expect(after.y).toBeGreaterThanOrEqual(plantingY - TREE_FLARE_MAX_SINK);
      expect(unchanged.y).toBe(before.y); expect(smallerModel.y).toBe(before.y);
      for (const key of ['x', 'z', 's', 'yaw', 'radius', 'tint'] as const) expect(after[key]).toBe(base[key]);
    }
  } finally { mesh.material.dispose(); buried.dispose(); forest.dispose(); }
}, 120000);
