import * as THREE from 'three';

/**
 * The menu's dusk sky and the sea below it, drawn by one dome shader.
 *
 * The look is taken from the colour relationships measured on Gothic 3's own title backdrop (docs/art/gothic3-reference.md):
 * a near-black teal zenith, dull teal cloud masses, and one burning amber band at the horizon. The sea is not geometry: for
 * directions below the horizon the shader intersects a flat plane 40 m under the camp and shades waves, the sun's glitter
 * path and the reflected clouds there, so the horizon is exact at any distance and costs nothing extra to draw.
 *
 * `MENU_SKY_GLSL` is shared with the puddles and the far silhouettes, which need the same colours for reflections and haze.
 */

/** Where the low sun sits: left of the view axis, a hand's width above the sea. Unit vector, world space. */
export const MENU_SUN_DIR = new THREE.Vector3(-0.44, 0.045, -1).normalize();
/** Height of the sea surface in menu world units (metres). The camp stands on a headland above it. */
export const MENU_SEA_LEVEL = -40;

const lin = (hex: number) => new THREE.Color().setHex(hex);

/** Uniforms shared by every menu shader that needs the sky: one set of objects, so a later tweak reaches all of them. */
export const menuSkyUniforms = {
  uSunDir: { value: MENU_SUN_DIR.clone() },
  uZenith: { value: lin(0x081013) },
  uUpper: { value: lin(0x1a2b30) },
  uHorizonCool: { value: lin(0x3b3631) },
  uHorizonWarm: { value: lin(0xb4661f) },
  uSunCore: { value: lin(0xffc27a) },
  uCloudDark: { value: lin(0x0e1416) },
  uCloudLit: { value: lin(0x8c4816) },
  uSeaDeep: { value: lin(0x060d0f) },
  uSkyTime: { value: 0 },
  uNoise: { value: null as THREE.Texture | null },
};

/**
 * GLSL helpers (no uniforms declared here; the including shader declares `menuSkyUniforms`):
 *  - `menuHorizon(dir)`  cloudless dusk gradient with the sun's glow,
 *  - `menuSkyFar(dir)`   the same with the cloud cover folded in as a cheap average (for reflections and haze).
 */
export const MENU_SKY_GLSL = /* glsl */ `
// Clamped: in the anti-sun direction rounding can put this a hair below zero, and pow() of a negative base is NaN
// (which the image-based light capture then spreads over every lit surface).
float msAz(vec3 d) {
  vec2 a = d.xz / max(length(d.xz), 1e-5);
  vec2 b = normalize(uSunDir.xz);
  return clamp(dot(a, b) * 0.5 + 0.5, 0.0, 1.0);
}
vec3 menuHorizon(vec3 d) {
  float y = d.y;
  float h = clamp(y, 0.0, 1.0);
  float az = msAz(d);
  float sd = max(dot(d, uSunDir), 0.0);
  vec3 hor = mix(uHorizonCool, uHorizonWarm, pow(az, 6.0));
  vec3 col = mix(hor, uUpper, smoothstep(0.0, 0.22, h));
  col = mix(col, uZenith, smoothstep(0.22, 0.85, h));
  // A thin hot band hugs the horizon on the sun's side; the glow round the sun is wide and dull, the core small.
  col += uHorizonWarm * pow(az, 10.0) * exp(-abs(y) * 38.0) * 0.9;
  col += uHorizonWarm * pow(sd, 7.0) * 0.32 + uSunCore * pow(sd, 140.0) * 2.2;
  return col;
}
vec3 menuSkyFar(vec3 d) {
  vec3 c = menuHorizon(d);
  float h = clamp(d.y, 0.0, 1.0);
  float az = msAz(d);
  vec3 cloud = mix(uCloudDark, uCloudLit, pow(az, 6.0) * (1.0 - h) * 0.7);
  return mix(c, cloud, 0.42 * smoothstep(0.02, 0.2, h));
}
`;

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uUpper;
uniform vec3 uHorizonCool;
uniform vec3 uHorizonWarm;
uniform vec3 uSunCore;
uniform vec3 uCloudDark;
uniform vec3 uCloudLit;
uniform vec3 uSeaDeep;
uniform float uSkyTime;
uniform sampler2D uNoise;
uniform float uSeaDrop;
varying vec3 vDir;
${MENU_SKY_GLSL}

float cloudField(vec2 p) {
  vec2 w = (texture2D(uNoise, p * 0.19 + 0.13).gb - 0.5) * 0.9;
  float n = texture2D(uNoise, p * 0.47 + w).r * 0.5
          + texture2D(uNoise, p * 1.07 + w * 1.6 + 0.37).r * 0.26
          + texture2D(uNoise, p * 2.71 + w * 2.2 + 0.71).a * 0.13
          // Fine tatters on the edges, so banks read as torn cloud rather than smooth smoke.
          + texture2D(uNoise, p * 6.3 + w * 3.1 + 0.19).r * 0.07
          + texture2D(uNoise, p * 13.1 + 0.53).a * 0.04;
  return n;
}

