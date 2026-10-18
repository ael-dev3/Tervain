#!/usr/bin/env node
/**
 * The play gate: plays the hosted build the way a player does and fails on what a player would see.
 *
 *   node tools/play-gate.mjs [--url https://ael-dev3.github.io/Tervain/] [--profile desktop|mac|all]
 *                            [--against main|head|<sha>|none] [--tag name] [--out dir] [--video false]
 *
 * 1. The served build's version.json must name the commit it is checked against (main by default), and the page
 *    itself must print that commit, so a stale page or a stale deploy fails before anything is played.
 * 2. Real input through the browser (keys and mouse buttons, not game calls): new journey, pause and resume, walk and
 *    run along the fence and round the house turning the camera, inside a house looking out of the window, aim and loose
 *    the bow. Only placing the hero at each stage's start is done by script.
 * 3. Every presented frame records its time, whether the hero is drawn, the camera distance, the hero's pose and where
 *    he lands on screen; long tasks and console errors are collected; the screen is recorded to clip.mp4.
 * 4. It fails on: the hero hidden while the camera is not pressed against him, visibility flicker, a broken or jumping
 *    pose, frame-time spikes, uneven pacing, a 95th-percentile frame over budget, long tasks, or console errors.
 *
 * Profiles: `desktop` is a 1280×720 window at 1× on this machine's GPU. `mac` is a MacBook's 1440×900 window at 2×
 * (Retina pixel count). It cannot reproduce an Apple GPU under ANGLE and Metal; `--mac-cpu 2` adds a slower main thread
 * as a stress case. Run it on an otherwise idle machine: a test suite running alongside skews every frame time.
 *
 * Exit code 0 only when every profile passes. Reports go to <out>/<tag>-<profile>/ (report.md, report.json, clip.mp4).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';
import { textureUploadBytes } from './webgl-upload-bytes.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]] : acc), []));
const URL_ = args.url ?? 'https://ael-dev3.github.io/Tervain/';
const AGAINST = args.against ?? 'main';
const TAG = args.tag ?? new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.resolve(args.out ?? 'play-gate-runs');
const VIDEO = args.video !== 'false';
// Deterministic budget gate (the rule in docs/perf/LATEST.md): `--budget-url <live>` probes the live build and the candidate at
// the same spot, reads draw calls and triangles from the renderer, and collects console errors. PASS requires the candidate's
// draws and triangles not above live, no console errors or crashes, and the served revision equal to `--head`. Texture taps,
// shader cost and JS frame CPU are not visible to the page: each PR posts its own cost table, and the gate says so. Wall-clock
// pacing (over-25 ms share, p95) is printed as advisory only, next to the A/A noise band, and never decides the result.
if (args['budget-url']) {
  const probe = async (url) => {
    const page = await openPage(url + '?shot=1&quality=high&settle=1&hud=0', { w: 1440, h: 900, headed: true });
    try {
      await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
      for (let i = 0; i < 1200 && !(await page.eval('return window.tervain?.mode === "title"').catch(() => false)); i++) await page.wait(250);
      await page.wait(2500);
      const rect = await page.eval(`const b = [...document.querySelectorAll('.menu-choices button')].find((x) => /new/i.test(x.textContent)); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]`);
      for (const type of ['mousePressed', 'mouseReleased']) await page.cdp('Input.dispatchMouseEvent', { type, x: rect[0], y: rect[1], button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
      for (let i = 0; i < 2400 && !(await page.eval('const T = window.tervain; return T.mode === "play" && !!T.world && T.loadingEl.classList.contains("off")').catch(() => false)); i++) await page.wait(250);
      await page.wait(15000);
      await page.eval(`const T = window.tervain; T.hud.show(false); T.debugTime?.(11); T.player.setPosition(-33.4, 55, 0, T.world.terrain); T.cam.yaw = 0; T.cam.manual = null; return 1`);
      await page.wait(6000);
      const samples = [];
      for (let k = 0; k < 4; k++) { await page.wait(1500); samples.push(await page.eval('const r = window.tervain.renderer.info.render; return [r.calls, r.triangles]')); }
      const version = await page.eval('return fetch(new URL("version.json", document.baseURI)).then((r) => r.json()).catch(() => null)');
      const errors = page.console().filter((l) => l.startsWith('[error]') || l.startsWith('[exception]'));
      const calls = Math.max(...samples.map((x) => x[0])), triangles = Math.max(...samples.map((x) => x[1]));
      return { url, calls, triangles, errors, revision: version?.revision ?? null, samples, stable: true };
    } finally { page.close?.(); }
  };
  // Live is probed twice: its own run-to-run spread (a dynamic draw can appear in one run and not the next) is the band the candidate is compared against.
  const liveA = await probe(args['budget-url']), liveB = await probe(args['budget-url']);
  const live = { ...liveA, calls: Math.max(liveA.calls, liveB.calls), triangles: Math.max(liveA.triangles, liveB.triangles), errors: [...liveA.errors, ...liveB.errors] };
  const candidate = await probe(URL_);
  const headOk = !args.head || (candidate.revision !== null && args.head.startsWith(candidate.revision));
  // --tri-allowance: an owner-approved triangle exception over live (0 by default), recorded in the PR.
  const triAllowance = Number(args['tri-allowance'] ?? 0);
  const drawsOk = candidate.calls <= live.calls, trisOk = candidate.triangles <= live.triangles + triAllowance;
  const errorsOk = candidate.errors.length === 0 && live.errors.length === 0;
  const ok = drawsOk && trisOk && errorsOk && headOk;
  const out = [
    `# Budget gate: ${ok ? 'PASS' : 'FAIL'}`, '',
    `- Live (${live.url}, revision ${live.revision}): draw calls ${live.calls}, triangles ${live.triangles}, console errors ${live.errors.length}`,
    `- Candidate (${candidate.url}, revision ${candidate.revision}): draw calls ${candidate.calls}, triangles ${candidate.triangles}, console errors ${candidate.errors.length}`,
    `- Draws not above live: ${drawsOk ? 'yes' : 'NO'}; triangles not above live: ${trisOk ? 'yes' : 'NO'}; no console errors: ${errorsOk ? 'yes' : 'NO'}; revision matches head ${args.head ?? '(not given)'}: ${headOk ? 'yes' : 'NO'}; maximum over four samples; live is the larger of two live probes`,
    '- Not measured by the page: texture taps, shader cost, JS frame CPU. Each PR posts its own cost table; the gate does not claim them.',
    '- Wall-clock pacing (over-25 ms share, p95): advisory only, see docs/perf/LATEST.md (A/A band 1.7 points). Not a pass/fail condition.', '',
  ];
  if (ok && args.head) out.push(`play-gate: PASS ${candidate.revision}`);
  console.log(out.join('\n'));
  process.exit(ok ? 0 : 1);
}
const PROFILES = {
  desktop: { w: 1280, h: 720, dpr: 1, cpu: 1, p95: 20 },
  mac: { w: 1440, h: 900, dpr: 2, cpu: Number(args['mac-cpu'] ?? 1), p95: 20 },
};
const chosen = (args.profile ?? 'all') === 'all' ? Object.keys(PROFILES) : [args.profile];

/** Thresholds for a 60 Hz display (16.7 ms a frame). */
const LIMITS = {
  spikeMs: 50, maxSpikes: 2, hardSpikeMs: 100, slowFrameShare: 0.03, slowFrameMs: 25,
  longTaskMs: 100, maxLongTasks: 3, flickerTogglesPerSecond: 4, screenJump: 0.25, minHeadAboveRoot: 0.8, minUpright: 0.9,
};

