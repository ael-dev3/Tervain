/** Original Gothic 3 data summaries for the Ardea inspection milestone.
 * Quest predicates, combat, dialogue execution and rewards are not implemented.
 * Exact records, patch selection, hashes and native references are retained in
 * assets/gothic3/content-provenance.json.
 */
export interface ArdeaPerson {
  id: string;
  name: string;
  role: string;
  summary: string;
  questIds: string[];
  source: string;
}

export interface ArdeaQuest {
  id: string;
  title: string;
  summary: string;
  source: string;
  implemented: boolean;
  /** Original dialogue commands and named native triggers not executed here. */
  unsupportedCommands: string[];
}

export const ARDEA_PEOPLE: ArdeaPerson[] = [
  {
    id: 'Hamlar', name: 'Hamlar', role: 'Ardea village elder',
    summary: 'His original dialogue warns about the consequences of the uprising, discusses Xardas, and asks for help from the rebels at Reddock. This view inspects the source character; it does not run his dialogue or grant rewards.',
    questIds: ['Hamlar_gotoReddock', 'Xardas_FindXardas'],
    source: 'Infos.pak/G3_World_01/FILLER65, FILLER67, FILLER864, FILLER936, FILLER939 (.info)',
  },
  {
    id: 'Gorn', name: 'Gorn', role: 'Companion; guide to Reddock',
    summary: 'His Ardea records discuss finding the surviving rebels and guiding the hero to their hideout. The original follow quest names FP_Reddock as its destination; walking that route with Gorn is not implemented.',
    questIds: ['Gorn_ShowReddock'],
    source: 'Infos.pak/G3_World_01/BPANKRATZ31442, BPANKRATZ31444–31447, FILLER929 (.info)',
  },
  {
    id: 'Diego', name: 'Diego', role: 'Companion at Ardea',
    summary: 'His original Ardea dialogue explains the orc victory, recommends finding Xardas, discusses replacing the stolen equipment, and describes his own plans to travel south. His later regional quests are outside this scene.',
    questIds: ['Xardas_FindXardas'],
    source: 'Infos.pak/G3_World_01/BPANKRATZ31453–31458, FILLER925–927 (.info)',
  },
  {
    id: 'Milten', name: 'Milten', role: 'Fire Mage companion',
    summary: 'His Ardea dialogue describes the loss of rune magic and his search for ancient magic. These Ardea records do not define a separate Milten quest; the monastery quests belong to a later region.',
    questIds: [],
    source: 'Infos.pak/G3_World_01/BPANKRATZ31448–31450, SKALVERAM31004, SKALVERAM3927 (.info)',
  },
  {
    id: 'Lester', name: 'Lester', role: 'Companion by the coast',
    summary: 'His original opening dialogue reports that pirates stole the ship, discusses the missing equipment, and describes travelling south. His later Al Shedim quests are outside the Ardea inspection milestone.',
    questIds: [],
    source: 'Infos.p00/G3_World_01/BPANKRATZ31451–31452, FILLER928 (.info; effective patch layer)',
  },
  {
    id: 'Jack', name: 'Jack', role: 'Old sailor at the tower',
    summary: 'His original Ardea dialogue describes three coastal bandits and gold entrusted to him by the rebels. The original rewards are documented below; inspection does not kill the bandits, transfer gold, enable trade, or finish a quest.',
    questIds: ['Jack_KillBandits', 'Ardea_Pocket'],
    source: 'Infos.pak/G3_World_01/BPANKRATZ31459–31466 (.info)',
  },
];

