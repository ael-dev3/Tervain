import * as THREE from 'three';
import type { SwayUniforms } from '../vegetation';

/**
 * Material for the streamed ground-cover layers (grass patches, flower clusters).
 *
 * Adapted from ael-dev3/Warpkeep src/components/realm/createRealmGrassMaterial.ts and
 * createRealmWildflowerMaterial.ts @786c0b2 (Apache-2.0): the shader is injected into a stock three.js
 * material, bends blades with a travelling gust front plus a faster ripple, keeps normals biased to the sky
 * hemisphere so a meadow shades as one surface, and adds a thin-blade sun transmission term.
 * Differences: instance data is four vec4 attributes (no instance matrix), density thinning and the distance
 * fade are done per patch in the shader from a stable rank so nothing pops, and a few "pushers" (the player,
 * rabbits) bend and flatten blades around them.
 *
 * If a three.js update changes the chunks this relies on, the material logs once and the layer hides itself
 * rather than drawing untreated geometry.
 */

export interface PatchUniforms {
  uTime: THREE.IUniform<number>;
  uWind: THREE.IUniform<number>;
  /** start distance of the thinning, end distance (nothing beyond), size compensation at the far end, falloff power */
  uFade: THREE.IUniform<THREE.Vector4>;
  /** windAmp (m at the tip of a 1 m blade), root shade, tip shade, unused */
  uMotion: THREE.IUniform<THREE.Vector4>;
  uPush: THREE.IUniform<THREE.Vector4[]>;
  /** xyz = direction toward the sun, w = 0..1 how bright the sun is (0 at night) */
  uSun: THREE.IUniform<THREE.Vector4>;
}

export interface PatchMaterialOptions {
  /** Read a per-vertex `aColor` (flowers, ferns) instead of shading purely from the instance tint (grass). */
  vertexColors: boolean;
  fadeStart: number;
  fadeEnd: number;
  sizeComp: number;
  power: number;
  windAmp: number;
  rootShade: number;
  tipShade: number;
  receiveShadow?: boolean;
}

const VERT_DECL = /* glsl */ `
attribute vec4 aBase;
attribute vec4 aShape;
attribute vec4 aTint;
attribute vec4 aBlade;
#ifdef GCOL
attribute vec3 aColor;
#endif
uniform float uTime;
uniform float uWind;
uniform vec4 uFade;
uniform vec4 uMotion;
uniform vec4 uPush[4];
varying vec3 vGCol;
varying float vGH;
varying float vGSun;
varying float vGGust;
varying vec3 vGWorld;
`;

const NORMAL_CODE = /* glsl */ `
float gYaw = aShape.x;
float gCy = cos(gYaw);
float gSy = sin(gYaw);
vec3 objectNormal = vec3(normal.x * gCy + normal.z * gSy, normal.y, -normal.x * gSy + normal.z * gCy);
`;

const POSITION_CODE = /* glsl */ `
float gHT = aBlade.y;
float gD = distance(aBase.xyz, cameraPosition);
float gQ = pow(1.0 - smoothstep(uFade.x, uFade.y, gD), uFade.w);
float gKeep = smoothstep(0.0, 0.12, gQ - aBase.w);
float gSc = gKeep * mix(1.0, uFade.z, 1.0 - gQ);
vec3 gp = position;
gp.xz *= aShape.y * gSc;
gp.y *= aShape.z * gSc;
vec3 gw = vec3(gp.x * gCy + gp.z * gSy, gp.y, -gp.x * gSy + gp.z * gCy) + aBase.xyz;

vec2 gWind = vec2(0.866, 0.5);
vec2 gCross = vec2(-gWind.y, gWind.x);
float gAlong = dot(gw.xz, gWind);
float gAcross = dot(gw.xz, gCross);
float gFront = sin(gAlong * 0.21 - uTime * 0.34);
float gSide = sin(gAcross * 0.087 + uTime * 0.19 + 1.7);
float gGust = clamp((gFront + 0.64) / 1.46, 0.0, 1.0) * 0.82 + (gSide * 0.5 + 0.5) * 0.18;
float gPrimary = sin(gAlong * 1.18 + uTime * 1.24 + aShape.w * 0.9 + aBlade.z * 0.11);
float gSecondary = sin(gAcross * 2.78 + uTime * 2.07 + aBlade.z * 0.31) * 0.28;
float gFlex = pow(max(gHT, 0.0), 1.85);
float gBend = (gPrimary + gSecondary) * mix(0.55, 1.0, gGust) * aBlade.w * uWind * uMotion.x * aShape.z * gSc;
gw.xz += (gWind + gCross * 0.16) * gBend * gFlex;
gw.y -= abs(gBend) * gFlex * 0.25;

for (int gi = 0; gi < 4; gi++) {
  vec4 gP = uPush[gi];
  if (gP.w > 0.0) {
    vec2 gdv = gw.xz - gP.xz;
    float gdl = length(gdv) + 0.0001;
    float gk = 1.0 - smoothstep(gP.w * 0.28, gP.w, gdl);
    float gh = max(gw.y - aBase.y, 0.0);
    gw.xz += gdv / gdl * gk * min(gh, 0.6) * 0.75;
    gw.y -= gk * gh * 0.42;
  }
}
vec3 transformed = gw;

#ifdef GCOL
vec3 gc = aColor * aTint.rgb;
float gShade = mix(0.7, 1.0, smoothstep(0.0, 0.6, gHT));
#else
vec3 gc = aTint.rgb;
float gShade = mix(uMotion.y, uMotion.z, pow(max(gHT, 0.0), 0.8));
#endif
vGCol = gc * gShade * (0.93 + 0.14 * fract(aBlade.z * 7.13 + aBase.x * 3.1));
vGH = gHT;
vGSun = aTint.w;
vGGust = gGust;
vGWorld = gw;
`;

