import { describe, expect, it } from 'vitest';
import { NPC_POSE_FAR, NPC_POSE_NEAR, npcPoseInterval } from '../../src/presentation/actors';

describe('resident posing by distance and view (A114)', () => {
  it('poses near residents in view every step', () => {
    expect(npcPoseInterval(0, true)).toBe(0);
    expect(npcPoseInterval(NPC_POSE_NEAR, true)).toBe(0);
  });

  it('poses far residents at 30 Hz, then 15 Hz', () => {
    expect(npcPoseInterval(NPC_POSE_NEAR + 1, true)).toBeCloseTo(2 / 60);
    expect(npcPoseInterval(NPC_POSE_FAR + 1, true)).toBeCloseTo(4 / 60);
  });

  it('poses anyone off screen eight times a second, however near', () => {
    expect(npcPoseInterval(2, false)).toBe(1 / 8);
    expect(npcPoseInterval(200, false)).toBe(1 / 8);
  });
});
