import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';
import { MENU_SKY_GLSL, menuSkyUniforms } from './menuSky';

/**
 * The air over the vigil: crows turning above the dead limb, dust and ash drifting in the last light, and low banks of
 * mist lying in the hollows below the brow. All GPU-driven from one clock; with the clock frozen they hold still.
 */

const CROW_VERT = /* glsl */ `
attribute vec4 aPath;     // centre x, centre z, radius, angular speed (rad/s)
attribute vec4 aParams;   // height, phase, size, flap rate
attribute float aWing;    // 0 body, +1 / -1 wing tip side
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying float vFog;
void main() {
  float a = aParams.y + uTime * aPath.w;
  vec2 c = aPath.xy + vec2(cos(a), sin(a) * 0.7) * aPath.z;
  vec3 fwd = normalize(vec3(-sin(a), 0.0, cos(a) * 0.7) * sign(aPath.w));
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = normalize(vec3(0.0, 1.0, 0.0) - right * 0.3 * sign(aPath.w));
  // Crows row with deep slow beats, then glide a while.
  float beat = sin(uTime * aParams.w + aParams.y * 5.0);
  float glide = smoothstep(0.2, 0.7, sin(uTime * 0.37 + aParams.y * 2.0));
  float flap = beat * (1.0 - glide * 0.85);
  vec3 p = position;
  p.y += aWing * abs(p.x) * flap * 0.85 + abs(p.x) * glide * 0.08;
  vec3 world = vec3(c.x, aParams.x + sin(uTime * 0.5 + aParams.y) * 0.8, c.y) + (right * p.x + up * p.y + fwd * p.z) * aParams.z;
  vec4 mv = viewMatrix * vec4(world, 1.0);
  vFog = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const CROW_FRAG = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogDensity;
varying float vFog;
void main() {
  vec3 col = vec3(0.012, 0.011, 0.012);
  float f = 1.0 - exp(-uFogDensity * uFogDensity * vFog * vFog);
  gl_FragColor = vec4(mix(col, uFogColor, f), 1.0);
}`;

