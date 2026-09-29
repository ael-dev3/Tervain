import type { EncounterId, PlaceId } from '../game/types';

/**
 * The single authored source for the geography: the Grey Strand and Lantern Point on the west coast, the heath
 * road climbing to the overlook, and Bellwether Vale beyond it. Terrain, collision, navigation,
 * NPC anchors and interaction points all derive from these numbers, so a pretty riverbank is
 * never an invisible wall (architecture.md, "Terrain and content authoring").
 *
 * Units are metres. +x is east, +z is south. A facing yaw of 0 looks toward +z; the front
 * direction of a yaw is (sin yaw, cos yaw).
 */

export interface V2 {
  x: number;
  z: number;
}

export const WORLD = { minX: -380, maxX: 200, minZ: -170, maxZ: 170, cell: 2 } as const;

/** Elliptical valley: outside radius 1 the mountains close in and movement is stopped. */
export const VALLEY = { cx: 0, cz: -20, rx: 192, rz: 138 } as const;
/** The coastal plain west of the vale. The playable land is the union of the two ellipses; the sea takes the rest. */
export const COASTAL = { cx: -225, cz: 20, rx: 170, rz: 165 } as const;

/** Sea level (metres). Ground below it is sea bed; deeper than DEEP_WATER below it blocks walking. */
export const SEA_LEVEL = 0;

/**
 * The mean waterline, north to south (x of the shore at each z). The land is to the east of it. A little noise is
 * added on top of this line (see world/coast.ts) so the shore is never a clean curve.
 */
export const COAST: V2[] = [
  { x: -312, z: -172 }, { x: -306, z: -138 }, { x: -298, z: -98 }, { x: -292, z: -58 }, { x: -286, z: -22 },
  { x: -281, z: 8 }, { x: -273, z: 34 }, { x: -270, z: 52 }, { x: -282, z: 70 }, { x: -304, z: 84 },
  { x: -330, z: 95 }, { x: -346, z: 108 }, { x: -340, z: 124 }, { x: -318, z: 137 }, { x: -298, z: 148 },
  { x: -290, z: 172 },
];

export interface StreamSpec {
  id: 'main' | 'village' | 'quarry';
  halfWidth: number;
  /** Carved depth below the surrounding ground; deeper than DEEP_WATER blocks movement. */
  depth: number;
  points: V2[];
}

export const STREAMS: StreamSpec[] = [
  {
    id: 'main',
    halfWidth: 3.4,
    depth: 1.6,
    points: [
      { x: -6, z: -94 }, { x: -2, z: -82 }, { x: 6, z: -68 }, { x: 10, z: -58 }, { x: 16, z: -46 },
      { x: 24, z: -32 }, { x: 32, z: -16 }, { x: 37, z: 0 }, { x: 41, z: 14 }, { x: 48, z: 28 },
      { x: 53, z: 35 }, { x: 64, z: 46 }, { x: 84, z: 58 }, { x: 112, z: 72 }, { x: 150, z: 84 },
    ],
  },
  {
    id: 'village',
    halfWidth: 1.7,
    depth: 0.55,
    points: [
      { x: 14, z: -47 }, { x: 6, z: -40 }, { x: -4, z: -33 }, { x: -12, z: -24 }, { x: -13, z: -8 },
      { x: -13, z: 4 }, { x: -14, z: 14 }, { x: -20, z: 26 }, { x: -24, z: 42 }, { x: -26, z: 60 },
    ],
  },
  {
    id: 'quarry',
    halfWidth: 1.6,
    depth: 0.5,
    points: [
      { x: 78, z: -30 }, { x: 62, z: -30 }, { x: 48, z: -31 }, { x: 36, z: -32 }, { x: 27, z: -32 },
    ],
  },
];

/** Crossings where the main stream is shallow enough to wade. */
export const FORD = { x: 53, z: 35, r: 8, depth: 0.32 } as const;

export const DEEP_WATER = 0.85;

/** Walkable deck surfaces (footbridge). Ground height inside a deck is the deck height. */
export interface DeckSpec {
  id: string;
  x: number;
  z: number;
  hx: number;
  hz: number;
  yaw: number;
  y: number;
}
export const DECKS: DeckSpec[] = [
  { id: 'footbridge', x: 36.6, z: 1.2, hx: 6.4, hz: 1.4, yaw: 0, y: 0.75 },
  // The fishermen's jetty: a plank walkway on piles running out over the shallows.
  { id: 'jetty', x: -271, z: 58, hx: 13, hz: 1.1, yaw: 0, y: 0.9 },
];

