import * as THREE from 'three';
import { buildHunterSupplies, disposeHunterSupplies } from './hunterSupplies';
import { buildAnimalCamp } from './animalCamp';
import { NPCS } from '../content/npcs';
import { S } from '../content/strings';
import { hasFact } from '../game/state';
import type { WorldState } from '../game/types';
import { worldView, type WorldView } from '../game/worldView';
import { buildStaticColliders, type Colliders } from '../world/colliders';
import { BELL, MILL_WHEEL, SHORTCUT, SLUICE, STREAMS, WORLD } from '../world/layout';
import { NavGrid } from '../world/nav';
import { Terrain, distToPolyline } from '../world/terrain';
import { SkyRig } from './sky';
import { buildTerrainTiles } from './terrainMesh';
import { makeTerrainTextures, type TerrainTextures } from './terrainTextures';
import { buildScenery, type SceneryHandles } from './settlement';
import { buildFlora } from './flora';
import { buildScatter } from './scatter';
import { buildAmbient } from './ambient';
import { buildGroundcover } from './groundcover';
import { buildWildlife } from './wildlife';
import { buildEnvironment, type EnvironmentHandle } from './environment';
import { Exclusions, type SwayUniforms } from './vegetation';
import { ALL_NEEDS } from './assets/needs';
import type { AssetLibrary, LoadProgress } from './assets/library';
import { setSharedLibrary } from './assets/library';
import type { BuildContext, FrameContext, SceneModule } from './context';
import { WaterSystem } from './water/waterSystem';
import { SkyCapture } from './water/skyCapture';
import type { WaterRenderInputs } from './waterRenderPass';
import type { Settings } from '../platform/settings';
import { buildRiteResponse, type RiteResponse } from './riteResponse';
import { buildForestLandmarks } from './forestLandmarks';
import { buildWoodlandAir } from './woodlandAir';
import { setPickupVisible } from './worldPickups';
import { loadSolitaryPine, type PineTemplates } from './solitaryPine';
import { LanternLightPool } from './lanternLights';
import { RealmPhysics, initializePhysics } from '../world/physics';
import { buildPhysicalProps } from './physicalProps';
import type { MeshyNpcCatalog } from './meshynpcs';
import { buildSourceRockPiles, loadSourceRockPile } from './sourceRockPile';
import { loadMeshyTrees, type MeshyTreeTemplates } from './meshyTrees';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildCoastalBackdrop } from './coastalBackdrop';
import { createGroundContactField } from './groundContacts';
import { buildAnimals, loadAnimalTemplates, type AnimalTemplates, type AnimalWildlife } from './animals';

/** Everything static in Bellwether Vale, plus the presentation that follows durable state. */
export class WorldScene {
  readonly scene = new THREE.Scene();
  readonly terrain: Terrain;
  readonly colliders: Colliders;
  readonly nav: NavGrid;
  readonly physics: RealmPhysics;
  readonly sky: SkyRig;
  readonly water: WaterSystem;
  readonly sway: SwayUniforms = { uTime: { value: 0 }, uWind: { value: 1 } };
  readonly library: AssetLibrary;
  /** Forest, ground cover, wildlife: updated every frame with the shared frame context. */
  readonly modules: { name: string; module: SceneModule }[] = [];
  private environment: EnvironmentHandle;
  private groundcover: ReturnType<typeof buildGroundcover>;
  readonly scenery: SceneryHandles;
  readonly animals: AnimalWildlife;
  readonly terrainMesh: THREE.Group;
  private lanternLights: THREE.PointLight[] = [];
  private lanternPool = new LanternLightPool(3);
  private wheelSpin = 0;
  private bellSwing = 0;
  private bellTimer = 0;
  private gateOpen = 0;
  private leverT = 0;
  private doorT = 0;
  private shutterT = 0;
  private braceT = 0;
  private wheelTurn = 0;
  private lastNoticeKey = '';
  private dust: THREE.Points;
  private dustData: { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number }[] = [];
  private riteResponse: RiteResponse;
  time = 0;
  /** Set by the app each frame: true while the player is standing inside the archive. */
  playerInArchive = false;
  view: WorldView;
  buildStats: { ms: number } = { ms: 0 };

