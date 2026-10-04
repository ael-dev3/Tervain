/** Metre-scale calibration from the supplied Walking/Running skinned sole trajectories.
 * These are inferred gait speeds, not root-motion metadata supplied by the author. */
export const HERO_WALK_SPEED = 1.65;
export const HERO_RUN_SPEED = 5.85;
export const HERO_WALK_CYCLE = HERO_WALK_SPEED * (25 / 24);
export const HERO_RUN_CYCLE = HERO_RUN_SPEED * (2 / 3);
export const HERO_RUN_THRESHOLD = (HERO_WALK_SPEED + HERO_RUN_SPEED) / 2;
export const HERO_GUARD_SPEED = HERO_WALK_SPEED * 0.65;
