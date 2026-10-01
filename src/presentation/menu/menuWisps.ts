import * as THREE from 'three';
import { GROVE_HOMECOMING, GROVE_TRAIL, groveSpiritBand, type MenuGrove } from './menuGrove';
import { createWispLighting, type WispLighting } from './menuWispLight';

/**
 * How the hermitage's spirits look (0.0.7, A32): living lights rather than pearls. Each is a camera-facing flame of
 * light — a white-hot heart in a coloured glow that flickers at its rim and streaks back along its flight — with a
 * fading ribbon drawn through the path it actually flew and a few sparks shed along it. Colour follows the band of the
 * score the spirit dances to (cool for low notes near the roots, warm for the high ones in the crown); brightness,
 * size, flare and the sparks follow that band's measured level and the score's accents, so the tree shows the music.
 *
 * Three additive draws, texture-free, depth-tested against the tree (the bole hides spirits behind it) and never
 * writing depth. Positions come from the grove simulation in the tree's own frame; the group carries the tree's place.
 * The brightest spirits near the wood also light it (menuWispLight).
 */

export interface MenuWisps {
  group: THREE.Group;
  lights: WispLighting;
  stats: { wisps: number; triangles: number; meshes: number };
  /** Draw the grove's current pose. `gain` is the score's audible mix: zero hides the spirits. */
  update(grove: MenuGrove, gain: number, camera: THREE.Camera): void;
  setPixelScale(scale: number): void;
  dispose(): void;
}

/** Linear spirit colours by band: sub, bass, low-mid, mid, high-mid, presence. */
export const WISP_COLOURS: readonly (readonly [number, number, number])[] = [
  [0.48, 0.4, 1.0],
  [0.22, 0.62, 1.0],
  [0.16, 0.95, 0.8],
  [0.52, 1.0, 0.42],
  [1.0, 0.74, 0.3],
  [1.0, 0.42, 0.62],
];
export const WISP_COUNTS = { low: 16, medium: 28, high: 40 } as const;
const LIGHTS = { low: 3, medium: 5, high: 7 } as const;
const MOTES = 6;

const GLOW_VERT = /* glsl */ `
attribute vec4 aCentre;
attribute vec4 aColour;
attribute vec4 aMotion;
varying vec2 vQ;
varying vec2 vOff;
varying vec4 vColour;
varying float vSeed;
void main() {
  vec4 c = modelViewMatrix * vec4(aCentre.xyz, 1.0);
  vec3 vel = mat3(modelViewMatrix) * aMotion.xyz;
  float speed = length(vel.xy);
  vec2 along = speed > 1e-3 ? vel.xy / speed : vec2(0.0, 1.0);
  vec2 across = vec2(-along.y, along.x);
  // The trailing half stretches back along the flight, a little more the faster it goes.
  float stretch = 1.0 + clamp(speed * 0.085, 0.0, 1.15);
  vec2 q = position.xy;
  vec2 off = along * q.x * (q.x < 0.0 ? stretch : 1.0) + across * q.y;
  c.xy += off * aCentre.w;
  vQ = q;
  vOff = off;
  vColour = aColour;
  vSeed = aMotion.w;
  gl_Position = projectionMatrix * c;
}`;

