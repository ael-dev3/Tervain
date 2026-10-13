#!/usr/bin/env node
/**
 * Continue gate (0.0.17): a saved game must come back on its feet. Starts a journey, saves, reloads the page, takes the
 * menu's Continue and checks that the hero stands on or above the ground, is drawn and the camera is above the land.
 * Repeats with a save whose height lies 3 m under the ground (what an old save looks like after the land changed).
 *
 *   node tools/continue-gate.mjs [--url https://ael-dev3.github.io/Tervain/]
 */
import { openPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((a, i, all) => a.startsWith('--') ? [[a.slice(2), all[i + 1]]] : []));
const URL_ = args.url ?? 'http://127.0.0.1:4173/';
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

async function round(label, bury) {
  await waitTitle();
  if (!(await click('/continue/i'))) { await click('/new/i'); await page.wait(400); await click('/yes|start|begin|confirm/i'); }
  await waitPlay(); await page.wait(2000);
  // A spot on open land away from the arrival strand, so the round trip is not just the fresh spawn.
  await page.eval(`const T = window.tervain; T.player.setPosition(6, 26, 0, T.world.terrain); return 1`);
  await page.wait(1500);
  if (bury) await page.eval(`const T = window.tervain, p = T.player, g = T.world.terrain.groundAt(p.x, p.z); p.y = g - 3; p.rig.root.position.y = p.y; return 1`);
  const saved = await page.eval(`return window.tervain.saveTo('slot-1')`);
  if (!saved?.ok) { failures.push(`${label}: save failed (${saved?.message})`); return; }
  await page.eval('setTimeout(() => location.reload(), 50); return 1').catch(() => {});
  await page.wait(3000); await waitTitle();
  if (!(await click('/continue/i'))) { failures.push(`${label}: no Continue on the menu (${(await choices()).join(' | ')})`); return; }
  await waitPlay();
  for (const wait of [500, 3000]) {
    await page.wait(wait);
    const s = await probe();
    const line = `${label} +${wait} ms: hero (${s.x.toFixed(1)}, ${s.y.toFixed(2)}, ${s.z.toFixed(1)}) ground ${s.ground.toFixed(2)} camera ${s.camY.toFixed(2)} over ${s.camGround.toFixed(2)} drawn ${s.visible}`;
    console.log(line);
    if (!s.swimming && s.y < s.ground - 0.3) failures.push(`${label}: hero beneath the ground — ${line}`);
    if (s.camY < s.camGround - 0.05) failures.push(`${label}: camera beneath the ground — ${line}`);
    if (!s.visible) failures.push(`${label}: hero not drawn — ${line}`);
  }
}

try {
  await round('save and Continue', false);
  await round('save under the land and Continue', true);
} catch (e) {
  failures.push(String(e?.message ?? e));
} finally {
  page.close();
}
console.log(failures.length ? `continue-gate: FAIL\n- ${failures.join('\n- ')}` : 'continue-gate: PASS');
process.exitCode = failures.length ? 1 : 0;
