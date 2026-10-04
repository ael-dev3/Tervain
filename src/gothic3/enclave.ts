/** Ordered raid-entry effects of original NotifyEnclave(event2).
 *
 * This is a bounded callback planner. Navigation registration, live processing
 * flags, property observers and task execution must come from a real host.
 * Static rendered NPCs cannot substitute for the native member cache. Missing
 * facts or the unported liberation branch yield no effects. See enclave receipts.
 */
import rulesText from '../../assets/gothic3/enclave/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';

const ORIGINAL_SCRIPT = '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1';
const rules = JSON.parse(rulesText) as {
  schema: string; inputSha256: string; callback: { body: string; event: number };
  excludedAIModes: number[]; recruitment: { perSideTarget: number; animationState: number; walkMode: number };
};
if (rules.schema !== 'gothic3-enclave-runtime-rules-v1' || rules.inputSha256 !== ORIGINAL_SCRIPT ||
    rules.callback.body !== '100755e0' || rules.callback.event !== 2 ||
    rules.excludedAIModes.join(',') !== '6,9,8' || rules.recruitment.perSideTarget !== 10 ||
    rules.recruitment.animationState !== 2 || rules.recruitment.walkMode !== 3) {
  throw new Error('Invalid original enclave rule receipt');
}

/** Numeric result of the original helper; do not relabel1 as hostility. */
export type NativePoliticalAttitude = 0 | 1 | 2 | 4;
export function originalPoliticalAttitude(selfAlignment: number, otherAlignment: number,
  chapter: NativeValue<number>): NativeValue<NativePoliticalAttitude> {
  if (!Number.isInteger(selfAlignment) || !Number.isInteger(otherAlignment)) {
    return { known: false, reason: 'Political alignment is not a native integer.' };
  }
  if ((selfAlignment === 1 && otherAlignment === 5) || (selfAlignment === 5 && otherAlignment === 1)) {
    if (!chapter.known) return chapter;
    return { known: true, value: chapter.value === 2 ? 4 : 1 };
  }
  // Original GetPoliticalAttitude100183e0 switch, including row8's neutral diagonal.
  const rows: readonly (readonly NativePoliticalAttitude[])[] = [
    [1, 4, 4, 2, 1, 4, 4, 2], [4, 1, 2, 2, 4, 2, 4, 2],
    [4, 2, 1, 2, 4, 2, 4, 1], [2, 2, 2, 1, 2, 2, 2, 2],
    [1, 4, 4, 2, 1, 4, 4, 2], [4, 2, 2, 2, 4, 1, 4, 2],
    [4, 4, 4, 4, 4, 4, 1, 4], [2, 2, 2, 2, 2, 2, 2, 2],
  ];
  return { known: true, value: rows[selfAlignment - 1]?.[otherAlignment - 1] ?? 0 };
}

