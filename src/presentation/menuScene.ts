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
import { buildMenuGrass, buildMenuGroundGeometry, buildPuddles, restHeight } from './menu/menuLand';
import { buildAncientTree } from './menu/menuTree';
import { buildMenuFire } from './menu/menuFire';
import { buildMenuBanner, type CanvasSource } from './menu/menuBanner';
import { HERMIT_DOOR, buildBannerHardware, buildMenuCamp } from './menu/menuCamp';
import { buildMenuFar } from './menu/menuFar';
import { buildMenuAir } from './menu/menuAir';
import { buildRibbons } from './menu/menuRibbons';

export type MenuQuality = 'low' | 'medium' | 'high';

const UP = new THREE.Vector3(0, 1, 0);

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
    emblemUrl: `${import.meta.env.BASE_URL}assets/menu/hegemony-emblem.png`,
  };
}

/**
 * The title and pause menus' own place: a Templar warden's dusk vigil on a headland above the sea, under an ancient tree
 * that holds a hermit's door in its roots. Gothic 3's title backdrop is the reference for mood and colour (dark, dirty,
 * scratched; teal sky over one amber band), studied from the local install for measurement only. The scene is original
 * and built from the playable game's own generators, so it reads as the same rugged world.
 *
 * The camera is fixed. Fire, smoke, sparks, the standard, the grass, crows, dust, clouds, mist and the far lighthouse
 * beam run on one clock that stops entirely in reduced motion; nothing here advances game state.
 */
