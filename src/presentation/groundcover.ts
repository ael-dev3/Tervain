import * as THREE from 'three';
import type { BuildContext, FrameContext, SceneModule } from './context';
import type { AssetNeed } from './assets/library';
import { Habitat } from './ground/habitat';
import { createGrassField, GRASS_QUALITY, meadowGround, type GrassReserve, type MeadowGround } from './grass/grassField';
import { GrassTrample, type GrassMover } from './grass/trample';
import { GrassWind } from './grass/wind';
import { REALM_WIND } from './realmWind';

export { REALM_WIND } from './realmWind';

/** Assets this module wants loaded before the world is built. */
export const NEEDS: AssetNeed[] = [];

export interface Groundcover extends SceneModule {
  readonly wind: GrassWind;
  /** Bodies moving through the grass this frame besides the focus (residents, enemies, animals, cargo). */
  setMovers(movers: readonly GrassMover[]): void;
  /** Temporarily admit resident tiles for a window capture camera; returns the visibility restore. */
  showForCapture(camera: THREE.Vector3): () => void;
  /** Renderer work before the frame is drawn: the interaction field. */
  prepare(renderer: THREE.WebGLRenderer, dt: number): void;
  /** Prepare the interaction field's passes ahead of their first use (A81). */
  warm(renderer: THREE.WebGLRenderer): void;
  /** The far ground's grass colour and cover at a point (B11), for the terrain's vertices. */
  readonly meadowAt: MeadowGround;
}

/** Ground cover: the grass. Presentation only. */
export function buildGroundcover(ctx: BuildContext): Groundcover {
  const group = new THREE.Group();
  group.name = 'groundcover';
  const habitat = new Habitat(ctx);
  const spec = GRASS_QUALITY[ctx.quality];
  // The world's shared wind when there is one (the trees answer it too); a standalone build makes its own.
  const ownsWind = !ctx.foliage;
  const wind = ctx.foliage?.wind ?? new GrassWind(REALM_WIND);
  // The field's uniforms are the world's, so the forest floor's ferns read the same trails.
  const trample = spec.trample.size > 0 ? new GrassTrample(spec.trample.size, spec.trample.extent, undefined, ctx.foliage?.trample) : null;
  const field = createGrassField(ctx.terrain, habitat, ctx.quality, wind, trample);
  group.add(field.group);
  const cam = new THREE.Vector3();
  const focus = new THREE.Vector3(Number.NaN, 0, Number.NaN);
  const lastFocus = new THREE.Vector3(Number.NaN, 0, Number.NaN);
  let others: readonly GrassMover[] = [];
  let reduced = false;
  const heroMover: GrassMover = { x: 0, z: 0, radius: 0.55, weight: 0.75, vx: 0, vz: 0 };
  const moverInputs: GrassMover[] = [];
  const reserve: GrassReserve = { remaining: 2 };
  return {
    group,
    wind,
    meadowAt: meadowGround(habitat),
    setMovers(movers) { others = movers; },
    update(dt: number, f: FrameContext) {
      f.camera.getWorldPosition(cam);
      reduced = f.reducedMotion;
      if (ownsWind) wind.update(dt, { reducedMotion: f.reducedMotion });
      // The focus (the hero) walks through the grass too, leaning it the way he goes.
      const step = Number.isFinite(dt) && dt > 0 ? dt : 1 / 60;
      const vx = Number.isFinite(lastFocus.x) ? (f.focus.x - lastFocus.x) / step : 0;
      const vz = Number.isFinite(lastFocus.z) ? (f.focus.z - lastFocus.z) / step : 0;
      const jump = Math.hypot(vx, vz) > 25;
      lastFocus.copy(f.focus);
      focus.copy(f.focus);
      // Up on a rock, a deck or a stair he treads nothing below (A105 scout: grass under him flattened as if waded).
      const aloft = f.focus.y - ctx.terrain.heightAt(f.focus.x, f.focus.z) > 0.6;
      if (trample) {
        // Consumed synchronously by setMovers; each world owns its input storage.
        moverInputs.length = 0;
        if (!aloft) {
          heroMover.x = f.focus.x; heroMover.z = f.focus.z;
          heroMover.vx = jump ? 0 : vx; heroMover.vz = jump ? 0 : vz;
          moverInputs.push(heroMover);
        }
        for (const mover of others) moverInputs.push(mover);
        trample.setMovers(moverInputs, f.focus.x, f.focus.z);
      }
      field.update(cam, reserve);
    },
    showForCapture(camera) {
      const restores = field.layers.map(layer => layer.showForCapture(camera));
      return () => { for (const restore of restores) restore(); };
    },
    warm(renderer) { trample?.warm(renderer); },
    prepare(renderer, dt) {
      // Catch-up steps share one allowance; rendering starts the next allowance even without trample work.
      reserve.remaining = 2;
      reserve.deadline = undefined;
      if (!trample || reduced || !Number.isFinite(focus.x)) return;
      trample.update(renderer, focus.x, focus.z, dt);
    },
    stats: () => {
      const s = field.stats();
      return { grassInstances: s.instances, grassTris: s.triangles, grassDraws: s.draws, grassTiles: s.tiles, grassMovers: trample?.activeMovers ?? 0 };
    },
    dispose() {
      field.dispose();
      trample?.dispose();
      if (ownsWind) wind.dispose();
    },
  };
}
