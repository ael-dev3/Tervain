import { describe, expect, it } from 'vitest';
import { planNativeGiveXp, planNativeGiveXpSequence } from '../../src/gothic3/combat';
import type { NativePlayerProgress } from '../../src/gothic3/combat';

const freshPlayer: NativePlayerProgress = {
  xp: 0,
  level: 0,
  lp: 0,
  learnPerkActive: { status: 'unknown', reason: 'Perk_Learn startup state is unresolved.' },
};
const sourceSeedPlayer: NativePlayerProgress = {
  xp: 0,
  level: 0,
  lp: 0,
  learnPerkActive: { status: 'known', value: false,
    source: 'inventory/starting-inventory.json#stacks[75]+Game:201ae890+Script_Game:100628c0' },
};

describe('native Script_Game GiveXP', () => {
  it('multiplies a world award by five and plans a below-threshold Hero update', () => {
    const result = planNativeGiveXp(freshPlayer, 50);
    expect(result).toMatchObject({ status: 'resolved', value: {
      requestedAmount: 50,
      awardedAmount: 250,
      progress: { xp: 250, level: 0, lp: 0, levelUp: false },
    } });
  });

  it('keeps level-up awards unsupported while Perk_Learn is unresolved', () => {
    const result = planNativeGiveXp(freshPlayer, 100);
    expect(result).toMatchObject({ status: 'unsupported', dependencies: ['inventory:Perk_Learn'] });
  });

  it('awards the native single-level and ten learning-point increase for the verified inactive starting Perk_Learn stack', () => {
    const result = planNativeGiveXp(sourceSeedPlayer, 250);
    expect(result).toMatchObject({ status: 'resolved', value: {
      requestedAmount: 250,
      awardedAmount: 1250,
      progress: { xp: 1250, level: 1, lp: 10, levelUp: true },
    } });
  });

  it('preflights consecutive awards cumulatively before a dialogue script starts', () => {
    const result = planNativeGiveXpSequence(freshPlayer, [50, 50]);
    expect(result).toMatchObject({ status: 'unsupported', dependencies: ['inventory:Perk_Learn'] });
  });

  it('rejects operands whose native world multiplier leaves the bounded int32 domain', () => {
    const result = planNativeGiveXp(freshPlayer, 0x20000000);
    expect(result).toMatchObject({ status: 'unsupported', dependencies: ['xp-overflow'] });
  });
});
