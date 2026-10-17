#!/usr/bin/env node
/**
 * Arrival stutter gate: the seconds after a journey opens, while the animals, furniture and figures that arrive after
 * the world opens are being prepared (shader links, texture uploads, first draws). The hero runs the whole time.
 *
 *   node tools/arrival-stutter.mjs [--url https://ael-dev3.github.io/Tervain/] [--hour 22.8] [--seconds 45]
 *        [--from x,z,yaw] [--max-ms 33] [--settle-s 3] [--profile mac|desktop] [--out file.json]
 *
 * The recorder is installed before the page loads, so every frame, program link and slow upload is timed from the
 * start. The first --settle-s seconds after play begins are left out (the teleport to --from streams terrain);
 * after that any frame longer than --max-ms fails the run. Add ?pace=0 to --url to switch arrival pacing off.
 */
import fs from 'node:fs';
import { openPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]] : acc), []));
const URL_ = args.url ?? 'https://ael-dev3.github.io/Tervain/';
const HOUR = Number(args.hour ?? 22.8), SECONDS = Number(args.seconds ?? 45), MAX = Number(args['max-ms'] ?? 33), SETTLE = Number(args['settle-s'] ?? 3);
const [X, Z, YAW] = (args.from ?? '-75,15,1.5').split(',').map(Number);
const prof = { desktop: { w: 1280, h: 720, dpr: 1 }, mac: { w: 1440, h: 900, dpr: 2 } }[args.profile ?? 'mac'];

const init = `
  window.__tr = { raf: [], links: [], slow: [] };
  let last = 0; const tick = () => { const n = performance.now(); window.__tr.raf.push([+n.toFixed(1), last ? +(n - last).toFixed(1) : 0]); last = n; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  const P = WebGL2RenderingContext.prototype;
  { const f = P.linkProgram; P.linkProgram = function (p) { const t = performance.now(); const r = f.call(this, p); window.__tr.links.push([+t.toFixed(0), +(performance.now() - t).toFixed(1)]); return r; }; }
  for (const n of ['texImage2D', 'texSubImage2D', 'compressedTexImage2D']) { const f = P[n]; P[n] = function (...a) { const t = performance.now(); const r = f.apply(this, a); const d = performance.now() - t; if (d > 4) window.__tr.slow.push([+t.toFixed(0), n, +d.toFixed(1)]); return r; }; }
  { const f = P.getProgramParameter; P.getProgramParameter = function (p, k) { const t = performance.now(); const r = f.call(this, p, k); const d = performance.now() - t; if (d > 4) window.__tr.slow.push([+t.toFixed(0), 'getProgramParameter', +d.toFixed(1)]); return r; }; }`;

let page, failed = false;
try {
  page = await openPage(URL_, { w: prof.w, h: prof.h, headed: true, init });
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: prof.w, height: prof.h, deviceScaleFactor: prof.dpr, mobile: false });
  for (let i = 0; i < 1200 && !(await page.eval('return window.tervain?.mode === "title"').catch(() => false)); i++) await page.wait(250);
  await page.wait(2500);
  const rect = await page.eval(`const b = [...document.querySelectorAll('.menu-choices button')].find((x) => /new/i.test(x.textContent)); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]`);
  await page.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect[0], y: rect[1], button: 'left', buttons: 1, clickCount: 1 });
  await page.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect[0], y: rect[1], button: 'left', buttons: 0, clickCount: 1 });
  let tPlay = 0;
  for (let i = 0; i < 6000 && !tPlay; i++) {
    if (await page.eval('const T = window.tervain; return T.mode === "play" && !!T.world && T.loadingEl.classList.contains("off")').catch(() => false)) tPlay = await page.eval('return performance.now()');
    else await page.wait(100);
  }
  if (!tPlay) throw new Error('the journey never opened');
  await page.eval(`const T = window.tervain; T.debugTime(${HOUR}); T.player.setPosition(${X}, ${Z}, ${YAW}, T.world.terrain); T.cam.yaw = ${YAW}; return 1`);
  const key = (type) => page.cdp('Input.dispatchKeyEvent', { type, code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 });
  const end = Date.now() + SECONDS * 1000;
  while (Date.now() < end) { await key('rawKeyDown'); await page.wait(150); }
  await key('keyUp');
  const tr = await page.eval('return window.__tr');
  const rel = (t) => +((t - tPlay) / 1000).toFixed(1);
  const frames = tr.raf.filter((r) => rel(r[0]) >= SETTLE && r[1] > 0);
  const iv = frames.map((f) => f[1]).sort((a, b) => a - b), q = (p) => iv[Math.min(iv.length - 1, Math.floor(p * iv.length))] ?? 0;
  const over = frames.filter((f) => f[1] > MAX), over25 = frames.filter((f) => f[1] > 25);
  console.log(`arrival walk (hour ${HOUR}, ${URL_}): ${frames.length} frames after ${SETTLE}s, p50 ${q(.5).toFixed(1)} p95 ${q(.95).toFixed(1)} p99 ${q(.99).toFixed(1)} max ${(iv.at(-1) ?? 0).toFixed(1)} ms, >25ms ${over25.length}, >${MAX}ms ${over.length}`);
  console.log('  frames over the limit (s after play: ms):', over.map((f) => `${rel(f[0])}s:${f[1].toFixed(0)}`).join(' ') || 'none');
  console.log('  program links (s):', tr.links.filter((l) => rel(l[0]) >= 0).map((l) => rel(l[0])).join(' ') || 'none');
  console.log('  slow GL calls (s, call, ms):', tr.slow.filter((l) => rel(l[0]) >= 0).map((l) => `${rel(l[0])} ${l[1]} ${l[2]}`).slice(0, 40).join(' | ') || 'none');
  if (args.out) fs.writeFileSync(args.out, JSON.stringify({ tPlay, ...tr }));
  if (over.length || !frames.length) failed = true;
} finally { page?.close(); }
process.exit(failed ? 1 : 0);
