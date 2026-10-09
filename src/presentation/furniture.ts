import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FURNITURE, pieceSize, type FurniturePlacement } from '../world/furniture';
import { FURNITURE_SIZES, type FurnitureId } from '../world/furnitureSizes';
import { fromBuildingLocal, hearthOf, type InteriorSpec, type RoomLocator } from '../world/interiors';
import { modelAssetUrl } from './assets/modelUrl';
import { observeModelLoad, withModelLoadSlot, type ModelLoadProgress } from './assets/modelLoadQueue';
import { downloadAsset } from './assets/download';
import type { FrameContext, SceneModule } from './context';
import { roughnessFloor } from './matte';

/**
 * The rooms' furniture, drawn (A66): the prepared Meshy pieces in public/models/furniture, placed as world/furniture.ts
 * places them (the colliders use the same placements). One instanced mesh per kind of piece. A room is drawn only while
 * it can be seen into: the camera is inside it, or near it while its door stands open (its windows show the daylight,
 * not the room).
 */
export interface FurniturePiece { id: FurnitureId; file: string; bytes: number; sha256: string; triangles: number; size: [number, number, number] }
export interface FurnitureManifest { schema: 1; pieces: FurniturePiece[] }
export type FurnitureTemplates = Map<FurnitureId, THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>;

/** An open room's furniture is drawn while the camera or the wanderer is within this distance of its middle, metres. */
const DRAW_RANGE = 34;
/** Every piece stays under this many triangles. */
export const FURNITURE_TRIANGLE_LIMIT = 6000;

const url = (file: string) => modelAssetUrl(`furniture/${file}`, import.meta.env.BASE_URL, document.baseURI);

const fetchChecked = (file: string, bytes?: number, sha256?: string): Promise<ArrayBuffer> =>
  downloadAsset(url(file), { label: `Furniture ${file}`, bytes, sha256, holds: 'data' });

