/**
 * A local film compositor. The scene and original artwork come straight from the game; a hidden, full-size menu made
 * by createMenuScreen supplies the layout and computed fonts. This is an animated native render, never a still loop.
 * MediaRecorder captures only the canvas; the user's full, untouched song is muxed into the delivered file afterwards.
 */
import * as THREE from 'three';
import '../src/style.css';
import { MenuScene, type MenuResources } from '../src/presentation/menuScene';
import { Grade } from '../src/presentation/grade';
import { createMenuScreen } from '../src/presentation/ui/menuView';
import { h } from '../src/presentation/ui/dom';
import { paintBronzeFrame, paintGrimeDark, paintGrimeLight, paintLeather, type Pixels } from '../src/presentation/ui/menuMaterials';
import { sharedNoise } from '../src/presentation/noiseTextures';
import { MaterialSet } from '../src/presentation/regions';
import { barkTextures, leafTexture } from '../src/presentation/treeTextures';
import { makeTerrainTextures } from '../src/presentation/terrainTextures';
import { GAME_VERSION } from '../src/version';

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const FULL_DURATION = 216;
const SONG_DURATION = 214.213;
const style = document.createElement('style');
style.textContent = `
  html,body { overflow:auto; height:auto; min-height:100%; background:#131617; }
  #film-app { min-height:100vh; padding:14px; display:flex; flex-direction:column; align-items:center; gap:12px; }
  #film-controls { width:min(1200px,100%); display:flex; flex-wrap:wrap; align-items:center; gap:10px; font:14px/1.4 system-ui,sans-serif; color:#e4d7bc; }
  #film-controls p { margin:3px 0; color:#b9b5ab; }
  #film-controls >div { flex:1 1 450px; }
  #film-controls button { background:#32332e; color:#f0e3c7; border:1px solid #797361; border-radius:4px; padding:10px 14px; font:600 14px system-ui,sans-serif; cursor:pointer; }
  #film-controls button:disabled { opacity:.45; cursor:default; }
  #film-status { flex:1 1 100%; overflow-wrap:anywhere; }
  #film-progress { width:100%; height:12px; accent-color:#a4804b; }
  #film-output { display:block; width:min(100%,calc((100vh - 200px) * 16 / 9)); height:auto; aspect-ratio:16/9; }
  #film-layout { position:fixed; left:-4000px; top:0; width:1920px; height:1080px; pointer-events:none; --ui-scale:1; }
  #film-layout .menu-column { padding:48px 16px 26px; }
  #film-layout .menu-heading { width:780px; }
  #film-layout .menu-mark { margin-top:10px; }
  #film-layout .menu-well { width:380px; margin-top:12px; padding:7px; --well-frame:24px; }
  #film-layout .menu-kicker { width:560px; letter-spacing:.3em; font-size:.9rem; }
  #film-layout .menu-choices { flex:1 1 auto; overflow:auto; }
  #film-layout .menu-choices .btn { min-height:42px; padding:7px 26px; font-size:1.3rem; }
`;
document.head.append(style);

const output = document.querySelector<HTMLCanvasElement>('#film-output')!;
const ctx = output.getContext('2d', { alpha: false })!;
const layout = document.querySelector<HTMLElement>('#film-layout')!;
const status = document.querySelector<HTMLOutputElement>('#film-status')!;
const progress = document.querySelector<HTMLProgressElement>('#film-progress')!;
const fullButton = document.querySelector<HTMLButtonElement>('#film-record')!;
const testButton = document.querySelector<HTMLButtonElement>('#film-test')!;
const choices = ['New Game', 'Load', 'Settings', 'Controls', 'About this build'];
layout.append(createMenuScreen({
  menu: h('div', { class: 'menu-list' }, choices.map((label) => h('button', { class: 'btn', type: 'button' }, label))),
  subtitle: 'Templars of the Hegemony', version: GAME_VERSION, variant: 'title',
}));

function pixelsCanvas(pixels: Pixels) {
  const canvas = document.createElement('canvas');
  canvas.width = pixels.w;
  canvas.height = pixels.h;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(pixels.w, pixels.h);
  image.data.set(pixels.data);
  context.putImageData(image, 0, 0);
  return canvas;
}

