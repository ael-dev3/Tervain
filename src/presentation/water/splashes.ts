import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';
import { SKY } from '../skyState';

/**
 * Spray: droplets thrown up where something meets the water hard (a body or barrel landing in it, a jump, a swimmer's
 * stroke, an arrow), and the spray of a wave bursting on rock. A fixed pool of soft round droplets, moved on the CPU
 * (there are only ever a few hundred) and drawn in one call.
 */

const MAX = 480;

interface Drop {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; max: number; size: number;
}

const VERT = /* glsl */ `
attribute float aSize;
attribute float aFade;
uniform float uScale;
varying float vFade;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.1), 0.0, 48.0);
  vFade = aFade;
}`;

const FRAG = /* glsl */ `
uniform vec3 uSunColor;
uniform float uSunI;
uniform float uNight;
uniform vec3 uAmbient;
varying float vFade;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = dot(c, c);
  if (r > 1.0 || vFade <= 0.0) discard;
  // A droplet is mostly clear, with a bright rim where it catches the light.
  float body = (1.0 - r) * 0.45 + smoothstep(0.55, 0.95, r) * 0.55;
  vec3 light = uAmbient * 0.9 + uSunColor * min(uSunI, 2.4) * (1.0 - uNight) * 0.55;
  gl_FragColor = vec4(vec3(0.9, 0.95, 0.96) * light, body * vFade * 0.85);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Splashes {
  readonly points: THREE.Points;
  private readonly drops: Drop[] = [];
  private readonly positions = new Float32Array(MAX * 3);
  private readonly sizes = new Float32Array(MAX);
  private readonly fades = new Float32Array(MAX);
  private readonly random = mulberry32(5501);
  private next = 0;
  enabled = true;

  constructor() {
    for (let i = 0; i < MAX; i++) this.drops.push({ x: 0, y: -1000, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 0 });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aFade', new THREE.BufferAttribute(this.fades, 1).setUsage(THREE.DynamicDrawUsage));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 700 }, uSunColor: SKY.sunColor, uSunI: SKY.sunI, uNight: SKY.night, uAmbient: SKY.ambient },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(geo, material);
    this.points.name = 'water-spray';
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
  }

  /** Throw `count` droplets from (x, y, z): `speed` up and out (m/s), each about `size` metres across. */
  emit(x: number, y: number, z: number, count: number, speed: number, size = 0.05, spread = 1, push: { x: number; z: number } = { x: 0, z: 0 }) {
    if (!this.enabled || ![x, y, z, count, speed].every(Number.isFinite)) return;
    const r = this.random;
    for (let k = 0; k < Math.min(count, 120); k++) {
      const d = this.drops[this.next]!;
      this.next = (this.next + 1) % MAX;
      const angle = r() * Math.PI * 2, out = r() * spread;
      const up = speed * (0.55 + 0.45 * r());
      d.x = x + Math.cos(angle) * 0.15 * r(); d.y = y; d.z = z + Math.sin(angle) * 0.15 * r();
      d.vx = Math.cos(angle) * up * out * 0.6 + push.x; d.vz = Math.sin(angle) * up * out * 0.6 + push.z; d.vy = up;
      d.max = d.life = 0.5 + r() * 0.7 + speed * 0.08;
      d.size = size * (0.5 + r());
    }
  }

  update(dt: number) {
    const step = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.1) : 0;
    for (let i = 0; i < MAX; i++) {
      const d = this.drops[i]!;
      if (d.life > 0) {
        d.life -= step;
        d.vy -= 9.81 * step;
        const drag = Math.exp(-step * 1.4);
        d.vx *= drag; d.vz *= drag;
        d.x += d.vx * step; d.y += d.vy * step; d.z += d.vz * step;
      }
      const alive = d.life > 0;
      this.positions[i * 3] = d.x; this.positions[i * 3 + 1] = alive ? d.y : -1000; this.positions[i * 3 + 2] = d.z;
      this.sizes[i] = alive ? d.size : 0;
      this.fades[i] = alive ? Math.min(1, d.life / (d.max * 0.4)) : 0;
    }
    const geo = this.points.geometry;
    geo.attributes.position!.needsUpdate = geo.attributes.aSize!.needsUpdate = geo.attributes.aFade!.needsUpdate = true;
  }

  /** How many droplets are in the air (for the developer panel and tests). */
  get active(): number {
    return this.drops.filter((d) => d.life > 0).length;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