export interface RoadSpec {
  width: number;
  points: V2[];
}

export const ROADS: RoadSpec[] = [
  // The shore track from the strand up over the heath to the overlook, then the arrival road to the village square.
  { width: 3.4, points: [{ x: -252, z: 31 }, { x: -232, z: 27 }, { x: -212, z: 30 }, { x: -190, z: 36 }, { x: -168, z: 35 }, { x: -150, z: 31 }, { x: -136, z: 26 }] },
  { width: 4.2, points: [{ x: -136, z: 26 }, { x: -110, z: 22 }, { x: -80, z: 16 }, { x: -50, z: 12 }, { x: -25, z: 10 }, { x: 2, z: 8 }] },
  // The strand track south along the beach and up the rock to Lantern Point, and the path to the jetty.
  { width: 2.2, points: [{ x: -258, z: 44 }, { x: -262, z: 62 }, { x: -274, z: 78 }, { x: -292, z: 90 }, { x: -310, z: 98 }, { x: -322, z: 106 }] },
  { width: 2.0, points: [{ x: -250, z: 40 }, { x: -252, z: 52 }, { x: -250, z: 60 }] },
  // Village square to the footbridge and the cut track to the quarry.
  { width: 3.6, points: [{ x: 2, z: 8 }, { x: 14, z: 8 }, { x: 28, z: 4 }, { x: 37, z: 1 }, { x: 50, z: -8 }, { x: 66, z: -20 }, { x: 82, z: -24 }] },
  // Mill lane north to the sluice, then the steps up to the shrine.
  { width: 3.0, points: [{ x: 2, z: 4 }, { x: 4, z: -12 }, { x: 6, z: -28 }, { x: 4, z: -44 }, { x: 2, z: -58 }] },
  { width: 2.6, points: [{ x: 2, z: -58 }, { x: -4, z: -72 }, { x: -12, z: -86 }, { x: -18, z: -94 }] },
  // Village to the ford.
  { width: 3.2, points: [{ x: 14, z: 10 }, { x: 24, z: 16 }, { x: 34, z: 24 }, { x: 44, z: 32 }, { x: 53, z: 35 }] },
  // Road beyond the ford (leaves the valley).
  { width: 3.4, points: [{ x: 53, z: 35 }, { x: 64, z: 44 }, { x: 88, z: 54 }, { x: 120, z: 68 }] },
  // Side path off the ford.
  { width: 2.0, points: [{ x: 58, z: 36 }, { x: 72, z: 30 }, { x: 86, z: 36 }, { x: 100, z: 50 }, { x: 112, z: 62 }] },
  // Cut path to the ledge.
  { width: 2.2, points: [{ x: 86, z: -30 }, { x: 96, z: -46 }, { x: 108, z: -56 }, { x: 116, z: -66 }] },
  // Old maintenance path (behind the shortcut gate) to the ledge.
  { width: 1.8, points: [{ x: 98, z: -18 }, { x: 108, z: -30 }, { x: 122, z: -44 }, { x: 130, z: -58 }, { x: 128, z: -70 }] },
  // Village lanes.
  { width: 2.4, points: [{ x: -20, z: 6 }, { x: -16, z: -2 }, { x: -18, z: -2 }] },
];

export type BuildingKind = 'house' | 'mill' | 'shrine' | 'archive' | 'office' | 'hut' | 'inn' | 'bakery' | 'reeve' | 'bunks' | 'lodge' | 'fisher' | 'store' | 'keeper';

export interface BuildingSpec {
  id: string;
  kind: BuildingKind;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  yaw: number;
  wall: 'plaster' | 'stone' | 'timber';
  roof: 'gable' | 'hip' | 'lean';
}

