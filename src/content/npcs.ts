import type { Cond, NpcId } from '../game/types';

export type Activity = 'work' | 'stand' | 'sit' | 'talk' | 'rest';
export type Accessory = 'shawl' | 'robe' | 'helmet' | 'satchel' | 'apron' | 'hat' | 'cloak' | 'ledger' | 'coat' | 'hood' | 'pack';

export interface ScheduleEntry {
  /** Hours are 0..24; a range may wrap midnight (from > to). */
  from: number;
  to: number;
  anchor: string;
  activity: Activity;
  /**
   * Indoors at a furnished spot of the anchor's building (world/homes.ts INDOOR_POSTS), A70: the anchor stays the
   * place outside its door that routes and content checks know, and the resident walks in to the post.
   */
  inside?: string;
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
  /** A personal welcome on arrival, rather than a periodic background remark. */
  approachGreeting?: {
    line: string;
    radius: number;
    leaveRadius: number;
    cooldown: number;
  };
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
      // Her accounts at her own table before the day's business (A70).
      { from: 6, to: 8, anchor: 'reeve_door', activity: 'work', inside: 'reeve_table' },
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
    // The morning's ledgers at the office table, then at its door (A70).
    schedule: [{ from: 8, to: 12, anchor: 'quarry_office', activity: 'work', inside: 'office_table' }, day('quarry_office', 'stand', 12, 18), night('quarry_office', 18, 8)],
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
    // At the mill's bench through the morning, then out at its door (A70).
    schedule: [{ from: 7, to: 10, anchor: 'mill_door', activity: 'work', inside: 'mill_bench' }, day('mill_door', 'stand', 10, 18), night('mill_door', 18, 7)],
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
    // Baking at the oven from first light, then selling at the door (A70).
    schedule: [{ from: 5, to: 8, anchor: 'bakery_door', activity: 'work', inside: 'bakery_oven' }, day('bakery_door', 'stand', 8, 17), { from: 17, to: 20, anchor: 'village_well', activity: 'talk' }, night('bakery_door', 20, 5)],
    sleepsKey: 'npc.sleeps.baker',
  },
  trail_hunter: {
    id: 'trail_hunter',
    name: 'Rowan Vale',
    titleKey: 'npc.title.trail_hunter',
    faction: 'league',
    home: 'hunter_shelter',
    look: { skin: 0xb58d70, primary: 0x48503c, secondary: 0x65503a, hair: 0x3c3029, height: 1.02, girth: 1.06, accessory: 'cloak' },
    schedule: [day('hunter_station', 'work', 6, 20), day('hunter_station', 'stand', 20, 22), night('hunter_shelter', 22, 6)],
    sleepsKey: 'npc.sleeps.hunter',
    interactRadius: 3,
    approachGreeting: { line: 'rowan.bark.supplies', radius: 6, leaveRadius: 11, cooldown: 120 },
  },
};

export const NPC_LIST: NpcDef[] = Object.values(NPCS);

/**
 * Remarks people make when the player walks near (voiced, A53): each names a line in voice.ts, whose text is also
 * the bubble. `hours` limits a remark to part of the day.
 */
export interface Bark {
  npc: NpcId;
  when?: Cond[];
  hours?: [from: number, to: number];
  line: string;
}

const below: Cond = { t: 'phase', below: 'committed' };
const settledWith = (is: 'rillford' | 'quarry' | 'rotation'): Cond[] => [{ t: 'phase', is: 'settled' }, { t: 'alloc', is }];
const stranded: Cond = { t: 'not', c: F('ila_rescued') };