export class MenuScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(MENU_CAMERA.fov, 16 / 9, 0.2, 2600);
  readonly stats = { triangles: 0, meshes: 0, grassTufts: 0, leafCards: 0, banners: 1, lights: 0 };
  readonly quality: MenuQuality;
  private readonly res: MenuResources;
  private readonly sway: SwayUniforms = { uTime: { value: 0 }, uWind: { value: 0.8 } };
  private readonly ribbonTime = { value: 0 };
  private readonly sky: ReturnType<typeof createMenuSky>;
  private readonly fire: ReturnType<typeof buildMenuFire>;
  private readonly far: ReturnType<typeof buildMenuFar>;
  private readonly air: ReturnType<typeof buildMenuAir>;
  private readonly camp: ReturnType<typeof buildMenuCamp>;
  private readonly banner: ReturnType<typeof buildMenuBanner>;
  private readonly grass: ReturnType<typeof buildMenuGrass>;
  private readonly mats: ReturnType<MenuResources['materials']>;
  private readonly ground: THREE.Mesh;
  private readonly owned: { dispose(): void }[] = [];
  private terrainTex: TerrainTextures | null = null;
  private env: THREE.Texture | null = null;
  private time = 0;
  private disposed = false;
  private readonly baseFov = MENU_CAMERA.fov;
  static readonly MAX_FOV = 76;

  constructor(opts: { quality?: MenuQuality; resources?: MenuResources } = {}) {
    this.quality = opts.quality ?? 'high';
    this.res = opts.resources ?? browserResources();
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
      m.customProgramCacheKey = () => 'tervain-terrain-menu-v2';
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
    const tree = buildAncientTree(1207, {
      leafCards: q === 'low' ? 900 : q === 'medium' ? 1500 : 2200,
      door: { az: Math.atan2(doorDir.z, doorDir.x), halfWidth: HERMIT_DOOR.faceHalfWidth, height: HERMIT_DOOR.faceTop },
      ground: groundLocal,
    });
    const bark = this.res.bark();
    const woodMat = new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normal, vertexColors: true, roughness: 0.97, metalness: 0 });
    woodMat.normalScale.set(1.4, 1.4);
    bark.map.wrapS = bark.map.wrapT = THREE.RepeatWrapping;
    bark.normal.wrapS = bark.normal.wrapT = THREE.RepeatWrapping;
    const leafTex = this.res.leaf();
    const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.42, alphaToCoverage: true });
    leafMat.onBeforeCompile = (sh) => {
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
    };
    leafMat.customProgramCacheKey = () => 'tervain-menu-leaf';
    const woodMesh = new THREE.Mesh(tree.wood, woodMat);
    woodMesh.castShadow = woodMesh.receiveShadow = true;
    woodMesh.name = 'Menu_Ancient_Tree_Wood';
    const leafMesh = new THREE.Mesh(tree.leaves, leafMat);
    leafMesh.castShadow = q !== 'low';
    leafMesh.name = 'Menu_Ancient_Tree_Leaves';
    treeRoot.add(woodMesh, leafMesh);
    this.scene.add(treeRoot);
    treeRoot.updateMatrixWorld(true);
    this.owned.push(tree.wood, tree.leaves, woodMat, leafMat, bark.map, bark.normal, leafTex);
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
    this.camp = buildMenuCamp(R, { at: doorAt, facing: doorFacing }, { x: MENU_TREE.x, z: MENU_TREE.z, r: 2.9, roots: worldRoots });

    // Rags and a few iron lanterns hang from the bare low boughs: tied round the bough itself, never from the air beside it.
    const boughs = tree.lowBoughs.map((b) => ({
      p: treeRoot.localToWorld(new THREE.Vector3(...b.p)),
      dir: new THREE.Vector3(...b.dir).applyAxisAngle(UP, treeRoot.rotation.y),
      r: b.r,
    }));
    const rng = mulberry32(19);
    const hooks: THREE.Vector3[] = [];
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
    const rags = buildRibbons(anchors, this.ribbonTime);
    this.scene.add(rags.mesh);
    this.owned.push(rags);
    this.banner = buildMenuBanner(this.res.canvas, this.res.emblemUrl, (x, z) => restHeight(x, z, 0.5), buildBannerHardware(R, mulberry32(77)));
    this.banner.group.position.set(MENU_BANNER.x, restHeight(MENU_BANNER.x, MENU_BANNER.z, 0.8), MENU_BANNER.z);
    const staticGroup = R.toGroup(this.mats, { isStatic: true, shadows: q !== 'low' });
    this.scene.add(staticGroup, this.camp.group, this.banner.group);
    this.owned.push(this.camp, this.banner, this.mats);
    staticGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) this.owned.push(m.geometry);
    });

    // Heath grass everywhere nothing else stands.
    this.grass = buildMenuGrass(q, this.sway, this.camp.keep);
    this.scene.add(this.grass.mesh);
    this.owned.push(this.grass);

    // Fire, far country, air.
    const fx = MENU_FIRE.x;
    const fz = MENU_FIRE.z;
    this.fire = buildMenuFire(fx, restHeight(fx, fz, 0.6) + 0.05, fz, noise, q);
    this.scene.add(this.fire.group);
    this.owned.push(this.fire);
    this.far = buildMenuFar(noise);
    this.scene.add(this.far.group);
    this.owned.push(this.far);
    // Crows wheel over the headland beyond the tree, never through its crown.
    const crown = treeRoot.localToWorld(new THREE.Vector3(tree.crown.x, 0, tree.crown.z));
    const crowCentre = new THREE.Vector3(MENU_TREE.x + 17, ty + 11, MENU_TREE.z - 17);
    this.air = buildMenuAir({ noise, fog, crowCentre, quality: q, avoid: { x: crown.x, z: crown.z, r: tree.crown.radius, top: ty + tree.crown.top } });
    this.scene.add(this.air.group);
    this.owned.push(this.air);

    this.buildLights();
    this.scene.updateMatrixWorld(true);
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
    this.stats.grassTufts = this.grass.count;
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
  }

  /** Advances the menu clock. Reduced motion holds everything exactly where it is. */
  update(dt: number, reducedMotion: boolean) {
    if (this.disposed || reducedMotion) return;
    const step = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
    this.time += step;
    this.pose(this.time, step);
  }

  private pose(t: number, step: number) {
    this.sway.uTime.value = t;
    this.ribbonTime.value = t;
    this.sky.update(t);
    this.fire.update(t);
    this.far.update(t);
    this.air.update(t);
    this.banner.update(t, 1);
    this.camp.update(t, step, 1);
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
