import { expect, it } from 'vitest';
import { compareCanopyBaseline } from '../../tools/canopy-baseline.mjs';
const report = (counts: Record<string, number>) => ({ complete: true, gap: .75, expectedTrees: Object.keys(counts).length,
  scope: 'near source geometry', summary: { trees: Object.keys(counts).length, candidates: Object.values(counts).reduce((n, v) => n + v, 0), woodReach: 1.5, detachedCards: 0, detachedClumps: 0 },
  trees: Object.entries(counts).map(([label, n]) => ({ label, candidates: Array.from({ length: n }, () => ({})), detachedCards: 0, detachedClumps: 0 })) });
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

const detached = (counts: Record<string, [number, number]>) => {
  const r = report(Object.fromEntries(Object.keys(counts).map(label => [label, 0])));
  for (const t of r.trees) [t.detachedCards, t.detachedClumps] = counts[t.label]!;
  r.summary.detachedCards = r.trees.reduce((n, t) => n + t.detachedCards, 0);
  r.summary.detachedClumps = r.trees.reduce((n, t) => n + t.detachedClumps, 0);
  return r;
};
it('rejects detached card and clump regressions with unchanged whole-crown candidates', () => {
  const result = compareCanopyBaseline(detached({ a: [0, 0] }), detached({ a: [2, 1] }));
  expect(result.pass).toBe(false);
  expect(result.regressions).toEqual([{ label: 'a', metric: 'detachedCards', before: 0, after: 2 }, { label: 'a', metric: 'detachedClumps', before: 0, after: 1 }]);
});
it('rejects a new detached tree even when aggregate detached counts improve', () => {
  expect(compareCanopyBaseline(detached({ a: [10, 4], b: [0, 0] }), detached({ a: [0, 0], b: [2, 1] })).pass).toBe(false);
});
it('rejects more cards in an existing clump and more clumps with the same card count', () => {
  const before = detached({ a: [4, 1] });
  expect(compareCanopyBaseline(before, detached({ a: [5, 1] })).pass).toBe(false);
  expect(compareCanopyBaseline(before, detached({ a: [4, 2] })).pass).toBe(false);
});
it('accepts unchanged or improved detached counts with matching parameters', () => {
  const before = detached({ a: [10, 4], b: [2, 1] });
  expect(compareCanopyBaseline(before, before).pass).toBe(true);
  expect(compareCanopyBaseline(before, detached({ b: [0, 0], a: [8, 3] })).pass).toBe(true);
});
it('rejects changed wood reach and malformed detached measurements', () => {
  const before = detached({ a: [2, 1] });
  expect(compareCanopyBaseline(before, { ...before, summary: { ...before.summary, woodReach: 3 } }).pass).toBe(false);
  for (const value of [undefined, -1, .5, NaN]) {
    const after = detached({ a: [2, 1] });
    (after.trees[0] as unknown as { detachedCards: unknown }).detachedCards = value;
    expect(compareCanopyBaseline(before, after).pass).toBe(false);
  }
  expect(compareCanopyBaseline(before, { ...before, summary: { ...before.summary, detachedCards: 0 } }).pass).toBe(false);
});
