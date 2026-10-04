import * as THREE from 'three';
import type { TerrainTextures } from './terrainTextures';

/**
 * The ground shader: a standard PBR material (so shadows, fog, image-based light and the sun all behave) whose albedo, normal
 * and roughness come from eight blended texture layers. Each vertex carries eight layer weights (two vec4) and a wetness value.
 *
 *  - Layers are blended along their own height, not cross-faded, so grass breaks up over earth and gravel sits in the hollows.
 *  - Every albedo tap is sampled twice at unrelated scales and rotations, and a large-scale colour drift is multiplied on top,
 *    so the tiling of the source textures cannot be seen.
 *  - Rock uses fixed world-axis triplanar projection so its grain does not stretch or swim on rounded cliffs.
 *  - Wetness is confined to physical splash/stream bands; damp stone remains coarse rather than polished.
 */

/** x: tiles per metre, y: normal strength, z: roughness, w: albedo gain. Order matches LAYERS. */
const LAYER_PARAMS: [number, number, number, number][] = [
  [1 / 2.4, 0.9, 0.98, 1.0], // grass
  [1 / 2.8, 0.9, 0.98, 1.05], // heath
  [1 / 2.2, 1.0, 0.95, 1.0], // earth
  [1 / 1.8, 1.3, 0.9, 1.0], // gravel
  [1 / 3.2, 0.8, 0.95, 1.05], // sand
  [1 / 3.2, 0.7, 0.4, 1.0], // wet sand
  [1 / 3.6, 1.0, 0.98, 1.0], // rock
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

// Fixed world planes keep the same fracture in one place as the cliff normal curves. No per-fragment moving tangent UVs.
vec4 tRockAlbedo(vec3 p, vec3 gx, vec3 gy, vec3 w, float repeat, bool turn) {
  vec4 a = vec4(0.0);
  for (int axis = 0; axis < 3; axis++) {
    if (w[axis] > 0.0) {
      vec2 uv = axis == 0 ? p.zy : axis == 1 ? p.xz : p.xy;
      vec2 dx = axis == 0 ? gx.zy : axis == 1 ? gx.xz : gx.xy;
      vec2 dy = axis == 0 ? gy.zy : axis == 1 ? gy.xz : gy.xy;
      if (turn) { uv = vec2(uv.y, -uv.x); dx = vec2(dx.y, -dx.x); dy = vec2(dy.y, -dy.x); }
      a += textureGrad(uAlb, vec3(uv * repeat + vec2(0.31, 0.17), 6.0), dx * repeat, dy * repeat) * w[axis];
    }
  }
  return a;
}

vec4 tRockRelief(vec3 p, vec3 gx, vec3 gy, vec3 w) {
  vec4 a = vec4(0.0);
  if (w.x > 0.0) {
    vec4 t = textureGrad(uNrm, vec3(p.zy + vec2(0.31, 0.17), 6.0), gx.zy, gy.zy);
    a += vec4(0.0, t.g * 2.0 - 1.0, t.r * 2.0 - 1.0, t.a) * w.x;
  }
  if (w.y > 0.0) {
    vec4 t = textureGrad(uNrm, vec3(p.xz + vec2(0.31, 0.17), 6.0), gx.xz, gy.xz);
    a += vec4(t.r * 2.0 - 1.0, 0.0, t.g * 2.0 - 1.0, t.a) * w.y;
  }
  if (w.z > 0.0) {
    vec4 t = textureGrad(uNrm, vec3(p.xy + vec2(0.31, 0.17), 6.0), gx.xy, gy.xy);
    a += vec4(t.r * 2.0 - 1.0, t.g * 2.0 - 1.0, 0.0, t.a) * w.z;
  }
  return a;
}
`;

const FRAG_ALBEDO = /* glsl */ `
vec2 tXZ = vWorldPos.xz;
vec3 tNg = normalize(vWorldNormal);
vec3 tTri = max(pow(abs(tNg), vec3(5.0)) - vec3(0.015), vec3(0.0));
tTri /= max(dot(tTri, vec3(1.0)), 1e-4);
vec3 tWorldGx = dFdx(vWorldPos), tWorldGy = dFdy(vWorldPos);
vec2 tGx = dFdx(tXZ);
vec2 tGy = dFdy(tXZ);
float tDetailMix = mix(0.12, 0.42, smoothstep(12.0, 55.0, length(vViewPosition)));
float tW[8];
tW[0] = vSplatA.x; tW[1] = vSplatA.y; tW[2] = vSplatA.z; tW[3] = vSplatA.w;
tW[4] = vSplatB.x; tW[5] = vSplatB.y; tW[6] = vSplatB.z; tW[7] = vSplatB.w;
float tScore[8];
vec3 tDnL[8];
float tRelief[8];
float tBest = -1.0;
for (int i = 0; i < 8; i++) {
  tScore[i] = -1.0;
  tDnL[i] = vec3(0.0);
  tRelief[i] = 0.5;
  if (tW[i] > 0.015) {
    float sc = uLayer[i].x;
    vec2 uv = tXZ * sc;
    vec4 t;
    if (i == 6) {
      t = tRockRelief(vWorldPos * sc, tWorldGx * sc, tWorldGy * sc, tTri);
      tDnL[i] = t.xyz;
    } else {
      t = textureGrad(uNrm, vec3(uv, float(i)), tGx * sc, tGy * sc);
      tDnL[i] = vec3(t.r * 2.0 - 1.0, 0.0, t.g * 2.0 - 1.0);
    }
    tRelief[i] = t.a;
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
vec3 tDn = vec3(0.0);
float tRough = 0.0;
float tHeight = 0.0;
float tStone = 0.0;
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
    vec3 a;
    if (i == 6) {
      vec3 p = vWorldPos * sc, dx = tWorldGx * sc, dy = tWorldGy * sc;
      a = mix(tRockAlbedo(p, dx, dy, tTri, 1.0, false).rgb, tRockAlbedo(p, dx, dy, tTri, 0.37, true).rgb, tDetailMix);
      vec3 macro = tRockAlbedo(p, dx, dy, tTri, 0.083, false).rgb;
      a *= 0.76 + 1.8 * dot(macro, vec3(0.333));
      // Metre-scale weathering and broken bedding survive mipmapping, without displacing the physical ground plane.
      float beds = tvn(vec2(vWorldPos.y * 0.64, dot(tXZ, vec2(0.13, 0.17)))) * 0.65
        + tvn(vec2(vWorldPos.y * 2.1, dot(tXZ, vec2(0.07, 0.1)))) * 0.35;
      a *= mix(0.77, 1.16, smoothstep(0.26, 0.72, beds));
      tStone += b;
    } else {
      vec3 a1 = textureGrad(uAlb, vec3(uv, float(i)), g1x, g1y).rgb;
      vec3 a2 = textureGrad(uAlb, vec3(uv2, float(i)), g2x, g2y).rgb;
      a = mix(a1, a2, tDetailMix);
    }
    if (i == 3) {
      // Shingle keeps large-scale structure too; it is still sampled on the physical ground plane.
      vec2 uv3 = vec2(uv.y, uv.x) * 0.083 + vec2(0.7, 0.2);
      vec3 a3 = textureGrad(uAlb, vec3(uv3, float(i)), g1x.yx * 0.083, g1y.yx * 0.083).rgb;
      a *= 0.6 + 2.4 * dot(a3, vec3(0.333));
      tStone += b * 0.6;
    }
    tAlb += a * (b * uLayer[i].w);
    tDn += tDnL[i] * (b * uLayer[i].y);
    tRough += b * uLayer[i].z;
    tHeight += b * tRelief[i];
  }
}
float tM = tvn(tXZ / 43.0) * 0.5 + tvn(tXZ / 12.7) * 0.32 + tvn(tXZ / 3.9) * 0.18;
tAlb *= mix(0.74, 1.24, tM);
tAlb *= mix(0.72, 1.18, tvn(tXZ / 131.0 + 3.0) * 0.6 + tvn(tXZ / 37.0 + 8.0) * 0.4);
tAlb *= mix(vec3(0.95, 1.0, 1.06), vec3(1.06, 1.0, 0.9), tvn(tXZ / 71.0 + 9.0));
float tWet = clamp(vWet, 0.0, 1.0);
tAlb *= mix(1.0, mix(0.5, 0.72, tStone), tWet);
// Damp sand may carry a sheen. Fractured stone only darkens and broadens its highlight: never a mirror-like wet wall.
tRough = mix(tRough, mix(0.32, 0.78, tStone), tWet);
tRough = clamp(tRough + tStone * (0.5 - tHeight) * 0.1, 0.32, 1.0);
diffuseColor.rgb = tAlb;
`;

const FRAG_NORMAL = /* glsl */ `
{
  float k = 1.0 - smoothstep(30.0, 150.0, length(vViewPosition));
  vec3 nw = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  // Each rock projection contributes relief along its own world plane, then remove the surface-normal component.
  vec3 relief = tDn - tNg * dot(tNg, tDn);
  nw = normalize(nw + relief * k);
  normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
}
`;

export function createTerrainMaterial(tex: TerrainTextures): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, envMapIntensity: 0.55 });
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
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= mix(0.8, 1.0, smoothstep(0.2, 0.8, tHeight));')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAG_NORMAL}`);
  };
  mat.customProgramCacheKey = () => 'tervain-terrain-v3-coarse-coastal-stone';
  return mat;
}
