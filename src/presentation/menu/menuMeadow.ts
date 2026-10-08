import * as THREE from 'three';
import { fbm, mulberry32, smoothstep } from '../../world/noise';
import { clumpTriangles, createGrassClump, type ClumpSpec } from '../grass/bladeGeometry';
import { createGrassMaterial, type GrassBand, type GrassMaterial, type GrassMaterialOptions } from '../grass/grassMaterial';
import type { GrassTrample } from '../grass/trample';
import type { GrassWind } from '../grass/wind';
import { MENU_CAMERA, MENU_FIRE, MENU_STONES, MENU_TREE, browZ, keepTest, menuHeight, menuSplat, trackDistance, type Keep } from './menuLayout';
import { MENU_SEA_LEVEL } from './menuSky';

/**
 * The heath on the headland: the menu's meadow, and the thing the eye rests on. Tens of thousands of clumps of blades
 * and seed heads, densest in the foreground where the low sun shines through them, olive and gold and heather-purple
 * out to the brow. The sea wind drives gusts up the slope toward the lens; spirits skimming low part the grass, and
 * anything walking through it leaves a trail that slowly closes.
 *
 * Because the camera never moves, the meadow is laid out for it: three levels of detail by distance from the lens, each
 * drawn in its own band and handing over to the next without a seam, and nothing placed where the lens cannot see.
 */

export type MeadowQuality = 'low' | 'medium' | 'high';

interface MeadowLevel {
  clump: ClumpSpec;
  /** Blade width at scale 1 (m). */
  width: number;
  /** Clumps per square metre of open heath. */
  density: number;
  /** Ground distance from the lens this level is sown over (m). */
  from: number;
  to: number;
  band: GrassBand;
}

const FAR: GrassBand['outStart'] = 1e5;

export const MEADOW_LEVELS: Readonly<Record<MeadowQuality, readonly MeadowLevel[]>> = {
  high: [
    { clump: { blades: 24, segments: 5 }, width: 0.027, density: 12, from: 1.4, to: 12.5, band: { inStart: -2, inEnd: -1, outStart: 10, outEnd: 12.4 } },
    { clump: { blades: 14, segments: 3 }, width: 0.036, density: 5, from: 9.6, to: 28.5, band: { inStart: 10, inEnd: 12.4, outStart: 24, outEnd: 28.3 } },
    { clump: { blades: 9, segments: 2 }, width: 0.052, density: 2.1, from: 23.8, to: 64, band: { inStart: 24, inEnd: 28.3, outStart: FAR, outEnd: FAR + 1 } },
  ],
  medium: [
    { clump: { blades: 18, segments: 4 }, width: 0.031, density: 8, from: 1.4, to: 11.5, band: { inStart: -2, inEnd: -1, outStart: 9, outEnd: 11.4 } },
    { clump: { blades: 11, segments: 3 }, width: 0.04, density: 3.4, from: 8.6, to: 26.5, band: { inStart: 9, inEnd: 11.4, outStart: 22, outEnd: 26.3 } },
    { clump: { blades: 7, segments: 2 }, width: 0.058, density: 1.5, from: 21.8, to: 58, band: { inStart: 22, inEnd: 26.3, outStart: FAR, outEnd: FAR + 1 } },
  ],
  low: [
    { clump: { blades: 12, segments: 3 }, width: 0.036, density: 4.5, from: 1.6, to: 10.5, band: { inStart: -2, inEnd: -1, outStart: 8, outEnd: 10.4 } },
    { clump: { blades: 8, segments: 2 }, width: 0.048, density: 2, from: 7.6, to: 24.5, band: { inStart: 8, inEnd: 10.4, outStart: 20, outEnd: 24.3 } },
    { clump: { blades: 5, segments: 2 }, width: 0.07, density: 0.9, from: 19.8, to: 50, band: { inStart: 20, inEnd: 24.3, outStart: FAR, outEnd: FAR + 1 } },
  ],
};

/** Half the angle either side of the view that is sown (wide screens see more of the heath than 16:9). */
const SPREAD = 1.02;
const CLUMP = { radius: 0.24, height: 0.62 } as const;

const cOlive = new THREE.Color().setHex(0x5e6238);
const cGreen = new THREE.Color().setHex(0x445530);
const cGold = new THREE.Color().setHex(0x958050);
const cHeather = new THREE.Color().setHex(0x6a4640);
const cShade = new THREE.Color().setHex(0x2c3522);

export interface MeadowSpot {
  /** 0 nothing grows .. 1 deep heath. */
  cover: number;
  height: number;
  dry: number;
  /** Share of blades that are flowering stems or flowers. */
  flowers: number;
  /** 0..1: heather rather than grass (purple bloom). */
  heather: number;
  shade: number;
}

