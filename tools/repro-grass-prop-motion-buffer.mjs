import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { openPage } from './cdp.mjs';
const url=new URL(process.argv[2]??'http://127.0.0.1:5180/');
const out=process.argv[3]??'outputs/grass-prop-motion-buffer';
for(const[k,v]of Object.entries({shot:'1',quality:'low',place:'rillford',settle:'1',hour:'12'}))url.searchParams.set(k,v);
fs.mkdirSync(out,{recursive:true});
const page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:600000,...(process.env.REPRO_INIT_FILE?{init:fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8')}:{})});
try {
 let ready=false;
 for(let i=0;i<1200;i++){
  const state=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');
  if(state.failed)throw Error('World failed to load');
  if(state.ready){ready=true;break;}await page.wait(250);
 }
 assert.ok(ready);
 const receipt=await page.eval(`
 const T=window.tervain,W=T.world;T.step=()=>{};const render=T.render;T.render=()=>{};await W.arrived;
 const motions=W.physics.motions.bind(W.physics),arrays=new Set(),records=new Set();let comparisons=0;
 W.physics.motions=(buffer)=>{const actual=motions(buffer),snapshot=motions();if(JSON.stringify(actual)!==JSON.stringify(snapshot))throw Error('Motion values changed');arrays.add(actual);for(const m of actual)records.add(m);comparisons+=actual.length;return actual;};
 for(let i=0;i<120;i++)W.grassMovers(1/60);
 W.physics.motions=motions;const defaultSnapshot=motions(),saved=JSON.stringify(defaultSnapshot);
 W.physics.grab(defaultSnapshot[0].id);W.grassMovers(1/60);W.physics.throw(.4,-.2);W.grassMovers(1/60);
 const snapshotUnchanged=JSON.stringify(defaultSnapshot)===saved;
 T.render=render;T.present(1);T.render=()=>{};
 return {build:document.querySelector('.build-version')?.textContent??document.body.innerText.match(/v0\\.0\\.\\d+[^\\n]*/)?.[0],updates:120,comparedRecords:comparisons,props:W.grassPropMotions.length,outputArrays:arrays.size,motionRecords:records.size,exactMotionValues:true,defaultSnapshotUnchanged:snapshotUnchanged,renderer:T.renderer.info.render};
 `);
 assert.equal(receipt.outputArrays,1);assert.equal(receipt.motionRecords,receipt.props);assert.equal(receipt.comparedRecords,120*receipt.props);assert.ok(receipt.defaultSnapshotUnchanged);
 receipt.pass=true;receipt.scope='Native built-world grass caller; identity and exact motion-value checks. Software-rendered correctness, not hardware frame timing.';
 await page.shot(path.join(out,'scene.png'));fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{page.close();}
