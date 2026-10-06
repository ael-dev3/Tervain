import * as THREE from 'three';
import { SEA_LEVEL } from '../../world/layout';
import { BATHY, BATHY_NX, BATHY_NZ, rockinessAt, type Bathymetry } from '../../world/water/bathymetry';
import { SKY } from '../skyState';
import { detachWaterOptics, makeWaterOpticsUniforms, WATER_DETAIL_GLSL, WATER_F0, WATER_OPTICS_GLSL, WATER_RIPPLE_GLSL, WATER_SKY_GLSL } from '../waterOptics';
import { BATHY_GLSL, WAVE_GLSL } from './waveGlsl';
import type { WaterTextures } from './waterTextures';
import { SWELL_DIR, SWELL_K0 } from '../../world/water/waves';

/**
 * The sea. One grid of vertices is laid across the screen each frame, from the bottom of the view out to the horizon,
 * and dropped onto the water plane: near the camera the samples are centimetres apart, out at the horizon tens of
 * metres, wherever along the coast the camera goes. Each sample reads the sea bed and the solved swell beneath it.
 *
 * Seen from close: swell bending to meet the shore, steepening as it shoals, breaking in lines of foam and running up
 * the sand as a thin sheet before draining back; wind waves and ripples over it; sunlight glowing through crests; the
 * coast reflected in the planar capture and the sky's clouds in the captured sky; the bed refracted and absorbed over
 * the real path, with caustics on it. Dry land and inland hollows below sea level are never water.
 */

export interface OceanQuality {
  /** Grid columns and rows across the screen. */
  columns: number;
  rows: number;
}

const QUALITY: Record<'low' | 'medium' | 'high', OceanQuality> = {
  low: { columns: 96, rows: 96 },
  medium: { columns: 160, rows: 150 },
  high: { columns: 224, rows: 210 },
};

/** How far out the grid's horizon row lies (m); fog has long hidden the sea by then. */
const FAR = 6000;

/** Float textures of the sea bed and the swell's local wave vector, from the world's solved bathymetry. */
export function makeBathymetryTextures(b: Bathymetry): { bed: THREE.DataTexture; wave: THREE.DataTexture } {
  const w = BATHY_NX + 1, h = BATHY_NZ + 1, n = w * h;
  const bed = new Float32Array(n * 4), wave = new Float32Array(n * 4);
  // Fill unsolved phases from their neighbours so bilinear reads near land never meet NaN.
  const phase = Float32Array.from(b.phase), shore = Float32Array.from(b.shorePhase);
  for (const field of [phase, shore]) {
    const queue: number[] = [];
    for (let id = 0; id < n; id++) if (Number.isFinite(field[id]!)) queue.push(id);
    const seen = new Uint8Array(n);
    for (const id of queue) seen[id] = 1;
    for (let q = 0; q < queue.length; q++) {
      const id = queue[q]!, i = id % w, j = (id - i) / w;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
        const nid = nj * w + ni;
        if (seen[nid]) continue;
        seen[nid] = 1; field[nid] = field[id]!; queue.push(nid);
      }
    }
    for (let id = 0; id < n; id++) if (!Number.isFinite(field[id]!)) field[id] = 0;
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const id = j * w + i;
    bed[id * 4] = b.bed[id]!;
    bed[id * 4 + 1] = phase[id]!;
    bed[id * 4 + 2] = Number.isFinite(b.shorePhase[id]!) ? b.shorePhase[id]! : phase[id]!;
    bed[id * 4 + 3] = b.height[id]!;
    // The local wave vector: the solved phase's gradient (refraction turns it toward the shore).
    const at = (ii: number, jj: number) => phase[Math.min(h - 1, Math.max(0, jj)) * w + Math.min(w - 1, Math.max(0, ii))]!;
    let kx = (at(i + 1, j) - at(i - 1, j)) / (2 * BATHY.cell), kz = (at(i, j + 1) - at(i, j - 1)) / (2 * BATHY.cell);
    if (!Number.isFinite(kx) || !Number.isFinite(kz) || Math.hypot(kx, kz) < 1e-5 || !Number.isFinite(b.phase[id]!)) { kx = SWELL_DIR.x * SWELL_K0; kz = SWELL_DIR.z * SWELL_K0; }
    wave[id * 4] = kx;
    wave[id * 4 + 1] = kz;
    wave[id * 4 + 2] = b.shelter[id]!;
    wave[id * 4 + 3] = rockinessAt(b, i, j);
  }
  const make = (data: Float32Array, name: string) => {
    const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
    tex.name = name;
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    return tex;
  };
  return { bed: make(bed, 'tervain-sea-bed'), wave: make(wave, 'tervain-sea-swell') };
}

