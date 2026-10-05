import * as THREE from 'three';
import { mulberry32, smoothstep } from '../world/noise';
import { sharedNoise } from './noiseTextures';
import { SKY } from './skyState';

/**
 * Sky, sun, moon, hemisphere fill and fog for the day/night cycle.
 *
 * The dome is a single fragment shader (gradient, sun and moon, two cloud layers lit from the sun's side, a faint
 * milky way) drawn last with an early depth test, so only visible sky pixels pay for it. Stars are a small point
 * cloud. Everything the rest of the scene needs to match the sky (colours, sun and moon directions, night) is
 * written to the shared `SKY` uniforms every frame.
 */

interface Key {
  h: number;
  top: number;
  horizon: number;
  sun: number;
  sunI: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  fog: number;
  /** Cloud coverage 0..1. */
  cover: number;
}

const KEYS: Key[] = [
  { h: 0, top: 0x070b16, horizon: 0x141b2a, sun: 0x8fa0c8, sunI: 0.0, hemiSky: 0x4b5b79, hemiGround: 0x262a31, hemiI: 0.65, fog: 0x141b2a, cover: 0.55 },
  { h: 5.2, top: 0x1a2236, horizon: 0x5c5560, sun: 0xd89a68, sunI: 0.1, hemiSky: 0x4b5670, hemiGround: 0x232326, hemiI: 0.55, fog: 0x5c5560, cover: 0.6 },
  { h: 6.5, top: 0x4f6f96, horizon: 0xc8a682, sun: 0xf0b078, sunI: 1.0, hemiSky: 0x8298b0, hemiGround: 0x4a4230, hemiI: 0.72, fog: 0xb8a58c, cover: 0.62 },
  { h: 9, top: 0x627f94, horizon: 0xb3b9b7, sun: 0xffdfb1, sunI: 2.5, hemiSky: 0x8ca4bd, hemiGround: 0x454334, hemiI: 0.65, fog: 0xa8b3b4, cover: 0.52 },
  { h: 13, top: 0x5e7e91, horizon: 0xb1bab8, sun: 0xffe8bf, sunI: 2.75, hemiSky: 0x89a3bd, hemiGround: 0x484434, hemiI: 0.67, fog: 0xa3b2b3, cover: 0.5 },
  { h: 17, top: 0x506f98, horizon: 0xc0b49d, sun: 0xffd19a, sunI: 2.3, hemiSky: 0x8b9fb9, hemiGround: 0x494031, hemiI: 0.64, fog: 0xacae9f, cover: 0.59 },
  { h: 18.8, top: 0x3d4a6c, horizon: 0xd08a5a, sun: 0xff8f52, sunI: 0.9, hemiSky: 0x7a7a94, hemiGround: 0x3e2e28, hemiI: 0.62, fog: 0xb8825e, cover: 0.66 },
  { h: 20.2, top: 0x161f3a, horizon: 0x5f4a5a, sun: 0xd0784c, sunI: 0.1, hemiSky: 0x40507a, hemiGround: 0x22212a, hemiI: 0.52, fog: 0x4c4152, cover: 0.6 },
  { h: 22, top: 0x080d1c, horizon: 0x151c2e, sun: 0x8fa0c8, sunI: 0.0, hemiSky: 0x4b5b79, hemiGround: 0x262a31, hemiI: 0.65, fog: 0x151c2e, cover: 0.56 },
  { h: 24, top: 0x070b16, horizon: 0x141b2a, sun: 0x8fa0c8, sunI: 0.0, hemiSky: 0x4b5b79, hemiGround: 0x262a31, hemiI: 0.65, fog: 0x141b2a, cover: 0.55 },
];

const ca = new THREE.Color();
const cb = new THREE.Color();

function lerpHex(out: THREE.Color, a: number, b: number, t: number) {
  ca.setHex(a);
  cb.setHex(b);
  return out.copy(ca).lerp(cb, t);
}

