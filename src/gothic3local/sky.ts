import * as THREE from 'three';

/**
 * The day's light (sun direction and colour, ambient sky and ground colours, the haze colour, by hour) and the sky
 * dome. The palette is a hand-made approximation of Gothic 3's Myrtana daylight (warm, hazy, contrasty), not data from
 * the game.
 */

export interface DayLight {
  sunDirection: THREE.Vector3;
  sun: THREE.Color;
  sunIntensity: number;
  sky: THREE.Color;
  ground: THREE.Color;
  ambient: number;
  zenith: THREE.Color;
  horizon: THREE.Color;
  fog: THREE.Color;
}

const KEYS: { h: number; zenith: number; horizon: number; sun: number; sunI: number; sky: number; ground: number; amb: number }[] = [
  { h: 0, zenith: 0x05070d, horizon: 0x101624, sun: 0x6f7fa8, sunI: 0.12, sky: 0x1b2333, ground: 0x0d0f12, amb: 0.35 },
  { h: 5, zenith: 0x1a2236, horizon: 0x5b4a4a, sun: 0xff9a5c, sunI: 0.25, sky: 0x3a4152, ground: 0x2a2420, amb: 0.45 },
  { h: 7, zenith: 0x4f6f95, horizon: 0xd9a77a, sun: 0xffc48a, sunI: 0.7, sky: 0x7a8798, ground: 0x4a3f33, amb: 0.55 },
  { h: 10, zenith: 0x5a83ad, horizon: 0xc7c8bb, sun: 0xfff0d8, sunI: 1.0, sky: 0x8e9aa6, ground: 0x5c5243, amb: 0.6 },
  { h: 14, zenith: 0x5d87b3, horizon: 0xcfcdbf, sun: 0xfff3e0, sunI: 1.05, sky: 0x929da8, ground: 0x5f5444, amb: 0.62 },
  { h: 17, zenith: 0x56779c, horizon: 0xe0b98c, sun: 0xffd6a2, sunI: 0.9, sky: 0x8a8f96, ground: 0x5a4c3c, amb: 0.58 },
  { h: 19.5, zenith: 0x2c3550, horizon: 0xd2774c, sun: 0xff8a4a, sunI: 0.45, sky: 0x4c4a55, ground: 0x2e2620, amb: 0.45 },
  { h: 21.5, zenith: 0x0b0f1a, horizon: 0x2a2433, sun: 0x8090c0, sunI: 0.15, sky: 0x1f2433, ground: 0x111214, amb: 0.36 },
  { h: 24, zenith: 0x05070d, horizon: 0x101624, sun: 0x6f7fa8, sunI: 0.12, sky: 0x1b2333, ground: 0x0d0f12, amb: 0.35 },
];

function lerpColor(a: number, b: number, t: number): THREE.Color {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}

export function dayLight(hour: number): DayLight {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1]!.h <= h) i++;
  const a = KEYS[i]!;
  const b = KEYS[i + 1]!;
  const t = (h - a.h) / (b.h - a.h);
  // The sun rises in the east (Gothic 3's +X) and stands high to the south at noon.
  const angle = ((h - 6) / 12) * Math.PI;
  const elevation = Math.sin(angle);
  const sunDirection = new THREE.Vector3(Math.cos(angle), Math.max(-0.2, elevation) * 0.9 + 0.12, 0.35).normalize();
  const horizon = lerpColor(a.horizon, b.horizon, t);
  return {
    sunDirection,
    sun: lerpColor(a.sun, b.sun, t),
    sunIntensity: a.sunI + (b.sunI - a.sunI) * t,
    sky: lerpColor(a.sky, b.sky, t),
    ground: lerpColor(a.ground, b.ground, t),
    ambient: a.amb + (b.amb - a.amb) * t,
    zenith: lerpColor(a.zenith, b.zenith, t),
    horizon,
    fog: horizon.clone().lerp(new THREE.Color(0x9a9a92), 0.25),
  };
}

/**
 * The sky: a gradient from the haze at the horizon to the zenith, the sun, and two drifting cloud layers. The cloud
 * images are the game's own two tileable cloud maps (sky/wolkentest_01 and _02, grey levels as density), read from the
 * player's data when present; how they are projected, mixed and lit is this viewer's own.
 */
export class SkyDome {
  readonly mesh: THREE.Mesh;
  private readonly uniforms: {
    zenith: { value: THREE.Color };
    horizon: { value: THREE.Color };
    haze: { value: THREE.Color };
    sunDir: { value: THREE.Vector3 };
    sunColor: { value: THREE.Color };
    daylight: { value: number };
    time: { value: number };
    cloudA: { value: THREE.Texture | null };
    cloudB: { value: THREE.Texture | null };
    clouds: { value: number };
  };

  constructor(time: { value: number }) {
    this.uniforms = {
      zenith: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      haze: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Color() },
      daylight: { value: 1 },
      time,
      cloudA: { value: null },
      cloudB: { value: null },
      clouds: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 zenith; uniform vec3 horizon; uniform vec3 haze; uniform vec3 sunDir; uniform vec3 sunColor;
        uniform float daylight; uniform float time; uniform float clouds;
        uniform sampler2D cloudA; uniform sampler2D cloudB;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float up = max(d.y, 0.0);
          vec3 col = mix(horizon, zenith, pow(up, 0.5));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          col += sunColor * (pow(s, 12.0) * 0.28 + pow(s, 3.0) * 0.08);
          float cover = 0.0;
          if (clouds > 0.5 && d.y > 0.0) {
            // The layers lie on a plane above the world, drifting at different speeds.
            vec2 p = d.xz / (d.y + 0.1);
            float a = texture2D(cloudA, p * 0.16 + vec2(time * 0.0035, time * 0.0012)).r;
            float b = texture2D(cloudB, p * 0.29 + vec2(-time * 0.0050, time * 0.0024)).r;
            float density = a * 0.7 + b * 0.5;
            cover = smoothstep(0.42, 0.95, density) * smoothstep(0.0, 0.22, d.y);
            float lit = 0.72 + 0.28 * a + 0.5 * pow(s, 6.0);
            vec3 bright = mix(vec3(1.0), sunColor, 0.35) * lit;
            vec3 shade = mix(horizon, zenith, 0.35) * 0.8;
            vec3 cloud = mix(shade, bright, smoothstep(0.35, 1.0, density)) * (0.18 + 0.82 * daylight);
            col = mix(col, cloud, cover * 0.9);
          }
          col += sunColor * pow(s, 900.0) * 3.0 * (1.0 - cover);
          // Towards the horizon the sky turns into the haze, so land lost in it meets the sky without a seam.
          col = mix(haze, col, smoothstep(-0.03, 0.2, d.y));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material);
    this.mesh.scale.setScalar(5000);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  setClouds(a: THREE.Texture | null, b: THREE.Texture | null): void {
    this.uniforms.cloudA.value = a;
    this.uniforms.cloudB.value = b ?? a;
    this.uniforms.clouds.value = a ? 1 : 0;
  }

  set(light: DayLight): void {
    this.uniforms.zenith.value.copy(light.zenith);
    this.uniforms.horizon.value.copy(light.horizon);
    this.uniforms.haze.value.copy(light.fog);
    this.uniforms.sunDir.value.copy(light.sunDirection);
    this.uniforms.sunColor.value.copy(light.sun).multiplyScalar(Math.min(1, light.sunIntensity));
    this.uniforms.daylight.value = Math.min(1, light.sunIntensity);
  }
}
