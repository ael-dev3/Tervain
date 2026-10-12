#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).flatMap((arg,i,all)=>arg.startsWith('--')?[[arg.slice(2),all[i+1]]]:[]));
if(!args.clip||!args['baseline-tool'])throw new Error('Provide a recorded game clip and baseline analyzer');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'native-video-proof-'));
try{
 const input=path.join(dir,'held-frame.mkv');
 const encode=spawnSync('ffmpeg',['-v','error','-i',args.clip,'-vf',"setpts='if(lt(N,3),N,N+3)/(60*TB)'",'-fps_mode','vfr','-c:v','ffv1',input],{timeout:30000});if(encode.status!==0)throw new Error('Variable-rate fixture failed');
 const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','json',input],{encoding:'utf8',timeout:30000});
 const native=JSON.parse(probe.stdout).frames.map(frame=>Number(frame.best_effort_timestamp_time));
 const out=path.join(dir,'before.json');const baseline=spawnSync(process.execPath,[args['baseline-tool'],'--input',input,'--roi','0.56,0.52,0.26,0.08','--out',out],{encoding:'utf8',timeout:30000});if(baseline.status!==0)throw new Error('Baseline analysis failed');
 const before=JSON.parse(fs.readFileSync(out,'utf8'));
 const {analyzeVideo}=await import('./video-shimmer.mjs');const after=await analyzeVideo(input,{roi:[.56,.52,.26,.08]});
 const report={fixture:'variable-rate copy of actual SwiftShader game frames with one held refresh',sourceFrames:native.length,nativeTimestamps:native,before:{decodedFrames:before.decodedFrames,sampleTimes:before.samples.map(sample=>sample.time)},after:{decodedFrames:after.decodedFrames,sampleTimes:after.samples.map(sample=>sample.time),nativeCadence:after.nativeCadence}};
 report.pass=before.decodedFrames>native.length&&after.decodedFrames===native.length&&JSON.stringify(after.samples.map(sample=>sample.time))===JSON.stringify(native.slice(1,-1));
 fs.writeFileSync(args.out??'native-video-repro.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{fs.rmSync(dir,{recursive:true,force:true});}