export const BUILDINGS: BuildingSpec[] = [
  { id: 'reeve_house', kind: 'reeve', x: 20, z: -8, w: 9, d: 6.5, h: 3.2, yaw: 0, wall: 'plaster', roof: 'gable' },
  { id: 'bakery', kind: 'bakery', x: 14, z: 16, w: 7, d: 6, h: 3, yaw: 0, wall: 'plaster', roof: 'gable' },
  { id: 'inn', kind: 'inn', x: -4, z: 30, w: 10, d: 7, h: 3.6, yaw: 0, wall: 'plaster', roof: 'gable' },
  { id: 'mill', kind: 'mill', x: -20, z: -8, w: 8, d: 8, h: 4.4, yaw: 0, wall: 'stone', roof: 'gable' },
  { id: 'house_a', kind: 'house', x: -6, z: -6, w: 7, d: 6, h: 3, yaw: 0.15, wall: 'plaster', roof: 'gable' },
  { id: 'house_b', kind: 'house', x: 8, z: -10, w: 7, d: 5.5, h: 2.9, yaw: -0.1, wall: 'timber', roof: 'gable' },
  { id: 'house_c', kind: 'house', x: 30, z: 14, w: 7, d: 6, h: 3, yaw: 0.35, wall: 'plaster', roof: 'gable' },
  { id: 'house_d', kind: 'house', x: -22, z: 20, w: 7, d: 6, h: 3, yaw: -0.25, wall: 'plaster', roof: 'gable' },
  { id: 'house_e', kind: 'house', x: 24, z: 28, w: 8, d: 6, h: 3, yaw: 0.1, wall: 'timber', roof: 'gable' },
  { id: 'house_f', kind: 'house', x: -12, z: 44, w: 7, d: 6, h: 3, yaw: 0.2, wall: 'plaster', roof: 'gable' },
  { id: 'sluice_hut', kind: 'hut', x: 0, z: -60, w: 4.5, d: 4, h: 2.6, yaw: 0.2, wall: 'stone', roof: 'lean' },
  { id: 'shrine_hall', kind: 'shrine', x: -28, z: -106, w: 14, d: 9, h: 5.2, yaw: 0, wall: 'stone', roof: 'hip' },
  { id: 'archive', kind: 'archive', x: -46, z: -102, w: 8, d: 7, h: 3.4, yaw: 0, wall: 'stone', roof: 'gable' },
  { id: 'quarry_office', kind: 'office', x: 76, z: -14, w: 7, d: 5, h: 2.9, yaw: -0.2, wall: 'timber', roof: 'lean' },
  { id: 'crew_bunks', kind: 'bunks', x: 98, z: -10, w: 9, d: 5, h: 2.6, yaw: 0.3, wall: 'timber', roof: 'lean' },
  { id: 'overlook_lodge', kind: 'lodge', x: -150, z: 40, w: 6, d: 5, h: 2.8, yaw: 0.6, wall: 'stone', roof: 'lean' },
  // The fishing camp on the dunes behind the strand, and the keeper's cottage under Lantern Point.
  { id: 'fisher_house', kind: 'fisher', x: -236, z: 60, w: 9.5, d: 7, h: 3.1, yaw: -0.35, wall: 'timber', roof: 'gable' },
  { id: 'net_store', kind: 'store', x: -241, z: 42, w: 5.5, d: 4.6, h: 2.5, yaw: 0.5, wall: 'timber', roof: 'lean' },
  { id: 'keeper_cottage', kind: 'keeper', x: -294, z: 118, w: 6.5, d: 5.2, h: 2.7, yaw: 0.9, wall: 'stone', roof: 'gable' },
];

export const bySpec = (id: string): BuildingSpec => {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) throw new Error(`no building ${id}`);
  return b;
};

/** A point in front of a building's door (local +z), offset outward. */
export function frontOf(b: BuildingSpec, out: number, side = 0): V2 {
  const lz = b.d / 2 + out;
  const c = Math.cos(b.yaw);
  const s = Math.sin(b.yaw);
  // local (side, lz) -> world
  return { x: b.x + side * c + lz * s, z: b.z - side * s + lz * c };
}

export interface Anchor extends V2 {
  yaw: number;
}

const a = (p: V2, yaw = 0): Anchor => ({ x: p.x, z: p.z, yaw });

