import { calculateNativeHeroMelee, nativeDeadlyMelee, nativeOutlawAttitude, NativeCombatAction } from './combat';
import type { NativeActorCombatState, NativeDifficulty, NativeKnowledge, NativeMeleeCalculation } from './combat';
import type { NativeFistCarrier } from './native-fist-carrier';
import type { BrowserArdeaNpcCombatState } from './npc-combat-runtime';
import type { NativeHeroPlayerMemory } from './hero-property-runtime';
import type { NativeQuestRuntime } from './quest-runtime';
import type { HeroAttackStyle } from './hero-attack-sequence';

export const HERO_SOURCE_ID = '054d6e4a5f059340bc5c2ca0cca6674500000000';
const ORC_RAIDER_SOURCE = Object.freeze({
  path: 'G3_World_01/Myrtana/Ardea_City/G3_Myrtana_01_Ardea_NPC_01/G3_Myrtana_01_Ardea_NPC_01.lrentdat',
  sha256: '46b70fff7a3844e8c16e6e71d69d8f7c57b5f1e8429d73e814b2ce9ffe9f2ac0',
});
const STARTING_ORC_RAIDERS = new Map<string, string>([
  ['c3a279a1be344543becc4ea823c684cc00000000', 'Orc_GameStartRaider_Warrior_01'],
  ['b7f4f4c976bdd64587065131c96f652d00000000', 'Orc_GameStartRaider_Warrior_02'],
  ['207e5e1271f5644a91d10542f58acf7400000000', 'Orc_GameStartRaider_Warrior_03'],
  ['d1e5b194d6072f4ba07b3a587bd306be00000000', 'Orc_GameStartRaider_Warrior_04'],
  ['4aed1bdaf5cd864fafe6c141ddfc9ff200000000', 'Orc_GameStartRaider_Warrior_05'],
  ['afbd43f49e79b24dbe6e91de4b1954b600000000', 'Orc_GameStartRaider_Scout_01'],
  ['19b398284e86c941a87fa6fe72ff7a3e00000000', 'Orc_GameStartRaider_Scout_02'],
  ['0424b3f12afa8b4f9d28813ec6ed918b00000000', 'Orc_GameStartRaider_Scout_03'],
  ['1d8c7ae2344d7e49b91c940059d6babb00000000', 'Orc_GameStartRaider_Scout_04'],
  ['496661f31a4e3b4f9b14ee8154a5e99b00000000', 'Orc_GameStartRaider_Scout_05'],
  ['ba06e4764409cf4aa21be9e5320c996f00000000', 'Orc_GameStartRaider_Scout_06'],
  ['3f03be07726dfa44b9e30727c587157f00000000', 'Orc_GameStartRaider_Scout_07'],
  ['0962851410aa424a9b9842a04b280e2c00000000', 'Orc_GameStartRaider_Scout_08'],
  ['b3b8ac03770c414d9caa819d706863d200000000', 'Orc_GameStartRaider_Scout_09'],
  ['71a0d6346c5fc44b945ac3ecc2a5ba3600000000', 'Orc_GameStartRaider_Scout_10'],
]);
const JACK_BANDITS = new Map<string, string>([
  ['0c3ad5c499a37e479901ef8b1a19877900000000', 'Ardea_OutNovice_01'],
  ['ef1adbed209ec647b20ebc9fc989642500000000', 'Ardea_OutNovice_02'],
  ['81630a69bab9c44b9df46b76df0ac7b100000000', 'Ardea_OutNovice_03'],
]);
const FIST_SOURCE = Object.freeze({
  guid20: '5e6ca17c30a967489b27269fec4499ee00000000',
  sourcePath: 'Items/Items/Action_Items_Fist.tple',
  sourceSha256: 'd4f3825a6e101917f4ca98b34d10aff4c70008c968a006554335c6cb73ce007e',
});
const HERO_NPC_SOURCE = Object.freeze({
  path: 'G3_World_01/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat',
  sha256: '28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938',
});

