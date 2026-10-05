/** Verified arithmetic/state subset of the installed Gothic3 build.
 *
 * This module is not a contact detector, AI evaluator, native ZS task runner or
 * playable combat integration. Its hit planner requires independently resolved
 * native eligibility. Unknown dependencies produce no state effects.
 * Receipts: public/gothic3/combat/manifest.json and native-combat-evidence.json.
 */

export type NativeDifficulty = 0 | 1 | 2;
export type NativeMeleeDamageKind = 1 | 2;
export type NativeKnowledge<T> =
  | { readonly status: 'known'; readonly value: T; readonly source: string }
  | { readonly status: 'unknown'; readonly reason: string };
export type CombatResult<T> =
  | { readonly status: 'resolved'; readonly value: T; readonly evidence: readonly string[] }
  | { readonly status: 'unsupported'; readonly reason: string; readonly dependencies: readonly string[] };

export const NATIVE_COMBAT_CONSTANTS = Object.freeze({
  playerProtectionScale: 0.4000000059604645,
  npcProtectionScale: 1.5,
  npcStrengthMultiplier: -1.5,
  fistHitPhaseFraction: 0.6000000238418579,
  beginPhaseFraction: 0.5,
  xpNextMultiplier: 250,
});

/** Native animation labels can repeat for distinct Action values. */
export const NativeCombatAction = Object.freeze({
  attack: 1, powerAttack: 2, quickAttack: 3, quickAttackR: 4, quickAttackL: 5,
  pierceAttack: 8, finishingAnimationVariant11: 11, finishingAttack: 12,
  quickParadeStumble: 17, paradeStumble: 18, heavyParadeStumble: 21,
  quickStumble: 22, stumble: 23, stumbleR: 24, stumbleL: 25,
  sitKnockDown: 26, getUpAttack: 27, getUpParade: 28,
  lieKnockDown: 29, lieKnockOut: 30, lieDead: 33,
});

export type NativeCombatPerk =
  | 'Perk_1H_2' | 'Perk_1H_3' | 'Perk_OrcSlayer'
  | 'Perk_Shield_2' | 'Perk_LightArmor' | 'Perk_HeavyArmor' | 'Perk_Learn';
export type NativeCombatSkills = Readonly<Partial<Record<NativeCombatPerk, NativeKnowledge<boolean>>>>;

export interface NativeHands {
  readonly leftUseType: number; // Native slot2.
  readonly rightUseType: number; // Native slot1.
}

export interface NativeActorCombatState {
  readonly id: string;
  readonly name: string;
  readonly isPlayer: boolean;
  readonly species: number;
  readonly npcType: number;
  readonly rawLevel: number;
  readonly rawLevelMax: number;
  readonly hasPlayerMemory: boolean;
  readonly transformed: boolean;
  readonly navigationValid: boolean;
  readonly damageReceiverValid: boolean;
  readonly initialization: 'initialized' | 'serialized' | 'unknown';
  readonly hitPoints: number;
  readonly hitPointsMax: number;
  readonly stamina: number;
  readonly staminaMax: number;
  readonly action: number;
  readonly aniState: number;
  readonly primaryPose: number;
  readonly statePosition: number;
  readonly hands: NativeHands;
  readonly currentAttackerId: NativeKnowledge<string | null>;
  readonly armorIsRobe: NativeKnowledge<boolean>;
  readonly skills: NativeCombatSkills;
  readonly enclavePresent: NativeKnowledge<boolean>;
}

export interface NativeMeleeCarrier {
  readonly id: string;
  readonly ownerId: string | null;
  readonly damageKind: number;
  readonly damageAmount: number;
  readonly damageHitMultiplier: number;
  readonly itemQualityBits: number;
  readonly spellPresent: NativeKnowledge<boolean>;
  readonly projectilePresent: NativeKnowledge<boolean>;
}

export interface NativeNpcStats {
  readonly level: number;
  readonly levelMax: number;
  readonly currentLevel: number;
  readonly strength: number;
  readonly refreshedHitPointsMax: number;
  readonly refreshedStaminaMax: number;
}

export interface NativeMeleeCalculation {
  readonly baseProduct: number;
  readonly qualityBonus: number;
  readonly statBonus: number;
  readonly perkBonus: number;
  readonly preProtection: number;
  readonly protectionPercent: number;
  readonly protectionRemoved: number;
  readonly finalDamage: number;
  readonly attackRank: number;
  readonly defenseRank: number;
  readonly severity: number;
}

export interface NativeHeroMeleeInput {
  readonly attacker: NativeActorCombatState;
  readonly victim: NativeActorCombatState;
  readonly carrier: NativeMeleeCarrier;
  readonly playerStrength: number;
  readonly playerLevel: number;
  readonly difficulty: NativeDifficulty;
}

export interface NativeGuardCalculation {
  readonly allowed: boolean;
  readonly cost: number;
  readonly staminaAfter: number;
  readonly deficitHitPointDelta: number;
  readonly hitPointsAfterDeficit: number;
  readonly reaction: 17 | 18 | 21 | null;
  readonly fallsThroughToOrdinaryDamage: boolean;
}

export interface NativeDirectionalAttitudes {
  readonly victimTowardAttacker: NativeKnowledge<number>;
  readonly attackerTowardVictim: NativeKnowledge<number>;
}

export interface NativeContactAcceptance {
  readonly method: 'manual-fist-OnHit' | 'touch-OnTouchDamage';
  readonly accepted: boolean;
  /** Receipt for the external contact/state/party/target eligibility evaluator.
   * A known mathematical distance alone cannot establish native eligibility. */
  readonly source: string;
}

export type NativeCombatEffect =
  | { readonly type: 'setLastAttacker'; readonly victimId: string; readonly attackerId: string | null }
  | { readonly type: 'setCurrentAttacker'; readonly victimId: string; readonly attackerId: string }
  | { readonly type: 'setStamina'; readonly victimId: string; readonly value: number; readonly delta: number }
  | { readonly type: 'setHitPoints'; readonly victimId: string; readonly value: number; readonly delta: number }
  | { readonly type: 'setReceiverDamage'; readonly victimId: string; readonly amount: number }
  | { readonly type: 'fullStopAndSetTask'; readonly victimId: string; readonly task: string; readonly reaction: number }
  | { readonly type: 'perception'; readonly victimId: string; readonly attackerId: string; readonly kind: 'Attack' | 'Defeat' | 'Murder' }
  | { readonly type: 'setLastInflictor'; readonly victimId: string; readonly carrierId: string }
  | { readonly type: 'nativeBoundary'; readonly victimId: string; readonly operation: 'impactEffects' | 'entityOnDamage' };

