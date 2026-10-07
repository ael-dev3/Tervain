// Resident lab: one Meshy resident under the real poser, with the presentation repairs switchable, debug views and
// CPU measurements of skin stretch. Driven by hand or by headless scripts through window.lab.
import * as THREE from 'three';
import { loadMeshyNpcCatalog, type NpcRigOptions } from '../src/presentation/meshynpcs.ts';
import { applyRigAngles, poseRig, type Pose, type Rig, type IdleVariant } from '../src/presentation/characters.ts';
import { REST_ANGLES } from '../src/presentation/npc/poseFit.ts';
import { blendDualQuaternions, dualQuaternionSkinOf } from '../src/presentation/npc/dualQuaternionSkinning.ts';
import type { WorkGesture } from '../src/presentation/npcStyle.ts';
import { npcSkinInspection } from '../src/presentation/npc/skinRepair.ts';
import { disposeSceneResources } from '../src/presentation/disposeScene.ts';

const status = document.querySelector('#status') as HTMLElement;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x56636b);
const hemi = new THREE.HemisphereLight(0xd7e4ee, 0x6d5f4b, 1.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe3bd, 3.0);
sun.position.set(2.5, 5.5, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.1, far: 14 });
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.02;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xa9c6e6, 0.9);
rim.position.set(-3, 3, -4);
scene.add(rim);
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.background = new THREE.Color(0x8fa3b0);
scene.environment = pmrem.fromScene(envScene, 0.04).texture;
scene.environmentIntensity = 0.35;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x5f6355, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(10, 20, 0x8a8d7d, 0x6f7366);
grid.position.y = 0.002;
scene.add(grid);
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.03, 60);
camera.position.set(0, 1.2, 4.2);
camera.lookAt(0, 1, 0);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

let rig: Rig | null = null;
let loadRequest = 0;
let role = '';
let skinned: THREE.SkinnedMesh | null = null;
let debugMesh: THREE.Mesh | null = null;
let debugMode = 'shaded';
const props = new THREE.Group();
scene.add(props);

// Joint overlay: pivots and limbs drawn over the figure.
const overlay = new THREE.Group();
overlay.renderOrder = 10;
scene.add(overlay);
let overlayOn = false;
let overlaySkin: THREE.SkinnedMesh | null = null;
let overlayBones: { bone: THREE.Bone; dot: THREE.Mesh; line: THREE.Line | null }[] = [];
const overlayPoint = new THREE.Vector3(), overlayParent = new THREE.Vector3();
function clearOverlay() {
  const retired = new THREE.Scene();
  retired.add(overlay);
  disposeSceneResources(retired, () => {});
  overlay.clear(); scene.add(overlay);
  overlaySkin = null; overlayBones = [];
}
function updateOverlay() {
  overlay.visible = overlayOn && skinned !== null;
  if (!overlay.visible || !skinned) return;
  if (overlaySkin !== skinned) {
    clearOverlay(); overlaySkin = skinned;
    const pivot = new THREE.SphereGeometry(0.018, 10, 8);
    const dot = new THREE.MeshBasicMaterial({ color: 0xffe14a, depthTest: false });
    const line = new THREE.LineBasicMaterial({ color: 0x4af0ff, depthTest: false });
    for (const bone of skinned.skeleton.bones) {
      const ball = new THREE.Mesh(pivot, dot); ball.renderOrder = 11; overlay.add(ball);
      let link: THREE.Line | null = null;
      if ((bone.parent as THREE.Bone)?.isBone) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
        link = new THREE.Line(geometry, line); link.renderOrder = 11; link.frustumCulled = false; overlay.add(link);
      }
      overlayBones.push({ bone, dot: ball, line: link });
    }
  }
  for (const { bone, dot, line } of overlayBones) {
    bone.getWorldPosition(overlayPoint); dot.position.copy(overlayPoint);
    if (line && bone.parent) {
      bone.parent.getWorldPosition(overlayParent);
      const position = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      position.setXYZ(0, overlayParent.x, overlayParent.y, overlayParent.z);
      position.setXYZ(1, overlayPoint.x, overlayPoint.y, overlayPoint.z);
      position.needsUpdate = true;
    }
  }
}
function render() { if (rig) rig.root.updateMatrixWorld(true); updateOverlay(); renderer.render(scene, camera); }

