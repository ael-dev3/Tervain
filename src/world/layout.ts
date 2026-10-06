import type { EncounterId, ItemId, PlaceId } from '../game/types';

/**
 * The single authored source for the geography: the empty Grey Strand and Lantern Point on the west coast, the
 * deepwood road to an inland waystation, and Bellwether Vale beyond it. Terrain, collision, navigation,
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

/** Elliptical playable region: beyond its low heath boundary, movement is stopped. */
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
  { x: -350, z: -172 }, { x: -345, z: -138 }, { x: -328, z: -98 }, { x: -304, z: -58 }, { x: -286, z: -22 },
  { x: -281, z: 8 }, { x: -273, z: 34 }, { x: -270, z: 52 }, { x: -282, z: 70 }, { x: -304, z: 84 },
  { x: -330, z: 95 }, { x: -346, z: 108 }, { x: -340, z: 124 }, { x: -318, z: 137 }, { x: -298, z: 148 },
  { x: -290, z: 172 },
];

/** Original low coastal shelves frame the cove; their broken lips face sand, not the inland travel road. */
export const COAST_SHELVES = [
  { x: -282, z: -92, rx: 42, rz: 43, height: 12, edge: 0.26 },
  { x: -254, z: -38, rx: 30, rz: 23, height: 7.8, edge: 0.32 },
  { x: -248, z: 14, rx: 20, rz: 12, height: 4.8, edge: 0.32 },
  { x: -245, z: 68, rx: 26, rz: 24, height: 6.8, edge: 0.3 },
] as const;

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
];

export interface RoadSpec {
  width: number;
  points: V2[];
}

/** The continuous arrival trail: quiet sand, closed woodland, inland waystation, then Rillford. */
export const ARRIVAL_ROUTE: V2[] = [
  { x: -252, z: 31 }, { x: -230, z: 25 }, { x: -208, z: 12 }, { x: -182, z: 10 },
  { x: -160, z: 23 }, { x: -138, z: 30 }, { x: -110, z: 22 }, { x: -80, z: 16 },
  { x: -50, z: 12 }, { x: -25, z: 10 }, { x: 2, z: 8 },
];
export const ARRIVAL_TRAIL_WIDTH = 4.2;
/** One readable fingerpost at the real shore/woodland fork; the board's point faces east toward Rillford. */
export const ARRIVAL_SIGN = { x: -248, z: 38, yaw: 0, target: 'rillford', label: 'RILLFORD', boardWidth: 1.85, boardHeight: 0.4, boardDepth: 0.22, boardBottom: 1.78 } as const;

/** A keeper's pack track climbs the landward shoulder rather than scaling Lantern Point's rock face. */
export const LANTERN_TRAIL_WIDTH = 3.2;
export const LANTERN_ROUTE: V2[] = [
  ARRIVAL_ROUTE[0]!, { x: -258, z: 44 }, { x: -262, z: 62 }, { x: -274, z: 78 },
  { x: -287, z: 88 }, { x: -297, z: 99 }, { x: -300, z: 117 },
  { x: -314, z: 121 }, { x: -322, z: 115 }, { x: -324, z: 110 },
];
/** The first four points retain the strand; these metre heights form the gentle cut above it. null meets the native shore/terrace. */
export const LANTERN_GRADE: readonly (number | null)[] = [null, null, null, null, 2.2, 4.6, 7.3, 10.4, null, null];

/** Low wooded hogbacks and a dry swale give the inland route a varied silhouette without enclosing the beach in mountains. */
export const FOREST_HILLS = [
  { id: 'north_hogback', x: -194, z: -44, rx: 60, rz: 27, yaw: -0.18, h: 10.5 },
  { id: 'south_hogback', x: -167, z: 68, rx: 47, rz: 30, yaw: 0.34, h: 11 },
  { id: 'western_knoll', x: -218, z: -6, rx: 31, rz: 18, yaw: 0.4, h: 5.2 },
] as const;
export const FOREST_SWALE = {
  width: 11,
  depth: 2.8,
  points: [{ x: -225, z: -1 }, { x: -208, z: -14 }, { x: -191, z: -15 }, { x: -171, z: -9 }, { x: -150, z: -14 }, { x: -129, z: -2 }] as V2[],
} as const;

