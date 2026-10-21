import { expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { browserCleanup } from '../../tools/cdp.mjs';

it('waits for browser exit before removing its profile, and closes only once', async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-cleanup-test-'));
  fs.writeFileSync(path.join(profile, 'fixture'), 'profile');
  const proc = spawn(process.execPath, ['-e', "process.on('SIGTERM',()=>setTimeout(()=>process.exit(0),100));process.stdout.write('ready');setInterval(()=>{},1000)"], { detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'ignore'] });
  await once(proc.stdout!, 'data');
  let releases = 0;
  const close = browserCleanup(proc, profile, () => releases++);
  const pending = close();
  expect(close()).toBe(pending);
  expect(releases).toBe(1);
  if (process.platform !== 'win32') expect(fs.existsSync(profile)).toBe(true);
  await pending;
  expect(proc.exitCode !== null || proc.signalCode !== null).toBe(true);
  expect(fs.existsSync(profile)).toBe(false);
});

it('removes a profile when a browser already exited from a signal', async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-cleanup-test-'));
  const proc = spawn(process.execPath, ['-e', "process.stdout.write('ready');setInterval(()=>{},1000)"], { stdio: ['ignore', 'pipe', 'ignore'] });
  await once(proc.stdout!, 'data');
  const exited = once(proc, 'exit');
  proc.kill('SIGTERM');
  await exited;
  await browserCleanup(proc, profile)();
  expect(fs.existsSync(profile)).toBe(false);
});
