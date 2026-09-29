import { INSPECT_POINTS } from '../content/inspect';
import { APPLY_DELAY_MIN, REPORT_DELAY_MIN, REWARD_COIN, RITE_CALM_MIN, TRAINING_COST } from './constants';
import { evalAll, hasFact, itemCount, phaseIndex } from './state';
import {
  DECISION_MAKERS,
  PARTIES,
  PARTY_NPC,
  type Allocation,
  type Command,
  type CommandResult,
  type Effect,
  type EvidenceId,
  type EvidenceVia,
  type GameEvent,
  type ItemId,
  type NpcId,
  type OffenseKind,
  type PendingReport,
  type QuestPhase,
  type WorldState,
} from './types';

const clampTrust = (n: number) => Math.max(-5, Math.min(5, n));

type Fail = { ok: false; reason: string };
const fail = (reason: string): Fail => ({ ok: false, reason });

/* ---------- Effect application ---------- */

/** Apply one authored effect to a draft state. Returns an error string on failure. */
export function applyEffect(s: WorldState, e: Effect, events: GameEvent[]): string | null {
  switch (e.t) {
    case 'fact':
      s.facts[e.key] = e.value ?? true;
      recomputeDerived(s, events);
      return null;
    case 'evidence':
      addEvidence(s, e.id, e.via, e.source, events);
      recomputeDerived(s, events);
      return null;
    case 'trust': {
      const n = s.npcs[e.npc];
      n.trust = clampTrust(n.trust + e.delta);
      events.push({ t: 'trust', npc: e.npc, delta: e.delta });
      return null;
    }
    case 'grant': {
      if (s.grants[e.id]) return null; // one-time rewards: repeating dialogue never duplicates them
      s.grants[e.id] = true;
      for (const [id, qty] of Object.entries(e.items) as [ItemId, number][]) {
        s.inventory[id] = (s.inventory[id] ?? 0) + qty;
      }
      events.push({ t: 'grant', id: e.id, items: e.items });
      return null;
    }
    case 'item': {
      const cur = itemCount(s, e.id);
      if (cur + e.delta < 0) return `missing_item:${e.id}`;
      s.inventory[e.id] = cur + e.delta;
      events.push({ t: 'item', id: e.id, delta: e.delta });
      return null;
    }
    case 'consent':
      s.facts[`consent_${e.party}`] = true;
      return null;
    case 'enter':
      enterInvestigation(s, e.trigger, events);
      return null;
    case 'met':
      s.npcs[e.npc].met = true;
      return null;
    case 'cmd': {
      const r = execute(s, e.cmd);
      if (!r.ok) return r.reason;
      events.push(...r.events);
      return null;
    }
  }
}

export function applyEffects(s: WorldState, effects: Effect[] | undefined, events: GameEvent[]): string | null {
  for (const e of effects ?? []) {
    const err = applyEffect(s, e, events);
    if (err) return err;
  }
  return null;
}

/* ---------- Quest primitives ---------- */

function setPhase(s: WorldState, phase: QuestPhase, events: GameEvent[]) {
  if (s.quest.phase === phase) return;
  s.quest.phase = phase;
  events.push({ t: 'phase', phase });
}

function enterInvestigation(s: WorldState, trigger: string, events: GameEvent[]) {
  if (s.quest.phase !== 'unseen') return;
  s.quest.entry = trigger;
  setPhase(s, 'investigating', events);
}

function addEvidence(s: WorldState, id: EvidenceId, via: EvidenceVia, source: string, events: GameEvent[]) {
  if (s.evidence[id]) return; // add evidence once; provenance of the first source is kept
  s.evidence[id] = { via, source, atClock: s.clock };
  events.push({ t: 'evidence', id, via });
  // Evidence of any kind is an implicit entry into the investigation.
  enterInvestigation(s, `evidence:${id}`, events);
}

