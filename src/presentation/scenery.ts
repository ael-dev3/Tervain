import * as THREE from 'three';
import type { Colliders } from '../world/colliders';
import {
  ARCHIVE_SHUTTER,
  BELL_TOWER,
  BORDER_SIGN,
  BUILDINGS,
  DECKS,
  FIELDS,
  LANTERNS,
  LEDGER,
  MILL_WHEEL,
  PICKUP_LOCATIONS,
  RITE_ALTAR,
  SHORTCUT,
  SLUICE,
  WAGON,
  WELL,
  bySpec,
  type BuildingSpec,
} from '../world/layout';
import { mulberry32 } from '../world/noise';
import type { Terrain } from '../world/terrain';
import { Kit, PAL, makeStdMaterial, paint, transform } from './kit';

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

export function drawNotice(ctx: CanvasRenderingContext2D, w: number, h: number, title: string, lines: string[]) {
  ctx.fillStyle = '#6f5237';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e6dcc0';
  ctx.fillRect(10, 10, w - 20, h - 20);
  ctx.fillStyle = '#3a2c1c';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 44);
  ctx.textAlign = 'left';
  ctx.font = '19px Georgia, serif';
  let y = 78;
  for (const l of lines) {
    ctx.fillStyle = '#8a3a30';
    ctx.fillText('•', 24, y);
    ctx.fillStyle = '#3a2c1c';
    y = wrapText(ctx, l, 42, y, w - 70, 24) + 6;
    if (y > h - 20) break;
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
  setNight(n: number): void;
}

const gableColor = (b: BuildingSpec) =>
  b.kind === 'shrine' || b.kind === 'archive' || b.kind === 'hut'
    ? PAL.slate
    : b.kind === 'office' || b.kind === 'bunks' || b.kind === 'lodge'
      ? PAL.timberDark
      : b.kind === 'house'
        ? PAL.thatch
        : PAL.tile;

const wallColor = (b: BuildingSpec) => (b.wall === 'stone' ? PAL.limestone : b.wall === 'timber' ? PAL.timber : b.kind === 'inn' ? PAL.plasterWarm : PAL.plaster);

function localToWorld(b: BuildingSpec, lx: number, lz: number) {
  const c = Math.cos(b.yaw);
  const s = Math.sin(b.yaw);
  return { x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c };
}

