import type { Cond, NpcId } from '../game/types';

export type Activity = 'work' | 'stand' | 'sit' | 'talk' | 'rest';
export type Accessory = 'shawl' | 'robe' | 'helmet' | 'satchel' | 'apron' | 'hat' | 'cloak' | 'ledger' | 'coat' | 'hood' | 'pack';

export interface ScheduleEntry {
  /** Hours are 0..24; a range may wrap midnight (from > to). */
  from: number;
  to: number;
  anchor: string;
  activity: Activity;
}

export interface ScheduleOverride {
  when: Cond[];
  /** Optional hour window; omitted means all day. */
  from?: number;
  to?: number;
  anchor: string;
  activity: Activity;
}

export interface NpcDef {
  id: NpcId;
  /** Working display names; identifiers survive later name revisions. */
  name: string;
  titleKey: string;
  faction: 'league' | 'templar' | 'marcher' | 'rimeward' | 'ash' | 'traveler';
  home: string;
  look: {
    skin: number;
    primary: number;
    secondary: number;
    hair: number;
    height: number;
    girth: number;
    accessory: Accessory;
    accent?: number;
  };
  /** Anchor names are validated against the world layout by the content tests. */
  schedule: ScheduleEntry[];
  overrides?: ScheduleOverride[];
  /** Where they sleep, for the journal ("the journal tells the player where a steward sleeps"). */
  sleepsKey: string;
  /** Principals and secondary voices get a stable, more careful interaction radius. */
  interactRadius?: number;
}

const day = (anchor: string, activity: Activity = 'work', from = 6, to = 19): ScheduleEntry => ({ from, to, anchor, activity });
const night = (anchor: string, from = 19, to = 6): ScheduleEntry => ({ from, to, anchor, activity: 'rest' });

const F = (key: string): Cond => ({ t: 'fact', key });
const committed: Cond = { t: 'phase', is: 'committed' };

