import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { NativeAssets, assetUrl } from './assets';
import { ExplorerController } from './controls';
import { NativeAnimations } from './animation';
import { NativeTerrain } from './terrain';
import { landscapeDestinations } from './landscape-destinations';
import { showOriginalPlayerState } from './initial-state-view';
import { showOriginalWorldClock } from './world-clock-view';
import { loadNativeHeroPlayerMemory } from './hero-property-runtime';
import type { NativeHeroPlayerMemory } from './hero-property-runtime';
import type { AnimatedActor } from './animation';
import { ARDEA_PEOPLE, ARDEA_QUESTS, PORT_SCOPE } from './content';
import { showOriginalDialogue, showQuestCatalog } from './catalog-view';
import { NativeQuestRuntime, nativeQuestStatusName } from './quest-runtime';
import type { ArdeaScene, ScenePerson } from './types';
import './style.css';

// This is an independent port milestone. It does not import Tervain simulation,
// menus, lore, saves, proprietary native libraries, or the reconstructed engine.
const SAVE_KEY = 'gothic3:ardea:game:v2';
const LEGACY_SAVE_KEY = 'gothic3:ardea:exploration:v1';
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const ui = document.querySelector<HTMLDivElement>('#interface')!;
ui.innerHTML = '<header class="masthead"><div class="eyebrow">Gothic 3 · browser port</div><h1 id="world-title">Ardea</h1><p id="world-caption">Recovered scene · native landscape</p></header>' +
  '<nav class="toolbar"><button id="explore-button">Explore</button><button id="view-button">Third person</button><button id="character-button">Character</button><button id="landscape-button">Landscape</button><button id="inspect-button">Models <kbd>Tab</kbd></button><button id="journal-button">Journal <kbd>J</kbd></button><button id="map-button">Map <kbd>M</kbd></button><button id="save-button">Save <kbd>P</kbd></button><button id="help-button">Help</button><a href="../">Tervain ↗</a></nav>' +
  '<div class="crosshair" id="crosshair"></div><div class="prompt hidden" id="prompt"></div><div class="toast hidden" id="toast" role="status"></div>' +
  '<footer class="bottom"><div class="keys" id="keys"><kbd>W A S D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; drag mouse / click for mouse look<br><kbd>E</kbd> inspect person &nbsp; <kbd>F</kbd> fly &nbsp; <kbd>R</kbd> return to arrival &nbsp; <kbd>Esc</kbd> release mouse</div><div class="coordinate"><span id="coordinates">Loading native scene</span><div id="world-clock"></div><div id="terrain-status"></div><div class="scope-tag">Work in progress · native gameplay still being rewritten</div></div></footer>' +
  '<section class="inspector panel hidden" id="inspector"><div class="eyebrow">Original geometry</div><h2>Character inspection</h2><select id="model-select" aria-label="Character model"></select><div class="row"><button id="wire-button">Wireframe</button><button id="spin-button">Rotate</button><button id="frame-button">Frame</button></div><div id="animation-controls" class="hidden"><label for="clip-select">Native motion</label><select id="clip-select" aria-label="Native motion"><option value="">Bind pose</option></select><button id="clip-play" disabled>Play motion</button></div><p>Drag to rotate · wheel to zoom · right-drag to pan.</p><p id="model-info">Native body and head; exported bind pose.</p><div class="source" id="model-source"></div></section>' +
  '<section class="modal panel hidden" id="modal" aria-label="Information"><button class="close" id="modal-close" aria-label="Close panel">×</button><div id="modal-content"></div></section>' +
  '<div class="map hidden" id="map"><span class="map-label">ARDEA · LOCAL POSITIONS</span><canvas id="map-view" width="488" height="488" aria-label="Local positions map"></canvas></div>' +
  '<div class="loading" id="loading"><section class="intro"><div class="eyebrow">Gothic 3 · TypeScript reconstruction</div><h1>Ardea</h1><h2>The shore of Myrtana</h2><p>Walk through the recovered scene. Inspect original character models, Hero motion and the landscapes of Myrtana, Nordmar and Varant.</p><div class="rule"></div><p>Terrain loads as you move. A source-backed fresh quest state starts Xardas’s first quest. Dialogue actions, NPC simulation and combat are still being rebuilt.</p><div class="progress"><span id="progress"></span></div><div class="load-status" id="load-status">Reading scene manifest…</div><button class="primary" id="start-button" disabled>Enter Ardea</button><small>Independent from Tervain’s original game.<br>Keyboard and mouse · WebGL · local browser saves</small></section></div>';

const element = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
// Preview brightness is a browser choice; the original lighting is not ported.
renderer.toneMappingExposure = 3;
const world = new THREE.Scene();
world.background = new THREE.Color(0x94abb4);
world.fog = new THREE.Fog(0x94abb4, 350, 1000);
world.add(new THREE.HemisphereLight(0xe6f0f0, 0x77725c, 2.2));
world.add(new THREE.AmbientLight(0xf0eadd, 0.5));
const sunlight = new THREE.DirectionalLight(0xffedcf, 2.4);
sunlight.position.set(-90, 140, -60);
world.add(sunlight);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.06, 2200);
const assets = new NativeAssets(renderer);
const animations = new NativeAnimations();
const terrain = new NativeTerrain(renderer);
world.add(terrain.group);
const sceneObjects: THREE.Object3D[] = [];
const legacyTerrain: THREE.Object3D[] = [];
let nativeTerrainActive = false;
let landscapeName: string | null = 'Ardea';
const peopleObjects = new Map<string, THREE.Group>();
const failures: string[] = [];
let manifest: ArdeaScene;
let started = false;
let inspectMode = false;
let selectedPerson: ScenePerson | null = null;
let nearest: ScenePerson | null = null;
let modalOpen = false;
let panelLifetime = new AbortController();
let spinning = false;
let wireframe = false;
let toastUntil = 0;
let inspectRequest = 0;
let inspectorModel: THREE.Group | null = null;
let inspectorActor: AnimatedActor | null = null;
let heroActor: AnimatedActor | null = null;
let playerClipName: string | null = null;
let thirdPerson = false;
let lastHeroX = 0;
let lastHeroZ = 0;
let hasLastHeroPosition = false;
const playerCameraForward = new THREE.Vector3();
const playerFocus = new THREE.Vector3();
let mapShown = false;
let lastFrame = performance.now();
let lastHud = 0;
let nativeHeroMemory: Promise<NativeHeroPlayerMemory> | null = null;
let questRuntime: NativeQuestRuntime | null = null;
let questRuntimeError: string | null = null;
let enteringWorld = false;