export function buildScenery(terrain: Terrain, colliders: Colliders): SceneryHandles {
  const group = new THREE.Group();
  const kit = new Kit();
  const rng = mulberry32(909);
  const lanternPositions: THREE.Vector3[] = [];

  const groundOf = (b: BuildingSpec) => {
    let lo = Infinity;
    let sum = 0;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const p = localToWorld(b, (sx * b.w) / 2, (sz * b.d) / 2);
      const h = terrain.heightAt(p.x, p.z);
      lo = Math.min(lo, h);
      sum += h;
    }
    return { avg: sum / 4, lo };
  };

  /* ---------------- Buildings ---------------- */
  const addStandardBuilding = (b: BuildingSpec) => {
    const { avg, lo } = groundOf(b);
    const y0 = avg;
    const plinthH = 0.45 + (avg - lo);
    const wc = wallColor(b);
    const put = (lx: number, lz: number) => localToWorld(b, lx, lz);
    // plinth and walls
    let p = put(0, 0);
    kit.box(b.w + 0.3, plinthH, b.d + 0.3, p.x, y0 - (avg - lo) - 0.05, p.z, PAL.rockA, b.yaw);
    kit.box(b.w, b.h, b.d, p.x, y0 + 0.4, p.z, wc, b.yaw, 0, 0, 1.4);
    // timber frame: corner posts and a mid rail
    if (b.wall !== 'stone') {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        p = put((sx * b.w) / 2, (sz * b.d) / 2);
        kit.box(0.24, b.h, 0.24, p.x, y0 + 0.4, p.z, PAL.timberDark, b.yaw);
      }
      p = put(0, b.d / 2 + 0.02);
      kit.box(b.w, 0.16, 0.12, p.x, y0 + 0.4 + b.h * 0.55, p.z, PAL.timberDark, b.yaw);
    } else {
      for (const sx of [-1, 1]) {
        p = put((sx * b.w) / 2, b.d / 2);
        kit.box(0.34, b.h, 0.34, p.x, y0 + 0.4, p.z, PAL.rockA, b.yaw);
      }
    }
    // roof
    const rise = Math.min(b.d * 0.46, 2.4);
    p = put(0, 0);
    if (b.roof === 'hip') kit.pyramid(b.w + 1.4, b.d + 1.4, rise + 1.2, p.x, y0 + 0.4 + b.h, p.z, gableColor(b), b.yaw);
    else if (b.roof === 'lean') {
      const q = put(0, 0);
      kit.slab(b.w + 0.9, 0.22, b.d + 1.1, q.x, y0 + 0.4 + b.h + 0.5, q.z, gableColor(b), b.yaw, 0.16);
    } else {
      kit.gable(b.w + 1.0, b.d + 1.0, rise, p.x, y0 + 0.4 + b.h, p.z, gableColor(b), b.yaw);
      kit.gable(b.w + 1.05, b.d + 1.05, rise * 0.92, p.x, y0 + 0.4 + b.h - 0.08, p.z, PAL.timberDark, b.yaw);
    }
    // door with frame and step
    p = put(0, b.d / 2 + 0.06);
    kit.box(1.5, 2.3, 0.14, p.x, y0 + 0.4, p.z, PAL.timberDark, b.yaw);
    p = put(0, b.d / 2 + 0.12);
    kit.box(1.1, 2.05, 0.1, p.x, y0 + 0.4, p.z, PAL.timber, b.yaw);
    p = put(0, b.d / 2 + 0.7);
    kit.box(1.9, 0.18, 0.9, p.x, y0 + 0.3, p.z, PAL.rockA, b.yaw);
    // windows (glow at night)
    const wins: [number, number, number][] = [];
    const nW = Math.max(1, Math.floor(b.w / 3.2));
    for (let i = 0; i < nW; i++) {
      const lx = -b.w / 2 + ((i + 1) * b.w) / (nW + 1);
      if (Math.abs(lx) < 1.3) continue;
      wins.push([lx, b.d / 2 + 0.03, 0]);
    }
    wins.push([b.w / 2 + 0.03, 0, 1], [-b.w / 2 - 0.03, 0, 1]);
    for (const [lx, lz, side] of wins) {
      const wp = put(lx, lz);
      const yy = y0 + 0.4 + b.h * 0.5;
      if (side === 0) {
        kit.box(0.9, 0.9, 0.1, wp.x, yy, wp.z, PAL.timberDark, b.yaw);
        kit.glow(0.72, 0.72, 0.06, wp.x, yy + 0.09, wp.z, b.yaw);
      } else {
        kit.box(0.1, 0.9, 0.9, wp.x, yy, wp.z, PAL.timberDark, b.yaw);
        kit.glow(0.06, 0.72, 0.72, wp.x, yy + 0.09, wp.z, b.yaw);
      }
    }
    // chimney on houses
    if (b.kind !== 'hut' && b.kind !== 'lodge' && b.kind !== 'office' && b.kind !== 'bunks' && b.kind !== 'shrine') {
      p = put(b.w * 0.28, -b.d * 0.15);
      kit.box(0.7, rise + 1.4, 0.7, p.x, y0 + 0.4 + b.h - 0.3, p.z, PAL.rockB, b.yaw);
    }
    // stacked firewood by the door on houses (human-scale detail)
    if (b.kind === 'house' || b.kind === 'reeve') {
      p = put(b.w / 2 - 0.5, b.d / 2 + 0.55);
      for (let i = 0; i < 3; i++) kit.cyl(0.13, 0.13, 1.1, 6, p.x, y0 + 0.4 + i * 0.24, p.z, PAL.timber, b.yaw, 0, Math.PI / 2);
    }
    // lantern by the door
    const lp = put(b.w * 0.36, b.d / 2 + 0.3);
    lanternPositions.push(new THREE.Vector3(lp.x, y0 + 2.1, lp.z));
    kit.box(0.1, 2.2, 0.1, lp.x, y0, lp.z, PAL.timberDark);
    kit.glow(0.3, 0.3, 0.3, lp.x, y0 + 2.05, lp.z);
  };

  for (const b of BUILDINGS) {
    if (b.kind === 'archive' || b.kind === 'shrine') continue;
    addStandardBuilding(b);
  }

  /* Signs for the inn and bakery */
  const inn = bySpec('inn');
  {
    const g = groundOf(inn);
    const p = localToWorld(inn, inn.w / 2 - 1, inn.d / 2 + 1.2);
    kit.box(0.14, 2.6, 0.14, p.x, g.avg, p.z, PAL.timberDark);
    kit.box(1.1, 0.55, 0.1, p.x, g.avg + 2.0, p.z, PAL.marcherRed, inn.yaw);
  }

  /* ---------------- Shrine hall (stone, hip roof, colonnade) ---------------- */
  const hall = bySpec('shrine_hall');
  {
    const { avg } = groundOf(hall);
    const y0 = avg;
    kit.box(hall.w + 1.2, 0.7, hall.d + 1.2, hall.x, y0 - 0.2, hall.z, PAL.rockA);
    kit.box(hall.w, hall.h, hall.d, hall.x, y0 + 0.5, hall.z, PAL.limestone, 0, 0, 0, 1.3);
    kit.pyramid(hall.w + 1.8, hall.d + 1.8, 3.4, hall.x, y0 + 0.5 + hall.h, hall.z, PAL.slate);
    kit.pyramid(hall.w * 0.4, hall.d * 0.4, 1.6, hall.x, y0 + 0.5 + hall.h + 3.2, hall.z, PAL.templarBlue);
    // colonnade
    for (let i = -3; i <= 3; i++) {
      const cx = hall.x + (i * (hall.w - 1.5)) / 6;
      kit.cyl(0.32, 0.36, hall.h - 0.4, 8, cx, y0 + 0.5, hall.z + hall.d / 2 + 0.8, PAL.limestone);
      colliders.circle('shrine_col', cx, hall.z + hall.d / 2 + 0.8, 0.36);
    }
    kit.box(hall.w + 0.6, 0.35, 1.8, hall.x, y0 + 0.5 + hall.h - 0.4, hall.z + hall.d / 2 + 0.8, PAL.rockA);
    kit.box(2.0, 3.2, 0.14, hall.x, y0 + 0.5, hall.z + hall.d / 2 + 0.06, PAL.timberDark);
    for (const dx of [-3.4, 3.4]) {
      kit.box(0.9, 1.4, 0.12, hall.x + dx, y0 + 2.4, hall.z + hall.d / 2 + 0.05, PAL.timberDark);
      kit.glow(0.62, 1.1, 0.06, hall.x + dx, y0 + 2.5, hall.z + hall.d / 2 + 0.09);
    }
    // steps
    for (let i = 0; i < 3; i++) kit.box(4.2 - i * 0.3, 0.2, 1.0, hall.x, y0 - 0.1 + i * 0.05, hall.z + hall.d / 2 + 2.3 + i * 0.7, PAL.rockA);
    // stone shrine steps built from quarry stone (interdependence detail)
    const banner = makeTextTexture(256, 384, (ctx, w, h) => {
      ctx.fillStyle = '#5a6f8a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#d9c98a';
      ctx.fillRect(0, 0, w, 14);
      ctx.fillRect(0, h - 14, w, 14);
      drawTemplarMark(ctx, w / 2, h / 2 - 10, 90, '#e6dcb0');
    });
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.1), new THREE.MeshBasicMaterial({ map: banner, side: THREE.DoubleSide }));
    bm.position.set(hall.x - 6.2, y0 + 3.6, hall.z + hall.d / 2 + 1.4);
    group.add(bm);
    kit.box(0.12, 3.4, 0.12, hall.x - 7.0, y0, hall.z + hall.d / 2 + 1.4, PAL.timberDark);
    kit.box(0.12, 3.4, 0.12, hall.x - 5.4, y0, hall.z + hall.d / 2 + 1.4, PAL.timberDark);
    const lp = new THREE.Vector3(hall.x + 6.4, y0 + 2.2, hall.z + hall.d / 2 + 1.6);
    lanternPositions.push(lp);
    kit.box(0.1, 2.3, 0.1, lp.x, y0, lp.z, PAL.timberDark);
    kit.glow(0.3, 0.3, 0.3, lp.x, y0 + 2.2, lp.z);
  }

  /* ---------------- Archive (enterable room) ---------------- */
  const arch = bySpec('archive');
  const archY = groundOf(arch).avg;
  let archiveDoor!: THREE.Object3D;
  let archiveShutter!: THREE.Object3D;
  let ledger!: THREE.Object3D;
  {
    const hw = arch.w / 2;
    const hd = arch.d / 2;
    const t = 0.3;
    const y0 = archY;
    const seg = (lx0: number, lx1: number, lz0: number, lz1: number, color = PAL.limestone) => {
      const p = localToWorld(arch, (lx0 + lx1) / 2, (lz0 + lz1) / 2);
      kit.box(lx1 - lx0, arch.h, lz1 - lz0, p.x, y0 + 0.2, p.z, color, arch.yaw, 0, 0, 1.3);
    };
    const gap = 1.0;
    seg(-hw, -gap, hd - t, hd + t);
    seg(gap, hw, hd - t, hd + t);
    seg(-hw, -gap * 0.8, -hd - t, -hd + t);
    seg(gap * 0.8, hw, -hd - t, -hd + t);
    seg(-hw - t, -hw + t, -hd, hd);
    seg(hw - t, hw + t, -hd, hd);
    // lintel over the door and a low sill under the shutter
    let p = localToWorld(arch, 0, hd);
    kit.box(gap * 2 + 0.2, 0.7, t * 2, p.x, y0 + 0.2 + arch.h - 0.7, p.z, PAL.limestone, arch.yaw);
    p = localToWorld(arch, 0, -hd);
    kit.box(gap * 1.6, 0.5, t * 2, p.x, y0 + 0.2, p.z, PAL.rockA, arch.yaw);
    kit.box(gap * 1.6, 0.6, t * 2, p.x, y0 + 0.2 + arch.h - 0.6, p.z, PAL.limestone, arch.yaw);
    // floor and roof
    p = localToWorld(arch, 0, 0);
    kit.box(arch.w - 0.4, 0.14, arch.d - 0.4, p.x, y0 + 0.1, p.z, PAL.timberDark, arch.yaw);
    kit.gable(arch.w + 1.0, arch.d + 1.0, 2.0, p.x, y0 + 0.2 + arch.h, p.z, PAL.slate, arch.yaw);
    // shelves along the west wall, a desk and the ledger
    for (let i = 0; i < 3; i++) {
      p = localToWorld(arch, -hw + 0.55, -1.6 + i * 1.6);
      kit.box(0.6, 2.2, 1.3, p.x, y0 + 0.2, p.z, PAL.timber, arch.yaw);
      for (let k = 0; k < 4; k++) kit.box(0.4, 0.28, 1.0, p.x, y0 + 0.5 + k * 0.5, p.z, k % 2 ? PAL.cloth : PAL.tileDark, arch.yaw);
    }
    p = localToWorld(arch, 0, -1.9);
    kit.box(1.9, 0.9, 1.0, p.x, y0 + 0.2, p.z, PAL.timber, arch.yaw);
    kit.glow(0.2, 0.3, 0.2, p.x + 0.6, y0 + 1.1, p.z);
    // Ledger book, glowing faintly so it can be found.
    ledger = new THREE.Group();
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.4), new THREE.MeshStandardMaterial({ color: 0x7a3a2a, roughness: 0.8 }));
    ledger.add(book);
    ledger.position.set(LEDGER.x, y0 + 1.16, LEDGER.z + 0.6);
    group.add(ledger);
    // interior lamp
    lanternPositions.push(new THREE.Vector3(arch.x, y0 + 2.4, arch.z));
    // door leaf: hinged at the west side of the opening
    const doorPivot = new THREE.Group();
    const dp = localToWorld(arch, -gap, hd);
    doorPivot.position.set(dp.x, y0 + 0.2, dp.z);
    doorPivot.rotation.y = arch.yaw;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(gap * 2, 2.5, 0.16), new THREE.MeshStandardMaterial({ color: PAL.timber, roughness: 0.9 }));
    leaf.position.set(gap, 1.25, 0);
    doorPivot.add(leaf);
    group.add(doorPivot);
    archiveDoor = doorPivot;
    // shutter: hinged at the top, swings outward
    const shutterPivot = new THREE.Group();
    const sp = localToWorld(arch, 0, -hd - t);
    shutterPivot.position.set(sp.x, y0 + 0.2 + arch.h - 0.65, sp.z);
    shutterPivot.rotation.y = arch.yaw;
    const sh = new THREE.Mesh(new THREE.BoxGeometry(gap * 1.6, 1.9, 0.1), new THREE.MeshStandardMaterial({ color: PAL.timberDark, roughness: 0.9 }));
    sh.position.set(0, -0.95, -0.02);
    shutterPivot.add(sh);
    group.add(shutterPivot);
    archiveShutter = shutterPivot;
    void ARCHIVE_SHUTTER;
  }

  /* ---------------- Village props ---------------- */
  // Bell tower
  const bell = new THREE.Group();
  const bellPos = new THREE.Vector3(BELL_TOWER.x, terrain.heightAt(BELL_TOWER.x, BELL_TOWER.z), BELL_TOWER.z);
  {
    const y0 = bellPos.y;
    for (const dx of [-1.1, 1.1]) for (const dz of [-1.1, 1.1]) kit.box(0.28, 4.4, 0.28, BELL_TOWER.x + dx, y0, BELL_TOWER.z + dz, PAL.timber);
    kit.box(2.9, 0.2, 2.9, BELL_TOWER.x, y0 + 4.2, BELL_TOWER.z, PAL.timberDark);
    kit.box(2.6, 0.18, 0.18, BELL_TOWER.x, y0 + 3.5, BELL_TOWER.z, PAL.timberDark);
    kit.pyramid(3.6, 3.6, 1.7, BELL_TOWER.x, y0 + 4.4, BELL_TOWER.z, PAL.tile);
    kit.box(3.2, 0.35, 3.2, BELL_TOWER.x, y0 - 0.1, BELL_TOWER.z, PAL.rockA);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.6, 0.85, 10), new THREE.MeshStandardMaterial({ color: 0xa88a3a, roughness: 0.5, metalness: 0.5 }));
    body.position.y = -0.45;
    bell.add(body);
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: 0x40403f }));
    clapper.position.y = -0.9;
    bell.add(clapper);
    bell.position.set(BELL_TOWER.x, y0 + 3.5, BELL_TOWER.z);
    group.add(bell);
  }

  // Noticeboard
  const nbCanvas = document.createElement('canvas');
  nbCanvas.width = 512;
  nbCanvas.height = 360;
  const nbTex = new THREE.CanvasTexture(nbCanvas);
  nbTex.colorSpace = THREE.SRGBColorSpace;
  const noticeboardMat = new THREE.MeshBasicMaterial({ map: nbTex });
  const noticeCanvasSetter = (title: string, lines: string[]) => {
    const ctx = nbCanvas.getContext('2d')!;
    drawNotice(ctx, 512, 360, title, lines);
    nbTex.needsUpdate = true;
  };
  {
    // The board faces north toward the square, so people arriving from the bell tower read it head-on.
    const nx = 5;
    const nz = 15.4;
    const y0 = terrain.heightAt(nx, nz);
    kit.box(0.16, 2.6, 0.16, nx - 1.25, y0, nz, PAL.timberDark);
    kit.box(0.16, 2.6, 0.16, nx + 1.25, y0, nz, PAL.timberDark);
    kit.box(3.0, 0.14, 0.24, nx, y0 + 2.5, nz, PAL.timberDark);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.68), noticeboardMat);
    board.position.set(nx, y0 + 1.6, nz - 0.14);
    board.rotation.y = Math.PI;
    group.add(board);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.68), new THREE.MeshStandardMaterial({ color: PAL.timberDark }));
    back.position.set(nx, y0 + 1.6, nz - 0.11);
    group.add(back);
    colliders.box('noticeboard', nx, nz, 1.4, 0.3, 0);
  }

  // Well
  {
    const y0 = terrain.heightAt(WELL.x, WELL.z);
    kit.cyl(1.25, 1.35, 0.95, 10, WELL.x, y0, WELL.z, PAL.rockA);
    kit.cyl(0.95, 0.95, 0.06, 10, WELL.x, y0 + 0.9, WELL.z, PAL.waterDeep);
    for (const dx of [-1.05, 1.05]) kit.box(0.14, 2.2, 0.14, WELL.x + dx, y0 + 0.5, WELL.z, PAL.timber);
    kit.box(2.6, 0.14, 0.14, WELL.x, y0 + 2.6, WELL.z, PAL.timber);
    kit.gable(2.9, 1.9, 0.7, WELL.x, y0 + 2.7, WELL.z, PAL.thatch, Math.PI / 2);
  }

  // Mill wheel
  const millWheel = new THREE.Group();
  {
    const y = terrain.heightAt(MILL_WHEEL.x, MILL_WHEEL.z) + 1.7;
    const spokes = 10;
    const mat = new THREE.MeshStandardMaterial({ color: PAL.timber, roughness: 0.9, flatShading: true });
    const paddleMat = new THREE.MeshStandardMaterial({ color: PAL.timberDark, roughness: 0.9, flatShading: true });
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.14), mat);
      spoke.position.set(0, Math.cos(a) * 1.25, Math.sin(a) * 1.25);
      spoke.rotation.x = -a;
      millWheel.add(spoke);
      const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 1.0), paddleMat);
      paddle.position.set(0, Math.cos(a) * 2.5, Math.sin(a) * 2.5);
      paddle.rotation.x = -a;
      millWheel.add(paddle);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 8), mat);
    hub.rotation.z = Math.PI / 2;
    millWheel.add(hub);
    millWheel.position.set(MILL_WHEEL.x, y, MILL_WHEEL.z);
    millWheel.traverse((o) => {
      o.castShadow = true;
    });
    group.add(millWheel);
  }

  /* ---------------- Sluice ---------------- */
  const sluiceGate = new THREE.Group();
  const sluiceBrace = new THREE.Group();
  const sluiceCracks = new THREE.Group();
  const sluiceWheel = new THREE.Group();
  {
    const gx = SLUICE.gateCenter.x;
    const gz = SLUICE.gateCenter.z;
    const bed = terrain.heightAt(gx, gz);
    const top = bed + 3.2;
    const stone = (x: number, z: number, w: number, h: number, d: number, y: number, c: number = PAL.limestone) => kit.box(w, h, d, x, y, z, c, 0, 0, 0, 1.6);
    // Abutments on either bank
    stone(gx - 4.0, gz, 2.4, 3.6, 2.6, bed - 0.9);
    stone(gx + 4.0, gz, 2.4, 3.6, 2.6, bed - 0.9);
    stone(gx - 4.0, gz, 2.7, 0.35, 2.9, bed + 2.7, PAL.rockA);
    stone(gx + 4.0, gz, 2.7, 0.35, 2.9, bed + 2.7, PAL.rockA);
    // Crossbeam and gate frame
    kit.box(8.2, 0.36, 0.5, gx, top - 0.1, gz, PAL.timberDark);
    kit.box(0.3, 3.3, 0.45, gx - 2.5, bed - 0.2, gz, PAL.timber);
    kit.box(0.3, 3.3, 0.45, gx + 2.5, bed - 0.2, gz, PAL.timber);
    // Gate leaf (dynamic)
    const leafMat = new THREE.MeshStandardMaterial({ color: PAL.timber, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 5; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.98, 2.2, 0.16), leafMat);
      plank.position.set(-2 + i, 0, 0);
      plank.castShadow = true;
      sluiceGate.add(plank);
    }
    sluiceGate.position.set(gx, bed + 1.55, gz);
    group.add(sluiceGate);
    // Cracks in the west support (dynamic group; removed visually once braced)
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x1e1a16 });
    for (const [dx, dy, rz, len] of [[0.0, 0.6, 0.5, 1.4], [0.15, 1.3, -0.3, 1.0], [-0.1, 2.0, 0.7, 0.8]] as const) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, len, 0.06), crackMat);
      c.position.set(gx - 4.0 + 1.24, bed + dy + 0.3, gz + dx + 0.35);
      c.rotation.z = rz;
      sluiceCracks.add(c);
    }
    sluiceCracks.position.set(0.0, 0, 0);
    group.add(sluiceCracks);
    // Timber brace (visible once stabilized)
    const braceMat = new THREE.MeshStandardMaterial({ color: 0x9a7a4a, roughness: 0.85, flatShading: true });
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.4, 0.28), braceMat);
    b1.position.set(gx - 2.6, bed + 1.5, gz + 1.3);
    b1.rotation.z = 0.55;
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), braceMat);
    b2.position.set(gx - 3.1, bed + 0.7, gz + 1.45);
    b2.rotation.z = -0.1;
    sluiceBrace.add(b1, b2);
    sluiceBrace.visible = false;
    group.add(sluiceBrace);
    // Control wheel and lever on the bank (interaction target)
    const wheelMat = new THREE.MeshStandardMaterial({ color: PAL.iron, roughness: 0.6, metalness: 0.4, flatShading: true });
    const wy = terrain.heightAt(SLUICE.control.x, SLUICE.control.z);
    kit.box(0.5, 1.1, 0.5, SLUICE.control.x, wy, SLUICE.control.z, PAL.rockA);
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), wheelMat);
      spoke.rotation.y = (i / 4) * Math.PI;
      sluiceWheel.add(spoke);
    }
    sluiceWheel.position.set(SLUICE.control.x, wy + 1.2, SLUICE.control.z);
    group.add(sluiceWheel);
    // Inspection log on the hut wall
    const hut = bySpec('sluice_hut');
    const lp = localToWorld(hut, hut.w / 2 - 0.4, hut.d / 2 + 0.05);
    kit.box(0.6, 0.8, 0.05, lp.x, terrain.heightAt(hut.x, hut.z) + 1.4, lp.z, PAL.cloth, hut.yaw);
    void top;
  }

  /* ---------------- Footbridge ---------------- */
  for (const d of DECKS) {
    kit.box(d.hx * 2, 0.16, d.hz * 2, d.x, d.y - 0.16, d.z, PAL.timber, d.yaw);
    for (let i = -Math.floor(d.hx); i <= Math.floor(d.hx); i += 1) kit.box(0.1, 0.06, d.hz * 2 - 0.1, d.x + i, d.y - 0.02, d.z, PAL.timberDark, d.yaw);
    for (const sz of [-1, 1]) {
      kit.box(d.hx * 2 - 0.8, 0.1, 0.12, d.x, d.y + 0.9, d.z + sz * (d.hz + 0.05), PAL.timberDark, d.yaw);
      for (let i = -Math.floor(d.hx - 0.6); i <= Math.floor(d.hx - 0.6); i += 2) kit.box(0.14, 1.0, 0.14, d.x + i, d.y, d.z + sz * (d.hz + 0.05), PAL.timberDark, d.yaw);
    }
    kit.box(0.5, 2.6, 0.5, d.x - d.hx + 0.2, d.y - 2.3, d.z + d.hz - 0.2, PAL.timberDark);
    kit.box(0.5, 2.6, 0.5, d.x + d.hx - 0.2, d.y - 2.3, d.z - d.hz + 0.2, PAL.timberDark);
  }

  /* ---------------- Overlook wagon and lodge ---------------- */
  {
    const y0 = terrain.heightAt(WAGON.x, WAGON.z);
    kit.box(5.2, 0.4, 2.6, WAGON.x, y0 + 0.8, WAGON.z, PAL.timber, WAGON.yaw);
    kit.box(5.2, 0.6, 0.14, WAGON.x, y0 + 1.2, WAGON.z, PAL.timberDark, WAGON.yaw);
    for (const [dx, dz] of [[-1.7, 1.3], [1.7, 1.3], [-1.7, -1.3], [1.7, -1.3]] as const) {
      const c = Math.cos(WAGON.yaw);
      const s = Math.sin(WAGON.yaw);
      kit.cyl(0.62, 0.62, 0.14, 12, WAGON.x + dx * c + dz * s, y0 + 0.62, WAGON.z - dx * s + dz * c, PAL.timberDark, WAGON.yaw, Math.PI / 2, 0);
    }
    kit.gable(4.6, 2.4, 1.4, WAGON.x, y0 + 1.4, WAGON.z, PAL.cloth, WAGON.yaw);
    for (let i = 0; i < 4; i++) kit.cyl(0.25, 0.25, 0.5, 8, WAGON.x + 1.2 + i * 0.3, y0 + 0.2, WAGON.z + 2.4 + (i % 2) * 0.4, PAL.timber);
    lanternPositions.push(new THREE.Vector3(WAGON.x + 2.6, y0 + 2.2, WAGON.z + 1.6));
    kit.box(0.1, 2.1, 0.1, WAGON.x + 2.6, y0, WAGON.z + 1.6, PAL.timberDark);
    kit.glow(0.3, 0.3, 0.3, WAGON.x + 2.6, y0 + 2.0, WAGON.z + 1.6);
  }

  /* ---------------- Quarry ---------------- */
  const dustEmitters: THREE.Vector3[] = [];
  const quarryBanner = new THREE.Group();
  {
    // Cut face: stepped stone blocks against the hillside
    const rr = mulberry32(31);
    for (let i = 0; i < 14; i++) {
      const bx = 100 + rr() * 12;
      const bz = -36 + rr() * 22;
      const bw = 3 + rr() * 3.5;
      const bh = 1.6 + rr() * 2.6;
      const y = terrain.heightAt(bx, bz);
      kit.box(bw, bh, 2 + rr() * 2.5, bx, y - 0.4, bz, i % 3 ? PAL.limestone : PAL.rockA, rr() * 0.5, 0, 0, 1.8);
      colliders.box(`face:${i}`, bx, bz, bw / 2, 1.5, 0);
    }
    dustEmitters.push(new THREE.Vector3(99, terrain.heightAt(99, -29) + 1.2, -29), new THREE.Vector3(100, terrain.heightAt(100, -22) + 1, -22));
    // Stacked cut blocks by the yard (colliders match colliders.ts)
    const stacks: [number, number, number, number, number][] = [[92, -16, 2.2, 1.4, 0.3], [84, -32, 2.6, 1.6, -0.2], [98, -26, 1.6, 1.6, 0.6]];
    for (const [x, z, hw, hd, yaw] of stacks) {
      const y = terrain.heightAt(x, z);
      for (let i = 0; i < 3; i++) kit.box(hw * 2 - i * 0.5, 0.75, hd * 2, x, y + i * 0.75, z, i % 2 ? PAL.limestone : PAL.plaster, yaw, 0, 0, 1.6);
    }
    kit.box(1.6, 1.6, 1.6, 78, terrain.heightAt(78, -24), -24, PAL.timber, 0.2);
    // Scaffold and hoist by the face
    for (const dx of [0, 3.2]) kit.box(0.2, 4.0, 0.2, 92 + dx, terrain.heightAt(92 + dx, -34), -34, PAL.timber);
    kit.box(3.6, 0.16, 0.3, 93.6, terrain.heightAt(92, -34) + 3.6, -34, PAL.timberDark);
    // Marcher contract banner
    const bt = makeTextTexture(160, 256, (ctx, w, h) => {
      ctx.fillStyle = '#8a3a30';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#d8c58a';
      ctx.fillRect(0, 0, w, 10);
      ctx.beginPath();
      ctx.moveTo(w / 2, 50);
      ctx.lineTo(w / 2 + 40, 140);
      ctx.lineTo(w / 2 - 40, 140);
      ctx.closePath();
      ctx.fill();
    });
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.6), new THREE.MeshBasicMaterial({ map: bt, side: THREE.DoubleSide }));
    bm.position.set(0, 2.0, 0);
    quarryBanner.add(bm);
    const by = terrain.heightAt(80, -17);
    kit.box(0.14, 3.4, 0.14, 80, by, -17, PAL.timberDark);
    quarryBanner.position.set(80.5, by + 0.6, -17);
    group.add(quarryBanner);
    for (const p of [[88, -20], [78, -10]] as const) {
      const y = terrain.heightAt(p[0], p[1]);
      lanternPositions.push(new THREE.Vector3(p[0], y + 2.1, p[1]));
      kit.box(0.1, 2.2, 0.1, p[0], y, p[1], PAL.timberDark);
      kit.glow(0.3, 0.3, 0.3, p[0], y + 2.05, p[1]);
    }
  }

  /* ---------------- Shortcut gate and lever ---------------- */
  const shortcutGate = new THREE.Group();
  const shortcutLever = new THREE.Group();
  {
    const gy = terrain.heightAt(SHORTCUT.gate.x, SHORTCUT.gate.z);
    const g = SHORTCUT.gate;
    const c = Math.cos(g.yaw);
    const s = Math.sin(g.yaw);
    for (const sx of [-1, 1]) kit.box(0.35, 2.6, 0.35, g.x + sx * (g.hw + 0.9) * c, gy, g.z - sx * (g.hw + 0.9) * s, PAL.rockA, g.yaw);
    // walls flanking the gate
    for (const sx of [-1, 1]) kit.box(4.0, 1.2, 0.5, g.x + sx * (g.hw + 3.2) * c, gy, g.z - sx * (g.hw + 3.2) * s, PAL.rockA, g.yaw);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry((g.hw + 0.9) * 2 - 0.4, 1.7, 0.14), new THREE.MeshStandardMaterial({ color: PAL.timberDark, roughness: 0.9 }));
    leaf.position.set(0, 0.95, 0);
    shortcutGate.add(leaf);
    shortcutGate.position.set(g.x, gy, g.z);
    shortcutGate.rotation.y = g.yaw;
    group.add(shortcutGate);
    const ly = terrain.heightAt(SHORTCUT.lever.x, SHORTCUT.lever.z);
    kit.box(0.5, 1.0, 0.5, SHORTCUT.lever.x, ly, SHORTCUT.lever.z, PAL.rockB);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), new THREE.MeshStandardMaterial({ color: PAL.iron }));
    arm.position.y = 0.5;
    shortcutLever.add(arm);
    shortcutLever.position.set(SHORTCUT.lever.x, ly + 1.0, SHORTCUT.lever.z);
    shortcutLever.rotation.z = -0.7;
    group.add(shortcutLever);
  }

  /* ---------------- Altar, spring shrine details ---------------- */
  const riteBowl = new THREE.Group();
  {
    const y0 = terrain.heightAt(RITE_ALTAR.x, RITE_ALTAR.z);
    kit.box(1.9, 0.9, 1.3, RITE_ALTAR.x, y0, RITE_ALTAR.z, PAL.limestone);
    kit.box(2.2, 0.16, 1.6, RITE_ALTAR.x, y0 + 0.9, RITE_ALTAR.z, PAL.rockA);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.8 }));
    bowl.position.y = 0;
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.36, 10), new THREE.MeshBasicMaterial({ color: 0x62b0a8 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.1;
    riteBowl.add(bowl, water);
    riteBowl.position.set(RITE_ALTAR.x, y0 + 1.15, RITE_ALTAR.z);
    group.add(riteBowl);
    // Shrine terrace low wall (built from quarry stone, mismatched repairs)
    for (let i = 0; i < 9; i++) {
      const x = -34 + i * 2.6;
      kit.box(2.5, 0.75, 0.5, x, terrain.heightAt(x, -90), -90, i % 3 === 0 ? PAL.limestone : PAL.rockA, 0, 0, 0, 2);
    }
    colliders.box('terrace_wall', -22.8, -90, 11.8, 0.3, 0);
    const lp = new THREE.Vector3(-16, terrain.heightAt(-16, -96) + 2.1, -96);
    lanternPositions.push(lp);
    kit.box(0.1, 2.2, 0.1, -16, terrain.heightAt(-16, -96), -96, PAL.timberDark);
    kit.glow(0.3, 0.3, 0.3, -16, lp.y - 0.1, -96);
  }

  /* ---------------- Fences and haystacks ---------------- */
  const fence = (pts: [number, number][], collide = true) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i]!;
      const [bx, bz] = pts[i + 1]!;
      const len = Math.hypot(bx - ax, bz - az);
      const yaw = Math.atan2(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 2.2));
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n;
        const z = az + ((bz - az) * k) / n;
        kit.box(0.14, 1.15, 0.14, x, terrain.heightAt(x, z) - 0.05, z, PAL.timberDark);
      }
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      const my = terrain.heightAt(mx, mz);
      for (const h of [0.45, 0.85]) kit.slab(0.08, 0.1, len, mx, my + h, mz, PAL.timber, yaw);
      if (collide) colliders.box('fence', mx, mz, 0.12, len / 2, yaw);
    }
  };
  // A fence collider runs along its local z axis, which points along the fence when the box uses the fence yaw.
  for (const f of FIELDS) {
    const c = Math.cos(f.yaw);
    const s = Math.sin(f.yaw);
    const corner = (lx: number, lz: number): [number, number] => [f.x + lx * c + lz * s, f.z - lx * s + lz * c];
    const hw = f.w / 2 + 0.8;
    const hd = f.d / 2 + 0.8;
    fence([corner(-hw, -hd), corner(hw, -hd)]);
    fence([corner(-hw, hd), corner(hw, hd)]);
    fence([corner(-hw, -hd), corner(-hw, hd)]);
  }
  {
    // Haystacks near the fields
    for (const [x, z] of [[-24, 56], [16, 72], [46, 68]] as const) {
      const y = terrain.heightAt(x, z);
      kit.cyl(1.0, 1.25, 1.3, 8, x, y, z, PAL.thatch);
      kit.cone(1.15, 1.1, 8, x, y + 1.25, z, PAL.thatch);
      colliders.circle('hay', x, z, 1.2);
    }
  }

  /* ---------------- Ford and side path details ---------------- */
  {
    // Ruined watch hut on the side path (where the toll-jumpers wait)
    const x = 92;
    const z = 40;
    const y = terrain.heightAt(x, z);
    for (let i = 0; i < 5; i++) {
      kit.box(1.6 + rng() * 0.8, 1.0 + rng() * 1.2, 0.5, x - 2.5 + i * 1.4, y, z - 2.3, PAL.rockA, rng() * 0.3, 0, 0, 1.8);
    }
    colliders.box('ruin_wall', x, z - 2.3, 4, 0.4, 0);
    kit.box(0.12, 2.2, 0.12, BORDER_SIGN.x, terrain.heightAt(BORDER_SIGN.x, BORDER_SIGN.z), BORDER_SIGN.z, PAL.timberDark);
    for (let i = 0; i < 3; i++) kit.box(1.5, 0.3, 0.06, BORDER_SIGN.x, terrain.heightAt(BORDER_SIGN.x, BORDER_SIGN.z) + 1.4 + i * 0.36, BORDER_SIGN.z, PAL.timber, i * 0.3 - 0.3);
    colliders.circle('border_sign', BORDER_SIGN.x, BORDER_SIGN.z, 0.4);
  }

  /* ---------------- Benches, barrels, crates ---------------- */
  {
    const bench = (x: number, z: number, yaw: number) => {
      const y = terrain.heightAt(x, z);
      kit.slab(1.8, 0.1, 0.5, x, y + 0.5, z, PAL.timber, yaw);
      const c = Math.cos(yaw);
      const s = Math.sin(yaw);
      for (const sx of [-1, 1]) kit.box(0.1, 0.5, 0.4, x + sx * 0.75 * c, y, z - sx * 0.75 * s, PAL.timberDark, yaw);
    };
    bench(-9, 35.6, 0);
    bench(44, 32.4, 1.0);
    bench(10, 17, 0.2);
    const barrels: [number, number][] = [[-16.5, 2.4], [16.4, 21], [-136.5, 31.5], [88, -13], [-14.4, -3]];
    for (const [x, z] of barrels) {
      const y = terrain.heightAt(x, z);
      kit.cyl(0.45, 0.5, 0.9, 8, x, y, z, PAL.timber);
      kit.cyl(0.47, 0.47, 0.06, 8, x, y + 0.3, z, PAL.iron);
      colliders.circle('barrel', x, z, 0.5);
    }
    // Saltward measuring kit on a table outside the bakery: a brass level and a marked staff.
    const ky = terrain.heightAt(15, 20.5);
    kit.box(1.0, 0.75, 0.6, 15, ky, 20.5, PAL.timber);
    kit.box(0.5, 0.06, 0.16, 15, ky + 0.8, 20.5, 0xb59a3a);
    kit.box(0.06, 1.3, 0.06, 15.4, ky + 0.75, 20.5, 0xc2b07a);
    colliders.box('kit_table', 15, 20.5, 0.55, 0.35, 0);
  }

  /* ---------------- Schedule board (rotation) and contract guard post ---------------- */
  const scheduleBoard = new THREE.Group();
  {
    const tex = makeTextTexture(384, 256, (ctx, w, h) => {
      ctx.fillStyle = '#5a4630';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#efe6c8';
      ctx.fillRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = '#3a2c1c';
      ctx.font = 'bold 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('WATER ROTATION', w / 2, 44);
      ctx.font = '22px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText('Day   — Mill & households', 28, 100);
      ctx.fillText('Night — Quarry', 28, 140);
      ctx.font = 'italic 17px Georgia, serif';
      ctx.fillText('Witnessed: reeve · foreman · waterkeeper', 28, 190);
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    plane.position.set(0, 1.9, 0);
    scheduleBoard.add(plane);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), new THREE.MeshStandardMaterial({ color: PAL.timberDark }));
    post.position.set(-0.7, 1.2, 0);
    const post2 = post.clone();
    post2.position.x = 0.7;
    scheduleBoard.add(post, post2);
    scheduleBoard.position.set(-0.5, terrain.heightAt(-0.5, 14), 14);
    scheduleBoard.rotation.y = Math.PI + 0.25;
    scheduleBoard.visible = false;
    group.add(scheduleBoard);
  }
  const contractGuardPost = new THREE.Group();
  {
    const y = terrain.heightAt(1.0, -63);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), new THREE.MeshBasicMaterial({ color: 0x8a3a30, side: THREE.DoubleSide }));
    flag.position.set(0, 2.6, 0);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.2, 0.1), new THREE.MeshStandardMaterial({ color: PAL.timberDark }));
    pole.position.y = 1.6;
    contractGuardPost.add(pole, flag);
    contractGuardPost.position.set(1.0, y, -63);
    contractGuardPost.visible = false;
    group.add(contractGuardPost);
  }

  /* ---------------- Pickups ---------------- */
  const pickups: Record<string, THREE.Object3D> = {};
  for (const pk of PICKUP_LOCATIONS) {
    const y = terrain.heightAt(pk.x, pk.z);
    const g = new THREE.Group();
    if (pk.id === 'quarry_brace') {
      const m = new THREE.MeshStandardMaterial({ color: 0x9a7a4a, roughness: 0.85, flatShading: true });
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.0, 0.22), m);
      a.rotation.z = 0.5;
      a.position.y = 0.7;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), m);
      b.rotation.z = -0.9;
      b.position.set(0.4, 0.5, 0.1);
      g.add(a, b);
    } else if (pk.id === 'quarry_wrench') {
      const m = new THREE.MeshStandardMaterial({ color: PAL.iron, roughness: 0.5, metalness: 0.6 });
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.08), m);
      shaft.rotation.z = 1.2;
      shaft.position.y = 0.2;
      const head = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 10), m);
      head.position.set(0.42, 0.42, 0);
      g.add(shaft, head);
    } else {
      const m = new THREE.MeshStandardMaterial({ color: PAL.timber, roughness: 0.9, flatShading: true });
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), m);
      box.position.y = 0.25;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.65), new THREE.MeshStandardMaterial({ color: PAL.timberDark }));
      lid.position.y = 0.58;
      g.add(box, lid);
    }
    g.position.set(pk.x, y, pk.z);
    g.traverse((o) => {
      o.castShadow = true;
    });
    group.add(g);
    pickups[pk.id] = g;
  }

  /* ---------------- Finish: build kit, materials ---------------- */
  const solidMat = makeStdMaterial();
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x3a3a34 });
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0x4a4636 });
  const built = kit.build(solidMat, windowMat);
  if (built.solid) group.add(built.solid);
  if (built.glow) group.add(built.glow);

  // Lantern glow cubes share the window glow material.
  const setNight = (n: number) => {
    const c = new THREE.Color(0x3a3a34).lerp(new THREE.Color(0xffc060), Math.min(1, n * 1.15));
    windowMat.color.copy(c);
    lanternMat.color.copy(c);
  };
  setNight(0);
  void LANTERNS;
  void paint;
  void transform;

  return {
    group,
    windowMat,
    lanternMat,
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
    setNight,
  };
}
