import * as THREE from 'three';

/** Full coverage through start, then a smooth, reversible fade to end. */
export function smoothDistanceFade(distance: number, start: number, end: number): number {
  const t = THREE.MathUtils.clamp((distance - start) / (end - start), 0, 1);
  return 1 - t * t * (3 - 2 * t);
}

/** World-oriented cells about one pixel across. Colour LODs supply a common per-tree ray reference, rather than
 * unrelated surface points; shadow passes retain their snapped pixel pattern. Between two sizes each coarse cell
 * chooses its own split threshold, avoiding a whole-pattern change at a mip boundary. No frame counter or randomness. */
export const DISTANCE_DITHER_GLSL = /* glsl */ `
float tvCellHash(vec3 cell, float seed) {
  // Interleaved gradient noise over the cell lattice, wrapped to keep float precision at any world coordinate.
  vec3 c = mod(cell, 289.0) + seed;
  return fract(52.9829189 * fract(dot(c, vec3(0.06711056, 0.00583715, 0.03798128)) + 0.0137 * c.z));
}
float tvDistanceNoiseAtFootprint(vec3 world, float px) {
  float level = log2(px);
  float fine = floor(level);
  float coarseCell = exp2(fine + 1.0), fineCell = exp2(fine);
  // Each coarse cell turns fine once the footprint has shrunk far enough toward the fine size.
  bool useFine = tvCellHash(floor(world / coarseCell), 17.31) >= level - fine;
  return useFine ? tvCellHash(floor(world / fineCell), fine * 3.7) : tvCellHash(floor(world / coarseCell), fine * 3.7 + 3.7);
}
float tvDistanceNoise(vec3 world) {
  return tvDistanceNoiseAtFootprint(world, max(max(length(dFdx(world)), length(dFdy(world))), 1e-4));
}
`;

/** A pixel's ray projected onto a shared, world-oriented sphere about the camera. Both LODs use the
 * same radius supplied per tree, so the mask is independent of their surface depths and normals.
 * Raster coordinates avoid geometry-dependent interpolation rounding. No extra vertex matrix work. */
export const DISTANCE_REFERENCE_GLSL = /* glsl */ `
vec4 tvDistanceReference(float radius) {
  vec3 point = cameraPosition + (normalize(-vViewPosition) * mat3(viewMatrix)) * radius;
  return vec4(point, max(max(length(dFdx(point)), length(dFdy(point))), 1e-4));
}
`;

const patched = new WeakSet<THREE.Material>();
function installDistanceDither(material: THREE.Material): void {
  if (patched.has(material)) return;
  patched.add(material);
  const compile = material.onBeforeCompile;
  const programKey = material.customProgramCacheKey;
  const colour = (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
  const viewport = { value: new THREE.Vector4() };
  if (colour) {
    const render = material.onBeforeRender;
    material.onBeforeRender = function(renderer, scene, camera, geometry, object, group) {
      render.call(this, renderer, scene, camera, geometry, object, group);
      // A CPU state copy, not a GL readback. It follows captures, subviews and nested renders.
      renderer.getCurrentViewport(viewport.value);
    };
  }
  material.onBeforeCompile = function(shader, renderer) {
    compile.call(this, shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      #ifdef USE_INSTANCING
        attribute vec3 aDistanceCoverage;
      #endif
      flat varying vec3 vDistanceCoverage;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vDistanceCoverage = aDistanceCoverage;
      #else
        vDistanceCoverage = vec3(0.0, 1.0, 0.0);
      #endif`);
    const partial = 'vDistanceCoverage.x > 0.0 || vDistanceCoverage.y < 1.0';
    if (colour) shader.uniforms.uDistanceViewport = viewport;
    // Shared ray coordinates have an analytic pixel footprint: cut-outs can reject transparent texels first,
    // without divergent derivatives or values kept live across the leaf shader's alpha calculation.
    const sample = colour ? `float tvCoverageSample;
        if (vDistanceCoverage.z > 0.0) {
          vec4 tvReference = tvDistanceReference(vDistanceCoverage.z);
          tvCoverageSample = tvDistanceNoiseAtFootprint(tvReference.xyz, tvReference.w);
        } else {
          tvCoverageSample = tvDistanceNoise((-vViewPosition - viewMatrix[3].xyz) * mat3(viewMatrix));
        }` : 'float tvCoverageSample = tvCellHash(vec3(gl_FragCoord.xy, 0.0), 0.0);';
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      flat varying vec3 vDistanceCoverage;
      ${DISTANCE_DITHER_GLSL}
      ${colour ? DISTANCE_REFERENCE_GLSL : ''}`)
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
      #ifndef TV_LEAF_SHADE_ONLY
      if (${partial}) {
        ${sample}
        if (tvCoverageSample < vDistanceCoverage.x || tvCoverageSample >= vDistanceCoverage.y) discard;
      }
      #endif`);
  };
  material.customProgramCacheKey = function() { return `${programKey.call(this)}|private-viewray-pilot`; };
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
  /** Keep samples in [x,y); z is the common camera-to-tree radius, or 0 for ordinary surface anchoring. */
  coverage: THREE.InstancedBufferAttribute;
  /** Releases only the additional shadow materials; geometry/maps still belong to their original owner. */
  dispose(): void;
}

/** Opaque masked visibility, with matching shadow silhouettes. The batch geometry must
 * belong to this mesh; several batches must not overwrite the same instance attribute. */
export function attachInstanceDistanceVisibility(mesh: THREE.InstancedMesh): InstanceDistanceVisibility {
  const source = mesh.material as THREE.MeshStandardMaterial;
  if (Array.isArray(mesh.material)) throw new Error('Distance visibility requires a single material per batch.');
  const coverage = new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count * 3), 3).setUsage(THREE.DynamicDrawUsage);
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
