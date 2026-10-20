/** Authored orchard instance scale range; shared with local-space crown reach checks. */
export const ORCHARD_SCALE = { min: 0.9, span: 0.25 } as const;
export const ORCHARD_MAX_SCALE = ORCHARD_SCALE.min + ORCHARD_SCALE.span;
/** Horizon conifers at the realm's edge, the largest trees planted; shared with local-space foliage reach checks. */
export const HORIZON_CONIFER_SCALE = { min: 1.05, span: 1.2 } as const;
export const CONIFER_MAX_SCALE = HORIZON_CONIFER_SCALE.min + HORIZON_CONIFER_SCALE.span;
/** Mature palm instance scale range (young palms are smaller); shared with local-space foliage reach checks. */
export const PALM_SCALE = { min: 0.96, span: 0.24 } as const;
export const PALM_MAX_SCALE = PALM_SCALE.min + PALM_SCALE.span;
