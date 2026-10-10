import * as THREE from 'three';

/**
 * Skin detail for the wanderer (A75). The Meshy 7.1 body's texture paints every patch of skin one flat, even pink, with
 * no pores, creases or colour, so his forearms and hands shaded like smooth plastic (owner playtest). Where the texture
 * is skin-coloured, this adds what it lacks, from the model's own bind-space position so it stays on the body as he
 * moves: a fine pore grain and a broader, soft mottling in the colour, and a matching relief in the lighting.
 *
 * Skin is found by colour: in linear terms the texture's skin is about (0.48, 0.27, 0.18); the leather is far darker and
 * the linen shirt has no red bias, so neither is touched.
 */
export const SKIN_DETAIL_KEY = 'tervain-skin-detail-a75';

/** How strong the detail is: colour variation (fraction), pore relief (metres of bump per unit of height). */
export const SKIN_DETAIL = { mottle: 0.3, pores: 0.1, bump: 0.006 } as const;

const NOISE = /* glsl */ `
float tvSkinHash( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float tvSkinNoise( vec3 x ) {
  vec3 i = floor( x ), f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( tvSkinHash( i ), tvSkinHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( tvSkinHash( i + vec3( 0, 1, 0 ) ), tvSkinHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
    mix( mix( tvSkinHash( i + vec3( 0, 0, 1 ) ), tvSkinHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( tvSkinHash( i + vec3( 0, 1, 1 ) ), tvSkinHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
`;

export function installSkinDetail(material: THREE.MeshStandardMaterial): void {
  if (material.userData.tvSkinDetail) return;
  material.userData.tvSkinDetail = true;
  const compile = material.onBeforeCompile, programKey = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTvSkinPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTvSkinPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vTvSkinPos;\nfloat tvSkinMask = 0.0;\nfloat tvSkinHeight = 0.0;\n${NOISE}`)
      .replace('#include <map_fragment>', /* glsl */ `#include <map_fragment>
{
  vec3 c = diffuseColor.rgb;
  float redBias = c.r / max( c.g, 1e-3 );
  tvSkinMask = smoothstep( 0.28, 0.38, c.r ) * smoothstep( 1.35, 1.55, redBias ) * ( 1.0 - smoothstep( 2.4, 3.0, redBias ) );
  if ( tvSkinMask > 0.0 ) {
    vec3 p = vTvSkinPos;
    // The pore grain fades out once a pixel covers several pores, so it never shimmers at a distance.
    float footprint = length( fwidth( p ) );
    float poreFade = 1.0 - smoothstep( 0.0015, 0.005, footprint );
    float pores = mix( 0.5, tvSkinNoise( p * 380.0 ) * 0.6 + tvSkinNoise( p * 900.0 ) * 0.4, poreFade );
    float mottle = tvSkinNoise( p * 22.0 ) * 0.6 + tvSkinNoise( p * 55.0 ) * 0.4;
    // Broad forms under the skin: muscle and tendon masses a few centimetres across, and fine hair, darker, on the arms.
    float forms = tvSkinNoise( p * vec3( 9.0, 16.0, 16.0 ) ) * 0.65 + tvSkinNoise( p * vec3( 18.0, 34.0, 34.0 ) ) * 0.35;
    float hair = smoothstep( 0.72, 0.9, tvSkinNoise( p * vec3( 260.0, 1400.0, 1400.0 ) ) ) * poreFade * smoothstep( 0.25, 0.45, abs( p.x ) );
    // Warmer and cooler patches, a little sun on the backs of the hands, and the pore grain.
    vec3 tint = mix( vec3( 1.04, 0.95, 0.92 ), vec3( 0.95, 1.0, 1.03 ), mottle );
    float value = 1.0 + ( mottle - 0.5 ) * ${SKIN_DETAIL.mottle.toFixed(3)} * 2.0 - ( pores - 0.5 ) * ${SKIN_DETAIL.pores.toFixed(3)} * 2.0
      + ( forms - 0.5 ) * 0.18 - hair * 0.22;
    diffuseColor.rgb = mix( c, c * tint * value, tvSkinMask );
    tvSkinHeight = ( forms * 0.7 + pores * 0.2 + mottle * 0.1 ) * tvSkinMask;
  }
}`)
      .replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
if ( tvSkinMask > 0.0 ) {
  // Relief from the detail's own height, as a bump map perturbs the normal.
  vec2 dH = vec2( dFdx( tvSkinHeight ), dFdy( tvSkinHeight ) ) * ${SKIN_DETAIL.bump.toFixed(5)} / max( length( fwidth( vTvSkinPos ) ), 1e-5 );
  vec3 vSigmaX = normalize( dFdx( - vViewPosition ) ), vSigmaY = normalize( dFdy( - vViewPosition ) );
  vec3 R1 = cross( vSigmaY, normal ), R2 = cross( normal, vSigmaX );
  float fDet = dot( vSigmaX, R1 );
  vec3 grad = sign( fDet ) * ( dH.x * R1 + dH.y * R2 );
  normal = normalize( abs( fDet ) * normal - grad );
}`);
  };
  material.customProgramCacheKey = function () { return `${programKey.call(this)}|${SKIN_DETAIL_KEY}`; };
  material.needsUpdate = true;
}
