import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import sharp from 'sharp';
const dir=process.argv[2]??'walk-popin',report=JSON.parse(fs.readFileSync(path.join(dir,'report.json'))),[w,h]=report.setup.buffer,bytes=w*h*3,results=[];
for(const [clip,prefix] of [['walking-lossless.mkv','walk'],['stale-lossless.mkv','stale']]){
 const decoded=spawnSync('ffmpeg',['-v','error','-i',path.join(dir,clip),'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:100*1024*1024});assert.equal(decoded.status,0,decoded.stderr.toString());assert.equal(decoded.stdout.length,bytes*report.records.length);
 for(let i=0;i<report.records.length;i++){const png=await sharp(path.join(dir,prefix+'-'+String(i).padStart(3,'0')+'.png')).removeAlpha().raw().toBuffer();assert(png.equals(decoded.stdout.subarray(i*bytes,(i+1)*bytes)),clip+' frame '+i);}
 results.push({clip,frames:report.records.length,rgbExact:true});
}
fs.writeFileSync(path.join(dir,'clip-verification.json'),JSON.stringify(results,null,2));console.log(results);
