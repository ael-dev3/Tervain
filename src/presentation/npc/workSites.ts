import { HUNTER_TABLE as T, hunterStationPoint } from '../../world/layout';
import type { Terrain } from '../../world/terrain';
import { hunterTableSurfaceY } from '../hunterSupplies';

/**
 * The surfaces residents work against, in the worker's own frame (A70): metres from the actor's feet, +x to their left,
 * +z ahead, +y up. Each is taken from the world as it is built (the counter's real top and footprint, the quarry face's
 * measured plane, the ground's own height), so a work clip's hands and tools can be brought onto it.
 */
export type WorkSite =
  /** A level top: its height and the rectangle it covers. */
  | { kind: 'counter'; top: number; x0: number; x1: number; z0: number; z1: number }
  /** A rock face: a point on it at the height the chisel meets it, and its outward normal. */
  | { kind: 'face'; point: [number, number, number]; normal: [number, number, number] }
  /** The ground: its height under a point of the frame. */
  | { kind: 'ground'; heightAt: (x: number, z: number) => number };

/** Where an actor stands and faces: world position and heading. */
export interface WorkStance { x: number; y: number; z: number; yaw: number }

/**
 * The quarry boulder's face where the quarry hand dresses it (presentation/settlement.ts, seeded rocks), in
 * world metres: a point on its surface `height` above the ground at the post and its outward normal there. Measured by
 * casting at the built boulders; tests/presentation/workContact.test.ts checks it against the real geometry.
 */
export const QUARRY_FACE_CONTACT = { x: 108.85, z: -32.17, height: 1.0, normal: [0.412, 0.016, -0.911] as [number, number, number] } as const;

const toActor = (at: WorkStance, x: number, z: number): [number, number] => {
  const dx = x - at.x, dz = z - at.z, c = Math.cos(at.yaw), s = Math.sin(at.yaw);
  return [dx * c - dz * s, dx * s + dz * c];
};
const toWorld = (at: WorkStance, x: number, z: number): [number, number] => {
  const c = Math.cos(at.yaw), s = Math.sin(at.yaw);
  return [at.x + x * c + z * s, at.z - x * s + z * c];
};

const counterTops = new WeakMap<object, number>();

/** The surface a resident works against at `anchor`, in their frame as they stand; undefined where nothing is touched. */
export function workSiteFor(anchor: string, at: WorkStance, terrain: Pick<Terrain, 'groundAt'> & Partial<Pick<Terrain, 'heightAt'>>): WorkSite | undefined {
  switch (anchor) {
    case 'hunter_station': {
      let top = counterTops.get(terrain);
      if (top === undefined) counterTops.set(terrain, top = hunterTableSurfaceY({ heightAt: (x, z) => terrain.heightAt?.(x, z) ?? terrain.groundAt(x, z) }));
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => {
        const p = hunterStationPoint(sx! * T.width / 2, sz! * T.depth / 2);
        return toActor(at, p.x, p.z);
      });
      return { kind: 'counter', top: top - at.y,
        x0: Math.min(...corners.map(c => c[0])), x1: Math.max(...corners.map(c => c[0])),
        z0: Math.min(...corners.map(c => c[1])), z1: Math.max(...corners.map(c => c[1])) };
    }
    case 'quarry_face': {
      const f = QUARRY_FACE_CONTACT, [x, z] = toActor(at, f.x, f.z);
      const c = Math.cos(at.yaw), s = Math.sin(at.yaw), [nx, ny, nz] = f.normal;
      return { kind: 'face', point: [x, f.height, z],
        normal: [nx * c - nz * s, ny, nx * s + nz * c] };
    }
    case 'wetland_edge':
      return { kind: 'ground', heightAt: (x, z) => { const [wx, wz] = toWorld(at, x, z); return terrain.groundAt(wx, wz) - at.y; } };
    default:
      return undefined;
  }
}
