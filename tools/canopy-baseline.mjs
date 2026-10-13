/** Compare geometric crown candidates per registered tree; a global decrease must not hide a newly affected tree. */
export function compareCanopyBaseline(before, after) {
  const reasons = [], regressions = [];
  const read = (report, name) => {
    const trees = new Map();
    if (report?.complete !== true || !Number.isFinite(report.gap) || !(report.gap > 0) ||
        !Number.isInteger(report.expectedTrees) || report.expectedTrees < 1 || !Array.isArray(report.trees) ||
        report.trees.length !== report.expectedTrees || report.summary?.trees !== report.expectedTrees) {
      reasons.push(`${name}: incomplete or invalid population`); return trees;
    }
    let total = 0;
    for (const tree of report.trees) {
      if (typeof tree.label !== 'string' || !tree.label || trees.has(tree.label) || !Array.isArray(tree.candidates)) {
        reasons.push(`${name}: invalid or duplicate tree label`); continue;
      }
      trees.set(tree.label, tree.candidates.length); total += tree.candidates.length;
    }
    if (total !== report.summary.candidates) reasons.push(`${name}: candidate summary mismatch`);
    return trees;
  };
  const oldTrees = read(before, 'baseline'), newTrees = read(after, 'current');
  if (before?.gap !== after?.gap || before?.expectedTrees !== after?.expectedTrees || before?.scope !== after?.scope)
    reasons.push('Audit population or scope changed');
  for (const [label, count] of newTrees) {
    const previous = oldTrees.get(label);
    if (previous === undefined) reasons.push(`Tree absent from baseline: ${label}`);
    else if (count > previous) regressions.push({ label, before: previous, after: count });
  }
  for (const label of oldTrees.keys()) if (!newTrees.has(label)) reasons.push(`Tree missing from current audit: ${label}`);
  return { pass: reasons.length === 0 && regressions.length === 0, reasons, regressions };
}
