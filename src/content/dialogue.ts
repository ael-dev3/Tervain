import type { Cond, DialogueChoice, DialogueNode, EntryRule, Effect, EvidenceId, NpcId } from '../game/types';

/**
 * Text-first dialogue for the Bellwether slice. Every line is a proposal, not approved canon
 * (docs/decisions.md). Nodes and choices reference display strings by stable key; the
 * strings live in DIALOGUE_STRINGS so a later localization pass touches one table.
 */

export const DIALOGUE_STRINGS: Record<string, string> = {};
export const DIALOGUE_NODES: Record<string, DialogueNode> = {};

type Opts = { intent?: DialogueChoice['intent']; when?: Cond[]; locked?: boolean; fx?: Effect[] };
type C = [text: string, next: string, opts?: Opts];

function N(id: string, speaker: NpcId | 'narrator', text: string, choices: C[], onEnter?: Effect[]) {
  const key = `d.${id}`;
  DIALOGUE_STRINGS[key] = text;
  const built: DialogueChoice[] = choices.map(([ctext, next, o], i) => {
    const ckey = `${key}#${i}`;
    DIALOGUE_STRINGS[ckey] = ctext;
    const choice: DialogueChoice = { text: ckey, next };
    if (o?.intent) choice.intent = o.intent;
    if (o?.when) choice.when = o.when;
    if (o?.locked) choice.showLocked = true;
    if (o?.fx) choice.effects = o.fx;
    return choice;
  });
  const node: DialogueNode = { id, speaker, text: key, choices: built };
  if (onEnter) node.onEnter = onEnter;
  DIALOGUE_NODES[id] = node;
}

/* ---- condition and effect shorthands ---- */
const F = (key: string, is?: boolean | number | string): Cond => (is === undefined ? { t: 'fact', key } : { t: 'fact', key, is });
const NF = (key: string): Cond => ({ t: 'not', c: { t: 'fact', key } });
const E = (id: EvidenceId): Cond => ({ t: 'evidence', id });
const NE = (id: EvidenceId): Cond => ({ t: 'not', c: E(id) });
/** A visibility filter: the choice only appears while this holds (it is never shown as a locked requirement). */
const only = (c: Cond): Cond => ({ t: 'not', c: { t: 'not', c } });
const alloc = (is: 'rillford' | 'quarry' | 'rotation'): Cond => ({ t: 'alloc', is });
const settled: Cond = { t: 'phase', is: 'settled' };
const committed: Cond = { t: 'phase', is: 'committed' };
const applied: Cond = { t: 'applied' };
const notApplied: Cond = { t: 'not', c: applied };
const setFact = (key: string, value?: boolean | number | string): Effect => (value === undefined ? { t: 'fact', key } : { t: 'fact', key, value });
const trust = (npc: NpcId, delta: number): Effect => ({ t: 'trust', npc, delta });
const met = (npc: NpcId): Effect => ({ t: 'met', npc });
const enter = (trigger: string): Effect => ({ t: 'enter', trigger });
const ev = (id: EvidenceId, via: 'observed' | 'testimony' | 'document', source: string): Effect => ({ t: 'evidence', id, via, source });

/* =====================================================================
 * Joss Merrin — caravan master on the strand (opening)
 * ===================================================================== */
N('joss_intro', 'caravan_master',
  'Rillford is as far as the wagon goes. The ford road washed out in the thaw, and listen — that bell has been ringing since dawn. It is their drought bell. I have your six coin against passage; it will not stretch far. Walk inland, over the overlook, and find work; I will turn the wagon when the road is fit.',
  [
    ['What does the bell mean?', 'joss_bell', { intent: 'ask', fx: [met('caravan_master')] }],
    ['Where do I find work?', 'joss_work', { intent: 'ask', fx: [met('caravan_master')] }],
    ['I will go down now.', 'end', { intent: 'leave', fx: [met('caravan_master')] }],
  ]);
N('joss_bell', 'caravan_master',
  'Rillford rings it when the household channels run dry. Nobody rings it lightly. Whatever the flood did upstream, the village is feeling it.',
  [
    ['Where do I find work?', 'joss_work', { intent: 'ask' }],
    ['I will go down now.', 'end', { intent: 'leave' }],
  ], [setFact('told_rillford')]);
N('joss_work', 'caravan_master',
  'Ask for the reeve, Mara Venn — the Hearth League keeps the village. East there is a quarry under a Marcher contract, north a Templar spring shrine. Between them they will have work for a spare pair of hands, and arguments to go with it.',
  [
    ['Thank you.', 'end', { intent: 'leave' }],
  ], [setFact('told_rillford'), setFact('told_quarry'), setFact('told_shrine')]);
N('joss_hub', 'caravan_master',
  'Wagon is not going anywhere yet. What do you need?',
  [
    ['What does the bell mean?', 'joss_bell', { intent: 'ask' }],
    ['Where do I find work?', 'joss_work', { intent: 'ask' }],
    ['Nothing.', 'end', { intent: 'leave' }],
  ]);
N('joss_after', 'caravan_master',
  'I heard the bell ring differently this morning. You have earned your passage twice over. The wagon leaves whenever you are ready — though I think you may find reasons to stay a while.',
  [['Perhaps.', 'end', { intent: 'leave' }]]);

/* =====================================================================
 * Mara Venn — Rillford reeve (Hearth League)
 * ===================================================================== */
N('mara_intro', 'rillford_reeve',
  'You came in along the shore road and over the overlook, so you heard the bell. It has not rung in my term until today. I am Mara Venn; Rillford elected me to keep it fed, and this morning I have very little to feed anyone with.',
  [
    ['What has happened to the water?', 'mara_cause', { intent: 'ask', fx: [met('rillford_reeve')] }],
    ['I need work and a bed. I can help.', 'mara_offer', { intent: 'offer', fx: [met('rillford_reeve')] }],
    ['Another time.', 'end', { intent: 'leave', fx: [met('rillford_reeve')] }],
  ]);
