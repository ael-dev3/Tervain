import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'root-baseline-regression-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});let page;
try{
 let data;
 if(args['receipt-dir'])data=JSON.parse(fs.readFileSync(path.join(args['receipt-dir'],'native-data.json'),'utf8'));
 else{
  page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
  data=await page.eval(`const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,original=F.placementAuditTargets,options={kind:'root',maxChecks:100000},targets=original.call(F).filter(t=>t.kind==='root');if(targets.length<2)throw Error('Native roots missing');
   const labels=targets.slice(0,2).map(t=>t.label),audits={};try{for(const [mode,label]of [['baseline',labels[0]],['exchanged',labels[1]],['normal',null]]){F.placementAuditTargets=function(...args){return original.apply(this,args).map(t=>{if(t.kind!=='root'||t.label!==label)return t;const matrix=t.matrix.clone();matrix.elements[13]+=2;return {...t,matrix};});};audits[mode]=await T.auditPlacement(options);}}finally{F.placementAuditTargets=original;}
   return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),labels,...audits};`);
  page.close();page=null;
 }
 fs.writeFileSync(path.join(out,'native-data.json'),JSON.stringify(data)+'\n');
 const candidates=r=>r.checks.filter(c=>c.kind==='root'&&c.candidate).map(c=>c.label),prior=candidates(data.baseline),rows={},sourceHashes={};
 for(const mode of ['before','after']){
  const file='tools/root-audit-verdict.mjs',ref=mode==='before'?'421d34b':args['candidate-ref'],source=ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');sourceHashes[mode]=createHash('sha256').update(source).digest('hex');
  const {rootAuditVerdict}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  rows[mode]={exchanged:rootAuditVerdict(data.exchanged,prior.length,prior),identity:rootAuditVerdict(data.baseline,prior.length,prior),improved:rootAuditVerdict(data.normal,prior.length,prior),zeroBaseline:rootAuditVerdict(data.normal,0,[])};
 }
 const summarize=r=>({complete:r.complete,expectedRoots:r.expectedRoots,...r.summary,candidateLabels:candidates(r)});
 const report={build:data.build,inputSource:args['receipt-dir']?'saved-native-receipt':'live-pages',baseline:summarize(data.baseline),exchanged:summarize(data.exchanged),normal:summarize(data.normal),rows,sourceHashes,
 scope:'Controlled native root-audit adapter matrices only: lift one real root 2 m for the reference, restore it and lift another for the current audit. Rendered trees and terrain untouched; adapter restored in finally. Actual published audits and exact root-gate source versions. This demonstrates aggregate candidate counts hiding a newly affected root, not that either live tree is currently floating.'};
 report.pass=data.baseline.complete&&data.exchanged.complete&&data.normal.complete&&prior.length===1&&candidates(data.exchanged).length===1&&prior[0]!==candidates(data.exchanged)[0]&&candidates(data.normal).length===0&&rows.before.exchanged.pass&&!rows.after.exchanged.pass&&['identity','improved','zeroBaseline'].every(k=>rows.before[k].pass&&rows.after[k].pass);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
