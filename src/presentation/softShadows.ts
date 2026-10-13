import * as THREE from 'three';

/**
 * Sun shadows that soften with the distance to their caster (A137), a cheap PCSS done with comparison samples only.
 *
 * Three's PCF shadow reads a comparison sampler, so the depth of a blocker can't be read. It can still be bracketed: a
 * comparison made a few metres nearer the light than the receiver says whether the blocker stands that far above it.
 * Five rotated taps across the widest penumbra find whether the pixel is near an edge at all; only there do two more
 * brackets say how far the blockers are, and an eight-tap disc of that size gives the edge. Ground with no edge in reach,
 * lit or shaded, pays six taps (Three's PCF took five). A fence post or a foot keeps
 * a crisp contact shadow, while a house's shadow fifteen metres from its eaves gets a soft edge, as the sun's disc and
 * the sky around it give a real one.
 *
 * It applies to a shadow whose `radius` is negative (the sun's); other shadows keep Three's PCF.
 */

/** Width of the sun's orthographic shadow frustum (metres) and its depth range (far - near), set in sky.ts. */
export const SUN_SHADOW_SPAN = 140;
export const SUN_SHADOW_DEPTH = 399;
/** Penumbra half-width per metre between caster and receiver, its floor (a contact shadow) and ceiling (metres). */
export const PENUMBRA_PER_METRE = 0.028;
export const PENUMBRA_MIN = 0.035;
export const PENUMBRA_MAX = 0.42;
/** Where the sun's shadow fades out, as shares of the map's half-width from its centre (playtest 6: a hard square edge). */
export const SUN_SHADOW_FADE = [0.72, 0.97] as const;
/** `shadow.radius` that selects these soft shadows. */
export const SOFT_SUN_SHADOW = -1;

const f = (n: number) => n.toFixed(5);

const SOFT_PCF = /* glsl */ `
		float tvShadowTap( sampler2DShadow shadowMap, vec2 uv, float z ) {
			return texture( shadowMap, vec3( uv, z ) );
		}

		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {

			float shadow = 1.0;

			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;

			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;

			if ( frustumTest ) {

				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;

				if ( shadowRadius >= 0.0 ) {

					float radius = shadowRadius * texelSize.x;
					shadow = 0.0;
					for ( int i = 0; i < 5; i ++ ) shadow += tvShadowTap( shadowMap, shadowCoord.xy + vogelDiskSample( i, 5, phi ) * radius, shadowCoord.z );
					shadow *= 0.2;

				} else {

					// Metres to shadow-map units across and in depth.
					const float across = 1.0 / ${f(SUN_SHADOW_SPAN)};
					const float deep = 1.0 / ${f(SUN_SHADOW_DEPTH)};
					float minR = max( ${f(PENUMBRA_MIN)} * across, texelSize.x );
					float maxR = max( ${f(PENUMBRA_MAX)} * across, texelSize.x * 2.0 );

					// Search the widest penumbra: is any blocker in reach, and at which brackets of height above us?
					float lit = 0.0, near2 = 0.0, near7 = 0.0;
					for ( int i = 0; i < 5; i ++ ) {
						vec2 uv = shadowCoord.xy + vogelDiskSample( i, 5, phi ) * maxR;
						lit += tvShadowTap( shadowMap, uv, shadowCoord.z );
					}

					// No edge within the widest penumbra: fully lit or fully shaded, five taps as Three's own PCF.
					// The pixel's own tap too, so a thin shadow (a rail, a blade) between the ring's taps is never lost.
					float centre = tvShadowTap( shadowMap, shadowCoord.xy, shadowCoord.z );
					if ( ( lit > 4.99 && centre > 0.99 ) || ( lit < 0.01 && centre < 0.01 ) ) {

						shadow = centre;

					} else {

						for ( int i = 0; i < 5; i ++ ) {
							vec2 uv = shadowCoord.xy + vogelDiskSample( i, 5, phi + 1.3 ) * maxR;
							near2 += tvShadowTap( shadowMap, uv, shadowCoord.z - 2.0 * deep );
							near7 += tvShadowTap( shadowMap, uv, shadowCoord.z - 7.0 * deep );
						}
						float blocked = max( 5.0 - lit, 0.5 );
						// Blockers more than 2 m and 7 m above the receiver, as shares of all blockers found.
						float far2 = clamp( ( 5.0 - near2 ) / blocked, 0.0, 1.0 );
						float far7 = clamp( ( 5.0 - near7 ) / blocked, 0.0, 1.0 );
						float metres = mix( 0.6, 4.5, far2 ) + far7 * 9.0;
						float radius = clamp( metres * ${f(PENUMBRA_PER_METRE)} * across, minR, maxR );
						shadow = 0.0;
						for ( int i = 0; i < 8; i ++ ) shadow += tvShadowTap( shadowMap, shadowCoord.xy + vogelDiskSample( i, 8, phi ) * radius, shadowCoord.z );
						shadow *= 0.125;

					}

					// The map covers a square about the player: beyond it nothing is shadowed. Fade the sun's shadow out over the map's
					// outer band so that edge is never a line of light following him (playtest 6).
					float edge = max( abs( shadowCoord.x - 0.5 ), abs( shadowCoord.y - 0.5 ) ) * 2.0;
					shadow = mix( shadow, 1.0, smoothstep( ${f(SUN_SHADOW_FADE[0])}, ${f(SUN_SHADOW_FADE[1])}, edge ) );

				}

			}

			return mix( 1.0, shadow, shadowIntensity );

		}

	#elif defined( SHADOWMAP_TYPE_VSM )`;

let installed = false;

/** Patches Three's shadow chunk once, before any material is compiled. Returns whether the patch is in place. */
export function installSoftSunShadows(): boolean {
  if (installed) return true;
  const chunk = THREE.ShaderChunk.shadowmap_pars_fragment;
  const start = chunk.indexOf('float getShadow( sampler2DShadow shadowMap');
  const end = chunk.indexOf('#elif defined( SHADOWMAP_TYPE_VSM )', start);
  if (start < 0 || end < 0) {
    console.warn('[tervain] soft sun shadows: Three shadow chunk changed; keeping its PCF');
    return false;
  }
  (THREE.ShaderChunk as Record<string, string>).shadowmap_pars_fragment = chunk.slice(0, start) + SOFT_PCF.trimStart() + chunk.slice(end + '#elif defined( SHADOWMAP_TYPE_VSM )'.length);
  installed = true;
  return true;
}

/**
 * Shadow maps drawn into depth alone (Air budget). Three's PCF shadow target carries an RGBA8 colour buffer beside the
 * depth texture the shaders compare against; nothing reads the colour, yet every caster fragment wrote its packed depth
 * there (and the clear filled it), at 4096 px on High 64 MB of writes a frame. Colour writes are masked off for the
 * shadow pass; the depth, and so every shadow, is unchanged.
 */
export function installDepthOnlyShadowPass(renderer: THREE.WebGLRenderer): void {
  const shadowMap = renderer.shadowMap as THREE.WebGLShadowMap & { tvDepthOnly?: boolean };
  if (shadowMap.tvDepthOnly) return;
  shadowMap.tvDepthOnly = true;
  const render = shadowMap.render;
  const color = renderer.state.buffers.color;
  shadowMap.render = function (this: THREE.WebGLShadowMap, ...args: Parameters<THREE.WebGLShadowMap['render']>) {
    color.setMask(false);
    color.setLocked(true);
    try {
      render.apply(this, args);
    } finally {
      color.setLocked(false);
      color.setMask(true);
    }
  };
}