N('mara_cause', 'rillford_reeve',
  'The late thaw broke the old sluice upstream and choked the spring channels with silt. The household channel behind the mill is dry — go and see it. The quarry wants water, the shrine wants its share, and I cannot give all three what each is owed.',
  [
    ['Where are the sluice, the shrine and the quarry?', 'mara_directions', { intent: 'ask' }],
    ['I will look at the channel.', 'end', { intent: 'leave' }],
  ], [enter('reeve'), setFact('told_sluice'), setFact('told_shrine'), setFact('told_quarry'), setFact('told_dry_channel')]);
N('mara_directions', 'rillford_reeve',
  'North along the mill lane to the sluice; past it, up the steps, is the spring shrine. The cut track east of the fields leads to the quarry — Darin Kest and his crew. The ford is south-east. The side path off the ford has not been safe lately.',
  [
    ['Thank you.', 'mara_hub', { intent: 'leave' }],
  ], [setFact('told_ford_path')]);
N('mara_offer', 'rillford_reeve',
  'The Hearth League does not turn away hands. Look at the channel, then talk to Darin and to Sister Edda before you decide anything. I would rather you heard all of us than only me.',
  [['I will.', 'mara_hub', { intent: 'agree' }]],
  [enter('reeve'), setFact('told_sluice'), setFact('told_shrine'), setFact('told_quarry'), setFact('told_dry_channel')]);

N('mara_hub', 'rillford_reeve',
  'What do you need to know?',
  [
    ['How bad is it for the households?', 'mara_needs', { intent: 'ask', when: [NE('dry_channel')] }],
    ['Tell me again what the households need.', 'mara_needs', { intent: 'ask', when: [E('dry_channel')] }],
    ['That side diversion above the fields — that was Rillford?', 'mara_diversion', { intent: 'ask', locked: true, when: [F('saw_diversion'), NF('reeve_admits_diversion')] }],
    ['Would you stand for a witnessed rotation with the quarry?', 'mara_rotation', { intent: 'persuade', locked: true, when: [E('dry_channel'), E('diversion_and_seep'), NF('consent_mara')] }],
    ['The old ledger says the households gave more than the record shows.', 'mara_ledger', { intent: 'offer', when: [E('rotation_ledger'), NF('told_mara_ledger')] }],
    ['Leave the ledger out of what we tell people.', 'mara_hide', { intent: 'persuade', when: [E('rotation_ledger'), NF('evidence_hidden')] }],
    ['Where do I find the others?', 'mara_directions', { intent: 'ask' }],
    ['Goodbye.', 'end', { intent: 'leave' }],
  ]);
N('mara_needs', 'rillford_reeve',
  'Every household is down to a bucket a day. The communal mill is idle, and without it the planting will not be ground into bread. I promised more relief than the remaining flow can carry — I said days. That is on me. If it comes to one or the other, I would choose the village, and I will not pretend otherwise.',
  [['I understand.', 'mara_hub', { intent: 'agree' }]],
  [ev('dry_channel', 'testimony', 'mara.needs'), setFact('claim_reeve_promised_relief'), setFact('told_dry_channel')]);
N('mara_diversion', 'rillford_reeve',
  'Yes. When the channel first ran short I opened a small side gate above the fields, and I did not call the witnesses the Accord asks for. I told myself it was too small to matter. It is not nothing.',
  [['Thank you for saying it.', 'mara_hub', { intent: 'agree' }]],
  [setFact('reeve_admits_diversion'), trust('rillford_reeve', 1)]);
N('mara_rotation', 'rillford_reeve',
  'A schedule the whole valley can watch, kept by witnesses. The households have given more labor than the public ledger records — the schedule has to count it. If Darin will sign and Edda will stand as waterkeeper, I will stand for Rillford.',
  [['Then it is agreed on your side.', 'mara_hub', { intent: 'agree' }]],
  [{ t: 'consent', party: 'mara' }]);
N('mara_ledger', 'rillford_reeve',
  'So there is a record. Then we can say plainly what the village gave, and ask the quarry for the same honesty. Thank you — it is more than the Templars ever offered me.',
  [['It should be counted.', 'mara_hub', { intent: 'agree' }]],
  [setFact('told_mara_ledger'), trust('rillford_reeve', 1)]);
N('mara_hide', 'rillford_reeve',
  'You want the account to say only that the flood broke the sluice? That is not the whole truth, and you know it. But it would spare people. …I do not like it. I will not contradict you.',
  [['Good.', 'mara_hub', { intent: 'agree' }]],
  [setFact('evidence_hidden'), trust('rillford_reeve', -1)]);

N('mara_jammed', 'rillford_reeve',
  'Someone forced the sluice, and the household channel is worse than yesterday. Whoever it was, the gate is jammed now. It will need a proper brace and a hand that knows what it is doing before anyone gets a drop.',
  [['I will fix it.', 'mara_hub', { intent: 'agree' }], ['Goodbye.', 'end', { intent: 'leave' }]],
  [setFact('mara_told_jam')]);

/* Reports and aftermath */
const reportChoices = (after: string): C[] => [
  ['Then it holds. The arrangement stands.', after, { intent: 'agree', when: [applied], fx: [{ t: 'cmd', cmd: { t: 'settle', via: 'mara_report' } }] }],
  ['I will check the channels again shortly.', 'end', { intent: 'leave', when: [notApplied] }],
];
N('mara_report_rillford', 'rillford_reeve',
  'The channel behind the mill is filling — I can hear it. The wheel will turn by midday. It cost the quarry, and I know it. This is an emergency allocation; the Accord says it expires unless reviewed. We will owe a review.',
  reportChoices('mara_after_rillford'));
N('mara_report_quarry', 'rillford_reeve',
  'The mill sits still and the households still ration. I said I would abide by what you decided, and I will — but Rillford is protesting, and so am I. An emergency allocation expires unless it is reviewed.',
  reportChoices('mara_after_quarry'));
N('mara_report_rotation', 'rillford_reeve',
  'There it is on the board: mill by day, quarry by night. Neither of us has what we asked for. It will hold as long as we keep watching it — and we will. Witnessed, as the Accord asks.',
  reportChoices('mara_after_rotation'));
