import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';
import { Batch, Ctx } from '../buildKit';
import { MENU_SEA_LEVEL, MENU_SKY_GLSL, menuSkyUniforms } from './menuSky';

export type MenuShipQuality = 'low' | 'medium' | 'high';

export interface MenuShipRoute {
  start: { x: number; z: number };
  end: { x: number; z: number };
  /** World metres per second, independent of frame rate. */
  speed: number;
  /** Normalized position in the voyage when this menu visit begins. */
  phase: number;
  size: number;
  variant: number;
  period: number;
}

export interface MenuShipPose {
  x: number;
  z: number;
  /** The hull's pointed bow is local +Z. */
  heading: number;
  opacity: number;
}

/** Entirely seaward of the wooded hills, Lantern Point, and the opposite coast's first land cells. */
export function isMenuShipOpenWater(x: number, z: number): boolean {
  return Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 1850 && z <= -700 && z >= -1530;
}

/**
 * A small fleet, not a crowd. Every visit has opposing crossings and, above low quality, an oblique voyage with a much
 * stronger near/far component. The westward sweeps pass beyond Lantern Point rather than through its lighthouse rock.
 * All choices happen here; animation never samples random numbers or changes course in front of the player.
 */
export function generateMenuShipRoutes(seed: number, quality: MenuShipQuality = 'high'): MenuShipRoute[] {
  const rng = mulberry32(seed >>> 0);
  const firstDirection = rng() < 0.5 ? 1 : -1;
  const count = quality === 'low' ? 2 : 3;
  const routes: MenuShipRoute[] = [];
  for (let i = 0; i < count; i++) {
    const extent = i === 0 ? 1120 + rng() * 100 : 1530 + rng() * 110;
    const leftDepth = i === 0 ? 775 + rng() * 35 : i === 1 ? 1060 + rng() * 80 : 750 + rng() * 60;
    const rightDepth = i === 0 ? 820 + rng() * 55 : i === 1 ? 1140 + rng() * 80 : 1390 + rng() * 55;
    const direction = i === 1 ? -firstDirection : i === 0 ? firstDirection : rng() < 0.5 ? 1 : -1;
    const left = { x: -extent, z: -leftDepth };
    const right = { x: extent, z: -rightDepth };
    const start = direction > 0 ? left : right;
    const end = direction > 0 ? right : left;
    // All first glimpses occupy separated bearings in the open sea to the right of the choices. A westward arrival on
    // the left was hidden behind the ancient tree. Solve x / -z = bearing against this route, so diagonal depth changes
    // cannot make two launch silhouettes overlap; direction still varies independently of their starting positions.
    const bearing = i === 0 ? 0.29 + rng() * 0.05 : i === 1 ? 0.42 + rng() * 0.045 : 0.535 + rng() * 0.035;
    const slope = (end.z - start.z) / (end.x - start.x);
    const depthAtZero = start.z - slope * start.x;
    const initialX = (-bearing * depthAtZero) / (1 + bearing * slope);
    const phase = (initialX - start.x) / (end.x - start.x);
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    const speed = (i === 0 ? 1.35 : 1.1) + rng() * 0.65;
    routes.push({ start, end, speed, phase, size: i === 0 ? 1.1 + rng() * 0.1 : 0.85 + rng() * 0.24, variant: i, period: length / speed });
  }
  return routes;
}

const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** A pure route sampler. Invisible endpoints allow a voyage to wrap without an opaque hull teleporting across the bay. */
export function sampleMenuShipRoute(route: MenuShipRoute, time: number): MenuShipPose {
  const clock = Number.isFinite(time) ? Math.max(0, time) : 0;
  const raw = clock / route.period + route.phase;
  const u = raw - Math.floor(raw);
  return {
    x: route.start.x + (route.end.x - route.start.x) * u,
    z: route.start.z + (route.end.z - route.start.z) * u,
    heading: Math.atan2(route.end.x - route.start.x, route.end.z - route.start.z),
    opacity: smooth(u / 0.08) * smooth((1 - u) / 0.08),
  };
}

