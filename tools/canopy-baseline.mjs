/** Compare whole-crown and detached-card/clump candidates per tree; global improvements must not hide a new regression. */
export function compareCanopyBaseline(before, after) {
  const reasons = [], regressions = [], detachedMetrics = ['detachedCards', 'detachedClumps'];
  const read = (report, name) => {
    const trees = new Map();
    if (report?.complete !== true || !Number.isFinite(report.gap) || !(report.gap > 0) ||
        !Number.isInteger(report.expectedTrees) || report.expectedTrees < 1 || !Array.isArray(report.trees) ||
        report.trees.length !== report.expectedTrees || report.summary?.trees !== report.expectedTrees ||
        !Number.isFinite(report.summary?.woodReach) || !(report.summary.woodReach > 0)) {
      reasons.push(`${name}: incomplete or invalid population`); return trees;
    }
    let total = 0; const detachedTotals = { detachedCards: 0, detachedClumps: 0 };
    for (const tree of report.trees) {
      if (typeof tree.label !== 'string' || !tree.label || trees.has(tree.label) || !Array.isArray(tree.candidates)) {
        reasons.push(`${name}: invalid or duplicate tree label`); continue;
      }
      if (detachedMetrics.some(metric => !Number.isInteger(tree[metric]) || tree[metric] < 0) || tree.detachedClumps > tree.detachedCards) {
        reasons.push(`${name}: invalid detached counts for ${tree.label}`); continue;
      }
      trees.set(tree.label, { candidates: tree.candidates.length, detachedCards: tree.detachedCards, detachedClumps: tree.detachedClumps });
      total += tree.candidates.length;
      for (const metric of detachedMetrics) detachedTotals[metric] += tree[metric];
    }
    if (total !== report.summary.candidates) reasons.push(`${name}: candidate summary mismatch`);
    for (const metric of detachedMetrics) if (detachedTotals[metric] !== report.summary[metric]) reasons.push(`${name}: ${metric} summary mismatch`);
    return trees;
  };
  const oldTrees = read(before, 'baseline'), newTrees = read(after, 'current');
  if (before?.gap !== after?.gap || before?.expectedTrees !== after?.expectedTrees || before?.scope !== after?.scope || before?.summary?.woodReach !== after?.summary?.woodReach)
    reasons.push('Audit population or scope changed');
  for (const [label, count] of newTrees) {
    const previous = oldTrees.get(label);
    if (previous === undefined) reasons.push(`Tree absent from baseline: ${label}`);
    else {
      if (count.candidates > previous.candidates) regressions.push({ label, before: previous.candidates, after: count.candidates });
      for (const metric of detachedMetrics) if (count[metric] > previous[metric]) regressions.push({ label, metric, before: previous[metric], after: count[metric] });
    }
  }
  for (const label of oldTrees.keys()) if (!newTrees.has(label)) reasons.push(`Tree missing from current audit: ${label}`);
  return { pass: reasons.length === 0 && regressions.length === 0, reasons, regressions };
}
