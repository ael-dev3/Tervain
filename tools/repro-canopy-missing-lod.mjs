import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';
const url=new URL(process.argv[2]??'https://ael-dev3.github.io/Tervain/'),out=process.argv[3]??'outputs/canopy-missing-lod';
fs.mkdirSync(out,{recursive:true});for(const[k,v]of Object.entries({shot:'1',quality:'high',place:'rillford',settle:'1',hour:'12'}))url.searchParams.set(k,v);
const page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:600000,...(process.env.REPRO_INIT_FILE?{init:fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8')}:{})});
try {
 let ready=false;for(let i=0;i<1200;i++){const s=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');if(s.failed)throw Error('World failed');if(s.ready){ready=true;break;}await page.wait(250);}if(!ready)throw Error('World not ready');
 const report=await page.eval(`const T=window.tervain;T.step=()=>{};T.render=()=>{};await T.world.arrived;const forest=T.world.modules.find(m=>m.name==='forest').module,near=forest.canopyAuditTargets(0),far=forest.canopyAuditTargets(2),selected=far.filter(t=>t.species==='pine'),expected=near.filter(t=>t.species==='pine');
 const adapter=forest.canopyAuditTargets;let wrapped;try{forest.canopyAuditTargets=()=>selected;wrapped=await T.auditCanopies({lod:2});}finally{forest.canopyAuditTargets=adapter;}
 const diagnosticUrl=performance.getEntriesByType('resource').map(e=>e.name).find(n=>/canopyAudit-[^/]+\\.js$/.test(n));if(!diagnosticUrl)throw Error('Native diagnostic chunk missing');
 const exports=await import(diagnosticUrl);let audit;for(const fn of Object.values(exports)){if(typeof fn!=='function')continue;try{const sample=fn([],{lod:2});if(sample?.summary&&Array.isArray(sample.trees)){audit=fn;break;}}catch{}}if(!audit)throw Error('Native detector export missing');const result=audit(selected,{lod:2});
 return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),program:performance.getEntriesByType('resource').map(e=>e.name.split('/').pop()).find(n=>/^tervain-.*\\.js$/.test(n)),expectedTrees:forest.counts.trees,nearTrees:near.length,farTrees:far.length,expectedPines:expected.length,selectedFarPines:selected.length,rawComplete:result.complete,appWrapperComplete:wrapped.complete,summary:result.summary,records:result.trees};`);
 report.scope='Native compiled forest adapter and diagnostic export, with the requested far-LOD pine cohort. The app wrapper already rejects incomplete population coverage; the fix retains individual unsupported targets and makes missing wood explicit in the lower-level report.';
 report.assertions={fullFarPopulation:report.farTrees===report.expectedTrees,retainedPines:report.selectedFarPines===report.expectedPines,explicitMissingWood:report.expectedPines>0&&report.summary.missingWood===report.expectedPines,incompleteSupport:report.rawComplete===false,wrapperStillRejects:report.appWrapperComplete===false};report.pass=Object.values(report.assertions).every(Boolean);
 fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,records:report.records.slice(0,2)}));if(!report.pass)process.exitCode=1;
}finally{page.close();}
