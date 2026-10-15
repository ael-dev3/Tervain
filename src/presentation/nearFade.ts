import * as THREE from 'three';

/**
 * Near fade of the hero (playtest 7): when obstacles pull the follow camera in against him, the lens must never end up
 * inside his mesh and show its hollow inside (an arm or shoulder from within). His body dithers out on a fixed pixel
 * pattern as the camera comes within reach of it, rather than vanishing only once the boom is shorter than 0.85 m.
 */

/** Distance from the body's axis (m) at which the fade begins (fully drawn beyond) and where he is wholly gone. */
export const NEAR_FADE = { start: 1.25, end: 0.7, feet: 0.15, head: 1.85 } as const;

/** Coverage of the hero (1 drawn, 0 gone) for a camera at `eye`, from its distance to the body's vertical axis. */
export function heroNearCoverage(eye: { x: number; y: number; z: number }, feet: { x: number; y: number; z: number }): number {
  const y = THREE.MathUtils.clamp(eye.y, feet.y + NEAR_FADE.feet, feet.y + NEAR_FADE.head);
  const d = Math.hypot(eye.x - feet.x, eye.y - y, eye.z - feet.z);
  const t = THREE.MathUtils.clamp((d - NEAR_FADE.end) / (NEAR_FADE.start - NEAR_FADE.end), 0, 1);
  return t * t * (3 - 2 * t);
}

/** One coverage value shared by every material of the faded group. */
export class NearFade {
  readonly uniform = { value: 1 };
  private readonly patched = new WeakSet<THREE.Material>();

  /** Set the group's coverage, patching any material it shows that is not yet patched (equipment can change). */
  apply(group: THREE.Object3D, coverage: number) {
    this.uniform.value = coverage;
    group.visible = coverage > 0.02;
    // Patched while still fully drawn too, so the program is compiled before the first close approach needs it.
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (Array.isArray(mesh.material)) for (const material of mesh.material) this.patch(material);
      else this.patch(mesh.material);
    });
  }

  /** Patch every material under `object` without changing coverage or visibility. Gear that leaves the hero (a loosed
   * arrow) shares his patched programs this way, so its first draw links nothing new; its own fade stays at 1. */
  patchAll(object: THREE.Object3D) {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (Array.isArray(mesh.material)) for (const material of mesh.material) this.patch(material);
      else this.patch(mesh.material);
    });
  }

  private patch(material: THREE.Material) {
    if (this.patched.has(material)) return;
    this.patched.add(material);
    const uniform = this.uniform;
    const compile = material.onBeforeCompile;
    const programKey = material.customProgramCacheKey;
    material.onBeforeCompile = function(shader, renderer) {
      compile.call(this, shader, renderer);
      if (!shader.fragmentShader.includes('#include <alphatest_fragment>')) return;
      shader.uniforms.uNearCoverage = uniform;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uNearCoverage;
          #ifndef TV_NEAR_NOISE
          #define TV_NEAR_NOISE
          // The trees' distance-dither pattern: fixed per pixel, so standing still never sparkles.
          float tvNearNoise(vec2 pixel) { return fract(52.9829189 * fract(dot(floor(pixel), vec2(0.06711056, 0.00583715)))); }
          #endif`)
        .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
          if (uNearCoverage < 1.0 && tvNearNoise(gl_FragCoord.xy) >= uNearCoverage) discard;`);
    };
    material.customProgramCacheKey = function() { return `${programKey.call(this)}|tervain-near-fade-v1`; };
    material.needsUpdate = true;
  }
}
