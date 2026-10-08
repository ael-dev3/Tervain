/**
 * Adapted from ael-dev3/Warpkeep src/components/realm/createRealmEnvironment.ts @786c0b2 (Apache-2.0):
 * the asset-free generated equirectangular sky used as image-based lighting. Here the map follows the day/night
 * cycle (regenerated at a slow rate from the shared sky state) instead of being a single fixed sky.
 */
import * as THREE from 'three';
import type { FrameContext, Quality } from './context';
import { SKY } from './skyState';

export interface EnvironmentHandle {
  update(dt: number, f: FrameContext): void;
  dispose?(): void;
}

interface Spec {
  w: number;
  h: number;
  intensity: number;
}

const SPECS: Record<Quality, Spec> = {
  high: { w: 128, h: 64, intensity: 0.78 },
  medium: { w: 128, h: 64, intensity: 0.78 },
  low: { w: 64, h: 32, intensity: 0.73 },
};

/** Seconds of real time between regenerations. The day is 24 minutes long, so the sky changes very slowly. */
const REGEN_INTERVAL = 1.8;

const tmpTop = new THREE.Color();
const tmpHor = new THREE.Color();
const tmpGround = new THREE.Color();
const tmpSun = new THREE.Color();

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Fill a half-float equirect with the sky as an image-based light: zenith and horizon gradient, a warm ground
 * bounce, a sun core and glow, a moon glow, and a small night fill so shade never goes flat black.
 */
function paint(data: Uint16Array, w: number, h: number) {
  tmpTop.copy(SKY.top.value);
  tmpHor.copy(SKY.horizon.value);
  tmpGround.copy(SKY.ground.value);
  tmpSun.copy(SKY.sunColor.value);
  const sun = SKY.sunDir.value;
  const moon = SKY.moonDir.value;
  const sunI = SKY.sunI.value;
  const night = SKY.night.value;
  const br = SKY.brightness.value;
  const cover = SKY.cover.value;
  // Bright ground bounce needs light: sunlit grass and rock return the sun, not just the sky.
  const bounce = 0.5 + 0.65 * clamp(sunI / 2.5, 0, 1);
  const gr = tmpGround.r * bounce * 1.5;
  const gg = tmpGround.g * bounce * 1.5;
  const gb = tmpGround.b * bounce * 1.5;
  const coreK = (1.0 - cover * 0.45) * sunI;
  const glowK = (0.22 + cover * 0.16) * sunI;
  const moonUp = clamp(moon.y * 5, 0, 1) * night;
  // A cool floor so night shade keeps some blue rather than going black (scaled by the brightness setting).
  const nightFill = night * 0.05 * (0.6 + 0.6 * br);
  const half = THREE.DataUtils.toHalfFloat;
  for (let y = 0; y < h; y++) {
    const lat = ((y + 0.5) / h - 0.5) * Math.PI;
    const cl = Math.cos(lat);
    const dy = Math.sin(lat);
    for (let x = 0; x < w; x++) {
      const lon = ((x + 0.5) / w - 0.5) * Math.PI * 2;
      const dx = cl * Math.cos(lon);
      const dz = cl * Math.sin(lon);
      let r: number;
      let g: number;
      let b: number;
      if (dy >= 0) {
        const t = Math.pow(dy, 0.5);
        r = tmpHor.r + (tmpTop.r - tmpHor.r) * t;
        g = tmpHor.g + (tmpTop.g - tmpHor.g) * t;
        b = tmpHor.b + (tmpTop.b - tmpHor.b) * t;
      } else {
        const t = smooth01(-dy / 0.5);
        r = tmpHor.r * 0.7 + (gr - tmpHor.r * 0.7) * t;
        g = tmpHor.g * 0.7 + (gg - tmpHor.g * 0.7) * t;
        b = tmpHor.b * 0.7 + (gb - tmpHor.b * 0.7) * t;
      }
      // Sun: a tight core (specular sheen) inside a broad soft glow (warm fill on the sunward side).
      const cs = clamp(dx * sun.x + dy * sun.y + dz * sun.z, -1, 1);
      if (cs > 0) {
        const a = Math.acos(cs);
        // The directional light carries the strong sunlight. The hotspot here is broad and low (A67): a tight bright one
        // put a polished sheen on every rough surface (timber, stone, cloth, skin). Spread over about three times the sky
        // at a third of the peak, it gives walls the same warm fill (a low sun's glow at evening) without the sheen.
        const core = Math.exp(-(a * a) / (0.2 * 0.2)) * 0.6 * coreK;
        const glow = Math.exp(-(a * a) / (0.62 * 0.62)) * glowK;
        r += tmpSun.r * (core + glow);
        g += tmpSun.g * (core + glow);
        b += tmpSun.b * (core + glow);
      }
      if (moonUp > 0) {
        const cm = clamp(dx * moon.x + dy * moon.y + dz * moon.z, -1, 1);
        if (cm > 0) {
          const a = Math.acos(cm);
          const m = (Math.exp(-(a * a) / (0.05 * 0.05)) * 0.9 + Math.exp(-(a * a) / (0.5 * 0.5)) * 0.06) * moonUp;
          r += 0.55 * m;
          g += 0.65 * m;
          b += 0.95 * m;
        }
      }
      const o = (y * w + x) * 4;
      data[o] = half(r + nightFill * 0.5);
      data[o + 1] = half(g + nightFill * 0.65);
      data[o + 2] = half(b + nightFill * 1.0);
      data[o + 3] = half(1);
    }
  }
}

