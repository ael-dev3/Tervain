import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {rgbFrame} from '../../../../tools/foliage-motion-metric.mjs';
const dir=process.argv[2];if(!dir)throw Error('Supply captured output directory');
const r=JSON.parse(fs.readFileSync(path.join(dir,'report.json'),'utf8')),samples=[];
let prior=null,priorMask=null;
for(let i=0;i<r.route.frames;i++){
 const tag=String(i).padStart(2,'0');
 const a=await sharp(path.join(dir,`baseline-${tag}.png`)).extract(r.roi).removeAlpha().raw().toBuffer();
 const m=await sharp(path.join(dir,`mask-${tag}.png`)).extract(r.roi).removeAlpha().raw().toBuffer();
 const classified=rgbFrame(a,r.roi.width,r.roi.height);
 let grassObservations=0,strictWhite=0,bright180=0,maxLuminance=0,temporalEligible=0,changesOver20=0;
 for(let p=0;p<classified.white.length;p++){
  const k=p*3;if(Math.max(m[k],m[k+1],m[k+2])<64)continue;
  grassObservations++;strictWhite+=classified.white[p];
  const y=.2126*a[k]+.7152*a[k+1]+.0722*a[k+2];
  bright180+=Number(y>=180);maxLuminance=Math.max(maxLuminance,y);
  if(prior&&Math.max(priorMask[k],priorMask[k+1],priorMask[k+2])>=64){
   temporalEligible++;const old=.2126*prior[k]+.7152*prior[k+1]+.0722*prior[k+2];changesOver20+=Number(Math.abs(y-old)>20);
  }
 }
 samples.push({frame:i,grassObservations,strictWhite,bright180,maxLuminance,temporalEligible,changesOver20});
 prior=a;priorMask=m;
}
assert.deepEqual(samples,r.reports.baseline.samples);
console.log('All frame counts match an independent recount using the tested RGB classifier.');
