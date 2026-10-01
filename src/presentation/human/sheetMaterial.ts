import * as THREE from 'three';
import { detailArrayTexture } from './humanTex';

/**
 * The material every person is drawn with: a standard lit, skinned material whose colour comes from the person's sheet
 * (sheet.ts). Each vertex carries its coordinates in each of the sheet's five views and a weight for each; the fragment
 * blends the views it faces, then multiplies a tiling detail layer (weave, grain, pores, strands, rings) chosen by what
 * the surface is made of, so cloth and skin stay crisp up close whatever painted the sheet. Roughness and metalness come
 * per vertex from the same surface. One program serves every person.
 */

export interface PersonMaterialOptions {
  /** How strongly the tiling detail layer shows (0 none, 1 full). */
  detail?: number;
}

const VERTEX_DECL = /* glsl */ `
attribute vec4 sheetUv0;
attribute vec4 sheetUv1;
attribute vec2 sheetUv2;
attribute vec4 sheetW;
attribute float sheetW2;
attribute vec3 surf;
varying vec4 vSheetUv0;
varying vec4 vSheetUv1;
varying vec2 vSheetUv2;
varying vec4 vSheetW;
varying float vSheetW2;
varying vec3 vSurf;
`;

const FRAGMENT_DECL = /* glsl */ `
uniform sampler2DArray uDetail;
uniform float uDetailMix;
varying vec4 vSheetUv0;
varying vec4 vSheetUv1;
varying vec2 vSheetUv2;
varying vec4 vSheetW;
varying float vSheetW2;
varying vec3 vSurf;
`;

const SHEET_FRAGMENT = /* glsl */ `
  vec3 sheetC = vec3(0.0);
  if (vSheetW.x > 0.004) sheetC += texture2D(map, vSheetUv0.xy).rgb * vSheetW.x;
  if (vSheetW.y > 0.004) sheetC += texture2D(map, vSheetUv0.zw).rgb * vSheetW.y;
  if (vSheetW.z > 0.004) sheetC += texture2D(map, vSheetUv1.xy).rgb * vSheetW.z;
  if (vSheetW.w > 0.004) sheetC += texture2D(map, vSheetUv1.zw).rgb * vSheetW.w;
  if (vSheetW2 > 0.004) sheetC += texture2D(map, vSheetUv2).rgb * vSheetW2;
  sheetC /= max(1e-3, vSheetW.x + vSheetW.y + vSheetW.z + vSheetW.w + vSheetW2);
  float sheetDetail = texture(uDetail, vec3(vMapUv, floor(vSurf.z + 0.5))).r * 2.0;
  diffuseColor.rgb *= sheetC * mix(1.0, sheetDetail, uDetailMix);
`;

export function personMaterial(sheet: THREE.Texture, o: PersonMaterialOptions = {}): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ map: sheet, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  mat.name = 'person-sheet';
  const detail = { value: o.detail ?? 1 };
  mat.userData.detailMix = detail;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: detailArrayTexture() };
    shader.uniforms.uDetailMix = detail;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_DECL}`)
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
  vSheetUv0 = sheetUv0;
  vSheetUv1 = sheetUv1;
  vSheetUv2 = sheetUv2;
  vSheetW = sheetW;
  vSheetW2 = sheetW2;
  vSurf = surf;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_DECL}`)
      .replace('#include <map_fragment>', SHEET_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vSurf.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vSurf.y;');
  };
  mat.customProgramCacheKey = () => 'tervain-person-sheet-1';
  return mat;
}
