/**
 * The holy spring above Rillford. The spring rises at the head of the main stream, on the shoulder of the hill, and
 * runs two ways: most of it down the stream's cascade toward the sluice, and a little down a short fall into a stone-
 * edged pool on the shrine side. The pool is a real basin: a level floor, a cut bank under the fall, and a low lip
 * on its downhill side that holds the water (the hillside falls away westward, so without a lip there is no pool).
 *
 * Pure geometry, shared by the terrain (which cuts the basin) and the water (which fills it).
 */

export const SPRING_SOURCE = { x: -5, z: -90 } as const;

export const SPRING_BASIN = {
  x: -10.5,
  z: -93.2,
  /** The still water's edge, roughly (the real shoreline is wherever the ground meets the level). */
  r: 3.3,
  /** Water level and the deepest floor (m). */
  level: 8.3,
  floor: 7.35,
  /** The lip's crest, its radius, and where the reshaped ground has fully returned to the hillside. */
  lip: 8.55,
  lipR: 4.1,
  blendR: 5.6,
} as const;

/** The short fall from the source into the pool, as a course for the water. */
export const SPRING_RILL = [
  { x: SPRING_SOURCE.x, z: SPRING_SOURCE.z },
  { x: -6.6, z: -91.0 },
  { x: -7.9, z: -91.9 },
  { x: -9.1, z: -92.6 },
] as const;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * The ground after the basin is shaped into the hillside (`ground` is the hillside here), and the depth of still
 * water standing on it. Inside the pool the floor is a shallow bowl; the lip rises a little above the water; beyond
 * it the ground eases back to the hillside, cut down where the hill stands higher and built up where it falls away.
 */
export function springBasinGround(x: number, z: number, ground: number): { ground: number; water: number } {
  const b = SPRING_BASIN;
  const r = Math.hypot(x - b.x, z - b.z);
  if (r >= b.blendR) return { ground, water: 0 };
  let shaped: number;
  if (r <= b.r) {
    // A bowl: deepest in the middle, meeting the waterline a little inside the lip.
    const t = r / b.r;
    shaped = b.floor + (b.level - 0.04 - b.floor) * t * t;
  } else if (r <= b.lipR) {
    shaped = b.level - 0.04 + (b.lip - b.level + 0.04) * smoothstep(b.r, b.lipR, r);
  } else {
    // From the lip crest back to the hillside: a cut bank uphill, a low earthen shoulder downhill.
    shaped = b.lip + (ground - b.lip) * smoothstep(b.lipR, b.blendR, r);
  }
  // Uneven by a hand's breadth, so the stone-edged lip never reads as a lathe-turned ring.
  const wobble = 0.05 * Math.sin(x * 2.1 + z * 0.7) * Math.sin(z * 1.7 - x * 0.4) * smoothstep(b.r * 0.6, b.lipR, r) * (1 - smoothstep(b.lipR, b.blendR, r));
  const final = shaped + wobble;
  return { ground: final, water: Math.max(0, b.level - final) };
}
