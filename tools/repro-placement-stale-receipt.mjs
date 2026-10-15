#!/usr/bin/env node
/** Actual CLI failure paths with a controlled CDP adapter; no browser/rendering claim. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import assert from 'node:assert/strict';import {execFileSync,spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const ref=args.baseline??'421d34b',output=path.resolve(args.out??'placement-stale-proof.json');fs.rmSync(output,{force:true});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'placement-stale-proof-')),baseline=execFileSync('git',['show',`${ref}:tools/audit-placement.mjs`],{encoding:'utf8'}),current=fs.readFileSync('tools/audit-placement.mjs','utf8');
try {
 const report={baseline:ref,sourceSha256:createHash('sha256').update(current).digest('hex'),scope:'Actual Node CLI, injected deterministic CDP failures; verifies artifact lifecycle, not live rendering or placement.',before:[],after:[]};
 for(const mode of ['before','after'])for(const failure of ['open','unsupported','query','timeout','invalid']){
  fs.writeFileSync(path.join(dir,'audit-placement.mjs'),mode==='before'?baseline:current);
  const ready='{loaded:true,supported:true,ready:true}',state=failure==='unsupported'?'{loaded:true,supported:false,ready:false}':failure==='timeout'?'{loaded:true,supported:true,ready:false}':ready;
  fs.writeFileSync(path.join(dir,'cdp.mjs'),`export async function openPage(){${failure==='open'?'throw Error("controlled open failure");':''}return {eval:async s=>{if(s.includes('auditPlacement('))throw Error('controlled query failure');return ${state}},wait:async()=>new Promise(r=>setTimeout(r,2)),close(){}}}`);
  const out=path.join(dir,'report.json');fs.writeFileSync(out,JSON.stringify({complete:true,summary:{candidates:0}}));
  const flags=['--out',out,...(failure==='timeout'?['--timeout','1']:failure==='invalid'?['--clearance','-1']:[])];
  const run=spawnSync(process.execPath,[path.join(dir,'audit-placement.mjs'),...flags],{encoding:'utf8',timeout:10000});assert(!run.error);assert.equal(run.status,1);
  const staleReceiptRemains=fs.existsSync(out);assert.equal(staleReceiptRemains,mode==='before');report[mode].push({failure,exitCode:run.status,staleReceiptRemains});
 }
 report.pass=true;fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
