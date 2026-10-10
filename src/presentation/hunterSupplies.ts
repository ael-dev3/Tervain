import * as THREE from 'three';
import { mergeStaticParts } from './staticMerge';
import { HUNTER_CAMP, HUNTER_SUPPLY, HUNTER_TABLE as T, hunterStationPoint } from '../world/layout';
import type { Terrain } from '../world/terrain';
import type { Colliders } from '../world/colliders';
import { makeTexPair } from './buildingTextures';
import type { PhysicalRockGeometry } from '../world/physicsGeometry';

/** Shared horizontal support plane: authored gear rests on the planks, never on the ground beneath them. */
export function hunterTableSurfaceY(terrain: Pick<Terrain, 'heightAt'>): number {
  let footing = -Infinity;
  for (const x of [-T.legX, T.legX]) for (const z of [-T.legZ, T.legZ]) {
    for (const dx of [-T.legWidth / 2, T.legWidth / 2]) for (const dz of [-T.legWidth / 2, T.legWidth / 2]) {
      const point = hunterStationPoint(x + dx, z + dz);
      footing = Math.max(footing, terrain.heightAt(point.x, point.z));
    }
  }
  return footing + T.topAboveFooting;
}

/** Closed, braced rustic counter with one readable board mounted behind its front face. */
export function buildHunterSupplies(terrain: Pick<Terrain, 'heightAt'>, colliders: Colliders): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Hunter’s supplies / woodland counter';
  const top = hunterTableSurfaceY(terrain);
  group.position.set(HUNTER_SUPPLY.x, top, HUNTER_SUPPLY.z);
  group.rotation.y = T.yaw;

  // Reuse the settlement's original weathered-wood artwork, with independently owned GPU maps.
  const pair = makeTexPair('planks', 256, 4);
  const map = pair.map.clone(), normalMap = pair.normal.clone();
  map.needsUpdate = normalMap.needsUpdate = true;
  const wood = new THREE.MeshStandardMaterial({ color: 0xc6b59b, map, normalMap, roughness: .98, metalness: 0 });
  wood.normalScale.set(.65, .65);
  const iron = new THREE.MeshStandardMaterial({ color: 0x34332b, roughness: .88, metalness: .25 });
  const clothPair = makeTexPair('cloth', 256, 4);
  const cloth = new THREE.MeshStandardMaterial({ color: 0x9b906f, map: clothPair.map.clone(), normalMap: clothPair.normal.clone(), roughness: 1, metalness: 0 });
  cloth.map!.needsUpdate = cloth.normalMap!.needsUpdate = true;
  cloth.normalScale.set(.4, .4);
  const hide = new THREE.MeshStandardMaterial({ color: 0x876348, roughness: .98, metalness: 0 });
  const cord = new THREE.MeshStandardMaterial({ color: 0xaa9772, roughness: 1, metalness: 0 });
  const solid = (name: string, width: number, height: number, depth: number, x: number, y: number, z: number, material: THREE.Material = wood) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.name = name; mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const collider = (id: string, width: number, height: number, depth: number, x: number, y: number, z: number) => {
    const point = hunterStationPoint(x, z);
    colliders.box(id, point.x, point.z, width / 2, depth / 2, T.yaw, true, { minY: top + y - height / 2, maxY: top + y + height / 2 });
  };
  const groundAt = (x: number, z: number) => {
    const point = hunterStationPoint(x, z);
    return terrain.heightAt(point.x, point.z) - top;
  };
  const fittedFoot = (x: number, z: number, width: number, depth = width) => {
    let ground = Infinity;
    for (const dx of [-width / 2, width / 2]) for (const dz of [-depth / 2, depth / 2]) ground = Math.min(ground, groundAt(x + dx, z + dz));
    return ground - .02;
  };
  const pole = (name: string, x: number, z: number, upper: number, width: number) => {
    const bottom = fittedFoot(x, z, width), height = upper - bottom;
    solid(name, width, height, width, x, (bottom + upper) / 2, z);
    collider(name, width, height, width, x, (bottom + upper) / 2, z);
  };

  // Complete plank volumes meet at their edges; no holes or overlapping cards form the worktop.
  const planks = 6, plankDepth = T.depth / planks;
  for (let i = 0; i < planks; i++) {
    const z = -T.depth / 2 + (i + .5) * plankDepth;
    solid(`hunter-table-plank-${i}`, T.width, T.topThickness, plankDepth, 0, -T.topThickness / 2, z);
  }
  collider('hunter_table_top', T.width, T.topThickness, T.depth, 0, -T.topThickness / 2, 0);
  for (const [i, x] of [-T.legX, T.legX].entries()) for (const [j, z] of [-T.legZ, T.legZ].entries()) {
    let ground = Infinity;
    for (const dx of [-T.legWidth / 2, T.legWidth / 2]) for (const dz of [-T.legWidth / 2, T.legWidth / 2]) {
      const point = hunterStationPoint(x + dx, z + dz);
      ground = Math.min(ground, terrain.heightAt(point.x, point.z));
    }
    const bottom = ground - top - .02, upper = -T.topThickness;
    const height = upper - bottom;
    solid(`hunter-table-leg-${i}-${j}`, T.legWidth, height, T.legWidth, x, (bottom + upper) / 2, z);
    collider(`hunter_table_leg_${i}_${j}`, T.legWidth, height, T.legWidth, x, (bottom + upper) / 2, z);
    solid(`hunter-table-fastener-${i}-${j}`, .065, .015, .065, x, .003, z, iron);
  }
  for (const z of [-T.legZ, T.legZ]) {
    solid(`hunter-table-long-rail-${z}`, T.legX * 2 + T.legWidth, .16, .09, 0, -.23, z);
    collider(`hunter_table_rail_${z}`, T.legX * 2 + T.legWidth, .16, .09, 0, -.23, z);
  }
  for (const x of [-T.legX, T.legX]) {
    solid(`hunter-table-short-rail-${x}`, .09, .16, T.legZ * 2 + T.legWidth, x, -.23, 0);
    collider(`hunter_table_crossrail_${x}`, .09, .16, T.legZ * 2 + T.legWidth, x, -.23, 0);
  }
  solid('hunter-table-low-stretcher', T.legX * 2, .11, .11, 0, -.66, 0);
  collider('hunter_table_stretcher', T.legX * 2, .11, .11, 0, -.66, 0);

  // Rowan works at this folded hide and cloth, beside the equipment the traveller can actually collect.
  for (let i = 0; i < 4; i++) solid(`hunter-mending-fold-${i}`, .30 - i * .018, .018, .34 - i * .015, 1.04, .009 + i * .018, 0, i === 3 ? hide : cloth);

  const shelter = HUNTER_CAMP.shelter;
  let shelterGround = -Infinity;
  for (const x of [-shelter.width / 2, shelter.width / 2]) for (const z of [-shelter.depth / 2, shelter.depth / 2]) {
    shelterGround = Math.max(shelterGround, groundAt(shelter.x + x, shelter.z + z));
  }
  for (const x of [-shelter.width / 2, shelter.width / 2]) for (const z of [-shelter.depth / 2, shelter.depth / 2]) {
    const upper = shelterGround + (z > 0 ? shelter.frontHeight : shelter.backHeight);
    pole(`hunter_shelter_post_${x}_${z}`, shelter.x + x, shelter.z + z, upper, .13);
  }
  for (const z of [-shelter.depth / 2, shelter.depth / 2]) {
    const y = shelterGround + (z > 0 ? shelter.frontHeight : shelter.backHeight) - .06;
    solid(`hunter-shelter-crossbeam-${z}`, shelter.width + .13, .12, .13, shelter.x, y, shelter.z + z);
    collider(`hunter_shelter_crossbeam_${z}`, shelter.width + .13, .12, .13, shelter.x, y, shelter.z + z);
  }
  const slope = (shelter.frontHeight - shelter.backHeight) / shelter.depth;
  const roofWidth = shelter.width + .44, horizontalDepth = shelter.depth + .46;
  const roof = solid('hunter-shelter-canvas-roof', roofWidth, .065, horizontalDepth * Math.sqrt(1 + slope * slope), shelter.x,
    shelterGround + (shelter.frontHeight + shelter.backHeight) / 2 + .03, shelter.z, cloth);
  roof.rotation.x = -Math.atan(slope);
  group.updateMatrixWorld(true);
  // Use the complete sloping roof triangles for player/cargo contact; a stepped ceiling would leave phantom edges.
  const roofPositions = roof.geometry.getAttribute('position'), positions = new Float32Array(roofPositions.count * 3), vertex = new THREE.Vector3();
  const roofBounds = new THREE.Box3();
  for (let i = 0; i < roofPositions.count; i++) {
    vertex.fromBufferAttribute(roofPositions, i).applyMatrix4(roof.matrixWorld);
    positions.set([vertex.x, vertex.y, vertex.z], i * 3); roofBounds.expandByPoint(vertex);
  }
  const roofContact: PhysicalRockGeometry = {
    id: 'hunter_shelter_roof', positions, indices: Uint32Array.from(roof.geometry.index?.array ?? Array.from({ length: roofPositions.count }, (_, i) => i)),
    bounds: { minX: roofBounds.min.x, minY: roofBounds.min.y, minZ: roofBounds.min.z, maxX: roofBounds.max.x, maxY: roofBounds.max.y, maxZ: roofBounds.max.z },
  };
  const shelterPoint = hunterStationPoint(shelter.x, shelter.z);
  // Keep roof contact out of the rock floor-dressing registry: canvas is not a boulder footprint.
  colliders.box(roofContact.id, shelterPoint.x, shelterPoint.z, roofWidth / 2, horizontalDepth / 2, T.yaw, true,
    { minY: roofBounds.min.y, maxY: roofBounds.max.y, rockMesh: roofContact });
  const backHeight = shelter.backHeight - .18;
  solid('hunter-shelter-back-canvas', shelter.width - .15, backHeight, .055, shelter.x, shelterGround + .06 + backHeight / 2, shelter.z - shelter.depth / 2 + .055, cloth);
  collider('hunter_shelter_back_canvas', shelter.width - .15, backHeight, .055, shelter.x, shelterGround + .06 + backHeight / 2, shelter.z - shelter.depth / 2 + .055);

  const matGeometry = new THREE.CapsuleGeometry(.38, 1.12, 3, 10);
  matGeometry.rotateX(Math.PI / 2); matGeometry.scale(1, .19, 1); matGeometry.computeBoundingBox();
  const matX = shelter.x, matZ = shelter.z - .45;
  let matGround = -Infinity;
  for (const dx of [-.38, 0, .38]) for (const dz of [-.94, 0, .94]) matGround = Math.max(matGround, groundAt(matX + dx, matZ + dz));
  const mat = new THREE.Mesh(matGeometry, cloth); mat.name = 'hunter-bedroll';
  mat.position.set(matX, matGround - matGeometry.boundingBox!.min.y + .005, matZ); mat.castShadow = mat.receiveShadow = true; group.add(mat);
  const pillow = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .68, 10), cloth);
  pillow.name = 'hunter-bedroll-pillow'; pillow.rotation.z = Math.PI / 2;
  pillow.position.set(matX, mat.position.y + .16, matZ - .63); pillow.castShadow = pillow.receiveShadow = true; group.add(pillow);

  // A real game-processing rack gives the camp a purpose: hung hides await treatment and trade.
  const rack = HUNTER_CAMP.dryingRack, rackGround = Math.max(groundAt(rack.x - rack.width / 2, rack.z), groundAt(rack.x + rack.width / 2, rack.z));
  const rackTop = rackGround + rack.height;
  for (const x of [-rack.width / 2, rack.width / 2]) pole(`hunter_drying_rack_post_${x}`, rack.x + x, rack.z, rackTop, .11);
  solid('hunter-drying-rack-top', rack.width + .16, .10, .11, rack.x, rackTop - .05, rack.z);
  collider('hunter_drying_rack_top', rack.width + .16, .10, .11, rack.x, rackTop - .05, rack.z);
  const hideOutline: [number, number][] = [[-.22, .4], [-.38, .34], [-.44, .14], [-.29, .04], [-.33, -.43], [-.15, -.62], [.13, -.65], [.30, -.46], [.27, .04], [.42, .14], [.36, .34], [.21, .4]];
  for (let i = 0; i < 3; i++) {
    const x = rack.x + (i - 1) * .90, centreY = rackTop - .67, z = rack.z + .035;
    const shape = new THREE.Shape(hideOutline.map(([px, py]) => new THREE.Vector2(px, py)));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: .018, steps: 1, bevelEnabled: true, bevelThickness: .005, bevelSize: .008, bevelSegments: 1, curveSegments: 1 });
    const skin = new THREE.Mesh(geometry, hide); skin.name = `hunter-drying-hide-${i}`;
    skin.position.set(x, centreY, z); skin.castShadow = skin.receiveShadow = true; group.add(skin);
    collider(`hunter_drying_hide_${i}`, .89, 1.07, .028, x, centreY - .125, z + .009);
    for (const side of [-1, 1]) {
      const string = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .27, 5), cord);
      string.name = `hunter-hide-tie-${i}-${side}`; string.position.set(x + side * .2, rackTop - .135, z + .01);
      string.castShadow = true; group.add(string);
    }
  }
  for (const [i, x] of [shelter.x - .6, shelter.x + .25].entries()) {
    const z = shelter.z + .95;
    let base = -Infinity;
    for (const dx of [-.36, .36]) for (const dz of [-.31, .31]) base = Math.max(base, groundAt(x + dx, z + dz));
    solid(`hunter-provisions-crate-${i}`, .72, .48, .62, x, base + .24, z);
    collider(`hunter_provisions_crate_${i}`, .72, .48, .62, x, base + .24, z);
    solid(`hunter-provisions-crate-lid-${i}`, .74, .035, .64, x, base + .4975, z);
    for (const side of [-1, 1]) solid(`hunter-provisions-crate-band-${i}-${side}`, .028, .49, .035, x + side * .28, base + .245, z + .325, iron);
    const sack = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 7), cloth);
    sack.name = `hunter-provisions-sack-${i}`; sack.scale.set(1, 1.3, .9);
    sack.position.set(x, base + .515 + .286, z); sack.castShadow = sack.receiveShadow = true; group.add(sack);
  }

  const signPoint = hunterStationPoint(T.signX, T.signZ - .1);
  const postBottom = terrain.heightAt(signPoint.x, signPoint.z) - top - .035;
  const postUpper = T.signCentreAboveTop + T.signHeight / 2 - .04;
  const postHeight = postUpper - postBottom;
  solid('hunter-sign-post', .11, postHeight, .11, T.signX, (postBottom + postUpper) / 2, T.signZ - .1);
  collider('hunter_board_post', .11, postHeight, .11, T.signX, (postBottom + postUpper) / 2, T.signZ - .1);
  solid('hunter-sign-board', T.signWidth, T.signHeight, T.signDepth, T.signX, T.signCentreAboveTop, T.signZ);
  collider('hunter_board', T.signWidth, T.signHeight, T.signDepth, T.signX, T.signCentreAboveTop, T.signZ);
  // Mounting blocks bridge the post-to-board gap behind the face; the post cannot cut through the lettering.
  for (const y of [T.signCentreAboveTop - .18, T.signCentreAboveTop + .18]) {
    solid(`hunter-sign-mount-${y}`, .18, .065, .065, T.signX, y, T.signZ - .066);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 448;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#4c3c29'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#9d8660'; context.lineWidth = 5; context.strokeRect(19, 18, 986, 412);
    context.fillStyle = '#f0dfb8'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = 'bold 62px Georgia'; context.fillText('ROWAN’S GAME CAMP', 512, 91);
    context.font = '45px Georgia'; context.fillText('Bow · Skinning knife · Arrows', 512, 192);
    context.fillText('Meat for Rillford: 2 coin each', 512, 277);
    context.font = '38px Georgia'; context.fillText('Bring a hide for six more arrows', 512, 365);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(T.signWidth - .09, T.signHeight - .065), new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }));
    label.name = 'hunter-sign-lettering';
    label.position.set(T.signX, T.signCentreAboveTop, T.signZ + T.signDepth / 2 + .002);
    label.receiveShadow = true;
    group.add(label);
    for (const x of [-T.signWidth / 2 + .075, T.signWidth / 2 - .075]) {
      solid(`hunter-sign-pin-${x}`, .018, .018, .008, x, T.signCentreAboveTop, T.signZ + T.signDepth / 2 + .003, iron);
    }
  }
  // Dozens of planks, legs, pins, ties and hides: drawn as one mesh per material, a few draws instead of about 60 in
  // the colour pass and as many again in the sun's shadow (A78).
  mergeStaticParts(group);
  return group;
}

/** Counter resources are owned by this module, separate from cached settlement materials. */
export function disposeHunterSupplies(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      const standard = material as THREE.MeshStandardMaterial;
      for (const texture of [standard.map, standard.normalMap]) if (texture) textures.add(texture);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}
