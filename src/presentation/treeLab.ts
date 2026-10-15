import type { Species } from './treeGen';

/**
 * Developer aid for tools/tree-lab.mjs: `?treelab=<species>[:<assetId>][@x,z][*scale]` replaces the planted flora with
 * ONE tree on a cleared meadow. Off unless the parameter is present; normal play never reads it.
 */
export interface TreeLabRequest { species: Species; assetId?: string; x?: number; z?: number; scale: number }

const SPECIES_OF: Readonly<Record<string, Species>> = { pine: 'pine', fir: 'fir', oak: 'oak', birch: 'birch', orchard: 'orchard', shrub: 'shrub', palm: 'palm', dead: 'dead' } as unknown as Record<string, Species>;

export function parseTreeLab(search: string): TreeLabRequest | null {
  const raw = new URLSearchParams(search).get('treelab');
  if (!raw) return null;
  const m = /^([a-z]+)(?::([a-z0-9-]+))?(?:@(-?[\d.]+),(-?[\d.]+))?(?:\*([\d.]+))?$/.exec(raw);
  if (!m) return null;
  const species = SPECIES_OF[m[1]!];
  if (!species) return null;
  const scale = m[5] ? Number(m[5]) : 1;
  if (!Number.isFinite(scale) || scale <= 0) return null;
  return { species, assetId: m[2], x: m[3] === undefined ? undefined : Number(m[3]), z: m[4] === undefined ? undefined : Number(m[4]), scale };
}

export interface LabTerrain { heightAt(x: number, z: number): number; slopeAt(x: number, z: number): number }

/** The flattest open ground within the realm: dry, gently sloped over 24 m, nothing blocking within `clear` metres. */
export function pickLabSpot(terrain: LabTerrain, blocked: (x: number, z: number, r: number) => boolean, clear = 60, extent = 260): { x: number; z: number } | null {
  let best: { x: number; z: number; score: number } | null = null;
  const ring = [[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12], [24, 0], [-24, 0], [0, 24], [0, -24], [17, 17], [-17, -17], [17, -17], [-17, 17]] as const;
  for (let x = -extent; x <= extent; x += 12) for (let z = -extent; z <= extent; z += 12) {
    const h = terrain.heightAt(x, z);
    if (!(h > 2.5 && h < 40)) continue;
    let worst = 0, drop = 0;
    for (const [dx, dz] of ring) { worst = Math.max(worst, terrain.slopeAt(x + dx, z + dz)); drop = Math.max(drop, Math.abs(terrain.heightAt(x + dx, z + dz) - h)); }
    if (worst > 0.08 || drop > 0.9) continue;
    const score = worst + drop * 0.1;
    if (best && score >= best.score) continue;
    if (blocked(x, z, clear)) continue;
    best = { x, z, score };
  }
  return best && { x: best.x, z: best.z };
}