export type BrowserFistHitResult =
  | { readonly status: 'resolved'; readonly hitPointsBefore: number; readonly hitPointsAfter: number;
      readonly calculation: NativeMeleeCalculation;
      /** A disposition decision is separate from executing the Kill/Defeat task. */
      readonly zeroHitPointsDisposition: NativeKnowledge<'kill' | 'defeat'> }
  | { readonly status: 'unsupported'; readonly reason: string };

function known<T>(value: T, source: string): NativeKnowledge<T> {
  return Object.freeze({ status: 'known', value, source });
}

function unknown<T>(reason: string): NativeKnowledge<T> {
  return Object.freeze({ status: 'unknown', reason });
}

function proveArdeaActorCanReceiveBrowserFistHit(actor: BrowserArdeaNpcCombatState): string | null {
  const banditName = JACK_BANDITS.get(actor.personId.toLowerCase());
  const expectedName = banditName ?? STARTING_ORC_RAIDERS.get(actor.personId.toLowerCase());
  const expectedSource = banditName ? HERO_NPC_SOURCE : ORC_RAIDER_SOURCE;
  if (!expectedName || actor.name !== expectedName || actor.sourcePath !== expectedSource.path ||
      actor.sourceSha256 !== expectedSource.sha256) {
    return 'This browser damage profile only covers the 15 hash-checked Ardea starting Raiders and three Jack bandits.';
  }
  if (actor.species !== (banditName ? 0 : 5) || actor.npcType !== 0 || !Number.isInteger(actor.rawLevel) || actor.rawLevel < 0 ||
      !Number.isInteger(actor.rawLevelMax) || actor.rawLevelMax < actor.rawLevel) {
    return 'The source actor species, type or level range differs from the bounded combat profile.';
  }
  if (banditName && (actor.rawLevel !== 0 || actor.rawLevelMax !== 20 || actor.politicalAlignment !== 7 ||
      actor.routineAiMode !== 0 || !actor.navigationValid)) {
    return 'The Jack bandit source level, political alignment or routine/navigation inputs differ from the audited profile.';
  }
  if (actor.serializedInventoryStackCount !== 0) {
    return 'The actor serialized inventory stack list is not verified empty.';
  }
  if (actor.statusEffects !== 0 || actor.currentAttackerId !== null) {
    return 'The actor source state has effects or an existing attacker outside this standing-target profile.';
  }
  if (actor.armorIsRobe.status !== 'known' || !actor.armorIsRobe.source || actor.armorIsRobe.value !== false) {
    return 'The actor slot17 armor classification is unresolved for the heavy-armor calculation.';
  }
  const namedSets = actor.treasureSets.filter(Boolean);
  if (namedSets.length === 0 || namedSets.length !== actor.treasureSetResolutions.length ||
      actor.treasureSetResolutions.some((set) => set.status === 'unresolved' ||
        !['plunder-source-resolved', 'weaponry-recipe-resolved'].includes(set.status))) {
    return 'The actor treasure-set inputs are not all source-resolved.';
  }
  const snapshot = actor.inventory.snapshot();
  if (snapshot.equipment.length !== 0 || snapshot.observerRegistry !== 'complete' || snapshot.unresolvedEffects.length !== 0) {
    return 'The browser NPC inventory contains unresolved effects or equipment state.';
  }
  for (const stack of snapshot.stacks) {
    const template = actor.inventory.template(stack.templateGuid20);
    if (!template || template.name !== stack.templateName || template.skillGuid20 !== null) {
      return 'An NPC inventory template may reference a combat skill; its perk state is unresolved.';
    }
  }
  return null;
}

/**
 * Adapts the 15 static Ardea starting Raiders or three source-placed Jack bandits and the Hero's browser fist hit to the
 * audited Gothic damage arithmetic. The NPC's standing/action-zero state and
 * empty hands are browser-host facts; this does not establish a native live
 * task, animation, equipment attachment, AI response, death, XP or loot path.
 */
