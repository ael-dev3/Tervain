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
 *  - Coverage (A69). Leaf edges are resolved about the cut-off rather than above it, and alpha is lifted with the mip
 *    level so a distant crown keeps its body.
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
  /** Light through the leaves left in the crown's own shadow, of what it would be in the open (0..1). */
  shadeThrough: number;
  /**
   * Leaf masses (A76): how much the outer shell thins between masses (0..1), how dark the spaces between masses fall
   * (0 none), how far a card's straight cut is roughened at leaf scale, and the size of a mass (metres).
   */
  clumps: { gaps: number; shade: number; rough: number; size: number };
  /** A card fades out between these facings toward the eye (|cos|), as it turns edge-on (A76). */
  edgeOn: readonly [number, number];
}

export const FOLIAGE_LOOK: FoliageLook = {
  // A69: the crown shades as one rounded mass (its cards no longer fight it) and keeps more of its greens and inner light.
  // A76: the crown shades more as one mass, and light through the leaves is weaker and less yellow (no lime highlights).
  crownNormal: 0.85,
  translucency: 0.55,
  transTint: new THREE.Color(0.9, 0.95, 0.7),
  // A75: the heart of a near crown and its leaves in their own shadow went near-black, so a crown read as blotchy dark
  // clumps between bright cards (owner playtest). Gothic 3's crowns stay soft and evenly lit inside.
  // A133: depth again: a crown's heart falls to 0.72 of the open ambient (with the crown normal's sky bias it never goes
  // black), so the crown reads as a volume rather than one evenly lit sheet of cards.
  innerShade: 0.72,
  // A76: muted toward Gothic 3's olive greens.
  saturation: 0.7,
  variation: 1,
  shadeThrough: 0.8,
  // A79: the shell's gaps between masses and the roughened card cut made near crowns noisy and blotchy, with dark clumps
  // between masses (owner playtest on a GPU); the masses keep only a faint shading.
  clumps: { gaps: 0, shade: 0.15, rough: 0, size: 1.1 },
  edgeOn: [0.2, 0.55],
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

/**
 * A84: what the follow camera looks at (world xyz) and how far round the line to it leaves give way (w, metres; 0 off).
 * Leaves between the lens and the wanderer fade there, as a game camera's occluders do, so from under a crown he is not
 * lost behind a screen of leaf masses. One value for every leaf material; the app sets it for each picture of the world.
 */
export const FOLIAGE_FOCUS: THREE.IUniform<THREE.Vector4> = { value: new THREE.Vector4(0, 0, 0, 0) };

const LEAF_VERTEX_DECL = /* glsl */ `
// The leaf depth and colour passes must place every vertex identically (leafPrepass.ts).
invariant gl_Position;
uniform vec4 uCrownCentre;
uniform vec2 uCrownRadii;
varying vec3 vTvWorld;
varying vec3 vCrownN;
varying float vCrownDepth;
varying float vFoliageHue;
varying vec3 vTvLeafP;
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
  vTvWorld = tvP;
  vec3 tvD = tvP - tvCentre;
  float tvRh = uCrownRadii.x * tvCS, tvRv = uCrownRadii.y * tvCS;
  vec3 tvE = vec3(tvD.x / tvRh, tvD.y / tvRv, tvD.z / tvRh);
  vCrownDepth = length(tvE);
  // The spheroid's outward normal, in view space for the fragment's lighting.
  vec3 tvN = normalize(vec3(tvE.x / tvRh, tvE.y / tvRv, tvE.z / tvRh) + vec3(0.0, 0.45, 0.0) / max(tvRv, 0.1));
  vCrownN = normalize((viewMatrix * vec4(tvN, 0.0)).xyz);
  vFoliageHue = fract(sin(dot(tvCW[3].xz, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  // Where the leaf is in its crown, in metres, offset by where the tree stands: each tree's clumps fall differently (A76).
  vTvLeafP = (transformed - uCrownCentre.xyz) * tvCS + tvCW[3].xyz * 0.37;
}
`;

const LEAF_FRAGMENT_DECL = /* glsl */ `
uniform vec4 uFoliageLook;
uniform vec3 uFoliageTransTint;
uniform float uFoliageSaturation;
uniform float uFoliageShadeThrough;
uniform vec4 uFoliageClump;
uniform vec2 uFoliageEdgeOn;
uniform vec4 uFoliageFocus;
varying vec3 vTvWorld;
varying vec3 vCrownN;
varying float vCrownDepth;
varying float vFoliageHue;
varying vec3 vTvLeafP;
// How much of a leaf mass this point is in (0 the gap between masses, 1 the heart of one), for its colour and its edge.
float tvClump = 0.5;
float tvLeafHash( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float tvLeafNoise( vec3 x ) {
  vec3 i = floor( x ), f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( tvLeafHash( i ), tvLeafHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( tvLeafHash( i + vec3( 0, 1, 0 ) ), tvLeafHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
    mix( mix( tvLeafHash( i + vec3( 0, 0, 1 ) ), tvLeafHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( tvLeafHash( i + vec3( 0, 1, 1 ) ), tvLeafHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
// The light that reaches a leaf before its shadow is applied, for the share that still passes through it.
vec3 tvLitColour = vec3( 0.0 );
`;

/**
 * Leaf cut-out (A69). Three's alpha-to-coverage ramp starts at the cut-off, so every leaf edge loses coverage; this one
 * is centred on it. Box-filtered mips thin a crown's alpha with distance, so alpha is lifted with the mip level first.
 */
const LEAF_ALPHA_TEST_GLSL = /* glsl */ `
// The colour pass behind a leaf depth pass (leafPrepass.ts) takes its cut-out from the depth test.
#if defined( USE_ALPHATEST ) && !defined( TV_LEAF_SHADE_ONLY )
{
  float tvA = diffuseColor.a;
  #ifdef USE_MAP
  {
    // A133: up close a leaf atlas is magnified, and bilinear alpha cut at a threshold traces each texel's diamond: the
    // edges read as pixel steps however well they are anti-aliased. Where the atlas is magnified its alpha is read with
    // a cubic B-spline (four bilinear taps), whose contours are smooth curves; from about one texel per pixel onward
    // the plain sample returns.
    vec2 tvSize = vec2( textureSize( map, 0 ) );
    vec2 tvT = vMapUv * tvSize;
    float tvLod = 0.5 * log2( max( max( dot( dFdx( tvT ), dFdx( tvT ) ), dot( dFdy( tvT ), dFdy( tvT ) ) ), 1e-8 ) );
    float tvCubic = 1.0 - smoothstep( -0.5, 0.25, tvLod );
    if ( tvCubic > 0.0 ) {
      vec2 tvSt = tvT - 0.5, tvI = floor( tvSt ), tvF = tvSt - tvI, tvF2 = tvF * tvF, tvF3 = tvF2 * tvF;
      vec2 tvW0 = ( 1.0 - 3.0 * tvF + 3.0 * tvF2 - tvF3 ) / 6.0, tvW1 = ( 4.0 - 6.0 * tvF2 + 3.0 * tvF3 ) / 6.0;
      vec2 tvW2 = ( 1.0 + 3.0 * tvF + 3.0 * tvF2 - 3.0 * tvF3 ) / 6.0, tvW3 = tvF3 / 6.0;
      vec2 tvG0 = tvW0 + tvW1, tvG1 = tvW2 + tvW3;
      vec2 tvH0 = ( tvI - 0.5 + tvW1 / tvG0 ) / tvSize, tvH1 = ( tvI + 1.5 + tvW3 / tvG1 ) / tvSize;
      float tvCa = tvG0.y * ( tvG0.x * textureLod( map, vec2( tvH0.x, tvH0.y ), 0.0 ).a + tvG1.x * textureLod( map, vec2( tvH1.x, tvH0.y ), 0.0 ).a )
                 + tvG1.y * ( tvG0.x * textureLod( map, vec2( tvH0.x, tvH1.y ), 0.0 ).a + tvG1.x * textureLod( map, vec2( tvH1.x, tvH1.y ), 0.0 ).a );
      tvA = mix( tvA, opacity * tvCa, tvCubic );
    }
  }
  #endif
  // A133: the leaf atlases are feathered (A110), so a gain on alpha grows every leaf a little into its own soft margin:
  // the crown reads fuller and its leaves rounder, with the cut-off where the feathering is smooth.
  tvA *= 1.3;
  // Leaf masses (A76): on the crown's outer shell the cards thin out between masses, so the outline breaks into clumps
  // with sky between them instead of the cards' own edges; the cards' straight cut is roughened at leaf scale, fading
  // out once a pixel covers several leaves so it never shimmers.
  float tvShell = smoothstep( 0.6, 1.02, vCrownDepth );
  tvA *= 1.0 - uFoliageClump.x * tvShell * smoothstep( 0.5, 0.27, tvClump );
  // A card seen edge-on smears its texture into streaks; it fades out as it turns away, and the cards behind fill in.
  float tvFacing = abs( dot( normalize( cross( dFdx( vViewPosition ), dFdy( vViewPosition ) ) ), normalize( vViewPosition ) ) );
  tvA *= smoothstep( uFoliageEdgeOn.x, uFoliageEdgeOn.y, tvFacing );
  // A79: a card within a metre or two of the eye covers the screen as one smeared, dark shape; it fades out there, as
  // the camera slips past the leaves rather than through a wall of them.
  // A84: with the camera well back from the wanderer, leaves give way further out from the lens, up to 2.6 m: from just
  // under a crown, the masses filling the frame's edges were those 1.6-3 m off. Never past 45% of the way to him, so
  // what grows beside him stays.
  float tvNearEnd = 1.6;
  if ( uFoliageFocus.w > 0.0 ) tvNearEnd = clamp( 0.45 * distance( uFoliageFocus.xyz, cameraPosition ), 1.6, 2.6 );
  tvA *= smoothstep( 0.6, tvNearEnd, length( vViewPosition ) );
  // A84: a leaf between the lens and the wanderer gives way, most on the line to him, none beyond him.
  if ( uFoliageFocus.w > 0.0 ) {
    vec3 tvSeg = uFoliageFocus.xyz - cameraPosition;
    float tvLen2 = max( dot( tvSeg, tvSeg ), 1e-4 );
    float tvAlong = dot( vTvWorld - cameraPosition, tvSeg ) / tvLen2;
    float tvOff = length( vTvWorld - cameraPosition - tvSeg * clamp( tvAlong, 0.0, 1.0 ) );
    float tvBetween = step( 0.0, tvAlong ) * ( 1.0 - smoothstep( 0.8, 0.95, tvAlong ) );
    tvA *= 1.0 - tvBetween * ( 1.0 - smoothstep( 0.45 * uFoliageFocus.w, uFoliageFocus.w, tvOff ) );
  }
  float tvFine = 1.0 - smoothstep( 0.02, 0.06, length( fwidth( vTvLeafP ) ) );
  tvA += ( tvLeafNoise( vTvLeafP * 17.0 ) - 0.5 ) * uFoliageClump.z * tvFine * step( 0.02, tvA );
  #ifdef USE_MAP
    vec2 tvTexels = vMapUv * vec2( textureSize( map, 0 ) );
    float tvMip = max( 0.0, 0.5 * log2( max( dot( dFdx( tvTexels ), dFdx( tvTexels ) ), dot( dFdy( tvTexels ), dFdy( tvTexels ) ) ) ) );
    // A134: atlases whose mips already keep their coverage (the cluster canopies) take no lift.
    #ifndef TV_COVERAGE_MIPS
    tvA *= 1.0 + 0.22 * tvMip;
    #endif
  #endif
  #ifdef ALPHA_TO_COVERAGE
    // A75: the ramp spans about two pixels, so card silhouettes soften instead of reading as hard cut-outs.
    // A107: on the crown's outer shell the ramp widens to about three and a half pixels, so the silhouette against the sky feathers
    // rather than reading as the cards' cut shapes; inside the crown it keeps its two. Continuous in depth: nothing pops.
    float tvRamp = 2.0 * mix( 1.0, 1.8, smoothstep( 0.55, 0.95, vCrownDepth ) );
    float tvCov = ( tvA - alphaTest ) / max( tvRamp * fwidth( tvA ), 1e-4 ) + 0.5;
    // A133: four samples give only five coverage steps, which read as a pixel staircase along every card edge. A stable
    // screen-space dither of a quarter step inside the ramp spreads them into a smooth gradient; it is fixed to the
    // pixel grid (no temporal noise) and never touches fully covered or empty pixels.
    float tvIgn = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
    float tvInRamp = step( 0.0, tvCov ) * step( tvCov, 1.0 );
    diffuseColor.a = clamp( tvCov + ( tvIgn - 0.5 ) * 0.25 * tvInRamp, 0.0, 1.0 );
    if ( diffuseColor.a <= 0.0 ) discard;
  #else
    // A133: without multisampling (Low) the cut is dithered over about a pixel and a half of alpha, so edges break
    // into a fine stable stipple rather than a hard staircase.
    float tvIgn = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
    if ( tvA < alphaTest + ( tvIgn - 0.5 ) * 1.5 * fwidth( tvA ) ) discard;
  #endif
}
#endif
`;

/** Three's light loop, noting each light's colour before its shadow is applied (for light through the leaves). */
function lightsWithUnshadowedColour(): string | null {
  const chunk = THREE.ShaderChunk.lights_fragment_begin;
  const pattern = /(get(?:Point|Spot|Sun|Directional)LightInfo\([^;]*\);)/g;
  const noted = chunk.replace(pattern, '$1\n\t\ttvLitColour = directLight.color;');
  return noted === chunk ? null : noted;
}

/** Thin-leaf light, wrapped around every light including lanterns, with its shadow already applied by Three. */
const LEAF_LIGHT_GLSL = /* glsl */ `
void RE_Direct_Foliage( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  float ndl = dot( geometryNormal, directLight.direction );
  // Thin leaves are lit a little past their terminator.
  float wrap = saturate( ( ndl + 0.4 ) / 1.4 ) - saturate( ndl );
  reflectedLight.directDiffuse += wrap * 0.55 * directLight.color * BRDF_Lambert( material.diffuseColor );
  // Light passing through toward the eye, strongest on the crown's outer shell. A leaf in the crown's own shadow still
  // passes some of it on, so a crown against the sun glows rather than going dark (A69).
  float behind = saturate( dot( - geometryViewDir, directLight.direction ) );
  float through = pow( behind, 4.0 ) * 1.25 + pow( behind, 1.4 ) * 0.18;
  float shell = 0.35 + 0.65 * smoothstep( 0.35, 1.0, vCrownDepth );
  vec3 throughColour = max( directLight.color, tvLitColour * uFoliageShadeThrough );
  reflectedLight.directDiffuse += throughColour * material.diffuseColor * uFoliageTransTint * through * shell * uFoliageLook.y;
}
#undef RE_Direct
#define RE_Direct RE_Direct_Foliage
`;

const LEAF_COLOUR_GLSL = /* glsl */ `
{
  // Leaf masses (A76): a clump's heart is fuller and the spaces between clumps fall into shade, so a crown reads as masses
  // of leaves rather than card after card.
  vec3 tvMassP = vTvLeafP / max( uFoliageClump.w, 0.05 );
  tvClump = tvLeafNoise( tvMassP ) * 0.6 + tvLeafNoise( tvMassP * 2.6 + 7.1 ) * 0.4;
  diffuseColor.rgb *= mix( 1.0 - uFoliageClump.y, 1.05, smoothstep( 0.22, 0.72, tvClump ) );
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
// A tuple distinguishes absent weights from every valid attribute name, and
// keeps an arbitrary caller key from impersonating another weight suffix.
const foliageOptionsKey = (weight: string | undefined, key?: string): string =>
  `|foliage-options:${JSON.stringify([key ?? null, weight ?? null])}`;

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
    uFoliageShadeThrough: { value: look.shadeThrough },
    uFoliageEdgeOn: { value: new THREE.Vector2(look.edgeOn[0], look.edgeOn[1]) },
    uFoliageClump: { value: new THREE.Vector4(look.clumps.gaps, look.clumps.shade, look.clumps.rough, look.clumps.size) },
    uFoliageFocus: FOLIAGE_FOCUS,
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
    const lights = lightsWithUnshadowedColour();
    const needs = ['#include <common>', '#include <color_fragment>', '#include <alphatest_fragment>', '#include <normal_fragment_maps>',
      '#include <lights_physical_pars_fragment>', '#include <lights_fragment_begin>', '#include <aomap_fragment>'];
    if (!lights || !needs.every((n) => f0.includes(n))) { failed = true; return; }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${LEAF_VERTEX_DECL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${LEAF_VERTEX_BODY}`);
    shader.fragmentShader = f0
      .replace('#include <common>', `#include <common>\n${LEAF_FRAGMENT_DECL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${LEAF_COLOUR_GLSL}`)
      // The distance dither (if any) follows the cut-out, as it followed Three's.
      .replace('#include <alphatest_fragment>', LEAF_ALPHA_TEST_GLSL)
      // A leaf depth pass (leafPrepass.ts) ends after its cut-out and the distance dither that follows it.
      .replace('#include <roughnessmap_fragment>', `#ifdef TV_LEAF_DEPTH_ONLY
        gl_FragColor = vec4( 0.0, 0.0, 0.0, diffuseColor.a );
        return;
        #endif
        #include <roughnessmap_fragment>`)
      // Three turns a double-sided card's normal toward the eye; a leaf takes its own face's normal, mostly the crown's,
      // so the far side of a crown seen through it is not shaded as if it faced the viewer (A69).
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = normalize( mix( normal * faceDirection, vCrownN, uFoliageLook.x ) );`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${LEAF_LIGHT_GLSL}`)
      .replace('#include <lights_fragment_begin>', lights)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        reflectedLight.indirectDiffuse *= mix( uFoliageLook.z, 1.0, smoothstep( 0.15, 1.0, vCrownDepth ) );
        ${LEAF_SKY_GLSL}`);
  };
  material.customProgramCacheKey = function() {
    return `${programKey.call(this)}|tervain-foliage-v2-${opts.leaf ? 'leaf' : 'wood'}${foliageOptionsKey(opts.weight, opts.key)}`;
  };
  material.needsUpdate = true;
  const result: InstalledFoliage = { uniforms: own, ok: () => !failed };
  installed.set(material, result);
  // Reachable from the material for review tooling (tools/cdp.mjs) that tunes the look in the running game.
  material.userData.tvFoliage = own;
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
  material.customProgramCacheKey = function() { return `${programKey.call(this)}|tervain-foliage-v1-shadow-${opts.leaf ? 'leaf' : 'wood'}${foliageOptionsKey(opts.weight)}`; };
  material.needsUpdate = true;
  installed.set(material, { uniforms: { uFoliage: wind.uFoliage }, ok: () => !failed });
}
