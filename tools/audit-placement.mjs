#!/usr/bin/env node
import fs from 'node:fs';
import { openPage } from './cdp.mjs';
const args = Object.fromEntries(process.argv.slice(2).flatMap((a, i, all) => a.startsWith('--') ? [[a.slice(2), all[i + 1]]] : []));
const url = new URL(args.url ?? 'https://ael-dev3.github.io/Tervain/');
if (args.quality) {
  if (!['low', 'medium', 'high'].includes(args.quality)) throw new Error('Invalid audit quality');
  url.searchParams.set('quality', args.quality);
}
url.searchParams.set('shot', '1'); url.searchParams.set('place', args.place ?? 'rillford');
const options = { clearance: Number(args.clearance ?? .08), maxChecks: Number(args['max-checks'] ?? 20_000) };
let page;
try {
  if (!Number.isFinite(options.clearance) || options.clearance < 0 || !Number.isInteger(options.maxChecks) || options.maxChecks < 1) throw new Error('Invalid placement audit limits');
  const timeout = Number(args.timeout ?? 180_000);
  if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('Invalid audit timeout');
  page = await openPage(url.href, { w: 640, h: 360, requestTimeoutMs: timeout, flags: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const deadline = Date.now() + timeout;
  let ready = false;
  while (Date.now() < deadline) {
    const status = await page.eval('const T = window.tervain; return { loaded: !!T, supported: typeof T?.auditPlacement === "function", ready: T?.mode === "play" && !!T.world };').catch(() => null);
    if (status?.loaded && !status.supported) throw new Error('The served build has no placement audit; use a build containing this tool.');
    if (status?.ready) { ready = true; break; }
    await page.wait(250);
  }
  if (!ready) throw new Error('The scene did not become ready for placement auditing.');
  const report = await Promise.race([
    page.eval(`const T = window.tervain, render = T.render;
      try {
        if (${args['defer-render'] === '1'}) T.render = () => {};
        return await T.auditPlacement(${JSON.stringify(options)});
      } finally { T.render = render; }`),
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('Placement audit timed out')), Math.max(1, deadline - Date.now()));
      timer.unref();
    }),
  ]);
  fs.writeFileSync(args.out ?? 'placement-audit.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`Placement audit: ${report.summary.roots} roots, ${report.summary.props} prop components, ${report.summary.candidates} candidates; complete=${report.complete}`);
  if (!report.complete) process.exitCode = 2;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { page?.close(); }
