/** Recorded gates must fail missing/invalid measurements rather than treating null as no regression. */
export function shimmerVerdict(status, report, baselineScore) {
  const summary = report?.summary, score = summary?.sparkleShare;
  if (status !== 0) return { score: null, pass: false, reason: 'analysis-failed' };
  if (!summary || !Number.isFinite(score) || score < 0 || score > 1 ||
      !Number.isInteger(summary.usableFrames) || summary.usableFrames < 3) {
    return { score: null, pass: false, reason: 'invalid-measurement' };
  }
  if (!Number.isFinite(summary.alignmentShare) || summary.alignmentShare < .8 || summary.alignmentShare > 1) {
    return { score, pass: false, reason: 'insufficient-alignment' };
  }
  const compared = baselineScore !== undefined && baselineScore !== null;
  if (compared && (!Number.isFinite(baselineScore) || baselineScore < 0 || baselineScore > 1)) {
    return { score, pass: false, reason: 'invalid-baseline' };
  }
  const pass = !compared || score <= baselineScore * 1.05;
  return { score, pass, compared, ...(pass ? {} : { reason: 'sparkle-regression' }) };
}
