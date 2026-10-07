import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { NativeAssets, assetUrl } from './assets';
import { ExplorerController } from './controls';
import { NativeAnimations } from './animation';
import { NativeTerrain } from './terrain';
import { NativeWorldLandmarks } from './world-landmarks';
import { landscapeDestinations } from './landscape-destinations';
import { showOriginalPlayerState } from './initial-state-view';
import { showOriginalWorldClock } from './world-clock-view';
import { loadNativeHeroPlayerMemory } from './hero-property-runtime';
import type { NativeHeroPlayerMemory } from './hero-property-runtime';
import type { AnimatedActor } from './animation';
import { ARDEA_PEOPLE, ARDEA_QUESTS, PORT_SCOPE } from './content';
import { catalog as gothicCatalog, showOriginalDialogue, showQuestCatalog } from './catalog-view';
import { showLiveDialogue } from './live-dialogue';
import { liveScenePersonPosition } from './scene-person-position';
import { loadNativeRoutineScenePlacements } from './scene-routine-position';
import { HeroAttackSequence } from './hero-attack-sequence';
import type { HeroAttackStyle } from './hero-attack-sequence';
import { detectHeroFistContactCandidate } from './combat-contact';
import type { HeroFistContactCandidate } from './combat-contact';
import { calculateBrowserArdeaFistHit, HERO_SOURCE_ID } from './browser-melee';
import { BrowserPickpocketActions } from './browser-pickpocket';
import { loadNativeFistCarrier } from './native-fist-carrier';
import type { NativeFistCarrier } from './native-fist-carrier';
import { BrowserArdeaNpcCombatRuntime } from './npc-combat-runtime';
import { BrowserNpcDeathRuntime } from './browser-npc-death';
import type { BrowserNpcEntityRuntime, BrowserNpcEntityPreparation } from './browser-npc-entity';
import type { BrowserNpcEntityServiceOwner } from './browser-npc-entity-services';
import type { BrowserNpcNavigationOwner } from './browser-npc-navigation-owner';
import type { BrowserNavigationAreaSourceRuntime } from './browser-navigation-area-source-runtime';
import { NativeQuestRuntime, nativeQuestStatusName } from './quest-runtime';
import { browserHeroPositionToNativeCm, GOTHIC3_HERO_EYE_HEIGHT_METRES } from './native-world-coordinates';
import { QuestStatus } from './quest-state';
import type { ArdeaScene, ScenePerson } from './types';
import './style.css';

