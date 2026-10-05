#!/usr/bin/env node
/**
 * The teaser's caption layer, drawn by Chrome on a transparent page one frame at a time: the epic trailer voice
 * (Cinzel capitals, slowly tracking in), the honest aside (Inter, lowercase, popping in a beat later), and the freeze
 * frame (the last frame of the fight, held with a slow push-in). Written as a PNG-in-MOV with alpha, which
 * assemble.mjs lays over the footage.
 *
 *   node tools/teaser/captions.mjs                 the whole layer (captions.mov in the output folder)
 *   node tools/teaser/captions.mjs --at 26.5 ...   single frames at these times, over the footage when it exists
 *
 * Needs network access for the two Google Fonts (both under the SIL Open Font License).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { openPage } from '../cdp.mjs';
import { OUT } from './film.mjs';
import { CAPTIONS, FPS, FRAMES, HEIGHT, SHOTS, WIDTH, shot } from './timeline.mjs';

const freeze = shot('freeze');

/** Where the hero stands in the fight's last frame (the freeze pushes in on him), as fractions of the frame. */
const FREEZE_FOCUS = [0.66, 0.6];

const html = () => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@500;600;700&display=block">
<style>
  html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: transparent; }
  #stage { position: absolute; inset: 0; }
  #freeze { position: absolute; inset: 0; width: 100%; height: 100%; display: none; transform-origin: ${FREEZE_FOCUS[0] * 100}% ${FREEZE_FOCUS[1] * 100}%;
    filter: saturate(0.72) sepia(0.22) contrast(1.06); }
  #vignette { position: absolute; inset: 0; display: none; background: radial-gradient(ellipse at ${FREEZE_FOCUS[0] * 100}% ${FREEZE_FOCUS[1] * 100}%, transparent 38%, rgba(10, 6, 2, 0.55) 100%); }
  .cap { position: absolute; left: 0; right: 0; text-align: center; opacity: 0; will-change: opacity, transform; }
  .epic { top: 640px; }
  .epic span { display: inline-block; white-space: nowrap; font: 700 76px/1.1 Cinzel, serif; text-transform: uppercase; color: #f5ead4;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.9), 0 3px 12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 0, 0, 0.6); }
  .box { display: inline-block; font: 600 50px/1.28 Inter, sans-serif; color: #fff; background: rgba(14, 11, 8, 0.66);
    padding: 10px 24px 12px; border-radius: 14px; white-space: pre-line; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35); }
  .aside { top: 760px; }
  .freeze-scratch { top: 64px; left: 72px; right: auto; text-align: left; }
  .freeze-scratch .box { font: italic 600 44px/1.2 Inter, sans-serif; background: rgba(14, 11, 8, 0.72); }
  .freeze-line { top: auto; bottom: 120px; left: 72px; right: auto; text-align: left; }
  .freeze-line .box { font: 700 64px/1.2 Inter, sans-serif; }
  .title-version { top: 630px; }
  .title-date { top: 732px; }
  .title-credit { top: 922px; }
  .title-credit .box { font: 500 32px/1.3 Inter, sans-serif; background: rgba(14, 11, 8, 0.55); padding: 8px 20px; border-radius: 10px; }
