import * as THREE from 'three';
import { box, ellipsoid, loft, Mesher, mul3, rigid, tube, type RGB, type V3 } from '../human/skin';

/**
 * The tools a working resident holds. Each is a small piece of the game's own vertex-coloured kit, built in code (no
 * supplied asset), held at a palm socket or laid on the lap, and shown only while its owner works.
 */
export type WorkPropKind = 'ledger' | 'quill' | 'hammer' | 'chisel' | 'rod' | 'arrow';

const w = rigid('hips');

function meshes(group: THREE.Group, parts: [Mesher, THREE.Material][]) {
  for (const [m, material] of parts) {
    const geometry = m.geometry();
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
}

/** An open ledger lying flat, spine along z, pages up (+y), centred on the origin. */
function ledger(paper: THREE.Material, leather: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const pages = new Mesher(), cover = new Mesher();
  const page: RGB = [0.78, 0.72, 0.58], ink: RGB = [0.32, 0.27, 0.2];
  for (const side of [-1, 1]) {
    // Each half rises a little towards the spine, as an open book does.
    const tilt: [V3, V3, V3] = [[Math.cos(side * 0.12), side * Math.sin(0.12) * -1, 0], [Math.sin(side * 0.12), Math.cos(0.12), 0], [0, 0, 1]];
    box(cover, [side * 0.075, 0.004, 0], [0.078, 0.004, 0.108], [0.24, 0.13, 0.07], w, tilt);
    box(pages, [side * 0.073, 0.017, 0], [0.071, 0.009, 0.1], page, w, tilt);
    // Lines of entries, darker where they lie.
    for (let row = 0; row < 7; row++) box(pages, [side * 0.073, 0.027, -0.075 + row * 0.024], [0.055, 0.0008, 0.0025], mul3(ink, 1 + (row % 2) * 0.15), w, tilt);
  }
  box(cover, [0, 0.006, 0], [0.008, 0.008, 0.108], [0.18, 0.1, 0.05], w);
  meshes(g, [[pages, paper], [cover, leather]]);
  return g;
}

/** A quill: tip at the origin, shaft up +y, vane on the upper part. */
function quill(feather: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const m = new Mesher();
  tube(m, [[0, 0, 0], [0, 0.07, 0.002], [0, 0.2, 0.01]], [0.0018, 0.0026, 0.0012], [[0.25, 0.22, 0.18], [0.82, 0.8, 0.74], [0.86, 0.84, 0.78]], { sides: 5, wf: w, capStart: true, capEnd: true, up: [0, 0, 1] });
  ellipsoid(m, [0.006, 0.15, 0.007], [0.012, 0.055, 0.0025], [0.86, 0.84, 0.78], w, { ws: 6, hs: 5 });
  meshes(g, [[m, feather]]);
  return g;
}

/** A stone hammer: grip at the origin, haft up +y, head across x at the top. */
function hammer(wood: THREE.Material, metal: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const haft = new Mesher(), head = new Mesher();
  tube(haft, [[0, -0.07, 0], [0, 0.1, 0], [0, 0.26, 0]], [0.014, 0.013, 0.012], [[0.3, 0.2, 0.12], [0.36, 0.25, 0.15], [0.32, 0.22, 0.13]], { sides: 7, wf: w, capStart: true, capEnd: true, up: [0, 0, 1] });
  box(head, [0, 0.27, 0], [0.065, 0.024, 0.024], [0.3, 0.29, 0.28], w);
  meshes(g, [[haft, wood], [head, metal]]);
  return g;
}

/** A mason's chisel: struck end at the origin side, blade at +y. */
function chisel(metal: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const m = new Mesher();
  loft(m, [
    { y: -0.06, w: 0.011, f: 0.011, b: 0.011, p: 2, c: [0.34, 0.33, 0.31] },
    { y: 0.12, w: 0.009, f: 0.009, b: 0.009, p: 2, c: [0.3, 0.29, 0.28] },
    { y: 0.17, w: 0.012, f: 0.002, b: 0.002, p: 2, c: [0.44, 0.43, 0.41] },
  ], { sides: 6, wf: w, capBottom: true, capTop: true });
  meshes(g, [[m, metal]]);
  return g;
}

/** A measuring rod: grip at the origin, foot at -y on the ground, tally notches up its length. */
function rod(wood: THREE.Material, length: number): THREE.Group {
  const g = new THREE.Group();
  const m = new Mesher();
  tube(m, [[0, -length, 0], [0, 0, 0], [0, 0.42, 0]], [0.016, 0.015, 0.014], [[0.28, 0.2, 0.12], [0.42, 0.33, 0.2], [0.4, 0.31, 0.19]], { sides: 7, wf: w, capStart: true, capEnd: true, up: [0, 0, 1] });
  for (let i = 0; i < 10; i++) box(m, [0, -length + 0.15 + i * 0.12, 0.0155], [0.009, 0.004, 0.002], [0.16, 0.11, 0.07], w);
  meshes(g, [[m, wood]]);
  return g;
}

/** A hunting arrow held at its middle: shaft along +y, head at +y, fletching at -y. */
function arrow(wood: THREE.Material, metal: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const shaft = new Mesher(), tip = new Mesher();
  tube(shaft, [[0, -0.38, 0], [0, 0.36, 0]], 0.0045, [0.62, 0.52, 0.36], { sides: 5, wf: w, capStart: true, capEnd: true, up: [0, 0, 1] });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    box(shaft, [Math.cos(a) * 0.007, -0.32, Math.sin(a) * 0.007], [0.0008, 0.045, 0.008], [0.66, 0.6, 0.52], w,
      [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]]);
  }
  loft(tip, [
    { y: 0.355, w: 0.005, f: 0.005, b: 0.005, p: 2, c: [0.3, 0.29, 0.28] },
    { y: 0.375, w: 0.012, f: 0.0025, b: 0.0025, p: 2, c: [0.34, 0.33, 0.31] },
    { y: 0.41, w: 0.0008, f: 0.0008, b: 0.0008, p: 2, c: [0.4, 0.39, 0.37] },
  ], { sides: 4, wf: w, capBottom: true, capTop: true });
  meshes(g, [[shaft, wood], [tip, metal]]);
  return g;
}

export interface WorkPropSet {
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  triangles: number;
}

/** Build one tool; `rodLength` is the measuring rod's length below the grip (its foot on the ground). */
export function createWorkProp(kind: WorkPropKind, rodLength = 1): WorkPropSet {
  const wood = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 });
  const metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.6 });
  const leather = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const paper = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 });
  const group = kind === 'ledger' ? ledger(paper, leather) : kind === 'quill' ? quill(paper) : kind === 'hammer' ? hammer(wood, metal)
    : kind === 'chisel' ? chisel(metal) : kind === 'rod' ? rod(wood, rodLength) : arrow(wood, metal);
  group.name = `NPC / work ${kind}`;
  const used = new Set<THREE.MeshStandardMaterial>();
  let triangles = 0;
  group.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    used.add(mesh.material as THREE.MeshStandardMaterial);
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
  });
  for (const material of [wood, metal, leather, paper]) if (!used.has(material)) material.dispose();
  return { group, materials: [...used], triangles };
}