/**
 * What grows at (x, z) on the headland. Nothing on the wheel ruts, the camp's trodden pan, the rock at the tree's feet,
 * the stones' rise or past the brow; a short hump between the ruts and short trodden verges; under the crown thin and
 * dark; toward the brow, where nobody walks, tall and golden; heather in patches on the drier ground.
 */
export function meadowAt(x: number, z: number, out: MeadowSpot = { cover: 0, height: 0, dry: 0, flowers: 0, heather: 0, shade: 0 }): MeadowSpot {
  out.cover = 0; out.height = 0; out.dry = 0; out.flowers = 0; out.heather = 0; out.shade = 0;
  const b = browZ(x);
  if (z < b + 0.3) return out;
  if (menuHeight(x, z) < MENU_SEA_LEVEL + 2) return out;
  const s = menuSplat(x, z);
  const green = s.w[0]! + s.w[1]!;
  if (green < 0.08) return out;
  const { d } = trackDistance(x, z);
  const rut = 1 - smoothstep(0.17, 0.4, Math.abs(d - 0.72));
  const campD = Math.hypot(x - MENU_FIRE.x, z - MENU_FIRE.z);
  const treeD = Math.hypot(x - MENU_TREE.x, z - MENU_TREE.z);
  const stonesD = Math.hypot(x - MENU_STONES.x, z - MENU_STONES.z);
  const patchy = fbm(x * 0.13, z * 0.13, 3, 61) * 0.5 + 0.5;
  const fine = fbm(x * 0.9, z * 0.9, 2, 62) * 0.5 + 0.5;
  const edge = smoothstep(b + 13, b + 1, z);
  // The crown's shade: a ring round the trunk where little light reaches.
  const shade = smoothstep(9.5, 4.5, treeD);
  out.shade = shade;
  out.cover = Math.min(1, green * 1.15) * (1 - rut) * smoothstep(2.9, 3.9, campD) * smoothstep(2.6, 3.6, treeD)
    * (1 - 0.7 * shade) * (0.72 + 0.28 * smoothstep(0.25, 0.7, patchy)) * (1 - 0.6 * smoothstep(6, 2.5, stonesD));
  // Trodden short round the camp and on the hump and verges of the track; tall at the brow and in the deep heath.
  const trodden = Math.max(1 - smoothstep(3.5, 7, campD), (1 - smoothstep(0.25, 0.42, d)) * 0.55, (1 - smoothstep(1.1, 2.2, d)) * 0.45);
  out.height = (0.62 + 0.42 * patchy + 0.3 * fine * fine + 0.32 * edge) * (1 - 0.55 * trodden) * (1 - 0.45 * shade) * (1 - 0.3 * s.wet);
  out.dry = Math.min(0.9, 0.18 + 0.5 * edge + 0.22 * smoothstep(0.55, 0.85, patchy));
  out.heather = smoothstep(0.58, 0.72, fbm(x * 0.07 + 9, z * 0.07 - 4, 3, 63) * 0.5 + 0.5) * (1 - edge * 0.6) * (1 - shade);
  out.flowers = Math.min(0.32, 0.14 + 0.12 * edge + 0.1 * out.heather - 0.08 * trodden);
  return out;
}

export interface MenuMeadow {
  group: THREE.Group;
  /** Clumps and blades sown, and the triangles drawn. */
  count: number;
  blades: number;
  triangles: number;
  materials: GrassMaterial[];
  dispose(): void;
}

export interface MenuMeadowOptions {
  quality: MeadowQuality;
  keep: readonly Keep[];
  wind: GrassWind;
  trample: GrassTrample | null;
  /** Light from the spirits on the blades. */
  patch?: GrassMaterialOptions['patch'];
  patchKey?: string;
}