export interface RaidMemberFacts {
  id: string;
  navigationValid: NativeValue<boolean>;
  partyLeader: NativeValue<string | null>;
  npcType: NativeValue<number>;
  /** Effective alignment from PSEnclave when valid, otherwise PSNpc. */
  politicalAlignment: NativeValue<number>;
  aiMode: NativeValue<number>;
  inProcessingRange: NativeValue<boolean>;
  /** Native squared world-distance result; browser Euclidean estimates are insufficient. */
  nativeDistanceSquaredToPlayer: NativeValue<number>;
}
export interface NativeRaidContext {
  sourceSha256: string;
  revision: string;
  event: 2;
  player: { id: string; partyLeader: NativeValue<string | null>; chapter: NativeValue<number> };
  other: { id: string; name: string; enclave: NativeValue<string | null>; effectiveAlignment: NativeValue<number> };
  enclave: { id: string; name: string; status: NativeValue<number>; raid: NativeValue<boolean>;
    politicalAlignment: NativeValue<number> } | null;
  /** Entire ordered GetMembers result, including native null proxy resolutions. */
  members: NativeValue<readonly (RaidMemberFacts | null)[]>;
  /** Registry/cache semantics are explicit, not inferred from scene loading. */
  membership: 'native-cache-and-navigation-registry' | 'unknown';
  /** Host proves party setters cannot invalidate later supplied read facts. */
  partyReadStability: NativeValue<boolean>;
  /** Results proved on the host's detached draft after intrinsic Party methods
   * and observers. SetPartyLeader's native bool alone does not prove a clear. */
  partyLeaderAfterClear?: (entityId: string) => NativeValue<string | null>;
  /** Actual ChangeEnclaveStatus return and subsequent native Status read, plus
   * stability of the facts used by the precomputed routine/recruitment tail. */
  raidStatusPostcondition: NativeValue<{ changed: boolean; status: number; laterReadsStable: boolean }>;
  /** Exact native qsort permutation only needed when distances compare equal. */
  nativeTieOrders?: Partial<Record<'defenders' | 'opponents', readonly string[]>>;
}
export type NativeRaidEffect =
  | { kind: 'set-party-leader'; entity: string; leader: null }
  | { kind: 'set-party-property'; entity: string; property: 'Waiting'; value: false }
  | { kind: 'set-party-property'; entity: string; property: 'PartyMemberType'; value: 0 }
  | { kind: 'change-enclave-status'; self: string; enclave: string; before: 0; after: 1;
      directEffects: readonly ['Status=1']; questStateChanged: false }
  | { kind: 'routine'; entity: string; command: 'FullStop' | 'ContinueRoutine' }
  | { kind: 'set-ground-bias'; entity: string; target: null }
  | { kind: 'set-animation-state'; entity: string; value: 2 }
  | { kind: 'start-goto'; entity: string; target: string; walkMode: 3 };
export interface NativeRaidPlan {
  callback: 'NotifyEnclave'; event: 2; sourceSha256: string; revision: string;
  returnValue: 0 | 1;
  effects: readonly NativeRaidEffect[];
  memberLists: { activeDefenders: readonly string[]; outsideDefenders: readonly string[];
    activeOpponents: readonly string[]; outsideOpponents: readonly string[] };
  counts: { eligibleDefenders: number; allDefenders: number };
  finalStatus: number | null;
  /** Party/routine/property methods must execute all intrinsic and observer effects. */
  requiredHostMethods: readonly string[];
}
export type NativeRaidResult = { outcome: 'supported'; plan: NativeRaidPlan }
  | { outcome: 'unsupported'; required: readonly string[]; effects: readonly [] };

class UnknownRaidFact extends Error {}
function fact<T>(value: NativeValue<T>, label: string): T {
  if (!value.known) throw new UnknownRaidFact(label + ': ' + value.reason);
  return value.value;
}
function nativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new UnknownRaidFact(label + ' is not a native signed32bit integer.');
  }
  return value;
}
function memberOrder(list: readonly RaidMemberFacts[], side: 'defenders' | 'opponents',
  context: NativeRaidContext): RaidMemberFacts[] {
  if (list.length < 2) return [...list];
  const distances = list.map((member) => {
    const squared = fact(member.nativeDistanceSquaredToPlayer, member.id + '.nativeDistanceSquared');
    if (!Number.isFinite(squared) || squared < 0 || Math.fround(squared) !== squared) {
      throw new UnknownRaidFact(member.id + '.distance must be a finite native float32 result.');
    }
    return { member, squared };
  });
  if (new Set(distances.map((entry) => entry.squared)).size !== distances.length) {
    const order = context.nativeTieOrders?.[side];
    const ids = new Set(list.map((member) => member.id));
    if (!order || order.length !== list.length || new Set(order).size !== ids.size ||
        order.some((id) => !ids.has(id))) {
      throw new UnknownRaidFact(side + ': native CRT qsort tie permutation is unresolved.');
    }
    const map = new Map(distances.map((entry) => [entry.member.id, entry]));
    const sorted = order.map((id) => map.get(id)!);
    if (sorted.some((entry, index) => index > 0 && sorted[index - 1]!.squared > entry.squared)) {
      throw new UnknownRaidFact(side + ': supplied native permutation violates distance ordering.');
    }
    return sorted.map((entry) => entry.member);
  }
  return distances.sort((a, b) => a.squared - b.squared).map((entry) => entry.member);
}

