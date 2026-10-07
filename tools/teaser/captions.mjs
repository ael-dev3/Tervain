#!/usr/bin/env node
/**
 * The teaser's caption layer, drawn by Chrome on a transparent page one frame at a time: the deadpan lines (Inter,
 * lowercase, in a dark box sized for a phone), the comment cards (quoted exactly; the author is left out), the glint
 * of the monocle, the freeze frame (the payoff's last frame, held with a slow push-in) and the title card's quote.
 * Written as a PNG-in-MOV with alpha, which assemble.mjs lays over the footage.
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
import { COMMENTS } from './comments.mjs';
import { OUT } from './film.mjs';
import { CAPTIONS, FPS, FRAMES, GLINT, HEIGHT, SHOTS, WIDTH, shot } from './timeline.mjs';

const freeze = shot('freeze');
const reveal = shot('reveal');
const title = shot('title');

/** Where the impact is in the payoff's last frame (the freeze pushes in on it), as fractions of the frame. */
export const FREEZE_FOCUS = [0.36, 0.5];

/** The monocle's place on screen through the reveal, from the film's log. */
function glintTrack() {
  const file = path.join(OUT, 'shot-reveal.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')).log.filter((r) => r.frame >= 0 && r.monocle).map((r) => [r.frame / FPS, r.monocle.x, r.monocle.y]);
}

