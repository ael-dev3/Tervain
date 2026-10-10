import { NPCS } from '../content/npcs';
import { hourOfDay } from '../game/state';
import type { WorldState } from '../game/types';
import { ANCHORS, ENEMY_SPAWNS } from '../world/layout';
import { resolveGoal } from './actors';
import { AMBIENT_PLACES } from './ambient';
import type { MeshyNpcCatalog } from './meshynpcs';
import * as THREE from 'three';
import type { Rig } from './characters';
import { disposeSceneResources } from './disposeScene';

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
  /** Take their own model from the catalog that now holds it, or the rig already built for it by `make`. */
  adopt(catalog: MeshyNpcCatalog, rig?: Rig): void;
  /** Build their rig a step at a time (A78); when given, the rig is made over several frames and adopt() takes it. */
  make?(catalog: MeshyNpcCatalog): Generator<void, Rig, void>;
}

/** Milliseconds of rig building a frame may spend on a figure taking their model (at least one step is taken). */
export const ARRIVAL_BUDGET_MS = 3;

/** The figures still waiting for their models, handed theirs as soon as nobody sees the change. */
export class ResidentArrivals {
  private waiting: AwaitingFigure[] = [];
  /** The figure whose rig is being built a step a frame, and the rig once it is done but they are in view. */
  private building: { figure: AwaitingFigure; steps: Generator<void, Rig, void>; rig: Rig | null; ready: boolean } | null = null;
  /**
   * Prepare a finished rig's shaders before it is shown (A78: the renderer's parallel compile), so its first frame on
   * screen does not stall compiling them. The rig changes over once this settles, whether or not it succeeded.
   */
  warm: ((rig: Rig) => Promise<unknown>) | null = null;

  constructor(private readonly now: () => number = () => performance.now()) {}

  get count(): number {
    return this.waiting.length + (this.building ? 1 : 0);
  }

  add(figure: AwaitingFigure) {
    this.waiting.push(figure);
  }

  clear() {
    this.waiting = [];
    // A rig built for someone who never took it (the world went first) owns its own GPU resources (A80 audit).
    if (this.building?.rig) discardRig(this.building.rig);
    this.building = null;
    // A new world brings its own scene to warm shaders against.
    this.warm = null;
  }

  /**
   * Once the catalog holds their models, those out of view (or unseen where they are) take them; at most `perFrame` a
   * frame, so the skinning and surface set-up of a whole cast is not paid in one frame. A figure that can build its rig
   * in steps (A78) is built one at a time, ARRIVAL_BUDGET_MS a frame, and changes over only out of sight. Returns how
   * many arrived.
   */
  update(catalog: MeshyNpcCatalog | null, inView: (p: { x: number; y: number; z: number }) => boolean, perFrame = 2): number {
    if (!catalog) return 0;
    const hidden = (figure: AwaitingFigure) => !!figure.unseen?.() || !inView(figure.position());
    let arrived = 0;
    if (this.building) arrived += this.advance(catalog, hidden);
    if (!this.waiting.length) return arrived;
    this.waiting = this.waiting.filter((figure) => {
      if (arrived >= perFrame || !catalog.has(figure.role)) return true;
      if (!hidden(figure)) return true;
      if (figure.make) {
        if (this.building) return true;
        try {
          this.building = { figure, steps: figure.make(catalog), rig: null, ready: false };
        } catch (error) {
          console.warn(`resident ${figure.role} could not take its model; keeping its stand-in`, error);
          return false;
        }
        arrived += this.advance(catalog, hidden);
        return false;
      }
      // (A73) One figure whose model fails to set up is dropped (keeping its stand-in), not retried every frame.
      try {
        figure.adopt(catalog);
        arrived++;
      } catch (error) {
        console.warn(`resident ${figure.role} could not take its model; keeping its stand-in`, error);
      }
      return false;
    });
    return arrived;
  }

  /** Build the current figure's rig for this frame's budget; hand it over once done and out of sight. */
  private advance(catalog: MeshyNpcCatalog, hidden: (figure: AwaitingFigure) => boolean): number {
    const building = this.building!;
    try {
      if (!building.rig) {
        const started = this.now();
        do {
          const next = building.steps.next();
          if (next.done) { building.rig = next.value; break; }
        } while (this.now() - started < ARRIVAL_BUDGET_MS);
        if (building.rig) {
          if (this.warm) {
            const settle = () => { building.ready = true; };
            this.warm(building.rig).then(settle, settle);
          } else building.ready = true;
        }
      }
      if (!building.rig || !building.ready || !hidden(building.figure)) return 0;
      this.building = null;
      building.figure.adopt(catalog, building.rig);
      return 1;
    } catch (error) {
      this.building = null;
      if (building.rig && !building.rig.root.parent) discardRig(building.rig);
      console.warn(`resident ${building.figure.role} could not take its model; keeping its stand-in`, error);
      return 0;
    }
  }
}

/** Release a rig that was built and never shown. */
function discardRig(rig: Rig) {
  const holder = new THREE.Scene();
  holder.add(rig.root);
  disposeSceneResources(holder, () => {});
  holder.remove(rig.root);
}
