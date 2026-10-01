import { clamp, fbm, lerp, ridged, smoothstep, warp } from './noise';
import { lighthouseRock, shapeCoast, shoreDistance } from './coast';
import { lighthouseSurfacesAt } from './lighthouse';
import { buildingStepSurfacesAt } from './buildingEntries';
import { isWorldPickupItem } from '../content/pickups';
import {
  ANCHORS,
  ARRIVAL_ROUTE,
  ARRIVAL_TRAIL_WIDTH,
  ARCHIVE_ROOM,
  BELL,
  BUILDINGS,
  COASTAL,
  DECKS,
  DEEP_WATER,
  FORD,
  FOREST_HILLS,
  FOREST_RUIN,
  FOREST_WAYMARKERS,
  FOREST_SWALE,
  HAMLET_PROPS,
  HANDCART_CONSTRUCTION,
  INSPECT_LOCATIONS,
  LEDGE,
  LEDGER,
  LIGHTHOUSE,
  OVERLOOK_BUMP,
  PALISADE,
  PICKUP_LOCATIONS,
  RITE_ALTAR,
  ROADS,
  SEA_LEVEL,
  SHORTCUT,
  SHRINE_PLATEAU,
  SLUICE,
  SPAWN,
  SPRING_POOL,
  STREAMS,
  VALLEY,
  WAGON,
  WAGON_CONSTRUCTION,
  VILLAGE_HANDCART,
  WORLD,
  type StreamSpec,
  type V2,
} from './layout';

/** Distance from p to a polyline, plus which segment and the parameter along it. */
export function distToPolyline(px: number, pz: number, pts: V2[]) {
  let best = Infinity;
  let seg = 0;
  let t = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz;
    const u = l2 === 0 ? 0 : clamp(((px - a.x) * dx + (pz - a.z) * dz) / l2, 0, 1);
    const qx = a.x + dx * u;
    const qz = a.z + dz * u;
    const d = Math.hypot(px - qx, pz - qz);
    if (d < best) {
      best = d;
      seg = i;
      t = u;
    }
  }
  return { d: best, seg, t };
}

const bump = (x: number, z: number, cx: number, cz: number, r: number, h: number, core = 0.35) => {
  const d = Math.hypot(x - cx, z - cz) / r;
  return h * (1 - smoothstep(core, 1, d));
};

/** Authored low relief: long rounded wooded crests above a shallow dry swale, eased away from the road shoulder. */
export function forestRelief(x: number, z: number): number {
  const coast = smoothstep(28, 54, shoreDistance(x, z));
  if (coast <= 0) return 0;
  let hills = 0;
  for (const hill of FOREST_HILLS) {
    const dx = x - hill.x;
    const dz = z - hill.z;
    const c = Math.cos(hill.yaw);
    const s = Math.sin(hill.yaw);
    const rx = (dx * c - dz * s) / hill.rx;
    const rz = (dx * s + dz * c) / hill.rz;
    const d = Math.hypot(rx, rz);
    if (d >= 1) continue;
    hills += hill.h * (1 - smoothstep(0.08, 1, d));
  }
  const near = distToPolyline(x, z, ARRIVAL_ROUTE).d;
  const shoulder = smoothstep(ARRIVAL_TRAIL_WIDTH / 2 + 1.5, 12, near);
  const swaleDistance = distToPolyline(x, z, FOREST_SWALE.points).d;
  const swale = FOREST_SWALE.depth * (1 - smoothstep(0, FOREST_SWALE.width, swaleDistance));
  return (hills - swale) * shoulder * coast;
}

/** Normalised radius of the playable land: the union of the vale and the coastal plain (below 1 is inside). */
export function realmRadius(x: number, z: number): number {
  const a = Math.hypot((x - VALLEY.cx) / VALLEY.rx, (z - VALLEY.cz) / VALLEY.rz);
  const b = Math.hypot((x - COASTAL.cx) / COASTAL.rx, (z - COASTAL.cz) / COASTAL.rz);
  return Math.min(a, b);
}