// This is an independent port milestone. It does not import Tervain simulation,
// menus, lore, saves, proprietary native libraries, or the reconstructed engine.
const SAVE_KEY = 'gothic3:ardea:game:v2';
const LEGACY_SAVE_KEY = 'gothic3:ardea:exploration:v1';
// This browser route has no original difficulty-selection screen yet; Normal
// is an explicit browser-session choice until that menu is reconstructed.
const BROWSER_DIFFICULTY = 1 as const;
const HERO_AREA_POLL_INTERVAL_MS = 250;
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const ui = document.querySelector<HTMLDivElement>('#interface')!;
ui.innerHTML = '<header class="masthead"><div class="eyebrow">Gothic 3 · browser port</div><h1 id="world-title">Ardea</h1><p id="world-caption">Recovered scene · native landscape</p></header>' +
  '<nav class="toolbar"><button id="explore-button">Explore</button><button id="view-button">Third person</button><button id="character-button">Character</button><button id="inventory-button">Inventory <kbd>I</kbd></button><button id="landscape-button">Landscape</button><button id="inspect-button">Models <kbd>Tab</kbd></button><button id="journal-button">Journal <kbd>J</kbd></button><button id="map-button">Map <kbd>M</kbd></button><button id="save-button">Save <kbd>P</kbd></button><button id="help-button">Help</button><a href="../">Tervain ↗</a></nav>' +
  '<div class="crosshair" id="crosshair"></div><div class="prompt hidden" id="prompt"></div><div class="toast hidden" id="toast" role="status"></div>' +
  '<footer class="bottom"><div class="keys" id="keys"><kbd>W A S D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; click / <kbd>C</kbd> attack &nbsp; right-click / <kbd>V</kbd> power attack<br><kbd>E</kbd> talk &nbsp; drag mouse for look &nbsp; <kbd>F</kbd> fly &nbsp; <kbd>R</kbd> return to arrival</div><div class="coordinate"><span id="coordinates">Loading native scene</span><div id="hero-vitals"></div><div id="world-clock"></div><div id="terrain-status"></div><div class="scope-tag">Ardea and coastal bandits · saved quest progression · NPC AI incomplete</div></div></footer>' +
  '<section class="inspector panel hidden" id="inspector"><div class="eyebrow">Original geometry</div><h2>Character inspection</h2><select id="model-select" aria-label="Character model"></select><div class="row"><button id="wire-button">Wireframe</button><button id="spin-button">Rotate</button><button id="frame-button">Frame</button></div><div id="animation-controls" class="hidden"><label for="clip-select">Native motion</label><select id="clip-select" aria-label="Native motion"><option value="">Bind pose</option></select><button id="clip-play" disabled>Play motion</button></div><p>Drag to rotate · wheel to zoom · right-drag to pan.</p><p id="model-info">Native body and head; exported bind pose.</p><div class="source" id="model-source"></div><details class="source" id="entity-study"><summary>Original entity study · developer details</summary><p id="entity-study-status">Select a coastal bandit to inspect its retained original construction and read stage.</p></details></section>' +
  '<section class="modal panel hidden" id="modal" aria-label="Information"><button class="close" id="modal-close" aria-label="Close panel">×</button><div id="modal-content"></div></section>' +
  '<div class="map hidden" id="map"><span class="map-label">ARDEA · LOCAL POSITIONS</span><canvas id="map-view" width="488" height="488" aria-label="Local positions map"></canvas></div>' +
  '<div class="loading" id="loading"><section class="intro"><div class="eyebrow">Gothic 3 · TypeScript reconstruction</div><h1>Ardea</h1><h2>The shore of Myrtana</h2><p>Walk through the recovered scene. Inspect original character models, Hero motion and the landscapes of Myrtana, Nordmar and Varant.</p><div class="rule"></div><p>Terrain loads as you move. A source-backed fresh quest state starts Xardas’s first quest. Selected Ardea dialogue, quest transitions and XP, skill and PoliticalFame rewards run from original records. The starting Raiders and Jack’s three coastal bandits retain their browser HP through saves. Source-directed lethal bandit hits schedule a recovered death-state prefix, advance Jack’s quest and award 50 defeat XP each. The prefix stops at the remaining enclave callback. NPC AI, incoming attacks, full death handling, ragdoll and loot remain incomplete, as do most campaign progression paths.</p><div class="progress"><span id="progress"></span></div><div class="load-status" id="load-status">Reading scene manifest…</div><button class="primary" id="start-button" disabled>Enter Ardea</button><small>Independent from Tervain’s original game.<br>Keyboard and mouse · WebGL · local browser saves</small></section></div>';

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
const worldLandmarks = new NativeWorldLandmarks(renderer);
world.add(worldLandmarks.group);
const sceneObjects: THREE.Object3D[] = [];
const legacyTerrain: THREE.Object3D[] = [];
let nativeTerrainActive = false;
let landscapeName: string | null = 'Ardea';
const peopleObjects = new Map<string, THREE.Group>();
const personActors = new Map<string, AnimatedActor>();
function livePersonPosition(person: ScenePerson): readonly [number, number, number] {
  return liveScenePersonPosition(person, peopleObjects);
}
function canInteractWithPerson(person: ScenePerson): boolean {
  const object = peopleObjects.get(person.id);
  if (!object?.visible) return false;
  const actor = npcCombatRuntime?.get(person.id);
  return !actor || actor.hitPoints > 0;
}
const failures: string[] = [];
let manifest: ArdeaScene;
let routinePlacements = new Map<string, { position: readonly number[]; rotationY: number }>();
let started = false;
let inspectMode = false;
let selectedPerson: ScenePerson | null = null;
let nearest: ScenePerson | null = null;
let modalOpen = false;
let activeConversationOwner: ScenePerson | null = null;
let panelLifetime = new AbortController();
let spinning = false;
let wireframe = false;
let toastUntil = 0;
let inspectRequest = 0;
let inspectorModel: THREE.Group | null = null;
let inspectorActor: AnimatedActor | null = null;
let heroActor: AnimatedActor | null = null;
let heroAttackSequence: HeroAttackSequence | null = null;
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
let nativeFistCarrier: Promise<NativeFistCarrier> | null = null;
let questRuntime: NativeQuestRuntime | null = null;
let npcCombatRuntime: BrowserArdeaNpcCombatRuntime | null = null;
let npcDeathRuntime: BrowserNpcDeathRuntime | null = null;
// Retained original-construction study for this page lifetime. These owners
// have not completed NPC/Routine attachment or native world activation.
let npcEntityServices: BrowserNpcEntityServiceOwner | null = null;
let npcEntityRuntime: BrowserNpcEntityRuntime | null = null;
let npcEntityPreparations: readonly BrowserNpcEntityPreparation[] = [];
let npcEntityLoading: Promise<void> | null = null;
let npcNavigationOwner: BrowserNpcNavigationOwner | null = null;
let npcNavigationAreas: BrowserNavigationAreaSourceRuntime | null = null;
let npcNavigationReady = false;
let lastHeroAreaPoll = 0;
let heroAreaBaselineReady = false;
let currentHeroAreaId: string | null = null;
let npcEntityStudyError: string | null = null;
let npcEntityStudyDisposed = false;
const pickpocketActions = new BrowserPickpocketActions();
let questRuntimeError: string | null = null;
let enteringWorld = false;

