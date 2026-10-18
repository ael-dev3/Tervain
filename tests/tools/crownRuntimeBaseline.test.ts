import { afterEach, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
test('an older geometry implementation cannot retain a passing crown receipt', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crown-baseline-')); roots.push(root);
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'geometry.ts'), 'export const count = 1;\n');
  git('add', '.'); git('commit', '-qm', 'baseline'); const baseline = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(root, 'src', 'geometry.ts'), 'export const count = 2;\n');
  git('add', '.'); git('commit', '-qm', 'different geometry');
  const receipt = path.join(root, 'receipt.json'); fs.writeFileSync(receipt, '{"pass":true}');
  const result = spawnSync(process.execPath, [path.resolve('tools/check-crown-runtime-baseline.mjs'), baseline, 'HEAD', receipt], { cwd: root, encoding: 'utf8' });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Runtime outside the crown shader differs');
  expect(fs.existsSync(receipt)).toBe(false);
});
