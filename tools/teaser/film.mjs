#!/usr/bin/env node
/**
 * Films the X teaser's footage from the real game. Each shot gets a fresh page: the game's own loop is stopped and the
 * film advances the world exactly one sixtieth of a second per frame, steering the camera and the hero, while Chrome's
 * renderer captures 1920 × 1080 frames into a near-lossless intermediate. Every sound the game asks for is logged
 * against its frame (tools/teaser/score.mjs mixes them from the game's own sound banks).
 *
 *   npm run dev                                (or TERVAIN_URL=http://127.0.0.1:5173/ for another server)
 *   node tools/teaser/film.mjs [shot ...]      all shots, or the named ones
 *   node tools/teaser/film.mjs combat --log    simulate without capturing: the per-frame log only
 *   node tools/teaser/film.mjs combat --stills a PNG every half second instead of video, for framing
 *   node tools/teaser/film.mjs combat --stills=270-302:4   chosen frames only
 *
 * Math.random is seeded in the page, so a shot plays out the same way every time. Output goes to TERVAIN_TEASER_OUT
 * (default ../tervain-teaser-output, outside the repository).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from '../cdp.mjs';
import { FPS, HEIGHT, SHOTS, WIDTH } from './timeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = path.resolve(process.env.TERVAIN_TEASER_OUT ?? path.join(ROOT, '..', 'tervain-teaser-output'));
const BASE = process.env.TERVAIN_URL ?? 'http://127.0.0.1:5173/';

/** A small seeded generator in place of Math.random, installed before the game's scripts run. */
const SEEDED = `(() => {
  let a = 0x7e7a1;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

/** Runs in the page. Installs window.__film: world and menu setup, and one frame of the film per call. */
function install() {
  const T = window.tervain;
  const V = T.cam.camera.position.constructor;
  // The game's loop ends at its next tick; from here on only the film advances time.
  T.frame = () => {};
  // A headless window can report a blur, which would open the pause menu over the shot.
  T.openPause = () => {};
  T.lastFrameDt = 1 / 60;
  const ground = (x, z) => Math.max(T.world.terrain.heightAt(x, z), 0);
  const angle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const film = { frame: 0, cues: [], follow: null, waypoint: 0, advance: null };
  window.__film = film;

  const step = () => {
    T.audioClock += 1 / 60;
    T.step(1 / 60);
    T.input.endFrame();
    film.frame++;
  };

  /** Logs every sound the game plays, with the take it chose, against the film's frame. */
  film.listen = async () => {
    T.audio.resume();
    for (let i = 0; i < 100 && !T.audio.ready; i++) await new Promise((r) => setTimeout(r, 50));
    if (!T.audio.ready) return 'audio did not start';
    step();
    const sw = T.audio.soundWorld;
    if (!sw) return 'no sound world';
    await Promise.all(['steps', 'combat', 'items', 'world', 'nature', 'people', 'crafted'].map((b) => sw.loadBank(b)));
    const play = sw.play.bind(sw), pick = sw.picker.pick.bind(sw.picker);
    let current = null;
    sw.picker.pick = (id) => {
      const take = pick(id);
      if (current) current.variant = take;
      return take;
    };
    sw.play = (cue, opt = {}) => {
      current = {
        frame: film.frame, clip: cue.clip, gain: cue.gain, pitch: cue.pitch ?? 0, from: cue.from ?? 0, to: cue.to ?? null,
        delay: cue.delay ?? 0, variant: cue.variant ?? null, at: opt.at ? { x: opt.at.x, y: opt.at.y, z: opt.at.z } : null,
        rate: opt.rate ?? 1, scale: opt.scale ?? 1, bus: opt.bus ?? 'effects', ref: opt.ref ?? 2,
        maxDistance: opt.maxDistance ?? 60, reverb: opt.reverb ?? 0.06,
      };
      const played = play(cue, opt);
      film.cues.push({ ...current, played });
      current = null;
      return played;
    };
    return 'listening';
  };

  film.camera = (c) => {
    if (!c) return;
    T.cam.manual = { p: new V(c.p[0], c.p[1], c.p[2]), look: new V(c.l[0], c.l[1], c.l[2]) };
    if (Math.abs(T.cam.camera.fov - c.fov) > 1e-6) {
      T.cam.camera.fov = c.fov;
      T.cam.camera.updateProjectionMatrix();
    }
  };

  film.ground = (points) => points.map(([x, z]) => ground(x, z));

  /** Rides behind the walking hero, smoothing his turns and his gait. */
  film.followCamera = (c) => {
    const P = T.player;
    const heading = film.follow ? film.follow.heading + angle(P.yaw - film.follow.heading) * 0.035 : P.yaw;
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const target = [P.x - fx * c.back + fz * c.side, P.y + c.up, P.z - fz * c.back - fx * c.side];
    const pos = film.follow ? film.follow.pos.map((v, i) => v + (target[i] - v) * 0.08) : target;
    const lookTarget = [P.x + fx * c.ahead, P.y + c.lookUp, P.z + fz * c.ahead];
    const look = film.follow ? film.follow.look.map((v, i) => v + (lookTarget[i] - v) * 0.08) : lookTarget;
    film.follow = { heading, pos, look };
    film.camera({ p: pos, l: look, fov: c.fov });
  };

  film.world = (s, camera0, preroll) => {
    T.debugTime(s.hour);
    const p = s.player;
    T.player.setPosition(p.x, p.z, p.yaw, T.world.terrain);
    T.cam.yaw = p.yaw;
    T.cam.pitch = 0.2;
    T.player.rig.root.visible = !p.hidden;
    if (s.equip) {
      T.game.state.inventory[s.equip] = 1;
      T.game.dispatch({ t: 'equipWeapon', item: s.equip });
      T.player.syncEquipment(T.game, true);
    }
    film.shot = s;
    film.waypoint = 0;
    film.follow = null;
    if (s.camera.follow) film.followCamera(s.camera.follow);
    else film.camera(camera0);
    // Let shadows, water, streaming and the sky settle around the first view, then put the hero back.
    for (let i = 0; i < 45; i++) step();
    T.player.setPosition(p.x, p.z, p.yaw, T.world.terrain);
    T.cam.yaw = p.yaw;
    film.follow = null;
    // The settling frames' sounds are not part of the shot.
    film.frame = -preroll;
    film.cues.length = 0;
    if (s.provoke) {
      const e = T.enemies.find((x) => x.id === s.provoke);
      e.state = 'alert';
      e.t = 0.55;
      e.engaged = true;
      T.audio.growl({ x: e.x, y: e.y + 1.2, z: e.z });
    }
    return true;
  };

  film.menu = (s) => {
    T.settings.reducedMotion = false;
    let song = s.song;
    film.advance = (dt) => { song += dt; };
    Object.defineProperty(T.audio, 'menuMusicPlayback', { configurable: true, get: () => ({ time: song, duration: 214.2, playing: true, gain: 0.44 }) });
    // The camp, sky and ships keep their own clock; start it, and the ships' routes, at the same place every time.
    T.menuScene.time = 40;
    T.menuScene.beginTrafficVisit(0x7e7a1);
    T.menuScene.trafficEpoch = 0;
    const screen = document.querySelector('.menu-screen');
    if (s.ui === 'none') screen.style.display = 'none';
    // The title keeps its heading (the kicker and the wordmark); the buttons and the build line make way for captions.
    if (s.ui === 'title') for (const el of screen.querySelectorAll('.menu-well, .menu-build')) el.style.visibility = 'hidden';
    film.frame = 0;
    return true;
  };

  /** One frame: actions, camera and steering, then one fixed step of the game (which renders). */
  film.step = (f) => {
    const s = film.shot;
    for (const a of f.actions) {
      if (a.hold) T.input.down.add(a.hold);
      if (a.release) T.input.down.delete(a.release);
      if (a.press) T.input.pressedCodes.add(a.press);
      if (a.grab) {
        T.cam.yaw = T.player.yaw;
        T.cam.pitch = -0.25;
        if (T.world.physics.grab(a.grab)) T.audio.prop('grab');
      }
      if (a.throw) {
        T.cam.yaw = a.throw[0];
        T.cam.pitch = a.throw[1];
        T.world.physics.throw(a.throw[0], a.throw[1]);
        T.audio.prop('throw');
      }
    }
    if (s?.steer) {
      // Walk the trail: head for the next waypoint, then the one after, turning gently.
      let w = s.steer[film.waypoint];
      if (Math.hypot(w[0] - T.player.x, w[1] - T.player.z) < 3 && film.waypoint < s.steer.length - 1) w = s.steer[++film.waypoint];
      T.cam.yaw += angle(Math.atan2(w[0] - T.player.x, w[1] - T.player.z) - T.cam.yaw) * 0.05;
    }
    if (s?.aim && T.player.state === 'free') {
      const e = T.enemies.find((x) => x.id === s.aim);
      T.player.yaw += angle(Math.atan2(e.x - T.player.x, e.z - T.player.z) - T.player.yaw) * 0.25;
    }
    if (s?.camera?.follow) film.followCamera(s.camera.follow);
    else film.camera(f.camera);
    if (film.advance) film.advance(1 / 60);
    step();
    if (s?.player?.hidden) T.player.rig.root.visible = false;
    if (!s) return { frame: film.frame - 1 };
    const P = T.player, e = T.enemies.find((x) => x.id === 'cut_creature'), cam = T.cam.camera;
    const dir = cam.getWorldDirection(new V());
    const barrel = T.world.physics.motions().find((m) => m.id === 'loose_barrel_2');
    return {
      frame: film.frame - 1,
      player: { x: P.x, y: P.y, z: P.z, yaw: P.yaw, state: P.state, hp: T.game.state.player.health },
      enemy: e ? { x: e.x, z: e.z, state: e.state, hp: e.hp } : null,
      camera: { x: cam.position.x, y: cam.position.y, z: cam.position.z, fx: dir.x, fy: dir.y, fz: dir.z },
      barrel: barrel ? { x: barrel.x, y: barrel.y, z: barrel.z, speed: Math.hypot(barrel.vx, barrel.vy, barrel.vz), held: barrel.held } : null,
      cues: film.cues.splice(0),
    };
  };
  return true;
}

/** Smootherstep over the whole move, then cubic Hermite with Catmull-Rom tangents through the keys. */
export function cameraAt(cam, t, seconds) {
  const keys = cam.keys;
  let u = t;
  if (cam.ease) {
    const x = Math.min(1, Math.max(0, t / seconds));
    u = keys[0].t + (keys.at(-1).t - keys[0].t) * x * x * x * (x * (x * 6 - 15) + 10);
  }
  let i = 0;
  while (i < keys.length - 2 && u > keys[i + 1].t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[Math.min(keys.length - 1, i + 1)], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const s = Math.min(1, Math.max(0, (u - k1.t) / Math.max(1e-6, k2.t - k1.t)));
  const h = (a, b, c, d) => {
    const m1 = (c - a) / 2, m2 = (d - b) / 2, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * b + (s3 - 2 * s2 + s) * m1 + (-2 * s3 + 3 * s2) * c + (s3 - s2) * m2;
  };
  const vec = (key) => [0, 1, 2].map((j) => h(k0[key][j], k1[key][j], k2[key][j], k3[key][j]));
  return { p: vec('P'), l: vec('L'), fov: h(k0.fov, k1.fov, k2.fov, k3.fov) };
}

function encoder(file) {
  // A near-lossless intermediate; the one lossy encode for X happens in assemble.mjs.
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '6', '-pix_fmt', 'yuv444p', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));
  return {
    write: (buf) => new Promise((resolve) => (ff.stdin.write(buf) ? resolve() : ff.stdin.once('drain', resolve))),
    end: () => {
      ff.stdin.end();
      return done;
    },
  };
}

async function waitFor(page, js, what, tries = 240) {
  for (let i = 0; i < tries; i++) {
    if (await page.eval(js)) return;
    await page.wait(500);
  }
  throw new Error(`timed out waiting for ${what}`);
}

export async function film(shot, { mode = 'video', stills = null } = {}) {
  const world = shot.scene === 'world';
  const url = new URL(BASE);
  if (world) for (const [k, v] of Object.entries({ shot: '1', place: 'rillford', hour: String(shot.hour), hud: '0', quality: 'high', motion: '1', settle: '10' })) url.searchParams.set(k, v);
  const page = await openPage(url.href, { w: WIDTH, h: HEIGHT, init: SEEDED, flags: ['--autoplay-policy=no-user-gesture-required'] });
  const log = [];
  try {
    if (world) await waitFor(page, `return document.title === 'READY'`, 'the shot to settle');
    else {
      await waitFor(page, `return !!(window.tervain && window.tervain.mode === 'title' && document.querySelector('.menu-screen'))`, 'the title screen');
      await page.wait(4000);
    }
    await page.eval(`return (${install.toString()})()`);
    const preroll = Math.round((shot.preroll ?? 0) * FPS);
    if (world) {
      // Camera keys are given in metres above the ground: resolve them once against the terrain.
      const keys = shot.camera.keys ?? [];
      const g = await page.eval(`return __film.ground(${JSON.stringify(keys.flatMap((k) => [[k.p[0], k.p[2]], [k.l[0], k.l[2]]]))})`);
      keys.forEach((k, i) => {
        k.P = [k.p[0], g[2 * i] + k.p[1], k.p[2]];
        k.L = [k.l[0], g[2 * i + 1] + k.l[1], k.l[2]];
      });
      const listening = await page.eval(`return __film.listen()`);
      if (listening !== 'listening') console.warn(`${shot.id}: ${listening}; no sound log`);
      await page.eval(`return __film.world(${JSON.stringify(shot)}, ${JSON.stringify(keys.length ? cameraAt(shot.camera, 0, shot.seconds) : null)}, ${preroll})`);
    } else await page.eval(`return __film.menu(${JSON.stringify(shot)})`);
    const file = path.join(OUT, `shot-${shot.id}.mp4`);
    const enc = mode === 'video' ? encoder(file) : null;
    let last = null;
    for (let f = -preroll; f < shot.frames; f++) {
      const t = f / FPS;
      const actions = [];
      for (const a of shot.actions ?? []) {
        const at = Math.round(a.t * FPS);
        if (at === f || (f === -preroll && at < -preroll)) actions.push(a);
        if (a.hold && a.until !== undefined && Math.round(a.until * FPS) === f) actions.push({ release: a.hold });
      }
      const camera = world && shot.camera.keys ? cameraAt(shot.camera, Math.max(0, t), shot.seconds) : null;
      const state = await page.eval(`return __film.step(${JSON.stringify({ camera, actions })})`);
      log.push(state);
      if (f < 0) continue;
      if (mode === 'video') {
        last = await page.image('png');
        await enc.write(last);
      } else if (mode === 'stills' && (stills ? f >= stills.from && f <= stills.to && (f - stills.from) % stills.step === 0 : f % 30 === 0 || f === shot.frames - 1)) {
        fs.writeFileSync(path.join(OUT, `still-${shot.id}-${String(f).padStart(4, '0')}.png`), await page.image('png'));
      }
    }
    if (enc) {
      await enc.end();
      fs.writeFileSync(path.join(OUT, `shot-${shot.id}-last.png`), last);
    }
    fs.writeFileSync(path.join(OUT, `shot-${shot.id}.json`), JSON.stringify({ id: shot.id, frames: shot.frames, preroll, log }));
    const errors = page.console().filter((l) => l.startsWith('[exception]') || l.startsWith('[error]'));
    if (errors.length) console.warn(`${shot.id}:\n${errors.slice(0, 5).join('\n')}`);
    return log;
  } finally {
    page.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const mode = args.includes('--log') ? 'log' : args.some((a) => a.startsWith('--stills')) ? 'stills' : 'video';
  // --stills=from-to:step picks the frames; plain --stills takes one every half second.
  const range = /^--stills=(\d+)-(\d+)(?::(\d+))?$/.exec(args.find((a) => a.startsWith('--stills=')) ?? '');
  const stills = range ? { from: Number(range[1]), to: Number(range[2]), step: Number(range[3] ?? 1) } : null;
  const wanted = args.filter((a) => !a.startsWith('--'));
  fs.mkdirSync(OUT, { recursive: true });
  for (const shot of SHOTS) {
    if (shot.scene === 'hold' || (wanted.length && !wanted.includes(shot.id))) continue;
    const t0 = Date.now();
    await film(structuredClone(shot), { mode, stills });
    console.log(`${shot.id.padEnd(10)} ${shot.frames} frames, ${mode}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
}
