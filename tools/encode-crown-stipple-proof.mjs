import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const out = process.argv[2];
if (!out) throw Error('Supply a completed crown-stipple report directory');
fs.rmSync(path.join(out, 'video-verification.json'), { force: true });
const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
assert.equal(report.pass, true, 'Refuse to encode an unsuccessful receipt');
const sha = data => createHash('sha256').update(data).digest('hex');
const verification = [];
for (const { route } of report.routes) {
  const { width, height } = route.roi;
  const folder = path.join(out, route.name);
  const frames = [];
  const pairs = path.join(folder, 'pairs'); fs.mkdirSync(pairs, { recursive: true });
  for (let i = 0; i < route.frames; i++) {
    const parts = [];
    for (const mode of ['before', 'after']) parts.push(await sharp(path.join(folder, mode, `${String(i).padStart(4, '0')}.png`))
      .removeAlpha().extract(route.roi).raw().toBuffer());
    const rgb = Buffer.alloc(width * 2 * height * 3);
    for (let y = 0; y < height; y++) for (let side = 0; side < 2; side++)
      parts[side].copy(rgb, (y * width * 2 + side * width) * 3, y * width * 3, (y + 1) * width * 3);
    frames.push(rgb);
    await sharp(rgb, { raw: { width: width * 2, height, channels: 3 } }).png()
      .toFile(path.join(pairs, `${String(i).padStart(4, '0')}.png`));
  }
  const input = ['-y', '-loglevel', 'error', '-framerate', '6', '-i', path.join(pairs, '%04d.png'), '-frames:v', String(route.frames)];
  const clip = path.join(folder, 'motion.mp4');
  execFileSync('ffmpeg', [...input, '-c:v', 'libx264rgb', '-crf', '0', '-preset', 'veryslow', '-pix_fmt', 'rgb24', '-movflags', '+faststart', clip]);
  execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(folder, 'motion-preview.mp4')]);
  const decoded = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', clip, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 128 * 1024 * 1024 });
  const expected = Buffer.concat(frames);
  assert.ok(decoded.equals(expected), 'Decoded lossless video differs from source crops');
  verification.push({ route: route.name, frames: frames.length, size: [width * 2, height],
    sourceRgbSha256: sha(expected), decodedRgbSha256: sha(decoded), exact: true });
}
fs.writeFileSync(path.join(out, 'video-verification.json'), JSON.stringify({ sourceSha256: report.sourceSha256, verification,
  layout: 'Before left; after right. Synthetic source cadence 60 Hz; playback 6 fps (10× slow). Lossless RGB clip decodes exactly to source crops. Browser preview is lossy and is not metric input.' }, null, 2) + '\n');
console.log(JSON.stringify(verification));
