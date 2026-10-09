import * as THREE from 'three';
import { mulberry32 } from '../world/noise';
import { Ctx } from './buildKit';
import { MaterialSet, Region, type MatKey } from './regions';
import { sharedNoise } from './noiseTextures';
import { barkTextures, leafTexture } from './treeTextures';
import { makeTerrainTextures, type TerrainTextures } from './terrainTextures';
import { createTerrainMaterial } from './terrainMaterial';
import type { SwayUniforms } from './vegetation';
import { MENU_SEA_LEVEL, MENU_SUN_DIR, createMenuSky } from './menu/menuSky';
import { MENU_BANNER, MENU_CAMERA, MENU_FIRE, MENU_TREE, menuHeight } from './menu/menuLayout';
import { buildMenuGroundGeometry, buildPuddles, restHeight } from './menu/menuLand';
import { buildMenuMeadow, type MenuMeadow } from './menu/menuMeadow';
import { GrassTrample, type GrassMover } from './grass/trample';
import { GrassWind, type GrassWindOptions } from './grass/wind';
import { createFoliageField, type FoliageField } from './foliage/foliageWind';
import { buildMenuDeer, type MenuDeer } from './menu/menuDeer';
import { buildMenuFluff, type MenuFluff } from './menu/menuFluff';
import { createAnimalFigure } from './animals';
import type { AnimalDefinition } from './animals/catalog';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TREE_HOLLOW, buildAncientTree } from './menu/menuTree';
import { buildMenuFire } from './menu/menuFire';
import { buildMenuBanner, type CanvasSource } from './menu/menuBanner';
import { HERMIT_DOOR, buildBannerHardware, buildMenuCamp } from './menu/menuCamp';
import { buildMenuFar } from './menu/menuFar';
import { buildMenuAir } from './menu/menuAir';
import { buildRibbons } from './menu/menuRibbons';
import { buildMenuShips } from './menu/menuShips';
import { buildMenuWisps } from './menu/menuWisps';
import { buildMenuHollow } from './menu/menuHollow';
import { GROVE_DOOR_OPEN, GROVE_MAX_SPIRITS, createMenuGrove, type MenuGrove } from './menu/menuGrove';
import { MENU_SCORE_FEATURE_INFO } from './menu/menuScoreFeatures';
import type { MenuMusicPlayback } from './audio';
import type { Rig } from './characters';
import type { MeshyTreeTemplates } from './meshyTrees';
import { MENU_TREE_SOURCE, assertMenuTreeBudget, createMenuTreeRemix } from './menu/menuTreeRemix';

export type MenuQuality = 'low' | 'medium' | 'high';
export interface MenuAwakeningState { time: number; duration: number; gain: number }

const UP = new THREE.Vector3(0, 1, 0);

/** The headland's wind: in off the sea from the low sun's side, up the slope and past the lens. */
export const MENU_WIND: GrassWindOptions = { direction: [0.5, 0.87], steady: 0.2, gust: 0.55, speed: 3.4 };
/** The meadow's trample field: texels across, metres covered and where it is centred (it never moves). */
export const MENU_TRAMPLE = { size: { low: 128, medium: 256, high: 512 }, extent: 72, centre: { x: 0, z: -14 } } as const;

/** Everything the scene needs that touches the DOM or generates textures, so tests can build the scene without either. */
export interface MenuResources {
  noise(): THREE.Texture;
  materials(size: number): { get(key: MatKey): THREE.Material; dispose(): void };
  terrain(size: number): Promise<TerrainTextures | null>;
  bark(): { map: THREE.Texture; normal: THREE.Texture };
  leaf(): THREE.Texture;
  canvas: CanvasSource;
  emblemUrl: string;
}

function browserResources(): MenuResources {
  return {
    noise: () => sharedNoise().detail,
    materials: (size) => new MaterialSet(size),
    terrain: (size) => makeTerrainTextures(size, () => new Promise((r) => setTimeout(r, 0))),
    bark: () => {
      const b = barkTextures('oak');
      // Clones share the image but hold their own GPU reference, so a world rebuild disposing the cache leaves the menu intact.
      return { map: b.map.clone(), normal: b.normal.clone() };
    },
    leaf: () => leafTexture('oak').clone(),
    canvas: {
      canvas: (w, h) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
      },
      image: (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        }),
    },
    emblemUrl: `${import.meta.env.BASE_URL}assets/menu/hegemony-emblem-512.webp`,
  };
}

/**
 * The title and pause menus' own place: a Templar warden's dusk vigil on a headland above the sea, under an ancient tree
 * that holds a hermit's door in its roots. Gothic 3's title backdrop is the reference for mood and colour (dark, dirty,
 * scratched; teal sky over one amber band), studied from the local install for measurement only. The scene is original
 * and built from the playable game's own generators, so it reads as the same rugged world.
 *
 * The camera is fixed. Fire, smoke, sparks, the standard, the grass, crows, dust, clouds, mist and the far lighthouse
 * beam and distant ships run on one clock that stops entirely in reduced motion; nothing here advances game state.
 */