export const BARKS: Bark[] = [
  { npc: 'trail_hunter', line: 'rowan.bark.supplies' },
  { npc: 'mill_hand', when: [below], line: 'bess.bark.wheel' },
  { npc: 'mill_hand', when: [{ t: 'phase', below: 'settled' }], line: 'bess.bark.grain' },
  { npc: 'mill_hand', when: settledWith('rillford'), line: 'bess.bark.evening' },
  { npc: 'village_baker', when: [below], line: 'hesper.bark.dough' },
  { npc: 'village_baker', when: [below], line: 'hesper.bark.barrel' },
  { npc: 'village_baker', line: 'hesper.bark.step' },
  { npc: 'quarry_hand', when: [below], line: 'pell.bark.nothing' },
  { npc: 'quarry_hand', when: [below], line: 'pell.bark.dust' },
  { npc: 'quarry_hand', when: settledWith('quarry'), line: 'pell.bark.load' },
  { npc: 'quarry_hand', when: settledWith('rotation'), line: 'pell.bark.night' },
  { npc: 'rillford_reeve', when: [below], line: 'mara.bark.where' },
  { npc: 'rillford_reeve', when: [below], line: 'mara.bark.bucket' },
  { npc: 'rillford_reeve', when: settledWith('rillford'), line: 'mara.bark.bread' },
  { npc: 'quarry_foreman', when: [below], line: 'darin.bark.contract' },
  { npc: 'quarry_foreman', when: [below], line: 'darin.bark.count' },
  { npc: 'quarry_foreman', line: 'darin.bark.stack' },
  { npc: 'spring_steward', when: [below], line: 'edda.bark.quiet' },
  { npc: 'spring_steward', line: 'edda.bark.patience' },
  { npc: 'spring_steward', line: 'edda.bark.reeds' },
  { npc: 'maintenance_worker', when: [stranded], line: 'ila.bark.hello' },
  { npc: 'maintenance_worker', when: [stranded], line: 'ila.bark.down' },
  { npc: 'maintenance_worker', when: [F('ila_rescued')], line: 'ila.bark.bench' },
  { npc: 'shrine_warden', line: 'tolan.bark.lamp' },
  { npc: 'shrine_warden', line: 'tolan.bark.hands' },
  { npc: 'shrine_warden', hours: [19, 6], line: 'tolan.bark.lock' },
  { npc: 'ash_recorder', line: 'sel.bark.write' },
  { npc: 'ash_recorder', line: 'sel.bark.ink' },
  { npc: 'ash_recorder', line: 'sel.bark.hour' },
  { npc: 'estate_steward', when: [below], line: 'oren.bark.date' },
  { npc: 'estate_steward', line: 'oren.bark.columns' },
  { npc: 'caravan_master', line: 'joss.bark.horse' },
  // The time of day in their voices.
  { npc: 'caravan_master', hours: [5, 9], line: 'joss.bark.fog' },
  { npc: 'caravan_master', hours: [20, 5], line: 'joss.bark.lamp' },
  { npc: 'rillford_reeve', hours: [6, 8], when: [below], line: 'mara.bark.morning' },
  { npc: 'rillford_reeve', hours: [17, 20], when: [{ t: 'phase', below: 'settled' }], line: 'mara.bark.short' },
  { npc: 'spring_steward', hours: [5, 8], line: 'edda.bark.blessed' },
  { npc: 'spring_steward', hours: [16, 21], line: 'edda.bark.light' },
  { npc: 'quarry_foreman', hours: [6, 18], line: 'darin.bark.edge' },
  { npc: 'quarry_foreman', hours: [18, 21], line: 'darin.bark.ledgers' },
  { npc: 'maintenance_worker', hours: [18, 24], when: [F('ila_rescued')], line: 'ila.bark.cheerful' },
  { npc: 'estate_steward', hours: [8, 18], line: 'oren.bark.counting' },
  { npc: 'ash_recorder', hours: [8, 18], line: 'sel.bark.river' },
  { npc: 'ash_recorder', hours: [19, 6], line: 'sel.bark.dark' },
  { npc: 'shrine_warden', hours: [6, 20], line: 'tolan.bark.along' },
  { npc: 'mill_hand', hours: [7, 9], when: [{ t: 'phase', below: 'settled' }], line: 'bess.bark.morning' },
  { npc: 'quarry_hand', hours: [17, 20], when: [{ t: 'phase', below: 'settled' }], line: 'pell.bark.done' },
  { npc: 'village_baker', hours: [5, 8], line: 'hesper.bark.ovens' },
  { npc: 'village_baker', hours: [17, 20], line: 'hesper.bark.queue' },
];
