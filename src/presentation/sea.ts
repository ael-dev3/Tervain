import * as THREE from 'three';
import { WORLD } from '../world/layout';
import type { Terrain } from '../world/terrain';
import { sharedNoise } from './noiseTextures';
import { SKY } from './skyState';

/**
 * The sea: a large plane at sea level with depth taken from the terrain, so the shallows are see-through and pale where the
 * sand is close, and the deep water is dark grey-green. Slow swell, two layers of wind ripples, foam that runs up the beach and
 * back with each wave, a soft glint of the sun, and a Fresnel reflection of the sky colour. One mesh, one draw call.
 */

const VERT = /* glsl */ `
attribute float aDepth;
uniform float uTime;
varying float vDepth;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vDepth = aDepth;
  vec3 p = position;
  float swell = sin(p.x * 0.045 + uTime * 0.55) * 0.5 + sin(p.z * 0.06 - uTime * 0.42 + p.x * 0.02) * 0.5;
  p.y += swell * 0.09 * smoothstep(0.2, 2.5, aDepth);
  vWorld = p;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunI;
uniform float uNight;
uniform sampler2D uNoise;
varying float vDepth;
varying vec3 vWorld;
#include <fog_pars_fragment>

vec2 grad(vec2 p) { return (texture2D(uNoise, p).gb - 0.5) * 4.0; }

void main() {
  vec3 V = normalize(cameraPosition - vWorld);
  float dist = length(cameraPosition - vWorld);
  // Ripples: two crossing layers, faded with distance so the far sea does not shimmer.
  vec2 uv1 = vWorld.xz * 0.085 + vec2(uTime * 0.012, uTime * 0.007);
  vec2 uv2 = vWorld.xz * 0.23 + vec2(-uTime * 0.02, uTime * 0.014);
  vec2 g = grad(uv1) * 0.5 + grad(uv2) * 0.35;
  g *= 1.0 - smoothstep(20.0, 260.0, dist) * 0.92;
  vec3 N = normalize(vec3(-g.x * 0.16, 1.0, -g.y * 0.16));
  vec3 R = reflect(-V, N);
  float fres = 0.02 + 0.98 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);

  float dRaw = vDepth;
  float d = max(dRaw, 0.0);
  float landMask = smoothstep(-0.06, 0.1, dRaw);
  // Colour of the water itself: sandy and pale in the shallows, deep grey-green further out.
  vec3 shallow = vec3(0.19, 0.25, 0.22);
  vec3 mid = vec3(0.08, 0.15, 0.16);
  vec3 deep = vec3(0.035, 0.075, 0.095);
  vec3 body = mix(shallow, mid, smoothstep(0.1, 2.2, d));
  body = mix(body, deep, smoothstep(2.0, 9.0, d));
  float light = mix(0.28, 1.0, (1.0 - uNight)) * (0.55 + 0.35 * clamp(uSunI, 0.0, 1.6));
  body *= light;

  // What the water reflects: the sky towards the horizon, brighter at the sun.
  float up = clamp(R.y, 0.0, 1.0);
  vec3 sky = mix(uHorizon, uTop, pow(up, 0.45));
  float sd = max(dot(R, uSunDir), 0.0);
  vec3 refl = sky + uSunColor * (pow(sd, 90.0) * 1.8 + pow(sd, 12.0) * 0.12) * uSunI * (1.0 - uNight);
  vec3 col = mix(body, refl, clamp(fres, 0.0, 0.85));

  // Foam. Each wave runs up the sand and slips back: a band whose edge moves with time and with a little noise.
  float wob = texture2D(uNoise, vWorld.zx * 0.05 + vec2(uTime * 0.01, 0.0)).r;
  float run = 0.55 + 0.45 * sin(uTime * 0.8 + vWorld.z * 0.07 + wob * 5.0);
  float edge = d - run * 0.9 + (wob - 0.5) * 0.5;
  float foamBand = (1.0 - smoothstep(0.0, 0.35, edge)) * smoothstep(-0.55, -0.1, edge);
  float lace = smoothstep(0.35, 0.75, texture2D(uNoise, vWorld.xz * 0.6 + uTime * 0.02).r);
  float foam = clamp(foamBand * (0.55 + 0.6 * lace), 0.0, 1.0);
  // A thin permanent lip of foam at the very edge, and a hint of breaking foam over the shoal.
  foam = max(foam, (1.0 - smoothstep(0.0, 0.22, d)) * 0.55 * landMask);
  foam = max(foam, smoothstep(2.4, 1.2, d) * smoothstep(0.4, 1.0, d) * lace * 0.16);
  vec3 foamCol = vec3(0.7, 0.72, 0.68) * light * (1.0 - 0.45 * uNight);
  col = mix(col, foamCol, foam);

  // Transparent over the shallows so the sand shows through; opaque a little way out.
  float alpha = mix(0.0, 1.0, smoothstep(0.02, 0.5, d)) * mix(0.62, 1.0, smoothstep(0.4, 3.0, d));
  alpha = max(alpha, foam) * landMask;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
  #include <fog_fragment>
}`;

export interface SeaHandle {
  group: THREE.Group;
  update(dt: number, time: number): void;
}

/** The whole sea in one mesh: 2 m cells over the near sea (where depth comes from the terrain) and one big skirt beyond. */
export function buildSea(terrain: Terrain): SeaHandle {
  const NEAR_X1 = -180;
  const cell = 3;
  const x0 = WORLD.minX;
  const nx = Math.ceil((NEAR_X1 - x0) / cell);
  const z0 = WORLD.minZ - 12;
  const z1 = WORLD.maxZ + 12;
  const nz = Math.ceil((z1 - z0) / cell);
  const pos: number[] = [];
  const depth: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i * cell;
      const z = z0 + j * cell;
      pos.push(x, 0, z);
      depth.push(-terrain.heightAt(x, z) + (x < WORLD.minX + 2 ? 14 : 0));
    }
  }
  const row = nx + 1;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * row + i;
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  // Skirt: a wide frame around the near grid, deep everywhere.
  const base = pos.length / 3;
  const R = 5200;
  const skirt: [number, number][] = [
    [x0 - R, z0 - R], [NEAR_X1 + R, z0 - R], [NEAR_X1 + R, z1 + R], [x0 - R, z1 + R],
    [x0, z0], [NEAR_X1, z0], [NEAR_X1, z1], [x0, z1],
  ];
  for (const [x, z] of skirt) {
    pos.push(x, 0, z);
    depth.push(16);
  }
  const q = (a: number, b: number, c: number, d: number) => idx.push(base + a, base + b, base + c, base + a, base + c, base + d);
  q(0, 1, 5, 4); // north
  q(1, 2, 6, 5); // east
  q(2, 3, 7, 6); // south
  q(3, 0, 4, 7); // west
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aDepth', new THREE.Float32BufferAttribute(depth, 1));
  geo.setIndex(idx);
  const uniforms = {
    uTime: { value: 0 },
    uTop: SKY.top,
    uHorizon: SKY.horizon,
    uSunDir: SKY.sunDir,
    uSunColor: SKY.sunColor,
    uSunI: SKY.sunI,
    uNight: SKY.night,
    uNoise: { value: sharedNoise().detail as THREE.Texture },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    fog: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.name = 'sea';
  const group = new THREE.Group();
  group.add(mesh);
  return {
    group,
    update(_dt, time) {
      mat.uniforms.uTime!.value = time;
    },
  };
}