async function load(nextRole: string, options: NpcRigOptions = {}, scale = 1) {
  const request = ++loadRequest;
  const catalog = await loadMeshyNpcCatalog(undefined, [nextRole]);
  if (request !== loadRequest) return null;
  const next = catalog.create(nextRole, scale, nextRole.startsWith('enemy:') ? 'blade' : 'none', options);
  clearDebug(); clearOverlay();
  if (rig) {
    const retired = new THREE.Scene();
    retired.add(rig.root);
    disposeSceneResources(retired, () => {});
  }
  rig = next;
  role = nextRole;
  scene.add(rig.root);
  skinned = null;
  rig.root.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) skinned = object as THREE.SkinnedMesh; });
  debugMode = 'shaded'; clearDebug();
  pose({ mode: 'idle', frames: 30 });
  const report = skinned!.geometry.userData.npcSkinRepair ?? null;
  status.textContent = `${role}  ${JSON.stringify(options)}\n${JSON.stringify(report)}`;
  return { role, triangles: rig.root.userData.meshyNpc.triangles, repair: report, dq: skinned!.userData.npcDualQuaternion ?? null };
}

interface PoseSpec { mode?: Pose['mode']; gesture?: WorkGesture; idle?: IdleVariant; seated?: boolean; seatHeight?: number; time?: number; t?: number; speed?: number; frames?: number; dt?: number }
let lastPose: PoseSpec = {};
function pose(spec: PoseSpec) {
  if (!rig) throw new Error('load first');
  lastPose = spec;
  const frames = spec.frames ?? 60, dt = spec.dt ?? 1 / 30;
  const mode = spec.mode ?? 'idle';
  for (let i = 0; i < frames; i++) {
    const p: Pose = {
      mode, speed: spec.speed ?? (mode === 'walk' ? 0.78 : 0), time: spec.time ?? 0, t: spec.t ?? 0, amp: 1,
      workGesture: spec.gesture, seated: spec.seated, seatHeight: spec.seatHeight,
      idle: spec.idle ? { seed: 1, clock: 3, force: spec.idle } : undefined,
    };
    poseRig(rig, p, dt);
  }
  rig.root.updateMatrixWorld(true);
  if (debugMode !== 'shaded') setDebug(debugMode);
  return { cur: { ...rig.cur } };
}

const VIEWS: Record<string, [number[], number[], number?]> = {
  front: [[0, 1.05, 4.4], [0, 0.95, 0]], back: [[0, 1.05, -4.4], [0, 0.95, 0]], left: [[4.4, 1.05, 0], [0, 0.95, 0]], right: [[-4.4, 1.05, 0], [0, 0.95, 0]],
  three: [[2.6, 1.3, 3.4], [0, 0.95, 0]], threeBack: [[-2.6, 1.3, -3.4], [0, 0.95, 0]],
  upper: [[0.9, 1.45, 2.0], [0, 1.25, 0], 30], face: [[0.25, 1.6, 0.9], [0, 1.58, 0], 28],
  shoulderL: [[1.2, 1.5, 0.9], [0.2, 1.35, 0], 30], shoulderR: [[-1.2, 1.5, 0.9], [-0.2, 1.35, 0], 30],
  hands: [[0.0, 1.0, 1.6], [0, 0.85, 0], 34], hips: [[1.4, 0.9, 1.6], [0, 0.7, 0], 32], legs: [[1.6, 0.7, 2.2], [0, 0.45, 0], 34],
  seatSide: [[2.6, 0.8, 0.2], [0, 0.55, 0.2], 32],
};
function view(name: string | { pos: number[]; target: number[]; fov?: number }) {
  const v = typeof name === 'string' ? VIEWS[name] : [name.pos, name.target, name.fov] as [number[], number[], number?];
  if (!v) throw new Error(`no view ${name}`);
  const s = rig ? rig.height / 1.8 : 1;
  camera.position.set(v[0][0]!, v[0][1]! * s, v[0][2]!);
  camera.fov = v[2] ?? 30;
  camera.updateProjectionMatrix();
  camera.lookAt(v[1][0]!, v[1][1]! * s, v[1][2]!);
  render();
  return true;
}

// ---- CPU skinning ----
function bindPositions(mesh: THREE.SkinnedMesh) {
  return mesh.geometry.getAttribute('position');
}
function skinCpu(method: 'lbs' | 'dq'): Float32Array {
  const mesh = skinned!;
  rig!.root.updateMatrixWorld(true);
  mesh.skeleton.update();
  const position = bindPositions(mesh), count = position.count;
  const out = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  if (method === 'lbs') {
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(position, i);
      mesh.applyBoneTransform(i, v);
      v.toArray(out, i * 3);
    }
    return out;
  }
  const dq = dualQuaternionSkinOf(mesh);
  if (!dq) throw new Error('This rig was built without dual-quaternion skinning.');
  dq.refresh();
  const index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight');
  const ji = [0, 0, 0, 0], jw = [0, 0, 0, 0];
  for (let i = 0; i < count; i++) {
    for (let s = 0; s < 4; s++) { ji[s] = index.getComponent(i, s); jw[s] = weight.getComponent(i, s); }
    v.fromBufferAttribute(position, i);
    blendDualQuaternions(dq.motions, ji, jw, v);
    v.toArray(out, i * 3);
  }
  return out;
}

