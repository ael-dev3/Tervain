import * as THREE from 'three';
import { mulberry32, smoothstep } from '../../world/noise';
import { createGrassPatch } from '../ground/grass';
import { createPatchMaterial, createPushers } from '../ground/patchMaterial';
import type { SwayUniforms } from '../vegetation';
import { MENU_SKY_GLSL, MENU_SUN_DIR, MENU_SEA_LEVEL, menuSkyUniforms } from './menuSky';
import { MENU_FIRE, MENU_TREE, browZ, keepTest, menuHeight, menuSplat, trackDistance, type Keep } from './menuLayout';

/**
 * The ground of the menu vigil: a muddy hilltop camp above the sea. The mesh is a rectilinear grid that is fine near the
 * camp (30 cm, enough for wheel ruts and trodden mud) and coarse toward the edges. It carries the same eight-layer weights and
 * wetness the playable terrain uses, so it is drawn by the game's own terrain material and looks like the same world.
 * Rain water stands in the ruts; tufts of heath grass lean in the evening wind.
 */

/** Grid coordinates between lo and hi: `fine` spacing inside [a, b], widening by `grow` per metre outside it. */
export function gridAxis(lo: number, hi: number, a: number, b: number, fine: number, grow: number): number[] {
  const out: number[] = [];
  let v = lo;
  while (v < hi) {
    out.push(v);
    const outside = v < a ? a - v : v > b ? v - b : 0;
    v += fine + outside * grow;
  }
  out.push(hi);
  return out;
}