function cellHash(ix: number, iz: number, k: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(k, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Undulating open ground: broad domain-warped swells with rougher hummocks on top. Heath, not lawn. */
function heath(x: number, z: number): number {
  const [wx, wz] = warp(x, z, 70, 16, 81);
  return 3.6 * fbm(wx / 62, wz / 62, 4, 3) + 1.5 * fbm(x / 17, z / 17, 3, 5) + 0.32 * fbm(x / 5.5, z / 5.5, 2, 9);
}

/** Weathered knolls and rock outcrops scattered over open ground. */
function outcrops(x: number, z: number): number {
  const CELL = 40;
  const cx = Math.floor(x / CELL);
  const cz = Math.floor(z / CELL);
  let best = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const gx = cx + i;
      const gz = cz + j;
      if (cellHash(gx, gz, 1) > 0.45) continue;
      const ox = (gx + cellHash(gx, gz, 2)) * CELL;
      const oz = (gz + cellHash(gx, gz, 3)) * CELL;
      const r = 9 + cellHash(gx, gz, 4) * 16;
      // A warped, flat-crowned knoll rather than a cone: the distance is bent by noise and the top is a plateau.
      const d = Math.hypot(x - ox + 3.2 * fbm(x / 9, z / 9, 2, 95), z - oz + 3.2 * fbm(x / 9 + 7, z / 9, 2, 96)) / r;
      if (d >= 1) continue;
      const hgt = 1.4 + cellHash(gx, gz, 5) * 3.0;
      best = Math.max(best, hgt * (1 - smoothstep(0.35, 1, d)) * (0.7 + 0.5 * ridged(x / 5, z / 5, 2, 91)));
    }
  }
  return best;
}

let keepClear: { x: number; z: number; r: number }[] | null = null;
/** 0 next to paths, water and anything the story uses; 1 in open country. Outcrops fade out where it is low. */
export function clearanceAt(x: number, z: number): number {
  if (!keepClear) {
    keepClear = [];
    for (const a of Object.values(ANCHORS)) keepClear.push({ x: a.x, z: a.z, r: 9 });
    for (const p of INSPECT_LOCATIONS) keepClear.push({ x: p.x, z: p.z, r: 9 });
    for (const p of PICKUP_LOCATIONS) keepClear.push({ x: p.x, z: p.z, r: isWorldPickupItem(p.item) ? 1.1 : 9 });
    for (const b of BUILDINGS) keepClear.push({ x: b.x, z: b.z, r: Math.max(b.w, b.d) * 0.8 + 6 });
    for (const p of FOREST_WAYMARKERS) keepClear.push({ x: p.x, z: p.z, r: 3.2 });
    keepClear.push({ x: FOREST_RUIN.x, z: FOREST_RUIN.z, r: FOREST_RUIN.r + 3 });
    for (const q of [BELL, SLUICE.control, SHORTCUT.lever, RITE_ALTAR, LEDGER, WAGON, LIGHTHOUSE]) keepClear.push({ x: q.x, z: q.z, r: 10 });
  }
  let c = 1;
  for (const k of keepClear) {
    const d = Math.hypot(x - k.x, z - k.z);
    if (d < k.r) c = Math.min(c, smoothstep(k.r * 0.45, k.r, d));
  }
  for (const r of ROADS) c = Math.min(c, smoothstep(r.width * 0.5 + 0.5, r.width * 0.5 + 5.5, distToPolyline(x, z, r.points).d));
  for (const st of STREAMS) c = Math.min(c, smoothstep(st.halfWidth + 1, st.halfWidth + 9, distToPolyline(x, z, st.points).d));
  c = Math.min(c, smoothstep(3, 8, distToPolyline(x, z, PALISADE.points as unknown as V2[]).d));
  return c;
}

/** Keeps dry land dry: heights well below sea level are eased up so hollows in the heath are never flooded by the sea plane. */
function softFloor(h: number): number {
  const f = 0.5;
  const t = (h - f) * 1.3;
  return f + (t > 18 ? t : Math.log1p(Math.exp(t))) / 1.3;
}

interface Pad {
  x: number;
  z: number;
  r: number;
  level: number;
}
let pads: Pad[] | null = null;

const archive = BUILDINGS.find((b) => b.kind === 'archive')!;
let archivePadLevel: number | null = null;

/** A cut-and-filled terrace supports the archive and both entrances, including the terrain grid's interpolation margin. */
function archiveTerrace(x: number, z: number, height: number): number {
  archivePadLevel ??= softFloor(coreHeight(archive.x, archive.z));
  const dx = x - archive.x;
  const dz = z - archive.z;
  const c = Math.cos(archive.yaw);
  const s = Math.sin(archive.yaw);
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  const hx = archive.w / 2 + WORLD.cell;
  const hz = archive.d / 2 + 5 + WORLD.cell;
  const outside = Math.hypot(Math.max(0, Math.abs(lx) - hx), Math.max(0, Math.abs(lz) - hz));
  return lerp(height, archivePadLevel, 1 - smoothstep(0, 4, outside));
}