/** A/A noise band on this machine, as a share of frames over 25 ms (docs/perf/LATEST.md). */
const WALL_BAND = 0.017;

function expectedRevision() {
  if (AGAINST === 'none') return null;
  if (AGAINST === 'head') return execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
  if (AGAINST === 'main') return execFileSync('git', ['ls-remote', 'origin', 'refs/heads/main']).toString().split(/\s/)[0];
  return AGAINST;
}

async function staleCheck() {
  const want = expectedRevision();
  let live = null;
  try {
    const r = await fetch(new URL(`version.json?t=${Date.now()}`, URL_), { cache: 'no-store' });
    if (r.ok) live = await r.json();
  } catch { /* reported below */ }
  const ok = want === null || (!!live?.revision && want.startsWith(live.revision));
  return { want, live, ok, note: want === null ? 'not checked (--against none)' : ok ? 'served build matches' : `served ${live?.revision ?? 'no version.json'}, expected ${want.slice(0, 9)}` };
}

const quantile = (v, q) => { if (!v.length) return 0; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

const SAMPLER = `
  const T = window.tervain, R = T.renderer, render = R.render.bind(R), P = T.player;
  const V = T.world.scene.position.constructor, Q = T.world.scene.quaternion.constructor;
  const hips = new V(), head = new V(), root = new V(), up = new V(), q = new Q(), ndc = new V();
  window.__gate = { samples: [], longTasks: [], phase: 'setup', shots: [], upload: 0, frameStart: performance.now(), afterShot: false, last: 0 };
  // Main-thread time per frame: from the animation frame's start to the presented draw.
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { window.__gate.frameStart = performance.now(); cb(t); });
  // GPU uploads per frame: buffer and texture bytes handed to WebGL.
  const textureUploadBytes = ${textureUploadBytes.toString()};
  const gl = R.getContext(), bytesOf = (v) => !v ? 0 : typeof v === 'number' ? v : v.byteLength ?? ((v.width ?? v.videoWidth ?? 0) * (v.height ?? v.videoHeight ?? 0) * 4);
  for (const name of ['bufferData', 'bufferSubData']) { const f = gl[name].bind(gl); gl[name] = (...a) => { window.__gate.upload += name === 'bufferData' ? bytesOf(a[1]) : (a[4] ? a[4] * (a[2]?.BYTES_PER_ELEMENT ?? 1) : bytesOf(a[2])); return f(...a); }; }
  for (const name of ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'compressedTexImage2D', 'compressedTexSubImage2D']) { if (!gl[name]) continue; const f = gl[name].bind(gl);
    gl[name] = (...a) => { window.__gate.upload += textureUploadBytes(name, a); return f(...a); }; }
  const shotCanvas = document.createElement('canvas'); shotCanvas.width = 480; shotCanvas.height = 270; const shotCtx = shotCanvas.getContext('2d');
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__gate.longTasks.push([e.startTime, e.duration, window.__gate.phase]); }).observe({ type: 'longtask', buffered: false }); } catch {}
  const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  let body = null; P.group.traverse((o) => { if (o.isSkinnedMesh) body = o; });
  R.render = function (scene, camera) {
    const out = render(scene, camera);
    if (R.getRenderTarget() === null) {
      const cam = T.cam.camera; P.rig.hips.getWorldPosition(hips); P.rig.head.getWorldPosition(head); P.rig.root.getWorldPosition(root);
      P.rig.root.getWorldQuaternion(q); up.set(0, 1, 0).applyQuaternion(q);
      ndc.copy(hips).project(cam);
      window.__gate.samples.push([document.timeline.currentTime ?? performance.now(), window.__gate.phase, shown(body) ? 1 : 0, +(T.cam.curDist ?? 0).toFixed(3), +up.y.toFixed(3),
        +(head.y - root.y).toFixed(3), +ndc.x.toFixed(3), +ndc.y.toFixed(3), T.simStep, P.swimming ? 1 : 0, R.getPixelRatio(), T.cam.bodyVisible ? 1 : 0,
        +(performance.now() - window.__gate.frameStart).toFixed(2), window.__gate.upload, window.__gate.afterShot ? 1 : 0, (window.__gate.settle > 0 ? (window.__gate.settle--, 1) : 0) || (T.cam.aimBlend > 0.001 && T.cam.aimBlend < 0.999 ? 1 : 0)]);
      const g = window.__gate, now = g.samples.at(-1)[0], interval = g.last ? now - g.last : 0;
      const paid = g.afterShot; g.last = now; g.upload = 0; g.afterShot = false;
      // Recorded runs only: a synchronous canvas readback/JPEG encode must not perturb a --video false timing run.
      // What was on screen at a spike: a small still right after it, and where the hero and camera were. The next frame
      // carries the still's own cost and is left out of the timing.
      if (${VIDEO} && interval > 25 && !paid && g.shots.length < 8 && !['setup', 'pause', 'end'].includes(g.phase)) {
        shotCtx.drawImage(R.domElement, 0, 0, 480, 270);
        const c = cam.position;
        g.shots.push({ t: now, phase: g.phase, ms: +interval.toFixed(1), hero: [+P.x.toFixed(1), +P.z.toFixed(1)], camera: [+c.x.toFixed(1), +c.y.toFixed(1), +c.z.toFixed(1)], image: shotCanvas.toDataURL('image/jpeg', 0.72) });
        g.afterShot = true;
      }
    }
    return out;
  };
  return 1;`;

async function runProfile(name) {
  const prof = PROFILES[name];
  const dir = path.join(OUT, `${TAG}-${name}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'frames'), { recursive: true });
  let page;
  const failures = [];
  const notes = [];
  const keyCode = { KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, KeyZ: 90, KeyC: 67, ShiftLeft: 16, Escape: 27 };
  const key = (type, code) => page.cdp('Input.dispatchKeyEvent', { type, code, key: code === 'Escape' ? 'Escape' : code === 'ShiftLeft' ? 'Shift' : code.slice(3).toLowerCase(), windowsVirtualKeyCode: keyCode[code] ?? 0 });
  const hold = async (codes, ms) => {
    for (const c of codes) await key('rawKeyDown', c);
    const end = Date.now() + ms;
    while (Date.now() < end) { await page.wait(100); for (const c of codes) if (c !== 'ShiftLeft') await page.cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: c, key: c.slice(3).toLowerCase(), autoRepeat: true, windowsVirtualKeyCode: keyCode[c] }); }
    for (const c of [...codes].reverse()) await key('keyUp', c);
  };
  const tap = async (code) => { await key('rawKeyDown', code); await page.wait(60); await key('keyUp', code); };
  const mouse = (type, button = 'left') => page.cdp('Input.dispatchMouseEvent', { type, x: prof.w / 2, y: prof.h / 2, button, buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  const phase = (p) => page.eval(`window.__gate.phase = ${JSON.stringify(p)}; return 1`);
  // The script, not the player, moves the hero here: the frames after it (and the designed aim swing of the camera) are marked so the jump check does not count the camera catching up.
  const place = (x, z, yaw) => page.eval(`const T = window.tervain; T.player.setPosition(${x}, ${z}, ${yaw}, T.world.terrain); T.cam.yaw = ${yaw}; window.__gate.settle = 4; return 1`);
  try {
    page = await openPage(URL_, { w: prof.w, h: prof.h, headed: true });
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: prof.w, height: prof.h, deviceScaleFactor: prof.dpr, mobile: false });
    if (prof.cpu > 1) await page.cdp('Emulation.setCPUThrottlingRate', { rate: prof.cpu });
    for (let i = 0; i < 1200 && !(await page.eval('return window.tervain?.mode === "title"').catch(() => false)); i++) await page.wait(250);
    await page.wait(3000);
    const printed = await page.eval(`return document.querySelector('.menu-build span')?.textContent ?? ''`);
    // Start a journey with a real click on the menu's first choice.
    const rect = await page.eval(`const b = [...document.querySelectorAll('.menu-choices button')].find((x) => /new/i.test(x.textContent)); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]`);
    await page.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect[0], y: rect[1], button: 'left', buttons: 1, clickCount: 1 });
    await page.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect[0], y: rect[1], button: 'left', buttons: 0, clickCount: 1 });
    for (let i = 0; i < 2400 && !(await page.eval('const T = window.tervain; return T.mode === "play" && !!T.world && T.loadingEl.classList.contains("off")').catch(() => false)); i++) await page.wait(250);
    await page.wait(2000);
    await page.eval(SAMPLER);
    page.console();
    if (VIDEO) await page.cdp('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1, maxWidth: 1280, maxHeight: 800 });
    await page.wait(500);

    await phase('pause'); await tap('Escape'); await page.wait(1200);
    await phase('resume'); await tap('Escape'); await page.wait(1500);

    await phase('setup'); await place(-2, 40, Math.PI); await page.wait(1200);
    await phase('walk-fence'); await hold(['KeyW'], 4000);
    await phase('turn-walk'); await hold(['KeyW', 'KeyC'], 2000);
    await phase('run-fence'); await hold(['KeyW', 'ShiftLeft'], 4000);
    await phase('run-turn'); await hold(['KeyW', 'ShiftLeft', 'KeyZ'], 2500);
    await phase('run-round'); await hold(['KeyW', 'ShiftLeft', 'KeyD'], 3000);

    await phase('setup'); await place(-5.43, -5.58, Math.atan2(-2.9 + 5.43, -1.0 + 5.58)); await page.wait(1200);
    await phase('inside-window'); await hold(['KeyC'], 3000); await hold(['KeyW'], 800); await hold(['KeyZ'], 2000);

    await phase('setup');
    await page.eval(`const T = window.tervain, S = T.game.state; S.inventory.hunting_bow = 1; S.inventory.arrow = 6; S.equippedWeapon = 'hunting_bow'; T.player.syncEquipment(T.game); return 1`);
    await place(-4, 46, 0); await page.wait(1200);
    await phase('bow');
    for (let i = 0; i < 2; i++) { await mouse('mousePressed'); await hold(['KeyC'], 1500); await mouse('mouseReleased'); await page.wait(800); }
    await phase('end'); await page.wait(300);
    if (VIDEO) await page.cdp('Page.stopScreencast');

    const gate = await page.eval('return window.__gate');
    const logs = page.console().filter((l) => l.startsWith('[error]') || l.startsWith('[exception]'));
    fs.writeFileSync(path.join(dir, 'samples.json'), JSON.stringify(gate));

    // Clip: presented frames at their own timestamps.
    const frames = page.frames.filter((f) => f.t);
    const list = [];
    frames.forEach((f, i) => {
      const file = `f${String(i).padStart(5, '0')}.jpg`;
      fs.writeFileSync(path.join(dir, 'frames', file), Buffer.from(f.data, 'base64'));
      const next = frames[i + 1]?.t ?? f.t + 1 / 60;
      list.push(`file 'frames/${file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
    });
    fs.writeFileSync(path.join(dir, 'frames.txt'), list.join('\n'));
    const enc = VIDEO && frames.length > 0
      ? spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'frames.txt', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-fps_mode', 'vfr', '-pix_fmt', 'yuv420p', 'clip.mp4'], { cwd: dir, timeout: 300000 })
      : { status: null };
    if (enc.status === 0) fs.rmSync(path.join(dir, 'frames'), { recursive: true, force: true });

    // Optional video diagnostics are computed after recording, never during a timing-only run.
    let shimmer;
    if (args['shimmer-roi']) {
      if (!VIDEO || enc.status !== 0) throw new Error('Shimmer diagnostics require an encoded recorded run');
      const { analyzeVideo } = await import('./video-shimmer.mjs');
      shimmer = await analyzeVideo(path.join(dir, 'clip.mp4'), {
        roi: args['shimmer-roi'].split(',').map(Number),
        start: Number(args['shimmer-start'] ?? 0),
        maxFrames: Number(args['shimmer-max-frames'] ?? 1800),
      });
      fs.writeFileSync(path.join(dir, 'shimmer.json'), JSON.stringify(shimmer, null, 2));
      if (!shimmer.summary.usableFrames) throw new Error('Shimmer ROI has no usable aligned frames');
    }

    // Judge.
    const S = gate.samples.map(([t, ph, vis, dist, upY, headUp, nx, ny, step, swim, pr, want, busy, upload, shot, placed]) => ({ t, ph, vis, dist, upY, headUp, nx, ny, step, swim, pr, want, busy, upload, shot, placed }));
    const play = S.filter((s) => !['setup', 'pause', 'end'].includes(s.ph));
    const timed = [];
    const timedAt = [];
    for (let i = 1; i < S.length; i++) if (S[i].ph === S[i - 1].ph && !['setup', 'pause', 'end'].includes(S[i].ph) && !S[i].shot) { timed.push(S[i].t - S[i - 1].t); timedAt.push(i); }
    const p95 = quantile(timed, 0.95), median = quantile(timed, 0.5);
    const spikes = timed.filter((d) => d > LIMITS.spikeMs);
    const slowShare = timed.filter((d) => d > LIMITS.slowFrameMs).length / Math.max(1, timed.length);
    // The game's own rule for showing him (the camera clear of his body), not a distance rounded for the log.
    const hidden = play.filter((s) => !s.vis && s.want);
    const closeHidden = play.filter((s) => !s.vis && !s.want).length;
    let worstToggles = 0;
    for (let i = 0; i < play.length; i++) {
      let n = 0;
      for (let j = i + 1; j < play.length && play[j].t - play[i].t < 1000; j++) if (play[j].vis !== play[j - 1].vis) n++;
      worstToggles = Math.max(worstToggles, n);
    }
    const badPose = play.filter((s) => !s.swim && (s.upY < LIMITS.minUpright || s.headUp < LIMITS.minHeadAboveRoot));
    let jumps = 0;
    for (let i = 1; i < play.length; i++) if (play[i].ph === play[i - 1].ph && !play[i].placed && !play[i - 1].placed && play[i].vis && play[i - 1].vis && Math.hypot(play[i].nx - play[i - 1].nx, play[i].ny - play[i - 1].ny) > LIMITS.screenJump) jumps++;
    const longTasks = gate.longTasks.filter(([, , ph]) => !['setup', 'pause', 'end'].includes(ph));
    const fail = (cond, msg) => { if (cond) failures.push(msg); };
    fail(hidden.length > 0, `hero hidden on ${hidden.length} frames with the camera clear of him`);
    fail(worstToggles > LIMITS.flickerTogglesPerSecond, `hero visibility flips ${worstToggles} times within one second`);
    fail(badPose.length > 0, `hero pose broken on ${badPose.length} frames (tilted or collapsed)`);
    // Advisory lines: printed with the A/A noise band, never a pass/fail on their own.
    const advise = (cond, msg) => { if (cond) notes.push(msg); };
    advise(jumps > 0, `hero jumps across the screen on ${jumps} frames (advisory)`);
    advise(p95 > prof.p95, `p95 frame ${p95.toFixed(1)} ms over ${prof.p95} ms (advisory, A/A band ${(WALL_BAND * 100).toFixed(1)} points)`);
    // Pacing fails only beyond twice the A/A band; a frame over hardSpikeMs is a freeze and always fails.
    fail(spikes.some((d) => d > LIMITS.hardSpikeMs), `a frame over ${LIMITS.hardSpikeMs} ms (longest ${Math.max(0, ...timed).toFixed(0)} ms)`);
    advise(spikes.length > LIMITS.maxSpikes, `${spikes.length} frames over ${LIMITS.spikeMs} ms (advisory)`);
    fail(slowShare > LIMITS.slowFrameShare + 2 * WALL_BAND, `${(slowShare * 100).toFixed(1)}% of frames over ${LIMITS.slowFrameMs} ms (beyond twice the A/A band)`);
    advise(slowShare > LIMITS.slowFrameShare, `${(slowShare * 100).toFixed(1)}% of frames over ${LIMITS.slowFrameMs} ms (advisory, A/A band ${(WALL_BAND * 100).toFixed(1)} points)`);
    fail(longTasks.length > LIMITS.maxLongTasks || longTasks.some(([, d]) => d > LIMITS.longTaskMs), `${longTasks.length} long tasks in play (longest ${Math.max(0, ...longTasks.map(([, d]) => d)).toFixed(0)} ms)`);
    fail(logs.length > 0, `${logs.length} console errors: ${logs.slice(0, 3).join(' | ')}`);

    const perPhase = {};
    for (const ph of [...new Set(play.map((s) => s.ph))]) {
      const d = []; const ss = S.filter((s) => s.ph === ph);
      for (let i = 1; i < ss.length; i++) d.push(ss[i].t - ss[i - 1].t);
      perPhase[ph] = { frames: ss.length, median: +quantile(d, 0.5).toFixed(1), p95: +quantile(d, 0.95).toFixed(1), max: +Math.max(0, ...d).toFixed(1) };
    }
    // Data for the live GPU log (issue #320): the frame-time tail, main-thread idle share, uploads, spikes with context.
    const busy = timedAt.map((i) => S[i].busy).filter((b) => Number.isFinite(b));
    const idle = 1 - busy.reduce((a, b) => a + b, 0) / Math.max(1, timed.reduce((a, b) => a + b, 0));
    const uploads = play.map((s) => s.upload ?? 0);
    const spikeList = timedAt.filter((i, k) => timed[k] > LIMITS.slowFrameMs).map((i) => ({ phase: S[i].ph, ms: +(S[i].t - S[i - 1].t).toFixed(1), busy: S[i].busy, upload: S[i].upload }));
    gate.shots.forEach((shot, k) => { const file = `spike-${k + 1}.jpg`; fs.writeFileSync(path.join(dir, file), Buffer.from(shot.image.split(',')[1], 'base64')); shot.file = file; delete shot.image; });
    const data = { p50: median, p95, p99: quantile(timed, 0.99), max: Math.max(0, ...timed), over25: spikeList.length, over50: spikes.length, idle,
      uploadTotal: uploads.reduce((a, b) => a + b, 0), uploadMax: Math.max(0, ...uploads), spikeList, shots: gate.shots,
      glitches: { hidden: hidden.map((s) => s.ph), badPose: badPose.map((s) => s.ph), jumps } };
    return { name, prof, dir, printed, failures, notes, data, shimmer, stats: { frames: play.length, median, p95, spikes: spikes.length, slowShare, hidden: hidden.length, closeHidden, worstToggles, badPose: badPose.length, jumps, pixelRatio: [Math.min(...play.map((x) => x.pr)), Math.max(...play.map((x) => x.pr))], longTasks: longTasks.length, consoleErrors: logs, perPhase }, clip: enc.status === 0 };
  } catch (err) {
    failures.push(`run failed: ${err.message}`);
    return { name, prof, dir, failures, stats: null };
  } finally {
    page?.close();
  }
}

