#!/usr/bin/env node
import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { frameShimmer, summarizeShimmer } from './shimmer-metric.mjs';
export async function analyzeVideo(file, options = {}) {
  const roi = options.roi;
  if (!Array.isArray(roi) || roi.length !== 4 || roi.some(v => !Number.isFinite(v)) || roi[0] < 0 || roi[1] < 0 || roi[2] <= 0 || roi[3] <= 0 || roi[0] + roi[2] > 1 || roi[1] + roi[3] > 1) throw new Error('Select a normalized grass-only ROI: x,y,width,height');
  const fps = options.fps ?? 60, maxFrames = options.maxFrames ?? 1800, start = options.start ?? 0;
  if (!(Number.isFinite(fps) && fps > 0 && fps <= 120) || !Number.isInteger(maxFrames) || maxFrames < 3 || !(Number.isFinite(start) && start >= 0)) throw new Error('Invalid video sampling options');
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate', '-of', 'json', file], { encoding: 'utf8', timeout: 30000 });
  if (probe.error || probe.status !== 0) throw new Error('ffprobe could not read the video');
  const source = JSON.parse(probe.stdout).streams?.[0];
  if (!source?.width || !source?.height) throw new Error('Video has no decoded dimensions');
  const x = Math.floor(roi[0] * source.width), y = Math.floor(roi[1] * source.height);
  const w = Math.floor(roi[2] * source.width), h = Math.floor(roi[3] * source.height);
  if (w < 16 || h < 16) throw new Error('Video ROI must be at least 16 by 16 pixels');
  const decoder = spawn('ffmpeg', ['-v', 'error', '-ss', String(start), '-i', file, '-an', '-vf', `crop=${w}:${h}:${x}:${y}:exact=1,fps=${fps},format=gray`, '-frames:v', String(maxFrames), '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1'], { stdio: ['ignore', 'pipe', 'pipe'] });
  decoder.stderr.resume();
  const completed = new Promise((resolve, reject) => { decoder.on('error', () => reject(new Error('ffmpeg could not start'))); decoder.on('close', code => resolve(code)); });
  completed.catch(() => {}); // Observe early spawn failures before the stdout loop finishes.
  const timer = setTimeout(() => decoder.kill(), options.timeoutMs ?? 180000);
  let pending = Buffer.alloc(0), previous, current, decoded = 0;
  const samples = [];
  try {
    for await (const chunk of decoder.stdout) {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= w * h) {
        const next = pending.subarray(0, w * h); pending = pending.subarray(w * h);
        if (previous && current) samples.push({ time: start + (decoded - 1) / fps, ...frameShimmer(previous, current, next, w, h, options) });
        previous = current; current = next; decoded++;
      }
    }
    if (await completed !== 0) throw new Error('ffmpeg video decoding failed or timed out');
    if (pending.length || decoded < 3) throw new Error('Video has insufficient complete frames');
  } finally { clearTimeout(timer); decoder.kill(); }
  const [numerator, denominator] = String(source.avg_frame_rate).split('/').map(Number);
  return { schema: 1, roi, nativeSize: [source.width, source.height], analyzedSize: [w, h], sourceAverageFps: numerator / denominator,
    analysisFps: fps, start, decodedFrames: decoded, truncated: decoded === maxFrames,
    interpretation: 'motion/exposure-adjusted video residuals in the selected ROI; diagnostic only, no calibrated pass threshold',
    summary: summarizeShimmer(samples), samples };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = Object.fromEntries(process.argv.slice(2).flatMap((a, i, all) => a.startsWith('--') ? [[a.slice(2), all[i + 1]]] : []));
  try {
    if (!args.input) throw new Error('Use --input video.mp4 --roi x,y,width,height');
    const report = await analyzeVideo(args.input, { roi: (args.roi ?? '').split(',').map(Number), fps: Number(args.fps ?? 60),
      maxFrames: Number(args['max-frames'] ?? 1800), start: Number(args.start ?? 0), searchRadius: Number(args['search-radius'] ?? 8) });
    fs.writeFileSync(args.out ?? 'video-shimmer.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report.summary));
    if (!report.summary.usableFrames) process.exitCode = 2;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
