import { BUILDINGS, type BuildingSpec } from './layout';

/** Existing authored door positions, measured from the native procedural 0.0.7 buildings in their actual world frames.
 * Keeping them independent of decorative RNG lets stone steps, standing support and the visible doorway agree. */
const DOOR_OFFSETS: Record<string, number> = {
  reeve_house: -0.17631531, bakery: -0.50346279, inn: -0.74414015, mill: 0.18086243,
  house_a: -0.47555430, house_b: -0.58369432, house_c: -0.58805038, house_d: 0.67604438,
  house_e: 0.00125549, house_f: 0.36482004, sluice_hut: 0.36242398,
  quarry_office: 0.27918542, crew_bunks: 0.79872764, overlook_lodge: -0.54890063,
  fisher_house: -0.46805135, net_store: -0.32518170, keeper_cottage: 0.04913145,
};

export function buildingEntry(b: BuildingSpec) {
  return b.kind === 'shrine'
    ? { x: 0, y: 0.5, z: b.d / 2 + 0.05, w: 1.9, h: 3 }
    : { x: DOOR_OFFSETS[b.id] ?? 0, y: 0.4, z: b.d / 2 + 0.03, w: 1.05, h: 2.05 };
}

/** The same five terrain samples used by the rendered building foundation. */
export function buildingGround(heightAt: (x: number, z: number) => number, b: { x: number; z: number; w: number; d: number; yaw: number }) {
  let lo = Infinity, hi = -Infinity, sum = 0;
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]] as const) {
    const lx = sx * b.w / 2, lz = sz * b.d / 2;
    const h = heightAt(b.x + lx * c + lz * s, b.z - lx * s + lz * c);
    lo = Math.min(lo, h); hi = Math.max(hi, h); sum += h;
  }
  return { avg: sum / 5, lo, hi };
}

/** Exterior stone treads of closed buildings. No roofs or interiors become walking supports by this rule. */
export function buildingStepSurfacesAt(x: number, z: number, heightAt: (x: number, z: number) => number): number[] {
  const surfaces: number[] = [];
  for (const b of BUILDINGS) {
    if (b.kind === 'archive') continue; // The enterable archive has its own measured sill and floor.
    const dx = x - b.x, dz = z - b.z;
    if (Math.hypot(dx, dz) > Math.hypot(b.w, b.d) / 2 + 1.8) continue;
    const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    const entry = buildingEntry(b);
    let localTop: number | undefined;
    if (Math.abs(lx - entry.x) <= (entry.w + 0.7) / 2 && Math.abs(lz - entry.z - 0.42) <= 0.35) localTop = entry.y + 0.08;
    if (Math.abs(lx - entry.x) <= (entry.w + 0.9) / 2 && Math.abs(lz - entry.z - 0.96) <= 0.25) localTop = Math.max(localTop ?? -Infinity, entry.y * 0.5);
    if (localTop !== undefined) surfaces.push(buildingGround(heightAt, b).avg + localTop);
  }
  return surfaces;
}
