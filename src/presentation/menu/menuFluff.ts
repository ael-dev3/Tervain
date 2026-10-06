import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';
import { GUST_SPAN, type GrassWind } from '../grass/wind';
import { menuHeight } from './menuLayout';

/**
 * Seed fluff and pollen lifted off the heath and carried downwind over it. Each mote drifts along the wind through a
 * long box over the meadow and comes in again upwind; the gust field that bends the grass lifts and brightens the motes
 * it passes under, so a gust can be seen crossing the air as well as the grass. Against the low sun they glow; with the
 * sun behind the viewer they are barely there.
 */

export const FLUFF_COUNT = { low: 70, medium: 140, high: 220 } as const;
/** Ground the motes drift over: x0, z0, width, depth (m); and how far each drifts before it comes round again. */
const AREA = { x0: -26, z0: -34, w: 52, d: 48 } as const;
const DRIFT = 26;
const GROUND_TEXELS = 64;

const FLUFF_VERT = /* glsl */ `
attribute vec4 aFluff;   // phase along the drift 0..1, drift speed (m/s), height above the ground, size
uniform float uTime;
uniform float uPx;
uniform vec4 uWindDir;
uniform vec4 uGustScroll;
uniform sampler2D tGust;
uniform sampler2D tGround;
uniform vec4 uGroundBox;
uniform vec3 uSunView;
varying float vA;
varying float vGlow;
void main() {
  vec2 wd = uWindDir.xy;
  vec2 side = vec2(-wd.y, wd.x);
  float run = fract(aFluff.x + uTime * aFluff.y / ${DRIFT.toFixed(1)});
  float seed = aFluff.x * 61.7;
  vec2 xz = position.xz + wd * (run - 0.5) * ${DRIFT.toFixed(1)}
    + side * (sin(uTime * 0.37 + seed) * 0.6 + sin(uTime * 0.91 + seed * 1.7) * 0.2);
  float gust = smoothstep(0.42, 0.9, texture2D(tGust, (xz - uGustScroll.xy) * ${(1 / GUST_SPAN).toFixed(6)}).r);
  vec2 guv = clamp((xz - uGroundBox.xy) / uGroundBox.zw, 0.0, 1.0);
  float ground = texture2D(tGround, guv).r;
  float y = ground + aFluff.z * (1.0 + 0.6 * gust) + sin(uTime * 0.6 + seed * 2.3) * 0.18 + gust * 0.35;
  vec4 mv = viewMatrix * vec4(xz.x, y, xz.y, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  gl_PointSize = clamp(aFluff.w * uPx * (12.0 / max(1.5, d)), 1.0, 7.0);
  // In and out at the ends of the drift; never in the lens's face or lost in the distance.
  vA = sin(run * 3.14159) * smoothstep(1.2, 3.0, d) * (1.0 - smoothstep(18.0, 34.0, d)) * (0.55 + 0.45 * gust);
  // Forward scattering: bright when the mote lies between the eye and the sun.
  vGlow = 0.18 + 1.9 * pow(max(dot(normalize(mv.xyz), uSunView), 0.0), 6.0);
}`;

const FLUFF_FRAG = /* glsl */ `
varying float vA;
varying float vGlow;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, r) * vA;
  gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * vGlow * a * 0.7, 1.0);
}`;

export interface MenuFluff {
  points: THREE.Points;
  count: number;
  /** The clock (seconds) and the screen's pixel scale. */
  update(time: number): void;
  setPixelScale(px: number): void;
  dispose(): void;
}

/** Ground heights under the drift box as a small filterable texture, so motes follow the headland's rise and fall. */
function groundTexture(): THREE.DataTexture {
  const n = GROUND_TEXELS, data = new Uint16Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = AREA.x0 + (i / (n - 1)) * AREA.w, z = AREA.z0 + (j / (n - 1)) * AREA.d;
    data[j * n + i] = THREE.DataUtils.toHalfFloat(menuHeight(x, z));
  }
  const texture = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.HalfFloatType);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function buildMenuFluff(opts: { quality: 'low' | 'medium' | 'high'; wind: GrassWind; camera: THREE.Camera; sunDir: THREE.Vector3 }): MenuFluff {
  const count = FLUFF_COUNT[opts.quality];
  const rng = mulberry32(31337);
  const pos = new Float32Array(count * 3), attr = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    // Spread over the heath in front of the camp, denser toward the lens where the motes are seen.
    const u = rng();
    pos.set([(rng() - 0.5) * 34, 0, 4 - u * u * 30], i * 3);
    attr.set([rng(), 0.6 + rng() * 1.1, 0.25 + rng() * rng() * 2.4, 0.9 + rng() * 1.6], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aFluff', new THREE.BufferAttribute(attr, 4));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -12), 40);
  const ground = groundTexture();
  opts.camera.updateMatrixWorld(true);
  const sunView = opts.sunDir.clone().normalize().transformDirection(opts.camera.matrixWorldInverse);
  const time = { value: 0 }, px = { value: 1 };
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: time, uPx: px, uWindDir: opts.wind.uniforms.uWindDir, uGustScroll: opts.wind.uniforms.uGustScroll, tGust: opts.wind.uniforms.tGust,
      tGround: { value: ground }, uGroundBox: { value: new THREE.Vector4(AREA.x0, AREA.z0, AREA.w, AREA.d) }, uSunView: { value: sunView },
    },
    vertexShader: FLUFF_VERT,
    fragmentShader: FLUFF_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'Menu_Heath_Fluff';
  points.frustumCulled = false;
  points.renderOrder = 6;
  let disposed = false;
  return {
    points, count,
    update(t) { if (Number.isFinite(t)) time.value = t; },
    setPixelScale(v) { if (Number.isFinite(v) && v > 0) px.value = v; },
    dispose() {
      if (disposed) return;
      disposed = true;
      points.removeFromParent();
      geometry.dispose(); material.dispose(); ground.dispose();
    },
  };
}