N('mara_after_rillford', 'rillford_reeve',
  'Water in the channel. Bread by the weekend. Darin\'s crew will not forgive it soon; I have asked Bess to take the idle crew\'s hours against our stores as far as we can stretch. Rillford owes you, and I will not forget which side of it we were on.',
  [['Is the allocation lawful?', 'mara_after_law', { intent: 'ask' }], ['Goodbye.', 'end', { intent: 'leave' }]]);
N('mara_after_quarry', 'rillford_reeve',
  'The quarry cuts again, the delivery goes out, and my neighbors queue at the well. I can carry that a season. Not two. I will bring it to review, and I will bring the ledger with me.',
  [['Is the allocation lawful?', 'mara_after_law', { intent: 'ask' }], ['Goodbye.', 'end', { intent: 'leave' }]]);
N('mara_after_rotation', 'rillford_reeve',
  'Half a mill and half a quarry, and both of them angry with me for promising less than they wanted. That is what a fair schedule looks like. Come and see the night crew in the morning; they will tell you what it costs.',
  [['Is the allocation lawful?', 'mara_after_law', { intent: 'ask' }], ['Goodbye.', 'end', { intent: 'leave' }]]);
N('mara_after_law', 'rillford_reeve',
  'A witnessed rotation, with the waterkeeper standing for it, is the kind of change the Accord recognizes. An emergency allocation is not — it lapses unless reviewed, and nobody owns the water for having held the gate. Whichever you chose, that is the truth of it.',
  [['I see.', 'end', { intent: 'leave' }]]);

/* =====================================================================
 * Sister Edda Sorn — Templar waterkeeper
 * ===================================================================== */
N('edda_intro', 'spring_steward',
  'You have the look of someone walking since dawn. I am Sister Edda Sorn, waterkeeper of this spring. If Rillford has sent you, tell them the spring still gives what it can — it is the channels below that have failed, not the water at its source.',
  [
    ['What happened to the spring?', 'edda_spring', { intent: 'ask', fx: [met('spring_steward')] }],
    ['I am only walking through.', 'end', { intent: 'leave', fx: [met('spring_steward')] }],
  ]);
N('edda_spring', 'spring_steward',
  'The flood laid silt through the intake channels. The flow is thin, but the wetland lives. Go and look at the intake yourself before you listen to anyone who says the spring is failing.',
  [['I will look.', 'edda_hub', { intent: 'agree' }]],
  [enter('steward'), setFact('told_sediment')]);
N('edda_hub', 'spring_steward',
  'The spring is quiet today. What would you ask?',
  [
    ['What is wrong with the flow?', 'edda_flow', { intent: 'ask', when: [NE('reduced_spring_flow')] }],
    ['You know the sluice. What state is it in?', 'edda_sluice', { intent: 'ask', locked: true, when: [F('saw_sluice_damage'), NF('edda_confirms_crack')] }],
    ['The inspection log skips the week before the thaw.', 'edda_admits', { intent: 'accuse', locked: true, when: [F('saw_inspection_gap'), NF('edda_admits_deferral')] }],
    ['May I read the rotation records in the archive?', 'edda_archive_yes', { intent: 'ask', locked: true, when: [NF('edda_permission'), NF('archive_access_lost'), E('reduced_spring_flow')] }],
    ['Teach me the spring rite.', 'edda_rite', { intent: 'ask', locked: true, when: [NF('rite_taught'), E('reduced_spring_flow')] }],
    ['Will you stand as waterkeeper for a witnessed rotation?', 'edda_consent', { intent: 'persuade', locked: true, when: [NF('consent_edda'), E('reduced_spring_flow'), E('cracked_sluice')] }],
    ['Farewell.', 'end', { intent: 'leave' }],
  ]);
N('edda_flow', 'spring_steward',
  'The foreman says the spring is failing. It is not failing — sediment obstructs it. If you doubt me, kneel at the intake and put your hand in.',
  [['I will.', 'edda_hub', { intent: 'agree' }]],
  [setFact('claim_steward_sediment')]);
N('edda_sluice', 'spring_steward',
  'The support beside the gate cracked in the flood. I have not examined it closely since. An inspection was due before the thaw, and the roads were closed. I would not force that gate open — it could give way.',
  [['Understood.', 'edda_hub', { intent: 'agree' }]],
  [ev('cracked_sluice', 'testimony', 'edda.sluice'), setFact('edda_confirms_crack')]);
N('edda_admits', 'spring_steward',
  '…Yes. I deferred it. I told myself the roads were closed; the truth is I trusted old stone. I will say so publicly if it helps. The order preaches restraint, and I let restraint become neglect.',
  [['Thank you for the honesty.', 'edda_hub', { intent: 'agree' }]],
  [setFact('edda_admits_deferral'), trust('spring_steward', 1)]);
N('edda_archive_yes', 'spring_steward',
  'You have seen what the flood left at the intake, so you have a reason. The archive is not a public room. Warden Harrow keeps the door; tell him I said yes. Read what you need, and put it back where you found it.',
  [['I will be careful.', 'edda_hub', { intent: 'agree' }]],
  [setFact('edda_permission'), setFact('told_archive_door')]);
N('edda_rite', 'spring_steward',
  'The rite calms an unstable flow for a while — perhaps forty minutes — long enough to work the sluice safely. It does not make water; it makes a gate less violent. It takes a votive reed, and I have one to spare. There is no second.',
  [['I will use it well.', 'edda_hub', { intent: 'agree' }]],
  [{ t: 'grant', id: 'edda_reed', items: { votive_reed: 1 } }, setFact('rite_taught')]);
N('edda_consent', 'spring_steward',
  'The minimum flow to the wetland stays as the Accord sets it. The sluice is braced before anything is opened. Both users\' needs are written down and witnessed. If all that is done, yes — I will stand for the spring.',
  [['That is all I ask.', 'edda_hub', { intent: 'agree' }]],
  [{ t: 'consent', party: 'edda' }]);
