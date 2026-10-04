import * as THREE from 'three';
import { GothicArchives } from './archive';
import { FirstPersonControls } from './controls';
import { HORIZON_NODE, WorldView } from './scene';
import { SkyDome, dayLight } from './sky';
import {
  type DataSelection,
  type DirectoryHandle,
  canPickDirectory,
  devSelection,
  ensureReadable,
  pickDirectory,
  rememberDirectory,
  rememberedDirectory,
  selectFromDirectory,
  selectFromFiles,
} from './source';
import './style.css';

/**
 * Gothic 3 from the player's own installation, in the browser. The page holds no game data: it reads the archives in
 * the folder the player picks, in this tab, and draws the world around Ardea with its own renderer. See
 * docs/engineering/gothic3-local.md for what is implemented and what is not.
 */

// Lighting works on colours as stored, as Gothic 3's Direct3D 9 renderer did: no colour management, no output
// conversion, no tone mapping.
THREE.ColorManagement.enabled = false;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('world');
const intro = $<HTMLElement>('intro');
const status = $<HTMLElement>('status');
const hud = $<HTMLElement>('hud');

/** Ardea's fishing camp on the Myrtana coast, in Gothic 3 centimetres. */
const START = { x: 84000, z: -19900 };

function setStatus(text: string): void {
  status.textContent = text;
}

async function begin(selection: DataSelection): Promise<void> {
  for (const b of intro.querySelectorAll('button')) (b as HTMLButtonElement).disabled = true;
  setStatus(`Reading the archive tables from ${selection.label}…`);
  const archives = await GothicArchives.open(selection.sources, (done, total, name) => setStatus(`Reading archive tables ${done}/${total}${name ? ` — ${name}` : ''}`));
  setStatus(`Indexed ${archives.byPath.size.toLocaleString()} files. Building Ardea…`);
  await run(archives);
}

