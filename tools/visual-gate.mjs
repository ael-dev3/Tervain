#!/usr/bin/env node
/**
 * Playtest visual gate: plays the served build on a GPU at the playtest's complaint spots, records a moving clip and
 * fixed stills at each, and runs the automated checks a fix must pass before it is claimed.
 *
 *   node tools/visual-gate.mjs [--url <build>] [--tag <name>] [--out visual-gate-runs] [--profile mac|desktop]
 *                              [--baseline <metrics.json>] [--spots giant,grove,meadow,fence,hearth,sign]
 *
 * Writes <out>/<tag>/: one folder per spot (still-*.jpg, frames/, clip.mp4), metrics.json and report.md (media as
 * MEDIA/<tag>/... for tools/publish-gate.mjs). Checks, each failing the run:
 *  - placement: complete forest-root coverage; more root candidates than --baseline is a regression;
 *    run tools/audit-placement.mjs separately for informational static-prop candidates;
 *  - vault: real-key fence approaches (walk and run, 0°/30°/50°, jump at 1.6/1.0/0.6 m) must all cross;
 *  - bow: the slung bow's limbs and string must stay outside the hero's torso while he walks and runs;
 *  - shimmer: tools/video-shimmer.mjs over grass beside the running hero (sparkle share; compared against --baseline);
 * The frame-time gate stays tools/play-gate.mjs. A visual score per playtest item is the reviewer's, added to the
 * report afterwards; the gate cannot judge art.
 */
