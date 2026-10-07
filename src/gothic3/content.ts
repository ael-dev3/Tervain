/** Original Gothic 3 data summaries and scope notes for Ardea.
 * Browser support is partial; each record lists evidence and remaining native
 * behavior. Exact records, patch selection, hashes and native references are
 * retained in assets/gothic3/content-provenance.json.
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
    summary: 'His original Ardea dialogue describes three coastal bandits and gold entrusted to him by the rebels. The bounded browser dialogue can enable trade, set the bandit-report events and start Jack_KillBandits. Source-directed lethal bandit hits schedule the recovered death state, whose connected Kill prefix updates quest counters and awards defeat XP before stopping at the enclave callback. Quest success unlocks the original return reward. NPC AI and the full death lifecycle remain incomplete.',
    questIds: ['Jack_KillBandits', 'Ardea_Pocket'],
    source: 'Infos.pak/G3_World_01/BPANKRATZ31459–31466 (.info)',
  },
];

export const ARDEA_QUESTS: ArdeaQuest[] = [
  {
    id: 'Ardea_Revolution', title: 'Liberate Ardea from the orcs!',
    summary: 'Original FreeEnclave quest targeting Ardea. Its source records ExperiencePoints=100 and +2 reputation with the Rebels. The native XP callback determines the actual gain. The liberation battle and enclave-state trigger have not been rebuilt.',
    source: 'Quests.pak/G3_World_01/Ardea_Revolution_quest_G3_World_01.quest',
    implemented: false,
    unsupportedCommands: ['native:gCQuest_PS::OnEnclaveStateChanged', 'native:gCQuest_PS::SetStatus'],
  },
  {
    id: 'Hamlar_gotoReddock', title: 'Talk to the leader of the rebels in Reddock!',
    summary: 'Original Report quest targeting Javier, with ExperiencePoints=200 and +1 Rebel reputation in its quest record. Hamlar’s separate follow-up dialogue passes 100 to GiveXP and enables trade. Reporting, dialogue conditions and rewards are not executed.',
    source: 'Quests.pak/G3_World_01/Hamlar_gotoReddock_quest_G3_World_01.quest; Infos.pak/G3_World_01/FILLER936, FILLER939 (.info)',
    implemented: false,
    unsupportedCommands: ['Say', 'SetTradeEnabled', 'GiveXP', 'native:gCQuest_PS::CheckDeliveryEntitiesStatus'],
  },
  {
    id: 'Gorn_ShowReddock', title: "Gorn shows you the rebels' hideout.",
    summary: 'Original FollowNPC quest names Gorn and destination FP_Reddock. Its record passes ExperiencePoints=50 to the XP callback and adds +1 Rebel reputation; the related arrival dialogue changes Gorn’s routine. Escorting, arrival detection and routine changes are not implemented.',
    source: 'Quests.pak/G3_World_01/Gorn_ShowReddock_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31446, BPANKRATZ31447 (.info)',
    implemented: false,
    unsupportedCommands: ['Say', 'End', 'SetRoutine', 'native:gCQuest_PS::CheckDeliveryEntitiesStatus'],
  },
  {
    id: 'Jack_KillBandits', title: 'Jack and the bilge rats.',
    summary: 'Original Kill quest names Ardea_OutNovice_01, _02 and _03, one each, and ExperiencePoints=100. The browser supports Jack’s source report and quest start, then scheduled bandit death states update the exact targets. Completion awards 500 quest XP; each bandit also awards 50 defeat XP. The original return dialogue transfers 50 gold and awards another 250 XP. Each connected death prefix currently stops at NotifyEnclave; AI, incoming attacks, ragdoll and corpse loot remain incomplete.',
    source: 'Quests.pak/G3_World_01/Jack_KillBandits_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31461–31463 (.info)',
    implemented: false,
    unsupportedCommands: ['native:NotifyEnclave death callback', 'native:ragdoll and corpse loot', 'native:NPC AI and incoming attacks'],
  },
  {
    id: 'Ardea_Pocket', title: "Jack's rebel gold.",
    summary: 'Original Report quest targets Jack and records ExperiencePoints=150 plus +1 THF. The browser connects Jack’s condition-7 event response and condition-8 type-1 delivery counter/reward path, plus the source-backed 400 It_Gold transfer. A browser PickPocket action reads Hero Theft and Jack LevelMax, applies the source level/perk/roll gate, and adds successful distribution-7 loot to the saved Hero inventory while retaining Jack’s Dialog.PickedPocket flag. The fresh-world quest state remains Open: failure/caught responses, enclave crime and the property-listener/quest-start linkage are not connected, so the full in-game reporting route is not reachable.',
    source: 'Quests.pak/G3_World_01/Ardea_Pocket_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31465, BPANKRATZ31466 (.info)',
    implemented: false,
    unsupportedCommands: ['native:PickPocket failure/caught response', 'native:enclave crime mutation', 'native:Dialog.PickedPocket property-listener and Ardea_Pocket quest-start linkage', 'native:InfoManager Pickpocket command lifecycle'],
  },
  {
    id: 'Xardas_FindXardas', title: 'Find Xardas!',
    summary: 'Original main-story EnterArea quest names PC_Hero and Xardas_Tower, with ExperiencePoints=250. Ardea conversations connect to this quest. The browser resolves Hero movement through source-registered Navigation zones and reconstructs the native type-8 area-entry callback. A local preview teleport rendered the source tower and grounded the Hero on its mesh, but the tested landing is above the Xardas_Tower quest zone; ordinary overland arrival and in-browser quest completion remain unverified. Original dialogue predicates are still incomplete.',
    source: 'Quests.pak/G3_World_01/Xardas_FindXardas_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31455–31456, FILLER65, FILLER67 (.info)',
    implemented: false,
    unsupportedCommands: ['Say', 'SetGameEvent', 'ClearGameEvent'],
  },
];

export const PORT_SCOPE: string[] = [
  'A TypeScript browser rebuild milestone using local Gothic 3 study data, with source records attached to the inspected people and quests.',
  'A third-person Hero follows the browser controller and selects recovered idle, walk and run clips. The 19 native Hero property sets, original movement blending/collision, combat timing, attachments and NPC animation selection are not yet connected to ordinary play.',
  'The journal contains 641 original quest definitions and 4,381 dialogue records in five source languages. Catalog presence does not establish gameplay execution.',
  '782 original landscape cells stream across Myrtana, Nordmar and Varant, using recovered texture/blend/UV graphs. Native lightmaps, lower mips, global lighting and collision remain incomplete.',
  'The retained Hero PlayerMemory seeds the browser game-event list, and the journal uses source quest state. Selected Ardea dialogue records and callbacks run through bounded runtime services; most original conditions, commands, startup callbacks, combat and progression are still unsupported.',
  'The six character summaries describe original Ardea records. The browser executes only a bounded set of dialogue predicates, commands and callbacks; unsupported branches remain locked.',
  'The six listed quests are incomplete. The audited Xardas_FindXardas startup transition, selected quest callbacks/rewards and the bounded Jack PickPocket inventory path are connected; Ardea_Pocket still starts Open because the native property-listener/quest-start chain is unresolved. Inspection alone grants no rewards or quest completion.',
  'A bounded browser fist calculation updates saved HP for 15 exact starting Ardea Raiders and Jack’s three coastal bandits. Only the bandits have a resolved lethal disposition: a later scheduled death-state frame runs the connected Kill prefix, quest rewards and 50 defeat XP per bandit, then stops explicitly at NotifyEnclave. Saves retain that applied prefix without replaying rewards. Raider zero HP grants no kill credit. Native contact eligibility, NPC AI and incoming attacks, full death/knockout handling, ragdoll, loot, faction simulation, trading, original save compatibility and campaign progression remain incomplete.',
  'Recovered Ghidra C-like code is a behavior reference. It is not buildable original source or an automatically converted TypeScript engine.',
];
