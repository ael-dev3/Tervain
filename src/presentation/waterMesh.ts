import * as THREE from 'three';
import { SPRING_POOL, STREAMS, type StreamSpec, type V2 } from '../world/layout';
import type { Terrain } from '../world/terrain';
import { PAL } from './kit';

const VERT = /* glsl */ `
attribute float aAcross;
attribute float aAlong;
attribute vec2 aPerp;
attribute float aBed;
attribute float aHalf;
attribute float aLevel;
uniform float uFlow;
uniform float uTime;
varying float vAcross;
varying float vAlong;
varying float vDepthMix;
#include <fog_pars_vertex>
void main() {
  float flow = clamp(uFlow, 0.0, 1.0);
  float width = mix(0.18, 1.0, smoothstep(0.02, 0.75, flow));
  vec3 p = position;
  p.xz += aPerp * aAcross * aHalf * width;
  float lvl = aLevel * mix(0.25, 1.0, flow);
  p.y = aBed + lvl + 0.02 * sin(aAlong * 0.7 - uTime * (0.6 + flow * 1.6));
  vAcross = aAcross;
  vAlong = aAlong;
  vDepthMix = flow;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform float uFlow;
uniform float uTime;
uniform float uLight;
uniform vec3 uDeep;
uniform vec3 uShallow;
varying float vAcross;
varying float vAlong;
varying float vDepthMix;
#include <fog_pars_fragment>
void main() {
  if (uFlow < 0.025) discard;
  float edge = abs(vAcross);
  vec3 col = mix(uDeep, uShallow, smoothstep(0.15, 1.0, edge));
  float speed = 0.7 + uFlow * 2.8;
  float w1 = sin(vAlong * 1.3 - uTime * speed + vAcross * 3.0);
  float w2 = sin(vAlong * 0.55 - uTime * speed * 0.7 - vAcross * 5.0);
  float ripple = smoothstep(0.55, 0.95, w1 * w2 * 0.5 + 0.5);
  col += vec3(0.07, 0.09, 0.09) * ripple * (0.4 + uFlow);
  float foam = smoothstep(0.82, 1.0, edge) * 0.55;
  col = mix(col, vec3(0.62, 0.66, 0.62), foam * (0.3 + 0.5 * uFlow));
  // Thin water over mud reads brown-green.
  col = mix(col, vec3(0.42, 0.42, 0.3), (1.0 - smoothstep(0.05, 0.5, uFlow)) * 0.55);
  col *= uLight * 0.62;
  float alpha = mix(0.55, 0.86, smoothstep(0.1, 0.8, uFlow)) * (1.0 - smoothstep(0.88, 1.0, edge) * 0.35);
  gl_FragColor = vec4(col, alpha);
  #include <fog_fragment>
}`;

export interface RibbonInfo {
  id: string;
  mesh: THREE.Mesh;
  uniforms: { uFlow: { value: number }; uTime: { value: number }; uLight: { value: number } };
}

function resample(points: V2[], step: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
  }
  out.push(points[points.length - 1]!);
  // Light smoothing so the ribbon bends rather than kinks.
  const sm = out.map((p, i) => {
    if (i === 0 || i === out.length - 1) return p;
    const a = out[i - 1]!;
    const b = out[i + 1]!;
    return { x: (a.x + 2 * p.x + b.x) / 4, z: (a.z + 2 * p.z + b.z) / 4 };
  });
  return sm;
}