const FRAG_DECL = /* glsl */ `
uniform vec4 uSun;
varying vec3 vGCol;
varying float vGH;
varying float vGSun;
varying float vGGust;
varying vec3 vGWorld;
`;

export interface PatchMaterial {
  material: THREE.MeshLambertMaterial;
  uniforms: PatchUniforms;
  ok(): boolean;
}

/** Shared "pushers": world positions (xz) and radii that lean and flatten nearby blades. */
export function createPushers(): THREE.Vector4[] {
  return [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)];
}

export function createPatchMaterial(sway: SwayUniforms, pushers: THREE.Vector4[], sun: THREE.Vector4, opts: PatchMaterialOptions): PatchMaterial {
  const uniforms: PatchUniforms = {
    uTime: sway.uTime,
    uWind: sway.uWind,
    uFade: { value: new THREE.Vector4(opts.fadeStart, opts.fadeEnd, opts.sizeComp, opts.power) },
    uMotion: { value: new THREE.Vector4(opts.windAmp, opts.rootShade, opts.tipShade, 0) },
    uPush: { value: pushers },
    uSun: { value: sun },
  };
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  if (opts.vertexColors) material.defines = { GCOL: '' };
  let failed = false;
  material.onBeforeCompile = (shader) => {
    const v0 = shader.vertexShader;
    const f0 = shader.fragmentShader;
    const need = ['#include <beginnormal_vertex>', '#include <begin_vertex>', '#include <common>'];
    const needF = ['#include <color_fragment>', '#include <normal_fragment_maps>', '#include <lights_fragment_end>', '#include <common>'];
    if (!need.every((m) => v0.includes(m)) || !needF.every((m) => f0.includes(m))) {
      failed = true;
      console.warn('ground cover shader chunks changed; layer disabled');
      shader.fragmentShader = 'void main() { discard; }';
      return;
    }
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = v0
      .replace('#include <common>', `#include <common>\n${VERT_DECL}`)
      .replace('#include <beginnormal_vertex>', NORMAL_CODE)
      .replace('#include <begin_vertex>', POSITION_CODE);
    shader.fragmentShader = f0
      .replace('#include <common>', `#include <common>\n${FRAG_DECL}`)
      .replace('#include <color_fragment>', 'diffuseColor.rgb = vGCol * (0.94 + 0.12 * vGGust);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(vNormal);\nnonPerturbedNormal = normal;')
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          vec3 gV = normalize(vGWorld - cameraPosition);
          float gS = pow(clamp(dot(gV, uSun.xyz), 0.0, 1.0), 3.0);
          reflectedLight.directDiffuse += diffuseColor.rgb * vec3(0.85, 1.0, 0.3) * gS * 0.5 * vGH * vGSun * uSun.w;
        }`,
      );
  };
  material.customProgramCacheKey = () => `tervain-patch-v1-${opts.vertexColors ? 'c' : 'g'}`;
  return { material, uniforms, ok: () => !failed };
}
