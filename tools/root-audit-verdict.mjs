/** Candidate counts only have meaning after a complete root population audit. */
export function rootAuditVerdict(audit, baselineCount, baselineLabels) {
  const roots = Array.isArray(audit?.checks) ? audit.checks.filter(check => check?.kind === 'root') : null;
  const count = roots?.filter(check => check.candidate).length;
  if (!audit || audit.complete !== true || !Array.isArray(roots) || roots.length === 0 ||
      !Number.isInteger(audit.expectedRoots) || audit.expectedRoots !== roots.length ||
      roots.some(check => typeof check.candidate !== 'boolean') || audit.summary?.roots !== roots.length || audit.furnitureReady !== true) {
    return { pass: false, reason: 'incomplete-root-coverage', rootCandidates: count ?? null };
  }
  if (baselineCount !== undefined && (!Number.isInteger(baselineCount) || baselineCount < 0)) {
    return { pass: false, reason: 'invalid-baseline', rootCandidates: count };
  }
  // Two-argument calls retain the historical count-only API; the visual gate supplies labels explicitly.
  if (baselineLabels !== undefined) {
    if (baselineCount === undefined || !Array.isArray(baselineLabels) || baselineLabels.length !== baselineCount ||
        baselineLabels.some(label => typeof label !== 'string' || !label.trim()) || new Set(baselineLabels).size !== baselineLabels.length)
      return { pass: false, reason: 'invalid-baseline', rootCandidates: count };
    const accepted = new Set(baselineLabels);
    if (roots.some(check => check.candidate && !accepted.has(check.label)))
      return { pass: false, reason: 'new-root-candidate', rootCandidates: count };
  }
  const pass = baselineCount === undefined || count <= baselineCount;
  return { pass, rootCandidates: count, ...(pass ? {} : { reason: 'root-regression' }) };
}

/** Zero-candidate legacy references are safe; positive references need all candidate labels, not a worst-eight display. */
export function rootBaselineLabels(placement) {
  return placement?.rootCandidateLabels ?? (placement?.rootCandidates === 0 ? [] : null);
}