const inspection = new THREE.Scene();
inspection.background = new THREE.Color(0x303d36);
inspection.add(new THREE.HemisphereLight(0xf0f0df, 0x515044, 2.1));
inspection.add(new THREE.AmbientLight(0xf0eadd, 0.5));
const inspectionLight = new THREE.DirectionalLight(0xffead1, 2.8);
inspectionLight.position.set(-3, 5, -4);
inspection.add(inspectionLight);
const inspectionFill = new THREE.DirectionalLight(0xc5dbea, 0.7);
inspectionFill.position.set(3, 2, 3);
inspection.add(inspectionFill);
const grid = new THREE.GridHelper(6, 30, 0x7a8870, 0x414e43);
grid.position.y = -0.006;
inspection.add(grid);
const inspectCamera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.01, 100);
const orbit = new OrbitControls(inspectCamera, canvas);
orbit.enableDamping = true;
orbit.minDistance = 0.2;
orbit.maxDistance = 20;
orbit.enabled = false;

const explorer = new ExplorerController(camera, canvas, (action) => {
  if (action === 'interact') inspectNearby();
  if (action === 'inspect') void setInspection(!inspectMode);
  if (action === 'journal') showJournal();
  if (action === 'save') save();
  if (action === 'reset') { landscapeName = 'Ardea'; explorer.reset(); notify('Returned to the original scene arrival point.'); }
  if (action === 'map') toggleMap();
  if (action === 'fly') notify(explorer.fly ? 'Free flight · Space up · Q down' : 'Grounded exploration');
});
explorer.active = false;
explorer.walkSurfaceReady = (position) => !nativeTerrainActive || terrain.hasGroundAt(position);

function paragraph(parent: HTMLElement, text: string, className?: string): void {
  const p = document.createElement('p');
  p.textContent = text;
  if (className) p.className = className;
  parent.appendChild(p);
}

function notify(message: string): void {
  element('toast').textContent = message;
  element('toast').classList.remove('hidden');
  toastUntil = performance.now() + 5000;
}

function releaseMouse(): void {
  if (document.pointerLockElement === canvas) document.exitPointerLock();
}

function openPanel(title: string): HTMLElement {
  panelLifetime.abort();
  panelLifetime = new AbortController();
  releaseMouse();
  modalOpen = true;
  explorer.active = false;
  const content = element('modal-content');
  content.replaceChildren();
  const eyebrow = document.createElement('div');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Ardea · browser milestone';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  content.append(eyebrow, h2);
  element('modal').classList.remove('hidden');
  return content;
}

function closePanel(): void {
  panelLifetime.abort();
  modalOpen = false;
  element('modal').classList.add('hidden');
  explorer.active = started && !inspectMode;
}

function inspectNearby(): void {
  if (!nearest || inspectMode) return;
  const person = nearest;
  const content = openPanel(person.name);
  const facts = ARDEA_PEOPLE.find((entry) => entry.id.toLowerCase() === person.id.toLowerCase() || entry.name.toLowerCase() === person.name.toLowerCase());
  paragraph(content, facts?.role ?? 'Person placed in the original Ardea scene.');
  paragraph(content, facts?.summary ?? 'This character’s model and position are read from the local game’s compiled world data.');
  paragraph(content, 'This is character inspection. Original dialogue, voice playback and quest actions are not enabled in this milestone.');
  if (facts?.questIds.length) {
    const h3 = document.createElement('h3');
    h3.textContent = 'Original quest references';
    content.append(h3);
    for (const id of facts.questIds) {
      const quest = ARDEA_QUESTS.find((entry) => entry.id === id);
      paragraph(content, quest ? quest.title + ' — ' + quest.summary : id);
    }
  }
  const button = document.createElement('button');
  button.textContent = 'Inspect 3D model';
  button.onclick = () => { closePanel(); void setInspection(true, person.id); };
  content.append(button);
  paragraph(content, person.source + (person.body ? ' · ' + person.body : '') + (person.head ? ' · ' + person.head : ''), 'source');
  void showOriginalDialogue(content, person.name);
}