/** Plans the source-proven Status0→1 event2 path. No mutation occurs here. */
export function planNativeRaidEntry(context: NativeRaidContext): NativeRaidResult {
  try {
    if (context.sourceSha256 !== ORIGINAL_SCRIPT || !context.revision || context.event !== 2) {
      throw new UnknownRaidFact('Exact installed script hash, event2 and world revision are required.');
    }
    const effects: NativeRaidEffect[] = [];
    const lists = { activeDefenders: [] as RaidMemberFacts[], outsideDefenders: [] as RaidMemberFacts[],
      activeOpponents: [] as RaidMemberFacts[], outsideOpponents: [] as RaidMemberFacts[] };
    let allDefenders = 0, eligibleDefenders = 0, status: number | null = null;
    const finish = (returnValue: 0 | 1): NativeRaidResult => ({ outcome: 'supported', plan: {
      callback: 'NotifyEnclave', event: 2, sourceSha256: ORIGINAL_SCRIPT, revision: context.revision,
      returnValue, effects: structuredClone(effects),
      memberLists: { activeDefenders: lists.activeDefenders.map((member) => member.id),
        outsideDefenders: lists.outsideDefenders.map((member) => member.id),
        activeOpponents: lists.activeOpponents.map((member) => member.id),
        outsideOpponents: lists.outsideOpponents.map((member) => member.id) },
      counts: { eligibleDefenders, allDefenders }, finalStatus: status,
      requiredHostMethods: [...new Set(effects.map((effect) => effect.kind))],
    } });
    const enclaveId = fact(context.other.enclave, 'Other.Enclave');
    if (enclaveId === null) return finish(0);
    const enclave = context.enclave;
    if (!enclave || enclave.id !== enclaveId) throw new UnknownRaidFact('Resolved Other.Enclave facts are unavailable.');
    if (enclave.name === 'Faring' && ['Orc_Scout_05', 'Orc_Scout_06', 'Orc_Warrior_12'].includes(context.other.name)) {
      return finish(0);
    }
    status = nativeInteger(fact(enclave.status, 'Enclave.Status'), 'Enclave.Status');
    if (status === 2) return finish(0);
    if (!fact(enclave.raid, 'Enclave.Raid')) return finish(0);
    if (status !== 0) return finish(0);
    const alignment = nativeInteger(fact(enclave.politicalAlignment, 'Enclave.PoliticalAlignment'), 'Enclave.PoliticalAlignment');
    const otherAlignment = nativeInteger(fact(context.other.effectiveAlignment, 'Other.PoliticalAlignment'), 'Other.PoliticalAlignment');
    const attitude = fact(originalPoliticalAttitude(otherAlignment, alignment, context.player.chapter), 'Other-to-enclave attitude');
    if (attitude !== 1) return finish(0);
    if (context.membership !== 'native-cache-and-navigation-registry') {
      throw new UnknownRaidFact('Complete native enclave cache/navigation registration is required.');
    }
    const members = fact(context.members, 'Enclave.GetMembers');
    if (members.length > 0x7fffffff) throw new UnknownRaidFact('GetMembers count exceeds native signed32bit array count.');
    let playerLeader = context.player.partyLeader;
    const leaders = new Map<string, NativeValue<string | null>>();
    const clearPartyLeader = (entity: string): void => {
      if (!context.partyLeaderAfterClear) throw new UnknownRaidFact('Missing native Party clear postcondition for ' + entity);
      const leaderAfter = fact(context.partyLeaderAfterClear(entity), entity + '.PartyLeader after native clear');
      if (leaderAfter !== null) throw new UnknownRaidFact(entity + ': native Party clear did not establish None.');
      leaders.set(entity, { known: true, value: null });
      if (entity === context.player.id) playerLeader = { known: true, value: null };
    };
    for (const member of members) {
      if (!member || !fact(member.navigationValid, (member?.id ?? 'None') + '.Navigation.IsValid')) continue;
      if (!member.id) throw new UnknownRaidFact('Member entity identity is missing.');
      const leader = fact(leaders.get(member.id) ?? member.partyLeader, member.id + '.PartyLeader');
      if (leader === context.player.id) {
        effects.push({ kind: 'set-party-leader', entity: member.id, leader: null },
          { kind: 'set-party-property', entity: member.id, property: 'Waiting', value: false },
          { kind: 'set-party-property', entity: member.id, property: 'PartyMemberType', value: 0 });
        clearPartyLeader(member.id);
        // Member and GetPlayer can resolve the same entity. The subsequent
        // Player.PartyLeader read observes this first setter's changed proxy.
      }
      if (fact(playerLeader, 'Player.PartyLeader') === member.id) {
        effects.push({ kind: 'set-party-leader', entity: context.player.id, leader: null });
        clearPartyLeader(context.player.id);
      }
      // Native reads Type to remember the last boss, then reads its AIMode.
      // That boss value has no influence on the event2 threshold or Status1 branch.
      nativeInteger(fact(member.npcType, member.id + '.NPC.Type'), member.id + '.NPC.Type');
      const effective = nativeInteger(fact(member.politicalAlignment, member.id + '.PoliticalAlignment'), member.id + '.PoliticalAlignment');
      const side = fact(originalPoliticalAttitude(effective, alignment, context.player.chapter), member.id + '.attitude');
      const mode = nativeInteger(fact(member.aiMode, member.id + '.AIMode'), member.id + '.AIMode');
      if (side === 1) allDefenders = (allDefenders + 1) | 0;
      if (mode === 6 || mode === 9 || mode === 8) continue;
      const active = fact(member.inProcessingRange, member.id + '.IsInProcessingRange');
      if (side === 1) {
        eligibleDefenders = (eligibleDefenders + 1) | 0;
        (active ? lists.activeDefenders : lists.outsideDefenders).push(member);
      } else if (side === 4) (active ? lists.activeOpponents : lists.outsideOpponents).push(member);
    }
    if (effects.length && !fact(context.partyReadStability, 'Party property/callback read stability')) {
      throw new UnknownRaidFact('Party assignment may invalidate subsequent supplied member facts.');
    }
    // Native LEA EDI+EDI*4 wraps32bits; CMP/JL compares signed values.
    if (Math.imul(eligibleDefenders, 5) < allDefenders) {
      throw new UnknownRaidFact('NotifyEnclave Status2 liberation/quest/mission-item/death callback chain is not ported.');
    }
    const postStatus = fact(context.raidStatusPostcondition, 'ChangeEnclaveStatus callback postcondition');
    if (postStatus.changed !== true || postStatus.status !== 1 || postStatus.laterReadsStable !== true) {
      throw new UnknownRaidFact('Native changed flag, Status1 read and later member/distance fact stability are required.');
    }
    effects.push({ kind: 'change-enclave-status', self: context.other.id, enclave: enclave.id,
      before: 0, after: 1, directEffects: ['Status=1'], questStateChanged: false });
    status = 1;
    for (const member of [...lists.activeDefenders, ...lists.activeOpponents]) {
      effects.push({ kind: 'routine', entity: member.id, command: 'FullStop' },
        { kind: 'routine', entity: member.id, command: 'ContinueRoutine' });
    }
    for (const [side, active, outside] of [
      ['defenders', lists.activeDefenders, lists.outsideDefenders],
      ['opponents', lists.activeOpponents, lists.outsideOpponents],
    ] as const) {
      const vacancies = 10 - active.length;
      if (vacancies <= 0) continue;
      for (const member of memberOrder(outside, side, context).slice(0, vacancies)) {
        effects.push({ kind: 'routine', entity: member.id, command: 'FullStop' },
          { kind: 'set-ground-bias', entity: member.id, target: null },
          { kind: 'set-animation-state', entity: member.id, value: 2 },
          { kind: 'start-goto', entity: member.id, target: context.player.id, walkMode: 3 });
      }
    }
    return finish(1);
  } catch (error) {
    if (!(error instanceof UnknownRaidFact)) throw error;
    return { outcome: 'unsupported', required: [error.message], effects: [] };
  }
}
