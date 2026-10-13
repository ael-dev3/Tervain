#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { pathToFileURL } from 'node:url';
const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, i, values) => arg.startsWith('--') ? [[arg.slice(2), values[i + 1]]] : []));
const driver = args.driver ? await import(pathToFileURL(path.resolve(args.driver)).href) : await import('./cdp.mjs');
const out = args.out ?? 'cdp-page-isolation-proof';
fs.mkdirSync(out, { recursive: true });
let chosen;
for (let candidate = 9300; candidate < 9800; candidate++) {
  const server = net.createServer();
  try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(candidate, '127.0.0.1', resolve); }); chosen = candidate; }
  catch { continue; }
  finally { if (server.listening) await new Promise(resolve => server.close(resolve)); }
  if (chosen) break;
}
if (!chosen) throw new Error('No free fixture port');
const random = Math.random;
let first, second;
try {
  // Force the legacy random selector to collide with the first fixture. Owned ephemeral ports ignore this selector.
  Math.random = () => (chosen - 9300 + .1) / 500;
  first = await driver.openPage('about:blank', { w: 320, h: 180 });
  await first.eval('document.title = "fixture-one"; window.fixture = 1;');
  second = await driver.openPage('about:blank', { w: 320, h: 180 });
  await second.eval('document.title = "fixture-two"; window.fixture = 2;');
  const a = await first.eval('return {title: document.title, fixture: window.fixture, webgl: !!document.createElement("canvas").getContext("webgl2")};');
  const b = await second.eval('return {title: document.title, fixture: window.fixture, webgl: !!document.createElement("canvas").getContext("webgl2")};');
  const report = { schema: 1, first: a, second: b, isolationPass: a.fixture === 1 && b.fixture === 2, reproducedCollision: a.fixture === 2 && b.fixture === 2, softwareWebglAvailable: a.webgl && b.webgl, scope: 'Two owned native headless-browser fixtures under a forced legacy port collision. No application visuals or frame timings.' };
  report.pass = report.softwareWebglAvailable && (args.expect === 'collision' ? report.reproducedCollision : report.isolationPass);
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!report.pass) process.exitCode = 1;
} finally { Math.random = random; second?.close(); first?.close(); }
