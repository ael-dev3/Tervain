import * as THREE from 'three';
import type { Colliders } from '../world/colliders';
import {
  ANCHORS,
  BELL_TOWER,
  BORDER_SIGN,
  BUILDINGS,
  DECKS,
  FIELDS,
  LEDGER,
  MILL_WHEEL,
  PALISADE,
  PICKUP_LOCATIONS,
  RITE_ALTAR,
  SHORTCUT,
  SLUICE,
  WAGON,
  WELL,
  bySpec,
} from '../world/layout';
import { coastX } from '../world/coast';
import { mulberry32 } from '../world/noise';
import type { Terrain } from '../world/terrain';
import { Ctx, hash3 } from './buildKit';
import { buildLighthouse, buildStandard, cairn, groundOf, type BuildOut } from './buildings';
import { boat, benchSet, campfire, cart, fence, fishRack, jetty, netRack, oar, palisade, pot, ropeCoil, stockadeGate, wagon, watchtower, well, wreck } from './props';
import { MaterialSet, Region } from './regions';
import { TINT, barrel, crate, door, fieldstone, foundation, jitterTone, quoins, roofFor, sack, slab, windowAt, woodpile, type Rnd } from './structures';
import type { AssetNeed } from './assets/library';

/** Assets this module wants loaded before the world is built (none: everything here is built from primitives). */
export const NEEDS: AssetNeed[] = [];

export function makeTextTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The order's original mark: three interlocking strands (people, places, agreements). */
function drawTemplarMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42, r * 0.58, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = test;
  }
  if (line) {
    ctx.fillText(line, x, yy);
    yy += lh;
  }
  return yy;
}

