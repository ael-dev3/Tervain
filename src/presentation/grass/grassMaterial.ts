import * as THREE from 'three';
import { GUST_SPAN, TURBULENCE_SPAN, type GrassWind } from './wind';
import type { GrassTrample } from './trample';
import { RANK_HEADROOM } from '../ground/tileStream';

/**
 * The grass material: Three's Lambert lighting (so sun, shadows, lanterns, hemisphere light and fog all reach the grass
 * the way they reach everything else) with the blade itself built in the vertex shader.
 *
 * Per blade, from the clump's seed: a root in the clump (a sunflower spiral with jitter), a height and width, a rest
 * lean outward from the tuft, a kind (leaf, a flowering stem with a seed head, a flower). The blade is a quadratic
 * Bézier from its root to a tip tilted by its rest lean, the wind and anything pushing through, rescaled so a bent blade
 * keeps its length instead of stretching. Its normal faces the viewer's side and rounds toward its edges.
 *
 * Wind: gust fronts (a scrolled noise field, see wind.ts) lean whole bands of grass downwind; each blade also flutters
 * at its own frequency (shorter blades faster), harder inside a gust. Interaction: the trample field (trample.ts)
 * pushes blades aside and lays them down. Distance: clumps thin in a stable order and the survivors widen, and a mesh
 * can be limited to a distance band so two levels of detail hand over smoothly; blades never pop, they narrow away.
 *
 * Light: wrapped diffuse for thin leaves, light through the blade when the sun (or a lantern) is behind it, a soft
 * sheen where blades turn to the light, darker roots in the tuft and paler, sun-bleached tips.
 *
 * Every mesh drawn with it must keep an identity transform: blades are placed in world space.
 */

export interface GrassLook {
  /** Light left at the root of a blade inside the tuft, 0..1. */
  rootShade: number;
  /** How far the tips bleach toward straw and lift. */
  tipLift: number;
  /** Light through the blades from behind. */
  translucency: number;
  /** Sheen of blades turned toward the light. */
  sheen: number;
  /** Colour of light that has passed through a blade (multiplies the blade colour). */
  transTint: THREE.Color;
}

export interface GrassClumpLook {
  /** Clump radius, blade width and blade height at scale 1 (m); blades in the clump. */
  radius: number;
  width: number;
  height: number;
  blades: number;
}

export interface GrassFade {
  /** Distance thinning starts and ends (nothing beyond), how much wider blades grow far away, falloff power. */
  start: number;
  end: number;
  sizeComp: number;
  power: number;
}

export interface GrassBand {
  inStart: number;
  inEnd: number;
  outStart: number;
  outEnd: number;
}

export interface GrassMaterialOptions {
  wind: GrassWind;
  trample?: GrassTrample | null;
  clump: GrassClumpLook;
  fade: GrassFade;
  band?: GrassBand;
  look: GrassLook;
  /** Share of a clump's blades still drawn at the far end of the thinning. */
  farBlades?: number;
  /** Further changes to the compiled shader (the menu's spirit light), and a key naming them. */
  patch?: (shader: { uniforms: Record<string, THREE.IUniform>; fragmentShader: string; vertexShader: string }) => void;
  patchKey?: string;
}

export interface GrassUniforms {
  uClump: THREE.IUniform<THREE.Vector4>;
  uFade: THREE.IUniform<THREE.Vector4>;
  uBand: THREE.IUniform<THREE.Vector4>;
  uLook: THREE.IUniform<THREE.Vector4>;
  uTransTint: THREE.IUniform<THREE.Color>;
  uFarBlades: THREE.IUniform<number>;
}

const f = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

export const GRASS_VERTEX_DECL = /* glsl */ `
attribute vec4 aBase;
attribute vec4 aShape;
attribute vec4 aTint;
attribute vec4 aSlope;
uniform float uGrassTime;
uniform vec4 uWindDir;
uniform vec4 uGustScroll;
uniform sampler2D tGust;
uniform vec4 uTrample;
uniform sampler2D tTrample;
uniform vec4 uClump;
uniform vec4 uFade;
uniform vec4 uBand;
uniform vec4 uLook;
uniform float uFarBlades;
varying vec3 vGCol;
varying vec4 vGInfo;
float gHash(float n) { return fract(sin(n) * 43758.5453123); }
`;