N('edda_caught', 'spring_steward',
  'I know about the archive shutter. I will not pretend otherwise. Access is withdrawn; the key stays with Harrow. Trust is a thing I give slowly, and you have spent some of it.',
  [['I understand.', 'edda_hub', { intent: 'agree' }]],
  [setFact('edda_confronted_trespass')]);
N('edda_jammed', 'spring_steward',
  'Someone forced the gate. I warned you it could give way. It has, in the quietest way it could — jammed rather than broken. Brace it properly, and this can still be mended.',
  [['I will mend it.', 'edda_hub', { intent: 'agree' }]],
  [setFact('edda_knows_forced')]);
const eddaAfter = (id: string, text: string) =>
  N(id, 'spring_steward', text, [['Farewell.', 'end', { intent: 'leave' }]]);
eddaAfter('edda_after_rillford',
  'The wetland has its minimum, and the village has its water. It is an emergency allocation, and it lapses unless it is reviewed — I will hold the review, and the quarry will be there.');
eddaAfter('edda_after_quarry',
  'The wetland has its minimum; the rest goes to stone. It is an emergency allocation, and I will remind the reeve and the estate that it lapses unless it is reviewed. The spring has borne worse.');
eddaAfter('edda_after_rotation',
  'A schedule witnessed by the reeve, the foreman and the spring. This is what the Accord meant. Keep the sluice braced and the log current — I will not miss another inspection.');

/* =====================================================================
 * Darin Kest — quarry foreman (Marcher contract)
 * ===================================================================== */
N('darin_intro', 'quarry_foreman',
  'Quarry is stopped for the day: no water to cut with, less to drink. Darin Kest. If the reeve sent you to tell me to shut down, save your breath. I have a Marcher contract and a delivery that will not wait on the weather.',
  [
    ['What happened to your water?', 'darin_cause', { intent: 'ask', fx: [met('quarry_foreman')] }],
    ['I am only looking around.', 'end', { intent: 'leave', fx: [met('quarry_foreman')] }],
  ]);
N('darin_cause', 'quarry_foreman',
  'The spring is failing, that is what. Flow off the mountain is down to a trickle and Rillford has siphoned what is left. I told Sister Edda; she told me to wait for the Templars\' inspection.',
  [['Any trouble on the paths?', 'darin_cut', { intent: 'ask' }], ['I will look into it.', 'darin_hub', { intent: 'agree' }]],
  [enter('quarry_worker'), setFact('claim_foreman_spring_failing')]);
N('darin_hub', 'quarry_foreman',
  'Well?',
  [
    ['What about the seep by the cut?', 'darin_seep', { intent: 'ask', locked: true, when: [F('saw_seep'), NF('foreman_admits_seep')] }],
    ['One of your maintenance people is stranded at the Cut?', 'darin_cut', { intent: 'ask', when: [NF('ila_rescued'), NF('told_shortcut')] }],
    ['About the spare brace on your stack.', 'darin_brace', { intent: 'ask', when: [NF('brace_permitted')] }],
    ['How is the estate contract holding up?', 'darin_contract', { intent: 'ask' }],
    ['Tell your crew the seep is on you.', 'darin_humiliate', { intent: 'accuse', locked: true, when: [F('saw_seep'), NF('darin_humiliated')] }],
    ['I spoke out of turn. Let us talk about the schedule.', 'darin_mediate', { intent: 'agree', locked: true, when: [only(F('darin_humiliated')), E('cracked_sluice')] }],
    ['Would the quarry accept a witnessed rotation?', 'darin_rotation_ledger', { intent: 'persuade', locked: true, when: [E('diversion_and_seep'), E('cracked_sluice'), E('rotation_ledger'), NF('darin_humiliated'), NF('consent_darin')] }],
    ['Would the quarry accept a witnessed rotation? (I will cover the shift bonus.)', 'darin_rotation_pay', { intent: 'persuade', locked: true, when: [E('diversion_and_seep'), E('cracked_sluice'), NE('rotation_ledger'), NF('darin_humiliated'), NF('consent_darin')] }],
    ['Goodbye.', 'end', { intent: 'leave' }],
  ]);
N('darin_seep', 'quarry_foreman',
  'We cut a short extension after the permission ran out. The seep came in after. I do not know whether it undermined anything. My crew reported it. Nobody came. That is the truth, and I will say it to the steward\'s face.',
  [['Thank you.', 'darin_hub', { intent: 'agree' }]],
  [setFact('foreman_admits_seep'), trust('quarry_foreman', 1)]);
N('darin_cut', 'quarry_foreman',
  'Ila Rusk — Rimeward stoneworker on seasonal maintenance. She went along the cut path to read the seep gully and something big took the path from her. There is an old maintenance gate; its lever is by the lower stack. It opens a way round.',
  [['I will see to it.', 'darin_hub', { intent: 'agree' }]],
  [setFact('told_shortcut'), setFact('told_cut')]);
N('darin_brace', 'quarry_foreman',
  'That brace is Rillford\'s — on loan since the last repair, not mine to keep. Take it, and the wrench beside it, if you can use them. Fix the gate before anyone else decides to force it.',
  [['Thank you.', 'darin_hub', { intent: 'agree' }]],
  [setFact('brace_permitted')]);
N('darin_contract', 'quarry_foreman',
  'The Marcher estate wants its stone and its steward wants excuses. Oren Halvek is in the office by the gate; he will tell you the contract stands whatever the weather does. Ask him about the reserve — I would.',
  [['I will.', 'darin_hub', { intent: 'agree' }]],
  [setFact('told_oren')]);
N('darin_humiliate', 'quarry_foreman',
  'You said that in front of my crew. …Fine. Then you have nothing more to say to me until you take it back.',
  [['I meant it.', 'end', { intent: 'leave' }]],
  [setFact('darin_humiliated'), trust('quarry_foreman', -2), setFact('consent_darin', false)]);
N('darin_mediate', 'quarry_foreman',
  'You have seen the sluice for yourself, so you know it is not only my cut. Fine. Sit down. Tell me what you are proposing.',
  [['A schedule.', 'darin_hub', { intent: 'agree' }]],
  [setFact('darin_humiliated', false), trust('quarry_foreman', 1)]);
