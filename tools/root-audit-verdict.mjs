/** Candidate counts only have meaning after a complete root population audit. */
export function rootAuditVerdict(audit, baselineCount) {
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
  const pass = baselineCount === undefined || count <= baselineCount;
  return { pass, rootCandidates: count, ...(pass ? {} : { reason: 'root-regression' }) };
}
