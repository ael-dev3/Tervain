import {compareCanopyBaseline} from './canopy-baseline.mjs';

/** Gate both whole-crown connectivity and leaf-to-wood reach, without trading one tree for another. */
export function canopyGate(report, baseline) {
  const reasons = [], regressions = [];
  const read = (r, name) => {
    const trees = new Map();
    if (!(Number.isFinite(r?.summary?.woodReach) && r.summary.woodReach > 0) || !Array.isArray(r?.trees)) {
      reasons.push(`${name}: missing wood-reach coverage`); return trees;
    }
    const totals = {detachedCards: 0, detachedClumps: 0};
    for (const tree of r.trees) {
      if (typeof tree.label !== 'string' || !tree.label || trees.has(tree.label)) {
        reasons.push(`${name}: invalid or duplicate tree label`); continue;
      }
      const counts = tree.leafless === true ? {...tree, detachedCards: tree.detachedCards ?? 0, detachedClumps: tree.detachedClumps ?? 0} : tree;
      trees.set(tree.label, counts);
      for (const field of Object.keys(totals)) {
        if (!Number.isInteger(counts[field]) || counts[field] < 0) reasons.push(`${name}: invalid ${field}`);
        else totals[field] += counts[field];
      }
      if (counts.detachedClumps > counts.detachedCards) reasons.push(`${name}: inconsistent detached counts`);
    }
    for (const field of Object.keys(totals)) if (totals[field] !== r.summary[field]) reasons.push(`${name}: ${field} summary mismatch`);
    return trees;
  };
  const current = read(report, 'current');
  // Reuse the population, scope and connectivity validation even for an absolute gate.
  const connectivity = compareCanopyBaseline(baseline ?? report, report);
  reasons.push(...connectivity.reasons);
  if (!connectivity.pass) reasons.push('Crown connectivity gate failed');
  if (baseline) {
    const previous = read(baseline, 'baseline');
    if (baseline.summary?.woodReach !== report.summary?.woodReach) reasons.push('Wood-reach threshold changed');
    for (const [label, tree] of current) for (const field of ['detachedCards', 'detachedClumps']) {
      if (previous.has(label) && tree[field] > previous.get(label)[field]) regressions.push({label, field, before: previous.get(label)[field], after: tree[field]});
    }
  } else if (report?.summary?.candidates !== 0 || report?.summary?.detachedCards !== 0 || report?.summary?.detachedClumps !== 0) {
    reasons.push('Unsupported foliage remains');
  }
  return {pass: reasons.length === 0 && regressions.length === 0, reasons, regressions};
}