const SHIP_VERT = /* glsl */ `
attribute float aCloth;
uniform float uTime;
varying vec3 vW;
varying vec3 vN;
varying vec3 vColor;
void main() {
  vec3 p = position + normal * aCloth * sin(uTime * 0.7 + position.y * 0.31) * 0.16;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vColor = color;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SHIP_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uUpper;
uniform vec3 uHorizonCool;
uniform vec3 uHorizonWarm;
uniform vec3 uSunCore;
uniform vec3 uCloudDark;
uniform vec3 uCloudLit;
uniform float uOpacity;
varying vec3 vW;
varying vec3 vN;
varying vec3 vColor;
${MENU_SKY_GLSL}
void main() {
  if (vW.y < ${MENU_SEA_LEVEL.toFixed(2)}) discard;
  vec3 n = normalize(vN);
  float light = 0.36 + max(n.y, 0.0) * 0.13 + abs(dot(n, uSunDir)) * 0.18;
  vec3 col = vColor * light;
  vec3 d = normalize(vW - cameraPosition);
  vec3 haze = menuSkyFar(normalize(vec3(d.x, 0.015, d.z)));
  // The camp's dense fog would erase every sail at these distances. Use the far coast's directional dusk haze instead.
  float f = 1.0 - exp(-length(vW - cameraPosition) * 0.00052);
  col = mix(col, haze, min(f, 0.64));
  gl_FragColor = vec4(col, uOpacity);
}`;

