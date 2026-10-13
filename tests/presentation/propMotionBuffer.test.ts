import { beforeAll, describe, expect, it } from 'vitest';
import { Colliders } from '../../src/world/colliders';
import { initializePhysics, RealmPhysics, type PropMotion } from '../../src/world/physics';
import { Terrain } from '../../src/world/terrain';

beforeAll(initializePhysics);

describe('caller-owned cargo motion buffers', () => {
  it('preserves retained snapshots while updating reusable records through held and sleeping states', () => {
    const physics = new RealmPhysics(new Terrain(), new Colliders());
    try {
      const snapshot = physics.motions(), saved = structuredClone(snapshot);
      const out: PropMotion[] = [], first = physics.motions(out), record = first[0]!;
      expect(physics.grab(record.id)).toBe(true);
      expect(physics.motions(out)).toBe(first);
      expect(out[0]).toBe(record);
      expect(record.held).toBe(true);
      physics.throw(.4, -.2);
      expect(physics.motions(out)).toEqual(physics.motions());
      expect(record.held).toBe(false);
      expect(Math.hypot(record.vx, record.vy, record.vz)).toBeGreaterThan(0);
      // A sleeping body must clear prior active velocities in the reused output.
      const bodies = (physics as unknown as { props: { body: { sleep(): void } }[] }).props;
      for (const prop of bodies) prop.body.sleep();
      out.push({ ...record });
      physics.motions(out);
      expect(out).toHaveLength(snapshot.length);
      for (const motion of out) expect([motion.vx, motion.vy, motion.vz]).toEqual([0, 0, 0]);
      expect(snapshot).toEqual(saved);
      expect(physics.motions()).not.toBe(physics.motions());
    } finally { physics.dispose(); }
  });
});