</style></head>
<body><div id="stage"><img id="freeze" src="shot-combat-last.png"><div id="vignette"></div></div>
<script>
  const CAPS = ${JSON.stringify(CAPTIONS)};
  const FREEZE = ${JSON.stringify({ from: freeze.start, to: freeze.start + freeze.seconds })};
  const stage = document.getElementById('stage');
  const START_SPACING = 0.3;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const easeOut = (x) => 1 - (1 - x) ** 3;
  // A spring's overshoot for the aside's pop.
  const pop = (x) => x >= 1 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(10 * x);
  const items = [];
  for (const c of CAPS) {
    if (c.style === 'freeze') {
      // "*record scratch*" first; the line itself a beat later.
      const [scratch, line] = c.aside.split(/\\s{2,}/);
      items.push({ c, kind: 'pop', el: add('cap freeze-scratch', 'box', scratch), delay: 0 });
      items.push({ c, kind: 'pop', el: add('cap freeze-line', 'box', line), delay: 0.42 });
    } else if (c.epic) items.push({ c, kind: 'epic', el: add('cap epic', '', c.epic), fit: 1 });
    else items.push({ c, kind: 'pop', el: add('cap ' + (c.style ?? 'aside'), 'box', c.aside), delay: 0 });
  }
  function add(cls, inner, text) {
    const el = document.createElement('div');
    el.className = cls;
    const span = document.createElement('span');
    if (inner) span.className = inner;
    span.textContent = text;
    el.append(span);
    stage.append(el);
    return el;
  }
  /** A long epic line is scaled to fit the frame at its widest (its letters start spread and draw in). */
  window.fit = () => {
    for (const it of items) {
      if (it.kind !== 'epic') continue;
      it.el.style.letterSpacing = START_SPACING + 'em';
      it.fit = Math.min(1, 1760 / it.el.firstChild.offsetWidth);
    }
    return items.filter((it) => it.fit < 1).map((it) => it.c.epic + ' ' + it.fit.toFixed(2));
  };
  window.render = (t) => {
    const img = document.getElementById('freeze'), vig = document.getElementById('vignette');
    const inFreeze = t >= FREEZE.from && t < FREEZE.to;
    img.style.display = vig.style.display = inFreeze ? 'block' : 'none';
    if (inFreeze) {
      const u = (t - FREEZE.from) / (FREEZE.to - FREEZE.from);
      img.style.transform = 'scale(' + (1 + 0.075 * (1 - (1 - u) ** 2)) + ')';
    }
    for (const it of items) {
      const from = it.c.from + (it.delay ?? 0), to = it.c.to;
      const el = it.el;
      if (t < from || t >= to) { el.style.opacity = 0; continue; }
      const k = t - from, left = to - t;
      if (it.kind === 'epic') {
        const u = (t - from) / (to - from);
        el.style.opacity = Math.min(easeOut(clamp(k / 0.45)), clamp(left / 0.35));
        el.style.letterSpacing = (START_SPACING - 0.13 * easeOut(u)) + 'em';
        el.style.transform = 'scale(' + it.fit * (1 + 0.025 * u) + ')';
      } else {
        el.style.opacity = Math.min(clamp(k / 0.1), clamp(left / 0.3));
        const p = pop(clamp(k / 0.45));
        el.style.transform = 'translateY(' + (14 * (1 - p)) + 'px) scale(' + (0.92 + 0.08 * p) + ')';
      }
    }
    return [...document.querySelectorAll('.cap')].some((e) => Number(e.style.opacity) > 0) || inFreeze;
  };
</script></body></html>`;

async function open() {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'captions.html');
  fs.writeFileSync(file, html());
  const page = await openPage(pathToFileURL(file).href, { w: WIDTH, h: HEIGHT });
  await page.transparent();
  for (let i = 0; i < 120; i++) {
    if (await page.eval(`return document.readyState === 'complete' && typeof window.render === 'function' && document.fonts.status === 'loaded' && document.getElementById('freeze').complete`)) break;
    await page.wait(250);
  }
  const fonts = await page.eval(`await document.fonts.ready; return ['700 76px Cinzel', '600 50px Inter'].map((f) => document.fonts.check(f))`);
  if (!fonts.every(Boolean)) throw new Error('caption fonts did not load (network?)');
  const fitted = await page.eval(`return fit()`);
  if (fitted.length) console.log(`scaled to fit: ${fitted.join('; ')}`);
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
      const clip = s && path.join(OUT, `shot-${s.id}.mp4`);
      if (clip && fs.existsSync(clip)) {
        const local = t - s.start;
        await run('ffmpeg', ['-v', 'error', '-y', '-ss', local.toFixed(3), '-i', clip, '-i', file, '-frames:v', '1', '-filter_complex', 'overlay', file.replace('.png', '-over.png')]);
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