const stale = await staleCheck();
const results = [];
if (stale.ok) for (const p of chosen) results.push(await runProfile(p));
for (const r of results) {
  if (stale.live?.revision && r.printed !== undefined && !r.printed.includes(stale.live.revision)) r.failures.unshift(`page prints "${r.printed}", not ${stale.live.revision}: the browser kept an older page`);
}
const pass = stale.ok && results.length > 0 && results.every((r) => r.failures.length === 0);
fs.mkdirSync(OUT, { recursive: true });
const md = [`# Play gate ${TAG}: ${pass ? 'PASS' : 'FAIL'}`, '', `- URL: ${URL_}`, `- Build: ${stale.note}${stale.live ? ` (version.json ${stale.live.version} · ${stale.live.revision})` : ''}`, ''];
for (const r of results) {
  md.push(`## ${r.name} (${r.prof.w}×${r.prof.h} @${r.prof.dpr}×, CPU ÷${r.prof.cpu}): ${r.failures.length ? 'FAIL' : 'pass'}`, '');
  for (const f of r.failures) md.push(`- ✗ ${f}`);
  for (const n of r.notes ?? []) md.push(`- ◦ ${n}`);
  if (r.stats) {
    const s = r.stats;
    if (r.shimmer) md.push(`Video shimmer diagnostic: ${r.shimmer.summary.usableFrames} usable frames; see ${path.basename(r.dir)}/shimmer.json. Uncalibrated; excluded from timing thresholds.`, '');
    md.push('', `Frames ${s.frames}; median ${s.median.toFixed(1)} ms; p95 ${s.p95.toFixed(1)} ms; over 50 ms: ${s.spikes}; over 25 ms: ${(s.slowShare * 100).toFixed(1)}%; long tasks ${s.longTasks}.`,
      `Hero: hidden with camera clear ${s.hidden}; hidden with camera pressed close ${s.closeHidden}; most visibility flips in 1 s ${s.worstToggles}; broken pose ${s.badPose}; screen jumps ${s.jumps}. Drawing pixel ratio ${s.pixelRatio.join('–')}.`, '',
      '| Phase | Frames | Median ms | p95 ms | Max ms |', '| --- | ---: | ---: | ---: | ---: |',
      ...Object.entries(s.perPhase).map(([k, v]) => `| ${k} | ${v.frames} | ${v.median} | ${v.p95} | ${v.max} |`), '', r.clip ? `Clip: ${path.join(path.basename(r.dir), 'clip.mp4')}` : 'Clip: not encoded (ffmpeg missing?)', '');
  }
}
fs.writeFileSync(path.join(OUT, `${TAG}.md`), md.join('\n'));
// The live GPU log for issue #320. MEDIA/ is replaced with the published media's address by tools/publish-gate.mjs.
const mb = (b) => `${(b / 1048576).toFixed(1)} MiB`;
const log = [`### ${TAG}: ${pass ? 'PASS' : 'FAIL'} · ${stale.live ? `${stale.live.version} · ${stale.live.revision}` : 'unknown build'}`, '', `URL ${URL_}`, ''];
for (const r of results) {
  const media = `MEDIA/${path.basename(r.dir)}`;
  log.push(`#### ${r.name} (${r.prof.w}×${r.prof.h} @${r.prof.dpr}×, CPU ÷${r.prof.cpu})${r.failures.length ? ' — ' + r.failures.join('; ') : ''}`, '');
  if (!r.data) { log.push('No data (run failed).', ''); continue; }
  const d = r.data, g = d.glitches;
  log.push(`Frame ms p50 ${d.p50.toFixed(1)} · p95 ${d.p95.toFixed(1)} · p99 ${d.p99.toFixed(1)} · max ${d.max.toFixed(1)}; over 25 ms ${d.over25}, over 50 ms ${d.over50}; main thread idle ${(d.idle * 100).toFixed(0)}%.`,
    `Uploads ${mb(d.uploadTotal)} in play, largest frame ${mb(d.uploadMax)}. Glitched frames: hidden hero ${g.hidden.length}, broken pose ${g.badPose.length}, screen jumps ${g.jumps}.`,
    r.clip ? `Clip: ${media}/clip.mp4` : 'Clip: none', '');
  if (d.spikeList.length) {
    log.push('| Phase | Frame ms | Busy ms | Upload |', '| --- | ---: | ---: | ---: |', ...d.spikeList.slice(0, 20).map((s) => `| ${s.phase} | ${s.ms} | ${s.busy ?? '–'} | ${mb(s.upload ?? 0)} |`), '');
    if (d.spikeList.length > 20) log.push(`(${d.spikeList.length - 20} more not listed)`, '');
  }
  for (const s of d.shots) log.push(`- ${s.phase}, ${s.ms} ms, hero (${s.hero.join(', ')}), camera (${s.camera.join(', ')}): ${media}/${s.file}`);
  log.push('');
}
fs.writeFileSync(path.join(OUT, `${TAG}-log.md`), log.join('\n'));
fs.writeFileSync(path.join(OUT, `${TAG}.json`), JSON.stringify({ tag: TAG, url: URL_, pass, stale, results: results.map(({ prof, ...r }) => ({ ...r, profile: prof })) }, null, 1));
// The line the Play gate check looks for on a pull request (.github/workflows/play-gate.yml), printed only for a build
// whose commit was checked, so a run against an unknown build cannot pass a pull request.
if (pass && stale.want && stale.live?.revision) md.push('', `play-gate: PASS ${stale.live.revision}`);
console.log(md.join('\n'));
process.exit(pass ? 0 : 1);
