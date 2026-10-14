#!/usr/bin/env node
/**
 * Camera door gate (0.0.19): through every building door, in and out, the follow camera must never pass through a roof,
 * a wall or the ground, and inside a room must stay clear of the ceiling (never seeing the roof from within).
 * Walks the hero through each door with the real W key and samples the camera every rendered frame.
 *
 *   node tools/camera-doors.mjs [--url http://127.0.0.1:4280/] [--only inn,house_a] [--hour 11] [--json out.json]
 *
 * Per frame, violations are (all measured against the world's live colliders):
 *  - ground: the camera lower than 0.2 m above the terrain;
 *  - roof:   the camera inside a roof volume;
 *  - ceiling: the camera inside a room's footprint higher than 0.8 m below the wall top (the rafters and tie beams);
 *  - wall:   the camera inside a wall volume, or within 0.15 m of one with the wall between it and the hero's head.
 * Exits non-zero when any frame violates.
 */
import fs from 'node:fs';
import { openPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]] : acc), []));
const URL_ = args.url ?? 'http://127.0.0.1:4280/';
const only = args.only ? new Set(args.only.split(',')) : null;
const page = await openPage(URL_, { w: 1280, h: 720, headed: true, requestTimeoutMs: 240000 });
const key = (type, extra = {}) => page.cdp('Input.dispatchKeyEvent', { type, code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87, ...extra });
const failures = [], report = [];

const INSTALL = `
const T = window.tervain, all = [...T.world.colliders.all, ...(T.world.colliders.cameraGeometry?.all ?? [])];
const ground = (x, z) => T.world.terrain.groundAt(x, z);
const boxes = all.filter((c) => c.kind === 'box' && c.minY !== undefined && c.maxY !== undefined && c.active !== false);
const roofs = boxes.filter((c) => c.id.endsWith(':roof') || c.id === 'archive_roof');
const door = all.find((c) => c.id === 'archive_door');
if (door && !roofs.some((r) => r.id === 'archive_roof')) { // before the archive had a roof volume: stand one in for the measurement (8 x 7, walls to 3.6 m)
  const cx = door.x - Math.sin(door.yaw) * 3.5, cz = door.z - Math.cos(door.yaw) * 3.5, g = T.world.terrain.heightAt(cx, cz);
  roofs.push({ id: 'archive_roof', kind: 'box', x: cx, z: cz, yaw: door.yaw, hw: 4, hd: 3.5, minY: g + 3.6, maxY: g + 5.6, active: true });
}
const walls = boxes.filter((c) => /:(wall|lintel|doorframe)$/.test(c.id) || c.id === 'archive_wall');
const local = (c, x, y, z) => { const ox = x - c.x, oz = z - c.z, cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); return [ox * cs - oz * sn, y, ox * sn + oz * cs]; };
const dist = (c, x, y, z) => { const l = local(c, x, y, z), dx = Math.max(Math.abs(l[0]) - c.hw, 0), dz = Math.max(Math.abs(l[2]) - c.hd, 0), dy = Math.max(c.minY - y, y - c.maxY, 0); return Math.hypot(dx, dy, dz); };
const crosses = (c, a, b) => {
  const la = local(c, a[0], a[1], a[2]), lb = local(c, b[0], b[1], b[2]); let t0 = 0, t1 = 1;
  for (const [o, d, lo, hi] of [[la[0], lb[0] - la[0], -c.hw, c.hw], [la[1], lb[1] - la[1], c.minY, c.maxY], [la[2], lb[2] - la[2], -c.hd, c.hd]]) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return false; continue; }
    let u = (lo - o) / d, v = (hi - o) / d; if (u > v) { const w = u; u = v; v = w; } t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false;
  } return true; };
window.__cd = { rows: [], on: false };
const roomAt = (x, z) => roofs.find((r) => { const l = local(r, x, 0, z); return Math.abs(l[0]) < r.hw - 0.3 && Math.abs(l[2]) < r.hd - 0.3; });
const tick = () => {
  if (window.__cd.on) {
    const c = T.cam.camera.position, p = T.player, eye = [p.x, p.y + 1.6, p.z], cam = [c.x, c.y, c.z], v = [];
    if (c.y < ground(c.x, c.z) + 0.2) v.push('ground');
    if (roofs.some((r) => dist(r, c.x, c.y, c.z) === 0)) v.push('roof');
    const room = roomAt(c.x, c.z);
    if (room && c.y > room.minY - 0.8) v.push('ceiling');
    if (walls.some((w) => dist(w, c.x, c.y, c.z) === 0 || (dist(w, c.x, c.y, c.z) < 0.15 && crosses(w, eye, cam)))) v.push('wall');
    window.__cd.rows.push({ x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2), hx: +p.x.toFixed(2), hz: +p.z.toFixed(2), v: v.join('+') });
  }
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
return { rooms: roofs.length, walls: walls.length };`;

