import * as THREE from 'three';
import type { HeroBones } from './bones';

interface Attachments {
  weapon: THREE.Group;
  scabbard: THREE.Group;
  sheathed: THREE.Group;
  sash: THREE.Mesh;
  materials: THREE.MeshStandardMaterial[];
}

function taperedPrism(sections: readonly [number, number, number][]): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (const [y, width, depth] of sections) vertices.push(-width, y, 0, 0, y, depth, width, y, 0, 0, y, -depth);
  for (let ring = 0; ring < sections.length - 1; ring++) for (let side = 0; side < 4; side++) {
    const a = ring * 4 + side, b = ring * 4 + (side + 1) % 4;
    indices.push(a, b, b + 4, a, b + 4, a + 4);
  }
  const end = (sections.length - 1) * 4;
  indices.push(0, 2, 1, 0, 3, 2, end, end + 1, end + 2, end, end + 2, end + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Existing inventory semantics: one plain wreck blade, no equipment or faction badge at arrival. */
export function createHeroAttachments(bones: HeroBones): Attachments {
  const steel = new THREE.MeshStandardMaterial({ color: 0x66605a, roughness: 0.76, metalness: 0.52 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x403a33, roughness: 0.7, metalness: 0.58 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x493323, roughness: 0.91 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, side: THREE.DoubleSide });
  const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial, y = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const hilt = () => {
    const holder = new THREE.Group();
    add(holder, new THREE.BoxGeometry(0.21, 0.025, 0.033), darkSteel, 0.074);
    add(holder, new THREE.CylinderGeometry(0.015, 0.017, 0.125, 8), leather, -0.002);
    add(holder, new THREE.IcosahedronGeometry(0.027, 0), darkSteel, -0.077);
    return holder;
  };
  const weapon = hilt();
  weapon.name = 'Hero / wreck blade in hand';
  add(weapon, taperedPrism([
    [0.086, 0.023, 0.0048], [0.2, 0.021, 0.0046], [0.33, 0.02, 0.0043],
    [0.46, 0.018, 0.004], [0.59, 0.017, 0.0037], [0.72, 0.015, 0.0034], [0.86, 0.0005, 0.0005],
  ]), steel);
  const socket = new THREE.Group();
  socket.name = 'Hero / right palm equipment socket';
  socket.position.set(0, 0.055, 0);
  // The hand's local Y follows the fingers; local Z faces forward. Blade +Y goes along local +Z.
  socket.rotation.x = Math.PI / 2;
  bones['hand.R'].add(socket);
  socket.add(weapon);

  const scabbard = new THREE.Group();
  scabbard.name = 'Hero / hip scabbard';
  scabbard.position.set(0.332, 0.11, 0.02);
  scabbard.rotation.set(0.3, 0, 0.14);
  bones.pelvis.add(scabbard);
  add(scabbard, taperedPrism([[-0.8, 0.013, 0.008], [-0.66, 0.025, 0.012], [0, 0.034, 0.014]]), leather);
  add(scabbard, new THREE.BoxGeometry(0.074, 0.045, 0.034), darkSteel, -0.023);
  add(scabbard, new THREE.BoxGeometry(0.035, 0.06, 0.022), darkSteel, -0.772);
  add(scabbard, new THREE.BoxGeometry(0.034, 0.075, 0.038), leather, 0.032);
  const sheathed = hilt();
  sheathed.name = 'Hero / sheathed blade hilt';
  sheathed.rotation.x = Math.PI;
  scabbard.add(sheathed);

  // The optional earned standing band follows the pelvis and sits over the coat's belt line.
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.297, 0.3, 0.049, 24, 1, true), cloth);
  sash.name = 'Hero / earned standing band';
  sash.scale.z = 0.7;
  sash.position.set(0, 0.11, 0.009);
  sash.castShadow = sash.receiveShadow = true;
  bones.pelvis.add(sash);
  weapon.visible = scabbard.visible = sheathed.visible = sash.visible = false;
  return { weapon, scabbard, sheathed, sash, materials: [steel, darkSteel, leather, cloth] };
}