export function calculateBrowserArdeaFistHit(input: {
  readonly actor: BrowserArdeaNpcCombatState;
  readonly player: NativeHeroPlayerMemory;
  readonly runtime: NativeQuestRuntime;
  readonly fist: NativeFistCarrier;
  readonly style: HeroAttackStyle;
  readonly difficulty: NativeDifficulty;
}): BrowserFistHitResult {
  const { actor, player, runtime, fist, style, difficulty } = input;
  const targetProfileError = proveArdeaActorCanReceiveBrowserFistHit(actor);
  if (targetProfileError) return { status: 'unsupported', reason: targetProfileError };
  if (actor.hitPoints <= 0) return { status: 'unsupported', reason: 'The browser NPC already has 0 HP.' };
  if (fist.source.templateGuid20 !== FIST_SOURCE.guid20 || fist.source.sourcePath !== FIST_SOURCE.sourcePath ||
      fist.source.sourceSha256 !== FIST_SOURCE.sourceSha256 || fist.carrier.ownerId?.toLowerCase() !== HERO_SOURCE_ID) {
    return { status: 'unsupported', reason: 'The Hero-owned Fist carrier differs from its pinned source identity.' };
  }

  const heroProfile = runtime.heroNpcCombatProfile();
  const heroLevel = runtime.saveData().heroProgress?.level;
  if (!heroProfile.known) return { status: 'unsupported', reason: heroProfile.reason };
  const sourceProfile = heroProfile.value;
  if (sourceProfile.id !== HERO_SOURCE_ID || sourceProfile.name !== 'PC_Hero' ||
      sourceProfile.source.path !== HERO_NPC_SOURCE.path || sourceProfile.source.sha256 !== HERO_NPC_SOURCE.sha256 ||
      sourceProfile.species !== 0 || sourceProfile.npcType !== 0 || sourceProfile.politicalAlignment !== 0 || sourceProfile.statusEffects !== 0 ||
      !Number.isInteger(heroLevel) || (heroLevel as number) < 0 || sourceProfile.rawLevel !== heroLevel) {
    return { status: 'unsupported', reason: 'The source-seeded Hero identity, NPC profile, status or current level differs from the bounded combat profile.' };
  }

  let vitals: ReturnType<NativeQuestRuntime['heroVitals']>;
  try { vitals = runtime.heroVitals(); }
  catch (error) { return { status: 'unsupported', reason: error instanceof Error ? error.message : String(error) }; }
  if (vitals.hitPoints <= 0) return { status: 'unsupported', reason: 'The Hero has 0 HP and cannot start another browser fist hit.' };
  if (!player.memory.getAttribute('STR') || !player.memory.getAttribute('SP')) {
    return { status: 'unsupported', reason: 'The Hero Strength or Stamina source attribute is unavailable.' };
  }
  let strength: number;
  let stamina: number;
  let staminaMax: number;
  try {
    strength = player.memory.getValue('STR');
    stamina = player.memory.getValue('SP');
    staminaMax = player.memory.getMaximum('SP');
  } catch (error) {
    return { status: 'unsupported', reason: error instanceof Error ? error.message : String(error) };
  }
  if (![strength, stamina, staminaMax].every(Number.isInteger)) {
    return { status: 'unsupported', reason: 'Hero Strength or Stamina is outside the native integer domain.' };
  }
  const attacker: NativeActorCombatState = {
    id: sourceProfile.id, name: sourceProfile.name, isPlayer: true, species: sourceProfile.species,
    npcType: sourceProfile.npcType, rawLevel: sourceProfile.rawLevel, rawLevelMax: sourceProfile.rawLevelMax,
    hasPlayerMemory: true, transformed: false, navigationValid: true, damageReceiverValid: true,
    initialization: 'initialized', hitPoints: vitals.hitPoints, hitPointsMax: vitals.hitPointsMax,
    stamina, staminaMax, action: style === 'attack' ? NativeCombatAction.attack : NativeCombatAction.powerAttack,
    aniState: 0, primaryPose: 0, statePosition: 0, hands: { leftUseType: 0, rightUseType: 8 },
    currentAttackerId: unknown('Live Hero combat target state is not tracked by the browser host.'),
    armorIsRobe: unknown('Hero armor protection is not used while calculating outgoing damage.'),
    skills: runtime.heroCombatSkills(), enclavePresent: unknown('Hero enclave membership is not used by this damage calculation.'),
  };
  const victim: NativeActorCombatState = {
    id: actor.personId, name: actor.name, isPlayer: false, species: actor.species, npcType: actor.npcType,
    rawLevel: actor.rawLevel, rawLevelMax: actor.rawLevelMax, hasPlayerMemory: false, transformed: false,
    navigationValid: actor.navigationValid, damageReceiverValid: actor.damageReceiverValid,
    initialization: 'initialized', hitPoints: actor.hitPoints, hitPointsMax: actor.processingRange.hitPointsMax,
    stamina: actor.stamina, staminaMax: actor.processingRange.staminaMax,
    // The rendered Ardea NPC has no live action/task state. This narrow host
    // uses its static bind-pose presentation as an ordinary, non-guarding target.
    action: 0, aniState: 0, primaryPose: 0, statePosition: 0,
    hands: { leftUseType: 0, rightUseType: 0 },
    currentAttackerId: known(null, 'source gCNPC_PS.CurrentAttackerEntity is absent'),
    armorIsRobe: actor.armorIsRobe,
    skills: { Perk_HeavyArmor: known(false,
      'empty serialized stack list and source-resolved NPC inventory templates have no gCItem_PS.Skill references') },
    enclavePresent: unknown('NPC enclave membership is not used by this damage calculation.'),
  };
  const calculation = calculateNativeHeroMelee({ attacker, victim, carrier: fist.carrier,
    playerStrength: strength, playerLevel: heroLevel as number, difficulty });
  if (calculation.status !== 'resolved') return { status: 'unsupported', reason: calculation.reason };
  let zeroHitPointsDisposition: NativeKnowledge<'kill' | 'defeat'> = unknown(
    'The Raider directed GetAttitude branches are not resolved; 0 HP alone does not establish a native kill.');
  if (JACK_BANDITS.has(actor.personId.toLowerCase())) {
    const outlaw = nativeOutlawAttitude({ politicalAlignment: actor.politicalAlignment, species: actor.species },
      { politicalAlignment: sourceProfile.politicalAlignment, species: sourceProfile.species });
    if (outlaw.status !== 'resolved' || outlaw.value !== 4) {
      return { status: 'unsupported', reason: outlaw.status === 'unsupported' ? outlaw.reason :
        'The source Outlaw helper did not resolve the bandit-directed attitude.' };
    }
    // GetAttitude's Self!=PC_Hero, Type!=3 and valid-navigation gates use the
    // verified source actor. This static browser host retains AIMode0 and
    // supplies ordinary standing targets; it does not run native AI tasks.
    // HasCopyCheckFailed also returns4, so either copy-check outcome reaches
    // the same deadly decision for this specific pair. Outlaw4 exits before
    // revolution, party, crime and general political-attitude branches.
    const deadly = nativeDeadlyMelee(victim, attacker, heroLevel as number, difficulty, {
      victimTowardAttacker: known(outlaw.value,
        'Script_Game:100194c0+10018070+1001b0c0; pinned bandit7/Hero0; source Type0/navigation; browser standing AIMode0'),
      attackerTowardVictim: unknown('The forward Outlaw4 branch returns before the reverse attitude is used.'),
    });
    if (deadly.status !== 'resolved') return { status: 'unsupported', reason: deadly.reason };
    zeroHitPointsDisposition = known(deadly.value ? 'kill' : 'defeat',
      'Script_Game:1003c550+1003c6b0+100194c0+10018070; disposition only; Kill/Defeat task is not executed');
  }
  const hitPointsAfter = Math.max(0, actor.hitPoints - calculation.value.finalDamage);
  return Object.freeze({ status: 'resolved', hitPointsBefore: actor.hitPoints, hitPointsAfter,
    calculation: calculation.value, zeroHitPointsDisposition });
}
