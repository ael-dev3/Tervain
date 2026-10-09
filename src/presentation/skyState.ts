import * as THREE from 'three';

/**
 * Sky and light state shared by the sky dome, the generated environment map, the terrain, the far mountains and
 * the water. SkyRig writes it every frame; every consumer holds the same uniform objects by reference, so no
 * per-frame wiring is needed. There is exactly one world at a time, so a module-level object is sufficient.
 * All colours are linear. Directions are world space.
 */
/** The renderer's pixel ratio (quality-capped), for point sprites sized in pixels; set by the app on resize (A70). */
export const RENDER_PX = { value: 1 };

/** Whether the GPU can draw into half-float targets; set by the app once the renderer exists. Without it the water ripples
 *  and grass trails rest, and the sky capture falls back to bytes (A70). */
export const GPU = { halfTargets: true };

export const SKY = {
  /** Sky colour straight up, and at the horizon (the horizon colour equals the fog colour). */
  top: { value: new THREE.Color(0x4c8fe0) },
  horizon: { value: new THREE.Color(0xbad6ea) },
  /** Sun direction, sun light colour (already scaled by intensity in `sunLight`) and 0..1 intensity. */
  sunDir: { value: new THREE.Vector3(0, 1, 0) },
  sunColor: { value: new THREE.Color(0xfff6e2) },
  sunI: { value: 1 },
  moonDir: { value: new THREE.Vector3(0, -1, 0) },
  /** 0 by day, 1 in the dead of night. */
  night: { value: 0 },
  /** Ambient sky light as a colour (hemisphere sky colour times its intensity), for surfaces that fake their own lighting. */
  ambient: { value: new THREE.Color(0x888888) },
  /** Seconds, advanced by the world; cloud and water animation share it. */
  time: { value: 0 },
  /** Cloud coverage 0..1 (drives the dome shader and the environment map brightness). */
  cover: { value: 0.5 },
  /** Ground bounce colour below the horizon (linear), for the environment map and reflections. */
  ground: { value: new THREE.Color(0x6a6a48) },
  /** The player brightness setting (1 = default); lifts fill at night. */
  brightness: { value: 1 },
  /** 1 once the generated environment map is lighting the scene, so the direct hemisphere fill can be reduced. */
  ibl: { value: 0 },
};

/** Water flow state shared by the water shaders and the terrain wetness: spring, main, village, quarry (eased, 0..1). */
export const FLOWS = { value: new THREE.Vector4(0.3, 0.3, 0.1, 0.3) };