/** Evidence that follows from other facts rather than a single act. */
export function recomputeDerived(s: WorldState, events: GameEvent[]) {
  const town = hasFact(s, 'saw_diversion') || hasFact(s, 'reeve_admits_diversion');
  const seep = hasFact(s, 'saw_seep') || hasFact(s, 'foreman_admits_seep');
  if (town && seep && !s.evidence.diversion_and_seep) {
    addEvidence(s, 'diversion_and_seep', 'derived', 'derived.diversion_and_seep', events);
  }
}

function hasProcedure(s: WorldState): boolean {
  return s.evidence.worker_testimony !== undefined;
}

export function riteCalmActive(s: WorldState): boolean {
  const until = s.facts.rite_calm_until;
  return typeof until === 'number' && s.clock < until;
}

export function stabilizePreconditions(s: WorldState): string | null {
  if (s.quest.gate === 'stabilized') return 'already_stable';
  if (itemCount(s, 'sluice_brace') < 1) return 'need_brace';
  if (itemCount(s, 'gate_wrench') < 1) return 'need_wrench';
  if (!hasProcedure(s) && !s.evidence.cracked_sluice) return 'need_understanding';
  return null;
}

/** Why a rotation cannot be committed yet (null when it can). */
export function rotationBlockers(s: WorldState): string[] {
  const out: string[] = [];
  if (!s.evidence.dry_channel || !s.evidence.diversion_and_seep) out.push('evidence_both_needs');
  for (const p of PARTIES) {
    const npc = PARTY_NPC[p];
    if (s.npcs[npc].available && !hasFact(s, `consent_${p}`)) out.push(`consent_${p}`);
  }
  return out;
}

export function commitPreconditions(s: WorldState, allocation: Allocation): string | null {
  if (s.quest.phase !== 'decision_ready') return s.quest.phase === 'committed' || s.quest.phase === 'settled' ? 'already_committed' : 'not_ready';
  if (s.quest.gate !== 'stabilized') return 'gate_unsafe';
  if (allocation === 'rotation') {
    const b = rotationBlockers(s);
    if (b.length > 0) return b[0] ?? 'blocked';
  }
  return null;
}

/* ---------- Reports: observed_by vs known_to ---------- */

export function queueReport(s: WorldState, offense: OffenseKind, observedBy: NpcId[], reportTo: NpcId): PendingReport {
  const witnessIsRecipient = observedBy.includes(reportTo);
  const report: PendingReport = {
    id: `${offense}#${s.offenses.pending.length + s.offenses.known.length}`,
    offense,
    observedBy: [...observedBy],
    reportTo,
    dueClock: s.clock + (witnessIsRecipient ? 0 : REPORT_DELAY_MIN),
  };
  s.offenses.pending.push(report);
  return report;
}

function deliverReport(s: WorldState, r: PendingReport, events: GameEvent[]) {
  s.offenses.known.push({ offense: r.offense, knownTo: [r.reportTo], atClock: s.clock });
  events.push({ t: 'report', offense: r.offense, to: r.reportTo });
  if (r.offense === 'archive_trespass') {
    s.facts.archive_access_lost = true;
    s.facts.archive_reported = true;
    const edda = s.npcs.spring_steward;
    edda.trust = clampTrust(edda.trust - 2);
    s.inventory.archive_key = 0;
    s.locationChanges.archive_door = 'locked';
    s.locationChanges.archive_shutter = 'sealed';
  } else if (r.offense === 'gate_forced') {
    const edda = s.npcs.spring_steward;
    edda.trust = clampTrust(edda.trust - 1);
  }
}

function deliverDueReports(s: WorldState, events: GameEvent[]) {
  const due = s.offenses.pending.filter((r) => r.dueClock <= s.clock);
  if (due.length === 0) return;
  s.offenses.pending = s.offenses.pending.filter((r) => r.dueClock > s.clock);
  for (const r of due) deliverReport(s, r, events);
}

/* ---------- Command execution ---------- */