function showJournal(): void {
  const content = openPanel('Original quest journal');
  if (!questRuntime) {
    paragraph(content, questRuntimeError
      ? 'The browser could not load the source-backed quest session: ' + questRuntimeError
      : 'Enter Ardea to load the new-world quest state.');
    paragraph(content, 'The static source catalog is shown below for reference; it is not gameplay state.');
    if (questRuntimeError) void showQuestCatalog(content);
    return;
  }
  const lifetime = panelLifetime.signal;
  const intro = document.createElement('p');
  intro.textContent = 'Fresh-world state from the original quest manager and compiled runtime records. The audited OnGameStartUp RunQuest starts Xardas_FindXardas at the source clock time. Other native startup callbacks, dialogue and quest rewards are still unimplemented.';
  content.append(intro);
  const controls = document.createElement('div'); controls.className = 'catalog-controls';
  const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Search quest id, folder or destination'; search.setAttribute('aria-label', 'Search active quest journal');
  const status = document.createElement('select'); status.setAttribute('aria-label', 'Filter quests by status');
  const statusOptions: [string, string][] = [['running', 'Running'], ['all', 'All statuses'],
    ['open', 'Open'], ['success', 'Success'], ['failed', 'Failed'], ['obsolete', 'Obsolete'],
    ['cancelled', 'Cancelled'], ['lost', 'Lost'], ['won', 'Won']];
  for (const [value, label] of statusOptions) status.add(new Option(label, value, false, value === 'running'));
  controls.append(search, status); content.append(controls);
  const count = document.createElement('p'); count.className = 'record-meta'; content.append(count);
  const results = document.createElement('div'); content.append(results);
  let shown = 0;
  const more = document.createElement('button'); more.textContent = 'Show more quests';
  const matches = () => {
    const query = search.value.trim().toLocaleLowerCase();
    const filter = status.value;
    return questRuntime!.rows().filter(({ definition, state: sourceState }) => {
      if (filter !== 'all' && nativeQuestStatusName(sourceState.status).toLowerCase() !== filter) return false;
      return !query || [definition.id, definition.folder, definition.destination].some((value) => value.toLocaleLowerCase().includes(query));
    });
  };
  const render = (): void => {
    const filtered = matches();
    count.textContent = filtered.length + ' source quest states · world clock ' + formatQuestClock(questRuntime!.currentClock());
    results.replaceChildren(); shown = 0;
    more.onclick = () => append(filtered);
    append(filtered);
  };
  const append = (filtered: ReturnType<typeof matches>): void => {
    more.remove();
    const end = Math.min(shown + 40, filtered.length);
    while (shown < end) {
      const item = filtered[shown++]!;
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = item.definition.id + ' · ' + nativeQuestStatusName(item.state.status);
      details.append(summary);
      paragraph(details, 'Folder: ' + item.definition.folder + ' · destination: ' + (item.definition.destination || 'unresolved'));
      if (item.definition.deliveryTargets.length) paragraph(details, 'Source delivery counters: ' + item.definition.deliveryTargets.map((target, index) =>
        target.entity + ' ' + (item.state.counters[index] ?? '?') + ' / ' + (target.amount ?? '?')).join(' · '));
      if (item.state.startedAt) paragraph(details, 'Started at Year ' + item.state.startedAt.years + ' · Day ' + item.state.startedAt.days + ' · ' + item.state.startedAt.hours + ':00');
      if (item.state.logPairs?.length) paragraph(details, 'Original log localization keys: ' + item.state.logPairs.map((pair) => pair.textKey).join(', '));
      paragraph(details, item.definition.source.archive + ' · ' + item.definition.source.path + ' · SHA-256 ' + item.definition.source.sha256, 'source');
      results.append(details);
    }
    if (shown < filtered.length) results.append(more);
  };
  more.onclick = () => append(matches());
  search.oninput = render; status.onchange = render;
  const unsubscribe = questRuntime.subscribe(render);
  lifetime.addEventListener('abort', unsubscribe, { once: true });
  render();
}

function formatQuestClock(clock: { years: number; days: number; hours: number }): string {
  return 'Year ' + clock.years + ' · Day ' + clock.days + ' · ' + String(clock.hours).padStart(2, '0') + ':00';
}

function formatWorldClock(clock: { year: number; day: number; hour: number; minute: number; second: number }): string {
  const time = [clock.hour, clock.minute, clock.second].map((value) => String(value).padStart(2, '0')).join(':');
  return 'Year ' + clock.year + ' · Day ' + clock.day + ' · ' + time;
}

function showCharacterSheet(): void {
  const content = openPanel('PC_Hero · Character');
  const lifetime = panelLifetime.signal;
  paragraph(content, 'Reading the original Hero PlayerMemory and Attribute property sets…');
  if (!nativeHeroMemory) {
    nativeHeroMemory = loadNativeHeroPlayerMemory().catch((error: unknown) => {
      nativeHeroMemory = null;
      throw error;
    });
  }
  void nativeHeroMemory.then(result => {
    if (lifetime.aborted) return;
    content.replaceChildren();
    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Original Hero data · verified serialized PC_Hero';
    const heading = document.createElement('h2');
    heading.textContent = 'Nameless Hero';
    content.append(eyebrow, heading);
    paragraph(content, 'Chapter ' + result.memory.getChapter() + ' · XP ' + result.memory.getXP() +
      ' · learning points ' + result.memory.getLPAttribs() + ' attribute / ' + result.memory.getLPPerks() + ' perk');

    const table = document.createElement('table');
    table.className = 'character-table';
    const head = document.createElement('thead');
    const header = document.createElement('tr');
    for (const label of ['Attribute', 'Value', 'Maximum', 'Modifier']) {
      const cell = document.createElement('th'); cell.textContent = label; header.append(cell);
    }
    head.append(header);
    const body = document.createElement('tbody');
    for (const [tag, attribute] of result.memory.attributes) {
      if (!attribute) continue;
      const row = document.createElement('tr');
      const values = [tag, String(result.memory.getValue(tag)), String(result.memory.getMaximum(tag)), String(result.memory.getModifier(tag))];
      for (const value of values) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      body.append(row);
    }
    table.append(head, body); content.append(table);
    paragraph(content, 'Loaded ' + result.cursor.consumed + ' of ' + result.cursor.total +
      ' packet bytes from source record ' + result.source.sha256.slice(0, 16) + '…');
    paragraph(content, 'The browser now retains the source PlayerMemory and all 15 Attribute/Stat objects. One audited startup quest transition is connected to the live journal; the remaining native new-game callbacks and later stat, combat, and XP progression are not connected to ordinary play yet. Unknown native enum bits remain masked.');
    if (result.summary.logs.length) {
      paragraph(content, result.summary.logs.length + ' source warning/info records were retained by the browser host.', 'source');
    }
  }).catch((error: unknown) => {
    if (lifetime.aborted) return;
    content.replaceChildren();
    const heading = document.createElement('h2'); heading.textContent = 'Hero data could not be loaded'; content.append(heading);
    paragraph(content, String(error), 'warnings');
    paragraph(content, 'The reader stops at the first unsupported native operation and does not invent a fallback value.');
  });
}

