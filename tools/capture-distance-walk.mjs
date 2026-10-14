#!/usr/bin/env node
/**
 * Distance pop-in walk: a long straight camera route through the whole native scene (every world module, not only the
 * grass), with time, wind and actors frozen, so the only thing that changes between frames is the camera and what the
 * world streams, thins, fades or swaps for it.
 *
 *   node tools/capture-distance-walk.mjs --url <build> [--from x,z] [--to x,z] [--hour 11] [--quality high]
 *        [--size 1280x720] [--clip-step 0.25] [--pop-step 0.5] [--out distance-walk] [--headed]
 *
 * Writes <out>/frames/*.png and <out>/walk.mp4 (the route at --clip-step metres a frame, 30 fps), and <out>/report.json:
 *  - popIn: at every --pop-step metres, a same-camera before/after pair around one world update. Connected changed-pixel
 *    components (threshold 20/255, at least 16 px) are streaming, LOD, thinning or visibility changes the update made
 *    while the camera stood still: on a perfectly continuous world they are zero. Counted for the whole frame and for
 *    the far band (above the horizon line's lower third), per metre walked.
 *  - triangles and draw calls the renderer reported along the route (median and max), and per frame the grass and tree
 *    modules' own counts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { openPage } from './cdp.mjs';
import { changeComponents } from './foliage-motion-metric.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]] : acc), []));
const pair = (s, d) => (s ?? d).split(',').map(Number);
const [x0, z0] = pair(args.from, '20,52'), [x1, z1] = pair(args.to, '-150,52');
const [W, H] = pair(args.size, '1280x720'.replace('x', ','));
const hour = Number(args.hour ?? 11), quality = args.quality ?? 'high';
const clipStep = Number(args['clip-step'] ?? 0.25), popStep = Number(args['pop-step'] ?? 0.5);
const out = path.resolve(args.out ?? 'distance-walk');
const length = Math.hypot(x1 - x0, z1 - z0);
if (![x0, z0, x1, z1, clipStep, popStep, hour].every(Number.isFinite) || length < 1 || clipStep <= 0 || popStep <= 0) throw new Error('Invalid route');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'frames'), { recursive: true });
fs.mkdirSync(path.join(out, 'pop'), { recursive: true });

const url = new URL(args.url ?? 'https://ael-dev3.github.io/Tervain/');
for (const [k, v] of Object.entries({ shot: '1', quality, place: 'rillford', settle: '1', hud: '0', hour: String(hour) })) url.searchParams.set(k, v);
const page = await openPage(url.href, { w: W, h: H, headed: args.headed === 'true', requestTimeoutMs: 600000 });
const raw = async (file) => new Uint8Array(await sharp(file).removeAlpha().raw().toBuffer());
try {
  let ready = false;
  for (let i = 0; i < 2400 && !ready; i++) {
    const s = await page.eval('return { play: window.tervain?.mode === "play" && document.title === "READY", failed: window.tervain?.worldBuildFailed === true };').catch(() => ({}));
    if (s.failed) throw new Error('World failed to load');
    ready = !!s.play;
    if (!ready) await page.wait(250);
  }
  if (!ready) throw new Error('World did not become ready');
  await page.eval('await window.tervain.world.arrived; return 1');
  // Record the frame context the game itself builds, then take over: no more steps or presented frames.
  await page.eval(`const T = window.tervain; window.__dw = { frame: null };
    for (const m of T.world.modules) { const u = m.module.update.bind(m.module); m.module.update = (dt, f) => { window.__dw.frame = f; return u(dt, f); }; }
    return 1`);
  for (let i = 0; i < 80 && !(await page.eval('return !!window.__dw.frame')); i++) await page.wait(100);
  const setup = await page.eval(`const T = window.tervain; T.render = () => {}; T.step = () => {}; T.hud?.show?.(false);
    const D = window.__dw, V = T.world.scene.position.constructor; D.focus = new V(); D.camera = T.cam.camera;
    D.pose = (x, z, dx, dz) => { const t = T.world.terrain, h = t.heightAt(x, z), ax = x + dx * 20, az = z + dz * 20;
      T.player.setPosition(x - dx * 8, z - dz * 8, Math.atan2(dx, dz), t); D.focus.set(x - dx * 8, t.heightAt(x - dx * 8, z - dz * 8), z - dz * 8);
      D.camera.position.set(x, h + 1.7, z); D.camera.lookAt(ax, t.heightAt(ax, az) + 1.2, az); D.camera.updateMatrixWorld(); };
    D.update = (dt) => { const f = { ...D.frame, camera: D.camera, focus: D.focus, reducedMotion: true };
      T.world.sky.update(f.hour, D.focus, 0, true);
      for (const m of T.world.modules) { m.module.prepare?.(T.renderer, 0); m.module.update(dt, f); } };
    D.render = () => { const info = T.renderer.info; info.autoReset = false; info.reset(); T.grade.render(T.world.scene, D.camera, 0); const r = { tris: info.render.triangles, draws: info.render.calls }; info.autoReset = true;
      for (const m of T.world.modules) { const st = m.module.stats?.() ?? {}; for (const k of ['grassTris', 'grassDraws', 'treeTris', 'shadowTris', 'shadowTrees', 'treesDrawn']) if (typeof st[k] === 'number') r[k] = st[k]; }
      return r; };
    return { hour: D.frame.hour, quality: D.frame.quality, modules: T.world.modules.map((m) => m.name), build: document.querySelector('.menu-build span')?.textContent ?? '' };`);
  const dx = (x1 - x0) / length, dz = (z1 - z0) / length;
  const at = (s) => `window.__dw.pose(${x0 + dx * s}, ${z0 + dz * s}, ${dx}, ${dz})`;
  // Settle at the start: several updates so the first tiles and fades are complete.
  await page.eval(`${at(0)}; for (let i = 0; i < 30; i++) window.__dw.update(1 / 60); window.__dw.render(); return 1`);

  // Clip: one update per frame, as a walker would get.
  const stats = [];
  const frames = Math.floor(length / clipStep) + 1;
  for (let i = 0; i < frames; i++) {
    const r = await page.eval(`${at(i * clipStep)}; window.__dw.update(1 / 60); return window.__dw.render();`);
    stats.push(r);
    await page.shot(path.join(out, 'frames', `f${String(i).padStart(4, '0')}.png`));
  }
  const clip = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(out, 'frames', 'f%04d.png'), '-pix_fmt', 'yuv420p', '-crf', '16', path.join(out, 'walk.mp4')], { timeout: 600000 }).status === 0;

  // Pop-in: same camera before and after one update, along the same route from a settled start.
  await page.eval(`${at(0)}; for (let i = 0; i < 30; i++) window.__dw.update(1 / 60); return 1`);
  const pops = [];
  const farRows = Math.round(H * 0.55);
  for (let s = popStep; s <= length + 1e-6; s += popStep) {
    const k = String(pops.length).padStart(4, '0');
    const before = path.join(out, 'pop', `${k}-a.png`), after = path.join(out, 'pop', `${k}-b.png`);
    await page.eval(`${at(s)}; window.__dw.render(); return 1`); await page.shot(before);
    await page.eval('window.__dw.update(1 / 60); window.__dw.render(); return 1'); await page.shot(after);
    const a = await raw(before), b = await raw(after);
    const all = changeComponents(a, b, W, H);
    const far = changeComponents(a.subarray(0, W * farRows * 3), b.subarray(0, W * farRows * 3), W, farRows);
    pops.push({ metre: +s.toFixed(2), events: all.events.length, changedPixels: all.changedPixels, farEvents: far.events.length, boxes: all.events.slice(0, 12).map((e) => e.box) });
    // Keep only the pairs that changed, to inspect.
    if (!all.events.length) { fs.rmSync(before); fs.rmSync(after); }
  }
  const sum = (key) => pops.reduce((n, p) => n + p[key], 0);
  const med = (a) => { const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
  const report = {
    schema: 1, url: url.href, setup, route: { from: [x0, z0], to: [x1, z1], metres: length, clipStep, popStep }, size: [W, H], clip,
    budget: { trianglesMedian: med(stats.map((s) => s.tris)), trianglesMax: Math.max(...stats.map((s) => s.tris)), drawsMedian: med(stats.map((s) => s.draws)), drawsMax: Math.max(...stats.map((s) => s.draws)) },
    popIn: { events: sum('events'), eventsPerMetre: sum('events') / length, farEvents: sum('farEvents'), farEventsPerMetre: sum('farEvents') / length, changedPixelsPerMetre: sum('changedPixels') / length, stepsWithChange: pops.filter((p) => p.events).length, steps: pops.length },
    perFrame: stats, pops,
  };
  fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 1)}\n`);
  console.log(JSON.stringify({ build: setup.build, route: report.route, budget: report.budget, popIn: report.popIn, clip }));
} finally {
  page.close();
}