/** Ground height before pads, coast and rivers: low coastal rises, heath, and outcrops. */
function coreHeight(x: number, z: number): number {
  const r = realmRadius(x, z);
  const edge = smoothstep(0.92, 1.24, r);
  const ridge = 0.55 + 0.45 * fbm(x / 90 + 9, z / 90 - 4, 3, 7);
  // A low wooded rise closes the playable boundary without an alpine wall over the coast and village.
  let h = edge * (5 + 10 * ridge) + Math.max(0, r - 1.24) * 4;

  const shrine = bump(x, z, SHRINE_PLATEAU.x, SHRINE_PLATEAU.z, SHRINE_PLATEAU.r, SHRINE_PLATEAU.h, 0.5);
  const overlook = bump(x, z, OVERLOOK_BUMP.x, OVERLOOK_BUMP.z, OVERLOOK_BUMP.r, OVERLOOK_BUMP.h, 0.4);
  const ledge = bump(x, z, LEDGE.x, LEDGE.z, LEDGE.r, LEDGE.h, 0.5);

  const calm = 1 - clamp((shrine + overlook + ledge) / 8, 0, 0.85);
  const rolling = heath(x, z) * calm;
  // The land climbs gently toward the north-east where the quarry is cut into the hillside.
  const hillside = Math.min(20, 0.1 * Math.max(0, x - 80) + 0.1 * Math.max(0, -z - 25));
  const crags = Math.max(0, fbm(x / 8, z / 8, 3, 11)) * Math.min(1, hillside / 6) * 1.4;
  // The gully north of the Cut: a cliff drop that makes the ledge a dead end on that side.
  const gully = -bump(x, z, LEDGE.x, LEDGE.z - 26, 17, 9, 0.4);
  const sd = shoreDistance(x, z);
  // The coastal plain climbs from the dunes toward the overlook and fades out again before the vale.
  const rise = 3.2 * smoothstep(10, 110, sd) * (1 - smoothstep(120, 200, sd));
  h += rolling + shrine + overlook + hillside + crags + gully + rise + forestRelief(x, z);
  if (x < -30) h += lighthouseRock(x, z) + outcrops(x, z) * clearanceAt(x, z) * smoothstep(20, 60, sd);
  else h += outcrops(x, z) * clearanceAt(x, z) * 0.7;

  // Village fields: gently flatten so buildings sit on the ground.
  const vd = Math.hypot(x - 4, z - 8) / 42;
  h = lerp(h, 0.55 + 0.35 * fbm(x / 30, z / 30, 2, 2), 1 - smoothstep(0.55, 1, vd));
  // Quarry yard: a levelled working floor.
  const qd = Math.hypot(x - 88, z + 20) / 34;
  h = lerp(h, 2.1, (1 - smoothstep(0.3, 1, qd)) * 0.95);
  // Shrine forecourt and spring plateau stay level around the buildings.
  const sdd = Math.hypot(x - -28, z + 100) / 26;
  h = lerp(h, SHRINE_PLATEAU.h - 0.4, (1 - smoothstep(0.5, 1, sdd)) * 0.9);
  // Overlook shelf where the road tops the rise.
  const od = Math.hypot(x + 136, z - 28) / 14;
  h = lerp(h, 5.8, (1 - smoothstep(0.4, 1, od)) * 0.95);
  // Ledge floor.
  const ld = Math.hypot(x - LEDGE.x, z - LEDGE.z) / 11;
  h = lerp(h, 9.2, (1 - smoothstep(0.5, 1, ld)) * 0.9);
  return h;
}