/** Weathered notice paper pinned to boards: stained, uneven, in dark ink. */
export function drawNotice(ctx: CanvasRenderingContext2D, w: number, h: number, title: string, lines: string[]) {
  ctx.fillStyle = '#3a2c1f';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#b8a882');
  g.addColorStop(0.55, '#a8987a');
  g.addColorStop(1, '#8e7f62');
  ctx.fillStyle = g;
  ctx.fillRect(12, 12, w - 24, h - 24);
  const r = mulberry32(7);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(70,50,30,${0.04 + r() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(12 + r() * (w - 24), 12 + r() * (h - 24), 10 + r() * 40, 6 + r() * 26, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#2a1d12';
  ctx.font = 'bold 27px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 46);
  ctx.textAlign = 'left';
  ctx.font = '19px Georgia, serif';
  let y = 80;
  for (const l of lines) {
    ctx.fillStyle = '#6a2a1e';
    ctx.fillText('•', 26, y);
    ctx.fillStyle = '#2a1d12';
    y = wrapText(ctx, l, 44, y, w - 72, 24) + 6;
    if (y > h - 22) break;
  }
}

export interface SceneryHandles {
  group: THREE.Group;
  windowMat: THREE.MeshBasicMaterial;
  lanternMat: THREE.MeshBasicMaterial;
  lanternPositions: THREE.Vector3[];
  millWheel: THREE.Object3D;
  bell: THREE.Object3D;
  bellPos: THREE.Vector3;
  archiveDoor: THREE.Object3D;
  archiveShutter: THREE.Object3D;
  shortcutGate: THREE.Object3D;
  shortcutLever: THREE.Object3D;
  sluiceGate: THREE.Object3D;
  sluiceBrace: THREE.Object3D;
  sluiceCracks: THREE.Object3D;
  sluiceWheel: THREE.Object3D;
  noticeboardMat: THREE.MeshBasicMaterial;
  noticeCanvasSetter: (title: string, lines: string[]) => void;
  scheduleBoard: THREE.Object3D;
  contractGuardPost: THREE.Object3D;
  pickups: Record<string, THREE.Object3D>;
  ledger: THREE.Object3D;
  riteBowl: THREE.Object3D;
  dustEmitters: THREE.Vector3[];
  quarryBanner: THREE.Object3D;
  /** The lighthouse lamp room: the beam group turns and the lamp glows after dark. */
  lighthouse: { beam: THREE.Group; lamp: THREE.Vector3; light: THREE.PointLight };
  setNight(n: number): void;
  update(dt: number, time: number, night: number): void;
  dispose(): void;
}

function localToWorld(b: { x: number; z: number; yaw: number }, lx: number, lz: number) {
  const c = Math.cos(b.yaw);
  const s = Math.sin(b.yaw);
  return { x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c };
}

export function buildScenery(terrain: Terrain, colliders: Colliders, quality: 'low' | 'medium' | 'high' = 'high'): SceneryHandles {
  const group = new THREE.Group();
  group.name = 'settlement';
  const mats = new MaterialSet(quality === 'low' ? 192 : 256);
  const lanternPositions: THREE.Vector3[] = [];
  const out: BuildOut = { lanterns: lanternPositions };
  const rng: Rnd = mulberry32(909);
  const gy = (x: number, z: number) => terrain.heightAt(x, z);

  /** A region is a chunk of merged geometry; the world is split into a few so far chunks are culled. */
  const regions = new Map<string, Region>();
  const region = (name: string) => {
    let r = regions.get(name);
    if (!r) {
      r = new Region(name, new Ctx());
      regions.set(name, r);
    }
    return r;
  };
  const regionOf = (x: number, z: number) => (x < -200 ? 'coast' : x < -60 ? 'heath' : z < -70 ? 'shrine' : x > 60 ? 'quarry' : 'village');

  /** Build a dynamic object at its own local origin and return it as a group (its parts move together). */
  const dyn = (name: string, fn: (R: Region) => void, shadows = true): THREE.Group => {
    const R = new Region(name, new Ctx());
    fn(R);
    const g = R.toGroup(mats, { isStatic: false, shadows });
    group.add(g);
    return g;
  };

  /* ---------------- Ordinary buildings ---------------- */
  for (const b of BUILDINGS) {
    if (b.kind === 'archive' || b.kind === 'shrine') continue;
    buildStandard(region(regionOf(b.x, b.z)), terrain, b, out);
  }

  /* ---------------- The lighthouse on Lantern Point ---------------- */
  const lightR = region('coast');
  const lh = buildLighthouse(lightR, terrain, out);
  const beam = new THREE.Group();
  const beamLight = new THREE.PointLight(0xffd9a0, 0, 60, 1.4);
  beam.position.copy(lh.lampWorld);
  {
    // Two long additive cones: the beam and its dimmer back-beam, turning about the lamp.
    const beamMat = () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(1.0, 0.86, 0.6) }, uAlpha: { value: 0.3 } },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vV;
          varying float vT;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            vT = clamp(position.x / 150.0, 0.0, 1.0);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uAlpha;
          varying vec3 vN;
          varying vec3 vV;
          varying float vT;
          void main() {
            // Bright along the axis, soft at the silhouette, thinning with distance from the lamp.
            float c = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
            float a = uAlpha * c * pow(1.0 - vT, 1.3) * smoothstep(0.0, 0.03, vT);
            gl_FragColor = vec4(uColor, a);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
    const mk = (len: number, r0: number, r1: number) => {
      const g = new THREE.CylinderGeometry(r1, r0, len, 20, 1, true);
      g.rotateZ(-Math.PI / 2);
      g.translate(len / 2, 0, 0);
      const m = new THREE.Mesh(g, beamMat());
      m.frustumCulled = false;
      return m;
    };
    const a = mk(150, 0.5, 13);
    const b2 = mk(150, 0.5, 13);
    b2.rotation.y = Math.PI;
    b2.scale.set(0.7, 0.7, 0.7);
    beam.add(a, b2);
    beam.visible = false;
    beam.add(beamLight);
    group.add(beam);
  }

  /* ---------------- Shrine hall: a heavy stone hall with a slate hip roof and a colonnade ---------------- */
  const hall = bySpec('shrine_hall');
  {
    const R = region('shrine');
    const { avg, lo } = groundOf(terrain, hall);
    const rnd: Rnd = mulberry32(4401);
    R.ctx.push(hall.x, avg, hall.z, 0);
    foundation(R, rnd, hall.w + 0.6, hall.d + 0.6, 0.7, avg - lo + 0.4);
    R.vc.bx(-hall.w / 2 + 0.05, 0.4, -hall.d / 2 + 0.05, hall.w / 2 - 0.05, 0.5 + hall.h, hall.d / 2 - 0.05, 0x1a1712, { jit: 0, amp: 0 });
    slab(R.stone, hall.w, hall.h, hall.d, 0.5, jitterTone(TINT.stone, rnd, 0.05), 0.9);
    quoins(R, rnd, hall.w, hall.d, hall.h, 0.5);
    roofFor(R, 'hip', 'slate', hall.w, hall.d, 0.5 + hall.h, 41, { pitch: 0.55 });
    // Colonnade of stone drums.
    for (let i = -3; i <= 3; i++) {
      const cx = (i * (hall.w - 1.5)) / 6;
      const cz = hall.d / 2 + 0.8;
      R.stone.lathe([0.42, 0, 0.36, 0.3, 0.3, 0.6, 0.28, hall.h - 0.6, 0.34, hall.h - 0.4, 0.4, hall.h - 0.2], 10, cx, 0.1, cz, jitterTone(TINT.stone, rnd, 0.08), { jit: 0.08, amp: 0.1 });
      colliders.circle('shrine_col', hall.x + cx, hall.z + cz, 0.36);
    }
    R.stone.bx(-hall.w / 2 - 0.3, 0.5 + hall.h - 0.5, hall.d / 2 + 0.2, hall.w / 2 + 0.3, 0.5 + hall.h - 0.1, hall.d / 2 + 1.4, jitterTone(TINT.stoneDark, rnd, 0.06), { jit: 0.05 });
    // Great door and two windows, steps.
    door(R, rnd, { x: 0, z: hall.d / 2 + 0.05, w: 1.9, h: 3.0 });
    for (const dx of [-3.6, 3.6]) windowAt(R, rnd, { x: dx, y: 2.4, z: hall.d / 2 + 0.03, w: 0.8, h: 1.3 });
    for (let i = 0; i < 3; i++) R.stone.box(4.4 - i * 0.3, 0.2, 1.0, 0, -0.1 + i * 0.05, hall.d / 2 + 2.3 + i * 0.7, jitterTone(TINT.stone, rnd, 0.14), { ry: (rnd() - 0.5) * 0.05, jit: 0.12 });
    const lp = R.ctx.toWorld(6.4, 2.4, hall.d / 2 + 1.6);
    lanternPositions.push(lp.clone());
    R.timber.box(0.12, 2.3, 0.12, 6.4, 0, hall.d / 2 + 1.6, jitterTone(TINT.woodDark, rnd), { grain: 'y' });
    R.glow.box(0.3, 0.3, 0.3, 6.4, 2.15, hall.d / 2 + 1.6, 0xffffff, { jit: 0 });
    R.ctx.pop();
    // Banner beside the door.
    const banner = makeTextTexture(256, 384, (ctx, w, h) => {
      ctx.fillStyle = '#3f4a5c';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#b9a874';
      ctx.fillRect(0, 0, w, 14);
      ctx.fillRect(0, h - 14, w, 14);
      drawTemplarMark(ctx, w / 2, h / 2 - 10, 90, '#cbbf94');
      const r = mulberry32(3);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(0,0,0,${r() * 0.07})`;
        ctx.fillRect(r() * w, r() * h, 20 + r() * 60, 3 + r() * 10);
      }
    });
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.1), new THREE.MeshBasicMaterial({ map: banner, side: THREE.DoubleSide, color: 0xb0b0b0 }));
    bm.position.set(hall.x - 6.2, avg + 3.6, hall.z + hall.d / 2 + 1.4);
    group.add(bm);
  }
  {
    const R = region('shrine');
    const rnd: Rnd = mulberry32(4402);
    const y0 = gy(hall.x - 6.2, hall.z + hall.d / 2 + 1.4);
    for (const dx of [-7.0, -5.4]) R.timber.box(0.12, 3.4, 0.12, hall.x + dx, y0, hall.z + hall.d / 2 + 1.4, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'y', rz: (rnd() - 0.5) * 0.04 });
  }

  /* ---------------- Archive: an enterable stone room with a plank door and a shutter ---------------- */
  const arch = bySpec('archive');
  const archY = groundOf(terrain, arch).avg;
  let archiveDoor!: THREE.Object3D;
  let archiveShutter!: THREE.Object3D;
  let ledger!: THREE.Object3D;
  {
    const R = region('shrine');
    const rnd: Rnd = mulberry32(4403);
    const hw = arch.w / 2;
    const hd = arch.d / 2;
    const t = 0.3;
    const gap = 1.0;
    R.ctx.push(arch.x, archY, arch.z, arch.yaw);
    const seg = (lx0: number, lx1: number, lz0: number, lz1: number) => {
      R.stone.bx(lx0, 0.2, lz0, lx1, 0.2 + arch.h, lz1, jitterTone(TINT.stone, rnd, 0.05), { sub: 0.8, amp: 0.1 });
    };
    seg(-hw, -gap, hd - t, hd + t);
    seg(gap, hw, hd - t, hd + t);
    seg(-hw, -gap * 0.8, -hd - t, -hd + t);
    seg(gap * 0.8, hw, -hd - t, -hd + t);
    seg(-hw - t, -hw + t, -hd, hd);
    seg(hw - t, hw + t, -hd, hd);
    R.stone.bx(-gap - 0.15, 0.2 + arch.h - 0.7, hd - t, gap + 0.15, 0.2 + arch.h, hd + t, jitterTone(TINT.stoneDark, rnd, 0.06), { jit: 0.05 });
    R.stone.bx(-gap * 0.8 - 0.1, 0.2, -hd - t, gap * 0.8 + 0.1, 0.7, -hd + t, jitterTone(TINT.stoneDark, rnd, 0.06), { jit: 0.05 });
    R.stone.bx(-gap * 0.8 - 0.1, 0.2 + arch.h - 0.6, -hd - t, gap * 0.8 + 0.1, 0.2 + arch.h, -hd + t, jitterTone(TINT.stoneDark, rnd, 0.06), { jit: 0.05 });
    R.planks.bx(-hw + 0.2, 0.1, -hd + 0.2, hw - 0.2, 0.24, hd - 0.2, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.1, grain: 'x' });
    roofFor(R, 'gable', 'slate', arch.w, arch.d, 0.2 + arch.h, 61, { pitch: 0.5 });
    for (const s of [-1, 1] as const) {
      R.stone.prism([[-hd, 0], [hd, 0], [0, hd * Math.tan(0.5)]], -0.15, 0.05, jitterTone(TINT.stone, rnd, 0.06), { jit: 0.05 });
      void s;
    }
    // Shelves along the west wall, a desk and lamp.
    for (let i = 0; i < 3; i++) {
      const sz = -1.6 + i * 1.6;
      R.planks.box(0.6, 2.2, 1.3, -hw + 0.55, 0.2, sz, jitterTone(TINT.wood, rnd, 0.12), { jit: 0.1 });
      for (let k = 0; k < 4; k++) R.cloth.box(0.4, 0.28, 1.0, -hw + 0.55, 0.5 + k * 0.5, sz, jitterTone(k % 2 ? 0xc8bca0 : 0x6a4a3a, rnd, 0.12), { jit: 0.1 });
    }
    R.planks.box(1.9, 0.9, 1.0, 0, 0.2, -1.9, jitterTone(TINT.wood, rnd, 0.12), { jit: 0.1, grain: 'x' });
    R.glow.box(0.2, 0.3, 0.2, 0.6, 1.1, -1.9, 0xffffff, { jit: 0 });
    lanternPositions.push(R.ctx.toWorld(0, 2.4, 0));
    R.ctx.pop();
    ledger = new THREE.Group();
    ledger.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.4), new THREE.MeshStandardMaterial({ color: 0x5a2a20, roughness: 0.85 })));
    ledger.position.set(LEDGER.x, archY + 1.16, LEDGER.z + 0.6);
    group.add(ledger);
    // Door leaf: hinged on the west side of the opening.
    const rd = mulberry32(4404);
    archiveDoor = new THREE.Group();
    const dp = localToWorld(arch, -gap, hd);
    archiveDoor.position.set(dp.x, archY + 0.2, dp.z);
    archiveDoor.rotation.y = arch.yaw;
    const leaf = dyn('archive-door', (D) => {
      for (let i = 0; i < 8; i++) D.planks.box(0.26, 2.5 + (rd() - 0.5) * 0.04, 0.07, gap * 2 * ((i + 0.5) / 8), 0, 0, jitterTone(TINT.wood, rd, 0.18), { jit: 0.14, grain: 'y' });
      for (const yy of [0.4, 1.9]) D.metal.box(gap * 2 * 0.9, 0.1, 0.03, gap, yy, 0.05, TINT.iron, { jit: 0.05 });
      D.metal.box(0.1, 0.1, 0.05, gap * 1.7, 1.2, 0.06, TINT.iron, { jit: 0.05 });
    });
    group.remove(leaf);
    archiveDoor.add(leaf);
    group.add(archiveDoor);
    // Shutter hinged at the top, swinging outward.
    archiveShutter = new THREE.Group();
    const sp = localToWorld(arch, 0, -hd - t);
    archiveShutter.position.set(sp.x, archY + 0.2 + arch.h - 0.65, sp.z);
    archiveShutter.rotation.y = arch.yaw;
    const sh = dyn('archive-shutter', (D) => {
      for (let i = 0; i < 6; i++) D.planks.box(gap * 1.6 / 6 * 0.95, 1.9, 0.06, -gap * 0.8 + (i + 0.5) * (gap * 1.6 / 6), -1.9, -0.02, jitterTone(TINT.wood, rd, 0.16), { jit: 0.12, grain: 'y' });
      D.metal.box(gap * 1.5, 0.08, 0.03, 0, -0.5, -0.05, TINT.iron, { jit: 0.05 });
    });
    group.remove(sh);
    archiveShutter.add(sh);
    group.add(archiveShutter);
  }

  /* ---------------- Bell tower and bell ---------------- */
  const bell = new THREE.Group();
  const bellPos = new THREE.Vector3(BELL_TOWER.x, gy(BELL_TOWER.x, BELL_TOWER.z), BELL_TOWER.z);
  {
    const R = region('village');
    const rnd: Rnd = mulberry32(5501);
    R.ctx.push(BELL_TOWER.x, bellPos.y, BELL_TOWER.z, 0.06);
    for (const dx of [-1.1, 1.1]) for (const dz of [-1.1, 1.1]) R.timber.box(0.3, 4.6, 0.3, dx, -0.15, dz, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'y', rz: (rnd() - 0.5) * 0.03, rx: (rnd() - 0.5) * 0.03, jit: 0.1 });
    R.planks.box(2.9, 0.16, 2.9, 0, 4.1, 0, jitterTone(TINT.wood, rnd, 0.1), { jit: 0.1, grain: 'x' });
    R.timber.box(2.6, 0.2, 0.2, 0, 3.4, 0, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'x' });
    for (const [x0, z0, x1, z1] of [[-1.1, -1.1, 1.1, 1.1], [1.1, -1.1, -1.1, 1.1]] as const) R.timber.rod(x0, 0.2, z0, x1 * 0.6, 2.6, z1 * 0.6, 0.06, 4, jitterTone(TINT.woodDark, rnd, 0.1), { caps: false });
    roofFor(R, 'hip', 'shingle', 3.4, 3.4, 4.2, 71, { pitch: 0.75 });
    for (let i = 0; i < 9; i++) R.stone.box(0.9, 0.34, 0.9, -1.4 + (i % 3) * 1.4, -0.22, -1.4 + Math.floor(i / 3) * 1.4, jitterTone(TINT.stone, rnd, 0.14), { ry: rnd() * 0.5, jit: 0.14 });
    R.ctx.pop();
    bell.position.set(BELL_TOWER.x, bellPos.y + 3.5, BELL_TOWER.z);
    const body = dyn('bell', (D) => {
      D.metal.lathe([0.1, -0.04, 0.3, -0.1, 0.34, -0.5, 0.42, -0.72, 0.6, -0.92, 0.62, -0.96], 14, 0, 0, 0, jitterTone(0x8a6a3a, rnd, 0.1), { jit: 0.06, amp: 0.08 });
      D.metal.blob(0.11, 0.11, 0.11, 0, -0.98, 0, TINT.iron, { seg: 6, rings: 3, lump: 0.08, seed: 9, smooth: true });
      D.timber.box(0.7, 0.12, 0.16, 0, 0, 0, TINT.woodDark, { jit: 0.05 });
    });
    group.remove(body);
    bell.add(body);
    group.add(bell);
  }

  /* ---------------- Noticeboard ---------------- */
  const nbCanvas = document.createElement('canvas');
  nbCanvas.width = 512;
  nbCanvas.height = 360;
  const nbTex = new THREE.CanvasTexture(nbCanvas);
  nbTex.colorSpace = THREE.SRGBColorSpace;
  nbTex.anisotropy = 4;
  const noticeboardMat = new THREE.MeshBasicMaterial({ map: nbTex, color: 0xbdbdbd });
  const noticeCanvasSetter = (title: string, lines: string[]) => {
    const ctx = nbCanvas.getContext('2d')!;
    drawNotice(ctx, 512, 360, title, lines);
    nbTex.needsUpdate = true;
  };
  {
    const R = region('village');
    const rnd: Rnd = mulberry32(5502);
    const nx = 5;
    const nz = 15.4;
    const y0 = gy(nx, nz);
    R.timber.box(0.17, 2.7, 0.17, nx - 1.25, y0 - 0.1, nz, jitterTone(TINT.woodDark, rnd), { grain: 'y', rz: 0.02 });
    R.timber.box(0.17, 2.6, 0.17, nx + 1.25, y0 - 0.1, nz, jitterTone(TINT.woodDark, rnd), { grain: 'y', rz: -0.015 });
    R.timber.box(3.1, 0.15, 0.26, nx, y0 + 2.5, nz, jitterTone(TINT.woodDark, rnd), { grain: 'x', rz: 0.012 });
    R.planks.box(2.55, 1.82, 0.08, nx, y0 + 0.7, nz - 0.06, jitterTone(TINT.wood, rnd, 0.1), { jit: 0.1, grain: 'x' });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.68), noticeboardMat);
    board.position.set(nx, y0 + 1.6, nz - 0.14);
    board.rotation.y = Math.PI;
    group.add(board);
    colliders.box('noticeboard', nx, nz, 1.4, 0.3, 0);
  }

  /* ---------------- Well ---------------- */
  well(region('village'), rng, WELL.x, gy(WELL.x, WELL.z), WELL.z);

  /* ---------------- Mill wheel ---------------- */
  const millWheel = new THREE.Group();
  {
    const rnd: Rnd = mulberry32(5503);
    const y = gy(MILL_WHEEL.x, MILL_WHEEL.z) + 1.7;
    const wheel = dyn('mill-wheel', (D) => {
      const spokes = 12;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        for (const s of [-1, 1]) D.timber.rod(s * 0.42, 0, 0, s * 0.42, Math.cos(a) * 2.45, Math.sin(a) * 2.45, 0.06, 5, jitterTone(TINT.woodDark, rnd, 0.12), { jit: 0.1, caps: false });
        D.ctx.push(0, 0, 0, 0, a, 0);
        D.planks.box(0.98, 0.5, 0.07, 0, 2.3, 0, jitterTone(TINT.wood, rnd, 0.16), { jit: 0.12, grain: 'x', rx: (rnd() - 0.5) * 0.05 });
        D.planks.box(0.98, 0.05, 0.5, 0, 2.25, 0.2, jitterTone(TINT.woodDark, rnd, 0.16), { jit: 0.12 });
        D.ctx.pop();
      }
      for (const s of [-1, 1]) {
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= 36; i++) {
          const a = (i / 36) * Math.PI * 2;
          pts.push([s * 0.42, Math.cos(a) * 2.45, Math.sin(a) * 2.45]);
        }
        D.timber.tube(pts, 0.09, 5, jitterTone(TINT.woodDark, rnd, 0.1));
      }
      D.timber.rod(-0.7, 0, 0, 0.7, 0, 0, 0.16, 8, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08 });
    });
    group.remove(wheel);
    millWheel.add(wheel);
    millWheel.position.set(MILL_WHEEL.x, y, MILL_WHEEL.z);
    group.add(millWheel);
  }

  /* ---------------- Sluice ---------------- */
  const sluiceGate = new THREE.Group();
  const sluiceBrace = new THREE.Group();
  const sluiceCracks = new THREE.Group();
  const sluiceWheel = new THREE.Group();
  {
    const R = region('village');
    const rnd: Rnd = mulberry32(5504);
    const gx = SLUICE.gateCenter.x;
    const gz = SLUICE.gateCenter.z;
    const bed = gy(gx, gz);
    const top = bed + 3.2;
    const stoneBlock = (x: number, z: number, w: number, h: number, d: number, y: number) => {
      R.stone.bx(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, jitterTone(TINT.stone, rnd, 0.06), { sub: 0.8, amp: 0.1 });
    };
    stoneBlock(gx - 4.0, gz, 2.4, 3.6, 2.6, bed - 0.9);
    stoneBlock(gx + 4.0, gz, 2.4, 3.6, 2.6, bed - 0.9);
    for (const sx of [-1, 1]) R.stone.bx(gx + sx * 4.0 - 1.4, bed + 2.7, gz - 1.5, gx + sx * 4.0 + 1.4, bed + 3.05, gz + 1.5, jitterTone(TINT.stoneDark, rnd, 0.06), { jit: 0.05 });
    R.timber.box(8.2, 0.36, 0.5, gx, top - 0.1, gz, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'x', rz: 0.008 });
    R.timber.box(0.3, 3.3, 0.45, gx - 2.5, bed - 0.2, gz, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'y' });
    R.timber.box(0.3, 3.3, 0.45, gx + 2.5, bed - 0.2, gz, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'y' });
    // Gate leaf.
    const leafG = dyn('sluice-gate', (D) => {
      for (let i = 0; i < 5; i++) D.planks.box(0.98, 2.2, 0.16, -2 + i, -1.1, 0, jitterTone(TINT.wood, rnd, 0.16), { jit: 0.12, grain: 'y', rz: (rnd() - 0.5) * 0.02 });
      for (const yy of [-0.8, 0.5]) D.metal.box(4.9, 0.12, 0.05, 0, yy, 0.1, TINT.iron, { jit: 0.05 });
    });
    group.remove(leafG);
    sluiceGate.add(leafG);
    sluiceGate.position.set(gx, bed + 1.55, gz);
    group.add(sluiceGate);
    // Cracks: dark fissures in the west support, gone once braced.
    const cr = dyn('sluice-cracks', (D) => {
      for (const [dx, dy, rz, len] of [[0.0, 0.6, 0.5, 1.4], [0.15, 1.3, -0.3, 1.0], [-0.1, 2.0, 0.7, 0.8]] as const) D.vc.box(0.05, len, 0.06, gx - 4.0 + 1.24, bed + dy + 0.3, gz + dx + 0.35, 0x0e0b08, { rz, jit: 0, amp: 0 });
    });
    group.remove(cr);
    sluiceCracks.add(cr);
    group.add(sluiceCracks);
    // Brace: two beams and iron straps, visible once the gate is stabilised.
    const br = dyn('sluice-brace', (D) => {
      D.timber.rod(gx - 2.6, bed + 0.2, gz + 1.3, gx - 3.9, bed + 3.2, gz + 1.3, 0.16, 6, jitterTone(0xd8b98a, rnd, 0.1), { jit: 0.1 });
      D.timber.rod(gx - 3.1, bed, gz + 1.45, gx - 3.2, bed + 1.6, gz + 1.45, 0.16, 6, jitterTone(0xd8b98a, rnd, 0.1), { jit: 0.1 });
      D.metal.box(0.4, 0.08, 0.4, gx - 3.4, bed + 1.8, gz + 1.35, TINT.iron, { jit: 0.05 });
    });
    group.remove(br);
    sluiceBrace.add(br);
    sluiceBrace.visible = false;
    group.add(sluiceBrace);
    // Control wheel on a stone pedestal.
    const wy = gy(SLUICE.control.x, SLUICE.control.z);
    R.stone.box(0.55, 1.1, 0.55, SLUICE.control.x, wy - 0.05, SLUICE.control.z, jitterTone(TINT.stone, rnd, 0.1), { jit: 0.1 });
    const wh = dyn('sluice-wheel', (D) => {
      for (let i = 0; i < 4; i++) D.metal.box(0.92, 0.07, 0.07, 0, 0, 0, TINT.iron, { ry: (i / 4) * Math.PI, jit: 0.06 });
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 16; i++) pts.push([Math.cos((i / 16) * Math.PI * 2) * 0.46, 0.02, Math.sin((i / 16) * Math.PI * 2) * 0.46]);
      D.metal.tube(pts, 0.03, 4, TINT.iron);
    });
    group.remove(wh);
    sluiceWheel.add(wh);
    sluiceWheel.position.set(SLUICE.control.x, wy + 1.2, SLUICE.control.z);
    group.add(sluiceWheel);
    // Inspection log board on the hut wall.
    const hut = bySpec('sluice_hut');
    const lp = localToWorld(hut, hut.w / 2 - 0.4, hut.d / 2 + 0.05);
    R.cloth.box(0.6, 0.8, 0.05, lp.x, gy(hut.x, hut.z) + 1.0, lp.z, jitterTone(TINT.cloth, rnd, 0.08), { ry: hut.yaw, jit: 0.08 });
  }

  /* ---------------- Footbridge, jetty ---------------- */
  for (const d of DECKS) {
    const R = region(d.id === 'jetty' ? 'coast' : 'village');
    const rnd: Rnd = mulberry32(6000 + Math.floor(d.x));
    if (d.id === 'jetty') {
      jetty(R, rnd, d, (x, z) => terrain.heightAt(x, z));
      continue;
    }
    R.ctx.push(d.x, 0, d.z, d.yaw);
    let px = -d.hx;
    while (px < d.hx - 0.1) {
      const pw = 0.2 + rnd() * 0.06;
      if (rnd() > 0.04) R.planks.box(pw * 0.94, 0.09, d.hz * 2 + (rnd() - 0.5) * 0.08, px + pw / 2, d.y - 0.09, (rnd() - 0.5) * 0.05, jitterTone(TINT.wood, rnd, 0.2), { ry: (rnd() - 0.5) * 0.03, jit: 0.16, grain: 'z' });
      px += pw;
    }
    for (const sz of [-1, 1]) {
      R.timber.box(d.hx * 2 - 0.2, 0.22, 0.2, 0, d.y - 0.36, sz * (d.hz - 0.15), jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'x', jit: 0.1 });
      R.timber.box(d.hx * 2 - 0.8, 0.09, 0.11, 0, d.y + 0.86, sz * (d.hz + 0.05), jitterTone(TINT.woodDark, rnd, 0.12), { grain: 'x', jit: 0.1, rz: (rnd() - 0.5) * 0.02 });
      for (let i = -Math.floor(d.hx - 0.6); i <= Math.floor(d.hx - 0.6); i += 2) R.bark.rod(i, d.y - 0.4, sz * (d.hz + 0.05), i + (rnd() - 0.5) * 0.06, d.y + 0.95, sz * (d.hz + 0.05), 0.065, 5, jitterTone(0xa89a86, rnd, 0.2), { jit: 0.1 });
    }
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) R.bark.rod(sx * (d.hx - 0.4), d.y - 2.4, sz * (d.hz - 0.3), sx * (d.hx - 0.4), d.y - 0.1, sz * (d.hz - 0.3), 0.2, 6, jitterTone(0xa89a86, rnd, 0.2), { jit: 0.1 });
    R.ctx.pop();
  }

  /* ---------------- Wagon on the strand, lodge, camp ---------------- */
  {
    const R = region('coast');
    const rnd: Rnd = mulberry32(6100);
    wagon(R, rnd, WAGON.x, gy(WAGON.x, WAGON.z), WAGON.z, WAGON.yaw);
    lanternPositions.push(new THREE.Vector3(WAGON.x + 2.6, gy(WAGON.x, WAGON.z) + 2.2, WAGON.z + 1.6));
    R.timber.box(0.1, 2.2, 0.1, WAGON.x + 2.6, gy(WAGON.x, WAGON.z), WAGON.z + 1.6, TINT.woodDark, { grain: 'y' });
    R.glow.box(0.3, 0.3, 0.3, WAGON.x + 2.6, gy(WAGON.x, WAGON.z) + 2.05, WAGON.z + 1.6, 0xffffff, { jit: 0 });
    // The fire ring, the racks and the boats on the strand.
    const fire = ANCHORS.strand_fire!;
    campfire(R, rnd, fire.x, gy(fire.x, fire.z), fire.z);
    benchSet(R, rnd, fire.x + 1.6, gy(fire.x + 1.6, fire.z + 1), fire.z + 1, 0.4);
    lanternPositions.push(new THREE.Vector3(fire.x, gy(fire.x, fire.z) + 1.0, fire.z));
    const shoreAt = (z: number) => coastX(z);
    const b1z = 47;
    boat(R, rnd, shoreAt(b1z) + 9, gy(shoreAt(b1z) + 9, b1z) + 0.05, b1z, 1.35, { len: 5.1, beam: 1.8, tilt: 0.05 });
    oar(R, rnd, shoreAt(b1z) + 11.6, gy(shoreAt(b1z) + 11.6, b1z + 1.4) + 0.3, b1z + 1.4, shoreAt(b1z) + 9.2, gy(shoreAt(b1z) + 9.2, b1z + 2.6) + 0.06, b1z + 2.6);
    const b2z = 68;
    boat(R, rnd, shoreAt(b2z) + 12, gy(shoreAt(b2z) + 12, b2z), b2z, 0.5, { len: 4.4, beam: 1.6, overturned: true, sunk: -0.5 });
    const b3z = 9;
    boat(R, rnd, shoreAt(b3z) + 4.5, gy(shoreAt(b3z) + 4.5, b3z) + 0.15, b3z, 1.9, { len: 3.9, beam: 1.5, tilt: 0.16, sunk: 0.35 });
    netRack(R, rnd, -232, gy(-232, 46), 46, -0.35, 3.4);
    netRack(R, rnd, -233, gy(-233, 52), 52.5, -0.42, 3.0);
    fishRack(R, rnd, -222, gy(-222, 62), 66, 0.5);
    for (let i = 0; i < 4; i++) pot(R, rnd, -252 + i * 0.8 + rnd() * 0.4, gy(-252, 60), 57.5 + rnd());
    ropeCoil(R, rnd, -246, gy(-246, 58), 55, 0.4);
    barrel(R, rnd, -238, gy(-238, 66.4), 66.4, 1);
    barrel(R, rnd, -236.8, gy(-236.8, 66.8), 66.8, 0.9);
    crate(R, rnd, -244, gy(-244, 41), 40, 0.8, 0.55, 0.6, 0.3);
    crate(R, rnd, -243.2, gy(-243.2, 40.6) + 0.55, 40.4, 0.6, 0.45, 0.5, -0.2);
    woodpile(R, rnd, -229, 54, 0.6, 1.6, 4);
    // Wreck of a hull on the beach north of the strand, and a few cairns.
    const wz = -14;
    wreck(R, rnd, shoreAt(wz) + 13, gy(shoreAt(wz) + 13, wz) - 0.1, wz, 1.05, 9);
    for (const [cx, cz] of [[-256, 12], [-249, 76], [-214, 30], [-306, 96], [-299, 86]] as const) cairn(R, rnd, cx, gy(cx, cz), cz, 4 + Math.floor(rnd() * 3));
    // Lobster pots and a coil at the lighthouse foot, and a stack of firewood at the keeper's door.
    const keeper = bySpec('keeper_cottage');
    const kd = localToWorld(keeper, keeper.w / 2 - 0.8, keeper.d / 2 + 0.55);
    woodpile(R, rnd, kd.x, kd.z, keeper.yaw, 1.5, 4);
    // The stockade behind the camp, its gate on the shore track, and the watch platform beside it.
    palisade(R, rnd, PALISADE.points as unknown as { x: number; z: number }[], PALISADE.gate, gy);
    const gateZ = (PALISADE.gate.z0 + PALISADE.gate.z1) / 2;
    stockadeGate(R, rnd, -219.2, gateZ, PALISADE.gate.z1 - PALISADE.gate.z0, gy);
    watchtower(R, rnd, PALISADE.tower.x, PALISADE.tower.z, PALISADE.tower.yaw, gy, (RR, yy) => roofFor(RR, 'hip', 'shingle', 3.4, 3.4, yy, 88, { pitch: 0.7 }));
    lanternPositions.push(new THREE.Vector3(-219.6, gy(-219.2, gateZ) + 3.7, gateZ - 1.5));
    colliders.circle('camp_fire', fire.x, fire.z, 0.7);
    colliders.box('camp_barrels', -237.4, 66.6, 1.0, 0.6, 0);
    colliders.box('camp_crates', -243.6, 40.4, 0.7, 0.6, 0);
    colliders.box('boat_a', shoreAt(b1z) + 9, b1z, 0.9, 2.5, 1.35);
    colliders.box('boat_b', shoreAt(b2z) + 12, b2z, 0.9, 2.2, 0.5);
    colliders.box('net_rack_a', -232, 46, 1.7, 0.2, -0.35);
    colliders.box('net_rack_b', -233, 52.5, 1.5, 0.2, -0.42);
    colliders.box('fish_rack', -222, 66, 1.5, 0.2, 0.5);
  }

  /* ---------------- Quarry ---------------- */
  const dustEmitters: THREE.Vector3[] = [];
  const quarryBanner = new THREE.Group();
  {
    const R = region('quarry');
    const rnd: Rnd = mulberry32(31);
    for (let i = 0; i < 14; i++) {
      const bx = 100 + rnd() * 12;
      const bz = -36 + rnd() * 22;
      const bw = 3 + rnd() * 3.5;
      const bh = 1.6 + rnd() * 2.6;
      const y = gy(bx, bz);
      fieldstone(R, rnd, bx, y - 0.6, bz, bw * 0.55, bh * 0.75, (2 + rnd() * 2.5) * 0.55);
      colliders.box(`face:${i}`, bx, bz, bw / 2, 1.5, 0);
    }
    dustEmitters.push(new THREE.Vector3(99, gy(99, -29) + 1.2, -29), new THREE.Vector3(100, gy(100, -22) + 1, -22));
    const stacks: [number, number, number, number, number][] = [[92, -16, 2.2, 1.4, 0.3], [84, -32, 2.6, 1.6, -0.2], [98, -26, 1.6, 1.6, 0.6]];
    for (const [x, z, hw, hd, yaw] of stacks) {
      const y = gy(x, z);
      for (let i = 0; i < 3; i++) {
        for (let k = 0; k < 2; k++) R.stone.box(hw - 0.05 - i * 0.2, 0.74, hd - 0.05, x + (k === 0 ? -hw / 2 : hw / 2) * Math.cos(yaw), y + i * 0.76, z - (k === 0 ? -hw / 2 : hw / 2) * Math.sin(yaw), jitterTone(TINT.stone, rnd, 0.14), { ry: yaw + (rnd() - 0.5) * 0.06, jit: 0.14, sub: 0.5 });
      }
    }
    crate(R, rnd, 78, gy(78, -24), -24, 1.6, 1.6, 1.6, 0.2);
    // Scaffold and hoist by the face.
    const sy = gy(92, -34);
    for (const dx of [0, 3.2]) R.bark.rod(92 + dx, sy - 0.3, -34, 92 + dx + 0.05, sy + 4.2, -34, 0.11, 6, jitterTone(0xa89a86, rnd, 0.2), { jit: 0.1 });
    R.timber.box(3.8, 0.16, 0.3, 93.6, sy + 3.7, -34, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'x', rz: 0.02 });
    R.metal.tube([[93.6, sy + 3.6, -34], [93.65, sy + 2.2, -34], [93.7, sy + 1.4, -34]], 0.02, 4, TINT.iron);
    R.stone.box(0.6, 0.5, 0.6, 93.7, sy + 1.0, -34, jitterTone(TINT.stone, rnd, 0.1), { jit: 0.1 });
    const bt = makeTextTexture(160, 256, (ctx, w, h) => {
      ctx.fillStyle = '#6c2d25';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#b6a570';
      ctx.fillRect(0, 0, w, 10);
      ctx.beginPath();
      ctx.moveTo(w / 2, 50);
      ctx.lineTo(w / 2 + 40, 140);
      ctx.lineTo(w / 2 - 40, 140);
      ctx.closePath();
      ctx.fill();
      const r = mulberry32(8);
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = `rgba(0,0,0,${r() * 0.08})`;
        ctx.fillRect(r() * w, r() * h, 10 + r() * 40, 3 + r() * 8);
      }
    });
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.6), new THREE.MeshBasicMaterial({ map: bt, side: THREE.DoubleSide, color: 0xb0b0b0 }));
    bm.position.set(0, 2.0, 0);
    quarryBanner.add(bm);
    const by = gy(80, -17);
    R.timber.box(0.14, 3.4, 0.14, 80, by - 0.1, -17, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'y', rz: 0.03 });
    quarryBanner.position.set(80.5, by + 0.6, -17);
    group.add(quarryBanner);
    for (const p of [[88, -20], [78, -10]] as const) {
      const y = gy(p[0], p[1]);
      lanternPositions.push(new THREE.Vector3(p[0], y + 2.1, p[1]));
      R.timber.box(0.1, 2.2, 0.1, p[0], y - 0.05, p[1], jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'y' });
      R.glow.box(0.3, 0.3, 0.3, p[0], y + 2.05, p[1], 0xffffff, { jit: 0 });
    }
  }

  /* ---------------- Shortcut gate and lever ---------------- */
  const shortcutGate = new THREE.Group();
  const shortcutLever = new THREE.Group();
  {
    const R = region('quarry');
    const rnd: Rnd = mulberry32(6200);
    const g = SHORTCUT.gate;
    const gyy = gy(g.x, g.z);
    const c = Math.cos(g.yaw);
    const s = Math.sin(g.yaw);
    for (const sx of [-1, 1]) fieldstone(R, rnd, g.x + sx * (g.hw + 0.9) * c, gyy - 0.2, g.z - sx * (g.hw + 0.9) * s, 0.36, 1.35, 0.36);
    for (const sx of [-1, 1]) {
      // A rough dry-stone wall running out from each post.
      for (let i = 0; i < 4; i++) fieldstone(R, rnd, g.x + sx * (g.hw + 2.0 + i * 0.95) * c, gyy - 0.1, g.z - sx * (g.hw + 2.0 + i * 0.95) * s, 0.55 + rnd() * 0.2, 0.42 + rnd() * 0.2, 0.32);
    }
    const leaf = dyn('shortcut-gate', (D) => {
      const w = (g.hw + 0.9) * 2 - 0.4;
      const n = Math.round(w / 0.22);
      for (let i = 0; i < n; i++) D.planks.box((w / n) * 0.93, 1.7 - (rnd() < 0.2 ? 0.1 : 0), 0.06, -w / 2 + (i + 0.5) * (w / n), 0.1, 0, jitterTone(TINT.woodDark, rnd, 0.16), { jit: 0.14, grain: 'y' });
      for (const yy of [0.4, 1.4]) D.metal.box(w * 0.94, 0.1, 0.03, 0, yy, 0.05, TINT.iron, { jit: 0.05 });
    });
    group.remove(leaf);
    shortcutGate.add(leaf);
    shortcutGate.position.set(g.x, gyy, g.z);
    shortcutGate.rotation.y = g.yaw;
    group.add(shortcutGate);
    const ly = gy(SHORTCUT.lever.x, SHORTCUT.lever.z);
    R.stone.box(0.5, 1.0, 0.5, SHORTCUT.lever.x, ly - 0.05, SHORTCUT.lever.z, jitterTone(TINT.stoneDark, rnd, 0.1), { jit: 0.1 });
    const arm = dyn('shortcut-lever', (D) => {
      D.metal.box(0.1, 1.05, 0.1, 0, 0, 0, TINT.iron, { jit: 0.06 });
      D.metal.box(0.28, 0.1, 0.1, 0, 1.0, 0, TINT.iron, { jit: 0.06 });
    });
    group.remove(arm);
    shortcutLever.add(arm);
    shortcutLever.position.set(SHORTCUT.lever.x, ly + 1.0, SHORTCUT.lever.z);
    shortcutLever.rotation.z = -0.7;
    group.add(shortcutLever);
  }

  /* ---------------- Altar, spring shrine details ---------------- */
  const riteBowl = new THREE.Group();
  {
    const R = region('shrine');
    const rnd: Rnd = mulberry32(6300);
    const y0 = gy(RITE_ALTAR.x, RITE_ALTAR.z);
    R.stone.box(1.9, 0.9, 1.3, RITE_ALTAR.x, y0 - 0.05, RITE_ALTAR.z, jitterTone(TINT.stone, rnd, 0.06), { jit: 0.06, sub: 0.5 });
    R.stone.box(2.2, 0.16, 1.6, RITE_ALTAR.x, y0 + 0.85, RITE_ALTAR.z, jitterTone(TINT.stoneDark, rnd, 0.06), { jit: 0.06 });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x5a5852, roughness: 0.85 }));
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.36, 10), new THREE.MeshBasicMaterial({ color: 0x3a6a68 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.1;
    riteBowl.add(bowl, water);
    riteBowl.position.set(RITE_ALTAR.x, y0 + 1.15, RITE_ALTAR.z);
    group.add(riteBowl);
    // Terrace wall: mismatched repairs.
    for (let i = 0; i < 9; i++) {
      const x = -34 + i * 2.6;
      R.stone.box(2.5, 0.75 + rnd() * 0.2, 0.5, x, gy(x, -90) - 0.15, -90, jitterTone(i % 3 === 0 ? TINT.stone : TINT.stoneDark, rnd, 0.14), { ry: (rnd() - 0.5) * 0.06, jit: 0.14, sub: 0.6 });
    }
    colliders.box('terrace_wall', -22.8, -90, 11.8, 0.3, 0);
    const lp = new THREE.Vector3(-16, gy(-16, -96) + 2.1, -96);
    lanternPositions.push(lp);
    R.timber.box(0.1, 2.2, 0.1, -16, gy(-16, -96) - 0.05, -96, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'y' });
    R.glow.box(0.3, 0.3, 0.3, -16, lp.y - 0.1, -96, 0xffffff, { jit: 0 });
  }

  /* ---------------- Fences and haystacks ---------------- */
  {
    const R = region('village');
    const rnd: Rnd = mulberry32(6400);
    const fenceRun = (pts: [number, number][]) => {
      fence(R, rnd, pts, gy);
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i]!;
        const [bx, bz] = pts[i + 1]!;
        colliders.box('fence', (ax + bx) / 2, (az + bz) / 2, 0.12, Math.hypot(bx - ax, bz - az) / 2, Math.atan2(bx - ax, bz - az));
      }
    };
    for (const f of FIELDS) {
      const c = Math.cos(f.yaw);
      const s = Math.sin(f.yaw);
      const corner = (lx: number, lz: number): [number, number] => [f.x + lx * c + lz * s, f.z - lx * s + lz * c];
      const hw = f.w / 2 + 0.8;
      const hd = f.d / 2 + 0.8;
      fenceRun([corner(-hw, -hd), corner(hw, -hd)]);
      fenceRun([corner(-hw, hd), corner(hw, hd)]);
      fenceRun([corner(-hw, -hd), corner(-hw, hd)]);
    }
    for (const [x, z] of [[-24, 56], [16, 72], [46, 68]] as const) {
      const y = gy(x, z);
      R.thatch.lathe([1.2, 0, 1.3, 0.6, 1.1, 1.3, 0.8, 1.7, 0.4, 2.1, 0.05, 2.35], 9, x, y - 0.05, z, jitterTone(TINT.thatch, rnd, 0.12), { jit: 0.1, amp: 0.16 });
      colliders.circle('hay', x, z, 1.2);
    }
  }

  /* ---------------- Ford and side path ---------------- */
  {
    const R = region('quarry');
    const rnd: Rnd = mulberry32(6500);
    const x = 92;
    const z = 40;
    const y = gy(x, z);
    for (let i = 0; i < 6; i++) fieldstone(R, rnd, x - 2.9 + i * 1.15, y - 0.1, z - 2.3, 0.6 + rnd() * 0.3, 0.5 + rnd() * 0.5, 0.36);
    colliders.box('ruin_wall', x, z - 2.3, 4, 0.4, 0);
    const by = gy(BORDER_SIGN.x, BORDER_SIGN.z);
    R.timber.box(0.13, 2.3, 0.13, BORDER_SIGN.x, by - 0.1, BORDER_SIGN.z, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'y', rz: 0.03 });
    for (let i = 0; i < 3; i++) R.planks.box(1.5, 0.3, 0.06, BORDER_SIGN.x, by + 1.35 + i * 0.36, BORDER_SIGN.z + 0.05, jitterTone(TINT.wood, rnd, 0.14), { ry: i * 0.3 - 0.3, jit: 0.12, grain: 'x' });
    colliders.circle('border_sign', BORDER_SIGN.x, BORDER_SIGN.z, 0.4);
  }

  /* ---------------- Benches, barrels, crates ---------------- */
  {
    const R = region('village');
    const rnd: Rnd = mulberry32(6600);
    for (const [x, z, yaw] of [[-9, 35.6, 0], [44, 32.4, 1.0], [10, 17, 0.2]] as const) benchSet(R, rnd, x, gy(x, z), z, yaw);
    const barrels: [number, number][] = [[-16.5, 2.4], [16.4, 21], [-136.5, 31.5], [88, -13], [-14.4, -3]];
    for (const [x, z] of barrels) {
      barrel(R, rnd, x, gy(x, z) - 0.02, z, 1);
      colliders.circle('barrel', x, z, 0.5);
    }
    const ky = gy(15, 20.5);
    R.planks.box(1.0, 0.75, 0.6, 15, ky, 20.5, jitterTone(TINT.wood, rnd, 0.1), { jit: 0.1, grain: 'x' });
    R.metal.box(0.5, 0.06, 0.16, 15, ky + 0.78, 20.5, 0x8a7a3a, { jit: 0.1 });
    R.timber.box(0.06, 1.3, 0.06, 15.4, ky + 0.75, 20.5, 0xc2b07a, { jit: 0.05 });
    colliders.box('kit_table', 15, 20.5, 0.55, 0.35, 0);
    cart(R, rnd, 21, gy(21, 24), 24, 0.7);
    sack(R, rnd, -3, gy(-3, 12.5), 12.5, 1);
    for (const [x, z] of [[-14.4, -3], [-136.5, 31.5]] as const) void x, void z;
  }

  /* ---------------- Schedule board (rotation) and contract guard post ---------------- */
  const scheduleBoard = new THREE.Group();
  {
    const tex = makeTextTexture(384, 256, (ctx, w, h) => {
      drawNotice(ctx, w, h, 'WATER ROTATION', []);
      ctx.fillStyle = '#2a1d12';
      ctx.font = '22px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText('Day   — Mill & households', 28, 100);
      ctx.fillText('Night — Quarry', 28, 140);
      ctx.font = 'italic 17px Georgia, serif';
      ctx.fillText('Witnessed: reeve · foreman · waterkeeper', 28, 190);
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, color: 0xbdbdbd }));
    plane.position.set(0, 1.9, 0);
    scheduleBoard.add(plane);
    const post = dyn('schedule-posts', (D) => {
      for (const sx of [-0.7, 0.7]) D.timber.box(0.12, 2.4, 0.12, sx, 0, 0, jitterTone(TINT.woodDark, rng, 0.1), { grain: 'y' });
    });
    group.remove(post);
    scheduleBoard.add(post);
    scheduleBoard.position.set(-0.5, gy(-0.5, 14), 14);
    scheduleBoard.rotation.y = Math.PI + 0.25;
    scheduleBoard.visible = false;
    group.add(scheduleBoard);
  }
  const contractGuardPost = new THREE.Group();
  {
    const y = gy(1.0, -63);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), new THREE.MeshBasicMaterial({ color: 0x6c2d25, side: THREE.DoubleSide }));
    flag.position.set(0, 2.6, 0);
    const pole = dyn('guard-pole', (D) => D.timber.box(0.1, 3.3, 0.1, 0, 0, 0, jitterTone(TINT.woodDark, rng, 0.1), { grain: 'y' }));
    group.remove(pole);
    contractGuardPost.add(pole, flag);
    contractGuardPost.position.set(1.0, y, -63);
    contractGuardPost.visible = false;
    group.add(contractGuardPost);
  }

  /* ---------------- Pickups ---------------- */
  const pickups: Record<string, THREE.Object3D> = {};
  for (const pk of PICKUP_LOCATIONS) {
    const y = gy(pk.x, pk.z);
    const rnd: Rnd = mulberry32(Math.floor(hash3(pk.x, pk.z, 3) * 1e9));
    const g = dyn(`pickup-${pk.id}`, (D) => {
      if (pk.id === 'quarry_brace') {
        D.timber.rod(0, 0.05, 0, 0.5, 1.6, 0.1, 0.11, 6, jitterTone(0xd8b98a, rnd, 0.1), { jit: 0.1 });
        D.timber.rod(0.35, 0.05, 0.05, -0.5, 1.2, 0.1, 0.1, 6, jitterTone(0xd8b98a, rnd, 0.1), { jit: 0.1 });
        D.metal.box(0.3, 0.07, 0.3, 0.2, 0.7, 0.08, TINT.iron, { jit: 0.05 });
      } else if (pk.id === 'quarry_wrench') {
        D.metal.rod(0, 0.1, 0, 0.75, 0.42, 0, 0.045, 5, TINT.iron, { jit: 0.06 });
        D.metal.lathe([0.16, -0.03, 0.2, 0, 0.16, 0.03], 8, 0.78, 0.44, 0, TINT.iron, { jit: 0.06, rx: Math.PI / 2 });
      } else {
        D.planks.box(0.9, 0.5, 0.6, 0, 0, 0, jitterTone(TINT.wood, rnd, 0.14), { jit: 0.1, grain: 'x' });
        D.timber.box(0.95, 0.14, 0.65, 0, 0.5, 0, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.1, grain: 'x' });
        D.metal.box(0.1, 0.16, 0.66, 0, 0.42, 0, TINT.iron, { jit: 0.05 });
      }
    });
    g.position.set(pk.x, y, pk.z);
    pickups[pk.id] = g;
  }

  /* ---------------- Merge the regions ---------------- */
  for (const R of regions.values()) group.add(R.toGroup(mats, { isStatic: true, shadows: true }));

  const setNight = (n: number) => {
    const c = new THREE.Color(0x30302a).lerp(new THREE.Color(0xffb85a), Math.min(1, n * 1.2));
    mats.windowMat.color.copy(c);
    mats.lanternMat.color.copy(c);
  };
  setNight(0);
  const lampWorld = lh.lampWorld.clone();
  return {
    group,
    windowMat: mats.windowMat,
    lanternMat: mats.lanternMat,
    lanternPositions,
    millWheel,
    bell,
    bellPos,
    archiveDoor,
    archiveShutter,
    shortcutGate,
    shortcutLever,
    sluiceGate,
    sluiceBrace,
    sluiceCracks,
    sluiceWheel,
    noticeboardMat,
    noticeCanvasSetter,
    scheduleBoard,
    contractGuardPost,
    pickups,
    ledger,
    riteBowl,
    dustEmitters,
    quarryBanner,
    lighthouse: { beam, lamp: lampWorld, light: beamLight },
    setNight,
    update(dt: number, _time: number, night: number) {
      // The beam turns once every eight seconds and shows only after dusk.
      const on = night > 0.35;
      beam.visible = on;
      beamLight.intensity = on ? 26 * Math.min(1, (night - 0.35) * 2) : 0;
      if (on) beam.rotation.y += dt * 0.78;
    },
    dispose() {
      mats.dispose();
    },
  };
}