/** Builds the blade; sets `objectNormal` and `gBladePos` (world space). Replaces <beginnormal_vertex>. */
export const GRASS_BLADE_GLSL = /* glsl */ `
float gBlade = position.x;
float gT = position.y;
float gEdge = position.z;
float gSeed = aShape.w * 1031.0 + gBlade * 7.317;
float gR1 = gHash(gSeed + 0.131);
float gR2 = gHash(gSeed + 1.713);
float gR3 = gHash(gSeed + 2.977);
float gR4 = gHash(gSeed + 4.431);
float gR5 = gHash(gSeed + 5.897);
float gR6 = gHash(gSeed + 7.219);
float gR7 = gHash(gSeed + 9.137);

// Distance: a stable thinning order per clump, a band for level-of-detail hand-over, and fewer blades per clump far off.
float gDist = distance(aBase.xyz, cameraPosition);
float gQ = pow(1.0 - smoothstep(uFade.x, uFade.y, gDist), uFade.w);
float gKeep = smoothstep(0.0, 0.12, gQ * ${RANK_HEADROOM.toFixed(2)} - aBase.w);
float gBandK = smoothstep(uBand.x, uBand.y, gDist) * (1.0 - smoothstep(uBand.z, uBand.w, gDist));
float gFrac = (gBlade + 0.5) / uClump.w;
float gShare = mix(1.0, uFarBlades, smoothstep(uFade.x, uFade.y, gDist));
float gBladeKeep = 1.0 - smoothstep(gShare - 0.06, gShare, gFrac);
float gPresence = gKeep * gBandK * gBladeKeep;
float gSizeComp = mix(1.0, uFade.z, 1.0 - gQ) * mix(1.0, 1.0 / max(gShare, 0.3), 0.5);

// Root in the clump, on the ground plane fitted under it.
float gAng = gBlade * 2.39996 + gR1 * 1.3 + aShape.x;
float gRad = uClump.x * aShape.y * sqrt(gFrac) * (0.72 + 0.56 * gR2);
vec2 gRoot = vec2(cos(gAng), sin(gAng)) * gRad;
vec2 gRootW = aBase.xz + gRoot;
float gGround = aBase.y + dot(aSlope.xy, gRoot);

// What grows here: mostly leaves; some flowering stems with a seed head; a few flowers.
float gStem = step(gR5, aSlope.w * 0.72);
float gFlower = step(aSlope.w * 0.72, gR5) * step(gR5, aSlope.w);
float gDry = step(gR6, aSlope.z);
float gH = uClump.z * aShape.z * (0.5 + 0.55 * gR2 * gR2 + 0.3 * gR3) * (1.0 + 0.32 * gStem + 0.1 * gFlower);
float gW = uClump.y * (0.6 + 0.75 * gR3) * gSizeComp * gPresence * (1.0 - 0.72 * max(gStem, gFlower));

// Wind: a gust front leaning whole bands of grass, and each blade's own flutter inside it.
vec2 gWd = uWindDir.xy;
vec2 gWc = vec2(-gWd.y, gWd.x);
float gLarge = texture2D(tGust, (gRootW - uGustScroll.xy) * ${f(1 / GUST_SPAN)}).r;
float gSmall = texture2D(tGust, (gRootW - uGustScroll.zw) * ${f(1 / TURBULENCE_SPAN)}).g;
float gGust = smoothstep(0.38, 0.88, gLarge);
float gPush = uWindDir.z + uWindDir.w * gGust;
float gPliant = 0.5 + 0.7 * smoothstep(0.1, 0.85, gH);
float gFreq = 1.5 + 1.7 * gR4 + 0.55 / max(gH, 0.12);
float gPhase = gR1 * 6.2832 + dot(gRootW, gWd) * 0.62;
float gFlutter = sin(uGrassTime * gFreq + gPhase) * (0.3 + 0.7 * gSmall);
float gSway = sin(uGrassTime * gFreq * 0.37 + gPhase * 0.5 + 1.1);
vec2 gWindTilt = (gWd * (gPush * 0.92 + gFlutter * (0.06 + 0.2 * gPush) + gSway * 0.05)
  + gWc * gFlutter * (0.03 + 0.07 * gPush)) * gPliant;

// Anything that has pushed through: aside, and laid down.
vec4 gTr = vec4(0.0);
if (uTrample.w > 0.5) {
  vec2 gUV = (gRootW - uTrample.xy) / uTrample.z;
  if (gUV.x > 0.0 && gUV.y > 0.0 && gUV.x < 1.0 && gUV.y < 1.0) gTr = texture2D(tTrample, gUV);
}
float gLying = clamp(gTr.z, 0.0, 1.0);
vec2 gPushTilt = gTr.xy * 1.15;

// Rest lean: outward from the tuft, a little random; flowering stems stand straighter, and some old leaves droop.
vec2 gOut = gRoot / max(length(gRoot), 1e-4);
float gDroop = step(0.8, gR7) * (1.0 - gStem) * (1.0 - gFlower) * (0.3 + 0.5 * gR2);
vec2 gRest = (gOut * 0.62 + vec2(gR4 - 0.5, gR3 - 0.5) * 0.75) * (0.14 + 0.34 * gR1 + gDroop) * (1.0 - 0.55 * gStem);
vec2 gTilt = gRest + gWindTilt * (1.0 - 0.75 * gLying) + gPushTilt;
float gTiltLen = length(gTilt);
vec2 gTiltDir = gTiltLen > 1e-4 ? gTilt / gTiltLen : gWd;
float gAngle = min(gTiltLen + gLying * 1.2, 1.5);
float gSa = sin(gAngle), gCa = cos(gAngle);
// A quadratic Bezier, rescaled to the blade's own length so bending never stretches it.
vec3 gP1 = vec3(gTiltDir.x * gSa * 0.28, 0.62 * cos(gAngle * 0.55), gTiltDir.y * gSa * 0.28);
vec3 gP2 = vec3(gTiltDir.x * gSa, gCa, gTiltDir.y * gSa);
float gArc = (length(gP1) + length(gP2 - gP1) + length(gP2)) * 0.5;
float gLen = gH / max(gArc, 1e-3);
gP1 *= gLen;
gP2 *= gLen;
float gU = 1.0 - gT;
vec3 gCurve = 2.0 * gU * gT * gP1 + gT * gT * gP2;
vec3 gTangent = normalize(2.0 * gU * gP1 + 2.0 * gT * (gP2 - gP1) + vec3(0.0, 1e-4, 0.0));

// Width profile: leaves taper to a point; stems stay thin under a spindle of seed; flowers hold a small head.
float gLeaf = pow(max(gU, 0.0), 0.72) * (1.0 + 0.22 * sin(gT * 3.1416));
float gHead = smoothstep(0.66, 0.82, gT) * (1.0 - smoothstep(0.9, 1.0, gT));
float gBloom = smoothstep(0.8, 0.88, gT) * (1.0 - smoothstep(0.96, 1.0, gT));
float gProfile = gLeaf * (1.0 - gStem - gFlower) + (0.22 + gHead * 2.3) * gStem + (0.16 + gBloom * 3.4) * gFlower;
// The blade's face turns with its root angle, then partly toward the viewer so few blades are seen edge-on.
float gFace = gAng + 1.5708 + (gR2 - 0.5) * 2.0;
vec3 gAcross = vec3(cos(gFace), 0.0, sin(gFace));
vec3 gToEye = cameraPosition - vec3(gRootW.x, gGround, gRootW.y);
vec2 gEyeH = normalize(gToEye.xz + vec2(1e-4, 0.0));
vec2 gSideEye = vec2(-gEyeH.y, gEyeH.x);
vec2 gAcrossH = normalize(mix(gAcross.xz, gSideEye * sign(dot(gAcross.xz, gSideEye) + 1e-4), 0.35));
gAcross = vec3(gAcrossH.x, 0.0, gAcrossH.y);
vec3 gBladePos = vec3(gRootW.x, gGround, gRootW.y) + gCurve + gAcross * (gEdge * 0.5 * gW * gProfile);

// Normal: the face, turned to the viewer's side, rounded toward the edges and drawn a little toward the sky.
vec3 gN = normalize(cross(gAcross, gTangent));
if (dot(gN, gToEye) < 0.0) gN = -gN;
gN = normalize(gN + gAcross * gEdge * 0.42);
vec3 objectNormal = normalize(mix(gN, vec3(0.0, 1.0, 0.0), 0.26));

// Colour: the clump's tint varied per blade; darker in the tuft, paler and drier toward the tips.
float gHue = gHash(aShape.w * 311.0) - 0.5;
vec3 gBase = aTint.rgb * (0.84 + 0.3 * gR3) * vec3(1.0 + gHue * 0.16, 1.0 + gHue * 0.05, 1.0 - gHue * 0.22);
float gLuma = dot(aTint.rgb, vec3(0.299, 0.587, 0.114));
vec3 gStraw = vec3(0.86, 0.72, 0.44) * gLuma * 1.85;
gBase = mix(gBase, gStraw, max(gDry * 0.8, gStem * 0.62) * smoothstep(0.0, 0.75, gT + 0.2));
gBase = mix(gBase, gBase * vec3(1.14, 1.08, 0.8) + vec3(0.012, 0.01, 0.0), smoothstep(0.6, 1.0, gT) * uLook.y);
// Heather clumps (a reddish tint) bloom purple; elsewhere the flowers are white, yellow and violet.
float gHeather = smoothstep(0.0, 0.035, aTint.r - aTint.g);
vec3 gPetal = gR1 < 0.42 ? vec3(0.82, 0.8, 0.7) : gR1 < 0.74 ? vec3(0.86, 0.62, 0.1) : vec3(0.42, 0.2, 0.48);
gPetal = mix(gPetal, vec3(0.5, 0.22, 0.46) * (0.85 + 0.3 * gR2), gHeather);
gBase = mix(gBase, gPetal * 0.75, gFlower * gBloom);
float gRootShade = mix(uLook.x, 1.0, smoothstep(0.0, 0.7, gT));
vGCol = gBase * gRootShade;
// Light passes through the thin upper blade (the base is buried in the tuft) and sets seed heads and petals glowing;
// shaded ground (under crowns) passes less sun.
float gThrough = 0.06 + 0.7 * smoothstep(0.15, 1.0, gT) + 0.24 * gT * gT * gT + gStem * gHead * 1.3 + gFlower * gBloom * 0.7;
vGInfo = vec4(gT, gEdge, uLook.z * aTint.w * gThrough * (1.0 - 0.6 * gLying), uLook.w * aTint.w * (0.35 + 0.65 * gT));
`;

