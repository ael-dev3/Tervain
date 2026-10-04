import type * as THREE from 'three';
import type { Settings } from '../platform/settings';
import type { WorldView } from '../game/worldView';
import type { Colliders } from '../world/colliders';
import type { Terrain } from '../world/terrain';
import type { AssetLibrary } from './assets/library';
import type { Exclusions, SwayUniforms } from './vegetation';

export type Quality = 'low' | 'medium' | 'high';

/** Everything a scene module needs to build itself. Modules add colliders and read the terrain; they never touch game state. */
export interface BuildContext {
  terrain: Terrain;
  colliders: Colliders;
  library: AssetLibrary;
  quality: Quality;
  settings: Settings;
  /** Shared wind uniforms for the procedural foliage materials. */
  sway: SwayUniforms;
  /** Keeps foliage and props out of paths, water, doorways and interaction points. */
  excl: Exclusions;
}

/** Per-frame inputs shared by every scene module. */
export interface FrameContext {
  /** Seconds since the world was built (advances with real time). */
  time: number;
  camera: THREE.Camera;
  /** The player's position, or the title-screen focus point. */
  focus: THREE.Vector3;
  /** 0 by day, 1 in the dead of night. */
  nightness: number;
  sunDir: THREE.Vector3;
  /** Actual snapped sun-shadow camera volume; absent/null when shadows are disabled. */
  shadowFrustum?: THREE.Frustum | null;
  reducedMotion: boolean;
  /** Game hour, 0..24. */
  hour: number;
  view: WorldView;
  quality: Quality;
}

/** The common shape of a scene module. */
export interface SceneModule {
  group: THREE.Group;
  update(dt: number, f: FrameContext): void;
  /** Counters for the debug panel. */
  stats?(): Record<string, number>;
  dispose?(): void;
}