/** Apply a command to a draft state. Callers clone first so failures leave state untouched. */
export function execute(s: WorldState, cmd: Command): CommandResult {
  const events: GameEvent[] = [];
  const ok = (): CommandResult => ({ ok: true, events });

  switch (cmd.t) {
    case 'observe': {
      addEvidence(s, cmd.id, cmd.via, cmd.source, events);
      recomputeDerived(s, events);
      return ok();
    }

    case 'enter':
      enterInvestigation(s, cmd.trigger, events);
      return ok();

    case 'discover': {
      if (s.discovered[cmd.place]) return ok();
      s.discovered[cmd.place] = true;
      events.push({ t: 'place', id: cmd.place });
      // The bell brings people to Rillford; walking up to a broken sluice is its own way in.
      if (cmd.place === 'rillford') enterInvestigation(s, 'bell', events);
      if (cmd.place === 'sluice') enterInvestigation(s, 'sluice', events);
      return ok();
    }

    case 'inspect': {
      const pt = INSPECT_POINTS[cmd.pointId];
      if (!pt) return fail('unknown_point');
      if (!evalAll(s, pt.requires)) return fail('requirements');
      const err = applyEffects(s, pt.effects, events);
      if (err) return fail(err);
      return ok();
    }

    case 'pickup': {
      const key = `pickup:${cmd.pickupId}`;
      if (s.locationChanges[key] === 'taken') return fail('already_taken');
      s.locationChanges[key] = 'taken';
      s.inventory[cmd.item] = (s.inventory[cmd.item] ?? 0) + cmd.qty;
      events.push({ t: 'item', id: cmd.item, delta: cmd.qty });
      return ok();
    }

    case 'openShortcut': {
      if (s.locationChanges.shortcut === 'open') return fail('already_open');
      s.locationChanges.shortcut = 'open';
      s.facts.shortcut_opened = true;
      events.push({ t: 'shortcut' });
      // The gate gives the stranded worker a way round the ledge; she leaves under her own power.
      if (s.npcs.maintenance_worker.available && !hasFact(s, 'ila_rescued')) {
        s.facts.ila_rescued = true;
        s.facts.ila_method = 'shortcut';
        s.npcs.maintenance_worker.trust = clampTrust(s.npcs.maintenance_worker.trust + 1);
        enterInvestigation(s, 'worker', events);
        events.push({ t: 'worker_rescued', method: 'shortcut' });
      }
      return ok();
    }

    case 'rescueWorker': {
      if (!s.npcs.maintenance_worker.available) return fail('worker_unavailable');
      if (hasFact(s, 'ila_rescued')) return fail('already_rescued');
      if (cmd.method === 'fight' && !s.defeated.cut_creature) return fail('path_blocked');
      if (cmd.method === 'shortcut' && s.locationChanges.shortcut !== 'open') return fail('path_blocked');
      s.facts.ila_rescued = true;
      s.facts.ila_method = cmd.method;
      const n = s.npcs.maintenance_worker;
      n.trust = clampTrust(n.trust + 1);
      enterInvestigation(s, 'worker', events);
      events.push({ t: 'worker_rescued', method: cmd.method });
      return ok();
    }

    case 'archiveAccess': {
      if (s.facts.archive_access_lost === true && cmd.method !== 'trespass') return fail('access_withdrawn');
      if (cmd.method === 'permission') {
        if (!hasFact(s, 'edda_permission')) return fail('no_permission');
        s.locationChanges.archive_door = 'open';
      } else if (cmd.method === 'borrowed_key') {
        if (itemCount(s, 'archive_key') < 1) return fail('no_key');
        s.locationChanges.archive_door = 'open';
      } else {
        if (s.locationChanges.archive_shutter === 'sealed') return fail('sealed');
        if (s.locationChanges.archive_shutter === 'forced') return fail('already_forced');
        s.locationChanges.archive_shutter = 'forced';
        s.facts.archive_trespassed = true;
        const observers = (cmd.observedBy ?? []).filter((n) => s.npcs[n].available);
        // Only witnesses start a report. An unobserved entry leaves no trace beyond the shutter itself.
        if (observers.length > 0) queueReport(s, 'archive_trespass', observers, 'spring_steward');
        deliverDueReports(s, events);
      }
      s.facts.archive_via = cmd.method;
      events.push({ t: 'archive', method: cmd.method });
      return ok();
    }

    case 'readLedger': {
      const door = s.locationChanges.archive_door === 'open';
      const shutter = s.locationChanges.archive_shutter === 'forced';
      if (!door && !shutter) return fail('archive_closed');
      addEvidence(s, 'rotation_ledger', 'document', 'archive.ledger', events);
      recomputeDerived(s, events);
      return ok();
    }

    case 'performRite': {
      if (!hasFact(s, 'rite_taught')) return fail('rite_unknown');
      if (itemCount(s, 'votive_reed') < 1) return fail('need_reed');
      s.inventory.votive_reed = itemCount(s, 'votive_reed') - 1;
      s.facts.rite_done = true;
      s.facts.rite_calm_until = s.clock + RITE_CALM_MIN;
      events.push({ t: 'item', id: 'votive_reed', delta: -1 }, { t: 'rite' });
      return ok();
    }

    case 'stabilizeGate': {
      const block = stabilizePreconditions(s);
      if (block) return fail(block);
      // Validate then commit together: the brace is only consumed with the repair.
      const safe = riteCalmActive(s) || hasProcedure(s);
      s.inventory.sluice_brace = itemCount(s, 'sluice_brace') - 1;
      s.quest.gate = 'stabilized';
      s.quest.repairRequired = false;
      s.facts.gate_safe = safe;
      events.push({ t: 'item', id: 'sluice_brace', delta: -1 }, { t: 'gate', gate: 'stabilized' });
      if (!safe) {
        s.player.health = Math.max(1, s.player.health - 15);
        s.facts.surge_hurt = true;
        events.push({ t: 'surge' });
      }
      enterInvestigation(s, 'gate', events);
      if (phaseIndex(s.quest.phase) < phaseIndex('decision_ready')) setPhase(s, 'decision_ready', events);
      events.push({ t: 'autosave', reason: 'gate_stabilized' });
      return ok();
    }

    case 'forceGate': {
      if (s.quest.gate !== 'damaged') return fail('not_forcible');
      s.quest.gate = 'jammed';
      s.quest.repairRequired = true; // a damaging action adds a condition; it never discards investigation
      s.facts.gate_forced = true;
      events.push({ t: 'gate', gate: 'jammed' });
      enterInvestigation(s, 'gate', events);
      const observers = (cmd.observedBy ?? []).filter((n) => s.npcs[n].available);
      if (observers.length > 0) queueReport(s, 'gate_forced', observers, 'spring_steward');
      else s.npcs.spring_steward.trust = clampTrust(s.npcs.spring_steward.trust - 1);
      events.push({ t: 'autosave', reason: 'gate_forced' });
      return ok();
    }

    case 'commitAllocation': {
      const block = commitPreconditions(s, cmd.allocation);
      if (block) return fail(block);
      s.quest.allocation = cmd.allocation;
      s.quest.committedAtClock = s.clock;
      setPhase(s, 'committed', events);

      const witnesses: NpcId[] = [];
      if (cmd.allocation === 'rotation') {
        for (const p of PARTIES) if (s.npcs[PARTY_NPC[p]].available) witnesses.push(PARTY_NPC[p]);
        const missing = DECISION_MAKERS.some((n) => !s.npcs[n].available);
        s.facts.rotation_caretaker_witness = missing;
        s.quest.maintainer = 'shared_rota';
        s.quest.reactions = ['schedule_posted', 'shift_bell', 'tired_night_crew'];
      } else if (cmd.allocation === 'rillford') {
        s.facts.emergency_allocation = true; // expires unless reviewed (Accord, obligation 5)
        s.quest.maintainer = 'rillford_council';
        s.quest.reactions = ['channel_fills', 'mill_turns', 'quarry_idle'];
      } else {
        s.facts.emergency_allocation = true;
        s.quest.maintainer = 'quarry_contract';
        s.quest.reactions = ['quarry_working', 'mill_still', 'contract_guard'];
      }
      s.quest.witnesses = witnesses;

      const t = (npc: NpcId, d: number) => {
        if (s.npcs[npc].available) s.npcs[npc].trust = clampTrust(s.npcs[npc].trust + d);
      };
      if (cmd.allocation === 'rillford') {
        t('rillford_reeve', 2);
        t('quarry_foreman', -2);
        t('village_baker', 1);
      } else if (cmd.allocation === 'quarry') {
        t('quarry_foreman', 2);
        t('estate_steward', 1);
        t('rillford_reeve', -2);
      } else {
        t('rillford_reeve', 1);
        t('quarry_foreman', 1);
        t('spring_steward', 1);
      }
      if (cmd.allocation !== 'rotation' && DECISION_MAKERS.some((n) => !s.npcs[n].available)) {
        s.facts.public_statement_posted = true; // noticeboard records an emergency allocation
      }
      s.facts.public_account_misleading = hasFact(s, 'evidence_hidden');

      events.push({ t: 'allocation', allocation: cmd.allocation }, { t: 'autosave', reason: 'committed' });
      return ok();
    }

    case 'settle': {
      if (s.quest.phase !== 'committed' || !s.quest.allocation) return fail('not_committed');
      const at = s.quest.committedAtClock ?? s.clock;
      if (s.clock < at + APPLY_DELAY_MIN) return fail('still_applying');
      const alloc = s.quest.allocation;
      s.quest.settledAtClock = s.clock;
      setPhase(s, 'settled', events);
      s.facts[`aftermath_${alloc}`] = true;
      s.facts.settled_via = cmd.via;
      const cloth: ItemId = alloc === 'rillford' ? 'league_sash' : alloc === 'quarry' ? 'contract_band' : 'witness_cord';
      applyEffect(s, { t: 'grant', id: 'dry_bell_completion', items: { coin: REWARD_COIN, [cloth]: 1 } }, events);
      // Saved callback flag for the later bridge-repair campaign hook; no bridge quest exists yet.
      s.facts.callback_quarry_contract = alloc;
      events.push({ t: 'autosave', reason: 'settled' });
      return ok();
    }

    case 'train': {
      if (s.skills.includes(cmd.skill)) return fail('already_known');
      if (!s.npcs.shrine_warden.available) return fail('trainer_unavailable');
      const competent = Object.keys(s.defeated).length > 0;
      if (!competent) {
        if (itemCount(s, 'coin') < TRAINING_COST) return fail('need_payment');
        s.inventory.coin = itemCount(s, 'coin') - TRAINING_COST;
        events.push({ t: 'item', id: 'coin', delta: -TRAINING_COST });
      }
      s.skills.push(cmd.skill);
      events.push({ t: 'skill', id: cmd.skill });
      return ok();
    }

    case 'defeat': {
      s.defeated[cmd.id] = true;
      events.push({ t: 'autosave', reason: 'encounter_cleared' });
      return ok();
    }

    case 'setUnavailable': {
      const n = s.npcs[cmd.npc];
      n.available = false;
      n.cause = cmd.cause;
      events.push({ t: 'npc', npc: cmd.npc, available: false });
      return ok();
    }

    case 'setAvailable': {
      const n = s.npcs[cmd.npc];
      n.available = true;
      n.cause = null;
      events.push({ t: 'npc', npc: cmd.npc, available: true });
      return ok();
    }

    case 'advanceClock': {
      s.clock += Math.max(0, cmd.minutes);
      deliverDueReports(s, events);
      return ok();
    }

    case 'useItem': {
      if (cmd.item !== 'poultice') return fail('not_usable');
      if (itemCount(s, 'poultice') < 1) return fail('missing_item');
      if (s.player.health >= s.player.maxHealth) return fail('already_healthy');
      s.inventory.poultice = itemCount(s, 'poultice') - 1;
      s.player.health = Math.min(s.player.maxHealth, s.player.health + 40);
      events.push({ t: 'item', id: 'poultice', delta: -1 });
      return ok();
    }

    case 'damagePlayer':
      s.player.health = Math.max(0, s.player.health - Math.max(0, cmd.amount));
      return ok();

    case 'healPlayer':
      s.player.health = Math.min(s.player.maxHealth, s.player.health + Math.max(0, cmd.amount));
      return ok();

    case 'setFact':
      s.facts[cmd.key] = cmd.value;
      recomputeDerived(s, events);
      return ok();
  }
}