export const GRASS_FRAGMENT_DECL = /* glsl */ `
varying vec3 vGCol;
varying vec4 vGInfo;
uniform vec3 uTransTint;
`;

/** Lambert for thin leaves: wrapped diffuse, light through the blade, and a sheen. Every light (and its shadow) uses it. */
export const GRASS_LIGHT_GLSL = /* glsl */ `
void RE_Direct_Grass( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
  float ndl = dot( geometryNormal, directLight.direction );
  float wrapped = saturate( ( ndl + 0.42 ) / 1.42 );
  reflectedLight.directDiffuse += wrapped * directLight.color * BRDF_Lambert( material.diffuseColor );
  // Behind the blade: light passing through it toward the eye.
  float behind = saturate( dot( - geometryViewDir, directLight.direction ) );
  float through = pow( behind, 5.0 ) * 1.6 + pow( behind, 1.6 ) * 0.22;
  reflectedLight.directDiffuse += directLight.color * material.diffuseColor * uTransTint * through * vGInfo.z;
  // A soft sheen where blades turn to the light.
  vec3 halfway = normalize( directLight.direction + geometryViewDir );
  float sheen = pow( saturate( dot( geometryNormal, halfway ) ), 18.0 ) * saturate( ndl + 0.25 );
  reflectedLight.directDiffuse += directLight.color * sheen * vGInfo.w * 0.3;
}
#undef RE_Direct
#define RE_Direct RE_Direct_Grass
`;