export const NPCS: Record<NpcId, NpcDef> = {
  caravan_master: {
    id: 'caravan_master',
    name: 'Joss Merrin',
    titleKey: 'npc.title.caravan_master',
    faction: 'traveler',
    home: 'overlook_wagon',
    look: { skin: 0xc79a72, primary: 0x7a5a3a, secondary: 0x3a3a2a, hair: 0x4a3a2a, height: 1.02, girth: 1.1, accessory: 'hat' },
    schedule: [{ from: 0, to: 24, anchor: 'overlook_wagon', activity: 'stand' }],
    sleepsKey: 'npc.sleeps.wagon',
  },
  rillford_reeve: {
    id: 'rillford_reeve',
    name: 'Mara Venn',
    titleKey: 'npc.title.rillford_reeve',
    faction: 'league',
    home: 'reeve_door',
    look: { skin: 0xd9a678, primary: 0x4d7a54, secondary: 0xc2a25a, hair: 0x5a3a2a, height: 1.0, girth: 1.0, accessory: 'shawl' },
    schedule: [
      { from: 6, to: 8, anchor: 'reeve_door', activity: 'stand' },
      { from: 8, to: 12, anchor: 'noticeboard', activity: 'talk' },
      { from: 12, to: 17, anchor: 'dry_channel', activity: 'stand' },
      { from: 17, to: 20, anchor: 'village_square', activity: 'talk' },
      night('reeve_door', 20, 6),
    ],
    overrides: [{ when: [committed], from: 6, to: 20, anchor: 'village_square', activity: 'talk' }],
    sleepsKey: 'npc.sleeps.reeve',
  },
  spring_steward: {
    id: 'spring_steward',
    name: 'Sister Edda Sorn',
    titleKey: 'npc.title.spring_steward',
    faction: 'templar',
    home: 'steward_cell',
    look: { skin: 0xc9967a, primary: 0x5a6f8a, secondary: 0xe3dcc4, hair: 0x9a9a9a, height: 0.98, girth: 0.95, accessory: 'robe', accent: 0xd9c98a },
    schedule: [
      { from: 5, to: 8, anchor: 'shrine_altar', activity: 'stand' },
      { from: 8, to: 16, anchor: 'wetland_edge', activity: 'work' },
      { from: 16, to: 21, anchor: 'shrine_steps', activity: 'stand' },
      night('steward_cell', 21, 5),
    ],
    sleepsKey: 'npc.sleeps.steward',
  },
  quarry_foreman: {
    id: 'quarry_foreman',
    name: 'Darin Kest',
    titleKey: 'npc.title.quarry_foreman',
    faction: 'marcher',
    home: 'crew_bunks',
    look: { skin: 0xb98866, primary: 0x7a4a36, secondary: 0x3a3a3f, hair: 0x2a2a2a, height: 1.08, girth: 1.25, accessory: 'helmet' },
    schedule: [day('quarry_yard', 'stand', 6, 18), { from: 18, to: 21, anchor: 'quarry_office', activity: 'stand' }, night('crew_bunks', 21, 6)],
    overrides: [
      { when: [committed, F('emergency_allocation'), { t: 'alloc', is: 'rillford' }], from: 6, to: 20, anchor: 'village_square', activity: 'talk' },
      { when: [committed, { t: 'alloc', is: 'rotation' }], from: 6, to: 20, anchor: 'village_square', activity: 'talk' },
    ],
    sleepsKey: 'npc.sleeps.foreman',
  },
  maintenance_worker: {
    id: 'maintenance_worker',
    name: 'Ila Rusk',
    titleKey: 'npc.title.maintenance_worker',
    faction: 'rimeward',
    home: 'inn_bench',
    look: { skin: 0xd8b190, primary: 0x6a5a48, secondary: 0xb0402a, hair: 0x3a2a1a, height: 0.92, girth: 0.9, accessory: 'satchel' },
    schedule: [day('inn_bench', 'sit', 7, 20), night('inn_bench', 20, 7)],
    overrides: [{ when: [{ t: 'not', c: F('ila_rescued') }], anchor: 'cut_ledge', activity: 'stand' }],
    sleepsKey: 'npc.sleeps.worker',
  },
  estate_steward: {
    id: 'estate_steward',
    name: 'Oren Halvek',
    titleKey: 'npc.title.estate_steward',
    faction: 'marcher',
    home: 'quarry_office',
    look: { skin: 0xd6ad8a, primary: 0x3a3f5a, secondary: 0xa89a5a, hair: 0x6a6a6a, height: 1.0, girth: 0.9, accessory: 'ledger' },
    schedule: [day('quarry_office', 'stand', 8, 18), night('quarry_office', 18, 8)],
    sleepsKey: 'npc.sleeps.steward_estate',
  },
  ash_recorder: {
    id: 'ash_recorder',
    name: 'Sel Anrit',
    titleKey: 'npc.title.ash_recorder',
    faction: 'ash',
    home: 'ford_camp',
    look: { skin: 0xc4a08a, primary: 0x4a4a4e, secondary: 0x8a8a8e, hair: 0x2a2a3a, height: 1.0, girth: 0.85, accessory: 'hood' },
    schedule: [day('ford_camp', 'sit', 8, 18), night('ford_camp', 18, 8)],
    sleepsKey: 'npc.sleeps.recorder',
  },
  shrine_warden: {
    id: 'shrine_warden',
    name: 'Tolan Harrow',
    titleKey: 'npc.title.shrine_warden',
    faction: 'templar',
    home: 'warden_post',
    look: { skin: 0xb98e6a, primary: 0x4a5f7a, secondary: 0x7a7a7a, hair: 0x5a4a3a, height: 1.06, girth: 1.15, accessory: 'coat', accent: 0xd9c98a },
    schedule: [
      day('archive_door', 'stand', 6, 11),
      // A short patrol behind the archive: the one window in the day when a forced shutter can be seen.
      { from: 11, to: 13, anchor: 'archive_back', activity: 'stand' },
      day('archive_door', 'stand', 13, 20),
      night('warden_post', 20, 6),
    ],
    sleepsKey: 'npc.sleeps.warden',
  },
  mill_hand: {
    id: 'mill_hand',
    name: 'Bess Corran',
    titleKey: 'npc.title.mill_hand',
    faction: 'league',
    home: 'mill_door',
    look: { skin: 0xd2a07c, primary: 0x9a8a5a, secondary: 0x6a4a3a, hair: 0x7a4a2a, height: 0.96, girth: 1.05, accessory: 'apron' },
    schedule: [day('mill_door', 'stand', 7, 18), night('mill_door', 18, 7)],
    sleepsKey: 'npc.sleeps.mill',
  },
  quarry_hand: {
    id: 'quarry_hand',
    name: 'Pell Dunmore',
    titleKey: 'npc.title.quarry_hand',
    faction: 'marcher',
    home: 'crew_bunks',
    look: { skin: 0xc79a72, primary: 0x6a6a5a, secondary: 0x3a4a5a, hair: 0x3a2a1a, height: 1.0, girth: 1.1, accessory: 'pack' },
    schedule: [day('quarry_face', 'work', 6, 18), night('crew_bunks', 18, 6)],
    overrides: [{ when: [committed, { t: 'alloc', is: 'rotation' }], from: 19, to: 6, anchor: 'quarry_face', activity: 'work' }],
    sleepsKey: 'npc.sleeps.crew',
  },
  village_baker: {
    id: 'village_baker',
    name: 'Hesper Lowe',
    titleKey: 'npc.title.village_baker',
    faction: 'league',
    home: 'bakery_door',
    look: { skin: 0xdcb08a, primary: 0xc2a25a, secondary: 0xe8e0c8, hair: 0x4a3a2a, height: 0.97, girth: 1.15, accessory: 'apron' },
    schedule: [day('bakery_door', 'stand', 5, 17), { from: 17, to: 20, anchor: 'village_well', activity: 'talk' }, night('bakery_door', 20, 5)],
    sleepsKey: 'npc.sleeps.baker',
  },
};

