import * as THREE from 'three';
import type { Terrain } from '../../world/terrain';
import { SEA_MAX_RISE } from '../../world/water/waves';
import { WaterWorld, type WaterFlows, type WaterSample } from '../../world/water/waterWorld';
import { detachWaterOptics } from '../waterOptics';
import { RENDER_PX, SKY } from '../skyState';
import type { WaterRenderInputs, WaterUnder } from '../waterRenderPass';
import { buildOcean, makeBathymetryTextures, type OceanHandle } from './ocean';
import { RippleField } from './ripples';
import { buildInlandWater, type InlandWater } from './rivers';
import { SkyCapture } from './skyCapture';
import { Splashes } from './splashes';
import { WaterListener, type WaterEvent, type WaterEventKind, type WaterSoundState } from './waterSound';
import { waterTextures } from './waterTextures';

/**
 * All of the realm's water in one place: the shared model (world/water) that answers where water is and how it moves,
 * and everything drawn from it: the sea, the inland channels and the spring, the ripple field, spray and the captured
 * sky. Physics, the swimmer and the sounds ask `world`; anything that disturbs water calls `disturb` or `splash`.
 */
export class WaterSystem {
  readonly world: WaterWorld;
  readonly group = new THREE.Group();
  readonly ocean: OceanHandle;
  readonly inland: InlandWater;
  readonly splashes = new Splashes();
  readonly ripples: RippleField | null;
  readonly sky: SkyCapture;
  readonly meshes: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[];
  private readonly materials: THREE.ShaderMaterial[];
  private readonly bathymetry: { bed: THREE.DataTexture; wave: THREE.DataTexture };
  private readonly textures: ReturnType<typeof waterTextures>;
  private revision = -1;
  private reducedMotion = false;
  private readonly focus = new THREE.Vector3();
  private readonly skyCentre = new THREE.Vector3();
  private disposed = false;
  private events: WaterEvent[] = [];
  private readonly listener = new WaterListener();
  /** Seconds until a fish may next break the surface near the player. */
  private fishIn = 9;
  private under: WaterUnder | null = null;
  private readonly underColor = new THREE.Color();
  private readonly underLight = new THREE.Color();
  private readonly underSun = new THREE.Color();
  private readonly underAbsorb = new THREE.Vector3();
  private readonly eye = new THREE.Vector3();
  private seed = 0x2f6b1d;

  constructor(terrain: Terrain, private readonly quality: 'low' | 'medium' | 'high') {
    this.group.name = 'water';
    this.world = new WaterWorld(terrain);
    const textures = waterTextures();
    this.textures = textures;
    this.bathymetry = makeBathymetryTextures(this.world.bathymetry);
    this.ocean = buildOcean(this.world.bathymetry, this.bathymetry, textures, quality, SEA_MAX_RISE);
    this.inland = buildInlandWater(this.world, terrain, textures, quality);
    this.group.add(this.ocean.mesh, this.inland.group, this.splashes.points);
    this.meshes = [this.ocean.mesh, ...this.inland.meshes];
    this.materials = [this.ocean.mesh.material, ...this.inland.materials];
    this.ripples = quality === 'low' ? null : new RippleField(quality === 'high' ? 512 : 256, quality === 'high' ? 44 : 36);
    this.sky = new SkyCapture(quality === 'high' ? 128 : 64);
  }

  /** Any water at (x, z), from the shared model. */
  sample(x: number, z: number): WaterSample | null {
    return this.world.sample(x, z);
  }

  /** Disturb the water: rings from (x, z) of `radius` metres, pushed `strength` metres, leaving `foam` 0..1. */
  disturb(x: number, z: number, radius: number, strength: number, foam = 0) {
    if (this.reducedMotion) return;
    this.ripples?.drop({ x, z, radius, strength, foam });
  }