const NORMAL_BEGIN = THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '');

export interface GrassMaterial {
  material: THREE.MeshLambertMaterial;
  uniforms: GrassUniforms;
  /** False if a Three update changed the chunks the material relies on (the grass then hides itself). */
  ok(): boolean;
  setBand(band: GrassBand): void;
}

export function createGrassMaterial(opts: GrassMaterialOptions): GrassMaterial {
  const band = opts.band ?? { inStart: -2, inEnd: -1, outStart: 1e6, outEnd: 1e6 + 1 };
  const uniforms: GrassUniforms = {
    uClump: { value: new THREE.Vector4(opts.clump.radius, opts.clump.width, opts.clump.height, opts.clump.blades) },
    uFade: { value: new THREE.Vector4(opts.fade.start, opts.fade.end, opts.fade.sizeComp, opts.fade.power) },
    uBand: { value: new THREE.Vector4(band.inStart, band.inEnd, band.outStart, band.outEnd) },
    uLook: { value: new THREE.Vector4(opts.look.rootShade, opts.look.tipLift, opts.look.translucency, opts.look.sheen) },
    uTransTint: { value: opts.look.transTint.clone() },
    uFarBlades: { value: Math.min(1, Math.max(0.1, opts.farBlades ?? 0.5)) },
  };
  const trample = opts.trample?.uniforms ?? { tTrample: { value: null }, uTrample: { value: new THREE.Vector4(0, 0, 1, 0) } };
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  material.name = 'Tervain grass blades';
  // The gust field is injected at compile time; expose it so first-view preparation uploads it with everything else.
  material.userData.preparationTextures = [opts.wind.uniforms.tGust.value];
  let failed = false;
  material.onBeforeCompile = (shader) => {
    const v0 = shader.vertexShader, f0 = shader.fragmentShader;
    const needV = ['#include <common>', '#include <beginnormal_vertex>', '#include <begin_vertex>'];
    const needF = ['#include <common>', '#include <color_fragment>', '#include <normal_fragment_begin>', '#include <lights_lambert_pars_fragment>'];
    if (!needV.every((m) => v0.includes(m)) || !needF.every((m) => f0.includes(m)) || !THREE.ShaderChunk.normal_fragment_begin.includes('normal *= faceDirection;')) {
      failed = true;
      console.warn('grass shader chunks changed; grass hidden');
      shader.fragmentShader = 'void main() { discard; }';
      return;
    }
    Object.assign(shader.uniforms, opts.wind.uniforms, trample, uniforms);
    shader.vertexShader = v0
      .replace('#include <common>', `#include <common>\n${GRASS_VERTEX_DECL}`)
      .replace('#include <beginnormal_vertex>', GRASS_BLADE_GLSL)
      .replace('#include <begin_vertex>', 'vec3 transformed = gBladePos;');
    shader.fragmentShader = f0
      .replace('#include <common>', `#include <common>\n${GRASS_FRAGMENT_DECL}`)
      .replace('#include <color_fragment>', 'diffuseColor.rgb = vGCol;')
      .replace('#include <normal_fragment_begin>', NORMAL_BEGIN)
      .replace('#include <lights_lambert_pars_fragment>', `#include <lights_lambert_pars_fragment>\n${GRASS_LIGHT_GLSL}`);
    opts.patch?.(shader);
  };
  material.customProgramCacheKey = () => `tervain-grass-blades-v1${opts.patchKey ? `-${opts.patchKey}` : ''}`;
  return {
    material, uniforms, ok: () => !failed,
    setBand(b) { uniforms.uBand.value.set(b.inStart, b.inEnd, b.outStart, b.outEnd); },
  };
}
