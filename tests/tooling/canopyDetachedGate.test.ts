import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

const report = (cards = 0, clumps = 0, reach = 1.5) => ({ complete: true, lod: 0, alpha: false, gap: .75,
  expectedTrees: 1, expectedSpecies: { oak: 1 }, speciesComplete: true, scope: 'fixture crown',
  summary: { trees: 1, candidates: 0, woodReach: reach, detachedCards: cards, detachedClumps: clumps },
  trees: [{ label: 'oak-a', candidates: [], detachedCards: cards, detachedClumps: clumps }] });

it.each([
  ['clean absolute check', report(), undefined, true],
  ['detached cards without whole-crown candidates', report(2, 1), undefined, false],
  ['new detached cards against a baseline', report(2, 1), report(), false],
  ['unchanged nonzero baseline', report(2, 1), report(2, 1), true],
  ['improving detached baseline', report(1, 1), report(2, 1), true],
  ['changed baseline reach', report(), report(0, 0, 3), false],
] as const)('%s', (_name, current, baseline, pass) => {
  const dir = mkdtempSync(join(tmpdir(), 'canopy-detached-gate-'));
  try {
    for (const file of ['audit-canopy.mjs', 'canopy-baseline.mjs']) copyFileSync(`tools/${file}`, join(dir, file));
    const driver = join(dir, 'driver.mjs'), out = join(dir, 'report.json');
    writeFileSync(driver, `export async function openPage(){return {eval:async s=>s.includes('auditCanopies(')?${JSON.stringify(current)}:true,wait:async()=>{},close(){}}}`);
    const args = [join(dir, 'audit-canopy.mjs'), '--driver', driver, '--out', out];
    if (baseline) { const file = join(dir, 'baseline.json'); writeFileSync(file, JSON.stringify(baseline)); args.push('--baseline', file); }
    const run = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 10000 });
    expect(run.error).toBeUndefined(); expect(run.status).toBe(pass ? 0 : 1);
    expect(JSON.parse(readFileSync(out, 'utf8')).pass).toBe(pass);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('rejects a served report that does not confirm the requested wood reach', () => {
  const dir = mkdtempSync(join(tmpdir(), 'canopy-reach-gate-'));
  try {
    for (const file of ['audit-canopy.mjs', 'canopy-baseline.mjs']) copyFileSync(`tools/${file}`, join(dir, file));
    const driver = join(dir, 'driver.mjs'), out = join(dir, 'report.json');
    writeFileSync(driver, `export async function openPage(){return {eval:async s=>s.includes('auditCanopies(')?${JSON.stringify(report(0, 0, 3))}:true,wait:async()=>{},close(){}}}`);
    const run = spawnSync(process.execPath, [join(dir, 'audit-canopy.mjs'), '--driver', driver, '--out', out], { encoding: 'utf8', timeout: 10000 });
    expect(run.status).toBe(1); expect(run.stderr).toContain('does not confirm requested detached-wood reach'); expect(existsSync(out)).toBe(false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
