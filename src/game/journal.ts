import { hasFact } from './state';
import { EVIDENCE_IDS, NPC_IDS, type EvidenceId, type NpcId, type PlaceId, type WorldState } from './types';

/**
 * The journal separates what the player observed, what people reported, and what they
 * concluded (gameplay.md). It is a view over facts and evidence, never the store of progress.
 */
export interface JournalEntry {
  id: string;
  /** Key resolved by the UI through the string table. */
  key: string;
  params?: Record<string, string | number>;
}

export interface JournalView {
  leadKey: string | null;
  observed: JournalEntry[];
  reported: JournalEntry[];
  concluded: JournalEntry[];
  questions: JournalEntry[];
  places: { id: PlaceId; status: 'verified' | 'claimed' | 'unknown' }[];
  people: { npc: NpcId; met: boolean; available: boolean }[];
  statusKey: string;
}

const CLAIM_FACTS = [
  'claim_foreman_spring_failing',
  'claim_steward_sediment',
  'claim_reeve_promised_relief',
  'claim_reserve_sufficient',
  'reserve_empty',
  'edda_admits_deferral',
  'reeve_admits_diversion',
  'foreman_admits_seep',
  'told_ledger',
] as const;

export const PLACE_ORDER: PlaceId[] = ['shore', 'lantern_point', 'deepwood', 'overlook', 'rillford', 'ford', 'spring_shrine', 'sluice', 'quarry', 'the_cut', 'archive'];

const CLAIMED_PLACE_FACTS: Partial<Record<PlaceId, string>> = {
  spring_shrine: 'told_shrine',
  sluice: 'told_sluice',
  quarry: 'told_quarry',
  the_cut: 'told_cut',
  rillford: 'told_rillford',
  ford: 'told_ford_path',
  archive: 'told_archive_door',
};

function evidenceColumn(via: string): 'observed' | 'reported' {
  return via === 'testimony' ? 'reported' : 'observed';
}

export function buildJournal(s: WorldState): JournalView {
  const observed: JournalEntry[] = [];
  const reported: JournalEntry[] = [];
  const concluded: JournalEntry[] = [];
  const questions: JournalEntry[] = [];

  for (const id of EVIDENCE_IDS) {
    const rec = s.evidence[id];
    if (!rec) continue;
    const col = evidenceColumn(rec.via);
    const entry: JournalEntry = { id: `ev:${id}`, key: `journal.ev.${id}.${col}` };
    (col === 'observed' ? observed : reported).push(entry);
  }

  for (const f of CLAIM_FACTS) {
    if (hasFact(s, f)) reported.push({ id: `claim:${f}`, key: `journal.claim.${f}` });
  }
  if (hasFact(s, 'saw_seep') && !s.evidence.diversion_and_seep) observed.push({ id: 'obs:seep', key: 'journal.obs.saw_seep' });
  if (hasFact(s, 'saw_diversion') && !s.evidence.diversion_and_seep) observed.push({ id: 'obs:diversion', key: 'journal.obs.saw_diversion' });
  if (hasFact(s, 'saw_inspection_gap')) observed.push({ id: 'obs:log', key: 'journal.obs.saw_inspection_gap' });
  if (hasFact(s, 'saw_fish_nests')) observed.push({ id: 'obs:fish', key: 'journal.obs.saw_fish_nests' });
  if (hasFact(s, 'saw_saltward_kit')) observed.push({ id: 'obs:kit', key: 'journal.obs.saw_saltward_kit' });
  if (hasFact(s, 'hunter_game_delivered')) observed.push({ id: 'obs:game_provisions', key: 'journal.obs.game_provisions' });

  if (hasFact(s, 'saw_arrival_wreckage')) observed.push({ id: 'obs:arrival_wreckage', key: 'journal.obs.arrival_wreckage' });
  if (hasFact(s, 'saw_templar_waymarker')) observed.push({ id: 'obs:templar_waymarker', key: 'journal.obs.templar_waymarker' });

  // Contradictions produce a new question, never a hidden reputation penalty.
  if (hasFact(s, 'claim_foreman_spring_failing') && !s.evidence.reduced_spring_flow) {
    questions.push({ id: 'q:spring', key: 'journal.q.spring_failing_or_silted' });
  }
  if (hasFact(s, 'claim_reserve_sufficient') && hasFact(s, 'reserve_empty')) {
    questions.push({ id: 'q:reserve', key: 'journal.q.reserve' });
  }
  if (hasFact(s, 'claim_reeve_promised_relief') && s.quest.gate !== 'stabilized') {
    questions.push({ id: 'q:relief', key: 'journal.q.relief' });
  }

  const ev = (id: EvidenceId) => s.evidence[id] !== undefined;
  if (hasFact(s, 'claim_foreman_spring_failing') && ev('reduced_spring_flow')) {
    concluded.push({ id: 'c:sediment', key: 'journal.c.sediment_not_failure' });
  }
  if (ev('reduced_spring_flow') && ev('diversion_and_seep')) concluded.push({ id: 'c:one_diversion', key: 'journal.c.one_diversion_insufficient' });
  if (ev('cracked_sluice') && s.quest.gate !== 'stabilized') concluded.push({ id: 'c:brace_first', key: 'journal.c.brace_first' });
  if (s.quest.gate === 'jammed') concluded.push({ id: 'c:jammed', key: 'journal.c.gate_jammed' });
  if (s.quest.gate === 'stabilized') concluded.push({ id: 'c:stable', key: 'journal.c.gate_stable' });
  if (ev('rotation_ledger')) concluded.push({ id: 'c:precedent', key: 'journal.c.precedent' });
  if (s.quest.allocation) {
    concluded.push({ id: 'c:allocation', key: `journal.c.alloc_${s.quest.allocation}` });
    if (hasFact(s, 'emergency_allocation')) concluded.push({ id: 'c:emergency', key: 'journal.c.emergency_expires' });
    if (hasFact(s, 'public_account_misleading')) concluded.push({ id: 'c:misleading', key: 'journal.c.account_misleading' });
    if (hasFact(s, 'rotation_caretaker_witness')) concluded.push({ id: 'c:caretaker', key: 'journal.c.caretaker_witness' });
  }

  const places = PLACE_ORDER.map((id) => {
    const claimed = CLAIMED_PLACE_FACTS[id];
    const status: 'verified' | 'claimed' | 'unknown' = s.discovered[id] ? 'verified' : claimed && hasFact(s, claimed) ? 'claimed' : 'unknown';
    return { id, status };
  });

  const people = NPC_IDS.map((npc) => ({ npc, met: s.npcs[npc].met, available: s.npcs[npc].available }));

  const leadKey = s.quest.entry ? `journal.lead.${s.quest.entry.split(':')[0]}` : hasFact(s, 'arrival_amnesia') ? 'journal.lead.arrival' : null;

  return {
    leadKey,
    observed,
    reported,
    concluded,
    questions,
    places,
    people,
    statusKey: s.quest.phase === 'unseen' && hasFact(s, 'arrival_amnesia') ? 'journal.status.arrival' : `journal.status.${s.quest.phase}`,
  };
}
