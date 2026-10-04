import type { Colliders } from './colliders';
import type { Terrain } from './terrain';

export const PLAYER_BODY_RADIUS = 0.4;
export const PLAYER_BODY_HEIGHT = 1.95;
export const PLAYER_FOOT_CLEARANCE = 0.03;
const RESTORE_STEP = 0.8;

type StandingTerrain = Pick<Terrain, 'groundAt' | 'supportAt' | 'walkable'> & Partial<Pick<Terrain, 'rockSupportAt' | 'rockClearAt'>>;

/** Restore an authored standing surface, never an arbitrary saved air height or an underside of the terrain. */
export function supportedPlayerHeight(terrain: StandingTerrain, x: number, z: number, savedFeetY?: number): number {
  const ground = terrain.groundAt(x, z);
  if (savedFeetY === undefined || !Number.isFinite(savedFeetY)) return ground;
  const support = terrain.supportAt(x, z, savedFeetY);
  return Number.isFinite(support) && Math.abs(support - savedFeetY) <= RESTORE_STEP + 1e-6
    ? Math.max(ground, support) : ground;
}

/** Restore real contact safely; steep land now resolves through gravity rather than a slope fence. */
export function canPlayerStandAt(terrain: StandingTerrain, colliders: Pick<Colliders, 'blocked'>, x: number, z: number, savedFeetY?: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const y = supportedPlayerHeight(terrain, x, z, savedFeetY);
  if (!Number.isFinite(y) || !terrain.walkable(x, z, Infinity, y)) return false;
  if (terrain.rockClearAt && !terrain.rockClearAt(x, y, z)) return false;
  return !colliders.blocked(x, z, PLAYER_BODY_RADIUS, { minY: y + PLAYER_FOOT_CLEARANCE, maxY: y + PLAYER_BODY_HEIGHT,
    excludePrecise: Boolean(terrain.rockClearAt) });
}
