/** Prepared furniture sizes (width, height, depth; metres, front towards +z). Written by tools/prepare-meshy-furniture.py. */
export const FURNITURE_SIZES = {
  altar: [1.1412, 1.05, 0.75],
  bed: [2.05, 1.05, 1.1186],
  bookshelf: [1.0729, 1.85, 0.4],
  bunk: [2.05, 1.75, 1.1732],
  chair: [0.5, 0.98, 0.6595],
  chest: [0.95, 0.58, 0.52],
  counter: [1.4722, 1.0, 0.5432],
  cupboard: [1.0, 1.85, 0.6815],
  desk: [1.0817, 1.1, 0.7424],
  loom: [1.9456, 1.9, 0.5651],
  oven: [1.35, 1.35, 1.5599],
  rack: [1.3253, 1.75, 0.3791],
  sacks: [1.0506, 0.7, 0.85],
  shelf: [1.5556, 1.65, 0.38],
  stool: [0.4416, 0.46, 0.4366],
  table: [1.7, 0.78, 0.9342],
  workbench: [1.6975, 0.9, 0.773],
} as const satisfies Record<string, readonly [number, number, number]>;

export type FurnitureId = keyof typeof FURNITURE_SIZES;
