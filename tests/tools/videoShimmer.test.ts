import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
// ffmpeg is an optional recorded-gate prerequisite; absence is an explicit skip.
const decoderAvailable = ['ffmpeg', 'ffprobe'].every(tool => spawnSync(tool, ['-version']).status === 0);
it.skipIf(!decoderAvailable)('decodes a lossless video and reports a transient flash without disclosing its input path', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'shimmer-'));
  try {
    const w = 48, h = 48;
    const base = Buffer.from(Array.from({ length: w * h }, (_, k) => 70 + (Math.imul(k + 7, 1103515245) >>> 16) % 40));
    const flash = Buffer.from(base); flash[25 * w + 25] = 250;
    const file = path.join(dir, 'input.mkv'), out = path.join(dir, 'result.json');
    const encoded = spawnSync('ffmpeg', ['-v', 'error', '-f', 'rawvideo', '-pixel_format', 'gray', '-video_size', `${w}x${h}`, '-framerate', '60', '-i', 'pipe:0', '-c:v', 'ffv1', file], { input: Buffer.concat([base, base, flash, base, base]) });
    expect(encoded.status, String(encoded.stderr)).toBe(0);
    const run = spawnSync(process.execPath, ['tools/video-shimmer.mjs', '--input', file, '--roi', '0,0,1,1', '--out', out], { encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
    const text = readFileSync(out, 'utf8'), report = JSON.parse(text);
    expect(report.decodedFrames).toBe(5); expect(report.samples).toHaveLength(3);
    expect(report.samples[1].time).toBeCloseTo(2 / 60);
    expect(report.samples[1].sparklePixels).toBeGreaterThan(0);
    expect(report.samples[0].sparklePixels).toBe(0);
    expect(text).not.toContain(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
