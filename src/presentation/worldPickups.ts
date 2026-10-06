import * as THREE from 'three';
import { isWorldPickupItem, WORLD_PICKUP_ITEM_IDS, type WorldPickupItem } from '../content/pickups';
import { WORLD, type PICKUP_LOCATIONS } from '../world/layout';
import type { Terrain } from '../world/terrain';
import { Ctx } from './buildKit';
import { Region, type MatKey } from './regions';
import { hunterTableSurfaceY } from './hunterSupplies';

type PickupPoint = typeof PICKUP_LOCATIONS[number];
type MeshLink = { mesh: THREE.InstancedMesh; index: number; matrix: THREE.Matrix4 };
const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

// Authored meshes were enlarged for spotting them from afar. Keep their rich silhouettes,
// but use hand-sized food and plants alongside the 1.90 m Wanderer. Interaction still uses
// the actual grounded bounds, so the smaller item has no floating target or enlarged proxy.
const HAND_SCALE: Record<WorldPickupItem, number> = {
  shore_apple: 0.34, bread: 0.65, healing_herb: 0.78, field_mushroom: 0.28, iron_scrap: 1,
  hunting_bow: 1, skinning_knife: 1, arrow: 1,
};

/** Original closed-volume silhouettes, including the three pieces of the hunter's kit. */
export function pickupGeometry(item: WorldPickupItem): { geometry: THREE.BufferGeometry; material: MatKey } {
  const r = new Region(`loose-${item}`, new Ctx());
  const b = r.vc;
  if (item === 'shore_apple') {
    b.blob(0.21, 0.19, 0.19, 0, 0.19, 0, 0xb24a32, { seg: 10, rings: 6, lump: 0.035, seed: 29, smooth: true });
    b.rod(0, 0.35, 0, 0.035, 0.42, 0.006, 0.02, 5, 0x4b3821);
    b.blob(0.09, 0.015, 0.04, 0.083, 0.379, 0.006, 0x587044, { seg: 6, rings: 3, lump: 0, seed: 31, rz: -0.25 });
  } else if (item === 'bread') {
    b.blob(0.38, 0.135, 0.22, 0, 0.136, 0, 0xb99460, { seg: 12, rings: 6, lump: 0.035, seed: 43, smooth: true });
    // Scored crust is sculpted shallowly into the top as dark inset lozenges, rather than hovering cards.
    for (const x of [-0.18, 0, 0.18]) b.blob(0.024, 0.012, 0.14, x, 0.258 - Math.abs(x) * 0.12, 0, 0x715735, { seg: 5, rings: 3, lump: 0, seed: 42, ry: 0.38 });
  } else if (item === 'healing_herb') {
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3, sx = Math.cos(a) * 0.095, sz = Math.sin(a) * 0.095;
      const top = 0.64 + i * 0.035;
      b.rod(sx * 0.3, -0.02, sz * 0.3, sx, top, sz, 0.017, 5, 0x52693b, { rEnd: 0.009 });
      for (let j = 0; j < 3; j++) for (const side of [-1, 1]) {
        const h = 0.12 + j * 0.145, aa = a + side * 1.2;
        const lx = sx * h / top + Math.cos(aa) * 0.14, lz = sz * h / top + Math.sin(aa) * 0.14;
        b.rod(sx * h / top, h, sz * h / top, lx, h + 0.025, lz, 0.009, 4, 0x52693b);
        b.blob(0.14, 0.025, 0.053, lx, h + 0.025, lz, j % 2 ? 0x798749 : 0x637a42, { seg: 6, rings: 3, lump: 0, seed: j + i * 5, ry: -aa, rz: side * 0.17 });
      }
      // Small pale blossoms distinguish the herb from ordinary grass, including on the low preset.
      b.blob(0.074, 0.036, 0.074, sx, top + 0.018, sz, 0xc3bf8e, { seg: 7, rings: 3, lump: 0.14, seed: i + 91 });
      b.blob(0.029, 0.023, 0.029, sx, top + 0.047, sz, 0xb39b52, { seg: 5, rings: 3, lump: 0, seed: i });
    }
  } else if (item === 'field_mushroom') {
    b.lathe([0, 0, 0.11, 0, 0.135, 0.08, 0.085, 0.33, 0.13, 0.42, 0, 0.42], 10, 0, 0, 0, 0xc0b18b);
    b.lathe([0, 0.41, 0.29, 0.41, 0.34, 0.47, 0.29, 0.56, 0.19, 0.62, 0, 0.66], 12, 0, 0, 0, 0x996c42);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5, rr = i % 2 ? 0.18 : 0.12;
      b.blob(0.035, 0.009, 0.027, Math.cos(a) * rr, 0.645 - rr * 0.27, Math.sin(a) * rr, 0xbdac83, { seg: 5, rings: 3, lump: 0, seed: i });
    }
  } else if (item === 'hunting_bow') {
    // A hand-carved 1.3 m bow laid on its side: solid wooden limbs, a pale string and a wrapped grip.
    const segments = 12;
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments, t1 = (i + 1) / segments;
      const x0 = Math.sin(t0 * Math.PI) * 0.25, x1 = Math.sin(t1 * Math.PI) * 0.25;
      b.rod(x0, 0.039, (t0 - .5) * 1.28, x1, 0.039, (t1 - .5) * 1.28, .019, 6, 0x856345);
    }
    b.rod(0, .039, -.64, 0, .039, .64, .0055, 5, 0xdfd1ae);
    for (let i = -3; i <= 3; i++) {
      const z = i * .022, x = Math.cos(z / 1.28 * Math.PI) * .25;
      b.rod(x, .039, z - .008, x, .039, z + .008, .026, 6, i % 2 ? 0x4d3e31 : 0xada084);
    }
  } else if (item === 'skinning_knife') {
    b.rod(0, .042, -.19, 0, .042, -.035, .032, 8, 0x594332);
    b.rod(0, .042, -.055, 0, .042, -.031, .037, 8, 0xa89c7c);
    b.rod(0, .042, -.199, 0, .042, -.185, .034, 8, 0x9e987f);
    b.ctx.push(0, .042, 0, 0, Math.PI / 2);
    b.prism([[-.032, -.035], [.032, -.035], [.032, .16], [0, .26], [-.032, .16]], -.009, .009, 0xb7bbb5);
    b.ctx.pop();
  } else if (item === 'arrow') {
    // Six physical arrows make a bundled silhouette; the inventory quantity remains the authored pickup quantity.
    for (const y of [.028, .055]) for (const x of [-.035, 0, .035]) {
      const shift = y > .04 ? .014 : 0;
      b.rod(x, y, -.32 + shift, x, y, .27 + shift, .008, 6, 0xb5a076);
      b.rod(x, y, .27 + shift, x, y, .34 + shift, .017, 4, 0x8f9795, { rEnd: 0 });
      b.box(.025, .012, .065, x, y + .009, -.272 + shift, 0xbab1a0, { ry: .12 });
      b.box(.018, .025, .065, x, y, -.272 + shift, 0x756a58, { ry: -.12 });
    }
    for (const z of [-.075, .09]) {
      b.rod(-.055, .069, z, .055, .069, z, .013, 6, 0x746249);
      b.rod(-.055, .012, z, -.055, .069, z, .011, 5, 0x746249);
      b.rod(.055, .012, z, .055, .069, z, .011, 5, 0x746249);
    }
  } else {
    const iron = r.metal;
    iron.box(0.45, 0.055, 0.16, 0, 0.007, 0, 0x646962, { ry: 0.14, rz: -0.025, jit: 0.06 });
    iron.box(0.1, 0.12, 0.18, -0.18, 0.045, 0, 0x716453, { rz: -0.26, jit: 0.04 });
    iron.rod(-0.08, 0.03, -0.18, 0.18, 0.15, 0.17, 0.021, 6, 0x766b58, { jit: 0.035 });
    iron.box(0.13, 0.035, 0.08, 0.18, 0.145, 0.17, 0x625e50, { ry: -0.2, jit: 0.03 });
  }
  const material: MatKey = item === 'iron_scrap' ? 'metal' : 'vc';
  const geometry = r.get(material).toGeometry()!;
  const scale = HAND_SCALE[item];
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, material };
}