export interface NativeMeleePlan {
  readonly accepted: boolean;
  readonly calculation: NativeMeleeCalculation | null;
  readonly guard: NativeGuardCalculation | null;
  readonly reaction: number | null;
  readonly engineAppliesReceiverDamage: boolean;
  readonly effects: readonly NativeCombatEffect[];
  /** These native effects are outside this kernel and must be implemented by
   * the eventual task/contact runtime; they are not fabricated here. */
  readonly deferredNativeBehavior: readonly string[];
}

const I32_MIN = -0x80000000;
const I32_MAX = 0x7fffffff;
const E = Object.freeze({
  stats: ['Script_Game:10046c30', 'Script_Game:10046d30', 'Script_Game:10047a20', 'Script_Game:10047cd0', 'Script_Game:10047530', 'Script_Game:100477c0'],
  math: ['Script_Game:1003d6a0', 'Script_Game:1007f000', 'Script_Game:1003cbc0', 'Script_Game:1003c980'],
  rank: ['Script_Game:1003d1d0', 'Script_Game:1003d4d0', 'Script_Game:1003d5a0'],
  guard: ['Script_Game:100169d0', 'Script_Game:10016c60', 'Script_Game:10016830', 'Script_Game:10016e70', 'Script_Game:100171c0', 'Script_Game:1003d6a0', 'Script_Game:100467f0', 'Script_Game:10046af0', 'Script_Game:10045b20', 'Script_Game:10045e20'],
  death: ['Script_Game:1003c550', 'Script_Game:1003c6b0', 'Script_Game:1001aca0', 'Script_Game:1001b0c0'],
  xp: ['Script_Game:10027e70', 'Script_Game:100362f0', 'Script_Game:100628c0', 'Script_Game:100627e0'],
});

function resolved<T>(value: T, evidence: readonly string[]): CombatResult<T> {
  return { status: 'resolved', value, evidence };
}
function unsupported<T>(reason: string, ...dependencies: string[]): CombatResult<T> {
  return { status: 'unsupported', reason, dependencies };
}
function i32(value: number): boolean {
  return Number.isInteger(value) && value >= I32_MIN && value <= I32_MAX;
}
function nonnegativeI32(value: number): boolean { return i32(value) && value >= 0; }
function trunc(value: number): number { return Math.trunc(value) || 0; }
function add(a: number, b: number): number { return (a + b) | 0; }
function sub(a: number, b: number): number { return (a - b) | 0; }
function clampPoints(value: number, maximum: number): number { return Math.min(maximum, Math.max(0, value)); }
function active(skills: NativeCombatSkills, name: NativeCombatPerk): CombatResult<boolean> {
  const state = skills[name];
  if (!state || state.status === 'unknown') {
    return unsupported(`Active skill ${name} is unresolved.`, `inventory:${name}`);
  }
  if (!state.source) return unsupported(`Active skill ${name} lacks source provenance.`, `inventory:${name}`);
  return resolved(state.value, ['Game:201ae890', 'Game:201ae790']);
}
function initialized(actor: NativeActorCombatState): CombatResult<true> {
  if (actor.initialization !== 'initialized') {
    return unsupported(`${actor.id} has no resolved native initialization state.`, `initialization:${actor.id}`);
  }
  if (![actor.hitPoints, actor.hitPointsMax, actor.stamina, actor.staminaMax].every(nonnegativeI32)
      || actor.hitPoints > actor.hitPointsMax || actor.stamina > actor.staminaMax) {
    return unsupported(`${actor.id} has invalid or unsupported native point values.`, `points:${actor.id}`);
  }
  if (![actor.species, actor.npcType, actor.rawLevel, actor.rawLevelMax, actor.action,
        actor.aniState, actor.primaryPose, actor.statePosition,
        actor.hands.leftUseType, actor.hands.rightUseType].every(i32)) {
    return unsupported(`${actor.id} has unresolved or out-of-domain native integer state.`, `native-state:${actor.id}`);
  }
  return resolved(true, ['Script_Game:100cec10', 'Script_Game:100cf340']);
}

export function isNativeHumanoid(species: number): boolean { return species === 0 || species === 5; }
export function isNativeEvil(species: number): boolean { return [1, 2, 3, 4, 38, 48, 49, 50].includes(species); }
export function isNativeAmbientCreature(species: number): boolean {
  return [24, 25, 26, 27, 28, 30, 31, 32, 35, 36, 37, 42, 43, 44, 45, 46, 47].includes(species);
}

/** Native FindSkillStackIndex match must be resolved before this predicate. */
export function nativeSkillActive(stack: NativeKnowledge<null | {
  readonly referencedSkillMatches: boolean; readonly learnable: boolean;
  readonly learned: boolean; readonly activationCount: number;
}>): CombatResult<boolean> {
  if (stack.status === 'unknown') return unsupported(stack.reason, 'inventory:FindSkillStackIndex');
  if (!stack.source) return unsupported('Skill lookup lacks source provenance.', 'inventory:FindSkillStackIndex');
  if (stack.value === null) return resolved(false, ['Game:201ae790', 'Game:201ae890']);
  const value = stack.value;
  if (!i32(value.activationCount)) return unsupported('ActivationCount is outside signed32bit domain.', 'inventory:ActivationCount');
  return resolved(value.referencedSkillMatches && value.learnable && (value.learned || value.activationCount > 0),
                  ['Game:201ae790', 'Game:201ae890', 'Game:2007f170', 'Game:2007f1d0']);
}

/** Derivation does not refresh or heal a serialized entity. The caller must
 * execute the verified processing-range lifecycle before declaring initialized. */
