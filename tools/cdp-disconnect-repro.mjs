#!/usr/bin/env node
// Run either the baseline or patched driver in an owned process group; the baseline leaks browser children.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, i, all) => arg.startsWith('--') ? [[arg.slice(2), all[i + 1]]] : []));
if (args.child === '1') {
  const { openPage } = await import(pathToFileURL(path.resolve(args.driver ?? 'tools/cdp.mjs')).href);
  const page = await openPage(args.url ?? 'http://127.0.0.1:4173/', { w: 640, h: 360, flags: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'] });
  const pending = page.eval('return new Promise(() => {});').then(() => 'resolved', () => 'rejected');
  await page.wait(100);
  page.close();
  const result = await Promise.race([pending, page.wait(1000).then(() => 'pending')]);
  console.log(JSON.stringify({ result, expected: args.expect ?? 'rejected', pass: result === (args.expect ?? 'rejected') }));
  process.exitCode = result === (args.expect ?? 'rejected') ? 0 : 1;
} else {
  if (process.platform === 'win32') throw new Error('Baseline isolation harness requires POSIX process groups');
  const child = spawn(process.execPath, [process.argv[1], ...process.argv.slice(2), '--child', '1'], { detached: true, stdio: ['ignore', 'pipe', 'ignore'] });
  let text = '';
  child.stdout.on('data', chunk => { text += chunk; });
  const stop = () => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* exited */ } };
  const deadline = setTimeout(stop, 45000);
  child.on('exit', code => {
    clearTimeout(deadline); stop();
    const report = text.trim();
    if (args.out && report) fs.writeFileSync(args.out, report + '\n');
    console.log(report || 'Repro did not complete');
    process.exitCode = code === 0 && report ? 0 : 1;
  });
}
