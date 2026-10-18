/** Independently score native RGB captures, using one motion reference for both variants. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {rgbFrame} from './foliage-motion-metric.mjs';
import {frameShimmer,summarizeShimmer} from './shimmer-metric.mjs';
const root=process.argv[2];assert.ok(root,'Capture directory required');
const target=path.join(root,'paired-brightness.json');fs.rmSync(target,{force:true});
const capture=JSON.parse(fs.readFileSync(path.join(root,'report.json'),'utf8'));assert.equal(capture.pass,true);assert.equal(capture.nativeFacingCandidate,true);
const hash=b=>createHash('sha256').update(b).digest('hex'),roi=capture.roi,w=roi.width,h=roi.height,results=[];
for(const c of capture.results){
 assert.ok(c.frames>=3&&c.rows.length===c.frames);const frames={before:[],after:[]},neutral=[],rows=[];
 for(let i=0;i<c.frames;i++){
  const data={};for(const mode of ['normal','candidate','black']){const png=fs.readFileSync(path.join(root,c.case.name,mode,String(i).padStart(4,'0')+'.png'));const meta=await sharp(png).metadata();assert.deepEqual([meta.width,meta.height],capture.setup.size);const rgb=await sharp(png).removeAlpha().raw().toBuffer();if(mode==='normal')assert.equal(hash(rgb),c.rows[i].hashes.normal);data[mode]={rgb:await sharp(png).removeAlpha().extract(roi).raw().toBuffer(),sha256:hash(rgb)};}
  const before=rgbFrame(data.normal.rgb,w,h),after=rgbFrame(data.candidate.rgb,w,h);
  const mask=Uint8Array.from(before.white,(_,k)=>Number([0,1,2].some(j=>Math.abs(data.normal.rgb[k*3+j]-data.black.rgb[k*3+j])>8||Math.abs(data.candidate.rgb[k*3+j]-data.black.rgb[k*3+j])>8)));
  const sum=a=>a.reduce((n,v)=>n+v,0),strict=f=>sum(Uint8Array.from(f.white,(v,k)=>Number(v&&mask[k])));
  assert.equal(strict(before),c.rows[i].grassAffectedWhite);assert.equal(strict(after),c.rows[i].candidateGrassAffectedWhite);assert.equal(sum(mask),c.rows[i].grassAffectedPixels);assert.ok(sum(mask)>=w*h*.01,'Insufficient visible grass contribution');
  const brightness=f=>Uint8Array.from(f.gray,(v,k)=>Number(v>=180&&mask[k]));
  frames.before.push({...before,mask:brightness(before)});frames.after.push({...after,mask:brightness(after)});neutral.push(Uint8Array.from(before.gray,(v,k)=>Math.round((v+after.gray[k])/2)));
  rows.push({frame:i,strictGrassBefore:strict(before),strictGrassAfter:strict(after),brightGrassBefore:sum(frames.before.at(-1).mask),brightGrassAfter:sum(frames.after.at(-1).mask),meanLumaBefore:sum(before.gray)/(w*h),meanLumaAfter:sum(after.gray)/(w*h),rgbSha256:{before:data.normal.sha256,after:data.candidate.sha256,black:data.black.sha256}});
 }
 const samples={before:[],after:[]},radius=Math.min(64,Math.ceil(capture.setup.size[0]/640*6*(c.substeps??1)));
 for(let i=1;i+1<c.frames;i++){
  const motionReference={previous:neutral[i-1],current:neutral[i],next:neutral[i+1]};
  for(const mode of ['before','after']){const f=frames[mode];samples[mode].push(frameShimmer(f[i-1].gray,f[i].gray,f[i+1].gray,w,h,{searchRadius:radius,motionReference,sparkleMask:f[i].mask}));}
  assert.equal(samples.before.at(-1).validPixels,samples.after.at(-1).validPixels,'Different alignment denominators');console.log(JSON.stringify({case:c.case.name,triplet:i,before:samples.before.at(-1).maskedSparklePixels,after:samples.after.at(-1).maskedSparklePixels}));
 }
 const scored=Object.fromEntries(['before','after'].map(mode=>[mode,{brightTransientObservations:samples[mode].reduce((n,s)=>n+s.maskedSparklePixels,0),summary:summarizeShimmer(samples[mode]),samples:samples[mode]}]));
 assert.ok(scored.before.summary.alignmentShare>=.95,'Insufficient shared motion alignment');assert.equal(scored.before.summary.usableFrames,c.frames-2);
 results.push({case:c.case,frames:c.frames,metres:c.metres,sampleHz:c.sampleHz??60,searchRadius:radius,rows,...scored});
}
const report={build:capture.setup.build,published:capture.published,size:capture.setup.size,roi,primaryThreshold:{minimumLuma:180,residual:18,localContrast:9},strictThreshold:{minimumChannel:180,minimumLuma:200,maximumChannelSpread:40},captureControllerSha256:capture.toolSha256,scorerSha256:hash(fs.readFileSync(new URL(import.meta.url))),metricSha256:hash(fs.readFileSync(new URL('./shimmer-metric.mjs',import.meta.url))),results,pass:true,scope:'Native whole-scene post/MSAA RGB; grass-affected union mask, not exclusive ownership. One neutral tracking reference gives identical accepted pixels to both variants. Only independently decoded PNGs feed these scores; in-capture motion summaries are not used. Counts are frame-pixel observations, not unique blades or a visual score. Synthetic cadence is not frame pacing.'};
fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,results:results.map(r=>({case:r.case.name,before:r.before.brightTransientObservations,after:r.after.brightTransientObservations,alignment:r.before.summary.alignmentShare}))}));
