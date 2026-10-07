import * as THREE from 'three';
import { foliageUniforms, patchFoliageVertex, type FoliageField, type FoliageResponse } from './foliageWind';

/**
 * Leaves as thin, living things. Every supplied tree keeps its own geometry and textures; this changes how its foliage
 * is lit and how it moves:
 *
 *  - Crown normals. Card foliage stores flat axis normals (front, side, top), so a crown used to light up card by card.
 *    Each leaf now also takes the normal of a spheroid fitted to its crown, so the crown shades as one rounded mass:
 *    bright where it faces the sun, dark beneath, with the card's own facing kept for detail.
 *  - Light through the leaves. When the sun (or a lantern) is behind a leaf it glows, most on the crown's outer shell.
 *  - Depth. Ambient light dies away inside the crown, so canopies read as volumes rather than flat cut-outs.
 *  - Colour. Each tree varies a little in hue and value, and greens beyond a natural saturation are drawn back.
 *  - Wind and touch (foliageWind.ts), in the colour pass and, through the depth materials, in the shadows.
 *
 * The patch chains any earlier `onBeforeCompile` (the distance dither, bark detail) and extends the program cache key.
 */

export interface FoliageCrown {
  /** Crown centre in the mesh's own space (m), and its horizontal and vertical radii. */
  centre: THREE.Vector3;
  horizontal: number;
  vertical: number;
}

export interface FoliageLook {
  /** How far the crown normal replaces the card's own (0..1). */
  crownNormal: number;
  /** Light through the leaves from behind. */
  translucency: number;
  /** Colour of light that has passed through a leaf. */
  transTint: THREE.Color;
  /** Ambient light left at the heart of a crown (0..1). */
  innerShade: number;
  /** Saturation kept (1 unchanged) and per-tree hue/value variation. */
  saturation: number;
  variation: number;
}

export const FOLIAGE_LOOK: FoliageLook = {
  crownNormal: 0.55,
  translucency: 0.9,
  transTint: new THREE.Color(1.0, 1.1, 0.55),
  innerShade: 0.6,
  saturation: 0.84,
  variation: 1,
};

/** The crown spheroid of a leaf geometry, from its bounds in the mesh's own space. */
export function crownOf(geometry: THREE.BufferGeometry): FoliageCrown {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = box.getSize(new THREE.Vector3());
  return {
    centre: box.getCenter(new THREE.Vector3()),
    horizontal: Math.max(0.3, Math.max(size.x, size.z) / 2),
    vertical: Math.max(0.3, size.y / 2),
  };
}

export interface FoliageInstall {
  field: FoliageField;
  response: FoliageResponse;
  /** Leaves (lit and fluttering) or wood (moves with the tree only). */
  leaf: boolean;
  crown?: FoliageCrown;
  look?: Partial<FoliageLook>;
  /** Extra key distinguishing programs that share this patch but differ in other ways. */
  key?: string;
  /** A per-vertex attribute scaling the motion (0 pins a vertex). */
  weight?: string;
}

const LEAF_VERTEX_DECL = /* glsl */ `
uniform vec4 uCrownCentre;
uniform vec2 uCrownRadii;
varying vec3 vCrownN;
varying float vCrownDepth;
varying float vFoliageHue;
`;

const LEAF_VERTEX_BODY = /* glsl */ `
{
  mat4 tvCW = modelMatrix;
  #ifdef USE_INSTANCING
    tvCW = modelMatrix * instanceMatrix;
  #endif
  float tvCS = sqrt(max(dot(tvCW[0].xyz, tvCW[0].xyz), 1e-6));
  vec3 tvCentre = (tvCW * vec4(uCrownCentre.xyz, 1.0)).xyz;
  vec3 tvP = (tvCW * vec4(transformed, 1.0)).xyz;
  vec3 tvD = tvP - tvCentre;
  float tvRh = uCrownRadii.x * tvCS, tvRv = uCrownRadii.y * tvCS;
  vec3 tvE = vec3(tvD.x / tvRh, tvD.y / tvRv, tvD.z / tvRh);
  vCrownDepth = length(tvE);
  // The spheroid's outward normal, in view space for the fragment's lighting.
  vec3 tvN = normalize(vec3(tvE.x / tvRh, tvE.y / tvRv, tvE.z / tvRh) + vec3(0.0, 0.12, 0.0) / max(tvRv, 0.1));
  vCrownN = normalize((viewMatrix * vec4(tvN, 0.0)).xyz);
  vFoliageHue = fract(sin(dot(tvCW[3].xz, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
}
`;

