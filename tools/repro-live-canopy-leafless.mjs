import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'canopy-leafless-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const cache=fs.mkdtempSync(path.join(tmpdir(),'canopy-leafless-'));let page;
try{
 let data;
 if(args['receipt-dir'])data=JSON.parse(fs.readFileSync(path.join(args['receipt-dir'],'native-data.json'),'utf8'));
 else{
  page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
  data=await page.eval(`const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,original=F.canopyAuditTargets,options={lod:0,alpha:false,maxOperations:80000000};
   const baseline=await T.auditCanopies(options),targets=original.call(F,0),index=targets.findIndex((t,i)=>t.wood&&t.leaves&&baseline.trees[i].candidates.length===0);if(index<0)throw Error('No native supported leafy tree');
   const label=targets[index].label;let dropped;try{F.canopyAuditTargets=function(lod){return original.call(this,lod).map(t=>t.label===label?{...t,leaves:null}:t);};dropped=await T.auditCanopies(options);}finally{F.canopyAuditTargets=original;}
   return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),label,baseline,dropped};`);
  page.close();page=null;
 }
 fs.writeFileSync(path.join(out,'native-data.json'),JSON.stringify(data,null,2)+'\n');
 const rows={},sourceHashes={};
 for(const mode of ['before','after']){
  const dir=path.join(cache,mode);fs.mkdirSync(dir);const ref=mode==='before'?(args['before-ref']??'421d34b'):args['candidate-ref'];sourceHashes[mode]={};
  for(const file of ['audit-canopy.mjs','canopy-baseline.mjs']){
   const source=ref?execFileSync('git',['show',ref+':tools/'+file],{encoding:'utf8'}):fs.readFileSync('tools/'+file,'utf8');
   fs.writeFileSync(path.join(dir,file),source);sourceHashes[mode][file]=createHash('sha256').update(source).digest('hex');
  }
  const baselineFile=path.join(dir,'baseline.json');fs.writeFileSync(baselineFile,JSON.stringify(data.baseline));rows[mode]={};
  for(const[name,current]of [['dropped',data.dropped],['identity',data.baseline]]){
   const driver=path.join(dir,name+'-driver.mjs');fs.writeFileSync(driver,`export async function openPage(){return {eval:async s=>s.includes('auditCanopies(')?${JSON.stringify(current)}:true,wait:async()=>{},close(){}}}`);
   const output=path.join(dir,name+'.json'),run=spawnSync(process.execPath,[path.join(dir,'audit-canopy.mjs'),'--driver',driver,'--baseline',baselineFile,'--out',output],{encoding:'utf8',timeout:30000});
   if(run.error)throw run.error;if(!fs.existsSync(output))throw Error('Missing CLI report: '+run.stderr);
   const report=JSON.parse(fs.readFileSync(output,'utf8'));rows[mode][name]={exitCode:run.status,pass:report.pass,comparison:report.baselineComparison};
  }
 }
 const report={build:data.build,inputSource:args['receipt-dir']?'saved-native-receipt':'live-pages',label:data.label,baseline:data.baseline.summary,dropped:data.dropped.summary,rows,sourceHashes,
  scope:'Controlled audit-adapter fault on the published full forest: one real leafy target loses its leaves reference, restored in finally. Actual native audits and actual CLI versions; no production geometry/rendering changed. This demonstrates a gate false PASS, not a claim that this tree is currently leafless on screen.'};
 report.pass=data.baseline.complete&&data.dropped.complete&&data.baseline.expectedTrees===data.dropped.expectedTrees&&data.dropped.summary.leafless===data.baseline.summary.leafless+1&&rows.before.dropped.pass&&rows.before.dropped.exitCode===0&&!rows.after.dropped.pass&&rows.after.dropped.exitCode===1&&rows.before.identity.pass&&rows.after.identity.pass;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();fs.rmSync(cache,{recursive:true,force:true});}
