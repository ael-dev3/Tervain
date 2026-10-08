#!/usr/bin/env node
/**
 * The teaser's caption layer, drawn by Chrome on a transparent page one frame at a time: subtitles for the narration
 * (timed from its transcribed words), the two comments as screenshots of the thread (kept small, in a corner), the
 * glint of the monocle, the freeze frame (the payoff's last frame, held with a slow push-in) and the version under
 * the title. Written as a PNG-in-MOV with alpha, which assemble.mjs lays over the footage.
 *
 *   node tools/teaser/captions.mjs                 the whole layer (captions.mov in the output folder)
 *   node tools/teaser/captions.mjs --at 26.5 ...   single frames at these times, over the footage when it exists
 *
 * Needs network access for the Inter font (SIL Open Font License).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openPage } from '../cdp.mjs';
import { OUT } from './film.mjs';
import { FPS, FRAMES, GLINT, HEIGHT, SCREENSHOTS, SHOTS, SUBTITLES, WIDTH, shot } from './timeline.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const freeze = shot('freeze');
const reveal = shot('reveal');
const title = shot('title');

/** Where the impact is in the payoff's last frame (the freeze pushes in on it), as fractions of the frame. */
export const FREEZE_FOCUS = [0.36, 0.5];
/** The screenshots' scale: small enough to leave the picture to the game, the narration reads them out. */
const SHOT_SCALE = 0.75;

/** The monocle's place on screen through the reveal, from the film's log. */
function glintTrack() {
  const file = path.join(OUT, 'shot-reveal.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')).log.filter((r) => r.frame >= 0 && r.monocle).map((r) => [r.frame / FPS, r.monocle.x, r.monocle.y]);
}

const html = () => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=block">
<style>
  html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: transparent; }
  #stage { position: absolute; inset: 0; }
  #freeze { position: absolute; inset: 0; width: 100%; height: 100%; display: none; transform-origin: ${FREEZE_FOCUS[0] * 100}% ${FREEZE_FOCUS[1] * 100}%;
    filter: saturate(0.7) sepia(0.2) contrast(1.06); }
  #vignette { position: absolute; inset: 0; display: none; background: radial-gradient(ellipse at ${FREEZE_FOCUS[0] * 100}% ${FREEZE_FOCUS[1] * 100}%, transparent 36%, rgba(10, 6, 2, 0.58) 100%); }
  .sub { position: absolute; left: 0; right: 0; bottom: 64px; text-align: center; opacity: 0; }
  .sub span { display: inline-block; max-width: 1560px; font: 600 54px/1.24 Inter, sans-serif; color: #fff; letter-spacing: -0.005em;
    background: rgba(10, 10, 12, 0.66); padding: 10px 28px 14px; border-radius: 14px; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35); }
  .shot { position: absolute; left: 48px; top: 44px; opacity: 0; transform-origin: 0 0; border-radius: 14px; border: 2px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 14px 44px rgba(0, 0, 0, 0.55); }
  #glint { position: absolute; width: 260px; height: 260px; margin: -130px 0 0 -130px; opacity: 0; pointer-events: none;
    background: radial-gradient(circle, rgba(255, 252, 235, 1) 0 3%, rgba(255, 240, 190, 0.85) 6%, rgba(255, 230, 160, 0.25) 16%, transparent 34%); }
  #glint::before, #glint::after { content: ''; position: absolute; left: 50%; top: 50%; width: 250px; height: 7px; margin: -3.5px 0 0 -125px; border-radius: 4px;
    background: linear-gradient(90deg, transparent, rgba(255, 250, 225, 0.95) 50%, transparent); }
  #glint::after { transform: rotate(90deg); }
  #version { position: absolute; left: 0; right: 0; top: 418px; text-align: center; opacity: 0; }
  #version span { font: 600 34px/1.2 Inter, sans-serif; color: #f2e6cf; text-shadow: 0 0 2px rgba(0, 0, 0, 0.9), 0 3px 14px rgba(0, 0, 0, 0.85); }