function crowGeometry(): THREE.BufferGeometry {
  // A crow seen from below: a stubby body, a wedge tail and broad fingered wings.
  const pos: number[] = [];
  const wing: number[] = [];
  const idx: number[] = [];
  const v = (x: number, y: number, z: number, w: number) => {
    pos.push(x, y, z);
    wing.push(w);
    return pos.length / 3 - 1;
  };
  const head = v(0, 0, 0.42, 0);
  const l = v(-0.08, 0, 0.08, 0);
  const r = v(0.08, 0, 0.08, 0);
  const tailL = v(-0.12, 0, -0.5, 0);
  const tailR = v(0.12, 0, -0.5, 0);
  const rump = v(0, 0, -0.18, 0);
  idx.push(head, l, r, l, rump, r, rump, tailL, tailR);
  for (const s of [-1, 1]) {
    const a = v(s * 0.07, 0, 0.2, 0);
    const b = v(s * 0.07, 0, -0.12, 0);
    const m1 = v(s * 0.6, 0.02, 0.18, s);
    const m2 = v(s * 0.6, 0.02, -0.12, s);
    const t1 = v(s * 1.05, 0.0, 0.08, s);
    const t2 = v(s * 1.12, 0.0, -0.06, s);
    const t3 = v(s * 0.98, 0.0, -0.18, s);
    idx.push(a, b, m1, b, m2, m1, m1, m2, t1, t1, m2, t2, t2, m2, t3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aWing', new THREE.Float32BufferAttribute(wing, 1));
  g.setIndex(idx);
  return g;
}

const MOTE_VERT = /* glsl */ `
attribute vec4 aMote;   // phase, speed, drift, size
uniform float uTime;
uniform float uPx;
varying float vA;
varying float vWarm;
void main() {
  float t = uTime * aMote.y;
  vec3 p = position + vec3(sin(t * 0.13 + aMote.x * 30.0) * aMote.z, sin(t * 0.21 + aMote.x * 11.0) * 0.6 + mod(t * 0.05 + aMote.x * 4.0, 4.0) - 2.0, cos(t * 0.11 + aMote.x * 17.0) * aMote.z);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  gl_PointSize = aMote.w * uPx * (6.0 / max(0.6, d));
  // Motes read only where light catches them: fade out close to the lens and far away.
  vA = smoothstep(0.6, 2.0, d) * (1.0 - smoothstep(9.0, 22.0, d)) * (0.5 + 0.5 * sin(t * 0.7 + aMote.x * 9.0));
  vWarm = aMote.x;
}`;

const MOTE_FRAG = /* glsl */ `
varying float vA;
varying float vWarm;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA * 0.5;
  vec3 c = mix(vec3(0.85, 0.62, 0.36), vec3(0.55, 0.52, 0.48), step(0.6, vWarm));
  gl_FragColor = vec4(c * a, 1.0);
}`;

const MIST_VERT = /* glsl */ `
varying vec3 vW;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const MIST_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uUpper;
uniform vec3 uHorizonCool;
uniform vec3 uHorizonWarm;
uniform vec3 uSunCore;
uniform vec3 uCloudDark;
uniform vec3 uCloudLit;
uniform float uSkyTime;
uniform sampler2D uNoise;
uniform float uOpacity;
varying vec3 vW;
varying vec2 vUv;
${MENU_SKY_GLSL}
void main() {
  vec3 d = normalize(vW - cameraPosition);
  float n = texture2D(uNoise, vW.xz * 0.012 + vec2(uSkyTime * 0.004, 0.0)).r;
  float n2 = texture2D(uNoise, vW.xz * 0.031 - vec2(uSkyTime * 0.006, uSkyTime * 0.002)).a;
  float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
  float a = smoothstep(0.35, 0.8, n * 0.7 + n2 * 0.5) * edge * uOpacity;
  vec3 c = menuHorizon(normalize(vec3(d.x, 0.02, d.z))) * 0.9;
  gl_FragColor = vec4(c, a);
}`;

export interface MenuAir {
  group: THREE.Group;
  update(time: number): void;
  setPixelScale(px: number): void;
  dispose(): void;
}

export function buildMenuAir(opts: {
  noise: THREE.Texture;
  fog: THREE.FogExp2;
  crowCentre: THREE.Vector3;
  quality: 'low' | 'medium' | 'high';
  /** A vertical cylinder (a tree's crown) the crows keep out of unless they fly above its top. */
  avoid?: { x: number; z: number; r: number; top: number };
}): MenuAir {
  const group = new THREE.Group();
  group.name = 'Menu_Air';
  const time = { value: 0 };
  const px = { value: 1 };
  const rng = mulberry32(8123);
  const disposables: { dispose(): void }[] = [];

  // Crows. Each circles an ellipse (radius r across, 0.7 r deep); with a wing span about a metre and a height that
  // wobbles by 0.8 m, one that flies at the crown's height keeps its whole circle a margin outside the crown.
  const nCrows = 6;
  const cg = crowGeometry();
  const geo = new THREE.InstancedBufferGeometry();
  for (const [k, a] of Object.entries(cg.attributes)) geo.setAttribute(k, a);
  geo.setIndex(cg.index);
  const path = new Float32Array(nCrows * 4);
  const params = new Float32Array(nCrows * 4);
  for (let i = 0; i < nCrows; i++) {
    const cx = opts.crowCentre.x + (rng() - 0.5) * 6;
    const cz = opts.crowCentre.z + (rng() - 0.5) * 5;
    let r = 5 + rng() * 9;
    const speed = (0.18 + rng() * 0.16) * (rng() < 0.5 ? -1 : 1);
    const y = opts.crowCentre.y + (rng() - 0.5) * 3;
    const a = opts.avoid;
    if (a && y - 1.5 < a.top) r = Math.max(2, Math.min(r, Math.hypot(cx - a.x, cz - a.z) - a.r - 2));
    path.set([cx, cz, r, speed], i * 4);
    params.set([y, rng() * Math.PI * 2, 0.5 + rng() * 0.18, 5.2 + rng() * 1.5], i * 4);
  }
  geo.setAttribute('aPath', new THREE.InstancedBufferAttribute(path, 4));
  geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
  geo.instanceCount = nCrows;
  const crowMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uFogColor: { value: opts.fog.color }, uFogDensity: { value: opts.fog.density } },
    vertexShader: CROW_VERT,
    fragmentShader: CROW_FRAG,
    side: THREE.DoubleSide,
  });
  const crows = new THREE.Mesh(geo, crowMat);
  crows.name = 'Menu_Crows';
  crows.frustumCulled = false;
  group.add(crows);
  disposables.push(cg, geo, crowMat);

  // Dust and ash in the air near the camp.
  const nMotes = opts.quality === 'low' ? 60 : 140;
  const mPos = new Float32Array(nMotes * 3);
  const mAttr = new Float32Array(nMotes * 4);
  for (let i = 0; i < nMotes; i++) {
    mPos.set([(rng() - 0.5) * 18, 0.4 + rng() * 4.5, 6 - rng() * 16], i * 3);
    mAttr.set([rng(), 0.5 + rng() * 0.8, 0.4 + rng() * 1.2, 0.8 + rng() * 1.4], i * 4);
  }
  const mGeo = new THREE.BufferGeometry();
  mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  mGeo.setAttribute('aMote', new THREE.BufferAttribute(mAttr, 4));
  mGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2.5, -2), 16);
  const mMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uPx: px },
    vertexShader: MOTE_VERT,
    fragmentShader: MOTE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const motes = new THREE.Points(mGeo, mMat);
  motes.name = 'Menu_Dust_Motes';
  motes.renderOrder = 6;
  group.add(motes);
  disposables.push(mGeo, mMat);

  // Mist banks below the brow and across the far slopes.
  const mistMat = new THREE.ShaderMaterial({
    uniforms: { ...menuSkyUniforms, uNoise: { value: opts.noise }, uOpacity: { value: 0.55 } },
    vertexShader: MIST_VERT,
    fragmentShader: MIST_FRAG,
    transparent: true,
    depthWrite: false,
  });
  disposables.push(mistMat);
  for (const [x, y, z, w, d] of [[-20, -34, -95, 260, 70], [60, -35, -160, 240, 90], [-120, -20, -210, 220, 80]] as const) {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    disposables.push(g);
    const m = new THREE.Mesh(g, mistMat);
    m.position.set(x, y, z);
    m.renderOrder = 1;
    m.name = 'Menu_Mist_Bank';
    group.add(m);
  }

  return {
    group,
    update(t: number) {
      time.value = t;
    },
    setPixelScale(v: number) {
      px.value = v;
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