/** Ground height before rivers are carved. */
export function baseHeight(x: number, z: number): number {
  let h = softFloor(coreHeight(x, z));
  if (!pads) {
    pads = [];
    for (const b of BUILDINGS) {
      if (b.kind === 'fisher' || b.kind === 'store' || b.kind === 'keeper' || b.kind === 'lodge') {
        const r = Math.max(b.w, b.d) * 0.72 + 3;
        const h = softFloor(coreHeight(b.x, b.z));
        pads.push({ x: b.x, z: b.z, r, level: (b.x < -170 ? shapeCoast(b.x, b.z, h) : h) + 0.15 });
      }
    }
    // The lighthouse stands on a levelled ledge of its rock.
    pads.push({ x: LIGHTHOUSE.x, z: LIGHTHOUSE.z, r: 9, level: shapeCoast(LIGHTHOUSE.x, LIGHTHOUSE.z, coreHeight(LIGHTHOUSE.x, LIGHTHOUSE.z)) });
    // A small safe waking place on the sand; no camp-sized coastal terrace remains.
    pads.push({ x: SPAWN.x, z: SPAWN.z, r: 6, level: shapeCoast(SPAWN.x, SPAWN.z, softFloor(coreHeight(SPAWN.x, SPAWN.z))) });
  }
  if (x < -170) h = shapeCoast(x, z, h);
  for (const p of pads) {
    const d = Math.hypot(x - p.x, z - p.z) / p.r;
    if (d < 1) h = lerp(h, p.level, (1 - smoothstep(0.62, 1, d)) * 0.99);
  }
  // The keeper's joined foundation, first stair and door approach share one cut terrace on the headland.
  // Its falloff stays outside the compound so sand and rock cannot pierce the house or first treads.
  const lighthouseDistance = Math.hypot(x - LIGHTHOUSE.x, z - LIGHTHOUSE.z);
  if (lighthouseDistance < 17) {
    const level = shapeCoast(LIGHTHOUSE.x, LIGHTHOUSE.z, coreHeight(LIGHTHOUSE.x, LIGHTHOUSE.z));
    h = lerp(h, level, 1 - smoothstep(14, 17, lighthouseDistance));
  }
  h = arrivalRoadGrade(x, z, h);
  h = vehicleParkingGrade(x, z, h);
  return archiveTerrace(x, z, h);
}

interface ParkingGrade { x: number; z: number; yaw: number; minX: number; maxX: number; halfZ: number; margin: number; level: number }
let parkingGrades: ParkingGrade[] | null = null;
/** A small working-yard cut supports the wheels and grounded drawbars; the surrounding hills and road stay authored. */
function vehicleParkingGrade(x: number, z: number, h: number): number {
  if (parkingGrades === null) {
    // Empty first: the three unmodified centre samples below can call baseHeight without recursive initialization.
    parkingGrades = [];
    const poses = [
      { pose: WAGON, vehicle: WAGON_CONSTRUCTION },
      { pose: HAMLET_PROPS.handcart, vehicle: HANDCART_CONSTRUCTION },
      { pose: VILLAGE_HANDCART, vehicle: HANDCART_CONSTRUCTION },
    ];
    const authored = poses.map(({ pose, vehicle }) => ({
      ...pose, level: baseHeight(pose.x, pose.z), minX: -vehicle.length / 2 - 0.12,
      maxX: vehicle.shaftEnd + 0.12, halfZ: vehicle.wheelTrack + vehicle.wheelRadius * 0.285 + 0.12,
      // The 2 m terrain grid's vertices must also lie on the pad for its interpolated triangles to be truly flat.
      margin: WORLD.cell * (Math.abs(Math.cos(pose.yaw)) + Math.abs(Math.sin(pose.yaw))) + 0.12,
    }));
    parkingGrades.push(...authored);
  }
  for (const p of parkingGrades) {
    const dx = x - p.x, dz = z - p.z;
    if (Math.hypot(dx, dz) > p.maxX + p.margin + 5) continue;
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    const outsideX = Math.max(p.minX - p.margin - lx, lx - p.maxX - p.margin, 0);
    const outsideZ = Math.max(Math.abs(lz) - p.halfZ - p.margin, 0);
    const outside = Math.hypot(outsideX, outsideZ);
    if (outside < 2.8) h = lerp(h, p.level, 1 - smoothstep(0, 2.8, outside));
  }
  return h;
}

let arrivalGrades: number[] | null = null;
/** A softly cut woodland trail follows a continuous grade, keeping the authored road walkable across hummocks. */
function arrivalRoadGrade(x: number, z: number, h: number): number {
  const near = distToPolyline(x, z, ARRIVAL_ROUTE);
  const width = ARRIVAL_TRAIL_WIDTH;
  const influence = 1 - smoothstep(width / 2 + 0.4, width / 2 + 4, near.d);
  if (influence <= 0) return h;
  arrivalGrades ??= ARRIVAL_ROUTE.map((p) => {
    const level = softFloor(coreHeight(p.x, p.z));
    return p.x < -170 ? shapeCoast(p.x, p.z, level) : level;
  });
  const grade = lerp(arrivalGrades[near.seg]!, arrivalGrades[near.seg + 1]!, near.t);
  return lerp(h, grade, influence);
}