  /** Loads every model the scene modules asked for, then builds the world. */
  static async create(state: WorldState, settings: Settings, library: AssetLibrary, onProgress?: (p: LoadProgress) => void, npcAssets?: MeshyNpcCatalog): Promise<WorldScene> {
    setSharedLibrary(library);
    await library.preload(ALL_NEEDS, onProgress);
    onProgress?.({ loaded: 0, total: 1, label: 'Source woodland and stone' });
    const [pine, rockPile, treeTemplates, animalTemplates] = await Promise.all([loadSolitaryPine(), loadSourceRockPile(),
      loadMeshyTrees(undefined, (loaded, total) => onProgress?.({ loaded, total, label: 'Preparing the woodland' })),
      loadAnimalTemplates((loaded, total) => onProgress?.({ loaded, total, label: 'Preparing the wildlife' }))]);
    onProgress?.({ loaded: 1, total: 1, label: 'Source woodland and stone' });
    // Ground textures are generated, not downloaded; yield between layers so the loading text keeps painting.
    await initializePhysics();
    const tex = await makeTerrainTextures(settings.quality === 'high' ? 1024 : settings.quality === 'medium' ? 768 : 256, () => new Promise((r) => setTimeout(r, 0)));
    return new WorldScene(state, settings, library, tex, pine, rockPile, treeTemplates, animalTemplates, npcAssets);
  }

  /** Release GPU resources the scene graph does not own. */
  dispose() {
    this.physics.dispose();
    this.water.dispose();
    this.environment.dispose?.();
    for (const m of this.modules) m.module.dispose?.();
    this.riteResponse.dispose();
    this.terrainTex.dispose();
    this.scenery.dispose();
  }

