import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const dir=process.argv[2];assert.ok(dir,'Supply native capture directory');
fs.rmSync(path.join(dir,'video-verification.json'),{force:true});
const report=JSON.parse(fs.readFileSync(path.join(dir,'report.json'),'utf8'));
assert.equal(report.pass,true);assert.ok(report.rows.length>=2);
const [width,height]=report.setup.size,frames=[];
for(const row of report.rows){assert.equal(row.changedPixels,0);assert.equal(row.beforeHash,row.afterHash);assert.equal(row.beforeHash,row.restoredHash);
 const buffers=[];for(const mode of ['before','after']){
   const image=sharp(path.join(dir,mode,String(row.frame).padStart(4,'0')+'.png')).removeAlpha();
   const {data,info}=await image.raw().toBuffer({resolveWithObject:true});assert.equal(info.width,width);assert.equal(info.height,height);assert.equal(info.channels,3);
   assert.equal(createHash('sha256').update(data).digest('hex'),row[mode+'Hash']);buffers.push(data);
 }
 const pair=Buffer.alloc(width*2*height*3);for(let y=0;y<height;y++)for(let side=0;side<2;side++)buffers[side].copy(pair,(y*width*2+side*width)*3,y*width*3,(y+1)*width*3);frames.push(pair);
}
const raw=Buffer.concat(frames),clip=path.join(dir,'motion-lossless.mp4');
execFileSync('ffmpeg',['-v','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',`${width*2}x${height}`,'-framerate','5','-i','pipe:0','-frames:v',String(frames.length),'-c:v','libx264rgb','-crf','0','-preset','fast',clip],{input:raw});
const decoded=execFileSync('ffmpeg',['-v','error','-i',clip,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:raw.length+1024});assert.ok(decoded.equals(raw),'Lossless clip differs from source RGB');
execFileSync('ffmpeg',['-v','error','-y','-i',clip,'-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-movflags','+faststart',path.join(dir,'motion-preview.mp4')]);
fs.writeFileSync(path.join(dir,'video-verification.json'),JSON.stringify({frames:frames.length,size:[width*2,height],playbackFps:5,decodedBytes:decoded.length,decodedSha256:createHash('sha256').update(decoded).digest('hex'),exact:true,layout:'before left, after right; synthetic samples, not measured frame cadence. Preview is lossy and not metric input.'},null,2)+'\n');
