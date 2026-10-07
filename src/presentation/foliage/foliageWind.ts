import * as THREE from 'three';
import { GUST_SPAN, TURBULENCE_SPAN, type GrassWind } from '../grass/wind';
import type { GrassTrampleUniforms } from '../grass/trample';

/**
 * Wind in the trees: the same wind that crosses the grass (grass/wind.ts), so a gust front seen rolling over a meadow
 * moves on into the woods and leans the crowns as it passes.
 *
 * A tree answers in three layers, each computed from where a vertex sits relative to the tree's own root, so it needs
 * no per-vertex data and works for every supplied model unchanged:
 *
 *  - the trunk bends downwind with the steady push and each passing gust, as a cantilever does (the offset grows with
 *    the square of the height), and sways slowly at a period set by the tree's size: tall trees sway slower;
 *  - branches swing with distance from the trunk, coherently along their length, faster than the trunk;
 *  - leaves flutter at their own quick rates inside the turbulence that rides in the gusts.
 *
 * Bending keeps a trunk's length: a crown pushed sideways also dips a little. Things moving through low foliage push it
 * aside (`movers`), and a struck tree shakes and settles (`shake`). Displacement is computed in world space and
 * applied in the mesh's own space, so it is the same in the colour pass, the shadow pass and any custom depth pass.
 */

export const FOLIAGE_MAX_MOVERS = 6;
export const FOLIAGE_MAX_SHAKES = 4;

/** How a kind of tree answers the wind. All values are multipliers around 1. */
export interface FoliageResponse {
  /** Trunk lean and sway (stiff conifers lower, slender broadleaves higher). */
  trunk: number;
  /** Branch swing. */
  branch: number;
  /** Leaf flutter (0 for wood). */
  flutter: number;
  /** Height (m) at which the trunk response is calibrated; taller trees bend more at the top and sway slower. */
  height: number;
}

export const FOLIAGE_RESPONSE = {
  broadleaf: { trunk: 1, branch: 1, flutter: 1, height: 12 },
  conifer: { trunk: 0.7, branch: 0.75, flutter: 0.45, height: 16 },
  palm: { trunk: 1.15, branch: 1.4, flutter: 0.8, height: 9 },
  shrub: { trunk: 0.5, branch: 1.2, flutter: 1.1, height: 2.5 },
  dead: { trunk: 0.55, branch: 0.6, flutter: 0, height: 10 },
  /** Ferns and low shrubs of the forest floor. */
  fern: { trunk: 0.6, branch: 1.3, flutter: 1.2, height: 0.8 },
} as const satisfies Record<string, FoliageResponse>;

export interface FoliageUniforms {
  /** x trunk, y branch, z flutter, w calibration height. */
  uFoliage: THREE.IUniform<THREE.Vector4>;
  /** Overall wind strength for the trees (0 holds them still; Reduced Motion). */
  uFoliageWind: THREE.IUniform<number>;
  /** Movers near low foliage: xyz body centre, w radius. */
  uFoliageMovers: THREE.IUniform<THREE.Vector4[]>;
  uFoliageMoverCount: THREE.IUniform<number>;
  /** Struck trees: xz root, z start time (wind clock), w strength. */
  uFoliageShakes: THREE.IUniform<THREE.Vector4[]>;
}

/** Everything a foliage material shares with the rest of the world (one object per world or menu). */
export interface FoliageField {
  readonly wind: GrassWind;
  readonly strength: THREE.IUniform<number>;
  readonly movers: THREE.IUniform<THREE.Vector4[]>;
  readonly moverCount: THREE.IUniform<number>;
  readonly shakes: THREE.IUniform<THREE.Vector4[]>;
  /** The grass's trample field (what has pushed through low plants), filled in by the ground cover when it exists. */
  readonly trample: GrassTrampleUniforms;
}

export function createFoliageField(wind: GrassWind): FoliageField {
  return {
    wind,
    strength: { value: 1 },
    movers: { value: Array.from({ length: FOLIAGE_MAX_MOVERS }, () => new THREE.Vector4(0, -1e4, 0, 0)) },
    moverCount: { value: 0 },
    shakes: { value: Array.from({ length: FOLIAGE_MAX_SHAKES }, () => new THREE.Vector4(0, 0, -1e4, 0)) },
    trample: { tTrample: { value: null }, uTrample: { value: new THREE.Vector4(0, 0, 1, 0) } },
  };
}

/**
 * The forest floor's plants (ferns, low shrubs): the same wind, but only what stands up from the ground moves (moss and
 * litter lie flat), and they read the grass's trample field, so walking through ferns parts them and presses them down.
 */