export interface SkyState {
  nightness: number;
  sunDir: THREE.Vector3;
  moonDir: THREE.Vector3;
  horizon: THREE.Color;
  top: THREE.Color;
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  // Exactly at the far plane: the dome loses the depth test to everything else and is drawn only where nothing is.
  gl_Position.z = gl_Position.w;
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunI;
uniform vec3 uMoonDir;
uniform float uNight;
uniform float uTime;
uniform float uCover;
uniform vec2 uWind;
uniform sampler2D uNoise;
varying vec3 vDir;

float cumulusField(vec2 p) {
  // Independent value channels bend the banks gently. The derivative channels
  // made the former low-frequency field curl into enormous bright whirlpools.
  vec2 w = (texture2D(uNoise, p * 0.08 + 0.19).ra - 0.5) * 0.12;
  float n = texture2D(uNoise, p * 0.15 + w).r * 0.57
          + texture2D(uNoise, p * 0.39 + w * 1.3 + 0.31).a * 0.28
          + texture2D(uNoise, p * 0.92 + w * 1.8 + 0.62).r * 0.15;
  return n;
}

float cloudEdge(float threshold, float width, float density) {
  return smoothstep(threshold, threshold + max(width, fwidth(density) * 1.5), density);
}

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  float sd = max(dot(d, uSunDir), 0.0);
  float lowSun = 1.0 - smoothstep(0.06, 0.45, uSunDir.y);
  float day = 1.0 - uNight;

  // Gradient: a wide bright haze band at the horizon (the fog colour), deepening toward the zenith.
  float yy = clamp(y, 0.0, 1.0);
  float e = pow(yy, 0.42);
  vec3 col = mix(uHorizon, uTop, e);
  col = mix(col, uTop * 0.78, smoothstep(0.5, 1.0, yy) * 0.55);
  // Sunlit side of the horizon glows warmer and brighter, the anti-solar side stays cool.
  float towardSun = pow(sd, 3.0);
  col = mix(col, uHorizon * (1.0 + 0.55 * lowSun) + uSunColor * 0.35 * lowSun, towardSun * (1.0 - e) * (0.35 + 0.65 * lowSun) * min(uSunI, 1.0));
  // Scattering halo and the disc.
  col += uSunColor * (pow(sd, 6.0) * 0.09 + pow(sd, 32.0) * 0.16 + pow(sd, 260.0) * 0.62) * uSunI * (0.6 + 0.4 * day);
  float disc = smoothstep(0.99955, 0.99985, sd);
  col = mix(col, uSunColor * 9.0, disc * clamp(uSunI * 3.0, 0.0, 1.0) * step(0.0, y + 0.03));
  // Crepuscular streaks: low sun only.
  if (lowSun > 0.01 && sd > 0.5) {
    float ang = atan(d.x * uSunDir.z - d.z * uSunDir.x, dot(d.xz, uSunDir.xz) + 0.0001 + d.y * uSunDir.y);
    float st = texture2D(uNoise, vec2(ang * 3.1 + uTime * 0.004, 0.37)).r;
    col += uSunColor * pow(sd, 10.0) * smoothstep(0.42, 0.9, st) * 0.16 * lowSun * uSunI * (1.0 - e);
  }

