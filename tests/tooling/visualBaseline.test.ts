import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {readVisualBaseline} from '../../tools/read-visual-baseline.mjs';
function fixture(run:(dir:string)=>void){const dir=fs.mkdtempSync(path.join(tmpdir(),'visual-baseline-test-'));try{run(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
it('allows an omitted reference and preserves valid metrics',()=>fixture(dir=>{
 expect(readVisualBaseline()).toBeNull();const file=path.join(dir,'metrics.json'),metrics={checks:{placement:{rootCandidates:0},shimmer:{score:.01}}};
 fs.writeFileSync(file,JSON.stringify(metrics));expect(readVisualBaseline(file)).toEqual(metrics);
}));
it('rejects a requested missing reference rather than silently starting an unreferenced run',()=>fixture(dir=>{
 expect(()=>readVisualBaseline(path.join(dir,'missing.json'))).toThrow();expect(()=>readVisualBaseline('')).toThrow(/requires/);
}));
it('rejects invalid JSON and non-metrics top-level values',()=>fixture(dir=>{
 const file=path.join(dir,'invalid.json');
 for(const raw of ['{broken','null','false','0','[]','{}','{"checks":null}','{"checks":[]}']){
  fs.writeFileSync(file,raw);expect(()=>readVisualBaseline(file)).toThrow();
 }
}));
it('the actual CLI rejects missing or null baselines before creating output or launching a browser',()=>fixture(dir=>{
 for(const name of ['missing','null']){
  const file=path.join(dir,name+'.json');if(name==='null')fs.writeFileSync(file,'null');const output=path.join(dir,name+'-output');
  const run=spawnSync(process.execPath,['tools/visual-gate.mjs','--baseline',file,'--out',output,'--tag','test'],{encoding:'utf8',timeout:15000});
  expect(run.error).toBeUndefined();expect(run.status).toBe(1);expect(fs.existsSync(output)).toBe(false);
  expect(run.stderr).toMatch(name==='missing'?/ENOENT/:/metrics object/);
 }
}));