export function deriveNativeNpcStats(actor: Pick<NativeActorCombatState, 'isPlayer' | 'rawLevel' | 'rawLevelMax' | 'species'>,
                                    playerLevel: number, difficulty: NativeDifficulty): CombatResult<NativeNpcStats> {
  if (actor.isPlayer) return unsupported('NPC derivation cannot replace PlayerMemory stats.', 'player-memory');
  if (![actor.rawLevel, actor.rawLevelMax, playerLevel].every(nonnegativeI32) || ![0, 1, 2].includes(difficulty)) {
    return unsupported('Levels/difficulty are outside the observed finite integer domain.', 'levels', 'difficulty');
  }
  const adjust = difficulty === 2 ? 10 : difficulty === 0 ? -10 : 0;
  if (!i32(actor.rawLevel + adjust) || !i32(actor.rawLevelMax + adjust)) {
    return unsupported('Adjusted levels overflow the bounded native profile.', 'levels');
  }
  const level = Math.max(1, add(actor.rawLevel, adjust));
  const levelMax = Math.max(1, add(actor.rawLevelMax, adjust));
  if (!i32(level + playerLevel) || !i32(levelMax * 20)) {
    return unsupported('Level addition or refreshed-point multiplication overflows the bounded profile.', 'levels');
  }
  const currentLevel = Math.min(add(level, playerLevel), levelMax);
  if (!i32(trunc(currentLevel * NATIVE_COMBAT_CONSTANTS.npcStrengthMultiplier))) {
    return unsupported('NPC strength requires exceptional float-to-integer conversion.', 'levels');
  }
  const strength = sub(10, trunc(currentLevel * NATIVE_COMBAT_CONSTANTS.npcStrengthMultiplier));
  const refreshedHitPointsMax = isNativeAmbientCreature(actor.species) ? 1 : Math.max(100, Math.imul(levelMax, 20));
  const refreshedStaminaMax = Math.max(100, Math.imul(levelMax, isNativeHumanoid(actor.species) ? 10 : 20));
  if (currentLevel < 0 || !nonnegativeI32(strength) || refreshedHitPointsMax < 0 || refreshedStaminaMax < 0) {
    return unsupported('Derived stats overflow the bounded native profile.', 'levels');
  }
  return resolved({ level, levelMax, currentLevel, strength, refreshedHitPointsMax, refreshedStaminaMax }, E.stats);
}

export function nativeQualityBonus(baseProduct: number, qualityBits: number): CombatResult<number> {
  if (!i32(baseProduct) || !i32(qualityBits)) return unsupported('Quality inputs are outside signed32bit domain.', 'item-quality');
  let bonus = (qualityBits & 0x100) !== 0 ? -trunc(baseProduct / 2) : 0;
  for (const bit of [0x20, 0x40, 0x80]) if ((qualityBits & bit) !== 0) bonus = add(bonus, 10);
  return resolved(bonus, ['Script_Game:1007f000']);
}

function heroWeaponRank(actor: NativeActorCombatState): CombatResult<number> {
  if (actor.hands.rightUseType === 8 && actor.hands.leftUseType === 0) return resolved(0, E.rank);
  if (actor.hands.rightUseType !== 2 || ![0, 9].includes(actor.hands.leftUseType)) {
    return unsupported('Only native fist and single one-hand Hero configuration is implemented.', 'weapon-mode');
  }
  const master = active(actor.skills, 'Perk_1H_3');
  if (master.status === 'unsupported') return master;
  if (master.value) return resolved(2, E.rank);
  const advanced = active(actor.skills, 'Perk_1H_2');
  if (advanced.status === 'unsupported') return advanced;
  return resolved(advanced.value ? 1 : 0, E.rank);
}

function ordinaryRanks(input: NativeHeroMeleeInput, victimLevel: number): CombatResult<{ attack: number; defense: number; severity: number }> {
  const hero = heroWeaponRank(input.attacker);
  if (hero.status === 'unsupported') return hero;
  const action = input.attacker.action;
  if (![1, 2, 3, 4, 5].includes(action)) return unsupported('This Hero attack action is outside the bounded subset.', 'attack-action');
  const attack = hero.value + (action === 1 ? 2 : action === 2 ? 4 : 0);
  let defense = input.victim.action === 28 ? 2 : victimLevel >= 45 ? 3 : victimLevel >= 30 ? 2 : victimLevel >= 15 ? 1 : 0;
  if (input.victim.action !== 28 && input.victim.hands.leftUseType === 9) defense += 1;
  return resolved({ attack, defense, severity: Math.max(1, attack - defense) }, E.rank);
}

function npcProtection(actor: NativeActorCombatState, levelMax: number): CombatResult<number> {
  let protection = Math.min(80, trunc(levelMax * NATIVE_COMBAT_CONSTANTS.npcProtectionScale));
  if (actor.armorIsRobe.status === 'unknown' || !actor.armorIsRobe.source) {
    return unsupported('Armor slot17 robe classification is unresolved.', `armor:${actor.id}`);
  }
  const perk = active(actor.skills, actor.armorIsRobe.value ? 'Perk_LightArmor' : 'Perk_HeavyArmor');
  if (perk.status === 'unsupported') return perk;
  if (perk.value) protection = actor.armorIsRobe.value ? add(protection, protection) : add(protection, trunc(protection / 4));
  return resolved(protection, ['Script_Game:10046e30', 'Script_Game:10046f40', 'Script_Game:1003c980']);
}

/** Player protection query is exposed separately; Hero attacks here target NPCs. */
export function nativePlayerProtection(rawProtection: number, armorIsRobe: NativeKnowledge<boolean>,
                                       skills: NativeCombatSkills): CombatResult<number> {
  if (!i32(rawProtection)) return unsupported('Player protection is outside signed32bit domain.', 'player-protection');
  let protection = Math.min(80, trunc(rawProtection * NATIVE_COMBAT_CONSTANTS.playerProtectionScale));
  if (armorIsRobe.status === 'unknown' || !armorIsRobe.source) return unsupported('Armor classification is unresolved.', 'armor-slot17');
  const perk = active(skills, armorIsRobe.value ? 'Perk_LightArmor' : 'Perk_HeavyArmor');
  if (perk.status === 'unsupported') return perk;
  if (perk.value) protection = armorIsRobe.value ? add(protection, protection) : add(protection, trunc(protection / 4));
  return resolved(protection, ['Script_Game:10046e30', 'Script_Game:10046f40', 'Script_Game:1003c980']);
}