function showHelp(): void {
  const content = openPanel('Controls & current scope');
  paragraph(content, 'WASD / arrows: move. Shift: run. Drag to look, or click the scene for captured mouse look. Escape releases the pointer. E inspects a nearby person.');
  paragraph(content, 'F toggles free flight; Space moves up and Q moves down. Third person follows the Hero model and recovered idle, walk and run clips. R returns to the arrival point. P saves your position locally. Tab switches to character models; drag to rotate, wheel to zoom, right-drag to pan. M opens the local position map.');
  paragraph(content, 'Character loads PC_Hero’s serialized PlayerMemory and Attribute/Stat data into the browser’s TypeScript runtime. The quest journal runs one source-audited new-game quest transition; other startup operations and gameplay progression are still being connected.');
  const brightnessLabel = document.createElement('label');
  brightnessLabel.textContent = 'Preview brightness ';
  const brightness = document.createElement('input');
  brightness.type = 'range';
  brightness.min = '0.5'; brightness.max = '5'; brightness.step = '0.1';
  brightness.value = String(renderer.toneMappingExposure);
  brightness.setAttribute('aria-label', 'Preview brightness');
  brightness.oninput = () => { renderer.toneMappingExposure = Number(brightness.value); };
  brightnessLabel.append(brightness);
  content.append(brightnessLabel);
  paragraph(content, 'Terrain uses the recovered texture, blend and UV graphs, including original tangent-space normal maps. Global lighting, specular lookup, lightmaps and lower texture mips remain browser approximations.');
  const terrainStatus = terrain.status();
  paragraph(content, 'Landscape: ' + terrainStatus.cells + ' resident cells from ' + terrainStatus.total + ', ' + terrainStatus.triangles.toLocaleString() + ' triangles. Terrain and texture downloads are bounded.');
  const h3 = document.createElement('h3');
  h3.textContent = 'Current port boundaries';
  content.append(h3);
  const ul = document.createElement('ul');
  for (const text of PORT_SCOPE) {
    const li = document.createElement('li');
    li.textContent = text;
    ul.append(li);
  }
  content.append(ul);
  for (const note of manifest?.notes ?? []) paragraph(content, note);
  if (failures.length) paragraph(content, 'Asset load issues: ' + failures.join('; '), 'warnings');
  for (const issue of terrainStatus.failures) paragraph(content, issue, 'warnings');
  if (terrainStatus.failures.length) {
    const retry = document.createElement('button');
    retry.textContent = 'Retry landscape downloads';
    retry.onclick = () => { terrain.retry(); notify('Retrying landscape downloads.'); };
    content.append(retry);
  }
  const source = document.createElement('a');
  source.href = assetUrl('source-manifest.json');
  source.textContent = 'Open asset provenance';
  source.target = '_blank';
  source.rel = 'noopener';
  content.append(source);
}

async function showLandscape(): Promise<void> {
  const content = openPanel('Explore the landscape');
  paragraph(content, 'Fly above Myrtana, Nordmar and Varant. These views show the original landscape; buildings, caves, vegetation and NPCs beyond Ardea are still being rebuilt.');
  paragraph(content, 'WASD moves, Shift flies faster, Space rises and Q descends. Drag to look. R returns to the Ardea arrival.');
  const choices = document.createElement('div');
  choices.className = 'landscape-choices';
  choices.textContent = 'Reading original locations…';
  content.append(choices);
  try {
    const destinations = await landscapeDestinations();
    if (!choices.isConnected) return;
    choices.replaceChildren();
    for (const destination of destinations) {
      const button = document.createElement('button');
      button.textContent = destination.name + ' · ' + destination.region;
      button.onclick = () => {
        void setInspection(false);
        closePanel();
        landscapeName = destination.name;
        const point = new THREE.Vector3(...destination.position).sub(terrain.originMetres);
        point.y += 90;
        explorer.fly = true;
        explorer.teleport([point.x, point.y, point.z], 0, -0.55);
        terrain.update(explorer.position, performance.now(), true);
        notify('Landscape preview · ' + destination.name + '. Geometry loads as you fly.');
      };
      choices.append(button);
    }
  } catch (error) { choices.textContent = 'Could not read original destinations: ' + String(error); }
  const status = terrain.status();
  paragraph(content, '782 original landscape cells · 2,082,155 triangles across the three regions. Nearby cells stream into view; the entire world is not downloaded at once.');
  if (status.failures.length) paragraph(content, status.failures.length + ' landscape issues are listed in Help.', 'warnings');
  const state = document.createElement('button');
  state.textContent = 'Inspect original character state';
  state.onclick = () => { void showOriginalPlayerState(openPanel('Original character state')); };
  content.append(state);
  const clock = document.createElement('button');
  clock.textContent = 'Inspect original world clock';
  clock.onclick = () => { void showOriginalWorldClock(openPanel('Original world clock'), panelLifetime.signal); };
  content.append(clock);
}

function save(): void {
  if (!started) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 2, ...explorer.getState(), landscapeName,
      nativeSession: questRuntime?.saveData() ?? null }));
    notify(questRuntime
      ? 'Position, world clock and quest journal saved in this browser. Original Gothic 3 saves are separate.'
      : 'Exploration position saved; quest state was unavailable. Original Gothic 3 saves are separate.');
  } catch (error) { notify('Could not save this browser session: ' + String(error)); }
}