  private constructor(state: WorldState, settings: Settings, library: AssetLibrary, private terrainTex: TerrainTextures, pine: PineTemplates, rockPile: GLTF, treeTemplates: MeshyTreeTemplates, animalTemplates: AnimalTemplates, npcAssets?: MeshyNpcCatalog) {
    const t0 = performance.now();
    this.library = library;
    this.terrain = new Terrain();
    this.colliders = buildStaticColliders(this.terrain);
    this.sky = new SkyRig(settings.quality === 'low' ? 1024 : settings.quality === 'medium' ? 2048 : 4096);
    this.scene.add(this.sky.group);
    this.scene.fog = this.sky.fog;
    // The sky dome and stars are also drawn into the water's own small sky capture, for reflected clouds.
    SkyCapture.include(this.sky.group);
    this.water = new WaterSystem(this.terrain, settings.quality);
    this.scene.add(this.water.group);
    const ctx: BuildContext = { terrain: this.terrain, colliders: this.colliders, library, quality: settings.quality, settings, sway: this.sway, excl: new Exclusions(this.terrain), npcAssets };
    const landmarks = buildForestLandmarks(this.terrain, this.colliders, settings.quality);
    const forest = buildFlora(ctx, pine, true, treeTemplates);
    forest.initializeFloor();
    const scatter = buildScatter(ctx);
    const sourceRocks = buildSourceRockPiles(ctx, rockPile);
    const ambient = buildAmbient(ctx);
    this.groundcover = buildGroundcover(ctx);
    const wildlife = buildWildlife(ctx);
    const air = buildWoodlandAir(ctx, this.sky.fog);
    const backdrop = buildCoastalBackdrop(terrainTex);
    this.modules.push(
      { name: 'forest', module: forest }, { name: 'scatter', module: scatter },
      { name: 'source rock piles', module: sourceRocks },
      { name: 'groundcover', module: this.groundcover }, { name: 'wildlife', module: wildlife },
      { name: 'ambient', module: ambient }, { name: 'woodland air', module: air },
      { name: 'coastal promontory', module: backdrop },
      { name: 'woodland landmarks', module: { group: landmarks.group, update() {}, stats: () => landmarks.stats, dispose: () => landmarks.dispose() } },
    );
    for (const m of this.modules) this.scene.add(m.module.group);
    this.environment = buildEnvironment(this.scene, settings.quality);
    this.scenery = buildScenery(this.terrain, this.colliders, settings.quality);
    this.scene.add(this.scenery.group);
    const hunterSupplies = buildHunterSupplies(this.terrain, this.colliders);
    this.scene.add(hunterSupplies);
    this.modules.push({ name: 'hunter supplies', module: { group: hunterSupplies, update() {}, dispose: () => disposeHunterSupplies(hunterSupplies) } });
    const caravanAnimalCamp = buildAnimalCamp(this.terrain, this.colliders);
    this.modules.push({ name: 'caravan animal rest', module: caravanAnimalCamp });
    this.scene.add(caravanAnimalCamp.group);
    this.animals = buildAnimals(ctx, animalTemplates);
    this.modules.push({ name: 'land wildlife', module: this.animals });
    this.scene.add(this.animals.group);
    // Register accepted source rocks and constructed thresholds before painting their ground contacts.
    // This field changes surface dressing only; support, obstacle identities and terrain planes are unchanged.
    const contacts = createGroundContactField(this.terrain, this.colliders.rockMeshes);
    this.terrainMesh = buildTerrainTiles(this.terrain, terrainTex, ctx.plantedCrowns, undefined, contacts);
    this.scene.add(this.terrainMesh);
    this.physics = new RealmPhysics(this.terrain, this.colliders, undefined, forest.physicalWood);
    // Loose barrels and crates float on the same water that is drawn and heard.
    this.physics.setWater(this.water.world);
    const physicalProps = buildPhysicalProps(this.physics, settings.quality);
    this.modules.push({ name: 'physical supplies', module: physicalProps });
    this.scene.add(physicalProps.group);
    this.nav = new NavGrid(this.terrain, this.colliders);
    // Build the Thornback's wider lanes during loading, rather than on its first pursuit frame.
    this.nav.forRadius(.85);

    // A few real lights near the player make lanterns matter at night without a per-lantern cost.
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffb060, 0, 16, 1.6);
      this.lanternLights.push(l);
      this.scene.add(l);
    }

    // Quarry dust.
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(90 * 3), 3));
    const puff = document.createElement('canvas');
    puff.width = puff.height = 32;
    const pctx = puff.getContext('2d')!;
    const grad = pctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    pctx.fillStyle = grad;
    pctx.fillRect(0, 0, 32, 32);
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xd9d0b5, size: 1.1, map: new THREE.CanvasTexture(puff), transparent: true, opacity: 0.55, depthWrite: false }));
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
    for (let i = 0; i < 90; i++) this.dustData.push({ x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });

    this.riteResponse = buildRiteResponse(this.scenery.riteBowl);

    this.view = worldView(state);
    this.syncStatic(state, true);
    this.buildStats.ms = performance.now() - t0;
  }

  /** Apply durable state that is not animated: doors, pickups, brace, gate, boards. Instant when `snap`. */
  syncStatic(state: WorldState, snap = false) {
    this.animals.syncHunting(state.hunting);
    this.view = worldView(state);
    const v = this.view;
    const sc = this.scenery;
    // Colliders that follow state.
    // Never close the room around someone who is inside it; the app resyncs when they step out.
    const occupied = this.playerInArchive;
    this.colliders.setActive('archive_door', v.archiveDoor === 'locked' && !occupied);
    this.colliders.setActive('archive_shutter', v.archiveShutter !== 'forced' && !occupied);
    this.colliders.setActive('shortcut_gate', !v.shortcutOpen);
    // Visual targets.
    this.doorT = v.archiveDoor === 'open' ? 1 : 0;
    this.shutterT = v.archiveShutter === 'forced' ? 1 : 0;
    this.gateOpen = v.shortcutOpen ? 1 : 0;
    this.leverT = v.shortcutOpen ? 1 : 0;
    this.braceT = v.gate === 'stabilized' ? 1 : 0;
    sc.sluiceCracks.visible = v.gate !== 'stabilized';
    sc.scheduleBoard.visible = v.scheduleBoard;
    sc.contractGuardPost.visible = v.contractGuard;
    sc.quarryBanner.visible = true;
    for (const [id, obj] of Object.entries(sc.pickups)) setPickupVisible(obj, state.locationChanges[`pickup:${id}`] !== 'taken');
    const key = v.noticeboard.join('|');
    if (key !== this.lastNoticeKey) {
      this.lastNoticeKey = key;
      sc.noticeCanvasSetter(S('board.title'), v.noticeboard.map((k) => S(k)));
    }
    if (snap) {
      sc.archiveDoor.rotation.y = this.scenery.archiveDoor.rotation.y;
      this.applyDynamic(1, true);
    }
    this.nav.ensureFresh();
  }

  /** Where the bell rings from, for spatial audio. */
  get bellPosition() {
    return this.scenery.bellPos;
  }

  ringBell() {
    this.bellSwing = 1;
  }

  playRite() {
    this.riteResponse.play();
  }

  emitDust(dt: number, intensity: number) {
    if (intensity <= 0) return;
    for (const p of this.dustData) {
      if (p.life <= 0 && Math.random() < dt * 3 * intensity) {
        const src = this.scenery.dustEmitters[Math.floor(Math.random() * this.scenery.dustEmitters.length)]!;
        p.x = src.x + (Math.random() - 0.5) * 2;
        p.y = src.y + Math.random() * 0.6;
        p.z = src.z + (Math.random() - 0.5) * 2;
        p.vx = (Math.random() - 0.5) * 0.6 - 0.3;
        p.vy = 0.5 + Math.random() * 0.5;
        p.vz = (Math.random() - 0.5) * 0.6;
        p.life = 1.6 + Math.random();
      }
    }
  }

  waterRenderInputs(settings: Settings): WaterRenderInputs {
    return this.water.renderInputs(settings.quality !== 'low' && !settings.reduceEffects, settings.reducedMotion);
  }

  /** Nearest distance to any watercourse, for the ambience bed. */
  waterProximity(x: number, z: number): number {
    let d = Infinity;
    for (const s of STREAMS) d = Math.min(d, distToPolyline(x, z, s.points).d);
    return Math.max(0, 1 - d / 26);
  }

  private applyDynamic(dt: number, snap = false) {
    const sc = this.scenery;
    const k = snap ? 1 : 1 - Math.exp(-dt * 2.4);
    const lerpTo = (cur: number, target: number) => cur + (target - cur) * k;
    // Archive door swings open; shutter swings outward; gate leaf lifts; lever throws.
    sc.archiveDoor.rotation.y = this.scenery.archiveDoor.rotation.y;
    const doorTarget = this.doorT * -1.75;
    const shutterTarget = this.shutterT * 1.2;
    const dParent = sc.archiveDoor;
    dParent.userData.open = lerpTo((dParent.userData.open as number) ?? 0, doorTarget);
    const base = (dParent.userData.baseYaw as number | undefined) ?? dParent.rotation.y;
    dParent.userData.baseYaw = base;
    dParent.rotation.y = base + (dParent.userData.open as number);
    const sParent = sc.archiveShutter;
    sParent.userData.open = lerpTo((sParent.userData.open as number) ?? 0, shutterTarget);
    sParent.rotation.x = -(sParent.userData.open as number);
    const g = sc.shortcutGate;
    g.userData.open = lerpTo((g.userData.open as number) ?? 0, this.gateOpen * 1.55);
    const gBase = (g.userData.baseYaw as number | undefined) ?? SHORTCUT.gate.yaw;
    g.userData.baseYaw = gBase;
    g.rotation.y = gBase + (g.userData.open as number);
    sc.shortcutLever.rotation.z = lerpTo(sc.shortcutLever.rotation.z, this.leverT ? 0.7 : -0.7);
    // Sluice: the leaf hangs low and askew when damaged/jammed, sits square once braced.
    const gate = this.view.gate;
    const tilt = gate === 'jammed' ? 0.22 : gate === 'damaged' ? 0.07 : 0;
    const lift = gate === 'jammed' ? 0.5 : gate === 'damaged' ? 0.25 : -0.05;
    sc.sluiceGate.rotation.z = lerpTo(sc.sluiceGate.rotation.z, tilt);
    sc.sluiceGate.position.y = lerpTo(sc.sluiceGate.position.y, this.terrain.heightAt(SLUICE.gateCenter.x, SLUICE.gateCenter.z) + 1.55 + lift);
    sc.sluiceBrace.visible = this.braceT > 0.5;
    sc.sluiceWheel.rotation.y += dt * this.wheelTurn;
  }

  /** Move the whole scene forward: sky, water, foliage, animated props. */
  update(dt: number, state: WorldState, focus: THREE.Vector3, settings: Settings, hour: number, camera: THREE.Camera, wildlifeActive = true) {
    this.time += dt;
    this.view = worldView(state);
    const v = this.view;
    const reduced = settings.reducedMotion;
    this.sway.uTime.value = this.time;
    this.sway.uWind.value = reduced ? 0.25 : 1;
    this.sky.brightness = settings.brightness;
    this.sky.update(hour, focus, dt, reduced);
    const night = this.sky.state.nightness;
    this.scenery.setNight(night);
    this.scenery.update(dt, this.time, night);
    for (const s of this.physics.drainSplashes()) this.water.splash(s.x, s.y, s.z, s.energy);
    this.water.update(dt, v.flow, camera, focus, reduced, settings.reduceEffects);
    let shadowFrustum: THREE.Frustum | null = null;
    if (settings.quality !== 'low' && this.sky.sun.castShadow) {
      // Scene modules cull before the renderer updates light matrices. Use the real snapped
      // shadow volume now, so off-screen trees that shade visible ground remain submitted.
      this.sky.sun.updateMatrixWorld(); this.sky.sun.target.updateMatrixWorld();
      this.sky.sun.shadow.updateMatrices(this.sky.sun);
      shadowFrustum = this.sky.sun.shadow.getFrustum();
    }
    const frame: FrameContext = { time: this.time, camera, focus, nightness: night, sunDir: this.sky.state.sunDir, shadowFrustum, reducedMotion: reduced, hour, view: v, quality: settings.quality, wildlifeActive };
    this.animals.setRunning(wildlifeActive);
    this.animals.syncHunting(state.hunting);
    this.animals.setReduceEffects(settings.reduceEffects);
    this.environment.update(dt, frame);
    for (const m of this.modules) m.module.update(dt, frame);

    // Three resident lamps fade at range, and a slot only changes lamp after dimming.
    const ls = this.scenery.lanternPositions;
    const slots = this.lanternPool.update(dt, ls, focus);
    for (let k = 0; k < this.lanternLights.length; k++) {
      const l = this.lanternLights[k]!;
      const slot = slots[k]!;
      if (slot.source !== null) l.position.copy(ls[slot.source]!);
      l.intensity = 14 * Math.max(0, night - 0.15) * slot.strength;
    }

    // Mill wheel turns when the allocation gives the mill water.
    const target = v.millTurning ? 0.7 : 0;
    this.wheelSpin += (target - this.wheelSpin) * (1 - Math.exp(-dt * 0.8));
    this.scenery.millWheel.rotation.x += dt * this.wheelSpin;
    // Bell swing: decays after each ring.
    this.bellSwing = Math.max(0, this.bellSwing - dt * 0.35);
    this.scenery.bell.rotation.z = Math.sin(this.time * 4.2) * 0.55 * this.bellSwing;
    this.bellTimer += dt;
    this.applyDynamic(dt);

    // Quarry dust and the local response of the rite's bowl, water and altar.
    const working = v.quarryState === 'working' || v.quarryState === 'night_shift';
    this.emitDust(dt, working ? 1 : 0);
    const arr = this.dust.geometry.attributes.position as THREE.BufferAttribute;
    this.dustData.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        arr.setXYZ(i, p.x, p.y, p.z);
      } else arr.setXYZ(i, 0, -200, 0);
    });
    arr.needsUpdate = true;
    this.riteResponse.update(dt, reduced, night);
    // Ledger glows faintly while the archive is accessible; the archive lamp is emissive via lantern lights.
    this.scenery.ledger.rotation.y = Math.sin(this.time * 0.8) * 0.05;
    void hasFact;
    void NPCS;
    void BELL;
    void MILL_WHEEL;
    void WORLD;
  }

  /** Spin the control wheel while the gate is being worked. */
  setWheelTurning(v: number) {
    this.wheelTurn = v;
  }

  /** Whether the player is standing inside the archive (roofed) for audio and camera decisions. */
  insideArchive(x: number, z: number): boolean {
    return Math.abs(x + 46) < 3.6 && Math.abs(z + 102) < 3.1;
  }
}