  // Milky way and the moon (night only).
  if (uNight > 0.05) {
    vec3 pole = normalize(vec3(0.35, 0.72, 0.6));
    float gl = dot(d, pole);
    float band = exp(-gl * gl * 20.0);
    float gn = texture2D(uNoise, vec2(atan(d.z, d.x) * 0.32, d.y * 0.7)).r;
    float gn2 = texture2D(uNoise, vec2(atan(d.z, d.x) * 0.9 + 0.3, d.y * 2.2)).a;
    col += vec3(0.42, 0.5, 0.75) * band * (0.25 + gn * 0.9) * smoothstep(0.25, 0.75, gn2) * 0.06 * uNight * smoothstep(-0.05, 0.3, y);
    float mr = 0.030;
    float md = dot(d, uMoonDir);
    float mh = smoothstep(cos(mr * 4.5), cos(mr), md);
    col += vec3(0.55, 0.65, 0.9) * mh * mh * 0.10 * uNight;
    if (md > cos(mr * 1.2)) {
      vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), uMoonDir));
      vec3 up = cross(uMoonDir, right);
      vec2 l = vec2(dot(d, right), dot(d, up)) / mr;
      float r2 = dot(l, l);
      if (r2 < 1.0) {
        vec3 n = vec3(l, sqrt(1.0 - r2));
        vec3 L = normalize(vec3(-0.55, 0.28, 0.78));
        float lit = smoothstep(-0.06, 0.16, dot(n, L));
        float maria = texture2D(uNoise, l * 0.32 + 0.5).r;
        float crater = texture2D(uNoise, l * 0.9 + 0.2).a;
        vec3 mc = mix(vec3(1.0, 0.97, 0.88), vec3(0.62, 0.66, 0.72), smoothstep(0.42, 0.66, maria) * 0.7) * (0.85 + 0.25 * crater);
        float edge = smoothstep(1.0, 0.94, r2);
        col = mix(col, mc * 2.1 * mix(0.06, 1.0, lit), edge * clamp(uNight * 1.6, 0.0, 1.0));
      }
    }
  }

  // Cloud layers, projected onto planes above the viewer and drifted by the wind.
  float horizonFade = smoothstep(0.02, 0.2, y);
  if (y > 0.0) {
    vec2 p = d.xz / (y + 0.09);
    vec2 drift = uWind * uTime;
    // Smaller separate cloud banks leave broad quiet sky between the land silhouettes.
    vec2 bank = p * vec2(1.8, 2.25) + drift;
    float n1 = cumulusField(bank);
    float thr = 0.66 - uCover * 0.20;
    float c1 = cloudEdge(thr, 0.12, n1);
    if (c1 > 0.002) {
      float n2 = cumulusField(bank + uSunDir.xz * 0.12);
      float lightT = clamp(0.56 + (n1 - n2) * 2.8, 0.0, 1.0);
      float thick = smoothstep(thr, thr + 0.24, n1);
      vec3 ambient = mix(uHorizon, uTop, 0.35);
      vec3 shade = ambient * (0.55 + 0.20 * day) + vec3(0.02, 0.03, 0.045);
      // The directional light already carries the sunlight. Painted cloud bodies
      // stay pearl/slate rather than producing white HDR sheets across the bay.
      vec3 lit = (uSunColor * min(uSunI, 2.8) * 0.24 + ambient * 0.68) * (1.0 + 0.28 * lowSun * pow(sd, 3.0));
      lit += uSunColor * pow(sd, 8.0) * (1.0 - thick) * 0.24 * uSunI;
      vec3 moonLit = vec3(0.5, 0.6, 0.9) * (0.18 + 0.5 * pow(max(dot(d, uMoonDir), 0.0), 6.0)) * uNight;
      vec3 cc = mix(shade, lit, lightT * (0.4 + 0.6 * (1.0 - thick * 0.5))) + moonLit * 0.55;
      col = mix(col, cc, c1 * horizonFade * (0.86 - 0.12 * uNight));
    }
    // High layer: thin, stretched cirrus.
    vec2 q = vec2(p.x * 0.8, p.y * 2.6) + drift * 0.6;
    float ci = texture2D(uNoise, q * 0.29).r * 0.6 + texture2D(uNoise, q * 0.83 + 0.5).a * 0.4;
    float cir = cloudEdge(0.69 - uCover * 0.1, 0.2, ci) * 0.12 * horizonFade * smoothstep(0.12, 0.5, y);
    vec3 cirCol = mix(uHorizon, vec3(0.7, 0.72, 0.7), 0.45) * (0.55 + 0.17 * uSunI) + uSunColor * pow(sd, 6.0) * 0.16 * uSunI;
    col = mix(col, cirCol * mix(0.16, 1.0, day), cir);
  }

  // Below the horizon everything is the haze colour, so the far terrain edge never shows a seam.
  col = mix(col, uHorizon, smoothstep(0.0, -0.12, y));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute float aTint;