export class MenuScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(MENU_CAMERA.fov, 16 / 9, 0.2, 2600);
  readonly stats = { triangles: 0, meshes: 0, grassTufts: 0, grassBlades: 0, grassTriangles: 0, leafCards: 0, treeTriangles: 0, treeSource: 'original-hermitage', banners: 1, lights: 0, ships: 0, wisps: 0, deer: 0 };
  readonly quality: MenuQuality;
  private readonly res: MenuResources;
  private readonly sway: SwayUniforms = { uTime: { value: 0 }, uWind: { value: 0.8 } };
  private readonly ribbonTime = { value: 0 };
  private readonly sky: ReturnType<typeof createMenuSky>;
  private readonly fire: ReturnType<typeof buildMenuFire>;
  private readonly far: ReturnType<typeof buildMenuFar>;
  private readonly ships: ReturnType<typeof buildMenuShips>;
  private readonly wisps: ReturnType<typeof buildMenuWisps>;
  private readonly hollow: ReturnType<typeof buildMenuHollow>;
  /** The awakening's simulation: pure data, handed to the next scene on a graphics rebuild so it never re-runs. */
  readonly grove: MenuGrove;
  private readonly awakening: MenuAwakeningState;
  private grilleLight!: THREE.PointLight;
  private readonly grilleWarm = new THREE.Color(0xff9a48);
  private readonly grilleCool = new THREE.Color(0x87ffe1);
  private readonly air: ReturnType<typeof buildMenuAir>;
  private readonly camp: ReturnType<typeof buildMenuCamp>;
  private readonly banner: ReturnType<typeof buildMenuBanner>;
  private readonly meadow: MenuMeadow;
  private readonly meadowWind: GrassWind;
  /** The menu's wind and touch for the ancient tree's crown (the same wind as the heath). */
  private readonly foliage: FoliageField;
  private readonly meadowTrample: GrassTrample;
  private readonly movers: GrassMover[] = [];
  private readonly brushStamps: GrassMover[] = [];
  /** Tree-local to world, for the spirits skimming the heath. */
  private readonly treeMatrix = new THREE.Matrix4();
  /** The viewer's hand in the grass: the last pointer position on screen, and where it last touched the ground. */
  private readonly hand = { ndcX: 0, ndcY: 0, moved: false, x: Number.NaN, z: Number.NaN, vx: 0, vz: 0, reach: 0, life: 0 };
  private readonly ray = new THREE.Raycaster();
  /** A stag grazing its way across the heath, once its model has loaded, and the menu time it joined. */
  private deer: MenuDeer | null = null;
  private deerStart = 0;
  /** Seed fluff carried off the heath on the same wind. */
  private readonly fluff: MenuFluff;
  private readonly mats: ReturnType<MenuResources['materials']>;
  private readonly ground: THREE.Mesh;
  private readonly owned: { dispose(): void }[] = [];
  private terrainTex: TerrainTextures | null = null;
  private env: THREE.Texture | null = null;
  private time = 0;
  private trafficSeed = 0;
  private trafficEpoch = 0;
  private trafficOffset = 0;
  private disposed = false;
  private readonly baseFov = MENU_CAMERA.fov;
  static readonly MAX_FOV = 76;

  constructor(opts: { quality?: MenuQuality; resources?: MenuResources; trafficSeed?: number; trafficTime?: number; awakening?: MenuAwakeningState; grove?: MenuGrove; wardenRig?: Rig; treeTemplates?: MeshyTreeTemplates; deer?: { template: GLTF; definition: AnimalDefinition } } = {}) {
    this.quality = opts.quality ?? 'high';
    this.res = opts.resources ?? browserResources();
    // Deterministic standalone construction; the app supplies a fresh seed on each actual menu entry.
    this.trafficSeed = (opts.trafficSeed ?? 0) >>> 0;
    this.trafficOffset = Number.isFinite(opts.trafficTime) ? Math.max(0, opts.trafficTime!) : 0;
    this.awakening = { time: Number.isFinite(opts.awakening?.time) ? Math.max(0, opts.awakening!.time) : 0,
      duration: Number.isFinite(opts.awakening?.duration) && opts.awakening!.duration > 0 ? opts.awakening!.duration : MENU_SCORE_FEATURE_INFO.duration,
      gain: Number.isFinite(opts.awakening?.gain) ? THREE.MathUtils.clamp(opts.awakening!.gain, 0, 1) : 0 };
    const q = this.quality;
    this.scene.name = 'Tervain_Templar_Vigil';
    const fog = new THREE.FogExp2(new THREE.Color().setHex(0x2b2b28), 0.0105);
    this.scene.fog = fog;
    this.camera.position.set(MENU_CAMERA.x, MENU_CAMERA.y, MENU_CAMERA.z);
    this.camera.lookAt(MENU_CAMERA.lookX, MENU_CAMERA.lookY, MENU_CAMERA.lookZ);
    const noise = this.res.noise();

    this.sky = createMenuSky(noise, this.camera);
    this.scene.add(this.sky.mesh);
    this.owned.push(this.sky);

    // Ground: starts with a plain dark material and switches to the playable terrain material once its textures exist.
    const groundGeo = buildMenuGroundGeometry(q);
    const placeholder = new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 1 });
    this.ground = new THREE.Mesh(groundGeo, placeholder);
    this.ground.name = 'Menu_Headland_Ground';
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.owned.push(groundGeo, placeholder);
    void this.res.terrain(q === 'low' ? 128 : 256).then((tex) => {
      if (!tex) return;
      if (this.disposed) {
        tex.dispose();
        return;
      }
      this.terrainTex = tex;
      const m = createTerrainMaterial(tex);
      // The same ground shader as the playable coast, trodden darker and flatter: at dusk the low sun rakes across the
      // track and full-strength relief reads as ripples in sand rather than as mud.
      const playable = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => {
        playable.call(m, sh, r);
        sh.fragmentShader = sh.fragmentShader
          .replace('diffuseColor.rgb = tAlb;', 'diffuseColor.rgb = tAlb * vec3(0.6, 0.58, 0.55); tDn *= 0.18;')
          // Sample a blurrier level of every layer: smeared, trodden mud instead of crisp pebbles.
          .replace('vec2 tGx = dFdx(tXZ);', 'vec2 tGx = dFdx(tXZ) * 2.6;')
          // Below the waterline the sky dome's sea shows instead: the shore is where the cliff meets it, with no step.
          .replace('vec2 tGy = dFdy(tXZ);', `vec2 tGy = dFdy(tXZ) * 2.6;\nif (vWorldPos.y < ${MENU_SEA_LEVEL.toFixed(2)}) discard;`);
      };
      const ground = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => {
        ground.call(m, sh, r);
        this.wisps.lights.patch(sh);
      };
      m.customProgramCacheKey = () => `tervain-terrain-menu-v3-${this.wisps.lights.key}`;
      this.ground.material = m;
      this.owned.push(m);
    });

    const puddles = buildPuddles(fog, new THREE.Vector3(MENU_FIRE.x, restHeight(MENU_FIRE.x, MENU_FIRE.z, 0.6) + 0.5, MENU_FIRE.z));
    this.scene.add(puddles);
    this.owned.push(puddles.geometry, puddles.material as THREE.Material);

    // The ancient tree, its bark and leaves. The hermit's door is cut into the side of the trunk that faces the camera,
    // turned a little to the left so it stands between the two low boughs.
    const treeRoot = new THREE.Group();
    treeRoot.name = 'Menu_Ancient_Tree';
    const ty = restHeight(MENU_TREE.x, MENU_TREE.z, 2.5) + 0.1;
    treeRoot.position.set(MENU_TREE.x, ty, MENU_TREE.z);
    treeRoot.rotation.y = 0.35;
    treeRoot.updateMatrixWorld(true);
    const tmp = new THREE.Vector3();
    const groundLocal = (x: number, z: number) => {
      treeRoot.localToWorld(tmp.set(x, 0, z));
      return menuHeight(tmp.x, tmp.z) - ty;
    };
    const doorYaw = Math.atan2(MENU_CAMERA.x - MENU_TREE.x, MENU_CAMERA.z - MENU_TREE.z) - 0.27;
    const doorDir = new THREE.Vector3(Math.sin(doorYaw), 0, Math.cos(doorYaw)).applyAxisAngle(UP, -treeRoot.rotation.y);
    const suppliedTree = opts.treeTemplates?.get(MENU_TREE_SOURCE);
    if (opts.treeTemplates && !suppliedTree) throw new Error(`Menu tree source ${MENU_TREE_SOURCE} is unavailable.`);
    const tree = buildAncientTree(1207, {
      leafCards: suppliedTree ? 0 : q === 'low' ? 900 : q === 'medium' ? 1500 : 2200,
      woodDetail: suppliedTree ? 0.8 : 1,
      door: { az: Math.atan2(doorDir.z, doorDir.x), halfWidth: HERMIT_DOOR.faceHalfWidth, height: HERMIT_DOOR.faceTop,
        opening: { width: HERMIT_DOOR.width, height: HERMIT_DOOR.height } },
      ground: groundLocal,
    });
    const bark = this.res.bark();
    const woodMat = new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normal, vertexColors: true, roughness: 0.97, metalness: 0 });
    woodMat.normalScale.set(1.4, 1.4);
    // The spirits light the bark as they pass (menuWispLight); built before the wisps so the materials can share it.
    const wispLight = buildMenuWisps({ tree: { x: MENU_TREE.x, y: ty, z: MENU_TREE.z, yaw: treeRoot.rotation.y }, quality: q });
    woodMat.onBeforeCompile = (sh) => wispLight.lights.patch(sh);
    woodMat.customProgramCacheKey = () => `tervain-menu-bark-${wispLight.lights.key}`;
    bark.map.wrapS = bark.map.wrapT = THREE.RepeatWrapping;
    bark.normal.wrapS = bark.normal.wrapT = THREE.RepeatWrapping;
    // The sea wind exists before the tree: the crown sways in the same gusts that roll over the heath.
    this.meadowWind = new GrassWind(MENU_WIND);
    this.foliage = createFoliageField(this.meadowWind);
    const remix = suppliedTree ? createMenuTreeRemix(suppliedTree, tree, this.foliage, wispLight.lights) : null;
    if (remix) {
      tree.crown = remix.crown; tree.leafSites = remix.leafSites;
      tree.height = Math.max(tree.height, remix.crown.top);
      this.stats.treeSource = `${MENU_TREE_SOURCE}:LOD${remix.sourceLod}`;
      this.owned.push(remix);
    }
    const leafTex = remix ? null : this.res.leaf();
    const leafMat = remix ? null : new THREE.MeshStandardMaterial({ map: leafTex, vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.42, alphaToCoverage: true });
    if (leafMat) leafMat.onBeforeCompile = (sh) => {
      // Same treatment as the playable leaves: never flip the crown-shaped normals for back faces, and let the low sun
      // shine through the leaves on the edge of the crown.
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <lights_fragment_begin>',
        `#include <lights_fragment_begin>
        #if NUM_DIR_LIGHTS > 0
        {
          vec3 tvL = normalize(directionalLights[0].direction);
          float tvBack = pow(clamp(-dot(normalize(vViewPosition), tvL), 0.0, 1.0), 3.0);
          reflectedLight.indirectDiffuse += diffuseColor.rgb * directionalLights[0].color * tvBack * 0.35;
        }
        #endif`,
      );
      wispLight.lights.patch(sh);
    };
    if (leafMat) leafMat.customProgramCacheKey = () => `tervain-menu-leaf-${wispLight.lights.key}`;
    const woodMesh = new THREE.Mesh(tree.wood, woodMat);
    woodMesh.castShadow = woodMesh.receiveShadow = true;
    woodMesh.name = 'Menu_Ancient_Tree_Wood';
    treeRoot.add(woodMesh);
    if (remix) {
      remix.parts.forEach((part, i) => {
        const mesh = new THREE.Mesh(part.geometry, part.material);
        if (part.depth) mesh.customDepthMaterial = part.depth;
        mesh.name = i === 0 ? 'Menu_Ancient_Tree_Leaves' : `Menu_Ancient_Tree_Leaves_${i}`;
        mesh.castShadow = q !== 'low'; mesh.receiveShadow = true; treeRoot.add(mesh);
      });
    } else {
      const leafMesh = new THREE.Mesh(tree.leaves, leafMat!);
      leafMesh.castShadow = q !== 'low'; leafMesh.name = 'Menu_Ancient_Tree_Leaves'; treeRoot.add(leafMesh);
      this.owned.push(leafMat!, leafTex!);
    }
    this.scene.add(treeRoot);
    treeRoot.updateMatrixWorld(true);
    this.treeMatrix.copy(treeRoot.matrixWorld);
    this.owned.push(tree.wood, tree.leaves, woodMat, bark.map, bark.normal);
    this.stats.leafCards = tree.stats.leafCards;

    // The door stands on the flat face the tree cut for it.
    const face = tree.door!;
    const doorAt = treeRoot.localToWorld(new THREE.Vector3(...face.origin));
    const doorNormal = new THREE.Vector3(...face.normal).applyAxisAngle(UP, treeRoot.rotation.y);
    const doorFacing = Math.atan2(doorNormal.x, doorNormal.z);

    // Camp, standing stones, banner hardware: the playable kit's rugged materials, merged per material.
    this.mats = this.res.materials(q === 'low' ? 128 : 256);
    // Lantern glass and embers burn at dusk: bright enough for the bloom pass to catch.
    const glow = this.mats.get('glow') as THREE.MeshBasicMaterial;
    if (glow.color) glow.color.setRGB(0.62, 0.24, 0.05);
    const R = new Region('Menu_Camp_Static', new Ctx());
    const worldRoots = tree.roots.map((r) => ({ ...r, pts: r.pts.map((p) => treeRoot.localToWorld(new THREE.Vector3(...p))) }));
    this.camp = buildMenuCamp(R, { at: doorAt, facing: doorFacing }, { x: MENU_TREE.x, z: MENU_TREE.z, r: 2.9, roots: worldRoots }, this.mats, opts.wardenRig);
    this.wisps = wispLight;
    this.scene.add(this.wisps.group);
    this.owned.push(this.wisps);
    this.stats.wisps = this.wisps.stats.wisps;
    // The hollow behind the door: carved heartwood lit by its own heart and by the spirits inside it.
    this.hollow = buildMenuHollow(face, { lights: this.wisps.lights });
    treeRoot.add(this.hollow.mesh);
    this.owned.push(this.hollow);
    const beforeBoughHardware = R.tris;

    // Rags and a few iron lanterns hang from the bare low boughs: tied round the bough itself, never from the air beside it.
    const boughs = tree.lowBoughs.map((b) => ({
      p: treeRoot.localToWorld(new THREE.Vector3(...b.p)),
      dir: new THREE.Vector3(...b.dir).applyAxisAngle(UP, treeRoot.rotation.y),
      r: b.r,
    }));
    const rng = mulberry32(19);
    const hooks: THREE.Vector3[] = [];
    const lanternCentres: THREE.Vector3[] = [];
    for (const i of [2, 7, 10, 5, 13, 16]) {
      const b = boughs[i];
      if (!b || hooks.length >= 3) continue;
      // The hook is on the bough's underside; the lantern hangs clear of the ground and of anyone walking under it.
      const top = b.p.clone().add(new THREE.Vector3(0, -b.r * 0.8, 0));
      const clearance = top.y - menuHeight(top.x, top.z) - 1.55;
      if (clearance < 0.45 || hooks.some((h) => h.distanceTo(top) < 1.5)) continue;
      const drop = Math.min(0.55 + rng() * 0.5, clearance - 0.33);
      hooks.push(top);
      R.vc.tube([[top.x, top.y, top.z], [top.x + 0.02, top.y - drop * 0.5, top.z], [top.x, top.y - drop, top.z]], 0.008, 3, 0x2a2622);
      const ly = top.y - drop;
      lanternCentres.push(new THREE.Vector3(top.x, ly - 0.2, top.z));
      R.metal.cyl(0.0, 0.1, 0.1, 6, top.x, ly - 0.1, top.z, 0x3a342c);
      R.glow.cyl(0.075, 0.075, 0.2, 6, top.x, ly - 0.3, top.z, 0xffffff, { jit: 0 });
      R.metal.cyl(0.1, 0.1, 0.03, 6, top.x, ly - 0.33, top.z, 0x3a342c);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        R.metal.rod(top.x + Math.cos(a) * 0.085, ly - 0.32, top.z + Math.sin(a) * 0.085, top.x + Math.cos(a) * 0.085, ly - 0.1, top.z + Math.sin(a) * 0.085, 0.008, 3, 0x2a2622);
      }
    }
    const anchors: THREE.Vector3[] = [];
    for (let i = 0; i < boughs.length; i++) {
      const b = boughs[i]!;
      const prev = boughs[i - 1];
      const n = 1 + Math.floor(rng() * 2.4);
      for (let k = 0; k < n; k++) {
        // Slide back along the bough toward the previous point (the segment the tube really follows), then tuck the knot
        // just inside the bough's underside so the rag hangs from the wood.
        const s = rng();
        const along = prev && prev.p.distanceTo(b.p) < 1.2 ? s * 0.45 : 0;
        const p = along > 0 ? b.p.clone().lerp(prev!.p, along) : b.p.clone();
        const r = along > 0 ? b.r + (prev!.r - b.r) * along : b.r;
        p.y -= r * 0.7;
        const ground = menuHeight(p.x, p.z);
        // A rag swings up to a third of a metre in the wind; keep it that far and more from a lantern's chain.
        if (p.y - ground < 1.4 || hooks.some((h) => h.distanceTo(p) < 0.6) || anchors.some((a) => a.distanceTo(p) < 0.12)) continue;
        anchors.push(p);
      }
    }
    // The awakening: one deterministic simulation of the door and every spirit, in the tree's own frame. A graphics
    // rebuild hands the running one over (same tree, same score), so nothing is re-simulated.
    // Handed over only for the same tree: a supplied crown replacing the drawn one needs perches on its own leaves (A70).
    const sameTree = (a: readonly (readonly number[])[], b: readonly (readonly number[])[]) => a.length === b.length && a.every((p, i) => p.every((v, k) => v === b[i]![k]));
    this.grove = opts.grove && opts.grove.count === GROVE_MAX_SPIRITS && sameTree(opts.grove.leafSites, tree.leafSites) ? opts.grove : createMenuGrove({
      trunk: tree.trunk,
      capsules: tree.capsules,
      leafSites: tree.leafSites,
      ground: groundLocal,
      door: face,
      aperture: { width: HERMIT_DOOR.width, height: HERMIT_DOOR.height, hingeZ: HERMIT_DOOR.hingeZ },
      hollow: TREE_HOLLOW,
      boughs: tree.lowBoughs.map((b) => ({ p: b.p, r: b.r })),
      lanterns: lanternCentres.map((c) => {
        const l = treeRoot.worldToLocal(c.clone());
        return [l.x, l.y, l.z] as [number, number, number];
      }),
    }, GROVE_MAX_SPIRITS);
    const rags = buildRibbons(anchors, this.ribbonTime);
    this.scene.add(rags.mesh);
    this.owned.push(rags);
    if (remix) {
      const ragTriangles = (rags.mesh.geometry.index?.count ?? rags.mesh.geometry.getAttribute('position').count) / 3;
      this.stats.treeTriangles = assertMenuTreeBudget(treeRoot, this.camp.group.getObjectByName('Menu_Tree_Door'),
        this.camp.doorStaticTriangles + R.tris - beforeBoughHardware + ragTriangles);
    }
    this.banner = buildMenuBanner(this.res.canvas, this.res.emblemUrl, (x, z) => restHeight(x, z, 0.5), buildBannerHardware(R, mulberry32(77)));
    this.banner.group.position.set(MENU_BANNER.x, restHeight(MENU_BANNER.x, MENU_BANNER.z, 0.8), MENU_BANNER.z);
    const staticGroup = R.toGroup(this.mats, { isStatic: true, shadows: q !== 'low' });
    this.scene.add(staticGroup, this.camp.group, this.banner.group);
    this.owned.push(this.camp, this.banner, this.mats);
    staticGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) this.owned.push(m.geometry);
    });

    // The heath: blades by the hundred thousand wherever nothing else stands, bent by the sea wind and parted by
    // anything that moves through it (the spirits skimming low, the viewer's own hand).
    this.meadowTrample = new GrassTrample(MENU_TRAMPLE.size[q], MENU_TRAMPLE.extent, MENU_TRAMPLE.centre);
    this.meadow = buildMenuMeadow({ quality: q, keep: this.camp.keep, wind: this.meadowWind, trample: this.meadowTrample,
      patch: (sh) => this.wisps.lights.patch(sh), patchKey: this.wisps.lights.key });
    this.scene.add(this.meadow.group);
    this.owned.push(this.meadow, this.meadowTrample, this.meadowWind);
    this.fluff = buildMenuFluff({ quality: q, wind: this.meadowWind, camera: this.camera, sunDir: MENU_SUN_DIR });
    this.scene.add(this.fluff.points);
    this.owned.push(this.fluff);
    if (opts.deer) this.addDeer(opts.deer.template, opts.deer.definition);

    // Fire, far country, air.
    const fx = MENU_FIRE.x;
    const fz = MENU_FIRE.z;
    this.fire = buildMenuFire(fx, restHeight(fx, fz, 0.6) + 0.05, fz, noise, q);
    this.scene.add(this.fire.group);
    this.owned.push(this.fire);
    this.far = buildMenuFar(noise);
    this.scene.add(this.far.group);
    this.owned.push(this.far);
    this.ships = buildMenuShips(this.trafficSeed, q);
    this.scene.add(this.ships.group);
    this.owned.push(this.ships);
    this.stats.ships = this.ships.stats.ships;
    // Crows wheel over the headland beyond the tree, never through its crown.
    const crown = treeRoot.localToWorld(new THREE.Vector3(tree.crown.x, 0, tree.crown.z));
    const crowCentre = new THREE.Vector3(MENU_TREE.x + 17, ty + 11, MENU_TREE.z - 17);
    this.air = buildMenuAir({ noise, fog, crowCentre, quality: q, avoid: { x: crown.x, z: crown.z, r: tree.crown.radius, top: ty + tree.crown.top } });
    this.scene.add(this.air.group);
    this.owned.push(this.air);

    this.buildLights();
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    this.hollow.setView(this.camera, treeRoot);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) {
        this.stats.meshes++;
        const g = m.geometry;
        const count = g.index ? g.index.count : (g.getAttribute('position')?.count ?? 0);
        const inst = (g as THREE.InstancedBufferGeometry).isInstancedBufferGeometry ? (g as THREE.InstancedBufferGeometry).instanceCount : 1;
        this.stats.triangles += (count / 3) * (Number.isFinite(inst) ? inst : 1);
      }
      if ((o as THREE.Light).isLight) this.stats.lights++;
    });
    this.stats.grassTufts = this.meadow.count;
    this.stats.grassBlades = this.meadow.blades;
    this.stats.grassTriangles = this.meadow.triangles;
    this.pose(0, 0);
  }

  private buildLights() {
    const q = this.quality;
    const hemi = new THREE.HemisphereLight(0x42565c, 0x241c15, 0.55);
    this.scene.add(hemi);
    // The sun is lower in the sky than its light: a little extra elevation keeps the long shadows readable.
    const sun = new THREE.DirectionalLight(0xff9f58, 1.7);
    const dir = MENU_SUN_DIR.clone();
    dir.y = 0.16;
    dir.normalize();
    sun.position.copy(dir).multiplyScalar(80).add(new THREE.Vector3(-2, 0, -6));
    sun.target.position.set(-2, 0, -6);
    sun.castShadow = q !== 'low';
    sun.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024);
    const s = sun.shadow.camera;
    s.left = -26;
    s.right = 26;
    s.top = 22;
    s.bottom = -22;
    s.near = 10;
    s.far = 160;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun, sun.target);
    // Warm lights: the lantern by the hermit's door, and lamplight through the grille in it.
    const [lantern, grille] = this.camp.lanterns;
    const doorLight = new THREE.PointLight(0xffa04c, 7, 8, 1.8);
    doorLight.position.copy(lantern!);
    const grilleLight = new THREE.PointLight(0xff9a48, 2.5, 4, 2);
    grilleLight.position.copy(grille!);
    this.grilleLight = grilleLight;
    this.scene.add(doorLight, grilleLight);
  }

  /**
   * Image-based light from the dusk sky (reflections in wet mud and iron). Needs the renderer, so the app calls this before
   * the first menu frame; it runs once.
   */
  prepare(renderer: THREE.WebGLRenderer) {
    if (this.env || this.disposed) return;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const skyScene = new THREE.Scene();
    const skyOnly = this.sky.mesh.clone();
    skyOnly.position.set(0, 0, 0);
    skyScene.add(skyOnly);
    const rt = pmrem.fromScene(skyScene, 0, 0.1, 1000);
    this.env = rt.texture;
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.3;
    pmrem.dispose();
    this.owned.push(rt);
  }

  /**
   * Renderer work before each menu frame: the meadow's trample field. Held still in reduced motion, like everything else
   * in the scene.
   */
  prepareFrame(renderer: THREE.WebGLRenderer, dt: number, reducedMotion: boolean) {
    if (this.disposed || reducedMotion) return;
    this.meadowTrample.update(renderer, 0, 0, dt);
  }

  /**
   * The pointer over the scene, in normalised device coordinates: the viewer's hand brushing through the heath. Only the
   * latest position counts; the hand lifts out of the grass a moment after it stops moving.
   */
  brush(ndcX: number, ndcY: number) {
    if (this.disposed || !Number.isFinite(ndcX) || !Number.isFinite(ndcY)) return;
    this.hand.ndcX = THREE.MathUtils.clamp(ndcX, -1, 1);
    this.hand.ndcY = THREE.MathUtils.clamp(ndcY, -1, 1);
    this.hand.moved = true;
  }

  /** How hard the wind blows past the lens now, 0..1: the gust the viewer sees arriving is the one they hear. */
  get windAtLens(): number {
    return THREE.MathUtils.clamp(this.meadowWind.pushAt(MENU_CAMERA.x, MENU_CAMERA.z - 3) / (MENU_WIND.steady + MENU_WIND.gust), 0, 1);
  }

  /**
   * Lets the stag into the heath (once; its model may arrive after the scene is built). Whenever it joins, it starts its
   * round out of sight beyond the stones rather than appearing in the middle of the meadow.
   */
  addDeer(template: GLTF, definition: AnimalDefinition): boolean {
    if (this.disposed || this.deer) return false;
    this.deer = buildMenuDeer(createAnimalFigure(template, definition), { shadows: this.quality !== 'low' });
    this.deerStart = this.time;
    this.scene.add(this.deer.root);
    this.owned.push(this.deer);
    this.stats.deer = 1;
    this.deer.update(0, 0);
    return true;
  }

  /** Where a ray from the lens first meets the headland (marched, then refined): x, z and the distance in y. */
  private groundHit(ndcX: number, ndcY: number): THREE.Vector3 | null {
    this.ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const o = this.ray.ray.origin, d = this.ray.ray.direction;
    const above = (t: number) => o.y + d.y * t - menuHeight(o.x + d.x * t, o.z + d.z * t);
    let a = 0.3, b = 0;
    for (let t = 0.3; t <= 80; t += 0.6 + t * 0.02) {
      if (above(t) < 0) { b = t; break; }
      a = t;
    }
    if (b <= 0) return null;
    for (let i = 0; i < 8; i++) {
      const m = (a + b) / 2;
      if (above(m) < 0) b = m; else a = m;
    }
    return new THREE.Vector3(o.x + d.x * b, b, o.z + d.z * b);
  }

  /** Everything pushing through the heath this frame: the deer, low spirits and the viewer's hand. */
  private gatherMovers(step: number) {
    const movers = this.movers;
    movers.length = 0;
    this.deer?.movers(movers);
    // Spirits skimming low over the heath part it as they pass; they weigh nothing, so nothing is laid flat.
    if (this.wisps.group.visible) {
      const g = this.grove, p = new THREE.Vector3(), v = new THREE.Vector3();
      for (let i = 0; i < g.count && movers.length < 32; i++) {
        if (g.outside[i]! < 0.5) continue;
        p.set(g.position[i * 3]!, g.position[i * 3 + 1]!, g.position[i * 3 + 2]!).applyMatrix4(this.treeMatrix);
        const h = p.y - menuHeight(p.x, p.z);
        if (h > 1.9 || h < -0.5) continue;
        const speed = Math.hypot(g.velocity[i * 3]!, g.velocity[i * 3 + 1]!, g.velocity[i * 3 + 2]!);
        v.set(g.velocity[i * 3]!, g.velocity[i * 3 + 1]!, g.velocity[i * 3 + 2]!).transformDirection(this.treeMatrix).multiplyScalar(speed);
        movers.push({ x: p.x, z: p.z, radius: 0.4 + 0.5 * (1 - Math.max(0, h) / 1.9), weight: 0, vx: v.x, vz: v.z });
      }
    }
    // The hand: brushed along the path the pointer took since the last frame, so a quick sweep leaves no gaps.
    const hand = this.hand;
    const current = movers.slice();
    const stamps = this.brushStamps;
    stamps.length = 0;
    const moved = hand.moved;
    if (hand.moved) {
      hand.moved = false;
      const hit = this.groundHit(hand.ndcX, hand.ndcY);
      if (hit) {
        const fresh = !Number.isFinite(hand.x) || hand.life <= 0;
        const dx = fresh ? 0 : hit.x - hand.x, dz = fresh ? 0 : hit.z - hand.z;
        const speed = step > 0 ? Math.hypot(dx, dz) / step : 0;
        const cap = speed > 14 ? 14 / speed : 1;
        hand.vx = step > 0 ? (dx / step) * cap : 0;
        hand.vz = step > 0 ? (dz / step) * cap : 0;
        // A hand's breadth near the lens, wider far off so a stroke reads on screen at any distance.
        hand.reach = THREE.MathUtils.clamp(hit.y * 0.1, 0.6, 2.6);
        const fromX = hand.x, fromZ = hand.z;
        hand.x = hit.x; hand.z = hit.z; hand.life = 1;
        const stampCount = fresh ? 0 : Math.min(8, Math.floor(Math.hypot(dx, dz) / (hand.reach * 0.7)));
        const weight = 0.15 + 0.35 * Math.min(1, speed / 6);
        for (let k = 1; k <= stampCount; k++) {
          const f = k / (stampCount + 1);
          const footprint = { x: fromX + dx * f, z: fromZ + dz * f, radius: hand.reach, weight, vx: hand.vx, vz: hand.vz };
          movers.push(footprint);
          stamps.push(footprint);
        }
      } else hand.life = 0;
    } else {
      hand.life -= step / 0.35;
      // The same decay at any frame rate (A70).
      const k = Math.pow(0.8, step * 60);
      hand.vx *= k; hand.vz *= k;
    }
    if (hand.life > 0 && Number.isFinite(hand.x)) {
      const speed = Math.hypot(hand.vx, hand.vz);
      const footprint = { x: hand.x, z: hand.z, radius: hand.reach * THREE.MathUtils.smoothstep(hand.life, 0, 1),
        weight: 0.15 + 0.35 * Math.min(1, speed / 6), vx: hand.vx, vz: hand.vz };
      movers.push(footprint);
      current.push(footprint);
      if (moved) stamps.push(footprint);
    } else {
      hand.x = Number.NaN; hand.z = Number.NaN;
    }
    this.meadowTrample.setMovers(current);
    this.meadowTrample.queueStamps(stamps);
  }

  /** A fixed camera. Narrow screens widen the vertical field (up to a limit) so the tree and the fire stay in frame. */
  resize(width: number, height: number) {
    const aspect = Math.max(0.1, width / Math.max(1, height));
    this.camera.aspect = aspect;
    // Keep about 64 degrees of horizontal view where the vertical field allows it.
    const minH = THREE.MathUtils.degToRad(64);
    const needV = 2 * Math.atan(Math.tan(minH / 2) / aspect);
    this.camera.fov = Math.min(MenuScene.MAX_FOV, Math.max(this.baseFov, THREE.MathUtils.radToDeg(needV)));
    this.camera.updateProjectionMatrix();
    const px = Math.min(2, Math.max(0.5, height / 720));
    this.fire.setPixelScale(px);
    this.air.setPixelScale(px);
    this.wisps.setPixelScale(px);
    this.fluff.setPixelScale(px);
  }

  /** Advances the menu clock. Reduced motion holds everything exactly where it is. */
  update(dt: number, reducedMotion: boolean, music?: MenuMusicPlayback) {
    if (this.disposed || reducedMotion) return;
    const step = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
    this.time += step;
    if (music) {
      // The score owns this clock. Browser buffering, mute and pause cannot let a separate visual timer drift ahead.
      if (music.playing && Number.isFinite(music.time)) this.awakening.time = Math.max(0, music.time);
      this.awakening.gain = music.playing && Number.isFinite(music.gain) ? THREE.MathUtils.clamp(music.gain, 0, 1) : 0;
      if (Number.isFinite(music.duration) && music.duration > 0) this.awakening.duration = music.duration;
    }
    this.pose(this.time, step);
  }

  /** A new title/pause visit gets new routes. Nested forms keep this visit; graphics rebuilds retain its exact phase. */
  beginTrafficVisit(seed: number) {
    if (this.disposed) return;
    this.trafficSeed = seed >>> 0;
    this.trafficEpoch = this.time;
    this.trafficOffset = 0;
    this.ships.reset(this.trafficSeed);
    this.ships.update(0);
  }

  get trafficState() {
    return { seed: this.trafficSeed, elapsed: Math.max(0, this.time - this.trafficEpoch + this.trafficOffset) };
  }

  get awakeningState(): MenuAwakeningState { return { ...this.awakening }; }

  /** How far the hermit's door stands open (0 shut, 1 against its stop), from the awakening's hinge. */
  get doorOpening() {
    this.grove.advanceTo(this.awakening.time);
    return this.grove.doorAngle / GROVE_DOOR_OPEN;
  }

  private pose(t: number, step: number) {
    this.sway.uTime.value = t;
    this.ribbonTime.value = t;
    this.sky.update(t);
    this.fire.update(t);
    this.far.update(t);
    this.ships.update(Math.max(0, t - this.trafficEpoch + this.trafficOffset));
    this.air.update(t);
    this.camp.update(t, step, 1);
    // The score's own clock drives the awakening; repeating a time changes nothing.
    this.grove.advanceTo(this.awakening.time);
    const opening = this.grove.doorAngle / GROVE_DOOR_OPEN;
    this.camp.setDoorAngle(this.grove.doorAngle);
    this.wisps.update(this.grove, this.awakening.gain, this.camera);
    // The hollow's heart beats with the low notes and flares on the accents while the score is audible.
    const rh = this.grove.rhythm;
    const low = 0.5 * (rh.bands[0]! + rh.bands[1]!);
    const audible = this.awakening.gain > 0 ? 1 : 0.35;
    const heart = (0.3 + 1.7 * Math.pow(low, 1.5) + 0.8 * Math.min(1.2, rh.accent)) * audible;
    this.hollow.update({ opening, heart, warm: 1, time: this.awakening.time });
    // The sea wind swells with the score while it is audible (it eases in over seconds, so it follows phrases, not
    // beats); the standard flies harder in each gust that crosses it.
    this.meadowWind.update(step, { strength: this.awakening.gain > 0 ? 0.8 + 0.5 * rh.barLevel : 0.9 });
    this.deer?.update(t - this.deerStart, step);
    this.fluff.update(t);
    this.banner.update(t, 0.45 + 1.1 * this.meadowWind.pushAt(MENU_BANNER.x, MENU_BANNER.z));
    this.gatherMovers(step);
    this.grilleLight.position.copy(this.camp.lanterns[1]!);
    this.grilleLight.color.copy(this.grilleWarm).lerp(this.grilleCool, opening * 0.78);
    this.grilleLight.intensity = 2.5 + opening * (0.7 + low * 0.6);
  }

  /** Idempotent. Shared caches (tree textures, building textures, noise) belong to their generators and are not freed here. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.terrainTex?.dispose();
    this.terrainTex = null;
    this.scene.traverse((o) => {
      if ((o as THREE.Light).isLight) (o as THREE.Light).dispose();
    });
    this.scene.environment = null;
    this.scene.clear();
  }
}