const LEAF_FRAGMENT_DECL = /* glsl */ `
uniform vec4 uFoliageLook;
uniform vec3 uFoliageTransTint;
uniform float uFoliageSaturation;
varying vec3 vCrownN;
varying float vCrownDepth;
varying float vFoliageHue;
`;

/** Thin-leaf light, wrapped around every light including lanterns, with its shadow already applied by Three. */
const LEAF_LIGHT_GLSL = /* glsl */ `
void RE_Direct_Foliage( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  float ndl = dot( geometryNormal, directLight.direction );
  // Thin leaves are lit a little past their terminator.
  float wrap = saturate( ( ndl + 0.4 ) / 1.4 ) - saturate( ndl );
  reflectedLight.directDiffuse += wrap * 0.55 * directLight.color * BRDF_Lambert( material.diffuseColor );
  // Light passing through toward the eye, strongest on the crown's outer shell.
  float behind = saturate( dot( - geometryViewDir, directLight.direction ) );
  float through = pow( behind, 4.0 ) * 1.25 + pow( behind, 1.4 ) * 0.18;
  float shell = 0.35 + 0.65 * smoothstep( 0.35, 1.0, vCrownDepth );
  reflectedLight.directDiffuse += directLight.color * material.diffuseColor * uFoliageTransTint * through * shell * uFoliageLook.y;
}
#undef RE_Direct
#define RE_Direct RE_Direct_Foliage
`;

const LEAF_COLOUR_GLSL = /* glsl */ `
{
  // Natural greens: draw back saturation beyond what leaves have, vary each tree a little.
  float tvL = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  float tvSat = max( max( diffuseColor.r, diffuseColor.g ), diffuseColor.b ) - min( min( diffuseColor.r, diffuseColor.g ), diffuseColor.b );
  // Linear-light saturation: natural foliage stays below about 0.25; poster greens are pulled firmly back.
  float tvKeep = uFoliageSaturation / ( 1.0 + max( tvSat - 0.16, 0.0 ) * 5.0 );
  diffuseColor.rgb = mix( vec3( tvL ), diffuseColor.rgb, tvKeep );
  diffuseColor.rgb *= vec3( 1.0 + vFoliageHue * 0.12 * uFoliageLook.w, 1.0 + vFoliageHue * 0.03 * uFoliageLook.w, 1.0 - vFoliageHue * 0.16 * uFoliageLook.w ) * ( 1.0 + vFoliageHue * 0.1 * uFoliageLook.w );
}
`;

/** Skylight through leaves seen against the sky: looking up into a crown, its outer leaves glow. */
const LEAF_SKY_GLSL = /* glsl */ `
#if NUM_HEMI_LIGHTS > 0
{
  vec3 tvUp = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float tvSkyBehind = saturate( dot( - geometryViewDir, tvUp ) );
  float tvShell = 0.3 + 0.7 * smoothstep( 0.35, 1.0, vCrownDepth );
  reflectedLight.indirectDiffuse += hemisphereLights[ 0 ].skyColor * diffuseColor.rgb * uFoliageTransTint
    * pow( tvSkyBehind, 1.4 ) * 0.5 * uFoliageLook.y * tvShell;
}
#endif
`;

export interface InstalledFoliage {
  /** Uniforms this material owns (look and crown); the wind and touch uniforms are the field's, shared. */
  uniforms: Record<string, THREE.IUniform>;
  /** False if Three changed a chunk the patch relies on (the material then simply keeps its old look, still). */
  ok(): boolean;
}

const installed = new WeakMap<THREE.Material, InstalledFoliage>();

