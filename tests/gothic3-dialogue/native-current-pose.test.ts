import { describe, expect, it } from 'vitest';
import { trackNativePoseFromMotion } from '../../src/gothic3/native-current-pose';

describe('native TrackCurrentPose extraction', () => {
  it('reads the pose pair and blend weight from the installed Hero idle motion name', () => {
    const result = trackNativePoseFromMotion(
      'Hero_Stand_None_None_P0_Ambient_Loop_N_Fwd_00_%_02_P0_0', 0, 4, 0);

    expect(result).toMatchObject({ status: 'resolved', value: {
      primaryPose: 1, alternatePose: 1, blendWeight: 1, normalizedPlayTime: 0,
      evidence: 'Game:202f90c0',
    } });
  });

  it('follows the source transition-direction swap for the Hero fist hit motion', () => {
    const filename = 'Hero_Stand_None_Fist_P0_Attack_Hit_N_Fwd_00_%_00_P1_100_R';
    const firstHalf = trackNativePoseFromMotion(filename, 0.16, 0.32, 0);
    const secondHalf = trackNativePoseFromMotion(filename, 0.24, 0.32, 0);

    expect(firstHalf).toMatchObject({ status: 'resolved', value: {
      primaryPose: 1, alternatePose: 2, blendWeight: 0.5,
    } });
    expect(secondHalf).toMatchObject({ status: 'resolved', value: {
      primaryPose: 2, alternatePose: 1, blendWeight: 0.75,
    } });
  });

  it('rejects absent actor transition data and incomplete source motion names', () => {
    expect(trackNativePoseFromMotion('Hero_Stand_None_None_P0', 0, 1, 0).status).toBe('unsupported');
    expect(trackNativePoseFromMotion('Hero_Stand_None_None_P0_Ambient_Loop_N_Fwd_00_%_02_P0_0', 0, 1, 2))
      .toMatchObject({ status: 'unsupported', dependencies: ['actor-transition-state'] });
  });
});
