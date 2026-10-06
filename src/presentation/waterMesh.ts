import * as THREE from 'three';
import { SPRING_POOL, STREAMS, type StreamSpec, type V2 } from '../world/layout';
import type { Terrain } from '../world/terrain';
import { SKY } from './skyState';
import { detachWaterOptics, makeWaterOpticsUniforms, WATER_OPTICS_GLSL } from './waterOptics';

/**
 * Five scene-owned water meshes: subdivided carved-channel ribbons and a radial spring pool.
 * Original analytic waves supply surface relief and normals; shallow transmission, broken
 * advected foam and sky Fresnel reflections stay separate from the durable quest flow state.
 */
const ACROSS_SEGMENTS = 8;
const DRY_FLOW = 0.025;

const RIPPLE_GLSL = /* glsl */ `
vec2 waterDrift(vec2 direction, float seconds, float flow) {
  return normalize(direction + vec2(0.00001)) * seconds * (0.35 + flow * 0.85);
}
float rippleHeight(vec2 worldXZ, vec2 direction, float seconds, float flow, float effects) {
  vec2 q = worldXZ - waterDrift(direction, seconds, flow);
  return sin(dot(q, vec2(1.188, 1.8975))) * 0.012
    + sin(dot(worldXZ + waterDrift(direction, seconds, flow) * 0.63, vec2(-4.172, 1.904))) * 0.006 * effects;
}
vec2 rippleSlope(vec2 worldXZ, vec2 direction, float seconds, float flow, float effects) {
  vec2 q = worldXZ - waterDrift(direction, seconds, flow);
  vec2 second = worldXZ + waterDrift(direction, seconds, flow) * 0.63;
  vec2 g = cos(dot(q, vec2(1.188, 1.8975))) * vec2(1.188, 1.8975) * 0.012;
  g += cos(dot(second, vec2(-4.172, 1.904))) * vec2(-4.172, 1.904) * 0.006 * effects;
  g += cos(dot(q, vec2(6.336, -4.032)) + seconds * 0.38) * vec2(6.336, -4.032) * 0.0025 * effects;
  return g;
}`;