/** Math query only: a resolved value is not proof that an attack made contact. */
export function calculateNativeHeroMelee(input: NativeHeroMeleeInput): CombatResult<NativeMeleeCalculation> {
  const { attacker, victim, carrier } = input;
  for (const actor of [attacker, victim]) {
    const state = initialized(actor);
    if (state.status === 'unsupported') return state;
  }
  if (!attacker.isPlayer || !attacker.hasPlayerMemory || attacker.transformed || victim.isPlayer || victim.hasPlayerMemory || victim.transformed) {
    return unsupported('Only untransformed PlayerMemory Hero against an ordinary NPC is implemented.', 'actor-profile');
  }
  if (!victim.navigationValid || !victim.damageReceiverValid || attacker.id === victim.id || carrier.ownerId !== attacker.id) {
    return unsupported('Actor/carrier roles or native property sets are unresolved for this profile.', 'carrier-owner', 'npc-properties');
  }
  for (const [key, value] of [['spell', carrier.spellPresent], ['projectile', carrier.projectilePresent]] as const) {
    if (value.status === 'unknown' || !value.source) return unsupported(`Carrier ${key} classification is unresolved.`, key);
    if (value.value) return unsupported(`The ${key} damage branch is not implemented.`, key);
  }
  if (![1, 2].includes(carrier.damageKind)) return unsupported('Only Impact1 and Blade2 dispatch is implemented.', 'damage-kind');
  // At most24 significant integer bits times a binary32 multiplier fit exactly
  // in binary64. Larger amounts require an explicit x87 precision profile.
  if (!nonnegativeI32(carrier.damageAmount) || carrier.damageAmount > 0xffffff || !i32(carrier.itemQualityBits) || !i32(input.playerStrength)
      || !Number.isFinite(carrier.damageHitMultiplier) || carrier.damageHitMultiplier < 0) {
    return unsupported('Damage/stat inputs are outside the observed finite domain.', 'damage-inputs');
  }
  const product = carrier.damageAmount * Math.fround(carrier.damageHitMultiplier);
  if (!Number.isFinite(product) || product < I32_MIN || product > I32_MAX) {
    return unsupported('Float-to-integer product needs exceptional x87/SSE handling.', 'float-to-int');
  }
  const npc = deriveNativeNpcStats(victim, input.playerLevel, input.difficulty);
  if (npc.status === 'unsupported') return npc;
  const ranks = ordinaryRanks(input, npc.value.level);
  if (ranks.status === 'unsupported') return ranks;
  const baseProduct = trunc(product);
  const quality = nativeQualityBonus(baseProduct, carrier.itemQualityBits);
  if (quality.status === 'unsupported') return quality;
  let perkBonus = 0;
  if (attacker.hands.rightUseType === 2) {
    for (const name of ['Perk_1H_3', 'Perk_1H_2'] as const) {
      const perk = active(attacker.skills, name);
      if (perk.status === 'unsupported') return perk;
      if (perk.value) perkBonus += 25;
    }
  }
  if (victim.species === 5) {
    const perk = active(attacker.skills, 'Perk_OrcSlayer');
    if (perk.status === 'unsupported') return perk;
    if (perk.value) perkBonus += 25;
  }
  // Species0/5 form the selected humanoid profile; other targets have additional
  // Paladin/effect/pose eligibility that is deliberately not inferred here.
  if (!isNativeHumanoid(victim.species)) return unsupported('The selected target profile is humanoid0/5 only.', 'target-species');
  const statBonus = Math.max(0, trunc(input.playerStrength / 2));
  if (!i32(baseProduct + quality.value + statBonus + perkBonus)) {
    return unsupported('Damage accumulation overflows the bounded positive profile.', 'damage-overflow');
  }
  let preProtection = add(add(add(baseProduct, quality.value), statBonus), perkBonus);
  if (attacker.action === 2 && !i32(preProtection * 2)) {
    return unsupported('Power damage overflows the bounded positive profile.', 'damage-overflow');
  }
  if (attacker.action === 2) preProtection = add(preProtection, preProtection);
  else if ([3, 4, 5].includes(attacker.action)) preProtection = trunc(preProtection / 2);
  if (preProtection < 0) return unsupported('Pre-protection damage overflowed the bounded positive profile.', 'damage-overflow');
  const protection = npcProtection(victim, npc.value.levelMax);
  if (protection.status === 'unsupported') return protection;
  const protectionRemoved = trunc(Math.imul(protection.value, preProtection) / 100);
  const finalDamage = Math.max(0, sub(preProtection, protectionRemoved));
  return resolved({ baseProduct, qualityBonus: quality.value, statBonus, perkBonus, preProtection,
                    protectionPercent: protection.value, protectionRemoved, finalDamage,
                    attackRank: ranks.value.attack, defenseRank: ranks.value.defense, severity: ranks.value.severity }, [...E.math, ...E.rank]);
}

function fistMode(actor: NativeActorCombatState): boolean {
  return actor.species !== 8 && [8, 55].includes(actor.hands.rightUseType);
}
function paradeMoveAllowed(victim: NativeActorCombatState, attacker: NativeActorCombatState): boolean {
  if (fistMode(attacker)) return isNativeHumanoid(attacker.species) && fistMode(victim) && isNativeHumanoid(victim.species);
  if (fistMode(victim)) return false;
  return ![8, 11].includes(attacker.action) || (victim.hands.leftUseType === 9 && victim.hands.rightUseType === 2);
}
function paradePose(actor: NativeActorCombatState): boolean {
  const { leftUseType: left, rightUseType: right } = actor.hands;
  if (left === 9 && right === 2) return actor.primaryPose === 2;
  if ((left === 2 && right === 2) || (left === 0 && right === 8)) return [1, 2].includes(actor.primaryPose);
  return actor.primaryPose === 1;
}