/** Per-triangle stretch: max over its edges of max(r, 1/r), r = posed / bind length. Area-weighted summary. */
function stretchStats(posed: Float32Array) {
  const mesh = skinned!;
  const position = mesh.geometry.getAttribute('position'), index = mesh.geometry.index!;
  const tris = index.count / 3;
  const values = new Float32Array(tris), areas = new Float32Array(tris);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3();
  let totalArea = 0;
  for (let t = 0; t < tris; t++) {
    const i0 = index.getX(t * 3), i1 = index.getX(t * 3 + 1), i2 = index.getX(t * 3 + 2);
    a.fromBufferAttribute(position, i0); b.fromBufferAttribute(position, i1); c.fromBufferAttribute(position, i2);
    pa.fromArray(posed, i0 * 3); pb.fromArray(posed, i1 * 3); pc.fromArray(posed, i2 * 3);
    let worst = 1;
    for (const [p, q, pp, qq] of [[a, b, pa, pb], [b, c, pb, pc], [c, a, pc, pa]] as const) {
      const l0 = p.distanceTo(q), l1 = pp.distanceTo(qq);
      if (l0 < 1e-5) continue;
      const r = l1 / l0;
      worst = Math.max(worst, r, 1 / Math.max(r, 1e-6));
    }
    values[t] = worst;
    const area = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).length() / 2;
    areas[t] = area; totalArea += area;
  }
  const over = (k: number) => { let s = 0; for (let t = 0; t < tris; t++) if (values[t]! > k) s += areas[t]!; return +(100 * s / totalArea).toFixed(3); };
  const sorted = Array.from(values).sort((x, y) => x - y);
  return { over125: over(1.25), over150: over(1.5), over200: over(2), p99: +sorted[Math.floor(tris * 0.99)]!.toFixed(3), max: +sorted[tris - 1]!.toFixed(2), values };
}

function stats() {
  const lbs = stretchStats(skinCpu('lbs'));
  const out: Record<string, unknown> = { pose: lastPose, lbs: { ...lbs, values: undefined } };
  if (dualQuaternionSkinOf(skinned!)) { const dq = stretchStats(skinCpu('dq')); out.dq = { ...dq, values: undefined }; }
  return out;
}

