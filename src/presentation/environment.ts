import type * as THREE from 'three';
import type { FrameContext } from './context';
import type { Quality } from './context';

export interface EnvironmentHandle {
  update(dt: number, f: FrameContext): void;
  dispose?(): void;
}

/**
 * Scene-wide lighting environment (image-based lighting, exposure, post effects). Presentation only.
 * The stub keeps the direct lights; the real module supplies a generated sky environment map.
 */
export function buildEnvironment(_scene: THREE.Scene, _quality: Quality): EnvironmentHandle {
  return { update() {} };
}
