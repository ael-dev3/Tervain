import { describe, expect, it } from 'vitest';
import { planNativePickpocket, resolveNativePickpocketAction } from '../../src/gothic3/pickpocket';
import { generateNativePickpocketLoot } from '../../src/gothic3/native-treasure-sets';
import type { NativePickpocketSkills } from '../../src/gothic3/pickpocket';
import type { NativeTreasureSetResolution } from '../../src/gothic3/native-treasure-sets';

const skill = (value: boolean) => ({ status: 'known' as const, value, source: 'test source skill state' });
const noPerks: NativePickpocketSkills = { pickpocket2: skill(false), pickpocket3: skill(false) };

const pickpocketSet = (distribution = 7, candidates = [
  { treasureSetName: 'TS_Test', treasureSetGuid20: 'a'.repeat(40),
    treasureSetSourcePath: 'Treasure/Test.tple', treasureSetSourceSha256: 'b'.repeat(64),
    itemName: 'It_TestOne', itemGuid20: 'c'.repeat(40), itemSourcePath: 'Items/TestOne.tple',
    itemSourceSha256: 'd'.repeat(64), configuredAmount: 80, configuredQuality: 256 },
  { treasureSetName: 'TS_Test', treasureSetGuid20: 'a'.repeat(40),
    treasureSetSourcePath: 'Treasure/Test.tple', treasureSetSourceSha256: 'b'.repeat(64),
    itemName: 'It_TestTwo', itemGuid20: 'e'.repeat(40), itemSourcePath: 'Items/TestTwo.tple',
    itemSourceSha256: 'f'.repeat(64), configuredAmount: 10, configuredQuality: 4 },
]): NativeTreasureSetResolution => ({
  name: 'TS_Test', guid20: 'a'.repeat(40), sourcePath: 'Treasure/Test.tple', sourceSha256: 'b'.repeat(64),
  distribution, minimumTransferStacks: 0, maximumTransferStacks: 0,
  status: distribution === 7 ? 'pickpocket-source-resolved' : 'generation-not-implemented', reason: null,
  weaponry: [], plunderCandidates: [], pickpocketCandidates: candidates,
});

describe('native PickPocket arithmetic', () => {
  it('uses the initialized Theft value and the inclusive native roll comparison', () => {
    expect(planNativePickpocket(29, 100, 99, noPerks)).toMatchObject({ status: 'attempt', value: {
      difficultyLevel: 29, successThreshold: 106, succeeded: true,
    } });
    expect(planNativePickpocket(36, 100, 99, { ...noPerks, pickpocket2: skill(true) })).toMatchObject({
      status: 'attempt', value: { difficultyLevel: 36, successThreshold: 99, succeeded: true },
    });
    expect(planNativePickpocket(37, 100, 99, { ...noPerks, pickpocket2: skill(true) })).toMatchObject({
      status: 'attempt', value: { difficultyLevel: 37, successThreshold: 98, succeeded: false },
    });
  });

  it('requires PickPocket II at levels 30–44 and PickPocket III from level 45', () => {
    expect(planNativePickpocket(30, 100, 0, noPerks)).toMatchObject({ status: 'blocked',
      reason: 'TooHard', requiredPerk: 'Perk_PickPocket_2' });
    expect(planNativePickpocket(44, 100, 0, noPerks)).toMatchObject({ status: 'blocked',
      reason: 'TooHard', requiredPerk: 'Perk_PickPocket_2' });
    expect(planNativePickpocket(45, 100, 0, noPerks)).toMatchObject({ status: 'blocked',
      reason: 'Impossible', requiredPerk: 'Perk_PickPocket_3' });
    expect(planNativePickpocket(45, 100, 0, { ...noPerks, pickpocket3: skill(true) })).toMatchObject({
      status: 'attempt', value: { successThreshold: 90, succeeded: true },
    });
  });

  it('caps the chance difficulty at target LevelMax 50 and keeps unresolved perks gated', () => {
    expect(planNativePickpocket(100, 100, 85, { ...noPerks, pickpocket3: skill(true) })).toMatchObject({
      status: 'attempt', value: { difficultyLevel: 50, successThreshold: 85, succeeded: true },
    });
    expect(planNativePickpocket(30, 100, 0, { ...noPerks,
      pickpocket2: { status: 'unknown', reason: 'skill source missing' } })).toMatchObject({
      status: 'unsupported', reason: 'skill source missing',
    });
  });
});