export const NPC_LIST: NpcDef[] = Object.values(NPCS);

/** Short ambient lines shown as barks when the player walks near; text keys live in dialogue strings. */
export interface Bark {
  npc: NpcId;
  when?: Cond[];
  text: string;
}

export const BARKS: Bark[] = [
  { npc: 'mill_hand', when: [{ t: 'phase', below: 'committed' }], text: 'The wheel has not turned since the flood.' },
  { npc: 'mill_hand', when: [{ t: 'phase', is: 'settled' }, { t: 'alloc', is: 'rillford' }], text: 'Grain by evening!' },
  { npc: 'village_baker', when: [{ t: 'phase', below: 'committed' }], text: 'No water, no dough.' },
  { npc: 'quarry_hand', when: [{ t: 'phase', below: 'committed' }], text: 'Nothing to cut with. Nothing to drink.' },
  { npc: 'quarry_hand', when: [{ t: 'phase', is: 'settled' }, { t: 'alloc', is: 'quarry' }], text: 'Load the wagon. Quickly.' },
  { npc: 'quarry_hand', when: [{ t: 'phase', is: 'settled' }, { t: 'alloc', is: 'rotation' }], text: 'Night shift again...' },
  { npc: 'rillford_reeve', when: [{ t: 'phase', below: 'committed' }], text: 'Where is the water going?' },
  { npc: 'quarry_foreman', when: [{ t: 'phase', below: 'committed' }], text: 'Contract does not care about the weather.' },
  { npc: 'spring_steward', when: [{ t: 'phase', below: 'committed' }], text: 'The spring is quiet today.' },
  { npc: 'shrine_warden', text: 'Keep the lamp out of the archive.' },
  { npc: 'ash_recorder', text: 'Write it down. Someone must.' },
  { npc: 'estate_steward', when: [{ t: 'phase', below: 'committed' }], text: 'The delivery date has not moved.' },
];