export function calculateNativeGuard(attacker: NativeActorCombatState, victim: NativeActorCombatState,
                                      calculation: NativeMeleeCalculation,
                                      victimSeesAttacker: NativeKnowledge<boolean>): CombatResult<NativeGuardCalculation> {
  const state = initialized(victim);
  if (state.status === 'unsupported') return state;
  const candidate = paradeMoveAllowed(victim, attacker) && victim.aniState === 4 && paradePose(victim) && victim.action !== 11;
  if (candidate && (victimSeesAttacker.status === 'unknown' || !victimSeesAttacker.source)) {
    return unsupported('Native defender FOV is unresolved.', 'defender-IsInFOV');
  }
  const allowed = candidate && victimSeesAttacker.status === 'known' && victimSeesAttacker.value;
  if (!allowed) return resolved({ allowed, cost: 0, staminaAfter: victim.stamina, deficitHitPointDelta: 0,
                                  hitPointsAfterDeficit: victim.hitPoints, reaction: null, fallsThroughToOrdinaryDamage: true }, E.guard);
  if (!nonnegativeI32(calculation.preProtection) || !i32(calculation.severity) || calculation.severity < 1) return unsupported('Guard arithmetic input is invalid.', 'guard-inputs');
  const cost = trunc(calculation.preProtection / 2);
  const deficitHitPointDelta = Math.min(0, sub(victim.stamina, cost));
  const staminaAfter = clampPoints(sub(victim.stamina, cost), victim.staminaMax);
  const hitPointsAfterDeficit = clampPoints(add(victim.hitPoints, deficitHitPointDelta), victim.hitPointsMax);
  const reaction = hitPointsAfterDeficit > 0 ? calculation.severity <= 1 ? 17 : calculation.severity === 2 ? 18 : 21 : null;
  return resolved({ allowed, cost, staminaAfter, deficitHitPointDelta, hitPointsAfterDeficit, reaction,
                    fallsThroughToOrdinaryDamage: hitPointsAfterDeficit <= 0 }, E.guard);
}

export function nativeCanBeKilled(victim: Pick<NativeActorCombatState, 'isPlayer' | 'npcType' | 'transformed'>,
                                  playerLevel: number, difficulty: NativeDifficulty): CombatResult<boolean> {
  if (!nonnegativeI32(playerLevel) || !i32(victim.npcType) || ![0, 1, 2].includes(difficulty)) return unsupported('Kill eligibility inputs are unresolved.', 'player-level', 'difficulty', 'victim-npc-type');
  return resolved(!((victim.isPlayer || victim.npcType === 3) && difficulty !== 2 && playerLevel <= 2 && !victim.transformed), ['Script_Game:1003c550']);
}

/** Ordinary nonmagic/nonprojectile melee only. Directed GetAttitude outcomes
 * cannot be replaced by serialized AttitudeToPlayer2. */
export function nativeDeadlyMelee(victim: NativeActorCombatState, attacker: NativeActorCombatState | null,
                                  playerLevel: number, difficulty: NativeDifficulty,
                                  attitudes: NativeDirectionalAttitudes): CombatResult<boolean> {
  const victimState = initialized(victim);
  if (victimState.status === 'unsupported') return victimState;
  if (attacker !== null) {
    const attackerState = initialized(attacker);
    if (attackerState.status === 'unsupported') return attackerState;
  }
  const canKill = nativeCanBeKilled(victim, playerLevel, difficulty);
  if (canKill.status === 'unsupported' || !canKill.value) return canKill;
  if (victim.name === 'Xardas') return resolved(true, E.death);
  if (victim.npcType === 2) {
    if (victim.enclavePresent.status === 'unknown' || !victim.enclavePresent.source) return unsupported('IsBoss enclave resolution is unknown.', `enclave:${victim.id}`);
    if (victim.enclavePresent.value) return resolved(true, E.death);
  }
  if (attacker === null || attacker.action === 12 || !isNativeHumanoid(victim.species) || !isNativeHumanoid(attacker.species)) {
    return resolved(true, E.death);
  }
  const forward = attitudes.victimTowardAttacker;
  if (forward.status === 'unknown' || !forward.source || !i32(forward.value)) return unsupported('Victim-directed native GetAttitude is unknown.', 'attitude:victim-to-attacker');
  if (forward.value === 4 || forward.value === 6) return resolved(true, E.death);
  const reverse = attitudes.attackerTowardVictim;
  if (reverse.status === 'unknown' || !reverse.source || !i32(reverse.value)) return unsupported('Attacker-directed native GetAttitude is unknown.', 'attitude:attacker-to-victim');
  return resolved(reverse.value === 4, E.death);
}

export interface NativeFistHitPhase {
  /** Accepted ordinary loop branch after native SPU/transition early gates. */
  readonly ordinaryLoopBranch: NativeKnowledge<boolean>;
  readonly motionPresent: boolean;
  readonly motionPlaying: boolean;
  readonly playSpeed: number;
  readonly phaseName: string;
  readonly maxTime: number;
  readonly playTime: number;
  readonly alreadyProcessed: boolean;
}

export function nativeFistHitPhase(phase: NativeKnowledge<NativeFistHitPhase>): CombatResult<{ fireOnHit: boolean; markProcessed: boolean; threshold: number | null }> {
  if (phase.status === 'unknown' || !phase.source) return unsupported('Native fist phase is unresolved.', 'fist-hit-phase');
  const value = phase.value;
  if (value.ordinaryLoopBranch.status === 'unknown' || !value.ordinaryLoopBranch.source) return unsupported('Native loop branch eligibility is unresolved.', 'combat-loop-state');
  if (![value.playSpeed, value.maxTime, value.playTime].every(Number.isFinite) || value.maxTime < 0) return unsupported('Motion timing is outside the finite source profile.', 'motion-time');
  if (!value.ordinaryLoopBranch.value || !value.motionPresent || !value.motionPlaying || value.playSpeed === 0 || value.alreadyProcessed
      || value.phaseName.includes('_Begin_') || !value.phaseName.includes('_Hit_')) {
    return resolved({ fireOnHit: false, markProcessed: false, threshold: null }, ['Game:2036a6e0']);
  }
  const nativeMaxTime = Math.fround(value.maxTime);
  // Only MaxTime is explicitly narrowed to float in this call site; PlayTime
  // retains the native getter's double precision.
  if (![nativeMaxTime, Math.fround(value.playSpeed)].every(Number.isFinite)) return unsupported('Timing exceeds the native storage profile.', 'motion-time');
  const threshold = nativeMaxTime * NATIVE_COMBAT_CONSTANTS.fistHitPhaseFraction;
  const fireOnHit = Math.fround(value.playSpeed) !== 0 && value.playTime >= threshold;
  return resolved({ fireOnHit, markProcessed: fireOnHit, threshold }, ['Game:2036a6e0', 'Script_Game:100d01e0']);
}