const dark = pixelsCanvas(paintGrimeDark());
const light = pixelsCanvas(paintGrimeLight());
const leather = pixelsCanvas(paintLeather());
const frame = paintBronzeFrame();
const bronze = pixelsCanvas(frame.pixels);
const overlay = document.createElement('canvas');
overlay.width = WIDTH;
overlay.height = HEIGHT;
const ui = overlay.getContext('2d')!;

function rect(element: Element) {
  const bounds = element.getBoundingClientRect();
  const reference = layout.getBoundingClientRect();
  return { x: bounds.x - reference.x, y: bounds.y - reference.y, w: bounds.width, h: bounds.height };
}

function tiled(context: CanvasRenderingContext2D, source: HTMLCanvasElement, size: number, x: number, y: number, w: number, h: number, offsetX = 0, offsetY = 0) {
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  const startX = x - ((x - offsetX) % size + size) % size;
  const startY = y - ((y - offsetY) % size + size) % size;
  for (let yy = startY; yy < y + h; yy += size) {
    for (let xx = startX; xx < x + w; xx += size) context.drawImage(source, xx, yy, size, size);
  }
  context.restore();
}

/** CSS border-image: round, using the game's own 192px bronze casting and its 48px source slices. */
function nineSlice(context: CanvasRenderingContext2D, image: HTMLCanvasElement, slice: number, border: number, x: number, y: number, width: number, height: number) {
  const sourceMid = image.width - 2 * slice;
  const edgeUnit = sourceMid * border / slice;
  const nx = Math.max(1, Math.round((width - 2 * border) / edgeUnit));
  const ny = Math.max(1, Math.round((height - 2 * border) / edgeUnit));
  const dx = (width - 2 * border) / nx;
  const dy = (height - 2 * border) / ny;
  for (let sideY = 0; sideY < 2; sideY++) {
    for (let sideX = 0; sideX < 2; sideX++) {
      context.drawImage(image, sideX * (image.width - slice), sideY * (image.height - slice), slice, slice,
        x + sideX * (width - border), y + sideY * (height - border), border, border);
    }
    for (let i = 0; i < nx; i++) context.drawImage(image, slice, sideY * (image.height - slice), sourceMid, slice,
      x + border + i * dx, y + sideY * (height - border), dx, border);
  }
  for (let sideX = 0; sideX < 2; sideX++) {
    for (let i = 0; i < ny; i++) context.drawImage(image, sideX * (image.width - slice), slice, slice, sourceMid,
      x + sideX * (width - border), y + border + i * dy, border, dy);
  }
}