  /** Something meets the water with `energy` 0..1 (a dropped stone .. a body falling in): spray, rings, foam and sound. */
  splash(x: number, y: number, z: number, energy: number, push: { x: number; z: number } = { x: 0, z: 0 }, kind: WaterEventKind = energy >= 0.4 ? 'splash' : 'plop') {
    if (!Number.isFinite(energy) || energy <= 0 || ![x, y, z].every(Number.isFinite)) return;
    const e = Math.min(1, energy);
    if (!this.reducedMotion) this.splashes.emit(x, y, z, Math.round(6 + e * 60), 1.6 + e * 4.2, 0.035 + e * 0.035, 0.6 + e * 0.6, push);
    this.disturb(x, z, 0.25 + e * 0.6, 0.03 + e * 0.12, 0.25 + e * 0.6);
    this.emit(kind, x, y, z, e);
  }

  /** A sound the water owes (a stroke, a wading step, getting in or out): heard, with no spray of its own. */
  emit(kind: WaterEventKind, x: number, y: number, z: number, energy = 0.5) {
    if (![x, y, z, energy].every(Number.isFinite)) return;
    this.events.push({ kind, x, y, z, energy: Math.min(1, Math.max(0, energy)) });
    if (this.events.length > 48) this.events.shift();
  }

  /** What the water sounds like from the listener, with every disturbance since the last call. */
  soundState(x: number, y: number, z: number, dt: number): WaterSoundState {
    const events = this.events;
    this.events = [];
    return this.listener.update(this.world, x, y, z, dt, events);
  }

