#!/usr/bin/env node
/**
 * Repeatable benchmark (A76). Opens the game at the landing, runs the fixed camera route (12 segments of 6 s through the
 * woodland and Rillford) and writes the report the game logs: frame time, CPU and GPU cost per frame, draw calls and
 * triangles, for the whole route and for each segment.
 *
 *   npx vite build && npx vite preview --port 4173 &
 *   node tools/bench.mjs --headed --quality high --out bench-high.json
 *
 * --headed     draw on this machine's GPU in a visible window (required for meaningful GPU times; headless Chromium
 *              falls back to software rendering)
 * --quality    low | medium | high (default medium)
 * --size WxH   window size (default 1920x1080)
 * --url        the served build (default http://127.0.0.1:4173/)
 * --out        where to write the JSON report (default bench-<quality>-<time>.json)
 * --quick      half a second a segment instead of six (a functional check, e.g. software rendering)
 * --runs N     repeat the route N times in one session (default 1); the first lap includes shader compiles
 */
import fs from 'node:fs';
import { openPage } from './cdp.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const headed = process.argv.includes('--headed');
const quality = arg('quality', 'medium');
const [w, h] = arg('size', '1920x1080').split('x').map(Number);
const url = arg('url', 'http://127.0.0.1:4173/');
const runs = Number(arg('runs', '1'));
const bench = process.argv.includes('--quick') ? 'quick' : '1';
const out = arg('out', `bench-${quality}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

const page = await openPage(`${url}?shot=1&place=landing&hour=11&hud=1&fps=1&quality=${quality}&settle=30&bench=${bench}`, { w, h, headed });
const reports = [];
try {
  for (let i = 0; i < 1200; i++) {
    if ((await page.eval('return document.title')) === 'READY') break;
    await page.wait(500);
  }
  for (let run = 0; run < runs; run++) {
    if (run > 0) await page.eval('tervain.startBenchmark(); return 1');
    await page.eval('window.tervainBench = null; return 1');
    let report = null;
    for (let i = 0; i < 2400 && !report; i++) {
      await page.wait(500);
      report = await page.eval('return window.tervainBench ?? null');
    }
    if (!report) throw new Error('the benchmark did not finish in 20 minutes');
    reports.push(report);
    const g = report.whole;
    console.log(`run ${run + 1}: frame median ${g.interval.median.toFixed(2)} ms p95 ${g.interval.p95.toFixed(2)} · cpu ${g.cpu.median.toFixed(2)} ms · gpu ${g.gpu ? `${g.gpu.median.toFixed(2)} ms` : 'n/a'} · draws ${g.calls.median} · ${(g.triangles.median / 1e6).toFixed(2)} M tris`);
  }
  fs.writeFileSync(out, `${JSON.stringify(runs === 1 ? reports[0] : reports, null, 2)}\n`);
  console.log(`wrote ${out}`);
} finally {
  await page.close();
}
