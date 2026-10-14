#!/usr/bin/env node
/**
 * Route stutter gate: runs a route with real key input and fails on any presented frame longer than --max-ms.
 *
 *   node tools/route-stutter.mjs [--url https://ael-dev3.github.io/Tervain/] [--hour 22.8] [--route village|name]
 *        [--from x,z,yaw] [--seconds 8] [--max-ms 33] [--profile mac|desktop] [--runs 1] [--out dir] [--profiler true]
 *
 * Each frame records its interval, the hero position, WebGL program links, shader compiles and texture/buffer
 * bytes, so a hitch can be attributed. Routes are start points near lit windows and water edges; --from overrides.
 * Exit code 0 only when no frame of any run exceeds --max-ms (the first --skip-s seconds after placing are ignored).
 */
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]] : acc), []));
const URL_ = args.url ?? 'https://ael-dev3.github.io/Tervain/';
const HOUR = Number(args.hour ?? 22.8), MAX = Number(args['max-ms'] ?? 33), SECONDS = Number(args.seconds ?? 8), RUNS = Number(args.runs ?? 1);
const SKIP = Number(args['skip-s'] ?? 0.5);
const OUT = path.resolve(args.out ?? 'route-stutter-runs'); fs.mkdirSync(OUT, { recursive: true });
const PROFILES = { desktop: { w: 1280, h: 720, dpr: 1 }, mac: { w: 1440, h: 900, dpr: 2 } };
const prof = PROFILES[args.profile ?? 'mac'];
// Start x, z, yaw (the hero walks the way the camera faces).
const ROUTES = {
  village: [-6, 44, Math.PI], 'village-s': [-12, -30, 0], mill: [-8, 12, Math.PI], square: [0, 0, Math.PI],
};
const names = args.route ? args.route.split(',') : ['village'];

const INSTRUMENT = `
  const T = window.tervain, R = T.renderer, gl = R.getContext();
  const G = window.__rs = { events: [], refs: [], frames: [], links: 0, linkMs: 0, compiles: 0, upload: 0, last: 0, draws: 0 };
  { const f = gl.linkProgram.bind(gl); gl.linkProgram = (p) => { const t = performance.now(); G.links++; const r = f(p); G.linkMs += performance.now() - t;
    let name = ''; try { const src = gl.getAttachedShaders(p).map((s) => gl.getShaderSource(s)).join(' '); const defs = [...src.matchAll(/^#define (USE_[A-Z_]+|NUM_[A-Z_]+ [0-9]+|SHADER_NAME [A-Za-z0-9_]+)/gm)].map((m) => m[1]); name = [...new Set(defs)].filter((d) => /SHADER_NAME|SKINNING|INSTANCING|NUM_POINT|NUM_DIR|SHADOWMAP|FOG|CLIPPING|ALPHA|NORMALMAP|TRANSMISSION/.test(d)).join(',') + ' | ' + new Error().stack.split(String.fromCharCode(10)).slice(2, 8).map((l) => l.trim().split(' ')[1]).join('<'); } catch {}
    G.events.push([+t.toFixed(0), 'link', +(performance.now() - t).toFixed(1), name, +T.player.x.toFixed(1), +T.player.z.toFixed(1)]); return r; }; }
  { const f = gl.getProgramParameter.bind(gl); gl.getProgramParameter = (p, k) => { const t = performance.now(); const r = f(p, k); const d = performance.now() - t; if (d > 3) G.events.push([+t.toFixed(0), 'getProgramParameter', +d.toFixed(1), k, +T.player.x.toFixed(1), +T.player.z.toFixed(1)]); return r; }; }
  { const f = gl.compileShader.bind(gl); gl.compileShader = (s) => { G.compiles++; return f(s); }; }
  for (const n of ['texImage2D', 'texSubImage2D', 'bufferData', 'bufferSubData']) { const f = gl[n].bind(gl); gl[n] = (...a) => { const v = a[a.length - 1]; G.upload += v?.byteLength ?? 0; return f(...a); }; }
  const raf = window.requestAnimationFrame.bind(window);
  const render = R.render.bind(R);
  let frameStart = 0;
  window.requestAnimationFrame = (cb) => raf((t) => { frameStart = performance.now(); cb(t); });
  R.render = function (s, c) { const rt = R.getRenderTarget(), t = performance.now(); const o = render(s, c);
    if (rt && rt.width === 1 && rt.height === 1) G.events.push([+t.toFixed(0), 'oneDraw', +(performance.now() - t).toFixed(1), 'render into a 1 px target (arrival first draw)', +T.player.x.toFixed(1), +T.player.z.toFixed(1)]);
    if (rt === null) { const now = performance.now(), P = T.player;
    G.frames.push([now, G.last ? now - G.last : 0, +P.x.toFixed(2), +P.z.toFixed(2), G.links, G.compiles, G.upload, R.info.render.calls, R.info.render.triangles, R.info.programs?.length ?? 0, +(now - frameStart).toFixed(1)]); G.refs.push(T.perf?.samples.at(-1) ?? null); G.last = now; G.upload = 0; } return o; };
  return 1;`;