export interface NativeHeroMeleePlanInput extends NativeHeroMeleeInput {
  readonly contact: NativeKnowledge<NativeContactAcceptance>;
  readonly victimSeesAttacker: NativeKnowledge<boolean>;
  readonly attitudes: NativeDirectionalAttitudes;
  /** Verified ordinary standing/motion-class0 path plus accepted AssessHit
   * early state gates. Sitting, ragdoll and other paths are outside this kernel. */
  readonly assessHitProfile: NativeKnowledge<'ordinary-standing'>;
  /** External native burn/poison/disease/freeze predicates must all be false. */
  readonly specialStatusEffectsAbsent: NativeKnowledge<boolean>;
}

/** Produces a transactional ordered effect plan; it never mutates input actors.
 * A caller must reject unsupported results and execute deferred native tasks
 * separately. This function is deliberately unwired from ordinary gameplay. */
export function planNativeHeroMelee(input: NativeHeroMeleePlanInput): CombatResult<NativeMeleePlan> {
  if (input.contact.status === 'unknown' || !input.contact.source || !input.contact.value.source) return unsupported('Native contact/eligibility is unresolved.', 'native-contact');
  const contact = input.contact.value;
  if (!contact.accepted) return resolved({ accepted: false, calculation: null, guard: null, reaction: null,
                                           engineAppliesReceiverDamage: false, effects: [], deferredNativeBehavior: [] }, ['Script_Game:100d6fa0']);
  if (contact.method === 'manual-fist-OnHit' && !(input.attacker.hands.leftUseType === 0 && input.attacker.hands.rightUseType === 8)) {
    return unsupported('Manual OnHit accepts native fist configuration only.', 'fist-hand-configuration');
  }
  if (input.assessHitProfile.status === 'unknown' || !input.assessHitProfile.source || input.assessHitProfile.value !== 'ordinary-standing') {
    return unsupported('AssessHit state/pose eligibility is unresolved.', 'assess-hit-state-profile');
  }
  if (input.specialStatusEffectsAbsent.status === 'unknown' || !input.specialStatusEffectsAbsent.source || !input.specialStatusEffectsAbsent.value) {
    return unsupported('Special status-effect branches are unresolved or unsupported.', 'burn-poison-disease-freeze');
  }
  const calculation = calculateNativeHeroMelee(input);
  if (calculation.status === 'unsupported') return calculation;
  if (input.victim.hitPoints <= 0 || calculation.value.finalDamage <= 0) {
    return unsupported('Zero/depleted HP or retained receiver-damage edge is outside this profile.', 'receiver-damage-state');
  }
  const guard = calculateNativeGuard(input.attacker, input.victim, calculation.value, input.victimSeesAttacker);
  if (guard.status === 'unsupported') return guard;
  if (input.victim.currentAttackerId.status === 'unknown' || !input.victim.currentAttackerId.source) return unsupported('Previous native CurrentAttacker is unresolved.', 'victim-current-attacker');
  const effects: NativeCombatEffect[] = [
    { type: 'setLastAttacker', victimId: input.victim.id, attackerId: input.victim.currentAttackerId.value },
    { type: 'setCurrentAttacker', victimId: input.victim.id, attackerId: input.attacker.id },
  ];
  if (guard.value.allowed) {
    effects.push({ type: 'setStamina', victimId: input.victim.id, value: guard.value.staminaAfter, delta: -guard.value.cost },
                 { type: 'setHitPoints', victimId: input.victim.id, value: guard.value.hitPointsAfterDeficit, delta: guard.value.deficitHitPointDelta });
  }
  let reaction: number;
  let task: string;
  const engineAppliesReceiverDamage = guard.value.fallsThroughToOrdinaryDamage;
  if (guard.value.reaction !== null) {
    reaction = guard.value.reaction;
    task = reaction === 21 ? 'ZS_HeavyParadeStumble' : 'ZS_ParadeStumble';
  } else {
    effects.push({ type: 'setReceiverDamage', victimId: input.victim.id, amount: calculation.value.finalDamage });
    const predicted = sub(guard.value.hitPointsAfterDeficit, calculation.value.finalDamage);
    if (predicted <= 0) {
      const deadly = nativeDeadlyMelee(input.victim, input.attacker, input.playerLevel, input.difficulty, input.attitudes);
      if (deadly.status === 'unsupported') return deadly;
      reaction = deadly.value ? 33 : calculation.value.severity > 2 ? 30 : 29;
      task = deadly.value ? 'ZS_RagDollDead' : reaction === 30 ? 'ZS_Unconscious' : 'ZS_LieKnockDown';
    } else {
      // Native movement-class0 / ordinary standing path always chooses Stumble,
      // including severity1. Other pose classes have different Quick/Sit paths.
      reaction = 23;
      task = 'ZS_Stumble';
    }
  }
  effects.push({ type: 'fullStopAndSetTask', victimId: input.victim.id, task, reaction },
               { type: 'perception', victimId: input.victim.id, attackerId: input.attacker.id,
                 kind: [29, 30, 34].includes(reaction) ? 'Defeat' : [32, 33, 35].includes(reaction) ? 'Murder' : 'Attack' },
               { type: 'nativeBoundary', victimId: input.victim.id, operation: 'impactEffects' },
               { type: 'setLastInflictor', victimId: input.victim.id, carrierId: input.carrier.id });
  if (engineAppliesReceiverDamage) {
    effects.push({ type: 'setHitPoints', victimId: input.victim.id,
                  value: clampPoints(sub(guard.value.hitPointsAfterDeficit, calculation.value.finalDamage), input.victim.hitPointsMax),
                  delta: -calculation.value.finalDamage });
    effects.push({ type: 'nativeBoundary', victimId: input.victim.id, operation: 'entityOnDamage' });
  }
  return resolved({ accepted: true, calculation: calculation.value, guard: guard.value, reaction,
                    engineAppliesReceiverDamage, effects,
                    deferredNativeBehavior: ['native collision/impact effect selection', 'ZS task execution/ragdoll',
                                              'perception observers', ...(engineAppliesReceiverDamage ? ['eCEntity::OnDamage notifications'] : [])] },
                  [...E.math, ...E.guard, ...E.death, 'Script_Game:100d6fa0', 'Game:201325b0', 'Game:2036a6e0']);
}

