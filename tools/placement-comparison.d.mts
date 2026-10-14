export function summarizePlacementComparison(before: unknown, after: unknown, roots: unknown): {
 summary: Record<string, unknown>; rootSummary: Record<string, unknown>;
 changes: {removed: unknown[]; added: unknown[]; candidateChanges: unknown[]};
 regions: {name: string; x: number; z: number; radius: number; before: {checks: number; candidates: number}; after: {checks: number; candidates: number}}[];
};
