export interface ShimmerSample { time?: number; validPixels: number; validShare: number; sparklePixels: number; sparkleShare: number | null; shimmerMean: number | null; shimmerP95: number | null; exposurePrevious: number; exposureNext: number; }
export function frameShimmer(previous: Uint8Array, current: Uint8Array, next: Uint8Array, width: number, height: number, options?: { block?: number; searchRadius?: number; threshold?: number; maxCost?: number }): ShimmerSample;
export function summarizeShimmer(samples: ShimmerSample[]): { frames: number; usableFrames: number; shimmerMean: number | null; shimmerFrameP95: number | null; sparkleShare: number | null; alignmentShare: number; peaks: ShimmerSample[] };

export function evaluateShimmer(report: { summary: ReturnType<typeof summarizeShimmer> }, limits?: { minFrames?: number; minAlignment?: number; maxSparkle?: number; maxResidual?: number }): { pass: boolean; calibrated: boolean; failures: string[]; limits: object };