export function carveDepthAt(x: number, z: number): number {
  let carve = 0;
  for (const s of STREAMS) {
    const { d } = distToPolyline(x, z, s.points);
    let depth = s.depth;
    if (s.id === 'main') {
      const fd = Math.hypot(x - FORD.x, z - FORD.z);
      depth = lerp(FORD.depth, s.depth, smoothstep(FORD.r * 0.45, FORD.r, fd));
    }
    const c = depth * (1 - smoothstep(s.halfWidth * 0.5, s.halfWidth * 1.65, d));
    carve = Math.max(carve, c);
  }
  const pd = Math.hypot(x - SPRING_POOL.x, z - SPRING_POOL.z);
  carve = Math.max(carve, 1.3 * (1 - smoothstep(SPRING_POOL.r * 0.55, SPRING_POOL.r * 1.0, pd)));
  return carve;
}

export function roadWeight(x: number, z: number): number {
  let w = 0;
  for (const r of ROADS) {
    const { d } = distToPolyline(x, z, r.points);
    w = Math.max(w, 1 - smoothstep(r.width * 0.5, r.width * 0.5 + 1.4, d));
  }
  return w;
}

export class Terrain {
  readonly nx = (WORLD.maxX - WORLD.minX) / WORLD.cell;
  readonly nz = (WORLD.maxZ - WORLD.minZ) / WORLD.cell;
  readonly heights: Float32Array;
  readonly carve: Float32Array;