/** Clip a 3D face at an x/z terrain boundary, preserving its height along every cut edge. */
function clipFace(face: readonly THREE.Vector3[], nx: number, nz: number, offset: number): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];
  for (let i = 0; i < face.length; i++) {
    const a = face[i]!, b = face[(i + 1) % face.length]!;
    const da = nx * a.x + nz * a.z - offset, db = nx * b.x + nz * b.z - offset;
    if (da <= 0) result.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) result.push(a.clone().lerp(b, da / (da - db)));
  }
  return result;
}

/** The minimum gap is at a face vertex or a cut by the rendered terrain's square/diagonal edges. */
function minimumGroundGap(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, terrain: Pick<Terrain, 'heightAt'>): number {
  const positions = geometry.getAttribute('position'), indices = geometry.index;
  const count = indices?.count ?? positions.count;
  let gap = Infinity;
  for (let i = 0; i < count; i += 3) {
    const face = [0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(positions, indices?.getX(i + j) ?? i + j).applyMatrix4(matrix));
    const i0 = Math.floor((Math.min(...face.map((v) => v.x)) - WORLD.minX) / WORLD.cell);
    const i1 = Math.floor((Math.max(...face.map((v) => v.x)) - WORLD.minX) / WORLD.cell);
    const j0 = Math.floor((Math.min(...face.map((v) => v.z)) - WORLD.minZ) / WORLD.cell);
    const j1 = Math.floor((Math.max(...face.map((v) => v.z)) - WORLD.minZ) / WORLD.cell);
    for (let row = j0; row <= j1; row++) for (let column = i0; column <= i1; column++) {
      const x = WORLD.minX + column * WORLD.cell, z = WORLD.minZ + row * WORLD.cell;
      let cellFace = clipFace(face, -1, 0, -x);
      cellFace = clipFace(cellFace, 1, 0, x + WORLD.cell);
      cellFace = clipFace(cellFace, 0, -1, -z);
      cellFace = clipFace(cellFace, 0, 1, z + WORLD.cell);
      for (const side of [-1, 1]) {
        const half = clipFace(cellFace, side, side, side * (x + z + WORLD.cell));
        for (const vertex of half) gap = Math.min(gap, vertex.y - terrain.heightAt(vertex.x, vertex.z));
      }
    }
  }
  return gap;
}

