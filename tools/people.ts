/**
 * Developer lineup of every person in the slice, for checking faces, costumes and poses side by side under daylight.
 *
 *   npm run dev, then open http://127.0.0.1:5173/tools/people.html
 *   ?pose=walk|block|attack_light|... &t=0.5 (action progress) &only=player,rillford_reeve &armed=drawn|sheathed|none
 *
 * Drag to orbit, wheel to zoom. `window.people` exposes the scene for scripted captures (tools/cdp.mjs). Not part of the build.
 */
import * as THREE from 'three';
import { NPC_LIST } from '../src/content/npcs';
import { createAmbientRig, createBanditRig, createNpcRig, createPlayerRig, poseRig, setArmed, setSash, type Mode, type Rig } from '../src/presentation/characters';
import { npcStyle } from '../src/presentation/npcStyle';

const params = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8a9aa2);
scene.fog = new THREE.Fog(0x8a9aa2, 30, 90);
const hemi = new THREE.HemisphereLight(0xdfe8ee, 0x5a5040, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
sun.position.set(-6, 10, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -22;
sun.shadow.camera.right = 22;
sun.shadow.camera.top = 6;
sun.shadow.camera.bottom = -6;
sun.shadow.bias = -0.0004;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x5c5a40, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const only = params.get('only')?.split(',');
const entries: { id: string; rig: Rig }[] = [];
const add = (id: string, make: () => Rig) => {
  if (only && !only.includes(id)) return;
  const t0 = performance.now();
  const rig = make();
  console.log(`built ${id} in ${(performance.now() - t0).toFixed(1)} ms`);
  entries.push({ id, rig });
};
add('player', createPlayerRig);
for (const def of NPC_LIST) add(def.id, () => createNpcRig(def));
add('bandit_a', () => createBanditRig(0));
add('bandit_b', () => createBanditRig(1));
add('fisher', () => createAmbientRig({ skin: 0xb98866, primary: 0x4a4a3c, secondary: 0x2e2a24, hair: 0x6a6660, height: 1.0, girth: 1.08, accessory: 'pack' }, { build: 'man', cut: 'short', beard: 'full', age: 0.62, faceSeed: 12011 }));
add('fireside', () => createAmbientRig({ skin: 0xc79a72, primary: 0x5a4a3a, secondary: 0x6a6a52, hair: 0x3a2a1a, height: 1.0, girth: 0.9, accessory: 'shawl' }, { build: 'woman', cut: 'bun', beard: 'none', age: 0.45, faceSeed: 12107 }));
add('keeper', () => createAmbientRig({ skin: 0xb0805c, primary: 0x3e4048, secondary: 0x28262a, hair: 0x8a8880, height: 1.03, girth: 1.0, accessory: 'coat', accent: 0x6a5a3a }, { build: 'man', cut: 'short', beard: 'full', age: 0.8, faceSeed: 12203 }));

const spacing = 1.25;
entries.forEach((e, i) => {
  e.rig.root.position.set((i - (entries.length - 1) / 2) * spacing, 0, 0);
  scene.add(e.rig.root);
  if (e.id === 'player') {
    setArmed(e.rig, (params.get('armed') as 'none' | 'sheathed' | 'drawn') ?? 'none');
    if (params.get('sash')) setSash(e.rig, 0x4d7a54);
  }
});

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 200);
let yaw = 0;
let pitch = 0.08;
let dist = entries.length * spacing * 1.25;
const target = new THREE.Vector3(0, 1.0, 0);
function placeCamera() {
  camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(target);
}
placeCamera();
let drag: { x: number; y: number } | null = null;
addEventListener('pointerdown', (e) => (drag = { x: e.clientX, y: e.clientY }));
addEventListener('pointerup', () => (drag = null));
addEventListener('pointermove', (e) => {
  if (!drag) return;
  yaw -= (e.clientX - drag.x) * 0.006;
  pitch = Math.max(-0.4, Math.min(1.2, pitch + (e.clientY - drag.y) * 0.004));
  drag = { x: e.clientX, y: e.clientY };
  placeCamera();
});
addEventListener('wheel', (e) => {
  dist = Math.max(0.4, dist * (1 + Math.sign(e.deltaY) * 0.1));
  placeCamera();
});
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

const mode = (params.get('pose') ?? 'idle') as Mode;
const actionT = Number(params.get('t') ?? 0.5);
let time = 0;
function pose(dt: number) {
  for (const e of entries) {
    const work = NPC_LIST.some((d) => d.id === e.id) ? npcStyle(e.id as (typeof NPC_LIST)[number]['id']).work : 'general';
    poseRig(e.rig, { mode, speed: 0.8, time, t: actionT, amp: 1, workGesture: work }, dt);
  }
}
function frame(dt: number) {
  time += dt;
  pose(dt);
  renderer.render(scene, camera);
}
let last = performance.now();
function loop(now: number) {
  frame(Math.min(0.05, (now - last) / 1000));
  last = now;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/** Frame one person (or all) from a direction: 'front', 'side', 'back', 'face', 'three'. */
function view(id: string | null, dir = 'front', fov = 30) {
  const e = id ? entries.find((x) => x.id === id) : null;
  const x = e ? e.rig.root.position.x : 0;
  camera.fov = fov;
  camera.updateProjectionMatrix();
  const h = e ? e.rig.height : 1.8;
  if (dir === 'face') {
    target.set(x, h * 0.93, 0);
    dist = 0.75;
    yaw = 0.35;
    pitch = 0.02;
  } else if (dir === 'feet' || dir === 'hands') {
    target.set(x, dir === 'feet' ? 0.15 : h * 0.5, 0.05);
    dist = 1.3;
    yaw = 0.5;
    pitch = 0.35;
  } else {
    target.set(x, e ? h * 0.52 : 1.0, 0);
    dist = e ? 4.2 : entries.length * spacing * 1.35;
    yaw = dir === 'side' ? Math.PI / 2 : dir === 'back' ? Math.PI : dir === 'three' ? 0.6 : 0;
    pitch = 0.08;
  }
  placeCamera();
  renderer.render(scene, camera);
}
function setPose(m: Mode, t = 0.5, seconds = 1) {
  for (const e of entries) for (let i = 0; i < Math.round(seconds * 60); i++) poseRig(e.rig, { mode: m, speed: 0.8, time: i / 60, t, amp: 1 }, 1 / 60);
  renderer.render(scene, camera);
}
(window as unknown as { people: unknown }).people = { scene, camera, renderer, entries, view, setPose, THREE, setArmed };
document.title = 'READY';