  constructor() {
    const w = this.nx + 1;
    const h = this.nz + 1;
    this.heights = new Float32Array(w * h);
    this.carve = new Float32Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const x = WORLD.minX + i * WORLD.cell;
        const z = WORLD.minZ + j * WORLD.cell;
        const base = baseHeight(x, z);
        const c = carveDepthAt(x, z);
        this.heights[j * w + i] = base - c;
        this.carve[j * w + i] = c;
      }
    }
  }

  private idx(i: number, j: number) {
    return j * (this.nx + 1) + i;
  }

  vertexHeight(i: number, j: number) {
    return this.heights[this.idx(i, j)]!;
  }

  vertexX(i: number) {
    return WORLD.minX + i * WORLD.cell;
  }

  vertexZ(j: number) {
    return WORLD.minZ + j * WORLD.cell;
  }

  /** Terrain height following the rendered triangle split exactly, so feet meet the visible ground. */
  heightAt(x: number, z: number): number {
    const gx = (x - WORLD.minX) / WORLD.cell;
    const gz = (z - WORLD.minZ) / WORLD.cell;
    const i = clamp(Math.floor(gx), 0, this.nx - 1);
    const j = clamp(Math.floor(gz), 0, this.nz - 1);
    const fx = clamp(gx - i, 0, 1);
    const fz = clamp(gz - j, 0, 1);
    const ha = this.heights[this.idx(i, j)]!;
    const hb = this.heights[this.idx(i + 1, j)]!;
    const hc = this.heights[this.idx(i, j + 1)]!;
    const hd = this.heights[this.idx(i + 1, j + 1)]!;
    if (fx + fz <= 1) return ha + fx * (hb - ha) + fz * (hc - ha);
    return hd + (1 - fx) * (hc - hd) + (1 - fz) * (hb - hd);
  }

  carveAt(x: number, z: number): number {
    const gx = (x - WORLD.minX) / WORLD.cell;
    const gz = (z - WORLD.minZ) / WORLD.cell;
    const i = clamp(Math.floor(gx), 0, this.nx - 1);
    const j = clamp(Math.floor(gz), 0, this.nz - 1);
    const fx = clamp(gx - i, 0, 1);
    const fz = clamp(gz - j, 0, 1);
    const c = this.carve;
    const a = c[this.idx(i, j)]!;
    const b = c[this.idx(i + 1, j)]!;
    const cc = c[this.idx(i, j + 1)]!;
    const d = c[this.idx(i + 1, j + 1)]!;
    return lerp(lerp(a, b, fx), lerp(cc, d, fx), fz);
  }

  deckAt(x: number, z: number) {
    for (const d of DECKS) {
      const dx = x - d.x;
      const dz = z - d.z;
      const lx = dx * Math.cos(d.yaw) - dz * Math.sin(d.yaw);
      const lz = dx * Math.sin(d.yaw) + dz * Math.cos(d.yaw);
      if (Math.abs(lx) <= d.hx && Math.abs(lz) <= d.hz) return d;
    }
    return null;
  }

  /** Height a character stands on: terrain, a deck, or the archive's rendered plank floor. */
  groundAt(x: number, z: number): number {
    const deck = this.deckAt(x, z);
    const t = this.heightAt(x, z);
    const dx = x - archive.x;
    const dz = z - archive.z;
    const c = Math.cos(archive.yaw);
    const s = Math.sin(archive.yaw);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    const hd = archive.d / 2;
    const wall = ARCHIVE_ROOM.wallThickness;
    // The forced rear entry retains its stone sill; feet step onto it instead of passing through the slab.
    if (Math.abs(lx) <= ARCHIVE_ROOM.shutterHalfWidth + 1e-6 && Math.abs(lz + hd) <= wall + 1e-6) {
      return Math.max(t, this.heightAt(archive.x, archive.z) + ARCHIVE_ROOM.shutterBottom);
    }
    if (Math.abs(lx) <= ARCHIVE_ROOM.doorHalfWidth + 1e-6 && lz >= hd - wall - 1e-6 && lz <= hd + wall + 0.2 + 1e-6) {
      return Math.max(t, this.heightAt(archive.x, archive.z) + ARCHIVE_ROOM.floorTop);
    }
    if (Math.abs(lx) <= archive.w / 2 - ARCHIVE_ROOM.wallThickness + 1e-6 && Math.abs(lz) <= archive.d / 2 - ARCHIVE_ROOM.wallThickness + 1e-6) {
      // Every point used by groundOf lies on the flat terrace, so its average equals this grid-sampled base.
      return Math.max(t, this.heightAt(archive.x, archive.z) + ARCHIVE_ROOM.floorTop);
    }
    return deck ? Math.max(deck.y, t) : t;
  }

  /** Standing support selected from the current feet height: a high gallery never teleports someone off the ground. */
  supportAt(x: number, z: number, feetY: number): number {
    const ground = this.groundAt(x, z);
    let support = ground;
    const surfaces = buildingStepSurfacesAt(x, z, (px, pz) => this.heightAt(px, pz));
    if (x - LIGHTHOUSE.x >= -11 && x - LIGHTHOUSE.x <= 5 && Math.abs(z - LIGHTHOUSE.z) <= 5) {
      const base = this.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z);
      for (const localY of lighthouseSurfacesAt(x, z)) surfaces.push(base + localY);
    }
    for (const surface of surfaces) {
      if (surface <= feetY + 0.8 + 1e-6 && surface >= feetY - 0.8 - 1e-6) support = Math.max(support, surface);
    }
    return support;
  }

  slopeAt(x: number, z: number): number {
    const e = 0.9;
    const dx = (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e);
    const dz = (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
    return Math.hypot(dx, dz);
  }

  normalAt(x: number, z: number, out: [number, number, number] = [0, 1, 0]) {
    const e = 1;
    const dx = (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e);
    const dz = (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
    const l = Math.hypot(dx, 1, dz);
    out[0] = -dx / l;
    out[1] = 1 / l;
    out[2] = -dz / l;
    return out;
  }

  valleyRadius(x: number, z: number): number {
    return realmRadius(x, z);
  }

  /** How far the ground is below sea level here (0 on dry land). */
  seaDepth(x: number, z: number): number {
    if (shoreDistance(x, z) > 8) return 0;
    return Math.max(0, SEA_LEVEL - this.heightAt(x, z));
  }

  isDeepWater(x: number, z: number): boolean {
    if (this.deckAt(x, z)) return false;
    return this.carveAt(x, z) > DEEP_WATER || this.seaDepth(x, z) > DEEP_WATER;
  }

  /** Whether a walking character may stand here (ignoring dynamic colliders). */
  walkable(x: number, z: number, maxSlope = 0.95, feetY?: number): boolean {
    if (x < WORLD.minX + 4 || x > WORLD.maxX - 4 || z < WORLD.minZ + 4 || z > WORLD.maxZ - 4) return false;
    if (this.valleyRadius(x, z) > 1.02) return false;
    if (this.isDeepWater(x, z)) return false;
    if (this.deckAt(x, z)) return true;
    if (feetY !== undefined && this.supportAt(x, z, feetY) > this.groundAt(x, z) + 0.02) return true;
    return this.slopeAt(x, z) <= maxSlope;
  }
}

export function streamById(id: StreamSpec['id']): StreamSpec {
  const s = STREAMS.find((x) => x.id === id);
  if (!s) throw new Error(`no stream ${id}`);
  return s;
}
