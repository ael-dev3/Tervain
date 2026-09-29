import * as THREE from 'three';
import { TREE_SWAY_MULTIPLIER, WIND_GLSL, type SwayUniforms } from './vegetation';
import { barkTextures, leafTexture, type BarkKind, type LeafKind } from './treeTextures';

/**
 * Tree materials: standard PBR with vertex colour tint, bark with a normal map, alpha-cut leaf cards with alpha-to-coverage
 * (so the edges are smooth when multisampling is on). The rooted-sway shader is retained, but tree and leaf motion is
 * paused for this patch; ground-cover wind remains separate. Leaves also glow a little when the sun is behind them.
 */

const SWAY_VERT = /* glsl */ `
attribute float aSway;
uniform float uTime;
uniform float uWind;
${WIND_GLSL}
`;

function injectSway(shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string }, u: SwayUniforms) {
  shader.uniforms.uTime = u.uTime;
  shader.uniforms.uWind = u.uWind;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${SWAY_VERT}`)
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        transformed += tvSwayLocal(instanceMatrix, aSway, uTime, uWind * ${TREE_SWAY_MULTIPLIER.toFixed(1)});
      #endif`,
    );
}

const woodCache = new Map<BarkKind, THREE.MeshStandardMaterial>();
const leafCache = new Map<LeafKind, THREE.MeshStandardMaterial>();

export function woodMaterial(kind: BarkKind, sway: SwayUniforms): THREE.MeshStandardMaterial {
  let m = woodCache.get(kind);
  if (m) return m;
  const t = barkTextures(kind);
  m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, vertexColors: true, roughness: 0.96, metalness: 0 });
  m.normalScale.set(1.2, 1.2);
  m.onBeforeCompile = (s) => injectSway(s, sway);
  m.customProgramCacheKey = () => 'tervain-wood';
  woodCache.set(kind, m);
  return m;
}

export function leafMaterial(kind: LeafKind, sway: SwayUniforms): THREE.MeshStandardMaterial {
  let m = leafCache.get(kind);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({ map: leafTexture(kind), vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.42, alphaToCoverage: true });
  m.onBeforeCompile = (s) => {
    injectSway(s, sway);
    // Our normals point out of the crown on both faces of a card: never flip them for the back face.
    s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
    // Backlight: sunlight coming through the leaf.
    s.fragmentShader = s.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      `#include <lights_fragment_begin>
      #if NUM_DIR_LIGHTS > 0
      {
        vec3 tvL = normalize(directionalLights[0].direction);
        float tvBack = pow(clamp(-dot(normalize(vViewPosition), tvL), 0.0, 1.0), 2.0);
        float tvFront = clamp(dot(geometryNormal, tvL), 0.0, 1.0);
        reflectedLight.indirectDiffuse += diffuseColor.rgb * directionalLights[0].color * tvBack * (1.0 - tvFront) * 0.55;
      }
      #endif`,
    );
  };
  m.customProgramCacheKey = () => 'tervain-leaf';
  leafCache.set(kind, m);
  return m;
}

export function disposeTreeMaterials() {
  for (const m of woodCache.values()) m.dispose();
  for (const m of leafCache.values()) m.dispose();
  woodCache.clear();
  leafCache.clear();
}
