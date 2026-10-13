import { expect, it } from 'vitest';
import { compareCanopyBaseline } from '../../tools/canopy-baseline.mjs';
const report = (counts: Record<string, number>) => ({ complete: true, gap: .75, expectedTrees: Object.keys(counts).length,
  scope: 'near source geometry', summary: { trees: Object.keys(counts).length, candidates: Object.values(counts).reduce((n, v) => n + v, 0) },
  trees: Object.entries(counts).map(([label, n]) => ({ label, candidates: Array.from({ length: n }, () => ({})) })) });
it('rejects a new affected tree even when the global count decreases', () => {
  expect(compareCanopyBaseline(report({ a: 4, b: 0 }), report({ a: 0, b: 1 }))).toEqual({ pass: false, reasons: [], regressions: [{ label: 'b', before: 0, after: 1 }] });
});
it('accepts genuine per-tree improvement and reordered labels', () => {
  expect(compareCanopyBaseline(report({ a: 4, b: 1 }), report({ b: 0, a: 3 })).pass).toBe(true);
});
it('rejects an exchanged tree population with equal size and no candidates', () => {
  expect(compareCanopyBaseline(report({ a: 0, b: 0 }), report({ a: 0, c: 0 })).pass).toBe(false);
});
for (const field of ['complete', 'gap', 'expectedTrees', 'scope'] as const) it(`rejects changed ${field}`, () => {
  const before = report({ a: 0 }), after = { ...before, [field]: field === 'complete' ? false : field === 'scope' ? 'mid source geometry' : 2 };
  expect(compareCanopyBaseline(before, after).pass).toBe(false);
});
it('rejects duplicate labels and inconsistent candidate summaries', () => {
  const before = report({ a: 0, b: 0 });
  const duplicate = { ...before, trees: [before.trees[0], before.trees[0]] };
  expect(compareCanopyBaseline(before, duplicate).pass).toBe(false);
  expect(compareCanopyBaseline(before, { ...before, summary: { trees: 2, candidates: 1 } }).pass).toBe(false);
});
it('rejects missing, truncated and empty reports', () => {
  const before = report({ a: 0 });
  for (const after of [null, {}, { ...before, trees: [] }, report({})]) expect(compareCanopyBaseline(before, after).pass).toBe(false);
});
