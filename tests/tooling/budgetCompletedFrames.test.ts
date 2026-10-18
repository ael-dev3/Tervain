import { it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

it('CLI uses completed-frame maxima and still rejects budget, console and revision regressions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'budget-completed-'));
  try {
    for (const name of ['play-gate.mjs', 'budget-frame-samples.mjs', 'webgl-upload-bytes.mjs']) writeFileSync(join(dir, name), readFileSync(`tools/${name}`));
    writeFileSync(join(dir, 'cdp.mjs'), `export async function openPage(url) {
      const candidate = url.includes('candidate'), failure = process.env.BUDGET_TEST_FAILURE;
      let frame = 0;
      const T = { mode:'title', world:{terrain:{}}, loadingEl:{classList:{contains:()=>true}},
        hud:{show(){}}, player:{setPosition(){}}, cam:{},
        renderer:{info:{render:{calls:226,triangles:2414180}}},
        perf:{end(){ frame++; return {calls:285 + +(candidate && failure==='draw'),triangles:3061335 + +(candidate && failure==='tri')};}} };
      const window={tervain:T}, document={baseURI:url,querySelectorAll:()=>[{textContent:'New',getBoundingClientRect:()=>({x:0,y:0,width:1,height:1})}]};
      const fetch=async()=>({json:async()=>({revision:candidate?(failure==='head'?'bad':'abcdef0'):'1234567'})});
      return { cdp:async(method)=>{if(method==='Input.dispatchMouseEvent')T.mode='play';},
        wait:async()=>{ if(window.__budgetFrames && failure!=='missing')T.perf.end(); },
        eval:async(source)=>new Function('window','document','fetch',source)(window,document,fetch),
        console:()=>candidate && failure==='console'?['[error] test']:[],close(){} };
    }`);
    for (const failure of ['', 'draw', 'tri', 'console', 'head', 'missing']) {
      const run = spawnSync(process.execPath, [join(dir,'play-gate.mjs'),'--url','https://candidate.invalid/','--budget-url','https://live.invalid/','--head','abcdef0'],
        { encoding:'utf8', timeout:10000, env:{...process.env,BUDGET_TEST_FAILURE:failure} });
      expect(run.error).toBeUndefined();
      expect(run.status, run.stderr).toBe(failure?1:0);
      if (!failure) {
        expect(run.stdout).toContain('draw calls 285, triangles 3061335');
        expect(run.stdout).toContain('play-gate: PASS abcdef0');
      } else expect(run.stdout).not.toContain('play-gate: PASS');
    }
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