N('darin_rotation_ledger', 'quarry_foreman',
  'The ledger says the quarry ran nights when the mill ran days, a generation ago. If it is a rota the crew can read on a board, and the sluice is braced, I will sign it. My crew will grumble about the nights. They always did.',
  [['That is fair.', 'darin_hub', { intent: 'agree' }]],
  [{ t: 'consent', party: 'darin' }]);
N('darin_rotation_pay', 'quarry_foreman',
  'Night shifts cost my crew sleep, and I have nothing on paper to show them it has been done before. Put ten coin behind a shift bonus and I will sign, and you will not have to prove anything else.',
  [
    ['Ten coin. Done.', 'darin_hub', { intent: 'commit', locked: true, when: [{ t: 'item', id: 'coin', min: 10 }], fx: [{ t: 'item', id: 'coin', delta: -10 }, { t: 'consent', party: 'darin' }] }],
    ['I will find another way.', 'darin_hub', { intent: 'leave' }],
  ]);
N('darin_report_rillford', 'quarry_foreman',
  'The quarry is stopped. My crew is unpaid and idle, and you knew that when you did it. The delivery is missed, and the estate will have my hide for it.',
  [
    ['It was the only way to keep the households alive. It holds.', 'darin_after_rillford', { intent: 'agree', when: [applied], fx: [{ t: 'cmd', cmd: { t: 'settle', via: 'darin_report' } }] }],
    ['I will check again shortly.', 'end', { intent: 'leave', when: [notApplied] }],
  ]);
N('darin_report_quarry', 'quarry_foreman',
  'Water in the cutting trench again. The delivery can go out. I will not thank you for the village\'s trouble, but my crew eats.',
  [
    ['It holds, then.', 'darin_after_quarry', { intent: 'agree', when: [applied], fx: [{ t: 'cmd', cmd: { t: 'settle', via: 'darin_report' } }] }],
    ['I will check again shortly.', 'end', { intent: 'leave', when: [notApplied] }],
  ]);
N('darin_report_rotation', 'quarry_foreman',
  'Nights for us. Days for the mill. The crew hates it and will do it. At least the board says it is fair, and the reeve signed in front of me.',
  [
    ['Then it holds.', 'darin_after_rotation', { intent: 'agree', when: [applied], fx: [{ t: 'cmd', cmd: { t: 'settle', via: 'darin_report' } }] }],
    ['I will check again shortly.', 'end', { intent: 'leave', when: [notApplied] }],
  ]);
const darinAfter = (id: string, text: string) => N(id, 'quarry_foreman', text, [['Goodbye.', 'end', { intent: 'leave' }]]);
darinAfter('darin_after_rillford', 'The crew is at the village well asking for hours. Rillford has its mill; I have empty pockets. Remember that when the review comes.');
darinAfter('darin_after_quarry', 'We cut and we load. Rillford queues at the well. I would not want to be the man they blame — and they will blame you, not me.');
darinAfter('darin_after_rotation', 'Nights. Bad for sleep, good for wages. The estate does not love it, the crew does not love it — but the sluice is braced, and I can say I signed it.');

/* =====================================================================
 * Ila Rusk — Rimeward seasonal stoneworker (stranded at the Cut)
 * ===================================================================== */
N('ila_stranded', 'maintenance_worker',
  'Keep back from the path! A thornback took the ledge below and it does not like company. I am Ila Rusk — Rimeward, seasonal maintenance. I have been up here since dawn. There is an old maintenance gate; the lever is by the quarry\'s lower stack. Or deal with the beast yourself.',
  [
    ['Where is the maintenance gate?', 'ila_gate', { intent: 'ask', fx: [met('maintenance_worker')] }],
    ['Stay put. I will deal with it.', 'end', { intent: 'agree', fx: [met('maintenance_worker'), enter('worker'), setFact('told_cut')] }],
  ]);
N('ila_gate', 'maintenance_worker',
  'Lower stack, east side of the yard. The lever is stiff. Pull it and the maintenance gate opens; I can walk the old track round the ledge on my own. Nobody will thank me for pointing you to a gate they forgot they owned.',
  [['I will find it.', 'end', { intent: 'agree' }]],
  [setFact('told_shortcut')]);
N('ila_free_fight', 'maintenance_worker',
  'The thornback is dead? Then the ledge is clear. Give me a moment — my legs have forgotten how to be legs. I will meet you in Rillford, and I will tell you what I saw in the gully.',
  [['Take your time.', 'end', { intent: 'agree', fx: [{ t: 'cmd', cmd: { t: 'rescueWorker', method: 'fight' } }] }]]);
N('ila_free_shortcut', 'maintenance_worker',
  'You opened the gate! And walked round the ledge without a fight. Clever. Give me a moment — I will meet you in Rillford, and I will tell you what I saw in the gully.',
  [['Take your time.', 'end', { intent: 'agree', fx: [{ t: 'cmd', cmd: { t: 'rescueWorker', method: 'shortcut' } }] }]]);
N('ila_free_router', 'maintenance_worker',
  'Is the path clear?',
  [
    ['The thornback is dead.', 'ila_free_fight', { intent: 'agree', when: [{ t: 'defeated', id: 'cut_creature' }] }],
    ['I opened the maintenance gate.', 'ila_free_shortcut', { intent: 'agree', when: [{ t: 'not', c: { t: 'defeated', id: 'cut_creature' } }, { t: 'fact', key: 'shortcut_opened' }] }],
    ['Not yet.', 'end', { intent: 'leave' }],
  ]);
N('ila_testimony', 'maintenance_worker',
  'You cleared the ledge — thank you. Here is what I saw before the beast came: fresh fractures on the support beside the gate, sediment in the intake, and the seep in the quarry gully feeding the wrong channel. Close the gate slowly, from the downstream side, with the brace set before you turn the wheel. Do it that way and it will not surge.',
  [
    ['Thank you. That helps.', 'ila_hub', { intent: 'agree' }],
  ],
  [
    ev('worker_testimony', 'testimony', 'ila.testimony'),
    ev('reduced_spring_flow', 'testimony', 'ila.testimony'),
    setFact('procedure_known'),
    { t: 'grant', id: 'ila_thanks', items: { poultice: 2 } },
  ]);