export function patchFloorPlantVertex(shader: { uniforms: Record<string, THREE.IUniform>; vertexShader: string }, field: FoliageField): boolean {
  if (!shader.vertexShader.includes('#include <begin_vertex>') || !shader.vertexShader.includes('#include <common>')) return false;
  Object.assign(shader.uniforms, foliageUniforms(field, FOLIAGE_RESPONSE.fern), field.trample);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${FOLIAGE_WIND_DECL}\nuniform vec4 uTrample;\nuniform sampler2D tTrample;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  mat4 tvW = modelMatrix;
  #ifdef USE_INSTANCING
    tvW = modelMatrix * instanceMatrix;
  #endif
  vec3 tvRoot = tvW[3].xyz;
  float tvS2 = max(dot(tvW[0].xyz, tvW[0].xyz), 1e-6);
  float tvS = sqrt(tvS2);
  float tvRise = smoothstep(0.02, 0.5, transformed.y * tvS);
  vec3 tvWorld = (tvW * vec4(transformed, 1.0)).xyz;
  vec3 tvOff = tvFoliageOffset(tvWorld, tvRoot, aLeafDetail.z, tvS) * tvRise;
  if (uTrample.w > 0.5) {
    vec2 tvUV = (tvRoot.xz - uTrample.xy) / uTrample.z;
    if (tvUV.x > 0.0 && tvUV.y > 0.0 && tvUV.x < 1.0 && tvUV.y < 1.0) {
      vec4 tvTr = texture2D(tTrample, tvUV);
      float tvH = max(tvWorld.y - tvRoot.y, 0.0);
      tvOff += vec3(tvTr.x, 0.0, tvTr.y) * tvH * 0.6 * tvRise;
      tvOff.y -= tvH * 0.5 * clamp(tvTr.z, 0.0, 1.0) * tvRise;
    }
  }
  transformed += (transpose(mat3(tvW)) * tvOff) / tvS2;
}`);
  return true;
}

const f = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

export const FOLIAGE_WIND_DECL = /* glsl */ `
uniform float uGrassTime;
uniform vec4 uWindDir;
uniform vec4 uGustScroll;
uniform sampler2D tGust;
uniform vec4 uFoliage;
uniform float uFoliageWind;
uniform vec4 uFoliageMovers[${FOLIAGE_MAX_MOVERS}];
uniform int uFoliageMoverCount;
uniform vec4 uFoliageShakes[${FOLIAGE_MAX_SHAKES}];
float tvFHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
// World-space offset of a foliage vertex at p on a tree rooted at o (both world space), the tree drawn at scale s.
vec3 tvFoliageOffset(vec3 p, vec3 o, float leaf, float s) {
  vec3 rel = p - o;
  float h = max(rel.y, 0.0);
  float r = length(rel.xz);
  // The tree's own height: its kind's calibration height at the scale it is drawn (a sapling is a small tree).
  float H = max(uFoliage.w * s, 0.6);
  vec2 wd = uWindDir.xy;
  vec2 wc = vec2(-wd.y, wd.x);
  // The broad gust at the tree: the whole tree leans together as a front passes.
  float gust = smoothstep(0.36, 0.9, texture2D(tGust, (o.xz - uGustScroll.xy) * ${f(1 / GUST_SPAN)}).r);
  float push = (uWindDir.z + uWindDir.w * gust) * uFoliageWind;
  float tPhase = tvFHash(floor(o * 0.5)) * 6.2831853;
  float t = uGrassTime;
  // Trunk: a cantilever. Natural sway period grows with the square root of the height.
  float hn = h / H;
  float fT = 0.42 * sqrt(12.0 / H);
  float sway = sin(t * 6.2831853 * fT + tPhase) * (0.35 + 0.65 * gust) + 0.35 * sin(t * 6.2831853 * fT * 2.31 + tPhase * 1.7);
  float lean = (push * 0.9 + sway * (0.05 + 0.22 * push) * uFoliageWind) * uFoliage.x;
  vec2 trunk = (wd * lean + wc * sway * 0.25 * (0.1 + push) * uFoliageWind * uFoliage.x) * hn * hn * H * 0.03;
  // Branches: swing with reach from the trunk, coherent along a branch (a slow spatial phase), faster than the trunk.
  float reach = smoothstep(0.02, 0.28, r / H) * (0.4 + 0.6 * smoothstep(0.15, 0.6, hn));
  float bPhase = dot(rel, vec3(0.43, 0.29, 0.37)) + tPhase;
  float bSwing = sin(t * (1.7 + 0.9 * fT) + bPhase) * (0.25 + push) * uFoliageWind;
  vec3 branch = (vec3(wd.x, 0.0, wd.y) * (0.6 + 0.4 * bSwing) * push * 0.6 + vec3(0.0, 1.0, 0.0) * bSwing * 0.55 + vec3(wc.x, 0.0, wc.y) * bSwing * 0.35)
    * reach * uFoliage.y * 0.035 * min(r, 6.0);
  // Leaves: quick flutter inside the turbulence that rides in the gusts.
  vec3 flutter = vec3(0.0);
  if (leaf > 0.0) {
    float turb = texture2D(tGust, (p.xz - uGustScroll.zw) * ${f(1 / TURBULENCE_SPAN)}).g;
    float seed = tvFHash(floor(p * 3.0));
    float fq = 5.5 + 5.0 * seed;
    float s = sin(t * fq + seed * 40.0) * (0.25 + 0.75 * turb) * (0.15 + push);
    flutter = normalize(vec3(sin(seed * 31.0), 0.8, cos(seed * 17.0))) * s * 0.035 * uFoliage.z * leaf * uFoliageWind;
  }
  vec3 off = vec3(trunk.x, 0.0, trunk.y) + branch + flutter;
  // Something moving through low foliage pushes it aside (people, animals, the hero).
  for (int i = 0; i < ${FOLIAGE_MAX_MOVERS}; i++) {
    if (i >= uFoliageMoverCount) break;
    vec4 m = uFoliageMovers[i];
    vec3 d = p - m.xyz;
    d.y *= 0.6;
    float dist = length(d);
    float k = 1.0 - smoothstep(m.w * 0.35, m.w, dist);
    if (k > 0.0) off += normalize(vec3(d.x, 0.15, d.z) + 1e-4) * k * k * min(0.5, m.w * 0.55) * (0.3 + 0.7 * leaf) * uFoliageWind;
  }
  // A struck tree shakes and settles over a second or two.
  for (int i = 0; i < ${FOLIAGE_MAX_SHAKES}; i++) {
    vec4 s = uFoliageShakes[i];
    float age = t - s.z;
    if (s.w <= 0.0 || age < 0.0 || age > 3.0) continue;
    if (dot(o.xz - s.xy, o.xz - s.xy) > 0.36) continue;
    float decay = exp(-age * 2.2) * s.w * uFoliageWind;
    vec2 dir = vec2(sin(age * 13.0 + tPhase), cos(age * 11.0 + tPhase * 1.3));
    off.xz += dir * decay * (hn * hn * H * 0.03 + reach * 0.12 + leaf * 0.04);
  }
  // A bent trunk keeps its length: what is pushed sideways dips a little.
  off.y -= 0.5 * dot(trunk, trunk) / max(h, 0.5);
  return off;
}
`;

/**
 * The vertex patch: after `<begin_vertex>`, move `transformed` by the foliage offset computed in world space. Works for
 * instanced (USE_INSTANCING) and plain meshes; assumes rotation and uniform scale, as every placed tree has.
 */
export function foliageVertexPatch(leaf: boolean): string {
  return /* glsl */ `#include <begin_vertex>
{
  mat4 tvW = modelMatrix;
  #ifdef USE_INSTANCING
    tvW = modelMatrix * instanceMatrix;
  #endif
  vec3 tvOrigin = tvW[3].xyz;
  vec3 tvWorld = (tvW * vec4(transformed, 1.0)).xyz;
  float tvS2 = max(dot(tvW[0].xyz, tvW[0].xyz), 1e-6);
  vec3 tvOff = tvFoliageOffset(tvWorld, tvOrigin, ${leaf ? '1.0' : '0.0'}, sqrt(tvS2));
  transformed += (transpose(mat3(tvW)) * tvOff) / tvS2;
}`;
}

export function foliageUniforms(field: FoliageField, response: FoliageResponse): FoliageUniforms & Record<string, THREE.IUniform> {
  return {
    ...field.wind.uniforms,
    uFoliage: { value: new THREE.Vector4(response.trunk, response.branch, response.flutter, response.height) },
    uFoliageWind: field.strength,
    uFoliageMovers: field.movers,
    uFoliageMoverCount: field.moverCount,
    uFoliageShakes: field.shakes,
  };
}

/**
 * Patch any material's vertex shader with the foliage wind. Call from onBeforeCompile (also on depth materials).
 * `weight` names a per-vertex attribute that scales the motion (0 pins a vertex, as at a sprig's stem root).
 */
export function patchFoliageVertex(shader: { uniforms: Record<string, THREE.IUniform>; vertexShader: string }, uniforms: Record<string, THREE.IUniform>, leaf: boolean, weight?: string): boolean {
  if (!shader.vertexShader.includes('#include <begin_vertex>') || !shader.vertexShader.includes('#include <common>')) return false;
  if (weight !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(weight)) return false;
  Object.assign(shader.uniforms, uniforms);
  const patch = foliageVertexPatch(leaf);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${FOLIAGE_WIND_DECL}${weight ? `\nattribute float ${weight};` : ''}`)
    .replace('#include <begin_vertex>', weight ? patch.replace('transformed += (transpose(mat3(tvW)) * tvOff) / tvS2;', `transformed += (transpose(mat3(tvW)) * tvOff) / tvS2 * ${weight};`) : patch);
  return true;
}
