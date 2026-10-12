import { it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

it('records browser launch failure for every profile and exits without a PASS receipt', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'tervain-gate-launch-check-'));
  try {
    writeFileSync(join(fixture, 'play-gate.mjs'), readFileSync('tools/play-gate.mjs'));
    writeFileSync(join(fixture, 'cdp.mjs'), 'export async function openPage() { throw new Error("browser did not start"); }');
    const out = join(fixture, 'reports');
    const run = spawnSync(process.execPath, [join(fixture, 'play-gate.mjs'),
      '--url', 'http://127.0.0.1:1/', '--against', 'none', '--tag', 'launch-failure',
      '--out', out, '--video', 'false'], { encoding: 'utf8', timeout: 10_000 });
    expect(run.error).toBeUndefined();
    expect(run.status).toBe(1);
    expect(run.stdout).not.toContain('play-gate: PASS');
    const report = JSON.parse(readFileSync(join(out, 'launch-failure.json'), 'utf8'));
    expect(report.pass).toBe(false);
    expect(report.results.map((r: { name: string }) => r.name)).toEqual(['desktop', 'mac']);
    for (const result of report.results) {
      expect(result.failures).toEqual(['run failed: browser did not start']);
      expect(result.stats).toBeNull();
    }
    expect(readFileSync(join(out, 'launch-failure.md'), 'utf8')).toContain('browser did not start');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