/** A prepared piece's one mesh, checked against its budget. */
function pieceMesh(id: FurnitureId, gltf: GLTF) {
  let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null = null;
  gltf.scene.traverse((object) => {
    const candidate = object as THREE.Mesh;
    if (!candidate.isMesh) return;
    if (mesh || Array.isArray(candidate.material) || !(candidate.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) throw new Error(`Furniture ${id} needs one textured mesh.`);
    mesh = candidate as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  });
  if (!mesh) throw new Error(`Furniture ${id} has no mesh.`);
  const found = mesh as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const triangles = (found.geometry.index?.count ?? found.geometry.getAttribute('position').count) / 3;
  if (triangles > FURNITURE_TRIANGLE_LIMIT) throw new Error(`Furniture ${id} exceeds its ${FURNITURE_TRIANGLE_LIMIT}-triangle budget.`);
  return found;
}

let pending: Promise<FurnitureTemplates> | null = null;

/** Required art: every piece the rooms use, checked by size and hash. A failure reaches the loading screen's Retry. */
export function loadFurniture(progress?: ModelLoadProgress): Promise<FurnitureTemplates> {
  if (pending) return observeModelLoad(pending, progress);
  pending = (async () => {
    const manifest = JSON.parse(new TextDecoder().decode(await fetchChecked('manifest.json'))) as FurnitureManifest;
    if (manifest.schema !== 1 || !Array.isArray(manifest.pieces)) throw new Error('The furniture manifest is incompatible.');
    const ids = Object.keys(FURNITURE_SIZES) as FurnitureId[];
    const pieces = ids.map((id) => {
      const piece = manifest.pieces.find((p) => p.id === id);
      if (!piece || !/^[a-z]+\.glb$/.test(piece.file)) throw new Error(`The furniture manifest lacks ${id}.`);
      return piece;
    });
    // Each piece downloads and decodes in its own load slot, side by side with the other models (A68).
    const meshes = await Promise.all(pieces.map((piece) => withModelLoadSlot(async () => {
      const data = await fetchChecked(piece.file, piece.bytes, piece.sha256);
      const mesh = pieceMesh(piece.id, await new GLTFLoader().parseAsync(data, new URL('.', url(piece.file)).href));
      // Worn wood and old iron: nothing in a room is polished (A67).
      roughnessFloor(mesh.material, 0.72).envMapIntensity = 0.8;
      return mesh;
    })));
    return new Map(ids.map((id, i) => [id, meshes[i]!])) as FurnitureTemplates;
  })().catch((error) => { pending = null; throw error; });
  return observeModelLoad(pending, progress);
}

interface Instance { room: InteriorSpec; centre: THREE.Vector2; matrix: THREE.Matrix4 }

/** Whether a room can be seen into from outside: its door is open. */
export type RoomOpen = (room: InteriorSpec) => boolean;

/** The furniture of every room, as one instanced mesh per kind of piece, drawn for the rooms near the camera. */
export function buildFurniture(templates: FurnitureTemplates, rooms: RoomLocator, open: RoomOpen, placements: readonly FurniturePlacement[] = FURNITURE): SceneModule {
  const group = new THREE.Group();
  group.name = 'Furniture';
  const byPiece = new Map<FurnitureId, Instance[]>();
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), at = new THREE.Vector3();
  for (const p of placements) {
    if (p.piece === 'bench') continue;
    const b = p.room.building, world = fromBuildingLocal(b, p.x, p.z);
    at.set(world.x, rooms.base(p.room) + p.room.floorTop, world.z);
    q.setFromAxisAngle(up, b.yaw + p.yaw);
    const list = byPiece.get(p.piece) ?? [];
    list.push({ room: p.room, centre: new THREE.Vector2(b.x, b.z), matrix: new THREE.Matrix4().compose(at, q, one) });
    byPiece.set(p.piece, list);
  }
  const meshes: { mesh: THREE.InstancedMesh; instances: Instance[]; shown: string }[] = [];
  // Each piece casts a soft shadow on the floor, leaning away from the hearth (A70). Drawn as a dark, feathered card
  // under it, it needs no shadow map: a hearth light's own shadow would add a texture unit every lit material lacks room for.
  const shade: Instance[] = [];
  for (const p of placements) {
    const [w, , d] = pieceSize(p.piece), b = p.room.building, hearth = hearthOf(p.room);
    const away = hearth ? new THREE.Vector2(p.x - hearth.stack.x, p.z - hearth.stack.z) : new THREE.Vector2();
    if (away.lengthSq() > 1e-6) away.normalize().multiplyScalar(0.12);
    const world = fromBuildingLocal(b, p.x + away.x, p.z + away.y);
    at.set(world.x, rooms.base(p.room) + p.room.floorTop + 0.004, world.z);
    q.setFromAxisAngle(up, b.yaw + p.yaw);
    shade.push({ room: p.room, centre: new THREE.Vector2(b.x, b.z), matrix: new THREE.Matrix4().compose(at, q, new THREE.Vector3(w * 1.3, 1, d * 1.3)) });
  }
  if (shade.length) {
    const mesh = new THREE.InstancedMesh(shadeCard(), shadeMaterial(), shade.length);
    mesh.name = 'Furniture / floor shadows';
    mesh.count = 0; mesh.renderOrder = -1; mesh.frustumCulled = true;
    group.add(mesh);
    meshes.push({ mesh, instances: shade, shown: '' });
  }
  for (const [id, instances] of byPiece) {
    const template = templates.get(id)!;
    const mesh = new THREE.InstancedMesh(template.geometry, template.material, instances.length);
    mesh.name = `Furniture / ${id}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.count = 0;
    group.add(mesh);
    meshes.push({ mesh, instances, shown: '' });
  }
  let drawn = 0, triangles = 0;
  const camera = new THREE.Vector2(), focus = new THREE.Vector2();
  // The rooms that have furniture, in a fixed order; their visibility is checked once a frame and the instances rewritten
  // only when it changes, so a still frame allocates nothing (A70).
  const roomList = [...new Set(placements.map((p) => p.room))], roomShown = new Map<InteriorSpec, boolean>(roomList.map((room) => [room, false]));
  let shownKey = -1;
  return {
    group,
    update(_dt: number, f: FrameContext) {
      camera.set(f.camera.position.x, f.camera.position.z);
      focus.set(f.focus.x, f.focus.z);
      // The room the camera is in, not one it looks down on from above the roof (A70).
      const inside = rooms.within(f.camera.position.x, f.camera.position.y, f.camera.position.z);
      let key = 0;
      for (const [i, room] of roomList.entries()) {
        const b = room.building, cx = b.x, cz = b.z;
        const v = room === inside || (open(room) && Math.min(Math.hypot(cx - camera.x, cz - camera.y), Math.hypot(cx - focus.x, cz - focus.y)) < DRAW_RANGE);
        roomShown.set(room, v);
        if (v) key += 2 ** (i % 52) * (1 + Math.floor(i / 52));
      }
      if (key === shownKey) return;
      shownKey = key;
      const visible = (instance: Instance) => roomShown.get(instance.room)!;
      drawn = 0; triangles = 0;
      for (const entry of meshes) {
        const { mesh, instances } = entry;
        // Rewrite the instances only when the set of nearby rooms changes.
        const near = instances.map(visible);
        const shown = near.map((v) => (v ? '1' : '0')).join('');
        if (shown !== entry.shown) {
          entry.shown = shown;
          let n = 0;
          for (const [i, instance] of instances.entries()) if (near[i]) mesh.setMatrixAt(n++, instance.matrix);
          mesh.count = n;
          mesh.instanceMatrix.needsUpdate = true;
          if (n) mesh.computeBoundingSphere();
          mesh.visible = n > 0;
        }
        drawn += mesh.count;
        triangles += mesh.count * (mesh.geometry.index?.count ?? 0) / 3;
      }
    },
    stats: () => ({ furniture: drawn, furnitureTris: triangles }),
    dispose() {
      for (const { mesh } of meshes) mesh.dispose();
      const card = meshes.find(({ mesh }) => mesh.name === 'Furniture / floor shadows')?.mesh;
      if (card) { card.geometry.dispose(); (card.material as THREE.MeshBasicMaterial).map?.dispose(); (card.material as THREE.Material).dispose(); }
    },
  };
}

/** A unit floor card for a piece's shadow. */
function shadeCard(): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
}

/** Dark at the heart, feathered to nothing at the edges of a rounded footprint. */
function shadeMaterial(): THREE.MeshBasicMaterial {
  const n = 64, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = Math.abs((i + 0.5) / n * 2 - 1), y = Math.abs((j + 0.5) / n * 2 - 1);
    const edge = Math.max(0, Math.hypot(Math.max(0, x - 0.55), Math.max(0, y - 0.55)) / 0.45);
    const a = Math.max(0, 1 - edge) ** 1.6;
    data.set([0, 0, 0, Math.round(a * 255)], (j * n + i) * 4);
  }
  const map = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearFilter; map.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ color: 0x000000, map, transparent: true, opacity: 0.42, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}