N('ila_testimony_shortcut', 'maintenance_worker',
  'You opened the gate! I walked the old track round the ledge and never met the beast. Here is what I saw before it came: fresh fractures on the support beside the gate, silt across the intake, and the seep in the quarry gully feeding the wrong channel. Close the gate slowly, from the downstream side, with the brace set before you turn the wheel. Do it that way and it will not surge.',
  [
    ['Thank you. That helps.', 'ila_hub', { intent: 'agree' }],
  ],
  [
    ev('worker_testimony', 'testimony', 'ila.testimony'),
    ev('reduced_spring_flow', 'testimony', 'ila.testimony'),
    setFact('procedure_known'),
    { t: 'grant', id: 'ila_thanks', items: { poultice: 2 } },
  ]);
N('ila_hub', 'maintenance_worker',
  'I am not going anywhere until my legs agree. What do you want to know?',
  [
    ['Tell me the gate procedure again.', 'ila_procedure', { intent: 'ask' }],
    ['Who did this?', 'ila_who', { intent: 'ask' }],
    ['Rest.', 'end', { intent: 'leave' }],
  ]);
N('ila_procedure', 'maintenance_worker',
  'From the downstream side. Set the brace against the cracked post first, turn the wheel a quarter, wait for the water to settle, then another quarter. If the flow is calm — the rite, if Sister Edda taught you — it will not push back at all.',
  [['Understood.', 'ila_hub', { intent: 'agree' }]]);
N('ila_who', 'maintenance_worker',
  'Nobody. That is what frightens me. A late flood on a sluice nobody inspected, a town side-gate nobody witnessed, a quarry cut nobody permitted. Each small. Together, a dry village. Do not look for a villain; look for who will keep the pieces from failing again.',
  [['Thank you.', 'ila_hub', { intent: 'agree' }]]);
const ilaAfter = (id: string, text: string) => N(id, 'maintenance_worker', text, [['Take care.', 'end', { intent: 'leave' }]]);
ilaAfter('ila_after', 'I am walking home to the Rimeward Heights when the road allows. Tell the reeve the brace wants checking after the first rain. Whatever you chose, keep the sluice honest.');

/* =====================================================================
 * Secondary voices
 * ===================================================================== */
N('oren_intro', 'estate_steward',
  'Steward Halvek, Marcher estate. If you are here about the delivery, the contract stands regardless of who has water. As for the repair reserve — it is sufficient.',
  [
    ['Sufficient?', 'oren_reserve', { intent: 'ask', fx: [met('estate_steward')] }],
    ['I am only passing.', 'end', { intent: 'leave', fx: [met('estate_steward')] }],
  ]);
N('oren_reserve', 'estate_steward',
  '…It is empty. The estate has not funded repairs since the winter levy. Please do not repeat it. If you must, say the estate is reviewing its commitments.',
  [['I will consider what to say.', 'end', { intent: 'leave' }]],
  [setFact('reserve_empty'), setFact('claim_reserve_sufficient')]);
N('oren_hub', 'estate_steward',
  'The contract stands. The delivery date has not moved. Is there something else?',
  [['About the reserve…', 'oren_reserve', { intent: 'ask', when: [NF('reserve_empty')] }], ['No.', 'end', { intent: 'leave' }]]);
N('oren_after_quarry', 'estate_steward',
  'The delivery will go out. The estate notes your part in it. That is not a promise of anything, but it is noted.',
  [['Good day.', 'end', { intent: 'leave' }]]);
N('oren_after_other', 'estate_steward',
  'The estate is reviewing its commitments. A missed or shared delivery reflects on my ledger, not yours. Good day.',
  [['Good day.', 'end', { intent: 'leave' }]]);

N('sel_intro', 'ash_recorder',
  'Sel Anrit, recorder. Third failure this season: a bridge, a granary road, now the water. You will call it coincidence. I do not.',
  [
    ['What do you record?', 'sel_records', { intent: 'ask', fx: [met('ash_recorder')] }],
    ['Is the valley finished?', 'sel_doom', { intent: 'ask', fx: [met('ash_recorder')] }],
    ['Another time.', 'end', { intent: 'leave', fx: [met('ash_recorder')] }],
  ]);
N('sel_hub', 'ash_recorder', 'I record what others forget. Ask.',
  [
    ['What do you record?', 'sel_records', { intent: 'ask' }],
    ['Is the valley finished?', 'sel_doom', { intent: 'ask' }],
    ['Goodbye.', 'end', { intent: 'leave' }],
  ]);
N('sel_records', 'ash_recorder',
  'Everything, including an old rotation ledger in the shrine archive. The copies disagree. Ask the steward; the Templars keep it and rarely read it. If you can read it, read it.',
  [['Thank you.', 'sel_hub', { intent: 'agree' }]],
  [setFact('told_ledger')]);
N('sel_doom', 'ash_recorder',
  'Repair only delays it. The pattern is plain: each failure is smaller than the last cause and larger than the last cure. Do not take comfort in patching.',
  [['Perhaps you are wrong.', 'sel_hub', { intent: 'agree' }]]);
N('sel_after', 'ash_recorder',
  'I have written down what you did. I still do not know whether it is a beginning or a delay. But it is written, and that matters.',
  [['Goodbye.', 'end', { intent: 'leave' }]]);

N('harrow_intro', 'shrine_warden',
  'Warden Tolan Harrow. The archive is locked, and Sister Edda holds the say. If you want steel discipline rather than speeches, I teach a little of it too.',
  [
    ['About the archive.', 'harrow_hub', { intent: 'ask', fx: [met('shrine_warden')] }],
    ['I would like to learn from you.', 'harrow_train', { intent: 'ask', fx: [met('shrine_warden')] }],
    ['Another time.', 'end', { intent: 'leave', fx: [met('shrine_warden')] }],
  ]);
