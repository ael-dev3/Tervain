import fs from 'node:fs';
/** An omitted reference starts a baseline run; an explicitly requested reference must be readable metrics. */
export function readVisualBaseline(filename) {
  if (filename === undefined) return null;
  if (typeof filename !== 'string' || !filename.trim()) throw new Error('Visual-gate baseline requires a metrics file');
  const baseline = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline) ||
      !baseline.checks || typeof baseline.checks !== 'object' || Array.isArray(baseline.checks))
    throw new Error('Visual-gate baseline must be a metrics object with checks');
  return baseline;
}