function text(context: CanvasRenderingContext2D, element: HTMLElement, line: string, shadow = true) {
  const box = rect(element);
  const css = getComputedStyle(element);
  context.save();
  context.font = `${css.fontVariant} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = css.color;
  context.letterSpacing = css.letterSpacing === 'normal' ? '0px' : css.letterSpacing;
  if (shadow) {
    context.shadowColor = 'rgba(0,0,0,.85)';
    context.shadowBlur = element.classList.contains('btn') ? 7 : 6;
    context.shadowOffsetY = 1;
  }
  context.fillText(line, box.x + box.w / 2, box.y + box.h / 2);
  context.restore();
}

function buildUiOverlay() {
  ui.clearRect(0, 0, WIDTH, HEIGHT);
  const art = layout.querySelector<HTMLCanvasElement>('.menu-wordmark-art')!;
  const artBox = rect(art);
  ui.drawImage(art, artBox.x, artBox.y, artBox.w, artBox.h);
  const kicker = layout.querySelector<HTMLElement>('.menu-kicker')!;
  const kickerSpan = kicker.querySelector<HTMLElement>('span')!;
  text(ui, kickerSpan, kickerSpan.textContent!);
  const kickBox = rect(kicker);
  const spanBox = rect(kickerSpan);
  const rule = (x: number, end: number, reverse: boolean) => {
    const gradient = ui.createLinearGradient(reverse ? end : x, 0, reverse ? x : end, 0);
    gradient.addColorStop(0, 'rgba(176,138,80,0)');
    gradient.addColorStop(.35, 'rgba(176,138,80,.85)');
    gradient.addColorStop(1, 'rgba(120,90,52,.75)');
    ui.fillStyle = gradient;
    ui.fillRect(x, kickBox.y + kickBox.h / 2, end - x, 1);
  };
  rule(kickBox.x, spanBox.x - 12.96, false);
  rule(spanBox.x + spanBox.w + 12.96, kickBox.x + kickBox.w, true);

  const well = layout.querySelector<HTMLElement>('.menu-well')!;
  const w = rect(well);
  const border = parseFloat(getComputedStyle(well).borderTopWidth);
  const panel = document.createElement('canvas');
  panel.width = Math.ceil(w.w);
  panel.height = Math.ceil(w.h);
  const pc = panel.getContext('2d')!;
  tiled(pc, leather, 256, border, border, w.w - 2 * border, w.h - 2 * border);
  const grad = pc.createLinearGradient(0, border, 0, w.h - border);
  grad.addColorStop(0, 'rgba(0,0,0,.30)'); grad.addColorStop(.14, 'rgba(0,0,0,0)');
  grad.addColorStop(.86, 'rgba(0,0,0,.02)'); grad.addColorStop(1, 'rgba(0,0,0,.34)');
  pc.fillStyle = grad;
  pc.fillRect(border, border, w.w - 2 * border, w.h - 2 * border);
  // Inset shading where the oiled leather meets its bronze lip.
  const rim = 14;
  for (let i = 0; i < rim; i++) {
    pc.strokeStyle = `rgba(0,0,0,${0.10 * (1 - i / rim)})`;
    pc.lineWidth = 1;
    pc.strokeRect(border + i + .5, border + i + .5, w.w - 2 * (border + i) - 1, w.h - 2 * (border + i) - 1);
  }
  nineSlice(pc, bronze, frame.slice, border, 0, 0, w.w, w.h);
  ui.save();
  ui.shadowColor = 'rgba(0,0,0,.55)'; ui.shadowBlur = 16; ui.shadowOffsetY = 12;
  ui.drawImage(panel, w.x, w.y);
  ui.shadowColor = 'rgba(0,0,0,.7)'; ui.shadowBlur = 3; ui.shadowOffsetY = 2;
  ui.drawImage(panel, w.x, w.y);
  ui.restore();

  for (const [i, button] of [...layout.querySelectorAll<HTMLButtonElement>('.menu-choices .btn')].entries()) {
    const b = rect(button);
    const cell = ui.createLinearGradient(0, b.y, 0, b.y + b.h);
    cell.addColorStop(0, 'rgba(0,0,0,.30)'); cell.addColorStop(.22, 'rgba(0,0,0,0)');
    cell.addColorStop(.76, 'rgba(0,0,0,0)'); cell.addColorStop(1, 'rgba(0,0,0,.26)');
    ui.fillStyle = cell;
    ui.fillRect(b.x, b.y, b.w, b.h);
    ui.fillStyle = 'rgba(206,168,108,.07)'; ui.fillRect(b.x, b.y, b.w, 1);
    if (i) { ui.fillStyle = 'rgba(0,0,0,.68)'; ui.fillRect(b.x, b.y, b.w, 1); }
    text(ui, button, button.textContent!);
  }
  ui.save();
  ui.globalCompositeOperation = 'multiply'; ui.globalAlpha = .6;
  tiled(ui, dark, 384, w.x + border, w.y + border, w.w - 2 * border, w.h - 2 * border, w.x + border + 40, w.y + border + 90);
  ui.restore();
  const footer = layout.querySelector<HTMLElement>('.menu-build')!;
  text(ui, footer, footer.textContent!);
}

function drawGrime(context: CanvasRenderingContext2D) {
  context.save();
  context.globalCompositeOperation = 'multiply';
  context.globalAlpha = .85;
  tiled(context, dark, 512, 0, 0, WIDTH, HEIGHT);
  context.translate(WIDTH * .5, HEIGHT * .46);
  context.scale(WIDTH * 1.2, HEIGHT * .9);
  const edge = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  edge.addColorStop(.52, 'rgba(6,4,2,0)');
  edge.addColorStop(.78, 'rgba(6,4,2,.34)');
  edge.addColorStop(1, 'rgba(4,3,2,.72)');
  context.fillStyle = edge; context.fillRect(-1, -1, 2, 2);
  context.restore();
  context.save();
  context.globalCompositeOperation = 'screen'; context.globalAlpha = .55 * .85;
  tiled(context, light, 512, 0, 0, WIDTH, HEIGHT, 137, 61);
  context.restore();
}

const pending: Promise<unknown>[] = [];
const resources: MenuResources = {
  noise: () => sharedNoise().detail,
  materials: (size) => new MaterialSet(size),
  terrain: (size) => {
    const promise = makeTerrainTextures(size, () => new Promise((resolve) => setTimeout(resolve, 0)));
    pending.push(promise);
    return promise;
  },
  bark: () => { const bark = barkTextures('oak'); return { map: bark.map.clone(), normal: bark.normal.clone() }; },
  leaf: () => leafTexture('oak').clone(),
  canvas: {
    canvas: (w, h) => { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; return canvas; },
    image: (url) => {
      const promise = new Promise<HTMLImageElement | null>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = url;
      });
      pending.push(promise);
      return promise;
    },
  },
  emblemUrl: '/assets/menu/hegemony-emblem.png',
};

let renderer: THREE.WebGLRenderer;
let menu: MenuScene;
let grade: Grade;
let ready = false;
let recording = false;
let lastFrame = 0;
let recordStarted = 0;
let recordDuration = 0;
let recordOffset = 0;
let previewTime = 0;
let recorder: MediaRecorder | null = null;
let writeQueue = Promise.resolve();
let uploadError: Error | null = null;
let session: { id: string; path: string } | null = null;
let renderedFrames = 0;
let captureFrames = 0;
let mime = '';

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function setButtons(enabled: boolean) { fullButton.disabled = !enabled; testButton.disabled = !enabled; }

async function api(endpoint: string, payload?: BodyInit) {
  const response = await fetch(`/__menu_film/${endpoint}`, {
    method: 'POST', headers: session ? { 'X-Menu-Film-Id': session.id } : {}, ...(payload === undefined ? {} : { body: payload }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Local receiver failed (${response.status}).`);
  return result;
}