export const ANCHORS: Record<string, Anchor> = {
  overlook_wagon: a({ x: -249, z: 34 }, 1.2),
  village_square: a({ x: 3, z: 9 }, 0),
  noticeboard: a({ x: 5, z: 12.9 }, Math.PI),
  village_well: a({ x: -6, z: 21.8 }, 0),
  dry_channel: a({ x: -10, z: 8 }, -1.6),
  reeve_door: a(frontOf(bySpec('reeve_house'), 1.4), 0),
  bakery_door: a(frontOf(bySpec('bakery'), 1.4), 0),
  mill_door: a(frontOf(bySpec('mill'), 1.4), 0),
  inn_bench: a({ x: -9, z: 35.2 }, 0),
  shrine_altar: a({ x: -14, z: -95.6 }, 3.1),
  shrine_steps: a({ x: -18, z: -95 }, 0),
  wetland_edge: a({ x: -15, z: -86 }, -2.2),
  steward_cell: a(frontOf(bySpec('shrine_hall'), 1.4, 3), 0),
  archive_door: a(frontOf(bySpec('archive'), 1.6), 0),
  warden_post: a(frontOf(bySpec('shrine_hall'), 1.4, -3), 0),
  archive_back: a({ x: -46, z: -109.4 }, 0),
  quarry_yard: a({ x: 86, z: -24 }, 1.2),
  quarry_office: a(frontOf(bySpec('quarry_office'), 1.4), 0),
  quarry_face: a({ x: 96, z: -30 }, 1.6),
  crew_bunks: a(frontOf(bySpec('crew_bunks'), 1.4), 0),
  cut_ledge: a({ x: 122, z: -72 }, 3.1),
  ford_camp: a({ x: 44, z: 31 }, 1.0),
  strand_fire: a({ x: -246, z: 28 }, 0),
  lantern_door: a({ x: -318, z: 113 }, 0),
};

export const PLACES: Record<PlaceId, { x: number; z: number; r: number }> = {
  shore: { x: -256, z: 32, r: 30 },
  lantern_point: { x: -318, z: 104, r: 24 },
  overlook: { x: -136, z: 26, r: 14 },
  rillford: { x: 4, z: 8, r: 34 },
  ford: { x: 50, z: 32, r: 12 },
  spring_shrine: { x: -20, z: -98, r: 24 },
  sluice: { x: 3, z: -57, r: 13 },
  quarry: { x: 88, z: -24, r: 22 },
  the_cut: { x: 118, z: -62, r: 18 },
  archive: { x: -46, z: -100, r: 8 },
};

/** The player arrives on the strand, at the water's edge, facing along the beach toward Lantern Point. */
export const SPAWN = { x: -257, z: 27, yaw: Math.atan2(-0.25, 1) };

export interface WorldPoint {
  id: string;
  x: number;
  z: number;
  /** Interaction reach in metres. */
  r: number;
}

/** Physical observation points; each maps to an entry in content/inspect.ts. */
export const INSPECT_LOCATIONS: WorldPoint[] = [
  { id: 'dry_channel', x: -13.5, z: 5, r: 3.2 },
  { id: 'spring_sediment', x: -6, z: -86, r: 4 },
  { id: 'town_diversion', x: 12, z: -46, r: 4 },
  { id: 'quarry_seep', x: 74, z: -30, r: 4 },
  { id: 'sluice_crack', x: 5.6, z: -57.4, r: 3.4 },
  { id: 'inspection_log', x: 2.6, z: -57.0, r: 2.6 },
  { id: 'noticeboard', x: 5, z: 12.8, r: 3.0 },
  { id: 'wetland_fish', x: -14, z: -90, r: 3.5 },
  { id: 'saltward_kit', x: 15, z: 20.5, r: 2.4 },
];

export const PICKUP_LOCATIONS: (WorldPoint & { item: 'sluice_brace' | 'gate_wrench' | 'coin' | 'poultice'; qty: number; nameKey: string })[] = [
  { id: 'quarry_brace', x: 90, z: -12, r: 2.6, item: 'sluice_brace', qty: 1, nameKey: 'pickup.brace' },
  { id: 'quarry_wrench', x: 91.6, z: -13, r: 2.6, item: 'gate_wrench', qty: 1, nameKey: 'pickup.wrench' },
  { id: 'side_path_cache', x: 112, z: 62, r: 3, item: 'coin', qty: 8, nameKey: 'pickup.cache' },
];

export const SHORTCUT = { lever: { x: 92.6, z: -8.4, r: 2.6 }, gate: { x: 100, z: -19, hw: 1.2, hd: 0.5, yaw: 0.9 } };

export const SLUICE = {
  /** Control wheel and lever the player operates. */
  control: { x: 3.4, z: -62.6, r: 3.8 },
  gateCenter: { x: 10, z: -58 },
};