function updateNpcEntityStudy(person: ScenePerson | null): void {
  const target = element('entity-study-status');
  target.style.whiteSpace = 'pre-line';
  if (npcEntityStudyError) {
    target.textContent = 'The entity study is unavailable: ' + npcEntityStudyError;
    return;
  }
  const row = person ? npcEntityPreparations.find(value => value.source.guid === person.id.toLowerCase()) : null;
  if (!row) {
    target.textContent = npcEntityLoading && !npcEntityRuntime
      ? 'Reading verified original coastal bandit records…'
      : !started ? 'Start the world session to run the selected NPC construction study.'
      : "This construction study covers Jack’s three coastal bandits. Select one of their models.";
    return;
  }
  const entity = row.allocation?.data.entity;
  const navigation = row.navigation;
  const registered = entity !== undefined && npcEntityRuntime?.getOwner(row.source.guid) === entity;
  const navigationRegistered = navigation !== null &&
    npcEntityRuntime?.navigationRegistry.navigationPS.includes(navigation.state) === true;
  const startupDetails: string[] = [];
  const startup = npcEntityServices?.scriptAdminStartup;
  if (startup?.known) {
    const attach = startup.value.prerequisites.attachProgress;
    const next = attach.nextBoundary;
    startupDetails.push('Game startup: ' + attach.phase +
      (next ? ' · next ' + next.name + ' at ' + next.address : ''));
    const result = startup.value.prerequisites.attachResult;
    if (!result.known) startupDetails.push('Startup interruption: ' + result.reason);
    if (attach.ioProgress) {
      const io = attach.ioProgress;
      startupDetails.push('Startup-info import: ' + (io.getStartupInfoReturned ? 'returned'
        : io.getStartupInfoCalled ? 'interrupted' : 'not called'));
      startupDetails.push('First I/O allocation: ' + (io.callocReturned ? 'returned'
        : io.callocCalled ? 'interrupted' : 'not called'));
      startupDetails.push('I/O globals published: ' + (io.ioGlobalsPublished ? 'yes' : 'no'));
      startupDetails.push('I/O records initialized: ' + io.initializedRecordCount);
      startupDetails.push('Standard handles returned: ' + io.getStdHandleReturnedCount);
      startupDetails.push('Standard handle types returned: ' + io.getFileTypeReturnedCount);
      startupDetails.push('Standard I/O sections initialized: ' + io.initializedStandardRecordCount);
      startupDetails.push('Handle-count import returned: ' + (io.setHandleCountReturned ? 'yes' : 'no'));
      startupDetails.push('I/O source operations completed: ' + io.effects.length);
      startupDetails.push('I/O initialization returned: ' + (io.ioInitReturned ? 'yes' : 'no'));
      if (attach.ioResult !== null) startupDetails.push('I/O return value: ' + attach.ioResult);
    }
  } else if (startup) startupDetails.push('Game startup unavailable: ' + startup.reason);
  target.textContent = [
    'TypeScript study of the recovered original constructor and read sequence.',
    'Constructor: ' + (row.construction.supported ? 'complete' : 'stopped'),
    'Read stage: ' + (entity?.sourceReadStage ?? 'not started') +
      ' · ' + row.consumedBytes + ' / ' + row.source.byteLength + ' original bytes',
    'Registered owner: ' + (registered ? entity!.propertyId20 : 'none for this source ID'),
    'Attached property sets: ' + (entity?.propertySets.length ?? 0) + ' / ' + row.source.propertySets.length,
    'Navigation owner assigned: ' + (entity && navigation?.owner === entity ? 'yes' : 'no') +
      ' · NavigationAdmin membership: ' + (navigationRegistered ? 'yes' : 'no'),
    'Graph context: ' + (entity?.context?.identity ?? 'none; graph attachment has not run'),
    'Original NPC activation: incomplete.',
    'Current boundary: ' + row.boundary,
    ...startupDetails,
    'The visible model and browser combat/death state use separate presentation and gameplay objects.',
  ].join('\n');
}

/** Prepare each original record once. A study failure does not prevent the
 * existing exploration, quest, browser combat or save session from starting. */
function loadNpcEntityStudy(): Promise<void> {
  if (!npcEntityLoading) {
    npcEntityLoading = (async () => {
      try {
        const [entityModule, serviceModule, navigationModule, staticAreaModule] = await Promise.all([
          import('./browser-npc-entity'),
          import('./browser-npc-entity-services'),
          import('./browser-npc-navigation-owner'),
          import('./browser-navigation-area-source-runtime'),
        ]);
        if (npcEntityStudyDisposed) return;
        npcEntityServices = serviceModule.createBrowserNpcEntityServices({ crypto, now: () => performance.now() });
        const sessionMode = npcEntityServices.startBrowserSessionMode();
        if (!sessionMode.known) throw new Error(sessionMode.reason);
        const navigationOwner = await navigationModule.loadBrowserNpcNavigationOwner(npcEntityServices.application);
        if (npcEntityStudyDisposed) { navigationOwner.dispose(); return; }
        npcNavigationOwner = navigationOwner;
        const navigationAreas = new staticAreaModule.BrowserNavigationAreaSourceRuntime(navigationOwner);
        npcNavigationAreas = navigationAreas;
        npcEntityServices.navigationNames.connectProxyEntityServices(navigationAreas);
        const binding = navigationOwner.bindStoredQueryProperties();
        if (binding.status !== 'query-bindings-complete') {
          throw new Error('Static Navigation map binding stopped: ' + (binding.reason ?? binding.status));
        }
        npcNavigationReady = true;
        const source = await entityModule.loadBrowserNpcEntitySources();
        if (npcEntityStudyDisposed) return;
        npcEntityRuntime = new entityModule.BrowserNpcEntityRuntime({ ...npcEntityServices.services,
          applicationMode270EqualsOne: navigationOwner.applicationMode270EqualsOne,
          findZoneAt: navigationOwner.findZoneAt,
        });
        npcEntityPreparations = Object.freeze(source.entities.map(record => npcEntityRuntime!.prepare(record)));
      } catch (error) {
        if (!npcNavigationReady) {
          npcNavigationAreas?.dispose();
          npcNavigationOwner?.dispose();
          npcEntityServices?.dispose();
          npcNavigationAreas = null;
          npcNavigationOwner = null;
          npcEntityServices = null;
        }
        npcEntityStudyError = error instanceof Error ? error.message : String(error);
      } finally { if (!npcEntityStudyDisposed) updateNpcEntityStudy(selectedPerson); }
    })();
  }
  return npcEntityLoading;
}

// Explicit module teardown invokes the selected platform shutdown owner. Page
// unload delivery and the original Windows CRT shutdown are not asserted.
import.meta.hot?.dispose(() => {
  npcEntityStudyDisposed = true;
  npcNavigationAreas?.dispose();
  npcNavigationOwner?.dispose();
  npcEntityServices?.dispose();
});

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
  if (action === 'inventory') showInventory();
  if (action === 'save') save();
  if (action === 'reset') { landscapeName = 'Ardea'; explorer.reset(); notify('Returned to the original scene arrival point.'); }
  if (action === 'map') toggleMap();
  if (action === 'fly') notify(explorer.fly ? 'Free flight · Space up · Q down' : 'Grounded exploration');
  if (action === 'attack') beginHeroAttack('attack');
  if (action === 'powerAttack') beginHeroAttack('powerAttack');
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