const WAKE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const WAKE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float edge = sin(vUv.x * 3.14159265);
  float tail = pow(max(0.0, 1.0 - vUv.y), 1.6);
  float ripple = 0.6 + 0.4 * sin(vUv.y * 26.0 - uTime * 1.6);
  gl_FragColor = vec4(vec3(0.12, 0.14, 0.13), edge * tail * ripple * uOpacity * 0.18);
}`;

/** Original small coastal traders: a closed faceted hull, deck, connected rigging and deliberately unequal sail plans. */
function shipGeometry(variant: number): THREE.BufferGeometry {
  const ctx = new Ctx();
  const b = new Batch(ctx, 'menu-ship');
  b.amp = 0.025;
  b.jit = 0.02;
  const clothWeights: number[] = [];
  const wood = 0x44382a;
  const rail = 0x655039;
  const sail = variant === 1 ? 0xc6ad81 : variant === 2 ? 0xb3a18a : 0xd0bc91;
  const stations = [
    { z: -11, w: 0.9, y: 3.1 }, { z: -7, w: 2.6, y: 2.45 }, { z: 0, w: 3.05, y: 2.25 },
    { z: 7, w: 2.1, y: 2.7 }, { z: 12, w: 0.16, y: 3.55 },
  ];
  const ring = (s: (typeof stations)[number]): [number, number, number][] => [
    [-s.w, s.y, s.z], [-s.w * 0.73, 0.15, s.z], [-s.w * 0.2, -1.2, s.z],
    [s.w * 0.2, -1.2, s.z], [s.w * 0.73, 0.15, s.z], [s.w, s.y, s.z],
  ];
  for (let i = 0; i < stations.length - 1; i++) {
    const a = ring(stations[i]!);
    const c = ring(stations[i + 1]!);
    for (let k = 0; k < 5; k++) b.quad([...a[k]!, ...c[k]!, ...c[k + 1]!, ...a[k + 1]!], wood);
    b.quad([...a[0]!, ...a[5]!, ...c[5]!, ...c[0]!], 0x594936);
    for (const side of [-1, 1]) {
      const s0 = stations[i]!;
      const s1 = stations[i + 1]!;
      b.rod(side * s0.w, s0.y + 0.05, s0.z, side * s1.w, s1.y + 0.05, s1.z, 0.13, 4, rail);
    }
  }
  // Both stem and stern are closed; the keel continues below the shader sea plane rather than hovering above it.
  for (const [s, reverse] of [[stations[0]!, false], [stations[stations.length - 1]!, true]] as const) {
    const r = ring(s);
    for (let k = 1; k < 5; k++) {
      const a = r[0]!;
      const c = r[k]!;
      const d = r[k + 1]!;
      if (reverse) b.tri3(...a, ...d, ...c, wood);
      else b.tri3(...a, ...c, ...d, wood);
    }
  }
  b.box(3.6, 2.25, 4.2, 0, 2.45, -6.4, 0x4d3d2c);
  b.box(4, 0.35, 4.6, 0, 4.7, -6.4, rail);
  b.rod(0, 3.2, 10, 0, 4.3, 16.5, 0.15, 4, wood);
  b.rod(0, 2.25, -1, 0, variant === 1 ? 24 : 23, -1, 0.19, 5, wood);
  for (const x of [-2.5, 2.5]) {
    b.rod(x, 2.6, -6, 0, 21.8, -1, 0.04, 3, rail);
    b.rod(x, 2.5, 5, 0, 21.8, -1, 0.04, 3, rail);
  }
  b.rod(0, 23, -1, 0, 4.3, 16.5, 0.055, 3, rail);

  // Every cloth edge is pinned to a yard or stay. Only inner vertices receive the tiny shader wind displacement.
  const markCloth = (from: number, weight: number) => {
    for (let k = from; k < b.nv; k++) clothWeights[k] = weight;
  };
  const square = (top: number, bottom: number, wt: number, wb: number, z: number, angle: number) => {
    ctx.push(0, 0, z, angle);
    b.rod(-wt / 2, top, 0, wt / 2, top, 0, 0.13, 4, wood);
    b.rod(-wb / 2, bottom, 0, wb / 2, bottom, 0, 0.105, 4, wood);
    const point = (s: number, t: number): [number, number, number] => [
      (s - 0.5) * (wt + (wb - wt) * t), top + (bottom - top) * t, Math.sin(s * Math.PI) * Math.sin(t * Math.PI) * 0.72,
    ];
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 4; k++) {
        const s0 = k / 4;
        const s1 = (k + 1) / 4;
        const t0 = j / 3;
        const t1 = (j + 1) / 3;
        const from = b.nv;
        b.quad([...point(s0, t0), ...point(s1, t0), ...point(s1, t1), ...point(s0, t1)], sail, { amp: 0.018 });
        for (const [offset, s, t] of [[0, s0, t0], [1, s1, t0], [2, s1, t1], [3, s0, t1]]) {
          clothWeights[from + offset!] = Math.sin(s! * Math.PI) * Math.sin(t! * Math.PI);
        }
      }
    }
    ctx.pop();
  };
  const triangle = (a: [number, number, number], c: [number, number, number], d: [number, number, number], color: number) => {
    const centre: [number, number, number] = [(a[0] + c[0] + d[0]) / 3 + 0.6, (a[1] + c[1] + d[1]) / 3, (a[2] + c[2] + d[2]) / 3];
    for (const [p, q] of [[a, c], [c, d], [d, a]] as const) {
      const from = b.nv;
      b.tri3(...p, ...q, ...centre, color);
      markCloth(from, 0);
      clothWeights[from + 2] = 1;
    }
  };
  if (variant === 1) {
    // The lateen yard crosses the mast at z=-1, y≈18.7; the lower corner is held by a sheet to the stern.
    b.rod(0, 24, -9, 0, 12, 9, 0.12, 4, wood);
    b.rod(0, 4.5, -6, 0, 3.1, -11, 0.04, 3, rail);
    triangle([0, 24, -9], [0, 12, 9], [0, 4.5, -6], sail);
  } else {
    square(21, 7.5, 12.6, 10.6, -1, 0.96);
    if (variant === 2) {
      b.rod(0, 2.6, -7.5, 0, 15, -7.5, 0.13, 4, wood);
      square(14.3, 6.4, 7.6, 6.4, -7.5, 1.04);
    } else {
      square(22.6, 21.2, 6.3, 6.3, -1, 0.96);
    }
  }
  triangle([0, 20, -1], [0, 4.3, 16.5], [0, 4, 3.2], 0xb8a480);
  b.rod(0, 20, -1, 0, 4.3, 16.5, 0.035, 3, rail);
  b.rod(0, 4, 3.2, 0, 3.3, 12, 0.035, 3, rail);
  const geometry = b.toGeometry()!;
  geometry.setAttribute('aCloth', new THREE.Float32BufferAttribute(Array.from({ length: b.nv }, (_, i) => clothWeights[i] ?? 0), 1));
  return geometry;
}

function wakeGeometry(): THREE.BufferGeometry {
  const p: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  for (const side of [-1, 1]) {
    const base = p.length / 3;
    for (let j = 0; j <= 4; j++) {
      const t = j / 4;
      const x = side * (2 + t * 7);
      const z = -7 - t * 30;
      p.push(x - 0.6, 0, z, x + 0.6, 0, z);
      uv.push(0, t, 1, t);
      if (j < 4) {
        const a = base + j * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

export interface MenuShips {
  group: THREE.Group;
  readonly routes: readonly MenuShipRoute[];
  stats: { ships: number; triangles: number; meshes: number };
  /** Absolute seconds since this menu visit began; freezing that clock freezes hulls, cloth and wakes together. */
  update(time: number): void;
  /** No resource allocation: regenerate voyages and reposition the same small fleet. */
  reset(seed: number): void;
  dispose(): void;
}

export function buildMenuShips(seed: number, quality: MenuShipQuality = 'high'): MenuShips {
  const group = new THREE.Group();
  group.name = 'Menu_Ships';
  let routes = generateMenuShipRoutes(seed, quality);
  let disposed = false;
  const wake = wakeGeometry();
  const geometries = [shipGeometry(0), shipGeometry(1), ...(quality === 'low' ? [] : [shipGeometry(2)])];
  const vessels = geometries.map((geometry, i) => {
    const clock = { value: 0 };
    const opacity = { value: 1 };
    const bodyMaterial = new THREE.ShaderMaterial({
      uniforms: { ...menuSkyUniforms, uTime: clock, uOpacity: opacity },
      vertexShader: SHIP_VERT, fragmentShader: SHIP_FRAG, vertexColors: true, side: THREE.DoubleSide,
      transparent: true, depthWrite: false, fog: false, forceSinglePass: true,
    });
    const body = new THREE.Mesh(geometry, bodyMaterial);
    body.name = `Menu_Ship_${i + 1}_Hull_And_Rig`;
    const wakeMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: clock, uOpacity: opacity }, vertexShader: WAKE_VERT, fragmentShader: WAKE_FRAG,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, forceSinglePass: true,
    });
    const wakeMesh = new THREE.Mesh(wake, wakeMaterial);
    wakeMesh.name = `Menu_Ship_${i + 1}_Wake`;
    group.add(body, wakeMesh);
    return { body, wake: wakeMesh, clock, opacity, bodyMaterial, wakeMaterial };
  });
  const update = (time: number) => {
    if (disposed) return;
    const t = Number.isFinite(time) ? Math.max(0, time) : 0;
    vessels.forEach((vessel, i) => {
      const route = routes[i]!;
      const pose = sampleMenuShipRoute(route, t);
      const wave = t * (0.38 + i * 0.035) + route.phase * Math.PI * 2;
      vessel.body.position.set(pose.x, MENU_SEA_LEVEL + Math.sin(wave) * 0.16, pose.z);
      vessel.body.rotation.set(Math.sin(wave * 0.8) * 0.007, pose.heading, Math.sin(wave) * 0.012, 'YXZ');
      vessel.body.scale.setScalar(route.size);
      vessel.wake.position.set(pose.x, MENU_SEA_LEVEL + 0.06, pose.z);
      vessel.wake.rotation.y = pose.heading;
      vessel.wake.scale.setScalar(route.size);
      vessel.clock.value = t;
      vessel.opacity.value = pose.opacity;
      vessel.body.visible = vessel.wake.visible = pose.opacity > 0.001;
    });
  };
  update(0);
  return {
    group,
    get routes() { return routes; },
    stats: { ships: vessels.length, meshes: vessels.length * 2, triangles: geometries.reduce((n, g) => n + g.index!.count / 3, 0) + vessels.length * wake.index!.count / 3 },
    update,
    reset(nextSeed: number) {
      if (disposed) return;
      routes = generateMenuShipRoutes(nextSeed, quality);
      update(0);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const geometry of geometries) geometry.dispose();
      wake.dispose();
      for (const vessel of vessels) { vessel.bodyMaterial.dispose(); vessel.wakeMaterial.dispose(); }
      group.clear();
    },
  };
}
