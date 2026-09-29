import * as THREE from 'three';
import type { TerrainTextures } from './terrainTextures';

/**
 * The ground shader: a standard PBR material (so shadows, fog, image-based light and the sun all behave) whose albedo, normal
 * and roughness come from eight blended texture layers. Each vertex carries eight layer weights (two vec4) and a wetness value.
 *
 *  - Layers are blended along their own height, not cross-faded, so grass breaks up over earth and gravel sits in the hollows.
 *  - Every albedo tap is sampled twice at unrelated scales and rotations, and a large-scale colour drift is multiplied on top,
 *    so the tiling of the source textures cannot be seen.
 *  - Rock is projected along the face on steep slopes so cliffs are not stretched.
 *  - Wet ground is darker and glossier.
 */

/** x: tiles per metre, y: normal strength, z: roughness, w: albedo gain. Order matches LAYERS. */
const LAYER_PARAMS: [number, number, number, number][] = [
  [1 / 2.4, 0.9, 0.98, 1.0], // grass
  [1 / 2.8, 0.9, 0.98, 1.05], // heath
  [1 / 2.2, 1.0, 0.95, 1.0], // earth
  [1 / 1.8, 1.3, 0.9, 1.0], // gravel
  [1 / 3.2, 0.8, 0.95, 1.05], // sand
  [1 / 3.2, 0.7, 0.4, 1.0], // wet sand
  [1 / 3.6, 0.85, 0.93, 1.0], // rock
  [1 / 2.0, 1.1, 0.96, 1.0], // path
];

const VERT_DECL = /* glsl */ `
attribute vec4 aSplatA;
attribute vec4 aSplatB;
attribute float aWet;
varying vec4 vSplatA;
varying vec4 vSplatB;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vWet;
`;

const VERT_BODY = /* glsl */ `
vSplatA = aSplatA;
vSplatB = aSplatB;
vWorldPos = position;
vWorldNormal = normal;
vWet = aWet;
`;

const FRAG_DECL = /* glsl */ `
uniform sampler2DArray uAlb;
uniform sampler2DArray uNrm;
uniform vec4 uLayer[8];
varying vec4 vSplatA;
varying vec4 vSplatB;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vWet;

float th21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float tvn(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(th21(i), th21(i + vec2(1.0, 0.0)), f.x), mix(th21(i + vec2(0.0, 1.0)), th21(i + vec2(1.0, 1.0)), f.x), f.y);
}
`;