export function buildMenuMeadow(opts: MenuMeadowOptions): MenuMeadow {
  const free = keepTest(opts.keep);
  const group = new THREE.Group();
  group.name = 'Menu_Heath_Meadow';
  const cam = { x: MENU_CAMERA.x, z: MENU_CAMERA.z };
  const view = Math.atan2(MENU_CAMERA.lookX - MENU_CAMERA.x, MENU_CAMERA.lookZ - MENU_CAMERA.z);
  // At dusk the low sun shines straight through the heath toward the lens: the tips and seed heads glow against the
  // darker tufts.
  const look = { rootShade: 0.2, tipLift: 0.38, translucency: 0.9, sheen: 0.25, transTint: new THREE.Color(1.12, 1.16, 0.5) };
  const spot: MeadowSpot = { cover: 0, height: 0, dry: 0, flowers: 0, heather: 0, shade: 0 };
  const tint = new THREE.Color();
  const materials: GrassMaterial[] = [];
  const disposables: { dispose(): void }[] = [];
  let count = 0, blades = 0, triangles = 0;
  MEADOW_LEVELS[opts.quality].forEach((level, li) => {
    const rng = mulberry32(51017 + li * 977);
    const area = SPREAD * (level.to * level.to - level.from * level.from);
    const candidates = Math.round(area * level.density);
    const base: number[] = [], shape: number[] = [], tints: number[] = [], slope: number[] = [], dist: number[] = [];
    for (let k = 0; k < candidates; k++) {
      const r = Math.sqrt(level.from * level.from + rng() * (level.to * level.to - level.from * level.from));
      const a = view + (rng() * 2 - 1) * SPREAD;
      const x = cam.x + Math.sin(a) * r, z = cam.z + Math.cos(a) * r;
      const uAccept = rng(), uH = rng(), uC = rng(), uW = rng(), uSeed = rng(), uYaw = rng();
      meadowAt(x, z, spot);
      if (uAccept >= spot.cover) continue;
      const radius = 0.8 + uW * 0.5;
      if (!free(x, z, CLUMP.radius * radius)) continue;
      const y = menuHeight(x, z) - 0.03;
      const e = 0.3;
      const gx = (menuHeight(x + e, z) - menuHeight(x - e, z)) / (2 * e);
      const gz = (menuHeight(x, z + e) - menuHeight(x, z - e)) / (2 * e);
      tint.copy(cOlive).lerp(cGreen, 0.35 + 0.4 * (1 - spot.dry) * uC).lerp(cGold, spot.dry * 0.55)
        .lerp(cHeather, spot.heather * 0.85).lerp(cShade, spot.shade * 0.7);
      const j = 0.8 + uC * 0.36;
      // Kept a little shorter right at the lens, so the frame's lower edge is grass, not a wall of it.
      const nearLens = 0.62 + 0.38 * smoothstep(3, 9, r);
      base.push(x, y, z, 0);
      dist.push(r);
      shape.push(uYaw * Math.PI * 2, radius, Math.max(0.2, spot.height * nearLens * (0.8 + 0.4 * uH) * (spot.heather > 0.5 ? 0.55 : 1)), uSeed);
      tints.push(tint.r * j, tint.g * j, tint.b * j, 1 - spot.shade * 0.6);
      slope.push(gx, gz, spot.dry, spot.flowers);
    }
    const n = base.length / 4;
    // Nearest first: the lens never moves, so drawing front to back lets the depth test skip every blade hidden behind
    // nearer ones before it is shaded.
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => dist[a]! - dist[b]!);
    const sorted = (src: number[]) => {
      const out = new Float32Array(src.length);
      order.forEach((from, to) => out.set(src.slice(from * 4, from * 4 + 4), to * 4));
      return out;
    };
    const material = createGrassMaterial({
      wind: opts.wind, trample: opts.trample, look, band: level.band, farBlades: 1,
      fade: { start: 1e4, end: 1e4 + 1, sizeComp: 1, power: 1 },
      clump: { ...CLUMP, width: level.width, blades: level.clump.blades },
      patch: opts.patch, patchKey: opts.patchKey,
    });
    const clump = createGrassClump(level.clump);
    const geometry = new THREE.InstancedBufferGeometry();
    for (const [name, attr] of Object.entries(clump.attributes)) geometry.setAttribute(name, attr);
    geometry.setIndex(clump.index);
    geometry.setAttribute('aBase', new THREE.InstancedBufferAttribute(sorted(base), 4));
    geometry.setAttribute('aShape', new THREE.InstancedBufferAttribute(sorted(shape), 4));
    geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(sorted(tints), 4));
    geometry.setAttribute('aSlope', new THREE.InstancedBufferAttribute(sorted(slope), 4));
    geometry.instanceCount = n;
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(cam.x, 0, cam.z), level.to + 3);
    const mesh = new THREE.Mesh(geometry, material.material);
    mesh.name = `Menu_Heath_Meadow_${li}`;
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.receiveShadow = opts.quality !== 'low';
    mesh.castShadow = false;
    mesh.raycast = () => {};
    // Levels draw near to far as well.
    mesh.renderOrder = li;
    group.add(mesh);
    materials.push(material);
    disposables.push(geometry, clump, material.material);
    count += n;
    blades += n * level.clump.blades;
    triangles += n * clumpTriangles(level.clump);
  });
  return {
    group, count, blades, triangles, materials,
    dispose() { for (const d of disposables) d.dispose(); },
  };
}
