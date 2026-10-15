export interface SourceTarget {
  label: string; species?: string; kind?: string; lod?: number;
  wood: unknown; leaves: unknown; [metadata: string]: unknown;
}
export interface SourceMesh { name: string; geometry: unknown; material?: unknown }
export interface MissingSource { label: string; lod: number; leavesPresent: boolean }
export function canopySourceTargets(roots: readonly SourceTarget[], native: readonly SourceTarget[],
  families: ReadonlyMap<string, readonly SourceMesh[]>, lod: number, cutoutSampler: (material: unknown) => unknown):
  { targets: SourceTarget[]; missing: MissingSource[] };
export function crownCoverageComplete(report: {
  expectedTrees: number; missing: readonly MissingSource[]; transitionSamples: number;
  levels: readonly { lod: number; complete: boolean; expectedTrees: number; coveredTrees: number; summary: { trees: number } }[];
}): boolean;
