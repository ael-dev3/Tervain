#!/usr/bin/env node
import fs from 'node:fs';
import {openPage} from './cdp.mjs';
import {rootAuditVerdict} from './root-audit-verdict.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((arg,i,all)=>arg.startsWith('--')?[[arg.slice(2),all[i+1]]]:[]));
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[key,value]of Object.entries({shot:'1',quality:'low',place:'rillford',hud:'0'}))url.searchParams.set(key,value);
let page;
try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000});let ready=false;
 for(let i=0;i<400;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}
 if(!ready)throw new Error('Production journey not ready');
 const snapshots=await page.eval(`const T=window.tervain,render=T.render;try{T.render=()=>{};await T.world.arrived;const partial=await T.auditPlacement({kind:'root',maxChecks:1});const full=await T.auditPlacement({kind:'root',maxChecks:100000});return {partial,full};}finally{T.render=render;}`);
 const source=fs.readFileSync(args['baseline-gate']??'tools/visual-gate.mjs','utf8');const start=source.indexOf('const rootCandidates = audit.checks.filter'),end=source.indexOf('if (!metrics.checks.placement.pass)',start);
 if(start<0||end<0)throw new Error('Provide the baseline gate source');
 const legacy=new Function('audit','baseline','metrics',source.slice(start,end)+'return metrics.checks.placement.pass;');
 const summary=a=>({revision:a.revision,complete:a.complete,truncated:a.truncated,expectedRoots:a.expectedRoots,roots:a.summary.roots,candidates:a.checks.filter(c=>c.kind==='root'&&c.candidate).length});
 const report={fixture:'actual compiled root audits with deliberate one-check truncation and full population control',partial:summary(snapshots.partial),full:summary(snapshots.full),beforePartialPass:legacy(snapshots.partial,{checks:{placement:{rootCandidates:13}}},{checks:{placement:{}}}),afterPartial:rootAuditVerdict(snapshots.partial,13),afterFull:rootAuditVerdict(snapshots.full,13)};
 report.pass=report.partial.complete===false&&report.beforePartialPass===true&&report.afterPartial.pass===false&&report.afterFull.pass===true;
 fs.writeFileSync(args.out??'root-gate-repro.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
