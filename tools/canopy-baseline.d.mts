export function compareCanopyBaseline(before: unknown, after: unknown): {
  pass: boolean;
  reasons: string[];
  regressions: { label: string; before: number; after: number }[];
};