const keyCode = { KeyW: 87, ShiftLeft: 16 };
let failed = false;
for (const name of names) for (let run = 0; run < RUNS; run++) {
  const [x, z, yaw] = args.from ? args.from.split(',').map(Number) : ROUTES[name];
  const page = await openPage(URL_, { w: prof.w, h: prof.h, headed: true });
  try {
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: prof.w, height: prof.h, deviceScaleFactor: prof.dpr, mobile: false });
    if (Number(args.cpu ?? 1) > 1) await page.cdp('Emulation.setCPUThrottlingRate', { rate: Number(args.cpu) });
    for (let i = 0; i < 1200 && !(await page.eval('return window.tervain?.mode === "title"').catch(() => false)); i++) await page.wait(250);
    await page.wait(2500);
    const rect = await page.eval(`const b = [...document.querySelectorAll('.menu-choices button')].find((x) => /new/i.test(x.textContent)); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]`);
    await page.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect[0], y: rect[1], button: 'left', buttons: 1, clickCount: 1 });
    await page.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect[0], y: rect[1], button: 'left', buttons: 0, clickCount: 1 });
    for (let i = 0; i < 2400 && !(await page.eval('const T = window.tervain; return T.mode === "play" && !!T.world && T.loadingEl.classList.contains("off")').catch(() => false)); i++) await page.wait(250);
    if (!args['from-open']) await page.wait(2000);
    else await page.eval(INSTRUMENT);
    const tOpen = await page.eval('return performance.now()');
    await page.eval(`const T = window.tervain; T.debugTime(${HOUR}); T.player.setPosition(${x}, ${z}, ${yaw}, T.world.terrain); T.cam.yaw = ${yaw}; return 1`);
    await page.wait(1500);
    if (!args['from-open']) await page.eval(INSTRUMENT);
    if (args.profiler === 'true') { await page.cdp('Profiler.enable'); await page.cdp('Profiler.setSamplingInterval', { interval: 200 }); await page.cdp('Profiler.start'); }
    const key = (type, code) => page.cdp('Input.dispatchKeyEvent', { type, code, key: code === 'ShiftLeft' ? 'Shift' : code.slice(3).toLowerCase(), windowsVirtualKeyCode: keyCode[code] });
    const t0 = args['from-open'] ? tOpen : await page.eval('return performance.now()');
    for (const c of ['KeyW', 'ShiftLeft']) await key('rawKeyDown', c);
    const end = Date.now() + SECONDS * 1000;
    while (Date.now() < end) { await page.wait(100); await page.cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'KeyW', key: 'w', autoRepeat: true, windowsVirtualKeyCode: 87 }); }
    for (const c of ['ShiftLeft', 'KeyW']) await key('keyUp', c);
    if (args.profiler === 'true') { const { result } = await page.cdp('Profiler.stop'); fs.writeFileSync(path.join(OUT, `${name}-${run}.cpuprofile`), JSON.stringify(result.profile)); }
    await page.wait(300);
    const G = await page.eval('const g = window.__rs; g.gpu = g.refs.map((r) => r?.gpu ?? null); g.cpu = g.refs.map((r) => r?.cpu ?? null); g.refs = null; return g');
    const frames = G.frames.filter((f) => f[0] > t0 + SKIP * 1000 && f[1] > 0);
    const iv = frames.map((f) => f[1]).sort((a, b) => a - b), q = (p) => iv[Math.min(iv.length - 1, Math.floor(p * iv.length))] ?? 0;
    const gp = G.gpu.filter((v) => v !== null).sort((a, b) => a - b);
    console.log(`  gpu p50 ${(gp[gp.length >> 1] ?? 0).toFixed(1)} p95 ${(gp[Math.floor(gp.length * .95)] ?? 0).toFixed(1)} max ${(gp.at(-1) ?? 0).toFixed(1)} ms (${gp.length} samples)`);
    const bad = frames.filter((f) => f[1] > MAX);
    const moved = frames.length ? Math.hypot(frames.at(-1)[2] - frames[0][2], frames.at(-1)[3] - frames[0][3]) : 0;
    console.log(`${name}#${run} hour ${HOUR}: ${frames.length} frames, moved ${moved.toFixed(1)} m, p50 ${q(.5).toFixed(1)} p95 ${q(.95).toFixed(1)} max ${(iv.at(-1) ?? 0).toFixed(1)} ms, >25ms ${frames.filter((f) => f[1] > 25).length}, >${MAX}ms ${bad.length}, links ${G.links}`);
    for (const f of bad.slice(0, 12)) {
      const i = G.frames.indexOf(f), p = G.frames[i - 1], gpu = G.gpu[i];
      console.log(`  ${f[1].toFixed(0)} ms at (${f[2]}, ${f[3]}) links+${f[4] - p[4]} compiles+${f[5] - p[5]} upload ${(f[6] / 1e6).toFixed(2)}MB calls ${f[7]} tris ${f[8]} programs ${f[9]} main ${f[10]}ms gpu ${gpu === null ? 'n/a' : gpu.toFixed(1)}ms`);
    }
    for (const e of G.events) console.log('  event', e.join(' | '));
    fs.writeFileSync(path.join(OUT, `${name}-${run}.json`), JSON.stringify(G.frames));
    if (bad.length || !frames.length || moved < 5) failed = true;
  } finally { page.close(); }
}
process.exit(failed ? 1 : 0);