N('harrow_hub', 'shrine_warden',
  'What do you need?',
  [
    ['Sister Edda has said I may read the archive.', 'harrow_open', { intent: 'persuade', when: [F('edda_permission'), NF('archive_access_lost')] }],
    ['Could I borrow the key on my own word?', 'harrow_key', { intent: 'persuade', locked: true, when: [NF('edda_permission'), NF('archive_access_lost'), NF('harrow_lent_key'), { t: 'any', c: [E('reduced_spring_flow'), E('cracked_sluice')] }] }],
    ['I would like to learn from you.', 'harrow_train', { intent: 'ask', when: [{ t: 'not', c: { t: 'skill', id: 'steady_guard' } }] }],
    ['Never mind.', 'end', { intent: 'leave' }],
  ]);
N('harrow_open', 'shrine_warden',
  'The Sister\'s word is enough. The door is open. Do not take anything out, and do not leave the lamp burning.',
  [['Thank you.', 'end', { intent: 'agree', fx: [{ t: 'cmd', cmd: { t: 'archiveAccess', method: 'permission' } }] }]]);
N('harrow_key', 'shrine_warden',
  'I should not. But that gate worries me too — it worries all of us. Take the key. Bring it back, and do not let the Sister find that you had it before she agreed.',
  [['I will return it.', 'end', { intent: 'agree', fx: [
    { t: 'grant', id: 'harrow_key', items: { archive_key: 1 } },
    setFact('harrow_lent_key'),
    { t: 'cmd', cmd: { t: 'archiveAccess', method: 'borrowed_key' } },
  ] }]]);
N('harrow_train', 'shrine_warden',
  'Steady Guard: raise your guard, blade or bare arms, and it costs you 40% less stamina to hold it, so you can wait out a heavy blow instead of running from it. Ten coin — or nothing, if you have already proved you can stand in front of something dangerous.',
  [
    ['Pay ten coin and learn it.', 'harrow_trained', { intent: 'train', locked: true, when: [{ t: 'not', c: { t: 'anyDefeated' } }, { t: 'item', id: 'coin', min: 10 }], fx: [{ t: 'cmd', cmd: { t: 'train', skill: 'steady_guard' } }] }],
    ['Show him what you have done. Learn it for free.', 'harrow_trained', { intent: 'train', locked: true, when: [{ t: 'anyDefeated' }], fx: [{ t: 'cmd', cmd: { t: 'train', skill: 'steady_guard' } }] }],
    ['Not now.', 'end', { intent: 'leave' }],
  ]);
N('harrow_trained', 'shrine_warden',
  'Good. Feet apart, guard high, and do not flinch. That is all of it. Come back if you need to remember.',
  [['Thank you.', 'end', { intent: 'leave' }]]);
N('harrow_hub2', 'shrine_warden', 'Anything else?',
  [
    ['About the archive.', 'harrow_hub', { intent: 'ask' }],
    ['Steady Guard, again.', 'harrow_train', { intent: 'ask', when: [{ t: 'not', c: { t: 'skill', id: 'steady_guard' } }] }],
    ['No.', 'end', { intent: 'leave' }],
  ]);
N('harrow_caretaker', 'shrine_warden',
  'The Sister is gone. I keep the shrine and the noticeboard now. If the valley needs a waterkeeper\'s witness, I will stand — though it will not carry the weight hers did.',
  [['I understand.', 'harrow_hub', { intent: 'agree' }], ['Another time.', 'end', { intent: 'leave' }]],
  [setFact('harrow_caretaker_told')]);

N('bess_default', 'mill_hand',
  'The wheel has been dry since the flood. Without water I have nothing to grind — I stand here so the reeve sees somebody is minding it.',
  [['Good luck.', 'end', { intent: 'leave' }]]);
N('bess_rillford', 'mill_hand', 'Hear that? The wheel turns! Grain by evening. I will not say what it cost the quarry, but I will say I am glad.', [['Good.', 'end', { intent: 'leave' }]]);
N('bess_quarry', 'mill_hand', 'The wheel is dry and the quarry dust is flying. I am not the only one who wanted it the other way.', [['I am sorry.', 'end', { intent: 'leave' }]]);
N('bess_rotation', 'mill_hand', 'Days for the mill. I mind the board. It is not much, but it is not nothing — and it is written where everyone can read it.', [['Good.', 'end', { intent: 'leave' }]]);

N('pell_default', 'quarry_hand',
  'Foreman says we wait. Nothing to cut with, nothing to drink. If you are looking for Ila — the Cut path is closed. Something big took the ledge. Foreman knows about the gate.',
  [['I will look into it.', 'end', { intent: 'leave' }]], [enter('quarry_worker'), setFact('told_cut')]);
N('pell_rillford', 'quarry_hand', 'No water, no work, no pay. Rillford got its mill; we got a wet bench and a long walk.', [['I am sorry.', 'end', { intent: 'leave' }]]);
N('pell_quarry', 'quarry_hand', 'We cut. We load. There is a guard at the sluice door and we do not ask why. The village looks at us like we drank the well.', [['Take care.', 'end', { intent: 'leave' }]]);
N('pell_rotation', 'quarry_hand', 'Night crew. My eyes are a bag of sand. But they pay us, and the board says it is fair, so I say nothing.', [['Rest when you can.', 'end', { intent: 'leave' }]]);
N('pell_caretaker', 'quarry_hand',
  'Foreman Kest is gone. Somebody has to sign for the crew. If the reeve and the steward want a witness for the quarry, it is me — I will carry it as well as I can.',
  [['Thank you.', 'end', { intent: 'leave' }]],
  [setFact('pell_caretaker_told')]);

N('hesper_default', 'village_baker',
  'No water, no dough. If you have not looked at the dry channel behind the mill, do. The reeve is trying, but you cannot ask a bucket to do a river\'s work.',
  [['I will look.', 'end', { intent: 'leave' }]], [setFact('told_dry_channel')]);
