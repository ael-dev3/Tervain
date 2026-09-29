import * as THREE from 'three';
import type { BuildContext, FrameContext, SceneModule } from './context';
import type { AssetNeed } from './assets/library';
import { Habitat } from './ground/habitat';
import { createGrassLayer } from './ground/grass';
import { createShared } from './ground/shared';

/** Assets this module wants loaded before the world is built. */
export const NEEDS: AssetNeed[] = [];

/** Ground cover: meadow grass, flowers, ferns, reeds, rocks and pebbles. Presentation only. */
export function buildGroundcover(ctx: BuildContext): SceneModule & { setDensity(scale: number): void; counts: { grass: number; reeds: number; rocks: number; triangles: number } } {
  const group = new THREE.Group();
  group.name = 'groundcover';
  const habitat = new Habitat(ctx);
  const shared = createShared();
  const grass = createGrassLayer(ctx, habitat, shared);
  group.add(grass.layer.group);
  const cam = new THREE.Vector3();
  return {
    group,
    counts: { grass: 0, reeds: 0, rocks: 0, triangles: 0 },
    setDensity() {},
    update(_dt: number, f: FrameContext) {
      f.camera.getWorldPosition(cam);
      shared.sun.set(f.sunDir.x, f.sunDir.y, f.sunDir.z, 1 - f.nightness);
      shared.pushers[0]!.set(f.focus.x, 0, f.focus.z, 1.1);
      grass.layer.update(cam);
    },
    stats: () => ({ grassInstances: grass.layer.visibleInstances, grassTris: grass.layer.visibleTriangles, grassDraws: grass.layer.drawCalls, grassTiles: grass.layer.activeTiles }),
    dispose() {
      grass.layer.dispose();
    },
  };
}