function beginHeroAttack(style: HeroAttackStyle): void {
  if (!started || inspectMode || modalOpen || !heroActor || !heroAttackSequence) return;
  if (!heroAttackSequence.begin(style)) return;
  const clipName = heroAttackSequence.currentClipName;
  if (!clipName) return;
  heroActor.select(clipName);
  playerClipName = clipName;
}

function detectCurrentHeroFistContact(): HeroFistContactCandidate | null {
  if (!heroActor) return null;
  const hand = heroActor.object.getObjectByName('Hero_Right_Hand_Hand_1') ?? null;
  const targets = manifest.people.flatMap((person) => {
    const object = peopleObjects.get(person.id);
    return object ? [{ id: person.id, name: person.name, object, active: true }] : [];
  });
  return detectHeroFistContactCandidate(hand, targets);
}

function releaseMouse(): void {
  if (document.pointerLockElement === canvas) document.exitPointerLock();
}

function endActiveConversation(): void {
  const owner = activeConversationOwner;
  activeConversationOwner = null;
  if (owner && questRuntime) questRuntime.endInfoManager(owner);
}

function openPanel(title: string): HTMLElement {
  endActiveConversation();
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
  endActiveConversation();
  panelLifetime.abort();
  modalOpen = false;
  element('modal').classList.add('hidden');
  explorer.active = started && !inspectMode;
}

