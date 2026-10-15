import * as THREE from 'three';
import type { TerrainTextures } from './terrainTextures';
import { GRASS_FAR_RANGE } from './distanceVisibility';

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
  [1 / 2.4, 0.7, 0.99, 1.0], // grass: woven herbs, not deep relief
  [1 / 2.8, 0.75, 0.99, 1.0], // heath
  [1 / 2.2, 0.8, 0.98, 1.0], // earth
  [1 / 1.8, 0.95, 0.97, 1.0], // gravel
  [1 / 3.2, 0.8, 0.95, 1.05], // sand
  [1 / 3.2, 0.7, 0.4, 1.0], // wet sand
  [1 / 3.6, 0.85, 0.99, 1.0], // rock
  [1 / 2.0, 0.7, 0.99, 1.0], // compacted path
];

const VERT_DECL = /* glsl */ `
attribute vec4 aSplatA;
attribute vec4 aSplatB;
attribute float aWet;
attribute float aCanopy;
attribute vec3 aSurface;
attribute vec4 aMeadow;
varying vec4 vMeadow;
varying vec4 vSplatA;
varying vec4 vSplatB;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vWet;
varying float vCanopy;
varying vec3 vSurface;
`;

const VERT_BODY = /* glsl */ `
vSplatA = aSplatA;
vSplatB = aSplatB;
vWorldPos = position;
vWorldNormal = normal;
vWet = aWet;
vCanopy = aCanopy;
vSurface = aSurface;
vMeadow = aMeadow;
`;