const DOORS = `const T = window.tervain, all = [...T.world.colliders.all, ...(T.world.colliders.cameraGeometry?.all ?? [])];
  const out = [];
  for (const c of all) {
    const m = /^room:(.+):lintel$/.exec(c.id);
    if (m) out.push({ id: m[1], x: c.x, z: c.z, yaw: c.yaw });
    if (c.id === 'archive_door') out.push({ id: 'archive', x: c.x, z: c.z, yaw: c.yaw });
  }
  return out;`;

const holdW = async (ms, until) => {
  await key('rawKeyDown');
  const end = Date.now() + ms;
  while (Date.now() < end) { await page.wait(60); await key('rawKeyDown', { autoRepeat: true }); if (await until()) break; }
  await key('keyUp');
};

try {
  for (let i = 0; i < 1200 && !(await page.eval('return window.tervain?.mode === "title"').catch(() => false)); i++) await page.wait(250);
  await page.wait(2500);
  const rect = await page.eval(`const b = [...document.querySelectorAll('.menu-choices button')].find((x) => /new/i.test(x.textContent)); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]`);
  for (const type of ['mousePressed', 'mouseReleased']) await page.cdp('Input.dispatchMouseEvent', { type, x: rect[0], y: rect[1], button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  for (let i = 0; i < 2400 && !(await page.eval('const T = window.tervain; return T.mode === "play" && !!T.world && T.loadingEl.classList.contains("off")').catch(() => false)); i++) await page.wait(250);
  await page.wait(8000);
  await page.eval(`const T = window.tervain; T.hud.show(false); T.debugTime?.(${Number(args.hour ?? 11)}); return 1`);
  const info = await page.eval(INSTALL);
  const doors = (await page.eval(DOORS)).filter((d) => !only || only.has(d.id));
  console.log(`rooms ${info.rooms}, wall volumes ${info.walls}, doors ${doors.length}`);
  for (const d of doors) {
    const nx = Math.sin(d.yaw), nz = Math.cos(d.yaw); // outward, building-local +z
    const tx = Math.cos(d.yaw), tz = -Math.sin(d.yaw); // along the front wall
    const runs = [
      ['in', [d.x + nx * 6, d.z + nz * 6], d.yaw + Math.PI, 1],
      ['in-oblique', [d.x + nx * 6 + tx * 1.6, d.z + nz * 6 + tz * 1.6], d.yaw + Math.PI - Math.atan2(1.6, 6), 1],
      ['out', [d.x - nx * 2.6, d.z - nz * 2.6], d.yaw, -1],
    ];
    for (const [label, start, yaw, dir] of runs) {
      await page.eval(`const T = window.tervain; T.player.setPosition(${start[0]}, ${start[1]}, ${yaw}, T.world.terrain); T.cam.reset(); T.cam.yaw = ${yaw}; T.cam.manual = null; window.__cd.rows = []; return 1`);
      await page.wait(900);
      await page.eval('window.__cd.on = true; return 1');
      // In: until the hero is 4 m inside the door line; out: until 6 m outside it.
      await holdW(11000, async () => page.eval(`const p = window.tervain.player, a = (p.x - ${d.x}) * ${nx} + (p.z - ${d.z}) * ${nz}; return ${dir > 0 ? 'a < -3.2' : 'a > 6'}`));
      await page.wait(700);
      await page.eval('window.__cd.on = false; return 1');
      const rows = await page.eval('return window.__cd.rows');
      const bad = rows.filter((r) => r.v), by = {};
      for (const r of bad) for (const k of r.v.split('+')) by[k] = (by[k] ?? 0) + 1;
      report.push({ door: d.id, run: label, frames: rows.length, bad: bad.length, by, first: bad[0] ?? null });
      console.log(`${d.id.padEnd(15)} ${label.padEnd(11)} frames ${String(rows.length).padStart(4)}  violating ${String(bad.length).padStart(4)} ${JSON.stringify(by)}`);
      if (bad.length) failures.push(`${d.id} ${label}: ${bad.length}/${rows.length} ${JSON.stringify(by)}`);
      if (!rows.length) failures.push(`${d.id} ${label}: no frames sampled`);
    }
  }
} catch (e) { failures.push(String(e?.stack ?? e)); } finally { page.close(); }
if (args.json) fs.writeFileSync(args.json, JSON.stringify(report, null, 1));
const total = report.reduce((a, r) => a + r.bad, 0);
console.log(failures.length ? `camera-doors: FAIL (${total} violating frames)\n- ${failures.join('\n- ')}` : 'camera-doors: PASS');
process.exitCode = failures.length ? 1 : 0;