const GLOW_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vQ;
varying vec2 vOff;
varying vec4 vColour;
varying float vSeed;
void main() {
  float r2 = dot(vQ, vQ);
  if (r2 > 1.0) discard;
  // The rim breathes unevenly, like a flame, never like a lamp.
  float a = atan(vQ.y, vQ.x);
  float flick = 0.84 + 0.16 * sin(a * 3.0 + uTime * 7.3 + vSeed * 17.0) * sin(a * 5.0 - uTime * 4.7 + vSeed * 5.0);
  float core = exp(-r2 * 30.0);
  float inner = exp(-r2 * 8.0 / flick);
  float halo = exp(-r2 * 3.0) * (1.0 - r2);
  vec3 tint = vColour.rgb;
  // A small tongue of flame licks upward from the heart of each spirit and flickers in height.
  float lick = 0.22 + 0.06 * sin(uTime * 9.0 + vSeed * 31.0) + 0.04 * sin(uTime * 15.0 + vSeed * 7.0);
  float tongue = exp(-vOff.x * vOff.x * 34.0 - (vOff.y - lick) * (vOff.y - lick) * 14.0) * smoothstep(-0.05, 0.12, vOff.y);
  vec3 col = tint * (inner * 0.95 + halo * 0.13 + tongue * 0.6) + mix(tint, vec3(1.0, 0.98, 0.94), 0.42) * core * 1.7;
  gl_FragColor = vec4(col * vColour.a, 1.0);
}`;

const TRAIL_VERT = /* glsl */ `
attribute vec3 aTangent;
attribute vec4 aTrail;
attribute vec3 aColour;
varying float vAge;
varying float vSide;
varying vec3 vColour;
varying float vIntensity;
void main() {
  vec4 c = modelViewMatrix * vec4(position, 1.0);
  vec3 t = mat3(modelViewMatrix) * aTangent;
  vec2 side = vec2(-t.y, t.x);
  float l = length(side);
  side = l > 1e-5 ? side / l : vec2(1.0, 0.0);
  c.xy += side * aTrail.x * aTrail.z;
  vAge = aTrail.y;
  vSide = aTrail.x;
  vColour = aColour;
  vIntensity = aTrail.w;
  gl_Position = projectionMatrix * c;
}`;

const TRAIL_FRAG = /* glsl */ `
varying float vAge;
varying float vSide;
varying vec3 vColour;
varying float vIntensity;
void main() {
  float across = exp(-vSide * vSide * 2.6);
  float along = pow(max(0.0, 1.0 - vAge), 1.7);
  gl_FragColor = vec4(vColour * (across * along * vIntensity), 1.0);
}`;

const MOTE_VERT = /* glsl */ `
attribute vec4 aMote;
attribute vec3 aColour;
uniform float uPixel;
varying vec3 vColour;
varying float vIntensity;
void main() {
  vec4 c = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * c;
  gl_PointSize = max(1.0, aMote.x * uPixel);
  vColour = aColour;
  vIntensity = aMote.y;
}`;

const MOTE_FRAG = /* glsl */ `
varying vec3 vColour;
varying float vIntensity;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  // A small soft spark with a faint four-point glint.
  float glint = exp(-abs(p.x) * 9.0) * exp(-abs(p.y) * 1.6) + exp(-abs(p.y) * 9.0) * exp(-abs(p.x) * 1.6);
  float spark = exp(-r2 * 6.0) + glint * 0.35;
  gl_FragColor = vec4(mix(vColour, vec3(1.0), 0.4) * spark * vIntensity, 1.0);
}`;

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

export function buildMenuWisps(options: { tree: { x: number; y: number; z: number; yaw: number }; quality: 'low' | 'medium' | 'high' }): MenuWisps {
  const count = WISP_COUNTS[options.quality];
  const lights = createWispLighting(LIGHTS[options.quality]);
  const group = new THREE.Group();
  group.name = 'Menu_Hermitage_Wisps';
  group.position.set(options.tree.x, options.tree.y, options.tree.z);
  group.rotation.y = options.tree.yaw;
  group.visible = false;
  group.updateMatrixWorld(true);

  // ---- Glow flames: one camera-facing quad per spirit. ----
  const quad = new THREE.PlaneGeometry(2, 2);
  const glowGeometry = new THREE.InstancedBufferGeometry();
  glowGeometry.setIndex(quad.index);
  glowGeometry.setAttribute('position', quad.getAttribute('position'));
  glowGeometry.instanceCount = count;
  const centre = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const colour = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const motion = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
  glowGeometry.setAttribute('aCentre', centre);
  glowGeometry.setAttribute('aColour', colour);
  glowGeometry.setAttribute('aMotion', motion);
  glowGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 5, 0), 16);
  quad.dispose();
  const time = { value: 0 };
  const additive = { transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false } as const;
  const glowMaterial = new THREE.ShaderMaterial({ vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, uniforms: { uTime: time }, ...additive });

  // ---- Ribbons through each spirit's recent path. ----
  const points = GROVE_TRAIL + 1;
  const verts = count * points * 2;
  const trailGeometry = new THREE.BufferGeometry();
  const trailPos = new THREE.BufferAttribute(new Float32Array(verts * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const trailTan = new THREE.BufferAttribute(new Float32Array(verts * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const trailInfo = new THREE.BufferAttribute(new Float32Array(verts * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const trailColour = new THREE.BufferAttribute(new Float32Array(verts * 3), 3).setUsage(THREE.DynamicDrawUsage);
  trailGeometry.setAttribute('position', trailPos);
  trailGeometry.setAttribute('aTangent', trailTan);
  trailGeometry.setAttribute('aTrail', trailInfo);
  trailGeometry.setAttribute('aColour', trailColour);
  const index: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < points - 1; k++) {
      const a = (i * points + k) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  trailGeometry.setIndex(index);
  trailGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 5, 0), 16);
  const trailMaterial = new THREE.ShaderMaterial({ vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG, side: THREE.DoubleSide, forceSinglePass: true, ...additive });

  // ---- Sparks shed along the paths. ----
  const motes = count * MOTES;
  const moteGeometry = new THREE.BufferGeometry();
  const motePos = new THREE.BufferAttribute(new Float32Array(motes * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const moteInfo = new THREE.BufferAttribute(new Float32Array(motes * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const moteColour = new THREE.BufferAttribute(new Float32Array(motes * 3), 3).setUsage(THREE.DynamicDrawUsage);
  moteGeometry.setAttribute('position', motePos);
  moteGeometry.setAttribute('aMote', moteInfo);
  moteGeometry.setAttribute('aColour', moteColour);
  moteGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 5, 0), 16);
  const pixel = { value: 1 };
  const moteMaterial = new THREE.ShaderMaterial({ vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, uniforms: { uPixel: pixel }, ...additive });

  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.name = 'Menu_Wisp_Flames';
  glow.renderOrder = 6;
  const trail = new THREE.Mesh(trailGeometry, trailMaterial);
  trail.name = 'Menu_Wisp_Trails';
  trail.renderOrder = 5;
  const sparks = new THREE.Points(moteGeometry, moteMaterial);
  sparks.name = 'Menu_Wisp_Sparks';
  sparks.renderOrder = 7;
  for (const o of [trail, glow, sparks]) {
    o.castShadow = o.receiveShadow = false;
    o.frustumCulled = false;
    group.add(o);
  }

  const intensity = new Float32Array(count);
  const order: number[] = [];
  const view = new THREE.Vector3();
  const modelView = new THREE.Matrix4();
  let disposed = false;
  let lastTime = -1;
  let lastGain = -1;

  const clearLights = () => {
    for (const c of lights.uniforms.uWispColours.value) c.set(0, 0, 0, 0);
  };

  return {
    group,
    lights,
    stats: { wisps: count, triangles: count * 2 + count * (points - 1) * 2, meshes: 3 },
    setPixelScale(scale: number) {
      pixel.value = Number.isFinite(scale) ? Math.max(0.5, Math.min(2, scale)) : 1;
    },
    update(grove, gain, camera) {
      if (disposed) return;
      const g = Number.isFinite(gain) ? Math.max(0, Math.min(1, gain)) : 0;
      // The door shut fast behind the last of them: nothing to see until the song comes round again.
      group.visible = g > 0 && grove.awake && grove.doorAngle > 0.01;
      if (!group.visible) {
        clearLights();
        lastTime = -1;
        return;
      }
      if (grove.time === lastTime && g === lastGain) return;
      lastTime = grove.time;
      lastGain = g;
      time.value = grove.time;
      const rh = grove.rhythm;
      const perceptual = Math.sqrt(g) * 1.25;
      const treble = 0.5 * (rh.bands[4]! + rh.bands[5]!);
      const flash = Math.min(1.4, rh.accent);
      // Coming home they gather close before the door: a little dimmer, so the crowd stays a ring of lights, not a glare.
      const homecoming = 1 - 0.35 * Math.max(0, Math.min(1, (grove.time - GROVE_HOMECOMING) / 3));
      for (let i = 0; i < count; i++) {
        const b = groveSpiritBand(i);
        const level = rh.bands[b]!;
        const c = WISP_COLOURS[b]!;
        const x = grove.position[i * 3]!;
        const y = grove.position[i * 3 + 1]!;
        const z = grove.position[i * 3 + 2]!;
        const bump = grove.bump[i]!;
        // Dimmer while still in the hollow: a crowd of them in so small a space would only be a white blur.
        const shown = 0.22 + 0.78 * grove.outside[i]!;
        const lit = (0.32 + 0.95 * Math.pow(level, 1.4) + 0.35 * flash + 0.5 * bump) * perceptual * shown * homecoming;
        intensity[i] = lit;
        centre.setXYZW(i, x, y, z, (0.5 + 0.22 * level + 0.1 * flash + 0.1 * bump) * (0.55 + 0.45 * shown));
        colour.setXYZW(i, c[0], c[1], c[2], lit);
        motion.setXYZW(i, grove.velocity[i * 3]!, grove.velocity[i * 3 + 1]!, grove.velocity[i * 3 + 2]!, hash(i, 1));
        // Ribbon: head, then the ring of past samples from newest to oldest.
        const base = i * points * 2;
        const width = 0.075 + 0.07 * level;
        for (let k = 0; k < points; k++) {
          let px: number;
          let py: number;
          let pz: number;
          if (k === 0) {
            px = x;
            py = y;
            pz = z;
          } else {
            const slot = (grove.trailHead - (k - 1) + GROVE_TRAIL * 2) % GROVE_TRAIL;
            const o = (i * GROVE_TRAIL + slot) * 3;
            px = grove.trail[o]!;
            py = grove.trail[o + 1]!;
            pz = grove.trail[o + 2]!;
          }
          const age = k / (points - 1);
          for (let s = 0; s < 2; s++) {
            const v = base + k * 2 + s;
            trailPos.setXYZ(v, px, py, pz);
            trailInfo.setXYZW(v, s === 0 ? -1 : 1, age, width * (1 - age * 0.7), lit * 0.85);
            trailColour.setXYZ(v, c[0], c[1], c[2]);
          }
        }
        // Tangents from neighbouring ribbon points.
        for (let k = 0; k < points; k++) {
          const a = base + Math.max(0, k - 1) * 2;
          const n = base + Math.min(points - 1, k + 1) * 2;
          const tx = trailPos.getX(a) - trailPos.getX(n);
          const ty = trailPos.getY(a) - trailPos.getY(n);
          const tz = trailPos.getZ(a) - trailPos.getZ(n);
          trailTan.setXYZ(base + k * 2, tx, ty, tz);
          trailTan.setXYZ(base + k * 2 + 1, tx, ty, tz);
        }
        // Sparks: each rides one past sample and drifts down and aside as it ages; seeded by that sample's own step.
        for (let m = 0; m < MOTES; m++) {
          const k = 2 + m * 3;
          const slot = (grove.trailHead - k + GROVE_TRAIL * 2) % GROVE_TRAIL;
          const o = (i * GROVE_TRAIL + slot) * 3;
          const born = grove.trailStep - k * 2;
          const age = k / GROVE_TRAIL;
          const hx = hash(born, i * 7 + m) - 0.5;
          const hz = hash(i * 13 + m, born) - 0.5;
          const v = i * MOTES + m;
          motePos.setXYZ(v, grove.trail[o]! + hx * 0.5 * age, grove.trail[o + 1]! - 0.22 * age * age + (hash(born, m) - 0.5) * 0.15, grove.trail[o + 2]! + hz * 0.5 * age);
          const twinkle = 0.55 + 0.45 * Math.sin(grove.time * 13 + hash(born, i) * 40);
          moteInfo.setXYZW(v, 2.2 + 2.6 * level, (1 - age) * (1 - age) * twinkle * (0.25 + 1.1 * treble + 0.5 * flash) * lit, 0, 0);
          moteColour.setXYZ(v, c[0], c[1], c[2]);
        }
      }
      for (const a of [centre, colour, motion]) a.needsUpdate = true;
      for (const a of [trailPos, trailTan, trailInfo, trailColour, motePos, moteInfo, moteColour]) a.needsUpdate = true;

      // ---- Light on the wood: the brightest spirits closest to it, faded in and out without popping. ----
      const L = lights.count;
      if (L > 0) {
        order.length = 0;
        for (let i = 0; i < count; i++) order.push(i);
        const weight = (i: number) => {
          const c = Math.max(0, grove.clearance(grove.position[i * 3]!, grove.position[i * 3 + 1]!, grove.position[i * 3 + 2]!));
          return intensity[i]! / (1 + c * c * 0.8);
        };
        const w = order.map(weight);
        order.sort((a, b) => w[b]! - w[a]! || a - b);
        const cut = w[order[L] ?? -1] ?? 0;
        modelView.multiplyMatrices(camera.matrixWorldInverse, group.matrixWorld);
        for (let k = 0; k < L; k++) {
          const i = order[k];
          const light = lights.uniforms.uWispLights.value[k]!;
          const tint = lights.uniforms.uWispColours.value[k]!;
          if (i === undefined) {
            tint.set(0, 0, 0, 0);
            continue;
          }
          view.set(grove.position[i * 3]!, grove.position[i * 3 + 1]!, grove.position[i * 3 + 2]!).applyMatrix4(modelView);
          light.set(view.x, view.y, view.z, 4.2);
          const fade = w[i]! > 0 ? Math.max(0, 1 - cut / w[i]!) : 0;
          const c = WISP_COLOURS[groveSpiritBand(i)]!;
          const power = intensity[i]! * fade * 1.6;
          tint.set(c[0] * power, c[1] * power, c[2] * power, grove.outside[i]!);
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.visible = false;
      group.clear();
      glowGeometry.dispose();
      trailGeometry.dispose();
      moteGeometry.dispose();
      glowMaterial.dispose();
      trailMaterial.dispose();
      moteMaterial.dispose();
    },
  };
}