/** The terrain grid with splat attributes. Triangles lying entirely under the sea are left out so the sky dome's sea shows. */
export function buildMenuGroundGeometry(quality: 'low' | 'medium' | 'high'): THREE.BufferGeometry {
  const fine = quality === 'low' ? 0.55 : quality === 'medium' ? 0.4 : 0.3;
  const xs = gridAxis(-120, 120, -16, 16, fine, 0.07);
  const zs = gridAxis(-110, 20, -26, 16, fine, 0.06);
  const nx = xs.length;
  const nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  const splatA = new Float32Array(nx * nz * 4);
  const splatB = new Float32Array(nx * nz * 4);
  const wet = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const x = xs[i]!;
      const z = zs[j]!;
      pos[k * 3] = x;
      pos[k * 3 + 1] = menuHeight(x, z);
      pos[k * 3 + 2] = z;
      const s = menuSplat(x, z);
      for (let l = 0; l < 4; l++) {
        splatA[k * 4 + l] = s.w[l]!;
        splatB[k * 4 + l] = s.w[l + 4]!;
      }
      wet[k] = s.wet;
    }
  }
  const idx: number[] = [];
  const under = MENU_SEA_LEVEL - 0.4;
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = a + nx;
      // Counter-clockwise seen from above (+y): a(x0,z0) d(x0,z1) c(x1,z1) b(x1,z0) with z growing toward the camera.
      const wet = (i: number) => pos[i * 3 + 1]! < under;
      if (!(wet(a) && wet(d) && wet(b))) idx.push(a, d, b);
      if (!(wet(b) && wet(d) && wet(c))) idx.push(b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSplatA', new THREE.BufferAttribute(splatA, 4));
  g.setAttribute('aSplatB', new THREE.BufferAttribute(splatB, 4));
  g.setAttribute('aWet', new THREE.BufferAttribute(wet, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------------------------ puddles ------------------------------------------------------------------ */

const PUDDLE_VERT = /* glsl */ `
attribute float aEdge;
varying vec3 vW;
varying float vEdge;
varying float vFog;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vEdge = aEdge;
  vec4 mv = viewMatrix * w;
  vFog = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const PUDDLE_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uUpper;
uniform vec3 uHorizonCool;
uniform vec3 uHorizonWarm;
uniform vec3 uSunCore;
uniform vec3 uCloudDark;
uniform vec3 uCloudLit;
uniform float uSkyTime;
uniform sampler2D uNoise;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec3 uFirePos;
uniform vec3 uFireColor;
varying vec3 vW;
varying float vEdge;
varying float vFog;
${MENU_SKY_GLSL}
void main() {
  vec3 v = normalize(vW - cameraPosition);
  // Still water with a slow shiver of wind on it, and floating grit that breaks the reflection up near the edge.
  vec2 g = texture2D(uNoise, vW.xz * 0.61 + vec2(uSkyTime * 0.013, -uSkyTime * 0.009)).gb - 0.5;
  float grit = texture2D(uNoise, vW.xz * 2.3).a;
  vec3 n = normalize(vec3(g.x * 0.07, 1.0, g.y * 0.07));
  vec3 r = reflect(v, n);
  float fres = 0.05 + 0.95 * pow(1.0 - clamp(dot(-v, n), 0.0, 1.0), 5.0);
  vec3 refl = menuSkyFar(r) * 0.85;
  refl += uSunCore * pow(max(dot(r, uSunDir), 0.0), 600.0) * 3.0;
  // The fire glints in the water near it.
  vec3 toFire = uFirePos - vW;
  float fd = length(toFire);
  refl += uFireColor * pow(max(dot(r, toFire / fd), 0.0), 60.0) * 4.0 / (1.0 + fd * fd * 0.08);
  vec3 silt = vec3(0.0055, 0.0045, 0.0035);
  vec3 col = mix(silt, refl, fres * (1.0 - smoothstep(0.55, 0.95, vEdge) * 0.6) * (0.78 + 0.22 * grit));
  // Muddy margin: the water thins to wet silt before it meets the ground.
  float a = 1.0 - smoothstep(0.72, 1.0, vEdge + (grit - 0.5) * 0.25);
  float f = 1.0 - exp(-uFogDensity * uFogDensity * vFog * vFog);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, a);
}`;

export interface PuddleSpot {
  x: number;
  z: number;
  rx: number;
  rz: number;
  yaw: number;
}

/** Puddles lie where water would: in the wheel ruts and in the trodden hollow of the camp. */
export function puddleSpots(): PuddleSpot[] {
  const rng = mulberry32(4401);
  const spots: PuddleSpot[] = [];
  // Along the ruts, from near the camera out to the brow.
  for (let i = 0; i < 26 && spots.length < 11; i++) {
    const z = 7 - i * 1.55 - rng() * 0.8;
    // Search across the track for the rut bottom (lowest ground).
    let bx = 0;
    let by = Infinity;
    for (let x = -4; x <= 4; x += 0.05) {
      const { d } = trackDistance(x, z);
      if (d > 1.4) continue;
      const y = menuHeight(x, z);
      if (y < by) {
        by = y;
        bx = x;
      }
    }
    // None right under the lens: seen from straight above they would only mirror the near-black zenith.
    if (!Number.isFinite(by) || rng() < 0.35 || z > 2.5) continue;
    spots.push({ x: bx, z, rx: 0.3 + rng() * 0.35, rz: 0.9 + rng() * 1.6, yaw: (rng() - 0.5) * 0.3 });
  }
  // The camp hollow: one off to the left, one in front of the fire where the flames glint in it.
  spots.push({ x: MENU_FIRE.x - 2.3, z: MENU_FIRE.z + 1.9, rx: 0.7, rz: 0.5, yaw: 0.6 });
  spots.push({ x: MENU_FIRE.x - 0.9, z: MENU_FIRE.z + 2.6, rx: 0.42, rz: 0.75, yaw: -0.5 });
  return spots;
}

function puddleGeometry(spots: PuddleSpot[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const edge: number[] = [];
  const idx: number[] = [];
  const seg = 18;
  const rings = 3;
  for (const s of spots) {
    const cy = menuHeight(s.x, s.z) + 0.035;
    const base = pos.length / 3;
    const c = Math.cos(s.yaw);
    const sn = Math.sin(s.yaw);
    pos.push(s.x, cy, s.z);
    edge.push(0);
    for (let r = 1; r <= rings; r++) {
      const t = r / rings;
      for (let k = 0; k < seg; k++) {
        const a = (k / seg) * Math.PI * 2;
        const wob = 1 + 0.22 * Math.sin(a * 3 + s.x * 5.1) + 0.12 * Math.sin(a * 5 + s.z * 3.3);
        const lx = Math.cos(a) * s.rx * t * wob;
        const lz = Math.sin(a) * s.rz * t * wob;
        pos.push(s.x + lx * c - lz * sn, cy, s.z + lx * sn + lz * c);
        edge.push(t);
      }
    }
    for (let k = 0; k < seg; k++) idx.push(base, base + 1 + ((k + 1) % seg), base + 1 + k);
    for (let r = 1; r < rings; r++) {
      const r0 = base + 1 + (r - 1) * seg;
      const r1 = base + 1 + r * seg;
      for (let k = 0; k < seg; k++) {
        const k1 = (k + 1) % seg;
        idx.push(r0 + k, r0 + k1, r1 + k1, r0 + k, r1 + k1, r1 + k);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export function buildPuddles(fog: THREE.FogExp2, fire: THREE.Vector3) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...menuSkyUniforms,
      uFogColor: { value: fog.color },
      uFogDensity: { value: fog.density },
      uFirePos: { value: fire.clone() },
      uFireColor: { value: new THREE.Color(1.0, 0.45, 0.14) },
    },
    vertexShader: PUDDLE_VERT,
    fragmentShader: PUDDLE_FRAG,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(puddleGeometry(puddleSpots()), material);
  mesh.name = 'Menu_Rut_Puddles';
  mesh.renderOrder = 1;
  return mesh;
}

/* ------------------------------------------------------------------ grass ------------------------------------------------------------------ */

const cDry = new THREE.Color().setHex(0x5a5230);
const cOlive = new THREE.Color().setHex(0x3c4428);
const cStraw = new THREE.Color().setHex(0x7a6438);
const cDead = new THREE.Color().setHex(0x4e3f2c);

/**
 * Heath grass as instanced tufts, using the playable ground cover's blade geometry and wind shader so it moves like the
 * game's grass. Placement follows the splat: none in the mud, taller and more golden at the brow where nobody treads.
 */
export function buildMenuGrass(quality: 'low' | 'medium' | 'high', sway: SwayUniforms, keep: readonly Keep[] = []) {
  const free = keepTest(keep);
  const blades = quality === 'high' ? 11 : quality === 'medium' ? 9 : 6;
  const target = quality === 'high' ? 7200 : quality === 'medium' ? 4600 : 2200;
  const patch = createGrassPatch(blades, 7071);
  const sun = new THREE.Vector4(MENU_SUN_DIR.x, MENU_SUN_DIR.y, MENU_SUN_DIR.z, 0.85);
  const mat = createPatchMaterial(sway, createPushers(), sun, {
    vertexColors: false,
    fadeStart: 26,
    fadeEnd: 70,
    sizeComp: 1.6,
    power: 1.3,
    windAmp: 0.16,
    rootShade: 0.3,
    tipShade: 1.15,
  });
  const rng = mulberry32(90210);
  const base: number[] = [];
  const shape: number[] = [];
  const tint: number[] = [];
  const col = new THREE.Color();
  let tries = 0;
  while (base.length / 4 < target && tries < target * 12) {
    tries++;
    // Denser sampling near the camera, where each tuft is seen.
    const u = rng();
    const x = (rng() - 0.5) * 2 * (8 + u * u * 46);
    const z = 13 - Math.pow(rng(), 0.8) * 56;
    const b = browZ(x);
    if (z < b - 0.5) continue;
    const { d } = trackDistance(x, z);
    const s = menuSplat(x, z);
    const green = s.w[0]! + s.w[1]!;
    if (green < 0.35 || d < 1.25) continue;
    const campD = Math.hypot(x - MENU_FIRE.x, z - MENU_FIRE.z);
    const treeD = Math.hypot(x - MENU_TREE.x, z - MENU_TREE.z);
    if (campD < 3.4 || treeD < 3.2) continue;
    // Nothing grows through a stone, a root, a step or a peg.
    if (!free(x, z, 0.12)) continue;
    if (rng() > green * (0.55 + 0.45 * smoothstep(1.2, 4, d))) continue;
    const y = menuHeight(x, z) - 0.03;
    const edge = smoothstep(b + 12, b + 1, z);
    let hs = 0.55 + 0.45 * rng() + 0.5 * edge + 0.25 * smoothstep(2, 6, d);
    hs *= 1 - 0.35 * s.wet;
    // Trampled short round the camp and near the lens, so the frame's edge is not a wall of blades.
    hs *= 0.45 + 0.55 * Math.min(1, Math.hypot(x - 0.3, z - 9.4) / 7);
    col.copy(cOlive).lerp(cDry, 0.35 + 0.4 * rng()).lerp(cStraw, edge * 0.5 + 0.15 * rng()).lerp(cDead, rng() * 0.3);
    base.push(x, y, z, (base.length / 4 + rng()) / target);
    shape.push(rng() * Math.PI * 2, 0.8 + rng() * 0.6, Math.min(1.7, hs), rng() * 20);
    tint.push(col.r, col.g, col.b, 1);
  }
  const n = base.length / 4;
  const geo = new THREE.InstancedBufferGeometry();
  for (const [name, attr] of Object.entries(patch.attributes)) geo.setAttribute(name, attr);
  if (patch.index) geo.setIndex(patch.index);
  geo.setAttribute('aBase', new THREE.InstancedBufferAttribute(new Float32Array(base), 4));
  geo.setAttribute('aShape', new THREE.InstancedBufferAttribute(new Float32Array(shape), 4));
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(tint), 4));
  geo.instanceCount = n;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -2, -15), 70);
  const mesh = new THREE.Mesh(geo, mat.material);
  mesh.name = 'Menu_Heath_Grass';
  mesh.frustumCulled = false;
  mesh.receiveShadow = quality !== 'low';
  return { mesh, count: n, material: mat.material, dispose: () => (patch.dispose(), geo.dispose(), mat.material.dispose()) };
}

/** Where a small ground object should rest: the lowest of five samples round its footprint, so nothing floats. */
export function restHeight(x: number, z: number, r: number): number {
  let y = menuHeight(x, z);
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]] as const) y = Math.min(y, menuHeight(x + dx, z + dz));
  return y;
}
