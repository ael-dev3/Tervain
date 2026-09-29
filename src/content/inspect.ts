import type { Cond, Effect } from '../game/types';

/**
 * Physical observation points in the world. Standing at one and choosing "Inspect"
 * applies these effects. Observations substitute for testimony; none of them is mandatory
 * on its own (quests-and-consequences.md, "People and information").
 */
export interface InspectPoint {
  id: string;
  requires?: Cond[];
  effects: Effect[];
  /** Journal/toast text key describing what the player noticed. */
  noticeKey: string;
}

export const INSPECT_POINTS: Record<string, InspectPoint> = {
  dry_channel: {
    id: 'dry_channel',
    effects: [
      { t: 'enter', trigger: 'dry_channel' },
      { t: 'evidence', id: 'dry_channel', via: 'observed', source: 'inspect.dry_channel' },
    ],
    noticeKey: 'inspect.dry_channel',
  },
  spring_sediment: {
    id: 'spring_sediment',
    effects: [
      { t: 'enter', trigger: 'spring' },
      { t: 'evidence', id: 'reduced_spring_flow', via: 'observed', source: 'inspect.spring_sediment' },
    ],
    noticeKey: 'inspect.spring_sediment',
  },
  town_diversion: {
    id: 'town_diversion',
    effects: [
      { t: 'fact', key: 'saw_diversion' },
      { t: 'enter', trigger: 'diversion' },
    ],
    noticeKey: 'inspect.town_diversion',
  },
  quarry_seep: {
    id: 'quarry_seep',
    effects: [
      { t: 'fact', key: 'saw_seep' },
      { t: 'enter', trigger: 'seep' },
    ],
    noticeKey: 'inspect.quarry_seep',
  },
  sluice_crack: {
    id: 'sluice_crack',
    effects: [
      { t: 'enter', trigger: 'sluice' },
      { t: 'evidence', id: 'cracked_sluice', via: 'observed', source: 'inspect.sluice_crack' },
      { t: 'fact', key: 'saw_sluice_damage' },
    ],
    noticeKey: 'inspect.sluice_crack',
  },
  inspection_log: {
    id: 'inspection_log',
    effects: [{ t: 'fact', key: 'saw_inspection_gap' }],
    noticeKey: 'inspect.inspection_log',
  },
  noticeboard: {
    id: 'noticeboard',
    effects: [{ t: 'fact', key: 'read_noticeboard' }],
    noticeKey: 'inspect.noticeboard',
  },
  wetland_fish: {
    id: 'wetland_fish',
    effects: [{ t: 'fact', key: 'saw_fish_nests' }],
    noticeKey: 'inspect.wetland_fish',
  },
  saltward_kit: {
    id: 'saltward_kit',
    effects: [{ t: 'fact', key: 'saw_saltward_kit' }],
    noticeKey: 'inspect.saltward_kit',
  },
};
