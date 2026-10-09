import * as THREE from 'three';
import type { Terrain } from '../../world/terrain';
import type { Channel } from '../../world/water/channels';
import { SPRING_BASIN } from '../../world/water/spring';
import { FILM, POOL_REACH, SPREAD_BELOW_BED, type WaterWorld } from '../../world/water/waterWorld';
import { SKY } from '../skyState';
import { detachWaterOptics, makeWaterOpticsUniforms, WATER_DETAIL_GLSL, WATER_F0, WATER_OPTICS_GLSL, WATER_RIPPLE_GLSL, WATER_SKY_GLSL } from '../waterOptics';
import type { WaterTextures } from './waterTextures';

/**
 * The valley's inland water: the main stream from the spring to its pond, the mill and quarry races, the spring's short
 * fall and its pool. Each channel is a ribbon across its whole cut, one row per metre of the solved course, every row
 * level across at the solved surface; the banks decide where the water meets the ground. When the quest changes a
 * flow the rows are re-solved and the surfaces rise or fall, narrow or widen.
 *
 * Calm pools lie glassy and reflect the banks and trees by a screen-space march; riffles and the fall run white and
 * broken, their foam carried downstream by the water's own speed; the shallows show the bed, with caustics on it.
 */

const ACROSS = 12;
/** Ribbons reach past the nominal half width up the banks; the ground hides what is not under water. */
const REACH = 1.55;