function makeRibbon(id: string, pts: V2[], halfWidth: number, depth: number, terrain: Terrain): RibbonInfo {
  const line = resample(pts, 2);
  const n = line.length;
  const pos: number[] = [];
  const across: number[] = [];
  const along: number[] = [];
  const perp: number[] = [];
  const bed: number[] = [];
  const half: number[] = [];
  const level: number[] = [];
  const idx: number[] = [];
  let dist = 0;
  for (let i = 0; i < n; i++) {
    const p = line[i]!;
    const prev = line[Math.max(0, i - 1)]!;
    const next = line[Math.min(n - 1, i + 1)]!;
    let tx = next.x - prev.x;
    let tz = next.z - prev.z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    if (i > 0) dist += Math.hypot(p.x - line[i - 1]!.x, p.z - line[i - 1]!.z);
    // Use the lowest ground across the channel as the bed so the surface always sits inside the carve.
    const bedH = Math.min(terrain.heightAt(p.x, p.z), terrain.heightAt(p.x - tz * 0.6, p.z + tx * 0.6), terrain.heightAt(p.x + tz * 0.6, p.z - tx * 0.6));
    for (const side of [-1, 1]) {
      pos.push(p.x, bedH, p.z);
      across.push(side);
      along.push(dist);
      perp.push(-tz, tx);
      bed.push(bedH);
      half.push(halfWidth * 0.95);
      level.push(Math.max(0.16, depth * 0.44));
    }
    if (i < n - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aAcross', new THREE.Float32BufferAttribute(across, 1));
  geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
  geo.setAttribute('aPerp', new THREE.Float32BufferAttribute(perp, 2));
  geo.setAttribute('aBed', new THREE.Float32BufferAttribute(bed, 1));
  geo.setAttribute('aHalf', new THREE.Float32BufferAttribute(half, 1));
  geo.setAttribute('aLevel', new THREE.Float32BufferAttribute(level, 1));
  geo.setIndex(idx);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(line[Math.floor(n / 2)]!.x, 0, line[Math.floor(n / 2)]!.z), 600);
  const uniforms = {
    uFlow: { value: 0.3 },
    uTime: { value: 0 },
    uLight: { value: 1 },
    uDeep: { value: new THREE.Color(PAL.waterDeep) },
    uShallow: { value: new THREE.Color(PAL.waterShallow) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, uniforms]),
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  // Keep references to the merged uniforms so callers can animate them.
  const u = mat.uniforms as unknown as RibbonInfo['uniforms'] & Record<string, unknown>;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  return { id, mesh, uniforms: u };
}

export interface WaterSystem {
  group: THREE.Group;
  ribbons: Record<'spring' | 'main' | 'village' | 'quarry', RibbonInfo>;
  pool: THREE.Mesh;
  poolUniforms: RibbonInfo['uniforms'];
  /** Ease each ribbon toward its target flow and advance the animation clock. */
  update(dt: number, time: number, targets: { spring: number; main: number; village: number; quarry: number }, light: number): void;
}

export function buildWater(terrain: Terrain): WaterSystem {
  const group = new THREE.Group();
  const main = STREAMS.find((s: StreamSpec) => s.id === 'main')!;
  const village = STREAMS.find((s: StreamSpec) => s.id === 'village')!;
  const quarry = STREAMS.find((s: StreamSpec) => s.id === 'quarry')!;
  // The main stream splits at the sluice (index 3): above it is spring flow, below it is the managed channel.
  const upper = main.points.slice(0, 4);
  const lower = main.points.slice(3);
  const ribbons = {
    spring: makeRibbon('spring', upper, main.halfWidth, main.depth, terrain),
    main: makeRibbon('main', lower, main.halfWidth, main.depth, terrain),
    village: makeRibbon('village', village.points, village.halfWidth, village.depth, terrain),
    quarry: makeRibbon('quarry', quarry.points, quarry.halfWidth, quarry.depth, terrain),
  };
  for (const r of Object.values(ribbons)) group.add(r.mesh);

  // The wetland pool.
  const poolGeo = new THREE.CircleGeometry(SPRING_POOL.r * 0.92, 28);
  poolGeo.rotateX(-Math.PI / 2);
  const poolBed = terrain.heightAt(SPRING_POOL.x, SPRING_POOL.z);
  const poolUniforms = {
    uFlow: { value: 0.6 },
    uTime: { value: 0 },
    uLight: { value: 1 },
  };
  const poolMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { ...poolUniforms, uDeep: { value: new THREE.Color(PAL.waterDeep) }, uShallow: { value: new THREE.Color(PAL.waterShallow) } }]),
    vertexShader: /* glsl */ `
      varying vec2 vXZ;
      #include <fog_pars_vertex>
      void main() {
        vXZ = position.xz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uLight; uniform vec3 uDeep; uniform vec3 uShallow;
      varying vec2 vXZ;
      #include <fog_pars_fragment>
      void main() {
        float r = length(vXZ) / 7.4;
        vec3 col = mix(uDeep, uShallow, smoothstep(0.3, 1.0, r));
        float ripple = sin(vXZ.x * 1.7 + uTime * 0.8) * sin(vXZ.y * 1.9 - uTime * 0.6);
        col += vec3(0.1, 0.13, 0.12) * smoothstep(0.55, 0.95, ripple * 0.5 + 0.5);
        col = mix(col, vec3(0.9, 0.95, 0.92), smoothstep(0.86, 1.0, r) * 0.4);
        col *= uLight;
        gl_FragColor = vec4(col, 0.82 * (1.0 - smoothstep(0.93, 1.0, r) * 0.4));
        #include <fog_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.position.set(SPRING_POOL.x, poolBed + 0.72, SPRING_POOL.z);
  pool.renderOrder = 2;
  group.add(pool);
  const pu = poolMat.uniforms as unknown as RibbonInfo['uniforms'];

  const cur = { spring: 0.3, main: 0.3, village: 0.1, quarry: 0.3 };
  return {
    group,
    ribbons,
    pool,
    poolUniforms: pu,
    update(dt, time, targets, light) {
      const k = 1 - Math.exp(-dt * 0.6);
      for (const key of Object.keys(cur) as (keyof typeof cur)[]) {
        cur[key] += (targets[key] - cur[key]) * k;
        const r = ribbons[key];
        r.uniforms.uFlow.value = cur[key];
        r.uniforms.uTime.value = time;
        r.uniforms.uLight.value = light;
      }
      pu.uTime.value = time;
      pu.uLight.value = light;
    },
  };
}
