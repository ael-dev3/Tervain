import { NPCS } from '../content/npcs';
import { hourOfDay } from '../game/state';
import type { WorldState } from '../game/types';
import { ANCHORS, ENEMY_SPAWNS } from '../world/layout';
import { resolveGoal } from './actors';
import { AMBIENT_PLACES } from './ambient';
import type { MeshyNpcCatalog } from './meshynpcs';

/**
 * Residents after entry (stage 2 of backlog 4). Only the people near where the journey starts are downloaded before the
 * world opens; everyone else holds their place with a stand-in that has nothing to draw and cannot be met, and takes their
 * own model once it is here and the player is not looking at them.
 */

/** How far from the entry point a figure's model is still fetched before the world opens. */
export const NEAR_ENTRY_METRES = 60;

/**
 * The model roles of everyone within `radius` of the player when the world opens: named residents where their schedule
 * puts them at that hour, the hamlet's people, and the bandits that are still about. The menu's warden never is.
 */
export function residentRolesNear(state: WorldState, radius = NEAR_ENTRY_METRES): string[] {
  const { x, z } = state.player, hour = hourOfDay(state.clock), roles: string[] = [];
  const near = (p: { x: number; z: number } | undefined) => !!p && Math.hypot(p.x - x, p.z - z) <= radius;
  for (const def of Object.values(NPCS)) {
    if (state.npcs[def.id]?.available === false) continue;
    if (near(ANCHORS[resolveGoal(def, state, hour).anchor])) roles.push(`named:${def.id}`);
  }
  for (const place of AMBIENT_PLACES) if (near(place)) roles.push(place.role);
  for (const spawn of ENEMY_SPAWNS) {
    if (spawn.kind === 'thornback' || state.defeated[spawn.id]) continue;
    if (near(spawn)) roles.push(`enemy:${spawn.id}`);
  }
  return roles;
}

/** Someone whose model arrives after the world opened. */
export interface AwaitingFigure {
  role: string;
  /** Where they are now (their stand-in's place). */
  position(): { x: number; y: number; z: number };
  /** Out of sight anyway (indoors, asleep, gone): they may take their model even in view. */
  unseen?(): boolean;
  /** Take their own model from the catalog that now holds it. */
  adopt(catalog: MeshyNpcCatalog): void;
}

/** The figures still waiting for their models, handed theirs as soon as nobody sees the change. */
export class ResidentArrivals {
  private waiting: AwaitingFigure[] = [];

  get count(): number {
    return this.waiting.length;
  }

  add(figure: AwaitingFigure) {
    this.waiting.push(figure);
  }

  clear() {
    this.waiting = [];
  }

  /**
   * Once the catalog holds their models, those out of view (or unseen where they are) take them; at most `perFrame` a
   * frame, so the skinning and surface set-up of a whole cast is not paid in one frame. Returns how many arrived.
   */
  update(catalog: MeshyNpcCatalog | null, inView: (p: { x: number; y: number; z: number }) => boolean, perFrame = 2): number {
    if (!catalog || !this.waiting.length) return 0;
    let arrived = 0;
    this.waiting = this.waiting.filter((figure) => {
      if (arrived >= perFrame || !catalog.has(figure.role)) return true;
      if (!figure.unseen?.() && inView(figure.position())) return true;
      figure.adopt(catalog);
      arrived++;
      return false;
    });
    return arrived;
  }
}
