#!/usr/bin/env node
/**
 * Cuts the teaser together: the filmed shots in order (the freeze is the caption layer's held frame), the caption
 * layer over them, and the mastered sound, encoded once for X: H.264 High at 1920 × 1080 and 60 fps, two-pass to fit
 * the repository's size budget, AAC stereo, fast start. Also pulls the poster frame.
 *
 *   node tools/teaser/assemble.mjs [out.mp4]     after film.mjs, captions.mjs and score.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUT } from './film.mjs';
import { FPS, FRAMES, LENGTH, SHOTS, shot } from './timeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const target = path.resolve(process.argv[2] ?? path.join(ROOT, 'docs/media/teaser/tervain-teaser-0.0.10.mp4'));
/** Mebibytes the finished file may take: GitHub warns above 50 MiB. */
const BUDGET_MB = 48;
const AUDIO_KBPS = 256;

const run = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'], ...opts });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
};

const inputs = [];
const parts = [];
for (const s of SHOTS) {
  if (s.scene === 'hold') {
    // The caption layer draws the freeze opaque; underneath, the same frame holds.
    inputs.push('-loop', '1', '-framerate', String(FPS), '-i', path.join(OUT, `shot-${s.of}-last.png`));
  } else inputs.push('-i', path.join(OUT, `shot-${s.id}.mp4`));
  parts.push(`[${parts.length}:v]trim=end_frame=${s.frames},setpts=PTS-STARTPTS,${s.grade ? `${s.grade},` : ''}format=yuv444p,setsar=1[v${parts.length}]`);
}
const captions = parts.length, sound = parts.length + 1;
inputs.push('-i', path.join(OUT, 'captions.mov'), '-i', path.join(OUT, 'teaser-sound.wav'));
const graph = [
  ...parts,
  `${parts.map((_, i) => `[v${i}]`).join('')}concat=n=${parts.length}:v=1:a=0[cut]`,
  `[${captions}:v]setpts=PTS-STARTPTS[cap]`,
  `[cut][cap]overlay=format=auto:eof_action=pass,format=yuv420p[v]`,
].join(';');

const videoKbps = Math.floor(((BUDGET_MB * 8 * 1024 * 1024) / LENGTH / 1000) * 0.985 - AUDIO_KBPS);
const x264 = ['-c:v', 'libx264', '-preset', 'veryslow', '-profile:v', 'high', '-level:v', '4.2', '-pix_fmt', 'yuv420p',
  '-b:v', `${videoKbps}k`, '-maxrate', `${videoKbps * 2}k`, '-bufsize', `${videoKbps * 2}k`, '-g', String(FPS * 2), '-keyint_min', String(FPS),
  '-x264-params', 'aq-mode=3:deblock=-1,-1', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(FPS)];
const log = path.join(OUT, 'x264-2pass');
// Both passes build the same picture from the same graph: the shots in order, the captions over them.
const picture = [...inputs, '-filter_complex', graph, '-map', '[v]', '-frames:v', String(FRAMES)];
run([...picture, ...x264, '-pass', '1', '-passlogfile', log, '-an', '-f', 'mp4', process.platform === 'win32' ? 'NUL' : '/dev/null']);
fs.mkdirSync(path.dirname(target), { recursive: true });
run([...picture, '-map', `${sound}:a`, ...x264, '-pass', '2', '-passlogfile', log,
  '-c:a', 'aac', '-b:a', `${AUDIO_KBPS}k`, '-ar', '48000', '-ac', '2', '-shortest', '-movflags', '+faststart',
  '-metadata', 'title=Tervain — teaser', '-metadata', 'comment=Captured from the browser prototype (0.0.10); see tools/teaser.', '-fflags', '+bitexact', '-flags:v', '+bitexact', '-flags:a', '+bitexact', target]);

// The poster: the title card, once its captions have landed.
const poster = path.join(path.dirname(target), 'poster.jpg');
run(['-ss', (shot('title').start + 5.2).toFixed(3), '-i', target, '-frames:v', '1', '-q:v', '2', poster]);

const mb = fs.statSync(target).size / (1024 * 1024);
console.log(`${path.relative(ROOT, target)}: ${mb.toFixed(1)} MB (video ${videoKbps} kb/s two-pass, audio ${AUDIO_KBPS} kb/s); ${path.relative(ROOT, poster)}`);
