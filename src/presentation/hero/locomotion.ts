/** Metre-scale calibration from the supplied Walking/Running skinned sole trajectories.
 * These are inferred gait speeds, not root-motion metadata supplied by the author. */
export const HERO_WALK_SPEED = 1.65;
export const HERO_RUN_SPEED = 5.85;
/**
 * Ground covered per gait cycle. Measured on the live build with real keys (A120), the planted foot still crept forward
 * in stance, 5-11% of the body's speed walking and about 9% running: the clips' soles sweep a little less ground per
 * cycle than these allowed. Shortened to match (walk 8%, run 5.5%), the cadence fits the ground covered.
 */
export const HERO_STRIDE_FIT = { walk: 0.92, run: 0.945 } as const;
export const HERO_WALK_CYCLE = HERO_WALK_SPEED * (25 / 24) * HERO_STRIDE_FIT.walk;
export const HERO_RUN_CYCLE = HERO_RUN_SPEED * (2 / 3) * HERO_STRIDE_FIT.run;
export const HERO_RUN_THRESHOLD = (HERO_WALK_SPEED + HERO_RUN_SPEED) / 2;
export const HERO_GUARD_SPEED = HERO_WALK_SPEED * 0.65;