export interface NativePlayerProgress {
  readonly xp: number; readonly level: number; readonly lp: number;
  readonly learnPerkActive: NativeKnowledge<boolean>;
}

export function nativeNpcDefaultXp(victim: Pick<NativeActorCombatState, 'isPlayer' | 'rawLevel' | 'species'>): CombatResult<number> {
  if (victim.isPlayer || !nonnegativeI32(victim.rawLevel)) return unsupported('Default XP needs a native NPC raw level.', 'npc-raw-level');
  const amount = Math.imul(Math.max(1, victim.rawLevel), 5);
  if (!i32(Math.max(1, victim.rawLevel) * 5)) return unsupported('NPC XP multiplication overflows the bounded profile.', 'xp-overflow');
  return resolved(Math.max(isNativeAmbientCreature(victim.species) ? 25 : 50, amount), ['Script_Game:100628c0', 'Script_Game:100187b0']);
}

export function nativeXpNext(level: number): CombatResult<number> {
  if (!nonnegativeI32(level)) return unsupported('XP threshold needs an in-range native level.', 'player-level');
  const value = add(level, 2) * 0.5 * 500 * add(level, 1);
  if (!Number.isFinite(value) || value < 0 || value > I32_MAX) return unsupported('XP threshold needs exceptional conversion handling.', 'xp-threshold-overflow');
  return resolved(trunc(value), ['Script_Game:100627e0']);
}

export function applyNativeXp(player: NativePlayerProgress, amount: number): CombatResult<{ xp: number; level: number; lp: number; levelUp: boolean }> {
  if (![player.xp, player.level, player.lp, amount].every(nonnegativeI32)) return unsupported('XP state is outside bounded nonnegative integer domain.', 'player-progress');
  const threshold = nativeXpNext(player.level);
  if (threshold.status === 'unsupported') return threshold;
  const xp = add(player.xp, amount);
  if (!i32(player.xp + amount)) return unsupported('XP addition overflows the bounded profile.', 'xp-overflow');
  const levelUp = xp >= threshold.value;
  if (!levelUp) return resolved({ xp, level: player.level, lp: player.lp, levelUp }, E.xp);
  if (player.learnPerkActive.status === 'unknown' || !player.learnPerkActive.source) return unsupported('Perk_Learn activation is unresolved.', 'inventory:Perk_Learn');
  if (!i32(player.level + 1) || !i32(player.lp + (player.learnPerkActive.value ? 11 : 10))) return unsupported('Level/LP addition overflows the bounded profile.', 'progress-overflow');
  return resolved({ xp, level: add(player.level, 1), lp: add(player.lp, player.learnPerkActive.value ? 11 : 10), levelUp }, E.xp);
}

export interface NativeGiveXpPlan {
  readonly requestedAmount: number;
  readonly awardedAmount: number;
  readonly progress: { readonly xp: number; readonly level: number; readonly lp: number; readonly levelUp: boolean };
}

/** Script_Game GiveXP with Self=world and Other=PC_Hero multiplies its
 * requested integer by five before updating PlayerMemory.XP. The caller must
 * still apply the returned state through the live Hero property path. */
export function planNativeGiveXp(player: NativePlayerProgress, requestedAmount: number): CombatResult<NativeGiveXpPlan> {
  if (!nonnegativeI32(requestedAmount)) return unsupported('Native GiveXP operand is outside the supported nonnegative int32 domain.', 'givexp-operand');
  const awardedAmount = requestedAmount * 5;
  if (!i32(awardedAmount)) return unsupported('Native GiveXP multiplication exceeds the bounded signed32 profile.', 'xp-overflow');
  const progress = applyNativeXp(player, awardedAmount);
  if (progress.status === 'unsupported') return progress;
  return resolved({ requestedAmount, awardedAmount, progress: progress.value }, [...E.xp, 'Script_Game:100628c0']);
}

export interface NativeGiveXpSequencePlan {
  readonly awards: readonly NativeGiveXpPlan[];
  readonly progress: NativePlayerProgress;
}

/** Preflight consecutive XP-producing commands against one evolving Hero state. */
export function planNativeGiveXpSequence(player: NativePlayerProgress,
    requestedAmounts: readonly number[]): CombatResult<NativeGiveXpSequencePlan> {
  let progress = player;
  const awards: NativeGiveXpPlan[] = [];
  for (const requestedAmount of requestedAmounts) {
    const award = planNativeGiveXp(progress, requestedAmount);
    if (award.status === 'unsupported') return award;
    awards.push(award.value);
    progress = { ...award.value.progress, learnPerkActive: progress.learnPerkActive };
  }
  return resolved({ awards, progress }, [...E.xp, 'Script_Game:100628c0']);
}

export interface NativeDefeatCredit {
  readonly playerId: string;
  readonly creditedActorId: string;
  readonly creditedPartyLeaderId: NativeKnowledge<string | null>;
  readonly playerPartyLeaderId: NativeKnowledge<string | null>;
  readonly victimDefeatedByPlayer: NativeKnowledge<boolean>;
  readonly victimPartyMemberType: NativeKnowledge<number>;
  /** Native Kill/Defeat task prerequisites are not run by this kernel. */
  readonly taskAccepted: NativeKnowledge<boolean>;
}

