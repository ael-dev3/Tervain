import { expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

it('rejects changed or unavailable live baselines while preserving cost and head checks', () => {
  const dir=mkdtempSync(join(tmpdir(),'budget-baseline-'));
  try {
    for(const name of ['play-gate.mjs','webgl-upload-bytes.mjs','budget-frame-samples.mjs']) {
      if(existsSync('tools/'+name))writeFileSync(join(dir,name),readFileSync('tools/'+name));
    }
    writeFileSync(join(dir,'cdp.mjs'),`let liveProbe=0;
export async function openPage(url) {
 const scenario=process.env.BUDGET_BASELINE_TEST,candidate=url.includes('candidate'),second=!candidate&&++liveProbe===2;
 let revision=candidate?'3333333':'1111111';
 if(!candidate&&second&&scenario==='changed')revision='2222222';
 if(!candidate&&scenario==='missing-both')revision=null;
 if(!candidate&&!second&&scenario==='missing-first')revision=null;
 if(!candidate&&second&&scenario==='missing-second')revision=null;
 if(!candidate&&scenario==='invalid')revision='unknown';
 if(candidate&&scenario==='head')revision='4444444';
 if(candidate&&scenario==='empty-candidate')revision='';
 if(candidate&&scenario==='short-candidate')revision='333';
 if(candidate&&scenario==='missing-candidate')revision=null;
 if(candidate&&scenario==='invalid-candidate')revision='unknown';
 const lower=second&&['stable-spread','changed'].includes(scenario);
 const calls=(lower?226:285)+ +(candidate&&scenario==='draw'),triangles=(lower?2414180:3061335)+ +(candidate&&scenario==='tri');
 const T={mode:'title',world:{terrain:{}},loadingEl:{classList:{contains:()=>true}},hud:{show(){}},player:{setPosition(){}},cam:{},renderer:{info:{render:{calls,triangles}}},perf:{end(){return{calls,triangles};}}};
 const window={tervain:T},document={baseURI:url,querySelectorAll:()=>[{textContent:'New',getBoundingClientRect:()=>({x:0,y:0,width:1,height:1})}]};
 return {cdp:async()=>{},wait:async()=>{T.mode='play';if(window.__budgetFrames)T.perf.end();},
 eval:async(source)=>new Function('window','document','fetch',source)(window,document,async()=>({json:async()=>({revision})})),
 console:()=>candidate&&scenario==='console'?['[error] test']:[],close(){}};
}`);
    for(const scenario of ['stable','stable-spread','changed','missing-both','missing-first','missing-second','invalid','draw','tri','console','head','empty-candidate','short-candidate','missing-candidate','invalid-candidate']) {
      const pass=['stable','stable-spread'].includes(scenario);
      const run=spawnSync(process.execPath,[join(dir,'play-gate.mjs'),'--url','https://candidate.invalid/','--budget-url','https://live.invalid/','--head','3333333'],
        {encoding:'utf8',timeout:10000,env:{...process.env,BUDGET_BASELINE_TEST:scenario}});
      expect(run.error).toBeUndefined();
      expect(run.status,`${scenario}\n${run.stdout}\n${run.stderr}`).toBe(pass?0:1);
      if(pass)expect(run.stdout).toContain('play-gate: PASS 3333333');
      else expect(run.stdout).not.toContain('play-gate: PASS');
      if(['changed','missing-both','missing-first','missing-second','invalid'].includes(scenario))expect(run.stderr).toContain('Live budget revision');
    }
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