describe('distribution-7 PickPocket treasure generation', () => {
  it('selects a source stack, applies native half-plus-random amount, and preserves quality', () => {
    const values = [3, 19];
    const draws: number[] = [];
    const result = generateNativePickpocketLoot(pickpocketSet(), 4, () => {
      const value = values[draws.length]!;
      draws.push(value);
      return value;
    });
    expect(draws).toEqual([3, 19]);
    expect(result).toMatchObject({ treasureSetSlot: 4, itemName: 'It_TestTwo', amount: 9,
      configuredAmount: 10, configuredQuality: 4, creationQuality: 4, createItemsFlag: true });
  });

  it('uses the native one-item floor without consuming random values for bounds below two', () => {
    const source = pickpocketSet(7, [{ ...pickpocketSet().pickpocketCandidates[0]!, configuredAmount: 1 }]);
    let draws = 0;
    expect(generateNativePickpocketLoot(source, 1, () => (++draws, 7))).toMatchObject({ amount: 1 });
    expect(draws).toBe(0);
  });

  it('rejects unresolved distributions, invalid slots and out-of-domain random draws', () => {
    expect(() => generateNativePickpocketLoot(pickpocketSet(0), 1, () => 0)).toThrow(/distribution-7/);
    expect(() => generateNativePickpocketLoot(pickpocketSet(), 6, () => 0)).toThrow(/slot 1\.\.5/);
    expect(() => generateNativePickpocketLoot(pickpocketSet(), 1, () => 0x8000)).toThrow(/0\.\.32767/);
  });

  it('checks the perk gate before drawing and adds loot only after a successful roll', () => {
    const set = { ...pickpocketSet(), treasureSetSlot: 5 };
    const bounds: number[] = [];
    const values = [3, 19];
    const draws: number[] = [];
    const success = resolveNativePickpocketAction(20, 100, noPerks, [set], (bound) => {
      bounds.push(bound); return 0;
    }, () => {
      const value = values[draws.length]!; draws.push(value); return value;
    });
    expect(success).toMatchObject({ status: 'succeeded', attempt: { roll: 0 },
      loot: [{ treasureSetSlot: 5, itemName: 'It_TestTwo', amount: 9, creationQuality: 4 }] });
    expect(bounds).toEqual([100]);
    expect(draws).toEqual([3, 19]);

    let blockedDraws = 0;
    expect(resolveNativePickpocketAction(30, 100, noPerks, [set], () => (++blockedDraws, 0), () => 0))
      .toMatchObject({ status: 'blocked', requiredPerk: 'Perk_PickPocket_2' });
    expect(blockedDraws).toBe(0);

    let failedLootDraws = 0;
    expect(resolveNativePickpocketAction(20, 0, noPerks, [set], () => 99, () => (++failedLootDraws, 0)))
      .toMatchObject({ status: 'failed', attempt: { succeeded: false } });
    expect(failedLootDraws).toBe(0);
  });

  it('does not draw when a target treasure-set slot is unresolved', () => {
    let draws = 0;
    expect(resolveNativePickpocketAction(20, 100, noPerks, [{ status: 'unresolved', treasureSetSlot: 5,
      name: 'TS_Unknown', reason: 'source entry missing' }], () => (++draws, 0), () => 0))
      .toMatchObject({ status: 'unsupported', reason: /unresolved/ });
    expect(draws).toBe(0);
  });
});