/** The authored old-growth footprint; the population, floor shading and waymarks share it. */
export const FOREST_REGION = { minX: -238, maxX: -66, minZ: -104, maxZ: 112, shoreClearance: 34 } as const;
export const DEEPWOOD = FOREST_REGION;
export const INLAND_HAMLET = { x: -82, z: 34, r: 29 } as const;
/** Native trade/work props move with the waystation; their geometry and collision share these points. */
export const HAMLET_PROPS = {
  barrels: [{ x: -82, z: 52.4 }, { x: -80.8, z: 52.8 }],
  crates: [{ x: -89, z: 26.5 }, { x: -89.1, z: 27.3 }],
  handcart: { x: -89, z: 41, yaw: 0.3 },
  firewood: { x: -87, z: 36, yaw: 0.6 },
  rope: { x: -91, z: 39 },
  pots: { x: -101, z: 37 },
} as const;
/** A lone storm-wreck is the landing's environmental clue, rather than a lived-in fishing camp. */
export const ARRIVAL_WRECK = { x: -274, z: -10, yaw: 1.05, length: 9 } as const;
/** Proposed forest stewardship traces; these are carved trail stones, not a new faction insignia. */
export const FOREST_WAYMARKERS: (V2 & { yaw: number })[] = [
  { x: -230, z: 32, yaw: -0.4 }, { x: -190, z: 3, yaw: 0.35 },
  { x: -149, z: 36, yaw: -0.25 }, { x: -121, z: 14, yaw: 0.15 },
];
/** Low, roofless roadside remains, with a south entrance and a missing north wall. */
export const FOREST_RUIN = { x: -180, z: -22, hx: 5.5, hz: 4, yaw: 0.15, r: 8.5 } as const;

export const ROADS: RoadSpec[] = [
  { width: ARRIVAL_TRAIL_WIDTH, points: ARRIVAL_ROUTE.slice(0, 7) },
  { width: ARRIVAL_TRAIL_WIDTH, points: ARRIVAL_ROUTE.slice(6) },
  // A continuous worn-earth keeper's trail with a graded climb and level doorway forecourt.
  { width: LANTERN_TRAIL_WIDTH, points: LANTERN_ROUTE },
  // Inland waystation lanes join the main trail instead of ending at empty coastal props.
  { width: 2.2, points: [{ x: -93, z: 19 }, { x: -91, z: 30 }, { x: -85, z: 40 }, { x: -83, z: 52 }, { x: -90, z: 62 }] },
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
  { id: 'overlook_lodge', kind: 'lodge', x: -58, z: -14, w: 6, d: 5, h: 2.8, yaw: 0.6, wall: 'stone', roof: 'lean' },
  // Existing building identifiers survive the move to a wood-and-stone waystation well inland.
  { id: 'fisher_house', kind: 'fisher', x: -80, z: 46, w: 9.5, d: 7, h: 3.1, yaw: -0.35, wall: 'timber', roof: 'gable' },
  { id: 'net_store', kind: 'store', x: -85, z: 28, w: 5.5, d: 4.6, h: 2.5, yaw: 0.5, wall: 'timber', roof: 'lean' },
  { id: 'keeper_cottage', kind: 'keeper', x: -96, z: 59, w: 6.5, d: 5.2, h: 2.7, yaw: 0.9, wall: 'stone', roof: 'gable' },
];

export const bySpec = (id: string): BuildingSpec => {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) throw new Error(`no building ${id}`);
  return b;
};

/** Shared dimensions of the enterable archive: shell, moving leaves and walking surface agree. */
export const ARCHIVE_ROOM = {
  wallBase: 0.2,
  wallThickness: 0.3,
  floorBase: 0.1,
  floorTop: 0.24,
  doorHalfWidth: 1.0,
  doorHeight: 2.5,
  shutterHalfWidth: 0.8,
  shutterBottom: 0.7,
  shutterTop: 3.0,
  roofPitch: 0.5,
} as const;

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
  arrival_sign: a(ARRIVAL_SIGN),
  overlook_wagon: a({ x: -93, z: 22 }, 1.2),
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
  strand_fire: a({ x: -103, z: 16 }, 0),
  lantern_door: a({ x: -318, z: 113 }, 0),
};

