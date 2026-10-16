import { expect, it } from 'vitest';
import { compareCanopyBaseline } from '../../tools/canopy-baseline.mjs';
const report = (counts: Record<string, number>) => ({ complete: true, gap: .75, expectedTrees: Object.keys(counts).length,
  scope: 'near source geometry', summary: { leafless: 0, trees: Object.keys(counts).length, candidates: Object.values(counts).reduce((n, v) => n + v, 0) },
  trees: Object.entries(counts).map(([label, n]) => ({ label, leafless: false, candidates: Array.from({ length: n }, () => ({})) })) });
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

const foliage = (flags: Record<string, boolean>) => {
  const r = report(Object.fromEntries(Object.keys(flags).map(label => [label, 0])));
  for (const t of r.trees) t.leafless = flags[t.label]!;
  r.summary.leafless = r.trees.filter(t => t.leafless).length;
  return r;
};
it('rejects newly missing foliage even with no whole-crown candidates', () => {
  const result = compareCanopyBaseline(foliage({ a: false }), foliage({ a: true }));
  expect(result.pass).toBe(false);
  expect(result.reasons).toContain('Tree lost foliage: a');
});
it('does not hide a newly bare tree behind foliage restored on another tree', () => {
  expect(compareCanopyBaseline(foliage({ a: true, b: false }), foliage({ a: false, b: true })).pass).toBe(false);
});
it('accepts unchanged intentional leafless trees and restored foliage', () => {
  const before = foliage({ a: true, b: false });
  expect(compareCanopyBaseline(before, before).pass).toBe(true);
  expect(compareCanopyBaseline(before, foliage({ b: false, a: false })).pass).toBe(true);
});
it('rejects missing leafless flags and inconsistent leafless summary totals', () => {
  const before = foliage({ a: false });
  const missing = structuredClone(before);
  delete (missing.trees[0] as { leafless?: boolean }).leafless;
  expect(compareCanopyBaseline(before, missing).pass).toBe(false);
  expect(compareCanopyBaseline(before, { ...before, summary: { ...before.summary, leafless: 1 } }).pass).toBe(false);
});
