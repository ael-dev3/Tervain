import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const root = process.argv[2]; assert.ok(root, 'Supply a completed native footprint capture');
const output = path.join(root, 'video-verification.json'); fs.rmSync(output, { force: true });
const report = JSON.parse(fs.readFileSync(path.join(root, 'report.json'), 'utf8'));
assert.equal(report.pass, true);
const [width, height] = report.setup.size, frames = [];
const pairs = path.join(root, 'pairs'); fs.mkdirSync(pairs, { recursive: true });
for (let i = 0; i < report.rows.length; i++) {
  const buffers = await Promise.all(['before','after'].map(async mode => {
    const rgb = await sharp(path.join(root, mode, `${i}.png`)).removeAlpha().raw().toBuffer();
    assert.equal(createHash('sha256').update(rgb).digest('hex'), report.rows[i].hashes[mode]);
    return rgb;
  }));
  assert.ok(buffers[0].equals(buffers[1]));
  const image = await sharp({ create: { width: width*2, height, channels: 3, background: '#000' } })
    .composite(buffers.map((input, k) => ({ input, raw: { width, height, channels: 3 }, left: k*width, top: 0 })))
    .removeAlpha().raw().toBuffer();
  frames.push(image);
  await sharp(image, {raw:{width:width*2,height,channels:3}}).png().toFile(path.join(pairs, `${i}.png`));
}
execFileSync('ffmpeg', ['-v','error','-y','-framerate','6','-i',path.join(pairs,'%d.png'),'-c:v','libx264rgb','-crf','0','-preset','veryfast',path.join(root,'motion-lossless.mp4')]);
execFileSync('ffmpeg', ['-v','error','-y','-i',path.join(root,'motion-lossless.mp4'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(root,'motion-preview.mp4')]);
const decoded = execFileSync('ffmpeg',['-v','error','-i',path.join(root,'motion-lossless.mp4'),'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:128*1024*1024});
assert.ok(decoded.equals(Buffer.concat(frames)), 'Lossless video differs from native PNG RGB');
const sha = b => createHash('sha256').update(b).digest('hex');
fs.writeFileSync(output, JSON.stringify({frames:frames.length,size:[width*2,height],sourceRgbSha256:sha(Buffer.concat(frames)),decodedRgbSha256:sha(decoded),exact:true,scope:'Five native walk/turn poses at a synthetic 60 Hz source cadence; 6 fps slow playback. Left before, right after; only the RGB-lossless clip is metric evidence.'},null,2)+'\n');
