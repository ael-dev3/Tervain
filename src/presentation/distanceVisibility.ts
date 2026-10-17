import * as THREE from 'three';

/** Full coverage through start, then a smooth, reversible fade to end. */
export function smoothDistanceFade(distance: number, start: number, end: number): number {
  const t = THREE.MathUtils.clamp((distance - start) / (end - start), 0, 1);
  return 1 - t * t * (3 - 2 * t);
}

/** B11: a pattern fixed to the world, not the screen, shared by both LODs and the depth/shadow passes. Cells are
 * cubes about one pixel across (the power of two nearest the pixel's footprint); between two sizes each coarse cell
 * picks its own size by a second stable hash, so moving nearer splits cells one at a time instead of re-rolling the
 * whole pattern. Walking past a fade no longer drags a screen-fixed sieve across the object, and standing still never
 * sparkles: no frame counter, no randomness. */
export const DISTANCE_DITHER_GLSL = /* glsl */ `
float tvCellHash(vec3 cell, float seed) {
  // Interleaved gradient noise over the cell lattice, wrapped to keep float precision at any world coordinate.
  vec3 c = mod(cell, 289.0) + seed;
  return fract(52.9829189 * fract(dot(c, vec3(0.06711056, 0.00583715, 0.03798128)) + 0.0137 * c.z));
}
float tvDistanceNoise(vec3 world) {
  float px = max(max(length(dFdx(world)), length(dFdy(world))), 1e-4);
  float level = log2(px);
  float fine = floor(level);
  float coarseCell = exp2(fine + 1.0), fineCell = exp2(fine);
  // Each coarse cell turns fine once the footprint has shrunk far enough toward the fine size.
  bool useFine = tvCellHash(floor(world / coarseCell), 17.31) >= level - fine;
  return useFine ? tvCellHash(floor(world / fineCell), fine * 3.7) : tvCellHash(floor(world / coarseCell), fine * 3.7 + 3.7);
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
    // Colour passes recover the world position from the view position three already passes (no extra varying: the
    // foliage programs are near the varying limit). Depth and shadow passes have none and draw in the shadow map, whose
    // texels are snapped to the world, so they keep its pixel grid.
    const world = (material as THREE.MeshStandardMaterial).isMeshStandardMaterial
      ? 'tvDistanceNoise((-vViewPosition - viewMatrix[3].xyz) * mat3(viewMatrix))'
      : 'tvCellHash(vec3(gl_FragCoord.xy, 0.0), 0.0)';
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vDistanceCoverage;
      ${DISTANCE_DITHER_GLSL}`)
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
      float tvCoverageSample = ${world};
      #ifndef TV_LEAF_SHADE_ONLY
      if (tvCoverageSample < vDistanceCoverage.x || tvCoverageSample >= vDistanceCoverage.y) discard;
      #endif`);
  };
  material.customProgramCacheKey = function() { return `${programKey.call(this)}|tervain-distance-dither-v2-world`; };
  material.needsUpdate = true;
}

/** Dithered coverage for a shadow-only caster: its own instance interval, read by its depth material in the
 * shadow map's own pixels (texel-snapped with the sun's volume, so the pattern holds still on the ground). */
export function attachCasterCoverage(mesh: THREE.InstancedMesh, depth: THREE.Material): THREE.InstancedBufferAttribute {
  const coverage = new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count * 2), 2).setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < coverage.count; i++) coverage.setXY(i, 0, 1);
  mesh.geometry.setAttribute('aDistanceCoverage', coverage);
  installDistanceDither(depth);
  return coverage;
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

/**
 * Where the far grass thins out (start, end of its distance fade, m). The ground shader takes over the grass's
 * colour across this band, so the meadow never ends at a line: blades thin into ground of their own colour.
 * Set by the grass field for its quality; with no grass the band lies out of reach.
 */
export const GRASS_FAR_RANGE: { value: THREE.Vector2 } = { value: new THREE.Vector2(1e5, 1e5 + 1) };
