import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';

/**
 * The warden's fire: tongues of flame, sparks and a thin column of smoke, all driven by one clock on the GPU, plus the
 * light that flickers over the camp. Gothic 3's title screen is scored with a fire crackling under the wind; here the fire
 * is seen instead. Flames are additive and bright enough for the bloom pass to catch; sparks are few and short-lived.
 * Nothing moves when the clock is frozen (reduced motion).
 */

const FLAME_VERT = /* glsl */ `
attribute float aSeed;
varying vec2 vUv;
varying float vSeed;
void main() {
  vUv = uv;
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FLAME_FRAG = /* glsl */ `
uniform float uTime;
uniform sampler2D uNoise;
uniform float uGain;
varying vec2 vUv;
varying float vSeed;
void main() {
  float y = vUv.y;
  float t = uTime * (1.0 + vSeed * 0.3);
  // Two scales of rising noise distort the tongue sideways and eat into its edges.
  float n1 = texture2D(uNoise, vec2(vUv.x * 0.55 + vSeed * 0.37, y * 0.45 - t * 0.55)).r;
  float n2 = texture2D(uNoise, vec2(vUv.x * 1.4 + vSeed * 0.71, y * 1.1 - t * 1.25)).a;
  float x = vUv.x - 0.5 + (n1 - 0.5) * 0.42 * y + (n2 - 0.5) * 0.12;
  float width = 0.46 * pow(max(1.0 - y, 0.0), 0.75) * (0.75 + 0.5 * n1);
  float body = 1.0 - smoothstep(width * 0.35, width, abs(x));
  float lick = smoothstep(1.0, 0.25, y + (n2 - 0.35) * 0.55);
  float f = body * lick * smoothstep(0.0, 0.08, y);
  float core = f * smoothstep(0.55, 0.0, y) * (1.0 - smoothstep(0.0, width * 0.7, abs(x)));
  vec3 col = vec3(0.95, 0.24, 0.035) * f + vec3(1.0, 0.62, 0.22) * core * 1.4 + vec3(1.0, 0.9, 0.6) * core * core * 1.2;
  gl_FragColor = vec4(col * uGain, 1.0);
}`;

const SPARK_VERT = /* glsl */ `
attribute vec4 aSpark;   // phase, speed, radius, size
uniform float uTime;
uniform float uPx;
uniform vec2 uWind;
varying float vLife;
void main() {
  float life = fract(uTime * aSpark.y * 0.22 + aSpark.x);
  float h = life * (2.2 + aSpark.y * 1.6);
  float a = aSpark.x * 40.0 + uTime * 1.3;
  vec3 p = position + vec3(cos(a) * aSpark.z * (0.3 + life), h, sin(a * 0.8) * aSpark.z * (0.3 + life));
  p.xz += uWind * life * life * 1.8;
  vLife = life;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSpark.w * uPx * (8.0 / max(0.5, -mv.z)) * (1.0 - life * 0.6);
}`;

const SPARK_FRAG = /* glsl */ `
varying float vLife;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);
  float a = smoothstep(0.5, 0.1, d) * (1.0 - smoothstep(0.55, 1.0, vLife)) * smoothstep(0.0, 0.06, vLife);
  vec3 c = mix(vec3(1.0, 0.75, 0.35), vec3(0.9, 0.22, 0.03), vLife);
  gl_FragColor = vec4(c * a * 3.0, 1.0);
}`;

const SMOKE_VERT = /* glsl */ `
attribute vec4 aPuff;   // phase, speed, spread, size
uniform float uTime;
uniform float uPx;
uniform vec2 uWind;
varying float vLife;
varying float vSeed;
void main() {
  float life = fract(uTime * aPuff.y * 0.045 + aPuff.x);
  float h = life * 7.5;
  vec3 p = position + vec3(sin(aPuff.x * 17.0 + life * 3.0) * aPuff.z * life, h, cos(aPuff.x * 11.0 + life * 2.2) * aPuff.z * life);
  p.xz += uWind * life * life * 6.0;
  vLife = life;
  vSeed = aPuff.x;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aPuff.w * uPx * (1.0 + life * 3.5) * (60.0 / max(1.0, -mv.z));
}`;

const SMOKE_FRAG = /* glsl */ `
uniform sampler2D uNoise;
uniform vec3 uSmoke;
uniform vec3 uFireTint;
varying float vLife;
varying float vSeed;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float n = texture2D(uNoise, gl_PointCoord * 0.35 + vSeed).r;
  float d = length(q) + (n - 0.5) * 0.25;
  float a = smoothstep(0.5, 0.05, d) * smoothstep(0.0, 0.12, vLife) * (1.0 - smoothstep(0.35, 1.0, vLife)) * 0.22;
  // Low smoke is lit from beneath by the fire; higher up it is the colour of the dusk.
  vec3 c = mix(uFireTint, uSmoke, smoothstep(0.0, 0.25, vLife));
  gl_FragColor = vec4(c, a);
}`;

export interface MenuFire {
  group: THREE.Group;
  light: THREE.PointLight;
  update(time: number): void;
  setPixelScale(px: number): void;
  dispose(): void;
}

export function buildMenuFire(x: number, y: number, z: number, noise: THREE.Texture, quality: 'low' | 'medium' | 'high'): MenuFire {
  const group = new THREE.Group();
  group.name = 'Menu_Warden_Fire';
  group.position.set(x, y, z);
  const rng = mulberry32(3301);
  const time = { value: 0 };
  const px = { value: 1 };
  const wind = { value: new THREE.Vector2(0.35, -0.5) };

  // Flames: a few crossed vertical cards of different heights, each with its own seed.
  const fPos: number[] = [];
  const fUv: number[] = [];
  const fSeed: number[] = [];
  const fIdx: number[] = [];
  const tongues = 7;
  for (let i = 0; i < tongues; i++) {
    const a = (i / tongues) * Math.PI + rng() * 0.4;
    const h = 0.55 + rng() * 0.55;
    const w = 0.45 + rng() * 0.25;
    const ox = (rng() - 0.5) * 0.35;
    const oz = (rng() - 0.5) * 0.35;
    const ca = Math.cos(a) * w * 0.5;
    const sa = Math.sin(a) * w * 0.5;
    const b = fPos.length / 3;
    fPos.push(ox - ca, 0.05, oz - sa, ox + ca, 0.05, oz + sa, ox + ca, 0.05 + h, oz + sa, ox - ca, 0.05 + h, oz - sa);
    fUv.push(0, 0, 1, 0, 1, 1, 0, 1);
    const s = rng();
    fSeed.push(s, s, s, s);
    fIdx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
  fGeo.setAttribute('uv', new THREE.Float32BufferAttribute(fUv, 2));
  fGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(fSeed, 1));
  fGeo.setIndex(fIdx);
  const fMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uNoise: { value: noise }, uGain: { value: 2.2 } },
    vertexShader: FLAME_VERT,
    fragmentShader: FLAME_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const flames = new THREE.Mesh(fGeo, fMat);
  flames.name = 'Menu_Fire_Flames';
  flames.renderOrder = 3;
  group.add(flames);

  // Sparks.
  const nSparks = quality === 'low' ? 18 : 40;
  const sPos = new Float32Array(nSparks * 3);
  const sAttr = new Float32Array(nSparks * 4);
  for (let i = 0; i < nSparks; i++) {
    sPos.set([(rng() - 0.5) * 0.4, 0.2, (rng() - 0.5) * 0.4], i * 3);
    sAttr.set([rng(), 0.6 + rng() * 1.2, 0.1 + rng() * 0.35, 1.2 + rng() * 1.8], i * 4);
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('aSpark', new THREE.BufferAttribute(sAttr, 4));
  sGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 4);
  const sMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uPx: px, uWind: wind },
    vertexShader: SPARK_VERT,
    fragmentShader: SPARK_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sparks = new THREE.Points(sGeo, sMat);
  sparks.name = 'Menu_Fire_Sparks';
  sparks.renderOrder = 4;
  group.add(sparks);

  // Smoke.
  const nPuffs = quality === 'low' ? 14 : 26;
  const pPos = new Float32Array(nPuffs * 3);
  const pAttr = new Float32Array(nPuffs * 4);
  for (let i = 0; i < nPuffs; i++) {
    pPos.set([(rng() - 0.5) * 0.3, 0.7, (rng() - 0.5) * 0.3], i * 3);
    pAttr.set([i / nPuffs + rng() * 0.02, 0.8 + rng() * 0.5, 0.4 + rng() * 0.8, 0.9 + rng() * 0.8], i * 4);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aPuff', new THREE.BufferAttribute(pAttr, 4));
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(2, 5, -2), 9);
  const pMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: time,
      uPx: px,
      uWind: wind,
      uNoise: { value: noise },
      uSmoke: { value: new THREE.Color().setHex(0x3a3936) },
      uFireTint: { value: new THREE.Color().setHex(0x7a4a2a) },
    },
    vertexShader: SMOKE_VERT,
    fragmentShader: SMOKE_FRAG,
    transparent: true,
    depthWrite: false,
  });
  const smoke = new THREE.Points(pGeo, pMat);
  smoke.name = 'Menu_Fire_Smoke';
  smoke.renderOrder = 2;
  group.add(smoke);

  const light = new THREE.PointLight(0xff9650, 5.5, 14, 1.8);
  light.position.set(0, 0.75, 0);
  light.name = 'Menu_Fire_Light';
  group.add(light);

  return {
    group,
    light,
    update(t: number) {
      time.value = t;
      // Flicker: a slow breath and a quicker gutter, never pumping the whole frame.
      const f = Math.sin(t * 2.3) * 0.08 + Math.sin(t * 5.7 + 1.3) * 0.05 + Math.sin(t * 11.1 + 0.4) * 0.03;
      light.intensity = 5.5 * (1 + f);
      light.position.x = Math.sin(t * 3.1) * 0.04;
    },
    setPixelScale(v: number) {
      px.value = v;
    },
    dispose() {
      for (const o of [flames, sparks, smoke]) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
      light.dispose();
    },
  };
}
