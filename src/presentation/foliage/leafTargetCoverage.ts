import * as THREE from 'three';

const defaultSamples = new WeakMap<THREE.WebGLRenderer, boolean>();

/** Keep the coverage shader, but use its cutout fallback when a capture has no MSAA samples. */
export function installLeafTargetCoverage(material: THREE.Material): THREE.IUniform<number> | null {
  if (!material.alphaToCoverage) return null;
  const enabled = { value: 1 };
  const compile = material.onBeforeCompile;
  const render = material.onBeforeRender;
  const key = material.customProgramCacheKey;
  material.onBeforeCompile = function(shader, renderer) {
    compile.call(this, shader, renderer);
    shader.uniforms.uFoliageMsaa = enabled;
    const opaque = !this.transparent && this.blending === THREE.NormalBlending;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      `#include <common>\nuniform float uFoliageMsaa;\n${opaque ? '#define TV_FOLIAGE_OPAQUE\n' : ''}`);
  };
  material.onBeforeRender = function(renderer, ...args) {
    render.call(this, renderer, ...args);
    const target = renderer.getRenderTarget();
    if (target) enabled.value = target.samples > 0 ? 1 : 0;
    else {
      let sampled = defaultSamples.get(renderer);
      if (sampled === undefined) {
        sampled = renderer.getContext().getContextAttributes()?.antialias === true;
        defaultSamples.set(renderer, sampled);
      }
      enabled.value = sampled ? 1 : 0;
    }
  };
  material.customProgramCacheKey = function() {
    return `${key.call(this)}|leaf-target-coverage-v1-${!this.transparent && this.blending === THREE.NormalBlending ? 'opaque' : 'blend'}`;
  };
  return enabled;
}