</style></head>
<body><div id="stage"><img id="freeze" src="shot-${freeze.of}-last.png"><div id="vignette"></div><div id="glint"></div>
${SCREENSHOTS.map((s, i) => `<img class="shot" id="shot${i}" src="${s.image}">`).join('')}
<div id="version"><span>v0.0.13 · still not 0.1</span></div></div>
<script>
  const SUBS = ${JSON.stringify(SUBTITLES)};
  const SHOTS = ${JSON.stringify(SCREENSHOTS)};
  const FREEZE = ${JSON.stringify({ from: freeze.start, to: freeze.start + freeze.seconds })};
  const GLINT = ${JSON.stringify({ at: reveal.start + GLINT, track: glintTrack().map(([t, x, y]) => [reveal.start + t, x, y]) })};
  const TITLE = ${JSON.stringify({ from: title.start, to: title.start + title.seconds })};
  const stage = document.getElementById('stage');
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const easeOut = (x) => 1 - (1 - x) ** 3;
  // A spring's overshoot for a pop.
  const pop = (x) => x >= 1 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(10 * x);
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const subs = SUBS.map((s) => {
    const d = document.createElement('div');
    d.className = 'sub';
    d.innerHTML = '<span>' + esc(s.text) + '</span>';
    stage.append(d);
    return { ...s, el: d };
  });
  const shots = SHOTS.map((s, i) => ({ ...s, el: document.getElementById('shot' + i) }));
  const glint = document.getElementById('glint'), version = document.getElementById('version');
  window.render = (t) => {
    const img = document.getElementById('freeze'), vig = document.getElementById('vignette');
    const inFreeze = t >= FREEZE.from && t < FREEZE.to;
    img.style.display = vig.style.display = inFreeze ? 'block' : 'none';
    if (inFreeze) {
      const u = (t - FREEZE.from) / (FREEZE.to - FREEZE.from);
      img.style.transform = 'scale(' + (1 + 0.07 * (1 - (1 - u) ** 2)) + ')';
    }
    let visible = inFreeze;
    // Subtitles cut in and out with the words (a few frames of fade, nothing that lags the voice).
    for (const s of subs) {
      if (t < s.from || t >= s.to) { s.el.style.opacity = 0; continue; }
      visible = true;
      s.el.style.opacity = Math.min(clamp((t - s.from) / 0.06), clamp((s.to - t) / 0.1));
    }
    // The screenshots pop into the corner and leave with their shot.
    for (const s of shots) {
      if (t < s.from || t >= s.to) { s.el.style.opacity = 0; continue; }
      visible = true;
      const k = t - s.from, p = pop(clamp(k / 0.45));
      s.el.style.opacity = Math.min(clamp(k / 0.08), clamp((s.to - t) / 0.18));
      s.el.style.transform = 'translateY(' + (-18 * (1 - p)) + 'px) scale(' + (${SHOT_SCALE} * (0.92 + 0.08 * p)) + ')';
    }
    // The glint: a star of light on the monocle, flaring and turning for a third of a second.
    const g = (t - GLINT.at) / 0.38;
    if (g >= 0 && g <= 1 && GLINT.track.length) {
      let best = GLINT.track[0];
      for (const r of GLINT.track) if (Math.abs(r[0] - t) < Math.abs(best[0] - t)) best = r;
      glint.style.left = (best[1] * ${WIDTH}) + 'px';
      glint.style.top = (best[2] * ${HEIGHT}) + 'px';
      const s = Math.sin(Math.PI * g);
      glint.style.opacity = s;
      glint.style.transform = 'rotate(' + (20 + 50 * g) + 'deg) scale(' + (0.35 + 0.75 * s) + ')';
      visible = true;
    } else glint.style.opacity = 0;
    // The version, under the title, a moment after it.
    const k = t - (TITLE.from + 0.9);
    if (k >= 0 && t < TITLE.to) {
      visible = true;
      version.style.opacity = Math.min(clamp(k / 0.3), clamp((TITLE.to - t) / 0.4));
      version.style.transform = 'translateY(' + (10 * (1 - easeOut(clamp(k / 0.5)))) + 'px)';
    } else version.style.opacity = 0;
    return visible;
  };
</script></body></html>`;

async function open() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const s of SCREENSHOTS) fs.copyFileSync(path.join(HERE, 'reddit', s.image), path.join(OUT, s.image));
  const file = path.join(OUT, 'captions.html');
  fs.writeFileSync(file, html());
  const page = await openPage(pathToFileURL(file).href, { w: WIDTH, h: HEIGHT });
  await page.transparent();
  for (let i = 0; i < 120; i++) {
    if (await page.eval(`return document.readyState === 'complete' && typeof window.render === 'function' && document.fonts.status === 'loaded' && [...document.images].every((i) => i.complete)`)) break;
    await page.wait(250);
  }
  const fonts = await page.eval(`await document.fonts.ready; return ['600 54px Inter', '600 34px Inter'].map((f) => document.fonts.check(f))`);
  if (!fonts.every(Boolean)) throw new Error('caption fonts did not load (network?)');
  return page;
}

const args = process.argv.slice(2);
if (args[0] === '--at') {
  const page = await open();
  try {
    for (const t of args.slice(1).map(Number)) {
      await page.eval(`return render(${t})`);
      const file = path.join(OUT, `caption-${t.toFixed(2)}.png`);
      fs.writeFileSync(file, await page.image('png'));
      // Over the footage, when the shot has been filmed: one frame pulled from the intermediate.
      const s = SHOTS.find((x) => t >= x.start && t < x.start + x.seconds);
      const id = s && (s.scene === 'hold' ? null : s.id);
      const clip = id && path.join(OUT, `shot-${id}.mp4`);
      if (clip && fs.existsSync(clip)) {
        await run('ffmpeg', ['-v', 'error', '-y', '-ss', (t - s.start).toFixed(3), '-i', clip, '-i', file, '-frames:v', '1', '-filter_complex', 'overlay', file.replace('.png', '-over.png')]);
      }
      console.log(file);
    }
  } finally {
    page.close();
  }
} else {
  const page = await open();
  const file = path.join(OUT, 'captions.mov');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'png', '-pix_fmt', 'rgba', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));
  const write = (buf) => new Promise((resolve) => (ff.stdin.write(buf) ? resolve() : ff.stdin.once('drain', resolve)));
  try {
    let blank = null;
    for (let f = 0; f < FRAMES; f++) {
      const visible = await page.eval(`return render(${f / FPS})`);
      // Empty frames are all alike: capture one and reuse it.
      if (!visible) blank ??= await page.image('png');
      await write(visible ? await page.image('png') : blank);
      if (f % 600 === 0) console.log(`captions ${f}/${FRAMES}`);
    }
    ff.stdin.end();
    await done;
    console.log(file);
  } finally {
    page.close();
  }
}

function run(cmd, argv) {
  return new Promise((resolve, reject) => spawn(cmd, argv, { stdio: 'inherit' }).on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)))));
}