function restore(): void {
  let candidates: (string | null)[];
  try { candidates = [localStorage.getItem(SAVE_KEY), localStorage.getItem(LEGACY_SAVE_KEY)]; }
  catch { return; }
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const value = JSON.parse(raw) as { version?: number; position?: unknown; yaw?: unknown; pitch?: unknown; fly?: unknown; landscapeName?: unknown };
      if ((value.version !== 2 && value.version !== 1) || !Array.isArray(value.position) || value.position.length !== 3 ||
          !value.position.every((part) => typeof part === 'number' && Number.isFinite(part)) ||
          typeof value.yaw !== 'number' || !Number.isFinite(value.yaw) ||
          typeof value.pitch !== 'number' || !Number.isFinite(value.pitch)) continue;
      const position = value.position as [number, number, number];
      const origin = terrain.originMetres;
      const absolute = [position[0] + origin.x, position[1] + origin.y, position[2] + origin.z];
      const bounds = terrain.manifest?.cells.map((cell) => cell.boundsMetres) ?? [manifest.bounds];
      const point = terrain.manifest ? absolute : position;
      if (!bounds.some((bound) => point[0]! >= bound.min[0] - 100 && point[0]! <= bound.max[0] + 100 &&
          point[2]! >= bound.min[2] - 100 && point[2]! <= bound.max[2] + 100 &&
          point[1]! >= bound.min[1] - 100 && point[1]! <= bound.max[1] + 1000)) continue;
      landscapeName = typeof value.landscapeName === 'string' && value.landscapeName.length <= 64 ? value.landscapeName : null;
      explorer.fly = value.fly === true;
      explorer.teleport(position, value.yaw, value.pitch);
      notify(value.version === 2 ? 'Restored your saved game session.' : 'Restored your saved exploration position.');
      return;
    } catch { /* Try the previous position-only format if the current record is malformed. */ }
  }
}

function savedNativeSession(): { readonly kind: 'none' } | { readonly kind: 'empty' } |
  { readonly kind: 'saved'; readonly value: unknown } {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return { kind: 'none' };
  const value = JSON.parse(raw) as { version?: number; nativeSession?: unknown };
  if (value.version === 1) return { kind: 'none' };
  if (value.version !== 2) throw new Error('Unsupported browser save version.');
  return value.nativeSession ? { kind: 'saved', value: value.nativeSession } : { kind: 'empty' };
}

async function character(person: ScenePerson): Promise<THREE.Group> {
  const group = new THREE.Group();
  for (const key of [person.body, person.head]) {
    if (!key) continue;
    const model = manifest.models?.[key];
    if (!model) continue;
    group.add(await assets.model(model));
  }
  if (!group.children.length) throw new Error('No exported body/head for ' + person.name);
  group.name = person.name;
  group.userData.source = person.source;
  return group;
}

function frameInspector(): void {
  if (!inspectorModel) return;
  const bounds = new THREE.Box3().setFromObject(inspectorModel, true);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const vfov = THREE.MathUtils.degToRad(inspectCamera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * inspectCamera.aspect);
  const distance = Math.max(size.y / (2 * Math.tan(vfov / 2)), size.x / (2 * Math.tan(hfov / 2))) * 1.3;
  orbit.target.copy(center);
  // Original Gothic 3 exported characters face -Z.
  inspectCamera.position.set(center.x + distance * 0.14, center.y + size.y * 0.08, center.z - distance);
  orbit.update();
}

function updateHeroPresentation(dt: number): void {
  if (!heroActor) {
    camera.position.copy(explorer.position);
    camera.rotation.set(explorer.viewPitch, explorer.heading, 0, 'YXZ');
    return;
  }
  const eye = explorer.position;
  const feetY = eye.y - 1.65;
  heroActor.object.position.set(eye.x, feetY, eye.z);
  heroActor.object.rotation.y = explorer.heading;
  heroActor.object.visible = thirdPerson;

  const moved = hasLastHeroPosition ? Math.hypot(eye.x - lastHeroX, eye.z - lastHeroZ) : 0;
  lastHeroX = eye.x;
  lastHeroZ = eye.z;
  hasLastHeroPosition = true;
  const speed = moved > 0 && moved < 1 ? moved / Math.max(dt, 1 / 240) : 0;
  const role = explorer.fly || speed < 0.15 ? 'idle' : speed < 5.9 ? 'walk' : 'run';
  const motion = heroActor.asset.clips.find((clip) => clip.role === role);
  if (motion && motion.name !== playerClipName) {
    heroActor.select(motion.name);
    playerClipName = motion.name;
  }
  heroActor.update(dt);

  if (!thirdPerson) {
    camera.position.copy(eye);
    camera.rotation.set(explorer.viewPitch, explorer.heading, 0, 'YXZ');
    camera.updateMatrixWorld();
    return;
  }
  const pitch = THREE.MathUtils.clamp(explorer.viewPitch, -0.75, 0.3);
  playerCameraForward.set(Math.sin(explorer.heading) * Math.cos(pitch), Math.sin(pitch),
    -Math.cos(explorer.heading) * Math.cos(pitch));
  playerFocus.set(eye.x, feetY + 1.28, eye.z);
  camera.position.copy(playerFocus).addScaledVector(playerCameraForward, -4.25);
  camera.lookAt(playerFocus);
  camera.updateMatrixWorld();
}

function updateWireframe(): void {
  inspectorModel?.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      (material as THREE.MeshPhongMaterial).wireframe = wireframe;
    }
  });
}

