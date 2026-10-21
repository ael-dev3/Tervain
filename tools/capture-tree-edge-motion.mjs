#!/usr/bin/env node
import {createHash} from 'node:crypto';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {liveProofPage} from './live-proof-page.mjs';import {treeEdgeCaptureProgram} from './tree-edge-capture-program.mjs';import {analyzeVideo} from './video-shimmer.mjs';
export async function saveTreeEdgeCapture(capture,out) {
 fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});const metrics={};
 for(const route of ['stationary','pan']){
  const frames=capture.captures.filter(f=>f.route===route),dir=path.join(out,route);assert(frames.length>=3);fs.mkdirSync(dir,{recursive:true});
  for(const f of frames){assert.equal(f.glError,0);assert.equal(f.contextLost,false);assert(f.triangles>0);fs.writeFileSync(path.join(dir,String(f.i).padStart(4,'0')+'.png'),Buffer.from(f.png,'base64'));}
  const clip=path.join(out,route+'.mkv'),encoded=spawnSync('ffmpeg',['-v','error','-y','-framerate','60','-i',path.join(dir,'%04d.png'),'-frames:v',String(frames.length),'-c:v','ffv1',clip],{timeout:60000});assert.equal(encoded.status,0);
  metrics[route]=await analyzeVideo(clip,{roi:[.05,.05,.9,.9],maxFrames:frames.length});
 }
 const stationary=capture.captures.filter(f=>f.route==='stationary'),pan=capture.captures.filter(f=>f.route==='pan');
 const assertions={stationaryIdentical:stationary.every(f=>f.png===stationary[0].png),panChanges:pan.at(-1).png!==pan[0].png,stationaryZeroResidual:metrics.stationary.summary.shimmerMean===0,stationaryZeroSparkle:metrics.stationary.summary.sparkleShare===0,nativeSamples:capture.observedSamples.length===1&&capture.observedSamples[0]===(capture.postEnabled?Math.min(capture.requestedSamples,capture.maxSamples):0),minimumAlignment:metrics.pan.summary.alignmentShare>=.95,completeCounts:metrics.pan.decodedFrames===pan.length&&metrics.pan.summary.usableFrames===pan.length-2};
 const report={...capture,programSha256:createHash('sha256').update(fs.readFileSync(new URL('./tree-edge-capture-program.mjs',import.meta.url))).digest('hex'),captures:capture.captures.map(({png,...row})=>row),scope:'Isolated native forest foliage through real preset post/MSAA and water input path; tree wood and other drawables hidden after every update; frozen simulation and shader time; deterministic synthetic pan. Measures leaf-surface temporal residual including alpha edges and shading, not alpha-only attribution, full-scene appearance or hardware frame pacing.',metrics,assertions,pass:Object.values(assertions).every(Boolean),qualityPass:null};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
 const out=args.out??'artifacts/tree-edge-motion';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
 if(args.quality&&!['low','medium','high'].includes(args.quality))throw Error('Invalid quality preset');
 const options={frames:Number(args.frames??24),degrees:Number(args.degrees??4),x:Number(args.x??-40),z:Number(args.z??0),hour:Number(args.hour??12)},program=treeEdgeCaptureProgram(options);
 const page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:args.quality??'high',hour:options.hour,headed:args.headed==='true'});
 try{const capture=await page.eval(program);capture.route=options;const report=await saveTreeEdgeCapture(capture,out);console.log(JSON.stringify({build:report.build,samples:report.observedSamples,assertions:report.assertions,stationary:report.metrics.stationary.summary,pan:report.metrics.pan.summary,pass:report.pass}));if(!report.pass)process.exitCode=1;}finally{page.close()}
}
