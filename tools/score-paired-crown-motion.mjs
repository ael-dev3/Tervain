import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { rgbFrame } from './foliage-motion-metric.mjs';
import { frameShimmer, summarizeShimmer } from './shimmer-metric.mjs';

const out = process.argv[2];
if (!out) throw Error('Supply the completed crown motion directory');
fs.rmSync(path.join(out, 'paired-metrics.json'), { force: true });
const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
const results = [];
for (const { route } of report.routes) {
  const frames = { before: [], after: [] }, reference = [];
  for (let i = 0; i < route.frames; i++) {
    for (const mode of ['before', 'after']) {
      const rgb = await sharp(path.join(out, route.name, mode, `${String(i).padStart(4, '0')}.png`))
        .removeAlpha().extract(route.roi).raw().toBuffer();
      frames[mode].push(rgbFrame(rgb, route.roi.width, route.roi.height));
    }
    reference.push(Uint8Array.from(frames.before[i].gray, (v, k) => Math.round((v + frames.after[i].gray[k]) / 2)));
  }
  const metrics = {};
  for (const mode of ['before', 'after']) {
    const samples = [];
    for (let i = 1; i + 1 < route.frames; i++) samples.push(frameShimmer(
      frames[mode][i - 1].gray, frames[mode][i].gray, frames[mode][i + 1].gray, route.roi.width, route.roi.height,
      { searchRadius: 6, sparkleMask: frames[mode][i].white,
        motionReference: { previous: reference[i - 1], current: reference[i], next: reference[i + 1] } }));
    metrics[mode] = { samples, summary: summarizeShimmer(samples),
      meanRoiLuma: frames[mode].map(f => f.gray.reduce((n, v) => n + v, 0) / f.gray.length),
      strictWhiteObservations: samples.reduce((n, s) => n + s.maskedSparklePixels, 0) };
  }
  const equalMask = metrics.before.samples.every((s, i) => s.validPixels === metrics.after.samples[i].validPixels);
  assert.ok(equalMask, 'Paired alignment mask differs');
  results.push({ route: route.name, metrics, equalMask });
}
const result = { sourceSha256: report.sourceSha256, results, scope: 'Same neutral optical-flow reference for both variants: per-frame arithmetic mean of before/after luminance. Identical motion offsets and alignment acceptance masks, retaining independent exposure correction. Uses the original lossless PNGs, never a decoded lossy preview. This supplements the independent-flow metric.' };
fs.writeFileSync(path.join(out, 'paired-metrics.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(results.map(r => ({ route: r.route, before: r.metrics.before.summary,
  after: r.metrics.after.summary, white: [r.metrics.before.strictWhiteObservations, r.metrics.after.strictWhiteObservations] }))));