async function start(kind: 'test' | 'full') {
  if (!ready || recording) return;
  setButtons(false);
  uploadError = null;
  captureFrames = 0;
  writeQueue = Promise.resolve();
  recordDuration = kind === 'test' ? 5 : FULL_DURATION;
  recordOffset = kind === 'test' ? 40 : 0;
  progress.max = recordDuration;
  progress.value = 0;
  try {
    session = await api('start', JSON.stringify({ kind }));
    const stream = output.captureStream(FPS);
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16_000_000 });
    recorder.ondataavailable = (event) => {
      if (!event.data.size) return;
      writeQueue = writeQueue.then(async () => { await api('chunk', event.data); }).catch((error: unknown) => {
        uploadError = error instanceof Error ? error : new Error(String(error));
        if (recorder?.state === 'recording') recorder.stop();
      });
    };
    recorder.onerror = (event) => {
      uploadError = new Error(`MediaRecorder failed: ${(event as Event & { error?: DOMException }).error?.message ?? 'unknown error'}`);
      if (recorder?.state === 'recording') recorder.stop();
    };
    recorder.onstop = async () => {
      recording = false;
      previewTime = Math.min(SONG_DURATION, recordOffset + recordDuration);
      stream.getTracks().forEach((track) => track.stop());
      status.value = 'Saving the last recording chunks…';
      await writeQueue;
      try {
        const result = await api(uploadError ? 'abort' : 'end');
        if (uploadError) throw uploadError;
        status.value = `Complete · ${formatTime(recordDuration)} · ${captureFrames} rendered frames · ${(result.bytes / 1024 / 1024).toFixed(1)} MiB · ${result.path}`;
        document.title = 'COMPLETE — Tervain menu film';
      } catch (error) {
        status.value = `Recording failed: ${error instanceof Error ? error.message : String(error)} · Partial file: ${session?.path ?? 'none'}`;
        document.title = 'FAILED — Tervain menu film';
      }
      session = null;
      recorder = null;
      setButtons(true);
    };
    // Settle the score pose before starting the encoder so frame zero never inherits a preview seek.
    drawFrame(0, recordOffset);
    recordStarted = performance.now();
    lastFrame = recordStarted;
    recording = true;
    recorder.start(1000);
    document.title = 'RECORDING — Tervain menu film';
    status.value = `Recording ${formatTime(recordDuration)} at 1920 × 1080 / 30 fps · ${session!.path}`;
  } catch (error) {
    recording = false;
    if (session) await api('abort').catch(() => {});
    session = null;
    status.value = `Could not start recording: ${error instanceof Error ? error.message : String(error)}`;
    setButtons(true);
  }
}