import { shimmerVerdict } from './shimmer-verdict.mjs';
import { rootAuditVerdict } from './root-audit-verdict.mjs';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]] : acc), []));
const URL_ = args.url ?? 'https://ael-dev3.github.io/Tervain/';
const TAG = args.tag ?? `vg-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
const OUT = path.join(path.resolve(args.out ?? 'visual-gate-runs'), TAG);
const PROFILE = { mac: { w: 1440, h: 900, dpr: 2 }, desktop: { w: 1280, h: 720, dpr: 1 } }[args.profile ?? 'mac'];
const baseline = args.baseline && fs.existsSync(args.baseline) ? JSON.parse(fs.readFileSync(args.baseline, 'utf8')) : null;

/** The playtest's spots. `hero`: [x, z, yaw]; `still`: fixed cameras [px, py, pz, lx, ly, lz] relative to the hero's
 * ground; `path`: a camera move (start and end camera) for the clip, or `run` to record the hero running through. */
const SPOTS = {
  // The worst floating root flare of the live audit (1.3 m), the playtest's giant tree on the slope by the haystacks.
  giant: { item: 'Trees: giant tree on the slope', hero: [-33.4, 55, 0], hide: true, still: [[0, 1.7, -2, 0, 3, 12], [3, 1.2, 8, 0, .4, 12]], path: [[-6, 1.8, -1, 0, 3, 12], [6, 1.8, 2, 0, 3, 12]] },
  grove: { item: 'Trees: grove crowns and trunks', hero: [-40, 0, -Math.PI / 2], hide: true, still: [[2, 1.7, 1, -10, 4, 0], [0, 1.2, 0, -6, 8, -2]], path: [[3, 1.7, 4, -10, 4, 0], [3, 1.7, -4, -10, 4, 0]] },
  meadow: { item: 'Grass: sparkle and pop-in while moving', hero: [6, 26, 0], still: [[0, 1.9, -3.2, 0, 1, 4], [2, 1.6, -1, 0, .6, 6]], run: 4500 },
  fence: { item: 'Fences: vault in real play', hero: [-4, 49, 0], still: [[2.6, 1.8, -1.5, 0, 1, 2.5]], path: [[3, 1.8, -2, 0, 1, 3], [-3, 1.8, -2, 0, 1, 3]] },
  hearth: { item: 'Interiors: hearth and lived-in room', hero: [-6, -6, 1.6], hide: true, still: [[0, 1.7, 0, 3, 1.4, 0], [0, 1.7, 0, -3, 1.4, 0], [0, 1.7, 0, 0, 1.4, -3]], path: [[-1.5, 1.7, -1, 3, 1.3, 1], [1.5, 1.7, 1, -3, 1.3, -1]] },
  // The inn's hanging sign stands out from its east end, about (0.4, 34.8).
  sign: { item: 'Props: shop sign and supports', hero: [2, 38.5, Math.PI], hide: true, still: [[0, 1.7, 0, -1.6, 2.1, -3.7]], path: [[-2, 1.7, .5, -1.6, 2.1, -3.7], [2, 1.7, .5, -1.6, 2.1, -3.7]] },
};
const chosen = (args.spots ?? Object.keys(SPOTS).join(',')).split(',').filter((s) => SPOTS[s]);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const metrics = { tag: TAG, url: URL_, profile: args.profile ?? 'mac', checks: {}, spots: {} };
const failures = [];
const page = await openPage(URL_, { w: PROFILE.w, h: PROFILE.h, headed: true });
const shotScale = Math.min(1, 1280 / (PROFILE.w * PROFILE.dpr)) * PROFILE.dpr;
const capture = async (file) => {
  const r = await page.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: PROFILE.w, height: PROFILE.h, scale: shotScale / PROFILE.dpr } });
  const data = r?.result?.data ?? r?.data;
  if (data) fs.writeFileSync(file, Buffer.from(data, 'base64'));
};
const keyCodes = { KeyW: 87, ShiftLeft: 16, Space: 32 };
const key = (type, code, extra = {}) => page.cdp('Input.dispatchKeyEvent', { type, code, key: code === 'Space' ? ' ' : code === 'ShiftLeft' ? 'Shift' : code.slice(3).toLowerCase(), windowsVirtualKeyCode: keyCodes[code], ...extra });
const holdWhile = async (codes, ms, each) => {
  for (const c of codes) await key('rawKeyDown', c);
  const end = Date.now() + ms;
  while (Date.now() < end) { if (each) await each(); await page.wait(60); for (const c of codes) if (c !== 'ShiftLeft') await key('rawKeyDown', c, { autoRepeat: true }); }
  for (const c of [...codes].reverse()) await key('keyUp', c);
};
const place = (x, z, yaw) => page.eval(`const T = window.tervain; T.player.setPosition(${x}, ${z}, ${yaw}, T.world.terrain); T.cam.yaw = ${yaw}; T.cam.manual = null; T.player.stamina = 100; return 1`);
const camAt = (hero, c) => page.eval(`const T = window.tervain, V = T.world.scene.position.constructor, y = T.world.terrain.heightAt(${hero[0]}, ${hero[1]});
  T.cam.manual = { p: new V(${hero[0] + c[0]}, y + ${c[1]}, ${hero[1] + c[2]}), look: new V(${hero[0] + c[3]}, y + ${c[4]}, ${hero[1] + c[5]}) }; return 1`);
const encode = (dir, fps = 30) => spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'frames', 'f%04d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-pix_fmt', 'yuv420p', path.join(dir, 'clip.mp4')], { timeout: 300000 }).status === 0;

try {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: PROFILE.w, height: PROFILE.h, deviceScaleFactor: PROFILE.dpr, mobile: false });
  for (let i = 0; i < 1200 && !(await page.eval('return window.tervain?.mode === "title"').catch(() => false)); i++) await page.wait(250);
  await page.wait(2500);
  metrics.build = await page.eval(`return document.querySelector('.menu-build span')?.textContent ?? ''`);
  const rect = await page.eval(`const b = [...document.querySelectorAll('.menu-choices button')].find((x) => /new/i.test(x.textContent)); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]`);
  for (const type of ['mousePressed', 'mouseReleased']) await page.cdp('Input.dispatchMouseEvent', { type, x: rect[0], y: rect[1], button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  for (let i = 0; i < 2400 && !(await page.eval('const T = window.tervain; return T.mode === "play" && !!T.world && T.loadingEl.classList.contains("off")').catch(() => false)); i++) await page.wait(250);
  // Furniture, rooms and far props load after the world opens.
  for (let i = 0; i < 240 && !(await page.eval('let f = false; window.tervain.world.scene.traverse((o) => { if (o.name === "Furniture") f = true; }); return f').catch(() => false)); i++) await page.wait(250);
  await page.wait(12000);
  await page.eval(`const T = window.tervain, S = T.game.state; T.hud.show(false); T.debugTime?.(${Number(args.hour ?? 11)}); S.inventory.hunting_bow = 1; S.inventory.arrow = 6; S.equippedWeapon = 'hunting_bow'; T.player.syncEquipment(T.game); return 1`);

  for (const id of chosen) {
    const spot = SPOTS[id], dir = path.join(OUT, id);
    fs.mkdirSync(path.join(dir, 'frames'), { recursive: true });
    await place(...spot.hero);
    // Scenery spots park the hero out of shot (the game keeps his body visible itself); the cameras stay where they are.
    if (spot.hide) await place(spot.hero[0] + 40, spot.hero[1] + 40, spot.hero[2]);
    await page.wait(2500);
    for (const [k, c] of spot.still.entries()) { await camAt(spot.hero, c); await page.wait(900); await capture(path.join(dir, `still-${k + 1}.jpg`)); }
    let n = 0;
    if (spot.run) {
      // The hero runs through, the ordinary follow camera behind him: the real motion the playtest saw.
      // Screencast frames at their own presentation times: real 60 Hz motion, unlike stepped screenshots.
      await page.eval('window.tervain.cam.manual = null; return 1');
      await page.wait(600);
      const from = page.frames.length;
      await page.cdp('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1, maxWidth: 1280, maxHeight: 800 });
      await holdWhile(['ShiftLeft', 'KeyW'], spot.run);
      await page.cdp('Page.stopScreencast');
      const frames = page.frames.slice(from).filter((f) => f.t), list = [];
      frames.forEach((f, i) => {
        const file = `f${String(n++).padStart(4, '0')}.jpg`;
        fs.writeFileSync(path.join(dir, 'frames', file), Buffer.from(f.data, 'base64'));
        list.push(`file 'frames/${file}'`, `duration ${Math.max(0.001, (frames[i + 1]?.t ?? f.t + 1 / 60) - f.t).toFixed(4)}`);
      });
      fs.writeFileSync(path.join(dir, 'frames.txt'), list.join('\n'));
    } else {
      const [a, b] = spot.path, steps = 90;
      for (let i = 0; i < steps; i++) {
        const u = i / (steps - 1), e = u * u * (3 - 2 * u), c = a.map((v, k) => v + (b[k] - v) * e);
        await camAt(spot.hero, c); await page.wait(34);
        await capture(path.join(dir, 'frames', `f${String(n++).padStart(4, '0')}.jpg`));
      }
    }
    const clip = spot.run ? spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'frames.txt', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-fps_mode', 'vfr', '-pix_fmt', 'yuv420p', 'clip.mp4'], { cwd: dir, timeout: 300000 }).status === 0 : encode(dir);
    metrics.spots[id] = { item: spot.item, stills: spot.still.length, frames: n, clip };
  }
  await page.eval('window.tervain.cam.manual = null; return 1');

  // Bow: limbs and string outside the torso while he walks and runs.
  // Equip right here: a new journey's opening can reset what was equipped at load.
  await page.eval(`const T = window.tervain, S = T.game.state; S.inventory.hunting_bow = 1; S.inventory.arrow = 6; S.equippedWeapon = 'hunting_bow'; T.player.syncEquipment(T.game); return 1`);
  await place(-4, 40, 0); await page.wait(1200);
  const torsoHits = { walk: 0, run: 0, samples: 0 };
  const sampleBow = (gait) => page.eval(`const T = window.tervain, P = T.player, V = T.world.scene.position.constructor;
    let bow = null, hips = null, neck = null; T.world.scene.traverse((o) => { if (o.name === 'Hunting / bent ash bow in left palm') bow = o; });
    // The hero's own torso: up from the slung bow to his hips (other rigs share the bone names), then his neck below them.
    for (let a = bow; a && !hips; a = a.parent) if (/Hips$/.test(a.name)) hips = a;
    hips?.traverse((o) => { if (!neck && /Neck$/.test(o.name)) neck = o; });
    // Shoulders stand out beyond the torso: each from its shoulder joint to the upper arm, 9 cm about that line.
    const shoulders = []; hips?.traverse((o) => { if (/(Left|Right)Shoulder$/.test(o.name)) { const arm = o.children.find((c) => /(Left|Right)Arm$/.test(c.name)); if (arm) shoulders.push([o, arm]); } });
    if (!bow || !bow.visible || !hips || !neck) return [0, 0, !bow ? 'no bow' : !bow.visible ? 'bow hidden' : 'no torso bones'];
    const a = hips.getWorldPosition(new V()), b = neck.getWorldPosition(new V()), ab = b.clone().sub(a), len = ab.length(); ab.normalize();
    let inside = 0, n = 0;
    bow.updateWorldMatrix(true, true);
    for (let i = 0; i <= 12; i++) for (const z of [-.14, 0]) {
      const y = -.65 + i * 1.3 / 12, x = z === 0 ? 0.055 * Math.cos(y * 2.4) - 0.04 : 0;
      const p = bow.localToWorld(new V(0, y, z === 0 ? x : -.14)), t = Math.max(0, Math.min(len, p.clone().sub(a).dot(ab)));
      const d = p.distanceTo(a.clone().addScaledVector(ab, t));
      let inShoulder = false;
      for (const [sh, arm] of shoulders) {
        const s0 = sh.getWorldPosition(new V()), s1 = arm.getWorldPosition(new V()), sd = s1.clone().sub(s0), sl = sd.length(); sd.normalize();
        const st = Math.max(0, Math.min(sl, p.clone().sub(s0).dot(sd)));
        if (p.distanceTo(s0.clone().addScaledVector(sd, st)) < 0.09) inShoulder = true;
      }
      n++; if (d < 0.13 || inShoulder) inside++;
    }
    return [inside, n];`);
  for (const [gait, codes] of [['walk', ['KeyW']], ['run', ['ShiftLeft', 'KeyW']]]) {
    await holdWhile(codes, 2500, async () => { const [inside, n, why] = await sampleBow(gait); torsoHits[gait] += inside; torsoHits.samples += n; if (why) torsoHits.why = why; });
  }
  metrics.checks.bow = { ...torsoHits, pass: torsoHits.samples > 0 && torsoHits.walk + torsoHits.run === 0 };
  if (!metrics.checks.bow.pass) failures.push(torsoHits.samples ? `bow inside the torso on ${torsoHits.walk + torsoHits.run} of ${torsoHits.samples} samples` : `bow check found no slung bow to sample (${torsoHits.why})`);

  // Fence vault: every approach must cross.
  const vaults = [];
  for (const run of [false, true]) for (const deg of [0, 30, 50]) for (const at of [1.6, 1.0, 0.6]) {
    const yaw = deg * Math.PI / 180, start = run ? 8 : 4;
    await place(-4 - Math.sin(yaw) * start, 53.2 - Math.cos(yaw) * start, yaw);
    await page.wait(600);
    let pressed = false;
    if (run) await key('rawKeyDown', 'ShiftLeft');
    await key('rawKeyDown', 'KeyW');
    const end = Date.now() + 5000;
    while (Date.now() < end) {
      const z = await page.eval('return window.tervain.player.z');
      if (!pressed && 53.2 - z < at + 0.12) { await key('rawKeyDown', 'Space'); await page.wait(60); await key('keyUp', 'Space'); pressed = true; }
      if (z > 54.6) break;
      await key('rawKeyDown', 'KeyW', { autoRepeat: true }); await page.wait(30);
    }
    await key('keyUp', 'KeyW'); if (run) await key('keyUp', 'ShiftLeft');
    vaults.push({ run, deg, at, over: (await page.eval('return window.tervain.player.z')) > 54.4 });
  }
  const crossed = vaults.filter((v) => v.over).length;
  metrics.checks.vault = { crossed, of: vaults.length, failed: vaults.filter((v) => !v.over), pass: crossed === vaults.length };
  if (!metrics.checks.vault.pass) failures.push(`fence vault crossed ${crossed} of ${vaults.length}`);

  // Complete root population audit, against the baseline's candidate count. --skip-audit for quick diagnostic runs.
  if (args['skip-audit'] !== 'true') {
  const r = await page.cdp('Runtime.evaluate', { expression: '(async () => window.tervain.auditPlacement ? JSON.stringify(await window.tervain.auditPlacement({ clearance: .08, maxChecks: 100000, kind: "root" })) : null)()', awaitPromise: true, returnByValue: true, timeout: 600000 });
  const auditText = r?.result?.result?.value;
  if (auditText) {
    const audit = JSON.parse(auditText);
    fs.writeFileSync(path.join(OUT, 'placement-audit.json'), auditText);
    const worst = (kind) => audit.checks.filter((c) => c.kind === kind && c.candidate).sort((a, b) => b.maxGap - a.maxGap).slice(0, 8)
      .map((c) => ({ label: c.label, at: c.position.map((v) => +v.toFixed(1)), gap: +(kind === 'root' ? c.maxGap : c.minGap).toFixed(2) }));
    metrics.checks.placement = { ...audit.summary, complete: audit.complete, roots: worst('root'), props: worst('prop') };
    // Tree roots are the regression check: prop candidates include large merged meshes (building timbers seen from below)
    // that need a reviewer, so they are listed, not counted.
    const verdict = rootAuditVerdict(audit, baseline?.checks?.placement?.rootCandidates);
    Object.assign(metrics.checks.placement, verdict);
    if (!verdict.pass) failures.push(`tree-root check failed: ${verdict.reason}`);
  } else {
    metrics.checks.placement = { pass: false, reason: 'missing-placement-audit' };
    failures.push('tree-root check missing its placement audit');
  }
  } else metrics.checks.placement = { skipped: 'audit skipped' };
} finally {
  page.close();
}

// Recorded shimmer requires successfully decoded, usable footage; missing data cannot prove a regression absent.
const meadowClip = path.join(OUT, 'meadow', 'clip.mp4');
if (fs.existsSync('tools/video-shimmer.mjs') && fs.existsSync(meadowClip)) {
  const out = path.join(OUT, 'shimmer.json');
  fs.rmSync(out, { force: true }); // A failed decoder must not reuse a previous run's receipt.
  const run = spawnSync('node', ['tools/video-shimmer.mjs', '--input', meadowClip, '--roi', '0.03,0.66,0.34,0.32', '--fps', '30', '--out', out], { encoding: 'utf8', timeout: 600000 });
  let shimmer;
  try { shimmer = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null; } catch { shimmer = null; }
  const verdict = shimmerVerdict(run.status, shimmer, baseline?.checks?.shimmer?.score);
  metrics.checks.shimmer = { ...verdict, ...(shimmer?.summary ? { raw: { ...shimmer.summary, peaks: undefined } } : {}) };
  if (!verdict.pass) failures.push(`grass shimmer check failed: ${verdict.reason}`);
} else {
  metrics.checks.shimmer = { score: null, pass: false, reason: 'missing-tool-or-clip' };
  failures.push('grass shimmer check missing its tool or recorded clip');
}

metrics.pass = failures.length === 0;
metrics.failures = failures;
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 1));
const md = [`### Visual gate ${TAG}: ${metrics.pass ? 'checks pass' : 'FAIL'} · ${metrics.build}`, '', `URL ${URL_} · profile ${metrics.profile}`, ''];
for (const f of failures) md.push(`- ✗ ${f}`);
const c = metrics.checks;
md.push('', `- Fence vault: ${c.vault?.crossed}/${c.vault?.of} approaches crossed`, `- Bow in torso: ${c.bow ? `${c.bow.walk + c.bow.run} of ${c.bow.samples} samples` : 'n/a'}`,
  `- Floating tree roots: ${c.placement?.rootCandidates ?? '–'} (worst: ${(c.placement?.roots ?? []).slice(0, 3).map((r) => `${r.at[0]}, ${r.at[2]} gap ${r.gap} m`).join('; ')})`,
  `- Grass shimmer: ${c.shimmer?.score ?? c.shimmer?.skipped ?? '–'}`, '');
for (const [id, s] of Object.entries(metrics.spots)) {
  md.push(`#### ${s.item}`, '', `Clip: MEDIA/${TAG}/${id}/clip.mp4`, ...Array.from({ length: s.stills }, (_, k) => `- MEDIA/${TAG}/${id}/still-${k + 1}.jpg`), '');
}
fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n'));
console.log(md.join('\n'));
process.exit(metrics.pass ? 0 : 1);
