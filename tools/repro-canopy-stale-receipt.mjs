#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'canopy-receipt-proof-'));
try {
 const baselineRef='421d34b',beforeScript=path.join(dir,'before.mjs'),driver=path.join(dir,'driver.mjs'),output=path.join(dir,'report.json');
 const source=execFileSync('git',['show',`${baselineRef}:tools/audit-canopy.mjs`],{encoding:'utf8'}).replace("'./canopy-baseline.mjs'",JSON.stringify(pathToFileURL(path.resolve('tools/canopy-baseline.mjs')).href));
 fs.writeFileSync(beforeScript,source);fs.writeFileSync(driver,"export async function openPage(){throw new Error('controlled launch failure')}");
 const run=script=>{fs.writeFileSync(output,'{"pass":true}');const r=spawnSync(process.execPath,[script,'--driver',driver,'--out',output],{encoding:'utf8'});return {exitStatus:r.status,stalePassRetained:fs.existsSync(output)&&JSON.parse(fs.readFileSync(output,'utf8')).pass===true};};
 const before=run(beforeScript),after=run('tools/audit-canopy.mjs');const report={schema:1,baselineRef,scenario:'Controlled browser launch failure following an earlier PASS',before,after,pass:before.exitStatus!==0&&before.stalePassRetained&&after.exitStatus!==0&&!after.stalePassRetained};
 fs.writeFileSync(process.argv[2]??'canopy-stale-receipt-proof.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{fs.rmSync(dir,{recursive:true,force:true});}