const FRAG_ALBEDO = /* glsl */ `
vec2 tXZ = vWorldPos.xz;
vec3 tNg = normalize(vWorldNormal);
float tSide = smoothstep(0.45, 0.8, 1.0 - tNg.y);
vec2 tTan = normalize(vec2(-tNg.z, tNg.x) + vec2(1e-4));
vec2 tGx = dFdx(tXZ);
vec2 tGy = dFdy(tXZ);
float tW[8];
tW[0] = vSplatA.x; tW[1] = vSplatA.y; tW[2] = vSplatA.z; tW[3] = vSplatA.w;
tW[4] = vSplatB.x; tW[5] = vSplatB.y; tW[6] = vSplatB.z; tW[7] = vSplatB.w;
float tScore[8];
vec2 tDnL[8];
float tBest = -1.0;
for (int i = 0; i < 8; i++) {
  tScore[i] = -1.0;
  tDnL[i] = vec2(0.0);
  if (tW[i] > 0.015) {
    float sc = uLayer[i].x;
    vec2 uv = tXZ * sc;
    vec4 t = textureGrad(uNrm, vec3(uv, float(i)), tGx * sc, tGy * sc);
    if (i == 6 && tSide > 0.02) {
      vec2 uvS = vec2(dot(tXZ, tTan), vWorldPos.y) * sc;
      vec4 ts = textureGrad(uNrm, vec3(uvS, float(i)), tGx * sc, tGy * sc);
      t = mix(t, ts, tSide);
    }
    tDnL[i] = t.rg * 2.0 - 1.0;
    tScore[i] = tW[i] + (t.a - 0.5) * 0.42 * min(1.0, tW[i] * 4.0);
    tBest = max(tBest, tScore[i]);
  }
}
float tBw[8];
float tSum = 0.0;
for (int i = 0; i < 8; i++) {
  tBw[i] = tScore[i] > -0.5 ? max(tScore[i] - tBest + 0.2, 0.0) : 0.0;
  tSum += tBw[i];
}
tSum = max(tSum, 1e-4);
vec3 tAlb = vec3(0.0);
vec2 tDn = vec2(0.0);
float tRough = 0.0;
for (int i = 0; i < 8; i++) {
  if (tBw[i] > 0.0) {
    float b = tBw[i] / tSum;
    float sc = uLayer[i].x;
    vec2 uv = tXZ * sc;
    vec2 uv2 = vec2(uv.y, -uv.x) * 0.37 + vec2(0.31, 0.17);
    vec2 g1x = tGx * sc;
    vec2 g1y = tGy * sc;
    vec2 g2x = vec2(g1x.y, -g1x.x) * 0.37;
    vec2 g2y = vec2(g1y.y, -g1y.x) * 0.37;
    vec3 a1 = textureGrad(uAlb, vec3(uv, float(i)), g1x, g1y).rgb;
    vec3 a2 = textureGrad(uAlb, vec3(uv2, float(i)), g2x, g2y).rgb;
    vec3 a = mix(a1, a2, 0.42);
    if (i == 6 && tSide > 0.02) {
      // Steep rock: the same two taps projected along the face, blended with the top view, so cliffs are not stretched.
      vec2 uvS = vec2(dot(tXZ, tTan), vWorldPos.y) * sc;
      vec2 uvS2 = vec2(uvS.y, -uvS.x) * 0.37 + vec2(0.31, 0.17);
      vec3 s1 = textureGrad(uAlb, vec3(uvS, float(i)), g1x, g1y).rgb;
      vec3 s2 = textureGrad(uAlb, vec3(uvS2, float(i)), g2x, g2y).rgb;
      a = mix(a, mix(s1, s2, 0.42), tSide);
    }
    if (i == 6 || i == 3) {
      // Large-scale variation for rock and shingle, so distant slopes keep some structure instead of averaging to flat grey.
      vec2 uv3 = vec2(uv.y, uv.x) * 0.083 + vec2(0.7, 0.2);
      if (i == 6) uv3 = mix(uv3, vec2(dot(tXZ, tTan), vWorldPos.y) * sc * 0.083 + vec2(0.7, 0.2), tSide);
      vec3 a3 = textureGrad(uAlb, vec3(uv3, float(i)), g1x.yx * 0.083, g1y.yx * 0.083).rgb;
      a *= 0.6 + 2.4 * dot(a3, vec3(0.333));
    }
    tAlb += a * (b * uLayer[i].w);
    tDn += tDnL[i] * (b * uLayer[i].y);
    tRough += b * uLayer[i].z;
  }
}
float tM = tvn(tXZ / 43.0) * 0.5 + tvn(tXZ / 12.7) * 0.32 + tvn(tXZ / 3.9) * 0.18;
tAlb *= mix(0.74, 1.24, tM);
tAlb *= mix(0.72, 1.18, tvn(tXZ / 131.0 + 3.0) * 0.6 + tvn(tXZ / 37.0 + 8.0) * 0.4);
tAlb *= mix(vec3(0.95, 1.0, 1.06), vec3(1.06, 1.0, 0.9), tvn(tXZ / 71.0 + 9.0));
float tWet = clamp(vWet, 0.0, 1.0);
tAlb *= mix(1.0, 0.5, tWet);
tRough = mix(tRough, 0.28, tWet);
diffuseColor.rgb = tAlb;
`;

const FRAG_NORMAL = /* glsl */ `
{
  float k = 1.0 - smoothstep(30.0, 150.0, length(vViewPosition));
  vec3 nw = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  nw = normalize(nw + vec3(tDn.x, 0.0, tDn.y) * k);
  normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
}
`;

export function createTerrainMaterial(tex: TerrainTextures): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, envMapIntensity: 0.85 });
  const layer = LAYER_PARAMS.map((p) => new THREE.Vector4(...p));
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAlb = { value: tex.albedo };
    shader.uniforms.uNrm = { value: tex.normal };
    shader.uniforms.uLayer = { value: layer };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${VERT_DECL}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_DECL}`)
      .replace('#include <map_fragment>', FRAG_ALBEDO)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = tRough;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAG_NORMAL}`);
  };
  mat.customProgramCacheKey = () => 'tervain-terrain-v1';
  return mat;
}
