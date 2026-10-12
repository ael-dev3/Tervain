import type { BuildingSpec } from './layout';
import { HOUSEHOLDS } from './furniture';

/**
 * A village house's yard (A132): the things of its household's trade, kept outside against its walls or in a small
 * yard beside it, so each home reads as its own from the lane. Shared by the drawing and the colliders.
 *
 * Every placement is in the building's own frame (front wall at +d/2, the door in it; east is +x), clear of the door's
 * approach, the front windows and the props every house already keeps (the woodpile right of the door, a barrel and a
 * sack left of it, a rain butt and a crate at the back corners).
 */
export type YardKind =
  | 'bench' | 'clothPost' | 'clothLine'
  | 'logStack' | 'chopBlock' | 'sawhorse'
  | 'herbBed' | 'herbRack' | 'skeps'
  | 'hideFrame' | 'meatRack'
  | 'fence' | 'hay' | 'trough' | 'cartWheel' | 'tools'
  | 'barrelStack' | 'vat' | 'sacks';

export interface YardProp {
  kind: YardKind;
  /** Centre on the ground, building-local. */
  x: number;
  z: number;
  /** Turn about +y from the building's frame. */
  yaw: number;
  /** Half extents of its footprint in its own frame, and its height. */
  hw: number;
  hd: number;
  h: number;
  /** Stands in the way: anything a walker would bump into gets a collider. */
  solid: boolean;
}

const P = (kind: YardKind, x: number, z: number, yaw: number, hw: number, hd: number, h: number, solid = h >= 0.4): YardProp =>
  ({ kind, x, z, yaw, hw, hd, h, solid });

/** The props of each trade, for a house of the given size. */
function yardOf(trade: (typeof HOUSEHOLDS)[string], b: BuildingSpec): YardProp[] {
  const ew = b.w / 2, hd = b.d / 2;
  switch (trade) {
    case 'weaver':
      return [
        // A bench along the west wall with her baskets of yarn, and a line of dyed cloth drying east of the house.
        P('bench', -ew - 0.85, 1.0, Math.PI / 2, 0.85, 0.22, 0.48),
        P('clothPost', ew + 1.7, -1.8, 0, 0.09, 0.09, 2.05),
        P('clothPost', ew + 1.7, 1.4, 0, 0.09, 0.09, 2.05),
        P('clothLine', ew + 1.7, -0.2, Math.PI / 2, 1.5, 0.05, 1.95, false),
      ];
    case 'woodcutter':
      return [
        // A long stack of split logs along the east wall, the block he splits on before it and a sawhorse behind the house.
        P('logStack', ew + 0.95, -0.2, Math.PI / 2, 1.5, 0.36, 0.9),
        P('chopBlock', ew + 1.5, hd + 0.9, 0.4, 0.3, 0.3, 0.52),
        P('sawhorse', 0.3, -hd - 1.1, 0.12, 0.6, 0.32, 0.85),
      ];
    case 'herbalist':
      return [
        // A small fenced herb bed to the east, a rack of herbs drying against the back wall and her bee skeps.
        P('herbBed', ew + 1.55, 0.5, 0, 0.95, 1.25, 0.45),
        P('herbRack', 0, -hd - 0.85, 0, 0.9, 0.3, 1.7),
        P('skeps', -ew - 0.9, -hd + 0.9, -Math.PI / 2, 0.6, 0.28, 0.95),
      ];
    case 'hunter':
      return [
        // A hide stretched on a frame behind the west corner, and a rack of meat drying on the east side.
        P('hideFrame', -ew - 1.35, -hd + 0.3, -0.35, 0.85, 0.12, 1.85),
        P('meatRack', ew + 1.05, -0.5, Math.PI / 2, 0.8, 0.45, 1.6),
      ];
    case 'farmer':
      return [
        // A fenced yard on the east side, hay and a trough in it; a cart wheel and his tools against the west wall.
        P('fence', ew + 2.05, -hd + 0.3, 0, 1.45, 0.06, 0.95),
        P('fence', ew + 3.5, -0.9, Math.PI / 2, 1.8, 0.06, 0.95),
        P('fence', ew + 2.05, 0.9, 0, 0.55, 0.06, 0.95), // the yard's front, with its gap by the house
        P('fence', ew + 3.05, 0.9, 0, 0.45, 0.06, 0.95),
        P('hay', ew + 2.6, -hd + 1.05, 0.2, 0.5, 0.36, 0.72),
        P('hay', ew + 1.5, -hd + 1.0, -0.15, 0.5, 0.36, 0.72),
        P('trough', ew + 3.0, -0.3, Math.PI / 2, 0.5, 0.2, 0.38),
        P('cartWheel', -ew - 0.75, 1.3, Math.PI / 2, 0.58, 0.12, 1.12),
        P('tools', -ew - 0.68, -1.1, Math.PI / 2, 0.35, 0.12, 1.6, false),
      ];
    case 'brewer':
      return [
        // Casks stacked against the east wall, and the mash vat with its paddle and sacks of malt to the west.
        P('barrelStack', ew + 1.0, -0.6, Math.PI / 2, 1.0, 0.45, 1.45),
        P('vat', -ew - 1.25, -0.9, 0, 0.68, 0.68, 0.95),
        P('sacks', -ew - 1.1, 0.75, 0.1, 0.5, 0.3, 0.55),
      ];
  }
}

/** The yard of a village house (empty for every other building). */
export function houseYard(b: BuildingSpec): YardProp[] {
  if (b.kind !== 'house') return [];
  const trade = HOUSEHOLDS[b.id];
  return trade ? yardOf(trade, b) : [];
}

/** A yard point from the building's frame into the world, as the building itself turns. */
export function yardToWorld(b: BuildingSpec, x: number, z: number) {
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
  return { x: b.x + x * c + z * s, z: b.z - x * s + z * c };
}