function drawFrame(dt: number, songTime: number) {
  menu.update(dt, false, { time: Math.min(SONG_DURATION, songTime), duration: SONG_DURATION, playing: true, gain: 0.5 });
  grade.render(menu.scene, menu.camera, dt);
  ctx.drawImage(renderer.domElement, 0, 0, WIDTH, HEIGHT);
  drawGrime(ctx);
  ctx.drawImage(overlay, 0, 0);
}

function render(now: number) {
  if (!ready) return;
  if (now - lastFrame >= 1000 / FPS - .7) {
    const dt = lastFrame ? (now - lastFrame) / 1000 : 1 / FPS;
    lastFrame = now;
    const songTime = recording ? recordOffset + (now - recordStarted) / 1000 : previewTime;
    drawFrame(dt, songTime);
    renderedFrames++;
    if (recording) captureFrames++;
  }
  if (recording) {
    const elapsed = (now - recordStarted) / 1000;
    progress.value = Math.min(recordDuration, elapsed);
    if (renderedFrames % 15 === 0) status.value = `Recording ${formatTime(elapsed)} / ${formatTime(recordDuration)} · ${captureFrames} rendered frames · Streaming to disk`;
    if (elapsed >= recordDuration && recorder?.state === 'recording') recorder.stop();
  }
  requestAnimationFrame(render);
}

async function boot() {
  try {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error('This browser cannot record a canvas.');
    mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
    if (!mime) throw new Error('This browser does not support WebM recording.');
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(WIDTH, HEIGHT, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      ready = false;
      uploadError = new Error('The WebGL context was lost during recording.');
      if (recorder?.state === 'recording') recorder.stop();
      else status.value = uploadError.message;
      setButtons(false);
    });
    menu = new MenuScene({ quality: 'high', resources });
    menu.resize(WIDTH, HEIGHT);
    grade = new Grade(renderer, { msaa: true });
    grade.bloom = true;
    grade.setSize(WIDTH, HEIGHT);
    grade.setLook({ saturation: .9, contrast: 1.07, vignette: .3, grain: .03, chromatic: .0012, night: 0 });
    const assets = await Promise.all(pending);
    if (assets.some((asset) => asset === null)) throw new Error('A menu texture or the Hegemony emblem could not load.');
    await document.fonts.ready;
    menu.prepare(renderer);
    await renderer.compileAsync(menu.scene, menu.camera);
    buildUiOverlay();
    for (let i = 0; i < 90; i++) { menu.update(1 / FPS, false); grade.render(menu.scene, menu.camera, 1 / FPS); }
    ready = true;
    document.title = 'READY — Tervain menu film';
    status.value = `Ready · ${GAME_VERSION} · ${mime} · High quality · ${menu.stats.triangles.toLocaleString()} menu triangles · Test starts at the 0:40 wisp cue. Full recording starts at score time zero; complete song audio is muxed afterwards.`;
    setButtons(true);
    requestAnimationFrame(render);
  } catch (error) {
    status.value = `Menu recorder could not prepare: ${error instanceof Error ? error.message : String(error)}`;
    document.title = 'FAILED — Tervain menu film';
  }
}

fullButton.addEventListener('click', () => { void start('full'); });
testButton.addEventListener('click', () => { void start('test'); });
window.addEventListener('pagehide', () => {
  if (recorder?.state === 'recording') recorder.stop();
  ready = false;
  grade?.dispose();
  menu?.dispose();
  renderer?.dispose();
});
void boot();
