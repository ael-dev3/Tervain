/** Authored orchard instance scale range; shared with local-space crown reach checks. */
export const ORCHARD_SCALE = { min: 0.9, span: 0.25 } as const;
export const ORCHARD_MAX_SCALE = ORCHARD_SCALE.min + ORCHARD_SCALE.span;
