import * as THREE from 'three';
import { TREE_SWAY_MULTIPLIER, WIND_GLSL, type SwayUniforms } from './vegetation';
import { barkTextures, leafTexture, type BarkKind, type BarkTextures, type LeafKind } from './treeTextures';

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

/** Original metre-scale detail over the source atlas. Triplanar mapping avoids UV seams and
 * keeps grain density constant on uniformly enlarged trees. Only shading changes: no vertex
 * displacement, new silhouette, sway, or collision mismatch. Textures remain the caller's resources. */
export function installBarkDetail(material: THREE.MeshStandardMaterial, textures: Pick<BarkTextures, 'map' | 'surface'>): void {
  const compile = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey;
  material.onBeforeCompile = function(shader, renderer) {
    compile.call(this, shader, renderer);
    shader.uniforms.tvBarkColour = { value: textures.map };
    shader.uniforms.tvBarkSurface = { value: textures.surface };
    const varyings = `varying vec3 vTvBarkPosition; varying vec3 vTvBarkNormal;`;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${varyings}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 tvBarkPosition = vec4(transformed, 1.0);
        vec3 tvBarkNormal = objectNormal;
        #ifdef USE_INSTANCING
          tvBarkPosition = instanceMatrix * tvBarkPosition;
          tvBarkNormal = mat3(instanceMatrix) * tvBarkNormal;
        #endif
        vTvBarkPosition = (modelMatrix * tvBarkPosition).xyz;
        vTvBarkNormal = normalize(mat3(modelMatrix) * tvBarkNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        ${varyings}
        uniform sampler2D tvBarkColour;
        uniform sampler2D tvBarkSurface;
        vec4 tvBarkSample(sampler2D barkMap, vec3 p, vec3 weights) {
          return texture2D(barkMap, p.zy) * weights.x
               + texture2D(barkMap, p.xz) * weights.y
               + texture2D(barkMap, p.xy) * weights.z;
        }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 tvBarkWeights = pow(abs(normalize(vTvBarkNormal)), vec3(5.0));
        tvBarkWeights /= max(dot(tvBarkWeights, vec3(1.0)), 0.0001);
        // Each repeat covers 0.86m around the trunk and 1.40m vertically, at every instance scale.
        vec3 tvBarkCoordinates = vTvBarkPosition / vec3(0.86, 1.40, 0.86);
        vec3 tvBarkAlbedo = tvBarkSample(tvBarkColour, tvBarkCoordinates, tvBarkWeights).rgb;
        vec2 tvBarkReliefRoughness = tvBarkSample(tvBarkSurface, tvBarkCoordinates, tvBarkWeights).rg;
        float tvBarkClose = 1.0 - smoothstep(45.0, 100.0, length(vViewPosition));
        float tvBarkMacro = clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) * 4.0, 0.65, 1.35);
        diffuseColor.rgb = mix(diffuseColor.rgb, tvBarkAlbedo * tvBarkMacro, 0.45 * tvBarkClose);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, tvBarkReliefRoughness.y, tvBarkClose);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // Screen-space surface gradient of actual triplanar relief, in metres. This works on
        // root flares and branch joins without a tangent frame or discontinuous atlas borders.
        vec3 tvBarkSigmaX = dFdx(-vViewPosition);
        vec3 tvBarkSigmaY = dFdy(-vViewPosition);
        vec3 tvBarkR1 = cross(tvBarkSigmaY, normal);
        vec3 tvBarkR2 = cross(normal, tvBarkSigmaX);
        float tvBarkDet = dot(tvBarkSigmaX, tvBarkR1);
        float tvBarkHeight = tvBarkReliefRoughness.x * 0.012 * tvBarkClose;
        vec3 tvBarkGradient = sign(tvBarkDet) * (dFdx(tvBarkHeight) * tvBarkR1 + dFdy(tvBarkHeight) * tvBarkR2);
        if (abs(tvBarkDet) > 0.00000001) normal = normalize(abs(tvBarkDet) * normal - tvBarkGradient);`);
  };
  material.customProgramCacheKey = function() { return `${cacheKey.call(this)}|tervain-metre-bark-v2`; };
  material.needsUpdate = true;
}

export function woodMaterial(kind: BarkKind, sway: SwayUniforms): THREE.MeshStandardMaterial {
  let m = woodCache.get(kind);
  if (m) return m;
  const t = barkTextures(kind);
  m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, vertexColors: true, roughness: 0.96, metalness: 0 });
  m.normalScale.set(1.2, 1.2);
  m.onBeforeCompile = (s) => injectSway(s, sway);
  m.customProgramCacheKey = () => 'tervain-wood';
  installBarkDetail(m, barkTextures(kind, 1024));
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
