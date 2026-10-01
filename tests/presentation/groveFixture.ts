import * as THREE from 'three';
import { MENU_CAMERA, MENU_TREE, menuHeight } from '../../src/presentation/menu/menuLayout';
import { restHeight } from '../../src/presentation/menu/menuLand';
import { TREE_HOLLOW, buildAncientTree, type AncientTree } from '../../src/presentation/menu/menuTree';
import { HERMIT_DOOR } from '../../src/presentation/menu/menuCamp';
import type { GroveWorld } from '../../src/presentation/menu/menuGrove';

/** The menu's ancient tree, placed and doored exactly as MenuScene places it, and the grove world built from it. */
export interface GroveFixture {
  tree: AncientTree;
  treeRoot: THREE.Group;
  world: GroveWorld;
  dispose(): void;
}

let cached: GroveFixture | null = null;

export function menuGroveFixture(): GroveFixture {
  if (cached) return cached;
  const treeRoot = new THREE.Group();
  const ty = restHeight(MENU_TREE.x, MENU_TREE.z, 2.5) + 0.1;
  treeRoot.position.set(MENU_TREE.x, ty, MENU_TREE.z);
  treeRoot.rotation.y = 0.35;
  treeRoot.updateMatrixWorld(true);
  const tmp = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const ground = (x: number, z: number) => {
    treeRoot.localToWorld(tmp.set(x, 0, z));
    return menuHeight(tmp.x, tmp.z) - ty;
  };
  const yaw = Math.atan2(MENU_CAMERA.x - MENU_TREE.x, MENU_CAMERA.z - MENU_TREE.z) - 0.27;
  const direction = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).applyAxisAngle(up, -treeRoot.rotation.y);
  const tree = buildAncientTree(1207, {
    leafCards: 0,
    door: { az: Math.atan2(direction.z, direction.x), halfWidth: HERMIT_DOOR.faceHalfWidth, height: HERMIT_DOOR.faceTop,
      opening: { width: HERMIT_DOOR.width, height: HERMIT_DOOR.height } },
    ground,
  });
  const world: GroveWorld = {
    trunk: tree.trunk,
    capsules: tree.capsules,
    leafSites: tree.leafSites,
    ground,
    door: tree.door!,
    aperture: { width: HERMIT_DOOR.width, height: HERMIT_DOOR.height, hingeZ: HERMIT_DOOR.hingeZ },
    hollow: TREE_HOLLOW,
    lanterns: [],
    boughs: tree.lowBoughs.map((b) => ({ p: b.p, r: b.r })),
  };
  cached = { tree, treeRoot, world, dispose() { tree.wood.dispose(); tree.leaves.dispose(); } };
  return cached;
}
