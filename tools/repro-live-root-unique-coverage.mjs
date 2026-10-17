import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'root-unique-coverage-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
let page;
try{
 let data;
 if(args['receipt-dir'])data=JSON.parse(fs.readFileSync(path.join(args['receipt-dir'],'native-data.json'),'utf8'));
 else{
  page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
  data=await page.eval(`const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,original=F.placementAuditTargets,options={kind:'root',maxChecks:100000};
   const baseline=await T.auditPlacement(options),targets=original.call(F),roots=targets.filter(t=>t.kind==='root');if(roots.length<2||roots[0].label===roots[1].label)throw Error('Native unique root fixture missing');
   const copied=roots[0].label,omitted=roots[1].label;let duplicate;try{F.placementAuditTargets=function(...args){return original.apply(this,args).map(t=>t.kind==='root'&&t.label===omitted?{...roots[0]}:t);};duplicate=await T.auditPlacement(options);}finally{F.placementAuditTargets=original;}
   return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),copied,omitted,baseline,duplicate};`);
  page.close();page=null;
 }
 fs.writeFileSync(path.join(out,'native-data.json'),JSON.stringify(data)+'\n');
 const rows={},sourceHashes={};
 for(const mode of ['before','after']){
  const file='tools/root-audit-verdict.mjs',ref=mode==='before'?'421d34b':args['candidate-ref'];
  const source=ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');sourceHashes[mode]=createHash('sha256').update(source).digest('hex');
  const {rootAuditVerdict}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  rows[mode]={identity:rootAuditVerdict(data.baseline,0),duplicate:rootAuditVerdict(data.duplicate,0)};
 }
 const summary=r=>({complete:r.complete,expectedRoots:r.expectedRoots,...r.summary,uniqueRoots:new Set(r.checks.filter(c=>c.kind==='root').map(c=>c.label)).size});
 const report={build:data.build,inputSource:args['receipt-dir']?'saved-native-receipt':'live-pages',copied:data.copied,omitted:data.omitted,baseline:summary(data.baseline),duplicate:summary(data.duplicate),rows,sourceHashes,
  scope:'Controlled native audit-adapter fault: replace one full-population root target with a duplicate of another real root, retaining the total count. Actual published placement audits and baseline/candidate root gate functions. Adapter restored in finally; no geometry or rendering changed. Normal live audit is the positive control, not a claim that duplicate roots already exist in the unmodified live adapter.'};
 report.pass=report.baseline.complete&&report.duplicate.complete&&report.baseline.roots===report.duplicate.roots&&report.baseline.uniqueRoots===report.baseline.expectedRoots&&report.duplicate.uniqueRoots===report.duplicate.expectedRoots-1&&rows.before.duplicate.pass&&!rows.after.duplicate.pass&&rows.before.identity.pass&&rows.after.identity.pass;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