function inspectNearby(): void {
  if (!nearest || inspectMode || !canInteractWithPerson(nearest)) return;
  const person = nearest;
  const content = openPanel(person.name);
  activeConversationOwner = person;
  const facts = ARDEA_PEOPLE.find((entry) => entry.id.toLowerCase() === person.id.toLowerCase() || entry.name.toLowerCase() === person.name.toLowerCase());
  paragraph(content, facts?.role ?? 'Person placed in the original Ardea scene.');
  paragraph(content, facts?.summary ?? 'This character’s model and position are read from the local game’s compiled world data.');
  paragraph(content, 'Dialogue runs only when its source predicates, commands and completion callback have a connected browser service. Unsupported source records remain locked with their unresolved requirement shown. Original voice, camera direction and NPC routines are not yet connected.');
  if (facts?.questIds.length) {
    const h3 = document.createElement('h3');
    h3.textContent = 'Original quest references';
    content.append(h3);
    for (const id of facts.questIds) {
      const quest = ARDEA_QUESTS.find((entry) => entry.id === id);
      paragraph(content, quest ? quest.title + ' — ' + quest.summary : id);
    }
  }
  const dialogState = questRuntime?.actorDialogs.dialog({ id: person.id, name: person.name });
  if (dialogState?.known && dialogState.value.hasDialog) {
    const pickpocket = document.createElement('button');
    pickpocket.type = 'button';
    pickpocket.textContent = 'Pickpocket ' + person.name;
    pickpocket.disabled = dialogState.value.pickedPocket;
    pickpocket.title = dialogState.value.pickedPocket ? 'This NPC is already marked PickedPocket in the browser save.' :
      'Try the source-defined Gothic 3 PickPocket action.';
    content.append(pickpocket);
    const pickpocketStatus = document.createElement('p');
    pickpocketStatus.className = 'record-meta';
    content.append(pickpocketStatus);
    pickpocket.onclick = () => {
      if (pickpocket.disabled || panelLifetime.signal.aborted) return;
      pickpocket.disabled = true;
      pickpocketStatus.textContent = 'Resolving source NPC inventory and PickPocket state…';
      void attemptNativePickpocket(person).then((message) => {
        if (!panelLifetime.signal.aborted) pickpocketStatus.textContent = message;
      }).catch((error: unknown) => {
        if (!panelLifetime.signal.aborted) pickpocketStatus.textContent = 'PickPocket stopped: ' +
          (error instanceof Error ? error.message : String(error));
      });
    };
  }
  const button = document.createElement('button');
  button.textContent = 'Inspect 3D model';
  button.onclick = () => { closePanel(); void setInspection(true, person.id); };
  content.append(button);
  paragraph(content, person.source + (person.body ? ' · ' + person.body : '') + (person.head ? ' · ' + person.head : ''), 'source');
  const sourceRecords = document.createElement('details');
  const sourceSummary = document.createElement('summary');
  sourceSummary.textContent = 'Inspect all original dialogue records';
  sourceRecords.append(sourceSummary);
  content.append(sourceRecords);
  void showOriginalDialogue(sourceRecords, person.name);
  const dialogue = document.createElement('section');
  dialogue.className = 'gothic-live-dialogue';
  content.append(dialogue);
  if (questRuntime) {
    const activeRuntime = questRuntime;
    const activeNpcCombatRuntime = npcCombatRuntime;
    void showLiveDialogue(dialogue, person, manifest.people, {
      person: livePersonPosition,
      player: () => [explorer.position.x, explorer.position.y, explorer.position.z],
    }, activeRuntime, gothicCatalog,
      manifest.spawnSource, manifest.origin, panelLifetime.signal, async () => {
        if (!activeNpcCombatRuntime) return null;
        const playerLevel = activeRuntime.saveData().heroProgress?.level ?? 0;
        const actor = await activeNpcCombatRuntime.initializeOnContact(person.id, playerLevel, BROWSER_DIFFICULTY);
        return actor.inventory;
      });
  } else paragraph(dialogue, questRuntimeError
    ? 'Dialogue is unavailable because the source-backed game session failed to load: ' + questRuntimeError
    : 'Enter Ardea to initialize source-backed dialogue state.');
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
  intro.textContent = 'Fresh-world state from the original quest manager and compiled runtime records. The audited OnGameStartUp RunQuest starts Xardas_FindXardas at the source clock time. Selected Ardea quest successes apply Hero skill, PoliticalFame and XP rewards to the retained PlayerMemory; enclave and arena rewards, the Ardea tutorial popup, other startup callbacks and most native dialogue services remain unimplemented.';
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

function showInventory(): void {
  const content = openPanel('PC_Hero · Inventory');
  if (!questRuntime) {
    paragraph(content, questRuntimeError
      ? 'The source-backed inventory could not be loaded: ' + questRuntimeError
      : 'Enter Ardea to load the original Hero inventory.');
    return;
  }
  const stacks = questRuntime.heroInventoryStacks();
  paragraph(content, stacks.length + ' inventory stacks · source-seeded stacks retain original AssureItemsEx order; new loot is appended.');
  paragraph(content, stacks.filter((stack) => stack.learned).length + ' stack records have the original Learned flag set.');
  paragraph(content, 'Health potions apply their hash-checked source HP modifier and save their remaining count. Successful PickPocket actions add source-resolved loot to this saved inventory. Other transfers and loot, use animations and equipment changes are still being rebuilt.');
  const vitals = questRuntime.heroVitals();
  paragraph(content, 'Hero HP ' + vitals.hitPoints + ' / ' + vitals.hitPointsMax + ' · health potion restores 50% of maximum HP.');
  const list = document.createElement('ol');
  list.className = 'inventory-list';
  for (const stack of stacks) {
    const row = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = stack.templateName;
    const amount = document.createElement('span');
    amount.className = 'inventory-count';
    amount.textContent = '× ' + stack.amount + (stack.learned ? ' · learned' : '');
    row.append(name, amount);
    if (stack.templateName === 'It_Potion_Health') {
      const use = document.createElement('button');
      use.type = 'button';
      use.textContent = 'Drink';
      use.disabled = stack.amount < 1 || vitals.hitPoints >= vitals.hitPointsMax;
      use.title = use.disabled && vitals.hitPoints >= vitals.hitPointsMax
        ? 'Health is already full.' : 'Restore 50% of maximum HP.';
      use.onclick = () => {
        use.disabled = true;
        void questRuntime!.useHealthPotion().then((result) => {
          if (!result.known) {
            notify('Health potion unavailable: ' + result.reason);
            showInventory();
            return;
          }
          notify('Health potion used · HP ' + result.value.hitPointsBefore + ' → ' + result.value.hitPointsAfter +
            ' · ' + result.value.amountRemaining + ' remaining. Press P to save.');
          showInventory();
        });
      };
      row.append(use);
    }
    list.append(row);
  }
  content.append(list);
}

function formatQuestClock(clock: { years: number; days: number; hours: number }): string {
  return 'Year ' + clock.years + ' · Day ' + clock.days + ' · ' + String(clock.hours).padStart(2, '0') + ':00';
}

function formatWorldClock(clock: { year: number; day: number; hour: number; minute: number; second: number }): string {
  const time = [clock.hour, clock.minute, clock.second].map((value) => String(value).padStart(2, '0')).join(':');
  return 'Year ' + clock.year + ' · Day ' + clock.day + ' · ' + time;
}

function loadHeroMemoryRuntime(): Promise<NativeHeroPlayerMemory> {
  if (!nativeHeroMemory) {
    nativeHeroMemory = loadNativeHeroPlayerMemory().catch((error: unknown) => {
      nativeHeroMemory = null;
      throw error;
    });
  }
  return nativeHeroMemory;
}

function loadHeroFistCarrier(): Promise<NativeFistCarrier> {
  if (!nativeFistCarrier) {
    nativeFistCarrier = loadNativeFistCarrier(HERO_SOURCE_ID).catch((error: unknown) => {
      nativeFistCarrier = null;
      throw error;
    });
  }
  return nativeFistCarrier;
}

function showCharacterSheet(): void {
  const content = openPanel('PC_Hero · Character');
  const lifetime = panelLifetime.signal;
  paragraph(content, 'Reading the original Hero PlayerMemory and Attribute property sets…');
  void loadHeroMemoryRuntime().then(result => {
    if (lifetime.aborted) return;
    content.replaceChildren();
    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Original Hero data · verified serialized PC_Hero';
    const heading = document.createElement('h2');
    heading.textContent = 'Nameless Hero';
    content.append(eyebrow, heading);
    const level = result.npc.values.Level;
    paragraph(content, (typeof level === 'number' ? 'Level ' + level : 'Level unknown') +
      ' · Chapter ' + result.memory.getChapter() + ' · XP ' + result.memory.getXP() +
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
    paragraph(content, 'The browser retains the source PlayerMemory, all 15 Attribute/Stat objects and the hash-checked serialized Hero NPC property set. The packet’s legacy Level record is preserved as opaque obsolete-property bytes; its current scalar is shown above and updates with supported GiveXP level-ups. Source quest success can also change captured skill bases and PoliticalFame, which browser saves retain. That NPC property set is not attached to a live world entity, and the level-up visual effect is absent. One audited startup quest transition is connected to the journal, while other startup callbacks, most progression and combat remain unconnected. Unknown native enum bits remain masked.');
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
  paragraph(content, 'WASD / arrows: move. Shift: run. Drag to look, or click the scene for captured mouse look. Escape releases the pointer. E inspects a nearby person. I opens the source-seeded Hero inventory.');
  paragraph(content, 'F toggles free flight; Space moves up and Q moves down. Third person follows the Hero model and recovered idle, walk and run clips. R returns to the arrival point. P saves this browser session locally. Tab switches to character models; drag to rotate, wheel to zoom, right-drag to pan. M opens the local position map.');
  paragraph(content, 'Character loads PC_Hero’s serialized PlayerMemory, Attribute/Stat data and NPC Level into the browser’s TypeScript runtime. Supported Ardea dialogue can change source-backed game events, Given and Dialog flags, and bounded quest success can apply PoliticalFame, skill-base and XP rewards. The quest journal runs one source-audited startup transition; most startup operations and campaign progression remain unimplemented.');
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
        worldLandmarks.update(point, performance.now(), true);
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
      nativeSession: questRuntime?.saveData() ?? null,
      nativeNpcCombatSession: npcCombatRuntime?.saveData() ?? null }));
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

function savedNativeNpcCombatSession(): unknown {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { version?: number; nativeNpcCombatSession?: unknown };
    return value.version === 2 ? value.nativeNpcCombatSession ?? null : null;
  } catch { return null; }
}

function hideDefeatedNpcVisuals(): void {
  for (const actor of npcCombatRuntime?.saveData().actors ?? []) {
    if (actor.hitPoints <= 0) {
      const object = peopleObjects.get(actor.personId);
      if (object) object.visible = false;
    }
  }
}

function initializeContactNpc(contact: HeroFistContactCandidate, style: HeroAttackStyle): void {
  if (!npcCombatRuntime || !questRuntime) {
    notify('Fist contact: ' + contact.name + '. The source NPC runtime is unavailable; no damage was applied.');
    return;
  }
  const playerLevel = questRuntime.saveData().heroProgress?.level ?? 0;
  void Promise.all([npcCombatRuntime.initializeOnContact(contact.id, playerLevel, BROWSER_DIFFICULTY),
    loadHeroMemoryRuntime(), loadHeroFistCarrier()]).then(([actor, player, fist]) => {
    const maximum = actor.processingRange.hitPointsMax;
    if (!questRuntime) {
      notify('Source actor resolved: ' + actor.name + '. The browser quest session is unavailable; no damage was applied.');
      return;
    }
    const hit = calculateBrowserArdeaFistHit({ actor, player, runtime: questRuntime, fist, style,
      difficulty: BROWSER_DIFFICULTY });
    if (hit.status !== 'resolved') {
      notify('Source actor resolved: ' + actor.name + ' · ' + actor.hitPoints + ' / ' + maximum +
        ' HP. No damage applied: ' + hit.reason);
      return;
    }
    if (actor.hitPoints !== hit.hitPointsBefore) {
      notify('The NPC state changed during the hit calculation; no damage was applied.');
      return;
    }
    const nativeKill = hit.zeroHitPointsDisposition.status === 'known' && hit.zeroHitPointsDisposition.value === 'kill';
    if (hit.hitPointsAfter === 0 && nativeKill) {
      const capability = npcDeathRuntime?.canScheduleFatalHit(actor);
      if (!capability || capability.status !== 'known') {
        notify('The fatal hit needs an unavailable death task: ' + (capability?.status === 'unknown' ? capability.reason : 'NPC death host unavailable.'));
        return;
      }
    }
    if (nativeKill && npcDeathRuntime) {
      const applied = npcDeathRuntime.applyHit(actor, hit);
      if (applied.status !== 'known') { notify('Fist hit stopped: ' + applied.reason); return; }
    } else actor.hitPoints = hit.hitPointsAfter;
    let killObjectiveNotice = '';
    if (actor.hitPoints === 0) {
      const object = peopleObjects.get(actor.personId);
      if (object) object.visible = false;
      if (nativeKill) {
        killObjectiveNotice = ' ZS_RagDollDead is scheduled; its next application frame runs the native quest/XP task path.';
      } else {
        killObjectiveNotice = ' Native death versus knockout is unresolved; no kill objective was credited.';
      }
    }
    const hpText = actor.hitPoints === 0
      ? 'NPC at 0 HP. Browser saves retain its combat and lifecycle state; native death animation and loot remain unavailable.'
      : actor.hitPoints + ' / ' + maximum + ' HP remain.';
    notify('Browser fist hit · ' + actor.name + ' · ' + hit.calculation.finalDamage + ' damage · ' + hpText +
      ' Damage uses the source-derived formula; NPC AI and attack responses are not running.' + killObjectiveNotice +
      ' Press P to save this browser state.');
  }).catch((error: unknown) => {
    notify('Fist contact: ' + contact.name + '. Source combat state failed: ' + String(error));
  });
}

async function attemptNativePickpocket(person: ScenePerson): Promise<string> {
  const runtime = questRuntime;
  const npcs = npcCombatRuntime;
  if (!runtime || !npcs) return 'PickPocket is unavailable because the source-backed game session failed to load.';
  return pickpocketActions.attempt(person, runtime, npcs, BROWSER_DIFFICULTY);
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
  const feetY = eye.y - GOTHIC3_HERO_EYE_HEIGHT_METRES;
  heroActor.object.position.set(eye.x, feetY, eye.z);
  heroActor.object.rotation.y = explorer.heading;
  heroActor.object.visible = thirdPerson;

  const moved = hasLastHeroPosition ? Math.hypot(eye.x - lastHeroX, eye.z - lastHeroZ) : 0;
  lastHeroX = eye.x;
  lastHeroZ = eye.z;
  hasLastHeroPosition = true;
  const speed = moved > 0 && moved < 1 ? moved / Math.max(dt, 1 / 240) : 0;
  const attackWasActive = heroAttackSequence?.active ?? false;
  if (attackWasActive) {
    heroActor.update(dt);
    for (const event of heroAttackSequence!.advance(dt)) {
      if (event.type === 'phase') {
        heroActor.select(event.clipName);
        playerClipName = event.clipName;
      } else if (event.type === 'hit-window') {
        heroActor.object.updateMatrixWorld(true);
        const contact = detectCurrentHeroFistContact();
        if (contact) initializeContactNpc(contact, event.style);
        else notify('The fist attack missed.');
      }
    }
  }
  if (!heroAttackSequence?.active) {
    const role = explorer.fly || speed < 0.15 ? 'idle' : speed < 5.9 ? 'walk' : 'run';
    const motion = heroActor.asset.clips.find((clip) => clip.role === role);
    if (motion && motion.name !== playerClipName) {
      heroActor.select(motion.name);
      playerClipName = motion.name;
    }
    if (!attackWasActive) heroActor.update(dt);
  }

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
    const personAsset = animations.manifest?.assets.find((entry) =>
      entry.personId?.toLowerCase() === person.id.toLowerCase());
    const actor = personAsset
      ? await animations.actor(personAsset.id)
      : person.id === 'nameless-hero-exhibit' ? await animations.actor('hero') : null;
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
    updateNpcEntityStudy(person);
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
    const motionSource = actor?.asset.motionSourceAsset;
    const animationDescription = actor
      ? motionSource
        ? `Original skin weights with audited ${motionSource.id} motions mapped by shared bones. NPC scheduling, combat and attachments are still being rebuilt.`
        : 'Original skin weights and native motion sampling. Clip blending, combat and attachments are still being rebuilt.'
      : 'Original body + head in exported bind pose; native skinning and clips are not included for this model.';
    element('model-info').textContent = person.name + ' · ' + Math.round(triangles).toLocaleString() + ' triangles · ' + meshes + ' material meshes. ' + animationDescription;
    element('model-source').textContent = person.source + ' · ' + (person.body ?? '') + ' · ' + (person.head ?? '');
    element('world-caption').textContent = actor
      ? motionSource ? 'Original character geometry · mapped native motion' : 'Original character geometry · native Hero motion'
      : 'Original character geometry · exported bind pose';
    const selector = element<HTMLSelectElement>('clip-select');
    selector.replaceChildren(new Option('Bind pose', ''));
    for (const clip of actor?.asset.clips ?? []) {
      const option = new Option(clip.role + (clip.phase ? ' · ' + clip.phase : '') + ' — ' + clip.name, clip.name);
      option.title = clip.source;
      selector.add(option);
    }
    element('animation-controls').classList.toggle('hidden', !actor);
    const idle = actor?.asset.clips.find((clip) => clip.role === 'idle');
    if (actor && idle) {
      actor.select(idle.name);
      selector.value = idle.name;
    }
    element<HTMLButtonElement>('clip-play').disabled = !actor || !idle;
    element('clip-play').textContent = idle ? 'Pause motion' : 'Play motion';
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
  element('keys').textContent = enabled ? 'Drag to rotate · wheel to zoom · right-drag to pan · Tab returns to Ardea' : 'WASD move · Shift run · click / C attack · right-click / V power attack · drag for mouse look · E talk · F fly · R reset';
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
    const position = livePersonPosition(person);
    const point = mapPoint(position[0], position[2]);
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
  try {
    element('load-status').textContent = 'Resolving source Ardea routines…';
    const resolved = await loadNativeRoutineScenePlacements(manifest);
    routinePlacements = new Map([...resolved.placements].map(([id, placement]) => [id, placement]));
  } catch (error) {
    failures.push('Source NPC routines: ' + String(error));
  }
  await Promise.all([
    animations.loadManifest().catch((error: unknown) => { failures.push('Native animation: ' + String(error)); }),
    terrain.initialize().catch((error: unknown) => { failures.push('Native terrain: ' + String(error)); }),
    worldLandmarks.initialize().catch((error: unknown) => { failures.push('Native world landmarks: ' + String(error)); }),
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
        const personAsset = animations.manifest?.assets.find((entry) =>
          entry.personId?.toLowerCase() === person.id.toLowerCase());
        const actor = personAsset ? await animations.actor(personAsset.id) : null;
        const group = actor?.object ?? await character(person);
        const routine = routinePlacements.get(person.id);
        group.position.fromArray(routine?.position ?? person.position);
        group.rotation.y = routine?.rotationY ?? person.rotationY ?? 0;
        world.add(group);
        peopleObjects.set(person.id, group);
        if (actor) {
          const idle = actor.asset.clips.find((clip) => clip.role === 'idle');
          if (idle) actor.select(idle.name);
          personActors.set(person.id, actor);
        }
      } catch (error) { failures.push(person.name + ': ' + String(error)); }
      done++; progress('Placing original characters');
    }),
    async () => {
      try {
        heroActor = await animations.actor('hero');
        if (!heroActor) throw new Error('Recovered Hero animation asset is not in the manifest');
        heroAttackSequence = new HeroAttackSequence(heroActor.asset.clips);
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
  if (!manifest.spawnIsEye) spawn[1] += GOTHIC3_HERO_EYE_HEIGHT_METRES;
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
  element('load-status').textContent = sceneObjects.length + ' scene objects · ' + peopleObjects.size + ' characters ready' +
    (routinePlacements.size ? ' · ' + routinePlacements.size + ' source routine positions' : '') +
    (failures.length ? ' · ' + failures.length + ' load warnings' : '');
  element<HTMLButtonElement>('start-button').disabled = false;
}

async function enterWorld(): Promise<void> {
  if (started || enteringWorld) return;
  enteringWorld = true;
  const button = element<HTMLButtonElement>('start-button');
  button.disabled = true;
  element('load-status').textContent = 'Loading original Hero state, quest journal and world clock…';
  let restoredSession = false;
  try {
    const player = await loadHeroMemoryRuntime();
    const savedSession = savedNativeSession();
    if (savedSession.kind === 'saved') {
      questRuntime = await NativeQuestRuntime.restore(savedSession.value, player, manifest.people);
      restoredSession = true;
    } else questRuntime = await NativeQuestRuntime.newGame(player, manifest.people);
    questRuntimeError = null;
    npcCombatRuntime = new BrowserArdeaNpcCombatRuntime(manifest.people);
    const savedNpcCombat = savedNativeNpcCombatSession();
    if (savedNpcCombat) {
      const playerLevel = questRuntime.saveData().heroProgress?.level ?? 0;
      const restored = await npcCombatRuntime.restore(savedNpcCombat, playerLevel, BROWSER_DIFFICULTY);
      if (restored.skipped.length) failures.push('NPC combat save: ' + restored.skipped.map((entry) => entry.reason).join('; '));
      hideDefeatedNpcVisuals();
    }
    npcDeathRuntime = new BrowserNpcDeathRuntime(npcCombatRuntime, questRuntime, {
      hasStaticOwner: id => peopleObjects.has(id),
      nativeVisualAnimationPresent: id => personActors.has(id),
      // These static Group owners have browser bounds for contact detection;
      // no native control, DCC, collision-shape or Physics body is attached.
      // This says nothing about presence of those classes in source records.
      nativeResetAllCapabilities: () => ({ characterControl: false,
        dynamicCollisionCircle: false, collisionShape: false, physicalObject: false }),
      applyResetAll: (id, state) => {
        const object = peopleObjects.get(id); if (!object) throw new Error('NPC presentation owner disappeared.');
        object.userData.nativeMovementState = { ...state };
      },
      defeated: id => { const object = peopleObjects.get(id); if (object) object.visible = false; },
      notify,
    });
    npcDeathRuntime.restoreScheduled();
  } catch (error) {
    questRuntime = null;
    npcCombatRuntime = null;
    npcDeathRuntime = null;
    questRuntimeError = error instanceof Error ? error.message : String(error);
  }
  started = true;
  void loadNpcEntityStudy();
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
element('inventory-button').onclick = showInventory;
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

function updateHeroAreaEntry(now: number): void {
  if (!started || !questRuntime || !npcNavigationReady || !npcNavigationAreas ||
      modalOpen || inspectMode || explorer.fly || now - lastHeroAreaPoll < HERO_AREA_POLL_INTERVAL_MS) return;
  lastHeroAreaPoll = now;

  const eye = explorer.position;
  const origin = terrain.originMetres;
  const positionCm = browserHeroPositionToNativeCm([eye.x, eye.y, eye.z], [origin.x, origin.y, origin.z]);
  const selected = npcNavigationAreas.findZoneAtPositionCm(positionCm);
  if (!selected.known) return;
  const nextAreaId = selected.value?.id ?? null;
  if (!heroAreaBaselineReady) {
    heroAreaBaselineReady = true;
    currentHeroAreaId = nextAreaId;
    return;
  }
  const entered = selected.value;
  const changedArea = entered !== null && entered.id !== currentHeroAreaId;
  currentHeroAreaId = nextAreaId;
  if (!changedArea || !entered) return;

  const result = questRuntime.enterArea('PC_Hero', entered.name);
  if (result.progress.length === 0) return;
  const completed = result.progress.filter((progress) =>
    progress.status === QuestStatus.Success || progress.status === QuestStatus.Won);
  notify(completed.length
    ? completed.map((progress) => 'Quest completed: ' + progress.questId).join(' · ')
    : result.progress.map((progress) => 'Quest updated: ' + progress.questId + ' (' + progress.counter +
      (progress.amount === null ? '' : '/' + progress.amount) + ')').join(' · '));
}

function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  if (document.hidden || innerWidth <= 0 || innerHeight <= 0) return;
  if (started && questRuntime) {
    const clock = questRuntime.advance();
    if (!clock.applied) element('world-clock').textContent = 'World clock stopped: ' + clock.reason;
  }
  if (started && !modalOpen) npcDeathRuntime?.processFrame(dt);
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
    worldLandmarks.update(explorer.position, now);
    let terrainActivated = false;
    if (!nativeTerrainActive && terrain.hasGroundAt(explorer.position)) {
      nativeTerrainActive = true;
      terrainActivated = true;
      for (const object of legacyTerrain) object.visible = false;
    }
    const terrainChanged = terrain.consumeGeometryChange();
    const landmarksChanged = worldLandmarks.consumeGeometryChange();
    if (terrainActivated || terrainChanged || landmarksChanged) {
      explorer.setGeometry([
        ...sceneObjects.filter((object) => !nativeTerrainActive || object.userData.kind !== 'terrain'),
        ...terrain.objects,
        ...worldLandmarks.objects,
      ]);
    }
    if (started && !modalOpen) explorer.update(dt);
    updateHeroAreaEntry(now);
    if (started && !modalOpen) for (const actor of personActors.values()) actor.update(dt);
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
      try {
        const vitals = questRuntime.heroVitals();
        element('hero-vitals').textContent = 'HP ' + vitals.hitPoints + ' / ' + vitals.hitPointsMax;
      } catch (error) {
        element('hero-vitals').textContent = 'HP unavailable · ' + String(error);
      }
    } else if (questRuntimeError) {
      element('world-clock').textContent = 'Quest session unavailable';
      element('hero-vitals').textContent = '';
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
      if (!canInteractWithPerson(person)) continue;
      const personPosition = livePersonPosition(person);
      const delta = Math.hypot(personPosition[0] - position.x, personPosition[2] - position.z);
      if (delta < distance && Math.abs(personPosition[1] - (position.y - GOTHIC3_HERO_EYE_HEIGHT_METRES)) < 4) { nearest = person; distance = delta; }
    }
    element('prompt').classList.toggle('hidden', !nearest || inspectMode || modalOpen);
    if (nearest) element('prompt').textContent = 'E · talk to ' + nearest.name;
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
