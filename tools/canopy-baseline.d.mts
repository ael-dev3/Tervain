export function compareCanopyBaseline(before: unknown, after: unknown): {
  pass: boolean;
  reasons: string[];
  regressions: { label: string; metric?: 'detachedCards' | 'detachedClumps'; before: number; after: number }[];
};