async function selectModel(id: string): Promise<void> {
  const person = [...manifest.people, ...(manifest.inspectionPeople ?? [])].find((entry) => entry.id === id);
  if (!person) return;
  const token = ++inspectRequest;
  element('model-info').textContent = 'Loading ' + person.name + '…';
  try {
    const actor = person.id === 'nameless-hero-exhibit' ? await animations.actor('hero') : null;
    const group = actor?.object ?? await character(person);
    if (token !== inspectRequest) { actor?.destroy(); return; }
    const previousActor = inspectorActor;
    previousActor?.destroy();
    inspectorActor = actor;
    if (inspectorModel) {
      inspection.remove(inspectorModel);
      if (!previousActor) inspectorModel.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
        }
      });
    }
    // Inspector owns materials, preserving world materials when wireframe toggles.
    group.traverse((object) => {
      if (object instanceof THREE.Mesh && !actor) {
        const copyMaterial = (material: THREE.Material): THREE.Material => {
          const result = material.clone();
          result.onBeforeCompile = material.onBeforeCompile;
          result.customProgramCacheKey = material.customProgramCacheKey;
          return result;
        };
        object.material = Array.isArray(object.material) ? object.material.map(copyMaterial) : copyMaterial(object.material);
      }
    });
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.set(-center.x, -box.min.y, -center.z);
    inspection.add(group);
    inspectorModel = group;
    selectedPerson = person;
    updateWireframe();
    frameInspector();
    let triangles = 0;
    let meshes = 0;
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshes++;
        triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
      }
    });
    element('model-info').textContent = person.name + ' · ' + Math.round(triangles).toLocaleString() + ' triangles · ' + meshes + ' material meshes. ' + (actor ? 'All original skin weights and native motion sampling. Clip blending, combat and attachments are still being rebuilt.' : 'Original body + head in exported bind pose; native skinning and clips are not included for this model.');
    element('model-source').textContent = person.source + ' · ' + (person.body ?? '') + ' · ' + (person.head ?? '');
    element('world-caption').textContent = actor ? 'Original character geometry · native Hero motion' : 'Original character geometry · exported bind pose';
    const selector = element<HTMLSelectElement>('clip-select');
    selector.replaceChildren(new Option('Bind pose', ''));
    for (const clip of actor?.asset.clips ?? []) {
      const option = new Option(clip.role + (clip.phase ? ' · ' + clip.phase : '') + ' — ' + clip.name, clip.name);
      option.title = clip.source;
      selector.add(option);
    }
    element('animation-controls').classList.toggle('hidden', !actor);
    element<HTMLButtonElement>('clip-play').disabled = true;
    element('clip-play').textContent = 'Play motion';
    updateInspectorViewport();
    frameInspector();
  } catch (error) {
    if (token !== inspectRequest) return;
    element('model-info').textContent = 'Could not load this character: ' + String(error);
  }
}

async function setInspection(enabled: boolean, id?: string): Promise<void> {
  if (!started) return;
  releaseMouse();
  closePanel();
  inspectMode = enabled;
  orbit.enabled = enabled;
  updateInspectorViewport();
  explorer.active = !enabled;
  element('inspector').classList.toggle('hidden', !enabled);
  element('crosshair').classList.toggle('hidden', enabled);
  element('prompt').classList.add('hidden');
  element('world-caption').textContent = enabled ? 'Original character geometry' : 'Recovered scene · native landscape';
  element('keys').textContent = enabled ? 'Drag to rotate · wheel to zoom · right-drag to pan · Tab returns to Ardea' : 'WASD move · Shift run · drag / click for mouse look · E inspect · F fly · R reset · Esc release';
  if (enabled) {
    const selected = id ?? selectedPerson?.id ?? manifest.inspectionPeople?.[0]?.id ?? manifest.people.find((entry) => entry.body && entry.head)?.id;
    if (selected) {
      element<HTMLSelectElement>('model-select').value = selected;
      await selectModel(selected);
    }
  }
}

function toggleMap(): void {
  mapShown = !mapShown;
  element('map').classList.toggle('hidden', !mapShown);
}

function updateInspectorViewport(): { x: number; y: number; w: number; h: number } {
  // Codex can put a desktop browser in a narrow side panel. Reserve space for
  // the controls rather than covering the character's face with that panel.
  const dock = inspectorActor ? 315 : 235;
  const viewport = innerWidth < 900
    ? { x: 0, y: dock, w: innerWidth, h: Math.max(200, innerHeight - dock) }
    : { x: 380, y: 0, w: Math.max(200, innerWidth - 380), h: innerHeight };
  inspectCamera.aspect = viewport.w / viewport.h;
  inspectCamera.updateProjectionMatrix();
  return viewport;
}

function drawMap(): void {
  if (!manifest || !mapShown) return;
  const mapCanvas = element<HTMLCanvasElement>('map-view');
  const context = mapCanvas.getContext('2d');
  if (!context) return;
  const size = mapCanvas.width;
  context.fillStyle = '#15241c';
  context.fillRect(0, 0, size, size);
  const min = manifest.bounds.min, max = manifest.bounds.max;
  const scale = (size - 60) / Math.max(1, max[0] - min[0], max[2] - min[2]);
  const mapPoint = (x: number, z: number): [number, number] => [30 + (x - min[0]) * scale, 30 + (z - min[2]) * scale];
  context.strokeStyle = '#40503a';
  context.lineWidth = 1;
  for (let i = 30; i < size; i += 40) {
    context.beginPath(); context.moveTo(i, 30); context.lineTo(i, size - 20); context.stroke();
    context.beginPath(); context.moveTo(30, i); context.lineTo(size - 20, i); context.stroke();
  }
  context.fillStyle = '#d7bd86';
  for (const person of manifest.people) {
    const point = mapPoint(person.position[0], person.position[2]);
    context.beginPath(); context.arc(point[0], point[1], 3, 0, Math.PI * 2); context.fill();
  }
  const state = explorer.getState();
  const point = mapPoint(state.position[0], state.position[2]);
  context.save();
  context.translate(point[0], point[1]); context.rotate(-state.yaw);
  context.fillStyle = '#e9e7d5';
  context.beginPath(); context.moveTo(0, -9); context.lineTo(6, 7); context.lineTo(0, 4); context.lineTo(-6, 7); context.closePath(); context.fill();
  context.restore();
}