export interface NativeDefeatXpPlan {
  readonly eligibleCredit: boolean;
  readonly xpAmount: number;
  readonly markDefeatedByPlayer: boolean;
  readonly progress: { readonly xp: number; readonly level: number; readonly lp: number; readonly levelUp: boolean } | null;
  readonly questCallback: 'OnNPCKilled' | 'OnNPCDefeated';
  readonly effects: readonly NativeDefeatEffect[];
  readonly deferredNativeBehavior: readonly string[];
}

export type NativeDefeatEffect =
  | { readonly type: 'setAiMode'; readonly victimId: string; readonly value: 8 | 9 }
  | { readonly type: 'questCallback'; readonly victimId: string; readonly name: 'OnNPCKilled' | 'OnNPCDefeated' }
  | { readonly type: 'setPlayerXp'; readonly playerId: string; readonly value: number; readonly delta: number }
  | { readonly type: 'setPlayerLevel'; readonly playerId: string; readonly value: number }
  | { readonly type: 'setPlayerLp'; readonly playerId: string; readonly value: number; readonly delta: number }
  | { readonly type: 'markDefeatedByPlayer'; readonly victimId: string; readonly value: true }
  | { readonly type: 'nativeBoundary'; readonly operation: 'defeatTaskPreModeCleanup' | 'defeatTaskPostModeCleanup' | 'defeatTaskAfterCreditCleanup' | 'xpNotifications' | 'levelUpNotifications' };

/** Kill/Defeat Self=credit-source, Other=victim; GiveXP reverses those roles.
 * Quest callback precedes credit/XP. Returned flag is still set if GiveXP's
 * PartyMemberType5 guard yields zero, because native tasks ignore its return. */
export function planNativeNpcDefeatXp(victim: NativeActorCombatState, event: 'kill' | 'defeat',
                                      credit: NativeDefeatCredit, player: NativePlayerProgress): CombatResult<NativeDefeatXpPlan> {
  if (victim.isPlayer) return unsupported('Player death/game-over is outside NPC defeat XP.', 'player-game-over');
  const state = initialized(victim);
  if (state.status === 'unsupported') return state;
  if (credit.taskAccepted.status === 'unknown' || !credit.taskAccepted.source || !credit.taskAccepted.value) return unsupported('Native Kill/Defeat task acceptance is unresolved.', 'native-defeat-task');
  let eligibleCredit = credit.creditedActorId === credit.playerId;
  if (!eligibleCredit) {
    if (credit.creditedPartyLeaderId.status === 'unknown' || !credit.creditedPartyLeaderId.source) return unsupported('Credited actor party leader is unresolved.', 'credit-party-leader');
    eligibleCredit = credit.creditedPartyLeaderId.value === credit.playerId;
    if (!eligibleCredit) {
      if (credit.playerPartyLeaderId.status === 'unknown' || !credit.playerPartyLeaderId.source) return unsupported('Player party leader is unresolved.', 'player-party-leader');
      eligibleCredit = credit.playerPartyLeaderId.value === credit.creditedActorId;
    }
  }
  const questCallback = event === 'kill' ? 'OnNPCKilled' : 'OnNPCDefeated';
  const effects: NativeDefeatEffect[] = [
    { type: 'nativeBoundary', operation: 'defeatTaskPreModeCleanup' },
    { type: 'setAiMode', victimId: victim.id, value: event === 'kill' ? 9 : 8 },
    { type: 'nativeBoundary', operation: 'defeatTaskPostModeCleanup' },
    { type: 'questCallback', victimId: victim.id, name: questCallback },
  ];
  const result = { eligibleCredit, xpAmount: 0, markDefeatedByPlayer: false, progress: null, effects,
                   questCallback,
                   deferredNativeBehavior: ['actual quest callback dispatch', 'death/unconscious/party/status cleanup', 'last-fight social state'] } as const;
  if (!eligibleCredit) {
    effects.push({ type: 'nativeBoundary', operation: 'defeatTaskAfterCreditCleanup' });
    return resolved(result, E.xp);
  }
  if (credit.victimDefeatedByPlayer.status === 'unknown' || !credit.victimDefeatedByPlayer.source) return unsupported('DefeatedByPlayer is unresolved.', 'victim-defeat-flag');
  if (credit.victimDefeatedByPlayer.value) {
    effects.push({ type: 'nativeBoundary', operation: 'defeatTaskAfterCreditCleanup' });
    return resolved(result, E.xp);
  }
  if (credit.victimPartyMemberType.status === 'unknown' || !credit.victimPartyMemberType.source || !i32(credit.victimPartyMemberType.value)) return unsupported('Victim party member type is unresolved.', 'victim-party-type');
  if (credit.victimPartyMemberType.value === 5) {
    effects.push({ type: 'markDefeatedByPlayer', victimId: victim.id, value: true });
    effects.push({ type: 'nativeBoundary', operation: 'defeatTaskAfterCreditCleanup' });
    return resolved({ ...result, markDefeatedByPlayer: true }, E.xp);
  }
  const amount = nativeNpcDefaultXp(victim);
  if (amount.status === 'unsupported') return amount;
  const progress = applyNativeXp(player, amount.value);
  if (progress.status === 'unsupported') return progress;
  effects.push({ type: 'nativeBoundary', operation: 'xpNotifications' },
               { type: 'setPlayerXp', playerId: credit.playerId, value: progress.value.xp, delta: amount.value });
  if (progress.value.levelUp) {
    effects.push({ type: 'setPlayerLevel', playerId: credit.playerId, value: progress.value.level },
                 { type: 'nativeBoundary', operation: 'levelUpNotifications' },
                 { type: 'setPlayerLp', playerId: credit.playerId, value: add(player.lp, 10), delta: 10 });
    if (progress.value.lp - player.lp === 11) {
      effects.push({ type: 'setPlayerLp', playerId: credit.playerId, value: progress.value.lp, delta: 1 });
    }
  }
  effects.push({ type: 'markDefeatedByPlayer', victimId: victim.id, value: true },
               { type: 'nativeBoundary', operation: 'defeatTaskAfterCreditCleanup' });
  return resolved({ ...result, xpAmount: amount.value, markDefeatedByPlayer: true, progress: progress.value }, E.xp);
}
