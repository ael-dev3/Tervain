#!/usr/bin/env node
import fs from 'node:fs';
import { openPage } from './cdp.mjs';
const args = Object.fromEntries(process.argv.slice(2).flatMap((a, i, all) => a.startsWith('--') ? [[a.slice(2), all[i + 1]]] : []));
const url = new URL(args.url ?? 'https://ael-dev3.github.io/Tervain/');
url.searchParams.set('shot', '1'); url.searchParams.set('place', args.place ?? 'rillford');
const options = { clearance: Number(args.clearance ?? .08), maxChecks: Number(args['max-checks'] ?? 20_000) };
let page;
try {
  if (!Number.isFinite(options.clearance) || options.clearance < 0 || !Number.isInteger(options.maxChecks) || options.maxChecks < 1) throw new Error('Invalid placement audit limits');
  page = await openPage(url.href);
  const deadline = Date.now() + Number(args.timeout ?? 180_000);
  let ready = false;
  while (Date.now() < deadline) {
    const status = await page.eval('const T = window.tervain; return { loaded: !!T, supported: typeof T?.auditPlacement === "function", ready: T?.mode === "play" && !!T.world };').catch(() => null);
    if (status?.loaded && !status.supported) throw new Error('The served build has no placement audit; use a build containing this tool.');
    if (status?.ready) { ready = true; break; }
    await page.wait(250);
  }
  if (!ready) throw new Error('The scene did not become ready for placement auditing.');
  const report = await page.eval(`return window.tervain.auditPlacement(${JSON.stringify(options)});`);
  fs.writeFileSync(args.out ?? 'placement-audit.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`Placement audit: ${report.summary.roots} roots, ${report.summary.props} prop components, ${report.summary.candidates} candidates; complete=${report.complete}`);
  if (!report.complete) process.exitCode = 2;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { page?.close(); }