async function boot(): Promise<void> {
  const response = await fetch(assetUrl('scene.json'));
  if (!response.ok) throw new Error('Scene manifest HTTP ' + response.status);
  manifest = await response.json() as ArdeaScene;
  await Promise.all([
    animations.loadManifest().catch((error: unknown) => { failures.push('Native animation: ' + String(error)); }),
    terrain.initialize().catch((error: unknown) => { failures.push('Native terrain: ' + String(error)); }),
  ]);
  if (manifest.units !== 'metres' || !Array.isArray(manifest.meshes) || !manifest.meshes.length) throw new Error('No recovered world geometry in this scene manifest.');
  const total = manifest.meshes.length + manifest.people.length + 1;
  let done = 0;
  const progress = (label: string): void => {
    element('load-status').textContent = label + ' · ' + done + ' / ' + total;
    element('progress').style.width = (done / Math.max(1, total) * 100) + '%';
  };
  // Bound parallel downloads and parser allocations while showing the scene.
  const jobs: (() => Promise<void>)[] = [
    ...manifest.meshes.map((entry) => async () => {
      try {
        const object = await assets.model({ obj: entry.obj, mtl: entry.mtl, source: entry.source, materials: entry.materials });
        object.position.fromArray(entry.position);
        if (entry.quaternion) object.quaternion.fromArray(entry.quaternion);
        if (entry.scale) object.scale.fromArray(entry.scale);
        object.name = entry.name;
        object.userData.kind = entry.kind;
        if (entry.kind === 'terrain') legacyTerrain.push(object);
        world.add(object);
        object.updateMatrixWorld(true);
        sceneObjects.push(object);
      } catch (error) { failures.push(entry.name + ': ' + String(error)); }
      done++; progress('Recovering Ardea');
    }),
    ...manifest.people.map((person) => async () => {
      try {
        const group = await character(person);
        group.position.fromArray(person.position);
        group.rotation.y = person.rotationY ?? 0;
        world.add(group);
        peopleObjects.set(person.id, group);
      } catch (error) { failures.push(person.name + ': ' + String(error)); }
      done++; progress('Placing original characters');
    }),
    async () => {
      try {
        heroActor = await animations.actor('hero');
        if (!heroActor) throw new Error('Recovered Hero animation asset is not in the manifest');
        heroActor.object.name = 'PC_Hero';
        heroActor.object.userData.source = 'PC_Hero · original native rig and motion tracks';
        heroActor.object.visible = false;
        world.add(heroActor.object);
        const idle = heroActor.asset.clips.find((clip) => clip.role === 'idle');
        if (idle) { heroActor.select(idle.name); playerClipName = idle.name; }
      } catch (error) { failures.push('Hero actor: ' + String(error)); }
      done++; progress('Loading the Hero');
    },
  ];
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      if (job) await job();
    }
  }));
  if (!sceneObjects.length) throw new Error('None of the native world meshes could load. ' + failures.slice(0, 3).join('; '));
  const spawn: [number, number, number] = [...manifest.spawn];
  if (!manifest.spawnIsEye) spawn[1] += 1.65;
  explorer.setWorld(sceneObjects, spawn, manifest.spawnYaw ?? 0);
  element<HTMLButtonElement>('view-button').disabled = heroActor === null;
  const options = element<HTMLSelectElement>('model-select');
  for (const person of [...(manifest.inspectionPeople ?? []), ...manifest.people]) {
    if (!person.body || !person.head) continue;
    const option = document.createElement('option');
    option.value = person.id;
    option.textContent = person.name;
    options.appendChild(option);
  }
  element('load-status').textContent = sceneObjects.length + ' scene objects · ' + peopleObjects.size + ' characters ready' + (failures.length ? ' · ' + failures.length + ' load warnings' : '');
  element<HTMLButtonElement>('start-button').disabled = false;
}

async function enterWorld(): Promise<void> {
  if (started || enteringWorld) return;
  enteringWorld = true;
  const button = element<HTMLButtonElement>('start-button');
  button.disabled = true;
  element('load-status').textContent = 'Loading original new-world quest state and clock…';
  let restoredSession = false;
  try {
    const savedSession = savedNativeSession();
    if (savedSession.kind === 'saved') {
      questRuntime = await NativeQuestRuntime.restore(savedSession.value);
      restoredSession = true;
    } else questRuntime = await NativeQuestRuntime.newGame();
    questRuntimeError = null;
  } catch (error) {
    questRuntime = null;
    questRuntimeError = error instanceof Error ? error.message : String(error);
  }
  started = true;
  element('loading').classList.add('hidden');
  explorer.active = true;
  restore();
  canvas.focus();
  if (failures.length) notify('Scene loaded with ' + failures.length + ' asset warnings. See Help for details.');
  if (questRuntime) notify(restoredSession
    ? 'Saved quest journal and world clock restored.'
    : 'New-world quest journal loaded · Xardas_FindXardas is running.');
  else notify('Exploration started without quest progression: ' + questRuntimeError);
  enteringWorld = false;
}
element('start-button').onclick = () => { void enterWorld(); };
element('explore-button').onclick = () => { void setInspection(false); closePanel(); };
element('view-button').onclick = () => {
  if (!heroActor) { notify('The recovered Hero model did not load. See Help for asset errors.'); return; }
  thirdPerson = !thirdPerson;
  element('view-button').textContent = thirdPerson ? 'First person' : 'Third person';
  element('world-caption').textContent = thirdPerson ? 'PC_Hero · recovered native motion preview' : 'Recovered scene · native landscape';
};
element('character-button').onclick = showCharacterSheet;
element('landscape-button').onclick = () => { void showLandscape(); };
element('inspect-button').onclick = () => { void setInspection(!inspectMode); };
element('journal-button').onclick = showJournal;
element('help-button').onclick = showHelp;
element('map-button').onclick = toggleMap;
element('save-button').onclick = save;
element('modal-close').onclick = closePanel;
element<HTMLSelectElement>('model-select').onchange = (event) => { void selectModel((event.target as HTMLSelectElement).value); };
element('frame-button').onclick = frameInspector;
element('wire-button').onclick = () => { wireframe = !wireframe; element('wire-button').textContent = wireframe ? 'Solid view' : 'Wireframe'; updateWireframe(); };
element('spin-button').onclick = () => { spinning = !spinning; element('spin-button').textContent = spinning ? 'Stop rotation' : 'Rotate'; };
element<HTMLSelectElement>('clip-select').onchange = (event) => {
  if (!inspectorActor) return;
  const name = (event.target as HTMLSelectElement).value;
  try {
    inspectorActor.select(name || null);
    element<HTMLButtonElement>('clip-play').disabled = !name;
    element('clip-play').textContent = name ? 'Pause motion' : 'Play motion';
    const clip = inspectorActor.clip;
    element('model-source').textContent = clip
      ? clip.source + ' · ' + clip.duration.toFixed(3) + ' seconds · ' + clip.tracks + ' source tracks · ' + clip.keyframes + ' keys. Repetition is an inspector control.'
      : selectedPerson?.source ?? '';
  } catch (error) { notify(String(error)); }
};
element('clip-play').onclick = () => {
  if (!inspectorActor?.clip) return;
  inspectorActor.playing = !inspectorActor.playing;
  element('clip-play').textContent = inspectorActor.playing ? 'Pause motion' : 'Play motion';
};
document.addEventListener('keydown', (event) => {
  if (event.code === 'Escape') closePanel();
  if (!event.defaultPrevented && inspectMode && event.code === 'Tab' && !(event.target instanceof HTMLSelectElement)) {
    event.preventDefault(); void setInspection(false);
  }
});
window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  updateInspectorViewport();
});
document.addEventListener('visibilitychange', () => {
  lastFrame = performance.now();
  if (document.hidden) releaseMouse();
});