// ---- debug views ----
function clearDebug() {
  if (debugMesh) { debugMesh.parent?.remove(debugMesh); debugMesh.geometry.dispose(); (debugMesh.material as THREE.Material).dispose(); debugMesh = null; }
  if (skinned) (skinned.material as THREE.Material).visible = true;
}
function ramp(v: number, out: THREE.Color) {
  // 1.0 white, 1.25 yellow, 1.5 orange, 2+ red
  const t = Math.min(1, Math.max(0, (v - 1) / 1));
  return out.setRGB(1, 1 - Math.min(1, t * 1.6) * 0.75, 1 - Math.min(1, t * 3));
}
function setDebug(mode: string) {
  debugMode = mode;
  clearDebug();
  if (mode === 'shaded' || !skinned) { render(); return true; }
  const mesh = skinned;
  const method = mode.endsWith(':lbs') ? 'lbs' : dualQuaternionSkinOf(mesh) ? 'dq' : 'lbs';
  const posed = skinCpu(method);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(posed, 3));
  geometry.setIndex(mesh.geometry.index!.clone());
  geometry.computeVertexNormals();
  const count = posed.length / 3, colors = new Float32Array(count * 3), color = new THREE.Color();
  if (mode.startsWith('stretch')) {
    const { values } = stretchStats(posed);
    const vertexValue = new Float32Array(count).fill(1);
    const index = mesh.geometry.index!;
    for (let t = 0; t < values.length; t++) for (let k = 0; k < 3; k++) { const i = index.getX(t * 3 + k); vertexValue[i] = Math.max(vertexValue[i]!, values[t]!); }
    for (let i = 0; i < count; i++) ramp(vertexValue[i]!, color).toArray(colors, i * 3);
  } else if (mode.startsWith('shell')) {
    // Orange: covered layers (they yield depth to their cover and their backs are not drawn); grey: everything else.
    const hidden = mesh.geometry.getAttribute('aTvHidden');
    for (let i = 0; i < count; i++) colors.set(hidden?.getX(i) ? [1, 0.45, 0.1] : [0.55, 0.55, 0.55], i * 3);
  } else if (mode.startsWith('release')) {
    // Red: arm surface handed to the body; blue: cloth shared by both legs.
    const inspection = npcSkinInspection(mesh.geometry);
    for (let i = 0; i < count; i++) colors.set([0.25 + 0.75 * (inspection?.release[i] ?? 0), 0.25, 0.25 + 0.75 * Math.min(1, 3 * (inspection?.legShared[i] ?? 0))], i * 3);
  } else if (mode.startsWith('legs')) {
    // Red: left leg's share, blue: right leg's share, purple where both legs share cloth; green-grey for the body.
    const names = mesh.skeleton.bones.map(b => b.name);
    const si = mesh.geometry.getAttribute('skinIndex'), sw = mesh.geometry.getAttribute('skinWeight');
    for (let i = 0; i < count; i++) {
      let l = 0, r = 0, arm = 0;
      for (let s = 0; s < 4; s++) {
        const n = names[si.getComponent(i, s)]!, w = sw.getComponent(i, s);
        if (n === 'legL' || n === 'kneeL') l += w; else if (n === 'legR' || n === 'kneeR') r += w; else if (n.startsWith('arm') || n.startsWith('elbow')) arm += w;
      }
      colors.set([l + arm * 0.9, 0.22 + arm * 0.7, r], i * 3);
    }
  } else if (mode.startsWith('weights')) {
    const names = mesh.skeleton.bones.map(b => b.name);
    const si = mesh.geometry.getAttribute('skinIndex'), sw = mesh.geometry.getAttribute('skinWeight');
    const tint: Record<string, [number, number, number]> = {
      armL: [1, 0.15, 0.1], elbowL: [1, 0.55, 0.1], armR: [0.1, 0.3, 1], elbowR: [0.1, 0.8, 1], hips: [0.55, 0.55, 0.55], torso: [0.85, 0.85, 0.85],
      head: [1, 0.95, 0.3], legL: [0.2, 0.75, 0.25], kneeL: [0.6, 0.9, 0.3], legR: [0.55, 0.2, 0.7], kneeR: [0.85, 0.5, 0.9],
    };
    for (let i = 0; i < count; i++) {
      let r = 0, g = 0, b = 0;
      for (let s = 0; s < 4; s++) { const w = sw.getComponent(i, s), t = tint[names[si.getComponent(i, s)]!]!; r += w * t[0]; g += w * t[1]; b += w * t[2]; }
      colors.set([r, g, b], i * 3);
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  debugMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
  debugMesh.castShadow = debugMesh.receiveShadow = true;
  mesh.add(debugMesh);
  (mesh.material as THREE.Material).visible = false;
  render();
  return true;
}

function frame() { render(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

// A plank bench like the village's (1.9 x 0.42, top at `height`), its centre 4 cm behind the sitter's hip joint.
let bench: THREE.Mesh | null = null;
function setBench(height: number | null) {
  if (bench) { scene.remove(bench); bench.geometry.dispose(); (bench.material as THREE.Material).dispose(); bench = null; }
  if (height !== null) {
    bench = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.42), new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 0.85 }));
    bench.position.set(0, height - 0.045, -0.04);
    bench.castShadow = bench.receiveShadow = true;
    scene.add(bench);
  }
  render();
  return true;
}

// Work sites: a counter top or a rock face before the figure.
let site: THREE.Mesh | null = null;
function setSite(kind: 'counter' | 'face' | null) {
  if (site) { scene.remove(site); site.geometry.dispose(); (site.material as THREE.Material).dispose(); site = null; }
  if (kind === 'counter') {
    site = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.02, 0.6), new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 0.85 }));
    site.position.set(0, 0.51, 0.42 + 0.3);
  } else if (kind === 'face') {
    site = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.5), new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.95 }));
    site.position.set(0, 0.9, 0.52 + 0.25);
  }
  if (site) { site.castShadow = site.receiveShadow = true; scene.add(site); }
  render();
  return true;
}

function angles(changes: Record<string, number>) {
  if (!rig) throw new Error('load first');
  const all = { ...REST_ANGLES, ...changes };
  Object.assign(rig.cur, all);
  applyRigAngles(rig, all);
  rig.root.updateMatrixWorld(true);
  if (debugMode !== 'shaded') setDebug(debugMode);
  render();
  return true;
}

Object.assign(window, { lab: { load, pose, angles, bench: setBench, site: setSite, view, stats, debug: setDebug, render, posed: skinCpu, overlay(on: boolean) { overlayOn = on; render(); return true; }, get rig() { return rig; }, get mesh() { return skinned; }, scene, camera, renderer, THREE } });
status.textContent = 'ready';
document.title = 'LAB READY';
