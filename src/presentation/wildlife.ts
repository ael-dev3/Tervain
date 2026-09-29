import * as THREE from 'three';
import type { BuildContext, FrameContext, SceneModule } from './context';
import type { AssetNeed } from './assets/library';

/** Assets this module wants loaded before the world is built. */
export const NEEDS: AssetNeed[] = [];

/** Ambient life: birds, insects, small animals, smoke and drifting particles. Presentation only. */
export function buildWildlife(_ctx: BuildContext): SceneModule {
  const group = new THREE.Group();
  return {
    group,
    update(_dt: number, _f: FrameContext) {},
  };
}
