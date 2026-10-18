import type * as THREE from 'three';

type ShadowShader = Pick<Parameters<THREE.Material['onBeforeCompile']>[0], 'uniforms' | 'vertexShader'>;
type ShadowChunks = Pick<typeof THREE.ShaderChunk, 'shadowmap_pars_vertex' | 'shadowmap_vertex'>;
const declaration = 'uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];';
const projection = 'directionalShadowMatrix[ i ] * shadowWorldPosition';

/**
 * Three always uploads matrix arrays, even when their contents are unchanged. The usual single directional shadow
 * needs only one matrix: expose it to Three's cached single-matrix setter, with the same GPU words and multiplication.
 * Keep the original array path for zero/multiple shadows. Forward renderer assignments to the original uniform record;
 * do not cache by matrix identity, since the light mutates its elements in place.
 */
export function cacheSingleDirectionalShadowMatrix(shader: ShadowShader, chunks: ShadowChunks): boolean {
  const source = shader.uniforms.directionalShadowMatrix;
  if (!source || !shader.vertexShader.includes('#include <shadowmap_pars_vertex>') ||
      !shader.vertexShader.includes('#include <shadowmap_vertex>') ||
      !chunks.shadowmap_pars_vertex.includes(declaration) || !chunks.shadowmap_vertex.includes(projection)) return false;

  shader.vertexShader = shader.vertexShader
    .replace('#include <shadowmap_pars_vertex>', chunks.shadowmap_pars_vertex.replace(declaration, `
#if NUM_DIR_LIGHT_SHADOWS == 1
uniform mat4 directionalShadowMatrix;
#else
${declaration}
#endif
`))
    .replace('#include <shadowmap_vertex>', chunks.shadowmap_vertex.replace(projection, `
#if NUM_DIR_LIGHT_SHADOWS == 1
directionalShadowMatrix * shadowWorldPosition
#else
${projection}
#endif
`));
  shader.uniforms.directionalShadowMatrix = {
    ...source,
    get value() {
      const value: unknown = source.value;
      return Array.isArray(value) && value.length === 1 ? value[0] : value;
    },
    set value(value: unknown) { source.value = value; },
  };
  return true;
}