export const ARDEA_QUESTS: ArdeaQuest[] = [
  {
    id: 'Ardea_Revolution', title: 'Liberate Ardea from the orcs!',
    summary: 'Original FreeEnclave quest targeting Ardea. Its source records 100 XP and +2 reputation with the Rebels. The liberation battle and enclave-state trigger have not been rebuilt.',
    source: 'Quests.pak/G3_World_01/Ardea_Revolution_quest_G3_World_01.quest',
    implemented: false,
    unsupportedCommands: ['native:gCQuest_PS::OnEnclaveStateChanged', 'native:gCQuest_PS::SetStatus'],
  },
  {
    id: 'Hamlar_gotoReddock', title: 'Talk to the leader of the rebels in Reddock!',
    summary: 'Original Report quest targeting Javier, with 200 XP and +1 Rebel reputation in its quest record. Hamlar’s separate follow-up dialogue records 100 additional XP and trade enabling. Reporting, dialogue conditions and rewards are not executed.',
    source: 'Quests.pak/G3_World_01/Hamlar_gotoReddock_quest_G3_World_01.quest; Infos.pak/G3_World_01/FILLER936, FILLER939 (.info)',
    implemented: false,
    unsupportedCommands: ['Say', 'SetTradeEnabled', 'GiveXP', 'native:gCQuest_PS::CheckDeliveryEntitiesStatus'],
  },
  {
    id: 'Gorn_ShowReddock', title: "Gorn shows you the rebels' hideout.",
    summary: 'Original FollowNPC quest names Gorn and destination FP_Reddock. Its record awards 50 XP and +1 Rebel reputation; the related arrival dialogue changes Gorn’s routine. Escorting, arrival detection and routine changes are not implemented.',
    source: 'Quests.pak/G3_World_01/Gorn_ShowReddock_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31446, BPANKRATZ31447 (.info)',
    implemented: false,
    unsupportedCommands: ['Say', 'End', 'SetRoutine', 'native:gCQuest_PS::CheckDeliveryEntitiesStatus'],
  },
  {
    id: 'Jack_KillBandits', title: 'Jack and the bilge rats.',
    summary: 'Original Kill quest names Ardea_OutNovice_01, _02 and _03, one each, and 100 quest XP. Jack’s separate reward dialogue records 50 gold and 50 additional XP. Native combat, kill counters and reward dialogue are not executed.',
    source: 'Quests.pak/G3_World_01/Jack_KillBandits_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31461–31463 (.info)',
    implemented: false,
    unsupportedCommands: ['Say', 'SetGameEvent', 'Give', 'GiveXP', 'native:gCQuest_PS::OnNPCKilled'],
  },
  {
    id: 'Ardea_Pocket', title: "Jack's rebel gold.",
    summary: 'Original Report quest targets Jack and records 150 XP plus +1 THF. Its related dialogue sets Jack_Pocket and transfers 400 It_Gold to the player. The original reporting conditions, transfer and attribute reward are not implemented.',
    source: 'Quests.pak/G3_World_01/Ardea_Pocket_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31465, BPANKRATZ31466 (.info)',
    implemented: false,
    unsupportedCommands: ['Say', 'SetGameEvent', 'Give', 'native:gCQuest_PS::CheckDeliveryEntitiesStatus'],
  },
  {
    id: 'Xardas_FindXardas', title: 'Find Xardas!',
    summary: 'Original main-story EnterArea quest names PC_Hero and Xardas_Tower, with 250 XP. Ardea conversations connect to this quest, but the tower region, original dialogue predicates and arrival trigger are outside this milestone.',
    source: 'Quests.pak/G3_World_01/Xardas_FindXardas_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31455–31456, FILLER65, FILLER67 (.info)',
    implemented: false,
    unsupportedCommands: ['Say', 'SetGameEvent', 'ClearGameEvent', 'native:gCQuest_PS::OnEnter'],
  },
];

export const PORT_SCOPE: string[] = [
  'A TypeScript browser rebuild milestone using local Gothic 3 study data, with source records attached to the inspected people and quests.',
  'The six character summaries describe the original Ardea dialogue. This milestone does not execute the original dialogue tree, its predicates or its side effects.',
  'All six listed original quests are unimplemented. Inspection grants no XP, reputation, gold, skills or quest completion.',
  'Native combat, NPC routines, faction simulation, trading, original save compatibility and the full streamed world still require implementation.',
  'Recovered Ghidra C-like code is a behavior reference. It is not buildable original source or an automatically converted TypeScript engine.',
];
