import { deriveNativeNpcStats } from './combat';
import type { CombatResult, NativeActorCombatState, NativeDifficulty, NativeNpcStats } from './combat';

export interface NativeNpcSerializedPoints {
  readonly hitPoints: number;
  readonly hitPointsMax: number;
  readonly stamina: number;
  readonly staminaMax: number;
}

export interface NativeNpcProcessingRangeState {
  readonly stats: NativeNpcStats;
  readonly hitPoints: number;
  readonly hitPointsMax: number;
  readonly stamina: number;
  readonly staminaMax: number;
}

const I32_MIN = -0x80000000;
const I32_MAX = 0x7fffffff;
const PROCESSING_RANGE_EVIDENCE = Object.freeze([
  'Script_Game:100cec10', 'Script_Game:100477c0', 'Script_Game:10046960',
  'Script_Game:100467f0', 'Script_Game:10047530', 'Script_Game:10045c90', 'Script_Game:10045b20',
]);

function signed32(value: number): boolean {
  return Number.isInteger(value) && value >= I32_MIN && value <= I32_MAX;
}

/** Models the final state of NPC OnEnterProcessingRange's two-step point
 * refresh. The native callback first clamps/preserves the old current value
 * while setting the derived maximum, then fills current stamina and HP to those
 * refreshed maxima. It does not alter the source actor record; the returned
 * points belong to the caller's live NPC runtime. */
export function initializeNativeNpcOnProcessingRange(
  actor: Pick<NativeActorCombatState, 'isPlayer' | 'rawLevel' | 'rawLevelMax' | 'species'>,
  serialized: NativeNpcSerializedPoints,
  playerLevel: number,
  difficulty: NativeDifficulty,
): CombatResult<NativeNpcProcessingRangeState> {
  if (![serialized.hitPoints, serialized.hitPointsMax, serialized.stamina, serialized.staminaMax].every(signed32)) {
    return { status: 'unsupported', reason: 'Serialized NPC point properties are outside the observed signed32 domain.',
      dependencies: ['gCDamageReceiver_PS'] };
  }
  const stats = deriveNativeNpcStats(actor, playerLevel, difficulty);
  if (stats.status === 'unsupported') return stats;
  const { refreshedHitPointsMax: hitPointsMax, refreshedStaminaMax: staminaMax } = stats.value;
  return { status: 'resolved', value: Object.freeze({ stats: stats.value,
    hitPoints: hitPointsMax, hitPointsMax, stamina: staminaMax, staminaMax }),
    evidence: Object.freeze([...stats.evidence, ...PROCESSING_RANGE_EVIDENCE]) };
}
