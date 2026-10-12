#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const args=Object.fromEntries(process.argv.slice(2).flatMap((arg,i,all)=>arg.startsWith('--')?[[arg.slice(2),all[i+1]]]:[]));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shimmer-cadence-proof-'));
try{
  const size=48, base=Buffer.from(Array.from({length:size*size},(_,k)=>70+(Math.imul(k+7,1103515245)>>>16)%40));
  const flash=Buffer.from(base);flash[25*size+25]=250;
  const input=path.join(dir,'fixture.mkv'), output=path.join(dir,'metric.json'), tool=args.tool??'tools/video-shimmer.mjs';
  if(spawnSync('ffmpeg',['-v','error','-f','rawvideo','-pixel_format','gray','-video_size','48x48','-framerate','30','-i','pipe:0','-c:v','ffv1',input],{input:Buffer.concat([base,base,flash,base,base])}).status!==0)throw new Error('Fixture encoding failed');
  const common=[tool,'--input',input,'--roi','0,0,1,1','--out',output];
  const run=spawnSync(process.execPath,common,{encoding:'utf8',timeout:30000});
  if(run.status!==0)throw new Error('Native analysis failed');
  const metric=JSON.parse(fs.readFileSync(output,'utf8'));
  const duplicate=spawnSync(process.execPath,[...common,'--fps','60'],{encoding:'utf8',timeout:30000});
  const ceiling=spawnSync(process.execPath,[...common,'--max-sparkle','0'],{encoding:'utf8',timeout:30000});
  const before=args.expect==='before';
  const report={sourceFps:30,sourceFrames:5,analysisFps:metric.analysisFps,decodedFrames:metric.decodedFrames,
    transientSparkleDetected:metric.samples.some(sample=>sample.sparklePixels>0),
    rejectsArtificialCadence:duplicate.status===1,explicitSparkleCeilingRejects:ceiling.status===2};
  report.pass=report.transientSparkleDetected && (before ? report.analysisFps===60 && report.decodedFrames===10 && !report.rejectsArtificialCadence && !report.explicitSparkleCeilingRejects : report.analysisFps===30 && report.decodedFrames===5 && report.rejectsArtificialCadence && report.explicitSparkleCeilingRejects);
  fs.writeFileSync(args.out??'shimmer-cadence-proof.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  if(!report.pass)process.exitCode=1;
}finally{fs.rmSync(dir,{recursive:true,force:true});}
