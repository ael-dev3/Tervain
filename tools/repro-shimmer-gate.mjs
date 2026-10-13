#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {shimmerVerdict} from './shimmer-verdict.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((arg,i,all)=>arg.startsWith('--')?[[arg.slice(2),all[i+1]]]:[]));
if(!args.clip||!args['baseline-gate'])throw new Error('Provide a software-rendered clip and baseline visual gate source');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shimmer-gate-proof-'));
try{
  const clip=path.join(dir,'short.mkv'),out=path.join(dir,'metric.json');
  if(spawnSync('ffmpeg',['-v','error','-i',args.clip,'-frames:v','2','-c:v','ffv1',clip],{timeout:30000}).status!==0)throw new Error('Clip fixture encoding failed');
  const result=spawnSync(process.execPath,['tools/video-shimmer.mjs','--input',clip,'--roi','0,0,1,1','--out',out],{encoding:'utf8',timeout:30000});
  const source=fs.readFileSync(args['baseline-gate'],'utf8'),start=source.indexOf('const score = shimmer.summary?.sparkleShare'),end=source.indexOf('if (!metrics.checks.shimmer.pass)',start);
  if(start<0||end<0)throw new Error('Baseline gate does not contain the expected unchecked measurement');
  const legacy=new Function('shimmer','baseline','metrics',source.slice(start,end)+'return metrics.checks.shimmer;');
  const parsed=fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')):null;
  const before=legacy(parsed??{}, {checks:{shimmer:{score:.05}}}, {checks:{}}),after=shimmerVerdict(result.status,parsed,.05);
  const report={fixture:'two frames from an actual software-rendered production-game clip',decoderExit:result.status,before:{score:before.score,pass:before.pass},after,pass:result.status!==0&&before.pass===true&&after.pass===false};
  fs.writeFileSync(args.out??'shimmer-gate-repro.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{fs.rmSync(dir,{recursive:true,force:true});}
