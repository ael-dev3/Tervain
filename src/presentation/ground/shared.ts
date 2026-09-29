import * as THREE from 'three';
import { createPushers } from './patchMaterial';

/** State shared by every streamed ground-cover layer: things that bend the plants, and the sun. */
export interface PatchShared {
  pushers: THREE.Vector4[];
  sun: THREE.Vector4;
}

export function createShared(): PatchShared {
  return { pushers: createPushers(), sun: new THREE.Vector4(0.3, 0.8, 0.2, 1) };
}
