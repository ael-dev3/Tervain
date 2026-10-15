#!/usr/bin/env node
/**
 * Wind clip of the hero oak from a static camera: node tools/tree-gen/wind-clip.mjs <url> <outDir> [--frames 90] [--dist 12] [--az 2.4] [--flag herooak=1]
 * The wind clock is advanced 1/30 s explicitly per frame (tools/wind-capture.mjs), at most 90 frames at 30 fps. Frames go to
 * <outDir>/<run id>/frames, one lock file refuses a second instance, and the run aborts if consecutive frames do not differ.
 * report.json holds the mean frame-to-frame luma change per region (trunk strip, inner crown, outer crown).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { openWindPage } from '../wind-capture.mjs';

const args = process.argv.slice(2), val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const base = args[0], root = path.resolve(args[1]), n = Math.min(90, Number(val('--frames', 90))), dist = Number(val('--dist', 12)), az = Number(val('--az', 2.4)), flag = val('--flag', 'herooak=1');
const [x, z] = [-70.2, 78.4], W = 960, H = 540;
const lock = path.join(os.tmpdir(), 'tervain-wind-clip.lock');
try { const pid = Number(fs.readFileSync(lock, 'utf8')); if (pid) { try { process.kill(pid, 0); console.error('another wind-clip is running (pid ' + pid + ')'); process.exit(2); } catch {} } } catch {}
fs.writeFileSync(lock, String(process.pid));
const out = path.join(root, new Date().toISOString().replace(/[:.]/g, '-')); fs.mkdirSync(path.join(out, 'frames'), { recursive: true });
const url = new URL(base);
for (const [k, v] of Object.entries({ shot: '1', quality: 'high', place: 'rillford', settle: '1', hud: '0', hour: '11' })) url.searchParams.set(k, v);
for (const f of flag.split('&')) { const [k, v] = f.split('='); url.searchParams.set(k, v); }
let page;
try {
  const opened = await openWindPage(url.href, { w: W, h: H }); page = opened.page; const { frame } = opened;
  console.log('foliage.strength', opened.strength);
  await frame.look({ at: [x, z], dist, camh: 2.5, lookh: 8, az });
  for (let i = 0; i < 40; i++) await frame.draw({ dt: 1 / 30, hour: 11 });
  const regions = { trunk: [0.46, 0.55, 0.08, 0.35], innerCrown: [0.35, 0.15, 0.3, 0.3], outerCrown: [0.05, 0.05, 0.2, 0.4] };
  const sums = Object.fromEntries(Object.keys(regions).map((k) => [k, 0])); let prev = null, pairs = 0, whole = 0;
  for (let i = 0; i < n; i++) {
    await frame.draw({ dt: 1 / 30, hour: 11 });
    const file = path.join(out, 'frames', `f${String(i).padStart(4, '0')}.png`); await page.shot(file);
    const g = await sharp(file).greyscale().raw().toBuffer();
    if (prev) { pairs++; let d = 0; for (let k = 0; k < g.length; k++) d += Math.abs(g[k] - prev[k]); whole += d / g.length;
      for (const [k, [rx, ry, rw, rh]] of Object.entries(regions)) { let s = 0, c = 0; for (let yy = Math.floor(ry * H); yy < Math.floor((ry + rh) * H); yy++) for (let xx = Math.floor(rx * W); xx < Math.floor((rx + rw) * W); xx++) { s += Math.abs(g[yy * W + xx] - prev[yy * W + xx]); c++; } sums[k] += s / c; } }
    prev = g;
    if (i === 9 && !(whole / pairs > 0.005)) throw new Error('consecutive frames are identical (mean difference ' + (whole / pairs) + '): the wind is not advancing');
  }
  const report = { frames: n, fps: 30, meanFrameDifference: +(whole / pairs).toFixed(4), meanLumaChangePerFrame: Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, +(v / pairs).toFixed(3)])) };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(out, 'frames', 'f%04d.png'), '-pix_fmt', 'yuv420p', '-crf', '18', path.join(out, 'wind.mp4')]);
  console.log(out, JSON.stringify(report));
} finally { await page?.close?.(); try { fs.unlinkSync(lock); } catch {} }