const html = () => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@500;600;700;800&display=block">
<style>
  html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: transparent; }
  #stage { position: absolute; inset: 0; }
  #freeze { position: absolute; inset: 0; width: 100%; height: 100%; display: none; transform-origin: ${FREEZE_FOCUS[0] * 100}% ${FREEZE_FOCUS[1] * 100}%;
    filter: saturate(0.7) sepia(0.2) contrast(1.06); }
  #vignette { position: absolute; inset: 0; display: none; background: radial-gradient(ellipse at ${FREEZE_FOCUS[0] * 100}% ${FREEZE_FOCUS[1] * 100}%, transparent 36%, rgba(10, 6, 2, 0.58) 100%); }
  .cap { position: absolute; left: 0; right: 0; text-align: center; opacity: 0; will-change: opacity, transform; }
  .box { display: inline-block; font: 700 66px/1.22 Inter, sans-serif; color: #fff; background: rgba(12, 10, 8, 0.7); letter-spacing: -0.01em;
    padding: 14px 34px 18px; border-radius: 18px; white-space: pre-line; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4); }
  .line { top: 760px; }
  .big { top: 742px; }
  .big .box { font-size: 84px; padding: 16px 40px 22px; }
  .freeze { top: auto; bottom: 108px; left: 96px; right: auto; text-align: left; }
  .freeze .box { font-size: 92px; padding: 14px 40px 22px; }
  .card { top: 96px; }
  .card.left { left: 96px; text-align: left; }
  .card.left .c { min-width: 0; max-width: 900px; }
  .card.long { top: 26px; }
  .card.long .c { max-width: 1640px; }
  .card.long .c .body { font-size: 56px; }
  .card .c { display: inline-block; min-width: 860px; max-width: 1240px; text-align: left; background: #17191b; border: 2px solid #343638; border-radius: 26px;
    padding: 30px 40px 26px; box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55); font-family: Inter, sans-serif; color: #d7dadc; }
  .c .head { display: flex; align-items: center; gap: 18px; font: 600 34px/1 Inter, sans-serif; color: #9a9da0; }
  .c .avatar { width: 54px; height: 54px; border-radius: 50%; background: radial-gradient(circle at 50% 38%, #8a8f94 0 26%, transparent 27%),
    radial-gradient(circle at 50% 100%, #8a8f94 0 42%, transparent 43%), #3a3d40; flex: none; }
  .c .who { color: #c8cbcd; }
  .c .body { margin-top: 18px; font: 600 68px/1.22 Inter, sans-serif; color: #f2f3f4; white-space: pre-line; }
  .c .foot { margin-top: 20px; display: flex; gap: 34px; font: 700 30px/1 Inter, sans-serif; color: #8e9194; }
  #glint { position: absolute; width: 260px; height: 260px; margin: -130px 0 0 -130px; opacity: 0; pointer-events: none;
    background: radial-gradient(circle, rgba(255, 252, 235, 1) 0 3%, rgba(255, 240, 190, 0.85) 6%, rgba(255, 230, 160, 0.25) 16%, transparent 34%); }
  #glint::before, #glint::after { content: ''; position: absolute; left: 50%; top: 50%; width: 250px; height: 7px; margin: -3.5px 0 0 -125px; border-radius: 4px;
    background: linear-gradient(90deg, transparent, rgba(255, 250, 225, 0.95) 50%, transparent); }
  #glint::after { transform: rotate(90deg); }
  .quote { top: 610px; }
  .quote .q { display: inline-block; max-width: 1700px; font: italic 600 64px/1.2 Inter, sans-serif; color: #f6efe0; text-shadow: 0 0 2px rgba(0, 0, 0, 0.9), 0 4px 18px rgba(0, 0, 0, 0.85); }
  .quote .by { display: block; margin-top: 14px; font: 600 34px/1.2 Inter, sans-serif; color: #d8cdb8; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9); }
  .version { top: 900px; }
  .version .box { font: 600 36px/1.2 Inter, sans-serif; background: rgba(12, 10, 8, 0.55); padding: 8px 22px 10px; border-radius: 12px; }
</style></head>
<body><div id="stage"><img id="freeze" src="shot-${freeze.of}-last.png"><div id="vignette"></div><div id="glint"></div></div>
<script>
  const CAPS = ${JSON.stringify(CAPTIONS)};
  const COMMENTS = ${JSON.stringify(COMMENTS)};
  const FREEZE = ${JSON.stringify({ from: freeze.start, to: freeze.start + freeze.seconds })};
  const GLINT = ${JSON.stringify({ at: reveal.start + GLINT, track: glintTrack().map(([t, x, y]) => [reveal.start + t, x, y]) })};
  const TITLE = ${JSON.stringify({ from: title.start, to: title.start + title.seconds })};
  const stage = document.getElementById('stage');
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const easeOut = (x) => 1 - (1 - x) ** 3;
  // A spring's overshoot for a pop.
  const pop = (x) => x >= 1 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(10 * x);
  const items = [];
  const el = (cls, html) => {
    const d = document.createElement('div');
    d.className = 'cap ' + cls;
    d.innerHTML = html;
    stage.append(d);
    return d;
  };
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  for (const c of CAPS) {
    if (c.comment) {
      const k = COMMENTS[c.comment];
      items.push({ c, kind: 'card', el: el(['card', c.place, c.size].filter(Boolean).join(' '), '<div class="c"><div class="head"><div class="avatar"></div><span class="who">' + esc(k.where) + '</span></div>'
        + '<div class="body">' + esc(k.text) + '</div><div class="foot"><span>&#x21E7;&nbsp;&nbsp;&#x21E9;</span><span>Reply</span><span>Share</span></div></div>') });
    } else items.push({ c, kind: 'pop', el: el(c.style ?? 'line', '<span class="box">' + esc(c.line) + '</span>') });
  }
  // The title card: the first comment, framed the way a trailer frames its reviews.
  const quote = el('quote', '<span class="q">“' + esc(COMMENTS.COMMENT_GOTHIC.quote ?? COMMENTS.COMMENT_GOTHIC.text) + '”</span><span class="by">' + esc(COMMENTS.COMMENT_GOTHIC.by) + '</span>');
  const version = el('version', '<span class="box">v0.0.13 · still not 0.1</span>');
  const glint = document.getElementById('glint');
  window.render = (t) => {
    const img = document.getElementById('freeze'), vig = document.getElementById('vignette');
    const inFreeze = t >= FREEZE.from && t < FREEZE.to;
    img.style.display = vig.style.display = inFreeze ? 'block' : 'none';
    if (inFreeze) {
      const u = (t - FREEZE.from) / (FREEZE.to - FREEZE.from);
      img.style.transform = 'scale(' + (1 + 0.07 * (1 - (1 - u) ** 2)) + ')';
    }
    let visible = inFreeze;
    for (const it of items) {
      const from = it.c.from, to = it.c.to, e = it.el;
      if (t < from || t >= to) { e.style.opacity = 0; continue; }
      visible = true;
      const k = t - from, left = to - t;
      e.style.opacity = Math.min(clamp(k / 0.08), clamp(left / 0.22));
      const p = pop(clamp(k / (it.kind === 'card' ? 0.5 : 0.42)));
      e.style.transform = it.kind === 'card'
        ? 'translateY(' + (-40 * (1 - p)) + 'px) scale(' + (0.9 + 0.1 * p) + ')'
        : 'translateY(' + (16 * (1 - p)) + 'px) scale(' + (0.9 + 0.1 * p) + ')';
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
    // The title's quote lands first, the version a beat later.
    for (const [e, delay] of [[quote, 0.55], [version, 1.4]]) {
      const k = t - (TITLE.from + delay);
      if (t < TITLE.from || k < 0) { e.style.opacity = 0; continue; }
      visible = true;
      e.style.opacity = Math.min(clamp(k / 0.3), clamp((TITLE.to - t) / 0.4));
      e.style.transform = 'translateY(' + (12 * (1 - easeOut(clamp(k / 0.5)))) + 'px)';
    }
    return visible;
  };
</script></body></html>`;

async function open() {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'captions.html');
  fs.writeFileSync(file, html());
  const page = await openPage(pathToFileURL(file).href, { w: WIDTH, h: HEIGHT });
  await page.transparent();
  for (let i = 0; i < 120; i++) {
    if (await page.eval(`return document.readyState === 'complete' && typeof window.render === 'function' && document.fonts.status === 'loaded'`)) break;
    await page.wait(250);
  }
  const fonts = await page.eval(`await document.fonts.ready; return ['700 66px Inter', '600 68px Inter', 'italic 600 64px Inter'].map((f) => document.fonts.check(f))`);
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
