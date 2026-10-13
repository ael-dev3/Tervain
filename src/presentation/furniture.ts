import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createGltfLoader } from './assets/gltfLoader';
import { FURNITURE, pieceSize, type FurniturePlacement } from '../world/furniture';
import { FURNITURE_SIZES, type FurnitureId } from '../world/furnitureSizes';
import { DRESSING, MODEL_SCALE, rugPattern, type Dressing } from '../world/dressing';
import { fromBuildingLocal, hearthOf, type InteriorSpec, type RoomLocator } from '../world/interiors';
import { modelAssetUrl } from './assets/modelUrl';
import { observeModelLoad, withModelLoadSlot, type ModelLoadProgress } from './assets/modelLoadQueue';
import { downloadAsset } from './assets/download';
import type { FrameContext, SceneModule } from './context';
import { roughnessFloor } from './matte';
import { clutterGeometry, clutterMaterial, clutterOnPiece, firewoodGeometry, hungGeometry, hungMaterial, pegRailGeometry, type ClutterKind, type HungKind } from './clutter';

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
      const mesh = pieceMesh(piece.id, await createGltfLoader().parseAsync(data, new URL('.', url(piece.file)).href));
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
export function buildFurniture(templates: FurnitureTemplates, rooms: RoomLocator, open: RoomOpen, placements: readonly FurniturePlacement[] = FURNITURE,
  dressing: readonly Dressing[] = DRESSING): SceneModule {
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
  // The rooms' dressing (A123): props on tables, shelves, walls and hearths, and woven rugs on the floors.
  const rugs: Instance[][] = [[], [], [], []], boards: Instance[] = [], brackets: Instance[] = [];
  const byClutter = new Map<ClutterKind, Instance[]>();
  const rails: Instance[] = [], byHung = new Map<HungKind | 'firewood', Instance[]>();
  const later: { mesh: THREE.InstancedMesh; instances: Instance[]; shown: string }[] = [];
  for (const [n, p] of dressing.entries()) {
    const b = p.room.building, world = fromBuildingLocal(b, p.x, p.z);
    at.set(world.x, rooms.base(p.room) + p.room.floorTop + p.y, world.z);
    q.setFromAxisAngle(up, b.yaw + p.yaw);
    const centre = new THREE.Vector2(b.x, b.z);
    if (p.piece === 'rug') {
      const [w, d] = p.size ?? [1.6, 1];
      rugs[rugPattern(p.room, n)]!.push({ room: p.room, centre, matrix: new THREE.Matrix4().compose(at, q, new THREE.Vector3(w, 1, d)) });
      continue;
    }
    // A135: wall shelves (a board on two brackets) and the small things that crowd them, the mantel and the corners.
    if (p.piece === 'board') {
      const [len, depth] = p.size ?? [1, 0.24];
      boards.push({ room: p.room, centre, matrix: new THREE.Matrix4().compose(at, q, new THREE.Vector3(len, 1, depth)) });
      for (const side of [-1, 1]) {
        const c = Math.cos(b.yaw + p.yaw), s = Math.sin(b.yaw + p.yaw), lx = side * (len / 2 - 0.12);
        brackets.push({ room: p.room, centre, matrix: new THREE.Matrix4().compose(new THREE.Vector3(at.x + lx * c, at.y, at.z - lx * s), q, one) });
      }
      continue;
    }
    // A136: peg rails and what hangs from them, and the firewood by the hearth.
    if (p.piece === 'rail') {
      rails.push({ room: p.room, centre, matrix: new THREE.Matrix4().compose(at, q, new THREE.Vector3(p.size?.[0] ?? 1, 1, 1)) });
      continue;
    }
    if (p.piece === 'hung' || p.piece === 'firewood') {
      const key = p.piece === 'hung' ? p.hung! : 'firewood', list = byHung.get(key) ?? [];
      list.push({ room: p.room, centre, matrix: new THREE.Matrix4().compose(at, q, one) });
      byHung.set(key, list);
      continue;
    }
    const size = (p.scale ?? 1) * (MODEL_SCALE[p.piece] ?? 1), scaled = new THREE.Vector3(size, size, size);
    if (p.piece === 'small') {
      const list = byClutter.get(p.kind!) ?? [];
      list.push({ room: p.room, centre, matrix: new THREE.Matrix4().compose(at, q, scaled) });
      byClutter.set(p.kind!, list);
      continue;
    }
    if (!templates.has(p.piece as FurnitureId)) continue;
    const list = byPiece.get(p.piece as FurnitureId) ?? [];
    list.push({ room: p.room, centre, matrix: new THREE.Matrix4().compose(at, q, scaled) });
    byPiece.set(p.piece as FurnitureId, list);
  }
  for (const [name, instances, geometry] of [['shelf boards', boards, boardGeometry()], ['shelf brackets', brackets, bracketGeometry()]] as const) {
    if (!instances.length) continue;
    const mesh = new THREE.InstancedMesh(geometry, shelfMaterial(), instances.length);
    mesh.name = `Furniture / ${name}`;
    mesh.receiveShadow = true;
    mesh.count = 0;
    mesh.userData.ownsResources = true;
    group.add(mesh);
    later.push({ mesh, instances, shown: '' });
  }
  // One material for the rails, the hung things and the firewood: their wood and iron are in the vertex colours.
  const hungMat = hungMaterial();
  for (const [name, instances, geometry] of [['peg rails', rails, pegRailGeometry()] as const,
    ...[...byHung].map(([kind, list]) => [`hung ${kind}`, list, kind === 'firewood' ? firewoodGeometry() : hungGeometry(kind)] as const)]) {
    if (!instances.length) { geometry.dispose(); continue; }
    const mesh = new THREE.InstancedMesh(geometry, hungMat, instances.length);
    mesh.name = `Furniture / ${name}`;
    mesh.receiveShadow = true;
    mesh.count = 0;
    mesh.userData.ownsGeometry = true;
    group.add(mesh);
    later.push({ mesh, instances, shown: '' });
  }
  const meshes: { mesh: THREE.InstancedMesh; instances: Instance[]; shown: string }[] = [...later];
  for (const [pattern, instances] of rugs.entries()) {
    if (!instances.length) continue;
    const mesh = new THREE.InstancedMesh(shadeCard(), rugMaterial(pattern), instances.length);
    mesh.name = `Furniture / rug ${pattern}`;
    mesh.receiveShadow = true;
    mesh.count = 0;
    mesh.renderOrder = -1;
    mesh.userData.ownsResources = true;
    group.add(mesh);
    meshes.push({ mesh, instances, shown: '' });
  }
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
  // The small things on the tables, counters, desks, workbenches and chests (A76): the same spots on every piece of a
  // kind, a few left empty and each turned its own way, by a hash of where the piece stands.
  const place = new THREE.Matrix4(), turn = new THREE.Quaternion();
  for (const [id, instances] of byPiece) {
    const template = templates.get(id);
    if (!template) continue;
    const items = clutterOnPiece(id, template, FURNITURE_SIZES[id]);
    for (const [n, instance] of instances.entries()) for (const [k, item] of items.entries()) {
      const seed = Math.abs(Math.sin((instance.centre.x * 12.99 + instance.centre.y * 78.23 + n * 37.7 + k * 11.3)) * 43758.55) % 1;
      if (seed < 0.25) continue;
      turn.setFromAxisAngle(up, seed * 40);
      place.compose(item.at, turn, one);
      const list = byClutter.get(item.kind) ?? [];
      list.push({ room: instance.room, centre: instance.centre, matrix: instance.matrix.clone().multiply(place) });
      byClutter.set(item.kind, list);
    }
  }
  for (const [kind, instances] of byClutter) {
    const mesh = new THREE.InstancedMesh(clutterGeometry(kind), clutterMaterial(kind), instances.length);
    mesh.name = `Furniture / clutter ${kind}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.count = 0;
    mesh.userData.ownsResources = true;
    group.add(mesh);
    meshes.push({ mesh, instances, shown: '' });
  }
  let drawn = 0, triangles = 0;
  const camera = new THREE.Vector2(), focus = new THREE.Vector2();
  // The rooms that have furniture, in a fixed order; their visibility is checked once a frame and the instances rewritten
  // only when it changes, so a still frame allocates nothing (A70).
  const roomList = [...new Set([...placements.map((p) => p.room), ...dressing.map((p) => p.room)])], roomShown = new Map<InteriorSpec, boolean>(roomList.map((room) => [room, false]));
  let shownKey = -1;
  return {
    group,
    placementAuditTargets() {
      group.updateWorldMatrix(true, false);
      return meshes.filter(entry => !entry.mesh.name.includes('floor shadows')).flatMap(({ mesh, instances }) =>
        instances.map((instance, i) => ({ label: `${mesh.name}[${i}]`, kind: 'prop' as const, geometry: mesh.geometry,
          matrix: new THREE.Matrix4().multiplyMatrices(group.matrixWorld, instance.matrix) })));
    },
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
        triangles += mesh.count * (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
      }
    },
    stats: () => ({ furniture: drawn, furnitureTris: triangles }),
    dispose() {
      for (const { mesh } of meshes) {
        mesh.dispose();
        if (mesh.userData.ownsResources) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
        if (mesh.userData.ownsGeometry) mesh.geometry.dispose();
      }
      hungMat.dispose();
      const card = meshes.find(({ mesh }) => mesh.name === 'Furniture / floor shadows')?.mesh;
      if (card) { card.geometry.dispose(); (card.material as THREE.MeshBasicMaterial).map?.dispose(); (card.material as THREE.Material).dispose(); }
    },
  };
}

/**
 * A woven wool rug (A123): stripes and a border in the earthy reds, ochres and browns of Gothic 3's interiors, with a
 * coarse weave and wear. Four patterns, chosen per room.
 */
function rugMaterial(pattern: number): THREE.MeshStandardMaterial {
  const palettes = [
    ['#6e2a1e', '#a4542c', '#d6b277', '#3a2418'],
    ['#4a3a24', '#8a6a3a', '#c9a565', '#2a1e14'],
    ['#5a2230', '#94443a', '#cfa36a', '#2e1a1c'],
    ['#3a4630', '#7a6a3c', '#c2a46a', '#241c14'],
  ][pattern % 4]!;
  const size = 256, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = palettes[0]!; g.fillRect(0, 0, size, size);
  // Border and bands.
  g.fillStyle = palettes[3]!; g.fillRect(0, 0, size, 14); g.fillRect(0, size - 14, size, 14); g.fillRect(0, 0, 14, size); g.fillRect(size - 14, 0, 14, size);
  g.fillStyle = palettes[2]!;
  for (const y of [34, size - 46]) g.fillRect(18, y, size - 36, 12);
  g.fillStyle = palettes[1]!;
  for (let y = 62; y < size - 62; y += 22) g.fillRect(18, y, size - 36, 8);
  // A row of lozenges down the middle.
  g.fillStyle = palettes[2]!;
  for (let x = 40; x < size - 30; x += 44) { g.beginPath(); g.moveTo(x, size / 2); g.lineTo(x + 14, size / 2 - 16); g.lineTo(x + 28, size / 2); g.lineTo(x + 14, size / 2 + 16); g.fill(); }
  // Weave and wear.
  const img = g.getImageData(0, 0, size, size), px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const k = i / 4, x = k % size, y = (k - x) / size;
    const weave = ((x + y) % 3 === 0 ? 0.9 : 1) * ((x % 2) ? 0.96 : 1.02);
    const wear = 0.82 + 0.18 * Math.abs(Math.sin(x * 0.031 + Math.sin(y * 0.017) * 3) * Math.cos(y * 0.023));
    for (let c = 0; c < 3; c++) px[i + c] = Math.min(255, px[i + c]! * weave * wear);
  }
  g.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
}

/** A wall shelf's board, a unit long and deep (scaled per shelf), its top at y = 0. */
function boardGeometry(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(1, 0.035, 1).translate(0, -0.0175, 0);
}

/** An iron-and-wood bracket under a shelf: an upright on the wall and a diagonal strut. */
function bracketGeometry(): THREE.BufferGeometry {
  const upright = new THREE.BoxGeometry(0.035, 0.2, 0.03).translate(0, -0.135, -0.1);
  const strut = new THREE.BoxGeometry(0.03, 0.03, 0.22).rotateX(-0.75).translate(0, -0.11, -0.02);
  const parts = [upright, strut].map((g) => g.toNonIndexed());
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv'] as const) {
    const arrays = parts.map((g) => g.getAttribute(name).array as Float32Array);
    const joined = new Float32Array(arrays.reduce((n, x) => n + x.length, 0));
    let o = 0;
    for (const x of arrays) { joined.set(x, o); o += x.length; }
    out.setAttribute(name, new THREE.BufferAttribute(joined, name === 'uv' ? 2 : 3));
  }
  [upright, strut, ...parts].forEach((g) => g.dispose());
  return out;
}

/** Old, dark, smoke-stained wood. */
function shelfMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x3e2a1a, roughness: 0.95, metalness: 0 });
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

/**
 * Furniture that arrives after the world opens (backlog 4). None of it is needed to set foot in the valley: the rooms'
 * colliders come from the placements in world/furniture.ts, not from these models. The world opens with this empty
 * stand-in and the rooms are furnished once the pieces are here, as the animals move in (A70).
 */
export function deferredFurniture(): SceneModule & { attach(inner: SceneModule): void; readonly arrived: boolean } {
  const group = new THREE.Group(); group.name = 'Furniture (arriving)';
  let inner: SceneModule | null = null, disposed = false;
  return {
    group,
    get arrived() { return inner !== null; },
    placementAuditTargets: () => inner?.placementAuditTargets?.() ?? [],
    attach(next) {
      if (disposed) { next.dispose?.(); return; }
      inner = next;
      group.add(next.group);
    },
    update(dt, f) { inner?.update(dt, f); },
    stats: () => inner?.stats?.() ?? {},
    dispose() { disposed = true; inner?.dispose?.(); inner = null; },
  };
}
