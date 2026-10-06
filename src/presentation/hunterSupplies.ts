import * as THREE from 'three';
import { HUNTER_SUPPLY } from '../world/layout';
import type { Terrain } from '../world/terrain';
import type { Colliders } from '../world/colliders';

/** A readable trail sign beside the three independently collectable pieces of hunting equipment. */
export function buildHunterSupplies(terrain: Terrain, colliders: Colliders): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Hunter’s supplies / trail sign';
  const x = HUNTER_SUPPLY.x + .8, z = HUNTER_SUPPLY.z + .65, y = terrain.groundAt(x, z);
  group.position.set(x, y, z); group.rotation.y = -.4;
  const wood = new THREE.MeshStandardMaterial({ color: 0x66503a, roughness: .98 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(.09, 1.4, .09), wood);
  post.position.y = .7;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.05, .55, .055), wood);
  board.position.y = 1.25;
  group.add(post, board);
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#493b2b'; context.fillRect(0, 0, 512, 256);
    context.fillStyle = '#f0dfb8'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = 'bold 34px Georgia'; context.fillText('HUNTER’S SUPPLIES', 256, 49);
    context.font = '25px Georgia'; context.fillText('Take the bow, knife & arrows', 256, 108);
    context.fillText('1 hide buys 6 arrows', 256, 161);
    context.font = '23px Georgia'; context.fillText('Head: 1 shot · Body: 2 shots', 256, 215);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1, .5), new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }));
    label.position.set(0, 1.25, .0285); group.add(label);
  }
  group.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true; });
  colliders.add({ id: 'hunter_board', kind: 'box', x, z, hw: .525, hd: .028, yaw: -.4, active: true, minY: y + .975, maxY: y + 1.525 });
  colliders.add({ id: 'hunter_board_post', kind: 'box', x, z, hw: .045, hd: .045, yaw: -.4, active: true, minY: y, maxY: y + 1.4 });
  return group;
}