uniform float uNight;
uniform float uTime;
uniform float uPx;
varying float vA;
varying float vTint;
void main() {
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;
  float tw = 0.78 + 0.22 * sin(uTime * (1.2 + aPhase) + aPhase * 40.0);
  vA = uNight * tw * smoothstep(-0.05, 0.16, normalize(position).y);
  vTint = aTint;
  gl_PointSize = aSize * uPx;
}`;

const STAR_FRAG = /* glsl */ `
varying float vA;
varying float vTint;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = smoothstep(1.0, 0.0, r);
  a *= a;
  vec3 col = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.92, 0.75), vTint);
  gl_FragColor = vec4(col * 1.6, a * vA);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class SkyRig {
  readonly group = new THREE.Group();
  readonly sun = new THREE.DirectionalLight(0xffffff, 2);
  readonly moon = new THREE.DirectionalLight(0x8fa4d8, 0.0);
  readonly hemi = new THREE.HemisphereLight(0xffffff, 0x555544, 0.7);
  readonly fog = new THREE.FogExp2(0xa0aeb2, 0.0031);
  private dome: THREE.Mesh;
  private stars: THREE.Points;
  private starUniforms = { uNight: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 } };
  private uniforms = {
    uTop: SKY.top,
    uHorizon: SKY.horizon,
    uSunDir: SKY.sunDir,
    uSunColor: SKY.sunColor,
    uSunI: SKY.sunI,
    uMoonDir: SKY.moonDir,
    uNight: SKY.night,
    uTime: SKY.time,
    uCover: SKY.cover,
    uWind: { value: new THREE.Vector2(0.006, 0.0025) },
    uNoise: { value: sharedNoise().detail as THREE.Texture },
  };
  state: SkyState = { nightness: 0, sunDir: new THREE.Vector3(0, 1, 0), moonDir: new THREE.Vector3(0, -1, 0), horizon: new THREE.Color(), top: new THREE.Color() };
  brightness = 1;
  /** Time driving cloud drift; frozen while motion is reduced. */
  private cloudTime = 0;
  private tmp = new THREE.Color();
  private hemiScale = 1;

  constructor(shadowSize: number) {
    const geo = new THREE.SphereGeometry(900, 48, 24);
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false });
    this.dome = new THREE.Mesh(geo, mat);
    this.dome.frustumCulled = false;
    // After every opaque surface (so hidden sky pixels are rejected by the depth test), before transparent ones.
    this.dome.renderOrder = 10000;
    this.group.add(this.dome);

    const r = mulberry32(5);
    const n = 1400;
    const sp = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const phase = new Float32Array(n);
    const tint = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const e = Math.acos(1 - r() * 1.0);
      sp[i * 3] = Math.sin(e) * Math.cos(a) * 850;
      sp[i * 3 + 1] = Math.cos(e) * 850;
      sp[i * 3 + 2] = Math.sin(e) * Math.sin(a) * 850;
      const m = r();
      size[i] = m > 0.985 ? 3.6 : m > 0.9 ? 2.4 : 1.6;
      phase[i] = r();
      tint[i] = r();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    sg.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    sg.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
    const smat = new THREE.ShaderMaterial({ uniforms: this.starUniforms, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, depthTest: true, fog: false });
    this.stars = new THREE.Points(sg, smat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = 10001;
    this.group.add(this.stars);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    const cam = this.sun.shadow.camera;
    cam.left = -70;
    cam.right = 70;
    cam.top = 70;
    cam.bottom = -70;
    cam.near = 1;
    cam.far = 400;
    this.sun.shadow.bias = -0.00018;
    // The old 60 cm normal offset visibly detached feet and roots from their shadows.
    this.sun.shadow.normalBias = 0.075;
    this.group.add(this.sun, this.sun.target, this.moon, this.moon.target, this.hemi);
  }

  setShadowSize(size: number) {
    if (this.sun.shadow.mapSize.x === size) return;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.map?.dispose();
    (this.sun.shadow as unknown as { map: unknown }).map = null;
  }

  dispose() {
    this.dome.geometry.dispose();
    (this.dome.material as THREE.Material).dispose();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
  }

  /** hour is 0..24. focus is where the shadow frustum is centred. */
  update(hour: number, focus: THREE.Vector3, dt: number, reducedMotion: boolean) {
    let i = 0;
    while (i < KEYS.length - 2 && hour >= KEYS[i + 1]!.h) i++;
    const a = KEYS[i]!;
    const b = KEYS[i + 1]!;
    const t = (hour - a.h) / (b.h - a.h);
    const top = lerpHex(SKY.top.value, a.top, b.top, t);
    lerpHex(SKY.sunColor.value, a.sun, b.sun, t);
    const sunI = a.sunI + (b.sunI - a.sunI) * t;
    SKY.sunI.value = sunI;
    SKY.cover.value = a.cover + (b.cover - a.cover) * t;
    this.state.top.copy(top);

    // Sun arc: rises east-ish at 6, sets at 19.
    const day = smoothstep(5.5, 7, hour) * (1 - smoothstep(18.6, 20, hour));
    const ang = ((hour - 6) / 13) * Math.PI;
    const sunDir = this.state.sunDir.set(Math.cos(ang) * 0.95, Math.max(0.02, Math.sin(ang)) * 0.9 + 0.08, -0.32).normalize();
    if (hour < 6 || hour > 19) sunDir.y = Math.max(0.03, sunDir.y * 0.4);
    SKY.sunDir.value.copy(sunDir);
    this.state.nightness = 1 - clampNum(day + smoothstep(4.8, 6.2, hour) * 0.5 * (hour < 12 ? 1 : 0) + (hour > 12 ? smoothstep(20.5, 18.8, hour) * 0.5 : 0), 0, 1);
    const nightAmt = this.state.nightness;
    SKY.night.value = nightAmt;

    // The moon crosses the sky between 18:00 and 06:00 on the opposite side of the sun's arc.
    const mh = (hour + 6) % 24; // 0 at 18:00, 12 at 06:00
    const mAng = (mh / 12) * Math.PI;
    const moonDir = this.state.moonDir.set(Math.cos(mAng) * 0.9, Math.sin(mAng) * 0.78 + 0.1, 0.34).normalize();
    if (mh > 12) moonDir.y = -Math.abs(moonDir.y);
    SKY.moonDir.value.copy(moonDir);

    const br = this.brightness;
    this.sun.color.copy(SKY.sunColor.value);
    this.sun.intensity = sunI * 1.0 * br;
    this.sun.position.copy(focus).addScaledVector(sunDir, 160);
    this.sun.target.position.copy(focus);
    // Snap the shadow focus to texel-ish steps so shadows do not shimmer while walking.
    const step = (140 / this.sun.shadow.mapSize.x) * 4;
    this.sun.position.x = Math.round(this.sun.position.x / step) * step;
    this.sun.position.z = Math.round(this.sun.position.z / step) * step;
    this.sun.target.position.x = Math.round(this.sun.target.position.x / step) * step;
    this.sun.target.position.z = Math.round(this.sun.target.position.z / step) * step;
    this.sun.castShadow = sunI > 0.15;

    this.moon.color.setHex(0x9ab0e8);
    const moonUp = clampNum(moonDir.y * 4, 0, 1);
    this.moon.intensity = 0.5 * nightAmt * br * moonUp;
    this.moon.position.copy(focus).addScaledVector(moonDir, 120);
    this.moon.target.position.copy(focus);

    lerpHex(this.hemi.color, a.hemiSky, b.hemiSky, t);
    lerpHex(this.hemi.groundColor, a.hemiGround, b.hemiGround, t);
    SKY.ground.value.copy(this.hemi.groundColor);
    SKY.brightness.value = br;
    const hemiI = (a.hemiI + (b.hemiI - a.hemiI) * t) * (0.85 + 0.35 * br) * (1 + (br - 1) * nightAmt * 0.8);
    // The generated environment map supplies part of the sky fill once it is running.
    const target = SKY.ibl.value > 0.5 ? 0.78 : 1;
    this.hemiScale += (target - this.hemiScale) * (1 - Math.exp(-dt * 3));
    this.hemi.intensity = hemiI * this.hemiScale;
    SKY.ambient.value.copy(this.hemi.color).multiplyScalar(hemiI * 0.6 + 0.05);

    lerpHex(this.tmp, a.fog, b.fog, t);
    this.fog.color.copy(this.tmp);
    // Cool distance separates warm ground, shaded woodland and the far ridge without shortening the draw window.
    // Keep nearby materials legible; exponential haze grows gradually rather than introducing a visibility cutoff.
    this.fog.density = 0.0019 + 0.0019 * nightAmt;
    SKY.horizon.value.copy(this.tmp);
    this.state.horizon.copy(this.tmp);

    if (!reducedMotion) this.cloudTime += dt;
    SKY.time.value = this.cloudTime;
    this.starUniforms.uNight.value = clampNum(nightAmt * 1.3 - 0.15, 0, 1);
    this.starUniforms.uTime.value = this.cloudTime;
    this.starUniforms.uPx.value = Math.min(window.devicePixelRatio || 1, 2);

    // The sky follows the camera focus so the horizon never approaches.
    this.dome.position.copy(focus);
    this.stars.position.copy(focus);
  }
}

const clampNum = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