function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  if (document.hidden || innerWidth <= 0 || innerHeight <= 0) return;
  if (started && questRuntime) {
    const clock = questRuntime.advance();
    if (!clock.applied) element('world-clock').textContent = 'World clock stopped: ' + clock.reason;
  }
  if (inspectMode) {
    const viewport = updateInspectorViewport();
    renderer.setViewport(viewport.x, viewport.y, viewport.w, viewport.h);
    if (spinning && inspectorModel && !matchMedia('(prefers-reduced-motion: reduce)').matches) inspectorModel.rotation.y += dt * 0.22;
    inspectorActor?.update(dt);
    orbit.update();
    renderer.render(inspection, inspectCamera);
  } else {
    renderer.setViewport(0, 0, innerWidth, innerHeight);
    terrain.update(explorer.position, now);
    if (!nativeTerrainActive && terrain.hasGroundAt(explorer.position)) {
      nativeTerrainActive = true;
      for (const object of legacyTerrain) object.visible = false;
      explorer.setGeometry([...sceneObjects.filter((object) => object.userData.kind !== 'terrain'), ...terrain.objects]);
    }
    if (terrain.consumeGeometryChange()) {
      explorer.setGeometry([...sceneObjects.filter((object) => !nativeTerrainActive || object.userData.kind !== 'terrain'), ...terrain.objects]);
    }
    if (started && !modalOpen) explorer.update(dt);
    updateHeroPresentation(dt);
    renderer.render(world, camera);
  }
  if (now - lastHud > 180 && started) {
    lastHud = now;
    const position = explorer.position;
    element('coordinates').textContent = position.x.toFixed(1) + ' / ' + position.y.toFixed(1) + ' / ' + position.z.toFixed(1) + ' m · ' + (explorer.fly ? 'FREE FLIGHT' : explorer.groundFallback ? 'NO GROUND SUPPORT' : explorer.grounded ? 'GROUNDED' : 'FALLING');
    if (questRuntime) {
      element('world-clock').textContent = questRuntime.clockError()
        ? 'World clock stopped: ' + questRuntime.clockError()
        : formatWorldClock(questRuntime.currentWorldCalendar()) + ' · source-seeded';
    } else if (questRuntimeError) {
      element('world-clock').textContent = 'Quest session unavailable';
    }
    const streaming = terrain.status();
    if (!inspectMode) element('world-title').textContent = landscapeName ?? streaming.region ?? 'Gothic 3';
    element('terrain-status').textContent = streaming.ready
      ? `${streaming.region ?? 'Landscape'} · ${streaming.cells} / ${streaming.total} cells` +
        (streaming.downloading ? ` · loading ${streaming.downloading}` : '') +
        (!explorer.fly && nativeTerrainActive && !streaming.groundReady ? ' · waiting for ground' : '')
      : 'Local landscape preview';
    nearest = null;
    let distance = 4;
    if (!inspectMode) for (const person of manifest.people) {
      const delta = Math.hypot(person.position[0] - position.x, person.position[2] - position.z);
      if (delta < distance && Math.abs(person.position[1] - (position.y - 1.65)) < 4) { nearest = person; distance = delta; }
    }
    element('prompt').classList.toggle('hidden', !nearest || inspectMode || modalOpen);
    if (nearest) element('prompt').textContent = 'E · inspect ' + nearest.name;
    drawMap();
  }
  if (toastUntil && now > toastUntil) { element('toast').classList.add('hidden'); toastUntil = 0; }
}
requestAnimationFrame(frame);
void boot().catch((error) => {
  element('load-status').textContent = 'Could not open the recovered scene: ' + String(error);
  element('load-status').classList.add('warnings');
  const retry = element<HTMLButtonElement>('start-button');
  retry.disabled = false; retry.textContent = 'Reload scene'; retry.onclick = () => location.reload();
  console.error(error);
});