export const RITE_ALTAR = { x: -14, z: -98, r: 3.6 };
export const LEDGER = { x: -46, z: -102.4, r: 2.6 };
export const ARCHIVE_SHUTTER = { x: -46, z: -105.8, r: 2.6 };
export const BELL = { x: -1, z: 4, r: 4 };
export const RESULT_CHECKS: WorldPoint[] = [
  { id: 'check_channel', x: -13.5, z: 5, r: 3.4 },
  { id: 'check_mill', x: -14, z: -2, r: 3.4 },
];

export interface EnemySpawn {
  id: EncounterId;
  kind: 'bandit' | 'thornback';
  x: number;
  z: number;
  leash: number;
}

export const ENEMY_SPAWNS: EnemySpawn[] = [
  { id: 'ford_bandit_a', kind: 'bandit', x: 84, z: 38, leash: 16 },
  { id: 'ford_bandit_b', kind: 'bandit', x: 89, z: 42, leash: 16 },
  { id: 'cut_creature', kind: 'thornback', x: 110, z: -56, leash: 15 },
];

export const WAGON = { x: -252, z: 37.5, yaw: 1.2 };
/** The lighthouse tower: a stone shaft on the rock at the tip of Lantern Point. */
export const LIGHTHOUSE = { x: -324, z: 104, r: 3.3, h: 17, rockH: 12, rockR: 44 } as const;
/**
 * The fishing camp's landward palisade: a stockade of upright logs curving behind the camp, with a gate where the shore track passes
 * through and a watch platform beside it (Ardea is a palisaded place). The ends are open: it is old and unfinished.
 */
export const PALISADE = {
  points: [{ x: -229, z: 4 }, { x: -223, z: 14 }, { x: -220, z: 23 }, { x: -219.2, z: 36 }, { x: -221.5, z: 48 }, { x: -227, z: 60 }, { x: -236, z: 71 }] as V2[],
  /** The gap the track runs through, as a range of z along the near-vertical stretch of the wall. */
  gate: { z0: 26.6, z1: 31.4 },
  tower: { x: -221.6, z: 22.6, yaw: 0.16 },
} as const;

/** The strand: where boats are hauled up, nets are hung and the caravan camps. */
export const STRAND = { x: -258, z: 44, r: 40 } as const;
export const BORDER_SIGN = { x: 122, z: 70 };
export const BELL_TOWER = { x: -1, z: 4 };
export const WELL = { x: -6, z: 18 };
export const MILL_WHEEL = { x: -14.6, z: -8, r: 2.6 };
export const SPRING_POOL = { x: -8, z: -94, r: 8 };
export const SHRINE_PLATEAU = { x: -28, z: -102, r: 44, h: 7 };
export const OVERLOOK_BUMP = { x: -140, z: 30, r: 46, h: 8 };
export const LEDGE = { x: 122, z: -72, r: 12, h: 0 };

/** Bench and lantern positions for the environment art. */
export const LANTERNS: V2[] = [
  { x: -244, z: 34 }, { x: -230, z: 52 }, { x: -292, z: 116 }, { x: 2, z: 12 }, { x: 22, z: 4 }, { x: -20, z: -3 }, { x: -8, z: 32 }, { x: 14, z: 21 },
  { x: -16, z: -96 }, { x: -44, z: -95 }, { x: 88, z: -20 }, { x: 78, z: -10 }, { x: -132, z: 30 },
];

/** The old maintenance track Ila walks once the gate is open: ledge → gate → quarry yard. */
export const MAINT_ROUTE: V2[] = [
  { x: 126, z: -70 }, { x: 130, z: -58 }, { x: 122, z: -44 }, { x: 108, z: -30 }, { x: 100, z: -21 }, { x: 93, z: -24 },
];

export interface FieldSpec {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  yaw: number;
  crop: 'grain' | 'greens' | 'fallow';
}

/** Cultivated plots for the village's irrigation stake. Rows are vegetation, not collision. */
export const FIELDS: FieldSpec[] = [
  { id: 'field_south', x: -4, z: 64, w: 40, d: 20, yaw: 0.08, crop: 'grain' },
  { id: 'field_east', x: 36, z: 58, w: 26, d: 18, yaw: -0.1, crop: 'greens' },
  { id: 'field_west', x: -42, z: 50, w: 18, d: 26, yaw: 0.05, crop: 'fallow' },
];

/** Orchard rows (fruit trees) west of the village. */
export const ORCHARD = { x: -50, z: 20, w: 30, d: 30 };