function smooth01(t: number) {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

/**
 * Scene-wide lighting environment: the image-based light generated from the sky, and exposure. Presentation only.
 *
 * Exposure lives here (rather than in the app) because it follows the time of day: a little lower at noon so
 * bright surfaces keep their colour, a little higher at night so the valley stays navigable. The renderer is found
 * the first time the scene is drawn.
 */
export function buildEnvironment(scene: THREE.Scene, quality: Quality): EnvironmentHandle {
  const spec = SPECS[quality];
  let current: THREE.DataTexture | null = null;
  let timer = REGEN_INTERVAL;
  let lastHour = -1;
  let renderer: THREE.WebGLRenderer | null = null;
  let exposure = 1.0;
  const previousHook = scene.onBeforeRender;

  scene.onBeforeRender = function (this: THREE.Scene, r, s, c, g, m, gr) {
    renderer = r as THREE.WebGLRenderer;
    previousHook.call(this, r, s, c, g, m, gr);
  };
  scene.environmentIntensity = spec.intensity;

  const regenerate = () => {
    const data = new Uint16Array(spec.w * spec.h * 4);
    paint(data, spec.w, spec.h);
    const tex = new THREE.DataTexture(data, spec.w, spec.h, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    scene.environment = tex;
    current?.dispose();
    current = tex;
    SKY.ibl.value = 1;
  };

  return {
    update(dt, f) {
      timer += dt;
      const jumped = lastHour >= 0 && Math.abs(f.hour - lastHour) > 0.2 && Math.abs(f.hour - lastHour) < 23.8;
      lastHour = f.hour;
      if (timer >= REGEN_INTERVAL || jumped) {
        timer = 0;
        regenerate();
      }
      // Exposure: ease toward the value for this time of day.
      const target = 1.0 + 0.34 * SKY.night.value;
      exposure += (target - exposure) * (1 - Math.exp(-dt * 1.5));
      if (renderer) renderer.toneMappingExposure = exposure * EXPOSURE_BASE;
    },
    dispose() {
      current?.dispose();
      current = null;
      scene.environment = null;
      scene.onBeforeRender = previousHook;
      SKY.ibl.value = 0;
    },
  };
}

/** Overall exposure. 1.22 was the flat value before the environment light was added. */
const EXPOSURE_BASE = 1.14;
