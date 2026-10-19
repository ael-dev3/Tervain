export interface FrozenThresholds { bright?: number; jump?: number }
export interface VarianceSummary { pixels: number; meanVariance: number; p95Variance: number; maxVariance: number; varyingPixels: number }
export interface FrozenMetricResult {
  frames: number;
  thresholds: { brightLuminance: number; jumpAbove: number };
  allPixels: VarianceSummary;
  everBrightPixels: VarianceSummary | null;
  brightTransitions: number;
  allTransitions: number;
  perFrame: Array<{ frame: number; brightPixels: number; brightJumps: number; allJumps: number }>;
}
export class FrozenGrassMetric {
  constructor(width: number,height: number,options?: FrozenThresholds);
  add(rgb: ArrayLike<number>): void;
  result(): FrozenMetricResult;
}
export function compareFrozenFrames(a: ArrayLike<number>,b: ArrayLike<number>,options?: FrozenThresholds): {
  pixels: number; changedPixels: number; luminanceJumps: number; brightUnion: number; brightIntersection: number;
  brightMembershipChanges: number; brightJaccard: number | null;
};