/** World boxes covering every sea sample (and the open ocean beyond), for the water pass's visibility test. */
export function oceanVisibilityBounds(b: Bathymetry, maxRise: number): THREE.Box3[] {
  const w = BATHY_NX + 1, h = BATHY_NZ + 1, tile = 16;
  const boxes: THREE.Box3[] = [];
  for (let tj = 0; tj < h; tj += tile) for (let ti = 0; ti < w; ti += tile) {
    let any = false;
    for (let j = tj; j < Math.min(h, tj + tile + 1) && !any; j++) for (let i = ti; i < Math.min(w, ti + tile + 1); i++) {
      if (b.height[j * w + i]! >= 0) { any = true; break; }
    }
    if (!any) continue;
    boxes.push(new THREE.Box3(
      new THREE.Vector3(BATHY.minX + ti * BATHY.cell - 2, SEA_LEVEL - 1.2, BATHY.minZ + tj * BATHY.cell - 2),
      new THREE.Vector3(BATHY.minX + Math.min(w - 1, ti + tile) * BATHY.cell + 2, SEA_LEVEL + maxRise, BATHY.minZ + Math.min(h - 1, tj + tile) * BATHY.cell + 2),
    ));
  }
  // Open ocean: west of the sampled bed, and north and south of it out to the horizon, only as far east as the sea
  // reaches along the grid's own edge (the coast runs on from there), so no vast box reaches in behind a coastal view.
  // Tiles grow with distance from the realm, staying small against their distance: a frustum test cannot be fooled by
  // a box so vast that every plane has a corner inside it.
  const y0 = SEA_LEVEL - 1.2, y1 = SEA_LEVEL + maxRise, edge = FAR + 4000;
  const tiles = (x0: number, x1: number, z0: number, z1: number) => {
    const span = (a: number, b: number) => {
      const cuts = [a];
      for (let v = a; v < b;) { v = Math.min(b, v + Math.max(250, Math.abs(v) * 0.35)); cuts.push(v); }
      return cuts;
    };
    // Cut from the realm outward on each side of zero, so the nearest tiles are the smallest.
    const axis = (a: number, b: number) => {
      if (a >= 0) return span(a, b);
      if (b <= 0) return span(-b, -a).map((v) => -v).reverse();
      return [...span(0, -a).map((v) => -v).reverse().slice(0, -1), ...span(0, b)];
    };
    const xs = axis(x0, x1), zs = axis(z0, z1);
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      boxes.push(new THREE.Box3(new THREE.Vector3(xs[i]!, y0, zs[j]!), new THREE.Vector3(xs[i + 1]!, y1, zs[j + 1]!)));
    }
  };
  tiles(-edge, BATHY.minX, -edge, edge);
  for (const [row, z0, z1] of [[0, -edge, BATHY.minZ], [h - 1, BATHY.maxZ, edge]] as const) {
    let east = -1;
    for (let i = 0; i < w; i++) if (b.height[row * w + i]! >= 0) east = i;
    if (east >= 0) tiles(BATHY.minX, BATHY.minX + (east + 1) * BATHY.cell + 2, z0, z1);
  }
  return boxes;
}