const FRAG_DECL = /* glsl */ `
uniform sampler2DArray uAlb;
uniform sampler2DArray uNrm;
uniform vec4 uLayer[8];
uniform vec2 uGrassFar;
varying vec4 vMeadow;
varying vec4 vSplatA;
varying vec4 vSplatB;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vWet;
varying float vCanopy;
varying vec3 vSurface;

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
      a *= 0.88 + 0.95 * dot(macro, vec3(0.333));
      // Metre-scale weathering and broken bedding survive mipmapping, without displacing the physical ground plane.
      float beds = tvn(vec2(vWorldPos.y * 0.64, dot(tXZ, vec2(0.13, 0.17)))) * 0.65
        + tvn(vec2(vWorldPos.y * 2.1, dot(tXZ, vec2(0.07, 0.1)))) * 0.35;
      a *= mix(0.82, 1.12, smoothstep(0.26, 0.72, beds));
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
      a *= 0.86 + 1.0 * dot(a3, vec3(0.333));
      tStone += b * 0.6;
    }
    tAlb += a * (b * uLayer[i].w);
    tDn += tDnL[i] * (b * uLayer[i].y);
    tRough += b * uLayer[i].z;
    tHeight += b * tRelief[i];
  }
}
// Broad painted groups carry the landscape. Close noise is subordinate to damp hollows and
// dry shelves; the path retains a continuous warm value through both so it remains navigable.
float tM = tvn(tXZ / 43.0) * 0.68 + tvn(tXZ / 12.7) * 0.24 + tvn(tXZ / 3.9) * 0.08;
float tPathShare = tBw[7] / tSum;
tAlb *= mix(0.82, 1.14, mix(tM, 0.52, tPathShare * 0.6));
tAlb *= mix(0.84, 1.12, tvn(tXZ / 131.0 + 3.0) * 0.7 + tvn(tXZ / 37.0 + 8.0) * 0.3);
tAlb *= mix(vec3(0.97, 1.0, 1.035), vec3(1.035, 1.0, 0.95), tvn(tXZ / 71.0 + 9.0));
float tWet = clamp(vWet, 0.0, 1.0);
// Earth/mineral joins are tied to accepted object feet. Their broad material groups
// feather through the existing height blend; no offset planes fight the surface.
float tContactBreak = smoothstep(0.18, 0.82, tvn(tXZ * 1.7 + 17.0));
float tShelter = clamp(vSurface.z, 0.0, 1.0) * (0.55 + tContactBreak * 0.45);
tAlb *= mix(vec3(1.0), vec3(0.89, 0.92, 0.84), tShelter);
float tWear = clamp(vSurface.x, 0.0, 1.0);
tAlb *= mix(vec3(1.0), vec3(1.065, 1.035, 0.975), tWear * 0.6);
// The floor of a meadow lies in the shade of its own blades: old thatch and dark stems, so the gaps between the grass
// read as more grass rather than bare soil.
// A128: the floor also takes the blades' own green at its own brightness: bare ochre between thin near blades read as
// dirt, and the near field looked balder than the dense band beyond it.
float tSward = (tBw[0] + tBw[1] * 0.75) / tSum * (1.0 - tWear * 0.7);
vec3 tSwardGreen = vec3(dot(tAlb, vec3(0.2126, 0.7152, 0.0722))) * vec3(0.74, 1.1, 0.44);
tAlb = mix(tAlb, tSwardGreen, tSward * 0.72);
tAlb *= mix(vec3(1.0), vec3(0.84, 0.86, 0.8), tSward * 0.8);
// Far sward: as the far grass thins out with distance, the meadow floor takes on the blades' own warmer, straw-lit
// colour, so the grass never ends at a visible line and open fields stay grassy past the blades' range (B10).
// B11: the far ground follows the grass that grows there: its own tint (lush green, sun-cured gold, shaded olive, from
// the habitat, per vertex) and its cover, and at range it carries tuft-scale light and shade that fade out before
// they are smaller than a pixel, so a far field reads as grassland rather than flat paint.
float tView = length(vViewPosition);
bool tHasMeadow = vMeadow.w >= 0.0;
float tCover = tHasMeadow ? clamp(vMeadow.w, 0.0, 1.0) * (1.0 - tWear * 0.7) : tSward;
float tFar = smoothstep(uGrassFar.x, uGrassFar.y, tView);
float tMid = smoothstep(uGrassFar.x * 0.45, uGrassFar.y, tView);
const vec3 tLumW = vec3(0.2126, 0.7152, 0.0722);
float tGroundL = dot(tAlb, tLumW);
vec3 tTint = tHasMeadow ? max(vMeadow.rgb, vec3(1e-4)) : vec3(0.122, 0.178, 0.064);
vec3 tGrassFar = tGroundL * (tTint / max(dot(tTint, tLumW), 1e-4)) * vec3(1.08, 0.91, 0.68);
// Tufts and their shade: two noise octaves at clump scale, each faded out by the pixel's ground footprint.
float tFoot = max(length(tGx), length(tGy));
float tTuft = (tvn(tXZ / 2.3 + 31.0) - 0.5) * (1.0 - smoothstep(0.5, 1.4, tFoot))
  + (tvn(tXZ / 0.8 + 57.0) - 0.5) * 0.7 * (1.0 - smoothstep(0.18, 0.5, tFoot));
// Swathes: denser grass reads a little brighter from afar (blade tops in the light), thin cover shows its floor.
float tSwathe = tvn(tXZ / 9.0 + 13.0) - 0.5;
tGrassFar *= 1.0 + 0.32 * tTuft + 0.12 * tSwathe + 0.1 * (tCover - 0.5);
tAlb = mix(tAlb, tGrassFar, tCover * (tFar * 0.85 + (tMid - tFar) * 0.3));
tAlb *= mix(1.0, mix(0.5, 0.72, tStone), tWet);
// Damp sand may carry a sheen. Fractured stone only darkens and broadens its highlight: never a mirror-like wet wall.
tRough = mix(tRough, mix(0.36, 0.88, tStone), tWet);
tRough = clamp(tRough + tStone * (0.5 - tHeight) * 0.08, 0.36, 1.0);
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
  // These samplers are injected at compile time; expose their identities for cooperative first-view uploads.
  mat.userData.preparationTextures = [tex.albedo, tex.normal];
  const layer = LAYER_PARAMS.map((p) => new THREE.Vector4(...p));
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAlb = { value: tex.albedo };
    shader.uniforms.uNrm = { value: tex.normal };
    shader.uniforms.uLayer = { value: layer };
    shader.uniforms.uGrassFar = GRASS_FAR_RANGE;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${VERT_DECL}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_DECL}`)
      .replace('#include <map_fragment>', FRAG_ALBEDO)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = tRough;')
      // Accepted geometric crowns screen some diffuse sky light. Direct sunlight and real shadow maps retain
      // their own authority; this is a soft sky-occlusion proxy, not an invented physical canopy shadow.
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= mix(0.8, 1.0, smoothstep(0.2, 0.8, tHeight)) * mix(1.0, 0.86, clamp(vCanopy, 0.0, 1.0));')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAG_NORMAL}`);
  };
  mat.customProgramCacheKey = () => 'tervain-terrain-v10-far-meadow';
  return mat;
}
