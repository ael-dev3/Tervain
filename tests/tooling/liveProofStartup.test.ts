import {it,expect} from 'vitest';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

it('closes failed proof pages immediately instead of waiting after a fatal startup error',()=>{
 const dir=mkdtempSync(join(tmpdir(),'proof-startup-'));
 try{
  const driver=join(dir,'driver.mjs'),helper=join(dir,'proof.mjs'),runner=join(dir,'run.mjs');
  writeFileSync(driver,`export async function openPage(){const logs=process.env.CASE==='ready'?['[warning] optional notice']:[process.env.CASE==='exception'?'[exception] Module loading failed':'[error] Failed to load module script'];return {eval:async()=>({play:process.env.CASE==='ready',failed:false,scriptFailed:process.env.CASE==='resource'}),console:()=>logs.splice(0),wait:async()=>{throw Error('waited after fatal error')},close:()=>{globalThis.closed=true}}}`);
  writeFileSync(helper,readFileSync('tools/live-proof-page.mjs','utf8').replace("'./cdp.mjs'",JSON.stringify(pathToFileURL(driver).href)));
  writeFileSync(runner,`import {liveProofPage} from './proof.mjs';try{const p=await liveProofPage('https://example.invalid/');p.close();console.log(JSON.stringify({ready:true,closed:globalThis.closed,logs:p.console()}))}catch(e){console.log(JSON.stringify({error:e.message,closed:globalThis.closed}))}`);
  for(const selected of ['error','exception','resource','ready']){
   const run=spawnSync(process.execPath,[runner],{env:{...process.env,CASE:selected},encoding:'utf8'});
   expect(run.status).toBe(0);const result=JSON.parse(run.stdout.trim());expect(result.closed).toBe(true);
   if(selected==='ready'){expect(result.ready).toBe(true);expect(result.logs).toEqual(['[warning] optional notice']);}
   else expect(result.error).toBe(selected==='resource'?'Published world failed to load a script':'Published world emitted console errors during startup');
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
