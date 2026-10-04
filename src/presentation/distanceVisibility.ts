import * as THREE from 'three';

/** Full coverage through start, then a smooth, reversible fade to end. */
export function smoothDistanceFade(distance: number, start: number, end: number): number {
  const t = THREE.MathUtils.clamp((distance - start) / (end - start), 0, 1);
  return 1 - t * t * (3 - 2 * t);
}

/** A fixed pixel pattern, shared by both LODs and the depth/shadow passes.
 * No frame counter or randomness: standing still never sparkles. */
export const DISTANCE_DITHER_GLSL = /* glsl */ `
float tvDistanceNoise(vec2 pixel) {
  return fract(52.9829189 * fract(dot(floor(pixel), vec2(0.06711056, 0.00583715))));
}
`;

const patched = new WeakSet<THREE.Material>();
function installDistanceDither(material: THREE.Material): void {
  if (patched.has(material)) return;
  patched.add(material);
  const compile = material.onBeforeCompile;
  const programKey = material.customProgramCacheKey;
  material.onBeforeCompile = function(shader, renderer) {
    compile.call(this, shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      #ifdef USE_INSTANCING
        attribute vec2 aDistanceCoverage;
      #endif
      varying vec2 vDistanceCoverage;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vDistanceCoverage = aDistanceCoverage;
      #else
        vDistanceCoverage = vec2(0.0, 1.0);
      #endif`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vDistanceCoverage;
      ${DISTANCE_DITHER_GLSL}`)
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
      float tvCoverageSample = tvDistanceNoise(gl_FragCoord.xy);
      if (tvCoverageSample < vDistanceCoverage.x || tvCoverageSample >= vDistanceCoverage.y) discard;`);
  };
  material.customProgramCacheKey = function() { return `${programKey.call(this)}|tervain-distance-dither-v1`; };
  material.needsUpdate = true;
}

export interface InstanceDistanceVisibility {
  /** Keep samples in [x,y). Complementary LODs use [0,1-t) and [1-t,1). */
  coverage: THREE.InstancedBufferAttribute;
  /** Releases only the additional shadow materials; geometry/maps still belong to their original owner. */
  dispose(): void;
}

/** Opaque masked visibility, with matching shadow silhouettes. The batch geometry must
 * belong to this mesh; several batches must not overwrite the same instance attribute. */
export function attachInstanceDistanceVisibility(mesh: THREE.InstancedMesh): InstanceDistanceVisibility {
  const source = mesh.material as THREE.MeshStandardMaterial;
  if (Array.isArray(mesh.material)) throw new Error('Distance visibility requires a single material per batch.');
  const coverage = new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count * 2), 2).setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < coverage.count; i++) coverage.setXY(i, 0, 1);
  mesh.geometry.setAttribute('aDistanceCoverage', coverage);
  installDistanceDither(source);
  const masked = { map: source.map, alphaMap: source.alphaMap, alphaTest: source.alphaTest, side: source.side,
    displacementMap: source.displacementMap, displacementScale: source.displacementScale, displacementBias: source.displacementBias };
  const depth = new THREE.MeshDepthMaterial({ ...masked, depthPacking: THREE.RGBADepthPacking });
  const distance = new THREE.MeshDistanceMaterial(masked);
  installDistanceDither(depth); installDistanceDither(distance);
  mesh.customDepthMaterial = depth;
  mesh.customDistanceMaterial = distance;
  let disposed = false;
  return { coverage, dispose() {
    if (disposed) return;
    disposed = true;
    depth.dispose(); distance.dispose();
  } };
}