const VERT = /* glsl */ `
attribute float aBed;
attribute vec2 aFlow;
attribute float aRough;
attribute float aWet;
attribute float aAcross;
attribute float aHug;
uniform float uTime;
varying float vHug;
varying vec3 vWorld;
varying float vBed;
varying vec2 vFlow;
varying float vRough;
varying float vWet;
varying float vAcross;
#include <fog_pars_vertex>
void main() {
  vec3 p = position;
  // Standing waves over the stones of a riffle: the surface itself is broken, not only its colour.
  float chop = aRough * aWet * 0.045;
  p.y += chop * sin(p.x * 3.1 + uTime * 0.7) * sin(p.z * 2.7 - uTime * 0.9);
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vBed = aBed;
  vFlow = aFlow;
  vRough = aRough;
  vWet = aWet;
  vAcross = aAcross;
  vHug = aHug;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uDetail;
uniform float uWaterSSR;
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
varying float vBed;
varying vec2 vFlow;
varying float vRough;
varying float vWet;
varying float vAcross;
varying float vHug;
#include <fog_pars_fragment>
${WATER_OPTICS_GLSL}
${WATER_SKY_GLSL}
${WATER_DETAIL_GLSL}
${WATER_RIPPLE_GLSL}
void main() {
  float local = vWorld.y - vBed;
  float footprint = length(fwidth(vWorld.xz));
  float speed = length(vFlow);
  vec2 slope = waterFlowSlope(vWorld.xz, vFlow, uTime, 0.42, footprint) * (0.05 + 0.32 * vRough + 0.05 * min(speed, 2.0))
    + waterFlowSlope(vWorld.xz, vFlow * 1.3, uTime * 1.2, 1.15, footprint) * (0.03 + 0.18 * vRough) * uDetail;
  vec4 foamTex = waterFlowFoam(vWorld.xz, vFlow, uTime, 0.55);
  // Where the surface itself tips over (a fall, a race's drop) the water runs as a torn sheet streaked along its fall.
  vec3 face = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float fall = smoothstep(0.3, 0.75, 1.0 - abs(face.y));
  vec2 along = normalize(vFlow + vec2(1e-5, 0.0));
  vec2 streakUV = vec2(dot(vWorld.xz, along) * 0.22 - uTime * (0.25 + 0.3 * speed), dot(vWorld.xz, vec2(-along.y, along.x)) * 0.9);
  float streak = texture(tWaterFoam, streakUV).g;
  if (vWet < 0.5 || local < -0.015) discard;

  vec4 ripple = waterRipple(vWorld.xz);
  slope += ripple.xy;
  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 V = normalize(cameraPosition - vWorld);
  // A70: rivers and pools a little rougher and less sun-glazed, for Gothic grit.
  float roughness = clamp(0.08 + vRough * 0.3 + footprint * 0.02, 0.07, 0.5);
  float day = 1.0 - uNight;
  vec3 L = normalize(uSunDir);
  float NdotV = max(dot(N, V), 0.0);
  float fresnel = (${WATER_F0.toFixed(3)} + ${(1 - WATER_F0).toFixed(3)} * pow(1.0 - NdotV, 5.0)) * (1.0 - roughness * 0.4);
  vec3 R = reflect(-V, N);
  vec3 sky = waterSky(R, roughness, uTop, uHorizon);
  vec3 reflected = sky;
  if (uWaterSSR > 0.5) {
    vec4 ssr = waterScreenReflection(vWorld, R, roughness);
    reflected = mix(sky, ssr.rgb, ssr.a);
  }

  vec3 light = uAmbient * 0.6 + uSunColor * (0.18 + 0.22 * clamp(L.y * 3.0, 0.0, 1.0)) * min(uSunI, 2.5) * day;
  vec3 scatter = mix(uShallow, uDeep, smoothstep(0.1, 1.6, local)) * light;
  float path;
  vec3 transmitted = waterTransmission(scatter, N, vWorld, max(local, 0.0), uTime, day * min(uSunI, 2.0) * uDetail, path);
  vec3 color = mix(transmitted, reflected, clamp(fresnel, 0.0, 1.0));
  color += uSunColor * waterSun(N, V, L, roughness) * uSunI * day * 0.55;

  // White water: riffles, the fall, the race's drops; lace against the banks and anything standing in the stream.
  float banks = smoothstep(0.86, 1.0, abs(vAcross)) * 0.25;
  float contact = waterContactEdge(vWorld, footprint, max(local, 0.0)) * (0.45 + speed * 0.4);
  float streaks = foamTex.g * smoothstep(0.6, 1.6, speed) * 0.35;
  // A fall is torn into streaks: white where the sheet breaks, clear green between.
  float amount = clamp(vRough * (0.55 - 0.25 * fall) + fall * (0.05 + 0.55 * streak * streak) + banks * speed + contact + streaks + ripple.w, 0.0, 1.0);
  // A film over rock is thin, mostly clear water: lighter foam, and edges that fade into the wet stone.
  amount *= 1.0 - 0.45 * vHug;
  // Foam thins out toward the water's edge instead of ending in a hard white line along the ground.
  float cover = waterFoamCover(foamTex, amount, footprint) * smoothstep(0.0, 0.05, local);
  vec3 foamLight = uAmbient * 0.65 + uSunColor * (0.25 + 0.6 * max(dot(N, L), 0.0)) * min(uSunI, 2.4) * day * 0.45;
  color = mix(color, vec3(0.84, 0.9, 0.86) * foamLight, cover * 0.85);
  // Aerated water in a fall is milky even between the foam.
  color = mix(color, vec3(0.62, 0.72, 0.68) * light * 1.4, max(smoothstep(0.55, 1.0, vRough), fall) * 0.18);

  float alpha = uWaterCapture > 0.5 ? 1.0 : mix(0.45, 0.94, smoothstep(0.04, 0.9, local));
  // A falling sheet stays a little translucent even where it is white.
  alpha = max(alpha, cover * (1.0 - 0.25 * fall)) * smoothstep(-0.015, 0.03, local);
  alpha *= 1.0 - vHug * smoothstep(0.45, 0.95, abs(vAcross));
  gl_FragColor = vec4(color, alpha);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function inlandMaterial(water: WaterTextures, clarity: number, deep: THREE.Color, shallow: THREE.Color, quality: 'low' | 'medium' | 'high') {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...makeWaterOpticsUniforms(clarity),
      uTime: { value: 0 }, uDetail: { value: quality === 'low' ? 0 : 1 }, uWaterSSR: { value: quality === 'low' ? 0 : 1 },
      tWaterRipples: { value: water.ripples }, tWaterFoam: { value: water.foam }, tWaterCaustics: { value: water.caustics },
      uWaterCausticStrength: { value: quality === 'low' ? 0 : 1 },
      tSkyCube: { value: null as THREE.CubeTexture | null }, uSkyCubeReady: { value: 0 },
      tRipple: { value: null as THREE.Texture | null }, uRipple: { value: new THREE.Vector3(0, 0, 1) }, uRippleReady: { value: 0 },
      uDeep: { value: deep }, uShallow: { value: shallow },
      uTop: SKY.top, uHorizon: SKY.horizon, uSunDir: SKY.sunDir, uSunColor: SKY.sunColor, uSunI: SKY.sunI, uNight: SKY.night,
      uAmbient: SKY.ambient,
    },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
  });
}

interface Ribbon {
  channel: Channel;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  refresh(): void;
}

/** A row falling more than this to each neighbour is inside a cascade, where water runs as a film over the rock. */
const CASCADE_DROP = 0.25;

/**
 * One ribbon across a channel's whole cut. Positions and flow are rewritten from the solved samples. `film` lays the
 * whole ribbon as a film over the ground (a trickle down a steep face); otherwise only rows inside a cascade are.
 */
function makeRibbon(channel: Channel, terrain: Pick<Terrain, 'heightAt'>, material: THREE.ShaderMaterial, film = false): Ribbon {
  const samples = channel.samples, rows = samples.length, row = ACROSS + 1, count = rows * row;
  const position = new Float32Array(count * 3), bed = new Float32Array(count), flow = new Float32Array(count * 2);
  const rough = new Float32Array(count), wet = new Float32Array(count), across = new Float32Array(count);
  const hugs = new Float32Array(count);
  // A film is narrower than the cut it runs in.
  const half = channel.halfWidth * (film ? 1 : REACH);
  for (let i = 0; i < rows; i++) {
    const s = samples[i]!;
    for (let j = 0; j <= ACROSS; j++) {
      const a = (j / ACROSS) * 2 - 1, id = i * row + j;
      const x = s.x - s.tz * a * half, z = s.z + s.tx * a * half;
      position[id * 3] = x; position[id * 3 + 2] = z;
      bed[id] = terrain.heightAt(x, z);
      across[id] = a;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < ACROSS; j++) {
    const a = i * row + j;
    index.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
  }
  const geo = new THREE.BufferGeometry();
  // These attributes share their arrays with refresh() below (Float32BufferAttribute would copy them).
  const posAttr = new THREE.BufferAttribute(position, 3), flowAttr = new THREE.BufferAttribute(flow, 2);
  const roughAttr = new THREE.BufferAttribute(rough, 1), wetAttr = new THREE.BufferAttribute(wet, 1);
  const hugAttr = new THREE.BufferAttribute(hugs, 1);
  for (const attr of [posAttr, flowAttr, roughAttr, wetAttr, hugAttr]) attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aBed', new THREE.Float32BufferAttribute(bed, 1));
  geo.setAttribute('aFlow', flowAttr);
  geo.setAttribute('aRough', roughAttr);
  geo.setAttribute('aWet', wetAttr);
  geo.setAttribute('aAcross', new THREE.Float32BufferAttribute(across, 1));
  geo.setAttribute('aHug', hugAttr);
  geo.setIndex(index);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = `water-${channel.id}`;
  mesh.renderOrder = 2;
  const reaches = new Uint8Array(count);
  const refresh = () => {
    let minY = Infinity, maxY = -Infinity, anyWet = false;
    for (let i = 0; i < rows; i++) {
      const s = samples[i]!;
      // A dry row borrows its wet neighbour's level so the ribbon ends in a clean taper, hidden by the bed.
      const level = Number.isFinite(s.surface) ? s.surface : Number.NaN;
      const before = samples[i - 1]?.surface ?? Number.NaN, after = samples[i + 1]?.surface ?? Number.NaN;
      const hug = film || (before - level > CASCADE_DROP && level - after > CASCADE_DROP);
      // Water spreads out from the middle until a bank stands above it or the ground falls away below the channel;
      // the first vertex past a bank keeps the level (under ground, so the bank draws the shoreline), the rest are dry.
      const mid = ACROSS / 2;
      for (const side of [-1, 1]) {
        let open = Number.isFinite(level);
        for (let k = 0; k <= mid; k++) {
          const id = i * row + mid + side * k, ground = bed[id]!;
          if (open && ground < s.bed - SPREAD_BELOW_BED) open = false;
          reaches[id] = open ? 1 : 0;
          if (open && ground > level + 0.01) open = false;
        }
      }
      for (let j = 0; j <= ACROSS; j++) {
        const id = i * row + j;
        const a = across[id]!;
        const isWet = reaches[id] === 1;
        // Nowhere across the stream stands deeper than over its middle: down a cross-slope the water runs as a film.
        const y = !isWet ? bed[id]! - 0.25 : hug ? Math.min(level, bed[id]! + FILM) : Math.min(level, bed[id]! + (level - s.bed) + FILM);
        position[id * 3 + 1] = y;
        wet[id] = isWet ? 1 : 0;
        hugs[id] = hug ? 1 : 0;
        // Faster mid-channel than against the banks.
        const profile = Math.max(0.15, 1 - (a * REACH / 1.4) ** 2);
        flow[id * 2] = s.tx * s.speed * profile;
        flow[id * 2 + 1] = s.tz * s.speed * profile;
        rough[id] = s.rough;
        if (isWet) { anyWet = true; minY = Math.min(minY, bed[id]!); maxY = Math.max(maxY, y); }
      }
    }
    posAttr.needsUpdate = flowAttr.needsUpdate = roughAttr.needsUpdate = wetAttr.needsUpdate = hugAttr.needsUpdate = true;
    geo.computeBoundingBox();
    if (anyWet) { geo.boundingBox!.min.y = Math.min(geo.boundingBox!.min.y, minY - 0.1); geo.boundingBox!.max.y = maxY + 0.12; }
    geo.boundingSphere = geo.boundingBox!.getBoundingSphere(new THREE.Sphere());
    mesh.visible = anyWet;
  };
  refresh();
  return { channel, mesh, refresh };
}

/** The spring's pool: a level disc within its basin; the bowl's own ground shapes the shoreline. */
function makePool(world: WaterWorld, terrain: Pick<Terrain, 'heightAt'>, material: THREE.ShaderMaterial) {
  const rings = 14, segments = 72;
  const positions: number[] = [], beds: number[] = [], index: number[] = [];
  const vertex = (x: number, z: number) => {
    positions.push(x, 0, z);
    beds.push(terrain.heightAt(x, z));
    return positions.length / 3 - 1;
  };
  vertex(SPRING_BASIN.x, SPRING_BASIN.z);
  for (let r = 1; r <= rings; r++) {
    const radius = (POOL_REACH * r) / rings;
    for (let k = 0; k < segments; k++) {
      const angle = (k / segments) * Math.PI * 2;
      vertex(SPRING_BASIN.x + Math.cos(angle) * radius, SPRING_BASIN.z + Math.sin(angle) * radius);
      const current = 1 + (r - 1) * segments + k, next = 1 + (r - 1) * segments + ((k + 1) % segments);
      if (r === 1) index.push(0, next, current);
      else index.push(current - segments, next - segments, current, current, next - segments, next);
    }
  }
  const n = positions.length / 3;
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.Float32BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aBed', new THREE.Float32BufferAttribute(beds, 1));
  const flow = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const dx = positions[i * 3]! - SPRING_BASIN.x, dz = positions[i * 3 + 2]! - SPRING_BASIN.z;
    flow[i * 2] = -dz * 0.025; flow[i * 2 + 1] = dx * 0.025;
  }
  geo.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
  geo.setAttribute('aRough', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('aWet', new THREE.Float32BufferAttribute(new Float32Array(n).fill(1), 1));
  geo.setAttribute('aAcross', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('aHug', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  geo.setIndex(index);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'water-spring-pool';
  mesh.renderOrder = 2;
  const refresh = () => {
    const level = world.poolLevel;
    for (let i = 0; i < n; i++) posAttr.setY(i, level);
    posAttr.needsUpdate = true;
    geo.computeBoundingBox();
    geo.boundingBox!.min.y = Math.min(...beds.filter((b) => b < level)) - 0.05;
    geo.boundingBox!.max.y = level + 0.1;
    geo.boundingSphere = geo.boundingBox!.getBoundingSphere(new THREE.Sphere());
  };
  refresh();
  return { mesh, refresh };
}

export interface InlandWater {
  group: THREE.Group;
  meshes: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[];
  materials: THREE.ShaderMaterial[];
  /** Rewrite surfaces after the world re-solved its channels. */
  refresh(): void;
  dispose(): void;
}

export function buildInlandWater(world: WaterWorld, terrain: Pick<Terrain, 'heightAt'>, water: WaterTextures, quality: 'low' | 'medium' | 'high'): InlandWater {
  const group = new THREE.Group();
  group.name = 'inland-water';
  // The stream runs clear but tea-green from the hill; the races carry silt; the spring is almost glass.
  const stream = inlandMaterial(water, 0.64, new THREE.Color(0.02, 0.06, 0.045), new THREE.Color(0.06, 0.12, 0.085), quality);
  const races = inlandMaterial(water, 0.5, new THREE.Color(0.03, 0.06, 0.04), new THREE.Color(0.08, 0.12, 0.08), quality);
  const spring = inlandMaterial(water, 1.2, new THREE.Color(0.015, 0.06, 0.06), new THREE.Color(0.05, 0.13, 0.11), quality);
  const ribbons: Ribbon[] = [
    makeRibbon(world.channel('main'), terrain, stream),
    makeRibbon(world.channel('village'), terrain, races),
    makeRibbon(world.channel('quarry'), terrain, races),
    makeRibbon(world.rill, terrain, spring, true),
  ];
  const pool = makePool(world, terrain, spring);
  for (const r of ribbons) group.add(r.mesh);
  group.add(pool.mesh);
  const meshes = [...ribbons.map((r) => r.mesh), pool.mesh];
  return {
    group, meshes, materials: [stream, races, spring],
    refresh() {
      for (const r of ribbons) r.refresh();
      pool.refresh();
      pool.mesh.visible = world.flows.spring >= 0.0125;
    },
    dispose() {
      for (const m of [stream, races, spring]) detachWaterOptics(m);
    },
  };
}