N('hesper_rillford', 'village_baker', 'Loaves by evening, and I will bake extra for anyone who worked to get the water back. The quarry crew can come to my door and ask; I will not turn them away.', [['Thank you.', 'end', { intent: 'leave' }]]);
N('hesper_quarry', 'village_baker', 'Half a bucket a day and a long queue at the well. I hope the quarry stone was worth it.', [['I am sorry.', 'end', { intent: 'leave' }]]);
N('hesper_rotation', 'village_baker', 'Bread in the daytime, when the mill turns. Nights the flour sits. It is a strange rhythm, but the board says it is ours.', [['Good.', 'end', { intent: 'leave' }]]);
N('hesper_caretaker', 'village_baker',
  'Mara is gone. Someone has to mind the noticeboard and speak for the village. I will — I am not the reeve, but I know every household.',
  [['I understand.', 'end', { intent: 'leave' }]],
  [setFact('hesper_caretaker_told')]);

/* =====================================================================
 * Entry rules: first matching rule chooses the opening node
 * ===================================================================== */
const notMet = (npc: NpcId): Cond => ({ t: 'not', c: { t: 'met', npc } });

// Kept for the renderer-free dialogue contract; the live game speaks this in the world, without a dialogue panel.
N('rowan_default', 'trail_hunter',
  "Rillford's pots are running thin. Take a bow from the bench if you need one. Bring back meat and I'll pay a fair price. Keep your hunt clear of the road.",
  [['Thank you.', 'end', { intent: 'leave' }]]);

export const ENTRY_RULES: Record<NpcId, EntryRule[]> = {
  trail_hunter: [{ node: 'rowan_default' }],
  caravan_master: [
    { when: [settled], node: 'joss_after' },
    { node: 'joss_intro', when: [notMet('caravan_master')] },
    { node: 'joss_hub' },
  ],
  rillford_reeve: [
    { when: [settled, alloc('rillford')], node: 'mara_after_rillford' },
    { when: [settled, alloc('quarry')], node: 'mara_after_quarry' },
    { when: [settled, alloc('rotation')], node: 'mara_after_rotation' },
    { when: [committed, alloc('rillford')], node: 'mara_report_rillford' },
    { when: [committed, alloc('quarry')], node: 'mara_report_quarry' },
    { when: [committed, alloc('rotation')], node: 'mara_report_rotation' },
    { when: [{ t: 'gate', is: 'jammed' }, F('gate_forced'), NF('mara_told_jam')], node: 'mara_jammed' },
    { when: [notMet('rillford_reeve')], node: 'mara_intro' },
    { node: 'mara_hub' },
  ],
  spring_steward: [
    { when: [settled, alloc('rillford')], node: 'edda_after_rillford' },
    { when: [settled, alloc('quarry')], node: 'edda_after_quarry' },
    { when: [settled, alloc('rotation')], node: 'edda_after_rotation' },
    { when: [F('archive_reported'), NF('edda_confronted_trespass')], node: 'edda_caught' },
    { when: [{ t: 'gate', is: 'jammed' }, NF('edda_knows_forced')], node: 'edda_jammed' },
    { when: [notMet('spring_steward')], node: 'edda_intro' },
    { node: 'edda_hub' },
  ],
  quarry_foreman: [
    { when: [settled, alloc('rillford')], node: 'darin_after_rillford' },
    { when: [settled, alloc('quarry')], node: 'darin_after_quarry' },
    { when: [settled, alloc('rotation')], node: 'darin_after_rotation' },
    { when: [committed, alloc('rillford')], node: 'darin_report_rillford' },
    { when: [committed, alloc('quarry')], node: 'darin_report_quarry' },
    { when: [committed, alloc('rotation')], node: 'darin_report_rotation' },
    { when: [notMet('quarry_foreman')], node: 'darin_intro' },
    { node: 'darin_hub' },
  ],
  maintenance_worker: [
    { when: [F('ila_rescued'), settled], node: 'ila_after' },
    { when: [F('ila_rescued'), F('ila_method', 'shortcut'), NE('worker_testimony')], node: 'ila_testimony_shortcut' },
    { when: [F('ila_rescued'), NE('worker_testimony')], node: 'ila_testimony' },
    { when: [F('ila_rescued')], node: 'ila_hub' },
    { when: [{ t: 'any', c: [{ t: 'defeated', id: 'cut_creature' }, F('shortcut_opened')] }], node: 'ila_free_router' },
    { node: 'ila_stranded' },
  ],
  estate_steward: [
    { when: [settled, alloc('quarry')], node: 'oren_after_quarry' },
    { when: [settled], node: 'oren_after_other' },
    { when: [notMet('estate_steward')], node: 'oren_intro' },
    { node: 'oren_hub' },
  ],
  ash_recorder: [
    { when: [settled], node: 'sel_after' },
    { when: [notMet('ash_recorder')], node: 'sel_intro' },
    { node: 'sel_hub' },
  ],
  shrine_warden: [
    { when: [{ t: 'avail', npc: 'spring_steward', is: false }, NF('harrow_caretaker_told')], node: 'harrow_caretaker' },
    { when: [notMet('shrine_warden')], node: 'harrow_intro' },
    { node: 'harrow_hub2' },
  ],
  mill_hand: [
    { when: [settled, alloc('rillford')], node: 'bess_rillford' },
    { when: [settled, alloc('quarry')], node: 'bess_quarry' },
    { when: [settled, alloc('rotation')], node: 'bess_rotation' },
    { node: 'bess_default' },
  ],
  quarry_hand: [
    { when: [{ t: 'avail', npc: 'quarry_foreman', is: false }, NF('pell_caretaker_told')], node: 'pell_caretaker' },
    { when: [settled, alloc('rillford')], node: 'pell_rillford' },
    { when: [settled, alloc('quarry')], node: 'pell_quarry' },
    { when: [settled, alloc('rotation')], node: 'pell_rotation' },
    { node: 'pell_default' },
  ],
  village_baker: [
    { when: [{ t: 'avail', npc: 'rillford_reeve', is: false }, NF('hesper_caretaker_told')], node: 'hesper_caretaker' },
    { when: [settled, alloc('rillford')], node: 'hesper_rillford' },
    { when: [settled, alloc('quarry')], node: 'hesper_quarry' },
    { when: [settled, alloc('rotation')], node: 'hesper_rotation' },
    { node: 'hesper_default' },
  ],
};