/**
 * Give a tree material wind (and, for leaves, the foliage look). Idempotent per material. Depth and distance materials
 * used for shadows should be patched with {@link installFoliageShadow} so the shadows move with the leaves.
 */
export function installFoliage(material: THREE.Material, opts: FoliageInstall): InstalledFoliage {
  const existing = installed.get(material);
  if (existing) return existing;
  const look = { ...FOLIAGE_LOOK, ...opts.look };
  const crown = opts.crown ?? { centre: new THREE.Vector3(0, 6, 0), horizontal: 4, vertical: 4 };
  const wind = foliageUniforms(opts.field, opts.response);
  const own: Record<string, THREE.IUniform> = {
    uFoliage: wind.uFoliage,
    uCrownCentre: { value: new THREE.Vector4(crown.centre.x, crown.centre.y, crown.centre.z, 0) },
    uCrownRadii: { value: new THREE.Vector2(crown.horizontal, crown.vertical) },
    uFoliageLook: { value: new THREE.Vector4(look.crownNormal, look.translucency, look.innerShade, look.variation) },
    uFoliageTransTint: { value: look.transTint.clone() },
    uFoliageSaturation: { value: look.saturation },
  };
  let failed = false;
  const physical = (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
  const compile = material.onBeforeCompile;
  const programKey = material.customProgramCacheKey;
  material.onBeforeCompile = function(shader, renderer) {
    compile.call(this, shader, renderer);
    if (!patchFoliageVertex(shader, { ...wind, ...own }, opts.leaf, opts.weight)) { failed = true; return; }
    if (!opts.leaf || !physical) return;
    const f0 = shader.fragmentShader;
    const needs = ['#include <common>', '#include <color_fragment>', '#include <normal_fragment_maps>', '#include <lights_physical_pars_fragment>', '#include <aomap_fragment>'];
    if (!needs.every((n) => f0.includes(n))) { failed = true; return; }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${LEAF_VERTEX_DECL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${LEAF_VERTEX_BODY}`);
    shader.fragmentShader = f0
      .replace('#include <common>', `#include <common>\n${LEAF_FRAGMENT_DECL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${LEAF_COLOUR_GLSL}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = normalize( mix( normal, vCrownN, uFoliageLook.x ) );`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${LEAF_LIGHT_GLSL}`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        reflectedLight.indirectDiffuse *= mix( uFoliageLook.z, 1.0, smoothstep( 0.15, 1.0, vCrownDepth ) );
        ${LEAF_SKY_GLSL}`);
  };
  material.customProgramCacheKey = function() {
    return `${programKey.call(this)}|tervain-foliage-v1-${opts.leaf ? 'leaf' : 'wood'}${opts.key ? `-${opts.key}` : ''}`;
  };
  material.needsUpdate = true;
  const result: InstalledFoliage = { uniforms: own, ok: () => !failed };
  installed.set(material, result);
  return result;
}

/** The same wind on a shadow depth or distance material, so shadows sway with the foliage they are cast by. */
export function installFoliageShadow(material: THREE.Material, opts: Pick<FoliageInstall, 'field' | 'response' | 'leaf' | 'weight'>, shared?: InstalledFoliage): void {
  if (installed.has(material)) return;
  const wind = foliageUniforms(opts.field, opts.response);
  if (shared?.uniforms.uFoliage) wind.uFoliage = shared.uniforms.uFoliage as THREE.IUniform<THREE.Vector4>;
  const compile = material.onBeforeCompile;
  const programKey = material.customProgramCacheKey;
  let failed = false;
  material.onBeforeCompile = function(shader, renderer) {
    compile.call(this, shader, renderer);
    if (!patchFoliageVertex(shader, wind, opts.leaf, opts.weight)) failed = true;
  };
  material.customProgramCacheKey = function() { return `${programKey.call(this)}|tervain-foliage-v1-shadow-${opts.leaf ? 'leaf' : 'wood'}`; };
  material.needsUpdate = true;
  installed.set(material, { uniforms: { uFoliage: wind.uFoliage }, ok: () => !failed });
}
