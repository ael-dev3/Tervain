/**
 * Developer preview of the menu grove: the real MenuScene and Grade, the real title overlay, and a song clock you can
 * scrub or play with the actual score. Served by `npm run dev` at /tools/grove.html; not part of the build.
 *
 *   ?t=40        start at this song time (seconds)
 *   ?q=medium    menu quality (low | medium | high)
 *   ?ui=0        hide the title overlay
 *   ?controls=0  hide the scrubber
 *   ?still=1     render one settled frame and set document.title to READY (for headless captures)
 *
 * window.grove exposes the scene and a few helpers for headless scripts (tools/cdp.mjs).
 */
import * as THREE from 'three';
import { MenuScene, type MenuQuality } from '../src/presentation/menuScene';
import { Grade } from '../src/presentation/grade';
import { createMenuScreen } from '../src/presentation/ui/menuView';
import { h } from '../src/presentation/ui/dom';
import { MENU_MUSIC_SOURCES } from '../src/presentation/audio';
import { GAME_VERSION } from '../src/version';

const q = new URLSearchParams(location.search);
const quality = (['low', 'medium', 'high'] as const).find((v) => v === q.get('q')) ?? 'high';
const DURATION = 214.2;
const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
const ui = document.querySelector<HTMLElement>('#ui')!;
const controls = document.querySelector<HTMLElement>('#grove-controls')!;
const slider = document.querySelector<HTMLInputElement>('#grove-time')!;
const clock = document.querySelector<HTMLOutputElement>('#grove-clock')!;
const playButton = document.querySelector<HTMLButtonElement>('#grove-play')!;
if (q.get('controls') === '0') controls.hidden = true;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = quality !== 'low';
renderer.shadowMap.type = THREE.PCFShadowMap;
const grade = new Grade(renderer, { msaa: quality !== 'low' });
grade.bloom = quality !== 'low';
// The app's menu look (App.MENU_LOOK).
grade.setLook({ saturation: 0.9, contrast: 1.07, vignette: 0.3, grain: 0.03, chromatic: 0.0012, night: 0 });

let menu = new MenuScene({ quality: quality as MenuQuality });
let time = Math.max(0, Math.min(DURATION, Number(q.get('t') ?? 40) || 0));
let gain = 0.5;

if (q.get('ui') !== '0') {
  const title = h('div', { class: 'title on' });
  const choices = ['Continue', 'New Game', 'Load', 'Settings', 'Controls', 'About this build'];
  title.append(createMenuScreen({
    menu: h('div', { class: 'menu-list' }, choices.map((label) => h('button', { class: 'btn', type: 'button' }, label))),
    subtitle: 'Templars of the Hegemony', version: GAME_VERSION, variant: 'title',
  }));
  ui.append(title);
}

function resize() {
  const w = window.innerWidth;
  const hh = window.innerHeight;
  renderer.setPixelRatio(1);
  renderer.setSize(w, hh, false);
  grade.setSize(w, hh);
  menu.resize(w, hh);
}
window.addEventListener('resize', resize);
resize();
menu.prepare(renderer);

function music() {
  return { time, duration: DURATION, playing: gain > 0, gain };
}

function render(dt = 1 / 60) {
  grade.render(menu.scene, menu.camera, dt);
}

function showClock() {
  const m = Math.floor(time / 60);
  clock.value = `${m}:${(time - m * 60).toFixed(2).padStart(5, '0')}`;
  slider.value = String(time);
}

/** Jump straight to a song time (a seek), settle the cosmetic clock, and draw. */
function setTime(t: number) {
  time = Math.max(0, Math.min(DURATION, t));
  menu.update(1 / 60, false, music());
  showClock();
  render();
}

/** Play forward from the current time at a fixed frame rate without waiting for real time. */
function advance(seconds: number, fps = 60) {
  const steps = Math.max(1, Math.round(seconds * fps));
  for (let i = 0; i < steps; i++) {
    time = Math.min(DURATION, time + 1 / fps);
    menu.update(1 / fps, false, music());
  }
  showClock();
  render(1 / fps);
}

function rebuild(next: MenuQuality) {
  const traffic = menu.trafficState;
  const awakening = menu.awakeningState;
  menu.dispose();
  menu = new MenuScene({ quality: next, trafficSeed: traffic.seed, trafficTime: traffic.elapsed, awakening });
  resize();
  menu.prepare(renderer);
  grove.menu = menu;
}

// Real-time preview with the actual song (needs a click: browsers block audible autoplay).
let audio: HTMLAudioElement | null = null;
let playing = false;
playButton.addEventListener('click', () => {
  if (!audio) {
    audio = new Audio(new Audio().canPlayType('audio/ogg; codecs="opus"') ? MENU_MUSIC_SOURCES.opus : MENU_MUSIC_SOURCES.aac);
    audio.loop = true;
  }
  if (playing) {
    audio.pause();
    playing = false;
    playButton.textContent = 'Play with song';
    return;
  }
  audio.currentTime = time;
  void audio.play();
  playing = true;
  playButton.textContent = 'Pause';
});
slider.addEventListener('input', () => {
  time = Number(slider.value);
  if (audio && playing) audio.currentTime = time;
});

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (playing && audio) time = audio.currentTime;
  menu.update(dt, false, music());
  showClock();
  render(dt);
  requestAnimationFrame(frame);
}

const grove = {
  menu, renderer, grade, THREE,
  setTime, advance, render, rebuild,
  get time() { return time; },
  setGain(value: number) { gain = Math.max(0, Math.min(1, value)); },
};
(window as unknown as { grove: typeof grove }).grove = grove;

if (q.get('still') === '1') {
  // Let the terrain textures arrive, then draw one settled frame.
  setTimeout(() => {
    setTime(time);
    document.title = 'READY';
  }, 1500);
} else {
  setTime(time);
  requestAnimationFrame(frame);
}
