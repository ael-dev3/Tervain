#!/usr/bin/env node
/**
 * Continue gate (0.0.17): a saved game must come back on its feet. Starts a journey, saves, reloads the page, takes the
 * menu's Continue and checks that the hero stands on or above the ground, is drawn and the camera is above the land.
 * Repeats with a save whose height lies 3 m under the ground (what an old save looks like after the land changed).
 *
 *   node tools/continue-gate.mjs [--url https://ael-dev3.github.io/Tervain/]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { openPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((a, i, all) => a.startsWith('--') ? [[a.slice(2), all[i + 1]]] : []));
const URL_ = args.url ?? 'http://127.0.0.1:4173/';
const SHOTS = args.shots ?? null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const page = await openPage(URL_, { w: 1280, h: 720, headed: true, requestTimeoutMs: 240000 });
const failures = [];
const choices = () => page.eval(`return [...document.querySelectorAll('.menu-choices button')].map((b) => b.textContent.trim())`);
const click = async (re) => {
  const r = await page.eval(`const b = [...document.querySelectorAll('.menu-choices button')].find((x) => ${re}.test(x.textContent)); if (!b) return null; const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]`);
  if (!r) return false;
  for (const type of ['mousePressed', 'mouseReleased']) await page.cdp('Input.dispatchMouseEvent', { type, x: r[0], y: r[1], button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  return true;
};
const waitTitle = async () => { for (let i = 0; i < 1200 && !(await page.eval('return window.tervain?.mode === "title"').catch(() => false)); i++) await page.wait(250); await page.wait(2500); };
const waitPlay = async () => { for (let i = 0; i < 2400 && !(await page.eval('const T = window.tervain; return T.mode === "play" && !!T.world && T.loadingEl.classList.contains("off")').catch(() => false)); i++) await page.wait(250); };
const probe = () => page.eval(`const T = window.tervain, p = T.player, c = T.cam.camera.position, t = T.world.terrain;
  return { x: p.x, y: p.y, z: p.z, ground: t.groundAt(p.x, p.z), camY: c.y, camGround: t.groundAt(c.x, c.z), visible: p.group.visible, swimming: !!p.swimming };`);

async function round(label, bury, hour) {
  await waitTitle();
  if (!(await click('/continue/i'))) { await click('/new/i'); await page.wait(400); await click('/yes|start|begin|confirm/i'); }
  await waitPlay(); await page.wait(2000);
  // A spot on open land away from the arrival strand, so the round trip is not just the fresh spawn.
  await page.eval(`const T = window.tervain; T.player.setPosition(6, 26, 0, T.world.terrain); return 1`);
  await page.wait(1500);
  if (hour !== undefined) { await page.eval(`window.tervain.debugTime?.(${hour}); return 1`); await page.wait(1500); }
  if (bury) await page.eval(`const T = window.tervain, p = T.player, g = T.world.terrain.groundAt(p.x, p.z); p.y = g - 3; p.rig.root.position.y = p.y; return 1`);
  const saved = await page.eval(`return window.tervain.saveTo('slot-1')`);
  if (!saved?.ok) { failures.push(`${label}: save failed (${saved?.message})`); return; }
  await page.eval('setTimeout(() => location.reload(), 50); return 1').catch(() => {});
  await page.wait(3000); await waitTitle();
  if (!(await click('/continue/i'))) { failures.push(`${label}: no Continue on the menu (${(await choices()).join(' | ')})`); return; }
  await waitPlay();
  // With --shots, record the first seconds after Continue as a clip (screencast frames at their own times).
  let from = 0;
  if (SHOTS) { from = page.frames.length; await page.cdp('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1, maxWidth: 1280, maxHeight: 720 }); }
  for (const wait of [500, 3000]) {
    await page.wait(wait);
    const s = await probe();
    if (SHOTS) { const r = await page.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); const d = r?.result?.data ?? r?.data; if (d) fs.writeFileSync(path.join(SHOTS, `${label.replace(/\W+/g, '-')}-${wait}.jpg`), Buffer.from(d, 'base64')); }
    const line = `${label} +${wait} ms: hero (${s.x.toFixed(1)}, ${s.y.toFixed(2)}, ${s.z.toFixed(1)}) ground ${s.ground.toFixed(2)} camera ${s.camY.toFixed(2)} over ${s.camGround.toFixed(2)} drawn ${s.visible}`;
    console.log(line);
    if (!s.swimming && s.y < s.ground - 0.3) failures.push(`${label}: hero beneath the ground — ${line}`);
    if (s.camY < s.camGround - 0.05) failures.push(`${label}: camera beneath the ground — ${line}`);
    if (!s.visible) failures.push(`${label}: hero not drawn — ${line}`);
    // A cold night load once drew no shadow-receiving surface at all (no land, no hero): check the frame has ground in it.
    const lit = await page.eval(`const T = window.tervain, r = T.renderer, gl = r.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(4 * 64);
      T.render?.(); let n = 0; for (let i = 0; i < 64; i++) { gl.readPixels(Math.floor(w * (0.1 + 0.8 * (i % 8) / 7)), Math.floor(h * 0.08 + h * 0.25 * Math.floor(i / 8) / 7), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px.subarray(i * 4, i * 4 + 4)); }
      for (let i = 0; i < 64; i++) if (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2] > 6) n++; return n;`);
    console.log(`${label}: ${lit}/64 lower-frame samples show ground`);
    // The real night failure: a sun shadow map never created, so every shadow-receiving surface was rejected.
    const shadow = await page.eval(`const T = window.tervain; return !T.renderer.shadowMap.enabled || T.world.sky.sun.shadow.map !== null`);
    if (!shadow) failures.push(`${label}: the sun's shadow map was never created (land and hero not drawn)`);
    if (lit < 16) failures.push(`${label}: the lower frame is black (no ground drawn) — ${lit}/64`);
  }
  if (SHOTS) {
    await page.cdp('Page.stopScreencast');
    const frames = page.frames.slice(from).filter((f) => f.t), dir = path.join(SHOTS, label.replace(/\W+/g, '-')), list = [];
    fs.mkdirSync(dir, { recursive: true });
    frames.forEach((f, i) => { const file = `f${String(i).padStart(4, '0')}.jpg`; fs.writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64'));
      list.push(`file '${file}'`, `duration ${Math.max(0.001, (frames[i + 1]?.t ?? f.t + 1 / 60) - f.t).toFixed(4)}`); });
    fs.writeFileSync(path.join(dir, 'frames.txt'), list.join('\n'));
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'frames.txt', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-fps_mode', 'vfr', '-pix_fmt', 'yuv420p', 'clip.mp4'], { cwd: dir, timeout: 300000 });
  }
}

try {
  await round('save and Continue', false);
  await round('save under the land and Continue', true);
  await round('save at night and Continue', false, 21);
} catch (e) {
  failures.push(String(e?.message ?? e));
} finally {
  page.close();
}
console.log(failures.length ? `continue-gate: FAIL\n- ${failures.join('\n- ')}` : 'continue-gate: PASS');
process.exitCode = failures.length ? 1 : 0;