const VERT = /* glsl */ `
attribute float aAcross;
attribute float aAlong;
attribute vec2 aPerp;
attribute float aBed;
attribute float aFloor;
attribute float aHalf;
attribute float aLevel;
attribute float aCarve;
attribute float aConfluence;
uniform float uFlow;
uniform float uTime;
uniform float uEffects;
uniform float uIsPool;
uniform float uRadius;
uniform float uInletFlow;
uniform vec2 uHeadDirection;
varying float vBoundary;
varying float vAlong;
varying float vDepth;
varying vec2 vFlowDir;
varying vec3 vWorld;
varying float vSurfaceFlow;
#include <fog_pars_vertex>
${RIPPLE_GLSL}
void main() {
  float flow = clamp(uFlow, 0.0, 1.0);
  float surfaceFlow = mix(flow, clamp(uInletFlow, 0.0, 1.0), uIsPool);
  // Retain the established flow-width and water-level response of each managed channel.
  float width = mix(0.18, 1.0, smoothstep(0.02, 0.75, flow));
  // A spring mouth shares the wetland opening; downstream channels retain their flow width.
  width = mix(width, 1.0, aConfluence);
  vec3 p = position;
  p.xz += aPerp * aAcross * aHalf * (width - 1.0);
  float response = mix(0.25, 1.0, surfaceFlow);
  float level = aLevel * response;
  // This sloping wetland follows its existing carved floor, rather than floating a flat disk
  // over the hillside. The same local hydraulic surface is used by the spring overlap.
  float headwater = aFloor + min(0.72, aCarve * 0.44) * response;
  p.y = mix(aBed + level, headwater, aConfluence);
  // The full-width bed samples are blended inward as the wet channel contracts.
  float floor = mix(aBed, aFloor, mix(width * width, 1.0, uIsPool));
  float depth = p.y - floor;
  vec3 world = (modelMatrix * vec4(p, 1.0)).xyz;
  vFlowDir = mix(vec2(aPerp.y, -aPerp.x), uHeadDirection, uIsPool);
  vSurfaceFlow = surfaceFlow;
  float relief = rippleHeight(world.xz, vFlowDir, uTime, surfaceFlow, uEffects) * smoothstep(0.02, 0.16, depth);
  p.y += relief;
  vDepth = depth + relief;
  vBoundary = mix(abs(aAcross), length(position.xz) / max(uRadius, 0.001), uIsPool);
  vAlong = aAlong;
  vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
  vec4 mvPosition = viewMatrix * vec4(vWorld, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform float uFlow;
uniform float uTime;
uniform float uLight;
uniform float uEffects;
uniform float uIsPool;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunI;
uniform float uNight;
varying float vBoundary;
varying float vAlong;
varying float vDepth;
varying vec2 vFlowDir;
varying vec3 vWorld;
varying float vSurfaceFlow;
#include <fog_pars_fragment>
${RIPPLE_GLSL}
${WATER_OPTICS_GLSL}
void main() {
  if (uIsPool < 0.5 && uFlow < 0.025) discard;
  // Bank intersection is derived from the sampled carved floor, not a painted white outline.
  float depthPixel = fwidth(vDepth);
  float wet = waterSmooth(-0.015, 0.055, vDepth, min(depthPixel, 0.025));
  float depth = max(vDepth, 0.0);
  vec3 V = normalize(cameraPosition - vWorld);
  float distanceToEye = length(cameraPosition - vWorld);
  vec2 slopes = rippleSlope(vWorld.xz, vFlowDir, uTime, vSurfaceFlow, uEffects);
  float pixelMetres = length(dFdx(vWorld)) + length(dFdy(vWorld));
  slopes *= waterWaveCoverage(pixelMetres * 7.512);
  slopes *= 1.0 - smoothstep(32.0, 150.0, distanceToEye) * 0.85;
  vec3 N = normalize(vec3(-slopes.x * 2.4, 1.0, -slopes.y * 2.4));
  vec3 R = reflect(-V, N);
  vec3 rayDx = dFdx(R), rayDy = dFdy(R);
  float rayFootprintSquared = dot(rayDx, rayDx) + dot(rayDy, rayDy);
  float fresnel = 0.025 + 0.975 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);

  // Clear earthy teal over the shallows gives way to a deeper green body, with no opaque blue fill.
  vec3 body = mix(uShallow, uDeep, smoothstep(0.08, 0.78, depth));
  float daylight = uLight * (0.72 + 0.2 * min(uSunI, 1.7));
  body *= daylight;
  if (uIsPool < 0.5) body = mix(body, vec3(0.105, 0.108, 0.065) * uLight, (1.0 - smoothstep(0.05, 0.5, uFlow)) * 0.3);
  body = waterTransmission(body, N, vWorld, depth);

  // Restrained drifting light cells suggest a shallow bottom; no additional caustic render pass.
  if (uEffects > 0.5) {
    vec2 q = vWorld.xz - waterDrift(vFlowDir, uTime * 0.36, vSurfaceFlow);
    float crossing = sin(dot(q, vec2(3.2, 1.9)) + uTime * 0.25)
      + cos(dot(q, vec2(-2.7, 3.1)) - uTime * 0.21);
    float caustic = pow(max(0.0, 1.0 - abs(crossing) * 0.72), 8.0) * waterWaveCoverage(fwidth(crossing) * 2.828);
    body += vec3(0.035, 0.049, 0.027) * caustic * (1.0 - smoothstep(0.12, 0.65, depth)) * daylight * 0.34;
  }

  float up = clamp(R.y, 0.0, 1.0);
  vec3 reflectedSky = mix(uHorizon, uTop, pow(up, 0.45));
  float sunAlignment = max(dot(R, uSunDir), 0.0);
  reflectedSky += uSunColor * (waterHighlight(sunAlignment, 160.0, rayFootprintSquared) * 2.1
    + waterHighlight(sunAlignment, 22.0, rayFootprintSquared) * 0.09) * uSunI * (1.0 - uNight);
  vec3 col = mix(body, reflectedSky, min(fresnel, 0.86));

  // Advected, warped pockets break up foam. A bank does not get a permanent opaque white stripe.
  vec2 foamQ = vWorld.xz * 1.25 - waterDrift(vFlowDir, uTime * 0.8, vSurfaceFlow);
  float warp = sin(foamQ.y * 0.73 + sin(foamQ.x * 0.41)) * 0.7;
  float cells = sin(foamQ.x * 2.2 + warp) * sin(foamQ.y * 1.7 - warp);
  float broken = waterSmooth(0.34, 0.79, cells * 0.5 + 0.5, fwidth(cells) * 0.5);
  float bank = 1.0 - waterSmooth(0.035, 0.2, depth, depthPixel);
  float foam = bank * broken * (0.11 + uFlow * 0.17) * mix(0.5, 1.0, uEffects);
  float streakPhase = vAlong * 1.1 - uTime * (0.55 + uFlow) + sin(foamQ.x * 0.6);
  float streak = pow(max(0.0, sin(streakPhase)), 12.0) * waterWaveCoverage(fwidth(streakPhase) * 3.464);
  foam += streak * smoothstep(0.2, 0.8, uFlow) * 0.022 * uEffects;
  col = mix(col, vec3(0.44, 0.48, 0.37) * daylight, min(foam, 0.3));

  float edgeFade = 1.0 - smoothstep(0.9, 1.0, vBoundary) * 0.3;
  float alpha = mix(0.48, 0.9, smoothstep(0.05, 0.65, depth));
  // Captured transmission already contains the bottom color; avoid blending it into itself twice.
  alpha = mix(alpha, 0.96, uWaterCapture);
  // All derivative-based coverage and lighting inputs precede bank divergence.
  if (wet < 0.01) discard;
  gl_FragColor = vec4(col, alpha * wet * edgeFade);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface WaterUniforms {
  uFlow: { value: number };
  uTime: { value: number };
  uLight: { value: number };
  uEffects: { value: number };
}

export interface RibbonInfo {
  id: string;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  uniforms: WaterUniforms;
}

function uniforms(flow: number, isPool = false, radius = 1) {
  return {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    ...makeWaterOpticsUniforms(isPool ? 0.42 : 0.64),
    uFlow: { value: flow }, uTime: { value: 0 }, uLight: { value: 1 }, uEffects: { value: 1 },
    uIsPool: { value: isPool ? 1 : 0 }, uRadius: { value: radius },
    uInletFlow: { value: flow }, uHeadDirection: { value: new THREE.Vector2(0.32, 0.15) },
    uDeep: { value: new THREE.Color(0x174d43) }, uShallow: { value: new THREE.Color(0x438d78) },
    // Preserve the shared uniform objects: cloning them would stop reflecting the current sky.
    uTop: SKY.top, uHorizon: SKY.horizon, uSunDir: SKY.sunDir,
    uSunColor: SKY.sunColor, uSunI: SKY.sunI, uNight: SKY.night,
  };
}

function material(flow: number, isPool = false, radius = 1) {
  return new THREE.ShaderMaterial({
    uniforms: uniforms(flow, isPool, radius), vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
}

function resample(points: V2[], step: number, halfWidth: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!, b = points[i + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / step));
    for (let k = 0; k < n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n });
  }
  out.push(points[points.length - 1]!);
  return out.map((p, i) => {
    if (i === 0 || i === out.length - 1) return p;
    const a = out[i - 1]!, b = out[i + 1]!;
    const dx = (a.x + 2 * p.x + b.x) / 4 - p.x;
    const dz = (a.z + 2 * p.z + b.z) / 4 - p.z;
    // A narrow tributary cannot inherit a broad bend's smoothing displacement:
    // 2.5% center drift + the 95% surface half-width stays inside its authored cut.
    const blend = Math.min(1, halfWidth * 0.025 / Math.max(Math.hypot(dx, dz), 1e-8));
    return { x: p.x + dx * blend, z: p.z + dz * blend };
  });
}

function attributes(geo: THREE.BufferGeometry, values: ReturnType<typeof emptyValues>) {
  geo.setAttribute('position', new THREE.Float32BufferAttribute(values.pos, 3));
  for (const [name, data, size] of [
    ['aAcross', values.across, 1], ['aAlong', values.along, 1], ['aPerp', values.perp, 2],
    ['aBed', values.bed, 1], ['aFloor', values.floor, 1], ['aHalf', values.half, 1], ['aLevel', values.level, 1],
    ['aCarve', values.carve, 1], ['aConfluence', values.confluence, 1],
  ] as [string, number[], number][]) geo.setAttribute(name, new THREE.Float32BufferAttribute(data, size));
  geo.setIndex(values.idx);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  // Include the small shader relief without a per-frame bounding calculation.
  geo.boundingBox!.min.y = Math.min(geo.boundingBox!.min.y, ...values.bed.map((bed, i) => bed + values.level[i]! * 0.25)) - 0.04;
  geo.boundingBox!.min.y = Math.min(geo.boundingBox!.min.y, ...values.floor.map((floor, i) => floor + Math.min(0.72, values.carve[i]! * 0.44) * 0.25)) - 0.04;
  geo.boundingBox!.max.y = Math.max(geo.boundingBox!.max.y, ...values.floor.map((floor, i) => floor + Math.min(0.72, values.carve[i]! * 0.44))) + 0.04;
  geo.boundingSphere = geo.boundingBox!.getBoundingSphere(new THREE.Sphere());
}

function emptyValues() {
  return { pos: [] as number[], across: [] as number[], along: [] as number[], perp: [] as number[], bed: [] as number[], floor: [] as number[], half: [] as number[], level: [] as number[], carve: [] as number[], confluence: [] as number[], idx: [] as number[] };
}

function makeRibbon(id: string, points: V2[], halfWidth: number, depth: number, terrain: Terrain, join: { start?: V2; end?: V2 } = {}): RibbonInfo {
  const line = resample(points, 2, halfWidth);
  const values = emptyValues();
  const row = ACROSS_SEGMENTS + 1;
  let distance = 0;
  for (let i = 0; i < line.length; i++) {
    const p = line[i]!, prev = line[Math.max(0, i - 1)]!, next = line[Math.min(line.length - 1, i + 1)]!;
    const tangent = (i === 0 ? join.start : i === line.length - 1 ? join.end : undefined) ?? { x: next.x - prev.x, z: next.z - prev.z };
    const length = Math.hypot(tangent.x, tangent.z) || 1;
    const tx = tangent.x / length, tz = tangent.z / length;
    if (i > 0) distance += Math.hypot(p.x - prev.x, p.z - prev.z);
    const bed = Math.min(terrain.heightAt(p.x, p.z), terrain.heightAt(p.x - tz * 0.6, p.z + tx * 0.6), terrain.heightAt(p.x + tz * 0.6, p.z - tx * 0.6));
    // Local ford/channel depth can be much lower than the main stream's nominal 1.6 m.
    const localLevel = Math.max(0.035, Math.min(Math.max(0.16, depth * 0.44), terrain.carveAt(p.x, p.z) * 0.7));
    for (let j = 0; j <= ACROSS_SEGMENTS; j++) {
      const across = j / ACROSS_SEGMENTS * 2 - 1;
      const x = p.x - tz * across * halfWidth * 0.95;
      const z = p.z + tx * across * halfWidth * 0.95;
      const floor = terrain.heightAt(x, z), carve = terrain.carveAt(x, z);
      const basinDistance = Math.hypot(x - SPRING_POOL.x, z - SPRING_POOL.z);
      const t = Math.max(0, Math.min(1, (basinDistance - SPRING_POOL.r * 0.92) / (SPRING_POOL.r * 0.35)));
      const confluence = id === 'spring' ? 1 - t * t * (3 - 2 * t) : 0;
      values.pos.push(x, (bed + localLevel) * (1 - confluence) + (floor + Math.min(0.72, carve * 0.44)) * confluence, z);
      values.across.push(across); values.along.push(distance); values.perp.push(-tz, tx);
      values.bed.push(bed); values.floor.push(floor);
      values.half.push(halfWidth * 0.95); values.level.push(localLevel);
      values.carve.push(carve); values.confluence.push(confluence);
      if (i < line.length - 1 && j < ACROSS_SEGMENTS) {
        const a = i * row + j;
        // Across then downstream winds upward, including the bent channel's interior cells.
        values.idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  attributes(geo, values);
  const mat = material(id === 'village' ? 0.1 : 0.3);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = `water-${id}`; mesh.renderOrder = 2;
  return { id, mesh, uniforms: mat.uniforms as unknown as WaterUniforms };
}

/** Insert an exact inlet sample into the radial tessellation without a disconnected overlay. */
function insertPoolPoint(values: ReturnType<typeof emptyValues>, x: number, z: number, vertex: (x: number, z: number, fraction: number) => number, radius: number) {
  if (Math.hypot(x, z) >= radius - 1e-5) return;
  for (let i = 0; i < values.pos.length; i += 3) if (Math.hypot(values.pos[i]! - x, values.pos[i + 2]! - z) < 1e-6) return;
  const cross = (ax: number, az: number, bx: number, bz: number) => ax * bz - az * bx;
  for (let offset = 0; offset < values.idx.length; offset += 3) {
    const ids = values.idx.slice(offset, offset + 3);
    const [a, b, c] = ids.map((id) => ({ x: values.pos[id! * 3]!, z: values.pos[id! * 3 + 2]! }));
    const area = cross(b!.x - a!.x, b!.z - a!.z, c!.x - a!.x, c!.z - a!.z);
    const bary = [
      cross(b!.x - x, b!.z - z, c!.x - x, c!.z - z) / area,
      cross(c!.x - x, c!.z - z, a!.x - x, a!.z - z) / area,
      cross(a!.x - x, a!.z - z, b!.x - x, b!.z - z) / area,
    ];
    if (Math.min(...bary) < -1e-7) continue;
    const added = vertex(x, z, Math.hypot(x, z) / radius);
    const edge = bary.findIndex((weight) => Math.abs(weight) < 1e-7);
    if (edge < 0) {
      values.idx.splice(offset, 3, ids[0]!, ids[1]!, added, ids[1]!, ids[2]!, added, ids[2]!, ids[0]!, added);
    } else {
      // A point on an existing radial edge must split both adjacent faces, avoiding a T-junction.
      const first = ids[(edge + 1) % 3]!, second = ids[(edge + 2) % 3]!;
      for (let i = values.idx.length - 3; i >= 0; i -= 3) {
        const triangle = values.idx.slice(i, i + 3);
        if (!triangle.includes(first) || !triangle.includes(second)) continue;
        const start = triangle.findIndex((id, j) => (id === first && triangle[(j + 1) % 3] === second) || (id === second && triangle[(j + 1) % 3] === first));
        const a = triangle[start]!, b = triangle[(start + 1) % 3]!, c = triangle[(start + 2) % 3]!;
        values.idx.splice(i, 3, a, added, c, added, b, c);
      }
    }
    return;
  }
}

function makePool(terrain: Terrain, inlet: RibbonInfo, direction: V2) {
  const radius = SPRING_POOL.r * 0.92;
  const origin = terrain.heightAt(SPRING_POOL.x, SPRING_POOL.z);
  const values = emptyValues();
  const rings = 8, segments = 48;
  const vertex = (x: number, z: number, fraction: number) => {
    const id = values.pos.length / 3;
    const floor = terrain.heightAt(SPRING_POOL.x + x, SPRING_POOL.z + z) - origin;
    const carve = terrain.carveAt(SPRING_POOL.x + x, SPRING_POOL.z + z);
    const level = Math.min(0.72, carve * 0.44);
    values.pos.push(x, floor + level, z); values.across.push(fraction); values.along.push(z);
    values.perp.push(0, 0); values.bed.push(floor); values.half.push(0); values.level.push(level);
    values.floor.push(floor); values.carve.push(carve); values.confluence.push(1);
    return id;
  };
  vertex(0, 0, 0);
  for (let ring = 1; ring <= rings; ring++) {
    for (let j = 0; j < segments; j++) {
      const angle = j * Math.PI * 2 / segments;
      vertex(Math.cos(angle) * radius * ring / rings, Math.sin(angle) * radius * ring / rings, ring / rings);
      const current = 1 + (ring - 1) * segments + j;
      const next = 1 + (ring - 1) * segments + (j + 1) % segments;
      if (ring === 1) values.idx.push(0, next, current);
      else {
        const inner = current - segments, innerNext = next - segments;
        values.idx.push(inner, innerNext, current, current, innerNext, next);
      }
    }
  }
  const inletPosition = inlet.mesh.geometry.getAttribute('position');
  for (let column = 0; column <= ACROSS_SEGMENTS; column++) {
    insertPoolPoint(values, inletPosition.getX(column) - SPRING_POOL.x, inletPosition.getZ(column) - SPRING_POOL.z, vertex, radius);
  }
  const geo = new THREE.BufferGeometry();
  attributes(geo, values);
  const mat = material(0.6, true, radius);
  mat.uniforms.uInletFlow = inlet.uniforms.uFlow;
  mat.uniforms.uHeadDirection!.value.set(direction.x, direction.z).normalize();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'water-spring-pool'; mesh.position.set(SPRING_POOL.x, origin, SPRING_POOL.z); mesh.renderOrder = 2;
  return mesh;
}

export interface WaterSystem {
  group: THREE.Group;
  ribbons: Record<'spring' | 'main' | 'village' | 'quarry', RibbonInfo>;
  pool: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  poolUniforms: WaterUniforms;
  /** Quest flow continues easing while only the cosmetic clock freezes for reduced motion. */
  update(dt: number, time: number, targets: { spring: number; main: number; village: number; quarry: number }, light: number, reducedMotion?: boolean, reduceEffects?: boolean): void;
  /** Detach borrowed Grade attachments; meshes/materials remain owned by the scene resource graph. */
  dispose(): void;
}

export function buildWater(terrain: Terrain): WaterSystem {
  const group = new THREE.Group(); group.name = 'inland-water';
  const main = STREAMS.find((stream: StreamSpec) => stream.id === 'main')!;
  const village = STREAMS.find((stream: StreamSpec) => stream.id === 'village')!;
  const quarry = STREAMS.find((stream: StreamSpec) => stream.id === 'quarry')!;
  // Preserve the exact managed sluice split at authored main point 3, with one shared cross-section orientation.
  const splitTangent = { x: main.points[4]!.x - main.points[2]!.x, z: main.points[4]!.z - main.points[2]!.z };
  const ribbons = {
    spring: makeRibbon('spring', main.points.slice(0, 4), main.halfWidth, main.depth, terrain, { end: splitTangent }),
    main: makeRibbon('main', main.points.slice(3), main.halfWidth, main.depth, terrain, { start: splitTangent }),
    village: makeRibbon('village', village.points, village.halfWidth, village.depth, terrain),
    quarry: makeRibbon('quarry', quarry.points, quarry.halfWidth, quarry.depth, terrain),
  };
  for (const ribbon of Object.values(ribbons)) group.add(ribbon.mesh);
  const pool = makePool(terrain, ribbons.spring, { x: main.points[1]!.x - main.points[0]!.x, z: main.points[1]!.z - main.points[0]!.z }); group.add(pool);
  const poolUniforms = pool.material.uniforms as unknown as WaterUniforms;
  const current = { spring: 0.3, main: 0.3, village: 0.1, quarry: 0.3 };
  const materials = [...Object.values(ribbons).map((ribbon) => ribbon.mesh.material), pool.material];
  let cosmeticTime = 0, disposed = false;
  return {
    group, ribbons, pool, poolUniforms,
    update(dt, _worldTime, targets, light, reducedMotion = false, reduceEffects = false) {
      if (disposed) return;
      const delta = Number.isFinite(dt) ? Math.max(0, dt) : 0;
      const retain = Math.exp(-delta * 0.6);
      // Absolute world time deliberately cannot jump this phase after a pause or preference change.
      if (!reducedMotion) cosmeticTime += delta;
      for (const key of Object.keys(current) as (keyof typeof current)[]) {
        // Equivalent exponential easing, without cancellation below the exact dry threshold.
        current[key] = targets[key] + (current[key] - targets[key]) * retain;
        const ribbon = ribbons[key];
        ribbon.uniforms.uFlow.value = current[key];
        ribbon.mesh.visible = current[key] >= DRY_FLOW;
      }
      for (const mat of materials) {
        mat.uniforms.uTime!.value = cosmeticTime;
        mat.uniforms.uLight!.value = light;
        mat.uniforms.uEffects!.value = reduceEffects ? 0 : 1;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const mat of materials) detachWaterOptics(mat);
    },
  };
}