const VERT = /* glsl */ `
attribute vec2 aGrid;
uniform mat4 uGridInverse;
uniform vec3 uGridCamera;
uniform float uGridPlaneY;
uniform vec4 uGridRange;   // ndc y bottom, ndc y top, ndc x half-extent, grid columns
uniform float uGridFar;
uniform float uTime;
varying vec3 vWorld;
varying vec2 vSlope;
varying float vSqueeze;
varying float vSpacing;
#include <fog_pars_vertex>
${WAVE_GLSL}
${BATHY_GLSL}
vec3 gridPoint(vec2 g) {
  vec2 ndc = vec2(mix(-uGridRange.z, uGridRange.z, g.x), mix(uGridRange.x, uGridRange.y, g.y));
  vec4 a = uGridInverse * vec4(ndc, -1.0, 1.0);
  vec4 b = uGridInverse * vec4(ndc, 1.0, 1.0);
  vec3 near = a.xyz / a.w, far = b.xyz / b.w;
  vec3 dir = normalize(far - near);
  float t = (uGridPlaneY - uGridCamera.y) / (abs(dir.y) > 1e-5 ? dir.y : -1e-5);
  if (!(t > 0.0) || t > uGridFar) {
    vec2 h = normalize(dir.xz + vec2(1e-5, 0.0));
    return vec3(uGridCamera.x + h.x * uGridFar, uGridPlaneY, uGridCamera.z + h.y * uGridFar);
  }
  return vec3(uGridCamera.x + dir.x * t, uGridPlaneY, uGridCamera.z + dir.z * t);
}
void main() {
  vec3 p = gridPoint(aGrid);
  vec3 px = gridPoint(aGrid + vec2(1.0 / uGridRange.w, 0.0));
  float spacing = max(length(px.xz - p.xz), 0.02);
  vec4 bed, wave;
  bathySample(p.xz, bed, wave);
  float depth = SEA_LEVEL - bed.x;
  float height = depth > 0.0 ? max(bed.w, 0.0) : 0.0;
  vec2 dir = normalize(wave.xy + vec2(1e-6, 0.0));
  float steep = breakingOf(height, depth);
  vec2 slope;
  float squeeze;
  vec3 o = seaOffset(p.xz, uTime, bed.y, height, steep, dir, depth, spacing, slope, squeeze);
  vec3 world = vec3(p.x + o.x, SEA_LEVEL + o.y, p.z + o.z);
  // Swash: broken water runs up the beach as a thin sheet and drains back before the next wave.
  if (depth < 0.2 && bed.w > 0.0) {
    float rise = swashRise(bed.z + crestWobble(p.xz), bed.w, uTime);
    if (bed.x < SEA_LEVEL + rise) world.y = max(world.y, min(SEA_LEVEL + rise, bed.x + 0.06));
  }
  vWorld = world;
  vSlope = slope;
  vSqueeze = squeeze;
  vSpacing = spacing;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uDetail;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunI;
uniform float uNight;
uniform vec3 uAmbient;
uniform vec3 uDeep;
uniform vec3 uShallow;
varying vec3 vWorld;
varying vec2 vSlope;
varying float vSqueeze;
varying float vSpacing;
#include <fog_pars_fragment>
${WAVE_GLSL}
${BATHY_GLSL}
${WATER_OPTICS_GLSL}
${WATER_SKY_GLSL}
${WATER_DETAIL_GLSL}
${WATER_RIPPLE_GLSL}
void main() {
  vec4 bed, wave;
  bathySample(vWorld.xz, bed, wave);
  // Inland hollows below sea level, and land above the swash, are never the sea.
  float sea = smoothstep(-0.6, -0.2, bed.w);
  float stillDepth = SEA_LEVEL - bed.x;
  float local = vWorld.y - bed.x;
  // Footprints first: no texture gradient may be taken after the discard below.
  float footprint = length(fwidth(vWorld.xz));
  vec3 V = normalize(cameraPosition - vWorld);
  float distanceToEye = length(cameraPosition - vWorld);
  vec2 windFlow = vec2(0.24, 0.08);
  vec2 detail = waterFlowSlope(vWorld.xz, windFlow, uTime, 0.085, footprint) * 0.10
    + waterFlowSlope(vWorld.xz, windFlow * 1.6, uTime * 1.3, 0.29, footprint) * 0.055 * uDetail;
  vec4 foamTex = waterFlowFoam(vWorld.xz, normalize(wave.xy + vec2(1e-6, 0.0)) * 0.12, uTime, 0.16);
  vec3 projected = waterReflectionProjection(vec3(0.0), vWorld, SEA_LEVEL);
  vec2 projectedDx = dFdx(projected.xy), projectedDy = dFdy(projected.xy);
  if (sea < 0.02) discard;

  vec4 ripple = waterRipple(vWorld.xz);
  // Distant waves the pixel cannot resolve become roughness, not shimmer.
  float shrink = 1.0 - smoothstep(60.0, 900.0, distanceToEye) * 0.6;
  vec2 slope = vSlope * shrink + detail * (0.55 + 0.45 * smoothstep(0.4, 4.0, stillDepth)) + ripple.xy;
  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
  float roughness = clamp(0.045 + footprint * 0.018 + smoothstep(40.0, 1200.0, distanceToEye) * 0.12, 0.04, 0.42);

  float day = 1.0 - uNight;
  if (cameraPosition.y < vWorld.y) {
    // From below: the sky comes through Snell's window, a bright disc overhead; outside it the surface mirrors the
    // water itself (total internal reflection), dim and green.
    vec3 Nd = -N;
    float cosI = clamp(dot(Nd, V), 0.0, 1.0);
    vec3 below = uDeep * (uAmbient * 0.9 + uSunColor * 0.5 * min(uSunI, 2.5) * day) * 2.2;
    // The mirror shimmers with every facet overhead.
    below *= 0.7 + 0.6 * clamp(0.5 + dot(Nd.xz, vec2(0.7, 0.5)) * 4.0, 0.0, 1.0);
    vec3 T = refract(-V, Nd, 1.33);
    vec3 seen = below;
    if (dot(T, T) > 0.0) {
      float Ft = ${WATER_F0.toFixed(3)} + ${(1 - WATER_F0).toFixed(3)} * pow(1.0 - cosI, 5.0);
      seen = mix(waterSky(T, roughness, uTop, uHorizon), below, clamp(Ft * 1.6, 0.0, 1.0));
    }
    gl_FragColor = vec4(seen, sea);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    return;
  }
  vec3 L = normalize(uSunDir);
  float NdotV = max(dot(N, V), 0.0);
  float fresnel = ${WATER_F0.toFixed(3)} + ${(1 - WATER_F0).toFixed(3)} * pow(1.0 - NdotV, 5.0);
  fresnel *= 1.0 - roughness * 0.45;
  vec3 R = reflect(-V, N);
  if (R.y < 0.0) R = normalize(vec3(R.x, -R.y * 0.25, R.z));
  // A wave facet seen at a grazing angle reflects sky well above the horizon; the hazy horizon band itself is rarely
  // what a rough sea mirrors. Lift low reflected rays a little and keep the coast's own restrained, silvered tone.
  R = normalize(vec3(R.x, R.y + 0.06 * roughness + 0.02, R.z));
  vec3 sky = waterSky(R, roughness, uTop, uHorizon);
  vec3 reflectionUV = vec3(projected.xy + N.xz * 0.08, projected.z);
  vec3 reflected = waterReflection(sky, reflectionUV, projectedDx, projectedDy, roughness + length(vSlope) * 0.35) * 0.78;

  // The water's own light: scattered daylight, deeper and bluer offshore, greener over sand.
  float sunUp = clamp(L.y * 3.0, 0.0, 1.0);
  vec3 light = uAmbient * 0.55 + uSunColor * (0.2 + 0.25 * sunUp) * min(uSunI, 2.5) * day;
  vec3 scatter = mix(uShallow, uDeep, smoothstep(0.6, 9.0, stillDepth)) * light;
  // Sunlight through the back of a crest: the glow of thin water lit from behind.
  float crest = max(vWorld.y - SEA_LEVEL, 0.0);
  float behind = pow(max(dot(V, -L), 0.0), 4.0) * smoothstep(0.0, 0.35, crest) * day * min(uSunI, 2.0);
  scatter += uShallow * uSunColor * behind * 2.4;
  float path;
  vec3 transmitted = waterTransmission(scatter, N, vWorld, max(local, 0.0), uTime, day * min(uSunI, 2.0) * uDetail, path);

  vec3 color = mix(transmitted, reflected, clamp(fresnel, 0.0, 1.0));
  color += uSunColor * waterSun(N, V, L, roughness) * uSunI * day * 0.9;

  // Foam: breaking crests and the white water they leave, the swash's edge, whitecaps, rocks, wakes.
  float height = max(bed.w, 0.0);
  // Only a wave that is actually breaking makes surf: H at the limit for its depth (the beach's swash always counts).
  // The break point wanders along the shore with a broad, slow variation, so no crest breaks along a ruled line.
  float wander = texture(tWaterFoam, vWorld.xz * 0.0045 + vec2(0.37, 0.11)).a;
  float ratio = stillDepth > 0.0 ? height / (SWELL_BREAKER * stillDepth) : 1.2;
  float broken = smoothstep(0.82 - 0.18 * wander, 1.0, ratio);
  float theta = bed.y + crestWobble(vWorld.xz) - SWELL_OMEGA * uTime;
  float since = 1.0 - fract(theta / 6.2831853); // 0 as a crest arrives, rising after it passes
  // A broken crest is a churning bore a metre or two wide; behind it a fading carpet of foam drifts seaward.
  float bore = exp(-since * 9.0) * (0.42 + 0.33 * wander);
  float carpet = exp(-since * 2.2) * 0.14;
  float breaker = broken * (bore + carpet);
  float surfZone = broken * 0.05;
  float swash = 0.0;
  if (stillDepth < 0.25) {
    // The swash sheet is clear water full of bubbles; only its leading edge is a rim of foam.
    float sheet = 1.0 - smoothstep(0.0, 0.05, local);
    float rim = 1.0 - smoothstep(0.0, 0.009, local);
    swash = sheet * (0.04 + 0.1 * foamTex.g) + rim * 0.38;
  }
  float whitecap = smoothstep(0.72, 0.98, vSqueeze) * smoothstep(3.0, 9.0, stillDepth) * 0.35;
  // Waves burst white against rock and drain off it.
  float rock = wave.w * smoothstep(4.0, 0.3, stillDepth) * (0.16 + 0.7 * exp(-since * 4.0));
  float pixelMetres = footprint;
  float contact = waterContactEdge(vWorld, pixelMetres, max(local, 0.0)) * 0.8;
  float amount = clamp(breaker + surfZone + swash + whitecap + rock + contact + ripple.w, 0.0, 1.0);
  float cover = waterFoamCover(foamTex, amount, footprint) * (1.0 - smoothstep(250.0, 900.0, distanceToEye) * 0.5);
  vec3 foamLight = uAmbient * 0.6 + uSunColor * (0.25 + 0.5 * max(dot(N, L), 0.0)) * min(uSunI, 2.0) * day * 0.5;
  vec3 foamColor = vec3(0.86, 0.9, 0.88) * foamLight;
  color = mix(color, foamColor, cover * 0.88);

  float alpha = uWaterCapture > 0.5 ? 1.0 : mix(0.3, 0.96, smoothstep(0.02, 2.4, max(local, 0.0)));
  alpha = max(alpha, cover);
  // The swash's leading edge thins to nothing instead of ending in a hard line.
  alpha *= sea * smoothstep(0.0, 0.012, local + 0.002);
  gl_FragColor = vec4(color, alpha);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface OceanHandle {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  /** Lay the grid for this camera and set the clock. */
  update(camera: THREE.PerspectiveCamera, time: number, detail: number, surface?: number): void;
  dispose(): void;
}

/** A plain grid of (u, v) samples; positions are found on the GPU each frame. */
function gridGeometry(q: OceanQuality): THREE.BufferGeometry {
  const grid = new Float32Array((q.columns + 1) * (q.rows + 1) * 2);
  let k = 0;
  for (let j = 0; j <= q.rows; j++) {
    // Rows crowd toward the horizon, where each one spans the most water.
    const v = 1 - Math.pow(1 - j / q.rows, 1.6);
    for (let i = 0; i <= q.columns; i++) { grid[k++] = i / q.columns; grid[k++] = v; }
  }
  const index: number[] = [];
  const row = q.columns + 1;
  for (let j = 0; j < q.rows; j++) for (let i = 0; i < q.columns; i++) {
    const a = j * row + i;
    index.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('aGrid', new THREE.Float32BufferAttribute(grid, 2));
  // Three needs a position attribute; the vertex shader replaces it.
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((q.columns + 1) * (q.rows + 1) * 3), 3));
  geo.setIndex(index);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), FAR * 2);
  return geo;
}

export function buildOcean(bathymetry: Bathymetry, textures: { bed: THREE.DataTexture; wave: THREE.DataTexture }, water: WaterTextures,
  quality: 'low' | 'medium' | 'high', maxRise: number): OceanHandle {
  const q = QUALITY[quality];
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...makeWaterOpticsUniforms(0.92),
      uGridInverse: { value: new THREE.Matrix4() }, uGridCamera: { value: new THREE.Vector3() },
      uGridPlaneY: { value: SEA_LEVEL },
      uGridRange: { value: new THREE.Vector4(-1.2, 1, 1.2, q.columns) }, uGridFar: { value: FAR },
      uTime: { value: 0 }, uDetail: { value: quality === 'low' ? 0 : 1 },
      tBathy: { value: textures.bed }, tBathyWave: { value: textures.wave },
      tWaterRipples: { value: water.ripples }, tWaterFoam: { value: water.foam }, tWaterCaustics: { value: water.caustics },
      uWaterCausticStrength: { value: quality === 'low' ? 0 : 1 },
      tSkyCube: { value: null as THREE.CubeTexture | null }, uSkyCubeReady: { value: 0 },
      tRipple: { value: null as THREE.Texture | null }, uRipple: { value: new THREE.Vector3(0, 0, 1) }, uRippleReady: { value: 0 },
      uDeep: { value: new THREE.Color(0.006, 0.03, 0.05) }, uShallow: { value: new THREE.Color(0.03, 0.12, 0.11) },
      // Live sky uniform objects, shared by reference with the sky and every other consumer.
      uTop: SKY.top, uHorizon: SKY.horizon, uSunDir: SKY.sunDir, uSunColor: SKY.sunColor, uSunI: SKY.sunI, uNight: SKY.night,
      uAmbient: SKY.ambient,
    },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(gridGeometry(q), material);
  mesh.name = 'sea';
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.userData.waterVisibilityBounds = oceanVisibilityBounds(bathymetry, maxRise);
  const viewProjection = new THREE.Matrix4();
  const forward = new THREE.Vector3(), horizon = new THREE.Vector3(), cameraPosition = new THREE.Vector3();
  return {
    mesh,
    update(camera, time, detail, surface = SEA_LEVEL) {
      const u = material.uniforms;
      u.uTime!.value = time;
      u.uDetail!.value = detail;
      camera.updateMatrixWorld();
      camera.getWorldPosition(cameraPosition);
      // The lens clears the actual wave, so it can stand above a trough yet below mean sea level (or under a crest
      // while above the mean). Project against that same local surface to retain the correct foreground half of view.
      const planeY = Number.isFinite(surface) ? surface : SEA_LEVEL;
      u.uGridPlaneY!.value = planeY;
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      u.uGridInverse!.value.copy(viewProjection).invert();
      u.uGridCamera!.value.copy(cameraPosition);
      // The horizon's height on screen: rows stop just above it (the plane never shows past its vanishing line).
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() < 1e-8) forward.set(0, 0, -1);
      forward.normalize();
      horizon.copy(cameraPosition).addScaledVector(forward, FAR);
      horizon.y = planeY;
      horizon.project(camera);
      const above = cameraPosition.y >= planeY;
      const top = Number.isFinite(horizon.y) ? Math.min(1.05, horizon.y + 0.02) : 1.05;
      u.uGridRange!.value.set(above ? -1.25 : Math.max(-1.25, horizon.y - 0.02), above ? top : 1.25, 1.25, q.columns);
    },
    dispose() {
      detachWaterOptics(material);
    },
  };
}
