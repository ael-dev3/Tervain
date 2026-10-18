import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=process.argv[2],out=process.argv[3];assert.ok(root&&out);fs.mkdirSync(out,{recursive:true});
const report=JSON.parse(fs.readFileSync(path.join(root,'report.json')));assert.equal(report.pass,true);
const frames=report.rows.length,w=report.setup.size[0],h=report.setup.size[1],hash=b=>createHash('sha256').update(b).digest('hex');
const checks={frames,size:[w,h],fps:7.5,scope:'Synthetic walk/turn samples, slowed to 7.5 fps for inspection; not measured cadence.',decoded:{}};
for(const mode of ['before','after']){
 const dest=path.join(out,mode+'-lossless.mp4');
 execFileSync('ffmpeg',['-v','error','-y','-framerate','7.5','-i',path.join(root,mode,'%04d.png'),'-frames:v',String(frames),'-c:v','libx264rgb','-crf','0','-preset','slow','-pix_fmt','rgb24',dest]);
 const raw=execFileSync('ffmpeg',['-v','error','-i',dest,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:frames*w*h*3+1e6});assert.equal(raw.length,frames*w*h*3);
 checks.decoded[mode]=[];
 for(let i=0;i<frames;i++){const decoded=raw.subarray(i*w*h*3,(i+1)*w*h*3),source=await sharp(path.join(root,mode,String(i).padStart(4,'0')+'.png')).removeAlpha().raw().toBuffer();assert.equal(hash(decoded),hash(source));assert.equal(hash(decoded),report.rows[i].hashes[mode]);checks.decoded[mode].push(hash(decoded));}
 execFileSync('ffmpeg',['-v','error','-y','-i',dest,'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,mode+'-preview.mp4')]);
 fs.copyFileSync(path.join(root,mode,'0000.png'),path.join(out,mode+'-world.png'));
}
checks.pass=true;fs.writeFileSync(path.join(out,'motion-verification.json'),JSON.stringify(checks,null,2)+'\n');