async function run(archives: GothicArchives): Promise<void> {
  const params = new URLSearchParams(location.search);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 6000);
  const time = { value: 0 };
  const sky = new SkyDome(time);
  scene.add(sky.mesh);
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -70;
  sc.right = 70;
  sc.top = 70;
  sc.bottom = -70;
  sc.near = 1;
  sc.far = 600;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(hemi);
  // Haze thick enough to soften the middle distance, thin enough that the far mountains stay in sight.
  scene.fog = new THREE.FogExp2(0x9a9a92, Number(params.get('fog') ?? 0.00085));

  // Gothic 3's surface colours are dark as stored; its renderer brightens the lit result. This factor plays that part.
  const overbright = { value: Number(params.get('overbright') ?? 1.8) };
  const detailBox = { value: new THREE.Vector4(1, 1, -1, -1) };
  const world = new WorldView(renderer, archives, { time, overbright, detailBox });
  scene.add(world.root);
  // The game's own cloud maps, if this installation has them.
  void Promise.all([world.textures.get('wolkentest_01.tga'), world.textures.get('wolkentest_02.tga')]).then(([a, b]) => sky.setClouds(a, b));

  let hour = Number(params.get('hour') ?? 15);
  const applyHour = () => {
    const d = dayLight(hour);
    sky.set(d);
    sun.color.copy(d.sun);
    // Three.js's Blinn-Phong divides direct and ambient light by π; these intensities give the intended factors.
    sun.intensity = d.sunIntensity * Math.PI * 1.05;
    hemi.color.copy(d.sky);
    hemi.groundColor.copy(d.ground);
    hemi.intensity = d.ambient * Math.PI;
    (scene.fog as THREE.FogExp2).color.copy(d.fog);
    scene.background = d.fog;
    world.water.skyZenith.value.copy(d.zenith);
    world.water.skyHorizon.value.copy(d.horizon);
    world.water.sunDirection.value.copy(d.sunDirection);
    world.water.sunColor.value.copy(d.sun).multiplyScalar(d.sunIntensity);
  };
  applyHour();

  const radius = Number(params.get('cells') ?? 2);
  const start = { x: Number(params.get('x') ?? START.x), z: Number(params.get('z') ?? START.z) };
  const paths = world.cellsAround(start.x, start.z, radius);
  // Ardea's own sector layers (dynamic objects, the town's interactive pieces).
  const sectors = archives.list((k) => /\/ardea_(city|outdoor)\/.+\.node$/.test(k)).map((e) => e.path);
  const t0 = performance.now();
  await world.loadNodes([...paths, ...sectors], (done, total, label) => setStatus(`Loading ${label === 'meshes' ? 'meshes' : 'world cells'} ${done}/${total}${label && label !== 'meshes' ? ` — ${label}` : ''}`));
  // The whole world in low detail for the horizon.
  if (params.get('horizon') !== '0') await world.loadNodes([HORIZON_NODE], (done, total) => setStatus(`Loading the horizon ${done}/${total}`), 'far');
  console.log(`world loaded in ${((performance.now() - t0) / 1000).toFixed(1)} s`, world.stats);

  const controls = new FirstPersonControls(camera, canvas);
  controls.groundBelow = (x, y, z) => world.groundBelow(x, y, z);
  const startThree = WorldView.toThree(start.x, 0, start.z);
  const ground = world.groundBelow(startThree.x, 300, startThree.z, 600);
  camera.position.set(startThree.x, (ground ?? 20) + Number(params.get('up') ?? 2.5), startThree.z);
  controls.yaw = Number(params.get('yaw') ?? 0.6);
  controls.pitch = Number(params.get('pitch') ?? -0.05);
  if (params.get('walk') === '1') controls.fly = false;

  intro.hidden = true;
  hud.hidden = false;
  const info = $<HTMLElement>('info');
  const hourInput = $<HTMLInputElement>('hour');
  hourInput.value = String(hour);
  hourInput.addEventListener('input', () => {
    hour = Number(hourInput.value);
    applyHour();
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  let last = performance.now();
  let frames = 0;
  let fpsTime = last;
  let fps = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time.value += dt;
    controls.update(dt);
    world.undergrowth.update(camera.position);
    sky.mesh.position.copy(camera.position);
    // The shadow box follows the camera.
    const d = dayLight(hour).sunDirection;
    sun.target.position.copy(camera.position);
    sun.position.copy(camera.position).addScaledVector(d, 250);
    renderer.render(scene, camera);
    frames++;
    if (now - fpsTime > 500) {
      fps = (frames * 1000) / (now - fpsTime);
      frames = 0;
      fpsTime = now;
      const g = WorldView.fromThree(camera.position);
      info.textContent = `${fps.toFixed(0)} fps · ${renderer.info.render.calls} draws · ${(renderer.info.render.triangles / 1e6).toFixed(2)} M triangles · ${world.undergrowth.visible.toLocaleString()} plants · ${controls.fly ? 'flying' : 'walking'} · x ${g.x.toFixed(0)} y ${g.y.toFixed(0)} z ${g.z.toFixed(0)}`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  // For the console and for automated checks.
  (window as unknown as Record<string, unknown>).g3 = { THREE, renderer, scene, camera, world, controls, setHour: (h: number) => { hour = h; applyHour(); } };
  document.title = params.has('shot') ? 'READY' : 'Gothic 3 — from your install';
}

/* ------------------------------------------------------------------ choosing the data */

async function choose(selection: DataSelection | { missing: string[] }): Promise<void> {
  if ('missing' in selection) {
    setStatus(`That folder lacks ${selection.missing.join(', ')}. Choose the Gothic 3 folder or its Data folder.`);
    return;
  }
  try {
    await begin(selection);
  } catch (err) {
    console.error(err);
    setStatus(`Could not read the data: ${(err as Error).message}`);
    for (const b of intro.querySelectorAll('button')) (b as HTMLButtonElement).disabled = false;
  }
}

$('pick').addEventListener('click', async () => {
  if (canPickDirectory()) {
    let dir: DirectoryHandle;
    try {
      dir = await pickDirectory();
    } catch {
      return;
    }
    await rememberDirectory(dir);
    await choose(await selectFromDirectory(dir));
  } else $<HTMLInputElement>('folder').click();
});

$<HTMLInputElement>('folder').addEventListener('change', async (e) => {
  const files = [...((e.target as HTMLInputElement).files ?? [])];
  if (files.length) await choose(selectFromFiles(files));
});

void (async () => {
  const remembered = canPickDirectory() ? await rememberedDirectory() : null;
  if (remembered) {
    const again = $<HTMLButtonElement>('again');
    again.hidden = false;
    again.textContent = `Continue with “${remembered.name}”`;
    again.addEventListener('click', async () => {
      if (await ensureReadable(remembered)) await choose(await selectFromDirectory(remembered));
    });
  }
  const dev = await devSelection();
  if (dev) {
    const button = $<HTMLButtonElement>('dev');
    button.hidden = false;
    button.addEventListener('click', () => void choose(dev));
    if (new URLSearchParams(location.search).has('autostart')) void choose(dev);
  }
})();