export const PLACES: Record<PlaceId, { x: number; z: number; r: number }> = {
  shore: { x: -256, z: 32, r: 30 },
  deepwood: { x: -182, z: 14, r: 45 },
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

/** The player wakes alone above the tide, facing the faint track inland into the trees. */
const LANDING = { x: -268, z: 27 };
export const SPAWN = { ...LANDING, yaw: Math.atan2(ARRIVAL_ROUTE[0]!.x - LANDING.x, ARRIVAL_ROUTE[0]!.z - LANDING.z) };

export interface WorldPoint {
  id: string;
  x: number;
  z: number;
  /** Interaction reach in metres. */
  r: number;
}

/** Physical observation points; each maps to an entry in content/inspect.ts. */
export const INSPECT_LOCATIONS: WorldPoint[] = [
  { id: 'arrival_wreckage', x: -272, z: -8, r: 3.2 },
  { id: 'templar_waymarker', x: FOREST_WAYMARKERS[0]!.x, z: FOREST_WAYMARKERS[0]!.z, r: 3.2 },
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

/** Hunting gear is found just off the early woodland trail; hides buy replacement arrows here. */
export const HUNTER_SUPPLY = { x: -229, z: 29, r: 3 } as const;

export const PICKUP_LOCATIONS: (WorldPoint & { item: ItemId; qty: number; nameKey: string; yaw?: number })[] = [
  { id: 'hunter_bow', x: HUNTER_SUPPLY.x - .5, z: HUNTER_SUPPLY.z, r: 2.4, item: 'hunting_bow', qty: 1, nameKey: 'pickup.hunter_bow', yaw: .7 },
  { id: 'hunter_knife', x: HUNTER_SUPPLY.x + .5, z: HUNTER_SUPPLY.z, r: 2.4, item: 'skinning_knife', qty: 1, nameKey: 'pickup.hunter_knife', yaw: -.4 },
  { id: 'hunter_arrows', x: HUNTER_SUPPLY.x, z: HUNTER_SUPPLY.z + 1, r: 2.4, item: 'arrow', qty: 24, nameKey: 'pickup.hunter_arrows', yaw: .3 },
  { id: 'quarry_brace', x: 90, z: -12, r: 2.6, item: 'sluice_brace', qty: 1, nameKey: 'pickup.brace' },
  { id: 'quarry_wrench', x: 91.6, z: -13, r: 2.6, item: 'gate_wrench', qty: 1, nameKey: 'pickup.wrench' },
  { id: 'side_path_cache', x: 112, z: 62, r: 3, item: 'coin', qty: 8, nameKey: 'pickup.cache' },
  // The wanderer arrives with nothing; the first blade lies inside the hull of the wreck on the beach, north of the
  // landing: near the middle of the hull and 0.7 m from the keel on the landing side, so the sea chest does not hide it.
  { id: 'wreck_blade', ...inWreck(-0.7, 0.2), r: 2.4, item: 'rusted_sword', qty: 1, nameKey: 'pickup.wreck_blade' },
  // Loose storm provisions remain sparse on the shore; there is no lived-in coastal camp or automatic respawn.
  { id: 'strand_apple', x: -266, z: 31, r: 1.85, item: 'shore_apple', qty: 1, nameKey: 'item.shore_apple', yaw: 0.4 },
  { id: 'tide_bread', x: -266, z: 12, r: 1.85, item: 'bread', qty: 1, nameKey: 'item.bread', yaw: 1.1 },
  { id: 'wreck_iron_a', x: -269, z: -6, r: 1.85, item: 'iron_scrap', qty: 1, nameKey: 'item.iron_scrap', yaw: -0.4 },
  { id: 'wreck_iron_b', x: -266, z: -14, r: 1.85, item: 'iron_scrap', qty: 1, nameKey: 'item.iron_scrap', yaw: 0.9 },
  { id: 'shoretrack_apple', x: -246, z: 31, r: 1.85, item: 'shore_apple', qty: 1, nameKey: 'item.shore_apple', yaw: 2.1 },
  { id: 'dune_herb', x: -253, z: 47, r: 1.85, item: 'healing_herb', qty: 1, nameKey: 'item.healing_herb', yaw: 0.8 },
  // Close to the trail rather than concealed inside geometry: the woodland rewards looking without turning into a loot field.
  { id: 'deepwood_mushroom_a', x: -225, z: 22, r: 1.85, item: 'field_mushroom', qty: 1, nameKey: 'item.field_mushroom', yaw: 0.3 },
  { id: 'deepwood_herb_a', x: -214, z: 16, r: 1.85, item: 'healing_herb', qty: 1, nameKey: 'item.healing_herb', yaw: 2.2 },
  { id: 'deepwood_mushroom_b', x: -198, z: 7, r: 1.85, item: 'field_mushroom', qty: 1, nameKey: 'item.field_mushroom', yaw: -0.7 },
  { id: 'deepwood_apple_a', x: -184, z: 12, r: 1.85, item: 'shore_apple', qty: 1, nameKey: 'item.shore_apple', yaw: 1.9 },
  { id: 'deepwood_herb_b', x: -169, z: 24, r: 1.85, item: 'healing_herb', qty: 1, nameKey: 'item.healing_herb', yaw: -1.2 },
  { id: 'deepwood_mushroom_c', x: -156, z: 26, r: 1.85, item: 'field_mushroom', qty: 1, nameKey: 'item.field_mushroom', yaw: 1.2 },
  { id: 'deepwood_mushroom_d', x: -140, z: 33, r: 1.85, item: 'field_mushroom', qty: 1, nameKey: 'item.field_mushroom', yaw: 2.8 },
  { id: 'deepwood_herb_c', x: -125, z: 26, r: 1.85, item: 'healing_herb', qty: 1, nameKey: 'item.healing_herb', yaw: 0.1 },
  { id: 'oldtrack_iron', x: -113, z: 19, r: 1.85, item: 'iron_scrap', qty: 1, nameKey: 'item.iron_scrap', yaw: 1.5 },
  { id: 'waystation_apple_a', x: -104, z: 14, r: 1.85, item: 'shore_apple', qty: 1, nameKey: 'item.shore_apple', yaw: 0.6 },
  { id: 'waystation_bread_a', x: -101, z: 22, r: 1.85, item: 'bread', qty: 1, nameKey: 'item.bread', yaw: -0.6 },
  { id: 'waystation_apple_b', x: -90, z: 46, r: 1.85, item: 'shore_apple', qty: 1, nameKey: 'item.shore_apple', yaw: 1.4 },
  { id: 'waystation_bread_b', x: -89, z: 34, r: 1.85, item: 'bread', qty: 1, nameKey: 'item.bread', yaw: 0.3 },
  { id: 'waystation_iron', x: -102, z: 46, r: 1.85, item: 'iron_scrap', qty: 1, nameKey: 'item.iron_scrap', yaw: 2.3 },
  { id: 'waystation_herb', x: -81, z: 59, r: 1.85, item: 'healing_herb', qty: 1, nameKey: 'item.healing_herb', yaw: -0.4 },
  // The keeper compound's exterior; neither house nor lantern room hides an unreachable item.
  { id: 'lantern_iron', x: -315, z: 110, r: 1.85, item: 'iron_scrap', qty: 1, nameKey: 'item.iron_scrap', yaw: 0.7 },
  { id: 'lantern_herb', x: -311, z: 101, r: 1.85, item: 'healing_herb', qty: 1, nameKey: 'item.healing_herb', yaw: 1.6 },
  { id: 'lantern_bread', x: -334, z: 111.5, r: 1.85, item: 'bread', qty: 1, nameKey: 'item.bread', yaw: -0.8 },
  { id: 'lantern_apple', x: -327, z: 114, r: 1.85, item: 'shore_apple', qty: 1, nameKey: 'item.shore_apple', yaw: 1.4 },
  { id: 'rillford_apple', x: -18, z: 32, r: 1.85, item: 'shore_apple', qty: 1, nameKey: 'item.shore_apple', yaw: 0.2 },
  { id: 'rillford_bread', x: 7, z: 32, r: 1.85, item: 'bread', qty: 1, nameKey: 'item.bread', yaw: 2.2 },
  { id: 'rillford_mushroom', x: -26, z: 12, r: 1.85, item: 'field_mushroom', qty: 1, nameKey: 'item.field_mushroom', yaw: -1.1 },
  { id: 'rillford_herb', x: 24, z: 4, r: 1.85, item: 'healing_herb', qty: 1, nameKey: 'item.healing_herb', yaw: 0.7 },
  { id: 'quarry_iron', x: 70, z: -17, r: 1.85, item: 'iron_scrap', qty: 1, nameKey: 'item.iron_scrap', yaw: 1.9 },
  { id: 'quarry_mushroom', x: 67, z: -24, r: 1.85, item: 'field_mushroom', qty: 1, nameKey: 'item.field_mushroom', yaw: 0.8 },
  { id: 'quarry_herb', x: 86, z: -3, r: 1.85, item: 'healing_herb', qty: 1, nameKey: 'item.healing_herb', yaw: -0.2 },
];

/** A point in the arrival wreck's own frame (x across the hull, z along it) in world coordinates. */
function inWreck(x: number, z: number): V2 {
  const c = Math.cos(ARRIVAL_WRECK.yaw);
  const s = Math.sin(ARRIVAL_WRECK.yaw);
  return { x: ARRIVAL_WRECK.x + x * c + z * s, z: ARRIVAL_WRECK.z - x * s + z * c };
}

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

export const WAGON = { x: -96, z: 25.5, yaw: 1.2 };
/** Connected wagon dimensions, shared by the mesh and collision authoring. Longitudinal axis is local x. */
export const WAGON_CONSTRUCTION = {
  length: 4.6, width: 2.2, wheelRadius: 0.74, wheelTrack: 1.3,
  axleXs: [-1.55, 1.55] as readonly number[], bedTop: 1.16,
  sideTop: 2.06, shaftStart: 1.55, shaftEnd: 4.8,
  shaftStartY: 0.83, shaftEndY: 0.045, shaftZ: 0.55,
} as const;
/** The two-wheel utility cart follows the same construction at a smaller scale. */
export const HANDCART_CONSTRUCTION = {
  length: 2.1, width: 1.3, wheelRadius: 0.54, wheelTrack: 0.85,
  axleXs: [-0.16] as readonly number[], bedTop: 0.8,
  sideTop: 1.42, shaftStart: -0.16, shaftEnd: 3.4,
  shaftStartY: 0.64, shaftEndY: 0.045, shaftZ: 0.4,
} as const;
/** The existing town utility cart; parking grade, mesh and collision use one pose. */
export const VILLAGE_HANDCART = { x: 21, z: 24, yaw: 0.7 } as const;
/** The lighthouse tower: a stone shaft on the rock at the tip of Lantern Point. */
export const LIGHTHOUSE = { x: -324, z: 104, r: 3.3, h: 17, rockH: 12, rockR: 44 } as const;
/** The original keeper compound and stair use the same measurements for rendering, standing support and collision. */
export const LIGHTHOUSE_CONSTRUCTION = {
  shaftTop: 15.8, shaftTopRadius: 2.94,
  stairInner: 3.48, stairOuter: 4.84, stairStart: -Math.PI / 2,
  stairBottom: 0.38, stairTop: 15.8, stairSteps: 92, treadThickness: 0.14,
  railHeight: 1.05, galleryInner: 2.99, galleryOuter: 4.84,
  // A real stairwell through the upper gallery gives the final climb full headroom.
  galleryOpeningStart: 19 * Math.PI / 16, galleryOpeningEnd: 3 * Math.PI / 2,
  room: { radius: 2.7, floorTop: 0.46, ceilingBottom: 3.6, doorHalfWidth: 1.05, doorHeight: 2.8, wallSegments: 40 },
  house: { x: -6.4, z: 0, w: 8, d: 6.4, wallBase: 0.38, floorTop: 0.46, wallTop: 4.5, roofPitch: 0.86, roofTop: 8.87, wallThickness: 0.3, doorX: -0.65, doorHalfWidth: 1, doorHeight: 2.5, ceilingBottom: 3.55 },
} as const;
/**
 * The inland waystation's landward palisade: a low old stockade with an open gate on the arrival road.
 * Its ends remain open, so the forest is explored freely rather than fenced into a corridor.
 */
export const PALISADE = {
  points: [{ x: -101, z: -8 }, { x: -95, z: 2 }, { x: -92, z: 11 }, { x: -91.2, z: 24 }, { x: -93.5, z: 36 }, { x: -99, z: 48 }, { x: -108, z: 59 }] as V2[],
  /** The gap the track runs through, as a range of z along the near-vertical stretch of the wall. */
  gate: { x: -91.6, z0: 14.6, z1: 19.4 },
  tower: { x: -93.6, z: 10.6, yaw: 0.16 },
} as const;

/** The mostly empty landing strand; the inhabited waystation is inland beyond the woods. */
export const STRAND = { x: -258, z: 44, r: 40 } as const;
export const BORDER_SIGN = { x: 122, z: 70 };
export const BELL_TOWER = { x: -1, z: 4 };
export const WELL = { x: -6, z: 18 };
/** Shared human-scale well construction; its authored yaw lets camera and body collision follow the real posts and hood. */
export const WELL_CONSTRUCTION = {
  yaw: 0.22, postX: 1.05, postWidth: 0.16, postBottom: 0.2, postHeight: 2.3,
  beamWidth: 2.5, beamBottom: 2.35, beamHeight: 0.16, beamDepth: 0.16,
  hoodWidth: 3, hoodDepth: 1.8, hoodBottom: 2.48, hoodRise: 0.9,
} as const;
export const MILL_WHEEL = { x: -13.95, z: -8, r: 2.81 };
export const SPRING_POOL = { x: -8, z: -94, r: 8 };
export const SHRINE_PLATEAU = { x: -28, z: -102, r: 44, h: 7 };
export const OVERLOOK_BUMP = { x: -140, z: 30, r: 46, h: 4.8 };
export const LEDGE = { x: 122, z: -72, r: 12, h: 0 };

/** Bench and lantern positions for the environment art. */
export const LANTERNS: V2[] = [
  { x: -88, z: 20 }, { x: -74, z: 38 }, { x: -94, z: 62 }, { x: 2, z: 12 }, { x: 22, z: 4 }, { x: -20, z: -3 }, { x: -8, z: 32 }, { x: 14, z: 21 },
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