// Brush-like streaks: noise stretched along the horizon, so cloud edges read as painted strokes rather than soft puffs.
float strokes(vec2 p) {
  return texture2D(uNoise, vec2(p.x * 0.35, p.y * 3.1) + 0.21).a;
}

vec3 cloudy(vec3 d, float drift) {
  vec3 col = menuHorizon(d);
  float y = d.y;
  if (y <= 0.0) return col;
  float h = clamp(y, 0.0, 1.0);
  float az = msAz(d);
  vec2 p = d.xz / (y + 0.085) * 0.09 + vec2(drift * 0.0021, drift * 0.0007);
  float c = cloudField(p);
  float st = strokes(p * 1.7);
  c += (st - 0.5) * 0.12;
  // Heavy banks low down, broken cloud higher up, a clear lane of glow right at the horizon.
  float cover = mix(0.38, 0.47, smoothstep(0.02, 0.5, h));
  float dens = smoothstep(cover, cover + 0.15, c) * smoothstep(0.012, 0.07, y);
  // Light from the low sun catches the edges of each bank that face it (a one-tap directional derivative).
  vec2 toSun = normalize(uSunDir.xz) * 0.035;
  float cs = cloudField(p + toSun);
  float lit = clamp((c - cs) * 7.5 + 0.35, 0.0, 1.0);
  float warm = pow(az, 5.0) * (1.0 - smoothstep(0.03, 0.42, h));
  vec3 under = mix(uCloudDark, uCloudDark * 1.6 + uHorizonCool * 0.18, smoothstep(0.3, 0.0, h));
  vec3 rimCool = uUpper * 1.25;
  vec3 cc = mix(under, mix(rimCool, uCloudLit * (0.5 + 1.6 * warm), warm), lit * (0.3 + 0.7 * warm));
  // Silver lining right next to the sun.
  cc += uSunCore * pow(max(dot(d, uSunDir), 0.0), 28.0) * lit * 1.1;
  return mix(col, cc, dens * 0.96);
}

void main() {
  vec3 d = normalize(vDir);
  vec3 col;
  if (d.y >= 0.0) {
    col = cloudy(d, uSkyTime);
  } else {
    // The sea: a plane uSeaDrop metres below the eye, reached along this view ray.
    float t = uSeaDrop / max(-d.y, 1e-4);
    vec2 sp = d.xz * t;
    float dist = t;
    // Wave normal from the gradient channels of the shared noise, two scales, drifting; flattened with distance.
    vec2 g1 = texture2D(uNoise, sp * 0.021 + vec2(uSkyTime * 0.004, uSkyTime * 0.0017)).gb - 0.5;
    vec2 g2 = texture2D(uNoise, sp * 0.067 - vec2(uSkyTime * 0.006, -uSkyTime * 0.003)).gb - 0.5;
    float flat_ = 1.0 / (1.0 + dist * 0.0022);
    vec3 n = normalize(vec3((g1.x + g2.x * 0.6) * 1.6 * flat_, 1.0, (g1.y + g2.y * 0.6) * 1.6 * flat_));
    vec3 r = reflect(d, n);
    r.y = abs(r.y);
    float fres = 0.02 + 0.98 * pow(1.0 - clamp(dot(-d, n), 0.0, 1.0), 5.0);
    vec3 refl = cloudy(r, uSkyTime * 0.6);
    col = mix(uSeaDeep, refl, fres);
    // The glitter path: sharp highlights of the sun on wave facets.
    float spec = pow(max(dot(r, uSunDir), 0.0), 340.0);
    col += uSunCore * spec * 6.0;
    // Far water melts into the horizon haze.
    col = mix(col, menuHorizon(vec3(d.x, 0.0, d.z)), smoothstep(0.0, 1.0, 1.0 - exp(-dist * 0.00022)));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

/** A camera-centred dome; `update` keeps it on the camera and advances the cloud drift (frozen in reduced motion). */
export function createMenuSky(noise: THREE.Texture, camera: THREE.Camera) {
  menuSkyUniforms.uNoise.value = noise;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...menuSkyUniforms, uSeaDrop: { value: 0 } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), material);
  mesh.name = 'Menu_Dusk_Sky_And_Sea';
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  const syncToCamera = () => {
    mesh.position.copy(camera.position);
    material.uniforms.uSeaDrop!.value = camera.position.y - MENU_SEA_LEVEL;
  };
  syncToCamera();
  return {
    mesh,
    material,
    update(time: number) {
      syncToCamera();
      menuSkyUniforms.uSkyTime.value = time;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
