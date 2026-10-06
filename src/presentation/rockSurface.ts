import * as THREE from 'three';
import { WORLD } from '../world/layout';
import type { Terrain } from '../world/terrain';

/** Join dry mineral faces to their real ground with buried soil, weathered bedding
 * and moss on sheltered shelves. Source UV art and the exact visible/supporting
 * triangles remain authoritative; this changes no vertex position or normal basis. */
export function attachGroundedRockSurface(material: THREE.MeshStandardMaterial, terrain: Terrain): void {
  const height = new THREE.DataTexture(terrain.heights, terrain.nx + 1, terrain.nz + 1, THREE.RedFormat, THREE.FloatType);
  height.colorSpace = THREE.NoColorSpace;
  height.minFilter = height.magFilter = THREE.NearestFilter;
  height.generateMipmaps = false; height.needsUpdate = true;
  const previous = material.onBeforeCompile, cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.uRockGround = { value: height };
    shader.uniforms.uRockGrid = { value: new THREE.Vector3(WORLD.minX, WORLD.minZ, WORLD.cell) };
    shader.uniforms.uRockGridSize = { value: new THREE.Vector2(terrain.nx + 1, terrain.nz + 1) };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vRockWorld;\nvarying float vRockUp;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
vec4 rockWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  rockWorld = instanceMatrix * rockWorld;
#endif
vRockWorld = (modelMatrix * rockWorld).xyz;
vRockUp = max(0.0, inverseTransformDirection(transformedNormal, viewMatrix).y);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D uRockGround;
uniform vec3 uRockGrid;
uniform vec2 uRockGridSize;
varying vec3 vRockWorld;
varying float vRockUp;
float rockHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float rockNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(rockHash(i), rockHash(i + vec2(1.0, 0.0)), f.x), mix(rockHash(i + vec2(0.0, 1.0)), rockHash(i + 1.0), f.x), f.y);
}
float rockGroundHeight(vec2 world) {
  vec2 coordinate = clamp((world - uRockGrid.xy) / uRockGrid.z, vec2(0.0), uRockGridSize - vec2(1.0));
  vec2 cell = min(floor(coordinate), uRockGridSize - vec2(2.0)), f = coordinate - cell;
  vec2 uv = (cell + 0.5) / uRockGridSize, texel = 1.0 / uRockGridSize;
  float a = texture2D(uRockGround, uv).r, b = texture2D(uRockGround, uv + vec2(texel.x, 0.0)).r;
  float c = texture2D(uRockGround, uv + vec2(0.0, texel.y)).r, d = texture2D(uRockGround, uv + texel).r;
  return f.x + f.y <= 1.0 ? a + f.x * (b - a) + f.y * (c - a) : d + (1.0 - f.x) * (c - d) + (1.0 - f.y) * (b - d);
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
float rockHeight = max(0.0, vRockWorld.y - rockGroundHeight(vRockWorld.xz));
float rockGrain = rockNoise(vRockWorld.xz * 2.3 + vRockWorld.y * vec2(1.1, -0.8));
float rockBeds = rockNoise(vec2(vRockWorld.y * 1.2, dot(vRockWorld.xz, vec2(0.16, 0.22))));
float rockFoot = (1.0 - smoothstep(0.1, 0.8 + rockGrain * 0.35, rockHeight));
float rockMoss = smoothstep(0.52, 0.82, rockNoise(vRockWorld.xz * 0.9 + 4.0))
  * smoothstep(0.28, 0.8, vRockUp) * (0.3 + rockFoot * 0.7);
// Mineral strata are broad painted groups, not black seams over every polygon.
diffuseColor.rgb *= mix(0.9, 1.065, smoothstep(0.18, 0.82, rockBeds));
diffuseColor.rgb *= mix(vec3(1.0), vec3(0.78, 0.81, 0.72), rockFoot * (0.55 + rockGrain * 0.45));
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.79, 0.9, 0.63), rockMoss * 0.58);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, 0.92);`);
  };
  material.customProgramCacheKey = () => `${cacheKey()}-grounded-mineral-v1`;
  // This material owns its GPU view of the world's height buffer, never the terrain
  // itself. Material disposal is also used by generic world cleanup and happens once.
  let released = false;
  material.addEventListener('dispose', () => { if (!released) { released = true; height.dispose(); } });
  material.needsUpdate = true;
}
