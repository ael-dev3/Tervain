import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=process.argv[2],out=process.argv[3];assert.ok(root&&out,'Capture and output directories required');fs.mkdirSync(out,{recursive:true});
const verification=path.join(out,'video-verification.json');fs.rmSync(verification,{force:true});
const report=JSON.parse(fs.readFileSync(path.join(root,'report.json'),'utf8'));assert.equal(report.pass,true);assert.equal(report.results.length,1);
const c=report.results[0],roi=report.roi,pairs=[],sha=b=>createHash('sha256').update(b).digest('hex');
for(let i=0;i<c.frames;i++){
 const inputs=[];for(const mode of ['normal','candidate'])inputs.push(await sharp(path.join(root,c.case.name,mode,String(i).padStart(4,'0')+'.png')).removeAlpha().extract(roi).raw().toBuffer());
 const pair=Buffer.alloc(roi.width*roi.height*6),row=roi.width*3;for(let y=0;y<roi.height;y++){inputs[0].copy(pair,y*row*2,y*row,(y+1)*row);inputs[1].copy(pair,y*row*2+row,y*row,(y+1)*row);}pairs.push(pair);
}
const video=path.join(out,'motion-lossless.mp4'),preview=path.join(out,'motion-preview.mp4'),raw=Buffer.concat(pairs);
const run=(args,input)=>{const r=spawnSync('ffmpeg',['-v','error','-y',...args],{input,maxBuffer:256*1024*1024,timeout:120000});assert.equal(r.status,0,'Video encoding/decoding failed');return r.stdout;};
run(['-f','rawvideo','-pixel_format','rgb24','-video_size',String(roi.width*2)+'x'+roi.height,'-framerate','6','-i','pipe:0','-frames:v',String(c.frames),'-an','-c:v','libx264rgb','-crf','0','-preset','fast','-movflags','+faststart',video],raw);
const decoded=run(['-i',video,'-f','rawvideo','-pix_fmt','rgb24','pipe:1']);assert.ok(decoded.equals(raw),'Lossless clip differs from native source crops');
run(['-i',video,'-vf','scale=1280:-2','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',preview]);
for(const[mode,name]of[['normal','before.png'],['candidate','after.png']])fs.copyFileSync(path.join(root,c.case.name,mode,'0000.png'),path.join(out,name));
const result={frames:c.frames,sourceCadenceHz:c.sampleHz??60,playbackHz:6,metres:c.metres,roi,comparison:'before left / after right',decodedRGBSha256:sha(decoded),sourceRGBSha256:sha(raw),videoSha256:sha(fs.readFileSync(video)),previewSha256:sha(fs.readFileSync(preview)),pass:true,scope:'Lossless RGB video matches every native post/MSAA source crop byte-for-byte. Browser preview is lossy and never metric input. Slow synthetic samples are not frame pacing or a complete playtest.'};
fs.writeFileSync(verification,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({pass:true,frames:c.frames,metres:c.metres}));
