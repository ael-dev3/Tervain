import * as THREE from 'three';
import { mergeStaticParts } from './staticMerge';
import { CARAVAN_ANIMAL_REST as REST, caravanAnimalPoint } from '../world/caravanAnimal';
import type { Colliders } from '../world/colliders';
import type { Terrain } from '../world/terrain';
import type { SceneModule } from './context';
import { makeTexPair } from './buildingTextures';

/** A modest, physical caravan rest: hitching rail, two-compartment trough and strapped travel baggage. */
export function buildAnimalCamp(terrain: Pick<Terrain, 'heightAt'>, colliders: Colliders): SceneModule {
  const group = new THREE.Group(); group.name = 'Caravan mount / hitching rest';
  const pair = makeTexPair('planks', 256, 4), woodMap = pair.map.clone(), woodNormal = pair.normal.clone();
  woodMap.needsUpdate = woodNormal.needsUpdate = true;
  const wood = new THREE.MeshStandardMaterial({ color: 0xb8a084, map: woodMap, normalMap: woodNormal, roughness: .98, metalness: 0 });
  wood.normalScale.set(.5, .5);
  const iron = new THREE.MeshStandardMaterial({ color: 0x45443a, roughness: .87, metalness: .18 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x71543b, roughness: .96 });
  const strap = new THREE.MeshStandardMaterial({ color: 0x40382d, roughness: .98 });
  const feed = new THREE.MeshStandardMaterial({ color: 0xa49862, roughness: 1 });
  const water = new THREE.MeshStandardMaterial({ color: 0x546d62, roughness: .34, metalness: 0 });
  const materials = [wood, iron, leather, strap, feed, water], geometries = new Set<THREE.BufferGeometry>();
  let disposed = false;
  const mesh = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const object = new THREE.Mesh(geometry, material), point = caravanAnimalPoint(x, z);
    geometries.add(geometry); object.name = name; object.position.set(point.x, y, point.z); object.rotation.y = REST.yaw;
    object.castShadow = object.receiveShadow = true; group.add(object); return object;
  };
  const box = (name: string, w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) =>
    mesh(name, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  const support = (x: number, z: number, w: number, d: number) => {
    let high = -Infinity, low = Infinity;
    for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) {
      const point = caravanAnimalPoint(x + dx, z + dz), y = terrain.heightAt(point.x, point.z);
      high = Math.max(high, y); low = Math.min(low, y);
    }
    return { high, low };
  };
  const collider = (name: string, x: number, z: number, w: number, d: number, minY: number, maxY: number) => {
    const point = caravanAnimalPoint(x, z);
    colliders.box(`caravan-mount:${name}`, point.x, point.z, w / 2, d / 2, REST.yaw, true, { minY, maxY });
  };
  // Posts meet the same horizontal beam despite a sloping rest ground, with their closed bottoms buried in soil.
  const feet = [-REST.railHalfWidth, REST.railHalfWidth].map(x => ({ x, ...support(x, REST.railZ, .15, .15) }));
  const beamY = Math.max(...feet.map(foot => foot.high)) + 1.03;
  for (const foot of feet) {
    const bottom = foot.low - .03, top = beamY + .065;
    box(`hitching-post:${foot.x}`, .15, top - bottom, .15, wood, foot.x, (top + bottom) / 2, REST.railZ);
    collider(`post:${foot.x}`, foot.x, REST.railZ, .15, .15, bottom, top);
    box(`hitching-iron:${foot.x}`, .19, .045, .19, iron, foot.x, beamY - .15, REST.railZ);
  }
  box('hitching-rail', REST.railHalfWidth * 2 + .18, .13, .13, wood, 0, beamY, REST.railZ);
  collider('rail', 0, REST.railZ, REST.railHalfWidth * 2 + .18, .13, beamY - .065, beamY + .065);

  const t = REST.trough, footing = support(t.x, t.z, t.width, t.depth), bottom = footing.low - .02, floorY = footing.high + .08;
  box('trough-solid-base', t.width, floorY - bottom, t.depth, wood, t.x, (floorY + bottom) / 2, t.z);
  for (const x of [-t.width / 2 + .035, t.width / 2 - .035]) box(`trough-side:${x}`, .07, t.height, t.depth, wood, t.x + x, floorY + t.height / 2, t.z);
  for (const z of [-t.depth / 2 + .035, 0, t.depth / 2 - .035]) box(`trough-end:${z}`, t.width - .14, t.height, .07, wood, t.x, floorY + t.height / 2, t.z + z);
  const fillDepth = t.depth / 2 - .105;
  box('trough-grain', t.width - .15, .05, fillDepth, feed, t.x, floorY + .11, t.z - t.depth / 4);
  box('trough-water', t.width - .15, .025, fillDepth, water, t.x, floorY + .095, t.z + t.depth / 4);
  collider('trough', t.x, t.z, t.width, t.depth, bottom, floorY + t.height);

  const b = REST.baggage;
  for (const [i, z] of [b.z - .35, b.z + .35].entries()) {
    const ground = support(b.x, z, b.width, b.depth);
    const h = b.height - i * .045, y = ground.high + h / 2;
    box(`travel-pannier:${i}`, b.width, h, b.depth, leather, b.x, y, z);
    box(`pannier-bottom:${i}`, b.width - .08, ground.high - ground.low + .035, b.depth - .08, strap, b.x, (ground.high + ground.low) / 2, z);
    for (const x of [-.17, .17]) {
      box(`pannier-belt:${i}:${x}`, .04, h + .012, b.depth + .012, strap, b.x + x, y, z);
      box(`pannier-buckle:${i}:${x}`, .055, .07, .018, iron, b.x + x, y + .06, z + b.depth / 2 + .014);
    }
    box(`pannier-flap:${i}`, b.width + .015, .06, b.depth + .015, leather, b.x, ground.high + h - .015, z);
    collider(`pannier:${i}`, b.x, z, b.width + .015, b.depth + .05, ground.low - .018, ground.high + h + .015);
  }
  // Troughs, belts, buckles and flaps drawn as one mesh per material (A78).
  for (const mesh of mergeStaticParts(group)) geometries.add(mesh.geometry);
  return { group, update() {}, stats: () => ({ caravanMountProps: 6 }), dispose() {
    if (disposed) return; disposed = true;
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    woodMap.dispose(); woodNormal.dispose(); group.removeFromParent();
  } };
}
