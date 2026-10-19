import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const dir=process.argv[2],r=JSON.parse(fs.readFileSync(dir+'/report.json','utf8'));assert(r.complete&&r.records.length===r.route.frames&&!r.errors.length);
// Full-size lossless clips are the evidence; this reduced side-by-side is only a slow inspection aid.
execFileSync('ffmpeg',['-y','-v','error','-framerate','5','-i',dir+'/before-%03d.png','-framerate','5','-i',dir+'/after-%03d.png','-filter_complex','[0:v]scale=1102:716:flags=lanczos[a];[1:v]scale=1102:716:flags=lanczos[b];[a][b]hstack=inputs=2[v]','-map','[v]','-frames:v',String(r.route.frames),'-c:v','libx264','-crf','18','-preset','medium','-threads','2','-pix_fmt','yuv420p',dir+'/side-by-side-preview.mp4']);
console.log('Preview: left before, right after; reduced size, 12x slow inspection cadence, not hardware timing or lossless pixel evidence.');
