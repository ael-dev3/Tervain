import * as THREE from 'three';
import { mulberry32, smoothstep } from '../world/noise';

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
}

const KEYS: Key[] = [
  { h: 0, top: 0x0a1226, horizon: 0x1a2440, sun: 0x8fa4d8, sunI: 0.0, hemiSky: 0x3a4a78, hemiGround: 0x1a1e2a, hemiI: 0.42, fog: 0x1a2440 },
  { h: 5.2, top: 0x1e2c52, horizon: 0x6a5a6e, sun: 0xffb37a, sunI: 0.1, hemiSky: 0x5a6a92, hemiGround: 0x2a2a30, hemiI: 0.45, fog: 0x6a5f70 },
  { h: 6.5, top: 0x5a8ac4, horizon: 0xf2c99a, sun: 0xffc58a, sunI: 1.1, hemiSky: 0x9ab6d8, hemiGround: 0x60543a, hemiI: 0.6, fog: 0xd9c4a4 },
  { h: 9, top: 0x5c9ae0, horizon: 0xbfd8ea, sun: 0xfff1d6, sunI: 2.1, hemiSky: 0xa9c8ea, hemiGround: 0x6a6a48, hemiI: 0.72, fog: 0xc6dbe4 },
  { h: 13, top: 0x4c8fe0, horizon: 0xb4d4ee, sun: 0xfff6e2, sunI: 2.4, hemiSky: 0xa4c8ee, hemiGround: 0x6e6e4a, hemiI: 0.78, fog: 0xbad6ea },
  { h: 17, top: 0x568ad2, horizon: 0xd6d4c4, sun: 0xffe2b0, sunI: 2.0, hemiSky: 0xa0bce0, hemiGround: 0x6a5e42, hemiI: 0.68, fog: 0xd0d0c4 },
  { h: 18.8, top: 0x4a5a9a, horizon: 0xf0a878, sun: 0xff9a5a, sunI: 1.0, hemiSky: 0x8a8ab0, hemiGround: 0x503a30, hemiI: 0.55, fog: 0xe0a680 },
  { h: 20.2, top: 0x1e2850, horizon: 0x7a5a70, sun: 0xff8a60, sunI: 0.1, hemiSky: 0x50609a, hemiGround: 0x2a2630, hemiI: 0.44, fog: 0x6a5a6e },
  { h: 22, top: 0x0c142a, horizon: 0x1c2644, sun: 0x8fa4d8, sunI: 0.0, hemiSky: 0x3a4a78, hemiGround: 0x1a1e2a, hemiI: 0.42, fog: 0x1c2644 },
  { h: 24, top: 0x0a1226, horizon: 0x1a2440, sun: 0x8fa4d8, sunI: 0.0, hemiSky: 0x3a4a78, hemiGround: 0x1a1e2a, hemiI: 0.42, fog: 0x1a2440 },
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
  horizon: THREE.Color;
  top: THREE.Color;
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w * 0.9999;
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunI;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, -0.2, 1.0);
  float t = pow(clamp(h, 0.0, 1.0), 0.55);
  vec3 col = mix(uHorizon, uTop, t);
  // Sun glow and disc.
  float sd = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
  float glow = pow(sd, 22.0) * 0.55 + pow(sd, 220.0) * 1.4;
  col += uSunColor * glow * clamp(uSunI, 0.0, 1.0);
  // Below the horizon blends to the fog colour so the far terrain edge disappears.
  col = mix(col, uHorizon, smoothstep(0.0, -0.18, vDir.y));
  gl_FragColor = vec4(col, 1.0);
}`;

export class SkyRig {
  readonly group = new THREE.Group();
  readonly sun = new THREE.DirectionalLight(0xffffff, 2);
  readonly moon = new THREE.DirectionalLight(0x8fa4d8, 0.0);
  readonly hemi = new THREE.HemisphereLight(0xffffff, 0x555544, 0.7);
  readonly fog = new THREE.Fog(0xbfd8ea, 90, 520);
  private dome: THREE.Mesh;
  private stars: THREE.Points;
  private clouds: THREE.InstancedMesh;
  private cloudData: { x: number; y: number; z: number; s: number; sp: number }[] = [];
  private uniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color() },
    uSunI: { value: 1 },
  };
  state: SkyState = { nightness: 0, sunDir: new THREE.Vector3(0, 1, 0), horizon: new THREE.Color(), top: new THREE.Color() };
  brightness = 1;
  private tmp = new THREE.Color();
  private cloudMat: THREE.MeshBasicMaterial;

  constructor(shadowSize: number) {
    const geo = new THREE.SphereGeometry(900, 32, 16);
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false });
    this.dome = new THREE.Mesh(geo, mat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    this.group.add(this.dome);

    const r = mulberry32(5);
    const sp: number[] = [];
    for (let i = 0; i < 700; i++) {
      const a = r() * Math.PI * 2;
      const e = Math.acos(1 - r() * 0.95);
      sp.push(Math.sin(e) * Math.cos(a) * 850, Math.cos(e) * 850, Math.sin(e) * Math.sin(a) * 850);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    this.group.add(this.stars);

    // Low-poly clouds: flattened icospheres that drift slowly.
    this.cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false, depthWrite: false });
    const cg = new THREE.IcosahedronGeometry(1, 1);
    this.clouds = new THREE.InstancedMesh(cg, this.cloudMat, 60);
    this.clouds.frustumCulled = false;
    const cr = mulberry32(17);
    for (let i = 0; i < 20; i++) {
      const cx = (cr() - 0.5) * 1500;
      const cz = (cr() - 0.5) * 1500;
      const cy = 260 + cr() * 90;
      const puffs = 3;
      for (let p = 0; p < puffs; p++) {
        this.cloudData.push({ x: cx + (p - 1) * 40 * (0.7 + cr() * 0.6), y: cy + cr() * 8, z: cz + (cr() - 0.5) * 30, s: 40 + cr() * 40, sp: 1.2 + cr() * 0.6 });
      }
    }
    this.group.add(this.clouds);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    const cam = this.sun.shadow.camera;
    cam.left = -70;
    cam.right = 70;
    cam.top = 70;
    cam.bottom = -70;
    cam.near = 1;
    cam.far = 400;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.6;
    this.group.add(this.sun, this.sun.target, this.moon, this.moon.target, this.hemi);
  }

  setShadowSize(size: number) {
    if (this.sun.shadow.mapSize.x === size) return;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.map?.dispose();
    (this.sun.shadow as unknown as { map: unknown }).map = null;
  }

  /** hour is 0..24. focus is where the shadow frustum is centred. */
  update(hour: number, focus: THREE.Vector3, dt: number, reducedMotion: boolean) {
    let i = 0;
    while (i < KEYS.length - 2 && hour >= KEYS[i + 1]!.h) i++;
    const a = KEYS[i]!;
    const b = KEYS[i + 1]!;
    const t = (hour - a.h) / (b.h - a.h);
    const top = lerpHex(this.uniforms.uTop.value, a.top, b.top, t);
    const horizon = lerpHex(this.uniforms.uHorizon.value, a.horizon, b.horizon, t);
    lerpHex(this.uniforms.uSunColor.value, a.sun, b.sun, t);
    const sunI = a.sunI + (b.sunI - a.sunI) * t;
    this.uniforms.uSunI.value = sunI;
    this.state.top.copy(top);
    this.state.horizon.copy(horizon);

    // Sun arc: rises east-ish at 6, sets at 19.
    const day = smoothstep(5.5, 7, hour) * (1 - smoothstep(18.6, 20, hour));
    const ang = ((hour - 6) / 13) * Math.PI;
    const sunDir = this.state.sunDir.set(Math.cos(ang) * 0.95, Math.max(0.02, Math.sin(ang)) * 0.9 + 0.08, -0.32).normalize();
    if (hour < 6 || hour > 19) sunDir.y = Math.max(0.03, sunDir.y * 0.4);
    this.uniforms.uSunDir.value.copy(sunDir);
    this.state.nightness = 1 - clampNum(day + smoothstep(4.8, 6.2, hour) * 0.5 * (hour < 12 ? 1 : 0) + (hour > 12 ? smoothstep(20.5, 18.8, hour) * 0.5 : 0), 0, 1);

    const br = this.brightness;
    this.sun.color.copy(this.uniforms.uSunColor.value);
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

    const nightAmt = this.state.nightness;
    this.moon.color.setHex(0x9ab0e8);
    this.moon.intensity = 0.42 * nightAmt * br;
    this.moon.position.copy(focus).set(focus.x - sunDir.x * 100, 120, focus.z - sunDir.z * 100 + 20);
    this.moon.target.position.copy(focus);

    lerpHex(this.hemi.color, a.hemiSky, b.hemiSky, t);
    lerpHex(this.hemi.groundColor, a.hemiGround, b.hemiGround, t);
    this.hemi.intensity = (a.hemiI + (b.hemiI - a.hemiI) * t) * (0.85 + 0.35 * br) * (1 + (br - 1) * nightAmt * 0.8);

    lerpHex(this.tmp, a.fog, b.fog, t);
    this.fog.color.copy(this.tmp);
    this.fog.near = 70 + 40 * (1 - nightAmt);
    this.fog.far = 430 + 140 * (1 - nightAmt);
    horizon.copy(this.tmp);

    (this.stars.material as THREE.PointsMaterial).opacity = clampNum(nightAmt * 1.3 - 0.15, 0, 1);
    this.cloudMat.color.copy(this.tmp).lerp(this.tmp2.setHex(0xffffff), 0.55 * (1 - nightAmt));
    this.cloudMat.opacity = 0.35 + 0.55 * (1 - nightAmt);

    // The sky follows the camera focus so the horizon never approaches.
    this.dome.position.copy(focus);
    this.stars.position.copy(focus);
    const drift = reducedMotion ? 0 : dt;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    this.cloudData.forEach((c, k) => {
      c.x += c.sp * drift;
      if (c.x > 900) c.x -= 1800;
      p.set(focus.x * 0.5 + c.x, c.y, focus.z * 0.5 + c.z);
      s.set(c.s, c.s * 0.28, c.s * 0.7);
      m.compose(p, q, s);
      this.clouds.setMatrixAt(k, m);
    });
    this.clouds.count = this.cloudData.length;
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  private tmp2 = new THREE.Color();
}

const clampNum = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
