import { describe, expect, it, vi } from 'vitest';
import { buildPhysicalProps } from '../../src/presentation/physicalProps';
import type { RealmPhysics } from '../../src/world/physics';

describe('loose cargo drawn in step (A94 scout)', () => {
  it('shows each prop at its current pose, not the blend from the step before, and offers its meshes for drawing between steps', () => {
    const poses = vi.fn(() => []);
    const physics = { props: [], poses, stats: () => ({ hz: 60, bodies: 0, awake: 0, held: null, steps: 0 }) } as unknown as RealmPhysics;
    const props = buildPhysicalProps(physics, 'low') as ReturnType<typeof buildPhysicalProps> & { movers?: () => unknown[] };
    props.update();
    expect(poses).toHaveBeenCalled();
    for (const call of poses.mock.calls) expect((call as unknown[])[0]).toBe(false);
    expect(props.movers?.()).toEqual([]);
  });
});
