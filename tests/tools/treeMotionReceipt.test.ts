import { afterEach, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const scratch: string[] = [];
afterEach(() => { for (const dir of scratch.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });
for (const mode of ['save', 'cli']) it(`invalidates a previous tree-motion PASS before a failed ${mode} run`, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-motion-receipt-')); scratch.push(dir);
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ pass: true, build: { revision: 'older-fixture' } }));
  fs.writeFileSync(path.join(dir, 'keep.txt'), 'unrelated artifact');
  const args = mode === 'save'
    ? ['--input-type=module', '-e', `import {saveTreeEdgeCapture} from './tools/capture-tree-edge-motion.mjs'; await saveTreeEdgeCapture({captures:[]},process.argv[1]);`, dir]
    : ['tools/capture-tree-edge-motion.mjs', '--out', dir, '--quality', 'invalid'];
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 10000 });
  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  expect(fs.existsSync(path.join(dir, 'report.json'))).toBe(false);
  expect(fs.readFileSync(path.join(dir, 'keep.txt'), 'utf8')).toBe('unrelated artifact');
});
