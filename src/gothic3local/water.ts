import * as THREE from 'three';
import { propNumber } from './genome';
import type { ShaderGraph } from './material';
import type { MaterialOptions } from './shading';

/**
 * Water for Gothic 3's ocean and river shaders (`eCShaderOcean`, `eCShaderRiver`). Their graphs reflect the sky dome and
 * blend wave textures; the shader's own properties give a fresnel constant, a reflection colour and how far each
 * colour channel carries in the water (half-lives). This material keeps those properties and draws its own waves and
 * reflections: a view-dependent mix of the sky and the water's colour, a sun glint, and gently moving normals.
 */

export interface WaterUniforms {
  skyZenith: { value: THREE.Color };
  skyHorizon: { value: THREE.Color };
  sunDirection: { value: THREE.Vector3 };
  sunColor: { value: THREE.Color };
}

export function waterUniforms(): WaterUniforms {
  return {
    skyZenith: { value: new THREE.Color(0.35, 0.5, 0.65) },
    skyHorizon: { value: new THREE.Color(0.75, 0.75, 0.7) },
    sunDirection: { value: new THREE.Vector3(0, 1, 0) },
    sunColor: { value: new THREE.Color(1, 1, 1) },
  };
}

function colorProp(graph: ShaderGraph, key: string, fallback: [number, number, number]): THREE.Color {
  const v = graph.shader.props.get(key);
  if (Array.isArray(v) && v.length >= 3) return new THREE.Color(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
  if (v instanceof Uint8Array && v.length >= 12) {
    const dv = new DataView(v.buffer, v.byteOffset, v.byteLength);
    const o = v.length >= 16 ? 4 : 0;
    return new THREE.Color(dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true));
  }
  return new THREE.Color(...fallback);
}

export function isWater(graph: ShaderGraph | null): boolean {
  return !!graph && /^eCShader(Ocean|River)$/.test(graph.shaderClass);
}

export function waterMaterial(name: string, graph: ShaderGraph, options: MaterialOptions, sky: WaterUniforms): THREE.ShaderMaterial {
  const fresnel = Math.min(0.5, Math.max(0.01, propNumber(graph.shader, 'FresnelConstant', 0.04)));
  const reflection = colorProp(graph, 'ReflectionColor', [0.55, 0.65, 0.7]);
  // Longer half-lives let a channel through: the deep colour leans to the channels that carry.
  const r = propNumber(graph.shader, 'DepthRedHalfLife', 50);
  const g = propNumber(graph.shader, 'DepthGreenHalfLife', 300);
  const b = propNumber(graph.shader, 'DepthBlueHalfLife', 400);
  const m = Math.max(r, g, b, 1);
  const deep = new THREE.Color(0.05 + 0.12 * (r / m), 0.08 + 0.18 * (g / m), 0.1 + 0.2 * (b / m));
  const material = new THREE.ShaderMaterial({
    name,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        g3Time: { value: 0 },
        g3Overbright: { value: 1 },
        fresnel0: { value: fresnel },
        reflectionColor: { value: reflection },
        deepColor: { value: deep },
        skyZenith: { value: new THREE.Color() },
        skyHorizon: { value: new THREE.Color() },
        sunDirection: { value: new THREE.Vector3() },
        sunColor: { value: new THREE.Color() },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        #ifdef USE_INSTANCING
          world = modelMatrix * instanceMatrix * vec4(position, 1.0);
        #endif
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float g3Time;
      uniform float g3Overbright;
      uniform float fresnel0;
      uniform vec3 reflectionColor;
      uniform vec3 deepColor;
      uniform vec3 skyZenith;
      uniform vec3 skyHorizon;
      uniform vec3 sunDirection;
      uniform vec3 sunColor;
      varying vec3 vWorld;
      vec2 wave(vec2 p, vec2 dir, float freq, float speed, float amp) {
        float ph = dot(p, dir) * freq + g3Time * speed;
        return dir * cos(ph) * amp * freq;
      }
      void main() {
        vec2 p = vWorld.xz;
        vec2 slope = wave(p, normalize(vec2(1.0, 0.3)), 0.23, 1.1, 0.06)
          + wave(p, normalize(vec2(-0.4, 1.0)), 0.41, 1.7, 0.035)
          + wave(p, normalize(vec2(0.7, -0.8)), 0.93, 2.3, 0.012)
          + wave(p, normalize(vec2(-1.0, -0.2)), 1.9, 3.1, 0.006);
        vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
        vec3 v = normalize(cameraPosition - vWorld);
        float cosv = max(dot(n, v), 0.0);
        float f = fresnel0 + (1.0 - fresnel0) * pow(1.0 - cosv, 5.0);
        vec3 r = reflect(-v, n);
        vec3 sky = mix(skyHorizon, skyZenith, pow(max(r.y, 0.0), 0.5)) * reflectionColor * 1.4;
        vec3 col = mix(deepColor, sky, f);
        float glint = pow(max(dot(r, normalize(sunDirection)), 0.0), 220.0);
        col += sunColor * glint * 1.6;
        gl_FragColor = vec4(col, mix(0.82, 0.97, f));
        #include <fog_fragment>
      }`,
  });
  // Shared values follow the day and the clock.
  material.uniforms.g3Time = options.time;
  material.uniforms.g3Overbright = options.overbright;
  material.uniforms.skyZenith = sky.skyZenith;
  material.uniforms.skyHorizon = sky.skyHorizon;
  material.uniforms.sunDirection = sky.sunDirection;
  material.uniforms.sunColor = sky.sunColor;
  return material;
}
