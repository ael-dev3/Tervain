import * as THREE from 'three';
import { ANCHORS, BUILDINGS, DECKS, FIELDS, INSPECT_LOCATIONS, PICKUP_LOCATIONS, PLACES, SPRING_POOL, STREAMS } from '../world/layout';
import { distToPolyline, roadWeight, type Terrain } from '../world/terrain';

export interface SwayUniforms {
  uTime: { value: number };
  uWind: { value: number };
}

/** Standard material whose vertices bend with `aSway` so branch and canopy motion stays attached. */
export function makeSwayMaterial(u: SwayUniforms, opts: { side?: THREE.Side; flat?: boolean } = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: opts.flat ?? true, roughness: 0.95, metalness: 0, side: opts.side ?? THREE.FrontSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = u.uTime;
    shader.uniforms.uWind = u.uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSway;\nuniform float uTime;\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec3 ip = vec3(0.0);
          #ifdef USE_INSTANCING
            ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          #endif
          float ph = ip.x * 0.31 + ip.z * 0.27;
          float gust = sin(uTime * 0.35 + ip.x * 0.02) * 0.5 + 0.5;
          float w = sin(uTime * 1.5 + ph + position.y * 0.7) * aSway * uWind * (0.55 + gust * 0.6);
          transformed.x += w * 0.55;
          transformed.z += w * 0.3;
        }`,
      );
  };
  return mat;
}


export function withSway(geo: THREE.BufferGeometry, fn: (y: number, x: number, z: number) => number): THREE.BufferGeometry {
  const n = geo.attributes.position!.count;
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = fn(geo.attributes.position!.getY(i), geo.attributes.position!.getX(i), geo.attributes.position!.getZ(i));
  geo.setAttribute('aSway', new THREE.BufferAttribute(a, 1));
  return geo;
}

export class Exclusions {
  private circles: { x: number; z: number; r: number }[] = [];
  constructor(private terrain: Terrain) {
    for (const b of BUILDINGS) this.circles.push({ x: b.x, z: b.z, r: Math.hypot(b.w, b.d) / 2 + 3.2 });
    for (const a of Object.values(ANCHORS)) this.circles.push({ x: a.x, z: a.z, r: 3.5 });
    for (const p of INSPECT_LOCATIONS) this.circles.push({ x: p.x, z: p.z, r: p.r + 1.5 });
    for (const p of PICKUP_LOCATIONS) this.circles.push({ x: p.x, z: p.z, r: 3.5 });
    for (const p of Object.values(PLACES)) {
      if (p.r < 20) this.circles.push({ x: p.x, z: p.z, r: 3 });
    }
    this.circles.push({ x: 3, z: 8, r: 11 }, { x: -1, z: 4, r: 4 }, { x: SPRING_POOL.x, z: SPRING_POOL.z, r: SPRING_POOL.r + 2.5 }, { x: 88, z: -20, r: 20 }, { x: -136, z: 28, r: 12 });
    this.circles.push({ x: 10, z: -58, r: 9 }, { x: -20, z: -98, r: 20 }, { x: -46, z: -100, r: 10 }, { x: 96, z: -8, r: 8 }, { x: 100, z: -19, r: 5 });
    for (const d of DECKS) this.circles.push({ x: d.x, z: d.z, r: d.hx + 3 });
  }

  blocked(x: number, z: number, pad = 0): boolean {
    for (const c of this.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true;
    if (roadWeight(x, z) > 0.04) return true;
    if (this.terrain.carveAt(x, z) > 0.02) return true;
    for (const f of FIELDS) {
      const dx = x - f.x;
      const dz = z - f.z;
      const lx = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
      const lz = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
      if (Math.abs(lx) < f.w / 2 + 1.5 && Math.abs(lz) < f.d / 2 + 1.5) return true;
    }
    return false;
  }
}


export function streamDistance(x: number, z: number) {
  let d = Infinity;
  for (const s of STREAMS) d = Math.min(d, distToPolyline(x, z, s.points).d);
  return Math.min(d, Math.hypot(x - SPRING_POOL.x, z - SPRING_POOL.z) - SPRING_POOL.r);
}