  private random() {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Now and then a fish rises in calm water near the player: a flick of spray, rings, and its splash. */
  private fish(dt: number) {
    this.fishIn -= dt;
    if (this.fishIn > 0) return;
    this.fishIn = 14 + this.random() * 26;
    for (let attempt = 0; attempt < 6; attempt++) {
      const a = this.random() * Math.PI * 2, r = 7 + this.random() * 18;
      const x = this.focus.x + Math.sin(a) * r, z = this.focus.z + Math.cos(a) * r;
      const s = this.world.sample(x, z);
      if (!s || s.rough > 0.3 || s.depth < (s.body === 'sea' ? 1.2 : 0.35)) continue;
      this.splashes.emit(x, s.surface, z, 10, 2.1, 0.03, 0.5);
      this.disturb(x, z, 0.3, 0.05, 0.15);
      this.emit('fish', x, s.surface, z, 0.4);
      return;
    }
  }

  /** Advance the model and its meshes. `flows` are the quest's targets; the model eases toward them. */
  update(dt: number, flows: WaterFlows, camera: THREE.Camera, focus: THREE.Vector3, reducedMotion: boolean, reduceEffects: boolean) {
    if (this.disposed) return;
    this.reducedMotion = reducedMotion;
    this.focus.copy(focus);
    this.world.update(dt, flows, reducedMotion);
    if (this.world.revision !== this.revision) {
      this.revision = this.world.revision;
      this.inland.refresh();
    }
    const detail = this.quality === 'low' || reduceEffects ? 0 : 1;
    camera.getWorldPosition(this.eye);
    this.ocean.update(camera as THREE.PerspectiveCamera, this.world.time, detail, this.world.sea(this.eye.x, this.eye.z)?.surface);
    for (const m of this.inland.materials) {
      m.uniforms.uTime!.value = this.world.time;
      m.uniforms.uDetail!.value = detail;
      m.uniforms.uWaterSSR!.value = detail;
      m.uniforms.uWaterCausticStrength!.value = detail;
    }
    this.ocean.mesh.material.uniforms.uWaterCausticStrength!.value = detail;
    this.splashes.enabled = !reducedMotion;
    this.splashes.update(reducedMotion ? 0.1 : dt);
    if (!reducedMotion) this.fish(dt);
    this.updateUnder(camera);
    const pc = camera as THREE.PerspectiveCamera;
    if (pc.isPerspectiveCamera) {
      const height = typeof window === 'undefined' ? 720 : window.innerHeight * RENDER_PX.value;
      (this.splashes.points.material as THREE.ShaderMaterial).uniforms.uScale!.value = height * 0.5 / Math.tan(THREE.MathUtils.degToRad(pc.fov) * 0.5);
    }
  }

  /** Prepare the ripple passes ahead of their first use (A81). */
  warm(renderer: THREE.WebGLRenderer) {
    this.ripples?.warm(renderer);
  }

  /** Work that needs the renderer, once per frame before the water pass: the sky capture and the ripple solve. */
  prepare(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, dt: number) {
    if (this.disposed) return;
    // The sky dome is centred on the player; capture it from there so its directions are true.
    this.skyCentre.copy(this.focus);
    if (!Number.isFinite(this.skyCentre.x)) camera.getWorldPosition(this.skyCentre);
    this.sky.update(renderer, scene, this.skyCentre, dt);
    if (this.ripples && !this.reducedMotion) this.ripples.update(renderer, this.focus.x, this.focus.z, dt);
    const ripple = this.ripples?.ready && !this.reducedMotion;
    for (const m of this.materials) {
      const u = m.uniforms;
      u.tSkyCube!.value = this.sky.ready ? this.sky.texture : null;
      u.uSkyCubeReady!.value = this.sky.ready ? 1 : 0;
      u.tRipple!.value = ripple ? this.ripples!.texture : null;
      u.uRippleReady!.value = ripple ? 1 : 0;
      if (ripple) u.uRipple!.value.copy(this.ripples!.uniform);
    }
  }

  /**
   * Whether the camera is under water, and the water it looks through: the sea is clear blue-green, inland water tea
   * green and murkier. Crossing the surface is heard as a rush of bubbles.
   */
  private updateUnder(camera: THREE.Camera) {
    camera.getWorldPosition(this.eye);
    const s = this.world.sample(this.eye.x, this.eye.z);
    const depth = s ? s.surface - this.eye.y : 0;
    const under = depth > 0.02;
    if (under !== (this.under !== null)) this.emit(under ? 'dive' : 'surface', this.eye.x, this.eye.y, this.eye.z, 0.6);
    if (!under || !s) { this.under = null; return; }
    const sea = s.body === 'sea';
    const day = 1 - SKY.night.value, sun = Math.min(SKY.sunI.value, 2.5) * day;
    this.underLight.copy(SKY.ambient.value).multiplyScalar(0.8).add(this.underSun.copy(SKY.sunColor.value).multiplyScalar(sun * 0.45));
    this.underColor.setRGB(sea ? 0.02 : 0.03, sea ? 0.085 : 0.07, sea ? 0.09 : 0.04).multiply(this.underLight);
    this.underAbsorb.set(sea ? 0.32 : 0.6, sea ? 0.1 : 0.26, sea ? 0.075 : 0.32);
    this.under = {
      surface: depth, color: this.underColor, absorb: this.underAbsorb,
      caustics: this.quality === 'low' ? null : this.textures.caustics, light: Math.min(1, sun * 0.6),
    };
  }

  /** How far below the water surface the camera is (m), or 0 above it. */
  submerged(camera: THREE.Camera): number {
    const p = camera.getWorldPosition(new THREE.Vector3());
    const s = this.world.sample(p.x, p.z);
    return s ? Math.max(0, s.surface - p.y) : 0;
  }

  renderInputs(enabled: boolean, reducedMotion: boolean): WaterRenderInputs {
    return {
      meshes: this.meshes, seaMaterial: this.ocean.mesh.material, quality: this.quality, enabled, reducedMotion,
      prepare: (renderer, scene, camera, dt) => this.prepare(renderer, scene, camera, dt),
      under: this.under,
      overlays: [this.splashes.points],
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const m of this.materials) {
      detachWaterOptics(m);
      m.uniforms.tSkyCube!.value = null;
      m.uniforms.tRipple!.value = null;
    }
    this.ocean.dispose();
    this.inland.dispose();
    this.ripples?.dispose();
    this.sky.dispose();
    this.splashes.dispose();
    this.bathymetry.bed.dispose();
    this.bathymetry.wave.dispose();
  }
}
