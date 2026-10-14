#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import sharp from 'sharp';import {rgbFrame,walkingFlicker} from './foliage-motion-metric.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[])),dir=args.dir??'docs/perf/proofs/live18-grass-refresh',manifest=JSON.parse(fs.readFileSync(path.join(dir,'frames.json'))),report=JSON.parse(gunzipSync(fs.readFileSync(path.join(dir,'capture.json.gz'))));
assert(report.pass&&Object.values(report.assertions).every(v=>v===true));assert.equal(report.qualityPass,null);const summaries={};
for(const route of ['stationary','walk']){
 const data=manifest[route],{width,height,frames}=data;assert(Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0&&width<=2048&&height<=2048);assert(Number.isInteger(frames)&&frames>=5&&frames<=181);assert.equal(data.rgbSha256.length,frames);
 const frameBytes=width*height*3,total=frameBytes*frames;assert(total<=256*1024*1024);
 const decoded=spawnSync('ffmpeg',['-v','error','-i',path.join(dir,route+'-lossless.mkv'),'-pix_fmt','rgb24','-f','rawvideo','pipe:1'],{maxBuffer:total+frameBytes,timeout:60000});assert.equal(decoded.status,0,String(decoded.stderr));assert.equal(decoded.stdout.length,total,'Decoded frame count/size mismatch');
 const sampled=[];for(let i=0;i<frames;i++){
  const pixels=decoded.stdout.subarray(i*frameBytes,(i+1)*frameBytes);assert.equal(createHash('sha256').update(pixels).digest('hex'),data.rgbSha256[i],'Lossless RGB mismatch at '+route+'/'+i);
  const roi=await sharp(pixels,{raw:{width,height,channels:3}}).extract(report.roi).raw().toBuffer();sampled.push(rgbFrame(new Uint8Array(roi),report.roi.width,report.roi.height));
 }
 const metric=walkingFlicker(sampled,report.roi.width,report.roi.height);assert.deepEqual(JSON.parse(JSON.stringify(metric)),report.reports[route]);summaries[route]={frames,whitePixelsFlickered:metric.whitePixelsFlickered,sparkleShare:metric.summary.sparkleShare,alignmentShare:metric.summary.alignmentShare};
}
console.log(JSON.stringify({build:report.build,clipVerificationPass:true,qualityPass:null,metrics:summaries,scope:'Lossless RGB and motion-metric replay, not hardware frame timing or a new quality verdict.'}));
