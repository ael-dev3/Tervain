#!/usr/bin/env node
/** CHROME=<browser> node tools/repro-cdp-cleanup.mjs: an explicit exit must not retain a browser profile. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './cdp.mjs';
if (process.argv.includes('--child')) {
  const page = await openPage('data:text/html,<title>cleanup fixture</title>');
  await page.eval('return document.title');
  await page.close();
  process.exit(0); // The budget gate also exits explicitly after its final probe.
} else {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-cleanup-repro-'));
  try {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--child'], {
      env: { ...process.env, TMPDIR: scratch, TMP: scratch, TEMP: scratch }, encoding: 'utf8', timeout: 180000,
    });
    const profiles = fs.readdirSync(scratch).filter(name => name.startsWith('tervain-cdp-'));
    const bytes = file => {
      try {
        const stat = fs.lstatSync(file);
        return stat.isDirectory() ? fs.readdirSync(file).reduce((n, name) => n + bytes(path.join(file, name)), 0) : stat.size;
      } catch (error) {
        if (error.code === 'ENOENT') return 0; // Chrome can remove transient files while exiting.
        throw error;
      }
    };
    const report = { childExit: child.status, retainedProfiles: profiles.length, retainedBytes: profiles.reduce((n, name) => n + bytes(path.join(scratch, name)), 0) };
    console.log(JSON.stringify(report, null, 2));
    if (child.error || child.status !== 0 || profiles.length !== 0) process.exitCode = 1;
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}
