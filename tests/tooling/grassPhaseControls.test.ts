import {expect,it} from 'vitest';import * as THREE from 'three';
import {normalizeGrassPhaseControls,readGrassPhaseControls,applyGrassPhaseControls} from '../../tools/grass-phase-controls.mjs';
function fixture(){return{game:{state:{clock:19.3*60}},world:{foliage:{wind:{uniforms:{uGrassTime:{value:3},uWindDir:{value:new THREE.Vector4(1,0,.1,.2)},uGustScroll:{value:new THREE.Vector4(2,3,4,5)}}}},sway:{uTime:{value:4}},sky:{cloudTime:7,state:{nightness:.3},update(hour:number){if(!Number.isFinite(hour))throw Error('Invalid sky hour');}}},player:{group:new THREE.Group()},grade:{time:9,setLook(){}}};}
it('round-trips the captured hour and real cloud clock through JSON',()=>{
 const T=fixture(),saved=readGrassPhaseControls(T);expect(saved).toMatchObject({hour:19.3,cloudTime:7});
 const phase=normalizeGrassPhaseControls(JSON.parse(JSON.stringify(saved)),{hour:11,cloudTime:100});expect(phase).toEqual(saved);
 T.world.sky.cloudTime=100;applyGrassPhaseControls(T,phase);expect(readGrassPhaseControls(T)).toEqual(saved);
});
it('keeps legacy missing fields finite and honours the legacy explicit skyTime alias',()=>{
 const phase=readGrassPhaseControls(fixture()),{hour:_,cloudTime:__,...legacy}=phase;
 expect(normalizeGrassPhaseControls(legacy,{hour:19.3,cloudTime:7})).toEqual(phase);
 expect(normalizeGrassPhaseControls({...legacy,skyTime:12},{hour:11,cloudTime:7})).toMatchObject({hour:11,cloudTime:12});
 expect(normalizeGrassPhaseControls({...legacy,skyTime:null},{hour:11})).toMatchObject({hour:11,cloudTime:null});
});
it('rejects malformed fields before applying any controls and does not alias the input arrays',()=>{
 const phase=readGrassPhaseControls(fixture()),before=JSON.stringify(phase);
 for(const bad of [{...phase,hour:NaN},{...phase,hour:null},{...phase,cloudTime:Infinity},{...phase,sway:null},{...phase,wind:{...phase.wind,scroll:[1,2]}},{...phase,wind:{...phase.wind,direction:[1,2,NaN,4]}}])expect(()=>normalizeGrassPhaseControls(bad,{hour:11})).toThrow(/Invalid/);
 const copy=normalizeGrassPhaseControls(phase,{hour:11});copy.wind.scroll[0]=100;expect(JSON.stringify(phase)).toBe(before);
});

it('removes an old PASS report before rejecting invalid CLI inputs without loading a browser',async()=>{
 const {mkdtempSync,writeFileSync,existsSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{spawnSync}=await import('node:child_process');
 const out=mkdtempSync(join(tmpdir(),'grass-phase-'));
 try{
  for(const invalid of [['--frames','1'],['--controls',join(out,'bad.json')]]){
   writeFileSync(join(out,'report.json'),'{"pass":true}');writeFileSync(join(out,'bad.json'),JSON.stringify({hour:null}));
   const run=spawnSync(process.execPath,['tools/capture-live-grass-walk.mjs','--out',out,...invalid],{encoding:'utf8',timeout:15000});
   expect(run.status).not.toBe(0);expect(run.error).toBeUndefined();expect(run.stderr).toMatch(/Invalid route|Invalid grass phase/);expect(existsSync(join(out,'report.json'))).toBe(false);
  }
 }finally{rmSync(out,{recursive:true,force:true});}
});