/** Align with the ground normal and rest the solid on the exact rendered terrain, including cuts through a face. */
export function pickupPlacement(geometry: THREE.BufferGeometry, terrain: Pick<Terrain, 'heightAt' | 'normalAt'>, point: Pick<PickupPoint, 'x' | 'z' | 'yaw' | 'support'>): THREE.Matrix4 {
  if (point.support === 'hunter_table') {
    geometry.computeBoundingBox();
    const orientation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), point.yaw ?? 0);
    const position = new THREE.Vector3(point.x, hunterTableSurfaceY(terrain) - geometry.boundingBox!.min.y + .0005, point.z);
    return new THREE.Matrix4().compose(position, orientation, new THREE.Vector3(1, 1, 1));
  }
  const normal = new THREE.Vector3(...terrain.normalAt(point.x, point.z));
  const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), point.yaw ?? 0));
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(point.x, terrain.heightAt(point.x, point.z), point.z), orientation, new THREE.Vector3(1, 1, 1));
  matrix.elements[13]! -= minimumGroundGap(geometry, matrix, terrain);
  return matrix;
}

/** One draw per pickup item silhouette, while each persistent placement retains its individual identity. */
export function buildWorldPickups(terrain: Pick<Terrain, 'heightAt' | 'normalAt'>, points: readonly PickupPoint[], mats: { get(key: MatKey): THREE.Material }) {
  const group = new THREE.Group(); group.name = 'loose-world-pickups';
  const objects: Record<string, THREE.Object3D> = {};
  for (const item of WORLD_PICKUP_ITEM_IDS) {
    const locations = points.filter((point) => point.item === item);
    if (!locations.length) continue;
    const { geometry, material } = pickupGeometry(item);
    const mesh = new THREE.InstancedMesh(geometry, mats.get(material), locations.length);
    mesh.name = `loose-${item}`; mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (const [index, point] of locations.entries()) {
      const matrix = pickupPlacement(geometry, terrain, point);
      mesh.setMatrixAt(index, matrix);
      const object = new THREE.Object3D(); object.name = `pickup-${point.id}`;
      object.position.set(point.x, matrix.elements[13]!, point.z);
      object.userData.pickupInstance = { mesh, index, matrix } satisfies MeshLink;
      const centre = geometry.boundingBox!.getCenter(new THREE.Vector3()).applyMatrix4(matrix);
      object.userData.pickupTargetY = centre.y;
      objects[point.id] = object;
      group.add(object);
    }
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return { group, objects };
}

/** Immediately hides a taken instance; legacy quest pickup groups follow their existing visibility contract. */
export function setPickupVisible(object: THREE.Object3D, visible: boolean): void {
  if (object.visible === visible) return;
  object.visible = visible;
  const link = object.userData.pickupInstance as MeshLink | undefined;
  if (!link) return;
  link.mesh.setMatrixAt(link.index, visible ? link.matrix : hiddenMatrix);
  link.mesh.instanceMatrix.needsUpdate = true;
}

export function worldPickupTargetY(object: THREE.Object3D | undefined): number | undefined {
  const y = object?.userData.pickupTargetY as unknown;
  return typeof y === 'number' && Number.isFinite(y) ? y : undefined;
}

export { isWorldPickupItem };
