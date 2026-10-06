/** Bounded port of Script_Game.dll PickPocket (0x1004db60).
 *
 * This resolves the source-defined level/perk gate and theft roll only. It
 * does not activate an NPC, execute its caught response, transfer treasure,
 * update enclave crime, or start Ardea_Pocket.
 */
import type { NativeKnowledge } from './combat';
import { generateNativePickpocketLoot } from './native-treasure-sets';
import type { NativeGeneratedPickpocketStack, NativeTreasureSetResolution } from './native-treasure-sets';

export interface NativePickpocketSkills {
  readonly pickpocket2: NativeKnowledge<boolean>;
  readonly pickpocket3: NativeKnowledge<boolean>;
}

export interface NativePickpocketAttempt {
  readonly targetLevelMax: number;
  readonly theft: number;
  readonly roll: number;
  readonly difficultyLevel: number;
  readonly successThreshold: number;
  readonly succeeded: boolean;
  readonly evidence: readonly ['Script_Game:1004db60', 'Script_Game:100481d0'];
}

export type NativePickpocketPlan =
  | { readonly status: 'attempt'; readonly value: NativePickpocketAttempt }
  | { readonly status: 'blocked'; readonly reason: 'TooHard' | 'Impossible'; readonly requiredPerk: 'Perk_PickPocket_2' | 'Perk_PickPocket_3' }
  | { readonly status: 'unsupported'; readonly reason: string };

export type NativePickpocketTreasureSet =
  | { readonly status: 'unresolved'; readonly treasureSetSlot: number; readonly name: string; readonly reason: string }
  | (NativeTreasureSetResolution & { readonly treasureSetSlot: number });

export type NativePickpocketAction =
  | { readonly status: 'blocked'; readonly reason: 'TooHard' | 'Impossible'; readonly requiredPerk: 'Perk_PickPocket_2' | 'Perk_PickPocket_3' }
  | { readonly status: 'unsupported'; readonly reason: string }
  | { readonly status: 'failed'; readonly attempt: NativePickpocketAttempt }
  | { readonly status: 'succeeded'; readonly attempt: NativePickpocketAttempt;
      readonly loot: readonly NativeGeneratedPickpocketStack[] };

function int32(value: number): boolean {
  return Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff;
}

/**
 * Reproduce the installed handler's gate and inclusive roll comparison.
 * Levels 30–44 require PickPocket II; level 45+ requires PickPocket III.
 * Difficulty is capped at 50 for the threshold, and success is `roll <=
 * theft / 2 - difficultyLevel + 85`.
 */
export function planNativePickpocket(targetLevelMax: number, theft: number, roll: number,
  skills: NativePickpocketSkills): NativePickpocketPlan {
  if (!Number.isInteger(targetLevelMax) || targetLevelMax < 0 || targetLevelMax > 0xffffffff || !int32(theft)) {
    return { status: 'unsupported', reason: 'PickPocket requires a native unsigned target LevelMax and signed Theft value.' };
  }
  if (!Number.isInteger(roll) || roll < 0 || roll > 99) {
    return { status: 'unsupported', reason: 'Entity::GetRandomNumber(100) must resolve to a 0..99 roll.' };
  }
  let requiredPerk: 'Perk_PickPocket_2' | 'Perk_PickPocket_3' | null = null;
  let skill: NativeKnowledge<boolean> | null = null;
  if (targetLevelMax >= 45) {
    requiredPerk = 'Perk_PickPocket_3';
    skill = skills.pickpocket3;
  } else if (targetLevelMax >= 30) {
    requiredPerk = 'Perk_PickPocket_2';
    skill = skills.pickpocket2;
  }
  if (skill?.status === 'unknown') return { status: 'unsupported', reason: skill.reason };
  if (requiredPerk && skill?.status === 'known' && !skill.value) {
    return { status: 'blocked', reason: requiredPerk === 'Perk_PickPocket_2' ? 'TooHard' : 'Impossible', requiredPerk };
  }
  const difficultyLevel = Math.min(targetLevelMax, 50);
  const successThreshold = Math.trunc(theft / 2) - difficultyLevel + 85;
  return { status: 'attempt', value: Object.freeze({ targetLevelMax, theft, roll, difficultyLevel,
    successThreshold, succeeded: roll <= successThreshold,
    evidence: Object.freeze(['Script_Game:1004db60', 'Script_Game:100481d0'] as const) }) };
}

/** Resolve the source-defined attempt and its distribution-7 loot without
 * mutating the player or NPC. Random callbacks are supplied by the owning
 * browser session so its stream can be saved with gameplay state. */
export function resolveNativePickpocketAction(targetLevelMax: number, theft: number,
  skills: NativePickpocketSkills, treasureSets: readonly NativePickpocketTreasureSet[],
  nextRandomNumber: (upperBound: number) => number, nextRandomRaw: () => number): NativePickpocketAction {
  // The native handler checks the required perk before drawing its success roll.
  const gate = planNativePickpocket(targetLevelMax, theft, 0, skills);
  if (gate.status !== 'attempt') return gate;

  const slots = new Set<number>();
  for (const set of treasureSets) {
    if (!Number.isInteger(set.treasureSetSlot) || set.treasureSetSlot < 1 || set.treasureSetSlot > 5 ||
        slots.has(set.treasureSetSlot)) {
      return { status: 'unsupported', reason: 'Native PickPocket needs unique source treasure-set slots 1..5.' };
    }
    slots.add(set.treasureSetSlot);
    if (set.status === 'unresolved') {
      return { status: 'unsupported', reason: 'PickPocket treasure set ' + set.name + ' is unresolved: ' + set.reason };
    }
    if (set.distribution === 7 && set.status !== 'pickpocket-source-resolved') {
      return { status: 'unsupported', reason: 'Distribution-7 PickPocket source is not fully resolved: ' + set.name };
    }
  }

  const roll = nextRandomNumber(100);
  const planned = planNativePickpocket(targetLevelMax, theft, roll, skills);
  if (planned.status !== 'attempt') return planned;
  if (!planned.value.succeeded) return Object.freeze({ status: 'failed', attempt: planned.value });

  try {
    const loot = treasureSets.slice().sort((a, b) => a.treasureSetSlot - b.treasureSetSlot)
      .flatMap((set) => set.status !== 'unresolved' && set.distribution === 7
        ? [generateNativePickpocketLoot(set, set.treasureSetSlot, nextRandomRaw)].filter((entry): entry is NativeGeneratedPickpocketStack => entry !== null)
        : []);
    return Object.freeze({ status: 'succeeded', attempt: planned.value, loot: Object.freeze(loot) });
  } catch (error) {
    return { status: 'unsupported', reason: error instanceof Error ? error.message : String(error) };
  }
}
